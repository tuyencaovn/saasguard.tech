import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MetricName {
  CPU = 'cpu',
  RAM = 'ram',
  DISK = 'disk',
  CRASH_LOOP = 'crash_loop',
}

export enum Operator {
  GT = '>',
  LT = '<',
  EQ = '=',
  NE = '!=',
  GTE = '>=',
  LTE = '<=',
}

export enum NotificationChannel {
  EMAIL = 'email',
  TELEGRAM = 'telegram',
}

@Entity('alert_thresholds')
export class AlertThreshold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: MetricName })
  metricName: MetricName;

  @Column({ type: 'enum', enum: Operator })
  operator: Operator;

  @Column('decimal', { precision: 5, scale: 2 })
  value: number;

  @Column({ default: true })
  enabled: boolean;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column({ default: 300000 }) // 5 minutes cooldown
  cooldownMs: number;

  @Column({ default: 10 }) // crash detection window in minutes
  windowMinutes: number;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
