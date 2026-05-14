// M6.11 B5.1 — war-room stand-down + comms endpoints. Both demote the
// incident's headline state (stand-down) or attach communications without
// changing the snapshot (comms). Audit row + timeline event are the
// load-bearing artifacts; tests assert both.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;

const cloneMajorIncident = async (suffix: string, opts: { major?: boolean } = {}) => {
  const major = opts.major ?? true;
  const base = await prisma.incident.findFirst({
    where: { tenantId: 'tenant-demo', status: { notIn: ['resolved', 'closed'] } },
  });
  if (!base) throw new Error('seed has no open incidents to clone');
  const internalId = `${base.id}-wr-${suffix}`;
  const publicId = `${base.publicId}-WR-${suffix}`;
  const data = JSON.parse(base.data);
  data.id = internalId;
  data.publicId = publicId;
  data.isMajor = major;
  data.priority = 'P1';
  data.watchers = [];
  await prisma.incident.create({
    data: {
      ...base,
      id: internalId,
      publicId,
      data: JSON.stringify(data),
      isMajor: major,
      priority: 'P1',
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

// ── stand-down ─────────────────────────────────────────────────────────────
describe('POST /api/v1/incidents/:publicId/stand-down', () => {
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let sdCustomRoleId: string | null = null;
  let sdMembershipId: string | null = null;

  afterAll(async () => {
    if (sdMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${sdMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (sdCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${sdCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauthenticated', async () => {
    const { publicId } = await cloneMajorIncident(`sd-401-${rand()}`);
    const res = await request(app).post(`/api/v1/incidents/${publicId}/stand-down`)
      .send({ reason: 'rolled back the deploy and verified recovery' });
    expect(res.status).toBe(401);
  });

  it('400 missing reason', async () => {
    const { publicId } = await cloneMajorIncident(`sd-400a-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`)).send({});
    expect(res.status).toBe(400);
  });

  it('400 reason too short (<10 chars)', async () => {
    const { publicId } = await cloneMajorIncident(`sd-400b-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'short' });
    expect(res.status).toBe(400);
  });

  it('400 invalid newPriority', async () => {
    const { publicId } = await cloneMajorIncident(`sd-400c-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'rolled back the deploy and verified', newPriority: 'P1' });
    expect(res.status).toBe(400);
  });

  it('404 incident not found', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/INC-NOPE/stand-down'))
      .send({ reason: 'rolled back the deploy and verified recovery' });
    expect(res.status).toBe(404);
  });

  it('200 default newPriority is P2 + isMajor=false + timeline carries reason', async () => {
    const { publicId, internalId } = await cloneMajorIncident(`sd-200a-${rand()}`);
    const reason = 'rolled back the deploy and verified recovery on all hosts';
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason });
    expect(res.status).toBe(200);
    expect(res.body.isMajor).toBe(false);
    expect(res.body.priority).toBe('P2');

    const after = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(after.body.isMajor).toBe(false);
    expect(after.body.priority).toBe('P2');

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    const ev = tl.body.find((e: { kind: string }) => e.kind === 'major_stood_down');
    expect(ev).toBeTruthy();
    expect(ev.details.reason).toBe(reason);
    expect(ev.details.fromPriority).toBe('P1');
    expect(ev.details.toPriority).toBe('P2');
  });

  it('200 custom newPriority P3', async () => {
    const { publicId } = await cloneMajorIncident(`sd-200b-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'incident contained, severity downgraded', newPriority: 'P3' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('P3');
    expect(res.body.isMajor).toBe(false);
  });

  it('200 custom newPriority P4', async () => {
    const { publicId } = await cloneMajorIncident(`sd-200c-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'false alarm — monitoring rule misfired', newPriority: 'P4' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('P4');
  });

  it('200 already non-major is allowed (idempotent: writes event, sets priority)', async () => {
    // Behavior note: stand-down does NOT 409 on non-major incidents — it
    // still applies newPriority and writes a `major_stood_down` event. This
    // keeps the war-room form simple and matches the audit semantics (record
    // the operator's intent regardless of current major flag).
    const { publicId, internalId } = await cloneMajorIncident(`sd-200d-${rand()}`, { major: false });
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'cleanup pass — confirming non-major status' });
    expect(res.status).toBe(200);
    expect(res.body.isMajor).toBe(false);
    expect(res.body.priority).toBe('P2');
    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('major_stood_down');
  });

  it('200 writes audit row with action stand_down', async () => {
    const { publicId, internalId } = await cloneMajorIncident(`sd-200e-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/stand-down`))
      .send({ reason: 'recovery validated — standing down war room' });
    expect(res.status).toBe(200);
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'stand_down' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('403 without incident.write permission', async () => {
    const { publicId } = await cloneMajorIncident(`sd-403-${rand()}`);
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-warroom-sd-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);
    sdCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    sdMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post(`/api/v1/incidents/${publicId}/stand-down`).set('Cookie', opCookie)
      .send({ reason: 'attempting stand-down without permission' });
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});

// ── comms ──────────────────────────────────────────────────────────────────
describe('POST /api/v1/incidents/:publicId/comms', () => {
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let cmCustomRoleId: string | null = null;
  let cmMembershipId: string | null = null;

  afterAll(async () => {
    if (cmMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${cmMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (cmCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${cmCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauthenticated', async () => {
    const { publicId } = await cloneMajorIncident(`cm-401-${rand()}`);
    const res = await request(app).post(`/api/v1/incidents/${publicId}/comms`)
      .send({ audience: 'internal', message: 'hi', channels: ['slack'] });
    expect(res.status).toBe(401);
  });

  it('400 missing audience', async () => {
    const { publicId } = await cloneMajorIncident(`cm-400a-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ message: 'hi', channels: ['slack'] });
    expect(res.status).toBe(400);
  });

  it('400 empty channels array', async () => {
    const { publicId } = await cloneMajorIncident(`cm-400b-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ audience: 'internal', message: 'hi', channels: [] });
    expect(res.status).toBe(400);
  });

  it('400 message too long (>4000 chars)', async () => {
    const { publicId } = await cloneMajorIncident(`cm-400c-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ audience: 'internal', message: 'x'.repeat(4001), channels: ['slack'] });
    expect(res.status).toBe(400);
  });

  it('404 incident not found', async () => {
    const res = await auth(request(app).post('/api/v1/incidents/INC-NOPE/comms'))
      .send({ audience: 'internal', message: 'hi', channels: ['slack'] });
    expect(res.status).toBe(404);
  });

  it('200 happy path — timeline event created, response includes audience/message/channels', async () => {
    const { publicId, internalId } = await cloneMajorIncident(`cm-200a-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({
        audience: 'customer',
        message: 'We are investigating an issue with checkout.',
        channels: ['statuspage', 'email'],
      });
    expect(res.status).toBe(201);
    expect(res.body.kind).toBe('comms_posted');
    expect(res.body.details.commsAudience).toBe('customer');
    expect(res.body.details.commsBody).toContain('investigating');
    expect(res.body.details.channels).toEqual(['statuspage', 'email']);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    expect(tl.body.map((e: { kind: string }) => e.kind)).toContain('comms_posted');
  });

  it('200 multiple sequential posts append distinct events', async () => {
    const { publicId, internalId } = await cloneMajorIncident(`cm-200b-${rand()}`);
    const r1 = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ audience: 'internal', message: 'first update', channels: ['slack'] });
    const r2 = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ audience: 'all_staff', message: 'second update', channels: ['email'] });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r1.body.id).not.toBe(r2.body.id);

    const tl = await auth(request(app).get(`/api/v1/incidents/${internalId}/timeline`));
    const commsEvents = tl.body.filter((e: { kind: string }) => e.kind === 'comms_posted');
    expect(commsEvents.length).toBeGreaterThanOrEqual(2);
  });

  it('200 writes audit row with action comms_posted', async () => {
    const { publicId, internalId } = await cloneMajorIncident(`cm-200c-${rand()}`);
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/comms`))
      .send({ audience: 'internal', message: 'audit check', channels: ['slack'] });
    expect(res.status).toBe(201);

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Incident', resourceId: internalId, action: 'comms_posted' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('403 without incident.write permission', async () => {
    const { publicId } = await cloneMajorIncident(`cm-403-${rand()}`);
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-warroom-cm-${Date.now()}`, permissions: ['incident.read'] });
    expect(created.status).toBe(201);
    cmCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    cmMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post(`/api/v1/incidents/${publicId}/comms`).set('Cookie', opCookie)
      .send({ audience: 'internal', message: 'no perm', channels: ['slack'] });
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});
