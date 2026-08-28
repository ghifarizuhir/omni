// M6.11 (B2.1) — shared Zod schemas for Change writes.
//
// `rescheduleChangeSchema` is strict so callers can't smuggle status / identity
// fields through the reschedule endpoint. The cross-field `end > start` check
// is enforced in `superRefine` so the error attaches to the `plannedEnd` field.

import { z } from 'zod';
import type { CABVote } from '../../types/change';

export const rescheduleChangeSchema = z
  .object({
    plannedStart: z.string().datetime({ offset: true }),
    plannedEnd:   z.string().datetime({ offset: true }),
    reason:       z.string().min(10).max(2_000),
  })
  .strict()
  .superRefine((val, ctx) => {
    const start = Date.parse(val.plannedStart);
    const end   = Date.parse(val.plannedEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['plannedEnd'],
        message: 'plannedEnd must be after plannedStart',
      });
    }
  });

export type RescheduleChangeInput = z.infer<typeof rescheduleChangeSchema>;

export const cabVoteValues = ['approve','approve_with_conditions','reject','abstain'] as const;

export const castVoteSchema = z.object({
  decision: z.enum(cabVoteValues),
  voterId: z.string().min(1).optional(),
  voterName: z.string().min(1).optional(),
  rationale: z.string().max(2000).optional(),
  conditions: z.string().max(2000).optional(),
  isLocked: z.boolean().optional().default(false),
})
.strict()
.superRefine((val, ctx) => {
  if (val.decision === 'reject' && !val.rationale?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rationale'], message: 'rationale required when reject' });
  }
  if (val.decision === 'approve_with_conditions' && !val.conditions?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conditions'], message: 'conditions required when approve_with_conditions' });
  }
});
export type CastVoteInput = z.infer<typeof castVoteSchema>;
