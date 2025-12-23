import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { MetricsScheduler } from './metrics.scheduler';
import { MetricsHistory } from './entities/metrics-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetricsHistory])],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsScheduler],
  exports: [MetricsService],
})
export class MetricsModule {}
