# Improvements — Continual Improvement Register (CIR)

Status: **Draft**
Route: `/improvement` (register), `/improvement/kanban` (board), `/improvement/heatmap` (impact-vs-effort), `/improvement/benefits` (ROI tracker), `/improvement/:initiativeId` (detail)
Sidebar: Service Health & Intelligence · Improvements
Source: `src/routes/improvement/ImprovementsLayout.tsx`, `ImprovementRegister.tsx`, `ImprovementKanban.tsx`, `ImprovementHeatmap.tsx`, `BenefitTracker.tsx`, `ImprovementDetail.tsx` · `server/routes/itsm.ts` (`itsmRouter` `/improvements`) · `src/types/improvement.ts` · `src/lib/constants.ts:492-538` · `src/services/itsmServices.ts:118-130` · `src/components/improvement/` (27 files)

---

## Intent

Portfolio **continual improvement** — **satu register untuk menangkap → menilai → approve → validate → realize benefit** setiap inisiatif, dengan jejak ROI yang audit-friendly. SRE/Platform melihat sweet spot high-impact/low-effort di heatmap, Owner men-drive eksekusi via linked Changes, dan CTO memonitor realized vs estimated benefit di BenefitTracker. ITIL 4 Continual Improvement + Measurement & Reporting downstream.

ITIL 4: Improvements = structured backlog of improvement ideas (CIR) lengkap dengan owner, sumber (problem/incident/capacity/DR/audit/proactive), success metrics, effort/cost, dan benefit measurement periodic. Mayoritas yang `approved` dieksekusi via Changes.

---

## Current State (snapshot `src/routes/index.tsx:64-69`, `208-215`)

- `src/routes/index.tsx:64-69` imports `ImprovementsLayout`, `ImprovementRegister`, `ImprovementKanban`, `ImprovementHeatmap`, `BenefitTracker`, `ImprovementDetail`.
- `src/routes/index.tsx:208-213` → `<ImprovementsLayout />` at `/improvement` with children:
  - `index` → `<ImprovementRegister />`
  - `kanban` → `<ImprovementKanban />`
  - `heatmap` → `<ImprovementHeatmap />`
  - `benefits` → `<BenefitTracker />`
- `src/routes/index.tsx:215` → `<ImprovementDetail />` at `/improvement/:initiativeId` (outside tab layout, full-page with pinned header + 2-col body).
- Layout: `src/routes/improvement/ImprovementsLayout.tsx:17-112` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1 shrink-0 transition-colors duration-500` accent `criticalBlocked>0 #B42318 : overdue>0 #DC6803 : realized≥50%estimate #12B76A : #1F4FD4` + title `Improvements text-xl font-bold ois-text` + stats row `text-xs ois-text-muted flex-wrap` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab bar 4 `NavLink` (`ListChecks 14`, `KanbanSquare 14`, `Grid3x3 14`, `DollarSign 14`, active `border-ois-primary text-ois-primary` else muted hover) — `Outlet` owns scroll `flex-1 min-h-0`.
- Components: `ImprovementRow`, `ImprovementStatusPill`, `ImprovementCategoryChip`, `ImprovementPriorityDot`, `ImprovementProgressBar`, `BenefitTypeChip`, `ROISummaryPanel`, `KanbanBoard/Column/Card/DragDropProvider`, `HeatmapView/BubbleMatrix/BubbleNode/PortfolioSummaryStrip/HeatmapGapAnalysis`, `BenefitTracker/CumulativeBenefitChart/BenefitByTypeDonut/TopContributorsList/BenefitMeasurementTable/LogBenefitModal/ROICalculator`, `ImprovementDetail/OverviewTab/ProgressTab/MetricsTab/ROITab/LinkedItemsTab/UpdatesTab` (`src/components/improvement/` — 27 files).
- API: `itsmRouter` (`server/routes/itsm.ts:343-392`) — 8 endpoints under `/improvements` via `listByKind`/`findByPublicId`/`findByKey`/`upsertDocument` + `requirePermission('improvement.read'|'improvement.write')`. Totals/ROI computed inline, no write for initiative yet.
- Types: `ImprovementStatus` 8 (`identified|evaluating|approved|in_progress|validating|completed|on_hold|cancelled`), `ImprovementCategory` 8 (`reliability|performance|security|process|cost|compliance|customer_experience|developer_experience`), `ImprovementPriority` 4 (`critical|high|medium|low`), `BenefitType` 6 (`cost_reduction|revenue_protection|efficiency_gain|risk_reduction|compliance_value|quality_improvement`), `ImprovementInitiative` core + `ImprovementUpdate` (5 types) + `BenefitMeasurement` + `ROICalculation` (`src/types/improvement.ts:1-129`).
- Constants: `improvementStatusMeta` (`src/lib/constants.ts:496-505` color `identified #475467 #F1F3F7` / `evaluating #0BA5EC #F0F9FF` / `approved #6941C6 #F4F3FF` / `in_progress #DC6803 #FFFAEB` / `validating #0BA5EC` / `completed #067647 #ECFDF3` / `on_hold #475467` / `cancelled #B42318 #FEF3F2` + `dot` + `column` -1 for hold/cancel), `improvementCategoryMeta` (`507-516` 8 with `Shield|Zap|ShieldCheck|GitBranch|DollarSign|CheckSquare|Heart|Code2` + color `#0BA5EC|#DC6803|#B42318|#6941C6|#067647|#475467|#B42318|#0BA5EC`), `improvementPriorityMeta` (`518-523` critical `#B42318 #FEF3F2` / high `#DC6803 #FFFAEB` / medium `#0BA5EC #F0F9FF` / low `#475467 #F1F3F7`), `benefitTypeMeta` (`525-532` 6 with `TrendingDown|ShieldCheck|Clock|Shield|CheckSquare|Star`), `formatBenefitUSD` (`534-538` `≥1M $X.XM | ≥1k $Xk | $X`).
- Services: `improvementsService` (`src/services/itsmServices.ts:118-130`) — `list()`, `get(publicId)`, `getByAnyId(id)`, `totalEstimatedBenefitUSD()`, `totalActualBenefitUSD()`, `benefitMeasurements()`, `createBenefitMeasurement(input)`, `roiCalculations()`, `roiCalculation(initiativeId)` all via `apiFetch('/improvements/...')` + `src/services/core.ts:29-61` `apiFetch`/`useResource` (no mock fallback).
- RBAC: `improvementResource` (`src/lib/rbac/improvementResource.ts:5-9` → `{ ownerTeamId, ownerUserId }` with inheritance via `engine.ts`), `permissionRules` (`src/lib/rbac/permissions.ts:375-403` — `imp-read` all IT div `STA|IFM|APS` scope `all`, `imp-create` officer+ `STA|IFM|APS` scope `all`, `imp-update-aps` `APS officer scope team_app` + inheritance, `imp-update-ifm` `IFM officer scope all`).

