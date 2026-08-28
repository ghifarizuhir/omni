# Status Page — Service Communication

Status: **Draft**
Route: `/status`
Sidebar: Service Health · Status Page (breadcrumb `Platform · Service Status`, icon `CircleDot 18`)
Source: `src/routes/platform/StatusPage.tsx` · `src/components/status/StatusHero.tsx`, `ServiceStatusRow.tsx`, `UptimeHistoryBar.tsx`, `StatusIncidentCard.tsx`, `StatusUpdateEntry.tsx`, `PastIncidentSummary.tsx` · `server/routes/platform.ts:29,267-272` · `src/types/platform.ts:188-223` · `src/lib/constants.ts:579-585` · `src/services/platformServices.ts:126-129` · `src/index.css` (ois tokens)

---

## Intent

Satu layar kebenaran untuk **"apa yang down, sejak kapan, dan kapan update terakhir"** — dibaca user internal (fase 1) dan diproyeksikan ke publik (fase 2). Menjawab dalam 5 detik: all green atau ada disruption, service mana terdampak, incident aktif apa, dan histori 90 hari per service.

ITIL 4: Service Communication / Availability visibility — bukan incident tracker sendiri, melainkan **wrapper komunikasi di atas Incident ITSM**. Data selalu sinkron dari sumber kebenaran modul Incident/Outage/CMDB.

---

## Current State (snapshot `src/routes/index.tsx:86,225`)

- `src/routes/index.tsx:86` → `import StatusPage from './platform/StatusPage'`
- `src/routes/index.tsx:225` → `{ path: 'status', element: <StatusPage /> }` — flat route under `RequireAuth > RequirePasswordChange > AppShell`, tidak ada sub-route, tidak ada nested layout (beda dari Monitoring/Availability yang pakai Module Layout). Guard global `RequireAuth` (`server/app.ts:126`) + tenant `withScopedDb` wajib ada sebelum `req.scoped`.
- Component: `src/routes/platform/StatusPage.tsx:15` `export default function StatusPage()` — 126 lines, hook `useResource` ×2 (`statusPageService.entries()`, `statusPageService.incidents()`), derive `entries` sort `displayOrder`, `activeIncidents = status !== 'resolved'`, `overall = deriveOverallStatus(entries)`, `affectedCount = status !== operational && !== maintenance`, `mostRecent` sort `lastUpdatedAt desc` untuk header meta.
- Status hero logic: `src/components/status/StatusHero.tsx:11-22` `deriveOverallStatus(entries)` — first-match hierarchy `major_outage → partial_outage/degraded → maintenance → operational` dengan palette `{label, accentColor, textColor, bg, borderColor}`.
- Components: `ServiceStatusRow` (name+dot+meta `statusPageStatusMeta`+UptimeHistoryBar+timestamp), `UptimeHistoryBar` (90 day-blocks + seeded color + tooltip + `xx.xx%`), `StatusIncidentCard` (Megaphone + status pill `investigating|identified|monitoring|resolved` + sorted updates newest first + `StatusUpdateEntry`), `PastIncidentSummary` (hardcoded 3 mocks + `View all past incidents` button).
- API: `server/routes/platform.ts:29` `platformRouter.use('/status-page', requirePermission('statuspage.read'))` + `267-272` `GET /status-page/entries` + `GET /status-page/incidents` via `listByKind(tenantId, 'status-page-entry'|'status-page-incident')` — tenant-scoped Document store.
- Types: `src/types/platform.ts:188-223` `StatusPageEntryStatus 5` `operational|degraded|partial_outage|major_outage|maintenance` + `StatusPageEntry` (id, serviceId/serviceName/serviceDescription, status, statusMessage, linkedOutagePublicId, linkedIncidentPublicId, lastUpdatedAt, lastUpdatedByName, uptime90d number, displayOrder) + `StatusPageIncident` (id, title, status 4 `investigating→identified→monitoring→resolved`, affectedServiceIds[], updates[] {id,timestamp,body,authorName}, startedAt, resolvedAt?). Also `common.ts:63-68` `ServiceHealthStatus` re-export aligned.
- Constants: `src/lib/constants.ts:579-585` `statusPageStatusMeta[5]` `{label,color,bg,icon,dot}` + `StatusHero` palette (accent/text/bg/border per overall). See Design Preservation for exact hex.
- Service layer: `src/services/platformServices.ts:126-129` `statusPageService.entries()` + `incidents()` via `apiFetch('/status-page/...')`.
- Tokens: `src/index.css:7-58` OIS design system — `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-primary #1F4FD4`, `ois-primary-pale #EEF2FF`, semantic `ois-success #12B76A #ECFDF3`, `ois-warning #F79009 #FFFAEB`, `ois-danger #F04438 #FEF3F2`, `ois-info #0BA5EC #F0F9FF`, radius `ois-card 8px`, shadow `ois-card`.
- Sidebar: `src/components/layout/Sidebar.tsx:46,270` `'/status' → CircleDot 18` under section `Service Health` (bukan Foundation), but header inside page renders breadcrumb `Platform · Service Status` (`StatusPage.tsx:37-40`).

