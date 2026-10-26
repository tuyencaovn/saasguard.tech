import { cn } from '@/lib/utils';

type UptimeStatus = 'unknown' | 'up' | 'down';

interface UptimeStatusBadgeProps {
  status: UptimeStatus;
  className?: string;
}

const statusConfig: Record<UptimeStatus, { label: string; className: string; dot: string }> = {
  up: {
    label: 'Up',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  down: {
    label: 'Down',
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
    dot: 'bg-red-400 animate-pulse',
  },
  unknown: {
    label: 'Checking',
    className: 'bg-white/5 text-white/40 border border-white/10',
    dot: 'bg-white/30',
  },
};

export function UptimeStatusBadge({ status, className }: UptimeStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
