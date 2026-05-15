import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import {
  addTeamToApp, changeTeamRole, removeTeamFromApp, listTeamsForApp,
} from '../repositories/applicationMembership';
import { createScopedAppFixture, type ScopedAppFixture } from './helpers';

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
