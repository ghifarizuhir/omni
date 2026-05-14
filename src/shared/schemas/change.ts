// M6.11 (B2.1) — shared Zod schemas for Change writes.
//
// `rescheduleChangeSchema` is strict so callers can't smuggle status / identity
// fields through the reschedule endpoint. The cross-field `end > start` check
// is enforced in `superRefine` so the error attaches to the `plannedEnd` field.

import { z } from 'zod';

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
