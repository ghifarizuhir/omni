# RBAC Typed Tables — Design

**Date:** 2026-05-15
**Status:** Approved — ready for implementation planning

## Problem

The RBAC org tree (divisions, departments, teams, applications, functional roles, users) is persisted as opaque JSON blobs in the generic `Document` table (kinds `rbac-division`, `rbac-department`, `rbac-team`, `rbac-application`, `rbac-role`, `rbac-user`). This creates two parallel identity spaces:

- **Real users** in `User` (5 seeded rows; backs login, session, and permission checks). Has no `isSuperadmin` flag or org links.
- **Synthetic users** in `Document` kind `rbac-user` (11 seeded rows including `u-super`). Backs the persona switcher, the `/rbac/*` reads, and the superadmin gating used by the sidebar and `AdminLayout`.

Consequences:

- `admin@omni.local` logs in as the real user, but the UI's "Superadmin" badge comes from the synthetic `u-super` record. The two are linked only by email and only by convention.
- Admin RBAC pages technically write back to `Document` (`PUT/DELETE /admin/rbac/:entity/:id`), but with no FKs, no CREATE endpoint, no per-entity validation, and no referential integrity. "Configure via UI" is fragile.
- The `Sidebar` RBAC link is gated on `user.isSuperadmin` from the persona context, which fetches asynchronously; on first paint after login the link is missing until `/rbac/users` resolves.

## Goal

Promote the RBAC org tree to typed Prisma tables with proper foreign keys. Merge the two identity spaces into the `User` table. Make admin CRUD a first-class API surface that the UI uses to read and mutate the org tree.

## Non-Goals

- Merging `Role` (permission-bearing system role) with `FunctionalRole` (HR-style label like "CAB member"). They stay distinct.
- Changes to the auth/login flow or `Session` model.
- Changes to the `AuditLog` schema.
- Changes to the RBAC engine evaluation logic (`src/lib/rbac/engine.ts`).
- Changes to the `Permission` / `Role` / `RolePermission` / `MembershipRole` tables.

## Schema

Add the following models to `prisma/schema.prisma`. IDs are kept as stable string slugs (`div-aps`, `team-ch-mobile`, etc.) so existing seed references and code that hardcodes IDs continue to work.

```prisma
model User {
  // existing fields preserved
  isSuperadmin Boolean @default(false)
  level        String?              // "group_head" | "dept_head" | "team_lead" | "officer" | "requester"

  divisionId   String?
  departmentId String?
  teamId       String?

  division     Division?   @relation(fields: [divisionId],   references: [id], onDelete: SetNull)
  department   Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  team         Team?       @relation(fields: [teamId],       references: [id], onDelete: SetNull)

  functionalRoles UserFunctionalRole[]
}

model Division {
  id        String   @id
  tenantId  String
  code      String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  departments Department[]
  users     User[]
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
  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  division   Division @relation(fields: [divisionId], references: [id], onDelete: Cascade)
  teams      Team[]
  users      User[]
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
  tenant       Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  users        User[]
  applications ApplicationTeam[]
  @@unique([tenantId, code])
  @@index([departmentId])
}

model Application {
  id          String   @id
  tenantId    String
  code        String
  name        String
  criticality String?  // "critical" | "high" | "medium" | "low"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  teams       ApplicationTeam[]
  @@unique([tenantId, code])
}

model ApplicationTeam {
  applicationId String
  teamId        String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  team          Team        @relation(fields: [teamId],        references: [id], onDelete: Cascade)
  @@id([applicationId, teamId])
}

model FunctionalRole {
  id          String   @id           // "cab_member", "change_manager", ...
  tenantId    String
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  users       UserFunctionalRole[]
  @@unique([tenantId, id])
}

model UserFunctionalRole {
  userId           String
  functionalRoleId String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  role             FunctionalRole @relation(fields: [functionalRoleId], references: [id], onDelete: Cascade)
  @@id([userId, functionalRoleId])
}
```

## Data Migration

A single Prisma migration that performs both schema changes and the data copy. Schema changes via Prisma DDL; data copy via a `prisma.$executeRawUnsafe` block (or, if logic gets complex, a follow-up `tsx prisma/migrate-rbac.ts` script that runs immediately after `prisma migrate dev`).

Order:

