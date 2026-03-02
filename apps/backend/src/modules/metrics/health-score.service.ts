import { Injectable } from '@nestjs/common';
import type { SystemMetrics } from './types/metrics.types';
import { SslStatus } from '../ssl/entities/ssl-monitor.entity';

export interface HealthFactors {
  cpu: number;
  ram: number;
  disk: number;
  containers: number;
  ssl: number;
}

export interface HealthScore {
  score: number;
  status: 'good' | 'warning' | 'critical';
  factors: HealthFactors;
}

@Injectable()
export class HealthScoreService {
  calculateScore(
    metrics: SystemMetrics,
    crashLoopCount: number,
    worstSslStatus: SslStatus | null,
  ): HealthScore {
    const cpuPenalty = this.getPenalty(metrics.cpu.usage, [50, 70, 90]);
    const ramPenalty = this.getPenalty(metrics.ram.usagePercent, [60, 80, 95]);
    const diskPenalty = this.getPenalty(metrics.disk[0]?.usagePercent ?? 0, [70, 85, 95]);
    const containerPenalty = crashLoopCount > 0 ? Math.min(crashLoopCount * 25, 100) : 0;
    const sslPenalty = this.getSslPenalty(worstSslStatus);

    const cpuScore = 100 - cpuPenalty;
    const ramScore = 100 - ramPenalty;
    const diskScore = 100 - diskPenalty;
    const containerScore = 100 - containerPenalty;
    const sslScore = 100 - sslPenalty;

    const score = Math.max(
      0,
      Math.round(
        cpuScore * 0.15 +
          ramScore * 0.25 +
          diskScore * 0.30 +
          containerScore * 0.20 +
          sslScore * 0.10,
      ),
    );

    const status: HealthScore['status'] =
      score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical';

    return {
      score,
      status,
      factors: {
        cpu: cpuScore,
        ram: ramScore,
        disk: diskScore,
        containers: containerScore,
        ssl: sslScore,
      },
    };
  }

  private getPenalty(value: number, thresholds: [number, number, number]): number {
    if (value >= thresholds[2]) return 100;
    if (value >= thresholds[1]) return 60;
    if (value >= thresholds[0]) return 30;
    return 0;
  }

  private getSslPenalty(status: SslStatus | null): number {
    if (status === null) return 0; // no domains monitored — no penalty
    switch (status) {
      case SslStatus.VALID:
      case SslStatus.UNKNOWN:
        return 0;
      case SslStatus.WARNING:
        return 30;
      case SslStatus.CRITICAL:
        return 70;
      case SslStatus.EXPIRED:
      case SslStatus.ERROR:
        return 100;
      default:
        return 0;
    }
  }
}
