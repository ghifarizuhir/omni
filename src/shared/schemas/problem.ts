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
