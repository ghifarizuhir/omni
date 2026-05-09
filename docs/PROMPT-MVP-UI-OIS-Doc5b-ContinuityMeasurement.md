# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 5b — Service Health Cluster: Service Continuity + Measurement & Reporting

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a + 4b + 5a sudah di-execute di Build Mode session yang sama.
> **Modules:** Service Continuity Management (§7.11) + Measurement & Reporting (§7.12)
> **Routes covered:** `/continuity/bia`, `/continuity/dr-plans`, `/continuity/tests`, `/dashboards`, `/dashboards/exec`, `/reports`, `/reports/builder`, `/metrics/catalog`
> **Companion:** Doc 5c (Continual Improvement) — to be applied after this.

---

## 🎯 SCOPE & DEPENDENCIES

Doc 5b covers:

1. **Service Continuity** — BIA matrix, DR plans library, DR test runner/history. "What happens when things go really wrong, and are we ready?"
2. **Measurement & Reporting** — Pre-built dashboards (exec/operational/SLA), reports list, metric catalog. "Are we measuring the right things?"

**Per decisions made earlier:**
- Service Continuity: **Comprehensive** — BIA matrix (service × RTO/RPO impact), DR test runner, plan executor wizard
- Measurement & Reporting: **Sedang** — pre-built dashboards (exec/operational/SLA) + reports list + metric catalog (no drag-drop builder)

**Reuse from Doc 0–5a:**
- AppShell, all UI primitives, Recharts, formatters
- Mock data: users, teams, services, CIs, incidents, problems, changes, availability metrics
- Cross-link: DR tests ↔ changes (Doc 4a), BIA ↔ services (CMDB Doc 1), reports ↔ incidents/SLAs (Doc 5a)

**To be added in Doc 5b:**
- Domain types: `BIAEntry`, `DRPlan`, `DRTestRun`, `DRTestStep`, `MeasurementDashboard`, `Report`, `MetricDefinition`
- Mock data: 5 BIA entries, 6 DR plans, 8 DR test runs (1 live), 3 pre-built dashboards, 8 reports, 20 metric definitions
- Module components in `src/components/continuity/` and `src/components/measurement/`
- 8 route implementations

---

## 🧩 DOMAIN TYPES (`src/types/continuity.ts`)

```typescript
import { ServiceTier } from './availability';

// Recovery objectives
export type RTOClass =
  | 'immediate'      // RTO < 15 min (tier-1 critical)
  | 'short'          // 15 min – 2 hours
  | 'medium'         // 2 – 8 hours
  | 'long'           // 8 – 24 hours
  | 'extended';      // > 24 hours

// Business impact levels
export type BIAImpactLevel = 'catastrophic' | 'critical' | 'major' | 'moderate' | 'minor';

// DR test types
export type DRTestType =
  | 'tabletop'       // Discussion exercise, no actual failover
  | 'functional'     // Partial test of specific components
  | 'full_failover'  // Complete failover simulation
  | 'chaos';         // Chaos engineering / fault injection

// DR test status
export type DRTestStatus =
  | 'planned'
  | 'in_progress'
  | 'passed'
  | 'passed_with_issues'
  | 'failed'
  | 'cancelled';

// DR plan status
export type DRPlanStatus = 'draft' | 'approved' | 'active' | 'under_review' | 'retired';

// === BUSINESS IMPACT ANALYSIS ENTRY ===
export interface BIAEntry {
  id: string;
  publicId: string;                  // e.g. "BIA-SVC-PAY-001"

  // Service
  serviceId: string;
  serviceName: string;
  serviceTier: ServiceTier;
  description: string;

  // Impact classification
  impactLevel: BIAImpactLevel;
  impactScore: number;               // 0-100 computed score

  // Recovery objectives
  rto: number;                       // Recovery Time Objective in minutes
  rpoMinutes: number;                // Recovery Point Objective in minutes
  rtoClass: RTOClass;

  // Financial impact
  estimatedHourlyCostUSD: number;    // Cost of outage per hour
  estimatedDailyCostUSD: number;

  // Customer impact
  affectedUserSegments: string[];    // e.g. ["customers", "internal_ops"]
  peakTrafficTimes: string;          // e.g. "9am-6pm UTC Mon-Fri"
  customerFacing: boolean;
  regulatoryCompliance: string[];    // e.g. ["PCI-DSS", "GDPR"]

  // Dependencies
  criticalDependencies: Array<{
    type: 'service' | 'ci' | 'external';
    referenceId: string;
    referenceName: string;
    dependencyType: 'hard' | 'soft';
    failoverAvailable: boolean;
  }>;

  // DR linkage
  linkedDRPlanIds: string[];
  linkedDRPlanPublicIds: string[];

  // Assessment
  lastReviewedAt: string;
  reviewedById: string;
  reviewedByName: string;
  nextReviewAt: string;
  approvedById?: string;
  approvedByName?: string;

  // Notes
  notes?: string;
  continuityRisks: string[];         // Known risks to continuity

  createdAt: string;
  updatedAt: string;
}

// === DR PLAN ===
export interface DRPlan {
  id: string;
  publicId: string;                  // e.g. "DRP-PAY-001"
  name: string;
  description: string;

  // Scope
  serviceIds: string[];
  serviceNames: string[];
  affectedCIIds: string[];
  biaEntryIds: string[];

  status: DRPlanStatus;

  // Plan details
  version: string;                   // e.g. "v3.2"
  objectives: string;                // Markdown — RTO/RPO targets
  triggerConditions: string[];       // When to invoke this plan

  // Sections (each is a Markdown block)
  activationProcedure: string;       // How to activate
  communicationPlan: string;         // Who to notify, how
  recoverySteps: DRPlanStep[];       // Ordered steps
  rollbackProcedure: string;         // How to rollback if recovery fails
  testingSchedule: string;           // How often to test

  // Roles
  incidentCommanderId?: string;
  communicationsLeadId?: string;
  technicalLeadId?: string;
  stakeholders: Array<{
    userId: string;
    userName: string;
    role: string;
  }>;

  // Test history
  lastTestedAt?: string;
  lastTestStatus?: DRTestStatus;
  testRunCount: number;

  // Approval
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  reviewDueAt: string;

  // Linkage
  linkedChangeIds: string[];         // Changes that updated this plan
  linkedKBSlugs: string[];

  createdAt: string;
  updatedAt: string;
}

export interface DRPlanStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;               // Markdown
  estimatedMinutes: number;
  owner: string;                     // Role or user
  critical: boolean;                 // Must complete for plan to succeed
  verificationCriteria: string;      // How to know this step succeeded
}

// === DR TEST RUN ===
export interface DRTestRun {
  id: string;
  publicId: string;                  // e.g. "DRT-2026-00018"

  planId: string;
  planPublicId: string;
  planName: string;                  // Denormalized

  type: DRTestType;
  status: DRTestStatus;

  // Execution context
  triggeredById: string;
  triggeredByName: string;
  environment: string;               // e.g. "DR environment", "staging"
  isLive: boolean;                   // Was real production involved?

  // Objectives for this test run
  objectives: string[];
  scope: string;                     // What was in scope

  // Schedule
  plannedDate: string;
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;

  // Results
  stepResults: DRTestStepResult[];
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;

  // Outcome
  rtoAchievedMinutes?: number;       // Actual RTO achieved
  rtoTargetMinutes?: number;
  rpoAchievedMinutes?: number;
  rpoTargetMinutes?: number;

  // Findings
  issues: DRTestIssue[];
  lessonsLearned?: string;
  recommendations?: string;

  // Participants
  participants: Array<{ userId: string; userName: string; role: string }>;

  // Linkage
  triggeredIncidentIds: string[];    // Any incidents during test
  linkedChangeIds: string[];         // Changes resulting from test findings

  // Sign-off
  reviewedById?: string;
  reviewedByName?: string;
  signedOffAt?: string;

  createdAt: string;
}

export interface DRTestStepResult {
  id: string;
  stepId: string;
  stepNumber: number;
  stepTitle: string;
  status: 'pending' | 'in_progress' | 'passed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  durationMinutes?: number;
  notes?: string;
  issues?: string[];
  executorId?: string;
  executorName?: string;
}

export interface DRTestIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor' | 'observation';
  title: string;
  description: string;
  stepId?: string;
  resolution?: string;
  linkedChangePublicId?: string;
  status: 'open' | 'in_progress' | 'resolved';
}
```

## 🧩 DOMAIN TYPES (`src/types/measurement.ts`)

