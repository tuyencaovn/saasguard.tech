import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsScheduler } from './metrics.scheduler';
import { MetricsHistory } from './entities/metrics-history.entity';
import { MetricsDaily } from './entities/metrics-daily.entity';
import { HealthScoreService } from './health-score.service';

@Module({
  imports: [TypeOrmModule.forFeature([MetricsHistory, MetricsDaily])],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsScheduler, HealthScoreService],
  exports: [MetricsService, HealthScoreService],
})
export class MetricsModule {}
