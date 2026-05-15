# New-User Onboarding (Admin-Provisioned Password) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make admin-created users actually able to log in by generating a one-time temporary password at creation/reset time and force-gating the user to change it on first login.

**Architecture:** One Prisma column (`User.mustChangePassword`), one new backend endpoint each for admin reset and user change, a new `/change-password` page, and a small `<RequirePasswordChange>` wrapper that redirects every protected route while the flag is set.

**Tech Stack:** Express, Prisma (Postgres), argon2 (`@node-rs/argon2` already in use via `server/auth/session.ts`), zod, React 19, react-router-dom v6, Vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-05-15-new-user-onboarding-design.md`

---

## File Structure

**Backend (new):**
- `server/lib/passwordGen.ts` — `generateTempPassword()` adjective-noun-3digit helper.
- `server/__tests__/passwordGen.test.ts`
- `server/__tests__/passwordReset.test.ts`
- `server/__tests__/changePassword.test.ts`

**Backend (modify):**
- `prisma/schema.prisma` — add `mustChangePassword Boolean @default(false)` to `User`.
- `prisma/migrations/<timestamp>_must_change_password/` — generated migration.
- `server/routes/admin.ts` — add `POST /admin/rbac/users/:id/reset-password`.
- `server/routes/auth.ts` — add `POST /auth/change-password`; extend `/auth/me` payload.
- `server/routes/platform.ts` — extend `/users/me` payload with `mustChangePassword`.

**Frontend (new):**
- `src/routes/ChangePassword.tsx`
- `src/components/auth/RequirePasswordChange.tsx`
- `src/components/admin/NewPasswordModal.tsx`

**Frontend (modify):**
- `src/types/common.ts` — add `mustChangePassword?: boolean` on `User`.
- `src/services/adminService.ts` — add `resetUserPassword(id)`.
- `src/services/platformServices.ts` — add `authService.changePassword(current, next)`.
- `src/routes/index.tsx` — mount `/change-password` and wrap children with `RequirePasswordChange`.
- `src/routes/admin/Users.tsx` — chain reset on create; add row-level Reset action; render modal.

---

## Task 1 — Prisma column + migration

**Files:**
- Modify: `prisma/schema.prisma` (the `model User { … }` block)
- Create: `prisma/migrations/<timestamp>_must_change_password/migration.sql` (generated)

- [ ] **Step 1: Edit schema**

  Open `prisma/schema.prisma`, find `model User {`, and add inside the body:

  ```prisma
    mustChangePassword Boolean @default(false)
  ```

- [ ] **Step 2: Generate + apply migration**

  Run: `npm run db:migrate -- --name must_change_password`
  Expected: a new folder under `prisma/migrations/` containing a single `ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;` and "Prisma Client generated".

- [ ] **Step 3: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 4: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations
  git commit -m "feat(schema): add User.mustChangePassword flag"
  ```

---

## Task 2 — Temp-password generator helper

**Files:**
- Create: `server/lib/passwordGen.ts`
- Create: `server/__tests__/passwordGen.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `server/__tests__/passwordGen.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { generateTempPassword } from '../lib/passwordGen';

  describe('generateTempPassword', () => {
    it('matches Adj-Noun-3digit pattern', () => {
      for (let i = 0; i < 50; i++) {
        const pw = generateTempPassword();
        expect(pw).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{3}$/);
      }
    });

    it('is not constant across calls', () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) set.add(generateTempPassword());
      expect(set.size).toBeGreaterThan(1);
    });
  });
  ```

- [ ] **Step 2: Run test, expect fail**

  Run: `npx vitest run server/__tests__/passwordGen.test.ts`
  Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

  Create `server/lib/passwordGen.ts`:

  ```ts
  import crypto from 'node:crypto';

  const ADJECTIVES = [
    'Brisk','Calm','Clever','Bold','Bright','Quick','Quiet','Sharp',
    'Steady','Swift','Vivid','Warm','Eager','Lucky','Merry','Nimble',
  ];
  const NOUNS = [
    'Falcon','Otter','Panda','Heron','Marlin','Lynx','Quail','Tiger',
    'Wolf','Yak','Zebra','Crane','Lark','Robin','Hawk','Finch',
  ];

  export function generateTempPassword(): string {
    const adj   = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
    const noun  = NOUNS[crypto.randomInt(NOUNS.length)];
    const digit = String(crypto.randomInt(100, 1000));
    return `${adj}-${noun}-${digit}`;
  }
  ```

- [ ] **Step 4: Run test, expect pass**

  Run: `npx vitest run server/__tests__/passwordGen.test.ts`
  Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

  ```bash
  git add server/lib/passwordGen.ts server/__tests__/passwordGen.test.ts
  git commit -m "feat(auth): temp-password generator helper"
  ```

---

## Task 3 — `POST /admin/rbac/users/:id/reset-password`

**Files:**
- Modify: `server/routes/admin.ts`
- Create: `server/__tests__/passwordReset.test.ts`

Context for the implementer:
- The admin router is mounted with `adminRouter.use('/admin', requirePermission('system.admin'));` at `server/routes/admin.ts:29` — every route under it already requires superadmin permission.
- `hashPassword` lives at `server/auth/session.ts:16`.
- Test pattern: copy from `server/__tests__/userTokens.test.ts`. It builds the Express app and logs in the seeded `admin@omni.local` / `demo` (see `server/__tests__/helpers.ts`).

- [ ] **Step 1: Write the failing test**

  Create `server/__tests__/passwordReset.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import request from 'supertest';
  import { buildApp } from '../app';
  import { loginAsAdmin } from './helpers';
  import { prisma } from '../db';

  describe('POST /admin/rbac/users/:id/reset-password', () => {
    const app = buildApp();
    let adminCookie: string;
    let targetUserId: string;

    beforeAll(async () => {
      adminCookie = await loginAsAdmin(app);
      // Create a fresh target user with no password.
      const u = await prisma.user.create({
        data: {
          email: `reset-target-${Date.now()}@example.com`,
          name: 'Reset Target',
          isSuperadmin: false,
        },
      });
      targetUserId = u.id;
      // Ensure tenant membership matches the admin's tenant.
      const adminMembership = await prisma.tenantMembership.findFirst({
        where: { user: { email: 'admin@omni.local' } },
      });
      await prisma.tenantMembership.create({
        data: { userId: u.id, tenantId: adminMembership!.tenantId },
      });
    });

    it('rejects callers without superadmin permission', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`);
      expect(res.status).toBe(401);
    });

    it('returns a temp password and flips mustChangePassword to true', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`)
        .set('Cookie', adminCookie);
      expect(res.status).toBe(201);
      expect(res.body.tempPassword).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{3}$/);

      const row = await prisma.user.findUnique({ where: { id: targetUserId } });
      expect(row?.mustChangePassword).toBe(true);
      expect(row?.passwordHash).toBeTruthy();
    });

    it('lets the target user log in with the returned password', async () => {
      // Reset again to get a fresh password.
      const reset = await request(app)
        .post(`/api/v1/admin/rbac/users/${targetUserId}/reset-password`)
        .set('Cookie', adminCookie);
      const tempPw = reset.body.tempPassword;
      const targetEmail = (await prisma.user.findUnique({ where: { id: targetUserId } }))!.email;

      const login = await request(app).post('/api/v1/auth/login')
        .send({ email: targetEmail, password: tempPw });
      expect(login.status).toBe(200);
    });

    it('returns 404 when user does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/admin/rbac/users/does-not-exist/reset-password')
        .set('Cookie', adminCookie);
      expect(res.status).toBe(404);
    });
  });
  ```

  If `server/__tests__/helpers.ts` does not export `loginAsAdmin`, open it and copy whatever named export logs in the seeded admin (likely `loginAs` or `adminCookie()`); adapt the import and call accordingly. **Do not invent a helper that doesn't exist.**

- [ ] **Step 2: Run test, expect fail**

  Run: `npx vitest run server/__tests__/passwordReset.test.ts`
  Expected: FAIL — endpoint returns 404 / handler not found.

- [ ] **Step 3: Implement the endpoint**

  Open `server/routes/admin.ts`. Find the existing `adminRouter.put('/admin/rbac/users/:id', …)` block (around line 318) and add directly after it:

  ```ts
  import { hashPassword } from '../auth/session';
  import { generateTempPassword } from '../lib/passwordGen';

  adminRouter.post('/admin/rbac/users/:id/reset-password', asyncHandler(async (req, res) => {
    const target = await prisma.user.findFirst({
      where: { id: req.params.id, memberships: { some: { tenantId: req.tenantId } } },
    });
    if (!target) throw new HttpError(404, 'User not found');
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true },
    });
    await audit(req, {
      action: 'reset-password',
      resourceKind: 'user',
      resourceId: target.id,
      after: { mustChangePassword: true },
    });
    res.status(201).json({ tempPassword });
  }));
  ```

  Adjust `imports` block at the top of the file (Prisma `HttpError`/`asyncHandler` are probably already imported — verify; only add what's missing). The `memberships` relation name should match the schema — if Prisma uses `tenantMemberships` or similar, use whatever the existing admin.ts handlers use to scope a query by tenant.

  Reuse whatever scoping pattern the existing `PUT /admin/rbac/users/:id` handler uses. If that handler does **not** verify tenant before mutating, prefer a simple `prisma.user.findUnique({ where: { id: req.params.id } })` and trust the admin router's superadmin gate. Pick whichever matches the file's existing style — do not invent a new tenant scoping mechanism.

- [ ] **Step 4: Run test, expect pass**

  Run: `npx vitest run server/__tests__/passwordReset.test.ts`
  Expected: PASS (4 tests).

- [ ] **Step 5: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 6: Commit**

  ```bash
  git add server/routes/admin.ts server/__tests__/passwordReset.test.ts
  git commit -m "feat(admin): reset-password endpoint for RBAC users"
  ```

---

## Task 4 — `POST /auth/change-password`

**Files:**
- Modify: `server/routes/auth.ts`
- Create: `server/__tests__/changePassword.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `server/__tests__/changePassword.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import request from 'supertest';
  import { buildApp } from '../app';
  import { prisma } from '../db';
  import { hashPassword } from '../auth/session';

  describe('POST /auth/change-password', () => {
    const app = buildApp();
    let email: string;
    let cookie: string;

    beforeAll(async () => {
      email = `change-pw-${Date.now()}@example.com`;
      const u = await prisma.user.create({
        data: {
          email, name: 'CP Test', isSuperadmin: false,
          passwordHash: await hashPassword('OldPass-123'),
          mustChangePassword: true,
        },
      });
      const adminMembership = await prisma.tenantMembership.findFirst({
        where: { user: { email: 'admin@omni.local' } },
      });
      await prisma.tenantMembership.create({
        data: { userId: u.id, tenantId: adminMembership!.tenantId },
      });
      const login = await request(app).post('/api/v1/auth/login')
        .send({ email, password: 'OldPass-123' });
      cookie = login.headers['set-cookie'][0];
    });

    it('rejects wrong current password', async () => {
      const res = await request(app).post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'wrong', newPassword: 'BrandNew-9' });
      expect(res.status).toBe(401);
    });

    it('rejects short new password', async () => {
      const res = await request(app).post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'OldPass-123', newPassword: 'short' });
      expect(res.status).toBe(400);
    });

    it('rejects reuse of current password', async () => {
      const res = await request(app).post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'OldPass-123', newPassword: 'OldPass-123' });
      expect(res.status).toBe(409);
    });

    it('changes password, clears the flag, and old password no longer works', async () => {
      const res = await request(app).post('/api/v1/auth/change-password')
        .set('Cookie', cookie)
        .send({ currentPassword: 'OldPass-123', newPassword: 'BrandNew-99' });
      expect(res.status).toBe(204);

      const row = await prisma.user.findUnique({ where: { email } });
      expect(row?.mustChangePassword).toBe(false);

      const oldLogin = await request(app).post('/api/v1/auth/login')
        .send({ email, password: 'OldPass-123' });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app).post('/api/v1/auth/login')
        .send({ email, password: 'BrandNew-99' });
      expect(newLogin.status).toBe(200);
    });
  });
  ```

