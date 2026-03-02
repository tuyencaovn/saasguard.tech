import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlertsService } from './alerts.service';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { MetricsService } from '../metrics/metrics.service';
import { AlertThreshold, MetricName, NotificationChannel, Operator } from './entities/alert-threshold.entity';
import { DeliveryStatus } from './entities/alert-log.entity';
import { ConfigService } from '@nestjs/config';
import { getBrandConfig } from '../../config/brand.config';
import type { CrashDetectedEvent } from './crash-detection.service';

interface SystemMetrics {
  cpu: { usage: number };
  ram: { usagePercent: number };
  disk: Array<{ usagePercent: number }>;
}

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);
  private readonly appName: string;

  constructor(
    private readonly alertsService: AlertsService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
  }

  /**
   * Listen for metrics updates and check thresholds
   */
  @OnEvent('metrics.updated')
  async checkThresholds(metrics: SystemMetrics) {
    try {
      const thresholds = await this.alertsService.findEnabledThresholds();

      for (const threshold of thresholds) {
        // Crash loop thresholds handled by crash.detected event, not metric polling
        if (threshold.metricName === MetricName.CRASH_LOOP) continue;

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

          // Save current metrics to history so chart reflects the alert spike
          const fullMetrics = this.metricsService.getCachedMetrics();
          if (fullMetrics) {
            await this.metricsService.saveToHistory(fullMetrics).catch(() => {});
          }

          // Send notifications to all channels
          await this.sendNotifications(threshold, currentValue);
        }
      }
    } catch (error) {
      this.logger.error('Failed to check thresholds', error);
    }
  }

  /**
   * Handle crash loop detection events from CrashDetectionService
   */
  @OnEvent('crash.detected')
  async handleCrashDetected(event: CrashDetectedEvent) {
    try {
      // Find CRASH_LOOP thresholds or use defaults
      const thresholds = await this.alertsService.findEnabledThresholds();
      const crashThresholds = thresholds.filter(
        (t) => t.metricName === MetricName.CRASH_LOOP,
      );

      if (crashThresholds.length === 0) {
        this.logger.log(`Crash detected for ${event.name} but no CRASH_LOOP thresholds configured`);
        return;
      }

      for (const threshold of crashThresholds) {
        // Check cooldown
        const canSend = await this.alertsService.canSendAlert(threshold.id);
        if (!canSend) {
          this.logger.log(`Skipping crash alert (cooldown active) for ${event.name}`);
          continue;
        }

        // Send crash-specific notifications
        await this.sendCrashNotifications(threshold, event);
      }
    } catch (error) {
      this.logger.error('Failed to handle crash detection', error);
    }
  }

  private async sendCrashNotifications(
    threshold: AlertThreshold,
    event: CrashDetectedEvent,
  ) {
    const email =
      threshold.user?.email ||
      this.configService.get<string>('ADMIN_EMAIL') ||
      'no-email-configured';
    const log = await this.alertsService.createLog(
      threshold.id,
      event.count,
      email,
    );

    this.logger.log(
      `Crash alert: ${event.name} (${event.type}) restarted ${event.count} times in ${event.windowMinutes}min`,
    );

    for (const channel of threshold.channels) {
      if (channel === NotificationChannel.EMAIL) {
        if (email === 'no-email-configured') {
          await this.alertsService.updateLogStatus(
            log.id,
            DeliveryStatus.FAILED,
            'No email configured',
          );
        } else {
          await this.sendCrashEmailAlert(threshold, event, email, log.id);
        }
      } else if (channel === NotificationChannel.TELEGRAM) {
        await this.sendCrashTelegramAlert(event, log.id);
      }
    }
  }

  private async sendCrashEmailAlert(
    threshold: AlertThreshold,
    event: CrashDetectedEvent,
    to: string,
    logId: string,
  ) {
    try {
      const subject = `🔄 Crash Loop: ${event.name} restarted ${event.count} times`;
      const html = this.buildCrashEmailHtml(event);
      const sent = await this.emailService.sendAlertEmail(to, subject, html);

      await this.alertsService.updateLogStatus(
        logId,
        sent ? DeliveryStatus.SENT : DeliveryStatus.FAILED,
        sent ? undefined : 'Email sending failed',
      );
    } catch (error) {
      await this.alertsService.updateLogStatus(
        logId,
        DeliveryStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private async sendCrashTelegramAlert(
    event: CrashDetectedEvent,
    logId: string,
  ) {
    try {
      const message = [
        `🔄 *Crash Loop Detected*`,
        ``,
        `Your *${event.name}* ${event.type === 'docker' ? 'container' : 'process'} restarted *${event.count} times* in the last *${event.windowMinutes} minutes*.`,
        ``,
        `Please check your service immediately.`,
        `— ${this.appName}`,
      ].join('\n');

      const sent = await this.telegramService.sendAlertMessage(message);
      if (sent) {
        await this.alertsService.updateLogStatus(logId, DeliveryStatus.SENT);
      } else {
        await this.alertsService.updateLogStatus(logId, DeliveryStatus.FAILED, 'Telegram not configured');
      }
    } catch (error) {
      await this.alertsService.updateLogStatus(
        logId,
        DeliveryStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error',
      );
      this.logger.error('Failed to send crash Telegram alert', error);
    }
  }

  private buildCrashEmailHtml(event: CrashDetectedEvent): string {
    const typeLabel = event.type === 'docker' ? 'Container' : 'PM2 Process';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">🔄 Crash Loop Detected</h2>
        <p>Your <strong>${event.name}</strong> ${typeLabel.toLowerCase()} is restarting repeatedly.</p>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Service:</td>
              <td style="padding: 8px 0; font-weight: bold;">${event.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Type:</td>
              <td style="padding: 8px 0;">${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Restarts:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">${event.count} times in ${event.windowMinutes} minutes</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Time:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="color: #666; font-size: 14px;">
          Please check your service logs and take action to prevent data loss.
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          — ${this.appName}
        </p>
      </div>
    `;
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
      case MetricName.CRASH_LOOP:
        // Crash loop handled separately via crash.detected event
        return 0;
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

  private getDiskAlertMessage(currentValue: number): { subject: string; body: string; telegramText: string } {
    const isCritical = currentValue >= 90;
    if (isCritical) {
      return {
        subject: `Your server disk is ${currentValue.toFixed(0)}% full — action needed now`,
        body: `Your server disk is <strong>${currentValue.toFixed(0)}% full</strong>. Your database may stop writing soon. Please free up space or expand storage immediately.`,
        telegramText: `Your server disk is <b>${currentValue.toFixed(0)}% full</b>. Your database may stop writing soon. Action needed now.`,
      };
    }
    return {
      subject: `Heads up — your server disk is ${currentValue.toFixed(0)}% full`,
      body: `Your server disk is <strong>${currentValue.toFixed(0)}% full</strong>. Consider cleaning up old logs or expanding storage before you hit the critical threshold.`,
      telegramText: `Heads up — your server disk is <b>${currentValue.toFixed(0)}% full</b>. Consider cleaning up old logs or expanding storage.`,
    };
  }

  private async sendEmailAlert(threshold: AlertThreshold, currentValue: number, to: string, logId: string) {
    try {
      let subject: string;
      let html: string;
      if (threshold.metricName === MetricName.DISK) {
        const msg = this.getDiskAlertMessage(currentValue);
        subject = msg.subject;
        html = this.buildDiskAlertEmailHtml(currentValue, msg.body);
      } else {
        subject = `⚠️ Alert: ${threshold.metricName.toUpperCase()} ${threshold.operator} ${threshold.value}%`;
        html = this.buildAlertEmailHtml(threshold, currentValue);
      }

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
      let message: string;
      if (threshold.metricName === MetricName.DISK) {
        const msg = this.getDiskAlertMessage(currentValue);
        const emoji = currentValue >= 90 ? '🔴' : '🟡';
        message = `${emoji} <b>Disk Alert</b>\n\n${msg.telegramText}\n\n— ${this.appName}`;
      } else {
        message = this.telegramService.buildAlertMessage(
          threshold.metricName,
          threshold.operator,
          threshold.value,
          currentValue,
        );
      }

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

  private buildDiskAlertEmailHtml(currentValue: number, bodyMessage: string): string {
    const isCritical = currentValue >= 90;
    const color = isCritical ? '#ef4444' : '#f59e0b';
    const bgColor = isCritical ? '#fef2f2' : '#fffbeb';
    const borderColor = isCritical ? '#fecaca' : '#fde68a';
    const emoji = isCritical ? '🔴' : '🟡';
    const label = isCritical ? 'Critical: Disk Almost Full' : 'Warning: Disk Space Low';
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${color};">${emoji} ${label}</h2>
        <p>${bodyMessage}</p>

        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Disk Usage:</td>
              <td style="padding: 8px 0; font-weight: bold; color: ${color};">${currentValue.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Time:</td>
              <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          — ${this.appName}
        </p>
      </div>
    `;
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
          — ${this.appName}
        </p>
      </div>
    `;
  }
}
