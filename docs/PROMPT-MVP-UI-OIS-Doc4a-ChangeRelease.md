# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 4a — Change & Delivery Cluster: Change Enablement + Release Management

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b sudah di-execute di Build Mode session yang sama.
> **Modules:** Change Enablement (§7.5) + Release Management (§7.6)
> **Routes covered:** `/changes`, `/changes/new`, `/changes/[id]`, `/changes/calendar`, `/changes/cab`, `/releases`, `/releases/[id]`, `/releases/pipeline`, `/releases/notes`
> **Companion:** Doc 4b (Deployment + Validation) — to be applied after this.

---

## 🎯 SCOPE & DEPENDENCIES

Doc 4a covers **Change Enablement** (RFC workflow, CAB approval, conflict detection) and **Release Management** (release planning, composition, pipeline visualization). These are tightly coupled but conceptually distinct per ITIL 4:

- **Change** = approval & risk management of *what* to change
- **Release** = packaging & delivering changes (Release ≠ Deploy)

**Reuse from Doc 0–3:**
- AppShell, all UI primitives, formatters
- Mock data: users, teams, services, CIs, incidents, problems, KB articles
- Cross-link: changes ↔ problems (Doc 3a real), changes ↔ KB (Doc 3b real), changes ↔ CIs (Doc 1 real)

**Yet-placeholder cross-links:**
- Releases → deployments (Doc 4b — placeholder route ok for now)
- Validation/test runs (Doc 4b)

**To be added in Doc 4a:**
- Domain types: `Change`, `ChangeApproval`, `ChangeConflict`, `PIR`, `Release`, `ReleaseComposition`
- Mock data: 15 changes (covers showcase `CHG-2026-00091`), 8 releases, related approvals/PIRs
- Module components in `src/components/changes/` and `src/components/releases/`
- 9 route implementations
- Update routing config + cross-link to existing modules

---

## 🧩 DOMAIN TYPES (`src/types/change.ts`)

```typescript
import { Severity } from './common';

// Change classification (per ITIL 4)
export type ChangeType =
  | 'standard'       // Pre-approved low-risk (cert renewal, password reset)
  | 'normal'         // Goes through full CAB review
  | 'emergency';     // Urgent, expedited approval

// Change lifecycle
export type ChangeStatus =
  | 'draft'              // Being prepared, not submitted
  | 'submitted'          // Awaiting review
  | 'in_review'          // Under CAB review
  | 'approved'           // Approved, scheduled
  | 'scheduled'          // Slot booked, awaiting implementation window
  | 'implementing'       // Currently being executed
  | 'implemented'        // Done, awaiting PIR/closure
  | 'closed_successful'  // PIR done, success
  | 'closed_failed'      // PIR done, failure (linked to incidents)
  | 'rejected'           // Rejected by CAB
  | 'cancelled';         // Withdrawn

// Risk assessment
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Impact level
export type ImpactLevel = 'minimal' | 'minor' | 'moderate' | 'major' | 'extensive';

// CAB voting decisions
export type CABVote = 'approve' | 'approve_with_conditions' | 'reject' | 'abstain';

// === CHANGE (the RFC) ===
export interface Change {
  id: string;
  publicId: string;                  // e.g. "CHG-2026-00091"

  title: string;
  description: string;               // Markdown
  justification: string;             // Why we're doing this
  type: ChangeType;
  status: ChangeStatus;

  // Risk & impact
  risk: RiskLevel;
  impact: ImpactLevel;
  riskScore: number;                 // 0-100, computed from matrix
  riskFactors: string[];             // List of risk descriptions

  // Schedule
  plannedStart: string;              // ISO
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  implementationWindow: string;      // Human-readable, e.g. "Friday May 10, 14:00-16:00 UTC"
  freezeWindow?: boolean;            // If true, change requires special approval (during freeze period)

  // Ownership
  requesterId: string;               // Who proposed
  requesterName: string;
  ownerId: string;                   // Who implements
  ownerName: string;
  ownerTeamId: string;

  // Affected scope
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];

  // Plans
  implementationPlan: string;        // Markdown — step-by-step
  rollbackPlan: string;              // Markdown — how to undo
  testPlan: string;                  // Brief test description (full plans linked via Doc 4b)

  // Linkage
  linkedProblemIds: string[];         // Problems this fixes (PRB-XXXX)
  linkedIncidentIds: string[];        // Incidents that triggered this
  linkedReleaseId?: string;           // If part of a release
  linkedReleasePublicId?: string;
  linkedKBSlugs: string[];

  // Approvals
  approvals: ChangeApproval[];
  cabReviewedAt?: string;
  cabSessionId?: string;             // Which CAB session reviewed this

  // Conflicts
  conflicts: ChangeConflict[];

  // Post-implementation review
  pir?: PIR;

  // Communications
  commsRequired: boolean;            // Does this need user-facing comm?
  commsChannels: string[];           // e.g. ['status_page', 'email_all']

  // Audit
  tags: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface ChangeApproval {
  id: string;
  changeId: string;
  approverId: string;
  approverName: string;
  approverRole: string;              // e.g. "Change Manager", "Service Owner"
  decision: CABVote;
  conditions?: string;               // For approve_with_conditions
  rationale?: string;
  decidedAt: string;
  weight: number;                    // For weighted voting (default 1)
}

export interface ChangeConflict {
  id: string;
  type: 'time_overlap' | 'ci_overlap' | 'service_overlap' | 'freeze_window' | 'dependency';
  severity: 'warning' | 'blocking';
  description: string;
  conflictsWith: string[];           // Other CHG- public IDs
  detectedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface PIR {
  id: string;
  changeId: string;
  // Outcome
  outcome: 'success' | 'partial_success' | 'failed' | 'rolled_back';
  // Metrics
  plannedDurationMin: number;
  actualDurationMin: number;
  // Impact
  unplannedDowntimeMin: number;
  customerImpact?: string;
  // Findings
  whatWentWell: string;
  whatWentWrong?: string;
  lessonsLearned: string;
  // Linkage
  triggeredIncidentIds: string[];     // INC-XXX created during/after change
  followUpActions: Array<{
    description: string;
    type: 'preventive' | 'corrective';
    owner: string;                    // user id
    targetDate: string;
    status: 'open' | 'in_progress' | 'done';
    linkedImprovementId?: string;
  }>;
  // Sign-off
  reviewedAt: string;
  reviewedBy: string;
  signedOffAt?: string;
  signedOffBy?: string;
}
```

## 🧩 DOMAIN TYPES (`src/types/release.ts`)

```typescript
// Release types
export type ReleaseType =
  | 'major'          // 1.0.0 → 2.0.0
  | 'minor'          // 1.0.0 → 1.1.0
  | 'patch'          // 1.0.0 → 1.0.1
  | 'hotfix';        // Emergency patch

// Release lifecycle
export type ReleaseStatus =
  | 'planning'       // Composing, not yet locked
  | 'locked'         // Composition locked, awaiting validation
  | 'in_validation'  // Tests running
  | 'ready'          // Validated, ready for deployment
  | 'deploying'      // Deployment in progress
  | 'released'       // Live in production
  | 'partially_released' // Some envs deployed, others pending
  | 'rolled_back'
  | 'cancelled';

// Environment promotion stages
export type Environment = 'development' | 'staging' | 'production';

// === RELEASE ===
export interface Release {
  id: string;
  publicId: string;                  // e.g. "REL-2026-00018"
  version: string;                   // e.g. "2.4.1" (semver)
  name: string;                      // Optional friendly name
  description: string;               // Markdown release notes

  type: ReleaseType;
  status: ReleaseStatus;

  // Component
  componentName: string;             // e.g. "payment-api"
  componentRepoUrl?: string;
  componentCIPublicId?: string;      // Linked CI

  // Composition — what's IN this release
  composition: ReleaseComposition;

  // Schedule
  plannedReleaseDate: string;        // ISO
  actualReleaseDate?: string;

  // Stages — environments promoted
  stages: ReleaseStage[];
  currentStageIndex: number;         // 0=dev, 1=staging, 2=prod typically

  // Ownership
  releaseManagerId: string;          // user id
  releaseManagerName: string;
  ownerTeamId: string;

  // Notes
  releaseNotes: string;              // Customer-facing notes (markdown)
  internalNotes?: string;            // Internal team notes

  // Linkage
  linkedDeploymentIds: string[];     // DEP-XXX (Doc 4b placeholder)
  linkedTestRunIds: string[];        // TST-XXX (Doc 4b placeholder)
  linkedKBSlugs: string[];

  // Feature flags (per ADR 007 — release vs deploy)
  featureFlags: Array<{
    key: string;
    description: string;
    enabledByDefault: boolean;
    targeting?: string;              // e.g. "10% rollout", "team-platform only"
  }>;

  // Audit
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseComposition {
  changes: Array<{
    publicId: string;                // CHG-XXX
    title: string;
    type: ChangeType;
    risk: RiskLevel;
  }>;
  problemsFixed: Array<{
    publicId: string;                // PRB-XXX
    title: string;
  }>;
  incidentsResolved: Array<{
    publicId: string;                // INC-XXX
    title: string;
  }>;
  // Dependencies / pre-requisites
  prerequisites: Array<{
    type: 'release' | 'change' | 'manual_step';
    reference: string;               // public ID or description
    status: 'met' | 'pending' | 'blocked';
  }>;
}

export interface ReleaseStage {
  id: string;
  environment: Environment;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  // Deployment reference (linked to Doc 4b)
  deploymentPublicId?: string;
  // Validation
  testsPassed?: number;
  testsTotal?: number;
  // Health check after deployment
  postDeployHealthCheck: 'pending' | 'healthy' | 'degraded' | 'failed';
  // Manual gates
  approvalRequired: boolean;
  approverId?: string;
  approvedAt?: string;
}
```

