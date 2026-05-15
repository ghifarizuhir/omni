# RBAC × App Scope — Plan C: Backfill + Data-Quality Admin UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `applicationId` on every existing operational row that can be derived automatically, expose the rows that can't via a `/admin/data-quality` UI for manual triage, and provide a CLI to run/dry-run the backfill against any environment.

**Architecture:** A pure-Prisma script `prisma/backfillAppScope.ts` walks each scoped table, derives `applicationId` from the data already present (`CI.ownerTeamId` → `ApplicationTeam` lookup; Event/Incident → first affected CI's `primaryApplicationId`; Change/Problem/Request → CI references inside the JSON `data` blob). The script supports `--dry-run` (default), `--apply`, and `--module=<key>`; it produces a per-module report (`total / alreadyScoped / backfilled / ambiguous / orphan`). Rows that remain orphan are listed in a new admin section at `/admin/data-quality`, where PlatformAdmins can set `applicationId` manually via new `PATCH /admin/data-quality/<module>/<id>` endpoints.

**Tech Stack:** Prisma 5, TypeScript, Vitest + supertest, React 19 admin UI (Tailwind + existing primitives in `src/components/ui`).

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md) §10.1 Fase 1.

**Depends on:** Plan B-2 (`d88c251`).

**Out of scope (later plans):**
- Promoting `applicationId` to `NOT NULL` and removing `off`/`warn` paths → Plan F.
- `AppScopeSwitcher` end-user UX → Plan E.
- Membership self-service admin UI → Plan D.

---

## Design decisions (read before starting)

### Backfill heuristics per module

| Module | Source for `applicationId` |
|---|---|
| `ConfigurationItem.primaryApplicationId` | Look up `ApplicationTeam` rows for `ownerTeamId`. If exactly **one** app → assign. If **>1** → mark **ambiguous** (operator picks). If **0** → mark **orphan**. |
| `Event.applicationId` | Parse `affectedCIIds` JSON; for each CI in order, look up `primaryApplicationId`. First non-null wins. If none → orphan. (Requires CI backfill to run first.) |
| `Incident.applicationId` | Same as Event: walk `affectedCIIds`, take first CI's app. |
| `Change.applicationId` | Parse `data` JSON, look for `affectedCIIds` array; same walk as Event. (Many existing dev rows may have a different shape — handle gracefully and report as orphan if no recognizable field.) |
| `Problem.applicationId` | Same as Change. |
| `ServiceRequest.applicationId` | Heuristic: parse `data` JSON, look for `serviceId` → `service.applicationId` if available; otherwise orphan. If `Service` doesn't carry an `applicationId` link today, every SR is orphan and operator must assign manually. |
| `Release` | Skipped — releases are admin-only writes; backfill is N/A. |

Implementation principle: **never guess** when there's ambiguity. If a row could plausibly belong to two different apps, it goes to the `ambiguous` bucket and operators decide.

### CLI shape

```
npx tsx prisma/backfillAppScope.ts                    # default: --dry-run, all modules
npx tsx prisma/backfillAppScope.ts --apply            # writes to DB
npx tsx prisma/backfillAppScope.ts --module=cmdb      # one module only
npx tsx prisma/backfillAppScope.ts --module=incident --apply
npx tsx prisma/backfillAppScope.ts --tenant=tenant-demo --apply  # one tenant
```

Output format (JSON to stdout, one line per module):
```json
{"module":"cmdb","total":214,"alreadyScoped":12,"backfilled":167,"ambiguous":8,"orphan":27}
```

Plus a human-readable summary at the bottom.

The script is **idempotent**: re-running it never changes a row that already has `applicationId`. The `--apply` mode is the only one that writes.

### Admin UI

