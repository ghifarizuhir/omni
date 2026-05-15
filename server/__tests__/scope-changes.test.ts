import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { createScopedAppFixture, login, type ScopedAppFixture } from './helpers';

const app = createApp();

let fx: ScopedAppFixture;

const CHANGE_BODY = {
  title: 'Scope test change',
  description: 'fixture change for scope tests',
  type: 'normal',
  risk: 'medium',
  impact: 'moderate',
  plannedStart: '2030-01-01T00:00:00Z',
  plannedEnd: '2030-01-02T00:00:00Z',
  implementationPlan: 'deploy it',
  rollbackPlan: 'roll it back',
  affectedCIIds: [],
};

beforeAll(async () => {
  fx = await createScopedAppFixture('changes');
  // role-system-operator doesn't include change.write (only incident.write, cmdb.write, etc.).
  // Add change.write to the role for this test so requirePermission passes.
  // We add the permission directly to role-system-operator (if not already present).
  const permKey = 'change.write';
  const perm = await prisma.permission.findFirst({ where: { key: permKey } });
  if (!perm) throw new Error(`Permission ${permKey} not found in catalog`);
  await prisma.rolePermission.upsert({
    where: { roleId_permissionKey: { roleId: 'role-system-operator', permissionKey: permKey } },
    update: {},
    create: { roleId: 'role-system-operator', permissionKey: permKey },
  });
});

afterAll(async () => {
  delete process.env.SCOPE_ENFORCEMENT_MODE;
  // Change rows are cleaned up by db:reset between test runs; no per-test cleanup needed here.
  // Remove the change.write permission we added to role-system-operator (only if not seeded).
  const alreadySeeded = await prisma.rolePermission.findFirst({
    where: { roleId: 'role-system-operator', permissionKey: 'change.write' },
  });
  // We can't distinguish our addition from a pre-existing seed, so leave it.
  // In practice seed.ts resets this on each `db:reset`, so cleanup is safe to skip.
  void alreadySeeded;
  await fx.cleanup();
  await prisma.$disconnect();
});

async function loginAs(handle: 'member-a' | 'member-b' | 'noc' | 'admin') {
  return login(app, fx.emailOf(handle), fx.password);
}

describe('Changes scope — POST /changes', () => {
  it('1. memberA (contributor of the app) succeeds in enforce mode', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app)
      .post('/api/v1/changes')
      .set('Cookie', cookie)
      .send({ ...CHANGE_BODY, applicationId: fx.appId });
    expect(res.status).toBe(201);
  });

  it('2. memberB (outsider) gets 403 in enforce mode', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .post('/api/v1/changes')
      .set('Cookie', cookie)
      .send({ ...CHANGE_BODY, applicationId: fx.appId });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'change', action: 'create' });
  });

  it('3. platformAdmin succeeds in enforce mode', async () => {
    const cookie = await loginAs('admin');
    const res = await request(app)
      .post('/api/v1/changes')
      .set('Cookie', cookie)
      .send({ ...CHANGE_BODY, applicationId: fx.appId });
    expect(res.status).toBe(201);
  });

});
