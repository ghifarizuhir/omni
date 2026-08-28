# Monitoring — Event Management & Observability

Status: **Draft**
Route: `/monitoring` (layout), `/monitoring/events` (stream), `/monitoring/events/:id` (detail), `/monitoring/rules`, `/monitoring/routing`, `/monitoring/coverage` — alias `/monitoring` → Overview
Sidebar: Observability (Module Layout)
Source: `src/routes/monitoring/MonitoringLayout.tsx`, `MonitoringOverview.tsx`, `EventStream.tsx`, `EventDetail.tsx`, `MonitoringRules.tsx`, `AlertRouting.tsx`, `CoverageReport.tsx` · `server/routes/monitoring.ts` + `events.ts` · `src/types/monitoring.ts`

---

## Intent

Single pane untuk **event stream → detection rule → alert routing → coverage** — dari ingestion external (Prometheus/OTel/log/webhook) sampai routing ke channel/eskalasi dan gap analysis CI tanpa rule. Operator harus lihat P1 aktif dalam 2 detik, buat rule baru <3 menit, dan audit coverage per criticality.

ITIL 4 §7.14: Event Management — informational/warning/exception dengan severity P1..P4, deduplicated via `correlationKey` + `groupCount`.

## Current State (snapshot `src/routes/index.tsx:124-131`)

- `src/routes/index.tsx:124` → `<MonitoringLayout />` at `/monitoring` with children:
  - `index` → `<MonitoringOverview />`
  - `events` → `<EventStream />`
  - `rules` → `<MonitoringRules />`
  - `routing` → `<AlertRouting />`
  - `coverage` → `<CoverageReport />`
- Sibling `src/routes/index.tsx:131` → `<EventDetail />` at `/monitoring/events/:id` (outside layout, 3-column detail)
- Layout: `src/routes/monitoring/MonitoringLayout.tsx:26` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + title block `flex items-stretch` + accent `w-1 shrink-0` color `p1>0 #B42318 : p2>0 #DC6803 : #1F4FD4` + stats `{active} active · {p1} P1 open · {p2} P2 open · {unack} unacknowledged` + tab bar 5 `NavLink` (`Activity/Radio/Shield/GitBranch/CircleDot` size 14, active `border-ois-primary text-ois-primary` else muted hover).
- Components: `EventCard`, `EventSeverityBadge/Pill`, `EventStatusBadge/Pill`, `RuleStatusToggle`, `RuleQueryDisplay`, `RuleSparkline`, `AlertRouteCard`, `CoverageGapCard` (`src/components/monitoring/`).
- API: `monitoringRouter` (rules/routes) + `eventsRouter` (`GET /events`, `/events/dashboard-stats`, `/events/:publicId`, `PATCH .../status`, `POST /events/ingest`) — `requirePermission('event.read'|'rule.read'|'event.write'|'rule.write')` + `req.scoped.*` + `audit` + `emitEventCreated` Socket.IO.
- Types: `EventType informational|warning|exception`, `EventStatus open|acknowledged|resolved|suppressed`, `EventSource 8` + `MonitoringRuleType 6` + `AlertRoute` with `matchExpression/escalationSteps/quietHours` (`src/types/monitoring.ts:4-144`).

