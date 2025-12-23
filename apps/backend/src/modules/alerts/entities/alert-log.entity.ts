import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AlertThreshold } from './alert-threshold.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('alert_logs')
@Index(['alertThresholdId', 'triggeredAt'])
export class AlertLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  alertThresholdId: string;

  @ManyToOne(() => AlertThreshold, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alertThresholdId' })
  alertThreshold: AlertThreshold;

  @Column('decimal', { precision: 5, scale: 2 })
  metricValue: number;

  @Column()
  @Index()
  triggeredAt: Date;

  @Column()
  sentTo: string; // email address or telegram chat_id

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  deliveryStatus: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}
