# Changes — RFC / Change Enablement

Status: **Draft**
Route: `/changes` (calendar), `/changes/new` (wizard), `/changes/cab` (CAB workspace), `/changes/:changeId` (detail), `/changes/calendar` (alias)
Sidebar: Change & Delivery · Changes
Source: `src/routes/changes/ChangeCalendar.tsx`, `NewChange.tsx`, `ChangeDetail.tsx`, `CABWorkspace.tsx` · `server/routes/itsm.ts` (`itsmRouter` `/changes`) · `src/types/change.ts`

---

## Intent

Mengelola RFC end-to-end: **planning → technical assessment → CAB review → scheduling → implementation → PIR**. Tujuan: meminimalkan risiko sambil tetap enable velocity. Change = controlled vehicle untuk deployment yang butuh kontrol khusus (beda dari Standard pre-approved).

ITIL 4: Change Enablement balance risk vs value. Standard (pre-approved, low-risk, templated) vs Normal (full CAB) vs Emergency (expedited dari P1 incident).

## Current State (snapshot `src/routes/index.tsx:157-161`)

- `src/routes/index.tsx:157` → `<ChangeCalendar />` at `/changes` (alias `/changes/calendar`)
- `src/routes/index.tsx:158` → `<NewChange />` at `/changes/new` (wizard 4-step)
- `src/routes/index.tsx:160` → `<CABWorkspace />` at `/changes/cab`
- `src/routes/index.tsx:161` → `<ChangeDetail />` at `/changes/:changeId` (8 tabs)
- Components: `ChangeCalendar/ChangeCalendar`, `ChangeBoard/ChangeBoard`, `ChangeRow`, `ChangeStatusPill`, `ChangeTypeChip`, `RiskBadge`, `ApprovalMatrix`, `PIRPanel`, `TechAssessmentPanel/Modal`, `RescheduleModal` (`src/components/changes/`).
- API: `itsmRouter` in `server/routes/itsm.ts` — `GET /changes`, `GET /changes/:publicId`, `POST /changes` (create), `PATCH .../cancel` (reason), `PATCH .../reschedule` (plannedStart/End+reason), `PATCH .../tech-assessment` (assessment block). All `requirePermission('change.read'|'change.write')` + `req.scoped.changes.*` + `audit`.
- Types: `ChangeType standard|normal|emergency`, `ChangeStatus draft→closed_*`, `RiskLevel low|medium|high|critical`, `Impact minimal…extensive`, `TechnicalAssessment` + `ChangeApproval` + `ChangeConflict` + `PIR` (`src/types/change.ts:3-185`).
- Risk formula: `riskScore = min(100, RISK_BASE[risk] + (factors.length-2)*5)` where `RISK_BASE low:15 medium:45 high:75 critical:92` (`NewChange.tsx:53-55`). Freeze detection: May 9-11 (`ConflictBanner`).

**Working:**
- Calendar view: month grid `CalendarView` with color by status; Board kanban swimlanes by status; List table (ID/Title/Type/Status/Risk/Owner/Window/⋯) with Search + Status/Risk `FilterDropdown`.
- Right sidebar: This Week (grouped by day via `groupByDay`), Awaiting Your Approval (pending `approvals.approverId===u-001`), Active Conflicts (unresolved `conflicts.filter(!resolvedAt)`).
- NewChange wizard `Stepper` 4 steps (Basics → Plan → Review → Submit → success), `TypeCard` radio, `TagInput` for CIs/problems/incidents, schedule `datetime-local` + `ConflictBanner` freeze, risk pills + score bar `width ${score}%` colored `>65 red >30 amber else emerald`, impact pills, plans 100-char gate, routing auto-detect, comms channels, application scope picker (`useScopedAppId` + `ScopeMismatchModal`), `localStorage new-change-draft` restore + `ScopeMismatch` guard.
- Detail `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` pinned header (nav row + risk stripe `RISK_COLOR[risk]` + `publicId mono` + `TypeChip` + `RiskBadge` + tags + meta) + 3-col body (left At a glance/Risk Factors/Tech Assessment/Approvals dots, center 8 tabs Overview/Plans/Assessment/Approvals/Conflicts/Linked/PIR/History, right Quick Actions + Watchers). 8-tab bar `border-b-2 border-ois-primary` active.
- Tech Assessment gate: `techAssessment.status approved` required before CAB; `AlertTriangle amber` warning in Approvals tab.
- Cancel/Reschedule modals optimistic update with revert on failure.

