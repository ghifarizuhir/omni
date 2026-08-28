import { cmdbRepo } from '../repositories/cmdb';
import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';

describe('cmdbRepo.createCI', () => {
  it('creates CI', async () => {
    const ci = await cmdbRepo.createCI('t-' + randomUUID(), { name: 'svc-1', type: 'service' } as any);
    expect(ci.publicId).toMatch(/^CI-/);
  });
});
