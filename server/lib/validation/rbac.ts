import { z } from 'zod';

const idSlug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export const divisionSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const departmentSchema = z.object({
  id: idSlug.optional(),
  divisionId: idSlug,
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const teamSchema = z.object({
  id: idSlug.optional(),
  departmentId: idSlug,
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const applicationSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).nullable().optional(),
  ownerTeamId: idSlug.nullable().optional(),
  teams: z.array(idSlug).optional(),
});

export const functionalRoleSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

export const rbacUserSchema = z.object({
  id: idSlug.optional(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  isSuperadmin: z.boolean().default(false),
  level: z.enum(['group_head', 'dept_head', 'team_lead', 'officer', 'requester']).nullable().optional(),
  divisionId: idSlug.nullable().optional(),
  departmentId: idSlug.nullable().optional(),
  teamId: idSlug.nullable().optional(),
  functionalRoles: z.array(idSlug).default([]),
});

export type DivisionInput = z.infer<typeof divisionSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type FunctionalRoleInput = z.infer<typeof functionalRoleSchema>;
export type RbacUserInput = z.infer<typeof rbacUserSchema>;
