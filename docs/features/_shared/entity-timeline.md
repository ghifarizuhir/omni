# Entity Timeline

Status: **Draft**
Used by: Incidents timeline (`IncidentDetail` center tab + War Room Activity Stream), CMDB Audit (`CMDBAudit` + `CMDBDetail` Audit tab), Changes History (`ChangeDetail` History tab), Releases History (`ReleaseDetail` History tab), Monitoring Event Timeline (future), Availability/Outage drawer (future). Cross-ref dari semua `features/*.md` yang butuh feed kronologis.

---

## Purpose

Vertical chronological feed yang menampilkan **apa yang pernah terjadi ke satu entity, kapan, oleh siapa** dalam satu scroll area tanpa jumping ke tabel terpisah. Di OIS timeline adalah **reader yang merge multi-source** — `IncidentTimelineEvent` (append-only), `CIAuditEntry` (CMDB audit), dan synthetic `AuditEntry` (Releases/Changes) di-render dengan **satu contract visual yang konsisten** (left rail/dot + timestamp + actor + details) tapi **tiga varian komponen** sesuai domain.

Kenapa di-shared:

1. Pattern identik lintas entity — left rail + day grouping + filter chips + empty/loading states sama; hanya kind catalog + details template yang extended per domain.
2. Menghindari duplikasi spec di `features/incidents.md`, `features/cmdb.md`, `features/changes.md`, `features/releases.md`. Page doc cukup: `Timeline: see _shared/entity-timeline.md`.
3. Backend contract seragam: `GET .../timeline` return `IncidentTimelineEvent[]` sorted `timestamp asc` (repo) / desc di UI, `GET /cis/audit` return `CIAuditEntry[]`, synthetic `AuditTimeline` dari stage timestamps — satu set token `ois-*` + icon map + meta konsisten.

Timeline adalah **reader immutable** — tidak ada inline edit/delete dari sini. Write tetap lewat section masing-masing (Comments Composer untuk `comment_added`, StatusDropdown untuk `status_changed`, LinkCIModal untuk `ci_linked`, PromoteMajorModal untuk `promoted_major`, dst). File ini hanya define **rendering + merge + grouping + realtime** contract.

---

## Current State (snapshot `src/` + `server/`)

- **Incidents — primary implementation** (`src/routes/incidents/IncidentDetail.tsx:113-144`, `src/components/incidents/IncidentTimelineEntry.tsx:1-151`, `src/types/incident.ts:15-124`):
  - `IncidentTimelineEntry` render `flex gap-3` left dot `w-7 h-7 rounded-full border-2 bg-white` + vertical line `w-px bg-ois-border` + right `meta.label 12px semibold` + timestamp `formatDate HH:mm UTC · formatRelative`.
  - `ICON_MAP` 19→23 kinds (`src/components/incidents/IncidentTimelineEntry.tsx:13-37`) + `incidentEventKindMeta` color map (`src/lib/constants.ts:120-144`).
  - `IncidentDetail.tsx` filter `TIMELINE_FILTERS` 6 chips (`all/status_changed/comment_added/created/ci_linked/comms_posted`) + `SYSTEM_KINDS` 6 + `CI_LINKAGE_KINDS` 4, client-side filter di `filteredTimeline` (113-254).
  - War Room `src/routes/incidents/MajorIncidentWarRoom.tsx:142-224` reuse `incidentsService.timeline()` sebagai Activity Stream (35% col) + Comms Log `kind=comms_posted` (40% col), placeholder optimistic `MajorIncidentWarRoom.tsx:224`.
  - Realtime: `server/realtime.ts:73` `emitIncidentTimeline(tenantId, incidentId, entry)` → socket `tenant:{tenantId}` + `incident:{publicId}` (`src/services/realtime.ts`).

- **CMDB Audit — grouped variant** (`src/components/cmdb/CIAuditTimeline.tsx:11-45`, `src/components/cmdb/CIAuditEntry.tsx:24-79`, `src/types/ci.ts:168-183`, `server/repositories/cmdb.ts:19-64`):
  - `CIAuditTimeline` groups by `yyyy-MM-dd` (`date-fns format`) sorted `b.localeCompare(a)` desc, vertical rail `left-[15px] w-0.5 bg-ois-border opacity-50`, day header `text-[11px] uppercase tracking-widest`.
  - `CIAuditEntryCard` `flex gap-4` icon `w-8 h-8 border-2 border-white bg-ois-surface shadow-sm` + card `bg-white p-3 rounded-lg border border-ois-border shadow-sm` + diff block `before bg-red-50 line-through → after bg-emerald-50`.
  - `auditActionMeta` 7 actions (`src/lib/constants.ts:42-50`) + source 4 (`manual|discovery|api|deployment`) + actorType 3.
  - `CMDBAudit.tsx:81-100` filter `search(CI/actor/field)` + Action 8 + Source 4 + Date range cyclic `7d→30d→90d→all`.

