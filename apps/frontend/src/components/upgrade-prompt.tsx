'use client';

import Link from 'next/link';
import { Zap, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PRO_PRICE, PRO_STRIPE_LINK } from '@/lib/tier-limits';

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: 'banner' | 'inline' | 'badge';
  className?: string;
  dismissible?: boolean;
}

export function UpgradePrompt({
  feature,
  description,
  variant = 'inline',
  className,
  dismissible = false,
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (variant === 'badge') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        'bg-violet-500/15 border border-violet-500/25 text-violet-400',
        className
      )}>
        <Zap className="w-3 h-3" />
        Pro
      </span>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-xl',
        'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20',
        className
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {feature} is a Pro feature
            </p>
            {description && (
              <p className="text-xs text-white/40 truncate">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={PRO_STRIPE_LINK}
            className="text-xs px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all"
          >
            Upgrade — ${PRO_PRICE}/mo
          </Link>
          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // inline variant
  return (
    <div className={cn(
      'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl',
      'bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20',
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="font-semibold text-white">{feature}</p>
          <p className="text-sm text-white/50">
            {description || `Upgrade to Pro to unlock ${feature}.`}
          </p>
        </div>
      </div>
      <Link
        href={PRO_STRIPE_LINK}
        className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
      >
        Upgrade to Pro — ${PRO_PRICE}/mo
      </Link>
    </div>
  );
}
