import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { adminDb } from '@/../backend/firebaseAdmin';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';

const preferencesSchema = z.object({
  scoreSystem: z.enum(['10point', '5star']),
  profilePublic: z.boolean(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(user.uid);
    await userRef.set({
      preferences: parsed.data
    }, { merge: true });

    return NextResponse.json({ success: true, preferences: parsed.data });
  } catch (err: unknown) {
    console.error('Error updating preferences:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