**Working:**
- Full read path wired: DB Document `kind=status-page-entry|status-page-incident` → `GET /api/v1/status-page/*` (require `statuspage.read`) → `statusPageService` → `useResource` → sort/filter → render. Verified `AUDIT-MOCK-DATA.md:111` marks `WIRED`.
- Overall banner derives correctly from entries (no aggregation bug — first-match order documented).
- Service rows render with status dot+badge, description/message, uptime bar 90 blocks with seeded pseudo-random distribution gated by `uptime90d` thresholds, percentage `toFixed(2)%`, updated timestamp `en-GB UTC` + author.
- Active incidents filtered `status !== 'resolved'` and sorted updates newest first; incident card status pills with dot+bg per `incidentStatusMeta`.
- Page layout `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b sticky shrink-0` + accent left `w-1 transition-colors duration-500` + body `flex-1 overflow-y-auto` + centered `mx-auto max-w-3xl px-6 py-6 space-y-8` (768px, matches `docs/pages/status-page.md` §3).
- Past incidents section renders (mocked) with separate card per past incident; `View all past incidents` CTA present.

**Stub / Partial:**
- Auto-refresh indicator `Auto-refreshing RotateCcw 11px bg-ois-primary-pale` is static pill — timestamp hard-coded `2026-05-08 08:52 UTC` (`StatusPage.tsx:43`) not tied to `lastUpdatedAt`; no `setInterval` poll, no `tenant:{tenantId}` socket subscribe (see `docs/audits/realtime-coverage.md:127`).
- Past incidents is hard-coded `PastIncidentSummary.tsx:3-25` (3 items May 7/5/2) — not fetched, not linked to resolved `StatusPageIncident` or `Outage`.
- No write path: tidak ada `POST/PATCH /status-page/*` — management lewat incident comms `audience=customer` (planned `docs/pages/status-page.md:7,14`), belum ada UI `Manual announcement` atau `status override`.
- Uptime bar color is illustrative (seeded PRNG per `serviceId+dayIndex`) — not real daily health (`Availability daily-health` or `Outage` aggregated). Tooltip shows `Day N` only, no date/status.
- No search/filter/sort UI besides `displayOrder` sort. No per-service incident linking navigation (`linkedIncidentPublicId` unused in row).

**Missing:**
- Public/anonymous view (prod requirement `/status/public` without auth) — saat ini all behind `RequireAuth` + `statuspage.read`.
- Subscriber/notification mechanism (email/RSS/webhook) + subscription management.
- i18n + timezone preference (always `en-GB UTC`).
- Pagination/export for past incidents archive.

## Primary View — `/status`

Layout: **single scroll, centered 768px, no Module Layout header** (unique — status page punya header sendiri).

### Chrome (`StatusPage.tsx:30-78`)

```
-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)
├─ Header bg-ois-surface border-b border-ois-border shrink-0 z-30
│  ├─ Nav row flex justify-between px-6 py-2 border-b border-ois-border
│  │  ├─ breadcrumb text-xs ois-text-subtle: "Platform · Service Status"
│  │  └─ right: static timestamp text-xs ois-text-subtle + pill "Auto-refreshing"
│  │            bg-ois-primary-pale text-ois-primary rounded-full px-2.5 py-1 gap-1.5 RotateCcw 11
│  └─ Status header flex items-stretch
│     ├─ accent w-1 shrink-0 transition-colors duration-500 style backgroundColor overall.accentColor
│     └─ flex-1 px-6 py-4
│        ├─ headline flex items-center gap-2.5 mb-1: STATUS_ICON[overall.label] 20px + h1 text-xl font-bold color overall.textColor
│        └─ meta flex gap-3 text-xs ois-text-muted: "{N} service(s) affected ·" dot bg-ois-border-strong + "Last updated {HH:mm UTC} by {name}"
└─ Body flex-1 overflow-y-auto
   └─ mx-auto max-w-3xl px-6 py-6 space-y-8
      ├─ Service Status section
      ├─ Active Incidents section
      └─ Past Incidents section
```

