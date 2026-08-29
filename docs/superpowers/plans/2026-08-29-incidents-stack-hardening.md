# Incidents Stack Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-value backend/DB and frontend defects found in the incidents-stack audit: a real 404 for missing watchers, persisted description edits, persisted reporter channel, race-safe/transactional incident creation, read-scoped `get`/`comments`/`timeline`, the resolved-status no-op, hardcoded demo user, and the unassigned-app scope trap.

**Architecture:** Layer-consistent, test-first changes. Backend fixes land in the repo + scope layers and are proven with the existing DB-backed vitest suites (`server/__tests__/*.test.ts`). Frontend fixes are verified with `npm run lint` (tsc) since there is no frontend unit-test infra. Shared request/response schemas live in `src/shared/schemas/incident.ts` and are imported by both server routes and the client service.

**Tech Stack:** Express + Prisma + Zod (server), React + TypeScript + Vite (client), vitest + supertest (DB-backed tests).

**Spec:** `docs/audits/2026-08-29-incidents-stack-audit.md` (B1, B2, B5, B6, B7, F1, F2, F5, F6, F9). Each task argues from that doc.

## Global Constraints

- Never import `prisma`/`@prisma/client` into `server/routes/**` — use `req.scoped.*`. Enforced by eslint. Repo/scope/test files may import `prisma` from `../db`.
- Follow the `{ before, after, internalId }` + optional timeline-event shape already used by every incident mutation in `server/repositories/incidents.ts`.
- Tests are DB-backed and need running Postgres. Run single files with `npx vitest run server/__tests__/<name>.test.ts`.
- `publicId` must keep matching `/^INC-\d{4}-\d{5}$/` — existing tests assert this regex.
- Shared Zod schemas are `.strict()`; any field added to an existing schema must also be added to its `.refine` "at least one field" guard.
- Frontend-only tasks are verified by `npm run lint` + manual click-through; do not invent a frontend test runner.

---

### Task 1: Map watcher-not-found to a real 404 (B7)

**Files:**
- Modify: `server/repositories/incidents.ts` (the `removeWatcher` throw)
- Test: `server/__tests__/incidents-workflow.test.ts`

**Interfaces:**
- Consumes: existing `removeWatcher(tenantId, incidentId, userId, actorId)` signature; existing `cloneIncident`/`auth`/`rand` helpers in `incidents-workflow.test.ts`.
- Produces: `removeWatcher` throws `HttpError(404, 'Watcher not found')` when the user is not on the watchers list; global error handler maps it to a 404 JSON body.

- [ ] **Step 1: Write the failing test** — add this describe block to `server/__tests__/incidents-workflow.test.ts`:

```ts
// ── remove-watcher: not-found ──────────────────────────────────────────────
describe('DELETE /api/v1/incidents/:incidentId/watchers/:userId — watcher not found', () => {
  it('returns 404 when the user is not a watcher', async () => {
    const { internalId } = await cloneIncident('nf-' + rand());
    const res = await auth(
      request(app).delete(`/api/v1/incidents/${internalId}/watchers/nonexistent-user`),
    );
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Watcher not found' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "watcher not found"`
Expected: FAIL — currently the route returns 500 with `Internal server error`.

- [ ] **Step 3: Implement the fix** — in `server/repositories/incidents.ts`, add `HttpError` to the existing `../util` import, and replace the plain-throw branch:

```ts
import { HttpError } from '../util';
```

```ts
    if (!existing.some(w => w.userId === userId)) {
      throw new HttpError(404, 'Watcher not found');
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "watcher not found"`
Expected: PASS (404 + message).

- [ ] **Step 5: Commit**

```bash
git add server/repositories/incidents.ts server/__tests__/incidents-workflow.test.ts
git commit -m "fix(incidents): return 404 when removing a non-watcher user"
```

---

### Task 2: Persist incident description edits (F2)

