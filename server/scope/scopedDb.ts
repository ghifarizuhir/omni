import type { PrismaClient } from '@prisma/client';
import type { ScopeContext } from './context';
import { ScopeViolationError } from './errors';
import { POLICY } from './policy';
import { cmdbRepo } from '../repositories/cmdb';
import { eventsRepo } from '../repositories/events';

export type ScopeMode = 'member' | 'noc' | 'owner' | 'admin' | 'legacy' | 'bypass';

export interface CmdbScope {
  listCIs(): Promise<Awaited<ReturnType<typeof cmdbRepo.listCIs>>>;
  getCI(publicId: string): Promise<Awaited<ReturnType<typeof cmdbRepo.getCI>>>;
  listRelationships(): Promise<Awaited<ReturnType<typeof cmdbRepo.listRelationships>>>;
  listRelationshipsForCI(ciId: string): Promise<Awaited<ReturnType<typeof cmdbRepo.listRelationshipsForCI>>>;
  listAudit(ciId?: string): Promise<Awaited<ReturnType<typeof cmdbRepo.listAudit>>>;
  /**
   * Update a CI. Throws ScopeViolationError if the caller cannot write
   * the CI's primaryApplicationId. Returns null when the CI does not exist
   * (mirrors cmdbRepo.updateCI behaviour).
   */
  updateCI(publicId: string, patch: Parameters<typeof cmdbRepo.updateCI>[2]): Promise<{ result: Awaited<ReturnType<typeof cmdbRepo.updateCI>>; scopeMode: ScopeMode } | null>;
  canWriteApp(appId: string | null): boolean;
  resolveScopeMode(appId: string | null): ScopeMode | null;
}

export interface EventsScope {
  list(filter: Parameters<typeof eventsRepo.list>[1]): Promise<Awaited<ReturnType<typeof eventsRepo.list>>>;
  dashboardStats(): Promise<Awaited<ReturnType<typeof eventsRepo.dashboardStats>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof eventsRepo.get>>>;
  setStatus(
    publicId: string,
    patch: { status: Parameters<typeof eventsRepo.setStatus>[2]['status']; actorId: string; note?: string },
  ): Promise<{ result: Awaited<ReturnType<typeof eventsRepo.setStatus>>; scopeMode: ScopeMode } | null>;
  ingest(
    input: Parameters<typeof eventsRepo.ingest>[1],
  ): Promise<{ id: string; publicId: string; scopeMode: ScopeMode }>;
}

export interface ScopedDb {
  cmdb: CmdbScope;
  events: EventsScope;
}

export function buildScopedDb(prisma: PrismaClient, ctx: ScopeContext): ScopedDb {
  const isPlatformAdmin = ctx.functionalRoles.includes('PLATFORM_ADMIN');

  const writableApps = new Set(
    ctx.appMemberships
      .filter((m) => m.role === 'OWNER' || m.role === 'CONTRIBUTOR')
      .map((m) => m.appId),
  );
  const ownerApps = new Set(
    ctx.appMemberships.filter((m) => m.role === 'OWNER').map((m) => m.appId),
  );

  function canWriteApp(appId: string | null): boolean {
    if (isPlatformAdmin) return true;
    if (appId === null) return false; // only PLATFORM_ADMIN may write null
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function resolveScopeMode(appId: string | null): ScopeMode | null {
    if (!canWriteApp(appId)) return null;
    if (isPlatformAdmin) return 'admin';
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  const cmdb: CmdbScope = {
    listCIs: () => cmdbRepo.listCIs(ctx.tenantId),
    getCI: (publicId) => cmdbRepo.getCI(ctx.tenantId, publicId),
    listRelationships: () => cmdbRepo.listRelationships(ctx.tenantId),
    listRelationshipsForCI: (ciId) => cmdbRepo.listRelationshipsForCI(ctx.tenantId, ciId),
    listAudit: (ciId) => cmdbRepo.listAudit(ctx.tenantId, ciId),
    async updateCI(publicId, patch) {
      // Fetch the raw row to get primaryApplicationId (not mapped by cmdbRepo.getCI).
      const raw = await prisma.configurationItem.findFirst({
        where: { tenantId: ctx.tenantId, publicId },
        select: { primaryApplicationId: true },
      });
      if (!raw) return null;
      const appId = raw.primaryApplicationId ?? null;
      // NULL appId is legacy/unbackfilled — skip enforcement.
      if (appId !== null && !canWriteApp(appId)) {
        throw new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: appId });
      }
      // appId === null → legacy/unbackfilled row, no scope to assign.
      const mode: ScopeMode = appId === null ? 'legacy' : (resolveScopeMode(appId) ?? 'admin');
      const result = await cmdbRepo.updateCI(ctx.tenantId, publicId, patch);
      return { result, scopeMode: mode };
    },
    canWriteApp,
    resolveScopeMode,
  };

  const isEventReadBypass = POLICY.event.readBypass.some((r) => ctx.functionalRoles.includes(r));

  function eventCanWrite(appId: string | null): boolean {
    if (isPlatformAdmin) return true;
    if (appId === null) return false;
    if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function eventScopeMode(appId: string | null): ScopeMode {
    if (isPlatformAdmin) return 'admin';
    if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  const events: EventsScope = {
    async list(filter) {
      const rows = await eventsRepo.list(ctx.tenantId, filter);
      if (isEventReadBypass) return rows;
      // Post-filter: keep legacy (null applicationId) or writable/owned apps.
      return rows.filter((e) => {
        const appId = (e as { applicationId?: string | null }).applicationId ?? null;
        if (appId === null) return true;
        return writableApps.has(appId) || ownerApps.has(appId);
      });
    },
    dashboardStats: () => eventsRepo.dashboardStats(ctx.tenantId),
    get: (publicId) => eventsRepo.get(ctx.tenantId, publicId),
    async setStatus(publicId, patch) {
      const raw = await prisma.event.findFirst({
        where: { tenantId: ctx.tenantId, publicId },
        select: { applicationId: true },
      });
      if (!raw) return null;
      const appId = raw.applicationId ?? null;
      if (appId !== null && !eventCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'event', action: 'update', applicationId: appId });
      }
      const mode: ScopeMode = appId === null ? 'legacy' : eventScopeMode(appId);
      const result = await eventsRepo.setStatus(ctx.tenantId, publicId, patch);
      return { result, scopeMode: mode };
    },
    async ingest(input) {
      const { id, publicId } = await eventsRepo.ingest(ctx.tenantId, input);
      return { id, publicId, scopeMode: 'legacy' };
    },
  };

  return { cmdb, events };
}
