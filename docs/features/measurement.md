# Measurement — Dashboards, Reports & Metric Catalog

Status: **Draft**
Route: `/dashboards` (index), `/dashboards/exec` (executive), `/reports` (list), `/reports/builder` (wizard), `/metrics/catalog` (catalog) — all inside `MeasurementLayout`
Sidebar: Service Health & Intelligence · Measurement
Source: `src/routes/measurement/MeasurementLayout.tsx`, `DashboardsIndex.tsx`, `ExecutiveDashboard.tsx`, `Reports.tsx`, `ReportBuilder.tsx`, `MetricCatalog.tsx` · `server/routes/platform.ts:33,321-368` · `src/types/measurement.ts:1-114` · `src/services/platformServices.ts:191-205` · `src/lib/constants.ts:471-490` · `src/components/measurement/` (15 files)

---

## Intent

Pusat **measurement & reporting** — **jawab dalam 5 detik: bagaimana performa layanan? apa tren SLA/MTTR/change success? siapa yang perlu lapor?** CTO melihat KPI eksekutif rolling 7/30/90d dengan tren period-over-period, manager menjadwalkan report bulanan dengan multi-recipient delivery, dan SRE menelusuri definisi metric (formula, target, benchmark, source) di katalog. ITIL 4 Measurement & Reporting Practice — dashboards, report builder/scheduler, dan metric catalog dalam satu module layout.

---

## Current State (snapshot `src/routes/index.tsx:73-78`, `197-207`)

- `src/routes/index.tsx:73-78` imports `MeasurementLayout`, `DashboardsIndex`, `ExecutiveDashboard`, `Reports`, `ReportBuilder`, `MetricCatalog`.
- `src/routes/index.tsx:197-207` →
  ```tsx
  { path: 'dashboards', element: <MeasurementLayout />, children: [
    { index: true,  element: <DashboardsIndex /> },
    { path: 'exec', element: <ExecutiveDashboard /> },
  ]},
  { path: 'reports', element: <MeasurementLayout />, children: [
    { index: true, element: <Reports /> },
  ]},
  { path: 'reports/builder',                element: <ReportBuilder /> },
  { path: 'metrics', element: <MeasurementLayout />, children: [
    { path: 'catalog', element: <MetricCatalog /> },
  ]},
  ```
  `ReportBuilder` lives **outside** `MeasurementLayout` (full-width wizard, like `NewChange`).
- Layout: `src/routes/measurement/MeasurementLayout.tsx:14-91` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1 shrink-0 transition-colors duration-500` accent + `px-6 py-4` title `Measurement & Reporting text-xl font-bold ois-text` + stats row `text-xs ois-text-muted flex-wrap gap-3 dots w-1 h-1 rounded-full bg-ois-border-strong` + tab bar 4 `NavLink` (`LayoutDashboard 14`, `TrendingUp 14`, `FileBarChart2 14`, `Tag 14`, active `border-ois-primary text-ois-primary` else muted hover, `whitespace-nowrap px-3 py-3 border-b-2`) — `Outlet` owns scroll `flex-1 min-h-0 overflow-auto`.
- Components: `DashboardCard`, `KPICardLarge`, `AvailabilityTrendChart`, `IncidentVolumeChart`, `ChangeOutcomesChart`, `SLAComplianceTable`, `SummaryStatBlock`, `ReportRow`, `ReportFrequencyPill`, `ReportGenerateModal`, `ReportVersionsDrawer`, `MetricCard`, `MetricCategoryNav`, `MetricExpandedDetail`, `MetricValueDisplay`, `MetricTrendMiniChart`, plus wizard `Step1Content`, `Step2Schedule`, `Step3Delivery` (`src/components/measurement/` — 15 files; wizard under `ReportBuilderWizard/`).
- API: `platformRouter` (`server/routes/platform.ts:33,321-368`) — `platformRouter.use('/measurement', requirePermission('measurement.read'))` global guard + 6 endpoints under `/measurement` via `listByKind` / `prisma.document` (no scopedDb violation — all tenant-isolated via `req.tenantId`).
- Types: `DashboardType 5` (`executive|operational|sla|capacity|custom`), `ReportType 7` (`monthly_summary|sla_report|incident_report|change_report|availability_report|capacity_report|custom`), `ReportFrequency 5` (`on_demand|daily|weekly|monthly|quarterly`), `ReportFormat 4` (`pdf|csv|excel|json`), `MetricCategory 8` (`availability|reliability|performance|change_management|incident_management|capacity|service_request|knowledge`), `MetricValueType 6` (`count|percentage|duration|bytes|currency|ratio`), `MeasurementDashboard` with `widgets[]` (`kpi_card|line_chart|bar_chart|pie_chart|table|heatmap|stat_block|text` `span 1|2|3|4`), `Report` with `availableVersions[]` (`id|generatedAt|format|sizeKB|downloadUrl`), `MetricDefinition` with `formula|currentValue|trend|target|industryBenchmark|benchmarkSource|sourceSystem|updateFrequency|usedInDashboardIds|usedInReportIds|tags` (`src/types/measurement.ts:1-114`).
- Constants: `reportTypeMeta` (`src/lib/constants.ts:471-479` 7 entries label+icon `Calendar|Target|AlertTriangle|Wrench|Activity|BarChart2|FileText`), `metricCategoryMeta` (`481-490` 8 entries label+icon+color `availability #0BA5EC | reliability #067647 | performance #DC6803 | change_management #6941C6 | incident_management #B42318 | capacity #475467 | service_request #0BA5EC | knowledge #067647`).
- Services: `measurementService` (`src/services/platformServices.ts:191-205`) — `reports()`, `roi()`, `benefits()`, `dashboards()`, `metrics()`, `execSummary()` (`{slaCompliancePct, mttrMinutes, changeSuccessPct, openMajorIncidents}`), `createReport({name,definition,schedule})` — all via `apiFetch('/measurement/...')` + `src/services/core.ts:29-61` (`useResource`).

