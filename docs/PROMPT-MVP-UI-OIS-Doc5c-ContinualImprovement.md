# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 5c — Service Health Cluster: Continual Improvement Management

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a + 4b + 5a + 5b sudah di-execute di Build Mode session yang sama.
> **Module:** Continual Improvement Management (§7.15)
> **Routes covered:** `/improvement`, `/improvement/[id]`, `/improvement/kanban`, `/improvement/heatmap`, `/improvement/benefits`
> **Companion:** Doc 6 (Platform Features) — final document after this.

---

## 🎯 SCOPE & DEPENDENCIES

Doc 5c covers **Continual Improvement Management** — the ITIL 4 practice of systematically identifying, tracking, and measuring service improvement initiatives. Karakter modul: **visual-heavy, analytics-forward**.

Per decisions:
- **Comprehensive**: Kanban board + Heatmap + Benefit tracker + ROI calculator
- **Volume**: 12 improvement initiatives (lean)

**Reuse from Doc 0–5b:**
- AppShell, all UI primitives, Recharts, formatters
- Mock data: users, teams, services, problems, changes, metrics, recommendations
- Cross-link: improvements ↔ problems (Doc 3a), improvements ↔ changes (Doc 4a), improvements ↔ capacity recommendations (Doc 5a), improvements ↔ metric definitions (Doc 5b)

**To be added in Doc 5c:**
- Domain types: `ImprovementInitiative`, `ImprovementUpdate`, `BenefitMeasurement`, `ROICalculation`
- Mock data: 12 improvement initiatives with full history, benefit measurements, ROI data
- Module components in `src/components/improvement/`
- 5 route implementations

---

## 🧩 DOMAIN TYPES (`src/types/improvement.ts`)

```typescript
import { Severity } from './common';

// Improvement initiative status
export type ImprovementStatus =
  | 'identified'       // New idea, not yet evaluated
  | 'evaluating'       // Being assessed for feasibility/impact
  | 'approved'         // Approved and prioritized
  | 'in_progress'      // Active work underway
  | 'validating'       // Work done, measuring outcomes
  | 'completed'        // Successfully delivered and validated
  | 'on_hold'          // Paused for now
  | 'cancelled';       // Won't do

// Category
export type ImprovementCategory =
  | 'reliability'       // Reduce incidents, improve uptime
  | 'performance'       // Speed, latency, throughput
  | 'security'          // Security posture improvements
  | 'process'           // Process efficiency, automation
  | 'cost'              // Cost reduction / optimization
  | 'compliance'        // Regulatory / audit driven
  | 'customer_experience' // UX, NPS, satisfaction
  | 'developer_experience'; // Internal tooling, DX

// Priority
export type ImprovementPriority = 'critical' | 'high' | 'medium' | 'low';

// Benefit type
export type BenefitType =
  | 'cost_reduction'
  | 'revenue_protection'   // Prevented outage loss
  | 'efficiency_gain'      // Time saved
  | 'risk_reduction'
  | 'compliance_value'
  | 'quality_improvement'; // e.g. NPS increase

// === IMPROVEMENT INITIATIVE ===
export interface ImprovementInitiative {
  id: string;
  publicId: string;              // e.g. "IMP-2026-00012"

  title: string;
  description: string;           // Markdown

  status: ImprovementStatus;
  category: ImprovementCategory;
  priority: ImprovementPriority;

  // Targets and metrics
  currentStateDescription: string;
  targetStateDescription: string;
  successMetrics: Array<{
    metricPublicId?: string;     // Reference to metric catalog
    metricName: string;
    currentValue: number;
    targetValue: number;
    unit: string;
    achievedValue?: number;      // Populated post-completion
  }>;

  // Impact estimate (before)
  estimatedBenefit: {
    primaryType: BenefitType;
    annualValueUSD: number;
    confidenceLevel: 'low' | 'medium' | 'high';
    description: string;
  };

  // Effort estimate
  estimatedEffortDays: number;
  estimatedCostUSD: number;

  // Calculated ROI
  estimatedROIPercent: number;   // (benefit - cost) / cost × 100

  // Actual results (post-completion or validating)
  actualBenefitUSD?: number;
  actualEffortDays?: number;
  actualCostUSD?: number;
  actualROIPercent?: number;

  // Timeline
  identifiedAt: string;
  approvedAt?: string;
  startedAt?: string;
  completedAt?: string;
  targetCompletionDate?: string;

  // Progress (0-100)
  progressPercent: number;

  // Ownership
  ownerId: string;
  ownerName: string;
  ownerTeamId: string;
  sponsorId?: string;            // Executive sponsor
  sponsorName?: string;

  // Linkage — what drove this improvement
  sourceType?: 'problem' | 'incident' | 'capacity_recommendation' | 'dr_finding' | 'audit' | 'proactive';
  linkedProblemPublicId?: string;
  linkedIncidentPublicId?: string;
  linkedRecommendationPublicId?: string;
  linkedDRTestPublicId?: string;
  linkedChangePublicIds: string[];  // Changes that implement this
  linkedMetricPublicIds: string[];  // Metrics this improvement targets

  // Updates log
  updates: ImprovementUpdate[];

  // Tags
  tags: string[];

  createdAt: string;
  updatedAt: string;
}

// === UPDATE (log entry) ===
export interface ImprovementUpdate {
  id: string;
  initiativeId: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  type: 'status_change' | 'progress_update' | 'comment' | 'metric_update' | 'linkage_added';
  body: string;                  // Markdown for comments, auto-generated for status changes
  fromStatus?: ImprovementStatus;
  toStatus?: ImprovementStatus;
  progressBefore?: number;
  progressAfter?: number;
}

// === BENEFIT MEASUREMENT ===
export interface BenefitMeasurement {
  id: string;
  initiativeId: string;
  initiativePublicId: string;

  measurementDate: string;
  periodLabel: string;           // e.g. "Q1 2026", "Month 1 post-launch"
  benefitType: BenefitType;

  // Value
  measuredValueUSD: number;
  cumulativeValueUSD: number;    // Running total
  isEstimate: boolean;           // true = projected, false = actual measurement

  // Supporting data
  supportingMetric?: string;     // e.g. "MTTR reduced from 2h14m to 45m"
  methodology?: string;          // How was this measured

  recordedById: string;
  recordedByName: string;
}

// === ROI CALCULATION ===
export interface ROICalculation {
  initiativeId: string;
  calculatedAt: string;
  // Costs
  implementationCostUSD: number;
  ongoingMonthlyCostUSD: number;
  totalCost12mUSD: number;
  // Benefits (12-month projection)
  projectedAnnualBenefitUSD: number;
  actualBenefitToDateUSD: number;
  // ROI
  roi12mPercent: number;
  paybackMonths: number;
  npv5yUSD: number;              // Net Present Value over 5 years (3% discount rate)
  // Scenario analysis
  pessimisticROI: number;        // If benefits come in 50% lower
  optimisticROI: number;         // If benefits come in 25% higher
}
```

