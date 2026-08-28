import { describe, it, expect } from 'vitest';
import { buildScopedDb } from '../scope/scopedDb';
import type { ScopeContext } from '../scope/context';
describe('incidents scoped create', () => {
  it('throws ScopeViolationError for non-writable app', async () => {
    const ctx = { tenantId: 't-1', functionalRoles: [], appMemberships: [] } as any as ScopeContext;
    const db = buildScopedDb({} as any, ctx);
    await expect(db.incidents.create({ title: 'x', applicationId: 'app-forbidden' } as any, { id: 'u-1', name: 'n' })).rejects.toThrow(/scope_violation/i);
  });
});
