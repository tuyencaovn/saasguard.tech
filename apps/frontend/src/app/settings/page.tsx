'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
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
  Settings,
  Key,
  Loader2,
  X,
  EyeOff,
  Fingerprint,
  Trash2,
  Plus,
  Download,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listPasskeys,
  registerPasskey,
  deletePasskey,
  browserSupportsWebAuthn,
  type PasskeySummary,
} from '@/lib/webauthn';

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

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Passkey state
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeySaving, setPasskeySaving] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const webAuthnSupported = typeof window !== 'undefined' && browserSupportsWebAuthn();

  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    fetchStatus();
    fetchPasskeys();
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

  const fetchPasskeys = async () => {
    setPasskeysLoading(true);
    try {
      setPasskeys(await listPasskeys());
    } catch {
      setPasskeys([]);
    } finally {
      setPasskeysLoading(false);
    }
  };

  const handleAddPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeyError('');
    if (!passkeyName.trim()) {
      setPasskeyError('Give your passkey a name');
      return;
    }
    setPasskeySaving(true);
    try {
      await registerPasskey(passkeyName.trim());
      setShowPasskeyModal(false);
      setPasskeyName('');
      await fetchPasskeys();
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPasskeyError('Passkey prompt was cancelled.');
      } else {
        setPasskeyError(err instanceof Error ? err.message : 'Failed to add passkey');
      }
    } finally {
      setPasskeySaving(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      await deletePasskey(id);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch {
      await fetchPasskeys();
    }
  };

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
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
        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
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
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Change Password"
              >
                <Key className="w-4 h-4" />
              </button>
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

          {/* Passkeys Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Passkeys</h2>
              </div>
              {webAuthnSupported && (
                <button
                  onClick={() => { setPasskeyError(''); setPasskeyName(''); setShowPasskeyModal(true); }}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Add Passkey"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            {!webAuthnSupported ? (
              <p className="text-sm text-white/40">This browser does not support passkeys.</p>
            ) : passkeysLoading ? (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : passkeys.length === 0 ? (
              <p className="text-sm text-white/40">
                No passkeys yet. Add one to sign in without a password.
              </p>
            ) : (
              <div className="space-y-2">
                {passkeys.map((pk) => (
                  <div
                    key={pk.id}
                    className="flex items-center justify-between gap-2 p-2.5 bg-white/5 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pk.name}</p>
                      <p className="text-xs text-white/40">
                        {pk.lastUsedAt
                          ? `Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`
                          : `Added ${new Date(pk.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(pk.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                      title="Remove passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Infrastructure status — admin only */}
          {isAdmin && (
          <>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-pink-400" />
                </div>
                <h2 className="text-lg font-semibold">Email</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => router.push('/settings/notification-settings')}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Configure"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-sky-400" />
                </div>
                <h2 className="text-lg font-semibold">Telegram</h2>
              </div>
              {isAdmin && (
                <button
                  onClick={() => router.push('/settings/notification-settings?tab=telegram')}
                  className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  title="Configure"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
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
          </>
          )}

          {/* Configure Notifications Card - Admin Only */}
          {isAdmin && (
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
                Configure Email (SMTP) and Telegram notification settings
              </p>
              <div className="mt-4 text-sm text-violet-400 flex items-center gap-2">
                <span>Configure →</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !passwordSaving && setShowPasswordModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <button
                onClick={() => !passwordSaving && setShowPasswordModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Password changed successfully!
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-white/50 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordSaving}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                  >
                    {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Passkey Modal */}
      {showPasskeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !passkeySaving && setShowPasskeyModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Add Passkey</h2>
              </div>
              <button
                onClick={() => !passkeySaving && setShowPasskeyModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPasskey} className="space-y-4">
              {passkeyError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {passkeyError}
                </div>
              )}

              <div>
                <label className="block text-sm text-white/50 mb-2">Passkey Name</label>
                <input
                  type="text"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  required
                  maxLength={50}
                  autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  placeholder="e.g. MacBook Touch ID"
                />
                <p className="mt-2 text-xs text-white/40">
                  Your browser will prompt you to create a passkey on this device.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasskeyModal(false)}
                  disabled={passkeySaving}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passkeySaving}
                  className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                >
                  {passkeySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  Create Passkey
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
