'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, Trash2, RefreshCw, X, Loader2, AlertTriangle, ExternalLink, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UptimeStatusBadge } from '@/components/uptime-status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ConnectionStatus } from '@/components/connection-status';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface UptimeMonitor {
  id: string;
  url: string;
  name: string | null;
  checkIntervalSeconds: number;
  status: 'unknown' | 'up' | 'down';
  lastStatusCode: number | null;
  lastResponseTimeMs: number | null;
  lastChecked: string | null;
  errorMessage: string | null;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifySlack: boolean;
  notifyEmailTo: string | null;
  uptime24h: number | null;
  uptime7d: number | null;
  uptime30d: number | null;
  hourly: { start: string; uptime: number | null }[];
  daily: { date: string; uptime: number | null }[];
  createdAt: string;
}

interface MonitorForm {
  url: string;
  name: string;
  checkIntervalSeconds: number;
  notifyEmail: boolean;
  notifyTelegram: boolean;
  notifySlack: boolean;
  notifyEmailTo: string;
}

const emptyForm: MonitorForm = {
  url: '',
  name: '',
  checkIntervalSeconds: 60,
  notifyEmail: true,
  notifyTelegram: true,
  notifySlack: true,
  notifyEmailTo: '',
};

const INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 60, label: 'Every 1 minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 600, label: 'Every 10 minutes' },
  { value: 900, label: 'Every 15 minutes' },
  { value: 1800, label: 'Every 30 minutes' },
  { value: 3600, label: 'Every 1 hour' },
];

function formatInterval(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  return `${Math.round(seconds / 60)}m`;
}

