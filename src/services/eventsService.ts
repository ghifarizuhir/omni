import { mockEvents } from '../mocks/events';
import { mockMonitoringRules } from '../mocks/monitoringRules';
import { mockAlertRoutes } from '../mocks/alertRoutes';
import { mockCIs } from '../mocks/cis';
import type { Event, EventStatus, MonitoringRule, AlertRoute, Severity } from '../types';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

const SEVERITY_ORDER: Record<Severity, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export interface EventListFilters {
  status?: EventStatus[];
  severities?: Severity[];
  ruleId?: string;
}

const filterEvents = (events: Event[], f: EventListFilters): Event[] =>
  events.filter(e => {
    if (f.status?.length && !f.status.includes(e.status)) return false;
    if (f.severities?.length && !f.severities.includes(e.severity)) return false;
    if (f.ruleId && e.ruleId !== f.ruleId) return false;
    return true;
  });

export interface EventDashboardStats {
  active: number;
  p1Open: number;
  p2Open: number;
  unacknowledged: number;
  rules: { total: number; enabled: number; disabled: number; firing24h: number };
  routing: { total: number; channels: number };
  coverage: { covered: number; total: number; pct: number };
}

const computeDashboardStats = (
  events: Event[],
  rules: MonitoringRule[],
  routes: AlertRoute[],
  ciCount: number,
): EventDashboardStats => {
  const active = events.filter(e => e.status === 'open' || e.status === 'acknowledged');
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  const coveredIds = new Set(rules.filter(r => r.enabled).flatMap(r => r.targetCIIds));

  return {
    active: active.length,
    p1Open: events.filter(e => e.severity === 'P1' && e.status === 'open').length,
    p2Open: events.filter(e => e.severity === 'P2' && e.status === 'open').length,
    unacknowledged: events.filter(e => e.status === 'open').length,
    rules: {
      total: rules.length,
      enabled: rules.filter(r => r.enabled).length,
      disabled: rules.filter(r => !r.enabled).length,
      firing24h: rules.filter(r => r.lastTriggeredAt && new Date(r.lastTriggeredAt).getTime() > yesterday).length,
    },
    routing: {
      total: routes.length,
      channels: new Set(routes.flatMap(r => r.channels)).size,
    },
    coverage: {
      covered: coveredIds.size,
      total: ciCount,
      pct: ciCount > 0 ? Math.round((coveredIds.size / ciCount) * 100) : 0,
    },
  };
};

const sortedByPriority = (events: Event[]): Event[] =>
  [...events].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime(),
  );

export const eventsService = {
  list(filters: EventListFilters = {}): Promise<Event[]> {
    if (isLive()) return apiFetch<Event[]>('/events', { query: filters as Record<string, string> });
    return mockResult(sortedByPriority(filterEvents(mockEvents, filters)));
  },

  listActive(): Promise<Event[]> {
    return eventsService.list({ status: ['open', 'acknowledged'] });
  },

  get(publicId: string): Promise<Event> {
    if (isLive()) return apiFetch<Event>(`/events/${publicId}`);
    return mockRequired(mockEvents.find(e => e.publicId === publicId), 'Event');
  },

  dashboardStats(): Promise<EventDashboardStats> {
    if (isLive()) return apiFetch<EventDashboardStats>('/events/dashboard-stats');
    return mockResult(computeDashboardStats(mockEvents, mockMonitoringRules, mockAlertRoutes, mockCIs.length));
  },
};
