# RBAC × App Scope — Plan B-2: Module Rollout + ESLint Guard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the `ScopedDb` layer to every remaining operational module (Events, Incidents, Problems, Changes, Releases, ServiceRequests, Monitoring rules/routes), refactor each route file to go through `req.scoped.*`, then land an ESLint rule that prevents future routes from bypassing scope by importing repos or Prisma directly.

**Architecture:** Same pattern as Plan B-1 — per-module `ScopedDb` namespaces wrap existing repositories with scope checks, the route handler catches `ScopeViolationError` and calls `applyEnforcement(err, res)` so the `off/warn/enforce` mode decision stays at the boundary. New: a `getActor(req)` helper in `server/auth/session.ts` so route files no longer need to import `prisma` for actor lookups, which is what unlocks a strict `no-restricted-imports` rule.

**Tech Stack:** Express 4, Prisma 5, TypeScript, ESLint (already used for the existing `tsc --noEmit` lint script — this plan introduces ESLint proper if it's not present).

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md)

**Depends on:** Plan B-1 (`5447193`).

**Out of scope (later plans):**
- Backfilling `applicationId` on existing rows → **Plan C**.
- Admin UI for membership → **Plan D**.
- `AppScopeSwitcher` UX → **Plan E**.
- Promoting `applicationId` to `NOT NULL` + removing `off/warn` paths → **Plan F**.

---

## Design notes (read before starting)

### Scope policy per module (recap from spec §6)

| Module | Read | Write | Bypass write | Notes |
|---|---|---|---|---|
| `event` | scoped | scoped | `NOC_OPERATOR` (create), `PLATFORM_ADMIN` | NOC can fire/acknowledge across apps. |
| `incident` | scoped | scoped | `NOC_OPERATOR` (create + status transitions), `PLATFORM_ADMIN` | NOC cannot close/resolve incidents of apps they don't own. |
| `service_request` | scoped | scoped | `NOC_OPERATOR`, `PLATFORM_ADMIN` | Requester = creator, assignee = app team. |
| `problem` | global | scoped | `PLATFORM_ADMIN` | Cross-app visibility for impact analysis. |
| `change` | global | scoped | `PLATFORM_ADMIN` | Same. |
| `release` | global | admin_only | `PLATFORM_ADMIN` | Release pipeline is admin-only in MVP. |
| `monitoring_rule` / `alert_route` | global | admin_only | `PLATFORM_ADMIN` | Tenant-wide catalog. |

### NULL `applicationId` handling
- **Reads**: scoped-read modules include NULL-app rows in the result set (legacy, opaque). This way list views don't suddenly shrink after deploy.
- **Writes**: NULL-app rows are treated as legacy → write is allowed by the scoped layer (no `ScopeViolationError`), but the audit row's `scopeMode` is `'legacy'`.

### `getActor(req)` helper
- New: `server/auth/session.ts` exports `getActor(req)` returning the resolved `User` row.
- Internal: it calls `prisma.user.findUniqueOrThrow({ where: { id: req.session!.userId } })` once and memoizes on `req` (`req.actor`).
- Routes use `await getActor(req)` instead of `prisma.user.findUniqueOrThrow(...)`. This is the only refactor that lets the ESLint rule become strict.

### ESLint rule
- Use `no-restricted-imports` with this pattern (per the spec):
  - `paths`: `[{ name: '../db', message: 'route files must use req.scoped, not prisma directly' }]`
  - `patterns`: `['../repositories/*', '../prisma', '@prisma/client']`
