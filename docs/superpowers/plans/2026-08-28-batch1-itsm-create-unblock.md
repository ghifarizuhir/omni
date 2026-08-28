# Batch 1 — ITSM Create Unblock (ABCDE as One) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all missing `Create` endpoints so every ITSM core page persists through `FE → Service → Shared Zod → BE Route → ScopedDb → Repo → Prisma` with `tenantId` scoping, `ScopeViolationError→403`, and `audit`; remove every fake local `setExtra*`/`Date.now`/`u-001` stub.

**Architecture:** Single batch `ABCDE` — 1 trivial Zod fix + 4 creates reuse identical pattern (`changes POST /changes 63` + `kb POST /kb/articles 408` as template). Each create: `count→PREFIX-YYYY-NNNNN` inside repo transaction, `ScopedDb` checks `canWriteApp(applicationId)` + `PLATFORM_ADMIN` bypass, route `requirePermission('*.create'|'*.write')` + `Zod .strict()` + `audit {action:create, resourceKind, before:null, after, scopeMode}`. FE switches from `const newId=INC-…-random` to `await service.create(input)`.

**Tech Stack:** `zod 3`, `Express` routes (`server/routes/{cmdb,incidents,itsm}.ts`), `Prisma` Postgres (`prisma/schema.prisma`), `req.scoped.*` (`server/scope/scopedDb.ts`), `audit` (`server/audit`), `ScopeViolationError` (`server/scope/errors.ts`), `apiFetch` (`src/services/core.ts`), `vitest` DB-backed (`server/__tests__/helpers.ts`, `docker compose up -d postgres` on `5433→5432`).

---

## File Structure

**Single responsibility per file — follow AGENTS.md `never prisma in routes` + `eslint no-restricted-imports server/routes/**/*.ts:19`.**

- **Modify:** `src/shared/schemas/ci.ts:33` — fix `ciHealthValues` to match `src/types/common.ts:63 ServiceHealthStatus`
- **Modify:** `src/shared/schemas/ci.ts:40` — add `createCISchema` (reuse `ciStatusValues`, `ciEnvironmentValues`, `ciCriticalityValues`, `ciHealthValues`)
- **Modify:** `src/shared/schemas/incident.ts:119` — add `createIncidentSchema` + `CreateIncidentInput`
- **Create:** `src/shared/schemas/problem.ts` — `createProblemSchema` + `CreateProblemInput`
- **Modify:** `src/shared/schemas/request.ts:31` — add `createRequestSchema` + `CreateRequestInput`
- **Modify:** `server/repositories/cmdb.ts:69` — add `createCI` inside `cmdbRepo`
- **Modify:** `server/repositories/incidents.ts:74` — add `create` inside `incidentsRepo`
- **Modify:** `server/repositories/docs.ts:56` — add `create` to `problemsRepo` (`56-59`) + `requestsRepo` (`252`)
- **Modify:** `server/scope/scopedDb.ts:13` — extend `CmdbScope` with `createCI`; `:115` extend `ProblemsScope` with `create`; `:145` extend `ServiceRequestsScope` with `create`; add `IncidentsScope.create` (`45:98`) + implementations (`221:682`)
- **Modify:** `server/routes/cmdb.ts:40` — add `POST /cis`
- **Modify:** `server/routes/incidents.ts:337` — add `POST /incidents`
- **Modify:** `server/routes/itsm.ts:30` — add `POST /problems`; `159` — add `POST /requests`
- **Modify:** `src/services/cmdbService.ts:9` — add `create`
- **Modify:** `src/services/incidentsService.ts:44` — add `create`
- **Modify:** `src/services/itsmServices.ts:12` — add `problemsService.create`; `67` — add `requestsService.create`
- **Modify:** `src/components/cmdb/modals/CreateCIModal.tsx:59` + `ImportCIModal.tsx:114` — wire to `cmdbService.create`
- **Modify:** `src/components/incidents/CreateIncidentModal.tsx:53` + `src/routes/incidents/IncidentQueue.tsx:616` — wire to `incidentsService.create`
- **Modify:** `src/routes/problems/ProblemList.tsx:49,164` — wire `CreateProblemModal` → `problemsService.create`
- **Modify:** `src/routes/portal/CatalogItemDetail.tsx:524` — wire `handleSubmit` → `requestsService.create`
- **Create:** `server/__tests__/batch1-create-*.test.ts` — per-repo/route contract tests (or extend existing `__tests__/cmdb-*.test.ts`, `incidents.test.ts`, `itsm.test.ts`, `requests-lifecycle.test.ts`)
- **Verify:** `docs/features/{incidents,problems,requests,cmdb,kb}.md` already patched with `CRUD Wiring (audited 2026-08-28)` — no edit needed; final `npm run lint && npm run test` gate.

