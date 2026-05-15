# RBAC × App Scope — Plan B-1: Enforcement Infrastructure + CMDB Pilot

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the per-request scope resolution + `ScopedDb` adapter layer (operating in `off` / `warn` / `enforce` modes), validate it end-to-end against the CMDB module as the pilot, and prove the design with 3-persona integration tests. Other modules migrate in Plan B-2.

**Architecture:** A new `server/scope/` directory holds the policy table, context resolver, `ScopeViolationError`, and the `ScopedDb` factory. A `withScopedDb` middleware attaches a request-scoped wrapper at `req.scoped`. The wrapper exposes one namespace per migrated module — only `cmdb` here. CMDB routes stop calling `cmdbRepo` directly and use `req.scoped.cmdb` instead. Enforcement mode is controlled by `SCOPE_ENFORCEMENT_MODE` env (`off` default, `warn`, `enforce`); NULL `applicationId` is treated as "unscoped legacy row" and never triggers a violation — that gap closes in Plan C (backfill) + Plan F (NOT NULL).

**Tech Stack:** Express 4, Prisma 5, TypeScript, Vitest + supertest (real Postgres via `.env.local`).

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md)

**Depends on:** Plan A (merged in `c1a03cf`).

**Out of scope (later plans):**
- Migrating Events/Incidents/Problems/Changes/Releases/ServiceRequests/Monitoring routes → **Plan B-2** (uses the same infra).
- Lint rule `no-restricted-imports` banning `prisma` from `server/routes/*` → **Plan B-2** (only safe to land after every operational route is migrated).
- Backfilling `applicationId` on existing rows → **Plan C**.
- Admin UI / AppScopeSwitcher → **Plans D and E**.
- Promoting `applicationId` to `NOT NULL` and removing `off/warn` paths → **Plan F**.

---

## Design notes (read before starting)

1. **Three computed sets per request** (lazy-evaluated per module):
   - `readableAppIds: Set<string> | 'ALL'`
   - `writableAppIds: Set<string>`
   - `ownerAppIds: Set<string>`