**Overall derivation** (`StatusHero.tsx:11-22` — same logic duplicated in `StatusPage.tsx:21` for header):
```ts
major_outage → {label:'Major Outage', accent:'#B42318', text:'#B42318', bg:'#FEF3F2', border:'#FECDCA'}
else partial_outage||degraded → {label:'Partial Service Disruption', accent:'#DC6803', text:'#B54708', bg:'#FFFAEB', border:'#FEDF89'}
else maintenance → {label:'Scheduled Maintenance', accent:'#0BA5EC', text:'#026AA2', bg:'#F0F9FF', border:'#B9E6FE'}
else → {label:'All Systems Operational', accent:'#12B76A', text:'#027A48', bg:'#ECFDF3', border:'#A9EFC5'}
```
Icon mapping `STATUS_ICON` (`StatusPage.tsx:8-13`): `All Systems Operational → CheckCircle2 20`, `Partial Service Disruption → AlertTriangle 20`, `Major Outage → AlertOctagon 20`, `Scheduled Maintenance → Wrench 20` — color via `style color overall.accentColor`.

Header `lastUpdatedAt/lastUpdatedByName` derived from `mostRecent` = entries sorted `lastUpdatedAt desc` first; fallback `—` / `System` (`:24-27`). Display time `toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC', timeZoneName:'short'})`.

### Service Status section (`StatusPage.tsx:85-94`)

- Label `text-[11px] font-semibold uppercase tracking-widest ois-text-subtle` "Service Status".
- Card `rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card divide-y divide-ois-border` — per entry `ServiceStatusRow`.

**ServiceStatusRow** (`ServiceStatusRow.tsx:10-64`):
- Container `px-5 py-4`.
- Top row `flex justify-between gap-4`: left `min-w-0 flex-1` → icon dot `h-2 w-2 rounded-full mt-0.5` `backgroundColor meta.dot` + `serviceName text-sm font-semibold ois-text truncate`; optional `serviceDescription text-xs ois-text-muted mt-0.5 pl-[18px]`; optional `statusMessage text-xs font-medium pl-[18px]` `color meta.color`. Right badge `shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium` `color meta.color bg meta.bg` label `meta.label` from `statusPageStatusMeta`.
- Uptime block `mt-3 pl-[18px]`: row labels `90 days ago / Today` `flex justify-between text-xs ois-text-subtle`; bar `<UptimeHistoryBar uptime90d serviceId>`; timestamp `text-right text-xs ois-text-subtle mt-1` `Updated {MMM dd, HH:mm UTC · Name}` via `toLocaleString('en-GB', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'})`.

**UptimeHistoryBar** (`UptimeHistoryBar.tsx:1-69`):
- `flex items-center gap-2` → `flex flex-1 gap-px` 90 day blocks `Array.from({length:90})` → per day `div h-6 flex-1 rounded-sm minWidth 2 cursor-default hover:opacity-80` bg seeded color; right `%` `w-14 text-right tabular-nums text-xs font-medium ois-text-muted` `uptime90d.toFixed(2)%`.
- `seededColor(serviceId, dayIndex, uptime)` PRNG: `seed = sum chr codes serviceId`, `val = (seed*31 + dayIndex*17)%100`. Thresholds:
  - `>99.9%` → `val<2 → amber #F79009` else green `#12B76A` (~2% amber)
  - `>99.5%` → `val<4 → amber` else green (~4%)
  - `>99.0%` → `val<8 amber`, `<10 red #F04438`, else green
  - `<99%` → `val<15 amber`, `<20 red`, else green
