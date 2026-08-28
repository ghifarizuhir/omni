import { createIncidentSchema } from '../../src/shared/schemas/incident';
import { describe, it, expect } from 'vitest';
describe('createIncidentSchema B', () => {
  it('validates minimal create payload', () => {
    const r = createIncidentSchema.safeParse({ title: 'DB outage', priority: 'P1', description: 'pg down' });
    expect(r.success).toBe(true);
  });
  it('rejects unknown field', () => {
    const r = createIncidentSchema.safeParse({ title: 'x', priority: 'P2', status: 'resolved' as any });
    expect(r.success).toBe(false);
  });
});
