import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationType {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

/**
 * Global notification settings stored in DB
 * Single row per type (email/telegram) - global config for all users
 */
@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: NotificationType, unique: true })
  type: NotificationType;

  @Column({ default: false })
  enabled: boolean;

  // SMTP settings (for email type)
  @Column({ nullable: true })
  smtpHost: string;

  @Column({ nullable: true })
  smtpPort: number;

  @Column({ nullable: true })
  smtpUser: string;

  @Column({ nullable: true })
  smtpPass: string; // encrypted in production

  @Column({ nullable: true })
  smtpFromName: string;

  @Column({ nullable: true })
  smtpFromEmail: string;

  // Telegram settings (for telegram type)
  @Column({ nullable: true })
  telegramBotToken: string;

  @Column({ nullable: true })
  telegramChatId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
