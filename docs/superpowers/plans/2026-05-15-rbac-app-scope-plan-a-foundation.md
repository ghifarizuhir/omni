# RBAC × App Scope — Plan A: Schema & Roles Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the additive Prisma schema changes and tenant-level functional role seeds that all subsequent RBAC scope work depends on, without changing any runtime behavior.

**Architecture:** Pure additive Prisma migration: a new `ApplicationTeamRole` enum + `role`/`addedById`/`addedAt` on `ApplicationTeam`, nullable `applicationId` (or `primaryApplicationId` on `ConfigurationItem`) plus `(tenantId, applicationId)` indexes on six operational tables. Plus a shared TypeScript constants module for the three bypass functional role codes (`PLATFORM_ADMIN`, `NOC_OPERATOR`, `AUDITOR`) and idempotent seeding inside `seed.prod.ts`.

**Tech Stack:** Prisma 5 + Postgres 16, TypeScript, Vitest + supertest (real DB).

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md)

**Out of scope (handled in later plans):**
- `KnowledgeArticle.visibility` enum — the model doesn't exist yet; introduce when KB module lands.
- Any enforcement code (no `ScopedDb`, no middleware) — that's **Plan B**.
- Backfill of `applicationId` for existing rows — that's **Plan C**.
- Promoting `applicationId` to `NOT NULL` — that's **Plan F**.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add enum, fields, indexes |
| `prisma/migrations/<ts>_app_scope_foundation/migration.sql` | Create (via `prisma migrate dev`) | Generated DDL |
| `server/constants/functionalRoles.ts` | Create | Typed string-union constants for the three role codes |
| `prisma/seed.prod.ts` | Modify | Idempotent upsert of the three functional roles for the root tenant |
| `server/__tests__/scope-foundation.test.ts` | Create | Vitest checks: enum present, defaults work, role codes seeded |

---

## Task 1: Add `ApplicationTeamRole` enum & extend `ApplicationTeam`

**Files:**
- Modify: `prisma/schema.prisma:186-194`

- [ ] **Step 1: Add the enum near the top of the file**

Add this enum block immediately above `model Tenant` (around line 30) or grouped with other enums if any exist. If no enum block exists yet, place it directly above `model ApplicationTeam` (line 186):

```prisma
enum ApplicationTeamRole {
  OWNER
  CONTRIBUTOR
  VIEWER
}
```

- [ ] **Step 2: Extend `ApplicationTeam` with `role`, `addedById`, `addedAt`**

Replace the existing `ApplicationTeam` model body (lines 186–194) with:

```prisma
model ApplicationTeam {
  applicationId String
  teamId        String
  role          ApplicationTeamRole @default(CONTRIBUTOR)
  addedById     String?
  addedAt       DateTime            @default(now())
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  team        Team        @relation(fields: [teamId],        references: [id], onDelete: Cascade)

  @@id([applicationId, teamId])
  @@index([teamId])
  @@index([applicationId, role])
}
```

(`addedById` is intentionally a plain `String?` — no FK to `User` here, to avoid a cascade-tangle. We resolve the user when rendering, not at the DB level.)

- [ ] **Step 3: Validate schema**

Run: `npx prisma validate`

Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Commit (schema only, no migration yet — we batch the migration after all model edits)**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add ApplicationTeamRole enum and ApplicationTeam metadata"
```

---

## Task 2: Add `primaryApplicationId` to `ConfigurationItem`

**Files:**
- Modify: `prisma/schema.prisma:260-288`

- [ ] **Step 1: Add the column and index**

Inside `model ConfigurationItem` (line 260), add a new line after the existing `ownerTeamId` field (after line 270):

```prisma
  primaryApplicationId String?
```

And add a new index block at the bottom of the model, before the closing brace, alongside the existing `@@index` lines:

```prisma
  @@index([tenantId, primaryApplicationId])
```

Do **not** add a `@relation` to `Application` yet — Application has no back-relation defined for CI, and adding it forces edits to that model too. We model the FK in SQL via the migration instead (see Task 8). Keep the column as a plain string to keep this task small.

- [ ] **Step 2: Validate schema**

Run: `npx prisma validate`

Expected: valid.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add CI.primaryApplicationId for app scope"
```

---

## Task 3: Add `applicationId` to `Event` and `Incident`

**Files:**
- Modify: `prisma/schema.prisma:330-385` (Event), `387-409` (Incident)

