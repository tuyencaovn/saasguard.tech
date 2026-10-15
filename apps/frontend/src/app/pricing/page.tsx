import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { PricingCard } from '@/components/landing/pricing-card';
import { TIER_LIMITS } from '@/lib/tier-limits';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Server Monitor';

export const metadata: Metadata = {
  title: `Pricing | ${APP_NAME}`,
  description: 'Free, self-hosted server monitoring. Every feature unlocked — your metrics never leave your infrastructure.',
};

const FEATURES = [
  'Unlimited servers',
  'Real-time CPU, RAM, disk metrics',
  'Email + Telegram alerts',
  'Crash-loop detection with history',
  'Disk risk prediction',
  'SSL expiry alerts (30/14/7 days)',
  `SSL monitoring (${TIER_LIMITS.free.sslDomains} domains)`,
  'PM2 process monitoring',
  'Health score with trends',
  `${TIER_LIMITS.free.retentionDays}-day metric history`,
];

const FAQS = [
  {
    q: 'Is it really free?',
    a: 'Yes. Every feature is unlocked and free to use right now. Run the install script on your own server — no credit card, no limits.',
  },
  {
    q: 'How do I install Server Monitor?',
    a: 'One command: curl -s https://saasguard.tech/install.sh | bash — Docker and Docker Compose required.',
  },
  {
    q: 'Do you store my server metrics in the cloud?',
    a: 'No. Server Monitor runs entirely on your own server. Your metrics never leave your infrastructure.',
  },
  {
    q: 'Will it stay free?',
    a: 'Everything is free for now. Paid plans may arrive later, but your self-hosted install keeps working.',
  },
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
              href="/docs"
              className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-lg transition-all duration-200"
            >
              Docs
            </Link>
            <Link
              href="https://github.com/tuyencaovn/saasguard.tech"
              className="text-sm px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              Install Now
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Header */}
        <section className="py-24 px-4 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative">
            <p className="text-sm font-medium text-violet-400/80 uppercase tracking-widest mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 tracking-tight">
              Free, every feature included
            </h1>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Self-host on your own server with everything unlocked. No credit card,
              no per-alert charges, no limits.
            </p>
          </div>
        </section>

        {/* Pricing card */}
        <section className="pb-16 px-4">
          <div className="max-w-md mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="Everything unlocked. Runs entirely on your own server."
              features={FEATURES}
              cta="Install Now — Free"
              ctaHref="https://github.com/tuyencaovn/saasguard.tech"
              highlighted
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 border-t border-white/5">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10 text-white/90">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="border-b border-white/5 pb-6 last:border-0">
                  <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
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
              <Link href="/docs" className="hover:text-white/50 transition-colors">Docs</Link>
              <Link href="https://github.com/tuyencaovn/saasguard.tech" className="hover:text-white/50 transition-colors">GitHub</Link>
              <a href="mailto:tuyencaovn@gmail.com" className="hover:text-white/50 transition-colors">Support</a>
            </div>
            <p>&copy; {new Date().getFullYear()} {APP_NAME}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