In `src/types/index.ts`:
```typescript
export * from './improvement';
```

---

## 🗄 MOCK DATA

### `src/mocks/improvements.ts` — 12 initiatives

**Distribution by status:**
- identified: 2
- evaluating: 1
- approved: 2
- in_progress: 4 (the most interesting state)
- validating: 1
- completed: 2

**Distribution by category:**
- reliability: 4, process: 3, performance: 2, cost: 2, compliance: 1

**Required showcase initiatives** (link to existing story):

```
IMP-2026-00012  Establish quarterly capacity review process
  Status: approved
  Category: process
  Priority: medium
  Description: Create a formal quarterly review cycle to assess capacity across
    tier-1 services, preventing reactive scaling.
  currentState: "Capacity reviews are ad-hoc, triggered only by incidents"
  targetState: "Quarterly review cycle with documented findings and change actions"
  successMetrics: [
    { metricName: 'Capacity alerts (30d)', currentValue: 3, targetValue: 0, unit: 'count' },
    { metricName: 'Time to detect capacity issue', currentValue: 14, targetValue: 3, unit: 'days' },
  ]
  estimatedBenefit: {
    primaryType: 'risk_reduction',
    annualValueUSD: 180000,  // Prevented incidents (based on avg P2 cost × 3 incidents/quarter)
    confidenceLevel: 'medium',
    description: 'Prevent ~3 capacity-related P2 incidents per quarter at avg $15k each'
  }
  estimatedEffortDays: 5
  estimatedCostUSD: 4000
  estimatedROIPercent: 4400  // (180k - 4k) / 4k × 100
  progressPercent: 15
  ownerId: u-001 (Sarah Chen)
  sponsorName: 'Sarah Chen (Change Manager)'
  sourceType: problem
  linkedProblemPublicId: PRB-2026-00018
  linkedRecommendationPublicId: REC-2026-00012
  linkedChangePublicIds: []  // No change yet
  linkedMetricPublicIds: ['MET-CAP-003', 'MET-AVAIL-002']
  identifiedAt: 2026-04-30
  approvedAt: 2026-05-05
  targetCompletionDate: 2026-06-30
  tags: [process, capacity, reliability, q2-target]
  updates: [
    { type: 'status_change', fromStatus: 'identified', toStatus: 'approved', timestamp: 2026-05-05, body: 'Approved in Q2 planning meeting.' },
    { type: 'comment', timestamp: 2026-05-06, authorName: 'Sarah Chen', body: 'Scheduling kickoff for May 15. Tom Bergstrom confirmed as process sponsor.' },
  ]

IMP-2026-00011  Add load testing stage to CI/CD pipeline for tier-1 services
  Status: in_progress
  Category: reliability
  Priority: high
  sourceType: problem
  linkedProblemPublicId: PRB-2026-00018
  linkedChangePublicIds: ['CHG-2026-00091']  (RCA recommended action)
  progressPercent: 40
  estimatedEffortDays: 12
  estimatedCostUSD: 9600
  estimatedBenefit: {
    primaryType: 'risk_reduction',
    annualValueUSD: 320000,
    description: 'Catch performance regressions before production; prevent 2 P1 incidents per year'
  }
  estimatedROIPercent: 3233
  ownerId: u-001 (Sarah Chen)
  targetCompletionDate: 2026-05-30
  updates: [
    { type: 'status_change', fromStatus: 'approved', toStatus: 'in_progress', timestamp: 2026-04-28 },
    { type: 'progress_update', progressBefore: 0, progressAfter: 40, timestamp: 2026-05-06,
      body: 'k6 load test framework integrated. Base test suite written for payment-api. Auth-service next.' },
  ]

IMP-2026-00010  Migrate Kafka consumer compatibility validation
  Status: in_progress
  Category: process
  Priority: high
  sourceType: incident
  linkedIncidentPublicId: INC-2026-00170  (the failed Kafka migration)
  linkedChangePublicIds: ['CHG-2026-00080']
  progressPercent: 60
  description: 'Add consumer schema compatibility check to Kafka topic change process, preventing downstream failures'
  estimatedEffortDays: 8
  estimatedBenefit: { primaryType: 'risk_reduction', annualValueUSD: 120000 }
  updates: [
    { type: 'progress_update', progressAfter: 60, timestamp: 2026-05-01,
      body: 'Schema registry compatibility matrix implemented. Consumer test harness 60% done.' }
  ]

IMP-2026-00009  Reduce monitoring alert cooldown for payment pool saturation
  Status: completed
  Category: reliability
  Priority: medium
  progressPercent: 100
  completedAt: 2026-05-10
  sourceType: problem
  linkedProblemPublicId: PRB-2026-00018
  estimatedEffortDays: 1
  estimatedCostUSD: 800
  estimatedBenefit: { primaryType: 'risk_reduction', annualValueUSD: 24000,
    description: 'Faster detection reduces avg incident duration by 10 min' }
  actualBenefitUSD: 24000
  actualEffortDays: 0.5
  actualCostUSD: 400
  actualROIPercent: 5900
  successMetrics: [
    { metricName: 'Alert cooldown (pool saturation)', currentValue: 10, targetValue: 2, unit: 'minutes', achievedValue: 2 }
  ]
  updates: [
    { type: 'status_change', toStatus: 'completed', body: 'RULE-PAY-003 cooldown updated to 2 min. Validated in production.' }
  ]

IMP-2026-00008  Implement on-call runbook update process
  Status: in_progress
  Category: process
  Priority: medium
  progressPercent: 75
  description: 'Ensure runbooks are reviewed quarterly, with automated reminders and owner accountability'
  estimatedEffortDays: 3
  sourceType: dr_finding
  linkedDRTestPublicId: DRT-2026-00017  (DRT found outdated comms template)
  linkedMetricPublicIds: ['MET-KB-001']
  targetCompletionDate: 2026-05-20
  updates: [...]

IMP-2026-00007  Right-size Notification Gateway infrastructure
  Status: evaluating
  Category: cost
  Priority: low
  description: 'Notification Gateway is over-provisioned; can remove 1 replica saving $180/month'
  sourceType: capacity_recommendation
  linkedRecommendationPublicId: REC-2026-00009
  estimatedBenefit: { primaryType: 'cost_reduction', annualValueUSD: 2160 }
  estimatedEffortDays: 2
  estimatedCostUSD: 1600
  estimatedROIPercent: 35
  progressPercent: 0

IMP-2026-00006  Implement zero-downtime deployment for all tier-1 services
  Status: in_progress
  Category: reliability
  Priority: high
  progressPercent: 55
  estimatedEffortDays: 20
  estimatedCostUSD: 16000
  estimatedBenefit: { primaryType: 'revenue_protection', annualValueUSD: 480000,
    description: 'Eliminate planned downtime windows for tier-1 deploys (4 per quarter × 15 min × $48k/hr)' }
  estimatedROIPercent: 2900
  ownerId: u-005 (Yuki Tanaka)
  linkedMetricPublicIds: ['MET-REL-001', 'MET-REL-002']

IMP-2026-00005  Automate PCI-DSS evidence collection
  Status: completed
  Category: compliance
  Priority: high
  progressPercent: 100
  completedAt: 2026-03-20
  estimatedEffortDays: 10
  actualCostUSD: 8000
  actualBenefitUSD: 60000  // 3 days audit prep time saved × 4 engineers × $5k/day
  actualROIPercent: 650

IMP-2026-00004  Implement SLO-based error budget alerts
  Status: validating
  Category: reliability
  Priority: medium
  progressPercent: 90
  description: 'Automatically alert service owners when error budget burns faster than 2x baseline rate'
  estimatedEffortDays: 6
  ownerId: u-002 (Marcus Hill)
  linkedMetricPublicIds: ['MET-AVAIL-004']

IMP-2026-00003  Search service geo-redundancy POC
  Status: approved
  Category: reliability
  Priority: medium
  progressPercent: 5
  description: 'Investigate and prototype geographic redundancy for search to improve RTO from 2h to 30min'
  estimatedEffortDays: 30
  estimatedCostUSD: 24000
  estimatedBenefit: { primaryType: 'risk_reduction', annualValueUSD: 144000 }
  sourceType: problem
  linkedProblemPublicId: PRB-2026-00021

IMP-2026-00002  Internal developer portal modernization
  Status: identified
  Category: developer_experience
  Priority: low
  progressPercent: 0
  description: 'Replace legacy internal wiki with modern developer portal (Backstage or similar)'
  estimatedEffortDays: 60
  estimatedCostUSD: 48000

IMP-2026-00001  Implement chaos engineering baseline
  Status: identified
  Category: reliability
  Priority: low
  progressPercent: 0
  description: 'Run controlled chaos experiments monthly to proactively find weaknesses before incidents do'
  estimatedEffortDays: 20
  ownerId: u-005 (Yuki Tanaka)
```