- [ ] **Step 1: Modify `Event`**

In `model Event` (line 330), add after the existing `tags` field (around line 358):

```prisma
  applicationId       String?
```

Add new index at the bottom of the model:

```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 2: Modify `Incident`**

In `model Incident` (line 387), add after `affectedCIPublicIds`:

```prisma
  applicationId         String?
```

Add new index at the bottom:

```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 3: Validate**

Run: `npx prisma validate`

Expected: valid.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add applicationId to Event and Incident"
```

---

## Task 4: Add `applicationId` to `Problem`, `Change`, `Release`, `ServiceRequest`

**Files:**
- Modify: `prisma/schema.prisma:445-455` (Problem), `456-468` (Change), `469-...` (Release), `502-510` (ServiceRequest)

- [ ] **Step 1: `Problem`**

Add field after `data`:
```prisma
  applicationId String?
```
Add index:
```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 2: `Change`**

Add field after `scheduledStart`:
```prisma
  applicationId String?
```
Add index:
```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 3: `Release`**

Add field after `data`:
```prisma
  applicationId String?
```
Add index at the model bottom:
```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 4: `ServiceRequest`**

Add field after `data`:
```prisma
  applicationId String?
```
Add index (the existing `@@index([tenantId, status])` stays):
```prisma
  @@index([tenantId, applicationId])
```

- [ ] **Step 5: Validate**

Run: `npx prisma validate`

Expected: valid.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add applicationId to Problem/Change/Release/ServiceRequest"
```

---

## Task 5: Generate the migration

**Files:**
- Create: `prisma/migrations/<timestamp>_app_scope_foundation/migration.sql` (Prisma-generated)

- [ ] **Step 1: Make sure local Postgres + Redis are up**

Run: `docker compose up -d postgres redis`

Expected: containers `omni-postgres-1` and `omni-redis-1` running (or similar; check `docker compose ps`).

- [ ] **Step 2: Create migration**

Run: `npm run db:migrate -- --name app_scope_foundation`

(Underlying: `prisma migrate dev --name app_scope_foundation`.)

Expected: new migration directory appears under `prisma/migrations/`, Prisma reports "Your database is now in sync with your schema."

- [ ] **Step 3: Inspect generated SQL**

Open `prisma/migrations/<new-timestamp>_app_scope_foundation/migration.sql` and verify it contains, in some form:

- `CREATE TYPE "ApplicationTeamRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'VIEWER');`
- `ALTER TABLE "ApplicationTeam" ADD COLUMN "role" "ApplicationTeamRole" NOT NULL DEFAULT 'CONTRIBUTOR'` plus the two metadata columns
- `ALTER TABLE "ConfigurationItem" ADD COLUMN "primaryApplicationId" TEXT`
- `ALTER TABLE "Event" ADD COLUMN "applicationId" TEXT`
- Same for `Incident`, `Problem`, `Change`, `Release`, `ServiceRequest`
- `CREATE INDEX` for every new index listed above

If anything is missing, edit the schema, delete the migration directory, and re-run Step 2.

- [ ] **Step 4: Smoke check via Prisma Studio (optional but cheap)**

Run: `npx prisma studio` and browse `ApplicationTeam` — confirm the `role` column shows up with default `CONTRIBUTOR` for existing rows. Close the browser.

- [ ] **Step 5: Commit migration**

```bash
git add prisma/migrations
git commit -m "feat(db): migration for app scope foundation (enums + applicationId columns)"
```

---

## Task 6: Create `server/constants/functionalRoles.ts`

**Files:**
- Create: `server/constants/functionalRoles.ts`

- [ ] **Step 1: Write the failing test first**

Create `server/__tests__/scope-foundation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  FUNCTIONAL_ROLE_CODES,
  PLATFORM_ADMIN,
  NOC_OPERATOR,
  AUDITOR,
  type FunctionalRoleCode,
} from '../constants/functionalRoles';

describe('functional role codes', () => {
  it('exposes the three bypass roles as constants', () => {
    expect(PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(NOC_OPERATOR).toBe('NOC_OPERATOR');
    expect(AUDITOR).toBe('AUDITOR');
  });

  it('exposes them as a readonly tuple for iteration', () => {
    expect([...FUNCTIONAL_ROLE_CODES].sort()).toEqual(
      ['AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN'],
    );
  });

  it('the union type accepts only known codes', () => {
    const ok: FunctionalRoleCode = 'PLATFORM_ADMIN';
    expect(ok).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run server/__tests__/scope-foundation.test.ts`

