export type DashboardType = 'executive' | 'operational' | 'sla' | 'capacity' | 'custom';

export type ReportType =
  | 'monthly_summary'
  | 'sla_report'
  | 'incident_report'
  | 'change_report'
  | 'availability_report'
  | 'capacity_report'
  | 'custom';

export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

export type ReportFrequency = 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type MetricValueType = 'count' | 'percentage' | 'duration' | 'bytes' | 'currency' | 'ratio';

export type MetricCategory =
  | 'availability'
  | 'reliability'
  | 'performance'
  | 'change_management'
  | 'incident_management'
  | 'capacity'
  | 'service_request'
  | 'knowledge';

export interface MeasurementDashboard {
  id: string;
  publicId: string;
  name: string;
  description: string;
  type: DashboardType;
  audience: 'executives' | 'operations' | 'service_owners' | 'all';
  refreshInterval: number;
  widgets: DashboardWidget[];
  timeRangeOptions: string[];
  defaultTimeRange: string;
  serviceFilter: boolean;
  ownerId: string;
  ownerName: string;
  lastViewedAt?: string;
  viewCount30d: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'heatmap' | 'stat_block' | 'text';
  title: string;
  description?: string;
  metricIds: string[];
  span: 1 | 2 | 3 | 4;
  config?: Record<string, unknown>;
}

export interface Report {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  type: ReportType;
  frequency: ReportFrequency;
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';
  timeRange: string;
  serviceIds: string[];
  includedMetrics: string[];
  format: ReportFormat[];
  deliverToUserIds: string[];
  deliverToEmails: string[];
  generatedCount: number;
  lastGeneratedAt?: string;
  availableVersions: Array<{
    id: string;
    generatedAt: string;
    format: ReportFormat;
    sizeKB: number;
    downloadUrl: string;
  }>;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricDefinition {
  id: string;
  publicId: string;
  name: string;
  displayName: string;
  description: string;
  category: MetricCategory;
  valueType: MetricValueType;
  unit: string;
  formula?: string;
  currentValue?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
  target?: number;
  industryBenchmark?: number;
  benchmarkSource?: string;
  sourceSystem: string;
  updateFrequency: string;
  usedInDashboardIds: string[];
  usedInReportIds: string[];
  ownerId: string;
  ownerName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