For each initiative, ensure all fields are populated with realistic data. The `updates` array should have 2-5 entries.

**Benefit measurements** — for completed initiatives:

```typescript
// IMP-2026-00009 (monitoring cooldown — completed)
benefitMeasurements: [
  {
    measurementDate: '2026-05-10',
    periodLabel: 'Month 1 (post-completion)',
    benefitType: 'risk_reduction',
    measuredValueUSD: 2000,          // 1 incident detected 8 min earlier × $15k/hr = $2k saved
    cumulativeValueUSD: 2000,
    isEstimate: false,
    supportingMetric: 'INC-2026-00184 detected 8 min earlier due to reduced cooldown',
    recordedByName: 'Yuki Tanaka',
  }
]

// IMP-2026-00005 (PCI audit automation — completed Mar)
benefitMeasurements: [
  {
    measurementDate: '2026-04-01',
    periodLabel: 'Q1 Audit (actual)',
    benefitType: 'efficiency_gain',
    measuredValueUSD: 60000,
    isEstimate: false,
    supportingMetric: '3 days saved × 4 engineers at $5k/day rate',
  }
]
```

**ROI calculations:**

```typescript
// IMP-2026-00011 (load testing CI)
roiCalculation: {
  implementationCostUSD: 9600,
  ongoingMonthlyCostUSD: 200,   // CI compute time
  totalCost12mUSD: 12000,
  projectedAnnualBenefitUSD: 320000,
  actualBenefitToDateUSD: 0,    // Not complete yet
  roi12mPercent: 2567,
  paybackMonths: 0.45,          // Less than 2 weeks
  npv5yUSD: 1480000,
  pessimisticROI: 1283,
  optimisticROI: 3208,
}
```

Helpers:
```typescript
export const getImprovementById = (id: string) => mockImprovements.find(i => i.id === id || i.publicId === id);
export const getImprovementsByStatus = (status: ImprovementStatus) => mockImprovements.filter(i => i.status === status);
export const getImprovementsByCategory = (cat: ImprovementCategory) => mockImprovements.filter(i => i.category === cat);
export const getActiveImprovements = () => mockImprovements.filter(i => !['completed','cancelled'].includes(i.status));
export const getTotalEstimatedBenefitUSD = () => mockImprovements.reduce((sum, i) => sum + i.estimatedBenefit.annualValueUSD, 0);
export const getTotalActualBenefitUSD = () => mockBenefitMeasurements.reduce((sum, b) => sum + (b.isEstimate ? 0 : b.measuredValueUSD), 0);
```

---

## 📄 PAGE 5c.1 — Improvement Register (List)

**File:** `src/routes/improvement/ImprovementRegister.tsx`
**Route:** `/improvement`

### Page header

```
Continual Improvement Register
12 initiatives · 4 in progress · $1.29M estimated annual benefit portfolio
                      [Kanban →] [Heatmap →] [Benefits →]   [+ New initiative]
```

- Portfolio value is computed from sum of `estimatedBenefit.annualValueUSD` across active/in-progress/approved
- Secondary nav: 4 view links (List = current, Kanban, Heatmap, Benefits)

### Top KPI strip (4 cards, compact, single row)

```
┌──────────────┬───────────────┬───────────────┬────────────────┐
│ Portfolio    │ In progress   │ Completed     │ Actual benefit │
│ value (est.) │               │ (12 months)   │ realised       │
│ $1.29M/yr    │      4        │      2        │    $62k        │
└──────────────┴───────────────┴───────────────┴────────────────┘
```

### Filter bar

```
[🔍 Search title, description...]  [Status ▾]  [Category ▾]  [Priority ▾]  [Owner ▾]   [Reset]
```

### Stats strip

