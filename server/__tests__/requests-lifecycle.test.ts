// M6.11 (B2.2) — Service Request lifecycle writes: cancel, reassign-active-step,
// add-watcher (idempotent), remove-watcher (idempotent).
//
// Each describe-block clones a fresh seed request so re-runs stay hermetic.
// The 403 cleanup uses per-describe `afterAll` with IDs captured in the outer
// scope (B1.4 pattern) so role/membership restoration survives an assertion
// failure inside the 403 test.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { ServiceRequest } from '../../src/types';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);
const rand = () => Math.random().toString(36).slice(2, 8);

// Walk seeded requests; return the first one with an active step.
async function findRequestWithActiveStep(): Promise<{ publicId: string; stepId: string }> {
  const rows = await prisma.serviceRequest.findMany({
    where: { tenantId: 'tenant-demo' },
    select: { publicId: true, data: true },
  });
  for (const r of rows) {
    const sr = JSON.parse(r.data) as ServiceRequest;
    const step = sr.workflow?.steps?.find(s => s.status === 'active');
    if (step) return { publicId: r.publicId, stepId: step.id };
  }
  throw new Error('seed has no request with an active step');
}

// Clone a seed request so each describe has its own row to mutate.
async function cloneRequest(
  suffix: string,
  mutate?: (sr: ServiceRequest) => void,
): Promise<{ publicId: string; internalId: string; stepId: string }> {
  const fixture = await findRequestWithActiveStep();
  const original = await prisma.serviceRequest.findFirstOrThrow({
    where: { tenantId: 'tenant-demo', publicId: fixture.publicId },
  });
  const sr = JSON.parse(original.data) as ServiceRequest;
  const publicId = `${fixture.publicId}-LC-${suffix}`;
  const id = `${original.id}-lc-${suffix}`;
  const clone: ServiceRequest = { ...sr, id, publicId, watchers: [] };
  mutate?.(clone);
  await prisma.serviceRequest.create({
    data: {
      id,
      publicId,
      tenantId: original.tenantId,
      status: clone.status,
      data: JSON.stringify(clone),
    },
  });
  return { publicId, internalId: id, stepId: fixture.stepId };
}

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── Cancel ────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/requests/:publicId/cancel', () => {
  let publicId: string;
  let internalId: string;
  let cnCustomRoleId: string | null = null;
  let cnMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneRequest(`cn-${rand()}`));
  });

  afterAll(async () => {
    if (cnMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${cnMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (cnCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${cnCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).patch(`/api/v1/requests/${publicId}/cancel`).send({ reason: 'a'.repeat(20) });
    expect(res.status).toBe(401);
  });

  it('400 missing reason', async () => {
    const res = await auth(request(app).patch(`/api/v1/requests/${publicId}/cancel`)).send({});
    expect(res.status).toBe(400);
  });

  it('400 reason too short', async () => {
    const res = await auth(request(app).patch(`/api/v1/requests/${publicId}/cancel`)).send({ reason: 'tooshort' });
    expect(res.status).toBe(400);
  });

  it('404 unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/requests/REQ-NOPE/cancel'))
      .send({ reason: 'Cancelling because the requester left' });
    expect(res.status).toBe(404);
  });

  it('200 happy path: status=cancelled, steps skipped, audit row written', async () => {
    const fx = await cloneRequest(`cn-happy-${rand()}`);
    const reason = 'Requester left the company, no longer needed';
    const res = await auth(request(app).patch(`/api/v1/requests/${fx.publicId}/cancel`)).send({ reason });
    expect(res.status).toBe(200);
    const body = res.body as ServiceRequest;
    expect(body.status).toBe('cancelled');
    expect(body.cancellationReason).toBe(reason);
    expect(body.closedAt).toBeDefined();
    // Pending / active steps got skipped.
    expect(body.workflow.steps.every(s => s.status !== 'active' && s.status !== 'pending')).toBe(true);

    // GET round-trip
    const fetched = await auth(request(app).get(`/api/v1/requests/${fx.publicId}`));
    expect((fetched.body as ServiceRequest).status).toBe('cancelled');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'ServiceRequest', resourceId: fx.internalId, action: 'request.cancel' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('409 when already cancelled', async () => {
    const fx = await cloneRequest(`cn-already-${rand()}`, sr => {
      sr.status = 'cancelled';
    });
    const res = await auth(request(app).patch(`/api/v1/requests/${fx.publicId}/cancel`))
      .send({ reason: 'second attempt should be rejected' });
    expect(res.status).toBe(409);
  });

  it('403 without request.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-req-cn-${Date.now()}`, permissions: ['request.read'] });
    expect(created.status).toBe(201);
    cnCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    cnMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).patch(`/api/v1/requests/${publicId}/cancel`).set('Cookie', opCookie)
      .send({ reason: 'forbidden attempt at cancellation' });
    expect(res.status).toBe(403);
    // mark internalId reference as intentionally used (suppresses unused warning if no other test reads it)
    expect(internalId).toBeTruthy();
  });
});

