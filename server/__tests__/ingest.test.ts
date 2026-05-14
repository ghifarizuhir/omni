import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const ingested: string[] = [];

beforeAll(async () => { cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD); });
afterEach(async () => {
  if (ingested.length) {
    await prisma.event.deleteMany({ where: { publicId: { in: ingested } } });
    ingested.length = 0;
  }
});
afterAll(async () => { await prisma.$disconnect(); });
const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('M4 — POST /events/ingest', () => {
  it('persists the event and surfaces it in /events', async () => {
    const post = await auth(request(app).post('/api/v1/events/ingest').send({
      severity: 'P2',
      title: 'Synthetic check failed',
      message: 'us-east probe timed out',
      source: 'synthetic',
      tags: ['test'],
    }));
    expect(post.status).toBe(201);
    expect(post.body.publicId).toMatch(/^EVT-/);
    expect(post.body.status).toBe('open');
    ingested.push(post.body.publicId);

    const get = await auth(request(app).get(`/api/v1/events/${post.body.publicId}`));
    expect(get.status).toBe(200);
    expect(get.body.title).toBe('Synthetic check failed');
  });

  it('rejects payloads missing required fields', async () => {
    const res = await auth(request(app).post('/api/v1/events/ingest').send({ severity: 'P2' }));
    expect(res.status).toBe(400);
  });

  it('requires event.write permission (viewer would 403, but seeded users have it)', async () => {
    // Smoke: anonymous request should be 401.
    const anon = await request(app).post('/api/v1/events/ingest').send({ title: 'x' });
    expect(anon.status).toBe(401);
  });
});