2. **NULL `applicationId` is opaque.** Rows where `applicationId IS NULL` are returned regardless of scope (legacy/unbackfilled). Writes attempting `applicationId: null` are allowed only for PLATFORM_ADMIN (so we can't accidentally create new orphans during the rollout window).
3. **Policy per module is a static record**, not per-route. The module key is canonical (`'cmdb' | 'event' | 'incident' | …`). Per spec §6: CMDB read is global, write is scoped.
4. **`ScopeViolationError`** is a single class. The Express error handler in `server/app.ts` translates it to `403 { error: 'scope_violation', module, action, applicationId? }`.
5. **`SCOPE_ENFORCEMENT_MODE`** values:
   - `off` (default): scope checks run but never throw — useful for shadow auditing.
   - `warn`: violations are logged AND a response header `X-Scope-Warning` is appended; request still succeeds.
   - `enforce`: violations throw `ScopeViolationError`.
6. **Audit log integration**: every `scoped.<module>.{create|update|delete}` call records `scopeMode` (`'member' | 'noc' | 'owner' | 'admin'`) into the existing audit pipeline.
7. **Session payload caching**: the resolver runs on every request, but the underlying Prisma calls hit `applicationTeam` + `userFunctionalRole` which are tiny per-user. We cache the resolved context on `session` for the request's lifetime; invalidation comes for free with session expiry.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `server/scope/policy.ts` | Create | Static policy table per module (read/write rules, bypass roles). |
| `server/scope/errors.ts` | Create | `ScopeViolationError` class. |
| `server/scope/context.ts` | Create | `ScopeContext` type + `resolveScopeContext(session)` resolver. |
| `server/scope/scopedDb.ts` | Create | `buildScopedDb(prisma, ctx)` factory; CMDB namespace lives here in B-1. |
| `server/scope/enforcement.ts` | Create | Reads `SCOPE_ENFORCEMENT_MODE`, exposes `applyMode(violation, res)` helper. |
| `server/middleware/scopedDb.ts` | Create | `withScopedDb` middleware. |
| `server/middleware/auth.ts` | Modify | Augment the `Request` interface with `scoped`. (No behaviour change.) |
| `server/app.ts` | Modify | Translate `ScopeViolationError` → 403 in the error handler, mount `withScopedDb` after `sessionMiddleware`. |
| `server/routes/cmdb.ts` | Modify | Replace direct `cmdbRepo` calls with `req.scoped.cmdb.*`. |
| `server/audit.ts` | Modify | Accept optional `scopeMode` field. |
| `server/__tests__/scope-context.test.ts` | Create | Unit test the resolver + policy table. |
| `server/__tests__/scope-cmdb.test.ts` | Create | Integration: 3 personas × CMDB read/write × 3 modes. |
| `server/__tests__/helpers.ts` | Modify | Add fixtures: `createMember`, `createNoc`, `createPlatformAdmin`, `createScopedApp`. |

---

## Task 1: `ScopeViolationError`

**Files:** Create `server/scope/errors.ts`, modify `server/__tests__/scope-context.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/scope-context.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ScopeViolationError } from '../scope/errors';

describe('ScopeViolationError', () => {
  it('captures module, action, and optional applicationId', () => {
    const err = new ScopeViolationError({
      module: 'cmdb',
      action: 'update',
      applicationId: 'app-1',
    });
    expect(err.name).toBe('ScopeViolationError');
    expect(err.module).toBe('cmdb');
    expect(err.action).toBe('update');
    expect(err.applicationId).toBe('app-1');
    expect(err.message).toMatch(/cmdb\.update/);
  });

  it('serializes to a stable JSON shape for HTTP responses', () => {
    const err = new ScopeViolationError({ module: 'cmdb', action: 'create' });
    expect(err.toJSON()).toEqual({
      error: 'scope_violation',
      module: 'cmdb',
      action: 'create',
      applicationId: undefined,
    });
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-context.test.ts`
Expected: FAIL — `Cannot find module '../scope/errors'`.

- [ ] **Step 3: Implement `server/scope/errors.ts`**

```ts
export type ScopeAction = 'read' | 'create' | 'update' | 'delete';

export interface ScopeViolation {
  module: string;
  action: ScopeAction;
  applicationId?: string;
}

export class ScopeViolationError extends Error {
  readonly module: string;
  readonly action: ScopeAction;
  readonly applicationId?: string;

  constructor(v: ScopeViolation) {
    super(`scope_violation: ${v.module}.${v.action}${v.applicationId ? ` (app ${v.applicationId})` : ''}`);
    this.name = 'ScopeViolationError';
    this.module = v.module;
    this.action = v.action;
    this.applicationId = v.applicationId;
  }

  toJSON() {
    return {
      error: 'scope_violation' as const,
      module: this.module,
      action: this.action,
      applicationId: this.applicationId,
    };
  }
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/errors.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): ScopeViolationError + JSON serialization"
```

---

## Task 2: Policy table

**Files:** Create `server/scope/policy.ts`

- [ ] **Step 1: Append failing test to `server/__tests__/scope-context.test.ts`**

```ts
import { POLICY, type ModuleKey } from '../scope/policy';

describe('scope policy table', () => {
  it('declares CMDB as read=global, write=scoped', () => {
    expect(POLICY.cmdb.read).toBe('global');
    expect(POLICY.cmdb.write).toBe('scoped');
  });

  it('declares Event/Incident/ServiceRequest as read=scoped', () => {
    const scopedRead: ModuleKey[] = ['event', 'incident', 'service_request'];
    for (const m of scopedRead) {
      expect(POLICY[m].read).toBe('scoped');
    }
  });

  it('lists allowed write bypass roles per module', () => {
    expect(POLICY.cmdb.writeBypass).toEqual(['PLATFORM_ADMIN']);
    expect(POLICY.incident.writeBypass).toContain('NOC_OPERATOR');
    expect(POLICY.service_request.writeBypass).toContain('NOC_OPERATOR');
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `server/scope/policy.ts`**

```ts
import type { FunctionalRoleCode } from '../constants/functionalRoles';

export type ModuleKey =
  | 'cmdb'
  | 'event'
  | 'incident'
  | 'service_request'
  | 'problem'
  | 'change'
  | 'release';

export type ReadPolicy = 'global' | 'scoped';
export type WritePolicy = 'scoped' | 'admin_only';

export interface ModulePolicy {
  read: ReadPolicy;
  write: WritePolicy;
  /** Functional roles allowed to bypass read scope (in addition to membership). */
  readBypass: readonly FunctionalRoleCode[];
  /** Functional roles allowed to bypass write scope. */
  writeBypass: readonly FunctionalRoleCode[];
}

export const POLICY: Record<ModuleKey, ModulePolicy> = {
  cmdb:           { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  change:         { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  problem:        { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  event:          { read: 'scoped', write: 'scoped',     readBypass: ['NOC_OPERATOR', 'AUDITOR', 'PLATFORM_ADMIN'], writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  incident:       { read: 'scoped', write: 'scoped',     readBypass: ['NOC_OPERATOR', 'AUDITOR', 'PLATFORM_ADMIN'], writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  service_request:{ read: 'scoped', write: 'scoped',     readBypass: ['AUDITOR', 'PLATFORM_ADMIN'],                  writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  release:        { read: 'global', write: 'admin_only', readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
};
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/policy.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): static module policy table"
```

---

## Task 3: `ScopeContext` resolver

**Files:** Create `server/scope/context.ts`, modify `server/__tests__/scope-context.test.ts`

- [ ] **Step 1: Append failing test**

```ts
import { resolveScopeContext, type ScopeContext } from '../scope/context';
import { prisma } from '../db';
import { afterAll } from 'vitest';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('resolveScopeContext', () => {
  it('returns membership + functional roles + tenant for a normal user', async () => {
    // Pick the seeded admin user from the demo tenant.
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' } });
    const user = await prisma.user.findFirstOrThrow({ where: { tenantId: tenant.id } });
    const ctx: ScopeContext = await resolveScopeContext({
      userId: user.id,
      tenantId: tenant.id,
    });
    expect(ctx.userId).toBe(user.id);
    expect(ctx.tenantId).toBe(tenant.id);
    expect(Array.isArray(ctx.appMemberships)).toBe(true);
    expect(Array.isArray(ctx.functionalRoles)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `server/scope/context.ts`**

```ts
import { prisma } from '../db';
import type { FunctionalRoleCode } from '../constants/functionalRoles';
import { FUNCTIONAL_ROLE_CODES } from '../constants/functionalRoles';

export interface AppMembership {
  appId: string;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
}

export interface ScopeContext {
  userId: string;
  tenantId: string;
  appMemberships: AppMembership[];
  functionalRoles: FunctionalRoleCode[];
}

/**
 * Loads the per-request scope context: which apps the user can read/write via
 * Team membership, plus any tenant-wide functional roles. Single query each.
 */
export async function resolveScopeContext(args: {
  userId: string;
  tenantId: string;
}): Promise<ScopeContext> {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { teamId: true },
  });

  const teamId = user?.teamId ?? null;
  const memberships = teamId
    ? await prisma.applicationTeam.findMany({
        where: { teamId },
        select: { applicationId: true, role: true },
      })
    : [];

  const roleRows = await prisma.userFunctionalRole.findMany({
    where: { userId: args.userId, role: { code: { in: [...FUNCTIONAL_ROLE_CODES] } } },
    select: { role: { select: { code: true } } },
  });

  return {
    userId: args.userId,
    tenantId: args.tenantId,
    appMemberships: memberships.map((m) => ({ appId: m.applicationId, role: m.role })),
    functionalRoles: roleRows.map((r) => r.role.code as FunctionalRoleCode),
  };
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/context.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): ScopeContext resolver (membership + functional roles)"
```

---

## Task 4: Enforcement mode helper

**Files:** Create `server/scope/enforcement.ts`, modify `server/__tests__/scope-context.test.ts`

- [ ] **Step 1: Append failing test**

```ts
import type { Response } from 'express';
import { applyEnforcement, readEnforcementMode } from '../scope/enforcement';
import { ScopeViolationError } from '../scope/errors';

function mockRes(): Response {
  const headers: Record<string, string> = {};
  return { setHeader: (k: string, v: string) => { headers[k] = v; }, locals: { headers } } as unknown as Response;
}

describe('enforcement mode', () => {
  it('defaults to off when env unset', () => {
    delete process.env.SCOPE_ENFORCEMENT_MODE;
    expect(readEnforcementMode()).toBe('off');
  });

  it('throws in enforce mode', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: 'a1' }), mockRes()),
    ).toThrow(ScopeViolationError);
  });

  it('returns silently in off mode', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'off';
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update' }), mockRes()),
    ).not.toThrow();
  });

  it('sets X-Scope-Warning in warn mode and does not throw', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'warn';
    const res = mockRes();
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: 'a1' }), res),
    ).not.toThrow();
    expect((res as unknown as { locals: { headers: Record<string, string> } }).locals.headers['X-Scope-Warning'])
      .toBe('cmdb.update:a1');
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `server/scope/enforcement.ts`**

```ts
import type { Response } from 'express';
import { logger } from '../logger';
import { ScopeViolationError } from './errors';

export type EnforcementMode = 'off' | 'warn' | 'enforce';

const VALID: readonly EnforcementMode[] = ['off', 'warn', 'enforce'];

export function readEnforcementMode(): EnforcementMode {
  const raw = (process.env.SCOPE_ENFORCEMENT_MODE ?? 'off').trim().toLowerCase();
  return (VALID as readonly string[]).includes(raw) ? (raw as EnforcementMode) : 'off';
}

/**
 * Apply the configured enforcement mode to a scope violation.
 * - off: log at debug, do nothing.
 * - warn: log at warn, set X-Scope-Warning header.
 * - enforce: throw.
 */
export function applyEnforcement(err: ScopeViolationError, res: Response): void {
  const mode = readEnforcementMode();
  if (mode === 'enforce') throw err;
  if (mode === 'warn') {
    logger.warn({ violation: err.toJSON() }, 'scope warn');
    res.setHeader('X-Scope-Warning', `${err.module}.${err.action}${err.applicationId ? `:${err.applicationId}` : ''}`);
    return;
  }
  logger.debug({ violation: err.toJSON() }, 'scope off');
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/enforcement.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): SCOPE_ENFORCEMENT_MODE helper (off/warn/enforce)"
```

---

## Task 5: `ScopedDb` factory with CMDB namespace

**Files:** Create `server/scope/scopedDb.ts`, modify `server/__tests__/scope-context.test.ts`

- [ ] **Step 1: Add CMDB-specific unit checks to the test file**

```ts
import { buildScopedDb, type ScopedDb } from '../scope/scopedDb';

describe('buildScopedDb resolvers', () => {
  it('cmdb.canWrite returns true when user is a CONTRIBUTOR of the target app', () => {
    const db: ScopedDb = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [{ appId: 'app-a', role: 'CONTRIBUTOR' }],
      functionalRoles: [],
    });
    expect(db.cmdb.canWriteApp('app-a')).toBe(true);
    expect(db.cmdb.canWriteApp('app-b')).toBe(false);
  });

  it('cmdb.canWrite returns true for PLATFORM_ADMIN regardless of membership', () => {
    const db = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [],
      functionalRoles: ['PLATFORM_ADMIN'],
    });
    expect(db.cmdb.canWriteApp('app-x')).toBe(true);
  });

  it('cmdb.canWrite returns true for NULL applicationId only for PLATFORM_ADMIN', () => {
    const member = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [{ appId: 'app-a', role: 'CONTRIBUTOR' }],
      functionalRoles: [],
    });
    const admin = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [],
      functionalRoles: ['PLATFORM_ADMIN'],
    });
    expect(member.cmdb.canWriteApp(null)).toBe(false);
    expect(admin.cmdb.canWriteApp(null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `server/scope/scopedDb.ts`**

```ts
import type { PrismaClient } from '@prisma/client';
import type { ScopeContext } from './context';
import { ScopeViolationError } from './errors';
import { POLICY } from './policy';
import { cmdbRepo } from '../repositories/cmdb';

type ScopeMode = 'member' | 'noc' | 'owner' | 'admin';

export interface CmdbScope {
  listCIs(): Promise<Awaited<ReturnType<typeof cmdbRepo.listCIs>>>;
  getCI(publicId: string): Promise<Awaited<ReturnType<typeof cmdbRepo.getCI>>>;
  listRelationships(): Promise<Awaited<ReturnType<typeof cmdbRepo.listRelationships>>>;
  listRelationshipsForCI(ciId: string): Promise<Awaited<ReturnType<typeof cmdbRepo.listRelationshipsForCI>>>;
  listAudit(ciId?: string): Promise<Awaited<ReturnType<typeof cmdbRepo.listAudit>>>;
  /**
   * Update a CI. Throws ScopeViolationError if the caller cannot write
   * the CI's primaryApplicationId. Returns null when the CI does not exist
   * (mirrors cmdbRepo.updateCI behaviour).
   */
  updateCI(publicId: string, patch: Parameters<typeof cmdbRepo.updateCI>[2]): Promise<{ result: Awaited<ReturnType<typeof cmdbRepo.updateCI>>; scopeMode: ScopeMode } | null>;
  canWriteApp(appId: string | null): boolean;
  resolveScopeMode(appId: string | null): ScopeMode | null;
}

export interface ScopedDb {
  cmdb: CmdbScope;
}

export function buildScopedDb(prisma: PrismaClient, ctx: ScopeContext): ScopedDb {
  const isPlatformAdmin = ctx.functionalRoles.includes('PLATFORM_ADMIN');

  const writableApps = new Set(
    ctx.appMemberships
      .filter((m) => m.role === 'OWNER' || m.role === 'CONTRIBUTOR')
      .map((m) => m.appId),
  );
  const ownerApps = new Set(
    ctx.appMemberships.filter((m) => m.role === 'OWNER').map((m) => m.appId),
  );

  function canWriteApp(appId: string | null): boolean {
    if (isPlatformAdmin) return true;
    if (appId === null) return false; // only PLATFORM_ADMIN may write null
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r))) return true;
    return writableApps.has(appId);
  }

  function resolveScopeMode(appId: string | null): ScopeMode | null {
    if (!canWriteApp(appId)) return null;
    if (isPlatformAdmin) return 'admin';
    if (POLICY.cmdb.writeBypass.some((r) => ctx.functionalRoles.includes(r) && r !== 'PLATFORM_ADMIN')) return 'noc';
    if (appId && ownerApps.has(appId)) return 'owner';
    return 'member';
  }

  const cmdb: CmdbScope = {
    listCIs: () => cmdbRepo.listCIs(ctx.tenantId),
    getCI: (publicId) => cmdbRepo.getCI(ctx.tenantId, publicId),
    listRelationships: () => cmdbRepo.listRelationships(ctx.tenantId),
    listRelationshipsForCI: (ciId) => cmdbRepo.listRelationshipsForCI(ctx.tenantId, ciId),
    listAudit: (ciId) => cmdbRepo.listAudit(ctx.tenantId, ciId),
    async updateCI(publicId, patch) {
      const existing = await cmdbRepo.getCI(ctx.tenantId, publicId);
      if (!existing) return null;
      const appId = (existing as { primaryApplicationId?: string | null }).primaryApplicationId ?? null;
      // NULL appId is legacy/unbackfilled — skip enforcement.
      if (appId !== null && !canWriteApp(appId)) {
        throw new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: appId });
      }
      const mode = resolveScopeMode(appId) ?? 'admin';
      const result = await cmdbRepo.updateCI(ctx.tenantId, publicId, patch);
      return { result, scopeMode: mode };
    },
    canWriteApp,
    resolveScopeMode,
  };

  return { cmdb };
}
```

- [ ] **Step 4: Run, expect pass.**

- [ ] **Step 5: Commit**

```bash
git add server/scope/scopedDb.ts server/__tests__/scope-context.test.ts
git commit -m "feat(scope): ScopedDb factory with CMDB namespace"
```

---

## Task 6: `withScopedDb` middleware + Request augmentation

**Files:** Create `server/middleware/scopedDb.ts`, modify `server/middleware/auth.ts`

- [ ] **Step 1: Create `server/middleware/scopedDb.ts`**

```ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { resolveScopeContext } from '../scope/context';
import { buildScopedDb, type ScopedDb } from '../scope/scopedDb';

declare module 'express-serve-static-core' {
  interface Request {
    scoped?: ScopedDb;
  }
}

export const withScopedDb = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (!req.session) return next();
    const ctx = await resolveScopeContext({
      userId: req.session.user.id,
      tenantId: req.tenantId,
    });
    req.scoped = buildScopedDb(prisma, ctx);
    next();
  } catch (e) {
    next(e);
  }
};
```

(If `req.session.user.id` is not the actual path to user id, follow `server/auth/session.ts` to find it and adjust.)

- [ ] **Step 2: Mount in `server/app.ts`**

Add the import at the top:

```ts
import { withScopedDb } from './middleware/scopedDb';
```

Find the line where `sessionMiddleware` is mounted and add `withScopedDb` immediately after:

```ts
app.use(sessionMiddleware);
app.use(withScopedDb);
```

- [ ] **Step 3: Translate `ScopeViolationError` → 403 in the error handler**

Locate the `ErrorRequestHandler` (or `app.use((err, …) => …)`) at the bottom of `server/app.ts`. Add a branch before the generic 500 fallback:

```ts
import { ScopeViolationError } from './scope/errors';
// inside the error handler:
if (err instanceof ScopeViolationError) {
  return res.status(403).json(err.toJSON());
}
```

- [ ] **Step 4: Lint check**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/scopedDb.ts server/app.ts
git commit -m "feat(scope): withScopedDb middleware + 403 translation"
```

---

## Task 7: Refactor CMDB routes to use `req.scoped.cmdb`

**Files:** Modify `server/routes/cmdb.ts`, modify `server/audit.ts`

- [ ] **Step 1: Add `scopeMode` to the audit signature**

In `server/audit.ts`, find the `audit(req, payload)` function (or whatever the exported helper is). Add an optional `scopeMode` field to its payload type:

```ts
export interface AuditPayload {
  action: string;
  resourceKind: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  scopeMode?: 'member' | 'noc' | 'owner' | 'admin';
}
```

Persist it as a new column in `AuditLog` if such a column already exists — otherwise fold it into the existing JSON `meta`/`data` field. Inspect `server/audit.ts` to choose the right path. If a JSON field is used, add: `meta: { ...(payload.meta ?? {}), scopeMode: payload.scopeMode }`.

- [ ] **Step 2: Replace `cmdbRepo` calls in `server/routes/cmdb.ts`**

Replace the body of each handler that used `cmdbRepo` with the equivalent `req.scoped.cmdb` call. Keep `servicesRepo` calls (services aren't part of CMDB scope in B-1). The new file (lines 11–46 of cmdb.ts replaced):

```ts
import { Router } from 'express';
import { servicesRepo } from '../repositories/docs';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qString, required } from '../util';
import { audit } from '../audit';
import { updateCISchema } from '../../src/shared/schemas/ci';

export const cmdbRouter = Router();

function scoped(req: import('express').Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

cmdbRouter.get('/cis', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listCIs());
}));

cmdbRouter.get('/cis/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listRelationships());
}));

cmdbRouter.get('/cis/audit', requirePermission('cmdb.audit.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listAudit(qString(req.query.ciId)));
}));

cmdbRouter.get('/cis/:publicId', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).cmdb.getCI(req.params.publicId), 'CI'));
}));