- [ ] **Step 2: Run test, expect fail**

  Run: `npx vitest run server/__tests__/changePassword.test.ts`
  Expected: FAIL — endpoint 404.

- [ ] **Step 3: Implement the endpoint**

  Open `server/routes/auth.ts`. Add new imports at the top:

  ```ts
  import { hashPassword } from '../auth/session';
  ```

  (Keep existing `verifyPassword` import; `hashPassword` is in the same module.)

  Add the schema and handler at the bottom of the file, before any export-default:

  ```ts
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  });

  authRouter.post('/auth/change-password', asyncHandler(async (req, res) => {
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'New password must be at least 8 characters');
    const { currentPassword, newPassword } = parsed.data;
    if (currentPassword === newPassword) throw new HttpError(409, 'New password must differ from current');

    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user || !user.passwordHash) throw new HttpError(401, 'Invalid credentials');
    const ok = await verifyPassword(user.passwordHash, currentPassword);
    if (!ok) throw new HttpError(401, 'Invalid credentials');

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    // Rotate the session id so any pre-change cookie is invalidated.
    await destroySession(req.session.sessionId);
    const fresh = await createSession(user.id, req.session.tenantId);
    setSessionCookie(res, fresh.sessionId);
    res.status(204).end();
  }));
  ```

- [ ] **Step 4: Run test, expect pass**

  Run: `npx vitest run server/__tests__/changePassword.test.ts`
  Expected: PASS (4 tests).

