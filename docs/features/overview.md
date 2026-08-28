# Overview — Operational Pulse

Status: **Draft**
Route: `/` (landing)
Sidebar: Operations · Overview
Source: `src/routes/Dashboard.tsx` · `src/components/ui/KPICard.tsx` · `src/services` (incidentsService, changesService, inboxService, measurementService.execSummary) · `src/lib/format.ts`

---

## Intent

First screen after login — **operational pulse dalam 5 detik**. Jawab: ada P1? Ada SLA breach? Apa yang butuh action saya hari ini? Landing yang scan dari atas (KPI strip) ke bawah (feeds 2-col) tanpa scroll terlalu banyak.

## Current State (snapshot `src/routes/index.tsx:115`)

- `src/routes/index.tsx:115` path `/` → `<Dashboard />` `index:true` under `AppShell`.
- Component `src/routes/Dashboard.tsx` 600+ lines — composite view, bukan single resource page (beda dari list/detail lain).
- State: `timeRange 24h|7d|30d` (`DASHBOARD_RANGE_LABELS` + `RANGE_MS`), `refreshCount`, `now` interval 30s, `lastRefreshed`, `timeRangeOpen`.
- Data via `useResource` (8 parallel): `servicesService.list()`, `incidentsService.active()`, `incidentsService.list()` (all), `incidentsService.major()`, `usersService.list()`, `inboxService.items()`, `changesService.list()`, `improvementsService.list()`, `onCallService.schedules()`, `measurementService.execSummary()` — all `useResource(() => svc.list(), [])` with `data ?? []`.
- Derived: `filteredActiveIncidents` (by `timeRange` cutoff), `filteredInboxItems` similarly, `incidentTrend` (cur vs prior window delta), `mttrMinutes` avg `resolution.resolvedAt - createdAt` for resolved in window, `slaPct` `(resolved-breach)/resolved*100`, `pendingApprovals` (`submitted|in_review`), `pendingDueSoon` ≤24h, `sortedInbox` urgent first then newest, `upcomingChanges` 7d window grouped `groupedChanges` by `getDayLabel TODAY/TOMORROW/EEE MMM dd`, `majorIncidents` filtered not resolved/closed.
- UI: hero radial glow backdrop + header clock + timeRange dropdown `ChevronDown 12px` + refresh `RefreshCw 12px`, KPI grid 4 `KPICard`, major banner `border-2 border-red-300 bg-red-50 Siren animate-pulse`, main `grid lg:grid-cols-5 gap-6` — left `lg:col-span-3` Active Incidents feed (5, SeverityBadge + status dot + SLA AlertTriangle), right `lg:col-span-2` Action Required inbox preview (3, urgent border-l `data-urgent=true:border-l-ois-danger`), bottom `grid lg:grid-cols-2` — left Change Calendar 7d grouped, right Service Health grid (getStatusColor dot `bg-ois-success|warning|orange|danger`).
- Styling: `space-y-6 pb-8`, hero `radial glow`, cards `hover:shadow-md transition-shadow`, KPICard `h-full hover:shadow-md`, `CardHeader border-b bg-ois-surface-muted px-4 py-2.5` mono `text-[10.5px] tracking-[0.18em]`, severity chip etc.

**Working:**
- All 4 KPIs computed live: Active Incidents `(filteredActiveIncidents.length)` with trend low-is-better + subDetail `P1 · P2`, MTTR minutes avg with `Backend avg execSummary.mttrMinutes`, SLA % `trendBetter high`, Pending Approvals `pendingApprovals.length` subDetail `due in 24h`.
- Time range affects all derived (cutoff `now - RANGE_MS`), trend compares cur vs prior same size.
- Click KPI cards not yet click-through (todo).
- Active Incidents click → `/incidents/:publicId`, Inbox `View` → `item.sourceUrl` or `primaryAction.navigateTo`, Change Calendar per row click → `/changes/:publicId` (implied), Service Health → `/availability`.

