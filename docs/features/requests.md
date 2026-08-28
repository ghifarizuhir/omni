# Service Requests — Fulfillment Queue & Detail

Status: **Draft**
Route: `/requests` (queue), `/requests/:requestId` (detail) · Portal: `/portal`, `/portal/catalog`, `/portal/catalog/:itemId`, `/portal/my-requests`
Sidebar: Service Delivery · Service Requests (agent/fulfillment view) — Portal is self-service front door
Source: `src/routes/requests/RequestQueue.tsx`, `RequestDetail.tsx` · `server/routes/itsm.ts` (`itsmRouter` `/requests` + `/catalog`) · `src/types/request.ts` · `src/shared/schemas/request.ts` · `src/services/itsmServices.ts` (`requestsService`)

---

## Intent

Fulfillment view untuk agent/fulfiller — **kelola antrian request, approve/reject per-step approval workflow, reassign active step, track per-step SLA, comment, watch, dan cancel**. Bedakan dari Portal (`/portal`) yang adalah self-service front door untuk end-user submit via catalog dynamic form.

ITIL 4: Service Request Management — standard request (pre-approved, templated di `CatalogItem.workflowTemplate`) vs normal approval chain. Request = controlled fulfillment vehicle, bukan incident (symptom) atau change (risk).

## Current State (snapshot `src/routes/index.tsx:141-142`)

- `src/routes/index.tsx:141` → `<RequestQueue />` at `/requests`
- `src/routes/index.tsx:142` → `<RequestDetail />` at `/requests/:requestId`
- Portal routes (end-user): `src/routes/index.tsx:143-148` → `<PortalLayout>` with `<PortalHome>` `/portal`, `<Catalog>` `/portal/catalog`, `<MyRequests>` `/portal/my-requests`, `<CatalogItemDetail>` `/portal/catalog/:itemId`
- Components: `RequestQueue` 599 lines, `RequestDetail` 1275 lines (`src/routes/requests/`), `FilterDropdown` (`src/components/ui/FilterDropdown`), `Avatar` (`src/components/ui/Avatar`), `Modal` (`src/components/ui/Modal`), `RequestInfoModal/ReassignModal/CancelModal/AddWatcherModal/ApproveModal/RejectModal` inline in `RequestDetail.tsx`.
- API: `itsmRouter` in `server/routes/itsm.ts:159-341` — 11 endpoints via `req.scoped.serviceRequests.*` + `catalogRepo.list` (all `requirePermission('request.read'|'request.write')` + `audit`).
- Types: `CatalogCategory` 6 values, `RequestStatus` 9 values, `WorkflowStepStatus` 5 values, `FieldType` 11 values, `ServiceRequest` + `WorkflowInstance` + `WorkflowStepInstance` + `Approval` (`src/types/request.ts:1-167`).
- Schemas: `cancelRequestSchema` (reason 10..2000 strict), `reassignRequestStepSchema` (stepId+assigneeId strict), `addRequestWatcherSchema` (userId strict) (`src/shared/schemas/request.ts:1-31`).
- Services: `requestsService` 9 methods — `list/get/catalog/approveStep/rejectStep/comments/addComment/cancel/reassignStep/addWatcher/removeWatcher` (`src/services/itsmServices.ts:67-116`).
- RBAC: `requestResource` maps `ownerUserId=requesterId` + `ownerTeamId=catalogItem.ownerTeamId` via registry (`src/lib/rbac/requestResource.ts:17-26`), rules `req-create/read/update/approve/fulfill` (`src/lib/rbac/permissions.ts:203-271`), scope `ServiceRequestsScope` (`server/scope/scopedDb.ts:145-182`, impl `582-679`).

**Working:**
- Queue render header + filter bar (search + 4 dropdowns) + 4 quick chips + table (9 cols) — sort `my_approval first → createdAt desc` (`RequestQueue.tsx:268-274`).
- `STATUS_META` 9 badges dot+text+bg `ois-*` (`RequestQueue.tsx:21-31`, `RequestDetail.tsx:44-54`), `CATEGORY_LABELS` 6 + `CATEGORY_COLOR` 6 hex stripe (`RequestQueue.tsx:33-36`, `RequestDetail.tsx:26-33`).
- SLA per-step `slaRemaining` — breached if `slaStatus breached` or `remaining≤0`, warning if `warning` or `<25% remaining`, else healthy (`RequestQueue.tsx:51-67`); detail `slaPercent`/`slaElapsedLabel`/`stepSlaLabel` (`RequestDetail.tsx:58-97`).
- `RowActions` dropdown `MoreVertical` — Open / Approve (if `isMyApproval`) / Assign / Cancel (`RequestQueue.tsx:144-197`).
- Detail `WorkflowStepper` horizontal arrow connectors `ChevronRight` — card per step `border-2 rounded-xl` status-colored (done `ois-success`/`#F0FDF4`, active `ois-primary`+shadow, rejected `ois-danger-pale`, pending/skipped `ois-surface-muted`) + `Approve/Reject` for `isApprover` (`RequestDetail.tsx:100-237`).
- Detail 3-col body — left `w-[280px]` At a glance + SLA timer progress bar (danger/warning/primary), center pinned tab bar `border-b-2 border-ois-primary` active, right `w-[280px]` Quick actions + Watchers (auto vs explicit) (`RequestDetail.tsx:956-1142`).
- 5 tabs: Overview (description + form summary first 4 fields + linked items), Form responses (all fields resolved via `resolveFieldValue`), Activity (timeline built from `buildActivity`), Comments (thread + composer), Linked items (catalog card + related ticket + KB articles) (`RequestDetail.tsx:648-878`).
- 6 modals: Approve (note optional ≤2000), Reject (reason ≥20, warning skipped), RequestInfo (clarify msg), Reassign (pick user exclude current), Cancel (reason ≥10, irreversible warning, submitting/error state), AddWatcher (pick exclude existing) (`RequestDetail.tsx:239-545`).
- Watchers derivation `autoWatcherIds` = requester + all step assignees, explicit `watchers[]`, union render with `(req.)` tag and remove only explicit (`RequestDetail.tsx:609-629`, `1099-1138`).
- `filterReadable(user,'request', requestResource)` + `requestResource` registry (`RequestQueue.tsx:218-224`).
- `useResource(() => requestsService.list())` + `catalog()` + `knowledgeService.articles()` + `usersService.list()` — `refreshRequests()` after writes, `requestsService.comments(publicId)` lazy by `reqPublicId` (`RequestDetail.tsx:579-592`).

