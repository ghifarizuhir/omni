// M6.11 B1.4 — remaining incident-detail mutations: promote-major, assign,
// links, watchers (add + remove). Follows the same write-endpoint pattern
// proved out in `incidents-resolve.test.ts` and `incidents-comment-status.test.ts`.
//
// Each `describe` clones a fresh seed incident so the suite stays hermetic
// across re-runs and the endpoints don't fight over the same row.

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
  const internalId = `${base.id}-wf-${suffix}`;
  const publicId = `${base.publicId}-WF-${suffix}`;
  const data = JSON.parse(base.data);
  data.id = internalId;
  data.publicId = publicId;
  data.isMajor = false;
  data.watchers = [];
  await prisma.incident.create({
    data: { ...base, id: internalId, publicId, data: JSON.stringify(data), isMajor: false },
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

// ── promote-major ──────────────────────────────────────────────────────────
describe('POST /api/v1/incidents/:publicId/promote-major', () => {
  let publicId: string;
  let internalId: string;
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let pmCustomRoleId: string | null = null;
  let pmMembershipId: string | null = null;
  beforeAll(async () => {
    ({ publicId, internalId } = await cloneIncident(`pm-${rand()}`));
  });

  afterAll(async () => {
    if (pmMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${pmMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (pmCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${pmCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).post(`/api/v1/incidents/${publicId}/promote-major`).send({});
    expect(res.status).toBe(401);
  });
  it('400 on unknown field (strict schema)', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/promote-major`))
      .send({ status: 'resolved' });
    expect(res.status).toBe(400);
  });
  it('404 unknown publicId', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/INC-NOPE/promote-major')).send({});
    expect(res.status).toBe(404);
  });
  it('200 + GET reflects + audit + timeline', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/promote-major`))
      .send({ incidentCommander: { id: 'u-001', name: 'Sarah Chen' }, summary: 'P1 escalation' });
    expect(res.status).toBe(200);
    expect(res.body.isMajor).toBe(true);
    expect(res.body.incidentCommander).toBe('u-001');

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.isMajor).toBe(true);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('promoted_major');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'promote_major' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('403 without incident.write (different perm key)', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-incwf-pm-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);
    pmCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    pmMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post(`/api/v1/incidents/${publicId}/promote-major`).set('Cookie', opCookie).send({});
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});

// ── assign ─────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/incidents/:publicId/assign', () => {
  let publicId: string;
  let internalId: string;
  beforeAll(async () => {
    ({ publicId, internalId } = await cloneIncident(`as-${rand()}`));
  });

  it('401 unauth', async () => {
    const res = await request(app).patch(`/api/v1/incidents/${publicId}/assign`).send({ assigneeId: 'u-002' });
    expect(res.status).toBe(401);
  });
  it('400 missing assigneeId', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/assign`)).send({});
    expect(res.status).toBe(400);
  });
  it('404 unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/incidents/INC-NOPE/assign')).send({ assigneeId: 'u-002' });
    expect(res.status).toBe(404);
  });
  it('200 + GET reflects + audit + timeline', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/assign`))
      .send({ assigneeId: 'u-002', assigneeName: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBe('u-002');

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.assigneeId).toBe('u-002');

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('assigned');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'assign' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });
  it('can unassign with null', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/assign`))
      .send({ assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.assigneeId).toBeUndefined();
  });
});

// ── links ──────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/incidents/:publicId/links', () => {
  let publicId: string;
  let internalId: string;
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let lkCustomRoleId: string | null = null;
  let lkMembershipId: string | null = null;
  beforeAll(async () => {
    ({ publicId, internalId } = await cloneIncident(`lk-${rand()}`));
  });

  afterAll(async () => {
    if (lkMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${lkMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (lkCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${lkCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauth', async () => {
    const res = await request(app).patch(`/api/v1/incidents/${publicId}/links`).send({ affectedCIIds: [] });
    expect(res.status).toBe(401);
  });
  it('400 rejects forbidden field (strict)', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/links`)).send({ status: 'resolved' });
    expect(res.status).toBe(400);
  });
  it('404 unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/incidents/INC-NOPE/links')).send({ affectedCIIds: ['ci-1'] });
    expect(res.status).toBe(404);
  });
  it('200 patches affectedCIIds + linkedChangeIds + GET reflects + timeline + audit', async () => {
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/links`))
      .send({ affectedCIIds: ['ci-test-1', 'ci-test-2'], linkedChangeIds: ['chg-1'] });
    expect(res.status).toBe(200);
    expect(res.body.affectedCIIds).toEqual(['ci-test-1', 'ci-test-2']);
    expect(res.body.linkedChangeIds).toEqual(['chg-1']);

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.affectedCIIds).toEqual(['ci-test-1', 'ci-test-2']);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('linked');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'update_links' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });
  it('403 without incident.write', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-incwf-lk-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);
    lkCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    lkMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).patch(`/api/v1/incidents/${publicId}/links`).set('Cookie', opCookie)
      .send({ affectedCIIds: ['x'] });
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});

// ── watchers ────────────────────────────────────────────────────────────────
describe('POST/DELETE /api/v1/incidents/:incidentId/watchers', () => {
  let publicId: string;
  let internalId: string;
  beforeAll(async () => {
    ({ publicId, internalId } = await cloneIncident(`wt-${rand()}`));
  });

  it('401 unauth (POST)', async () => {
    const res = await request(app).post(`/api/v1/incidents/${internalId}/watchers`).send({ userId: 'u-003' });
    expect(res.status).toBe(401);
  });
  it('400 missing userId', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${internalId}/watchers`)).send({});
    expect(res.status).toBe(400);
  });
  it('404 unknown incidentId', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/inc-nope/watchers')).send({ userId: 'u-003' });
    expect(res.status).toBe(404);
  });
  it('201 first add → watcher in list + audit + timeline', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${internalId}/watchers`))
      .send({ userId: 'u-003', userName: 'Carol' });
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(true);
    expect(res.body.watchers.some((w: { userId: string }) => w.userId === 'u-003')).toBe(true);

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect((after.body.watchers ?? []).some((w: { userId: string }) => w.userId === 'u-003')).toBe(true);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('watcher_added');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'add_watcher' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });
  it('200 idempotent on re-add', async () => {
    const res = await auth(request(app).post(`/api/v1/incidents/${internalId}/watchers`))
      .send({ userId: 'u-003', userName: 'Carol' });
    expect(res.status).toBe(200);
    expect(res.body.added).toBe(false);
  });
  it('204 DELETE removes the watcher + timeline + audit', async () => {
    const res = await auth(request(app).delete(`/api/v1/incidents/${internalId}/watchers/u-003`));
    expect(res.status).toBe(204);
    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect((after.body.watchers ?? []).some((w: { userId: string }) => w.userId === 'u-003')).toBe(false);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('watcher_removed');

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'remove_watcher' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });
  it('404 DELETE when watcher absent', async () => {
    const res = await auth(request(app).delete(`/api/v1/incidents/${internalId}/watchers/u-not-a-watcher`));
    expect(res.status).toBe(404);
  });
});

// ── remove-watcher: not-found ──────────────────────────────────────────────
describe('DELETE /api/v1/incidents/:incidentId/watchers/:userId — watcher not found', () => {
  it('returns 404 when the user is not a watcher', async () => {
    const { internalId } = await cloneIncident('nf-' + rand());
    const res = await auth(
      request(app).delete(`/api/v1/incidents/${internalId}/watchers/nonexistent-user`),
    );
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Watcher not found' });
  });
});

describe('PATCH /api/v1/incidents/:publicId/links — linkedProblemPublicId', () => {
  it('stores linkedProblemPublicId and makes ?problemPublicId filter match', async () => {
    const { publicId } = await cloneIncident('lpp-' + rand());
    const problemId = `prb-fx-${rand()}`;
    const problemPublicId = `PRB-FX-${rand().toUpperCase()}`;
    await prisma.problem.create({
      data: {
        id: problemId,
        publicId: problemPublicId,
        tenantId: 'tenant-demo',
        status: 'open',
        applicationId: 'app-demo-1',
        data: JSON.stringify({ id: problemId, publicId: problemPublicId, status: 'open' }),
      },
    });
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/links`).send({
      linkedProblemId: problemId,
      linkedProblemPublicId: problemPublicId,
    }));
    expect(res.status).toBe(200);
    expect(res.body.linkedProblemPublicId).toBe(problemPublicId);
    const read = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(read.body.linkedProblemPublicId).toBe(problemPublicId);
    const listed = await auth(request(app).get(`/api/v1/incidents?problemPublicId=${problemPublicId}`));
    expect((listed.body as any[]).map((i: any) => i.publicId)).toContain(publicId);
    await prisma.problem.deleteMany({ where: { id: problemId } }).catch(() => undefined);
  });
});

describe('GET /api/v1/incidents/:incidentId/comments — missing incident', () => {
  it('returns 404 on comments for an unknown incident id', async () => {
    const res = await auth(request(app).get(`/api/v1/incidents/missing-${rand()}/comments`));
    expect(res.status).toBe(404);
  });
  it('returns 404 on timeline for an unknown incident id', async () => {
    const res = await auth(request(app).get(`/api/v1/incidents/missing-${rand()}/timeline`));
    expect(res.status).toBe(404);
  });
});

// ── description update ─────────────────────────────────────────────────────
describe('PATCH /api/v1/incidents/:publicId — description', () => {
  it('persists a description update', async () => {
    const { publicId } = await cloneIncident('desc-' + rand());
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`).send({
      description: 'persisted description body',
    }));
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('persisted description body');
    const read = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(read.body.description).toBe('persisted description body');
  });
});
