import { mockOutages } from '../mocks/outages';
import { mockSLATargets } from '../mocks/slaTargets';
import { mockSLABreaches, getActiveBreaches } from '../mocks/slaBreaches';
import { mockDailyServiceHealth } from '../mocks/dailyServiceHealth';
import { mockAvailabilityData } from '../mocks/availabilityData';
import type { Outage, SLATarget, SLABreach } from '../types';
import { apiFetch, isLive, mockResult } from './core';

export const availabilityService = {
  outages(): Promise<Outage[]> {
    if (isLive()) return apiFetch<Outage[]>('/availability/outages');
    return mockResult(mockOutages);
  },
  slaTargets(): Promise<SLATarget[]> {
    if (isLive()) return apiFetch<SLATarget[]>('/availability/sla-targets');
    return mockResult(mockSLATargets);
  },
  slaBreaches(): Promise<SLABreach[]> {
    if (isLive()) return apiFetch<SLABreach[]>('/availability/sla-breaches');
    return mockResult(mockSLABreaches);
  },
  activeBreaches(): Promise<SLABreach[]> {
    if (isLive()) return apiFetch<SLABreach[]>('/availability/sla-breaches', { query: { active: true } });
    return mockResult(getActiveBreaches());
  },
  dailyHealth(): Promise<typeof mockDailyServiceHealth> {
    if (isLive()) return apiFetch('/availability/daily-health');
    return mockResult(mockDailyServiceHealth);
  },
  series(): Promise<typeof mockAvailabilityData> {
    if (isLive()) return apiFetch('/availability/series');
    return mockResult(mockAvailabilityData);
  },
};
