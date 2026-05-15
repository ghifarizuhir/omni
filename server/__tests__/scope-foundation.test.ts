import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { prisma } from '../db';
import {
  FUNCTIONAL_ROLE_CODES,
  PLATFORM_ADMIN,
  NOC_OPERATOR,
  AUDITOR,
  type FunctionalRoleCode,
} from '../constants/functionalRoles';

const ROOT_TENANT_SLUG = (process.env.ROOT_TENANT_SLUG ?? 'default').trim();

async function getRootTenant() {
  return prisma.tenant.findUniqueOrThrow({ where: { slug: ROOT_TENANT_SLUG } });
}

describe('functional role codes', () => {
  it('exposes the three bypass roles as constants', () => {
    expect(PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(NOC_OPERATOR).toBe('NOC_OPERATOR');
    expect(AUDITOR).toBe('AUDITOR');
  });

  it('exposes them as a readonly tuple for iteration', () => {
    expect([...FUNCTIONAL_ROLE_CODES].sort()).toEqual(
      ['AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN'],
    );
  });

  it('the union type accepts only known codes', () => {
    const ok: FunctionalRoleCode = 'PLATFORM_ADMIN';
    expect(ok).toBeDefined();
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('functional roles seeded', () => {
  it('every bypass role exists for the root tenant', async () => {
    const tenant = await getRootTenant();
    const rows = await prisma.functionalRole.findMany({
      where: { tenantId: tenant.id, code: { in: [...FUNCTIONAL_ROLE_CODES] } },
    });
    const codes = rows.map((r) => r.code).sort();
    expect(codes).toEqual(['AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN']);
  });
});

describe('ApplicationTeam.role default', () => {
  const TEST_APP_ID = 'app-scope-foundation-test';
  const TEST_DEPT_ID = 'dept-scope-foundation-test';
  const TEST_TEAM_ID = 'team-scope-foundation-test';
  const TEST_DIV_ID = 'div-scope-foundation-test';

  beforeAll(async () => {
    const tenant = await getRootTenant();

    // Ephemeral division → department → team chain so the test owns its data.
    await prisma.division.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SCOPE_TEST_DIV' } },
      update: {},
      create: { id: TEST_DIV_ID, tenantId: tenant.id, code: 'SCOPE_TEST_DIV', name: 'Scope Test Div' },
    });
    await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SCOPE_TEST_DEPT' } },
      update: {},
      create: {
        id: TEST_DEPT_ID,
        tenantId: tenant.id,
        divisionId: TEST_DIV_ID,
        code: 'SCOPE_TEST_DEPT',
        name: 'Scope Test Dept',
      },
    });
    await prisma.team.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SCOPE_TEST_TEAM' } },
      update: {},
      create: {
        id: TEST_TEAM_ID,
        tenantId: tenant.id,
        departmentId: TEST_DEPT_ID,
        code: 'SCOPE_TEST_TEAM',
        name: 'Scope Test Team',
      },
    });
    await prisma.application.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'SCOPE_TEST_APP' } },
      update: {},
      create: { id: TEST_APP_ID, tenantId: tenant.id, code: 'SCOPE_TEST_APP', name: 'Scope Test App' },
    });
  });

  afterAll(async () => {
    await prisma.applicationTeam
      .deleteMany({ where: { applicationId: TEST_APP_ID } })
      .catch(() => undefined);
    await prisma.application.delete({ where: { id: TEST_APP_ID } }).catch(() => undefined);
    await prisma.team.delete({ where: { id: TEST_TEAM_ID } }).catch(() => undefined);
    await prisma.department.delete({ where: { id: TEST_DEPT_ID } }).catch(() => undefined);
    await prisma.division.delete({ where: { id: TEST_DIV_ID } }).catch(() => undefined);
  });

  it('defaults to CONTRIBUTOR when not specified', async () => {
    await prisma.applicationTeam
      .delete({
        where: { applicationId_teamId: { applicationId: TEST_APP_ID, teamId: TEST_TEAM_ID } },
      })
      .catch(() => undefined);

    const row = await prisma.applicationTeam.create({
      data: { applicationId: TEST_APP_ID, teamId: TEST_TEAM_ID },
    });

    expect(row.role).toBe('CONTRIBUTOR');
  });
});
