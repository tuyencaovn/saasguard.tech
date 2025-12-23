import { Injectable, Logger } from '@nestjs/common';
import { Interval, Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);
  private collectCount = 0;

  constructor(
    private readonly metricsService: MetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Collect metrics every 3 seconds
   */
  @Interval(3000)
  async collectMetrics() {
    try {
      const metrics = await this.metricsService.collectMetrics();

      // Emit event for WebSocket broadcast
      this.eventEmitter.emit('metrics.updated', metrics);

      // Save to history every 20th collection (~1 minute)
      this.collectCount++;
      if (this.collectCount >= 20) {
        await this.metricsService.saveToHistory(metrics);
        this.collectCount = 0;
      }
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
    }
  }

  /**
   * Cleanup old history daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupHistory() {
    try {
      const deleted = await this.metricsService.cleanupOldHistory(7);
      this.logger.log(`Cleaned up ${deleted} old metrics entries`);
    } catch (error) {
      this.logger.error('Failed to cleanup metrics history', error);
    }
  }
}
