import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('passkey_credentials')
export class PasskeyCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({ name: 'credential_id', unique: true })
  @Index()
  credentialId: string; // base64url

  @Column({ name: 'public_key', type: 'text' })
  publicKey: string; // base64url of the COSE public key

  @Column({
    type: 'bigint',
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  counter: number;

  @Column({ type: 'simple-json', nullable: true })
  transports: string[] | null;

  @Column({ name: 'backed_up', default: false })
  backedUp: boolean;

  @Column({ name: 'device_type', nullable: true })
  deviceType: string | null;

  @Column()
  name: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;
}
