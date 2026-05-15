import { describe, expect, it, afterAll } from 'vitest';
import { prisma } from '../db';
import {
  FUNCTIONAL_ROLE_CODES,
  PLATFORM_ADMIN,
  NOC_OPERATOR,
  AUDITOR,
  type FunctionalRoleCode,
} from '../constants/functionalRoles';

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
    const tenant = await prisma.tenant.findFirstOrThrow();
    const rows = await prisma.functionalRole.findMany({
      where: { tenantId: tenant.id, code: { in: [...FUNCTIONAL_ROLE_CODES] } },
    });
    const codes = rows.map((r) => r.code).sort();
    expect(codes).toEqual(['AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN']);
  });
});
