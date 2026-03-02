import { RefreshCw, HardDrive, ShieldAlert } from 'lucide-react';

const painPoints = [
  {
    icon: RefreshCw,
    color: 'red',
    title: 'Crash Loops',
    description: 'Your app restarts in a loop and nobody knows. Users get errors while you sleep.',
    stat: 'Avg. 47 min to notice',
  },
  {
    icon: HardDrive,
    color: 'amber',
    title: 'Disk Fills Up',
    description: 'Your database stops writing because disk is full. Data loss, downtime, angry users.',
    stat: 'Happens without warning',
  },
  {
    icon: ShieldAlert,
    color: 'orange',
    title: 'SSL Expires',
    description: 'Your site shows a scary security warning. Users leave. Renewals get forgotten.',
    stat: 'Google deranks HTTPS errors',
  },
];

const colorMap = {
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
    glow: 'rgba(239,68,68,0.08)',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    glow: 'rgba(245,158,11,0.08)',
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    icon: 'text-orange-400',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    glow: 'rgba(249,115,22,0.08)',
  },
};

export function PainPointsSection() {
  return (
    <section className="py-28 px-4 relative">
      {/* Subtle top divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="reveal-up text-sm font-medium text-red-400/80 uppercase tracking-widest mb-4">
            The silent killers
          </p>
          <h2 className="reveal-up reveal-delay-1 text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Failures that kill SaaS businesses
          </h2>
          <p className="reveal-up reveal-delay-2 text-white/40 text-lg max-w-xl mx-auto">
            These problems don&apos;t announce themselves. They happen quietly, while you&apos;re busy building.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {painPoints.map((point, i) => {
            const colors = colorMap[point.color as keyof typeof colorMap];
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className={`reveal-up reveal-delay-${i + 1} gradient-border rounded-2xl p-7 flex flex-col gap-5`}
                style={{ boxShadow: `0 0 80px ${colors.glow}` }}
              >
                <div className={`w-14 h-14 rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${colors.icon}`} />
                </div>
                <h3 className="text-xl font-bold text-white">{point.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed flex-1">
                  {point.description}
                </p>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-xs font-medium ${colors.badge} w-fit`}>
                  {point.stat}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