**Working:**
- Layout: accent computes `failedReports>0 ? #DC6803 (ois-warning) : #1F4FD4 (ois-primary)` (`MeasurementLayout.tsx:31-33`); stats `{dashboardCount} dashboards · {reportCount} reports · {metricCount} metrics · {totalViews30d} views (30d) · {scheduledReports} scheduled? · {failedReports} failed warning` with `toLocaleString()` for views; data via `useResource(() => measurementService.dashboards/reports/metrics)` `data ?? []`.
- DashboardsIndex: grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5` per `DashboardCard` (`DashboardsIndex.tsx:18-26` `mockMeasurementDashboards.map`) — card click `navigate('/dashboards/exec')` hardcoded (gap: does not route to `dashboard.id` parametric route).
- ExecutiveDashboard: header `radial-gradient 20% 40% rgba(31,79,212,0.08) + 80% 30% rgba(11,165,236,0.07)` + `/ EXECUTIVE DASHBOARD / {RANGE} /` mono `10.5px tracking 0.18em`, `h1 text-3xl font-bold tracking -0.02em`, sub `text-sm muted`; controls `Time Range 7d|30d|90d` custom dropdown `ChevronDown 14px h-9 border-ois-border` + `Service: All|{service.name}` dropdown `w-56 max-h-72 overflow-y-auto` from `servicesService.list()` + `Export Download 14 secondary sm disabled title "Export coming soon"`; KPI 4 `KPICardLarge` with computed real values (see below); Row1 `lg:grid-cols-2 gap-5` `AvailabilityTrendChart timeRange services` + `IncidentVolumeChart data incidentVolumeData`; Row2 `lg:grid-cols-2 gap-5` `ChangeOutcomesChart data changeOutcomesData` + `SLAComplianceTable rows slaTableRows`; `SummaryStatBlock rows summaryStats 3×3`; footer `Reference (backend exec-summary): SLA% · MTTR · Change success% · Major open` if `summary` exists.
- Reports: `Reports.tsx:44-207` — top `flex justify-end + New report Plus 14 primary sm → /reports/builder`; filter bar `flex-wrap gap-3` Search `Search 14 left-3 input h-9 pl-9 border-ois-border` placeholder `Search reports...` on `name|publicId` + `FilterDropdown` type 8 (`All types|7 ReportTypes`) + frequency 6 (`All frequencies|5 frequencies`) + Reset `X 13`; frequency tabs `rounded-full px-3 py-1 text-xs font-medium` active `bg-ois-primary text-white` vs `bg-ois-surface-muted border` `freqTabLabels All|Monthly|Weekly|Quarterly|On-demand` with count badge `rounded-full px-1.5 text-10px semibold bg-white/20 vs bg-white` (hide zero except `all`); table `rounded-xl border-gray-200 bg-white w-full min-w-800` header `border-b bg-ois-surface-muted 11px uppercase tracking-widest` 8 cols `ID|Name|Type|Frequency|Last generated|Next run|Format|Actions` → filteredReports `filter search lower + type + freq` + `ReportRow` per report + empty `py-16 No reports match + Reset` + `ReportGenerateModal report|null> null` + `ReportVersionsDrawer`.
- ReportBuilder: `ReportBuilder.tsx:21-138` — gate `useCan('measurement','author')` → if false render `ReportBuilderDenied` (`ShieldAlert 36 ois-danger mt-16 max-w-xl mx-auto p-8 bg-white rounded-xl border Can't author… Team Lead+ Back to Reports`); else `ReportBuilderForm` top bar `← Reports ArrowLeft 14 muted hover + Save as draft secondary sm` (no handler, visual) + title `New Report text-2xl bold + Configure… text-sm subtle` + stepper 3 `STEPS Content|Schedule|Delivery` `h-7 w-7 rounded-full 12px bold` `isDone bg-[#12B76A] Check 12 | isActive bg-ois-primary white | else bg-ois-surface-muted border muted` + labels `text-sm medium isActive ois-text vs done #12B76A vs muted` + divider `mx-3 h-px flex-1 #12B76A vs ois-border`; card `rounded-xl border-gray-200 bg-white p-6 max-w-2xl` with step content: `Step1Content onNext→setContent step2`, `Step2Schedule onBack|onNext→setSchedule step3`, `Step3Delivery onBack|onSubmit→measurementService.createReport({name:content.name,definition:content,schedule}) navigate('/reports')`.
- MetricCatalog: `MetricCatalog.tsx:13-159` — bar `flex-wrap gap-3` Search `Search 14 left-3 h-9 pl-9 border` placeholder `Search metrics...` on `name|displayName|description lower` + `FilterDropdown` category `All categories + 8 labels from metricCategoryMeta` + source `All sources + ALL_SOURCES derived Set(sourceSystem)` + checkbox `Has target` + Reset; 2-col layout `flex gap-6 items-start` left `w-220 shrink-0 rounded-xl border-gray-200 bg-white p-4 MetricCategoryNav` + right `flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-4 per MetricCard` expandable single `expandedMetricId:string|null` (only one at a time); empty `flex-col py-20 border bg-white No metrics match + Reset`.

**Stub / Partial:**
- `DashboardsIndex` click always `navigate('/dashboards/exec')` — parametric `dashboard.id` route not exist; custom widget builder absent (only Executive wired).
- `ExecutiveDashboard` compute parity: `slaPct curr/prev` uses `scopedIncidents filtered by affectedServiceIds|All` + `slaResolveStatus|slaResponseStatus !== breached` vs `docs/pages/measurement.md §4` says "% insiden tanpa breach" (matches); MTTR `avg((resolvedAt - createdAt)/60000) rounded` per `i.resolution?.resolvedAt` `createdAt` windowed (`windowMs 7|30|90` from `TIME_RANGE_DAYS`) with `mttrPrev` parallel for trend; `changeSuccess` counts `status in [closed_successful, closed_failed]` denom = finished, numerator = `closed_successful` (string mismatch vs server `successful|failed|rolled_back` enum in `platform.ts:333-342` backend stub `slaCompliancePct 0 mttr 0` — frontend is truth). `incidentVolumeData` bucket 1 week = `7*86_400_000`, `totalWeeks = round(days/7)`, weeks `Wk 1..N` stacked P1..P4; `changeOutcomesData` pie 4 slices Successful `#12B76A` Failed `#F04438` Cancelled `#98A2B3` In Progress `#1F4FD4` from `changes` filtered `plannedStart window`. `slaTableRows` maps `services` to `{service:name, current:uptime30d|null, target:slaTarget|null}`.
- `Reports` `freqCounts` counts all + per frequency; `FREQ_TAB_ORDER all|monthly|weekly|quarterly|on_demand` (omits `daily` intentionally — only 4+all). `ReportRow` `iconMap` 7 icons vs `reportTypeMeta.icon` string fallback `custom`; `formatIcons FileText|FileSpreadsheet|FilePieChart|Code 12px` + `formatLabels PDF|Excel|CSV|JSON` per `report.format ?? []` (guards missing `format`).
- `MeasurementLayout` accent only considers `lastRunStatus === 'failed'` — `scheduledReports` from `nextRunAt` truthy; `totalViews30d` sum `viewCount30d`.
- `MetricCard` formatting: `formatValue` guards `% 2 decimals, minutes h+rm, days, bytes/currency/ratio fallback `${value} ${unit}`; category badge `style backgroundColor ${color}18 border ${color}30 color` (alpha hex 0x18/0x30 ≈ 9%/19% opacity).
- `ReportBuilder` validation only `!name.trim()` disables `Next: Schedule` and `Create report` is always enabled (empty `definition` allowed → server `name required` 400 only). `ALL_SERVICES` 8 hardcoded strings not fetched from `servicesService`.
- `MetricCatalog` source derived from `mockMetricDefinitions.map sourceSystem` set; `categoryCounts` from `ALL_CATEGORIES filtered by meta keys` count `filter category===cat`.

**Missing:**
- Mutation endpoints `PATCH /measurement/reports/:id`, `DELETE /:id`, `POST /measurement/reports/:id/generate` (on-demand run), `GET /measurement/reports/:id/versions/:versionId/download` streaming file (now modal simulation only), `POST /measurement/dashboards` + widget CRUD, `GET /measurement/metrics/:id/history` for expanded chart real data (now `MetricTrendMiniChart` with mock deltas).
- Pagination `?page&pageSize` + column sort URL persist for Reports/Metrics (currently client filters only).
- Export `PDF|Excel` real generator (format stored as `report.format[]` but no file URL until `availableVersions[]`).
- Realtime `metric collector` ingest → `MetricDefinition currentValue` update via job (described in `docs/pages/measurement.md §14` but no `server/jobs/measurement*`).

---

## Primary View — Per Tab

### MeasurementLayout (shared chrome)

`-m-6 flex flex-col bg-ois-bg` `calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` accent `w-1 transition-colors duration-500` `failed>0 #DC6803 : #1F4FD4` + `px-6 py-4` title `Measurement & Reporting 20px bold ois-text` + stats `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` `{dashboards} dashboards bold · {reports} reports · {metrics} metrics · {views} views (30d) · {scheduled} scheduled? · {failed} failed warning semibold ois-warning` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tabs `nav flex px-4 overflow-x-auto scrollbar-hide` 4 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` + outlet `flex-1 min-h-0 overflow-auto`.

