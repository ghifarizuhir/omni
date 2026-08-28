# 09 — Realtime

Status: **Draft**
Depends on: [`02-api-contract.md`](./02-api-contract.md), [`03-architecture.md`](./03-architecture.md)
Source of truth: [`server/realtime.ts`](../../server/realtime.ts), [`src/services/realtime.ts`](../../src/services/realtime.ts), [`server/index.ts`](../../server/index.ts), [`server/routes/events.ts`](../../server/routes/events.ts), [`server/jobs/`](../../server/jobs/)

---

## Overview

OIS uses **Socket.IO 4** — not SSE. Terra (`../terra-service-management/docs/design/09-realtime.md:32` — Transport: SSE) chose `EventSource` + `POST /auth/stream-ticket` (opaque 60 s ticket, `stream_tickets` table) because its mutations are all REST and server→client is one-way. OIS diverges: War Room (`src/routes/incidents/MajorIncidentWarRoom.tsx:353` `incident:subscribe`) needs bidirectional room join/leave plus inbox push, so the gateway semantics and `incident:{id}` targeting map more cleanly to Socket.IO rooms.

Gateway lives in `server/realtime.ts:28` `initRealtime(server)` and is attached to the **same** `http.createServer(app)` that serves the REST API (`server/index.ts:18` `const server = http.createServer(app)` → `server/index.ts:19` `initRealtime(server)`). There is no separate realtime process or `GET /events?ticket=` endpoint. Path is `/api/v1/socket` (`server/realtime.ts:30` `path: '/api/v1/socket'`, `src/services/realtime.ts:28` same `path`, `withCredentials: true` at `src/services/realtime.ts:29`). CORS is `origin:true, credentials:true` at `server/realtime.ts:32` so the Vite proxy (`VITE_API_PROXY_TARGET` → `:3001`) and direct `ws://host:3001/api/v1/socket` both work; Helmet CSP allowlists `ws:`/`wss:` at `server/app.ts:49` `connect-src` (`'ws:'`, `'wss:'`).

Scheduler is **in-process by default**. `server/jobs/queue.ts:17` `startScheduler()` runs on every API boot unless `API_ONLY=true` (`server/index.ts:23` `if (process.env.API_ONLY !== 'true')`). The separate binary `server/worker.ts:20` `startScheduler()` runs the same job set without binding HTTP — the deploy matrix is `API (API_ONLY=true) + worker` vs single combined process in dev.

```
REST                → Express app (server/app.ts:33 createApp, :126 requireAuth global)
Realtime            → IOServer on same http.Server (server/realtime.ts:29, server/index.ts:19)
Jobs                → in-process queue (server/jobs/queue.ts:17) or worker (server/worker.ts:20)
Client              → src/services/realtime.ts:25 getSocket() + :66 useRealtime hook
```

---

## Channels

Tenant filtering is **never optional** — `server/realtime.ts:64` `emitEventCreated`, `:67` `emitEventUpdated`, `:70` `emitInbox`, `:73` `emitIncidentTimeline` all call `io.to(room(tenantId, …))` / `` `tenant:${tenantId}:incident:${incidentId}` ``. There is no `io.emit` / `io.to(all)` broadcast in the codebase. See also `server/realtime.ts:26` `room()` helper `(tenantId, stream) => tenant:${tenantId}:${stream}`.

