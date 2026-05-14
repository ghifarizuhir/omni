import type { MonitoringRule, AlertRoute } from '../types';
import { apiFetch } from './core';

export const monitoringRulesService = {
  list: () => apiFetch<MonitoringRule[]>('/monitoring/rules'),
  get: (publicId: string) => apiFetch<MonitoringRule>(`/monitoring/rules/${publicId}`),
};

export const alertRoutesService = {
  list: () => apiFetch<AlertRoute[]>('/monitoring/routes'),
  get: (publicId: string) => apiFetch<AlertRoute>(`/monitoring/routes/${publicId}`),
};
