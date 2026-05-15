import type { ServiceHealthStatus } from './common';

export interface Service {
  id: string;
  name: string;
  tier: 'critical' | 'important' | 'standard';
  ownerId: string;
  ownerTeamId: string;
  slaTarget: number;
  currentHealth: ServiceHealthStatus;
  uptime30d: number;
}
