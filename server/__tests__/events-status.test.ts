// M6.11 (B1.2) — Event status writes: PATCH /events/:publicId/status.
// Same shape as the other M6.11 write suites: Zod body, requirePermission
// ('event.write'), repo snapshots before/after, audit log row, GET round-trips
// reflect persisted state. Hermetic: a non-resolved seed Event is cloned in
// beforeAll so re-runs don't fight over the original fixture.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

let seedPublicId: string;
let seedInternalId: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

  const candidate = await prisma.event.findFirst({
    where: { tenantId: 'tenant-demo', status: { notIn: ['resolved'] } },
  });
  if (!candidate) throw new Error('seed has no non-resolved events to clone for B1.2 test');

  const suffix = Math.random().toString(36).slice(2, 8);
  seedInternalId = `${candidate.id}-b12-${suffix}`;
  seedPublicId = `${candidate.publicId}-B12-${suffix.toUpperCase()}`;
  await prisma.event.create({
    data: {
      ...candidate,
      id: seedInternalId,
      publicId: seedPublicId,
      status: 'open',
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
      resolvedBy: null,
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PATCH /api/v1/events/:publicId/status', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .patch(`/api/v1/events/${seedPublicId}/status`)
      .send({ status: 'acknowledged' });
    expect(res.status).toBe(401);
  });

  it('400 on invalid status', async () => {
    const res = await auth(request(app).patch(`/api/v1/events/${seedPublicId}/status`))
      .send({ status: 'nonsense' });
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/events/EVT-DOES-NOT-EXIST/status'))
      .send({ status: 'acknowledged' });
    expect(res.status).toBe(404);
  });

  it('acknowledges, then resolves; GET round-trips reflect the new status', async () => {
    const ack = await auth(request(app).patch(`/api/v1/events/${seedPublicId}/status`))
      .send({ status: 'acknowledged' });
    expect(ack.status).toBe(200);
    expect(ack.body.status).toBe('acknowledged');
    expect(ack.body.acknowledgedAt).toBeTruthy();
    expect(ack.body.acknowledgedBy).toBeTruthy();

    const afterAck = await auth(request(app).get(`/api/v1/events/${seedPublicId}`));
    expect(afterAck.status).toBe(200);
    expect(afterAck.body.status).toBe('acknowledged');

    const resolve = await auth(request(app).patch(`/api/v1/events/${seedPublicId}/status`))
      .send({ status: 'resolved', note: 'fixed by restart' });
    expect(resolve.status).toBe(200);
    expect(resolve.body.status).toBe('resolved');
    expect(resolve.body.resolvedAt).toBeTruthy();
    expect(resolve.body.resolvedBy).toBeTruthy();

    const afterResolve = await auth(request(app).get(`/api/v1/events/${seedPublicId}`));
    expect(afterResolve.status).toBe(200);
    expect(afterResolve.body.status).toBe('resolved');
  });

  it('writes an audit log row with before/after for status_change', async () => {
    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant-demo',
        resourceKind: 'Event',
        action: 'status_change',
        resourceId: seedInternalId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('caller with event.read only → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-event-read-${Date.now()}`, permissions: ['event.read'] });
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
      .patch(`/api/v1/events/${seedPublicId}/status`).set('Cookie', opCookie)
      .send({ status: 'open' });
    expect(res.status).toBe(403);

    // Restore operator's seed role.
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
