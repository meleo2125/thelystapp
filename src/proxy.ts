import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('auth-session');
  const { pathname } = request.nextUrl;
  
  // Auth routes (redirect logged-in users away)
  const authRoutes = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Public pages accessible to both authenticated and unauthenticated users
  const publicPages = ['/', '/movie', '/tv', '/anime'];
  const isPublicPage = publicPages.some(route => pathname === route || (route !== '/' && pathname.startsWith(route)));

  // API routes should be handled separately
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // For security, treat session as valid only if it exists
  const hasSession = !!session?.value;
  
  // If the user is not logged in and trying to access a protected route, redirect to login
  if (!hasSession && !isAuthRoute && !isPublicPage) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // If the user is logged in and trying to access auth routes, redirect to home
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}; 