// ── Reassign ──────────────────────────────────────────────────────────────
describe('PATCH /api/v1/requests/:publicId/steps/:stepId/reassign', () => {
  let publicId: string;
  let internalId: string;
  let stepId: string;
  let raCustomRoleId: string | null = null;
  let raMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId, stepId } = await cloneRequest(`ra-${rand()}`));
  });

  afterAll(async () => {
    if (raMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${raMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (raCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${raCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app)
      .patch(`/api/v1/requests/${publicId}/steps/${stepId}/reassign`)
      .send({ assigneeId: 'u-002' });
    expect(res.status).toBe(401);
  });

  it('400 missing assigneeId', async () => {
    const res = await auth(request(app).patch(`/api/v1/requests/${publicId}/steps/${stepId}/reassign`))
      .send({});
    expect(res.status).toBe(400);
  });

  it('404 unknown request', async () => {
    const res = await auth(request(app).patch(`/api/v1/requests/REQ-NOPE/steps/${stepId}/reassign`))
      .send({ assigneeId: 'u-002' });
    expect(res.status).toBe(404);
  });

  it('404 unknown step', async () => {
    const res = await auth(request(app).patch(`/api/v1/requests/${publicId}/steps/no-such-step/reassign`))
      .send({ assigneeId: 'u-002' });
    expect(res.status).toBe(404);
  });

  it('409 when step is not active (already-decided clone)', async () => {
    const fx = await cloneRequest(`ra-completed-${rand()}`, sr => {
      const idx = sr.workflow.steps.findIndex(s => s.status === 'active');
      if (idx !== -1) sr.workflow.steps[idx] = { ...sr.workflow.steps[idx], status: 'completed' };
    });
    const res = await auth(request(app).patch(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/reassign`))
      .send({ assigneeId: 'u-002', assigneeName: 'Bob' });
    expect(res.status).toBe(409);
  });

  it('200 happy path: assignee updated, GET reflects, audit row written', async () => {
    const fx = await cloneRequest(`ra-happy-${rand()}`);
    const res = await auth(request(app).patch(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/reassign`))
      .send({ assigneeId: 'u-042', assigneeName: 'Dana Acosta' });
    expect(res.status).toBe(200);
    const body = res.body as ServiceRequest;
    const step = body.workflow.steps.find(s => s.id === fx.stepId);
    expect(step?.assigneeId).toBe('u-042');
    expect(step?.assigneeName).toBe('Dana Acosta');

    const fetched = await auth(request(app).get(`/api/v1/requests/${fx.publicId}`));
    const fstep = (fetched.body as ServiceRequest).workflow.steps.find(s => s.id === fx.stepId);
    expect(fstep?.assigneeId).toBe('u-042');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'ServiceRequest', resourceId: fx.internalId, action: 'request.reassign' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });

  it('403 without request.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-req-ra-${Date.now()}`, permissions: ['request.read'] });
    expect(created.status).toBe(201);
    raCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    raMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app)
      .patch(`/api/v1/requests/${publicId}/steps/${stepId}/reassign`).set('Cookie', opCookie)
      .send({ assigneeId: 'u-007' });
    expect(res.status).toBe(403);
    expect(internalId).toBeTruthy();
  });
});

