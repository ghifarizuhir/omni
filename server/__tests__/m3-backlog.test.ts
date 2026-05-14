import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
beforeAll(async () => { cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD); });
afterAll(async () => { await prisma.$disconnect(); });
const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('M3 backlog — residual domains served from Document store', () => {
  it.each([
    '/availability/outages',
    '/availability/sla-targets',
    '/availability/sla-breaches',
    '/availability/daily-health',
    '/availability/series',
    '/capacity/metrics',
    '/capacity/thresholds',
    '/capacity/forecasts',
    '/capacity/time-series',
    '/capacity/recommendations',
    '/teams',
    '/notifications',
    '/inbox',
    '/inbox/items',
    '/on-call/schedules',
    '/on-call/overrides',
    '/kb/categories',
    '/kb/feedback',
    '/testing/plans',
    '/testing/cases',
    '/testing/runs',
    '/testing/sign-offs',
    '/status-page/entries',
    '/status-page/incidents',
    '/ai/sessions',
    '/rbac/users',
    '/rbac/teams',
    '/rbac/applications',
    '/rbac/departments',
    '/rbac/divisions',
    '/rbac/roles',
    '/continuity/dr-plans',
    '/continuity/dr-runs',
    '/continuity/bia',
    '/measurement/reports',
    '/measurement/roi',
    '/measurement/benefits',
    '/measurement/dashboards',
    '/measurement/metrics',
    '/environments',
    '/improvements',
  ])('GET /api/v1%s returns an array', async (path) => {
    const res = await auth(request(app).get(`/api/v1${path}`));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /ai/sessions/active returns the most-recently-updated session', async () => {
    const res = await auth(request(app).get('/api/v1/ai/sessions/active'));
    expect(res.status).toBe(200);
    // May be null if there are no sessions; otherwise must have an id.
    if (res.body) expect(res.body).toHaveProperty('id');
  });

  it('GET /capacity/metrics?critical=true filters by threshold', async () => {
    const all = await auth(request(app).get('/api/v1/capacity/metrics'));
    const crit = await auth(request(app).get('/api/v1/capacity/metrics?critical=true'));
    expect(crit.status).toBe(200);
    expect(crit.body.length).toBeLessThanOrEqual(all.body.length);
  });

  it('GET /improvements/totals/estimated returns a number', async () => {
    const res = await auth(request(app).get('/api/v1/improvements/totals/estimated'));
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('number');
  });
});
