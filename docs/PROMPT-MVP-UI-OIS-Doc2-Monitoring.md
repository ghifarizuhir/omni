Tentu, saya regenerate Doc 2 sekarang.Tool akses file sedang restart. Saya regenerate Doc 2 ke output folder lagi:Tool sedang tidak tersedia. Saya perlu coba lagi:Tools sedang tidak tersedia di sesi ini. Saya akan paste Doc 2 langsung di chat agar Anda bisa copy-paste ke file lokal:

---

# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 2 — Observability Cluster: Monitoring & Event Management

> **Prerequisite:** Doc 0 (Foundation) + Doc 1 (CMDB) sudah di-execute di Build Mode session yang sama.
> **Module:** Monitoring and Event Management (per OIS-INSTRUCTIONS-V3 §7.14)
> **Routes covered:** `/events`, `/events/[id]`, `/monitoring/rules`, `/monitoring/routing`, `/monitoring/coverage`

---

## 🎯 SCOPE & DEPENDENCIES

Modul ini punya **dua sub-domain** yang berbeda karakter:

1. **Events** — operational stream, real-time feel, read-mostly (event hanya bisa di-acknowledge/resolve, bukan di-create manual)
2. **Monitoring** — configuration: rules, alert routing, coverage report (CRUD)

**Reuse dari Doc 0 + Doc 1:**
- AppShell, sidebar, topbar, semua UI primitives, formatters, mock data CIs
- Cross-link ke `/cmdb/{ciId}` untuk affected CIs
- Cross-link ke `/incidents/{id}` (Doc 3 placeholder ok) untuk linked incidents

**Yang akan ditambahkan di Doc 2:**
- Domain types: `Event`, `MonitoringRule`, `AlertRoute`, `EscalationStep` (bagian platform akan extended di Doc 6)
- Mock data: 50 events, 12 rules, 5 alert routes
- Module components di `src/components/monitoring/`
- 5 route implementations
- Update routing config

---

## 🧩 DOMAIN TYPES (`src/types/monitoring.ts`)

```typescript
import { Severity } from './common';

// Event level (per ITIL 4 §7.14)
export type EventType = 'informational' | 'warning' | 'exception';

// Event status (lifecycle)
export type EventStatus = 'open' | 'acknowledged' | 'resolved' | 'suppressed';

// Source of an event (where ingested from)
export type EventSource =
  | 'prometheus'
  | 'opentelemetry'
  | 'log_pattern'        // Pattern match in OpenSearch logs
  | 'synthetic'          // Synthetic check (uptime probe, smoke test)
  | 'webhook'            // Generic external webhook
  | 'cicd'               // CI/CD pipeline (e.g. deploy failure)
  | 'cloud_provider'     // AWS CloudWatch, GCP Monitoring, etc.
  | 'manual';            // Manually created

// Monitoring rule type
export type MonitoringRuleType =
  | 'threshold'          // Metric > X for Y duration
  | 'anomaly'            // Statistical deviation
  | 'composite'          // AND/OR of multiple sub-rules
  | 'log_pattern'        // OpenSearch query match
  | 'synthetic'          // Synthetic probe
  | 'absence';           // Heartbeat: no event in N minutes = alert

// Channels for alert routing
export type AlertChannel = 'email' | 'slack' | 'teams' | 'sms' | 'webhook' | 'in_app';

// Recipient targets
export type RecipientType = 'user' | 'team' | 'oncall_schedule';

// === EVENT ===
export interface Event {
  id: string;
  publicId: string;              // e.g. "EVT-2026-00099"
  type: EventType;
  status: EventStatus;
  severity: Severity;
  title: string;
  message: string;
  source: EventSource;
  ruleId?: string;
  rulePublicId?: string;
  ruleName?: string;
  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  correlationKey: string;
  groupCount: number;
  firedAt: string;
  lastSeenAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  linkedIncidentId?: string;
  payload: Record<string, unknown>;
  tags: string[];
}

// === MONITORING RULE ===
export interface MonitoringRule {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  type: MonitoringRuleType;
  enabled: boolean;
  source: EventSource;
  query: string;
  targetMode: 'explicit' | 'selector';
  targetCIIds: string[];
  targetSelector?: {
    types?: string[];
    tags?: string[];
    services?: string[];
    environments?: string[];
  };
  targetCount: number;
  condition: {
    operator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold?: number;
    duration?: string;
    evaluationWindow?: string;
  };
  severity: Severity;
  cooldown: string;
  alertRouteId: string;
  alertRoutePublicId: string;
  lastTriggeredAt?: string;
  totalFires30d: number;
  signalToNoiseRatio?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// === ALERT ROUTE ===
export interface AlertRoute {
  id: string;
  publicId: string;
  name: string;
  description?: string;
  matchExpression: {
    severities?: Severity[];
    sources?: EventSource[];
    tags?: string[];
  };
  channels: AlertChannel[];
  recipients: AlertRecipient[];
  escalationSteps: EscalationStep[];
  quietHours?: {
    enabled: boolean;
    timezone: string;
    fromHour: number;
    toHour: number;
    daysOfWeek: number[];
  };
  enabled: boolean;
  ruleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRecipient {
  id: string;
  type: RecipientType;
  targetId: string;
  targetName: string;
}

export interface EscalationStep {
  id: string;
  delayMinutes: number;
  recipients: AlertRecipient[];
  channels: AlertChannel[];
}
```

In `src/types/index.ts`, add: `export * from './monitoring';`

---

## 🗄 MOCK DATA

### `src/mocks/alertRoutes.ts` — 5 routes

Generate these 5 routes with full ids and timestamps:

1. **ROUTE-CRITICAL-PROD** — "Critical — Production". Match: severities=[P1,P2], tags=[production]. Channels: email, slack, sms, in_app. Recipients: oncall_schedule "Platform On-Call". 3 escalation steps (0min primary SMS+in_app → 15min secondary → 30min team email+slack). ruleCount=4.

