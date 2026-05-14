// M6.11 — next two incident mutations following the same write-endpoint
// pattern as `incidents-resolve.test.ts`: POST a comment, PATCH the status.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
let publicId: string;
let internalId: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  // Pick a non-resolved incident so the status PATCH can move it.
  const candidate = await prisma.incident.findFirst({
    where: { tenantId: 'tenant-demo', status: { notIn: ['resolved', 'closed'] } },
    select: { id: true, publicId: true },
  });
  if (!candidate) throw new Error('seed has no open incidents');
  internalId = candidate.id;
  publicId = candidate.publicId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /api/v1/incidents/:incidentId/comments', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .post(`/api/v1/incidents/${internalId}/comments`)
      .send({ body: 'hi' });
    expect(res.status).toBe(401);
  });

  it('400 on empty body', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${internalId}/comments`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 on unknown incidentId', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/inc-no-such-id/comments'))
      .send({ body: 'hi' });
    expect(res.status).toBe(404);
  });

  it('appends a comment and returns it', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${internalId}/comments`)).send({
      body: 'Investigating now',
      isInternal: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Investigating now');
    expect(res.body.isInternal).toBe(true);
    expect(res.body.authorId).toBeDefined();
    expect(res.body.authorName).toBeDefined();

    const list = await auth(request(app).get(`/api/v1/incidents/${internalId}/comments`));
    expect(list.status).toBe(200);
    expect(list.body.some((c: { body: string }) => c.body === 'Investigating now')).toBe(true);
  });
});

describe('PATCH /api/v1/incidents/:publicId/status', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .send({ status: 'triaging' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid status string (400)', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/status`))
      .send({ status: 'on_holiday' });
    expect(res.status).toBe(400);
  });

  it('refuses the `resolved` transition (use /resolve)', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/status`))
      .send({ status: 'resolved' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/resolve/i);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/incidents/INC-NOPE/status'))
      .send({ status: 'triaging' });
    expect(res.status).toBe(404);
  });

  it('transitions the incident, appends a status_changed timeline event', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/status`))
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('triaging');

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.status).toBe('triaging');

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    const kinds = tl.body.map((e: { kind: string }) => e.kind);
    expect(kinds).toContain('status_changed');
  });

  it('audit log with before/after', async () => {
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'status_change' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('caller without incident.write → 403', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-status-deny-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`).set('Cookie', opCookie)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);

    // Restore
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
