import { ServiceHealthStatus } from "../types";

export interface MockService {
  id: string;
  name: string;
  tier: 'critical' | 'important' | 'standard';
  ownerId: string;
  ownerTeamId: string;
  slaTarget: number; // e.g. 99.9
  currentHealth: ServiceHealthStatus;
  uptime30d: number; // %
}

export const mockServices: MockService[] = [
  { id: 'svc-001', name: 'Payment Service',        tier: 'critical',  ownerId: 'u-007', ownerTeamId: 't-platform', slaTarget: 99.95, currentHealth: 'operational',     uptime30d: 99.97 },
  { id: 'svc-002', name: 'Authentication Service', tier: 'critical',  ownerId: 'u-007', ownerTeamId: 't-platform', slaTarget: 99.99, currentHealth: 'operational',     uptime30d: 99.99 },
  { id: 'svc-003', name: 'Order Service',          tier: 'critical',  ownerId: 'u-007', ownerTeamId: 't-platform', slaTarget: 99.9,  currentHealth: 'degraded',        uptime30d: 99.82 },
  { id: 'svc-004', name: 'Notification Gateway',   tier: 'important', ownerId: 'u-008', ownerTeamId: 't-data',     slaTarget: 99.5,  currentHealth: 'operational',     uptime30d: 99.94 },
  { id: 'svc-005', name: 'Search Service',         tier: 'important', ownerId: 'u-008', ownerTeamId: 't-data',     slaTarget: 99.5,  currentHealth: 'partial_outage',  uptime30d: 98.41 },
  { id: 'svc-006', name: 'Analytics Pipeline',     tier: 'important', ownerId: 'u-008', ownerTeamId: 't-data',     slaTarget: 99.0,  currentHealth: 'operational',     uptime30d: 99.71 },
  { id: 'svc-007', name: 'Internal Wiki',          tier: 'standard',  ownerId: 'u-001', ownerTeamId: 't-platform', slaTarget: 99.0,  currentHealth: 'maintenance',     uptime30d: 99.50 },
  { id: 'svc-008', name: 'CI/CD Platform',         tier: 'standard',  ownerId: 'u-001', ownerTeamId: 't-platform', slaTarget: 99.0,  currentHealth: 'operational',     uptime30d: 99.88 },
];
