'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Trash2, RefreshCw, X, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SslStatusBadge } from '@/components/ssl-status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ConnectionStatus } from '@/components/connection-status';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { TIER_LIMITS } from '@/lib/tier-limits';
import { useAuth } from '@/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface SslMonitor {
  id: string;
  domain: string;
  port: number;
  status: 'unknown' | 'valid' | 'warning' | 'critical' | 'expired' | 'error';
  expiresAt: string | null;
  daysUntilExpiry: number | null;
  lastChecked: string | null;
  issuer: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function SslPage() {
  const { user } = useAuth();
  const userTier = user?.tier ?? 'free';
  const [monitors, setMonitors] = useState<SslMonitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SslMonitor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/ssl`, { credentials: 'include' });
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
  }, [fetchMonitors]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const domain = domainInput.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!domain) {
      setAddError('Please enter a valid domain');
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/ssl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to add domain');
      }
      setShowAddModal(false);
      setDomainInput('');
      await fetchMonitors();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setAdding(false);
    }
  };

  const handleCheckNow = async (monitor: SslMonitor) => {
    setCheckingId(monitor.id);
    try {
      const res = await fetch(`${API_URL}/ssl/${monitor.id}/check`, {
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
      await fetch(`${API_URL}/ssl/${deleteTarget.id}`, {
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
            <h1 className="text-2xl font-bold">SSL Certificates</h1>
            <p className="text-sm text-white/40">Monitor SSL expiry for your domains</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Domain
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-8">
        {/* Upgrade prompt when approaching/at free tier SSL limit */}
        {userTier === 'free' && monitors.length >= TIER_LIMITS.free.sslDomains && (
          <div className="mb-6">
            <UpgradePrompt
              feature="SSL Domain Limit Reached"
              description={`Free tier allows ${TIER_LIMITS.free.sslDomains} domains. Upgrade Pro to monitor up to ${TIER_LIMITS.pro.sslDomains} domains.`}
              variant="banner"
              dismissible
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-white/40">Loading SSL monitors...</div>
        ) : monitors.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-2 font-medium">No domains monitored</p>
            <p className="text-white/30 text-sm mb-6">Add your first domain to track SSL expiry.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Add your first domain
            </button>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-white/5 text-xs text-white/40 uppercase tracking-wider">
              <span>Domain</span>
              <span>Status</span>
              <span>Expires</span>
              <span>Days Left</span>
              <span>Last Checked</span>
              <span />
            </div>

            {monitors.map((monitor, idx) => (
              <div
                key={monitor.id}
                className={cn(
                  'px-6 py-4 flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 md:items-center',
                  idx < monitors.length - 1 && 'border-b border-white/5',
                )}
              >
                {/* Domain */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{monitor.domain}</p>
                    {monitor.port !== 443 && (
                      <p className="text-xs text-white/40">Port {monitor.port}</p>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <SslStatusBadge status={monitor.status} daysUntilExpiry={monitor.daysUntilExpiry} />
                </div>

                {/* Expires */}
                <div className="text-sm text-white/60">
                  {monitor.expiresAt
                    ? new Date(monitor.expiresAt).toLocaleDateString()
                    : <span className="text-white/30">—</span>}
                </div>

                {/* Days Left */}
                <div className="text-sm">
                  {monitor.daysUntilExpiry !== null ? (
                    <span className={cn(
                      'font-medium',
                      monitor.daysUntilExpiry <= 0 ? 'text-red-400' :
                      monitor.daysUntilExpiry <= 7 ? 'text-orange-400' :
                      monitor.daysUntilExpiry <= 30 ? 'text-amber-400' :
                      'text-white/60'
                    )}>
                      {monitor.daysUntilExpiry <= 0 ? 'Expired' : `${monitor.daysUntilExpiry}d`}
                    </span>
                  ) : (
                    monitor.errorMessage ? (
                      <span className="text-red-400 text-xs truncate max-w-[120px] block" title={monitor.errorMessage}>
                        {monitor.errorMessage}
                      </span>
                    ) : <span className="text-white/30">—</span>
                  )}
                </div>

                {/* Last Checked */}
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

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !adding && setShowAddModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold">Add SSL Monitor</h2>
              </div>
              <button
                onClick={() => !adding && setShowAddModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {addError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm text-white/50 mb-2">Domain</label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="example.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
                <p className="text-xs text-white/30 mt-1.5">Protocol (https://) will be stripped automatically</p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={adding}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                >
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Domain
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
        title="Delete SSL Monitor"
        message={`Stop monitoring SSL for "${deleteTarget?.domain}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