cmdbRouter.get('/cis/:ciId/relationships', requirePermission('cmdb.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).cmdb.listRelationshipsForCI(req.params.ciId));
}));

cmdbRouter.patch('/cis/:publicId', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = updateCISchema.parse(req.body);
  const wrapped = await scoped(req).cmdb.updateCI(req.params.publicId, body);
  if (!wrapped) throw new HttpError(404, 'CI not found');
  await audit(req, {
    action: 'update',
    resourceKind: 'ConfigurationItem',
    resourceId: req.params.publicId,
    after: wrapped.result,
    scopeMode: wrapped.scopeMode,
  });
  res.json(wrapped.result);
}));

cmdbRouter.get('/services', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(await servicesRepo.listServices(req.tenantId));
}));

cmdbRouter.get('/services/:id', requirePermission('service.read'), asyncHandler(async (req, res) => {
  res.json(required(await servicesRepo.getService(req.tenantId, req.params.id), 'service'));
}));
```

(Confirm the original `audit` call's shape by reading lines 38–46 of the pre-change `cmdb.ts`; preserve any `before` snapshot it captured.)

- [ ] **Step 3: TypeScript check**

Run: `npm run lint`. Fix anything that breaks. Common issue: `scoped()` helper needs the express `Request` type imported; the inline `import('express').Request` works without an extra top-level import.

- [ ] **Step 4: Smoke test existing CMDB tests still pass**

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/ci-edit.test.ts`
Expected: PASS — behaviour unchanged because `SCOPE_ENFORCEMENT_MODE` defaults to `off`.