**Working:**
- Overview: KPI 4 cards (Active/P1/P2/Unacknowledged), Active Alerts feed 8 `EventCard` → detail, right rail Rules/Routing/Sources/Coverage (`%` color green≥80 amber≥60 red) with progress bar.
- EventStream: Search (title/message/publicId/CI) + Status/Severity/Source/Type + Time 24h/7d/30d + quick chips `Active P1/P2 | Exceptions|Warnings|Informational | Last 24h`, grouped by date `TODAY/YESTERDAY`, `EventCard` per event, pause/resume freeze with banner `Resume (X new)`, export CSV, stats rail `Total/Open/Ack/Resolved + breakdown` (lg+ else drawer).
- EventDetail: top `← Events | Acknowledge/Resolve/Reopen | Copy ID/link`, main card severity bar `P1 bar #B42318`, type badge, source+publicId, title, status with ackedBy, firing timeline; left 60% Affected CIs → `/cmdb`, Triggered by Rule (PromQL monospace, cooldown, fires 24h), Linked Incident (create modal → `/incidents`), Related Events `correlationKey` max 5 with THIS; right 40% Timeline (system+comments composer), Raw Payload collapsible dark `Copy JSON`, Tags `Add tag`.
- Rules: filter search+type+severity+enabled, stats strip `type breakdown + Avg fires 30d + Noisy S/N<0.5 + Never fired`, DataTable columns `☐ Status toggle | publicId mono | Name | Type badge | Severity | Targets count | LastFired | Fires sparkline | S/N % colored | Route link | ⋯ Edit/Test/Delete`, wizard 3-step Define→Conditions→Routing via `RuleWizard/`, Test modal `Run all` channels preview, delete confirm.
- Routing: split list left (`publicId dot name line-clamp-2 channels(3) ruleCount lastTriggered`) / editor right collapsible Match Conditions (severity pills P1-4, sources/tags TagInput, matching rules), Channels 6 cards checkbox+mini config+Edit, Escalation timeline steps `delayMinutes recipients channels` with add/edit/delete, Quiet Hours enable+timezone+hours+days S-M-T-W-T-F-S toggle, Test `Run dry-run`.
- Coverage: groupBy type/service toggle, Critical Gaps hero red `N CRITICAL GAPS` + grid + Suggest rule + bulkCreate modal, matrix per group header `COVERAGE %`, per CI icon+publicId+criticality+rules count+progress bar 0/100%+View/Add, sidebar Coverage by Criticality (4 bars), by Type 8 rows, Insights (critical no rule, noisy, never fired), promo gradient.

**Stub / Partial:**
- Coverage bulk create action not yet wired to `POST /monitoring/rules` batch.
- Rule S/N `signalToNoiseRatio` computed but threshold tuning not exposed.
- Quiet hours preview not simulated beyond dry-run.

**Missing:**
- Event payload schema validation per source (now `z.record(zUnknown)`).
- Rule composite AND/OR builder full.

## Primary View — Per Tab

### MonitoringLayout (shared chrome)

- Title `Monitoring text-xl font-bold` + stats row `text-xs text-ois-text-muted` with dots `w-1 h-1 rounded-full bg-ois-border-strong`.
- Tabs 5: `Overview (Activity, end:true) | Event Stream (Radio) | Rules (Shield) | Alert Routing (GitBranch) | Coverage (CircleDot)` — `px-3 py-3 border-b-2 whitespace-nowrap`. Outlet `flex-1 min-h-0` owns scroll.

### Overview

`flex-col gap` hero 4 KPI cards (`KPICard` style) → Active Alerts feed `8 EventCard` + `View all → /monitoring/events` → right rail stacked Cards (Rules Panel `total/enabled/disabled/firing 24h + Manage`, Routing `routes/channels`, Connected Sources, Coverage `%` + bar + `covered/total` + link `View coverage`).

### Event Stream

- Filter bar `flex-wrap gap-2`: Search `Search 13px` input `h-9 border-ois-border-strong`, Status+Severity+Source+Type `FilterDropdown`, Time `FilterDropdown 24h|7d|30d`, Export `Download 13px`.
- Quick chips `rounded-full text-xs font-medium` active `bg-ois-primary text-white` else `bg-white border-ois-border` — `Active P1/P2` (open+acknowledged), `Exceptions|Warnings|Informational`, `Last 24h`.
- Pause toggle stores `isPaused` — banner fixed `bg-amber-50 border-amber-200 "Paused — X new events • Resume"`.
- Grouped list `divide-y-0 space-y-1` by date header `text-[11px] uppercase tracking-widest bg-ois-bg px-2 py-1`, `EventCard` per event (`severity left bar`, `type badge`, `source chip`, `title truncate`, `affectedCI 1`, `firedAt formatRelative`, `groupCount +N`).
- Stats rail `w-64 shrink-0 lg:block hidden` — Total/Open/Ack/Resolved + breakdown Exceptions/Warnings/Informational counts; mobile via slide drawer triggered by `BarChart2 14px`.

### Rules

