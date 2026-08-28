# Continuity — BIA, DR Plans & DR Tests

Status: **Draft**
Route: `/continuity/bia` (BIA Matrix), `/continuity/dr-plans` (DR Plans), `/continuity/tests` (DR Tests) — parent `/continuity` Module Layout; redirect `/continuity` → `/continuity/bia` (no index, 3 children)
Sidebar: Service Health & Intelligence · Continuity
Source: `src/routes/continuity/ContinuityLayout.tsx`, `BIAMatrix.tsx`, `DRPlans.tsx`, `DRTests.tsx` · `src/routes/index.tsx:63`, `70-72`, `192-196` · `server/routes/platform.ts:32`, `317-319` · `src/types/continuity.ts` · `src/components/continuity/*` (18 files) · `src/lib/constants.ts:434-469` · `src/services/platformServices.ts:185-189` · `src/index.css:7-33` (ois tokens)

---

## Intent

Pusat **Service Continuity Management (ITIL 4)** — **jawab dalam 5 detik: service mana catastrophic jika down? RTO berapa? DR plan mana siap vs overdue? test terakhir pass/fail?** Continuity manager melihat BIA matrix (RTO × impact dengan hourly cost), DR owner mengelola plan dengan recovery steps & review hygiene, dan SRE men-schedule/eksekusi/test DR live dengan jejak RTO/RPO achieved vs target & issues follow-up. Satu BIA → banyak DR plan; satu DR plan → banyak DR test run.

---

## Current State (snapshot `src/routes/index.tsx:63`, `70-72`, `192-196`)

- `src/routes/index.tsx:63` `import { ContinuityLayout }` · `70` `BIAMatrixPage` · `71` `DRPlans` · `72` `DRTests`
- `src/routes/index.tsx:192-196` → `<ContinuityLayout />` at `/continuity` with children:
  - `bia` → `<BIAMatrixPage />`
  - `dr-plans` → `<DRPlans />`
  - `tests` → `<DRTests />`
- Layout: `src/routes/continuity/ContinuityLayout.tsx:13-95` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + accent `w-1 shrink-0 transition-colors duration-500` dynamic (see below) + title `Business Continuity text-xl font-bold ois-text` + stats row `text-xs ois-text-muted flex-wrap` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab bar 3 `NavLink` (`Grid3x3 14`, `FileText 14`, `FlaskConical 14`, active `border-ois-primary text-ois-primary` else muted hover) — `Outlet` owns scroll `flex-1 min-h-0 overflow-auto`.
- Components: `BIAMatrix`, `BIAMatrixCell`, `BIAEntryRow`, `BIADetailDrawer`, `BIADependencyList`, `BIARiskList`, `BIAImpactLevelPill`, `DRPlanCard`, `DRPlanStatusPill`, `DRPlanStepsViewer`, `DRTestCard`, `DRTestStatusPill`, `DRTestTypeChip`, `DRTestResultsSummary`, `DRTestStepRow`, `DRTestIssueCard`, `DRTestNotesLog`, `LiveDRTestPanel`, `DRTestRunner/*` (`Step1SelectPlan`, `Step2Configure`, `Step3Review`, `Step4Success`, `DRTestRunnerWizard`) (`src/components/continuity/` — 18 files).
- API: `platformRouter` (`server/routes/platform.ts:32`, `317-319`) — 3 `GET` endpoints under `/continuity` behind `requirePermission('continuity.read')` + `listByKind` tenant-isolated `req.tenantId`:
  - `GET /continuity/bia` → `listByKind<BIAEntry>(tenantId,'bia')`
  - `GET /continuity/dr-plans` → `listByKind<DRPlan>(tenantId,'dr-plan')`
  - `GET /continuity/dr-runs` → `listByKind<DRTestRun>(tenantId,'dr-run')`
- Types: `BIAImpactLevel catastrophic|critical|major|moderate|minor`, `RTOClass immediate|short|medium|long|extended`, `DRTestType tabletop|functional|full_failover|chaos`, `DRTestStatus planned|in_progress|passed|passed_with_issues|failed|cancelled`, `DRPlanStatus draft|approved|active|under_review|retired`, `BIAEntry` (serviceId/Name/Tier, impactLevel/Score 0-100, rto/rpoMinutes/rtoClass, hourly/daily cost, customerFacing, affectedUserSegments, peakTrafficTimes, regulatoryCompliance[], criticalDependencies[] type service|ci|external + hard|soft + failoverAvailable, linkedDRPlanIds/PublicIds, lastReviewed/By nextReviewAt approvedBy, continuityRisks[], notes), `DRPlan` (publicId, name, description, version, serviceIds/Names, affectedCIIds, biaEntryIds, status, objectives, triggerConditions[], activationProcedure, communicationPlan, recoverySteps[] DRPlanStep stepNumber/title/description/estimatedMinutes/owner/critical/verificationCriteria, rollbackProcedure, testingSchedule, contacts incidentCommander/communicationsLead/technicalLead, stakeholders[], lastTestedAt/Status testRunCount reviewDueAt approvedBy/At linkedChangeIds/KBSlugs), `DRTestRun` (publicId, planId/PublicId/Name, type, status, environment, isLive, objectives[], scope, plannedDate, startedAt/completedAt/durationMinutes, totalSteps/completedSteps/failedSteps, stepResults[] DRTestStepResult status pending|in_progress|passed|failed|skipped + executor, rto/rpoAchieved vs Target, issues[] DRTestIssue severity critical|major|minor|observation status open|in_progress|resolved, triggeredBy, participants[], lessonsLearned, recommendations, reviewedBy, signedOffAt, triggeredIncidentIds) (`src/types/continuity.ts:1-179`).
- Constants: `biaImpactLevelMeta` (`src/lib/constants.ts:439-445` catastrophic `#7F1D1D #FEF2F2 ≥38k/hr` / critical `#B42318 #FEF3F2 ≥20k` / major `#DC6803 #FFFAEB ≥10k` / moderate `#B45309 #FFFBEB ≥3k` / minor `#067647 #ECFDF3 0`), `rtoClassMeta` (`447-453` immediate `<15 min #B42318` / short `15 min–2h #DC6803` / medium `2–8h #B45309` / long `8–24h #475467` / extended `>24h #475467`), `drTestTypeMeta` (`455-460` tabletop `Users` Discussion / functional `Wrench` Partial / full_failover `AlertTriangle` Complete / chaos `Zap` Fault injection), `drTestStatusMeta` (`462-469` planned `#475467 #F1F3F7` / in_progress `#0BA5EC #F0F9FF` / passed `#067647 #ECFDF3` / passed_with_issues `#DC6803 #FFFAEB` / failed `#B42318 #FEF3F2` / cancelled `#475467 #F1F3F7` all `dot` field).
- Services: `continuityService` (`src/services/platformServices.ts:185-189`) `bia() → apiFetch<BIAEntry[]>('/continuity/bia')`, `drPlans() → '/continuity/dr-plans'`, `drRuns() → '/continuity/dr-runs'` via `src/services/core.ts:29-61` `apiFetch` + `useResource` hook (`data ?? []` no mock fallback).
- Styling: `ois-*` tokens (`src/index.css:7-33`) `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-success #12B76A`, `ois-warning #F79009`, `ois-danger #F04438`, `ois-sev-p1 #B42318` etc.

