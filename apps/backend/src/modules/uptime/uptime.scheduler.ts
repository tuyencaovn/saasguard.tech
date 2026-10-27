import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { UptimeService } from './uptime.service';
import { UptimeMonitor } from './entities/uptime-monitor.entity';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { SlackService } from '../slack/slack.service';
import { getBrandConfig } from '../../config/brand.config';

type Kind = 'down' | 'recovered';

function label(monitor: UptimeMonitor): string {
  return monitor.name || monitor.url;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

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
      const downs = results.filter((r) => r.transition === 'down').map((r) => r.monitor);
      const recovered = results.filter((r) => r.transition === 'recovered').map((r) => r.monitor);
      // One message per channel per cycle — monitors that fail together (e.g. same
      // host) are grouped instead of sending one alert each.
      await this.notifyGroup(downs, 'down');
      await this.notifyGroup(recovered, 'recovered');
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

  private async notifyGroup(monitors: UptimeMonitor[], kind: Kind) {
    if (monitors.length === 0) return;

    const slackMonitors = monitors.filter((m) => m.notifySlack);
    if (slackMonitors.length > 0) {
      await this.slackService
        .sendAlertMessage(this.buildSlackMessage(slackMonitors, kind))
        .catch((err) => this.logger.error('Uptime slack notification failed', err));
    }

    const telegramMonitors = monitors.filter((m) => m.notifyTelegram);
    if (telegramMonitors.length > 0) {
      await this.telegramService
        .sendAlertMessage(this.buildTelegramMessage(telegramMonitors, kind))
        .catch((err) => this.logger.error('Uptime telegram notification failed', err));
    }

    await this.sendEmails(monitors.filter((m) => m.notifyEmail), kind);
  }

  private async sendEmails(monitors: UptimeMonitor[], kind: Kind) {
    if (monitors.length === 0) return;

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    // Group by resolved recipient so a per-monitor override still gets its own email.
    const byRecipient = new Map<string, UptimeMonitor[]>();
    for (const monitor of monitors) {
      const recipient = monitor.notifyEmailTo || adminEmail;
      if (!recipient) continue;
      const list = byRecipient.get(recipient) ?? [];
      list.push(monitor);
      byRecipient.set(recipient, list);
    }

    for (const [recipient, list] of byRecipient) {
      const subject = this.buildEmailSubject(list, kind);
      const html = this.buildEmailHtml(list, kind);
      await this.emailService
        .sendAlertEmail(recipient, subject, html)
        .catch((err) => this.logger.error('Uptime email notification failed', err));
    }
  }

  private buildEmailSubject(monitors: UptimeMonitor[], kind: Kind): string {
    const prefix = kind === 'down' ? 'DOWN' : 'RECOVERED';
    if (monitors.length === 1) return `${prefix}: ${label(monitors[0])}`;
    return `${prefix}: ${monitors.length} monitors`;
  }

  private lineText(monitor: UptimeMonitor, kind: Kind): string {
    if (kind === 'down') {
      return `${label(monitor)} — ${monitor.errorMessage ?? 'not responding'}`;
    }
    return `${label(monitor)} — back up`;
  }

  private buildSlackMessage(monitors: UptimeMonitor[], kind: Kind): string {
    const emoji = kind === 'down' ? ':red_circle:' : ':large_green_circle:';
    const base = kind === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
    const title = monitors.length > 1 ? `${base} (${monitors.length})` : base;
    const lines = monitors.map((m) => `• ${this.lineText(m, kind)}`).join('\n');
    return `${emoji} *${title}*\n\n${lines}\n\n— ${this.appName}`;
  }

  private buildTelegramMessage(monitors: UptimeMonitor[], kind: Kind): string {
    const emoji = kind === 'down' ? '🔴' : '🟢';
    const base = kind === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
    const title = monitors.length > 1 ? `${base} (${monitors.length})` : base;
    const lines = monitors.map((m) => `• ${escapeHtml(this.lineText(m, kind))}`).join('\n');
    return `${emoji} <b>${escapeHtml(title)}</b>\n\n${lines}\n\n— ${this.appName}`;
  }

  private buildEmailHtml(monitors: UptimeMonitor[], kind: Kind): string {
    const color = kind === 'down' ? '#ef4444' : '#10b981';
    const base = kind === 'down' ? 'Uptime Alert — DOWN' : 'Uptime Alert — Recovered';
    const title = monitors.length > 1 ? `${base} (${monitors.length})` : base;
    const rows = monitors
      .map(
        (m) => `
          <tr>
            <td style="padding: 10px 12px; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: bold;">${escapeHtml(label(m))}</div>
              <div style="color: #666; font-size: 13px;">${escapeHtml(m.url)}</div>
            </td>
            <td style="padding: 10px 12px; border-top: 1px solid #e2e8f0; text-align: right; color: ${color}; font-weight: bold;">
              ${kind === 'down' ? 'DOWN' : 'UP'}
              ${m.lastStatusCode ? `<div style="color: #666; font-weight: normal; font-size: 13px;">HTTP ${m.lastStatusCode}</div>` : ''}
              ${kind === 'down' && m.errorMessage ? `<div style="color: #666; font-weight: normal; font-size: 13px;">${escapeHtml(m.errorMessage)}</div>` : ''}
            </td>
          </tr>`,
      )
      .join('');
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${title}</h2>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px 12px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">${rows}</table>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">— ${this.appName}</p>
      </div>
    `;
  }
}
