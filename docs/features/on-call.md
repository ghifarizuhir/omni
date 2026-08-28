# On-Call — Rotation, Schedule & Overrides

Status: **Draft**
Route: `/on-call` (overview), `/on-call/schedule` (calendar + rotation), `/on-call/overrides` (requests) — layout at `/on-call` with 3 tabs
Sidebar: Foundation · On-Call (Platform Features per `src/routes/index.tsx:220`)
Source: `src/routes/platform/OnCallLayout.tsx`, `OnCall.tsx`, `OnCallSchedule.tsx`, `OnCallOverrides.tsx` · `src/components/oncall/` (7 files) · `server/routes/platform.ts:228-234` · `src/types/platform.ts:122-182` · `src/services/platformServices.ts:95-98` · `src/lib/constants.ts:575-591` · `src/lib/breadcrumbs.ts:62,75`

---

## Intent

Operasional **who is on call right now?** — rotasi harian/mingguan per schedule, override (swap/vacation/sick) dengan approval, dan integrasi ke incident assignment + alert routing + notifikasi. User harus lihat primary/secondary dalam 3 detik di Overview, verifikasi 4 minggu ke depan di Schedule, dan ajukan/approve swap di Overrides tanpa konflik.

ITIL 4 §7.3 Workforce & Talent Management (operational on-call) — 3 shift types (`primary|secondary|shadow`), handover deterministik per `rotationIntervalDays`, override sebagai exception yang menimpa rotation.

---

## Current State (snapshot `src/routes/index.tsx:82-85`, `220-224`)

- `src/routes/index.tsx:82-85` imports `OnCallLayout`, `OnCall`, `OnCallSchedule`, `OnCallOverrides` from `src/routes/platform/`.
- `src/routes/index.tsx:220-224` → `<OnCallLayout />` at `/on-call` with children:
  - `index` → `<OnCall />`
  - `schedule` → `<OnCallSchedule />`
  - `overrides` → `<OnCallOverrides />`
- Layout: `src/routes/platform/OnCallLayout.tsx:14-88` — `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + accent `w-1 shrink-0 transition-colors duration-500` color `activeIncidents>0 #B42318 : pendingOverrides>0 #DC6803 : activeOverrides>0 #1F4FD4 : #12B76A` + title `On-Call text-xl font-bold ois-text` + stats row `text-xs ois-text-muted` with dots + tab bar 3 `NavLink` (`Users 14`, `Calendar 14`, `UserPlus 14`, active `border-ois-primary text-ois-primary` else muted hover) — `Outlet` owns scroll `flex-1 min-h-0 overflow-auto`.
- Components: `OnCallHeroSection`, `OnCallScheduleCard`, `UpcomingHandoversList`, `ShiftCalendarGrid`, `ShiftCell`, `OverrideCard`, `RequestOverrideModal` (`src/components/oncall/` — 7 files).
- API: `platformRouter` (`server/routes/platform.ts:26`, `228-234`) — 2 `GET` endpoints under `/on-call` via `listByKind` + `requirePermission('oncall.read')` (prefix guard `platformRouter.use('/on-call', requirePermission('oncall.read'))`). No mutation endpoints yet — overrides are optimistic client-side.
- Types: `OnCallShiftType primary|secondary|shadow`, `OnCallSchedule` (rotation, members, upcomingShifts, currentPrimary/Secondary, activeIncidentCount), `OnCallShift` (shiftType, startAt/endAt, isCurrentShift, isOverridden), `OnCallOverride` (original→replacement, startAt/endAt, requestedBy, approvedBy, status `pending|approved|rejected|cancelled`, `createdAt`) (`src/types/platform.ts:122-182`).
- Services: `onCallService.schedules()` → `apiFetch<OnCallSchedule[]>('/on-call/schedules')`, `onCallService.overrides()` → `apiFetch<OnCallOverride[]>('/on-call/overrides')` (`src/services/platformServices.ts:95-98`).
- Constants: `onCallShiftTypeMeta` (`src/lib/constants.ts:587-591` primary `#B42318` secondary `#DC6803` shadow `#475467`), `notificationTopicMeta on_call_shift_start|on_call_escalation` (`575-576` group `ON-CALL`).
- Style tokens: `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-success #12B76A`, `ois-success-pale #ECFDF3`, `ois-warning #F79009`, `ois-warning-pale #FFFAEB`, `ois-danger #F04438`, `ois-danger-pale #FEF3F2`, `ois-info #0BA5EC` (`src/index.css:8-33`).

