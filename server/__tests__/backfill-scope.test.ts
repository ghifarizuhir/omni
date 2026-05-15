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
