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

  it('detects orphans and reports clean=false', async () => {
    // Create an orphan CI directly (no primaryApplicationId).
    await prisma.configurationItem.create({
      data: {
        id: 'ci-preflight-orphan',
        tenantId,
        publicId: 'CI-PREFLIGHT-ORPHAN',
        name: 'orphan',
        type: 'server',
        status: 'active',
        environment: 'prod',
        criticality: 'P3',
        ownerTeamId: fx.teamAId,
        primaryApplicationId: null,
        health: 'healthy',
        attributes: '{}',
        tags: '[]',
      },
    });
    const report = await runPreflight({ tenantId });
    expect(report.clean).toBe(false);
    expect(report.modules.find((m) => m.module === 'cmdb')?.orphan).toBe(1);
    await prisma.configurationItem.delete({ where: { id: 'ci-preflight-orphan' } });
  });

  it('--remediate creates Unassigned app and assigns orphans', async () => {
    await prisma.configurationItem.create({
      data: {
        id: 'ci-preflight-remediate',
        tenantId,
        publicId: 'CI-PREFLIGHT-REMEDIATE',
        name: 'orphan',
        type: 'server',
        status: 'active',
        environment: 'prod',
        criticality: 'P3',
        ownerTeamId: fx.teamAId,
        primaryApplicationId: null,
        health: 'healthy',
        attributes: '{}',
        tags: '[]',
      },
    });
    const report = await runPreflight({ tenantId, remediate: true });
    expect(report.clean).toBe(true);
    const row = await prisma.configurationItem.findUniqueOrThrow({
      where: { id: 'ci-preflight-remediate' },
    });
    const unassigned = await prisma.application.findFirstOrThrow({
      where: { tenantId, code: 'UNASSIGNED' },
    });
    expect(row.primaryApplicationId).toBe(unassigned.id);
    // Cleanup.
    await prisma.configurationItem.delete({ where: { id: 'ci-preflight-remediate' } });
    await prisma.application.delete({ where: { id: unassigned.id } });
  });
});
