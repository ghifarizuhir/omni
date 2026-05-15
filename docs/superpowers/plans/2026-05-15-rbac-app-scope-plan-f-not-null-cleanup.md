# RBAC × App Scope — Plan F: NOT NULL Promotion + Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out the RBAC × App Scope rollout. Promote `applicationId` (and `primaryApplicationId` on CMDB) to `NOT NULL` on every scoped table; remove the `off` and `warn` enforcement paths from the codebase; tighten the audit `scopeMode` union (drop `'legacy'` and `'bypass'`); strip the route-level try/catch bypass branches so the scope layer becomes load-bearing and always-on.

**Architecture:** A pre-flight script `prisma/preflightScopeNotNull.ts` walks every scoped table and reports any rows where `applicationId` is still NULL — the migration cannot proceed until every count is zero. For tenant-local stragglers, an "Unassigned" synthetic Application per tenant absorbs them via a one-shot remediation step. After preflight, a single migration promotes columns to `NOT NULL`. Then a code-level cleanup: `applyEnforcement` becomes `assertEnforcement` (always throws), the `off`/`warn` env values become invalid (default to `enforce`), the bypass repo-call branches in the route try/catch blocks are deleted, and the `ScopeMode` union shrinks to `'member' | 'noc' | 'owner' | 'admin'`.

**Tech Stack:** Prisma 5 migration, TypeScript, Vitest. No frontend changes.

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md) §10.1 Fase 3 + Fase 5.

**Depends on:** Plan E (`5df5cde`).

**Out of scope:**
- AppAccessRequest workflow.
- Telemetry for adoption metrics.
- Decommissioning the existing backfill script (`prisma/backfillAppScope.ts`) — keep it as a runtime tool for future tenants onboarding.

---

## Critical gate — read before starting

**This plan is destructive in two ways:**

1. **Schema migration is one-way for practical purposes.** Reverting `NOT NULL → NULL` later requires a downtime window. Only run when production data passes the preflight cleanly (or has been remediated via "Unassigned").
2. **Code paths that previously degraded gracefully (`off`/`warn`) are removed.** Any callsite that wasn't migrated through Plans B-1/B-2 will start throwing in production after this lands. The lint rule from Plan B-2 has been in place since `c1a03cf` — that's the safety net — but a human-eye sweep is still worth doing.

**Pre-merge gate:** before merging the PR for Plan F, an operator must run the preflight script against production (or staging-mirror-of-prod) and confirm a clean report. The plan includes a Task that documents the runbook.

---

## Design decisions (read before starting)

### 1. Pre-flight orphan check

Script: `prisma/preflightScopeNotNull.ts`. Walks every scoped table, counts rows where the scope column is NULL. Returns a per-module report:

```json
{ "module": "cmdb", "table": "ConfigurationItem", "column": "primaryApplicationId", "orphan": 0 }
{ "module": "event", "table": "Event", "column": "applicationId", "orphan": 0 }
...
```

Exit code:
- `0` if every count is zero — safe to proceed.
- `1` if any count is non-zero — blocks the migration.

CLI flags:
- `--tenant=<id>` to scope to one tenant for incremental rollouts.
- `--remediate` to create the "Unassigned" synthetic app per tenant and assign all orphans to it. Audit-logged.

### 2. "Unassigned" synthetic Application

For each tenant, create one Application with `code='UNASSIGNED'`, `name='Unassigned'`, `criticality=null`. ApplicationTeam: zero entries — only PlatformAdmin can write to it via existing functional-role bypass. Existing orphan rows get their scope column set to this app's id.

This is the safety valve. The migration becomes possible even when remediation hasn't been perfect, because operators can keep using Plan C's `/admin/data-quality` UI to migrate rows OUT of "Unassigned" over time.

### 3. Migration

Single Prisma migration `not_null_application_id` containing:

