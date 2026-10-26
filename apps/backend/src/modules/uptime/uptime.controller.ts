import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UptimeService } from './uptime.service';
import { CreateUptimeMonitorDto } from './dto/create-uptime-monitor.dto';
import { UpdateUptimeMonitorDto } from './dto/update-uptime-monitor.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('uptime')
export class UptimeController {
  constructor(private readonly uptimeService: UptimeService) {}

  @Post()
  create(@Body() dto: CreateUptimeMonitorDto, @CurrentUser() user: CurrentUserData) {
    return this.uptimeService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.uptimeService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.uptimeService.findOneWithStats(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUptimeMonitorDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.uptimeService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.uptimeService.remove(id, user.id);
  }

  @Post(':id/check')
  async checkNow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    await this.uptimeService.findOne(id, user.id);
    await this.uptimeService.checkAndUpdate(id);
    return this.uptimeService.findOneWithStats(id, user.id);
  }
}