- [ ] **Step 5: Commit**

```bash
git add server/routes/cmdb.ts server/audit.ts
git commit -m "refactor(cmdb): route through req.scoped.cmdb (off-mode default)"
```

---

## Task 8: Test fixtures — personas + scoped app

**Files:** Modify `server/__tests__/helpers.ts`

- [ ] **Step 1: Append fixture helpers**

Append to `server/__tests__/helpers.ts`:

```ts
import { prisma } from '../db';
import bcrypt from 'bcryptjs';

export interface ScopedAppFixture {
  appId: string;
  teamAId: string; // contributor
  teamBId: string; // outsider (not a member of appId)
  memberAUserId: string;     // member of teamA
  memberBUserId: string;     // member of teamB
  nocUserId: string;         // NOC_OPERATOR
  platformAdminUserId: string;
  cleanup: () => Promise<void>;
}

/**
 * Build an isolated org chain for scope tests:
 *   - one Application
 *   - two Teams (A = contributor, B = outsider)
 *   - 4 users: memberA, memberB, NOC, PlatformAdmin
 */
export async function createScopedAppFixture(tag: string): Promise<ScopedAppFixture> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' },
  });
  const div = await prisma.division.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_DIV_${tag}` } },
    update: {},
    create: { id: `div-${tag}`, tenantId: tenant.id, code: `SCOPE_DIV_${tag}`, name: `Div ${tag}` },
  });
  const dept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_DEPT_${tag}` } },
    update: {},
    create: { id: `dept-${tag}`, tenantId: tenant.id, divisionId: div.id, code: `SCOPE_DEPT_${tag}`, name: `Dept ${tag}` },
  });
  const teamA = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_TEAM_A_${tag}` } },
    update: {},
    create: { id: `team-a-${tag}`, tenantId: tenant.id, departmentId: dept.id, code: `SCOPE_TEAM_A_${tag}`, name: `Team A ${tag}` },
  });
  const teamB = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_TEAM_B_${tag}` } },
    update: {},
    create: { id: `team-b-${tag}`, tenantId: tenant.id, departmentId: dept.id, code: `SCOPE_TEAM_B_${tag}`, name: `Team B ${tag}` },
  });
  const app = await prisma.application.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: `SCOPE_APP_${tag}` } },
    update: {},
    create: { id: `app-${tag}`, tenantId: tenant.id, code: `SCOPE_APP_${tag}`, name: `App ${tag}` },
  });
  await prisma.applicationTeam.upsert({
    where: { applicationId_teamId: { applicationId: app.id, teamId: teamA.id } },
    update: { role: 'CONTRIBUTOR' },
    create: { applicationId: app.id, teamId: teamA.id, role: 'CONTRIBUTOR' },
  });

  async function makeUser(suffix: string, teamId: string | null): Promise<string> {
    const id = `user-${tag}-${suffix}`;
    const email = `${id}@scope.test`;
    await prisma.user.upsert({
      where: { id },
      update: { teamId },
      create: {
        id,
        tenantId: tenant.id,
        email,
        name: `Scope ${suffix} ${tag}`,
        passwordHash: await bcrypt.hash('scope-test-pw', 4),
        teamId,
      },
    });
    return id;
  }

  const memberA = await makeUser('member-a', teamA.id);
  const memberB = await makeUser('member-b', teamB.id);
  const noc     = await makeUser('noc', teamB.id);
  const admin   = await makeUser('admin', teamB.id);

  // Attach functional roles for noc + admin.
  const nocRole = await prisma.functionalRole.findUniqueOrThrow({ where: { tenantId_code: { tenantId: tenant.id, code: 'NOC_OPERATOR' } } });
  const adminRole = await prisma.functionalRole.findUniqueOrThrow({ where: { tenantId_code: { tenantId: tenant.id, code: 'PLATFORM_ADMIN' } } });
  await prisma.userFunctionalRole.upsert({ where: { userId_functionalRoleId: { userId: noc, functionalRoleId: nocRole.id } }, update: {}, create: { userId: noc, functionalRoleId: nocRole.id } });
  await prisma.userFunctionalRole.upsert({ where: { userId_functionalRoleId: { userId: admin, functionalRoleId: adminRole.id } }, update: {}, create: { userId: admin, functionalRoleId: adminRole.id } });

  return {
    appId: app.id,
    teamAId: teamA.id,
    teamBId: teamB.id,
    memberAUserId: memberA,
    memberBUserId: memberB,
    nocUserId: noc,
    platformAdminUserId: admin,
    cleanup: async () => {
      await prisma.userFunctionalRole.deleteMany({ where: { userId: { in: [memberA, memberB, noc, admin] } } });
      await prisma.user.deleteMany({ where: { id: { in: [memberA, memberB, noc, admin] } } });
      await prisma.applicationTeam.deleteMany({ where: { applicationId: app.id } });
      await prisma.application.delete({ where: { id: app.id } }).catch(() => undefined);
      await prisma.team.delete({ where: { id: teamA.id } }).catch(() => undefined);
      await prisma.team.delete({ where: { id: teamB.id } }).catch(() => undefined);
      await prisma.department.delete({ where: { id: dept.id } }).catch(() => undefined);
      await prisma.division.delete({ where: { id: div.id } }).catch(() => undefined);
    },
  };
}
```

