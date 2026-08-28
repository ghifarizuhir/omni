# Entity Comments — Thread & Composer

Status: **Draft**
Used by: Incidents (`IncidentComment` + `IncidentCommentThread` + `IncidentComposer`), Service Requests (`RequestComment`), future entities (Changes, Problems) — via shared composer/thread pattern. Delegated from [`incidents.md`](../incidents.md#actions) and [`requests.md`](../requests.md#detail-view-center-tabs-detail) center `Comments` tab.

---

## Purpose

Single cross-cutting spec for **entity-scoped discussion** — a persistent threaded thread + bottom composer that lives inside the 3-column detail layout's center `Comments` tab. Menghindari duplikasi antara `IncidentComment` (rich, threaded, internal) dan `RequestComment` (flat, append-only) dengan mendefinisikan canonical render, composer, validation, and API contract; page docs cukup `Ref: _shared/entity-comments.md` dan bedakan divergence di §Variants.

Terra ref: `_shared/entity-comments.md` (composer + thread + mentions + attachments). OIS adaptasi: light palette `ois-*` (bukan terra monochrome dark), `font-mono` untuk `@mention`/code, no terra `linear-card`.

---

## Domain Types

### `IncidentComment` — rich, threaded (`src/types/incident.ts:126-138`)

```ts
export interface IncidentComment {
  id: string;
  incidentId: string;        // internal `Incident.id` (bukan `publicId`)
  authorId: string;
  authorName: string;        // resolved at write time — denormalized
  body: string;              // 1..10_000, markdown-lite (see §Rendering)
  isInternal: boolean;       // internal-only note (amber badge)
  mentions: string[];        // extracted @usernames, max 50
  attachments?: Array<{ id: string; name: string; size: number; mimeType: string }>;
  createdAt: string;         // ISO
  updatedAt?: string;
  parentCommentId?: string;  // one-level threading — reply parent
}
```

### `RequestComment` — flat, minimal (`src/types/request.ts:125-131`, `prisma/schema.prisma:543-552`)

```ts
export interface RequestComment {
  id: string;                // cuid() default
  authorId: string;
  authorName: string;
  body: string;              // 1..10_000 (via `requestCommentSchema`)
  createdAt: string;         // ISO — no updatedAt, no isInternal, no mentions, no parent
}
// Prisma: RequestComment { tenantId, requestId, authorId, body, createdAt } @@index([tenantId, requestId])
// ServiceRequest carries `comments?: RequestComment[]` + `commentCount` (embed fallback) + `watchers`
```

**Divergence rationale:** Incidents need war-room coordination (internal notes, threaded handoffs, SLA-adjacent comms split via `comms_posted` timeline — see `incidents.md:War Room`). Requests need lightweight fulfillment chatter + `pending_user` clarification; threading/internal not yet needed. Converge to `IncidentComment` shape when request needs internal notes (Phase 2).

---

## Behavior

### Thread — `IncidentCommentThread` (`src/components/incidents/IncidentCommentThread.tsx:14-143`)

- **Grouping:** `topLevel = comments.filter(!parentCommentId)`; `byParent: Record<string, IncidentComment[]>` built from `parentCommentId`. One level only — `depth 0` top + `depth 1` replies. No nested recursion beyond 1.
- **Order:** `GET .../comments` returns `orderBy: { createdAt: 'asc' }` (`server/repositories/incidents.ts:113-119`); thread renders top-level in that order, replies within parent also `asc` (insertion order). `RequestDetail` comments `resolvedComments = commentsData ?? []` rendered `asc` as single list (no grouping — `RequestDetail.tsx:775-833`).
- **Empty:** `topLevel.length===0` → `text-center py-12 text-ois-text-subtle` + `MessageCirclePlaceholder` `40x40 svg mx-auto text-ois-border-strong stroke-1.5 path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"` + `p text-sm mt-2 No comments yet. Start the discussion.` Requests variant: `MessageCircle 28 + No comments yet. text-sm text-ois-text-subtle py-8` (`RequestDetail.tsx:787-792`).

#### `CommentItem` (`IncidentCommentThread.tsx:14-108`) — per comment

```
flex gap-3
  Avatar name={authorName} size sm shrink-0 mt-0.5
  flex-1 min-w-0
    row: authorName text-sm font-semibold text-ois-text
         isInternal? <span inline-flex gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded><Lock 9/> Internal</span>
         timestamp ml-auto text-xs text-ois-text-subtle {formatRelative(createdAt)} via src/lib/format.ts:7-9 (date-fns formatDistanceToNow addSuffix)
         MoreHorizontal 14 text-ois-text-subtle p-1 rounded hover:bg-ois-surface-muted opacity-0 group-hover:opacity-100 transition-opacity
    p text-sm text-ois-text leading-relaxed {renderBody(body)}
    actions flex gap-3 mt-2: ThumbsUp 12 + count (local liked toggle) + Reply CornerDownRight 12 if depth===0
  replies? mt-3 space-y-3 map reply → <CommentItem depth=1>
  toggle: if replies.length>0 → button mt-2 ml-11 text-xs text-ois-primary hover:underline `Hide N repl(y|ies)` / `Show N repl(y|ies)`
```

- **Thread indent:** `depth>0 && ml-8 pl-4 border-l-2 border-ois-border` (`cn` conditional `IncidentCommentThread.tsx:46`). No avatar nesting beyond one indent.
- **Rendering `renderBody` (`:18-43`):**
  - `@mentions`: `body.split(/(@\w+(?:\.\w+)*)/g)` → `span text-ois-primary font-medium bg-blue-50 px-0.5 rounded` for parts starting with `@`. Extraction for `mentions[]` happens server-side (schema `mentions?: string[] max 50`); client highlights speculatively.
  - Inline code: if part contains `` ` `` → split `` /(`[^`]+`)/g `` → code `bg-ois-surface-muted text-ois-text font-mono text-[11px] px-1 py-0.5 rounded` for `` `...` `` segments, else plain `span`.
  - No block markdown, no linkify, no sanitizer beyond these two passes (keep lite — full markdown is portal/KB concern).
- **Request comment render (`RequestDetail.tsx:793-817`):**
  - Container `bg-ois-surface-muted border border-ois-border rounded-lg px-3 py-2.5` per comment
  - Row `text-xs font-semibold authorName` + `text-[10px] text-ois-text-subtle formatRelative(createdAt)`; body `text-sm text-ois-text break-words whitespace-pre-wrap`; no internal badge, no threading, no like/reply.

### Composer

#### Incident — `IncidentComposer` (`src/components/incidents/IncidentComposer.tsx:28-96`)

- **Placement:** persistent bottom composer in center `Comments` tab (`IncidentDetail.tsx:607` siblings `IncidentCommentThread`). Card `rounded-[8px] border border-ois-border bg-white overflow-hidden`. Requests: inline composer at bottom of comments list within same tab; not persistent across tabs (`RequestDetail.tsx:818-833`).
- **Header chips row:** `flex gap-1.5 px-3 py-2 border-b border-ois-surface-muted bg-white` + `CHIPS` (`:17-21`): `/status` `insert '/status '` hint `change status`, `/page` `'/page '` hint `page on-call`, `/link CI` `'/link CI '` hint `attach a CI`. Each `button px-2 py-0.5 rounded border border-ois-border bg-ois-surface-muted font-mono text-[11px] text-ois-text-muted hover:bg-white hover:text-ois-text`. Click `useChip` appends `insert` to `value` (with space if non-empty) + `inputRef.focus()`. Right `span ml-auto font-mono text-[10px] text-ois-text-subtle ⌘↵ to post`.
- **Input:** `textarea ref inputRef rows 2 value onChange onKeyDown placeholder "Post an update or run a slash command…" w-full px-3 py-2 outline-none resize-none text-[13px] text-ois-text placeholder:text-ois-text-subtle disabled: submitting`. `onKeyDown` `⌘↵ / Ctrl+Enter → submit()`.
- **Submit (`:38-52`):** `body=trim(value)`, guard `!body || submitting`, `setSubmitting(true)`+`setError(null)`, `await incidentsService.addComment(incidentId, { body, isInternal:false })`, on success `setValue('')` + `onPosted?.()` (parent refetches timeline/comments), on catch `setError(e.message|'Failed to post update')`, finally `setSubmitting(false)`. Note: `isInternal` hardcoded `false` in current composer — internal toggle is detail-tab control outside composer (see `incidents.md:Detail Center tabs Comments (internal toggle)`).
- **Error:** `div px-3 py-1.5 text-[12px] text-ois-danger border-t border-ois-surface-muted` if `error`.

#### Request — inline composer (`RequestDetail.tsx:818-833`)

- `textarea rows 3 border border-ois-border-strong rounded-lg focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary text-sm p-3 placeholder:text-ois-text-subtle` with local `commentBody` state; `Send 12 Post comment` button `bg-ois-primary text-white rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-40` calls `requestsService.addComment(publicId, body)` → `refetchComments()` → `setCommentBody('')`. No slash chips, no `⌘↵`, no internal flag. Button disabled if `!body.trim()`.

### Mentions & Related Interactions

- **Mentions storage:** `IncidentComment.mentions: string[] max 50` (`src/shared/schemas/incident.ts:25`) passed through `POST` and stored in comment JSON; not yet wired to notification delivery (`incidents.md:Stub mentions[] disimpan tapi notification delivery belum end-to-end`). Render highlights via regex; no autocomplete dropdown yet.
- **Slash commands:** chips insert literal `/status `/`/page `/`/link CI ` text; interpretation is downstream (likely war-room/comms or status transition) — composer does not parse; server treats as plain comment body today.
- **Internal comments:** `isInternal` boolean (`addIncidentCommentSchema` default `false`); thread shows amber `Internal` badge with `Lock 9` (`IncidentCommentThread.tsx:52-57`). Toggle lives at tab level per `incidents.md`; composer currently posts `isInternal:false` — extend to bind tab toggle to composer payload.
- **Attachments:** `IncidentComment.attachments?: Array<{id,name,size,mimeType}>` typed but not rendered in `CommentItem`; stub for Phase 2 file upload (see `_backlog` file_upload).

---

## Validation & Permissions

| Entity | Schema | Body | Extra | Permission | Scope |
|--------|--------|------|-------|------------|-------|
| Incident | `addIncidentCommentSchema` (`src/shared/schemas/incident.ts:22-26`) | `z.string().min(1, 'Comment cannot be empty').max(10_000)` | `isInternal: z.boolean().default(false)`, `mentions: z.array(z.string()).max(50).optional()` | `incident.write` (`requirePermission('incident.write')` `server/routes/incidents.ts:60`) | `tenantId + incidentId` via `req.scoped.incidents.addComment` + `ScopeViolationError → 403 { error:'scope_violation' }` |
| Request | `requestCommentSchema` inline (`server/routes/itsm.ts:217`) | `z.object({ body: z.string().min(1).max(10_000) })` | — | `request.write` (`requirePermission('request.write')` `server/routes/itsm.ts:221`) | `tenantId + publicId` verify via `scoped.serviceRequests.get` 404 before write |

- **Zod issues → 400** `{ message:'Validation failed', issues }` via global error handler (`server/app.ts:126`).
- **Auth:** all `requireAuth` (`server/app.ts:126`) — missing session → 401. `getActor(req)` resolves `authorId/authorName` server-side; client never sends author.
- **Idempotence:** none — each POST creates a new comment (`randomUUID()`). Retry creates duplicate; client should debounce `submitting`.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) §Resource routers.

