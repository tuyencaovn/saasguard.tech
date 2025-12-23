import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepo: Repository<Invitation>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreateInvitationDto,
    invitedById: string,
  ): Promise<Invitation> {
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check for pending invitation
    const pendingInvitation = await this.invitationRepo.findOne({
      where: { email: dto.email },
      order: { createdAt: 'DESC' },
    });

    if (pendingInvitation?.isValid) {
      throw new ConflictException('Pending invitation already exists for this email');
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const invitation = this.invitationRepo.create({
      token,
      email: dto.email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedBy: { id: invitedById },
    });

    return this.invitationRepo.save(invitation);
  }

  async findByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return invitation;
  }

  async validateToken(token: string): Promise<{ valid: boolean; email: string }> {
    const invitation = await this.findByToken(token);

    if (invitation.isUsed) {
      throw new BadRequestException('Invitation has already been used');
    }

    if (invitation.isExpired) {
      throw new BadRequestException('Invitation has expired');
    }

    return {
      valid: true,
      email: invitation.email,
    };
  }

  async setPassword(token: string, dto: SetPasswordDto): Promise<void> {
    const invitation = await this.findByToken(token);

    if (invitation.isUsed) {
      throw new BadRequestException('Invitation has already been used');
    }

    if (invitation.isExpired) {
      throw new BadRequestException('Invitation has expired');
    }

    // Create user with VIEWER role
    await this.usersService.create({
      email: invitation.email,
      password: dto.password,
      role: UserRole.VIEWER,
    });

    // Mark invitation as used
    invitation.usedAt = new Date();
    await this.invitationRepo.save(invitation);
  }

  async findAll(): Promise<Invitation[]> {
    return this.invitationRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['invitedBy'],
    });
  }

  async delete(id: string): Promise<void> {
    const result = await this.invitationRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Invitation not found');
    }
  }
}