Expected: FAIL — `Cannot find module '../constants/functionalRoles'`.

- [ ] **Step 3: Create the module**

Write `server/constants/functionalRoles.ts`:

```ts
/**
 * Tenant-scoped bypass roles used by the app-scope enforcement layer.
 * Codes match the `FunctionalRole.code` column and are seeded per tenant
 * in prisma/seed.prod.ts. See docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md.
 */

export const PLATFORM_ADMIN = 'PLATFORM_ADMIN' as const;
export const NOC_OPERATOR  = 'NOC_OPERATOR'  as const;
export const AUDITOR       = 'AUDITOR'       as const;

export const FUNCTIONAL_ROLE_CODES = [
  PLATFORM_ADMIN,
  NOC_OPERATOR,
  AUDITOR,
] as const;

export type FunctionalRoleCode = typeof FUNCTIONAL_ROLE_CODES[number];

export const FUNCTIONAL_ROLE_DEFINITIONS: Record<
  FunctionalRoleCode,
  { name: string; description: string }
> = {
  PLATFORM_ADMIN: {
    name: 'Platform Administrator',
    description: 'Tenant-wide bypass: full read and write on every application.',
  },
  NOC_OPERATOR: {
    name: 'NOC / Service Desk Operator',
    description:
      'Cross-application read; may create and triage Incidents and Service Requests for any application.',
  },
  AUDITOR: {
    name: 'Auditor',
    description: 'Tenant-wide read of every module (including normally scoped data). No write access.',
  },
};
```

- [ ] **Step 4: Run test, expect pass**

Run: `npx vitest run server/__tests__/scope-foundation.test.ts`

Expected: PASS (3 assertions green).

- [ ] **Step 5: Commit**

```bash
git add server/constants/functionalRoles.ts server/__tests__/scope-foundation.test.ts
git commit -m "feat(scope): add functional role code constants"
```

---

## Task 7: Seed the three functional roles in `seed.prod.ts`

**Files:**
- Modify: `prisma/seed.prod.ts`
- Modify: `server/__tests__/scope-foundation.test.ts`

- [ ] **Step 1: Extend the test with a DB-backed expectation**

Append to `server/__tests__/scope-foundation.test.ts`:

```ts
import { prisma } from '../db';
import { afterAll } from 'vitest';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('functional roles seeded', () => {
  it('every bypass role exists for the root tenant', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow();
    const rows = await prisma.functionalRole.findMany({
      where: { tenantId: tenant.id, code: { in: [...FUNCTIONAL_ROLE_CODES] } },
    });
    const codes = rows.map((r) => r.code).sort();
    expect(codes).toEqual(['AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN']);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx vitest run server/__tests__/scope-foundation.test.ts`

Expected: FAIL — `expected [] to deeply equal [ 'AUDITOR', 'NOC_OPERATOR', 'PLATFORM_ADMIN' ]`.

- [ ] **Step 3: Add seeding logic to `seed.prod.ts`**

Open `prisma/seed.prod.ts`. After the RBAC catalog seeding block (around line 97, after `[seed.prod] RBAC catalog seeded …`), add:

```ts
// 4b. Functional roles — tenant-scoped bypass roles for app scope enforcement.
//     See docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md §5.2.
const {
  FUNCTIONAL_ROLE_CODES,
  FUNCTIONAL_ROLE_DEFINITIONS,
} = await import('../server/constants/functionalRoles');

for (const code of FUNCTIONAL_ROLE_CODES) {
  const def = FUNCTIONAL_ROLE_DEFINITIONS[code];
  await prisma.functionalRole.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code } },
    update: { name: def.name, description: def.description },
    create: {
      id: `frole-${tenant.id}-${code.toLowerCase()}`,
      tenantId: tenant.id,
      code,
      name: def.name,
      description: def.description,
    },
  });
}
console.log(
  `[seed.prod] functional roles upserted (${FUNCTIONAL_ROLE_CODES.length}): ${FUNCTIONAL_ROLE_CODES.join(', ')}`,
);
```

(The dynamic `import` keeps the top of `seed.prod.ts` untouched and avoids ESM/CJS friction in the Prisma seed runner.)

- [ ] **Step 4: Re-run the seed**

Run: `npm run db:seed:prod`