**Working:**
- Layout: accent computes `failedTests>0 #B42318` else `catastrophic>0 && activePlans===0 #B42318` else `draftPlans>0 #DC6803` else `#12B76A` (`ContinuityLayout.tsx:29-33`); header stats `{bia.length} services in BIA · {activePlans} active DR plans · {passed|passed_with_issues} tests passed` + conditional `catastrophic danger #B42318` + `critical warning #DC6803` + `failedTests danger`. Data via `useResource(() => continuityService.bia/drPlans/drRuns)` `data ?? []`.
- BIAMatrixPage: `flex flex-col h-full min-h-0` top `flex justify-end` `+ New BIA entry Can continuity update` `Button primary` (`BIAMatrix.tsx:24-29`) → `max-w-screen-xl mx-auto px-6 py-6 space-y-8` two sections: (1) `BIA Impact Matrix` `text-base semibold ois-text` + subtitle `12px subtle` + `Card bg-white border-ois-border rounded-xl p-4` `BIAMatrix entries onSelectEntry` (`BIAMatrix.tsx:6-70`) — column headers `IMPACT_LEVELS catastrophic→minor` per `biaImpactLevelMeta label color + ≥$k/hr`, rows `RTO_CLASSES immediate→extended` per `rtoClassMeta label color minutes`, grid cell `flex-1 min-h-[72px]` entry `BIAMatrixCell` else `dashed gray-200 bg-gray-50` placeholder; (2) `BIA Entries` table `bg-white border-ois-border rounded-xl overflow-hidden` header `bg-ois-surface-muted border-b 11px semibold uppercase tracking-wide ois-text-subtle` 8 cols `Service | Impact Level | RTO | RPO | Hourly Cost | Compliance | DR Plan | Last Reviewed | ⋯` `min-w-[900px]` → rows `BIAEntryRow` per entry; drawer `BIADetailDrawer selectedEntry onClose onOpenDRPlan`.
- BIAMatrixCell: `button w-full rounded-lg border-gray-200 p-2 hover:shadow-md` `bg impactMeta.bg` (`BIAMatrixCell.tsx:24-54`) — `serviceName 12px semibold truncate`, `rto min · rtoLabel 11px gray-500`, score pill `px-1.5 py-0.5 rounded 11px bold` color `≥80 #B42318/#FEF3F2` `≥60 #DC6803/#FFFAEB` else `#067647/#ECFDF3` (`{impactScore}/100`), hover expand `border-t gray-200/60 $cost/hr + {compliance.length} compliance req`.
- BIAEntryRow: `tr hover:bg-gray-50 cursor-pointer → setSelectedEntry` (`BIAEntryRow.tsx:22-81`) — Service `serviceName semibold 14px + publicId mono 12px gray-400`, Impact `BIAImpactLevelPill`, RTO `{rto} min ({rtoMeta.label})`, RPO, HourlyCost `$localized`, Compliance `flex-wrap gap-1` `bg-blue-50 blue-700 border-blue-100 rounded 10px medium` per `regulatoryCompliance`, DR Plan `font-mono 12px blue-600 linkedDRPlanPublicIds[0]` else `—`, Last Reviewed `formatDate lastReviewedAt` + `AlertCircle 3.5 amber-500` if `nextReviewAt < 2026-05-10` hardcoded stale compare (gap), `⋯ MoreHorizontal ghost icon` stopPropagation.
- BIADetailDrawer: `fixed inset-0 bg-black/30 z-40 backdrop + right-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col` (`BIADetailDrawer.tsx:40-183`) — header `publicId mono 12 gray-400 + serviceName 16 bold + X ghost icon close`, body `flex-1 overflow-y-auto px-5 py-4` sections `Section title 12 semibold gray-500 uppercase tracking-wider mb-2 + Row label w-32 gray-500 + content flex-1 14 gray-900`: Impact Assessment (Impact Pills/ Score /100 / $/hr / $/day), Recovery Objectives (RTO mins + class label, RPO), Scope (customer-facing Yes green-700/No gray-500 + userSegments `bg-gray-100 gray-600 rounded 11px` + peakTraffic + compliance `blue-50 blue-700`), Critical Dependencies `BIADependencyList type icon hard/soft + failoverAvailable`, Continuity Risks `BIARiskList`, Linked DR Plan `if found` `border-gray-200 bg-gray-50 p-3` `publicId mono + DRPlanStatusPill + name bold + version mono + Last tested + Open DR plan outline + ExternalLink 3.5`, Review `lastReviewed by + Approved by if exists + nextReview`.
- DRPlansPage: `flex-col h-full min-h-0` top `flex justify-end + New plan Can continuity.update primary Plus 15` → `max-w-screen-xl px-6 py-6 space-y-4` (`DRPlans.tsx:132-282`) — overdue banner `if overduePlans.length>0` `rounded-lg border-amber-200 bg-amber-50 p-4` `AlertTriangle 16 amber-600` `{n} DR plan(s) require(s) review` + per plan `publicId mono + names + review was due locale + Last tested locale · X weeks overdue` + `Review now ChevronRight 13 → setActiveTab overdue_review`; filter bar `Search 14 Search left 2.5 input pl-8 max-w-72 border-ois-border bg-white focus:ring-ois-primary/30 placeholder Search plan name or ID… + FilterDropdown status (All statuses N + Active/Approved/Under review/Draft/Retired) + FilterDropdown service (All services + distinct serviceNames) + Reset X 12 if hasFilters`; status tabs `flex gap-0.5 border-b border-ois-border` 5 `All|Active|Under review|Draft|Overdue review` `px-3 py-2 border-b-2 -mb-px` active `border-ois-primary text-ois-primary` with `tabCounts[value]` suffix; cards `grid lg:grid-cols-2 gap-4` per `DRPlanCard` (see below) → empty `py-20 No DR plans found Try adjusting + Reset if filtered`; wizard `DRTestRunnerWizard plans initialPlanId onClose onComplete→navigate('/continuity/tests')` if `testingPlanId`.
- DRPlanCard: `rounded-lg border-gray-200 bg-white p-4 space-y-3` (`DRPlanCard.tsx:27-173`) — top `DRPlanStatusPill + publicId mono 12 gray-400`, name `14 bold + Covers: serviceNames 12 gray-500 + version mono 12 gray-400`, Trigger Conditions `11 semibold uppercase tracking-wider gray-500 Trigger Conditions (n)` `ul space-y-1 • cond 14 gray-700` preview 2 `slice(0,2)` + `X more ChevronDown 3 blue-600 hover:underline` else `Show fewer`, Recovery Steps `Recovery Steps: n steps · Est. sumMinutes min total 11 uppercase gray-500` + `View steps/Hide Chevron` `blue-600` + bar `h-1.5 rounded-full bg-green-500 w-full`; expanded steps `border-t gray-100` per `w-5 h-5 rounded-full bg-gray-100 gray-500 10 bold stepNumber + title medium 14 truncate + duration min · owner 12 gray-400 + Critical red-700 bg-red-50 10 bold if critical`; Test Status `Test Status 11 uppercase` `Last tested: locale or Never + DRTestStatusPill if exists` + `Some issues were found — review recommended amber-600 12 if passed_with_issues`; Meta `flex-wrap gap-4 12 gray-500` `Linked BIA: first biaEntryId mono` + `Review due: locale` `amber-600 AlertTriangle 3 if overdue` + `Approved: name · locale if approved`; Actions `border-t gray-100 flex gap-2 pt-1` `Test now primary Play 3.5` + `View steps secondary List 3.5` + `Open detail ghost ExternalLink 3.5 ml-auto`.
- DRTestsPage: `flex-col h-full` top `flex justify-end + Schedule test Can continuity.update primary Plus 15 → setShowWizard true` → `max-w-screen-xl px-6 py-6 space-y-4` (`DRTests.tsx:147-332`) — Active Test Banner `if activeTest status in_progress` `rounded-lg border-blue-200 bg-blue-50 p-4` `Radio 16 blue-600 animate-pulse` `DR TEST IN PROGRESS 14 bold tracking-wide blue-900 uppercase` + `publicId — planPublicId: planName 14 semibold blue-800` + `type (underscore→space) capitalized · environment · Started Xh Ym ago 12 blue-700` + `Progress: X of Y steps complete · Z failures · Step N running 12 blue-700` + bar `h-1.5 rounded-full bg-blue-200 w-64 fill bg-blue-600 width completed/total*100 transition-all` + pct `10 blue-600` + `View live test ChevronRight 13 → setLiveTestId(activeTest.id)`; filter bar `Search 14 left 2.5 input pl-8 max-w-72 placeholder Search test ID, plan… + FilterDropdown plan (All plans + distinct planPublicId) + FilterDropdown type All/Tabletop/Functional/Full failover/Chaos + FilterDropdown status All/Planned/In progress/Passed/Passed with issues/Failed/Cancelled + Reset X 12 if hasFilters`; status tabs `All|In Progress|Passed|Passed with issues|Failed` `px-3 py-2 border-b-2 -mb-px whitespace-nowrap` active `border-ois-primary` with `tabCounts`; cards `grid lg:grid-cols-2 gap-4` per `DRTestCard` else empty `py-20 No test runs found + Reset if filtered` → ordered `in_progress first then startedAt desc`; overlays `LiveDRTestPanel run onClose` if `liveTest` + `DRTestRunnerWizard plans onClose onComplete→navigate('/continuity/tests')` if `showWizard`.
- DRTestCard: `rounded-lg border-gray-200 bg-white p-4 space-y-3` (`DRTestCard.tsx:30-111`) — header `DRTestStatusPill + publicId mono 12 gray-400`, plan `planName 14 semibold + DRTestTypeChip`, duration `flex-wrap gap-3 12 gray-500 Started: locale if started + Duration: Xh Ym if durationMinutes + environment`; progress `if in_progress` `Steps X/Y 12 gray-500 + pct + h-2 bg-gray-100 overflow-hidden fill bg-blue-500 width pct`; results `if passed|passed_with_issues|failed` `DRTestResultsSummary run`; issues `if length>0` `N issues found · K critical 12 amber-600`; lessons `if lessonsLearned` `italic line-clamp-2 Lessons: text 12 gray-600`; actions `border-t gray-100 flex gap-2` `View live primary Play 3.5 if in_progress && onViewLive` else `View full report secondary FileText 3.5 if passed|passed_with_issues|failed && onViewReport`.
- LiveDRTestPanel: `fixed inset-0 bg-white z-50 flex flex-col overflow-hidden` (`LiveDRTestPanel.tsx:21-137`) — header `px-6 py-4 border-b gray-200 flex justify-between` left `publicId mono 14 semibold + DRTestStatusPill` right `Pause secondary Pause 3.5 + Fail test destructive + X ghost icon close`; body `flex-1 overflow-y-auto max-w-3xl mx-auto px-6 py-5 space-y-6` — plan `planName 16 semibold + DRTestTypeChip + running mins 14 gray-500 if started + Participants comma 12 gray-500 if any`; progress `pct% complete + X/Y steps 12 gray-500 + h-2.5 bg-gray-100 fill bg-blue-500 width pct`; steps `Steps 11 uppercase tracking-wider gray-500 + space-y-1` per `DRTestStepRow step isActive = stepResults find in_progress + onMarkPassed/Failed/AddNote mock ()=>{} only for active`; issues `Issues Found 11 uppercase + None so far italic 14 gray-400 if none else DRTestIssueCard per issue`; notes `Notes Log 11 uppercase + DRTestNotesLog notes onAddNote local useState name triggeredByName time ISO text`.
- DRTestRunnerWizard: 4 steps `['Select Plan','Configure','Review','Done']` (`DRTestRunnerWizard.tsx:17-146`) — backdrop `fixed inset-0 bg-black/40 z-40` + modal `fixed inset-0 z-50 flex center p-4 + bg-white rounded-xl shadow-2xl max-w-xl max-h-[90vh] pointer-events-auto flex flex-col`; header `px-6 py-4 border-b Run DR Test 16 bold + Step X of 4: label 12 gray-500 + X ghost`; step indicator `flex gap-2 px-6 py-3 border-b gray-100` per step `w-6 h-6 rounded-full 11 bold done green-500 ✓ vs active blue-600 vs pending gray-100 gray-400 + label medium active gray-900 else gray-400 + divider flex-1 h-px bg-gray-200`; content `flex-1 overflow-auto px-6 py-5` `Step1SelectPlan plans selectedPlanId onSelect` → `Step2Configure onBack onNext(config TestConfig)` → `Step3Review plan config onBack onSchedule/onStartNow -> setStep 4` → `Step4Success onViewTest/onBackToTests → onComplete navigate`; footer step1 `border-t gray-100 flex justify-end px-6 py-4 Next: Configure primary sm disabled !selectedPlanId`.
- All `FilterDropdown` pattern `src/components/ui/FilterDropdown.tsx` `rounded-lg border-ois-border bg-white px-3 py-1.5 text-sm`.

