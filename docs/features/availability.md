# Availability — Uptime, SLA & Outages

Status: **Draft**
Route: `/availability` (dashboard), `/availability/sla` (SLA Targets), `/availability/outages` (Outages)
Sidebar: Service Health & Intelligence · Availability
Source: `src/routes/availability/AvailabilityLayout.tsx`, `AvailabilityDashboard.tsx`, `SLATargets.tsx`, `Outages.tsx` · `server/routes/availability.ts` · `src/types/availability.ts` · `src/components/availability/` · `src/lib/constants.ts:377-405`

---

## Intent

Pusat observability service health — **jawab dalam 5 detik: apakah service up? SLA breach? outage apa yang ongoing?** Manager melihat uptime 30d & error budget burn, SRE melacak MTTR/MTBF trend, dan on-call men-drill outage → root cause → linked incident/change/problem. ITIL 4 Availability Management & Service Level Management.

---

## Current State (snapshot `src/routes/index.tsx:55-58`, `182-186`)

- `src/routes/index.tsx:55-58` imports `AvailabilityLayout`, `AvailabilityDashboard`, `SLATargets`, `Outages`.
- `src/routes/index.tsx:182-186` → `<AvailabilityLayout />` at `/availability` with children:
  - `index` → `<AvailabilityDashboard />`
  - `sla` → `<SLATargets />`
  - `outages` → `<Outages />`
- Layout: `src/routes/availability/AvailabilityLayout.tsx:13-90` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + accent `w-1 shrink-0 transition-colors duration-500` color `ongoing>0||breached>0 #B42318 : atRisk>0 #DC6803 : #12B76A` + title `Availability text-xl font-bold ois-text` + stats row `text-xs ois-text-muted` with dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab bar 3 `NavLink` (`Activity 14`, `Target 14`, `AlertOctagon 14`, active `border-ois-primary text-ois-primary` else muted hover) — `Outlet` owns scroll `flex-1 min-h-0 overflow-auto`.
- Components: `UptimeCalendarHeatmap`, `UptimeCalendarCell`, `MTTRTrendChart`, `SLAComplianceDonut`, `ActiveBreachesList`, `OutageTimeline`, `OutageVolumeBarChart`, `OutageCausesPieChart`, `SLACard`, `SLAStatusPill`, `ErrorBudgetBar`, `OutageTypeChip`, `OutageDetailDrawer` (`src/components/availability/` — 13 files).
- API: `availabilityRouter` (`server/routes/availability.ts:9-31`) — 5 `GET` endpoints under `/availability` via `listByKind` + `requirePermission('availability.read')` + `qBool` active filter for breaches.
- Types: `SLAWindow rolling_30d|rolling_7d|rolling_90d|calendar_month|calendar_quarter`, `SLAMetric availability|mttr|mtbf|mtrs|response_time|first_byte_latency`, `AvailabilitySLAStatus meeting|at_risk|breached`, `ServiceTier critical|important|standard`, `OutageType unplanned|planned|partial|detected_only`, `SLATarget`, `SLABreach`, `Outage`, `DailyServiceHealth`, `AvailabilityDataPoint` (`src/types/availability.ts:3-114`).
- Constants: `slaStatusMeta_avail` (`src/lib/constants.ts:377-381` meeting `#067647 #ECFDF3 CheckCircle` / at_risk `#DC6803 #FFFAEB AlertTriangle` / breached `#B42318 #FEF3F2 AlertOctagon`), `outageTypeMeta` (`383-388` unplanned `#B42318 #FEF3F2 AlertOctagon` / planned `#0BA5EC #F0F9FF Calendar` / partial `#DC6803 #FFFAEB AlertTriangle` / detected_only `#475467 #F1F3F7 Eye`), `dailyHealthColors` (`390-396` operational `#12B76A` degraded `#F79009` partial_outage `#FB923C` major_outage `#F04438` maintenance `#0BA5EC`), `slaMetricMeta` (`398-405`).

