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
  it('assigns CI.primaryApplicationId when team has exactly one app, ambiguous when >1, orphan when 0', async () => {
    const fx = await createScopedAppFixture('backfill-cmdb');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });

    // Make teamA member of a second app → ambiguous when CI ownerTeamId = teamA.
    const secondApp = await prisma.application.create({
      data: { id: 'app-backfill-second', tenantId: tenant.id, code: 'BF_SECOND', name: 'Second' },
    });
    await prisma.applicationTeam.create({ data: { applicationId: secondApp.id, teamId: fx.teamAId, role: 'CONTRIBUTOR' } });

    // Capture baseline before our fixtures to tolerate pre-existing seed data.
    const [baseline] = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: false });

    // teamB has 0 apps → orphan.
    const made: string[] = [];
    for (const [id, owner, app] of [
      ['ci-bf-unique', fx.teamBId, null],       // orphan
      ['ci-bf-amb', fx.teamAId, null],          // ambiguous
      ['ci-bf-scoped', fx.teamAId, fx.appId],   // alreadyScoped
    ] as const) {
      await prisma.configurationItem.create({
        data: {
          id, tenantId: tenant.id, publicId: id.toUpperCase(),
          name: id, type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
          ownerTeamId: owner!, primaryApplicationId: app,
          health: 'healthy', attributes: '{}', tags: '[]',
        },
      });
      made.push(id);
    }

    const [report] = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: true });

    expect(report.alreadyScoped - baseline.alreadyScoped).toBe(1);
    expect(report.orphan - baseline.orphan).toBe(1);
    expect(report.ambiguous - baseline.ambiguous).toBe(1);
    expect(report.backfilled - baseline.backfilled).toBe(0);

    const ambRow = await prisma.configurationItem.findUniqueOrThrow({ where: { id: 'ci-bf-amb' } });
    expect(ambRow.primaryApplicationId).toBeNull();

    await prisma.configurationItem.deleteMany({ where: { id: { in: made } } });
    await prisma.applicationTeam.deleteMany({ where: { applicationId: secondApp.id } });
    await prisma.application.delete({ where: { id: secondApp.id } });
    await fx.cleanup();
  });

  it('actually writes when team has exactly one app', async () => {
    const fx = await createScopedAppFixture('backfill-cmdb-write');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });

    await prisma.configurationItem.create({
      data: {
        id: 'ci-bf-write', tenantId: tenant.id, publicId: 'CI-BF-WRITE',
        name: 'will be backfilled', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
        ownerTeamId: fx.teamAId, primaryApplicationId: null,
        health: 'healthy', attributes: '{}', tags: '[]',
      },
    });
    const [report] = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: true });
    expect(report.backfilled).toBe(1);
    const row = await prisma.configurationItem.findUniqueOrThrow({ where: { id: 'ci-bf-write' } });
    expect(row.primaryApplicationId).toBe(fx.appId);
    await prisma.configurationItem.delete({ where: { id: 'ci-bf-write' } });
    await fx.cleanup();
  });
});