1. Create new tables and add the new `User` columns.
2. For each tenant, read `Document` rows where `kind LIKE 'rbac-%'`, parse `data` as JSON.
3. Insert in dependency order:
   - `Division` ← `rbac-division`
   - `Department` ← `rbac-department` (skip rows whose `divisionId` doesn't resolve; log warning)
   - `Team` ← `rbac-team` (skip rows whose `departmentId` doesn't resolve)
   - `Application` ← `rbac-application`
   - `ApplicationTeam` from each application doc's `teams: string[]`
   - `FunctionalRole` ← `rbac-role`
4. **Merge `rbac-user` into `User`** by email:
   - If an existing `User` row matches by email → UPDATE: set `isSuperadmin`, `level`, `divisionId`, `departmentId`, `teamId`; replace `UserFunctionalRole` rows.
   - Else INSERT a new `User` row with no `passwordHash` (cannot log in; org-only).
5. Delete all `Document` rows with `kind LIKE 'rbac-%'`.

The migration is idempotent: re-running on already-migrated data is a no-op because the source `Document` rows are gone.

`prisma/seed.ts` and `prisma/seedDocuments.ts` are updated to seed the new typed tables directly rather than `Document` rows of `rbac-*` kinds. The remainder of `seedDocuments.ts` (non-RBAC kinds) is untouched.

## API Surface

### Reads (unchanged response shapes)

Existing endpoints under `server/routes/platform.ts`:

| Verb | Path | Source after migration |
|---|---|---|
| GET | `/rbac/divisions`     | `Division`       |
| GET | `/rbac/departments`   | `Department`     |
| GET | `/rbac/teams`         | `Team`           |
| GET | `/rbac/applications`  | `Application` (with `teams: string[]` from `ApplicationTeam`) |
| GET | `/rbac/roles`         | `FunctionalRole` |
| GET | `/rbac/users`         | `User` (only org-linked or superadmin users, projected to the `RbacUser` shape) |

Response shapes match the current `RbacUser`, `Division`, etc. in `src/types/rbac.ts`. The `id`-as-slug convention is preserved; the synthetic `u-super` is gone, replaced by `admin@omni.local`'s real `User.id`.

### Writes (replace `PUT/DELETE /admin/rbac/:entity/:id`)

Typed CRUD per entity on `server/routes/admin.ts`:

| Verb | Path | Body |
|---|---|---|
| POST   | `/admin/divisions`        | `{ id?, code, name }` |
| PATCH  | `/admin/divisions/:id`    | `{ code?, name? }` |
| DELETE | `/admin/divisions/:id`    | — |
| POST   | `/admin/departments`      | `{ id?, divisionId, code, name }` |
| PATCH  | `/admin/departments/:id`  | partial |
| DELETE | `/admin/departments/:id`  | — |
| POST   | `/admin/teams`            | `{ id?, departmentId, code, name }` |
| PATCH  | `/admin/teams/:id`        | partial |
| DELETE | `/admin/teams/:id`        | — |
| POST   | `/admin/applications`     | `{ id?, code, name, criticality?, teams: string[] }` |
| PATCH  | `/admin/applications/:id` | partial; `teams` (if present) replaces `ApplicationTeam` rows |
| DELETE | `/admin/applications/:id` | — |
| POST   | `/admin/functional-roles` | `{ id, name, description? }` |
| PATCH  | `/admin/functional-roles/:id` | partial |
| DELETE | `/admin/functional-roles/:id` | — |
| PATCH  | `/admin/users/:id`        | extend existing body: `{ isSuperadmin?, divisionId?, departmentId?, teamId?, level?, functionalRoles?: string[] }` |

Each controller:

- Validates payload with Zod (per-entity schemas in `server/lib/validation/rbac.ts`).
- Verifies FK targets exist within the same tenant before insert/update.
- Wraps mutations in a Prisma transaction.
- Emits an audit log entry via the existing `audit()` helper.
- Requires `system.admin` (already enforced for `/admin/*`).

The legacy `PUT/DELETE /admin/rbac/:entity/:id` routes are removed.

## Frontend Changes

- `src/lib/rbac/CurrentUserContext.tsx`: drop the hard-coded `'u-super'` default. Initial persona = the logged-in user's id (from `auth/me`). LocalStorage still overrides; if the stored id is missing from the user list, fall back to the logged-in user.
- `src/components/layout/Sidebar.tsx:235`: gate the RBAC link on `session.permissions.includes('system.admin')` instead of `user?.isSuperadmin`. Eliminates the first-paint race. The persona-switcher icon continues to use `user.isSuperadmin`.
- `src/services/platformServices.ts`: add `create*` methods (currently only `upsert*` and `delete*`); wire `Admin{Divisions,Departments,Teams,Applications,Roles,Users}.tsx` "Add" buttons to the new POST endpoints.
- No response-shape changes — `src/types/rbac.ts` interfaces stay identical.

## Testing

- **Unit (vitest):** Zod schemas for each CRUD payload — happy path plus rejection cases (missing required fields, unknown FK, bad enum value).
- **Integration (vitest against a Postgres test container):** run the migration on a freshly seeded DB, then assert:
  - 4 divisions, 8 departments, 13 teams, 6 applications survived.
  - 11 `User` rows total: the 5 existing real users updated in place with org links (`admin`, `andi`, `fitri`, `hadi`, `joko`) plus 6 new rows for the synthetic-only personas (`budi`, `citra`, `dewi`, `eko`, `gunawan`, `indah`) inserted without a `passwordHash`.
  - `admin@omni.local` has `isSuperadmin = true`.
  - All FKs hold (no orphan departments, teams, or `UserFunctionalRole` rows).
  - No `Document` rows of `kind LIKE 'rbac-%'` remain.
- **Manual via Playwright:** log in as `admin@omni.local`, create a Division through `/admin/divisions`, reload, confirm it appears; then delete it and confirm cascade behavior on dependents (Department dropdowns).

## Risks and Open Items

- **Backfill collisions:** if a synthetic `rbac-user` and a real `User` share an email but disagree on `name`, the migration prefers the real row's name and warns. No other field conflicts since the real `User` has no org columns today.
- **Frontend code paths referencing `u-super` literally:** there are none currently outside `seedDocuments.ts` and the persona default; verified before implementation.
- **Concurrent edits during migration:** the migration runs offline (standard `prisma migrate deploy`); no production-traffic considerations at this stage.
