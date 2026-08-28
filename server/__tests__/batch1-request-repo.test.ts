import { describe, it, expect } from 'vitest';
import { requestsRepo } from '../repositories/docs';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';

function makeCatalogItem(tenantId: string, ownerTeamId: string) {
  const id = `cat-${randomUUID().slice(0, 8)}`;
  const publicId = `CAT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const data = JSON.stringify({
    id,
    publicId,
    name: 'Test Catalog Item',
    shortDescription: 'desc',
    description: 'full description',
    category: 'software',
    iconName: 'Package',
    estimatedFulfillmentDays: 2,
    ownerTeamId,
    popularity: 0,
    formFields: [],
    workflowTemplate: [
      { id: 'wf-step-1', name: 'Approval', type: 'approval', slaHours: 4, approverType: 'team' },
      { id: 'wf-step-2', name: 'Fulfillment', type: 'task', slaHours: 8 },
    ],
    linkedKBSlugs: [],
    tags: [],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { id, publicId, data, ownerTeamId };
}

describe('requestsRepo.create', () => {
  it('creates REQ-YYYY-NNNNN with workflow first pending->active', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    // need team and app for ownerTeamId mapping fallback - create dummy team
    await prisma.tenant.upsert({ where: { id: tenantId }, update: {}, create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` } });
    const div = await prisma.division.create({ data: { id: `div-${tenantId}`, tenantId, code: `DIV_${tenantId.slice(0, 8)}`, name: 'Div' } });
    const dept = await prisma.department.create({ data: { id: `dept-${tenantId}`, tenantId, divisionId: div.id, code: `DEPT_${tenantId.slice(0, 8)}`, name: 'Dept' } });
    const team = await prisma.team.create({ data: { id: `team-${tenantId}`, tenantId, departmentId: dept.id, code: `TEAM_${tenantId.slice(0, 8)}`, name: 'Team' } });
    const cat = makeCatalogItem(tenantId, team.id);
    await prisma.catalogItem.create({ data: { id: cat.id, tenantId, data: cat.data } });

    const created = await requestsRepo.create(tenantId, { id: 'u-1', name: 'Tester' }, { catalogItemId: cat.id, formData: { foo: 'bar' }, tags: ['t1'] });
    expect(created.publicId).toMatch(/^REQ-\d{4}-\d{5}$/);
    expect(created.title).toBe('Test Catalog Item');
    expect(created.workflow.steps.length).toBe(2);
    expect(created.workflow.steps[0].status).toBe('active');
    expect(created.workflow.steps[1].status).toBe('pending');
    expect(created.totalSlaHours).toBe(12);
    expect(created.status).toBe('submitted');
    expect(created.formData).toEqual({ foo: 'bar' });

    const row = await prisma.serviceRequest.findFirst({ where: { tenantId, publicId: created.publicId } });
    expect(row?.tenantId).toBe(tenantId);
    expect(row?.status).toBe('submitted');

    // cleanup
    await prisma.serviceRequest.deleteMany({ where: { tenantId } });
    await prisma.catalogItem.deleteMany({ where: { tenantId } });
    await prisma.applicationTeam.deleteMany({ where: { teamId: team.id } });
    await prisma.team.delete({ where: { id: team.id } });
    await prisma.department.delete({ where: { id: dept.id } });
    await prisma.division.delete({ where: { id: div.id } });
    await prisma.application.deleteMany({ where: { tenantId, code: 'UNASSIGNED' } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  it('throws 404 on unknown catalogItemId', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    await prisma.tenant.upsert({ where: { id: tenantId }, update: {}, create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` } });
    await expect(requestsRepo.create(tenantId, { id: 'u-1', name: 'Tester' }, { catalogItemId: 'no-such' } as any)).rejects.toMatchObject({ status: 404 });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
  });
});