```
[All 12] [Identified 2] [Evaluating 1] [Approved 2] [In Progress 4] [Validating 1] [Completed 2] [On Hold 0]
[Reliability 4] [Process 3] [Performance 2] [Cost 2] [Compliance 1]
```

### Initiatives DataTable

Columns: `Priority | Public ID | Title | Status | Category | Progress | Est. benefit/yr | Owner | Linked to | Target date | Actions`

- **Priority**: colored dot (critical=red, high=orange, medium=amber, low=gray)
- **Public ID**: mono, links to `/improvement/{publicId}`
- **Title**: semibold, truncate with tooltip
- **Status**: StatusPill
- **Category**: category chip
- **Progress**: progress bar (0-100%) with % label
- **Est. benefit/yr**: formatted "$320k" with benefit type icon
- **Owner**: avatar + name
- **Linked to**: small linked entity chips (problem/incident/recommendation icon + publicId)
- **Target date**: relative date ("in 25d") or "—"; red if overdue
- **Actions**: `⋮` — Open, Edit, Move to kanban, Log update, Archive

Default sort: priority asc, then status (in_progress first), then targetCompletionDate asc.

### Quick filter chips

```
[🔥 High/Critical (3)]  [⏱ Overdue target (0)]  [📡 My initiatives (3)]  [💰 High ROI (5)]
```

### Empty state

If filtered to nothing: "No initiatives match. [Reset] or [+ Add initiative]"

---

## 📄 PAGE 5c.2 — Improvement Detail

**File:** `src/routes/improvement/ImprovementDetail.tsx`
**Route:** `/improvement/:initiativeId`

### Top bar

```
[← Register]                                              [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[reliability chip]                                 [In Progress ▾]
IMP-2026-00011  Add load testing stage to CI/CD pipeline for tier-1 services

  [High priority]  [reliability]  [process]

  Owner: Sarah Chen · Started Apr 28 · Target: May 30, 2026 (in 22 days)
  Source: PRB-2026-00018 (recurring problem RCA recommendation)
```

### Layout: center column (60%) + right sidebar (40%)

### Center column — tabs

```
[Overview] [Progress] [Metrics] [ROI] [Linked Items] [Updates (3)]
```

#### Tab: Overview

```
┌─ Current state ──────────────────────────────────────────────────────┐
│ Capacity reviews are ad-hoc, triggered only by incidents. No formal  │
│ process exists to proactively identify growing capacity pressure.     │
└────────────────────────────────────────────────────────────────────────┘

┌─ Target state ───────────────────────────────────────────────────────┐
│ A quarterly review cycle with documented findings, assigned owners,  │
│ and automatic change actions for capacity threshold breaches.         │
└────────────────────────────────────────────────────────────────────────┘

┌─ Estimated impact ───────────────────────────────────────────────────┐
│ Type: Risk reduction · Confidence: Medium                              │
│ Annual value: $320,000                                                 │
│                                                                         │
│ "Catch performance regressions before production; prevent ~2 P1        │
│  incidents per year at avg $160k each."                               │
│                                                                         │
│ Effort: 12 days estimated · Cost: $9,600                               │
│ Estimated ROI: 3,233%                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Progress

```
PROGRESS: 40%

████████████████████████████████████████░░░░░░░░░░░░░░░░░░░░  40%

Last updated: May 6, 2026 by Sarah Chen
"k6 load test framework integrated. Base test suite written for
 payment-api. Auth-service next."

─── PROGRESS HISTORY ──────────────────────────────────────────
●  Apr 28   0%   Started (status: evaluating → in_progress)
●  May 6   40%   k6 framework integrated, payment-api tests done
●  May 30  100%  Target
    Today ↑
```

`[Log progress update]` button → inline form: textarea + progress slider (0-100). Submit adds entry to updates log and bumps progressPercent.

#### Tab: Metrics

```
SUCCESS METRICS                             [Add metric]

┌─────────────────────────────────────────────────────────────────────┐
│ Metric               Current    Target    Achieved    Status         │
│ P1 incidents/qtr     3-4        0-1       —           (in progress)  │
│ CI pipeline gates    0          3         —           (in progress)  │
└──────────────────────────────────────────────────────────────────────┘

Note: Achieved values will be populated when initiative reaches 'validating' or 'completed' status.
```

For completed initiatives (IMP-2026-00009), show achievement:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Metric                  Current  Target  Achieved   Status           │
│ Alert cooldown (pool)   10 min   2 min   2 min ✓   ✓ Target met     │
└──────────────────────────────────────────────────────────────────────┘
```

Linked metric catalog entries are hyperlinked.

#### Tab: ROI

Full ROI analysis for in-progress/completed initiatives:

```
ROI ANALYSIS — IMP-2026-00011

ESTIMATED (PROJECTED)
─────────────────────────────────────────────────────────────────────────
Investment
  Implementation cost:    $9,600
  Ongoing cost (12m):     $2,400  ($200/mo CI compute)
  Total cost (12m):       $12,000

Returns (12-month projection)
  Projected annual benefit: $320,000
  Based on: 2 P1 incidents prevented × $160k avg impact

ROI
  12-month ROI:    2,567%
  Payback period:  0.45 months (< 2 weeks)
  NPV (5 years):   $1,480,000

SCENARIO ANALYSIS
  ────────────────────────────────────────────────────────
                    Pessimistic   Base case   Optimistic
  Benefits          $160,000      $320,000    $400,000
  ROI               1,283%        2,567%      3,208%
  ────────────────────────────────────────────────────────
  Pessimistic: benefits come in 50% lower than estimated
  Optimistic:  benefits come in 25% higher than estimated

[Recharts BarChart — scenario comparison, 3 bars]

ACTUAL (TO DATE)
  Benefit realized: $0 (initiative not yet complete)
  Target date: May 30, 2026
```

For IMP-2026-00009 (completed):

```
ACTUAL vs ESTIMATED

  Metric          Estimated    Actual
  Cost            $800         $400     ✓ Under budget by 50%
  Effort          1 day        0.5 day  ✓ Faster than expected
  Annual benefit  $24,000      $24,000  ✓ On target

  Actual ROI: 5,900%  (vs 2,900% estimated)
```

#### Tab: Linked Items

Sections showing linked entities:
- Source problem/incident (with cross-link)
- Linked changes (CHG-... with status)
- Linked capacity recommendations
- Linked metric catalog entries
- Linked DR test (if sourceType=dr_finding)

#### Tab: Updates (N)

Chronological update log showing all status changes, progress updates, and comments.

