import { z } from "zod";
import {
  accessStatusSchema,
  paginationSchema,
  sportTypeSchema,
  timestampSchema,
} from "./common";

export const importedWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  days: z.array(z.any()),
});

export const importedPlanSnapshotSchema = z.object({
  weeks: z.array(importedWeekSchema).min(1),
  metadata: z.record(z.any()).default({}),
  activeWeekNumber: z.number().int().positive().nullable().optional().default(null),
  updatedAt: timestampSchema,
});

export const athleteMeasurementSchema = z.object({
  id: z.string().min(1),
  type: z.string().trim().min(1),
  label: z.string().trim().min(1),
  unit: z.string().trim().default(""),
  value: z.coerce.number(),
  notes: z.string().trim().nullable().optional(),
  recordedAt: timestampSchema,
});

export const athletePrRecordSchema = z.object({
  exercise: z.string().trim().min(1),
  value: z.number().positive(),
  unit: z.string().trim().default("kg"),
  source: z.string().trim().default("manual"),
  createdAt: timestampSchema.optional(),
});

export const athletePrSnapshotSchema = z.record(z.coerce.number().positive());

export const athletePrSnapshotSyncResponseSchema = z.object({
  inserted: z.number().int().nonnegative(),
  removed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const athleteAppStateSnapshotSchema = z.object({
  sportType: sportTypeSchema,
  snapshot: z.record(z.any()),
  updatedAt: timestampSchema,
});

export const athleteAccessSnapshotSchema = z.object({
  athleteTier: z.string().trim(),
  status: accessStatusSchema,
  sportType: sportTypeSchema,
  canUseApp: z.boolean(),
  historyDays: z.number().int().positive().nullable().optional(),
});

export const athleteSummarySchema = z.object({
  stats: z.object({
    gyms: z.number().int().nonnegative(),
    activeGyms: z.number().int().nonnegative(),
    resultsLogged: z.number().int().nonnegative(),
    assignedWorkouts: z.number().int().nonnegative(),
    sportType: sportTypeSchema,
    athleteTier: z.string().trim(),
  }),
  athleteBenefits: z.record(z.any()).nullable(),
  personalSubscription: z.record(z.any()).nullable(),
  gymAccess: z.array(z.record(z.any())),
});

export const athleteResultsSchema = z.object({
  recentResults: z.array(z.record(z.any())),
  benchmarkHistory: z.array(z.record(z.any())),
  prHistory: z.array(z.record(z.any())),
  prCurrent: z.record(z.number()),
  measurements: z.array(athleteMeasurementSchema),
  runningHistory: z.array(z.record(z.any())),
  strengthHistory: z.array(z.record(z.any())),
});

export const athleteMeasurementsHistoryResponseSchema = z.object({
  measurements: z.array(athleteMeasurementSchema),
});

export const athleteMeasurementsSnapshotInputSchema = z.object({
  measurements: z.array(athleteMeasurementSchema),
});

export const athleteMeasurementsSnapshotResponseSchema = z.object({
  synced: z.number().int().nonnegative(),
});

export const athleteAppStateResponseSchema = z.object({
  appState: athleteAppStateSnapshotSchema.nullable(),
});

export const importedPlanResponseSchema = z.object({
  importedPlan: importedPlanSnapshotSchema.nullable(),
});

export const importedPlanDeleteResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
});

export const benchmarkLibraryResponseSchema = z.object({
  benchmarks: z.array(z.record(z.any())),
  pagination: paginationSchema,
});
