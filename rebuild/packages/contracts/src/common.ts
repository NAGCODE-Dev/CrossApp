import { z } from "zod";

export const sportTypeSchema = z.enum(["cross", "running", "strength"]);

export const planIdSchema = z.enum([
  "athlete_plus",
  "starter",
  "pro",
  "coach",
  "performance",
]);

export const accessStatusSchema = z.enum([
  "active",
  "grace",
  "blocked",
  "inactive",
  "pending",
  "canceled",
]);

export const timestampSchema = z.string().datetime();
export const emailSchema = z.string().trim().email();
export const paginationSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  pages: z.number().int().positive(),
});
