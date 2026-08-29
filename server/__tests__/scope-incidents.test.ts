import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { createScopedAppFixture, login, type ScopedAppFixture } from './helpers';

const app = createApp();

let fx: ScopedAppFixture;
let publicId: string;
let internalId: string;

const INCIDENT_DATA = {
  id: 'inc-scope-001',
  publicId: 'INC-SCOPE-001',
  title: 'Scope test incident',
  description: 'fixture',
  status: 'open',
  priority: 'P2',
  severity: 'P2',
  isMajor: false,
  reporterId: 'user-fixture',
  reporterChannel: 'monitoring',
  affectedCIIds: [],
  affectedCIPublicIds: [],
  affectedServiceIds: [],
  slaResponseTarget: 30,
  slaResolveTarget: 240,
  slaResponseStatus: 'on_track',
  slaResolveStatus: 'on_track',
};

beforeAll(async () => {
  fx = await createScopedAppFixture('incidents');
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' },
  });
  internalId = 'inc-scope-001';
  publicId = 'INC-SCOPE-001';
  await prisma.incident.deleteMany({ where: { publicId } }).catch(() => undefined);
  await prisma.incident.create({
    data: {
      id: internalId,
      publicId,
      tenantId: tenant.id,
      data: JSON.stringify(INCIDENT_DATA),
      status: 'open',
      priority: 'P2',
      severity: 'P2',
      isMajor: false,
      affectedCIIds: '[]',
      affectedCIPublicIds: '[]',
      createdAt: new Date(),
      updatedAt: new Date(),
      applicationId: fx.appId,
    },
  });
});

afterAll(async () => {
  delete process.env.SCOPE_ENFORCEMENT_MODE;
  await prisma.incidentTimelineEvent.deleteMany({ where: { incidentId: internalId } }).catch(() => undefined);
  await prisma.incidentComment.deleteMany({ where: { incidentId: internalId } }).catch(() => undefined);
  await prisma.incident.delete({ where: { publicId } }).catch(() => undefined);
  await fx.cleanup();
  await prisma.$disconnect();
});

async function loginAs(handle: 'member-a' | 'member-b' | 'noc' | 'admin') {
  return login(app, fx.emailOf(handle), fx.password);
}

describe('Incidents scope — PATCH /status', () => {
  it('1. memberA (contributor) succeeds in enforce mode', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
  });

  it('2. memberB (outsider) gets 403 in enforce mode', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'update' });
  });

  it('3. NOC succeeds (bypass via functional role)', async () => {
    const cookie = await loginAs('noc');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
  });
});

describe('Incidents scope — POST /resolve (no NOC bypass)', () => {
  it('5. NOC gets 403 in enforce mode (resolve cannot be bypassed)', async () => {
    const cookie = await loginAs('noc');
    const res = await request(app)
      .post(`/api/v1/incidents/${publicId}/resolve`)
      .set('Cookie', cookie)
      .send({ summary: 'attempted resolve by NOC', rootCause: 'n/a' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'update' });
  });
});

describe('Incidents scope — read endpoints', () => {
  it('memberA (contributor) can read the scoped incident', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app).get(`/api/v1/incidents/${publicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) gets 404 on get', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${publicId}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('memberB (outsider) gets 403 on comments', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${internalId}/comments`).set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'read' });
  });
});

describe('Incidents scope — unassigned staging pool', () => {
  let unassignedPublicId: string;
  let unassignedInternalId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' },
    });
    unassignedInternalId = 'inc-scope-unassigned-' + Date.now();
    unassignedPublicId = 'INC-SCOPE-UN-' + Date.now();
    await prisma.incident.create({
      data: {
        id: unassignedInternalId,
        publicId: unassignedPublicId,
        tenantId: tenant.id,
        data: JSON.stringify({ ...INCIDENT_DATA, id: unassignedInternalId, publicId: unassignedPublicId }),
        status: 'open',
        priority: 'P2',
        severity: 'P2',
        isMajor: false,
        affectedCIIds: '[]',
        affectedCIPublicIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        applicationId: `app-unassigned-${tenant.id}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.incident.delete({ where: { publicId: unassignedPublicId } }).catch(() => undefined);
  });

  it('memberA can read an unassigned incident', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app).get(`/api/v1/incidents/${unassignedPublicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) can read an unassigned incident (shared pool)', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${unassignedPublicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) can write to an unassigned incident (shared pool)', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/incidents/${unassignedPublicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
  });

  it('NOC cannot resolve an unassigned incident (allowNoc guard respected)', async () => {
    const cookie = await loginAs('noc');
    const res = await request(app)
      .post(`/api/v1/incidents/${unassignedPublicId}/resolve`)
      .set('Cookie', cookie)
      .send({ summary: 'attempted resolve by NOC', rootCause: 'n/a' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'update' });
  });
});
