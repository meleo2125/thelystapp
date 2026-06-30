import { NextRequest, NextResponse } from 'next/server';
import { getTopPublicLysts } from '@/backend/db';
import { rateLimit } from '@/lib/rateLimit';
import { z } from 'zod';

const windowSchema = z.object({
  window: z.enum(['week', 'month', 'year', 'all']).default('week'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/lysts/rankings?window=week|month|year|all&limit=10
 *   Returns the top public Lysts by net likes within the time window.
 *   Used by the home-page leaderboard (Task 3).
 *
 * This endpoint is public — anyone can read the leaderboard.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (!rateLimit(ip, 60, 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = windowSchema.safeParse({
    window: searchParams.get('window') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const lysts = await getTopPublicLysts(parsed.data.window, parsed.data.limit);
    return NextResponse.json({
      success: true,
      data: lysts,
      window: parsed.data.window,
    });
  } catch (err) {
    console.error('Error fetching lyst rankings:', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