**Stub / Partial:**
- CABWorkspace voting table still client-state-ish (no formal vote endpoint yet — deferred).
- Conflict detection only `time_overlap` (freeze hardcoded May 9-11) + `freeze_window` — `ci_overlap/service_overlap/dependency` partial.
- Assessment `risks[]` passthrough `z.array(z.unknown())` — not validated strongly.
- `PIR` only for `implemented|closed_*`; creation flow not wired from detail.

**Missing:**
- Saved views, multi-sort URL, full-text search `field:value`.
- Notification to approvers (inbox poll only).

## Primary View — Change Calendar (`/changes`)

Layout: **flex gap-6** — main `flex-1` (header + 3 views) + right `w-72` sidebar.

### Header

```
Change Calendar
{activeChanges.length} changes · {in_review} awaiting approval · {implementing} implementing this week · {totalConflicts? "X conflicts detected":"no conflicts"}
[Calendar|Board|List toggle] [New change primary]
```

Toggle `rounded-lg border border-ois-border` — active `bg-ois-primary text-white`, else `bg-white text-ois-text-muted`. `New change` gated `Can change.create` → `navigate('/changes/new')`.

### Views

**Calendar:** `<Card><CalendarView changes={activeChanges} /></Card>` — month/day grid, color by `status`, placed by `plannedStart`.

**Board:** `<ChangeBoard changes={visibleChanges} />` — kanban lanes `draft→submitted→in_review→approved→scheduled→implementing→implemented` (closed excluded).

**List:** Search `Search 13px` + input `h-9 rounded-lg border-ois-border-strong` + two `FilterDropdown` (status 7 options, risk 4) → table:

| Column | Source | Sort | Notes |
|--------|--------|------|-------|
| ID | `publicId` | — | `font-mono text-[11px] font-bold text-ois-primary` |
| Title | `title` | — | truncate |
| Type | `type` | — | `ChangeTypeChip` |
| Status | `status` | — | `ChangeStatusPill` |
| Risk | `risk` | — | `RiskBadge` with score |
| Owner | `ownerName` | — | — |
| Window | `implementationWindow` | — | e.g. `May 12, 22:00–02:00 UTC` |
| ⋯ | actions | — | view |

Empty: `No changes match the current filters.` italic center. Filter excludes `closed_*|rejected|cancelled`.

### Right sidebar

- **This Week** (`w-72 Card`): `Clock 12px` header + grouped by `formatDate(plannedStart,'EEE, MMM d')` → per change row: risk dot `w-1.5 h-1.5` (red/amber/emerald), `publicId` link, title `text-[11px]`, type+time `text-[10px]`, conflict `AlertTriangle 9px text-ois-warning` + freeze `Lock 9px` warnings.
- **Awaiting Your Approval** (if any `in_review` + pending approver `u-001`): header `CheckCircle2 amber` + per card: `publicId` + `RiskBadge sm` + title `text-[11px]` + due `formatDate` + `Review ChevronRight` button `h-7 outline` → detail.
- **Active Conflicts** (if any unresolved): header `AlertTriangle danger` + per conflict: `publicId` link + description `text-[11px]` + badge `warning|danger severity`.

## NewChange Wizard (`/changes/new`)

Max `w-3xl mx-auto` — header `← Calendar + Save as draft (draftSaved "Draft saved" emerald)`, title `New Change Request`, `Stepper current 0..3` (`w-8 h-8 rounded-full border-2`, `bg-ois-primary` done, `bg-white border-ois-primary` active).

**Step 1 Basics:** Title/Description/Justification (`*`), `TypeCard` 3 radio (Standard pre-approved / Normal full CAB / Emergency expedited — `AlertTriangle` for emergency red banner), TagInput for affected CIs (`CI-APP-PAY-001` placeholder), 3-col TagInput for linked problems/incidents/release.