**Working:**
- Layout accent derived live from `schedules.reduce activeIncidentCount` + `overrides.filter approved+inWindow active` + `pending` (`OnCallLayout.tsx:19-28`); header stats `{totalSchedules} schedules · {activeOverrides} active overrides · {activeIncidents} incidents engaged danger · {pendingOverrides} overrides pending warning` with dot `w-1 h-1 rounded-full bg-ois-border-strong` separators.
- Overview (`OnCall.tsx:6-21`): `OnCallHeroSection schedules` + `UpcomingHandoversList schedules+overrides` — hero grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`, handovers card `Card divide-y` sorted chronological.
- Schedule (`OnCallSchedule.tsx:12-120`): schedule selector segmented pills + calendar `Card p-5` with `ShiftCalendarGrid schedule+overrides` + `Rotation Members Card` (avatar initials `bg-ois-primary/10 text-ois-primary`, `On call now` pill green) + `RequestOverrideModal` gated `Can platform manage`. Local `selectedScheduleId` defaults first schedule; `overrides` local copy seeded from `overridesData` via `useEffect`.
- Overrides (`OnCallOverrides.tsx:10-90`): sorted `pending first` then `createdAt desc` (`sorted` memo), grid `grid-cols-1 lg:grid-cols-2 gap-4` per `OverrideCard`, empty `No overrides found.` + same `RequestOverrideModal` gated. Approve/reject handlers optimistic `setOverrides map status→approved|rejected` with hardcoded `approvedBy Sarah Chen` stub (`handleApprove 20-34`, `handleReject 36-39`).
- Hero card (`OnCallScheduleCard.tsx:32-118`): header `teamName 11px tracking-widest muted + name 16px bold + activeIncidentCount badge danger-pale` + primary section `bg-ois-success-pale/30` with green dot + avatar initials `bg-ois-primary text-white w-10 h-10 rounded-full` + secondary block optional + footer `Clock 12 muted getShiftRemaining endAt` + `View incidents → /incidents` if incidents>0.
- Handovers (`UpcomingHandoversList.tsx:34-136`): 7-day window `TODAY .. WINDOW_END (TODAY+7d)` — shift handovers `shifts[i].endAt` within window cross + approved overrides `startAt/endAt` both emit events; sorted `date asc`; row `px-5 py-3.5` icon `Calendar 14 w-8 h-8 rounded-lg bg-ois-surface-muted` `o-warning` if override else `o-primary` + `formatHandoverDate locale UTC` + `OVERRIDE warning-pale` chip + `scheduleName · from ArrowRight 11 to`.
- Calendar (`ShiftCalendarGrid.tsx:34-143`): 4-week Mondays-start (`calendarStart` Monday of this week midnight, `dow (getDay+6)%7`), `addDays`, `isoDateStr` for today check, per day `applicableOverride find ov.scheduleId==schedule.id && approved && ovStart<=dayStart && dayEnd<=ovEnd` else `upcomingShifts.find primary covering day`; `weeks[4][7]` rendered `grid [80px_repeat(7,1fr)]` headers `MON..SUN 10px tracking-widest muted`, per week label `MMM d – MMM d` `10px muted right`, per cell `ShiftCell` with `isToday isoStr===todayStr`, `isCurrentShift`, `isOverridden`; legend `Current shift success-pale| Today primary border-2 | Override warning-pale OVR`.
- Cell (`ShiftCell.tsx:21-75`): `min-h-[56px] flex flex-col items-center justify-center rounded-lg border` `isToday border-ois-primary bg-ois-primary/5 else border-transparent`; `isCurrentShift && !isToday bg-ois-success-pale/50 else bg-ois-surface-muted/40`; dayNum `10px muted today→primary`, label `11px font-medium truncated first+lastInitial` `current→success else subtle today→primary`, `OVR 8px bold warning-pale border #F79009/30 absolute top-0.5 right-0.5` if overridden; opacity 40 if no person.
- Override card (`OverrideCard.tsx:32-128`): `Card flex-col divide-y` header `Badge variant warning|success|neutral|danger per displayStatus + publicId mono` + scheduleName; body `flex-col gap-3` row `originalUserName ArrowRight overrideUserName primary` with `User 13`; dates `CalendarDays 13 + formatDate MMM d, yyyy HH:mm UTC – range`; reason `MessageSquare 13 + text-subtle`; requested `Clock 13 Requested by name · createdAt`; approved if `approvedByName CheckCircle2 13 success`; footer pending + `onApprove/onReject` → `flex justify-end gap-2 border-t bg-ois-surface-muted/50` buttons `Reject secondary danger-pale + XCircle 13` `Approve primary CheckCircle2 13`.
- Modal (`RequestOverrideModal.tsx:13-186`): `Modal isOpen title Request Override size md` form `flex-col gap-5 py-4` — Schedule select `h-9 border-ois-border rounded-lg bg-ois-surface` mapped `schedules`, Original Person `select members`, Covered By `filter exclude original`, From/To `datetime-local h-9`, Reason `textarea rows3 placeholder Conference…`; submit builds `OnCallOverride id ovr-${Date.now()} publicId OVR-2026-${rand90000} status pending requestedBy Sarah Chen` `startAt/endAt new Date(fromDate).toISOString()`, validates all required, `onSubmit → onClose + reset`; gated via parent `Can platform manage`.

