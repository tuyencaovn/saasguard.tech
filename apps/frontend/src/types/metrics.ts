export interface CpuMetrics {
  usage: number;
  cores: number;
  speed: number;
  model: string;
}

export interface RamMetrics {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface DiskMetrics {
  mount: string;
  fs: string;
  size: number;
  used: number;
  available: number;
  usagePercent: number;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  ram: RamMetrics;
  disk: DiskMetrics[];
  timestamp: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead';
  created: string;
  ports: { private: number; public: number; type: string }[];
}

export interface DockerEvent {
  action: 'start' | 'stop' | 'restart' | 'die' | 'create' | 'destroy';
  containerId: string;
  containerName: string;
  timestamp: string;
}
