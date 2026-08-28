import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
let createdPublicId: string | null = null;

beforeAll(async () => {
  await prisma.permission.upsert({
    where: { key: 'problem.create' },
    update: {},
    create: { key: 'problem.create', description: 'Create problems' },
  });
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionKey: { roleId, permissionKey: 'problem.create' } },
      update: {},
      create: { roleId, permissionKey: 'problem.create' },
    });
  }
  // Also ensure problem.write exists for completeness (seed already has it)
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  if (createdPublicId) {
    const row = await prisma.problem.findUnique({ where: { publicId: createdPublicId } }).catch(() => null);
    if (row) {
      await prisma.problem.delete({ where: { id: row.id } }).catch(() => undefined);
    }
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /problems', () => {
  it('201 creates problem with PRB-YYYY-NNNNN', async () => {
    const res = await auth(request(app).post('/api/v1/problems')).send({ title: 'Batch1 route test', description: 'via api' });
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^PRB-\d{4}-\d{5}$/);
    expect(res.body.title).toBe('Batch1 route test');
    expect(res.body.status).toBe('identified');
    createdPublicId = res.body.publicId;
  });

  it('400 missing title', async () => {
    const res = await auth(request(app).post('/api/v1/problems')).send({ description: 'no title' } as any);
    expect(res.status).toBe(400);
  });

  it('400 rejects unknown field', async () => {
    const res = await auth(request(app).post('/api/v1/problems')).send({ title: 'x', status: 'closed' } as any);
    expect(res.status).toBe(400);
  });

  it('401 unauth', async () => {
    const res = await request(app).post('/api/v1/problems').send({ title: 'noauth', description: '' });
    expect(res.status).toBe(401);
  });
});
