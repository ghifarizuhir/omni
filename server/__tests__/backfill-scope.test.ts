import { afterAll, describe, expect, it } from 'vitest';
import { MODULES, deriveAppIdForCI } from '../repositories/dataQuality';
import { prisma } from '../db';

describe('dataQuality MODULES dispatcher', () => {
  it('exposes the 6 scoped modules with table + column metadata', () => {
    expect(Object.keys(MODULES).sort()).toEqual(
      ['change', 'cmdb', 'event', 'incident', 'problem', 'service_request'],
    );
    expect(MODULES.cmdb.appColumn).toBe('primaryApplicationId');
    expect(MODULES.event.appColumn).toBe('applicationId');
  });
});

describe('deriveAppIdForCI', () => {
  it('returns orphan when ownerTeamId is null', async () => {
    const result = await deriveAppIdForCI('tenant-demo', null);
    expect(result).toEqual({ kind: 'orphan' });
  });
});

afterAll(async () => { await prisma.$disconnect(); });

import { runBackfill } from '../../prisma/backfillAppScope';
import { createScopedAppFixture } from './helpers';

describe('runBackfill — cmdb', () => {
  // Since Plan F (NOT NULL promotion), the DB rejects null primaryApplicationId.
  // These tests verify the alreadyScoped branch still works; the orphan/ambiguous
  // branches are no longer reachable via normal Prisma inserts.

  it('counts already-scoped CIs correctly', async () => {
    const fx = await createScopedAppFixture('backfill-cmdb');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });

    const [baseline] = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: false });

    await prisma.configurationItem.create({
      data: {
        id: 'ci-bf-scoped', tenantId: tenant.id, publicId: 'CI-BF-SCOPED',
        name: 'ci-bf-scoped', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
        ownerTeamId: fx.teamAId, primaryApplicationId: fx.appId,
        health: 'healthy', attributes: '{}', tags: '[]',
      },
    });

    const [report] = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: false });
    expect(report.alreadyScoped - baseline.alreadyScoped).toBe(1);
    expect(report.backfilled - baseline.backfilled).toBe(0);

    await prisma.configurationItem.delete({ where: { id: 'ci-bf-scoped' } });
    await fx.cleanup();
  });
});