**Stub / Partial:**
- All override writes are optimistic local only (`extraOverrides` / `local overrides` + hardcoded `u-001 Sarah Chen` as actor) — no `POST /on-call/overrides` nor `PATCH .../:id/approve` yet (baseline docs §12 notes "optimistic client-side; endpoint akan diformalkan di M7").
- Approve hardcodes `approvedById u-001 / approvedByName Sarah Chen` not current user (`OnCallOverrides.tsx:27-29`).
- `RequestOverrideModal` does not validate `from < to`, overlap conflict, or member availability — no error banner.
- `ShiftCalendarGrid` override detection uses `ovStart <= dayStart && dayEnd <= ovEnd` — fails if override starts mid-day within day bounds (strict containment vs `overlaps`); also ignores pending/cancelled correctly but past `approved && ended < today` still applies to historical weeks via `PAST` fallback confusion.
- `UpcomingHandoversList` only looks at `approved` overrides within 7d — pending not shown; override back-handover uses `override.originalUserName` swap but schedule's `teamName` empty for override events.
- `OnCallSchedule` + `OnCallOverrides` each independently call `useResource schedules/overrides` — duplicate fetch per tab (no shared cache / SWR dedup).
- `activeIncidentCount` displayed but not linked to filtered incident query (`View incidents → /incidents` without `?assignee=` or `?schedule=` filter).

**Missing:**
- Mutation endpoints `POST /on-call/overrides`, `PATCH /on-call/overrides/:publicId` (approve/reject/cancel), `POST/PATCH /on-call/schedules` (create/edit rotation, members reorder, interval/time) — spec in `docs/pages/on-call.md §14 Open Gaps` "Schedule editor (drag-drop) belum ada. Override approval mutation endpoint belum diformalkan. Auto-detect overlap belum."
- Schedule editor UI: drag-drop swap, rotation interval/dayOfWeek/time picker, member add/remove, quiet hours `QuietHoursConfig` + `NotificationPreference` per user (types exist `src/types/platform.ts:101-116` but no UI).
- Overlap conflict auto-detect + multi-schedule per user (weekday vs weekend) native support.
- Real handover scheduler job `on_call_shift_start` + escalation timer (docs §13 — emit via `server/jobs/` not yet wired).
- Pagination/filtering for overrides when >50 (now client sort only).
- Search / filter by schedule, person, status in Overrides list.

---

## Primary View — Per Tab

### OnCallLayout (shared chrome — all `/on-call/*`)

`-m-6 flex flex-col bg-ois-bg` `calc(100vh - 3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` contains `w-1` accent `transition-colors duration-500` + `px-6 py-4` title `On-Call 20px bold ois-text` + `flex items-center gap-3 mt-1 text-xs ois-text-muted flex-wrap` stats `{totalSchedules} schedules · {activeOverrides} active overrides` + conditional `activeIncidents danger` + `pendingOverrides warning` dots `w-1 h-1 rounded-full bg-ois-border-strong` + tab `nav flex px-4 overflow-x-auto scrollbar-hide` 3 `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` + outlet `flex-1 min-h-0 overflow-auto` (`OnCallLayout.tsx:36-85`).

`TABS = [{Overview /on-call end Users}, {Schedule /on-call/schedule Calendar}, {Overrides /on-call/overrides UserPlus}]` (`TABS 7-11`). Accent priority: `activeIncidents #B42318 > pendingOverrides #DC6803 > activeOverrides #1F4FD4 > default #12B76A` — red overrides everything for incident awareness.

### OnCall (Overview — `/on-call`)

`OnCall.tsx:12-20` `flex flex-col gap-8 py-6 px-6 max-w-screen-xl mx-auto` → 2 sections stacked:

**OnCallHeroSection** (`OnCallHeroSection.tsx:9-36`): header row `flex baseline justify-between mb-4` subtitle `Who's On Call Right Now 11px semibold tracking-widest ois-text-muted` + datetime `dateStr weekday long + timeStr HH:mm TZ short 12px muted`; grid `md:2 xl:3 gap-4` per `OnCallScheduleCard`.

**UpcomingHandoversList** (`UpcomingHandoversList.tsx:34-136`): title `Upcoming Handovers (Next 7 Days) 11px tracking-widest muted mb-4` + `Card` list `divide-y`. Row `px-5 py-3.5 flex gap-4`: icon `w-8 h-8 rounded-lg bg-ois-surface-muted` + body `date 14px semibold ois-text formatHandoverDate UTC` + chip `OVERRIDE warning-pale #F79009/20 10px bold` if override + second line `scheduleName medium subtle · from ArrowRight 11 to font-medium text`. Empty `px-5 py-10 text-center 14px muted No handovers in the next 7 days.` — includes both shift transitions and override boundaries sorted asc.

