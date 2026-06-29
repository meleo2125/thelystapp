import { MediaSummary, MediaDetail } from '../../types/media';

// Raw Jikan API Interfaces
export interface RawJikanImage {
  image_url: string;
  small_image_url?: string;
  large_image_url?: string;
}

export interface RawJikanImages {
  jpg: RawJikanImage;
  webp?: RawJikanImage;
}

export interface RawJikanAnimeSummary {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: RawJikanImages;
  year?: number | null;
  score?: number | null;
}

export interface RawJikanRelationEntry {
  mal_id: number;
  type: string; // "anime" or "manga"
  name: string;
  url?: string;
}

export interface RawJikanRelation {
  relation: string; // e.g., "Prequel", "Sequel", "Side story"
  entry: RawJikanRelationEntry[];
}

export interface RawJikanAnimeFull {
  mal_id: number;
  url?: string;
  images: RawJikanImages;
  trailer?: {
    youtube_id: string | null;
    url?: string | null;
    embed_url?: string | null;
  } | null;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  type?: string | null;
  source?: string | null;
  episodes?: number | null;
  status?: string | null;
  airing?: boolean;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  synopsis?: string | null;
  season?: string | null;
  year?: number | null;
  relations?: RawJikanRelation[];
  studios?: Array<{ mal_id: number; type: string; name: string }>;
  genres?: Array<{ mal_id: number; type: string; name: string }>;
  themes?: Array<{ mal_id: number; type: string; name: string }>;
}

export interface RawJikanRecommendation {
  entry: {
    mal_id: number;
    url?: string;
    images: RawJikanImages;
    title: string;
  };
}

export interface RawJikanCharacterVA {
  person: {
    name: string;
    images: {
      jpg: {
        image_url: string;
      };
    };
  };
  language: string;
}

export interface RawJikanCharacterResult {
  character: {
    mal_id: number;
    name: string;
    images: RawJikanImages;
  };
  role: string; // "Main" or "Supporting"
  voice_actors?: RawJikanCharacterVA[];
}

// Extraction Utilities
const cleanRating = (ratingStr?: string | null): string | null => {
  if (!ratingStr) return null;
  // Convert "PG-13 - Teens 13 or older" -> "PG-13"
  const parts = ratingStr.split(' - ');
  return parts[0] || ratingStr;
};

const parseDurationToMinutes = (durationStr?: string | null): number | null => {
  if (!durationStr) return null;
  // e.g., "24 min per ep" or "1 hr 50 min" or "2 hr"
  let minutes = 0;
  
  const hrMatch = durationStr.match(/(\d+)\s*hr/);
  if (hrMatch) {
    minutes += parseInt(hrMatch[1], 10) * 60;
  }
  
  const minMatch = durationStr.match(/(\d+)\s*min/);
  if (minMatch) {
    minutes += parseInt(minMatch[1], 10);
  }
  
  return minutes > 0 ? minutes : null;
};

// Normalization Helpers
export function normalizeJikanAnimeSummary(anime: RawJikanAnimeSummary): MediaSummary {
  return {
    type: 'anime',
    sourceId: anime.mal_id,
    title: anime.title_english || anime.title,
    posterPath: anime.images.jpg.image_url || null,
    year: anime.year || null,
    aggregateScore: anime.score ? parseFloat(anime.score.toFixed(1)) : null,
  };
}

export function normalizeJikanAnimeDetail(
  anime: RawJikanAnimeFull,
  recommendations: RawJikanRecommendation[] = [],
  characters: RawJikanCharacterResult[] = []
): MediaDetail {
  // Normalize trailer
  const trailer = anime.trailer?.youtube_id
    ? { youtubeId: anime.trailer.youtube_id }
    : null;

  // Extract top 10 cast (voice actors or characters)
  const cast = characters.slice(0, 10).map(c => {
    // Find Japanese voice actor
    const jaVa = c.voice_actors?.find(va => va.language === 'Japanese');
    return {
      name: jaVa ? jaVa.person.name : c.character.name,
      character: c.character.name,
      profilePath: jaVa?.person.images.jpg.image_url || c.character.images.jpg.image_url || null,
    };
  });

  // Extract similar (recommendations) mapped to MediaSummary (top 12)
  const similar = recommendations.slice(0, 12).map(r => ({
    type: 'anime' as const,
    sourceId: r.entry.mal_id,
    title: r.entry.title,
    posterPath: r.entry.images.jpg.image_url || null,
    year: null, // Jikan recommendation doesn't return year
    aggregateScore: null, // Jikan recommendation doesn't return score
  }));

  // Extract relations (anime only)
  const relations = anime.relations
    ?.map(rel => {
      const entries = rel.entry
        .filter(e => e.type === 'anime') // only include anime relations
        .map(e => ({
          type: 'anime' as const,
          sourceId: e.mal_id,
          title: e.name,
          posterPath: null, // not returned in relations list
          year: null,
          aggregateScore: null,
        }));

      return {
        type: rel.relation,
        entries,
      };
    })
    .filter(rel => rel.entries.length > 0) || [];

  return {
    type: 'anime',
    sourceId: anime.mal_id,
    title: anime.title_english || anime.title,
    posterPath: anime.images.jpg.image_url || null,
    year: anime.year || null,
    aggregateScore: anime.score ? parseFloat(anime.score.toFixed(1)) : null,
    tagline: null, // Jikan has no tagline field
    overview: anime.synopsis || '',
    runtimeMinutes: parseDurationToMinutes(anime.duration),
    totalEpisodes: anime.episodes || null,
    status: anime.status || 'Unknown',
    contentRating: cleanRating(anime.rating),
    genres: (anime.genres || []).map(g => ({ id: g.mal_id, name: g.name })),
    themes: (anime.themes || []).map(t => ({ id: t.mal_id, name: t.name })),
    studios: (anime.studios || []).map(s => s.name),
    season: anime.season && anime.year ? { season: anime.season, year: anime.year } : null,
    source: anime.source || null,
    cast,
    trailer,
    similar,
    relations,
  };
}
