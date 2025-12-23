'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import { formatUptime } from '@/lib/utils';
import type { PM2Process } from '@/types/metrics';
import {
  Terminal,
  Play,
  Square,
  RotateCcw,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  FileText,
  AlertTriangle,
  Timer,
  Loader2,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

type StatusFilter = 'all' | 'online' | 'stopped' | 'errored';
type ViewMode = 'grid' | 'list';

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  stopped: 'bg-white/5 text-white/40 border-white/10',
  errored: 'bg-red-500/10 text-red-400 border-red-500/20',
  launching: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatProcessUptime(uptimeMs: number | null): string {
  if (!uptimeMs || uptimeMs < 0) return '—';
  const seconds = Math.floor(uptimeMs / 1000);
  return formatUptime(seconds);
}

// PM2 Logs Modal Component
function PM2LogsModal({
  processId,
  processName,
  isOpen,
  onClose,
}: {
  processId: number | null;
  processName: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [tail, setTail] = useState(100);

  const fetchLogs = useCallback(async () => {
    if (processId === null) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pm2/processes/${processId}/logs?tail=${tail}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || '');
      } else {
        setLogs('Failed to fetch logs');
      }
    } catch (error) {
      setLogs('Error fetching logs: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [processId, tail]);

  useEffect(() => {
    if (isOpen && processId !== null) {
      fetchLogs();
    }
  }, [isOpen, processId, tail, fetchLogs]);

  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${processName}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-[#0f0f10] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">Process Logs</h2>
            <p className="text-sm text-white/40 font-mono">{processName}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tail}
              onChange={(e) => setTail(Number(e.target.value))}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value={50}>Last 50 lines</option>
              <option value={100}>Last 100 lines</option>
              <option value={200}>Last 200 lines</option>
              <option value={500}>Last 500 lines</option>
            </select>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDownload}
              disabled={!logs}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white disabled:opacity-50"
              title="Download logs"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
            </div>
          ) : (
            <pre className="text-xs font-mono text-white/80 whitespace-pre-wrap break-all leading-relaxed">
              {logs || 'No logs available'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PM2Page() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [processes, setProcesses] = useState<PM2Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [logsProcess, setLogsProcess] = useState<{ id: number; name: string } | null>(null);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/pm2/processes`, {
        credentials: 'include',
      });
      const data = await res.json();
      setProcesses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch PM2 processes:', error);
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
    // Poll every 5 seconds
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  const performAction = useCallback(
    async (pmId: number, action: 'start' | 'stop' | 'restart') => {
      setActionInProgress(`${pmId}-${action}`);
      try {
        const res = await fetch(`${API_URL}/pm2/processes/${pmId}/${action}`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || `Failed to ${action} process`);
        }
        await fetchProcesses();
      } catch (error) {
        console.error(`Failed to ${action} process:`, error);
        alert(error instanceof Error ? error.message : `Failed to ${action} process`);
      } finally {
        setActionInProgress(null);
      }
    },
    [fetchProcesses]
  );

  const filteredProcesses = useMemo(() => {
    return processes.filter((proc) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && proc.status === 'online') ||
        (statusFilter === 'stopped' && proc.status === 'stopped') ||
        (statusFilter === 'errored' && proc.status === 'errored');

      const matchesSearch =
        !searchQuery || proc.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [processes, statusFilter, searchQuery]);

  const totalProcesses = processes.length;
  const onlineProcesses = processes.filter((p) => p.status === 'online').length;
  const stoppedProcesses = processes.filter((p) => p.status === 'stopped').length;
  const erroredProcesses = processes.filter((p) => p.status === 'errored').length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProcesses();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [fetchProcesses]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PM2 Processes</h1>
            <p className="text-sm text-white/40">Process management</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold">{totalProcesses}</div>
                <div className="text-sm text-white/40">Total Processes</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Play className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400">{onlineProcesses}</div>
                <div className="text-sm text-white/40">Online</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Square className="w-6 h-6 text-white/40" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white/60">{stoppedProcesses}</div>
                <div className="text-sm text-white/40">Stopped</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-red-400">{erroredProcesses}</div>
                <div className="text-sm text-white/40">Errored</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search processes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="stopped">Stopped</option>
            <option value="errored">Errored</option>
          </select>

          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-lg transition-colors',
                viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
              )}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
            Refresh All
          </button>
        </div>

        {/* Process Display */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-white/40">Loading processes...</div>
          ) : filteredProcesses.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              {processes.length === 0
                ? 'No PM2 processes found. PM2 may not be running.'
                : 'No processes match your filters.'}
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Process
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      CPU
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Memory
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Uptime
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Restarts
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      {isAdmin ? 'Actions' : 'Logs'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((proc) => (
                    <tr
                      key={proc.pm_id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              proc.status === 'online' ? 'bg-emerald-500/10' : 'bg-white/5'
                            )}
                          >
                            <Terminal
                              className={cn(
                                'w-5 h-5',
                                proc.status === 'online' ? 'text-emerald-400' : 'text-white/30'
                              )}
                            />
                          </div>
                          <div>
                            <div className="font-medium">{proc.name}</div>
                            <div className="text-xs text-white/40 font-mono">
                              ID: {proc.pm_id} {proc.pid ? `| PID: ${proc.pid}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full border',
                            statusColors[proc.status] || statusColors.stopped
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              proc.status === 'online'
                                ? 'bg-emerald-400'
                                : proc.status === 'errored'
                                  ? 'bg-red-400'
                                  : 'bg-white/40'
                            )}
                          />
                          {proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-white/30" />
                          <span className="text-sm font-mono text-white/60">
                            {proc.cpu.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-white/30" />
                          <span className="text-sm font-mono text-white/60">
                            {formatBytes(proc.memory)}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-white/60">
                          {proc.status === 'online' ? formatProcessUptime(proc.uptime) : '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-white/60">{proc.restarts}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <>
                              {proc.status === 'online' ? (
                                <button
                                  onClick={() => performAction(proc.pm_id, 'stop')}
                                  disabled={actionInProgress === `${proc.pm_id}-stop`}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400 disabled:opacity-50"
                                  title="Stop"
                                >
                                  {actionInProgress === `${proc.pm_id}-stop` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  onClick={() => performAction(proc.pm_id, 'start')}
                                  disabled={actionInProgress === `${proc.pm_id}-start`}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-emerald-400 disabled:opacity-50"
                                  title="Start"
                                >
                                  {actionInProgress === `${proc.pm_id}-start` ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => performAction(proc.pm_id, 'restart')}
                                disabled={
                                  actionInProgress === `${proc.pm_id}-restart` ||
                                  proc.status !== 'online'
                                }
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-blue-400 disabled:opacity-50"
                                title="Restart"
                              >
                                {actionInProgress === `${proc.pm_id}-restart` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setLogsProcess({ id: proc.pm_id, name: proc.name })}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-violet-400"
                            title="View logs"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProcesses.map((proc) => (
                <div
                  key={proc.pm_id}
                  className={cn(
                    'p-4 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all',
                    proc.status !== 'online' && 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        proc.status === 'online' ? 'bg-emerald-500/10' : 'bg-white/5'
                      )}
                    >
                      <Terminal
                        className={cn(
                          'w-5 h-5',
                          proc.status === 'online' ? 'text-emerald-400' : 'text-white/30'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{proc.name}</div>
                      <div className="text-xs text-white/40 font-mono">ID: {proc.pm_id}</div>
                    </div>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        proc.status === 'online'
                          ? 'bg-emerald-500 status-running'
                          : proc.status === 'errored'
                            ? 'bg-red-500'
                            : 'bg-white/30'
                      )}
                    />
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-white/50">
                        <Cpu className="w-3.5 h-3.5" /> CPU
                      </span>
                      <span className="font-mono text-white/70">{proc.cpu.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-white/50">
                        <HardDrive className="w-3.5 h-3.5" /> Memory
                      </span>
                      <span className="font-mono text-white/70">{formatBytes(proc.memory)}</span>
                    </div>
                    {proc.status === 'online' && proc.uptime && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-white/50">
                          <Timer className="w-3.5 h-3.5" /> Uptime
                        </span>
                        <span className="font-mono text-white/70">
                          {formatProcessUptime(proc.uptime)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
                        statusColors[proc.status] || statusColors.stopped
                      )}
                    >
                      {proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}
                    </span>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <>
                          {proc.status === 'online' ? (
                            <button
                              onClick={() => performAction(proc.pm_id, 'stop')}
                              disabled={actionInProgress === `${proc.pm_id}-stop`}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400 disabled:opacity-50"
                              title="Stop"
                            >
                              {actionInProgress === `${proc.pm_id}-stop` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Square className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => performAction(proc.pm_id, 'start')}
                              disabled={actionInProgress === `${proc.pm_id}-start`}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-emerald-400 disabled:opacity-50"
                              title="Start"
                            >
                              {actionInProgress === `${proc.pm_id}-start` ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => performAction(proc.pm_id, 'restart')}
                            disabled={
                              actionInProgress === `${proc.pm_id}-restart` ||
                              proc.status !== 'online'
                            }
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-blue-400 disabled:opacity-50"
                            title="Restart"
                          >
                            {actionInProgress === `${proc.pm_id}-restart` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setLogsProcess({ id: proc.pm_id, name: proc.name })}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-violet-400"
                        title="View logs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          {filteredProcesses.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <div className="text-sm text-white/40">
                Showing {filteredProcesses.length} of {processes.length} processes
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logs Modal */}
      <PM2LogsModal
        processId={logsProcess?.id ?? null}
        processName={logsProcess?.name || ''}
        isOpen={!!logsProcess}
        onClose={() => setLogsProcess(null)}
      />
    </div>
  );
}