### OnCallSchedule (`/on-call/schedule`)

`OnCallSchedule.tsx:31-119` `flex flex-col gap-6 py-6 px-6 max-w-screen-xl mx-auto`:

- Toolbar right-aligned `flex justify-end` → `Can platform manage` → `Request Override primary md PlusCircle 15 mr-1.5`.
- Schedule selector `flex gap-3 flex-wrap` label `Schedule: 12px semibold muted uppercase tracking-wide` + pills per schedule `px-3 py-1.5 rounded-lg text-sm font-medium border` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface border-ois-border hover:bg-ois-surface-muted` (`46-61`).
- Calendar card `Card p-5` header `flex justify-between mb-4` left `schedule.name 14px bold + teamName 12px muted` right `{interval}-day rotation 12px muted` (`66-76`) → `ShiftCalendarGrid schedule overrides`.
- Rotation members `Card`: header `px-5 py-4 border-b flex gap-2 Users 14 muted + Rotation Members 14px bold` → list `divide-y` per `members map idx` row `px-5 py-3 flex justify-between` left avatar `w-8 h-8 rounded-full bg-ois-primary/10 text-ois-primary text-xs font-bold initials` + `member.userName 14px medium + Shift order {idx+1} 12px muted` right badge if `member.userId === currentPrimaryId` → `inline-flex gap-1 text-[11px] font-semibold text-ois-success bg-ois-success-pale border-success/20 rounded-full px-2 py-0.5` with dot `w-1.5 h-1.5 bg-ois-success`.

### OnCallOverrides (`/on-call/overrides`)

`OnCallOverrides.tsx:53-89` same padding shell:

- Toolbar identical `Request Override` gated `Can platform manage` (`55-62`).
- Cards area conditional `sorted.length===0 → py-16 text-center 14px muted No overrides found.` else `grid 1 lg:2 gap-4` mapping `OverrideCard` with `onApprove/onReject`.
- Sort contract `48-51`: pending first else `createdAt desc`.

### ShiftCalendarGrid (`ShiftCalendarGrid.tsx:34-143`)

`min-w-[560px] overflow-x-auto` — header row `grid 80px repeat(7,1fr) gap-1 mb-1` week-spacer + `DAY_HEADERS MON..SUN 10px semibold tracking-widest muted py-1`; per week `grid 80px_repeat(7,1fr) gap-1 mb-1` label `text-[10px] muted font-medium text-right pr-2 getWeekLabel MMM d – MMM d UTC` + 7× `ShiftCell`. Legend `flex gap-4 mt-3 flex-wrap text-[11px] muted` swatches: `w-3 h-3 rounded bg-success-pale/50 border-success/30 + Current shift`, `w-3 h-3 rounded border-2 border-ois-primary + Today`, `OVR 8px bold warning-pale border #F79009/30 + Override`.

### RequestOverrideModal (`RequestOverrideModal.tsx:13-186`)

`Modal isOpen onClose title Request Override size md` — form `onSubmit handleSubmit` requires `scheduleId && originalUserId && coveredById && fromDate && toDate`; on schedule change resets persons. Field stack `flex-col gap-1.5 label 12px semibold muted uppercase tracking-wide + select/input h-9 px-3 text-sm border-ois-border rounded-lg bg-ois-surface focus:ring-2 ring-primary/30`. Fields order (5+1): Schedule → Original Person `Select person…` from `selectedSchedule.members` → Covered By `filter exclude original` → From+To `grid 2 gap-3 datetime-local` → Reason `textarea rows3 resize-none placeholder Conference attendance…` → footer `flex justify-end gap-2 pt-1 Cancel secondary + Request Override primary type=submit`.

### OverrideCard & Detail Fragments

Covered in Current State above — `OverrideCard.tsx:32-128` with `getOverrideStatus` (`pending→PENDING APPROVAL`, `rejected→REJECTED`, `cancelled→CANCELLED`, `approved+endAt<today→PAST else APPROVED`) + `statusBadgeVariant warning|success|danger|neutral`; `ShiftCell.tsx:21-75` day cell + `OnCallScheduleCard.tsx:32-118` hero card.

No dedicated `/on-call/:scheduleId` page — detail is inline via selector + calendar + members.

