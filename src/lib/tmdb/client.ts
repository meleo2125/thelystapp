import { env } from '../env';
import { TmdbError } from '../errors';

/**
 * Fetches data from TMDB API with Next.js caching.
 * Automatically handles either Bearer Token (ACCESS_TOKEN) or API Key (TMDB_API_KEY).
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
      console.warn(`Transient fetch error in TMDB client. Retrying in ${delay}ms... (${retries} retries left). Error:`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, init, retries - 1, delay * 2);
    }
    throw err;
  }
}

/**
 * Fetches data from TMDB API with Next.js caching.
 * Automatically handles either Bearer Token (ACCESS_TOKEN) or API Key (TMDB_API_KEY).
 */
export async function tmdbFetch<T>(path: string, revalidate = 86400): Promise<T> {
  if (!env.isServer) {
    throw new TmdbError(500, 'TMDB fetch client can only be used on the server side.');
  }

  const hasBearer = !!env.ACCESS_TOKEN;
  let url = `https://api.themoviedb.org/3${path}`;
  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (hasBearer) {
    headers.Authorization = `Bearer ${env.ACCESS_TOKEN}`;
  } else {
    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) {
      throw new TmdbError(500, 'TMDB API authentication configuration is missing.');
    }
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}api_key=${apiKey}`;
  }


  let res: Response;
  try {
    res = await fetchWithRetry(url, {
      headers,
      next: { revalidate, tags: ['tmdb', `tmdb:${path.split('?')[0]}`] },
    });
  } catch (err) {
    console.error('Fatal fetch error in TMDB client:', err);
    throw err;
  }

  if (!res.ok) {
    const errorText = await res.text();
    throw new TmdbError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}
