import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return;
    }

    const count = await this.userRepository.count();
    if (count > 0) {
      this.logger.log('Admin user already exists, skipping seed');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.userRepository.create({
      email,
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    });
    await this.userRepository.save(admin);
    this.logger.log(`Admin user created: ${email}`);
  }
}
