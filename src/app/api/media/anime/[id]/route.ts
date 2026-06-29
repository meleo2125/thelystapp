import { NextRequest, NextResponse } from 'next/server';
import { mediaIdSchema } from '@/lib/validation/media';
import { rateLimit } from '@/lib/rateLimit';
import { jikanFetch } from '@/lib/jikan/client';
import {
  normalizeJikanAnimeDetail,
  RawJikanAnimeFull,
  RawJikanRecommendation,
  RawJikanCharacterResult,
} from '@/lib/jikan/normalize';
import { JikanError } from '@/lib/errors';

interface JikanFullResponse {
  data: RawJikanAnimeFull;
}

interface JikanRecsResponse {
  data: RawJikanRecommendation[];
}

interface JikanCharsResponse {
  data: RawJikanCharacterResult[];
}

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
    const fullRes = await jikanFetch<JikanFullResponse>(`/anime/${id}/full`, 86400); // cache full details for 24 hours
    const recsRes = await jikanFetch<JikanRecsResponse>(`/anime/${id}/recommendations`, 604800); // cache recs for 7 days
    const charsRes = await jikanFetch<JikanCharsResponse>(`/anime/${id}/characters`, 604800); // cache cast for 7 days

    const detail = normalizeJikanAnimeDetail(fullRes.data, recsRes.data, charsRes.data);
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof JikanError && err.status === 404) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error(`Error fetching Jikan anime details for ${rawId}:`, err);
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
}
