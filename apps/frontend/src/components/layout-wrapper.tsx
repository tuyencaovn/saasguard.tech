'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';

const NO_SIDEBAR_PATHS = ['/login', '/set-password', '/forgot-password', '/reset-password'];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showSidebar = !NO_SIDEBAR_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        {showSidebar && <Sidebar />}
        <main className={showSidebar ? 'flex-1 ml-64' : 'flex-1'}>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