```typescript
// Dashboard types
export type DashboardType = 'executive' | 'operational' | 'sla' | 'capacity' | 'custom';

// Report types
export type ReportType =
  | 'monthly_summary'
  | 'sla_report'
  | 'incident_report'
  | 'change_report'
  | 'availability_report'
  | 'capacity_report'
  | 'custom';

// Report format
export type ReportFormat = 'pdf' | 'csv' | 'excel' | 'json';

// Report frequency
export type ReportFrequency = 'on_demand' | 'daily' | 'weekly' | 'monthly' | 'quarterly';

// Metric value type
export type MetricValueType = 'count' | 'percentage' | 'duration' | 'bytes' | 'currency' | 'ratio';

// Metric category
export type MetricCategory =
  | 'availability'
  | 'reliability'
  | 'performance'
  | 'change_management'
  | 'incident_management'
  | 'capacity'
  | 'service_request'
  | 'knowledge';

// === DASHBOARD DEFINITION ===
export interface MeasurementDashboard {
  id: string;
  publicId: string;
  name: string;
  description: string;
  type: DashboardType;

  // Target audience
  audience: 'executives' | 'operations' | 'service_owners' | 'all';
  refreshInterval: number;           // Seconds; 0 = manual

  // Layout — ordered list of widgets
  widgets: DashboardWidget[];

  // Filters available
  timeRangeOptions: string[];        // e.g. ['7d', '30d', '90d', 'custom']
  defaultTimeRange: string;
  serviceFilter: boolean;            // Can filter by service

  // Audit
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
  metricIds: string[];               // Which metrics this widget shows
  span: 1 | 2 | 3 | 4;              // Grid columns (out of 4)
  config?: Record<string, unknown>;  // Chart-specific config
}

// === REPORT ===
export interface Report {
  id: string;
  publicId: string;                  // e.g. "RPT-2026-00142"
  name: string;
  description?: string;
  type: ReportType;

  // Schedule
  frequency: ReportFrequency;
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed';

  // Configuration
  timeRange: string;                 // e.g. "last_30d", "last_month"
  serviceIds: string[];              // Filter: which services
  includedMetrics: string[];         // Which metrics
  format: ReportFormat[];            // Available formats

  // Delivery
  deliverToUserIds: string[];
  deliverToEmails: string[];

  // History
  generatedCount: number;
  lastGeneratedAt?: string;
  availableVersions: Array<{
    id: string;
    generatedAt: string;
    format: ReportFormat;
    sizeKB: number;
    downloadUrl: string;             // Placeholder URL
  }>;

  // Ownership
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

// === METRIC DEFINITION (catalog entry) ===
export interface MetricDefinition {
  id: string;
  publicId: string;                  // e.g. "MET-AVAIL-001"
  name: string;
  displayName: string;
  description: string;
  category: MetricCategory;

  // Value
  valueType: MetricValueType;
  unit: string;                      // e.g. "%", "minutes", "count"
  formula?: string;                  // How it's computed

  // Current value (denormalized for catalog display)
  currentValue?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;

  // Targets / benchmarks
  target?: number;
  industryBenchmark?: number;
  benchmarkSource?: string;

  // Source
  sourceSystem: string;              // e.g. "Prometheus", "OIS Internal", "Calculated"
  updateFrequency: string;           // e.g. "real-time", "hourly", "daily"

  // Usage
  usedInDashboardIds: string[];
  usedInReportIds: string[];

  // Ownership
  ownerId: string;
  ownerName: string;

  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

In `src/types/index.ts`:
```typescript
export * from './continuity';
export * from './measurement';
```

---

## 🗄 MOCK DATA

### `src/mocks/biaEntries.ts` — 5 BIA entries

```
BIA-SVC-PAY-001  Payment Service
  impactLevel: catastrophic
  impactScore: 95
  rto: 15 (minutes)
  rpoMinutes: 5
  rtoClass: immediate
  estimatedHourlyCostUSD: 48000
  estimatedDailyCostUSD: 384000
  affectedUserSegments: ['customers', 'merchants', 'internal_finance']
  peakTrafficTimes: "8am-10pm UTC Mon-Sat, with peak 12pm-8pm"
  customerFacing: true
  regulatoryCompliance: ['PCI-DSS', 'SOX']
  criticalDependencies: [
    { type: 'ci', referenceId: 'CI-DB-PAY-001', referenceName: 'pay-postgres-primary', dependencyType: 'hard', failoverAvailable: true },
    { type: 'external', referenceId: 'ext-stripe', referenceName: 'Stripe Payment Gateway', dependencyType: 'hard', failoverAvailable: false },
    { type: 'service', referenceId: 'svc-002', referenceName: 'Authentication Service', dependencyType: 'hard', failoverAvailable: true },
  ]
  linkedDRPlanPublicIds: ['DRP-PAY-001']
  continuityRisks: [
    'DB connection pool exhaustion (known — PRB-2026-00018, permanent fix CHG-2026-00091)',
    'Stripe API regional outage has no fallback',
    'No geographic redundancy for payment-api',
  ]
  lastReviewedAt: 2026-04-01
  nextReviewAt: 2026-07-01
  reviewedByName: 'Tom Bergstrom'
  approvedByName: 'Sarah Chen'

BIA-SVC-AUTH-001  Authentication Service
  impactLevel: critical
  impactScore: 88
  rto: 30
  rpoMinutes: 10
  rtoClass: immediate
  estimatedHourlyCostUSD: 32000
  affectedUserSegments: ['all_users']
  customerFacing: true
  regulatoryCompliance: ['SOC2', 'GDPR']
  criticalDependencies: [
    { type: 'external', referenceName: 'SSO Provider (Okta)', failoverAvailable: false },
    { type: 'ci', referenceName: 'auth-postgres', failoverAvailable: true },
  ]
  linkedDRPlanPublicIds: ['DRP-AUTH-001']
  continuityRisks: [
    'SSO provider (Okta) has no fallback — would require emergency credential rotation',
    'No self-service password reset in offline mode',
  ]

BIA-SVC-ORD-001  Order Service
  impactLevel: critical
  impactScore: 82
  rto: 30
  rpoMinutes: 15
  rtoClass: short
  estimatedHourlyCostUSD: 28000
  affectedUserSegments: ['customers']
  customerFacing: true
  continuityRisks: ['MongoDB replica lag can cause data inconsistency during failover']
  linkedDRPlanPublicIds: ['DRP-ORD-001']

BIA-SVC-SEARCH-001  Search Service
  impactLevel: major
  impactScore: 65
  rto: 120
  rpoMinutes: 60
  rtoClass: short
  estimatedHourlyCostUSD: 12000
  affectedUserSegments: ['customers']
  customerFacing: true
  linkedDRPlanPublicIds: ['DRP-SEARCH-001']

BIA-SVC-ANALYTICS-001  Analytics Pipeline
  impactLevel: moderate
  impactScore: 45
  rto: 240
  rpoMinutes: 120
  rtoClass: medium
  estimatedHourlyCostUSD: 4000
  affectedUserSegments: ['internal_ops', 'data_team']
  customerFacing: false
  continuityRisks: ['Kafka schema drift on recovery']
  linkedDRPlanPublicIds: ['DRP-ANALYTICS-001']
```

Generate full objects with all fields populated; dates, notes, etc.

Helpers:
```typescript
export const getBIAByService = (serviceId: string) => mockBIAEntries.find(b => b.serviceId === serviceId);
export const getBIAByImpactLevel = (level: BIAImpactLevel) => mockBIAEntries.filter(b => b.impactLevel === level);
```

### `src/mocks/drPlans.ts` — 6 DR plans

```
DRP-PAY-001  Payment Service DR Plan
  serviceIds: [svc-001]
  status: active
  version: v3.2
  lastTestedAt: 2026-03-15
  lastTestStatus: passed_with_issues
  testRunCount: 8
  reviewDueAt: 2026-06-01
  approvedByName: 'Sarah Chen'
  approvedAt: 2026-03-20
  stakeholders: [Tom Bergstrom (Service Owner), David Okafor (Tech Lead), Helena Vasquez (Comms Lead)]
  triggerConditions: [
    "P1 incident lasting > 30 min without clear resolution path",
    "Payment database complete failure",
    "Stripe integration failure > 15 min",
    "Data center event affecting payment cluster",
  ]
  recoverySteps: [
    { stepNumber: 1, title: 'Declare DR event and notify stakeholders', estimatedMinutes: 5, critical: true },
    { stepNumber: 2, title: 'Assess scope and activate DR team', estimatedMinutes: 10, critical: true },
    { stepNumber: 3, title: 'Enable maintenance mode on checkout', estimatedMinutes: 2, critical: true },
    { stepNumber: 4, title: 'Failover to read replica (if DB failure)', estimatedMinutes: 15, critical: true },
    { stepNumber: 5, title: 'Re-route traffic to DR environment', estimatedMinutes: 20, critical: true },
    { stepNumber: 6, title: 'Run smoke tests on DR environment', estimatedMinutes: 10, critical: true },
    { stepNumber: 7, title: 'Disable maintenance mode and monitor', estimatedMinutes: 5, critical: true },
    { stepNumber: 8, title: 'Communicate resolution to stakeholders', estimatedMinutes: 5, critical: false },
    { stepNumber: 9, title: 'Begin post-recovery monitoring (4h)', estimatedMinutes: 240, critical: false },
    { stepNumber: 10, title: 'Conduct PIR within 48h', estimatedMinutes: 90, critical: false },
  ]
  linkedKBSlugs: ['payment-api-restart-procedure']