**Stub / Partial:**
- All writes are client-only/local — no `POST/PATCH /continuity/*` yet: BIA `+ New BIA entry` is inert button (no modal), DR Plan `+ New plan` inert, `DRTestRunnerWizard` transitions `setStep(4)` without `POST /continuity/dr-runs` (onComplete just navigates `/continuity/tests` — no server record); threshold-toggle-style optimistic update not applicable (read-only).
- `BIADetailDrawer` `onOpenDRPlan` → `navigate('/continuity/dr-plans')` without `?planId` filter (plan not highlighted).
- `BIAEntryRow` hardcoded date `new Date('2026-05-10')` for overdue check — stale fixed date should be `new Date()`.
- `DRPlanCard` progress bar hard `w-full green-500` placeholder (100% on paper vs real implementation %).
- `LiveDRTestPanel` header actions `Pause`/`Fail test` are inert (no `PATCH .../:id/status` pause/fail), `DRTestStepRow` callbacks are no-op `()=>{}` stubs, notes are local `useState` only (no `POST .../:id/notes`).
- `DRTests` `ALL_PLAN_OPTIONS` derived from `drRuns.map planPublicId` not `drPlans` (filters miss plans without runs); `handleViewReport` is no-op placeholder (no route `/continuity/tests/:id`).
- Mobile fallback not present (table `min-w-[900px] overflow-x-auto` is only guard).

**Missing (vs ITIL 4 + legacy `docs/pages/continuity.md §13-14`):**
- `POST /continuity/bia`, `POST /continuity/dr-plans`, `POST /continuity/dr-runs` + `PATCH /continuity/dr-plans/:publicId` + `PATCH /continuity/dr-runs/:id/status|steps` + `POST .../issues` endpoints.
- Detail page `GET /continuity/dr-plans/:publicId` full view (8-section: triggers, activation, comms, steps, rollback, contacts, linked changes/KB, history) vs only list+card.
- Test scheduler job: trigger per `testingSchedule` (cron) + review reminder job nag `reviewDueAt` lewat.
- Compliance framework integration (ISO 22301 mapping), webhook trigger DR plan from incident `major → activationProcedure`.
- `linkedChangeIds` / `linkedKBSlugs` cross-links have no navigation (no `Link /changes/:id` or `/kb/:slug`).
- URL persistence for filters/tabs/sort/pagination (all in local state like legacy).

## Primary View — Per Tab

### ContinuityLayout (shared chrome)

`-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` `ContinuityLayout.tsx:36-94` — header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1` accent `transition-colors duration-500` dynamic `#B42318|#DC6803|#12B76A` `ContinuityLayout:29-33` + `px-6 py-4` title `Business Continuity` `20px bold ois-text` + `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` stats `{bia.length} services in BIA · {activePlans} active DR plans · {passed} tests passed` + conditional catastrophic `danger` + critical `warning` + failedTests `danger` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab bar `nav flex px-4 overflow-x-auto scrollbar-hide` 3 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` + outlet `flex-1 min-h-0 overflow-auto`.

### BIAMatrixPage (`/continuity/bia`)

`flex flex-col h-full min-h-0` `BIAMatrix.tsx:11-96` — top `px-6 pt-4 pb-2 flex justify-end gap-2 shrink-0` `+ New BIA entry primary Plus 15 gap-1.5 px-3 py-1.5 text-sm font-semibold bg-ois-primary hover:bg-ois-primary/90 rounded-lg` `Can continuity update`; content `flex-1 overflow-auto max-w-screen-xl mx-auto px-6 py-6 space-y-8`.

