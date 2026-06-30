import { cookies } from 'next/headers';
import { adminAuth } from '@/backend/firebaseAdmin';

export interface SessionUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('auth-session');
    
    if (!session?.value) {
      return null;
    }
    
    const decodedToken = await adminAuth.verifyIdToken(session.value);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
  } catch (err) {
    console.warn('Session verification failed:', err);
    return null;
  }
}
