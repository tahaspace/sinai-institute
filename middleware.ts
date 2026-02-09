import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login');
    const isCMSPage = req.nextUrl.pathname.startsWith('/cms');

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/cms/dashboard', req.url));
      }
      return null;
    }

    if (isCMSPage && !isAuth) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return null;
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ['/cms/:path*', '/login'],
};
