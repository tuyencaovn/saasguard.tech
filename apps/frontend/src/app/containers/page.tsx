'use client';

import { useDockerEvents } from '@/hooks/use-socket';
import { ConnectionStatus } from '@/components/connection-status';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatTime } from '@/lib/utils';
import { Box, Play, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const stateColors: Record<string, string> = {
  running: 'bg-green-500/10 text-green-500 border-green-500/20',
  exited: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  restarting: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  created: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  dead: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const actionColors: Record<string, string> = {
  start: 'text-green-500',
  stop: 'text-red-500',
  restart: 'text-blue-500',
  die: 'text-red-500',
  create: 'text-cyan-500',
  destroy: 'text-zinc-500',
};

export default function ContainersPage() {
  const { containers, events, loading } = useDockerEvents();

  return (
    <div className="min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Containers</h1>
            <p className="text-sm text-zinc-500">Docker container management</p>
          </div>
          <ConnectionStatus />
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Container List */}
        <Card>
          <CardHeader>
            <CardTitle>All Containers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading containers...</div>
            ) : containers.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No containers found. Docker may not be connected.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Image
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Ports
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {containers.map((container) => (
                      <tr
                        key={container.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/20"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                container.state === 'running' ? 'bg-green-500/10' : 'bg-zinc-500/10'
                              )}
                            >
                              <Box
                                className={cn(
                                  'w-4 h-4',
                                  container.state === 'running' ? 'text-green-500' : 'text-zinc-500'
                                )}
                              />
                            </div>
                            <div>
                              <div className="font-medium">{container.name}</div>
                              <div className="text-xs text-zinc-500 font-mono">{container.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-mono text-zinc-300">{container.image}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded border',
                              stateColors[container.state] || stateColors.exited
                            )}
                          >
                            {container.state}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-mono text-zinc-400">
                            {container.ports
                              .filter((p) => p.public)
                              .map((p) => `${p.public}:${p.private}`)
                              .join(', ') || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {container.state === 'running' ? (
                              <button
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
                                title="Stop"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-green-500"
                                title="Start"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-blue-500"
                              title="Restart"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">No recent events</div>
            ) : (
              <ul className="space-y-2">
                {events.slice(0, 10).map((event, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 py-2 px-3 bg-zinc-950 rounded-lg border border-zinc-800"
                  >
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 text-xs font-medium rounded',
                        actionColors[event.action] || 'text-zinc-400'
                      )}
                    >
                      {event.action}
                    </span>
                    <span className="font-mono text-sm">{event.containerName}</span>
                    <span className="text-zinc-500 ml-auto text-xs">
                      {formatTime(event.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