**Working:**
- Dashboard: KPI 4 grid `grid-cols-2 lg:grid-cols-4 gap-4` — `Avg Uptime (30d)` `avg(service.uptime30d)` `trendBetter high` + subDetail `Across N services`, `MTTR (30d)` `mean(resolution.resolvedAt - createdAt)` rolling 30d `trendBetter low` target `<30m` formatted `Xh Ym` or `Ym`, `MTBF (30d)` `WINDOW_MS / failures` `trendBetter high` target `>14 days`, `Active Outages` `endedAt==null` count + breakdown `${unplanned} unplanned · ${partial} partial`; hero 90-day heatmap `UptimeCalendarHeatmap`; trend `MTTRTrendChart` 30d `mttr|mtrs|mtbf`; compliance `SLAComplianceDonut` meeting/at_risk/breached; `ActiveBreachesList`; `OutageTimeline` 30d; `ConnectedSourcesPanel domain="availability"`; export button `Download 14`.
- SLATargets: search + service + status filters, stats strip 4 pills `All|Meeting|At Risk|Breached` counts `rounded-full text-[10px] font-bold`, card grid `md:grid-cols-2 xl:grid-cols-3 gap-4` per `SLACard` — tier badge critical `#B42318 #FEF3F2` / important `#DC6803 #FFFAEB` / standard `#475467 #F1F3F7`, target `{value}{unit}` + window `rolling_30d`, performance bar `current/target*100` green `#12B76A` if `>=target` else red `#F04438`, error budget bar `ErrorBudgetBar`, owner/effective/reviewDue meta `User|Calendar 12px`, active breach alert `border-red-200 bg-red-50`; `New SLA Target` gated `Can availability update` (`availability.update`).
- Outages: filter bar search+type+service+severity+customer-facing + stats strip type 5 + severity P1-P4 4 + customer-facing 1, charts `OutageVolumeBarChart` 13w stacked P1 `#F04438` P2 `#FB923C` P3 `#F79009` P4 `#12B76A` + `OutageCausesPieChart` by `outageTypeMeta` color, table 9 columns `ID mono|Type chip|Service|Started formatRelative|Duration pulsing ongoing|Sev SeverityBadge|Customer Check/Minus|Triggered by link /incidents/:id|View →` sorted `startedAt desc` `hover:bg-ois-surface-muted` ongoing `bg-red-50`, `OutageDetailDrawer` slide `w-[450px] z-50 translate-x` with overlay `z-40 bg-black/30`.
- All data via `useResource(() => availabilityService.*, servicesService, incidentsService)` `data ?? []` with no mock fallback (`src/services/availabilityService.ts:4-10`, `src/services/core.ts:29-61` `apiFetch` + `useResource`).

**Stub / Partial:**
- `UptimeCalendarHeatmap` tooltip state exists but render incomplete (hover wiring `onHover` resets null, `tooltip` div positioned absolute — not wired to cell hover coordinates).
- `MTTRTrendChart` has fallback `generateMTTRData()` (random spikes `i==7||18`) when no prop — live `mttrTrend` computed from `incidents.resolution.resolvedAt` but `mtbf` in trend uses `1440/createdInDay` minutes while KPI MTBF uses days (unit mismatch).
- `OutageDetailDrawer` timeline hardcoded `DUMMY_TIMELINE 4 steps` (08:14 detected → 08:45 root cause) — not linked to real incident timeline.
- `SLATargets` `New SLA Target` button is display-only (no `RuleWizard`/modal, no `POST /availability/sla-targets`).

**Missing:**
- Mutation endpoints `POST/PATCH /availability/sla-targets`, `POST /availability/outages` (manual outage entry) — spec in `docs/pages/availability.md` §14 Open Gaps.
- Error budget rollover antar window (`calendar_month → rolling_30d`) — not computed.
- Status Page publish for outages; SLA computation job / daily health aggregator / auto-create outage from P1 incident (all described in `docs/pages/availability.md` §13 but not in `server/jobs/` nor router).

## Primary View — Per Tab

### AvailabilityLayout (shared chrome)

