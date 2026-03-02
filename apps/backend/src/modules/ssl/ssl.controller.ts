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
import { SslService } from './ssl.service';
import { CreateSslMonitorDto } from './dto/create-ssl-monitor.dto';
import { UpdateSslMonitorDto } from './dto/update-ssl-monitor.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller('ssl')
export class SslController {
  constructor(private readonly sslService: SslService) {}

  @Post()
  create(@Body() dto: CreateSslMonitorDto, @CurrentUser() user: CurrentUserData) {
    return this.sslService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.sslService.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.sslService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSslMonitorDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.sslService.update(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    return this.sslService.remove(id, user.id);
  }

  @Post(':id/check')
  checkNow(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserData) {
    // Verify ownership first
    return this.sslService.findOne(id, user.id).then(() => this.sslService.checkAndUpdate(id));
  }
}