**Step 2 Plan:** Schedule `datetime-local` two-col + `ConflictBanner` freeze May 9-11, Risk Level pills (hide for `standard`), score bar `h-2 rounded-full bg-ois-border` fill colored, Risk Factors TagInput (min 2), Impact 5 pills, ImplementationPlan (`rows 8`, min 100 chars counter), Rollback (`rows 5`), TestPlan (`rows 3`).

**Step 3 Review:** Cards Basics/Plan summary (`grid-cols-2 dl`), `windowStr` long weekday, conflict vs `✓ No conflicts`, Routing auto-detect (`Service Owner, Change Manager, Release Manager if linkedRelease`), CAB callout `Thu May 9 10:00 UTC`, Application scope picker (`requireApplicationId` → `select writableApps` else display), Comms checkbox + channels (`Status page / Email all-staff / Slack #incidents`).

**Step 4 Submit:** confirmation card + blue `bg-blue-50 border-blue-200` info + success view `Check 32 emerald` + `publicId mono text-lg` + `Opening change detail…` + buttons `Submit another` / `View change →` (disabled until `createdPublicId`).

**Guards:** `canAdvance` — step0 `title.trim()>0`, step1 `implementationPlan≥100 && rollbackPlan>0`; submit checks `scopedAppId` if `requireApplicationId` else `ScopeMismatchModal` if `scope.appId !== scopedAppId`.

Draft: `localStorage.setItem('new-change-draft', JSON.stringify(form))` with restore on mount + timer cleanup.

## CAB Workspace (`/changes/cab`)

Dedicated workspace for weekly session voting. Layout 3-col: Agenda left / Voting center / Session info right (verify in `CABWorkspace.tsx`). Agenda filter `status='in_review'`, per item: shortened ID, risk badge, tech assessment dot, deferred badge. Voting card: ID/type/risk/window, Description + Full detail link, Risk Assessment score bar + factors, Conflict Analysis, Linked Context, Voting Table (Approver/Role/Decision/Action — current user highlighted, Cast vote `pending` row → `CastVoteModal` with `approve|approve_with_conditions|reject|abstain` + rationale if reject/conditions + lock checkbox). Toolbar: Start/End session, Schedule session, Export agenda CSV. Right: Session info (date, members), Freeze windows, Quarterly Stats (reviewed, approval rate, avg time, failed PIRs).

## Detail View (`/changes/:changeId`)

### Pinned header

- Nav row: `← Calendar` + `ChangeStatusPill` + `⋯ Copy ID/Copy link`.
- Entity header `flex items-start gap-0` + risk stripe `w-1 self-stretch RISK_COLOR[risk]` + `publicId mono 14px bold ois-primary`, `ChangeTypeChip`, `RiskBadge score`, `h1 text-xl font-bold`, tags `rounded-full bg-ois-surface-muted border-ois-border`, meta `Clock 11px + implementationWindow + Owner + Created formatRelative(requester)`.

### 3-column body

**Left `w-[280px] border-r`:** At a glance (`Status/Type/Risk/Impact/Owner/Created/Window` dl `divide-y`), Risk Factors `ul •`, Tech Assessment card (not started amber/week → `Clock amber`, approved emerald `CheckCircle2`, rework red `XIcon`), Approvals dots (`5x5 rounded-full approve emerald/ reject danger / pending border`, `approvedCount/length` + `CAB session` line).

**Center `flex-1 min-w-0`:** Tabs 8 (`overview|plans|assessment|approvals|conflicts|linked|pir|history`) — `py-4 px-1 border-b-2`. Overview: Description/Justification/Affected Scope (CI chips link `/cmdb/:id`)/Schedule (window, planned `formatDate MMM d, HH:mm UTC`, freeze warning, conflict `✓ No conflicts` vs `warning`); Plans: 3× `pre font-mono text-xs whitespace-pre-wrap max-h-96`; Assessment: gate `Can change.assess` else read-only italic, `TechAssessmentPanel` + `Edit assessment`; Approvals: amber warning if `!techAssessmentReady` + `Open CAB workspace` disabled until ready; Conflicts: empty `CheckCircle2 32 emerald` else cards `bg-amber-50|red-50` header + description + `conflictsWith` links; Linked: Problems/Incidents/Release/KB/Capacity recommendations (`implementedViaChangeId` match); PIR: empty `ClipboardCheck` if not implemented else `PIRPanel`; History: `AuditTimeline` entries created→cab→approvals→started→ended→PIR→closed.

