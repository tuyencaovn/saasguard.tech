import { Controller, Get, Post, Body } from '@nestjs/common';
import { UpdatesService } from './updates.service';
import { TriggerUpdateDto } from './dto/trigger-update.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('updates')
@Roles(UserRole.ADMIN)
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get('version')
  getVersion() {
    return this.updatesService.getVersionInfo();
  }

  @Get('status')
  getStatus() {
    return this.updatesService.getStatus();
  }

  @Post()
  triggerUpdate(@Body() dto: TriggerUpdateDto) {
    return this.updatesService.triggerUpdate(dto.target);
  }
}