**Working:**
- Layout: header stats via `useResource(() => improvementsService.list())` `data ?? []` — `activeCount filtered !completed|cancelled`, `inProgressCount`, `totalEstimated sum estimatedBenefit.annualValueUSD`, `totalActual sum actualBenefitUSD`, `overdue notifies targetCompletionDate < today && !completed|cancelled`, `criticalBlocked priority critical && status on_hold` → accent + conditional counts `overdue danger #F04438` / `criticalBlocked danger`. Tab bar 4 NavLink active `border-ois-primary`.
- Register: KPI strip 4 grid `Portfolio value (est.) totalEstimated formatted $Xk/M`, `In progress inProgressCount`, `Completed (12 months) completed all`, `Actual benefit realized totalActual`. Filter bar `flex-wrap gap-2` search `Search 14 left-2.5 input h-9 w-52 pl-8 border-ois-border` placeholder `Search initiatives...` on `title|publicId|ownerName|tags lower includes` + 4 `FilterDropdown` status (8) / category (8) / priority (4) / owner (distinct ownerId→name) + Reset `X 12 danger`. Quick chips 4 `rounded-full border px-3 py-1 text-xs font-semibold` active `bg-ois-primary white` else `bg-ois-surface muted border-ois-border hover:primary` — `🔥 High/Critical (critical|high count)`, `⏱ Overdue target`, `📡 My initiatives (LOGGED_IN_USER hardcode u-001)`, `💰 High ROI (>1000% count)`. Status tabs row `flex gap-1 border-b border-ois-border overflow-x-auto` — `All N` + per status `count>0` only `px-3 py-2 text-xs font-semibold border-b-2 -mb-px` active `border-ois-primary primary`. Sort default `PRIORITY_ORDER critical0→low3` → `STATUS_ORDER in_progress0→validating1→approved2→evaluating3→identified4→on_hold5→completed6→cancelled7` → `targetCompletionDate asc 9999 fallback`. Table 9 cols `Initiative|Status|Category|Priority|Progress|Est. Benefit|Owner|Target|⋯` with `ImprovementRow per filtered filtered.length>0 else empty`. Action row `flex justify-end px-6 py-2.5 border-b border-ois-border bg-ois-surface` → `Can improvement create` → `+ New initiative Button primary sm gap 1.5 Plus 14` (no form wired). Row click would `navigate /improvement/:publicId` (via `onOpen` passed to `ImprovementRow`).
- Kanban: filter bar 3 `FilterDropdown` category/owner/priority + Reset + action row `flex justify-between px-6 py-2.5 border-b border-ois-border bg-ois-surface` left `N of M initiatives shown text-xs muted` right `+ New Button primary sm Plus 14` (stub). Board `KanbanBoard` 8-column by `improvementStatusMeta column` — columns `identified→evaluating→approved→in_progress→validating→completed` + `on_hold`/`cancelled` at `column -1` (verify via `KanbanBoard.tsx` — columns map via `improvementStatusMeta` sorted `column asc` filtered `column>=0` else overflow columns). Each `KanbanColumn` header `StatusPill + count` + `KanbanCard per initiative` (title, `ImprovementPriorityDot`, owner, target date `text-xs`, `ImprovementProgressBar`, benefit chip). Drag wiring via `KanbanDragDropProvider` (HTML5 sortable context, `onNavigate publicId → /improvement/publicId`). Filter `filteredInitiatives` client `useMemo` by category/owner/priority only.
- Heatmap: filter bar 3 `FilterDropdown` status filter (`active default not completed|cancelled | all | single in_progress|approved|completed`) + sizeBy (`benefit|effort|roi`) + colorBy (`priority|category|status`). Main `flex gap-5 items-start` left `flex-1 min-w-0 space-y-4` `BubbleMatrix + PortfolioSummaryStrip` right `w-[280px] shrink-0` `HeatmapGapAnalysis`. `BubbleMatrix` scatter X `effort estimatedEffortDays` Y `benefit estimated or actual USD` bubble size by selected metric, color by selection. Portfolio strip `actualBenefitUSD vs estimated` summary. Gap analysis sidebar sweet spot quadrant (low effort high impact) list.
- BenefitTracker: action row `flex justify-end px-6 py-2.5 border-b border-ois-border bg-ois-surface` error `text-xs ois-danger` + `Log measurement Button primary sm Plus 14 gap 1.5` → `LogBenefitModal` (initiatives select + period + benefitType + measuredValueUSD + isEstimate + methodology). Top `flex gap-5 items-start` left `flex-1` `CumulativeBenefitChart measurements+initiatives` right `w-[38%] space-y-4` stacked `BenefitByTypeDonut + TopContributorsList`. Below `Benefit measurements h2 14px bold uppercase tracking-widest` + `BenefitMeasurementTable` (Initiative · benefit type · period · measured USD · isEstimate flag · methodology) + `ROICalculator` interactive (`implementationCost|ongoingMonthlyCost|total12|projected|actual|roi|payback|npv5|pessimistic|optimistic`). Data via `useResource improvementsService.list + benefitMeasurements` `?? []`; `handleLogSubmit Partial<BenefitMeasurement>` → `createBenefitMeasurement` → `refreshMeasurements()` + close modal, on failure set `saveError`.
- Detail: `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` pinned header `bg-white border-b shrink-0 z-30` nav row `flex justify-between px-6 py-2 border-b` `← Register ArrowLeft 15 muted→text hover` + right `ImprovementStatusPill + MoreVertical 16 border rounded-lg bg-white muted`; entity header `flex items-start gap-0` left `w-1 self-stretch priorityMeta.color critical #B42318 high #DC6803 medium #0BA5EC low #475467` + `flex-1 px-6 py-4` `publicId mono 12 muted + ImprovementCategoryChip` row, `h1 text-xl font-bold ois-text title`, meta `ImprovementPriorityDot + priority label colored + Owner bold + Started/Target format Mmm d yyyy Clock`. Body `flex flex-1 min-h-0` center `flex-1 min-w-0 flex-col` tab bar `border-b bg-white shrink-0 px-6 nav flex gap-8 overflow-x-auto scrollbar-hide` 6 `button py-4 px-1 border-b-2 whitespace-nowrap` active `border-ois-primary primary font-bold` else `border-transparent muted hover:text hover:border-strong` labels `Overview|Progress|Metrics|ROI|Linked Items|Updates (N)` → scrollable `flex-1 overflow-y-auto px-6 py-5` per `OverviewTab|ProgressTab|MetricsTab|ROITab|LinkedItemsTab|UpdatesTab`. Right `w-[280px] border-l bg-white p-4 space-y-4 overflow-y-auto` — `SectionCard At a glance` rows `Status|Priority|Category|Progress w-24 ImprovementProgressBar|Owner|Started|Target` `text-xs flex justify-between`, `ROISummaryPanel initiative+roiCalc onViewROI → setActiveTab roi`, `SectionCard Quick actions` — `Can improvement update resource=improvementResource(initiative)` primary `Log update bg-ois-primary white hover:primary-hover` → `setActiveTab updates` else fallback italic `View-only — only the owning team can log updates.`, `Move to Kanban ArrowRight 11 border-ois-border hover:bg-ois-surface-muted`, divider `border-t` + disabled `Mark as complete border opacity-40 cursor-not-allowed`. Updates log local `handleLogUpdate body+pct → progressBefore/After + ImprovementUpdate progress_update author u-001 Sarah Chen now` `setInitiative {progressPercent:pct, updates:[new,…]}` (optimistic local, not persisted).
- All data via `useResource(() => improvementsService.list|getByAnyId|totalEstimated|totalActual|benefitMeasurements|roiCalculation)` `data ?? []|undefined` with no mock fallback (`src/services/itsmServices.ts:118-130`, `src/services/core.ts:29-61`). Tenant-isolated via `req.tenantId` + `listByKind<ImprovementInitiative>(tenant,'improvement')` (`server/routes/itsm.ts:344`).

