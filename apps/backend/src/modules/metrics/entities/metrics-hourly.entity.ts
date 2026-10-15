import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('metrics_hourly')
export class MetricsHourly {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Start of the hour this row aggregates
  @Index({ unique: true })
  @Column({ type: 'timestamp' })
  hour: Date;

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
