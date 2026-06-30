import { jikanBucket } from './limiter';
import { JikanError } from '../errors';

/**
 * Fetches data from Jikan API, applying the outbound token bucket limiter.
 * Automatically backs off and retries once if Jikan returns an HTTP 429.
 */
async function fetchWithRetry(url: string, init?: RequestInit, retries = 3, delay = 300): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    const isTransient = err instanceof Error && (
      err.message.includes('ECONNRESET') ||
      err.message.includes('fetch failed') ||
      err.message.includes('ENOTFOUND') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('socket hang up')
    );
    if (isTransient && retries > 0) {
      console.warn(`Transient fetch error in Jikan client. Retrying in ${delay}ms... (${retries} retries left). Error:`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, init, retries - 1, delay * 2);
    }
    throw err;
  }
}

/**
 * Fetches data from Jikan API, applying the outbound token bucket limiter.
 * Automatically backs off and retries once if Jikan returns an HTTP 429.
 */
export async function jikanFetch<T>(path: string, revalidate = 86400, retryCount = 0): Promise<T> {
  await jikanBucket.acquire();
  
  let res: Response;
  try {
    res = await fetchWithRetry(`https://api.jikan.moe/v4${path}`, {
      next: { revalidate, tags: ['jikan', `jikan:${path.split('?')[0]}`] },
    });
  } catch (err) {
    console.error('Fatal fetch error in Jikan client:', err);
    throw err;
  }
  
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
