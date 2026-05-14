import type { Event, EventStatus, MonitoringRule, AlertRoute, Severity } from '../../src/types';
import { prisma } from '../db';

const parseArr = (s: string): string[] => { try { return JSON.parse(s); } catch { return []; } };
const parseObj = <T,>(s: string, fb: T): T => { try { return JSON.parse(s); } catch { return fb; } };

type EventRow = Awaited<ReturnType<typeof prisma.event.findMany>>[number];

const toEvent = (row: EventRow): Event => ({
  id: row.id,
  publicId: row.publicId,
  type: row.type as Event['type'],
  status: row.status as Event['status'],
  severity: row.severity as Severity,
  title: row.title,
  message: row.message,
  source: row.source as Event['source'],
  ruleId: row.ruleId ?? undefined,
  rulePublicId: row.rulePublicId ?? undefined,
  ruleName: row.ruleName ?? undefined,
  affectedCIIds: parseArr(row.affectedCIIds),
  affectedCIPublicIds: parseArr(row.affectedCIPublicIds),
  correlationKey: row.correlationKey,
  groupCount: row.groupCount,
  firedAt: row.firedAt.toISOString(),
  lastSeenAt: row.lastSeenAt.toISOString(),
  acknowledgedAt: row.acknowledgedAt?.toISOString(),
  acknowledgedBy: row.acknowledgedBy ?? undefined,
  resolvedAt: row.resolvedAt?.toISOString(),
  resolvedBy: row.resolvedBy ?? undefined,
  linkedIncidentId: row.linkedIncidentId ?? undefined,
  payload: parseObj(row.payload, {} as Record<string, unknown>),
  tags: parseArr(row.tags),
});

export const eventsRepo = {
  async list(tenantId: string, filters: { status?: EventStatus[]; severities?: Severity[]; ruleId?: string }) {
    const rows = await prisma.event.findMany({
      where: {
        tenantId,
        ...(filters.status?.length ? { status: { in: filters.status } } : {}),
        ...(filters.severities?.length ? { severity: { in: filters.severities } } : {}),
        ...(filters.ruleId ? { ruleId: filters.ruleId } : {}),
      },
    });
    return rows.map(toEvent);
  },
  async get(tenantId: string, publicId: string) {
    const row = await prisma.event.findFirst({ where: { tenantId, publicId } });
    return row ? toEvent(row) : null;
  },
  async dashboardStats(tenantId: string) {
    const [events, rules, routes, ciCount] = await Promise.all([
      prisma.event.findMany({ where: { tenantId } }),
      prisma.monitoringRule.findMany({ where: { tenantId } }),
      prisma.alertRoute.findMany({ where: { tenantId } }),
      prisma.configurationItem.count({ where: { tenantId } }),
    ]);
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const ruleObjs = rules.map(r => parseObj<MonitoringRule>(r.data, {} as MonitoringRule));
    const routeObjs = routes.map(r => parseObj<AlertRoute>(r.data, {} as AlertRoute));
    const coveredIds = new Set(ruleObjs.filter(r => r.enabled).flatMap(r => r.targetCIIds ?? []));
    return {
      active: events.filter(e => e.status === 'open' || e.status === 'acknowledged').length,
      p1Open: events.filter(e => e.severity === 'P1' && e.status === 'open').length,
      p2Open: events.filter(e => e.severity === 'P2' && e.status === 'open').length,
      unacknowledged: events.filter(e => e.status === 'open').length,
      rules: {
        total: ruleObjs.length,
        enabled: ruleObjs.filter(r => r.enabled).length,
        disabled: ruleObjs.filter(r => !r.enabled).length,
        firing24h: ruleObjs.filter(r => r.lastTriggeredAt && new Date(r.lastTriggeredAt).getTime() > yesterday).length,
      },
      routing: {
        total: routeObjs.length,
        channels: new Set(routeObjs.flatMap(r => r.channels ?? [])).size,
      },
      coverage: {
        covered: coveredIds.size,
        total: ciCount,
        pct: ciCount > 0 ? Math.round((coveredIds.size / ciCount) * 100) : 0,
      },
    };
  },
};

export const monitoringRepo = {
  async listRules(tenantId: string) {
    const rows = await prisma.monitoringRule.findMany({ where: { tenantId } });
    return rows.map(r => parseObj<MonitoringRule>(r.data, {} as MonitoringRule));
  },
  async getRule(tenantId: string, publicId: string) {
    const row = await prisma.monitoringRule.findFirst({ where: { tenantId, publicId } });
    return row ? parseObj<MonitoringRule>(row.data, {} as MonitoringRule) : null;
  },
  async listRoutes(tenantId: string) {
    const rows = await prisma.alertRoute.findMany({ where: { tenantId } });
    return rows.map(r => parseObj<AlertRoute>(r.data, {} as AlertRoute));
  },
  async getRoute(tenantId: string, publicId: string) {
    const row = await prisma.alertRoute.findFirst({ where: { tenantId, publicId } });
    return row ? parseObj<AlertRoute>(row.data, {} as AlertRoute) : null;
  },

  // M6.11 (B1.1) — Alert route writes. Each one snapshots before/after and runs
  // inside a transaction so the route handler can emit an audit log without
  // re-reading the row.
  async createRoute(tenantId: string, input: Partial<AlertRoute> & { name: string }): Promise<AlertRoute> {
    const now = new Date();
    const id = `ar-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const publicId = `ROUTE-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const route: AlertRoute = {
      id,
      publicId,
      name: input.name,
      description: input.description ?? '',
      matchExpression: input.matchExpression ?? {},
      channels: input.channels ?? [],
      recipients: input.recipients ?? [],
      escalationSteps: input.escalationSteps ?? [],
      quietHours: input.quietHours,
      enabled: input.enabled ?? false,
      ruleCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await prisma.$transaction([
      prisma.alertRoute.create({
        data: { id, publicId, tenantId, data: JSON.stringify(route) },
      }),
    ]);
    return route;
  },

  async updateRoute(
    tenantId: string,
    publicId: string,
    patch: Partial<AlertRoute>,
  ): Promise<{ before: AlertRoute; after: AlertRoute; internalId: string } | null> {
    const row = await prisma.alertRoute.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parseObj<AlertRoute>(row.data, {} as AlertRoute);
    const after: AlertRoute = {
      ...before,
      ...patch,
      // Keep identity fields immutable.
      id: before.id,
      publicId: before.publicId,
      createdAt: before.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await prisma.$transaction([
      prisma.alertRoute.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after) },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  async deleteRoute(
    tenantId: string,
    publicId: string,
  ): Promise<{ before: AlertRoute; internalId: string } | null> {
    const row = await prisma.alertRoute.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parseObj<AlertRoute>(row.data, {} as AlertRoute);
    await prisma.$transaction([
      prisma.alertRoute.delete({ where: { id: row.id } }),
    ]);
    return { before, internalId: row.id };
  },
};
