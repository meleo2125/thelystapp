import { z } from 'zod';

/**
 * Validates numeric source IDs (e.g., TMDB ID or MAL ID) from path params
 */
export const mediaIdSchema = z.coerce.number().int().positive({
  message: 'ID must be a positive integer',
});

/**
 * Validates supported media type parameters
 */
export const mediaTypeSchema = z.enum(['movie', 'tv', 'anime']);

/**
 * Validates search query parameters
 */
export const mediaSearchSchema = z.object({
  q: z.string().trim().min(1, 'Search query is required'),
  type: z.enum(['movie', 'tv', 'anime', 'all']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
});


/**
 * Validates trending request type parameters
 */
export const mediaTrendingSchema = z.object({
  type: mediaTypeSchema.default('movie'),
});

/**
 * Validates Jikan seasonal anime request parameters
 */
export const mediaSeasonalSchema = z.object({
  year: z.coerce.number().int().positive().optional(),
  season: z.enum(['winter', 'spring', 'summer', 'fall']).optional(),
  page: z.coerce.number().int().positive().default(1),
});
