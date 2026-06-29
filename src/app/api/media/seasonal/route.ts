import { NextRequest, NextResponse } from 'next/server';
import { mediaSeasonalSchema } from '@/lib/validation/media';
import { rateLimit } from '@/lib/rateLimit';
import { jikanFetch } from '@/lib/jikan/client';
import { normalizeJikanAnimeSummary, RawJikanAnimeSummary } from '@/lib/jikan/normalize';
import { MediaSummary } from '@/types/media';

interface JikanSeasonalResponse {
  data: RawJikanAnimeSummary[];
  pagination: {
    has_next_page: boolean;
  };
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || undefined;
  const season = searchParams.get('season') || undefined;
  const page = searchParams.get('page') ?? '1';

  const validation = mediaSeasonalSchema.safeParse({ year, season, page });
  if (!validation.success) {
    return NextResponse.json({ error: 'bad_input', details: validation.error.format() }, { status: 400 });
  }

  const pageNum = validation.data.page;
  const targetYear = validation.data.year;
  const targetSeason = validation.data.season;

  try {
    let path = '';
    if (targetYear && targetSeason) {
      path = `/seasons/${targetYear}/${targetSeason}?page=${pageNum}`;
    } else {
      path = `/seasons/now?page=${pageNum}`;
    }

    const res = await jikanFetch<JikanSeasonalResponse>(path, 21600); // cache for 6 hours
    const items = res.data.map(normalizeJikanAnimeSummary);
    const nextPage = res.pagination.has_next_page ? pageNum + 1 : null;

    return NextResponse.json({ items, nextPage });
  } catch (err) {
    console.error('Error during media seasonal fetch:', err);
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
