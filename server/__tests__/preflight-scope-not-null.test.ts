import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { runPreflight } from '../../prisma/preflightScopeNotNull';
import { createScopedAppFixture, type ScopedAppFixture } from './helpers';

let fx: ScopedAppFixture;
let tenantId: string;

beforeAll(async () => {
  fx = await createScopedAppFixture('preflight');
  const t = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });
  tenantId = t.id;
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

describe('runPreflight', () => {
  it('returns clean=true when no orphan rows exist for the fixture tenant', async () => {
    const report = await runPreflight({ tenantId });
    expect(report.clean).toBe(true);
    expect(report.modules.every((m) => m.orphan === 0)).toBe(true);
  });

  it('always reports clean=true after NOT NULL promotion (Plan F)', async () => {
    // Since Plan F, primaryApplicationId/applicationId are NOT NULL in the DB.
    // The preflight script will always find 0 orphans — the constraint prevents them.
    const report = await runPreflight({ tenantId });
    expect(report.clean).toBe(true);
    expect(report.modules.every((m) => m.orphan === 0)).toBe(true);
  });
});
