'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Box,
  Bell,
  Settings,
  Server,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Containers', href: '/containers', icon: Box, badge: '8' },
  { name: 'Alerts', href: '/alerts', icon: Bell, hasNotification: true },
];

export function Sidebar() {
  const pathname = usePathname();

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
          {navigation.map((item) => {
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
      </nav>

      {/* User Profile */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-medium shadow-lg shadow-violet-500/20">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Admin User</div>
            <div className="text-xs text-white/40 truncate">admin@bimnext.com</div>
          </div>
          <button className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