**Files:**
- Modify: `src/shared/schemas/incident.ts` (updateIncidentSchema)
- Modify: `server/repositories/incidents.ts` (`UpdateRepoInput` + `update()`)
- Modify: `server/routes/incidents.ts` (PATCH `:publicId` handler)
- Modify: `src/routes/incidents/IncidentDetail.tsx` (description save handler)
- Test: `server/__tests__/incidents-workflow.test.ts`

**Interfaces:**
- Consumes: existing `incidentsService.update(publicId, input)`; existing `update()` repo mutation.
- Produces: `updateIncidentSchema` now accepts `description?: string`; `UpdateRepoInput.description?: string`; `PATCH /incidents/:publicId` accepts `{ description }` and persists it into the JSON snapshot; frontend description Save calls the API.

- [ ] **Step 1: Write the failing test** — add to `server/__tests__/incidents-workflow.test.ts`:

```ts
describe('PATCH /api/v1/incidents/:publicId — description', () => {
  it('persists a description update', async () => {
    const { publicId } = await cloneIncident('desc-' + rand());
    const res = await auth(request(app).patch(`/api/v1/incidents/${publicId}`).send({
      description: 'persisted description body',
    }));
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('persisted description body');
    const read = await auth(request(app).get(`/api/v1/incidents/${publicId}`));
    expect(read.body.description).toBe('persisted description body');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "persists a description update"`
Expected: FAIL — server returns 400 (unknown key `description` on strict schema).

- [ ] **Step 3: Extend the shared schema** in `src/shared/schemas/incident.ts`:

```ts
export const updateIncidentSchema = z
  .object({
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    description: z.string().max(5000).optional(),
  })
  .strict()
  .refine(o => o.priority !== undefined || o.tags !== undefined || o.description !== undefined, {
    message: 'At least one of priority, tags, or description is required',
  });
```

- [ ] **Step 4: Extend the repo input + mutation** in `server/repositories/incidents.ts`:

```ts
export interface UpdateRepoInput {
  actorId: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  tags?: string[];
  description?: string;
}
```

In `update()`'s `after` object, add description after the tags line:

```ts
      ...(input.description !== undefined ? { description: input.description } : {}),
```

- [ ] **Step 5: Forward description in the route** — in `server/routes/incidents.ts`, the `updateIncidentSchema.parse` body is spread into the repo call. Add description to the payload:

```ts
    const wrapped = await scoped(req).incidents.update(req.params.publicId, {
      actorId: req.session.userId,
      priority: body.priority,
      tags: body.tags,
      description: body.description,
    });
```

- [ ] **Step 6: Wire the frontend Save button** in `src/routes/incidents/IncidentDetail.tsx`. Replace the local-only Save handler with a server-backed one:

```ts
  const handleSaveDescription = async () => {
    if (!inc) return;
    const prev = inc;
    setInc(curr => curr ? { ...curr, description: descDraft } : curr);
    setEditingDesc(false);
    try {
      await incidentsService.update(inc.publicId, { description: descDraft });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist description:', err);
      setInc(prev => prev ? { ...prev, description: prev.description } : prev);
      setEditingDesc(true);
    } finally {
      refreshIncident();
    }
  };
```

And point the Save button at it (replacing the inline arrow that only did `setInc` + `setEditingDesc(false)`):

```tsx
                    <Button variant="primary" size="sm" onClick={() => void handleSaveDescription()}>Save</Button>
```

- [ ] **Step 7: Run the backend test to verify it passes**

Run: `npx vitest run server/__tests__/incidents-workflow.test.ts -t "persists a description update"`
Expected: PASS.

- [ ] **Step 8: Typecheck the frontend**

Run: `npm run lint`
Expected: no TS errors. Manually verify: open an incident, Edit description, Save, reload — description persists.

- [ ] **Step 9: Commit**

```bash
git add src/shared/schemas/incident.ts server/repositories/incidents.ts server/routes/incidents.ts src/routes/incidents/IncidentDetail.tsx server/__tests__/incidents-workflow.test.ts
git commit -m "feat(incidents): persist description edits via PATCH update endpoint"
```

---

### Task 3: Persist reporter channel on create (F1)