- Tooltip `useState<number|null>` `onMouseEnter/Leave` → absolute `bottom-full left-1/2 -translate-x-1/2 bg-ois-text text-white text-xs rounded-md px-2 py-1 shadow-md` `Day {90-i}`.

### Active Incidents section (`StatusPage.tsx:96-112`)

- Label `text-[11px] font-semibold uppercase tracking-widest ois-text-subtle` "Active Incidents ({N})".
- Empty `rounded-ois-card border bg-ois-surface px-6 py-5 text-center text-sm ois-text-muted shadow-ois-card` "No active incidents at this time."
- Else `space-y-4` per `StatusIncidentCard`.

**StatusIncidentCard** (`StatusIncidentCard.tsx:1-65`):
- Card `rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card overflow-hidden`.
- Header `flex justify-between gap-3 px-5 py-4`: left `flex gap-2.5 min-w-0` → `Megaphone 15 ois-text-muted mt-0.5` + `h3 text-sm font-semibold ois-text truncate title` + `text-xs ois-text-muted Started {MMM dd, HH:mm UTC}`. Right pill `flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium` `color meta.color bg meta.bg` with dot `w-1.5 h-1.5 rounded-full bg meta.dot` + label (`investigating #B54708 #FFFAEB · #F79009 | identified #026AA2 #F0F9FF · #0BA5EC | monitoring #027A48 #ECFDF3 · #12B76A | resolved #344054 #F2F4F7 · #98A2B3`).
- Updates timeline `border-t border-ois-border bg-ois-bg/40 px-5 py-4 space-y-4` if `updates.length>0` — sorted `timestamp desc` newest first, per `StatusUpdateEntry`.

**StatusUpdateEntry** (`StatusUpdateEntry.tsx:12-31`):
- `relative pl-5` with dot `absolute left-0 top-1.5 h-2 w-2 rounded-full bg-ois-border-strong`.
- Header `flex gap-2` `authorName text-xs font-semibold ois-text` + `timeStr text-xs ois-text-subtle` (`toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit',timeZone:'UTC'}) + ' UTC'`).
- Body `mt-0.5 text-sm ois-text-muted leading-relaxed`.

### Past Incidents section (`StatusPage.tsx:114-120`)

- Label same style "Past Incidents".
- `<PastIncidentSummary />` (stub): `rounded-ois-card border divide-y` 3 rows `px-5 py-4 flex justify-between gap-4 hover:bg-ois-surface-muted` — left `w-10 text-xs ois-text-subtle` date + `title text-sm font-medium ois-text` + `serviceName text-xs ois-text-muted`; right `Resolved badge CheckCircle2 10 bg-ois-success-pale text-ois-success rounded-full px-2.5 py-0.5` + `duration text-xs ois-text-subtle tabular-nums`. Footer centered button `View all past incidents ArrowRight 13 text-sm font-medium ois-primary hover:underline` (no nav handler yet).

## Actions

| Action | Trigger | Permission | State required | Notes |
|--------|---------|------------|----------------|-------|
| View status page | Navigate `/status` | `statuspage.read` | auth | `RequireAuth` + `platformRouter.use('/status-page', requirePermission('statuspage.read'))`; scope violation 403 |
| View service row | Scroll list | `statuspage.read` | — | link to detail not yet — `linkedIncidentPublicId` unused |
| View incident updates | Read card timeline | `statuspage.read` | active (`resolved` filtered out) | `startedAt` + sorted updates |
| Post update / change status | — | (Belum ada) | — | Saat ini lewat incident comms `audience=customer` → planned auto-update entry (see Downstream) |
| Filter / Search / Export | — | — | — | Tidak ada Phase 1 |

Phase 1 **read-only**. Tidak ada create/update/delete di `/status-page/*` — hanya 2 GET. Write akan masuk via incident module atau future `POST /status-page/incidents` + manual maintenance window.

## Filters / Sort / Search

- **Sort entries:** client `[...entries].sort((a,b)=>a.displayOrder - b.displayOrder)` (`StatusPage.tsx:18`) — canonical order.
- **Active filter:** `incidents.filter(i=>i.status !== 'resolved')` (`:19`) — `resolved` considered past.
- **Most recent:** entries sort `lastUpdatedAt desc` for header timestamp.
- **Uptime sort:** tidak ada. Search/filter by service/status/sort by uptime belum ada (future).
- **URL persist:** tidak ada `?service=&status=` query. No persistence.

