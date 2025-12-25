import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordReset } from './entities/password-reset.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepo: Repository<PasswordReset>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return success message to prevent email enumeration
    const successMessage = 'If an account exists with this email, you will receive a password reset link.';

    if (!user || !user.isActive) {
      return { message: successMessage };
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Expire in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Save password reset token
    const passwordReset = this.passwordResetRepo.create({
      token,
      userId: user.id,
      expiresAt,
    });
    await this.passwordResetRepo.save(passwordReset);

    // Build reset URL
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3006');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return { message: successMessage };
  }

  async validateResetToken(token: string): Promise<{ valid: boolean; email: string }> {
    const passwordReset = await this.passwordResetRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!passwordReset) {
      throw new NotFoundException('Invalid reset token');
    }

    if (passwordReset.isUsed) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (passwordReset.isExpired) {
      throw new BadRequestException('Reset token has expired');
    }

    return {
      valid: true,
      email: passwordReset.user.email,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const passwordReset = await this.passwordResetRepo.findOne({
      where: { token: dto.token },
      relations: ['user'],
    });

    if (!passwordReset) {
      throw new NotFoundException('Invalid reset token');
    }

    if (passwordReset.isUsed) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (passwordReset.isExpired) {
      throw new BadRequestException('Reset token has expired');
    }

    // Update user password (don't hash here - usersService.update will hash it)
    await this.usersService.update(passwordReset.userId, { password: dto.password });

    // Mark token as used
    passwordReset.usedAt = new Date();
    await this.passwordResetRepo.save(passwordReset);

    return { message: 'Password reset successfully' };
  }
}
