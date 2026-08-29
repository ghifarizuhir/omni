# Incidents Detail Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the detail-page gaps missed by the first audit hardening: per-tenant `IncidentCounter` (global → `@@id([tenantId, year])` + `@@unique([tenantId, publicId])`), `comments`/`timeline` 404 for missing incidents, dead timeline filters, dropped `linkedProblemPublicId`, missing unlink/watcher/assign affordances, and the resolve-modal/rollback dishonesty.

**Architecture:** Same layer discipline as `2026-08-29-incidents-stack-hardening.md`: repo = single `$transaction` + `{ before, after, internalId }` shape; scope = gate + `scopeMode`; route = `requirePermission` + `required()` + `audit()`; shared Zod `.strict()` schemas; frontend mutations optimistic with rollback + `refreshIncident()`. DB-backed vitest for every backend change, `npm run lint` for frontend-only tasks.

**Tech Stack:** Express + Prisma + Zod (server), React + TypeScript + Vite (client), vitest + supertest (DB-backed tests), Postgres 16 on `5433→5432`.

**Spec:** `docs/audits/2026-08-29-incidents-stack-audit.md` (deferred B1/B6-adjacent) + fresh re-audit of `src/routes/incidents/IncidentDetail.tsx:122-123,296-375,880-894`, `IncidentComposer.tsx:44`, `IncidentCommentThread.tsx`, `IncidentTimelineEntry.tsx`, `LinkCIModal.tsx`, `LinkProblemModal.tsx`, `AboutRail.tsx`, `server/repositories/incidents.ts:376-437,703-739`, `server/scope/scopedDb.ts:393-406`, `server/routes/incidents.ts:47-55`, `prisma/schema.prisma:408-459`.

---

## Global Constraints

- Never import `prisma`/`@prisma/client` into `server/routes/**` — use `req.scoped.*`. Enforced by eslint (`eslint.config.js:19`). Repo/scope/test files may import `prisma` from `../db`.
- Follow the existing `{ before, after, internalId }` + optional timeline-event shape on every incident mutation in `server/repositories/incidents.ts`.
- Tests are DB-backed, need running Postgres. Single file: `npx vitest run server/__tests__/<name>.test.ts`; single case: `npx vitest run -t "<name>"`.
- `publicId` must keep matching `/^INC-\d{4}-\d{5}$/` — existing tests assert this regex. Frontend-only tasks are verified with `npm run lint` + manual click-through; do not invent a frontend test runner.
- Shared Zod schemas are `.strict()` where noted; an added optional field does not need a new `.refine` but must keep `.strict()`.

---

## File Structure

```
prisma/schema.prisma                                   # IncidentCounter, Incident uniques
prisma/migrations/<stamp>_incident_counter_per_tenant/ # generated + edited backfill
server/repositories/incidents.ts                       # create counter + setLinks/resolve
server/scope/scopedDb.ts                               # comments/timeline gate
server/routes/incidents.ts                             # comments/timeline required() + setLinks/resolve forward
src/shared/schemas/incident.ts                         # linkedProblemPublicId, resolve flags
src/types/incident.ts                                  # resolution.suggestKB/schedulePIR, linkedProblemPublicId
src/routes/incidents/IncidentDetail.tsx                # filter kinds, handleSetLinks, watchers, assign, resolve
src/components/incidents/LinkCIModal.tsx               # full-set toggle (add + unlink)
src/components/incidents/LinkProblemModal.tsx          # unchanged (caller now passes publicId)
src/components/incidents/ResolveIncidentModal.tsx      # keep toggles — now persisted
src/components/incidents/IncidentComposer.tsx          # no change (deferred)
```

Deferred (not in this plan, keep on backlog): `IncidentComposer` reply threading / `isInternal` toggle / `@mention` chips (`src/shared/schemas/incident.ts`, `server/repositories/incidents.ts:addComment`), `AboutRail` service link `/cmdb/<id>` (`IncidentDetail.tsx:453`), `created` timeline `actorName` blank, priority/tags edit on detail.

---

### Task 1: Per-tenant `IncidentCounter` — fix D1 (global → `@@id([tenantId, year])`)

**Files:**
- Modify: `prisma/schema.prisma:408-459` (two models)
- Modify: `server/repositories/incidents.ts:703-712` (upsert where)
- Modify: `server/__tests__/scope-incidents.test.ts:64,166` (`delete` → `deleteMany`)
- Test: `server/__tests__/batch1-incident-repo.test.ts` (new cross-tenant test + counter cleanup)

**Interfaces:**
- Consumes: existing `incidentsRepo.create(tenantId, input, actor)` shape and `IncidentCounter` row `{ year, seq }` (global today).
- Produces: `IncidentCounter { tenantId: String, year: Int, seq: Int, @@id([tenantId, year]) }` and `Incident { ..., @@unique([tenantId, publicId]) }` (remove field-level `@unique` on `publicId`), `create` upserts on `tenantId_year`.

- [ ] **Step 1: Write the failing test** — append to `server/__tests__/batch1-incident-repo.test.ts`:

```ts
it('starts each tenant at INC-YYYY-00001 (per-tenant isolation)', async () => {
  const tenantA = `tenant-iso-a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const tenantB = `tenant-iso-b-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const year = new Date().getFullYear();
  const [a, b] = await Promise.all([
    incidentsRepo.create(tenantA, { title: 'iso a' }, { id: 'u-a', name: 'A' }),
    incidentsRepo.create(tenantB, { title: 'iso b' }, { id: 'u-b', name: 'B' }),
  ]);
  expect(a.publicId).toBe(`INC-${year}-00001`);
  expect(b.publicId).toBe(`INC-${year}-00001`);
  // both rows persist — composite-unique no longer collides cross-tenant
  const rowA = await prisma.incident.findFirst({ where: { tenantId: tenantA, publicId: a.publicId } });
  const rowB = await prisma.incident.findFirst({ where: { tenantId: tenantB, publicId: b.publicId } });
  expect(rowA).toBeTruthy();
  expect(rowB).toBeTruthy();
  await prisma.incidentCounter.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
  await prisma.incident.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
});
```