### Incidents

| Hook | Endpoint | Method | Permission | Req | Res | Notes |
|------|----------|--------|------------|-----|-----|-------|
| `incidentsService.comments(id)` | `/api/v1/incidents/:incidentId/comments?page=&pageSize=` | GET | `incident.read` | `parsePagination` default `limit 50 offset 0` (`server/routes/incidents.ts:46-48`) | `IncidentComment[]` ordered `createdAt asc` | `incidentId` is internal `id` (not `publicId`) |
| `incidentsService.addComment(id,input)` | `/api/v1/incidents/:incidentId/comments` | POST | `incident.write` | `AddIncidentCommentInput { body 1..10k, isInternal bool, mentions? }` + server `authorId/authorName` via `getActor(req)` (`:62-70`) | `201 IncidentComment` | Also creates `comment_added` timeline event + `audit { action:'comment', resourceKind:'Incident', scopeMode }` (`:72-79`) |

Client via `src/services/incidentsService.ts:47,65-66` → `apiFetch` with `method/method:POST body:input`.

Repo: `server/repositories/incidents.ts:194-233` `addComment(tenantId,incidentId,input)` → `prisma.incident.findFirst({ tenantId, id: incidentId })` 404 if missing, builds `IncidentComment` with `randomUUID()`, `now ISO`, `mentions ?? []`, then `prisma.$transaction([ incidentComment.create({ id, tenantId, incidentId, data: JSON.stringify(comment), createdAt: now }), incidentTimelineEvent.create({ kind:'comment_added', timestamp: now, data: JSON.stringify({id, kind:'comment_added', actorId, details:{commentId:id,isInternal}}) }) ])`.

