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
