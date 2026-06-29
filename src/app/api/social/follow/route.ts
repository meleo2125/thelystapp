import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { 
  followUser, 
  unfollowUser, 
  getUserProfile, 
  logActivity, 
  getFollowStatus, 
  requestFollow, 
  cancelFollowRequest 
} from '@/../backend/db';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const followSchema = z.object({
  uid: z.string().min(1),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUid = searchParams.get('uid');

  if (!targetUid) {
    return NextResponse.json({ error: 'Missing target uid' }, { status: 400 });
  }

  try {
    const status = await getFollowStatus(currentUser.uid, targetUid);
    return NextResponse.json({ status });
  } catch (err: unknown) {
    console.error('Error checking follow status:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = followSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid target uid' }, { status: 400 });
    }

    const targetUid = parsed.data.uid;
    if (currentUser.uid === targetUid) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    const targetProfile = await getUserProfile(targetUid);
    if (!targetProfile) {
      return NextResponse.json({ error: 'Target profile not found' }, { status: 404 });
    }

    const isPublic = targetProfile.preferences?.profilePublic === true;
    let status: 'following' | 'requested' = 'following';

    if (isPublic) {
      await followUser(currentUser.uid, targetUid);
      const followerProfile = await getUserProfile(currentUser.uid);
      if (followerProfile) {
        // Write notification to target user
        const { adminDb } = await import('@/../backend/firebaseAdmin');
        await adminDb
          .collection('users')
          .doc(targetUid)
          .collection('notifications')
          .doc(`${currentUser.uid}_follow`)
          .set({
            id: `${currentUser.uid}_follow`,
            type: 'follow',
            requesterUid: currentUser.uid,
            requesterUsername: followerProfile.username || 'user',
            read: false,
            createdAt: new Date().toISOString(),
          });

        await logActivity({
          uid: currentUser.uid,
          username: followerProfile.username || 'user',
          type: 'follow',
          detail: `followed @${targetProfile.username || 'user'}`
        });
      }
    } else {
      const followerProfile = await getUserProfile(currentUser.uid);
      const username = followerProfile?.username || 'user';
      await requestFollow(currentUser.uid, targetUid, username);
      status = 'requested';
    }

    return NextResponse.json({ success: true, status });
  } catch (err: unknown) {
    console.error('Error following user:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUid = searchParams.get('uid');

    if (!targetUid) {
      return NextResponse.json({ error: 'Missing target uid' }, { status: 400 });
    }

    const currentStatus = await getFollowStatus(currentUser.uid, targetUid);

    if (currentStatus === 'requested') {
      await cancelFollowRequest(currentUser.uid, targetUid);
    } else if (currentStatus === 'following') {
      await unfollowUser(currentUser.uid, targetUid);
    }

    return NextResponse.json({ success: true, status: 'none' });
  } catch (err: unknown) {
    console.error('Error unfollowing user:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
