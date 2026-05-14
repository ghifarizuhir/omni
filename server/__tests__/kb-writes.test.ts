// M6.11 (B1.5) — KB article writes: POST /kb/articles, PATCH /kb/articles/:publicId,
// PATCH /kb/articles/:publicId/status. Same shape as the other B1 tasks: Zod
// body, requirePermission('kb.write'), repo transaction returning before/after,
// audit log, GET round-trip. Hermetic: a fresh KB row is cloned for each
// describe block so re-runs don't fight the seed.

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

const rand = () => Math.random().toString(36).slice(2, 8);

/** Clone the first seed KB article under a fresh publicId so tests are
 *  hermetic across re-runs. Mutates the cloned row, never the seed. */
async function cloneArticle(suffix: string): Promise<{ publicId: string; internalId: string }> {
  const candidate = await prisma.kBArticle.findFirst({ where: { tenantId: 'tenant-demo' } });
  if (!candidate) throw new Error('seed has no KB articles to clone for B1.5 test');
  const internalId = `${candidate.id}-b15-${suffix}`;
  const publicId = `${candidate.publicId}-B15-${suffix.toUpperCase()}`;
  await prisma.kBArticle.create({
    data: {
      ...candidate,
      id: internalId,
      publicId,
    },
  });
  return { publicId, internalId };
}