**BIA Impact Matrix:** header `text-base semibold ois-text BIA Impact Matrix` + `text-sm ois-text-subtle` `Services plotted by RTO (rows) and impact (columns). Click a cell to view details.` + card `bg-white border-ois-border rounded-xl p-4` `BIAMatrix` (`BIAMatrix.tsx:6-70`): col headers `IMPACT_LEVELS catastrophic→minor` `text-xs semibold` `color impactMeta.color` + `≥ $k/hr 10px gray-400` (`hourlyMin/1000 k`); rows `RTO_CLASSES immediate→extended` `w-[140px]` header `12px semibold` `color rtoMeta.color label` + `10px gray-400 minutes` ; cells `flex-1 px-1 min-h-[72px]` = `BIAMatrixCell` if `entries.find rtoClass===row && impactLevel===col` else `dashed gray-200 bg-gray-50 rounded-lg`.

**BIA Entries Table:** header `BIA Entries 16 semibold + Click any row to open drawer 14 subtle 12 subtle` + card `bg-white border-ois-border rounded-xl overflow-hidden overflow-x-auto` table `w-full text-sm border-collapse min-w-[900px]` thead `bg-ois-surface-muted border-b border-ois-border th px-4 py-2.5 text-left 11px semibold ois-text-subtle uppercase tracking-wide` 8 typed cols + `w-10` actions; tbody `divide-y divide-ois-border` per `BIAEntryRow`.

### DRPlans (`/continuity/dr-plans`)

`flex flex-col h-full min-h-0` `DRPlans.tsx:41-283` — top `+ New plan primary` `Can continuity.update` `px-6 pt-4 pb-2 flex justify-end`; content `flex-1 overflow-auto max-w-screen-xl mx-auto px-6 py-6 space-y-4`.

**Overdue Review Banner:** `if overduePlans.length>0` `overduePlans = filter isOverdue(reviewDueAt) reviewDueAt<today` `rounded-lg border-amber-200 bg-amber-50 p-4` `flex gap-3 AlertTriangle 16 amber-600 mt-0.5` `{n} DR plan(s) require(s) review` `14 semibold amber-900` + per plan `publicId mono semibold amber-800 + names + review was due locale 14 amber-800` + `Last tested locale · X weeks overdue 12 amber-700` (`Math.floor((today-review)/604800000)`) + `Review now ChevronRight 13 amber-700 hover:amber-900 → setActiveTab overdue_review`.

**Filter bar:** `Search 14 left-2.5 Search pl-8 max-w-72` placeholder `Search plan name or ID…` + `FilterDropdown status All statuses N | Active N | Approved N | Under review N | Draft N | Retired N` counts `statusCounts[status]` + service filter + `Reset X 12 ois-text-subtle hover:ois-danger border-ois-border rounded-lg bg-white if hasFilters`.

**Status tabs:** 5 `All|Active|Under review|Draft|Overdue review` `flex gap-0.5 border-b border-ois-border` `px-3 py-2 border-b-2 -mb-px` active `border-ois-primary text-ois-primary` counts `tabCounts[value]` suffix `text-xs opacity-70`.

**Plan cards:** `grid lg:grid-cols-2 gap-4` `filtered = by tab (active/under_review/draft/overdue_review else all + status dropdown + service includes + search name/publicId lower includes)` `DRPlanCard` per. Empty `py-20 No DR plans found Try adjusting + Reset if hasFilters`.

### DRTests (`/continuity/tests`)

`flex-col h-full min-h-0` `DRTests.tsx:40-333` — top `+ Schedule test primary Plus 15 → showWizard true` `Can continuity.update` `flex justify-end px-6 pt-4 pb-2`; content `flex-1 overflow-auto max-w-screen-xl mx-auto px-6 py-6 space-y-4`.

**Active Test Banner:** `if activeTest = find status in_progress` `rounded-lg border-blue-200 bg-blue-50 p-4` `flex gap-3 Radio 16 blue-600 animate-pulse` `DR TEST IN PROGRESS 14 bold uppercase tracking-wide blue-900` + `publicId — planPublicId: planName 14 semibold blue-800` + `type underscore→space capitalized · env · Started Xh Ym ago 12 blue-700` + `Progress: X of Y steps complete · Z failures · Step N running 12 blue-700` + bar `h-1.5 rounded-full bg-blue-200 w-64 fill bg-blue-600 width completed/total*100 transition-all` + pct `10 blue-600 mt-0.5` + `View live test ChevronRight 13 blue-700 hover:blue-900 → setLiveTestId(activeTest.id)`.

**Filter bar:** `Search left 2.5 pl-8 max-w-72 placeholder Search test ID, plan…` + `FilterDropdown plan All plans + distinct planPublicIds from runs` + `FilterDropdown type All/Tabletop/Functional/Full failover/Chaos` + `FilterDropdown status All/Planned/In progress/Passed/Passed with issues/Failed/Cancelled` + `Reset X 12 rounded-lg if hasFilters`.

**Status tabs:** 5 `All|In Progress|Passed|Passed with issues|Failed` `px-3 py-2 border-b-2 -mb-px whitespace-nowrap` `border-ois-primary text-ois-primary` active with counts `tabCounts`. Filter `by tab if not all + status dropdown if all + plan === planPublicId + type + search publicId|planName|planPublicId lower includes` + sort `in_progress first then startedAt desc` `filtered.sort`.

**Test run cards:** `grid lg:grid-cols-2 gap-4` `DRTestCard` per `filtered`; empty same `py-20 No test runs found`.

**Overlays:** `liveTest = find id===liveTestId` → `LiveDRTestPanel run onClose=>set null` `fixed inset-0 z-50`; `showWizard` → `DRTestRunnerWizard plans onClose onComplete=>navigate('/continuity/tests')` `fixed z-50`.

---

## Actions