(Adjust `prisma.user.create` `data` shape if your User model demands extra required fields — check `prisma/schema.prisma:53+`.)

- [ ] **Step 2: TypeScript check**

Run: `npm run lint`. Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add server/__tests__/helpers.ts
git commit -m "test(scope): persona fixture helpers (createScopedAppFixture)"
```

---

## Task 9: Integration test — CMDB × 3 personas × 3 modes

**Files:** Create `server/__tests__/scope-cmdb.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { createScopedAppFixture, type ScopedAppFixture, login } from './helpers';

const app = createApp();

let fx: ScopedAppFixture;
let ciPublicId: string;

beforeAll(async () => {
  fx = await createScopedAppFixture('cmdb');

  // Create a CI in fx.appId so we have a target to update.
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' },
  });
  const ci = await prisma.configurationItem.create({
    data: {
      id: `ci-scope-cmdb`,
      publicId: `CI-SCOPE-CMDB-001`,
      tenantId: tenant.id,
      name: 'Scope Test CI',
      type: 'server',
      status: 'active',
      environment: 'prod',
      criticality: 'P3',
      ownerTeamId: fx.teamAId,
      primaryApplicationId: fx.appId,
      health: 'healthy',
      attributes: '{}',
      tags: '[]',
    },
  });
  ciPublicId = ci.publicId;
});

