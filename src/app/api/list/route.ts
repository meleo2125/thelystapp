import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import {
  getUserList,
  findDuplicateAcrossTypes,
  upsertListEntry,
  getUserByUsername,
  getFollowStatus,
  addItemToLyst,
  getLyst,
  logActivity,
  getUserProfile,
} from '@/../backend/db';
import { createEntrySchema } from '@/lib/validation/list';
import { getDeterministicEntryId } from '@/lib/list/entryId';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const list = await getUserList(user.uid);
      return NextResponse.json({ success: true, data: list });
    } catch (error) {
      console.error('Error fetching list:', error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  try {
    const profile = await getUserByUsername(username);
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessionUser = await getSessionUser();
    const isOwner = sessionUser?.uid === profile.uid;
    const isProfilePublic = profile.preferences?.profilePublic === true;

    let isFollower = false;
    if (sessionUser && !isOwner) {
      const status = await getFollowStatus(sessionUser.uid, profile.uid);
      isFollower = status === 'following';
    }

    if (!isProfilePublic && !isOwner && !isFollower) {
      return NextResponse.json({ error: 'profile_private' }, { status: 403 });
    }

    const list = await getUserList(profile.uid);
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('Error fetching public list:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const { type, sourceId, cache, lystIds, ignoreConflict, ...fields } =
      parsed.data;
    const entryId = getDeterministicEntryId(type, sourceId);

    const duplicate = await findDuplicateAcrossTypes(user.uid, sourceId, type);
    if (duplicate && !ignoreConflict) {
      return NextResponse.json(
        {
          success: false,
          conflict: true,
          message: `This item is already being tracked as a ${duplicate.type} (${duplicate.cache.title}).`,
          duplicate,
        },
        { status: 409 }
      );
    }

    const entry = await upsertListEntry(user.uid, entryId, {
      type,
      sourceId,
      status: fields.status,
      score: fields.score,
      progress: fields.progress,
      notes: fields.notes,
      startedAt: fields.startedAt,
      completedAt: fields.completedAt,
      lystIds,
      cache: {
        title: cache.title,
        titleNormalized: cache.title.toLowerCase(),
        posterPath: cache.posterPath || null,
        year: cache.year ?? null,
        totalEpisodes: cache.totalEpisodes ?? null,
        lastSyncedAt: new Date().toISOString(),
      },
    });

    if (fields.status === 'watching' || fields.status === 'completed') {
      try {
        const profile = await getUserProfile(user.uid);
        const username = profile?.username || 'user';
        await logActivity({
          uid: user.uid,
          username,
          type: fields.status,
          mediaType: type,
          sourceId,
          mediaTitle: cache.title,
          mediaPoster: cache.posterPath || null,
          detail: fields.status === 'completed' ? 'completed' : 'started watching'
        });
      } catch (logErr) {
        console.error('Error logging watch activity:', logErr);
      }
    }

    // Attach to any custom Lysts the client requested.
    if (lystIds && lystIds.length > 0) {
      await Promise.all(
        lystIds.map(async (lystId) => {
          const lyst = await getLyst(user.uid, lystId);
          if (!lyst) return; // ignore invalid IDs silently
          await addItemToLyst(user.uid, lystId, {
            entryId,
            type,
            sourceId,
            title: cache.title,
            posterPath: cache.posterPath || null,
            addedAt: new Date().toISOString(),
          });
        })
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error adding list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