**Stub / Partial:**
- Register `+ New initiative` and Kanban `+ New` buttons render but have no `onClick → CreateInitiativeModal` nor `POST /improvements` wiring; `LOGGED_IN_USER = 'u-001'` hardcoded (should be `user.id` from `useCurrentUser`).
- Register status counts `statusTabCounts` uses `visibleImprovements` (already `filterReadable`) correct, but Kanban/Heatmap owner options ignore `filterReadable` (uses full `mockImprovements`).
- Kanban drag-drop visual via `KanbanDragDropProvider` exists but does not `PATCH /improvements/:id/status` persist — state-only reorder, revert on refresh (legacy `docs/pages/improvements.md §16 Open Gaps` confirms).
- Heatmap `BulkMatrix` `sizeBy/colorBy` state wired but legacy spec `BubbleMatrix` axes configurable — `statusFilter===active` hides `completed|cancelled` but no `on_hold` separate handling.
- BenefitTracker `ROICalculator` is interactive UI (scenario sliders) but not connected to realized `benefitMeasurements` actual data for validation.
- Detail `handleLogUpdate` appends local `ImprovementUpdate` `progress_update` only; no `POST /improvements/:publicId/updates` nor `server/routes/itsm.ts` write endpoint; `UpdatesTab onAddUpdate={() => {}}` is no-op; `Mark as complete` button disabled stub (`cursor-not-allowed opacity-40` with no status check).
- `ImprovementHeatmap` `PortfolioSummaryStrip` receives `totalActual` from `totalActualBenefitUSD()` which server computes via `(i as any).actualBenefit?.annualValueUSD` (`server/routes/itsm.ts:352-354` `actualBenefit` nested vs `actualBenefitUSD` flat — key mismatch causes `0` until aligned).
- `itsmRouter GET /improvements/totals/actual` aggregates `actualBenefit.annualValueUSD` not `actualBenefitUSD` (field name drift vs `ImprovementInitiative actualBenefitUSD?` in `src/types/improvement.ts:58`).

**Missing:**
- Mutation endpoints `POST /improvements`, `PATCH /improvements/:publicId` (update + `PATCH .../status` with transition validation), `POST /improvements/:publicId/updates` (comments/progress/linkage), `POST /improvements/:publicId/link` (change/metric/incident/problem) — spec in `docs/pages/improvements.md §14` and `design/02-api-contract.md` aspirational but not in `server/routes/itsm.ts` nor `itsmServices`.
- Full 1-click source-from-PIR flow `POST /improvements/from-incident|problem|capacity|dr` with `sourceType` + linkedPublicIds auto-populated (legacy gap §16).
- Kanban persist `PATCH /improvements/:id/status {fromStatus,toStatus}` with 403 on invalid transition.
- Overdue scanner job (mark/notify when `targetCompletionDate < today && status not completed|cancelled`) + benefit aggregator quarterly rollup for Measurement dashboard (`docs/pages/improvements.md §15 Realtime/Jobs` planned).
- Pagination `?page&pageSize` wiring for `GET /improvements` (server supports `parsePagination` via `listByKind(tenant,kind,pagination)` but register table does not call with `?page` — client holds all in memory, sorts locally).
- Export CSV/PNG for register + heatmap + BenefitTracker charts; Saved filter views & multi-sort URL persist (`?q=&status=&category=&priority=&owner=`).

---

## Primary View — Per Tab

### ImprovementsLayout (shared chrome)

`-m-6 flex flex-col bg-ois-bg` `calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1` accent `transition-colors duration-500` + `px-6 py-4` title `Improvements 20px bold ois-text` + `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` stats `{activeCount} active bold · {inProgressCount} in progress · ${totalEstimated} estimated bold · ${totalActual} realized YTD semibold success vs warning/danger if overdue/criticalBlocked` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab `nav flex px-4 overflow-x-auto scrollbar-hide` 4 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` + outlet `flex-1 min-h-0`.

Accent rule (`ImprovementsLayout.tsx:37-41`):
```ts
accentColor =
  criticalBlocked > 0 ? '#B42318' :
  overdueCount > 0    ? '#DC6803' :
  totalActual > 0 && totalActual >= totalEstimated * 0.5 ? '#12B76A' :
  '#1F4FD4'
```
Jangan ganti threshold tanpa update register docs.

### ImprovementRegister (`/improvement` index)

`flex flex-col flex-1 min-h-0` — action row `shrink-0 flex justify-end px-6 py-2.5 border-b border-ois-border bg-ois-surface` + scrollable `flex-1 overflow-y-auto max-w-screen-2xl mx-auto px-6 py-5 space-y-6 pb-12`.

**Action row:** `Can module="improvement" action="create"` → `Button variant primary size sm gap 1.5` `Plus 14 New initiative` (no handler yet).

**KPI strip:** `grid grid-cols-2 lg:grid-cols-4 gap-3` 4× `border border-ois-border rounded-lg bg-ois-surface p-3` label `text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest mb-1` + value `text-xl font-bold text-ois-text` formatted `${formatBenefitUSD}` for benefit cards (reuse `capacity/avail KPICard` tone).

**Filter bar:** `flex flex-wrap gap-2 items-center` search `relative Search 14 absolute left-2.5 center text-ois-text-muted` + `input pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-ois-surface focus:ring-1 focus:ring-ois-primary w-52` placeholder `Search initiatives...` (keys `title|publicId|ownerName|tags`) + 4× `FilterDropdown` (`All statuses|All categories|All priorities|All owners`) + Reset `X 12 text-xs muted→danger` if `hasFilters`. `FilterDropdown` pattern shared [`_shared/filter-sort-export.md`](../_shared/filter-sort-export.md).

**Quick chips:** `flex flex-wrap gap-2` 4 `button px-3 py-1 rounded-full text-xs font-semibold border` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary hover:text-ois-primary`:
- `🔥 High/Critical (N)` `priority critical|high`
- `⏱ Overdue target (N)` `targetCompletionDate < TODAY && !completed|cancelled`
- `📡 My initiatives (N)` `ownerId === LOGGED_IN_USER` (hardcode `u-001` — Open Item)
- `💰 High ROI (N)` `estimatedROIPercent > 1000`

**Status tabs:** `flex gap-1 border-b border-ois-border overflow-x-auto` — `All N` + 8 `ALL_STATUSES filtered count>0` each `px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px capitalize` active `border-ois-primary text-ois-primary`. Counts via `statusTabCounts` `useMemo` `visibleImprovements.filter status`.

**Table:** `border border-ois-border rounded-lg overflow-hidden` `table w-full text-sm` header `bg-ois-surface-muted/50 border-b border-ois-border text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` cols `Initiative|Status|Category|Priority|Progress|Est. Benefit|Owner|Target|⋯` (`px-4 py-2.5`) → `tbody divide-y divide-ois-border` rows `ImprovementRow onOpen navigate /improvement/{publicId}` (row renders `ImprovementPriorityDot + publicId mono 12 muted + title semibold 14 + ImprovementStatusPill + ImprovementCategoryChip + ImprovementProgressBar w-24 sm + benefit USD + owner 14 muted + target locale MMM d yyyy Danger if overdue`). Hover `hover:bg-ois-surface-muted`.

Empty: `flex flex-col items-center py-16 gap-3 text-center border border-ois-border rounded-lg bg-ois-surface` `No initiatives match.` `14 medium ois-text` + `Reset filters text-sm primary underline` + divider `text-ois-text-muted` + `Add initiative 14 semibold primary Plus 14 underline`.

### ImprovementKanban (`/improvement/kanban`)

`flex flex-col flex-1 min-h-0` — action row `shrink-0 flex justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface` left `text-xs ois-text-muted "X of Y initiatives shown"` right `Button primary sm Plus 14 New` + scrollable `flex-1 overflow-y-auto max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12`.

**Filter bar:** `flex flex-wrap gap-2 items-center` 3× `FilterDropdown` (`All categories` 8 + `All owners` distinct + `All priorities` 4) + Reset `X 12 danger` if `hasFilters`.