In `src/types/index.ts`, add:
```typescript
export * from './change';
export * from './release';
```

---

## 🗄 MOCK DATA

### `src/mocks/changes.ts` — 15 changes

**Distribution:**
- Type: standard=4, normal=10, emergency=1
- Status spread:
  - draft=1, submitted=2, in_review=2 (one is the showcase CHG-091), approved=2, scheduled=1, implementing=0, implemented=2, closed_successful=4, closed_failed=1
- Risk: low=5, medium=7, high=3
- Spread across last 60 days; some scheduled in next 14 days

**Required showcase change:**

```
CHG-2026-00091
  Title: "Migrate payment-api to pgbouncer connection pooling"
  Type: normal
  Status: in_review (this is the showcase; CAB review pending)
  Risk: medium
  Impact: moderate
  riskScore: 58
  riskFactors: [
    "Touches tier-1 production service (Payment Service)",
    "Requires brief connection drain (~30s)",
    "Permanent fix for PRB-2026-00018 (recurring issue)",
    "Well-tested in staging for 7 days",
  ]
  plannedStart: 2026-05-10T14:00:00Z (Friday window)
  plannedEnd: 2026-05-10T16:00:00Z
  implementationWindow: "Friday May 10, 14:00-16:00 UTC"
  requesterId: u-004 (David Okafor)
  ownerId: u-004
  ownerTeamId: t-platform
  affectedCIIds: [CI-APP-PAY-001, CI-APP-PAY-002, CI-DB-PAY-001]
  affectedServiceIds: [svc-001]
  implementationPlan: (full markdown — see template below)
  rollbackPlan: (full markdown)
  testPlan: "Pre-deploy: 7d staging soak test (passed). Post-deploy: smoke tests + 30min observation."
  linkedProblemIds: [PRB-2026-00018]
  linkedIncidentIds: [INC-2026-00184, INC-2026-00156, INC-2026-00132, INC-2026-00098]
  linkedReleasePublicId: REL-2026-00020
  linkedKBSlugs: ['payment-pgbouncer-migration'] (this is the draft KB-00248 from Doc 3b)
  approvals: [
    { approverId: 'u-001' (Sarah Chen, Change Manager), decision: 'pending' (not yet voted) },
    { approverId: 'u-007' (Tom Bergstrom, Service Owner), decision: 'approve', rationale: 'Necessary fix, well-prepared.', decidedAt: '2026-05-08T10:30:00Z' },
    { approverId: 'u-006' (Helena Vasquez, Release Manager), decision: 'pending' },
  ]
  conflicts: []  // No conflicts for showcase
  commsRequired: true
  commsChannels: ['status_page', 'email_engineering']
  tags: [production, payment, pgbouncer, normal-change, friday-window]
  createdAt: 2026-04-30T09:30:00Z
  updatedAt: 2026-05-08T10:30:00Z
```

**Implementation plan markdown template for CHG-091:**

```markdown
## Pre-deployment

1. Verify all prerequisites met:
   - [x] Staging soak test (7 days, passed)
   - [x] PR #4421 merged (connection leak fix)
   - [x] pgbouncer instance provisioned in production VPC
   - [x] Monitoring rules updated (RULE-PAY-005 added for pgbouncer)
   - [ ] PIR holder confirmed (Sarah Chen, on standby)

2. Notify stakeholders 24h before window via email and Slack #payment-engineering.

## Implementation window (14:00–16:00 UTC)

### 14:00 — Pre-flight checks
- Verify monitoring is green (no active incidents)
- Confirm rollback automation tested
- Capture baseline metrics

### 14:10 — Deploy pgbouncer config
- Apply Terraform plan to enable pgbouncer in payment-api connection string
- Health check: pgbouncer instance reachable

### 14:20 — Rolling restart payment-api pods
- `kubectl rollout restart deployment/payment-api -n payment`
- Watch metrics: error rate, p95 latency, connection counts

### 14:30 — Rolling restart payment-worker pods
- Same as above for worker

### 14:40 — Validation
- Run smoke tests (10 synthetic checkout flows)
- Verify connection counts via pgbouncer admin console
- Check for any new errors in logs

### 14:50 — Observation period
- Monitor for 30 minutes
- If no anomalies, proceed to comms

### 15:30 — Comms
- Post in status page: "Performance improvements complete"
- Internal post-mortem invite for following Tuesday

## Post-deployment

- 24h follow-up health check (David)
- 7-day check-in to confirm reduced incident rate
- Update PRB-2026-00018 to closed
- Promote KB-00248 (pgbouncer runbook) from draft to published
```

**Rollback plan markdown:**

```markdown
## Rollback triggers

Initiate rollback if any of the following occur within 30min of deployment:

- Error rate > 0.5% for >5 minutes
- p95 latency > baseline + 50%
- pgbouncer instance becomes unreachable
- Any P1/P2 incident on Payment Service

## Rollback procedure

### Option A: Config-only rollback (preferred, ~2min)
1. Revert Terraform plan: connection string back to direct DB connections
2. `kubectl rollout restart deployment/payment-api deployment/payment-worker -n payment`
3. Health check: services healthy on direct connections

### Option B: Full rollback to previous deployment (if Option A insufficient)
1. `kubectl rollout undo deployment/payment-api -n payment`
2. `kubectl rollout undo deployment/payment-worker -n payment`
3. Verify previous version (v2.4.0) is running
4. Health check

## Communication
- Post in #incidents and status page within 5min of rollback decision
- IC: David Okafor; Comms: Helena Vasquez
```

**Other 14 changes** — generate variety:

```
CHG-2026-00088  Certificate renewal for *.acme.io
  Type: standard, Risk: low, Status: implemented
  Auto-approved (standard change)
  Implemented 2 days ago, no issues

CHG-2026-00089  Increase order-api replicas from 3 to 5
  Type: normal, Risk: low, Status: closed_successful
  Linked: capacity scaling recommendation
  PIR: success, no incidents

CHG-2026-00086  Internal Wiki maintenance window — DB upgrade
  Type: normal, Risk: medium, Status: scheduled (tomorrow 02:00 UTC)
  Implementation window: Thu May 9, 02:00-04:00 UTC
  Conflicts: none

CHG-2026-00087  Rotate API tokens for external integrations
  Type: standard, Risk: low, Status: approved (auto)
  Scheduled for next week

CHG-2026-00090  Deploy auth-service v3.1.0
  Type: normal, Risk: medium, Status: approved
  Linked: REL-2026-00019
  Plan: rolling deploy

CHG-2026-00084  Disaster recovery test — Payment Service
  Type: normal, Risk: high (simulating actual failure)
  Status: closed_successful
  PIR: success, found 2 minor procedural improvements

CHG-2026-00085  Emergency: Block IP range from auth (DDoS mitigation)
  Type: emergency, Risk: medium, Status: implemented (4 days ago)
  Approved expedited by Sarah Chen
  PIR: success, but flagged need for proactive WAF rules

CHG-2026-00080  Migrate analytics pipeline to new Kafka cluster
  Type: normal, Risk: high, Status: closed_failed
  PIR outcome: rolled_back (downstream consumers couldn't handle new partition strategy)
  Linked incidents: INC-2026-00170 (created during change)

CHG-2026-00075  Increase Postgres connection pool for payment-api (interim fix)
  Type: normal, Risk: low, Status: closed_successful
  This was the interim fix before pgbouncer (CHG-091) for PRB-018

CHG-2026-00073  Update Postgres storage from 800GB to 1TB
  Type: normal, Risk: low, Status: closed_successful
  PIR: success, no issues

CHG-2026-00065  Rotate API tokens
  Type: standard, Status: closed_successful (8 days ago)

CHG-2026-00060  Decommission old wiki search indexer
  Type: normal, Risk: low, Status: closed_successful

CHG-2026-00055  Upgrade Node.js runtime 18 → 20 (payment-api)
  Type: normal, Risk: medium, Status: closed_successful
  PIR: 1 minor follow-up action (update CI config)

CHG-2026-00050  AWS account migration (analytics)
  Type: normal, Risk: high, Status: cancelled
  Cancelled due to budget approval delay

DRAFT (not yet submitted):
CHG-DRAFT-001  Switch to OpenTelemetry for tracing
  Type: normal, Risk: medium, Status: draft
  Owner: u-005, drafted 2 days ago
```

For each change, populate full data. Make sure dates make sense (created < submitted < approved < implemented < closed). Risk score should correlate with risk level (low: 0-30, medium: 31-65, high: 66-90, critical: 91-100).

For changes with PIR (closed_successful or closed_failed), populate the PIR object:

