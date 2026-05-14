// M6.11 (B1.1) — AlertRoute writes: POST / PATCH / DELETE.
// Same shape as the other M6.11 write suites: Zod body, requirePermission
// ('rule.write'), repo snapshots before/after, audit log row, GET round-trips
// reflect persisted state. Tests are hermetic: a seed route is cloned in
// beforeAll so re-runs don't mutate the original fixture.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

// Cloned seed fixture publicId so PATCH/DELETE tests don't fight over a single
// row when the suite re-runs.
let seedPublicId: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

  const candidate = await prisma.alertRoute.findFirst({
    where: { tenantId: 'tenant-demo' },
  });
  if (!candidate) throw new Error('seed has no alert routes to clone for B1.1 test');

  const suffix = Math.random().toString(36).slice(2, 8);
  const newInternalId = `${candidate.id}-b11-${suffix}`;
  seedPublicId = `${candidate.publicId}-B11-${suffix.toUpperCase()}`;
  const data = JSON.parse(candidate.data);
  data.id = newInternalId;
  data.publicId = seedPublicId;
  await prisma.alertRoute.create({
    data: {
      tenantId: candidate.tenantId,
      id: newInternalId,
      publicId: seedPublicId,
      data: JSON.stringify(data),
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validCreateBody = () => ({
  name: 'M6.11 B1.1 — Test route',
  description: 'Created by alert-routes-writes test suite',
  enabled: true,
  channels: ['email', 'slack'] as const,
  matchExpression: { severities: ['P1', 'P2'] as const, tags: ['production'] },
});

describe('POST /api/v1/monitoring/routes', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/v1/monitoring/routes').send(validCreateBody());
    expect(res.status).toBe(401);
  });

  it('400 on missing name', async () => {
    const body = { ...validCreateBody(), name: '' };
    const res = await auth(request(app).post('/api/v1/monitoring/routes')).send(body);
    expect(res.status).toBe(400);
  });

  it('creates a new alert route and GET reflects it', async () => {
    const res = await auth(request(app).post('/api/v1/monitoring/routes')).send(validCreateBody());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.publicId).toBeDefined();
    expect(res.body.name).toBe('M6.11 B1.1 — Test route');
    expect(res.body.enabled).toBe(true);
    expect(res.body.channels).toEqual(['email', 'slack']);

    const fetched = await auth(request(app).get(`/api/v1/monitoring/routes/${res.body.publicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.publicId).toBe(res.body.publicId);
    expect(fetched.body.name).toBe('M6.11 B1.1 — Test route');
  });

  it('caller without rule.write → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-rule-read-${Date.now()}`, permissions: ['rule.read'] });
    expect(created.status).toBe(201);

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post('/api/v1/monitoring/routes').set('Cookie', opCookie).send(validCreateBody());
    expect(res.status).toBe(403);

    // Restore
    const opRole = await prisma.role.findFirstOrThrow({
      where: { name: 'operator', isSystem: true, tenantId: null },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [opRole.id] });
    await request(app)
      .delete(`/api/v1/admin/roles/${created.body.id}`).set('Cookie', cookie);
  });
});

describe('PATCH /api/v1/monitoring/routes/:publicId', () => {
  it('updates fields on an existing route', async () => {
    const res = await auth(request(app).patch(`/api/v1/monitoring/routes/${seedPublicId}`)).send({
      name: 'Renamed by B1.1 test',
      enabled: false,
      channels: ['email'],
    });
    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(seedPublicId);
    expect(res.body.name).toBe('Renamed by B1.1 test');
    expect(res.body.enabled).toBe(false);
    expect(res.body.channels).toEqual(['email']);

    const fetched = await auth(request(app).get(`/api/v1/monitoring/routes/${seedPublicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Renamed by B1.1 test');
  });

  it('400 on invalid body (name too long)', async () => {
    const res = await auth(request(app).patch(`/api/v1/monitoring/routes/${seedPublicId}`))
      .send({ name: 'x'.repeat(500) });
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/monitoring/routes/ROUTE-DOES-NOT-EXIST'))
      .send({ name: 'whatever' });
    expect(res.status).toBe(404);
  });

  it('caller with rule.read only → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-rule-read-patch-${Date.now()}`, permissions: ['rule.read'] });
    expect(created.status).toBe(201);

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app)
      .patch(`/api/v1/monitoring/routes/${seedPublicId}`).set('Cookie', opCookie)
      .send({ name: 'should not work' });
    expect(res.status).toBe(403);

    // Restore
    const opRole = await prisma.role.findFirstOrThrow({
      where: { name: 'operator', isSystem: true, tenantId: null },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [opRole.id] });
    await request(app)
      .delete(`/api/v1/admin/roles/${created.body.id}`).set('Cookie', cookie);
  });

  it('writes an audit log entry with before/after', async () => {
    await auth(request(app).patch(`/api/v1/monitoring/routes/${seedPublicId}`))
      .send({ description: 'Audit log probe' });
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'AlertRoute', action: 'update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });
});

describe('DELETE /api/v1/monitoring/routes/:publicId', () => {
  it('204 happy path; follow-up GET 404', async () => {
    // Create a throwaway route so we don't clobber the shared seed clone.
    const create = await auth(request(app).post('/api/v1/monitoring/routes'))
      .send({ ...validCreateBody(), name: 'B1.1 delete-me' });
    expect(create.status).toBe(201);
    const pid = create.body.publicId;

    const res = await auth(request(app).delete(`/api/v1/monitoring/routes/${pid}`));
    expect(res.status).toBe(204);

    const after = await auth(request(app).get(`/api/v1/monitoring/routes/${pid}`));
    expect(after.status).toBe(404);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).delete('/api/v1/monitoring/routes/ROUTE-DOES-NOT-EXIST'));
    expect(res.status).toBe(404);
  });
});