---

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View overview | Open `/on-call` | `oncall.read` (or `platform.read`) | — |
| View schedule calendar | Tab `/on-call/schedule` | `oncall.read` | — |
| Select schedule | Pill click `setSelectedScheduleId` | `oncall.read` | ≥1 schedule |
| View rotation members | Scroll to `Rotation Members` | `oncall.read` | schedule selected |
| View upcoming handovers | Scroll handovers list | `oncall.read` | — (7d window) |
| Search/filter calendar | Today highlight + week label (no search yet) | `oncall.read` | — |
| Request override | `Request Override` → `RequestOverrideModal` | `platform.manage` (`Can platform manage`) — `IFM Dept Head+` per `permissions.ts:540-545` | valid schedule + distinct persons + dates |
| Approve override | `OverrideCard Approve CheckCircle2` | `platform.manage` (current stub: any caller optimistic) | `status pending` |
| Reject override | `OverrideCard Reject XCircle secondary` | `platform.manage` | `status pending` |
| View incidents from on-call | `OnCallScheduleCard View incidents ChevronRight → /incidents` | `incident.read` | `activeIncidentCount>0` |
| Navigate cross-links | Schedule/team name (future) | `oncall.read` | — |

Delegate to [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) when shared available — on-call has no per-entity detail page yet; card + modal pattern is compact variant.

---

## Filters / Sort / Search

- **Overview:** no filters; schedules rendered in fetch order. Handovers sort `date asc` (`UpcomingHandoversList.tsx:93`); blocked to `approved` overrides only; shift handovers from `upcomingShifts[i].endAt` sequential.
- **Schedule:** selector single active (`selectedScheduleId`); calendar no search — time scope fixed `4 weeks from Monday of this week`. No sort exposed (grid order = weeks chronological). Members sort by `shiftOrder` (index order 1..N as stored).
- **Overrides:** client `useMemo` sorted `pending first` then `createdAt desc` (`OnCallOverrides.tsx:47-51`). No search field — filter by card scan only. No URL persist (`?schedule=` or `?status=` not yet) — like `capacity`/`availability` state is local (should migrate to `?status=pending&schedule=` like `incidents`).
- **Global:** no pagination (assume <50 overrides), no column sort toggle (vs `cmdb`/`incidents`). Should add server-side `?scheduleId=&status=&personId=&page&pageSize` when endpoints land.

---

## Detail View

No dedicated `/on-call/:scheduleId` entity page — detail is distributed:

- **Hero detail** per schedule (`OnCallScheduleCard`): `teamName 11px muted + name 16px bold`, active badge `danger-pale AlertCircle 11` if `activeIncidentCount>0`, primary avatar initials `10h 10w` + `PRIMARY dot success + name 14px semibold + date range MMM d – MMM d`, secondary avatar `7h info/20`, footer `Clock 12 remaining days/hours via getShiftRemaining` + `View incidents →`.
- **Calendar detail** (`ShiftCell`): dayNum UTC + truncated name + OVR flag + today ring + current fill. Hover/tap shows full name (via truncation only — tooltip not yet).
- **Override detail** (`OverrideCard`): header badge + `publicId mono 11px muted` + scheduleName; body `original → replacement` + UTC range + reason + `Requested by · date` + `Approved by · date` if present; footer approve/reject for pending.
- **Modal detail** (`RequestOverrideModal`): 5 required fields + optional reason; schedule-scoped member list; coveredBy excludes original live.

Ref: [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) (3-column), [`_shared/create-flow.md`](./_shared/create-flow.md) (modal), [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) (filter pattern) when shared land — on-call should adopt `Right drawer w-[450px]` like `availability/OutageDetailDrawer` for future override/thread detail.

---

## State Lifecycle

```
OnCallSchedule (rotation cycle — derived)
  upcomingShifts: each shift {startAt, endAt, isCurrentShift, isOverridden}
  isCurrentShift true for exactly one primary shift covering now; isOverridden true if approved override supersedes.

OnCallOverride
  pending ─┬─→ approved ─→ active (now ∈ [startAt,endAt]) ─→ past (endAt < today → display PAST gray)
           ├─→ rejected ─→ terminal (display REJECTED red)
           └─→ cancelled ─→ terminal (display CANCELLED red)
  (cancelled not yet wired in UI — status enum exists but button missing)
  Rejected/cancelled are terminal; approved past still shows APPROVED with gray PAST badge via getOverrideStatus.
```

Transitions (current optimistic):
- Create → `pending` (`RequestOverrideModal` → `newOverride status pending`).
- `pending → approved` via `handleApprove` → `approvedById u-001 approvedAt now ISO` (should be `currentUser.id` + `PATCH /on-call/overrides/:publicId/approve`).
- `pending → rejected` via `handleReject` → `status rejected`.
- Active detection is derived `new Date(startAt) <= now <= new Date(endAt) && status approved` for header counts (`OnCallLayout.tsx:23-27`) and display fallback `PAST`.

