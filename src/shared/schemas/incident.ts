// M6.7 — request/response Zod schemas shared between the server's route
// validation and the frontend's client-side form validation. Keeping them in
// one place avoids the schema drift that contract tests would otherwise catch
// only after a deploy. The server tsconfig already includes `../src/**`, so
// importing from here works from both `server/routes/*` and the browser.
//
// Pattern for adding more: export the Zod schema and a TS type derived via
// `z.infer<typeof schema>`. Pull it in from `server/routes/<domain>.ts` for
// `requirePermission` route handlers and from the matching service / form
// component on the client.

import { z } from 'zod';

export const resolveIncidentSchema = z.object({
  summary: z.string().min(1, 'Summary is required').max(2000),
  rootCause: z.string().max(2000).optional(),
  workaround: z.string().max(2000).optional(),
  suggestKB: z.boolean().optional(),
  schedulePIR: z.boolean().optional(),
});

export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;

export const addIncidentCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(10_000),
  isInternal: z.boolean().default(false),
  mentions: z.array(z.string()).max(50).optional(),
});

export type AddIncidentCommentInput = z.infer<typeof addIncidentCommentSchema>;

export const incidentStatusValues = [
  'new', 'triaging', 'in_progress', 'pending', 'resolved', 'closed',
] as const;

export const setIncidentStatusSchema = z.object({
  status: z.enum(incidentStatusValues),
});

export type SetIncidentStatusInput = z.infer<typeof setIncidentStatusSchema>;

// M6.11 B1.4 — promote-major, assign, links, watchers.
// Each schema is `.strict()` so unrelated fields (notably `status`) can't be
// smuggled through these endpoints — keeps the surface narrow.

export const promoteMajorSchema = z
  .object({
    incidentCommander: z
      .object({ id: z.string().min(1), name: z.string().min(1) })
      .optional(),
    summary: z.string().max(2000).optional(),
  })
  .strict();

export type PromoteMajorInput = z.infer<typeof promoteMajorSchema>;

export const assignIncidentSchema = z
  .object({
    assigneeId: z.string().min(1).nullable(),
    assigneeName: z.string().min(1).optional(),
  })
  .strict();

export type AssignIncidentInput = z.infer<typeof assignIncidentSchema>;

export const updateIncidentLinksSchema = z
  .object({
    affectedCIIds: z.array(z.string()).max(100).optional(),
    linkedProblemId: z.string().nullable().optional(),
    linkedProblemPublicId: z.string().nullable().optional(),
    linkedChangeIds: z.array(z.string()).max(100).optional(),
  })
  .strict();

export type UpdateIncidentLinksInput = z.infer<typeof updateIncidentLinksSchema>;

export const addWatcherSchema = z
  .object({
    userId: z.string().min(1),
    userName: z.string().min(1).optional(),
  })
  .strict();

export type AddWatcherInput = z.infer<typeof addWatcherSchema>;

// M6.11 B4.1 — generic partial-update endpoint for incident metadata fields
// (priority, tags) that don't fit the specialized assign/status/links/etc.
// endpoints. Strict so unknown keys are rejected; `.refine` enforces "at least
// one field" so an empty patch is a 400 not a silent no-op.
export const updateIncidentSchema = z
  .object({
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    description: z.string().max(5000).optional(),
  })
  .strict()
  .refine(o => o.priority !== undefined || o.tags !== undefined || o.description !== undefined, {
    message: 'At least one of priority, tags, or description is required',
  });

export type UpdateIncidentInput = z.infer<typeof updateIncidentSchema>;

// M6.11 B5.1 — war-room stand-down + comms. Stand-down legally requires a
// `reason` (see docs/audits/mutation-audit.md Top 10 #3). `newPriority`
// defaults to P2 on the server when omitted.
export const standDownIncidentSchema = z
  .object({
    reason: z.string().min(10).max(2000),
    newPriority: z.enum(['P2', 'P3', 'P4']).optional(),
  })
  .strict();

export type StandDownIncidentInput = z.infer<typeof standDownIncidentSchema>;

export const postCommsSchema = z
  .object({
    audience: z.enum(['internal', 'all_staff', 'customer']),
    message: z.string().min(1).max(4000),
    channels: z.array(z.string().min(1).max(40)).min(1).max(10),
  })
  .strict();

export type PostCommsInput = z.infer<typeof postCommsSchema>;

export const createIncidentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional().default(''),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P3'),
    channel: z.enum(['phone', 'email', 'user_report', 'self_service', 'monitoring', 'integration']).optional().default('user_report'),
    assigneeId: z.string().min(1).nullable().optional(),
    affectedCIIds: z.array(z.string()).max(100).optional().default([]),
    applicationId: z.string().nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
  })
  .strict();
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