- [ ] **Step 5: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 6: Commit**

  ```bash
  git add server/routes/auth.ts server/__tests__/changePassword.test.ts
  git commit -m "feat(auth): change-password endpoint"
  ```

---

## Task 5 — Expose `mustChangePassword` in `/users/me` and `/auth/me`

**Files:**
- Modify: `server/routes/platform.ts` (the `/users/me` handler at line 42)
- Modify: `server/routes/auth.ts` (the `/auth/me` handler)

- [ ] **Step 1: Extend `/users/me`**

  In `server/routes/platform.ts`, locate the handler at line 42. Update the JSON shape to include `mustChangePassword`:

  ```ts
  platformRouter.get('/users/me', asyncHandler(async (req, res) => {
    if (!req.session) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }
    const u = await prisma.user.findUnique({ where: { id: req.session.userId } });
    res.json(u && {
      id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl,
      mustChangePassword: u.mustChangePassword,
    });
  }));
  ```

- [ ] **Step 2: Extend `/auth/me`**

  In `server/routes/auth.ts` (the `/auth/me` handler, line 46), include `mustChangePassword` in the `user` object:

  ```ts
  res.json({
    user: {
      id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
    },
    tenantId: req.session.tenantId,
    roles: req.session.roles,
    roleNames: req.session.roles.map(r => r.name),
    permissions: Array.from(req.permissions ?? []),
  });
  ```

