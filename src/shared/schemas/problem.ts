import { z } from 'zod';

export const problemStatusValues = ['identified', 'investigating', 'known_error', 'fix_in_progress', 'closed'] as const;
export const problemSourceValues = ['incident_pattern', 'major_incident', 'proactive', 'audit', 'user_reported'] as const;
export const problemSeverityValues = ['P1', 'P2', 'P3', 'P4'] as const;

export const createProblemSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional().default(''),
    severity: z.enum(problemSeverityValues).default('P3'),
    source: z.enum(problemSourceValues).default('user_reported'),
    affectedCIIds: z.array(z.string()).max(100).optional().default([]),
    affectedServiceIds: z.array(z.string()).max(100).optional().default([]),
    tags: z.array(z.string()).max(20).optional().default([]),
    applicationId: z.string().nullable().optional(),
    ownerId: z.string().nullable().optional(),
  })
  .strict();

export type CreateProblemInput = z.infer<typeof createProblemSchema>;

export const updateProblemStatusSchema = z.object({ status: z.enum(problemStatusValues) }).strict();
export type UpdateProblemStatusInput = z.infer<typeof updateProblemStatusSchema>;

export const promoteKnownErrorSchema = z
  .object({
    rootCause: z.string().min(10).max(5000),
    workaround: z.string().min(10).max(5000),
    workaroundEffectiveness: z.enum(['full', 'partial', 'none']).default('partial'),
    affectedVersions: z.array(z.string()).max(20).optional().default([]),
    permanentFixPlan: z.string().max(5000).optional(),
  })
  .strict();
export type PromoteKnownErrorInput = z.infer<typeof promoteKnownErrorSchema>;

export const createRCAInputSchema = z
  .object({
    technique: z
      .enum(['five_whys', 'fishbone', 'narrative', 'fault_tree', 'timeline'])
      .default('five_whys'),
    summary: z.string().max(10000).optional(),
    rootCauses: z.array(z.string()).max(20).optional(),
    contributingFactors: z.array(z.string()).max(20).optional(),
  })
  .strict();
export type CreateRCAInput = z.infer<typeof createRCAInputSchema>;