Ensure the file already imports `prisma` (it does at line 3). The existing test "allocates unique publicIds under concurrent creates" stays green — it asserts distinct ids for the same tenant.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts -t "per-tenant isolation"`
Expected: FAIL — `expected 'INC-2026-00002' to be 'INC-2026-00001'` (global counter, second tenant got 00002). If the counter has a high backfilled seq, failure is `not to be 'INC-YYYY-00001'` for the first tenant.

- [ ] **Step 3: Edit `prisma/schema.prisma`** — replace the two affected models exactly:

```prisma
model Incident {
  id                    String                  @id
  publicId              String
  tenantId              String
  data                  String // JSON — full incident snapshot
  status                String
  priority              String
  severity              String
  isMajor               Boolean                 @default(false)
  linkedProblemPublicId String?
  affectedCIIds         String // JSON array (for filtering)
  affectedCIPublicIds   String // JSON array
  applicationId         String
  createdAt             DateTime
  updatedAt             DateTime
  tenant                Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  comments              IncidentComment[]
  timeline              IncidentTimelineEvent[]

  @@unique([tenantId, publicId])
  @@index([tenantId, status])
  @@index([tenantId, isMajor])
  @@index([tenantId, linkedProblemPublicId])
  @@index([tenantId, applicationId])
}

model IncidentCounter {
  tenantId String
  year     Int
  seq      Int      @default(0)
  @@id([tenantId, year])
}
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:migrate -- --name incident_counter_per_tenant`
Expected: new dir `prisma/migrations/<ts>_incident_counter_per_tenant/migration.sql` containing roughly:
- `DROP INDEX "Incident_publicId_key"`
- `CREATE UNIQUE INDEX "Incident_tenantId_publicId_key" ON "Incident"("tenantId","publicId")`
- `DROP TABLE "IncidentCounter"; CREATE TABLE "IncidentCounter" ("tenantId" TEXT, "year" INTEGER, ... PRIMARY KEY ("tenantId","year"))`

If `npx prisma migrate dev` prompts about data loss (dropping the counter table), confirm. `prisma generate` runs automatically.

- [ ] **Step 5: Edit the generated migration — add per-tenant backfill** so fresh per-tenant counters continue past existing highest `INC-YYYY-NNNNN` in each tenant. Append after the `CREATE TABLE "IncidentCounter"` block (before the trailing `COMMIT`):

```sql
-- Backfill per (tenantId, year) from the highest existing publicId suffix.
INSERT INTO "IncidentCounter" ("tenantId", "year", "seq")
SELECT "tenantId", "year", MAX("seq")
FROM (
  SELECT
    "tenantId",
    CAST(SUBSTRING("publicId" FROM '^INC-([0-9]{4})-[0-9]{5}$') AS INTEGER) AS "year",
    CAST(SUBSTRING("publicId" FROM '^INC-[0-9]{4}-([0-9]{5})$') AS INTEGER) AS "seq"
  FROM "Incident"
  WHERE "publicId" ~ '^INC-[0-9]{4}-[0-9]{5}$'
) AS "t"
GROUP BY "tenantId", "year";
```

If the generated migration already contains a global backfill (unlikely, since the old table is dropped), replace it with this per-tenant version.

Re-apply if needed (no additional command — the `db:migrate` already applied; the edit is for history correctness — rerun `npm run db:migrate` will report "Already applied". To force the backfill now, run the INSERT manually via `npx prisma db execute --schema=./prisma/schema.prisma --stdin` piping the SQL, or execute through `prisma.$executeRaw` in a one-off `tsx` script — either is fine, but keep the migration file truthful for future `migrate reset`.)

- [ ] **Step 6: Fix the two test cleanups** that relied on globally-unique `publicId` — in `server/__tests__/scope-incidents.test.ts`:

At `~64` inside `afterAll`:

```ts
// was: await prisma.incident.delete({ where: { publicId } }).catch(() => undefined);
await prisma.incident.deleteMany({ where: { publicId } }).catch(() => undefined);
```

At `~166` inside the unassigned-pool suite `afterAll`:

```ts
// was: await prisma.incident.delete({ where: { publicId: unassignedPublicId } }).catch(() => undefined);
await prisma.incident.deleteMany({ where: { publicId: unassignedPublicId } }).catch(() => undefined);
```

(`deleteMany` matches on any filter; no `tenantId` needed — keeps the edit minimal. `line 40` already uses `deleteMany`.)

- [ ] **Step 7: Fix `server/repositories/incidents.ts` — per-tenant upsert** — replace the counter block at `~703`:

```ts
// was:
// const counter = await tx.incidentCounter.upsert({
//   where: { year },
//   update: { seq: { increment: 1 } },
//   create: { year, seq: 1 },
//   select: { seq: true },
// });
const counter = await tx.incidentCounter.upsert({
  where: { tenantId_year: { tenantId, year } },
  update: { seq: { increment: 1 } },
  create: { tenantId, year, seq: 1 },
  select: { seq: true },
});
```

No other repo code changes. `publicId` stays `INC-${year}-${seq.padStart(5,'0')}`.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts -t "per-tenant isolation"`
Expected: PASS.

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts`
Expected: PASS (both the new test and the existing "allocates unique publicIds under concurrent creates" — which asserts distinct ids for the same tenant — still pass).

Run the suites that touch this data:

Run: `npx vitest run server/__tests__/scope-incidents.test.ts`
Expected: PASS (including the unassigned-pool deletes now using deleteMany).

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts server/__tests__/batch1-incident-route.test.ts server/__tests__/batch1-incident-repo.test.ts`
Expected: PASS.

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: no `tsc` errors.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations server/repositories/incidents.ts server/__tests__/batch1-incident-repo.test.ts server/__tests__/scope-incidents.test.ts
git commit -m "fix(incidents): per-tenant IncidentCounter + composite unique publicId"
```

---

### Task 2: `comments`/`timeline` return 404 for a missing incident (D2)

**Files:**
- Modify: `server/scope/scopedDb.ts:393-406` (`comments`, `timeline` missing-incident guard)
- Modify: `server/routes/incidents.ts:47-55` (wrap with `required()`)
- Test: `server/__tests__/incidents-workflow.test.ts`

**Interfaces:**
- Consumes: `loadIncidentAppIdById(incidentId): string | null | undefined` (undefined = missing).
- Produces: `incidents.comments/timeline` return `null` when `appId === undefined` (route maps to 404 via `required()`); non-existent id returns `404 { message: 'Incident not found' }`, not `200 []`. Scope 403 for a real incident whose app is not readable stays unchanged.

- [ ] **Step 1: Write the failing tests** — append to `server/__tests__/incidents-workflow.test.ts`:

```ts
describe('GET /api/v1/incidents/:incidentId/comments — missing incident', () => {
  it('returns 404 on comments for an unknown incident id', async () => {
    const res = await auth(request(app).get(`/api/v1/incidents/missing-${rand()}/comments`));
    expect(res.status).toBe(404);
  });
  it('returns 404 on timeline for an unknown incident id', async () => {
    const res = await auth(request(app).get(`/api/v1/incidents/missing-${rand()}/timeline`));
    expect(res.status).toBe(404);
  });
});
```

`auth` and `rand` already exist in the file. `incidents-workflow.test.ts` logs in as admin (platform admin) during `beforeAll`, so read-bypass is true — current code returns `200 []` on a missing id, making this a reliable red test.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "missing incident"`
Expected: FAIL — `expected 404 to be 404` actually `received 200`.

