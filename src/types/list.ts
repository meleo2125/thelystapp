import { MediaType } from './media';

export type ListStatus = 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';

export interface ListCache {
  title: string;
  titleNormalized: string;
  posterPath: string | null;
  year: number | null;
  totalEpisodes: number | null;
  lastSyncedAt: string; // ISO timestamp
}

export interface ListEntry {
  id: string; // type-sourceId
  userId: string;
  type: MediaType;
  sourceId: number;
  status: ListStatus;
  score: number | null; // 1-10 integer
  progress: number; // episodes watched (always 0 for movies)
  notes: string;
  startedAt: string | null; // ISO timestamp
  completedAt: string | null; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  cache: ListCache;
}
