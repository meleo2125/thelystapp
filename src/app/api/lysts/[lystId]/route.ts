import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  getLyst,
  updateLyst,
  deleteLyst,
  getLystItems,
  getUserVoteOnLyst,
} from '@/../backend/db';
import { updateLystSchema } from '@/lib/validation/list';
import { rateLimit } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ lystId: string }>;
}

/**
 * GET /api/lysts/[lystId]?ownerUid=...
 *   Returns the Lyst document, its items, and (if signed-in) the viewer's
 *   like/dislike vote. Respects visibility:
 *     - owner can read regardless of `isPublic`
 *     - others can only read when `isPublic === true`
 */
export async function GET(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { lystId } = await params;
  const { searchParams } = new URL(req.url);
  const ownerUid = searchParams.get('ownerUid');

  const sessionUser = await getSessionUser();
  const ownerToUse = ownerUid || sessionUser?.uid;
  if (!ownerToUse) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const lyst = await getLyst(ownerToUse, lystId);
    if (!lyst) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const isOwner = sessionUser?.uid === ownerToUse;
    if (!isOwner && !lyst.isPublic) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const items = await getLystItems(ownerToUse, lystId);

    let userVote: 'like' | 'dislike' | 'none' = 'none';
    if (sessionUser && !isOwner) {
      userVote = await getUserVoteOnLyst(ownerToUse, lystId, sessionUser.uid);
    }

    return NextResponse.json({
      success: true,
      data: { lyst, items, userVote, isOwner },
    });
  } catch (err) {
    console.error('Error reading lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(
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
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateLystSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const updated = await updateLyst(user.uid, lystId, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(
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
  try {
    const existing = await getLyst(user.uid, lystId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    await deleteLyst(user.uid, lystId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
