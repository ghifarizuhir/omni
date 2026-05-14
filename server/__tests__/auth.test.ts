import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('M2 auth + session + RBAC', () => {
  it('POST /auth/login with valid creds returns user + sets cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(res.body.tenantId).toBe('tenant-demo');
    expect(res.body.roleNames).toContain('admin');
    expect(res.body.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'admin' })]));
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /auth/login with bad password returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login validates email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'demo' });
    expect(res.status).toBe(400);
  });

  it('GET /auth/me without session returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /auth/me with session returns user + permissions', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(res.body.permissions).toContain('system.admin');
  });

  it('POST /auth/logout invalidates the session', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const out = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(out.status).toBe(204);
    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(401);
  });

  it('admin can access /admin/* routes', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/admin/tenants').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('non-admin (operator) gets 403 on /admin/*', async () => {
    const operator = await prisma.user.findFirst({
      where: { email: { not: ADMIN_EMAIL } },
    });
    if (!operator) throw new Error('no operator user');
    const cookie = await login(app, operator.email, 'demo');
    const res = await request(app).get('/api/v1/admin/tenants').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});
