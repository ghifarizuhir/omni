// M6.11 demo slice — POST /incidents/:incidentId/resolve.
// Proves the write-endpoint pattern that the rest of the M6.11 backlog will
// follow: Zod-validated body → repo writes Incident.data + a timeline event →
// audit log gets `before`/`after` snapshots → GET reflects the new state.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;

// Clone a non-resolved seed incident so the suite is hermetic across re-runs.
// (Resolve mutates state; without cloning, a second run finds no open
// incidents to transition.)
let publicId: string;
let internalId: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  const candidate = await prisma.incident.findFirst({
    where: { tenantId: 'tenant-demo', status: { notIn: ['resolved', 'closed'] } },
  });
  if (!candidate) throw new Error('seed has no open incidents to clone for resolve test');

  const suffix = Math.random().toString(36).slice(2, 8);
  internalId = `${candidate.id}-resolve-${suffix}`;
  publicId = `${candidate.publicId}-RESOLVE-${suffix}`;
  const data = JSON.parse(candidate.data);
  data.id = internalId;
  data.publicId = publicId;
  await prisma.incident.create({
    data: {
      ...candidate,
      id: internalId,
      publicId,
      data: JSON.stringify(data),
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /api/v1/incidents/:publicId/resolve', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .post(`/api/v1/incidents/${publicId}/resolve`)
      .send({ summary: 'x' });
    expect(res.status).toBe(401);
  });

  it('validates body — missing summary → 400', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/resolve`)).send({});
    expect(res.status).toBe(400);
  });

  it('unknown publicId → 404', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/INC-DOES-NOT-EXIST/resolve'))
      .send({ summary: 'x' });
    expect(res.status).toBe(404);
  });

  it('resolves the incident, returns the updated snapshot', async () => {
    const before = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(before.status).toBe(200);
    expect(before.body.status).not.toBe('resolved');

    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/resolve`)).send({
      summary: 'Reverted the bad deploy',
      rootCause: 'Race in payment gateway warmup',
      workaround: 'Retry from the client',
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    expect(res.body.resolution?.summary).toBe('Reverted the bad deploy');
    expect(res.body.resolution?.rootCause).toBe('Race in payment gateway warmup');
    expect(res.body.resolution?.resolvedAt).toBeDefined();
    expect(res.body.resolution?.resolvedBy).toBeDefined();
  });

  it('GET reflects the resolved state across the round-trip', async () => {
    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.status).toBe(200);
    expect(after.body.status).toBe('resolved');
    expect(after.body.resolution?.summary).toBe('Reverted the bad deploy');
  });

  it('appends a "resolved" timeline event', async () => {
    const incident = { id: internalId };
    const tl = await auth(request(app).get(`/api/v1/incidents/${incident.id}/timeline`));
    expect(tl.status).toBe(200);
    const kinds = tl.body.map((e: { kind: string }) => e.kind);
    expect(kinds).toContain('resolved');
  });

  it('writes an audit log entry with before/after', async () => {
    const incident = { id: internalId };
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: incident.id, action: 'resolve' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('non-admin without incident.resolve → 403', async () => {
    // Create a tenant role with only cmdb.read, assign to an operator,
    // and verify the resolve endpoint refuses.
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-incident-deny-${Date.now()}`, permissions: ['cmdb.read'] });
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
      .post(`/api/v1/incidents/${publicId}/resolve`).set('Cookie', opCookie)
      .send({ summary: 'should not work' });
    expect(res.status).toBe(403);

    // Restore the operator's seed role so other tests stay hermetic.
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
