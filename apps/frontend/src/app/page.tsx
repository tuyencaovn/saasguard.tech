'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMetrics, useDockerEvents } from '@/hooks/use-socket';
import { MetricGauge } from '@/components/metric-gauge';
import { ConnectionStatus } from '@/components/connection-status';
import { PerformanceChart } from '@/components/performance-chart';
import { NetworkChart } from '@/components/network-chart';
import { LinkSpeedChart } from '@/components/link-speed-chart';
import { formatBytes, formatUptime } from '@/lib/utils';
import { Box, Clock, Activity, Cpu, RefreshCw, ChevronRight, Timer, Wifi, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MetricsDataPoint {
  timestamp: number;
  cpu: number;
  ram: number;
  disk: number;
}

interface NetworkDataPoint {
  timestamp: number;
  rx: number;
  tx: number;
}

interface LinkSpeedDataPoint {
  timestamp: number;
  speed: number; // Mbps
}

type TimeRange = '15m' | '1h' | '6h' | '24h';

const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; minutes: number; maxPoints: number; sampleInterval: number }> = {
  '15m': { label: 'Last 15 minutes', minutes: 15, maxPoints: 60, sampleInterval: 15 * 1000 }, // 15s
  '1h': { label: 'Last 1 hour', minutes: 60, maxPoints: 60, sampleInterval: 60 * 1000 }, // 1m
  '6h': { label: 'Last 6 hours', minutes: 360, maxPoints: 72, sampleInterval: 5 * 60 * 1000 }, // 5m
  '24h': { label: 'Last 24 hours', minutes: 1440, maxPoints: 96, sampleInterval: 15 * 60 * 1000 }, // 15m
};

// Format network speed (bytes per second to MB/s)
function formatNetworkSpeed(bytesPerSec: number): string {
  const mbps = bytesPerSec / (1024 * 1024);
  if (mbps < 0.01) return '0';
  if (mbps < 1) return mbps.toFixed(2);
  if (mbps < 10) return mbps.toFixed(1);
  return Math.round(mbps).toString();
}

// Fetch metrics history from API
async function fetchMetricsHistory(minutes: number): Promise<{ metrics: MetricsDataPoint[]; network: NetworkDataPoint[]; linkSpeed: LinkSpeedDataPoint[] }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'}/metrics/history?minutes=${minutes}`);
    if (!res.ok) return { metrics: [], network: [], linkSpeed: [] };
    const data = await res.json();
    const metrics = data.map((item: { timestamp: string; cpuPercent: number; ramPercent: number; diskPercent: number }) => ({
      timestamp: new Date(item.timestamp).getTime(),
      cpu: Number(item.cpuPercent),
      ram: Number(item.ramPercent),
      disk: Number(item.diskPercent),
    }));
    const network = data.map((item: { timestamp: string; networkRx?: number; networkTx?: number }) => ({
      timestamp: new Date(item.timestamp).getTime(),
      rx: Number(item.networkRx || 0),
      tx: Number(item.networkTx || 0),
    }));
    const linkSpeed = data.map((item: { timestamp: string; networkSpeed?: number }) => ({
      timestamp: new Date(item.timestamp).getTime(),
      speed: Number(item.networkSpeed || 0),
    }));
    return { metrics, network, linkSpeed };
  } catch {
    return { metrics: [], network: [], linkSpeed: [] };
  }
}

