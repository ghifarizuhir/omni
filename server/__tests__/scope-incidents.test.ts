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
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-a');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
  });

  it('2. memberB (outsider) gets 403 in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'update' });
  });

  it('3. memberB gets 200 + X-Scope-Warning in warn mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'warn';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/incidents/${publicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.headers['x-scope-warning']).toMatch(/^incident\.update:/);
  });

  it('4. NOC succeeds in enforce mode (bypass)', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
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
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('noc');
    const res = await request(app)
      .post(`/api/v1/incidents/${publicId}/resolve`)
      .set('Cookie', cookie)
      .send({ summary: 'attempted resolve by NOC', rootCause: 'n/a' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'incident', action: 'update' });
  });
});