```
●  May 6, 2026 · Sarah Chen
   Progress: 0% → 40%
   "k6 load test framework integrated. Base test suite written for
    payment-api. Auth-service next."

●  Apr 28, 2026 · Sarah Chen
   Status: approved → in_progress
   "Kicking off this week. Team allocated for sprint."
```

`[Add update]` button at bottom → textarea + status change dropdown (optional) + submit.

### Right sidebar (sticky, 280px)

```
┌─ At a glance ─────────────┐
│ Status    ● In Progress   │
│ Priority  High            │
│ Category  Reliability     │
│ Progress  40%             │
│ Owner     Sarah Chen      │
│ Started   Apr 28, 2026    │
│ Target    May 30 (22d)    │
└────────────────────────────┘

┌─ ROI summary ─────────────┐
│ Est. ROI     3,233%       │
│ Payback      < 2 weeks    │
│ Annual value $320,000     │
│ Confidence   Medium       │
│ [Full ROI →]              │
└────────────────────────────┘

┌─ Quick actions ───────────┐
│ [Log update]              │
│ [Move to Kanban board →]  │
│ [Link change]             │
│ [Mark as complete]        │
│ [Put on hold]             │
└────────────────────────────┘
```

---

## 📄 PAGE 5c.3 — Improvement Kanban Board

**File:** `src/routes/improvement/ImprovementKanban.tsx`
**Route:** `/improvement/kanban`

### Purpose
Visual board for managing improvement flow. 6 columns = lifecycle stages.

### Page header

```
Improvement Kanban
                                    [Register →] [Heatmap →] [Benefits →]   [+ New]
```

### Filter bar (above board)

```
[Category: All ▾]  [Owner: All ▾]  [Priority: All ▾]   [Reset]
```

### Board layout

6 columns; horizontal scroll if needed:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                   │
│ IDENTIFIED (2)    EVALUATING (1)    APPROVED (2)      IN PROGRESS (4)   VALIDATING (1)   COMPLETED (2)           │
│ ──────────────    ──────────────    ─────────────     ──────────────    ─────────────    ─────────────           │
│                                                                                                                   │
│ [IMP-2026-00002]  [IMP-2026-00007]  [IMP-2026-00012]  [IMP-2026-00011]  [IMP-2026-00004] [IMP-2026-00009] ✓     │
│  Dev portal        Right-size        Quarterly cap.    Load testing CI   SLO error         Monitoring           │
│  modernize.        Notification Gw   review process    ████░░ 40%        budget alerts     cooldown             │
│  👤 identified     evaluating         approved         High · Sarah      ████████░ 90%     ████████ 100%         │
│                   Cost · Low          Process · Med    S. Chen                              completed            │
│                                                                                                                   │
│ [IMP-2026-00001]                    [IMP-2026-00003]  [IMP-2026-00006]                   [IMP-2026-00005] ✓     │
│  Chaos engineering                   Search geo-red.   Zero-downtime     (Validated, no   PCI audit auto.       │
│  baseline                            POC               deployment        new)              completed            │
│  👤 identified                       Reliability ·     ██████░ 55%                                              │
│                                       Medium            High · Yuki                                              │
│                                                                                                                   │
│                                                        [IMP-2026-00010]                                          │
│                                                         Kafka consumer                                           │
│                                                         validation                                               │
│                                                         ████░░░ 60%                                             │
│                                                         High · Aisha                                             │
│                                                                                                                   │
│                                                        [IMP-2026-00008]                                          │
│                                                         On-call runbook                                          │
│                                                         update process                                          │
│                                                         ████████░ 75%                                           │
│                                                         Medium · Marcus                                          │
│                                                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Kanban card design

Each card:

```
┌────────────────────────────────────┐
│ [High] ●  reliability              │
│                                     │
│ Add load testing stage to          │
│ CI/CD for tier-1 services          │
│                                     │
│ IMP-2026-00011                     │
│                                     │
│ ████████████░░░░░░░ 40%            │
│                                     │
│ 👤 Sarah Chen  📅 May 30           │
│ $320k/yr  ·  3,233% ROI            │
└────────────────────────────────────┘
```

Card shows:
- Priority dot + category chip (top row)
- Title (truncate, 2 lines max)
- publicId (mono, muted)
- Progress bar (for in_progress/validating; hidden for identified/evaluating/approved)
- Owner avatar + name + target date
- Estimated benefit/yr + ROI (compact, muted)
- Hover: subtle elevation
- Click card → navigate to `/improvement/{publicId}`
- On completed column: green tint + ✓ badge

### Drag-drop (visual only)

Cards appear draggable. Dragging over a different column highlights it. On drop, shows toast: "Status updated to [New Status]" and card moves columns. In MVP, this is purely visual state management (React `useState`); no backend.

### Column headers

Each column header:
- Column name + count badge
- Sum of estimated benefit for items in that column (small, muted)
- `[+ Add]` shortcut for that status

For `COMPLETED` column:
- Show total actual benefit realized (e.g. "Actual: $62k realized")

### Empty column state

```
[dashed border]
Drop here or [+ Add]
```

---

## 📄 PAGE 5c.4 — Improvement Heatmap

**File:** `src/routes/improvement/ImprovementHeatmap.tsx`
**Route:** `/improvement/heatmap`

### Purpose
Two-dimensional view of improvement portfolio: **Priority × Category**, sized by benefit value, colored by status. Shows where effort is concentrated and where gaps exist.

### Page header

```
Improvement Portfolio Heatmap
                                    [Register →] [Kanban →] [Benefits →]
```

### Filter bar

```
[Status: Active ▾]   [Size by: Est. benefit ▾]   [Color by: Status ▾]
```

### Main heatmap visualization

**Layout option A: Bubble chart matrix (preferred)**

X-axis = category (8 categories)
Y-axis = priority (critical → low, top to bottom)

Each initiative = a bubble:
- Size = proportional to `estimatedBenefit.annualValueUSD` (min 20px, max 80px diameter)
- Color = status color
- Label = publicId (short) or title (truncated)

```
Priority │  Reliability  Process  Performance  Cost  Compliance  DX
─────────┼────────────────────────────────────────────────────────────
Critical │
         │
High     │  ●IMP-011     ●IMP-010              
         │  $320k        $120k
         │  ●IMP-006
         │  $480k
─────────┼────────────────────────────────────────────────────────────
Medium   │  ●IMP-012     ●IMP-008              
         │  $180k        $24k est.
         │  ●IMP-004  
         │  ●IMP-003
         │  $144k
─────────┼────────────────────────────────────────────────────────────
Low      │  ●IMP-001                            ●IMP-007  
         │                                      $2.2k
         │                                                    ●IMP-002
─────────┼────────────────────────────────────────────────────────────
```

