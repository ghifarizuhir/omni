import { describe, it, expect } from 'vitest';
import { incidentsRepo } from '../repositories/incidents';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';
describe('incidentsRepo.create B', () => {
  it('creates INC-YYYY-NNNNN with tenant isolation', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    const inc = await incidentsRepo.create(tenantId, { title: 'Test', priority: 'P2' } as any, { id: 'u-1', name: 'Tester' });
    expect(inc.publicId).toMatch(/^INC-\d{4}-\d{5}$/);
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId: inc.publicId } });
    expect(row?.tenantId).toBe(tenantId);
  });
});
