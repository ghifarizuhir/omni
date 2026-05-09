# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 5a — Service Health Cluster: Availability + Capacity Management

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a + 4b sudah di-execute di Build Mode session yang sama.
> **Modules:** Availability Management (§7.9) + Capacity and Performance Management (§7.10)
> **Routes covered:** `/availability`, `/availability/sla`, `/availability/outages`, `/capacity`, `/capacity/forecast`, `/capacity/thresholds`
> **Companion:** Doc 5b (Continuity + Measurement) and Doc 5c (Continual Improvement)

---

## 🎯 SCOPE & DEPENDENCIES

Doc 5a covers **service health monitoring** dari perspektif:
- **Availability** = uptime SLA tracking, error budget, outage analysis (rear-view)
- **Capacity** = utilization, forecasting, scaling recommendations (forward-view)

Karakter modul: **analytics-heavy**. Banyak time-series charts. Per Q2 decision, gunakan **Recharts** sebagai default chart library.

**Reuse from Doc 0–4b:**
- AppShell, all UI primitives, formatters
- Mock data: users, teams, services, CIs, incidents, monitoring rules, deployments
- Recharts library (sudah tersedia di Doc 0 dependencies)
- Cross-link: outages ↔ incidents (Doc 3a real), capacity threshold ↔ events (Doc 2 real), capacity recommendation ↔ change (Doc 4a placeholder ok atau real kalau scaling change exists)

**To be added in Doc 5a:**
- Domain types: `SLATarget`, `SLABreach`, `Outage`, `AvailabilityMetric`, `CapacityMetric`, `CapacityForecast`, `CapacityThreshold`, `ScalingRecommendation`
- Mock data: 8 SLA targets (per service tier), ~24 outages (last 90 days), 12 capacity metrics, time-series data
- Module components in `src/components/availability/` and `src/components/capacity/`
- 6 route implementations
- Update routing config + cross-link to existing modules

---

## 🧩 DOMAIN TYPES (`src/types/availability.ts`)

```typescript
import { Severity } from './common';

// SLA window types
export type SLAWindow =
  | 'rolling_30d'
  | 'rolling_7d'
  | 'rolling_90d'
  | 'calendar_month'
  | 'calendar_quarter';

// SLA metric types
export type SLAMetric =
  | 'availability'         // % uptime
  | 'mttr'                 // Mean Time To Resolve
  | 'mtbf'                 // Mean Time Between Failures
  | 'mtrs'                 // Mean Time to Restore Service
  | 'response_time'        // First response time SLA
  | 'first_byte_latency';  // p95 or similar

// SLA status
export type SLAStatus = 'meeting' | 'at_risk' | 'breached';

// Service tier (mirroring Doc 0 mockServices)
export type ServiceTier = 'critical' | 'important' | 'standard';

// Outage type
export type OutageType =
  | 'unplanned'      // Caused by incident
  | 'planned'        // Scheduled maintenance
  | 'partial'        // Degraded but not down
  | 'detected_only'; // Detected by monitoring, no incident yet

// === SLA TARGET ===
export interface SLATarget {
  id: string;
  publicId: string;                  // e.g. "SLA-PAY-001"
  serviceId: string;                 // mockServices id
  serviceName: string;               // Denormalized
  serviceTier: ServiceTier;

  metric: SLAMetric;
  target: number;                    // e.g. 99.95 for availability, 30 for MTTR-min
  unit: '%' | 'minutes' | 'seconds';
  window: SLAWindow;

  // Current state
  currentValue: number;
  status: SLAStatus;

  // Error budget (for availability)
  errorBudgetMinutes?: number;       // Total budget for the window (e.g. 21.6 min/30d for 99.95%)
  errorBudgetConsumedMinutes?: number;
  errorBudgetRemainingPercent?: number;

  // Linkage
  ownerId: string;                   // Service owner
  ownerName: string;

  // Audit
  effectiveFrom: string;             // ISO
  reviewDueAt?: string;              // When SLA needs review
  createdAt: string;
  updatedAt: string;
}

// === SLA BREACH ===
export interface SLABreach {
  id: string;
  slaId: string;
  slaPublicId: string;               // Denormalized for display
  serviceId: string;
  serviceName: string;
  metric: SLAMetric;

  breachedAt: string;
  detectedAt: string;
  resolvedAt?: string;
  durationMinutes?: number;

  // What pushed it over
  triggeringIncidentIds: string[];
  triggeringEventIds: string[];

  // Severity of breach (how far past target)
  severityRatio: number;             // e.g. 1.2 = 20% past target

  // Context
  rootCauseSummary?: string;
  linkedProblemPublicId?: string;

  status: 'active' | 'resolved' | 'acknowledged';
  notes?: string;
}

// === OUTAGE ===
export interface Outage {
  id: string;
  publicId: string;                  // e.g. "OUT-2026-00042"
  type: OutageType;

  // Service & scope
  serviceId: string;
  serviceName: string;
  affectedCIIds: string[];
  affectedCIPublicIds: string[];

  // Timing
  startedAt: string;
  endedAt?: string;                  // null if ongoing
  durationMinutes?: number;

  // Severity
  severity: Severity;                // P1-P4
  customerFacing: boolean;
  affectedUsersEstimate?: number;    // Approximate user count

  // Linkage (rear-view of incident management)
  triggeringIncidentId?: string;
  triggeringIncidentPublicId?: string;
  resolvingChangeId?: string;
  resolvingChangePublicId?: string;
  rootCauseProblemId?: string;
  rootCauseProblemPublicId?: string;

  // Analysis
  rootCauseSummary?: string;
  preventiveActions?: string[];      // Free text list

  // Audit
  createdAt: string;
  updatedAt: string;
}

// === AVAILABILITY METRIC (time-series) ===
export interface AvailabilityDataPoint {
  date: string;                      // YYYY-MM-DD
  serviceId: string;
  uptimePercent: number;             // 0-100
  totalMinutesInDay: number;         // 1440 except for partial days
  downtimeMinutes: number;
  partialDowntimeMinutes: number;    // Degraded but not full down
  incidentCount: number;             // Incidents that day
}

// === DAILY SERVICE HEALTH (for 90-day calendar heatmap) ===
export interface DailyServiceHealth {
  date: string;                      // YYYY-MM-DD
  serviceId: string;
  status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptimePercent: number;
  incidentCount: number;
  outageMinutes: number;
}
```

## 🧩 DOMAIN TYPES (`src/types/capacity.ts`)

