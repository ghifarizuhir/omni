# Testing — Service Validation & Testing (ITIL 4)

Status: **Draft**
Route: `/testing` (layout), `/testing/plans` (plans), `/testing/cases` (cases), `/testing/runs` (runs), `/testing/sign-off` (sign-off queue)
Sidebar: Change & Delivery · Testing
Source: `src/routes/testing/TestingLayout.tsx:14`, `TestPlans.tsx:38`, `TestCases.tsx:53`, `TestRuns.tsx:58`, `SignOffQueue.tsx:37` · `src/components/testing/*` · `server/routes/platform.ts:249-264` (`platformRouter` `/testing`) · `src/types/testing.ts:3-205` · `src/lib/constants.ts:336-373` (`testRunStatusMeta`, `testStepResultMeta`, `testCasePriorityMeta`, `signOffStatusMeta`, `signOffTypeMeta`)

---

## Intent

Mengelola **validasi layanan** end-to-end — authoring test plan & case, orchestrating test run execution dari pre-deployment/scheduled/manual/CI trigger, sampai **sign-off gate** yang mengunci promosi Release/Change dan membuktikan compliance. Satu tempat bagi Release Manager, QA, dan Approver untuk melihat *what was tested, how it passed, and who signed it off* — dengan SLA breach dan flake awareness sebagai first-class signal.

ITIL 4: Service Validation & Testing memastikan setiap change/release memenuhi acceptance criteria sebelum masuk production. Test Plan = scope, Test Case = acceptance step, Test Run = bukti eksekusi, Sign-off = governance gate.

## Current State (snapshot `src/routes/index.tsx:175-180`)

- `src/routes/index.tsx:175` → `<TestingLayout />` at `/testing` (parent Module Layout, `height calc(100vh-3.5rem) -m-6`)
- `src/routes/index.tsx:176` → `<TestPlans />` at `/testing/plans`
- `src/routes/index.tsx:177` → `<TestCases />` at `/testing/cases`
- `src/routes/index.tsx:178` → `<TestRuns />` at `/testing/runs`
- `src/routes/index.tsx:179` → `<SignOffQueue />` at `/testing/sign-off`
- Components: `TestPlanRow` (`TestPlanRow.tsx:24`), `TestRunCard` (`TestRunCard.tsx:19`), `ActiveTestRunBanner` (`ActiveTestRunBanner.tsx`), `TestRunStatusBadge`, `TestPassRateBar`, `FailureDetailCard`, `LiveTestRunDetail`, `SignOffCard` (`SignOffCard.tsx:25`), `SignOffApproveModal` (`SignOffApproveModal.tsx:14`), `SignOffRejectModal`, `EvidenceList` (`src/components/testing/`).
- API: `platformRouter` in `server/routes/platform.ts:249-264` — `GET /testing/plans`, `GET /testing/cases?planId=`, `GET /testing/runs?active=true`, `GET /testing/sign-offs` — all `requirePermission('testing.read')` (`platformRouter.use('/testing', requirePermission('testing.read'))` at `platform.ts:28`) + `listByKind('test-plan'|'test-case'|'test-run'|'sign-off')`. No write endpoints yet.
- Types: `TestPlanType 6` (`release|regression|smoke|load|security|compliance`), `TestPlanStatus draft|active|archived`, `TestCaseType 6` (`functional|integration|smoke|performance|security|manual`), `TestCasePriority p0..p3`, `TestCaseStatus active|archived|flaky`, `TestRunStatus 7` (`pending→timed_out`), `TestStepResultStatus 5` (`pending→skipped`), `SignOffStatus 4`, `SignOffType 4` (`src/types/testing.ts:3-36`).
- Service: `testingService` in `src/services/platformServices.ts:118-124` — `plans()`, `cases(planId?)`, `runs()`, `activeRuns()` (`?active=true`), `signOffs()` via `apiFetch('/testing/...')`.
- Constants: `testRunStatusMeta` dot/bg mapping, `testStepResultMeta` icon/color, `testCasePriorityMeta` p0 `#B42318`→p3 `#475467`, `signOffStatusMeta`/`signOffTypeMeta` (`constants.ts:336-373`).

**Working:**
- TestingLayout header: `w-1` accent stripe `breached>0 #B42318 else passRate<80 #DC6803 else passRate≥95 #12B76A else #1F4FD4` (`TestingLayout.tsx:36-40`) `transition-colors duration-500`, stats row `{activePlans} active plans · {activeRuns} runs in progress · {passRate}% pass rate` + conditional `{pendingSignOffs} sign-offs pending` + `{breachedSignOffs} SLA breached` (danger). Tab bar `NavLink border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` with icons `ClipboardList|FileText|PlayCircle|ClipboardCheck 14`.
- TestPlans: search + 3 `FilterDropdown` (Component distinct `componentName`, Status `active|draft|archived`, Owner distinct `ownerName`) + `Can testing.update` `New plan` (`Plus 14 bg-ois-primary`), type chips All/Regression/Smoke/Load/Compliance/Security + quality chips Pass≥95%/Below90%/Last <24h, table `Public ID mono | Name button | Type pill | Component | Cases | Last run relative+Badge | Pass rate bar 30d | Owner | Actions View runs→ + ⋯ 5-item menu` sorted `lastRunAt desc`.
- TestCases: search title/publicId/steps + 5 `FilterDropdown` (Type 6, Priority P0-P3, Plan distinct `containedInPlans`, Automated yes/no, Status active/flaky/archived) + 3-row stats strip Priority `All+N` / Type 6 / Quality `Flaky >10% / Never failed`, table 9 cols `PublicID mono | Title truncate | Type pill TYPE_COLOR | Priority pill | Automated Check/dash+framework | Plan(s) count badge | Last result icon+relative | Flake rate colored | Actions MoreVertical dropdown 4` sorted `priority asc (p0 first) → title`.
- TestRuns: `Trigger run Plus bg-ois-primary`, `ActiveTestRunBanner` for `status running|pending` active, filter bar `Search + Plan/Environment/Triggered by Reset`, status chips All/Running/Passed/Failed/Partial + trigger chips Pre-deployment/Scheduled/Manual + 4 quick chips `Failed last 24h red Flame / Flaky orange AlertTriangle / Live blue Radio / Production purple Building2`, cards left `flex-1` `TestRunCard` per run with `borderColor running #0BA5EC failed #F04438 passed #12B76A else #E4E7EC`, status badge + plan link + env + counts `passed/failed/skipped/pending` with icons + progress/passRateBar/topFailures 2×FailureDetailCard + Expand/Collapse + View live, right rail `w-72 sticky top-4` 3 cards `Test Health (30d/7d pass color ≥90 green #067647 ≥75 amber #B54708 else #B42318, avg duration, total 30d) | Flaky Tests (flake >5%) | Failed Cases 7d top5` sorted `running first → createdAt desc`.
- SignOffQueue: `max-w-4xl mx-auto p-6`, filter bar search + 4 `FilterDropdown` (Type 4, Status 4, Approver distinct map, SLA Due today/this week/Breached) + Reset, quick chips `My pending (approver u-001) blue #1F4FD4 / SLA at risk (<24h) orange #DC6803 / Release validations blue`, cards `SignOffCard border pending #F79009 approved #12B76A rejected #F04438 expired #98A2B3` with `Status pill + publicId mono + Type icon+Title + Subject mono—title + X of Y runs passed + 2-col Approver/Due (alert if <24h) + EvidenceList 3 items + Approve/Reject buttons (if `pending && approverMatch && canApprove`)` else read-only italic banner, modals `SignOffApproveModal` (note optional + evidence checkbox required `disabled={!reviewed}` + schedule follow-up) / `SignOffRejectModal` (reason required), sorted `pending first → dueAt asc` with `localStatuses` optimistic hide.
- Tokens konsisten `ois-*` (`ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`) + status palettes `success #12B76A #ECFDF3`, `warning #F79009 #FFFAEB`, `danger #F04438 #FEF3F2`, `info #0BA5EC #F0F9FF`.

