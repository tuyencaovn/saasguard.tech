import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PM2Service } from './pm2.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('pm2')
export class PM2Controller {
  constructor(private readonly pm2Service: PM2Service) {}

  @Get('status')
  getStatus() {
    return {
      connected: this.pm2Service.isConnected(),
    };
  }

  @Get('processes')
  listProcesses() {
    return this.pm2Service.listProcesses();
  }

  @Get('processes/:id/logs')
  async getProcessLogs(
    @Param('id') id: string,
    @Query('tail') tail?: string,
  ) {
    try {
      const tailNum = tail ? parseInt(tail, 10) : 100;
      const idOrName = isNaN(Number(id)) ? id : Number(id);
      const logs = await this.pm2Service.getProcessLogs(idOrName, tailNum);
      return { logs };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('processes/:id/start')
  @Roles(UserRole.ADMIN)
  async startProcess(@Param('id') id: string) {
    try {
      const idOrName = isNaN(Number(id)) ? id : Number(id);
      await this.pm2Service.startProcess(idOrName);
      return { success: true, message: 'Process started' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('processes/:id/stop')
  @Roles(UserRole.ADMIN)
  async stopProcess(@Param('id') id: string) {
    try {
      const idOrName = isNaN(Number(id)) ? id : Number(id);
      await this.pm2Service.stopProcess(idOrName);
      return { success: true, message: 'Process stopped' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('processes/:id/restart')
  @Roles(UserRole.ADMIN)
  async restartProcess(@Param('id') id: string) {
    try {
      const idOrName = isNaN(Number(id)) ? id : Number(id);
      await this.pm2Service.restartProcess(idOrName);
      return { success: true, message: 'Process restarted' };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