| Channel | Event | Producer `file:line` | Consumer component | Payload shape |
|---------|-------|----------------------|--------------------|---------------|
| `tenant:{id}:events` | `event:created` | `server/routes/events.ts:118` `emitEventCreated(req.tenantId, created)` (after `scoped(req).events.ingest` + `audit`) → `server/realtime.ts:65` `io.to(room(tenantId,'events')).emit('event:created', event)` | `src/routes/monitoring/EventStream.tsx:31` `useResource(() => eventsService.list())` (target) — `docs/audits/realtime-coverage.md:58` currently **no** `useRealtime` subscription; planned `useRealtime('event:created', refetchList)` | `Event` (`src/types`: `publicId`, `severity: P1..P4`, `status`, `type`, `source`, `firedAt`, `affectedCIPublicIds`, `correlationKey`, `payload`, `tags`) — full entity emitted today; spec says future may emit `publicId+kind` only and client fetches detail via REST |
| `tenant:{id}:events` | `event:updated` | `server/realtime.ts:67` `emitEventUpdated` (helper exists, no route calls it yet — reserved for status ack/suppress flow `PATCH /events/:publicId/status` `server/routes/events.ts:49`) | Same as above | `Event` (same shape, `status` changed) |
| `tenant:{id}:inbox` + `tenant:{id}:inbox` | `inbox:item` | `server/realtime.ts:70` `emitInbox(tenantId, item)` stub — no route invokes it yet; future upstreams: incident assign/SLA/mention, change/request approval, KB review (`docs/features/inbox.md:59`); REST readers today are `server/routes/platform.ts:221` `GET /inbox` and `:224` `GET /inbox/items` | `InboxDrawer` / `src/routes/inbox/*` — `src/services/realtime.ts:19` `inbox:item` typed in `ServerToClient`; `docs/audits/realtime-coverage.md:103` — fetches once via `useResource`, no socket subscription yet | `InboxItem` (`id`, `kind`, `title`, `publicId`, `tenantId`, `createdAt`) |
| `tenant:{id}:incident:{incidentId}` | `incident:timeline` | `server/realtime.ts:73` `emitIncidentTimeline(tenantId, incidentId, entry)` — called from `server/repositories/incidents.ts` after each `prisma.$transaction` (comment, status, promote, assign, `setLinks`, watcher, standDown, `postComms` per `docs/features/_shared/entity-timeline.md:201`) — route surface in `server/routes/incidents.ts:58` comments, `:84` status, `:110` resolve, `:136` promote-major, `:161` stand-down, `:187` comms, `:212` generic patch, `:237` assign | `src/routes/incidents/IncidentDetail.tsx:185` timeline `useResource(() => incidentsService.timeline(incident.id))` + `src/routes/incidents/MajorIncidentWarRoom.tsx:141` same + `ActivityStream` / `CommunicationLog` — target: `realtime.subscribeIncident(incidentId)` (`src/services/realtime.ts:49`) + `realtime.on('incident:timeline')` (`:17` `ServerToClient['incident:timeline']`) | `IncidentTimelineEvent` (`id`, `incidentId`, `kind: 'created'|'status_changed'|'comment_added'|'assigned'|'ci_linked'|'promoted_major'|'comms_posted'|'sla_warning'|…`, `actorId`, `actorName`, `timestamp`, `details: { commsAudience?, commsBody?, … }`) |
| `cmdb:change` (future) | `cmdb:updated` / `ci.dependency_*` (planned) | `server/routes/cmdb.ts:40` `PATCH /cis/:publicId` (no emit today) — planned `emitCmdbChange(tenantId, ci)` analogous to `server/realtime.ts:64` pattern | `src/routes/cmdb/*` graph/detail — currently poll on mount only | `CI` delta (`publicId`, `changedFields`, `health`, `type`) |
| `jobs:*` (internal) | `jobs:tick` (`sla-breach-detector`) | `server/jobs/index.ts:10` `defineJob({ name:'sla-breach-detector', intervalMs:60_000, fn:… })` driven by `server/jobs/queue.ts:17` `startScheduler()` (`setInterval` at `:27`) | No direct consumer — job writes `prisma.incident.data.slaResolveStatus='breached'` (`server/jobs/index.ts:34`) which is then observable via next `incidents:list` poll or future `incident:timeline` `sla_breached` emit | — (system write, not a socket event; if promoted to push it would be `incident:timeline` `kind:'sla_breached'`) |
| `notifications` (planned) | `notification:item` (not yet) | `server/routes/platform.ts:210` `GET /notifications` read-only via `documents` `kind:'notification'`; `docs/features/notifications.md:72` — dispatcher + TTL cleanup not wired; `server/realtime.ts` has only `inbox:item`, no `notification:item` | Notification bell / feed — currently fetch-once | `Notification` (`publicId`, `channel: email|sms|slack`, `quietHours`) |

