'use client';

import { useState, useEffect, useRef } from 'react';
import { useMetrics, useDockerEvents } from '@/hooks/use-socket';
import { MetricGauge } from '@/components/metric-gauge';
import { ConnectionStatus } from '@/components/connection-status';
import { PerformanceChart } from '@/components/performance-chart';
import { formatBytes } from '@/lib/utils';
import { Box, Clock, Activity, Cpu, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MetricsDataPoint {
  time: string;
  cpu: number;
  ram: number;
  disk: number;
}

export default function DashboardPage() {
  const { metrics } = useMetrics();
  const { containers } = useDockerEvents();
  const [metricsHistory, setMetricsHistory] = useState<MetricsDataPoint[]>([]);
  const lastTimestampRef = useRef<string | null>(null);

  // Store metrics history for chart
  useEffect(() => {
    if (metrics && metrics.timestamp !== lastTimestampRef.current) {
      lastTimestampRef.current = metrics.timestamp;
      const dataPoint: MetricsDataPoint = {
        time: new Date(metrics.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        cpu: metrics.cpu.usage,
        ram: metrics.ram.usagePercent,
        disk: metrics.disk[0]?.usagePercent ?? 0,
      };
      setMetricsHistory((prev) => [...prev.slice(-59), dataPoint]);
    }
  }, [metrics]);

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

            <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer">
              <option>Last 15 minutes</option>
              <option>Last 1 hour</option>
              <option>Last 6 hours</option>
              <option>Last 24 hours</option>
            </select>

            <button className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all">
              <RefreshCw className="w-5 h-5" />
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
                subtitle={metrics.disk[0]?.mount || '/'}
              />

              {/* Network / Quick Stats Card */}
              <div className="glass-card metric-network rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-white/60">Quick Stats</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 status-running" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-sm">CPU Model</span>
                    <span className="text-white text-sm font-mono">{metrics.cpu.model}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-sm">Speed</span>
                    <span className="text-white text-sm font-mono">{metrics.cpu.speed} GHz</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40 text-sm">Containers</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-semibold text-emerald-400">{runningContainers}</span>
                      <span className="text-white/30">/</span>
                      <span className="font-mono text-white/40">{containers.length}</span>
                    </div>
                  </div>
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
                <PerformanceChart data={metricsHistory} />
              </div>

              {/* Quick Stats */}
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-6">Quick Stats</h3>

                <div className="space-y-4">
                  <div className="relative flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-white/60">Last Update</span>
                    </div>
                    <span className="font-mono font-semibold">
                      {new Date(metrics.timestamp).toLocaleTimeString()}
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
