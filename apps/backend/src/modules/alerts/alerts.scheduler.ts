import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertsService } from './alerts.service';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { AlertThreshold, MetricName, NotificationChannel, Operator } from './entities/alert-threshold.entity';
import { DeliveryStatus } from './entities/alert-log.entity';
import { ConfigService } from '@nestjs/config';

interface SystemMetrics {
  cpu: { usage: number };
  ram: { usagePercent: number };
  disk: Array<{ usagePercent: number }>;
}

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(
    private readonly alertsService: AlertsService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Listen for metrics updates and check thresholds
   */
  @OnEvent('metrics.updated')
  async checkThresholds(metrics: SystemMetrics) {
    try {
      const thresholds = await this.alertsService.findEnabledThresholds();

      for (const threshold of thresholds) {
        const currentValue = this.getMetricValue(metrics, threshold.metricName);
        const shouldTrigger = this.checkCondition(currentValue, threshold.operator, threshold.value);

        if (shouldTrigger) {
          this.logger.log(`Threshold triggered: ${threshold.metricName} ${threshold.operator} ${threshold.value} (current: ${currentValue.toFixed(1)}%)`);

          // Check cooldown
          const canSend = await this.alertsService.canSendAlert(threshold.id);
          if (!canSend) {
            this.logger.log(`Skipping alert (cooldown active) for threshold ${threshold.id}`);
            continue;
          }

          // Send notifications to all channels
          await this.sendNotifications(threshold, currentValue);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check thresholds', error);
    }
  }

  private getMetricValue(metrics: SystemMetrics, metricName: MetricName): number {
    switch (metricName) {
      case MetricName.CPU:
        return metrics.cpu.usage;
      case MetricName.RAM:
        return metrics.ram.usagePercent;
      case MetricName.DISK:
        // Use root disk (first one) or the one with highest usage
        return metrics.disk[0]?.usagePercent ?? 0;
      default:
        return 0;
    }
  }

  private checkCondition(value: number, operator: Operator, threshold: number): boolean {
    switch (operator) {
      case Operator.GT:
        return value > threshold;
      case Operator.GTE:
        return value >= threshold;
      case Operator.LT:
        return value < threshold;
      case Operator.LTE:
        return value <= threshold;
      case Operator.EQ:
        return value === threshold;
      case Operator.NE:
        return value !== threshold;
      default:
        return false;
    }
  }

  private async sendNotifications(threshold: AlertThreshold, currentValue: number) {
    // Always create a log entry for history
    const email = threshold.user?.email || this.configService.get<string>('ADMIN_EMAIL') || 'no-email-configured';
    const log = await this.alertsService.createLog(threshold.id, currentValue, email);

    this.logger.log(`📢 Alert created: ${threshold.metricName.toUpperCase()} ${threshold.operator} ${threshold.value}% (current: ${currentValue.toFixed(1)}%)`);

    for (const channel of threshold.channels) {
      if (channel === NotificationChannel.EMAIL) {
        if (email === 'no-email-configured') {
          this.logger.warn(`No email configured for threshold ${threshold.id} (no user and no ADMIN_EMAIL)`);
          await this.alertsService.updateLogStatus(log.id, DeliveryStatus.FAILED, 'No email configured');
        } else {
          await this.sendEmailAlert(threshold, currentValue, email, log.id);
        }
      } else if (channel === NotificationChannel.TELEGRAM) {
        await this.sendTelegramAlert(threshold, currentValue, log.id);
      }
    }
  }

  private async sendEmailAlert(threshold: AlertThreshold, currentValue: number, to: string, logId: string) {
    try {
      const subject = `⚠️ Alert: ${threshold.metricName.toUpperCase()} ${threshold.operator} ${threshold.value}%`;
      const html = this.buildAlertEmailHtml(threshold, currentValue);

      const sent = await this.emailService.sendAlertEmail(to, subject, html);

      await this.alertsService.updateLogStatus(
        logId,
        sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        sent ? undefined : 'Email sending failed',
      );

      if (sent) {
        this.logger.log(`✅ Email sent: ${threshold.metricName} at ${currentValue.toFixed(1)}% to ${to}`);
      } else {
        this.logger.warn(`❌ Email failed: SMTP not configured`);
      }
    } catch (error) {
      await this.alertsService.updateLogStatus(
        logId,
        DeliveryStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );
      this.logger.error(`Failed to send alert to ${to}`, error);
    }
  }

  private async sendTelegramAlert(threshold: AlertThreshold, currentValue: number, logId: string) {
    try {
      const message = this.telegramService.buildAlertMessage(
        threshold.metricName,
        threshold.operator,
        threshold.value,
        currentValue,
      );

      const sent = await this.telegramService.sendAlertMessage(message);

      // Update log status (note: for telegram we don't have specific recipient, just "telegram")
      if (sent) {
        this.logger.log(`✅ Telegram sent: ${threshold.metricName} at ${currentValue.toFixed(1)}%`);
      } else {
        this.logger.warn(`❌ Telegram failed: Not configured or disabled`);
      }
    } catch (error) {
      this.logger.error('Failed to send Telegram alert', error);
    }
  }

  private buildAlertEmailHtml(threshold: AlertThreshold, currentValue: number): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Server Alert Triggered</h2>
        <p>A monitoring alert has been triggered on your server.</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Metric:</td>
              <td style="padding: 8px 0; font-weight: bold;">${threshold.metricName.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Condition:</td>
              <td style="padding: 8px 0;">${threshold.operator} ${threshold.value}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Current Value:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${currentValue.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Time:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="color: #666; font-size: 14px;">
          Please check your server and take appropriate action.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          — BimNext Server Monitor
        </p>
      </div>
    `;
  }
}