export default function DashboardPage() {
  const { metrics } = useMetrics();
  const { containers, refetch: refetchContainers } = useDockerEvents();
  const [metricsHistory, setMetricsHistory] = useState<MetricsDataPoint[]>([]);
  const [networkHistory, setNetworkHistory] = useState<NetworkDataPoint[]>([]);
  const [linkSpeedHistory, setLinkSpeedHistory] = useState<LinkSpeedDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastTimestampRef = useRef<string | null>(null);
  const historyLoadedRef = useRef<TimeRange | null>(null);

  // Load history from API on mount and when time range changes
  useEffect(() => {
    if (historyLoadedRef.current === timeRange) return;

    const config = TIME_RANGE_CONFIG[timeRange];
    fetchMetricsHistory(config.minutes).then(({ metrics: metricsData, network: networkData, linkSpeed: linkSpeedData }) => {
      setMetricsHistory(metricsData);
      setNetworkHistory(networkData);
      setLinkSpeedHistory(linkSpeedData);
      historyLoadedRef.current = timeRange;
    });
  }, [timeRange]);

  // Add new metrics to history (from WebSocket)
  useEffect(() => {
    if (metrics && metrics.timestamp !== lastTimestampRef.current) {
      lastTimestampRef.current = metrics.timestamp;
      const now = Date.now();
      const config = TIME_RANGE_CONFIG[timeRange];

      setMetricsHistory((prev) => {
        // Check if enough time has passed since last data point
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && now - lastPoint.timestamp < config.sampleInterval) {
          return prev;
        }

        const dataPoint: MetricsDataPoint = {
          timestamp: now,
          cpu: metrics.cpu.usage,
          ram: metrics.ram.usagePercent,
          disk: metrics.disk[0]?.usagePercent ?? 0,
        };

        const cutoffTime = now - config.minutes * 60 * 1000;
        const filtered = prev.filter((p) => p.timestamp >= cutoffTime);
        return [...filtered.slice(-(config.maxPoints - 1)), dataPoint];
      });

      // Also update network history
      setNetworkHistory((prev) => {
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && now - lastPoint.timestamp < config.sampleInterval) {
          return prev;
        }

        const dataPoint: NetworkDataPoint = {
          timestamp: now,
          rx: metrics.network?.rx ?? 0,
          tx: metrics.network?.tx ?? 0,
        };

        const cutoffTime = now - config.minutes * 60 * 1000;
        const filtered = prev.filter((p) => p.timestamp >= cutoffTime);
        return [...filtered.slice(-(config.maxPoints - 1)), dataPoint];
      });

      // Also update link speed history
      setLinkSpeedHistory((prev) => {
        const lastPoint = prev[prev.length - 1];
        if (lastPoint && now - lastPoint.timestamp < config.sampleInterval) {
          return prev;
        }

        const dataPoint: LinkSpeedDataPoint = {
          timestamp: now,
          speed: metrics.network?.speed ?? 0,
        };

        const cutoffTime = now - config.minutes * 60 * 1000;
        const filtered = prev.filter((p) => p.timestamp >= cutoffTime);
        return [...filtered.slice(-(config.maxPoints - 1)), dataPoint];
      });
    }
  }, [metrics, timeRange]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Refetch containers only, keep metrics history intact
    await refetchContainers();
    // Brief delay to show refresh animation
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetchContainers]);

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as TimeRange);
  };

  const runningContainers = containers.filter((c) => c.state === 'running').length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-white/40">Real-time server monitoring</p>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus />

            <select
              value={timeRange}
              onChange={handleTimeRangeChange}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer"
            >
              {Object.entries(TIME_RANGE_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8">
        {!metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-white/40">Loading metrics...</div>
          </div>
        ) : (
          <>
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <MetricGauge
                label="CPU"
                value={metrics.cpu.usage}
                thresholds={{ warning: 70, critical: 90 }}
                color="violet"
                subtitle={`${metrics.cpu.cores} cores / ${metrics.cpu.speed} GHz`}
              />

              <MetricGauge
                label="Memory"
                value={metrics.ram.usagePercent}
                thresholds={{ warning: 80, critical: 95 }}
                color="cyan"
                subtitle={`${formatBytes(metrics.ram.used)} / ${formatBytes(metrics.ram.total)}`}
              />

              <MetricGauge
                label="Disk"
                value={metrics.disk[0]?.usagePercent ?? 0}
                thresholds={{ warning: 85, critical: 95 }}
                color="amber"
                subtitle={metrics.disk[0] ? `${formatBytes(metrics.disk[0].used)} / ${formatBytes(metrics.disk[0].size)}` : '/'}
              />

              {/* Network Card */}
              <div className="glass-card metric-network rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Wifi className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-white/60">Network</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 status-running" />
                </div>

                <div className="flex flex-col items-center justify-center gap-4 py-2">
                  {/* Upload */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <ArrowUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {formatNetworkSpeed(metrics.network?.tx || 0)}
                      </span>
                      <span className="text-white/40 text-sm">MB/s</span>
                    </div>
                  </div>

                  {/* Download */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <ArrowDown className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">
                        {formatNetworkSpeed(metrics.network?.rx || 0)}
                      </span>
                      <span className="text-white/40 text-sm">MB/s</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-white/40 text-xs mt-4">
                  {metrics.network?.interface || 'eth0'} - {metrics.network?.speed ? `${metrics.network.speed >= 1000 ? `${metrics.network.speed / 1000} Gbps` : `${metrics.network.speed} Mbps`}` : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Main Chart */}
              <div className="xl:col-span-2 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">System Performance</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-white/60">CPU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-white/60">RAM</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-white/60">Disk</span>
                    </div>
                  </div>
                </div>
                <PerformanceChart data={metricsHistory} timeRange={timeRange} />
              </div>

              {/* Quick Stats */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6">Quick Stats</h3>

                <div className="space-y-4">
                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Timer className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-white/60">Uptime</span>
                    </div>
                    <span className="font-mono font-semibold">
                      {formatUptime(metrics.uptime.uptime)}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-violet-400" />
                      </div>
                      <span className="text-white/60">Free RAM</span>
                    </div>
                    <span className="font-mono font-semibold">{formatBytes(metrics.ram.free)}</span>
                  </div>

                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-white/60">Last Update</span>
                    </div>
                    <span className="font-mono font-semibold text-sm">
                      {new Date(metrics.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-white/60">CPU Cores</span>
                    </div>
                    <span className="font-mono font-semibold">{metrics.cpu.cores}</span>
                  </div>

                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Box className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-white/60">Containers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-semibold text-emerald-400">{runningContainers}</span>
                      <span className="text-white/30">/</span>
                      <span className="font-mono text-white/40">{containers.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Network Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              {/* Network Traffic Chart */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Network Traffic</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-white/60">Download</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-white/60">Upload</span>
                    </div>
                  </div>
                </div>
                <NetworkChart data={networkHistory} timeRange={timeRange} />
              </div>

              {/* Interface Link Speed Chart */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Link Speed</h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-white/60">{metrics.network?.interface || 'eth0'}</span>
                    </div>
                  </div>
                </div>
                <LinkSpeedChart
                  data={linkSpeedHistory}
                  timeRange={timeRange}
                  interfaceName={metrics.network?.interface || 'eth0'}
                />
              </div>
            </div>

            {/* Container Overview */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Active Containers</h3>
                <Link
                  href="/containers"
                  className="text-sm text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {containers.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  No containers found. Docker may not be connected.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {containers.slice(0, 4).map((container) => (
                    <div
                      key={container.id}
                      className={cn(
                        'container-card p-4 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 cursor-pointer',
                        container.state !== 'running' && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            container.state === 'running' ? 'bg-emerald-500/10' : 'bg-white/5'
                          )}
                        >
                          <Box
                            className={cn(
                              'w-5 h-5',
                              container.state === 'running' ? 'text-emerald-400' : 'text-white/30'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{container.name}</div>
                          <div className="text-xs text-white/40 font-mono truncate">{container.image}</div>
                        </div>
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            container.state === 'running' ? 'bg-emerald-500 status-running' : 'bg-white/30'
                          )}
                        />
                      </div>
                      <div className="text-xs text-white/40">
                        {container.state === 'running' ? 'Running' : 'Stopped'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
