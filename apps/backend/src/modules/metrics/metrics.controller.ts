import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('current')
  getCurrentMetrics() {
    const metrics = this.metricsService.getCurrentMetrics();
    if (!metrics) {
      return { message: 'Metrics not available yet' };
    }
    return metrics;
  }

  @Get('history')
  getHistory(@Query('minutes') minutes?: string) {
    return this.metricsService.getHistory(minutes ? parseInt(minutes, 10) : 60);
  }
}
