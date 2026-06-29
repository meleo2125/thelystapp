import { jikanBucket } from './limiter';
import { JikanError } from '../errors';

/**
 * Fetches data from Jikan API, applying the outbound token bucket limiter.
 * Automatically backs off and retries once if Jikan returns an HTTP 429.
 */
export async function jikanFetch<T>(path: string, revalidate = 86400, retryCount = 0): Promise<T> {
  await jikanBucket.acquire();
  
  const res = await fetch(`https://api.jikan.moe/v4${path}`, {
    next: { revalidate, tags: ['jikan', `jikan:${path.split('?')[0]}`] },
  });
  
  if (res.status === 429) {
    if (retryCount < 3) {
      // Upstream rate limit hit — wait 2 seconds and retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      return jikanFetch(path, revalidate, retryCount + 1);
    }
  }
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new JikanError(res.status, errorText);
  }
  
  return res.json() as Promise<T>;
}
