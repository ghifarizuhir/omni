import { describe, it, expect } from 'vitest';
import { problemsRepo } from '../repositories/docs';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';

describe('problemsRepo.create', () => {
  it('creates PRB-YYYY-NNNNN with tenant isolation', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    const problem = await problemsRepo.create(
      tenantId,
      { title: 'Test problem', description: 'desc', severity: 'P3', source: 'user_reported', affectedCIIds: [], affectedServiceIds: [], tags: [] } as any,
      { id: 'u-1', name: 'Tester' },
    );
    expect(problem.publicId).toMatch(/^PRB-\d{4}-\d{5}$/);
    expect(problem.id).toMatch(/^prb-/);
    const row = await prisma.problem.findFirst({ where: { tenantId, publicId: problem.publicId } });
    expect(row?.tenantId).toBe(tenantId);
    expect(row?.status).toBe('identified');
    // cleanup
    await prisma.problem.deleteMany({ where: { tenantId } }).catch(() => undefined);
    await prisma.application.deleteMany({ where: { tenantId, code: 'UNASSIGNED' } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
  });

  it('uses actor.id as ownerId default', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    const problem = await problemsRepo.create(
      tenantId,
      { title: 'Owner test', description: '', severity: 'P3', source: 'user_reported', affectedCIIds: [], affectedServiceIds: [], tags: [] } as any,
      { id: 'actor-123', name: 'Actor' },
    );
    expect(problem.ownerId).toBe('actor-123');
    await prisma.problem.deleteMany({ where: { tenantId } }).catch(() => undefined);
    await prisma.application.deleteMany({ where: { tenantId, code: 'UNASSIGNED' } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
  });
});
