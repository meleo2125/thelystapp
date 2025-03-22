import { auth } from '../../../../../backend/firebase';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Extract token from request body
    const { token, rememberMe } = await request.json();
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'No token provided' }, { status: 400 });
    }
    
    const expiresIn = rememberMe ? 60 * 60 * 24 * 14 : 60 * 60 * 24; // 14 days or 1 day in seconds
    
    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'auth-session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn,
      path: '/',
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting session:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    // Delete the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth-session');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
} 