import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '../../../../../backend/firebaseAdmin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('auth-session');
    
    if (!session?.value) {
      return NextResponse.json(
        { authenticated: false, error: 'No session found' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token with Firebase Admin
      const decodedToken = await adminAuth.verifyIdToken(session.value);
      
      return NextResponse.json(
        { 
          authenticated: true, 
          user: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified
          }
        },
        { status: 200 }
      );
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      // Make sure we always return valid JSON
      return NextResponse.json(
        { authenticated: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    // Ensure we return valid JSON even in case of unexpected errors
    return NextResponse.json(
      { authenticated: false, error: 'Server error occurred' },
      { status: 500 }
    );
  }
} 