> Coverage note: `docs/audits/realtime-coverage.md:8` — infrastructure is complete (`server/realtime.ts` rooms + `src/services/realtime.ts` hook) but **no route page imports `useRealtime` yet** (`:166` "None found"). The table above therefore distinguishes *wired* (`emitEventCreated` on `POST /events/ingest`) from *ready-but-unused* (`emitInbox`, `emitIncidentTimeline` helpers) and *planned* (`cmdb:change`, `notification:item`).

---

## Room & Auth

### Handshake

`server/app.ts:89` `sessionMiddleware` + `:90` `withScopedDb` + `:126` `requireAuth` guarantee `req.tenantId` / `req.permissions` for every `/api/v1` REST handler. Realtime mirrors this with its own Socket.IO middleware because WebSocket upgrades bypass Express middleware ordering:

1. Client `src/services/realtime.ts:28` `io({ path:'/api/v1/socket', withCredentials:true })` — browser attaches `cookie: ois_session=…` to the upgrade request.
2. `server/realtime.ts:35` `io.use(async (socket, next) => …)` → `:37` `cookieHeader(socket.handshake.headers.cookie)` parses raw cookie header (`:17` helper), → `:38` `resolveSession(cookies['ois_session'])` (`server/auth/session.ts`) looks up the same session store that REST uses.
3. If `!session` → `next(new Error('Unauthorized'))` (`server/realtime.ts:39`) — Socket.IO turns this into a `connect_error` with message `Unauthorized`; client `src/services/realtime.ts:32` `reconnection: true` will retry but will keep failing until the cookie is valid. There is no anonymous / guest connection.
4. On success, `socket.data.tenantId` + `userId` are stashed (`server/realtime.ts:40`) and used for every subsequent authorization decision.

Dev bypass `AUTH_REQUIRED=false` (pin to `tenant-demo` admin) is recognised by `server/middleware/auth.ts` but **not** by `server/realtime.ts:35` — the socket middleware always calls `resolveSession`. If `AUTH_REQUIRED=false` is needed for local socket testing, the session cookie must still be seeded (the dev login path does this).

### Rooms

On `connection` (`server/realtime.ts:49`):

```ts
socket.join(room(tenantId, 'events')) // server/realtime.ts:51 — events fan-out
socket.join(room(tenantId, 'inbox'))  // server/realtime.ts:52 — inbox push
socket.on('incident:subscribe',   (id) => socket.join(`tenant:${tenantId}:incident:${id}`)) // :53
socket.on('incident:unsubscribe', (id) => socket.leave(`tenant:${tenantId}:incident:${id}`)) // :56
```

`room()` at `server/realtime.ts:26` is `` `tenant:${tenantId}:${stream}` `` — all three room types share that prefix, so a naive `io.emit` cannot accidentally cross tenants. Producers must use `room(tenantId, …)` or the per-incident template; the helper is intentionally **not** exported outside `server/realtime.ts` to keep call sites honest (they go through `emit*` wrappers). Multi-instance scaling swaps the in-memory adapter for `@socket.io/redis-adapter` with a single line (`server/realtime.ts:6` comment) without changing the room scheme — see §Failure modes.

### No global broadcast

Verified: no `io.emit`, `io.sockets.emit`, or `socket.broadcast.emit` exists in `server/realtime.ts` or any route. Every `emit*` helper scopes via `io.to(room(tenantId,…))` or `` io.to(`tenant:${tenantId}:incident:${id}`) ``. Cross-tenant leak would require `tenantId` to be `undefined` at the call site — REST guards this with `server/app.ts:126` `requireAuth` (otherwise Prisma `tenantId=undefined` collapses to no filter), and realtime guards it with the middleware above plus `req.tenantId` at `server/routes/events.ts:118` `emitEventCreated(req.tenantId, …)` which is only reachable behind `requirePermission('event.write')` (`:98`).

### 401 / disconnect semantics

- REST without session → `401 Authentication required` (e.g. `server/routes/events.ts:54` `!req.session`, `server/routes/incidents.ts:92` etc). Realtime without session emits `connect_error: Unauthorized` — UI should treat that like a 401 (redirect to login) rather than infinite retry.
- `ScopeViolationError` (`server/scope/errors.ts:9`) always maps to `403 { error:'scope_violation' }` at `server/app.ts:145`. Realtime has no read-scope check beyond room membership; the audit calls in `server/routes/events.ts:117` and `server/routes/incidents.ts:72` etc are the authorization boundary before an emit is fired.

