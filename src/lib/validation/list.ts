import { z } from 'zod';

export const listStatusSchema = z.enum(['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']);

export const listCacheSchema = z.object({
  title: z.string().min(1),
  posterPath: z.string().nullable().optional().default(null),
  year: z.number().int().nullable().optional().default(null),
  totalEpisodes: z.number().int().nonnegative().nullable().optional().default(null),
});

export const createEntrySchema = z.object({
  type: z.enum(['movie', 'tv', 'anime']),
  sourceId: z.number().int().positive(),
  status: listStatusSchema,
  score: z.number().int().min(1).max(10).nullable().optional().default(null),
  progress: z.number().int().nonnegative().optional().default(0),
  notes: z.string().max(2000).optional().default(''),
  startedAt: z.string().datetime().nullable().optional().default(null),
  completedAt: z.string().datetime().nullable().optional().default(null),
  cache: listCacheSchema,
});

export const updateEntrySchema = z.object({
  status: listStatusSchema.optional(),
  score: z.number().int().min(1).max(10).nullable().optional(),
  progress: z.number().int().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
  startedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
