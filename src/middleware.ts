import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('auth-session');
  const { pathname } = request.nextUrl;
  
  // Public routes (not protected)
  const publicRoutes = ['/login', '/register', '/verify-otp'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // API routes should be handled separately
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // For security, treat session as valid only if it exists
  // The actual verification will happen in the API routes with Firebase Admin
  const hasSession = !!session?.value;
  
  // If the user is not logged in and trying to access a protected route, redirect to login
  if (!hasSession && !isPublicRoute) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // If the user is logged in and trying to access login/register, redirect to home
  if (hasSession && isPublicRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}; 