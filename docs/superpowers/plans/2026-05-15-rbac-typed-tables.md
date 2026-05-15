# RBAC Typed Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the RBAC org tree (divisions, departments, teams, applications, functional roles, users) from JSON blobs in the generic `Document` table to typed Prisma tables, and merge the synthetic persona identity space into the real `User` table so admin@omni.local can configure the org tree via the UI with real FK integrity.

**Architecture:** New Prisma models for each RBAC entity with FK relations. Existing `User` model extended with `isSuperadmin`, `level`, and nullable `divisionId/departmentId/teamId`. A single Prisma migration creates the schema then copies data from `Document` rows of kinds `rbac-*` into the new tables, merging users by email. Server `/rbac/*` GETs become typed reads; `/admin/rbac/:entity/:id` PUT/DELETE routes keep their URL shape (upsert + delete) but become per-entity typed controllers with Zod validation and FK checks. Frontend persona context default changes from the hard-coded `u-super` to the logged-in user.

**Tech Stack:** Prisma 6, Postgres 16, Express, Zod (already in deps), Vitest, React 19. All commands run in repo root with `.env.local` exported (`export $(grep -v '^#' .env.local | xargs)`).

**Deviation from spec:** Spec proposed `POST/PATCH/DELETE` per entity. To stay aligned with the existing `rbacService.upsert*` client (PUT-by-id), this plan keeps `PUT /admin/rbac/:entity/:id` (upsert) + `DELETE` as the write surface, just typed and validated. Saves a frontend rewrite with no behavior loss; CREATE is just an upsert against a new id.

---

## File Map

**Create**

- `prisma/migrations/0002_rbac_typed_tables/migration.sql` — schema changes + data migration in one SQL file.
- `server/lib/validation/rbac.ts` — Zod schemas for each RBAC entity payload.
- `server/repositories/rbacOrg.ts` — typed read/write helpers backing the new routes.
- `server/__tests__/rbacOrg.test.ts` — integration tests against a real Postgres (uses existing `DATABASE_URL`).

**Modify**

- `prisma/schema.prisma` — add `Division`, `Department`, `Team`, `Application`, `ApplicationTeam`, `FunctionalRole`, `UserFunctionalRole`; extend `User` and `Tenant` with new relations.
- `prisma/seedDocuments.ts` — remove the six `rbac-*` doc batches at lines 644–649.
- `prisma/seed.ts` — call a new `seedRbacOrg()` helper that populates the typed tables; ensure it runs before `seedDocuments()`.
- `server/routes/platform.ts:139-144` — replace document-backed `/rbac/*` GETs with typed reads.
- `server/routes/admin.ts:244-270` — replace the generic `RBAC_ENTITY_MAP` block with per-entity PUT/DELETE handlers; extend the existing `PATCH /admin/users/:id` (or add one if absent) to accept the new org fields.
- `src/lib/rbac/CurrentUserContext.tsx:99` — drop the `'u-super'` default; initialize persona from `auth/me`.
- `src/components/layout/Sidebar.tsx:235` — gate RBAC Admin link on `session.permissions.includes('system.admin')` instead of `user?.isSuperadmin`.

**Read-only references**

- `src/types/rbac.ts` — `RbacUser`, `Division`, `Department`, `RbacTeam`, `Application`, `FunctionalRole` shapes. Response payloads must match these exactly.
- `src/services/platformServices.ts:86-122` — client-side `rbacService`; URL contracts must keep working.

---

## Task 1: Add Prisma models for the RBAC org tree

**Files:**
- Modify: `prisma/schema.prisma` (append after the existing `MembershipRole` block, before `Session`)

- [ ] **Step 1: Extend the `User` model with new fields and back-relations**

Edit the existing `model User { ... }` block (currently `prisma/schema.prisma:37-46`) to look exactly like this:

```prisma
model User {
  id           String             @id @default(cuid())
  email        String             @unique
  name         String
  avatarUrl    String?
  passwordHash String?
  isSuperadmin Boolean            @default(false)
  level        String?
  divisionId   String?
  departmentId String?
  teamId       String?
  createdAt    DateTime           @default(now())
  memberships  TenantMembership[]
  sessions     Session[]
  division     Division?          @relation(fields: [divisionId],   references: [id], onDelete: SetNull)
  department   Department?        @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  team         Team?              @relation(fields: [teamId],       references: [id], onDelete: SetNull)
  functionalRoles UserFunctionalRole[]
}
```

- [ ] **Step 2: Add the new models**

Append to `prisma/schema.prisma` (immediately before the `Session` model is fine):

```prisma
model Division {
  id        String   @id
  tenantId  String
  code      String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  departments Department[]
  users       User[]

  @@unique([tenantId, code])
  @@index([tenantId])
}

model Department {
  id         String   @id
  tenantId   String
  divisionId String
  code       String
  name       String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  division Division @relation(fields: [divisionId], references: [id], onDelete: Cascade)
  teams    Team[]
  users    User[]

  @@unique([tenantId, code])
  @@index([divisionId])
}

model Team {
  id           String   @id
  tenantId     String
  departmentId String
  code         String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  tenant     Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  users      User[]
  applications ApplicationTeam[]

  @@unique([tenantId, code])
  @@index([departmentId])
}

model Application {
  id          String   @id
  tenantId    String
  code        String
  name        String
  criticality String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  teams  ApplicationTeam[]

  @@unique([tenantId, code])
}

model ApplicationTeam {
  applicationId String
  teamId        String
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  team        Team        @relation(fields: [teamId],        references: [id], onDelete: Cascade)

  @@id([applicationId, teamId])
  @@index([teamId])
}

model FunctionalRole {
  id          String   @id
  tenantId    String
  code        String
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  users  UserFunctionalRole[]

  @@unique([tenantId, code])
}

model UserFunctionalRole {
  userId           String
  functionalRoleId String
  user User           @relation(fields: [userId],           references: [id], onDelete: Cascade)
  role FunctionalRole @relation(fields: [functionalRoleId], references: [id], onDelete: Cascade)

  @@id([userId, functionalRoleId])
  @@index([functionalRoleId])
}
```