```typescript
import { Severity } from './common';

// Capacity resource types
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

// Threshold severity
export type CapacityThresholdSeverity = 'info' | 'warning' | 'critical';

// === CAPACITY METRIC (current state + history) ===
export interface CapacityMetric {
  id: string;
  publicId: string;                  // e.g. "CAP-PAY-CPU-001"
  name: string;                      // Human readable
  description?: string;

  // Resource
  resourceType: CapacityResourceType;
  unit: string;                      // e.g. "%", "GB", "RPS", "connections"

  // Target
  ciId: string;                      // Specific CI
  ciPublicId: string;                // Denormalized
  serviceId?: string;                // Service this CI belongs to
  serviceName?: string;

  // Current state
  currentValue: number;
  capacityValue: number;             // Max capacity (for % calc)
  utilizationPercent: number;        // currentValue / capacityValue * 100
  baselineValue?: number;            // Normal/expected value (for anomaly detection)

  // Trend
  trend7d: 'increasing' | 'decreasing' | 'stable';
  changePercent7d: number;           // % change vs 7d ago
  changePercent30d: number;

  // Thresholds
  warningThreshold: number;          // Trigger warning event
  criticalThreshold: number;         // Trigger critical event
  scalingThreshold?: number;         // Trigger auto-scale recommendation

  // Stats
  avgLast24h: number;
  peakLast24h: number;
  peakLast7d: number;
  peakLast30d: number;

  // Linkage
  monitoringRulePublicIds: string[]; // Rules watching this metric

  // Audit
  createdAt: string;
  updatedAt: string;
}

// === CAPACITY DATA POINT (time-series, for charts) ===
export interface CapacityDataPoint {
  timestamp: string;                 // ISO
  metricId: string;
  value: number;
  capacity: number;                  // The "max" line
}

// === CAPACITY FORECAST ===
export interface CapacityForecast {
  id: string;
  metricId: string;
  metricPublicId: string;            // Denormalized
  metricName: string;

  // Forecast
  predictionMethod: 'linear' | 'seasonal' | 'arima';
  forecastHorizonDays: 30 | 90;

  // Predictions (array of points)
  predictions: Array<{
    date: string;                    // YYYY-MM-DD
    predictedValue: number;
    confidenceLowerBound: number;    // 95% CI lower
    confidenceUpperBound: number;
  }>;

  // Threshold breach prediction
  predictedBreachDate?: string;      // When utilization will hit warningThreshold
  predictedCriticalDate?: string;    // When it will hit criticalThreshold
  daysUntilBreach?: number;
  confidence: 'low' | 'medium' | 'high'; // Forecast confidence

  // Recommendation
  recommendation?: string;           // e.g. "Scale up by 25% within 14 days"

  // Audit
  generatedAt: string;
}

// === CAPACITY THRESHOLD ===
export interface CapacityThreshold {
  id: string;
  publicId: string;                  // e.g. "THR-CPU-PROD-001"
  name: string;
  description?: string;

  // Scope
  metricId: string;                  // Which metric this applies to
  metricPublicId: string;
  metricName: string;

  // Trigger
  severity: CapacityThresholdSeverity;
  operator: '>' | '>=' | '<' | '<=';
  thresholdValue: number;
  durationMinutes: number;           // Sustained for this long before trigger

  // Action
  alertChannel: string;              // e.g. "ROUTE-CRITICAL-PROD"
  autoScalingEnabled: boolean;
  autoScalingPolicy?: string;        // e.g. "Add 1 replica per 100 RPS over threshold"

  // Stats
  enabled: boolean;
  triggerCount30d: number;
  lastTriggeredAt?: string;

  // Linkage
  linkedRuleIds: string[];           // Monitoring rules created from this threshold

  // Audit
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

// === SCALING RECOMMENDATION ===
export interface ScalingRecommendation {
  id: string;
  publicId: string;                  // e.g. "REC-2026-00012"

  // Context
  metricId: string;
  metricPublicId: string;
  metricName: string;
  ciPublicId: string;
  serviceId?: string;
  serviceName?: string;

  // Recommendation
  type: 'scale_up' | 'scale_down' | 'right_size' | 'add_replica' | 'remove_replica';
  reason: string;                    // Why
  suggestedAction: string;           // What to do
  estimatedImpact: string;           // Expected outcome
  estimatedCostMonthlyUSD?: number;  // Cost change

  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
  daysUntilCriticalIfIgnored?: number;

  // Lifecycle
  status: 'open' | 'acknowledged' | 'in_progress' | 'implemented' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  implementedViaChangeId?: string;   // CHG-XXX once acted upon
  dismissedReason?: string;

  // Linkage
  forecastId?: string;
  triggeringEventIds: string[];

  // Audit
  generatedAt: string;
  expiresAt?: string;
}
```

In `src/types/index.ts`:
```typescript
export * from './availability';
export * from './capacity';
```

---

## 🗄 MOCK DATA

### `src/mocks/slaTargets.ts` — 8 SLA targets

One SLA per service from Doc 0's `mockServices`. Mix of metrics:

```
SLA-PAY-001  Payment Service  availability  99.95%  rolling_30d
  Current: 99.97% · Status: meeting
  Error budget: 21.6 min/30d, consumed 12.9 min, remaining 40%
  Owner: u-007 (Tom Bergstrom)

SLA-AUTH-001  Authentication Service  availability  99.99%  rolling_30d
  Current: 99.99% · Status: meeting
  Error budget: 4.32 min/30d, consumed 0.5 min, remaining 88%
  Owner: u-007

SLA-ORD-001  Order Service  availability  99.9%  rolling_30d
  Current: 99.82% · Status: BREACHED
  Error budget: 43.2 min/30d, consumed 78 min, remaining -80% (overrun)
  Owner: u-007

SLA-NOTIF-001  Notification Gateway  availability  99.5%  rolling_30d
  Current: 99.94% · Status: meeting
  Owner: u-008

SLA-SEARCH-001  Search Service  availability  99.5%  rolling_30d
  Current: 98.41% · Status: BREACHED
  Error budget: 216 min/30d, consumed 286 min, remaining -32%
  (matches the partial outage from Doc 0)
  Owner: u-008

SLA-ANALYTICS-001  Analytics Pipeline  availability  99.0%  rolling_30d
  Current: 99.71% · Status: meeting
  Owner: u-008

SLA-WIKI-001  Internal Wiki  availability  99.0%  rolling_30d
  Current: 99.50% · Status: meeting (note: wiki currently in maintenance)
  Owner: u-001 (Sarah Chen)

SLA-CICD-001  CI/CD Platform  availability  99.0%  rolling_30d
  Current: 99.88% · Status: meeting
  Owner: u-001
```

Generate full SLATarget objects with realistic timestamps, reviewDueAt 90 days from now, etc.

For metric `mttr`, add 1-2 SLAs as bonus (e.g. "Payment Service MTTR < 30 min").

### `src/mocks/slaBreaches.ts` — Active and historical breaches

For breached SLAs (SLA-ORD-001, SLA-SEARCH-001), create active breach records. Historical: ~5 resolved breaches in last 90 days.

```
SLA-BR-2026-00012 (active)
  slaPublicId: SLA-ORD-001
  Order Service breach detected after 78 min of degradation
  triggeringIncidentIds: [INC-2026-00183, INC-2026-00183]  (and historical)
  status: active
  severityRatio: 1.81 (78 min vs 43.2 min budget)
  linkedProblemPublicId: (none yet)
  breachedAt: 2026-05-08T07:42:00Z (matches incident)

SLA-BR-2026-00011 (active)
  slaPublicId: SLA-SEARCH-001
  Search Service breach: 70 min over budget
  triggeringIncidentIds: [INC-2026-00182]
  status: active
  severityRatio: 1.32
  linkedProblemPublicId: PRB-2026-00021

SLA-BR-2026-00009 (resolved 2 weeks ago)
  Payment Service brief breach during INC-2026-00132
  resolved after 6 min
  linkedProblemPublicId: PRB-2026-00018

SLA-BR-2026-00008 (resolved 3 weeks ago)
  Search Service breach during search rollback (REL-014/INC-148)

SLA-BR-2026-00006 (resolved 6 weeks ago)
  Auth service brief breach (resolved INC-2026-00121)

SLA-BR-2026-00004 (resolved 8 weeks ago)
  Order Service breach (resolved)

SLA-BR-2026-00002 (resolved 11 weeks ago)
  Analytics breach
```

### `src/mocks/outages.ts` — ~24 outages last 90 days

Generate 24 outages distributed across services. Mix of types:
- unplanned: 16 (most)
- planned: 5 (maintenance windows)
- partial: 2
- detected_only: 1

**Required showcase outages** (must include — link to existing data):

