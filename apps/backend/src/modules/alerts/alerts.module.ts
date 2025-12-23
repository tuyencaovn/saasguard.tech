import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertThreshold } from './entities/alert-threshold.entity';
import { AlertLog } from './entities/alert-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertThreshold, AlertLog])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