- [ ] **Step 3: Add inverse relations on `Tenant`**

In `model Tenant { ... }`, add (alongside existing relation fields):

```prisma
  divisions      Division[]
  departments    Department[]
  teams          Team[]
  applications   Application[]
  functionalRoles FunctionalRole[]
```

- [ ] **Step 4: Validate the schema**

Run: `export $(grep -v '^#' .env.local | xargs) && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(rbac): add typed Prisma models for org tree"
```

---

## Task 2: Generate the schema migration

**Files:**
- Create: `prisma/migrations/0002_rbac_typed_tables/migration.sql`

- [ ] **Step 1: Generate the migration with Prisma**

Run: `export $(grep -v '^#' .env.local | xargs) && npx prisma migrate dev --create-only --name rbac_typed_tables`

Expected: a new directory `prisma/migrations/0002_rbac_typed_tables/` containing a `migration.sql` file with `CREATE TABLE` statements for the new models and `ALTER TABLE "User"` for the new columns. No data step yet.

- [ ] **Step 2: Inspect the generated SQL**

Run: `cat prisma/migrations/0002_rbac_typed_tables/migration.sql | head -60`
Confirm: it adds `isSuperadmin`, `level`, `divisionId`, `departmentId`, `teamId` to `User`, and creates tables `Division`, `Department`, `Team`, `Application`, `ApplicationTeam`, `FunctionalRole`, `UserFunctionalRole`.

- [ ] **Step 3: Commit the generated DDL before adding the data step**

```bash
git add prisma/migrations/0002_rbac_typed_tables/
git commit -m "feat(rbac): generate DDL migration for typed org tree"
```

---

## Task 3: Add the data migration step

**Files:**
- Modify: `prisma/migrations/0002_rbac_typed_tables/migration.sql`

- [ ] **Step 1: Append the data-copy SQL**

Append the following block to `prisma/migrations/0002_rbac_typed_tables/migration.sql`:

```sql
-- ── Backfill from Document JSON blobs ────────────────────────────────────────

-- Divisions
INSERT INTO "Division" (id, "tenantId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-division'
ON CONFLICT (id) DO NOTHING;

-- Departments (only those whose division resolved)
INSERT INTO "Department" (id, "tenantId", "divisionId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'divisionId'),
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-department'
  AND EXISTS (SELECT 1 FROM "Division" v WHERE v.id = (d.data::jsonb ->> 'divisionId'))
ON CONFLICT (id) DO NOTHING;

-- Teams
INSERT INTO "Team" (id, "tenantId", "departmentId", code, name, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'departmentId'),
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-team'
  AND EXISTS (SELECT 1 FROM "Department" p WHERE p.id = (d.data::jsonb ->> 'departmentId'))
ON CONFLICT (id) DO NOTHING;

-- Applications
INSERT INTO "Application" (id, "tenantId", code, name, criticality, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  (d.data::jsonb ->> 'criticality'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-application'
ON CONFLICT (id) DO NOTHING;

-- ApplicationTeam: include ownerTeamId, and any teams array if present
INSERT INTO "ApplicationTeam" ("applicationId", "teamId")
SELECT DISTINCT
  (d.data::jsonb ->> 'id') AS app_id,
  team_id
FROM "Document" d,
     LATERAL (
       SELECT (d.data::jsonb ->> 'ownerTeamId') AS team_id
       UNION ALL
       SELECT jsonb_array_elements_text(COALESCE(d.data::jsonb -> 'teams', '[]'::jsonb))
     ) t
WHERE d.kind = 'rbac-application'
  AND t.team_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Team" tm WHERE tm.id = t.team_id)
  AND EXISTS (SELECT 1 FROM "Application" a WHERE a.id = (d.data::jsonb ->> 'id'))
ON CONFLICT DO NOTHING;

-- FunctionalRole
INSERT INTO "FunctionalRole" (id, "tenantId", code, name, description, "createdAt", "updatedAt")
SELECT
  (d.data::jsonb ->> 'id'),
  d."tenantId",
  (d.data::jsonb ->> 'code'),
  (d.data::jsonb ->> 'name'),
  (d.data::jsonb ->> 'description'),
  d."createdAt",
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-role'
ON CONFLICT (id) DO NOTHING;

-- ── Merge rbac-user docs into User by email ──────────────────────────────────

-- Update existing real users with org fields and superadmin flag
UPDATE "User" u
SET
  "isSuperadmin" = COALESCE((d.data::jsonb ->> 'isSuperadmin')::boolean, FALSE),
  "level"        = NULLIF(d.data::jsonb ->> 'level', ''),
  "divisionId"   = NULLIF(d.data::jsonb ->> 'divisionId', ''),
  "departmentId" = NULLIF(d.data::jsonb ->> 'departmentId', ''),
  "teamId"       = NULLIF(d.data::jsonb ->> 'teamId', '')
FROM "Document" d
WHERE d.kind = 'rbac-user'
  AND (d.data::jsonb ->> 'email') = u.email;

-- Insert synthetic-only users (org-only, no passwordHash → cannot log in)
INSERT INTO "User" (id, email, name, "isSuperadmin", "level", "divisionId", "departmentId", "teamId", "createdAt")
SELECT
  (d.data::jsonb ->> 'id'),
  (d.data::jsonb ->> 'email'),
  (d.data::jsonb ->> 'name'),
  COALESCE((d.data::jsonb ->> 'isSuperadmin')::boolean, FALSE),
  NULLIF(d.data::jsonb ->> 'level', ''),
  NULLIF(d.data::jsonb ->> 'divisionId', ''),
  NULLIF(d.data::jsonb ->> 'departmentId', ''),
  NULLIF(d.data::jsonb ->> 'teamId', ''),
  d."createdAt"
FROM "Document" d
WHERE d.kind = 'rbac-user'
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.email = (d.data::jsonb ->> 'email'))
ON CONFLICT (id) DO NOTHING;

-- Functional role assignments
INSERT INTO "UserFunctionalRole" ("userId", "functionalRoleId")
SELECT
  u.id,
  fr.id
FROM "Document" d
JOIN "User" u            ON u.email = (d.data::jsonb ->> 'email')
JOIN LATERAL jsonb_array_elements_text(COALESCE(d.data::jsonb -> 'functionalRoles', '[]'::jsonb)) AS code(value) ON TRUE
JOIN "FunctionalRole" fr ON fr.code = code.value AND fr."tenantId" = d."tenantId"
WHERE d.kind = 'rbac-user'
ON CONFLICT DO NOTHING;

-- ── Drop old document rows ──────────────────────────────────────────────────
DELETE FROM "Document" WHERE kind IN ('rbac-division', 'rbac-department', 'rbac-team', 'rbac-application', 'rbac-role', 'rbac-user');
```

