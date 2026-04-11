import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from '@/types';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes
    if (pathname.startsWith('/admin')) {
      if (token?.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
      }
    }

    // Owner routes
    if (pathname.startsWith('/owner')) {
      if (token?.role !== UserRole.PLACE_OWNER && token?.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
      }
    }

    // Check if account is active
    if (token?.isActive === false) {
      return NextResponse.redirect(new URL('/auth/deactivated', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes — always allowed
        const publicPaths = [
          '/auth/',
          '/embed/',
          '/registration/edit/',
          '/api/auth/',
          '/api/embed/',
          '/api/tags',
          '/api/search',
          '/_next/',
          '/favicon',
          '/assets/',
        ];
        if (publicPaths.some((p) => pathname.startsWith(p))) return true;
        if (pathname === '/') return true;
        if (pathname === '/search') return true;

        // Protected routes require a token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
};
