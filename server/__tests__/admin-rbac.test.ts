import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { invalidatePermissionCache } from '../auth/permissions';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

// Some tests mutate roles in the demo tenant; clean up leftover non-system roles
// before each test so re-runs are stable.
beforeEach(async () => {
  await prisma.role.deleteMany({ where: { isSystem: false } });
  invalidatePermissionCache();
});

describe('M2 admin RBAC API', () => {
  it('GET /admin/permissions returns the seeded catalog', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/admin/permissions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(16);
    expect(res.body.map((p: { key: string }) => p.key)).toContain('system.admin');
  });

  it('GET /admin/roles lists system + tenant roles with permission keys', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/admin/roles').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const admin = res.body.find((r: { name: string }) => r.name === 'admin');
    expect(admin).toBeDefined();
    expect(admin.isSystem).toBe(true);
    expect(admin.permissions).toContain('system.admin');
  });

  it('non-admin (operator) is blocked from /admin/roles', async () => {
    const operator = await prisma.user.findFirst({ where: { email: { not: ADMIN_EMAIL } } });
    if (!operator) throw new Error('no operator user');
    const cookie = await login(app, operator.email, 'demo');
    const res = await request(app).get('/api/v1/admin/roles').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('POST /admin/roles creates a tenant role and returns it', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/admin/roles')
      .set('Cookie', cookie)
      .send({
        name: 'cmdb-reader',
        description: 'Read-only on CMDB and events',
        permissions: ['cmdb.read', 'event.read'],
      });
    expect(res.status).toBe(201);
    expect(res.body.tenantId).toBe('tenant-demo');
    expect(res.body.isSystem).toBe(false);
    expect(res.body.permissions).toEqual(['cmdb.read', 'event.read']);
  });

  it('POST /admin/roles rejects unknown permission keys', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/admin/roles')
      .set('Cookie', cookie)
      .send({ name: 'bogus', permissions: ['not.a.real.perm'] });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Unknown permission/);
  });

  it('PATCH /admin/roles/:id blocks edits to system roles', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminRole = await prisma.role.findFirstOrThrow({ where: { name: 'admin', isSystem: true } });
    const res = await request(app)
      .patch(`/api/v1/admin/roles/${adminRole.id}`)
      .set('Cookie', cookie)
      .send({ description: 'tampered' });
    expect(res.status).toBe(403);
  });

  it('PATCH /admin/roles/:id updates permissions and busts the cache', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app)
      .post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: 'cache-bust-role', permissions: ['cmdb.read'] });
    expect(created.status).toBe(201);
    const roleId = created.body.id;

    // Assign to a fresh operator and verify /auth/me reflects the new perm
    const operator = await prisma.user.findFirstOrThrow({
      where: { email: { not: ADMIN_EMAIL } },
    });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: operator.id, tenantId: 'tenant-demo' },
    });
    await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`)
      .set('Cookie', cookie)
      .send({ roleIds: [roleId] });

    const opCookie = await login(app, operator.email, 'demo');
    const before = await request(app).get('/api/v1/auth/me').set('Cookie', opCookie);
    expect(before.body.permissions).toEqual(['cmdb.read']);

    const patched = await request(app)
      .patch(`/api/v1/admin/roles/${roleId}`)
      .set('Cookie', cookie)
      .send({ permissions: ['cmdb.read', 'event.write'] });
    expect(patched.status).toBe(200);
    expect(patched.body.permissions.sort()).toEqual(['cmdb.read', 'event.write']);

    const after = await request(app).get('/api/v1/auth/me').set('Cookie', opCookie);
    expect(after.body.permissions.sort()).toEqual(['cmdb.read', 'event.write']);
  });

  it('DELETE /admin/roles/:id rejects when role is in use, allows otherwise', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app)
      .post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: 'temp-role', permissions: [] });
    const roleId = created.body.id;

    // Assign to a membership to make it "in use"
    const operator = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: operator.id, tenantId: 'tenant-demo' },
    });
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`)
      .set('Cookie', cookie).send({ roleIds: [roleId] });

    const blocked = await request(app).delete(`/api/v1/admin/roles/${roleId}`).set('Cookie', cookie);
    expect(blocked.status).toBe(409);

    // Unassign, then delete should succeed
    await request(app).put(`/api/v1/admin/memberships/${membership.id}/roles`)
      .set('Cookie', cookie).send({ roleIds: [] });
    const ok = await request(app).delete(`/api/v1/admin/roles/${roleId}`).set('Cookie', cookie);
    expect(ok.status).toBe(204);
  });

  it('PUT /admin/memberships/:id/roles rejects role from a different tenant', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const otherTenant = await prisma.tenant.create({
      data: { slug: 'other-' + Date.now(), name: 'Other Tenant' },
    });
    const foreignRole = await prisma.role.create({
      data: { tenantId: otherTenant.id, name: 'foreign', isSystem: false },
    });
    const operator = await prisma.user.findFirstOrThrow({ where: { email: { not: ADMIN_EMAIL } } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({
      where: { userId: operator.id, tenantId: 'tenant-demo' },
    });

    const res = await request(app)
      .put(`/api/v1/admin/memberships/${membership.id}/roles`)
      .set('Cookie', cookie)
      .send({ roleIds: [foreignRole.id] });
    expect(res.status).toBe(400);

    await prisma.role.delete({ where: { id: foreignRole.id } });
    await prisma.tenant.delete({ where: { id: otherTenant.id } });
  });

  it('mutations write an AuditLog row', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const created = await request(app)
      .post('/api/v1/admin/roles').set('Cookie', cookie)
      .send({ name: 'audit-test', permissions: [] });
    const roleId = created.body.id;
    const logs = await prisma.auditLog.findMany({
      where: { resourceKind: 'role', resourceId: roleId, action: 'create' },
    });
    expect(logs.length).toBe(1);
  });
});

// Restore the operator's roles after this suite mutates them, so subsequent
// runs of other test files still see the seeded state. We reset by reseeding
// the membership's single system 'operator' role.
afterAll(async () => {
  const operatorRole = await prisma.role.findFirstOrThrow({ where: { name: 'operator', isSystem: true } });
  const memberships = await prisma.tenantMembership.findMany({ where: { tenantId: 'tenant-demo' } });
  for (const m of memberships) {
    const user = await prisma.user.findUnique({ where: { id: m.userId } });
    if (!user) continue;
    if (user.email === ADMIN_EMAIL) continue;
    await prisma.membershipRole.deleteMany({ where: { membershipId: m.id } });
    await prisma.membershipRole.create({ data: { membershipId: m.id, roleId: operatorRole.id } });
  }
});
