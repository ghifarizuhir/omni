import { updateProblemStatusSchema, promoteKnownErrorSchema } from '../../src/shared/schemas/problem';
import { describe, it, expect } from 'vitest';
describe('problem status schemas', () => {
  it('validates status change', () => expect(updateProblemStatusSchema.safeParse({ status: 'investigating' }).success).toBe(true));
  it('promote requires rootCause+workaround', () => expect(promoteKnownErrorSchema.safeParse({ rootCause: 'x'.repeat(10), workaround: 'y'.repeat(10) }).success).toBe(true));
  it('rejects promote without rootCause', () => expect(promoteKnownErrorSchema.safeParse({ workaround: 'y'.repeat(10) } as any).success).toBe(false));
});
