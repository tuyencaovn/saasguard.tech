export interface PM2ProcessInfo {
  pm_id: number;
  name: string;
  status: 'online' | 'stopped' | 'errored' | 'launching';
  cpu: number;
  memory: number;
  uptime: number | null;
  restarts: number;
  pid?: number;
}
