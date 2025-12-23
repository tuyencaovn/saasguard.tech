'use client';

import { useConnectionStatus } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';

export function ConnectionStatus() {
  const connected = useConnectionStatus();

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="relative flex h-2 w-2">
        {connected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span
          className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            connected ? 'bg-green-500' : 'bg-red-500'
          )}
        />
      </span>
      {connected ? 'Live' : 'Disconnected'}
    </div>
  );
}