Tabs: `Dashboards (/dashboards end:true, LayoutDashboard 14) | Executive (/dashboards/exec, TrendingUp 14) | Reports (/reports, FileBarChart2 14) | Metrics (/metrics/catalog, Tag 14)` (`MeasurementLayout.tsx:7-12`).

### DashboardsIndex (`/dashboards`)

`p-6 space-y-6 max-w-screen-xl mx-auto` → `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5` `DashboardCard` per dashboard (`src/components/measurement/DashboardCard.tsx:39-87`):

- `Card hover:shadow-md group cursor-pointer`
- Top `flex gap-3`: icon `h-10 w-10 rounded-lg bg-ois-primary-pale text-ois-primary` with `typeIcons executive Briefcase 20 | operational Settings 20 | sla Target 20 | capacity Database 20 | custom LayoutDashboard 20` + `name 16px semibold leading-tight group-hover:text-ois-primary` + `description 12px ois-text-subtle line-clamp-2`
- Audience pill `rounded-full bg-ois-surface-muted border-ois-border px-2 py-0.5 11px medium ois-text-muted` mapping `executives→Executives | operations→Operations | service_owners→Service Owners | all→All`
- Stats `flex gap-4 text-xs ois-text-subtle border-t ois-border pt-3 mt-auto` `Last viewed: relativeTime(lastViewedAt) 12px medium ois-text` (`mins<60 → min ago else hr else days`) + `{viewCount30d} views (30d)`
- CTA `Button secondary sm self-end Open ArrowRight 13`; `onClick` on card or button → `handleOpen → navigate('/dashboards/exec')` (hardcoded).

### ExecutiveDashboard (`/dashboards/exec`)

`p-6 space-y-6 max-w-screen-xl mx-auto relative` with radial hero `50% 60% at 20% 40% rgba(31,79,212,0.08), 40% 50% at 80% 30% rgba(11,165,236,0.07)` absolute `inset-x-0 top-0 h-320`.

**Header:** `flex justify-between gap-4` left `flex gap-2 mb-2 h-px w-6 bg-ois-primary + mono 10.5px tracking 0.18em muted / EXECUTIVE DASHBOARD / {timeRange} /` + `h1 text-3xl bold tracking -0.02em` + `p text-sm muted Service reliability…` right controls: time range dropdown `relative button h-9 border-ois-border bg-white px-3 py-2 text-sm medium ois-text hover:bg-ois-surface-muted ChevronDown 14` → popup `w-40 rounded-lg border bg-white shadow-lg py-1` 3 items; service filter similarly `w-56 max-h-72` `Service: {filter}` + Export.

**KPI Row:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` `KPICardLarge` (`36-65`):

- Props `title 11px semibold uppercase tracking-wider muted, value 30px bold ois-text leading-tight, trend up TrendingUp green #12B76A | down TrendingDown red #F04438 | stable Minus subtle, trendLabel 12px semibold colored same, subtext 12px subtle, target 11px muted medium uppercase tracking-wide Target: X, status border-t-4 good #12B76A | warning #F79009 | bad #F04438 else transparent 4` container `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-5 flex-col gap-2`.
- 4 cards:
  - `SLA Compliance value {slaPctCurr}% else — trend trendDir(slaPctCurr,slaPctPrev, lowerIsBetter false) vs prev + sign delta pp, target 100% status >=99 good ≥95 warning else bad`
  - `MTTR value formatMinutes h? ${h}h ${r}m else ${r}m else — trend lowerIsBetter true target 30 min status ≤30 good ≤60 warning else bad` helper `formatMinutes docs measurement: avg((resolvedAt-createdAt)/60000)`
  - `Change Success value {curr}% else — trend pp false target 95% status ≥95 good ≥80 warning else bad`
  - `Active Incidents value {active.length} subtext {P1} P1 · {P2} P2 status P1>0 bad : P2>0 warning : good`

**Charts Row 1:** `grid lg:grid-cols-2 gap-5` each `rounded-xl border-gray-200 bg-white p-5` title `font-mono 11px medium uppercase tracking 0.18em ois-text-muted` + chart:
- Left: `Availability Trend ({services.length} services)` → `AvailabilityTrendChart timeRange services` (uptime over time per service)
- Right: `Incident Volume by Priority` → `IncidentVolumeChart data incidentVolumeData` stacked `P1..P4` weekly buckets `Wk 1..N` computed live (see Working).

**Charts Row 2:** same grid:
- Left: `Change Outcomes ({label})` → `ChangeOutcomesChart data 4 slices` `Successful #12B76A Failed #F04438 Cancelled #98A2B3 In Progress #1F4FD4`
- Right: `SLA Compliance by Service` → `SLAComplianceTable rows services→{service,current:uptime30d,target:slaTarget}` (`SLAComplianceTable.tsx:14-57` `table w-full text-sm thead border-b 11px semibold uppercase wider muted Service|Current right|Target right|Status center tbody divide-y Row hover:bg-ois-surface-muted/50 Service medium ois-text Current mono 12px green vs red Target mono subtle Status ✓ green bold vs ✗ red bold vs —` else `No services configured py-6`).

**Summary:** `SummaryStatBlock rows summaryStats 3 rows × 3` derived `resolved (resolution.resolvedAt window), totalDowntime sum minutes, implementedChanges filtered closed_successful|failed window, success rate calc, active Incidents open, P1 active, SLA breaches (slaResolveStatus|Response breached)` — blocks `{resolved, avg MTTR, downtime} | {implemented, success rate, failed} | {open, P1 active, breaches}`.