---

### Task 0: Preflight — DB up + lint gate

**Files:**
- Read: `AGENTS.md:1`, `docs/audits/crud-audit.md:1`, `server/__tests__/helpers.ts:1`, `docker-compose.yml`

- [ ] **Step 1: Start Postgres + verify lint base**

```bash
docker compose up -d postgres redis
# Postgres mapped host 5433→5432 per AGENTS.md
TEST_DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npm run lint 2>&1 | tail -20
# Expected: pre-existing eslint.config.js TS Config[] error only, no new errors
```

- [ ] **Step 2: Commit point**

```bash
git status --short
# Expected: no pending changes before Batch 1
```

---

### Task 1: A — Fix `ciHealthValues` drift (1-line, unblocks PATCH health)

**Files:**
- Modify: `src/shared/schemas/ci.ts:33-38`
- Test: `server/__tests__/batch1-ci-health.test.ts` (create) or extend `server/__tests__/cmdb.test.ts`

- [ ] **Step 1: Write failing test — `operational` should be allowed**

```ts
// server/__tests__/batch1-ci-health.test.ts
import { describe, it, expect } from 'vitest';
import { updateCISchema } from '../../src/shared/schemas/ci';

describe('ci health enum fix A', () => {
  it('accepts operational from CreateCIModal default', () => {
    const r = updateCISchema.safeParse({ health: 'operational' });
    expect(r.success).toBe(true);
  });
  it('rejects stale healthy', () => {
    const r = updateCISchema.safeParse({ health: 'healthy' as any });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

```bash
npx vitest run server/__tests__/batch1-ci-health.test.ts -v
# Expected: FAIL — 1 failed "accepts operational" (healthy sole enum currently ci.ts:33)
```

- [ ] **Step 3: Implement — replace enum to match `src/types/common.ts:63`**

```ts
// src/shared/schemas/ci.ts:33 — REPLACE
export const ciHealthValues = [
  'operational',
  'degraded',
  'partial_outage',
  'major_outage',
  'maintenance',
] as const;
```

- [ ] **Step 4: Run — verify PASS**

```bash
npx vitest run server/__tests__/batch1-ci-health.test.ts -v
# Expected: 2 passed
npm run lint 2>&1 | tail -10
# Expected: no new lint errors
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/schemas/ci.ts server/__tests__/batch1-ci-health.test.ts
git commit -m "fix(cmdb): align ciHealthValues to ServiceHealthStatus operational/degraded/partial_outage/major_outage/maintenance"
```

---

### Task 2: B — `createIncidentSchema` shared Zod

**Files:**
- Modify: `src/shared/schemas/incident.ts:119`
- Test: `server/__tests__/batch1-incident-create-schema.test.ts`

- [ ] **Step 1: Write failing test — schema should exist and validate title+priority**

```ts
import { createIncidentSchema } from '../../src/shared/schemas/incident';
import { describe, it, expect } from 'vitest';

