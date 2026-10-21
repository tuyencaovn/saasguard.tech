import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { BackupService } from './backup.service';
import type { BackupFile } from './backup.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('backup')
@Roles(UserRole.ADMIN)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  async export(@Res({ passthrough: true }) res: Response) {
    const backup = await this.backupService.createBackup();
    const stamp = backup.createdAt.slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="saasguard-backup-${stamp}.json"`);
    return backup;
  }

  @Post('restore')
  restore(@Body() body: BackupFile) {
    return this.backupService.restore(body);
  }
}