Route: `/admin/data-quality`. Tabs per module. Each tab shows:
- A KPI row: `Backfilled • Ambiguous • Orphan` counts for that module in this tenant.
- A table of orphan + ambiguous rows with their identifying info (publicId, name/title, ownerTeam if any, candidate apps if ambiguous).
- Per-row dropdown to pick an Application (filtered by user's tenant) + a "Save" button.
- A "Bulk assign" action: select multiple rows + pick an app → one round-trip.

Backed by these new endpoints, all gated on `system.admin`:
- `GET  /api/v1/admin/data-quality/summary` — counts per module per tenant.
- `GET  /api/v1/admin/data-quality/<module>?status=orphan|ambiguous` — list rows that need triage.
- `PATCH /api/v1/admin/data-quality/<module>/<id>` body `{ applicationId }` — write the column.
- `POST /api/v1/admin/data-quality/<module>/bulk` body `{ ids: string[], applicationId }` — bulk write.

The implementation is module-aware via a dispatcher map (`{ cmdb: { table, idField, appField }, event: {...}, … }`) so we don't end up with seven near-identical handlers.

### Tests

- **Script unit test** (`server/__tests__/backfill-scope.test.ts`): build a synthetic fixture (1 tenant, 2 apps, 2 teams, 4 CIs with varying ownerTeam membership: 1 unique-team→1-app, 1 unique-team→0-apps, 1 multi-app-team, 1 already scoped), run the script in `--dry-run` then `--apply`, assert counts and final DB state.
- **Endpoint integration test** (`server/__tests__/admin-data-quality.test.ts`): admin can call the endpoints; non-admin gets 403; the PATCH actually writes; the bulk endpoint works; rejecting an invalid `applicationId` from a different tenant returns 400.
- **UI smoke**: not in scope for this plan (manual verify in browser).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `prisma/backfillAppScope.ts` | Create | CLI script with `--dry-run` / `--apply` / `--module` / `--tenant` flags. |
| `server/routes/admin/dataQuality.ts` | Create | New sub-router mounted at `/admin/data-quality`. |
| `server/routes/admin.ts` | Modify | Wire the new sub-router. |
| `server/repositories/dataQuality.ts` | Create | Reusable lookup/update helpers that the backfill script and the admin endpoints both use. Single source of truth for the heuristics. |
| `src/routes/admin/DataQuality.tsx` | Create | React page with per-module tabs. |
| `src/routes/admin/AdminLayout.tsx` | Modify | Add "Data Quality" nav link (PlatformAdmin only). |
| `src/services/admin.ts` | Modify | Add typed client methods for the new endpoints. |
| `src/routes/index.tsx` | Modify | Route registration for `/admin/data-quality`. |
| `server/__tests__/backfill-scope.test.ts` | Create | Script behavior. |
| `server/__tests__/admin-data-quality.test.ts` | Create | API behavior. |
| `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` | Modify | Mark Fase 1 as done. |

---

## Task 1: Module dispatcher + shared heuristics

**Files:** Create `server/repositories/dataQuality.ts`

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/backfill-scope.test.ts`. Append to it across tasks. First test:

```ts
import { describe, expect, it } from 'vitest';
import { MODULES, deriveAppIdForCI } from '../repositories/dataQuality';

describe('dataQuality MODULES dispatcher', () => {
  it('exposes the 6 scoped modules with table + column metadata', () => {
    expect(Object.keys(MODULES).sort()).toEqual(
      ['change', 'cmdb', 'event', 'incident', 'problem', 'service_request'],
    );
    expect(MODULES.cmdb.appColumn).toBe('primaryApplicationId');
    expect(MODULES.event.appColumn).toBe('applicationId');
  });
});
```

- [ ] **Step 2: Run, expect failure** (module not found).

- [ ] **Step 3: Implement `server/repositories/dataQuality.ts`**

```ts
import { prisma } from '../db';

export type ModuleKey = 'cmdb' | 'event' | 'incident' | 'change' | 'problem' | 'service_request';

export interface ModuleSpec {
  /** Prisma delegate accessor (so we can `delegate.findFirst`, etc.). */
  delegate: () => {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
  /** Column to read/write — most are `applicationId`, CMDB is `primaryApplicationId`. */
  appColumn: 'applicationId' | 'primaryApplicationId';
  /** ID field used in URLs (publicId for most; id for CI's primary key — caller picks). */
  idField: 'publicId' | 'id';
  /** Friendly label for UI/logs. */
  label: string;
}

export const MODULES: Record<ModuleKey, ModuleSpec> = {
  cmdb: {
    delegate: () => prisma.configurationItem as unknown as ModuleSpec['delegate'] extends () => infer R ? R : never,
    appColumn: 'primaryApplicationId',
    idField: 'publicId',
    label: 'CMDB',
  },
  event:           { delegate: () => prisma.event           as any, appColumn: 'applicationId', idField: 'publicId', label: 'Events' },
  incident:        { delegate: () => prisma.incident        as any, appColumn: 'applicationId', idField: 'publicId', label: 'Incidents' },
  change:          { delegate: () => prisma.change          as any, appColumn: 'applicationId', idField: 'publicId', label: 'Changes' },
  problem:         { delegate: () => prisma.problem         as any, appColumn: 'applicationId', idField: 'publicId', label: 'Problems' },
  service_request: { delegate: () => prisma.serviceRequest  as any, appColumn: 'applicationId', idField: 'publicId', label: 'Service Requests' },
};

/**
 * Derive a CI's primaryApplicationId from its ownerTeamId.
 * Returns:
 *   { kind: 'backfill', appId } — exactly one app
 *   { kind: 'ambiguous', candidates } — >1 app
 *   { kind: 'orphan' } — 0 apps
 */
export async function deriveAppIdForCI(tenantId: string, ownerTeamId: string | null):
  Promise<{ kind: 'backfill'; appId: string } | { kind: 'ambiguous'; candidates: string[] } | { kind: 'orphan' }> {
  if (!ownerTeamId) return { kind: 'orphan' };
  const rows = await prisma.applicationTeam.findMany({
    where: { teamId: ownerTeamId },
    select: { applicationId: true },
  });
  if (rows.length === 0) return { kind: 'orphan' };
  if (rows.length === 1) return { kind: 'backfill', appId: rows[0].applicationId };
  return { kind: 'ambiguous', candidates: rows.map((r) => r.applicationId) };
}

/**
 * Derive applicationId for Event/Incident from the affected-CI list.
 * Returns the first CI's primaryApplicationId, or orphan if no CI matches.
 */
export async function deriveAppIdFromCIs(tenantId: string, ciIds: string[]):
  Promise<{ kind: 'backfill'; appId: string } | { kind: 'orphan' }> {
  if (ciIds.length === 0) return { kind: 'orphan' };
  const cis = await prisma.configurationItem.findMany({
    where: { tenantId, id: { in: ciIds } },
    select: { primaryApplicationId: true },
  });
  for (const ci of cis) {
    if (ci.primaryApplicationId) return { kind: 'backfill', appId: ci.primaryApplicationId };
  }
  return { kind: 'orphan' };
}
```

(The `as any` casts on the Prisma delegates are intentional — Prisma's per-model types diverge in subtle ways; we abstract behind a runtime-typed `ModuleSpec` because the consumers only need `findMany / update / count`. Acceptable for a backfill utility — flag if the lint config forbids `as any` in `server/`.)

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/repositories/dataQuality.ts server/__tests__/backfill-scope.test.ts
git commit -m "feat(scope): dataQuality module dispatcher + shared derivation helpers"
```

---

## Task 2: Backfill — CMDB

**Files:** Create `prisma/backfillAppScope.ts`, modify `server/__tests__/backfill-scope.test.ts`

- [ ] **Step 1: Append failing test**

```ts
import { runBackfill } from '../../prisma/backfillAppScope';
import { prisma } from '../db';
import { createScopedAppFixture } from './helpers';

describe('runBackfill — cmdb', () => {
  it('assigns CI.primaryApplicationId when team has exactly one app, ambiguous when >1, orphan when 0', async () => {
    const fx = await createScopedAppFixture('backfill-cmdb');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });

    // Make teamA member of a second app so we can test ambiguous.
    const secondApp = await prisma.application.create({
      data: { id: 'app-backfill-second', tenantId: tenant.id, code: 'BF_SECOND', name: 'Second' },
    });
    await prisma.applicationTeam.create({ data: { applicationId: secondApp.id, teamId: fx.teamAId, role: 'CONTRIBUTOR' } });

    // Make teamB member of nothing → orphan.
    // Create three CIs:
    //   ci-unique → ownerTeamId=teamB → orphan (teamB has no app)
    //   ci-amb    → ownerTeamId=teamA → ambiguous (teamA in fx.appId + secondApp)
    //   ci-scoped → primaryApplicationId already set → alreadyScoped
    const made: string[] = [];
    for (const [id, owner, app] of [['ci-bf-unique', fx.teamBId, null], ['ci-bf-amb', fx.teamAId, null], ['ci-bf-scoped', fx.teamAId, fx.appId]] as const) {
      await prisma.configurationItem.create({
        data: {
          id, tenantId: tenant.id, publicId: id.toUpperCase(),
          name: id, type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
          ownerTeamId: owner!, primaryApplicationId: app,
          health: 'healthy', attributes: '{}', tags: '[]',
        },
      });
      made.push(id);
    }

    const report = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: true });

    expect(report.alreadyScoped).toBe(1);
    expect(report.orphan).toBe(1);
    expect(report.ambiguous).toBe(1);
    expect(report.backfilled).toBe(0);

    // Verify DB state
    const ambRow = await prisma.configurationItem.findUniqueOrThrow({ where: { id: 'ci-bf-amb' } });
    expect(ambRow.primaryApplicationId).toBeNull();

    // Cleanup
    await prisma.configurationItem.deleteMany({ where: { id: { in: made } } });
    await prisma.applicationTeam.deleteMany({ where: { applicationId: secondApp.id } });
    await prisma.application.delete({ where: { id: secondApp.id } });
    await fx.cleanup();
  });

  it('actually writes when team has exactly one app', async () => {
    const fx = await createScopedAppFixture('backfill-cmdb-write');
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });

    await prisma.configurationItem.create({
      data: {
        id: 'ci-bf-write', tenantId: tenant.id, publicId: 'CI-BF-WRITE',
        name: 'will be backfilled', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
        ownerTeamId: fx.teamAId, primaryApplicationId: null,
        health: 'healthy', attributes: '{}', tags: '[]',
      },
    });
    const report = await runBackfill({ tenantId: tenant.id, module: 'cmdb', apply: true });
    expect(report.backfilled).toBe(1);
    const row = await prisma.configurationItem.findUniqueOrThrow({ where: { id: 'ci-bf-write' } });
    expect(row.primaryApplicationId).toBe(fx.appId);
    await prisma.configurationItem.delete({ where: { id: 'ci-bf-write' } });
    await fx.cleanup();
  });
});
```

- [ ] **Step 2: Run, expect failure** (script doesn't exist).

- [ ] **Step 3: Implement `prisma/backfillAppScope.ts`**

```ts
#!/usr/bin/env tsx
/**
 * Backfill applicationId on operational rows for the app-scope rollout.
 * See docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md §10.1 Fase 1.
 */
import { prisma } from '../server/db';
import { deriveAppIdForCI, deriveAppIdFromCIs, MODULES, type ModuleKey } from '../server/repositories/dataQuality';

export interface BackfillReport {
  module: ModuleKey;
  total: number;
  alreadyScoped: number;
  backfilled: number;
  ambiguous: number;
  orphan: number;
}

export interface BackfillOptions {
  tenantId?: string;     // optional filter
  module?: ModuleKey;    // run one module
  apply?: boolean;       // false (default) = dry-run
}

export async function runBackfill(opts: BackfillOptions = {}): Promise<BackfillReport[]> {
  const modules: ModuleKey[] = opts.module ? [opts.module] : (Object.keys(MODULES) as ModuleKey[]);
  const reports: BackfillReport[] = [];
  for (const m of modules) {
    reports.push(await runModule(m, opts));
  }
  return reports;
}

async function runModule(m: ModuleKey, opts: BackfillOptions): Promise<BackfillReport> {
  if (m === 'cmdb') return runCmdbBackfill(opts);
  if (m === 'event' || m === 'incident') return runCiDerivedBackfill(m, opts);
  return runJsonDerivedBackfill(m, opts); // change / problem / service_request
}

async function runCmdbBackfill(opts: BackfillOptions): Promise<BackfillReport> {
  const where: { tenantId?: string } = {};
  if (opts.tenantId) where.tenantId = opts.tenantId;
  const rows = await prisma.configurationItem.findMany({
    where,
    select: { id: true, tenantId: true, ownerTeamId: true, primaryApplicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, ambiguous = 0, orphan = 0;
  for (const row of rows) {
    if (row.primaryApplicationId) { alreadyScoped++; continue; }
    const decision = await deriveAppIdForCI(row.tenantId, row.ownerTeamId);
    if (decision.kind === 'backfill') {
      if (opts.apply) {
        await prisma.configurationItem.update({ where: { id: row.id }, data: { primaryApplicationId: decision.appId } });
      }
      backfilled++;
    } else if (decision.kind === 'ambiguous') {
      ambiguous++;
    } else {
      orphan++;
    }
  }
  return { module: 'cmdb', total: rows.length, alreadyScoped, backfilled, ambiguous, orphan };
}

async function runCiDerivedBackfill(m: 'event' | 'incident', opts: BackfillOptions): Promise<BackfillReport> {
  const where: { tenantId?: string } = {};
  if (opts.tenantId) where.tenantId = opts.tenantId;
  const delegate = m === 'event' ? prisma.event : prisma.incident;
  const rows = await (delegate as { findMany: (a: unknown) => Promise<Array<{ id: string; tenantId: string; affectedCIIds: string; applicationId: string | null }>> })
    .findMany({ where, select: { id: true, tenantId: true, affectedCIIds: true, applicationId: true } });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    let ciIds: string[] = [];
    try { ciIds = JSON.parse(row.affectedCIIds ?? '[]'); } catch { ciIds = []; }
    const decision = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (decision.kind === 'backfill') {
      if (opts.apply) {
        await (delegate as { update: (a: unknown) => Promise<unknown> }).update({ where: { id: row.id }, data: { applicationId: decision.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: m, total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

async function runJsonDerivedBackfill(m: 'change' | 'problem' | 'service_request', opts: BackfillOptions): Promise<BackfillReport> {
  const where: { tenantId?: string } = {};
  if (opts.tenantId) where.tenantId = opts.tenantId;
  const delegate =
    m === 'change' ? prisma.change :
    m === 'problem' ? prisma.problem :
    prisma.serviceRequest;
  const rows = await (delegate as { findMany: (a: unknown) => Promise<Array<{ id: string; tenantId: string; data: string; applicationId: string | null }>> })
    .findMany({ where, select: { id: true, tenantId: true, data: true, applicationId: true } });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    let blob: unknown = {};
    try { blob = JSON.parse(row.data); } catch { /* leave as {} */ }
    const ciIds = extractCiIds(blob);
    const decision = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (decision.kind === 'backfill') {
      if (opts.apply) {
        await (delegate as { update: (a: unknown) => Promise<unknown> }).update({ where: { id: row.id }, data: { applicationId: decision.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: m, total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

function extractCiIds(blob: unknown): string[] {
  if (typeof blob !== 'object' || blob === null) return [];
  const obj = blob as Record<string, unknown>;
  if (Array.isArray(obj.affectedCIIds)) return obj.affectedCIIds.filter((v): v is string => typeof v === 'string');
  if (Array.isArray(obj.affectedCiIds)) return obj.affectedCiIds.filter((v): v is string => typeof v === 'string');
  return [];
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const moduleArg = argv.find((a) => a.startsWith('--module='))?.split('=')[1] as ModuleKey | undefined;
  const tenantArg = argv.find((a) => a.startsWith('--tenant='))?.split('=')[1];
  runBackfill({ apply, module: moduleArg, tenantId: tenantArg })
    .then((reports) => {
      for (const r of reports) console.log(JSON.stringify(r));
      const totals = reports.reduce((acc, r) => ({
        total: acc.total + r.total,
        alreadyScoped: acc.alreadyScoped + r.alreadyScoped,
        backfilled: acc.backfilled + r.backfilled,
        ambiguous: acc.ambiguous + r.ambiguous,
        orphan: acc.orphan + r.orphan,
      }), { total: 0, alreadyScoped: 0, backfilled: 0, ambiguous: 0, orphan: 0 });
      console.error(`\n${apply ? 'APPLIED' : 'DRY-RUN'}: ${JSON.stringify(totals)}`);
      process.exit(0);
    })
    .catch((e) => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: Run, expect pass.**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/backfill-scope.test.ts`

If a test fails because the helper `createScopedAppFixture` doesn't return `teamBId`, etc., check `server/__tests__/helpers.ts` for the actual field names. The plan assumes the existing exported names.

- [ ] **Step 5: Smoke the CLI**

```
npx dotenv-cli -e .env.local -- npx tsx prisma/backfillAppScope.ts
```

Expected: JSON lines per module + a summary line on stderr, exit 0. Should NOT mutate the DB (apply=false).

- [ ] **Step 6: Commit**

```bash
git add prisma/backfillAppScope.ts server/__tests__/backfill-scope.test.ts
git commit -m "feat(scope): backfill script for applicationId (dry-run + apply, per-module)"
```

---

## Task 3: Admin endpoints — `/admin/data-quality`

**Files:** Create `server/routes/admin/dataQuality.ts`, modify `server/routes/admin.ts`, create `server/__tests__/admin-data-quality.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, createScopedAppFixture, type ScopedAppFixture } from './helpers';

const app = createApp();
let fx: ScopedAppFixture;
let adminCookie: string;
let orphanCiId: string;

beforeAll(async () => {
  adminCookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  fx = await createScopedAppFixture('dq');
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } });
  orphanCiId = 'ci-dq-orphan';
  await prisma.configurationItem.create({
    data: {
      id: orphanCiId, tenantId: tenant.id, publicId: 'CI-DQ-ORPHAN',
      name: 'Orphan CI', type: 'server', status: 'active', environment: 'prod', criticality: 'P3',
      ownerTeamId: fx.teamBId, primaryApplicationId: null,
      health: 'healthy', attributes: '{}', tags: '[]',
    },
  });
});

afterAll(async () => {
  await prisma.configurationItem.delete({ where: { id: orphanCiId } }).catch(() => undefined);
  await fx.cleanup();
  await prisma.$disconnect();
});

describe('GET /admin/data-quality/summary', () => {
  it('returns counts per module for admins', async () => {
    const res = await request(app).get('/api/v1/admin/data-quality/summary').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.cmdb).toBeDefined();
    expect(typeof res.body.cmdb.orphan).toBe('number');
  });

  it('returns 403 for non-admin user', async () => {
    const memberCookie = await login(app, fx.emailOf('member-a'), fx.password);
    const res = await request(app).get('/api/v1/admin/data-quality/summary').set('Cookie', memberCookie);
    expect(res.status).toBe(403);
  });
});

describe('GET /admin/data-quality/cmdb?status=orphan', () => {
  it('lists rows with no applicationId for admins', async () => {
    const res = await request(app).get('/api/v1/admin/data-quality/cmdb?status=orphan').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    const ids = (res.body as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toContain(orphanCiId);
  });
});

describe('PATCH /admin/data-quality/cmdb/:id', () => {
  it('assigns applicationId', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/data-quality/cmdb/${orphanCiId}`)
      .set('Cookie', adminCookie)
      .send({ applicationId: fx.appId });
    expect(res.status).toBe(200);
    const row = await prisma.configurationItem.findUniqueOrThrow({ where: { id: orphanCiId } });
    expect(row.primaryApplicationId).toBe(fx.appId);
  });

  it('rejects an applicationId from a different tenant with 400', async () => {
    // Create a row in another tenant or simulate; for MVP, assert that bogus id → 400.
    const res = await request(app)
      .patch(`/api/v1/admin/data-quality/cmdb/${orphanCiId}`)
      .set('Cookie', adminCookie)
      .send({ applicationId: 'app-does-not-exist' });
    expect(res.status).toBe(400);
  });
});

