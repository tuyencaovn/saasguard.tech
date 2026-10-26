import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UptimeMonitor } from './uptime-monitor.entity';

/**
 * One row per monitor per hour. Keeps uptime history bounded (24 rows/day/monitor)
 * while still answering 24h / 7d / 30d windows accurately.
 */
@Entity('uptime_hourly_stats')
@Index(['monitorId', 'hourBucket'], { unique: true })
export class UptimeHourlyStat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  monitorId: string;

  @ManyToOne(() => UptimeMonitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitorId' })
  monitor: UptimeMonitor;

  @Column({ type: 'timestamptz' })
  hourBucket: Date;

  @Column({ type: 'int', default: 0 })
  totalChecks: number;

  @Column({ type: 'int', default: 0 })
  upChecks: number;
}