2. **ROUTE-DATA-OPS** — "Data Platform — Ops". Match: tags=[team-data]. Channels: slack, email, in_app. Recipients: team "Data Platform". 2 escalation steps (0min team slack+in_app → 30min Aisha Khan email+slack). ruleCount=3.

3. **ROUTE-NETWORK** — "Network Operations". Match: sources=[cloud_provider], tags=[network]. Channels: slack, email. Recipients: team "Network Operations". 1 step. ruleCount=2.

4. **ROUTE-SERVICEDESK** — "Service Desk Triage". Match: severities=[P3,P4]. Channels: in_app, email. Recipients: team "Service Desk". Quiet hours enabled (NY timezone, 18:00-08:00, weekends). ruleCount=2.

5. **ROUTE-DEFAULT** — "Default — Catch-all". Match: empty. Channels: email, in_app. Recipients: user Sarah Chen. ruleCount=1.

### `src/mocks/monitoringRules.ts` — 12 rules

| publicId | name | type | severity | target | route |
|---|---|---|---|---|---|
| RULE-PAY-001 | Payment API 5xx error rate > 1% | threshold | P2 | CI-APP-PAY-001 | ROUTE-CRITICAL-PROD |
| RULE-PAY-002 | Payment API p95 latency > 500ms | threshold | P3 | CI-APP-PAY-001 | ROUTE-CRITICAL-PROD |
| RULE-PAY-003 | Payment Postgres connection pool > 80% | threshold | P2 | CI-DB-PAY-001 | ROUTE-CRITICAL-PROD |
| RULE-PAY-004 | Payment health check failed | synthetic | P1 | CI-APP-PAY-001 | ROUTE-CRITICAL-PROD |
| RULE-AUTH-001 | Auth login failure rate anomaly | anomaly | P2 | CI-APP-AUTH-001 | ROUTE-CRITICAL-PROD |
| RULE-ORD-001 | Order API checkout latency p95 > 800ms | threshold | P2 | CI-APP-ORD-001 | ROUTE-CRITICAL-PROD |
| RULE-ORD-002 | Order MongoDB replica lag > 30s | threshold | P3 | CI-DB-ORD-001 | ROUTE-DATA-OPS |
| RULE-DATA-001 | Search ES cluster health != green | log_pattern | P2 | (selector: type=database, tag=elasticsearch) | ROUTE-DATA-OPS |
| RULE-DATA-002 | Analytics pipeline batch delay > 15min | absence | P3 | (selector: service=svc-006) | ROUTE-DATA-OPS |
| RULE-NET-001 | VPC NAT gateway throughput > 80% | threshold | P3 | CI-NET-VPC-001 | ROUTE-NETWORK |
| RULE-NET-002 | External LB 4xx rate spike | threshold | P3 | CI-LB-EXT-001 | ROUTE-NETWORK |
| RULE-OPS-001 | Disk usage > 85% on any production server | threshold | P3 | (selector: type=server, env=production) | ROUTE-SERVICEDESK |

Examples for `query`:

```typescript
// RULE-PAY-001
query: 'sum(rate(http_requests_total{job="payment-api",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="payment-api"}[5m])) > 0.01',
condition: { operator: '>', threshold: 0.01, duration: '5m' },

// RULE-DATA-002 (absence)
query: 'absence(analytics_batch_completed{pipeline="daily"})',
condition: { duration: '15m' },

// RULE-DATA-001 (log_pattern)
query: 'log_message:"cluster.health.status:red" OR log_message:"cluster.health.status:yellow"',
```

For `signalToNoiseRatio`: most 0.7-0.95, a few noisy 0.3-0.5. Make `RULE-NET-002` the noisiest (0.32). For `totalFires30d` vary 0-150. `lastTriggeredAt`: RULE-PAY-001 ~30min ago, others spread across 14 days.

### `src/mocks/events.ts` — 50 events

Distribute: ~12 active, ~30 resolved (last 7 days), ~8 suppressed/grouped. Severity spread: P1=3, P2=12, P3=25, P4=10. Mix all sources and event types.

**Key concrete events (must include):**

```
EVT-2026-00184-A — Payment API 5xx rate breached 1% (P2, exception)
  Fires from RULE-PAY-001, affects CI-APP-PAY-001
  Status: acknowledged by David Okafor
  Linked to INC-2026-00184
  firedAt: 2026-05-08T08:14:00Z, groupCount: 1
  correlationKey: "payment-api:5xx-rate"

EVT-2026-00184-B — Payment Postgres connection pool > 80% (P2, warning)
  Fires from RULE-PAY-003, affects CI-DB-PAY-001
  Status: open
  firedAt: 2026-05-08T08:12:00Z (1 min before API alert)
  correlationKey: "payment-db:pool-pressure"
  (This is the actual root cause — DB pool saturation → app 5xx)

EVT-2026-00183-A — Order API checkout latency p95 > 800ms (P2)
  Fires from RULE-ORD-001, affects CI-APP-ORD-001
  Status: acknowledged (Yuki Tanaka), Linked to INC-2026-00183
  firedAt: 2026-05-08T07:42:00Z

EVT-2026-00182-A — Search ES cluster health: yellow (P2)
  Fires from RULE-DATA-001
  Status: acknowledged, Linked to INC-2026-00182
  firedAt: 2026-05-08T06:15:00Z, groupCount: 12 (storm collapsed)

EVT-2026-00184-C/D/E — 3 follow-up alerts post-incident
  "Payment API 5xx rate elevated but recovering" — P3 informational
  All status: resolved (auto-resolved)
  groupCount: 3 grouped together

EVT-2026-CICD-* — 4 CI/CD events
  - "Deploy succeeded: payment-api 2.4.1 to production" P4 resolved
  - "Deploy succeeded: order-api 3.1.0 to staging" P4 resolved
  - "Deploy failed: notification-gw 1.5.3 → rolled back" P3 resolved (24h ago)
  - "CI pipeline: smoke test failed on staging" P3 resolved (3 days ago)
```