- [ ] **Step 3: Lint**

  Run: `npm run lint`
  Expected: pass (no type errors — the column exists from Task 1).

- [ ] **Step 4: Commit**

  ```bash
  git add server/routes/platform.ts server/routes/auth.ts
  git commit -m "feat(auth): expose mustChangePassword in current-user payloads"
  ```

---

## Task 6 — Frontend types + services

**Files:**
- Modify: `src/types/common.ts`
- Modify: `src/services/platformServices.ts`
- Modify: `src/services/adminService.ts`

- [ ] **Step 1: Extend the `User` type**

  In `src/types/common.ts` (the `User` interface around line 25), add the field:

  ```ts
  export interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: UserRole;
    team?: string;
    timezone: string;
    mustChangePassword?: boolean;
  }
  ```

- [ ] **Step 2: Add `authService.changePassword`**

  In `src/services/platformServices.ts`, after the `usersService` export, add:

  ```ts
  export const authService = {
    changePassword: (currentPassword: string, newPassword: string) =>
      apiFetch<void>('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
  };
  ```

  Re-export from `src/services/index.ts` if other services are re-exported there. Check `grep -n "usersService" src/services/index.ts` first; if present, add `authService` to the same export line/block.

- [ ] **Step 3: Add `adminApi.resetUserPassword`**

  Open `src/services/adminService.ts`. Find the existing `adminApi` (or whatever the file exports). Add:

  ```ts
  resetUserPassword: (userId: string) =>
    apiFetch<{ tempPassword: string }>(
      `/admin/rbac/users/${userId}/reset-password`,
      { method: 'POST' },
    ),
  ```

  Match the file's existing comma/quote/format style.

