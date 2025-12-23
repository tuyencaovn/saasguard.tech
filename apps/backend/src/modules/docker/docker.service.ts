import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Docker from 'dockerode';
import { ContainerInfo, ContainerStats, DockerEvent } from '../metrics/types/metrics.types';

@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private docker: Docker | null = null;
  private isConnected = false;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Connect to Docker daemon
   */
  private async connect(): Promise<void> {
    // Try multiple socket paths (Linux, macOS Docker Desktop)
    const socketPaths = [
      '/var/run/docker.sock',
      `${process.env.HOME}/.docker/run/docker.sock`,
      '/Users/Shared/.docker/run/docker.sock',
    ];

    for (const socketPath of socketPaths) {
      try {
        this.docker = new Docker({ socketPath });
        await this.docker.ping();
        this.isConnected = true;
        this.logger.log(`Connected to Docker daemon at ${socketPath}`);

        // Start listening to Docker events
        this.startEventListener();
        return;
      } catch {
        // Try next socket path
      }
    }

    this.logger.warn('Failed to connect to Docker daemon - container monitoring disabled');
    this.isConnected = false;
  }

  /**
   * Check if Docker is connected
   */
  isDockerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * List all containers
   */
  async listContainers(all = true): Promise<ContainerInfo[]> {
    if (!this.docker || !this.isConnected) {
      return [];
    }

    try {
      const containers = await this.docker.listContainers({ all });

      // Get startedAt for running containers via inspect
      const containerInfos = await Promise.all(
        containers.map(async (container) => {
          let startedAt: Date | undefined;

          // Only fetch startedAt for running containers
          if (container.State === 'running') {
            try {
              const inspectData = await this.docker!.getContainer(container.Id).inspect();
              const startedAtStr = inspectData.State?.StartedAt;
              if (startedAtStr && startedAtStr !== '0001-01-01T00:00:00Z') {
                startedAt = new Date(startedAtStr);
              }
            } catch {
              // Ignore inspect errors
            }
          }

          return {
            id: container.Id.substring(0, 12),
            name: container.Names[0]?.replace(/^\//, '') || 'unknown',
            image: container.Image,
            status: container.Status,
            state: container.State as ContainerInfo['state'],
            created: new Date(container.Created * 1000),
            startedAt,
            ports: container.Ports.map((p) => ({
              private: p.PrivatePort,
              public: p.PublicPort,
              type: p.Type,
            })),
          };
        }),
      );

      return containerInfos;
    } catch (error) {
      this.logger.error('Failed to list containers', error);
      return [];
    }
  }

  /**
   * Get container stats
   */
  async getContainerStats(containerId: string): Promise<ContainerStats | null> {
    if (!this.docker || !this.isConnected) {
      return null;
    }

    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent =
        systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

      // Memory stats
      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 1;
      const memoryPercent = (memoryUsage / memoryLimit) * 100;

      // Network stats
      const networks = stats.networks || {};
      let networkRx = 0;
      let networkTx = 0;
      Object.values(networks).forEach((net: any) => {
        networkRx += net.rx_bytes || 0;
        networkTx += net.tx_bytes || 0;
      });

      return {
        cpuPercent: Math.round(cpuPercent * 100) / 100,
        memoryUsage,
        memoryLimit,
        memoryPercent: Math.round(memoryPercent * 100) / 100,
        networkRx,
        networkTx,
      };
    } catch (error) {
      this.logger.error(`Failed to get stats for container ${containerId}`, error);
      return null;
    }
  }

  /**
   * Start container
   */
  async startContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  /**
   * Stop container
   */
  async stopContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  /**
   * Restart container
   */
  async restartContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.restart();
  }

  /**
   * Get container logs
   */
  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });
    // Remove Docker stream header bytes (8-byte prefix per line)
    return logs
      .toString('utf8')
      .split('\n')
      .map((line) => {
        // Docker prepends 8 bytes of header to each line
        if (line.length > 8) {
          return line.substring(8);
        }
        return line;
      })
      .join('\n');
  }

  /**
   * Start listening to Docker events
   */
  private async startEventListener(): Promise<void> {
    if (!this.docker || !this.isConnected) {
      return;
    }

    try {
      const stream = await this.docker.getEvents({
        filters: { type: ['container'] },
      });

      stream.on('data', (chunk: Buffer) => {
        try {
          const event = JSON.parse(chunk.toString());
          const action = event.Action;

          if (['start', 'stop', 'restart', 'die', 'create', 'destroy'].includes(action)) {
            const dockerEvent: DockerEvent = {
              action,
              containerId: event.Actor?.ID?.substring(0, 12) || '',
              containerName: event.Actor?.Attributes?.name || 'unknown',
              timestamp: new Date(event.time * 1000),
            };

            // Emit event for WebSocket broadcast
            this.eventEmitter.emit('docker.event', dockerEvent);
            this.logger.log(`Docker event: ${action} - ${dockerEvent.containerName}`);
          }
        } catch (parseError) {
          // Ignore parse errors from malformed events
        }
      });

      stream.on('error', (error) => {
        this.logger.error('Docker event stream error', error);
      });

      this.logger.log('Docker event listener started');
    } catch (error) {
      this.logger.error('Failed to start Docker event listener', error);
    }
  }
}
