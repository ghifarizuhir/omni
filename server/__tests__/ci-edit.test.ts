// M6.11 (B1.3) — CMDB CI edit: PATCH /cis/:publicId. Same shape as B1.1/B1.2:
// Zod body, requirePermission('cmdb.write'), repo snapshots before/after,
// audit log row, GET round-trips reflect persisted state. Hermetic: a seed CI
// is cloned in beforeAll so re-runs don't fight over the original fixture.

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

  const candidate = await prisma.configurationItem.findFirst({
    where: { tenantId: 'tenant-demo' },
  });
  if (!candidate) throw new Error('seed has no CIs to clone for B1.3 test');

  const suffix = Math.random().toString(36).slice(2, 8);
  seedInternalId = `${candidate.id}-b13-${suffix}`;
  seedPublicId = `${candidate.publicId}-B13-${suffix.toUpperCase()}`;
  await prisma.configurationItem.create({
    data: {
      ...candidate,
      id: seedInternalId,
      publicId: seedPublicId,
    },
  });
});

afterAll(async () => {
  await prisma.configurationItem.deleteMany({ where: { id: seedInternalId } });
  await prisma.$disconnect();
});

describe('PATCH /api/v1/cis/:publicId', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app)
      .patch(`/api/v1/cis/${seedPublicId}`)
      .send({ name: 'no auth' });
    expect(res.status).toBe(401);
  });

  it('400 on body trying to mutate forbidden publicId field (strict schema)', async () => {
    const res = await auth(request(app).patch(`/api/v1/cis/${seedPublicId}`))
      .send({ publicId: 'CI-HACKED-001' });
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/cis/CI-DOES-NOT-EXIST'))
      .send({ name: 'whatever' });
    expect(res.status).toBe(404);
  });

  it('renames a field; GET round-trip reflects it', async () => {
    const newName = `B1.3 Test Rename ${Date.now()}`;
    const res = await auth(request(app).patch(`/api/v1/cis/${seedPublicId}`))
      .send({ name: newName, criticality: 'medium' });
    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe(seedPublicId);
    expect(res.body.name).toBe(newName);
    expect(res.body.criticality).toBe('medium');

    const fetched = await auth(request(app).get(`/api/v1/cis/${seedPublicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe(newName);
    expect(fetched.body.criticality).toBe('medium');
  });

  it('writes an audit log row with before/after for ConfigurationItem update', async () => {
    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant-demo',
        resourceKind: 'ConfigurationItem',
        action: 'update',
        resourceId: seedInternalId,
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('caller with cmdb.read only → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-cmdb-read-${Date.now()}`, permissions: ['cmdb.read'] });
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
      .patch(`/api/v1/cis/${seedPublicId}`).set('Cookie', opCookie)
      .send({ name: 'should not work' });
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