List: `comments(tenantId,incidentId,pagination)` → `prisma.incidentComment.findMany({ where:{tenantId,incidentId}, orderBy:{createdAt:'asc'}, take, skip })` → `parseObj<IncidentComment>(r.data)`.

### Requests

| Hook | Endpoint | Method | Permission | Req | Res | Notes |
|------|----------|--------|------------|-----|-----|-------|
| `requestsService.comments(publicId)` | `/api/v1/requests/:publicId/comments?page=&pageSize=` | GET | `request.read` | `required(await scoped.serviceRequests.get) 404` then `listComments` (`server/routes/itsm.ts:166-171`) | `RequestComment[]` (`RequestComment` Prisma rows) | Uses `publicId` (external), not internal `id` |
| `requestsService.addComment(publicId,body)` | `/api/v1/requests/:publicId/comments` | POST | `request.write` | `{ body 1..10_000 }` (`:217` schema) + server `getActor` (`:224`) | `201 RequestComment & { dbId }` (`:234 { ...comment, dbId: dbCommentId }`) | Via `appendComment` + `audit comment` `resourceId internalId` (`:227-233`) |

Client via `src/services/itsmServices.ts:85-91` → types `RequestComment` from `src/types`.

Persistence split:
- `IncidentComment` → dedicated `IncidentComment` table (`prisma/schema.prisma:433-442` `{ id, tenantId, incidentId, data String JSON, createdAt } @@index([tenantId,incidentId])`, `Incident.comments IncidentComment[]`) + `IncidentTimelineEvent` `comment_added` row. Transaction guarantees comment + timeline atomically.
- `RequestComment` → dedicated `RequestComment` table (`prisma/schema.prisma:543-552` `{ id cuid, tenantId, requestId, authorId, body, createdAt } @@index([tenantId,requestId])`) **plus** embed in `ServiceRequest.data JSON` (`comments?: RequestComment[]` + `commentCount`) for reads without join (migration `20260515061047_add_request_comments`). `listComments` queries table; `appendComment` writes both table + JSON append (see `server/repositories/docs.ts:328-357`).

