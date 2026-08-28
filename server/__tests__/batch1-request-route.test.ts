import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';
import { randomUUID } from 'node:crypto';

const app = createApp();
let cookie: string;
let createdPublicId: string | null = null;
let catalogItemId: string;

beforeAll(async () => {
  // Ensure request.create permission exists and admin has it
  await prisma.permission.upsert({ where: { key: 'request.create' }, update: {}, create: { key: 'request.create', description: 'Create service requests' } });
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    await prisma.rolePermission.upsert({ where: { roleId_permissionKey: { roleId, permissionKey: 'request.create' } }, update: {}, create: { roleId, permissionKey: 'request.create' } });
  }
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Seed a catalog item for tenant-demo
  const tenantId = 'tenant-demo';
  const id = `cat-route-${randomUUID().slice(0, 8)}`;
  const catData = JSON.stringify({
    id,
    publicId: 'CAT-ROUTE-001',
    name: 'Route Test Item',
    shortDescription: 'desc',
    description: 'full',
    category: 'software',
    iconName: 'Package',
    estimatedFulfillmentDays: 1,
    ownerTeamId: 'team-route',
    popularity: 0,
    formFields: [],
    workflowTemplate: [
      { id: 'wf-route-1', name: 'Approval', type: 'approval', slaHours: 2 },
      { id: 'wf-route-2', name: 'Task', type: 'task', slaHours: 5 },
    ],
    linkedKBSlugs: [],
    tags: [],
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await prisma.catalogItem.create({ data: { id, tenantId, data: catData } });
  catalogItemId = id;
});

afterAll(async () => {
  if (createdPublicId) {
    const row = await prisma.serviceRequest.findUnique({ where: { publicId: createdPublicId } }).catch(() => null);
    if (row) await prisma.serviceRequest.delete({ where: { id: row.id } }).catch(() => undefined);
  }
  if (catalogItemId) await prisma.catalogItem.deleteMany({ where: { id: catalogItemId } }).catch(() => undefined);
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /api/v1/requests', () => {
  it('201 creates REQ-YYYY-NNNNN and workflow', async () => {
    const res = await auth(request(app).post('/api/v1/requests')).send({ catalogItemId, formData: { reason: 'need' }, tags: ['a'] });
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^REQ-\d{4}-\d{5}$/);
    expect(res.body.catalogItemId).toBe(catalogItemId);
    expect(res.body.workflow.steps.length).toBe(2);
    expect(res.body.workflow.steps[0].status).toBe('active');
    expect(res.body.status).toBe('submitted');
    createdPublicId = res.body.publicId;

    const fetched = await auth(request(app).get(`/api/v1/requests/${createdPublicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.publicId).toBe(createdPublicId);
  });

  it('400 missing catalogItemId', async () => {
    const res = await auth(request(app).post('/api/v1/requests')).send({ formData: {} } as any);
    expect(res.status).toBe(400);
  });

  it('400 rejects unknown field', async () => {
    const res = await auth(request(app).post('/api/v1/requests')).send({ catalogItemId, status: 'closed' } as any);
    expect(res.status).toBe(400);
  });

  it('404 on unknown catalogItemId', async () => {
    const res = await auth(request(app).post('/api/v1/requests')).send({ catalogItemId: 'no-such-id' });
    expect(res.status).toBe(404);
  });

  it('401 unauth', async () => {
    const res = await request(app).post('/api/v1/requests').send({ catalogItemId });
    expect(res.status).toBe(401);
  });
});
