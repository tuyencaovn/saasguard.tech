import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('metrics_daily')
export class MetricsDaily {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Calendar day (UTC midnight) this row aggregates
  @Index({ unique: true })
  @Column({ type: 'date' })
  day: string;

  @Column('decimal', { precision: 5, scale: 2 })
  cpuAvg: number;

  @Column('decimal', { precision: 5, scale: 2 })
  cpuMax: number;

  @Column('decimal', { precision: 5, scale: 2 })
  ramAvg: number;

  @Column('decimal', { precision: 5, scale: 2 })
  ramMax: number;

  @Column('decimal', { precision: 5, scale: 2 })
  diskAvg: number;

  @Column('decimal', { precision: 5, scale: 2 })
  diskMax: number;

  @Column('bigint', { default: 0 })
  networkRxAvg: number;

  @Column('bigint', { default: 0 })
  networkTxAvg: number;

  @Column('int', { default: 0 })
  sampleCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
