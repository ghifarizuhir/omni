import { Severity } from './common';

export type CapacityResourceType =
  | 'cpu'
  | 'memory'
  | 'disk'
  | 'network_bandwidth'
  | 'db_connections'
  | 'queue_depth'
  | 'requests_per_second'
  | 'storage_iops'
  | 'concurrent_users';

export type CapacityThresholdSeverity = 'info' | 'warning' | 'critical';

export interface CapacityMetric {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  resourceType: CapacityResourceType;
  unit: string;
  ciId: string;
  ciPublicId: string;
  serviceId?: string;
  serviceName?: string;
  currentValue: number;
  capacityValue: number;
  utilizationPercent: number;
  baselineValue?: number;
  trend7d: 'increasing' | 'decreasing' | 'stable';
  changePercent7d: number;
  changePercent30d: number;
  warningThreshold: number;
  criticalThreshold: number;
  scalingThreshold?: number;
  avgLast24h: number;
  peakLast24h: number;
  peakLast7d: number;
  peakLast30d: number;
  monitoringRulePublicIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CapacityDataPoint {
  timestamp: string;
  metricId: string;
  value: number;
  capacity: number;
}

export interface CapacityForecast {
  id: string;
  metricId: string;
  metricPublicId: string;
  metricName: string;
  predictionMethod: 'linear' | 'seasonal' | 'arima';
  forecastHorizonDays: 30 | 90;
  predictions: Array<{
    date: string;
    predictedValue: number;
    confidenceLowerBound: number;
    confidenceUpperBound: number;
  }>;
  predictedBreachDate?: string;
  predictedCriticalDate?: string;
  daysUntilBreach?: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation?: string;
  generatedAt: string;
}

export interface CapacityThreshold {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  metricId: string;
  metricPublicId: string;
  metricName: string;
  severity: CapacityThresholdSeverity;
  operator: '>' | '>=' | '<' | '<=';
  thresholdValue: number;
  durationMinutes: number;
  alertChannel: string;
  autoScalingEnabled: boolean;
  autoScalingPolicy?: string;
  enabled: boolean;
  triggerCount30d: number;
  lastTriggeredAt?: string;
  linkedRuleIds: string[];
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScalingRecommendation {
  id: string;
  publicId: string;
  metricId: string;
  metricPublicId: string;
  metricName: string;
  ciPublicId: string;
  serviceId?: string;
  serviceName?: string;
  type: 'scale_up' | 'scale_down' | 'right_size' | 'add_replica' | 'remove_replica';
  reason: string;
  suggestedAction: string;
  estimatedImpact: string;
  estimatedCostMonthlyUSD?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  daysUntilCriticalIfIgnored?: number;
  status: 'open' | 'acknowledged' | 'in_progress' | 'implemented' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  implementedViaChangeId?: string;
  dismissedReason?: string;
  forecastId?: string;
  triggeringEventIds: string[];
  generatedAt: string;
  expiresAt?: string;
}
