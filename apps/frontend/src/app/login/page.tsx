'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { APP_SHORT_NAME } from '@/config/brand';
import {
  Server,
  Loader2,
  AlertCircle,
  Lock,
  Terminal,
  BarChart3,
  Bell,
  Wifi,
  Cpu,
  Zap,
  Database,
  Box,
  Shield,
} from 'lucide-react';

// Docker icon SVG
const DockerIcon = () => (
  <svg className="w-5 h-5 text-violet-400" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.186.186 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.185.185 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.185.185v1.888c0 .102.084.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338 0-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983 0 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse-glow" />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-glow"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[80px] animate-pulse-glow"
          style={{ animationDelay: '0.8s' }}
        />

        {/* Network topology */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <linearGradient
              id="line-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <line
            x1="5%"
            y1="15%"
            x2="20%"
            y2="30%"
            stroke="url(#line-grad)"
            className="animate-network-line"
          />
          <line
            x1="20%"
            y1="30%"
            x2="15%"
            y2="55%"
            stroke="url(#line-grad)"
            className="animate-network-line"
            style={{ animationDelay: '-5s' }}
          />
          <line
            x1="15%"
            y1="55%"
            x2="25%"
            y2="75%"
            stroke="url(#line-grad)"
            className="animate-network-line"
            style={{ animationDelay: '-10s' }}
          />
          <line
            x1="75%"
            y1="20%"
            x2="85%"
            y2="40%"
            stroke="url(#line-grad)"
            className="animate-network-line"
            style={{ animationDelay: '-3s' }}
          />
          <line
            x1="85%"
            y1="40%"
            x2="78%"
            y2="60%"
            stroke="url(#line-grad)"
            className="animate-network-line"
            style={{ animationDelay: '-8s' }}
          />
          <line
            x1="78%"
            y1="60%"
            x2="90%"
            y2="80%"
            stroke="url(#line-grad)"
            className="animate-network-line"
            style={{ animationDelay: '-12s' }}
          />
          <line
            x1="20%"
            y1="30%"
            x2="75%"
            y2="35%"
            stroke="url(#line-grad)"
            className="animate-network-line opacity-15"
            style={{ animationDelay: '-2s' }}
          />
          <line
            x1="25%"
            y1="75%"
            x2="78%"
            y2="60%"
            stroke="url(#line-grad)"
            className="animate-network-line opacity-15"
            style={{ animationDelay: '-7s' }}
          />
        </svg>

        {/* Floating nodes */}
        <FloatingNode
          icon={<Server className="w-5 h-5 text-violet-400" />}
          className="top-[5%] left-[2%]"
        />
        <FloatingNode
          icon={<Database className="w-4 h-4 text-indigo-400" />}
          className="top-[3%] right-[3%]"
          size="sm"
          delayed
        />
        <FloatingNode
          icon={<Wifi className="w-5 h-5 text-cyan-400" />}
          className="top-[12%] left-[48%]"
          delay={0.5}
        />
        <FloatingNode
          icon={<Box className="w-6 h-6 text-violet-400" />}
          className="top-[35%] left-[45%]"
          size="lg"
          delayed
          delay={0.8}
        />
        <FloatingNode
          icon={<Cpu className="w-4 h-4 text-emerald-400" />}
          className="top-[55%] left-[50%]"
          size="sm"
          delay={1.2}
        />
        <FloatingNode
          icon={<Zap className="w-4 h-4 text-purple-400" />}
          className="top-[75%] left-[46%]"
          size="xs"
          delayed
          delay={1.8}
        />
        <FloatingNode
          icon={<Bell className="w-5 h-5 text-amber-400" />}
          className="bottom-[15%] left-[1%]"
          delay={1}
        />
        <FloatingNode
          icon={<Database className="w-5 h-5 text-indigo-400" />}
          className="top-[40%] right-[2%]"
          delayed
          delay={0.6}
        />
        <FloatingNode
          icon={<Bell className="w-5 h-5 text-amber-400" />}
          className="bottom-[20%] right-[3%]"
          delay={1.5}
        />
        <FloatingNode
          icon={<Shield className="w-4 h-4 text-emerald-400" />}
          className="bottom-[5%] right-[1%]"
          size="sm"
          delayed
          delay={2}
        />

        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Main Layout */}
      <div className="relative min-h-screen flex">
        {/* Left Panel - Features */}
        <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">{APP_SHORT_NAME}</span>
              <span className="text-xs text-white/40 block">Server Monitor</span>
            </div>
          </div>

          {/* Hero */}
          <div className="max-w-lg">
            <p className="text-violet-400 text-sm font-medium tracking-wide mb-4">
              INFRASTRUCTURE MONITORING PLATFORM
            </p>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Complete visibility into your infrastructure
            </h1>
            <p className="text-lg text-white/50 leading-relaxed mb-10">
              Monitor Docker containers, PM2 processes, and system metrics in
              real-time. Get instant alerts when issues arise.
            </p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FeatureCard
                icon={<DockerIcon />}
                iconBg="bg-violet-500/10"
                title="Docker Monitoring"
                description="Container health & lifecycle"
                hoverColor="hover:border-violet-500/30"
              />
              <FeatureCard
                icon={<Terminal className="w-5 h-5 text-emerald-400" />}
                iconBg="bg-emerald-500/10"
                title="PM2 Control"
                description="Process management & logs"
                hoverColor="hover:border-emerald-500/30"
              />
              <FeatureCard
                icon={<BarChart3 className="w-5 h-5 text-cyan-400" />}
                iconBg="bg-cyan-500/10"
                title="Real-time Metrics"
                description="CPU, memory, disk, network"
                hoverColor="hover:border-cyan-500/30"
              />
              <FeatureCard
                icon={<Bell className="w-5 h-5 text-amber-400" />}
                iconBg="bg-amber-500/10"
                title="Instant Alerts"
                description="Email & Telegram notifications"
                hoverColor="hover:border-amber-500/30"
              />
            </div>
          </div>

          {/* Footer Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-white/40">System Online</span>
            </div>
            <span className="text-white/20">•</span>
            <span className="text-white/30">v2.0.0</span>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold">{APP_SHORT_NAME}</span>
                <span className="text-xs text-white/40 block">
                  Server Monitor
                </span>
              </div>
            </div>

            {/* Login Card */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-violet-400" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-center mb-2">
                Welcome back
              </h2>
              <p className="text-sm text-white/40 text-center mb-6">
                Sign in to access your dashboard
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-white/60 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="admin@bimnext.local"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-white/60"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-white/30 text-sm mt-6">
              Contact administrator for access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating node component
function FloatingNode({
  icon,
  className,
  size = 'md',
  delayed = false,
  delay = 0,
}: {
  icon: React.ReactNode;
  className: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  delayed?: boolean;
  delay?: number;
}) {
  const sizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-11 h-11 rounded-xl',
  };

  return (
    <div
      className={`absolute ${className} ${delayed ? 'animate-float-delayed' : 'animate-float'}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className={`${sizeClasses[size]} glass-subtle flex items-center justify-center`}
      >
        {icon}
      </div>
    </div>
  );
}

// Feature card component
function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  hoverColor,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  hoverColor: string;
}) {
  return (
    <div
      className={`glass-card rounded-xl p-5 ${hoverColor} transition-all cursor-default`}
    >
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-white/40">{description}</p>
    </div>
  );
}