**Stub / Partial:**
- All writes are optimistic client-only (`localStatuses` map for sign-off, `local` expand/collapse, manual Create `New plan/case` button is visual only) — no `POST /testing/*` mutation yet.
- `ACTIVE` filter in `TestRuns` and `activeRuns` both use `?active=true` flag which `platform.ts:258-261` maps to `status running||pending` after `listByKind` (client-side filter after fetch — no DB `where` index).
- Flake detection is derived display only (`flakeRate` field from seed, `flakyCases >5%` threshold in `TestRuns.tsx:98-101` and `>10%` elsewhere) — no `cron` job `flake detector` as spec'd in `docs/pages/testing.md:209`.
- SLA breached computed client-side `dueAt < Date.now()` (`TestingLayout.tsx:31-34`, `SignOffCard.tsx:36-38`) — server `slaBreached` boolean merely stored, no scheduler `scan dueAt → mark breached`.
- `CURRENT_USER_ID = 'u-001'` hardcoded in `SignOffQueue.tsx:13`, `myPending` / `isApproverMatch` compare literal — must be `useCurrentUser()` / `req.session.userId` when real auth.
- `testing.approve` gating uses `useCan('testing','approve')` + synthetic `currentUserId '__no_user__'` when not canApprove — `SignOffCard` hides buttons but no `ScopeViolationError` round-trip.

**Missing:**
- Detail pages `/testing/plans/:id`, `/testing/cases/:id`, `/testing/runs/:id` (no route — only queue/card expand).
- Run trigger / schedule / CI webhook: external `CI/CD push run progress` not wired to realtime.
- Saved filter views, URL-persisted filters (`?q=&status=&type=&chip=`), `field:value` search parser (`priority:p0 type:security`).
- Pagination (fits `<1000` per legacy; `platform.ts` `listByKind` no `parsePagination` for testing — unlike `itsmRouter` patterns).
- Bulk actions, export CSV, test case versioning, per-case history timeline.

## Primary View — TestingLayout (`/testing`)

Layout: `TestingLayout.tsx:42-98` — outer `-m-6 flex flex-col bg-ois-bg` `height calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + tabs + content `flex-1 min-h-0 overflow-auto <Outlet>`.

### Header accent bar + KPI stripe

```tsx
// TestingLayout.tsx:23-40
activePlans   = plans.filter(p => p.status === 'active').length
activeRuns    = activeRunsData.length
completedRuns = runs.filter(r => r.status !== 'running' && r.status !== 'pending')
passRate      = completedRuns.length ? round(passed/completedRuns.length*100) : 0
pendingSignOffs = signOffs.filter(s => s.status === 'pending').length
breachedSignOffs = signOffs.filter(s => s.status==='pending' && new Date(s.dueAt)<Date.now()).length
accentColor = breachedSignOffs>0 ? '#B42318' : passRate<80 ? '#DC6803' : passRate>=95 ? '#12B76A' : '#1F4FD4'
<div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
```

KPI row `flex gap-3 mt-1 text-xs muted flex-wrap`: `{activePlans} active plans · {activeRuns} runs in progress · {passRate}% pass rate` + conditional `{pendingSignOffs} sign-offs pending` + `{breachedSignOffs} SLA breached text-ois-danger font-semibold`. Separator `w-1 h-1 rounded-full bg-ois-border-strong`. Title `text-xl font-bold text-ois-text`.

### Tabs (Module Layout)

```
TABS = [
  { Plans    /testing/plans    ClipboardList end:true },
  { Cases    /testing/cases    FileText },
  { Runs     /testing/runs     PlayCircle },
  { Sign-Off /testing/sign-off ClipboardCheck },
]
```

Rendered `nav flex px-4 overflow-x-auto scrollbar-hide` with `NavLink` `isActive ? border-ois-primary text-ois-primary : border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` `flex gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` + `icon size 14`.

---

## TestPlans Page (`/testing/plans`)

Layout: `TestPlans.tsx:147-327` `flex flex-col gap-6 p-6` — toolbar `flex justify-end` + filter bar + stats strip + `Card` table.

### Toolbar

`Can module="testing" action="update"` gates `New plan` `Plus 14 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-medium hover:bg-ois-primary/90`. No handler yet (placeholder — Phase 2 opens create modal).

### Filter bar

`flex gap-2 flex-wrap` (`TestPlans.tsx:159-213`):

- **Search** `relative flex-1 min-w-[200px] max-w-[280px] Search 14 absolute left-3` input `pl-8 pr-3 py-1.5 rounded-lg border-ois-border bg-ois-surface focus:ring-ois-primary/30` placeholder `Search...` — matches `name|publicId|componentName` lowercased (`TestPlans.tsx:107-113`).
- **Component** `FilterDropdown` value `componentFilter` options `'' Component + distinct componentName sorted` (`unique(plans.map componentName)`).
- **Status** `FilterDropdown` options `'' Status + active|draft|archived` (`ALL_STATUSES`).
- **Owner** `FilterDropdown` options `'' Owner + distinct ownerName sorted`.
- **Reset** `RotateCcw 13 px-3 py-1.5 rounded-lg border-ois-border text-sm muted hover:bg-ois-surface-muted`.

### Stats strip (2 rows)

`flex flex-col gap-2` (`TestPlans.tsx:215-263`):

- **Row 1 — Type chips** `TYPE_CHIPS = All|Regression|Smoke|Load|Compliance|Security` (note `release` type excluded from chip list but counted in `ALL_TYPES` + `typeCounts`). Button `px-3 py-1 rounded-full text-xs font-medium border` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface muted border-ois-border hover:border-ois-primary/50`. Label `{label} {count}` where `typeCounts[t]=plans.filter type===t`. Toggle `toggleTypeChip` → `typeChip===key ? 'all' : key`.
- **Row 2 — Quality chips** 3 pills `Pass rate ≥ 95%: N` (`passRate30d >=0.95`), `Below 90%: N` (`<0.9`), `Last run < 24h: N` (`lastRunAt within 24h`). Active same pill style, toggle `toggleQualityChip` → `''` if same.

Derived counts recomputed `useMemo` per `plans` (`TestPlans.tsx:68-83`).

### Table

`Card > CardBody p-0 > overflow-x-auto > table w-full text-sm` (`TestPlans.tsx:266-325`):

| Column | Source | Width | Notes |
|--------|--------|-------|-------|
| Public ID | `publicId` | auto | `font-mono text-xs text-ois-text-muted` |
| Name | `name` | flex | `button text-sm font-semibold hover:text-ois-primary text-left` → `onOpen` (placeholder) |
| Type | `type` | 90px | `text-[10px] font-bold uppercase rounded-full px-2 py-0.5` `typeChipColors[type]` (`release #067647 #ECFDF3, regression #1F4FD4 #EEF2FF, smoke #0BA5EC #F0F9FF, load #DC6803 #FFFAEB, security #B42318 #FEF3F2, compliance #6941C6 #F4F3FF` — `TestPlanRow.tsx:15-22`) |
| Component | `componentName` | 120px | `text-xs muted` or `—` |
| Cases | `caseCount` | 60px center | `text-xs font-semibold` |
| Last run | `lastRunAt` + `lastRunStatus` | 120px | `formatRelative(lastRunAt) text-xs muted` + `TestRunStatusBadge sm` if status; `Never subtle` if null |
| Pass rate (30d) | `passRate30d` | 140px | `TestPassRateBar rate showLabel` (bar `h-1.5 bg-ois-border` fill `≥95 #12B76A ≥80 #F79009 else #F04438`, label `%`) |
| Owner | `ownerName` | 120px | `text-xs muted` |
| Actions | — | 140px | `View runs → text-xs ois-primary` navigates `/testing/runs?plan={publicId}` + `⋯ MoreVertical 14` menu (`TestPlanRow.tsx:81-112`) `absolute right-0 top-7 z-20 bg-ois-surface border-ois-border rounded-lg shadow-lg py-1 min-w-[160px]` items `Open|Run now|Edit cases|Archive|Duplicate` with icons `ExternalLink|Play|FileEdit|Archive|Copy 12` |

Row `border-b border-ois-border hover:bg-ois-surface-muted transition-colors` (`TestPlanRow.tsx:31`). Default sort `lastRunAt desc` (nulls last) (`TestPlans.tsx:120-125`).

Filtered list `filtered` (`TestPlans.tsx:85-128`) applies AND: `typeChip !== 'all'` → type match, `qualityChip` → threshold, `search`, `componentFilter`, `statusFilter`, `ownerFilter`, then sort.

