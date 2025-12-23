import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DockerService } from './docker.service';

@Controller('docker')
export class DockerController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('status')
  getStatus() {
    return {
      connected: this.dockerService.isDockerConnected(),
    };
  }

  @Get('containers')
  listContainers(@Query('all') all?: string) {
    return this.dockerService.listContainers(all !== 'false');
  }

  @Get('containers/:id/stats')
  async getContainerStats(@Param('id') id: string) {
    const stats = await this.dockerService.getContainerStats(id);
    if (!stats) {
      throw new HttpException('Container not found or stats unavailable', HttpStatus.NOT_FOUND);
    }
    return stats;
  }

  @Post('containers/:id/start')
  async startContainer(@Param('id') id: string) {
    try {
      await this.dockerService.startContainer(id);
      return { success: true, message: 'Container started' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('containers/:id/stop')
  async stopContainer(@Param('id') id: string) {
    try {
      await this.dockerService.stopContainer(id);
      return { success: true, message: 'Container stopped' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('containers/:id/restart')
  async restartContainer(@Param('id') id: string) {
    try {
      await this.dockerService.restartContainer(id);
      return { success: true, message: 'Container restarted' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
