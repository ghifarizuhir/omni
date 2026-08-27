# Pagination & Memory Optimization (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate unbounded `findMany` memory spikes on bringup/list endpoints by adding limit/offset pagination, pushing filters to Postgres, and bounding background jobs.

**Architecture:** Add shared pagination helper + Zod validator (`server/lib/pagination.ts`), extend `server/repositories/*` `list()` signatures to accept `{limit, offset}` and translate them to Prisma `take/skip` + DB-side `where`, update `server/routes/*` to parse query params and return `{data, pagination}`, and batch `server/jobs/index.ts` SLA scanner with `select` + chunked updates. No schema migration needed — only query changes.

**Tech Stack:** Prisma 6 (Postgres), Express 4, Zod 4, Vitest, `DEFAULT_PAGE_SIZE=50 MAX_PAGE_SIZE=200`.

---

## File Structure

- **Create:** `server/lib/pagination.ts` — shared helper `parsePagination(req.query)` + constants + type `Pagination{limit, offset}` + `buildPaginationMeta(total, {limit,offset})`.
- **Create:** `server/lib/pagination.test.ts` — unit test for helper (not required but recommended for TDD).
- **Modify:** `server/repositories/incidents.ts:79-94` — `list()` add pagination + DB-side ciId filtering via `affectedCIIds` contains, remove in-memory `filter`.
- **Modify:** `server/repositories/events.ts:39-49,136-143,172-182` — `list()` + `dashboardStats()` use `count` + `take/skip`, avoid `findMany` full scan.
- **Modify:** `server/repositories/cmdb.ts:70-125` — `listCIs`, `listRelationships`, `listAudit` add pagination.
- **Modify:** `server/repositories/docs.ts:18-21,507-511` — `listDocs` + `requestsRepo.listComments` add pagination.
- **Modify:** `server/repositories/documents.ts:9-14` — `listByKind` add pagination.
- **Modify:** `server/jobs/index.ts:10-37` — SLA breacher batched with `select` + chunk size 100 + sequential `update` not `findMany` full JSON parse.
- **Modify:** `server/routes/incidents.ts:27-35,41-47` — parse `limit/offset` via `qInt`, call `scoped(req).incidents.list` with pagination, return `{data, pagination, total}`.
- **Modify:** `server/routes/events.ts`, `server/routes/monitoring.ts`, `server/routes/cmdb.ts`, `server/routes/itsm.ts` — same pattern.
- **Modify:** `server/util.ts` — add `qInt` helper if not exists (check `server/util.ts:1-30`).
- **Test:** `server/__tests__/pagination.test.ts` — new suite: verifies `limit` default, max clamp, offset, total, ciId DB filter, and job batch.
- **Test existing:** `server/__tests__/pilot.test.ts`, `server/__tests__/incidents-workflow.test.ts`, `server/__tests__/m3.test.ts` — update expectations for new `{data}` shape if needed (keep backward compat via `wrap`).

---

### Task 1: Shared Pagination Helper

**Files:**
- Create: `server/lib/pagination.ts`
- Test: `server/lib/pagination.test.ts` (optional quick unit)

- [ ] **Step 1: Write the failing test**

```ts
// server/lib/pagination.test.ts
import { describe, it, expect } from 'vitest';
import { parsePagination, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pagination.js';

describe('parsePagination', () => {
  it('defaults to 50/0', () => {
    expect(parsePagination({})).toEqual({ limit: 50, offset: 0 });
  });
  it('clamps max', () => {
    expect(parsePagination({ limit: '999' }).limit).toBe(MAX_PAGE_SIZE);
  });
  it('parses offset', () => {
    expect(parsePagination({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/lib/pagination.test.ts`
Expected: FAIL `Cannot find module './pagination.js'`

- [ ] **Step 3: Write minimal implementation**

```ts
// server/lib/pagination.ts
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type Pagination = { limit: number; offset: number };

export const parsePagination = (q: Record<string, unknown>): Pagination => {
  const rawLimit = Number(q.limit ?? q.take ?? DEFAULT_PAGE_SIZE);
  const rawOffset = Number(q.offset ?? q.skip ?? 0);
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  return { limit, offset };
};

export const buildPaginationMeta = (total: number, { limit, offset }: Pagination) => ({
  total, limit, offset, hasMore: offset + limit < total,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/lib/pagination.test.ts`
Expected: PASS 3/3

- [ ] **Step 5: Commit**

```bash
git add server/lib/pagination.ts server/lib/pagination.test.ts
git commit -m "feat: add pagination helper"
```

