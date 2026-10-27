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

  // POST to the webhook with a per-attempt timeout and retries, so a transient
  // network blip doesn't drop the notification.
  private async post(webhookUrl: string, text: string): Promise<boolean> {
    const body = JSON.stringify({ text });
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(8000),
        });
        if (response.ok) {
          this.logger.log('Slack message sent successfully');
          return true;
        }
        const error = await response.text();
        this.logger.error(`Slack webhook error (attempt ${attempt}): ${error}`);
        // 4xx means a bad/removed webhook — retrying won't help.
        if (response.status >= 400 && response.status < 500) return false;
      } catch (error) {
        this.logger.warn(`Slack send attempt ${attempt} failed: ${(error as Error).message}`);
      }
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
    this.logger.error('Failed to send Slack message after retries');
    return false;
  }

  isConfigured(): boolean {
    return this.enabled && !!this.webhookUrl;
  }
}