describe('POST /admin/data-quality/cmdb/bulk', () => {
  it('bulk-assigns applicationId', async () => {
    // reset the row first
    await prisma.configurationItem.update({ where: { id: orphanCiId }, data: { primaryApplicationId: null } });
    const res = await request(app)
      .post(`/api/v1/admin/data-quality/cmdb/bulk`)
      .set('Cookie', adminCookie)
      .send({ ids: [orphanCiId], applicationId: fx.appId });
    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(1);
  });
});
```

- [ ] **Step 2: Run, expect failures** (endpoints don't exist).

- [ ] **Step 3: Create `server/routes/admin/dataQuality.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { asyncHandler, HttpError } from '../../util';
import { MODULES, type ModuleKey } from '../../repositories/dataQuality';

export const dataQualityRouter = Router();

const moduleKeys = Object.keys(MODULES) as ModuleKey[];

function assertModule(key: string): asserts key is ModuleKey {
  if (!moduleKeys.includes(key as ModuleKey)) {
    throw new HttpError(400, `unknown module: ${key}`);
  }
}

async function loadRow(module: ModuleKey, tenantId: string, id: string) {
  const spec = MODULES[module];
  const where = spec.idField === 'publicId' ? { tenantId, publicId: id } : { tenantId, id };
  const delegate = spec.delegate() as { findFirst: (a: unknown) => Promise<unknown> };
  return delegate.findFirst({ where });
}