```typescript
// Example PIR for CHG-2026-00080 (failed, rolled back)
pir: {
  outcome: 'rolled_back',
  plannedDurationMin: 120,
  actualDurationMin: 87,         // rolled back early
  unplannedDowntimeMin: 12,
  customerImpact: 'Analytics dashboards were stale for 12 minutes during rollback.',
  whatWentWell: 'Rollback procedure executed cleanly. Monitoring alerted within 3 minutes.',
  whatWentWrong: 'Did not test downstream consumer compatibility with new partition strategy.',
  lessonsLearned: 'For Kafka changes, must include consumer compatibility tests in pre-deployment checklist.',
  triggeredIncidentIds: ['INC-2026-00170'],
  followUpActions: [
    { description: 'Add consumer compatibility test to release checklist',
      type: 'preventive', owner: 'u-006', targetDate: '2026-05-15',
      status: 'in_progress', linkedImprovementId: 'IMP-2026-00010' },
    { description: 'Document Kafka migration runbook with consumer matrix',
      type: 'preventive', owner: 'u-008', targetDate: '2026-05-20',
      status: 'open' },
  ],
  reviewedAt: '2026-04-15T10:00:00Z',
  reviewedBy: 'u-006',
  signedOffAt: '2026-04-16T15:30:00Z',
  signedOffBy: 'u-001',
}
```

For successful changes, simpler PIR:

```typescript
pir: {
  outcome: 'success',
  plannedDurationMin: 60,
  actualDurationMin: 52,
  unplannedDowntimeMin: 0,
  whatWentWell: 'Smooth deployment, all health checks green.',
  lessonsLearned: 'Standard playbook works well for this type of change.',
  triggeredIncidentIds: [],
  followUpActions: [],
  reviewedAt: '...',
  reviewedBy: '...',
  signedOffAt: '...',
  signedOffBy: '...',
}
```

**Conflicts examples** (populate at least 2 changes with conflicts):

For two changes targeting same service in overlapping window:
```typescript
// CHG-2026-00089 (order-api scaling)
conflicts: [
  {
    type: 'service_overlap',
    severity: 'warning',
    description: 'Another change is scheduled on Order Service in adjacent window',
    conflictsWith: ['CHG-2026-00090'],
    detectedAt: '2026-05-08T08:00:00Z',
  }
],

// CHG-2026-00086 (Wiki maintenance) — has freeze window conflict
conflicts: [
  {
    type: 'freeze_window',
    severity: 'warning',
    description: 'Scheduled during marketing campaign freeze window (May 9-11)',
    conflictsWith: [],
    detectedAt: '2026-05-07T16:00:00Z',
    resolvedAt: '2026-05-08T09:00:00Z',
    resolutionNote: 'Approved by Sarah Chen — change is critical for compliance.',
  }
],
```

Helpers:
```typescript
export const getChangeById = (id: string) => mockChanges.find(c => c.id === id || c.publicId === id);
export const getActiveChanges = () => mockChanges.filter(c => !['closed_successful','closed_failed','rejected','cancelled'].includes(c.status));
export const getUpcomingChanges = (days: number) => { /* changes scheduled in next N days */ };
export const getChangesByCI = (ciId: string) => mockChanges.filter(c => c.affectedCIIds.includes(ciId));
export const getChangesByProblem = (problemPublicId: string) => mockChanges.filter(c => c.linkedProblemIds.includes(problemPublicId));
export const getChangesAwaitingReview = () => mockChanges.filter(c => c.status === 'in_review');
export const getMyPendingApprovals = (userId: string) => mockChanges.filter(c =>
  c.status === 'in_review' && c.approvals.some(a => a.approverId === userId && a.decision === 'pending')
);
```

### `src/mocks/releases.ts` — 8 releases

```
REL-2026-00020  payment-api 2.4.1
  Type: patch, Status: planning
  Component: payment-api
  Composition: { changes: [CHG-091], problemsFixed: [PRB-018], incidentsResolved: [INC-184, INC-156, ...] }
  Stages: [dev pending, staging pending, production pending]
  releaseManagerId: u-006 (Helena Vasquez)
  plannedReleaseDate: 2026-05-10T14:00:00Z

REL-2026-00019  auth-service 3.1.0
  Type: minor, Status: in_validation
  Composition: { changes: [CHG-090], ... }
  Stages: [dev success, staging in_progress, production pending]
  currentStageIndex: 1
  Tests passed: 142 of 150 (in staging)
  releaseManagerId: u-006

REL-2026-00018  order-api 3.1.0
  Type: minor, Status: ready
  Stages: [dev success, staging success, production pending]
  currentStageIndex: 2 (production approval gate)
  Awaiting Helena's approval

REL-2026-00017  auth-service 2.8.1 (PIR sign-off pending — see Doc 0 inbox ibx-007)
  Type: patch, Status: released
  Stages: all success
  Actually released 7 days ago

REL-2026-00016  notification-gw 1.5.2
  Type: patch, Status: released
  Released 24h ago (matches Doc 0 ntf-009)

REL-2026-00015  payment-api 2.4.0 (the version BEFORE pgbouncer)
  Type: patch, Status: released
  Released 14 days ago

REL-2026-00014  search-service 4.2.0
  Type: minor, Status: rolled_back
  Stages: [dev success, staging success, production failed → rolled_back]
  Triggered INC-2026-00148 (5d ago)

REL-2026-00013  analytics-pipeline 2.0.0 (the failed Kafka migration from CHG-080)
  Type: major, Status: rolled_back
  Rolled back 3 weeks ago
```

For showcase REL-2026-00020:

```typescript
{
  publicId: 'REL-2026-00020',
  version: '2.4.1',
  name: 'Payment API connection pooling overhaul',
  description: '...markdown release notes...',
  type: 'patch',
  status: 'planning',
  componentName: 'payment-api',
  componentRepoUrl: 'github.com/acme-corp/payment-api',
  componentCIPublicId: 'CI-APP-PAY-001',
  composition: {
    changes: [
      { publicId: 'CHG-2026-00091', title: 'Migrate payment-api to pgbouncer', type: 'normal', risk: 'medium' },
    ],
    problemsFixed: [
      { publicId: 'PRB-2026-00018', title: 'Recurring memory pressure on payment-api' },
    ],
    incidentsResolved: [
      { publicId: 'INC-2026-00184', title: 'Payment Service: 5xx error rate elevated' },
      { publicId: 'INC-2026-00156', title: 'Payment Service total outage' },
      { publicId: 'INC-2026-00132', title: 'Payment API timeouts during AM peak' },
      { publicId: 'INC-2026-00098', title: 'Payment API 5xx errors during launch' },
    ],
    prerequisites: [
      { type: 'manual_step', reference: 'Provision pgbouncer in production VPC', status: 'met' },
      { type: 'manual_step', reference: '7-day staging soak test', status: 'met' },
      { type: 'change', reference: 'CHG-2026-00091 (CAB approval)', status: 'pending' },
    ],
  },
  plannedReleaseDate: '2026-05-10T14:00:00Z',
  stages: [
    { id: 'rs-1', environment: 'development', status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: false },
    { id: 'rs-2', environment: 'staging', status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: false },
    { id: 'rs-3', environment: 'production', status: 'pending', postDeployHealthCheck: 'pending', approvalRequired: true, approverId: 'u-006' },
  ],
  currentStageIndex: 0,
  releaseManagerId: 'u-006',
  releaseManagerName: 'Helena Vasquez',
  ownerTeamId: 't-platform',
  releaseNotes: '...full markdown notes...',
  internalNotes: 'See PIR for CHG-2026-00091 after deployment.',
  linkedDeploymentIds: [],     // populated when deployments start (Doc 4b)
  linkedTestRunIds: [],
  linkedKBSlugs: ['payment-pgbouncer-migration'],
  featureFlags: [],
  tags: ['payment', 'pgbouncer', 'patch', 'pci-scope'],
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-08T10:30:00Z',
}
```

For other releases, populate stages with realistic states:
- `released` releases: all stages success
- `in_validation`: dev success, staging in_progress
- `ready`: dev + staging success, production pending (awaiting approval gate)
- `rolled_back`: stages show progression then failed/rolled_back at last stage

Helpers:
```typescript
export const getReleaseById = (id: string) => mockReleases.find(r => r.id === id || r.publicId === id);
export const getActiveReleases = () => mockReleases.filter(r => !['released','rolled_back','cancelled'].includes(r.status));
export const getReleasesByComponent = (component: string) => mockReleases.filter(r => r.componentName === component);
```

---

## 📄 PAGE 4a.1 — Change Calendar (`/changes`)

**File:** `src/routes/changes/ChangeCalendar.tsx`
**Route:** `/changes`

### Purpose
Default view: **Forward Schedule of Change (FSC)** as a calendar. ServiceNow-style. Shows all upcoming changes by date with conflict highlighting.

### Page header

```
Change Calendar — Forward Schedule (FSC)
15 changes · 3 awaiting approval · 1 implementing this week · 2 conflicts detected
                                            [Calendar] [Board] [List]   [+ New change]
```

- Title + subtitle with live counts
- View toggle group `[Calendar | Board | List]` (Calendar default; Board and List open simpler views)
- `[+ New change]` opens `/changes/new`

### Toolbar

```
[< May 2026 >]   [Today]   [Week | Month | 6-week]    [Filter ▾]   [Export ICS]
```

- Month nav with prev/next/today
- View granularity toggle
- Filter dropdown: by type / status / risk / team / freeze window only
- Export ICS = visual only

### Calendar grid

Standard month view:

