import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Shield,
  Terminal,
  Globe,
  Monitor,
  Bot,
  Bell,
  Lock,
  Box,
  Cpu,
  HardDrive,
} from 'lucide-react';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'SaaSGuard';

export const metadata: Metadata = {
  title: `Docs | ${APP_NAME}`,
  description:
    'Get started with SaaSGuard in minutes. Installation guide, setup, Telegram alerts, and troubleshooting.',
};

function SectionHeading({
  id,
  icon: Icon,
  title,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <h2 id={id} className="flex items-center gap-3 text-2xl font-bold text-white mb-6 scroll-mt-24">
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-violet-400" />
      </div>
      {title}
    </h2>
  );
}

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="relative group">
      {label && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-400/70 bg-[#0f0f23] rounded">
          {label}
        </div>
      )}
      <pre className="bg-black/40 border border-white/10 rounded-xl px-5 py-4 overflow-x-auto font-mono text-sm text-white/80 leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function StepItem({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-sm font-semibold text-violet-300 shrink-0">
          {step}
        </div>
        <div className="w-px flex-1 bg-white/5 mt-2" />
      </div>
      <div className="pb-8 min-w-0">
        <h3 className="font-semibold text-white mb-2">{title}</h3>
        <div className="text-sm text-white/50 leading-relaxed space-y-3">{children}</div>
      </div>
    </div>
  );
}

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="block text-sm text-white/40 hover:text-violet-400 transition-colors py-1"
    >
      {children}
    </a>
  );
}