`-m-6 flex flex-col bg-ois-bg` `calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1` accent + `px-6 py-4` title + `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` stats `{SLAs length} · {outages 30d} · {ongoing} ongoing danger · {breached} breached danger · {atRisk} atRisk warning` + tab `nav flex px-4 overflow-x-auto scrollbar-hide` 3 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` + outlet `flex-1 min-h-0 overflow-auto`.

### AvailabilityDashboard (`/availability`)

`flex flex-col gap-6 p-6` — top `flex justify-end` Export `Button secondary sm Download 14` → KPI row → heatmap Card → 2-col `lg:grid-cols-5 gap-4` (trend `lg:col-span-3` 60% / compliance `lg:col-span-2` 40%) → `ConnectedSourcesPanel domain="availability"` → recent outages timeline Card.

**KPI cards:** 4× `KPICard` (`src/components/ui/KPICard.tsx`) — `label text-[11px] uppercase tracking-wider ois-text-muted`, `value` large, `trendBetter high|low`, `subDetail text-xs muted` (see Working above).

**Hero heatmap:** Card header `Service Uptime — Last 90 Days` + Compact toggle `rounded-md border px-2.5 py-1 text-xs font-medium` active `border-primary-300 bg-primary-50 text-primary-700` else `border-gray-200 bg-white text-gray-600` → `UptimeCalendarHeatmap` (`src/components/availability/UptimeCalendarHeatmap.tsx:57-164`) — `getDates(90)` slices `ISO 2026-08-28 - 90d`, `getMonthLabels` per `YYYY-MM` with `toLocaleString month:short UTC`, `indexed[serviceId][date]`, `cellW compact 8 else 12` + `gap 2`, rows per service `w-32 text-right text-xs truncate pr-2` + cells `UptimeCalendarCell` (`13-42`) `w 12/8 h 16/10 rounded-sm hover:opacity-75` + today `ring-2 ring-blue-400 ring-offset-1` + `onClick → navigate(/availability/outages?service=&date=)`, legend `Operational #12B76A Degraded #F79009 Partial #FB923C Major #F04438 Maintenance #0BA5EC No data gray-100`.

**Trend:** Card `MTTR / MTBF / MTRS Trend (30d)` → `MTTRTrendChart` (`MTTRTrendChart.tsx:64-123`) `ResponsiveContainer 100% h=200` + `LineChart margin 8,16,0,0` + `CartesianGrid dash 3 3 #F1F3F7` + `XAxis date tick 10 #98A2B3 interval 6` + `YAxis unit min width 52` + `Tooltip CustomTooltip label+payload min` + `Legend 11px pt 8` + `ReferenceLine y=30 dash 4 4 #F04438 label Target: 30m` + 3 `Line type monotone` MTTR `#F04438 w2`, MTRS `#0BA5EC w2`, MTBF `#12B76A w2` `dot false activeDot r4`.

**Compliance:** Card `SLA Compliance` → `SLAComplianceDonut` (`SLAComplianceDonut.tsx:50-84`) `ResponsiveContainer 100% h=180` + `Pie inner 50 outer 72 paddingAngle 2` `Meeting #12B76A At Risk #F79009 Breached #F04438` + `CenterLabel meeting/total` 18 bold + `Meeting 10px`, `Tooltip` filtered `value>0`, `Legend circle 8 11px` → `ActiveBreachesList` (`ActiveBreachesList.tsx:9-56`) `active.filter status==active` per `AlertTriangle 4 red-500` + `serviceName via slas.find` + `overMinutes (severityRatio-1)*100` + `overPct (ratio-1)*100% red-600 12px` + `triggeringIncidentIds` + `linkedProblemPublicId` → `View all SLAs → /availability/sla` `text-xs primary-600 ArrowRight 12`.

**Recent outages:** Card `Recent Outages — Last 30 Days` + `View all outages → /availability/outages` → `OutageTimeline` (`OutageTimeline.tsx:31-98`) `cutoff 30d` `maxDuration` for bar width `((duration ??60)/maxDuration)*100 min 2%`, per row `flex gap-3 p-2 rounded-md hover:bg-gray-50` `relative time w-16 text-right 12px gray-400 Today/1d ago/Xd ago/Xw ago` + bar `flex-1 h-4 bg-gray-100 rounded overflow-hidden` fill `outageTypeMeta[type].color` ongoing `animate-pulse` + `w-44 serviceName 12px medium + duration Ongoing|Xm|Yh Zm`.

### SLATargets (`/availability/sla`)

