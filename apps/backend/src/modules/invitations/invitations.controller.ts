import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Admin only - create invitation
  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    const invitation = await this.invitationsService.create(dto, user.id);
    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      // Frontend URL for invite link
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:3006'}/set-password?token=${invitation.token}`,
    };
  }

  // Admin only - list all invitations
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    const invitations = await this.invitationsService.findAll();
    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      expiresAt: inv.expiresAt,
      usedAt: inv.usedAt,
      isExpired: inv.isExpired,
      isUsed: inv.isUsed,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy?.email,
    }));
  }

  // Admin only - delete invitation
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.invitationsService.delete(id);
  }

  // Public - validate token (for set-password page)
  @Public()
  @Get(':token/validate')
  async validateToken(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  // Public - set password using invitation token
  @Public()
  @Post(':token/set-password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Param('token') token: string,
    @Body() dto: SetPasswordDto,
  ) {
    await this.invitationsService.setPassword(token, dto);
    return { message: 'Password set successfully. You can now login.' };
  }
}
