import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  voteOnLyst,
  getUserVoteOnLyst,
  getLyst,
  getUserProfile,
  createSystemNotification,
} from '@/../backend/db';
import { lystVoteSchema } from '@/lib/validation/list';
import { rateLimit } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ lystId: string }>;
}

/**
 * POST /api/lysts/[lystId]/vote
 *   body: { voteType: 'like' | 'dislike' | 'none', ownerUid: string }
 */
export async function POST(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lystId } = await params;
  let body: { ownerUid?: string; voteType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const ownerUid = body?.ownerUid;
  if (!ownerUid || typeof ownerUid !== 'string') {
    return NextResponse.json({ error: 'Missing ownerUid' }, { status: 400 });
  }
  const parsed = lystVoteSchema.safeParse({ voteType: body.voteType });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }
  if (ownerUid === user.uid) {
    return NextResponse.json(
      { error: 'You cannot vote on your own Lyst' },
      { status: 400 }
    );
  }

  try {
    const lyst = await getLyst(ownerUid, lystId);
    if (!lyst) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (!lyst.isPublic) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const counts = await voteOnLyst(
      ownerUid,
      lystId,
      user.uid,
      parsed.data.voteType
    );

    // Best-effort notification to the Lyst owner on a fresh "like".
    if (parsed.data.voteType === 'like') {
      try {
        const voterProfile = await getUserProfile(user.uid);
        await createSystemNotification(ownerUid, {
          id: `${user.uid}_lyst_like_${lystId}`,
          type: 'lyst_like',
          requesterUid: user.uid,
          requesterUsername: voterProfile?.username || 'user',
          lystId,
          lystName: lyst.name,
        });
      } catch (err) {
        console.warn('Failed to write lyst-like notification:', err);
      }
    }

    return NextResponse.json({ success: true, ...counts });
  } catch (err) {
    console.error('Error voting on lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * GET /api/lysts/[lystId]/vote?ownerUid=...
 *   Returns the signed-in user's current vote (or 'none').
 */
export async function GET(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { lystId } = await params;
  const ownerUid = new URL(req.url).searchParams.get('ownerUid');
  if (!ownerUid) {
    return NextResponse.json({ error: 'Missing ownerUid' }, { status: 400 });
  }
  try {
    const vote = await getUserVoteOnLyst(ownerUid, lystId, user.uid);
    return NextResponse.json({ success: true, vote });
  } catch (err) {
    console.error('Error fetching lyst vote:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