DRP-AUTH-001  Authentication Service DR Plan
  status: active, version: v2.1
  testRunCount: 5
  lastTestedAt: 2026-02-20
  reviewDueAt: 2026-05-20 (OVERDUE by 2 weeks!)

DRP-ORD-001  Order Service DR Plan
  status: active, version: v1.5
  testRunCount: 3

DRP-SEARCH-001  Search Service DR Plan
  status: under_review (being updated after recent ES incident)
  version: v1.2 (draft of v1.3 in progress)
  testRunCount: 2

DRP-ANALYTICS-001  Analytics Pipeline DR Plan
  status: active, version: v2.0
  testRunCount: 4
  lastTestStatus: passed

DRP-INFRA-001  Infrastructure / Platform DR Plan (cross-cutting)
  serviceIds: [all]
  status: approved
  version: v4.0
  testRunCount: 12
  lastTestedAt: 2026-04-15
  lastTestStatus: passed
  approvedAt: 2026-04-20
```

### `src/mocks/drTestRuns.ts` — 8 DR test runs (1 running)

```
DRT-2026-00018 — CURRENTLY RUNNING (showcase)
  planPublicId: DRP-PAY-001
  type: functional
  status: in_progress
  triggeredByName: 'Tom Bergstrom'
  environment: 'DR staging environment'
  isLive: false
  plannedDate: 2026-05-08 (today)
  startedAt: 2026-05-08T06:00:00Z
  objectives: [
    'Validate payment database failover within 15 minute RTO',
    'Verify checkout smoke tests pass in DR environment',
    'Test stakeholder notification procedure',
  ]
  scope: 'Payment API + Database failover (no real customer traffic affected)'
  totalSteps: 10
  completedSteps: 6
  failedSteps: 0
  stepResults: [
    { stepNumber: 1, status: 'passed', durationMinutes: 4 },
    { stepNumber: 2, status: 'passed', durationMinutes: 9 },
    { stepNumber: 3, status: 'passed', durationMinutes: 2 },
    { stepNumber: 4, status: 'passed', durationMinutes: 12 },
    { stepNumber: 5, status: 'passed', durationMinutes: 18 },
    { stepNumber: 6, status: 'in_progress', startedAt: 2026-05-08T08:25:00Z },
    { stepNumber: 7, status: 'pending' },
    { stepNumber: 8, status: 'pending' },
    { stepNumber: 9, status: 'pending' },
    { stepNumber: 10, status: 'pending' },
  ]
  issues: []  // None so far
  participants: [Tom Bergstrom (Test Lead), David Okafor (Technical), Helena Vasquez (Comms)]

DRT-2026-00017 — Recent, passed_with_issues
  planPublicId: DRP-PAY-001
  type: tabletop
  status: passed_with_issues
  completedAt: 2026-03-15
  rtoAchievedMinutes: 52 (target was 15 — MISSED)
  rpoAchievedMinutes: 8 (target 5 — MISSED)
  issues: [
    { severity: 'critical', title: 'RTO target missed by 37 minutes',
      description: 'Step 4 (DB failover) took 38 min instead of 15 min due to manual pgbouncer reconfiguration',
      resolution: 'Automate pgbouncer failover config — tracked in CHG-2026-00091',
      status: 'in_progress', linkedChangePublicId: 'CHG-2026-00091' },
    { severity: 'major', title: 'Communication template was outdated',
      description: 'Email template had wrong escalation contacts',
      resolution: 'Updated in DRP-PAY-001 v3.2',
      status: 'resolved' },
  ]
  lessonsLearned: 'Manual pgbouncer reconfiguration is the critical bottleneck. Automation is essential to meet 15-min RTO.'
  recommendations: 'Automate failover config scripts. Run functional test after pgbouncer migration (CHG-091).'

DRT-2026-00016 — DRP-AUTH-001, passed, 3 months ago
DRT-2026-00015 — DRP-ORD-001, passed, 4 months ago
DRT-2026-00014 — DRP-INFRA-001, passed, 3 weeks ago
DRT-2026-00013 — DRP-SEARCH-001, failed (search 4.2.0 rollback related), 5 months ago
DRT-2026-00012 — DRP-ANALYTICS-001, passed, 6 months ago
DRT-2026-00011 — DRP-PAY-001, full_failover, passed, 6 months ago
```

Helpers:
```typescript
export const getActiveDRTests = () => mockDRTestRuns.filter(t => t.status === 'in_progress');
export const getDRTestsByPlan = (planId: string) => mockDRTestRuns.filter(t => t.planId === planId || t.planPublicId === planId);
```

### `src/mocks/measurementDashboards.ts` — 3 pre-built dashboards

```
DASH-EXEC-001  Executive Dashboard
  type: executive
  audience: executives
  description: 'High-level service health and reliability snapshot for leadership'
  defaultTimeRange: '30d'
  viewCount30d: 142
  widgets: [
    { type: 'kpi_card', title: 'Overall SLA Compliance', span: 1 },
    { type: 'kpi_card', title: 'MTTR (30d)', span: 1 },
    { type: 'kpi_card', title: 'Change Success Rate', span: 1 },
    { type: 'kpi_card', title: 'Active Incidents', span: 1 },
    { type: 'line_chart', title: 'Availability Trend (8 services)', span: 4 },
    { type: 'bar_chart', title: 'Incident Volume by Priority', span: 2 },
    { type: 'pie_chart', title: 'Change Outcomes', span: 2 },
    { type: 'table', title: 'SLA Compliance by Service', span: 4 },
  ]

DASH-OPS-001  Operational Dashboard
  type: operational
  audience: operations
  description: 'Real-time operational health for the on-call team'
  defaultTimeRange: '7d'
  refreshInterval: 60
  viewCount30d: 389
  widgets: [
    { type: 'kpi_card', title: 'Active Incidents', span: 1 },
    { type: 'kpi_card', title: 'Active Deployments', span: 1 },
    { type: 'kpi_card', title: 'Failed Tests (24h)', span: 1 },
    { type: 'kpi_card', title: 'Capacity Alerts', span: 1 },
    { type: 'heatmap', title: 'Service Health (7d)', span: 4 },
    { type: 'line_chart', title: 'MTTR Trend', span: 2 },
    { type: 'bar_chart', title: 'Deployment Success Rate', span: 2 },
    { type: 'table', title: 'Active Outages', span: 4 },
  ]

DASH-SLA-001  SLA & Reliability Dashboard
  type: sla
  audience: service_owners
  description: 'SLA compliance, error budgets, and reliability metrics for service owners'
  defaultTimeRange: '30d'
  viewCount30d: 87
  widgets: [
    { type: 'kpi_card', title: 'SLA Compliance', span: 2 },
    { type: 'kpi_card', title: 'Error Budget Remaining', span: 2 },
    { type: 'bar_chart', title: 'SLA Performance by Service', span: 4 },
    { type: 'line_chart', title: 'Error Budget Burn Rate', span: 3 },
    { type: 'pie_chart', title: 'Outage Types', span: 1 },
    { type: 'table', title: 'SLA Breach Log', span: 4 },
  ]
```

### `src/mocks/reports.ts` — 8 reports

```
RPT-2026-00148  Monthly Service Reliability Summary — May 2026
  type: monthly_summary, frequency: monthly
  lastRunAt: 2026-05-01 (generated start of month)
  lastRunStatus: success
  availableVersions: [{ generatedAt: 2026-05-01, format: pdf, sizeKB: 248 }]

RPT-2026-00147  Monthly Incident Report — May 2026
  type: incident_report, frequency: monthly
  lastRunStatus: success