**Footer:** if `summary` non-null `text-11px ois-text-subtle Reference (backend exec-summary): SLA% · MTTR m · Change success% · Major open` (note backend always `sla 0 mttr 0` per `platform.ts:344-345` — frontend computed is truth).

### Reports (`/reports`)

`p-6 space-y-6 max-w-screen-xl mx-auto` → top `flex justify-end + New report` → filter bar Search `relative flex-1 min-w-200 max-w-xs` Input `h-9 border-ois-border pl-9 pr-3 text-sm placeholder subtle focus:ring-2 ois-primary/30` + `FilterDropdown` type `all|7 ReportType` + frequency `all|5 ReportFrequency` (`REPORT_TYPES`, `FREQUENCIES` const) + Reset if `search|type|freq ≠ all`; frequency tabs second row `FREQ_TAB_ORDER all|monthly|weekly|quarterly|on_demand` (intentionally omits daily) `rounded-full px-3 py-1 text-xs font-medium gap-1.5` active `bg-ois-primary white` else `bg-ois-surface-muted border` count badge `rounded-full px-1.5 py-0.5 text-10px semibold bg-white/20 white when active vs bg-white muted` hide `freq !== all && count===0`; table Card `rounded-xl border-gray-200 bg-white overflow-hidden table w-full min-w-800 thead border-b bg-ois-surface-muted 11px semibold uppercase tracking-widest ois-text-subtle ID|Name|Type|Frequency|Last generated|Next run|Format|Actions` tbody: empty `colSpan8 py-16 No reports match + Reset link primary`, rows `ReportRow` (`163 lines`) `border-b hover:bg-ois-surface-muted/50` cells `publicId mono 12px subtle | Name 14px medium line-clamp-2 max-w-240 | Type pill rounded-full bg-ois-surface-muted border ois-border px-2 py-0.5 11px muted + icon 13px per typeMeta | Frequency ReportFrequencyPill | Last generated dot 1.5 w rounded-full green #12B76A success else red #F04438 failed else gray-300 + relativeTime 12px subtle | Next run futureTime 12px subtle (futureToday→Today, <7d → d, weeks else On demand) | Formats flex gap-1 span gap-0.5 rounded px-1.5 py-0.5 10px medium bg-ois-surface-muted border FileText|FileSpreadsheet|FilePieChart|Code 12 | Actions MoreVertical 15 7×7 hover centered → menu w-40 rounded-lg border bg-white shadow py-1 z-20 Generate now Play 12 | View versions History 12` + outside-click handler `mousedown→if !contains close`; modals below.

- **ReportGenerateModal** `ReportGenerateModal.tsx:19-156` — props `report|null` (null → null), state `form|loading|success` `ALL_FORMATS pdf|excel|csv` + time range 5 options, services 4 options. Overlay `fixed inset-0 z-50 flex center p-4 bg-slate-900/40 backdrop-blur-sm`; card `max-w-lg rounded-2xl shadow-2xl animate-in fade-in zoom-in`. Header `px-6 py-4 border-b flex justify-between h3 18 bold + X 18 close`. Body `px-6 py-5 gap-5` form: report name 14 semibold + publicId mono 12 subtle; Time range select `h-9 border`; Services select; Format checkboxes `rounded`; Deliver to `rounded-lg border bg-ois-surface-muted px-3 py-2 Sarah Chen (your email) + Plus Add recipient`; loading `Loader2 32 animate-spin ois-primary + Generating report…`; success `CheckCircle 36 green #12B76A + Report generated successfully + Download PDF`. Footer form `Cancel secondary + Generate primary disabled formats.length===0 handleGenerate→loading setTimeout 1.2s → success onGenerate()`; success footer `Close`.

- **ReportVersionsDrawer** `ReportVersionsDrawer.tsx` — triggered by `versionsReport` state, drawer `w-[450px] shadow-2xl` listing `report.availableVersions` `id generatedAt format sizeKB downloadUrl` + download.

### ReportBuilder (`/reports/builder`)

Full-width `p-6 max-w-screen-xl mx-auto` — not inside MeasurementLayout. Gate `useCan('measurement','author')` (`src/lib/rbac/permissions.ts:525-530` rule `meas-author requiredDivisions STA|IFM|APS requiredLevel team_lead scope all`): if false → denied `max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border center ShieldAlert 36 ois-danger + h2 18 bold Cannot author reports + p 14 muted Authoring requires Team Lead level+ + Back to Reports`; else form:

- Top bar `flex justify-between mb-6 Links ArrowLeft 14 Reports muted hover + Save as draft secondary sm` visual.
- Title `mb-8 h1 text-2xl bold + p 14 subtle Configure…`.
- Stepper `mb-8 flex gap-0 STEPS 3 number+label isDone Check 12 green #12B76A bg, isActive ois-primary white, else muted border text-xs bold h-7 w-7 rounded-full | labels text-sm medium ois-text vs green vs muted | divider mx-3 h-px flex-1 green vs ois-border`.
- Card `rounded-xl border-gray-200 bg-white p-6 max-w-2xl` switching `step 1-3`:

**Step1Content** (`233 lines`): `ContentData name|description|type|timeRange|services|metrics|formats`. Controls: Report Name `text required * red #F04438 Input h-9 border px-3 text-sm placeholder subtle focus:ring`; Description textarea `rows2 rounded-lg border resize-none`; Report Type grid `grid-cols-2 gap-2 7 radio accent-ois-primary label 14 ois-text`; Time Range flex-wrap `5 radio last_7d|last_30d|last_90d|last_quarter|custom`; Scope Services pills `flex-wrap gap-2 rounded-full bg-ois-primary-pale border-ois-primary/20 px-2.5 py-0.5 12px medium ois-primary + X 10 remove + dashed + Add dropdown w-48 border bg-white shadow py-1 items ALL_SERVICES 8 filtered`; Include Metrics `5 checkboxes availability|incident_mttr|change_success|capacity|service_request rounded accent-ois-primary`; Format `4 checkboxes pdf(default checked) excel csv json`; footer `flex justify-end pt-2 border-t Next: Schedule→ primary disabled !name.trim() handleNext→onNext(data)`.

**Step2Schedule** (`85 lines`): `ScheduleData frequency|startDate`. FREQUENCIES 5 `on_demand On Demand|Generate manually | daily Daily|Every day at 6:00 AM UTC | weekly Weekly|Every Monday at 6:00 | monthly Monthly|First day | quarterly Quarterly|First day of quarter` radio cards `flex gap-3 rounded-lg border px-4 py-3 gap-2 cursor-pointer checked border-ois-primary bg-ois-primary-pale vs border-ois-border hover:surface-muted p label 14 medium + desc 12 subtle accent`; Start Date `if frequency!==on_demand input type=date value 2026-06-01 default h-9 border w-48 focus:ring`; footer `Back secondary ← + Next: Delivery→ primary handleNext`.

