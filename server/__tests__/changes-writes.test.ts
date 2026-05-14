// M6.11 — Changes domain writes: create, cancel, tech-assessment save.
// Same shape as incident writes: Zod body, requirePermission('change.write'),
// repo transaction, audit log, round-trip readable via GET.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validChangeBody = () => ({
  title: 'Roll out new feature flag service',
  description: 'Standing up flagd in production behind LB.',
  justification: 'Required for cohort experimentation.',
  type: 'normal' as const,
  risk: 'medium' as const,
  impact: 'moderate' as const,
  plannedStart: '2026-06-01T22:00:00Z',
  plannedEnd:   '2026-06-01T23:30:00Z',
  implementationPlan: 'Deploy flagd, smoke test, flip route, monitor 30m.',
  rollbackPlan: 'Revert LB rule; pods auto-roll back.',
  affectedCIIds: [] as string[],
});

describe('POST /api/v1/changes', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/v1/changes').send(validChangeBody());
    expect(res.status).toBe(401);
  });

  it('400 on missing title', async () => {
    const body = { ...validChangeBody(), title: '' };
    const res = await auth(request(app).post('/api/v1/changes')).send(body);
    expect(res.status).toBe(400);
  });

  it('creates a change in draft status with an allocated publicId', async () => {
    const res = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^CHG-\d{4}-\d{5}$/);
    expect(res.body.status).toBe('draft');
    expect(res.body.title).toBe('Roll out new feature flag service');
    expect(res.body.requesterId).toBeDefined();

    // GET reflects it
    const fetched = await auth(request(app).get(`/api/v1/changes/${res.body.publicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.publicId).toBe(res.body.publicId);
  });

  it('caller without change.write → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-chg-read-${Date.now()}`, permissions: ['change.read'] });
    expect(created.status).toBe(201);

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post('/api/v1/changes').set('Cookie', opCookie).send(validChangeBody());
    expect(res.status).toBe(403);

    // Restore
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

describe('PATCH /api/v1/changes/:publicId/cancel', () => {
  it('cancels an active change and flips status', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    expect(create.status).toBe(201);
    const publicId = create.body.publicId;

    const res = await auth(request(app).patch(`/api/v1/changes/${publicId}/cancel`))
      .send({ reason: 'Superseded by CHG-2026-00200' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.cancellationReason).toBe('Superseded by CHG-2026-00200');

    const after = await auth(request(app).get(`/api/v1/changes/${publicId}`));
    expect(after.body.status).toBe('cancelled');
  });

  it('400 on missing reason', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const res = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/cancel`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/changes/CHG-9999-99999/cancel'))
      .send({ reason: 'x' });
    expect(res.status).toBe(404);
  });

  it('refuses to cancel an already-closed change (409)', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/cancel`)).send({ reason: 'first' });
    const second = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/cancel`)).send({ reason: 'again' });
    expect(second.status).toBe(409);
  });
});

describe('PATCH /api/v1/changes/:publicId/tech-assessment', () => {
  it('saves the assessment block onto the change', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const publicId = create.body.publicId;

    const res = await auth(request(app).patch(`/api/v1/changes/${publicId}/tech-assessment`)).send({
      status: 'approved',
      objective: 'Ship flagd with zero downtime',
      technicalScope: 'LB rule + 2 pods',
      prerequisites: ['LB config reviewed'],
      dependencies: ['feature-flag-team'],
      risks: [],
    });
    expect(res.status).toBe(200);
    expect(res.body.technicalAssessment?.status).toBe('approved');
    expect(res.body.technicalAssessment?.reviewerId).toBeDefined();

    const fetched = await auth(request(app).get(`/api/v1/changes/${publicId}`));
    expect(fetched.body.technicalAssessment?.objective).toBe('Ship flagd with zero downtime');
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/changes/CHG-9999-99999/tech-assessment'))
      .send({ status: 'not_started', objective: '', technicalScope: '', prerequisites: [], dependencies: [], risks: [] });
    expect(res.status).toBe(404);
  });
});
