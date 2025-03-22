import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

// Define public routes that don't require authentication
const publicRoutes = ["/login", "/register", "/api/auth/send-otp", "/api/auth/verify-otp"];

export async function middleware(request: NextRequest) {
  const session = cookies().get("session")?.value;
  
  // Check if the path is public
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || 
    request.nextUrl.pathname.startsWith(route + "/")
  );
  
  // If there's no session and the route is not public, redirect to login
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // If there's a session and the user is trying to access login or register, redirect to home
  if (session && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}; 