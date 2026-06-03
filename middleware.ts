import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'default-fallback-jwt-secret-key-at-least-32-chars-long';
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  let user = null;
  if (token) {
    try {
      const { payload } = await jose.jwtVerify(token, JWT_SECRET_BYTES);
      user = payload as { userId: number; email: string; name: string; role: 'admin' | 'seller' };
    } catch (e) {
      // Invalid token
    }
  }

  // Define route protections
  const isAdminRoute = pathname.startsWith('/admin');
  const isSellerRoute = pathname.startsWith('/seller');
  const isAuthRoute = pathname === '/' || pathname === '/login' || pathname === '/register';

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'admin') {
      // Redirect to seller dashboard if seller tries to access admin
      return NextResponse.redirect(new URL('/seller', request.url));
    }
  }

  if (isSellerRoute) {
    if (!user) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'seller') {
      // Redirect to admin dashboard if admin tries to access seller
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (isAuthRoute && user) {
    // Already logged in, redirect to correct dashboard
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller', request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: ['/', '/login', '/register', '/admin/:path*', '/seller/:path*'],
};
