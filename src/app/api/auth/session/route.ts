import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const postSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  rememberMe: z.boolean().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const result = postSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error.issues[0].message }, { status: 400 });
    }
    
    const { token, rememberMe } = result.data;
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

export async function DELETE(): Promise<NextResponse> {
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