## CRUD Wiring (audited 2026-08-28 — see `docs/audits/crud-audit.md`)

| Op | FE → Service → Route → Scoped → Repo → Prisma | Status |
|----|-----------------------------------------------|--------|
| **C** create via catalog | `CatalogItemDetail.tsx:527 setTimeout REQ-2026-rand` → no `requestsService.create` `itsmServices:67` → no Zod `createRequestSchema` `request.ts 9` → **no `POST /requests`** `itsm.ts 159-341` → no `ServiceRequestsScope.create` `scopedDb 145` → `ServiceRequest 531` exists | 🔴 NOT WIRED |
| **R list** | `Queue 214 useResource(list)` → `list 68 GET /requests` → `GET 159 parsePagination` → `scoped 610 isSrReadBypass AUDITOR/PLATFORM_ADMIN` → `docs.ts:253 prisma.serviceRequest` | 🟢 |
| **R get** | `Detail find by list 594` not `get:69 GET /:publicId 163` (service defined unused) | 🟡 indirect |
| **R comments/catalog** | `Detail 589 comments 85 GET 166`, `catalog 172 GET catalog 530` | 🟢 |
| **U approve/reject** | `ApproveModal 241 note ≤2000` `281 RejectModal ≥20` → `POST approve 205 / reject 211 approveSchema 179 local` → `scoped decideStep 620 srCanWrite` → `docs.ts:256 approved 289 / rejected 300` | 🟢 |
| **U comment/cancel/reassign/watchers** | `775 addComment body ≤10k 88 POST 219`, `456 CancelModal ≥10 → PATCH cancel 242 cancelSchema 9 → scoped 640 → docs.ts:376 CLOSED→409`, `411 ReassignModal → PATCH reassign 265 schema 16` `AddWatcher 501 POST 293 strict` `DELETE 320` | 🟢 |
| **D** | hard DELETE none — `cancel` is soft-D 409 if closed `CLOSED 250` | 🟡 soft only |

*Full evidence §5 `docs/audits/crud-audit.md`.*

**Stub / Partial (2026-08-28 audit):**
- **CREATE missing 🔴** — `portal/catalog/:itemId` submission masih `setTimeout 900` simulated `REQ-2026-* 528` + belum wire `POST /requests` (lihat `docs/pages/portal.md:175`). No shared `createRequestSchema`, no repo `create`.
- `isMyTeam` always `false` (`RequestQueue.tsx:80-82`) — backend `User.team` tidak ada; comment "legacy mock User had team string; track in M6.4".
- `NOW = Date.now()` captured at module load (`RequestQueue.tsx:38`, `RequestDetail.tsx:24`) — SLA elapsed tidak tick realtime; perlu interval/derived.
- `RequestInfoModal` `onConfirm` hanya `jumpToComments()` — tidak hit endpoint, request tidak benar-benar `pending_user` paused (`RequestDetail.tsx:1189-1193`).
- `approveStep` set local `approved=true` (`RequestDetail.tsx:1152-1153`) — tidak recompute dari `workflow.steps`; stale setelah refresh.
- RowActions `Approve/Assign/Cancel` buttons `onOpen=false` — hanya close dropdown, belum wire ke modal/stepId (`RequestQueue.tsx:175-192`).
- `requestsService.list()` tanpa pagination query — `server/routes/itsm.ts:159-161` pakai `parsePagination` tapi client tidak kirim `page/pageSize`.
- `catalog/:itemId` loads full catalog `mockCatalogItems.find 464` no `GET /catalog/:publicId`.

**Missing (vs spec):**
- Saved filter views, multi-sort URL persist (`?status=&category=&sla=` belum sync URL — `useState` only `RequestQueue.tsx:204-209`).
- Full-text `field:value` search parser — search hanya `publicId/title/requesterName/catalogItemName` lowercase includes (`RequestQueue.tsx:244-251`).
- Column customization / resize / reorder (incidents punya — requests belum).
- File upload attachment di comment (`FieldType file_upload` ada tapi tidak dirender sebagai upload).
- SLA pause untuk `pending_user` — elapsed terus jalan (`RequestDetail.tsx:58-68` tidak cek status).
- Bulk actions (assign/priority/tag/export) seperti incidents — requests belum ada `selectedIds` set.
- Realtime subscription `tenant:{tenantId}` / `request:{publicId}` — incidents punya, requests belum subscribe `src/services/realtime.ts`.

## Primary View — Request Queue (`/requests`)

Layout: **flex-col full-height `flex flex-col h-full min-h-0 -mt-6 -mx-6`** — header + filter bar + table + footer.

### Header (`RequestQueue.tsx:290-320`)

```
Service Requests
{all.length} total · {counts.active} active · {counts.myApproval} awaiting your approval · {counts.breached} SLA breached
[New request → /portal/catalog primary bg-ois-primary]
```

- Title `text-2xl font-extrabold tracking-tight` + stats muted row `text-xs text-ois-text-muted` + `font-semibold text-ois-text` counts + `text-ois-info` myApproval + `text-ois-danger` breached + dot separator `text-ois-border-strong`.
- New request button `bg-ois-primary hover:bg-ois-primary-hover text-white rounded-lg Plus 15` — navigasi ke catalog (agent juga boleh create via portal).

### Filter Bar (`RequestQueue.tsx:322-446`)

`bg-ois-surface-muted border-b border-ois-border px-6 py-3 space-y-2.5` two rows:

**Row 1: search + dropdowns + Reset**

