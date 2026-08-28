import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
let createdPublicId: string | null = null;
let createdId: string | null = null;

beforeAll(async () => {
  // Ensure incident.create permission exists and is assigned to system roles
  // (catalog currently lacks incident.create; route requires it per batch spec).
  await prisma.permission.upsert({
    where: { key: 'incident.create' },
    update: {},
    create: { key: 'incident.create', description: 'Create incidents' },
  });
  for (const roleId of ['role-system-admin', 'role-system-operator']) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionKey: { roleId, permissionKey: 'incident.create' } },
      update: {},
      create: { roleId, permissionKey: 'incident.create' },
    });
  }
  // Invalidate permission cache if needed (permissionsForRoleId recomputes after TTL, but ensure fresh)
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  if (createdPublicId) {
    const row = await prisma.incident.findUnique({ where: { publicId: createdPublicId } }).catch(() => null);
    if (row) {
      await prisma.incidentTimelineEvent.deleteMany({ where: { incidentId: row.id } }).catch(() => undefined);
      await prisma.incidentComment.deleteMany({ where: { incidentId: row.id } }).catch(() => undefined);
      await prisma.incident.delete({ where: { id: row.id } }).catch(() => undefined);
    }
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /incidents', () => {
  it('201 creates incident', async () => {
    const res = await auth(request(app).post('/api/v1/incidents')).send({ title: 'B test', priority: 'P1' });
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^INC-/);
    expect(res.body.title).toBe('B test');
    expect(res.body.priority).toBe('P1');
    createdPublicId = res.body.publicId;
    createdId = res.body.id;
  });

  it('400 missing title', async () => {
    const res = await auth(request(app).post('/api/v1/incidents')).send({ priority: 'P1' } as any);
    expect(res.status).toBe(400);
  });

  it('401 unauth', async () => {
    const res = await request(app).post('/api/v1/incidents').send({ title: 'noauth', priority: 'P1' });
    expect(res.status).toBe(401);
  });
});