| Action | Trigger | Permission | State required | Notes |
|--------|---------|------------|----------------|-------|
| View BIA matrix & entries | Open `/continuity/bia` | `continuity.read` | — | Matrix `BIAMatrixCell` + table `BIAEntryRow` click → `BIADetailDrawer` |
| View BIA detail drawer | Click matrix cell or table row `onSelectEntry` | `continuity.read` | entry exists | Drawer `w-[500px] shadow-2xl z-50` + backdrop `bg-black/30 z-40` |
| Create BIA entry | `+ New BIA entry` `Can continuity.update` `BIAMatrixPage:24` | `continuity.update` | — | Stub — inert button (no modal, see Phase 2) |
| Open DR plan from BIA | `Open DR plan` in drawer → `navigate('/continuity/dr-plans')` | `continuity.read` | linkedPlan exists | No `?plan=ID` deep link (gap) |
| View DR plans | Open `/continuity/dr-plans` | `continuity.read` | — | Tabs + filters + `DRPlanCard` grid |
| Filter DR plans by tab/search/status/service | Click tab `All|Active|Under review|Draft|Overdue review` + search + `FilterDropdown`s + `Reset` | `continuity.read` | — | Client-side `useMemo filtered` |
| Review overdue banner | `Review now ChevronRight → setActiveTab overdue_review` | `continuity.read` | `isOverdue(reviewDueAt)` | `isOverdue = new Date(iso)<TODAY` new Date() |
| Create DR plan | `+ New plan` `Can continuity.update` `DRPlans.tsx:134` | `continuity.update` | — | Stub — no `POST` (see `docs/pages/continuity.md §12` read-only) |
| Expand triggers / steps | `X more / Show fewer ChevronDown/Up` + `View steps/Hide` in `DRPlanCard` | `continuity.read` | — | Local `showAllTriggers` `showSteps` `useState` |
| Test now (start DR test) | `Test now primary Play` in `DRPlanCard → setTestingPlanId(plan.id)` → `DRTestRunnerWizard` | `continuity.update` (gated New flow, card button inherits but not explicit `Can` — gap) | plan exists | Wizard 4-step → `navigate('/continuity/tests')` (no server `POST`) |
| View DR plan detail | `Open detail ghost ExternalLink` in card | `continuity.read` | — | Placeholder no-op `handleOpenDetail` |
| View DR tests | Open `/continuity/tests` | `continuity.read` | — | Banner + filters + `DRTestCard` grid + overlays |
| View live test | `View live` primary `Play` in card `onViewLive` → `setLiveTestId` + banner `View live test` | `continuity.read` | `status in_progress` | Opens `LiveDRTestPanel` `fixed inset-0 bg-white z-50` |
| View full report | `View full report secondary FileText` in card `onViewReport` | `continuity.read` | `status passed|passed_with_issues|failed` | Placeholder no-op (no `/continuity/tests/:id`) |
| Schedule test | `Schedule test primary Plus → setShowWizard true` `DRTests.tsx:152` `Can continuity.update` | `continuity.update` | — | `DRTestRunnerWizard` without pre-selected plan |
| DR Test Runner Wizard | Modal 4-step `Select Plan → Configure → Review → Done` | `continuity.update` (wizard entry) | — | Steps `Select Plan (radio) → Configure (type/env) → Review → Success`; success both buttons call `onComplete→navigate` |
| Live panel: Pause / Fail test | `Pause secondary Pause` + `Fail test destructive` in `LiveDRTestPanel` header | `continuity.update` (expected) | `in_progress` | Stub — no `PATCH` |
| Live panel: step mark pass/fail/add note | `DRTestStepRow isActive===in_progress` `onMarkPassed/Failed/AddNote` mock | `continuity.update` | only active step gets handlers | All no-op `()=>{}` stubs |
| Add notes log entry | `DRTestNotesLog onAddNote → setNotes([...name,time,text])` with `triggeredByName` | `continuity.read` | live panel open | Local `useState`, not persisted |
| Reset filters | `Reset X 12` + empty `Reset filters` in both lists | `continuity.read` | hasFilters | Clears search+Filters state |
| Copy ID/link | `⋯` `MoreHorizontal ghost` in `BIAEntryRow` (stopPropagation) | `continuity.read` | — | No handler (gap vs incidents `⋯` menu) |

Delegate ke [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) saat shared tersedia (search `FilterDropdown` pattern), [`_shared/routing.md`](./_shared/routing.md) untuk Module Layout 3-tab, [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) untuk drawer detail pattern.

---

## Filters / Sort / Search

- **BIA:** no toolbar search/filter (table `min-w-[900px]` scroll only); sort none — fetch order; matrix axis fixed `RTO 5` rows × `Impact 5` cols (`IMPACT_LEVELS`/`RTO_CLASSES` const).
- **DR Plans:** search `name|publicId lower includes` (`Search plan name or ID…` `w-48 min-w-48 max-w-72` `pl-8 pr-3 py-1.5 text-sm border-ois-border rounded-lg focus:ring-ois-primary/30`) — client-side, no debounce. Filters: `FilterDropdown status all|active|approved|under_review|draft|retired` (only `all` tab honors dropdown) + `FilterDropdown service all|distinct serviceNames`. Tabs `All|Active|Under review|Draft|Overdue review` derived counts `tabCounts`. Sort none (insertion/cards grid). URL persist none (local state — gap vs `availability/outages ?service=`).
- **DR Tests:** search `publicId|planName|planPublicId lower includes` (`Search test ID, plan…`) — client. Filters: `planFilter all|planPublicId` options from `runs.map planPublicId` (gap — misses plans without runs), `typeFilter all|tabletop|functional|full_failover|chaos`, `statusFilter all|planned|in_progress|passed|passed_with_issues|failed|cancelled` (only `all` tab honors dropdown). Tabs `all|in_progress|passed|passed_with_issues|failed` counts `tabCounts` from `mockDRTestRuns.filter status`. Sort fixed `in_progress first then startedAt desc`. `Reset` clears all filters `search, planFilter, typeFilter, statusFilter` (`resetFilters`). No column sort, no pagination `?page&pageSize` (vs `server/lib/pagination.ts` elsewhere).
- Global: filters not reflected in URL `?q=&status=&type=` — parity gap with `incidents` `?ciId=&problemPublicId=` pattern (`docs/features/incidents.md#Filters`).

---

## Detail View

No dedicated `/continuity/:id` pages — both details are overlays.

### BIADetailDrawer (`src/components/continuity/BIADetailDrawer.tsx:40-184`)

Props `entry: BIAEntry|null, onClose, onOpenDRPlan(publicId)`. Renders `null` if no entry. Overlay `fixed inset-0 bg-black/30 z-40 onClick close + aria-hidden`, drawer `fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden`.

- **Header:** `px-5 py-4 border-b gray-200 flex justify-between shrink-0` — `publicId mono 12 gray-400 + serviceName 16 bold gray-900` + `Button ghost icon X 4 → onClose`.
- **Body `flex-1 overflow-y-auto px-5 py-4` `Section title 12 semibold gray-500 uppercase tracking-wider mb-2 + Row label w-32 gray-500 + text flex-1 14 gray-900` pattern:**
  - Impact Assessment: `BIAImpactLevelPill level` + `impactScore /100 semibold` + `$hourly / hour + $daily / day semibold` `toLocaleString`.
  - Recovery Objectives: `RTO {rto} minutes (rtoMeta.label class) gray-400` + `RPO {rpoMinutes} min`.
  - Scope: `Customer-facing Yes text-green-700 font-medium else gray-500` + `affectedUserSegments flex-wrap gap-1 bg-gray-100 gray-600 rounded 11px` per seg + `peakTrafficTimes` + `regulatoryCompliance flex-wrap gap-1 bg-blue-50 blue-700 border-blue-100 rounded 11px` per std.
  - Critical Dependencies: `BIADependencyList dependencies[]` — per row `type icon + referenceName + hard|soft + failoverAvailable ✅/✗`.
  - Continuity Risks: `BIARiskList risks[]` — `ul •` `14 gray-700` or empty `italic gray-400 No risks identified`.
  - Linked DR Plan: `if linkedPlan = plans.find id∈linkedDRPlanIds` `rounded-lg border-gray-200 bg-gray-50 p-3 space-y-2` `publicId mono 12 gray-500 + DRPlanStatusPill + name 14 semibold + version mono 12 gray-400 + Last tested locale 12 gray-500 if exists + Button outline sm gap-1 Open DR plan ExternalLink 3.5 → onOpenDRPlan(publicId)`.
  - Review: `Reviewed {formatDate lastReviewedAt} by reviewedByName` + `Approved by approvedByName if exists` + `Next review locale`.

Ref `_shared/entity-detail-page.md` drawer pattern; future parity: promote to full `w-[450px]` slide like `availability/OutageDetailDrawer` with history timeline.

### LiveDRTestPanel (`src/components/continuity/LiveDRTestPanel.tsx:21-138`)

Props `run: DRTestRun, onClose`. `fixed inset-0 bg-white z-50 flex flex-col overflow-hidden`.

