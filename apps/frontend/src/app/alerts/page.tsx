'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import { ThresholdModal, ThresholdFormData } from '@/components/threshold-modal';
import {
  Plus,
  Pencil,
  Trash2,
  Cpu,
  Server,
  HardDrive,
  Box,
  Clock,
  Mail,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface AlertThreshold {
  id: string;
  metricName: 'cpu' | 'ram' | 'disk';
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  value: number;
  enabled: boolean;
  channels: ('email' | 'telegram')[];
  cooldownMs: number;
  lastTriggeredAt?: string | null;
}

interface AlertLog {
  id: string;
  alertThresholdId: string;
  alertThreshold: AlertThreshold;
  metricValue: number;
  triggeredAt: string;
  sentTo: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
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

export default function AlertsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<AlertThreshold | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 10;

  useEffect(() => {
    fetchThresholds();
  }, []);

  useEffect(() => {
    fetchAlertLogs(currentPage);
  }, [currentPage]);

  const fetchThresholds = async () => {
    try {
      const res = await fetch(`${API_URL}/alerts/thresholds`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setThresholds(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch thresholds:', res.status);
        setThresholds([]);
      }
    } catch (error) {
      console.error('Failed to fetch thresholds:', error);
      setThresholds([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_URL}/alerts/logs?page=${page}&limit=${logsPerPage}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const result = await res.json();
        setAlertLogs(result.data);
        setTotalPages(result.totalPages);
        setTotalLogs(result.total);
      }
    } catch (error) {
      console.error('Failed to fetch alert logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`${API_URL}/alerts/thresholds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchThresholds();
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  const handleSaveThreshold = async (data: ThresholdFormData) => {
    const url = editingThreshold
      ? `${API_URL}/alerts/thresholds/${editingThreshold.id}`
      : `${API_URL}/alerts/thresholds`;

    const res = await fetch(url, {
      method: editingThreshold ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to save threshold');
    }

    fetchThresholds();
  };

  const handleDeleteThreshold = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      await fetch(`${API_URL}/alerts/thresholds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchThresholds();
    } catch (error) {
      console.error('Failed to delete threshold:', error);
    }
  };

  const openCreateModal = () => {
    setEditingThreshold(null);
    setIsModalOpen(true);
  };

  const openEditModal = (threshold: AlertThreshold) => {
    setEditingThreshold(threshold);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingThreshold(null);
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
            {isAdmin && (
              <button
                onClick={openCreateModal}
                className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Rule
              </button>
            )}
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
                {isAdmin && (
                  <button
                    onClick={openCreateModal}
                    className="btn-gradient px-5 py-2.5 text-white font-medium rounded-xl flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    Create your first threshold
                  </button>
                )}
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
                        {isAdmin && (
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
                            <button
                              onClick={() => openEditModal(threshold)}
                              className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteThreshold(threshold.id)}
                              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
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
                          <span className="text-sm font-mono">{Math.round(threshold.cooldownMs / 60000)} minutes</span>
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
                            Last triggered:{' '}
                            <span className="text-white/60">
                              {threshold.lastTriggeredAt
                                ? new Date(threshold.lastTriggeredAt).toLocaleString()
                                : 'Never'}
                            </span>
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
              <div>
                <h2 className="text-lg font-semibold">Recent Alert History</h2>
                {totalLogs > 0 && (
                  <p className="text-sm text-white/40">{totalLogs} total alerts</p>
                )}
              </div>
              <button
                onClick={() => fetchAlertLogs(currentPage)}
                className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                Refresh
              </button>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="timeline-line" />

              {logsLoading ? (
                <div className="p-12 text-center text-white/40">Loading alert history...</div>
              ) : alertLogs.length === 0 ? (
                <div className="p-12 text-center text-white/40">No alerts triggered yet</div>
              ) : (
                alertLogs.map((log) => {
                  const metricName = log.alertThreshold?.metricName || 'unknown';
                  const config = metricConfig[metricName] || metricConfig.container;
                  const Icon = config.icon;
                  const isCritical = log.metricValue >= 90;

                  return (
                    <div key={log.id} className="timeline-item p-6 border-b border-white/5">
                      <div className="flex items-start gap-5">
                        {/* Icon */}
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10',
                            isCritical ? 'icon-critical' : 'icon-warning'
                          )}
                        >
                          <Icon className={cn('w-6 h-6', isCritical ? 'text-red-400' : 'text-amber-400')} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">
                              {metricName.toUpperCase()} Alert
                            </h4>
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-full border',
                                isCritical ? 'badge-critical' : 'badge-warning'
                              )}
                            >
                              {isCritical ? 'Critical' : 'Warning'}
                            </span>
                            <span
                              className={cn(
                                'px-2.5 py-1 text-xs font-medium rounded-full border',
                                log.deliveryStatus === 'sent' && 'badge-resolved',
                                log.deliveryStatus === 'failed' && 'badge-critical',
                                log.deliveryStatus === 'pending' && 'badge-info'
                              )}
                            >
                              {log.deliveryStatus === 'sent' ? 'Sent' : log.deliveryStatus === 'failed' ? 'Failed' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-white/50 mb-3">
                            {metricName.toUpperCase()} exceeded threshold: {Number(log.metricValue).toFixed(1)}% {log.alertThreshold?.operator} {log.alertThreshold?.value}%
                          </p>
                          <div className="flex items-center gap-5 text-xs text-white/40">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {new Date(log.triggeredAt).toLocaleString()}
                            </span>
                            {log.sentTo && log.sentTo !== 'no-email-configured' && (
                              <span className="flex items-center gap-1.5">
                                <Mail className="w-4 h-4" />
                                {log.sentTo}
                              </span>
                            )}
                            {log.errorMessage && (
                              <span className="flex items-center gap-1.5 text-red-400">
                                <AlertTriangle className="w-4 h-4" />
                                {log.errorMessage}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-white/5">
                <p className="text-sm text-white/40">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-10 h-10 text-sm rounded-xl transition-all',
                          currentPage === pageNum
                            ? 'bg-white/10 text-white'
                            : 'text-white/50 hover:text-white hover:bg-white/5'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Threshold Modal */}
      <ThresholdModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveThreshold}
        initialData={editingThreshold ? {
          id: editingThreshold.id,
          metricName: editingThreshold.metricName,
          operator: editingThreshold.operator,
          value: editingThreshold.value,
          channels: editingThreshold.channels,
          enabled: editingThreshold.enabled,
          cooldownMs: editingThreshold.cooldownMs,
        } : undefined}
      />
    </div>
  );
}