Empty: `flex flex-col items-center justify-center py-16 text-center gap-2` `No test plans match. text-sm muted` + `Reset text-xs ois-primary underline` (`TestPlans.tsx:269-277`).

---

## TestCases Page (`/testing/cases`)

Layout: `TestCases.tsx:154-491` `flex flex-col gap-6 p-6` — toolbar + filter bar (6 dropdowns) + stats strip 3 rows + `Card` DataTable.

### Toolbar

Same `Can testing.update` gating `+ New case inline-flex gap-2 px-3 py-2 rounded-ois-btn border border-ois-border bg-ois-surface text-sm font-medium hover:bg-ois-surface-muted` (`TestCases.tsx:157-164`). No handler yet.

### Filter bar

`flex flex-wrap items-center gap-2` (`TestCases.tsx:168-248`):

- **Search** `relative flex-1 min-w-48 Search 14 left-3` input `pl-8 pr-3 py-2 rounded-ois-btn border-ois-border focus:ring-primary/30` placeholder `Search title, ID, steps...` — matches `title|publicId|steps[].action` lowercased (`TestCases.tsx:82-89`).
- **Type** `FilterDropdown` `'' Type + TYPE_COLOR keys (Functional|Integration|Smoke|Performance|Security|Manual)` (`TYPE_COLOR` hex map `functional #1F4FD4 #EEF2FF ... security #B42318 #FEF3F2 manual #DC6803 #FFFAEB` — `TestCases.tsx:14-21`).
- **Priority** `FilterDropdown` `'' Priority + PRIORITY_ORDER p0..p3` labels via `testCasePriorityMeta[p].label` (`p0 #B42318 #FEF3F2 etc`).
- **Plan** `FilterDropdown` `'' Plan + distinct containedInPlans` derived `unique(flatMap containedInPlans)` sorted (`TestCases.tsx:72-75`).
- **Automated** `FilterDropdown` `'' Automated | Automated | Manual` mapping `isAutomated boolean`.
- **Status** `FilterDropdown` `'' Status | Active | Flaky | Archived` (`TestCaseStatus`).
- **Reset** `RotateCcw 13 inline-flex gap-1.5 px-3 py-2 text-sm muted hover:text-primary`.

### Stats strip (3 rows)

`flex flex-col gap-2` (`TestCases.tsx:251-315`):

- **Row 1 — Priority** `All N` + per `PRIORITY_ORDER p0..p3` `meta.label N` where `countByPriority` (`TestCases.tsx:43-45`). Pill `chipBase inline-flex gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer` active `bg-primary text-white` else `bg-ois-surface-muted text-ois-text-secondary hover:bg-ois-border` (`TestCases.tsx:150-152`). Click `handlePriorityChip(key)` resets `typeChip`+`qualityChip` to `all|''` unless `all`; filter applied `priorityChip !== 'all' && typeChip==='all' && qualityChip==='' → priority match` (`TestCases.tsx:102-104`) — exclusive with type chip.
- **Row 2 — Type** `TYPE_COLOR` keys each `{meta.label} {count}` (`countByType`) pill same style, `handleTypeChip` resets priority/quality, filter `typeChip!=='all' && priorityChip==='all' → type match`.
- **Row 3 — Quality** `Flaky (>10%) N` where `flakeRate>0.1` + `Never failed: N` where `failureCount===0` pills `handleQualityChip` toggles `''` if same and resets priority+type (`TestCases.tsx:144-148`), filter `qualityChip flaky→flakeRate>0.1, never_failed→failureCount===0`.

### Table

`Card > overflow-x-auto > table w-full text-sm` (`TestCases.tsx:318-489`) header `border-b border-ois-border bg-ois-surface-muted` columns:

| Column | Source | Notes |
|--------|--------|-------|
| Public ID | `publicId` | `font-mono text-xs muted` |
| Title | `title` | `block truncate font-medium text-ois-text-primary max-w-xs` title attr tooltip |
| Type | `type` | `inline-flex px-2 py-0.5 rounded-full text-xs font-medium` style `color TYPE_COLOR[type].color bg TYPE_COLOR[type].bg` |
| Priority | `priority` | same pill via `testCasePriorityMeta[priority].color/bg` (`p0 #B42318 #FEF3F2 ... p3 #475467 #F1F3F7` — `constants.ts:354-359`) |
| Automated | `isAutomated + automationFramework` | `CheckCircle2 13 #12B76A + framework text-xs muted` or `— tertiary` |
| Plan(s) | `containedInPlans.length` | `w-6 h-6 rounded-full bg-ois-surface-muted border-ois-border flex center text-xs font-medium muted` title `join(', ')` or `—` |
| Last result | `lastResult + lastExecutedAt` | `RESULT_ICONS[status]` (`passed CheckCircle2 #12B76A, failed XCircle #F04438, skipped MinusCircle #98A2B3, pending Circle #98A2B3, running Loader2 #0BA5EC` — `TestCases.tsx:29-35`) + `formatRelative(lastExecutedAt)` else `Never tertiary` |
| Flake rate | `flakeRate` | derived `flakeDisplay`: `undefined|0 → — tertiary`, `<5% #12B76A`, `<15% #F79009`, else `#F04438` `text-sm font-medium` (`TestCases.tsx:359-365`) |
| Actions | — | `MoreVertical 15 p-1.5 rounded hover:bg-ois-surface-muted muted` + `group-focus-within` dropdown `w-44 rounded-ois-card border bg-ois-surface shadow-ois-card` items `Open|Edit steps|Run individually|Archive` |

Rows `border-b border-ois-border last:border-0 hover:bg-ois-surface-muted/50` (`TestCases.tsx:371`). Sorted `priority asc P0→P3` then `title localeCompare` (`TestCases.tsx:112-117`). `unique` helper dedup via `Set`.

Empty: single row `colSpan 9 py-10 text-center muted` → `No test cases yet.` if `totalCases===0` else `No test cases match. Reset` (`TestCases.tsx:335-353`).

---

## TestRuns Page (`/testing/runs`)

Layout: `TestRuns.tsx:292-624` `flex flex-col gap-6 p-6` — toolbar + `ActiveTestRunBanner` + `flex gap-6` two-col (`flex-1 min-w-0 space-y-4` + `w-72 shrink-0 sticky top-4` right rail).

### Toolbar + Active banner

- **Trigger run** `Plus 14 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-medium shrink-0` (`TestRuns.tsx:295-298`) — placeholder (Phase 2 opens Run modal → `POST /testing/runs`).
- **ActiveTestRunBanner** (`TestRuns.tsx:302` `runs={activeRuns}`) — top banner listing live runs `status running|pending` with progress (verify `ActiveTestRunBanner.tsx` — progress `h-1.5 bg-ois-primary` + `Estimated remaining ~{estimatedDurationMin} min`).

### Two-column balance

`flex gap-6 items-start` — left main outsources filters+cards, right rail outsources health.

#### Left — Filters + Cards (`TestRuns.tsx:306-487`)

**Filter bar** `flex gap-2 flex-wrap` (`TestRuns.tsx:309-366`):

- Search `relative flex-1 min-w-[200px] max-w-[300px] Search 14` input `pl-8 py-1.5 rounded-lg border-ois-border focus:ring-ois-primary/30` placeholder `Search plan, run ID, environment...` — matches `testPlanName|publicId|environment` (`TestRuns.tsx:231-237`).
- **Plan** `FilterDropdown '' Plan + distinct testPlanName sorted`.
- **Environment** `FilterDropdown '' Environment + distinct environment sorted` label `capitalize`.
- **Triggered by** `FilterDropdown '' Triggered by + ALL_TRIGGERED_BY 5` (`manual|cicd|scheduled|pre_deployment|post_deployment`) label `replace '_' with ' ' capitalize` (`TestRuns.tsx:352-353`).
- **Reset** `RotateCcw 13 px-3 py-1.5 rounded-lg border text-sm muted hover:bg-ois-surface-muted`.

Dropdown sources `allPlans` / `allEnvironments` via `unique(map...)` (`TestRuns.tsx:163-170`).

**Stats strip 2 rows** `flex flex-col gap-2` (`TestRuns.tsx:369-413`):

