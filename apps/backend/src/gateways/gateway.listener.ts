import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MetricsGateway } from './metrics.gateway';
import { HealthScoreService } from '../modules/metrics/health-score.service';
import { CrashDetectionService } from '../modules/alerts/crash-detection.service';
import { SslService } from '../modules/ssl/ssl.service';
import { SslStatus } from '../modules/ssl/entities/ssl-monitor.entity';
import type { SystemMetrics, DockerEvent, SystemMetricsWithHealth } from '../modules/metrics/types/metrics.types';

@Injectable()
export class GatewayListener {
  private readonly logger = new Logger(GatewayListener.name);

  constructor(
    private readonly metricsGateway: MetricsGateway,
    private readonly healthScoreService: HealthScoreService,
    private readonly crashDetectionService: CrashDetectionService,
    private readonly sslService: SslService,
  ) {}

  @OnEvent('metrics.updated')
  async handleMetricsUpdated(metrics: SystemMetrics) {
    const crashStatuses = this.crashDetectionService.getCrashStatus();
    const crashLoopCount = crashStatuses.filter((s) => s.inCrashLoop).length;

    const worstSslStatus = await this.getWorstSslStatus();
    const healthScore = this.healthScoreService.calculateScore(metrics, crashLoopCount, worstSslStatus);

    const payload: SystemMetricsWithHealth = { ...metrics, healthScore };
    this.metricsGateway.broadcastMetrics(payload as SystemMetrics);
  }

  @OnEvent('docker.event')
  handleDockerEvent(event: DockerEvent) {
    this.logger.log(`Broadcasting Docker event: ${event.action} - ${event.containerName}`);
    this.metricsGateway.broadcastDockerEvent(event);
  }

  /**
   * Get the worst SSL status across all monitored domains.
   * Returns null if no domains are configured (no penalty applied).
   */
  private async getWorstSslStatus(): Promise<SslStatus | null> {
    try {
      // Use internal query — pass empty userId to get all monitors via raw repo
      // We call a lightweight approach: query all monitors without user filter
      const monitors = await this.sslService['sslMonitorRepository'].find();
      if (monitors.length === 0) return null;

      const priority: SslStatus[] = [
        SslStatus.EXPIRED,
        SslStatus.ERROR,
        SslStatus.CRITICAL,
        SslStatus.WARNING,
        SslStatus.UNKNOWN,
        SslStatus.VALID,
      ];

      for (const status of priority) {
        if (monitors.some((m) => m.status === status)) return status;
      }
      return SslStatus.VALID;
    } catch {
      return null;
    }
  }
}
