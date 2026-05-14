import type { MonitoringRule, AlertRoute } from '../types';
import { apiFetch } from './core';

// M6.11 (B1.1) — re-export the shared write schemas so callers don't reach into
// `src/shared/schemas/...` directly.
export type {
  CreateAlertRouteInput,
  UpdateAlertRouteInput,
} from '../shared/schemas/alertRoute';
export {
  createAlertRouteSchema,
  updateAlertRouteSchema,
} from '../shared/schemas/alertRoute';

import type {
  CreateAlertRouteInput,
  UpdateAlertRouteInput,
} from '../shared/schemas/alertRoute';

export const monitoringRulesService = {
  list: () => apiFetch<MonitoringRule[]>('/monitoring/rules'),
  get: (publicId: string) => apiFetch<MonitoringRule>(`/monitoring/rules/${publicId}`),
};

export const alertRoutesService = {
  list: () => apiFetch<AlertRoute[]>('/monitoring/routes'),
  get: (publicId: string) => apiFetch<AlertRoute>(`/monitoring/routes/${publicId}`),

  // M6.11 (B1.1) — write endpoints behind `rule.write`.
  create: (input: CreateAlertRouteInput) =>
    apiFetch<AlertRoute>('/monitoring/routes', { method: 'POST', body: input }),
  update: (publicId: string, input: UpdateAlertRouteInput) =>
    apiFetch<AlertRoute>(`/monitoring/routes/${publicId}`, { method: 'PATCH', body: input }),
  remove: (publicId: string) =>
    apiFetch<void>(`/monitoring/routes/${publicId}`, { method: 'DELETE' }),
};
