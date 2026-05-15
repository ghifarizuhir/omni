// Task 7 — Request comments backed by the RequestComment Prisma model.
// Tests: GET /requests/:publicId/comments and POST /requests/:publicId/comments
// using the new DB table, not the JSON-embedded comments.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
let testPublicId: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Create a minimal ServiceRequest for tests (seed has none after strip).
  const publicId = `REQ-TEST-${Date.now()}`;
  const id = `sr-test-${Date.now()}`;
  const data = JSON.stringify({
    id,
    publicId,
    catalogItemId: 'ci-1',
    catalogItemPublicId: 'CAT-001',
    catalogItemName: 'Test Item',
    catalogCategory: 'software',
    title: 'Test Request',
    status: 'submitted',
    priority: 'normal',
    requesterId: 'user-1',
    requesterName: 'Test User',
    formData: {},
    workflow: { steps: [], currentStepIndex: 0 },
    comments: [],
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  // Ensure an Unassigned app exists for tenant-demo so the NOT NULL constraint is satisfied.
  const applicationId = await (async () => {
    const existing = await prisma.application.findFirst({ where: { tenantId: 'tenant-demo', code: 'UNASSIGNED' } });
    if (existing) return existing.id;
    const created = await prisma.application.create({ data: { id: 'app-unassigned-tenant-demo', tenantId: 'tenant-demo', code: 'UNASSIGNED', name: 'Unassigned', criticality: null } });
    return created.id;
  })();
  await prisma.serviceRequest.create({
    data: { id, publicId, tenantId: 'tenant-demo', status: 'submitted', data, applicationId },
  });
  testPublicId = publicId;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/v1/requests/:publicId/comments', () => {
  it('unauthenticated → 401', async () => {
    const res = await request(app).get(`/api/v1/requests/${testPublicId}/comments`);
    expect(res.status).toBe(401);
  });

  it('404 on unknown request', async () => {
    const res = await auth(request(app).get('/api/v1/requests/REQ-NOTEXIST-99999/comments'));
    expect(res.status).toBe(404);
  });

  it('returns an empty array initially for a new request', async () => {
    const res = await auth(request(app).get(`/api/v1/requests/${testPublicId}/comments`));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/v1/requests/:publicId/comments + GET round-trip', () => {
  it('creates a comment (201) and GET then returns it', async () => {
    // POST a comment
    const post = await auth(request(app).post(`/api/v1/requests/${testPublicId}/comments`))
      .send({ body: 'Integration test comment' });
    expect(post.status).toBe(201);
    expect(post.body.body).toBe('Integration test comment');
    expect(post.body.authorId).toBeDefined();

    // GET should now include the comment from the RequestComment table
    const get = await auth(request(app).get(`/api/v1/requests/${testPublicId}/comments`));
    expect(get.status).toBe(200);
    expect(get.body.length).toBeGreaterThan(0);
    const found = get.body.find((c: { body: string }) => c.body === 'Integration test comment');
    expect(found).toBeDefined();
  });

  it('400 on missing body', async () => {
    const res = await auth(request(app).post(`/api/v1/requests/${testPublicId}/comments`)).send({});
    expect(res.status).toBe(400);
  });

  it('404 on unknown request', async () => {
    const res = await auth(request(app).post('/api/v1/requests/REQ-NOTEXIST-99999/comments'))
      .send({ body: 'hello' });
    expect(res.status).toBe(404);
  });
});
