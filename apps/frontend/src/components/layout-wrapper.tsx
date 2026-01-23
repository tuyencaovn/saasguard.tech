'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { Menu } from 'lucide-react';

const NO_SIDEBAR_PATHS = ['/login', '/set-password', '/forgot-password', '/reset-password'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = !NO_SIDEBAR_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {showSidebar && (
          <>
            {/* Mobile hamburger button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar - hidden on mobile by default, shown when toggled */}
            <div className={`
              fixed inset-y-0 left-0 z-40 w-64 transition-transform duration-300 ease-in-out
              md:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </>
        )}
        <main className={showSidebar ? 'flex-1 md:ml-64 overflow-x-hidden' : 'flex-1'}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