- **Row 1 Status chips** `STATUS_CHIPS All|Running|Passed|Failed|Partial` (`TestRuns.tsx:42-48`). Count `statusCounts[key]=filter status===key` + `all total` (`TestRuns.tsx:173-179`). Active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface muted border-ois-border hover:border-ois-primary/50`. Toggle `toggleStatusChip` → `prev===key ? 'all' : key`. Filter `statusChip!=='all' → status===chip` (`TestRuns.tsx:197-199`).
- **Row 2 Trigger chips** `TRIGGER_CHIPS Pre-deployment|Scheduled|Manual` with counts `triggerCounts.pre_deployment etc` (`TestRuns.tsx:181-190`). Same pill style, toggle `toggleTriggerChip` → `''` if same. Filter `triggerChip → triggeredBy===chip` (`TestRuns.tsx:202-204`).

**Quick filters** `flex gap-2 flex-wrap` (`TestRuns.tsx:416-460`) 4 chips each `flex gap-1.5 px-3 py-1 rounded-full text-xs font-medium border` active palette `activeColor` vs muted `bg-ois-surface muted border-ois-border`:

| Chip | Key | Count | Active palette | Semantics |
|------|-----|-------|----------------|-----------|
| Failed last 24h | `failed24h` | `failed24hCount` (`failed||partial && createdAt≥24h`) `Flame 12` | `bg-[#FEF3F2] text-[#B42318] border-[#F04438]/40` | status failed/partial & createdAt ≥24h |
| Flaky tests detected | `flaky` | `flakyCount` (`flakeRate>0.05`) `AlertTriangle 12` | `bg-[#FFFAEB] text-[#B54708] border-[#F79009]/40` | `caseResults.some(isFlaky||flakyCaseIds.has(testCaseId))` |
| Live | `live` | `liveCount` (`activeRuns.length`) `Radio 12` | `bg-[#F0F9FF] text-[#0BA5EC] border-[#0BA5EC]/40` | `status running` |
| Production runs | `production` | `productionRunsCount` `Building2 12` | `bg-[#F4F3FF] text-[#6941C6] border-[#6941C6]/40` | `environment production` |

Toggle `toggleQuickFilter` → `''` if same (`TestRuns.tsx:282-284`). Applied before filter bar (`TestRuns.tsx:207-225`).

**Run cards** (`TestRuns.tsx:463-486`):

- Empty `flex flex-col items-center justify-center py-16 text-center gap-2 rounded-xl border border-ois-border bg-ois-surface` `No test runs match your filters. text-sm muted` + `Reset filters text-xs ois-primary underline`.
- List `space-y-4` mapping `filteredRuns.map run → <TestRunCard run isExpanded onToggleExpand>` (`TestRunCard.tsx:19-141`):
  - Container `bg-ois-surface rounded-ois-card shadow-ois-card border overflow-hidden` `style borderColor: running #0BA5EC failed #F04438 passed #12B76A else #E4E7EC` (`TestRunCard.tsx:36-38`).
  - Header `flex justify-between p-5 pb-3` `TestRunStatusBadge status` (`testRunStatusMeta dot/bg/color` mapping `pending #475467 #F1F3F7 · running #0BA5EC #F0F9FF · passed #067647 #ECFDF3 · failed #B42318 #FEF3F2 · partial #DC6803 #FFFAEB · cancelled #475467 #F1F3F7 · timed_out #B42318 #FEF3F2` — `constants.ts:336-344`) + `publicId mono xs muted`.
  - Title `text-base font-bold ois-text testPlanName` + meta `font-mono testPlanPublicId · ENV uppercase 10px font-semibold · triggeredByName text-xs muted` (`TestRunCard.tsx:45-52`).
  - Conditional deployment link `Deployment: mono ois-primary hover:underline` → `/deployments/{linkedDeploymentPublicId}` if present.
  - If `!isPassed` → progress row `flex justify-between text-[11px] muted {passedCount}/{totalCases} passed — {round(passRate*100)}%` + `TestPassRateBar rate` (`TestPassRateBar.tsx`).
  - Counts `flex gap-4 flex-wrap` `CheckCircle2 13 #067647 {passed} passed · XCircle 13 #F04438 {failed} failed · MinusCircle 13 #98A2B3 {skipped} skipped · Clock 13 #475467 {pending} pending`.
  - Conditional `Estimated remaining: ~{estimatedDurationMin} min text-xs #0BA5EC` if running & >0, or `Completed in {round(durationSec/60)} min muted` if passed & duration.
  - Failed → `Top failures` `text-[10px] font-bold uppercase tracking-wider subtle` + 2× `FailureDetailCard` (`TestRunCard.tsx:111-117`).
  - Footer `flex justify-between gap-2 pt-2 border-t border-ois-border` — left `Expand cases/Collapse Chevron 14 text-xs semibold muted` if `canExpand` (`running||failed||passed`) else empty, right `Button outline h-7 text-xs gap-1 View live|View test run ArrowRight 11`.
  - Expanded `isExpanded && canExpand → <LiveTestRunDetail run>` (per-case `TestRunCaseResult` list with status icon `testStepResultMeta`).

Left state `expandedIds Set<string>` toggle via `toggleExpand` (`TestRuns.tsx:150-161`).

Filtered derivation `filteredRuns` (`TestRuns.tsx:193-264`) AND chain: statusChip → triggerChip → quickFilter → search → plan → env → trigger → sort `running first (0 else 1) then createdAt desc`.

#### Right rail `w-72 shrink-0 sticky top-4 self-start space-y-4` (`TestRuns.tsx:490-619`)

- **Test Health** `Card > CardBody p-4`: header `text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-3 Test Health` + `space-y-2` 4 rows (`TestRuns.tsx:498-539`):
  - `Pass rate (30d) {overallPassRate}%` color `≥90 #067647 ≥75 #B54708 else #B42318`.
  - `Pass rate (7d) {passRate7d}%` same thresholds (`passRate7d` derived `runs7d = completedRuns where createdAt≥7d` → passed7d/ runs7d else fallback overall).
  - `Avg duration {avgDurationMin}m text-ois-text` where `avgDurationMin = round(sum(durationSec)/count/60)` over `runsWithDuration` (`completedRuns where durationSec!=null`).
  - `Total runs (30d) {TOTAL_RUNS_30D} text-ois-text` (full count — not filtered window, matches `mockTestRuns.length`).
  Row `flex justify-between` `label text-xs muted | value text-sm font-bold color`.

- **Flaky Tests** `Card p-4`: header `Flaky Tests 10px tracking-widest subtle mb-1` + if `flakyCount 0 → No flaky tests detected muted mt-2` else `N case(s) flagged as flaky muted mb-3` + `space-y-2` per `flakyCases.map c` (`TestRuns.tsx:561-573`) row `flex justify-between gap-2` `publicId.slice(-12) font-mono 10px muted truncate` — `round(flakeRate*100)% flake text-xs semibold #B54708 shrink-0` + `Link to /testing/cases Review → text-xs semibold ois-primary`.

- **Failed Cases (last 7d)** `Card p-4`: header `Failed Cases (last 7d)` + if `topFailureCaseEntries.length 0 → No failures in the last 7 days muted mt-2` else `space-y-2 mt-3` per `topFailureCaseEntries.slice(0,5)` (`TestRuns.tsx:599-607`) `publicId.slice(-12) font-mono 10px muted` + `title text-xs truncate`, dedup set `casePublicId` over `failedRecent = completedRuns failed|partial where createdAt≥7d` collect `topFailures` (`TestRuns.tsx:102-124`) + `Link View all →`.

Right rail computed memos `completedRuns`, `passedRuns`, `overallPassRate`, `runs7d`, `passRate7d`, `flakyCases`, `failedRecent`, `topFailureCaseEntries`, `failed24hCount`, `productionRunsCount` with `useMemo` (`TestRuns.tsx:66-132`).

## SignOffQueue Page (`/testing/sign-off`)

Layout: `SignOffQueue.tsx:37-306` `p-6 max-w-4xl mx-auto` — toolbar `flex justify-end gap-2` + filter bar + quick chips + cards + 2 modals.

### Toolbar

`Button outline sm Filter ▾` (`SignOffQueue.tsx:147`) — placeholder (legacy portal parity, no menu yet).

### Filter bar

`flex flex-wrap items-center gap-2 mb-4` (`SignOffQueue.tsx:153-217`):

- **Search** `relative flex-1 min-w-48 Search 14 left-3 text-ois-text-muted` input `pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-ois-surface focus:ring-ois-primary/40` placeholder `Search...` — matches `title|publicId|subjectTitle|subjectPublicId|approverName` (`SignOffQueue.tsx:105-115`).
- **Type** `FilterDropdown` `all|release_validation|change_validation|security_scan|compliance_check` labels `Release Validation etc` (`signOffTypeMeta` icons per type `Package|Wrench|Shield|ShieldCheck` — `constants.ts:368-373`).
- **Status** `FilterDropdown` `all|pending|approved|rejected|expired`.
- **Approver** `FilterDropdown` `all + distinct approvers Map approverId→approverName` (`SignOffQueue.tsx:64-68`) onChange `setQuickFilter(null)`.
- **SLA** `FilterDropdown` `all|today|week|breached` labels `Due today|Due this week|Breached` mapping `isToday(dueAt) === same YYYY/MM/DD` (`SignOffQueue.tsx:27-35`), `isWithinWeek ms<7d >=0`, `slaBreached boolean`.
- **Reset** `Button ghost sm X 13 text-ois-text-muted` → `handleReset` clears search+all 4+ quick (`SignOffQueue.tsx:125-132`).

Each non-search `onChange` also `setQuickFilter(null)` to avoid conflicting precedence.

### Quick filter chips

`flex flex-wrap gap-2 mb-6` (`SignOffQueue.tsx:219-254`) 3 pills `inline-flex gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border` toggle `quickFilter===key ? null : key`:

| Chip | Key | Count | Icon | Active style |
|------|-----|-------|------|--------------|
| My pending (N) | `myPending` | `approverId===u-001 && pending` | `Flame 14` | `bg-[#1F4FD4] text-white border-[#1F4FD4]` |
| SLA at risk (N) | `slaAtRisk` | `pending && isWithin24h(dueAt)` (`hoursUntilDue 0..24` — `SignOffQueue.tsx:17-20`) | `AlertTriangle 14` | `bg-[#DC6803] text-white border-[#DC6803]` |
| Release validations (N) | `releaseValidations` | `type release_validation` | `ClipboardList 14` | `bg-[#1F4FD4] text-white border-[#1F4FD4]` |

Inactive `bg-ois-surface text-ois-text border-ois-border hover:border-[#1F4FD4|#DC6803] hover:text-[#1F4FD4|#DC6803]`.

Derived counts `myPendingCount`, `slaAtRiskCount`, `releaseValidationsCount` direct `filter` over `mockSignOffs` (`SignOffQueue.tsx:53-61`).

### Filtered derivation + sort

`filteredSignOffs` (`SignOffQueue.tsx:70-123`):

```
results = mockSignOffs.filter !localStatuses.has(publicId)   // hide locally decided
if quickFilter myPending → approver===u-001 && pending
else if slaAtRisk → pending && isWithin24h
else if releaseValidations → type release_validation
else → individual: typeFilter (if !==all), statusFilter, approverFilter, slaFilter (today→isToday, week→isWithinWeek, breached→slaBreached)
then search (trim lowercased includes on title|publicId|subjectTitle|subjectPublicId|approverName)
then sort pending first (pending -1 vs non) → dueAt asc
```

`localStatuses Map<publicId, approved|rejected>` set on modal confirm → hides card without refetch (`SignOffQueue.tsx:288-289,300-301`). `canApprove = useCan('testing','approve')` gates `handleApprove/handleReject` early return if false (`SignOffQueue.tsx:134-142`).

### Cards

Empty `flex flex-col items-center justify-center py-20 gap-3 muted ClipboardCheck 40 opacity-40` `All sign-offs current. Nothing pending. text-sm font-medium` (`SignOffQueue.tsx:257-261`).

List `flex flex-col gap-4` (`SignOffQueue.tsx:263-279`): conditional banner when `!canApprove` `italic text-xs text-ois-text-subtle You can view sign-offs but cannot approve or reject.` per `SignOffQueue.tsx:264-268`, then map `SignOffCard` (`SignOffCard.tsx:25-152`):

- Container `bg-ois-surface rounded-ois-card shadow-ois-card border overflow-hidden` `borderColor borderByStatus[status]` (`pending #F79009 approved #12B76A rejected #F04438 expired #98A2B3` — `SignOffCard.tsx:18-23`).
- Badge `rounded-full px-2.5 py-1 text-xs font-semibold` style `signOffStatusMeta[status].color/bg` (`pending #DC6803 #FFFAEB approved #067647 #ECFDF3 rejected #B42318 #FEF3F2 expired #475467 #F1F3F7` — `constants.ts:361-366`) + `publicId font-mono xs muted` header row (`SignOffCard.tsx:59-67`).
- Title row `flex gap-2 TypeIcon 14 muted` (`signOffTypeMeta[type].icon Package|Wrench|Shield|ShieldCheck`) + `h3 text-base font-bold ois-text title` + subtitle `font-mono subjectPublicId — subjectTitle text-xs muted` (`SignOffCard.tsx:69-75`).
- Test summary `flex gap-1.5 text-xs muted` `font-semibold ois-text {passedRuns} of {totalRuns} runs passed` + optional `font-mono #1F4FD4 (testRunIds[0])` (`SignOffCard.tsx:77-84`). Source `signOff.testRunSummary {totalRuns,passedRuns,failedRuns}` (`types/testing.ts:184-188`).
- 2-col grid `grid-cols-2 gap-2 mb-4 text-xs`: **Approver** `text-[10px] bold uppercase tracking-wider subtle Approver` + `font-semibold ois-text approverName` + `muted approverRole` ; **Due** header + `font-semibold ois-text (or #DC6803 if isDueSoon)` where `isDueSoon = hoursUntilDue<24 && >0 && pending` (`SignOffCard.tsx:38`) prepend `AlertTriangle 11` if due soon + `formatDate(dueAt,'MMM d, HH:mm') UTC` + `Requested formatRelative(requestedAt) muted` (`SignOffCard.tsx:86-100`, `formatDate/formatRelative` in `lib/format.ts`).
- **Evidence** `text-[10px] bold uppercase tracking-wider subtle mb-2 Evidence` + `<EvidenceList items={evidenceItems}>` (`SignOffCard.tsx:102-105` derived locally: Test results `passedRuns===totalRuns → passed`, Deployment health `all checks green true`, Pass rate threshold `failedRuns===0`→pass — `SignOffCard.tsx:44-51`).
- **Action bar** if `isPending && isApproverMatch && currentUserId===approverId` → `flex gap-2 pt-3 border-t` `Button destructive sm XCircle 13 Reject` + `Button sm CheckCircle2 13 Approve` (`SignOffCard.tsx:107-127`); passed `currentUserId` is `canApprove ? 'u-001' : '__no_user__'` (`SignOffQueue.tsx:273`) so non-can users never match.
- **Decided footer** if `isDecided (approved|rejected)` → `pt-3 border-t flex gap-2 CheckCircle2 #12B76A vs XCircle #F04438 14 mt-0.5` + `text-xs font-semibold statusMeta.color {label} {formatRelative(decidedAt)}` + optional `decisionNote text-xs muted mt-0.5` (`SignOffCard.tsx:129-149`).

### Modals

- **Approve** `SignOffApproveModal` (`SignOffApproveModal.tsx:14-98`) `fixed inset-0 z-50 flex center`: `bg-black/40` backdrop, `bg-ois-surface rounded-ois-card shadow-xl max-w-lg mx-4 p-6`: header `Approve sign-off {publicId} text-base bold` + `X 16 hover muted`, meta `font-mono #1F4FD4 subjectPublicId — subjectTitle text-sm muted mb-5`, textarea Decision note `border-ois-border rounded-lg px-3 py-2 text-sm bg-ois-surface-muted rows 3 placeholder Add a note…` optional, checkboxes `I confirm I have reviewed all test evidence` (`reviewed` required) + `Schedule follow-up health check in 24h` (`scheduleCheck` optional) (`SignOffApproveModal.tsx:56-79`), footer `Cancel outline md` + `Approve gap-1 CheckCircle2 14 disabled={!reviewed}` `onConfirm(note,scheduleCheck)` → caller `setLocalStatuses(...,'approved')` (`SignOffQueue.tsx:287-289`).
- **Reject** `SignOffRejectModal` (mirror pattern) — reason required (min 1) + optional detail; disabled until filled; `onConfirm(reason)` → `localStatuses ...,'rejected'`.

Both rendered conditionally `approveTarget && <SignOffApproveModal isOpen ...>` (`SignOffQueue.tsx:282-293`).

---

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View plans list | `/testing/plans` tab | `testing.read` (STA/IFM/APS all) | — |
| View cases list | `/testing/cases` | `testing.read` | — |
| View runs list + insights | `/testing/runs` | `testing.read` | — |
| View sign-off queue | `/testing/sign-off` | `testing.read` | — |
| Create plan | `New plan` button (Plans toolbar) | `testing.update` (APS Officer+) via `Can` | — (Phase 2 opens modal → `POST /testing/plans`) |
| Create case | `+ New case` (Cases toolbar) | `testing.update` | — |
| Trigger run | `Trigger run` (Runs toolbar) | `testing.update` | plan selected (Phase 2 picks plan+env) |
| View runs for plan | `View runs →` in `TestPlanRow` | `testing.read` | navigates `/testing/runs?plan={publicId}` |
| Expand run cases | `Expand cases / View live` in `TestRunCard` | `testing.read` | `canExpand = running||failed||passed` |
| Approve sign-off | `Approve` in `SignOffCard` → `SignOffApproveModal` | `testing.approve` (APS Team Lead+ / Change Manager) via `useCan` + `approverId === currentUserId` | `status pending` |
| Reject sign-off | `Reject` → `SignOffRejectModal` | `testing.approve` + approver match | `pending` |
| Filter / Search / Chip toggle | Filter bar inputs + pills + Reset | `testing.read` | — |
| View failed/flaky in Cases | `Review →` / `View all →` links in Runs right rail | `testing.read` | — |
| View deployment from run | `Deployment: ID` link in `TestRunCard` | `deployment.read` | `linkedDeploymentPublicId` present |

Guard: `Can module="testing" action="update"` hides `New plan/case`/`Trigger run` for readers; `useCan('testing','approve')` hides or disables `Approve|Reject` and shows `You can view but cannot approve` italic (`SignOffQueue.tsx:264-268`). `currentUserId === approverId` is second gate — only assigned approver can act even if perm fits.

## Filters / Sort / Search

- **Plans** — `search` text `name|publicId|componentName`; dropdowns Component/Status/Owner (distinct derived); type chip `all|regression|smoke|load|compliance|security` (exclusive — toggles `typeChip`), quality chip `above95 (<=> ≥95%), below90 (<90%), recent (<24h)` (toggles `qualityChip`). All AND-combined then sort `lastRunAt desc` (nulls last). `Reset` clears all 6. `passRate30d` threshold uses `0..1` scale (`plan.passRate30d >=0.95` etc). No URL sync yet.
- **Cases** — `search` `title|publicId|steps[].action`; dropdowns Type (6 TYPE_COLOR) / Priority P0-P3 / Plan (`containedInPlans` distinct) / Automated (`isAutomated`) / Status; stats chips Priority row (exclusive toggling resets other chips), Type row, Quality `flaky >10%` (`flakeRate>0.1`) `never_failed failureCount===0`. Combined: dropdowns AND, chip layer exclusive semantics (`TestCases.tsx:102-110`) — priority chip only if others `all/''`, type chip only if priority `all`, quality mutually toggled. Sort `PRIORITY_ORDER P0→P3 then title`.
- **Runs** — `search` `testPlanName|publicId|environment`; dropdowns Plan (`testPlanName` distinct) / Environment / Triggered by (`ALL_TRIGGERED_BY 5`); **status chip** `all|running|passed|failed|partial` (active pivot), **trigger chip** `pre_deployment|scheduled|manual` (exclusive), **quick filter** 4 (single select) `failed24h / flaky (isFlaky||flakyCaseIds) / live (running) / production`. All AND before sort `running first (0/1) → createdAt desc`. Counts memoized `statusCounts`, `triggerCounts`, `failed24hCount`, `flakyCount`, `productionRunsCount` / `liveCount=activeRuns.length`.
- **Sign-offs** — `search` `title|publicId|subjectTitle|subjectPublicId|approverName`; dropdowns Type/Status/Approver/SLA (`today → isToday, week → isWithinWeek (<7d), breached → slaBreached`). **Quick chip** takes precedence over individual filters (exclusive branch `quickFilter` vs `else` individual filters — `SignOffQueue.tsx:73-102`). Search applied after branch. Sort `pending first → dueAt asc`. Reset clears search+4+quick+localStatuses preserved only for decided.
- URL persistence: not yet — all local `useState` (Phase 2: `?q=&type=&status=&chip=&sla=`); placeholder `Reset` clears state only. Ref future [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md).
- Search input chrome unified: `relative + Search 14 absolute left-3 + pl-8 pr-3 py-1.5/2 rounded-lg/o-btn border-ois-border bg-ois-surface focus:ring-ois-primary/30` with muted `ois-text-subtle` icon.

## Detail View

Testing has **no standalone detail routes** — each sub-page is the detail surface via cards/expand:

- **Plan row** (`TestPlanRow.tsx:24-115`): click Name `onOpen` placeholder + `View runs →` navigates `/testing/runs?plan={publicId}` (cross-tab link) + ⋯ menu 5 placeholder actions. Extended Phase 2: `/testing/plans/:publicId` with 8-tab-equivalent (Overview/Cases/Runs/Linked Releases|Changes|CI/History).
- **Case expand** — row-exclusive `Group focus-within` dropdown `Open|Edit steps|Run individually|Archive`; Phase 2 detail would show steps `preconditions|steps[].action/expectedResult|postconditions` + `automationRef|framework` + `containedInPlans` chips + history `caseResults` timeline.
- **Run expand** (`TestRunCard.tsx + LiveTestRunDetail`): `isExpanded` toggles `LiveTestRunDetail` (per-case `caseResults[]` with `status dot + title + duration + message/errorTrace + isFlaky + retryCount`). Top-failures 2× `FailureDetailCard` summarizes `casePublicId|title|failureMessage|isFlaky`. Future detail adds `pipelineRunId|pipelineUrl` external link + `artifactRef` + timeline `startedAt→completedAt`.
- **Sign-off card** is the detail contract: all decision context lives on card (subject, runs summary, approver/role, due, evidence). No separate `/testing/sign-offs/:id`.

Pattern aligns with [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) 3-column intent but implemented as card streams until detail routes ship.

## State Lifecycle

```
Test Plan:   draft → active → archived
             (no transitions enforced client — Phase 2 will gate active→archived via owner)
Test Case:   active ↔ flaky → archived
             (flaky is derived when flakeRate>threshold; Phase 2 switches status via service)
             Execution count tracks history; flakeRate = failures / executions rolling
Per-case:    pending → running → passed/failed/skipped
             (inside TestRun.caseResults[])
Test Run:    pending → running → passed | failed | partial | cancelled | timed_out
             (pending=queued, running=CI executing, passed=all passed, failed=all failed,
              partial=some passed, cancelled=abort, timed_out=exceeded estimatedDurationMin)
Sign-off:    pending → approved | rejected | expired (terminal)
             (expired = dueAt passed without decision — auto-set by scheduler; Phase 2 server job)
```

- Run trigger `pre_deployment|post_deployment` signals promotion gates; `scheduled` for regression nightlies; `manual` via `Trigger run`; `cicd` from external pipeline.
- Sign-off life linked to `dueAt` + `slaBreached` flag (client sets `breachedSignOffs` via `dueAt < now`, server stores `slaBreached` — Phase 2 nightly job marks `pending + dueAt<now → slaBreached true`, daily job `dueAt + grace < now → expired`).
- Approvals stamp `decidedAt` (now ISO on modal confirm) + `decision` (`approved|rejected`) + `decisionNote` (user text) — currently local only; Phase 2 persists `PATCH /testing/sign-offs/:publicId/approve` with audit.
- Flake transitions: once `flakeRate>5%` case surfaces in Runs flaky rail; `>10%` surfaces in Cases `Flaky` chip and qualifies `filtered` as flaky — both thresholds intentionally different to drive triage urgency.

Ref: type unions `src/types/testing.ts:3-36` + status meta dot colors `src/lib/constants.ts:336-366`.

## Permissions (action-level)

RBAC via `server/auth/permissions.ts` (permission keys `testing.read|update|approve` scoped by team/app). Resource scoping via `Document` `tenantId` isolation (no per-testing `team_app` inheritance yet — `filterReadable` not applied in platformRouter, only `requirePermission('testing.read')`); violations bubble as `403 {error:'scope_violation'}` if added via `req.scoped`.

| Permission | Who | All scopes | Actions |
|------------|-----|------------|---------|
| `testing.read` | STA, IFM, APS (`testing-read` all) | all tenanted | View all 4 tabs, search/filter, expand run cases, view sign-off evidence |
| `testing.update` | APS Officer+ `team_app` (`testing-update`) | own teams vs all | `New plan/case` (Plans/Cases toolbar `Can update`), `Trigger run`, edit plan/cases (Phase 2) |
| `testing.approve` | APS Team Lead+ `team_app` OR Change Manager `scope:all` (`testing-approve`) | own team vs all | `Approve / Reject` sign-off (SignOffQueue `useCan('testing','approve')` + `approverId === currentUser`) |
| `testing.*` superadmin | bypass | — | All actions |

`Can module="testing" action="update"` gates create buttons; `useCan('testing','approve')` gates sign-off decision + read-only banner fallback (`SignOffQueue.tsx:264-268`). Without approval capability `SignOffCard` still renders `currentUserId='__no_user__'` so `isApproverMatch` fails and action bar is hidden. Plan/case write stubs currently not enforced beyond button hide — Phase 2 will guard `POST /testing/plans|cases` + `POST /testing/runs` + `PATCH /testing/sign-offs/:id/{approve,reject}` with `requirePermission('testing.update'|'testing.approve')` + audit.

Ref: [`_shared/rbac.md`](./_shared/rbac.md) — engine first-match ALLOW, superadmin bypass, `team_app` `OWNER/CONTRIBUTOR` checks.

## Empty / Loading / Error

- **Plans empty match:** `flex flex-col items-center justify-center py-16 text-center gap-2` `No test plans match. text-sm muted` + `Reset text-xs ois-primary underline` (`TestPlans.tsx:269-277`). Zero plans before seed: same copy.
- **Cases empty zero:** `colSpan 9 py-10 text-center muted No test cases yet.` (`TestCases.tsx:339`); no-match variant `No test cases match. Reset` button `text-primary hover:underline`.
- **Runs empty:** `py-16 rounded-xl border border-ois-border bg-ois-surface text-center No test runs match your filters. text-sm muted` + `Reset filters text-xs ois-primary underline` (`TestRuns.tsx:463-474`). Active banner hidden when `activeRuns.length 0`.
- **Sign-offs empty (integrated):** `py-20 gap-3 muted ClipboardCheck 40 opacity-40 All sign-offs current. Nothing pending. text-sm font-medium` (`SignOffQueue.tsx:257-261`). Non-empty list still shows read-only italic if `!canApprove`.
- **Right rail empty states:** Flaky `No flaky tests detected. text-xs muted mt-2` (`TestRuns.tsx:550-552`); Failed Cases `No failures in the last 7 days. text-xs muted` (`TestRuns.tsx:592-594`); Test Health always shows values even when `0%` / `0m` / `0`.
- **Loading:** `useResource` returns `data ?? []` fallback until fetch — no skeleton yet (header dims via empty array counts 0% pass). Detail route loads same. Phase 2: add `Skeleton` shimmer `8 rows` for tables, card skeleton for `TestRunCard`/`SignOffCard`.
- **Error:** silent fallback to `[]` — no banner. `refresh` handler from `useResource` could surface `bg-ois-danger-pale text-ois-danger Retry` like Incidents queue. 404 for plan/case/run fetched by id will be `Document not found` → `NotFound` page (when detail route ships).
- **Blocked approve:** `View-only` italics + buttons hidden, not toast; Phase 2 adds `Toast` + `ScopeViolationError` mapping 403.

## Phase 2 Deferred

- **Write endpoints** `POST /testing/plans`, `POST /testing/cases`, `POST /testing/runs` (trigger with `planId, environment, triggeredBy manual|cicd|scheduled|pre_deployment`, auto-creates `caseResults pending...`), `PATCH /testing/sign-offs/:publicId/{approve,reject}` (`{decisionNote, evidenceReviewed, scheduleFollowUp}`) + `POST /testing/sign-offs` (create linked to `subjectType release|change|incident_pir`). Wire `New plan/case/Trigger run` modals to repo + `audit` + `ScopeViolationError 403` + Socket.IO `tenant:{tenantId}` for queue live updates.
- **Plan/Case detail routes** `/testing/plans/:publicId`, `/testing/cases/:publicId`, `/testing/runs/:publicId` (3-col, 6-8 tabs Overview/Cases|Steps/Runs|History/Linked Changes|Releases|CIs/Benefits-on-sign-off) — refs `_shared/entity-detail-page.md`.
- **Versioning & history** — test case `steps[]` versioned diff, per-case result timeline `sparkline`, audit log via `AuditTimeline`.
- **Flake engine** — nightly job computing `flakeRate = failureCount / executionCount` rolling 30d with `retryCount` awareness, auto-flip `status flaky` when `flakeRate>5%` sustained → emit `test-case:flaky` event, surface in banner.
- **SLA scheduler** — every minute scan `sign-off dueAt` → set `slaBreached true` when `<24h`, auto-expire `dueAt + grace < now → status expired` + `slaBreached` audit.
- **CI runner orchestrator** — external `cicd` push `POST /testing/runs/:id/progress` (`progress%, caseResults[], durationSec, status`) + external webhook `pipelineRunId/Url` → live `ActiveTestRunBanner` + `LiveTestRunDetail` auto-expand.
- **Sign-off rejection hard-require** reason `min 10` (parity with Incident stand-down) + server Zod `decisionNote min 1 when rejected` (fix `docs/pages/testing.md:216` gap).
- **Promotion gates** — Releases `ready→deploying` blocked unless linked `sign-off type release_validation approved`; Changes `scheduled→implementing` blocked unless `sign-off change_validation approved`. Surface gate error `text-ois-danger`.
- **Pagination + URL persist** — server `?page&pageSize` via `parsePagination` replacing `listByKind` full list + `qBool(active)` → indexed `where status in (...)`; client `useSearchParams` sync `?q=&type=&status=&chip=&sla=&plan=&env=&trigger=` for deep links. Virtualized DataTable with `limit 50`.
- **Export** — `GET /testing/plans|runs|sign-offs/export` CSV + clipboard `Copy publicId` actions.
- **Bulk ops** — Plan `Archive/Duplicate` in ⋯ menu, Case `Run individually / Bulk assign to plan`.
- **Realtime** — `tenant:{tenantId}:test-run:{id}` socket for live status + `tenant:{tenantId}:sign-off:{id}` for queue auto-refresh (eliminate 1s `elapsedTick` polling).

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/testing/*` + `src/components/testing/*` + `docs/pages/testing.md`):

1. **Accent bar** `w-1 shrink-0 transition-colors duration-500` `breached #B42318 > passRate<80 #DC6803 > passRate≥95 #12B76A > default #1F4FD4` (`TestingLayout.tsx:36-41`) + stats separators `w-1 h-1 rounded-full bg-ois-border-strong`.
2. **Module Layout shell** `-m-6 flex flex-col bg-ois-bg h-[calc(100vh-3.5rem)]` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + tabs `NavLink flex gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` icons `ClipboardList|FileText|PlayCircle|ClipboardCheck 14` (`TestingLayout.tsx:42-97`).
3. **Filter input chrome** `Search 14 left-3 + pl-8 rounded-lg border-ois-border focus:ring-ois-primary/30` and chips `rounded-full border px-3 py-1 text-xs font-medium` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface muted border-ois-border hover:border-ois-primary/50` (`TestPlans.tsx:162-169`, `TestCases.tsx:171-177`, `TestRuns.tsx:311-322`).
4. **Quick chips palette** in Runs `Failed #FEF3F2/#B42318/#F04438 Flame` / `Flaky #FFFAEB/#B54708/#F79009 AlertTriangle` / `Live #F0F9FF/#0BA5EC/#0BA5EC Radio` / `Production #F4F3FF/#6941C6 Building2` (`TestRuns.tsx:418-459`) and queue quick chips `My pending/SLA at risk/Release validations` `bg-[#1F4FD4]||bg-[#DC6803]` (`SignOffQueue.tsx:223-254`).
5. **TestPlanRow type pill** `text-[10px] font-bold uppercase rounded-full px-2 py-0.5` with `typeChipColors` map `release #067647 #ECFDF3` etc (`TestPlanRow.tsx:15-22`) + `TestPassRateBar` + `View runs →` link + `MoreVertical 14` 5-item absolute menu `min-w-[160px]`.
6. **TestCase TYPE_COLOR** pills `color/bg` (`functional #1F4FD4 #EEF2FF ... security #B42318 #FEF3F2 manual #DC6803 #FFFAEB` — `TestCases.tsx:14-21`) + `testCasePriorityMeta` pills `p0 #B42318 #FEF3F2 ... p3 #475467 #F1F3F7` + `RESULT_ICONS` per `testStepResultMeta` + flake color thresholds `<5 #12B76A <15 #F79009 else #F04438`.
7. **TestRunCard border semantic** `running #0BA5EC failed #F04438 passed #12B76A else #E4E7EC` `rounded-ois-card shadow-ois-card border overflow-hidden` (`TestRunCard.tsx:36-38`) + `TestRunStatusPill` with `testRunStatusMeta dot/bg` + counts `CheckCircle2 #067647 / XCircle #F04438 / MinusCircle #98A2B3 / Clock #475467` + `TestPassRateBar` + `FailureDetailCard` 2 top + `Expand/Collapse Chevron` + `View live ArrowRight 11` outline button + expanded `LiveTestRunDetail`.
8. **SignOffCard border + badge** `pending #F79009 #FFFAEB #DC6803 / approved #12B76A #ECFDF3 #067647 / rejected #F04438 #FEF3F2 #B42318 / expired #98A2B3 #F1F3F7 #475467` `rounded-ois-card shadow-ois-card border` (`SignOffCard.tsx:18-23`) + `signOffStatusMeta/signOffTypeMeta` mapping, `TypeIcon 14 muted`, `font-mono subjectId`, `grid grid-cols-2` Approver/Due with `AlertTriangle 11` isDueSoon, `EvidenceList` 3 static items, action bar `Approve CheckCircle2 / Reject XCircle sm` only for `pending && approverMatch && canApprove`.
9. **SignOffApproveModal** `fixed inset-0 z-50 flex center bg-black/40` `rounded-ois-card shadow-xl max-w-lg mx-4 p-6` with `reviewed` checkbox gate `disabled={!reviewed}` + optional note `rows 3 bg-ois-surface-muted` + `scheduleCheck` optional (`SignOffApproveModal.tsx:27-95`).
10. **Right rail sticky** `w-72 shrink-0 sticky top-4 self-start space-y-4` 3 cards `Test Health 4 rows color threshold ≥90 #067647 ≥75 #B54708 else #B42318 | Flaky Tests N + Review→ | Failed Cases 7d top5 + View all→` (`TestRuns.tsx:490-619`) + `TextHealth/TestHealth` label `text-[10px] font-bold uppercase tracking-widest subtle`.
11. **Ois tokens strict** — `ois-bg / ois-surface / ois-surface-muted / ois-border / ois-border-strong / ois-text / ois-text-muted / ois-text-subtle / ois-primary / ois-primary-hover` (`src/index.css:7-33`) + status palettes — no raw `#98A2B3` for semantic (pakai `ois-text-subtle`), no `terra wash`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) · `server/routes/platform.ts` · `src/services/platformServices.ts`

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| List plans | `GET /api/v1/testing/plans` | `testing.read` | `listByKind<TestPlan>(tenantId,'test-plan')` (`platform.ts:250-252`); service `testingService.plans()` → `apiFetch('/testing/plans')` |
| List cases (all or per-plan) | `GET /api/v1/testing/cases` or `?planId=` | `testing.read` | `listByKind<TestCase>(tenantId,'test-case')` filtered `containedInPlans.includes(planId)` if `qString(planId)` (`platform.ts:253-257`); `testingService.cases(planId?)` |
| List runs (all) | `GET /api/v1/testing/runs` | `testing.read` | `listByKind<TestRun>(tenantId,'test-run')` (`platform.ts:258-261`); `testingService.runs()` |
| List active runs (banner poll) | `GET /api/v1/testing/runs?active=true` | `testing.read` | `qBool(active) ? all.filter(r.status running||pending) : all` (`platform.ts:260`); `testingService.activeRuns()` |
| List sign-offs | `GET /api/v1/testing/sign-offs` | `testing.read` | `listByKind<SignOff>(tenantId,'sign-off')` (`platform.ts:262-264`); `testingService.signOffs()` |
| Create plan (Phase 2) | `POST /api/v1/testing/plans` | `testing.update` | passthrough `{name, type, componentName, affectedCIIds, testCaseIds[], requiredEnvironment[], prerequisites[], ownerId}` — not yet implemented |
| Trigger run (Phase 2) | `POST /api/v1/testing/runs` | `testing.update` | `{testPlanId, environment, triggeredBy manual|cicd|scheduled|pre_deployment, linkedDeploymentId?}` → `status pending` |
| Create/approve sign-off (Phase 2) | `POST /api/v1/testing/sign-offs` + `PATCH .../:publicId/{approve,reject}` | `testing.approve` | `{type, subjectType, subjectId, approverId, dueAt}` → `pending`; approve `{decisionNote?, evidenceReviewed=true required}` |
| Run progress (Phase 2) | `PATCH /api/v1/testing/runs/:publicId/progress` | `testing.update` | CI webhook `{status, durationSec, caseResults[], progress%}` |

Scoped via `req.tenantId` (platformRouter no `req.scoped` — uses `listByKind` direct over `Document kind=test-*`). Future `req.scoped.testing.*` when write repo ships (mirrors `server/scope/scopedDb.ts` incidents pattern). Audit on writes (Phase 2) via `audit(req, { action, resourceKind:'TestPlan|SignOff', resourceId, before/after, scopeMode })`. Env `PORT/HOST` default `3001/0.0.0.0`, proxy `VITE_API_BASE_URL=/api/v1` → `VITE_API_PROXY_TARGET`.

## Open Items

- [ ] Formalkan mutation schemas `createTestPlanSchema`, `createSignOffSchema`, `approveSignOffSchema {decisionNote optional, evidenceReviewed:true required, scheduleCheck optional}` + `triggerRunSchema` — wire modals to `POST/PATCH` (replace `localStatuses`/`extra*` locals).
- [ ] Ganti `CURRENT_USER_ID = 'u-001'` hardcode (`SignOffQueue.tsx:13`, `TestRunCard` triggeredBy placeholder) dengan `useCurrentUser()` / `getActor(req)` session.
- [ ] Ganti client-side `active` filter (`platform.ts:260` `listByKind` + filter) dengan DB `where tenantId + kind + status in ('running','pending')` index `@@index([tenantId, kind])` + server `parsePagination`.
- [ ] Server validation `decisionNote min 1 when rejected` (fix `docs/pages/testing.md:216` gap) + SLA scheduler `dueAt → slaBreached/expired` job (`server/jobs/` ops).
- [ ] Detail routes `/testing/plans/:id` / `/testing/runs/:id` (3-col Overview/Cases/Timeline/Linked Items) + `field:value` search parser + URL `?q=&chip=&sla=` persistence.
- [ ] Verify `passRate30d` is `0..1` not `%` — display multiplies `*100` but chip thresholds compare `>=0.95` vs display semantics; document scale normalization.
- [ ] Add `testing.read` pagination parity with `itsmRouter` (`parsePagination` → `limit 50`) + empty skeletons for `>1000` rows.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/testing.md` + `src/routes/index.tsx:175-180` (`TestingLayout/TestPlans/TestCases/TestRuns/SignOffQueue`) + `src/components/testing/*` (`TestPlanRow/TestRunCard/SignOffCard/SignOffApproveModal` etc) + `server/routes/platform.ts:249-264` (`/testing` via `listByKind`) + `src/types/testing.ts` + `src/lib/constants.ts` testing meta ke template features (Module Layout 4 tabs + Plans table + Cases 9-col DataTable + Runs two-col cards + Active banner + Right rail Test Health/Flaky/Failed + SignOffQueue cards + Approve/Reject modals + RBAC `testing.read|update|approve` + ois-* tokens) | — |
