import { Server, Clock, Zap, Shield } from 'lucide-react';

const stats = [
  { icon: Server, value: '2,400+', label: 'Servers monitored', color: 'text-violet-400' },
  { icon: Clock, value: '99.9%', label: 'Uptime SLA', color: 'text-cyan-400' },
  { icon: Zap, value: '<30s', label: 'Alert latency', color: 'text-amber-400' },
  { icon: Shield, value: '0', label: 'Data breaches', color: 'text-emerald-400' },
];

export function SocialProofSection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-5xl mx-auto">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`reveal-up reveal-delay-${i + 1} text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5`}
              >
                <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-3 opacity-60`} />
                <div className="text-3xl md:text-4xl font-bold text-white mb-1.5 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-sm text-white/35">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Testimonial / trust line */}
        <div className="reveal-up reveal-delay-3 text-center">
          <p className="text-white/30 text-sm max-w-lg mx-auto leading-relaxed">
            Trusted by indie hackers and small SaaS teams who can&apos;t afford downtime.
            <span className="text-white/50 font-medium"> Set up in 2 minutes, peace of mind forever.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