Pagination: both read via `server/lib/pagination.ts` `parsePagination(req.query) → { limit offset }` (default 50). No cursor; `page&pageSize` query.

Errors: `ScopeViolationError → 403 { error:'scope_violation' }` (`server/scope/errors.ts:9`); `ValidationError issues → 400`; missing parent → 404 `Incident/Request not found`; `ScopeViolationError` always 403 via global handler (`server/app.ts`).

---

## Variants & When to Use Which

| Concern | Incident (`IncidentComment`) | Request (`RequestComment`) |
|---------|------------------------------|----------------------------|
| Threading | One-level `parentCommentId` + collapsible `Show/Hide N replies` + indent `ml-8 pl-4 border-l-2 border-ois-border` | Flat — no parent, single list |
| Internal | `isInternal` + amber `Lock Internal` badge | No — all comments visible to requester |
| Mentions | `mentions[] max 50` + highlight `text-ois-primary bg-blue-50` + `code` inline `bg-ois-surface-muted font-mono 11px` | No |
| Composer | Persistent bottom + slash chips `/status /page /link CI` + `⌘↵` | Inline `rows 3` + `Send` button, no chips |
| Attachments | Typed `attachments?` (stub) | No |
| Likes/Reply actions | Local `ThumbsUp` toggle + `Reply`/`MoreHorizontal` hover | No |
| Timeline coupling | Creates `comment_added` timeline event in same transaction | No timeline coupling — comments are standalone |

