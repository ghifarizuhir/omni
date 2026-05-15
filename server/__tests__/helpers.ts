import request from 'supertest';
import type { Express } from 'express';
import { SESSION_COOKIE, hashPassword } from '../auth/session';
import { prisma } from '../db';
import { FUNCTIONAL_ROLE_DEFINITIONS } from '../constants/functionalRoles';

// Performs a login and returns the raw `Cookie` header value other requests
// can attach with `.set('Cookie', cookie)`.
export const login = async (app: Express, email: string, password: string): Promise<string> => {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('no set-cookie on login response');
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const sid = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`));
  if (!sid) throw new Error('session cookie not found');
  return sid.split(';')[0];
};

// Credentials match the dev seed (prisma/seed.ts): admin@omni.local / demo.
export const ADMIN_EMAIL = 'admin@omni.local';
export const ADMIN_PASSWORD = 'demo';

// ── Scoped-app fixture ────────────────────────────────────────────────────────

export interface ScopedAppFixture {
  appId: string;
  teamAId: string; // contributor
  teamBId: string; // outsider (not a member of appId)
  memberAUserId: string;     // member of teamA
  memberBUserId: string;     // member of teamB
  nocUserId: string;         // NOC_OPERATOR
  platformAdminUserId: string;
  /** Plain-text password for all fixture users — pass to login(). */
  password: string;
  /** Email pattern: `user-${tag}-${suffix}@scope.test` */
  emailOf: (suffix: 'member-a' | 'member-b' | 'noc' | 'admin') => string;
  cleanup: () => Promise<void>;
}

/**
 * Build an isolated org chain for scope tests:
 *   - one Application
 *   - two Teams (A = contributor, B = outsider)
 *   - 4 users: memberA, memberB, NOC, PlatformAdmin
 *
 * All four users are given a TenantMembership so login() works.
 * memberA/memberB get role-system-operator (cmdb.read + cmdb.write).
 * noc gets role-system-operator.
 * admin gets role-system-admin (full access including cmdb.write).
 */
export async function createScopedAppFixture(tag: string): Promise<ScopedAppFixture> {
  const FIXTURE_PASSWORD = 'scope-test-pw';

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' },
  });

  const div = await prisma.division.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_DIV_${tag}` } },
    update: {},
    create: { id: `div-${tag}`, tenantId: tenant.id, code: `SCOPE_DIV_${tag}`, name: `Div ${tag}` },
  });
  const dept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_DEPT_${tag}` } },
    update: {},
    create: { id: `dept-${tag}`, tenantId: tenant.id, divisionId: div.id, code: `SCOPE_DEPT_${tag}`, name: `Dept ${tag}` },
  });
  const teamA = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_TEAM_A_${tag}` } },
    update: {},
    create: { id: `team-a-${tag}`, tenantId: tenant.id, departmentId: dept.id, code: `SCOPE_TEAM_A_${tag}`, name: `Team A ${tag}` },
  });
  const teamB = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_TEAM_B_${tag}` } },
    update: {},
    create: { id: `team-b-${tag}`, tenantId: tenant.id, departmentId: dept.id, code: `SCOPE_TEAM_B_${tag}`, name: `Team B ${tag}` },
  });
  const app = await prisma.application.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_APP_${tag}` } },
    update: {},
    create: { id: `app-${tag}`, tenantId: tenant.id, code: `SCOPE_APP_${tag}`, name: `App ${tag}` },
  });
  await prisma.applicationTeam.upsert({
    where: { applicationId_teamId: { applicationId: app.id, teamId: teamA.id } },
    update: { role: 'CONTRIBUTOR' },
    create: { applicationId: app.id, teamId: teamA.id, role: 'CONTRIBUTOR' },
  });

  const pwHash = await hashPassword(FIXTURE_PASSWORD);

  async function makeUser(
    suffix: string,
    teamId: string | null,
    rbacRoleId: string,
  ): Promise<string> {
    const id = `user-${tag}-${suffix}`;
    const email = `${id}@scope.test`;
    await prisma.user.upsert({
      where: { id },
      update: { teamId },
      create: {
        id,
        email,
        name: `Scope ${suffix} ${tag}`,
        passwordHash: pwHash,
        teamId,
      },
    });
    // Ensure TenantMembership (required for login to succeed).
    const membership = await prisma.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: id } },
      update: {},
      create: { tenantId: tenant.id, userId: id },
    });
    // Attach RBAC role so requirePermission checks pass.
    await prisma.membershipRole.upsert({
      where: { membershipId_roleId: { membershipId: membership.id, roleId: rbacRoleId } },
      update: {},
      create: { membershipId: membership.id, roleId: rbacRoleId },
    });
    return id;
  }

  // role-system-operator has cmdb.read + cmdb.write; role-system-admin has everything.
  const memberA = await makeUser('member-a', teamA.id, 'role-system-operator');
  const memberB = await makeUser('member-b', teamB.id, 'role-system-operator');
  const noc     = await makeUser('noc',      teamB.id, 'role-system-operator');
  const admin   = await makeUser('admin',    teamB.id, 'role-system-admin');

  // Ensure functional roles exist (they are normally seeded by seed.prod.ts;
  // in test environments they may not yet be present).
  for (const code of ['NOC_OPERATOR', 'PLATFORM_ADMIN'] as const) {
    const def = FUNCTIONAL_ROLE_DEFINITIONS[code];
    await prisma.functionalRole.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: {},
      create: {
        id: `frole-${tenant.id}-${code.toLowerCase()}`,
        tenantId: tenant.id,
        code,
        name: def.name,
        description: def.description,
      },
    });
  }

  // Attach functional roles for noc + admin (scope policy uses these for bypass).
  const nocRole   = await prisma.functionalRole.findUniqueOrThrow({ where: { tenantId_code: { tenantId: tenant.id, code: 'NOC_OPERATOR' } } });
  const adminRole = await prisma.functionalRole.findUniqueOrThrow({ where: { tenantId_code: { tenantId: tenant.id, code: 'PLATFORM_ADMIN' } } });
  await prisma.userFunctionalRole.upsert({ where: { userId_functionalRoleId: { userId: noc,   functionalRoleId: nocRole.id   } }, update: {}, create: { userId: noc,   functionalRoleId: nocRole.id   } });
  await prisma.userFunctionalRole.upsert({ where: { userId_functionalRoleId: { userId: admin, functionalRoleId: adminRole.id } }, update: {}, create: { userId: admin, functionalRoleId: adminRole.id } });

  const emailOf = (suffix: 'member-a' | 'member-b' | 'noc' | 'admin') =>
    `user-${tag}-${suffix}@scope.test`;

  return {
    appId: app.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    memberAUserId: memberA,
    memberBUserId: memberB,
    nocUserId: noc,
    platformAdminUserId: admin,
    password: FIXTURE_PASSWORD,
    emailOf,
    cleanup: async () => {
      const userIds = [memberA, memberB, noc, admin];
      // Remove MembershipRole rows first (FK: membershipId → tenantMembership).
      const memberships = await prisma.tenantMembership.findMany({
        where: { userId: { in: userIds } },
        select: { id: true },
      });
      const membershipIds = memberships.map(m => m.id);
      await prisma.membershipRole.deleteMany({ where: { membershipId: { in: membershipIds } } });
      await prisma.tenantMembership.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userFunctionalRole.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.applicationTeam.deleteMany({ where: { applicationId: app.id } });
      await prisma.application.delete({ where: { id: app.id } }).catch(() => undefined);
      await prisma.team.delete({ where: { id: teamA.id } }).catch(() => undefined);
      await prisma.team.delete({ where: { id: teamB.id } }).catch(() => undefined);
      await prisma.department.delete({ where: { id: dept.id } }).catch(() => undefined);
      await prisma.division.delete({ where: { id: div.id } }).catch(() => undefined);
    },
  };
}