- [ ] **Step 3: Fix `server/scope/scopedDb.ts`** — gate `undefined` → `null` at `~393-406`:

```ts
async comments(incidentId, pagination) {
  const appId = await loadIncidentAppIdById(incidentId);
  if (appId === undefined) return null;
  if (appId != null && !isIncidentReadable(appId)) {
    throw new ScopeViolationError({ module: 'incident', action: 'read', applicationId: appId });
  }
  return incidentsRepo.comments(ctx.tenantId, incidentId, pagination);
},
async timeline(incidentId, pagination) {
  const appId = await loadIncidentAppIdById(incidentId);
  if (appId === undefined) return null;
  if (appId != null && !isIncidentReadable(appId)) {
    throw new ScopeViolationError({ module: 'incident', action: 'read', applicationId: appId });
  }
  return incidentsRepo.timeline(ctx.tenantId, incidentId, pagination);
},
```

Update the `IncidentsScope` interface return types for these two methods to `Promise<... | null>` if strict.

- [ ] **Step 4: Fix `server/routes/incidents.ts`** — map `null` → 404 via `required()`:

```ts
// was:
// incidentsRouter.get('/incidents/:incidentId/comments', requirePermission('incident.read'), asyncHandler(async (req, res) => {
//   const pagination = parsePagination(req.query as Record<string, unknown>);
//   res.json(await scoped(req).incidents.comments(req.params.incidentId, pagination));
// }));
// incidentsRouter.get('/incidents/:incidentId/timeline', ... similar ...)

incidentsRouter.get('/incidents/:incidentId/comments', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(required(await scoped(req).incidents.comments(req.params.incidentId, pagination), 'Incident'));
}));

incidentsRouter.get('/incidents/:incidentId/timeline', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(required(await scoped(req).incidents.timeline(req.params.incidentId, pagination), 'Incident'));
}));
```