Bubbles within same cell stack or slightly offset if overlapping.

**Color legend:**
```
● identified  ● evaluating  ● approved  ● in_progress  ● validating  ✓ completed
```

**Bubble interactions:**
- Hover → tooltip showing: publicId, title, status, estimated benefit, owner, ROI
- Click → navigate to `/improvement/{publicId}`

### Gap analysis (right rail)

```
┌─ CATEGORY COVERAGE ──────────┐
│ Reliability       ████ 4     │
│ Process           ███ 3      │
│ Cost              ██ 2       │
│ Performance       ██ 2       │
│ Compliance        █ 1        │
│ Developer Exp.    █ 1        │
│ Customer Exp.     ░ 0 GAP    │
│ Security          ░ 0 GAP    │
└───────────────────────────────┘

┌─ BENEFIT CONCENTRATION ───────┐
│ Top 3 initiatives account for │
│ 77% of portfolio value        │
│                               │
│ IMP-006  $480k  (37%)        │
│ IMP-011  $320k  (25%)        │
│ IMP-012  $180k  (14%)        │
└───────────────────────────────┘

┌─ PRIORITY DISTRIBUTION ───────┐
│ Critical   ░ 0  (gap!)        │
│ High       ████ 3             │
│ Medium     ████████ 6         │
│ Low        ███ 3              │
└───────────────────────────────┘
```

### Summary strip below heatmap

```
PORTFOLIO SUMMARY

12 initiatives  ·  $1.29M total est. value  ·  Avg ROI: 2,847%  ·  Total effort: ~184 days
2 completed  ·  $62k actually realized (5% of portfolio)  ·  4 in progress
```

---

## 📄 PAGE 5c.5 — Benefit Tracker & ROI Calculator

**File:** `src/routes/improvement/BenefitTracker.tsx`
**Route:** `/improvement/benefits`

### Purpose
Track and visualize realized benefits from completed/validated improvements. ROI calculator for new initiatives. **Most analytics-rich page in this module.**

### Page header

```
Benefit Tracker & ROI
Portfolio: $1.29M estimated annual value · $62k actually realized (YTD)
                                    [Register →] [Kanban →] [Heatmap →]
```

### Top section — Portfolio benefit view

**Left (60%): Cumulative benefit chart**

```
┌─ Cumulative benefit realized — 2026 YTD ──────────────────────────────────┐
│                                                                              │
│ [Recharts AreaChart]                                                         │
│                                                                              │
│ X axis: months (Jan – May 2026)                                              │
│ Y axis: USD realized (cumulative)                                            │
│                                                                              │
│ Two series:                                                                  │
│   ─── Actual realized ($62k shown stepping up as benefits hit)              │
│   ── ─ Projected trajectory (based on current portfolio $1.29M/yr)         │
│                                                                              │
│  $80k │                                             ╱ (projected)            │
│  $60k │                                    ●────────                         │
│  $40k │                           ●────────                                  │
│  $20k │          ●────────────────                                           │
│   $0  ├──────────┼────────────────┼───────────────                          │
│        Jan      Feb     Mar     Apr      May                                 │
│                                                                              │
│ Tooltip: hover month shows realized value + initiatives contributing         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Right (40%): Benefit by type donut + top contributors**

```
┌─ By benefit type ─────────────┐
│ [Recharts PieChart donut]      │
│                                 │
│ Risk reduction    65%  $840k   │
│ Revenue protection 22%  $280k  │
│ Efficiency gain   9%   $116k   │
│ Cost reduction    3%   $39k    │
│ Compliance value  1%   $13k    │
└────────────────────────────────┘

┌─ Top contributors ────────────┐
│ IMP-2026-00006  $480k  37%    │
│   Zero-downtime deployment    │
│ IMP-2026-00011  $320k  25%    │
│   Load testing CI             │
│ IMP-2026-00012  $180k  14%    │
│   Quarterly capacity review   │
│ IMP-2026-00003  $144k  11%    │
│   Search geo-redundancy POC   │
│ (others)        $168k  13%    │
└────────────────────────────────┘
```

### Middle section — Realized benefits log

```
BENEFIT MEASUREMENTS                                      [+ Log measurement]
──────────────────────────────────────────────────────────────────────────────

│ Initiative         │ Date      │ Period          │ Type       │ Value    │ Est? │
│ IMP-2026-00005     │ Apr 1     │ Q1 Audit        │ Efficiency │ $60,000  │ No   │
│   PCI audit auto.  │           │                 │ gain       │          │      │
│   Actual: 3d saved × 4 engineers                                               │
│                                                                                 │
│ IMP-2026-00009     │ May 10    │ Month 1 post    │ Risk red.  │  $2,000  │ No   │
│   Monitoring CLD   │           │                 │            │          │      │
│   INC-184 detected 8 min earlier                                               │
│                                                                                 │
│ [No more actual measurements — 2 estimates pending]                            │

[+ Log benefit measurement]
```

`[+ Log measurement]` opens modal:

```
Log Benefit Measurement                                               [×]

Initiative
[IMP-2026-00009 — Monitoring cooldown ▾]

Measurement date
[2026-05-10]

Period label
[Month 1 (post-completion)                                           ]

Benefit type
◉ Risk reduction   ○ Revenue protection   ○ Efficiency gain
○ Cost reduction   ○ Compliance value     ○ Quality improvement

Is this an actual measurement or estimate?
◉ Actual measurement   ○ Estimate / projection

Measured value (USD)
[$                2000]

Supporting evidence
[INC-2026-00184 detected 8 min earlier due to reduced cooldown.    ]
[Estimated impact: prevented ~8 min of P1 outage at $800/min rate   ]

                                                      [Cancel] [Log]
```

### Bottom section — ROI Calculator

An interactive calculator for **evaluating new initiatives before submission**. Standalone interactive widget that does NOT need to save state.

```
ROI CALCULATOR                                          [Clear]

COSTS
  Implementation effort (days)   [12    ]  ×  Daily rate ($)  [$800  ]  =  $9,600
  Ongoing monthly cost (USD)     [$200  ]
  ─────────────────────────────────────────────────────────────────────
  Total cost (12 months):        $12,000

BENEFITS
  Annual benefit (USD)           [$320,000]
  Confidence level               [Medium ▾]
  Benefit type                   [Risk reduction ▾]