Generate remaining ~40 events with diverse content: CPU/memory threshold breaches, synthetic check failures with auto-recovery, log pattern matches (OOM, connection refused), cloud provider events (AWS Health), anomaly detection (login rate σ deviation), webhook events, absence events, grouped storms (5-15 raw events).

Realistic `payload` JSON examples:

```typescript
// Prometheus
payload: {
  alertname: 'PaymentApi5xxRate',
  instance: 'srv-pay-prod-01:8080',
  job: 'payment-api',
  severity: 'critical',
  metric_value: 0.024,
  threshold: 0.01,
  fingerprint: 'a3f9e2b1',
}

// Synthetic
payload: {
  probe: 'health-check-payment',
  region: 'us-east-1',
  status_code: 503,
  response_time_ms: 4823,
  error: 'Connection timeout',
}

// CI/CD
payload: {
  pipeline: 'github-actions',
  workflow: 'deploy-prod.yml',
  run_id: '8729348',
  commit: '7e3f9a2',
  status: 'success',
  duration_seconds: 247,
}
```

Tagging: `production`/`staging`, `team-platform`/`team-data`/`team-network`, `customer-facing`, `auto-resolved`, `grouped`.

Helpers:
```typescript
export const getEventById = (id: string) => mockEvents.find(e => e.id === id || e.publicId === id);
export const getEventsByCI = (ciId: string) => mockEvents.filter(e => e.affectedCIIds.includes(ciId) || e.affectedCIPublicIds.includes(ciId));
export const getEventsByRule = (ruleId: string) => mockEvents.filter(e => e.ruleId === ruleId || e.rulePublicId === ruleId);
```

---

## 📄 PAGE 2.1 — Event Stream

**File:** `src/routes/monitoring/EventStream.tsx`
**Route:** `/events`

### Page header

```
Event Stream
50 events in last 7 days · 12 active · 5 P1/P2 unacknowledged
                                          [⏸ Pause] [Last 7d ▾] [⤓ Export]
```

- `[⏸ Pause]` toggles label to `[▶ Resume]`; visual only
- Time range dropdown: Last 1h / 24h / 7d / 30d / Custom
- `[⤓ Export]` visual only

### Filter & search bar

```
[🔍 Search title, message, payload, CI...]   [Status ▾]  [Severity ▾]  [Source ▾]  [Type ▾]  [Tags ▾]   [Reset]
```

Status filter shows badge counts: `[All 50] [Open 8] [Acknowledged 4] [Resolved 30] [Suppressed 8]`.

### Quick filter chips

```
[🔥 Active P1/P2 (5)]  [💥 Exceptions (10)]  [⚠ Warnings (25)]  [ℹ Informational (15)]  [📡 Last 24h (18)]
```

Click chip = preset filter combo; active chip has primary color background.

### Event card layout

```
┌─[severity color stripe at left, 4px]─────────────────────────────────────┐
│ [P2] EXCEPTION  prometheus                              08:14 · 38m ago  │
│ EVT-2026-00184-A                                                          │
│                                                                           │
│ Payment API 5xx error rate > 1% on payment-api                           │
│                                                                           │
│ Affected: CI-APP-PAY-001 payment-api                                     │
│ Rule: RULE-PAY-001 Payment API 5xx error rate > 1%                       │
│ Linked: INC-2026-00184 (Payment Service: 5xx error rate elevated)        │
│                                                                           │
│ ● Acknowledged by David Okafor · 12 min ago                              │
│                                                                           │
│ [Acknowledge] [Resolve] [Suppress] [Open detail →]                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Visual rules:**
- Severity color stripe at left edge (P1=#B42318, P2=#DC6803, P3=#DC6803/amber, P4=#067647)
- First row: SeverityBadge + event type label (uppercase) + source chip + time/ago
- For grouped events: show `[GROUP × 12]` chip after type
- Public ID (mono, muted)
- Title (large, semibold)
- Detail rows: affected CIs (linked to CMDB), rule (linked), linked incident (linked, placeholder ok)
- Status indicator dot + line:
  - Open: red dot + "Open · Fired 38m ago"
  - Acknowledged: amber dot + "Acknowledged by [name] · 12 min ago"
  - Resolved: green dot + "Resolved by [name] · 2h ago" (or "auto-resolved")
  - Suppressed: gray dot + "Suppressed · [reason]"
- Actions vary by status:
  - Open → Acknowledge, Resolve, Suppress, Open detail
  - Acknowledged → Resolve, Open detail
  - Resolved → Reopen, Open detail
  - Suppressed → Unsuppress, Open detail
- Click card body → `/events/{publicId}`
- Hover: subtle bg tint + slight elevation

### Date separators (sticky)

```
─────── TODAY · MAY 8, 2026 ───────
[event card]
[event card]
─────── YESTERDAY · MAY 7, 2026 ───────
[event card]
─────── MAY 6, 2026 ───────
```

### Right rail — Live Stats (sticky, 300px)

```
┌─ Live Stats — Last 24h ─────┐
│  Total events       52       │
│  Active (open/ack)  12       │
│  P1 events           1       │
│  P2 events           3       │
│  Auto-resolved      28       │
└──────────────────────────────┘

┌─ Top noisy rules ────────────┐
│ RULE-NET-002   87 fires      │
│ RULE-OPS-001   42 fires      │
│ RULE-DATA-001  31 fires      │
│ [View all rules →]           │
└──────────────────────────────┘

┌─ Top affected CIs ──────────┐
│ CI-APP-ORD-001   14 events   │
│ CI-DB-PAY-001    11 events   │
│ CI-LB-EXT-001     8 events   │
│ CI-APP-PAY-001    7 events   │
└──────────────────────────────┘

