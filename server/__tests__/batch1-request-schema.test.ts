import { describe, it, expect } from 'vitest';
import { createRequestSchema } from '../../src/shared/schemas/request';

describe('createRequestSchema', () => {
  it('validates minimal payload', () => {
    const r = createRequestSchema.safeParse({ catalogItemId: 'cat-123' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.catalogItemId).toBe('cat-123');
      expect(r.data.formData).toEqual({});
      expect(r.data.tags).toEqual([]);
    }
  });

  it('validates full payload', () => {
    const r = createRequestSchema.safeParse({
      catalogItemId: 'cat-123',
      title: 'Need access',
      formData: { justification: 'need' },
      tags: ['urgent'],
      applicationId: null,
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown field', () => {
    const r = createRequestSchema.safeParse({ catalogItemId: 'x', status: 'closed' } as any);
    expect(r.success).toBe(false);
  });

  it('rejects empty catalogItemId', () => {
    const r = createRequestSchema.safeParse({ catalogItemId: '' });
    expect(r.success).toBe(false);
  });
});
