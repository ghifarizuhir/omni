import { describe, it, expect } from 'vitest';
import { createProblemSchema } from '../../src/shared/schemas/problem';

describe('createProblemSchema', () => {
  it('validates minimal payload', () => {
    const r = createProblemSchema.safeParse({ title: 'Root cause follow-up' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBe('Root cause follow-up');
      expect(r.data.severity).toBe('P3');
      expect(r.data.source).toBe('user_reported');
      expect(r.data.description).toBe('');
    }
  });

  it('validates full payload', () => {
    const r = createProblemSchema.safeParse({
      title: 'DB replica lag',
      description: 'Replica lag > 30s',
      severity: 'P1',
      source: 'incident_pattern',
      affectedCIIds: ['ci-1'],
      affectedServiceIds: ['svc-1'],
      tags: ['db'],
      applicationId: null,
      ownerId: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown field', () => {
    const r = createProblemSchema.safeParse({ title: 'x', status: 'closed' } as any);
    expect(r.success).toBe(false);
  });

  it('rejects empty title', () => {
    const r = createProblemSchema.safeParse({ title: '' });
    expect(r.success).toBe(false);
  });
});
