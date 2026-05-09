import { Severity } from './common';

export type SLAWindow =
  | 'rolling_30d'
  | 'rolling_7d'
  | 'rolling_90d'
  | 'calendar_month'
  | 'calendar_quarter';

export type SLAMetric =
  | 'availability'
  | 'mttr'
  | 'mtbf'
  | 'mtrs'
  | 'response_time'
  | 'first_byte_latency';

export type AvailabilitySLAStatus = 'meeting' | 'at_risk' | 'breached';

export type ServiceTier = 'critical' | 'important' | 'standard';

export type OutageType =
  | 'unplanned'
  | 'planned'
  | 'partial'
  | 'detected_only';

export interface SLATarget {
  id: string;
  publicId: string;
  serviceId: string;
  serviceName: string;
  serviceTier: ServiceTier;
  metric: SLAMetric;
  target: number;
  unit: '%' | 'minutes' | 'seconds';
  window: SLAWindow;
  currentValue: number;
  status: AvailabilitySLAStatus;
  errorBudgetMinutes?: number;
  errorBudgetConsumedMinutes?: number;
  errorBudgetRemainingPercent?: number;
  ownerId: string;
  ownerName: string;
  effectiveFrom: string;
  reviewDueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SLABreach {
  id: string;
  slaId: string;
  slaPublicId: string;
  serviceId: string;
  serviceName: string;
  metric: SLAMetric;
  breachedAt: string;
  detectedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;
  triggeringIncidentIds: string[];
  triggeringEventIds: string[];
  severityRatio: number;
  rootCauseSummary?: string;
  linkedProblemPublicId?: string;
  status: 'active' | 'resolved' | 'acknowledged';
  notes?: string;
}

export interface Outage {
  id: string;
  publicId: string;
  type: OutageType;
  serviceId: string;
  serviceName: string;
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  severity: Severity;
  customerFacing: boolean;
  affectedUsersEstimate?: number;
  triggeringIncidentId?: string;
  triggeringIncidentPublicId?: string;
  resolvingChangeId?: string;
  resolvingChangePublicId?: string;
  rootCauseProblemId?: string;
  rootCauseProblemPublicId?: string;
  rootCauseSummary?: string;
  preventiveActions?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityDataPoint {
  date: string;
  serviceId: string;
  uptimePercent: number;
  totalMinutesInDay: number;
  downtimeMinutes: number;
  partialDowntimeMinutes: number;
  incidentCount: number;
}

export interface DailyServiceHealth {
  date: string;
  serviceId: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptimePercent: number;
  incidentCount: number;
  outageMinutes: number;
}
