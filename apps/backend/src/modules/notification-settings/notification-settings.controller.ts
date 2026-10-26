import { Controller, Get, Patch, Body, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto';
import { UpdateSlackSettingsDto } from './dto/update-slack-settings.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';
import { SlackService } from '../slack/slack.service';

@Controller('notification-settings')
export class NotificationSettingsController {
  constructor(
    private readonly settingsService: NotificationSettingsService,
    private readonly emailService: EmailService,
    private readonly telegramService: TelegramService,
    private readonly slackService: SlackService,
  ) {}

  /**
   * Get all notification settings (Admin only)
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getAll() {
    const { email, telegram, slack } = await this.settingsService.getAllSettings();
    return {
      email: email ? this.sanitizeEmailSettings(email) : null,
      telegram: telegram ? this.sanitizeTelegramSettings(telegram) : null,
      slack: slack ? this.sanitizeSlackSettings(slack) : null,
    };
  }

  /**
   * Get email settings (Admin only)
   */
  @Get('email')
  @Roles(UserRole.ADMIN)
  async getEmailSettings() {
    const settings = await this.settingsService.getEmailSettings();
    return settings ? this.sanitizeEmailSettings(settings) : null;
  }

  /**
   * Update email settings (Admin only)
   */
  @Patch('email')
  @Roles(UserRole.ADMIN)
  async updateEmailSettings(@Body() dto: UpdateEmailSettingsDto) {
    const updated = await this.settingsService.updateEmailSettings(dto);
    // Reinitialize transporter with new settings
    await this.emailService.reinitialize();
    return this.sanitizeEmailSettings(updated);
  }

  /**
   * Get telegram settings (Admin only)
   */
  @Get('telegram')
  @Roles(UserRole.ADMIN)
  async getTelegramSettings() {
    const settings = await this.settingsService.getTelegramSettings();
    return settings ? this.sanitizeTelegramSettings(settings) : null;
  }

  /**
   * Update telegram settings (Admin only)
   */
  @Patch('telegram')
  @Roles(UserRole.ADMIN)
  async updateTelegramSettings(@Body() dto: UpdateTelegramSettingsDto) {
    const updated = await this.settingsService.updateTelegramSettings(dto);
    // Reinitialize telegram service with new settings
    await this.telegramService.reinitialize();
    return this.sanitizeTelegramSettings(updated);
  }

  /**
   * Get slack settings (Admin only)
   */
  @Get('slack')
  @Roles(UserRole.ADMIN)
  async getSlackSettings() {
    const settings = await this.settingsService.getSlackSettings();
    return settings ? this.sanitizeSlackSettings(settings) : null;
  }

  /**
   * Update slack settings (Admin only)
   */
  @Patch('slack')
  @Roles(UserRole.ADMIN)
  async updateSlackSettings(@Body() dto: UpdateSlackSettingsDto) {
    const updated = await this.settingsService.updateSlackSettings(dto);
    await this.slackService.reinitialize();
    return this.sanitizeSlackSettings(updated);
  }

  /**
   * Test slack configuration by sending a test message
   */
  @Post('slack/test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testSlack() {
    const sent = await this.slackService.sendTestMessage();
    return { success: sent, message: sent ? 'Test message sent' : 'Failed to send test message' };
  }

  /**
   * Test email configuration by sending a test email
   */
  @Post('email/test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body('email') email: string) {
    const sent = await this.emailService.sendTestEmail(email);
    return { success: sent, message: sent ? 'Test email sent' : 'Failed to send test email' };
  }

  /**
   * Test telegram configuration by sending a test message
   */
  @Post('telegram/test')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async testTelegram() {
    const sent = await this.telegramService.sendTestMessage();
    return { success: sent, message: sent ? 'Test message sent' : 'Failed to send test message' };
  }

  // Helper to hide sensitive data
  private sanitizeEmailSettings(settings: any) {
    return {
      id: settings.id,
      type: settings.type,
      enabled: settings.enabled,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass ? '••••••••' : null, // Mask password
      smtpFromName: settings.smtpFromName,
      smtpFromEmail: settings.smtpFromEmail,
      updatedAt: settings.updatedAt,
    };
  }

  private sanitizeTelegramSettings(settings: any) {
    return {
      id: settings.id,
      type: settings.type,
      enabled: settings.enabled,
      telegramBotToken: settings.telegramBotToken ? '••••••••' : null, // Mask token
      telegramChatId: settings.telegramChatId,
      updatedAt: settings.updatedAt,
    };
  }

  private sanitizeSlackSettings(settings: any) {
    return {
      id: settings.id,
      type: settings.type,
      enabled: settings.enabled,
      slackWebhookUrl: settings.slackWebhookUrl ? '••••••••' : null, // Mask webhook URL
      updatedAt: settings.updatedAt,
    };
  }
}