**Board:** `KanbanBoard` props `initiatives filteredInitiatives  useMemo client filter category|owner|priority` + `benefitMeasurements` + `onNavigate publicId → /improvement/:publicId`. Columns ordered by `improvementStatusMeta[s].column` `0..5` (`identified→evaluating→approved→in_progress→validating→completed`); `on_hold` & `cancelled` `column -1` rendered as overflow/secondary columns (or hidden until dragged). Each `KanbanColumn` header `StatusPill + count text-xs` + scrollable stack `gap-3` `KanbanCard per initiative` card `border border-ois-border rounded-lg bg-ois-surface p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow` with priority accent top `h-1 rounded-t` `improvementPriorityMeta color`, title `text-sm font-semibold line-clamp-2`, `ImprovementCategoryChip sm` + `ImprovementPriorityDot`, owner `text-xs muted`, target `text-xs gray` overdue `text-ois-danger font-medium`, `ImprovementProgressBar showLabel`. Drag via `KanbanDragDropProvider` (optimistic local; no `PATCH /improvements/:publicId/status` persist — Phase 2).

### ImprovementHeatmap (`/improvement/heatmap`)

`flex flex-col flex-1 min-h-0` — action row `shrink-0 flex justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface` `text-xs ois-text-muted "N initiatives displayed"` + scrollable `flex-1 overflow-y-auto max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12`.

**Filter bar:** `flex flex-wrap gap-2 items-center` 3× `FilterDropdown`: status `Active (not completed/cancelled) default | All statuses | In Progress | Approved | Completed` + sizeBy `Size by: Est. Benefit|Effort (days)|ROI %` + colorBy `Color by: Priority|Category|Status`.

**Layout:** `flex gap-5 items-start` left `flex-1 min-w-0 space-y-4` right `w-[280px] shrink-0`.

- **BubbleMatrix** (`HeatmapView/BubbleMatrix.tsx`): scatter 400×360 SVG/card `border border-ois-border rounded-lg bg-ois-surface p-4` axes X `Effort (estimatedEffortDays)` Y `Impact (estimatedBenefit annualValueUSD or actualBenefitUSD if completed)` — bubble `BubbleNode` `cx,cy,r,color,publicId` with radius scaled by `sizeBy` (`benefit Math.min 32 | effort 8-24 | roi percent clamped`). Color mapping: `priority critical #B42318 high #DC6803 medium #0BA5EC low #475467` or `category improvementCategoryMeta color` or `status improvementStatusMeta color`. Hover tooltip `publicId + title + benefit + effort + ROI%` + click → detail (currently not wired — Open Item). Filtered by `statusFilter active excludes completed|cancelled`.
- **PortfolioSummaryStrip** (`PortfolioSummaryStrip.tsx`) props `initiatives filtered + actualBenefitUSD totalActual`: strip `flex gap-4 text-xs ois-text-muted` KPIs `Total estimated ${formatBenefitUSD sum}` · `Avg ROI%` · `Avg effort days` · `Realized ${formatBenefitUSD totalActual}` + realized `width progress totalActual/totalEstimated`.
- **HeatmapGapAnalysis** (`HeatmapGapAnalysis.tsx`) `w-[280px] p-4 border border-ois-border rounded-lg bg-ois-surface`: header `Gap Analysis 11px bold uppercase tracking-widest muted` + sweet spot callout `border-amber-200 bg-amber-50 rounded-lg p-3` `Top-right = low effort high impact` + list `Top sweet-spot candidates sorted impact/effort desc` per `publicId link → /improvement/:publicId` with `benefit USD + effort d + ROI%`. Counts: `Urgent quick-wins count`, `Needs evaluation identified|evaluating`.

### BenefitTracker (`/improvement/benefits`)

`flex flex-col flex-1 min-h-0` — action row `shrink-0 flex justify-end gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface` error `text-xs ois-danger` if `saveError` + `Button primary sm Plus 14 Log measurement onClick showLogModal` + scrollable `flex-1 overflow-y-auto max-w-screen-2xl mx-auto px-6 py-5 space-y-6 pb-12` → modal `LogBenefitModal fixed`.

**Top 60/40:** `flex gap-5 items-start` left `flex-1 min-w-0` right `w-[38%] shrink-0 space-y-4`.
- **CumulativeBenefitChart** (`CumulativeBenefitChart.tsx`) `measurements+initiatives`: `ResponsiveContainer 100% h 240` `LineChart` cumulative `cumulativeValueUSD` vs date `measurementDate` sorted asc, X `periodLabel|measurementDate MMM yyyy` `11px #667085`, Y `USD formatted $k/M` `11px`, line `monotone #1F4FD4 w2 dot false` `ReferenceLine estimated total dotted #98A2B3`. Legend `Measured vs Estimate`. Tooltip `cumulative USD + period`. Empty `No measurements yet`.
- **BenefitByTypeDonut** (`BenefitByTypeDonut.tsx`) `initiatives`: counts by `estimatedBenefit.primaryType` 6 `BenefitType` mapped `benefitTypeMeta color #067647|#0BA5EC|#6941C6|#DC6803|#475467|#0BA5EC` `Pie inner 48 outer 72 paddingAngle 2` `CenterLabel total benefit $M`.
- **TopContributorsList** (`TopContributorsList.tsx`) `initiatives`: ranked by `actualBenefitUSD ?? estimatedBenefit.annualValueUSD` desc top 5 `flex justify-between text-sm` `publicId mono link + title truncate + ${formatBenefitUSD}` with `BenefitTypeChip` + owner.

**Measurement table:** `h2 text-sm font-bold text-ois-text uppercase tracking-widest Benefit measurements` + `BenefitMeasurementTable` `measurements+initiatives` columns `Initiative (link publicId) | benefit type BenefitTypeChip | period measurementDate locale | measured value font-mono USD | isEstimate badge amber if estimate else emerald Actual | methodology tooltip` sorted `measurementDate desc`. `initiatives` appended for `initiativePublicId` resolution via `initiatives.find id===initiativeId`.

**ROI calculator:** `ROICalculator` standalone `border border-ois-border rounded-lg bg-ois-surface p-4 space-y-3` inputs `Implementation cost | Ongoing monthly | 12m total auto | Projected annual benefit | Actual to-date | ROI12m% | Payback months | NPV5y | pessimistic|optimistic bounds` scenario sliders (no prop `roiCalc` — static demo values derived from first `initializedAt` metric). Wiring to ` BenefitMeasurement cumulative` vs `ROICalculation` not yet validated (Phase 2).

**LogBenefitModal:** (`LogBenefitModal.tsx` `open initiatives onClose onSubmit`) fields `Initiative * select publicId — title` + `Measurement date * date` + `Period label optional` + `Benefit type * select 6` + `Measured value USD * number` + `isEstimate checkbox` + `Supporting metric optional` → `onSubmit Partial<BenefitMeasurement>` → parent `improvementsService.createBenefitMeasurement input` → `refreshMeasurements()` + `setShowLogModal false` on success else inline `saveError text-xs danger` banner.

---

## Detail View (`/improvement/:initiativeId`)

`src/routes/improvement/ImprovementDetail.tsx:49-251` — full-page `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)`.

### Pinned header

- Nav row `flex justify-between px-6 py-2 border-b border-ois-border bg-white`: left `← Register ArrowLeft 15 text-ois-text-muted→text hover` `navigate /improvement`, right `ImprovementStatusPill + MoreVertical 16 border rounded-lg bg-white muted hover:bg-ois-surface-muted`.
- Entity header `flex items-start gap-0` left `w-1 self-stretch shrink-0 priorityMeta.color` + `flex-1 px-6 py-4`: row `font-mono text-xs font-semibold text-ois-text-muted publicId + ImprovementCategoryChip`, `h1 text-xl font-bold text-ois-text title leading-tight`, meta `flex items-center gap-3 mt-2 text-xs text-ois-text-muted flex-wrap` `ImprovementPriorityDot + label priorityMeta.color semibold` `· Owner bold ois-text` `· Started MMM d yyyy` `· Target MMM d yyyy`.

