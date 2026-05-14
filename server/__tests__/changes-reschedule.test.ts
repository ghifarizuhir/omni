// M6.11 (B2.1) — PATCH /api/v1/changes/:publicId/reschedule
// Cover the standard auth/validation matrix plus closed-state refusal and the
// rescheduleHistory append. Audit row is asserted directly against AuditLog.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

const validChangeBody = () => ({
  title: 'Reschedule fixture change',
  description: 'fixture',
  justification: 'fixture',
  type: 'normal' as const,
  risk: 'low' as const,
  impact: 'minor' as const,
  plannedStart: '2026-07-01T22:00:00Z',
  plannedEnd:   '2026-07-01T23:30:00Z',
  implementationPlan: 'do the thing',
  rollbackPlan: 'undo the thing',
  affectedCIIds: [] as string[],
});

const validReschedule = () => ({
  plannedStart: '2026-07-15T22:00:00Z',
  plannedEnd:   '2026-07-15T23:30:00Z',
  reason: 'Resource conflict with parallel deployment',
});

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PATCH /api/v1/changes/:publicId/reschedule', () => {
  // Captured by the 403 RBAC test so cleanup survives any assertion failure.
  let rsCustomRoleId: string | null = null;
  let rsMembershipId: string | null = null;

  afterAll(async () => {
    if (rsMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${rsMembershipId}/roles`)
        .set('Cookie', adminCookie)
        .send({ roleIds: [opRole.id] });
      if (rsCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${rsCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('401 unauthenticated', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const res = await request(app)
      .patch(`/api/v1/changes/${create.body.publicId}/reschedule`)
      .send(validReschedule());
    expect(res.status).toBe(401);
  });

  it('400 missing reason', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const { reason: _reason, ...noReason } = validReschedule();
    void _reason;
    const res = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/reschedule`)).send(noReason);
    expect(res.status).toBe(400);
  });

  it('400 reason too short (<10 chars)', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const res = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/reschedule`))
      .send({ ...validReschedule(), reason: 'short' });
    expect(res.status).toBe(400);
  });

  it('400 when end <= start', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const res = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/reschedule`))
      .send({ ...validReschedule(), plannedEnd: validReschedule().plannedStart });
    expect(res.status).toBe(400);
  });

  it('404 unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/changes/CHG-9999-99999/reschedule'))
      .send(validReschedule());
    expect(res.status).toBe(404);
  });

  it('409 when change is already closed', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    // Drive it into a closed state by cancelling first.
    await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/cancel`))
      .send({ reason: 'closing for test' });
    const res = await auth(request(app).patch(`/api/v1/changes/${create.body.publicId}/reschedule`))
      .send(validReschedule());
    expect(res.status).toBe(409);
  });

  it('200 happy path: updates window, persists rescheduleHistory, writes audit', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
    const publicId = create.body.publicId;
    const internalId = create.body.id;

    const body = validReschedule();
    const res = await auth(request(app).patch(`/api/v1/changes/${publicId}/reschedule`)).send(body);
    expect(res.status).toBe(200);
    expect(res.body.plannedStart).toBe(body.plannedStart);
    expect(res.body.plannedEnd).toBe(body.plannedEnd);
    expect(res.body.implementationWindow).toBe(`${body.plannedStart} → ${body.plannedEnd}`);
    expect(Array.isArray(res.body.rescheduleHistory)).toBe(true);
    expect(res.body.rescheduleHistory).toHaveLength(1);
    expect(res.body.rescheduleHistory[0].reason).toBe(body.reason);
    expect(res.body.rescheduleHistory[0].rescheduledBy).toBeDefined();
    expect(res.body.rescheduleHistory[0].rescheduledByName).toBeDefined();
    expect(res.body.rescheduleHistory[0].rescheduledAt).toBeDefined();

    // GET round-trip persists.
    const fetched = await auth(request(app).get(`/api/v1/changes/${publicId}`));
    expect(fetched.body.plannedStart).toBe(body.plannedStart);
    expect(fetched.body.plannedEnd).toBe(body.plannedEnd);
    expect(fetched.body.rescheduleHistory).toHaveLength(1);

    // scheduledStart column mirrors plannedStart.
    const row = await prisma.change.findFirstOrThrow({ where: { tenantId: 'tenant-demo', publicId } });
    expect(row.scheduledStart?.getTime()).toBe(new Date(body.plannedStart).getTime());

    // Audit row is present.
    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'Change', resourceId: internalId, action: 'reschedule' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('403 caller lacking change.write', async () => {
    const create = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());

    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-chg-rs-${Date.now()}`, permissions: ['change.read'] });
    expect(created.status).toBe(201);
    rsCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    rsMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app)
      .patch(`/api/v1/changes/${create.body.publicId}/reschedule`)
      .set('Cookie', opCookie)
      .send(validReschedule());
    expect(res.status).toBe(403);
    // Restoration happens in afterAll so it survives an assertion failure here.
  });
});
