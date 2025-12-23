import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('metrics')
@Public() // TODO: Remove after frontend auth implemented
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('current')
  async getCurrentMetrics() {
    return this.metricsService.getCurrentMetrics();
  }

  @Get('history')
  async getHistory(@Query('minutes') minutes?: string) {
    return this.metricsService.getHistory(minutes ? parseInt(minutes, 10) : 60);
  }
}
