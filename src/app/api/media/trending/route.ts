import { NextRequest, NextResponse } from 'next/server';
import { mediaTrendingSchema } from '@/lib/validation/media';
import { rateLimit } from '@/lib/rateLimit';
import { tmdbFetch } from '@/lib/tmdb/client';
import { jikanFetch } from '@/lib/jikan/client';
import { normalizeTmdbMovieSummary, normalizeTmdbTvSummary, RawTmdbMovieSummary, RawTmdbTvSummary } from '@/lib/tmdb/normalize';
import { normalizeJikanAnimeSummary, RawJikanAnimeSummary } from '@/lib/jikan/normalize';
import { MediaSummary } from '@/types/media';

interface TmdbTrendingResponse<T> {
  results: T[];
}

interface JikanTopResponse {
  data: RawJikanAnimeSummary[];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'movie';

  const validation = mediaTrendingSchema.safeParse({ type });
  if (!validation.success) {
    return NextResponse.json({ error: 'bad_input', details: validation.error.format() }, { status: 400 });
  }

  const mediaType = validation.data.type;

  try {
    let items: MediaSummary[] = [];

    if (mediaType === 'movie') {
      const res = await tmdbFetch<TmdbTrendingResponse<RawTmdbMovieSummary>>('/trending/movie/week', 3600); // 1hr cache
      items = res.results.slice(0, 20).map(normalizeTmdbMovieSummary);
    } else if (mediaType === 'tv') {
      const res = await tmdbFetch<TmdbTrendingResponse<RawTmdbTvSummary>>('/trending/tv/week', 3600); // 1hr cache
      items = res.results.slice(0, 20).map(normalizeTmdbTvSummary);
    } else { // anime
      // Use /seasons/now to get currently airing/popular anime for trending
      const res = await jikanFetch<JikanTopResponse>('/seasons/now', 21600); // 6hr cache
      items = res.data.slice(0, 20).map(normalizeJikanAnimeSummary);
    }

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Error during media trending fetch:', err);
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
