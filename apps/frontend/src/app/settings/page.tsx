'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Mail,
  MessageSquare,
  Database,
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Eye,
  Gauge,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface SystemStatus {
  version: string;
  uptime: number;
  database: { connected: boolean; type: string };
  email: { configured: boolean; provider: string | null };
  telegram: { configured: boolean };
  metrics: { refreshInterval: number; retentionDays: number };
  alerts: { logRetentionDays: number };
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include' });
      if (res.ok) {
        setStatus(await res.json());
      } else {
        setStatus(getDefaultStatus(true));
      }
    } catch {
      setStatus(getDefaultStatus(false));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultStatus = (dbConnected: boolean): SystemStatus => ({
    version: '2.0.0',
    uptime: 0,
    database: { connected: dbConnected, type: 'PostgreSQL' },
    email: { configured: false, provider: null },
    telegram: { configured: false },
    metrics: { refreshInterval: 3, retentionDays: 7 },
    alerts: { logRetentionDays: 90 },
  });

  const formatUptime = (seconds: number) => {
    if (!seconds) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-white/40">System configuration and status</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
            <ConnectionStatus />
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center border',
                currentUser?.role === 'admin'
                  ? 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/20'
                  : 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/20'
              )}>
                {currentUser?.role === 'admin' ? (
                  <Shield className="w-5 h-5 text-violet-400" />
                ) : (
                  <Eye className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Email</span>
                <span className="text-sm font-medium truncate ml-2 max-w-[180px]">
                  {currentUser?.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Role</span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  currentUser?.role === 'admin'
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                )}>
                  {currentUser?.role === 'admin' ? 'Admin' : 'Viewer'}
                </span>
              </div>
            </div>
          </div>

          {/* System Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                <Server className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">System</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Version</span>
                <span className="font-mono text-sm">{status?.version || '2.0.0'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Uptime</span>
                <span className="font-mono text-sm">{formatUptime(status?.uptime || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">API</span>
                <span className="font-mono text-xs text-white/60 truncate ml-2 max-w-[140px]">
                  {API_URL.replace('http://', '')}
                </span>
              </div>
            </div>
          </div>

          {/* Database Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">Database</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Type</span>
                <span className="text-sm">{status?.database.type || 'PostgreSQL'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Status</span>
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-sm',
                  status?.database.connected ? 'text-emerald-400' : 'text-red-400'
                )}>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    status?.database.connected ? 'bg-emerald-400' : 'bg-red-400'
                  )} />
                  {status?.database.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Email Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-semibold">Email</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">SMTP</span>
                <StatusBadge configured={status?.email.configured ?? false} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Provider</span>
                <span className="text-sm text-white/60 truncate ml-2 max-w-[120px]">
                  {status?.email.provider?.replace('SMTP (', '').replace(')', '') || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Telegram Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-sky-400" />
              </div>
              <h2 className="text-lg font-semibold">Telegram</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Bot Token</span>
                <StatusBadge configured={status?.telegram.configured ?? false} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Status</span>
                <span className="text-sm text-white/60">
                  {status?.telegram.configured ? 'Ready' : 'Not setup'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold">Metrics</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Refresh</span>
                <span className="font-mono text-sm">{status?.metrics.refreshInterval || 3}s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">History</span>
                <span className="font-mono text-sm">{status?.metrics.retentionDays || 7} days</span>
              </div>
            </div>
          </div>

          {/* Alerts Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold">Alerts</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Log Retention</span>
                <span className="font-mono text-sm">{status?.alerts.logRetentionDays || 90} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Channels</span>
                <span className="text-sm">Email, Telegram</span>
              </div>
            </div>
          </div>

          {/* Storage Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-lg font-semibold">Storage</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Data Store</span>
                <span className="text-sm">PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Real-time</span>
                <span className="text-sm">Socket.IO</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
      configured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
    )}>
      {configured ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {configured ? 'OK' : 'N/A'}
    </span>
  );
}