```
              MAY 2026
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ MON  │ TUE  │ WED  │ THU  │ FRI  │ SAT  │ SUN  │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  27  │  28  │  29  │  30  │  1   │  2   │  3   │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  4   │  5   │  6   │  7   │  8   │  9   │  10  │
│ ●087 │      │      │      │ TODAY│●086  │ ●091 │
│ token│      │      │      │      │ wiki │ pgbnc│
│ rotat│      │      │      │      │ 02:00│ 14:00│
│      │      │      │      │      │      │ ●090 │
│      │      │      │      │      │      │ auth │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  11  │  12  │  13  │  14  │  15  │  16  │  17  │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  18  │  19  │  20  │  21  │  22  │  23  │  24  │
│      │      │      │      │      │      │      │
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│  25  │  26  │  27  │  28  │  29  │  30  │  31  │
│      │      │      │      │      │      │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

Each day cell:
- Date number top-left; "TODAY" highlight on today
- Up to 3 change pills shown in cell, sized small:
  - Color = risk (low=green, medium=amber, high=red)
  - Format: `● {publicId-short} {component}` and time
  - Hover → small tooltip with title + status
  - Click → navigate to `/changes/{publicId}`
- If >3 changes on a day: "+N more" link → opens day-detail popover
- Cell background tint:
  - Light blue if there's a change today
  - Light yellow if there's a freeze window
  - Light red if there's a conflict
- Weekend days have slightly different bg

### Conflict highlighting

Days with detected conflicts get a small red badge in the corner. Click → opens conflict detail modal showing what conflicts.

### Right sidebar (sticky, 280px)

```
┌─ THIS WEEK ────────────────┐
│ Mon May 4                   │
│   ● CHG-087 Token rotation  │
│     Standard · 03:00 UTC    │
│                              │
│ Sat May 9                   │
│   ● CHG-086 Wiki maint.     │
│     Normal · 02:00 UTC      │
│     ⚠ Freeze window         │
│                              │
│ Sun May 10                  │
│   ● CHG-091 pgbouncer       │
│     Normal · 14:00 UTC      │
│   ● CHG-090 auth deploy     │
│     Normal · 18:00 UTC      │
└──────────────────────────────┘

┌─ AWAITING YOUR APPROVAL ───┐
│ CHG-091 pgbouncer migration │
│ Risk: medium · Due Fri      │
│ [Review →]                   │
└──────────────────────────────┘

┌─ ACTIVE CONFLICTS ─────────┐
│ ⚠ CHG-086 Wiki maint.       │
│   in marketing freeze       │
│   [Review conflict]          │
│                              │
│ ⚠ CHG-089 vs CHG-090        │
│   adjacent windows on       │
│   Order Service             │
│   [Review conflict]          │
└──────────────────────────────┘
```

### Board view (toggle)

When user clicks `[Board]`:

```
DRAFT (1)        SUBMITTED (2)    IN REVIEW (2)    APPROVED (2)     SCHEDULED (1)    IMPLEMENTING (0)
─────────────    ─────────────    ─────────────    ─────────────    ─────────────    ─────────────
[CHG-DRAFT-1]    [...]            [CHG-091] ★      [...]            [CHG-086]
                                  [...]
```

Kanban-style columns. Each card shows publicId + title + risk dot + window date. Drag-drop to change status (visual only). The showcase CHG-091 shows ★ to mark "awaiting your approval".

### List view (toggle)

Standard DataTable with columns: Public ID | Title | Type | Status | Risk | Owner | Window | Actions. Use shared DataTable component.

---

## 📄 PAGE 4a.2 — New Change (RFC Form)

**File:** `src/routes/changes/NewChange.tsx`
**Route:** `/changes/new`

### Purpose
Multi-step form to submit a Request for Change (RFC).

### Page header

```
[← Calendar]                                                     [Save as draft]

New Change Request
Submit an RFC. Complete all steps to submit for review.
```

### Stepper (4 steps)

```
●━━━━━━━○━━━━━━━━○━━━━━━━○
Basics    Plan    Review    Submit
```

### Step 1: Basics

```
TITLE *
[                                                                           ]

DESCRIPTION *
[Markdown supported                                                         ]
[                                                                           ]

JUSTIFICATION *
Why are we doing this?
[                                                                           ]

CHANGE TYPE *
○ Standard    ◉ Normal    ○ Emergency
   Pre-approved   Full CAB     Expedited
   low risk       review       approval

AFFECTED CIs *
[+ Add CIs]
Selected: [CI-APP-PAY-001 ×] [CI-DB-PAY-001 ×]

LINKED ITEMS (optional)
Linked problem(s):  [+ Link problem]   PRB-2026-00018 ×
Linked incident(s): [+ Link incident]  INC-2026-00184 ×
Linked release:     [+ Link release]   REL-2026-00020

──────────
                                                       [Cancel] [Next: Plan →]
```

Type radios show explanation under each. Affected CIs use existing CIPicker component (from Doc 1).

### Step 2: Plan

```
SCHEDULE *
Planned start  [2026-05-10] [14:00] UTC
Planned end    [2026-05-10] [16:00] UTC

Implementation window auto-calculated: "Friday May 10, 14:00–16:00 UTC"

⚠ Conflict check (live):
  This window overlaps with marketing campaign freeze (May 9-11).
  → Requires Change Manager exception approval.

RISK ASSESSMENT *
Risk level
○ Low    ◉ Medium    ○ High    ○ Critical

Risk factors (add at least 2)
[+ Add factor]
- Touches tier-1 production service ×
- Requires brief connection drain (~30s) ×

Risk score: 58 / 100  (auto-computed from matrix)

IMPACT *
Impact level
○ Minimal  ○ Minor   ◉ Moderate   ○ Major   ○ Extensive

IMPLEMENTATION PLAN *
[Markdown editor with slash commands — same as Doc 3b KB editor]
[                                                                           ]
[                                                                           ]
[                                                                           ]
At least 100 chars required. [Insert template]

ROLLBACK PLAN *
[Markdown editor]
[                                                                           ]
[                                                                           ]
[Insert template]

TEST PLAN
Brief description (full test plans linked separately):
[                                                                           ]

──────────
[← Back]                                                  [Next: Review →]
```

Live conflict check fires as user changes dates. Risk score auto-computed: low=15, medium=45, high=75, critical=92, with riskFactors count adjusting +/- 5 each.

Implementation/rollback plan editors should support slash commands (reuse the SlashCommandMenu from Doc 3b KB editor, or simpler version).

### Step 3: Review

```
REVIEW YOUR CHANGE REQUEST

Basics
  Title           Migrate payment-api to pgbouncer connection pooling
  Type            Normal change
  Risk            Medium (score: 58)
  Impact          Moderate
  Affected CIs    CI-APP-PAY-001, CI-DB-PAY-001 (2 CIs across 1 service)
  Linked items    PRB-2026-00018, INC-2026-00184, REL-2026-00020

Plan
  Window          Friday May 10, 14:00–16:00 UTC
  Conflicts       1 warning: marketing freeze window
                  → CM exception approval will be requested
  Implementation  [show full plan ▾]
  Rollback        [show full plan ▾]

Routing
  Approvers (auto-routed for Normal change):
    1. Service Owner (Tom Bergstrom, Payment Service) — required
    2. Change Manager (Sarah Chen) — required
    3. Release Manager (Helena Vasquez) — required (release linked)

  CAB session: Next session is Thursday May 9, 10:00 UTC
                Your change will be on the agenda.

COMMS
[ ] This change requires user-facing communication
    Channels: [ ] Status page  [ ] Email all-staff  [ ] Slack #incidents

──────────
[← Edit plan]                                  [Save as draft]  [Submit for review]
```

`[Submit for review]` → status = submitted, navigates to detail page.

### Step 4: Submit (success state)

After submit:

```
                              ✓ Change submitted!

                          CHG-2026-00092
                Migrate payment-api to pgbouncer connection pooling

                  Status: In Review
                  Awaiting: Service Owner, Change Manager, Release Manager
                  Next CAB session: Thursday May 9, 10:00 UTC

                       [View change →]   [Submit another]
