import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('metrics_history')
@Index(['timestamp'])
export class MetricsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 5, scale: 2 })
  cpuPercent: number;

  @Column('decimal', { precision: 5, scale: 2 })
  ramPercent: number;

  @Column('decimal', { precision: 5, scale: 2 })
  diskPercent: number;

  @Column('jsonb', { nullable: true })
  diskDetails: {
    fs: string;
    size: number;
    used: number;
    available: number;
    mount: string;
  }[];

  @Column('jsonb', { nullable: true })
  cpuDetails: {
    cores: number;
    speed: number;
    model: string;
  };

  @Column('jsonb', { nullable: true })
  ramDetails: {
    total: number;
    used: number;
    free: number;
  };

  // Network throughput (bytes per second)
  @Column('bigint', { default: 0 })
  networkRx: number;

  @Column('bigint', { default: 0 })
  networkTx: number;

  // Network interface link speed (Mbps)
  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  networkSpeed: number;

  @Column()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}
