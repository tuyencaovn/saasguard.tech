import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { UptimeHourlyStat } from './entities/uptime-hourly-stat.entity';
import { UptimeService } from './uptime.service';
import { UptimeScheduler } from './uptime.scheduler';
import { UptimeController } from './uptime.controller';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UptimeMonitor, UptimeHourlyStat]),
    EmailModule,
    TelegramModule,
    SlackModule,
  ],
  controllers: [UptimeController],
  providers: [UptimeService, UptimeScheduler],
  exports: [UptimeService],
})
export class UptimeModule {}
