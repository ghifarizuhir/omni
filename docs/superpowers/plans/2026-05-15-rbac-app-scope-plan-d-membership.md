# RBAC × App Scope — Plan D: Application Membership Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PlatformAdmins and Application Owners a proper UI + API to manage which Teams belong to which Application and at what role (`OWNER` / `CONTRIBUTOR` / `VIEWER`), with hard integrity rules (≥1 OWNER per app, safe team removal). Plus a read-only catalog so any user can discover apps they're not in.

**Architecture:** Backend gains fine-grained membership endpoints under `/api/v1/admin/applications/:appId/teams` (add, change role, remove). Authorization gate: PlatformAdmin OR a user whose Team holds `OWNER` for this app. Server enforces ≥1 OWNER invariant on every mutation. The existing `upsertApplication` is split — application *metadata* (name/code/criticality) keeps its current PUT endpoint, but membership is now a separate concern. New React page at `/admin/applications/:appId` shows membership panel; new public route `/admin/applications/catalog` shows the read-only "browse all apps in this tenant" view for non-admins.

**Tech Stack:** Express 4, Prisma 5, TypeScript, Vitest + supertest, React 19 (existing admin shell).

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md) §9.

**Depends on:** Plan C (`f588ce2`).

**Out of scope:**
- AppAccessRequest workflow (Q6-C) — deferred to a later plan.
- Time-bound membership ("access for 7 days") — nice-to-have.
- CSV bulk import — manual UI only for now.
- AppScopeSwitcher in the TopBar → Plan E.
- `NOT NULL` migration + warn/off cleanup → Plan F.

---

## Design decisions (read before starting)

### 1. Authorization model

- **PlatformAdmin** (`system.admin` permission OR `PLATFORM_ADMIN` functional role): full access — read, write, delete any membership in any app.
- **Application Owner** = a user on a Team that has `ApplicationTeam.role = OWNER` for the specific app being mutated. Can: add/remove Teams, change Team roles (`CONTRIBUTOR ↔ VIEWER`), transfer OWNER role to another Team (but cannot delete the *last* OWNER without first promoting another).
- **Everyone else**: read-only access via `/admin/applications/catalog`, plus `GET` on their own membership.

A new helper `requireAppManager(req, appId)` lives in `server/middleware/appManager.ts`:

```ts
export async function requireAppManager(req: Request, appId: string): Promise<void> {
  // PlatformAdmin via permission system → bypass.
  if (req.permissions?.has('system.admin')) return;
  // PlatformAdmin via functional role → bypass.
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  if (ctx.functionalRoles.includes('PLATFORM_ADMIN')) return;
  // Application Owner: user's Team must hold OWNER role for this app.
  const isOwner = ctx.appMemberships.some((m) => m.appId === appId && m.role === 'OWNER');
  if (!isOwner) throw new HttpError(403, 'Application Owner or PlatformAdmin required');
}
```

