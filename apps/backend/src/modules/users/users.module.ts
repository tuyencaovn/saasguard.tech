import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { AdminSeederService } from './admin-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AlertsModule)],
  controllers: [UsersController],
  providers: [UsersService, AdminSeederService],
  exports: [UsersService],
})
export class UsersModule {}
