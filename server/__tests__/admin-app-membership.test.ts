import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { requireAppManager } from '../middleware/appManager';
import { prisma } from '../db';
import {
  addTeamToApp, changeTeamRole, removeTeamFromApp, listTeamsForApp,
} from '../repositories/applicationMembership';
import { createScopedAppFixture, type ScopedAppFixture, ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';
import { createApp } from '../app';

let fx: ScopedAppFixture;
let tenantId: string;

beforeAll(async () => {
  fx = await createScopedAppFixture('mem-repo');
  const t = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' },
  });
  tenantId = t.id;
});
afterAll(async () => { await fx.cleanup(); await prisma.$disconnect(); });

describe('applicationMembership repo', () => {
  it('addTeamToApp adds a team with the requested role', async () => {
    await addTeamToApp({ tenantId, appId: fx.appId, teamId: fx.teamBId, role: 'VIEWER', actorId: fx.platformAdminUserId });
    const teams = await listTeamsForApp(fx.appId);
    expect(teams.find((t) => t.teamId === fx.teamBId)?.role).toBe('VIEWER');
    await removeTeamFromApp({ appId: fx.appId, teamId: fx.teamBId, actorId: fx.platformAdminUserId });
  });

  it('refuses to add an already-member team (409 already_member)', async () => {
    await expect(
      addTeamToApp({ tenantId, appId: fx.appId, teamId: fx.teamAId, role: 'CONTRIBUTOR', actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'already_member' });
  });

  it('refuses to remove the last OWNER (409 last_owner)', async () => {
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'OWNER', actorId: fx.platformAdminUserId });
    await expect(
      removeTeamFromApp({ appId: fx.appId, teamId: fx.teamAId, actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'last_owner' });
    // Direct DB write to bypass the last_owner guard (revert test state).
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });

  it('refuses to demote the last OWNER (409 last_owner)', async () => {
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'OWNER', actorId: fx.platformAdminUserId });
    await expect(
      changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'VIEWER', actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'last_owner' });
    // Direct DB write to bypass the last_owner guard (revert test state).
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});

function makeFakeReq(userId: string, hasSystemAdmin = false) {
  return {
    session: { userId, tenantId, sessionId: 'x', roles: [] },
    permissions: new Set<string>(hasSystemAdmin ? ['system.admin'] : []),
    tenantId,
  } as unknown as import('express').Request;
}

describe('requireAppManager', () => {
  it('returns "admin" for system.admin permission holder', async () => {
    const req = makeFakeReq(fx.memberBUserId, true);
    await expect(requireAppManager(req, fx.appId)).resolves.toBe('admin');
  });

  it('returns "admin" for PLATFORM_ADMIN functional role', async () => {
    const req = makeFakeReq(fx.platformAdminUserId);
    await expect(requireAppManager(req, fx.appId)).resolves.toBe('admin');
  });

  it('returns "owner" for Application Owner of the app', async () => {
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const req = makeFakeReq(fx.memberAUserId);
    await expect(requireAppManager(req, fx.appId)).resolves.toBe('owner');
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });

  it('rejects a non-admin non-owner user with 403', async () => {
    const req = makeFakeReq(fx.memberBUserId);
    await expect(requireAppManager(req, fx.appId)).rejects.toMatchObject({ status: 403 });
  });
});

const app = createApp();

describe('POST /api/v1/applications/:appId/teams', () => {
  it('PlatformAdmin can add a team as VIEWER', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamBId, role: 'VIEWER' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('VIEWER');
    await prisma.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamBId } },
    });
  });

  it('Returns 409 with error=already_member when team already a member', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamAId, role: 'CONTRIBUTOR' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already_member');
  });

  it('Returns 403 for a non-admin non-owner user', async () => {
    const cookie = await login(app, fx.emailOf('member-b'), fx.password);
    const res = await request(app)
      .post(`/api/v1/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamBId, role: 'CONTRIBUTOR' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/applications/:appId/teams/:teamId', () => {
  it('Refuses to demote the last OWNER (409 last_owner)', async () => {
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .patch(`/api/v1/applications/${fx.appId}/teams/${fx.teamAId}`)
      .set('Cookie', cookie)
      .send({ role: 'VIEWER' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('last_owner');
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});

describe('DELETE /api/v1/applications/:appId/teams/:teamId', () => {
  it('Refuses to remove the last OWNER (409 last_owner)', async () => {
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .delete(`/api/v1/applications/${fx.appId}/teams/${fx.teamAId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('last_owner');
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});

describe('GET /api/v1/applications/:appId/teams', () => {
  it('Returns the current memberships', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get(`/api/v1/applications/${fx.appId}/teams`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    const teamIds = (res.body as Array<{ teamId: string }>).map((r) => r.teamId);
    expect(teamIds).toContain(fx.teamAId);
  });
});

describe('GET /api/v1/applications/manageable', () => {
  it('PlatformAdmin sees all apps including the fixture', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/applications/manageable').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: string }>).some((a) => a.id === fx.appId)).toBe(true);
  });
});

import { upsertApplication } from '../repositories/rbacOrg';

describe('upsertApplication (legacy) preserves ApplicationTeam memberships', () => {
  it('does NOT touch ApplicationTeam rows', async () => {
    const before = await prisma.applicationTeam.findMany({
      where: { applicationId: fx.appId },
      orderBy: { teamId: 'asc' },
    });
    expect(before.length).toBeGreaterThan(0); // fixture has at least teamA

    // Read the existing app so we can call upsertApplication with the current code.
    const existing = await prisma.application.findUniqueOrThrow({ where: { id: fx.appId } });
    await upsertApplication(tenantId, fx.appId, {
      code: existing.code,
      name: 'Renamed via legacy upsert',
      // Pass teams array — should be IGNORED by the new implementation.
      teams: [],
    });

    const after = await prisma.applicationTeam.findMany({
      where: { applicationId: fx.appId },
      orderBy: { teamId: 'asc' },
    });
    expect(after.length).toBe(before.length);
    expect(after.map((r) => r.teamId).sort()).toEqual(before.map((r) => r.teamId).sort());

    // Restore the original name.
    await upsertApplication(tenantId, fx.appId, { code: existing.code, name: existing.name, teams: [] });
  });
});
