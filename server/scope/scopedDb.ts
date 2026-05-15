import type { PrismaClient } from '@prisma/client';
import type { ScopeContext } from './context';
import { ScopeViolationError } from './errors';
import { POLICY } from './policy';
import { cmdbRepo } from '../repositories/cmdb';
import { eventsRepo, monitoringRepo } from '../repositories/events';
import { incidentsRepo } from '../repositories/incidents';
import { problemsRepo, changesRepo, releasesRepo, requestsRepo } from '../repositories/docs';
import { ensureUnassignedApp } from '../../prisma/preflightScopeNotNull';

export type ScopeMode = 'member' | 'noc' | 'owner' | 'admin';

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
  canWriteApp(appId: string): boolean;
  resolveScopeMode(appId: string): ScopeMode | null;
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

export interface MonitoringScope {
  // rules
  listRules(): Promise<Awaited<ReturnType<typeof monitoringRepo.listRules>>>;
  getRule(publicId: string): Promise<Awaited<ReturnType<typeof monitoringRepo.getRule>>>;
  createRule(input: Parameters<typeof monitoringRepo.createRule>[1], actor: Parameters<typeof monitoringRepo.createRule>[2]): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.createRule>>; scopeMode: ScopeMode }>;
  updateRule(publicId: string, input: Parameters<typeof monitoringRepo.updateRule>[2]): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.updateRule>>; scopeMode: ScopeMode } | null>;
  deleteRule(publicId: string): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.deleteRule>>; scopeMode: ScopeMode } | null>;
  // routes
  listRoutes(): Promise<Awaited<ReturnType<typeof monitoringRepo.listRoutes>>>;
  getRoute(publicId: string): Promise<Awaited<ReturnType<typeof monitoringRepo.getRoute>>>;
  createRoute(input: Parameters<typeof monitoringRepo.createRoute>[1]): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.createRoute>>; scopeMode: ScopeMode }>;
  updateRoute(publicId: string, input: Parameters<typeof monitoringRepo.updateRoute>[2]): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.updateRoute>>; scopeMode: ScopeMode } | null>;
  deleteRoute(publicId: string): Promise<{ result: Awaited<ReturnType<typeof monitoringRepo.deleteRoute>>; scopeMode: ScopeMode } | null>;
}

export interface ProblemsScope {
  list(): Promise<Awaited<ReturnType<typeof problemsRepo.list>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof problemsRepo.get>>>;
}

export interface ChangesScope {
  list(): Promise<Awaited<ReturnType<typeof changesRepo.list>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof changesRepo.get>>>;
  create(
    requester: { id: string; name: string },
    input: Omit<Parameters<typeof changesRepo.create>[2], 'applicationId'> & { applicationId?: string | null },
  ): Promise<{ result: Awaited<ReturnType<typeof changesRepo.create>>; scopeMode: ScopeMode }>;
  cancel(publicId: string, reason: string): Promise<{ result: Awaited<ReturnType<typeof changesRepo.cancel>>; scopeMode: ScopeMode } | null>;
  reschedule(
    publicId: string,
    input: Parameters<typeof changesRepo.reschedule>[2],
    actor: { id: string; name: string },
  ): Promise<{ result: Awaited<ReturnType<typeof changesRepo.reschedule>>; scopeMode: ScopeMode } | null>;
  setTechnicalAssessment(
    publicId: string,
    reviewer: { id: string; name: string },
    assessment: Parameters<typeof changesRepo.setTechnicalAssessment>[2],
  ): Promise<{ result: Awaited<ReturnType<typeof changesRepo.setTechnicalAssessment>>; scopeMode: ScopeMode } | null>;
}

export interface ReleasesScope {
  list(): Promise<Awaited<ReturnType<typeof releasesRepo.list>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof releasesRepo.get>>>;
}

export interface ServiceRequestsScope {
  list(): Promise<Awaited<ReturnType<typeof requestsRepo.list>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof requestsRepo.get>>>;
  listComments(publicId: string): Promise<Awaited<ReturnType<typeof requestsRepo.listComments>>>;
  decideStep(
    publicId: string,
    stepId: string,
    actor: { id: string; name: string },
    decision: 'approved' | 'rejected',
    note?: string,
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.decideStep>>; scopeMode: ScopeMode } | null>;
  appendComment(
    publicId: string,
    author: { id: string; name: string },
    body: string,
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.appendComment>>; scopeMode: ScopeMode } | null>;
  cancel(
    publicId: string,
    reason: string,
    actor: { id: string; name: string },
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.cancel>>; scopeMode: ScopeMode } | null>;
  reassignStep(
    publicId: string,
    stepId: string,
    assignee: { id: string; name?: string },
    actor: { id: string; name: string },
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.reassignStep>>; scopeMode: ScopeMode } | null>;
  addWatcher(
    publicId: string,
    watcher: Parameters<typeof requestsRepo.addWatcher>[2],
    actor: { id: string; name: string },
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.addWatcher>>; scopeMode: ScopeMode } | null>;
  removeWatcher(
    publicId: string,
    userId: string,
    actor: { id: string; name: string },
  ): Promise<{ result: Awaited<ReturnType<typeof requestsRepo.removeWatcher>>; scopeMode: ScopeMode } | null>;
}

