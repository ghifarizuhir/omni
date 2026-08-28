// M6.11 (B2.2) — shared Zod schemas for Service Request lifecycle writes.
//
// All schemas are `.strict()` so unrelated fields (notably `status`) can't
// be smuggled through these endpoints — keeps the surface narrow and lines
// up with the incident + change conventions.

import { z } from 'zod';

export const cancelRequestSchema = z
  .object({
    reason: z.string().min(10).max(2_000),
  })
  .strict();
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>;

export const reassignRequestStepSchema = z
  .object({
    stepId: z.string().min(1),
    assigneeId: z.string().min(1),
    assigneeName: z.string().min(1).optional(),
  })
  .strict();
export type ReassignRequestStepInput = z.infer<typeof reassignRequestStepSchema>;

export const addRequestWatcherSchema = z
  .object({
    userId: z.string().min(1),
    userName: z.string().min(1).optional(),
  })
  .strict();
export type AddRequestWatcherInput = z.infer<typeof addRequestWatcherSchema>;

export const createRequestSchema = z.object({
  catalogItemId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  formData: z.record(z.string(), z.unknown()).optional().default({}),
  tags: z.array(z.string()).max(20).optional().default([]),
  applicationId: z.string().nullable().optional(),
}).strict();
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
