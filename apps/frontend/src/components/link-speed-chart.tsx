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

interface LinkSpeedDataPoint {
  timestamp: number;
  speed: number; // Mbps
}

type TimeRange = '15m' | '1h' | '6h' | '24h';

const TIME_RANGE_MINUTES: Record<TimeRange, number> = {
  '15m': 15,
  '1h': 60,
  '6h': 360,
  '24h': 1440,
};

const TICK_INTERVALS: Record<TimeRange, number> = {
  '15m': 5,
  '1h': 15,
  '6h': 90,
  '24h': 360,
};

interface LinkSpeedChartProps {
  data: LinkSpeedDataPoint[];
  timeRange: TimeRange;
  interfaceName?: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatSpeed(speed: number): string {
  if (speed >= 1000) {
    return `${(speed / 1000).toFixed(1)} Gbps`;
  }
  return `${speed.toFixed(1)} Mbps`;
}

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

export function LinkSpeedChart({ data, timeRange, interfaceName = 'eth0' }: LinkSpeedChartProps) {
  const { chartData, ticks, domain, maxValue, minSpeed, maxSpeed, avgSpeed } = useMemo(() => {
    const tickValues = generateTicks(timeRange);
    const rangeMs = TIME_RANGE_MINUTES[timeRange] * 60 * 1000;

    const latestTimestamp = data.length > 0 ? Math.max(...data.map((d) => d.timestamp)) : Date.now();
    const domainEnd = Math.max(latestTimestamp, Date.now());
    const domainStart = domainEnd - rangeMs;

    // Calculate stats
    const speeds = data.map((d) => d.speed).filter((s) => s > 0);
    const min = speeds.length > 0 ? Math.min(...speeds) : 0;
    const max = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avg = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    // Y-axis should accommodate the max speed with some padding
    const yMax = Math.max(max * 1.1, 100);

    return {
      chartData: data,
      ticks: tickValues,
      domain: [domainStart, domainEnd] as [number, number],
      maxValue: yMax,
      minSpeed: min,
      maxSpeed: max,
      avgSpeed: avg,
    };
  }, [timeRange, data]);

  // No data or all speeds are 0 (not detected)
  const hasValidData = data.length > 0 && data.some(d => d.speed > 0);

  if (data.length === 0) {
    return (
      <div className="h-48 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center">
        <span className="text-zinc-600 text-sm">Collecting link speed data...</span>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className="h-48 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-center flex-col gap-2">
        <span className="text-zinc-500 text-sm">Link speed not available</span>
        <span className="text-zinc-600 text-xs">Interface may not report negotiated speed</span>
      </div>
    );
  }

  return (
    <div>
      {/* Speed stats */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-white/40">Current:</span>
          <span className="text-violet-400 font-mono">{formatSpeed(data[data.length - 1]?.speed || 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40">Min:</span>
          <span className="text-amber-400 font-mono">{formatSpeed(minSpeed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40">Max:</span>
          <span className="text-emerald-400 font-mono">{formatSpeed(maxSpeed)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40">Avg:</span>
          <span className="text-cyan-400 font-mono">{formatSpeed(avgSpeed)}</span>
        </div>
        <div className="text-white/30 text-xs">
          {interfaceName}
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
              tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) : value.toFixed(0)}`}
              unit={maxValue >= 1000 ? ' Gbps' : ' Mbps'}
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
              formatter={(value: number) => [formatSpeed(value), 'Link Speed']}
            />
            <Area
              type="monotone"
              dataKey="speed"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#speedGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