`flex flex-col gap-6 p-6` — top `flex justify-end` `Can availability update` → `New SLA Target` `Button primary sm Plus 14` → filter bar `flex-wrap gap-2` Search `Search 14 left-2.5 input h-8 rounded-md border-gray-200 bg-white pl-8 pr-3 text-sm focus:border-primary-400` placeholder `Search...` + `FilterDropdown` service (all + `services.map`) + status `all|meeting|at_risk|breached` + Reset `X 13` if `hasFilters` → stats strip 4 `button rounded-full border px-3 py-1 text-xs font-medium` active `border-primary-300 bg-primary-50 text-primary-700` else `border-gray-200 bg-white hover:bg-gray-50` + count badge `rounded-full px-1.5 py-0.5 text-[10px] font-bold` `bg-primary-100` vs `bg-gray-100` → cards grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` or empty `border-dashed border-gray-200 py-16 No SLAs match + Reset`.

`SLACard` (`SLACard.tsx:19-149`) `rounded-lg border-gray-200 bg-white shadow-sm overflow-hidden borderLeftWidth 4 borderLeftColor statusMeta.color` `p-4 space-y-3` — header `SLAStatusPill size sm` + tier pill `rounded-full px-2 py-0.5 text-xs font-medium` critical `#B42318 #FEF3F2` / important `#DC6803 #FFFAEB` / standard `#475467 #F1F3F7` + `publicId font-mono 12px gray-400` + `serviceName 14px semibold truncate`; target line `Availability target: {target}{unit} · Window: rolling 30 days` `12px gray-500` with `font-medium gray-700`; performance `Current: X unit` + delta `↑ exceeding by D% green-700` vs `↓ below red-600` + bar `h-1.5 bg-gray-100 rounded-full` fill `width performancePct min(target)` green vs red; `ErrorBudgetBar` if `metric==availability` + both consumed/total/remaining defined; meta `User 3 Calendar 3` `ownerName` + `Effective locale` + `Review locale` `12px gray-500 flex-wrap gap-x-4`; breach `border-red-200 bg-red-50 p-3` `AlertTriangle 3.5 red-700 Active Breach` + `Breached at locale` + `Linked ids` + `Open incident border-red-300 bg-white 12px red-700`; actions `Edit History` `border-gray-200 px-2.5 py-1 12px gray-600 hover:bg-gray-50`.

`SLAStatusPill` (`SLAStatusPill.tsx:17-33`) `rounded-full px-2 py-0.5 text-xs|sm` `color slaStatusMeta_avail color bg` + icon `CheckCircle|AlertTriangle|AlertOctagon h-3`.

`ErrorBudgetBar` (`ErrorBudgetBar.tsx:10-55`) `consumedPct consumed/total*100`, `isExhausted >100`, `barWidth min(100)`, `getBarColor >100 #F04438 >80 #FB923C >50 #F79009 else #12B76A`, bar `h-2 rounded-full bg-gray-100` fill + exhausted overlay `Exhausted 9px bold tracking-widest red-700 center`, label `consumed.toFixed(1) of total.toFixed(1) min consumed · remaining.toFixed(1) min remaining (remaining% 0%)` or `overrun` `text-red-600` else `gray-500`.

### Outages (`/availability/outages`)

`flex flex-col gap-6 p-6` — top `flex justify-end gap-2` `Last 90d ▾` + Export `Download 14` secondary sm → filter bar `flex-wrap gap-2` Search + `FilterDropdown` type `(unplanned|planned|partial|detected_only)` + service + severity `P1..P4` + customer `all|yes|no` + Reset if any → stats strip `flex-wrap gap-2` type tabs 5 `All|Unplanned|Planned|Partial|Detected` + severity pills `P1..P4` each `rounded-full border px-3 py-1 text-xs font-medium` active `primary-50` + count badges + `Customer-facing` pill — all toggle on click (severity/customer toggle back to `all` if active) → charts `grid lg:grid-cols-2 gap-4` 2 Cards `px-5 py-4 border-b text-sm semibold` `Outage Volume by Week` + `Outage Causes` → table Card `Outages N results text-xs subtle` `overflow-x-auto`.

