import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';
import { prisma } from '../db';
import { hashPassword } from '../auth/session';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /auth/change-password', () => {
  let userEmail: string;
  let userCookie: string;

  beforeAll(async () => {
    // Create a fresh user with mustChangePassword: true
    userEmail = `change-pw-${Date.now()}@example.com`;
    const u = await prisma.user.create({
      data: {
        email: userEmail,
        name: 'Change PW User',
        isSuperadmin: false,
        passwordHash: await hashPassword('OldPass-123'),
        mustChangePassword: true,
      },
    });
    // Add tenant membership matching the admin's tenant
    const adminMembership = await prisma.tenantMembership.findFirst({
      where: { user: { email: ADMIN_EMAIL } },
    });
    await prisma.tenantMembership.create({
      data: { userId: u.id, tenantId: adminMembership!.tenantId },
    });

    // Log in and capture the session cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'OldPass-123' });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    userCookie = cookies[0].split(';')[0];
  });

  it('returns 401 if currentPassword is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'WrongPass-999', newPassword: 'NewPass-456' });
    expect(res.status).toBe(401);
  });

  it('returns 400 if newPassword is less than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'OldPass-123', newPassword: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 409 if newPassword equals currentPassword', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'OldPass-123', newPassword: 'OldPass-123' });
    expect(res.status).toBe(409);
  });

  it('204 on success: clears mustChangePassword, old password fails, new password succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', userCookie)
      .send({ currentPassword: 'OldPass-123', newPassword: 'NewPass-456' });
    expect(res.status).toBe(204);

    // Flag cleared in DB
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    expect(user?.mustChangePassword).toBe(false);

    // Old password fails
    const oldLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'OldPass-123' });
    expect(oldLoginRes.status).toBe(401);

    // New password succeeds
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userEmail, password: 'NewPass-456' });
    expect(newLoginRes.status).toBe(200);
  });
});