**Stub / Partial:**
- KPI trend `trendBetter low` logic correct but not tested with real data volume >100.
- `incidentTrend` shows `+N vs prior` but icon not colored by good/bad until KPICard implements.
- Executive summary `measurementService.execSummary()` only used for MTTR backend avg, not full exec dashboard link.

**Missing:**
- Customizable KPI strip per role, drag-drop widget layout, pinned views personal layout (per `docs/pages/overview.md` §Open Gaps).

## Primary View

Layout: `space-y-6 pb-8` single scroll; no Module Layout header (unique — not via `MonitoringLayout` etc.). Hero region spans header + KPI row with radial glow.

### Hero header

```
Greeting "Good morning, {user.name}" + shift indicator (onCallService) | timeRange [Last 24h ▼] + Refresh (lastRefreshed formatRelative) + Now clock 30s tick
```

Dropdown `timeRangeOpen` toggles `DASHBOARD_RANGE_LABELS` 3 options `24h/7d/30d` (`w-32 absolute bg-white border rounded-lg shadow-ois-dropdown`).

### KPI Strip — 4 `KPICard`

`grid grid-cols-2 lg:grid-cols-4 gap-4` within hero backdrop `bg-ois-surface/60 backdrop-blur border rounded-xl p-4`:

| Card | Label | Value | Trend | SubDetail | Icon |
|------|-------|-------|-------|-----------|------|
| 1 | Active Incidents | `filteredActiveIncidents.length` | `incidentTrend.value` vs prior, `trendBetter low` (down is good) | `P1 · P2 counts` | `AlertCircle 20` |
| 2 | MTTR (`{timeRange}`) | `mttrMinutes==null ? — : {m}m` | — | `No resolved...` or `Backend avg: {execSummary.mttrMinutes}m` | `Clock 20` |
| 3 | SLA Compliance | `slaPct==null ? — : {pct}%` | — trend high | `No resolved...` or `{services.length} service(s)` | `ShieldCheck 20` |
| 4 | Pending Approvals | `pendingApprovals.length` | neutral | `None due in 24h` or `{pendingDueSoon} due in 24h` | `CheckCircle2 20` |

KPICard props: `label text-[11px] uppercase tracking-wider ois-text-muted`, `value text-4xl font-bold`, `trend` chip `text-xs font-semibold px-1.5 py-0.5 rounded` color `good→bg-ois-success-pale text-success else danger`, `subDetail text-[11px] uppercase`, `icon` top-right `ois-text-subtle`.

### Middle — 2-col `lg:grid-cols-5 gap-6`

**Left `lg:col-span-3`: Active Incidents**

- Header `CardHeader bg-ois-surface-muted px-4 py-2.5 border-b` mono `Active Incidents [10.5px tracking 0.18em]` + badge `neutral filteredActiveIncidents.length` + `View all →` link `text-xs font-bold ois-primary` → `/incidents`.
- Major banner if `majorIncidents.length>0` `border-2 border-red-300 bg-red-50 rounded-xl px-5 py-3 flex gap-4` — `Siren 20 danger animate-pulse` + `MAJOR INCIDENT IN PROGRESS 11px bold tracking-widest danger` + `publicId mono + title` + IC `users.find(incidentCommander) ?? —` + `Started formatRelative` + `Open war room →` button `bg-ois-danger text-white rounded-lg px-4 py-2 hover:bg-red-700` → `/incidents/major/:publicId`.
- Feed `divide-y`: per incident `p-4 hover:bg-ois-surface-muted cursor-pointer group` — `SeverityBadge mt-0.5` left + title row `publicId mono 12px subtle + title 14px semibold group-hover:ois-primary truncate`, meta row `Assigned to {assigneeName} · status capitalized · formatRelative(createdAt)` `text-xs muted font-medium` dots `w-1 h-1 rounded-full bg-ois-border-strong` + SLA breach `AlertTriangle 12 danger SLA` if `breached`.

