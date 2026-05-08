# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 3a — Operational Response Cluster: Incident + Problem Management

> **Prerequisite:** Doc 0 + Doc 1 + Doc 2 sudah di-execute di Build Mode session yang sama.
> **Modules:** Incident Management (§7.2) + Problem Management (§7.3)
> **Routes covered:** `/incidents`, `/incidents/[id]`, `/incidents/major/[id]`, `/incidents/analytics`, `/problems`, `/problems/[id]`, `/problems/[id]/rca`, `/kedb`
> **Companion:** Doc 3b (Service Request + KB) — to be applied after this.

---

## 🎯 SCOPE & DEPENDENCIES

Doc 3a covers **two tightly coupled modules**: Incident (reactive — restore service ASAP) and Problem (deeper investigation — find root cause). Both link heavily to CMDB (Doc 1) and Events (Doc 2).

**Reuse from Doc 0 + 1 + 2:**
- AppShell, all UI primitives, formatters
- Mock data: users, teams, services, CIs, events, monitoring rules
- Cross-link: incidents ↔ events (Doc 2), incidents ↔ CIs (Doc 1), problems ↔ KB (Doc 3b placeholder ok)

**To be added in Doc 3a:**
- Domain types: `Incident`, `IncidentEvent` (timeline), `IncidentComment`, `Problem`, `KnownError`, `RCAAnalysis`
- Mock data: 25 incidents (with full timelines), 8 problems, ~12 known errors
- Module components in `src/components/incidents/` and `src/components/problems/`
- 8 route implementations
- Update routing config

---

## 🧩 DOMAIN TYPES (`src/types/incident.ts`)

```typescript
import { Severity, GenericStatus } from './common';

// Incident lifecycle states
export type IncidentStatus =
  | 'new'              // Just created, not yet triaged
  | 'triaging'         // Being assessed
  | 'in_progress'      // Active work
  | 'pending'          // Waiting on external party
  | 'resolved'         // Fixed but pending close
  | 'closed';          // Verified and closed

// Priority (separate from severity — severity is technical, priority is business)
export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

// SLA timer status
export type SLAStatus = 'healthy' | 'warning' | 'breached' | 'paused' | 'met';

// Incident timeline event kinds
export type IncidentEventKind =
  | 'created'
  | 'assigned'
  | 'priority_changed'
  | 'status_changed'
  | 'comment_added'
  | 'ci_linked'
  | 'ci_unlinked'
  | 'problem_linked'
  | 'event_linked'
  | 'sla_warning'
  | 'sla_breached'
  | 'escalated'
  | 'major_declared'
  | 'comms_posted'      // Public communication update (war room)
  | 'resolution_added'
  | 'resolved'
  | 'reopened'
  | 'closed';

// === INCIDENT ===
export interface Incident {
  id: string;
  publicId: string;              // e.g. "INC-2026-00184"

  title: string;
  description: string;           // Markdown supported

  status: IncidentStatus;
  priority: IncidentPriority;
  severity: Severity;            // Technical severity, often equals priority

  // Major incident
  isMajor: boolean;              // P1 + customer impact = major
  majorDeclaredAt?: string;
  majorDeclaredBy?: string;      // user id
  incidentCommander?: string;    // user id (only for major)

  // Assignment
  assigneeId?: string;
  assigneeTeamId?: string;

  // Reporter
  reporterId: string;
  reporterChannel: 'monitoring' | 'user_report' | 'self_service' | 'phone' | 'email' | 'integration';

  // Affected
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];  // Derived but stored for query speed
  customerImpact?: string;       // Free text, e.g. "Checkout unavailable for ~10% of users"

  // Linkage
  triggeringEventId?: string;    // Public ID of the source event
  triggeringEventPublicId?: string;
  linkedProblemId?: string;
  linkedProblemPublicId?: string;
  linkedChangeIds?: string[];    // CHG-* IDs (placeholder for Doc 4)

  // SLA
  slaResponseTarget: number;     // Minutes to first response
  slaResolveTarget: number;      // Minutes to resolution
  slaResponseStatus: SLAStatus;
  slaResolveStatus: SLAStatus;
  firstResponseAt?: string;      // When first response happened (ack)

  // Resolution
  resolution?: {
    summary: string;             // What was done
    rootCause?: string;          // What caused it (lightweight; full RCA via Problem)
    workaround?: string;
    resolvedAt: string;
    resolvedBy: string;          // user id
  };
  reopenCount: number;           // Times this was reopened

  // Timestamps
  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  // Tags
  tags: string[];
}

// Timeline entry
export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  kind: IncidentEventKind;
  actorId: string | 'system';
  actorName: string;             // Denormalized
  timestamp: string;
  // Kind-specific details
  details?: {
    fromStatus?: IncidentStatus;
    toStatus?: IncidentStatus;
    fromPriority?: IncidentPriority;
    toPriority?: IncidentPriority;
    assigneeId?: string;
    assigneeName?: string;
    ciPublicId?: string;
    eventPublicId?: string;
    problemPublicId?: string;
    commsBody?: string;          // For 'comms_posted'
    commsAudience?: 'internal' | 'all_staff' | 'customer';
    note?: string;               // Free text for some kinds
  };
}

// Comment thread (separate from timeline; user-authored discussions)
export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  body: string;                  // Markdown
  isInternal: boolean;           // Internal note vs visible to reporter
  mentions: string[];            // User ids mentioned
  attachments?: Array<{ id: string; name: string; size: number; mimeType: string }>;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: string;      // For threaded replies
}
```

## 🧩 DOMAIN TYPES (`src/types/problem.ts`)

```typescript
import { Severity } from './common';

export type ProblemStatus =
  | 'identified'        // New, not yet investigated
  | 'investigating'     // Active RCA
  | 'known_error'       // Root cause known, workaround documented
  | 'fix_in_progress'   // Permanent fix being applied (linked to Change)
  | 'closed';           // Verified resolved

export type ProblemSource =
  | 'incident_pattern'  // Detected by correlation engine from multiple incidents
  | 'major_incident'    // Spawned from a P1 PIR
  | 'proactive'         // Identified proactively by SRE
  | 'audit'             // From compliance audit
  | 'user_reported';

// RCA technique
export type RCATechnique = 'five_whys' | 'fishbone' | 'fault_tree' | 'timeline' | 'narrative';

// === PROBLEM ===
export interface Problem {
  id: string;
  publicId: string;                  // e.g. "PRB-2026-00021"

  title: string;
  description: string;               // Markdown

  status: ProblemStatus;
  severity: Severity;                // Highest severity from related incidents
  source: ProblemSource;

  // Ownership
  ownerId: string;                   // The investigator (typically L3/SRE)
  ownerTeamId: string;

  // Impact
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];

  // Incident linkage
  relatedIncidentIds: string[];      // Public IDs
  relatedIncidentCount: number;      // Denormalized
  firstIncidentDate?: string;        // Earliest incident attributed to this problem
  lastIncidentDate?: string;         // Most recent occurrence

  // RCA
  rca?: RCAAnalysis;

  // Known error data (populated when status = known_error)
  knownError?: {
    publishedAt: string;
    publishedBy: string;             // user id
    rootCause: string;                // Short, definitive
    workaround: string;               // What ops can do RIGHT NOW
    workaroundEffectiveness: 'full' | 'partial' | 'none';
    affectedVersions?: string;        // e.g. "payment-api < 2.4.1"
    permanentFixPlan?: string;        // What's needed for permanent fix
  };

  // Permanent fix
  linkedChangeIds: string[];         // CHG-* (placeholder)
  linkedKBArticleIds: string[];      // KB-* (Doc 3b placeholder)

  // Tags
  tags: string[];

  // Audit
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// === RCA ANALYSIS ===
export interface RCAAnalysis {
  id: string;
  problemId: string;
  technique: RCATechnique;
  summary: string;                   // Short narrative

  // Five-whys structure (when technique = five_whys)
  fiveWhys?: Array<{
    level: number;                   // 1-5
    question: string;
    answer: string;
  }>;

  // Fishbone categories (when technique = fishbone)
  fishbone?: {
    problem: string;                 // The "head"
    categories: Array<{
      name: string;                  // e.g. "People", "Process", "Technology", "Environment"
      causes: string[];
    }>;
  };

  // Timeline (any technique can include this)
  timelineEntries?: Array<{
    timestamp: string;
    event: string;
    isContributing: boolean;
  }>;

  // Findings
  rootCauses: string[];              // The actual root cause(s)
  contributingFactors: string[];
  recommendedActions: Array<{
    description: string;
    type: 'preventive' | 'detective' | 'corrective';
    owner?: string;                  // user id
    targetDate?: string;
    status: 'open' | 'in_progress' | 'done';
    linkedChangeId?: string;
    linkedImprovementId?: string;
  }>;

  // Author
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}
```

In `src/types/index.ts`, add:
```typescript
export * from './incident';
export * from './problem';
```

---

## 🗄 MOCK DATA

### `src/mocks/incidents.ts` — 25 incidents (replace placeholder from Doc 0)

This **replaces** the simpler `MockIncidentSummary` from Doc 0 with full `Incident` objects. Keep the same 8 incidents from Doc 0's mock list (matching dashboard) and add 17 more.

**Distribution:**
- Status: new=2, triaging=2, in_progress=4, pending=1, resolved=8, closed=8
- Priority: P1=2 (1 active major), P2=6, P3=12, P4=5
- Tagged with `is-major: 1` (the active P1 incident)
- Reporter channel mix: monitoring (15), user_report (5), self_service (3), email (2)