- [ ] **Step 4: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/types/common.ts src/services/platformServices.ts src/services/adminService.ts src/services/index.ts
  git commit -m "feat(services): add change-password and reset-user-password client methods"
  ```

---

## Task 7 — `<ChangePassword>` page + `<RequirePasswordChange>` gate

**Files:**
- Create: `src/routes/ChangePassword.tsx`
- Create: `src/components/auth/RequirePasswordChange.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create the change-password page**

  Create `src/routes/ChangePassword.tsx`:

  ```tsx
  import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { Button } from '@/src/components/ui/Button';
  import { Input } from '@/src/components/ui/Input';
  import { authService } from '@/src/services/platformServices';

  export function ChangePassword() {
    const navigate = useNavigate();
    const [currentPassword, setCurrent] = useState('');
    const [newPassword, setNew] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      if (newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
      if (newPassword !== confirm) { setError('New passwords do not match'); return; }
      if (newPassword === currentPassword) { setError('New password must differ from current'); return; }
      setBusy(true);
      try {
        await authService.changePassword(currentPassword, newPassword);
        navigate('/', { replace: true });
        window.location.reload();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to change password';
        setError(msg.includes('401') ? 'Current password is incorrect' : msg);
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 w-full max-w-md space-y-4">
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="text-sm text-gray-600">
            For security, please change the temporary password you received from your administrator.
          </p>
          <Input type="password" placeholder="Current password"
                 value={currentPassword} onChange={e => setCurrent(e.target.value)} required />
          <Input type="password" placeholder="New password (≥ 8 characters)"
                 value={newPassword} onChange={e => setNew(e.target.value)} required />
          <Input type="password" placeholder="Confirm new password"
                 value={confirm} onChange={e => setConfirm(e.target.value)} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Update password'}
          </Button>
        </form>
      </div>
    );
  }
  ```

  If `Input` doesn't accept `type` directly in this codebase, inspect `src/components/ui/Input.tsx` and pass through the prop your way (either via a `type` prop or via `inputProps={{ type: 'password' }}`). Mirror whatever pattern `Login.tsx` uses for the password field — that file is the reference (`src/routes/Login.tsx:130-145`).

  `window.location.reload()` after navigation is intentional: it forces `useCurrentUser` / any cached `/auth/me` resource to re-fetch with the new session cookie. If the codebase already exposes a `refreshAuthSession()` (the audit found one in `Login.tsx:40`), import and call it instead of `window.location.reload()`.

- [ ] **Step 2: Create the gate wrapper**

  Create `src/components/auth/RequirePasswordChange.tsx`:

  ```tsx
  import React from 'react';
  import { Navigate, Outlet, useLocation } from 'react-router-dom';
  import { useCurrentUser } from '@/src/context/CurrentUserContext';

  export function RequirePasswordChange() {
    const { currentUser } = useCurrentUser();
    const location = useLocation();
    if (currentUser?.mustChangePassword && location.pathname !== '/change-password') {
      return <Navigate to="/change-password" replace />;
    }
    return <Outlet />;
  }
  ```

  Adapt the import path for `useCurrentUser` to whatever the project actually exports. Run `grep -rn "export.*useCurrentUser\|CurrentUserContext" src/` to locate it. If the field is named `user` or `me` instead of `currentUser`, use that.

- [ ] **Step 3: Mount the route + gate**

  Open `src/routes/index.tsx`. Find the `RequireAuth` element block (around line 105). The current shape is:

  ```tsx
  {
    element: <RequireAuth />,
    children: [{ path: '/', element: <AppShell />, children: [ … ] }],
  }
  ```

  Restructure so `/change-password` sits inside `RequireAuth` (must be logged in) but **outside** `RequirePasswordChange` (so the user can actually reach it), while every other route is inside both:

  ```tsx
  import { ChangePassword } from './ChangePassword';
  import { RequirePasswordChange } from '../components/auth/RequirePasswordChange';

  // …
  {
    element: <RequireAuth />,
    children: [
      { path: '/change-password', element: <ChangePassword /> },
      {
        element: <RequirePasswordChange />,
        children: [{
          path: '/',
          element: <AppShell />,
          children: [ /* existing children unchanged */ ],
        }],
      },
    ],
  },
  ```

  Keep every existing child route under `<AppShell />` exactly as it was.

