import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Check, X } from 'lucide-react';
import { PricingCard } from '@/components/landing/pricing-card';
import { PRO_PRICE, PRO_STRIPE_LINK, TIER_LIMITS } from '@/lib/tier-limits';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SaaSGuard';

export const metadata: Metadata = {
  title: `Pricing | ${APP_NAME}`,
  description: 'Simple, transparent pricing for SaaS server monitoring. Start free, upgrade when you need more.',
};

const FREE_FEATURES = [
  '1 server monitored',
  'Real-time CPU, RAM, disk metrics',
  'Email alerts',
  `SSL monitoring (${TIER_LIMITS.free.sslDomains} domains)`,
  'Health score dashboard',
  `${TIER_LIMITS.free.retentionDays}-day metric history`,
];

const PRO_FEATURES = [
  'Unlimited servers',
  'Crash-loop detection with history',
  'Disk risk prediction',
  'SSL expiry alerts (30/14/7 days)',
  `SSL monitoring (${TIER_LIMITS.pro.sslDomains} domains)`,
  'Email + Telegram alerts',
  'Health score with trends',
  'PM2 process monitoring',
  `${TIER_LIMITS.pro.retentionDays}-day metric history`,
  'Priority support',
];

const COMPARISON_ROWS: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: 'Servers',            free: '1',                                 pro: 'Unlimited' },
  { label: 'SSL domains',        free: `${TIER_LIMITS.free.sslDomains}`,    pro: `${TIER_LIMITS.pro.sslDomains}` },
  { label: 'Metric history',     free: `${TIER_LIMITS.free.retentionDays}d`, pro: `${TIER_LIMITS.pro.retentionDays}d` },
  { label: 'Email alerts',       free: true,                                pro: true },
  { label: 'Telegram alerts',    free: false,                               pro: true },
  { label: 'Crash-loop detection', free: false,                             pro: true },
  { label: 'Disk risk alerts',   free: true,                                pro: true },
  { label: 'PM2 monitoring',     free: true,                                pro: true },
  { label: 'Health score',       free: true,                                pro: true },
  { label: 'Priority support',   free: false,                               pro: true },
];

const FAQS = [
  {
    q: 'Can I self-host for free?',
    a: 'Yes. Run the install script on your server and use the Free tier indefinitely. No credit card required.',
  },
  {
    q: 'How do I install SaaSGuard?',
    a: 'One command: curl -s https://saasguard.tech/install.sh | bash — Docker and Docker Compose required.',
  },
  {
    q: 'How does Pro billing work?',
    a: 'Pro is $' + PRO_PRICE + '/mo. Contact us to upgrade — we\'ll send a payment link and manually activate Pro on your account.',
  },
  {
    q: 'What happens if I exceed the free tier limits?',
    a: 'The dashboard shows upgrade prompts. Your existing monitoring continues to work — we won\'t cut you off without warning.',
  },
  {
    q: 'Do you store my server metrics in the cloud?',
    a: 'No. SaaSGuard runs entirely on your own server. Your metrics never leave your infrastructure.',
  },
];

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value
      ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
      : <X className="w-4 h-4 text-white/20 mx-auto" />;
  }
  return <span className="text-white/70 text-sm">{value}</span>;
}

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
              Simple, honest pricing
            </h1>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Start free on your own server. Upgrade when you need more servers or advanced alerts.
              No hidden fees, no per-alert charges.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="pb-16 px-4">
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <PricingCard
              name="Free"
              price="$0"
              description="For indie hackers running a single server."
              features={FREE_FEATURES}
              cta="Install Now — Free"
              ctaHref="https://github.com/tuyencaovn/saasguard.tech"
            />
            <PricingCard
              name="Pro"
              price={`$${PRO_PRICE}`}
              period="mo"
              description="For founders with multiple servers and serious uptime needs."
              features={PRO_FEATURES}
              cta={`Upgrade to Pro — $${PRO_PRICE}/mo`}
              ctaHref={PRO_STRIPE_LINK}
              highlighted
              badge="Most popular"
            />
          </div>
        </section>

        {/* Feature comparison table */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-white/90">
              Full feature comparison
            </h2>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-3 bg-white/5 px-6 py-3 text-sm font-semibold text-white/60 uppercase tracking-wider">
                <span>Feature</span>
                <span className="text-center">Free</span>
                <span className="text-center text-violet-400">Pro</span>
              </div>
              {COMPARISON_ROWS.map((row, idx) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 px-6 py-3.5 items-center ${idx < COMPARISON_ROWS.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <span className="text-sm text-white/70">{row.label}</span>
                  <div className="text-center"><CellValue value={row.free} /></div>
                  <div className="text-center"><CellValue value={row.pro} /></div>
                </div>
              ))}
            </div>
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