## Detail View

Tidak ada detail page terpisah. Status Page adalah **single view** (beda dari CMDB/Incident yang punya `/cmdb/:ciId`). Jika future butuh detail, rujuk `_shared/entity-detail-page.md` — tapi untuk status cukup deep-dive ke:
- Service detail via `linkedIncidentPublicId` / `linkedOutagePublicId` → `/incidents/:id` / `/availability/outages`
- Incident card expansion (sudah per-card updates, tidak perlu dedicated route)
- Past incident archive `View all past incidents` → future `/status/history` (Phase 2).

Delegate ke `_shared/entity-detail-page.md` saat butuh pas.

## State Lifecycle

```
Service entry (StatusPageEntryStatus):
  operational ↔ degraded ↔ partial_outage ↔ major_outage ↔ maintenance
  (independent of CMDB CIStatus — health vs lifecycle)

Incident (StatusPageIncident.status):
  investigating → identified → monitoring → resolved (terminal)
  filtered: active = !== resolved
```

**Overall banner first-match** (priority order, not majority):
```
major_outage present → "Major Outage" (#B42318)
else partial_outage|degraded → "Partial Service Disruption" (#DC6803/#B54708)
else maintenance → "Scheduled Maintenance" (#0BA5EC/#026AA2)
else → "All Systems Operational" (#12B76A/#027A48)
```
Affected count excludes `maintenance` (planned) — hanya `!operational && !maintenance` (`:21`).

Per-status meta exact (`src/lib/constants.ts:579-585`):
- `operational: {label:'Operational', color:'#067647', bg:'#ECFDF3', icon:'CheckCircle2', dot:'#12B76A'}`
- `degraded: {label:'Degraded', color:'#DC6803', bg:'#FFFAEB', icon:'AlertTriangle', dot:'#F79009'}`
- `partial_outage: {label:'Partial outage', color:'#B42318', bg:'#FEF3F2', icon:'AlertOctagon', dot:'#F04438'}`
- `major_outage: {label:'Major outage', color:'#B42318', bg:'#FEF3F2', icon:'XOctagon', dot:'#F04438'}`
- `maintenance: {label:'Maintenance', color:'#0BA5EC', bg:'#F0F9FF', icon:'Wrench', dot:'#0BA5EC'}`

Hero palette diverges slightly for overall (accent `#B42318|#DC6803|#0BA5EC|#12B76A` etc. with separate `textColor` for contrast).

## Permissions (action-level)

| Permission | Who | Actions | Enforcement |
|------------|-----|---------|-------------|
| `statuspage.read` | All authenticated dengan permission (assigned via RBAC role) | GET `/status-page/entries`, GET `/status-page/incidents`, view `/status` | `server/routes/platform.ts:29` `platformRouter.use('/status-page', requirePermission('statuspage.read'))` + `GET 267/270` via `listByKind` tenant-scoped; global `RequireAuth` ensures `req.tenantId/req.permissions` exists (`server/app.ts:126` `withScopedDb` always-on) |
| Write | (Belum ada) | Posting update / override service status / create StatusPageIncident | Saat ini lewat incident comms `POST /incidents/:publicId/comms {audience:customer}` — planned auto-sync ke status-page-entry; no `statuspage.write` yet |

No tier `cmdb.write` style split. Public view akan butuh route tanpa `requirePermission` (Phase 2).

ScopeViolation → 403 `{error:'scope_violation'}` via `server/scope/errors.ts:9`.

## Empty / Loading / Error

- **Empty entries:** `ServiceStatusRow` maps over `entries` — if 0, section card renders empty `divide-y` with no rows (no explicit empty state; gap — should show "No services configured" `Server 32 ois-text-subtle` + CTA).
- **Empty active incidents:** `rounded-ois-card ... text-center` "No active incidents at this time." (`StatusPage.tsx:101-103`) — takes `shadow-ois-card`.
- **Empty past incidents:** never empty (mock 3 rows) — Phase 2 real data will need "No past incidents in 90d".
- **Empty uptime?** Bar still renders 90 blocks with seeded colors; `%` shows even if 0; no branch for `uptime90d undefined`.
- **Loading:** `useResource(() => statusPageService.entries(), [])` → `data null` → fallback `?? []` → renders zero entries/incidents until fetch resolves. No skeleton/shimmer (parity gap vs `src/routes/monitoring/` which has skeleton). Should add `isLoading` shimmer 5 rows (`ois-shimmer`).
- **Error:** `useResource` error → fallback `?? []` silent empty; tidak ada banner `bg-ois-danger-pale text-ois-danger` + Retry (gap — spec asks same as Incidents `Retry → refresh`).
- **404:** not applicable (page always exists); individual `serviceId` miss → row not rendered.

