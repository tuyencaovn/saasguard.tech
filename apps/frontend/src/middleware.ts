import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token');
  const { pathname } = request.nextUrl;

  // Always redirect root to dashboard (authenticated) or login (guest)
  if (pathname === '/') {
    const target = token ? '/dashboard' : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
