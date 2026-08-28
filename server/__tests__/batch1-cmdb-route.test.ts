import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
let createdPublicId: string | null = null;

beforeAll(async () => {
  // Ensure admin has PLATFORM_ADMIN so CmdbScope.createCI can write UNASSIGNED
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const { FUNCTIONAL_ROLE_DEFINITIONS } = await import('../constants/functionalRoles');
  const def = FUNCTIONAL_ROLE_DEFINITIONS['PLATFORM_ADMIN'];
  await prisma.functionalRole.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'PLATFORM_ADMIN' } },
    update: {},
    create: { id: `frole-${tenant.id}-platform_admin`, tenantId: tenant.id, code: 'PLATFORM_ADMIN', name: def.name, description: def.description },
  });
  const role = await prisma.functionalRole.findUniqueOrThrow({ where: { tenantId_code: { tenantId: tenant.id, code: 'PLATFORM_ADMIN' } } });
  await prisma.userFunctionalRole.upsert({
    where: { userId_functionalRoleId: { userId: adminUser.id, functionalRoleId: role.id } },
    update: {},
    create: { userId: adminUser.id, functionalRoleId: role.id },
  });
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  if (createdPublicId) {
    const row = await prisma.configurationItem.findUnique({ where: { publicId: createdPublicId } }).catch(() => null);
    if (row) {
      await prisma.cIAuditEntry.deleteMany({ where: { ciId: row.id } }).catch(() => undefined);
      await prisma.configurationItem.delete({ where: { id: row.id } }).catch(() => undefined);
    }
  }
  await prisma.$disconnect();
});

const auth = (r: request.Test) => r.set('Cookie', cookie);

describe('POST /cis', () => {
  it('201', async () => {
    const res = await auth(request(app).post('/api/v1/cis')).send({ name: 'n1', type: 'service' });
    expect(res.status).toBe(201);
    expect(res.body.publicId).toMatch(/^CI-/);
    expect(res.body.name).toBe('n1');
    createdPublicId = res.body.publicId;
  });
});
