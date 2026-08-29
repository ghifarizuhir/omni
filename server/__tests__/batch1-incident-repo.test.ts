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

  it('starts each tenant at INC-YYYY-00001 (per-tenant isolation)', async () => {
    const tenantA = `tenant-iso-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tenantB = `tenant-iso-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const year = new Date().getFullYear();
    const [a, b] = await Promise.all([
      incidentsRepo.create(tenantA, { title: 'iso a' }, { id: 'u-a', name: 'A' }),
      incidentsRepo.create(tenantB, { title: 'iso b' }, { id: 'u-b', name: 'B' }),
    ]);
    expect(a.publicId).toBe(`INC-${year}-00001`);
    expect(b.publicId).toBe(`INC-${year}-00001`);
    const rowA = await prisma.incident.findFirst({ where: { tenantId: tenantA, publicId: a.publicId } });
    const rowB = await prisma.incident.findFirst({ where: { tenantId: tenantB, publicId: b.publicId } });
    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();
    await prisma.incidentCounter.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.incident.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
  });
});
