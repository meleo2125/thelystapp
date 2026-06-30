import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  addItemToLyst,
  removeItemFromLyst,
  getLyst,
  upsertListEntry,
  getListEntry,
} from '@/../backend/db';
import { lystItemAddSchema } from '@/lib/validation/list';
import { getDeterministicEntryId } from '@/lib/list/entryId';
import { rateLimit } from '@/lib/rateLimit';

interface RouteContext {
  params: Promise<{ lystId: string }>;
}

/**
 * POST /api/lysts/[lystId]/items
 *   Adds a media item to the Lyst. If the user doesn't already have a
 *   ListEntry for the media, a statusless ("status: 'none'") entry is created
 *   so that the entry can be referenced from the Lyst.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = lystItemAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const lyst = await getLyst(user.uid, lystId);
    if (!lyst) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { type, sourceId, cache } = parsed.data;
    const entryId = getDeterministicEntryId(type, sourceId);

    // Make sure a ListEntry exists (statusless if newly created).
    const existing = await getListEntry(user.uid, entryId);
    if (!existing) {
      await upsertListEntry(user.uid, entryId, {
        type,
        sourceId,
        status: 'none',
        score: null,
        progress: 0,
        notes: '',
        startedAt: null,
        completedAt: null,
        cache: {
          title: cache.title,
          titleNormalized: cache.title.toLowerCase(),
          posterPath: cache.posterPath || null,
          year: cache.year ?? null,
          totalEpisodes: cache.totalEpisodes ?? null,
          lastSyncedAt: new Date().toISOString(),
        },
      });
    }

    const result = await addItemToLyst(user.uid, lystId, {
      entryId,
      type,
      sourceId,
      title: cache.title,
      posterPath: cache.posterPath || null,
      addedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Error adding item to lyst:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/lysts/[lystId]/items?entryId=movie-12345
 */
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
  const entryId = new URL(req.url).searchParams.get('entryId');
  if (!entryId) {
    return NextResponse.json({ error: 'Missing entryId' }, { status: 400 });
  }

  try {
    const lyst = await getLyst(user.uid, lystId);
    if (!lyst) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const result = await removeItemFromLyst(user.uid, lystId, entryId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('Error removing lyst item:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