Charts: `OutageVolumeBarChart` (`OutageVolumeBarChart.tsx:47-101`) 13 weeks `getStartOfWeek Sun 0` `getWeekLabel short month W ceil(date/7)` buckets `P1..P4 0`, increment by `severity`, `BarChart margin 8,8,0,0` `CartesianGrid dash 3 3 #F1F3F7 vertical false` `XAxis label 9 #98A2B3 interval 1` `YAxis decimals false 10 width 24` `Tooltip 11 radius 6` `Legend 11 pt4` + 4 stacked `Bar stackId a fill P1 #F04438 P2 #FB923C P3 #F79009 P4 #12B76A maxBar 28 h 180`. `OutageCausesPieChart` (`OutageCausesPieChart.tsx:25-63`) `counts[OutageType]`, `total||1`, `chartData name outageTypeMeta label value color pct 0`, `Pie cx 50% cy 45% outer 60 padding 2` + `Cell fill color`, `Tooltip Count + pct%`, `Legend circle 8 11px` h 180.

Table: `table w-full text-sm` `thead border-b bg-ois-surface-muted` `th px-4 py-3 text-left text-xs font-semibold text-ois-text-subtle uppercase tracking-widest` 9 cols `ID Type Service Started Duration Sev Customer? Triggered by Actions` → `tbody divide-y divide-ois-border` per outage `hover:bg-ois-surface-muted` ongoing `bg-red-50` → cells: `publicId font-mono 12px subtle`, `OutageTypeChip size sm` (`OutageTypeChip.tsx:18-34` `rounded-full px-2 py-0.5 text-xs gap-1` `color outageTypeMeta color bg` + icon `AlertOctagon|Calendar|AlertTriangle|Eye h-3`), `serviceName 14px ois-text`, `formatRelative startedAt 14px subtle title ISO`, duration ongoing `inline-flex gap-1.5 text-sm red-600 font-medium` `h-2 w-2 bg-red-500 animate-ping bg-red-400` `ongoing Xm|Yh Zm` vs `formatDuration`, `SeverityBadge P1..P4` (`SeverityBadge` `src/components/ui/StatusSeverityBadges.tsx`), customer `Check 14 green-600` vs `Minus 14 gray-400`, triggered `Link font-mono 12px primary-600 hover:underline /incidents/:id` else `— 12px gray-400`, `View → 12px primary-600` sets `selectedOutage`.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View dashboard KPIs | Open `/availability` | `availability.read` | — |
| Toggle heatmap compact | Button `Compact ✓` in heatmap Card | — | — |
| Drill to outages by cell | Click `UptimeCalendarCell` | `availability.read` | — → `navigate(/availability/outages?service=:id&date=:date)` |
| View all SLAs / outages | Link `View all SLAs` / `View all outages` | `availability.read` | — |
| Create SLA Target | `New SLA Target` `Plus` | `availability.update` (`Can availability update`) | — (stub — no modal) |
| Search/filter SLAs | Input + `FilterDropdown` service/status + stats pills | `availability.read` | — |
| Filter outages | Input + 4 dropdowns + pill taps + Reset | `availability.read` | — |
| View outage detail | Table `View →` / `OutageTimeline` click | `availability.read` | — |
| Export | `Export` / `Last 90d` buttons | `availability.read` | — (UI only) |

## Filters / Sort / Search

- **Dashboard:** no filters; KPIs derived rolling 30d (`incidents.resolution.resolvedAt` + `createdAt` window `Date.now()-30*86_400_000`), `services.uptime30d` avg, `outages endedAt==null`. Time not URL-persisted.
- **SLA:** client `useMemo` — `search` on `serviceName|publicId lower includes`, `statusFilter all|meeting|at_risk|breached`, `serviceFilter all|serviceId`. Stats pills mirror counts via `byStatus`. No sort exposed (grid order = fetch order).
- **Outages:** client — `search publicId|serviceName`, `type all|OutageType`, `service all|id` (initial from `?service=` via `useSearchParams` `searchParams.get('service') ?? all`), `severity all|P1..P4`, `customer all|yes|no`. Stats pills counts `byType`, `sevCounts P1..P4`, `customerFacing`. Sort fixed `startedAt desc` (`sortedOutages` copy sort). URL persists only `service`+`date` via heatmap nav; type/severity/customer not in query.
- **Table:** no column sort, no pagination; `filteredOutages.length` badge shows count. Search input `h-8` same across both pages.

