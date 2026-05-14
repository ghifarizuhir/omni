// M6.11 (B1.2) — shared Zod schema for Event status mutations.
// Server route handler and client service both import from here so the two
// sides can't drift. EventStatus values are duplicated as a const tuple here
// because Zod needs a literal tuple for `.enum()` and `src/types/monitoring.ts`
// only exports the string-union type.

import { z } from 'zod';

export const eventStatusValues = [
  'open',
  'acknowledged',
  'resolved',
  'suppressed',
] as const;

export const setEventStatusSchema = z.object({
  status: z.enum(eventStatusValues),
  note: z.string().max(2000).optional(),
});

export type SetEventStatusInput = z.infer<typeof setEventStatusSchema>;
