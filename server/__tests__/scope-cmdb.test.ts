/**
 * Integration tests — CMDB scope enforcement
 * Task 9: 3 personas × 3 modes + legacy NULL CI
 *
 * Architectural note: ScopeViolationError is now caught at the route boundary
 * in server/routes/cmdb.ts. applyEnforcement(err, res) is called there; in
 * enforce mode it re-throws (→ 403), in warn mode it sets X-Scope-Warning and
 * returns (→ 200 via raw repo bypass), in off mode it returns silently (→ 200).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { createScopedAppFixture, login, type ScopedAppFixture } from './helpers';
import type { Express } from 'express';

let app: Express;
let fx: ScopedAppFixture;
let ciPublicId: string;
let legacyCiPublicId: string;
const TAG = 'scope-cmdb-t9';

async function loginAs(handle: 'member-a' | 'member-b' | 'noc' | 'admin') {
  return login(app, fx.emailOf(handle), fx.password);
}

beforeAll(async () => {
  app = createApp();
  fx = await createScopedAppFixture(TAG);

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' },
  });

  // CI belonging to the fixture app (scope-enforced).
  await prisma.configurationItem.create({
    data: {
      id: `ci-scoped-${TAG}`,
      publicId: `ci-scoped-${TAG}`,
      tenantId: tenant.id,
      name: 'Scoped CI',
      type: 'server',
      status: 'active',
      environment: 'production',
      criticality: 'high',
      ownerTeamId: fx.teamAId,
      primaryApplicationId: fx.appId,
      health: 'healthy',
      attributes: '{}',
      tags: '[]',
    },
  });
  ciPublicId = `ci-scoped-${TAG}`;

  // Since Plan F, primaryApplicationId is NOT NULL. Use the fixture app (owned by teamA).
  // memberB (teamB outsider) will be blocked in enforce mode — null bypass no longer exists.
  await prisma.configurationItem.create({
    data: {
      id: `ci-legacy-${TAG}`,
      publicId: `ci-legacy-${TAG}`,
      tenantId: tenant.id,
      name: 'Legacy CI',
      type: 'server',
      status: 'active',
      environment: 'production',
      criticality: 'low',
      ownerTeamId: fx.teamBId,
      primaryApplicationId: fx.appId,
      health: 'healthy',
      attributes: '{}',
      tags: '[]',
    },
  });
  legacyCiPublicId = `ci-legacy-${TAG}`;
});

afterAll(async () => {
  await prisma.configurationItem.deleteMany({
    where: { id: { in: [`ci-scoped-${TAG}`, `ci-legacy-${TAG}`] } },
  });
  await fx.cleanup();
  delete process.env.SCOPE_ENFORCEMENT_MODE;
});

// ── Describe 1: Scoped CI (primaryApplicationId = fx.appId) ──────────────────

describe('CMDB scope enforcement — scoped CI', () => {
  it('1. CMDB read is global — memberB (outsider) GET /cis returns 200', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .get('/api/v1/cis')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('2. memberA PATCH /cis/:id succeeds in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-a');
    const res = await request(app)
      .patch(`/api/v1/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scoped CI — updated by A' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ publicId: ciPublicId });
  });

  it('3. memberB PATCH /cis/:id succeeds in off mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'off';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scoped CI — updated by B (off)' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ publicId: ciPublicId });
  });

  it('4. memberB PATCH /cis/:id returns 200 + X-Scope-Warning header in warn mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'warn';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scoped CI — updated by B (warn)' });
    expect(res.status).toBe(200);
    expect(res.headers['x-scope-warning']).toBeTruthy();
    expect(res.body).toMatchObject({ publicId: ciPublicId });
  });

  it('5. memberB PATCH /cis/:id returns 403 in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scoped CI — should be rejected' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      error: 'scope_violation',
      module: 'cmdb',
      action: 'update',
    });
  });

  it('6. PLATFORM_ADMIN PATCH /cis/:id returns 200 in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('admin');
    const res = await request(app)
      .patch(`/api/v1/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scoped CI — updated by admin (enforce)' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ publicId: ciPublicId });
  });
});

// ── Describe 2: CI scoped to fx.appId (memberB is an outsider) ───────────────

describe('CMDB scope enforcement — scoped CI (outsider blocked)', () => {
  it('7. memberB PATCH CI scoped to appId returns 403 in enforce mode (NOT NULL: no null bypass)', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/cis/${legacyCiPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Legacy CI — should be rejected in enforce' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'cmdb', action: 'update' });
  });
});