## Detail View — `OutageDetailDrawer`

`OutageDetailDrawer` (`OutageDetailDrawer.tsx:46-215`) props `outage|null`, `isOpen`, `onClose` — overlay `fixed inset-0 z-40 bg-black/30 transition-opacity pointer-events` + drawer `fixed right-0 top-0 z-50 h-full w-[450px] bg-white shadow-2xl transition-transform duration-300 translate-x-full vs 0 overflow-y-auto`.

Header `flex justify-between border-b border-gray-100 p-5` — `publicId mono 12px gray-400` + `serviceName 16px semibold` + badges `OutageTypeChip sm` + severity pill `rounded-full px-2 py-0.5 12px semibold color severityColor P1 #B42318 P2 #DC6803 P3 #B45309 P4 #027A48 bg #FEF3F2` + `Customer-facing blue-50 blue-700` if true + `X 5` close `rounded-md hover:bg-gray-100`.

Body `flex-1 space-y-5 p-5 text-sm`:

- Times `grid-cols-2 gap-3` Started/Resolved `formatDateTime medium+short` / Duration `formatDuration Ongoing|<60 Xm else Yh Zm` / Affected Users `toLocaleString` if defined.
- Root Cause `Root Cause 11px semibold uppercase tracking-wide gray-500` → `rootCauseSummary gray-700` + `rootCauseProblemPublicId link text-xs blue-600 hover:underline → /problems/:id` (via `publicIdToRoute lower`).
- Triggering Incident `Triggering Incident` → link `/incidents/:publicId` blue if `triggeringIncidentPublicId`.
- Resolving Change `Resolving Action` → link `/changes/:publicId` if `resolvingChangePublicId`.
- Preventive Actions `ul space-y-1` per `CheckCircle 3.5 green-500 + text 12px gray-700`.
- Affected CIs `flex-wrap gap-1.5` per `rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono gray-600` from `affectedCIPublicIds`.
- Timeline `Timeline` `ol space-y-3` `DUMMY_TIMELINE 4` `w-5 h-5 rounded-full bg-blue-100 text-[10px] bold blue-700 index+1` + `step.label 12px gray-700` + `step.time 12px gray-400`.

Delegate to [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) when shared available (drawer pattern vs 3-col page).

## State Lifecycle

```
Outage:          ongoing (endedAt == null) → resolved (endedAt + durationMinutes)
                 live duration computed client: floor((now - startedAt)/60000) with pulsing indicator
SLATarget:       meeting → at_risk → breached (derived from currentValue vs target; rolling window)
SLABreach:       active → resolved | acknowledged
                 breachedAt/detectedAt → resolvedAt + durationMinutes
DailyServiceHealth.status: operational → degraded → partial_outage → major_outage → maintenance
ServiceHealthStatus: operational | degraded | partial_outage | major_outage | maintenance (src/types/common.ts)
```

Outage auto-create spec (not yet wired): incident `P1|P2 customerFacing` → `unplanned outage` linked `triggeringIncidentId`; on resolve → `endedAt`. Duplicated in `docs/pages/availability.md` §6 but no job in `server/jobs/`.

Error budget state `consumed/total*100` → `≤50 green #12B76A | ≤80 amber #F79009 | ≤100 orange #FB923C | >100 red #F04438 Exhausted`.

## Permissions (action-level)

| Action | Permission | Who | Notes |
|--------|------------|-----|-------|
| View dashboard/SLA/outages/daily-health/series | `availability.read` | All authenticated (via `availabilityRouter.use('/availability', requirePermission('availability.read'))` `server/routes/availability.ts:11`) | Server `req.scoped` tenant-isolated; scope violation → 403 `scope_violation` |
| Create/edit SLA, manual outage entry | `availability.update` (TBD by tenant) — UI `Can module="availability" action="update"` in `SLATargets.tsx:71` | Owner / Service Owner+ | Stub — no `POST /availability/sla-targets` yet; legacy docs `docs/pages/availability.md §8` says `(TBD by tenant)` |

No `availability.write|delete` separate — single `read` + `update` split. `requirePermission` global via `server/app.ts:126` `withScopedDb` context (`req.tenantId`, `req.permissions`).

