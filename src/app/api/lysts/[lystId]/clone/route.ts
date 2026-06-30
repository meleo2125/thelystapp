import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { cloneLyst, getUserProfile, getLyst } from '@/../backend/db';
import { rateLimit } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ lystId: string }>;
}

/**
 * POST /api/lysts/[lystId]/clone
 *   body: { ownerUid: string }
 *   Clones the specified public Lyst into the signed-in user's account.
 */
export async function POST(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lystId } = await params;
  let body: { ownerUid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const ownerUid = body?.ownerUid;
  if (!ownerUid) {
    return NextResponse.json({ error: 'Missing ownerUid' }, { status: 400 });
  }

  try {
    const source = await getLyst(ownerUid, lystId);
    if (!source) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!source.isPublic && ownerUid !== user.uid) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const me = await getUserProfile(user.uid);
    const username = me?.username || 'user';
    const cloned = await cloneLyst(ownerUid, lystId, user.uid, username);
    return NextResponse.json({ success: true, data: cloned });
  } catch (err) {
    console.error('Error cloning lyst:', err);
    const msg = err instanceof Error ? err.message : 'internal_error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
