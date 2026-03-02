import Link from 'next/link';
import { ArrowRight, Terminal, Sparkles } from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SaaSGuard';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
      {/* Grid pattern background */}
      <div className="absolute inset-0 grid-pattern opacity-50" />

      {/* Gradient orbs - larger, more dramatic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Top fade line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-transparent via-violet-500/40 to-transparent" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Animated badge */}
        <div className="reveal-up inline-flex items-center gap-2 px-4 py-2 rounded-full shimmer-badge border border-violet-500/20 text-violet-300 text-sm font-medium mb-10">
          <Sparkles className="w-3.5 h-3.5" />
          Monitoring that catches silent failures
        </div>

        {/* Large headline with gradient */}
        <h1 className="reveal-up reveal-delay-1 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-[1.05] tracking-tight">
          Your SaaS can
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-cyan-400 to-indigo-400">
            silently crash.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="reveal-up reveal-delay-2 text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
          {APP_NAME} watches your VPS for crash loops, disk filling, and SSL expiry —
          so your SaaS doesn&apos;t silently die while you sleep.
        </p>

        {/* CTAs */}
        <div className="reveal-up reveal-delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
          >
            Start Free Monitoring
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-all duration-300"
          >
            View Pricing
          </Link>
        </div>

        {/* Install command with glow */}
        <div className="reveal-up reveal-delay-4 inline-flex items-center gap-3 px-6 py-3.5 bg-black/60 border border-white/10 rounded-xl font-mono text-sm text-white/50 backdrop-blur-sm">
          <Terminal className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="cursor-blink">curl -fsSL saasguard.tech/install | bash</span>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0f0f23] to-transparent" />
    </section>
  );
}
