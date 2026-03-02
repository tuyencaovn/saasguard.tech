import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import pm2 from 'pm2';
import { PM2ProcessInfo } from './types/pm2.types';

@Injectable()
export class PM2Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PM2Service.name);
  private connected = false;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    if (this.connected) {
      pm2.disconnect();
      this.connected = false;
    }
  }

  private connect(): Promise<void> {
    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          this.logger.warn('Failed to connect to PM2 daemon - PM2 monitoring disabled');
          this.connected = false;
        } else {
          this.logger.log('Connected to PM2 daemon');
          this.connected = true;
        }
        resolve();
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listProcesses(): Promise<PM2ProcessInfo[]> {
    if (!this.connected) {
      // Try reconnecting
      await this.connect();
      if (!this.connected) return [];
    }

    return new Promise((resolve) => {
      pm2.list((err, list) => {
        if (err) {
          this.logger.error('Failed to list PM2 processes', err);
          resolve([]);
          return;
        }

        const processes: PM2ProcessInfo[] = list.map((proc) => {
          const monit = proc.monit || {};
          const pm2Env = proc.pm2_env || {};

          return {
            pm_id: proc.pm_id ?? -1,
            name: proc.name || 'unknown',
            status: this.mapStatus(pm2Env.status),
            cpu: monit.cpu || 0,
            memory: monit.memory || 0,
            uptime: pm2Env.pm_uptime ? Date.now() - pm2Env.pm_uptime : null,
            restarts: pm2Env.restart_time || 0,
            pid: proc.pid,
          };
        });

        // Emit for crash detection tracking
        this.eventEmitter.emit('pm2.polled', processes);

        resolve(processes);
      });
    });
  }

  private mapStatus(status: string | undefined): PM2ProcessInfo['status'] {
    switch (status) {
      case 'online':
        return 'online';
      case 'stopped':
      case 'stopping':
        return 'stopped';
      case 'launching':
        return 'launching';
      case 'errored':
      default:
        return status === 'errored' ? 'errored' : 'stopped';
    }
  }

  async startProcess(idOrName: number | string): Promise<void> {
    if (!this.connected) {
      throw new Error('PM2 not connected');
    }

    return new Promise((resolve, reject) => {
      pm2.restart(idOrName, (err) => {
        if (err) {
          reject(new Error(`Failed to start process: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async stopProcess(idOrName: number | string): Promise<void> {
    if (!this.connected) {
      throw new Error('PM2 not connected');
    }

    return new Promise((resolve, reject) => {
      pm2.stop(idOrName, (err) => {
        if (err) {
          reject(new Error(`Failed to stop process: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async restartProcess(idOrName: number | string): Promise<void> {
    if (!this.connected) {
      throw new Error('PM2 not connected');
    }

    return new Promise((resolve, reject) => {
      pm2.restart(idOrName, (err) => {
        if (err) {
          reject(new Error(`Failed to restart process: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async getProcessLogs(idOrName: number | string, lines = 100): Promise<string> {
    if (!this.connected) {
      throw new Error('PM2 not connected');
    }

    // PM2 doesn't have a direct programmatic API for logs
    // We'll read from the log files directly
    return new Promise((resolve) => {
      pm2.describe(idOrName, (err, desc) => {
        if (err || !desc || desc.length === 0) {
          resolve('Process not found or no logs available');
          return;
        }

        const proc = desc[0];
        const pm2Env = proc.pm2_env || {};
        const outLogPath = pm2Env.pm_out_log_path;
        const errLogPath = pm2Env.pm_err_log_path;

        // Read logs using tail command
        const { exec } = require('child_process');
        const logPaths = [outLogPath, errLogPath].filter(Boolean).join(' ');

        if (!logPaths) {
          resolve('No log files found');
          return;
        }

        exec(`tail -n ${lines} ${logPaths} 2>/dev/null`, (error: any, stdout: string) => {
          if (error) {
            resolve('Failed to read logs');
          } else {
            resolve(stdout || 'No logs available');
          }
        });
      });
    });
  }
}