RESULTS (auto-calculated, live)

  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                    │
  │  12-month ROI:   2,567%        Payback period:  0.45 months      │
  │  NPV (5 years):  $1,480,000    Break-even:      < 2 weeks        │
  │                                                                    │
  │  [Recharts BarChart — scenario analysis, 3 bars]                  │
  │  Pessimistic  Base case  Optimistic                                │
  │    1,283%       2,567%     3,208%                                 │
  │                                                                    │
  └──────────────────────────────────────────────────────────────────┘

  Assumptions: 3% discount rate for NPV. Pessimistic = 50% of benefits.
               Optimistic = 25% higher benefits.

  [Create improvement initiative from this calculation →]
```

All fields are `<input>` or `<select>`. Results re-compute on every keystroke (React `useMemo` or inline calculation). `[Create initiative →]` navigates to new initiative form with fields pre-populated from calculator values.

---

## 🎨 SHARED COMPONENTS

```
components/improvement/
├── ImprovementRow.tsx                 # DataTable row in register
├── ImprovementStatusPill.tsx
├── ImprovementCategoryChip.tsx
├── ImprovementPriorityDot.tsx         # Colored dot for priority
├── ImprovementProgressBar.tsx         # Styled progress bar
├── BenefitTypeChip.tsx
├── ROISummaryPanel.tsx                # Compact ROI in sidebar
├── ImprovementDetail/
│   ├── OverviewTab.tsx
│   ├── ProgressTab.tsx                # Progress log + log update form
│   ├── MetricsTab.tsx                 # Success metrics table
│   ├── ROITab.tsx                     # Full ROI analysis
│   ├── LinkedItemsTab.tsx
│   └── UpdatesTab.tsx                 # Chronological update log
├── KanbanBoard/
│   ├── KanbanBoard.tsx                # Full board orchestrator
│   ├── KanbanColumn.tsx               # Single status column
│   ├── KanbanCard.tsx                 # Initiative card
│   └── KanbanDragDropProvider.tsx     # Context for drag state (visual only)
├── HeatmapView/
│   ├── BubbleMatrix.tsx               # The grid with bubbles
│   ├── BubbleNode.tsx                 # Single bubble
│   ├── HeatmapGapAnalysis.tsx         # Right rail
│   └── PortfolioSummaryStrip.tsx
└── BenefitTracker/
    ├── CumulativeBenefitChart.tsx     # Recharts AreaChart
    ├── BenefitByTypeDonut.tsx         # Recharts PieChart
    ├── TopContributorsList.tsx
    ├── BenefitMeasurementTable.tsx
    ├── LogBenefitModal.tsx
    └── ROICalculator.tsx              # Interactive standalone calculator