┌─ Sources breakdown ──────────┐
│  prometheus      ████████ 22 │
│  synthetic       █████ 12    │
│  cloud_provider  ███ 8       │
│  log_pattern     ██ 5        │
│  cicd            ██ 4        │
│  webhook         █ 1         │
└──────────────────────────────┘
```

Use small horizontal bar chart for sources (CSS bars, sized proportionally).
On <1024px: hide rail; show as drawer triggered by `[Stats]` button.

### "Pause" behavior

Sticky banner when paused:
```
[⏸] Stream paused at 08:42 UTC. 3 new events available.   [Resume]
```

### Pagination

Load first 25, "Load 25 more" button at bottom.

### Empty state

Icon: Inbox. "No events match current filters. Try adjusting your filters or [Reset all]."

---

## 📄 PAGE 2.2 — Event Detail

**File:** `src/routes/monitoring/EventDetail.tsx`
**Route:** `/events/:eventId`

### Page header

```
[← Back to events]                              [⋮] [Acknowledge] [Resolve]
─────────────────────────────────────────────────────────────────────────
[P2 stripe]
[EXCEPTION]  prometheus  ·  EVT-2026-00184-A
Payment API 5xx error rate > 1% on payment-api

  Status: ● Acknowledged  ·  Acked by David Okafor 12m ago
  Fired: 2026-05-08 08:14:00 UTC (38 min ago)  ·  Last seen: 38m ago
```

- Back link → `/events`
- `⋮` menu: Suppress, Reopen, Add comment, Copy link

### Two-column layout

**Left (60%) — Context & lineage:**

Card 1: **Affected CIs (1)** — link to CMDB, show CI publicId, name, type, env, criticality, health, owner, service. CTA: `[View in CMDB graph →]`.

Card 2: **Triggered by rule** — RULE-PAY-001 with name, type, severity, cooldown, full PromQL query, fire stats. Buttons: `[Open rule]` `[Edit rule]`.

Card 3: **Linked incident** — INC-2026-00184 with severity, status, assignee, created-time. Button: `[Open incident →]`.

Card 4: **Related events** (correlationKey: "payment-api:5xx-rate"):
```
↳ Show 3 more events grouped under this correlation key
  • EVT-2026-00184-A  THIS EVENT  · 38m ago
  • EVT-2026-00184-D  Payment API 5xx rate elevated but recovering · 8m
  • EVT-2026-00184-E  Payment API 5xx rate normal · 2m ago
```

Filter mockEvents by same correlationKey, sort chronologically, highlight current.

**Right (40%) — Timeline & raw data:**

Timeline card (vertical line + dots, git-log style, most recent on top):

```
┌─ Event Timeline ───────────────────────────────────┐
│ Now                                                 │
│ ●  Status: Acknowledged                  08:26 UTC │
│ │   David Okafor acknowledged the event             │
│ │                                                    │
│ ●  Linked to incident                    08:15 UTC │
│ │   Auto-created INC-2026-00184 from this event    │
│ │                                                    │
│ ●  Notification routed                   08:14 UTC │
│ │   Routed via ROUTE-CRITICAL-PROD                  │
│ │   Channels: SMS, Slack, Email · Recipients: 3    │
│ │                                                    │
│ ●  Event fired                           08:14 UTC │
│     Threshold breach: 0.024 > 0.01                  │
│     Source: prometheus · job=payment-api            │
│ Fired                                               │
└─────────────────────────────────────────────────────┘
```

Raw payload card (collapsible, default expanded):
```
┌─ Raw payload ─────────────────[Copy JSON]─────────┐
│ {                                                  │
│   "alertname": "PaymentApi5xxRate",                │
│   "instance": "srv-pay-prod-01:8080",              │
│   "job": "payment-api",                             │
│   "severity": "critical",                           │
│   "metric_value": 0.024,                            │
│   "threshold": 0.01,                                │
│   "fingerprint": "a3f9e2b1"                        │
│ }                                                  │
└────────────────────────────────────────────────────┘
```

Pretty-printed JSON in monospace; use `<pre><code>` (or `react-syntax-highlighter` if available).

Tags card showing event tags as pills.

### Action behaviors

- `[Acknowledge]` → status change, current user becomes acker, timeline gets new entry (UI state only)
- `[Resolve]` → if `linkedIncidentId` exists, modal asks: "This event is linked to INC-2026-00184. Resolve only this event, or also resolve the incident? [Just event] [Both]"
- Suppress → modal asks reason + duration ("Until rule changes" / "1 hour" / "1 day" / "Manual unsuppress")
- Add comment → small input at bottom of timeline; comments appear as new dots

---

## 📄 PAGE 2.3 — Monitoring Rules

**File:** `src/routes/monitoring/MonitoringRules.tsx`
**Route:** `/monitoring/rules`

### Page header

```
Monitoring Rules
12 rules · 8 enabled · 4 disabled · Avg signal/noise ratio: 0.78

                                  [Filter ▾] [Bulk actions ▾]  [+ New rule]
