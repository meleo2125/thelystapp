const hits = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [ip, rec] of hits.entries()) {
    if (rec.resetAt < now) {
      hits.delete(ip);
    }
  }
}

/**
 * Basic in-memory rate limiter for serverless endpoints.
 * Resets on cold starts (ephemeral memory on free serverless tier).
 */
export function rateLimit(ip: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  
  // Clean up stale entries if memory footprint is getting large
  if (hits.size > 1000) {
    cleanup();
  }

  const rec = hits.get(ip);
  
  if (!rec || rec.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (rec.count >= max) {
    return false;
  }
  
  rec.count += 1;
  return true;
}