**Right `lg:col-span-2`: Action Required (Inbox Preview)**

- Header same style `Action Required` mono + `Open Inbox →` → `/inbox`.
- Sub-bar `p-3 bg-ois-surface-muted/50 border-b` `urgent · normal` counts `text-xs font-medium muted`.
- Items `divide-y` 3 `sortedInbox.map` — container `p-4 border-l-2 border-l-transparent data-[urgent=true]:border-l-ois-danger` — header `Urgent 10px bold tracking-tight ois-danger` if urgent + `title 13px semibold line-clamp-2 hover:text-ois-primary` link `sourceUrl`, meta `sourcePublicId · formatRelative(receivedAt) mono 12px subtle`, action `Button size xs primary` `primaryAction.label` → `navigate(navigateTo ?? sourceUrl)` else `View`.

### Bottom — 2-col `lg:grid-cols-2 gap-6`

**Change Calendar — Next 7 days**

Header `Change Calendar — Next 7 days mono 10.5px` + `Calendar →` → `/changes/calendar`.

Content `p-4 space-y-6` grouped `Object.entries(groupedChanges).sort()` — per day label `text-[11px] font-semibold tracking-widest ois-text-subtle` `TODAY|TOMORROW|EEE MMM dd` — per change `flex gap-3 group` dot `w-3 h-3 rounded-full mt-1` color `implementing→ring-4 ring-ois-primary/20 bg-ois-primary else standard→bg-ois-success emergency→danger normal→warning` — text `time HH:mm — publicId text-xs bold` + title `text-xs font-medium hover:ois-primary` + `Badge neutral text-[10px] type` + conflicts `AlertTriangle 12 warning "N conflict(s) detected"`.

**Service Health (placeholder/legacy)**

Grid snapshot per critical service `getStatusColor(service.healthStatus)` dot `operational success degraded warning partial_outage orange major_outage danger`; click → `/availability`.

## Actions

| Action | Trigger | Permission | Notes |
|--------|---------|------------|-------|
| Change time range | Dropdown `24h/7d/30d` | — | Affects all derived, no URL persist |
| Refresh | `Refresh` button `RefreshCw 12px` | — | bump `refreshCount` + `lastRefreshed=now` (no refetch until useResource re-evaluates) |
| View all incidents | `View all →` | `incident.read` | → `/incidents` |
| Open incident | Click feed row | `incident.read` | → `/incidents/:publicId` |
| Open war room | Banner CTA `Open war room →` | `incident.read` | → `/incidents/major/:publicId` |
| Open inbox | `Open Inbox →` | inbox read | → `/inbox` |
| Act on inbox | `Button primaryAction.label` or `View` | varies | → `item.sourceUrl` |
| View change | Click calendar entry | `change.read` | → `/changes/:publicId` (future) |
| View service health | Click health grid | `availability.read` | → `/availability` |

## Filters / Sort / Search

- No global search — filters are per-feed derived in-memory.
- Time range global 24h/7d/30d via `RANGE_MS` (cutoff `now - rangeMs`); trend compares cur vs prior same length.
- Inbox sorted `urgent first` then `receivedAt desc` sliced 3.
- Incidents sliced 5 after filter; changes grouped by day label; no pagination.

## State Lifecycle

Read-only composite — no CRUD, no status machine. Local state only: `timeRange`, `refreshCount`, `now` tick. Data is live via `useResource` re-fetch on mount; no polling interval besides 30s clock tick for `formatRelative`. Future realtime: socket `incident:*` & `event:*` → auto-refresh KPI (spec in `docs/pages/overview.md` but not yet wired in `Dashboard.tsx`).

## Permissions

All authenticated users can view. KPI that user lacks `incident.read` etc. currently shows computed count anyway (no `filterReadable` gating in Dashboard — unlike `IncidentQueue`). Should gracefully hide/empty if `user` lacks perm — currently gap. No write actions gated besides Inbox primaryAction which delegates to its own permission.