- Apply only to files matching `server/routes/**/*.ts`.
- Exceptions: `server/routes/admin.ts` and `server/routes/platform.ts` (admin operations legitimately need direct DB access).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `server/scope/policy.ts` | Modify | (already complete in B-1 — confirm `service_request`, `problem`, `change`, `release` rows exist; add `monitoring_rule` and `alert_route` if missing) |
| `server/scope/scopedDb.ts` | Modify | Add namespaces: `events`, `incidents`, `problems`, `changes`, `releases`, `serviceRequests`, `monitoring`. Each namespace mirrors the existing repo shape with scope checks. |
| `server/auth/session.ts` | Modify | Add `getActor(req)` helper. |
| `server/middleware/auth.ts` | Modify | Augment `Request` with `actor?: User`. |
| `server/routes/events.ts` | Modify | Replace direct `eventsRepo` + `prisma.event.create` calls. |
| `server/routes/incidents.ts` | Modify | Replace `incidentsRepo` + `prisma.user.findUniqueOrThrow` calls. |
| `server/routes/itsm.ts` | Modify | Replace `problemsRepo` / `changesRepo` / `releasesRepo` / `requestsRepo` / `prisma.user.findUniqueOrThrow` / `prisma.requestComment.findMany`. |
| `server/routes/monitoring.ts` | Modify | Replace `monitoringRepo` calls. |
| `.eslintrc.cjs` (or `.eslintrc.json`) | Create or Modify | Define the `no-restricted-imports` rule scoped to `server/routes/**`. |
| `package.json` | Modify | Update `lint` script to also run ESLint over `server/`. |
| `server/__tests__/scope-incidents.test.ts` | Create | 3-persona integration test for Incident write (covers NOC bypass). |
| `server/__tests__/scope-changes.test.ts` | Create | 3-persona integration test for Change write (covers admin-bypass and member contribute). |
| `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` | Modify | Mark Fase 2 done for all modules. |

---

## Task 1: Extend the policy table (add missing modules)

**Files:** Modify `server/scope/policy.ts`, modify `server/__tests__/scope-context.test.ts`

- [ ] **Step 1: Append failing tests**

In `server/__tests__/scope-context.test.ts`, inside the existing `describe('scope policy table', …)`:

```ts
it('declares Problem/Change as global read, scoped write', () => {
  expect(POLICY.problem.read).toBe('global');
  expect(POLICY.problem.write).toBe('scoped');
  expect(POLICY.change.read).toBe('global');
  expect(POLICY.change.write).toBe('scoped');
});

it('declares Release/MonitoringRule/AlertRoute as admin-only write', () => {
  expect(POLICY.release.write).toBe('admin_only');
  expect(POLICY.monitoring_rule.write).toBe('admin_only');
  expect(POLICY.alert_route.write).toBe('admin_only');
});
```

- [ ] **Step 2: Run, expect failure** (`monitoring_rule` / `alert_route` keys missing).

- [ ] **Step 3: Extend `POLICY`**

In `server/scope/policy.ts`, add `monitoring_rule` and `alert_route` to the `ModuleKey` union and the `POLICY` record:

```ts
// In ModuleKey union, add:
  | 'monitoring_rule'
  | 'alert_route';

// In POLICY:
  monitoring_rule:{ read: 'global', write: 'admin_only', readBypass: [], writeBypass: ['PLATFORM_ADMIN'] },
  alert_route:    { read: 'global', write: 'admin_only', readBypass: [], writeBypass: ['PLATFORM_ADMIN'] },
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/policy.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): extend POLICY with monitoring_rule + alert_route"
```

---

## Task 2: Add `getActor(req)` helper

**Files:** Modify `server/auth/session.ts`, modify `server/middleware/auth.ts`

- [ ] **Step 1: Read `server/auth/session.ts` to see existing exports and the `SessionContext` shape.**

- [ ] **Step 2: Append `getActor` export**

```ts
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { HttpError } from '../util';

declare module 'express-serve-static-core' {
  interface Request {
    actor?: User;
  }
}

/**
 * Resolve the authenticated user row from the request, memoized per request.
 * Throws 401 when no session is present.
 */
export const getActor = async (req: Request): Promise<User> => {
  if (req.actor) return req.actor;
  if (!req.session) throw new HttpError(401, 'Authentication required');
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.session.userId } });
  req.actor = user;
  return user;
};
```

(`prisma` is already imported at the top of `session.ts`. If not, add `import { prisma } from '../db';`.)

- [ ] **Step 3: Smoke-test that lint stays clean.**