export interface ScopedDb {
  cmdb: CmdbScope;
  events: EventsScope;
  incidents: IncidentsScope;
  monitoring: MonitoringScope;
  problems: ProblemsScope;
  changes: ChangesScope;
  releases: ReleasesScope;
  serviceRequests: ServiceRequestsScope;
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

  function canWriteApp(appId: string): boolean {
    if (isPlatformAdmin) return true;
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function resolveScopeMode(appId: string): ScopeMode | null {
    if (!canWriteApp(appId)) return null;
    if (isPlatformAdmin) return 'admin';
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (ownerApps.has(appId)) return 'owner';
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
      const appId = raw.primaryApplicationId;
      if (!canWriteApp(appId)) {
        throw new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: appId });
      }
      const mode: ScopeMode = resolveScopeMode(appId) ?? 'admin';
      const result = await cmdbRepo.updateCI(ctx.tenantId, publicId, patch);
      return { result, scopeMode: mode };
    },
    canWriteApp,
    resolveScopeMode,
  };

  const isEventReadBypass = POLICY.event.readBypass.some((r) => ctx.functionalRoles.includes(r));

  function eventCanWrite(appId: string): boolean {
    if (isPlatformAdmin) return true;
    if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function eventScopeMode(appId: string): ScopeMode {
    if (isPlatformAdmin) return 'admin';
    if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  const events: EventsScope = {
    async list(filter) {
      const rows = await eventsRepo.list(ctx.tenantId, filter);
      if (isEventReadBypass) return rows;
      // Post-filter: keep writable/owned apps.
      return rows.filter((e) => {
        const appId = (e as { applicationId?: string | null }).applicationId ?? null;
        if (!appId) return false;
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
      const appId = raw.applicationId;
      if (!eventCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'event', action: 'update', applicationId: appId });
      }
      const mode: ScopeMode = eventScopeMode(appId);
      const result = await eventsRepo.setStatus(ctx.tenantId, publicId, patch);
      return { result, scopeMode: mode };
    },
    async ingest(input) {
      const { id, publicId } = await eventsRepo.ingest(ctx.tenantId, input);
      return { id, publicId, scopeMode: 'admin' as const };
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
    if (isPlatformAdmin) return 'admin';
    if (opts.allowNoc && POLICY.incident.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
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

  // ── Monitoring scope (read=global, write=admin_only) ─────────────────────────

  function requireAdminFor(module: 'monitoring_rule' | 'alert_route', action: 'create' | 'update' | 'delete'): void {
    if (!isPlatformAdmin) {
      throw new ScopeViolationError({ module, action });
    }
  }

  const monitoring: MonitoringScope = {
    listRules: () => monitoringRepo.listRules(ctx.tenantId),
    getRule: (id) => monitoringRepo.getRule(ctx.tenantId, id),
    listRoutes: () => monitoringRepo.listRoutes(ctx.tenantId),
    getRoute: (id) => monitoringRepo.getRoute(ctx.tenantId, id),
    async createRule(input, actor) {
      requireAdminFor('monitoring_rule', 'create');
      const result = await monitoringRepo.createRule(ctx.tenantId, input, actor);
      return { result, scopeMode: 'admin' };
    },
    async updateRule(publicId, input) {
      requireAdminFor('monitoring_rule', 'update');
      const result = await monitoringRepo.updateRule(ctx.tenantId, publicId, input);
      return result ? { result, scopeMode: 'admin' as const } : null;
    },
    async deleteRule(publicId) {
      requireAdminFor('monitoring_rule', 'delete');
      const result = await monitoringRepo.deleteRule(ctx.tenantId, publicId);
      return result ? { result, scopeMode: 'admin' as const } : null;
    },
    async createRoute(input) {
      requireAdminFor('alert_route', 'create');
      const result = await monitoringRepo.createRoute(ctx.tenantId, input);
      return { result, scopeMode: 'admin' };
    },
    async updateRoute(publicId, input) {
      requireAdminFor('alert_route', 'update');
      const result = await monitoringRepo.updateRoute(ctx.tenantId, publicId, input);
      return result ? { result, scopeMode: 'admin' as const } : null;
    },
    async deleteRoute(publicId) {
      requireAdminFor('alert_route', 'delete');
      const result = await monitoringRepo.deleteRoute(ctx.tenantId, publicId);
      return result ? { result, scopeMode: 'admin' as const } : null;
    },
  };

  // ── Problems scope (read=global, write=scoped — no write endpoints yet) ──────

  const problems: ProblemsScope = {
    list: () => problemsRepo.list(ctx.tenantId),
    get: (publicId) => problemsRepo.get(ctx.tenantId, publicId),
  };

  // ── Changes scope (read=global, write=scoped) ──────────────────────────────

  function changeCanWrite(appId: string | null): boolean {
    if (isPlatformAdmin) return true;
    if (appId === null) return false;
    if (POLICY.change.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function changeScopeMode(appId: string | null): ScopeMode {
    if (isPlatformAdmin) return 'admin';
    if (POLICY.change.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  async function loadChangeAppId(publicId: string): Promise<string | null | undefined> {
    const raw = await prisma.change.findFirst({
      where: { tenantId: ctx.tenantId, publicId },
      select: { applicationId: true },
    });
    return raw ? (raw.applicationId ?? null) : undefined;
  }

  const changes: ChangesScope = {
    list: () => changesRepo.list(ctx.tenantId),
    get: (publicId) => changesRepo.get(ctx.tenantId, publicId),

    async create(requester, input) {
      const appId = input.applicationId ?? null;
      if (appId !== null && !changeCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'change', action: 'create', applicationId: appId });
      }
      const mode = changeScopeMode(appId);
      const { applicationId: _appId, ...repoInput } = input;
      const resolvedAppId = appId ?? await ensureUnassignedApp(ctx.tenantId);
      const result = await changesRepo.create(ctx.tenantId, requester, { ...repoInput, applicationId: resolvedAppId });
      return { result, scopeMode: mode };
    },

    async cancel(publicId, reason) {
      const appId = await loadChangeAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !changeCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'change', action: 'update', applicationId: appId });
      }
      const result = await changesRepo.cancel(ctx.tenantId, publicId, reason);
      return { result, scopeMode: changeScopeMode(appId) };
    },

    async reschedule(publicId, input, actor) {
      const appId = await loadChangeAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !changeCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'change', action: 'update', applicationId: appId });
      }
      const result = await changesRepo.reschedule(ctx.tenantId, publicId, input, actor);
      return { result, scopeMode: changeScopeMode(appId) };
    },

    async setTechnicalAssessment(publicId, reviewer, assessment) {
      const appId = await loadChangeAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !changeCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'change', action: 'update', applicationId: appId });
      }
      const result = await changesRepo.setTechnicalAssessment(ctx.tenantId, publicId, assessment, reviewer);
      return { result, scopeMode: changeScopeMode(appId) };
    },
  };

  // ── Releases scope (read=global, write=admin_only — no write endpoints) ──────

  const releases: ReleasesScope = {
    list: () => releasesRepo.list(ctx.tenantId),
    get: (publicId) => releasesRepo.get(ctx.tenantId, publicId),
  };

  // ── ServiceRequests scope (read=scoped, write=scoped) ─────────────────────

  const isSrReadBypass = POLICY.service_request.readBypass.some((r) => ctx.functionalRoles.includes(r));
  const readableApps = new Set([...writableApps, ...ownerApps]);

  function srCanWrite(appId: string | null): boolean {
    if (isPlatformAdmin) return true;
    if (appId === null) return false;
    if (POLICY.service_request.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function srScopeMode(appId: string | null): ScopeMode {
    if (isPlatformAdmin) return 'admin';
    if (POLICY.service_request.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  async function loadSrAppId(publicId: string): Promise<string | null | undefined> {
    const raw = await prisma.serviceRequest.findFirst({
      where: { tenantId: ctx.tenantId, publicId },
      select: { applicationId: true },
    });
    return raw ? ((raw as { applicationId?: string | null }).applicationId ?? null) : undefined;
  }

  const serviceRequests: ServiceRequestsScope = {
    async list() {
      const rows = await requestsRepo.list(ctx.tenantId);
      if (isSrReadBypass) return rows;
      return (rows as { applicationId?: string | null }[]).filter(
        (r) => r.applicationId == null || readableApps.has(r.applicationId!),
      ) as typeof rows;
    },
    get: (publicId) => requestsRepo.get(ctx.tenantId, publicId),
    listComments: (publicId) => requestsRepo.listComments(ctx.tenantId, publicId),

    async decideStep(publicId, stepId, actor, decision, note) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.decideStep(ctx.tenantId, publicId, stepId, decision, actor, note);
      return { result, scopeMode: srScopeMode(appId) };
    },

    async appendComment(publicId, author, body) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.appendComment(ctx.tenantId, publicId, author, body);
      return { result, scopeMode: srScopeMode(appId) };
    },

    async cancel(publicId, reason, actor) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.cancel(ctx.tenantId, publicId, reason, actor);
      return { result, scopeMode: srScopeMode(appId) };
    },

    async reassignStep(publicId, stepId, assignee, actor) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.reassignStep(ctx.tenantId, publicId, stepId, assignee, actor);
      return { result, scopeMode: srScopeMode(appId) };
    },

    async addWatcher(publicId, watcher, actor) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.addWatcher(ctx.tenantId, publicId, watcher, actor);
      return { result, scopeMode: srScopeMode(appId) };
    },

    async removeWatcher(publicId, userId, actor) {
      const appId = await loadSrAppId(publicId);
      if (appId === undefined) return null;
      if (appId !== null && !srCanWrite(appId)) {
        throw new ScopeViolationError({ module: 'service_request', action: 'update', applicationId: appId });
      }
      const result = await requestsRepo.removeWatcher(ctx.tenantId, publicId, userId, actor);
      return { result, scopeMode: srScopeMode(appId) };
    },
  };

  return { cmdb, events, incidents, monitoring, problems, changes, releases, serviceRequests };
}