```

### Filter bar

```
[🔍 Search name, query, target...]  [Type ▾] [Severity ▾] [Source ▾] [Enabled ▾] [Route ▾]   [Reset]
```

### Stats strip

```
[All 12]  [Threshold 6]  [Anomaly 1]  [Composite 0]  [Log Pattern 2]  [Synthetic 1]  [Absence 2]
[Avg fires (30d): 38]  [Noisy (S/N < 0.5): 1]  [Never fired: 2]
```

### Rules table (DataTable)

Columns: `☐ | Status | Public ID | Name | Type | Severity | Targets | Last fired | Fires (30d) | S/N | Route | Actions`

- **Status**: small toggle switch (inline toggle, optimistic UI)
- **Public ID**: mono font
- **Name**: semibold, truncate with tooltip
- **Type**: pill chip with type-specific color
- **Severity**: SeverityBadge
- **Targets**: badge "1 CI" / "12 CIs" / "Selector" — hover tooltip lists CIs
- **Last fired**: relative time, or "Never"
- **Fires (30d)**: number + sparkline of daily fire count (mini SVG bars)
- **S/N**: color-coded — green ≥0.8, amber 0.5-0.8, red <0.5
- **Route**: route name (link)
- **Actions**: `⋮` menu — Edit, Duplicate, Test, View fires history, Delete

Default sort: `lastTriggeredAt` desc.
Bulk actions (when rows selected): Enable, Disable, Change route, Export, Delete.
Row hover: tooltip with query + condition.

### Empty states

If filters yield no results: "No rules match. [Reset filters] or [+ Create your first rule]"
If genuinely empty: icon Radio, "No monitoring rules yet. Set up your first rule to get notified about issues. [+ Create rule]"

### Create rule wizard — 3 steps (modal/full-page, max-width 800px)

**Step 1: Define rule**

```
Step 1 of 3 — Define what to monitor

  Rule name *
  [                                                        ]
  e.g. "Payment API 5xx error rate > 1%"

  Description (optional)
  [                                                        ]

  ┌─ Source ─────────────────────────────────────┐
  │ ◉ Prometheus                                  │
  │ ○ OpenTelemetry                               │
  │ ○ Log pattern (OpenSearch)                    │
  │ ○ Synthetic check                             │
  │ ○ Cloud provider                              │
  │ ○ Webhook                                     │
  └───────────────────────────────────────────────┘

  ┌─ Rule type ──────────────────────────────────┐
  │ ◉ Threshold     "Metric > X for Y minutes"    │
  │ ○ Anomaly       "Statistical deviation"       │
  │ ○ Composite     "AND/OR of sub-rules"         │
  │ ○ Log pattern   "Match log query"             │
  │ ○ Synthetic     "Probe check"                 │
  │ ○ Absence       "No event for N minutes"      │
  └───────────────────────────────────────────────┘

  Query
  [monospaced textarea]

  Test query (visual: shows "✓ Query valid · 1 series matched")

  ─────────────────────────
  [Cancel]              [Next: Set thresholds →]
```

Source choice changes helper text under Query field. Test query button visual only.

**Step 2: Set thresholds**

```
Step 2 of 3 — Set conditions

  Severity
  ○ P1 — Critical    ◉ P2 — High    ○ P3 — Medium    ○ P4 — Low

  Condition
  When  [the metric value ▾]   [is greater than ▾]   [0.01]   for at least  [5 minutes ▾]

  Cooldown
  Don't fire again within  [10 minutes ▾]
  Prevents alert storms from one continuing issue.

  Targets — which CIs does this rule apply to?
  ◉ Specific CIs
    [+ Add CIs]
    Selected: [CI-APP-PAY-001 ×]

  ○ Selector (dynamic)
    Type: [Application ▾]   Service: [Payment ▾]   Tags: [+]
    ↳ Matches 3 CIs: payment-api, payment-worker, ... [Show all]

  Tags (apply to events fired by this rule)
  [production ×] [pci-scope ×] [+ Add tag]

  ─────────────────────────
  [← Back]              [Next: Configure routing →]
```

Condition row reads naturally; dropdown options change based on rule type from step 1 (Absence collapses to just duration). Targets section: radio between explicit list and dynamic selector. Selector shows live preview "Matches N CIs". Use `mockCIs` to populate autocomplete.

**Step 3: Configure routing**

```
Step 3 of 3 — Configure alert routing

  Alert route
  ┌────────────────────────────────────────────────┐
  │ ◉ ROUTE-CRITICAL-PROD                           │
  │   Critical — Production · Pages on-call         │
  │   Channels: SMS, Slack, Email, In-app           │
  │   Recipients: Platform On-Call (3 users)        │
  │   Escalation: 0m → 15m → 30m                    │
  │                                                  │
  │ ○ ROUTE-DATA-OPS                                │
  │ ○ ROUTE-NETWORK                                 │
  │ ○ ROUTE-SERVICEDESK                             │
  │ ○ ROUTE-DEFAULT                                 │
  │                                                  │
  │ ─── or ───                                      │
  │ + Create new route                               │
  └────────────────────────────────────────────────┘

  Preview
  When this rule fires (P2):
    1. Immediately: Notify Platform On-Call primary via SMS, in-app
    2. After 15m if not acknowledged: Notify secondary on-call
    3. After 30m if still open: Notify Platform Engineering team via email, Slack

  ─────────────────────────
  [← Back]              [Save as draft] [Create rule]
```

Preview updates dynamically with selected route. "Create new route" → placeholder modal saying "Route creation in /monitoring/routing". `[Save as draft]` saves with `enabled: false`. `[Create rule]` saves with `enabled: true`. After save: close wizard, show toast "✓ Rule created", new row appears at top.

### Edit / Test rule

Edit: same wizard pre-populated, title "Edit rule", submit "Save changes". Tabs allow jumping between steps.

Test (action menu): modal showing channel preview with Test buttons per channel (visual only):
```
Test rule: RULE-PAY-001

This will simulate a test event without triggering real alerts.

  Channel preview:
    [✓] SMS to David Okafor (+1-***-1234)     [Test]
    [✓] Slack to #payment-alerts              [Test]
    [✓] Email to platform-oncall@acme.io      [Test]

  Last test: never
                                          [Close] [Run all]
```

---

## 📄 PAGE 2.4 — Alert Routing

**File:** `src/routes/monitoring/AlertRouting.tsx`
**Route:** `/monitoring/routing`

### Page header

```
Alert Routing
5 routes · 12 rules using these routes · 8 channels configured

                                                     [+ New route]
```

### 2-column layout

**Left (40%) — Route list (vertical cards):**

```
┌─[selected: primary border]─────────────┐
│ ROUTE-CRITICAL-PROD          ● Enabled │
│ Critical — Production                   │
│ Pages on-call immediately for P1/P2.   │
│                                         │
│ Channels: SMS · Slack · Email · In-app  │
│ Rules using: 4                          │
│ Last fired: 38m ago (RULE-PAY-001)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ROUTE-DATA-OPS               ● Enabled │
│ Data Platform — Ops                     │
│ Channels: Slack · Email · In-app        │
│ Rules using: 3 · Last fired: 2h ago    │
└─────────────────────────────────────────┘