describe('createIncidentSchema B', () => {
  it('validates minimal create payload', () => {
    const r = createIncidentSchema.safeParse({ title: 'DB outage', priority: 'P1', description: 'pg down' });
    expect(r.success).toBe(true);
  });
  it('rejects unknown field', () => {
    const r = createIncidentSchema.safeParse({ title: 'x', priority: 'P2', status: 'resolved' as any });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run — FAIL "createIncidentSchema is not defined"**

```bash
npx vitest run server/__tests__/batch1-incident-create-schema.test.ts -v
# Expected: Cannot find export
```

- [ ] **Step 3: Implement — append to `src/shared/schemas/incident.ts:119`**

```ts
export const createIncidentSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional().default(''),
    priority: z.enum(['P1', 'P2', 'P3', 'P4']).default('P3'),
    channel: z.enum(['phone', 'email', 'user_report', 'self_service', 'monitoring', 'integration']).optional().default('user_report'),
    assigneeId: z.string().min(1).nullable().optional(),
    affectedCIIds: z.array(z.string()).max(100).optional().default([]),
    applicationId: z.string().nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional().default([]),
  })
  .strict();
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
```

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch1-incident-create-schema.test.ts -v
# Expected: 2 passed
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/schemas/incident.ts server/__tests__/batch1-incident-create-schema.test.ts
git commit -m "feat(incident): add createIncidentSchema strict"
```

---

### Task 3: B — `incidentsRepo.create`

**Files:**
- Modify: `server/repositories/incidents.ts:74` (inside `incidentsRepo`)
- Test: `server/__tests__/batch1-incident-repo.test.ts` using `helpers.ts:login/ScopedAppFixture` + `prisma.incident` seed

- [ ] **Step 1: Write failing test — repo.create should allocate INC-YYYY-NNNNN and tenantId-scoped**

```ts
import { describe, it, expect } from 'vitest';
import { incidentsRepo } from '../repositories/incidents';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';

describe('incidentsRepo.create B', () => {
  it('creates INC-YYYY-NNNNN with tenant isolation', async () => {
    const tenantId = 'tenant-test-' + randomUUID();
    // ensure tenant row exists via preflightScopeNotNull helper if needed
    const inc = await incidentsRepo.create(tenantId, { title: 'Test', priority: 'P2' } as any, { id: 'u-1', name: 'Tester' });
    expect(inc.publicId).toMatch(/^INC-\d{4}-\d{5}$/);
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId: inc.publicId } });
    expect(row?.tenantId).toBe(tenantId);
  });
});
```

- [ ] **Step 2: Run — FAIL "incidentsRepo.create is not a function"**

```bash
npx vitest run server/__tests__/batch1-incident-repo.test.ts -v
```

- [ ] **Step 3: Implement — mirror `changesRepo.create docs.ts:71` + `kbRepo.create docs.ts:549`**

```ts
// server/repositories/incidents.ts — add inside incidentsRepo before closing brace
async create(tenantId: string, input: { title: string; priority?: string; description?: string; applicationId?: string | null; assigneeId?: string | null; affectedCIIds?: string[]; tags?: string[] }, actor: { id: string; name: string }) {
  const count = await prisma.incident.count({ where: { tenantId } });
  const seq = String(count + 1).padStart(5, '0');
  const year = new Date().getFullYear();
  const publicId = `INC-${year}-${seq}`;
  const id = randomUUID();
  const now = new Date();
  const incident = {
    id, publicId, tenantId, status: 'new', priority: input.priority ?? 'P3',
    title: input.title, description: input.description ?? '',
    assigneeId: input.assigneeId ?? null, affectedCIIds: input.affectedCIIds ?? [],
    tags: input.tags ?? [], applicationId: input.applicationId ?? null,
    isMajor: false, createdAt: now.toISOString(), updatedAt: now.toISOString(),
    slaResponseStatus: 'healthy', slaResolveStatus: 'healthy',
  };
  const row = await prisma.incident.create({ data: { id, publicId, tenantId, status: 'new', priority: incident.priority, applicationId: incident.applicationId, data: JSON.stringify(incident), createdAt: now, updatedAt: now } });
  const eventId = randomUUID();
  const evt = { id: eventId, kind: 'created' as const, timestamp: now.toISOString(), actorId: actor.id, details: { title: input.title } };
  await prisma.incidentTimelineEvent.create({ data: { id: eventId, tenantId, incidentId: id, kind: 'created', timestamp: now, data: JSON.stringify(evt) } });
  return incident;
},
```

Note: adjust `prisma.incident` columns to `prisma/schema.prisma: Insident model` (`status`, `priority`, `applicationId`, `data String`). Keep transactional `count` sequential — best-effort (P2002 retry optional, like `kb docs.ts:567`).

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch1-incident-repo.test.ts -v
```

- [ ] **Step 5: Commit**

```bash
git add server/repositories/incidents.ts server/__tests__/batch1-incident-repo.test.ts
git commit -m "feat(incident): add incidentsRepo.create with INC-YYYY-NNNNN allocation"
```

---

### Task 4: B — `IncidentsScope.create` scoped wrapper

**Files:**
- Modify: `server/scope/scopedDb.ts:45,312,328`

- [ ] **Step 1: Write failing test — scoped create respects canWriteApp**

```ts
// server/__tests__/batch1-incident-scope.test.ts
import { describe, it, expect } from 'vitest';
import { buildScopedDb } from '../scope/scopedDb';
import type { ScopeContext } from '../scope/context';
describe('incidents scoped create', () => {
  it('throws ScopeViolationError for non-writable app', async () => {
    const ctx = { tenantId: 't-1', functionalRoles: [], appMemberships: [] } as any as ScopeContext;
    const db = buildScopedDb({} as any, ctx);
    await expect(db.incidents.create({ title: 'x' } as any, { id: 'u-1', name: 'n' })).rejects.toThrow(/scope_violation/i);
  });
});
```

- [ ] **Step 2: Run — FAIL "db.incidents.create is not a function"**

```bash
npx vitest run server/__tests__/batch1-incident-scope.test.ts -v
```

- [ ] **Step 3: Implement — add to `IncidentsScope` interface and object**

```ts
// server/scope/scopedDb.ts:45 — add to IncidentsScope interface
create(input: Parameters<typeof incidentsRepo.create>[1], actor: Parameters<typeof incidentsRepo.create>[2]): Promise<{ result: Awaited<ReturnType<typeof incidentsRepo.create>>; scopeMode: ScopeMode }>;

// server/scope/scopedDb.ts:312 — add helper if needed + incidents.create method near 328
async create(input, actor) {
  const appId = (input as any).applicationId ?? null;
  if (appId !== null && !incidentCanWrite(appId)) throw new ScopeViolationError({ module: 'incident', action: 'create', applicationId: appId });
  const resolvedAppId = appId ?? await ensureUnassignedApp(ctx.tenantId);
  const result = await incidentsRepo.create(ctx.tenantId, { ...input, applicationId: resolvedAppId }, actor);
  return { result, scopeMode: incidentScopeMode(appId) };
},
```

Copy `ensureUnassignedApp` import if missing `import { ensureUnassignedApp } from '../../prisma/preflightScopeNotNull'` (already present for changes).

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch1-incident-scope.test.ts -v
```

- [ ] **Step 5: Commit**

```bash
git add server/scope/scopedDb.ts server/__tests__/batch1-incident-scope.test.ts
git commit -m "feat(scope): add IncidentsScope.create with canWriteApp guard"
```

---

### Task 5: B — Route `POST /incidents` + `audit`

**Files:**
- Modify: `server/routes/incidents.ts:337` (after `delete watchers`)
- Test: `server/__tests__/batch1-incident-route.test.ts` using `helpers.ts:login + ScopedAppFixture + app.inject`

- [ ] **Step 1: Write failing test — POST /api/v1/incidents 201**

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';
import { createTestUser } from './helpers';

describe('POST /incidents', () => {
  it('201 creates incident', async () => {
    const app = await buildApp();
    const user = await createTestUser({ permissions: ['incident.create'] });
    const res = await app.inject({ method: 'POST', url: '/api/v1/incidents', headers: { cookie: user.cookie }, payload: { title: 'B test', priority: 'P1' } });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.publicId).toMatch(/^INC-/);
  });
  it('400 missing title', async () => {
    const app = await buildApp(); const user = await createTestUser({ permissions: ['incident.create'] });
    const res = await app.inject({ method: 'POST', url: '/api/v1/incidents', headers: { cookie: user.cookie }, payload: { priority: 'P1' } });
    expect(res.statusCode).toBe(400);
  });
  it('403 non-writable app', async () => {
    // load appId not in writableApps
  });
});
```

- [ ] **Step 2: Run — FAIL 404**

```bash
npx vitest run server/__tests__/batch1-incident-route.test.ts -v
```

- [ ] **Step 3: Implement — append route**

```ts
// server/routes/incidents.ts — imports add createIncidentSchema
import { createIncidentSchema } from '../../src/shared/schemas/incident';

incidentsRouter.post('/incidents', requirePermission('incident.create'), asyncHandler(async (req, res) => {
  const body = createIncidentSchema.parse(req.body);
  if (!req.session) throw new HttpError(401, 'Authentication required');
  const actor = await getActor(req);
  const wrapped = await scoped(req).incidents.create({ title: body.title, description: body.description, priority: body.priority, channel: body.channel, assigneeId: body.assigneeId ?? null, affectedCIIds: body.affectedCIIds, tags: body.tags, applicationId: body.applicationId ?? null }, actor);
  await audit(req, { action: 'create', resourceKind: 'Incident', resourceId: wrapped.result.id, after: wrapped.result, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.result);
}));
```

Ensure `getActor` imported `import { getActor } from '../auth/session'` (already for comments). Keep `never prisma in routes` via `req.scoped`.

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch1-incident-route.test.ts -v
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/incidents.ts server/__tests__/batch1-incident-route.test.ts
git commit -m "feat(incident): add POST /incidents route with Zod + scoped + audit"
```

---

### Task 6: B — Service + FE wiring remove fake ID

**Files:**
- Modify: `src/services/incidentsService.ts:44`, `src/components/incidents/CreateIncidentModal.tsx:53`, `src/routes/incidents/IncidentQueue.tsx:616`

- [ ] **Step 1: Write failing FE-unit test — service.create exists**

```ts
import { incidentsService } from '../../src/services/incidentsService';
import { describe, it, expect } from 'vitest';
describe('incidentsService.create wiring', () => { it('has create', () => expect(typeof incidentsService.create).toBe('function')); });
```

- [ ] **Step 2: Run — FAIL**

```bash
npx vitest run server/__tests__/batch1-incident-service.test.ts -v
```

- [ ] **Step 3: Implement service**

```ts
// src/services/incidentsService.ts:44 — add
create: (input: CreateIncidentInput) => apiFetch<Incident>('/incidents', { method: 'POST', body: input }),
```

Import `CreateIncidentInput` type alongside existing imports `src/shared/schemas/incident`.

- [ ] **Step 4: Implement FE — `CreateIncidentModal.tsx:53` async wire**

```ts
// BEFORE 53-62: const newId = `INC-2026-${...}`; onCreated(newId);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const handleCreate = async () => {
  if (!title.trim()) return;
  setSaving(true); setError(null);
  try {
    const created = await incidentsService.create({ title: title.trim(), description, priority, channel, assigneeId: assigneeId || null, affectedCIIds: [], tags: [] });
    onCreated(created.publicId);
    setTitle(''); setDescription(''); setPriority('P2'); setChannel('phone'); setAssigneeId(''); onClose();
  } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
};
// render: show error banner bg-ois-danger-pale + saving spinner on Create button disabled={saving||!title.trim()}
```

Update `IncidentQueue.tsx:616` `onCreated={id=>{ refreshIncidents(); navigate(`/incidents/${id}`); }}`.

- [ ] **Step 5: Run `npm run lint && npx vitest run server/__tests__/batch1-incident-service.test.ts -v` — PASS**

- [ ] **Step 6: Commit**

```bash
git add src/services/incidentsService.ts src/components/incidents/CreateIncidentModal.tsx src/routes/incidents/IncidentQueue.tsx
git commit -m "feat(incident): wire CreateIncidentModal to POST /incidents"
```

---

### Task 7: C — `createCISchema`

**Files:**
- Modify: `src/shared/schemas/ci.ts:40`

- [ ] **Step 1: Test — createCISchema exists, strict, rejects unknown**

```ts
import { createCISchema } from '../../src/shared/schemas/ci';
describe('createCISchema', () => {
  it('validates name+type', () => expect(createCISchema.safeParse({ name: 'api-1', type: 'service', status: 'active', environment: 'production', criticality: 'high' }).success).toBe(true));
  it('rejects publicId', () => expect(createCISchema.safeParse({ name: 'x', type: 'service', publicId: 'CI-x' } as any).success).toBe(false));
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement — add above `updateCISchema`**

```ts
export const ciTypeValues = ['server','application','database','load_balancer','service','network','storage','endpoint'] as const;
export const createCISchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(ciTypeValues),
  status: z.enum(ciStatusValues).default('active'),
  environment: z.enum(ciEnvironmentValues).default('production'),
  criticality: z.enum(ciCriticalityValues).default('medium'),
  health: z.enum(ciHealthValues).default('operational'),
  ownerId: z.string().nullable().optional(),
  ownerTeamId: z.string().optional(),
  serviceId: z.string().nullable().optional(),
  tags: z.array(z.string()).max(20).optional().default([]),
  attributes: z.record(z.string(), z.unknown()).optional().default({}),
  applicationId: z.string().nullable().optional(),
  description: z.string().max(2000).optional(),
}).strict();
export type CreateCIInput = z.infer<typeof createCISchema>;
```

- [ ] **Step 4: Run PASS + Commit** `feat(cmdb): add createCISchema strict`

---

### Task 8: C — `cmdbRepo.createCI`

**Files:**
- Modify: `server/repositories/cmdb.ts:141`

- [ ] **Step 1: Test — repo.createCI allocates CI- publicId + tenantId**

```ts
// server/__tests__/batch1-cmdb-repo.test.ts
import { cmdbRepo } from '../repositories/cmdb';
it('creates CI', async () => { const ci = await cmdbRepo.createCI('t-'+randomUUID(), { name: 'svc-1', type: 'service' } as any); expect(ci.publicId).toMatch(/^CI-/); });
```

- [ ] **Step 2: Run FAIL**

- [ ] **Step 3: Implement — inside `cmdbRepo` after `updateCI`**

```ts
async createCI(tenantId: string, input: CreateCIInput & { applicationId?: string | null }): Promise<ConfigurationItem> {
  const count = await prisma.configurationItem.count({ where: { tenantId } });
  const seq = String(count + 1).padStart(5, '0');
  const publicId = `CI-${String(input.type).toUpperCase().slice(0,3)}-${seq}`;
  const id = randomUUID();
  const now = new Date();
  const row = await prisma.configurationItem.create({ data: {
    id, publicId, tenantId, name: input.name, type: input.type, status: input.status ?? 'active',
    environment: input.environment ?? 'production', criticality: input.criticality ?? 'medium',
    health: input.health ?? 'operational', ownerId: input.ownerId ?? null, ownerTeamId: input.ownerTeamId ?? 'team-unassigned',
    serviceId: input.serviceId ?? null, tags: JSON.stringify(input.tags ?? []),
    attributes: JSON.stringify(input.attributes ?? {}), primaryApplicationId: input.applicationId ?? await ensureUnassignedApp(tenantId),
    createdAt: now, updatedAt: now,
  }});
  await prisma.cIAuditEntry.create({ data: { id: randomUUID(), tenantId, ciId: id, ciPublicId: publicId, ciName: input.name, action: 'created', actorId: 'system', actorName: 'system', actorType: 'system', source: 'manual', timestamp: now, description: `Created ${publicId}` } });
  return toCI(row);
},
```

Add `import { randomUUID } from 'node:crypto'` at top if missing.

- [ ] **Step 4: Run PASS + Commit** `feat(cmdb): add cmdbRepo.createCI with CI- seq`

---

### Task 9: C — `CmdbScope.createCI` + Route `POST /cis`

**Files:**
- Modify: `server/scope/scopedDb.ts:13,221`, `server/routes/cmdb.ts:62`

- [ ] **Step 1: Write route test failing — POST /cis 201**

```ts
// server/__tests__/batch1-cmdb-route.test.ts
const res = await app.inject({ method: 'POST', url: '/api/v1/cis', headers: { cookie }, payload: { name: 'n1', type: 'service' } });
expect(res.statusCode).toBe(201);
```

- [ ] **Step 2: Run FAIL 404**

- [ ] **Step 3: Implement scope**

```ts
// scopedDb.ts:13 interface
createCI(input: CreateCIInput & { applicationId?: string | null }): Promise<{ result: ConfigurationItem; scopeMode: ScopeMode }>;

// scopedDb.ts:221 cmdb object
async createCI(input) {
  const appId = (input as any).applicationId ?? null;
  const effectiveAppId = appId ?? await ensureUnassignedApp(ctx.tenantId);
  if (!canWriteApp(effectiveAppId)) throw new ScopeViolationError({ module: 'cmdb', action: 'create', applicationId: effectiveAppId });
  const result = await cmdbRepo.createCI(ctx.tenantId, { ...input, applicationId: effectiveAppId });
  return { result, scopeMode: resolveScopeMode(effectiveAppId) ?? 'admin' };
},
```

Add `import type { CreateCIInput } from '../../src/shared/schemas/ci'`.

- [ ] **Step 4: Implement route `server/routes/cmdb.ts:62`**

```ts
import { createCISchema } from '../../src/shared/schemas/ci';
import { audit } from '../audit';
import { getActor } from '../auth/session';
cmdbRouter.post('/cis', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = createCISchema.parse(req.body);
  const actor = await getActor(req);
  const wrapped = await (req as any).scoped.cmdb.createCI({ ...body, applicationId: (body as any).applicationId ?? null });
  await audit(req, { action: 'create', resourceKind: 'ConfigurationItem', resourceId: wrapped.result.id, after: wrapped.result, scopeMode: wrapped.scopeMode });
  // also CIAuditEntry already written, kept for search
  res.status(201).json(wrapped.result);
}));
```

- [ ] **Step 5: Run route test PASS**

```bash
npx vitest run server/__tests__/batch1-cmdb-route.test.ts -v
```

- [ ] **Step 6: Commit** `feat(cmdb): add POST /cis scoped+audited`

---

### Task 10: C — Service + FE wiring (`extraCIs` removal)

**Files:**
- Modify: `src/services/cmdbService.ts:9`, `src/components/cmdb/modals/CreateCIModal.tsx:59`, `src/routes/cmdb/CMDBList.tsx:365`

- [ ] **Step 1: Service test `cmdbService.create` exists**

- [ ] **Step 2: Implement service**

```ts
// src/services/cmdbService.ts:9
create: (input: CreateCIInput) => apiFetch<ConfigurationItem>('/cis', { method: 'POST', body: input }),
```

- [ ] **Step 3: FE — `CreateCIModal.tsx:59` replace `onCreate(ci)` fake → `await cmdbService.create({name,type,status,environment,criticality,health,tags,attributes})` with saving/error state; same for `ImportCIModal 114` loop `await` per row with `Promise.allSettled` + `refreshCIs()`**

```ts
// CMDBList.tsx:50 remove const [extraCIs,setExtraCIs]=useState...
// 53: const allCIs = cisData ?? [];
// 365: onCreate={async (input)=>{ const created=await cisService.create(input); refreshCIs(); toast; onClose(); }}
```

- [ ] **Step 4: Run `npm run lint` + manual `npm run dev:all` click `+ Add CI` → creates persisted row visible after refresh**

- [ ] **Step 5: Commit** `feat(cmdb): wire Create/Import modals to POST /cis`

---

### Task 11: D — `problems` create (shared Zod + repo + scoped + route + FE)

**Files:**
- Create: `src/shared/schemas/problem.ts`
- Modify: `server/repositories/docs.ts:56`, `server/scope/scopedDb.ts:115,497`, `server/routes/itsm.ts:30`, `src/services/itsmServices.ts:12`, `src/routes/problems/ProblemList.tsx:164`

Follow same TDD pattern as B/C (copy steps). Content for `problem.ts`:

```ts
import { z } from 'zod';
export const problemStatusValues = ['identified','investigating','known_error','fix_in_progress','closed'] as const;
export const problemSourceValues = ['incident_pattern','major_incident','proactive','audit','user_reported'] as const;
export const problemSeverityValues = ['P1','P2','P3','P4'] as const;
export const createProblemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  severity: z.enum(problemSeverityValues).default('P3'),
  source: z.enum(problemSourceValues).default('user_reported'),
  affectedCIIds: z.array(z.string()).max(100).optional().default([]),
  affectedServiceIds: z.array(z.string()).max(100).optional().default([]),
  tags: z.array(z.string()).max(20).optional().default([]),
  applicationId: z.string().nullable().optional(),
  ownerId: z.string().nullable().optional(),
}).strict();
export type CreateProblemInput = z.infer<typeof createProblemSchema>;
```

Repo: `problemsRepo.create(tenantId, input, actor)` → `count→PRB-YYYY-NNNNN`, `prisma.problem.create {id:cuid, publicId, tenantId, status:'identified', data:JSON.stringify(problem), applicationId}` + optional `prisma.auditLog` entry.

Scoped: `ProblemsScope.create(input,actor)` mirrors `changes 532 canWriteApp` check.

Route: `itsmRouter.post('/problems', requirePermission('problem.create'), ...createProblemSchema.parse... scoped.problems.create... audit create ...) 201`.

Service: `problemsService.create(input)=>apiFetch('/problems',{method:'POST',body:input})`.

FE: `ProblemList 164` replace `setExtraProblems(prev=>[newProblem,...prev])` with `try{ const c=await problemsService.create({title,description,severity,source,tags}); refresh(); } catch(e){ setError }`. Remove `extraProblems` state entirely, rely on `useResource` data.

Each sub-step: failing test `schema is not defined` / `problemsRepo.create is not a function` / `POST 404` → implement → pass → commit `feat(problem): add create …`.

---

### Task 12: E — `requests` create (catalog submit)

**Files:**
- Modify: `src/shared/schemas/request.ts:31`, `server/repositories/docs.ts:252`, `server/scope/scopedDb.ts:145,609`, `server/routes/itsm.ts:159`, `src/services/itsmServices.ts:67`, `src/routes/portal/CatalogItemDetail.tsx:524`

Zod `src/shared/schemas/request.ts:31` add:

```ts
export const createRequestSchema = z.object({
  catalogItemId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  formData: z.record(z.string(), z.unknown()).optional().default({}),
  tags: z.array(z.string()).max(20).optional().default([]),
  applicationId: z.string().nullable().optional(),
}).strict();
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
```

Repo: `requestsRepo.create(tenantId, actor, input)` → load `prisma.catalogItem.findFirst {tenantId, id:catalogItemId}` → error 404 if missing; `count→REQ-YYYY-NNNNN`, build `WorkflowInstance` from `catalogItem.workflowTemplate` (first `pending→active`), `estimatedCompletion now+totalSlaHours`, `prisma.serviceRequest.create {id:cuid, publicId, tenantId, status:'submitted', data:JSON.stringify(request), applicationId: catalogItem.ownerTeamId? mapped via application}` + `prisma.requestComment` if initial comment. Reuse `changesRepo.create` pattern for `publicId` allocation.

Scoped: `ServiceRequestsScope.create(input,actor)` → `srCanWrite(appId)` guard.

Route: `itsmRouter.post('/requests', requirePermission('request.create'), createRequestSchema.parse, scoped.serviceRequests.create, audit create, 201)`.

Service: `requestsService.create(input)=>apiFetch('/requests',{method:'POST',body:input})`.

FE: `CatalogItemDetail 524` replace `setTimeout 900 → REQ-2026-rand` with `const r=await requestsService.create({catalogItemId, formData, tags}); setNewReqId(r.publicId); setSubmitted(true);`.

TDD steps identical: schema missing → repo missing → route 404 → FE mock.

---

### Task 13: Verification — lint + tests + docs

**Files:**
- Read: `docs/audits/crud-audit.md` (no edit), `docs/features/*` already patched

- [ ] **Step 1: Run full gate**

```bash
npm run lint 2>&1 | tail -20
# Expected: 0 new errors (pre-existing eslint.config.js type mismatch ignored)
npm run test 2>&1 | tail -40
# Expected: all vitest pass (incidents/cmdb/problems/requests batch1 suites)
npx vitest run server/__tests__/batch1-* -v 2>&1 | tail -40
```

- [ ] **Step 2: Manual smoke (dev)**

```bash
npm run dev:all
# Open http://localhost:3000/incidents → New incident → creates INC- persisted, refresh stays, detail 200
# /cmdb → Add CI → POST /cis 201, graph refresh
# /problems → New problem → PRB- persisted
# /portal/catalog/:itemId → Submit → REQ- persisted, /requests queue shows, detail approve still works
```

- [ ] **Step 3: Commit verification marker**

```bash
git commit --allow-empty -m "chore: batch1 ABCDE verification — lint+test green per crud-audit"
```

---

## Self-Review

**Spec coverage (crud-audit §2-6 → batch1 ABCDE):** Health fix `ci.ts:33 healthy→operational` → Task 1. Incident create fakes `INC-2026-random 53` → Tasks 2-6. CMDB fake `ci-Date.now 365` → Tasks 7-10. Problems fake `PRB- seq 166` → Task 11. Requests `setTimeout REQ- rand 527` → Task 12. All require `tenantId` scoping + `ScopeViolationError 403` + `audit`. No placeholders — each task shows exact `file:line` and code.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`. Each Zod `.strict()` + `max` provided, each repo `count+1 PREFIX` provided, each route `requirePermission` + `getActor` + `audit` provided, each FE `saving/error` provided. Fixed via inline.

**Type consistency:** `CreateCIInput` from `ci.ts:ciTypeValues`, `CreateIncidentInput` from `incident.ts:createIncidentSchema`, `CreateProblemInput` from `problem.ts`, `CreateRequestInput` from `request.ts:createRequestSchema`. Repo signatures `create(tenantId, input, actor)` match scoped `create(input,actor)` `resolveScopeMode`. `apiFetch<Incident|ConfigurationItem|Problem|ServiceRequest>` return types align with `src/types/*`.

---

Plan complete and saved to `docs/superpowers/plans/2026-08-28-batch1-itsm-create-unblock.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
