import { describe, it, expect, vi } from 'vitest';
import { buildScopedDb } from '../scope/scopedDb';
describe('ChangesScope.castVote', () => {
  it('throws ScopeViolationError for non-writable app', async () => {
    const fakePrisma = { change: { findFirst: vi.fn().mockResolvedValue({ applicationId: 'app-forbidden' }) } } as any;
    const ctx = { tenantId: 't-1', functionalRoles: [], appMemberships: [] } as any;
    const db = buildScopedDb(fakePrisma, ctx);
    await expect(db.changes.castVote('CHG-2026-00001', { decision: 'approve', voterId: 'u-1', voterName: 'U One' } as any)).rejects.toThrow(/scope_violation/i);
  });
});
