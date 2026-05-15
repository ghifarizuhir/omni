import type { Outage, SLATarget, SLABreach, AvailabilityDataPoint, DailyServiceHealth } from '../types';
import { apiFetch } from './core';

export const availabilityService = {
  outages: () => apiFetch<Outage[]>('/availability/outages'),
  slaTargets: () => apiFetch<SLATarget[]>('/availability/sla-targets'),
  slaBreaches: () => apiFetch<SLABreach[]>('/availability/sla-breaches'),
  activeBreaches: () => apiFetch<SLABreach[]>('/availability/sla-breaches', { query: { active: true } }),
  dailyHealth: () => apiFetch<DailyServiceHealth[]>('/availability/daily-health'),
  series: () => apiFetch<AvailabilityDataPoint[]>('/availability/series'),
};
