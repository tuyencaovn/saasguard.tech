'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConnectionStatus } from '@/components/connection-status';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface AlertThreshold {
  id: number;
  metricName: string;
  operator: string;
  value: number;
  enabled: boolean;
  channels: string[];
  cooldownMinutes: number;
}

export default function AlertsPage() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const res = await fetch(`${API_URL}/alerts/thresholds`);
      const data = await res.json();
      setThresholds(data);
    } catch (error) {
      console.error('Failed to fetch thresholds:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (id: number, enabled: boolean) => {
    try {
      await fetch(`${API_URL}/alerts/thresholds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      fetchThresholds();
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Top Header */}
      <header className="sticky top-0 z-10 bg-[#0a0a0b]/80 backdrop-blur-md border-b border-zinc-800 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Alerts</h1>
            <p className="text-sm text-zinc-500">Configure alert thresholds and notifications</p>
          </div>
          <div className="flex items-center gap-4">
            <ConnectionStatus />
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              Add Threshold
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-6">
        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-zinc-500">Loading thresholds...</div>
            ) : thresholds.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-500 mb-4">No alert thresholds configured</p>
                <button className="flex items-center gap-2 px-4 py-2 mx-auto bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  Create your first threshold
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Metric
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Condition
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Channels
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Cooldown
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Enabled
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {thresholds.map((threshold) => (
                      <tr
                        key={threshold.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/20"
                      >
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded',
                              threshold.metricName === 'cpu'
                                ? 'bg-violet-500/10 text-violet-500'
                                : threshold.metricName === 'ram'
                                  ? 'bg-cyan-500/10 text-cyan-500'
                                  : 'bg-amber-500/10 text-amber-500'
                            )}
                          >
                            {threshold.metricName.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-mono">
                            {threshold.operator} {threshold.value}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            {threshold.channels.map((channel) => (
                              <span
                                key={channel}
                                className="inline-flex px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300"
                              >
                                {channel}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-zinc-400">
                            {threshold.cooldownMinutes} min
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => toggleEnabled(threshold.id, threshold.enabled)}
                            className={cn(
                              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                              threshold.enabled ? 'bg-green-600' : 'bg-zinc-700'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                                threshold.enabled ? 'translate-x-6' : 'translate-x-1'
                              )}
                            />
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-zinc-50"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Alert History Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-zinc-500">
              No alerts triggered recently
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