- **Header `px-6 py-4 border-b gray-200 bg-white flex justify-between`:** left `publicId mono 14 semibold gray-900 + DRTestStatusPill` · right `Button secondary sm gap-1 Pause 3.5 + Button destructive sm Fail test + Button ghost icon X`.
- **Body `flex-1 overflow-y-auto max-w-3xl mx-auto px-6 py-5 space-y-6`:**
  - Plan + meta `space-y-1` `planName 16 semibold + DRTestTypeChip + running {getRunningMinutes(startedAt)} min running if started 14 gray-500` + `Participants: join userName, 12 gray-500 if any`.
  - Progress `pct completed/total*100` `pct% complete — X/Y steps 12 gray-500 + h-2.5 bg-gray-100 rounded-full fill bg-blue-500 width pct`.
  - Steps `Steps 11 semibold uppercase gray-500 tracking-wider mb-2` `space-y-1` per `DRTestStepRow step isActive = id===activeStepId (find status in_progress) onMarkPassed/Failed/AddNote () draft only when `step.id===activeStepId` else undefined (no-ops).
  - Issues `Issues Found 11 uppercase mb-2` `if issues.length===0 italic 14 gray-400 None so far.` else `space-y-2 DRTestIssueCard issue` per (`severity critical|major|minor|observation` `status open|in_progress|resolved` + `linkedChangePublicId`).
  - Notes Log `Notes Log 11 uppercase mb-2` `DRTestNotesLog notes={local useState {name,time,text}[]} onAddNote={handleAddNote push triggeredByName}` — real-time textarea + `Add note` button.

Other cards: `DRTestResultsSummary` (`src/components/continuity/DRTestResultsSummary.tsx:10-55`) metric rows `CheckCircle green-500 if achieved≤target else XCircle red-500 + RTO: {achieved} min (target {target} min) semibold green-700|red-700` + `N issues found amber-50 amber-700 rounded-full if length>0`; `DRTestIssueCard`, `DRTestStepRow` (pill status `pending|in_progress|passed|failed|skipped` + `Mark passed/failed` when active).

---

## State Lifecycle

```
BIAEntry:   created (lastReviewedAt) → nextReviewAt (stale if < now)
            no status field — lifecycle is review cycle (BIA Matrix table + Review Metadata)
            overdue if nextReviewAt < NOW (row AlertCircle amber-500 + BIADetailDrawer shows dates)

DR Plan:    draft → approved → active → under_review → retired
            (linear forward per docs/pages/continuity.md §7; no formal rejected/cancelled)
            draft|under_review trigger orange accent via draftPlans count
            reviewDueAt drives overdue banner + Meta amber warning + status tab overdue_review

DR TestRun: planned → in_progress → passed / passed_with_issues / failed / cancelled
            planned = scheduled via wizard/testingSchedule
            in_progress = banner + card progress + LiveDRTestPanel
            passed / passed_with_issues / failed → DRTestResultsSummary RTO/RPO achieved vs target + issues[] + lessonsLearned line-clamp-2 + recommendations
            failed + catastrophic without active plan → red accent (ContinuityLayout:29-33)

StepResult: pending → in_progress → passed / failed / skipped
            activeStepId = find in_progress; only active step exposes mark handlers (stubs)

Issue:      open → in_progress → resolved (DRTestIssue status)
            severity critical|major|minor|observation
