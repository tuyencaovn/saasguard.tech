import { NextRequest, NextResponse } from 'next/server';

const isMarketing = process.env.NEXT_PUBLIC_MARKETING === 'true';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const { pathname } = request.nextUrl;

  // Marketing site: show landing page as-is
  if (isMarketing) {
    return NextResponse.next();
  }

  // Self-hosted: redirect root to dashboard or login
  if (pathname === '/') {
    const target = token ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
