import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  getListEntry,
  upsertListEntry,
  deleteListEntry,
  logActivity,
  getUserProfile,
} from '@/../backend/db';
import { updateEntrySchema } from '@/lib/validation/list';
import { rateLimit } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ entryId: string }>;
}

// Reject anything that doesn't match our deterministic "{type}-{sourceId}" id.
const ENTRY_ID_RE = /^(movie|tv|anime)-\d+$/;

export async function GET(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;
  if (!ENTRY_ID_RE.test(entryId)) {
    return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 });
  }

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }
    return NextResponse.json({ success: true, data: existing });
  } catch (error) {
    console.error('Error fetching list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;
  if (!ENTRY_ID_RE.test(entryId)) {
    return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 });
  }

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = updateEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // FIX: the previous version spread `...existing` into the partial update,
    // which had the side effect of resetting unrelated fields back to their
    // stored values on every PATCH. upsertListEntry now properly merges.
    const updated = await upsertListEntry(user.uid, entryId, parsed.data);

    if (parsed.data.status && parsed.data.status !== existing.status) {
      if (parsed.data.status === 'watching' || parsed.data.status === 'completed') {
        try {
          const profile = await getUserProfile(user.uid);
          const username = profile?.username || 'user';
          await logActivity({
            uid: user.uid,
            username,
            type: parsed.data.status,
            mediaType: existing.type,
            sourceId: existing.sourceId,
            mediaTitle: existing.cache.title,
            mediaPoster: existing.cache.posterPath || null,
            detail: parsed.data.status === 'completed' ? 'completed' : 'started watching'
          });
        } catch (logErr) {
          console.error('Error logging watch status update activity:', logErr);
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entryId } = await params;
  if (!ENTRY_ID_RE.test(entryId)) {
    return NextResponse.json({ error: 'Invalid entryId' }, { status: 400 });
  }

  try {
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    await deleteListEntry(user.uid, entryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
