// M6.11 (B7) — shared Zod schemas for MonitoringRule writes (POST/PATCH).
// Server route handlers and the client service / wizard layer both import
// from here so the two sides can't drift.
//
// Enum lists mirror `src/types/monitoring.ts` (`EventSource`,
// `MonitoringRuleType`, `Severity`). The `condition` and `targetSelector`
// nested objects use `.passthrough()` so the UI can evolve its sub-shape
// without us having to round-trip a schema change every time.

import { z } from 'zod';

export const monitoringRuleSeverityValues = ['P1', 'P2', 'P3', 'P4'] as const;

// Mirrors `EventSource` in `src/types/monitoring.ts`.
export const monitoringRuleSourceValues = [
  'prometheus',
  'opentelemetry',
  'log_pattern',
  'synthetic',
  'webhook',
  'cicd',
  'cloud_provider',
  'manual',
] as const;

// Mirrors `MonitoringRuleType` in `src/types/monitoring.ts`.
export const monitoringRuleTypeValues = [
  'threshold',
  'anomaly',
  'composite',
  'log_pattern',
  'synthetic',
  'absence',
] as const;

export const monitoringRuleTargetModeValues = ['explicit', 'selector'] as const;

const conditionSchema = z.object({
  operator: z.enum(['>', '<', '>=', '<=', '==', '!=']).optional(),
  threshold: z.number().optional(),
  duration: z.string().min(1).max(40).optional(),
  evaluationWindow: z.string().min(1).max(40).optional(),
}).passthrough();

const targetSelectorSchema = z.object({
  types: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  services: z.array(z.string().min(1)).optional(),
  environments: z.array(z.string().min(1)).optional(),
}).passthrough();

export const createMonitoringRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(monitoringRuleTypeValues),
  source: z.enum(monitoringRuleSourceValues),
  query: z.string().min(1).max(10_000),
  targetMode: z.enum(monitoringRuleTargetModeValues),
  targetCIIds: z.array(z.string().min(1)).max(500),
  targetSelector: targetSelectorSchema.optional(),
  condition: conditionSchema,
  severity: z.enum(monitoringRuleSeverityValues),
  cooldown: z.string().min(1).max(40),
  alertRouteId: z.string().min(1),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  enabled: z.boolean().optional(),
}).strict();
export type CreateMonitoringRuleInput = z.infer<typeof createMonitoringRuleSchema>;

export const updateMonitoringRuleSchema = createMonitoringRuleSchema
  .partial()
  .strict()
  .refine((o) => Object.keys(o).length > 0, {
    message: 'At least one field is required',
  });
export type UpdateMonitoringRuleInput = z.infer<typeof updateMonitoringRuleSchema>;
