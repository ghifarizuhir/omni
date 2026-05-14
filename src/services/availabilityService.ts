import type { Outage, SLATarget, SLABreach } from '../types';
import type { mockDailyServiceHealth } from '../mocks/dailyServiceHealth';
import type { mockAvailabilityData } from '../mocks/availabilityData';
import { apiFetch } from './core';

export const availabilityService = {
  outages: () => apiFetch<Outage[]>('/availability/outages'),
  slaTargets: () => apiFetch<SLATarget[]>('/availability/sla-targets'),
  slaBreaches: () => apiFetch<SLABreach[]>('/availability/sla-breaches'),
  activeBreaches: () => apiFetch<SLABreach[]>('/availability/sla-breaches', { query: { active: true } }),
  dailyHealth: () => apiFetch<typeof mockDailyServiceHealth>('/availability/daily-health'),
  series: () => apiFetch<typeof mockAvailabilityData>('/availability/series'),
};
