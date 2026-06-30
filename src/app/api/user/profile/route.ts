import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { getUserProfile } from '@/backend/db';
import { adminDb } from '@/backend/firebaseAdmin';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  favoriteGenres: z.array(z.string()).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err: unknown) {
    console.error('Error fetching user profile:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updates = parsed.data;
    
    // Perform update in Firestore
    const userRef = adminDb.collection('users').doc(user.uid);
    await userRef.set(updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error updating user profile:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