**Right `w-[280px] border-l`:** Quick Actions 4 + Cancel divider — `Open tech assessment` (primary if `!techAssessmentReady && canAssess`), `Approve change` (primary if ready+canApprove), `Open CAB workspace (locked)` disabled until ready, `Reschedule` (canImplement), `Cancel change danger-pale` — disabled state `border-ois-border bg-ois-surface-muted text-ois-text-subtle cursor-not-allowed` + title tooltip. Watchers `5` avatar initials `ois-primary/10`.

### Modals

- **Cancel:** reason `textarea rows 3` required, `409 closed` guard, `Confirm cancel bg-ois-danger` → `setChangeStatus('cancelled')` + `refreshChange()`.
- **TechAssessmentModal:** optimistic local `setChange(technicalAssessment)` then `changesService.setTechnicalAssessment` try/catch + `refresh`.
- **RescheduleModal:** `newStart/newEnd + reason`, optimistic `plannedStart/End` update with revert on failure, `setRescheduleError`.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Create RFC | `New change` button | `change.create` (APS Change & Release team) | — |
| Save draft | `Save as draft` in wizard | — | — |
| Submit for review | Wizard Step 3→4 `Submit for review` | `change.create` | Basics+Plan valid |
| Edit tech assessment | `Start assessment` / `Edit assessment` | `change.assess` (APS Officer+ on `team_app`) | not closed |
| Approve / Cast vote | `Approve change` → CAB workspace | `change.approve` (varies by type) | `techAssessment approved` |
| Reschedule | `Reschedule` quick action | `change.implement` (owner/Change Manager) | not closed |
| Cancel | `Cancel change` with reason | `change.write` | not `closed_*` (409) |
| Copy ID/link | `⋯` menu | — | — |
| Link CI/problem/incident | TagInput in wizard + Link modals | `change.write` | — |

## Filters / Sort / Search

- **Calendar header counts:** `activeChanges`, `in_review`, `implementingThisWeek`, `totalConflicts` — derived `useMemo`.
- **List search:** `listSearch` on `title` + `publicId` (lowercase includes) — client-side.
- **List filters:** `listStatusFilter` (7 statuses) + `listRiskFilter` (4 levels) — client-side.
- **Sidebar filters (future):** freeze window toggle, conflict severity, CAB session — not yet.
- **Search placeholder:** `Search by title or ID…` (`Search 13px`).

## State Lifecycle

```
draft → submitted → in_review → approved → scheduled → implementing → implemented → closed_successful|closed_failed
                        ↓→ rejected → cancelled
draft|submitted|in_review|approved|scheduled|implementing → cancelled (409 if already closed)
```

Tech Assessment substate orthogonal:
```
not_started → in_progress → submitted → approved | rework_required (→ in_progress)
```

CAB vote: `pending → approve | approve_with_conditions | reject | abstain` (weight, rationale). `rejected` maps to change `rejected`.

Guard: `Reschedule` only if not closed; `Cancel` returns `closed` sentinel → 409; `tech-assessment` patch passthrough risk `unknown[]`.

## Permissions (action-level)

| Permission | Who | Actions |
|------------|-----|---------|
| `change.read` | IFM all; APS on `team_app` for own apps | List/get all views |
| `change.create` | APS Change & Release team (gate `NewChangeDenied` ShieldAlert) | New RFC |
| `change.write` | Owner / Change Manager | Cancel, links, reschedule (partial) |
| `change.assess` | APS Officer+ on owning team_app (`Can change.assess`) | Tech assessment `PATCH .../tech-assessment` |
| `change.approve` | Varies by `type` (`useCan` variant) — Service Owner / Change Manager / Release Manager | Approve, CAB vote |
| `change.implement` | Owner / Change Manager (`canImplement`) | Reschedule, execute window |

Scope: `filterReadable` + `changeResource` (app scoping via `useScopedAppId` / `useScope` + `ApplicationTeam`). Violation → 403 `scope_violation`.

## Empty / Loading / Error

