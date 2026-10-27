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

    return this.postMessage(message);
  }

  /**
   * POST to the Telegram API with a per-attempt timeout and retries, so a flaky
   * or throttled network (common for Telegram) doesn't drop the notification.
   */
  private async postMessage(text: string): Promise<boolean> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    const body = JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'HTML' });

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          this.logger.log('Telegram message sent successfully');
          return true;
        }
        const error = await response.text();
        this.logger.error(`Telegram API error (attempt ${attempt}): ${error}`);
        // 4xx is a config problem (bad token/chat) — retrying won't help.
        if (response.status >= 400 && response.status < 500) return false;
      } catch (error) {
        this.logger.warn(`Telegram send attempt ${attempt} failed: ${(error as Error).message}`);
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
    this.logger.error('Failed to send Telegram message after retries');
    return false;
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

    return this.postMessage(testMessage);
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
