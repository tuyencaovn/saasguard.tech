import { Injectable, Logger } from '@nestjs/common';
import { Interval, Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsScheduler {
  private readonly logger = new Logger(MetricsScheduler.name);
  private collectCount = 0;
  // Track peak values between saves to capture brief spikes
  private peakCpu = 0;
  private peakRam = 0;
  private peakDisk = 0;

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

      // Track peak values between history saves
      this.peakCpu = Math.max(this.peakCpu, metrics.cpu.usage);
      this.peakRam = Math.max(this.peakRam, metrics.ram.usagePercent);
      this.peakDisk = Math.max(this.peakDisk, metrics.disk[0]?.usagePercent ?? 0);

      // Emit event for WebSocket broadcast (always send current values for real-time display)
      this.eventEmitter.emit('metrics.updated', metrics);

      // Save to history every 20th collection (~1 minute), using peak values
      this.collectCount++;
      if (this.collectCount >= 20) {
        // Save with peak values to capture any spikes in the interval
        const peakMetrics = {
          ...metrics,
          cpu: { ...metrics.cpu, usage: this.peakCpu },
          ram: { ...metrics.ram, usagePercent: this.peakRam },
          disk: metrics.disk.length > 0
            ? [{ ...metrics.disk[0], usagePercent: this.peakDisk }, ...metrics.disk.slice(1)]
            : metrics.disk,
        };
        await this.metricsService.saveToHistory(peakMetrics);
        // Reset peaks
        this.peakCpu = metrics.cpu.usage;
        this.peakRam = metrics.ram.usagePercent;
        this.peakDisk = metrics.disk[0]?.usagePercent ?? 0;
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
