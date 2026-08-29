# Incidents Stack Audit (Aug 2026)

## Executive Summary

Item-by-item audit of the **incident page** across the full stack: `server/routes/incidents.ts`, `server/repositories/incidents.ts`, `server/scope/scopedDb.ts`, `prisma/schema.prisma`, `src/shared/schemas/incident.ts`, `src/services/incidentsService.ts`, `IncidentQueue.tsx`, `IncidentDetail.tsx`, `IncidentComposer.tsx`, `CreateIncidentModal.tsx`, and the RBAC engine.

**Note on prior audit docs:** `docs/audits/mutation-audit.md` claims incident mutations are "local React state only, zero server persistence." That is **stale** — the current handlers call `incidentsService.*` and persist. This doc supersedes it for the incidents family.

Findings are split into **Backend/DB (B)**, **Frontend (F)**, and **Architecture (A)**. Severity: 🔴 critical / 🟠 moderate / ⚪ cosmetic.

---

## Backend / DB

### B1. 🔴 `publicId` generation is racy and non-monotonic
`server/repositories/incidents.ts` (`create`): `publicId = INC-${year}-${count+1}` where `count = prisma.incident.count()`.

- Two concurrent creates → same sequence number → Prisma unique-constraint error → 500.
- Count includes deleted rows, so deleting the newest incident **reuses** its number (`INC-2026-00007` may exist twice over time).
- The counter never resets per calendar year.

**Fix direction:** a per-tenant monotonic counter column, or a DB sequence / advisory lock around allocation.

### B2. 🔴 Create is not transactional
The incident row and its `created` timeline event are inserted in **two separate statements** (repo `create`), unlike every other mutation which uses `prisma.$transaction`. If the timeline insert fails, an incident exists with no `created` event — the timeline "System" filter silently shows nothing for it.

### B3. 🟠 Production code fabricates tenants
`create` runs `prisma.tenant.upsert(...)` creating a `Test <id>` tenant row, with a comment saying it exists "for isolated test tenants." Real traffic hitting a missing tenant silently mints junk tenants instead of failing loudly. A test isolation hack shipped in the prod write path.

### B4. 🟠 Two different "unassigned" representations
- Scope layer resolves no-app to `ensureUnassignedApp()` → a real app UUID (`app-unassigned-<tenant>`).
- Repo fallback is the literal string `'unassigned'`.
- JSON snapshot stores `applicationId` = resolved UUID (scope path) or `null` (direct repo path).

So the same "no app" state is three different values depending on call path. Drift-prone.

### B5. 🔴 UI-created incidents are invisible / unwritable for ordinary members
`CreateIncidentModal` has no application field → every UI-created incident lands in the synthetic UNASSIGNED app. In `scopedDb.ts`:
- `list` filters to `writableApps ∪ ownerApps` (memberships come only from `ApplicationTeam` rows — the UNASSIGNED app is in none of them).
- `incidentCanWrite('app-unassigned-…')` is `false` for anyone lacking `NOC_OPERATOR`/`PLATFORM_ADMIN`.

Result: a regular APS member who creates an incident cannot see it in the queue and gets **403 on every subsequent write** (status, comment, assign). This only works in dev because `AUTH_REQUIRED=false` pins to an admin. Compound with F9 (frontend/backend scope disagree).

### B6. 🟠 `get` / `comments` / `timeline` bypass read-scoping
`list` filters by readable apps, but `get(publicId)`, `comments(incidentId)`, `timeline(incidentId)` perform **no app-scope filter** (only `tenantId`). Any member with `incident.read` can pull full details of incidents in apps they cannot access (same tenant). Inconsistent with `list`.

### B7. 🔴 `WATCHER_NOT_FOUND` → 500, not 404
Repo `removeWatcher` throws `Error('WATCHER_NOT_FOUND')`; its own comment claims "the route maps to 404, per task spec" — but the route only handles `!wrapped`. The generic error handler maps unknown `Error` → **500**. Removing a user who isn't a watcher is a 500. (Missing incident is handled correctly: scope returns `null` → route 404.)

### B8. 🟠 `list` CI filter: substring match + post-pagination filter
DB query uses `affectedCIIds: { contains: ciId }` on the serialized JSON column (so `ci-1` matches `ci-10`), then a secondary **exact** filter runs **after** `take`/`skip`. Exact matches beyond page 50 are silently dropped; the queue and search return wrong/truncated sets.

### B9. 🟠 API surface mixes internal and public IDs
- Internal `:incidentId`: comments, timeline, watchers add/remove.
- Public `:publicId`: status, resolve, assign, links, update, stand-down, comms.

Internal UUIDs leak into URL params and the surface is inconsistent. Frontend passes `inc.id` for the internal-id endpoints and `inc.publicId` otherwise.

### B10. 🟠 `closed` skips resolution, `resolved` requires it
`setStatus` rejects `resolved` but allows `closed`. So a brand-new incident can be bulk-closed with no resolution block, yet "resolved" demands a summary. Semantically lopsided; the detail dropdown offers both without distinguishing.

### B11. 🟠 `severity` duplicates `priority`
On create, `severity = priority` and they never diverge, but both are stored in the JSON snapshot. The stripe color reads `severity` while badges read `priority` — dead duplication that can drift.