## Empty / Loading / Error

- **Empty SLA:** `border-dashed border-gray-200 py-16` `No SLAs match your filters. + Reset filters border-gray-200 px-3 py-1.5` (`SLATargets.tsx:157-166`).
- **Empty outages table:** `colSpan 9 py-12 text-center text-sm gray-400 No outages match your filters.` (`Outages.tsx:397-403`). Type/severity pills still show `0`.
- **Empty heatmap no data:** gray cell `bg-gray-100 rounded-sm w 12/8 h 16/10` per missing `DailyServiceHealth`; services rows still render with name truncated.
- **Empty active breaches:** `flex justify-center py-8 text-sm gray-400 No active SLA breaches` (`ActiveBreachesList.tsx:16-22`). Empty timeline `No outages in last 30 days` (`OutageTimeline.tsx:39-45`).
- **Empty donut:** if `total==0` `chartData` filtered empty → `Pie` empty, center `0/0` still renders.
- **Loading:** `useResource` → `data null` → `?? []` → zero-state renders (no skeleton/shimmer unlike `cmdb` or `incidents` — parity gap).
- **Error:** no banner — failure → silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state).
- **No service data:** `avgUptime30d null → —`, `mttr null → — No resolved incidents in window`, `mtbf null → — No incidents in window`, heatmap `services.map` empty → no rows.

## Phase 2 Deferred

