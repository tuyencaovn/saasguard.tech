import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { HeroSection } from '@/components/landing/hero-section';
import { PainPointsSection } from '@/components/landing/pain-points-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { SocialProofSection } from '@/components/landing/social-proof-section';
import { CTASection } from '@/components/landing/cta-section';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SaaSGuard';

export const metadata: Metadata = {
  title: `${APP_NAME} — Silent Crash Monitor for Small SaaS`,
  description:
    'Monitor your VPS for crash loops, disk filling, and SSL expiry. Get alerted before your users notice.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white relative">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0f0f23]/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white tracking-tight">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/pricing"
              className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2 hidden sm:block"
            >
              Pricing
            </Link>
            <Link
              href="https://github.com/tuyencaovn/saasguard.tech#readme"
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

      {/* Page content */}
      <div className="pt-16">
        <HeroSection />
        <PainPointsSection />
        <FeaturesSection />
        <SocialProofSection />
        <CTASection />

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
              <Link href="/pricing" className="hover:text-white/50 transition-colors">Pricing</Link>
              <Link href="https://github.com/tuyencaovn/saasguard.tech" className="hover:text-white/50 transition-colors">GitHub</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} {APP_NAME}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