```

### Constants in `src/lib/constants.ts`

```typescript
export const improvementStatusMeta: Record<ImprovementStatus, { label: string; color: string; bg: string; dot: string; column: number }> = {
  identified:  { label: 'Identified',   color: '#475467', bg: '#F1F3F7', dot: '#98A2B3', column: 0 },
  evaluating:  { label: 'Evaluating',   color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC', column: 1 },
  approved:    { label: 'Approved',     color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED', column: 2 },
  in_progress: { label: 'In Progress',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009', column: 3 },
  validating:  { label: 'Validating',   color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC', column: 4 },
  completed:   { label: 'Completed',    color: '#067647', bg: '#ECFDF3', dot: '#12B76A', column: 5 },
  on_hold:     { label: 'On Hold',      color: '#475467', bg: '#F1F3F7', dot: '#475467', column: -1 },
  cancelled:   { label: 'Cancelled',    color: '#B42318', bg: '#FEF3F2', dot: '#F04438', column: -1 },
};

export const improvementCategoryMeta: Record<ImprovementCategory, { label: string; icon: string; color: string }> = {
  reliability:           { label: 'Reliability',           icon: 'Shield',          color: '#0BA5EC' },
  performance:           { label: 'Performance',           icon: 'Zap',             color: '#DC6803' },
  security:              { label: 'Security',              icon: 'ShieldCheck',     color: '#B42318' },
  process:               { label: 'Process',               icon: 'GitBranch',       color: '#6941C6' },
  cost:                  { label: 'Cost',                  icon: 'DollarSign',      color: '#067647' },
  compliance:            { label: 'Compliance',            icon: 'CheckSquare',     color: '#475467' },
  customer_experience:   { label: 'Customer Experience',   icon: 'Heart',           color: '#B42318' },
  developer_experience:  { label: 'Developer Experience',  icon: 'Code2',           color: '#0BA5EC' },
};

export const improvementPriorityMeta: Record<ImprovementPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2' },
  high:     { label: 'High',     color: '#DC6803', bg: '#FFFAEB' },
  medium:   { label: 'Medium',   color: '#0BA5EC', bg: '#F0F9FF' },
  low:      { label: 'Low',      color: '#475467', bg: '#F1F3F7' },
};

export const benefitTypeMeta: Record<BenefitType, { label: string; icon: string; color: string }> = {
  cost_reduction:       { label: 'Cost reduction',       icon: 'TrendingDown', color: '#067647' },
  revenue_protection:   { label: 'Revenue protection',   icon: 'ShieldCheck',  color: '#0BA5EC' },
  efficiency_gain:      { label: 'Efficiency gain',      icon: 'Clock',        color: '#6941C6' },
  risk_reduction:       { label: 'Risk reduction',       icon: 'Shield',       color: '#DC6803' },
  compliance_value:     { label: 'Compliance value',     icon: 'CheckSquare',  color: '#475467' },
  quality_improvement:  { label: 'Quality improvement',  icon: 'Star',         color: '#0BA5EC' },
};

// Helper: format large USD values
export const formatBenefitUSD = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${value}`;
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace 5 placeholder routes:

```tsx
// Replace
{ path: 'improvement',          element: <Placeholder ... /> },
{ path: 'improvement/:id',      element: <Placeholder ... /> },
{ path: 'improvement/kanban',   element: <Placeholder ... /> },
{ path: 'improvement/heatmap',  element: <Placeholder ... /> },
{ path: 'improvement/benefits', element: <Placeholder ... /> },

// With (CRITICAL ORDER: literal paths BEFORE :initiativeId)
{ path: 'improvement',                     element: <ImprovementRegister /> },
{ path: 'improvement/kanban',              element: <ImprovementKanban /> },
{ path: 'improvement/heatmap',             element: <ImprovementHeatmap /> },
{ path: 'improvement/benefits',            element: <BenefitTracker /> },
{ path: 'improvement/:initiativeId',       element: <ImprovementDetail /> },
```

---

## 🔗 CROSS-LINKING

Real links activated by Doc 5c:
- Initiative detail → linked problem → `/problems/{id}` (Doc 3a real)
- Initiative detail → linked incident → `/incidents/{id}` (Doc 3a real)
- Initiative detail → linked change → `/changes/{id}` (Doc 4a real)
- Initiative detail → linked capacity recommendation → `/capacity` (Doc 5a real, or direct to recommendations section)
- Initiative detail → linked metric → `/metrics/catalog` (Doc 5b real, opens catalog with metric focused)
- Initiative detail → linked DR test → `/continuity/tests` (Doc 5b real)
- Kanban card → initiative detail real
- Heatmap bubble → initiative detail real
- Benefit log → initiative detail real

**Update existing modules:**

1. **Doc 3a problem detail:**
   - "Linked improvement" tab or section in "Fix Plan" tab now shows real improvement initiatives
   - PRB-2026-00018 → IMP-2026-00011 (load testing) + IMP-2026-00012 (quarterly review) + IMP-2026-00009 (completed)
   - Recommended actions in RCA workspace → link to real improvement initiatives

2. **Doc 5a capacity:**
   - Scaling recommendations (REC-2026-00012) → linked improvement initiative IMP-2026-00012 with real link
   - `/capacity/thresholds` "Create improvement" action now navigates to `/improvement?prefill=capacity`

3. **Doc 5b measurement:**
   - Metric catalog entries for `MET-AVAIL-002` (MTTR) → "Targeted by improvements: IMP-2026-00011" real link
   - Executive dashboard stat block improvement items link to `/improvement`

4. **Doc 4a change detail:**
   - CHG-2026-00091 "Linked improvement" → IMP-2026-00009 (monitoring cooldown — completed) real link
   - CHG-2026-00091 detail also shows IMP-2026-00011 and IMP-2026-00012 as related improvements (from RCA)

5. **Doc 0 dashboard:**
   - Add small "Improvement pipeline" widget in appropriate section showing 4 active initiatives
   - Link to `/improvement/kanban`

---

## ✅ QUALITY CHECKLIST

- [ ] All 5 routes work without 404 (critical: kanban/heatmap/benefits BEFORE :initiativeId)
- [ ] `/improvement` shows DataTable with 12 initiatives
- [ ] Portfolio value KPI shows $1.29M computed from mock data
- [ ] Priority dot colors correct (critical=red, high=orange, medium=amber, low=gray)
- [ ] Progress bar renders correctly for each initiative
- [ ] Filters (status, category, priority, owner) work in combination
- [ ] Quick filter chips apply correct combos
- [ ] Default sort: priority asc → in_progress first → targetDate asc
- [ ] `/improvement/IMP-2026-00011` shows detail page with all 6 tabs
- [ ] Overview tab shows current/target state + impact estimation
- [ ] Progress tab shows 40% bar + progress history log
- [ ] `[Log progress update]` inline form works, adds entry + bumps progress
- [ ] Metrics tab shows success metrics table with current/target/achieved
- [ ] ROI tab shows full analysis with scenario BarChart (3 bars)
- [ ] ROI tab for completed initiative shows actual vs estimated comparison
- [ ] Linked Items tab cross-links work (real links)
- [ ] Updates tab shows chronological log with status-change entries
- [ ] Right sidebar shows ROI summary + quick actions
- [ ] `/improvement/kanban` shows 6-column board
- [ ] All 12 initiatives appear in correct column
- [ ] Each card shows priority/category/progress/owner/benefit/ROI
- [ ] Hover card shows tooltip-like elevation
- [ ] Click card navigates to detail page
- [ ] Drag-drop visual: dragging shows column highlight, drop shows toast
- [ ] Column headers show item count + total benefit
- [ ] Completed column shows $62k realized (distinct from estimated)
- [ ] Empty column shows dashed border state
- [ ] `/improvement/heatmap` shows bubble matrix grid
- [ ] X axis = 8 categories, Y axis = 4 priority levels
- [ ] Bubbles sized by estimated benefit (larger = more valuable)
- [ ] Bubbles colored by status
- [ ] Hover bubble shows tooltip (publicId, title, status, benefit, owner, ROI)
- [ ] Click bubble navigates to detail
- [ ] Bubbles positioned correctly per category/priority
- [ ] Right rail shows category coverage + benefit concentration + priority distribution
- [ ] Gaps highlighted (Customer Experience = 0, Security = 0)
- [ ] Portfolio summary strip shows accurate totals
- [ ] `/improvement/benefits` shows cumulative benefit AreaChart
- [ ] Chart shows actual realized ($62k stepping) + projected trajectory
- [ ] Benefit by type donut chart renders correctly
- [ ] Top contributors list shows correct order by estimated value
- [ ] Benefit measurements table shows actual log entries
- [ ] `[+ Log measurement]` modal works with all fields, submits successfully
- [ ] ROI Calculator auto-computes on input change (no submit needed)
- [ ] ROI scenario BarChart shows 3 bars (pessimistic/base/optimistic)
- [ ] `[Create initiative from calculation →]` navigates to register with prefilled values
- [ ] Doc 3a PRB-018 detail "Fix Plan" / "Linked Items" shows real improvement links
- [ ] Doc 5a capacity recommendations link to improvement initiatives
- [ ] Doc 4a CHG-091 shows linked improvement items
- [ ] All public IDs use mono font
- [ ] `formatBenefitUSD` helper correctly formats $320,000 as "$320k", $1,290,000 as "$1.3M"
- [ ] Recharts charts wrapped in `<ResponsiveContainer>`
- [ ] Sidebar nav highlights "Continual Improvement" on all 5 routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/improvement.ts`, re-exported from `src/types/index.ts`
2. Mock data: `improvements.ts`, `benefitMeasurements.ts`, `roiCalculations.ts`
3. Module components in `src/components/improvement/`
4. 5 route files in `src/routes/improvement/`
5. Routing config updated (literal paths kanban/heatmap/benefits BEFORE `:initiativeId`)
6. Sidebar item "Continual Improvement" highlights on all 5 routes
7. Doc 0 / Doc 3a / Doc 4a / Doc 5a / Doc 5b updated with real Doc 5c improvement links

After generation, do not start Doc 6 yet. Wait for the next prompt.
Doc 6 is the final document — Platform Features (Inbox, Notifications, On-Call, Status Page, Preferences).

---

*End of Doc 5c. Service Health & Intelligence cluster complete.*
