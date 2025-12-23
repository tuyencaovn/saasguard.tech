'use client';

import { useState, useEffect } from 'react';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Plus,
  Pencil,
  Cpu,
  Server,
  HardDrive,
  Box,
  Clock,
  Mail,
  AlertTriangle,
  Info,
  Check,
  Eye,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface AlertThreshold {
  id: number;
  metricName: string;
  operator: string;
  value: number;
  enabled: boolean;
  channels: string[];
  cooldownMinutes: number;
}

type TabType = 'rules' | 'history';

const metricConfig: Record<string, { icon: typeof Cpu; iconBg: string; iconColor: string }> = {
  cpu: {
    icon: Cpu,
    iconBg: 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20',
    iconColor: 'text-violet-400',
  },
  ram: {
    icon: Server,
    iconBg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20',
    iconColor: 'text-cyan-400',
  },
  disk: {
    icon: HardDrive,
    iconBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20',
    iconColor: 'text-amber-400',
  },
  container: {
    icon: Box,
    iconBg: 'bg-white/5 border border-white/10',
    iconColor: 'text-white/30',
  },
};

// Mock alert history data
const mockAlertHistory = [
  {
    id: 1,
    type: 'critical',
    title: 'Disk Usage Critical',
    message: 'Disk usage exceeded threshold: 89% > 80%',
    time: 'Today at 15:42',
    channels: ['email', 'telegram'],
    resolved: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'CPU Usage Warning',
    message: 'CPU usage exceeded threshold: 92% > 90%',
    time: 'Today at 13:28',
    channels: ['email'],
    resolved: true,
    resolvedIn: '15m',
  },
  {
    id: 3,
    type: 'info',
    title: 'Container Restarted',
    message: 'Container nginx-proxy was restarted',
    time: 'Yesterday at 22:15',
    channels: ['telegram'],
    resolved: false,
  },
];

export default function AlertsPage() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('rules');

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const res = await fetch(`${API_URL}/alerts/thresholds`);
      const data = await res.json();
      setThresholds(data);
    } catch (error) {
      console.error('Failed to fetch thresholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await fetch(`${API_URL}/alerts/thresholds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchThresholds();
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-white/40">Configure thresholds and view alert history</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <button className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Rule
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              'px-5 py-2.5 rounded-xl font-medium border border-transparent transition-all',
              activeTab === 'rules'
                ? 'tab-active'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Alert Rules
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-5 py-2.5 rounded-xl font-medium border border-transparent transition-all',
              activeTab === 'history'
                ? 'tab-active'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            )}
          >
            Alert History
          </button>
        </div>

        {activeTab === 'rules' && (
          <>
            {/* Alert Rules Grid */}
            {loading ? (
              <div className="text-center py-12 text-white/40">Loading thresholds...</div>
            ) : thresholds.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <p className="text-white/50 mb-4">No alert thresholds configured</p>
                <button className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" />
                  Create your first threshold
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {thresholds.map((threshold) => {
                  const config = metricConfig[threshold.metricName] || metricConfig.container;
                  const Icon = config.icon;

                  return (
                    <div
                      key={threshold.id}
                      className={cn(
                        'glass-card rule-card rounded-2xl p-6',
                        !threshold.enabled && 'disabled'
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              config.iconBg
                            )}
                          >
                            <Icon className={cn('w-6 h-6', config.iconColor)} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {threshold.metricName.toUpperCase()} Alert
                            </h3>
                            <p className="text-sm text-white/40">
                              Triggers when {threshold.metricName} exceeds threshold
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Toggle Switch */}
                          <button
                            onClick={() => toggleEnabled(threshold.id, threshold.enabled)}
                            className={cn(
                              'relative w-12 h-7 rounded-full p-1',
                              threshold.enabled && 'toggle-active'
                            )}
                          >
                            <span className="toggle-track absolute inset-0 rounded-full bg-white/10" />
                            <span
                              className={cn(
                                'toggle-thumb relative block w-5 h-5 rounded-full shadow-lg',
                                threshold.enabled ? 'bg-white' : 'bg-white/50'
                              )}
                            />
                          </button>
                          <button className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                            <Pencil className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-3 mb-5">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                          <span className="text-sm text-white/50">Condition</span>
                          <span className="text-sm font-mono">
                            {threshold.metricName.toUpperCase()} {threshold.operator}{' '}
                            <span className="text-amber-400 font-semibold">{threshold.value}%</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                          <span className="text-sm text-white/50">Cooldown</span>
                          <span className="text-sm font-mono">{threshold.cooldownMinutes} minutes</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                          <span className="text-sm text-white/50">Notify via</span>
                          <div className="flex items-center gap-2">
                            {threshold.channels.map((channel) => (
                              <span
                                key={channel}
                                className={cn(
                                  'px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5',
                                  channel === 'email' ? 'channel-email' : 'channel-telegram'
                                )}
                              >
                                {channel === 'email' ? (
                                  <Mail className="w-3.5 h-3.5" />
                                ) : (
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                  </svg>
                                )}
                                {channel.charAt(0).toUpperCase() + channel.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 text-sm text-white/40">
                        {threshold.enabled ? (
                          <>
                            <Clock className="w-4 h-4" />
                            Last triggered: <span className="text-white/60">Never</span>
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            Rule disabled
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* History Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-lg font-semibold">Recent Alert History</h2>
              <div className="flex items-center gap-3">
                <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none cursor-pointer">
                  <option>All Types</option>
                  <option>CPU</option>
                  <option>RAM</option>
                  <option>Disk</option>
                  <option>Container</option>
                </select>
                <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none cursor-pointer">
                  <option>Last 24 hours</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="timeline-line" />

              {mockAlertHistory.map((alert) => (
                <div key={alert.id} className="timeline-item p-6 border-b border-white/5">
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10',
                        alert.type === 'critical' && 'icon-critical',
                        alert.type === 'warning' && 'icon-warning',
                        alert.type === 'info' && 'icon-info'
                      )}
                    >
                      {alert.type === 'info' ? (
                        <Info className="w-6 h-6 text-blue-400" />
                      ) : (
                        <AlertTriangle
                          className={cn(
                            'w-6 h-6',
                            alert.type === 'critical' ? 'text-red-400' : 'text-amber-400'
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{alert.title}</h4>
                        <span
                          className={cn(
                            'px-2.5 py-1 text-xs font-medium rounded-full border',
                            alert.type === 'critical' && 'badge-critical',
                            alert.type === 'warning' && 'badge-warning',
                            alert.type === 'info' && 'badge-info'
                          )}
                        >
                          {alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}
                        </span>
                        {alert.resolved && (
                          <span className="badge-resolved px-2.5 py-1 text-xs font-medium rounded-full border">
                            Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/50 mb-3">{alert.message}</p>
                      <div className="flex items-center gap-5 text-xs text-white/40">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {alert.time}
                        </span>
                        {alert.channels.includes('email') && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4" />
                            Email sent
                          </span>
                        )}
                        {alert.channels.includes('telegram') && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                            </svg>
                            Telegram sent
                          </span>
                        )}
                        {alert.resolved && alert.resolvedIn && (
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Check className="w-4 h-4" />
                            Resolved in {alert.resolvedIn}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <button className="p-2.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="p-6 border-t border-white/5 text-center">
              <button className="px-6 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                Load more alerts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