- Search `Search 13` + input `pl-8 pr-3 py-1.5 text-xs border-ois-border rounded-lg bg-white focus:ring-ois-primary/20` placeholder `Search ID, title, requester…` + clear `X 12`.
- 4× `FilterDropdown` (`src/components/ui/FilterDropdown`):
  - Status: All / 8 options (draft, submitted, approved, in_fulfillment, pending_user, fulfilled, closed, rejected) — `RequestQueue.tsx:343-358` (cancelled excluded dari dropdown tapi ada di `STATUS_META`).
  - Category: `CATEGORY_LABELS` 6 keys `access|equipment|software|communication|personnel|general` (`RequestQueue.tsx:360-368`).
  - Step type: Approval / Task / Automated (`RequestQueue.tsx:370-379`).
  - SLA: healthy / warning / breached (`RequestQueue.tsx:382-392`).
- Reset `X 12 Reset` visible if `hasFilters` (`search||statusFlt||catFlt||stepFlt||slaFlt||quickFlt`) — `border-ois-border bg-white hover:border-ois-danger/40` (`RequestQueue.tsx:394-401`).

**Row 2: quick chips**

- 4× `QChip` `rounded-full text-xs font-semibold border` active `colorCls` else `bg-white text-ois-text-muted border-ois-border` (`RequestQueue.tsx:120-140`):
  - `Flame 11` Awaiting my approval `counts.myApproval` → `text-ois-primary bg-ois-primary-pale border-ois-primary/30`
  - `ShieldAlert 11` SLA at risk `counts.slaRisk` → `text-ois-warning bg-ois-warning-pale border-[#F79009]/30`
  - `Users 11` My team `counts.myTeam` → `text-ois-success bg-ois-success-pale border-ois-success/30` (always 0 — see Stub)
  - `Radio 11` Last 24h `counts.last24h` → `text-ois-info bg-ois-info-pale border-ois-info/20`
- Right aligned `results.length of all.length requests` when `hasFilters` (`RequestQueue.tsx:440-444`).

Filtering pipeline (`RequestQueue.tsx:241-275`):
```
applyQuick → search (publicId/title/requesterName/catalogItemName) → statusFlt → catFlt → stepFlt (getActiveStep type) → slaFlt (breached/warning/healthy) → sort(my_approval 0→1, createdAt desc)
```

### Columns (Phase 1)

| Column | Source | Width | Sort | Notes |
|--------|--------|-------|------|-------|
| ID | `publicId` | auto | via global sort | `font-mono text-[11px] text-ois-text-muted group-hover:text-ois-primary` + dot `w-1.5 h-1.5 bg-ois-primary` if `isMyApproval` (`RequestQueue.tsx:488-496`) |
| Title | `title` + `catalogCategory` | `max-w-xs` | via global sort | `text-sm font-semibold truncate group-hover:text-ois-primary` + `text-[10px] capitalize text-ois-text-subtle` (`RequestQueue.tsx:500-507`) |
| Status | `status` | auto | via global sort | `StatusPill` `rounded-full text-[11px] font-semibold` dot `w-1.5 h-1.5` + `bg/text` from `STATUS_META` (`RequestQueue.tsx:107-115`) |
| Requester | `requesterName` | auto | via global sort | `Avatar xs` + `text-xs text-ois-text` (`RequestQueue.tsx:514-520`) |
| Current step | `workflow.steps.find(active)` | auto | via global sort | dot by `type` (approval `bg-ois-primary`, automated `bg-ois-success`, task `bg-ois-warning`) + `font-medium name` + `assigneeName.split(' ')[0]` (`RequestQueue.tsx:523-539`) |
| Assigned to | `activeStep.assigneeName` | auto | — | `Avatar xs` + first name else `—`/`Auto` (`RequestQueue.tsx:542-551`) |
| Submitted | `submittedAt` | auto | via global sort | `formatRelative` `text-xs text-ois-text-muted` (`RequestQueue.tsx:554-558`) |
| SLA | `activeStep` + `slaBreached` | auto | — | `slaRemaining` dot `w-1.5 h-1.5` + label (`Breached`/`<1h`/`Xh left`/`Xd left`) colored `ois-danger/warning/success` else `AlertTriangle Breached` if `slaBreached` (`RequestQueue.tsx:561-574`) |
| ⋯ | actions | 40px | — | `RowActions` `MoreVertical 15` popover `bg-ois-surface border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px]` (`RequestQueue.tsx:144-197`) |

Default sort: `isMyApproval(userId) ? 0 : 1` then `createdAt desc` — pending approval untuk current user di atas (`RequestQueue.tsx:268-274`). Row `hover:bg-ois-surface-muted/60` + `myApproval bg-ois-primary-pale/40 hover:bg-ois-primary-pale/70`, `cursor-pointer` click → `navigate(/requests/${req.id})` (`RequestQueue.tsx:479-485`).

### Pagination / Footer

Client-side only; `parsePagination` di server mengembalikan page tapi UI tidak paging — `results` adalah full filtered array. Footer `border-t bg-ois-surface-muted px-6 py-2.5 text-[11px] text-ois-text-subtle` "Showing X requests — Clear filters" (`RequestQueue.tsx:589-596`).

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Create request | `New request` button → `/portal/catalog` | `request.create` (any auth, `permissions.ts:204-209`) | — |
| Open detail | Click row / RowActions Open | `request.read` (own/IFM/APS) | — |
| Approve step | Stepper `Approve` / Quick actions `Approve` / RowActions Approve* | `request.approve` (APS Team Lead+ `team_app` / IFM Team Lead+ `all`) — gated `useCanRbac('request','approve')` + `isApprover(step,userId)` (`RequestDetail.tsx:604-605`, `84-87`) | `step.status==='active' && step.type==='approval' && step.assigneeId===userId` |
| Reject step | Stepper `Reject` / Quick actions `Reject` | `request.approve` same | same; reason ≥20 chars, subsequent pending → skipped |
| Request info | Quick actions `Request info from user` → `RequestInfoModal` | `request.write` (APS/IFM Officer+) | any active (stub: no state change) |
| Reassign step | Quick actions `Reassign current step` → `ReassignModal` pick user | `request.write` | `step.status==='active'` else 409 |
| Add comment | `Add comment` button → `comments` tab + composer `Send` | `request.write` | — (append via `POST /requests/:publicId/comments`) |
| Cancel request | Quick actions `Cancel request` → `CancelModal` reason ≥10 | `request.write` | not `closed/fulfilled/rejected/cancelled` else 409 |
| Add watcher | `Add watcher` → `AddWatcherModal` | `request.write` | idempotent 201/200 |
| Remove watcher | `X` on explicit watcher row | `request.write` | 204 always |

