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

export interface UptimeMetrics {
  uptime: number; // seconds
  bootTime: string;
}

export interface NetworkMetrics {
  interface: string;
  rx: number; // bytes received per second
  tx: number; // bytes transmitted per second
  rxTotal: number; // total bytes received
  txTotal: number; // total bytes transmitted
  speed: number; // link speed in Mbps (0 if unknown)
}

export interface HealthFactors {
  cpu: number;
  ram: number;
  disk: number;
  containers: number;
  ssl: number;
}

export interface HealthScore {
  score: number;
  status: 'good' | 'warning' | 'critical';
  factors: HealthFactors;
}

export interface SystemMetrics {
  cpu: CpuMetrics;
  ram: RamMetrics;
  disk: DiskMetrics[];
  network: NetworkMetrics;
  uptime: UptimeMetrics;
  timestamp: string;
  healthScore?: HealthScore;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead';
  created: string;
  startedAt?: string; // when the container was last started
  ports: { private: number; public: number; type: string }[];
}

export interface DockerEvent {
  action: 'start' | 'stop' | 'restart' | 'die' | 'create' | 'destroy';
  containerId: string;
  containerName: string;
  timestamp: string;
}

export interface PM2Process {
  pm_id: number;
  name: string;
  status: 'online' | 'stopped' | 'errored' | 'launching';
  cpu: number;
  memory: number;
  uptime: number | null;
  restarts: number;
  pid?: number;
}