**Required incidents** (must include — match Doc 0 dashboard):

```
INC-2026-00184  Payment Service: 5xx error rate elevated
  P1, severity P1, isMajor: true, status: in_progress
  assigneeId: u-004 (David Okafor), assigneeTeamId: t-platform
  reporterChannel: monitoring (created from EVT-2026-00184-A)
  triggeringEventPublicId: EVT-2026-00184-A
  affectedCIIds: [CI-APP-PAY-001, CI-DB-PAY-001]
  affectedServiceIds: [svc-001]
  customerImpact: "~12% of checkout attempts failing with 503 since 08:14 UTC"
  incidentCommander: u-001 (Sarah Chen)
  majorDeclaredAt: 2026-05-08T08:18:00Z
  createdAt: 2026-05-08T08:14:00Z
  slaResponseTarget: 5, slaResolveTarget: 60
  firstResponseAt: 2026-05-08T08:16:00Z
  slaResponseStatus: met, slaResolveStatus: warning (cutoff approaching)
  reopenCount: 0
  tags: [production, payment, customer-facing, p1]
  linkedProblemPublicId: PRB-2026-00018 (recurring issue)

INC-2026-00183  Order Service: latency spike on /checkout
  P2, status: in_progress, assigneeId: u-005 (Yuki Tanaka)
  triggeringEventPublicId: EVT-2026-00183-A
  affectedCIIds: [CI-APP-ORD-001]
  customerImpact: "Checkout taking 3-5s instead of <1s"
  createdAt: 2026-05-08T07:42:00Z

INC-2026-00182  Search Service: ES cluster yellow status
  P2, status: in_progress, assigneeId: u-008 (Aisha Khan)
  slaResponseStatus: breached
  triggeringEventPublicId: EVT-2026-00182-A
  affectedCIIds: [(synthetic search infra ID)]
  createdAt: 2026-05-08T06:15:00Z

INC-2026-00181  Auth: SSO login failures from EU region
  P3, status: triaging, assigneeId: u-002 (Marcus Hill)
  reporterChannel: user_report
  affectedCIIds: [CI-APP-AUTH-001]
  createdAt: 2026-05-08T05:33:00Z

INC-2026-00180  CI/CD: scheduled deploy queue backed up
  P3, status: new, assigneeId: u-001 (Sarah Chen)
  reporterChannel: monitoring
  affectedCIIds: [(svc-008 CI)]
  createdAt: 2026-05-08T04:01:00Z

INC-2026-00179  Notification Gateway: SMS provider rate limit
  P3, status: resolved (resolution: "Twilio rate limit increased after support ticket. Resumed normal flow.")
  resolvedBy: u-008, resolvedAt: 2026-05-07T23:00:00Z
  createdAt: 2026-05-07T22:18:00Z

INC-2026-00178  Analytics Pipeline: delayed batch by 25min
  P4, status: resolved (resolution: "Auto-recovered after upstream backfill completed.")
  createdAt: 2026-05-07T18:05:00Z

INC-2026-00177  Internal Wiki: scheduled maintenance window
  P4, status: closed (resolution: "Planned maintenance complete.")
  createdAt: 2026-05-07T14:00:00Z
```

**Generate 17 more incidents** spanning last 30 days:
- 1 additional P1 (now closed, with full PIR-ready resolution): "INC-2026-00156 Payment Service total outage" — 30 min outage 5 days ago, full timeline, customer-facing, generated this incident's PRB-2026-00018
- 4 P2 incidents covering different services: order, search, auth, internal wiki
- 8 P3 incidents covering minor issues
- 4 P4 incidents (informational/low impact)

For each incident, populate:
- Realistic Indonesian timestamps spread across last 30 days
- Mix of `assigneeId` from mock users
- `reporterId`: from mock users (mostly u-002 or u-003 for service desk reports)
- `affectedCIIds`: 1-3 CIs from mockCIs
- Realistic customer impact text where applicable
- `slaResponseTarget` based on priority: P1=5min, P2=15min, P3=60min, P4=240min
- `slaResolveTarget`: P1=60min, P2=240min, P3=480min, P4=1440min (24h)
- `slaResponseStatus` and `slaResolveStatus`: realistic mix — most healthy, some warning, 2-3 breached on older incidents
- `tags`: at least 2-3 each from {production, staging, customer-facing, payment, auth, order, data, infrastructure, p1/p2/p3/p4, recurring}
- For resolved/closed: full `resolution` object with realistic summary, root cause sentence, optional workaround
- `reopenCount`: mostly 0, 2-3 incidents have reopenCount: 1

**Helper functions:**
```typescript
export const getIncidentById = (id: string) => mockIncidents.find(i => i.id === id || i.publicId === id);
export const getIncidentsByCI = (ciId: string) => mockIncidents.filter(i => i.affectedCIIds.includes(ciId) || i.affectedCIPublicIds.includes(ciId));
export const getIncidentsByProblem = (problemPublicId: string) => mockIncidents.filter(i => i.linkedProblemPublicId === problemPublicId);
export const getActiveIncidents = () => mockIncidents.filter(i => !['resolved', 'closed'].includes(i.status));
export const getMajorIncidents = () => mockIncidents.filter(i => i.isMajor);
```

### `src/mocks/incidentTimelines.ts` — Timeline events

For each incident, generate 5-15 timeline events covering its lifecycle. **Examples for INC-2026-00184:**

```
2026-05-08T08:14:00Z  created           system (Correlation Engine)
                      "Auto-created from event EVT-2026-00184-A
                       (Payment API 5xx error rate > 1%)"
                      details: { eventPublicId: 'EVT-2026-00184-A' }

2026-05-08T08:14:30Z  ci_linked          system
                      details: { ciPublicId: 'CI-APP-PAY-001' }

2026-05-08T08:14:45Z  assigned           system
                      details: { assigneeId: 'u-004', assigneeName: 'David Okafor' }
                      "Auto-assigned to Platform on-call"

2026-05-08T08:16:00Z  status_changed     David Okafor
                      details: { fromStatus: 'new', toStatus: 'triaging' }
                      "Acknowledged"

2026-05-08T08:18:00Z  major_declared     Sarah Chen
                      "Customer impact confirmed via support tickets.
                       Declaring major. Sarah Chen as IC."

2026-05-08T08:18:00Z  priority_changed   Sarah Chen
                      details: { fromPriority: 'P2', toPriority: 'P1' }

2026-05-08T08:19:00Z  comms_posted       Sarah Chen
                      details: { commsAudience: 'all_staff',
                                 commsBody: 'P1 incident on Payment Service. Investigating.' }

2026-05-08T08:22:00Z  problem_linked     David Okafor
                      details: { problemPublicId: 'PRB-2026-00018' }
                      "Linking to recurring problem — same fingerprint."

2026-05-08T08:24:00Z  ci_linked          David Okafor
                      details: { ciPublicId: 'CI-DB-PAY-001' }
                      "Adding DB as suspected root cause"

2026-05-08T08:26:00Z  status_changed     David Okafor
                      details: { fromStatus: 'triaging', toStatus: 'in_progress' }

2026-05-08T08:32:00Z  comment_added      David Okafor
                      "DB connection pool at 95%. Restarting payment-worker
                       to release stuck connections."

2026-05-08T08:38:00Z  comms_posted       Sarah Chen
                      details: { commsAudience: 'all_staff',
                                 commsBody: 'Identified DB pool saturation as
                                            cause. Mitigation in progress.' }

(...currently in progress, no resolution yet)
```

For each closed incident, end timeline with `resolution_added` → `resolved` → (later) `closed`.

### `src/mocks/incidentComments.ts` — Comments

Generate 30-50 comments distributed across active and recently-resolved incidents. Use realistic engineering Slack-style language, with @mentions, brief technical observations, code snippets occasionally. INC-2026-00184 should have 6-8 comments showing investigation flow.

Example comment shapes:
```typescript
{
  authorId: 'u-005',
  authorName: 'Yuki Tanaka',
  body: 'Looking at the metrics, db CPU is at 78%. @david.okafor what does pg_stat_activity show?',
  isInternal: true,
  mentions: ['u-004'],
  createdAt: '2026-05-08T08:34:00Z',
}
```

### `src/mocks/problems.ts` — 8 problems