**Step3Delivery** (`92 lines`): `recipients string[] default sarah.chen@acme.io, newEmail, showInput, inApp true`. UI: Recipients `11px uppercase wider muted + flex-wrap pills rounded-full bg-ois-surface-muted border px-2.5 py-0.5 12px medium ois-text + X10 remove` + if `showInput flex gap-2 input h-8 border email placeholder autoFocus Enter→addEmail + Add primary Cancel secondary` else `Plus12 Add email self-start ois-primary hover:underline`; Notifications `In-app checkbox rounded accent`; footer `Back secondary ← | Save draft outline + Create report primary both call onSubmit→measurementService.createReport({name,schedule,definition}) → navigate('/reports')` (currently no draft distinction — both persist).

### MetricCatalog (`/metrics/catalog`)

`p-6 space-y-6 max-w-screen-xl mx-auto` → bar `flex-wrap gap-3` Search `flex-1 min-w-200 max-w-sm input h-9 pl-9` on `name|displayName|description` + `FilterDropdown All categories + 8 metricCategoryMeta labels` + `FilterDropdown All sources + ALL_SOURCES Set(sourceSystem)` + `label checkbox Has target rounded accent + text 14 ois-text` + Reset if any; then `flex gap-6 items-start` left `w-220 shrink-0 rounded-xl border-gray-200 bg-white p-4 MetricCategoryNav` + right `flex-1 min-w-0 sm:grid-cols-2 gap-4`.

- **MetricCategoryNav** (`92 lines`) — `categories filtered count>0, categoryCounts Record, selected all|MetricCategory, onSelect`. UI: `All categories button rounded-lg px-3 py-2 text-sm flex justify-between rounded-lg totalCount sum` active `bg-ois-primary white semibold` vs `ois-text hover:surface-muted`, badge `rounded-full px-1.5 text-xs medium bg-white/20 white when active vs surface-muted muted` + divider `my-1 border-t` + per category button similar with icon `Activity|Shield|Zap|GitBranch|AlertTriangle|Database|ClipboardList|BookOpen 14` colored `meta.color` vs white when active + count badge.

- **MetricCard** (`126 lines`) — `metric MetricDefinition, isExpanded, onToggle`. Outer `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card cursor-pointer hover:shadow-md when not expanded else shadow-md transition-shadow` `onClick toggle` + expanded detail `onClick stopPropagation`. Body `p-4 flex-col gap-3` top `flex justify-between publicId mono 12 subtle + badge rounded-full border px-2 py-0.5 11px medium style bg ${color}18 border ${color}30` category label; `h3 16 semibold ois-text leading-tight displayName`; grid `grid-cols-3 gap-3` Current `MetricValueDisplay` + if `target !== undefined Target formatValue 14 semibold` + if `benchmark !== undefined Benchmark 14 subtle + source 10 muted`; Formula `if formula rounded-md bg-ois-surface-muted px-3 py-1.5 Formula 10 semibold uppercase muted + mono 11 subtle line-clamp-1`; Source line `11px muted Source: subtle · Updated: subtle`; Used in `flex-wrap gap-1 slice0-2 Dashboard pill bg-ois-primary-pale border-ois-primary/20 10px ois-primary + Report pill bg-ois-surface-muted border 10px muted`; toggle `flex justify-end 12px subtle medium ChevronDown 13 Expand vs ChevronUp Collapse`.

- **MetricExpandedDetail** (`112 lines`) — `flex gap-4 pt-4 mt-4 border-t`. Sections `h4 11px semibold uppercase wider muted mb-1`: Full Formula `mono 12 bg-ois-surface-muted rounded-lg px-3 py-2` if exists; Description `14 muted leading-relaxed`; Interpretation `getInterpretation(name) Elite/High/Medium/Low strings: mttr <30min Elite… days etc + Current: formatValue bold`; Trend 30d `MetricTrendMiniChart metricId currentValue`; History `table w-full divide-y month 12 subtle vs value mono 12` months `May|Apr|Mar|Feb 2026 with deltas 0|-5|3|-8% of current` (mock); Used In bullets `text-xs subtle • Dashboard: id`.

- Empty `filteredMetrics 0 → flex-col py-20 border rounded-xl bg-white No metrics match + Reset primary underline`; grid otherwise.

---

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View dashboards | `GET /measurement/dashboards`, card grid → `/dashboards` | `measurement.read` | — |
| Open executive dashboard | `DashboardCard Open` / card click | `measurement.read` | — → `/dashboards/exec` (hardcoded) |
| Change time range | Executive `Last 7|30|90 days` dropdown `TIME_RANGE_LABELS` | `measurement.read` | — local `timeRange 30d` resets `windowMs = days*86_400_000` `windowStart=now-Ms` `prevStart=start-Ms` |
| Filter by service | Executive `Service: All|service.name` dropdown `servicesService.list()` | `measurement.read` | — local `serviceFilter` affects `scopedIncidents via affectedServiceIds` |
| Export dashboard | `Export Download 14 secondary sm disabled title "Export coming soon"` | `measurement.read` | — stub |
| View reports | `GET /measurement/reports` table `/reports` | `measurement.read` | — |
| Create report (author) | `+ New report Plus 14 primary → /reports/builder` wizard 3-step `POST /measurement/reports` gated `useCan('measurement','author')` | `measurement.author` Team Lead+ STA|IFM|APS | — name non-empty |
| Search reports | Input `name|publicId lower includes` | `measurement.read` | filter client |
| Filter reports by type | `FilterDropdown all|7 types` | `measurement.read` | client |
| Filter by frequency | `FilterDropdown all|5 + freqTabs rounded-full pills` | `measurement.read` | `FREQ_TAB_ORDER all|monthly|weekly|quarterly|on_demand` |
| Reset report filters | `Reset X 13` or empty row Reset link | `measurement.read` | any filter active |
| Generate now | `ReportRow ⋯ Generate now Play 12 → ReportGenerateModal` | `measurement.read` (modal) | report exists; modal form→loading 1.2s→success `Download PDF` |
| View versions / download | `ReportRow ⋯ View versions History 12 → ReportVersionsDrawer` list `availableVersions id|generatedAt|format|sizeKB|downloadUrl` | `measurement.read` | `generatedCount>0` |
| View metric catalog | `GET /measurement/metrics` `/metrics/catalog` | `measurement.read` | — |
| Search metrics | Input `name|displayName|description lower` | `measurement.read` | client |
| Filter metrics | `category All|8`, `source All|ALL_SOURCES Set`, `Has target checkbox` + `MetricCategoryNav` | `measurement.read` | client; nav filters `count>0` only |
| Expand metric detail | `MetricCard click toggle ChevronDown→Up` single `expandedMetricId` | `measurement.read` | — show `MetricExpandedDetail` |

Delegate ke [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) saat shared tersedia (FilterDropdown pattern), [`_shared/routing.md`](./_shared/routing.md) untuk Module Layout routing.

---