\* RowActions Approve/Assign/Cancel currently close-only (stub) — wire-up pending.

Delegate ke [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) (3-col, pinned header+tabs), [`_shared/entity-comments.md`](./_shared/entity-comments.md), [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) saat shared tersedia.

## Filters / Sort / Search

- **Search:** `search` state on `publicId/title/requesterName/catalogItemName` lowercase includes, no debounce (`RequestQueue.tsx:244-251`).
- **Status filter:** `statusFlt` '' vs 8 options — `req.status===statusFlt` (`RequestQueue.tsx:254`).
- **Category filter:** `catFlt` '' vs 6 `CatalogCategory` (`RequestQueue.tsx:255`).
- **Step type filter:** `stepFlt` '' vs `approval|task|automated` — `getActiveStep(req)?.type===stepFlt` (`RequestQueue.tsx:257-262`).
- **SLA filter:** `slaFlt` '' vs `healthy|warning|breached` — `slaBreached` / `steps.some(slaStatus warning/breached)` / `!breached && every healthy` (`RequestQueue.tsx:264-266`).
- **Quick filters:** `quickFlt` null vs `my_approval/sla_risk/my_team/last_24h` via `applyQuick` (`RequestQueue.tsx:91-103`); counts pre-computed `myApproval/slaRisk/myTeam/last24h/active/breached` (`RequestQueue.tsx:228-238`).
- **Sort:** global `my_approval first` then `createdAt desc` — tidak ada per-column sort toggle.
- **Persist:** state only (`useState`), belum URL query (`?status=&category=&step=&sla=&q=`) persist.
- **Empty search:** table shows `CheckCircle2 32 text-ois-success opacity-60 "All clear. No active requests." + Clear filters` (`RequestQueue.tsx:450-459`).

## Detail View (`/requests/:requestId`)

### Layout (`RequestDetail.tsx:884-1274`)

```
← Queue | StatusPill | ⋯
[w-1 stripe CATEGORY_COLOR] publicId mono | category pill | priority pill
h1 title | tags #tag | Submitted formatRelative by requester · Catalog: publicId
[WorkflowStepper full-width pinned band]
┌─────────────────┬──────────────────────────────┬─────────────────┐
│ Left w-[280px]  │ Center flex-1                │ Right w-[280px] │
│ At a glance     │ Tabs: Overview/Form/Activity │ Quick actions   │
│ SLA timer bar   │ Comments/Linked              │ Watchers        │
└─────────────────┴──────────────────────────────┴─────────────────┘
```

- **Pinned header** `bg-white border-b border-ois-border z-30` (`RequestDetail.tsx:887-941`): nav row `ArrowLeft 15 Queue` + `StatusPill` `rounded-full text-xs font-semibold border` + `MoreHorizontal` menu; entity header `flex gap-0` + stripe `w-1 self-stretch` `backgroundColor CATEGORY_COLOR[catalogCategory]` (`#1F4FD4 access, #DC6803 equipment, #0BA5EC software, #6941C6 communication, #027A48 personnel, #475467 general` — `RequestDetail.tsx:26-33`), `publicId mono text-xs text-ois-text-muted`, category `rounded-full bg-ois-surface-muted border-ois-border text-[11px] capitalize`, priority `high→text-ois-danger bg-ois-danger-pale` else `normal/muted` (`RequestDetail.tsx:917-918`), title `text-xl font-bold`, tags `rounded-full bg-ois-surface-muted border-ois-border text-[11px]`, meta `text-xs text-ois-text-muted` with `formatRelative(submittedAt)`, requester `font-semibold text-ois-text`, catalog link `text-ois-primary font-mono`.
- **Workflow Stepper** `px-6 py-4 bg-white border-b overflow-x-auto` (`RequestDetail.tsx:942-951`): `WorkflowStepper` (`100-237`) renders `flex items-center gap-0 py-1` cards `min-w-[148px] max-w-[172px] rounded-xl border-2 px-3 py-2.5`; connector `h-[2px] w-8` + `ChevronRight 14` emerald if `prevDone` else `bg-ois-border`; card states: done `border-ois-success bg-[#F0FDF4]` (emerald 50), active `border-ois-primary bg-white shadow-md shadow-ois-primary/10`, rejected `border-ois-danger bg-ois-danger-pale`, skipped/pending `border-ois-border bg-ois-surface-muted`; top row step number `text-[10px] font-bold px-1.5 py-0.5 rounded-full` + `TypeIcon` (Zap/Shield/CheckCircle2 `12`); name `text-[12px] font-bold` with `line-through` for rejected/skipped; sub-info: done `✓ decidedBy + formatRelative(completedAt)` else approver `active assigneeName`, SLA `Clock 9 + stepSlaLabel` colored by `slaStatus`; Approve/Reject `Check/X 10` buttons inside active card when `isApprover && canApproveRequest`.
- **Left sidebar** `w-[280px] border-r bg-white p-4 space-y-4 overflow-y-auto` (`RequestDetail.tsx:957-1013`):
  - `SideCard` (`331-338`) `border border-ois-border rounded-lg bg-ois-surface` header `px-4 py-2.5 bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest`.
  - At a glance: dl `space-y-2.5 text-xs` 6 rows Status/Priority/Submitted/Requester/Category/Catalog (catalog link mono `text-ois-primary`).
  - SLA timer: Total `totalSlaHours h target`, Elapsed `slaElapsedLabel`, progress `h-2 rounded-full bg-ois-surface-muted` fill `h-full rounded-full` width `${slaElapsed}%` color `breached→bg-ois-danger`, `>75%→bg-ois-warning`, else `bg-ois-primary` (`RequestDetail.tsx:987-991`), percent `text-[10px] text-ois-text-subtle text-right`, current step `name + Clock + stepSlaLabel` colored by `slaStatus`.
