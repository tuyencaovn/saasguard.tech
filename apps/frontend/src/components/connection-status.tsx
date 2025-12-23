'use client';

import { useConnectionStatus } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const connected = useConnectionStatus();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
        connected
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-red-500/10 border-red-500/20'
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          connected ? 'bg-emerald-500 live-indicator status-running' : 'bg-red-500'
        )}
      />
      <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
        {connected ? 'Live' : 'Disconnected'}
      </span>
    </div>
  );
}
