import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { getBrandConfig } from '../../config/brand.config';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private webhookUrl: string | null = null;
  private enabled = false;
  private appName: string;

  constructor(
    @Inject(forwardRef(() => NotificationSettingsService))
    private readonly settingsService: NotificationSettingsService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
    this.initFromSettings();
  }

  private async initFromSettings() {
    try {
      const settings = await this.settingsService.getSlackSettings();
      if (settings) {
        this.enabled = settings.enabled;
        this.webhookUrl = settings.slackWebhookUrl;
        if (this.enabled && this.webhookUrl) {
          this.logger.log('Slack configured and enabled');
        } else {
          this.logger.warn('Slack not configured or disabled');
        }
      }
    } catch {
      this.logger.warn('Slack settings not available yet');
    }
  }

  async reinitialize() {
    await this.initFromSettings();
  }

  /**
   * Send alert message to the configured Slack incoming webhook
   */
  async sendAlertMessage(message: string): Promise<boolean> {
    if (!this.enabled || !this.webhookUrl) {
      await this.initFromSettings();
    }

    if (!this.enabled || !this.webhookUrl) {
      this.logger.warn('Slack not configured - message not sent');
      return false;
    }

    return this.post(this.webhookUrl, message);
  }

  async sendTestMessage(): Promise<boolean> {
    if (!this.webhookUrl) {
      await this.initFromSettings();
    }
    if (!this.webhookUrl) {
      this.logger.warn('Slack not configured - cannot send test');
      return false;
    }
    const testMessage = `:test_tube: *Test Message*\n\nYour Slack notification is configured correctly!\n\nSent from ${this.appName} at ${new Date().toLocaleString()}`;
    return this.post(this.webhookUrl, testMessage);
  }

  private async post(webhookUrl: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Slack webhook error: ${error}`);
        return false;
      }
      this.logger.log('Slack message sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send Slack message', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.enabled && !!this.webhookUrl;
  }
}