This helper is called at the top of every mutation endpoint. The membership LIST endpoint is open to any tenant user (it just shows who's in what).

### 2. Endpoint shape

All under `/api/v1/admin/applications/:appId/teams`:

| Method | Path | Body | Notes |
|---|---|---|---|
| `GET` | `/api/v1/admin/applications/:appId/teams` | — | Public to tenant (lists current memberships with team + role + addedBy + addedAt) |
| `POST` | `/api/v1/admin/applications/:appId/teams` | `{ teamId, role }` | Add a Team. `requireAppManager`. |
| `PATCH` | `/api/v1/admin/applications/:appId/teams/:teamId` | `{ role }` | Change role. `requireAppManager`. |
| `DELETE` | `/api/v1/admin/applications/:appId/teams/:teamId` | — | Remove. `requireAppManager`. Refuses if it's the last OWNER. |

A list of the apps the **current user** can manage:

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/admin/applications/manageable` | Returns the subset of apps where the user is OWNER, plus all apps if they're a PlatformAdmin. Used by the UI to show only relevant apps in the Application Owner view. |

Catalog (read-only, available to any tenant user):

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/v1/applications/catalog` | All apps in the tenant + each app's OWNER team(s) + a `isMember: boolean` flag derived from the caller's memberships. Used by the catalog page. |

### 3. Integrity rules (enforced server-side)

- **Add team**: if `role === 'OWNER'` and the team isn't already on the app, add as OWNER. If the team is already a member, treat as a no-op or 409 — return 409 to be explicit.
- **Change role**: refuse if changing the only OWNER team to a non-OWNER role (`409 last_owner`). The UI should surface this clearly.
- **Remove team**: refuse if the team is the only OWNER (`409 last_owner`). Otherwise allow.
- **Add team to an app the manager doesn't own**: 403 (covered by `requireAppManager`).
- Every mutation writes `addedById = req.session.userId` (or `null` when missing).
- Every mutation emits an `AuditLog` row (`action: 'application_membership.add' / 'change_role' / 'remove'`).

The existing `upsertApplication` in `server/repositories/rbacOrg.ts:133` indiscriminately wipes and rewrites `ApplicationTeam`. **Stop doing that.** Refactor `upsertApplication` to only touch metadata (`name`, `code`, `criticality`); leave memberships alone. Memberships are managed only via the new endpoints. This is a behaviour change for the existing `/admin/rbac/applications/:id` PUT endpoint; the existing admin UI may need a small adjustment to stop sending a `teams` array (or the backend can ignore the field — preferred, to avoid breaking the existing flow).

### 4. UI

#### `src/routes/admin/Applications.tsx` (existing) — augment
- Add a Teams column showing OWNER teams (badge) + member count.
- Each row links to a new detail page `/admin/applications/:appId`.

#### `src/routes/admin/ApplicationDetail.tsx` (new)
- Header: app code, name, criticality (read-only or editable, PlatformAdmin only).
- Tabs: **Teams** (membership panel) and **Activity** (audit log entries for this app).
- Teams panel:
  - Table: Team · Role badge · Members count · Added by · Added at · Actions (Change role dropdown · Remove button).
  - "+ Add team" button → modal with Team picker (searchable, excludes already-member teams) + role default `CONTRIBUTOR`.
  - PlatformAdmins see everything; Application Owners see the same UI but the page itself is gated by `GET /manageable`.
- Activity tab: list `AuditLog` rows with `resourceKind = 'Application'` AND `resourceId = appId`. Reuse `auditService.list` if available.

#### `src/routes/admin/ApplicationCatalog.tsx` (new)
- Public to any tenant user.
- Card grid: each app card shows code, name, criticality, OWNER team(s), `You're a member` / `Not a member` badge.
- "Contact owner" button on each card opens a `mailto:` with the OWNER team's primary user's email (if available) — fallback to inline copy-to-clipboard.

#### Navigation
- `AdminLayout.tsx`: existing `Applications` tab stays (PlatformAdmin only). Add a "Catalog" link visible to ALL users (not gated by admin) — easier path: render it in the main sidebar instead of AdminLayout. Decide based on existing nav: if there's a top-level "Browse" or "Catalog" concept, put it there; otherwise add a small "App catalog" link to the user's profile dropdown.

### 5. Tests

- **`server/__tests__/admin-app-membership.test.ts`** (8+ cases):
  1. PlatformAdmin can list memberships.
  2. PlatformAdmin can add a team as CONTRIBUTOR.
  3. PlatformAdmin can change role CONTRIBUTOR → VIEWER.
  4. Application Owner can add a team to their own app.
  5. Application Owner CANNOT manage a different app (403).
  6. Non-admin non-owner CANNOT add a team (403).
  7. Removing the last OWNER returns 409 with `error: 'last_owner'`.
  8. Changing the last OWNER's role to non-OWNER returns 409.
  9. Adding an already-member team returns 409.
- **`server/__tests__/applications-catalog.test.ts`** (3+ cases):
  1. Any authenticated user can read the catalog.
  2. Catalog response includes `isMember` flag per app for the current user.
  3. Cross-tenant apps are NOT returned (tenant boundary).
- **`server/__tests__/admin-rbac.test.ts`**: regression — confirm the existing `/admin/rbac/applications/:id` PUT no longer wipes `ApplicationTeam` rows.

### 6. Audit

Every membership mutation writes to `AuditLog`:
- `action`: `'application_membership.add' | 'application_membership.change_role' | 'application_membership.remove'`
- `resourceKind`: `'Application'`
- `resourceId`: appId
- `after`: `{ teamId, role }` (or `{ teamId, fromRole, toRole }` for change-role)
- `scopeMode`: `'admin'` if PlatformAdmin made the change, `'owner'` if Application Owner

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `server/middleware/appManager.ts` | Create | `requireAppManager(req, appId)` helper. |
| `server/repositories/applicationMembership.ts` | Create | `addTeam`, `changeRole`, `removeTeam`, `listTeamsForApp`, `listManageableApps`, `listCatalog`. Integrity rules enforced inside transactions. |
| `server/routes/admin/applicationMembership.ts` | Create | New sub-router mounted at `/admin/applications`. |
| `server/routes/admin.ts` | Modify | Mount the new sub-router. |
| `server/routes/applications.ts` | Create | Mounted at `/applications` (not under `/admin`) for the catalog endpoint — no `system.admin` gate. |
| `server/app.ts` | Modify | Wire the new `/applications` top-level router. |
| `server/repositories/rbacOrg.ts` | Modify | Refactor `upsertApplication` to leave `ApplicationTeam` alone. |
| `eslint.config.js` | Modify | Add `server/routes/admin/applicationMembership.ts` and `server/routes/applications.ts` to `excludedFiles`. |
| `src/services/adminService.ts` | Modify | Add `applicationMembershipApi` + `applicationCatalogApi`. |
| `src/routes/admin/ApplicationDetail.tsx` | Create | Detail + membership panel. |
| `src/routes/admin/ApplicationCatalog.tsx` | Create | Catalog cards. |
| `src/routes/admin/Applications.tsx` | Modify | Add "Manage" link to each row → detail page. |
| `src/routes/index.tsx` | Modify | Register `/admin/applications/:appId` and `/applications/catalog`. |
| `server/__tests__/admin-app-membership.test.ts` | Create | 9+ cases per the design. |
| `server/__tests__/applications-catalog.test.ts` | Create | 3+ cases. |
| `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` | Modify | Mark §9 (membership) as done in DoD. |

---

## Task 1: Repository — application membership

**Files:** Create `server/repositories/applicationMembership.ts`, add a test file scaffold

- [ ] **Step 1: Write the failing test**

Create `server/__tests__/admin-app-membership.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../db';
import {
  addTeamToApp, changeTeamRole, removeTeamFromApp, listTeamsForApp,
} from '../repositories/applicationMembership';
import { createScopedAppFixture, type ScopedAppFixture } from './helpers';

let fx: ScopedAppFixture;

beforeAll(async () => { fx = await createScopedAppFixture('mem-repo'); });
afterAll(async () => { await fx.cleanup(); await prisma.$disconnect(); });

describe('applicationMembership repo', () => {
  it('addTeamToApp adds a team with the requested role', async () => {
    await addTeamToApp({ tenantId: fx.tenantId(), appId: fx.appId, teamId: fx.teamBId, role: 'VIEWER', actorId: fx.platformAdminUserId });
    const teams = await listTeamsForApp(fx.appId);
    const teamB = teams.find((t) => t.teamId === fx.teamBId);
    expect(teamB?.role).toBe('VIEWER');
    // cleanup
    await removeTeamFromApp({ appId: fx.appId, teamId: fx.teamBId, actorId: fx.platformAdminUserId });
  });

  it('refuses to add an already-member team (409)', async () => {
    await expect(
      addTeamToApp({ tenantId: fx.tenantId(), appId: fx.appId, teamId: fx.teamAId, role: 'CONTRIBUTOR', actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'already_member' });
  });

  it('refuses to remove the last OWNER (409 last_owner)', async () => {
    // Promote teamA to OWNER first.
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'OWNER', actorId: fx.platformAdminUserId });
    await expect(
      removeTeamFromApp({ appId: fx.appId, teamId: fx.teamAId, actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'last_owner' });
    // revert
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'CONTRIBUTOR', actorId: fx.platformAdminUserId });
  });

  it('refuses to demote the last OWNER (409 last_owner)', async () => {
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'OWNER', actorId: fx.platformAdminUserId });
    await expect(
      changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'VIEWER', actorId: fx.platformAdminUserId }),
    ).rejects.toMatchObject({ code: 'last_owner' });
    await changeTeamRole({ appId: fx.appId, teamId: fx.teamAId, role: 'CONTRIBUTOR', actorId: fx.platformAdminUserId });
  });
});
```

(The fixture needs a helper `fx.tenantId()` — if it doesn't exist, look it up via `prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'demo' } })` inline.)

Run: `npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/admin-app-membership.test.ts`. Expect FAIL (module not found).

- [ ] **Step 2: Implement `server/repositories/applicationMembership.ts`**

```ts
import { prisma } from '../db';
import type { ApplicationTeamRole } from '@prisma/client';

export class MembershipError extends Error {
  constructor(public code: 'already_member' | 'last_owner' | 'not_member' | 'app_not_found' | 'team_not_found', message: string) {
    super(message);
    this.name = 'MembershipError';
  }
}

export interface MembershipRow {
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  addedById: string | null;
  addedAt: Date;
}

export async function listTeamsForApp(appId: string): Promise<MembershipRow[]> {
  const rows = await prisma.applicationTeam.findMany({
    where: { applicationId: appId },
    select: { applicationId: true, teamId: true, role: true, addedById: true, addedAt: true },
    orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
  });
  return rows.map((r) => ({ appId: r.applicationId, teamId: r.teamId, role: r.role, addedById: r.addedById, addedAt: r.addedAt }));
}

export async function addTeamToApp(args: {
  tenantId: string;
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  actorId: string;
}): Promise<MembershipRow> {
  // Verify app + team belong to the tenant (defense in depth).
  const [app, team] = await Promise.all([
    prisma.application.findFirst({ where: { id: args.appId, tenantId: args.tenantId } }),
    prisma.team.findFirst({ where: { id: args.teamId, tenantId: args.tenantId } }),
  ]);
  if (!app) throw new MembershipError('app_not_found', 'Application not found in tenant');
  if (!team) throw new MembershipError('team_not_found', 'Team not found in tenant');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (existing) throw new MembershipError('already_member', 'Team is already a member of this application');
    const row = await tx.applicationTeam.create({
      data: { applicationId: args.appId, teamId: args.teamId, role: args.role, addedById: args.actorId },
    });
    return { appId: row.applicationId, teamId: row.teamId, role: row.role, addedById: row.addedById, addedAt: row.addedAt };
  });
}

export async function changeTeamRole(args: {
  appId: string;
  teamId: string;
  role: ApplicationTeamRole;
  actorId: string;
}): Promise<MembershipRow> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (!existing) throw new MembershipError('not_member', 'Team is not a member of this application');

    // If we are demoting an OWNER and they're the LAST owner → refuse.
    if (existing.role === 'OWNER' && args.role !== 'OWNER') {
      const ownerCount = await tx.applicationTeam.count({ where: { applicationId: args.appId, role: 'OWNER' } });
      if (ownerCount <= 1) throw new MembershipError('last_owner', 'Cannot demote the last OWNER team');
    }

    const row = await tx.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
      data: { role: args.role },
    });
    return { appId: row.applicationId, teamId: row.teamId, role: row.role, addedById: row.addedById, addedAt: row.addedAt };
  });
}

export async function removeTeamFromApp(args: {
  appId: string;
  teamId: string;
  actorId: string;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.applicationTeam.findUnique({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
    if (!existing) throw new MembershipError('not_member', 'Team is not a member of this application');
    if (existing.role === 'OWNER') {
      const ownerCount = await tx.applicationTeam.count({ where: { applicationId: args.appId, role: 'OWNER' } });
      if (ownerCount <= 1) throw new MembershipError('last_owner', 'Cannot remove the last OWNER team');
    }
    await tx.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId: args.appId, teamId: args.teamId } },
    });
  });
}

export async function listManageableApps(tenantId: string, ownerAppIds: string[], isPlatformAdmin: boolean) {
  if (isPlatformAdmin) {
    return prisma.application.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }
  return prisma.application.findMany({ where: { tenantId, id: { in: ownerAppIds } }, orderBy: { name: 'asc' } });
}

export async function listCatalog(tenantId: string, userAppIds: string[]) {
  const apps = await prisma.application.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  const ownerships = await prisma.applicationTeam.findMany({
    where: { applicationId: { in: apps.map((a) => a.id) }, role: 'OWNER' },
    select: { applicationId: true, teamId: true },
  });
  const ownerTeamsByApp = new Map<string, string[]>();
  for (const o of ownerships) {
    const arr = ownerTeamsByApp.get(o.applicationId) ?? [];
    arr.push(o.teamId);
    ownerTeamsByApp.set(o.applicationId, arr);
  }
  const memberSet = new Set(userAppIds);
  return apps.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    criticality: a.criticality,
    ownerTeamIds: ownerTeamsByApp.get(a.id) ?? [],
    isMember: memberSet.has(a.id),
  }));
}
```

- [ ] **Step 3: Run tests, expect pass.**

Iterate until 4/4 cases pass.

- [ ] **Step 4: Lint + commit**

```bash
git add server/repositories/applicationMembership.ts server/__tests__/admin-app-membership.test.ts
git commit -m "feat(scope): applicationMembership repo with integrity rules"
```

---

## Task 2: `requireAppManager` middleware

**Files:** Create `server/middleware/appManager.ts`

- [ ] **Step 1: Write the failing test**

Append to `server/__tests__/admin-app-membership.test.ts`:

```ts
import { requireAppManager } from '../middleware/appManager';

describe('requireAppManager', () => {
  it('passes for PlatformAdmin user', async () => {
    const req = makeFakeReq(fx.platformAdminUserId);
    await expect(requireAppManager(req, fx.appId)).resolves.toBeUndefined();
  });
  it('passes for Application Owner of the app', async () => {
    // memberA is in fx.teamA, which is CONTRIBUTOR — promote to OWNER for this test.
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const req = makeFakeReq(fx.memberAUserId);
    await expect(requireAppManager(req, fx.appId)).resolves.toBeUndefined();
    // restore for other tests
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
  it('rejects a non-admin non-owner user with 403', async () => {
    const req = makeFakeReq(fx.memberBUserId);
    await expect(requireAppManager(req, fx.appId)).rejects.toMatchObject({ status: 403 });
  });
});

function makeFakeReq(userId: string) {
  const tenant = fx.tenantId();
  return {
    session: { userId, tenantId: tenant, sessionId: 'x', roles: [] },
    permissions: new Set<string>(), // no system.admin → forces functional-role check
    tenantId: tenant,
  } as unknown as import('express').Request;
}
```

(Add `tenantId(): string` helper to the fixture if not present — or inline the tenant lookup.)

- [ ] **Step 2: Implement `server/middleware/appManager.ts`**

```ts
import type { Request } from 'express';
import { HttpError } from '../util';
import { resolveScopeContext } from '../scope/context';

/**
 * Authorize the caller as either a PlatformAdmin or an Application Owner for
 * the given appId. Throws HttpError(403) otherwise. Idempotent — safe to call
 * from each membership-mutating handler.
 */
export async function requireAppManager(req: Request, appId: string): Promise<void> {
  if (!req.session) throw new HttpError(401, 'Authentication required');
  if (req.permissions?.has('system.admin')) return; // RBAC system admin
  const ctx = await resolveScopeContext({ userId: req.session.userId, tenantId: req.tenantId });
  if (ctx.functionalRoles.includes('PLATFORM_ADMIN')) return;
  const isOwner = ctx.appMemberships.some((m) => m.appId === appId && m.role === 'OWNER');
  if (!isOwner) throw new HttpError(403, 'Application Owner or PlatformAdmin required');
}
```

- [ ] **Step 3: Run tests, expect pass.**

- [ ] **Step 4: Commit**

```bash
git add server/middleware/appManager.ts server/__tests__/admin-app-membership.test.ts
git commit -m "feat(scope): requireAppManager middleware (PlatformAdmin | App Owner)"
```

---

## Task 3: Membership endpoints

**Files:** Create `server/routes/admin/applicationMembership.ts`, modify `server/routes/admin.ts`, modify `eslint.config.js`

- [ ] **Step 1: Append failing API tests** to the existing test file:

```ts
import request from 'supertest';
import { createApp } from '../app';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

describe('POST /admin/applications/:appId/teams', () => {
  it('PlatformAdmin can add a team as VIEWER', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/admin/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamBId, role: 'VIEWER' });
    expect(res.status).toBe(201);
    // cleanup
    await prisma.applicationTeam.delete({ where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamBId } } });
  });

  it('Returns 409 when team is already a member', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/admin/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamAId, role: 'CONTRIBUTOR' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('already_member');
  });

  it('Returns 403 for a non-admin non-owner user', async () => {
    const cookie = await login(app, fx.emailOf('member-b'), fx.password);
    const res = await request(app)
      .post(`/api/v1/admin/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamBId, role: 'CONTRIBUTOR' });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /admin/applications/:appId/teams/:teamId', () => {
  it('Refuses to demote the last OWNER (409 last_owner)', async () => {
    // promote teamA → OWNER
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .patch(`/api/v1/admin/applications/${fx.appId}/teams/${fx.teamAId}`)
      .set('Cookie', cookie)
      .send({ role: 'VIEWER' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('last_owner');
    // restore
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});

describe('DELETE /admin/applications/:appId/teams/:teamId', () => {
  it('Refuses to remove the last OWNER (409 last_owner)', async () => {
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .delete(`/api/v1/admin/applications/${fx.appId}/teams/${fx.teamAId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(409);
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});

describe('GET /admin/applications/:appId/teams', () => {
  it('Returns the current memberships', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get(`/api/v1/admin/applications/${fx.appId}/teams`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    const teamIds = (res.body as Array<{ teamId: string }>).map((r) => r.teamId);
    expect(teamIds).toContain(fx.teamAId);
  });
});

describe('GET /admin/applications/manageable', () => {
  it('PlatformAdmin sees all apps', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/admin/applications/manageable').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect((res.body as Array<{ id: string }>).some((a) => a.id === fx.appId)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement `server/routes/admin/applicationMembership.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { asyncHandler, HttpError } from '../../util';
import { audit } from '../../audit';
import { requireAppManager } from '../../middleware/appManager';
import { resolveScopeContext } from '../../scope/context';
import {
  addTeamToApp, changeTeamRole, removeTeamFromApp, listTeamsForApp,
  listManageableApps, MembershipError,
} from '../../repositories/applicationMembership';

export const applicationMembershipRouter = Router();

function translateMembershipError(e: unknown, fallback: string): never {
  if (e instanceof MembershipError) {
    if (e.code === 'app_not_found' || e.code === 'team_not_found' || e.code === 'not_member') {
      throw new HttpError(404, e.message);
    }
    if (e.code === 'already_member' || e.code === 'last_owner') {
      throw Object.assign(new HttpError(409, e.message), { code: e.code });
    }
  }
  throw new HttpError(500, fallback);
}

const roleSchema = z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER']);

applicationMembershipRouter.get('/manageable', asyncHandler(async (req, res) => {
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  const ownerAppIds = ctx.appMemberships.filter((m) => m.role === 'OWNER').map((m) => m.appId);
  const isPlatformAdmin = req.permissions?.has('system.admin') || ctx.functionalRoles.includes('PLATFORM_ADMIN');
  const apps = await listManageableApps(req.tenantId, ownerAppIds, !!isPlatformAdmin);
  res.json(apps);
}));

applicationMembershipRouter.get('/:appId/teams', asyncHandler(async (req, res) => {
  // Open to any tenant user — listing is informational.
  const app = await prisma.application.findFirst({ where: { id: req.params.appId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(404, 'Application not found');
  res.json(await listTeamsForApp(req.params.appId));
}));

const addBody = z.object({ teamId: z.string().min(1), role: roleSchema });
applicationMembershipRouter.post('/:appId/teams', asyncHandler(async (req, res) => {
  await requireAppManager(req, req.params.appId);
  const { teamId, role } = addBody.parse(req.body);
  try {
    const row = await addTeamToApp({
      tenantId: req.tenantId, appId: req.params.appId, teamId, role, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.add', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId, role }, scopeMode: 'admin',
    });
    res.status(201).json(row);
  } catch (e) {
    translateMembershipError(e, 'failed to add team');
  }
}));

const patchBody = z.object({ role: roleSchema });
applicationMembershipRouter.patch('/:appId/teams/:teamId', asyncHandler(async (req, res) => {
  await requireAppManager(req, req.params.appId);
  const { role } = patchBody.parse(req.body);
  try {
    const row = await changeTeamRole({
      appId: req.params.appId, teamId: req.params.teamId, role, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.change_role', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId: req.params.teamId, toRole: role }, scopeMode: 'admin',
    });
    res.json(row);
  } catch (e) {
    translateMembershipError(e, 'failed to change role');
  }
}));

applicationMembershipRouter.delete('/:appId/teams/:teamId', asyncHandler(async (req, res) => {
  await requireAppManager(req, req.params.appId);
  try {
    await removeTeamFromApp({
      appId: req.params.appId, teamId: req.params.teamId, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.remove', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId: req.params.teamId }, scopeMode: 'admin',
    });
    res.status(204).end();
  } catch (e) {
    translateMembershipError(e, 'failed to remove team');
  }
}));
```

Note the small trick in `translateMembershipError`: we attach `code` to the `HttpError` so the error handler can include it in the JSON body. **Verify** the existing `HttpError` → JSON translation in `server/app.ts` includes any extra fields, or extend it. The simplest fix is to translate 409s to JSON inline (`res.status(409).json({ error: 'last_owner', ... })`) instead of throwing. Pick whichever is cleaner; the tests assert `res.body.error === 'last_owner'` so make sure the body shape matches.

- [ ] **Step 3: Mount in `server/routes/admin.ts`**

After the `dataQualityRouter` mount, add:
```ts
import { applicationMembershipRouter } from './admin/applicationMembership';
adminRouter.use('/admin/applications', applicationMembershipRouter);
```

- [ ] **Step 4: ESLint exemption**

Add `server/routes/admin/applicationMembership.ts` to `excludedFiles` in `eslint.config.js`.

- [ ] **Step 5: Run tests, expect pass.**

Iterate until every new case is green.

- [ ] **Step 6: Lint + commit**

```bash
git add server/routes/admin/applicationMembership.ts server/routes/admin.ts eslint.config.js server/__tests__/admin-app-membership.test.ts
git commit -m "feat(admin): /admin/applications/:appId/teams CRUD endpoints"
```

---

## Task 4: Catalog endpoint

**Files:** Create `server/routes/applications.ts`, modify `server/app.ts`, modify `eslint.config.js`, create `server/__tests__/applications-catalog.test.ts`

- [ ] **Step 1: Write failing tests**

`server/__tests__/applications-catalog.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, createScopedAppFixture, type ScopedAppFixture } from './helpers';

const app = createApp();
let fx: ScopedAppFixture;

beforeAll(async () => { fx = await createScopedAppFixture('catalog'); });
afterAll(async () => { await fx.cleanup(); await prisma.$disconnect(); });

describe('GET /api/v1/applications/catalog', () => {
  it('returns the catalog for the admin', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/applications/catalog').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const myApp = (res.body as Array<{ id: string }>).find((a) => a.id === fx.appId);
    expect(myApp).toBeDefined();
  });

  it('flags isMember correctly for the calling user', async () => {
    const memberCookie = await login(app, fx.emailOf('member-a'), fx.password);
    const res = await request(app).get('/api/v1/applications/catalog').set('Cookie', memberCookie);
    expect(res.status).toBe(200);
    const myApp = (res.body as Array<{ id: string; isMember: boolean }>).find((a) => a.id === fx.appId);
    expect(myApp?.isMember).toBe(true);

    const outsiderCookie = await login(app, fx.emailOf('member-b'), fx.password);
    const r2 = await request(app).get('/api/v1/applications/catalog').set('Cookie', outsiderCookie);
    const sameApp = (r2.body as Array<{ id: string; isMember: boolean }>).find((a) => a.id === fx.appId);
    expect(sameApp?.isMember).toBe(false);
  });
});
```

- [ ] **Step 2: Implement `server/routes/applications.ts`**

```ts
import { Router } from 'express';
import { prisma } from '../db';
import { asyncHandler } from '../util';
import { resolveScopeContext } from '../scope/context';
import { listCatalog } from '../repositories/applicationMembership';
import { requireAuth } from '../middleware/auth';

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

applicationsRouter.get('/catalog', asyncHandler(async (req, res) => {
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  const userAppIds = ctx.appMemberships.map((m) => m.appId);
  const catalog = await listCatalog(req.tenantId, userAppIds);
  res.json(catalog);
}));
```

- [ ] **Step 3: Mount in `server/app.ts`**

Add the import and mount under `/api/v1`:
```ts
import { applicationsRouter } from './routes/applications';
// near where the other routers are mounted:
app.use('/api/v1/applications', applicationsRouter);
```

- [ ] **Step 4: ESLint exemption**

Add `server/routes/applications.ts` to `excludedFiles` (it imports `prisma` from `../db`).

- [ ] **Step 5: Run tests, expect pass.**

- [ ] **Step 6: Commit**

```bash
git add server/routes/applications.ts server/app.ts eslint.config.js server/__tests__/applications-catalog.test.ts
git commit -m "feat(applications): /applications/catalog endpoint"
```

---

## Task 5: Stop wiping ApplicationTeam in `upsertApplication`

**Files:** Modify `server/repositories/rbacOrg.ts`

- [ ] **Step 1: Write a regression test**

Append to `server/__tests__/admin-app-membership.test.ts`:

```ts
import { upsertApplication } from '../repositories/rbacOrg';

describe('upsertApplication legacy endpoint preserves memberships', () => {
  it('does NOT touch ApplicationTeam rows', async () => {
    const tenantId = fx.tenantId();
    // Snapshot before
    const before = await prisma.applicationTeam.findMany({ where: { applicationId: fx.appId } });
    await upsertApplication(tenantId, fx.appId, { code: 'SCOPE_APP_CATALOG', name: 'Renamed', teams: [] });
    const after = await prisma.applicationTeam.findMany({ where: { applicationId: fx.appId } });
    expect(after.length).toBe(before.length);
  });
});
```

- [ ] **Step 2: Refactor `server/repositories/rbacOrg.ts:133`**

```ts
export async function upsertApplication(tenantId: string, id: string, input: ApplicationInput) {
  return prisma.application.upsert({
    where: { id },
    create: { id, tenantId, code: input.code, name: input.name, criticality: input.criticality ?? null },
    update: { code: input.code, name: input.name, criticality: input.criticality ?? null },
  }).then(() => id);
  // NOTE: teams are NOT managed here anymore (Plan D). Use /admin/applications/:id/teams endpoints.
}
```

If callers depend on the old `teams` array behaviour (check the existing UI's `rbacService.upsertApplication` callsite), leave the input field accepted but ignored — no schema break, just a behaviour change documented above.

- [ ] **Step 3: Run tests, expect pass**

```
npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/admin-app-membership.test.ts server/__tests__/admin-rbac.test.ts
```

If `admin-rbac.test.ts` had a case asserting the old "wipe and rewrite" behaviour, update that test to match the new contract — but search first; it likely tested only the metadata write path.

- [ ] **Step 4: Commit**

```bash
git add server/repositories/rbacOrg.ts server/__tests__/admin-app-membership.test.ts
git commit -m "refactor(rbac): upsertApplication leaves ApplicationTeam alone (Plan D delegates membership)"
```

---

## Task 6: Frontend — Application Detail with Teams panel

**Files:** Create `src/routes/admin/ApplicationDetail.tsx`, modify `src/routes/admin/Applications.tsx`, modify `src/services/adminService.ts`, modify `src/routes/index.tsx`

- [ ] **Step 1: Add client methods to `src/services/adminService.ts`**

```ts
export interface MembershipDto {
  appId: string;
  teamId: string;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
  addedById: string | null;
  addedAt: string;
}

export const applicationMembershipApi = {
  list: (appId: string) => apiFetch<MembershipDto[]>(`/admin/applications/${appId}/teams`),
  add: (appId: string, body: { teamId: string; role: MembershipDto['role'] }) =>
    apiFetch<MembershipDto>(`/admin/applications/${appId}/teams`, { method: 'POST', body }),
  changeRole: (appId: string, teamId: string, role: MembershipDto['role']) =>
    apiFetch<MembershipDto>(`/admin/applications/${appId}/teams/${teamId}`, { method: 'PATCH', body: { role } }),
  remove: (appId: string, teamId: string) =>
    apiFetch<void>(`/admin/applications/${appId}/teams/${teamId}`, { method: 'DELETE' }),
  manageable: () => apiFetch<unknown[]>('/admin/applications/manageable'),
};
```

- [ ] **Step 2: Create `src/routes/admin/ApplicationDetail.tsx`**

Page shell with a Teams table + Add modal + per-row "Change role" dropdown + "Remove" button. ~250 lines max. Mirror the visual style of `DataQuality.tsx` (KPI strip, table, modal).

- [ ] **Step 3: Wire it up in `Applications.tsx`**

Add a "Manage" button in each row → `useNavigate()` to `/admin/applications/:appId`.

- [ ] **Step 4: Register the route in `src/routes/index.tsx`**

```tsx
{ path: 'applications/:appId', element: <ApplicationDetail /> }
```
(Under the admin layout — match the existing convention.)

- [ ] **Step 5: Lint + build**

```
npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/services/adminService.ts src/routes/admin/ApplicationDetail.tsx src/routes/admin/Applications.tsx src/routes/index.tsx
git commit -m "feat(admin): ApplicationDetail page with Teams membership panel"
```

---

## Task 7: Frontend — Application Catalog

**Files:** Create `src/routes/admin/ApplicationCatalog.tsx`, modify `src/services/adminService.ts`, modify `src/routes/index.tsx`, modify `src/routes/admin/AdminLayout.tsx` (or top-level layout if catalog should be visible to all users)

- [ ] **Step 1: Add the client method**

```ts
export interface CatalogAppDto {
  id: string;
  code: string;
  name: string;
  criticality: string | null;
  ownerTeamIds: string[];
  isMember: boolean;
}

export const applicationCatalogApi = {
  list: () => apiFetch<CatalogAppDto[]>('/applications/catalog'),
};
```

- [ ] **Step 2: Implement `ApplicationCatalog.tsx`**

Card grid (Tailwind), each card with code/name/criticality badge, owner team chips, `You're a member` / `Not a member` pill. ~200 lines.

- [ ] **Step 3: Register & link**

Add `/applications/catalog` route in `src/routes/index.tsx`. Decide where the nav link goes:
- **Recommended**: add it to the user-profile dropdown / top-bar "Browse" section, since this page is for *non-admin* users to find an Application Owner to ask for access. Read existing layout files to find the right slot.

- [ ] **Step 4: Lint + build + commit**

```bash
git add src/services/adminService.ts src/routes/admin/ApplicationCatalog.tsx src/routes/index.tsx [any layout files modified]
git commit -m "feat(applications): public catalog page for app discovery"
```

---

## Task 8: Spec + regression sweep

**Files:** Modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Mark §9 done**

Edit §10.3 "Definition of Done" — keep the existing checklist items but add a new line: `Application Owner self-service membership management live (Plan D).` Mark off any DoD items satisfied.

- [ ] **Step 2: Full sweep**

```
npm run lint && npm run build && \
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/admin-app-membership.test.ts \
  server/__tests__/applications-catalog.test.ts \
  server/__tests__/admin-rbac.test.ts \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/admin-data-quality.test.ts \
  server/__tests__/backfill-scope.test.ts
```

All green.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(spec): Plan D membership management complete"
```

---

## Done criteria for Plan D

- [ ] `POST/PATCH/DELETE /admin/applications/:appId/teams[/teamId]` endpoints live with `requireAppManager` gate.
- [ ] `GET /admin/applications/manageable` returns the right subset for both PlatformAdmin and Application Owner.
- [ ] `GET /api/v1/applications/catalog` returns the tenant's apps with `isMember` flags.
- [ ] Repository integrity rules: no team is added twice, last OWNER cannot be removed or demoted.
- [ ] `upsertApplication` no longer wipes `ApplicationTeam` rows; membership is solely managed through the new endpoints.
- [ ] `requireAppManager` covered by unit tests (admin pass, owner pass, other 403).
- [ ] Integration tests cover the 5 main scenarios (add, change-role, remove, list, manageable) × 3 personas (admin, owner, outsider) — at least 9 explicit cases.
- [ ] `/admin/applications/:appId` page renders and lets a PlatformAdmin manage memberships end-to-end without errors.
- [ ] `/applications/catalog` page renders for any tenant user.
- [ ] `npm run lint` clean, `npm run build` clean.
- [ ] Every membership mutation produces an `AuditLog` row.

## What Plan E will pick up
- `AppScopeSwitcher` in the TopBar (chip + dropdown).
- Form pre-fill + mismatch confirm modal.
- Frontend feature flag `feature.app_scope_ui`.