Data load: `useResource getByAnyId(initiativeId) dep [initiativeId]` (`findByPublicId else findByKey`) + `roiCalculation(loadedInitiative.id) dep [loadedInitiative.id]`; local `initiative state` copies `loadedInitiative` via `useEffect` for optimistic `progressPercent` patch.

```
← Register | StatusPill | ⋯
[priority-color stripe] publicId · categoryChip
Title (xl bold)
priorityDot label · Owner · Started · Target
┌─────────────────┬────────────────────────┬────────────────┐
│ Left: At a      │ Center tabs (6)        │ Right rail     │
│  glance         │ Overview/Progress/     │ ROI summary    │
│  (280px)        │ Metrics/ROI/Linked/    │ Quick actions  │
│                 │ Updates(N)             │                │
└─────────────────┴────────────────────────┴────────────────┘
```

### Center tabs (6) `tabsWithCount` Updates `(N)`

- Tab bar `border-b bg-white shrink-0 px-6 nav flex gap-8 overflow-x-auto scrollbar-hide` `button py-4 px-1 border-b-2 whitespace-nowrap text-sm font-medium` active `border-ois-primary text-ois-primary font-bold`.

| Tab | Component | Isi |
|-----|-----------|-----|
| **Overview** | `OverviewTab` | `currentStateDescription` + `targetStateDescription` two-col `border border-ois-border rounded-lg p-4` + `Success metrics` table current→target→achieved with `unit` + `Benefit description` + `Effort/Cost/ROI estimates row 3 cards` |
| **Progress** | `ProgressTab initiative onLogUpdate` | timeline `improvement.update log` + header `ImprovementProgressBar percent showLabel size lg` + metric achievement badge + inline `Log update textarea + pct slider 0-100 + Submit` → `handleLogUpdate body+pct` |
| **Metrics** | `MetricsTab` | per `successMetrics[]` card `metricName + currentValue → targetValue (unit)` + gauge `achievedValue/targetValue *100` else `—` + `ImprovementProgressBar` per metric |
| **ROI** | `ROITab initiative roiCalc` | financial diff `Planned vs Realized`: `estimatedCostUSD vs actualCostUSD`, `estimatedBenefit annualValueUSD vs actualBenefitUSD`, `estimatedROIPercent vs actualROIPercent`, `paybackMonths`, `NPV5yr USD`, `pessimistic/optimistic bounds`; `ROICalculation` from `GET /improvements/:initiativeId/roi` or `null` → `—` |
| **Linked Items** | `LinkedItemsTab` | per `sourceType` conditional: `problem incident capacity_recommendation dr_finding audit proactive` → rows `Link /problems/:publicId|/incidents/:publicId|/capacity + /changes/:publicId list tagLink + /measurements catalog/:publicId` + `linkedChangePublicIds[]` + `linkedMetricPublicIds[]` + tags chips |
| **Updates** | `UpdatesTab initiative onAddUpdate` | audit trail `ImprovementUpdate[]` grouped date desc filter `all|status_change|progress_update|comment|metric_update|linkage_added` + composer `textarea + type select 5` → `onAddUpdate` (currently `() => {}` no-op). Each entry `dot #B42318|#0BA5EC|#475467` + `type label mut` + `body + progressBefore→progressAfter` + `author timestamp formatRelative` |

### Right sidebar `w-[280px] border-l bg-white p-4 space-y-4 overflow-y-auto`

**At a glance** `SectionCard title At a glance` (`border border-ois-border rounded-lg bg-ois-surface overflow-hidden` header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] semibold muted uppercase tracking-widest`) rows `flex justify-between gap-2 text-xs` `Status Pill | Priority colored label | Category chip | Progress w-24 bar | Owner | Started | Target` with `formatDate Mmm d yyyy`.

**ROI Summary** `ROISummaryPanel initiative roiCalc onViewROI setActiveTab roi` card `border border-ois-border rounded-lg bg-ois-surface overflow-hidden p-4 space-y-2 text-xs` rows `Est. Benefit ${formatBenefitUSD} confidence | Actual USD | Est. Cost | Actual Cost | Est. ROI% | Actual ROI%` colored `>1000 emerald` progress payaback `months`.

**Quick actions** `SectionCard Quick actions` `space-y-1.5`:
- `Can improvement update resource={improvementResource(initiative)} fallback italic View-only — only the owning team can log updates.` → primary `Log update bg-ois-primary white hover:bg-ois-primary-hover` `px-3 py-2 rounded-lg text-xs font-medium` → `setActiveTab updates`
- `Move to Kanban ArrowRight 11 border-ois-border hover:bg-ois-surface-muted Link /improvement/kanban` `12 muted`
- divider `border-t` + disabled `Mark as complete border-ois-border text-ois-text-muted opacity-40 cursor-not-allowed` (no active state check).

SectionCard pattern refs [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md).

---

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View register | Open `/improvement` | `improvement.read` | — |
| View kanban | Tab `Kanban` `/improvement/kanban` | `improvement.read` | — |
| View heatmap | Tab `Heatmap` `/improvement/heatmap` | `improvement.read` | — |
| View benefit tracker | Tab `Benefits` `/improvement/benefits` | `improvement.read` | — |
| View detail | Row click / bubble click / Kanban card click → `/improvement/:publicId` | `improvement.read` scoped `filterReadable + improvementResource` | exists |
| Create initiative | `+ New initiative` / Kanban `+ New` | `improvement.create` (`Can improvement create` — any IT officer+ `STA|IFM|APS`) | — (stub — no modal yet) |
| Log benefit measurement | `Log measurement` → `LogBenefitModal` → `createBenefitMeasurement()` | `improvement.write` (`requirePermission('improvement.write')`) | initiative exists |
| Log progress update | Detail `Log update` → Progress/Updates tab composer | `improvement.update` (`Can update resource=improvementResource` — `APS team_app with inheritance` OR `IFM all` OR superadmin) | not `completed|cancelled` (should guard, currently not) |
| Drag kanban | `KanbanDragDropProvider` drag card column→column | `improvement.update` | not `completed|cancelled` (should guard) — now local-only |
| Search/filter | Filter bar + quick chips + status tabs | `improvement.read` | client-side |
| Export | (Phase 2) | `improvement.read` | — |

Delegate ke [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md), [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md), [`_shared/entity-timeline.md`](./_shared/entity-timeline.md) saat shared tersedia.

---

## Filters / Sort / Search

- **Register search:** `search state` on `title|publicId|ownerName|tags some includes lower` (`ImprovementRegister.tsx:110-118`) — client-side `useMemo` derived `visibleImprovements.filter`, no debounce, case lower. Omits `description` (legacy gap vs full `docs/pages/improvements.md` would include title only).
- **Status filters (3 layers):**
  - `activeStatusTab all|8 status` tabs bar (counts>0 only) → `result.filter s===tab`
  - `statusFilter FilterDropdown All statuses|8 status` → `result.filter s===statusFilter`
  - Both apply sequentially (double restrict — bug should OR, but impl layers additive).
- **Category / Priority / Owner FilterDropdowns:** `categoryFilter 8|all` on `category===filter`, `priorityFilter 4|all`, `ownerFilter dynamic distinct ownerId→name`. All client `useMemo`.
- **Quick chips:** `quickFilter in [high-critical|overdue|my|high-roi]` exclusive single-select toggle on click (click active → null). Applied before dropdowns: `high-critical priority critical|high`, `overdue targetCompletionDate<TODAY && !completed|cancelled`, `my ownerId===LOGGED_IN_USER u-001`, `high-roi estimatedROIPercent>1000`. `highCriticalCount/overdue/my/highROI` badge counts computed from `visibleImprovements`.
- **Kanban filters:** `category|owner|priority` only (no status filter — Kanban itself is status partition). Client `useMemo` same `=== filter` pattern.
- **Heatmap filters:** `statusFilter active|all|in_progress|approved|completed` (`active` excludes `completed|cancelled` default), `sizeBy benefit|effort|roi`, `colorBy priority|category|status` — all `useState` + `useMemo filteredInitiatives`. Size/color selections mutate `BubbleMatrix r/color` mapping, not filter inclusion.
- **Benefit tracker:** no filters on measurements; `BenefitMeasurementTable` `measurements` sorted `measurementDate desc` implicitly; `BenefitByTypeDonut` clusters by `estimatedBenefit.primaryType` not `BenefitMeasurement.benefitType`.
- **Sort:** Register fixed `PRIORITY_ORDER critical0→low3` then `STATUS_ORDER in_progress0→validating1→approved2→evaluating3→identified4→on_hold5→completed6→cancelled7` then `targetCompletionDate asc 9999 fallback` — no column sort toggle (vs `cmdb` column sort). Kanban order preserved insertion; Heatmap scatter not sorted; Benefit table date desc.
- **URL persist:** none yet — all local `useState` (should migrate to `useSearchParams ?q=&status=&category=&priority=&owner=&chip=&tab=` like `incidents`/`availability`).

---

## State Lifecycle

```
identified → evaluating → approved → in_progress → validating → completed
                                                   ↓             ↓
                                                on_hold       cancelled
                        (on_hold/cancelled reachable from any pre-completed)