## Phase 2 Deferred

- Public view `/status/public` tanpa auth + CORS/scrape-safe (legacy `docs/pages/status-page.md:15` gap).
- Subscriber management (email/RSS/webhook) + notification dispatch on incident create/update/resolve — `statuspage.subscribe` + `platformService` endpoints.
- Real auto-refresh / realtime: `setInterval` poll or `Socket.IO tenant:{tenantId} status-page:*` (now static `Auto-refreshing` pill).
- Past incidents real data: resolved `StatusPageIncident` + `Outage` join with archive pagination, replace hardcoded `pastIncidents` 3 (`PastIncidentSummary.tsx:3-25`), wire `View all past incidents → /status/history`.
- Manual announcement UI & service status override (`POST /status-page/incidents`, `PATCH /status-page/entries/:id` `statusMessage|status`) — saat ini hanya via incident `comms audience=customer`.
- Replace seeded UptimeHistoryBar with real daily health (`DailyServiceHealth` / `UptimeCalendarHeatmap` style) + real tooltip per date.
- Search/filter/sort (service name/status/uptime, pill `FilterDropdown`), URL persist `?view=&status=`.
- i18n + timezone preference (follow `user.timezone` vs hard `UTC`).
- Error/loading parity: skeleton + error banner + Retry.

## Design Preservation

Wajib pertahankan saat refactor — sumber kebenaran `src/routes/platform/StatusPage.tsx` + `src/components/status/*` + `src/index.css` + `src/lib/constants.ts:579-585`:

1. **Page shell** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + `flex-1 overflow-y-auto` + `mx-auto max-w-3xl px-6 py-6 space-y-8` (768px centered). Jangan ganti ke Module Layout / DataTable.
2. **Header chrome** `bg-ois-surface border-b border-ois-border shrink-0 z-30` + nav row `px-6 py-2 border-b text-xs ois-text-subtle` + pill `bg-ois-primary-pale text-ois-primary rounded-full gap-1.5 RotateCcw 11`. Breadcrumb keep `Platform · Service Status` (even though sidebar section is Service Health).
3. **Accent strip** `w-1 shrink-0 transition-colors duration-500` `backgroundColor overall.accentColor` + icon `STATUS_ICON[overall.label]` 20px color `overall.accentColor` + headline `text-xl font-bold color overall.textColor` + meta `affectedCount? "N service(s) affected" bold + dot bg-ois-border-strong + lastUpdated`.
4. **ServiceStatusRow** `px-5 py-4` + dot `h-2 w-2 rounded-full mt-0.5 bg meta.dot` + name `text-sm font-semibold ois-text` + description `text-xs ois-text-muted pl-[18px]` + statusMessage `text-xs font-medium color meta.color pl-[18px]` + badge `rounded-full px-2.5 py-0.5 text-xs font-medium color meta.color bg meta.bg label meta.label`. Grid uptime labels `90 days ago / Today` `text-xs ois-text-subtle justify-between`.
5. **UptimeHistoryBar** 90 blocks `h-6 flex-1 rounded-sm minWidth 2 gap-px hover:opacity-80` + deterministic `seededColor` thresholds + tooltip `bg-ois-text text-white rounded-md px-2 py-1 shadow-md Day N` + percent `w-14 tabular-nums ois-text-muted` `toFixed(2)%`.
6. **StatusIncidentCard** `rounded-ois-card border bg-ois-surface shadow-ois-card overflow-hidden` + header `px-5 py-4 flex justify-between Megaphone 15 muted` + title `text-sm font-semibold` + started `text-xs ois-text-muted` + pill `gap-1.5 dot w-1.5 rounded-full` colors `investigating #B54708 #FFFAEB #F79009 | identified #026AA2 #F0F9FF #0BA5EC | monitoring #027A48 #ECFDF3 #12B76A | resolved #344054 #F2F4F7 #98A2B3`. Updates `border-t bg-ois-bg/40 px-5 py-4 space-y-4` sorted newest first.
7. **StatusUpdateEntry** `relative pl-5` dot `absolute left-0 top-1.5 h-2 w-2 bg-ois-border-strong` + author `text-xs font-semibold ois-text` + time `text-xs ois-text-subtle HH:mm UTC` + body `text-sm ois-text-muted leading-relaxed`.
8. **PastIncidentSummary** row `px-5 py-4 flex justify-between hover:bg-ois-surface-muted` + date `w-10 text-xs ois-text-subtle` + title `text-sm font-medium ois-text` + service `text-xs ois-text-muted` + `Resolved CheckCircle2 10 bg-ois-success-pale text-ois-success rounded-full` + duration `tabular-nums text-xs ois-text-subtle`. Footer `View all past incidents ArrowRight 13 ois-primary` centered `mt-4`.
9. **Tokens** keep `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-primary #1F4FD4`, success `#12B76A/#ECFDF3`, warning `#F79009/#FFFAEB`, danger `#F04438/#FEF3F2`, info `#0BA5EC/#F0F9FF`, plus status exact hex above. Jangan map ke generic tanpa alias.
10. **Shapes** `rounded-ois-card 8px`, `shadow-ois-card`, `rounded-full` pills, `divide-y divide-ois-border`. Section label `text-[11px] font-semibold uppercase tracking-widest ois-text-subtle`.
11. **Iconography** `CheckCircle2 / AlertTriangle / AlertOctagon / Wrench` 20 for overall, `Megaphone 15` for incident, `CheckCircle2 10` for resolved, `ArrowRight 13`, `RotateCcw 11`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `statusPageService.entries()` | `GET /api/v1/status-page/entries` | `statuspage.read` (platformRouter:29) | `listByKind<StatusPageEntry>(tenantId,'status-page-entry')` `platform.ts:267-269` tenant-scoped |
| `statusPageService.incidents()` | `GET /api/v1/status-page/incidents` | `statuspage.read` | `listByKind<StatusPageIncident>(tenantId,'status-page-incident')` `:270-272` |