const validCreateBody = () => ({
  title: 'B1.5 test article — runbook for the test runbook',
  summary: 'Brief description used in search results.',
  body: '# Heading\n\nSome body.',
  categoryId: '',
  contentType: 'how_to' as const,
  visibility: 'internal' as const,
  tags: ['test', 'b15'],
  relatedCIPublicIds: [],
  linkedProblemIds: [],
  linkedIncidentIds: [],
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/kb/articles', () => {
  // Captured by the 403 test so cleanup survives any assertion failure.
  let cCustomRoleId: string | null = null;
  let cMembershipId: string | null = null;

  afterAll(async () => {
    if (cMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${cMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (cCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${cCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
  });

  it('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/v1/kb/articles').send(validCreateBody());
    expect(res.status).toBe(401);
  });

  it('400 on missing title', async () => {
    const body = { ...validCreateBody(), title: '' };
    const res = await auth(request(app).post('/api/v1/kb/articles')).send(body);
    expect(res.status).toBe(400);
  });

  it('creates a draft article with an allocated publicId; GET round-trip reflects it', async () => {
    const res = await auth(request(app).post('/api/v1/kb/articles')).send(validCreateBody());
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^KB-\d{5}$/);
    expect(res.body.status).toBe('draft');
    expect(res.body.title).toBe(validCreateBody().title);
    expect(res.body.authorId).toBeDefined();

    const fetched = await auth(request(app).get(`/api/v1/kb/articles/${res.body.publicId}`));
    expect(fetched.status).toBe(200);
    expect(fetched.body.publicId).toBe(res.body.publicId);
    expect(fetched.body.status).toBe('draft');
  });

  it('caller with kb.read only → 403', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-kb-read-${Date.now()}`, permissions: ['kb.read'] });
    expect(created.status).toBe(201);
    cCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    cMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).post('/api/v1/kb/articles').set('Cookie', opCookie).send(validCreateBody());
    expect(res.status).toBe(403);
    // Cleanup happens in afterAll so the operator's role is restored even on failure.
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/kb/articles/:publicId', () => {
  let publicId: string;
  let internalId: string;
  // 403 cleanup state.
  let uCustomRoleId: string | null = null;
  let uMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneArticle(`u-${rand()}`));
  });

  afterAll(async () => {
    if (uMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${uMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (uCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${uCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
    await prisma.kBArticle.deleteMany({ where: { id: internalId } });
  });

  it('200 happy: renames title; GET round-trip reflects it', async () => {
    const newTitle = `B1.5 PATCH rename ${Date.now()}`;
    const res = await auth(request(app).patch(`/api/v1/kb/articles/${publicId}`))
      .send({ title: newTitle, tags: ['updated'] });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(newTitle);
    expect(res.body.tags).toEqual(['updated']);

    const fetched = await auth(request(app).get(`/api/v1/kb/articles/${publicId}`));
    expect(fetched.body.title).toBe(newTitle);

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'KBArticle', resourceId: internalId, action: 'update' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
    expect(log!.before).toBeTruthy();
    expect(log!.after).toBeTruthy();
  });

  it('400 strict-mode rejection when body includes `status`', async () => {
    const res = await auth(request(app).patch(`/api/v1/kb/articles/${publicId}`))
      .send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/kb/articles/KB-DOES-NOT-EXIST'))
      .send({ title: 'whatever' });
    expect(res.status).toBe(404);
  });

  it('caller with kb.read only → 403', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-kb-upd-read-${Date.now()}`, permissions: ['kb.read'] });
    expect(created.status).toBe(201);
    uCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    uMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).patch(`/api/v1/kb/articles/${publicId}`).set('Cookie', opCookie)
      .send({ title: 'should not work' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/kb/articles/:publicId/status', () => {
  let publicId: string;
  let internalId: string;
  // 403 cleanup state.
  let sCustomRoleId: string | null = null;
  let sMembershipId: string | null = null;

  beforeAll(async () => {
    ({ publicId, internalId } = await cloneArticle(`s-${rand()}`));
    // Make sure the cloned row starts as `draft` so our transitions are valid.
    await prisma.kBArticle.update({
      where: { id: internalId },
      data: { status: 'draft' },
    });
    // Sync the JSON snapshot too.
    const row = await prisma.kBArticle.findUniqueOrThrow({ where: { id: internalId } });
    const parsed = JSON.parse(row.data);
    parsed.status = 'draft';
    await prisma.kBArticle.update({ where: { id: internalId }, data: { data: JSON.stringify(parsed) } });
  });

  afterAll(async () => {
    if (sMembershipId) {
      const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
      const opRole = await prisma.role.findFirstOrThrow({
        where: { name: 'operator', isSystem: true, tenantId: null },
      });
      await request(app).put(`/api/v1/admin/memberships/${sMembershipId}/roles`)
        .set('Cookie', adminCookie).send({ roleIds: [opRole.id] });
      if (sCustomRoleId) {
        await request(app).delete(`/api/v1/admin/roles/${sCustomRoleId}`).set('Cookie', adminCookie);
      }
    }
    await prisma.kBArticle.deleteMany({ where: { id: internalId } });
  });

  it('200 draft → published; response includes publishedAt + publishedBy', async () => {
    const res = await auth(request(app).patch(`/api/v1/kb/articles/${publicId}/status`))
      .send({ status: 'published' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.publishedAt).toBeTruthy();
    expect(res.body.publishedBy).toBeTruthy();

    const log = await prisma.auditLog.findFirst({
      where: { tenantId: 'tenant-demo', resourceKind: 'KBArticle', resourceId: internalId, action: 'status_change' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });

  it('400 on same-status transition (already published)', async () => {
    const res = await auth(request(app).patch(`/api/v1/kb/articles/${publicId}/status`))
      .send({ status: 'published' });
    expect(res.status).toBe(400);
  });

  it('404 on unknown publicId', async () => {
    const res = await auth(request(app).patch('/api/v1/kb/articles/KB-NOPE/status'))
      .send({ status: 'published' });
    expect(res.status).toBe(404);
  });

  it('caller with kb.read only → 403', async () => {
    const adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app).post('/api/v1/admin/roles').set('Cookie', adminCookie)
      .send({ name: `m6-kb-st-read-${Date.now()}`, permissions: ['kb.read'] });
    expect(created.status).toBe(201);
    sCustomRoleId = created.body.id;

    const op = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: op.id, tenantId: 'tenant-demo' },
    });
    sMembershipId = membership.id;
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`).set('Cookie', adminCookie)
      .send({ roleIds: [created.body.id] });

    const opCookie = await login(app, op.email, 'demo');
    const res = await request(app).patch(`/api/v1/kb/articles/${publicId}/status`).set('Cookie', opCookie)
      .send({ status: 'in_review' });
    expect(res.status).toBe(403);
  });
});
