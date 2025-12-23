import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import Docker from 'dockerode';

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: Date;
  ports: { private: number; public: number; type: string }[];
  stats?: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    networkRx: number;
    networkTx: number;
  };
}

@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private docker: Docker | null = null;
  private isConnected = false;

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
      await this.docker.ping();
      this.isConnected = true;
      this.logger.log('Connected to Docker daemon');
    } catch (error) {
      this.logger.warn('Failed to connect to Docker daemon - container monitoring disabled');
      this.isConnected = false;
    }
  }

  isDockerConnected(): boolean {
    return this.isConnected;
  }

  async listContainers(all = true): Promise<ContainerInfo[]> {
    if (!this.docker || !this.isConnected) {
      return [];
    }

    try {
      const containers = await this.docker.listContainers({ all });
      return containers.map((container) => ({
        id: container.Id.substring(0, 12),
        name: container.Names[0]?.replace(/^\//, '') || 'unknown',
        image: container.Image,
        status: container.Status,
        state: container.State,
        created: new Date(container.Created * 1000),
        ports: container.Ports.map((p) => ({
          private: p.PrivatePort,
          public: p.PublicPort,
          type: p.Type,
        })),
      }));
    } catch (error) {
      this.logger.error('Failed to list containers', error);
      return [];
    }
  }

  async getContainerStats(containerId: string): Promise<ContainerInfo['stats'] | null> {
    if (!this.docker || !this.isConnected) {
      return null;
    }

    try {
      const container = this.docker.getContainer(containerId);
      const stats = await container.stats({ stream: false });

      // Calculate CPU percentage
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 : 0;

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

  async startContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async stopContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  async restartContainer(containerId: string): Promise<void> {
    if (!this.docker || !this.isConnected) {
      throw new Error('Docker not connected');
    }
    const container = this.docker.getContainer(containerId);
    await container.restart();
  }
}
