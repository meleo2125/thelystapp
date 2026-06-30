import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  createLyst,
  getUserLysts,
  getUserProfile,
  getUserByUsername,
  getPublicUserLysts,
  logActivity,
} from '@/backend/db';
import { createLystSchema } from '@/lib/validation/list';
import { rateLimit } from '@/lib/rateLimit';

/**
 * GET /api/lysts
 *   - no `username` → returns the signed-in user's lysts
 *   - `?username=foo` → returns the public lysts for that user (respects
 *     profile privacy)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  try {
    if (!username) {
      const user = await getSessionUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const lysts = await getUserLysts(user.uid);
      return NextResponse.json({ success: true, data: lysts });
    }

    const profile = await getUserByUsername(username);
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessionUser = await getSessionUser();
    const isOwner = sessionUser?.uid === profile.uid;

    if (isOwner) {
      const lysts = await getUserLysts(profile.uid);
      return NextResponse.json({ success: true, data: lysts });
    }

    // Public lysts are always visible regardless of profile privacy.
    // Profile privacy controls the main watchlyst, not explicitly public custom lysts.
    const lysts = await getPublicUserLysts(profile.uid);
    return NextResponse.json({ success: true, data: lysts });
  } catch (err) {
    console.error('Error fetching lysts:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * POST /api/lysts — create a new custom Lyst
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createLystSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const profile = await getUserProfile(user.uid);
    const username = profile?.username || 'user';
    const lyst = await createLyst(user.uid, username, parsed.data);
    if (lyst.isPublic) {
      await logActivity({
        uid: user.uid,
        username,
        type: 'lyst_created',
        detail: `created a new Lyst: "${lyst.name}"`
      });
    }
    return NextResponse.json({ success: true, data: lyst });
  } catch (err) {
    console.error('Error creating lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
