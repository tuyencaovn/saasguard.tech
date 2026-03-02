'use client';

import { RefreshCw } from 'lucide-react';

interface CrashIndicatorProps {
  restartCount: number;
  inCrashLoop: boolean;
}

export function CrashIndicator({ restartCount, inCrashLoop }: CrashIndicatorProps) {
  if (restartCount === 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
        inCrashLoop
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      }`}
      title={
        inCrashLoop
          ? `Crash loop: ${restartCount} restarts recently`
          : `${restartCount} recent restart(s)`
      }
    >
      <RefreshCw className={`w-3 h-3 ${inCrashLoop ? 'animate-spin' : ''}`} />
      {restartCount}
    </span>
  );
}