**Files:**
- Modify: `server/repositories/incidents.ts` (`create` input + body)
- Modify: `server/routes/incidents.ts` (POST `/incidents` handler)
- Test: `server/__tests__/batch1-incident-route.test.ts`

**Interfaces:**
- Consumes: `createIncidentSchema.channel` (already exists, default `'user_report'`).
- Produces: `incidentsRepo.create` accepts `channel?: Incident['reporterChannel']` and stores it; the route forwards `body.channel`.

- [ ] **Step 1: Write the failing test** — add to `server/__tests__/batch1-incident-route.test.ts`:

```ts
it('honors the reporter channel on create', async () => {
  const res = await request(app)
    .post('/api/v1/incidents')
    .set('Cookie', cookie)
    .send({ title: 'channel test', channel: 'email' });
  expect(res.status).toBe(201);
  expect(res.body.reporterChannel).toBe('email');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/batch1-incident-route.test.ts -t "honors the reporter channel"`
Expected: FAIL — `reporterChannel` is always `'user_report'`.

- [ ] **Step 3: Extend the repo create input + body** in `server/repositories/incidents.ts`:

```ts
    input: { title: string; priority?: string; description?: string; applicationId?: string | null; assigneeId?: string | null; affectedCIIds?: string[]; tags?: string[]; channel?: Incident['reporterChannel'] },
```

Replace the hardcoded line:

```ts
      reporterChannel: (input.channel ?? 'user_report') as Incident['reporterChannel'],
```

- [ ] **Step 4: Forward channel in the route** — in `server/routes/incidents.ts`, add `channel` to the `create` payload:

```ts
      {
        title: body.title,
        description: body.description,
        priority: body.priority,
        assigneeId: body.assigneeId ?? null,
        affectedCIIds: body.affectedCIIds,
        tags: body.tags,
        applicationId: body.applicationId ?? null,
        channel: body.channel,
      },
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run server/__tests__/batch1-incident-route.test.ts -t "honors the reporter channel"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/repositories/incidents.ts server/routes/incidents.ts server/__tests__/batch1-incident-route.test.ts
git commit -m "fix(incidents): persist reporter channel chosen in create modal"
```

---

### Task 4: Race-safe, transactional incident creation (B1 + B2)

**Files:**
- Modify: `prisma/schema.prisma` (add `IncidentCounter`)
- Modify: `server/repositories/incidents.ts` (`create`)
- Test: `server/__tests__/batch1-incident-repo.test.ts`

**Interfaces:**
- Consumes: existing `create(tenantId, input, actor)` shape and return type.
- Produces: `IncidentCounter` model `{ tenantId, year, seq }` keyed `@@id([tenantId, year])`; `create` allocates a per-tenant/year sequence inside a single `$transaction` that also inserts the incident and its `created` timeline event. `publicId` still matches `/^INC-\d{4}-\d{5}$/`.

- [ ] **Step 1: Add the counter model** to `prisma/schema.prisma` (place near the `Incident` model):

```prisma
model IncidentCounter {
  tenantId String
  year     Int
  seq      Int      @default(0)
  @@id([tenantId, year])
}
```

- [ ] **Step 2: Write the failing test** — add to `server/__tests__/batch1-incident-repo.test.ts`:

```ts
it('allocates unique publicIds under concurrent creates and writes a created timeline event', async () => {
  const tenantId = `tenant-conc-${Date.now()}`;
  const make = () =>
    incidentsRepo.create(tenantId, { title: 'conc' }, { id: 'u-conc', name: 'Conc' });
  const [a, b] = await Promise.all([make(), make()]);
  expect(a.publicId).not.toBe(b.publicId);
  expect(a.publicId).toMatch(/^INC-\d{4}-\d{5}$/);
  const row = await prisma.incident.findFirst({ where: { tenantId, publicId: a.publicId } });
  expect(row).toBeTruthy();
  const created = await prisma.incidentTimelineEvent.findFirst({
    where: { incidentId: row!.id, kind: 'created' },
  });
  expect(created).toBeTruthy();
  await prisma.incidentTimelineEvent.deleteMany({ where: { tenantId } });
  await prisma.incident.deleteMany({ where: { tenantId } });
  await prisma.incidentCounter.deleteMany({ where: { tenantId } });
});
```