### B12. ⚪ Minor smells
- `slaResponseTarget: 60` / `slaResolveTarget: 240` hardcoded in repo `create`.
- Route uses `(scoped(req).incidents.create as any)` — untyped cast.
- Repo `create`'s `?? 'unassigned'` fallback is dead when called through the scope layer.

---

## Frontend

### F1. 🔴 "Reporter channel" picker is phantom
`CreateIncidentModal` sends `channel`, but the route never forwards it and the repo hardcodes `reporterChannel: 'user_report'`. The dropdown does nothing. (Same modal also always sends `affectedCIIds: []` / `tags: []` — no pickers exist for those.)

### F2. 🔴 "Edit" description is local-only
`IncidentDetail` saves `descDraft` into local `setInc` state only. No server endpoint accepts `description` (`updateIncidentSchema` is `.strict()` and only allows `priority`/`tags`). Edits **vanish on refresh** — the Save button persists nothing.

### F3. 🔴 Promote-to-Major is unreachable
The only promote button is `className="hidden" aria-hidden` (display:none → unclickable). The overflow menu has only Copy ID / Copy link. The promote-major feature + `PromoteMajorModal` are dead UI on the detail page.

### F4. 🟠 List truncates at 50 with wrong totals
`incidentsService.list()` sends no pagination; server defaults to `limit: 50`. The queue header ("X total · Y active"), quick-filter counts, and related-incidents all derive from the first 50 rows (by `updatedAt desc`). No load-more.

### F5. 🟠 "Resolved" silently no-ops in the status dropdown
`handleStatusChange`: `if (s === 'resolved') return;` — picking Resolved from the dropdown either opens the modal (no resolution yet) or silently does nothing (resolution exists). `closed` is offered too and goes through `setStatus`.

### F6. 🟠 Hardcoded demo user `'u-001'`
- `handlePromoteMajor` optimistic update sets `majorDeclaredBy: 'u-001'`.
- Queue quick filters fall back to `?? 'u-001'` for "My open" counts/filters.

Prod logic references a demo user.

### F7. 🟠 Local `inc` never re-syncs from server
`useEffect(() => setInc(incident ?? null), [incident?.id])`. After every mutation, `refreshIncident()` fetches fresh data but `inc` (same `id`) stays stale — optimistic edits are never reconciled, and multi-tab / other-actor changes never appear.

### F8. 🟠 Composer slash commands are cosmetic
`/status`, `/page`, `/link CI` chips insert literal text into the comment body; no command handling exists anywhere. The composer posts "`/status ...`" as plain comment text. Misleading.

### F9. 🔴 Dual scope models disagree
- **Frontend** RBAC scopes incidents by `assigneeTeamId` (`src/lib/rbac/incidentResource.ts`).
- **Backend** scope uses `applicationId` column + app memberships.

A user can pass frontend `Can`/`filterReadable` and get a 403 from the backend, or be hidden in the queue while the backend allows the read. Directly compounds B5.

### F10. ⚪ Dead code / cosmetic
- Hidden `commentTextareaRef` textarea (comment: "if needed").
- `MajorIncidentBanner` shows only `majorActive[0]` (ignores additional majors).
- `getServiceName` falls back to a raw ID as a "name".

---

## Architecture

### A1. Watchers stored inside the incident JSON snapshot
Every watcher change rewrites the whole incident blob with no optimistic-locking/versioning. Under concurrency, a comment + watcher change can clobber each other's snapshot.

### A2. `updatedAt` bumps on `postComms`
A timeline-only append mutates the incident row `updatedAt` "so list views resort" — write amplification and surprising invalidation semantics.

### A3. Three overlapping "no app" mechanisms
`tenant.upsert`, the `'unassigned'` literal sentinel, and the synthetic UNASSIGNED app row all represent the same concept.

---

## Recommended fix order

The three highest-value fixes (also the plan's scope):

1. **F2** — Description edit persists (add `description` to schema/route/repo + wire frontend).
2. **B7** — `WATCHER_NOT_FOUND` → 404 (map in route/scope).
3. **B5/F9** — Unassigned-app scope trap (make memberships see the UNASSIGNED app, or surface it as readable/writable consistently).

Followed by: B1 (publicId race), B2 (transactional create), F1 (channel), B6 (read-scope), F5, F6, F7.

---

## References
- `server/routes/incidents.ts`
- `server/repositories/incidents.ts`
- `server/scope/scopedDb.ts`
- `server/scope/context.ts`
- `prisma/schema.prisma` (`Incident` / `IncidentComment` / `IncidentTimelineEvent`, ~line 408)
- `prisma/preflightScopeNotNull.ts` (`ensureUnassignedApp`)
- `src/shared/schemas/incident.ts`
- `src/services/incidentsService.ts`
- `src/routes/incidents/IncidentQueue.tsx`
- `src/routes/incidents/IncidentDetail.tsx`
- `src/components/incidents/IncidentComposer.tsx`
- `src/components/incidents/CreateIncidentModal.tsx`
- `src/lib/rbac/incidentResource.ts`
- `src/lib/rbac/engine.ts`
