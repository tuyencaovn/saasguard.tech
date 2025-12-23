'use client';

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
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  hasNotification?: boolean;
  adminOnly?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Containers', href: '/containers', icon: Box, badge: '8' },
  { name: 'Alerts', href: '/alerts', icon: Bell, hasNotification: true },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
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
                  {item.hasNotification && (
                    <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full status-warning" />
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
            onClick={handleLogout}
            className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
