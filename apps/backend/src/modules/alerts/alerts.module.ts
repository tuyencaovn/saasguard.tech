import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsScheduler } from './alerts.scheduler';
import { CrashDetectionService } from './crash-detection.service';
import { AlertThreshold } from './entities/alert-threshold.entity';
import { AlertLog } from './entities/alert-log.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertThreshold, AlertLog]),
    TelegramModule,
    MetricsModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsScheduler, CrashDetectionService],
  exports: [AlertsService, CrashDetectionService],
})
export class AlertsModule {}
