import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { getFollowingActivities } from '@/backend/db';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const list = await getFollowingActivities(user.uid);
    // FIX: previously this endpoint returned `{ activities }` but the
    // Navbar UI reads `json.data`. Return both keys for compatibility.
    return NextResponse.json({ success: true, data: list, activities: list });
  } catch (err: unknown) {
    console.error('Error fetching social feed activities:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { clearUserFeed } = await import('@/backend/db');
    await clearUserFeed(user.uid);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error clearing social feed activities:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