```

Review freshness: `BIA lastReviewedAt/nextReviewAt` + `DRPlan reviewDueAt + lastTestedAt` + `DRTestRun plannedDate/startedAt/completedAt` drive lifecycle; no explicit versioning beyond `DRPlan.version` string.

Ref types `src/types/continuity.ts:26`, `18-24` + `docs/pages/continuity.md §7`.

---

## Permissions (action-level)

| Action | Permission | Who | Notes |
|--------|------------|-----|-------|
| View BIA / DR Plans / DR Tests (all GET) | `continuity.read` | All authenticated — `platformRouter.use('/continuity', requirePermission('continuity.read'))` `server/routes/platform.ts:32` | Server `listByKind` tenant-isolated `req.tenantId`; violation → 403 `scope_violation` (global `requireAuth` + `withScopedDb` `server/app.ts:126`) |
| Create/edit BIA entry, create DR plan, schedule/start DR test | `continuity.update` | Owner / Continuity Manager — UI `Can module="continuity" action="update"` wraps `+ New BIA entry` `BIAMatrix.tsx:24`, `+ New plan` `DRPlans.tsx:134`, `Schedule test` `DRTests.tsx:151` | Stub — buttons inert / wizard mock; real `POST/PATCH /continuity/*` missing (`docs/pages/continuity.md:189` read-only API saat ini). `RequirePermission` guard not yet layered per-route for mutations |
| Pause / Fail live test, mark step pass/fail, add issue/note | `continuity.update` (expected) | Same | Currently local stubs `() => {}` + `useState` not `PATCH /continuity/dr-runs/:id` |

No `continuity.write|delete` separate — split `read`+`update` like `availability`/`capacity`. `RequirePermission` global via `server/app.ts:126` `withScopedDb` context (`req.tenantId`, `req.permissions`). Legacy `docs/pages/continuity.md §8` mirrors: `continuity.read` Lihat semua (middleware guard), `continuity.update` Create/edit.

UI gate pattern: `Can` hides `+ New*`/`Schedule test` if lacking `continuity.update`; `DRPlanCard` `Test now`/`View steps` not separately gated (gap — should mirror `Can`).

---

## Empty / Loading / Error

- **Empty BIA matrix:** `BIAMatrix` cell `dashed border-gray-200 bg-gray-50 min-h-[72px] rounded-lg` for missing impact×RTO combos; table `mockBIAEntries.map` empty → `tbody` empty (no `No entries` row — gap vs `capacity` `No thresholds match`).
- **Empty DR Plans:** `filtered.length===0 → py-20 text-center text-base semibold ois-text mb-1 No DR plans found + text-sm subtle Try adjusting your filters or search. + Reset filters border-ois-border rounded-lg if hasFilters` (`DRPlans.tsx:244-257`).
- **Empty DR Tests:** same `py-20 No test runs found Try adjusting… + Reset if hasFilters` (`DRTests.tsx:285-298`).
- **Empty Live Issues:** `run.issues.length===0 → text-sm gray-400 italic None so far.` (`LiveDRTestPanel.tsx:116-123`).
- **Empty Overdue banner:** hidden if `overduePlans.length===0` — `overduePlans derived isOverdue(reviewDueAt)` (`DRPlans.tsx:58-61`).
- **Empty Active Test Banner:** hidden if no `status in_progress` — `activeTest ?? null` (`DRTests.tsx:61-63`).
- **Empty Lessons:** hidden `if !lessonsLearned` else `italic line-clamp-2 Lessons: 12 gray-600` (`DRTestCard.tsx:87-91`); `recommendations` not displayed in card (only in `DRTestRun` type).
- **Loading:** `useResource(() => continuityService.*)` → `data null → []` → zero-state renders (no skeleton/shimmer unlike `cmdb` or `incidents` — parity gap; should show `TableSkeleton`/`CardSkeleton`).
- **Error:** no banner — failure → silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state).
- **No BIA/DR data:** `recentTests 0 catastrophic 0 failedTests 0` → accent green `#12B76A` + header stats `0 services in BIA · 0 active DR plans · 0 tests passed`; cards grid empty with header intact.

---

## Phase 2 Deferred

- **BIA CRUD** `POST /continuity/bia` + `PATCH /continuity/bia/:publicId` (`createBIAEntrySchema` — serviceId/impactLevel/impactScore/rto/rpo etc.) — rationale: `+ New BIA entry` is `Button` no modal, legacy `docs/pages/continuity.md §12` Mutation endpoints unavailable (read-only API saat ini).
- **DR Plan CRUD** `POST /continuity/dr-plans` + `PATCH .../:publicId` (`createDRPlanSchema` — name, biaEntryIds, objectives, triggers[], procedures, recoverySteps[], contacts, reviewDueAt, linkedChange/KB) + full detail page `GET /continuity/dr-plans/:publicId` 8-section view — rationale: `+ New plan` button inert + `handleOpenDetail` no-op placeholder; `docs/pages/continuity.md §14` lists gaps.
- **DR Test runner wiring** `POST /continuity/dr-runs` (`{planId, type, environment, objectives, scope, plannedDate}`) + `PATCH .../:id/status|steps|issues` for live panel active steps + `POST .../:id/notes` + `PATCH .../:id review` (lessons/recommendations/signedOff) — rationale: `DRTestRunnerWizard handleComplete` just `setStep(4)` + `navigate`, live `DRTestStepRow` callbacks are `()=>{}` stubs, notes local `useState` only (`LiveDRTestPanel.tsx:22-33`).
- **Detail page for test report** `GET /continuity/dr-runs/:publicId` rich report view (RTO/RPO vs target chart, issues grouped severity, timeline) — rationale: `handleViewReport` no-op placeholder.
- **Jobs:** review reminder scheduler (`reviewDueAt` lewat nag `DR test_reminder` `server/jobs/`) + test scheduler `testingSchedule` trigger test + polling/WebSocket for `LiveDRTestPanel` auto-refresh (vs manual now).
- **Compliance framework** ISO 22301 mapping `regulatoryCompliance[] → framework controls`.
- **Webhook trigger** DR plan auto-activation from incident (`major incident → activationProcedure`) + `triggeredIncidentIds` / `linkedChangeIds` / `linkedKBSlugs` cross-link navigation.
- **URL persistence** `?tab=&search=&status=&type=&service=` via `useSearchParams` (heatmap-like `?service&date` in `availability`) + pagination `?page&pageSize` + multi-sort.
- **Selection improvements:** BIA stale `new Date('2026-05-10')` → `new Date()`, `DRTests` `ALL_PLAN_OPTIONS` source from `drPlans` not `drRuns`, plan card progress bar real `totalEstMinutes` vs static green.
- **Mobile layout** real list/graph fallback vs current `min-w-[900px]` only.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/continuity/` + `src/components/continuity/` + `docs/pages/continuity.md`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1` accent dynamic `#B42318|#DC6803|#12B76A` `transition-colors duration-500` (`ContinuityLayout.tsx:29-36`). Jangan ganti ke layout lain.
2. **Tabs** `NavLink Grid3x3|FileText|FlaskConical 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` (`ContinuityLayout.tsx:71-86`).
3. **Header stats dots** `w-1 h-1 rounded-full bg-ois-border-strong` + `flex-wrap gap-3 mt-1 text-xs ois-text-muted` pattern count `{bia.length} · {activePlans} · {passed} · conditional catastrophic/critical/failed` (`ContinuityLayout.tsx:42-65`).
4. **BIA Matrix grid** rows `RTO 5 immediate→extended` + cols `Impact 5 catastrophic→minor` + dashed `border-dashed border-gray-200 bg-gray-50 min-h-[72px] rounded-lg` placeholder when no entry (`BIAMatrix.tsx:39-65`).
5. **BIAMatrixCell** `rounded-lg border-gray-200 p-2 hover:shadow-md cursor-pointer` `bg impactMeta.bg` + `serviceName 12px semibold truncate` + `{rto} min · {rtoLabel} 11px gray-500` + score pill `px-1.5 py-0.5 rounded 11px bold color bg per ≥80 #B42318/#FEF3F2 ≥60 #DC6803/#FFFAEB else #067647/#ECFDF3` + hover reveal `border-t gray-200/60 $cost/hr + compliance req` (`BIAMatrixCell.tsx:24-54`).
6. **BIA impact meta colors** exact hex `biaImpactLevelMeta` catastrophic `#7F1D1D #FEF2F2` / critical `#B42318 #FEF3F2` / major `#DC6803 #FFFAEB` / moderate `#B45309 #FFFBEB` / minor `#067647 #ECFDF3` hourlyMin `38000|20000|10000|3000|0` (`src/lib/constants.ts:439-445`). Jangan map ke token generik tanpa alias.
7. **RTO class colors** exact `immediate #B42318 <15 min | short #DC6803 15min–2h | medium #B45309 2–8h | long #475467 8–24h | extended #475467 >24h` (`rtoClassMeta` `447-453`).
8. **BIA Entries table** `min-w-[900px]` + thead `bg-ois-surface-muted border-b 11px semibold ois-text-subtle uppercase tracking-wide px-4 py-2.5` + `BIAEntryRow hover:bg-gray-50 cursor-pointer` + compliance `bg-blue-50 text-blue-700 border-blue-100 rounded 10px medium` + DR plan link `font-mono 12 blue-600` + `AlertCircle 3.5 amber-500` if `nextReviewAt` overdue (`BIAEntryRow.tsx:27-81`).
9. **BIADetailDrawer** overlay `fixed inset-0 bg-black/30 z-40` + drawer `fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col` + Section `12 semibold gray-500 uppercase tracking-wider mb-2 + Row w-32 gray-500` (`BIADetailDrawer.tsx:40-72`). Preserve `Linked DR Plan card border-gray-200 bg-gray-50 p-3 + DRPlanStatusPill`.
10. **DRPlans overdue banner** `rounded-lg border-amber-200 bg-amber-50 p-4 AlertTriangle 16 amber-600` `font-semibold amber-900` + `weeksOverdue floor(days/7)` + `Review now ChevronRight 13 amber-700 hover:amber-900` (`DRPlans.tsx:146-176`).
11. **DRPlanCard** `rounded-lg border-gray-200 bg-white p-4 space-y-3` structure `StatusPill+publicId mono` + trigger preview `slice 0,2` + `X more ChevronDown blue-600` + steps `h-1.5 rounded-full bg-green-500 w-full` + `View steps Chevron` expand `w-5 h-5 bg-gray-100 stepNumber` + `Critical red-700 bg-red-50 10 bold` + Test Status `DRTestStatusPill` + `passed_with_issues amber-600` hint + Meta `AlertTriangle 3 amber-600 if reviewOverdue` + actions `Test now primary Play 3.5 + View steps secondary List 3.5 + Open detail ghost ExternalLink ml-auto` (`DRPlanCard.tsx:38-173`).
12. **DRPlanStatusPill** exact mapping `draft #475467 #F1F3F7 | approved #1849A9 #EFF4FF | active #067647 #ECFDF3 | under_review #B45309 #FFFAEB | retired #98A2B3 #F9FAFB` `gap-1.5 rounded-full px-2 py-0.5 12px medium + dot w-1.5 h-1.5` (`DRPlanStatusPill.tsx:10-16`).
13. **DRTests active banner** `rounded-lg border-blue-200 bg-blue-50 p-4 Radio 16 blue-600 animate-pulse` `DR TEST IN PROGRESS 14 bold tracking-wide blue-900 uppercase` + `publicId — planPublicId: planName 14 semibold blue-800` + `type capitalized · env · Started Xh Ym ago` + progress `Progress: X of Y steps complete · Z failures + h-1.5 bg-blue-200 w-64 fill bg-blue-600 width pct 10 blue-600` + `View live test ChevronRight 13 blue-700` (`DRTests.tsx:166-209`).
14. **DRTestCard** `rounded-lg border-gray-200 bg-white p-4 space-y-3` header `DRTestStatusPill+publicId mono` + `planName 14 semibold+DRTestTypeChip` + `Started + Duration + environment 12 gray-500` + progress `in_progress only h-2 bg-gray-100 fill bg-blue-500 width pct` + `DRTestResultsSummary if passed|passed_with_issues|failed` + `N issues amber-600 · K critical` + `Lessons italic line-clamp-2 12 gray-600` + actions `View live primary Play | View full report secondary FileText border-t gray-100` (`DRTestCard.tsx:34-111`).
15. **DRTestStatusPill & TypeChip & ResultsSummary** exact colors `drTestStatusMeta` `planned #475467 #F1F3F7 | in_progress #0BA5EC #F0F9FF | passed #067647 #ECFDF3 | passed_with_issues #DC6803 #FFFAEB | failed #B42318 #FEF3F2` (`drTestStatusMeta 462-469`) + `DRTestResultsSummary MetricRow CheckCircle green-500 if achieved≤target else XCircle red-500 + RTO/RPO semibold green-700|red-700 + target gray-400` (`DRTestResultsSummary.tsx:9-31`) + Issues badge `amber-50 amber-700 border-amber-100 rounded-full 12 medium`.
16. **LiveDRTestPanel** full-screen `fixed inset-0 bg-white z-50 flex flex-col` header `px-6 py-4 border-b gray-200 publicId mono 14 semibold + DRTestStatusPill + Pause secondary Pause 3.5 + Fail test destructive + X ghost icon` + body `max-w-3xl mx-auto px-6 py-5 space-y-6` `planName 16 semibold + DRTestTypeChip + running mins 14 gray-500` + progress `h-2.5 bg-gray-100 fill bg-blue-500 width pct + X/Y steps 12 gray-500` + Steps section `11 semibold uppercase gray-500 tracking-wider mb-2 space-y-1 DRTestStepRow isActive` + Issues section same + Notes Log `DRTestNotesLog` local (`LiveDRTestPanel.tsx:36-136`).
17. **DRTestRunnerWizard** modal chrome `fixed inset-0 bg-black/40 z-40 + fixed inset-0 z-50 flex center + bg-white rounded-xl shadow-2xl max-w-xl max-h-[90vh]` header `px-6 py-4 border-b Run DR Test 16 bold + Step X of 4` + step indicator `w-6 h-6 rounded-full done green-500 ✓ vs active blue-600 vs pending gray-100 gray-400 11 bold + divider flex-1 h-px bg-gray-200` + `Next: Configure primary sm disabled !selectedPlanId` (`DRTestRunnerWizard.tsx:49-142`).
18. **Filter bar pattern** `relative left-2.5 Search 14 ois-text-subtle + input pl-8 pr-3 py-1.5 text-sm border-ois-border rounded-lg bg-white focus:ring-ois-primary/30` + `FilterDropdown` + `Reset flex gap-1 px-2.5 py-1.5 text-xs subtle hover:danger border-ois-border rounded-lg bg-white hover:border-ois-danger/40` + status tabs `px-3 py-2 border-b-2 -mb-px active border-ois-primary text-ois-primary count opacity-70` (`DRPlans.tsx:179-241`, `DRTests.tsx:211-282`).
19. **Tokens** strictly `ois-bg #F7F8FA, ois-surface #FFFFFF, ois-surface-muted #F1F3F7, ois-border #E4E7EC, ois-border-strong #D0D5DD, ois-text #101828, ois-text-muted #475467, ois-text-subtle #98A2B3, ois-primary #1F4FD4, ois-success #12B76A, ois-warning #F79009, ois-danger #F04438, ois-sev-p1 #B42318` (`src/index.css:7-33`) — no ad-hoc hex beyond typed palettes.
20. **Empty states** preserve `py-20 No ... match + text-sm muted Try adjusting + Reset if filtered` (`DRPlans.tsx:244`, `DRTests.tsx:285`) and dashed placeholders.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `continuityService.bia()` | `GET /api/v1/continuity/bia` | `continuity.read` | `listByKind<BIAEntry>(tenantId,'bia')` `server/routes/platform.ts:319` |
| `continuityService.drPlans()` | `GET /api/v1/continuity/dr-plans` | `continuity.read` | `listByKind<DRPlan>(tenantId,'dr-plan')` `:317` |
| `continuityService.drRuns()` | `GET /api/v1/continuity/dr-runs` | `continuity.read` | `listByKind<DRTestRun>(tenantId,'dr-run')` `:318` |
| `SWR: useResource` | `apiFetch('/continuity/*')` | `continuity.read` | `src/services/platformServices.ts:185-189` + `src/services/core.ts:29-61` + `useResource deps []` |
| Future: create BIA | `POST /api/v1/continuity/bia` | `continuity.update` | Not yet — `createBIAEntrySchema` needed (see Phase 2) |
| Future: create plan | `POST /api/v1/continuity/dr-plans` | `continuity.update` | Body `name, biaEntryIds, objectives, triggerConditions[], procedures, recoverySteps[], contacts, reviewDueAt` |
| Future: schedule test | `POST /api/v1/continuity/dr-runs` | `continuity.update` | Body `{planId, type, environment, objectives, scope, plannedDate}` → `DRTestRunnerWizard` |
| Future: live update | `PATCH /api/v1/continuity/dr-runs/:id` | `continuity.update` | `{status, stepResults[], issues[], notes}` for panel |

All via `src/services/platformServices.ts:185-189` `apiFetch<'/continuity/*'>` + `src/services/core.ts:29-61`. Tenant-scoped `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Socket: none yet (future `tenant:{tenantId}` for `LiveDRTestPanel` + review reminder).

## Open Items

- [ ] Replace `BIAEntryRow` hardcoded `new Date('2026-05-10')` with `new Date()` for overdue dot — stale deterministic guard breaks after May 2026 (`BIAEntryRow.tsx:18-20`, same risk `DRPlans:12` static `new Date()` is correct but test snapshot drift).
- [ ] Wire `BIADetailDrawer onOpenDRPlan` to `navigate('/continuity/dr-plans?plan=' + publicId)` → highlight filter on target (currently plain `/continuity/dr-plans`).
- [ ] Derive `ALL_PLAN_OPTIONS` in `DRTests.tsx:48` from `drPlans.map planPublicId` not `drRuns` — plans without runs are invisible to filter.
- [ ] Add `+ New BIA entry` + `+ New plan` modals (`POST /continuity/bia|dr-plans`) — verify `bia`/`dr-plan` `kind` mapping in documents repo; gate `Can continuity.update`.
- [ ] Wire `DRTestRunnerWizard` to real `POST /continuity/dr-runs` (`Step3Review onSchedule/onStartNow → apiFetch` + `setTestingPlanId` + `refresh drRuns`) replacing current local `onComplete→navigate` only.
- [ ] Implement `LiveDRTestPanel` actions `Pause/Fail` → `PATCH /continuity/dr-runs/:id {status}` + `DRTestStepRow` `onMarkPassed/Failed` → `PATCH .../:id/steps/:stepId` + persist `DRTestNotesLog` via `POST .../:id/notes`.
- [ ] Add `View full report → /continuity/tests/:publicId` detail route (RTO/RPO chart, issues grouped by severity, recommendations, signOff) — `handleViewReport` currently no-op.
- [ ] Confirm `DRPlanStatus approved` vs `active` semantics: `approved` shown in card/status dropdown but not in `TABS` — decide if tab `Approved` needed alongside `Active`.
- [ ] Implement `DRPlanCard` real progress bar `totalEstMinutes` vs green `w-full` paper bar; steps `verificationCriteria` display (stored but not rendered).
- [ ] Add URL persist `?tab=&q=&status=&service=&type=&plan=` via `useSearchParams` (reuse `availability/outages` pattern) + pagination + save `onSelectEntry` focus in query.
- [ ] Wire cross-links `linkedChangeIds → Link /changes/:publicId`, `linkedKBSlugs → Link /kb/:slug`, `triggeredIncidentIds → Link /incidents/:publicId` in `BIADetailDrawer` + `DRPlanCard` + `LiveDRTestPanel`.
- [ ] Test `ContinuityLayout` render `useResource continuityService.bia/drPlans/drRuns` — update `CompletionPlan` + `server/__tests__/*` helpers (DB-backed via `server/__tests__/helpers.ts`; need Postgres) — verify `GET /api/v1/continuity/bia|dr-plans|dr-runs` with tenant scope.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/continuity.md` + `src/routes/continuity/*` (ContinuityLayout/BIAMatrixPage/DRPlans/DRTests) + `src/components/continuity/*` (BIAMatrixCell/Row/Drawer/DRPlanCard/DRTestCard/LiveDRTestPanel/DRTestRunnerWizard 4-step) + `server/routes/platform.ts:32,317-319` + `src/types/continuity.ts` + `src/lib/constants.ts:434-469` + `src/services/platformServices.ts:185-189` + tokens `src/index.css:7-33` to template features (Module Layout 3 tabs → BIA Matrix 5×5 + Entries table + DR Plans overdue+filters+cards + DR Tests active banner+filters+live panel, lifecycle+permissions) | — |