```

Auto-navigate to detail after 3 seconds.

### Standard change flow

If user picks "Standard" in step 1, the wizard skips the elaborate risk/CAB sections and shows simplified flow: Basics → Plan (simpler) → Submit (auto-approved).

### Emergency change flow

If user picks "Emergency", red banner appears: "Emergency changes bypass standard CAB review but require Change Manager approval and post-implementation justification." Form simplified to: Basics → Plan → Submit (immediate notification to CM).

---

## 📄 PAGE 4a.3 — Change Detail

**File:** `src/routes/changes/ChangeDetail.tsx`
**Route:** `/changes/:changeId`

### Purpose
View change details, see approvals, plans, conflicts, PIR (if applicable).

### Layout: 3-column (similar to incident detail)

### Top bar

```
[← Calendar]                                                  [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[medium risk stripe]                                  [In Review ▾]
CHG-2026-00091  Migrate payment-api to pgbouncer connection pooling

  [Normal]  [Risk: Medium]  [Impact: Moderate]  [Score: 58/100]
  [payment]  [pgbouncer]  [pci-scope]  +2 tags

  Implementation window: Fri May 10, 14:00–16:00 UTC (in 2 days)
  Owner: David Okafor · Created Apr 30 by David Okafor
```

- Risk-color stripe at top edge (medium=amber)
- Status dropdown for state transitions
- `⋮` actions menu: Clone, Cancel, Reschedule, Promote to emergency

### Center column tabs

```
[Overview] [Plans] [Approvals (3)] [Conflicts (0)] [Linked (5)] [PIR] [History]
```

#### Tab: Overview

```
┌─ Description ─────────────────────────────────────────────────────────┐
│ Migrate payment-api from direct DB connections to pgbouncer transaction│
│ pooling to permanently fix the recurring connection pool exhaustion    │
│ pattern (PRB-2026-00018).                                              │
└────────────────────────────────────────────────────────────────────────┘

┌─ Justification ──────────────────────────────────────────────────────┐
│ Recurring P1/P2 incidents on Payment Service due to DB connection      │
│ pool saturation. Workaround (restart pods) effective but not scalable. │
│ pgbouncer migration is the agreed permanent fix per RCA in PRB-018.    │
└────────────────────────────────────────────────────────────────────────┘

┌─ Affected scope ─────────────────────────────────────────────────────┐
│ 2 CIs · 1 service                                                      │
│                                                                         │
│ ● Payment Service                                                      │
│   ▸ CI-APP-PAY-001  payment-api                                         │
│   ▸ CI-APP-PAY-002  payment-worker                                      │
│   ▸ CI-DB-PAY-001  pay-postgres-primary                                 │
│                                                                         │
│ Customer impact: ~30s connection drain during rolling restart.        │
│ Status page update planned.                                            │
└────────────────────────────────────────────────────────────────────────┘

┌─ Schedule ───────────────────────────────────────────────────────────┐
│ ⏰ Implementation window: Friday May 10, 14:00–16:00 UTC              │
│ Currently: in 2 days, 5 hours                                          │
│ Duration: 2 hours planned                                              │
│ Conflict status: ✓ No conflicts                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Plans

```
┌─ Implementation plan ─────────────────────────────[Edit]──────────────┐
│ [Full markdown rendered, scrollable]                                    │
│                                                                          │
│ ## Pre-deployment                                                       │
│ 1. Verify all prerequisites met:                                       │
│    - [x] Staging soak test (7 days, passed)                            │
│    ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌─ Rollback plan ───────────────────────────────────[Edit]──────────────┐
│ [Full markdown rendered]                                                │
└────────────────────────────────────────────────────────────────────────┘

┌─ Test plan ──────────────────────────────────────[Edit]──────────────┐
│ Pre-deploy: 7d staging soak test (passed). Post-deploy: smoke tests    │
│ + 30min observation.                                                    │
│ Linked test plan: TST-2026-00012                                       │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Approvals (3)

Visual approval matrix:

```
┌─ Required approvals ─────────────────────────────────────────────────┐
│                                                                         │
│ ● Service Owner — Tom Bergstrom (Payment Service)                      │
│   ✓ Approved · 2h ago                                                  │
│   "Necessary fix, well-prepared. Aligned with our Q2 reliability goal."│
│                                                                         │
│ ● Change Manager — Sarah Chen                                          │
│   ⏱ Awaiting decision                                                  │
│   [Approve] [Reject] [Approve with conditions]   ← visible if user is Sarah│
│                                                                         │
│ ● Release Manager — Helena Vasquez                                     │
│   ⏱ Awaiting decision                                                  │
│   "Will review after Change Manager."                                  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘

CAB session: Thursday May 9, 10:00 UTC — [Open CAB workspace →]
```

Each approval row: status icon + role + approver name + decision/timestamp + rationale (if any). For active approvers viewing their own pending approval, show inline approve/reject/conditional buttons.

Click `[Approve]` opens modal: rationale textarea + checkbox "Lock my decision (cannot change)" + Submit. After submit, decision locked, displays in row.

`[Approve with conditions]` opens larger modal asking for conditions text (required min 30 chars).

#### Tab: Conflicts (0 or N)

Empty state:
```
✓ No conflicts detected
This change has been validated against the FSC and freeze windows.
Last checked: 4 minutes ago
```

If conflicts exist:
```
⚠ 1 warning conflict

┌─ Freeze Window Conflict ─────────────────────────────────────────────┐
│ This change overlaps with the marketing campaign freeze window         │
│ (May 9-11, 2026)                                                       │
│                                                                         │
│ Severity: Warning                                                      │
│ Detected: May 7, 16:00 UTC                                             │
│ Status: Resolved                                                        │
│ Resolution: "Approved by Sarah Chen — change is critical for          │
│              compliance." (May 8, 09:00 UTC)                           │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Linked (5)

Sections (collapsible):
- Linked problems (1) — PRB-2026-00018 with status, owner, etc.
- Linked incidents (4) — INC-...184, ...156, ...132, ...098 (the recurring incidents)
- Linked release (1) — REL-2026-00020 with status
- Linked KB articles (1) — KB-00248 (draft pgbouncer runbook)
- Triggered incidents (0) — only populated post-implementation

Each section shows compact cards with quick stats and links.

#### Tab: PIR (only when status >= implemented)

For changes that haven't been implemented yet:
```
[icon: ClipboardCheck]
PIR not yet conducted
This change has not been implemented. PIR will be available once
the change is closed.
```

For implemented:
```
┌─ Post-Implementation Review ─────────────────────────────────────────┐
│ Outcome: ✓ Success                                                     │
│                                                                         │
│ Metrics:                                                                │
│   Planned duration:    60 min                                          │
│   Actual duration:     52 min                                          │
│   Unplanned downtime:  0 min                                           │
│   Customer impact:     None                                            │
│                                                                         │
│ ───                                                                     │
│ What went well:                                                         │
│ Smooth deployment, all health checks green.                            │
│                                                                         │
│ Lessons learned:                                                        │
│ Standard playbook works well for this type of change.                  │
│                                                                         │
│ Triggered incidents: None ✓                                            │
│                                                                         │
│ Follow-up actions: None                                                │
│                                                                         │
│ Reviewed by Helena Vasquez · May 7, 10:00 UTC                          │
│ Signed off by Sarah Chen · May 8, 15:30 UTC                            │
└────────────────────────────────────────────────────────────────────────┘
```

For failed/rolled_back, similar but with prominent "What went wrong" section, lessons learned, follow-up actions table (linkable to improvement initiatives).

#### Tab: History

Append-only audit log: state transitions, edits, approval decisions, conflict detection events. Standard timeline component.

### Left sidebar (sticky, 280px)

```
┌─ At a glance ─────────────┐
│ Status     ● In Review    │
│ Type       Normal         │
│ Risk       Medium (58)    │
│ Impact     Moderate       │
│ Owner      David Okafor   │
│ Team       Platform Eng   │
│ Created    9 days ago     │
│ Window     Fri May 10 14h │
└────────────────────────────┘

┌─ Risk factors ────────────┐
│ • Tier-1 production       │
│ • 30s connection drain    │
│ • Permanent fix for       │
│   PRB-2026-00018          │
│ • Well-tested staging     │
└────────────────────────────┘

┌─ Approvals progress ──────┐
│ ●●○ 1 of 3 received       │
│ Awaiting: 2 approvers     │
│ ⏱ CAB Thu May 9 10:00 UTC │
└────────────────────────────┘
```

### Right sidebar (sticky, 280px)

```
┌─ Quick actions ───────────┐
│ [Approve change]          │
│ [Reject]                  │
│ [Reschedule]              │
│ [Cancel change]           │
│ [Add comment]             │
│ [Open CAB workspace →]    │
└────────────────────────────┘

┌─ Watchers (4) ────────────┐
│ [DO] David Okafor (owner) │
│ [SC] Sarah Chen           │
│ [TB] Tom Bergstrom        │
│ [HV] Helena Vasquez       │
└────────────────────────────┘
```

---

## 📄 PAGE 4a.4 — CAB Workspace

**File:** `src/routes/changes/CABWorkspace.tsx`
**Route:** `/changes/cab`

### Purpose
**Differentiator page.** Replicates a CAB review meeting: voting interface, risk scoring, conflict visualization, agenda navigation. Designed to be projected on a screen during actual CAB meetings.

### Page header

```
CAB Workspace — Session: Thursday May 9, 10:00 UTC
3 changes on the agenda · 1 hour 15 min scheduled · 5 voting members
                                          [Start session ▶]  [Export agenda]
```

- Session info top-right; can switch between past/upcoming sessions via date picker
- "Start session" button — visual only, would lock voting and begin live mode

### Layout: agenda sidebar + center voting + right info

### Left: Agenda navigator (240px sticky)

```
┌─ AGENDA ─────────────────────────┐
│  ●  CHG-091  Pgbouncer migration │
│      Risk: Med · 58              │
│      ✓✓○ approvals               │
│  ────                             │
│     CHG-090  auth-service deploy │
│      Risk: Med · 45              │
│      ○○○ approvals               │
│  ────                             │
│     CHG-089  order replicas      │
│      Risk: Low · 22              │
│      ○○○ approvals               │
│  ────                             │
│  + 0 standard auto-approved      │
└──────────────────────────────────┘
```

Active item highlighted (primary border). Click to switch view.

### Center: Active change voting

For the currently selected change (CHG-091 by default), large detail card:

```
CHG-2026-00091 · Migrate payment-api to pgbouncer connection pooling

[Normal change]  [Risk: Medium · 58]  [Impact: Moderate]  [Window: Fri 14:00 UTC]

──────────────────────────────────────────────────────────────────────

DESCRIPTION (collapsible)
Migrate payment-api from direct DB connections to pgbouncer transaction
pooling to permanently fix the recurring connection pool exhaustion
pattern (PRB-2026-00018).
[Show full description ▾]

RISK ASSESSMENT
Score: 58 / 100  ████████████████░░░░░░░░░░░░░░░░░  Medium

Risk factors:
• Touches tier-1 production service (Payment Service)
• Requires brief connection drain (~30s)
• Permanent fix for PRB-2026-00018 (recurring issue) — POSITIVE
• Well-tested in staging for 7 days — POSITIVE

──────────────────────────────────────────────────────────────────────

CONFLICT ANALYSIS

✓ FSC validation: No time conflicts
✓ CI overlap check: No overlapping CI changes in window
✓ Freeze window: Outside marketing freeze (May 9-11 — change is May 10 14:00, window starts after)

──────────────────────────────────────────────────────────────────────

LINKED CONTEXT
Problem fixed:        PRB-2026-00018 (recurring memory pressure) — 4 incidents
Incidents resolved:   INC-184, INC-156, INC-132, INC-098
Release:              REL-2026-00020 (planned for May 10)
Implementation plan:  [Open in detail page →]
Rollback plan:        [Open in detail page →]

──────────────────────────────────────────────────────────────────────

VOTING

│ Approver               │ Role            │ Decision      │ Action       │
│ Tom Bergstrom          │ Service Owner   │ ✓ Approved    │ —            │
│ Sarah Chen (you)       │ Change Manager  │ ⏱ Pending     │ [Cast vote]  │
│ Helena Vasquez         │ Release Manager │ ⏱ Pending     │ —            │
│ David Okafor (owner)   │ —               │ — (proposer)  │ —            │
│ Aisha Khan (observer)  │ —               │ — (observer)  │ [Add note]   │
│                                                                          │
│ Result so far:  1 approve · 2 pending                                    │
│ Required: 3 of 3 voting members must approve                             │

──────────────────────────────────────────────────────────────────────

DISCUSSION (live notes during session)
[Discussion notes textarea — visible to all in session]
- Tom: "Comprehensive plan. Approving."
- Sarah: "Question on rollback timing — David, can you confirm the 5min ceiling?"
- David: "Yes, rollback is config-only revert. Tested in staging in 90s."
- Sarah: "OK, proceeding to vote."
[Add note...]

──────────────────────────────────────────────────────────────────────

[← Previous change]   [Skip]  [Defer to next session]   [Next change →]
```

The voting table is the critical UI:
- Each row shows approver, role, current decision, and action (Cast vote button only for current user)
- Real-time vote tally at bottom
- "Cast vote" opens modal: vote choice (approve / approve with conditions / reject / abstain) + rationale (required for non-approve) + submit
- Discussion notes section is collaborative (in MVP just a shared textarea per change)

### Right: Session info (260px sticky)

```
┌─ SESSION ─────────────────────┐
│ Thursday May 9, 10:00 UTC     │
│ Started: not yet              │
│ 3 changes · 5 members         │
│                                │
│ Members:                       │
│ [SC] Sarah (Chair)            │
│ [TB] Tom (Service Owner)      │
│ [HV] Helena (Release Mgr)     │
│ [DO] David (Observer)         │
│ [AK] Aisha (Observer)         │
└────────────────────────────────┘

┌─ FREEZE WINDOWS ──────────────┐
│ ⚠ Active until May 11:        │
│   Marketing campaign          │
│   (P1/P2 changes only)        │
└────────────────────────────────┘

┌─ STATS THIS QUARTER ──────────┐
│ Changes reviewed: 47          │
│ Approval rate:    89%         │
│ Avg discussion:   8 min       │
│ Failed PIRs:      2           │
└────────────────────────────────┘
```

### Voting flow

When user (Sarah) clicks `[Cast vote]`:

```
Cast vote on CHG-2026-00091                                       [×]

Your role: Change Manager (voting member)

DECISION
◉ Approve
○ Approve with conditions
○ Reject
○ Abstain

RATIONALE (required for reject / conditions; optional for approve)
[                                                                       ]
[                                                                       ]

[ ] Lock my vote (cannot change after submission)

                                      [Cancel] [Submit vote]
```

After submit:
- Vote recorded in approvals table
- Tally updates real-time
- If all required votes approve → change status auto-transitions to "approved"
- Toast notification: "✓ Vote recorded. Change now approved." or "✓ Vote recorded. 1 more approval needed."

### Past sessions view

Date picker at top → switch to past CAB. Shows historical decisions, no voting actions (read-only). Useful for audit.

### No active session state

Outside scheduled session times (or no upcoming session):

```
[icon: Calendar]
No active CAB session

Next scheduled session: Thursday May 9, 10:00 UTC (3 changes on agenda)

[View upcoming session]   [Schedule new session]
```

---

## 📄 PAGE 4a.5 — Releases List

**File:** `src/routes/releases/ReleasesList.tsx`
**Route:** `/releases`

### Page header

```
Releases
8 total · 3 active · 1 ready for prod approval · 2 rolled back this quarter
                                      [Pipeline view →]  [Notes archive →]  [+ New release]
```

### Filter bar

```
[🔍 Search...]  [Status ▾]  [Component ▾]  [Type ▾]  [Manager ▾]   [Reset]
```

### Stats strip

```
[All 8] [Planning 1] [In Validation 1] [Ready 1] [Released 3] [Rolled back 2]
```

### Releases as detailed cards (vertical list)

Each release is a rich card (not a dense table):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ● Planning                                                REL-2026-00020 │
│                                                                            │
│ payment-api 2.4.1 — Connection pooling overhaul                            │
│ patch · Helena Vasquez · Created 7 days ago                               │
│                                                                            │
│ COMPOSITION                                                                │
│ • 1 change         (CHG-2026-00091)                                       │
│ • 1 problem fixed  (PRB-2026-00018)                                       │
│ • 4 incidents      (resolved by this release)                             │
│                                                                            │
│ STAGES                                                                     │
│ ○━━━━━━━○━━━━━━━○                                                          │
│ dev      staging  production                                              │
│ pending  pending  pending (approval gate)                                 │
│                                                                            │
│ Planned release: May 10, 14:00 UTC                                         │
│                                                                            │
│                          [View pipeline]   [Open detail →]                 │
└────────────────────────────────────────────────────────────────────────────┘
```

Stages mini-stepper inline. Color-code: completed=green, in_progress=blue, failed=red, pending=gray.

Filter empty state: "No releases match. [Reset filters]"

---

## 📄 PAGE 4a.6 — Release Detail

**File:** `src/routes/releases/ReleaseDetail.tsx`
**Route:** `/releases/:releaseId`

### Top bar

```
[← Releases]                                                  [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[Planning ▾]
REL-2026-00020  payment-api 2.4.1 — Connection pooling overhaul

  [patch]  [payment]  [pgbouncer]  [pci-scope]

  Release manager: Helena Vasquez · Planned May 10, 14:00 UTC
```

### Center column tabs

```
[Overview]  [Composition]  [Pipeline]  [Notes]  [Feature flags]  [History]
```

#### Tab: Overview

Description, schedule, key metrics. Compact summary.

#### Tab: Composition

```
WHAT'S IN THIS RELEASE

CHANGES (1)
  CHG-2026-00091  Migrate payment-api to pgbouncer connection pooling
                  Normal · Medium risk · In Review

PROBLEMS FIXED (1)
  PRB-2026-00018  Recurring memory pressure on payment-api
                  Known Error → will close after this release

INCIDENTS RESOLVED (4)
  INC-2026-00184  Payment Service: 5xx error rate elevated (P1, active)
  INC-2026-00156  Payment Service total outage (P1, closed)
  INC-2026-00132  Payment API timeouts during AM peak (P2, closed)
  INC-2026-00098  Payment API 5xx errors during launch (P2, closed)

PREREQUISITES
  ✓ Provision pgbouncer in production VPC (met)
  ✓ 7-day staging soak test (met)
  ⏱ CHG-2026-00091 CAB approval (pending)

[+ Add change]   [+ Add prerequisite]
```

#### Tab: Pipeline (this release's stages)

```
DEPLOYMENT PIPELINE

○ ━━━━━━━ ○ ━━━━━━━ ○
DEV       STAGING    PRODUCTION
pending   pending    pending (approval required)

[expand each stage card below]

┌─ DEV ──────────────────────────────────────┐
│ Status: pending                              │
│ No deployment yet                            │
│ Approval required: No                        │
│ [Deploy to dev →] (visual only)             │
└──────────────────────────────────────────────┘

┌─ STAGING ──────────────────────────────────┐
│ Status: pending                              │
│ Awaiting dev success                         │
│ Approval required: No                        │
│ Tests will run: TST-2026-00012 (pgbouncer suite)│
└──────────────────────────────────────────────┘

┌─ PRODUCTION ──────────────────────────────┐
│ Status: pending                              │
│ Awaiting staging success                     │
│ ⚠ APPROVAL REQUIRED                          │
│   Approver: Helena Vasquez                  │
│ Health check: pending                        │
└──────────────────────────────────────────────┘
```

For an active release like REL-2026-00019 (auth-service, in_validation), pipeline view shows real progress: dev = green check, staging = animated spinner.

#### Tab: Notes

Markdown rendered release notes. Customer-facing version + internal notes (separate sections).

For REL-020:

```
## Payment API 2.4.1

### What's new
- **Connection pooling overhaul**: Migrated from direct DB connections to
  pgbouncer transaction pooling, dramatically reducing connection pressure
  during peak traffic.

### Resolved issues
- Eliminated recurring 5xx errors during peak load (4 incidents over 6 weeks)
- Improved checkout reliability — no expected user-facing impact

### Technical changes
- Connection pool now managed by pgbouncer (transaction mode)
- Application no longer manages DB connection pool directly
- Removed legacy retry logic (now handled by pgbouncer)

### Known issues
- None at release time

### Migration notes
- Brief 30-second connection drain during deployment
- Status page will be updated during deployment window
```

#### Tab: Feature flags

For releases with feature flags. REL-020 has none. REL-016 (notification-gw) might have a "rich-content-sms" flag at 10% rollout.

#### Tab: History

Audit log: state transitions, composition changes, approval decisions.

### Sidebars

Left: at-a-glance + composition summary + stages mini.
Right: quick actions (Lock composition, Promote to staging, Cancel release, Add change to release).

---

## 📄 PAGE 4a.7 — Release Pipeline (GitHub Actions style)

**File:** `src/routes/releases/ReleasePipeline.tsx`
**Route:** `/releases/pipeline`

### Purpose
Cross-release visualization showing all active releases progressing through dev → staging → production. GitHub Actions / GitLab CI vibe.

### Page header

```
Release Pipeline
3 active releases across pipeline · 1 awaiting production approval
                                                            [Last 30d ▾]
```

### Pipeline view (the main visualization)

```
                    DEV              STAGING            PRODUCTION
              ─────────────    ─────────────────    ─────────────────
              
REL-020        ○                ○                    ○
payment-api    pending          pending              pending (approval)
2.4.1
              ─────────────    ─────────────────    ─────────────────
              
REL-019        ✓ success        ◉ in_progress        ○
auth-service   30m ago          5m ago               pending
3.1.0                            142 / 150 tests
              ─────────────    ─────────────────    ─────────────────
              
REL-018        ✓ success        ✓ success             ◉ ready (approval)
order-api      2h ago           45m ago              awaiting Helena
3.1.0
              ─────────────    ─────────────────    ─────────────────
              
              ────── Released within last 7 days ─────
              
REL-017        ✓                ✓                    ✓ released
auth-service                                          7d ago
2.8.1
              ─────────────    ─────────────────    ─────────────────
              
REL-016        ✓                ✓                    ✓ released
notif-gw                                              1d ago
1.5.2
              ─────────────    ─────────────────    ─────────────────
```

Each row = one release. Each column = an environment. Cell shows:
- Stage status icon (○ pending / ◉ active / ✓ success / ✗ failed / ↩ rolled_back)
- Status label
- Time / progress detail
- Active stages have animated pulsing dot
- Failed stages have red bg

Click any cell → opens stage detail popover showing:
- Stage status
- Linked deployment (if any) with ID and link to `/deployments/{id}` (Doc 4b placeholder)
- Test run results (linked to Doc 4b)
- Action buttons: "Promote to next stage" / "Approve production gate" / "Rollback"

### Filters

Top toolbar:
```
[All components ▾]  [All statuses ▾]  [Active only] [Released] [Rolled back]
```

### Right rail

```
┌─ PIPELINE HEALTH ─────────┐
│ Success rate (30d)  87%   │
│ Avg dev → prod      4.2 days│
│ Rollbacks (30d)      2     │
│ Failed validations   1     │
└────────────────────────────┘

┌─ PRODUCTION APPROVAL ─────┐
│ Awaiting your approval:   │
│                            │
│ REL-018 order-api 3.1.0   │
│ All tests passed.         │
│ Staging healthy 45m.      │
│ [Review →]                │
└────────────────────────────┘
```

---

## 📄 PAGE 4a.8 — Release Notes Archive

**File:** `src/routes/releases/ReleaseNotes.tsx`
**Route:** `/releases/notes`

### Purpose
Browse historical release notes. Customer-facing perspective. Searchable archive.

### Page header

```
Release Notes
6 published releases · Browse customer-facing release notes
                                                          [🔍 Search notes...]
```

### Filter / sort

```
[Component ▾]  [Type: All / Major / Minor / Patch]   [Sort: Newest first ▾]
```

### Release notes feed (vertical, blog-style)

Each release shows full notes inline:

```
─────────────────────────────────────────────────────────────────
notification-gw 1.5.2                                  Released May 7
PATCH                                                  REL-2026-00016
─────────────────────────────────────────────────────────────────

### What's new
- Improved SMS delivery reliability for international numbers
- Added support for emoji in notification subject lines

### Bug fixes
- Fixed rate-limit handling for Twilio responses
- Fixed timezone display in scheduled notifications

### Known issues
- None

[View release detail →]

─────────────────────────────────────────────────────────────────
auth-service 2.8.1                                     Released May 1
PATCH                                                  REL-2026-00017
─────────────────────────────────────────────────────────────────

[Notes content...]

...
```

### Empty state

If filter yields no results: "No release notes match. [Reset]"

---

## 🎨 SHARED COMPONENTS

### `src/components/changes/`

```
components/changes/
├── ChangeRow.tsx                    # DataTable row
├── ChangeStatusPill.tsx
├── ChangeTypeChip.tsx               # Standard / Normal / Emergency
├── RiskBadge.tsx                    # Low / Medium / High / Critical
├── RiskScoreBar.tsx                 # 0-100 progress bar with color
├── ConflictWarningBadge.tsx
├── ChangeWindowDisplay.tsx          # "Fri May 10, 14:00–16:00 UTC"
├── ChangeCalendar/
│   ├── ChangeCalendar.tsx           # Main month/week view
│   ├── CalendarCell.tsx
│   ├── ChangePill.tsx               # Compact pill in calendar cell
│   ├── DayDetailPopover.tsx
│   └── ConflictHighlight.tsx
├── ChangeBoard/
│   ├── ChangeBoard.tsx              # Kanban
│   └── BoardColumn.tsx
├── NewChangeWizard/
│   ├── NewChangeWizard.tsx
│   ├── Step1Basics.tsx
│   ├── Step2Plan.tsx
│   ├── Step3Review.tsx
│   ├── Step4Submit.tsx
│   └── ConflictDetector.tsx         # Live conflict checking on schedule fields
├── ApprovalMatrix.tsx               # Grouped approver list with status
├── ApproveModal.tsx
├── RejectModal.tsx
├── ApproveWithConditionsModal.tsx
├── PIRPanel.tsx                     # PIR display (success or failure variants)
├── PIRForm.tsx                      # PIR creation form
└── CABWorkspace/
    ├── AgendaSidebar.tsx
    ├── ChangeVotingCard.tsx         # The big center card
    ├── VotingTable.tsx
    ├── DiscussionNotes.tsx
    ├── CastVoteModal.tsx
    └── SessionInfoPanel.tsx
```

### `src/components/releases/`

```
components/releases/
├── ReleaseCard.tsx                  # Detailed card for list page
├── ReleaseStatusPill.tsx
├── ReleaseTypeChip.tsx
├── StagesMiniStepper.tsx            # Compact 3-circle stepper
├── ReleaseCompositionPanel.tsx      # Composition display
├── ReleasePipeline/
│   ├── PipelineGrid.tsx             # The big cross-release grid
│   ├── PipelineRow.tsx
│   ├── PipelineCell.tsx
│   ├── StageDetailPopover.tsx
│   └── PipelineHealthSidebar.tsx
├── ReleaseNotesRenderer.tsx         # Markdown with custom styling
├── FeatureFlagsList.tsx
└── ReleaseSidebars.tsx
```

### Constants in `src/lib/constants.ts`

```typescript
export const changeTypeMeta: Record<ChangeType, { label: string; description: string; color: string; bg: string; icon: string }> = {
  standard:  { label: 'Standard',  description: 'Pre-approved low-risk',     color: '#067647', bg: '#ECFDF3', icon: 'CheckCircle' },
  normal:    { label: 'Normal',    description: 'Full CAB review required',  color: '#0BA5EC', bg: '#F0F9FF', icon: 'FileText' },
  emergency: { label: 'Emergency', description: 'Urgent expedited approval', color: '#B42318', bg: '#FEF3F2', icon: 'AlertTriangle' },
};

export const changeStatusMeta: Record<ChangeStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:             { label: 'Draft',             color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  submitted:         { label: 'Submitted',         color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_review:         { label: 'In Review',         color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  approved:          { label: 'Approved',          color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  scheduled:         { label: 'Scheduled',         color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  implementing:      { label: 'Implementing',      color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  implemented:       { label: 'Implemented',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed_successful: { label: 'Closed (success)',  color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed_failed:     { label: 'Closed (failed)',   color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  rejected:          { label: 'Rejected',          color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:         { label: 'Cancelled',         color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const riskMeta: Record<RiskLevel, { label: string; color: string; bg: string; min: number; max: number }> = {
  low:      { label: 'Low',      color: '#067647', bg: '#ECFDF3', min: 0,  max: 30 },
  medium:   { label: 'Medium',   color: '#DC6803', bg: '#FFFAEB', min: 31, max: 65 },
  high:     { label: 'High',     color: '#B42318', bg: '#FEF3F2', min: 66, max: 90 },
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2', min: 91, max: 100 },
};

export const cabVoteMeta: Record<CABVote, { label: string; color: string; icon: string }> = {
  approve:                   { label: 'Approve',                  color: '#12B76A', icon: 'Check' },
  approve_with_conditions:   { label: 'Approve with conditions',  color: '#F79009', icon: 'CheckCircle' },
  reject:                    { label: 'Reject',                   color: '#F04438', icon: 'X' },
  abstain:                   { label: 'Abstain',                  color: '#98A2B3', icon: 'Minus' },
};

export const releaseStatusMeta: Record<ReleaseStatus, { label: string; color: string; bg: string; dot: string }> = {
  planning:            { label: 'Planning',            color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  locked:              { label: 'Locked',              color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_validation:       { label: 'In Validation',       color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  ready:               { label: 'Ready',               color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  deploying:           { label: 'Deploying',           color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  released:            { label: 'Released',            color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  partially_released:  { label: 'Partially Released',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  rolled_back:         { label: 'Rolled Back',         color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:           { label: 'Cancelled',           color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const releaseTypeMeta: Record<ReleaseType, { label: string; description: string; color: string }> = {
  major:  { label: 'Major',  description: 'Breaking changes', color: '#B42318' },
  minor:  { label: 'Minor',  description: 'New features',     color: '#0BA5EC' },
  patch:  { label: 'Patch',  description: 'Bug fixes',        color: '#067647' },
  hotfix: { label: 'Hotfix', description: 'Emergency patch',  color: '#DC6803' },
};

export const stageStatusMeta: Record<ReleaseStage['status'], { label: string; color: string; icon: string; nodeStyle: string }> = {
  pending:     { label: 'Pending',     color: '#98A2B3', icon: 'Circle',     nodeStyle: 'pending' },
  in_progress: { label: 'In Progress', color: '#0BA5EC', icon: 'Loader2',    nodeStyle: 'active' },
  success:     { label: 'Success',     color: '#12B76A', icon: 'CheckCircle2', nodeStyle: 'completed' },
  failed:      { label: 'Failed',      color: '#F04438', icon: 'XCircle',    nodeStyle: 'failed' },
  rolled_back: { label: 'Rolled Back', color: '#DC6803', icon: 'Undo2',      nodeStyle: 'rollback' },
  skipped:     { label: 'Skipped',     color: '#98A2B3', icon: 'MinusCircle', nodeStyle: 'skipped' },
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace placeholders. **Order matters:** literal paths before `:param` paths.

```tsx
// Replace
{ path: 'changes',                element: <Placeholder ... /> },
{ path: 'changes/new',            element: <Placeholder ... /> },
{ path: 'changes/:id',            element: <Placeholder ... /> },
{ path: 'changes/calendar',       element: <Placeholder ... /> },
{ path: 'changes/cab',            element: <Placeholder ... /> },
{ path: 'releases',               element: <Placeholder ... /> },
{ path: 'releases/:id',           element: <Placeholder ... /> },
{ path: 'releases/pipeline',      element: <Placeholder ... /> },
{ path: 'releases/notes',         element: <Placeholder ... /> },

// With (CORRECT ORDER)
{ path: 'changes',                element: <ChangeCalendar /> },        // calendar IS the default view
{ path: 'changes/new',            element: <NewChange /> },
{ path: 'changes/calendar',       element: <ChangeCalendar /> },        // alias
{ path: 'changes/cab',            element: <CABWorkspace /> },
{ path: 'changes/:changeId',      element: <ChangeDetail /> },          // catch-all last

{ path: 'releases',               element: <ReleasesList /> },
{ path: 'releases/pipeline',      element: <ReleasePipeline /> },
{ path: 'releases/notes',         element: <ReleaseNotes /> },
{ path: 'releases/:releaseId',    element: <ReleaseDetail /> },         // catch-all last
```

---

## 🔗 CROSS-LINKING

Real links activated by Doc 4a:
- Change → linked CIs → `/cmdb/{ciId}` (Doc 1 real)
- Change → linked problem → `/problems/{id}` (Doc 3a real)
- Change → linked incidents → `/incidents/{id}` (Doc 3a real)
- Change → linked KB → `/kb/{slug}` (Doc 3b real)
- Change → linked release → `/releases/{releasePublicId}` (Doc 4a real)
- Release → composition: changes → real change links
- Release → composition: problems → real problem links
- Release → composition: incidents → real incident links
- Release pipeline cells → `/deployments/{id}` (Doc 4b placeholder, ok)
- Release stage tests → `/testing/runs/{id}` (Doc 4b placeholder)
- CAB workspace → change voting → real change updates
- Calendar → change pills → real change detail

**Update existing modules:**

1. **Doc 0 dashboard:**
   - Inbox preview `ibx-001` (CAB approval needed: Payment Service v2.4 rollout) → real link to CAB workspace + CHG-091. Update text: "CAB approval needed: Payment v2.4.1 (CHG-091)" → links to `/changes/cab`.
   - Inbox preview `ibx-007` (PIR sign-off: Auth Service 2.8.1) → real link to `/changes/{CHG-of-REL-017}/pir-tab`
   - Notification `ntf-008` (Helena mentioned you in CHG-091) → real link to change detail
   - Notification `ntf-014` (Maintenance window scheduled) → real link to `/changes/CHG-2026-00086`
   - "Recent Changes & Releases" section in dashboard now shows real upcoming changes from `getUpcomingChanges(7)`.

2. **Doc 3a problem detail:**
   - "Permanent fix" sidebar showing CHG-091 → real link works now
   - "Linked changes" section displays real change cards
   - PRB-018's known error mentions CHG-091 → inline hyperlink works

3. **Doc 3a incident detail:**
   - INC-184's "Linked items" tab shows linked changes (CHG-091) → real link
   - PIR-related context: incidents triggered by failed changes (e.g. CHG-080 → INC-170) — back-linked

4. **Doc 1 CMDB detail:**
   - "Linked Items" tab "Recent Changes" now uses real `getChangesByCI(ciId)` data with real navigation

5. **Doc 2 events:**
   - Event payloads with `cicd` source can reference real release IDs in their payload

---

## ✅ QUALITY CHECKLIST

- [ ] All 9 routes work without 404 (correct order: calendar/cab/new before :changeId; pipeline/notes before :releaseId)
- [ ] `/changes` renders calendar with month grid; today highlighted; change pills colored by risk
- [ ] Calendar pills click → navigate to change detail
- [ ] Calendar conflict highlighting works (red badge on conflicted days)
- [ ] Day-detail popover for cells with >3 changes
- [ ] View toggle Calendar/Board/List works
- [ ] Right sidebar shows "This week" + "Awaiting your approval" + "Active conflicts"
- [ ] `/changes/new` shows 4-step wizard with progress bar
- [ ] Step 1: type radios with descriptions; affected CIs picker; linked items
- [ ] Step 2: schedule with live conflict check; risk assessment with auto-computed score; markdown plan editors
- [ ] Step 3: review with collapsible plan sections
- [ ] Submit → success state → auto-navigate to detail
- [ ] Standard change flow simplifies wizard
- [ ] Emergency change shows red banner
- [ ] `/changes/CHG-2026-00091` shows full detail with 7 tabs
- [ ] Approval matrix shows 3 approvers with status; voting buttons inline for current user
- [ ] Approve modal captures rationale, locks decision
- [ ] Conflicts tab shows warnings with resolution notes
- [ ] PIR tab gracefully shows "not yet conducted" for non-implemented changes
- [ ] PIR display (for CHG-080) shows full failure analysis with follow-up actions table
- [ ] `/changes/cab` shows agenda sidebar + center voting card + right session info
- [ ] Voting table with cast vote button works
- [ ] Cast vote modal: decision radio + rationale + lock checkbox
- [ ] Live tally updates after vote submission
- [ ] Discussion notes inline editable
- [ ] Switch between agenda items via sidebar
- [ ] Past sessions accessible via date picker (read-only)
- [ ] No active session state shows next upcoming session
- [ ] `/releases` shows 8 releases as detailed cards with mini stepper
- [ ] Filters work; stats strip clickable
- [ ] `/releases/REL-2026-00020` shows 6 tabs; composition includes real cross-links
- [ ] `/releases/pipeline` shows cross-release grid with all releases as rows, environments as columns
- [ ] Each pipeline cell color-coded by status, animated for active
- [ ] Click cell → opens stage detail popover
- [ ] `/releases/notes` shows blog-style archive with markdown notes
- [ ] All public IDs use mono font
- [ ] Doc 0 inbox/notifications updated with real links
- [ ] Doc 3a problem detail "Permanent fix" sidebar links to real CHG-091
- [ ] Doc 3a incident detail linked changes show real cards
- [ ] Doc 1 CMDB detail "Recent Changes" uses real data
- [ ] Sidebar nav highlights "Changes" or "Releases" parent on relevant routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/change.ts` and `src/types/release.ts`, re-exported
2. Mock data: `changes.ts`, `releases.ts`, plus update `mocks/index.ts` exports
3. Module components in `src/components/changes/` and `src/components/releases/`
4. 9 route files in `src/routes/changes/` and `src/routes/releases/`
5. Routing config updated with correct order (literal paths before parametric)
6. Sidebar items "Changes" and "Releases" highlight correctly
7. Doc 0 dashboard / Doc 1 CMDB / Doc 3a incident & problem detail updated with real Doc 4a links

After generation, do not start Doc 4b yet. Wait for the next prompt.

---

*End of Doc 4a.*
