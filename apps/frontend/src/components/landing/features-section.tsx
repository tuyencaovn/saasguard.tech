import { RefreshCw, HardDrive, ShieldCheck, Activity, Bell, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: RefreshCw,
    color: 'violet',
    title: 'Crash-Loop Detection',
    description: 'Detects when your app restarts repeatedly and alerts you immediately. No more silent failures.',
    size: 'wide',
  },
  {
    icon: HardDrive,
    color: 'amber',
    title: 'Disk Risk Monitoring',
    description: 'Predicts disk full events before they happen. Get warned at 80%, alerted at 90%.',
    size: 'normal',
  },
  {
    icon: ShieldCheck,
    color: 'cyan',
    title: 'SSL Expiry Monitor',
    description: 'Tracks all your SSL certificates and warns you 30, 14, and 7 days before expiry.',
    size: 'normal',
  },
  {
    icon: Activity,
    color: 'emerald',
    title: 'Health Score',
    description: 'A single 0-100 score combining CPU, RAM, disk, and service health. Instant clarity.',
    size: 'normal',
  },
  {
    icon: Bell,
    color: 'indigo',
    title: 'Email Alerts',
    description: 'Instant email notifications when anything goes wrong on your server.',
    size: 'normal',
  },
  {
    icon: Send,
    color: 'sky',
    title: 'Telegram Alerts',
    description: 'Get alerts in your Telegram chat for real-time notifications wherever you are.',
    size: 'wide',
  },
];

const colorMap: Record<string, { bg: string; icon: string; glow: string }> = {
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  glow: 'group-hover:shadow-violet-500/10' },
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   glow: 'group-hover:shadow-amber-500/10' },
  cyan:    { bg: 'bg-cyan-500/10',     icon: 'text-cyan-400',    glow: 'group-hover:shadow-cyan-500/10' },
  emerald: { bg: 'bg-emerald-500/10',  icon: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/10' },
  indigo:  { bg: 'bg-indigo-500/10',   icon: 'text-indigo-400',  glow: 'group-hover:shadow-indigo-500/10' },
  sky:     { bg: 'bg-sky-500/10',      icon: 'text-sky-400',     glow: 'group-hover:shadow-sky-500/10' },
};

export function FeaturesSection() {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-white/[0.01]" />
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="reveal-up text-sm font-medium text-cyan-400/80 uppercase tracking-widest mb-4">
            Full coverage
          </p>
          <h2 className="reveal-up reveal-delay-1 text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Everything your VPS needs watching
          </h2>
          <p className="reveal-up reveal-delay-2 text-white/40 text-lg max-w-xl mx-auto">
            One agent, one dashboard, zero blind spots.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;
            const isWide = feature.size === 'wide';
            return (
              <div
                key={feature.title}
                className={cn(
                  `reveal-up reveal-delay-${Math.min(i + 1, 5)}`,
                  'group gradient-border rounded-2xl p-6 flex flex-col gap-4 transition-all duration-300',
                  'hover:shadow-2xl',
                  colors.glow,
                  isWide && 'sm:col-span-2'
                )}
              >
                <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
