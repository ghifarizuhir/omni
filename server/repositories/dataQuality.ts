import { prisma } from '../db';

export type ModuleKey = 'cmdb' | 'event' | 'incident' | 'change' | 'problem' | 'service_request';

export interface ModuleSpec {
  appColumn: 'applicationId' | 'primaryApplicationId';
  idField: 'publicId' | 'id';
  label: string;
}

export const MODULES: Record<ModuleKey, ModuleSpec> = {
  cmdb:            { appColumn: 'primaryApplicationId', idField: 'publicId', label: 'CMDB' },
  event:           { appColumn: 'applicationId',        idField: 'publicId', label: 'Events' },
  incident:        { appColumn: 'applicationId',        idField: 'publicId', label: 'Incidents' },
  change:          { appColumn: 'applicationId',        idField: 'publicId', label: 'Changes' },
  problem:         { appColumn: 'applicationId',        idField: 'publicId', label: 'Problems' },
  service_request: { appColumn: 'applicationId',        idField: 'publicId', label: 'Service Requests' },
};

/**
 * Derive a CI's primaryApplicationId from its ownerTeamId.
 */
export async function deriveAppIdForCI(
  _tenantId: string,
  ownerTeamId: string | null,
): Promise<
  | { kind: 'backfill'; appId: string }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'orphan' }
> {
  if (!ownerTeamId) return { kind: 'orphan' };
  const rows = await prisma.applicationTeam.findMany({
    where: { teamId: ownerTeamId },
    select: { applicationId: true },
  });
  if (rows.length === 0) return { kind: 'orphan' };
  if (rows.length === 1) return { kind: 'backfill', appId: rows[0].applicationId };
  return { kind: 'ambiguous', candidates: rows.map((r) => r.applicationId) };
}

/**
 * Derive applicationId for Event/Incident from the affected-CI list.
 * Returns the first CI's primaryApplicationId, or orphan if no CI matches.
 */
export async function deriveAppIdFromCIs(
  tenantId: string,
  ciIds: string[],
): Promise<{ kind: 'backfill'; appId: string } | { kind: 'orphan' }> {
  if (ciIds.length === 0) return { kind: 'orphan' };
  const cis = await prisma.configurationItem.findMany({
    where: { tenantId, id: { in: ciIds } },
    select: { primaryApplicationId: true },
  });
  for (const ci of cis) {
    if (ci.primaryApplicationId) return { kind: 'backfill', appId: ci.primaryApplicationId };
  }
  return { kind: 'orphan' };
}
