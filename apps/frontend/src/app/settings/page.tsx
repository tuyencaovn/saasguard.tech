'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Settings,
  Mail,
  MessageSquare,
  Database,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Eye,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface SystemStatus {
  version: string;
  uptime: number;
  database: {
    connected: boolean;
    type: string;
  };
  email: {
    configured: boolean;
    provider: string | null;
  };
  telegram: {
    configured: boolean;
  };
  metrics: {
    refreshInterval: number;
    retentionDays: number;
  };
  alerts: {
    logRetentionDays: number;
  };
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      } else {
        // Fallback to basic status if health endpoint not available
        setStatus({
          version: '2.0.0',
          uptime: 0,
          database: { connected: true, type: 'PostgreSQL' },
          email: { configured: false, provider: null },
          telegram: { configured: false },
          metrics: { refreshInterval: 3, retentionDays: 7 },
          alerts: { logRetentionDays: 90 },
        });
      }
    } catch {
      setError('Failed to fetch system status');
      setStatus({
        version: '2.0.0',
        uptime: 0,
        database: { connected: false, type: 'PostgreSQL' },
        email: { configured: false, provider: null },
        telegram: { configured: false },
        metrics: { refreshInterval: 3, retentionDays: 7 },
        alerts: { logRetentionDays: 90 },
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const StatusBadge = ({ configured }: { configured: boolean }) => (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium',
        configured
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-amber-500/10 text-amber-400'
      )}
    >
      {configured ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          Configured
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4" />
          Not Configured
        </>
      )}
    </span>
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-white/40">System configuration and status</p>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      <div className="p-8 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Your Profile */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
              {currentUser?.role === 'admin' ? (
                <Shield className="w-5 h-5 text-violet-400" />
              ) : (
                <Eye className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Your Profile</h2>
              <p className="text-sm text-white/40">Account information</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Email</span>
              <span className="font-medium">{currentUser?.email || 'Not logged in'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Role</span>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg text-sm font-medium',
                  currentUser?.role === 'admin'
                    ? 'bg-violet-500/10 text-violet-400'
                    : 'bg-cyan-500/10 text-cyan-400'
                )}
              >
                {currentUser?.role === 'admin' ? 'Admin' : 'Viewer'}
              </span>
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Notification Channels</h2>
                <p className="text-sm text-white/40">Alert delivery configuration</p>
              </div>
            </div>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Email/SMTP */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Email (SMTP)</p>
                  <p className="text-sm text-white/40">
                    {status?.email.provider || 'Configure via SMTP_* env vars'}
                  </p>
                </div>
              </div>
              <StatusBadge configured={status?.email.configured ?? false} />
            </div>

            {/* Telegram */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <p className="font-medium">Telegram Bot</p>
                  <p className="text-sm text-white/40">
                    Configure via TELEGRAM_BOT_TOKEN env var
                  </p>
                </div>
              </div>
              <StatusBadge configured={status?.telegram.configured ?? false} />
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">System Status</h2>
              <p className="text-sm text-white/40">Backend and infrastructure</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Version</span>
              <span className="font-mono">{status?.version || '2.0.0'}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">API Endpoint</span>
              <span className="font-mono text-sm">{API_URL}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <div className="flex items-center gap-2 text-white/50">
                <Database className="w-4 h-4" />
                <span>Database</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/40">{status?.database.type || 'PostgreSQL'}</span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    status?.database.connected ? 'bg-emerald-400' : 'bg-red-400'
                  )}
                />
              </div>
            </div>
            {status?.uptime ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-2 text-white/50">
                  <Clock className="w-4 h-4" />
                  <span>Uptime</span>
                </div>
                <span className="font-mono">{formatUptime(status.uptime)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Data & Retention */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-6 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Data & Retention</h2>
              <p className="text-sm text-white/40">Metrics and logs configuration</p>
            </div>
          </div>

          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Metrics Refresh Interval</span>
              <span className="font-mono">{status?.metrics.refreshInterval || 3} seconds</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Metrics History</span>
              <span className="font-mono">{status?.metrics.retentionDays || 7} days</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
              <span className="text-white/50">Alert Logs Retention</span>
              <span className="font-mono">{status?.alerts.logRetentionDays || 90} days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