## Empty / Loading / Error

- **Empty active incidents:** feed shows zero rows; card body empty `divide-y` with no items (should show `No active incidents ✓` — not yet implemented, gap).
- **Empty inbox:** similarly empty list (should show `All caught up ✓`).
- **Loading:** `useResource` returns `undefined` → `data ?? []` → feeds show zero until fetch completes (skeleton not present — gap vs other pages which show shimmer).
- **Error:** no banner — failure silently empty (gap — should show `Failed to load` + Retry).
- **No service health:** grid empty (gap).

## Phase 2 Deferred

- Customizable KPI per role / drag-drop widget arrangement / pinned views (per legacy docs).
- Click-through KPI cards to filtered queue (e.g. `Active Incidents` → `/incidents?status=active`).
- AI summary "Today's brief" (planned AI Workspace).
- Time range URL persist `?range=24h` for shareable link.
- Loading skeleton + error banner (parity with other pages).

## Design Preservation

Wajib pertahankan:

1. **Hero radial glow** backdrop spans header + KPI row (not per-card) — don't break into separate sections.
2. **KPICard** `Card h-full hover:shadow-md gap-1 p-6` + `label 11px uppercase tracking-wider muted` + `value 4xl bold` + trend chip `px-1.5 py-0.5 rounded text-xs font-semibold` good `success-pale` vs bad `danger-pale`.
3. **Major banner** `border-2 border-red-300 bg-red-50 Siren animate-pulse` — high visibility, don't downgrade to amber.
4. **Active Incidents feed** `SeverityBadge + publicId mono 12px subtle + title 14px semibold group-hover:ois-primary` + meta dots `w-1 h-1 bg-ois-border-strong`.
5. **Inbox border-l** `data-urgent=true:border-l-ois-danger` 2px — urgent cue.
6. **Change calendar dot** `w-3 h-3 rounded-full` with ring for implementing `ring-4 ring-ois-primary/20 bg-ois-primary`.
7. **Header mono** `font-mono text-[10.5px] tracking-[0.18em] uppercase muted` for section labels — consistent with other modules.

## API Touchpoints

Composite via `src/services` (all `GET` with pagination optional):

| Data | Call | Endpoint | Notes |
|------|------|----------|-------|
| Services | `servicesService.list()` | `GET /api/v1/services` | for health grid + SLA denominator |
| Active incidents | `incidentsService.active()` | `GET /api/v1/incidents?active=true` | filtered 24h/7d/30d client-side |
| All incidents | `incidentsService.list()` | `GET /api/v1/incidents` | for trend + MTTR + SLA |
| Major | `incidentsService.major()` | `GET /api/v1/incidents?major=true` | banner |
| Inbox | `inboxService.items()` | `GET /api/v1/inbox/items` or platform inbox | filtered urgent/normal |
| Changes | `changesService.list()` | `GET /api/v1/changes` | upcoming 7d |
| Improvements | `improvementsService.list()` | — | not yet displayed (future) |
| Users | `usersService.list()` | — | assignee/IC name resolution |
| Schedules | `onCallService.schedules()` | — | shift indicator (future) |
| Exec summary | `measurementService.execSummary()` | — | MTTR backend avg |

All `event.read`/`incident.read` scoped; no write.

## Open Items

- [ ] Gate Dashboard KPIs by `filterReadable` (currently no RBAC filtering).
- [ ] Add skeleton + error states (parity with queue pages).
- [ ] Persist `timeRange` to `?range=` URL.
- [ ] Wire realtime `socket incident:*` → refresh feeds (per `docs/pages/overview.md` spec).
- [ ] KPI click-through to filtered lists.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/overview.md` + `Dashboard.tsx` (hero+KPI 4, major banner, feeds 2-col, calendar 7d) ke template features | — |