- [ ] **Step 4: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 5: Smoke test**

  Run `npm run dev:all`. In a fresh incognito window:
  1. Log in as `admin@omni.local` / `demo` — should reach the dashboard normally (admin's `mustChangePassword` is false).
  2. (Manual DB tweak) `UPDATE "User" SET "mustChangePassword" = true WHERE email = 'admin@omni.local';`. Reload. Every link should redirect to `/change-password`.
  3. Change password to `demo1234`. After redirect to `/`, you're in. Refresh — stays in. Revert the DB tweak when done.

- [ ] **Step 6: Commit**

  ```bash
  git add src/routes/ChangePassword.tsx src/components/auth/RequirePasswordChange.tsx src/routes/index.tsx
  git commit -m "feat(auth): /change-password page + first-login gate"
  ```

---

## Task 8 — Admin Users page: chain reset on create + reset action + modal

**Files:**
- Create: `src/components/admin/NewPasswordModal.tsx`
- Modify: `src/routes/admin/Users.tsx`

- [ ] **Step 1: Create the modal**

  Create `src/components/admin/NewPasswordModal.tsx`:

  ```tsx
  import React, { useState } from 'react';
  import { Button } from '@/src/components/ui/Button';

  export function NewPasswordModal({
    tempPassword,
    onClose,
  }: { tempPassword: string; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
          <h2 className="text-lg font-semibold">Temporary password generated</h2>
          <p className="text-sm text-gray-600">
            Share this with the user via a secure channel. It will not be shown again.
            The user must change it at first login.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm break-all">
              {tempPassword}
            </code>
            <Button type="button" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>I&apos;ve saved it</Button>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Wire into `Users.tsx`**

  Open `src/routes/admin/Users.tsx`. Read the existing create handler that calls `rbacService.upsertRbacUser(...)` (around line 59–63 per the audit doc).

  Add at top:
  ```tsx
  import { adminApi } from '@/src/services/adminService'; // or whatever path is canonical
  import { NewPasswordModal } from '@/src/components/admin/NewPasswordModal';
  ```

  Add state inside the component:
  ```tsx
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  ```

  Modify the **create** branch of the existing save handler so that after a successful `upsertRbacUser`, it also calls reset (only on the *create* path, not on edit):
  ```tsx
  const saved = await rbacService.upsertRbacUser(input);
  if (isCreating) {                                  // adapt to the existing flag
    const { tempPassword } = await adminApi.resetUserPassword(saved.id);
    setTempPassword(tempPassword);
  }
  ```

  Add a **row-level Reset action**. In the row's actions cell, insert a button next to the existing Edit/Delete:
  ```tsx
  <Button variant="ghost" onClick={async () => {
    const { tempPassword } = await adminApi.resetUserPassword(user.id);
    setTempPassword(tempPassword);
  }}>
    Reset password
  </Button>
  ```
  Use whatever button variant + spacing the existing actions cell uses; do not change the table layout.

  Render the modal once at the bottom of the component JSX:
  ```tsx
  {tempPassword && (
    <NewPasswordModal tempPassword={tempPassword} onClose={() => setTempPassword(null)} />
  )}
  ```

- [ ] **Step 3: Lint**

  Run: `npm run lint`
  Expected: pass.

- [ ] **Step 4: Smoke test**

  `npm run dev:all`. Visit `/admin/users`:
  1. Create a new user → modal appears with a `Adj-Noun-NNN` password.
  2. Copy it. Log out, log in as the new user with that password → bounces to `/change-password`.
  3. Set a new password → reaches dashboard.
  4. Back as admin, click "Reset password" on any row → modal appears with a new temp password.

- [ ] **Step 5: Commit**

  ```bash
  git add src/components/admin/NewPasswordModal.tsx src/routes/admin/Users.tsx
  git commit -m "feat(admin): generate temp password on user create + reset action"
  ```

---

## Self-Review

**Spec coverage:**
- Decision 1 (system-generated password): Tasks 2 + 3.
- Decision 2 (admin can reset existing): Task 3 + Task 8 row action.
- Decision 3 (hard gate first login): Task 7 (`RequirePasswordChange`, route restructure).
- Decision 4 (≥ 8 char policy): enforced server-side in Task 4 and client-side in Task 7.
- New `mustChangePassword` column: Task 1.
- Audit logging without leaking password: Task 3 step 3 (`after: { mustChangePassword: true }` only).
- Session rotation on change: Task 4 step 3 (`destroySession` + `createSession`).
- `/auth/me` and `/users/me` expose the flag: Task 5.
- Frontend types + services: Task 6.

**Placeholder scan:** No "TBD" / "appropriate" / "similar to". Every code-changing step contains the code.

**Type consistency:**
- `tempPassword` is the field name on both server response (Task 3) and client consumption (Task 6 service, Task 8 modal).
- `mustChangePassword` is the field name everywhere (Prisma, `/users/me`, `/auth/me`, frontend type, gate wrapper).
- `resetUserPassword(userId)` matches across `adminService.ts` and call sites in `Users.tsx`.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-15-new-user-onboarding.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, verify between tasks, fast iteration.

**2. Inline Execution** — I execute tasks in this session with checkpoints for review.

Which approach?
