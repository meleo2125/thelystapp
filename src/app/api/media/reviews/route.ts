import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/firebase/sessions';
import { upsertReview, deleteReview, getReviews, getUserProfile, logActivity } from '@/../backend/db';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const getReviewsSchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.coerce.number().int().positive(),
});

const postReviewSchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.number().int().positive(),
  content: z.string().min(1).max(5000),
  isSpoiler: z.boolean(),
  rating: z.number().min(1).max(5).nullable().optional(),
  cache: z.object({
    title: z.string().min(1),
    posterPath: z.string().nullable(),
  }),
});

const deleteReviewSchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const sourceId = searchParams.get('sourceId');

  const validation = getReviewsSchema.safeParse({ type, sourceId });
  if (!validation.success) {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  try {
    const list = await getReviews(validation.data.type, validation.data.sourceId);
    
    const user = await getSessionUser();
    let reviewsWithVotes = list;

    if (user) {
      const { getUserVoteOnReview } = await import('@/../backend/db');
      reviewsWithVotes = await Promise.all(
        list.map(async (rev) => {
          const userVote = await getUserVoteOnReview(validation.data.type, validation.data.sourceId, rev.uid, user.uid);
          return { ...rev, userVote };
        })
      );
    }

    // Sort reviews:
    // 1. Logged-in user's own review at the very top (so they can manage/delete it easily)
    // 2. Ranked by whichever is highest likes or dislikes descending (keeps controversial/negative reviews visible)
    // 3. Ranked by updatedAt descending (newer first)
    reviewsWithVotes.sort((a, b) => {
      if (user) {
        if (a.uid === user.uid && b.uid !== user.uid) return -1;
        if (b.uid === user.uid && a.uid !== user.uid) return 1;
      }

      const scoreA = Math.max(a.likesCount || 0, a.dislikesCount || 0);
      const scoreB = Math.max(b.likesCount || 0, b.dislikesCount || 0);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json({ reviews: reviewsWithVotes });
  } catch (err: unknown) {
    console.error('Error fetching reviews:', err);
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
    const parsed = postReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { type, sourceId, content, isSpoiler, rating = null, cache } = parsed.data;

    // Get user profile to log username
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const username = profile.username || 'user';

    const review = await upsertReview(type, sourceId, user.uid, username, content, isSpoiler, rating);

    // Log this activity
    await logActivity({
      uid: user.uid,
      username,
      type: 'review',
      mediaType: type,
      sourceId,
      mediaTitle: cache.title,
      mediaPoster: cache.posterPath,
      detail: `reviewed this title`
    });

    return NextResponse.json({ success: true, review });
  } catch (err: unknown) {
    console.error('Error saving review:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const sourceId = searchParams.get('sourceId');

    const validation = deleteReviewSchema.safeParse({ type, sourceId });
    if (!validation.success) {
      return NextResponse.json({ error: 'bad_input' }, { status: 400 });
    }

    await deleteReview(validation.data.type, validation.data.sourceId, user.uid);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting review:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
