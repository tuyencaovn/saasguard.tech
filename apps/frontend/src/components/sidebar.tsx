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
  { name: 'Containers', href: '/containers', icon: Box },
  { name: 'Alerts', href: '/alerts', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Server className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-zinc-50">BimNext</span>
          <span className="text-xs text-zinc-500 block">Server Monitor</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors',
                isActive
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {item.name === 'Alerts' && (
                <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-zinc-800">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-zinc-700 rounded-full flex items-center justify-center text-sm font-medium">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-50 truncate">Admin User</div>
            <div className="text-xs text-zinc-500 truncate">admin@bimnext.com</div>
          </div>
          <button className="p-1.5 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800 rounded transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