`ShiftType` orthogonal: `primary` (main on-call) vs `secondary` (backup) vs `shadow` (training) — only `primary` shown in calendar cells (`schedule.upcomingShifts.find shiftType primary`); card shows primary + optional secondary.

Related lifecycle: `QuietHoursConfig enabled timezone fromHour-toHour days[]` + `NotificationPreference topic on_call_shift_start|on_call_escalation channels in_app|email|sms|slack respectQuietHours overrideForUrgent` (`src/types/platform.ts:101-116`) — not yet surfaced in UI; should live in `/notifications/preferences` or `/profile`.

---

## Permissions (action-level)

| Action | Permission gate | Who | Notes |
|--------|-----------------|-----|-------|
| View schedules/overrides/handovers/calendar | `oncall.read` — `platformRouter.use('/on-call', requirePermission('oncall.read'))` (`server/routes/platform.ts:26`) | All authenticated (SRE, Viewer) via `oncall.read` — `prisma/seedRbac.ts:52 oncall.read Read on-call schedules and overrides` | Server `req.tenantId` + `listByKind('on-call-schedule'|'on-call-override')`, tenant-scoped; violation → 403 `scope_violation` via `server/scope/errors.ts` |
| `oncall.read` alt | `platform.read` — legacy `docs/pages/on-call.md §8 says oncall.read / platform.read` | Any `platform.read` | Legacy mapping — current guard is strictly `oncall.read` |
| Manage schedule, request override, approve/reject | `platform.manage` — `Can module="platform" action="manage"` in `OnCallSchedule.tsx:34` + `OnCallOverrides.tsx:56` | `IFM Dept Head+ manages on-call schedules and platform configuration.` (`src/lib/rbac/permissions.ts:540-545` `requiredDivisions IFM requiredLevel dept_head scope all`) | No `platform.write` split; same gate hides `Request Override` button + approve path (though stub handlers not yet gated per card — should check `canManage` before `onApprove`) |
| Route guards | `requireAuth` global `server/app.ts:126` `withScopedDb` → `req.tenantId`/`req.permissions` | — | `platformRouter` also lists `users|teams|notifications|inbox|kb|testing|status-page|ai|rbac|continuity|measurement` with their own `requirePermission` |

UI pattern: `Can module="platform" action="manage"` wrapper hides `Request Override`; read case always visible. Server `requirePermission('oncall.read')` is prefix-mounted so both `GET /on-call/schedules` and `/overrides` need it; future `POST/PATCH .../overrides` should require `platform.manage`.

---

## Empty / Loading / Error

- **Empty schedules:** `OnCallHeroSection` `schedules.map` empty → grid `0` cards, heading `Who's On Call Right Now` + date still, no empty text (gap vs `cmdb` `No CIs match`). `OnCallSchedule` selector empty → `selectedSchedule null` → calendar + members hidden (only `Request Override` button shows but `schedules` select empty → no members).
- **Empty handovers:** `UpcomingHandoversList.tsx:101-104` `handovers.length===0 → px-5 py-10 text-center 14px muted No handovers in the next 7 days.` inside `Card`.
- **Empty calendar day:** `ShiftCell personName null → — em dash opacity-40` + no OVR.
- **Empty overrides:** `OnCallOverrides.tsx:65-67` `sorted.length===0 → py-16 text-center 14px muted No overrides found.` else grid.
- **Empty overrides active card:** no past/pending distinction in empty — same text.
- **Loading:** `useResource` → `data null` → `?? []` → zero-state renders above (no skeleton/shimmer unlike `cmdb`/`incidents` — parity gap; should show `Card animate-pulse 3` shimmer per hero/calendar).
- **Error:** no banner — fetch failure → silent empty (should show `Retry` via `useResource error` — gap vs `src/services/core.ts:72-94` error state). `RequestOverrideModal` submit silences validation failures with early return no toast.
- **No service/override data:** hero grid empty, stats `0 schedules · 0 active overrides` + no `incidents engaged`/`pending` chips (conditional render).

---

## Phase 2 Deferred

