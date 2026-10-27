'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/connection-status';
import {
  Server,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Settings,
  Loader2,
  Download,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface SystemStatus {
  version: string;
  uptime: number;
  database: { connected: boolean; type: string };
  email: { configured: boolean; provider: string | null };
  telegram: { configured: boolean };
  metrics: { refreshInterval: number; retentionDays: number };
  alerts: { logRetentionDays: number };
}

interface UpdateStatus {
  state: 'in_progress' | 'success' | 'failed';
  target: string;
  previous: string;
  error?: string;
}

interface VersionInfo {
  current: string;
  previous: string | null;
  latest: string | null;
  available: string[];
  updateAvailable: boolean;
  canRollback: boolean;
  status: UpdateStatus | null;
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const isAdmin = currentUser?.role === 'admin';
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [backupError, setBackupError] = useState('');

  useEffect(() => {
    fetchStatus();
    if (isAdmin) fetchVersionInfo();
  }, [isAdmin]);

  // While an update runs the backend recreates itself, so polling will fail for
  // a bit — keep polling and recover once it's back with the new version.
  useEffect(() => {
    if (!isAdmin) return;
    const inProgress = updating || versionInfo?.status?.state === 'in_progress';
    if (!inProgress) return;
    const id = setInterval(fetchVersionInfo, 5000);
    return () => clearInterval(id);
  }, [isAdmin, updating, versionInfo?.status?.state]);

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

  const fetchVersionInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/updates/version`, { credentials: 'include' });
      if (res.ok) {
        const info: VersionInfo = await res.json();
        setVersionInfo(info);
        if (info.status?.state !== 'in_progress') setUpdating(false);
      }
    } catch {
      // Backend is likely mid-restart during its own update — ignore and keep polling.
    }
  };

  const handleUpdate = async (target: string) => {
    const label = target === 'latest' ? 'the latest version' : `version ${target}`;
    if (!window.confirm(`Update to ${label}? The app restarts and may be briefly unavailable.`)) {
      return;
    }
    setUpdateError('');
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        throw new Error(msg || 'Update failed to start');
      }
      await fetchVersionInfo();
    } catch (e) {
      setUpdating(false);
      setUpdateError(e instanceof Error ? e.message : 'Update failed to start');
    }
  };

  const handleBackup = async () => {
    setBackupError('');
    setBackupMsg('');
    setBackingUp(true);
    try {
      const res = await fetch(`${API_URL}/backup/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saasguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMsg('Backup downloaded — keep it safe, it contains secrets.');
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Backup failed');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be picked again
    if (!file) return;
    if (
      !window.confirm(
        'Restore REPLACES all users and settings with the backup. Current data in those tables is deleted and you may be logged out. Continue?',
      )
    ) {
      return;
    }
    setBackupError('');
    setBackupMsg('');
    setRestoring(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        throw new Error('File is not valid JSON');
      }
      const res = await fetch(`${API_URL}/backup/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
        throw new Error(msg || 'Restore failed');
      }
      const counts = body.restored
        ? Object.entries(body.restored)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')
        : '';
      setBackupMsg(`Restored (${counts}). Log in again if your session ends.`);
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setRestoring(false);
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
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-4 pl-14 md:px-8 py-4">
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

      <div className="p-4 md:p-8">
        {!isAdmin ? (
          <div className="glass-card rounded-2xl p-12 text-center text-white/40">
            <Settings className="w-10 h-10 mx-auto mb-4 opacity-50" />
            <p>No system settings available for your role.</p>
            <p className="text-sm mt-1 text-white/30">Manage your account from the Account &amp; Security page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
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

              {versionInfo && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  {updating || versionInfo.status?.state === 'in_progress' ? (
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Updating to {versionInfo.status?.target || '…'} — the app will restart</span>
                    </div>
                  ) : versionInfo.updateAvailable ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        New version {versionInfo.latest} available
                      </span>
                      <button
                        onClick={() => handleUpdate('latest')}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all text-sm font-medium"
                      >
                        <Download className="w-4 h-4" />
                        Update to {versionInfo.latest}
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Up to date
                    </span>
                  )}

                  {versionInfo.status?.state === 'success' && !updating && (
                    <p className="text-xs text-emerald-400/80">Now running {versionInfo.status.target}.</p>
                  )}
                  {(updateError || (versionInfo.status?.state === 'failed' && !updating)) && (
                    <p className="text-xs text-red-400">
                      {updateError || `Update failed: ${versionInfo.status?.error || 'unknown error'}`}
                    </p>
                  )}

                  {versionInfo.canRollback &&
                    !updating &&
                    versionInfo.status?.state !== 'in_progress' && (
                      <button
                        onClick={() => handleUpdate(versionInfo.previous as string)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all text-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Rollback to {versionInfo.previous}
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* Backup & Restore Card */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold">Backup &amp; Restore</h2>
              </div>
              <p className="text-white/50 text-sm mb-4">
                Users, alert rules, SSL monitors, uptime monitors, notifications &amp;
                passkeys. The file contains secrets — store it securely.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleBackup}
                  disabled={backingUp}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-all text-sm font-medium disabled:opacity-50"
                >
                  {backingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download backup
                </button>

                <label
                  className={cn(
                    'w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all text-sm cursor-pointer',
                    restoring && 'opacity-50 pointer-events-none',
                  )}
                >
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {restoring ? 'Restoring…' : 'Restore from file'}
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={handleRestoreFile}
                    disabled={restoring}
                  />
                </label>

                <p className="inline-flex items-start gap-1.5 text-xs text-amber-400/90">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Restore replaces all users &amp; settings with the backup.
                </p>

                {backupMsg && <p className="text-xs text-emerald-400/90">{backupMsg}</p>}
                {backupError && <p className="text-xs text-red-400">{backupError}</p>}
              </div>
            </div>

            {/* Configure Notifications Card */}
            <div
              onClick={() => router.push('/settings/notification-settings')}
              className="glass-card rounded-2xl p-6 cursor-pointer hover:bg-white/5 transition-all border-2 border-dashed border-white/10 hover:border-violet-500/30"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Notifications</h2>
              </div>
              <p className="text-sm text-white/50">
                Configure Email (SMTP), Telegram and Slack notification settings
              </p>
              <div className="mt-4 text-sm text-violet-400 flex items-center gap-2">
                <span>Configure →</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
