import { z } from "zod";
import { accessStatusSchema, planIdSchema, timestampSchema } from "./common";

export const billingStatusSchema = z.object({
  plan: planIdSchema.nullable().optional(),
  status: accessStatusSchema,
  renewAt: timestampSchema.nullable().optional(),
  provider: z.string().trim().min(1),
  updatedAt: timestampSchema.nullable().optional(),
  accessTier: accessStatusSchema,
  isGracePeriod: z.boolean().default(false),
  graceUntil: timestampSchema.nullable().optional(),
  daysRemaining: z.number().int().nonnegative().default(0),
});

export const gymAccessSnapshotSchema = z.object({
  gymId: z.number().int().positive(),
  gymName: z.string().trim().nullable().optional(),
  role: z.string().trim().min(1),
  status: z.string().trim().min(1),
  canCoachManage: z.boolean(),
  canAthletesUseApp: z.boolean(),
  warning: z.string().trim().nullable().optional(),
  accessTier: accessStatusSchema,
  daysRemaining: z.number().int().nonnegative().default(0),
});

export const entitlementSnapshotSchema = z.object({
  entitlements: z.array(z.string().trim()),
  subscription: billingStatusSchema.nullable().optional(),
  gymAccess: z.array(gymAccessSnapshotSchema).default([]),
});

export const checkoutIntentSchema = z.object({
  planId: planIdSchema,
  source: z.string().trim().min(1),
  successUrl: z.string().trim().optional(),
  cancelUrl: z.string().trim().optional(),
  provider: z.string().trim().optional(),
});

export const checkoutResponseSchema = z.object({
  checkoutUrl: z.string().trim().min(1),
  mode: z.string().trim().min(1),
});

export const billingClaimSchema = z.object({
  id: z.union([z.string(), z.number()]),
  provider: z.string().trim().min(1),
  externalRef: z.string().trim().min(1),
  email: z.string().trim().toLowerCase(),
  planId: planIdSchema,
  status: z.string().trim().min(1),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional(),
});