---

## Client Hook

`src/services/realtime.ts` is the only public surface — pages never import `socket.io-client` directly.

```ts
// src/services/realtime.ts:16 — typed contract
interface ServerToClient {
  'event:created': (e: Event) => void
  'event:updated': (e: Event) => void
  'inbox:item': (it: InboxItem) => void
  'incident:timeline': (entry: IncidentTimelineEvent) => void
}
```

| API | File:line | Semantics |
|-----|-----------|-----------|
| `getSocket()` | `src/services/realtime.ts:25` | Lazy singleton. `io({ path:'/api/v1/socket', withCredentials:true, autoConnect:true, reconnection:true, reconnectionDelay:1_000, reconnectionDelayMax:5_000 })` (`:27`-`:34`). No caller manages `io()` directly. |
| `realtime.on(event, handler)` | `:40` | Subscribes `s.on(event, handler)`. Returns `{ unsubscribe: () => s.off(event, handler) }` (`:43`). Callers `return sub.unsubscribe` in their cleanup. |
| `realtime.subscribeIncident(id)` | `:49` | Emits `incident:subscribe` (`:51`) which maps to `server/realtime.ts:53` `socket.join(...)`. Returns `unsubscribe` that emits `incident:unsubscribe` (`:53` → `server/realtime.ts:56`). Pair with `realtime.on('incident:timeline', …)` — join alone does not push backlog. |
| `realtime.disconnect()` | `:58` | `socket.disconnect(); socket=undefined;` (`:59`-`:60`). For logout + tests. |
| `useRealtime(event, handler, enabled)` | `:66` | `useEffect` wrapper (`:71`) that `realtime.on(event, handler)` when `enabled` (`:72`) and cleans up with `sub.unsubscribe` (`:74`). Dependency array `[event, enabled]` intentionally omits `handler` ref (`:75` eslint disable) — callers wrap handler in `useCallback`. |

### Reconnection

Socket.IO handles transport retries with exponential backoff **1 s → 5 s cap, ∞ attempts** (`src/services/realtime.ts:32` `reconnectionDelay`/`DelayMax`, unconfigured `reconnectionAttempts` defaults to `Infinity`). The stream is **not replayed** on reconnect (`src/services/realtime.ts:11` comment: "pages MUST re-fetch the authoritative REST list and reconcile — the stream is not replayed"). Recommended consumer pattern (per `docs/audits/realtime-coverage.md:205`):

```ts
const { data, refresh } = useResource(() => eventsService.list(), [])
useRealtime('event:created', (e) => setEvents(prev => [e, ...prev]))
// + on reconnect: socket.on('connect', refresh) or useResource polling fallback
```

Terra contrast: terra's SSE sends `retry: 5000` and `Last-Event-ID` (`terra 09-realtime.md:95`-`:100` keep-alive `retry: 5000` + `id:` header) and can replay missed events; OIS caps retries at 5 s server-side but today defers to full REST reconciliation (cheaper than a persistent event log). A future durable log could add `Last-Event-ID` semantics without changing the client API.

### Fallback polling

Per `docs/audits/realtime-coverage.md:205` recommendation, combine the subscription with a `useResource` refetch trigger on socket `connect` so that a gap during disconnect is patched. Until all pages wire `useRealtime`, the current fallback is that every page does a single `useResource(() => …list(), [])` on mount (EventStream `:31`, IncidentQueue `:88`, WarRoom `:132`). If the socket is down, data is stale until mount or explicit user refresh — not broken, just "phase-1 semantics." No interval polling is added by default; opt-in via `useResource` interval where timeliness demands it (e.g. War Room `ActivityStream` could poll every 10 s when `socket.disconnected`).

---

## Scheduler

Directory: `server/jobs/`.