(`required` is already imported from `../util` at the top.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "missing incident"`
Expected: PASS (404).

Run: `npx vitest run server/__tests__/scope-incidents.test.ts`
Expected: PASS — the `memberB gets 403 on comments` assertion at `~128` still throws `ScopeViolationError` (existing incident, not the `undefined` guard), so 403 stays. Only non-existent id maps to 404.

- [ ] **Step 6: Commit**

```bash
git add server/scope/scopedDb.ts server/routes/incidents.ts server/__tests__/incidents-workflow.test.ts
git commit -m "fix(incidents): comments/timeline return 404 for missing incident"
```

---

### Task 3: Timeline filter kinds — wire `linked`/watcher/`priority_changed` to the right bucket

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx:122-123` (`SYSTEM_KINDS`, `CI_LINKAGE_KINDS`)

**Interfaces:**
- Consumes: `IncidentEventKind` (`src/types/incident.ts:15-38`) plus repo-emitted kinds `linked`, `watcher_added`, `watcher_removed`, `priority_changed`, `promoted_major`, `major_stood_down`, `resolved`, `reopened`, `closed`, `major_declared`, `resolution_added`, `escalated` (some are legacy but cheap to include as superset).
- Produces: detail filters "System" and "CI / Linkage" actually match the repo's modern `linked` event and watcher/priority events.

- [ ] **Step 1: Replace the two constants** at `IncidentDetail.tsx:122-123`:

```ts
// was:
// const SYSTEM_KINDS: IncidentEventKind[] = ['created', 'assigned', 'ci_linked', 'ci_unlinked', 'sla_warning', 'sla_breached'];
// const CI_LINKAGE_KINDS: IncidentEventKind[] = ['ci_linked', 'ci_unlinked', 'event_linked', 'problem_linked'];

const SYSTEM_KINDS: IncidentEventKind[] = [
  'created', 'assigned', 'priority_changed', 'promoted_major', 'major_stood_down',
  'sla_warning', 'sla_breached', 'escalated', 'major_declared', 'resolution_added',
  'reopened', 'closed', 'resolved', 'watcher_added', 'watcher_removed',
];
const CI_LINKAGE_KINDS: IncidentEventKind[] = [
  'ci_linked', 'ci_unlinked', 'event_linked', 'problem_linked', 'linked',
];
```

Everything else (`TIMELINE_FILTERS`, `filteredTimeline` branches at `~248-256`) stays — the `created→SYSTEM_KINDS` and `ci_linked→CI_LINKAGE_KINDS` branches now hit. `status_changed` has its own bucket, `comment_added` has its own, `comms_posted` its own — no change.

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: no TS errors. Manual: open an incident with a linked CI in the timeline; pick "CI / Linkage" → the `linked` event now appears.

- [ ] **Step 3: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx
git commit -m "fix(incidents): wire linked/watcher/priority timeline events into correct filters"
```

---

### Task 4: Persist `linkedProblemPublicId` end-to-end (dead RCA link + broken `?problemPublicId` filter)

**Files:**
- Modify: `src/shared/schemas/incident.ts:64-70` (`updateIncidentLinksSchema`)
- Modify: `src/types/incident.ts:67-71` (Incident type — already has field, confirm)
- Modify: `server/repositories/incidents.ts:40-44,384-436` (`SetLinksRepoInput`, `after`, column write)
- Modify: `server/routes/incidents.ts:263-285` (forward `linkedProblemPublicId`)
- Modify: `src/routes/incidents/IncidentDetail.tsx:381-399,928` (`handleSetLinks`, modal handler)
- Test: `server/__tests__/incidents-workflow.test.ts` (new describe)

**Interfaces:**
- Consumes: `LinkProblemModal` `onLink(id, publicId)` and `incidentsService.setLinks(publicId, input)`.
- Produces: `linkedProblemPublicId` stored in the Incident JSON snapshot and `Incident.linkedProblemPublicId` column; `GET /incidents?problemPublicId=` matches correctly; detail's resolution RCA link and queue filter use the real publicId.

- [ ] **Step 1: Write the failing test** — append to `server/__tests__/incidents-workflow.test.ts`:

```ts
describe('PATCH /api/v1/incidents/:publicId/links — linkedProblemPublicId', () => {
  it('stores linkedProblemPublicId and makes ?problemPublicId filter match', async () => {
    const { publicId } = await cloneIncident('lpp-' + rand());
    const problemId = `prb-fx-${rand()}`;
    const problemPublicId = `PRB-FX-${rand().toUpperCase()}`;
    // ensure the linkedProblemPublicId target exists as a Problem row so the filter has something real to match against downstream if checked
    await prisma.problem.create({
      data: {
        id: problemId,
        publicId: problemPublicId,
        tenantId: 'tenant-demo',
        status: 'open',
        applicationId: 'app-demo-1',
        data: JSON.stringify({ id: problemId, publicId: problemPublicId, status: 'open' }),
      },
    });
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}/links`).send({
      linkedProblemId: problemId,
      linkedProblemPublicId: problemPublicId,
    }));
    expect(res.status).toBe(200);
    expect(res.body.linkedProblemPublicId).toBe(problemPublicId);
    const read = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(read.body.linkedProblemPublicId).toBe(problemPublicId);
    const listed = await auth(request(app).get(`/api/v1/incidents?problemPublicId=${problemPublicId}`));
    expect((listed.body as any[]).map((i: any) => i.publicId)).toContain(publicId);
    // leave the problem row for suite teardown — reusing the same id would violate unique publicId on rerun, so deleteMany by that problem
    await prisma.problem.deleteMany({ where: { id: problemId } }).catch(() => undefined);
  });
});
```

(`cloneIncident` helper already imported/defined at top of file; `prisma` imported. `app`/ `auth`/`rand` are in scope.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "linkedProblemPublicId"`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'linkedProblemPublicId')` or status 400 (unknown key `linkedProblemPublicId` on strict schema), or `expected undefined to be 'PRB-FX-...'`.

- [ ] **Step 3: Extend the shared schema** — `src/shared/schemas/incident.ts:64-70`:

```ts
export const updateIncidentLinksSchema = z
  .object({
    affectedCIIds: z.array(z.string()).max(100).optional(),
    linkedProblemId: z.string().nullable().optional(),
    linkedProblemPublicId: z.string().nullable().optional(),
    linkedChangeIds: z.array(z.string()).max(100).optional(),
  })
  .strict();

export type UpdateIncidentLinksInput = z.infer<typeof updateIncidentLinksSchema>;
```

- [ ] **Step 4: Extend the repo input + `after` + column write** — `server/repositories/incidents.ts:40-44`:

```ts
export interface SetLinksRepoInput {
  actorId: string;
  affectedCIIds?: string[];
  linkedProblemId?: string | null;
  linkedProblemPublicId?: string | null;
  linkedChangeIds?: string[];
}
```

In `setLinks`' `after` spread at `~384`:

```ts
const after: Incident = {
  ...before,
  ...(input.affectedCIIds !== undefined ? { affectedCIIds: input.affectedCIIds } : {}),
  ...(input.linkedProblemId !== undefined
    ? { linkedProblemId: input.linkedProblemId ?? undefined }
    : {}),
  ...(input.linkedProblemPublicId !== undefined
    ? { linkedProblemPublicId: input.linkedProblemPublicId ?? undefined }
    : {}),
  ...(input.linkedChangeIds !== undefined ? { linkedChangeIds: input.linkedChangeIds } : {}),
};
```

Replace the column patch at `~414-424` (the `linkedProblemPublicId` line):

```ts
// was: ...(input.linkedProblemId !== undefined ? { linkedProblemPublicId: input.linkedProblemId ?? null } : {}),
...(input.linkedProblemPublicId !== undefined
  ? { linkedProblemPublicId: input.linkedProblemPublicId ?? null }
  : input.linkedProblemId !== undefined
    ? { linkedProblemPublicId: null }
    : {}),
```

This means: if a publicId is explicitly supplied (including explicit null for unlink), use it; otherwise if `linkedProblemId` was cleared without a publicId, clear the column to null — unlink path. If neither was supplied, leave the column untouched.

Keep the `affectedCIIds` JSON and `prisma.incidentTimelineEvent.create` details as-is; optionally add `linkedProblemPublicId` to `dataPatch.problem` details for richer timeline:

```ts
if (input.linkedProblemPublicId !== undefined) {
  (dataPatch as any).problemPublicId = { from: before.linkedProblemPublicId, to: after.linkedProblemPublicId };
}
```

- [ ] **Step 5: Forward the field in the route** — `server/routes/incidents.ts:263-274` handler body:

```ts
const wrapped = await scoped(req).incidents.setLinks(req.params.publicId, {
  actorId: req.session.userId,
  affectedCIIds: body.affectedCIIds,
  linkedProblemId: body.linkedProblemId,
  linkedProblemPublicId: (body as any).linkedProblemPublicId,
  linkedChangeIds: body.linkedChangeIds,
});
```

Once `UpdateIncidentLinksInput` includes the field, `(body as any)` is unnecessary — use `body.linkedProblemPublicId`.

- [ ] **Step 6: Wire the frontend** — `src/routes/incidents/IncidentDetail.tsx`:

Extend the `handleSetLinks` patch type at `~377`:

```ts
const handleSetLinks = async (patch: {
  affectedCIIds?: string[];
  linkedProblemId?: string | null;
  linkedProblemPublicId?: string | null;
  linkedChangeIds?: string[];
}) => {
  if (!inc) return;
  const prev = inc;
  setInc(curr => curr ? {
    ...curr,
    ...(patch.affectedCIIds !== undefined ? { affectedCIIds: patch.affectedCIIds } : {}),
    ...(patch.linkedProblemId !== undefined ? { linkedProblemId: patch.linkedProblemId ?? undefined } : {}),
    ...(patch.linkedProblemPublicId !== undefined ? { linkedProblemPublicId: patch.linkedProblemPublicId ?? undefined } : {}),
    ...(patch.linkedChangeIds !== undefined ? { linkedChangeIds: patch.linkedChangeIds } : {}),
  } : curr);
  try {
    await incidentsService.setLinks(prev.publicId, patch as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to update incident links:', err);
    setInc(prev);
  } finally {
    refreshIncident();
  }
};
```

Fix the LinkProblem wiring at `~928`:

```tsx
// was: <LinkProblemModal isOpen={linkProblemOpen} onClose={() => setLinkProblemOpen(false)} currentProblemId={inc?.linkedProblemId} onLink={(id) => handleSetLinks({ linkedProblemId: id })} />
<LinkProblemModal
  isOpen={linkProblemOpen}
  onClose={() => setLinkProblemOpen(false)}
  currentProblemId={inc?.linkedProblemId}
  onLink={(id, publicId) => handleSetLinks({ linkedProblemId: id, linkedProblemPublicId: publicId })}
/>
```

(`LinkProblemModal` already exposes `onLink: (problemId, problemPublicId) => void` at `LinkProblemModal.tsx:14` — no change there.)

- [ ] **Step 7: Run the backend test to verify it passes**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "linkedProblemPublicId"`
Expected: PASS.

Manual: link a problem from detail, reopen detail — the "Linked problem" header and the Resolution "Linked to … for full RCA" link at `IncidentDetail.tsx:791-801` now appear; `incidentsService.list({ query: { problemPublicId } })` matches.

- [ ] **Step 8: Commit**

```bash
git add src/shared/schemas/incident.ts server/repositories/incidents.ts server/routes/incidents.ts src/routes/incidents/IncidentDetail.tsx server/__tests__/incidents-workflow.test.ts
git commit -m "fix(incidents): persist linkedProblemPublicId; wire list filter and detail RCA link"
```

---

### Task 5: Unlink CIs + linked problems/changes from the detail page

**Files:**
- Modify: `src/components/incidents/LinkCIModal.tsx:29-116` (full-set toggle)
- Modify: `src/routes/incidents/IncidentDetail.tsx:628-662,680-735,791-801` (CI full-set handler, problem un-link button, change un-link per card)

**Interfaces:**
- Consumes: `handleSetLinks` from Task 4 and `updateIncidentLinksSchema` (which supports `null` for `linkedProblemId`/`linkedProblemPublicId` and empty/partial `affectedCIIds`).
- Produces: user can add AND remove CIs via the same modal; can unlink a linked problem and individual linked changes. Repo `setLinks` already diffs via `diffArr` and emits a `linked` timeline event with `added`/`removed` — no backend change.

- [ ] **Step 1: Rewrite `LinkCIModal` to full-set semantics** — replace `src/components/incidents/LinkCIModal.tsx:28-116` with:

```tsx
export const LinkCIModal: React.FC<Props> = ({ isOpen, onClose, currentCIIds, onLink }) => {
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState<Set<string>>(new Set());
  const { data: cis } = useResource(() => cisService.list(), []);

  React.useEffect(() => {
    if (isOpen) setWorking(new Set(currentCIIds));
  }, [currentCIIds, isOpen]);

  const allCIs = (cis ?? []).filter(ci => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ci.publicId.toLowerCase().includes(q) || ci.name.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    setWorking(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onLink([...working]);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const changed =
    working.size !== currentCIIds.length ||
    [...working].some(id => !currentCIIds.includes(id));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Configuration Items" size="md">
      <div className="py-4 space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full h-9 pl-8 pr-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <div className="border border-ois-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {allCIs.length === 0 ? (
            <p className="text-xs text-ois-text-subtle text-center py-8">No CIs found</p>
          ) : (
            allCIs.map(ci => {
              const checked = working.has(ci.id);
              return (
                <label key={ci.id} className={cn('flex items-center gap-3 px-4 py-3 border-b border-ois-border last:border-0 hover:bg-ois-surface-muted cursor-pointer')}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(ci.id)} className="w-4 h-4 rounded text-ois-primary" />
                  <span className="font-mono text-xs text-ois-primary shrink-0">{ci.publicId}</span>
                  <span className="text-sm font-medium text-ois-text flex-1 truncate">{ci.name}</span>
                  <span className="text-xs text-ois-text-subtle capitalize shrink-0">{ci.type}</span>
                  {healthBadge(ci.health)}
                </label>
              );
            })
          )}
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-ois-border mt-4">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!changed}>
            {working.size === 0 ? 'Clear all' : `Save (${working.size})`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

`React` must be in scope (already imported). The modal now supports fully clearing CIs and toggling any item. Selected count on the button reads from `working.size`. The "no-CIs" / primary link of an empty set is intentional unlink-all.

- [ ] **Step 2: Fix the caller in `IncidentDetail.tsx` — pass the full set, not append:**

At `~927` replace:

```tsx
// was: <LinkCIModal isOpen={linkCIOpen} onClose={() => setLinkCIOpen(false)} currentCIIds={inc.affectedCIIds} onLink={newIds => handleSetLinks({ affectedCIIds: [...inc.affectedCIIds, ...newIds] })} />
<LinkCIModal isOpen={linkCIOpen} onClose={() => setLinkCIOpen(false)} currentCIIds={inc.affectedCIIds} onLink={ids => handleSetLinks({ affectedCIIds: ids })} />
```

- [ ] **Step 3: Add an Unlink button for the linked problem** — replace the linked-problem `SectionCard` body at `~680-703` (linked case):

```tsx
// inside SectionCard title={`Linked problem (1)`} — when linkedProblem true:
<div className="flex items-center justify-between gap-3">
  <div className="min-w-0">
    <p className="font-mono text-sm font-semibold text-purple-700">{linkedProblem.publicId}</p>
    <p className="text-sm text-ois-text mt-0.5 truncate">{linkedProblem.title}</p>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-ois-text-muted capitalize">{linkedProblem.status.replace('_', ' ')}</span>
      <span className="text-ois-text-subtle">·</span>
      <span className="text-xs text-ois-text-muted">{linkedProblem.relatedIncidentCount} related incidents</span>
    </div>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Button variant="ghost" size="sm" onClick={() => handleSetLinks({ linkedProblemId: null, linkedProblemPublicId: null })}>Unlink</Button>
    <Button variant="outline" size="sm" onClick={() => navigate(`/problems/${linkedProblem.publicId}`)}>Open</Button>
  </div>
</div>
```

- [ ] **Step 4: Add per-card Unlink for linked changes** — inside the `linkedChangeIds` map at `~705-734`, add an Unlink affordance per card:

```tsx
{inc.linkedChangeIds!.map(id => {
  const chg = (changesData ?? []).find(c => c.id === id || c.publicId === id);
  return (
    <div key={id} className="p-2 rounded-lg bg-ois-bg border border-ois-border">
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="font-mono text-xs font-bold text-ois-primary truncate">{id}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleSetLinks({ linkedChangeIds: (inc.linkedChangeIds ?? []).filter(x => x !== id) })}
            className="text-xs text-ois-text-subtle hover:text-ois-danger"
          >
            Unlink
          </button>
          <Link to={`/changes/${id}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
            <ExternalLink size={10} /> View
          </Link>
        </div>
      </div>
      {/* ...chg title/risk pills unchanged... */}
    </div>
  );
})}
```

If `linkedChangeIds` is `null`/empty, the section already shows the "Link change" button — keep as is.

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: no TS errors. Manual: open incident → Link CI now allows untoggling + "Clear all"; problem section shows Unlink; change cards show per-card Unlink.

- [ ] **Step 6: Commit**

```bash
git add src/components/incidents/LinkCIModal.tsx src/routes/incidents/IncidentDetail.tsx
git commit -m "feat(incidents): add unlink for CIs/problem/changes on detail page"
```

---

### Task 6: Watcher section — always show "Add watcher" + per-watcher remove

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx:400-420,880-894,930` (watcher section + `handleRemoveWatcher`, import)

**Interfaces:**
- Consumes: `incidentsService.addWatcher(inc.id, { userId, userName })` (POST) and `incidentsService.removeWatcher(inc.id, userId)` (DELETE → now 404 on missing, 204 on success per Task 1 of the hardening plan). Uses `UserPickerModal` + `usersService.list()`.
- Produces: a detail page where a watcher-less incident can add a watcher, and any existing watcher can be removed (owner removes themselves or assignee ops).

- [ ] **Step 1: Add the remove handler** — after `handleAddWatcher` at `~400-420`, add:

```ts
const handleRemoveWatcher = async (userId: string) => {
  if (!inc) return;
  const snapshot = inc;
  setInc(prev => prev ? { ...prev, watchers: (prev.watchers ?? []).filter(w => w.userId !== userId) } : prev);
  try {
    await incidentsService.removeWatcher(inc.id, userId);
    await refreshIncident();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove watcher:', err);
    setInc(snapshot);
  }
};
```

- [ ] **Step 2: Make the watchers rail always visible and add Remove** — replace the guarded section at `~880-894`:

```tsx
<CollapsibleSection title={`Watchers (${watchers.length})`} defaultOpen>
  {watchers.length === 0 ? (
    <p className="text-sm text-ois-text-subtle text-center py-4">No watchers yet.</p>
  ) : (
    <ul className="space-y-2">
      {watchers.map(w => (
        <li key={w.id} className="flex items-center gap-2">
          <Avatar name={w.name} size="xs" />
          <span className="text-xs text-ois-text flex-1">{w.name}</span>
          <Can module="incident" action="update" resource={inc ? incidentResource(inc) : undefined}>
            <button
              onClick={() => void handleRemoveWatcher(w.id)}
              className="text-xs text-ois-text-subtle hover:text-ois-danger"
              title="Remove watcher"
            >
              Remove
            </button>
          </Can>
        </li>
      ))}
    </ul>
  )}
  <Can module="incident" action="update" resource={inc ? incidentResource(inc) : undefined}>
    <button onClick={() => setAddWatcherOpen(true)} className="mt-3 text-xs text-ois-primary hover:underline flex items-center gap-1">
      <Plus size={12} /> Add watcher
    </button>
  </Can>
</CollapsibleSection>
```

Keep `<UserPickerModal ... onSelect={userId => handleAddWatcher(userId)} />` at the bottom unchanged (`~930`).

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: no TS errors. Manual: open incident with no watchers → Watchers collapsible is present and "Add watcher" is clickable; added watcher row shows "Remove".

- [ ] **Step 4: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx
git commit -m "feat(incidents): watcher add/remove affordance on detail page"
```

---

### Task 7: Assign incident from the detail page

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx:160-175,296-310,402-405,485-515,930` (picker, handler, header button)
- No backend change — `PATCH /incidents/:publicId/assign` already exists and is read-scoped.

**Interfaces:**
- Consumes: `incidentsService.assign(publicId, { assigneeId, assigneeName })` + `usersService.list()` + `incidentResource(inc)` + `Can action="assign"`.
- Produces: a detail-page "Assign" control that opens `UserPickerModal` and writes through the app-scoped assign endpoint (409/403 outside own app, shared-unassigned pool allows assign for any incident.create-visible user).

- [ ] **Step 1: Add modal + handler state** — near `addWatcherOpen` at `~224-229`, add:

```ts
const [assignIncidentOpen, setAssignIncidentOpen] = useState(false);
```

After `handleAddWatcher` / `handleRemoveWatcher`, add:

```ts
const handleAssignIncident = async (userId: string) => {
  if (!inc) return;
  const picked = mockUsers.find(u => u.id === userId);
  const prev = inc;
  setInc(curr => curr ? { ...curr, assigneeId: userId, assigneeName: picked?.name } : curr);
  try {
    await incidentsService.assign(prev.publicId, { assigneeId: userId, assigneeName: picked?.name });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to assign incident:', err);
    setInc(prev);
  } finally {
    refreshIncident();
  }
};

const handleUnassignIncident = async () => {
  if (!inc) return;
  const prev = inc;
  setInc(curr => curr ? { ...curr, assigneeId: undefined, assigneeName: undefined } : curr);
  try {
    await incidentsService.assign(prev.publicId, { assigneeId: null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to unassign incident:', err);
    setInc(prev);
  } finally {
    refreshIncident();
  }
};
```

- [ ] **Step 2: Add the header control** — in the detail header's right actions (next to the status dropdown, before overflow) at `~494-530`, inject alongside the `Can update` block:

```tsx
<Can module="incident" action="assign" resource={inc ? incidentResource(inc) : undefined} fallback={null}>
  <div className="flex items-center gap-1.5">
    <Button variant="outline" size="sm" onClick={() => setAssignIncidentOpen(true)}>
      {assignee ? assignee.name : 'Assign…'}
    </Button>
    {assignee && (
      <button
        onClick={() => void handleUnassignIncident()}
        className="text-xs text-ois-text-subtle hover:text-ois-danger"
        title="Unassign"
      >
        Clear
      </button>
    )}
  </div>
</Can>
```

(`assignee` is already derived at `~296` as `getUserById(mockUsers, inc?.assigneeId)` — in scope here.)

- [ ] **Step 3: Mount the picker at the bottom of the page** — alongside the existing modals at `~930`:

```tsx
<UserPickerModal
  isOpen={assignIncidentOpen}
  onClose={() => setAssignIncidentOpen(false)}
  title="Assign incident"
  onSelect={userId => void handleAssignIncident(userId)}
/>
```

(`UserPickerModal` is already imported; no new imports.)

- [ ] **Step 4: Typecheck**

Run: `npm run lint`
Expected: no TS errors. Manual: open incident detail → Assign button in the header shows the current assignee or "Assign…" → picker → incident updates → timeline shows `assigned` event.

- [ ] **Step 5: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx
git commit -m "feat(incidents): assign/unassign incident from detail header"
```

---

### Task 8: Make "Resolve" honest — rollback on failure + persist `suggestKB`/`schedulePIR`

**Files:**
- Modify: `src/shared/schemas/incident.ts:14-18` (`resolveIncidentSchema`)
- Modify: `server/repositories/incidents.ts:8-13,137-191` (`ResolveInput`, `resolve()`), update `Incident` resolution type if decorated there
- Modify: `src/types/incident.ts:80-86` (`Incident['resolution']` optional flags)
- Modify: `server/routes/incidents.ts:111-134` (forward new fields)
- Modify: `src/routes/incidents/IncidentDetail.tsx:205-217,318-334,920-925` (`resolvedData` shape, `handleResolve`, modal wiring)

**Interfaces:**
- Consumes: `ResolveIncidentModal` `ResolveData { summary, rootCause, workaround, suggestKB, schedulePIR }` and `incidentsService.resolve(publicId, input)`.
- Produces: `POST /incidents/:publicId/resolve` persists the two flags in `inc.resolution.suggestKB/schedulePIR`; `handleResolve` rolls back `setStatus('resolved')` + `setResolvedData` on failure via the same pattern as `handleStatusChange`.

- [ ] **Step 1: Write the failing test** — append to `server/__tests__/incidents-workflow.test.ts`:

```ts
describe('POST /api/v1/incidents/:publicId/resolve — flags', () => {
  it('persists suggestKB and schedulePIR in the resolution block', async () => {
    const { publicId } = await cloneIncident('rfl-' + rand());
    const res = await auth(request(app).post(`/api/v1/incidents/${publicId}/resolve`).send({
      summary: 'resolved for flags test',
      suggestKB: true,
      schedulePIR: true,
    }));
    expect(res.status).toBe(200);
    expect(res.body.resolution.suggestKB).toBe(true);
    expect(res.body.resolution.schedulePIR).toBe(true);
    const read = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(read.body.resolution.suggestKB).toBe(true);
    expect(read.body.resolution.schedulePIR).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "suggestKB and schedulePIR"`
Expected: FAIL — `expected undefined to be true` (fields not yet accepted/stored).

- [ ] **Step 3: Extend the shared schema** — `src/shared/schemas/incident.ts:14`:

```ts
export const resolveIncidentSchema = z.object({
  summary: z.string().min(1, 'Summary is required').max(2000),
  rootCause: z.string().max(2000).optional(),
  workaround: z.string().max(2000).optional(),
  suggestKB: z.boolean().optional().default(false),
  schedulePIR: z.boolean().optional().default(false),
});

export type ResolveIncidentInput = z.infer<typeof resolveIncidentSchema>;
```

No `.strict()` here, so new keys pass.

- [ ] **Step 4: Extend the type + repo input + `resolve()`** — `src/types/incident.ts:80` add to `resolution`:

```ts
resolution?: {
  summary: string;
  rootCause?: string;
  workaround?: string;
  resolvedAt: string;
  resolvedBy: string;
  suggestKB?: boolean;
  schedulePIR?: boolean;
};
```

`server/repositories/incidents.ts:8` add to `ResolveInput`:

```ts
export interface ResolveInput {
  summary: string;
  rootCause?: string;
  workaround?: string;
  resolvedBy: string;
  suggestKB?: boolean;
  schedulePIR?: boolean;
}
```

In `resolve()` at `~149-160` propagate into `after.resolution`:

```ts
const after: Incident = {
  ...before,
  status: 'resolved',
  resolution: {
    summary: input.summary,
    rootCause: input.rootCause,
    workaround: input.workaround,
    resolvedAt: now.toISOString(),
    resolvedBy: input.resolvedBy,
    suggestKB: input.suggestKB ?? false,
    schedulePIR: input.schedulePIR ?? false,
  },
};
```

Keep `timelineEvent.details` at `~169` unchanged (summary only) — no new detail fields needed.

- [ ] **Step 5: Forward the fields in the route** — `server/routes/incidents.ts:117-122`:

```ts
const wrapped = await scoped(req).incidents.resolve(req.params.publicId, {
  summary: body.summary,
  rootCause: body.rootCause,
  workaround: body.workaround,
  resolvedBy: req.session.userId,
  suggestKB: (body as any).suggestKB,
  schedulePIR: (body as any).schedulePIR,
});
```

(Once `ResolveIncidentInput` includes the fields, `(body as any)` is unnecessary — use `body.suggestKB`.)

- [ ] **Step 6: Fix the frontend rollback + pass the flags** — `src/routes/incidents/IncidentDetail.tsx`:

Extend `resolvedData` state wiring at `~205-217` — keep `ResolveData` as-is; the modal already collects `suggestKB`/`schedulePIR`. Replace `handleResolve` at `~318-334` with:

```ts
const handleResolve = async (data: ResolveData) => {
  if (!inc) return;
  const prev = inc;
  const prevResolvedData = resolvedData;
  setResolvedData(data);
  setStatus('resolved');
  try {
    await incidentsService.resolve(inc.publicId, {
      summary: data.summary,
      rootCause: data.rootCause,
      workaround: data.workaround,
      suggestKB: data.suggestKB,
      schedulePIR: data.schedulePIR,
    } as any);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to persist incident resolution:', err);
    setInc(prev);
    setResolvedData(prevResolvedData);
    if (prev.status !== 'resolved') setStatus(prev.status as IncidentStatus);
  } finally {
    refreshIncident();
  }
};
```

Ensure `ResolveIncidentInput` re-export from `src/services/incidentsService.ts` includes the new fields (it re-exports the type, so no edit). Add `IncidentStatus` to the import list if not already there (it is at `~15`).

- [ ] **Step 7: Run the tests + lint**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "suggestKB and schedulePIR"`
Expected: PASS.

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts`
Expected: PASS.

Run: `npm run lint`
Expected: no TS errors. Manual: resolve an incident with KB+PIR checked → reload → resolution section persists both flags (render is not required to show them, but the GET body contains them; if desired, read `inc.resolution.suggestKB` in the Resolution collapsible — out of scope for this task).

- [ ] **Step 8: Commit**

```bash
git add src/shared/schemas/incident.ts server/repositories/incidents.ts server/routes/incidents.ts src/types/incident.ts src/routes/incidents/IncidentDetail.tsx server/__tests__/incidents-workflow.test.ts
git commit -m "fix(incidents): rollback on resolve failure; persist suggestKB/schedulePIR"
```

---

## Self-Review

**1. Spec coverage:**
- D1 (IncidentCounter global → per-tenant + composite unique) → Task 1 ✓
- D2 (comments/timeline missing-incident: 200 [] → 404) → Task 2 ✓
- System/CI filter dead (`linked`/watcher/priority into wrong bucket) → Task 3 ✓
- `linkedProblemPublicId` dropped (dead RCA link + broken `?problemPublicId` filter) → Task 4 ✓
- Unlink CIs/problem/change (add-only links) → Task 5 ✓
- Watchers add-when-empty + remove → Task 6 ✓
- No assign on detail → Task 7 ✓
- Resolve failure no rollback + `suggestKB`/`schedulePIR` cosmetic → Task 8 ✓
- Deferred, deliberately not in plan: composer `parentCommentId`/`isInternal`/mentions threading, service-rail `/cmdb/<service.id>` link, `created` event `actorName` blank, priority/tags edit on detail, war-room CTA from detail (needs design decision), pagination/F4.

**2. Placeholder scan:** No TBD/TODO/"similar to Task N". Every backend task has a concrete failing test + expected failure string; every frontend change shows the exact JSX patch and the `handle*` bodies; migration SQL is literal.

**3. Type consistency:** `IncidentCounter` name `tenantId_year` matches `@@id([tenantId, year])` in schema; `IncidentsScope.comments/timeline` nullability matches route `required()` + test; `ResolveIncidentInput.suggestKB/schedulePIR` and `Incident['resolution']` flags share the same optionality+default (`false`) across repo/route/service/detail.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-29-incidents-detail-followup.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
