import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import * as si from 'systeminformation';
import { MetricsHistory } from './entities/metrics-history.entity';
import { MetricsDaily } from './entities/metrics-daily.entity';
import { SystemMetrics, CpuMetrics, RamMetrics, DiskMetrics, UptimeMetrics, NetworkMetrics } from './types/metrics.types';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private cachedMetrics: SystemMetrics | null = null;

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly historyRepository: Repository<MetricsHistory>,
    @InjectRepository(MetricsDaily)
    private readonly dailyRepository: Repository<MetricsDaily>,
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

  /**
   * Aggregate one calendar day of raw history into a single daily rollup row.
   * Idempotent: re-running upserts the same day. Skips days with no raw data.
   */
  async aggregateDay(date: Date): Promise<void> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const stats = await this.historyRepository
      .createQueryBuilder('h')
      .select('AVG(h.cpuPercent)', 'cpuAvg')
      .addSelect('MAX(h.cpuPercent)', 'cpuMax')
      .addSelect('AVG(h.ramPercent)', 'ramAvg')
      .addSelect('MAX(h.ramPercent)', 'ramMax')
      .addSelect('AVG(h.diskPercent)', 'diskAvg')
      .addSelect('MAX(h.diskPercent)', 'diskMax')
      .addSelect('AVG(h.networkRx)', 'networkRxAvg')
      .addSelect('AVG(h.networkTx)', 'networkTxAvg')
      .addSelect('COUNT(*)', 'sampleCount')
      .where('h.timestamp >= :start AND h.timestamp < :end', { start: dayStart, end: dayEnd })
      .getRawOne();

    const sampleCount = parseInt(stats.sampleCount, 10) || 0;
    if (sampleCount === 0) return; // no raw data for this day

    const dayKey = dayStart.toISOString().slice(0, 10); // YYYY-MM-DD
    const round2 = (v: unknown) => Math.round((parseFloat(v as string) || 0) * 100) / 100;

    const row = {
      day: dayKey,
      cpuAvg: round2(stats.cpuAvg),
      cpuMax: round2(stats.cpuMax),
      ramAvg: round2(stats.ramAvg),
      ramMax: round2(stats.ramMax),
      diskAvg: round2(stats.diskAvg),
      diskMax: round2(stats.diskMax),
      networkRxAvg: Math.round(parseFloat(stats.networkRxAvg) || 0),
      networkTxAvg: Math.round(parseFloat(stats.networkTxAvg) || 0),
      sampleCount,
    };

    await this.dailyRepository.upsert(row, ['day']);
  }

  /**
   * Get daily rollup rows for the last N days (ascending).
   */
  async getDailyHistory(days = 30): Promise<MetricsDaily[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceKey = since.toISOString().slice(0, 10);
    return this.dailyRepository.find({
      where: { day: MoreThan(sinceKey) },
      order: { day: 'ASC' },
    });
  }

  /**
   * Cleanup daily rollups older than N days (default 1 year).
   */
  async cleanupOldDaily(days = 365): Promise<number> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - days);
    const cutoff = retentionDate.toISOString().slice(0, 10);

    const result = await this.dailyRepository.delete({ day: LessThan(cutoff) });
    return result.affected || 0;
  }
}
