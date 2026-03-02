import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SslMonitor } from './entities/ssl-monitor.entity';
import { SslService } from './ssl.service';
import { SslScheduler } from './ssl.scheduler';
import { SslController } from './ssl.controller';
import { EmailModule } from '../email/email.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SslMonitor]),
    EmailModule,
    TelegramModule,
  ],
  controllers: [SslController],
  providers: [SslService, SslScheduler],
  exports: [SslService],
})
export class SslModule {}
