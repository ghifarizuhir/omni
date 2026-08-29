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

  it('allocates unique publicIds under concurrent creates and writes a created timeline event', async () => {
    const tenantId = `tenant-conc-${Date.now()}`;
    const make = () =>
      incidentsRepo.create(tenantId, { title: 'conc' }, { id: 'u-conc', name: 'Conc' });
    const [a, b] = await Promise.all([make(), make()]);
    expect(a.publicId).not.toBe(b.publicId);
    expect(a.publicId).toMatch(/^INC-\d{4}-\d{5}$/);
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId: a.publicId } });
    expect(row).toBeTruthy();
    const created = await prisma.incidentTimelineEvent.findFirst({
      where: { incidentId: row!.id, kind: 'created' },
    });
    expect(created).toBeTruthy();
    await prisma.incidentTimelineEvent.deleteMany({ where: { tenantId } });
    await prisma.incident.deleteMany({ where: { tenantId } });
  });
});
