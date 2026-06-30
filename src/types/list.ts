import { MediaType } from './media';

/**
 * Canonical watch statuses for tracked entries.
 * `none` means the user added the item without picking a watch status
 * (statusless entry). This is now allowed for entries added via a custom Lyst.
 */
export type ListStatus =
  | 'watching'
  | 'completed'
  | 'plan_to_watch'
  | 'on_hold'
  | 'dropped'
  | 'none';

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
  score: number | null;        // 1-10 integer or null
  progress: number;            // episodes watched (always 0 for movies)
  notes: string;
  startedAt: string | null;    // ISO timestamp
  completedAt: string | null;  // ISO timestamp
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  cache: ListCache;
  /**
   * Which custom Lysts (subcollection IDs under users/{uid}/lysts) include
   * this entry. Optional for backwards-compatibility with old documents.
   * The "default" watchlyst is implicit — any entry whose `status !== 'none'`
   * belongs to the default watchlyst regardless of this array.
   */
  lystIds?: string[];
}

/* -----------------------------------------------------------
 * Custom Lysts (Task 2)
 * --------------------------------------------------------- */

/**
 * A user-created custom list (Lyst). Stored under
 * users/{uid}/lysts/{lystId}.
 *
 * Items belonging to the Lyst are stored as references in
 * users/{uid}/lysts/{lystId}/items/{entryId} pointing at the corresponding
 * users/{uid}/listEntries/{entryId} document.
 *
 * Public Lysts can be cloned by other users (Task 2) and liked/disliked
 * (Task 3).
 */
export interface Lyst {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  /** Aggregate counters denormalized for cheap reads. */
  itemCount: number;
  likesCount: number;
  dislikesCount: number;
  /** Author username at creation/clone time (denormalized for ranking page). */
  ownerUsername: string;
  /** Optional cover poster (URL of first item / explicit pick). */
  coverPosterPath: string | null;
  /** If cloned from another Lyst, the source path `users/{uid}/lysts/{lystId}`. */
  clonedFrom: { ownerUid: string; lystId: string; ownerUsername: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface LystItemRef {
  /** Same as the entryId in users/{uid}/listEntries. */
  entryId: string;
  type: MediaType;
  sourceId: number;
  title: string;
  posterPath: string | null;
  addedAt: string;
}

export interface LystVote {
  /** 'like' | 'dislike'; missing doc means no vote. */
  type: 'like' | 'dislike';
  createdAt: string;
}

/**
 * Ranking time-window used by the public Lyst leaderboard on the home page.
 */
export type LystRankingWindow = 'week' | 'month' | 'year' | 'all';
