# Incidents

Status: **Draft**
Route: `/incidents` (queue), `/incidents/:incidentId` (detail), `/incidents/major/:incidentId` (War Room), `/incidents/analytics` (analytics)
Sidebar: Operations · Incidents
Source: `src/routes/incidents/IncidentQueue.tsx`, `IncidentDetail.tsx`, `MajorIncidentWarRoom.tsx`, `IncidentAnalytics.tsx` · `server/routes/incidents.ts` · `src/types/incident.ts`

---

## Intent

Pusat penanganan gangguan — **restore service secepat mungkin** dengan jejak komunikasi, SLA, dan keterkaitan CI/problem/change yang audit-friendly. Operator harus triage → take action → resolve dalam <5 klik, dan major incident punya war room dedicated.

ITIL 4: Incident = symptom/service disruption (quick recovery), terpisah dari Problem (root cause long-term). Satu Problem bisa link ke banyak Incident.

## Current State (snapshot `src/routes/index.tsx:133-136`)

- `src/routes/index.tsx:133` → `<IncidentQueue />` at `/incidents`
- `src/routes/index.tsx:134` → `<IncidentAnalytics />` at `/incidents/analytics`
- `src/routes/index.tsx:135` → `<MajorIncidentWarRoom />` at `/incidents/major/:incidentId`
- `src/routes/index.tsx:136` → `<IncidentDetail />` at `/incidents/:incidentId`
- Komponen pendukung: `IncidentPriorityBadge`, `IncidentStatusPill`, `SLAIndicator`, `MajorIncidentBanner`, `ResolveIncidentModal`, `PromoteMajorModal`, `LinkCIModal/Problem/Change`, `UserPickerModal`, `IncidentCommentThread`, `IncidentTimelineEntry`, `IncidentClock`, `BlastRadiusBackdrop` (`src/components/incidents/`).
- API: `server/routes/incidents.ts` — 14 endpoints via `req.scoped.incidents.*` (list/get/comments/timeline/status/assign/links/resolve/promote/stand-down/comms/watchers).
- Types: `IncidentStatus new→triaging→in_progress→pending→resolved→closed` + `IncidentPriority P1..P4` + `SLAStatus healthy|warning|breached|paused|met` + `IncidentEventKind` 19 kinds (`src/types/incident.ts:3-38`).

**Working:**
- Queue render table (Priority, ID `font-mono ois-primary`, Title, Status Pill, Assignee avatar, Service, Created `formatRelative`, SLA, Tags, ⋯ menu) — sort default `priority asc → created desc`.
- Quick chips (`my_open`, `sla_risk`, `p1p2`, `last_24h`, `customer_facing`) — `applyQuickFilter` di `IncidentQueue.tsx`.
- Search + Status/Priority `FilterDropdown` + quick chips + bulk bar (terlihat saat `selectedIds.size>0`).
- Row click → `/incidents/:publicId`; hover reveals `⋯` (View / Assign to me).
- `MajorIncidentBanner` saat ada `isMajor=true`.
- Detail 3-column (left SectionCards, center tabs Overview/Timeline/Comments/Affected CIs/Linked Items/Resolution, right Quick actions + BIA + Related).
- Status dropdown gated `Can`/`incident.write`, timeline filter `all/status_changed/comment_added/created/ci_linked/comms_posted`.
- War Room 3-col (Activity Stream / Comms Log+Composer / Status Panel) + `StandDownModal` reason ≥10 chars → `P2` default.
- RBAC `filterReadable` + `incidentResource` — `watchers` ikut di JSON snapshot.

## CRUD Wiring (audited 2026-08-28 — see `docs/audits/crud-audit.md`)

