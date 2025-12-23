import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as si from 'systeminformation';
import { MetricsHistory } from './entities/metrics-history.entity';
import { SystemMetrics, CpuMetrics, RamMetrics, DiskMetrics, UptimeMetrics, NetworkMetrics } from './types/metrics.types';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private cachedMetrics: SystemMetrics | null = null;
  private lastNetworkStats: { rx: number; tx: number; timestamp: number } | null = null;

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly historyRepository: Repository<MetricsHistory>,
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
        used: mem.used,
        free: mem.free,
        usagePercent: Math.round((mem.used / mem.total) * 10000) / 100,
      };

      // Filter main disk partitions (exclude small/system partitions)
      const diskMetrics: DiskMetrics[] = disk
        .filter((d) => d.size > 1024 * 1024 * 1024) // > 1GB
        .map((d) => ({
          mount: d.mount,
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

      const now = Date.now();
      let rxPerSec = 0;
      let txPerSec = 0;

      if (this.lastNetworkStats && primaryNet) {
        const timeDiff = (now - this.lastNetworkStats.timestamp) / 1000; // seconds
        if (timeDiff > 0) {
          rxPerSec = Math.max(0, (primaryNet.rx_bytes - this.lastNetworkStats.rx) / timeDiff);
          txPerSec = Math.max(0, (primaryNet.tx_bytes - this.lastNetworkStats.tx) / timeDiff);
        }
      }

      if (primaryNet) {
        this.lastNetworkStats = {
          rx: primaryNet.rx_bytes,
          tx: primaryNet.tx_bytes,
          timestamp: now,
        };
      }

      const network: NetworkMetrics = {
        interface: primaryNet?.iface || 'unknown',
        rx: Math.round(rxPerSec),
        tx: Math.round(txPerSec),
        rxTotal: primaryNet?.rx_bytes || 0,
        txTotal: primaryNet?.tx_bytes || 0,
        speed: primaryInterface?.speed || 0,
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
}