... (3 more)
```

Filter input at top: "Search routes...". Click card → loads right panel.

**Right (60%) — Route detail/editor:**

```
ROUTE-CRITICAL-PROD                       [● Enabled toggle] [⋮]
Critical — Production
Pages on-call immediately for P1/P2 events.    Last updated 12 days ago

[Save changes]   (only enabled when there are unsaved edits)

────────────────────────────────────────────────────────────

▤ Match conditions
  Severity: [P1 ×] [P2 ×]            [+ Add severity]
  Sources: [+ Add source]
  Tags:    [production ×]            [+ Add tag]

  ↳ Matches 4 rules:
     • RULE-PAY-001  Payment API 5xx error rate > 1%
     • RULE-PAY-003  Payment Postgres connection pool > 80%
     • RULE-PAY-004  Payment health check failed
     • RULE-AUTH-001 Auth login failure rate anomaly

▤ Channels
  [✓] SMS         (Twilio)
  [✓] Slack       #platform-oncall
  [✓] Email       platform-oncall@acme.io
  [✓] In-app
  [ ] Teams
  [ ] Webhook

▤ Escalation policy
  Step 1 — Immediate (delay: 0 min)
    Recipients: Platform On-Call (primary)
    Channels: SMS, In-app
    [Edit step] [Remove]

  Step 2 — After 15 min if not acknowledged
    Recipients: Platform On-Call (secondary)
    Channels: SMS, In-app
    [Edit step] [Remove]

  Step 3 — After 30 min if still open
    Recipients: Platform Engineering team (10 members)
    Channels: Email, Slack
    [Edit step] [Remove]

  [+ Add escalation step]

▤ Quiet hours
  [ ] Enable quiet hours
      (during quiet hours, only P1 alerts come through)
```

Each section collapsible. Inline edit interactions:
- Channels: checkboxes + per-channel sub-config (clicking Slack reveals "Channel: #platform-oncall [Edit]")
- Escalation steps: editable cards; `[Edit step]` opens popup with delay slider + recipient picker + channel checkboxes
- Quiet hours: when enabled, reveals timezone + day-of-week + time range inputs

`⋮` menu: Test route, Duplicate, View fire history, Delete (blocked if `ruleCount > 0`).

Empty state for left list: "No routes match. [Clear search]"

---

## 📄 PAGE 2.5 — Coverage Report

**File:** `src/routes/monitoring/CoverageReport.tsx`
**Route:** `/monitoring/coverage`

### Purpose
**Critical for OIS positioning.** ServiceNow has CMDB but no monitoring; Datadog has monitoring but no CMDB. OIS shows the gaps.

### Page header

```
Monitoring Coverage
Are your critical assets being watched?

22 CIs total · 14 with rules · 8 without rules · 5 critical gaps    Last analyzed: 4m ago
```

### Hero section — Coverage Gap (prominent warning styling)

Use `--ois-warning-pale` background with `--ois-warning` border.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚠ 5 critical gaps detected                                               │
│                                                                            │
│  These critical CIs have no active monitoring rules:                       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │ 🟧 CI-STG-PAY-001  pay-receipts-bucket  S3 storage       │            │
│  │ Critical · Payment Service · 0 rules                      │            │
│  │ → Suggest a rule [Storage capacity threshold]             │            │
│  └──────────────────────────────────────────────────────────┘            │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │ 🟪 CI-DB-PAY-002  pay-postgres-replica  PostgreSQL       │            │
│  │ Critical · Payment Service · 0 rules                      │            │
│  │ → Suggest a rule [Replication lag, Disk usage]            │            │
│  └──────────────────────────────────────────────────────────┘            │
│  ... (3 more)                                                             │
│                                                                            │
│  [+ Bulk create rules from suggestions]                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

Each gap card:
- CI type icon + publicId + name + type
- Criticality + service + "0 rules" warning
- "Suggest a rule" → expandable showing 1-3 templates per CI type
- `[Create rule]` mini button → opens rule wizard pre-populated with that template

`[+ Bulk create rules from suggestions]` opens multi-select dialog to create multiple rules at once.

### Coverage matrix

```
COVERAGE MATRIX

[Filter: All CIs ▾]  [Filter: All criticality ▾]  [Filter: With/without rules ▾]
[Group by: CI type ▾]

────────────────────────────────────────────────────────────────────────────
SERVICES (3)
────────────────────────────────────────────────────────────────────────────
CI-SVC-PAY-001    Payment Service              Critical    0 rules   [+ Add]
CI-SVC-AUTH-001   Authentication Service       Critical    0 rules   [+ Add]
CI-SVC-ORD-001    Order Service                Critical    0 rules   [+ Add]
                                                            (Service-level rules optional)
────────────────────────────────────────────────────────────────────────────
APPLICATIONS (5)
────────────────────────────────────────────────────────────────────────────
CI-APP-PAY-001    payment-api                  High        2 rules   [View]
                  ▸ RULE-PAY-001 (5xx error rate)
                  ▸ RULE-PAY-002 (latency p95)
CI-APP-PAY-002    payment-worker               Medium      0 rules   ⚠ [+]
CI-APP-AUTH-001   auth-api                     High        1 rule    [View]
CI-APP-ORD-001    order-api                    High        1 rule    [View]
CI-APP-ORD-002    order-event-consumer         Medium      0 rules   ⚠ [+]
────────────────────────────────────────────────────────────────────────────
DATABASES (4)
────────────────────────────────────────────────────────────────────────────
CI-DB-PAY-001     pay-postgres-primary         Critical    1 rule    [View]
CI-DB-PAY-002     pay-postgres-replica         Critical    0 rules   ⚠⚠ [+]
... etc
```

For each row:
- CI publicId + name + type icon
- Criticality
- Rule count color-coded: 0 rules + critical/high = red ⚠, 0 rules + low/medium = amber ⚠, ≥1 rule = green
- `[View]` jumps to rules filtered by this CI; `[+ Add]` opens wizard pre-populated
- Expandable: clicking rule count reveals indented rules list

Group headers show count + completion percentage.

### Right sidebar (sticky)

```
┌─ Coverage by criticality ──────────────────┐
│ Critical   ███████░░░  7/8  (87%)          │
│ High       █████░░░░░  4/9  (44%)          │
│ Medium     ███░░░░░░░  3/4  (75%)          │
│ Low        ░░░░░░░░░░  0/1  (0%)           │
└────────────────────────────────────────────┘

