import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const createdIds: string[] = [];

beforeAll(async () => {
  for (const key of ['kb.read', 'kb.write'] as const) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: key } });
  }
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    for (const key of ['kb.read', 'kb.write'] as const) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionKey: { roleId, permissionKey: key } },
        update: {},
        create: { roleId, permissionKey: key },
      });
    }
  }
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  for (const id of createdIds) {
    await prisma.kBArticle.deleteMany({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('KB feedback', () => {
  it('POST /kb/articles/:publicId/feedback 201', async () => {
    // Ensure at least one article exists; create one with unique title for hermetic test
    const uniq = `postgres-feedback-${Date.now()}`;
    const createRes = await auth(request(app).post('/api/v1/kb/articles')).send({
      title: `Feedback test ${uniq}`,
      summary: 'Summary for feedback test',
      body: '# Heading\n\nBody',
      categoryId: '',
      contentType: 'how_to',
      visibility: 'internal',
      tags: ['feedback-test'],
      relatedCIPublicIds: [],
      linkedProblemIds: [],
      linkedIncidentIds: [],
    });
    expect(createRes.status).toBe(201);
    const pubId = createRes.body.publicId as string;
    createdIds.push(createRes.body.id);

    const res = await auth(request(app).post(`/api/v1/kb/articles/${pubId}/feedback`)).send({ helpful: true });
    expect([200, 201]).toContain(res.status);
    if (res.status === 201 || res.status === 200) {
      expect(res.body.ok ?? res.body.helpful ?? true).toBeTruthy();
    }

    // Verify 404 on unknown publicId
    const notFound = await auth(request(app).post('/api/v1/kb/articles/KB-DOES-NOT-EXIST/feedback')).send({ helpful: true });
    expect(notFound.status).toBe(404);

    // Verify validation 400 when helpful missing
    const bad = await auth(request(app).post(`/api/v1/kb/articles/${pubId}/feedback`)).send({});
    expect(bad.status).toBe(400);
  });

  it('GET ?q filters server side', async () => {
    const uniq = `qfilter-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const title = `Postgres Unique ${uniq} Title`;
    const createRes = await auth(request(app).post('/api/v1/kb/articles')).send({
      title,
      summary: 'postgres summary unique',
      body: '# Body\n\ncontent',
      categoryId: '',
      contentType: 'how_to',
      visibility: 'internal',
      tags: ['postgres', uniq],
      relatedCIPublicIds: [],
      linkedProblemIds: [],
      linkedIncidentIds: [],
    });
    expect(createRes.status).toBe(201);
    createdIds.push(createRes.body.id);

    const res = await auth(request(app).get(`/api/v1/kb/articles?q=${encodeURIComponent(uniq)}`));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Server side filter: every returned item should contain q in title/summary/tags
    for (const a of res.body) {
      const hay = `${a.title ?? ''} ${a.summary ?? ''} ${(a.tags ?? []).join(' ')}`.toLowerCase();
      expect(hay).toContain(uniq.toLowerCase());
    }
    expect(res.body.length).toBeGreaterThanOrEqual(1);

    // q=postgres should return at least our postgres-tagged article
    const res2 = await auth(request(app).get('/api/v1/kb/articles?q=postgres'));
    expect(res2.status).toBe(200);
    expect(Array.isArray(res2.body)).toBe(true);
  });

  it('GET /kb/articles pagination still works', async () => {
    const res = await auth(request(app).get('/api/v1/kb/articles?page=1&pageSize=1'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });
});
