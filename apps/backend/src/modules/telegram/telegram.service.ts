import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { getBrandConfig } from '../../config/brand.config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private botToken: string | null = null;
  private chatId: string | null = null;
  private enabled = false;
  private appName: string;

  constructor(
    @Inject(forwardRef(() => NotificationSettingsService))
    private readonly settingsService: NotificationSettingsService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
    // Will be initialized after module init
    this.initFromSettings();
  }

  private async initFromSettings() {
    try {
      const settings = await this.settingsService.getTelegramSettings();
      if (settings) {
        this.enabled = settings.enabled;
        this.botToken = settings.telegramBotToken;
        this.chatId = settings.telegramChatId;
        if (this.enabled && this.botToken && this.chatId) {
          this.logger.log('Telegram configured and enabled');
        } else {
          this.logger.warn('Telegram not configured or disabled');
        }
      }
    } catch {
      // Settings may not be available yet during startup
      this.logger.warn('Telegram settings not available yet');
    }
  }

  /**
   * Reinitialize with new settings from DB
   */
  async reinitialize() {
    await this.initFromSettings();
  }

  /**
   * Send alert message to configured Telegram chat
   */
  async sendAlertMessage(message: string): Promise<boolean> {
    // Always reload settings to ensure we have the latest config
    if (!this.enabled || !this.botToken || !this.chatId) {
      await this.initFromSettings();
    }

    if (!this.enabled || !this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured - message not sent');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram API error: ${error}`);
        return false;
      }

      this.logger.log('Telegram message sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram message', error);
      return false;
    }
  }

  /**
   * Send test message to verify configuration
   */
  async sendTestMessage(): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      // Try to reload settings
      await this.initFromSettings();
    }

    if (!this.botToken || !this.chatId) {
      this.logger.warn('Telegram not configured - cannot send test');
      return false;
    }

    const testMessage = `🧪 <b>Test Message</b>\n\nYour Telegram notification is configured correctly!\n\nSent from ${this.appName} at ${new Date().toLocaleString()}`;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: testMessage,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Telegram test failed: ${error}`);
        return false;
      }

      this.logger.log('Telegram test message sent');
      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram test', error);
      return false;
    }
  }

  /**
   * Build formatted alert message for Telegram
   */
  buildAlertMessage(metricName: string, operator: string, threshold: number, currentValue: number): string {
    const emoji = currentValue >= 90 ? '🔴' : '⚠️';
    return `${emoji} <b>Server Alert</b>

<b>Metric:</b> ${metricName.toUpperCase()}
<b>Condition:</b> ${operator} ${threshold}%
<b>Current Value:</b> <b>${currentValue.toFixed(1)}%</b>
<b>Time:</b> ${new Date().toLocaleString()}

Please check your server and take appropriate action.`;
  }

  isConfigured(): boolean {
    return this.enabled && !!this.botToken && !!this.chatId;
  }
}
