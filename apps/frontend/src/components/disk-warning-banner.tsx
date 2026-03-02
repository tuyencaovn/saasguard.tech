'use client';

import { useState } from 'react';
import { X, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DiskWarningBannerProps {
  diskPercent: number;
}

export function DiskWarningBanner({ diskPercent }: DiskWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || diskPercent < 80) return null;

  const isCritical = diskPercent >= 90;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3 mb-6 border',
        isCritical
          ? 'bg-red-500/10 border-red-500/30 text-red-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      )}
    >
      <HardDrive className="w-5 h-5 shrink-0" />

      <div className="flex-1 min-w-0">
        <span className="font-semibold">
          {isCritical ? 'Disk Critical' : 'Disk Almost Full'}
          {' '}
          &mdash;{' '}
          {diskPercent.toFixed(0)}% used.
        </span>{' '}
        <span className="text-sm opacity-80">
          {isCritical
            ? 'Your database may stop writing soon. Free up space or expand storage now.'
            : 'Consider cleaning up old logs or expanding storage.'}
        </span>{' '}
        <Link
          href="/alerts"
          className="text-sm underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
        >
          Configure alerts
        </Link>
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss disk warning"
        className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