Run: `npm run lint`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add server/auth/session.ts
git commit -m "feat(auth): getActor(req) helper (per-request memoized user)"
```

---

## Task 3: Events — scope adapter + route refactor

**Files:** Modify `server/scope/scopedDb.ts`, modify `server/routes/events.ts`

- [ ] **Step 1: Read `server/repositories/events.ts` to inventory method signatures.**

- [ ] **Step 2: Add `events` namespace to `ScopedDb`**

In `scopedDb.ts`, add an `EventsScope` interface and namespace. Pattern:

```ts
export interface EventsScope {
  list(filter: Parameters<typeof eventsRepo.list>[1]): Promise<Awaited<ReturnType<typeof eventsRepo.list>>>;
  dashboardStats(): Promise<Awaited<ReturnType<typeof eventsRepo.dashboardStats>>>;
  get(publicId: string): Promise<Awaited<ReturnType<typeof eventsRepo.get>>>;
  /**
   * Set status / acknowledge / resolve. Bypass for NOC_OPERATOR + PLATFORM_ADMIN.
   * Returns null when not found.
   */
  setStatus(publicId: string, patch: Parameters<typeof eventsRepo.setStatus>[2]): Promise<{ result: Awaited<ReturnType<typeof eventsRepo.setStatus>>; scopeMode: ScopeMode } | null>;
  /**
   * Create a new event. applicationId comes from the input (caller must
   * provide it via affected CIs' primaryApplicationId or explicit appId).
   * If null → 'legacy' scope mode; otherwise scope check applies.
   */
  create(input: Parameters<typeof eventsRepo.create>[1] & { applicationId?: string | null }): Promise<{ result: unknown; scopeMode: ScopeMode }>;
}
```

Inside `buildScopedDb`, add the implementation. Helpers needed:

```ts
function eventCanWrite(appId: string | null): boolean {
  if (isPlatformAdmin) return true;
  if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
  if (appId === null) return false;
  return writableApps.has(appId);
}

