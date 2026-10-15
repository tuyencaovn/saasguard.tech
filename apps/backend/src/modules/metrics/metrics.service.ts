import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import * as si from 'systeminformation';
import { MetricsHistory } from './entities/metrics-history.entity';
import { MetricsHourly } from './entities/metrics-hourly.entity';
import { SystemMetrics, CpuMetrics, RamMetrics, DiskMetrics, UptimeMetrics, NetworkMetrics } from './types/metrics.types';

// Shape returned by the aggregated-history endpoint (hourly or daily buckets)
export interface AggregatedPoint {
  bucket: string;
  cpuAvg: number;
  cpuMax: number;
  ramAvg: number;
  ramMax: number;
  diskAvg: number;
  diskMax: number;
  networkRxAvg: number;
  networkTxAvg: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private cachedMetrics: SystemMetrics | null = null;

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly historyRepository: Repository<MetricsHistory>,
    @InjectRepository(MetricsHourly)
    private readonly hourlyRepository: Repository<MetricsHourly>,
  ) {}

  /**
   * Collect fresh system metrics using systeminformation
   */
  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const [cpuLoad, cpuInfo, mem, disk, time, netStats, netInterfaces] = await Promise.all([
        si.currentLoad(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
        si.time(),
        si.networkStats(),
        si.networkInterfaces(),
      ]);

      const cpu: CpuMetrics = {
        usage: Math.round(cpuLoad.currentLoad * 100) / 100,
        cores: cpuLoad.cpus.length,
        speed: cpuInfo.speed,
        model: cpuInfo.brand,
      };

      const ram: RamMetrics = {
        total: mem.total,
        used: mem.total - mem.available, // actual used = total - available
        free: mem.available, // available memory (includes reclaimable cache)
        usagePercent: Math.round(((mem.total - mem.available) / mem.total) * 10000) / 100,
      };

      // Filter main disk partitions (exclude small/system partitions)
      // In Docker with host rootfs mounted at /hostfs, prefer that over overlay
      const hasHostFs = disk.some((d) => d.mount === '/hostfs');
      const diskMetrics: DiskMetrics[] = disk
        .filter((d) => d.size > 1024 * 1024 * 1024) // > 1GB
        .filter((d) => hasHostFs ? d.mount.startsWith('/hostfs') : !d.mount.startsWith('/dev'))
        .map((d) => ({
          mount: hasHostFs ? d.mount.replace('/hostfs', '') || '/' : d.mount,
          fs: d.fs,
          size: d.size,
          used: d.used,
          available: d.available,
          usagePercent: Math.round(d.use * 100) / 100,
        }));

      const uptime: UptimeMetrics = {
        uptime: time.uptime,
        bootTime: new Date(Date.now() - time.uptime * 1000),
      };

      // Calculate network throughput (bytes per second)
      // Get primary interface (first non-loopback with traffic)
      const primaryNet = netStats.find((n) => !n.iface.startsWith('lo') && (n.rx_bytes > 0 || n.tx_bytes > 0)) || netStats[0];
      const primaryInterface = Array.isArray(netInterfaces)
        ? netInterfaces.find((i) => i.iface === primaryNet?.iface)
        : null;

      let rxPerSec = 0;
      let txPerSec = 0;

      // systeminformation provides rx_sec and tx_sec (bytes per second)
      if (primaryNet) {
        rxPerSec = primaryNet.rx_sec || 0;
        txPerSec = primaryNet.tx_sec || 0;
      }

      // Speed can be -1 when not detected, treat as 0
      const interfaceSpeed = primaryInterface?.speed;
      const validSpeed = interfaceSpeed && interfaceSpeed > 0 ? interfaceSpeed : 0;

      const network: NetworkMetrics = {
        interface: primaryNet?.iface || 'unknown',
        rx: Math.round(rxPerSec),
        tx: Math.round(txPerSec),
        rxTotal: primaryNet?.rx_bytes || 0,
        txTotal: primaryNet?.tx_bytes || 0,
        speed: validSpeed,
      };

      this.cachedMetrics = {
        cpu,
        ram,
        disk: diskMetrics,
        network,
        uptime,
        timestamp: new Date(),
      };

      return this.cachedMetrics;
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
      throw error;
    }
  }

  /**
   * Get cached metrics (instant response)
   */
  getCachedMetrics(): SystemMetrics | null {
    return this.cachedMetrics;
  }

  /**
   * Get current metrics (collect if not cached)
   */
  async getCurrentMetrics(): Promise<SystemMetrics> {
    if (!this.cachedMetrics) {
      return this.collectMetrics();
    }
    return this.cachedMetrics;
  }

  /**
   * Save metrics to history (for charting)
   */
  async saveToHistory(metrics: SystemMetrics): Promise<MetricsHistory> {
    const history = this.historyRepository.create({
      cpuPercent: metrics.cpu.usage,
      ramPercent: metrics.ram.usagePercent,
      diskPercent: metrics.disk[0]?.usagePercent || 0,
      cpuDetails: {
        cores: metrics.cpu.cores,
        speed: metrics.cpu.speed,
        model: metrics.cpu.model,
      },
      ramDetails: {
        total: metrics.ram.total,
        used: metrics.ram.used,
        free: metrics.ram.free,
      },
      diskDetails: metrics.disk,
      networkRx: metrics.network.rx,
      networkTx: metrics.network.tx,
      networkSpeed: metrics.network.speed,
      timestamp: metrics.timestamp,
    });
    return this.historyRepository.save(history);
  }

  /**
   * Get metrics history for charts
   */
  async getHistory(minutes = 60): Promise<MetricsHistory[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.historyRepository.find({
      where: { timestamp: MoreThan(since) },
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Cleanup old history entries
   */
  async cleanupOldHistory(days = 7): Promise<number> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - days);

    const result = await this.historyRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :date', { date: retentionDate })
      .execute();
    return result.affected || 0;
  }

  private readonly round2 = (v: unknown) => Math.round((parseFloat(v as string) || 0) * 100) / 100;

  /**
   * Rebuild hourly rollups for raw data in the last `hoursBack` hours.
   * One GROUP BY per hour; idempotent upsert keyed by `hour`. Safe to run often
   * (the current, still-filling hour simply gets re-upserted each pass).
   */
  async aggregateRecentHours(hoursBack = 3): Promise<number> {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    const rows = await this.historyRepository
      .createQueryBuilder('h')
      .select("date_trunc('hour', h.timestamp)", 'hour')
      .addSelect('AVG(h.cpuPercent)', 'cpuAvg')
      .addSelect('MAX(h.cpuPercent)', 'cpuMax')
      .addSelect('AVG(h.ramPercent)', 'ramAvg')
      .addSelect('MAX(h.ramPercent)', 'ramMax')
      .addSelect('AVG(h.diskPercent)', 'diskAvg')
      .addSelect('MAX(h.diskPercent)', 'diskMax')
      .addSelect('AVG(h.networkRx)', 'networkRxAvg')
      .addSelect('AVG(h.networkTx)', 'networkTxAvg')
      .addSelect('COUNT(*)', 'sampleCount')
      .where('h.timestamp >= :since', { since })
      .groupBy("date_trunc('hour', h.timestamp)")
      .getRawMany();

    for (const r of rows) {
      await this.hourlyRepository.upsert(
        {
          hour: new Date(r.hour),
          cpuAvg: this.round2(r.cpuAvg),
          cpuMax: this.round2(r.cpuMax),
          ramAvg: this.round2(r.ramAvg),
          ramMax: this.round2(r.ramMax),
          diskAvg: this.round2(r.diskAvg),
          diskMax: this.round2(r.diskMax),
          networkRxAvg: Math.round(parseFloat(r.networkRxAvg) || 0),
          networkTxAvg: Math.round(parseFloat(r.networkTxAvg) || 0),
          sampleCount: parseInt(r.sampleCount, 10) || 0,
        },
        ['hour'],
      );
    }
    return rows.length;
  }

  /**
   * Aggregated history for charts. Returns hourly points for ranges up to 30
   * days; for longer ranges it buckets the hourly rollups down to daily so the
   * chart keeps a sane number of points. `bucket` is an ISO timestamp.
   */
  async getAggregatedHistory(days = 30): Promise<AggregatedPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const grain = days > 30 ? 'day' : 'hour';

    const rows = await this.hourlyRepository
      .createQueryBuilder('m')
      .select(`date_trunc('${grain}', m.hour)`, 'bucket')
      .addSelect('AVG(m.cpuAvg)', 'cpuAvg')
      .addSelect('MAX(m.cpuMax)', 'cpuMax')
      .addSelect('AVG(m.ramAvg)', 'ramAvg')
      .addSelect('MAX(m.ramMax)', 'ramMax')
      .addSelect('AVG(m.diskAvg)', 'diskAvg')
      .addSelect('MAX(m.diskMax)', 'diskMax')
      .addSelect('AVG(m.networkRxAvg)', 'networkRxAvg')
      .addSelect('AVG(m.networkTxAvg)', 'networkTxAvg')
      .where('m.hour >= :since', { since })
      .groupBy(`date_trunc('${grain}', m.hour)`)
      .orderBy('bucket', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      bucket: new Date(r.bucket).toISOString(),
      cpuAvg: this.round2(r.cpuAvg),
      cpuMax: this.round2(r.cpuMax),
      ramAvg: this.round2(r.ramAvg),
      ramMax: this.round2(r.ramMax),
      diskAvg: this.round2(r.diskAvg),
      diskMax: this.round2(r.diskMax),
      networkRxAvg: Math.round(parseFloat(r.networkRxAvg) || 0),
      networkTxAvg: Math.round(parseFloat(r.networkTxAvg) || 0),
    }));
  }

  /**
   * Cleanup hourly rollups older than N days (default 1 year).
   */
  async cleanupOldHourly(days = 365): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const result = await this.hourlyRepository.delete({ hour: LessThan(cutoff) });
    return result.affected || 0;
  }
}