export default function DocsPage() {
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
              href="/pricing"
              className="text-sm text-white/50 hover:text-white transition-colors px-3 py-2 hidden sm:block"
            >
              Pricing
            </Link>
            <Link
              href="https://github.com/tuyencaovn/saasguard.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              Install Now
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {/* Header */}
        <section className="py-20 px-4 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative">
            <p className="text-sm font-medium text-violet-400/80 uppercase tracking-widest mb-4">
              Documentation
            </p>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-5 tracking-tight">
              Get started in 60 seconds
            </h1>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              One command to install. Zero config to start monitoring. Self-hosted on your VPS.
            </p>
          </div>
        </section>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 pb-24">
          {/* Table of Contents */}
          <div className="mb-16 p-6 rounded-2xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
              On this page
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <TocLink href="#quick-start">Quick Start</TocLink>
              <TocLink href="#setup-guide">Setup Guide</TocLink>
              <TocLink href="#telegram-setup">Telegram Bot Setup</TocLink>
              <TocLink href="#usage-guide">Usage Guide</TocLink>
              <TocLink href="#faq">FAQ &amp; Troubleshooting</TocLink>
            </div>
          </div>

          {/* Quick Start */}
          <section className="mb-20">
            <SectionHeading id="quick-start" icon={Terminal} title="Quick Start" />
            <p className="text-white/50 mb-6">
              Install {APP_NAME} on any Ubuntu/Debian VPS with Docker installed. One command, that&apos;s it.
            </p>
            <CodeBlock label="terminal">
              {`curl -fsSL https://saasguard.tech/install.sh | bash`}
            </CodeBlock>
            <div className="mt-6 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <p className="text-sm text-white/60 mb-3 font-medium">Requirements</p>
              <ul className="text-sm text-white/40 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">&#8226;</span>
                  Ubuntu 20.04+ / Debian 11+ / CentOS 8+
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">&#8226;</span>
                  Docker &amp; Docker Compose installed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400 mt-0.5">&#8226;</span>
                  1 GB RAM minimum (2 GB recommended)
                </li>
              </ul>
            </div>
            <p className="text-sm text-white/30 mt-4">
              The installer will prompt you for deployment mode, admin credentials, and optional Telegram config.
              Everything is auto-detected where possible.
            </p>
          </section>

          {/* Setup Guide */}
          <section className="mb-20">
            <SectionHeading id="setup-guide" icon={Globe} title="Setup Guide" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* IP Mode */}
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-white">IP Mode</h3>
                </div>
                <p className="text-sm text-white/40 mb-3">
                  Access via direct IP and ports. Best for quick testing or no-domain setups.
                </p>
                <div className="text-xs font-mono text-white/50 space-y-1">
                  <p>Frontend: <span className="text-cyan-400">http://YOUR_IP:3006</span></p>
                  <p>API: <span className="text-cyan-400">http://YOUR_IP:3005</span></p>
                </div>
                <p className="text-xs text-white/30 mt-3">Ports 3005 &amp; 3006 must be open.</p>
              </div>

              {/* Domain Mode */}
              <div className="p-5 rounded-xl border border-violet-500/20 bg-violet-500/[0.03]">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-white">Domain Mode</h3>
                  <span className="text-[10px] uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-white/40 mb-3">
                  Single domain with Nginx path-based routing and automatic SSL via Certbot.
                </p>
                <div className="text-xs font-mono text-white/50 space-y-1">
                  <p><span className="text-violet-400">/api/*</span> → backend</p>
                  <p><span className="text-violet-400">/socket.io/*</span> → WebSocket</p>
                  <p><span className="text-violet-400">{'/*'}</span> → frontend</p>
                </div>
                <p className="text-xs text-white/30 mt-3">Ports 80 &amp; 443 must be open.</p>
              </div>
            </div>

            <h3 className="font-semibold text-white mb-4">Installation Steps</h3>
            <div className="ml-1">
              <StepItem step={1} title="Run the installer">
                <p>The script auto-detects your server IP and Docker group ID.</p>
                <CodeBlock>{`curl -fsSL https://saasguard.tech/install.sh | bash`}</CodeBlock>
              </StepItem>
              <StepItem step={2} title="Choose deployment mode">
                <p>Select <strong className="text-white/70">IP mode</strong> or <strong className="text-white/70">Domain mode</strong> when prompted. Domain mode sets up Nginx + SSL automatically.</p>
              </StepItem>
              <StepItem step={3} title="Set admin credentials">
                <p>Enter your admin email and password. This creates the first admin account automatically.</p>
              </StepItem>
              <StepItem step={4} title="Configure alerts (optional)">
                <p>Optionally enter your Telegram bot token and chat ID for instant alerts. You can also configure this later in Settings.</p>
              </StepItem>
              <StepItem step={5} title="Done!">
                <p>Open your dashboard and start monitoring. All services start automatically.</p>
              </StepItem>
            </div>
          </section>

          {/* Telegram Setup */}
          <section className="mb-20">
            <SectionHeading id="telegram-setup" icon={Bot} title="Telegram Bot Setup" />
            <p className="text-white/50 mb-6">
              Get instant crash alerts, disk warnings, and SSL expiry notifications on Telegram.
            </p>

            <div className="ml-1">
              <StepItem step={1} title="Create a Telegram bot">
                <p>Open Telegram, search for <strong className="text-white/70">@BotFather</strong>, and send:</p>
                <CodeBlock>{`/newbot`}</CodeBlock>
                <p>Follow the prompts to name your bot. You&apos;ll receive a <strong className="text-white/70">Bot Token</strong> like:</p>
                <CodeBlock>{`123456789:ABCdefGHIjklMNOpqrsTUVwxyz`}</CodeBlock>
              </StepItem>
              <StepItem step={2} title="Get your Chat ID">
                <p>Send any message to your new bot, then open this URL in your browser (replace YOUR_TOKEN):</p>
                <CodeBlock>{`https://api.telegram.org/botYOUR_TOKEN/getUpdates`}</CodeBlock>
                <p>Find <code className="text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded text-xs">chat.id</code> in the response — that&apos;s your Chat ID.</p>
              </StepItem>
              <StepItem step={3} title="Configure in SaaSGuard">
                <p>Go to <strong className="text-white/70">Settings → Notification Settings</strong> in your dashboard and paste your Bot Token and Chat ID. Or provide them during installation.</p>
              </StepItem>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] mt-2">
              <p className="text-sm text-emerald-400/80 font-medium mb-1">Tip</p>
              <p className="text-sm text-white/40">
                You can also create a Telegram group, add your bot to it, and use the group&apos;s chat ID to share alerts with your team.
              </p>
            </div>
          </section>

          {/* Usage Guide */}
          <section className="mb-20">
            <SectionHeading id="usage-guide" icon={Monitor} title="Usage Guide" />

            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-violet-400" />
                  <h3 className="font-semibold text-white">Dashboard</h3>
                </div>
                <p className="text-sm text-white/40">
                  Real-time CPU, RAM, disk, and network metrics with a health score (0–100). The score combines all metrics into one number — below 60 means something needs attention.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-white">Alerts</h3>
                </div>
                <p className="text-sm text-white/40">
                  Automatic alerts for crash loops, high disk usage (80% warning, 90% critical), and SSL certificate expiry (30, 14, and 7 days before). Delivered via email and/or Telegram.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-semibold text-white">SSL Monitoring</h3>
                </div>
                <p className="text-sm text-white/40">
                  Add your domains in the SSL Certificates page. {APP_NAME} checks certificate validity daily and alerts you before they expire.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-semibold text-white">Docker &amp; PM2</h3>
                </div>
                <p className="text-sm text-white/40">
                  View container and PM2 process status, CPU/memory usage, and logs. Start, stop, or restart services directly from the dashboard.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <h3 className="font-semibold text-white">Useful Commands</h3>
                </div>
                <CodeBlock>{`cd ~/saasguard

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Update to latest version
git pull && docker compose up -d --build`}</CodeBlock>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <SectionHeading id="faq" icon={Bell} title="FAQ & Troubleshooting" />

            <div className="space-y-6">
              {[
                {
                  q: 'The installer says Docker is not found',
                  a: 'Install Docker first: curl -fsSL https://get.docker.com | bash. Then re-run the installer.',
                },
                {
                  q: 'I can\'t access the dashboard after install',
                  a: 'Check that the required ports are open (3005/3006 for IP mode, 80/443 for domain mode). Run docker compose logs -f to check for errors.',
                },
                {
                  q: 'WebSocket / real-time metrics not working',
                  a: 'In domain mode, ensure Nginx is proxying /socket.io/* to the backend. Check that NEXT_PUBLIC_WS_URL points to your domain root (without /api).',
                },
                {
                  q: 'Telegram notifications not sending',
                  a: 'Verify your bot token and chat ID in Settings → Notification Settings. Make sure you\'ve sent at least one message to the bot before checking getUpdates.',
                },
                {
                  q: 'How do I update SaaSGuard?',
                  a: 'Run: cd ~/saasguard && git pull && docker compose up -d --build. Your data is stored in PostgreSQL and persists across updates.',
                },
                {
                  q: 'Does SaaSGuard send my data anywhere?',
                  a: 'No. SaaSGuard is fully self-hosted. Your metrics and data never leave your server. There are no analytics or telemetry.',
                },
                {
                  q: 'Can I monitor multiple servers?',
                  a: 'The Free tier monitors 1 server. Upgrade to Pro for unlimited servers. Each server needs its own SaaSGuard installation.',
                },
                {
                  q: 'How do I reset my admin password?',
                  a: 'Use the Forgot Password link on the login page, or re-run the installer which will re-seed the admin account.',
                },
              ].map((faq) => (
                <div key={faq.q} className="border-b border-white/5 pb-6 last:border-0">
                  <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-12 px-6 rounded-2xl border border-white/10 bg-gradient-to-b from-violet-500/[0.05] to-transparent">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to monitor?</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto">
              One command. 60 seconds. Your server crashes will never go unnoticed again.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="https://github.com/tuyencaovn/saasguard.tech"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20"
              >
                Install Now
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-all duration-200"
              >
                View Pricing
              </Link>
            </div>
          </section>
        </div>

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
              <Link href="/pricing" className="hover:text-white/50 transition-colors">Pricing</Link>
              <Link href="https://github.com/tuyencaovn/saasguard.tech" target="_blank" rel="noopener noreferrer" className="hover:text-white/50 transition-colors">GitHub</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} {APP_NAME}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
