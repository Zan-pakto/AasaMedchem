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
      user = payload as { userId: number; email: string; name: string; role: 'admin' | 'seller' | 'buyer' };
    } catch {
      // Invalid token
    }
  }

  // Define route protections
  const isAdminRoute = pathname.startsWith('/admin');
  const isSellerRoute = pathname.startsWith('/seller');
  const isBuyerRoute = pathname.startsWith('/buyer');
  const isAuthRoute = pathname === '/' || pathname === '/login' || pathname === '/register';

  if (isAdminRoute) {
    if (!user) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL(user.role === 'buyer' ? '/buyer' : '/seller', request.url));
    }
  }

  if (isSellerRoute) {
    if (!user) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'seller') {
      return NextResponse.redirect(new URL(user.role === 'admin' ? '/admin' : '/buyer', request.url));
    }
  }

  if (isBuyerRoute) {
    if (!user) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== 'buyer') {
      return NextResponse.redirect(new URL(user.role === 'admin' ? '/admin' : '/seller', request.url));
    }
  }

  if (isAuthRoute && user) {
    // Already logged in, redirect to correct dashboard
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    } else if (user.role === 'buyer') {
      return NextResponse.redirect(new URL('/buyer', request.url));
    } else {
      return NextResponse.redirect(new URL('/seller', request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: ['/', '/login', '/register', '/admin/:path*', '/seller/:path*', '/buyer/:path*'],
};