- [ ] **Step 2: Reset and re-apply against the dev DB**

Run: `export $(grep -v '^#' .env.local | xargs) && npx prisma migrate reset --force --skip-seed && npm run db:seed`

Expected: migration applies cleanly; seed completes with `[seed] done.`. The seed still inserts the rbac-* documents (we change that in Task 4) so the data migration's `INSERT … FROM Document` clauses fire and populate the new tables.

- [ ] **Step 3: Verify row counts**

Run:
```bash
export $(grep -v '^#' .env.local | xargs) && \
psql "$DATABASE_URL" -c 'SELECT
  (SELECT COUNT(*) FROM "Division") AS divisions,
  (SELECT COUNT(*) FROM "Department") AS departments,
  (SELECT COUNT(*) FROM "Team") AS teams,
  (SELECT COUNT(*) FROM "Application") AS applications,
  (SELECT COUNT(*) FROM "FunctionalRole") AS functional_roles,
  (SELECT COUNT(*) FROM "User") AS users,
  (SELECT "isSuperadmin" FROM "User" WHERE email = '"'"'admin@omni.local'"'"') AS admin_super,
  (SELECT COUNT(*) FROM "Document" WHERE kind LIKE '"'"'rbac-%'"'"') AS leftover_docs;'
```

Expected exactly: `divisions=4, departments=8, teams=13, applications=6, functional_roles=7, users=11, admin_super=t, leftover_docs=0`.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations/0002_rbac_typed_tables/migration.sql
git commit -m "feat(rbac): backfill typed org tables from Document blobs"
```

---

## Task 4: Update seeds to populate typed tables directly

**Files:**
- Modify: `prisma/seedDocuments.ts` (remove the six `rbac-*` doc batches)
- Modify: `prisma/seed.ts` (call new seed helper before `seedDocuments`)
- Create: section inline in `prisma/seed.ts` (no new file — keep the typed seed adjacent to existing seeds)

- [ ] **Step 1: Remove the rbac-* batches in seedDocuments.ts**

In `prisma/seedDocuments.ts`, delete the six lines `lines 644–649`:

```ts
    { kind: 'rbac-user',            items: rbacUsers },
    { kind: 'rbac-team',            items: rbacTeams },
    { kind: 'rbac-application',     items: applications },
    { kind: 'rbac-department',      items: departments },
    { kind: 'rbac-division',        items: divisions },
    { kind: 'rbac-role',            items: functionalRoles },
```

Keep the local arrays `divisions`, `departments`, `rbacTeams`, `applications`, `functionalRoles`, `rbacUsers` defined — but mark them `export` so `seed.ts` can reuse them. At the top of each `const` declaration, prefix with `export`:

```ts
export const divisions: Division[] = [ … ]
export const departments: Department[] = [ … ]
export const rbacTeams: RbacTeam[] = [ … ]
export const applications: Application[] = [ … ]
export const functionalRoles: FunctionalRole[] = [ … ]
export const rbacUsers: RbacUser[] = [ … ]
```

- [ ] **Step 2: Add typed seed function in `prisma/seed.ts`**

In `prisma/seed.ts`, near the other seed helpers, add:

```ts
import {
  divisions as RBAC_DIVISIONS,
  departments as RBAC_DEPARTMENTS,
  rbacTeams as RBAC_TEAMS,
  applications as RBAC_APPLICATIONS,
  functionalRoles as RBAC_FUNCTIONAL_ROLES,
  rbacUsers as RBAC_USERS,
} from './seedDocuments';