RPT-2026-00146  Q1 2026 Availability Review (quarterly)
  type: availability_report, frequency: quarterly
  lastRunAt: 2026-04-01
  availableVersions: [{ format: excel, sizeKB: 512 }, { format: pdf, sizeKB: 384 }]

RPT-2026-00145  Weekly Change Management Summary
  type: change_report, frequency: weekly
  nextRunAt: 2026-05-12 (next Monday)

RPT-2026-00144  SLA Compliance Report — Payment Service
  type: sla_report, frequency: monthly
  serviceIds: [svc-001]

RPT-2026-00143  Capacity Forecast Report — Q2 Planning
  type: capacity_report, frequency: on_demand
  lastRunAt: 2026-05-05

RPT-2026-00142  Service Request Fulfillment Statistics
  type: custom, frequency: weekly

RPT-2026-00141  Security & Compliance Summary — Apr 2026
  type: custom, frequency: monthly
  lastRunAt: 2026-05-01
```

### `src/mocks/metricDefinitions.ts` — 20 metric definitions

Grouped by category. Sample:

```
// AVAILABILITY (4)
MET-AVAIL-001  Overall Service Availability
  displayName: 'Service Availability (avg)',
  valueType: percentage, currentValue: 99.32, target: 99.85,
  trend: down, trendPercent: -0.18
  sourceSystem: OIS Internal

MET-AVAIL-002  Mean Time To Resolve (MTTR)
  valueType: duration, unit: 'minutes', currentValue: 134, target: 30
  industryBenchmark: 60, benchmarkSource: 'DORA 2024 State of DevOps'

MET-AVAIL-003  Mean Time Between Failures (MTBF)
  valueType: duration, unit: 'days', currentValue: 18, target: 14

MET-AVAIL-004  Error Budget Remaining (avg)
  valueType: percentage, currentValue: 52

// CHANGE MANAGEMENT (4)
MET-CHG-001  Change Success Rate
  valueType: percentage, currentValue: 87, target: 95
  industryBenchmark: 90

MET-CHG-002  Change Lead Time (submission to implementation)
  valueType: duration, unit: 'days', currentValue: 5.2, target: 3.0

MET-CHG-003  Change Failure Rate
  valueType: percentage, currentValue: 13, target: 5
  trend: up (getting worse)

MET-CHG-004  Emergency Change Rate
  valueType: percentage, currentValue: 7, target: 5

// INCIDENT MANAGEMENT (4)
MET-INC-001  P1/P2 Incident Count (30d)
  valueType: count, currentValue: 8

MET-INC-002  First Response SLA Compliance
  valueType: percentage, currentValue: 94.4, target: 95

MET-INC-003  Repeat Incident Rate
  valueType: percentage, currentValue: 24, target: 10

MET-INC-004  Incident → Problem Conversion Rate
  valueType: percentage, currentValue: 32, target: 20

// CAPACITY (3)
MET-CAP-001  Avg CPU Utilization (production)
  valueType: percentage, currentValue: 62, target: 70

MET-CAP-002  Avg Memory Utilization (production)
  valueType: percentage, currentValue: 71

MET-CAP-003  Capacity At-Risk Metrics Count
  valueType: count, currentValue: 3

// RELIABILITY (3)
MET-REL-001  Deployment Success Rate
  valueType: percentage, currentValue: 87, target: 95
  industryBenchmark: 92, benchmarkSource: 'DORA 2024'

MET-REL-002  Deployment Frequency (per service per week)
  valueType: ratio, currentValue: 3.2, target: 5.0
  industryBenchmark: 4.8

MET-REL-003  Test Pass Rate
  valueType: percentage, currentValue: 91, target: 95

// SERVICE REQUEST (1)
MET-SR-001  Service Request Fulfillment Time (avg hours)
  valueType: duration, unit: 'hours', currentValue: 28.4, target: 24.0

// KNOWLEDGE (1)
MET-KB-001  KB Helpful Rate
  valueType: percentage, currentValue: 91, target: 85
```

Each metric: populate all fields including `usedInDashboardIds`, `usedInReportIds` (cross-reference real IDs), tags.

---

## 📄 PAGE 5b.1 — BIA Matrix

**File:** `src/routes/continuity/BIAMatrix.tsx`
**Route:** `/continuity/bia`

### Page header

```
Business Impact Analysis
5 services assessed · 2 catastrophic/critical · RTO targets: 15–240 min
                                     [DR Plans →] [DR Tests →]   [+ New BIA entry]
```

### Hero: BIA Impact Matrix

```
BUSINESS IMPACT MATRIX                                     [Last reviewed ▾]

         Catastrophic    Critical    Major     Moderate    Minor
         ($38k+/hr)      ($20k+/hr)  ($10k+/hr) ($3k+/hr)   (<$3k)
  ───────────────────────────────────────────────────────────────────
  RTO     ┌──────────┐  ┌──────────┐
  < 15min │ Payment  │  │   Auth   │
          │  Service │  │  Service │
  ───────────────────────────────────────────────────────────────────
  RTO     └──────────┘  └──────────┘  ┌──────────┐
  15-2h                               │  Order   │
                                      │  Service │
  ───────────────────────────────────────────────────────────────────
  RTO              ┌──────────┐       └──────────┘
  2-8h             │  Search  │
                   │  Svc     │
  ───────────────────────────────────────────────────────────────────
  RTO              └──────────┘  ┌──────────┐
  8-24h                          │Analytics │
                                 │ Pipeline │
  ───────────────────────────────└──────────┘─────────────────────────
```

Matrix cells show service cards. Cell background tint based on quadrant severity:
- Top-left (catastrophic/immediate): deep red
- Adjacent cells: gradient to lighter shades
- Bottom-right: light green

Each service card in matrix:
- Service name
- RTO value
- Impact score badge
- Hover: shows full cost + regulatory compliance + dependency count
- Click: navigates to BIA entry detail drawer

### BIA entries list (below matrix)

DataTable with columns: `Service | Impact Level | RTO | RPO | Hourly Cost | Compliance | DR Plan | Last Reviewed | Status | Actions`

- **Impact Level**: pill color-coded (catastrophic=dark red, critical=red, major=orange, moderate=amber, minor=green)
- **RTO**: e.g. "15 min (Immediate)"
- **Hourly Cost**: formatted "$48,000"
- **Compliance**: small chips PCI-DSS / SOX / GDPR etc.
- **DR Plan**: linked plan publicId (real link)
- **Last Reviewed**: relative date; flag if overdue (DRP-AUTH-001 is overdue)
- **Actions**: `⋮` — Open detail, Edit, Review, Link DR plan, Export

### BIA Detail Drawer (when clicking matrix cell or table row)

Side drawer (500px) showing full BIA entry:

```
BIA-SVC-PAY-001 — Payment Service                              [Open full view] [×]

IMPACT ASSESSMENT
  Impact Level:  ● Catastrophic
  Impact Score:  95 / 100
  Hourly Cost:   $48,000 / hour
  Daily Cost:    $384,000 / day

RECOVERY OBJECTIVES
  RTO:   15 minutes (Immediate class)
  RPO:   5 minutes

SCOPE
  Customer-facing: Yes
  User segments: customers, merchants, internal_finance
  Peak traffic: 8am-10pm UTC Mon-Sat
  Compliance: PCI-DSS, SOX

CRITICAL DEPENDENCIES
  ⚠ pay-postgres-primary (CI)        Failover: ✓ available
  ⚠ Stripe Payment Gateway (external) Failover: ✗ NO FALLBACK
  ✓ Authentication Service            Failover: ✓ available

CONTINUITY RISKS
  ⚠ DB connection pool exhaustion (PRB-018, CHG-091 in progress)
  ⚠ Stripe regional outage — no fallback — CRITICAL GAP
  • No geographic redundancy for payment-api

LINKED DR PLAN
  DRP-PAY-001 — Payment Service DR Plan (v3.2)
  Status: Active · Last tested: Mar 15 (passed with issues)
  [Open DR plan →]

REVIEW
  Reviewed: Apr 1, 2026 by Tom Bergstrom
  Approved: Apr 5, 2026 by Sarah Chen
  Next review: Jul 1, 2026
```

---

## 📄 PAGE 5b.2 — DR Plans Library

**File:** `src/routes/continuity/DRPlans.tsx`
**Route:** `/continuity/dr-plans`

### Page header

```
DR Plans
6 plans · 4 active · 1 under review · 1 overdue for review
                                            [BIA →] [Tests →]   [+ New plan]
```

### Filter & stats

```
[🔍 Search...]  [Status ▾]  [Service ▾]  [Test status ▾]   [Reset]

