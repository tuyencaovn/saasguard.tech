'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDockerEvents } from '@/hooks/use-socket';
import { useAuth } from '@/contexts/auth-context';
import { ConnectionStatus } from '@/components/connection-status';
import { formatTime, formatUptime } from '@/lib/utils';

// Calculate container uptime from startedAt
function getContainerUptime(startedAt?: string): string {
  if (!startedAt) return '—';
  const startTime = new Date(startedAt).getTime();
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - startTime) / 1000);
  if (uptimeSeconds < 0) return '—';
  return formatUptime(uptimeSeconds);
}
import {
  Box,
  Play,
  Square,
  RotateCcw,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  MoreVertical,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'running' | 'stopped' | 'error';
type ViewMode = 'grid' | 'list';

const stateColors: Record<string, string> = {
  running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  exited: 'bg-white/5 text-white/40 border-white/10',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  restarting: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  created: 'bg-white/5 text-white/40 border-white/10',
  dead: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const actionColors: Record<string, string> = {
  start: 'text-emerald-400',
  stop: 'text-red-400',
  restart: 'text-blue-400',
  die: 'text-red-400',
  create: 'text-cyan-400',
  destroy: 'text-white/40',
};

export default function ContainersPage() {
  const { containers, events, loading, refetch } = useDockerEvents();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter containers based on status and search query
  const filteredContainers = useMemo(() => {
    return containers.filter((container) => {
      // Status filter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'running' && container.state === 'running') ||
        (statusFilter === 'stopped' && container.state === 'exited') ||
        (statusFilter === 'error' && container.state === 'dead');

      // Search filter
      const matchesSearch =
        !searchQuery ||
        container.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.image.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [containers, statusFilter, searchQuery]);

  const totalContainers = containers.length;
  const runningContainers = containers.filter((c) => c.state === 'running').length;
  const stoppedContainers = containers.filter((c) => c.state === 'exited').length;
  const errorContainers = containers.filter((c) => c.state === 'dead').length;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetch]);

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as StatusFilter);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 header-blur border-b border-white/5 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Containers</h1>
            <p className="text-sm text-white/40">Docker container management</p>
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
                <Box className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-3xl font-bold">{totalContainers}</div>
                <div className="text-sm text-white/40">Total Containers</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Play className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-3xl font-bold text-emerald-400">{runningContainers}</div>
                <div className="text-sm text-white/40">Running</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <Square className="w-6 h-6 text-white/40" />
              </div>
              <div>
                <div className="text-3xl font-bold text-white/60">{stoppedContainers}</div>
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
                <div className="text-3xl font-bold text-red-400">{errorContainers}</div>
                <div className="text-sm text-white/40">Error</div>
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
              placeholder="Search containers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="error">Error</option>
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

        {/* Container Display */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-white/40">Loading containers...</div>
          ) : filteredContainers.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              {containers.length === 0
                ? 'No containers found. Docker may not be connected.'
                : 'No containers match your filters.'}
            </div>
          ) : viewMode === 'list' ? (
            /* List View (Table) */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      <input type="checkbox" className="rounded bg-white/5 border-white/10" />
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Container
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Ports
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                      Uptime
                    </th>
                    {isAdmin && (
                      <th className="text-right py-4 px-6 text-xs font-medium uppercase tracking-wide text-white/40">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredContainers.map((container) => (
                    <tr
                      key={container.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <input type="checkbox" className="rounded bg-white/5 border-white/10" />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center',
                              container.state === 'running' ? 'bg-emerald-500/10' : 'bg-white/5'
                            )}
                          >
                            <Box
                              className={cn(
                                'w-5 h-5',
                                container.state === 'running' ? 'text-emerald-400' : 'text-white/30'
                              )}
                            />
                          </div>
                          <div>
                            <div className="font-medium">{container.name}</div>
                            <div className="text-xs text-white/40 font-mono">{container.image}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full border',
                            stateColors[container.state] || stateColors.exited
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              container.state === 'running'
                                ? 'bg-emerald-400'
                                : container.state === 'dead'
                                  ? 'bg-red-400'
                                  : 'bg-white/40'
                            )}
                          />
                          {container.state.charAt(0).toUpperCase() + container.state.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-white/60">
                          {container.ports
                            .filter((p) => p.public)
                            .map((p) => `${p.public}:${p.private}`)
                            .join(', ') || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-white/60">
                          {container.state === 'running'
                            ? getContainerUptime(container.startedAt)
                            : '—'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {container.state === 'running' ? (
                              <button
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400"
                                title="Stop"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-emerald-400"
                                title="Start"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                              title="Restart"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                              title="More"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredContainers.map((container) => (
                <div
                  key={container.id}
                  className={cn(
                    'p-4 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer',
                    container.state !== 'running' && 'opacity-60'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        container.state === 'running' ? 'bg-emerald-500/10' : 'bg-white/5'
                      )}
                    >
                      <Box
                        className={cn(
                          'w-5 h-5',
                          container.state === 'running' ? 'text-emerald-400' : 'text-white/30'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{container.name}</div>
                      <div className="text-xs text-white/40 font-mono truncate">{container.image}</div>
                    </div>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        container.state === 'running'
                          ? 'bg-emerald-500 status-running'
                          : container.state === 'dead'
                            ? 'bg-red-500'
                            : 'bg-white/30'
                      )}
                    />
                  </div>
                  {/* Uptime for running containers */}
                  {container.state === 'running' && container.startedAt && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-white/50">
                      <Timer className="w-3.5 h-3.5" />
                      <span className="font-mono">{getContainerUptime(container.startedAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border',
                        stateColors[container.state] || stateColors.exited
                      )}
                    >
                      {container.state.charAt(0).toUpperCase() + container.state.slice(1)}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        {container.state === 'running' ? (
                          <button
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-red-400"
                            title="Stop"
                          >
                            <Square className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-emerald-400"
                            title="Start"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-blue-400"
                          title="Restart"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredContainers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
              <div className="text-sm text-white/40">
                Showing {filteredContainers.length} of {containers.length} containers
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  Previous
                </button>
                <button className="px-3 py-1 text-sm bg-violet-500/20 text-violet-400 rounded-lg">1</button>
                <button className="px-3 py-1 text-sm text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
          {events.length === 0 ? (
            <div className="text-center py-8 text-white/40">No recent events</div>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 10).map((event, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-3 px-4 bg-white/5 rounded-xl border border-white/5"
                >
                  <span
                    className={cn(
                      'inline-flex px-2 py-0.5 text-xs font-medium rounded',
                      actionColors[event.action] || 'text-white/40'
                    )}
                  >
                    {event.action}
                  </span>
                  <span className="font-mono text-sm">{event.containerName}</span>
                  <span className="text-white/40 ml-auto text-xs">{formatTime(event.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
