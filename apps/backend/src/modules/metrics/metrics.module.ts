import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsScheduler } from './metrics.scheduler';
import { MetricsHistory } from './entities/metrics-history.entity';
import { MetricsHourly } from './entities/metrics-hourly.entity';
import { HealthScoreService } from './health-score.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetricsHistory, MetricsHourly])],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsScheduler, HealthScoreService],
  exports: [MetricsService, HealthScoreService],
})
export class MetricsModule {}
