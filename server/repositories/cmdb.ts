// CMDB repository — converts Prisma rows into the shapes the frontend `src/types`
// expects. The route layer should depend only on these functions, never on
// `prisma` directly, so the storage shape can evolve independently.

import type { ConfigurationItem, CIRelationship, CIAuditEntry } from '../../src/types';
import { prisma } from '../db';

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
  async listCIs(tenantId: string) {
    const rows = await prisma.configurationItem.findMany({ where: { tenantId } });
    return rows.map(toCI);
  },
  async getCI(tenantId: string, publicId: string) {
    const row = await prisma.configurationItem.findFirst({ where: { tenantId, publicId } });
    return row ? toCI(row) : null;
  },
  async listRelationships(tenantId: string) {
    const rows = await prisma.cIRelationship.findMany({ where: { tenantId } });
    return rows.map(toRel);
  },
  async listRelationshipsForCI(tenantId: string, ciId: string) {
    const rows = await prisma.cIRelationship.findMany({
      where: { tenantId, OR: [{ fromCiId: ciId }, { toCiId: ciId }] },
    });
    return rows.map(toRel);
  },
  async listAudit(tenantId: string, ciId?: string) {
    const rows = await prisma.cIAuditEntry.findMany({
      where: { tenantId, ...(ciId ? { ciId } : {}) },
      orderBy: { timestamp: 'desc' },
    });
    return rows.map(toAudit);
  },
};