- **Generic Audit — synthetic variant** (`src/components/common/AuditTimeline.tsx:16-67`):
  - `AuditEntry { id, timestamp, icon, iconColor, iconBg, actor, action, detail? }`, sorted `b.timestamp - a.timestamp` desc.
  - Layout `ol ml-4 border-l border-ois-border space-y-4 py-1` + dot `absolute -left-[34px] w-6 h-6 rounded-full ring-4 ring-ois-surface` colored `backgroundColor iconBg, color iconColor`.
  - Empty `No history yet.` italic `text-sm text-ois-text-subtle`.
  - Dipakai `ReleaseDetail.tsx:492` (created `FilePlus #1F4FD4/#EEF2FF`, stage start `Rocket #DC6803/#FEF0C7`, end `Check|X emerald/danger`, approval `CheckCircle2`, released `Package`) + `ChangeDetail.tsx:749` (created→cab→approvals→started→ended→PIR→closed).

- **Prisma** (`prisma/schema.prisma:325-345`, `444-454`): `CIAuditEntry` 7 cols indexed `tenantId+ciId` + `tenantId+timestamp`; `IncidentTimelineEvent` `id tenantId incidentId kind timestamp data:String` indexed `tenantId+incidentId`.

- **Belum ada:** virtual scroll, section collapse, cursor pagination, search within timeline, export CSV — semua Phase 2.

---

## Anatomy — Three Variants, One Contract

| Varian | Component | Data source | Sort | Layout | Dipakai |
|--------|-----------|-------------|------|--------|---------|
| **Incident** | `IncidentTimelineEntry.tsx` | `IncidentTimelineEvent` (`src/types/incident.ts:99-124`) via `incidentsRepo.timeline()` (`server/repositories/incidents.ts:121-133`) `timestamp asc`, UI bisa desc | newest last (chronological top→bottom di Detail, auto-scroll di War Room) | `flex gap-3` dot 28px border 2px colored + line 1px + right `meta.label` 12 semibold + `formatDate HH:mm UTC · formatRelative` 11 subtle + actor 12 muted + details block | `IncidentDetail` Timeline tab, `MajorIncidentWarRoom` Activity Stream |
| **CI Audit** | `CIAuditTimeline.tsx` + `CIAuditEntryCard` | `CIAuditEntry` (`src/types/ci.ts:168-183`) via `GET /cis/audit?ciId=` (`server/routes/cmdb.ts`) | desc by day `yyyy-MM-dd` group | grouped by date, rail `left 15px w-0.5`, day header `text-[11px] uppercase tracking-widest`, card `p-3 rounded-lg border shadow-sm`, diff arrow | `CMDBAudit` full, `CMDBDetail` Audit tab (filtered `ciId`, last 5 di Overview) |
| **Generic Audit** | `AuditTimeline.tsx` | synthetic `AuditEntry[]` derived dari `ReleaseStage`/`Change` timestamps (no DB table) | desc `newest first` | `ol ml-4 border-l border-ois-border` + dot `w-6 h-6 ring-4 ring-ois-surface` colored | `ReleaseDetail` History, `ChangeDetail` History, future `Availability` |

Semua varian share tokens (lihat §Design Tokens), gap `space-y-4` / `gap-3`, timestamp dual format, actor line, empty italic pattern.

---

## Event Types — IncidentTimelineEvent

`IncidentEventKind` (`src/types/incident.ts:15-38`) — **23 kinds** saat ini (evolusi dari 19 original `PROMPT-MVP-UI-OIS-Doc3a-IncidentProblem.md:50-68` → + `promoted_major|major_stood_down|linked|watcher_added|watcher_removed` di `M6.md:430` + `deployments.md`):

