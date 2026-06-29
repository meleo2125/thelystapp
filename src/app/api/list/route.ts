import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { getUserList, findDuplicateAcrossTypes, upsertListEntry, getUserByUsername } from '@/../backend/db';
import { createEntrySchema } from '@/lib/validation/list';
import { getDeterministicEntryId } from '@/lib/list/entryId';

export async function GET(request: NextRequest): Promise<NextResponse> {
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
      const { getFollowStatus } = await import('@/../backend/db');
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
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { type, sourceId, cache, ...fields } = parsed.data;
    const entryId = getDeterministicEntryId(type, sourceId);

    // Check for duplicate across different media types (e.g. tracking Anime vs Movie with same sourceId)
    const duplicate = await findDuplicateAcrossTypes(user.uid, sourceId, type);
    const ignoreConflict = body.ignoreConflict === true;

    if (duplicate && !ignoreConflict) {
      return NextResponse.json(
        { 
          success: false, 
          conflict: true, 
          message: `This item is already being tracked as a ${duplicate.type} (${duplicate.cache.title}).`,
          duplicate 
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
      cache: {
        title: cache.title,
        titleNormalized: cache.title.toLowerCase(),
        posterPath: cache.posterPath || null,
        year: cache.year || null,
        totalEpisodes: cache.totalEpisodes || null,
        lastSyncedAt: new Date().toISOString(),
      }
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error adding list entry:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