```
PRB-2026-00018  Recurring memory pressure on payment-api
  Status: known_error
  Source: incident_pattern (correlated 4 incidents over 6 weeks)
  Owner: u-005 (Yuki Tanaka)
  Severity: P2
  affectedCIIds: [CI-APP-PAY-001, CI-DB-PAY-001]
  relatedIncidentIds: [INC-2026-00184, INC-2026-00156, INC-2026-00132, INC-2026-00098]
  relatedIncidentCount: 4
  firstIncidentDate: 2026-03-25
  lastIncidentDate: 2026-05-08 (current INC-184)
  knownError: {
    publishedAt: 2026-04-15
    rootCause: "DB connection pool size (20) too small for peak traffic;
                triggers cascading 5xx when pool exhausted"
    workaround: "Restart payment-worker pods to release leaked connections.
                 Increase pool size to 50 in next deploy."
    workaroundEffectiveness: 'partial'
    affectedVersions: 'payment-api 2.3.x and 2.4.0'
    permanentFixPlan: 'Migrate to pgbouncer pooler + retry logic'
  }
  linkedChangeIds: ['CHG-2026-00091']  // Permanent fix change
  rca: { /* full five_whys analysis, see below */ }
  tags: [recurring, payment, p2, pool-exhaustion]

PRB-2026-00021  Search ES cluster yellow status during high load
  Status: investigating
  Source: incident_pattern
  Owner: u-008 (Aisha Khan)
  relatedIncidentCount: 3
  rca: { /* fishbone in progress */ }

PRB-2026-00019  Auth: SSO timeouts from EU region (intermittent)
  Status: identified
  Source: user_reported
  Owner: u-002 (Marcus Hill)
  relatedIncidentCount: 2

PRB-2026-00017  Order event consumer occasionally drops messages
  Status: known_error
  Source: incident_pattern
  knownError: { /* documented */ }

PRB-2026-00015  Notification Gateway: SMS rate limits hit during marketing campaigns
  Status: closed
  Source: proactive
  closedAt: 2026-04-22
  rca: { /* completed */ }

PRB-2026-00012  CI/CD pipeline: smoke test flakiness on staging
  Status: fix_in_progress
  Source: proactive
  linkedChangeIds: ['CHG-2026-00088']

PRB-2026-00010  Internal Wiki: search index sometimes stale
  Status: known_error
  knownError: { workaroundEffectiveness: 'full', workaround: 'Wait 5 min for next reindex job' }

PRB-2026-00008  Analytics pipeline: schema drift not detected
  Status: closed
  Source: audit
  closedAt: 2026-04-10
```

For PRB-2026-00018 (the showcase one), populate full `rca` object:

```typescript
rca: {
  id: 'rca-001',
  problemId: '<prb-internal-id>',
  technique: 'five_whys',
  summary: 'Connection pool sized for steady-state traffic, not peak. Connection leaks compound the issue during spikes.',
  fiveWhys: [
    { level: 1, question: 'Why does payment-api return 5xx during peak?',
      answer: 'Application threads block waiting for a DB connection from the pool.' },
    { level: 2, question: 'Why are threads waiting for connections?',
      answer: 'All 20 pool connections are checked out and not being returned in time.' },
    { level: 3, question: 'Why are connections not returned in time?',
      answer: 'Some connections leak when async error handlers throw, pool size is too small for peak QPS.' },
    { level: 4, question: 'Why is the pool size 20?',
      answer: 'Default value from initial deployment 18 months ago, never tuned for current traffic levels.' },
    { level: 5, question: 'Why was it never tuned?',
      answer: 'No load testing in CI/CD; no capacity review process for tier-1 services.' },
  ],
  timelineEntries: [
    { timestamp: '2026-03-25T14:22Z', event: 'First occurrence: INC-2026-00098', isContributing: false },
    { timestamp: '2026-04-02T11:00Z', event: 'Pool exhaustion observed during marketing campaign', isContributing: true },
    { timestamp: '2026-04-15T16:00Z', event: 'Workaround published as known_error', isContributing: false },
    { timestamp: '2026-04-30T09:30Z', event: 'CHG-2026-00091 raised for permanent fix', isContributing: false },
    { timestamp: '2026-05-08T08:14Z', event: 'Latest occurrence: INC-2026-00184', isContributing: false },
  ],
  rootCauses: [
    'DB connection pool sized at 20 (default) is insufficient for current peak traffic of ~800 QPS.',
    'Application has connection leaks in async error paths.',
  ],
  contributingFactors: [
    'No automated load testing in CI/CD pipeline.',
    'No quarterly capacity review for tier-1 services.',
    'Monitoring alerts on pool > 80%, but cooldown 10m is too long for fast saturation events.',
  ],
  recommendedActions: [
    { description: 'Migrate to pgbouncer transaction-mode pooling (CHG-2026-00091)',
      type: 'corrective', owner: 'u-004', targetDate: '2026-05-15', status: 'in_progress',
      linkedChangeId: 'CHG-2026-00091' },
    { description: 'Fix connection leak in async error handlers (PR #4421)',
      type: 'corrective', owner: 'u-004', targetDate: '2026-05-12', status: 'in_progress' },
    { description: 'Add load testing stage to CI for tier-1 services',
      type: 'preventive', owner: 'u-001', targetDate: '2026-05-30', status: 'open' },
    { description: 'Establish quarterly capacity review process',
      type: 'preventive', owner: 'u-007', targetDate: '2026-06-30', status: 'open',
      linkedImprovementId: 'IMP-2026-00012' },
    { description: 'Reduce monitoring cooldown for pool saturation rule from 10m to 2m',
      type: 'detective', owner: 'u-001', targetDate: '2026-05-10', status: 'done' },
  ],
  authorId: 'u-005',
  authorName: 'Yuki Tanaka',
  createdAt: '2026-04-15T10:00:00Z',
  updatedAt: '2026-04-30T14:30:00Z',
}
```

For PRB-2026-00021 (search ES — investigating, fishbone style), populate partial fishbone:

```typescript
rca: {
  technique: 'fishbone',
  summary: 'Investigation in progress. Multiple contributing factors suspected.',
  fishbone: {
    problem: 'ES cluster goes yellow during data ingestion peaks',
    categories: [
      { name: 'Technology',
        causes: ['Insufficient replicas', 'Old ES version (7.10)', 'Single-node hot tier'] },
      { name: 'Process',
        causes: ['No staging tier in indexing pipeline', 'Bulk reindex during business hours'] },
      { name: 'People',
        causes: ['Limited ES expertise on team', 'On-call runbook outdated'] },
      { name: 'Environment',
        causes: ['Spot instances cause node churn', 'Network throttling between AZs'] },
    ],
  },
  rootCauses: [], // Still investigating
  contributingFactors: [],
  recommendedActions: [],
  authorId: 'u-008',
  createdAt: '2026-05-01T09:00:00Z',
}
```

Other problems can have lighter or no RCA.

### `src/mocks/knownErrors.ts` — derived view (helper)

Not a separate type — just a helper:
```typescript
export const getKnownErrors = () => mockProblems.filter(p => p.status === 'known_error');
```

This drives the `/kedb` page.

---

## 📄 PAGE 3.1 — Incident Queue

**File:** `src/routes/incidents/IncidentQueue.tsx`
**Route:** `/incidents`

### Purpose
ServiceNow-style dense queue. Default view for L1/L2 agents. Sortable, filterable, bulk-actionable.

### Page header

```
Incidents
25 total · 9 active · 1 major (P1)
                    [Saved views ▾]  [Analytics →]   [+ New incident]
```

- Title + subtitle with live counts
- "Saved views" dropdown: My open · Team queue · P1/P2 only · Breached SLA · Recently resolved · Customer-facing
- "Analytics →" link → `/incidents/analytics`
- `[+ New incident]` opens create modal

### Major incident banner (when `isMajor && status !== closed`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚨 MAJOR INCIDENT IN PROGRESS                                            │
│ INC-2026-00184  Payment Service: 5xx error rate elevated                │
│ IC: Sarah Chen · Started 38m ago · Resolve SLA in 22m                   │
│                                              [Open war room →]            │
└─────────────────────────────────────────────────────────────────────────┘
```

Background: red-tinted (`--ois-danger-pale` with `--ois-danger` border). Pulsing dot animation on the 🚨 icon. Click "Open war room" → `/incidents/major/INC-2026-00184`.

### Filter & search bar

```
[🔍 Search ID, title, assignee, CI...]   [Status ▾]  [Priority ▾]  [Assignee ▾]  [Service ▾]  [SLA ▾]  [Tags ▾]   [Reset]
```

Status filter shows badge counts: `[All 25] [New 2] [Triaging 2] [In progress 4] [Pending 1] [Resolved 8] [Closed 8]`.

### Quick filter chips

```
[🔥 My open (3)]  [⚠ SLA at risk (2)]  [💥 P1/P2 (8)]  [📡 Last 24h (10)]  [Customer-facing (6)]
```

Active chip has primary color background.

### Incident table (DataTable)

Dense, ServiceNow-style. Columns:

| ☐ | Priority | Public ID | Title | Status | Assignee | Service | Created | SLA | Tags | Actions |
|---|---|---|---|---|---|---|---|---|---|---|

- **Priority**: SeverityBadge (P1=red, P2=orange, P3=amber, P4=green)
- **Public ID**: mono font, links to `/incidents/{publicId}`. Major incidents show 🚨 prefix.
- **Title**: truncate with tooltip. If `triggeringEventPublicId` exists, show small `[event]` chip after title.
- **Status**: status pill with status-specific color
- **Assignee**: avatar + name (or "Unassigned" with placeholder avatar)
- **Service**: first affected service name (truncate)
- **Created**: relative time ("38m ago", "2d ago")
- **SLA**: dual indicator (Response | Resolve) with traffic-light dots — see below
- **Tags**: first 2 tags as small pills + "+N" if more
- **Actions**: `⋮` menu — Open, Assign to me, Change priority, Add comment, Link CI, Resolve, Reopen, Close

**SLA cell rendering:**

```
Resp ●  Resolve ◯
```

Dot colors: green (healthy) / amber (warning, <25% time left) / red (breached) / gray (paused/met).
Hover tooltip shows: "Response: met (2m of 5m) · Resolve: 22m of 60m remaining (warning)".

Default sort: by Priority asc, then Created desc.
Bulk actions (when rows selected): Assign, Change priority, Tag, Close, Export.

### Empty states

If filters yield no results: "No incidents match. [Reset filters] or [+ Create incident]"
If queue is genuinely empty: icon CheckCircle2 large green, "All clear. No active incidents."

### Create incident modal

`[+ New incident]` opens modal:

```
Create Incident                                                       [×]

  Title *
  [                                                                  ]
  Brief, descriptive summary

  Description
  [                                                                  ]
  [                                                                  ]
  Markdown supported

  Priority *
  ○ P1 — Critical    ◉ P2 — High    ○ P3 — Medium    ○ P4 — Low

  Affected CIs (optional)
  [+ Add CIs]
  Selected: [CI-APP-ORD-001 ×]

  Assignee
  [Select user ▾]   [Auto-assign by service]

  Reporter channel
  [Phone ▾]

  Tags
  [+ Add tag]

                                                       [Cancel] [Create]
