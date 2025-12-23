import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  // Thresholds
  @Post('thresholds')
  createThreshold(@Body() dto: CreateThresholdDto) {
    return this.alertsService.createThreshold(dto);
  }

  @Get('thresholds')
  findAllThresholds() {
    return this.alertsService.findAllThresholds();
  }

  @Get('thresholds/:id')
  findThreshold(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findThreshold(id);
  }

  @Patch('thresholds/:id')
  updateThreshold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.alertsService.updateThreshold(id, dto);
  }

  @Delete('thresholds/:id')
  removeThreshold(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.removeThreshold(id);
  }

  // Logs
  @Get('logs')
  findRecentLogs(@Query('limit') limit?: string) {
    return this.alertsService.findRecentLogs(limit ? parseInt(limit, 10) : 50);
  }

  @Get('logs/threshold/:id')
  findLogsByThreshold(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.findLogsByThreshold(id);
  }
}