// ── Add watcher ───────────────────────────────────────────────────────────
describe('POST /api/v1/requests/:publicId/watchers', () => {
  let publicId: string;
  let internalId: string;
  let awCustomRoleId: string | null = null;
  let awMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneRequest(`aw-${rand()}`));
  });

  afterAll(async () => {
    if (awMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${awMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (awCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${awCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).post(`/api/v1/requests/${publicId}/watchers`).send({ userId: 'u-100' });
    expect(res.status).toBe(401);
  });

  it('400 missing userId', async () => {
    const res = await auth(request(app).post(`/api/v1/requests/${publicId}/watchers`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 unknown request', async () => {
    const res = await auth(request(app).post('/api/v1/requests/REQ-NOPE/watchers')).send({ userId: 'u-100' });
    expect(res.status).toBe(404);
  });

  it('201 first add: wasNew=true, watcher in list, audit row written', async () => {
    const res = await auth(request(app).post(`/api/v1/requests/${publicId}/watchers`))
      .send({ userId: 'u-100', userName: 'Watcher One' });
    expect(res.status).toBe(201);
    expect(res.body.wasNew).toBe(true);
    expect(res.body.watchers.some((w: { userId: string }) => w.userId === 'u-100')).toBe(true);

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'ServiceRequest', resourceId: internalId, action: 'request.watcher.add' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });

  it('200 idempotent re-add: wasNew=false, length unchanged', async () => {
    const before = await auth(request(app).get(`/api/v1/requests/${publicId}`));
    const beforeLen = (before.body.watchers ?? []).length;

    const res = await auth(request(app).post(`/api/v1/requests/${publicId}/watchers`))
      .send({ userId: 'u-100', userName: 'Watcher One' });
    expect(res.status).toBe(200);
    expect(res.body.wasNew).toBe(false);
    expect(res.body.watchers.length).toBe(beforeLen);
  });

  it('403 without request.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-req-aw-${Date.now()}`, permissions: ['request.read'] });
    expect(created.status).toBe(201);
    awCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    awMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post(`/api/v1/requests/${publicId}/watchers`).set('Cookie', opCookie)
      .send({ userId: 'u-999' });
    expect(res.status).toBe(403);
  });
});

// ── Remove watcher ────────────────────────────────────────────────────────
describe('DELETE /api/v1/requests/:publicId/watchers/:userId', () => {
  let publicId: string;
  let internalId: string;
  let rwCustomRoleId: string | null = null;
  let rwMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneRequest(`rw-${rand()}`, sr => {
      sr.watchers = [{ userId: 'u-200', userName: 'Watcher Two' }];
    }));
  });

  afterAll(async () => {
    if (rwMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${rwMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (rwCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${rwCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).delete(`/api/v1/requests/${publicId}/watchers/u-200`);
    expect(res.status).toBe(401);
  });

  it('404 unknown request', async () => {
    const res = await auth(request(app).delete('/api/v1/requests/REQ-NOPE/watchers/u-200'));
    expect(res.status).toBe(404);
  });

  it('204 happy path: removed, watcher no longer in list, audit row written', async () => {
    const res = await auth(request(app).delete(`/api/v1/requests/${publicId}/watchers/u-200`));
    expect(res.status).toBe(204);

    const fetched = await auth(request(app).get(`/api/v1/requests/${publicId}`));
    expect(((fetched.body as ServiceRequest).watchers ?? []).some(w => w.userId === 'u-200')).toBe(false);

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'ServiceRequest', resourceId: internalId, action: 'request.watcher.remove' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });

  it('204 idempotent second delete: list unchanged', async () => {
    const before = await auth(request(app).get(`/api/v1/requests/${publicId}`));
    const beforeLen = ((before.body as ServiceRequest).watchers ?? []).length;
    const res = await auth(request(app).delete(`/api/v1/requests/${publicId}/watchers/u-200`));
    expect(res.status).toBe(204);
    const after = await auth(request(app).get(`/api/v1/requests/${publicId}`));
    expect(((after.body as ServiceRequest).watchers ?? []).length).toBe(beforeLen);
  });

  it('403 without request.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-req-rw-${Date.now()}`, permissions: ['request.read'] });
    expect(created.status).toBe(201);
    rwCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    rwMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).delete(`/api/v1/requests/${publicId}/watchers/u-200`).set('Cookie', opCookie);
    expect(res.status).toBe(403);
  });
});