| kind | label (`incidentEventKindMeta`) | icon (`IncidentTimelineEntry.tsx:13`) | color | source / trigger |
|------|--------------------------------|--------------------------------------|-------|-----------------|
| `created` | Created | `Plus` | `#475467` | `IncidentTimelineEvent` synthesized saat create (`eventPublicId` di details) — always first |
| `assigned` | Assigned | `UserPlus` | `#0BA5EC` | `incidentsRepo.assign()` (`server/repositories/incidents.ts:325-368`) — `assigneeId→assigneeName` |
| `priority_changed` | Priority changed | `ArrowUpDown` | `#DC6803` | `incidentsRepo.update()` priority diff → `priority_changed` only when changed (`server/repositories/incidents.ts:541-593`) |
| `status_changed` | Status changed | `RefreshCw` | `#0BA5EC` | `incidentsRepo.setStatus()` (`:239-274`) + War Room status dropdown — `details.fromStatus→toStatus` |
| `comment_added` | Comment | `MessageCircle` | `#475467` | `incidentsRepo.addComment()` (`:194-233`) — appends `comment_added` timeline + `IncidentComment` |
| `ci_linked` | CI linked | `Link` | `#1F4FD4` | `setLinks` affectedCIIds diff (`:371-435`) |
| `ci_unlinked` | CI unlinked | `Unlink` | `#475467` | same `setLinks` removed |
| `problem_linked` | Problem linked | `Link` | `#6941C6` | `setLinks` linkedProblemId |
| `event_linked` | Event linked | `Radio` | `#0BA5EC` | `setLinks` triggeringEvent linkage |
| `sla_warning` | SLA warning | `AlertTriangle` | `#DC6803` | scheduler job `server/jobs/` emit `sla_warning` |
| `sla_breached` | SLA breached | `AlertOctagon` | `#B42318` | same job emit `sla_breached` |
| `escalated` | Escalated | `ArrowUpRight` | `#B42318` | status/escalation flow |
| `major_declared` | Major declared | `Siren` | `#B42318` | legacy major declare (pre-M6.11) |
| `comms_posted` | Communication | `Megaphone` | `#DC6803` | `incidentsRepo.postComms()` (`:653-695`) — `details.commsAudience internal|all_staff|customer + commsBody + channels` |
| `resolution_added` | Resolution | `CheckCheck` | `#067647` | pre-resolve note |
| `resolved` | Resolved | `CheckCircle2` | `#067647` | `incidentsRepo.resolve()` (`:135-189`) — stamps `resolution {summary,rootCause,workaround,resolvedAt,resolvedBy}` |
| `reopened` | Reopened | `RefreshCw` | `#DC6803` | status `resolved→new/triaging` + `reopenCount++` |
| `closed` | Closed | `XCircle` | `#475467` | `PATCH .../status closed` (requires `incident.close`) |
| `promoted_major` | Promoted to major | `Siren` | `#B42318` | `incidentsRepo.promoteMajor()` (`:276-323`) — `isMajor true + incidentCommander + majorDeclaredAt` |
| `major_stood_down` | Major stood down | `ShieldCheck` | `#067647` | `incidentsRepo.standDown()` (`:595-651`) — `isMajor false + priority P2 default + details.reason≥10` |
| `linked` | Links updated | `Link` | `#1F4FD4` | `setLinks` generic (added/removed IDs per field `ci/problem/change`) |
| `watcher_added` | Watcher added | `UserPlus` | `#475467` | `incidentsRepo.addWatcher()` idempotent `wasNew` (`:437-485`) |
| `watcher_removed` | Watcher removed | `UserMinus` | `#475467` | `incidentsRepo.removeWatcher()` throw `WATCHER_NOT_FOUND` (`:491-532`) |

Details schema (`src/types/incident.ts:106-123`): `{ fromStatus,toStatus,fromPriority,toPriority,assigneeId,assigneeName,ciPublicId,eventPublicId,problemPublicId,commsBody,commsAudience,channels,reason,actorId,actorName,note }`. Server memperluas dengan `commentId,isInternal,fromAssignee,commanderId` per repo (lihat `server/repositories/incidents.ts`).

**CIAuditEntry kinds** (`src/types/ci.ts:173`, `src/lib/constants.ts:42-50`): `created|updated|deleted|relationship_added|relationship_removed|status_changed|discovered` — 7 actions + `source manual|discovery|api|deployment` + `actorType user|system|integration`.

**Generic Audit kinds** (synthetic, `ReleaseDetail.tsx:192`): `created` `FilePlus`, stage start `Rocket`, end `Check|X`, approval `CheckCircle2`, released `Package` — colors `#1F4FD4/#EEF2FF` etc. bebas extend.

---

## Rendering per Event Type

### Incident — `IncidentTimelineEntry.tsx:48-114`

```
Left dot  Right content
w-7 h-7   label 12 semibold + timestamp 11 subtle (HH:mm UTC · relative)
border-2  actor 12 muted (italic if system)
color     details block below:
          status: fromStatus → toStatus (font-medium capitalize, → arrow)
          priority: P1 → P2 (font-mono font-semibold)
          assignee: Assigned to <name font-medium text-ois-text>
          ci/event/problem: font-mono text-ois-primary (ciPublicId 12)
          comms: bg-ois-surface-muted rounded p-2 border-l-2 border-amber-400 + audience badge (All staff/Customers/Internal : body)
          note: italic "…"
```

