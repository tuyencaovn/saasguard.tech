'use client';

import { useState, useEffect, useRef } from 'react';
import { useMetrics, useDockerEvents } from '@/hooks/use-socket';
import { MetricGauge } from '@/components/metric-gauge';
import { ConnectionStatus } from '@/components/connection-status';
import { PerformanceChart } from '@/components/performance-chart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatBytes } from '@/lib/utils';
import { Box, Clock, Activity, Cpu } from 'lucide-react';
import Link from 'next/link';

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
      setMetricsHistory((prev) => [...prev.slice(-59), dataPoint]); // Keep last 60 points
    }
  }, [metrics]);

  const runningContainers = containers.filter((c) => c.state === 'running').length;

  return (
    <div className="min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-500">Real-time server monitoring</p>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionStatus />

            <select className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 15 minutes</option>
              <option>Last 1 hour</option>
              <option>Last 6 hours</option>
              <option>Last 24 hours</option>
            </select>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8">
        {!metrics ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500">Loading metrics...</div>
          </div>
        ) : (
          <>
            {/* Metric Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <MetricGauge
                label="CPU Usage"
                value={metrics.cpu.usage}
                thresholds={{ warning: 70, critical: 90 }}
                color="violet"
                subtitle={`${metrics.cpu.cores} cores`}
              />

              <MetricGauge
                label="Memory"
                value={metrics.ram.usagePercent}
                thresholds={{ warning: 80, critical: 95 }}
                color="cyan"
                subtitle={`${formatBytes(metrics.ram.used)} / ${formatBytes(metrics.ram.total)}`}
              />

              <MetricGauge
                label="Disk Usage"
                value={metrics.disk[0]?.usagePercent ?? 0}
                thresholds={{ warning: 85, critical: 95 }}
                color="amber"
                subtitle={metrics.disk[0]?.mount || '/'}
              />

              {/* Network / Quick Stats Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Quick Stats
                  </span>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">CPU Model</span>
                    <span className="text-zinc-50 text-sm font-mono">{metrics.cpu.model}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Speed</span>
                    <span className="text-zinc-50 text-sm font-mono">{metrics.cpu.speed} GHz</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">Containers</span>
                    <span className="text-zinc-50 text-sm font-mono">
                      <span className="text-green-500">{runningContainers}</span>
                      <span className="text-zinc-600"> / </span>
                      <span className="text-zinc-500">{containers.length}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Details & Quick Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* System Performance Chart Placeholder */}
              <Card className="xl:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>System Performance</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-0.5 bg-violet-500 rounded" />
                        <span className="text-zinc-400">CPU</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-0.5 bg-cyan-500 rounded" />
                        <span className="text-zinc-400">RAM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-0.5 bg-amber-500 rounded" />
                        <span className="text-zinc-400">Disk</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PerformanceChart data={metricsHistory} />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-green-500" />
                      </div>
                      <span className="text-zinc-400">Last Update</span>
                    </div>
                    <span className="font-mono text-zinc-50 text-sm">
                      {new Date(metrics.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-violet-500/10 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-violet-500" />
                      </div>
                      <span className="text-zinc-400">Free RAM</span>
                    </div>
                    <span className="font-mono text-zinc-50">{formatBytes(metrics.ram.free)}</span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-cyan-500" />
                      </div>
                      <span className="text-zinc-400">CPU Cores</span>
                    </div>
                    <span className="font-mono text-zinc-50">{metrics.cpu.cores}</span>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <Box className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-zinc-400">Containers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-green-500">{runningContainers}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="font-mono text-zinc-500">{containers.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Container Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Active Containers</CardTitle>
                  <Link
                    href="/containers"
                    className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
                  >
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {containers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    No containers found. Docker may not be connected.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {containers.slice(0, 4).map((container) => (
                      <div
                        key={container.id}
                        className={`flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors ${
                          container.state !== 'running' ? 'opacity-60' : ''
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            container.state === 'running' ? 'bg-green-500/10' : 'bg-zinc-500/10'
                          }`}
                        >
                          <Box
                            className={`w-5 h-5 ${
                              container.state === 'running' ? 'text-green-500' : 'text-zinc-500'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{container.name}</div>
                          <div className="text-xs text-zinc-500 font-mono truncate">
                            {container.image}
                          </div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            container.state === 'running' ? 'bg-green-500' : 'bg-zinc-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