[All 6] [Active 4] [Under review 1] [Draft 0] [Overdue review 1]
```

### Overdue review banner

```
┌──────────────────────────────────────────────────────────────────────┐
│ ⚠ 1 DR plan requires review                                           │
│ DRP-AUTH-001 (Authentication Service) — review was due May 20, 2026  │
│ Last tested Feb 20 · 2 weeks overdue                                  │
│                                                        [Review now →]  │
└──────────────────────────────────────────────────────────────────────┘
```

### DR plan cards (vertical list)

Each DR plan = detailed card:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ● ACTIVE                                                   DRP-PAY-001    │
│                                                                            │
│ Payment Service DR Plan                                         v3.2      │
│ Covers: Payment Service                                                    │
│                                                                            │
│ TRIGGER CONDITIONS (4)                                                     │
│ • P1 incident lasting > 30 min without clear resolution path              │
│ • Payment database complete failure                                        │
│ • (2 more) [Show all ▾]                                                   │
│                                                                            │
│ RECOVERY STEPS: 10 steps · Est. 72 min total                              │
│ ████████████████████████████████████████ 100% complete (on paper)         │
│                                                                            │
│ TEST STATUS                                                                │
│ Last tested: Mar 15, 2026 · ⚠ Passed with issues                          │
│ Issues: RTO missed (52min vs 15min target) · Fix: CHG-2026-00091          │
│                                                                            │
│ Linked BIA: BIA-SVC-PAY-001 (Catastrophic / 95/100)                       │
│ Review due: Jun 1, 2026 (in 24 days)                                       │
│ Approved: Sarah Chen · Apr 20                                              │
│                                                                            │
│               [Test now →]  [View steps]  [Export PDF]  [Open detail →]   │
└────────────────────────────────────────────────────────────────────────────┘
```

### DR Plan Detail (full page when clicking "Open detail →")

No separate route — opens in full-page modal/overlay. Or navigate to `/continuity/dr-plans/{planId}` (nested route, add to routing).

**Content:**

Tabs: `[Overview] [Recovery Steps] [Communication Plan] [Test History] [Linked BIA] [History]`

**Recovery Steps tab** — the executor view:

```
DRP-PAY-001 RECOVERY STEPS — VERSION 3.2

[In tabletop mode — no execution tracking]   [▶ Start DR Test →]

─── STEP 1 ──────────────────────────────────────────────────────
✓  Declare DR event and notify stakeholders              Est: 5 min
   [Critical step]
   
   Notify all stakeholders via emergency contact list.
   Post in #incidents and #payment-engineering.
   
   Verification: All contacts acknowledged within 5 min.

─── STEP 2 ──────────────────────────────────────────────────────
✓  Assess scope and activate DR team                    Est: 10 min
   [Critical step]
   
   Identify scope: full outage vs partial degradation.
   Activate IC (Tom Bergstrom), Tech Lead (David Okafor),
   Comms Lead (Helena Vasquez).
   
   Verification: DR team assembled in war room.

─── STEP 3 ──────────────────────────────────────────────────────
○  Enable maintenance mode on checkout                   Est: 2 min
   ...

(10 steps total)

─── ESTIMATED TOTAL: 72 min ─────────────────────────────────────
```

`[▶ Start DR Test →]` opens DR Test Runner wizard (see next page).

---

## 📄 PAGE 5b.3 — DR Tests

**File:** `src/routes/continuity/DRTests.tsx`
**Route:** `/continuity/tests`

### Page header

```
DR Test History
8 tests total · 1 in progress · 75% pass rate · Last test: today (running)
                                                          [+ Schedule test]
```

### Active test banner (when running)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ DR TEST IN PROGRESS                                                      │
│                                                                            │
│ DRT-2026-00018 — DRP-PAY-001: Payment Service DR Plan                     │
│ Functional test · DR staging environment · Started 2h 28m ago             │
│                                                                            │
│ Progress: 6 of 10 steps complete · 0 failures · Step 6 running           │
│                                                                            │
│ ██████████████████████████████████████░░░░░░░░░░░░░░░░░ 60%               │
│                                                                            │
│                                                    [View live test →]      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Filter & stats

```
[🔍 Search...]  [Plan ▾]  [Type ▾]  [Status ▾]  [Year ▾]   [Reset]
[All 8] [In Progress 1] [Passed 4] [Passed with issues 2] [Failed 1]
```

### Test runs as cards

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ◉ IN PROGRESS                                               DRT-2026-00018│
│                                                                            │
│ DRP-PAY-001 — Payment Service DR Plan                                     │
│ Functional test · DR staging · 60% · 6/10 steps · 0 issues so far        │
│ Started 2h 28m ago by Tom Bergstrom                                       │
│                                           [View live →]                   │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ PASSED WITH ISSUES                                       DRT-2026-00017│
│                                                                            │
│ DRP-PAY-001 — Payment Service DR Plan                                     │
│ Tabletop exercise · Not live · Mar 15 · 2h 12m                            │
│                                                                            │
│ RTO achieved: 52 min   Target: 15 min   ✗ MISSED (+37 min)               │
│ RPO achieved: 8 min    Target: 5 min    ✗ MISSED (+3 min)                │
│                                                                            │
│ Issues: 2 found (1 critical — RTO miss, 1 major — stale comm template)   │
│                                                                            │
│ Key finding: Manual pgbouncer reconfiguration blocked 15-min RTO target.  │
│ Fix: CHG-2026-00091 (automation — in review)                              │
│                                                                            │
│ Lessons learned: Automate failover config scripts.                        │
│                                           [View full report →]            │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ PASSED                                                   DRT-2026-00014│
│ DRP-INFRA-001 — Infrastructure DR Plan · Full failover · 3 weeks ago     │
│ RTO: 28 min (target 60 min ✓) · RPO: 12 min (target 30 min ✓)           │
│ Issues: 0 · Duration: 4h 15m                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### DR Test Runner Wizard (modal when clicking [▶ Start DR Test] or [+ Schedule test])

4-step wizard:

**Step 1: Select plan**

```
SELECT DR PLAN
──────────────────────────────────────────────────────────────────────────

◉ DRP-PAY-001 — Payment Service DR Plan (v3.2)
  Active · Last tested: Mar 15 (issues) · Approved

○ DRP-AUTH-001 — Authentication Service DR Plan (v2.1)
  Active · ⚠ Review overdue

○ DRP-ORD-001 — Order Service DR Plan (v1.5)
  Active · Last tested: 4 months ago

○ DRP-SEARCH-001 — Search Service DR Plan (v1.2)
  Under review

○ DRP-ANALYTICS-001 — Analytics Pipeline DR Plan
○ DRP-INFRA-001 — Infrastructure DR Plan

[Next →]
```

**Step 2: Configure test**

```
CONFIGURE TEST

Test type *
◉ Tabletop      (Discussion exercise, no actual systems affected)
○ Functional    (Test specific components in DR environment)
○ Full failover (Complete failover — requires sign-off)
○ Chaos         (Fault injection in staging)

Test environment *
◉ DR staging environment
○ Production (requires C-suite approval)

Date & time *
[2026-05-09] [10:00] UTC

Objectives *
[Validate payment database failover within 15 min RTO              ]
[Verify smoke tests pass in DR environment                          ]
[+ Add objective]

Scope *
[Payment API + Database failover (no real customer traffic affected) ]

Participants *
Test lead:   [Tom Bergstrom ▾]
Tech lead:   [David Okafor ▾]
Comms lead:  [Helena Vasquez ▾]
[+ Add participant]

[← Back]  [Next: Review →]
```

**Step 3: Review & confirm**

Summary of all selections with warnings (e.g. "Full failover requires C-suite approval" shows blocking warning). `[Schedule test]` / `[Start immediately]` buttons.

**Step 4: Success**

```
                        ✓ DR test scheduled!

                      DRT-2026-00019
                     Scheduled for May 9, 10:00 UTC

             DRP-PAY-001 · Tabletop · DR staging

                    [View test] [Back to tests]
```

### Live DR Test View (when running — inline expansion of the live test card)

When user clicks `[View live →]`:

