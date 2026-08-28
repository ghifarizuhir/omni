import { describe, it, expect } from 'vitest';
import { castVoteSchema } from '../../src/shared/schemas/change';
describe('castVoteSchema', () => {
  it('accepts approve', () => {
    expect(castVoteSchema.safeParse({ decision: 'approve', voterId: 'u-1' }).success).toBe(true);
  });
  it('rejects unknown field', () => {
    expect(castVoteSchema.safeParse({ decision: 'approve', voterId: 'u-1', status: 'approved' as any }).success).toBe(false);
  });
  it('requires rationale when reject', () => {
    const r = castVoteSchema.safeParse({ decision: 'reject', voterId: 'u-1' });
    expect(r.success).toBe(false);
  });
});
