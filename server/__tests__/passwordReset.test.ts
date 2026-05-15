import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { login, ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';
import { prisma } from '../db';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /admin/rbac/users/:id/reset-password', () => {
  let adminCookie: string;
  let targetUserId: string;

  beforeAll(async () => {
    adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    // Create a fresh target user with no password.
    const u = await prisma.user.create({
      data: {
        email: `reset-target-${Date.now()}@example.com`,
        name: 'Reset Target',
        isSuperadmin: false,
      },
    });
    targetUserId = u.id;
    // Ensure tenant membership matches the admin's tenant.
    const adminMembership = await prisma.tenantMembership.findFirst({
      where: { user: { email: ADMIN_EMAIL } },
    });
    await prisma.tenantMembership.create({
      data: { userId: u.id, tenantId: adminMembership!.tenantId },
    });
  });

  it('rejects callers without superadmin permission', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`);
    expect(res.status).toBe(401);
  });

  it('returns a temp password and flips mustChangePassword to true', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`)
      .set('Cookie', adminCookie);
    expect(res.status).toBe(201);
    expect(typeof res.body.tempPassword).toBe('string');
    expect(res.body.tempPassword.length).toBeGreaterThan(0);

    const row = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(row?.mustChangePassword).toBe(true);
    expect(row?.passwordHash).toBeTruthy();
  });

  it('lets the target user log in with the returned password', async () => {
    // Reset again to get a fresh password.
    const reset = await request(app)
      .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`)
      .set('Cookie', adminCookie);
    expect(reset.status).toBe(201);
    const tempPw = reset.body.tempPassword;
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });

    const loginRes = await request(app).post('/api/v1/auth/login')
      .send({ email: user!.email, password: tempPw });
    expect(loginRes.status).toBe(200);
  });

  it('returns 404 when user does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/admin/rbac/users/does-not-exist/reset-password')
      .set('Cookie', adminCookie);
    expect(res.status).toBe(404);
  });
});
