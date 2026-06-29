import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { 
  getNotifications, 
  markNotificationsAsRead, 
  acceptFollowRequest, 
  declineFollowRequest, 
  getUserProfile 
} from '@/../backend/db';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const patchSchema = z.object({
  action: z.enum(['accept', 'decline']),
  requesterUid: z.string().min(1),
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

  try {
    const notifications = await getNotifications(user.uid);
    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
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
    await markNotificationsAsRead(user.uid);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { action, requesterUid } = parsed.data;

    if (action === 'accept') {
      const [requesterProfile, targetProfile] = await Promise.all([
        getUserProfile(requesterUid),
        getUserProfile(user.uid),
      ]);

      if (!requesterProfile || !targetProfile) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      await acceptFollowRequest(
        user.uid,
        requesterUid,
        requesterProfile.username,
        targetProfile.username
      );
    } else {
      await declineFollowRequest(user.uid, requesterUid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error processing follow request action:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
