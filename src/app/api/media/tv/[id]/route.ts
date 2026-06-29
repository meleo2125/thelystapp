import { NextRequest, NextResponse } from 'next/server';
import { mediaIdSchema } from '@/lib/validation/media';
import { rateLimit } from '@/lib/rateLimit';
import { tmdbFetch } from '@/lib/tmdb/client';
import { normalizeTmdbTvDetail, RawTmdbTvDetail } from '@/lib/tmdb/normalize';
import { TmdbError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { id: rawId } = await ctx.params;
  const validation = mediaIdSchema.safeParse(rawId);
  if (!validation.success) {
    return NextResponse.json({ error: 'bad_id' }, { status: 400 });
  }

  const id = validation.data;

  try {
    const path = `/tv/${id}?append_to_response=credits,videos,similar,content_ratings`;
    // Cache for 24 hours (86400 seconds)
    const rawDetail = await tmdbFetch<RawTmdbTvDetail>(path, 86400);
    const detail = normalizeTmdbTvDetail(rawDetail);
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error(`Error fetching TMDB TV details for ${rawId}:`, err);
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
