import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotificationSettingsService } from './modules/notification-settings/notification-settings.service';
import { getBrandConfig } from './config/brand.config';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();
  private readonly appName: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
  }

  getHello(): string {
    return `${this.appName} API`;
  }

  async getHealth() {
    // Get settings from database (which has the actual configured values)
    const { email: emailSettings, telegram: telegramSettings } =
      await this.notificationSettingsService.getAllSettings();

    // Check if email is configured (has host and user)
    const emailConfigured = !!(emailSettings?.smtpHost && emailSettings?.smtpUser);
    const emailProvider = emailSettings?.smtpHost ? emailSettings.smtpHost : null;

    // Check if telegram is configured (has bot token)
    const telegramConfigured = !!telegramSettings?.telegramBotToken;

    return {
      version: '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      database: {
        connected: this.dataSource.isInitialized,
        type: 'PostgreSQL',
      },
      email: {
        configured: emailConfigured,
        provider: emailProvider ? `SMTP (${emailProvider})` : null,
      },
      telegram: {
        configured: telegramConfigured,
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