afterAll(async () => {
  await prisma.configurationItem.delete({ where: { publicId: ciPublicId } }).catch(() => undefined);
  await fx.cleanup();
  await prisma.$disconnect();
});

async function loginAs(userId: string) {
  // helpers.login() takes email+password; our fixture users all share password "scope-test-pw"
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return login(app, user.email, 'scope-test-pw');
}

describe('CMDB scope — read is global per spec', () => {
  it('memberB (outsider) can GET /cis even though they are not in the app', async () => {
    const cookie = await loginAs(fx.memberBUserId);
    const res = await request(app).get('/api/v1/cmdb/cis').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});

describe('CMDB scope — write is scoped', () => {
  it('memberA (contributor) PATCH /cis succeeds in any mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs(fx.memberAUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Scope Test CI (renamed by A)' });
    expect(res.status).toBe(200);
  });

  it('memberB (outsider) PATCH succeeds in off mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'off';
    const cookie = await loginAs(fx.memberBUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Off-mode patch from B' });
    expect(res.status).toBe(200);
  });

  it('memberB PATCH gets X-Scope-Warning header in warn mode (still 200)', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'warn';
    const cookie = await loginAs(fx.memberBUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Warn-mode patch from B' });
    expect(res.status).toBe(200);
    expect(res.headers['x-scope-warning']).toMatch(/^cmdb\.update:/);
  });

  it('memberB PATCH gets 403 in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs(fx.memberBUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Enforce-mode patch from B' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'scope_violation', module: 'cmdb', action: 'update' });
  });

  it('PLATFORM_ADMIN bypasses scope in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs(fx.platformAdminUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${ciPublicId}`)
      .set('Cookie', cookie)
      .send({ name: 'Enforce-mode patch by admin' });
    expect(res.status).toBe(200);
  });
});