function formatUptime(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function uptimeColor(value: number | null): string {
  if (value === null) return 'text-white/30';
  if (value >= 99.5) return 'text-emerald-400';
  if (value >= 95) return 'text-amber-400';
  return 'text-red-400';
}

function segColor(value: number | null): string {
  if (value === null) return 'bg-white/10';
  if (value >= 99.5) return 'bg-emerald-500/80';
  if (value >= 90) return 'bg-amber-500/80';
  return 'bg-red-500/80';
}

function StatusBar({ segments }: { segments: { key: string; uptime: number | null; title: string }[] }) {
  if (segments.length === 0) {
    return <div className="h-2.5 rounded-sm bg-white/5" />;
  }
  return (
    <div className="flex items-center gap-[2px]">
      {segments.map((s) => (
        <span
          key={s.key}
          title={s.title}
          className={cn('h-2.5 flex-1 rounded-[2px] transition-colors', segColor(s.uptime))}
        />
      ))}
    </div>
  );
}

export default function UptimePage() {
  const [monitors, setMonitors] = useState<UptimeMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MonitorForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UptimeMonitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/uptime`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMonitors(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 30000);
    return () => clearInterval(interval);
  }, [fetchMonitors]);

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (m: UptimeMonitor) => {
    setEditId(m.id);
    setForm({
      url: m.url,
      name: m.name ?? '',
      checkIntervalSeconds: m.checkIntervalSeconds,
      notifyEmail: m.notifyEmail,
      notifyTelegram: m.notifyTelegram,
      notifySlack: m.notifySlack,
      notifyEmailTo: m.notifyEmailTo ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const url = form.url.trim();
    if (!url) {
      setFormError('Please enter a URL');
      return;
    }
    setSaving(true);
    const payload = {
      url,
      name: form.name.trim() || undefined,
      checkIntervalSeconds: form.checkIntervalSeconds,
      notifyEmail: form.notifyEmail,
      notifyTelegram: form.notifyTelegram,
      notifySlack: form.notifySlack,
      notifyEmailTo: form.notifyEmailTo.trim() || undefined,
    };
    try {
      const res = await fetch(
        editId ? `${API_URL}/uptime/${editId}` : `${API_URL}/uptime`,
        {
          method: editId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || 'Failed to save monitor');
      }
      setShowModal(false);
      setForm(emptyForm);
      setEditId(null);
      await fetchMonitors();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save monitor');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckNow = async (monitor: UptimeMonitor) => {
    setCheckingId(monitor.id);
    try {
      const res = await fetch(`${API_URL}/uptime/${monitor.id}/check`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const updated = await res.json();
        setMonitors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      }
    } catch {
      // ignore
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/uptime/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setMonitors((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-4 pl-14 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Uptime Monitors</h1>
            <p className="text-sm text-white/40">Track uptime and response time for apps on any domain</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <button
              onClick={openAddModal}
              className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Monitor
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-8">
        {loading ? (
          <div className="text-center py-12 text-white/40">Loading uptime monitors...</div>
        ) : monitors.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-2 font-medium">No monitors yet</p>
            <p className="text-white/30 text-sm mb-6">Add a URL to start tracking its uptime.</p>
            <button
              onClick={openAddModal}
              className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Add your first monitor
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.6fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
              <span>Monitor</span>
              <span>Status</span>
              <span>Response</span>
              <span>Uptime (24h / 7d / 30d)</span>
              <span>Last Checked</span>
              <span />
            </div>

            {monitors.map((monitor, idx) => (
              <div
                key={monitor.id}
                className={cn(
                  'px-6 py-4 flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1.6fr_1fr_auto] gap-3 md:gap-4 md:items-center',
                  idx < monitors.length - 1 && 'border-b border-white/5',
                )}
              >
                {/* Monitor */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {monitor.name || monitor.url}
                      <span className="ml-2 text-xs font-normal text-white/30">· every {formatInterval(monitor.checkIntervalSeconds)}</span>
                    </p>
                    <a
                      href={monitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-violet-400 flex items-center gap-1 truncate"
                    >
                      {monitor.url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <UptimeStatusBadge status={monitor.status} />
                  {monitor.status === 'down' && monitor.errorMessage && (
                    <p className="text-xs text-red-400/70 mt-1 truncate max-w-[140px]" title={monitor.errorMessage}>
                      {monitor.errorMessage}
                    </p>
                  )}
                </div>

                {/* Response time */}
                <div className="text-sm text-white/60">
                  {monitor.lastResponseTimeMs !== null
                    ? `${monitor.lastResponseTimeMs} ms`
                    : <span className="text-white/30">—</span>}
                </div>

                {/* Uptime windows + status bars */}
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className={uptimeColor(monitor.uptime24h)} title="Last 24 hours">{formatUptime(monitor.uptime24h)}</span>
                    <span className="text-white/20">/</span>
                    <span className={uptimeColor(monitor.uptime7d)} title="Last 7 days">{formatUptime(monitor.uptime7d)}</span>
                    <span className="text-white/20">/</span>
                    <span className={uptimeColor(monitor.uptime30d)} title="Last 30 days">{formatUptime(monitor.uptime30d)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 w-5 shrink-0">24h</span>
                    <StatusBar
                      segments={(monitor.hourly ?? []).map((h) => ({
                        key: h.start,
                        uptime: h.uptime,
                        title: `${new Date(h.start).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' })} — ${h.uptime === null ? 'no data' : `${h.uptime}% up`}`,
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 w-5 shrink-0">7d</span>
                    <StatusBar
                      segments={(monitor.daily ?? []).map((d) => ({
                        key: d.date,
                        uptime: d.uptime,
                        title: `${d.date} — ${d.uptime === null ? 'no data' : `${d.uptime}% up`}`,
                      }))}
                    />
                  </div>
                </div>

                {/* Last checked */}
                <div className="text-sm text-white/40">
                  {monitor.lastChecked
                    ? new Date(monitor.lastChecked).toLocaleString()
                    : <span className="text-white/30">Never</span>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => handleCheckNow(monitor)}
                    disabled={checkingId === monitor.id}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-50"
                    title="Check now"
                  >
                    <RefreshCw className={cn('w-4 h-4', checkingId === monitor.id && 'animate-spin')} />
                  </button>
                  <button
                    onClick={() => openEditModal(monitor)}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(monitor)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Monitor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !saving && setShowModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">{editId ? 'Edit Monitor' : 'Add Uptime Monitor'}</h2>
              </div>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm text-white/50 mb-2">URL</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://app.example.com/health"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
                <p className="text-xs text-white/30 mt-1.5">https:// is added automatically if omitted</p>
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">Name <span className="text-white/25">(optional)</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="My App"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-2">Check interval</label>
                <select
                  value={form.checkIntervalSeconds}
                  onChange={(e) => setForm((f) => ({ ...f, checkIntervalSeconds: Number(e.target.value) }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-violet-500/50"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-neutral-900">{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Notification config */}
              <div className="pt-2 border-t border-white/5">
                <p className="text-sm text-white/50 mb-3">Notifications on down / recovery</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyEmail}
                      onChange={(e) => setForm((f) => ({ ...f, notifyEmail: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-violet-500"
                    />
                    <span className="text-sm text-white/70">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifyTelegram}
                      onChange={(e) => setForm((f) => ({ ...f, notifyTelegram: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-violet-500"
                    />
                    <span className="text-sm text-white/70">Telegram</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.notifySlack}
                      onChange={(e) => setForm((f) => ({ ...f, notifySlack: e.target.checked }))}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 accent-violet-500"
                    />
                    <span className="text-sm text-white/70">Slack</span>
                  </label>
                </div>
                {form.notifyEmail && (
                  <div className="mt-3">
                    <label className="block text-sm text-white/50 mb-2">Send email to <span className="text-white/25">(optional)</span></label>
                    <input
                      type="email"
                      value={form.notifyEmailTo}
                      onChange={(e) => setForm((f) => ({ ...f, notifyEmailTo: e.target.value }))}
                      placeholder="Defaults to the admin email"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
                <p className="text-xs text-white/30 mt-3">
                  Channels (SMTP, Telegram bot, Slack webhook) are configured globally in Settings → Notifications.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editId ? 'Save Changes' : 'Add Monitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Uptime Monitor"
        message={`Stop monitoring "${deleteTarget?.name || deleteTarget?.url}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
