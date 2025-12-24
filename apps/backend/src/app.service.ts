import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  getHello(): string {
    return 'BimNext Server Monitor API';
  }

  async getHealth() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const telegramToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    return {
      version: '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      database: {
        connected: this.dataSource.isInitialized,
        type: 'PostgreSQL',
      },
      email: {
        configured: !!(smtpHost && smtpUser),
        provider: smtpHost ? `SMTP (${smtpHost})` : null,
      },
      telegram: {
        configured: !!telegramToken,
      },
      metrics: {
        refreshInterval: 3,
        retentionDays: 7,
      },
      alerts: {
        logRetentionDays: 90,
      },
    };
  }
}