- **Empty calendar:** `CardBody` empty state (calendar grid empty) — no text, just no cells.
- **Empty list:** `td colSpan 8 py-8 italic text-ois-text-subtle "No changes match the current filters."`
- **Empty This Week:** `px-4 py-4 italic text-xs "No changes this week"`; empty conflicts/awaiting similarly hidden.
- **Detail loading:** `flex items-center justify-center py-24 "Loading…"`.
- **Detail 404:** `Change not found` + `{changeId}` + `← Back to Calendar` button.
- **Wizard denied:** `ShieldAlert 36 danger` + `Cannot create changes` + contact team lead.
- **Reschedule/Cancel error:** `text-xs text-ois-danger` under form.

## Phase 2 Deferred

- Full `ci_overlap/service_overlap/dependency` conflict detection (now only `time_overlap` + hardcoded freeze).
- Saved filter views, multi-sort URL, full-text `field:value` parser.
- Notification to approvers realtime (beyond inbox poll).
- PIR template standardization cross-tenant.
- Board lane drag-n-drop (status transition via board).
- CAB vote server endpoint formal (now client snapshot).

## Design Preservation

Wajib pertahankan:

1. **Risk stripe** `w-1 self-stretch shrink-0 RISK_COLOR[risk]` left edge — consistent `low #12B76A medium #F79009 high #F04438 critical #B42318`.
2. **ChangeCalendar layout** `flex gap-6 h-full min-h-0` + right `w-72` + header `text-2xl font-bold` + stats muted row.
3. **TypeCard** radio `border-2 p-4 rounded-xl` with `w-4 h-4 rounded-full border-2` dot active `bg-ois-primary`.
4. **Risk score bar** `h-2 rounded-full bg-ois-border` fill width `${score}%` colored `>65 red >30 amber else emerald` + `Score: X/100`.
5. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `text-[11px] uppercase tracking-widest bg-ois-surface-muted`.
6. **Status tabs** `py-4 px-1 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary font-bold`.
7. **Approval dots** `w-5 h-5 rounded-full` approve `bg-emerald-500 CheckCircle2 11px` vs pending `bg-ois-border`.
8. **Stepper** `w-8 h-8 rounded-full border-2` done `bg-ois-primary border-ois-primary Check 14px` vs active `bg-white border-ois-primary`.
9. **Risk stripe + Tag pills** `rounded-full bg-ois-surface-muted border-ois-border px-2 py-0.5 text-[11px]`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Body |
|--------|----------|------------|------|
| List calendar | `GET /api/v1/changes?page&pageSize` | `change.read` | — |
| Get detail | `GET /api/v1/changes/:publicId` | `change.read` | — |
| Create | `POST /api/v1/changes` | `change.write` | `{title,description,justification,type,risk,impact,plannedStart,plannedEnd,implementationPlan,rollbackPlan,affectedCIIds,applicationId}` — validated `createChangeSchema` (`title 1..200`, `type standard|normal|emergency`) |
| Cancel | `PATCH /api/v1/changes/:publicId/cancel` | `change.write` | `{reason 1..2000}` — 409 if closed |
| Reschedule | `PATCH /api/v1/changes/:publicId/reschedule` | `change.write` | `{plannedStart,plannedEnd,reason}` via `rescheduleChangeSchema`, audit `plannedStart/End` |
| Tech assessment | `PATCH /api/v1/changes/:publicId/tech-assessment` | `change.write` | passthrough `status/objective/technicalScope/prerequisites/dependencies/risks` |

Scoped via `req.scoped.changes.*` + `audit` (create/cancel/reschedule/tech-assessment). Socket: `tenant:{tenantId}` for calendar auto-refresh (future).

## Open Items

- [ ] Wire `CABWorkspace` vote to server `POST /changes/:id/votes` (define `castVoteSchema`).
- [ ] Implement full conflict engine (`ci_overlap`, `service_overlap`, `dependency` via CMDB graph).
- [ ] `NewChange.tsx` hardcode `u-001` for awaiting-approval filter — must be real `user.id`.
- [ ] Verify `implementationWindow` generation (derived from plannedStart/End — not stored?).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/changes.md` + `src/routes/changes/*` + `server/routes/itsm.ts` + `src/types/change.ts` ke template features (Calendar/Wizard/CAB/Detail) | — |
