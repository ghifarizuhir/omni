import { createCISchema } from '../../src/shared/schemas/ci';
import { describe, it, expect } from 'vitest';
describe('createCISchema', () => {
  it('validates name+type', () => expect(createCISchema.safeParse({ name: 'api-1', type: 'service', status: 'active', environment: 'production', criticality: 'high' }).success).toBe(true));
  it('rejects publicId', () => expect(createCISchema.safeParse({ name: 'x', type: 'service', publicId: 'CI-x' } as any).success).toBe(false));
});