- **Center** `flex flex-col flex-1 min-w-0` (`RequestDetail.tsx:1015-1037`): pinned tab bar `border-b bg-white px-6` `nav flex gap-8 overflow-x-auto scrollbar-hide` 5 tabs `py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary font-bold` else `border-transparent text-ois-text-muted hover:text-ois-text`; content `flex-1 overflow-y-auto px-6 py-5` switching `activeTab` state.
- **Right sidebar** `w-[280px] border-l bg-white p-4 space-y-4 overflow-y-auto` (`RequestDetail.tsx:1039-1141`):
  - Quick actions `space-y-1.5`: Approve `bg-ois-primary text-white hover:bg-ois-primary-hover Check 13` / Reject `border-ois-border hover:bg-ois-surface-muted X 13` (hidden if `!canUserApprove||approved`), `Approved` banner `bg-ois-success-pale text-ois-success CheckCircle2 13`, Request info / Reassign / Add comment `border-ois-border hover:bg-ois-surface-muted MessageCircle/UserCheck 13`, divider `pt-1 border-t` Cancel `border-ois-border text-ois-danger hover:bg-ois-danger-pale Ban 13`.
  - Watchers `SideCard title Watchers (${watchers.length})` — auto `(req.)` tag, remove `X 12` only for explicit (`!autoWatcherIds.has && explicitWatcherIds.includes`), `opacity-60 hover:opacity-100 hover:text-ois-danger`, Add watcher `+ border-dashed border-ois-primary`, error `text-[11px] text-ois-danger`.

### Center Tabs Detail

| Tab | Id | Isi |
|-----|-----|-----|
| Overview | `overview` | Description card (`border-ois-border rounded-lg` header `text-[10px] font-bold uppercase tracking-widest bg-ois-surface-muted`) if `description`, Form responses summary first 4 fields `divide-y` `w-36 label text-ois-text-muted text-xs` + resolved value (`resolveFieldValue`), Linked items card — catalog `Package` link `ExternalLink`, related ticket `AlertCircle` link `/incidents`, KB articles `BookOpen` `text-ois-success` list (`RequestDetail.tsx:648-717`) |
| Form Responses | `form` | Submitted form `border-ois-border rounded-lg` all `catalogItem.formFields` rows `w-52 label text-xs font-semibold` + `Required` sublabel + value `text-sm break-words` via `resolveFieldValue` (`checkbox→✓ Acknowledged`, `multiselect→label join`, `select→label`) else `italic Not provided`, fallback "Catalog item details not available" (`RequestDetail.tsx:720-746`) |
| Activity | `activity` | Timeline `buildActivity` sorted `createdAt→submittedAt→steps started/completed(decision)→fulfilledAt→closedAt` each row `w-6 h-6 rounded-full bg-ois-surface border-ois-border` icon + `w-px bg-ois-border` connector, `text-xs font-semibold actor` + `text-xs text-ois-text-muted text` + `text-[10px] text-ois-text-subtle formatRelative(ts)` (`RequestDetail.tsx:342-359`, `749-772`) |
| Comments | `comments` | Thread `resolvedComments = commentsData ?? []` — `MessageCircle 28` empty, else `Avatar sm` + `bg-ois-surface-muted border-ois-border rounded-lg px-3 py-2.5` with `text-xs font-semibold author` + `text-[10px] text-ois-text-subtle formatRelative`,Composer `textarea rows 3 border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary` + `Send 12 Post comment disabled:opacity-40` calls `requestsService.addComment(publicId, body)` then `refetchComments()` (`RequestDetail.tsx:775-833`) |
| Linked Items | `linked` | Cards `p-3 rounded-lg border-ois-border hover:bg-ois-surface-muted group` — Catalog `w-9 h-9 bg-ois-primary-pale Package 16 text-ois-primary` + `text-xs font-bold` + `text-[10px] font-mono publicId`, Related incident `bg-ois-danger-pale AlertCircle 16 text-ois-danger` → `/incidents`, KB `bg-ois-success-pale BookOpen 16 text-ois-success` → `/kb/:slug` (`RequestDetail.tsx:836-878`) |

### Modals

- **Approve** (`241-277`): `Modal size sm title Approve {publicId}` — step name `font-semibold`, textarea `rows 3 placeholder Looks good…`, `Cancel border-ois-border-strong` + `Approve & continue bg-ois-success Check 14` → `requestsService.approveStep(publicId, stepId, note)` → `setApproved(true)` → `refreshRequests()`.
- **Reject** (`281-327`): same title `Reject {publicId}` — warning subsequent skipped, textarea `rows 4`, validation `reason.trim().length≥20` with counter `text-[11px] text-ois-success/text-ois-text-subtle`, `Cancel` + `Reject bg-ois-danger X 14 disabled:opacity-50` → `requestsService.rejectStep` → `navigate('/requests')`.
- **RequestInfo** (`373-407`): `title Request info from user` — msg to `requesterName` paused warning, textarea `rows 4`, `Send message bg-ois-primary Send 14 disabled:opacity-50` → `jumpToComments()` only (no API — stub).
- **Reassign** (`411-452`): `title Reassign current step` — candidates `users.filter(name!==currentAssignee)`, list `border-ois-border rounded-lg divide-y max-h-56 overflow-y-auto` rows `Avatar xs` + `text-xs font-semibold` + `text-[10px] email/role` selected `bg-ois-primary-pale text-ois-primary Check 13`, error `text-xs text-ois-danger`, `Reassign bg-ois-primary UserCheck 14` with `submitting Reassigning…` → `requestsService.reassignStep(publicId, activeStep.id, {assigneeId,name})` with `reassignSubmitting/reassignError` state.
- **Cancel** (`456-497`): `title Cancel {publicId}` — irreversible warning, textarea `rows 3`, validation `≥10`, counter, error `text-xs text-ois-danger`, `Keep request border-ois-border-strong` + `Cancel request bg-ois-danger Ban 14` with `submitting Cancelling…` → `requestsService.cancel(publicId,{reason})` → `navigate('/requests')`.
- **AddWatcher** (`501-545`): `title Add watcher` — `All users are already watching.` empty, else same list `border-ois-border divide-y max-h-56` filtered `!existingIds.has`, `Add watcher bg-ois-primary disabled:opacity-50` with `submitting Adding…` → `requestsService.addWatcher(publicId,{userId,userName})`.

## State Lifecycle