New entities (Changes, Problems) should start from Request flat variant; promote to Incident richness when coordination needs arise. Do not add bespoke comment components per entity — extend this shared thread/composer.

---

## Empty / Loading / Error

- **Empty thread:** incident `text-center py-12 text-ois-text-subtle` + `MessageCirclePlaceholder 40` + `No comments yet. Start the discussion.` (`IncidentCommentThread.tsx:123-130`); request `MessageCircle 28 + No comments yet. text-sm text-ois-text-subtle py-8` (`RequestDetail.tsx:787-792`). Both live in center `Comments` tab; composer still visible below empty.
- **Loading:** incident detail lazy `useState<IncidentComment[]>([])` + fetches `incidentsService.comments(publicId)` on tab mount; request `requestsService.comments(publicId)` lazy by `reqPublicId` (`RequestDetail.tsx:579-592`) with no skeleton yet — shows empty transiently then fills. Consider `ois-shimmer-text`/`SectionCard` skeleton for consistency with detail page.
- **Error:** composer inline `text-[12px] text-ois-danger border-t` (`IncidentComposer.tsx:92-93`) with `Failed to post update`; request `text-xs text-ois-danger` on cancel/reassign/addWatcher only — comment add currently `console.error` without inline banner (align to incident error slot). Retry: `onPosted`→ `refresh`/`refetchComments()`; 401 → login redirect via `apiFetch`; 400 shows `issues`; 404 `Incident/Request not found` → `NotFound` page; 403 `scope_violation`.
- **Validation inline:** schema `min 1 / max 10_000` → 400 `issues`; client guards empty `!body.trim()` disabling submit. No char counter yet — add `M/N` for 10k when body length >80% (Phase 2).

---

## Edge Cases

