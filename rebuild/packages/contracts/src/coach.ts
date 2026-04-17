import { z } from "zod";
import { sportTypeSchema, timestampSchema } from "./common";

export const gymSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  role: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export const membershipSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  gymId: z.union([z.string(), z.number()]).optional(),
  email: z.string().trim().toLowerCase(),
  role: z.enum(["owner", "coach", "athlete"]),
  status: z.string().trim(),
});

export const athleteGroupSchema = z.object({
  id: z.union([z.string(), z.number()]),
  gymId: z.union([z.string(), z.number()]),
  sportType: sportTypeSchema,
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  memberCount: z.number().int().nonnegative().optional(),
  members: z.array(z.record(z.any())).default([]),
});

export const workoutAudienceModeSchema = z.enum(["all", "selected", "groups"]);

export const workoutPublishInputSchema = z.object({
  gymId: z.union([z.string(), z.number()]),
  sportType: sportTypeSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().default(""),
  scheduledDate: z.string().trim().min(1),
  payload: z.record(z.any()),
  audienceMode: workoutAudienceModeSchema,
  targetMembershipIds: z.array(z.union([z.string(), z.number()])).default([]),
  targetGroupIds: z.array(z.union([z.string(), z.number()])).default([]),
});

export const coachWorkoutDraftSchema = z.object({
  workoutTitle: z.string().trim().default(""),
  workoutDate: z.string().trim().default(""),
  workoutBenchmarkSlug: z.string().trim().default(""),
  workoutLines: z.string().trim().default(""),
  runningSessionType: z.string().trim().default("easy"),
  runningDistanceKm: z.string().trim().default(""),
  runningDurationMin: z.string().trim().default(""),
  runningTargetPace: z.string().trim().default(""),
  runningZone: z.string().trim().default(""),
  runningNotes: z.string().trim().default(""),
  runningSegments: z.array(z.record(z.string())).default([]),
  strengthFocus: z.string().trim().default(""),
  strengthLoadGuidance: z.string().trim().default(""),
  strengthRir: z.string().trim().default(""),
  strengthRestSeconds: z.string().trim().default(""),
  strengthExercises: z.array(z.record(z.string())).default([]),
  workoutAudienceMode: workoutAudienceModeSchema.default("all"),
  targetMembershipIds: z.array(z.union([z.string(), z.number()])).default([]),
  targetGroupIds: z.array(z.union([z.string(), z.number()])).default([]),
  updatedAt: timestampSchema.optional(),
});
