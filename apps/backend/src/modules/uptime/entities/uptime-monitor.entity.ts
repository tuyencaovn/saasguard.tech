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

export enum UptimeStatus {
  UNKNOWN = 'unknown',
  UP = 'up',
  DOWN = 'down',
}

@Entity('uptime_monitors')
export class UptimeMonitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  url: string;

  @Column({ nullable: true, type: 'varchar' })
  name: string | null;

  @Column({ default: 60 })
  checkIntervalSeconds: number;

  @Column({ type: 'enum', enum: UptimeStatus, default: UptimeStatus.UNKNOWN })
  status: UptimeStatus;

  @Column({ nullable: true, type: 'int' })
  lastStatusCode: number | null;

  @Column({ nullable: true, type: 'int' })
  lastResponseTimeMs: number | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastChecked: Date | null;

  @Column({ default: 0 })
  consecutiveFailures: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastDownAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastUpAt: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  errorMessage: string | null;

  @Column({ default: true })
  notifyEmail: boolean;

  @Column({ default: true })
  notifyTelegram: boolean;

  @Column({ default: true })
  notifySlack: boolean;

  // Optional override recipient; falls back to ADMIN_EMAIL when null.
  @Column({ nullable: true, type: 'varchar' })
  notifyEmailTo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
