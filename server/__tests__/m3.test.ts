import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;

beforeAll(async () => { cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD); });
afterAll(async () => { await prisma.$disconnect(); });

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('M3 domain coverage (DB-backed)', () => {
  it.each([
    ['/services', 1],
    ['/problems', 1],
    ['/changes', 1],
    ['/releases', 1],
    ['/deployments', 1],
    ['/requests', 1],
    ['/catalog', 1],
    ['/integrations', 1],
    ['/kb/articles', 1],
  ])('GET /api/v1%s returns at least %i item', async (path, min) => {
    const res = await auth(request(app).get(`/api/v1${path}`));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(min);
  });

  it('GET /deployments?active=true filters by status', async () => {
    const res = await auth(request(app).get('/api/v1/deployments?active=true'));
    expect(res.status).toBe(200);
    expect(res.body.every((d: { status: string }) => ['running', 'pending'].includes(d.status))).toBe(true);
  });

  it('integrations stats endpoint computes totals', async () => {
    const res = await auth(request(app).get('/api/v1/integrations/stats'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('healthy');
  });

  it('PATCH /integrations/:id writes through to DB and emits audit log', async () => {
    const list = await auth(request(app).get('/api/v1/integrations'));
    const target = list.body[0];
    const patch = await auth(request(app).patch(`/api/v1/integrations/${target.id}`).send({ enabled: !target.enabled }));
    expect(patch.status).toBe(200);
    expect(patch.body.enabled).toBe(!target.enabled);

    const auditRes = await auth(request(app).get(`/api/v1/admin/audit?resourceKind=Integration&resourceId=${target.id}`));
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.some((l: { action: string }) => l.action === 'integration.update')).toBe(true);

    // restore
    await auth(request(app).patch(`/api/v1/integrations/${target.id}`).send({ enabled: target.enabled }));
  });
});