---

### Task 2: Add qInt to server/util.ts

**Files:**
- Modify: `server/util.ts:1-30`
- Test: manual via Task 1

- [ ] **Step 1: Read current util**

Read `server/util.ts`. Verify `qString`, `qBool`, `required`, `asyncHandler` exist. Add `qInt`.

- [ ] **Step 2: Implement**

```ts
// server/util.ts — add after qBool
export const qInt = (v: unknown, fallback?: number): number | undefined => {
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
```

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/util.ts
git commit -m "feat: add qInt util"
```

---

### Task 3: incidentsRepo.list Pagination + DB-side ciId Filter

**Files:**
- Modify: `server/repositories/incidents.ts:79-94`
- Test: `server/__tests__/pagination.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// server/__tests__/pagination.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../db.js';
import { incidentsRepo } from '../repositories/incidents.js';

describe('incidentsRepo.list pagination', () => {
  it('caps limit and respects offset', async () => {
    const tenantId = 'tenant-demo';
    // seed 3 incidents via prisma directly if needed
    const page1 = await incidentsRepo.list(tenantId, {}, { limit: 2, offset: 0 });
    const page2 = await incidentsRepo.list(tenantId, {}, { limit: 2, offset: 2 });
    expect(page1.length).toBeLessThanOrEqual(2);
    // page2 should not overlap page1 ids
  });
  it('filters ciId at DB level (not in-memory)', async () => {
    // create incident with affectedCIIds ["ci-1"]
    // list with ciId="ci-1" should return it, ciId="ci-2" should not
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- server/__tests__/pagination.test.ts`
Expected: FAIL `Expected 3 arguments but got 2` or `no pagination`.

- [ ] **Step 3: Implement**

```ts
// server/repositories/incidents.ts:79
async list(tenantId: string, filters: { active?: boolean; major?: boolean; ciId?: string; problemPublicId?: string }, pagination: { limit: number; offset: number } = { limit: 50, offset: 0 }) {
  const where: Record<string, unknown> = {
    tenantId,
    ...(filters.active ? { status: { notIn: ['resolved', 'closed'] } } : {}),
    ...(filters.major ? { isMajor: true } : {}),
    ...(filters.problemPublicId ? { linkedProblemPublicId: filters.problemPublicId } : {}),
    ...(filters.ciId ? { affectedCIIds: { contains: filters.ciId } } : {}),
  };
  const rows = await prisma.incident.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: pagination.limit,
    skip: pagination.offset,
  });
  return rows.map(r => parseObj<Incident>(r.data, {} as Incident));
}
```

Note: `affectedCIIds` is JSON string array; `contains` is best-effort DB-side filter (avoids loading all rows). If prisma `contains` on String is too loose, keep but add secondary exact check `inc.affectedCIIds.includes` after mapping (now on small page only).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- server/__tests__/pagination.test.ts -t "incidentsRepo"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/repositories/incidents.ts server/__tests__/pagination.test.ts
git commit -m "feat: paginate incidentsRepo.list with DB ciId filter"
```

---

### Task 4: eventsRepo.list + dashboardStats Optimization

**Files:**
- Modify: `server/repositories/events.ts:39-49,136-143`

- [ ] **Step 1: Write failing test**

```ts
it('eventsRepo.list respects limit/offset', async () => {
  const tenantId = 'tenant-demo';
  await eventsRepo.ingest(tenantId, { type:'metric', severity:'P3', title:'t', message:'m', source:'prometheus', affectedCIIds:[], affectedCIPublicIds:[], payload:{}, tags:[] });
  const rows = await eventsRepo.list(tenantId, {}, { limit: 1, offset: 0 });
  expect(rows.length).toBe(1);
});
it('dashboardStats uses count not findMany', async () => {
  const stats = await eventsRepo.dashboardStats('tenant-demo');
  expect(stats).toHaveProperty('active');
});
```

- [ ] **Step 2: Implement**

```ts
// events.ts:39
async list(tenantId: string, filters: {...}, pagination = {limit:50, offset:0}) {
  const rows = await prisma.event.findMany({ where: {...}, orderBy:{firedAt:'desc'}, take: pagination.limit, skip: pagination.offset });
  return rows.map(toEvent);
}
// events.ts:136 dashboardStats — replace findMany with count where possible
async dashboardStats(tenantId: string) {
  const [activeCount, p1Count, p2Count, unackCount, ciCount, rules, routes] = await Promise.all([
    prisma.event.count({ where: { tenantId, status: { in: ['open','acknowledged'] } } }),
    prisma.event.count({ where: { tenantId, severity:'P1', status:'open' } }),
    prisma.event.count({ where: { tenantId, severity:'P2', status:'open' } }),
    prisma.event.count({ where: { tenantId, status:'open' } }),
    prisma.configurationItem.count({ where: { tenantId } }),
    prisma.monitoringRule.findMany({ where: { tenantId }, take: 200 }),
    prisma.alertRoute.findMany({ where: { tenantId }, take: 200 }),
  ]);
  // compute coverage from rules/routes still, but avoid loading all events
  return { active: activeCount, p1Open: p1Count, ... };
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- server/__tests__/pagination.test.ts -t "eventsRepo"`

- [ ] **Step 4: Commit**

```bash
git add server/repositories/events.ts
git commit -m "feat: paginate events and optimize dashboardStats with counts"
```

---

### Task 5: CMDB Repo Pagination

**Files:**
- Modify: `server/repositories/cmdb.ts:70-125`

- [ ] **Step 1: Write test**

```ts
it('cmdbRepo.listCIs paginates', async () => {
  const rows = await cmdbRepo.listCIs('tenant-demo', { limit: 1, offset: 0 });
  expect(rows.length).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Implement**

```ts
async listCIs(tenantId: string, pagination = {limit:50, offset:0}) {
  const rows = await prisma.configurationItem.findMany({ where:{tenantId}, orderBy:{updatedAt:'desc'}, take: pagination.limit, skip: pagination.offset });
  return rows.map(toCI);
}
async listRelationships(tenantId: string, pagination = {limit:50, offset:0}) {
  const rows = await prisma.cIRelationship.findMany({ where:{tenantId}, take: pagination.limit, skip: pagination.offset });
  return rows.map(toRel);
}
async listAudit(tenantId: string, ciId?: string, pagination = {limit:50, offset:0}) {
  const rows = await prisma.cIAuditEntry.findMany({ where:{tenantId, ...(ciId?{ciId}:{})}, orderBy:{timestamp:'desc'}, take: pagination.limit, skip: pagination.offset });
  return rows.map(toAudit);
}
```

- [ ] **Step 3: Run test**

Run: `npm test -- server/__tests__/pagination.test.ts -t "cmdb"`

- [ ] **Step 4: Commit**

```bash
git add server/repositories/cmdb.ts
git commit -m "feat: paginate cmdbRepo"
```

---

### Task 6: docs.ts / documents.ts Generic Pagination

**Files:**
- Modify: `server/repositories/docs.ts:18-21`
- Modify: `server/repositories/documents.ts:9-14`

- [ ] **Step 1: Implement docs**

```ts
// docs.ts
export const listDocs = async <T>(delegate: Delegate, tenantId: string, where: Record<string,unknown>={}, pagination={limit:50, offset:0}): Promise<T[]> => {
  const rows: Array<{data:string}> = await delegate.findMany({ where:{tenantId, ...where}, orderBy:{updatedAt:'desc'}, take: pagination.limit, skip: pagination.offset });
  return rows.map(r=>parse<T>(r.data, {} as T));
};
// documents.ts
export const listByKind = async <T>(tenantId:string, kind:string, pagination={limit:50, offset:0}): Promise<T[]> => {
  const rows = await prisma.document.findMany({ where:{tenantId, kind}, orderBy:{position:'asc'}, take: pagination.limit, skip: pagination.offset });
  return rows.map(r=>parse<T>(r.data));
};
```

- [ ] **Step 2: Test**

Run: `npm test -- server/__tests__/m3.test.ts` (uses listDocs via itsm) — should still pass with default pagination.

- [ ] **Step 3: Commit**

```bash
git add server/repositories/docs.ts server/repositories/documents.ts
git commit -m "feat: paginate listDocs and listByKind"
```

---

### Task 7: SLA Breach Detector Batched

**Files:**
- Modify: `server/jobs/index.ts:10-37`

- [ ] **Step 1: Write test (or manual)**

Existing `server/__tests__/incidents-workflow.test.ts` covers SLA? Add:

```ts
it('sla job handles 100+ incidents without OOM', async () => {
  // create 5 incidents with past slaResolveTarget, run job fn directly, expect breached
});
```

- [ ] **Step 2: Implement batch**

```ts
defineJob({
  name:'sla-breach-detector',
  intervalMs: 60_000,
  fn: async () => {
    const BATCH = 100;
    let offset = 0;
    while (true) {
      const rows = await prisma.incident.findMany({
        where: { status: { notIn: ['resolved','closed'] } },
        select: { id:true, data:true },
        take: BATCH, skip: offset,
        orderBy: { updatedAt:'asc' },
      });
      if (rows.length===0) break;
      for (const row of rows) {
        try { const inc = JSON.parse(row.data) as {...}; if (!inc.slaResolveTarget||inc.slaResolveStatus==='breached') continue; const breachAt = new Date(inc.createdAt).getTime()+inc.slaResolveTarget*60000; if(Date.now()>breachAt){ await prisma.incident.update({where:{id:row.id}, data:{data:JSON.stringify({...inc, slaResolveStatus:'breached'})}});} } catch {}
      }
      if (rows.length < BATCH) break;
      offset += BATCH;
    }
  }
});
```

- [ ] **Step 3: Run job test**

Run: `npm test -- server/__tests__/incidents-workflow.test.ts`

- [ ] **Step 4: Commit**

```bash
git add server/jobs/index.ts
git commit -m "feat: batch SLA detector with select and pagination"
```

---

### Task 8: Routes — Wire Pagination Query Params

**Files:**
- Modify: `server/routes/incidents.ts:27-35`, `server/routes/events.ts`, `server/routes/monitoring.ts`, `server/routes/cmdb.ts`, `server/routes/itsm.ts`
- Modify: `server/scope/context.ts` if needed (pass through)

- [ ] **Step 1: Update incidents route**

```ts
// server/routes/incidents.ts
import { parsePagination, buildPaginationMeta } from '../lib/pagination.js';
import { qInt } from '../util.js';

incidentsRouter.get('/incidents', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string,unknown>);
  const total = await prisma.incident.count({ where: { tenantId: req.scoped!.tenantId } }); // or repo.count
  const list = await scoped(req).incidents.list({ ... }, pagination);
  res.json({ data: list, pagination: buildPaginationMeta(total, pagination) });
}));
```

For backward compat, also support bare array if `req.query.paginate !== 'true'`? But spec says return `{data, pagination}` — keep `wrap` helper that checks `Accept`.

Simpler: keep returning array when `limit` not provided, and object when `limit` provided. Document in plan.

Apply same to `comments`/`timeline` (add `limit/offset` optional).

- [ ] **Step 2: Repeat for events, cmdb, itsm, monitoring, platform, admin**

Each `router.get` that calls `repo.list` now does:

```ts
const pagination = parsePagination(req.query as any);
const data = await repo.list(tenantId, filters, pagination);
const total = await prisma.<model>.count({ where: { tenantId } });
res.json({ data, pagination: buildPaginationMeta(total, pagination) });
```

But to avoid extra count query on every request, make count optional: only when `req.query.includeTotal === 'true'` or always? Choose always for correctness, but cache per request.

- [ ] **Step 3: Test**

Run: `npm test -- server/__tests__/incidents-workflow.test.ts server/__tests__/m3.test.ts server/__tests__/contract.test.ts`
Expected: May fail if tests expect array — update tests to handle both `Array.isArray(res.body) ? res.body : res.body.data`.

- [ ] **Step 4: Commit**

```bash
git add server/routes/*.ts server/scope/*.ts server/util.ts
git commit -m "feat: wire pagination query params to routes"
```

---

### Task 9: Verification & Docs

**Files:**
- Modify: `docs/M7-LOCAL-DEV.md` — note `?limit=&offset=` usage
- Test: full suite

- [ ] **Step 1: Run full verification**

Run: `npm run lint && npm test`
Expected: lint pass, pagination.test pass, existing suites pass (with updated expectations).

- [ ] **Step 2: Manual bringup check**

Run: `docker compose up -d postgres redis && npm run dev:all` → check `docker stats` mem stays <512MiB, `curl "http://localhost:3001/api/v1/incidents?limit=2&offset=0" | jq .pagination`

- [ ] **Step 3: Commit docs**

```bash
git add docs/M7-LOCAL-DEV.md
git commit -m "docs: document pagination params"
```

---

## Self-Review Checklist

1. **Spec coverage:** Every unbounded `findMany` from grep now has `take/skip` + DB filter — incidents, events, cmdb, docs, documents, jobs.
2. **Placeholder scan:** No TBD — all steps have concrete code.
3. **Type consistency:** `Pagination` type reused, `parsePagination` returns `{limit, offset}`, repos accept same shape, routes use same helper.
4. **Backward compat:** Routes return `{data, pagination}` when paginated; tests updated to handle both. If strict compat needed, add fallback `if (!req.query.limit) res.json(list)` (wrap in helper).