```
OUT-2026-00042 (ongoing)
  Type: unplanned
  Service: Payment Service
  Started: 2026-05-08T08:14:00Z (matches INC-184)
  Severity: P1
  customerFacing: true
  affectedUsersEstimate: 5400
  triggeringIncidentPublicId: INC-2026-00184
  rootCauseProblemPublicId: PRB-2026-00018

OUT-2026-00041 (ongoing partial)
  Type: partial
  Service: Search Service
  Started: 2026-05-08T06:15:00Z (matches INC-182)
  Severity: P2
  customerFacing: true
  triggeringIncidentPublicId: INC-2026-00182

OUT-2026-00040 (ongoing partial)
  Type: partial
  Service: Order Service
  Started: 2026-05-08T07:42:00Z (matches INC-183)
  Severity: P2

OUT-2026-00038 (recent, resolved)
  Type: planned (maintenance)
  Service: Internal Wiki
  Started/ended: matches CHG-086
  Severity: P4
  customerFacing: false

OUT-2026-00035 (3 days ago, resolved)
  Type: unplanned
  Service: Notification Gateway
  Duration: 42 min
  triggeringIncidentPublicId: INC-2026-00179
  Severity: P3

OUT-2026-00031 (5 days ago, resolved)
  Type: unplanned
  Service: Search Service
  Started: 2026-05-03T14:22:00Z, resolved 2026-05-03T14:38:00Z
  Severity: P2
  triggeringIncidentPublicId: INC-2026-00148
  resolvingChangePublicId: CHG-... (rollback was a change)
  rootCauseSummary: "search-service 4.2.0 query planner regression caused 3x latency"
  preventiveActions: ['Add p95 latency check to release validation suite']

OUT-2026-00027 (5 days ago)
  Type: unplanned (Payment Service total outage — matches INC-156)
  Service: Payment Service
  Severity: P1
  Duration: 30 min
  customerFacing: true
  affectedUsersEstimate: 12000
  triggeringIncidentPublicId: INC-2026-00156

OUT-2026-00021 (3 weeks ago)
  Type: unplanned (Analytics Kafka migration failure — matches CHG-080)
  Service: Analytics Pipeline
  triggeringIncidentPublicId: INC-2026-00170

OUT-2026-00018 (2 weeks ago — Payment timeouts)
  triggeringIncidentPublicId: INC-2026-00132
  rootCauseProblemPublicId: PRB-2026-00018

OUT-2026-00010 (6 weeks ago — earlier Payment incident)
  triggeringIncidentPublicId: INC-2026-00098
  rootCauseProblemPublicId: PRB-2026-00018
```

Generate the remaining ~14 outages spread across last 90 days. Include some smaller unplanned outages on auth, order, notification services, and 2-3 planned maintenance outages.

### `src/mocks/availabilityData.ts` — 90-day daily uptime per service

For each of 8 services, generate 90 days of `AvailabilityDataPoint`. Pattern realistic with mostly 100% uptime, occasional dips correlating with outages.

```typescript
// For Payment Service: mostly 100%, with dips on outage days
{ date: '2026-02-08', serviceId: 'svc-001', uptimePercent: 100,    downtimeMinutes: 0,  partialDowntimeMinutes: 0, incidentCount: 0 }
{ date: '2026-03-25', serviceId: 'svc-001', uptimePercent: 99.31,  downtimeMinutes: 0,  partialDowntimeMinutes: 10, incidentCount: 1 } // INC-098
{ date: '2026-04-22', serviceId: 'svc-001', uptimePercent: 99.51,  downtimeMinutes: 0,  partialDowntimeMinutes: 7, incidentCount: 1 } // INC-132
{ date: '2026-05-03', serviceId: 'svc-001', uptimePercent: 97.92,  downtimeMinutes: 30, partialDowntimeMinutes: 0, incidentCount: 1 } // INC-156
{ date: '2026-05-08', serviceId: 'svc-001', uptimePercent: 95.0,   downtimeMinutes: 0,  partialDowntimeMinutes: 72, incidentCount: 1 } // INC-184 (today, partial 12% impact)
```

For each service, populate 90 entries. Keep most days at `uptimePercent: 100`, dip on outage-correlated days.

### `src/mocks/dailyServiceHealth.ts` — 90-day calendar heatmap data

This is what drives the heatmap visualization. For each service × each of 90 days:

```typescript
{
  date: '2026-05-08',
  serviceId: 'svc-001',
  status: 'major_outage',  // matches today's INC-184
  uptimePercent: 95.0,
  incidentCount: 1,
  outageMinutes: 72,
}

{
  date: '2026-05-07',
  serviceId: 'svc-001',
  status: 'operational',
  uptimePercent: 100,
  incidentCount: 0,
  outageMinutes: 0,
}
```

Status mapping by uptime:
- 100% → operational
- 99.9-100% → operational
- 99-99.9% → degraded
- 95-99% → partial_outage
- <95% → major_outage
- planned maintenance → maintenance

Generate for all 8 services × 90 days = 720 entries (manageable).

### `src/mocks/capacityMetrics.ts` — 12 capacity metrics

```
CAP-PAY-CPU-001  Payment API CPU utilization
  resourceType: cpu, unit: %, ciPublicId: CI-APP-PAY-001
  currentValue: 67, capacityValue: 100, utilizationPercent: 67
  baselineValue: 55, trend7d: increasing, changePercent7d: +12, changePercent30d: +18
  warningThreshold: 70, criticalThreshold: 85, scalingThreshold: 75
  avgLast24h: 64, peakLast24h: 82, peakLast7d: 89, peakLast30d: 91

CAP-PAY-MEM-001  Payment API memory utilization
  resourceType: memory, currentValue: 78, capacityValue: 100
  trend7d: stable, changePercent7d: +1
  warningThreshold: 80, criticalThreshold: 90

CAP-PAY-DBCONN-001  Payment Postgres connection pool
  resourceType: db_connections, currentValue: 18, capacityValue: 20
  utilizationPercent: 90 (CRITICAL — matches active incident)
  trend7d: increasing
  This metric drives RULE-PAY-003 (Doc 2)

CAP-AUTH-CPU-001  Auth API CPU
  currentValue: 52, capacityValue: 100, utilizationPercent: 52
  trend7d: stable

CAP-AUTH-RPS-001  Auth API requests per second
  resourceType: requests_per_second, unit: RPS
  currentValue: 245, capacityValue: 500
  baselineValue: 220, trend7d: stable

CAP-ORD-CPU-001  Order API CPU
  currentValue: 71, capacityValue: 100, trend7d: increasing
  changePercent7d: +18 (matches degraded state)

CAP-DB-PAY-DISK-001  Payment Postgres disk
  resourceType: disk, unit: %
  currentValue: 62, capacityValue: 100, trend7d: increasing slowly

CAP-DB-ORD-DISK-001  Order Mongo disk
  currentValue: 48, capacityValue: 100

CAP-LB-EXT-NET-001  External LB bandwidth
  resourceType: network_bandwidth, unit: Gbps
  currentValue: 1.2, capacityValue: 5, utilizationPercent: 24
  peakLast7d: 3.4

CAP-SEARCH-IOPS-001  Search ES storage IOPS
  resourceType: storage_iops, currentValue: 8500, capacityValue: 10000
  utilizationPercent: 85 (high, near critical)

CAP-NOTIF-QUEUE-001  Notification queue depth
  resourceType: queue_depth, unit: messages
  currentValue: 1240, capacityValue: 50000
  baselineValue: 800

CAP-WIKI-USERS-001  Internal Wiki concurrent users
  resourceType: concurrent_users, unit: users
  currentValue: 42, capacityValue: 200
```

Each populated with realistic monitoring rule cross-links (e.g., CAP-PAY-CPU-001 might be linked to RULE-OPS-001 from Doc 2).

### `src/mocks/capacityTimeSeries.ts` — Time-series data

