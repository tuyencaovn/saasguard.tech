'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MetricsDataPoint {
  timestamp: number;
  cpu: number;
  ram: number;
  disk: number;
}

type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | '90d' | '1y';

const DAILY_RANGES: TimeRange[] = ['7d', '30d', '90d', '1y'];
const DAY = 1440;

// Minutes for each time range
const TIME_RANGE_MINUTES: Record<TimeRange, number> = {
  '15m': 15,
  '1h': 60,
  '6h': 360,
  '24h': 1440,
  '7d': 7 * DAY,
  '30d': 30 * DAY,
  '90d': 90 * DAY,
  '1y': 365 * DAY,
};

// Tick interval in minutes for each time range (to get ~4-6 ticks)
const TICK_INTERVALS: Record<TimeRange, number> = {
  '15m': 5, // 5 min intervals
  '1h': 15, // 15 min intervals
  '6h': 90, // 1.5h intervals
  '24h': 360, // 6h intervals
  '7d': 1 * DAY, // daily
  '30d': 7 * DAY, // weekly
  '90d': 15 * DAY,
  '1y': 30 * DAY, // monthly
};

interface PerformanceChartProps {
  data: MetricsDataPoint[];
  timeRange: TimeRange;
}

// Format timestamp: HH:MM for intraday ranges, date for daily ranges
function formatTime(timestamp: number, timeRange: TimeRange): string {
  if (DAILY_RANGES.includes(timeRange)) {
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Generate fixed tick values based on current time and time range
function generateTicks(timeRange: TimeRange): number[] {
  const now = Date.now();
  const intervalMs = TICK_INTERVALS[timeRange] * 60 * 1000;
  const rangeMs = TIME_RANGE_MINUTES[timeRange] * 60 * 1000;

  // Round current time down to nearest interval
  const roundedNow = Math.floor(now / intervalMs) * intervalMs;

  // Generate ticks from (now - range) to now
  const ticks: number[] = [];
  const startTime = now - rangeMs;

  for (let t = roundedNow; t >= startTime; t -= intervalMs) {
    ticks.unshift(t);
  }

  // Add next upcoming tick
  ticks.push(roundedNow + intervalMs);

  return ticks;
}

export function PerformanceChart({ data, timeRange }: PerformanceChartProps) {
  const { ticks, domain } = useMemo(() => {
    const tickValues = generateTicks(timeRange);
    const rangeMs = TIME_RANGE_MINUTES[timeRange] * 60 * 1000;

    // Use latest data timestamp or current time for domain end
    const latestTimestamp = data.length > 0 ? Math.max(...data.map((d) => d.timestamp)) : Date.now();
    const domainEnd = Math.max(latestTimestamp, Date.now());
    const domainStart = domainEnd - rangeMs;

    return {
      ticks: tickValues,
      domain: [domainStart, domainEnd] as [number, number],
    };
  }, [timeRange, data]);

  if (data.length === 0) {
    return (
      <div className="h-64 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center">
        <span className="text-zinc-600 text-sm">Collecting metrics data...</span>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={domain}
            ticks={ticks}
            tickFormatter={(value) => formatTime(value, timeRange)}
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
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            labelFormatter={(value) => formatTime(value as number, timeRange)}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name.toUpperCase(),
            ]}
          />
          <Line
            type="monotone"
            dataKey="cpu"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#8b5cf6' }}
          />
          <Line
            type="monotone"
            dataKey="ram"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#06b6d4' }}
          />
          <Line
            type="monotone"
            dataKey="disk"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