| File | Export | Purpose |
|------|--------|---------|
| `server/jobs/queue.ts:9` `JobDef`, `:15` `defineJob(def)` | `defineJob` | Registry — `jobs: JobDef[]` at `:12`. Idempotent `startScheduler` guard at `:18` `if (timers.length) return`. |
| `server/jobs/queue.ts:17` `startScheduler()` | `startScheduler` | For each `JobDef`, `void run()` once at boot (`:26`) then `timers.push(setInterval(run, j.intervalMs))` (`:27`). Logs `[jobs] started N job(s)` at `:30`. Each `run` catches and `console.error(`[job:${j.name}] error:`)` at `:23`. |
| `server/jobs/queue.ts:33` `stopScheduler()` | `stopScheduler` | `clearInterval` for each timer, reset array at `:35`. Used by `server/worker.ts:25`. |
| `server/jobs/index.ts:10` `defineJob({ name:'sla-breach-detector', intervalMs:60_000, fn:… })` | — | **Only job today.** Batches 100 incidents (`:14` `BATCH=100`) where `status notIn ['resolved','closed']` (`:18`), parses `JSON.parse(row.data)` (`:27`), checks `slaResolveTarget` + `slaResolveStatus`, computes `breachAt = new Date(createdAt)+slaResolveTarget*60_000` (`:32`), and writes `prisma.incident.update({ data: JSON.stringify(next) })` at `:35`. No realtime emit — SLA breach is surfaced via next `incidents:list` read (future: emit `incident:timeline` `kind:'sla_breached'`). |

### Split deployment

```
Dev / single-container:   API process  → server/index.ts:18 http.createServer + :19 initRealtime + :24 startScheduler
Prod / split:             API process  → API_ONLY=true → skips startScheduler (server/index.ts:23)
                          Worker process → server/worker.ts:20 startScheduler, :22 shutdown on SIGINT/SIGTERM (:29-:30)
```

`server/worker.ts:3` comment calls scheduler "in-process default, skipped if `API_ONLY=true` (jobs:* events in §Channels)". The TODO at `:8` calls out the future move to BullMQ (Redis-backed) without changing `defineJob` call sites — `server/jobs/queue.ts:2` comment says the public API is "shaped like BullMQ so the swap-in is a 5-line change once Redis is provisioned." `docker compose` today runs Postgres on `5433→5432` and Redis on `6380→6379` for local infra parity.

### Emit site map (by route file)

| Route file | Endpoint(s) | Emit helper (`server/realtime.ts`) | Tenant scoping | Audit |
|------------|-------------|-------------------------------------|----------------|-------|
| `server/routes/events.ts:97` | `POST /events/ingest` (`:98` `requirePermission('event.write')`) | `:5` `emitEventCreated` → `:65` `io.to(room(tenantId,'events'))` | `req.tenantId` at `:118` (guarded by `server/app.ts:126` `requireAuth`) | `:117` `audit(req, { action:'event.ingest' })` |
| `server/routes/cmdb.ts:40` | `PATCH /cis/:publicId` (`cmdb.write`) | *None yet* — planned `emitCmdbChange` | `req.scoped.cmdb.updateCI` (`:42`) | `:44` `audit(action:'update', resourceKind:'ConfigurationItem')` |
| `server/routes/incidents.ts:58` | `POST /incidents/:id/comments` | `emitIncidentTimeline` (`:73`) via `server/repositories/incidents.ts` after `$transaction` | `req.tenantId` via `scoped(req).incidents` | `:72` `audit(action:'comment')` |
| `server/routes/incidents.ts:84` | `PATCH /incidents/:publicId/status` | `emitIncidentTimeline` `kind:'status_changed'` | same | `:98` `audit(action:'status_change')` |
| `server/routes/incidents.ts:187` | `POST /incidents/:publicId/comms` | `emitIncidentTimeline` `kind:'comms_posted'` | same | `:201` `audit(action:'comms_posted')` |
| `server/routes/incidents.ts:136` | `POST …/promote-major` / `:161` `stand-down` / `:237` `assign` | `emitIncidentTimeline` `kind:'promoted_major'/'stand_down'/'assigned'` | same | respective `audit` blocks |
| `server/routes/monitoring.ts:39` | `POST /monitoring/routes` + `:56` `PATCH …` / `:94` rules | *None yet* — routes only `audit`; future fan-out via `tenant:{id}:events` `rule:updated` | `req.scoped.monitoring` (`:14` accessor) | `:45` / `:63` / `:109` `audit` |
| `server/routes/platform.ts:210` | `GET /notifications`, `:221` `GET /inbox`/`items` | `emitInbox` (`:70`) stub — no inbound POST today | `req.tenantId` `listByKind` | read-only, no audit write |

