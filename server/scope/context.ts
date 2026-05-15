import { prisma } from '../db';
import type { FunctionalRoleCode } from '../constants/functionalRoles';
import { FUNCTIONAL_ROLE_CODES } from '../constants/functionalRoles';

export interface AppMembership {
  appId: string;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
}

export interface ScopeContext {
  userId: string;
  tenantId: string;
  appMemberships: AppMembership[];
  functionalRoles: FunctionalRoleCode[];
}

/**
 * Loads the per-request scope context: which apps the user can read/write via
 * Team membership, plus any tenant-wide functional roles. Single query each.
 */
export async function resolveScopeContext(args: {
  userId: string;
  tenantId: string;
}): Promise<ScopeContext> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { teamId: true },
  });

  const teamId = user?.teamId ?? null;
  const memberships = teamId
    ? await prisma.applicationTeam.findMany({
        where: { teamId },
        select: { applicationId: true, role: true },
      })
    : [];

  const roleRows = await prisma.userFunctionalRole.findMany({
    where: { userId: args.userId, role: { code: { in: [...FUNCTIONAL_ROLE_CODES] } } },
    select: { role: { select: { code: true } } },
  });

  return {
    userId: args.userId,
    tenantId: args.tenantId,
    appMemberships: memberships.map((m) => ({ appId: m.applicationId, role: m.role as 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' })),
    functionalRoles: roleRows.map((r) => r.role.code as FunctionalRoleCode),
  };
}
