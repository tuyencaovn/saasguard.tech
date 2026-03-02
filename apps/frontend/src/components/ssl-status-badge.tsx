import { cn } from '@/lib/utils';

type SslStatus = 'unknown' | 'valid' | 'warning' | 'critical' | 'expired' | 'error';

interface SslStatusBadgeProps {
  status: SslStatus;
  daysUntilExpiry?: number | null;
  className?: string;
}

const statusConfig: Record<SslStatus, { label: string; className: string; dot: string }> = {
  valid: {
    label: 'Valid',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  warning: {
    label: 'Expiring Soon',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dot: 'bg-amber-400',
  },
  critical: {
    label: 'Critical',
    className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    dot: 'bg-orange-400 animate-pulse',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
    dot: 'bg-red-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
    dot: 'bg-red-400',
  },
  unknown: {
    label: 'Unknown',
    className: 'bg-white/5 text-white/40 border border-white/10',
    dot: 'bg-white/30',
  },
};

export function SslStatusBadge({ status, daysUntilExpiry, className }: SslStatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.unknown;
  const label = status === 'valid' && daysUntilExpiry !== null && daysUntilExpiry !== undefined
    ? `Valid (${daysUntilExpiry}d)`
    : config.label;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {label}
    </span>
  );
}
