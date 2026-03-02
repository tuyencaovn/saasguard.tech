'use client';

import { cn } from '@/lib/utils';
import type { HealthScore } from '@/types/metrics';
import { ShieldCheck, Cpu, Server, HardDrive, Box, Lock } from 'lucide-react';

interface HealthScoreCardProps {
  healthScore: HealthScore;
}

const STATUS_CONFIG = {
  good: {
    label: 'All Good',
    color: 'text-emerald-400',
    ring: 'stroke-emerald-500',
    glow: 'shadow-emerald-500/20',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'Needs Attention',
    color: 'text-amber-400',
    ring: 'stroke-amber-500',
    glow: 'shadow-amber-500/20',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  critical: {
    label: 'Critical',
    color: 'text-red-400',
    ring: 'stroke-red-500',
    glow: 'shadow-red-500/20',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
  },
};

const FACTOR_CONFIG = [
  { key: 'cpu' as const, label: 'Processing Power', icon: Cpu },
  { key: 'ram' as const, label: 'Memory', icon: Server },
  { key: 'disk' as const, label: 'Storage Space', icon: HardDrive },
  { key: 'containers' as const, label: 'Services', icon: Box },
  { key: 'ssl' as const, label: 'SSL Certs', icon: Lock },
];

function getFactorStatus(score: number): 'good' | 'warning' | 'critical' {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

export function HealthScoreCard({ healthScore }: HealthScoreCardProps) {
  const { score, status, factors } = healthScore;
  const cfg = STATUS_CONFIG[status];

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn('glass-card rounded-2xl p-6 mb-8', `shadow-lg ${cfg.glow}`)}>
      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
        {/* Score Gauge */}
        <div className="relative w-40 h-40 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" strokeWidth="8" className="stroke-white/5 fill-none" />
            <circle
              cx="60"
              cy="60"
              r="54"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={cn('fill-none transition-all duration-700', cfg.ring)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-mono text-4xl font-bold', cfg.color)}>{score}</span>
            <span className="text-xs text-white/40 mt-1">/ 100</span>
          </div>
        </div>

        {/* Status + Factors */}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cfg.bg, 'border', cfg.border)}>
              <ShieldCheck className={cn('w-5 h-5', cfg.color)} />
            </div>
            <div>
              <div className="text-xs text-white/40 font-medium uppercase tracking-wider">Server Health</div>
              <div className={cn('text-xl font-bold', cfg.color)}>{cfg.label}</div>
            </div>
            <span className={cn('ml-auto w-3 h-3 rounded-full animate-pulse', cfg.dot)} />
          </div>

          {/* Factor Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {FACTOR_CONFIG.map(({ key, label, icon: Icon }) => {
              const factorScore = factors[key];
              const factorStatus = getFactorStatus(factorScore);
              const factorCfg = STATUS_CONFIG[factorStatus];
              return (
                <div
                  key={key}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border',
                    factorCfg.bg,
                    factorCfg.border,
                  )}
                >
                  <Icon className={cn('w-4 h-4', factorCfg.color)} />
                  <span className={cn('text-sm font-bold font-mono', factorCfg.color)}>
                    {factorScore}
                  </span>
                  <span className="text-xs text-white/40 text-center leading-tight">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