## Filters / Sort / Search

- **Executive filters:** `timeRange 7d|30d|90d` `TIME_RANGE_DAYS 7|30|90` → `windowMs + prev` for KPI deltas & chart windows; `serviceFilter All|service.name` derived `inService (id===svc.id)` + `scopedIncidents = incidents.filter affectedServiceIds.some(inService) || All`; no URL persist (local state `useState`).
- **Reports search:** `search lower on name|publicId` (`Reports.tsx:52`); type `typeFilter all|ReportType`; frequency `freqFilter all|ReportFrequency` applied together `useMemo filteredReports` (`48-58`). `freqCounts` per frequency `counts[freq]`. `freqTabLabels All|Monthly|Weekly|Quarterly|On-demand` with badge counts. Sort: fetch order (no column sort).
- **Metric search:** `search lower on name|displayName|description` (`MetricCatalog.tsx:44-46`); `selectedCategory all|8` `useMemo`; `sourceFilter all|string` derived `ALL_SOURCES Set`; `hasTarget boolean` checks `target!==undefined`; reset clears all 4. No debounce.
- **Sort:** fixed — Dashboards fetch order, Reports filtered order, Metrics `ALL_CATEGORIES order` (from `metricCategoryMeta` insertion) then fetch order; no column sort toggle (vs `incidents`/`availability`). No `?search&type=&frequency=` query persist — all in local state (gap: should migrate to `useSearchParams` like `capacity`/`availability`).

---

## Detail View

No dedicated `/:id` page — detail is inline/modal/drawer:

- **Dashboards:** no detail page; `DashboardCard` shows `description|audience|viewCount30d|lastViewed` + `Open` → `/dashboards/exec` (future: `/:dashboardId` with `widgets[]` `span 1-4` `kpi_card|line_chart|bar_chart|pie_chart|table|heatmap|stat_block|text` config per `MeasurementDashboard:35-56`).
- **Reports detail:** `ReportRow` actions open `ReportGenerateModal` (`form|loading|success` with time range 5 options `Last 7d…Custom` + services 4 + format `pdf|excel|csv` checkbox → Generate) and `ReportVersionsDrawer` `w-[450px] z-50` listing `availableVersions` with download; table shows `lastRunStatus dot green success|red failed|gray pending` + `generatedCount|lastGeneratedAt|nextRunAt`.
- **Metric detail:** `MetricCard` expand single `isExpanded` `onClick` toggles `MetricExpandedDetail` inline `px-4 pb-4 stopPropagation` with `border-t` sections (see MetricCatalog above). Sidebar nav provides category drill-down as alternative detail axis.

Ref: [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) when shared available — measurement uses inline expand + modals not 3-column drawer like `EventDetail`.

---

## State Lifecycle

```
MeasurementDashboard:  read-only snapshot (createdAt/updatedAt) — viewCount30d incremented on open.
  type: executive | operational | sla | capacity | custom (fixed per dashboard)
  audience: executives | operations | service_owners | all
  widgets: [] config per widget type with span 1-4; no lifecycle yet (CRUD deferred).

Report:  draft (local form until submit) → persisted (POST) → scheduled|on_demand
  frequency: on_demand (no nextRunAt) | daily 06:00 UTC | weekly Mon 06:00 | monthly 1st 06:00 | quarterly 1st 06:00
  lastRunStatus: success | failed | undefined (dot color logic)
  generatedCount increment on each Generate now (modal success increments client only currently)
  availableVersions append {id,generatedAt,format,sizeKB,downloadUrl}

MetricDefinition:  live metric (currentValue updated via collector job — not yet):
  trend: up | down | stable with trendPercent
  valueType: count|percentage|duration|bytes|currency|ratio + unit (%|minutes|days|connections…)
  category → color mapping metricCategoryMeta (see Design Preservation)
  usedInDashboardIds / usedInReportIds listing cross-reference.

Executive KPI lifecycle:  windowed computation — curr vs prev period delta sign determines trendDir (up|down|undefined) + trendLabel ±N unit vs prev;
  status good ≥99 or ≤30 or ≥95 else warning ≥95 or ≤60 or ≥80 else bad.
```

Guard: `Reset` clears search/type/freq or category/source/target; empty `No reports match` / `No metrics match` fallback; `ReportGenerateModal disabled formats.length===0`; `ReportBuilder Next: Schedule disabled !name.trim()`.

---

## Permissions (action-level)

| Action | Permission | Who | Notes |
|--------|------------|-----|-------|
| View dashboards/reports/metrics/exec-summary/time-series | `measurement.read` | STA|IFM|APS any level (`meas-read` `src/lib/rbac/permissions.ts:518-524` scope all) | Server `platformRouter.use('/measurement', requirePermission('measurement.read'))` `platform.ts:33` — tenant-isolated `req.tenantId` + `listByKind`; violation → 403 `scope_violation` (global `withScopedDb` `server/app.ts:126`) |
| Create/edit reports & dashboards | `measurement.author` | STA|IFM|APS Team Lead+ (`meas-author 525-530` `requiredLevel team_lead`) | UI gate `useCan('measurement','author')` `ReportBuilder.tsx:22` → denied page `ShieldAlert` + `Back to Reports`; server `POST /measurement/reports` currently **not** guarded by `requirePermission('measurement.author')` — gap vs spec `measurement.author` (platform.ts only `read` guard); should add `requirePermission('measurement.author')` to POST |
| Generate now / view versions | `measurement.read` | Same as read | Modal `ReportGenerateModal` no write guard; future `POST .../:id/generate` should require `author` or `read`? spec `measurement.read` for view, `author` for generate — TBD |
| ROI / benefits (companion) | `measurement.read` (roi/benefits share same guard via `/measurement` prefix) | Same | `GET /measurement/roi → listByKind roi-calc`, `benefits` same |

No `measurement.write|delete` separate — single `read` + `author` split. `requirePermission` global via `server/app.ts:126` `withScopedDb` context (`req.tenantId`, `req.permissions`).

UI gate pattern: `useCan('measurement','author')` → denied page vs form; `Can` wrapper potential for Reports `+ New report` hide when lacking perm (currently always visible — gap).

---

## Empty / Loading / Error