For each metric, generate 30 days of hourly data points (=720 points per metric, but for chart performance we'll downsample to daily averages = 30 points per metric for charts).

```typescript
// For CAP-PAY-CPU-001 (showing increasing trend)
[
  { timestamp: '2026-04-08T00:00:00Z', metricId: '<cap-pay-cpu>', value: 49, capacity: 100 },
  { timestamp: '2026-04-09T00:00:00Z', value: 51, capacity: 100 },
  // ... gradually increasing
  { timestamp: '2026-05-07T00:00:00Z', value: 65, capacity: 100 },
  { timestamp: '2026-05-08T00:00:00Z', value: 67, capacity: 100 },
]
```

Helper to generate realistic time series with trend + noise:

```typescript
function generateTimeSeries(
  metricId: string,
  startValue: number,
  endValue: number,
  capacity: number,
  days: number,
  noiseAmount: number = 5,
): CapacityDataPoint[] { /* ... */ }
```

### `src/mocks/capacityForecasts.ts` — Forecasts for top metrics

For 6 of the 12 metrics (the ones with concerning trends), generate forecast data:

```
FCT-CAP-PAY-CPU-001-30d
  metricId: CAP-PAY-CPU-001, predictionMethod: linear, forecastHorizonDays: 30
  predictions: [array of 30 points showing continued growth]
  predictedBreachDate: '2026-05-22' (about 14 days from now, hits 70% threshold)
  predictedCriticalDate: '2026-06-08'
  daysUntilBreach: 14
  confidence: high
  recommendation: "Scale up payment-api by 25% within 14 days. Consider adding 2 replicas."

FCT-CAP-PAY-DBCONN-001-30d
  Already at 90% — predictedBreachDate already passed
  recommendation: "Immediate action: pgbouncer migration via CHG-2026-00091 will resolve."

FCT-CAP-ORD-CPU-001-30d
  Linear forecast shows breach in ~8 days
  daysUntilBreach: 8

FCT-CAP-SEARCH-IOPS-001-30d
  Already 85% utilization, breach predicted in ~5 days

FCT-CAP-PAY-CPU-001-90d (longer horizon for same metric)
FCT-CAP-PAY-MEM-001-30d
```

For each forecast, generate `predictions` array with realistic linear progression + confidence intervals (±5-10%).

### `src/mocks/capacityThresholds.ts` — Threshold definitions

```
THR-CPU-PROD-001  CPU > 70% on production servers
  scope: applies to all metrics matching CPU + production tag
  severity: warning
  enabled: true
  triggerCount30d: 12
  autoScalingEnabled: false

THR-CPU-PROD-002  CPU > 85% on production servers
  severity: critical
  autoScalingEnabled: true
  autoScalingPolicy: "Add 1 replica per 100 RPS over threshold, max 5"

THR-MEM-PROD-001  Memory > 80% warning
THR-DBPOOL-001  DB connection pool > 80% (matches RULE-PAY-003)
THR-DISK-001  Disk usage > 75% on production

(8 thresholds total covering main resource types)
```

### `src/mocks/scalingRecommendations.ts` — 6 active recommendations

```
REC-2026-00012  Scale up payment-api (URGENT)
  metricId: CAP-PAY-CPU-001
  type: scale_up
  reason: "CPU utilization trending toward 85% threshold within 14 days"
  suggestedAction: "Increase replica count from 5 to 7"
  estimatedImpact: "Reduce p95 latency by 30%, prevent threshold breach"
  estimatedCostMonthlyUSD: 240
  priority: high
  daysUntilCriticalIfIgnored: 14
  status: open
  forecastId: FCT-CAP-PAY-CPU-001-30d

REC-2026-00011  Scale up order-api (high priority)
  metricId: CAP-ORD-CPU-001
  daysUntilCriticalIfIgnored: 8
  priority: high

REC-2026-00010  Increase Search ES storage IOPS (urgent)
  metricId: CAP-SEARCH-IOPS-001
  type: scale_up
  daysUntilCriticalIfIgnored: 5
  priority: urgent
  estimatedCostMonthlyUSD: 850

REC-2026-00009  Right-size Notification Gateway (cost optimization)
  metricId: CAP-NOTIF-QUEUE-001
  type: scale_down (current capacity is over-provisioned)
  reason: "Queue depth never exceeded 5% of capacity in last 90 days"
  estimatedCostMonthlyUSD: -180 (savings)
  priority: low

REC-2026-00008  Permanent fix in-flight (info only)
  metricId: CAP-PAY-DBCONN-001
  type: scale_up
  reason: "Pool saturation — being addressed by CHG-2026-00091"
  status: in_progress
  implementedViaChangeId: CHG-2026-00091

REC-2026-00007  Remove replica from internal-wiki (cost optimization)
  metricId: CAP-WIKI-USERS-001
  type: remove_replica
  status: dismissed
  dismissedReason: "Wiki traffic increases during company all-hands"
```

Helpers:
```typescript
export const getActiveSLAs = () => mockSLATargets.filter(...);
export const getActiveBreaches = () => mockSLABreaches.filter(b => b.status === 'active');
export const getOngoingOutages = () => mockOutages.filter(o => !o.endedAt);
export const getOutagesByService = (serviceId: string) => mockOutages.filter(o => o.serviceId === serviceId);
export const getMetricsByCI = (ciId: string) => mockCapacityMetrics.filter(m => m.ciId === ciId);
export const getOpenRecommendations = () => mockScalingRecommendations.filter(r => r.status === 'open');
export const getDailyHealthForService = (serviceId: string, days: number) => { /* returns last N days */ };
```

---

## 📄 PAGE 5a.1 — Availability Dashboard

**File:** `src/routes/availability/AvailabilityDashboard.tsx`
**Route:** `/availability`

### Page header

```
Availability
8 services tracked · 2 SLA breaches active · 3 outages ongoing · 99.32% avg uptime (30d)
                                    [Outages →] [SLA Targets →]   [Last 30d ▾]  [⤓ Export]
```

### Top KPI row (4 cards)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Avg Uptime (30d) │ MTTR (30d)       │ MTBF (30d)       │ Active Outages   │
│      99.32%      │   2h 14m         │    18 days       │       3          │
│ ▼ -0.18% prev 30d│ ▼ -23m vs prev   │ ▲ +3d vs prev    │ ↔ 2 unplanned    │
│ Target: 99.85%   │ Target: < 30 min │ Target: > 14 d   │ + 1 partial      │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Use existing KPICard component. Trend arrows + delta vs previous period.

### Hero section: 90-day Uptime Calendar Heatmap

This is the **showcase** of Availability dashboard (per Q3 decision):

```
SERVICE UPTIME — LAST 90 DAYS                                  [Service: All ▾] [Compact ▾]

                Feb        Mar              Apr              May
Service          11 18 25  4 11 18 25       1 8 15 22 29     6 8 (today)
─────────────────────────────────────────────────────────────────────
Payment Svc     ■■■■■■■  ■■■▤■■■■■■■■■■  ■■■■■■■▤■■■■■■■  ■■■■■■■▤
                                                              ↑
                                                        TODAY (major)

Auth Svc        ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■

Order Svc       ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■▤

Notif Gateway   ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■

Search Svc      ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■▤■■■▤

Analytics       ■■■■■■■  ■■■■■■■■■■■■■■  ■■■▤■■■■■■■■■■  ■■■■■■■■

Internal Wiki   ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■▣■

CI/CD Platform  ■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■■■■■■■  ■■■■■■■■

Legend: ■ operational  ▤ degraded  ▥ partial  ▦ major  ▣ maintenance  □ no data
```

Implementation specs:
- 8 rows (services) × 90 columns (days)
- Each cell = 12px × 16px (compact) or 16px × 20px (default)
- Cell color from `dailyServiceHealth.status`:
  - operational: `var(--ois-success)` (#12B76A)
  - degraded: `var(--ois-warning)` (#F79009)
  - partial_outage: `#FB923C` (orange)
  - major_outage: `var(--ois-danger)` (#F04438)
  - maintenance: `var(--ois-info)` (#0BA5EC)
- Hover any cell → tooltip showing: date, uptime %, incident count, outage minutes
- Click cell → navigate to `/availability/outages?service={id}&date={date}` with filter applied
- Today's column has subtle border highlight
- Service name on left links to service detail (placeholder for service routes)
- Right-most service: most recent days, today highlighted
- Header row shows month markers + week markers
- Toggle "Compact ▾" for more dense view (8px cells, no spacing)

### Two-column section

**Left (60%): MTTR/MTBF/MTRS trend chart**

```
┌─ MTTR Trend (30d) ───────────────────────────────────────────────────────┐
│                                                                            │
│  Recharts LineChart with 3 series (MTTR, MTBF, MTRS)                       │
│                                                                            │
│  Daily averages, X axis = date, Y axis = minutes                           │
│  Lines: MTTR (red), MTBF (green, scaled to thousands), MTRS (blue)         │
│  Reference lines: MTTR target (30 min, dashed), MTBF target (14d × 1440)   │
│                                                                            │
│  [Chart shows MTTR mostly stable around 25 min, spike to 60+ on bad days, │
│   recovering trend in last week]                                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Use Recharts `<LineChart>` with `<Line>` × 3 series, `<ReferenceLine>` for targets, `<Tooltip>` showing values, `<Legend>`.

**Right (40%): SLA Compliance Donut + breaches list**

```
┌─ SLA Compliance ─────────────────────┐
│                                        │
│   [Recharts PieChart, donut style]    │
│   6 meeting · 2 breached               │
│   ────                                 │
│   75% of SLAs meeting targets          │
│                                        │
│   [Legend with 8 services]             │
│                                        │
│   ────────────────                     │
│                                        │
│   ACTIVE BREACHES                      │
│   ⚠ Order Service                      │
│     78 min over budget (181%)          │
│     Linked: INC-2026-00183             │
│                                        │
│   ⚠ Search Service                     │
│     70 min over budget (132%)          │
│     Linked: INC-2026-00182, PRB-021    │
│                                        │
│   [View all SLAs →]                    │
└────────────────────────────────────────┘
```

### Bottom section: Recent outages timeline

```
┌─ Recent Outages — Last 30 days ──────────────────────[View all outages →]┐
│                                                                            │
│ Visual timeline (horizontal) showing outage durations                      │
│                                                                            │
│ Today      ━━━━ Payment Service major (ongoing) — 1h 12m                   │
│            ━━━━ Search Service partial (ongoing) — 3h 5m                   │
│            ━━━━ Order Service partial (ongoing) — 1h 38m                   │
│ 5d ago     ━━ Search Service unplanned — 16 min                            │
│ 5d ago     ━━━━ Payment Service major — 30 min                             │
│ 1w ago     ━━ Notification Gateway — 42 min                                │
│ 2w ago     ━ Payment Service partial — 7 min                               │
│ 3w ago     ━━━━ Analytics Pipeline major — 87 min                          │
│ 4w ago     ━ Internal Wiki maintenance (planned) — 2h                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

Each outage = a horizontal bar with width proportional to duration. Color matches outage type. Click → navigate to outage detail (which is part of `/availability/outages`).

---

## 📄 PAGE 5a.2 — SLA Targets

**File:** `src/routes/availability/SLATargets.tsx`
**Route:** `/availability/sla`

### Page header

```
SLA Targets
8 SLAs across 8 services · 6 meeting · 2 breached · Avg compliance: 75%
                                                          [+ New SLA target]
```

### Filter bar

```
[🔍 Search...]  [Service ▾]  [Tier ▾]  [Status ▾]  [Metric ▾]   [Reset]
```

### Stats strip

```
[All 8] [Meeting 6] [At Risk 0] [Breached 2]
[Critical tier: 3] [Important tier: 3] [Standard tier: 2]
```

### SLA cards (vertical list)

Each SLA = detailed card with error budget visualization:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ MEETING                                                  SLA-PAY-001    │
│                                                                            │
│ Payment Service                                            Critical tier   │
│ Availability target: 99.95% · Window: rolling 30 days                     │
│                                                                            │
│ Current performance                                                        │
│ ████████████████████████████████████████████████ 99.97%                   │
│ Target: 99.95%                                  ↑ exceeding by 0.02%      │
│                                                                            │
│ Error budget                                                               │
│ ████████████████████████░░░░░░░░░░░░░░░░░░░ 60% remaining                  │
│ 12.9 of 21.6 min consumed · 8.7 min remaining                              │
│                                                                            │
│ Owner: Tom Bergstrom (Service Owner)                                      │
│ Effective from: Jan 15, 2026 · Review due: Jul 15, 2026                  │
│                                                                            │
│                                                          [Edit] [History]  │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ BREACHED                                                  SLA-ORD-001   │
│                                                                            │
│ Order Service                                              Critical tier   │
│ Availability target: 99.9% · Window: rolling 30 days                      │
│                                                                            │
│ Current performance                                                        │
│ ████████████████████████████████████░░░░░░░░ 99.82%                       │
│ Target: 99.9%                                   ↓ below by 0.08%          │
│                                                                            │
│ Error budget                                                               │
│ ████████████████████████████████████████████████ EXHAUSTED               │
│ 78 of 43.2 min consumed · -34.8 min over (181%)                           │
│                                                                            │
│ Active breach: Started 1h 38m ago (INC-2026-00183)                        │
│                                                                            │
│ Linked items:                                                              │
│  • Active incident: INC-2026-00183                                        │
│  • Recent breaches: 2 in last 30 days                                     │
│                                                                            │
│ Owner: Tom Bergstrom                                                       │
│                                  [Open incident] [Acknowledge breach]      │
└────────────────────────────────────────────────────────────────────────────┘
```

Card visual rules:
- Status border at left: green (meeting), amber (at_risk), red (breached)
- Performance bar: green when at/above target, red when below
- Error budget bar:
  - 0-50% consumed: green
  - 50-80%: amber
  - 80-100%: orange
  - >100%: red with "EXHAUSTED" label

### Empty state

If filters yield no results: "No SLAs match. [Reset]"

---

## 📄 PAGE 5a.3 — Outage Log & Analysis

**File:** `src/routes/availability/Outages.tsx`
**Route:** `/availability/outages`

### Page header

```
Outage Log
24 outages last 90d · 3 ongoing · 18% planned · Total downtime: 12h 47m
                                              [Last 90d ▾]  [⤓ Export]
```

### Filter bar

```
[🔍 Search...]  [Type ▾]  [Service ▾]  [Severity ▾]  [Customer-facing ▾]  [Status ▾]   [Reset]
```

### Stats strip

```
[All 24] [Unplanned 16] [Planned 5] [Partial 2] [Detected only 1]
[P1 4] [P2 8] [P3 9] [P4 3]
[Customer-facing 14]
```

### Outages table (DataTable)

Columns: `Public ID | Type | Service | Started | Duration | Severity | Customer-facing | Triggered by | Root cause | Actions`

- **Type**: chip color-coded (unplanned=red, planned=blue, partial=orange, detected=gray)
- **Service**: link to service detail
- **Started**: relative + absolute on hover
- **Duration**: duration string for completed; "ongoing 1h 12m" for active
- **Severity**: SeverityBadge
- **Customer-facing**: ✓ icon if true
- **Triggered by**: linked incident (real link)
- **Root cause**: linked problem (real link)
- **Actions**: `⋮` menu — Open detail, Link incident, Edit root cause, Add preventive action

For ongoing outages, row has subtle red bg tint and animated pulse on duration cell.

Default sort: by `startedAt` desc.

### Charts row (above table)

```
┌─ Outage volume by week ──────────┬─ Outage causes ──────────────────┐
│                                    │                                    │
│ [Recharts BarChart]                │ [Recharts PieChart]                │
│                                    │                                    │
│ Last 13 weeks (90d)                │ By type:                           │
│ X = week, Y = outage count         │ - unplanned 67%                    │
│ Stacked by severity (P1-P4)        │ - planned 21%                      │
│                                    │ - partial 8%                       │
│                                    │ - detected only 4%                 │
└────────────────────────────────────┴────────────────────────────────────┘
```

### Outage detail (expandable inline OR side drawer)

Click outage row → side drawer (450px) opens with full details:

```
OUT-2026-00027 — Payment Service total outage           [Open in full view] [×]

  Type:           unplanned   Severity: P1   Customer-facing: yes
  Started:        May 3, 14:00 UTC
  Resolved:       May 3, 14:30 UTC
  Duration:       30 minutes
  Affected users: ~12,000

  ROOT CAUSE
  DB connection pool exhaustion (recurring pattern)
  Linked problem: PRB-2026-00018

  TRIGGERING INCIDENT
  INC-2026-00156 — Payment Service total outage
  → Open incident

  RESOLVING ACTION
  Restart of payment-worker pods (workaround per KB-00187)
  Permanent fix in progress: CHG-2026-00091

  PREVENTIVE ACTIONS
  • Migrate to pgbouncer pooling (CHG-091)
  • Add load testing to release validation
  • Reduce monitoring cooldown for pool saturation

  AFFECTED CIs
  • CI-APP-PAY-001 payment-api
  • CI-DB-PAY-001 pay-postgres-primary

  TIMELINE
  ●  14:00  Outage started (alerts fired)
  ●  14:01  Incident INC-2026-00156 created
  ●  14:03  P1 declared
  ●  14:10  Workaround initiated (pod restart)
  ●  14:18  Pool returned to normal
  ●  14:30  All checks green, outage resolved
```

---

## 📄 PAGE 5a.4 — Capacity Dashboard

**File:** `src/routes/capacity/CapacityDashboard.tsx`
**Route:** `/capacity`

### Page header

```
Capacity & Performance
12 metrics tracked · 3 thresholds breaching · 5 active scaling recommendations
                                  [Forecast →] [Thresholds →]    [Last 30d ▾]
```

### Top KPI row (4 cards)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Avg CPU (24h)    │ Avg Memory (24h) │ Scaling Recs     │ Forecast Alerts  │
│       62%        │      71%         │       5          │       4          │
│ ▲ +8% vs prev wk │ ▲ +3% vs prev    │ 1 urgent · 2 high│ Within 14 days   │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Hero: Critical Metrics (current state)

Top section shows metrics where utilization is concerning:

```
⚠ ATTENTION REQUIRED — 3 metrics at or near threshold

┌──────────────────────────────────────────────────────────────────────────┐
│ CAP-PAY-DBCONN-001  Payment Postgres connection pool                       │
│ ████████████████████████████████████████████████████████ 90% / 100%       │
│ ⚠ CRITICAL — exceeded warning threshold (80%) · trending up               │
│ Linked: INC-2026-00184 (active) · Permanent fix: CHG-2026-00091 in review │
│                                            [View metric →] [Acknowledge]   │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ CAP-SEARCH-IOPS-001  Search ES storage IOPS                                │
│ ████████████████████████████████████████████░░░░ 85% / 100%               │
│ ⚠ APPROACHING CRITICAL — within 5 days at current trend                   │
│ Linked recommendation: REC-2026-00010 (urgent)                             │
│                                            [View metric →] [Take action]   │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ CAP-ORD-CPU-001  Order API CPU                                             │
│ ████████████████████████████████████░░░░░░░░░░ 71% / 100%                 │
│ ⚠ APPROACHING WARNING — within 8 days at current trend                    │
│ Linked recommendation: REC-2026-00011 (high priority)                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Each card has subtle red/amber tint based on severity. Action buttons.

### All metrics grid (below hero)

```
ALL CAPACITY METRICS                                              [Compact ▾]

┌─ CAP-PAY-CPU-001 ────────────┬─ CAP-PAY-MEM-001 ────────────┐
│ Payment API CPU              │ Payment API Memory            │
│ Current: 67%                 │ Current: 78%                  │
│ ████████████████████████░░░░ │ ███████████████████████████░ │
│ Trend (7d): ↑ +12%           │ Trend (7d): ↔ +1%             │
│ Peak (24h): 82% · Peak (7d): │ Peak (7d): 81%                │
│   89%                        │                                │
│                              │                                │
│ Threshold: 70% / 85%         │ Threshold: 80% / 90%          │
│                              │                                │
│ [SparkLine showing 7d trend] │ [SparkLine showing 7d trend]  │
└──────────────────────────────┴──────────────────────────────┘

┌─ CAP-AUTH-CPU-001 ───────────┬─ CAP-ORD-CPU-001 ─────────────┐
│ Auth API CPU                 │ Order API CPU                  │
│ Current: 52% (healthy)       │ Current: 71% (warning)         │
│ ...                          │ ...                            │
└──────────────────────────────┴──────────────────────────────┘

(more metrics in 2-column grid)
```

Each metric card:
- Title + linked CI
- Big current value + utilization bar (color: green <70%, amber 70-85%, red >85%)
- Trend indicator (arrow + delta)
- Peak values (24h, 7d)
- Threshold values shown
- Mini sparkline (7d)
- Click card → expand inline to show full Recharts area chart with capacity reference line

### Right rail (sticky, 280px)

```
┌─ ACTIVE RECOMMENDATIONS ──────┐
│ 🔥 Urgent (1)                  │
│   REC-...010 Search IOPS      │
│   5 days until critical        │
│                                 │
│ ⚠ High (2)                     │
│   REC-...012 payment-api CPU  │
│   REC-...011 order-api CPU    │
│                                 │
│ ⚪ Low (1)                      │
│   REC-...009 Right-size notif │
│                                 │
│ [View all →]                    │
└────────────────────────────────┘

┌─ THRESHOLD STATUS ────────────┐
│ Active: 8 / 8                  │
│ Triggering now: 3              │
│ Triggered 30d: 142             │
│ [Manage →]                      │
└────────────────────────────────┘

┌─ CHANGE LINKAGE ──────────────┐
│ Capacity-driven changes:       │
│ • CHG-2026-00089 (order        │
│   replicas) — closed           │
│ • CHG-2026-00091 (pgbouncer)   │
│   — in review                  │
│                                │
│ [View change history →]        │
└────────────────────────────────┘
```

### Metric detail (when card clicked, expands inline)

```
EXPANDED VIEW — CAP-PAY-CPU-001

[Recharts AreaChart, large]

  Capacity (100% line) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Critical (85% line)  ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━
  Warning (70% line)   ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━ ━

  [Filled area chart showing actual values, gradient color]

   Apr 8           Apr 22          May 6 (today)
   ↑ baseline 55%  ↑ trend up      ↑ peak 89% (7d ago)

[Time range selector: 24h | 7d | 30d | 90d | Custom]
[Show capacity ✓]  [Show thresholds ✓]  [Show baseline ✓]  [Show forecast ▾]

LINKED MONITORING RULES
  • RULE-OPS-001 (Disk usage > 85%) — but for CPU equivalent
  • Last triggered: 3 days ago

LINKED FORECAST
  FCT-CAP-PAY-CPU-001-30d
  Predicted breach (70%): May 22 (14 days)
  Predicted critical (85%): June 8
  → Open forecast detail
```

---

## 📄 PAGE 5a.5 — Capacity Forecast

**File:** `src/routes/capacity/CapacityForecast.tsx`
**Route:** `/capacity/forecast`

### Purpose
Predictive view: "Where are we headed in 30 / 90 days?"

### Page header

```
Capacity Forecast
6 forecasts active · 4 predicted breaches within 14 days
                              [30 days] [90 days]    [Filter ▾]   [Generate forecast]
```

### Top alert section: Predicted Breaches

```
⚠ 4 PREDICTED BREACHES — Action recommended

┌──────────────────────────────────────────────────────────────────────────┐
│ 🔥 URGENT — Within 5 days                                                  │
│                                                                            │
│ CAP-SEARCH-IOPS-001  Search ES storage IOPS                                │
│                                                                            │
│ Today               In 5 days (predicted)                                  │
│   85% utilization → 100% utilization (CRITICAL THRESHOLD HIT)             │
│                                                                            │
│ Confidence: HIGH (linear trend, low variance)                              │
│ Recommendation: Increase storage tier from gp3 to io2                      │
│ Linked: REC-2026-00010                                                     │
│                                                                            │
│                                            [View forecast] [Take action]   │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ 🚨 CRITICAL — Already breached                                             │
│                                                                            │
│ CAP-PAY-DBCONN-001  Payment Postgres connection pool                       │
│ Currently 90% utilized · Permanent fix in CHG-2026-00091                  │
│                                                       [View change →]      │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ HIGH — Within 8 days                                                    │
│ CAP-ORD-CPU-001  Order API CPU                                             │
│ ...                                                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

### Forecast charts grid

For each metric with active forecast, show large Recharts:

```
FORECAST: CAP-PAY-CPU-001 — Payment API CPU                  [30d ▾]   [...]

[Recharts ComposedChart with:]
  - Solid line: historical (last 30 days)
  - Dashed line: predicted future (next 30 days)
  - Shaded area: 95% confidence band (lower-upper bounds)
  - Reference lines: warning (70%), critical (85%) thresholds
  - X axis: dates spanning past 30 days + future 30 days
  - Vertical line at "today" boundary
  - Tooltip on hover showing predicted value + CI

  Predicted breach: May 22 (14 days)
  Predicted critical: June 8
  Confidence: HIGH
  Method: Linear regression (R² = 0.89)

  [Recommendation panel below chart]
  • Scale up payment-api by 25% within 14 days (REC-2026-00012)
  • Estimated cost: +$240/month
  • Estimated impact: Reduce p95 latency 30%, prevent threshold breach
  [Implement via change →]
```

Layout: 2 columns of forecast cards on wide screens, stack on narrow.

### Forecast accuracy panel (right rail)

```
┌─ FORECAST ACCURACY ───────────┐
│ Last quarter:                  │
│ Linear:    87% accurate        │
│ Seasonal:  72% accurate        │
│ ARIMA:     91% accurate (slow) │
│                                 │
│ Default method: Linear         │
│ [Configure methods →]           │
└────────────────────────────────┘

┌─ TOP DRIVERS ─────────────────┐
│ Recent capacity changes:       │
│ • Order traffic +18% MoM       │
│ • Payment QPS +12% MoM         │
│ • Search ingestion +8% MoM     │
└────────────────────────────────┘
```

---

## 📄 PAGE 5a.6 — Capacity Thresholds

**File:** `src/routes/capacity/CapacityThresholds.tsx`
**Route:** `/capacity/thresholds`

### Page header

```
Capacity Thresholds
8 thresholds configured · 6 enabled · 3 currently triggering
                                                          [+ New threshold]
```

### Filter bar

```
[🔍 Search...]  [Severity ▾]  [Resource type ▾]  [Auto-scaling ▾]  [Status ▾]   [Reset]
```

### Thresholds table (DataTable)

Columns: `Public ID | Name | Resource | Severity | Threshold | Duration | Auto-scale | Triggers (30d) | Last triggered | Status | Actions`

- **Severity**: severity pill (info=blue, warning=amber, critical=red)
- **Threshold**: formatted with unit (e.g. "> 70%", "> 800 RPS")
- **Duration**: e.g. "5m sustained"
- **Auto-scale**: ✓ if enabled, with policy preview on hover
- **Triggers (30d)**: count + sparkline (mini chart of when it fired)
- **Status**: enabled toggle (inline switch)
- **Actions**: `⋮` — Edit, Test, View linked rules, View triggers, Disable, Delete

Default sort: by triggerCount30d desc (most active at top).

### Create threshold form (modal)

```
Create Capacity Threshold                                              [×]

Name *
[                                                                      ]

Description
[                                                                      ]

────

WHAT TO MONITOR
Select metric  [CAP-PAY-CPU-001 — Payment API CPU ▾]

────

WHEN TO TRIGGER
Severity   ○ Info    ◉ Warning    ○ Critical

Condition   [value > 70 % for at least 5 minutes ▾]

────

WHAT TO DO
Alert route  [ROUTE-CRITICAL-PROD ▾]   (manages who gets notified)

[ ] Auto-scaling enabled
    Policy: [Add 1 replica per 100 RPS over threshold, max 5]

────

LINK TO MONITORING
[ ] Auto-create monitoring rule from this threshold

                                              [Cancel] [Create]
```

After save, threshold appears at top of list. If "Auto-create monitoring rule" checked, also creates a rule in Doc 2 (visual only — show toast "Rule created: RULE-XXX").

---

## 🎨 SHARED COMPONENTS

### `src/components/availability/`

```
components/availability/
├── UptimeCalendarHeatmap.tsx       # 90-day grid heatmap
├── UptimeCalendarCell.tsx
├── SLACard.tsx                     # SLA card on /availability/sla
├── SLAStatusPill.tsx
├── ErrorBudgetBar.tsx              # Visual error budget consumption
├── MTTRTrendChart.tsx              # Recharts MTTR line chart
├── SLAComplianceDonut.tsx          # Donut chart
├── ActiveBreachesList.tsx
├── OutageRow.tsx                   # DataTable row for outages
├── OutageTypeChip.tsx
├── OutageTimeline.tsx              # Horizontal timeline
├── OutageDetailDrawer.tsx
├── OutageVolumeBarChart.tsx
└── OutageCausesPieChart.tsx
```

### `src/components/capacity/`

```
components/capacity/
├── MetricCard.tsx                  # Single metric in grid
├── MetricExpandedDetail.tsx        # Inline expansion with chart
├── UtilizationBar.tsx              # Color-coded based on thresholds
├── TrendIndicator.tsx              # Arrow + delta with color
├── CapacityChart.tsx               # Recharts AreaChart with thresholds
├── ForecastChart.tsx               # Recharts ComposedChart with prediction
├── ConfidenceBand.tsx              # SVG-based confidence interval shading
├── ScalingRecommendationCard.tsx   # Active rec card
├── ScalingRecommendationDetail.tsx
├── PredictedBreachAlert.tsx        # Hero alert on forecast page
├── ThresholdRow.tsx
├── ThresholdSeverityPill.tsx
├── ThresholdDistributionSparkline.tsx
├── NewThresholdModal.tsx
└── CriticalMetricsHero.tsx         # Top alert section on capacity dashboard
```

### Constants in `src/lib/constants.ts`

```typescript
export const slaStatusMeta_avail: Record<SLAStatus, { label: string; color: string; bg: string; icon: string }> = {
  meeting:  { label: 'Meeting',  color: '#067647', bg: '#ECFDF3', icon: 'CheckCircle' },
  at_risk:  { label: 'At Risk',  color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  breached: { label: 'Breached', color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
};

export const outageTypeMeta: Record<OutageType, { label: string; color: string; bg: string; icon: string }> = {
  unplanned:     { label: 'Unplanned',     color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
  planned:       { label: 'Planned',       color: '#0BA5EC', bg: '#F0F9FF', icon: 'Calendar' },
  partial:       { label: 'Partial',       color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  detected_only: { label: 'Detected only', color: '#475467', bg: '#F1F3F7', icon: 'Eye' },
};

export const dailyHealthColors: Record<string, string> = {
  operational:    '#12B76A',
  degraded:       '#F79009',
  partial_outage: '#FB923C',
  major_outage:   '#F04438',
  maintenance:    '#0BA5EC',
};

export const slaMetricMeta: Record<SLAMetric, { label: string; description: string; unit: string }> = {
  availability:       { label: 'Availability',       description: 'Uptime percentage',                  unit: '%' },
  mttr:               { label: 'MTTR',               description: 'Mean Time To Resolve',                unit: 'minutes' },
  mtbf:               { label: 'MTBF',               description: 'Mean Time Between Failures',         unit: 'days' },
  mtrs:               { label: 'MTRS',               description: 'Mean Time to Restore Service',       unit: 'minutes' },
  response_time:      { label: 'Response Time',      description: 'First response SLA',                  unit: 'minutes' },
  first_byte_latency: { label: 'p95 Latency',        description: 'p95 first-byte latency',              unit: 'ms' },
};

export const capacityResourceTypeMeta: Record<CapacityResourceType, { label: string; icon: string; defaultUnit: string }> = {
  cpu:                 { label: 'CPU',               icon: 'Cpu',         defaultUnit: '%' },
  memory:              { label: 'Memory',            icon: 'MemoryStick', defaultUnit: '%' },
  disk:                { label: 'Disk',              icon: 'HardDrive',   defaultUnit: '%' },
  network_bandwidth:   { label: 'Network',           icon: 'Network',     defaultUnit: 'Gbps' },
  db_connections:      { label: 'DB Connections',    icon: 'Database',    defaultUnit: 'connections' },
  queue_depth:         { label: 'Queue Depth',       icon: 'Layers',      defaultUnit: 'messages' },
  requests_per_second: { label: 'RPS',               icon: 'Activity',    defaultUnit: 'RPS' },
  storage_iops:        { label: 'Storage IOPS',      icon: 'HardDrive',   defaultUnit: 'IOPS' },
  concurrent_users:    { label: 'Concurrent Users',  icon: 'Users',       defaultUnit: 'users' },
};

export const capacityThresholdSeverityMeta: Record<CapacityThresholdSeverity, { label: string; color: string; bg: string }> = {
  info:     { label: 'Info',     color: '#0BA5EC', bg: '#F0F9FF' },
  warning:  { label: 'Warning',  color: '#DC6803', bg: '#FFFAEB' },
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2' },
};

export const recommendationPriorityMeta: Record<ScalingRecommendation['priority'], { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#475467', bg: '#F1F3F7' },
  medium: { label: 'Medium', color: '#0BA5EC', bg: '#F0F9FF' },
  high:   { label: 'High',   color: '#DC6803', bg: '#FFFAEB' },
  urgent: { label: 'Urgent', color: '#B42318', bg: '#FEF3F2' },
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace 6 placeholder routes:

```tsx
// Replace
{ path: 'availability',         element: <Placeholder ... /> },
{ path: 'availability/sla',     element: <Placeholder ... /> },
{ path: 'availability/outages', element: <Placeholder ... /> },
{ path: 'capacity',             element: <Placeholder ... /> },
{ path: 'capacity/forecast',    element: <Placeholder ... /> },
{ path: 'capacity/thresholds',  element: <Placeholder ... /> },

// With
{ path: 'availability',         element: <AvailabilityDashboard /> },
{ path: 'availability/sla',     element: <SLATargets /> },
{ path: 'availability/outages', element: <Outages /> },
{ path: 'capacity',             element: <CapacityDashboard /> },
{ path: 'capacity/forecast',    element: <CapacityForecast /> },
{ path: 'capacity/thresholds',  element: <CapacityThresholds /> },
```

---

## 🔗 CROSS-LINKING

Real links activated by Doc 5a:
- Availability uptime calendar cell → `/availability/outages?service={id}&date={date}` real
- SLA card → linked incident → `/incidents/{id}` real
- SLA card → linked breach → real (inline)
- Outage row → triggering incident → `/incidents/{id}` real
- Outage row → root cause problem → `/problems/{id}` real
- Outage row → resolving change → `/changes/{id}` real
- Capacity metric card → linked CI → `/cmdb/{ciId}` real
- Capacity metric → monitoring rules → `/monitoring/rules` real
- Capacity recommendation → implemented via change → `/changes/{id}` real
- Capacity threshold → linked rules → `/monitoring/rules` real
- Forecast → permanent fix change → `/changes/{id}` real (CHG-091 for pgbouncer)

**Update existing modules:**

1. **Doc 0 dashboard:**
   - Service Health Strip — clicking a service card now navigates to `/availability` filtered by that service (was placeholder)
   - Add small "Capacity alerts" indicator badge next to service health if metrics breaching
   - SLA breach context: Order Service tile shows `⚠ SLA Breached` mini-badge

2. **Doc 1 CMDB detail:**
   - Add "Capacity" tab section showing metrics for this CI (filter `mockCapacityMetrics` by ciId)
   - Add "Outages" sub-section in linked items showing recent outages affecting this CI

3. **Doc 2 monitoring detail:**
   - Monitoring rules linked to capacity metrics now have back-link to capacity metric

4. **Doc 3a incident detail:**
   - Incidents that triggered outages — show outage card in linked items
   - Sidebar SLA timer can reference SLA target

5. **Doc 4a change detail:**
   - Capacity-driven changes (e.g. CHG-089 order replicas) — link to triggering recommendation
   - CHG-091 detail can show "Resolves: 2 active SLA breaches"

---

## ✅ QUALITY CHECKLIST

- [ ] All 6 routes work without 404
- [ ] `/availability` shows 4 KPI cards with trend arrows
- [ ] 90-day uptime calendar heatmap renders for 8 services × 90 days = 720 cells
- [ ] Heatmap cells color-coded correctly per status
- [ ] Heatmap cell hover shows tooltip with date, uptime, incident count
- [ ] Heatmap cell click navigates to outages page filtered
- [ ] MTTR/MTBF/MTRS trend chart renders with 3 lines + reference targets
- [ ] SLA Compliance donut chart shows 6 meeting / 2 breached
- [ ] Active breaches list shows 2 active with linked incidents (real)
- [ ] Recent outages timeline horizontal bars proportional to duration
- [ ] `/availability/sla` shows 8 SLA cards with error budget bars
- [ ] Error budget bar color-coded (green/amber/orange/red exhausted)
- [ ] Breached SLAs (Order, Search) show prominently with active breach details
- [ ] `/availability/outages` shows 24 outages in DataTable
- [ ] Outage volume by week bar chart + outage causes pie chart render
- [ ] Outage row click opens side drawer with full details + linked items
- [ ] All cross-links to incidents/problems/changes work (real)
- [ ] `/capacity` shows critical metrics hero (top alert section) for 3 metrics
- [ ] All 12 metric cards in grid with utilization bars + sparklines
- [ ] Click metric card expands inline showing Recharts area chart
- [ ] Right rail shows recommendations + threshold status + change linkage
- [ ] `/capacity/forecast` shows predicted breach alerts at top
- [ ] Forecast charts render with Recharts ComposedChart (historical solid + future dashed + confidence band)
- [ ] Reference lines for thresholds visible
- [ ] Vertical "today" line at boundary
- [ ] Each forecast has recommendation panel
- [ ] `/capacity/thresholds` shows DataTable with 8 thresholds
- [ ] Status toggle inline (optimistic UI)
- [ ] New threshold modal works with metric picker, severity radio, condition builder
- [ ] All public IDs use mono font
- [ ] Recharts library renders smoothly (no console warnings)
- [ ] Doc 0 service health strip linked to availability page
- [ ] Doc 1 CMDB Capacity tab populated
- [ ] Doc 4a change detail shows SLA breach resolution context
- [ ] Sidebar nav highlights "Availability" or "Capacity" parent on routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/availability.ts` and `src/types/capacity.ts`, re-exported
2. Mock data: `slaTargets.ts`, `slaBreaches.ts`, `outages.ts`, `availabilityData.ts`, `dailyServiceHealth.ts`, `capacityMetrics.ts`, `capacityTimeSeries.ts`, `capacityForecasts.ts`, `capacityThresholds.ts`, `scalingRecommendations.ts`
3. Module components in `src/components/availability/` and `src/components/capacity/`
4. 6 route files in `src/routes/availability/` and `src/routes/capacity/`
5. Routing config updated
6. Sidebar items "Availability" and "Capacity" highlight correctly
7. Doc 0 dashboard / Doc 1 CMDB / Doc 4a change detail updated with real Doc 5a data

After generation, do not start Doc 5b yet. Wait for the next prompt.

---

*End of Doc 5a.*