describe('CMDB scope — NULL primaryApplicationId is unscoped (legacy)', () => {
  let legacyId: string;
  beforeAll(async () => {
    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' },
    });
    const ci = await prisma.configurationItem.create({
      data: {
        id: 'ci-scope-legacy',
        publicId: 'CI-SCOPE-LEGACY-001',
        tenantId: tenant.id,
        name: 'Legacy CI (no app)',
        type: 'server',
        status: 'active',
        environment: 'prod',
        criticality: 'P3',
        ownerTeamId: fx.teamAId,
        primaryApplicationId: null,
        health: 'healthy',
        attributes: '{}',
        tags: '[]',
      },
    });
    legacyId = ci.publicId;
  });
  afterAll(async () => {
    await prisma.configurationItem.delete({ where: { publicId: legacyId } }).catch(() => undefined);
  });

  it('memberB can PATCH a NULL-app CI even in enforce mode', async () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    const cookie = await loginAs(fx.memberBUserId);
    const res = await request(app)
      .patch(`/api/v1/cmdb/cis/${legacyId}`)
      .set('Cookie', cookie)
      .send({ name: 'Legacy update by B' });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run, expect FAIL initially** (resolver / fixture wiring issues are common; iterate on the helpers task if needed).

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-cmdb.test.ts`

- [ ] **Step 3: Iterate until all 6 assertions pass.**

If a test fails, isolate by re-running with `-t "<name>"` and walking the request through the new middleware/scoped layer. Most likely issues:
- `req.session.user.id` path is wrong → adjust in `withScopedDb`.
- `applicationTeam` upsert composite key naming → check generated Prisma client.
- `requirePermission('cmdb.read')` may need a permission grant for fixture users — add it via existing permission helpers in `prisma/seedRbac.ts` if necessary (you can also grant `system.admin` to the platform-admin user to keep this small).

- [ ] **Step 4: Reset env mode after suite**

Confirm the test file restores `SCOPE_ENFORCEMENT_MODE` after the last test (the fixture's `afterAll` should `delete process.env.SCOPE_ENFORCEMENT_MODE`).

- [ ] **Step 5: Commit**

```bash
git add server/__tests__/scope-cmdb.test.ts
git commit -m "test(scope): CMDB integration — 3 personas × 3 modes + legacy NULL"
```

---

## Task 10: Wire env flag default + docs

**Files:** Modify `.env.example`, modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Add `SCOPE_ENFORCEMENT_MODE` to `.env.example`**

Append to `.env.example`:

```
# Application-scope enforcement (Plan B-1+). Values: off | warn | enforce.
# Default: off (no behavioural change; checks run silently for telemetry).
SCOPE_ENFORCEMENT_MODE=off
```

- [ ] **Step 2: Annotate the spec's Fase 2 row**

In §10.1 of the spec, modify the "Fase 2 — Enforcement toggle" row to add `🚧 in progress (Plan B-1, CMDB pilot only; remaining modules in Plan B-2)`.

- [ ] **Step 3: Regression sweep**

Run: `npm run lint && npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-context.test.ts server/__tests__/scope-cmdb.test.ts server/__tests__/ci-edit.test.ts server/__tests__/scope-foundation.test.ts`

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add .env.example docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(scope): document SCOPE_ENFORCEMENT_MODE + mark Fase 2 in progress"
```

---

## Done criteria for Plan B-1

- [ ] `server/scope/` directory exists with `errors.ts`, `policy.ts`, `context.ts`, `enforcement.ts`, `scopedDb.ts`.
- [ ] `withScopedDb` middleware attached after `sessionMiddleware`.
- [ ] `ScopeViolationError` translates to HTTP 403 with stable JSON shape.
- [ ] `SCOPE_ENFORCEMENT_MODE` env honored (off default; warn sets `X-Scope-Warning`; enforce throws).
- [ ] CMDB routes route through `req.scoped.cmdb`; no direct `cmdbRepo` import in `server/routes/cmdb.ts`.
- [ ] `audit` payload accepts `scopeMode` and persists it.
- [ ] 6+ integration tests covering memberA/memberB/PLATFORM_ADMIN × off/warn/enforce + legacy NULL all pass.
- [ ] Pre-existing CMDB test (`ci-edit.test.ts`) still passes.
- [ ] `npm run lint` clean.
- [ ] `.env.example` documents the new flag.

## What Plan B-2 will pick up
- Apply the same `req.scoped.<module>` pattern to: Events, Incidents, Problems, Changes, Releases, ServiceRequests, Monitoring routes.
- Land the `no-restricted-imports` ESLint rule banning `prisma`/`*Repo` from `server/routes/*.ts`.
- Extend persona integration tests to each module.
