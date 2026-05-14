// M6.11 B4.1 — PATCH /incidents/:publicId. Generic partial-update for
// metadata fields without a dedicated specialized endpoint (priority, tags).
// Mirrors the cloned-seed-fixture pattern from incidents-workflow.test.ts so
// each describe gets its own incident.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;

const cloneIncident = async (suffix: string) => {
  const base = await prisma.incident.findFirst({
    where: { tenantId: 'tenant-demo', status: { notIn: ['resolved', 'closed'] } },
  });
  if (!base) throw new Error('seed has no open incidents to clone');
  const internalId = `${base.id}-up-${suffix}`;
  const publicId = `${base.publicId}-UP-${suffix}`;
  const data = JSON.parse(base.data);
  data.id = internalId;
  data.publicId = publicId;
  data.priority = 'P3';
  data.tags = ['seed-tag'];
  await prisma.incident.create({
    data: {
      ...base,
      id: internalId,
      publicId,
      data: JSON.stringify(data),
      priority: 'P3',
    },
  });
  return { internalId, publicId };
};

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);
const rand = () => Math.random().toString(36).slice(2, 8);

describe('PATCH /api/v1/incidents/:publicId', () => {
  let publicId: string;
  let internalId: string;
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let upCustomRoleId: string | null = null;
  let upMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneIncident(`gen-${rand()}`));
  });

  afterAll(async () => {
    if (upMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${upMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (upCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${upCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).patch(`/api/v1/incidents/${publicId}`).send({ priority: 'P1' });
    expect(res.status).toBe(401);
  });

  it('400 empty body (refine rejects)', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`)).send({});
    expect(res.status).toBe(400);
  });

  it('400 invalid priority', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`)).send({ priority: 'P9' });
    expect(res.status).toBe(400);
  });

  it('400 tag too long', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`))
      .send({ tags: ['x'.repeat(51)] });
    expect(res.status).toBe(400);
  });

  it('404 unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/incidents/INC-NOPE')).send({ priority: 'P1' });
    expect(res.status).toBe(404);
  });

  it('200 priority only → GET reflects + audit + priority_changed timeline', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`)).send({ priority: 'P1' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('P1');

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.priority).toBe('P1');

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('priority_changed');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('200 tags only → GET reflects + audit + NO priority_changed event', async () => {
    const tagsClone = await cloneIncident(`tags-${rand()}`);
    const res = await auth(request(app).patch(`/api/v1/incidents/${tagsClone.publicId}`))
      .send({ tags: ['alpha', 'beta'] });
    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual(['alpha', 'beta']);

    const after = await auth(request(app).get(`/api/v1/incidents/${tagsClone.publicId}`));
    expect(after.body.tags).toEqual(['alpha', 'beta']);

    const tl = await auth(request(app).get(`/api/v1/incidents/${tagsClone.internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).not.toContain('priority_changed');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: tagsClone.internalId, action: 'update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });

  it('200 priority + tags together', async () => {
    const bothClone = await cloneIncident(`both-${rand()}`);
    const res = await auth(request(app).patch(`/api/v1/incidents/${bothClone.publicId}`))
      .send({ priority: 'P2', tags: ['urgent'] });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('P2');
    expect(res.body.tags).toEqual(['urgent']);

    const tl = await auth(request(app).get(`/api/v1/incidents/${bothClone.internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('priority_changed');
  });

  it('200 no-op when priority unchanged → no priority_changed event written', async () => {
    const sameClone = await cloneIncident(`same-${rand()}`);
    // Seed sets priority=P3; patch to the same value.
    const res = await auth(request(app).patch(`/api/v1/incidents/${sameClone.publicId}`))
      .send({ priority: 'P3' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('P3');

    const tl = await auth(request(app).get(`/api/v1/incidents/${sameClone.internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).not.toContain('priority_changed');
  });

  it('403 without incident.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-incup-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);
    upCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    upMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).patch(`/api/v1/incidents/${publicId}`).set('Cookie', opCookie)
      .send({ priority: 'P4' });
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});