┌─ Coverage by type ─────────────────────────┐
│ Service        0/3  → optional             │
│ Application    3/5  ⚠                       │
│ Database       3/4  ⚠                       │
│ Server         3/4  ⚠                       │
│ Load Balancer  1/2  ⚠                       │
│ Network        1/1  ✓                       │
│ Storage        0/1  ⚠⚠                      │
│ Endpoint       2/2  ✓                       │
└────────────────────────────────────────────┘

┌─ Insights ─────────────────────────────────┐
│ • 5 critical CIs have no rules             │
│ • 1 rule is noisy (S/N < 0.5):             │
│   RULE-NET-002 — consider tuning           │
│ • 2 rules never fired in 30d:              │
│   may be obsolete                          │
└────────────────────────────────────────────┘
```

### Empty state (won't trigger in demo)

If 100% covered: icon ShieldCheck large green, "Full monitoring coverage. All 22 configuration items have at least one active monitoring rule. Keep an eye on signal-to-noise — see Rules page for tuning suggestions."

---

## 🎨 SHARED MONITORING COMPONENTS (`src/components/monitoring/`)

```
components/monitoring/
├── EventCard.tsx
├── EventStatusBadge.tsx
├── EventTypeBadge.tsx
├── EventSourceChip.tsx
├── EventTimeline.tsx
├── EventStreamFilters.tsx
├── EventQuickFilterChips.tsx
├── EventStreamStatsRail.tsx
├── RuleStatusToggle.tsx
├── RuleSparkline.tsx
├── RuleQueryDisplay.tsx
├── RuleWizard/
│   ├── RuleWizard.tsx
│   ├── StepperNav.tsx
│   ├── Step1Define.tsx
│   ├── Step2Conditions.tsx
│   └── Step3Routing.tsx
├── AlertRouteCard.tsx
├── AlertRouteEditor.tsx
├── EscalationStepCard.tsx
├── ChannelPicker.tsx
├── CoverageGapCard.tsx
├── CoverageMatrix.tsx
├── CoverageHealthSidebar.tsx
└── coverageHelpers.ts
```

### Constants in `src/lib/constants.ts`

```typescript
export const eventTypeMeta: Record<EventType, { label: string; color: string; bg: string; icon: string }> = {
  informational: { label: 'INFORMATIONAL', color: '#475467', bg: '#F1F3F7', icon: 'Info' },
  warning:       { label: 'WARNING',       color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  exception:     { label: 'EXCEPTION',     color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
};

export const eventStatusMeta: Record<EventStatus, { label: string; color: string; bg: string; dot: string }> = {
  open:         { label: 'Open',         color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  acknowledged: { label: 'Acknowledged', color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  resolved:     { label: 'Resolved',     color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  suppressed:   { label: 'Suppressed',   color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const eventSourceMeta: Record<EventSource, { label: string; icon: string }> = {
  prometheus:     { label: 'Prometheus',     icon: 'Activity' },
  opentelemetry:  { label: 'OpenTelemetry',  icon: 'Telescope' },
  log_pattern:    { label: 'Log pattern',    icon: 'FileText' },
  synthetic:      { label: 'Synthetic',      icon: 'Eye' },
  webhook:        { label: 'Webhook',        icon: 'Webhook' },
  cicd:           { label: 'CI/CD',          icon: 'GitBranch' },
  cloud_provider: { label: 'Cloud provider', icon: 'Cloud' },
  manual:         { label: 'Manual',         icon: 'User' },
};

export const ruleTypeMeta: Record<MonitoringRuleType, { label: string; description: string; icon: string }> = {
  threshold:   { label: 'Threshold',   description: 'Metric crosses a value for a duration',      icon: 'TrendingUp' },
  anomaly:     { label: 'Anomaly',     description: 'Statistical deviation from baseline',         icon: 'Sparkles' },
  composite:   { label: 'Composite',   description: 'Combination of multiple sub-rules',           icon: 'Combine' },
  log_pattern: { label: 'Log pattern', description: 'Log query matches',                           icon: 'FileSearch' },
  synthetic:   { label: 'Synthetic',   description: 'External probe / health check',               icon: 'Eye' },
  absence:     { label: 'Absence',     description: 'Heartbeat missing for N minutes',             icon: 'CircleSlash' },
};

export const channelMeta: Record<AlertChannel, { label: string; icon: string }> = {
  email:   { label: 'Email',   icon: 'Mail' },
  slack:   { label: 'Slack',   icon: 'MessageSquare' },
  teams:   { label: 'Teams',   icon: 'MessageSquare' },
  sms:     { label: 'SMS',     icon: 'Smartphone' },
  webhook: { label: 'Webhook', icon: 'Webhook' },
  in_app:  { label: 'In-app',  icon: 'Bell' },
};
```

### Coverage suggestion templates

In `coverageHelpers.ts`:

```typescript
export const getSuggestedRulesForCIType = (type: CIType): RuleSuggestion[] => {
  switch (type) {
    case 'database':
      return [
        { name: 'Connection pool utilization > 80%', ruleType: 'threshold', severity: 'P2', defaultQuery: '...' },
        { name: 'Replication lag > 30s', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
        { name: 'Disk usage > 85%', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
      ];
    case 'storage':
      return [
        { name: 'Storage capacity > 85%', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
        { name: 'Object count anomaly', ruleType: 'anomaly', severity: 'P3', defaultQuery: '...' },
      ];
    case 'load_balancer':
      return [
        { name: 'Active connections > 90% capacity', ruleType: 'threshold', severity: 'P2', defaultQuery: '...' },
        { name: '5xx response rate > 1%', ruleType: 'threshold', severity: 'P2', defaultQuery: '...' },
        { name: 'Health check failure', ruleType: 'synthetic', severity: 'P1', defaultQuery: '...' },
      ];
    case 'application':
      return [
        { name: 'Error rate > 1%', ruleType: 'threshold', severity: 'P2', defaultQuery: '...' },
        { name: 'Latency p95 > 500ms', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
      ];
    case 'server':
      return [
        { name: 'CPU usage > 85%', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
        { name: 'Memory usage > 90%', ruleType: 'threshold', severity: 'P2', defaultQuery: '...' },
        { name: 'Disk usage > 85%', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
      ];
    case 'endpoint':
      return [
        { name: 'External endpoint synthetic check', ruleType: 'synthetic', severity: 'P2', defaultQuery: '...' },
        { name: 'Response time anomaly', ruleType: 'anomaly', severity: 'P3', defaultQuery: '...' },
      ];
    case 'network':
      return [
        { name: 'Packet drop rate > 0.1%', ruleType: 'threshold', severity: 'P3', defaultQuery: '...' },
      ];
    default:
      return [];
  }
};
```

Use realistic Prometheus query strings for `defaultQuery` fields.

---

## 🔀 ROUTING UPDATE

In `src/routes/index.tsx`, replace 5 placeholder routes:

```tsx
// Replace
{ path: 'events',                element: <Placeholder ... /> },
{ path: 'events/:id',            element: <Placeholder ... /> },
{ path: 'monitoring/rules',      element: <Placeholder ... /> },
{ path: 'monitoring/routing',    element: <Placeholder ... /> },
{ path: 'monitoring/coverage',   element: <Placeholder ... /> },

// With
{ path: 'events',                element: <EventStream /> },
{ path: 'events/:eventId',       element: <EventDetail /> },
{ path: 'monitoring/rules',      element: <MonitoringRules /> },
{ path: 'monitoring/routing',    element: <AlertRouting /> },
{ path: 'monitoring/coverage',   element: <CoverageReport /> },
```

---

## 🔗 CROSS-LINKING

- Event card / detail → affected CIs → `/cmdb/{ciPublicId}` (real, Doc 1)
- Event detail → linked incident → `/incidents/{id}` (placeholder, Doc 3)
- Event detail → triggering rule → `/monitoring/rules?focus={rulePublicId}` (real, Doc 2)
- Rule row → `/monitoring/rules?focus={rulePublicId}` deeplinks scroll-to-row + opens edit drawer
- Rule row → linked route → `/monitoring/routing?route={routePublicId}` selects that route in left list
- Coverage gap card → "Create rule" → opens rule wizard with prefilled type/target
- Coverage matrix CI rows → `/cmdb/{ciPublicId}` (real)
- **CMDB detail Tab 4 (Monitoring)** — replace fake data with `mockMonitoringRules.filter(r => r.targetCIIds.includes(ciId))`. Update `CMDBDetail.tsx` accordingly.

---

## ✅ QUALITY CHECKLIST

- [ ] All 5 routes work without 404
- [ ] `/events` shows 50 events reverse chronological with date separators
- [ ] Event cards show severity stripe, status indicator, action buttons appropriate to status
- [ ] Filters (status, severity, source, type, search) work in combination
- [ ] Quick filter chips apply preset combos and show active state
- [ ] Right rail stats update dynamically based on filter
- [ ] Pause/resume button works (visual only)
- [ ] Click event card → navigates to detail; clicking inner links does NOT
- [ ] `/events/EVT-2026-00184-A` shows full detail with timeline + raw payload + linked items
- [ ] Resolve action on linked event shows "Resolve only this or also incident?" modal
- [ ] Related events section shows other events with same correlationKey
- [ ] `/monitoring/rules` shows 12 rules in DataTable with sortable columns
- [ ] Status toggle works (optimistic UI)
- [ ] S/N ratio column shows color-coded values
- [ ] Sparkline of 30d fire history renders for each rule
- [ ] `[+ New rule]` opens 3-step wizard
- [ ] Wizard transitions work, validates required fields
- [ ] Step 2 condition row reads naturally based on rule type from step 1
- [ ] Step 3 preview updates with selected route
- [ ] Save rule closes wizard, adds row to top with toast
- [ ] `/monitoring/routing` shows 5 routes in left list, editor on right
- [ ] Selecting a route updates right panel with editable sections
- [ ] Channels checkboxes, escalation steps editable cards
- [ ] `/monitoring/coverage` shows hero "5 critical gaps" with warning styling
- [ ] Each gap card has type-specific rule suggestions
- [ ] Coverage matrix groups CIs by type with color-coded warnings
- [ ] Right sidebar shows coverage by criticality + by type + insights
- [ ] CMDB detail Monitoring tab now uses REAL `mockMonitoringRules` (not fake)
- [ ] All public IDs use mono font
- [ ] All severity badges use SeverityBadge component
- [ ] Cross-links to CMDB work; cross-links to incidents are placeholders
- [ ] Sidebar nav highlights "Events & Monitoring" parent on `/events` and `/monitoring` routes
- [ ] Mock consistency: EVT-2026-00184-A linked to INC-2026-00184 (matches Doc 0)
- [ ] No console / TypeScript errors

---

## 🚀 DELIVERABLE

Extend the existing project. Confirm:

1. New types added to `src/types/monitoring.ts` and re-exported
2. Mock data files created: `events.ts`, `monitoringRules.ts`, `alertRoutes.ts`
3. Module components in `src/components/monitoring/`
4. 5 route files in `src/routes/monitoring/`
5. Routing config updated (route order: literal paths before `/events/:eventId`)
6. Sidebar "Events & Monitoring" highlights as active on relevant routes
7. CMDB detail page Monitoring tab updated to use real mock rules

After generation, do not start Doc 3. Wait for the next prompt.

---

*End of Doc 2.*