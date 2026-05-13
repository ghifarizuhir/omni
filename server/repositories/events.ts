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
};