- Schedule CRUD `POST/PATCH /on-call/schedules` + editor: rotationIntervalDays/dayOfWeek/time, drag-drop member reorder (`shiftOrder`), team binding, member add/remove — rationale: current read-only; `docs/pages/on-call.md §14` "Schedule editor (drag-drop) belum ada."
- Override mutation `POST /on-call/overrides`, `PATCH /:publicId/approve|reject|cancel` — rationale: optimistic-only `M7` formalization (`docs/pages/on-call.md §12`).
- Overlap conflict auto-detect `schedule overlap` for same day/person + multi-schedule per user (weekday vs weekend) native support — rationale: `§14` "Multi-schedule per user belum support."
- Quiet hours config + `NotificationPreference` `on_call_shift_start` / `on_call_escalation` per user UI (`src/types/platform.ts:101-116`) — channels `in_app|email|sms|slack` + `respectQuietHours` — rationale: exists as type/seed but no form.
- Handover scheduler + escalation timer jobs (`on_call_shift_start` emit 2h before shift, `on_call_escalation` on un-acknowledged) — rationale: `docs/pages/on-call.md §13` describes but `server/jobs/` not wired.
- Incident assignment auto-suggest current primary + alert routing `escalationStep recipients → on-call current` — linked downstreams (§10) not yet wired beyond `View incidents` link.
- Filter/search/URL persist `?schedule=&status=&personId=&page&pageSize` + pagination for overrides table (like `cmdb`/`incidents`).
- Validation & error states: `from < to`, past date guard, self-cover prevention, reason length, required fields inline errors.
- Export/calendar ICS feed, `View calendar external` integration.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/platform/OnCall*.tsx` + `src/components/oncall/*` + `docs/pages/on-call.md`):

1. **Layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border` + left `w-1` accent dynamic `#B42318|#DC6803|#1F4FD4|#12B76A` `transition-colors duration-500` (`OnCallLayout.tsx:36-40`). Jangan ganti ke `Module Layout` lain tanpa migrasi token.
2. **Tabs** `NavLink Users|Calendar|UserPlus 14px px-3 py-3 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` (`OnCallLayout.tsx:65-74`).
3. **Stats row** `text-xs ois-text-muted` dot `w-1 h-1 rounded-full bg-ois-border-strong` + `font-semibold text-ois-danger|warning` for incidents/pending (`OnCallLayout.tsx:43-58`).
4. **Hero card** primary band `bg-ois-success-pale/30` green dot `w-2 h-2 bg-ois-success` + primary avatar `w-10 h-10 bg-ois-primary text-white` initials + secondary `w-7 h-7 bg-ois-info/20` + footer `Clock 12 + View incidents → /incidents ChevronRight 12 primary` (`OnCallScheduleCard.tsx:59-114`) + incident badge `danger-pale AlertCircle 11`.
5. **Calendar chrome** `card p-5` header `name 14px bold + teamName 12px muted | X-day rotation 12px muted` + grid `80px+7fr gap-1` `MON..SUN 10px tracking-widest` + week label `MMM d – MMM d 10px muted right` + `min-w-[560px] overflow-x-auto` (`ShiftCalendarGrid.tsx:92-123`).
6. **ShiftCell** `min-h-[56px] rounded-lg border` `isToday border-ois-primary bg-primary/5` vs `isCurrentShift && !isToday bg-success-pale/50` vs `bg-surface-muted/40 hover` + `OVR 8px bold warning-pale border #F79009/30 absolute top-0.5 right-0.5` (`ShiftCell.tsx:32-72`). DayNum `10px semibold`, label truncated `first L.`.
7. **Legend** `w-3 h-3 rounded bg-success-pale/50 border-success/30 + Current shift | border-2 border-ois-primary + Today | OVR warning-pale` (`ShiftCalendarGrid.tsx:126-139`).
8. **Rotation Members** `w-8 h-8 rounded-full bg-primary/10 primary 12px bold initials` + `Shift order {idx+1} 12px muted` + `On call now 11px semibold success-pale border-success/20 rounded-full 1.5 dot success` (`OnCallSchedule.tsx:91-104`).
9. **Handover row** `w-8 h-8 rounded-lg bg-surface-muted + Calendar 14 primary|warning` + `date 14px semibold + OVERRIDE warning-pale chip 10px + schedule · from ArrowRight 11 to medium` (`UpcomingHandoversList.tsx:108-129`).
10. **Override card** `rounded-lg border-ois-border overflow-hidden` header `Badge variant warning|success|neutral|danger per displayStatus + publicId mono 11px muted` + `original User 13 ArrowRight 13 replacement User primary 13` + `CalendarDays 13 date UTC 12 muted + MessageSquare 13 reason subtle + Clock 13 requested/approved 12` (`OverrideCard.tsx:36-102`). Status mapping `PENDING APPROVAL orange | APPROVED green | PAST gray | REJECTED/CANCELLED red` jangan ubah.
11. **Badges** generic: `pending → warning #FFFAEB #DC6803 | approved green #ECFDF3 #067647 | rejected|cancelled red #FEF3F2 #B42318 | past gray #F1F3F7 #475467` (via `Badge` `variant warning|success|danger|neutral`).
12. **Modal** `title Request Override size md` 5 fields label `12px semibold muted uppercase tracking-wide` + `h-9 px-3 text-sm border rounded-lg bg-surface focus:ring-primary/30` + `datetime-local 2-col + textarea resize-none + footer Cancel secondary + Request primary` (`RequestOverrideModal.tsx:74-183`).
13. **Schedule pills** `px-3 py-1.5 rounded-lg text-sm font-medium border` active `bg-ois-primary text-white border-ois-primary` else `bg-surface border-ois-border hover:surface-muted` (`OnCallSchedule.tsx:50-55`).
14. **Ois tokens** strictly `ois-bg|surface|surface-muted|border|border-strong|text|muted|subtle|primary|success|warning|danger` (`src/index.css:8-33`) — no ad-hoc hex beyond type/status palette (`#B42318` incident / `#DC6803` pending / `#1F4FD4` active override accent).
15. **Breadcrumbs** `on-call → On-Call` / `on-call href /on-call label Platform` (`src/lib/breadcrumbs.ts:62,75`) — jangan ubah tanpa migrasi `AppShell` nav.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `onCallService.schedules()` | `GET /api/v1/on-call/schedules` | `oncall.read` | `listByKind<OnCallSchedule>(tenantId,'on-call-schedule')` `server/routes/platform.ts:229-230` tenant-scoped document `kind on-call-schedule` |
| `onCallService.overrides()` | `GET /api/v1/on-call/overrides` | `oncall.read` | `listByKind<OnCallOverride>(tenantId,'on-call-override')` `:232-233` |
| Create override (Phase 2) | `POST /api/v1/on-call/overrides` | `platform.manage` | body `{scheduleId, originalUserId, overrideUserId, startAt, endAt, reason?}` → `pending` → not yet implemented (optimistic `ovr-${Date.now()}` local) |
| Approve override (Phase 2) | `PATCH /api/v1/on-call/overrides/:publicId/approve` | `platform.manage` | `{approvedById, approvedAt}` → `approved` (current `OnCallOverrides handleApprove` hardcodes `u-001 Sarah Chen`) |
| Reject/cancel (Phase 2) | `PATCH .../:publicId/reject|cancel` | `platform.manage` | → `rejected|cancelled` |
| Patch schedule (Phase 2) | `POST/PATCH /api/v1/on-call/schedules` | `platform.manage` | `{name, rotationIntervalDays, rotationStartDayOfWeek, rotationTime, members[]}` |
| Schedules/overrides realtime | `tenant:{tenantId}` socket (future) | — | `server/realtime.ts` pattern — not yet for on-call; use `eventsRouter emit` shape |

All via `src/services/platformServices.ts:95-98` `apiFetch('/on-call/...')` + `src/services/core.ts:29-61` `apiFetch`/`useResource`. Tenant isolation via `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Guard `platformRouter.use('/on-call', requirePermission('oncall.read'))` before any handler.

---

## Open Items

- [ ] Add `POST /on-call/overrides` + `PATCH /on-call/overrides/:publicId` (`approve|reject|cancel`) with `createOnCallOverrideSchema` — verify `on-call-override` `kind` mapping + wire `RequestOverrideModal handleSubmit` from `extraOverrides` local to HTTP + wire `OverrideCard onApprove/onReject` to real user `req.session.userId` (replace hardcoded `u-001`).
- [ ] Add `POST/PATCH /on-call/schedules` + schedule editor UI (interval/dayOfWeek/time picker, members reorder drag-drop, team select) — current read-only pills + static `teamName`.
- [ ] Fix `ShiftCalendarGrid` containment to `overlaps` (`ovStart < dayEnd && ovEnd > dayStart`) — currently strict `<= dayStart && dayEnd <=` misses mid-day overrides; add pending-preview toggle.
- [ ] Validate modal: `from < to`, `startAt` not past, `coveredBy !== original`, reason max 500, show inline error `border-ois-danger` + banner (like `NewChange` wizard).
- [ ] Replace `useResource` per-tab duplication with shared hook `useOnCall()` (SWR/cache) to avoid double fetch `schedules/overrides` across `OnCall/OnCallSchedule/OnCallOverrides/OnCallLayout`.
- [ ] Add `GET /on-call/schedules?teamId=&userId=&page&pageSize` filters + `?status=pending|approved` for overrides, pagination + URL persist `?schedule=&status=` (parity with `availability/Outage` `?service=&date=` nav).
- [ ] Surface `QuietHoursConfig` + `NotificationPreference on_call_shift_start|on_call_escalation` in `/notifications/preferences` or `/profile` — types exist but no UI.
- [ ] Wire incident auto-suggest `currentPrimaryId` as assignee on `POST /incidents` (link `docs/pages/on-call.md §10 Downstream` + `server/jobs` shift handover/escalation).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/on-call.md` + `src/routes/platform/OnCall*.tsx` + `src/components/oncall/*` + `server/routes/platform.ts` (`/on-call`) + `src/types/platform.ts` + `platformServices` + `constants onCallShiftTypeMeta/notificationTopicMeta` to template features (Module Layout 3 tabs + hero/handovers/calendar/members/overrides + RequestOverrideModal) | — |
