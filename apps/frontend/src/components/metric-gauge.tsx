'use client';

import { cn } from '@/lib/utils';
import { Cpu, Server, HardDrive, Wifi } from 'lucide-react';

interface MetricGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  subtitle?: string;
  thresholds?: { warning: number; critical: number };
  color?: 'violet' | 'cyan' | 'amber' | 'emerald';
}

const colorConfig = {
  violet: {
    stroke: 'stroke-violet-500',
    text: 'text-violet-500',
    bg: 'bg-violet-500/20',
    iconText: 'text-violet-400',
    glow: 'gauge-glow-violet',
    metricClass: 'metric-cpu',
    icon: Cpu,
  },
  cyan: {
    stroke: 'stroke-cyan-500',
    text: 'text-cyan-500',
    bg: 'bg-cyan-500/20',
    iconText: 'text-cyan-400',
    glow: 'gauge-glow-cyan',
    metricClass: 'metric-ram',
    icon: Server,
  },
  amber: {
    stroke: 'stroke-amber-500',
    text: 'text-amber-500',
    bg: 'bg-amber-500/20',
    iconText: 'text-amber-400',
    glow: 'gauge-glow-amber',
    metricClass: 'metric-disk',
    icon: HardDrive,
  },
  emerald: {
    stroke: 'stroke-emerald-500',
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/20',
    iconText: 'text-emerald-400',
    glow: 'gauge-glow-violet',
    metricClass: 'metric-network',
    icon: Wifi,
  },
};

export function MetricGauge({
  label,
  value,
  max = 100,
  unit: _unit = '%',
  subtitle,
  thresholds,
  color = 'violet',
}: MetricGaugeProps) {
  void _unit; // Unused but kept for future use
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 42; // radius = 42
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine status color based on thresholds
  let statusDot = 'bg-emerald-500 status-running';
  let isWarning = false;

  if (thresholds) {
    if (percentage >= thresholds.critical) {
      statusDot = 'bg-red-500 status-error';
      isWarning = true;
    } else if (percentage >= thresholds.warning) {
      statusDot = 'bg-amber-500 status-warning';
      isWarning = true;
    }
  }

  const config = colorConfig[color];
  const Icon = config.icon;

  return (
    <div className={cn('glass-card rounded-2xl p-6', config.metricClass)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
            <Icon className={cn('w-5 h-5', config.iconText)} />
          </div>
          <span className="text-sm font-medium text-white/60">{label}</span>
        </div>
        <span className={cn('w-2 h-2 rounded-full', statusDot)} />
      </div>

      {/* Premium Circular Gauge */}
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background ring */}
          <circle cx="50" cy="50" r="42" strokeWidth="6" className="stroke-white/5 fill-none" />
          {/* Progress ring with glow */}
          <circle
            cx="50"
            cy="50"
            r="42"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn('fill-none gauge-progress', config.stroke, config.glow)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-mono text-3xl font-bold counter-value',
              isWarning && config.text
            )}
          >
            {value.toFixed(1)}
          </span>
          <span className="text-xs text-white/40">percent</span>
        </div>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-center">
          <p className="text-xs text-white/40">{subtitle}</p>
        </div>
      )}
    </div>
  );
}
