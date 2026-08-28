import { describe, it, expect } from 'vitest';
import { updateCISchema } from '../../src/shared/schemas/ci';
describe('ci health enum fix A', () => {
  it('accepts operational from CreateCIModal default', () => {
    const r = updateCISchema.safeParse({ health: 'operational' });
    expect(r.success).toBe(true);
  });
  it('rejects stale healthy', () => {
    const r = updateCISchema.safeParse({ health: 'healthy' as any });
    expect(r.success).toBe(false);
  });
});
