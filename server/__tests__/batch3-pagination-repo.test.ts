import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';
import { problemsRepo } from '../repositories/docs';
import { randomUUID } from 'node:crypto';

const app = createApp();
let cookie: string;
let tenantId: string;
const createdProblemIds: string[] = [];
let createdCiIds: string[] = [];

beforeAll(async () => {
  // Ensure permissions exist for problem.read and cmdb.read
  for (const key of ['problem.read', 'cmdb.read', 'problem.create', 'problem.update'] as const) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: key } });
  }
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    for (const key of ['problem.read', 'cmdb.read']) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionKey: { roleId, permissionKey: key } },
        update: {},
        create: { roleId, permissionKey: key },
      });
    }
  }
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  // Resolve tenantId from login (admin tenant)
  const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
  tenantId = me.body.tenantId ?? 'tenant-demo';
  // Seed two problems with different status via repo directly if needed
  // Create one via repo then change status
  const p1 = await problemsRepo.create(
    tenantId,
    { title: 'Pagination Test Identified', description: 'identified desc', severity: 'P3', source: 'user_reported', affectedCIIds: [], affectedServiceIds: [], tags: [] } as any,
    { id: 'test-user-1', name: 'Tester' },
  );
  createdProblemIds.push(p1.id);
  const p2 = await problemsRepo.create(
    tenantId,
    { title: 'Pagination Test Investigating', description: 'investigating desc', severity: 'P3', source: 'user_reported', affectedCIIds: [], affectedServiceIds: [], tags: [] } as any,
    { id: 'test-user-1', name: 'Tester' },
  );
  createdProblemIds.push(p2.id);
  // Set second to investigating
  await problemsRepo.setStatus(tenantId, p2.publicId, 'investigating');
  // Ensure at least one CI with name containing api for search test
  const ci = await prisma.configurationItem.findFirst({ where: { tenantId } });
  if (ci && !ci.name.toLowerCase().includes('api')) {
    // create a CI with api in name
    const newId = randomUUID();
    const publicId = `CI-API-${Date.now().toString().slice(-5)}`;
    await prisma.configurationItem.create({
      data: {
        id: newId,
        publicId,
        tenantId,
        name: 'api-gateway-test',
        type: 'service',
        status: 'active',
        environment: 'production',
        criticality: 'medium',
        ownerTeamId: 'team-unassigned',
        primaryApplicationId: (await prisma.application.findFirst({ where: { tenantId } }))?.id ?? 'app-unassigned',
        health: 'healthy',
        attributes: '{}',
        tags: '[]',
      },
    });
    createdCiIds.push(newId);
  }
});

afterAll(async () => {
  for (const id of createdProblemIds) {
    await prisma.problem.deleteMany({ where: { id } }).catch(() => undefined);
  }
  for (const id of createdCiIds) {
    await prisma.configurationItem.deleteMany({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('GET /problems pagination pushdown', () => {
  it('filters by status server side', async () => {
    const res = await auth(request(app).get('/api/v1/problems?status=identified&page=1&pageSize=1'));
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(1);
    if (body.length > 0) expect(body[0].status).toBe('identified');
    // Ensure no investigating leaks in filtered result
    for (const p of body) expect(p.status).toBe('identified');
  });

  it('filters by search server side', async () => {
    const res = await auth(request(app).get('/api/v1/problems?search=Pagination%20Test%20Identified&page=1&pageSize=10'));
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(Array.isArray(body)).toBe(true);
    for (const p of body) {
      const hay = `${p.title} ${p.description}`.toLowerCase();
      expect(hay).toContain('pagination test identified');
    }
  });

  it('paginates pageSize 1', async () => {
    const res1 = await auth(request(app).get('/api/v1/problems?page=1&pageSize=1'));
    const res2 = await auth(request(app).get('/api/v1/problems?page=2&pageSize=1'));
    expect(res1.statusCode).toBe(200);
    expect(res2.statusCode).toBe(200);
    expect(res1.body.length).toBeLessThanOrEqual(1);
    expect(res2.body.length).toBeLessThanOrEqual(1);
    if (res1.body.length && res2.body.length) {
      expect(res1.body[0].publicId).not.toBe(res2.body[0].publicId);
    }
  });
});

describe('GET /cis search', () => {
  it('search filters server side', async () => {
    const res = await auth(request(app).get('/api/v1/cis?search=api&page=1&pageSize=5'));
    expect(res.statusCode).toBe(200);
    const body = res.body;
    expect(Array.isArray(body)).toBe(true);
    for (const ci of body) {
      const hay = `${ci.name} ${ci.publicId} ${ci.type}`.toLowerCase();
      expect(hay.includes('api')).toBe(true);
    }
  });

  it('paginates cis pageSize', async () => {
    const res = await auth(request(app).get('/api/v1/cis?page=1&pageSize=1'));
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });
});