```
draft → submitted → approved → in_fulfillment → pending_user → fulfilled → closed
                                                                    ↓
                                                            rejected / cancelled
```

Source: `src/types/request.ts:11-20` `RequestStatus` + `docs/pages/requests.md:115-121`.

Step instance `WorkflowStepStatus` `pending → active → completed | skipped | rejected` (`src/types/request.ts:22`).

- Draft → submitted: via portal submit (future `POST /requests`).
- Per-step decision: active approval `POST .../steps/:stepId/approve` (note optional ≤2000, `approveSchema`) → `completed`, auto-activates next `pending→active`; `POST .../steps/:stepId/reject` (note required ≥1 ≤2000, `rejectSchema`, UI gate ≥20) → `rejected`, subsequent `pending` steps → `skipped`, request `rejected` (`server/routes/itsm.ts:179-215` discriminator `not-found-request|not-found-step|already-decided → 409`).
- Cancel: `PATCH .../cancel` body `reason 10..2000 strict` (`src/shared/schemas/request.ts:9-14`), result `not-found→404`, `closed→409` (`server/routes/itsm.ts:242-263`), semua active/pending steps skipped, `closedAt` stamped.
- Reassign: `PATCH .../steps/:stepId/reassign` body `stepId+assigneeId(+assigneeName)` strict (`src/shared/schemas/request.ts:16-23`), `not-active→409 Only active step` (`server/routes/itsm.ts:265-291`).
- SLA per-step `slaStatus healthy|warning|breached` derived dari `startedAt + slaHours` vs `NOW` (`RequestQueue.tsx:51-67`); request-level `slaBreached` boolean + `totalSlaHours` + `estimatedCompletion` (`src/types/request.ts:107-109`).

Ref: `server/scope/scopedDb.ts:584-599` for read bypass `POLICY.service_request.readBypass`; detail not found → `NotFound` component `Package 32 Back to queue` (`RequestDetail.tsx:363-371`) or `Loading… p-6 text-ois-text-muted`.

## Permissions (action-level)

RBAC `src/lib/rbac/requestResource.ts:17-26` → `ownerUserId=requesterId` + `ownerTeamId=item.ownerTeamId`.

| Permission | Who | Scope | Actions |
|------------|-----|-------|---------|
| `request.create` | Any authenticated (`permissions.ts:204-209`) | `all` | Submit via portal `/portal/catalog/:itemId` Step 2 Review — gate `Submit request` |
| `request.read` own | Anyone (`211-214`) | `own` | Read own `requesterId===user.id` (MyRequests + detail own) |
| `request.read` IFM | IFM any level (`217-222`) | `all` | Read all queues/details |
| `request.read` APS | APS Officer+ (`224-228`) | `team_app` | Read routed to own team (`ownerTeamId` via catalog) |
| `request.update` APS | APS Officer+ (`231-236`) | `team_app` | Update, comment, watcher, cancel, reassign (writes) |
| `request.update` IFM | IFM Officer+ (`238-243`) | `all` | Same any request |
| `request.approve` APS | APS Team Lead+ (`245-250`) | `team_app` | Approve/Reject routed |
| `request.approve` IFM | IFM Team Lead+ (`252-257`) | `all` | Approve/Reject any |
| `request.fulfill` APS | APS Officer+ (`259-264`) | `team_app` | Fulfill task steps targeting own apps |
| `request.fulfill` IFM | IFM Officer+ (`266-271`) | `all` | Fulfill infra requests |

Enforcement: `filterReadable(user,'request', requestResource)` in queue (`RequestQueue.tsx:218-224`), `useCanRbac('request','approve',{resource})` for Approve gate (`RequestDetail.tsx:604-605`), server `requirePermission('request.read'|'request.write')` + `req.scoped.serviceRequests.*` appId check via `srCanWrite` → `ScopeViolationError` → 403 `scope_violation` (`server/scope/scopedDb.ts:587-678`, `server/scope/errors.ts`).

Matrix view (from template):

| Role (division/level) | Create | Read | Update/Comment/Watcher/Cancel/Reassign | Approve/Reject | Fulfill |
|-----------------------|--------|------|----------------------------------------|----------------|---------|
| Requester (any auth) | ✅ | own | own if officer route? — else via IFM | ❌ | ❌ |
| APS Member/Viewer | ✅ | team_app if officer else — | ❌ | ❌ | ❌ |
| APS Officer | ✅ | ✅ team_app | ✅ team_app | ❌ | ✅ team_app |
| APS Team Lead+ | ✅ | ✅ team_app | ✅ team_app | ✅ team_app | ✅ team_app |
| IFM any | ✅ | ✅ all | — | — | — |
| IFM Officer+ | ✅ | ✅ all | ✅ all | — | ✅ all |
| IFM Team Lead+ | ✅ | ✅ all | ✅ all | ✅ all | ✅ all |

## Empty / Loading / Error

- **Empty queue (no results):** `flex flex-col items-center py-28 CheckCircle2 32 text-ois-success opacity-60` + `text-sm font-bold All clear. No active requests.` + `Clear filters text-xs text-ois-primary font-semibold hover:underline` if `hasFilters` (`RequestQueue.tsx:450-459`).
- **Empty comments:** `MessageCircle 28 + No comments yet. text-sm text-ois-text-subtle py-8` (`RequestDetail.tsx:787-792`).
- **Empty linked:** catalog card always, incident/KB conditionally — no empty banner special.
- **Loading:** queue has no skeleton yet — `useResource` returns `undefined` initially, `all = requestsData ?? []` renders empty state transiently; detail `if (!req) if (!requestsData) return Loading… p-6 text-sm text-ois-text-muted` else `<NotFound />` (`RequestDetail.tsx:631-634`).
- **Error:** no inline banner yet — `catch console.error Failed to…` for approve/reject/reassign/watcher with `*Error` state shown `text-xs text-ois-danger` only in Cancel/Reassign/AddWatcher/watcher remove (`RequestDetail.tsx:440,484,532,1137`); retry via `refreshRequests()` / `refetchComments()`.
- **404 detail:** `NotFound` `Package 32 text-ois-text-subtle + Request not found text-lg font-bold + Link ArrowLeft 14 Back to queue text-sm text-ois-primary` (`RequestDetail.tsx:363-371`).
- **Validation errors:** Reject `border-ois-danger focus:ring-ois-danger/20` until ≥20, Cancel `border-ois-danger` until ≥10, counters `text-[11px] text-ois-success/text-ois-text-subtle` with `Check 10`.

