import { prisma } from '../db';
import type { ApplicationTeamRole } from '@prisma/client';

export class MembershipError extends Error {
  constructor(
    public code: 'already_member' | 'last_owner' | 'not_member' | 'app_not_found' | 'team_not_found',
    message: string,
  ) {
    super(message);
    this.name = 'MembershipError';
  }
}

export interface MembershipRow {
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  addedById: string | null;
  addedAt: Date;
}

export async function listTeamsForApp(appId: string): Promise<MembershipRow[]> {
  const rows = await prisma.applicationTeam.findMany({
    where: { applicationId: appId },
    select: { applicationId: true, teamId: true, role: true, addedById: true, addedAt: true },
    orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
  });
  return rows.map((r) => ({
    appId: r.applicationId,
    teamId: r.teamId,
    role: r.role,
    addedById: r.addedById,
    addedAt: r.addedAt,
  }));
}

export async function addTeamToApp(args: {
  tenantId: string;
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  actorId: string;
}): Promise<MembershipRow> {
  // Verify app + team belong to the tenant (defense in depth).
  const [app, team] = await Promise.all([
    prisma.application.findFirst({ where: { id: args.appId, tenantId: args.tenantId } }),
    prisma.team.findFirst({ where: { id: args.teamId, tenantId: args.tenantId } }),
  ]);
  if (!app) throw new MembershipError('app_not_found', 'Application not found in tenant');
  if (!team) throw new MembershipError('team_not_found', 'Team not found in tenant');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (existing) throw new MembershipError('already_member', 'Team is already a member of this application');
    const row = await tx.applicationTeam.create({
      data: { applicationId: args.appId, teamId: args.teamId, role: args.role, addedById: args.actorId },
    });
    return { appId: row.applicationId, teamId: row.teamId, role: row.role, addedById: row.addedById, addedAt: row.addedAt };
  });
}

export async function changeTeamRole(args: {
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  actorId: string;
}): Promise<MembershipRow> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (!existing) throw new MembershipError('not_member', 'Team is not a member of this application');

    // If we are demoting an OWNER and they're the LAST owner → refuse.
    if (existing.role === 'OWNER' && args.role !== 'OWNER') {
      const ownerCount = await tx.applicationTeam.count({ where: { applicationId: args.appId, role: 'OWNER' } });
      if (ownerCount <= 1) throw new MembershipError('last_owner', 'Cannot demote the last OWNER team');
    }

    const row = await tx.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
      data: { role: args.role },
    });
    return { appId: row.applicationId, teamId: row.teamId, role: row.role, addedById: row.addedById, addedAt: row.addedAt };
  }, { isolationLevel: 'Serializable' });
}

export async function removeTeamFromApp(args: {
  appId: string;
  teamId: string;
  actorId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (!existing) throw new MembershipError('not_member', 'Team is not a member of this application');
    if (existing.role === 'OWNER') {
      const ownerCount = await tx.applicationTeam.count({ where: { applicationId: args.appId, role: 'OWNER' } });
      if (ownerCount <= 1) throw new MembershipError('last_owner', 'Cannot remove the last OWNER team');
    }
    await tx.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
  }, { isolationLevel: 'Serializable' });
}

export async function listManageableApps(tenantId: string, ownerAppIds: string[], isPlatformAdmin: boolean) {
  if (isPlatformAdmin) {
    return prisma.application.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  return prisma.application.findMany({ where: { tenantId, id: { in: ownerAppIds } }, orderBy: { name: 'asc' } });
}

export async function listCatalog(tenantId: string, userAppIds: string[]) {
  const apps = await prisma.application.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  const ownerships = await prisma.applicationTeam.findMany({
    where: { applicationId: { in: apps.map((a) => a.id) }, role: 'OWNER' },
    select: { applicationId: true, teamId: true },
  });
  const ownerTeamsByApp = new Map<string, string[]>();
  for (const o of ownerships) {
    const arr = ownerTeamsByApp.get(o.applicationId) ?? [];
    arr.push(o.teamId);
    ownerTeamsByApp.set(o.applicationId, arr);
  }
  const memberSet = new Set(userAppIds);
  return apps.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    criticality: a.criticality,
    ownerTeamIds: ownerTeamsByApp.get(a.id) ?? [],
    isMember: memberSet.has(a.id),
  }));
}