```

Source `docs/pages/improvements.md §9` + `src/types/improvement.ts:1-9` 8 statuses. `improvementStatusMeta column` encodes Kanban order `identified0 evaluating1 approved2 in_progress3 validating4 completed5` with `on_hold & cancelled column -1` (overflow).

**Transitions (Phase 1 enforced client only):**
- Happy path `identified→evaluating` (estimate effort/benefit) → `approved` (sponsor approve) → `in_progress` (startedAt) → `validating` (verify successMetrics) → `completed` (completedAt + achievedValue).
- Escape `→ on_hold` (blocked, keep progress) or `→ cancelled` (abandoned).
- No server validator yet — `server/routes/itsm.ts` has no `PATCH /improvements/:publicId/status` guard (Phase 2).

**Update types** `ImprovementUpdate.type` 5 (`status_change|progress_update|comment|metric_update|linkage_added`) stored `progressBefore/After`, `fromStatus/toStatus`, `body`, `authorId/Name timestamp`.

**Success metrics** lifecycle `successMetrics[] {currentValue → targetValue → achievedValue unit metricName metricPublicId?}` — `currentValue` updated during `in_progress`, `achievedValue` on `validating→completed`.

**ROI lifecycle** `estimatedBenefit.annualValueUSD + confidence low|med|high` + `estimatedEffortDays|estimatedCostUSD|estimatedROIPercent` → after `completed` → `actualBenefitUSD|actualEffortDays|actualCostUSD|actualROIPercent` via benefit measurements sum.

Guard: `Mark as complete` disabled always (stub); should enable only if `status validating && progressPercent===100 && achievedValue defined`. `Log update` gated `Can update` with `improvementResource` (`ownerTeamId+ownerUserId` + team inheritance via `engine.ts`).

Ref meta `src/lib/constants.ts#improvementStatusMeta` (color+dot+column) + `src/lib/rbac/permissions.ts#imp-*`.

---

## Permissions (action-level)

| Action | Permission | Who | Notes |
|--------|------------|-----|-------|
| View register/kanban/heatmap/benefits/detail/totals/benefit-measurements/roi | `improvement.read` | All IT `STA|IFM|APS` scope `all` (`imp-read` `src/lib/rbac/permissions.ts:376-381`) | Server `itsmRouter.use GET /improvements* requirePermission('improvement.read')` `server/routes/itsm.ts:343-385` `listByKind(tenant,'improvement'|'benefit-measurement'|'roi-calc')` tenant-isolated; scope violation → 403 `{error:'scope_violation'}` |
| Create initiative | `improvement.create` → mapped to `improvement.write?` UI `Can improvement create` (`imp-create` `385-389` — `STA|IFM|APS officer+` scope `all`) | Any IT officer+ | UI `+ New initiative` gated `Can module="improvement" action="create"` (`ImprovementRegister.tsx:158-162`); no server `POST /improvements` yet |
| Log benefit measurement | `improvement.write` (`requirePermission('improvement.write')` `itsm.ts:360`) | `STA|IFM|APS officer+` via `imp-create` mapping (actual rule `improvement.create` reused) | `POST /improvements/benefit-measurements` validated `z.object initiativeId, measurementDate, benefitType, measuredValueUSD, isEstimate, supportingMetric` + `upsertDocument(tenant,'benefit-measurement',id,{recordedBy session userId, recordedAt now})` + `audit create` |
| Log update / edit initiative | `improvement.update` | `APS officer scope team_app with inheritance` (`imp-update-aps`) OR `IFM officer scope all` (`imp-update-ifm`) OR superadmin bypass | UI `Can improvement update resource={improvementResource(initiative)}` `ImprovementDetail.tsx:215-229` fallback italic view-only; `filterReadable(user,'improvement', mockImprovements.map(i=>({...i,...improvementResource(i)})))` in Register `46-53` enforces list visibility; `updates` array is `ImprovementInitiative.updates` local, not a separate `listByKind` |
| Toggle kanban status | `improvement.update` (should) | own team or IFM | Now client-only (no server guard) |

No `improvement.delete` separate — delete = `cancelled` transition. `requirePermission` global via `server/app.ts:126` `withScopedDb` context (`req.tenantId`, `req.permissions`). List uses `filterReadable` + `improvementResource` (`ownerTeamId` + `ownerUserId`, inheritance `team ancestry` via `engine.ts` team tree); Report/portfolio rollup in Executive Dashboard downstream (no extra perm).

---

## Empty / Loading / Error

- **Empty register filtered:** `flex flex-col items-center py-16 gap-3 text-center border border-ois-border rounded-lg bg-ois-surface` `No initiatives match.` `14 medium ois-text` + row `Reset filters text-sm primary underline` `or` `Add initiative Plus 14 semibold primary` (`ImprovementRegister.tsx:318-329`). Status tabs still show counts `>0` filtered; pills still show `N` zero.
- **Empty kanban:** `KanbanBoard` still renders 6-8 columns with `0` count header + `No cards` text inside empty `KanbanColumn`; filter bar `X of Y initiatives shown` still `0 of N`.
- **Empty heatmap:** `BubbleMatrix` empty scatter `No initiatives to display` centered `text-sm italic ois-text-subtle` with axes but no nodes; `PortfolioSummaryStrip` shows `0 0`. Right `HeatmapGapAnalysis` empty `No sweet-spot candidates` text `12px muted`.
- **Empty benefit tracker:** `CumulativeBenefitChart measurements empty → 0 line` X axis still, Y `$0`; `BenefitMeasurementTable measurements empty → px-4 py-12 text-center 14px muted No measurements yet.`; `TopContributorsList initiatives empty → No contributors`; `BenefitByTypeDonut` filtered `0` → empty `Pie` center `0/0`.
- **Empty detail 404:** `flex flex-col items-center py-24 gap-3 text-center` `Initiative not found text-lg bold ois-text` + `← Back to register text-sm primary underline` (`ImprovementDetail.tsx:67-74`). Header not rendered if `!initiative` guard returns early.
- **Empty updates/metrics/roi/linked tabs:** per component `text-sm italic ois-text-subtle` — Updates `No updates yet.`, Metrics `No success metrics`, ROI `No ROI calculation yet.`, Linked `No linked items`.
- **Loading:** `useResource` → `data null` → `?? []` / `?? undefined` → zero-state renders (no skeleton shimmer unlike `cmdb` `8 rows shimmer` or `incidents` — parity gap). `ImprovementDetail loading` short-circuits to `Initiative not found` (should show `Loading…` skeleton per `changes` gap).
- **Error:** no inline banner except `BenefitTracker saveError text-xs ois-danger` next to `Log measurement` on `createBenefitMeasurement` failure (`BenefitTracker.tsx:37`); fetch failures fall through to silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state). `LogBenefitModal onClose` resets `saveError null`.
- **No service/forecast data:** `totalEstimated 0 → $0`, `totalActual 0 → $0` header; `formatBenefitUSD(0) → $0`; `overdueCount 0` hides overdue badge (correct); `criticalBlocked 0` hides blocked.