- `renderDetails()` guard `if !d return null`; stack `space-y-1 mt-1`.
- `isLast` controls vertical line: `{!isLast && <div w-px flex-1 bg-ois-border mt-1 />}`.
- Colors via `meta.color` inline `style={{ borderColor: meta.color }}` + `Icon style={{ color: meta.color }}` — jangan hardcode hex.
- Day grouping: **tidak ada** di Incident varian (flat chronological, filter chips untuk slicing). War Room auto-scroll ke bottom, new entries pulse briefly.

### CI Audit — `CIAuditEntry.tsx:24-79`

```
Icon 28px bg-ois-surface border-2 border-white shadow-sm  Card bg-white p-3 rounded-lg border-ois-border shadow-sm
       header: actorName bold 12 + meta.label medium subtle + [ciPublicId] font-mono bold ois-primary → /cmdb/:ciId + timestamp 10 bold subtle (formatRelative)
       updated field block (if action updated && field): bg-ois-surface-muted rounded-md p-2 border-ois-border + Field: field 10 uppercase bold subtle + before muted italic opacity-60 → ArrowRight 10 subtle → after bold text-ois-text
       description 12 muted leading-relaxed
       footer 10 bold subtle uppercase: Source: manual · Actor: user|system
```

- Grouped by date (`CIAuditTimeline.tsx:13-18`) — day header `pl-12` + dot `left 12px w-2 h-2 rounded-full border-2 bg-white` + `MMMM d, yyyy 11 bold uppercase tracking-widest`.

### Generic Audit — `AuditTimeline.tsx:33-66`

```
ol ml-4 border-l border-ois-border space-y-4 py-1
  li ml-6 relative
    dot absolute -left-[34px] w-6 h-6 rounded-full ring-4 ring-ois-surface style bg iconBg color iconColor + Icon 12
    actor semibold 14 + action muted 14 + detail 12 muted
    timestamp 11 subtle: formatRelative · MMM d, HH:mm (en-US month short, day numeric, hour 2-digit, minute 2-digit via toLocaleString)
```

---

## Day Grouping

- **Incident:** no day grouping Phase 1 — flat `timestamp asc` (repo) / newest last; War Room shows live stream, filter instead of group. Phase 2: share `lib/time-groups.ts` like `terra` (Today/Yesterday/This week/Last week/Explicit date `Apr 20, 2026` + sticky header).
- **CI Audit:** `yyyy-MM-dd` group desc, sorted `b.localeCompare(a)`, render `MMMM d, yyyy` per day (`CIAuditTimeline.tsx:20`).
- **Generic Audit:** no grouping Phase 1 — sorted desc, single list. Phase 2: day grouping optional.

First event synthesis: Incident `created` always last item (oldest); CI Audit `created` dari `CIAuditEntry` row; Generic Audit `created` dari `stages startedAt` + `actualReleaseDate`.

---

## Filter Chips

Incident `TIMELINE_FILTERS` (`IncidentDetail.tsx:113-120`):

```
[All] [Status] [Comments] [System] [CI / Linkage] [Comms]
  all   status_changed  comment_added  SYSTEM_KINDS           CI_LINKAGE_KINDS         comms_posted
                                   created,assigned,ci_linked,ci_unlinked,sla_warning,sla_breached
                                                         ci_linked,ci_unlinked,event_linked,problem_linked
```

Style `px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors` active `bg-ois-primary text-white border-ois-primary` else `bg-white border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` — reuse `docs/DESIGN-SYSTEM.md` §Filter Chips + `src/index.css` tokens.

CIAudit filters (`CMDBAudit.tsx:85-100`): Search (CI/actor/field) + Action 8 (`created … discovered`) + Source 4 (`manual/discovery/api/deployment`) + Date cyclic `7d→30d→90d→all` + count `text-xs muted`.

Generic Audit: no filter Phase 1.

Filtering adalah **client-side** pada array fetched; count badge di header update dynamic.

---

## Pagination & Collapse

- **Default:** timeline always visible; `events.length === 0` → empty state (lihat §Empty States).
- **Incident:** no pagination Phase 1 — `limit 50 offset 0` (`server/repositories/incidents.ts:121`), War Room shows full `incidentsService.timeline(incident.id)` via `useResource` + `src/services/realtime.ts` append. Large timelines (>50) Phase 2: cursor `?cursor=<timestamp>&limit=20` + infinite scroll threshold `200px` + bottom skeleton 3 rows (mirror `terra` §Pagination).
- **CI Audit:** paginated `?page&pageSize` + date range filter; grouped already desc.
- **Generic Audit:** no pagination (synthetic, <20 items).
- **Section collapse:** not yet — header `Timeline (N)` + count badge only. Phase 2: `[▼ Collapse]` toggle persist `sessionStorage timeline-collapsed-<entityId>` (terra §Pagination).

