import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const createdIds: string[] = [];

beforeAll(async () => {
  for (const key of ['problem.create', 'problem.read', 'problem.update'] as const) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: key } });
  }
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    for (const key of ['problem.create', 'problem.read', 'problem.update']) {
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
  for (const publicId of createdIds) {
    const row = await prisma.problem.findUnique({ where: { publicId } }).catch(() => null);
    if (row) await prisma.problem.delete({ where: { id: row.id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('Problem workflow routes', () => {
  it('PATCH status 200', async () => {
    const created = await auth(request(app).post('/api/v1/problems')).send({ title: 'T8 test', description: 'desc' }).then((r) => r.body);
    expect(created.publicId).toBeDefined();
    createdIds.push(created.publicId);
    const res = await auth(request(app).patch(`/api/v1/problems/${created.publicId}/status`)).send({ status: 'investigating' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('investigating');
  });
  it('POST known-error 201', async () => {
    const created = await auth(request(app).post('/api/v1/problems')).send({ title: 'T8 KE', description: 'desc' }).then((r) => r.body);
    createdIds.push(created.publicId);
    const res = await auth(request(app).post(`/api/v1/problems/${created.publicId}/known-error`)).send({ rootCause: 'r'.repeat(10), workaround: 'w'.repeat(10) });
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('known_error');
  });
  it('GET timeline 200', async () => {
    const created = await auth(request(app).post('/api/v1/problems')).send({ title: 'T8 TL', description: 'desc' }).then((r) => r.body);
    createdIds.push(created.publicId);
    const res = await auth(request(app).get(`/api/v1/problems/${created.publicId}/timeline`));
    expect(res.statusCode).toBe(200);
  });
});
