import { NextRequest, NextResponse } from 'next/server';
import { mediaSearchSchema } from '@/lib/validation/media';
import { rateLimit } from '@/lib/rateLimit';
import { tmdbFetch } from '@/lib/tmdb/client';
import { jikanFetch } from '@/lib/jikan/client';
import { normalizeTmdbMovieSummary, normalizeTmdbTvSummary, RawTmdbMovieSummary, RawTmdbTvSummary } from '@/lib/tmdb/normalize';
import { normalizeJikanAnimeSummary, RawJikanAnimeSummary } from '@/lib/jikan/normalize';
import { MediaSummary } from '@/types/media';

interface TmdbSearchResponse<T> {
  results: T[];
  total_pages: number;
}

interface JikanSearchResponse {
  data: RawJikanAnimeSummary[];
  pagination: {
    has_next_page: boolean;
  };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || undefined;
  const type = searchParams.get('type') || undefined;
  const page = searchParams.get('page') || undefined;

  const validation = mediaSearchSchema.safeParse({ q, type, page });
  if (!validation.success) {
    return NextResponse.json({ error: 'bad_input', details: validation.error.format() }, { status: 400 });
  }


  const query = validation.data.q;
  const mediaType = validation.data.type;
  const pageNum = validation.data.page;

  try {
    let items: MediaSummary[] = [];
    let nextPage: number | null = null;

    if (mediaType === 'movie') {
      const path = `/search/movie?query=${encodeURIComponent(query)}&page=${pageNum}&include_adult=false`;
      const res = await tmdbFetch<TmdbSearchResponse<RawTmdbMovieSummary>>(path, 3600);
      items = res.results.map(normalizeTmdbMovieSummary);
      nextPage = pageNum < res.total_pages ? pageNum + 1 : null;
    } else if (mediaType === 'tv') {
      const path = `/search/tv?query=${encodeURIComponent(query)}&page=${pageNum}&include_adult=false`;
      const res = await tmdbFetch<TmdbSearchResponse<RawTmdbTvSummary>>(path, 3600);
      items = res.results.map(normalizeTmdbTvSummary);
      nextPage = pageNum < res.total_pages ? pageNum + 1 : null;
    } else if (mediaType === 'anime') {
      const path = `/anime?q=${encodeURIComponent(query)}&page=${pageNum}&sfw=true&order_by=popularity`;
      const res = await jikanFetch<JikanSearchResponse>(path, 3600);
      items = res.data.map(normalizeJikanAnimeSummary);
      nextPage = res.pagination.has_next_page ? pageNum + 1 : null;
    } else {
      // Parallel multi-source search for 'all'
      const moviePath = `/search/movie?query=${encodeURIComponent(query)}&page=1&include_adult=false`;
      const tvPath = `/search/tv?query=${encodeURIComponent(query)}&page=1&include_adult=false`;
      const animePath = `/anime?q=${encodeURIComponent(query)}&page=1&sfw=true&order_by=popularity`;

      const [movieRes, tvRes, animeRes] = await Promise.allSettled([
        tmdbFetch<TmdbSearchResponse<RawTmdbMovieSummary>>(moviePath, 3600),
        tmdbFetch<TmdbSearchResponse<RawTmdbTvSummary>>(tvPath, 3600),
        jikanFetch<JikanSearchResponse>(animePath, 3600),
      ]);

      const movies = movieRes.status === 'fulfilled' ? movieRes.value.results.slice(0, 8).map(normalizeTmdbMovieSummary) : [];
      const tvs = tvRes.status === 'fulfilled' ? tvRes.value.results.slice(0, 8).map(normalizeTmdbTvSummary) : [];
      const animes = animeRes.status === 'fulfilled' ? animeRes.value.data.slice(0, 8).map(normalizeJikanAnimeSummary) : [];

      items = [...movies, ...tvs, ...animes];
      nextPage = null;
    }

    return NextResponse.json({ items, results: items, nextPage });

  } catch (err) {
    console.error('Error during media search:', err);
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
