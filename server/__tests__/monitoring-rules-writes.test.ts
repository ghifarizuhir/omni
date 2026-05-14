// M6.11 (B7) — MonitoringRule writes: POST / PATCH / DELETE.
// Mirrors the B1.1 alert-routes-writes suite. Each test is hermetic: a seed
// rule is cloned in `beforeAll` so re-runs don't fight over a single row.
// 403 cases clone the operator role onto a per-test scope and restore in the
// outer cleanup (B1.4 lesson: capture mutable IDs in outer scope).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

// Cloned-seed publicId for the PATCH/DELETE tests.
let seedPublicId: string;
// Real alert route id from the seed — every rule has to reference one.
let seedAlertRouteId: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

  const candidate = await prisma.monitoringRule.findFirst({
    where: { tenantId: 'tenant-demo' },
  });
  if (!candidate) throw new Error('seed has no monitoring rules to clone for B7 test');

  const suffix = Math.random().toString(36).slice(2, 8);
  const newInternalId = `${candidate.id}-b7-${suffix}`;
  seedPublicId = `${candidate.publicId}-B7-${suffix.toUpperCase()}`;
  const data = JSON.parse(candidate.data);
  data.id = newInternalId;
  data.publicId = seedPublicId;
  await prisma.monitoringRule.create({
    data: {
      tenantId: candidate.tenantId,
      id: newInternalId,
      publicId: seedPublicId,
      data: JSON.stringify(data),
      enabled: candidate.enabled,
    },
  });

  const route = await prisma.alertRoute.findFirst({
    where: { tenantId: 'tenant-demo' },
  });
  if (!route) throw new Error('seed has no alert routes for B7 test');
  seedAlertRouteId = route.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validCreateBody = () => ({
  name: 'M6.11 B7 — Test rule',
  description: 'Created by monitoring-rules-writes test suite',
  type: 'threshold' as const,
  source: 'prometheus' as const,
  query: 'up == 0',
  targetMode: 'explicit' as const,
  targetCIIds: ['ci-001'],
  condition: { operator: '>' as const, threshold: 0.01, duration: '5m' },
  severity: 'P2' as const,
  cooldown: '10m',
  alertRouteId: seedAlertRouteId,
  tags: ['production'],
  enabled: true,
});

