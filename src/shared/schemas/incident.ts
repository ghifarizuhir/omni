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
