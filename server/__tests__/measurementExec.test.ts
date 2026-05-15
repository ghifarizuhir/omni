import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /measurement/exec-summary', () => {
  it('returns 200 with expected shape', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .get('/api/v1/measurement/exec-summary')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(typeof res.body.slaCompliancePct).toBe('number');
    expect(typeof res.body.mttrMinutes).toBe('number');
    expect(typeof res.body.changeSuccessPct).toBe('number');
    expect(typeof res.body.openMajorIncidents).toBe('number');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/measurement/exec-summary');
    expect(res.status).toBe(401);
  });
});