### Sequence — ingest fan-out

```
Producer (outside)              API (server/routes/events.ts:97)              Gateway (server/realtime.ts)                  Client (src/services/realtime.ts)
  │  POST /events/ingest            │  ingestSchema.parse(:78)                  │                                             │
  │  Zod validate                   │  scoped(req).events.ingest(:101)          │                                             │
  │──────────────────────────────▶│  prisma Event create                     │                                             │
  │                               │  audit(:117)                              │                                             │
  │                               │  emitEventCreated(req.tenantId, e) :118 ─▶│  io.to(room(tenantId,'events')).emit :65  │  realtime.on('event:created', h) :40
  │                               │  201 { created }                           │──────────────── room fan-out ──────────────▶│  → setEvents / qc.invalidate
  │  201 Event ◀──────────────────│                                            │                                             │
```

CMDB/incident/monitoring writes follow the same shape: `scoped write → audit → emit* → io.to(tenant-room).emit`. Future `cmdb:change` and `notification:item` reuse the same two-step `audit` then `emit` contract so the audit log remains the durable source while the socket is the ephemeral hint.

### Terra delta — SSE vs Socket.IO

| Concern | Terra (`09-realtime.md:32`) SSE | OIS (`server/realtime.ts`) Socket.IO |
|---------|---------------------------------|---------------------------------------|
| Ticket | `POST /auth/stream-ticket` → `stream_tickets` table 60 s TTL single-use, `GET /events?ticket=` | No ticket table — session cookie on upgrade (`server/realtime.ts:37` `cookieHeader` + `:38` `resolveSession`) |
| Transport | `EventSource`, `Content-Type: text/event-stream`, `retry: 5000`, `id: ms-seq` (`:95`-`:100`), `Last-Event-ID` resume | `IOServer` `path:'/api/v1/socket'` (`:30`), `withCredentials:true` (`src/services/realtime.ts:29`), built-in binary+reconnect |
| Filtering | Query `?appId=&types=&entityId=&scope=` + server `matchesFilters` + `hasPermission` LRU cache | Room-based `tenant:{id}:events` / `tenant:{id}:inbox` / `tenant:{id}:incident:{id}` — no per-event LRU needed |
| Reconnect | Browser auto-retry 3 s → 5 s, `Last-Event-ID` replay opted deferred | `reconnectionDelay 1_000 → 5_000` (`src/services/realtime.ts:32`), full REST reconcile instead of replay |

---