- **Empty dashboards:** `mockMeasurementDashboards.map` empty → grid 0 cards, no empty text (gap vs `cmdb` `No CIs match`); would show hero space only `p-6`.
- **Empty executive KPIs no window data:** `slaPctCurr null → —`, `mttrCurr null → —`, `changeSuccessCurr null → —`, `activeIncidents.length 0 → 0 P1·0 P2 good`; `IncidentVolumeChart data weeks all 0`; `ChangeOutcomesChart all 0 values`; `SLAComplianceTable services 0 → No services configured py-6 text-center`; `SummaryStatBlock resolved 0|avg —|downtime 0m etc`; `footer Reference` only if summary exists.
- **Empty reports table:** `colSpan8 py-16 No reports match your filters. Reset filters primary link` (`Reports.tsx:177-179`); filter counts still 0; `ReportRow` not rendered.
- **Empty report versions:** if `availableVersions.length===0` drawer empty state `No versions yet` (in `ReportVersionsDrawer`).
- **Empty metrics catalog:** `filteredMetrics 0 → flex-col py-20 border rounded-xl bg-white No metrics match + Reset link primary` (`MetricCatalog.tsx:132-140`); counts still shown in `MetricCategoryNav`.
- **Loading:** `useResource` → `data null → ?? []` → zero-state renders (no skeleton/shimmer unlike `cmdb` or `incidents` — parity gap). `isGenerating?` not exposed; `ReportGenerateModal loading state spinner 32 ois-primary Generating report…` covers generate only.
- **Error:** no banner — failure → silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state).
- **No service/metric data:** `services.map` empty → dropdown `All` only; `MetricSparkline/TrendMiniChart series 0 → null`.

---

## Phase 2 Deferred

- Dashboard custom widget builder + parametric route `/:dashboardId` (rationale: `DashboardsIndex handleOpen hardcoded → /dashboards/exec` line 12 — spec `MeasurementDashboard.type 5` but only Executive implemented).
- Report CRUD `PATCH /measurement/reports/:id`, `DELETE /:id`, `POST /:id/generate` real generation + `GET /:id/versions/:versionId/download` streaming (rationale: Generate modal simulates 1.2s + Versions drawer reads `availableVersions` static).
- Report schedule evaluator cron-like job + email/notif delivery `deliverToEmails deliverToUserIds inApp` (rationale: `docs/pages/measurement.md §14` describes report scheduler + email delivery — no `server/jobs/reportScheduler`).
- Metric collector ingest `POST /measurement/metrics/:id/collect` + history `GET /:id/history?rangeDays=30` real `MetricTrendMiniChart` (currently `getHistoricalRows May-Feb mock deltas 0|-5|3|-8%`).
- Dashboard/metrics pagination `?page&pageSize` + multi-sort URL persist `?search&type=&frequency=&category=&source=` via `useSearchParams` (heatmap-like `?service&date` pattern in `availability`).
- Export `PDF|Excel` real generator via report `format[]` → `availableVersions downloadUrl` S3/GCS multi-tenant delivery `compose.override.yml` (spec `docs/pages/measurement.md §15` open gap).
- `useCan` guard for `+ New report` button hide when lacking `measurement.author` (currently always visible) + server `POST` add `requirePermission('measurement.author')`.
- Time range `last_quarter|custom` custom date picker wiring in Step1Content (currently radio only).

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/measurement/` + `src/components/measurement/` + `docs/pages/measurement.md` + `src/index.css`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1` accent `#DC6803|#1F4FD4 transition duration-500` + title `Measurement & Reporting 20px bold ois-text` + stats `gap-3 dots w-1 h-1 bg-ois-border-strong text-xs muted flex-wrap` (`MeasurementLayout.tsx:32-64`). Jangan ganti ke Module Layout lain.
2. **Tabs** `NavLink LayoutDashboard|TrendingUp|FileBarChart2|Tag 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` (`MeasurementLayout.tsx:68-81`).
3. **DashboardCard** `Card hover:shadow-md group` `icon 40px rounded-lg bg-ois-primary-pale text-ois-primary typeIcons Briefcase|Settings|Target|Database|LayoutDashboard 20 + name 16 semibold group-hover:ois-primary + audience pill rounded-full bg-ois-surface-muted border 11px muted + Stats border-t pt-3 Last viewed relativeTime + views (30d) + Open secondary ArrowRight` (`DashboardCard.tsx:39-87`).
4. **KPICardLarge** `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-5 flex gap-2 border-t-4 good #12B76A warning #F79009 bad #F04438 else transparent title 11px semibold uppercase wider muted value 30px bold leading-tight trend TrendingUp green #12B76A TrendingDown red #F04438 Minus subtle 13 subtext 12 subtle Target 11 muted uppercase` (`KPICardLarge.tsx:15-65`).
5. **Executive hero** `radial-gradient 20% 40% rgba(31,79,212,0.08) + 80% 30% rgba(11,165,236,0.07) h-320 inset-x top-0` + mono `/ EXECUTIVE DASHBOARD / {range} / 10.5px tracking 0.18em w-6 bg-ois-primary h-px` + Title `text-3xl bold tracking -0.02em` (`ExecutiveDashboard.tsx:261-279`).
6. **Executive KPI logic** `MTTR avg((resolvedAt-createdAt)/60_000) rounded windowed, SLA % ok/resolved*100/10, Change % closed_successful/finished*100` with `trendLabel ±N vs prev` + `trendDir lowerIsBetter inverse` (`147-162`).
7. **Chart wrappers** `rounded-xl border-gray-200 bg-white p-5 title mono 11px uppercase 0.18em muted` + `AvailabilityTrendChart services` + `IncidentVolumeChart buckets Wk P1..P4` + `ChangeOutcomesChart colors #12B76A|#F04438|#98A2B3|#1F4FD4` + `SLAComplianceTable rows ok green vs red ✓|✗` (`ExecutiveDashboard.tsx:377-400`).
8. **Reports filter bar** `Search h-9 pl-9 border-ois-border focus:ring ois-primary/30 + FilterDropdown All types 8 All frequencies 6 + Reset X13` + freq tabs `rounded-full counts badge 10px semibold white/20 vs white` (`Reports.tsx:94-158`).
9. **ReportRow** `border-b hover:bg-ois-surface-muted/50 publicId mono 12 subtle  Type pill rounded-full bg-ois-surface-muted border 11 muted + icon 13 | Frequency ReportFrequencyPill | Last dot 1.5 green|red|gray + relativeTime | Next futureTime | Formats rounded px-1.5 10 muted + icon 12 | Actions MoreVertical 7x7 hover → menu w-40 rounded-lg border shadow py-1 Play|History 12` (`ReportRow.tsx:80-163`).
10. **ReportGenerateModal** `fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm max-w-lg rounded-2xl shadow-2xl header px-6 py-4 border-b 18 bold + X18 close body gap-5 Time range select h-9 border Services select Format checkboxes rounded  Deliver Sarah Chen (your email) + Add recipient loading spinner 32 ois-primary vs success CheckCircle 36 #12B76A` (`ReportGenerateModal.tsx:42-154`).
11. **ReportBuilder** `max-w-screen-xl p-6 top bar ← Reports ArrowLeft 14 + Save as draft secondary sm title text-2xl bold stepper h-7 w-7 rounded-full CheckDone green #12B76A | Active ois-primary | else muted border + labels text-sm muted/green + divider h-px green vs border card max-w-2xl rounded-xl border-gray-200 p-6` (`ReportBuilder.tsx:48-135`).
12. **Step1Content** `Report Name * red h-9 border focus:ring Description textarea rows2 Report Type grid-cols-2 7 radio accent-ois-primary Time Range 5 radio Services pills bg-ois-primary-pale border-ois-primary/20 12 primary + X10 remove + dashed + Add dropdown w-48 Metrics 5 checkboxes Format 4 checkboxes Next: Schedule→ primary disabled !name` (`Step1Content.tsx:84-232`).
13. **Step2Schedule** `5 frequency radio cards rounded-lg border px-4 py-3 checked border-ois-primary bg-ois-primary-pale label 14 medium desc 12 subtle accent Start Date type date h-9 w-48 if not on_demand Next: Delivery→` (`Step2Schedule.tsx:31-84` `06:00 UTC descriptions`).
14. **Step3Delivery** `Recipients pills bg-ois-surface-muted border X10 + Add email Plus12 ois-primary h-8 border In-app checkbox rounded accent footer Back ← | Save draft outline + Create report primary → POST` (`Step3Delivery.tsx:28-91`).
15. **MetricCategoryNav** `All categories rounded-lg px-3 py-2 14 active bg-ois-primary white semibold vs ois-text hover muted + badge rounded-full px-1.5 xs medium white/20 vs surface-muted divider border-t per category icon 14 colored meta.color vs white active + count` (`MetricCategoryNav.tsx:36-90`).
16. **MetricCard** `bg-ois-surface border-ois-border rounded-ois-card shadow hover:shadow-md isExpanded shadow-md p-4 gap-3 Top publicId mono12 subtle + badge rounded-full border px-2 11 medium bg color18 border color30 h3 16 semibold Grid 3 cols Current MetricValueDisplay Target Benchmark 14 semibold formula rounded-md bg-ois-surface-muted 11 mono Source 11 muted UsedIn pills slice2 Dashboard ois-primary-pale ois-primary/20 10 vs Report muted + Expand Collapse Chevron 13` (`MetricCard.tsx:31-125`).
17. **MetricExpandedDetail** `border-t pt-4 gap-4 Sections 11 semibold uppercase wider muted Formula mono 12 bg-ois-surface-muted rounded-lg px-3 py-2 Description 14 muted Interpretation Elite table Trend MetricTrendMiniChart History May-Feb mock + Used In bulbs 12 subtle` (`MetricExpandedDetail.tsx:42-111`).
18. **Tokens** `ois-primary #1F4FD4 hover #1A42B5 pale #EEF2FF bg #F7F8FA surface #FFFFFF muted #F1F3F7 border #E4E7EC strong #D0D5DD text #101828 muted #475467 subtle #98A2B3 success #12B76A warning #F79009 danger #F04438 info #0BA5EC sidebar bg #F4F5F7 content #FFFFFF border #E4E7EC shadow-ois-card 0 1px 2px rgba(16,24,40,0.04)` (`src/index.css:8-58`).
19. **Meta** `reportTypeMeta 7 labels icons Calendar… + metricCategoryMeta 8 labels colors exact hex #0BA5EC|#067647|#DC6803|#6941C6|#B42318|#475467` (`src/lib/constants.ts:471-490`) — jangan map ke token generik tanpa alias.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `measurementService.dashboards()` | `GET /api/v1/measurement/dashboards` | `measurement.read` | `listByKind<MeasurementDashboard>(tenantId,'measurement-dashboard')` `platform.ts:325` |
| `measurementService.metrics()` | `GET /api/v1/measurement/metrics` | `measurement.read` | `listByKind<MetricDefinition>(...,'metric-def')` `:326` |
| `measurementService.reports()` | `GET /api/v1/measurement/reports` | `measurement.read` | `listByKind<Report>(...,'report')` `:322` all (no pagination yet) |
| `measurementService.roi()` | `GET /api/v1/measurement/roi` | `measurement.read` | `listByKind<ROICalculation>(...,'roi-calc')` `:323` companion |
| `measurementService.benefits()` | `GET /api/v1/measurement/benefits` | `measurement.read` | `listByKind<BenefitMeasurement>(...,'benefit-measurement')` `:324` companion (improvement benefit) |
| `measurementService.execSummary()` | `GET /api/v1/measurement/exec-summary` | `measurement.read` | `platform.ts:328-350` computes `changeSuccessPct from prisma.change filter successful/failed/rolled_back take200 + openMajorIncidents count isMajor true not resolved` — `slaCompliancePct 0 mttr 0` stub (Incident no resolvedAt col, SLATarget not table) |
| `measurementService.createReport(input)` | `POST /api/v1/measurement/reports` | `measurement.read` today (should be `measurement.author`) | `platform.ts:352-368` body `{name definition schedule}` validates `name required` 400 → `prisma.document.create kind report key randomUUID data JSON {name,definition,schedule,createdBy}` audit future → `201 {id,name,definition,schedule,createdAt}` |

