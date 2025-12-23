import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { MetricsHistory } from './entities/metrics-history.entity';

export interface CurrentMetrics {
  cpu: number;
  ram: number;
  disk: number;
  cpuDetails?: {
    cores: number;
    speed: number;
    model: string;
  };
  ramDetails?: {
    total: number;
    used: number;
    free: number;
  };
  diskDetails?: {
    fs: string;
    size: number;
    used: number;
    available: number;
    mount: string;
  }[];
  timestamp: Date;
}

@Injectable()
export class MetricsService {
  private currentMetrics: CurrentMetrics | null = null;

  constructor(
    @InjectRepository(MetricsHistory)
    private readonly historyRepository: Repository<MetricsHistory>,
  ) {}

  // Set current metrics (called by collector)
  setCurrentMetrics(metrics: CurrentMetrics): void {
    this.currentMetrics = metrics;
  }

  // Get current metrics
  getCurrentMetrics(): CurrentMetrics | null {
    return this.currentMetrics;
  }

  // Save metrics to history
  async saveToHistory(metrics: CurrentMetrics): Promise<MetricsHistory> {
    const history = this.historyRepository.create({
      cpuPercent: metrics.cpu,
      ramPercent: metrics.ram,
      diskPercent: metrics.disk,
      cpuDetails: metrics.cpuDetails,
      ramDetails: metrics.ramDetails,
      diskDetails: metrics.diskDetails,
      timestamp: metrics.timestamp,
    });
    return this.historyRepository.save(history);
  }

  // Get history for charts
  async getHistory(minutes = 60): Promise<MetricsHistory[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    return this.historyRepository.find({
      where: { timestamp: MoreThan(since) },
      order: { timestamp: 'ASC' },
    });
  }

  // Cleanup old history (retention: 7 days by default)
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