## Failure Modes

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| **Transient socket drop** (network blip, server restart) | `EventSource`/`Socket.IO` disconnect; client buffer drains; missed `event:created` / `incident:timeline` events | `src/services/realtime.ts:31` `reconnection:true` with 1→5 s backoff auto-retries; on `connect` event, page **MUST** `refresh()` authoritative REST list (`:11` reconcile comment). No replay buffer today — eventual consistency via refetch. Tab jitter (0-3 s) staggers reconnect storm after server restart. |
| **No auth / expired session** | Socket `connect_error: Unauthorized` (`server/realtime.ts:39`), REST `401 Authentication required` (`server/routes/incidents.ts:92`, `server/routes/events.ts:54`, `server/middleware/auth.ts:48`) | Client treats 401 / `Unauthorized` as logout → redirect to `/login`. Realtime retries are capped by credential freshness — they'll keep failing until cookie is re-established, which is intentional. |
| **Cross-tenant leak attempt** | Caller fabricates `incident:subscribe` for other tenant's incidentId | `server/realtime.ts:53` joins `` `tenant:${tenantId}:incident:${incidentId}` `` where `tenantId` is the **authenticated** tenant from `socket.data` (`:50`), not from the payload. `emitIncidentTimeline` (`:74`) targets `` `tenant:${tenantId}:incident:${incidentId}` `` using the writer's `tenantId`. No room name is attacker-controlled. Prisma layer second-guards with `req.tenantId` filter (`server/app.ts:126`). |
| **Single-process ceiling / fan-out loss on deploy** | With `API_ONLY=true` split but still in-memory adapter, API and worker each have isolated `IOServer` — emit on one process is invisible on the other | Swap default adapter for Redis adapter (one line) — `server/realtime.ts:7` comment ("swap the default adapter for the Redis adapter (one line)") keeps the same `room` scheme; requires `REDIS_URL` provisioned (`docker compose` Redis `6380→6379`). Until then, do **not** run `API_ONLY=true` in single-instance dev. |
| **Event emit throws (DB committed, emit failed)** | Event lost for live viewers; persistence is fine (`POST /events/ingest` already committed at `server/routes/events.ts:101` `scoped(req).events.ingest` before `:118` emit) | Each `emit*` (`server/realtime.ts:64`-`:74`) is `io?.to(...).emit` — no await, no throw on no-clients. Upstream handlers log via `server/jobs/queue.ts:23` `console.error([job:…])` per job; a future ring buffer (`Last-Event-ID` style) would close the gap for critical comms. |
| **Socket.IO blocked by proxy / firewall** | `ws` upgrade fails; client stays polling-only | CSP already allows `ws:`/`wss:` (`server/app.ts:49`); Nginx `proxy_set_header Upgrade` must be configured per `07-ops-runbook.md:86` "Socket.IO tidak connect — cek cookie session valid." UI degrades to REST polling — no crash. |
| **Tenant not found / session tenant deleted** | `req.tenantId` or `socket.data.tenantId` references non-existent tenant | REST: `withScopedDb` would still scope queries but list returns empty. Socket: `room('tenant:undefined:…')` would double-enter a garbage room — prevented by `server/realtime.ts:39` rejecting when `!session` (which implies `!tenantId`). |

Fallback polling is the universal degrade: if `realtime` is unreachable or unwired, pages still function via their `useResource` mount fetch (`docs/audits/realtime-coverage.md:493` "Graceful degradation — kalau realtime unavailable, app tetap fungsional via REST. UI tidak break — just stale like Phase 1"). The migration path is additive: wire `useRealtime('event:created', refresh)` page-by-page without removing REST readers.

---

## Resolved Decisions

| Decision | Rationale | Date | Ref |
|----------|-----------|------|-----|
| **Socket.IO, not SSE** | Bidirectional room semantics (`incident:subscribe` / `incident:unsubscribe`) plus infix `tenant:{id}:incident:{id}` targeting are native in Socket.IO; War Room needs targeted pushes, not just global SSE frames. Terra's SSE (`../terra-service-management/docs/design/09-realtime.md:33` — reasoning: one-way sufficient, `EventSource` + ticket avoids `Authorization` header limits, plain HTTP proxies) fit terra's simpler "invalidation signal" model. OIS War Room + inbox require multi-room fan-out and the deploy still has a single VM (`07-ops-runbook.md`) so Socket.IO adapter simplicity beats SSE ticket table (`stream_tickets` + 5-min cleanup + `Last-Event-ID` replay) at this scale. | M4 | `server/realtime.ts:1`-`:6` comment, `server/middleware/auth.ts:48` session cookie already solves SSE's `EventSource` header problem |
| **In-process scheduler default; `API_ONLY=true` split** | Dev simplicity — `npm run dev:all` runs API + Vite + jobs in one process. Production can split without code change: API node sets `API_ONLY=true` (`server/index.ts:23`), worker node runs `server/worker.ts:20` `startScheduler()` alone. `server/jobs/queue.ts:17` idempotent start, `:33` stop hook makes the split reversible. | M4 | `server/index.ts:23`, `server/worker.ts:8` TODO BullMQ, `AGENTS.md:40` |
| **Attach to same `http.createServer`** | One port, one origin, one cookie domain, one load-balancer target. Avoids cross-origin `Access-Control-Allow-Origin` gymnastics for `ws://` vs `http://`. `server/index.ts:18` single `http.Server`, `server/realtime.ts:29` `IOServer(server, { path:'/api/v1/socket' })`. | M4 | `server/index.ts:18`-`:19`, `server/app.ts:49` CSP `connect-src` |
| **Tenant-room fan-out, never global** | `server/realtime.ts:26` `room()` helper forces tenant prefix; every emit uses `io.to(room(tenantId,…))`. Prevents the class of bugs where `prisma findMany` without `tenantId` leaks rows — same invariant as `withScopedDb`. | M4 | `server/realtime.ts:26`, `:64`-`:74`, `server/app.ts:126` `requireAuth` |
| **No event replay on reconnect (reconcile instead)** | Cheaper than a durable log. `src/services/realtime.ts:11` "MUST re-fetch authoritative REST list" keeps client logic idempotent; audit timeline (`server/routes/incidents.ts:51` `GET /incidents/:id/timeline`) is already the source of truth. Terra's Phase 2 also chose "Simple approach — tidak replay" (`terra 09-realtime.md:433`-`:444`), so OIS mirrors it until SLA comms need tighter guarantees. | M4 | `src/services/realtime.ts:11`, `terra 09-realtime.md:433` |