| Op | FE → Service → Route → Repo → Prisma | Status |
|----|--------------------------------------|--------|
| **C** create | `CreateIncidentModal 53 handleCreate INC-2026-rand 55→onCreated 616 navigate` → no `incidentsService.create` `itsmServices:69` → **no `POST /incidents`** `incidents.ts 28-337` → no `incidentsRepo.create` `repositories/incidents.ts 78` | 🔴 NOT WIRED (fake ID, refresh 404) |
| **R list** | `Queue 88 useResource(list) 99 filterReadable incidentResource` → `list 45 GET /incidents` no `?page` (server `parsePagination 29` + `take/skip 94` wired) | 🟡 pagination dead |
| **R get/detail** | `Detail 165 get 186 timeline 190 comments` → `GET :publicId 42` · `GET .../comments 46` `GET .../timeline 51` | 🟢 |
| **U status/resolve/promote/standDown** | `Detail 307 setStatus 322 resolve 347 promoteMajor` `WarRoom standDown` → `PATCH status 84 reject resolved400 89` `POST resolve 110 Zod14` `POST promote-major 136` `POST stand-down 161 reason min10 102` audit | 🟢 |
| **U assign/update/links** | `bulkAssign 308 assign 73` `bulkPriority 325 update priority 90` `setLinks 76` → `PATCH assign 237` `PATCH /:publicId priority/tags 212` `PATCH links 261` | 🟢 |
| **U comment/comms/watchers** | `addComment 65 isInternal+mentions 22` `postComms 99 audience 111` `addWatcher 74` → `POST comments 58` `POST comms 187` `POST/DELETE watchers 287,316` tx+timeline | 🟢 |
| **D** | `close` via `status=closed` `bulkClose 300 setStatus closed` | 🟡 soft only |