async function seedRbacOrg(prisma: PrismaClient, tenantId: string) {
  console.log('[seed] rbac org tree…');

  for (const d of RBAC_DIVISIONS) {
    await prisma.division.upsert({
      where: { id: d.id },
      create: { id: d.id, tenantId, code: d.code, name: d.name },
      update: { code: d.code, name: d.name },
    });
  }
  for (const d of RBAC_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { id: d.id },
      create: { id: d.id, tenantId, divisionId: d.divisionId, code: d.code, name: d.name },
      update: { divisionId: d.divisionId, code: d.code, name: d.name },
    });
  }
  for (const t of RBAC_TEAMS) {
    await prisma.team.upsert({
      where: { id: t.id },
      create: { id: t.id, tenantId, departmentId: t.departmentId, code: t.code, name: t.name },
      update: { departmentId: t.departmentId, code: t.code, name: t.name },
    });
  }
  for (const a of RBAC_APPLICATIONS) {
    await prisma.application.upsert({
      where: { id: a.id },
      create: { id: a.id, tenantId, code: a.code, name: a.name },
      update: { code: a.code, name: a.name },
    });
    if (a.ownerTeamId) {
      await prisma.applicationTeam.upsert({
        where: { applicationId_teamId: { applicationId: a.id, teamId: a.ownerTeamId } },
        create: { applicationId: a.id, teamId: a.ownerTeamId },
        update: {},
      });
    }
  }
  for (const r of RBAC_FUNCTIONAL_ROLES) {
    await prisma.functionalRole.upsert({
      where: { id: r.id },
      create: { id: r.id, tenantId, code: r.code, name: r.name, description: r.description ?? null },
      update: { code: r.code, name: r.name, description: r.description ?? null },
    });
  }
  for (const u of RBAC_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isSuperadmin: u.isSuperadmin,
          level: u.level ?? null,
          divisionId: u.divisionId ?? null,
          departmentId: u.departmentId ?? null,
          teamId: u.teamId ?? null,
        },
      });
      await prisma.userFunctionalRole.deleteMany({ where: { userId: existing.id } });
      for (const code of u.functionalRoles) {
        const fr = await prisma.functionalRole.findFirst({ where: { tenantId, code } });
        if (fr) {
          await prisma.userFunctionalRole.create({ data: { userId: existing.id, functionalRoleId: fr.id } });
        }
      }
    } else {
      const created = await prisma.user.create({
        data: {
          id: u.id, email: u.email, name: u.name,
          isSuperadmin: u.isSuperadmin,
          level: u.level ?? null,
          divisionId: u.divisionId ?? null,
          departmentId: u.departmentId ?? null,
          teamId: u.teamId ?? null,
        },
      });
      for (const code of u.functionalRoles) {
        const fr = await prisma.functionalRole.findFirst({ where: { tenantId, code } });
        if (fr) {
          await prisma.userFunctionalRole.create({ data: { userId: created.id, functionalRoleId: fr.id } });
        }
      }
    }
  }
}
```

- [ ] **Step 3: Wire `seedRbacOrg` into the main seed flow**

In `prisma/seed.ts`, after the existing `await seedUsers(...)` call (or wherever the demo users are upserted) and **before** `await seedDocuments(prisma, TENANT.id)`, add:

```ts
  await seedRbacOrg(prisma, TENANT.id);
```

- [ ] **Step 4: Reset DB and verify seed populates everything from typed code path**

Run:
```bash
export $(grep -v '^#' .env.local | xargs) && \
npx prisma migrate reset --force --skip-seed && \
npm run db:seed && \
psql "$DATABASE_URL" -c 'SELECT (SELECT COUNT(*) FROM "Division") d, (SELECT COUNT(*) FROM "Department") p, (SELECT COUNT(*) FROM "Team") t, (SELECT COUNT(*) FROM "Application") a, (SELECT COUNT(*) FROM "FunctionalRole") fr, (SELECT COUNT(*) FROM "User") u, (SELECT COUNT(*) FROM "UserFunctionalRole") ufr, (SELECT COUNT(*) FROM "Document" WHERE kind LIKE '"'"'rbac-%'"'"') leftover;'
```

Expected: `d=4, p=8, t=13, a=6, fr=7, u=11, ufr>0, leftover=0`.

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts prisma/seedDocuments.ts
git commit -m "feat(rbac): seed typed org tables directly, drop rbac-* documents"
```

---

## Task 5: Add Zod validation schemas

**Files:**
- Create: `server/lib/validation/rbac.ts`

- [ ] **Step 1: Write the validation schemas**

Create `server/lib/validation/rbac.ts`:

```ts
import { z } from 'zod';

const idSlug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);

export const divisionSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const departmentSchema = z.object({
  id: idSlug.optional(),
  divisionId: idSlug,
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const teamSchema = z.object({
  id: idSlug.optional(),
  departmentId: idSlug,
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
});

export const applicationSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).nullable().optional(),
  ownerTeamId: idSlug.nullable().optional(),
  teams: z.array(idSlug).optional(),
});

export const functionalRoleSchema = z.object({
  id: idSlug.optional(),
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

export const rbacUserSchema = z.object({
  id: idSlug.optional(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  isSuperadmin: z.boolean().default(false),
  level: z.enum(['group_head', 'dept_head', 'team_lead', 'officer', 'requester']).nullable().optional(),
  divisionId: idSlug.nullable().optional(),
  departmentId: idSlug.nullable().optional(),
  teamId: idSlug.nullable().optional(),
  functionalRoles: z.array(idSlug).default([]),
});

export type DivisionInput = z.infer<typeof divisionSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type FunctionalRoleInput = z.infer<typeof functionalRoleSchema>;
export type RbacUserInput = z.infer<typeof rbacUserSchema>;
```

