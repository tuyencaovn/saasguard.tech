import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted?: boolean;
  badge?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  ctaHref,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300',
        highlighted
          ? 'bg-gradient-to-b from-violet-500/10 via-indigo-500/5 to-transparent border border-violet-500/30 shadow-2xl shadow-violet-500/10 hover:shadow-violet-500/20 hover:-translate-y-1'
          : 'gradient-border hover:shadow-2xl'
      )}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg shadow-violet-500/25">
          {badge}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
        <p className="text-white/40 text-sm">{description}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn(
          'text-5xl font-bold tracking-tight',
          highlighted
            ? 'text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-indigo-300'
            : 'text-white'
        )}>
          {price}
        </span>
        {period && <span className="text-white/30 text-sm">/{period}</span>}
      </div>

      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <ul className="flex flex-col gap-3 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className={cn(
              'w-4 h-4 mt-0.5 shrink-0',
              highlighted ? 'text-violet-400' : 'text-emerald-400/70'
            )} />
            <span className="text-white/60">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          'text-center px-6 py-3.5 rounded-xl font-semibold transition-all duration-300',
          highlighted
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5'
            : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white'
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
