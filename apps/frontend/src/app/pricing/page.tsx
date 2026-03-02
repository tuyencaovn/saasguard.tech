import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PricingCard } from '@/components/landing/pricing-card';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SaaSGuard';

export const metadata: Metadata = {
  title: `Pricing | ${APP_NAME}`,
  description: 'Simple, transparent pricing for SaaS server monitoring. Start free, upgrade when you need more.',
};

const FREE_FEATURES = [
  '1 server monitored',
  'Real-time CPU, RAM, disk metrics',
  'Basic crash detection',
  'Email alerts',
  'SSL certificate monitoring',
  'Health score dashboard',
];

const PRO_FEATURES = [
  'Unlimited servers',
  'Crash-loop detection with history',
  'Disk risk prediction',
  'SSL expiry alerts (30/14/7 days)',
  'Email + Telegram alerts',
  'Health score with trends',
  'PM2 process monitoring',
  'Priority support',
];

export default function PricingPage() {
  return (
    <div className="min-h-screen text-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0f0f23]/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white tracking-tight">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-lg transition-all duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Header */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative">
            <p className="reveal-up text-sm font-medium text-violet-400/80 uppercase tracking-widest mb-4">
              Pricing
            </p>
            <h1 className="reveal-up reveal-delay-1 text-4xl md:text-6xl font-bold text-white mb-5 tracking-tight">
              Simple, honest pricing
            </h1>
            <p className="reveal-up reveal-delay-2 text-white/40 text-lg max-w-xl mx-auto">
              Start free. Upgrade when you need more servers or advanced alerts.
              No hidden fees, no per-alert charges.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-28 px-4">
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="reveal-up reveal-delay-2">
              <PricingCard
                name="Free"
                price="$0"
                description="For indie hackers running a single server."
                features={FREE_FEATURES}
                cta="Start monitoring free"
                ctaHref="/login"
              />
            </div>
            <div className="reveal-up reveal-delay-3">
              <PricingCard
                name="Pro"
                price="$19"
                period="mo"
                description="For founders with multiple servers and serious uptime needs."
                features={PRO_FEATURES}
                cta="Start Pro trial"
                ctaHref="/login"
                highlighted
                badge="Most popular"
              />
            </div>
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="py-16 px-4 border-t border-white/5 text-center">
          <p className="text-white/30 text-sm">
            Questions?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
              Contact us
            </Link>
            {' '}&mdash; we respond within 24 hours.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/25">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium">{APP_NAME}</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-white/50 transition-colors">Home</Link>
              <Link href="/login" className="hover:text-white/50 transition-colors">Sign in</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} {APP_NAME}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
