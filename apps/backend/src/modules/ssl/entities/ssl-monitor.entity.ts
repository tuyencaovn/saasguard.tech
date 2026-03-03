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

export enum SslStatus {
  UNKNOWN = 'unknown',
  VALID = 'valid',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EXPIRED = 'expired',
  ERROR = 'error',
}

@Entity('ssl_monitors')
export class SslMonitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  domain: string;

  @Column({ default: 443 })
  port: number;

  @Column({ type: 'enum', enum: SslStatus, default: SslStatus.UNKNOWN })
  status: SslStatus;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt: Date | null;

  @Column({ nullable: true, type: 'int' })
  daysUntilExpiry: number | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastChecked: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  issuer: string | null;

  @Column({ nullable: true, type: 'varchar' })
  errorMessage: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