---

## Empty / Loading / Error States

| State | Incident (`IncidentDetail.tsx:130-144`) | CI Audit (`CMDBAudit.tsx` + `CIAuditTimeline`) | Generic Audit (`AuditTimeline.tsx:25-27`) |
|-------|----------------------------------------|------------------------------------------------|------------------------------------------|
| **Loading initial** | `p-8 text-sm text-ois-text-subtle Loading incident…` + timeline skeleton 8 rows shimmer; detail `SectionCard` placeholders | skeleton 5 entries + filter bar dim | `flex justify-center py-24 text-sm muted Loading…` via `useResource loading` |
| **Loaded empty** | `text-sm text-ois-text-subtle text-center py-8 No events match this filter.` (filtered) ; if no incident `Incident not found` + `Back to incidents` | `CheckCircle2 32 ois-text-subtle + No audit entries + Clear filters` ; `CMDBAudit` denied `ShieldAlert 36 red Cannot view audit` | `No release history yet.` / `No history yet for this change.` italic `text-sm text-ois-text-subtle` |
| **Error** | top banner `bg-ois-danger-pale text-ois-danger` + `Retry → refreshIncidents()` ; 404 → `NotFound` | silent empty via `data ?? []` ; no inline banner (deferred) | no banner Phase 1 (silent empty) |
| **Optimistic** | War Room `placeholder: IncidentTimelineEvent` + emit `emitIncidentTimeline` → detail append at top with `opacity 60% + spinner`; settle via `refreshTimeline()` | PATCH optimistic `setChange` then `refresh` revert on error (`CMDBDetail` pattern) | local `localStatus/localStages` then toast; no revert (gap) |

Tokens: `text-ois-text-subtle #98A2B3 12-14px italic center`, `bg-ois-danger-pale #FEF3F2`, empty icon `CheckCircle2 32-36`.

---

## Realtime & Cache Invalidation

- **Socket:** `server/realtime.ts:12-73` + `docs/design/09-realtime.md` — rooms `tenant:{tenantId}` (queue + audit) + `incident:{publicId}` (detail + war room). Emit `emitIncidentTimeline` setelah setiap `prisma.$transaction` di `incidentsRepo` (resolve, comment, status, promote, assign, setLinks, watcher, standDown, postComms).
- **Frontend:** `src/services/realtime.ts` subscribe `tenant:{tenantId}` + `incident:{publicId}`; `IncidentDetail.tsx:185-192` `useResource(() => incidentsService.timeline(incident.id))` + `src/services/*` invalidate `['entities', id, 'timeline']`.
- **Cache invalidation triggers (mirror terra §Cache invalidation):**

| Action | Invalidate |
|--------|------------|
| `resolve` / `setStatus` / `promoteMajor` / `standDown` | `['entities', id]` + `['entities', id, 'timeline']` |
| `addComment` / `postComms` | `['entities', id, 'timeline']` + `['entities', id, 'comments']` |
| `assign` / `setLinks` / `addWatcher`/`removeWatcher` / `update` priority | `['entities', id, 'timeline']` |
| CI `PATCH /cis/:publicId` | `['cis', id]` + `['cis', id, 'audit']` (`cmdb.ts` audit) |
| Phases: Goal/Checkpoint/Approval (future Change) | respective sub-resource + timeline |

- **Phase 1 fallback:** polling `refetchInterval: panelVisible && userIdle > 10_000 ? 30_000 : false` (terra §Realtime). Phase 2: SSE `GET /entities/:id/timeline/stream`.

---

## Edge Cases