**Stub / Partial (2026-08-28 audit):**
- **CREATE 🔴** — `CreateIncidentModal.tsx:53-62` fake `INC-2026-${random}` `onCreated` navigate tanpa `apiFetch`; no `incidentsService.create` `services/incidentsService.ts:44`, no `POST /incidents` `server/routes/incidents.ts`, no Zod `createIncidentSchema` `shared/schemas/incident.ts:14`, no repo `create`. Pola sama dengan `problems`/`requests`/`CMDB`.
- `applyQuickFilter my_open 63` + `myOpenCount 241` hardcode `u-001` (Open Item #1).
- SLA scheduler job (`server/jobs/`) masih emit `sla_warning|breached` tapi delivery belum ke Status Page.
- `commenters` tracker di War Room masih TODO (`MajorIncidentWarRoom:507`).
- Mention `mentions[]` `addIncidentCommentSchema 25` disimpan tapi notification delivery belum end-to-end.
- Mobile war room fallback message (bukan layout real).
- Stripe color bug `IncidentRow 694 stripeColor incident.severity→priority` fallback `#1F4FD4` always.

**Missing (vs spec):**
- Server `POST /incidents` create endpoint + shared Zod + repo + audit (template `changes POST /changes 63` / `kb POST /kb/articles 408` reusable).
- Column customization / resize / reorder (terra punya — OIS belum).
- Saved filter views, multi-sort persistence di URL.
- Full-text `priority:urgent app:payment` search.

## Primary View — Incident Queue (`/incidents`)

Layout: **table list + filter bar + banner + bulk bar**.

### Header

- Title block: `Incident Queue` + stats `(total / active / major)` + links `Analytics` + `New incident` (primary button, `incident.create`).
- Banner Major aktif (kalau ada `isMajor`).
- Filter bar: Search (debounced) · Status `FilterDropdown` (All/New/Triaging/In progress/Pending/Resolved/Closed) · Priority (All/P1..P4) · Reset.
- Quick chips row (see Current State — 5 pills `rounded-full` active `bg-ois-primary text-white` else `bg-white border-ois-border`).
- Bulk bar (muncul saat select): `Assign` / `Priority` / `Tag` / `Close` / `Export CSV`.

### Columns (Phase 1)

| Column | Source | Width | Sort | Notes |
|--------|--------|-------|------|-------|
| ☐ | selection | 36px | ❌ | header `CheckSquare/Square` |
| Priority | `priority` | 90px | ✅ | `IncidentPriorityBadge` P1 ping |
| ID | `publicId` | 110px | ✅ | `font-mono text-xs text-ois-primary` |
| Title | `title` | flex | ✅ | truncate + tooltip |
| Status | `status` | 120px | ✅ | `IncidentStatusPill` with dot `6px` |
| Assignee | `assigneeId→name` | 140px | ✅ | `Avatar xs` + name |
| Service | `affectedServiceIds[0]` | 120px | ✅ | via `servicesService` |
| Created | `createdAt` | 100px | ✅ | `formatRelative` |
| SLA | `slaResponseStatus/slaResolveStatus` | 80px | ❌ | `SLAIndicator` healthy/warning/breached |
| Tags | `tags` | 120px | ❌ | `rounded-full` muted |
| ⋯ | actions | 40px | — | hover reveal `MoreHorizontal` |

Default sort: `priority asc (P1→P4)` then `createdAt desc`. Persist di state (belum URL).

### Row interaction

- Hover: `hover:bg-ois-surface-muted`, reveal `⋯`.
- Click row → `navigate(/incidents/{publicId})`.
- `⋯` → `View` / `Assign to me` (`Can incident.write`).
- Checkbox → add to `selectedIds` Set → show bulk bar.

### Pagination

`parsePagination` via `server/lib/pagination.ts` — `?page=&pageSize=` (lihat `server/routes/incidents.ts:20-24`). Default `pageSize 20` (verify di service).

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Create incident | `New incident` button / `CreateIncidentModal` | `incident.create` | — |
| Edit title/desc | Overview editable `div` / `Edit3` | `incident.write` | not closed |
| Change priority | Left sidebar dropdown | `incident.write` | not closed |
| Change status | Top `StatusDropdown` or quick actions | `incident.write` | `resolved` must use `POST .../resolve` |
| Assign / unassign | Quick actions `Assign to me` / `UserPickerModal` | `incident.write` | — |
| Toggle major | `PromoteMajorModal` → war room | `incident.write` | not major |
| Stand down | War Room `StandDownModal` | `incident.write` | isMajor |
| Link CI/problem/change/event | `LinkCIModal` etc. | `incident.write` | — |
| Add comment | `IncidentComposer` (Markdown + internal toggle + `+` mention) | `incident.write` | — |
| Resolve | `ResolveIncidentModal` (summary + rootCause + workaround → optional KB PIR) | `incident.resolve` | not resolved |
| Close | via status `closed` | `incident.close` | resolved |
| Watch/unwatch | `watchers` add/remove | `incident.write` | — |
| Export CSV | Bulk bar `Export` | `incident.read` | — |

Delegate ke [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) (3-column), [`_shared/entity-comments.md`](./_shared/entity-comments.md), [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) saat shared tersedia.

## Filters / Sort / Search

- **Search:** debounced 300ms di `title` + `publicId` + `tags` (client-side filter dulu, fallback server jika >100 rows — lihat `IncidentQueue.tsx:filter`).
- **Status filter:** `incident.read` — `all` vs `new|triaging|in_progress|pending|resolved|closed`.
- **Priority filter:** `all` vs `P1..P4`.
- **Quick filters:** `my_open` (assignee `u-001` placeholder — ganti `user.id` saat real), `sla_risk` (warning|breached), `p1p2`, `last_24h`, `customer_facing`.
- **Service/CI filter:** via query `?ciId=&problemPublicId=` ke `GET /incidents` (lihat `incidents.ts:20-23`).
- **Sort:** click column header → toggle asc/desc (priority numeric `P1:0→P4:3`).
- **Export:** `GET /api/v1/incidents/export` (belum ada di router saat ini — TODO, legacy `docs/pages/incidents.md` mencantumkan).

## Detail View (`/incidents/:incidentId`)

### Layout (3-column, `IncidentDetail.tsx:SectionCard` pattern)

```
← Queue | StatusDropdown | ⋯
[color bar priority] Major badge | publicId mono | Title (font-bold text-xl)
tags + created/reporter/assignee/updated metadata
┌──────────────┬──────────────────────────────┬──────────────┐
│ Left sidebar │ Center tabs (Overview/       │ Right actions│
│ At a glance  │ Timeline/Comments/Affected   │ Quick actions│
│ SLA timers   │ CIs/Linked Items/Resolution) │ BIA Context  │
│ Affected svc │                              │ Related (5)  │
│ Watchers     │                              │              │
└──────────────┴──────────────────────────────┴──────────────┘
```

- **Left:** Featured `Status+Priority` card, `At a glance` (Severity, Created, Reporter, Channel, Assignee, IC if major), `SLA timers` (response+resolve progress), `Affected services`, `Watchers` + `+ Add watcher`.
- **Center tabs:** Overview (description editable, customerImpact, triggeringEvent `IDCell` link `/events/:id`), Timeline (19 kinds, filter `TIMELINE_FILTERS`), Comments (`IncidentCommentThread` + `IncidentComposer` internal toggle), Affected CIs (health badge → `/cmdb/:publicId`), Linked Items (event/problem/changes/KB/outages 3h window), Resolution (summary/rootCause/workaround or `Mark as resolved` button gated `incident.close`).
- **Right:** `Assign to me · Acknowledge · Resolve · Promote to Major · Add comment · Link CI/Problem` + `BIA Context` (Impact Level, Score, RTO/RPO, hourly cost via `continuityService`) + `Related incidents` (same CI 7d, max 5).

### War Room (`/incidents/major/:incidentId`)

3 kolom `35%/40%/25%`: Activity Stream (full timeline) | Comms Log (filter `kind=comms_posted`, composer `audience internal|all_staff|customer`, channel delivery, optimistic) | Status Panel (services, roles, quick links, Stand down / Resolve). Mobile → fallback "Desktop recommended".

### Analytics (`/incidents/analytics`)

KPI row: Total / MTTR / SLA compliance / Major — trend vs prior period. Panels: Volume over time (P1 vs P2), MTTR by Service, Top Categories (tag), Top Recurring CIs (badge `● Active` if CI has active problem), SLA by Priority. Range `7d/30d/90d`. Export CSV.

## State Lifecycle

```
new → triaging → in_progress → pending → resolved → closed
                                    ↘ reopen → new/triaging (reopenCount++)
```

- `isMajor` orthogonal — any status can be major.
- Resolve wajib via `POST /incidents/:publicId/resolve` (body `summary`, `rootCause?`, `workaround?`, `resolvedBy`) — `PATCH .../status` menolak `resolved`.
- Timeline kinds untuk setiap transition: `status_changed` (from/to), `priority_changed`, `assigned`, `comment_added`, `ci_linked`, `problem_linked`, `event_linked`, `sla_warning|breached`, `major_declared`, `promoted_major`, `major_stood_down`, `comms_posted`, `resolution_added`, `resolved`, `reopened`, `closed`, `watcher_added`.

Ref: state meta di `src/lib/constants.ts#incidentStatusMeta` (color+dot per status).

## Permissions (action-level)

| Role | Create | Read | Update | Promote Major | Resolve | Close | Comment | Link |
|------|--------|------|--------|---------------|---------|-------|---------|------|
| `incident.read` | — | ✅ queue/detail/timeline/comments | — | — | — | — | — | — |
| `incident.create` | ✅ New incident | ✅ | — | — | — | — | — | — |
| `incident.write` | — | ✅ | ✅ title/priority/tags/assign/link/standDown/comms/watchers | ✅ | — | — | ✅ | ✅ |
| `incident.resolve` | — | ✅ | — | — | ✅ resolve endpoint | — | — | — |
| `incident.close` | — | ✅ | — | — | — | ✅ | — | — |

RBAC scope: `filterReadable(user,'incident',...)` + `incidentResource(inc)` (reporter/assignee/watcher/context). Scope violation → 403 via `server/scope/errors.ts`.

## Empty / Loading / Error

- **Empty queue:** `text-center py-12` + `CheckCircle2 36px text-ois-text-subtle` + `No incidents match filters` + `Clear filters` / `New incident` CTA.
- **Empty War Room comments:** `No comms yet — post first update` + composer.
- **Loading:** table skeleton (8 rows shimmer) + filter bar dim; detail skeleton `SectionCard` placeholders.
- **Error:** top banner `bg-ois-danger-pale text-ois-danger` + `Retry` → `refreshIncidents()`. 404 incident → `NotFound` page.

## Phase 2 Deferred

- Column customization / reorder / persist (`user_preferences`).
- Saved filter views, multi-sort URL persist (`?sort=priority:asc,created desc`).
- Incident templates (DB outage, Payment failure prefill).
- Full-text `field: value` search parser.
- Row keyboard nav (↑↓, Enter, `E` edit, `A` assign).
- Auto-assign round-robin / skill-based per team.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/incidents/` + `docs/pages/incidents.md`):

1. **Table grid pattern** — priority strip left edge (`style backgroundColor PRIORITY_COLOR`), `font-mono` ID, `P1` ping `IncidentPriorityBadge`.
2. **Stats cluster** di header (Total / Active / Major) — extend, jangan hapus.
3. **Row hover** `hover:bg-ois-surface-muted` + `⋯` reveal + `cursor-pointer`.
4. **StatusDropdown** dot `w-2 h-2 rounded-full` + `ChevronDown 14px` + popover `w-44 border-ois-border rounded-lg shadow-lg` pattern.
5. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `text-[11px] uppercase tracking-widest`.
6. **Quick actions** `space-y-1.5` with one `primary` (`bg-ois-primary`) max, others `border-ois-border hover:bg-ois-surface-muted`.
7. **BlastRadiusBackdrop** subtle radial di detail header — jangan reintroduce dark `linear-card` overlay.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Notes |
|------|----------|-------|
| `incidentsService.list()` | `GET /api/v1/incidents?active&major&ciId&problemPublicId&page&pageSize` | `requirePermission('incident.read')` |
| `incidentsService.get(publicId)` | `GET /api/v1/incidents/:publicId` | |
| `incidentsService.comments(id)` | `GET /api/v1/incidents/:incidentId/comments` | |
| `incidentsService.timeline(id)` | `GET /api/v1/incidents/:incidentId/timeline` | |
| `addComment` | `POST /api/v1/incidents/:incidentId/comments` | `incident.write` + `audit comment` |
| `setStatus` | `PATCH /api/v1/incidents/:publicId/status` | rejects `resolved` |
| `resolve` | `POST /api/v1/incidents/:publicId/resolve` | `incident.resolve` |
| `promoteMajor` | `POST /api/v1/incidents/:publicId/promote-major` | body `{ commanderId }` |
| `standDown` | `POST /api/v1/incidents/:publicId/stand-down` | body `{ reason≥10 }` |
| `comms` | `POST /api/v1/incidents/:publicId/comms` | `{ body, audience, channels }` |
| `watchers` | `POST /api/v1/incidents/:id/watchers` / `DELETE .../:userId` | |

Socket: `tenant:{tenantId}` + `incident:{publicId}` — queue & detail subscribe via `src/services/realtime.ts`.

## Open Items

- [ ] **CRUD P0 — wire `POST /incidents` create** — add `createIncidentSchema` `shared/schemas/incident.ts` (`title min1 max200 desc prio channel assignee`), `incidentsRepo.create` `prisma.incident count→INC-YYYY-NNNNN` `tenantId/actor`, `POST /incidents requirePermission('incident.create')` zod→scoped→repo→audit 201 → wire `CreateIncidentModal handleCreate 53` async + error + `refreshIncidents()` (remove fake `Math.random` + `onCreated` fake).
- [ ] Verify `GET /incidents/export` endpoint exists (legacy docs claim, router belum punya).
- [ ] `IncidentQueue.tsx:applyQuickFilter` hardcode `u-001` — harus `user.id`.
- [ ] Mobile war room real layout vs fallback.
- [ ] Fix pagination `incidentsService.list()` → `apiFetch('/incidents',{query:{page,pageSize}})` + BE `parsePagination` already wired `incidents.ts:29`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/incidents.md` + `src/routes/incidents/*` + `server/routes/incidents.ts` ke template features (Intent/Current State/Primary View/Actions/Lifecycle) | — |
| 2026-08-28 | CRUD audit ITSM core — add wiring matrix Create 🔴 (fake ID `CreateIncidentModal 53` no POST) / R-U 🟢 — full evidence `docs/audits/crud-audit.md` | — |
