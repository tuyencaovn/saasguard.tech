import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../modules/users/entities/user.entity';

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bimnext.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  try {
    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail(adminEmail);
    if (existingAdmin) {
      console.log(`Admin user already exists: ${adminEmail}`);
      await app.close();
      return;
    }

    // Create admin user
    const admin = await usersService.create({
      email: adminEmail,
      password: adminPassword,
      role: UserRole.ADMIN,
    });

    console.log('Admin user created successfully:');
    console.log(`  Email: ${admin.email}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Password: ${adminPassword}`);
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
  }

  await app.close();
}

seedAdmin();
