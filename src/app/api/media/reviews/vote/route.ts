import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { voteReview, getUserVoteOnReview } from '@/../backend/db';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const voteSchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.number().int().positive(),
  reviewUid: z.string().min(1),
  voteType: z.enum(['like', 'dislike', 'none']),
  mediaTitle: z.string().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const sourceIdStr = searchParams.get('sourceId');
  const reviewUid = searchParams.get('reviewUid');

  if (!type || !sourceIdStr || !reviewUid) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const sourceId = parseInt(sourceIdStr, 10);
  if (isNaN(sourceId)) {
    return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 });
  }

  try {
    const vote = await getUserVoteOnReview(type, sourceId, reviewUid, user.uid);
    return NextResponse.json({ success: true, vote });
  } catch (err) {
    console.error('Error fetching review vote status:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { type, sourceId, reviewUid, voteType, mediaTitle } = parsed.data;

    // Prevent self-voting
    if (user.uid === reviewUid) {
      return NextResponse.json({ error: 'You cannot vote on your own review' }, { status: 400 });
    }

    const counts = await voteReview(type, sourceId, reviewUid, user.uid, voteType);

    // If voting user is not the review author, manage notifications
    if (user.uid !== reviewUid) {
      const { adminDb } = await import('@/../backend/firebaseAdmin');
      const notificationId = `${user.uid}_like_${type}_${sourceId}`;
      const notifRef = adminDb
        .collection('users')
        .doc(reviewUid)
        .collection('notifications')
        .doc(notificationId);

      if (voteType === 'like') {
        const { getUserProfile } = await import('@/../backend/db');
        const voterProfile = await getUserProfile(user.uid);
        await notifRef.set({
          id: notificationId,
          type: 'like',
          requesterUid: user.uid,
          requesterUsername: voterProfile?.username || 'user',
          mediaType: type,
          sourceId,
          mediaTitle: mediaTitle || 'your review',
          read: false,
          createdAt: new Date().toISOString(),
        });
      } else {
        // If they click dislike or none, remove the like notification
        await notifRef.delete();
      }
    }

    return NextResponse.json({ success: true, ...counts });
  } catch (err) {
    console.error('Error recording review vote:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