- **Cross-tenant leak:** `req.scoped` + global `requireAuth` (`server/app.ts:126`) guarantees `tenantId` — raw `prisma` import banned in routes (`eslint no-restricted-imports` on `server/routes/**/*.ts` — `AGENTS.md:API Conventions`). All comment queries filter `tenantId`.
- **Internal id vs publicId mismatch:** incident comments address by **internal** `incidentId` (`POST /incidents/:incidentId/comments`) while most incident routes use `publicId`. Caller must pass `incident.id` from `get` payload, not `publicId`. Request comments use `publicId` — document divergence in caller.
- **Empty parentCommentId:** falsy → top-level. Orphan `parentCommentId` pointing to non-existent id groups under missing parent and never renders (byParent lookup misses). Treat as top-level fallback or filter orphans in thread grouper.
- **Mentions drift:** client regex `/@\w+(?:\.\w+)*/g` highlights but server `mentions[]` is authoritative. If body edited to remove `@name`, old `mentions` persists in JSON until re-parse on update (no update endpoint today).
- **Concurrent post race:** two composers posting simultaneously both succeed (no dedup). `Like` is local state only (`useState`) — not persisted.
- **Body length boundary:** exactly 10_000 chars passes; 10_001 → 400. Consider truncation warning in composer at 9_500.
- **Audit scopeMode:** incident comment `audit` includes `scopeMode` from `req.scoped` wrapper; request comment `scopeMode` likewise. Verify `audit` row has `resourceKind Incident|ServiceRequest` + `action comment`.
- **Request embed vs table drift:** `RequestComment` has dual write (table + JSON `ServiceRequest.comments`); `listComments` reads table only — embed is fallback for legacy reads. Migration must reconcile counts (`commentCount`).

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/components/incidents/IncidentCommentThread.tsx` + `IncidentComposer.tsx` + `src/routes/requests/RequestDetail.tsx:775-833` + `src/index.css`):

1. **Tokens only `ois-*`** — no raw hex. `ois-primary #1F4FD4` (mentions `text-ois-primary bg-blue-50`, `Show replies` link `text-ois-primary`), `ois-surface/#FFFFFF` + `ois-surface-muted #F1F3F7` (inline code `bg-ois-surface-muted`, composer chip `bg-ois-surface-muted`, request comment card `bg-ois-surface-muted`), `ois-border #E4E7EC` (thread indent `border-l-2 border-ois-border`, composer `border-ois-border`, cards), `ois-border-strong #D0D5DD` (request textarea `border-ois-border-strong`), `ois-text #101828` (author `font-semibold`, body `text-ois-text`), `ois-text-muted #475467`, `ois-text-subtle #98A2B3` (timestamps `text-ois-text-subtle` + `formatRelative`), `ois-danger #F04438` (error `text-ois-danger`), `ois-success/warning/info pale` for future internal vs public tint. Radius `rounded-[8px]` card, `rounded-lg` avatar/comment card, `rounded-full` pills. Shadow `shadow-ois-dropdown` for popovers (More menu).
2. **Thread indent:** `ml-8 pl-4 border-l-2 border-ois-border` for `depth>0` (`IncidentCommentThread.tsx:46`); don't replace with card nesting or avatar chain.
3. **Internal badge:** `inline-flex gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded` + `Lock 9` (`:52-57`). Keep amber (warning pale) distinct from `ois-warning #F79009` — internal is not SLA warning.
4. **Mention highlight:** `text-ois-primary font-medium bg-blue-50 px-0.5 rounded` (`:23`). Don't change to `ois-primary-pale #EEF2FF` — mention needs blue-50 contrast per OIS thread.
5. **Inline code:** `bg-ois-surface-muted text-ois-text font-mono text-[11px] px-1 py-0.5 rounded` (`:31`). Monospace is `Geist Mono` via `font-mono` (`src/index.css:4`).
6. **Avatar:** `Avatar name size sm shrink-0 mt-0.5` (`:48`) — initials on `bg-ois-primary-pale`, not photo.
7. **Timestamp:** `text-xs text-ois-text-subtle ml-auto` + `formatRelative()` (`:58-60`, `src/lib/format.ts:7-9`). Keep `addSuffix` (`3 min ago`) not `MMM d`.
8. **Actions hover reveal:** `MoreHorizontal 14` inside `opacity-0 group-hover:opacity-100` + `hover:bg-ois-surface-muted` (`:61-63`); `ThumbsUp 12` + `CornerDownRight 12 Reply` (`:70-84`); request sends `Send 12` inside `Post comment`.
9. **Composer chrome:** incident `rounded-[8px] border border-ois-border bg-white overflow-hidden` + chips `font-mono text-[11px] border-ois-border bg-ois-surface-muted` `hover:bg-white` + hint `⌘↵ to post font-mono text-[10px] text-ois-text-subtle ml-auto` (`IncidentComposer.tsx:67-81`); textarea `rows 2 text-[13px] placeholder:text-ois-text-subtle` (`:82-91`). Request `rows 3 border-ois-border-strong focus:ring-ois-primary/20 focus:border-ois-primary` + `rounded-lg`.
10. **Empty state:** `text-center py-12 text-ois-text-subtle` + `40x40 MessageCirclePlaceholder path M21..` `text-ois-border-strong` + `text-sm mt-2 No comments yet.` — don't swap for illustration.