describe('POST /api/v1/monitoring/rules', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/v1/monitoring/rules').send(validCreateBody());
    expect(res.status).toBe(401);
  });

  it('400 on missing name', async () => {
    const body: Record<string, unknown> = { ...validCreateBody() };
    delete body.name;
    const res = await auth(request(app).post('/api/v1/monitoring/rules')).send(body);
    expect(res.status).toBe(400);
  });

  it('400 on invalid enum (bad severity)', async () => {
    const res = await auth(request(app).post('/api/v1/monitoring/rules'))
      .send({ ...validCreateBody(), severity: 'P9' });
    expect(res.status).toBe(400);
  });

  it('creates a new rule and GET reflects it', async () => {
    const res = await auth(request(app).post('/api/v1/monitoring/rules')).send(validCreateBody());
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.publicId).toMatch(/^RULE-/);
    expect(res.body.name).toBe('M6.11 B7 — Test rule');
    expect(res.body.enabled).toBe(true);
    expect(res.body.targetCount).toBe(1);
    expect(res.body.alertRouteId).toBe(seedAlertRouteId);
    expect(res.body.alertRoutePublicId).toBeDefined();

    const fetched = await auth(request(app).get(`/api/v1/monitoring/rules/${res.body.publicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.publicId).toBe(res.body.publicId);
    expect(fetched.body.name).toBe('M6.11 B7 — Test rule');
  });

  it('writes a create audit row', async () => {
    const res = await auth(request(app).post('/api/v1/monitoring/rules')).send({
      ...validCreateBody(),
      name: 'B7 audit probe',
    });
    expect(res.status).toBe(201);
    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant-demo',
        resourceKind: 'MonitoringRule',
        action: 'create',
        resourceId: res.body.id,
      },
    });
    expect(log).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('caller without rule.write → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-b7-rule-read-${Date.now()}`, permissions: ['rule.read'] });
    expect(created.status).toBe(201);
    const roleId: string = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [roleId] });

    try {
      const opCookie = await login(app, op.email, 'demo');
      const res = await request(app).post('/api/v1/monitoring/rules').set('Cookie', opCookie).send(validCreateBody());
      expect(res.status).toBe(403);
    } finally {
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app)
        .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
        .send({ roleIds: [opRole.id] });
      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`).set('Cookie', cookie);
    }
  });
});

describe('PATCH /api/v1/monitoring/rules/:publicId', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).patch(`/api/v1/monitoring/rules/${seedPublicId}`).send({ enabled: false });
    expect(res.status).toBe(401);
  });

  it('400 on empty body', async () => {
    const res = await auth(request(app).patch(`/api/v1/monitoring/rules/${seedPublicId}`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/monitoring/rules/RULE-DOES-NOT-EXIST'))
      .send({ enabled: false });
    expect(res.status).toBe(404);
  });

  it('toggles enabled', async () => {
    const before = await auth(request(app).get(`/api/v1/monitoring/rules/${seedPublicId}`));
    const target = !before.body.enabled;
    const res = await auth(request(app).patch(`/api/v1/monitoring/rules/${seedPublicId}`))
      .send({ enabled: target });
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(target);
  });

  it('applies a wide patch and GET reflects it', async () => {
    const res = await auth(request(app).patch(`/api/v1/monitoring/rules/${seedPublicId}`)).send({
      name: 'Renamed by B7 test',
      severity: 'P1',
      cooldown: '30m',
      targetCIIds: ['ci-001', 'ci-002', 'ci-003'],
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed by B7 test');
    expect(res.body.severity).toBe('P1');
    expect(res.body.targetCount).toBe(3);

    const fetched = await auth(request(app).get(`/api/v1/monitoring/rules/${seedPublicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.name).toBe('Renamed by B7 test');
    expect(fetched.body.targetCount).toBe(3);
  });

  it('caller without rule.write → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-b7-rule-read-patch-${Date.now()}`, permissions: ['rule.read'] });
    expect(created.status).toBe(201);
    const roleId: string = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [roleId] });

    try {
      const opCookie = await login(app, op.email, 'demo');
      const res = await request(app)
        .patch(`/api/v1/monitoring/rules/${seedPublicId}`).set('Cookie', opCookie)
        .send({ enabled: false });
      expect(res.status).toBe(403);
    } finally {
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app)
        .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
        .send({ roleIds: [opRole.id] });
      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`).set('Cookie', cookie);
    }
  });

  it('writes an update audit row with before/after', async () => {
    await auth(request(app).patch(`/api/v1/monitoring/rules/${seedPublicId}`))
      .send({ description: 'B7 audit probe' });
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'MonitoringRule', action: 'update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });
});

describe('DELETE /api/v1/monitoring/rules/:publicId', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).delete(`/api/v1/monitoring/rules/${seedPublicId}`);
    expect(res.status).toBe(401);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).delete('/api/v1/monitoring/rules/RULE-DOES-NOT-EXIST'));
    expect(res.status).toBe(404);
  });

  it('204 happy path; rule removed from list', async () => {
    // Create a throwaway rule so we don't clobber the shared seed clone.
    const create = await auth(request(app).post('/api/v1/monitoring/rules'))
      .send({ ...validCreateBody(), name: 'B7 delete-me' });
    expect(create.status).toBe(201);
    const pid: string = create.body.publicId;

    const res = await auth(request(app).delete(`/api/v1/monitoring/rules/${pid}`));
    expect(res.status).toBe(204);

    const after = await auth(request(app).get(`/api/v1/monitoring/rules/${pid}`));
    expect(after.status).toBe(404);

    const list = await auth(request(app).get('/api/v1/monitoring/rules'));
    expect(list.status).toBe(200);
    expect((list.body as Array<{ publicId: string }>).some(r => r.publicId === pid)).toBe(false);
  });

  it('caller without rule.write → 403', async () => {
    const create = await auth(request(app).post('/api/v1/monitoring/rules'))
      .send({ ...validCreateBody(), name: 'B7 delete-403' });
    expect(create.status).toBe(201);
    const pid: string = create.body.publicId;

    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-b7-rule-read-del-${Date.now()}`, permissions: ['rule.read'] });
    expect(created.status).toBe(201);
    const roleId: string = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [roleId] });

    try {
      const opCookie = await login(app, op.email, 'demo');
      const res = await request(app)
        .delete(`/api/v1/monitoring/rules/${pid}`).set('Cookie', opCookie);
      expect(res.status).toBe(403);
    } finally {
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app)
        .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
        .send({ roleIds: [opRole.id] });
      await request(app)
        .delete(`/api/v1/admin/roles/${roleId}`).set('Cookie', cookie);
      // Clean up the throwaway rule.
      await auth(request(app).delete(`/api/v1/monitoring/rules/${pid}`));
    }
  });

  it('writes a delete audit row with before snapshot', async () => {
    const create = await auth(request(app).post('/api/v1/monitoring/rules'))
      .send({ ...validCreateBody(), name: 'B7 delete-audit' });
    expect(create.status).toBe(201);
    const internalId: string = create.body.id;
    const pid: string = create.body.publicId;

    const del = await auth(request(app).delete(`/api/v1/monitoring/rules/${pid}`));
    expect(del.status).toBe(204);

    const log = await prisma.auditLog.findFirst({
      where: {
        tenantId: 'tenant-demo',
        resourceKind: 'MonitoringRule',
        action: 'delete',
        resourceId: internalId,
      },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
  });
});