function eventScopeMode(appId: string | null): ScopeMode {
  if (appId === null) return 'legacy';
  if (isPlatformAdmin) return 'admin';
  if (POLICY.event.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
  if (ownerApps.has(appId)) return 'owner';
  return 'member';
}

async function eventReadFilter(): Promise<{ tenantId: string; orApps?: string[] }> {
  // Scoped read: limit to readable apps. Bypass roles see everything.
  if (POLICY.event.readBypass.some((r) => ctx.functionalRoles.includes(r))) {
    return { tenantId: ctx.tenantId };
  }
  return { tenantId: ctx.tenantId, orApps: [...writableApps].concat([...ownerApps]) };
}
```

The `events.list` method must apply the read filter:

```ts
list(filter) {
  // For scoped read, fetch then post-filter (or push into repo if it accepts WHERE in fragments).
  // Minimal MVP: fetch with existing repo, post-filter rows whose applicationId is non-null and not in readable set.
  const allowed = await eventsRepo.list(ctx.tenantId, filter);
  if (POLICY.event.readBypass.some((r) => ctx.functionalRoles.includes(r))) return allowed;
  const readable = new Set([...writableApps, ...ownerApps]);
  return (allowed as { applicationId?: string | null }[]).filter(
    (e) => e.applicationId == null || readable.has(e.applicationId!),
  ) as typeof allowed;
}
```

`setStatus` and `create`: same shape as the CMDB `updateCI`:

```ts
async setStatus(publicId, patch) {
  const raw = await prisma.event.findFirst({
    where: { tenantId: ctx.tenantId, publicId },
    select: { applicationId: true },
  });
  if (!raw) return null;
  const appId = raw.applicationId ?? null;
  if (appId !== null && !eventCanWrite(appId)) {
    throw new ScopeViolationError({ module: 'event', action: 'update', applicationId: appId });
  }
  const result = await eventsRepo.setStatus(ctx.tenantId, publicId, patch);
  return { result, scopeMode: eventScopeMode(appId) };
},
async create(input) {
  const appId = input.applicationId ?? null;
  if (appId !== null && !eventCanWrite(appId)) {
    throw new ScopeViolationError({ module: 'event', action: 'create', applicationId: appId });
  }
  const result = await eventsRepo.create(ctx.tenantId, input);
  return { result, scopeMode: eventScopeMode(appId) };
},
```

**Note:** If `eventsRepo.create` doesn't currently accept `applicationId`, extend it (small additive change to the repo) — the column already exists on `Event` from Plan A.

- [ ] **Step 3: Refactor `server/routes/events.ts`**

Replace `eventsRepo.*` calls with `scoped(req).events.*`. The POST handler that currently calls `prisma.event.create({ … })` directly must route through `scoped(req).events.create(…)`. Add the `try/catch + applyEnforcement + bypass-repo-call` pattern around any handler that mutates.

- [ ] **Step 4: Run pre-existing Events tests**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/$(ls server/__tests__ | grep -i event)`. Expected: PASS (off mode default = no behavior change).

- [ ] **Step 5: TypeScript check**

Run: `npm run lint`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add server/scope/scopedDb.ts server/routes/events.ts server/repositories/events.ts
git commit -m "refactor(events): route through req.scoped.events"
```

---

## Task 4: Incidents — scope adapter + route refactor + NOC bypass test

**Files:** Modify `server/scope/scopedDb.ts`, modify `server/routes/incidents.ts`, create `server/__tests__/scope-incidents.test.ts`

- [ ] **Step 1: Add `incidents` namespace to `ScopedDb`** — same shape as Events. Incidents has more write methods (`setStatus`, `resolve`, `addComment`). Apply scope check to status mutations; **comments are allowed for any user with `incident.write` permission as long as they can READ the incident** (no separate write scope for comments).

For each write method:
- Look up the incident's `applicationId`.
- If `applicationId` is null → allow, mode `'legacy'`.
- Otherwise call `incidentCanWrite(appId)` which mirrors `eventCanWrite` but uses `POLICY.incident.writeBypass`.

- [ ] **Step 2: Refactor `server/routes/incidents.ts`**

Replace `incidentsRepo.*` calls and the `prisma.user.findUniqueOrThrow(...)` actor lookup with `await getActor(req)`. Apply the `try/catch + applyEnforcement` pattern around mutating handlers.

- [ ] **Step 3: Write `server/__tests__/scope-incidents.test.ts`**

Mirror `scope-cmdb.test.ts` but for Incidents. Required test cases:

1. memberA (contributor of app) can `POST /incidents/:id/status` in enforce mode.
2. memberB (outsider) gets 403 in enforce mode.
3. memberB gets 200 + `X-Scope-Warning` in warn mode.
4. **NOC** (member of an OTHER app + has `NOC_OPERATOR` role) can `POST /incidents/:id/status` in enforce mode — proves bypass path.
5. NOC cannot bypass `PATCH /incidents/:id/resolve` (we permit create/triage only, NOT resolve) — expect 403 in enforce mode.

Use `createScopedAppFixture('incidents')` to build the org chain. Create the test Incident with `applicationId: fx.appId` directly via `prisma.incident.create`.

- [ ] **Step 4: Run the test**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-incidents.test.ts`. Iterate until 5/5 pass.

**Note:** for case 5 (NOC blocked from `resolve`), `POLICY.incident.writeBypass` currently grants both `'create'` and `'triage'` to NOC. The scope adapter must distinguish `action='resolve'` (full bypass) from `action='create'`. The cleanest way: have `incidents.resolve()` throw on NOC even if `incidentCanWrite(appId)` returned true — i.e., `resolve` has a stricter check:

```ts
async resolve(publicId, patch) {
  // Resolve never bypasses via NOC — only PLATFORM_ADMIN.
  const raw = await prisma.incident.findFirst({ where: { tenantId: ctx.tenantId, publicId }, select: { applicationId: true } });
  if (!raw) return null;
  const appId = raw.applicationId ?? null;
  if (appId !== null) {
    const canResolve = isPlatformAdmin || writableApps.has(appId) || ownerApps.has(appId);
    if (!canResolve) {
      throw new ScopeViolationError({ module: 'incident', action: 'update', applicationId: appId });
    }
  }
  const result = await incidentsRepo.resolve(ctx.tenantId, publicId, patch);
  return { result, scopeMode: appId === null ? 'legacy' : (isPlatformAdmin ? 'admin' : (ownerApps.has(appId) ? 'owner' : 'member')) };
}
```

- [ ] **Step 5: Run pre-existing Incidents tests**

Run: `npx dotenv-cli -e .env.local -- npx vitest run $(ls server/__tests__/incidents-*)`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/scope/scopedDb.ts server/routes/incidents.ts server/__tests__/scope-incidents.test.ts
git commit -m "refactor(incidents): route through req.scoped.incidents + NOC bypass tests"
```

---

## Task 5: ITSM routes — problems, changes, releases, service requests

**Files:** Modify `server/scope/scopedDb.ts`, modify `server/routes/itsm.ts`, create `server/__tests__/scope-changes.test.ts`

- [ ] **Step 1: Add `problems`, `changes`, `releases`, `serviceRequests` namespaces.**

Use the same pattern. Distinct points:
- `changes` and `problems`: read is global → no read filtering, only write enforcement.
- `releases`: write is `admin_only` → only `PLATFORM_ADMIN` may write; all other users get `ScopeViolationError` on any write.
- `serviceRequests`: read is scoped; write is scoped with `NOC_OPERATOR` bypass.

For `release`-style admin-only modules, the scope adapter doesn't even need to look up the row's `applicationId` for write checks — failure is based solely on functional role:

```ts
async create(input) {
  if (!isPlatformAdmin) {
    throw new ScopeViolationError({ module: 'release', action: 'create' });
  }
  // … delegate to releasesRepo.create
}
```

- [ ] **Step 2: Refactor `server/routes/itsm.ts`**

Replace all `*Repo.*` calls (problemsRepo, changesRepo, releasesRepo, requestsRepo) and all `prisma.user.findUniqueOrThrow(...)` with `await getActor(req)` + scoped namespace.

The one tricky call is `prisma.requestComment.findMany(...)` for listing request comments (line 147). Two options:
- (preferred) Add a `serviceRequests.listComments(publicId)` method to the scope adapter; it does the same `findMany` internally with `ctx.tenantId` already injected.
- Or extend `requestsRepo` with `listComments` and delegate.

- [ ] **Step 3: Write `server/__tests__/scope-changes.test.ts`**

Mirror the CMDB test, but for `POST /api/v1/changes` (or whatever the change-creation endpoint is — read `itsm.ts` to confirm). Required cases:

1. memberA can create a Change scoped to fx.appId in enforce mode (200).
2. memberB cannot in enforce mode (403).
3. PlatformAdmin always succeeds (200).
4. memberB gets `X-Scope-Warning` in warn mode (200).
5. memberB succeeds silently in off mode (200).

- [ ] **Step 4: Run pre-existing ITSM tests**

Run: `npx dotenv-cli -e .env.local -- npx vitest run $(ls server/__tests__/{changes,requests,problems}-*.test.ts 2>/dev/null)`. Expected: PASS.

- [ ] **Step 5: TypeScript check**

Run: `npm run lint`. Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add server/scope/scopedDb.ts server/routes/itsm.ts server/__tests__/scope-changes.test.ts server/repositories/docs.ts
git commit -m "refactor(itsm): route problems/changes/releases/requests through req.scoped"
```

---

## Task 6: Monitoring — admin-only write

**Files:** Modify `server/scope/scopedDb.ts`, modify `server/routes/monitoring.ts`

- [ ] **Step 1: Add `monitoring` namespace** with `rules` and `routes` sub-objects.

For each write method, gate on `isPlatformAdmin`. Same `ScopeViolationError({ module: 'monitoring_rule', action: 'create' })` pattern.

- [ ] **Step 2: Refactor `server/routes/monitoring.ts`**

Replace `monitoringRepo.*` calls and any `prisma.user.findUniqueOrThrow(...)` with `await getActor(req)` + scoped namespace.

- [ ] **Step 3: Run pre-existing monitoring tests**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/monitoring-rules-writes.test.ts server/__tests__/alert-routes-writes.test.ts`. Expected: PASS.

- [ ] **Step 4: TypeScript check + commit**

```bash
git add server/scope/scopedDb.ts server/routes/monitoring.ts
git commit -m "refactor(monitoring): route rules + alert_routes through req.scoped"
```

---

## Task 7: ESLint `no-restricted-imports` rule

**Files:** Create or modify `.eslintrc.cjs`, modify `package.json`

- [ ] **Step 1: Check whether ESLint is already configured**

Run: `ls .eslintrc.* 2>/dev/null; cat package.json | grep -i eslint`.

If not installed, run:
```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

- [ ] **Step 2: Create `.eslintrc.cjs`**

```js
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules', 'src', 'prisma/migrations'],
  overrides: [
    {
      // Operational route files must go through req.scoped.* — no direct DB.
      files: ['server/routes/**/*.ts'],
      excludedFiles: ['server/routes/admin.ts', 'server/routes/platform.ts', 'server/routes/auth.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          paths: [
            { name: '../db', message: 'route files must use req.scoped, not prisma directly' },
            { name: '@prisma/client', message: 'route files must use req.scoped, not Prisma client' },
          ],
          patterns: ['../repositories/*'],
        }],
      },
    },
  ],
};
```

- [ ] **Step 3: Update `package.json` `lint` script**

Change:
```json
"lint": "tsc --noEmit && tsc --noEmit -p server/tsconfig.json"
```
to:
```json
"lint": "tsc --noEmit && tsc --noEmit -p server/tsconfig.json && eslint server/routes --max-warnings 0"
```

- [ ] **Step 4: Run lint**

Run: `npm run lint`. Expected: clean if Tasks 3-6 fully migrated the routes. If you see errors, those errors point at the remaining direct imports — fix the routes, don't relax the rule.

- [ ] **Step 5: Commit**

```bash
git add .eslintrc.cjs package.json
git commit -m "feat(lint): no-restricted-imports guard on server/routes/* (scope discipline)"
```

---

## Task 8: Spec annotation + regression sweep

**Files:** Modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Mark Fase 2 fully done**

In §10.1, change the Fase 2 row to: `✅ done (Plan B-1 + B-2: infra + all operational modules; ESLint guard active)`.

- [ ] **Step 2: Full regression sweep**

Run:
```
npm run lint && \
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/scope-context.test.ts \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/scope-foundation.test.ts \
  server/__tests__/ci-edit.test.ts \
  server/__tests__/incidents-update.test.ts \
  server/__tests__/incidents-workflow.test.ts \
  server/__tests__/changes-writes.test.ts \
  server/__tests__/monitoring-rules-writes.test.ts \
  server/__tests__/alert-routes-writes.test.ts \
  server/__tests__/requests-writes.test.ts
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(spec): mark Fase 2 fully completed by Plan B-2"
```

---

## Done criteria for Plan B-2

- [ ] `req.scoped` exposes namespaces for every operational module (`events`, `incidents`, `problems`, `changes`, `releases`, `serviceRequests`, `monitoring.rules`, `monitoring.routes`).
- [ ] `server/routes/events.ts`, `incidents.ts`, `itsm.ts`, `monitoring.ts` no longer import `prisma` or `*Repo`.
- [ ] `server/auth/session.ts` exports `getActor(req)`; all route actor lookups use it.
- [ ] ESLint `no-restricted-imports` rule active on `server/routes/**` (admin/platform/auth excluded); `npm run lint` runs ESLint and passes.
- [ ] `scope-incidents.test.ts` covers memberA / memberB / NOC / PlatformAdmin × enforce/warn modes including NOC bypass of `setStatus` AND NOC denial of `resolve`.
- [ ] `scope-changes.test.ts` covers member / outsider / admin × 3 modes.
- [ ] Spec §10.1 Fase 2 marked fully done.
- [ ] No regression in pre-existing test suites (events/incidents/changes/monitoring/requests).
- [ ] Default `SCOPE_ENFORCEMENT_MODE=off` keeps everything behaving identically to pre-deploy.