async function countByStatus(module: ModuleKey, tenantId: string): Promise<{ total: number; orphan: number }> {
  const spec = MODULES[module];
  const delegate = spec.delegate() as { count: (a: unknown) => Promise<number> };
  const total = await delegate.count({ where: { tenantId } });
  const orphan = await delegate.count({ where: { tenantId, [spec.appColumn]: null } });
  return { total, orphan };
}

dataQualityRouter.get('/summary', asyncHandler(async (req, res) => {
  const out: Record<ModuleKey, { total: number; orphan: number }> = {} as Record<ModuleKey, { total: number; orphan: number }>;
  for (const m of moduleKeys) out[m] = await countByStatus(m, req.tenantId);
  res.json(out);
}));

dataQualityRouter.get('/:module', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  const status = (req.query.status as string) ?? 'orphan';
  const spec = MODULES[m];
  const delegate = spec.delegate() as { findMany: (a: unknown) => Promise<unknown[]> };
  const filter = status === 'orphan' ? { [spec.appColumn]: null } : {};
  const rows = await delegate.findMany({
    where: { tenantId: req.tenantId, ...filter },
    take: 200,
  });
  res.json(rows);
}));

const patchBody = z.object({ applicationId: z.string().min(1) });

dataQualityRouter.patch('/:module/:id', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  const { applicationId } = patchBody.parse(req.body);
  const app = await prisma.application.findFirst({ where: { id: applicationId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(400, 'applicationId not found in this tenant');
  const spec = MODULES[m];
  const row = await loadRow(m, req.tenantId, req.params.id);
  if (!row) throw new HttpError(404, `${m} row not found`);
  const delegate = spec.delegate() as { update: (a: unknown) => Promise<unknown> };
  const where = spec.idField === 'publicId' ? { publicId: req.params.id } : { id: req.params.id };
  await delegate.update({ where, data: { [spec.appColumn]: applicationId } });
  res.json({ ok: true });
}));

const bulkBody = z.object({ ids: z.array(z.string()).min(1).max(500), applicationId: z.string().min(1) });

dataQualityRouter.post('/:module/bulk', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  const { ids, applicationId } = bulkBody.parse(req.body);
  const app = await prisma.application.findFirst({ where: { id: applicationId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(400, 'applicationId not found in this tenant');
  const spec = MODULES[m];
  const delegate = spec.delegate() as { updateMany: (a: unknown) => Promise<{ count: number }> };
  const where = spec.idField === 'publicId' ? { tenantId: req.tenantId, publicId: { in: ids } } : { tenantId: req.tenantId, id: { in: ids } };
  const result = await delegate.updateMany({ where, data: { [spec.appColumn]: applicationId } });
  res.json({ updated: result.count });
}));
```

- [ ] **Step 4: Wire in `server/routes/admin.ts`**

Add import and mount:
```ts
import { dataQualityRouter } from './admin/dataQuality';
// …
adminRouter.use('/admin/data-quality', dataQualityRouter);
```

The parent `adminRouter.use('/admin', requirePermission('system.admin'))` already gates anything under `/admin`, so the new sub-router inherits the admin guard automatically. **Verify** this by reading `server/routes/admin.ts:31` to confirm that registration order works as expected — if the `requirePermission` mount comes BEFORE `adminRouter.use('/admin/data-quality', …)`, the child router is guarded.

- [ ] **Step 5: Run tests, expect pass.**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/admin-data-quality.test.ts`. Iterate until all 5 cases pass.

- [ ] **Step 6: Lint + commit**

```bash
git add server/routes/admin/dataQuality.ts server/routes/admin.ts server/__tests__/admin-data-quality.test.ts
git commit -m "feat(admin): /admin/data-quality endpoints (summary, list, patch, bulk)"
```

---

## Task 4: Admin UI — `/admin/data-quality` page

**Files:** Create `src/routes/admin/DataQuality.tsx`, modify `src/routes/admin/AdminLayout.tsx`, modify `src/services/admin.ts`, modify `src/routes/index.tsx`

- [ ] **Step 1: Read the existing patterns**

Read `src/routes/admin/Applications.tsx` end-to-end — it's the closest analog (admin tab + table + form). Match its structure (Card layout, DataTable component, `useResource` for loading).

- [ ] **Step 2: Add typed client methods to `src/services/admin.ts`**

```ts
export const dataQualityService = {
  summary: () => apiFetch('/admin/data-quality/summary'),
  list: (module: string, status: 'orphan' | 'ambiguous' = 'orphan') =>
    apiFetch(`/admin/data-quality/${module}?status=${status}`),
  assign: (module: string, id: string, applicationId: string) =>
    apiFetch(`/admin/data-quality/${module}/${id}`, { method: 'PATCH', body: { applicationId } }),
  bulkAssign: (module: string, ids: string[], applicationId: string) =>
    apiFetch(`/admin/data-quality/${module}/bulk`, { method: 'POST', body: { ids, applicationId } }),
};
```

(`apiFetch` is the existing fetch wrapper — read `src/services/core.ts` or any sibling service for the exact import.)

- [ ] **Step 3: Create `src/routes/admin/DataQuality.tsx`**

Component shape:

```tsx
const TABS: { key: ModuleKey; label: string }[] = [
  { key: 'cmdb', label: 'CMDB' },
  { key: 'event', label: 'Events' },
  { key: 'incident', label: 'Incidents' },
  { key: 'change', label: 'Changes' },
  { key: 'problem', label: 'Problems' },
  { key: 'service_request', label: 'Service Requests' },
];

export default function DataQuality() {
  const [active, setActive] = useState<ModuleKey>('cmdb');
  const { data: summary } = useResource(() => dataQualityService.summary(), []);
  const { data: rows, refresh } = useResource(() => dataQualityService.list(active), [active]);
  const { data: apps } = useResource(() => applicationsService.list(), []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkApp, setBulkApp] = useState<string | ''>('');

  return (
    <div>
      <h1>Data Quality — App Scope Backfill</h1>

      <KpiRow>
        {/* per-module {total} • {orphan} */}
      </KpiRow>

      <Tabs value={active} onChange={setActive} items={TABS} />

      <BulkBar
        count={selected.size}
        apps={apps ?? []}
        value={bulkApp}
        onAppChange={setBulkApp}
        onApply={async () => {
          if (!bulkApp || selected.size === 0) return;
          await dataQualityService.bulkAssign(active, [...selected], bulkApp);
          setSelected(new Set());
          setBulkApp('');
          refresh();
        }}
      />

      <Table>
        <thead>
          <tr><th></th><th>ID</th><th>Name / Title</th><th>OwnerTeam</th><th>Assign App</th></tr>
        </thead>
        <tbody>
          {(rows ?? []).map((row: any) => (
            <tr key={row.id}>
              <td><Checkbox checked={selected.has(row.id)} onChange={…toggle…}/></td>
              <td>{row.publicId ?? row.id}</td>
              <td>{row.name ?? row.title ?? '—'}</td>
              <td>{row.ownerTeamId ?? '—'}</td>
              <td>
                <PerRowAssign
                  apps={apps ?? []}
                  onSave={async (appId) => {
                    await dataQualityService.assign(active, row.id, appId);
                    refresh();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
```

(Sketch only — fill in with existing Tailwind classes and primitives. Reuse `Card`, `Button`, `Badge`, `DataTable` where possible. Don't introduce new design tokens; match `Applications.tsx`.)

- [ ] **Step 4: Wire navigation + route**

In `src/routes/admin/AdminLayout.tsx`, add a "Data Quality" link to the admin sidebar, gated by an `isPlatformAdmin` check (existing admin pages presumably do something similar — copy that pattern).

In `src/routes/index.tsx`, register:
```tsx
{
  path: '/admin/data-quality',
  element: <DataQuality />,
},
```

- [ ] **Step 5: Smoke test in browser**

```
npm run dev
```

Navigate to `http://localhost:3000/admin/data-quality`. Confirm:
1. Page loads without React error boundary.
2. Counts appear in the KPI row.
3. Switching tabs reloads the list.
4. Assigning a row writes successfully (refresh shows it gone).
5. Bulk-assign works on multiple selections.

If anything breaks, fix it — don't ship.

- [ ] **Step 6: Lint + commit**

```bash
git add src/routes/admin/DataQuality.tsx src/routes/admin/AdminLayout.tsx src/services/admin.ts src/routes/index.tsx
git commit -m "feat(admin): Data Quality page for app-scope orphan triage"
```

---

## Task 5: Smoke + docs

**Files:** Modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Mark Fase 1 done**

In §10.1, change the Fase 1 row to: `✅ done (Plan C: backfill script + /admin/data-quality UI)`.

- [ ] **Step 2: Add an operational note**

Append to the spec (a new "Operating" section near §10):

> **Running the backfill in staging/prod:**
>
> 1. Deploy the Plan C bundle.
> 2. Run `npx tsx prisma/backfillAppScope.ts` to see the dry-run report.
> 3. Run `npx tsx prisma/backfillAppScope.ts --apply` once the dry-run looks sane.
> 4. Open `/admin/data-quality` and triage the orphan/ambiguous rows by app.
> 5. When `orphan` is under your operational tolerance (e.g. <1% per module), proceed to Plan F (`NOT NULL` promotion).

- [ ] **Step 3: Full regression sweep**

Run:
```
npm run lint && \
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/backfill-scope.test.ts \
  server/__tests__/admin-data-quality.test.ts \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/scope-context.test.ts \
  server/__tests__/scope-foundation.test.ts
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(spec): mark Fase 1 done; add backfill operating notes"
```

---

## Done criteria for Plan C

- [ ] `prisma/backfillAppScope.ts` exists, exits 0 on a fresh dev DB, and supports `--apply` / `--module=<key>` / `--tenant=<id>`.
- [ ] `runBackfill({ module: 'cmdb', apply: true })` covered by unit test for backfill/ambiguous/orphan/alreadyScoped buckets.
- [ ] `/api/v1/admin/data-quality/{summary, :module, :module/:id, :module/bulk}` endpoints live and gated on `system.admin`.
- [ ] `src/routes/admin/DataQuality.tsx` renders without errors; tabs switch; per-row + bulk assignment write successfully.
- [ ] Spec §10.1 Fase 1 marked done.
- [ ] `npm run lint` clean.
- [ ] All scope-related test suites pass when run individually.
- [ ] No regression on the production-readiness path: `SCOPE_ENFORCEMENT_MODE=off` still default; nothing surfaced in this plan flips the mode.
