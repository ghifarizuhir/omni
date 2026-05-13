import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const auth = (req: request.Test) => req.set('Cookie', cookie);

describe('M1 pilot endpoints (DB-backed, authenticated)', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/v1/cis');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/cis returns seeded CIs', async () => {
    const res = await auth(request(app).get('/api/v1/cis'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('publicId');
  });

  it('GET /api/v1/cis/:publicId returns single CI', async () => {
    const res = await auth(request(app).get('/api/v1/cis/CI-SVC-PAY-001'));
    expect(res.status).toBe(200);
    expect(res.body.publicId).toBe('CI-SVC-PAY-001');
  });

  it('GET /api/v1/cis/:publicId returns 404 for unknown', async () => {
    const res = await auth(request(app).get('/api/v1/cis/CI-DOES-NOT-EXIST'));
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/cis/relationships returns all', async () => {
    const res = await auth(request(app).get('/api/v1/cis/relationships'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/cis/audit?ciId=... filters by CI', async () => {
    const all = await auth(request(app).get('/api/v1/cis/audit'));
    expect(all.status).toBe(200);
    const ciId = all.body[0].ciId;
    const filtered = await auth(request(app).get(`/api/v1/cis/audit?ciId=${ciId}`));
    expect(filtered.body.every((a: { ciId: string }) => a.ciId === ciId)).toBe(true);
  });

  it('GET /api/v1/events sorts by severity then firedAt', async () => {
    const res = await auth(request(app).get('/api/v1/events'));
    expect(res.status).toBe(200);
    const order: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };
    for (let i = 1; i < res.body.length; i++) {
      expect(order[res.body[i - 1].severity]).toBeLessThanOrEqual(order[res.body[i].severity]);
    }
  });

  it('GET /api/v1/events/dashboard-stats has expected shape', async () => {
    const res = await auth(request(app).get('/api/v1/events/dashboard-stats'));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('active');
    expect(res.body).toHaveProperty('rules.total');
    expect(res.body).toHaveProperty('coverage.pct');
  });

  it('GET /api/v1/incidents returns incidents', async () => {
    const res = await auth(request(app).get('/api/v1/incidents'));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/incidents?active=true excludes resolved/closed', async () => {
    const res = await auth(request(app).get('/api/v1/incidents?active=true'));
    expect(res.body.every((i: { status: string }) => !['resolved', 'closed'].includes(i.status))).toBe(true);
  });

  it('GET /api/v1/monitoring/rules returns rules', async () => {
    const res = await auth(request(app).get('/api/v1/monitoring/rules'));
    expect(res.body.length).toBeGreaterThan(0);
  });
});
