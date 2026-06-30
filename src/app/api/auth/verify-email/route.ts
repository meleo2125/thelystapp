import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/backend/firebaseAdmin';
import { cookies } from 'next/headers';
import { z } from 'zod';

const bodySchema = z.object({
  uid: z.string().min(1, 'UID is required'),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('auth-session');

    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session token belongs to the requesting user
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(session.value);
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const result = bodySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    // Prevent one user from updating another user's emailVerified
    if (decodedToken.uid !== result.data.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await adminAuth.updateUser(result.data.uid, { emailVerified: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating emailVerified status:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