- SLA CRUD `POST/PATCH/DELETE /availability/sla-targets` + `manual outage` `POST /availability/outages` — rationale: current 5 `GET` only (`availability.ts:13-31`).
- Error budget rollover across `calendar_month/quarter → rolling_*` windows.
- Status Page publish `outage.customerFacing → public` workflow (link to `/status`).
- Real daily health aggregator job + SLA rolling computation + P1 auto outage creation (`docs/pages/availability.md §13` jobs — spec only).
- Heatmap tooltip wiring (cell `onHover` → absolute tooltip with `x,y`); cell size persistence + legend toggle.
- Timeline real data (replace `DUMMY_TIMELINE` with `outage.preventiveActions`+incident timeline + change link).
- `mtbf` unit unify (KPI days vs trend minutes) + `mtrs` separate metric (currently mirror `mttr`).
- `Last 90d` time selector + `Export` CSV/PNG (buttons present but no handler).
- Filter URL persist for type/severity/customer + column sort/pagination parity with incidents.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/availability/` + `src/components/availability/` + `docs/pages/availability.md`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1` accent dynamic `#B42318|#DC6803|#12B76A` transition 500ms (`AvailabilityLayout.tsx:33-34`). Jangan ganti ke `Module Layout` lain.
2. **Tabs** `NavLink Activity|Target|AlertOctagon 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` (`AvailabilityLayout.tsx:71-76`).
3. **KPICard** `grid-cols-2 lg:grid-cols-4 gap-4` + `label Avg Uptime (30d)|MTTR (30d)|MTBF (30d)|Active Outages` + `trendBetter high|low` + `subDetail Across N services|Target <30m|>14d|breakdown` (`AvailabilityDashboard.tsx:149-177`).
4. **Heatmap** `UptimeCalendarHeatmap` 90 days `cellW 12 default 8 compact gap 2/0.5 rounded-sm hover:opacity-75` + today `ring-2 ring-blue-400 ring-offset-1` + month labels `short UTC` + legend 5 colors + no-data `bg-gray-100 border-gray-200` (`UptimeCalendarHeatmap.tsx:77-161`, `UptimeCalendarCell.tsx:26-31`). Klik `→ /availability/outages?service=&date=`.
5. **Trend** `MTTRTrendChart` 3 lines `MTTR #F04438 MTRS #0BA5EC MTBF #12B76A w2 dot false` + `ReferenceLine 30m dash #F04438` + `CartesianGrid #F1F3F7` (`MTTRTrendChart.tsx:67-122`).
6. **Donut** `SLAComplianceDonut` `inner 50 outer 72 padding 2` + `CenterLabel 18 bold meeting/total + 10px Meeting` + colors `12B76A|F79009|F04438` (`SLAComplianceDonut.tsx:61-72`).
7. **SLACard** `borderLeftWidth 4 borderLeftColor statusMeta` + performance bar `h-1.5 bg-gray-100` `width performancePct` + `ErrorBudgetBar` thresholds (`SLACard.tsx:38`, `ErrorBudgetBar.tsx:10-15`).
8. **Outage pills** `SLAStatusPill` + `OutageTypeChip` `rounded-full px-2 py-0.5 text-xs gap-1` + severity `SeverityBadge P1..P4` + customer `Check green-600|Minus gray-400` (`SLAStatusPill.tsx:23`, `OutageTypeChip.tsx:24`).
9. **Outage table** `thead bg-ois-surface-muted border-b ois-border` `th px-4 py-3 11px uppercase tracking-widest ois-text-subtle` + row `hover:bg-ois-surface-muted` ongoing `bg-red-50` + pulsing dot `animate-ping bg-red-400` + `font-mono 12px publicId ois-primary` (`Outages.tsx:289-396`).
10. **Drawer** `w-[450px] shadow-2xl duration-300 translate-x` + overlay `bg-black/30 z-40` + section headers `text-xs font-semibold uppercase tracking-wide gray-500` + links `text-xs blue-600 hover:underline → /problems/:id|/incidents/:id|/changes/:id` (`OutageDetailDrawer.tsx:52-62`).
11. **Stats pills** `rounded-full border px-3 py-1 text-xs font-medium` active `border-primary-300 bg-primary-50 text-primary-700` + badge `rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-primary-100` (`SLATargets.tsx:128`, `Outages.tsx:196`).
12. **Colors** keep `dailyHealthColors` + `slaStatusMeta_avail` + `outageTypeMeta` exact hex — jangan map ke token generik tanpa alias.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `availabilityService.outages()` | `GET /api/v1/availability/outages` | `availability.read` | `listByKind<Outage>(tenantId,'outage')` `server/routes/availability.ts:13` |
| `availabilityService.slaTargets()` | `GET /api/v1/availability/sla-targets` | `availability.read` | `listByKind<SLATarget>(...,'sla-target')` `:17` |
| `availabilityService.slaBreaches()` | `GET /api/v1/availability/sla-breaches` | `availability.read` | `:21` all |
| `availabilityService.activeBreaches()` | `GET /api/v1/availability/sla-breaches?active=true` | `availability.read` | `:23` `qBool(req.query.active) ? filter status==active` |
| `availabilityService.dailyHealth()` | `GET /api/v1/availability/daily-health` | `availability.read` | `listByKind<DailyServiceHealth>(...,'daily-health')` `:26` 90d heatmap source |
| `availabilityService.series()` | `GET /api/v1/availability/series` | `availability.read` | `listByKind<AvailabilityDataPoint>(...,'availability-series')` `:30` per `AvailabilityDataPoint` `date|serviceId|uptimePercent|downtimeMinutes|partialDowntimeMinutes|incidentCount` |

All via `src/services/availabilityService.ts:4-11` `apiFetch<'/availability/...'>` + `src/services/core.ts:29-61` `apiFetch`. Tenant-scoped `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Socket: none yet (future `tenant:{tenantId}` health refresh).

## Open Items

- [ ] Add `POST /availability/sla-targets` + `PATCH /:publicId` (`createSLATargetSchema`) + `POST /availability/outages` (manual) — verify `sla-target`/`outage` `kind` mapping in documents repo.
- [ ] Wire heatmap tooltip `UptimeCalendarCell onHover → tooltip {x,y}` (containerRef not used).
- [ ] Replace `DUMMY_TIMELINE` in drawer with real `incidentsService.timeline` + `preventiveActions` + resolving change.
- [ ] Unify `mtbf` units (KPI days vs chart minutes) — decide canonical `minutes` and format `formatDuration`.
- [ ] Confirm `SLABreach` `status 'acknowledged'` is terminal or requires distinct flow (`src/types/availability.ts:67` includes acknowledged vs `docs/pages` only `active|resolved`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/availability.md` + `src/routes/availability/*` + `server/routes/availability.ts` + `src/types/availability.ts` + `src/components/availability/*` + `src/lib/constants.ts` to template features (Layout/Dashboard/SLA/Outages + Drawer) | — |
