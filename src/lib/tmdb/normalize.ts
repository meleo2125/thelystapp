import { MediaSummary, MediaDetail } from '../../types/media';

// Raw TMDB Response Interfaces
export interface RawTmdbMovieSummary {
  id: number;
  title: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export interface RawTmdbTvSummary {
  id: number;
  name: string;
  title?: string;
  poster_path: string | null;
  first_air_date?: string;
  release_date?: string;
  vote_average: number;
}

export interface RawTmdbCast {
  name: string;
  character: string;
  profile_path: string | null;
}

export interface RawTmdbCrew {
  job: string;
  name: string;
}

export interface RawTmdbVideo {
  type: string;
  site: string;
  key: string;
}

export interface RawTmdbReleaseDateResult {
  iso_3166_1: string;
  release_dates: Array<{
    certification: string;
  }>;
}

export interface RawTmdbContentRatingResult {
  iso_3166_1: string;
  rating: string;
}

export interface RawTmdbMovieDetail {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
  vote_average: number;
  tagline: string | null;
  overview: string;
  runtime: number | null;
  status: string;
  genres: Array<{ id: number; name: string }>;
  credits?: {
    cast?: RawTmdbCast[];
    crew?: RawTmdbCrew[];
  };
  videos?: {
    results?: RawTmdbVideo[];
  };
  similar?: {
    results?: RawTmdbMovieSummary[];
  };
  release_dates?: {
    results?: RawTmdbReleaseDateResult[];
  };
}

export interface RawTmdbTvDetail {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date?: string;
  vote_average: number;
  tagline: string | null;
  overview: string;
  episode_run_time?: number[];
  number_of_episodes: number;
  status: string;
  genres: Array<{ id: number; name: string }>;
  created_by?: Array<{ name: string }>;
  seasons?: Array<{
    season_number: number;
    episode_count: number;
    air_date: string | null;
  }>;
  credits?: {
    cast?: RawTmdbCast[];
    crew?: RawTmdbCrew[];
  };
  videos?: {
    results?: RawTmdbVideo[];
  };
  similar?: {
    results?: RawTmdbTvSummary[];
  };
  content_ratings?: {
    results?: RawTmdbContentRatingResult[];
  };
}

// Extraction Utilities
const extractYear = (dateStr?: string): number | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    return isNaN(year) ? null : year;
  }
  return null;
};

const getPosterUrl = (path: string | null, size = 'w342'): string | null => {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

const getProfileUrl = (path: string | null): string | null => {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/w185${path}`;
};

const extractTrailer = (videos?: RawTmdbVideo[]): { youtubeId: string } | null => {
  if (!videos) return null;
  const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  return trailer ? { youtubeId: trailer.key } : null;
};

// Normalization Helpers
export function normalizeTmdbMovieSummary(movie: RawTmdbMovieSummary): MediaSummary {
  return {
    type: 'movie',
    sourceId: movie.id,
    title: movie.title || movie.name || 'Unknown Title',
    posterPath: getPosterUrl(movie.poster_path),
    year: extractYear(movie.release_date || movie.first_air_date),
    aggregateScore: typeof movie.vote_average === 'number' ? parseFloat(movie.vote_average.toFixed(1)) : null,
  };
}

export function normalizeTmdbTvSummary(tv: RawTmdbTvSummary): MediaSummary {
  return {
    type: 'tv',
    sourceId: tv.id,
    title: tv.name || tv.title || 'Unknown Title',
    posterPath: getPosterUrl(tv.poster_path),
    year: extractYear(tv.first_air_date || tv.release_date),
    aggregateScore: typeof tv.vote_average === 'number' ? parseFloat(tv.vote_average.toFixed(1)) : null,
  };
}


export function normalizeTmdbMovieDetail(movie: RawTmdbMovieDetail): MediaDetail {
  // Extract US content rating
  let contentRating: string | null = null;
  const usReleaseDates = movie.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
  if (usReleaseDates?.release_dates) {
    const validCert = usReleaseDates.release_dates.find(d => d.certification !== '');
    if (validCert) {
      contentRating = validCert.certification;
    }
  }

  // Extract director
  const directorInfo = movie.credits?.crew?.find(c => c.job === 'Director');
  const director = directorInfo ? directorInfo.name : null;

  // Extract top 10 cast
  const cast = (movie.credits?.cast || []).slice(0, 10).map(c => ({
    name: c.name,
    character: c.character,
    profilePath: getProfileUrl(c.profile_path),
  }));

  // Extract similar movies (top 12)
  const similar = (movie.similar?.results || []).slice(0, 12).map(normalizeTmdbMovieSummary);

  return {
    type: 'movie',
    sourceId: movie.id,
    title: movie.title,
    posterPath: getPosterUrl(movie.poster_path),
    year: extractYear(movie.release_date),
    aggregateScore: movie.vote_average ? parseFloat(movie.vote_average.toFixed(1)) : null,
    tagline: movie.tagline || null,
    overview: movie.overview,
    runtimeMinutes: movie.runtime || null,
    totalEpisodes: 0, // always 0 for movies
    status: movie.status,
    contentRating,
    genres: movie.genres.map(g => ({ id: g.id, name: g.name })),
    cast,
    director,
    trailer: extractTrailer(movie.videos?.results),
    similar,
  };
}

export function normalizeTmdbTvDetail(tv: RawTmdbTvDetail): MediaDetail {
  // Extract US content rating
  let contentRating: string | null = null;
  const usRating = tv.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
  if (usRating) {
    contentRating = usRating.rating;
  }

  // Extract creators
  const creators = tv.created_by?.map(c => c.name) || [];

  // Extract top 10 cast
  const cast = (tv.credits?.cast || []).slice(0, 10).map(c => ({
    name: c.name,
    character: c.character,
    profilePath: getProfileUrl(c.profile_path),
  }));

  // Extract similar TV shows (top 12)
  const similar = (tv.similar?.results || []).slice(0, 12).map(normalizeTmdbTvSummary);

  // Map seasons
  const seasons = (tv.seasons || [])
    .filter(s => s.season_number > 0) // exclude specials (Season 0) if desired, or keep all. Standard practice is to show standard seasons.
    .map(s => ({
      seasonNumber: s.season_number,
      episodeCount: s.episode_count,
      airDate: s.air_date,
    }));

  const runtimeMinutes = tv.episode_run_time && tv.episode_run_time.length > 0 
    ? tv.episode_run_time[0] 
    : null;

  return {
    type: 'tv',
    sourceId: tv.id,
    title: tv.name,
    posterPath: getPosterUrl(tv.poster_path),
    year: extractYear(tv.first_air_date),
    aggregateScore: tv.vote_average ? parseFloat(tv.vote_average.toFixed(1)) : null,
    tagline: tv.tagline || null,
    overview: tv.overview,
    runtimeMinutes,
    totalEpisodes: tv.number_of_episodes || null,
    status: tv.status,
    contentRating,
    genres: tv.genres.map(g => ({ id: g.id, name: g.name })),
    cast,
    creators,
    trailer: extractTrailer(tv.videos?.results),
    similar,
    seasons,
  };
}
