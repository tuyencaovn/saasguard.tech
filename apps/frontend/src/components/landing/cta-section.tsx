import Link from 'next/link';
import { ArrowRight, Terminal } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-28 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        <p className="reveal-up text-sm font-medium text-violet-400/80 uppercase tracking-widest mb-4">
          Get started
        </p>
        <h2 className="reveal-up reveal-delay-1 text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
          Up and running in
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400"> 2 minutes</span>
        </h2>
        <p className="reveal-up reveal-delay-2 text-white/40 text-lg mb-12 max-w-lg mx-auto">
          Install the agent on your VPS with a single command. No config files, no complex setup.
        </p>

        {/* Install command */}
        <div className="reveal-up reveal-delay-3 flex items-center gap-3 px-6 py-4 bg-black/60 border border-white/10 rounded-xl font-mono text-sm text-white/50 mb-12 max-w-lg mx-auto backdrop-blur-sm">
          <Terminal className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="truncate cursor-blink">curl -fsSL saasguard.tech/install | bash</span>
        </div>

        <div className="reveal-up reveal-delay-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
          >
            Start Free Monitoring
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-all duration-300"
          >
            See Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