```
DRT-2026-00018 — IN PROGRESS                                       [Pause] [Fail test]

DRP-PAY-001 Payment Service DR Plan · Functional test · 2h 28m running
Participants: Tom Bergstrom, David Okafor, Helena Vasquez

████████████████████████████████████████░░░░░░░░░░░░░░░ 60% · 6/10 steps

──────────────────────────────────────────────────────────────────
✓ STEP 1  Declare DR event and notify stakeholders         4 min  
✓ STEP 2  Assess scope and activate DR team                9 min  
✓ STEP 3  Enable maintenance mode on checkout              2 min  
✓ STEP 4  Failover to read replica (if DB failure)        12 min  
✓ STEP 5  Re-route traffic to DR environment              18 min  
◉ STEP 6  Run smoke tests on DR environment               [running — 12m so far]

          executor: David Okafor
          notes: [Running 6-case smoke test suite... 3/6 done]
          [✓ Mark passed]  [✗ Mark failed]  [Add note]

○ STEP 7  Disable maintenance mode and monitor             pending
○ STEP 8  Communicate resolution to stakeholders           pending
○ STEP 9  Begin post-recovery monitoring (4h)              pending
○ STEP 10 Conduct PIR within 48h                           pending
──────────────────────────────────────────────────────────────────

ISSUES FOUND: None so far

NOTES LOG
  [Tom, 06:05] Test started. Stakeholders notified.
  [David, 06:14] DB failover complete. 12 min (target 15). 
  [Helena, 06:28] Traffic routed to DR. Latency normal.
  [Add note...]

```

`[✓ Mark passed]` / `[✗ Mark failed]` buttons on active step advance the test flow. After last step, wizard closes with completion modal asking for findings and lessons learned.

---

## 📄 PAGE 5b.4 — Dashboards Index

**File:** `src/routes/measurement/DashboardsIndex.tsx`
**Route:** `/dashboards`

### Page header

```
Dashboards
3 pre-built dashboards · 142 views this month
                                                          [Reports →]
```

### Dashboard cards (grid, 3 columns)

```
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ 👔 Executive      │ │ ⚙ Operational     │ │ 📊 SLA &          │
│ Dashboard         │ │ Dashboard         │ │ Reliability       │
│                   │ │                   │ │                   │
│ High-level health │ │ Real-time ops     │ │ Error budgets &   │
│ for leadership    │ │ health for on-    │ │ SLA performance   │
│                   │ │ call team         │ │ for service owners│
│ Last viewed:      │ │ Last viewed:      │ │ Last viewed:      │
│ 2 hours ago       │ │ 12 min ago        │ │ 3 days ago        │
│                   │ │                   │ │                   │
│ 142 views (30d)   │ │ 389 views (30d)   │ │ 87 views (30d)    │
│                   │ │                   │ │                   │
│  [Open →]         │ │  [Open →]         │ │  [Open →]         │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

Cards are simple, inviting. Click → navigate to dashboard detail.

---

## 📄 PAGE 5b.5 — Executive Dashboard

**File:** `src/routes/measurement/ExecutiveDashboard.tsx`
**Route:** `/dashboards/exec`

### Page header

```
Executive Dashboard
                                      [Last 30d ▾]  [Service: All ▾]   [⤓ Export]
```

### KPI Row (4 large cards)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ SLA Compliance   │ MTTR             │ Change Success   │ Active Incidents  │
│    75%           │   2h 14m         │    87%           │       9          │
│ ▼ -12pp vs Q1   │ ▼ +14m vs prev   │ ▲ +2% vs prev    │ 1 P1 · 3 P2      │
│ Target: 100%     │ Target: 30 min   │ Target: 95%      │                  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Main charts (2 rows of 2)

**Row 1:**

```
┌─ Availability Trend (8 services, 30d) ──────┬─ Incident Volume by Priority ──┐
│                                              │                                 │
│ Recharts LineChart                           │ Recharts BarChart               │
│ 8 lines (1 per service)                      │ Stacked by P1/P2/P3/P4          │
│ X = date, Y = uptime %                       │ X = week, Y = count             │
│ Reference line at 99.9%                      │                                 │
│ Lines colored by service                     │ [Trend shows P2 spike this wk]  │
│                                              │                                 │
└──────────────────────────────────────────────┴─────────────────────────────────┘
```

**Row 2:**

```
┌─ Change Outcomes (30d) ──────────────────────┬─ SLA Compliance by Service ─────┐
│                                              │                                   │
│ Recharts PieChart (donut)                    │ Table with 8 rows:                │
│ closed_successful: 70%                        │                                   │
│ closed_failed: 13%                            │ Service       Current  Target    │
│ cancelled: 7%                                 │ Payment Svc    99.97%  99.95% ✓  │
│ in progress: 10%                              │ Auth Svc       99.99%  99.99% ✓  │
│                                              │ Order Svc      99.82%  99.90% ✗  │
│ [Legend]                                     │ Search Svc     98.41%  99.50% ✗  │
│                                              │ ...                               │
│                                              │ Color: ✓=green ✗=red              │
└──────────────────────────────────────────────┴───────────────────────────────────┘
```

### Summary stat block (below charts)

```
THIS MONTH AT A GLANCE

  25 incidents resolved    →  2h 14m avg MTTR    →  12h 47m total downtime
  15 changes implemented   →  87% success rate   →  2 failed, 1 rolled back
  25 service requests      →  78% fulfilled      →  2 SLA breaches active
  124 test runs            →  91% pass rate      →  4 content gaps in KB
```

Recharts: Use `<ResponsiveContainer>` for all charts to fill their containers properly.

---

## 📄 PAGE 5b.6 — Reports List

**File:** `src/routes/measurement/Reports.tsx`
**Route:** `/reports`

### Page header

```
Reports
8 reports · 5 scheduled · Last generated: today
                                          [Metric Catalog →]   [+ New report]
```

### Filter bar

```
[🔍 Search...]  [Type ▾]  [Frequency ▾]  [Format ▾]  [Status ▾]   [Reset]
```

### Stats strip

```
[All 8] [Monthly 4] [Weekly 2] [Quarterly 1] [On-demand 1]
[PDF available 7] [Excel available 3] [Last run < 7 days: 5]
```

### Reports table (DataTable)

Columns: `Public ID | Name | Type | Frequency | Last generated | Next run | Format | Actions`

- **Type**: chip
- **Frequency**: "Monthly", "Weekly", etc.
- **Last generated**: relative time + status dot (success=green, failed=red)
- **Next run**: relative ("in 3 days") or "On demand"
- **Format**: small format chips (PDF, Excel, CSV)
- **Actions**: `⋮` — View latest, Generate now, Edit schedule, Download, Archive

Default sort: by lastRunAt desc.

### Report Generation Modal (when "Generate now")

```
Generate Report                                                       [×]

Monthly Service Reliability Summary

  Time range:  [Last 30 days ▾]
  Services:    [All services ▾]
  Format:      [✓] PDF   [✓] Excel   [ ] CSV

  Deliver to: Sarah Chen (your email)
              [+ Add recipient]

                                            [Cancel] [Generate]
```

After generate: shows spinner then success toast "✓ Report generated. [Download PDF]".

### Report versions panel (when clicking "View latest" action)

Shows a drawer with version history:

```
RPT-2026-00146 — Q1 2026 Availability Review

Available versions:

  Apr 1, 2026 (Q1 close)
  📄 PDF — 384 KB   [Download]
  📊 Excel — 512 KB  [Download]

  Jan 1, 2026 (Q4 close)
  📄 PDF — 356 KB   [Download]
  📊 Excel — 491 KB  [Download]

  [Generate new version]
```

---

## 📄 PAGE 5b.7 — Report Builder

**File:** `src/routes/measurement/ReportBuilder.tsx`
**Route:** `/reports/builder`

### Purpose
Simple report configuration wizard. Not drag-drop (per Q6 decision = sedang). Step-by-step form for creating a new scheduled report.

### Page header

```
[← Reports]                                                    [Save as draft]
New Report
Configure your report parameters.
```

### Stepper (3 steps)

```
●━━━━━━━○━━━━━━━○
Content   Schedule  Delivery
```

### Step 1: Content

```
REPORT NAME *
[                                                                           ]

DESCRIPTION
[                                                                           ]

REPORT TYPE *
○ Monthly Summary      ◉ SLA Report       ○ Incident Report
○ Change Report        ○ Availability     ○ Capacity Report
○ Custom

TIME RANGE *
○ Last 7 days
◉ Last 30 days
○ Last 90 days
○ Last quarter
○ Custom range

SCOPE
Services:      [All services ▾]   (or pick specific services)
Selected:      [Payment Service ×] [Order Service ×] [+ Add]

INCLUDE METRICS
[✓] Availability / uptime
[✓] Incident volume and MTTR
[✓] Change success rate
[ ] Capacity utilization
[ ] Service request fulfillment

FORMAT
[✓] PDF  [✓] Excel  [ ] CSV  [ ] JSON

