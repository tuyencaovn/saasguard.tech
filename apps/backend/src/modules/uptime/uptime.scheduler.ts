import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { UptimeService, UptimeTransition } from './uptime.service';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { SlackService } from '../slack/slack.service';
import { getBrandConfig } from '../../config/brand.config';

@Injectable()
export class UptimeScheduler {
  private readonly logger = new Logger(UptimeScheduler.name);
  private readonly appName: string;

  constructor(
    private readonly uptimeService: UptimeService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDueMonitors() {
    try {
      const results = await this.uptimeService.checkDueMonitors();
      for (const { monitor, transition } of results) {
        if (transition) await this.sendNotification(monitor, transition);
      }
    } catch (err) {
      this.logger.error('Uptime scheduled check failed', err);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneHistory() {
    try {
      const removed = await this.uptimeService.pruneOldStats();
      if (removed > 0) this.logger.log(`Pruned ${removed} old uptime stat rows`);
    } catch (err) {
      this.logger.error('Uptime history prune failed', err);
    }
  }

  private async sendNotification(monitor: UptimeMonitor, transition: UptimeTransition) {
    if (!transition) return;

    const label = monitor.name || monitor.url;
    const message =
      transition === 'down'
        ? `${label} is DOWN. ${monitor.errorMessage ?? 'The endpoint is not responding.'}`
        : `${label} is back UP and responding normally.`;

    if (monitor.notifyEmail) {
      const recipient =
        monitor.notifyEmailTo || this.configService.get<string>('ADMIN_EMAIL');
      if (recipient) {
        const subject =
          transition === 'down'
            ? `DOWN: ${label}`
            : `RECOVERED: ${label}`;
        const html = this.buildEmailHtml(monitor, transition, message);
        await this.emailService
          .sendAlertEmail(recipient, subject, html)
          .catch((err) =>
            this.logger.error(`Uptime email notification failed for ${monitor.url}`, err),
          );
      }
    }

    if (monitor.notifyTelegram) {
      const telegramMsg = this.buildTelegramMessage(transition, message);
      await this.telegramService
        .sendAlertMessage(telegramMsg)
        .catch((err) =>
          this.logger.error(`Uptime telegram notification failed for ${monitor.url}`, err),
        );
    }

    if (monitor.notifySlack) {
      const emoji = transition === 'down' ? ':red_circle:' : ':large_green_circle:';
      const title = transition === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
      const slackMsg = `${emoji} *${title}*\n\n${message}\n\n— ${this.appName}`;
      await this.slackService
        .sendAlertMessage(slackMsg)
        .catch((err) =>
          this.logger.error(`Uptime slack notification failed for ${monitor.url}`, err),
        );
    }
  }

  private buildEmailHtml(
    monitor: UptimeMonitor,
    transition: UptimeTransition,
    message: string,
  ): string {
    const color = transition === 'down' ? '#ef4444' : '#10b981';
    const title = transition === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${title}</h2>
        <p>${message}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">URL:</td>
              <td style="padding: 8px 0; font-weight: bold;">${monitor.url}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0; font-weight: bold; color: ${color};">${transition === 'down' ? 'DOWN' : 'UP'}</td>
            </tr>
            ${monitor.lastStatusCode ? `<tr>
              <td style="padding: 8px 0; color: #666;">HTTP Code:</td>
              <td style="padding: 8px 0;">${monitor.lastStatusCode}</td>
            </tr>` : ''}
            ${monitor.lastChecked ? `<tr>
              <td style="padding: 8px 0; color: #666;">Checked:</td>
              <td style="padding: 8px 0;">${new Date(monitor.lastChecked).toLocaleString()}</td>
            </tr>` : ''}
          </table>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">— ${this.appName}</p>
      </div>
    `;
  }

  private buildTelegramMessage(transition: UptimeTransition, message: string): string {
    const emoji = transition === 'down' ? '🔴' : '🟢';
    const title = transition === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
    return `${emoji} <b>${title}</b>\n\n${message}\n\n— ${this.appName}`;
  }
}