All via `src/services/platformServices.ts:191-205` `apiFetch('/measurement/...')` + `src/services/core.ts:29-61` `apiFetch`. Tenant-scoped `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Socket: none yet (future `tenant:{tenantId}` metric/report refresh).

---

## Open Items

- [ ] Add `requirePermission('measurement.author')` to `POST /measurement/reports` + `PATCH/DELETE/:id` + `POST/:id/generate` — verify `report` `kind` mapping in documents repo; wire `ReportBuilder` `definition` schema `createReportSchema` with `timeRange|serviceIds|includedMetrics|format|deliverTo` validation.
- [ ] Parameterize `DashboardsIndex` open `navigate('/dashboards/:dashboardId')` + build `DashboardDetail` with `widgets[] span 1-4` grid render vs hardcoded `'/dashboards/exec'`.
- [ ] Replace backend `exec-summary` stub `sla 0 mttr 0` with real `incident.resolution.resolvedAt` + `slaResolveStatus` aggregation filtered by `timeRange & serviceIds`.
- [ ] Wire `Executive Export` `Download 14` → `GET /measurement/exec-summary/export?range=30d&service=&format=pdf|excel`.
- [ ] Wire `MetricTrendMiniChart` to real `GET /measurement/metrics/:id/history?days=30` — remove mock `May-Feb deltas 0|-5|3|-8`.
- [ ] Persist report toggle/filter to URL `?search&type=&frequency=` + sort `lastGenerated desc` like `incidents`.
- [ ] Hide `+ New report` when `!can('measurement','author')` (show disabled or removed) parity with `ReportBuilder` denied page.
- [ ] Implement report scheduler cron-like + email/notif `deliverToEmails` delivery (stub in `docs/pages/measurement.md §14`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/measurement.md` + `src/routes/measurement/*` (MeasurementLayout/DashboardsIndex/ExecutiveDashboard/Reports/ReportBuilder/MetricCatalog) + `server/routes/platform.ts:33,321-368` + `src/types/measurement.ts` + `src/services/platformServices.ts:191-205` + `src/lib/constants.ts:471-490` + `src/components/measurement/` (15 files) + wizard `ReportBuilderWizard/*` to template features (Module Layout + Dashboards/Executive/Reports/Builder/Catalog) | — |