## Phase 2 Deferred

- Saved filter views + multi-sort URL persist (`?q=&status=&category=&step=&sla=&sort=created:desc`) — rationale: queue is client-filter now, no server query passthrough.
- Real SLA ticker + pause when `pending_user` — rationale: `NOW` is module-load snapshot, elapsed needs interval and business-hours + pause logic.
- `isMyTeam` team resolution via `/auth/me` teams — rationale: `mockUsers` team missing, needs `usersService.me/teams`.
- RowActions wiring (Approve/Assign/Cancel dropdown → modals with stepId) — rationale: currently `setOpen(false)` only.
- Bulk actions (assign/priority/tag/export) & selection `selectedIds` Set like incidents — rationale: queue has no selection mode.
- Column customization / column picker similar to incidents — rationale: not prioritized for Phase 1 fulfillment.
- Column sort toggles (click header → asc/desc) + server sort — rationale: global sort only today.
- File upload attachment in comments + `file_upload` field type upload to storage — rationale: field exists but no backend.
- Realtime `tenant:{tenantId}` + `request:{publicId}` socket for queue/detail auto-refresh (incidents pattern `src/services/realtime.ts`) — rationale: only `refreshRequests()` manual now.
- Full-text `field:value` search parser + server-side search — rationale: client `lowercase includes` only.
- RequestInfo true `pending_user` transition + SLA pause + notification to requester — rationale: modal is jump-to-comments stub.
- In-app notification to assignee/watcher on transition (beyond audit log) — rationale: `audit` exists but not notification delivery.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/requests/` + `docs/pages/requests.md`):

1. **Header stats cluster** `text-2xl font-extrabold tracking-tight + text-xs text-ois-text-muted` — `total · active · my approval (text-ois-info) · breached (text-ois-danger)` dengan `· text-ois-border-strong` separators (`RequestQueue.tsx:294-310`) — extend jangan hapus.
2. **Status pill** `inline-flex gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none` + dot `w-1.5 h-1.5` — color triple `bg/text/dot` dari `STATUS_META` `ois-info/success/warning/purple/danger/muted` (`RequestQueue.tsx:22-30`, `RequestDetail.tsx:44-54`) — konsisten dengan incidents `IncidentStatusPill`.
3. **Quick chips** `rounded-full border gap-1.5 px-3 py-1.5 text-xs font-semibold` + count `text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 vs bg-ois-surface-muted` — active `bg-ois-*-pale border-ois-*/30` else `bg-white text-ois-text-muted border-ois-border` (`RequestQueue.tsx:123-140`).
4. **Row hover + my-approval tint** `hover:bg-ois-surface-muted/60 + myApproval bg-ois-primary-pale/40 hover:bg-ois-primary-pale/70` + ID `font-mono text-[11px] group-hover:text-ois-primary` + Title `truncate group-hover:text-ois-primary` (`RequestQueue.tsx:482-502`) — reveal affordance sama seperti incidents.
5. **FilterDropdown + search** `h-9 rounded-lg border-ois-border-strong bg-white focus:ring-ois-primary/20 focus:border-ois-primary` search `pl-8 Search 13 + clear X 12` (`RequestQueue.tsx:328-335`).
6. **Current step dot by type** `w-1.5 h-1.5 approval bg-ois-primary / automated bg-ois-success / task bg-ois-warning` + SLA dot `w-1.5 h-1.5 ois-danger/warning/success` + label `text-xs font-semibold` (`RequestQueue.tsx:526-565`).
7. **Row actions popover** `absolute right-0 top-full mt-1 bg-ois-surface border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px] py-1 text-sm` + items `px-3 py-2 hover:bg-ois-surface-muted/…-pale` (`RequestQueue.tsx:169-194`).
8. **Pinned header + category stripe** `w-1 self-stretch CATEGORY_COLOR` + `publicId font-mono text-xs text-ois-text-muted` + category `rounded-full bg-ois-surface-muted border-ois-border capitalize text-[11px]` + priority pill (`RequestDetail.tsx:909-920`) — jangan ganti stripe jadi border-top.
9. **Workflow stepper** `flex gap-0 py-1 overflow-x-auto` cards `rounded-xl border-2 px-3 py-2.5 min-w-[148px] max-w-[172px]` state colors `done border-ois-success bg-[#F0FDF4] / active border-ois-primary bg-white shadow-md shadow-ois-primary/10 / rejected border-ois-danger bg-ois-danger-pale / pending bg-ois-surface-muted` + step number `text-[10px] font-bold px-1.5 py-0.5 rounded-full` + TypeIcon `12` + connector `h-[2px] w-8 + ChevronRight 14` emerald if `prevDone` (`RequestDetail.tsx:108-237`).
10. **SideCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` header `px-4 py-2.5 bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` (`RequestDetail.tsx:331-338`) — sama dengan `SectionCard` incidents/changes.
11. **Tab bar** `py-4 px-1 border-b-2 whitespace-nowrap text-sm font-medium` active `border-ois-primary text-ois-primary font-bold` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` + Comments count `(${length})` (`RequestDetail.tsx:1019-1027`).
12. **SLA progress bar** `h-2 rounded-full bg-ois-surface-muted overflow-hidden` fill `h-full rounded-full transition-all` width `${slaElapsed}%` color `breached bg-ois-danger >75 bg-ois-warning else bg-ois-primary` + right `text-[10px] text-ois-text-subtle` percent (`RequestDetail.tsx:987-993`).
13. **Quick actions stack** `space-y-1.5` one primary `bg-ois-primary text-white` max, others `border-ois-border hover:bg-ois-surface-muted` + danger `text-ois-danger hover:bg-ois-danger-pale` + success banner `bg-ois-success-pale text-ois-success` (`RequestDetail.tsx:1042-1096`).
14. **Watchers** auto `(req.)` label + explicit removable `X 12 opacity-60 hover:opacity-100 hover:text-ois-danger` + Add `w-5 h-5 border-2 border-dashed border-ois-primary +` (`RequestDetail.tsx:1099-1135`).
15. **Tokens only `ois-*`** — `ois-primary/hover/pale, ois-bg/surface/surface-muted/border/border-strong, ois-text/muted/subtle, ois-success/pale, ois-warning/pale, ois-danger/pale, ois-info/pale, shadow-ois-dropdown/card, rounded-lg/full` — no ad-hoc hex except category stripe & stepper done tint (see #9).

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Body / Notes |
|--------|----------|------------|--------------|
| List queue | `GET /api/v1/requests?page=&pageSize=` | `request.read` | `parsePagination` via `server/lib/pagination.ts`; `req.scoped.serviceRequests.list` with `POLICY.service_request.readBypass` filter (`server/routes/itsm.ts:159-162`, `server/scope/scopedDb.ts:610-615`) |
| Get detail | `GET /api/v1/requests/:publicId` | `request.read` | `required(await scoped.serviceRequests.get) 404` (`itsm.ts:163-165`) |
| List comments | `GET /api/v1/requests/:publicId/comments?page=&pageSize=` | `request.read` | verify exists 404 then `listComments` (`itsm.ts:166-171`) |
| List catalog | `GET /api/v1/catalog?page=&pageSize=` | `request.read` | `catalogRepo.list(tenantId)` (`itsm.ts:172-175`) |
| Approve step | `POST /api/v1/requests/:publicId/steps/:stepId/approve` | `request.write` | `approveSchema {note? ≤2000}` → `decideStep(approved)`; 404 request/step, 409 `already-decided`; `audit step_approve` (`itsm.ts:179-214`) |
| Reject step | `POST /api/v1/requests/:publicId/steps/:stepId/reject` | `request.write` | `rejectSchema {note ≥1 ≤2000 (*20 UI*)}` same discriminator + `audit step_reject` (`itsm.ts:211-215`) |
| Add comment | `POST /api/v1/requests/:publicId/comments` | `request.write` | `requestCommentSchema {body 1..10_000}` via `appendComment`; `audit comment` + return `{...comment, dbId}` (`itsm.ts:219-236`) |
| Cancel | `PATCH /api/v1/requests/:publicId/cancel` | `request.write` | `cancelRequestSchema {reason 10..2000 strict}`; wrapper `not-found→404, closed→409`; `audit request.cancel` (`itsm.ts:242-263`) |
| Reassign step | `PATCH /api/v1/requests/:publicId/steps/:stepId/reassign` | `request.write` | `reassignRequestStepSchema {stepId, assigneeId, assigneeName?} strict` via `...req.body`+path; `not-active→409`; `audit request.reassign` (`itsm.ts:265-291`) |
| Add watcher | `POST /api/v1/requests/:publicId/watchers` | `request.write` | `addRequestWatcherSchema {userId, userName?} strict`; idempotent `{watchers, wasNew}` 201/200; audit only if `wasNew` (`itsm.ts:293-318`) |
| Remove watcher | `DELETE /api/v1/requests/:publicId/watchers/:userId` | `request.write` | idempotent 204; audit only if `wasPresent` (`itsm.ts:320-341`) |

Client via `requestsService` (`src/services/itsmServices.ts:67-116`): `list/get/catalog/approveStep/rejectStep/comments/addComment/cancel/reassignStep/addWatcher/removeWatcher` all `apiFetch` with `method/body`.

Socket: belum subscribe — incidents pattern `tenant:{tenantId}` + `incident:{publicId}` via `src/services/realtime.ts` is target untuk requests.

## Open Items

- [ ] **CRUD P0 — wire `POST /requests` create** — add shared `createRequestSchema` (`catalogItemId + formData` validated `CatalogItem.formFields 51`), repo `create` (`workflowTemplate→ WorkflowInstance currentStep 0 pending→active, slaHours→totalSlaHours`), `ServiceRequestsScope.create`, route `POST /requests requirePermission('request.create')` audit — remove `setTimeout` sim `CatalogItemDetail 527`.
- [ ] Wire `RowActions` Approve/Assign/Cancel → step modals (currently `setOpen(false)` only — `RequestQueue.tsx:175-192`).
- [ ] Implement `isMyTeam` via real team membership from `/auth/me` or `/users/me/teams` — `RequestQueue.tsx:80-82` returns false always.
- [ ] Fix SLA ticker: `NOW = Date.now()` snapshot (`RequestQueue.tsx:38`, `RequestDetail.tsx:24`) → derived + interval tick + pause when `pending_user`.
- [ ] Make `RequestInfoModal` actually transition `pending_user` + notify + pause SLA — currently `jumpToComments()` only (`RequestDetail.tsx:1189-1193`).
- [ ] Persist filters/sort in URL query params + server-side pass-through — `useState` only today.
- [ ] Add queue pagination UI (`page/pageSize` to `requestsService.list({page,pageSize})`) — server supports `parsePagination` but client doesn't send.
- [ ] Add selection + bulk bar (export CSV etc.) mirroring incidents `selectedIds` pattern.
- [ ] Wire realtime `tenant:{tenantId}` / `request:{publicId}` for queue/detail auto-refresh.
- [ ] Verify `approved` local state vs derived from workflow — `setApproved(true)` may desync after `refreshRequests()` (`RequestDetail.tsx:1152-1153`).
- [ ] Confirm cancel `closed→409` vs `cancelled`/`rejected` mapping — service returns `closed` sentinel for any closed (`itsm.ts:252`).
- [ ] Extract `approveSchema/rejectSchema 179` local `itsm.ts` → shared `src/shared/schemas/request.ts` strict (like `cancel`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/requests.md` + `src/routes/requests/*` + `src/types/request.ts` + `server/routes/itsm.ts` + `src/shared/schemas/request.ts` ke template features (Queue/Stepper/5 tabs/6 modals/Lifecycle/RBAC) | — |
| 2026-08-28 | CRUD audit ITSM core — add wiring matrix Create 🔴 (portal sim) / R-U 🟢 (approve/reject/cancel/reassign/watchers) — full evidence in `docs/audits/crud-audit.md` | — |