- Filter row: Search `w-64` + Type (6) + Severity (4) + Enabled toggle.
- Stats strip 4 pills `bg-ois-surface-muted border-ois-border rounded-lg px-3 py-2`: type breakdown dot+count, Avg fires `totalFires30d/30`, Noisy `S/N<0.5` red, Never fired `lastTriggeredAt null` muted.
- Table `DataTable` columns: `☐ 36px`, Status toggle `Switch` (optimistic `enabled` flip → `PATCH /monitoring/rules/:id` + rollback), PublicId `font-mono text-xs ois-primary` link, Name `text-sm font-medium` + description `text-xs muted line-clamp-1`, Type badge `neutral`, Severity `EventSeverityBadge`, Targets `targetCount` `badge ois-surface-muted`, LastFired `formatRelative` or `—`, Fires sparkline `RuleSparkline 40x16` + `30d count`, S/N `%` `color ≥80 green ≥50 amber else red`, Route `IDCell → /monitoring/routing`, ⋯ `Edit/Test/Delete` (delete confirm `Modal size sm`).

Wizard 3-step `RuleWizard/` Define (source, query monospace `font-mono text-xs border-ois-border-strong rounded-lg h-24`, targetMode explicit|selector + CI picker) → Conditions (threshold operator `>|<|>=|<=|==|!=`, value, duration, evaluationWindow, severity `P1..P4`, cooldown `5m|10m|1h`) → Routing (AlertRoute `FilterDropdown`). Save `POST`/`PATCH`.

### Alert Routing

`flex gap-6 h-full min-h-0`: Left `w-80 overflow-y-auto border-r` cards per route (`publicId mono 11px bold`, enabled dot `w-2 h-2 bg-emerald-500|ois-border`, name `text-sm font-bold` + description `line-clamp-2 text-xs muted`, channel icons first 3 `Size 12 ois-text-subtle`, meta `ruleCount + lastTriggeredAt formatRelative`); Right editor `flex-1 overflow-y-auto px-6 py-5 space-y-6`:

- Match Conditions `SectionCard`: severity pills `P1..P4 rounded-full px-2 py-1 text-xs font-semibold` active `bg-ois-primary text-white` else `bg-white border-ois-border`, sources TagInput (`prometheus|opentelemetry|...`), tags TagInput, Matching Rules card list.
- Channels `grid-cols-3 gap-3`: 6 cards `border rounded-lg p-3` checkbox `input rounded` + label `Email|Slack|Teams|SMS|Webhook|In-App` + mini config (`email to`, `slack #channel`, `webhook URL`) + Edit `Modal`.
- Escalation `vertical timeline`: step `delayMinutes after Firing → recipients (user|team|oncall_schedule) chips + channels icons`, Add step `Plus 13px`, delete per step.
- Quiet Hours `SectionCard`: enable switch, timezone `select` (UTC etc), fromHour/toHour `input type=number 0..23`, days `S M T W T F S` toggle `w-7 h-7 rounded-full border`.

Test button `h-7 outline` → `Test Route Modal` with channel list preview + `Run dry-run` — warning no real SMS/call, Slack hook fires if configured.

### Coverage

`CoverageReport.tsx` state `groupBy type|service`, `expandedCIs Set`, `bulkCreate open`.

- Hero Critical Gaps `bg-red-50 border-red-200 rounded-xl p-4` if `criticalGaps>0`: title `N CRITICAL GAPS DETECTED text-xs font-bold tracking-widest red-700`, grid `sm:grid-cols-2 lg:grid-cols-4 gap-3` `CoverageGapCard` per CI (icon + name + type + criticality) + Suggest `ChevronDown` expandable template picker + Bulk Create `Button primary`.
- Matrix: search `Search 13px` + groupBy toggle `Type|Service` segmented; per group header `bg-ois-surface-muted px-4 py-2 border-b` name `text-xs font-bold uppercase tracking-widest` + `COVERAGE 78%` `text-xs font-bold` colored (≥80 green etc); per CI row `flex items-center gap-3 px-4 py-3 border-b` icon `w-8 h-8 rounded-lg bg-ois-bg border`, `publicId font-mono 11px ois-primary`, name+type `text-xs`, criticality `Badge danger|warning|success`, rules count `text-xs muted`, progress `w-24 h-1.5 bg-ois-border rounded-full fill colored`, View `Eye 12px` → `/cmdb/:id`, Add `Plus 12px` → rule wizard, expand `ChevronDown` → rule list `divide-y`.
- Sidebar `w-72 shrink-0 space-y-4`: Coverage by Criticality 4 bars (`Critical High Medium Low` with `w-full h-1.5`), by Type 8 rows Service/Application/Database/Server/LB/Network/Storage/Endpoint `CheckCircle2|AlertTriangle`, Insights 3 bullets, Promo `gradient blue p-4 rounded-xl` `Did you know?` + `Enable Proactive Scan`.