1. **`actorId = 'system'`** — render italic `event.actorName` (Correlation Engine, SLA scheduler) tidak ada avatar (`IncidentTimelineEntry.tsx:141-145`). `CIAuditEntry actorType system|integration` badge.
2. **`by = null / deleted user`** — render `[deleted user]` italic muted (terra §Edge Cases #1) — rare karena soft-delete.
3. **Burst events** (10+ same user 1min) — Phase 1 render individual (terra §Edge Cases #3); Phase 2 collapse `6 quick edits by Sarah`.
4. **War Room no comms 30min** — banner `⏰ No comms posted in 28 minutes. Stakeholders expect updates every 30 min.` (`MajorIncidentWarRoom.tsx` spec).
5. **System-generated `sla_warning|breached`** — always `actorId system`.
6. **Soft-deleted comment** — `isInternal` preserved, filtered by permission (`incident.read`); not shown to reporter if internal.
7. **Link removed target still exists** — mini-card clickable → navigate; if soft-deleted → strikethrough + dim (terra §Edge Cases #8).
8. **Clock skew** — trust backend `timestamp` (server `new Date()`), no client re-sort (terra §Edge Cases #10).
9. **Very long `note|commsBody` 10k+** — `whitespace-pre-wrap` inside `bg-ois-surface-muted rounded p-2` — no nested scroll.
10. **Empty details** — `renderDetails()` returns `null` → only label + actor + timestamp.

---

## Layout — OIS Tokens

All timeline variants **wajib** pakai `ois-*` tokens (`src/index.css:7-33`, `docs/DESIGN-SYSTEM.md:50-90`) — no ad-hoc hex beyond kind palettes:

| Token | Value | Usage di timeline |
|-------|-------|-------------------|
| `ois-primary` | `#1F4FD4` | links `font-mono text-ois-primary`, active filter `bg-ois-primary`, tab indicator `border-ois-primary` |
| `ois-primary-pale` | `#EEF2FF` | avatar bg, active sidebar, created icon bg generic |
| `ois-bg` | `#F7F8FA` | page bg (`-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)`) |
| `ois-surface` | `#FFFFFF` | cards, modals, dot bg `bg-white` |
| `ois-surface-muted` | `#F1F3F7` | SectionCard header `bg-ois-surface-muted`, comms block `bg-ois-surface-muted`, hover `hover:bg-ois-surface-muted` |
| `ois-border` | `#E4E7EC` | all borders `border-ois-border`, rail `bg-ois-border`, divider |
| `ois-border-strong` | `#D0D5DD` | input borders, emphasis |
| `ois-text` | `#101828` | primary `text-ois-text`, label `font-semibold` |
| `ois-text-muted` | `#475467` | secondary `text-ois-text-muted`, details |
| `ois-text-subtle` | `#98A2B3` | placeholder, timestamp `text-ois-text-subtle`, empty |
| `ois-success` | `#12B76A` `pale #ECFDF3` | resolved, healthy, watcher `major_stood_down` |
| `ois-warning` | `#F79009` `pale #FFFAEB` | sla_warning, pending, escalated border |
| `ois-danger` | `#F04438` `pale #FEF3F2` | sla_breached, escalated, P1 stripe |
| `ois-info` | `#0BA5EC` `pale #F0F9FF` | triaging, assigned |

Radius `ois-card 8px` (`rounded-lg`), `ois-btn 6px`, `ois-badge 4px`, `ois-modal 12px`; font `Inter` body + `JetBrains Mono` IDs; scrollbar `4px #D0D5DD` (`src/index.css:62-84`).

---

## API Touchpoints

Ref: `docs/design/02-api-contract.md`, `server/routes/incidents.ts`, `server/routes/cmdb.ts`, `server/routes/itsm.ts:133-139` (releases).

| Operation | Endpoint | Hook / Service | Permission | Notes |
|-----------|----------|---------------|------------|-------|
| Load incident timeline | `GET /api/v1/incidents/:incidentId/timeline?page&pageSize` | `incidentsService.timeline(id)` → `apiFetch('/incidents/:id/timeline')` → `req.scoped.incidents.timeline(tenantId, internalId)` | `incident.read` (`requirePermission` via `server/app.ts:126`) | `server/repositories/incidents.ts:121-133` `orderBy timestamp asc` `take 50 skip offset` |
| Load incident comments | `GET /api/v1/incidents/:incidentId/comments` | `incidentsService.comments(id)` | `incident.read` | separate but timeline mirrors `comment_added` |
| Add comment (+ timeline) | `POST /api/v1/incidents/:incidentId/comments` `{body, isInternal, mentions, authorId}` | `incidentsRepo.addComment` | `incident.write` + audit | transaction `IncidentComment create + IncidentTimelineEvent comment_added` |
| Set status (+ timeline) | `PATCH /api/v1/incidents/:publicId/status` `{status}` | `incidentsService.setStatus` → `incidentsRepo.setStatus` | `incident.write` (rejects `resolved`) | `status_changed` event `from→to` |
| Resolve (+ timeline) | `POST /api/v1/incidents/:publicId/resolve` `{summary, rootCause?, workaround?}` | `incidentsService.resolve` → `incidentsRepo.resolve` | `incident.resolve` | stamps `resolution` + `resolved` kind |
| Promote major | `POST /api/v1/incidents/:publicId/promote-major` `{commanderId}` | `incidentsRepo.promoteMajor` | `incident.write` | `promoted_major` |
| Stand down | `POST /api/v1/incidents/:publicId/stand-down` `{reason≥10, newPriority?}` | `incidentsRepo.standDown` | `incident.write` | `major_stood_down default P2` |
| Post comms | `POST /api/v1/incidents/:publicId/comms` `{body,audience,channels}` | `incidentsRepo.postComms` | `incident.write` | `comms_posted` audience `internal|all_staff|customer` |
| Watchers | `POST /api/v1/incidents/:id/watchers` / `DELETE .../:userId` | `incidentsRepo.addWatcher/removeWatcher` | `incident.write` | idempotent `wasNew` 200 vs 201 |
| Set links | `PATCH /api/v1/incidents/:publicId/links` `{affectedCIIds,linkedProblemId,linkedChangeIds}` | `incidentsRepo.setLinks` | `incident.write` | single `linked` event diff `added/removed` |
| Update priority/tags | `PATCH /api/v1/incidents/:publicId` `{priority,tags}` | `incidentsRepo.update` | `incident.write` | `priority_changed` only when changed; tags silent |
| List CI audit | `GET /api/v1/cis/audit?ciId=&page&pageSize` | `cisService.audit` → `req.scoped.cmdb` (`server/routes/cmdb.ts`) | `cmdb.audit.read` (Dept Head+) → 403 else | `prisma.cIAuditEntry` indexed `tenantId+ciId` |
| Get CI | `GET /api/v1/cis/:publicId` | `cisService.get` | `cmdb.read` | tenant-scoped `req.scoped.cmdb.getCI` |
| List releases | `GET /api/v1/releases?page&pageSize` | `releasesService.list()` | `release.read` | synthetic audit dari `stages` |
| Get release | `GET /api/v1/releases/:publicId` | `releasesService.get` | `release.read` | same |
| Socket | `tenant:{tenantId}` + `incident:{publicId}` | `server/realtime.ts:emitIncidentTimeline` + `src/services/realtime.ts` | authed via `requireAuth` | queue + detail + war room subscribe |

All scoped via `req.scoped.*` (`server/scope/scopedDb.ts`) + `server/middleware/scopedDb.ts:19 withScopedDb` — **never import `prisma` in route files** (eslint `no-restricted-imports` `server/routes/**/*.ts`). `ScopeViolationError` → `403 {error:'scope_violation'}`.

---

## Design Preservation

Wajib pertahankan (dari `src/routes/incidents/`, `src/components/incidents/IncidentTimelineEntry.tsx`, `src/components/cmdb/CIAudit*`, `src/components/common/AuditTimeline.tsx`, `docs/pages/incidents.md:201-204`):

1. **Left rail pattern** — Incident `w-7 h-7 border-2 bg-white` dot + `w-px bg-ois-border` line (last hides); CI `left 15px w-0.5 bg-ois-border opacity-50 z-0`; Audit `ml-4 border-l border-ois-border` + `ring-4 ring-ois-surface` dot. Jangan ganti ke dark gradient.
2. **Dot color via `meta.color`** inline `style={{ borderColor / backgroundColor: meta.color }}` — konsisten `incidentEventKindMeta`, `auditActionMeta`, `stageStatusMeta`.
3. **Icon mapping** lucide `13-14px` per kind (`IconComponent size 13` Incident, 14 CI, 12 Audit) — `lucide-react` only.
4. **Timestamp dual format** `formatDate HH:mm UTC · formatRelative` (Incident 11px subtle) / `formatRelative · MMM d, HH:mm` (Audit) — selalu `text-ois-text-subtle`, `font-mono` untuk HH:mm.
5. **Filter chips** `rounded-full text-[11px]-xs font-medium` active `bg-ois-primary text-white border-ois-primary` else `bg-white border-ois-border text-ois-text-muted` (reuse `docs/DESIGN-SYSTEM.md` §Filter Chips).
6. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold uppercase tracking-widest text-ois-text-subtle` — dipakai CIAudit card juga `p-3 rounded-lg border`.
7. **Diff block** CI `before bg-red-50 border-red-200 text-red-700 line-through` → `ArrowRight 10 subtle` → `after bg-emerald-50 border-emerald-200 text-emerald-700` `font-mono text-xs rounded px-2 py-1`.
8. **Comms block** amber `bg-ois-surface-muted rounded p-2 border-l-2 border-amber-400` + audience `font-medium text-amber-700` (`IncidentTimelineEntry.tsx:96-103`).
9. **BlastRadiusBackdrop** subtle radial di `IncidentDetail` center column — jangan reintroduce dark overlay ke timeline.
10. **Empty italic** `text-sm text-ois-text-subtle italic py-8 text-center` — konsisten `AuditTimeline emptyLabel`.
11. **Tokens strictly ois-*** — no ad-hoc hex beyond kind/status palettes (`src/index.css:7-33`).

---

## Behavior Checklist (page adoption)

Page yang adopt timeline **wajib** cek:

- [ ] Render `IncidentTimelineEntry` / `CIAuditTimeline` / `AuditTimeline` tanpa re-merge — terima `events[]` as-is, group/filter client-side.
- [ ] Filter chips 6 Incident / 8+4 CI / none Generic — count badge update dynamic.
- [ ] Empty `italic subtle py-8` + Loading shimmer 5-8 rows + Error `bg-ois-danger-pale` + Retry.
- [ ] Socket subscribe `incident:{publicId}` / `tenant:{tenantId}` → optimistic append `opacity 60% + spinner` → `refetch`.
- [ ] Timestamp dual format `HH:mm UTC · relative` via `src/lib/format.ts:3-9`.
- [ ] Icon+color dari `incidentEventKindMeta` / `auditActionMeta` — no hardcode hex.
- [ ] Cross-ref ini di `features/<page>.md` — `Delegate ke _shared/entity-timeline.md`.

---

## Phase 2 Deferred

- **Virtual scroll** untuk >100 events (Change checkpoint padat 20-50+ — `react-virtual`) — terra §Edge Cases #4.
- **Cursor pagination** `GET .../timeline?cursor=<timestamp>&limit=20` + infinite scroll 200px threshold + bottom skeleton 3 rows.
- **Section collapse** `[▼ Collapse]` persist `sessionStorage timeline-collapsed-<entityId>` + day-group collapse.
- **Search within timeline** `Cmd+F` highlight + scroll-to (terra §Phase 2).
- **Export** CSV/markdown `Copy as postmortem stub` (terra §Phase 2).
- **Filter persist** per-user `localStorage` multi-select bitmask (terra §Filter).
- **Inline edit redirect** — Edit komén dari timeline hover `Edit` → scroll to `Comments` section + focus (terra §Comment Interaction).
- **Keyboard nav** `T` focus timeline, `↑↓` navigate, `Enter` navigate/link or expand, `Esc` exit (terra §Keyboard).
- **Version events** `entity_versions` snapshot → `version` kind (terra `2026-08-11` — skip v1) — belum di OIS (Changes/CMDB).
- **Cross-entity aggregate** activity feed per user/team/app (terra §Phase 2).
- **Realtime SSE** `GET /entities/:id/timeline/stream` replace 30s polling.
- **Day grouping unify** — adopt `lib/time-groups.ts` Today/Yesterday/This week/Last week/Explicit `Apr 20, 2026` sticky `text-[11px] uppercase tracking-widest bg-ois-surface-muted px-4 py-2` untuk Incident juga.

---

## Open Items

- [ ] `incidentsRepo.timeline` order `asc` vs `AuditTimeline` sort `desc` — align doc: Incident newest last (chronological) vs Audit newest first — konfirmasi UX apakah War Room butuh desc top.
- [ ] Verify `TIMELINE_FILTERS` `created` label System vs `SYSTEM_KINDS` includes `created+assigned+ci_*+sla_*` — gap vs `comment_added` separate.
- [ ] `CIAuditTimeline` vs `AuditTimeline` naming collision — `AuditTimeline` generic untuk Releases/Changes, `CIAuditTimeline` untuk CMDB — keep both, no rename.
- [ ] `server/routes/incidents.ts` export `GET /incidents/export` claimed di `features/incidents.md:117` — belum ada route (legacy `docs/pages/incidents.md`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep shared spec init — merge OIS `IncidentTimelineEntry` (`src/components/incidents/IncidentTimelineEntry.tsx:13-37`), `IncidentTimelineEvent` + `IncidentEventKind` 23 kinds (`src/types/incident.ts:15-38` + `src/lib/constants.ts:120-144`), `AuditTimeline` (`src/components/common/AuditTimeline.tsx:16-67`), `CIAuditTimeline`/`CIAuditEntry` (`src/components/cmdb/CIAuditTimeline.tsx` + `CIAuditEntry.tsx` + `src/types/ci.ts:168-183` + `server/repositories/cmdb.ts:19-64` + `prisma/schema.prisma:325-345,444-454` + `server/repositories/incidents.ts:121-695`), `ois-*` tokens (`src/index.css:7-33` + `docs/DESIGN-SYSTEM.md:50-90`), adaptasi `terra _shared/entity-timeline.md` (layout left rail/dot, day grouping Today/Yesterday/This week/Last week, merge contract, polling/SSE, link removal audit, version events, filter multi-select, keyboard) ke OIS — Used by Incidents/CMDB/Changes/Releases | — |
