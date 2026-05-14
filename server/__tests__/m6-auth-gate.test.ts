// M6.9 — global auth gate on /api/v1.
//
// Three invariants this test pins down:
//
//   1. Unauthenticated requests to data routes get 401 — `requireAuth` is the
//      gate, not the accidental side-effect of `adminRouter.use(...)`.
//   2. `/admin/*` still 403s non-admin users — admin scoping survived M6.9.
//   3. Authenticated non-admin users can reach data routes — they used to be
//      blocked by the unscoped admin guard.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let operatorEmail: string;

beforeAll(async () => {
  const op = await prisma.user.findFirst({ where: { email: { not: ADMIN_EMAIL } } });
  if (!op) throw new Error('seed must include a non-admin user');
  operatorEmail = op.email;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('M6.9 auth gate', () => {
  it('unauthenticated GET /api/v1/cis → 401', async () => {
    const res = await request(app).get('/api/v1/cis');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('unauthenticated GET /api/v1/admin/roles → 401', async () => {
    const res = await request(app).get('/api/v1/admin/roles');
    expect(res.status).toBe(401);
  });

  it('non-admin authenticated GET /api/v1/admin/roles → 403', async () => {
    const cookie = await login(app, operatorEmail, 'demo');
    const res = await request(app).get('/api/v1/admin/roles').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('non-admin authenticated GET /api/v1/cis → 200 (no longer accidentally gated)', async () => {
    const cookie = await login(app, operatorEmail, 'demo');
    const res = await request(app).get('/api/v1/cis').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('admin authenticated GET /api/v1/cis → 200', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/cis').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  // M6.10 — per-resource permission guards
  it('operator (default seed role) can read every domain', async () => {
    const cookie = await login(app, operatorEmail, 'demo');
    for (const path of [
      '/api/v1/cis', '/api/v1/services',
      '/api/v1/events', '/api/v1/monitoring/rules',
      '/api/v1/incidents', '/api/v1/problems',
      '/api/v1/changes', '/api/v1/releases', '/api/v1/deployments',
      '/api/v1/requests', '/api/v1/catalog', '/api/v1/kb/articles',
      '/api/v1/improvements',
      '/api/v1/availability/outages', '/api/v1/capacity/metrics',
      '/api/v1/users', '/api/v1/teams',
      '/api/v1/notifications', '/api/v1/inbox',
      '/api/v1/on-call/schedules', '/api/v1/testing/plans',
      '/api/v1/status-page/entries', '/api/v1/ai/sessions',
      '/api/v1/continuity/dr-plans', '/api/v1/measurement/reports',
      '/api/v1/integrations',
    ]) {
      const res = await request(app).get(path).set('Cookie', cookie);
      expect(res.status, `GET ${path}`).toBe(200);
    }
  });

  it('caller missing a specific permission → 403 (custom tenant role with only cmdb.read)', async () => {
    // Build a fresh user with a tenant role that grants ONLY cmdb.read,
    // then prove they can read /cis but not /incidents or /changes.
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const roleName = `m6-cmdb-only-${Date.now()}`;
    const created = await request(app)
      .post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: roleName, permissions: ['cmdb.read'] });
    expect(created.status).toBe(201);

    // Re-target an existing non-admin user's membership to this role.
    const op = await prisma.user.findFirstOrThrow({ where: { email: operatorEmail } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const cookie = await login(app, operatorEmail, 'demo');
    const cis = await request(app).get('/api/v1/cis').set('Cookie', cookie);
    expect(cis.status).toBe(200);
    const incidents = await request(app).get('/api/v1/incidents').set('Cookie', cookie);
    expect(incidents.status).toBe(403);
    const changes = await request(app).get('/api/v1/changes').set('Cookie', cookie);
    expect(changes.status).toBe(403);

    // Restore the operator's seed role so subsequent test files / re-runs see
    // the same starting state. The seed assigns the 'operator' system role.
    const opRole = await prisma.role.findFirstOrThrow({
      where: { name: 'operator', isSystem: true, tenantId: null },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [opRole.id] });
    await request(app)
      .delete(`/api/v1/admin/roles/${created.body.id}`).set('Cookie', adminCookie);
  });
});
