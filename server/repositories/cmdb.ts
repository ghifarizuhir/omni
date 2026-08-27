// CMDB repository — converts Prisma rows into the shapes the frontend `src/types`
// expects. The route layer should depend only on these functions, never on
// `prisma` directly, so the storage shape can evolve independently.

import type { ConfigurationItem, CIRelationship, CIAuditEntry } from '../../src/types';
import { prisma } from '../db';
import type { UpdateCIInput } from '../../src/shared/schemas/ci';

const parseTags = (s: string): string[] => {
  try { return JSON.parse(s); } catch { return []; }
};
const parseJson = <T,>(s: string | null, fallback: T): T => {
  if (s == null) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
};

type CIRow = Awaited<ReturnType<typeof prisma.configurationItem.findMany>>[number];
type CIRelRow = Awaited<ReturnType<typeof prisma.cIRelationship.findMany>>[number];
type CIAuditRow = Awaited<ReturnType<typeof prisma.cIAuditEntry.findMany>>[number];

const toCI = (row: CIRow): ConfigurationItem => ({
  id: row.id,
  publicId: row.publicId,
  name: row.name,
  type: row.type as ConfigurationItem['type'],
  status: row.status as ConfigurationItem['status'],
  environment: row.environment as ConfigurationItem['environment'],
  criticality: row.criticality as ConfigurationItem['criticality'],
  ownerId: row.ownerId ?? undefined,
  ownerTeamId: row.ownerTeamId,
  serviceId: row.serviceId ?? undefined,
  health: row.health as ConfigurationItem['health'],
  attributes: parseJson(row.attributes, {} as ConfigurationItem['attributes']),
  tags: parseTags(row.tags),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  lastDiscoveredAt: row.lastDiscoveredAt?.toISOString(),
  openIncidentCount: row.openIncidentCount,
  recentChangeCount: row.recentChangeCount,
  monitoringRuleCount: row.monitoringRuleCount,
});

const toRel = (row: CIRelRow): CIRelationship => ({
  id: row.id,
  fromCiId: row.fromCiId,
  toCiId: row.toCiId,
  type: row.type as CIRelationship['type'],
  description: row.description ?? undefined,
  createdAt: row.createdAt.toISOString(),
});

const toAudit = (row: CIAuditRow): CIAuditEntry => ({
  id: row.id,
  ciId: row.ciId,
  ciPublicId: row.ciPublicId,
  ciName: row.ciName,
  action: row.action as CIAuditEntry['action'],
  actorId: row.actorId,
  actorName: row.actorName,
  actorType: row.actorType as CIAuditEntry['actorType'],
  field: row.field ?? undefined,
  before: parseJson<CIAuditEntry['before']>(row.beforeValue, null),
  after: parseJson<CIAuditEntry['after']>(row.afterValue, null),
  source: row.source as CIAuditEntry['source'],
  description: row.description ?? undefined,
  timestamp: row.timestamp.toISOString(),
});

export const cmdbRepo = {
  async listCIs(tenantId: string, pagination: { limit: number; offset: number } = { limit: 50, offset: 0 }) {
    const rows = await prisma.configurationItem.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' }, take: pagination.limit, skip: pagination.offset });
    return rows.map(toCI);
  },
  async getCI(tenantId: string, publicId: string) {
    const row = await prisma.configurationItem.findFirst({ where: { tenantId, publicId } });
    return row ? toCI(row) : null;
  },
  async listRelationships(
    tenantId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const rows = await prisma.cIRelationship.findMany({ where: { tenantId }, take: pagination.limit, skip: pagination.offset });
    return rows.map(toRel);
  },
  async listRelationshipsForCI(
    tenantId: string,
    ciId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const rows = await prisma.cIRelationship.findMany({
      where: { tenantId, OR: [{ fromCiId: ciId }, { toCiId: ciId }] },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return rows.map(toRel);
  },
  // M6.11 (B1.3) — Partial update of a ConfigurationItem. CI lives in typed
  // Prisma columns, so we update the columns the schema accepts; `attributes`
  // and `tags` are JSON-serialized on the way in. Returns `{ before, after,
  // internalId }` so the route can emit an audit log without re-reading.
  async updateCI(
    tenantId: string,
    publicId: string,
    patch: UpdateCIInput,
  ): Promise<{ before: ConfigurationItem; after: ConfigurationItem; internalId: string } | null> {
    const row = await prisma.configurationItem.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = toCI(row);

    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.environment !== undefined) data.environment = patch.environment;
    if (patch.criticality !== undefined) data.criticality = patch.criticality;
    if (patch.health !== undefined) data.health = patch.health;
    if (patch.ownerId !== undefined) data.ownerId = patch.ownerId;
    if (patch.ownerTeamId !== undefined) data.ownerTeamId = patch.ownerTeamId;
    if (patch.serviceId !== undefined) data.serviceId = patch.serviceId;
    if (patch.tags !== undefined) data.tags = JSON.stringify(patch.tags);
    if (patch.attributes !== undefined) data.attributes = JSON.stringify(patch.attributes);

    const [updated] = await prisma.$transaction([
      prisma.configurationItem.update({ where: { id: row.id }, data }),
    ]);
    return { before, after: toCI(updated), internalId: row.id };
  },

  async listAudit(
    tenantId: string,
    ciId?: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const rows = await prisma.cIAuditEntry.findMany({
      where: { tenantId, ...(ciId ? { ciId } : {}) },
      orderBy: { timestamp: 'desc' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return rows.map(toAudit);
  },
};
