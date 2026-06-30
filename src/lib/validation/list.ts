import { z } from 'zod';

/**
 * Canonical statuses including `'none'` (statusless entry).
 * `'none'` is what we store when an item is added to a custom Lyst
 * without a watch status.
 */
export const listStatusSchema = z.enum([
  'watching',
  'completed',
  'plan_to_watch',
  'on_hold',
  'dropped',
  'none',
]);

export const listCacheSchema = z.object({
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().url().nullable().optional().default(null),
  year: z.number().int().min(1800).max(2100).nullable().optional().default(null),
  totalEpisodes: z.number().int().nonnegative().nullable().optional().default(null),
});

export const createEntrySchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.number().int().positive(),
  status: listStatusSchema.default('none'),
  score: z.number().int().min(1).max(10).nullable().optional().default(null),
  progress: z.number().int().nonnegative().max(10_000).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  startedAt: z.string().datetime().nullable().optional().default(null),
  completedAt: z.string().datetime().nullable().optional().default(null),
  cache: listCacheSchema,
  /** Optional set of custom Lyst IDs to add the new entry to. */
  lystIds: z.array(z.string().min(1).max(64)).max(50).optional().default([]),
  /** Used by the duplicate-conflict modal to force creation. */
  ignoreConflict: z.boolean().optional(),
});

export const updateEntrySchema = z.object({
  status: listStatusSchema.optional(),
  score: z.number().int().min(1).max(10).nullable().optional(),
  progress: z.number().int().nonnegative().max(10_000).optional(),
  notes: z.string().max(2000).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

/* ------------------- Custom Lyst schemas (Task 2) ------------------- */

export const createLystSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name too long'),
  description: z.string().trim().max(500).optional().default(''),
  isPublic: z.boolean().optional().default(false),
});

export const updateLystSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export const lystItemAddSchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.number().int().positive(),
  cache: listCacheSchema,
});

export const lystVoteSchema = z.object({
  voteType: z.enum(['like', 'dislike', 'none']),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type CreateLystInput = z.infer<typeof createLystSchema>;
export type UpdateLystInput = z.infer<typeof updateLystSchema>;
export type LystItemAddInput = z.infer<typeof lystItemAddSchema>;
export type LystVoteInput = z.infer<typeof lystVoteSchema>;