[Next: Schedule →]
```

### Step 2: Schedule

```
FREQUENCY *
○ On demand (generate manually)
○ Daily   (runs at 06:00 UTC)
◉ Weekly  (runs Monday 06:00 UTC)
○ Monthly (runs 1st of month 06:00 UTC)
○ Quarterly (runs 1st of Jan/Apr/Jul/Oct)

Start date: [2026-05-12]

[← Back]  [Next: Delivery →]
```

### Step 3: Delivery

```
NOTIFY WHEN READY

Recipients (email)
  [sarah.chen@acme.io ×]
  [tom.bergstrom@acme.io ×]
  [+ Add email]

IN-APP NOTIFICATION
  [✓] Send in-app notification to recipients

                                      [← Back]  [Save draft]  [Create report]
```

After create: navigate to `/reports` with new report at top + toast "✓ Report created."

---

## 📄 PAGE 5b.8 — Metric Catalog

**File:** `src/routes/measurement/MetricCatalog.tsx`
**Route:** `/metrics/catalog`

### Page header

```
Metric Catalog
20 metrics defined · 7 categories · Browse and understand all tracked metrics
                                                          [Reports →]
```

### Search + Filter bar

```
[🔍 Search metric name, description, formula...]  [Category ▾]  [Source ▾]  [Has target ▾]   [Reset]
```

### Category sidebar (left, 220px)

```
All categories (20)
────────────────────
📊 Availability (4)
🔄 Change Management (4)
🚨 Incident Management (4)
⚡ Capacity (3)
🛡 Reliability (3)
📋 Service Request (1)
📚 Knowledge (1)
```

Click category → filters main area. Active category highlighted.

### Metric cards (main area, 2-column grid)

Each metric:

```
┌──────────────────────────────────────────────────┐
│ MET-AVAIL-002                   [Availability]   │
│                                                    │
│ Mean Time To Resolve (MTTR)                        │
│                                                    │
│ Current       Target          Benchmark           │
│ 2h 14m        < 30 min        60 min (DORA)       │
│                                                    │
│ ▼ -14m vs prev 30d                                 │
│                                                    │
│ Formula: avg(resolved_at - created_at) per         │
│ incident, rolling 30d, P1-P4                       │
│                                                    │
│ Source: OIS Internal · Updated: real-time          │
│                                                    │
│ Used in: Executive Dashboard, Monthly Report       │
└──────────────────────────────────────────────────┘
```

Each card shows:
- publicId (mono) + category chip
- displayName (large, semibold)
- Current value vs target (color: green if meeting, red if not)
- Industry benchmark if available + source
- Trend (arrow + delta)
- Formula (truncated, expand on click)
- Source system + update frequency
- "Used in" (dashboard/report links)

### Empty state

If no metrics match: "No metrics match. [Reset filters] or [+ Define metric]"

### Metric detail (inline expansion)

Click card → expands in-place showing:

```
EXPANDED — Mean Time To Resolve (MTTR)

FULL FORMULA
avg(incident.resolved_at - incident.created_at)
filtered by: status='resolved' OR status='closed'
window: rolling 30 days
excludes: incidents with status='cancelled'

DESCRIPTION
Measures the average time from when an incident is created to when it is
fully resolved. Lower is better. DORA Elite performers achieve < 1 hour.

INTERPRETATION
• < 30 min = Elite (our target)
• 30 min – 2 hours = High (industry average)
• 2 – 8 hours = Medium
• > 8 hours = Low

CURRENT: 2h 14m (Medium tier)
Improvement needed to reach target: -104 min

TREND (30d chart)
[Recharts tiny LineChart showing MTTR over last 30 days]

HISTORY
May 2026:  2h 14m  (▼ improving)
Apr 2026:  2h 28m
Mar 2026:  2h 05m (best month)
Feb 2026:  3h 12m

USED IN
• Executive Dashboard (KPI card)
• Monthly Summary Report
• SLA & Reliability Dashboard
```

---

## 🎨 SHARED COMPONENTS

### `src/components/continuity/`

```
components/continuity/
├── BIAMatrix.tsx                   # The matrix grid visualization
├── BIAMatrixCell.tsx               # Single service card in matrix
├── BIAEntryRow.tsx                 # DataTable row
├── BIAImpactLevelPill.tsx
├── BIADetailDrawer.tsx             # Side drawer with full BIA detail
├── BIADependencyList.tsx
├── BIARiskList.tsx
├── DRPlanCard.tsx                  # Card in DR plans list
├── DRPlanStatusPill.tsx
├── DRPlanStepsViewer.tsx           # Read-only steps display
├── DRTestCard.tsx                  # Card in test history
├── DRTestStatusPill.tsx
├── DRTestTypeChip.tsx
├── DRTestResultsSummary.tsx        # RTO/RPO results + issues count
├── DRTestIssueCard.tsx
├── DRTestRunner/
│   ├── DRTestRunnerWizard.tsx      # 4-step scheduling wizard
│   ├── Step1SelectPlan.tsx
│   ├── Step2Configure.tsx
│   ├── Step3Review.tsx
│   └── Step4Success.tsx
├── LiveDRTestPanel.tsx             # Inline expansion for running test
├── DRTestStepRow.tsx               # Single step in live test
└── DRTestNotesLog.tsx
```

### `src/components/measurement/`

```
components/measurement/
├── DashboardCard.tsx               # Card on dashboards index
├── KPICardLarge.tsx                # Bigger KPI card for exec dashboard
├── AvailabilityTrendChart.tsx      # Multi-line Recharts LineChart
├── IncidentVolumeChart.tsx         # Stacked BarChart
├── ChangeOutcomesChart.tsx         # Donut PieChart
├── SLAComplianceTable.tsx          # Service × current/target table
├── SummaryStatBlock.tsx            # Text summary row
├── ReportRow.tsx                   # DataTable row for reports
├── ReportFrequencyPill.tsx
├── ReportGenerateModal.tsx
├── ReportVersionsDrawer.tsx
├── ReportBuilderWizard/
│   ├── Step1Content.tsx
│   ├── Step2Schedule.tsx
│   └── Step3Delivery.tsx
├── MetricCard.tsx                  # Metric in catalog grid
├── MetricExpandedDetail.tsx
├── MetricCategoryNav.tsx           # Left sidebar nav
├── MetricTrendMiniChart.tsx        # Tiny Recharts in card
└── MetricValueDisplay.tsx          # Value + target + trend inline
```

### Constants in `src/lib/constants.ts`

```typescript
export const biaImpactLevelMeta: Record<BIAImpactLevel, { label: string; color: string; bg: string; hourlyMin: number }> = {
  catastrophic: { label: 'Catastrophic', color: '#7F1D1D', bg: '#FEF2F2', hourlyMin: 38000 },
  critical:     { label: 'Critical',     color: '#B42318', bg: '#FEF3F2', hourlyMin: 20000 },
  major:        { label: 'Major',        color: '#DC6803', bg: '#FFFAEB', hourlyMin: 10000 },
  moderate:     { label: 'Moderate',     color: '#B45309', bg: '#FFFBEB', hourlyMin: 3000 },
  minor:        { label: 'Minor',        color: '#067647', bg: '#ECFDF3', hourlyMin: 0 },
};

export const rtoClassMeta: Record<RTOClass, { label: string; minutes: string; color: string }> = {
  immediate: { label: 'Immediate',  minutes: '< 15 min',   color: '#B42318' },
  short:     { label: 'Short',      minutes: '15 min–2h',  color: '#DC6803' },
  medium:    { label: 'Medium',     minutes: '2–8 hours',  color: '#B45309' },
  long:      { label: 'Long',       minutes: '8–24 hours', color: '#475467' },
  extended:  { label: 'Extended',   minutes: '> 24 hours', color: '#475467' },
};

export const drTestTypeMeta: Record<DRTestType, { label: string; description: string; icon: string }> = {
  tabletop:     { label: 'Tabletop',     description: 'Discussion exercise, no systems affected', icon: 'Users' },
  functional:   { label: 'Functional',   description: 'Partial component test in DR environment',  icon: 'Wrench' },
  full_failover:{ label: 'Full failover', description: 'Complete failover simulation',             icon: 'AlertTriangle' },
  chaos:        { label: 'Chaos',        description: 'Fault injection in staging',               icon: 'Zap' },
};

