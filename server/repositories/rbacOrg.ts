import { prisma } from '../db';
import type {
  DivisionInput, DepartmentInput, TeamInput, ApplicationInput,
  FunctionalRoleInput, RbacUserInput,
} from '../lib/validation/rbac';

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listDivisions(tenantId: string) {
  return prisma.division.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
}

export async function listDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, divisionId: true, code: true, name: true },
  });
}

export async function listTeams(tenantId: string) {
  return prisma.team.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, departmentId: true, code: true, name: true },
  });
}

export async function listApplications(tenantId: string) {
  const apps = await prisma.application.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    include: { teams: { select: { teamId: true } } },
  });
  return apps.map(a => ({
    id: a.id,
    code: a.code,
    name: a.name,
    criticality: a.criticality,
    ownerTeamId: a.teams[0]?.teamId ?? null,
    teams: a.teams.map(t => t.teamId),
  }));
}

export async function listFunctionalRoles(tenantId: string) {
  return prisma.functionalRole.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, description: true },
  });
}

export async function listRbacUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperadmin: true },
        { divisionId: { not: null } },
        { departmentId: { not: null } },
        { teamId: { not: null } },
        { functionalRoles: { some: {} } },
      ],
    },
    select: {
      id: true, email: true, name: true,
      isSuperadmin: true, level: true,
      divisionId: true, departmentId: true, teamId: true,
      functionalRoles: { select: { role: { select: { code: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isSuperadmin: u.isSuperadmin,
    level: u.level,
    divisionId: u.divisionId,
    departmentId: u.departmentId,
    teamId: u.teamId,
    functionalRoles: u.functionalRoles.map(f => f.role.code),
    active: true,
  }));
  void tenantId; // tenantId reserved for future multi-tenant filtering on User
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function upsertDivision(tenantId: string, id: string, input: DivisionInput) {
  return prisma.division.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name },
    update: { code: input.code, name: input.name },
  });
}

export async function deleteDivision(id: string) {
  await prisma.division.delete({ where: { id } });
}

export async function upsertDepartment(tenantId: string, id: string, input: DepartmentInput) {
  const div = await prisma.division.findFirst({ where: { id: input.divisionId, tenantId } });
  if (!div) throw new Error('Unknown divisionId');
  return prisma.department.upsert({
    where: { id },
    create: { id, tenantId, divisionId: input.divisionId, code: input.code, name: input.name },
    update: { divisionId: input.divisionId, code: input.code, name: input.name },
  });
}

export async function deleteDepartment(id: string) {
  await prisma.department.delete({ where: { id } });
}

export async function upsertTeam(tenantId: string, id: string, input: TeamInput) {
  const dept = await prisma.department.findFirst({ where: { id: input.departmentId, tenantId } });
  if (!dept) throw new Error('Unknown departmentId');
  return prisma.team.upsert({
    where: { id },
    create: { id, tenantId, departmentId: input.departmentId, code: input.code, name: input.name },
    update: { departmentId: input.departmentId, code: input.code, name: input.name },
  });
}

export async function deleteTeam(id: string) {
  await prisma.team.delete({ where: { id } });
}

export async function upsertApplication(tenantId: string, id: string, input: ApplicationInput) {
  // Plan D: memberships are managed exclusively via /api/v1/applications/:appId/teams.
  // This function only handles application metadata (code, name, criticality).
  // The `teams` and `ownerTeamId` fields on ApplicationInput are accepted for
  // backwards compatibility with existing callers but intentionally ignored.
  await prisma.application.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name, criticality: input.criticality ?? null },
    update: { code: input.code, name: input.name, criticality: input.criticality ?? null },
  });
  return id;
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({ where: { id } });
}

export async function upsertFunctionalRole(tenantId: string, id: string, input: FunctionalRoleInput) {
  return prisma.functionalRole.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name, description: input.description ?? null },
    update: { code: input.code, name: input.name, description: input.description ?? null },
  });
}

export async function deleteFunctionalRole(id: string) {
  await prisma.functionalRole.delete({ where: { id } });
}

export async function upsertRbacUser(tenantId: string, id: string, input: RbacUserInput) {
  return prisma.$transaction(async (tx) => {
    const existingByEmail = await tx.user.findUnique({ where: { email: input.email } });
    const targetId = existingByEmail?.id ?? id;
    const user = await tx.user.upsert({
      where: { id: targetId },
      create: {
        id: targetId, email: input.email, name: input.name,
        isSuperadmin: input.isSuperadmin,
        level: input.level ?? null,
        divisionId: input.divisionId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
      },
      update: {
        email: input.email, name: input.name,
        isSuperadmin: input.isSuperadmin,
        level: input.level ?? null,
        divisionId: input.divisionId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
      },
    });
    await tx.userFunctionalRole.deleteMany({ where: { userId: user.id } });
    for (const code of input.functionalRoles) {
      const fr = await tx.functionalRole.findFirst({ where: { tenantId, code } });
      if (!fr) throw new Error(`Unknown functional role code: ${code}`);
      await tx.userFunctionalRole.create({ data: { userId: user.id, functionalRoleId: fr.id } });
    }
    await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      create: { tenantId, userId: user.id },
      update: {},
    });
    return user;
  });
}

export async function deleteRbacUser(id: string) {
  await prisma.user.delete({ where: { id } });
}