Import `incidentsRepo` at the top of the file: `import { incidentsRepo } from '../repositories/incidents';`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts -t "allocates unique publicIds"`
Expected: FAIL (or flaky PASS with duplicate publicId risk) — current `count()+1` approach is not concurrency-safe and create is not a single transaction.

- [ ] **Step 4: Rewrite `create` to use a per-tenant/year counter in a single transaction** in `server/repositories/incidents.ts`:

```ts
  async create(
    tenantId: string,
    input: { title: string; priority?: string; description?: string; applicationId?: string | null; assigneeId?: string | null; affectedCIIds?: string[]; tags?: string[]; channel?: Incident['reporterChannel'] },
    actor: { id: string; name: string },
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const id = randomUUID();
    const priority = (input.priority ?? 'P3') as Incident['priority'];
    const incident = {
      id,
      publicId: '',
      title: input.title,
      description: input.description ?? '',
      status: 'new',
      priority,
      severity: priority,
      isMajor: false,
      assigneeId: input.assigneeId ?? undefined,
      affectedCIIds: input.affectedCIIds ?? [],
      affectedCIPublicIds: [],
      affectedServiceIds: [],
      reporterId: actor.id,
      reporterChannel: (input.channel ?? 'user_report') as Incident['reporterChannel'],
      slaResponseTarget: 60,
      slaResolveTarget: 240,
      slaResponseStatus: 'healthy',
      slaResolveStatus: 'healthy',
      reopenCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags: input.tags ?? [],
      tenantId,
      applicationId: input.applicationId ?? null,
    } as unknown as Incident & { tenantId: string; applicationId: string | null };

    const prismaApplicationId = input.applicationId ?? 'unassigned';
    const eventId = randomUUID();
    const evt = { id: eventId, kind: 'created' as const, timestamp: now.toISOString(), actorId: actor.id, details: { title: input.title } };

    await prisma.$transaction(async (tx) => {
      const counter = await tx.incidentCounter.upsert({
        where: { tenantId_year: { tenantId, year } },
        update: { seq: { increment: 1 } },
        create: { tenantId, year, seq: 1 },
        select: { seq: true },
      });
      const seq = String(counter.seq).padStart(5, '0');
      incident.publicId = `INC-${year}-${seq}`;
      await tx.incident.create({
        data: {
          id,
          publicId: incident.publicId,
          tenantId,
          status: 'new',
          priority,
          severity: priority,
          isMajor: false,
          affectedCIIds: JSON.stringify(incident.affectedCIIds),
          affectedCIPublicIds: JSON.stringify(incident.affectedCIPublicIds),
          applicationId: prismaApplicationId,
          data: JSON.stringify(incident),
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.incidentTimelineEvent.create({
        data: {
          id: eventId,
          tenantId,
          incidentId: id,
          kind: 'created',
          timestamp: now,
          data: JSON.stringify(evt),
        },
      });
    });

    return incident as unknown as Incident & { applicationId: string | null; tenantId: string };
  },
```

- [ ] **Step 5: Run the migration**

Run: `npm run db:migrate -- --name incident_counter`
Expected: migration applied, `IncidentCounter` table created.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts -t "allocates unique publicIds"`
Expected: PASS (both incidents created, distinct ids, `created` timeline event present).

- [ ] **Step 7: Run the full incident batch to confirm no regression**

Run: `npx vitest run server/__tests__/batch1-incident-repo.test.ts server/__tests__/batch1-incident-route.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations server/repositories/incidents.ts server/__tests__/batch1-incident-repo.test.ts
git commit -m "fix(incidents): race-safe publicId allocation + transactional create"
```

---

### Task 5: Read-scope `get` / `comments` / `timeline` (B6)

**Files:**
- Modify: `server/scope/scopedDb.ts` (`get`, `comments`, `timeline`)
- Test: `server/__tests__/scope-incidents.test.ts`

**Interfaces:**
- Consumes: existing `loadIncidentAppId` / `loadIncidentAppIdById`, `isIncidentReadBypass`, `writableApps`/`ownerApps` sets.
- Produces: `get(publicId)`, `comments(incidentId)`, `timeline(incidentId)` return `null` when the incident's app is not readable by the current user (matching `list`'s hide behavior). Unassigned incidents remain readable (see Task 7).

- [ ] **Step 1: Write the failing tests** — add to `server/__tests__/scope-incidents.test.ts`:

```ts
describe('Incidents scope — read endpoints', () => {
  it('memberA (contributor) can read the scoped incident', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app).get(`/api/v1/incidents/${publicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) gets 404 on get', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${publicId}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('memberB (outsider) gets 404 on comments', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${internalId}/comments`).set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts -t "read endpoints"`
Expected: FAIL — memberB currently gets 200 on get/comments.

- [ ] **Step 3: Hoist a readable set and add a readability helper** in `server/scope/scopedDb.ts`. Inside `buildScopedDb`, after `ownerApps` is defined, add:

```ts
  const readableApps = new Set([...writableApps, ...ownerApps]);
  const unassignedAppId = `app-unassigned-${ctx.tenantId}`;
  function isIncidentReadable(appId: string | null | undefined): boolean {
    if (isIncidentReadBypass) return true;
    if (appId == null) return true;
    if (appId === unassignedAppId) return true;
    return readableApps.has(appId);
  }
```

(`isIncidentReadBypass` is already defined earlier in `buildScopedDb`.)

- [ ] **Step 4: Gate `get`, `comments`, `timeline`** in the `incidents` scope object:

```ts
    async get(publicId) {
      const appId = await loadIncidentAppId(publicId);
      if (appId === undefined) return null;
      if (!isIncidentReadable(appId)) return null;
      return incidentsRepo.get(ctx.tenantId, publicId);
    },
    async comments(incidentId, pagination) {
      const appId = await loadIncidentAppIdById(incidentId);
      if (appId === undefined) return null;
      if (!isIncidentReadable(appId)) return null;
      return incidentsRepo.comments(ctx.tenantId, incidentId, pagination);
    },
    async timeline(incidentId, pagination) {
      const appId = await loadIncidentAppIdById(incidentId);
      if (appId === undefined) return null;
      if (!isIncidentReadable(appId)) return null;
      return incidentsRepo.timeline(ctx.tenantId, incidentId, pagination);
    },
```

(Replace the current synchronous arrow assignments for these three keys.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts -t "read endpoints"`
Expected: PASS (memberA 200, memberB 404 on get and comments).

- [ ] **Step 6: Run the full scope suite to confirm no regression**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts`
Expected: PASS (the existing status-write tests still pass).

- [ ] **Step 7: Commit**

```bash
git add server/scope/scopedDb.ts server/__tests__/scope-incidents.test.ts
git commit -m "fix(incidents): read-scope get/comments/timeline to match list"
```

---

### Task 6: Fix resolved no-op and hardcoded demo user (F5 + F6)

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx`
- Modify: `src/routes/incidents/IncidentQueue.tsx`

**Interfaces:**
- Consumes: existing `useCurrentUser()` from `@/src/lib/rbac`; existing `handleStatusChange`, `handlePromoteMajor`, `applyQuickFilter`.
- Produces: selecting "Resolved" in the status dropdown always opens the resolve modal; `majorDeclaredBy` uses the real current user id; "My open" quick filter/counts use the real user id instead of `'u-001'`.

- [ ] **Step 1: Add `useCurrentUser` and capture `user`** in `src/routes/incidents/IncidentDetail.tsx`. Add to the rbac import:

```ts
import { Can, incidentResource, useCurrentUser } from '@/src/lib/rbac';
```

Inside the component, near the other hooks:

```ts
  const { user } = useCurrentUser();
```

- [ ] **Step 2: Fix the resolved no-op** — replace the two-condition `handleStatusChange` guard with a single one that always opens the modal on "Resolved":

```ts
  const handleStatusChange = async (s: IncidentStatus) => {
    if (!inc) return;
    if (s === 'resolved') {
      setResolveOpen(true);
      return;
    }
    const prev = inc.status;
    setStatus(s);
    try {
      await incidentsService.setStatus(inc.publicId, s);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update incident status:', err);
      setStatus(prev);
    } finally {
      refreshIncident();
    }
  };
```

- [ ] **Step 3: Fix `majorDeclaredBy`** in `handlePromoteMajor` — replace the hardcoded `'u-001'`:

```ts
      majorDeclaredBy: user?.id ?? 'system',
```

- [ ] **Step 4: Fix the queue's demo-user fallbacks** in `src/routes/incidents/IncidentQueue.tsx`. In `applyQuickFilter`, change the `my_open` case:

```ts
      return incidents.filter(i => ACTIVE_STATUSES.includes(i.status) && i.assigneeId === currentUserId);
```

In the "quick filter counts" section, replace `user?.id ?? 'u-001'` with `user?.id`:

```ts
  const myOpenCount = incidents.filter(i => ACTIVE_STATUSES.includes(i.status) && i.assigneeId === user?.id).length;
```

- [ ] **Step 5: Typecheck**

Run: `npm run lint`
Expected: no TS errors.

- [ ] **Step 6: Manual verification**
- Open an incident with an existing resolution; click the status dropdown and pick "Resolved" → the resolve modal opens (no silent no-op).
- Promote a P1/P2 incident to major → the optimistic snapshot records the real current user, not `'u-001'`.
- In the queue, apply "My open" → matches `user.id`, not `'u-001'`.

- [ ] **Step 7: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx src/routes/incidents/IncidentQueue.tsx
git commit -m "fix(incidents): resolve dropdown opens modal; drop hardcoded u-001"
```

---

### Task 7: Treat the unassigned app as a shared staging pool (B5 + F9)

**Files:**
- Modify: `server/scope/scopedDb.ts` (`incidentCanWrite`, `list`, `incidentScopeMode`)
- Test: `server/__tests__/scope-incidents.test.ts`

**Interfaces:**
- Consumes: `unassignedAppId` (defined in Task 5 as `` `app-unassigned-${ctx.tenantId}` ``), `writableApps`/`ownerApps`/`readableApps`, `isIncidentReadBypass`.
- Produces: unassigned incidents (those whose `applicationId` is the tenant's UNASSIGNED app) are readable and writable by any user with incident scope — a shared staging pool. This lets UI-created (no-app) incidents be seen and mutated by ordinary members, not just NOC/admin.

- [ ] **Step 1: Write the failing tests** — add to `server/__tests__/scope-incidents.test.ts`. Reuse the fixture; create an incident whose `applicationId` is the tenant's UNASSIGNED app id. Add a second `beforeAll`-style setup inside the describe:

```ts
describe('Incidents scope — unassigned staging pool', () => {
  let unassignedPublicId: string;
  let unassignedInternalId: string;

  beforeAll(async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' },
    });
    unassignedInternalId = 'inc-scope-unassigned-' + Date.now();
    unassignedPublicId = 'INC-SCOPE-UN-' + Date.now();
    await prisma.incident.create({
      data: {
        id: unassignedInternalId,
        publicId: unassignedPublicId,
        tenantId: tenant.id,
        data: JSON.stringify({ ...INCIDENT_DATA, id: unassignedInternalId, publicId: unassignedPublicId }),
        status: 'open',
        priority: 'P2',
        severity: 'P2',
        isMajor: false,
        affectedCIIds: '[]',
        affectedCIPublicIds: '[]',
        createdAt: new Date(),
        updatedAt: new Date(),
        applicationId: `app-unassigned-${tenant.id}`,
      },
    });
  });

  afterAll(async () => {
    await prisma.incident.delete({ where: { publicId: unassignedPublicId } }).catch(() => undefined);
  });

  it('memberA can read an unassigned incident', async () => {
    const cookie = await loginAs('member-a');
    const res = await request(app).get(`/api/v1/incidents/${unassignedPublicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) can read an unassigned incident (shared pool)', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app).get(`/api/v1/incidents/${unassignedPublicId}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) can write to an unassigned incident (shared pool)', async () => {
    const cookie = await loginAs('member-b');
    const res = await request(app)
      .patch(`/api/v1/incidents/${unassignedPublicId}/status`)
      .set('Cookie', cookie)
      .send({ status: 'triaging' });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts -t "unassigned staging pool"`
Expected: FAIL — memberA/memberB currently get 404 (read) / 403 (write).

- [ ] **Step 3: Allow unassigned write** in `server/scope/scopedDb.ts`, `incidentCanWrite` — add an unassigned shortcut before the null check:

```ts
  function incidentCanWrite(appId: string | null, opts: { allowNoc?: boolean } = { allowNoc: true }): boolean {
    if (isPlatformAdmin) return true;
    if (appId === unassignedAppId) return true;
    if (opts.allowNoc && POLICY.incident.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    if (appId === null) return false;
    return writableApps.has(appId);
  }
```

- [ ] **Step 4: Include unassigned in `list`** — replace the inline readable filter in the incidents `list` scope method:

```ts
      return (rows as { applicationId?: string | null }[]).filter(
        (i) => i.applicationId == null || i.applicationId === unassignedAppId || readableApps.has(i.applicationId!),
      ) as typeof rows;
```

- [ ] **Step 5: Assign a sensible scope mode** — in `incidentScopeMode`, keep unassigned out of `owner` so it reads as `member` (default fallthrough is already fine; no code change required unless you want explicit). Verify the fallthrough: unassigned is not in `ownerApps` and not admin/bypass → `'member'`. No change needed.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts -t "unassigned staging pool"`
Expected: PASS.

- [ ] **Step 7: Run the full scope suite to confirm no regression**

Run: `npx vitest run server/__tests__/scope-incidents.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/scope/scopedDb.ts server/__tests__/scope-incidents.test.ts
git commit -m "fix(incidents): treat unassigned app as a shared readable/writable staging pool"
```

---

## Self-Review

**1. Spec coverage:**
- B7 (watcher 404) → Task 1. ✓
- F2 (description persistence) → Task 2. ✓
- F1 (reporter channel) → Task 3. ✓
- B1 (publicId race) + B2 (transactional create) → Task 4. ✓
- B6 (read-scope get/comments/timeline) → Task 5. ✓
- F5 (resolved no-op) + F6 (hardcoded `u-001`) → Task 6. ✓
- B5 + F9 (unassigned-app scope trap) → Task 7. ✓
- Not in this plan (deferred, documented in the audit): B3 (tenant fabrication), B4 (unassigned representations), B8 (CI substring filter), B9 (internal/public id mix), B10 (closed-vs-resolved), B11 (severity dup), B12, F3 (promote-major unreachable — needs a design decision on where the button lives), F4 (list truncation — touches pagination UX), F7 (inc re-sync), F8 (composer commands), F10, A1–A3.

**2. Placeholder scan:** Every step contains real code or an exact run command; no TBD/TODO/similar placeholders. `isIncidentReadable`, `unassignedAppId`, `readableApps` are defined in Task 5 and reused in Task 7 with identical names.

**3. Type consistency:** `unassignedAppId` is `` `app-unassigned-${ctx.tenantId}` `` in both Task 5 and Task 7. `UpdateRepoInput.description` (Task 2) matches the repo `update()` usage and the schema field. `IncidentCounter` fields are used consistently in Task 4. The test helpers (`cloneIncident`, `cloneMajorIncident`, `auth`, `rand`, `loginAs`, `INCIDENT_DATA`) are pre-existing and used with the same shapes throughout.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-29-incidents-stack-hardening.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