---

## Phase 2 Deferred

- Write endpoints `POST /improvements`, `PATCH /improvements/:publicId` (title/description/successMetrics/estimated*, `PATCH .../status {from,to,reason}` with lifecycle guard), `POST /improvements/:publicId/updates` — rationale: current 8 router endpoints are GET + 1 POST `benefit-measurement` only (`itsm.ts:343-392`) + detail `getByAnyId` dual-key fallback.
- Kanban persist drag `PATCH /improvements/:publicId/status` with optimistic `KanbanBoard setFilteredInitiatives` + revert on 409/403; add `on_hold|cancelled` separate lane handling `column -1`.
- Overdue scanner job daily (`docs/pages/improvements.md §15`) mark `targetCompletionDate < today` notify owner + accent already computes but should emit audit `overdue` event.
- Benefit aggregator quarterly rollup `sum benefitMeasurements per initiative period → measurement dashboard` + auto `ROICalculation` recompute `roi12mPercent = (actualBenefit - totalCost)/totalCost*100` + `paybackMonths`.
- 1-click source-from-PIR `POST /improvements/from-incident|problem|capacity|dr` with `sourceType 6 + linked*PublicId` auto-pop + change/metric linkage (`docs/pages/improvements.md §8 Source from PIR` flow).
- Heatmap drill-through bubble click → `/improvement/:publicId` + connect bubble color/size toggle to query `?size=&color=&status=` URL.
- ROI calculator wired to realized `BenefitMeasurement cumulative` vs `ROICalculation` (`ROISummaryPanel onViewROI` already navigates tab; but `ROICalculator` interactive inputs not bound to `roiCalc` prop).
- `CreateInitiativeModal`/`EditInitiativeForm` with Zod schemas `createImprovementSchema` shared `src/shared/schemas/improvement.ts` (title, category, priority 4, sourceType 6, estimatedBenefit*, tags) + application scope picker `useScopedAppId` like Changes wizard.
- Export CSV/PNG for register table + heatmap scatter + benefit charts; pagination `?page&pageSize` + multi-sort URL persist like `incidents` + saved filter views.
- Replace `LOGGED_IN_USER u-001` hardcode with `user.id` (`useCurrentUser().user`) in Register `high-critical/my` chips + ImprovementDetail `authorId`.
- Fix `server/routes/itsm.ts:352 totals/actual` key drift `actualBenefit.annualValueUSD` → `actualBenefitUSD` flat vs `src/types/improvement.ts:58`, and add `actualBenefitUSD` aggregation test coverage.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/improvement/` + `src/components/improvement/` + `docs/pages/improvements.md`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + left `w-1 shrink-0 transition-colors duration-500` accent `criticalBlocked #B42318 > overdue #DC6803 > realized≥50% #12B76A > #1F4FD4 primary` (`ImprovementsLayout.tsx:37-41`, `CapacityLayout` parity #4). Jangan ganti ke `Module Layout` lain.
2. **Tabs** `NavLink ListChecks|KanbanSquare|Grid3x3|DollarSign 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` (`ImprovementsLayout.tsx:86-102`). Sama dengan `capacity/availability/monitoring` tab bar.
3. **KPI strip** `grid grid-cols-2 lg:grid-cols-4 gap-3` `border border-ois-border rounded-lg bg-ois-surface p-3` label `text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest mb-1` value `text-xl font-bold text-ois-text` formatted `${formatBenefitUSD}` (`ImprovementRegister.tsx:170-182`). Jangan ganti spacing `gap-3`.
4. **Filter chips** `rounded-full border px-3 py-1 text-xs font-semibold` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface muted border-ois-border hover:border-ois-primary hover:text-ois-primary` (`ImprovementRegister.tsx:246-258`) + `FilterDropdown` `rounded-lg border-ois-border bg-ois-surface h-9 text-sm`. Quick chips emojis `🔥 ⏱ 📡 💰` keep (semantic).
5. **Status tabs** `flex gap-1 border-b border-ois-border overflow-x-auto` `button px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px capitalize` active `border-ois-primary text-ois-primary` (`ImprovementRegister.tsx:261-288`). Only `count>0` renders.
6. **Table** `border border-ois-border rounded-lg overflow-hidden` header `bg-ois-surface-muted/50 border-b border-ois-border text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest px-4 py-2.5` + row `hover:bg-ois-surface-muted divide-y divide-ois-border` cols `Initiative Status Category Priority Progress Est. Benefit Owner Target ⋯` (`ImprovementRegister.tsx:291-316`). `ImprovementRow` `hover:bg-gray-50 border-b border-gray-100` + `MoreVertical 16 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700` (`ImprovementRow.tsx:36,80`).
7. **Kanban** filter row `FilterDropdown x3 category|owner|priority` + `KanbanBoard KanbanColumn KanbanCard` `border border-ois-border rounded-lg bg-ois-surface shadow-sm hover:shadow-md` priority top `h-1 colored improvementPriorityMeta` + `ImprovementProgressBar size sm showLabel` (`KanbanBoard/*`).
8. **Heatmap** scatter `BubbleMatrix` X `Effort days` Y `Benefit USD` + `BubbleNode r scaled sizeBy benefit|effort|roi` + color `priority|category|status` mapping exact `improvementPriorityMeta|CategoryMeta|StatusMeta` hex; main `flex gap-5 items-start left flex-1 min-w-0 space-y-4 + right w-[280px] shrink-0 HeatmapGapAnalysis` (`ImprovementHeatmap.tsx:75-82`).
9. **Benefit tracker splits** `flex gap-5 items-start left flex-1 min-w-0 CumulativeBenefitChart + right w-[38%] shrink-0 BenefitByTypeDonut+TopContributorsList` + `BenefitMeasurementTable` columns `Initiative benefitType period measured isEstimate methodology` + `ROICalculator` standalone (`BenefitTracker.tsx:52-73`). Keep `w-[38%]`.
10. **Detail stripe** `w-1 self-stretch priorityMeta.color critical #B42318 high #DC6803 medium #0BA5EC low #475467` left edge of header (`ImprovementDetail.tsx:126` `RISK_COLOR[risk]` analog + `ChangeDetail` risk stripe parity `w-1`). Jangan hapus.
11. **Detail 2-col** `flex flex-1 min-h-0 center flex-1 min-w-0 flex-col + right w-[280px] border-l bg-white p-4 space-y-4 overflow-y-auto` header `SectionCard border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` (`ImprovementDetail.tsx:191-246`, `Releases/Change SectionCard` parity).
12. **Status pills** `ImprovementStatusPill` `rounded-full px-2.5 py-1 text-xs font-semibold` `color improvementStatusMeta color bg dot` + `ImprovementCategoryChip rounded-full bg-ois-surface-muted border-ois-border px-2 py-0.5 text-[11px]` + `ImprovementPriorityDot w-2 h-2 rounded-full` colored `improvementPriorityMeta`. Keep sizes.
13. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `bg-ois-surface-muted` reuse di left `At a glance` + `ROISummaryPanel` + `Quick actions` (paritas `cmdb/changes/releases`).
14. **Tabs** `py-4 px-1 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary font-bold` (`ImprovementDetail.tsx:165-177` + `ReleaseDetail/ChangeDetail` tabs).
15. **Ois tokens** strictly `ois-bg #F7F8FA / ois-surface #FFFFFF / ois-surface-muted #F1F3F7 / ois-border #E4E7EC / ois-border-strong #D0D5DD / ois-text #101828 / ois-text-muted #475467 / ois-text-subtle #98A2B3 / ois-primary #1F4FD4 / ois-primary-hover #1A42B5 / ois-primary-pale #EEF2FF / ois-success #12B76A / ois-success-pale #ECFDF3 / ois-warning #F79009 / ois-warning-pale #FFFAEB / ois-danger #F04438 / ois-danger-pale #FEF3F2 / ois-info #0BA5EC` (`src/index.css:7-33`) + semantic `ois-sev-p1 #B42318 / p2 #DC6803 / p3 #DC6803 / p4 #027A48` — no ad-hoc hex beyond `improvementStatusMeta|CategoryMeta|PriorityMeta|benefitTypeMeta` palettes.
16. **Format** `formatBenefitUSD` `≥1M $X.XM | ≥1k $Xk | $X` (`src/lib/constants.ts:534-538`) — jangan ganti threshold.
17. **RBAC gate** `Can module="improvement" action="create|read|update" resource={improvementResource(initiative)}` pattern + `filterReadable(user,'improvement', ...)` (`ImprovementRegister.tsx:46,158`, `ImprovementDetail.tsx:215`) — keep fallback italic pattern `View-only — only the owning team can log updates.`

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `improvementsService.list()` | `GET /api/v1/improvements?page&pageSize` | `improvement.read` | `listByKind<ImprovementInitiative>(tenantId,'improvement', pagination)` `server/routes/itsm.ts:344` all |
| `improvementsService.get(publicId)` | `GET /api/v1/improvements/:publicId` | `improvement.read` | `findByPublicId || findByKey fallback getByAnyId` (`:386-392` dual-key, mirrors `itsmServices.getByAnyId`) |
| `improvementsService.getByAnyId(id)` | `GET /api/v1/improvements/:publicId` (same) | `improvement.read` | accepts `publicId` or internal `id` via `findByKey` |
| `improvementsService.totalEstimatedBenefitUSD()` | `GET /api/v1/improvements/totals/estimated` | `improvement.read` | `listByKind('improvement') reduce sum estimatedBenefit.annualValueUSD` `:348-350` |
| `improvementsService.totalActualBenefitUSD()` | `GET /api/v1/improvements/totals/actual` | `improvement.read` | `listByKind reduce sum actualBenefit.annualValueUSD (nested — key drift)` `:352-354` → should be `actualBenefitUSD` flat |
| `improvementsService.benefitMeasurements()` | `GET /api/v1/improvements/benefit-measurements?page&pageSize` | `improvement.read` | `listByKind(tenant,'benefit-measurement', pagination)` `:356` |
| `improvementsService.createBenefitMeasurement(input)` | `POST /api/v1/improvements/benefit-measurements` | `improvement.write` (via `requirePermission('improvement.write')` `:360`) | `z.object initiativeId, measurementDate*, benefitType*, measuredValueUSD*, isEstimate, supportingMetric` + `randomUUID id` + `recordedBy session userId recordedAt now ISO` + `upsertDocument(tenant,'benefit-measurement',id,measurement)` + `audit create` `:361-376` `201` |
| `improvementsService.roiCalculations()` | `GET /api/v1/improvements/roi?page&pageSize` | `improvement.read` | `listByKind(tenant,'roi-calc', pagination)` `:378` |
| `improvementsService.roiCalculation(initiativeId)` | `GET /api/v1/improvements/:initiativeId/roi` | `improvement.read` | `listByKind('roi-calc') find r.initiativeId===param ?? null` `:382-384` (not findByKey) |

All via `src/services/itsmServices.ts:118-130` `apiFetch('/improvements/...')` + `src/services/core.ts:29-61` `apiFetch`. Tenant-scoped `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Audit only for `create benefit-measurement` (`audit`). Socket: none yet (future `tenant:{tenantId}` improvements refresh like `cmdb`).

---

## Open Items

- [ ] Add `POST /improvements` (`createImprovementSchema` title/description/category/priority/sourceType/tags) + `PATCH /improvements/:publicId` + `PATCH .../:publicId/status` with lifecycle guard (reject `identified→completed` jump, 409); wire `+ New initiative` / `+ New` buttons.
- [ ] Add `POST /improvements/:publicId/updates` (`status_change|progress_update|comment|metric_update|linkage_added` + `progressBefore/After|fromStatus/toStatus|body`) — replace Detail `handleLogUpdate` local + wire `UpdatesTab onAddUpdate` (currently `() => {}`).
- [ ] Persist kanban drag `PATCH /improvements/:publicId/status {from,to}` optimistic `KanbanBoard` + revert on 409; decide `on_hold|cancelled column -1` visibility rule (hide vs collapsed lane).
- [ ] Fix `server/routes/itsm.ts:352 totals/actual` field drift `actualBenefit.annualValueUSD` → `actualBenefitUSD` (align with `src/types/improvement.ts:58` flat) and add parity test `list + totals consistency`.
- [ ] Wire heatmap bubble click → `navigate('/improvement/' + publicId)` + URL persist `?status=&sizeBy=&colorBy=&chip=` via `useSearchParams`; add `Today` markers consistency with `ForecastChart today` pattern.
- [ ] Connect `ROICalculator` inputs to `ROICalculation` (`roiCalc` prop) + `BenefitMeasurement cumulativeValueUSD` actuals; replace static demo numbers with `derived totalCost12m = implementationCost + ongoing*12`.
- [ ] Replace `LOGGED_IN_USER 'u-001'` hardcode with `useCurrentUser().user.id` in Register `my/high-critical counts` + Kanban owner derivation + Detail `authorId/Name`.
- [ ] Wire `ImprovementsLayout` + Register/Kanban/Heatmap `useResource` to `filterReadable(user,'improvement',…)` uniformly (Kanban/Heatmap currently omit `filterReadable`).
- [ ] Implement `Source from PIR` 1-click `POST /improvements/from-incident/:incidentId|from-problem/:problemId|from-capacity/:recId|from-dr/:testId` with `sourceType auto + linked*PublicId` prefill `identified` status.
- [ ] Add overdue/benefit jobs: daily overdue scanner (`targetCompletionDate < today && !completed|cancelled`) + quarterly aggregator writes `roi-calc` / `measurement rollup` for Executive Dashboard.
- [ ] Add table pagination `?page&pageSize` + search debounce + stats correct for paginated `visibleImprovements.length` vs total.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/improvements.md` + `src/routes/improvement/*` (ImprovementsLayout/Register/Kanban/Heatmap/BenefitTracker/Detail 6 tabs) + `src/components/improvement/*` (27 files) + `server/routes/itsm.ts` (`/improvements` 8 endpoints) + `src/types/improvement.ts` + `src/lib/constants.ts` (`improvementStatusMeta/CategoryMeta/PriorityMeta/benefitTypeMeta`) + `src/services/itsmServices.ts` ke template features (Module Layout 4 tabs + Register table/Filter/Chip + Kanban 8-col + Heatmap scatter + BenefitTracker charts + Detail 6-tab 3-col) | — |