- [ ] **Step 2: Compile-check**

Run: `npm run lint`
Expected: passes (or only pre-existing failures unrelated to this file).

- [ ] **Step 3: Commit**

```bash
git add server/lib/validation/rbac.ts
git commit -m "feat(rbac): zod schemas for org-tree CRUD payloads"
```

---

## Task 6: Add the typed `rbacOrg` repository

**Files:**
- Create: `server/repositories/rbacOrg.ts`

- [ ] **Step 1: Write the repository**

Create `server/repositories/rbacOrg.ts`:

```ts
import { prisma } from '../db';
import type {
  DivisionInput, DepartmentInput, TeamInput, ApplicationInput,
  FunctionalRoleInput, RbacUserInput,
} from '../lib/validation/rbac';

// ── Reads ────────────────────────────────────────────────────────────────────

export async function listDivisions(tenantId: string) {
  return prisma.division.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
}

export async function listDepartments(tenantId: string) {
  return prisma.department.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, divisionId: true, code: true, name: true },
  });
}

export async function listTeams(tenantId: string) {
  return prisma.team.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, departmentId: true, code: true, name: true },
  });
}

export async function listApplications(tenantId: string) {
  const apps = await prisma.application.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    include: { teams: { select: { teamId: true } } },
  });
  return apps.map(a => ({
    id: a.id,
    code: a.code,
    name: a.name,
    criticality: a.criticality,
    ownerTeamId: a.teams[0]?.teamId ?? null,
    teams: a.teams.map(t => t.teamId),
  }));
}

export async function listFunctionalRoles(tenantId: string) {
  return prisma.functionalRole.findMany({
    where: { tenantId },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, description: true },
  });
}

export async function listRbacUsers(tenantId: string) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { isSuperadmin: true },
        { divisionId: { not: null } },
        { departmentId: { not: null } },
        { teamId: { not: null } },
        { functionalRoles: { some: {} } },
      ],
    },
    select: {
      id: true, email: true, name: true,
      isSuperadmin: true, level: true,
      divisionId: true, departmentId: true, teamId: true,
      functionalRoles: { select: { role: { select: { code: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isSuperadmin: u.isSuperadmin,
    level: u.level,
    divisionId: u.divisionId,
    departmentId: u.departmentId,
    teamId: u.teamId,
    functionalRoles: u.functionalRoles.map(f => f.role.code),
    active: true,
  }));
  void tenantId; // tenantId reserved for future multi-tenant filtering on User
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function upsertDivision(tenantId: string, id: string, input: DivisionInput) {
  return prisma.division.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name },
    update: { code: input.code, name: input.name },
  });
}

export async function deleteDivision(id: string) {
  await prisma.division.delete({ where: { id } });
}

export async function upsertDepartment(tenantId: string, id: string, input: DepartmentInput) {
  const div = await prisma.division.findFirst({ where: { id: input.divisionId, tenantId } });
  if (!div) throw new Error('Unknown divisionId');
  return prisma.department.upsert({
    where: { id },
    create: { id, tenantId, divisionId: input.divisionId, code: input.code, name: input.name },
    update: { divisionId: input.divisionId, code: input.code, name: input.name },
  });
}

export async function deleteDepartment(id: string) {
  await prisma.department.delete({ where: { id } });
}

export async function upsertTeam(tenantId: string, id: string, input: TeamInput) {
  const dept = await prisma.department.findFirst({ where: { id: input.departmentId, tenantId } });
  if (!dept) throw new Error('Unknown departmentId');
  return prisma.team.upsert({
    where: { id },
    create: { id, tenantId, departmentId: input.departmentId, code: input.code, name: input.name },
    update: { departmentId: input.departmentId, code: input.code, name: input.name },
  });
}

export async function deleteTeam(id: string) {
  await prisma.team.delete({ where: { id } });
}

export async function upsertApplication(tenantId: string, id: string, input: ApplicationInput) {
  return prisma.$transaction(async (tx) => {
    await tx.application.upsert({
      where: { id },
      create: { id, tenantId, code: input.code, name: input.name, criticality: input.criticality ?? null },
      update: { code: input.code, name: input.name, criticality: input.criticality ?? null },
    });
    const desiredTeams = new Set<string>([
      ...(input.ownerTeamId ? [input.ownerTeamId] : []),
      ...(input.teams ?? []),
    ]);
    for (const teamId of desiredTeams) {
      const team = await tx.team.findFirst({ where: { id: teamId, tenantId } });
      if (!team) throw new Error(`Unknown teamId: ${teamId}`);
    }
    await tx.applicationTeam.deleteMany({ where: { applicationId: id } });
    for (const teamId of desiredTeams) {
      await tx.applicationTeam.create({ data: { applicationId: id, teamId } });
    }
    return id;
  });
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({ where: { id } });
}

export async function upsertFunctionalRole(tenantId: string, id: string, input: FunctionalRoleInput) {
  return prisma.functionalRole.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name, description: input.description ?? null },
    update: { code: input.code, name: input.name, description: input.description ?? null },
  });
}

export async function deleteFunctionalRole(id: string) {
  await prisma.functionalRole.delete({ where: { id } });
}

export async function upsertRbacUser(tenantId: string, id: string, input: RbacUserInput) {
  return prisma.$transaction(async (tx) => {
    const existingByEmail = await tx.user.findUnique({ where: { email: input.email } });
    if (existingByEmail && existingByEmail.id !== id) {
      throw new Error('Email already in use by another user');
    }
    const user = await tx.user.upsert({
      where: { id },
      create: {
        id, email: input.email, name: input.name,
        isSuperadmin: input.isSuperadmin,
        level: input.level ?? null,
        divisionId: input.divisionId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
      },
      update: {
        email: input.email, name: input.name,
        isSuperadmin: input.isSuperadmin,
        level: input.level ?? null,
        divisionId: input.divisionId ?? null,
        departmentId: input.departmentId ?? null,
        teamId: input.teamId ?? null,
      },
    });
    await tx.userFunctionalRole.deleteMany({ where: { userId: user.id } });
    for (const code of input.functionalRoles) {
      const fr = await tx.functionalRole.findFirst({ where: { tenantId, code } });
      if (!fr) throw new Error(`Unknown functional role code: ${code}`);
      await tx.userFunctionalRole.create({ data: { userId: user.id, functionalRoleId: fr.id } });
    }
    return user;
  });
}

export async function deleteRbacUser(id: string) {
  await prisma.user.delete({ where: { id } });
}
```

