import { z } from "zod";
import { paginationSchema, sportTypeSchema, timestampSchema } from "./common";

export const benchmarkLibraryItemSchema = z.object({
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.string().trim().optional(),
  source: z.string().trim().optional(),
  scoreType: z.string().trim().optional(),
  year: z.number().int().nullable().optional(),
});

export const benchmarkSearchResponseSchema = z.object({
  benchmarks: z.array(benchmarkLibraryItemSchema),
  pagination: paginationSchema,
});

export const benchmarkResultInputSchema = z.object({
  slug: z.string().trim().min(1),
  sportType: sportTypeSchema,
  gymId: z.union([z.string(), z.number()]).nullable().optional(),
  scoreDisplay: z.string().trim().min(1),
  notes: z.string().trim().default(""),
});

export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  athleteName: z.string().trim().min(1),
  scoreDisplay: z.string().trim().min(1),
  createdAt: timestampSchema,
});

export const benchmarkLeaderboardSchema = z.object({
  benchmark: benchmarkLibraryItemSchema,
  results: z.array(leaderboardEntrySchema),
});