```sql
-- Step 1: Final orphan check (guard).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ConfigurationItem" WHERE "primaryApplicationId" IS NULL) THEN
    RAISE EXCEPTION 'preflight failed: ConfigurationItem has NULL primaryApplicationId rows';
  END IF;
  -- repeat per table
END $$;

-- Step 2: Promote.
ALTER TABLE "ConfigurationItem" ALTER COLUMN "primaryApplicationId" SET NOT NULL;
ALTER TABLE "Event"             ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "Incident"          ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "Problem"           ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "Change"            ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "Release"           ALTER COLUMN "applicationId" SET NOT NULL;
ALTER TABLE "ServiceRequest"    ALTER COLUMN "applicationId" SET NOT NULL;
```

The Prisma schema is updated in lockstep — drop the `?` from each field.

### 4. Code cleanup

| File | Change |
|---|---|
| `server/scope/enforcement.ts` | `applyEnforcement` renamed to `assertEnforcement`; reads the env var only to verify it's `'enforce'` (any other value is a startup error). Always throws `ScopeViolationError`. |
| `server/scope/scopedDb.ts` | `ScopeMode` union loses `'legacy'` and `'bypass'`. Every helper that returned them now returns the precise admin/owner/noc/member label. The "legacy null appId is unscoped" branch is deleted from `cmdb.updateCI`, `events.setStatus`, `incidents.*`, etc. — since columns are NOT NULL, the null branch is unreachable. |
| `server/routes/cmdb.ts`, `events.ts`, `incidents.ts`, `itsm.ts`, `monitoring.ts` | Delete the try/catch + `applyEnforcement` + bypass-repo-call branches. `ScopeViolationError` propagates to the global error handler and becomes 403. |
| `server/audit.ts` | `AuditEvent.scopeMode` type narrowed; the JSON column `scopeMode` may already contain `'legacy'` / `'bypass'` values in historical rows — keep the column as a plain string (it's already `String?` in Prisma), so old data isn't broken. |
| `.env.example` | Remove `SCOPE_ENFORCEMENT_MODE` line (it's no longer a knob). Or keep it documented as "must be enforce; deprecated knob, will be removed in N+1". Pick the former — clean removal. |
| `server/__tests__/scope-cmdb.test.ts`, `scope-incidents.test.ts`, `scope-changes.test.ts` | Delete the `off` and `warn` mode test cases; keep only the `enforce` ones (which were always the truth tests anyway). |

### 5. Frontend impact

None directly. The `feature.app_scope_ui` flag continues to work; PageScopeChip and AppScopeSwitcher don't depend on enforcement mode. The form mismatch modal still functions identically.

### 6. Audit history

Existing `AuditLog` rows with `scopeMode = 'legacy'` or `'bypass'` are preserved as-is (the DB column is plain `String?`). They represent historical writes — keeping them is the audit-trail correct thing to do. Only future writes use the narrower union.

### 7. Tests

- **Preflight script unit test**: zero-orphan case returns exit 0; one-orphan case returns exit 1.
- **Migration smoke**: after migration, `prisma.configurationItem.create({ data: { ..., primaryApplicationId: undefined } })` must throw at the DB layer.
- **Scope-cmdb / scope-incidents / scope-changes**: trimmed to enforce-only cases; pre-existing CI/incident/change tests remain green because they all use the seed admin (PLATFORM_ADMIN bypass already had).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `prisma/preflightScopeNotNull.ts` | Create | Pre-migration guard + `--remediate` Unassigned-app fallback. |
| `prisma/migrations/<ts>_not_null_application_id/migration.sql` | Generated | Per-table `ALTER COLUMN SET NOT NULL` + a DO-block precheck. |
| `prisma/schema.prisma` | Modify | Drop `?` from scope columns. |
| `server/scope/enforcement.ts` | Modify | Always-throws semantics; env validation. |
| `server/scope/scopedDb.ts` | Modify | Narrow `ScopeMode`; drop legacy NULL branches. |
| `server/routes/cmdb.ts` | Modify | Drop bypass catch path. |
| `server/routes/events.ts` | Modify | Same. |
| `server/routes/incidents.ts` | Modify | Same (multiple handlers). |
| `server/routes/itsm.ts` | Modify | Same. |
| `server/routes/monitoring.ts` | Modify | Same. |
| `server/audit.ts` | Modify | Narrow `scopeMode` type. |
| `.env.example` | Modify | Remove `SCOPE_ENFORCEMENT_MODE`. |
| `server/__tests__/scope-cmdb.test.ts` | Modify | Drop off/warn cases. |
| `server/__tests__/scope-incidents.test.ts` | Modify | Same. |
| `server/__tests__/scope-changes.test.ts` | Modify | Same. |
| `server/__tests__/preflight-scope-not-null.test.ts` | Create | Preflight script unit test. |
| `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` | Modify | Mark Fase 3 + Fase 5 done. |

---

## Task 1: Pre-flight script

**Files:** Create `prisma/preflightScopeNotNull.ts`, create `server/__tests__/preflight-scope-not-null.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import { runPreflight } from '../../prisma/preflightScopeNotNull';
import { createScopedAppFixture, type ScopedAppFixture } from './helpers';

let fx: ScopedAppFixture;
let tenantId: string;

beforeAll(async () => {
  fx = await createScopedAppFixture('preflight');
  const t = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });
  tenantId = t.id;
});
afterAll(async () => { await fx.cleanup(); await prisma.$disconnect(); });

describe('runPreflight', () => {
  it('returns clean=true when no orphan rows exist for the fixture tenant', async () => {
    const report = await runPreflight({ tenantId });
    expect(report.clean).toBe(true);
    expect(report.modules.every((m) => m.orphan === 0)).toBe(true);
  });

  it('detects orphans and reports clean=false', async () => {
    // Create an orphan CI directly.
    await prisma.configurationItem.create({
      data: {
        id: 'ci-preflight-orphan', tenantId, publicId: 'CI-PREFLIGHT-ORPHAN',
        name: 'orphan', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
        ownerTeamId: fx.teamAId, primaryApplicationId: null,
        health: 'healthy', attributes: '{}', tags: '[]',
      },
    });
    const report = await runPreflight({ tenantId });
    expect(report.clean).toBe(false);
    expect(report.modules.find((m) => m.module === 'cmdb')?.orphan).toBe(1);
    await prisma.configurationItem.delete({ where: { id: 'ci-preflight-orphan' } });
  });

  it('--remediate creates Unassigned app and assigns orphans', async () => {
    await prisma.configurationItem.create({
      data: {
        id: 'ci-preflight-remediate', tenantId, publicId: 'CI-PREFLIGHT-REMEDIATE',
        name: 'orphan', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
        ownerTeamId: fx.teamAId, primaryApplicationId: null,
        health: 'healthy', attributes: '{}', tags: '[]',
      },
    });
    const report = await runPreflight({ tenantId, remediate: true });
    expect(report.clean).toBe(true);
    const row = await prisma.configurationItem.findUniqueOrThrow({ where: { id: 'ci-preflight-remediate' } });
    const unassigned = await prisma.application.findFirstOrThrow({ where: { tenantId, code: 'UNASSIGNED' } });
    expect(row.primaryApplicationId).toBe(unassigned.id);
    // Cleanup.
    await prisma.configurationItem.delete({ where: { id: 'ci-preflight-remediate' } });
    await prisma.application.delete({ where: { id: unassigned.id } });
  });
});
```

Run, expect failure (script doesn't exist).

- [ ] **Step 2: Implement `prisma/preflightScopeNotNull.ts`**

```ts
import { prisma } from '../server/db';

export type ModuleKey = 'cmdb' | 'event' | 'incident' | 'change' | 'problem' | 'release' | 'service_request';

interface ModuleReport {
  module: ModuleKey;
  table: string;
  column: 'primaryApplicationId' | 'applicationId';
  orphan: number;
}

export interface PreflightReport {
  clean: boolean;
  modules: ModuleReport[];
}

const MODULES: Array<{ key: ModuleKey; table: string; column: 'primaryApplicationId' | 'applicationId' }> = [
  { key: 'cmdb', table: 'ConfigurationItem', column: 'primaryApplicationId' },
  { key: 'event', table: 'Event', column: 'applicationId' },
  { key: 'incident', table: 'Incident', column: 'applicationId' },
  { key: 'change', table: 'Change', column: 'applicationId' },
  { key: 'problem', table: 'Problem', column: 'applicationId' },
  { key: 'release', table: 'Release', column: 'applicationId' },
  { key: 'service_request', table: 'ServiceRequest', column: 'applicationId' },
];

async function countOrphans(module: ModuleKey, column: string, tenantId?: string): Promise<number> {
  const where = (col: string) => (tenantId
    ? { tenantId, [col]: null }
    : { [col]: null });
  switch (module) {
    case 'cmdb':            return prisma.configurationItem.count({ where: where(column) });
    case 'event':           return prisma.event.count({ where: where(column) });
    case 'incident':        return prisma.incident.count({ where: where(column) });
    case 'change':          return prisma.change.count({ where: where(column) });
    case 'problem':         return prisma.problem.count({ where: where(column) });
    case 'release':         return prisma.release.count({ where: where(column) });
    case 'service_request': return prisma.serviceRequest.count({ where: where(column) });
  }
}

async function ensureUnassignedApp(tenantId: string): Promise<string> {
  const existing = await prisma.application.findFirst({ where: { tenantId, code: 'UNASSIGNED' } });
  if (existing) return existing.id;
  const created = await prisma.application.create({
    data: { id: `app-unassigned-${tenantId}`, tenantId, code: 'UNASSIGNED', name: 'Unassigned', criticality: null },
  });
  return created.id;
}

async function remediateOne(module: ModuleKey, column: string, tenantId: string, unassignedId: string): Promise<number> {
  const data = { [column]: unassignedId };
  const where = { tenantId, [column]: null };
  switch (module) {
    case 'cmdb':            return (await prisma.configurationItem.updateMany({ where, data })).count;
    case 'event':           return (await prisma.event.updateMany           ({ where, data })).count;
    case 'incident':        return (await prisma.incident.updateMany        ({ where, data })).count;
    case 'change':          return (await prisma.change.updateMany          ({ where, data })).count;
    case 'problem':         return (await prisma.problem.updateMany         ({ where, data })).count;
    case 'release':         return (await prisma.release.updateMany         ({ where, data })).count;
    case 'service_request': return (await prisma.serviceRequest.updateMany  ({ where, data })).count;
  }
}

export async function runPreflight(opts: { tenantId?: string; remediate?: boolean } = {}): Promise<PreflightReport> {
  // First pass: count orphans.
  let modules: ModuleReport[] = await Promise.all(
    MODULES.map(async (m) => ({ module: m.key, table: m.table, column: m.column, orphan: await countOrphans(m.key, m.column, opts.tenantId) })),
  );

  // Optional remediation: requires a tenantId to target the Unassigned-app fallback.
  if (opts.remediate && opts.tenantId) {
    const unassignedId = await ensureUnassignedApp(opts.tenantId);
    for (const m of modules) {
      if (m.orphan > 0) await remediateOne(m.module, m.column, opts.tenantId, unassignedId);
    }
    // Re-count.
    modules = await Promise.all(
      MODULES.map(async (m) => ({ module: m.key, table: m.table, column: m.column, orphan: await countOrphans(m.key, m.column, opts.tenantId) })),
    );
  }

  return { clean: modules.every((m) => m.orphan === 0), modules };
}

if (require.main === module || process.argv[1]?.endsWith('preflightScopeNotNull.ts')) {
  const argv = process.argv.slice(2);
  const tenantArg = argv.find((a) => a.startsWith('--tenant='))?.split('=')[1];
  const remediate = argv.includes('--remediate');
  runPreflight({ tenantId: tenantArg, remediate }).then((report) => {
    for (const m of report.modules) console.log(JSON.stringify(m));
    console.error(`\nPreflight ${report.clean ? 'CLEAN' : 'BLOCKED'}: ${report.modules.reduce((acc, m) => acc + m.orphan, 0)} orphans total`);
    return prisma.$disconnect().then(() => process.exit(report.clean ? 0 : 1));
  }).catch((e) => { console.error(e); prisma.$disconnect().then(() => process.exit(2)); });
}
```

- [ ] **Step 3: Run tests, expect pass.** Lint clean.

- [ ] **Step 4: Commit**

```bash
git add prisma/preflightScopeNotNull.ts server/__tests__/preflight-scope-not-null.test.ts
git commit -m "feat(scope): preflightScopeNotNull script with --remediate fallback"
```

---

## Task 2: Schema migration

**Files:** Modify `prisma/schema.prisma`, generate migration

- [ ] **Step 1: Drop `?` in `prisma/schema.prisma`**

Find each scope column and remove the `?`:
- `ConfigurationItem.primaryApplicationId String?` → `String`
- `Event.applicationId String?` → `String`
- `Incident.applicationId String?` → `String`
- `Problem.applicationId String?` → `String`
- `Change.applicationId String?` → `String`
- `Release.applicationId String?` → `String`
- `ServiceRequest.applicationId String?` → `String`

- [ ] **Step 2: Run preflight against local DB first**

```
npx dotenv-cli -e .env.local -- npx tsx prisma/preflightScopeNotNull.ts
```

If clean, proceed. If not, remediate first:
```
npx dotenv-cli -e .env.local -- npx tsx prisma/preflightScopeNotNull.ts --tenant=tenant-demo --remediate
```

- [ ] **Step 3: Generate migration**

```
npm run db:migrate -- --name not_null_application_id
```

Open the generated SQL and verify it contains `ALTER COLUMN "..." SET NOT NULL` for each of the 7 columns. Prisma will refuse to generate if any row is still NULL — that's the safety net.

If Prisma's diff differs from the spec's DO-block guard, that's fine: Prisma's pre-migration NULL check is sufficient.

- [ ] **Step 4: Run `npx prisma migrate status`** — confirm "Database schema is up to date!".

- [ ] **Step 5: Commit**

```
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): promote applicationId / primaryApplicationId to NOT NULL"
```

---

## Task 3: Tighten `enforcement.ts` and `ScopeMode`

**Files:** Modify `server/scope/enforcement.ts`, modify `server/scope/scopedDb.ts`, modify `server/audit.ts`

- [ ] **Step 1: Update `enforcement.ts`**

```ts
import { logger } from '../logger';
import { ScopeViolationError } from './errors';

const VALID_MODE = 'enforce' as const;

export function readEnforcementMode(): 'enforce' {
  const raw = (process.env.SCOPE_ENFORCEMENT_MODE ?? 'enforce').trim().toLowerCase();
  if (raw !== VALID_MODE) {
    logger.warn({ requestedMode: raw }, 'SCOPE_ENFORCEMENT_MODE is deprecated; only "enforce" is honored');
  }
  return 'enforce';
}

/**
 * Always throws the violation. Replaces the legacy applyEnforcement which
 * used to swallow errors in `off`/`warn` modes. Kept the name short and
 * directive — callers shouldn't catch this.
 */
export function assertEnforcement(err: ScopeViolationError): never {
  throw err;
}

/** @deprecated use assertEnforcement; kept for one release for compat */
export const applyEnforcement = assertEnforcement;
```

Drop the `EnforcementMode` type export (no one needs it externally).

- [ ] **Step 2: Update `ScopeMode` union in `scopedDb.ts`**

```ts
export type ScopeMode = 'member' | 'noc' | 'owner' | 'admin';
```

Find every helper that previously returned `'legacy'` and replace with the correct precise label, since `applicationId` can no longer be null:

```ts
// CMDB
async updateCI(publicId, patch) {
  const raw = await prisma.configurationItem.findFirst({
    where: { tenantId: ctx.tenantId, publicId },
    select: { primaryApplicationId: true },
  });
  if (!raw) return null;
  const appId = raw.primaryApplicationId; // NOT NULL now
  if (!canWriteApp(appId)) {
    throw new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: appId });
  }
  const mode: ScopeMode = resolveScopeMode(appId) ?? 'admin'; // ?? is now defensive only
  const result = await cmdbRepo.updateCI(ctx.tenantId, publicId, patch);
  return { result, scopeMode: mode };
},
```

Repeat the same simplification for `events.setStatus`, `incidents.*`, `changes.*`, `serviceRequests.*` — wherever the code had a `if (appId === null) /* legacy */` branch, delete that branch. The non-null assertion gives the compiler what it needs.

- [ ] **Step 3: Update `server/audit.ts`**

Narrow:
```ts
export interface AuditEvent {
  // ...
  scopeMode?: 'member' | 'noc' | 'owner' | 'admin';
}
```

The DB column remains `String?` so historical `'legacy'`/`'bypass'` rows are not invalidated; only the type that callers pass is narrowed.

- [ ] **Step 4: Lint check**

`npm run lint`. Fix any type errors that surface — the narrowed union will likely flag a few `scopeMode: 'legacy'` or `scopeMode: 'bypass'` literals in the existing route handlers. Those literals get removed in Task 4 anyway, so either tolerate the temporary error (commit Task 3 + Task 4 together) or stub them now.

- [ ] **Step 5: Commit**

```
git add server/scope/enforcement.ts server/scope/scopedDb.ts server/audit.ts
git commit -m "refactor(scope): narrow ScopeMode union; enforcement is now always-on"
```

---

## Task 4: Remove route-level bypass paths

**Files:** Modify each of `server/routes/{cmdb,events,incidents,itsm,monitoring}.ts`

For each file, find the try/catch blocks that look like:

```ts
try {
  const wrapped = await scoped(req).<module>.<method>(...);
  // ...
} catch (e) {
  if (e instanceof ScopeViolationError) {
    applyEnforcement(e, res);
    // bypass path: call repo directly
    const direct = await <module>Repo.<method>(req.tenantId, ...);
    // ...
    await audit(req, { ..., scopeMode: 'bypass' });
    return res.json(direct);
  }
  throw e;
}
```

Replace with the straight-line happy path. The global error handler in `server/app.ts` already translates `ScopeViolationError` to 403.

```ts
const wrapped = await scoped(req).<module>.<method>(...);
if (!wrapped) throw new HttpError(404, '<Resource> not found');
await audit(req, { ..., scopeMode: wrapped.scopeMode });
res.json(wrapped.result);
```

After the cleanup, each route file no longer needs to import the underlying repo or `applyEnforcement` for the bypass purpose. **Important**: the route still imports the repo if there are legitimate non-scoped uses (e.g., reading lists where the repo has formatting logic that the scope layer delegates to anyway). Re-check each `import { *Repo }` line after the diff and remove only the imports that are now unused.

ESLint rule `no-restricted-imports` from Plan B-2 already bans direct `prisma`/`@prisma/client` in route files — that stays in place.

- [ ] **Step 1: `server/routes/cmdb.ts`**

Strip the bypass branch in `PATCH /cis/:publicId`.

- [ ] **Step 2: `server/routes/events.ts`**

Strip the bypass branch in `PATCH /events/:publicId/status` and `POST /events/ingest`.

- [ ] **Step 3: `server/routes/incidents.ts`**

Strip bypass branches in every mutating handler — there are ~10.

- [ ] **Step 4: `server/routes/itsm.ts`**

Strip bypass branches across the changes/problems/requests handlers.

- [ ] **Step 5: `server/routes/monitoring.ts`**

Same for monitoring rules + alert routes.

- [ ] **Step 6: Lint + run pre-existing tests**

```
npm run lint
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/ci-edit.test.ts \
  server/__tests__/admin-data-quality.test.ts \
  server/__tests__/admin-app-membership.test.ts
```

Some scope-* tests will fail because they relied on `off` or `warn` mode behavior — that's Task 5. Tolerate failures here OR fix them in this commit and bundle the test+code change.

- [ ] **Step 7: Commit**

```
git add server/routes
git commit -m "refactor(scope): drop bypass branches in route handlers (enforce-only)"
```

---

## Task 5: Trim integration tests

**Files:** Modify `server/__tests__/scope-cmdb.test.ts`, `scope-incidents.test.ts`, `scope-changes.test.ts`

Remove the test cases that asserted `off` and `warn` behavior:

- `scope-cmdb.test.ts`:
  - "memberB PATCH succeeds in off mode" → DELETE.
  - "memberB PATCH gets 200 + X-Scope-Warning in warn mode" → DELETE.
  - Legacy NULL test (memberB can PATCH a NULL-app CI) → DELETE (the column is no longer nullable).
- `scope-incidents.test.ts`:
  - "memberB gets 200 + X-Scope-Warning in warn mode" → DELETE.
- `scope-changes.test.ts`:
  - "memberB gets X-Scope-Warning in warn mode" → DELETE.
  - "memberB succeeds silently in off mode" → DELETE.

Keep:
- All `enforce`-mode cases.
- All admin/owner bypass cases (NOC bypass for incident.setStatus, etc.).

Remove `process.env.SCOPE_ENFORCEMENT_MODE = 'enforce'` lines too — it's the default now.

After trimming, run all three test files. Expected: every remaining case green.

- [ ] **Step 1: Trim each test file.**
- [ ] **Step 2: Run + iterate.**
- [ ] **Step 3: Commit**

```
git add server/__tests__/scope-cmdb.test.ts server/__tests__/scope-incidents.test.ts server/__tests__/scope-changes.test.ts
git commit -m "test(scope): drop off/warn mode cases — enforce is the only mode"
```

---

## Task 6: `.env.example` + spec finalization

**Files:** Modify `.env.example`, modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Drop `SCOPE_ENFORCEMENT_MODE` from `.env.example`**

Delete those lines outright. If you prefer to document the deprecation, add a one-line comment:
```
# (Deprecated) SCOPE_ENFORCEMENT_MODE was an off/warn/enforce toggle through Plan E.
# After Plan F it is always enforce; the env var is ignored.
```

- [ ] **Step 2: Mark Fase 3 + Fase 5 done in the spec**

In §10.1:
- Fase 3 row: append `✅ done (Plan F)`.
- Fase 5 row: append `✅ done (Plan F)`.

In §10.3 DoD:
- `applicationId NOT NULL di semua tabel scoped.` → tick.

- [ ] **Step 3: Full regression sweep**

```
npm run lint && npm run build && \
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/scope-foundation.test.ts \
  server/__tests__/scope-context.test.ts \
  server/__tests__/admin-data-quality.test.ts \
  server/__tests__/admin-app-membership.test.ts \
  server/__tests__/applications-catalog.test.ts \
  server/__tests__/backfill-scope.test.ts \
  server/__tests__/preflight-scope-not-null.test.ts \
  server/__tests__/ci-edit.test.ts
```

All green.

- [ ] **Step 4: Commit**

```
git add .env.example docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(scope): close rollout — Fase 3 + Fase 5 done"
```

---

## Done criteria for Plan F

- [ ] `prisma/preflightScopeNotNull.ts` exists with `--tenant` and `--remediate` flags; exit code reflects clean/blocked state.
- [ ] Migration `not_null_application_id` applied; every scope column is `NOT NULL` in `schema.prisma` and in the DB.
- [ ] `enforcement.ts` no longer exports `EnforcementMode`; `applyEnforcement` / `assertEnforcement` always throws.
- [ ] `ScopeMode` union is `'member' | 'noc' | 'owner' | 'admin'`. `'legacy'` and `'bypass'` are removed from the type.
- [ ] Route files no longer contain `if (e instanceof ScopeViolationError)` bypass branches. The global error handler is the single 403 translator.
- [ ] Test suites pruned of `off`/`warn` cases; all remaining cases green.
- [ ] `.env.example` no longer advertises `SCOPE_ENFORCEMENT_MODE` as a knob.
- [ ] Spec §10.1 Fase 3 + Fase 5 + §10.3 DoD `NOT NULL` checkmark ticked.
- [ ] `npm run lint` clean, `npm run build` clean.

## Post-rollout (operational, not in this plan)
- Remove `prisma/backfillAppScope.ts` from runtime after a few quarters of stability. Keep it in `scripts/` archive.
- Decommission the `/admin/data-quality` page once orphan rate stays at zero for ≥1 quarter (it can still be useful for tenant onboarding; reassess later).
- Wire telemetry on `[scope] switch` events from Plan E.
