export type MediaType = 'movie' | 'tv' | 'anime';

export interface MediaSummary {
  type: MediaType;
  sourceId: number;
  title: string;
  posterPath: string | null;  // Full absolute URL
  year: number | null;
  aggregateScore: number | null; // 0-10 normalized
}

export interface MediaDetail extends MediaSummary {
  tagline: string | null;
  overview: string;
  runtimeMinutes: number | null;
  totalEpisodes: number | null;
  status: string;  // e.g. "Released", "Currently Airing", etc.
  contentRating: string | null; // e.g. "PG-13", "R", "TV-MA"
  genres: { id: number; name: string }[];
  themes?: { id: number; name: string }[];  // Anime only
  studios?: string[];                         // Anime only
  season?: { season: string; year: number } | null;  // Anime only
  source?: string | null;                     // Anime only ("Manga", "Original")
  cast: { name: string; character: string; profilePath: string | null }[]; // top 10
  director?: string | null;                   // Movie only
  creators?: string[];                        // TV only
  trailer: { youtubeId: string } | null;
  similar: MediaSummary[];      // top 12
  relations?: { type: string; entries: MediaSummary[] }[];  // Anime only
  seasons?: {
    seasonNumber: number;
    episodeCount: number;
    airDate: string | null;
  }[];
}
