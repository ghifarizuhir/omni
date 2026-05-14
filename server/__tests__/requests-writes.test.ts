// M6.11 — Service Request workflow writes. Mirrors the incident + changes
// patterns: Zod body, requirePermission('request.write'), repo transaction,
// audit log, GET reflects new state.
//
// Three endpoints under test:
//   POST   /requests/:publicId/steps/:stepId/approve
//   POST   /requests/:publicId/steps/:stepId/reject
//   POST   /requests/:publicId/comments
//
// Strategy for fixture lookup: walk the seeded requests, pick the first one
// with an active approval step. The seed has at least one.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { ServiceRequest } from '../../src/types';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

async function findRequestWithActiveApproval(): Promise<{ publicId: string; stepId: string }> {
  const rows = await prisma.serviceRequest.findMany({
    where: { tenantId: 'tenant-demo' },
    select: { publicId: true, data: true },
  });
  for (const r of rows) {
    const sr = JSON.parse(r.data) as ServiceRequest;
    const step = sr.workflow?.steps?.find(s => s.status === 'active' && s.type === 'approval');
    if (step) return { publicId: r.publicId, stepId: step.id };
  }
  throw new Error('seed has no request with an active approval step');
}

// Each describe-block reseeds a fresh request via cloning so tests don't
// step on each other (approve mutates state, reject mutates the same record).
async function cloneFreshRequest(): Promise<{ publicId: string; stepId: string }> {
  const fixture = await findRequestWithActiveApproval();
  const original = await prisma.serviceRequest.findFirstOrThrow({
    where: { tenantId: 'tenant-demo', publicId: fixture.publicId },
  });
  const sr = JSON.parse(original.data) as ServiceRequest;
  const suffix = Math.random().toString(36).slice(2, 8);
  const publicId = `${fixture.publicId}-CLONE-${suffix}`;
  const id = `${original.id}-clone-${suffix}`;
  const clone: ServiceRequest = { ...sr, id, publicId };
  await prisma.serviceRequest.create({
    data: {
      id,
      publicId,
      tenantId: original.tenantId,
      status: original.status,
      data: JSON.stringify(clone),
    },
  });
  return { publicId, stepId: fixture.stepId };
}

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/v1/requests/:publicId/steps/:stepId/approve', () => {
  it('unauthenticated → 401', async () => {
    const fx = await findRequestWithActiveApproval();
    const res = await request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/approve`);
    expect(res.status).toBe(401);
  });

  it('404 on unknown request', async () => {
    const res = await auth(request(app).post('/api/v1/requests/REQ-9999-99999/steps/wfi-1/approve'))
      .send({ note: 'ok' });
    expect(res.status).toBe(404);
  });

  it('404 on unknown step', async () => {
    const fx = await cloneFreshRequest();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/no-such-step/approve`))
      .send({ note: 'ok' });
    expect(res.status).toBe(404);
  });

  it('approves the active step, stamps decision, completes step', async () => {
    const fx = await cloneFreshRequest();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/approve`))
      .send({ note: 'LGTM' });
    expect(res.status).toBe(200);
    const updated = res.body as ServiceRequest;
    const step = updated.workflow.steps.find(s => s.id === fx.stepId);
    expect(step?.decision).toBe('approved');
    expect(step?.decisionNote).toBe('LGTM');
    expect(step?.decidedAt).toBeDefined();
    expect(step?.status).toBe('completed');

    const fetched = await auth(request(app).get(`/api/v1/requests/${fx.publicId}`));
    const fstep = (fetched.body as ServiceRequest).workflow.steps.find(s => s.id === fx.stepId);
    expect(fstep?.status).toBe('completed');
  });

  it('refuses to approve an already-decided step (409)', async () => {
    const fx = await cloneFreshRequest();
    await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/approve`)).send({ note: 'first' });
    const second = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/approve`)).send({ note: 'again' });
    expect(second.status).toBe(409);
  });

  it('caller without request.write → 403', async () => {
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: `m6-req-read-${Date.now()}`, permissions: ['request.read'] });
    expect(created.status).toBe(201);
    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [created.body.id] });

    const fx = await cloneFreshRequest();
    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app)
      .post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/approve`).set('Cookie', opCookie)
      .send({ note: 'no' });
    expect(res.status).toBe(403);

    // Restore
    const opRole = await prisma.role.findFirstOrThrow({
      where: { name: 'operator', isSystem: true, tenantId: null },
    });
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', cookie)
      .send({ roleIds: [opRole.id] });
    await request(app).delete(`/api/v1/admin/roles/${created.body.id}`).set('Cookie', cookie);
  });
});

describe('POST /api/v1/requests/:publicId/steps/:stepId/reject', () => {
  it('400 on missing note (rejection reason is required)', async () => {
    const fx = await cloneFreshRequest();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/reject`)).send({});
    expect(res.status).toBe(400);
  });

  it('rejects the step and marks the request rejected', async () => {
    const fx = await cloneFreshRequest();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/steps/${fx.stepId}/reject`))
      .send({ note: 'Out of policy — needs CISO sign-off' });
    expect(res.status).toBe(200);
    const updated = res.body as ServiceRequest;
    const step = updated.workflow.steps.find(s => s.id === fx.stepId);
    expect(step?.decision).toBe('rejected');
    expect(step?.status).toBe('rejected');
    expect(updated.status).toBe('rejected');
  });
});

describe('POST /api/v1/requests/:publicId/comments', () => {
  it('400 on empty body', async () => {
    const fx = await findRequestWithActiveApproval();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/comments`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 on unknown request', async () => {
    const res = await auth(request(app).post('/api/v1/requests/REQ-9999-99999/comments'))
      .send({ body: 'hi' });
    expect(res.status).toBe(404);
  });

  it('appends a comment and echoes it', async () => {
    const fx = await cloneFreshRequest();
    const res = await auth(request(app).post(`/api/v1/requests/${fx.publicId}/comments`))
      .send({ body: 'Pinging the approver again' });
    expect(res.status).toBe(201);
    expect(res.body.body).toBe('Pinging the approver again');
    expect(res.body.authorId).toBeDefined();
    expect(res.body.authorName).toBeDefined();
  });
});
