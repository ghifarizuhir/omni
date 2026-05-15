import type { PrismaClient } from '@prisma/client';
import type { ScopeContext } from './context';
import { ScopeViolationError } from './errors';
import { POLICY } from './policy';
import { cmdbRepo } from '../repositories/cmdb';
import { eventsRepo } from '../repositories/events';
import { incidentsRepo } from '../repositories/incidents';

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

export interface IncidentsScope {
  list(filters: Parameters<typeof incidentsRepo.list>[1]): Promise<Awaited<ReturnType<typeof incidentsRepo.list>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof incidentsRepo.get>>>;
  comments(incidentId: string): Promise<Awaited<ReturnType<typeof incidentsRepo.comments>>>;
  timeline(incidentId: string): Promise<Awaited<ReturnType<typeof incidentsRepo.timeline>>>;
  addComment(
    incidentId: string,
    input: Parameters<typeof incidentsRepo.addComment>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.addComment>>; scopeMode: ScopeMode } | null>;
  setStatus(
    publicId: string,
    input: Parameters<typeof incidentsRepo.setStatus>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.setStatus>>; scopeMode: ScopeMode } | null>;
  resolve(
    publicId: string,
    input: Parameters<typeof incidentsRepo.resolve>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.resolve>>; scopeMode: ScopeMode } | null>;
  promoteMajor(
    publicId: string,
    input: Parameters<typeof incidentsRepo.promoteMajor>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.promoteMajor>>; scopeMode: ScopeMode } | null>;
  assign(
    publicId: string,
    input: Parameters<typeof incidentsRepo.assign>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.assign>>; scopeMode: ScopeMode } | null>;
  setLinks(
    publicId: string,
    input: Parameters<typeof incidentsRepo.setLinks>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.setLinks>>; scopeMode: ScopeMode } | null>;
  addWatcher(
    incidentId: string,
    input: Parameters<typeof incidentsRepo.addWatcher>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.addWatcher>>; scopeMode: ScopeMode } | null>;
  removeWatcher(
    incidentId: string,
    userId: string,
    actorId: string,
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.removeWatcher>>; scopeMode: ScopeMode } | null>;
  update(
    publicId: string,
    input: Parameters<typeof incidentsRepo.update>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.update>>; scopeMode: ScopeMode } | null>;
  standDown(
    publicId: string,
    input: Parameters<typeof incidentsRepo.standDown>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.standDown>>; scopeMode: ScopeMode } | null>;
  postComms(
    publicId: string,
    input: Parameters<typeof incidentsRepo.postComms>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.postComms>>; scopeMode: ScopeMode } | null>;
}

export interface ScopedDb {
  cmdb: CmdbScope;
  events: EventsScope;
  incidents: IncidentsScope;
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

  // ── Incidents scope ────────────────────────────────────────────────────────

  const isIncidentReadBypass = POLICY.incident.readBypass.some((r) => ctx.functionalRoles.includes(r));

  function incidentCanWrite(appId: string | null, opts: { allowNoc?: boolean } = { allowNoc: true }): boolean {
    if (isPlatformAdmin) return true;
    if (opts.allowNoc && POLICY.incident.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    if (appId === null) return false;
    return writableApps.has(appId);
  }

  function incidentScopeMode(appId: string | null, opts: { allowNoc?: boolean } = { allowNoc: true }): ScopeMode {
    if (appId === null) return 'legacy';
    if (isPlatformAdmin) return 'admin';
    if (opts.allowNoc && POLICY.incident.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  async function loadIncidentAppId(publicId: string): Promise<string | null | undefined> {
    const raw = await prisma.incident.findFirst({
      where: { tenantId: ctx.tenantId, publicId },
      select: { applicationId: true },
    });
    return raw ? (raw.applicationId ?? null) : undefined;
  }

  async function loadIncidentAppIdById(incidentId: string): Promise<string | null | undefined> {
    const raw = await prisma.incident.findFirst({
      where: { tenantId: ctx.tenantId, id: incidentId },
      select: { applicationId: true },
    });
    return raw ? (raw.applicationId ?? null) : undefined;
  }

  const incidents: IncidentsScope = {
    async list(filters) {
      const rows = await incidentsRepo.list(ctx.tenantId, filters);
      if (isIncidentReadBypass) return rows;
      const readable = new Set([...writableApps, ...ownerApps]);
      return (rows as { applicationId?: string | null }[]).filter(
        (i) => i.applicationId == null || readable.has(i.applicationId!),
      ) as typeof rows;
    },
    get: (publicId) => incidentsRepo.get(ctx.tenantId, publicId),
    comments: (incidentId) => incidentsRepo.comments(ctx.tenantId, incidentId),
    timeline: (incidentId) => incidentsRepo.timeline(ctx.tenantId, incidentId),

    async addComment(incidentId, input) {
      const appId = await loadIncidentAppIdById(incidentId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.addComment(ctx.tenantId, incidentId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async setStatus(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.setStatus(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async resolve(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId, { allowNoc: false })) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.resolve(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId, { allowNoc: false }) };
    },

    async promoteMajor(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.promoteMajor(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async assign(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.assign(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async setLinks(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.setLinks(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async addWatcher(incidentId, input) {
      const appId = await loadIncidentAppIdById(incidentId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.addWatcher(ctx.tenantId, incidentId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async removeWatcher(incidentId, userId, actorId) {
      const appId = await loadIncidentAppIdById(incidentId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.removeWatcher(ctx.tenantId, incidentId, userId, actorId);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async update(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.update(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async standDown(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.standDown(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },

    async postComms(publicId, input) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !incidentCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
      }
      const result = await incidentsRepo.postComms(ctx.tenantId, publicId, input);
      return { result, scopeMode: incidentScopeMode(appId) };
    },
  };

  return { cmdb, events, incidents };
}
