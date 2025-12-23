'use client';

import { cn } from '@/lib/utils';

interface MetricGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  subtitle?: string;
  thresholds?: { warning: number; critical: number };
  color?: 'violet' | 'cyan' | 'amber' | 'green';
}

const colorClasses = {
  violet: 'stroke-violet-500',
  cyan: 'stroke-cyan-500',
  amber: 'stroke-amber-500',
  green: 'stroke-green-500',
};

const textColorClasses = {
  violet: 'text-violet-500',
  cyan: 'text-cyan-500',
  amber: 'text-amber-500',
  green: 'text-green-500',
};

export function MetricGauge({
  label,
  value,
  max = 100,
  unit = '%',
  subtitle,
  thresholds,
  color = 'violet',
}: MetricGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on thresholds
  let statusColor = color;
  let statusDot = 'bg-green-500';

  if (thresholds) {
    if (percentage >= thresholds.critical) {
      statusColor = 'amber';
      statusDot = 'bg-red-500';
    } else if (percentage >= thresholds.warning) {
      statusColor = 'amber';
      statusDot = 'bg-amber-500';
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <span className={cn('w-2 h-2 rounded-full', statusDot)} />
      </div>

      {/* Circular Gauge */}
      <div className="relative w-28 h-28 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle cx="50" cy="50" r="40" strokeWidth="8" className="stroke-zinc-800 fill-none" />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('fill-none transition-all duration-500', colorClasses[statusColor])}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-mono text-2xl font-semibold',
              thresholds && percentage >= thresholds.warning && textColorClasses[statusColor]
            )}
          >
            {value.toFixed(1)}
            {unit}
          </span>
        </div>
      </div>

      {subtitle && (
        <div className="text-center">
          <div className="text-xs text-zinc-500">{subtitle}</div>
        </div>
      )}
    </div>
  );
}