## Detail View — Event Detail (`/monitoring/events/:id`)

`-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + pinned header `bg-white border-b` nav row `← Events + Acknowledge/Resolve/Reopen status pill + ⋯ Copy ID/Copy link` + entity header `severity bar w-1 RISK_COLOR[severity]` + `type badge + source chip EventSourceChip + publicId mono` + `h1 text-xl font-bold title` + `status with ackedBy` + `firedAt|lastSeenAt severity badge + impacted CIs count`.

Body `flex gap-6 flex-1 min-h-0`: Left `flex-1 min-w-0 overflow-y-auto px-6 py-5 space-y-4`:

- Affected CIs Card: list `ciPublicId→name/type/environment/criticality` + Explore in CMDB `ExternalLink 12px → /cmdb/:id` + dependency graph `GitBranch 12px → /cmdb/graph?ci=`.
- Triggered by Rule Card: rulePublicId `font-mono 12px ois-primary → /monitoring/rules`, name, grid `type/severity/cooldown/fires 24h`, query `pre font-mono text-xs bg-ois-bg p-3 rounded-lg border`.
- Linked Incident Card: if `linkedIncidentId` → `Badge success + Link → /incidents/:id + title`; else empty `Plus 14px Create Incident from alert Modal` → `POST /incidents` with `linkedEventId`.
- Related Events Card: grouped by `correlationKey` max 5, THIS highlight `bg-ois-primary-pale border-ois-primary`, others `hover:bg-ois-surface-muted`.

Right `w-[280px] border-l bg-white p-4 space-y-4 overflow-y-auto`: Event Timeline (`AuditTimeline` filtered system+comments, filter chips `All/Status/Comments/System/CI/Comms`), Raw Payload collapsible `pre font-mono text-xs bg-slate-900 text-slate-100 p-4 rounded-lg max-h-96 overflow-auto` + `Copy JSON`, Tags `Badge neutral + Add tag inline input`.

Resolve modal `ResolveEventModal`: if `linkedIncidentId` two choices `Resolve event only` vs `Resolve event + open incident` (opens incident).

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View event | Card click | `event.read` | — |
| Ack/Resolve/Suppress | Detail top pill / `PATCH .../status` | `event.write` | open→ack, any→resolved |
| Create incident from event | Detail Linked Incident `Create Incident` | `incident.create` + `event.read` | any |
| Create rule | Rules `New rule` wizard | `rule.write` | — |
| Toggle rule | Switch in table | `rule.write` | — |
| Test rule | ⋯ Test → modal `Run all` | `rule.write` | — |
| Delete rule | ⋯ Delete confirm | `rule.write` | — |
| Create/edit/delete route | Routing list/editor + modals | `rule.write` | — |
| Test route | `Run dry-run` | `rule.read` | — |
| Suggest/bulk rule for gap | Coverage `Suggest a rule` | `rule.write` | gap exists |
| Ingest event | `POST /events/ingest` (external) | `event.write` | — |

## Filters / Sort / Search

- **Events:** search `title|message|publicId|affectedCI` (client), Status `FilterDropdown all|open|acknowledged|resolved|suppressed`, Severity `P1..P4 pills`, Source `8 sources`, Type `3 types`, Time `24h|7d|30d` via `EventStream` state (future query param). Sort default `severity asc P1→P4` then `firedAt desc` (eventsRouter sort `SEVERITY_ORDER` + `firedAt`).
- **Rules:** search `name|publicId|query`, Type 6, Severity 4, Enabled toggle. Sort `lastTriggeredAt desc` + `signalToNoise` asc.
- **Routes:** search `name|publicId`, enabled filter.
- **Coverage:** search CIs `name|publicId`, groupBy toggle.

## State Lifecycle

```
Event:    open → acknowledged → resolved | suppressed (terminal)
          ↑ ack via PATCH .../status { status:'acknowledged', actorId }
          ↑ resolve via { status:'resolved' }
