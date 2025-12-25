'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Box,
  Bell,
  Settings,
  Server,
  LogOut,
  Users,
  Terminal,
  Key,
  Loader2,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Containers', href: '/containers', icon: Box },
  { name: 'PM2', href: '/pm2', icon: Terminal },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [hasRecentAlerts, setHasRecentAlerts] = useState(false);

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Check for alerts triggered in last 24h
  useEffect(() => {
    const checkRecentAlerts = async () => {
      try {
        const res = await fetch(`${API_URL}/alerts/logs?page=1&limit=1`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.length > 0) {
            const lastAlert = new Date(data.data[0].triggeredAt);
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            setHasRecentAlerts(lastAlert > oneDayAgo);
          } else {
            setHasRecentAlerts(false);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    checkRecentAlerts();
    const interval = setInterval(checkRecentAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Get user initials
  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split('.')
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2)
    : 'U';

  return (
    <aside className="fixed inset-y-0 left-0 w-64 sidebar-glass flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Server className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-white">BimNext</span>
          <span className="text-xs text-white/40 block">Server Monitor</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navigation
            .filter((item) => !item.adminOnly || user?.role === 'admin')
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all',
                    isActive
                      ? 'nav-active text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  )}
                >
                  <item.icon
                    className={cn('w-5 h-5', isActive && 'text-violet-400')}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-white/10 text-white/60 rounded-full">
                      {item.badge}
                    </span>
                  )}
                  {item.name === 'Alerts' && hasRecentAlerts && (
                    <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
        </div>

        {user?.role === 'admin' && (
          <div className="mt-8 pt-6 border-t border-white/5">
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all',
                pathname === '/settings'
                  ? 'nav-active text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-medium shadow-lg shadow-violet-500/20">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate capitalize">
              {user?.role || 'User'}
            </div>
            <div className="text-xs text-white/40 truncate">
              {user?.email || 'Loading...'}
            </div>
          </div>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Change Password"
          >
            <Key className="w-5 h-5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Change Password Modal - rendered via Portal to escape sidebar positioning */}
      {showPasswordModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !passwordSaving && setShowPasswordModal(false)}
          />
          <div className="relative glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold">Change Password</h2>
              </div>
              <button
                onClick={() => !passwordSaving && setShowPasswordModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                Password changed successfully!
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-white/50 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordSaving}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-gradient px-4 py-2.5 text-white font-medium rounded-xl flex items-center gap-2"
                  >
                    {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Change Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
