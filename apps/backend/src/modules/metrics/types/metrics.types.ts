export interface CpuMetrics {
  usage: number; // 0-100 percentage
  cores: number;
  speed: number; // MHz
  model: string;
}

export interface RamMetrics {
  total: number; // bytes
  used: number;
  free: number;
  usagePercent: number; // 0-100
}

export interface DiskMetrics {
  mount: string;
  fs: string; // filesystem type
  size: number; // bytes
  used: number;
  available: number;
  usagePercent: number; // 0-100
}

export interface UptimeMetrics {
  uptime: number; // seconds
  bootTime: Date;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  ram: RamMetrics;
  disk: DiskMetrics[];
  uptime: UptimeMetrics;
  timestamp: Date;
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead';
  created: Date;
  startedAt?: Date; // when the container was last started
  ports: { private: number; public: number; type: string }[];
  stats?: ContainerStats;
}

export interface DockerEvent {
  action: 'start' | 'stop' | 'restart' | 'die' | 'create' | 'destroy';
  containerId: string;
  containerName: string;
  timestamp: Date;
}
