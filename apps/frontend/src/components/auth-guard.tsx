'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';

const PUBLIC_PATHS = ['/login', '/set-password', '/forgot-password', '/reset-password', '/pricing', '/docs', '/'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || (path !== '/' && pathname.startsWith(path)));

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicPath) {
        router.replace('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, isPublicPath, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  // Show login page without redirect loop
  if (!isAuthenticated && isPublicPath) {
    return <>{children}</>;
  }

  // Show protected content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Redirecting...
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
    </div>
  );
}