Expected: log line `[seed.prod] functional roles upserted (3): PLATFORM_ADMIN, NOC_OPERATOR, AUDITOR`.

- [ ] **Step 5: Run test, expect pass**

Run: `npx vitest run server/__tests__/scope-foundation.test.ts`

Expected: all assertions PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/seed.prod.ts server/__tests__/scope-foundation.test.ts
git commit -m "feat(seed): seed PLATFORM_ADMIN / NOC_OPERATOR / AUDITOR functional roles"
```

---

## Task 8: Add `ApplicationTeam.role` default check via a quick integration test

**Files:**
- Modify: `server/__tests__/scope-foundation.test.ts`

We want to make sure new `ApplicationTeam` rows actually default to `CONTRIBUTOR` (catches a missed default on the migration).

- [ ] **Step 1: Append the test**

```ts
describe('ApplicationTeam.role default', () => {
  it('defaults to CONTRIBUTOR when not specified', async () => {
    const tenant = await prisma.tenant.findFirstOrThrow();

    // Make sure we have at least one Application and one Team in the tenant.
    let app = await prisma.application.findFirst({ where: { tenantId: tenant.id } });
    if (!app) {
      app = await prisma.application.create({
        data: {
          id: 'app-scope-test',
          tenantId: tenant.id,
          code: 'SCOPE_TEST',
          name: 'Scope Test App',
        },
      });
    }
    const team = await prisma.team.findFirstOrThrow({ where: { tenantId: tenant.id } });

    // Clean up any prior row from this test, then insert a fresh row without role.
    await prisma.applicationTeam
      .delete({ where: { applicationId_teamId: { applicationId: app.id, teamId: team.id } } })
      .catch(() => undefined);

    const row = await prisma.applicationTeam.create({
      data: { applicationId: app.id, teamId: team.id },
    });

    expect(row.role).toBe('CONTRIBUTOR');

    await prisma.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId: app.id, teamId: team.id } },
    });
  });
});
```

- [ ] **Step 2: Run test, expect pass**

Run: `npx vitest run server/__tests__/scope-foundation.test.ts`

Expected: all four describe blocks pass.

- [ ] **Step 3: Commit**

```bash
git add server/__tests__/scope-foundation.test.ts
git commit -m "test(scope): assert ApplicationTeam.role default is CONTRIBUTOR"
```

---

## Task 9: Regression — full lint and test sweep

We touched the schema; verify nothing else broke.

- [ ] **Step 1: Generate Prisma client (it should already have run as part of `migrate dev`, but be explicit)**

Run: `npx prisma generate`

Expected: `✔ Generated Prisma Client`.

- [ ] **Step 2: TypeScript check**

Run: `npm run lint`

Expected: no errors. If TypeScript complains about `Prisma.ApplicationTeamCreateInput` (or any new field) elsewhere, those usages must be the ones tracked by Plan B / D — but they should not break compile because every new field is optional / has a default. If something does break, fix it inline in this task.

- [ ] **Step 3: Vitest full suite**

Run: `npm run test`

Expected: every previously-green test stays green, plus the new `scope-foundation` suite passes.

- [ ] **Step 4: If everything is green, commit nothing (no changes) and proceed to the close-out task**

If you had to fix anything in Step 2, commit those fixes here:

```bash
git add -A
git commit -m "chore(scope): fix regressions surfaced by foundation migration"
```

---

## Task 10: Update the spec's Rollout checklist

**Files:**
- Modify: `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` (§10.1, Fase 0)

- [ ] **Step 1: Mark Fase 0 as done in the spec**

In §10.1, change the description of the "Fase 0 — Schema persiapan" row to add a trailing `✅ done (Plan A, <commit-sha>)` after the existing text. Use `git rev-parse HEAD` to get the SHA.

Run: `git rev-parse HEAD`

Then edit the file accordingly.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(spec): mark Fase 0 as completed by Plan A"
```

---

## Done criteria for Plan A

- [ ] `npm run lint` clean.
- [ ] `npm run test` clean (all existing tests + new `scope-foundation` suite).
- [ ] Migration file present under `prisma/migrations/<ts>_app_scope_foundation/`.
- [ ] `FunctionalRole` table contains the three bypass codes for the root tenant.
- [ ] `ApplicationTeam` rows default to `CONTRIBUTOR` when `role` is not supplied.
- [ ] Spec §10.1 Fase 0 marked done.
- [ ] No runtime behavior changed — no route, middleware, or UI was touched.