export const drTestStatusMeta: Record<DRTestStatus, { label: string; color: string; bg: string; dot: string }> = {
  planned:            { label: 'Planned',             color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  in_progress:        { label: 'In Progress',         color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  passed:             { label: 'Passed',              color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  passed_with_issues: { label: 'Passed with issues',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  failed:             { label: 'Failed',              color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:          { label: 'Cancelled',           color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const reportTypeMeta: Record<ReportType, { label: string; icon: string }> = {
  monthly_summary:     { label: 'Monthly Summary',     icon: 'Calendar' },
  sla_report:          { label: 'SLA Report',          icon: 'Target' },
  incident_report:     { label: 'Incident Report',     icon: 'AlertTriangle' },
  change_report:       { label: 'Change Report',       icon: 'Wrench' },
  availability_report: { label: 'Availability Report', icon: 'Activity' },
  capacity_report:     { label: 'Capacity Report',     icon: 'BarChart2' },
  custom:              { label: 'Custom',              icon: 'FileText' },
};

export const metricCategoryMeta: Record<MetricCategory, { label: string; icon: string; color: string }> = {
  availability:       { label: 'Availability',       icon: 'Activity',    color: '#0BA5EC' },
  reliability:        { label: 'Reliability',        icon: 'Shield',      color: '#067647' },
  performance:        { label: 'Performance',        icon: 'Zap',         color: '#DC6803' },
  change_management:  { label: 'Change Management',  icon: 'GitBranch',   color: '#6941C6' },
  incident_management:{ label: 'Incident Mgmt',     icon: 'AlertTriangle',color: '#B42318' },
  capacity:           { label: 'Capacity',           icon: 'Database',    color: '#475467' },
  service_request:    { label: 'Service Request',    icon: 'ClipboardList',color: '#0BA5EC' },
  knowledge:          { label: 'Knowledge',          icon: 'BookOpen',    color: '#067647' },
};
```

---

## 🔀 ROUTING UPDATE

```tsx
// Replace placeholders
{ path: 'continuity/bia',        element: <Placeholder ... /> },
{ path: 'continuity/dr-plans',   element: <Placeholder ... /> },
{ path: 'continuity/tests',      element: <Placeholder ... /> },
{ path: 'dashboards',            element: <Placeholder ... /> },
{ path: 'dashboards/exec',       element: <Placeholder ... /> },
{ path: 'reports',               element: <Placeholder ... /> },
{ path: 'reports/builder',       element: <Placeholder ... /> },
{ path: 'metrics/catalog',       element: <Placeholder ... /> },

// With (literal paths before param paths)
{ path: 'continuity/bia',        element: <BIAMatrix /> },
{ path: 'continuity/dr-plans',   element: <DRPlans /> },
{ path: 'continuity/tests',      element: <DRTests /> },
{ path: 'dashboards',            element: <DashboardsIndex /> },
{ path: 'dashboards/exec',       element: <ExecutiveDashboard /> },
{ path: 'reports',               element: <Reports /> },
{ path: 'reports/builder',       element: <ReportBuilder /> },
{ path: 'metrics/catalog',       element: <MetricCatalog /> },
```

---

## 🔗 CROSS-LINKING

Real links activated by Doc 5b:
- BIA entry → linked DR plan → `/continuity/dr-plans` real
- BIA entry → linked CIs → `/cmdb/{ciId}` real
- BIA entry → continuity risks (problems) → `/problems/{id}` real
- DR plan detail → linked KB → `/kb/{slug}` real
- DR test → linked change (fix from issues) → `/changes/{id}` real
- DR test → triggered incidents → `/incidents/{id}` real
- Executive dashboard → active incidents section → `/incidents` real
- Executive dashboard → SLA compliance table → `/availability/sla` real
- Metric catalog entries → used in dashboards → `/dashboards/{type}` real
- Report → service filter → service detail (placeholder)
- Reports list → metric catalog → `/metrics/catalog` real

**Update existing modules:**

1. **Doc 0 dashboard:**
   - "Today's agenda" / inbox `ibx-002` (DR test scheduled today) → real link to `/continuity/tests` and DRT-2026-00018
   - Notification `ntf-011` (Monthly report available) → real link to `/reports`
   - Service health strip cards — add tiny RTO badge per service (hover shows BIA summary)

2. **Doc 1 CMDB detail:**
   - "Linked Items" tab — add "BIA Impact" section when CI is in a BIA entry
   - Show RTO/RPO associated with this CI's service

3. **Doc 3a incident detail:**
   - Add "BIA context" panel in right sidebar when incident affects tier-1 service (shows RTO/RPO at risk, BIA score)

4. **Doc 4a change detail:**
   - DRP-PAY-001 recovery steps reference CHG-2026-00091 as fix for RTO miss → already exists, just make real link

5. **Doc 5a availability:**
   - SLA target cards: add "BIA RTO target: 15 min" cross-reference from BIA entry

---

## ✅ QUALITY CHECKLIST

- [ ] All 8 routes work without 404
- [ ] `/continuity/bia` shows BIA impact matrix as grid with service cards in correct quadrants
- [ ] Matrix cell colors reflect impact severity (catastrophic=dark red → minor=light green)
- [ ] Matrix cell hover shows cost + compliance + dependency summary
- [ ] BIA entries DataTable shows 5 rows with all columns
- [ ] Impact Level pill color-coded
- [ ] BIA detail drawer opens on row/cell click with full content
- [ ] Critical dependencies list shows failover availability
- [ ] Continuity risks list with cross-links (CHG-091, PRB-018)
- [ ] `/continuity/dr-plans` shows 6 plan cards
- [ ] Overdue review banner prominently shown (DRP-AUTH-001)
- [ ] DR plan card shows test history summary with RTO miss context
- [ ] `[▶ Start DR Test]` / `[Test now →]` opens 4-step wizard
- [ ] Wizard step 1 shows plans list with status context
- [ ] Step 2 type radios show descriptions
- [ ] Step 3 review shows all selections with warnings
- [ ] Wizard schedule/create navigates to `/continuity/tests` on success
- [ ] `/continuity/tests` shows 8 test run cards
- [ ] Active test banner for DRT-2026-00018 with progress (60%)
- [ ] Running card expands inline showing step-by-step progress
- [ ] DRT-2026-00017 (passed with issues) shows RTO miss prominently
- [ ] RTO achieved vs target displayed color-coded
- [ ] Issues list on test cards with severity badges
- [ ] Live DR test step marking works (✓ Pass / ✗ Fail)
- [ ] Notes log shows timestamped entries
- [ ] `/dashboards` shows 3 dashboard cards with view counts
- [ ] `/dashboards/exec` renders all 4 chart sections with real Recharts
- [ ] Availability trend line chart renders 8 services
- [ ] Incident volume stacked bar chart renders
- [ ] Change outcomes donut chart renders
- [ ] SLA compliance table color-coded correctly
- [ ] Summary stat block shows accurate numbers from real mock data
- [ ] Time range selector changes visible data
- [ ] `/reports` shows DataTable with 8 reports
- [ ] Generate now modal works with format checkboxes
- [ ] Version history drawer shows download buttons
- [ ] `/reports/builder` shows 3-step wizard
- [ ] Step 1 metric checkboxes + format options work
- [ ] Step 2 frequency radio + start date
- [ ] Step 3 email recipients + in-app toggle
- [ ] Create → navigates to `/reports` with toast
- [ ] `/metrics/catalog` shows 20 metrics in 2-column grid
- [ ] Category sidebar filters metrics
- [ ] Metric cards show current/target/benchmark with color-coded status
- [ ] Card expand shows full formula + interpretation + 30d mini chart + history
- [ ] Doc 0 inbox DRT-2026-00018 link works (real)
- [ ] Doc 0 notification monthly report link works
- [ ] Doc 3a incident sidebar shows BIA context for tier-1 services
- [ ] All public IDs use mono font
- [ ] All Recharts components wrapped in `<ResponsiveContainer>`
- [ ] Sidebar nav highlights "Continuity", "Measurement" parent on routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/continuity.ts` and `src/types/measurement.ts`, re-exported
2. Mock data: `biaEntries.ts`, `drPlans.ts`, `drTestRuns.ts`, `measurementDashboards.ts`, `reports.ts`, `metricDefinitions.ts`
3. Module components in `src/components/continuity/` and `src/components/measurement/`
4. 8 route files in `src/routes/continuity/` and `src/routes/measurement/`
5. Routing config updated
6. Sidebar items "Service Continuity", "Dashboards", "Reports", "Metrics" highlight correctly
7. Doc 0 / Doc 1 / Doc 3a / Doc 4a updated with real Doc 5b links

After generation, do not start Doc 5c yet. Wait for the next prompt.

---

*End of Doc 5b.*
