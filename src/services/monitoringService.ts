import { mockMonitoringRules } from '../mocks/monitoringRules';
import { mockAlertRoutes } from '../mocks/alertRoutes';
import type { MonitoringRule, AlertRoute } from '../types';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

export const monitoringRulesService = {
  list(): Promise<MonitoringRule[]> {
    if (isLive()) return apiFetch<MonitoringRule[]>('/monitoring/rules');
    return mockResult(mockMonitoringRules);
  },
  get(publicId: string): Promise<MonitoringRule> {
    if (isLive()) return apiFetch<MonitoringRule>(`/monitoring/rules/${publicId}`);
    return mockRequired(mockMonitoringRules.find(r => r.publicId === publicId), 'MonitoringRule');
  },
};

export const alertRoutesService = {
  list(): Promise<AlertRoute[]> {
    if (isLive()) return apiFetch<AlertRoute[]>('/monitoring/routes');
    return mockResult(mockAlertRoutes);
  },
  get(publicId: string): Promise<AlertRoute> {
    if (isLive()) return apiFetch<AlertRoute>(`/monitoring/routes/${publicId}`);
    return mockRequired(mockAlertRoutes.find(r => r.publicId === publicId), 'AlertRoute');
  },
};