```

After create: navigate to `/incidents/{newPublicId}`.

---

## 📄 PAGE 3.2 — Incident Detail

**File:** `src/routes/incidents/IncidentDetail.tsx`
**Route:** `/incidents/:incidentId`

### Layout: 3-column

Left sidebar (sticky context) + Center main + Right sidebar (sticky actions).

### Top bar

```
[← Queue]                                                       [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[P2 stripe]                                            [In Progress ▾]
INC-2026-00183  Order Service: latency spike on /checkout

  [P2]  [Order Service]  [customer-facing]  [production]  +3 tags

  Created 60m ago by Marcus Hill (monitoring)
  Assigned to Yuki Tanaka · Last activity 4m ago
```

- Back link → `/incidents`
- `⋮` menu: Reopen, Promote to major, Clone, Print, Subscribe to updates
- Severity stripe at left edge of header
- Status dropdown (top-right) — clicking opens menu to change status; some transitions ask for confirmation/note (e.g., resolve requires resolution summary)
- Tags as pills below title
- Meta line: created relative + reporter, assignee, last activity

### Center main column (60%)

Tabs:
```
[Overview]  [Timeline (24)]  [Comments (5)]  [Affected CIs (1)]  [Linked Items (2)]  [Resolution]
```

#### Tab: Overview (default)

```
┌─ Description ────────────────────────────────────────────────────────┐
│ Order API checkout endpoint p95 latency exceeded 800ms threshold      │
│ at 07:42 UTC. Rule RULE-ORD-001 fired.                                │
│                                                                        │
│ Initial investigation:                                                 │
│ - DB queries seem normal                                               │
│ - Auth service calls show elevated latency                            │
│ - Suspect dependency chain issue                                       │
│                                                              [Edit]    │
└────────────────────────────────────────────────────────────────────────┘

┌─ Customer impact ────────────────────────────────────────────────────┐
│ Checkout taking 3-5s instead of <1s. ~5% of users seeing timeouts.   │
└────────────────────────────────────────────────────────────────────────┘

┌─ Triggering event ───────────────────────────────────────────────────┐
│ EVT-2026-00183-A  Order API checkout latency p95 > 800ms             │
│ Source: prometheus · Rule: RULE-ORD-001 · Fired 60m ago              │
│                                          [Open event →]                │
└────────────────────────────────────────────────────────────────────────┘

┌─ Quick actions ──────────────────────────────────────────────────────┐
│ [📋 Link to existing problem]  [🆕 Create problem from incident]     │
│ [🔗 Link change]  [📚 Suggest KB article]                             │
└────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Timeline (24)

Vertical chronological timeline (oldest at top, newest at bottom). Each entry:

```
●  08:14 UTC · 60m ago
   Created from event EVT-2026-00183-A
   System (Correlation Engine)
   ─────
●  08:14 UTC · 60m ago
   CI linked: CI-APP-ORD-001 order-api
   System
   ─────
●  08:15 UTC · 59m ago
   Assigned to Yuki Tanaka
   System (auto-assign by service)
   ─────
●  08:18 UTC · 56m ago
   Status: New → Triaging
   Yuki Tanaka
   "Looking into it"
   ─────
●  08:32 UTC · 42m ago
   Comment added by Yuki Tanaka
   "DB queries normal. Going to check auth service latency..."
   ─────
... (more entries)
```

Filter chips above timeline: `[All]` `[Status]` `[Comments]` `[System]` `[CI/Linkage]` `[Comms]`.

Each entry has:
- Colored dot (color depends on kind: status_change=blue, comment=neutral, system=gray, comms=amber, major=red)
- Timestamp (absolute) + relative
- Actor + action description
- Optional details below (status transitions show "From → To", comments show body)

#### Tab: Comments (5)

Slack-style threaded comment list with rich text editing area at bottom.

```
┌────────────────────────────────────────────────────────────┐
│ [Yuki Tanaka avatar] Yuki Tanaka · 42m ago        [⋮]      │
│ DB queries normal. Going to check auth service latency... │
│                                                              │
│ [👍 2]  [Reply]  [Quote]                                    │
│                                                              │
│   [↳ David Okafor avatar] David Okafor · 38m ago    [⋮]    │
│       Yeah, auth has been flaky from EU region today.       │
│       Check INC-2026-00181 for context.                     │
│                                                              │
│       [👍 1]  [Reply]                                       │
└────────────────────────────────────────────────────────────┘

[New comment box at bottom]
  ┌──────────────────────────────────────────────────────────┐
  │ [B] [I] [code] [link] [@] [📎]                           │
  │ Type a comment... (Markdown supported)                    │
  │                                                            │
  └──────────────────────────────────────────────────────────┘
  [✓] Internal note (not visible to reporter)
                                              [Cancel] [Comment]
```

Comments show:
- Author avatar + name + relative time
- `⋮` for edit/delete (only own comments)
- Body with markdown rendered
- Reaction emoji + count (👍 mostly)
- Reply / Quote actions
- Threaded replies (1 level of indentation)
- Internal note marker (small badge "Internal" if `isInternal`)

@mentions render as colored pills with user info on hover.

#### Tab: Affected CIs (1)

Same component pattern as CMDB detail relationships tab. Lists CIs with health status, click → CMDB detail.

`[+ Link CI]` button at top right opens CI picker modal.

#### Tab: Linked Items (2)

Show 4 sections (collapse if empty):

- **Triggering event** (1) — already shown but re-list
- **Linked problem** (1) — PRB-2026-00018 with status, owner, related count, [Open]
- **Linked changes** (0) — empty state with `[+ Link change]`
- **Linked KB articles** (0) — empty state with `[+ Suggest article]`

#### Tab: Resolution (only when status >= resolved)

```
┌─ Resolution Summary ──────────────────────────────────────────────────┐
│ Restarted payment-worker pods to release stuck connections.            │
│ DB pool returned to normal levels.                                     │
└────────────────────────────────────────────────────────────────────────┘

┌─ Root cause (lightweight) ───────────────────────────────────────────┐
│ DB connection pool exhaustion under peak load.                         │
│ Linked to PRB-2026-00018 for full RCA.                                 │
└────────────────────────────────────────────────────────────────────────┘

┌─ Workaround applied ─────────────────────────────────────────────────┐
│ Restart payment-worker; this is a documented workaround in            │
│ KB-00187 (Runbook: Payment API restart procedure)                     │
└────────────────────────────────────────────────────────────────────────┘

Resolved by David Okafor · 12 min after creation · 2026-05-08T08:26:00Z
```

For unresolved incidents, this tab shows: "Not yet resolved. [Mark as resolved]" CTA.

### Left sidebar (sticky, 280px)

Compact context:

```
┌─ At a glance ──────────────┐
│ Status     ● In Progress   │
│ Priority   [P2]            │
│ Severity   P2              │
│ Created    60m ago         │
│ Reporter   Marcus Hill     │
│            (monitoring)    │
│ Assignee   Yuki Tanaka     │
│ Team       SRE             │
└────────────────────────────┘

┌─ SLA timers ───────────────┐
│ Response                   │
│   ✓ Met in 2m (target 15m) │
│                            │
│ Resolution                 │
│   ⏱ 3h 24m remaining       │
│   ████████░░░░ 60% elapsed │
│   Target: 4h               │
└────────────────────────────┘

┌─ Affected services ────────┐
│ ⬤ Order Service (degraded) │
└────────────────────────────┘

┌─ Watchers (3) ─────────────┐
│ [SC] Sarah Chen            │
│ [DO] David Okafor          │
│ [HV] Helena Vasquez        │
│ [+ Add watcher]            │
└────────────────────────────┘
```

### Right sidebar (sticky, 280px)

Action panel:

```
┌─ Quick actions ────────────┐
│ [Assign to me]              │
│ [Acknowledge]               │
│ [Resolve]                   │
│ [Promote to Major]          │
│ [Add comment]               │
│ [Link CI]                   │
│ [Link problem]              │
└────────────────────────────┘

┌─ AI suggestions ───────────┐
│ (Empty for V1; placeholder │
│ section reserved.)          │
└────────────────────────────┘

┌─ Related incidents (3) ────┐
│ Same CI in last 7 days:    │
│ INC-...179  P3  resolved   │
│ INC-...165  P3  closed     │
│ INC-...142  P2  closed     │
│ [View all →]                │
└────────────────────────────┘
```

"AI suggestions" panel is empty placeholder per Doc 0 decision (AI features deferred).

"Related incidents" filters mockIncidents by overlapping `affectedCIIds`.

### Resolve flow

`[Resolve]` button (or status dropdown → Resolved) opens modal:

```
Resolve INC-2026-00183                                            [×]

  Resolution summary *
  [                                                              ]
  [                                                              ]

  Root cause (optional, lightweight)
  [                                                              ]
  Tip: For deeper RCA, [link a problem record].

  Workaround applied (optional)
  [                                                              ]

  [✓] Mark for KB suggestion (will create draft for reviewer)
  [ ] Schedule a Post-Implementation Review (PIR)

                                          [Cancel] [Resolve incident]
```

After resolve: status changes, timeline gets entry, reporter gets notification (mocked), redirect stays on detail page. Tab "Resolution" becomes available.

---

## 📄 PAGE 3.3 — Major Incident War Room

**File:** `src/routes/incidents/MajorIncidentWarRoom.tsx`
**Route:** `/incidents/major/:incidentId`

### Purpose
Dramatic, full-attention layout for active P1 incidents. Focus on real-time coordination: timeline, communications, status. Designed to be projected on a screen during major incident response.

### Layout

Full-width, no sidebar (override default AppShell sidebar — show it collapsed). Use top `←` button to navigate back.

### Hero header

```
🚨 MAJOR INCIDENT — IN PROGRESS                              [Stand down] [⋮]

INC-2026-00184  Payment Service: 5xx error rate elevated

  STATUS              SLA               IMPACT             AFFECTED
  ● In Progress       ⏱ 22m remain     ~12% checkouts    Payment Service
                      to resolution     failing            Order Service
                                        since 08:14 UTC    (downstream)

  IC          OPS LEAD          COMMS LEAD       SCRIBE
  Sarah C.    David O.          Helena V.        (none)

  Started 38m ago · Major declared 34m ago · Last comms 4m ago
```

Hero background: severe red gradient `linear-gradient(135deg, #B42318 0%, #DC2626 100%)`. Text white. Massive type for incident ID and title. Live SLA countdown with seconds (visual only — refreshes every second using state).

`[Stand down]` is the primary action (resolve major status; doesn't close incident). `⋮` menu: Edit roles, Add scribe, Open standard detail view, Print communications, Export timeline.

### 3-column main area

**Left (35%) — Activity stream:**

Same as Timeline tab in detail page, but **largest and most prominent**. Auto-scrolls to bottom on new entries. New entries pulse briefly when added.

```
ACTIVITY  ──── [All ▾]                      [● LIVE]
─────────────────────────────────────────────
●  Just now · David Okafor
   Comment: "Restart of payment-worker pods done.
   Watching metrics..."

●  2m ago · Sarah Chen
   Comms posted to all-staff:
   "Identified DB pool saturation. Mitigation
    in progress. ETA 10-15min."

●  5m ago · System
   Linked event EVT-2026-00184-B (DB pool > 80%)

... (timeline continues, scroll up for older)
```

**Center (40%) — Communications log + composer:**

The "comms" feature is critical for major incidents. Two stacked cards:

```
┌─ Communications log ──────────────[Status page →]─┐
│                                                    │
│ 4m ago · Sarah Chen → All staff                   │
│ ┌────────────────────────────────────────────┐    │
│ │ Identified DB pool saturation. Mitigation  │    │
│ │ in progress. ETA 10-15min.                 │    │
│ └────────────────────────────────────────────┘    │
│ Channels: Slack #incidents, Email all-staff       │
│ ✓ Delivered to 142 recipients                     │
│                                                    │
│ ─────                                              │
│ 19m ago · Sarah Chen → All staff                  │
│ ┌────────────────────────────────────────────┐    │
│ │ P1 incident on Payment Service.            │    │
│ │ Investigating. Will update in 15min.       │    │
│ └────────────────────────────────────────────┘    │
│ Channels: Slack #incidents, Status Page           │
│ ✓ Delivered to 142 recipients                     │
│                                                    │
└────────────────────────────────────────────────────┘

┌─ Compose update ─────────────────────────────────┐
│ Audience                                           │
│ ◉ All staff   ○ IT only   ○ Customers (status pg)│
│                                                    │
│ Template  [Identifying ▾]                          │
│   Identifying / Investigating / Identified /      │
│   Mitigating / Resolved                            │
│                                                    │
│ Message *                                          │
│ ┌────────────────────────────────────────────┐    │
│ │ [text area, pre-filled from template]      │    │
│ │                                              │    │
│ │ Template: "Identified DB pool saturation.   │    │
│ │ Mitigation in progress. ETA {ETA_MIN}min."  │    │
│ └────────────────────────────────────────────┘    │
│ Required next update: 30 min from now             │
│                                                    │
│ Channels                                           │
│ [✓] Slack #incidents   [✓] Email all-staff        │
│ [ ] Customer status page                           │
│                                                    │
│                                  [Cancel] [Post]  │
└────────────────────────────────────────────────────┘
```

Templates pre-fill the message. Variables like `{ETA_MIN}` are placeholders user fills in.

**Reminder banner above composer** if no comms in last 30 min:
```
⏰ No comms posted in 28 minutes. Stakeholders expect updates every 30 min.
```

**Right (25%) — Status & roles:**

```
┌─ Affected services ────────┐
│ ● Payment Service           │
│   ⬤ Major outage (status)  │
│   [View status page →]     │
│                             │
│ ● Order Service (linked)    │
│   ⬤ Degraded               │
└─────────────────────────────┘

┌─ Roles ─────────────────────┐
│ Incident Commander          │
│   Sarah Chen        [SC]    │
│   [Reassign]                │
│                             │
│ Operations Lead             │
│   David Okafor      [DO]    │
│   [Reassign]                │
│                             │
│ Communications Lead         │
│   Helena Vasquez    [HV]    │
│   [Reassign]                │
│                             │
│ Scribe                      │
│   (Unassigned)              │
│   [Assign]                  │
└─────────────────────────────┘

┌─ War room links ────────────┐
│ 🎥 Bridge: zoom.us/...      │
│ 💬 Slack: #inc-184-payment │
│ 📊 Dashboard: grafana/...   │
│ [+ Add link]                │
└─────────────────────────────┘

┌─ Quick actions ─────────────┐
│ [Add commenter]             │
│ [Link change]               │
│ [Link problem]              │
│ [Stand down to P2]          │
│ [Resolve incident]          │
└─────────────────────────────┘
```

### Bottom action bar (sticky)

```
─────────────────────────────────────────────────────────────────────────
Status: ● In Progress       SLA: ⏱ 22m remain       [Resolve incident]
```

Always visible. The resolve flow same as standard detail page resolve modal.

### Stand down behavior

`[Stand down]` button → modal:
```
Stand down major incident                                         [×]

INC-2026-00184 will be downgraded from Major to standard P1.
The incident remains open until resolved.

  Reason for stand down *
  [                                                              ]

                              [Cancel] [Stand down]
```

After stand down: navigate to standard `/incidents/{id}` detail page.

### Mobile: not optimized

Major Incident War Room is **desktop-only** for v1. On mobile: show "This view is optimized for desktop. [Open standard view]" message.

---

## 📄 PAGE 3.4 — Incident Analytics

**File:** `src/routes/incidents/IncidentAnalytics.tsx`
**Route:** `/incidents/analytics`

### Page header

```
Incident Analytics
                                            [Last 30d ▾]  [⤓ Export]
```

### Top KPI row (4 cards)

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Total incidents  │ MTTR             │ SLA Compliance   │ Major incidents  │
│       25         │      2h 14m      │     94.4%        │        1         │
│ ▼ -3 vs prev 30d │ ▼ -23m vs prev   │ ▲ +1.2% vs prev  │ ↔ same as prev   │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Use existing KPICard component.

### Chart: Volume over time

```
┌─ Incident volume — last 30 days ──────────────────────────────────────┐
│                                                                         │
│  P1  ▒                                                                  │
│  P2  ▒▒    ▒▒                                                           │
│  P3  ▒▒▒▒  ▒▒▒  ▒  ▒▒  ▒▒▒  ▒  ▒▒  ▒▒▒  ▒▒  ▒▒▒                       │
│  P4  ▒  ▒▒  ▒  ▒▒  ▒  ▒  ▒                                              │
│      Apr 8  Apr 15  Apr 22  Apr 29  May 6 today                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Stacked SVG bar chart by priority. Hover bar → tooltip with daily counts.

### 2-column lower section

**Left: MTTR by service**

```
┌─ MTTR by service ────────────────────────────────────────────────────┐
│ Payment Service       ████████████████░░░  3h 12m                    │
│ Search Service        ████████░░░░░░░░░░░  1h 48m                    │
│ Order Service         ███████░░░░░░░░░░░░  1h 30m                    │
│ Auth Service          ████░░░░░░░░░░░░░░░  52m                       │
│ Notification Gateway  ███░░░░░░░░░░░░░░░░  38m                       │
│ ...                                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

Horizontal bar chart, sorted desc.

**Right: Top categories (tags)**

```
┌─ Top categories ─────────────────────────────────────────────────────┐
│ #payment           8 incidents    32%                                 │
│ #order             6 incidents    24%                                 │
│ #data              4 incidents    16%                                 │
│ #auth              3 incidents    12%                                 │
│ #infrastructure    2 incidents     8%                                 │
│ #network           2 incidents     8%                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Lower section — recurring offenders

```
┌─ Top recurring CIs ──────────────────────────────────────────────────┐
│ CI                              Incidents    Last incident            │
│ CI-DB-PAY-001  pay-postgres-pri      5       38m ago    [View →]      │
│ CI-APP-PAY-001 payment-api           5       38m ago    [View →]      │
│ CI-APP-ORD-001 order-api             4       60m ago    [View →]      │
│ ...                                                                    │
│                                                                        │
│ → 3 of these are linked to active problems.                           │
│ [View problems →]                                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Lower section — SLA breakdown

```
┌─ SLA performance ───────────────────────────────────────────────────────┐
│  By priority:                                                            │
│  P1  ███████████████████░░░  92.5%  (1 met of 1)                         │
│  P2  ██████████████████░░░░  87.5%  (5 met of 6 — 1 breach: INC-...)    │
│  P3  █████████████████████   100%   (12/12)                              │
│  P4  █████████████████████   100%   (6/6)                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Empty/light states

This page assumes data exists. If filters yielded no incidents in time range, show "No incidents in selected range. [Reset]"

---

## 📄 PAGE 3.5 — Problem List

**File:** `src/routes/problems/ProblemList.tsx`
**Route:** `/problems`

### Page header

```
Problems
8 total · 3 active investigations · 4 known errors
                                          [→ KEDB]   [+ New problem]
```

### Filter bar

```
[🔍 Search...]  [Status ▾]  [Source ▾]  [Owner ▾]  [Service ▾]   [Reset]
```

### Stats strip

```
[All 8] [Identified 1] [Investigating 2] [Known Error 4] [Fix in progress 1] [Closed 0]
[By source: incident_pattern 4 · proactive 2 · audit 1 · user 1]
```

### Problem table (DataTable)

Columns: `Public ID | Title | Status | Severity | Source | Owner | Related Incidents | Last incident | Linked Items | Actions`

- **Public ID**: mono, links to `/problems/{publicId}`
- **Title**: semibold, truncate
- **Status**: status pill (use problemStatusMeta)
- **Severity**: SeverityBadge
- **Source**: source chip with icon (incident_pattern, proactive, audit, user_reported)
- **Owner**: avatar + name
- **Related Incidents**: count badge with "+N" if many. Hover shows last 5 incident IDs.
- **Last incident**: relative time of `lastIncidentDate`
- **Linked Items**: small icon row showing presence of: 📚 KB, 🔧 Change, 🚀 RCA. Hover for counts.
- **Actions**: `⋮` — Open, Reassign, Promote to known error, Link incidents, Close

Default sort: by `lastIncidentDate` desc.

### Row hover

Tooltip showing first 200 chars of description.

---

## 📄 PAGE 3.6 — Problem Detail

**File:** `src/routes/problems/ProblemDetail.tsx`
**Route:** `/problems/:problemId`

### Layout: similar to incident detail but problem-flavored

### Top bar

```
[← Problems]                                                  [⋮ Actions]
─────────────────────────────────────────────────────────────────────────
[severity stripe]                                  [Known Error ▾]
PRB-2026-00018  Recurring memory pressure on payment-api

  [P2]  [recurring]  [payment]  [pool-exhaustion]

  Investigating since 6 weeks ago by Yuki Tanaka · 4 related incidents
```

### Center column — tabs

```
[Overview]  [Related Incidents (4)]  [RCA →]  [Known Error]  [Fix Plan]  [History]
```

#### Tab: Overview

```
┌─ Description ─────────────────────────────────────────────────────────┐
│ payment-api has been experiencing recurring 5xx errors and 503        │
│ responses during peak load periods. Pattern detected by correlation   │
│ engine after 4 incidents in 6 weeks with similar fingerprints.        │
│                                                              [Edit]    │
└─────────────────────────────────────────────────────────────────────────┘

┌─ Affected services ───────────────────────────────────────────────────┐
│ ● Payment Service                                                      │
│ Affected CIs: CI-APP-PAY-001, CI-DB-PAY-001                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─ Pattern summary ─────────────────────────────────────────────────────┐
│ First incident: Mar 25, 2026                                           │
│ Latest incident: 38 min ago (INC-2026-00184)                           │
│ Average MTTR for this pattern: 24 min                                  │
│ Total customer-impact time: ~98 min over 6 weeks                       │
│                                                                         │
│ → 60% of recurrences happen during business hours UTC+0 to UTC+5      │
│ → Strong correlation with deploy events (3 of 4 within 24h of deploy) │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Related Incidents (4)

Lists all incidents in `relatedIncidentIds`. Same component as incident table but read-only and filtered.

```
INC-2026-00184  Payment Service: 5xx error rate elevated  P1  In Progress · 38m ago
INC-2026-00156  Payment Service total outage              P1  Closed     · 5d ago
INC-2026-00132  Payment API timeouts during AM peak       P2  Closed     · 2w ago
INC-2026-00098  Payment API 5xx errors during launch      P2  Closed     · 6w ago
```

`[+ Link more incidents]` button → modal for searching/picking incidents.

#### Tab: RCA

If RCA exists, show:

```
┌─ RCA Summary ─────────────────────────────────────────────────────────┐
│ Connection pool sized for steady-state traffic, not peak. Connection  │
│ leaks compound the issue during spikes.                                │
│                                                                         │
│ Technique: Five Whys                                                   │
│ By Yuki Tanaka · Last updated Apr 30 · [Open full RCA →]               │
└─────────────────────────────────────────────────────────────────────────┘

┌─ Root causes ────────────────────────────────────────────────────────┐
│ 1. DB connection pool sized at 20 (default) is insufficient for       │
│    current peak traffic of ~800 QPS.                                  │
│ 2. Application has connection leaks in async error paths.             │
└────────────────────────────────────────────────────────────────────────┘

┌─ Recommended actions (5) ────────────────────────────────────────────┐
│ ✓ done    Reduce monitoring cooldown for pool saturation rule        │
│   in_pgrs Migrate to pgbouncer transaction-mode pooling              │
│            Linked: CHG-2026-00091                                      │
│   in_pgrs Fix connection leak in async error handlers                │
│   open    Add load testing stage to CI for tier-1 services            │
│   open    Establish quarterly capacity review process                │
│            Linked: IMP-2026-00012                                       │
└────────────────────────────────────────────────────────────────────────┘

[Open full RCA in dedicated workspace →]
```

`[Open full RCA →]` navigates to `/problems/{id}/rca`.

#### Tab: Known Error

If `status === 'known_error'`, show prominent panel:

```
┌─ KNOWN ERROR — Published Apr 15, 2026 by Yuki Tanaka ────────────────┐
│                                                                         │
│  ROOT CAUSE                                                             │
│  DB connection pool size (20) too small for peak traffic; triggers      │
│  cascading 5xx when pool exhausted.                                    │
│                                                                         │
│  ────────────────────────────────────────────────                       │
│                                                                         │
│  WORKAROUND (effectiveness: PARTIAL)                                    │
│  Restart payment-worker pods to release leaked connections.             │
│  Increase pool size to 50 in next deploy.                               │
│                                                                         │
│  Linked runbook: KB-00187 Runbook: Payment API restart procedure       │
│                                                                         │
│  ────────────────────────────────────────────────                       │
│                                                                         │
│  AFFECTED VERSIONS: payment-api 2.3.x and 2.4.0                         │
│                                                                         │
│  PERMANENT FIX PLAN: Migrate to pgbouncer pooler + retry logic          │
│  Tracked in: CHG-2026-00091                                             │
│                                                                         │
│  [Edit known error]  [Suggest as KB article]                           │
└─────────────────────────────────────────────────────────────────────────┘
```

For non-known-error problems: show empty state with `[Promote to known error]` button which opens a form modal asking for rootCause, workaround, etc.

#### Tab: Fix Plan

Lists `linkedChangeIds` and `linkedKBArticleIds`. Shows plan for permanent resolution.

#### Tab: History

Append-only log of problem state changes (similar to incident timeline but lighter).

### Left sidebar (similar to incident detail)

```
┌─ At a glance ────────┐
│ Status   Known Error │
│ Severity P2          │
│ Source   pattern     │
│ Owner    Yuki T.     │
│ Created  Apr 15      │
│ Updated  3 days ago  │
└──────────────────────┘

┌─ Related (4) ────────┐
│ Incidents linked: 4  │
│ Active: 1            │
│ Resolved: 3          │
│ See tab →            │
└──────────────────────┘

┌─ Permanent fix ──────┐
│ CHG-2026-00091       │
│ Status: planned      │
│ Target: May 15       │
│ [View change →]      │
└──────────────────────┘
```

### Right sidebar (sticky actions)

```
[Promote to known error]   (or [Edit known error] if already published)
[Link incidents]
[Open RCA workspace]
[Link change]
[Suggest KB article]
[Close problem]
```

---

## 📄 PAGE 3.7 — RCA Workspace

**File:** `src/routes/problems/RCAWorkspace.tsx`
**Route:** `/problems/:problemId/rca`

### Purpose
Focused workspace for conducting root cause analysis. Multiple techniques supported.

### Page header

```
[← Back to PRB-2026-00018]                                  [Save] [⋮]
─────────────────────────────────────────────────────────────────────────
RCA: Recurring memory pressure on payment-api

  Technique:  [Five Whys ▾]    Author: Yuki Tanaka    Last saved: 4d ago
```

Technique dropdown options: Five Whys / Fishbone / Fault tree / Timeline / Narrative.
Switching technique loads different editor (next sections).

### Five Whys editor (default for this problem)

```
PROBLEM STATEMENT
Why does payment-api return 5xx during peak?

────────────────────────────────────────────────────────────
LEVEL 1
Why?  [Application threads block waiting for a DB connection from the pool.       ]

LEVEL 2
Why?  [All 20 pool connections are checked out and not being returned in time.    ]

LEVEL 3
Why?  [Some connections leak when async error handlers throw, pool size is too    ]
      [small for peak QPS.                                                          ]

LEVEL 4
Why?  [Default value from initial deployment 18 months ago, never tuned.          ]

LEVEL 5
Why?  [No load testing in CI/CD; no capacity review process for tier-1 services.  ]

[+ Add another why]
────────────────────────────────────────────────────────────
```

Each level is a textarea. User can add/remove levels. Auto-saves on blur.

### Fishbone editor (when technique = fishbone)

```
PROBLEM (HEAD)
[Es cluster goes yellow during data ingestion peaks                              ]

CATEGORIES
┌──────────────────────────┐  ┌──────────────────────────┐
│ Technology               │  │ Process                  │
│ • Insufficient replicas  │  │ • No staging tier         │
│ • Old ES version (7.10)  │  │ • Bulk reindex during BH │
│ • Single-node hot tier   │  │ [+ Add cause]             │
│ [+ Add cause]            │  │                           │
└──────────────────────────┘  └──────────────────────────┘
┌──────────────────────────┐  ┌──────────────────────────┐
│ People                   │  │ Environment              │
│ • Limited ES expertise   │  │ • Spot instance churn    │
│ • Outdated runbook       │  │ • AZ network throttling  │
│ [+ Add cause]            │  │ [+ Add cause]            │
└──────────────────────────┘  └──────────────────────────┘

[+ Add category]
```

Visual layout of categories around problem. Each category is a card with a list of causes that can be added/removed/edited.

### Common sections (for any technique)

Below the technique-specific editor:

```
TIMELINE OF CONTRIBUTING EVENTS
┌────────────────────────────────────────────────────────────┐
│ When           Event                            Contributing│
│ Mar 25 14:22   First occurrence: INC-2026-00098      no    │
│ Apr 02 11:00   Pool exhaustion during marketing      yes   │
│                campaign                                     │
│ Apr 15 16:00   Workaround published                  no    │
│ Apr 30 09:30   CHG-2026-00091 raised for fix         no    │
│ May 08 08:14   Latest occurrence: INC-2026-00184    no    │
│                                                              │
│ [+ Add timeline entry]                                       │
└──────────────────────────────────────────────────────────────┘

ROOT CAUSES (definitive)
1. [DB connection pool sized at 20 is insufficient for current peak traffic]
2. [Application has connection leaks in async error paths               ]
[+ Add root cause]

CONTRIBUTING FACTORS
1. [No automated load testing in CI/CD pipeline                           ]
2. [No quarterly capacity review for tier-1 services                       ]
3. [Monitoring alerts on pool > 80% but cooldown 10m is too long          ]
[+ Add contributing factor]

RECOMMENDED ACTIONS
┌─────────────────────────────────────────────────────────────────────────┐
│ Type        Description                              Owner   Status      │
│ corrective  Migrate to pgbouncer (CHG-2026-00091)   David   in_progress │
│ corrective  Fix connection leak (PR #4421)          David   in_progress │
│ preventive  Add load testing to CI                   Sarah   open        │
│ preventive  Quarterly capacity review (IMP-...12)    Tom     open        │
│ detective   Reduce alert cooldown to 2m              Sarah   ✓ done      │
│                                                                           │
│ [+ Add recommended action]                                                │
└───────────────────────────────────────────────────────────────────────────┘
```

Each action has fields: type (radio: preventive/detective/corrective), description (text), owner (user picker), target date (date picker), status (dropdown), linkedChangeId (optional), linkedImprovementId (optional).

### Page footer

```
[Cancel]                                          [Save draft] [Publish RCA]
```

Publish RCA → marks RCA as final, locks editing (with `[Edit again]` button to override).

---

## 📄 PAGE 3.8 — Known Error Database (KEDB)

**File:** `src/routes/problems/KEDB.tsx`
**Route:** `/kedb`

### Purpose
Searchable directory of known errors with workarounds. L1/L2 agents come here when an incident matches a known pattern.

### Page header

```
Known Error Database
4 known errors · Search saves time during incident response
                                                            [+ Add known error]
```

### Search bar (prominent)

```
[🔍 Search by symptom, error message, CI name...]
```

Large, centered search input. Below: "Most searched: pool, connection, timeout, ssl, auth"

### Filters

```
[Service ▾]  [Component ▾]  [Effectiveness ▾]   [Reset]
```

### Known errors list

Each known error is a **prominent card**:

```
┌─ KE-PRB-2026-00018 ──────────────────────────────[Effectiveness: PARTIAL]─┐
│                                                                            │
│ Recurring memory pressure on payment-api                                  │
│ Affected: Payment Service · payment-api 2.3.x and 2.4.0                  │
│                                                                            │
│  ROOT CAUSE                                                                │
│  DB connection pool size (20) too small for peak traffic; triggers         │
│  cascading 5xx when pool exhausted.                                       │
│                                                                            │
│  WORKAROUND                                                                │
│  Restart payment-worker pods to release leaked connections.                │
│  Increase pool size to 50 in next deploy.                                  │
│                                                                            │
│  Runbook: KB-00187 →                                                       │
│  Permanent fix: CHG-2026-00091 (target May 15)                             │
│                                                                            │
│  Last updated 12 days ago by Yuki Tanaka                                  │
│  4 related incidents in last 6 weeks                                      │
│                                                                            │
│                            [View problem]  [Apply workaround to incident] │
└────────────────────────────────────────────────────────────────────────────┘
```

Effectiveness badge color: `full`=green, `partial`=amber, `none`=red.

`[Apply workaround to incident]` opens a modal asking for incident ID; effectively links this known error to that incident's resolution path.

Below cards: pagination if needed.

### Empty state

If no known errors yet:
```
[icon: BookOpen]
No known errors yet
Promote a problem to known error status to populate the KEDB.
[+ Add known error]
```

---

## 🎨 SHARED COMPONENTS

### `src/components/incidents/`

```
components/incidents/
├── IncidentRow.tsx                # DataTable row renderer for queue
├── IncidentStatusPill.tsx
├── IncidentPriorityBadge.tsx     # Wraps SeverityBadge with priority semantics
├── SLAIndicator.tsx              # Dual dot for response/resolve
├── SLATimer.tsx                  # Live countdown with progress bar (used in detail/war room)
├── MajorIncidentBanner.tsx       # Red banner for queue page
├── IncidentTimelineEntry.tsx
├── IncidentCommentThread.tsx     # Threaded comment renderer
├── IncidentCommentComposer.tsx   # Markdown-aware composer with @mentions
├── ResolveIncidentModal.tsx
├── CreateIncidentModal.tsx
├── WarRoom/
│   ├── WarRoomHero.tsx
│   ├── ActivityStream.tsx
│   ├── CommunicationLog.tsx
│   ├── CommunicationComposer.tsx
│   ├── RolesPanel.tsx
│   └── WarRoomLinks.tsx
└── analytics/
    ├── VolumeOverTimeChart.tsx
    ├── MTTRByServiceChart.tsx
    ├── TopCategoriesPanel.tsx
    └── SLAPerformancePanel.tsx
```

### `src/components/problems/`

```
components/problems/
├── ProblemRow.tsx
├── ProblemStatusPill.tsx
├── ProblemSourceChip.tsx
├── KnownErrorCard.tsx            # Used in KEDB list and problem detail tab
├── PatternSummaryCard.tsx        # Pattern stats panel for problem detail
├── RCASummaryCard.tsx            # Inline RCA summary (problem detail tab)
├── PromoteToKnownErrorModal.tsx
├── LinkIncidentsModal.tsx
└── RCAWorkspace/
    ├── FiveWhysEditor.tsx
    ├── FishboneEditor.tsx
    ├── FaultTreeEditor.tsx
    ├── TimelineEditor.tsx
    ├── NarrativeEditor.tsx
    ├── RootCausesList.tsx
    ├── ContributingFactorsList.tsx
    ├── RecommendedActionsTable.tsx
    └── TechniqueSwitcher.tsx
```

### Constants in `src/lib/constants.ts`

```typescript
export const incidentStatusMeta: Record<IncidentStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:         { label: 'New',         color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  triaging:    { label: 'Triaging',    color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_progress: { label: 'In Progress', color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  pending:     { label: 'Pending',     color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  resolved:    { label: 'Resolved',    color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed:      { label: 'Closed',      color: '#475467', bg: '#F1F3F7', dot: '#475467' },
};

export const slaStatusMeta: Record<SLAStatus, { label: string; dot: string; color: string }> = {
  healthy:  { label: 'Healthy',  dot: '#12B76A', color: '#067647' },
  warning:  { label: 'At risk',  dot: '#F79009', color: '#DC6803' },
  breached: { label: 'Breached', dot: '#F04438', color: '#B42318' },
  paused:   { label: 'Paused',   dot: '#98A2B3', color: '#475467' },
  met:      { label: 'Met',      dot: '#12B76A', color: '#067647' },
};

export const incidentEventKindMeta: Record<IncidentEventKind, { label: string; icon: string; color: string }> = {
  created:           { label: 'Created',           icon: 'Plus',         color: '#475467' },
  assigned:          { label: 'Assigned',          icon: 'UserPlus',     color: '#0BA5EC' },
  priority_changed:  { label: 'Priority changed',  icon: 'ArrowUpDown',  color: '#DC6803' },
  status_changed:    { label: 'Status changed',    icon: 'RefreshCw',    color: '#0BA5EC' },
  comment_added:     { label: 'Comment',           icon: 'MessageCircle', color: '#475467' },
  ci_linked:         { label: 'CI linked',         icon: 'Link',         color: '#1F4FD4' },
  ci_unlinked:       { label: 'CI unlinked',       icon: 'Unlink',       color: '#475467' },
  problem_linked:    { label: 'Problem linked',    icon: 'Link',         color: '#6941C6' },
  event_linked:      { label: 'Event linked',      icon: 'Radio',        color: '#0BA5EC' },
  sla_warning:       { label: 'SLA warning',       icon: 'AlertTriangle', color: '#DC6803' },
  sla_breached:      { label: 'SLA breached',      icon: 'AlertOctagon', color: '#B42318' },
  escalated:         { label: 'Escalated',         icon: 'ArrowUpRight', color: '#B42318' },
  major_declared:    { label: 'Major declared',    icon: 'Siren',        color: '#B42318' },
  comms_posted:      { label: 'Communication',     icon: 'Megaphone',    color: '#DC6803' },
  resolution_added:  { label: 'Resolution',        icon: 'CheckCheck',   color: '#067647' },
  resolved:          { label: 'Resolved',          icon: 'CheckCircle2', color: '#067647' },
  reopened:          { label: 'Reopened',          icon: 'RefreshCw',    color: '#DC6803' },
  closed:            { label: 'Closed',            icon: 'XCircle',      color: '#475467' },
};

export const problemStatusMeta: Record<ProblemStatus, { label: string; color: string; bg: string; dot: string }> = {
  identified:      { label: 'Identified',      color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  investigating:   { label: 'Investigating',   color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  known_error:     { label: 'Known Error',     color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  fix_in_progress: { label: 'Fix in Progress', color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  closed:          { label: 'Closed',          color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
};

export const problemSourceMeta: Record<ProblemSource, { label: string; icon: string; description: string }> = {
  incident_pattern: { label: 'Incident Pattern', icon: 'Activity',  description: 'Detected from multiple correlated incidents' },
  major_incident:   { label: 'Major Incident',   icon: 'Siren',     description: 'Spawned from P1 PIR' },
  proactive:        { label: 'Proactive',        icon: 'Lightbulb', description: 'Identified proactively by SRE' },
  audit:            { label: 'Audit',            icon: 'ShieldCheck', description: 'From compliance audit' },
  user_reported:    { label: 'User Reported',    icon: 'User',      description: 'Reported by end user' },
};

export const rcaTechniqueMeta: Record<RCATechnique, { label: string; description: string }> = {
  five_whys:  { label: 'Five Whys',  description: 'Iteratively ask "why" 5 times' },
  fishbone:   { label: 'Fishbone',   description: 'Categorized cause-and-effect (Ishikawa)' },
  fault_tree: { label: 'Fault Tree', description: 'Logical tree of contributing failures' },
  timeline:   { label: 'Timeline',   description: 'Chronological reconstruction' },
  narrative:  { label: 'Narrative',  description: 'Free-form prose' },
};
```

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace 8 placeholder routes:

```tsx
// Replace
{ path: 'incidents',                element: <Placeholder ... /> },
{ path: 'incidents/:id',            element: <Placeholder ... /> },
{ path: 'incidents/major/:id',      element: <Placeholder ... /> },
{ path: 'incidents/analytics',      element: <Placeholder ... /> },
{ path: 'problems',                 element: <Placeholder ... /> },
{ path: 'problems/:id',             element: <Placeholder ... /> },
{ path: 'problems/:id/rca',         element: <Placeholder ... /> },
{ path: 'kedb',                     element: <Placeholder ... /> },

// With (note order: literal paths BEFORE :id paths)
{ path: 'incidents',                element: <IncidentQueue /> },
{ path: 'incidents/analytics',      element: <IncidentAnalytics /> },
{ path: 'incidents/major/:incidentId', element: <MajorIncidentWarRoom /> },
{ path: 'incidents/:incidentId',    element: <IncidentDetail /> },
{ path: 'problems',                 element: <ProblemList /> },
{ path: 'problems/:problemId/rca',  element: <RCAWorkspace /> },
{ path: 'problems/:problemId',      element: <ProblemDetail /> },
{ path: 'kedb',                     element: <KEDB /> },
```

**Critical:** `incidents/analytics` and `incidents/major/:incidentId` MUST come BEFORE `incidents/:incidentId`. Same for `problems/:problemId/rca` BEFORE `problems/:problemId`.

---

## 🔗 CROSS-LINKING

Real links activated by Doc 3a:
- Incident → triggering event → `/events/{id}` (Doc 2)
- Incident → affected CIs → `/cmdb/{ciPublicId}` (Doc 1)
- Incident → linked problem → `/problems/{problemPublicId}` (Doc 3a real)
- Incident → linked change → `/changes/{id}` (Doc 4 placeholder)
- Incident → linked KB → `/kb/{slug}` (Doc 3b placeholder)
- War room → status page link → `/status` (Doc 6 placeholder)
- Problem → related incidents → `/incidents/{id}` (Doc 3a real)
- Problem → linked change → `/changes/{id}` (Doc 4 placeholder)
- Problem → linked KB → `/kb/{slug}` (Doc 3b placeholder)
- Problem → linked improvement → `/improvement/{id}` (Doc 5 placeholder)
- KEDB → "Apply workaround to incident" → opens modal, then redirect to `/incidents/{id}`

**Update Doc 0 dashboard:** Active Incidents Feed should now use real `mockIncidents` data with full incident objects (just filter and slice). The major incident banner check should use `getMajorIncidents()`.

**Update Doc 1 CMDB detail:** "Linked Items" tab — open incidents section should now use `getIncidentsByCI(ciId)` instead of placeholder static list. Render real incidents with their priority/status/title.

**Update Doc 2 Event detail:** "Linked incident" section should resolve from `linkedIncidentId` to real incident details and link to `/incidents/{id}` (not placeholder).

---

## ✅ QUALITY CHECKLIST

- [ ] All 8 routes work without 404
- [ ] `/incidents` shows queue table with 25 incidents, dense ServiceNow style
- [ ] Major incident banner appears on top (animated red, links to war room)
- [ ] Filters and quick filter chips work
- [ ] SLA dual-dot indicator with hover tooltip works
- [ ] Sort by priority/created/SLA all work
- [ ] Bulk select + actions bar appears when rows selected
- [ ] `[+ New incident]` modal works, creates new entry on top of list
- [ ] `/incidents/INC-2026-00184` shows 3-column detail page with all 6 tabs functional
- [ ] Timeline tab shows ~10 events for INC-184 with kind-specific icons/colors
- [ ] Comments tab supports threaded replies, markdown, @mentions, internal note flag
- [ ] Resolve flow modal works, captures resolution data, transitions status
- [ ] Sidebar SLA timer shows live countdown (refresh every 30s in MVP)
- [ ] Related incidents panel shows other incidents on same CI
- [ ] `/incidents/major/INC-2026-00184` shows war room with red gradient hero
- [ ] War room communication composer works with templates and audience picker
- [ ] War room shows reminder banner if no comms in 30 min
- [ ] War room is desktop-only (mobile shows redirect message)
- [ ] `/incidents/analytics` shows 4 KPIs + volume chart + MTTR chart + categories
- [ ] `/problems` shows 8 problems in DataTable
- [ ] `/problems/PRB-2026-00018` shows full detail with all 6 tabs
- [ ] Known Error tab shows prominent published panel with effectiveness badge
- [ ] RCA tab shows summary + root causes + recommended actions inline
- [ ] `/problems/PRB-2026-00018/rca` shows Five Whys editor with all 5 levels editable
- [ ] Switching technique dropdown swaps editor (fishbone, etc.)
- [ ] Recommended actions table editable with type/owner/status
- [ ] `/kedb` shows 4 known error cards with workaround prominent
- [ ] Effectiveness badges color-coded
- [ ] "Apply workaround to incident" modal works
- [ ] Update of Doc 0 Dashboard: Active Incidents Feed uses real mockIncidents
- [ ] Update of Doc 1 CMDB Linked Items tab: shows real incidents
- [ ] Update of Doc 2 Event Detail: linked incident section navigates to real route
- [ ] All public IDs use mono font
- [ ] Cross-links to Docs 0/1/2 work; cross-links to Doc 4/5/6/3b are placeholders
- [ ] Sidebar nav highlights "Incidents" or "Problems" parent on relevant routes
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types in `src/types/incident.ts` and `src/types/problem.ts`, re-exported
2. Mock data: `incidents.ts` (replaces Doc 0 placeholder), `incidentTimelines.ts`, `incidentComments.ts`, `problems.ts`
3. Module components in `src/components/incidents/` and `src/components/problems/`
4. 8 route files in `src/routes/incidents/` and `src/routes/problems/`
5. Routing config updated (literal paths before parametric)
6. Sidebar items "Incidents", "Problems" highlight as active on relevant routes
7. Doc 0 Dashboard, Doc 1 CMDB Linked Items, Doc 2 Event Detail updated to use real Doc 3a data

After generation, do not start Doc 3b yet. Wait for the next prompt.

---

*End of Doc 3a.*