---

## Open Items

- [ ] **Wire `useRealtime` to consumers** — `docs/audits/realtime-coverage.md:166` `useRealtime` is never imported. Target wiring: `EventStream.tsx:31` → `useRealtime('event:created')`, `IncidentQueue.tsx:88` + `IncidentDetail.tsx:185` + `MajorIncidentWarRoom.tsx:141` → `useRealtime('incident:timeline')` + `subscribeIncident`, `InboxDrawer`/full-page `inboxService` → `useRealtime('inbox:item')`. Reference `server/realtime.ts:52,71` for inbox room + emit contract.
- [ ] **Redis adapter when multi-instance** — `server/realtime.ts:7` one-line swap to `@socket.io/redis-adapter` once `REDIS_URL` is provisioned; add `REALTIME_ENABLED`, `REDIS_URL` validation via Zod at `server/worker.ts` boot. Capacity check: `REALTIME_MAX_TOTAL_STREAMS` equivalent for OIS.
- [ ] **Durable event log / `Last-Event-ID` replay** — ring buffer or `Document` ring for critical `comms_posted` gap recovery; terra deferred to Phase 3+ (`terra 09-realtime.md:543` Phase 3+ Deferred). Proposal: append to `prisma.document kind='realtime-log'` with retention 24 h.
- [ ] **Backpressure / spam throttle** — no per-user max streams or per-event rate limiter today; `server/app.ts:95` `tenantLimiter` throttles REST but not socket frames. Add `REALTIME_MAX_STREAMS_PER_USER=5` 429 on 6th (terra `09-realtime.md:532`).
- [ ] **CMDB & notification channels push** — `server/routes/cmdb.ts:40` PATCH currently silent; add `emitCmdbChange` helper. `server/routes/platform.ts:210` notifications & inbox legacy poll — add `emitInbox` calls on assignment/SLA/mention and `notification:item` channel.
- [ ] **Payload minimal vs full entity** — `server/routes/events.ts:118` today emits full `Event`; spec in §Conventions earlier said "Emit `publicId`+`kind`, client fetch detail". Keep full payload for `Event` (small, already scoped) but switch `incident:timeline` to `publicId+kind` so detail refetch stays scoped via `req.scoped`.
- [ ] **Cross-tab toast dedup** — terra Open Items `09-realtime.md:560` `BroadcastChannel` coordination so only active tab toasts; defer to Phase 3.
- [ ] **OTEL span for realtime** — `server/telemetry.ts:12` `initTelemetry()` covers `scope, db`; add `realtime` span (`sla-breach-detector` duration + socket emit count) per `docs/design/06-observability.md:48`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init realtime — Socket.IO rooms, ingest fan-out, scheduler (in-process) | `server/realtime.ts`, `server/index.ts:19` |
| 2026-08-29 | Deepen doc: channel table with file:line, room & auth §, client hook API, scheduler split, failure modes, Socket.IO vs SSE rationale (terra ref), open items | This file |

