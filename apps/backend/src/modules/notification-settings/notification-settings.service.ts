import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationSettings, NotificationType } from './entities/notification-settings.entity';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { UpdateTelegramSettingsDto } from './dto/update-telegram-settings.dto';

@Injectable()
export class NotificationSettingsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    @InjectRepository(NotificationSettings)
    private readonly repo: Repository<NotificationSettings>,
    private readonly configService: ConfigService,
  ) {}

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
        smtpPort: this.configService.get<number>('SMTP_PORT', 587),
        smtpUser: this.configService.get<string>('SMTP_USER') || undefined,
        smtpPass: this.configService.get<string>('SMTP_PASS') || undefined,
        smtpFromName: this.configService.get<string>('SMTP_FROM_NAME', 'BimNext Monitor'),
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
  }

  async getEmailSettings(): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { type: NotificationType.EMAIL } });
  }

  async getTelegramSettings(): Promise<NotificationSettings | null> {
    return this.repo.findOne({ where: { type: NotificationType.TELEGRAM } });
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
    if (dto.smtpPass !== undefined) settings.smtpPass = dto.smtpPass;
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
    if (dto.telegramBotToken !== undefined) settings.telegramBotToken = dto.telegramBotToken;
    if (dto.telegramChatId !== undefined) settings.telegramChatId = dto.telegramChatId;

    return this.repo.save(settings);
  }

  /**
   * Get all notification settings for status display
   */
  async getAllSettings(): Promise<{
    email: NotificationSettings | null;
    telegram: NotificationSettings | null;
  }> {
    const [email, telegram] = await Promise.all([
      this.getEmailSettings(),
      this.getTelegramSettings(),
    ]);
    return { email, telegram };
  }
}
