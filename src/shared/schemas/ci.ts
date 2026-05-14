// M6.11 (B1.3) — shared Zod schema for ConfigurationItem partial updates.
// The CMDB detail page edits a small set of high-level fields (name, status,
// environment, criticality). We also allow ownerId/ownerTeamId, serviceId,
// health, tags, description-style attributes passthrough, since the CI doc
// type has those and a future inline editor may surface them. Identity and
// lifecycle fields (id, publicId, tenantId, type, createdAt) are rejected by
// `.strict()`.

import { z } from 'zod';

export const ciStatusValues = [
  'active',
  'planned',
  'maintenance',
  'retired',
  'unknown',
] as const;

export const ciEnvironmentValues = [
  'production',
  'staging',
  'development',
  'test',
] as const;

export const ciCriticalityValues = [
  'critical',
  'high',
  'medium',
  'low',
] as const;

export const ciHealthValues = [
  'healthy',
  'degraded',
  'down',
  'unknown',
] as const;

export const updateCISchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    status: z.enum(ciStatusValues).optional(),
    environment: z.enum(ciEnvironmentValues).optional(),
    criticality: z.enum(ciCriticalityValues).optional(),
    health: z.enum(ciHealthValues).optional(),
    ownerId: z.string().nullable().optional(),
    ownerTeamId: z.string().optional(),
    serviceId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    // Passthrough for type-specific attribute blob. Caller must keep `kind`
    // consistent with CI.type; we don't validate the shape here.
    attributes: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export type UpdateCIInput = z.infer<typeof updateCISchema>;
