import { z } from "zod";

export const telemetryItemSchema = z.object({
  kind: z.string().trim().min(1),
  source: z.string().trim().min(1),
  payload: z.record(z.any()).default({}),
  occurredAt: z.string().datetime().optional(),
});

export const telemetryIngestSchema = z.object({
  items: z.array(telemetryItemSchema).min(1).max(200),
});
