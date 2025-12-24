'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface NetworkDataPoint {
  timestamp: number;
  rx: number; // bytes per second
  tx: number; // bytes per second
}

type TimeRange = '15m' | '1h' | '6h' | '24h';

// Minutes for each time range
const TIME_RANGE_MINUTES: Record<TimeRange, number> = {
  '15m': 15,
  '1h': 60,
  '6h': 360,
  '24h': 1440,
};

// Tick interval in minutes for each time range
const TICK_INTERVALS: Record<TimeRange, number> = {
  '15m': 5,
  '1h': 15,
  '6h': 90,
  '24h': 360,
};

interface NetworkChartProps {
  data: NetworkDataPoint[];
  timeRange: TimeRange;
}

// Format timestamp to HH:MM
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Format bytes per second to human readable format
function formatBytesPerSec(bytes: number): string {
  if (bytes < 1024) return `${bytes} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
}

// Generate fixed tick values based on current time and time range
function generateTicks(timeRange: TimeRange): number[] {
  const now = Date.now();
  const intervalMs = TICK_INTERVALS[timeRange] * 60 * 1000;
  const rangeMs = TIME_RANGE_MINUTES[timeRange] * 60 * 1000;

  const roundedNow = Math.floor(now / intervalMs) * intervalMs;
  const ticks: number[] = [];
  const startTime = now - rangeMs;

  for (let t = roundedNow; t >= startTime; t -= intervalMs) {
    ticks.unshift(t);
  }
  ticks.push(roundedNow + intervalMs);

  return ticks;
}

export function NetworkChart({ data, timeRange }: NetworkChartProps) {
  const { ticks, domain, maxValue } = useMemo(() => {
    const tickValues = generateTicks(timeRange);
    const rangeMs = TIME_RANGE_MINUTES[timeRange] * 60 * 1000;

    const latestTimestamp = data.length > 0 ? Math.max(...data.map((d) => d.timestamp)) : Date.now();
    const domainEnd = Math.max(latestTimestamp, Date.now());
    const domainStart = domainEnd - rangeMs;

    // Calculate max value for Y axis
    const allValues = data.flatMap((d) => [d.rx, d.tx]);
    const max = allValues.length > 0 ? Math.max(...allValues) : 1024 * 1024; // Default 1 MB/s

    return {
      ticks: tickValues,
      domain: [domainStart, domainEnd] as [number, number],
      maxValue: Math.max(max * 1.2, 1024), // Add 20% padding, min 1 KB/s
    };
  }, [timeRange, data]);

  if (data.length === 0) {
    return (
      <div className="h-48 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center">
        <span className="text-zinc-600 text-sm">Collecting network data...</span>
      </div>
    );
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={domain}
            ticks={ticks}
            tickFormatter={formatTime}
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, maxValue]}
            tickFormatter={(value) => {
              if (value < 1024) return `${value}B`;
              if (value < 1024 * 1024) return `${Math.round(value / 1024)}K`;
              return `${(value / (1024 * 1024)).toFixed(1)}M`;
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            labelFormatter={(value) => formatTime(value as number)}
            formatter={(value: number, name: string) => [
              formatBytesPerSec(value),
              name === 'rx' ? 'Download' : 'Upload',
            ]}
          />
          <Area
            type="monotone"
            dataKey="rx"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#rxGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          <Area
            type="monotone"
            dataKey="tx"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#txGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
