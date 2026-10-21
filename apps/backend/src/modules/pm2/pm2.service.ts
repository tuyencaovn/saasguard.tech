import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
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

  // describe() returns host-absolute log paths. In the container the host root
  // is mounted read-only at /hostfs, so resolving through it reaches logs
  // anywhere the process writes them (e.g. /var/log/pm2), not just the mounted
  // PM2_HOME. Falls back to the raw path when running outside a container.
  private resolveHostPath(p: string): string {
    if (existsSync('/hostfs') && !p.startsWith('/hostfs')) {
      const viaHostfs = join('/hostfs', p);
      if (existsSync(viaHostfs)) return viaHostfs;
    }
    return p;
  }

  async getProcessLogs(idOrName: number | string, lines = 100): Promise<string> {
    if (!this.connected) {
      throw new Error('PM2 not connected');
    }

    // PM2 has no programmatic log API — read the process's log files directly.
    return new Promise((resolve) => {
      pm2.describe(idOrName, (err, desc) => {
        if (err || !desc || desc.length === 0) {
          resolve('Process not found or no logs available');
          return;
        }

        const pm2Env = desc[0].pm2_env || {};
        // Resolve each path and keep only files that actually exist, so a
        // missing error log never makes tail fail the whole read.
        const logPaths = [pm2Env.pm_out_log_path, pm2Env.pm_err_log_path]
          .filter(Boolean)
          .map((p) => this.resolveHostPath(p as string))
          .filter((p) => existsSync(p));

        if (logPaths.length === 0) {
          resolve('No readable log files found');
          return;
        }

        // execFile with an argv array — no shell, so paths with spaces or odd
        // characters can't break or inject.
        execFile('tail', ['-n', String(lines), ...logPaths], (error, stdout) => {
          if (error) {
            this.logger.warn(`Failed to read logs for ${idOrName}: ${error.message}`);
            resolve('Failed to read logs');
          } else {
            resolve(stdout || 'No logs available');
          }
        });
      });
    });
  }
}