No `POST/PATCH/DELETE` yet — management via `POST /api/v1/incidents/:publicId/comms {body,audience:customer,channels}` (planned auto-update) + future admin `POST /status-page/incidents` + `PATCH /status-page/entries/:id`.

Via `src/services/platformServices.ts:126-129` `apiFetch('/status-page/...')` + `src/services/core.ts` `apiFetch` + `useResource` (interval not set). Socket: none yet — future `tenant:{tenantId}` or `status-page` channel (per `docs/audits/realtime-coverage.md:127`).

 > Tidak ada endpoint public/anonymous (selalu `RequireAuth` + `withScopedDb` tenant).

## Open Items

- [ ] Wire real auto-refresh: `useResource` poll or `Socket.IO tenant:{tenantId} status-page:*` → invalidate `entries/incidents`.
- [ ] Replace hard-coded header time `2026-05-08 08:52 UTC` (`StatusPage.tsx:43`) with `lastUpdatedAt` formatter.
- [ ] Swap stub `pastIncidents` 3 (mock May 7/5/2) → real `incidents.filter status===resolved` + `Outage endedAt` archive, paginated.
- [ ] Wire `linkedIncidentPublicId/linkedOutagePublicId` to links `→ /incidents/:id` `→ /availability/outages`.
- [ ] Decide canonical incident lifecycle: `src/types/platform.ts:212` `investigating|identified|monitoring|resolved` vs server `StatusPageIncident` seed fixtures mismatched? Audit fixtures.
- [ ] Loading skeleton + error banner (parity with availability/incidents) instead of silent `?? []` empty.
- [ ] Empty entries state CTA when `entries.length===0`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/status-page.md` + `StatusPage.tsx:15,30-126` + `StatusHero:11-22` + `ServiceStatusRow` + `UptimeHistoryBar` seeded + `StatusIncidentCard` + `PastIncidentSummary` stub + `platform.ts:29,267-272` + `types/platform.ts:188-223` + `constants:579-585` + `ois tokens` ke template features (single scroll 768px + overall derive + 90-day bar + incident timeline) | — |
