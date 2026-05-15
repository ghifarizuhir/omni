import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { createScopedAppFixture, login, type ScopedAppFixture } from './helpers';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

const app = createApp();

let fix: ScopedAppFixture;

beforeAll(async () => {
  fix = await createScopedAppFixture('dq');
});

afterEach(async () => {
  // Remove any CI rows created during tests
  await prisma.configurationItem.deleteMany({ where: { id: { startsWith: 'ci-dq-test-' } } });
});

afterAll(async () => {
  await fix.cleanup();
  await prisma.$disconnect();
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function getTenantId(): Promise<string> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' } });
  return tenant.id;
}

async function createOrphanCI(tenantId: string, publicId: string) {
  return prisma.configurationItem.create({
    data: {
      id: `ci-${publicId}`,
      tenantId,
      publicId,
      name: `Orphan CI ${publicId}`,
      type: 'server',
      environment: 'production',
      status: 'active',
      criticality: 'medium',
      ownerTeamId: 'team-a-dq',
      health: 'healthy',
      attributes: '{}',
      tags: '[]',
      primaryApplicationId: null,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /admin/data-quality/summary', () => {
  it('returns per-module totals for admin', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .get('/api/v1/admin/data-quality/summary')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('cmdb');
    expect(res.body.cmdb).toHaveProperty('total');
    expect(res.body.cmdb).toHaveProperty('orphan');
    expect(res.body).toHaveProperty('event');
    expect(res.body).toHaveProperty('incident');
    expect(res.body).toHaveProperty('change');
    expect(res.body).toHaveProperty('problem');
    expect(res.body).toHaveProperty('service_request');
  });

  it('blocks non-admin from /admin/data-quality/summary', async () => {
    // memberA is an operator, not system.admin
    const cookie = await login(app, fix.emailOf('member-a'), fix.password);
    const res = await request(app)
      .get('/api/v1/admin/data-quality/summary')
      .set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/data-quality/:module', () => {
  it('lists orphan CIs for the cmdb module', async () => {
    const tenantId = await getTenantId();
    await createOrphanCI(tenantId, 'dq-test-orphan-1');

    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .get('/api/v1/admin/data-quality/cmdb')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const found = res.body.find((r: { publicId: string }) => r.publicId === 'dq-test-orphan-1');
    expect(found).toBeDefined();
  });
});

describe('PATCH /admin/data-quality/:module/:id', () => {
  it('assigns an application to an orphan CI', async () => {
    const tenantId = await getTenantId();
    await createOrphanCI(tenantId, 'dq-test-patch-1');

    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .patch('/api/v1/admin/data-quality/cmdb/dq-test-patch-1')
      .set('Cookie', cookie)
      .send({ applicationId: fix.appId });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // Verify it's no longer orphan
    const ci = await prisma.configurationItem.findFirst({ where: { publicId: 'dq-test-patch-1' } });
    expect(ci?.primaryApplicationId).toBe(fix.appId);
  });

  it('returns 400 when applicationId does not exist in tenant', async () => {
    const tenantId = await getTenantId();
    await createOrphanCI(tenantId, 'dq-test-patch-bad');

    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .patch('/api/v1/admin/data-quality/cmdb/dq-test-patch-bad')
      .set('Cookie', cookie)
      .send({ applicationId: 'nonexistent-app-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/applicationId not found/);
  });
});

describe('POST /admin/data-quality/:module/bulk', () => {
  it('bulk assigns multiple CIs to an application', async () => {
    const tenantId = await getTenantId();
    await createOrphanCI(tenantId, 'dq-test-bulk-1');
    await createOrphanCI(tenantId, 'dq-test-bulk-2');

    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/admin/data-quality/cmdb/bulk')
      .set('Cookie', cookie)
      .send({ ids: ['dq-test-bulk-1', 'dq-test-bulk-2'], applicationId: fix.appId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('updated');
    expect(res.body.updated).toBe(2);
  });
});