Rule:     enabled ↔ disabled (toggle) | draft during wizard (not persisted)
Route:    enabled ↔ disabled (checkbox)
```

Suppressed skips routing; resolved stops escalation.

## Permissions

| Permission | Who | Actions |
|------------|-----|---------|
| `event.read` | SRE, Viewer | Overview, stream, detail, stats `GET /events*` |
| `event.write` | SRE, On-call | Ack/resolve/suppress, ingest `POST /events/ingest` |
| `rule.read` | Same as event.read | Rules/routes read |
| `rule.write` | Admin, Monitoring lead | CRUD rules/routes |

UI gate `useCan('monitoring','update')` pattern → read-only `italic` if not. Server `requirePermission` per endpoint (`monitoring.ts` + `events.ts`).

## Empty / Loading / Error

- **Empty stream:** `text-center py-12` + `Radio 32 ois-text-subtle` + `No events match filters` + `Clear filters`.
- **Empty rules:** `Shield 32` + `No rules yet — Create first rule` CTA.
- **Empty coverage gaps:** Hero hidden, matrix `No gaps ✓` green check.
- **Loading:** overview skeleton `pulse 4 cards`; stream `EventCard` shimmer 5; rules `DataTable` skeleton 5 rows.
- **Error:** top banner `bg-ois-danger-pale text-ois-danger` + `Retry` calls `refresh`.

## Phase 2 Deferred

- Coverage `ci_overlap/service_overlap/dependency` detection full (now hero counts only).
- Rule anomaly threshold auto-tune ML.
- Event `payload` schema per source (strict validation).
- Composite rule builder AND/OR sub-rules full.
- Notification channels verification (SMS/call) — currently Slack webhook only real.

## Design Preservation

Wajib pertahankan:

1. **Module Layout** `MonitoringLayout -m-6 calc(100vh-3.5rem)` + accent `w-1 transition-colors duration-500` + stats dots `w-1 h-1 rounded-full bg-ois-border-strong`.
2. **EventCard** left severity bar `w-1 rounded-l-lg RISK_COLOR[severity]` + group pattern.
3. **Rules S/N** color `≥80 green #12B76A ≥50 amber #F79009 else red #F04438` + sparkline `RuleSparkline 40x16`.
4. **Routing escalation** vertical timeline with `delayMinutes` + recipients chips.
5. **Coverage progress** `w-24 h-1.5 rounded-full` fill colored by coverage %.
6. **Status toggles** optimistic with revert on error pattern.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission |
|--------|----------|------------|
| List events | `GET /api/v1/events?status&severities&ruleId&page&pageSize` | `event.read` — sort P1→P4 + firedAt desc |
| Dashboard stats | `GET /api/v1/events/dashboard-stats` | `event.read` |
| Get event | `GET /api/v1/events/:publicId` | `event.read` |
| Set status | `PATCH /api/v1/events/:publicId/status` | `event.write` body `{status,note,actorId}` + `audit status_change` |
| Ingest | `POST /api/v1/events/ingest` | `event.write` body `type,severity,title,message,source,ruleId,affectedCIIds,correlationKey,payload,tags` → fanout `emitEventCreated` |
| List rules | `GET /api/v1/monitoring/rules?page&pageSize` | `rule.read` |
| Get rule | `GET /api/v1/monitoring/rules/:publicId` | `rule.read` |
| Create rule | `POST /api/v1/monitoring/rules` | `rule.write` body `createMonitoringRuleSchema` |
| Update rule | `PATCH /api/v1/monitoring/rules/:publicId` | `rule.write` |
| Delete rule | `DELETE /api/v1/monitoring/rules/:publicId` | `rule.write` 204 |
| List routes | `GET /api/v1/monitoring/routes` | `rule.read` |
| Create route | `POST /api/v1/monitoring/routes` | `rule.write` |
| Update route | `PATCH /api/v1/monitoring/routes/:publicId` | `rule.write` |
| Delete route | `DELETE /api/v1/monitoring/routes/:publicId` | `rule.write` 204 |

Scoped via `req.scoped.events|monitoring.*` + `audit` envelope `{result,scopeMode}`.

## Open Items

- [ ] Verify `GET /events/export` CSV endpoint (stream export spec in legacy docs — not in router).
- [ ] Bulk rule creation `POST /monitoring/rules/batch` for coverage gaps — define schema.
- [ ] Quiet hours timezone list completeness (`Intl.supportedValuesOf('timeZone')`?).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/monitoring.md` + `MonitoringLayout` + types + `monitoring.ts`/`events.ts` ke template features (Module Layout + 5 tabs + detail) | — |
