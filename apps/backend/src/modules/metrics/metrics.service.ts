import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as si from 'systeminformation';
import { MetricsHistory } from './entities/metrics-history.entity';
import { SystemMetrics, CpuMetrics, RamMetrics, DiskMetrics } from './types/metrics.types';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private cachedMetrics: SystemMetrics | null = null;

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly historyRepository: Repository<MetricsHistory>,
  ) {}

  /**
   * Collect fresh system metrics using systeminformation
   */
  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const [cpuLoad, cpuInfo, mem, disk] = await Promise.all([
        si.currentLoad(),
        si.cpu(),
        si.mem(),
        si.fsSize(),
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

      this.cachedMetrics = {
        cpu,
        ram,
        disk: diskMetrics,
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
