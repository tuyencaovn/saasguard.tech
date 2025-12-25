import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromName: string = 'BimNext Monitor';
  private fromEmail: string | null = null;
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationSettingsService))
    private readonly settingsService: NotificationSettingsService,
  ) {
    // Initial setup from .env (will be overwritten by DB settings)
    this.initFromEnv();
    // Load from DB after a short delay to ensure DB is ready
    setTimeout(() => this.initFromSettings(), 1000);
  }

  private initFromEnv() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured in .env - waiting for DB settings');
      return;
    }

    this.createTransporter(host, port, user, pass);
    this.fromName = this.configService.get<string>('SMTP_FROM_NAME', 'BimNext Monitor');
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || user;
    this.enabled = true;
    this.logger.log(`SMTP configured from .env: ${host}:${port}`);
  }

  private async initFromSettings() {
    try {
      const settings = await this.settingsService.getEmailSettings();
      if (settings && settings.smtpHost && settings.smtpUser && settings.smtpPass) {
        this.createTransporter(
          settings.smtpHost,
          settings.smtpPort || 587,
          settings.smtpUser,
          settings.smtpPass,
        );
        this.fromName = settings.smtpFromName || 'BimNext Monitor';
        this.fromEmail = settings.smtpFromEmail || settings.smtpUser;
        this.enabled = settings.enabled;
        this.logger.log(`SMTP configured from DB: ${settings.smtpHost}:${settings.smtpPort}`);
      }
    } catch {
      this.logger.warn('Could not load email settings from DB');
    }
  }

  private createTransporter(host: string, port: number, user: string, pass: string) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  /**
   * Reinitialize with new settings from DB
   */
  async reinitialize() {
    await this.initFromSettings();
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): ${to}`);
      this.logger.log(`Reset URL: ${resetUrl}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested to reset your password for BimNext Server Monitor.</p>
            <p>Click the button below to set a new password. This link expires in 15 minutes.</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #7c3aed; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 8px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Or copy this link: ${resetUrl}
            </p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendAlertEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter || !this.enabled) {
      this.logger.warn(`Alert email not sent (SMTP not configured or disabled): ${to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Alert email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send alert email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      // Try to reload settings
      await this.initFromSettings();
    }

    if (!this.transporter) {
      this.logger.warn('SMTP not configured - cannot send test email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject: '🧪 Test Email - BimNext Server Monitor',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #22c55e;">✅ Email Configuration Working!</h2>
            <p>This is a test email from BimNext Server Monitor.</p>
            <p>Your SMTP configuration is correct and emails can be sent successfully.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      });

      this.logger.log(`Test email sent to: ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send test email to ${to}:`, error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.enabled && !!this.transporter;
  }
}