11. **Motion:** no animate on comment insert; `transition-opacity` on hover only. Respect `prefers-reduced-motion` for any future enter animation.

12. **Icons:** `lucide-react` only (`ThumbsUp, CornerDownRight, MoreHorizontal, Lock, MessageCircle, Send`) sizes `9|12|14|28|40` per spec — no mix.

---

## API Touchpoints (summary)

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) + `server/app.ts`.

```
GET  /api/v1/incidents/:incidentId/comments?page=&pageSize=   → IncidentComment[] (asc)
POST /api/v1/incidents/:incidentId/comments                    → IncidentComment 201 ( + comment_added timeline + audit)

GET  /api/v1/requests/:publicId/comments?page=&pageSize=       → RequestComment[] 
POST /api/v1/requests/:publicId/comments                       → RequestComment 201 & {dbId}

All behind requireAuth + requirePermission('incident|request.write' for POST) + req.scoped.* + ScopeViolationError→403.
Validate via src/shared/schemas/incident.ts:addIncidentCommentSchema (body 1..10k, isInternal default false, mentions max 50)
and server/routes/itsm.ts:requestCommentSchema (body 1..10k).
```

Client: `incidentsService.comments/addComment` (`src/services/incidentsService.ts:47,65-66`), `requestsService.comments/addComment` (`src/services/itsmServices.ts:85-91`). Realtime not yet for comments — detail subscribes `tenant:{tenantId}` + `incident:{publicId}` via `src/services/realtime.ts` (incidents) but not requests.

---

## Phase 2 Deferred

- **Threading parity for requests:** promote `parentCommentId` + collapsible replies when fulfillment needs handoff.
- **Internal/private toggle for requests:** bind to future `isInternal` field; respect `request.read own vs all` visibility.
- **Mention autocomplete:** `@` triggers user picker (search `usersService.list()`), insert `@name` + append to `mentions[]`; notify via `inbox`/realtime.
- **Attachment upload:** `attachments[]` + `file_upload` field type to storage (backend + `src/shared/schemas` + UI preview). Align with `_backlog` file upload.
- **Full markdown + sanitization:** block code, lists, links with `linkifyEntities` like inbox; sanitize before render.
- **Edit/delete own comment:** `PATCH/DELETE /.../comments/:commentId` gated `authorId===user.id` or `incident.write`; add `updatedAt` + `edited` label.
- **Char counter + limits UX:** show `N/10 000` when >8_000, warn at 9_500, block at 10_000.
- **Realtime fan-out:** `incident:{publicId}` / `request:{publicId}` socket push on `comment_added` for live thread without `refetchComments()`.
- **Persisted likes/reactions:** move `ThumbsUp` count to server (`comment_reactions` table) + optimistic update.
- **Pagination UI:** `Load more` / infinite scroll for `page&pageSize` when thread >50.
- **Search within thread:** filter body + highlight query like `KBBrowse`.

---

## Open Items

- [ ] Confirm incident `POST .../comments` should stay on internal `incidentId` vs migrate to `publicId` for consistency with `requests` (router uses `:incidentId` today — `ScopedIncidents` resolves by `id` not `publicId`).
- [ ] Wire `IncidentComposer` `isInternal` to tab toggle — currently hardcoded `false` (`IncidentComposer.tsx:44`) so internal notes require separate flow.
- [ ] Decide `mentions` extraction server vs client regex; ensure `mentions` array is re-derived on body edit (no update endpoint yet).
- [ ] Verify dual-write `RequestComment` table + `ServiceRequest.data.comments` stays consistent after `20260515061047` migration — which is source of truth for `GET`?
- [ ] Validate 404 vs 403 mapping for `scope_violation` on comments — `server/routes/incidents.ts:71` throws `Incident not found` (404) even on tenant mismatch; scope layer should surface 403 first.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init shared `entity-comments` — IncidentCommentThread/Composer + RequestComment divergence + thread/composer/validation/API/persistence spec from OIS sources + ois-* tokens | — |

