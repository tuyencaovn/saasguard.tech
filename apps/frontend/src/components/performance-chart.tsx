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
  time: string;
  cpu: number;
  ram: number;
  disk: number;
}

interface PerformanceChartProps {
  data: MetricsDataPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  // Calculate tick interval to show max 6 labels on X-axis
  const tickInterval = useMemo(() => {
    if (data.length <= 6) return 0;
    return Math.ceil(data.length / 6);
  }, [data]);

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
            dataKey="time"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
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
