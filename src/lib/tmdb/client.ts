import { env } from '../env';
import { TmdbError } from '../errors';

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


  const res = await fetch(url, {
    headers,
    next: { revalidate, tags: ['tmdb', `tmdb:${path.split('?')[0]}`] },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new TmdbError(res.status, errorText);
  }

  return res.json() as Promise<T>;
}