- [ ] **Step 2: Compile-check**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add server/repositories/rbacOrg.ts
git commit -m "feat(rbac): typed repository for org-tree CRUD"
```

---

## Task 7: Rewrite `/rbac/*` GETs as typed reads

**Files:**
- Modify: `server/routes/platform.ts` (lines 139–144)

- [ ] **Step 1: Replace the document-backed handlers**

Open `server/routes/platform.ts`. At the top, add the import:

```ts
import {
  listDivisions, listDepartments, listTeams,
  listApplications, listFunctionalRoles, listRbacUsers,
} from '../repositories/rbacOrg';
```

Replace lines 139–144 (the six `platformRouter.get('/rbac/…')` handlers) with:

```ts
platformRouter.get('/rbac/users',        asyncHandler(async (req, res) => res.json(await listRbacUsers(req.tenantId))));
platformRouter.get('/rbac/teams',        asyncHandler(async (req, res) => res.json(await listTeams(req.tenantId))));
platformRouter.get('/rbac/applications', asyncHandler(async (req, res) => res.json(await listApplications(req.tenantId))));
platformRouter.get('/rbac/departments',  asyncHandler(async (req, res) => res.json(await listDepartments(req.tenantId))));
platformRouter.get('/rbac/divisions',    asyncHandler(async (req, res) => res.json(await listDivisions(req.tenantId))));
platformRouter.get('/rbac/roles',        asyncHandler(async (req, res) => res.json(await listFunctionalRoles(req.tenantId))));
```

- [ ] **Step 2: Smoke-test against the running dev server**

Restart the server (kill the existing `npm run dev:all` and start it again, or rely on `tsx watch`).

Run:
```bash
curl -s -c /tmp/c.txt -b /tmp/c.txt -X POST http://localhost:3001/api/v1/auth/login -H 'content-type: application/json' -d '{"email":"admin@omni.local","password":"demo"}' >/dev/null && \
for ep in divisions departments teams applications roles users; do
  printf "%-13s " "$ep"; curl -s -b /tmp/c.txt http://localhost:3001/api/v1/rbac/$ep | jq 'length';
done
```

Expected output:
```
divisions     4
departments   8
teams         13
applications  6
roles         7
users         11
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/platform.ts
git commit -m "feat(rbac): route /rbac/* GETs to typed repository"
```

---

## Task 8: Replace `/admin/rbac/:entity/:id` with typed PUT/DELETE handlers

**Files:**
- Modify: `server/routes/admin.ts` (lines 244–270 — remove the generic `RBAC_ENTITY_MAP` block; replace with per-entity handlers)

- [ ] **Step 1: Add imports at the top of `server/routes/admin.ts`**

Add:

```ts
import {
  upsertDivision, deleteDivision,
  upsertDepartment, deleteDepartment,
  upsertTeam, deleteTeam,
  upsertApplication, deleteApplication,
  upsertFunctionalRole, deleteFunctionalRole,
  upsertRbacUser, deleteRbacUser,
} from '../repositories/rbacOrg';
import {
  divisionSchema, departmentSchema, teamSchema,
  applicationSchema, functionalRoleSchema, rbacUserSchema,
} from '../lib/validation/rbac';
```

- [ ] **Step 2: Delete the generic handlers (lines 244–270)**

Remove the entire block starting with the `// ── RBAC: document-backed org tree …` comment through the end of `adminRouter.delete('/admin/rbac/:entity/:id', …`.

- [ ] **Step 3: Add the typed handlers in their place**

Insert this block where the generic handlers used to live:

```ts
// ── RBAC org tree: typed CRUD per entity ─────────────────────────────────────

adminRouter.put('/admin/rbac/divisions/:id', asyncHandler(async (req, res) => {
  const input = divisionSchema.parse(req.body);
  const row = await upsertDivision(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'division', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/divisions/:id', asyncHandler(async (req, res) => {
  await deleteDivision(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'division', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/departments/:id', asyncHandler(async (req, res) => {
  const input = departmentSchema.parse(req.body);
  const row = await upsertDepartment(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'department', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/departments/:id', asyncHandler(async (req, res) => {
  await deleteDepartment(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'department', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/teams/:id', asyncHandler(async (req, res) => {
  const input = teamSchema.parse(req.body);
  const row = await upsertTeam(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'team', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/teams/:id', asyncHandler(async (req, res) => {
  await deleteTeam(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'team', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/applications/:id', asyncHandler(async (req, res) => {
  const input = applicationSchema.parse(req.body);
  await upsertApplication(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'application', resourceId: req.params.id, after: input });
  res.json({ id: req.params.id, ...input });
}));
adminRouter.delete('/admin/rbac/applications/:id', asyncHandler(async (req, res) => {
  await deleteApplication(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'application', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/roles/:id', asyncHandler(async (req, res) => {
  const input = functionalRoleSchema.parse(req.body);
  const row = await upsertFunctionalRole(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'functional-role', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/roles/:id', asyncHandler(async (req, res) => {
  await deleteFunctionalRole(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'functional-role', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/users/:id', asyncHandler(async (req, res) => {
  const input = rbacUserSchema.parse(req.body);
  const row = await upsertRbacUser(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'user', resourceId: row.id, after: { ...row, passwordHash: undefined } });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/users/:id', asyncHandler(async (req, res) => {
  await deleteRbacUser(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'user', resourceId: req.params.id });
  res.status(204).end();
}));
```

- [ ] **Step 4: Smoke-test write path**

Restart server, then:

```bash
# Login and capture cookie
curl -s -c /tmp/c.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@omni.local","password":"demo"}' >/dev/null

# Create a new division
curl -s -b /tmp/c.txt -X PUT http://localhost:3001/api/v1/admin/rbac/divisions/div-test \
  -H 'content-type: application/json' \
  -d '{"code":"TEST","name":"Test Division"}'

# Read it back
curl -s -b /tmp/c.txt http://localhost:3001/api/v1/rbac/divisions | jq '.[] | select(.id=="div-test")'

# Delete it
curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/c.txt -X DELETE http://localhost:3001/api/v1/admin/rbac/divisions/div-test
```

Expected: division row returned with `id: "div-test"`, then a `204` from DELETE.

- [ ] **Step 5: Commit**

```bash
git add server/routes/admin.ts
git commit -m "feat(rbac): typed CRUD endpoints for org-tree entities"
```

---

## Task 9: Integration tests for the rbacOrg repository

**Files:**
- Create: `server/__tests__/rbacOrg.test.ts`

- [ ] **Step 1: Write the test file**

Create `server/__tests__/rbacOrg.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../db';
import {
  listDivisions, listDepartments, listTeams,
  listApplications, listFunctionalRoles, listRbacUsers,
  upsertDivision, deleteDivision,
  upsertDepartment, upsertTeam,
  upsertApplication,
  upsertRbacUser,
} from '../repositories/rbacOrg';

const TENANT = 'tenant-demo';

describe('rbacOrg repository (against seeded dev DB)', () => {
  beforeAll(async () => {
    // Ensure seed has run; tests assume the canonical seeded fixture.
    const divs = await prisma.division.count({ where: { tenantId: TENANT } });
    if (divs === 0) {
      throw new Error('Seed missing. Run `npm run db:seed` before tests.');
    }
  });

  it('lists the seeded org tree at expected sizes', async () => {
    expect((await listDivisions(TENANT)).length).toBe(4);
    expect((await listDepartments(TENANT)).length).toBe(8);
    expect((await listTeams(TENANT)).length).toBe(13);
    expect((await listApplications(TENANT)).length).toBe(6);
    expect((await listFunctionalRoles(TENANT)).length).toBe(7);
    expect((await listRbacUsers(TENANT)).length).toBe(11);
  });

  it('marks admin@omni.local as superadmin', async () => {
    const users = await listRbacUsers(TENANT);
    const admin = users.find(u => u.email === 'admin@omni.local');
    expect(admin?.isSuperadmin).toBe(true);
  });

  it('round-trips a Division upsert/delete', async () => {
    await upsertDivision(TENANT, 'div-x', { code: 'X', name: 'X Division' });
    const after = await listDivisions(TENANT);
    expect(after.find(d => d.id === 'div-x')?.name).toBe('X Division');

    await upsertDivision(TENANT, 'div-x', { code: 'X', name: 'X Renamed' });
    const renamed = await listDivisions(TENANT);
    expect(renamed.find(d => d.id === 'div-x')?.name).toBe('X Renamed');

    await deleteDivision('div-x');
    const removed = await listDivisions(TENANT);
    expect(removed.find(d => d.id === 'div-x')).toBeUndefined();
  });

  it('rejects a Department whose divisionId does not exist', async () => {
    await expect(
      upsertDepartment(TENANT, 'dept-bad', { divisionId: 'div-nope', code: 'BAD', name: 'Bad' })
    ).rejects.toThrow(/Unknown divisionId/);
  });

  it('rejects a Team whose departmentId does not exist', async () => {
    await expect(
      upsertTeam(TENANT, 'team-bad', { departmentId: 'dept-nope', code: 'BAD', name: 'Bad' })
    ).rejects.toThrow(/Unknown departmentId/);
  });

  it('replaces application team links on upsert', async () => {
    await upsertApplication(TENANT, 'app-loan', {
      code: 'LOAN',
      name: 'Loan Origination System',
      teams: ['team-core-loan', 'team-core-deposit'],
    });
    const apps = await listApplications(TENANT);
    const loan = apps.find(a => a.id === 'app-loan');
    expect(loan?.teams.sort()).toEqual(['team-core-deposit', 'team-core-loan']);

    // restore single-team mapping
    await upsertApplication(TENANT, 'app-loan', {
      code: 'LOAN',
      name: 'Loan Origination System',
      teams: ['team-core-loan'],
    });
  });

  it('upserts a synthetic-only user merged by email', async () => {
    await upsertRbacUser(TENANT, 'u-test-merge', {
      email: 'admin@omni.local',
      name: 'Super Admin',
      isSuperadmin: true,
      functionalRoles: [],
    });
    const admin = await prisma.user.findUnique({ where: { email: 'admin@omni.local' } });
    expect(admin?.isSuperadmin).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `export $(grep -v '^#' .env.local | xargs) && npm test -- rbacOrg`
Expected: all 7 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/__tests__/rbacOrg.test.ts
git commit -m "test(rbac): integration coverage for typed org repository"
```

---

## Task 10: Fix the sidebar gate to use session permissions

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (line 235)

- [ ] **Step 1: Import the auth session hook at the top**

Find the existing imports in `src/components/layout/Sidebar.tsx`. Add (if not already present):

```ts
import { useAuthSession } from '@/src/lib/auth/session';
```

- [ ] **Step 2: Use the session permission as the gate**

Inside the `Sidebar` component, where `user` is destructured from `useCurrentUser()`, add a sibling line:

```ts
  const session = useAuthSession();
  const isAdmin = !!session?.permissions.includes('system.admin');
```

Replace line 235:

```tsx
                {user?.isSuperadmin && (
```

with:

```tsx
                {isAdmin && (
```

- [ ] **Step 3: Verify the dev server**

Reload the browser at http://localhost:3000/ after logging in as `admin@omni.local`. The RBAC Admin link must appear in the sidebar footer immediately on first paint (no need to wait for `/rbac/users`).

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "fix(sidebar): gate RBAC Admin link on session permission to avoid first-paint race"
```

---

## Task 11: Switch persona default from `u-super` to the logged-in user

**Files:**
- Modify: `src/lib/rbac/CurrentUserContext.tsx` (around line 99)

- [ ] **Step 1: Import the session hook**

At the top of `src/lib/rbac/CurrentUserContext.tsx`, add:

```ts
import { useAuthSession } from '@/src/lib/auth/session';
```

- [ ] **Step 2: Read it inside the provider**

Inside `CurrentUserProvider`, near the existing `useState` calls, add:

```ts
  const session = useAuthSession();
  const sessionUserId = session?.user.id ?? null;
```

- [ ] **Step 3: Change the persona default lookup**

Replace the existing default-id logic (currently around line 99):

```ts
      return localStorage.getItem(STORAGE_KEY) || 'u-super';
```

with:

```ts
      return localStorage.getItem(STORAGE_KEY) || sessionUserId || '';
```

- [ ] **Step 4: Add a fallback effect so persona always resolves to a real user**

Below the existing `useEffect` that persists `currentUserId` to localStorage, add:

```ts
  useEffect(() => {
    if (users.length === 0) return;
    const resolved = users.find(u => u.id === currentUserId);
    if (resolved) return;
    const fromSession = sessionUserId ? users.find(u => u.id === sessionUserId) : null;
    const fallback = fromSession ?? users[0];
    if (fallback && fallback.id !== currentUserId) {
      setCurrentUserId(fallback.id);
    }
  }, [users, currentUserId, sessionUserId]);
```

- [ ] **Step 5: Verify in the browser**

Clear localStorage (`localStorage.removeItem('ois.rbac.currentUserId')`), reload, log in as `admin@omni.local`. The top-bar persona must show "Super Admin · Superadmin" without any manual switching.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rbac/CurrentUserContext.tsx
git commit -m "fix(rbac): persona defaults to logged-in user instead of hard-coded u-super"
```

---

## Task 12: End-to-end verification

**Files:** none modified — verification only.

- [ ] **Step 1: Full reset and reseed**

```bash
export $(grep -v '^#' .env.local | xargs) && \
npx prisma migrate reset --force --skip-seed && \
npm run db:seed
```

Expected: ends with `[seed] done.`

- [ ] **Step 2: Restart dev stack and confirm no console errors**

In a fresh terminal: `npm run dev:all`. Then load http://localhost:3000, log in as `admin@omni.local` / `demo`.

Expected:
- Topbar persona shows "Super Admin · Superadmin".
- "RBAC Admin" link is present in sidebar footer on first paint.
- `/admin`, `/admin/divisions`, `/admin/departments`, `/admin/teams`, `/admin/applications`, `/admin/roles`, `/admin/users` all render with their expected row counts (4/8/13/6/7/11).

- [ ] **Step 3: UI CRUD smoke test**

In the browser at `/admin/divisions`:
1. Click "Add Division" (or equivalent), submit `code=TEST`, `name=Test Division`.
2. Reload the page. The new row appears.
3. Edit it to `name=Test Renamed`. Reload. The change persists.
4. Delete it. Reload. The row is gone.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: every existing suite passes plus the new `rbacOrg` tests.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: passes.

- [ ] **Step 6: Final commit if any incidental fixes were needed during verification**

If anything required a tweak during Steps 1–5, fix it inline and commit with a clear message. Otherwise this task is just verification with no commit.

---

## Summary

12 tasks, each commit-sized. The migration in Task 3 is the critical one — it both creates schema and backfills data atomically so the dev DB stays consistent. Tasks 7–8 swap the server reads/writes onto the typed surface without changing URL contracts, so the frontend keeps working through the cutover. Tasks 10–11 fix the latent persona/sidebar bugs that the original audit surfaced. Task 9 locks in repository behavior with integration tests against the real seeded fixture.
