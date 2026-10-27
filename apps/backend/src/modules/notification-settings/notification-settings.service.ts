import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationSettings, NotificationType } from './entities/notification-settings.entity';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto';
import { UpdateSlackSettingsDto } from './dto/update-slack-settings.dto';
import { getBrandConfig } from '../../config/brand.config';

@Injectable()
export class NotificationSettingsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSettingsService.name);
  private readonly appName: string;

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly repo: Repository<NotificationSettings>,
    private readonly configService: ConfigService,
  ) {
    const brand = getBrandConfig(this.configService);
    this.appName = brand.appName;
  }

  /**
   * Initialize default settings from .env on first run
   */
  async onModuleInit() {
    await this.ensureDefaultSettings();
  }

  private async ensureDefaultSettings() {
    // Check if email settings exist
    const emailExists = await this.repo.findOne({ where: { type: NotificationType.EMAIL } });
    if (!emailExists) {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const emailSettings = this.repo.create({
        type: NotificationType.EMAIL,
        enabled: !!smtpHost,
        smtpHost: smtpHost || undefined,
        smtpPort: parseInt(this.configService.get<string>('SMTP_PORT', ''), 10) || 587,
        smtpUser: this.configService.get<string>('SMTP_USER') || undefined,
        smtpPass: this.configService.get<string>('SMTP_PASS') || undefined,
        smtpFromName: this.configService.get<string>('SMTP_FROM_NAME', this.appName),
        smtpFromEmail: this.configService.get<string>('SMTP_FROM_EMAIL') || undefined,
      });
      await this.repo.save(emailSettings);
      this.logger.log('Email settings initialized from .env');
    }

    // Check if telegram settings exist
    const telegramExists = await this.repo.findOne({ where: { type: NotificationType.TELEGRAM } });
    if (!telegramExists) {
      const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
      const telegramSettings = this.repo.create({
        type: NotificationType.TELEGRAM,
        enabled: !!botToken,
        telegramBotToken: botToken || undefined,
        telegramChatId: this.configService.get<string>('TELEGRAM_CHAT_ID') || undefined,
      });
      await this.repo.save(telegramSettings);
      this.logger.log('Telegram settings initialized from .env');
    }

    // Check if slack settings exist
    const slackExists = await this.repo.findOne({ where: { type: NotificationType.SLACK } });
    if (!slackExists) {
      const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
      const slackSettings = this.repo.create({
        type: NotificationType.SLACK,
        enabled: !!webhookUrl,
        slackWebhookUrl: webhookUrl || undefined,
      });
      await this.repo.save(slackSettings);
      this.logger.log('Slack settings initialized from .env');
    }
  }

  async getEmailSettings(): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { type: NotificationType.EMAIL } });
  }

  async getTelegramSettings(): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { type: NotificationType.TELEGRAM } });
  }

  async getSlackSettings(): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { type: NotificationType.SLACK } });
  }

  async updateEmailSettings(dto: UpdateEmailSettingsDto): Promise<NotificationSettings> {
    let settings = await this.getEmailSettings();
    if (!settings) {
      settings = this.repo.create({ type: NotificationType.EMAIL });
    }

    // Only update fields that are provided
    if (dto.enabled !== undefined) settings.enabled = dto.enabled;
    if (dto.smtpHost !== undefined) settings.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) settings.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) settings.smtpUser = dto.smtpUser;
    // Secret: only overwrite when a non-empty value is given, so a blank save keeps it.
    if (dto.smtpPass) settings.smtpPass = dto.smtpPass;
    if (dto.smtpFromName !== undefined) settings.smtpFromName = dto.smtpFromName;
    if (dto.smtpFromEmail !== undefined) settings.smtpFromEmail = dto.smtpFromEmail;

    return this.repo.save(settings);
  }

  async updateTelegramSettings(dto: UpdateTelegramSettingsDto): Promise<NotificationSettings> {
    let settings = await this.getTelegramSettings();
    if (!settings) {
      settings = this.repo.create({ type: NotificationType.TELEGRAM });
    }

    if (dto.enabled !== undefined) settings.enabled = dto.enabled;
    // Secret: only overwrite when a non-empty value is given, so a blank save keeps it.
    if (dto.telegramBotToken) settings.telegramBotToken = dto.telegramBotToken;
    if (dto.telegramChatId !== undefined) settings.telegramChatId = dto.telegramChatId;

    return this.repo.save(settings);
  }

  async updateSlackSettings(dto: UpdateSlackSettingsDto): Promise<NotificationSettings> {
    let settings = await this.getSlackSettings();
    if (!settings) {
      settings = this.repo.create({ type: NotificationType.SLACK });
    }

    if (dto.enabled !== undefined) settings.enabled = dto.enabled;
    // Secret: only overwrite when a non-empty value is given, so a blank save keeps it.
    if (dto.slackWebhookUrl) settings.slackWebhookUrl = dto.slackWebhookUrl;

    return this.repo.save(settings);
  }

  /**
   * Get all notification settings for status display
   */
  async getAllSettings(): Promise<{
    email: NotificationSettings | null;
    telegram: NotificationSettings | null;
    slack: NotificationSettings | null;
  }> {
    const [email, telegram, slack] = await Promise.all([
      this.getEmailSettings(),
      this.getTelegramSettings(),
      this.getSlackSettings(),
    ]);
    return { email, telegram, slack };
  }
}
