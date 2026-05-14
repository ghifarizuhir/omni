import type { Event, EventStatus, Severity } from '../types';
import { apiFetch } from './core';
import type { SetEventStatusInput } from '../shared/schemas/event';

export type { SetEventStatusInput } from '../shared/schemas/event';
export { setEventStatusSchema } from '../shared/schemas/event';

export interface EventListFilters {
  status?: EventStatus[];
  severities?: Severity[];
  ruleId?: string;
}

export interface EventDashboardStats {
  active: number;
  p1Open: number;
  p2Open: number;
  unacknowledged: number;
  rules: { total: number; enabled: number; disabled: number; firing24h: number };
  routing: { total: number; channels: number };
  coverage: { covered: number; total: number; pct: number };
}

const filterQuery = (f: EventListFilters) => ({
  status: f.status?.join(','),
  severities: f.severities?.join(','),
  ruleId: f.ruleId,
});

export const eventsService = {
  list: (filters: EventListFilters = {}) =>
    apiFetch<Event[]>('/events', { query: filterQuery(filters) }),
  listActive: () => eventsService.list({ status: ['open', 'acknowledged'] }),
  get: (publicId: string) => apiFetch<Event>(`/events/${publicId}`),
  dashboardStats: () => apiFetch<EventDashboardStats>('/events/dashboard-stats'),

  // M6.11 (B1.2) — PATCH event status (acknowledge / resolve / reopen). The
  // server stamps acknowledgedBy/resolvedBy from the session, so callers only
  // pass the target status (and an optional note).
  setStatus: (publicId: string, input: SetEventStatusInput) =>
    apiFetch<Event>(`/events/${publicId}/status`, { method: 'PATCH', body: input }),
};
