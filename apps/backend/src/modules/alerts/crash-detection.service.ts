import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DockerEvent } from '../metrics/types/metrics.types';

interface RestartEntry {
  timestamps: Date[];
  name: string;
  type: 'docker' | 'pm2';
}

export interface CrashDetectedEvent {
  id: string;
  name: string;
  type: 'docker' | 'pm2';
  count: number;
  windowMinutes: number;
}

export interface CrashStatus {
  id: string;
  name: string;
  type: 'docker' | 'pm2';
  restartCount: number;
  inCrashLoop: boolean;
}

// Default crash detection thresholds
const DEFAULT_RESTART_THRESHOLD = 3;
const DEFAULT_WINDOW_MINUTES = 10;
const MAX_TIMESTAMPS = 100;

@Injectable()
export class CrashDetectionService {
  private readonly logger = new Logger(CrashDetectionService.name);
  private readonly restartMap = new Map<string, RestartEntry>();
  // Track last known PM2 restart counts to detect new restarts
  private readonly pm2LastRestarts = new Map<number, number>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Track a restart event and check if crash loop detected
   */
  trackRestart(id: string, name: string, type: 'docker' | 'pm2'): void {
    const entry = this.restartMap.get(id) || { timestamps: [], name, type };
    entry.name = name;
    entry.timestamps.push(new Date());

    // Keep only last MAX_TIMESTAMPS entries
    if (entry.timestamps.length > MAX_TIMESTAMPS) {
      entry.timestamps = entry.timestamps.slice(-MAX_TIMESTAMPS);
    }

    this.restartMap.set(id, entry);

    // Check if crash loop threshold breached
    const count = this.getRestartCount(id, DEFAULT_WINDOW_MINUTES);
    if (count >= DEFAULT_RESTART_THRESHOLD) {
      const event: CrashDetectedEvent = {
        id,
        name,
        type,
        count,
        windowMinutes: DEFAULT_WINDOW_MINUTES,
      };
      this.logger.warn(
        `Crash loop detected: ${name} (${type}) restarted ${count} times in ${DEFAULT_WINDOW_MINUTES}min`,
      );
      this.eventEmitter.emit('crash.detected', event);
    }
  }

  /**
   * Count restarts within a time window
   */
  getRestartCount(id: string, windowMinutes: number): number {
    const entry = this.restartMap.get(id);
    if (!entry) return 0;

    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
    return entry.timestamps.filter((t) => t > cutoff).length;
  }

  /**
   * Get crash status for all tracked services
   */
  getCrashStatus(): CrashStatus[] {
    const statuses: CrashStatus[] = [];

    for (const [id, entry] of this.restartMap) {
      const restartCount = this.getRestartCount(id, DEFAULT_WINDOW_MINUTES);
      if (restartCount > 0) {
        statuses.push({
          id,
          name: entry.name,
          type: entry.type,
          restartCount,
          inCrashLoop: restartCount >= DEFAULT_RESTART_THRESHOLD,
        });
      }
    }

    return statuses;
  }

  /**
   * Listen to Docker container events and track restarts
   */
  @OnEvent('docker.event')
  handleDockerEvent(event: DockerEvent): void {
    // Only track restart events (die+restart fires both — avoid double-counting)
    if (event.action === 'restart') {
      this.trackRestart(
        `docker:${event.containerId}`,
        event.containerName,
        'docker',
      );
    }
  }

  /**
   * Listen to PM2 process list updates and detect restart count increases
   */
  @OnEvent('pm2.polled')
  handlePm2Poll(
    processes: Array<{ pm_id: number; name: string; restarts: number }>,
  ): void {
    for (const proc of processes) {
      const lastCount = this.pm2LastRestarts.get(proc.pm_id) ?? proc.restarts;
      const newRestarts = proc.restarts - lastCount;

      if (newRestarts > 0) {
        // Register each new restart
        for (let i = 0; i < newRestarts; i++) {
          this.trackRestart(`pm2:${proc.pm_id}`, proc.name, 'pm2');
        }
      }

      this.pm2LastRestarts.set(proc.pm_id, proc.restarts);
    }
  }
}
