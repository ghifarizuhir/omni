// M6.11 (B1.1) — shared Zod schemas for AlertRoute writes.
// Server route handlers and the client service / form layer both import from
// here so the two sides can't drift.
//
// The AlertRoute shape is wide (channels, recipients, escalation steps, quiet
// hours, etc.) and the UI evolves these sub-shapes faster than we want to pin
// server-side. The patch schema uses `.passthrough()` on nested objects for
// that reason — the repo merges what it receives onto the snapshot blob.

import { z } from 'zod';

const severityValues = ['P1', 'P2', 'P3', 'P4'] as const;
const channelValues = ['email', 'slack', 'teams', 'sms', 'webhook', 'in_app'] as const;
const recipientTypeValues = ['user', 'team', 'oncall_schedule'] as const;

export const alertRecipientSchema = z.object({
  id: z.string().min(1),
  type: z.enum(recipientTypeValues),
  targetId: z.string().min(1),
  targetName: z.string().min(1),
});

export const escalationStepSchema = z.object({
  id: z.string().min(1),
  delayMinutes: z.number().int().min(0).max(60 * 24 * 7),
  recipients: z.array(alertRecipientSchema).default([]),
  channels: z.array(z.enum(channelValues)).default([]),
}).passthrough();

export const matchExpressionSchema = z.object({
  severities: z.array(z.enum(severityValues)).optional(),
  sources: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
}).passthrough();

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().min(1),
  fromHour: z.number().int().min(0).max(23),
  toHour: z.number().int().min(0).max(23),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
}).passthrough();

// POST body — most fields are optional and the repo fills sensible defaults
// (so a "New route" click can succeed with just a name).
export const createAlertRouteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  matchExpression: matchExpressionSchema.optional(),
  channels: z.array(z.enum(channelValues)).optional(),
  recipients: z.array(alertRecipientSchema).optional(),
  escalationSteps: z.array(escalationStepSchema).optional(),
  quietHours: quietHoursSchema.optional(),
}).passthrough();

export type CreateAlertRouteInput = z.infer<typeof createAlertRouteSchema>;

// PATCH body — all fields optional. The repo deep-merges where it makes sense
// (top-level fields are overwritten; nested blocks are replaced wholesale).
export const updateAlertRouteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  matchExpression: matchExpressionSchema.optional(),
  channels: z.array(z.enum(channelValues)).optional(),
  recipients: z.array(alertRecipientSchema).optional(),
  escalationSteps: z.array(escalationStepSchema).optional(),
  quietHours: quietHoursSchema.optional(),
}).passthrough();

export type UpdateAlertRouteInput = z.infer<typeof updateAlertRouteSchema>;
