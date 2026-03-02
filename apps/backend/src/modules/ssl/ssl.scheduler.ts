import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SslService } from './ssl.service';
import { SslMonitor, SslStatus } from './entities/ssl-monitor.entity';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { getBrandConfig } from '../../config/brand.config';

@Injectable()
export class SslScheduler {
  private readonly logger = new Logger(SslScheduler.name);
  private readonly appName: string;

  constructor(
    private readonly sslService: SslService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
  }

  @Cron('0 */6 * * *')
  async checkAllSslCertificates() {
    this.logger.log('Running scheduled SSL certificate check');
    try {
      const monitors = await this.sslService.checkAllDomains();
      for (const monitor of monitors) {
        await this.sendNotificationIfNeeded(monitor);
      }
    } catch (err) {
      this.logger.error('SSL scheduled check failed', err);
    }
  }

  private async sendNotificationIfNeeded(monitor: SslMonitor) {
    const days = monitor.daysUntilExpiry;
    const shouldNotify =
      monitor.status === SslStatus.EXPIRED ||
      monitor.status === SslStatus.CRITICAL ||
      (monitor.status === SslStatus.WARNING && (days === 30 || days === 14));

    if (!shouldNotify) return;

    const message = this.buildNotificationMessage(monitor);
    const subject = this.buildEmailSubject(monitor);
    const html = this.buildEmailHtml(monitor, message);

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    if (adminEmail) {
      await this.emailService.sendAlertEmail(adminEmail, subject, html).catch((err) =>
        this.logger.error(`SSL email notification failed for ${monitor.domain}`, err),
      );
    }

    const telegramMsg = this.buildTelegramMessage(monitor, message);
    await this.telegramService.sendAlertMessage(telegramMsg).catch((err) =>
      this.logger.error(`SSL telegram notification failed for ${monitor.domain}`, err),
    );
  }

  private buildNotificationMessage(monitor: SslMonitor): string {
    const { domain, daysUntilExpiry: days } = monitor;
    if (monitor.status === SslStatus.EXPIRED) {
      return `SSL certificate for ${domain} has EXPIRED. Your visitors see security warnings.`;
    }
    if (days !== null && days <= 7) {
      return `URGENT: SSL certificate for ${domain} expires in ${days} days!`;
    }
    if (days !== null && days <= 14) {
      return `Your SSL certificate for ${domain} expires in ${days} days. Renew now to avoid downtime.`;
    }
    return `Your SSL certificate for ${domain} expires in ${days} days. Consider renewing soon.`;
  }

  private buildEmailSubject(monitor: SslMonitor): string {
    if (monitor.status === SslStatus.EXPIRED) {
      return `SSL Certificate EXPIRED: ${monitor.domain}`;
    }
    if (monitor.status === SslStatus.CRITICAL) {
      return `URGENT: SSL Certificate expires in ${monitor.daysUntilExpiry} days — ${monitor.domain}`;
    }
    return `SSL Certificate expiring in ${monitor.daysUntilExpiry} days — ${monitor.domain}`;
  }

  private buildEmailHtml(monitor: SslMonitor, message: string): string {
    const color = monitor.status === SslStatus.EXPIRED || monitor.status === SslStatus.CRITICAL
      ? '#ef4444'
      : '#f59e0b';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">SSL Certificate Alert</h2>
        <p>${message}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Domain:</td>
              <td style="padding: 8px 0; font-weight: bold;">${monitor.domain}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Status:</td>
              <td style="padding: 8px 0; font-weight: bold; color: ${color};">${monitor.status.toUpperCase()}</td>
            </tr>
            ${monitor.expiresAt ? `<tr>
              <td style="padding: 8px 0; color: #666;">Expires:</td>
              <td style="padding: 8px 0;">${new Date(monitor.expiresAt).toLocaleDateString()}</td>
            </tr>` : ''}
            ${monitor.issuer ? `<tr>
              <td style="padding: 8px 0; color: #666;">Issuer:</td>
              <td style="padding: 8px 0;">${monitor.issuer}</td>
            </tr>` : ''}
          </table>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">— ${this.appName}</p>
      </div>
    `;
  }

  private buildTelegramMessage(monitor: SslMonitor, message: string): string {
    const emoji = monitor.status === SslStatus.EXPIRED ? '🔴'
      : monitor.status === SslStatus.CRITICAL ? '🟠'
      : '🟡';
    return `${emoji} <b>SSL Certificate Alert</b>\n\n${message}\n\n— ${this.appName}`;
  }
}
