# New-User Onboarding (Admin-Provisioned Password) — Design

**Date:** 2026-05-15
**Status:** Approved (pending spec review)

## Problem

Admin-created users today cannot log in. `upsertRbacUser` (`server/repositories/rbacOrg.ts:172`) never writes `passwordHash`, and `POST /auth/login` rejects users whose `passwordHash` is null (`server/routes/auth.ts:20`). The admin UI has no password field, so there is no path to set one.

## Decision summary

| # | Decision |
|---|---|
| 1 | Server **generates** the initial password (memorable adjective-noun-3digit, e.g. `Brisk-Falcon-417`) and returns it **once** to the admin. |
| 2 | Same flow doubles as **admin password reset** for any existing user. |
| 3 | First login is **hard-gated**: until the user changes their password, every route redirects to `/change-password`. |
| 4 | New password policy: **≥ 8 characters**, no complexity rules (NIST-style). |

## Architecture

Three additions on top of existing auth + RBAC:

1. **Schema** — add `User.mustChangePassword Boolean @default(false)`.
2. **Admin endpoint** — `POST /admin/rbac/users/:id/reset-password`. Generates a temp password, argon2-hashes it, writes `passwordHash` + `mustChangePassword = true`, returns `{ tempPassword: "..." }` once.
3. **User endpoint** — `POST /auth/change-password` with `{ currentPassword, newPassword }`. Verifies current, enforces policy, hashes new, clears `mustChangePassword`, rotates the session id.

## Data flow

```
Admin creates user
  PUT  /api/v1/admin/rbac/users/:id            (existing — RBAC fields)
  POST /api/v1/admin/rbac/users/:id/reset-password    (new)
  ← 201 { tempPassword: "Brisk-Falcon-417" }
  modal: copy + "I've saved it"

New user logs in
  POST /api/v1/auth/login                       (existing)
  GET  /api/v1/users/me  → mustChangePassword: true
  RequirePasswordChange wrapper → redirect to /change-password
  POST /api/v1/auth/change-password { currentPassword, newPassword }
  ← 204 (session rotated)
  navigate('/')
```

## API contracts

### `POST /admin/rbac/users/:id/reset-password`
- Auth: superadmin (existing `requireSuperadmin` on admin router).
- Body: none.
- 201 → `{ tempPassword: string }`.
- 404 if user not in tenant.
- Audit log: `action: 'reset-password'`, **never include the plaintext or hash** in the audit payload.

### `POST /auth/change-password`
- Auth: any authenticated session.
- Body: `{ currentPassword: string, newPassword: string }`.
- 204 on success. Rotates session id; sets a new cookie.
- 400 if `newPassword.length < 8`.
- 401 if `currentPassword` does not verify.
- 409 if `newPassword === currentPassword`.

### `GET /users/me` (existing — extend response)
- Add field `mustChangePassword: boolean` (server-derived from the user row).

## Password generator

`server/lib/passwordGen.ts`:

```ts
import crypto from 'node:crypto';

const ADJECTIVES = ['Brisk','Calm','Clever','Bold','Bright','Quick','Quiet','Sharp','Steady','Swift','Vivid','Warm'];
const NOUNS      = ['Falcon','Otter','Panda','Heron','Marlin','Lynx','Quail','Tiger','Wolf','Yak','Zebra','Crane'];

export function generateTempPassword(): string {
  const adj   = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const noun  = NOUNS[crypto.randomInt(NOUNS.length)];
  const digit = String(crypto.randomInt(100, 1000));
  return `${adj}-${noun}-${digit}`;
}
```

Resulting entropy: 12 × 12 × 900 ≈ 130k combinations. Acceptable because this password is single-use, short-lived, and bound to the user's email — not a persistent secret. (We can swap to a higher-entropy generator later without changing call sites.)

## Frontend flow

| Step | File | Change |
|---|---|---|
| Admin form chain | `src/routes/admin/Users.tsx` | On create success, call `adminApi.resetPassword(id)`; render `<NewPasswordModal>` with copy button + acknowledge. |
| Reset action | `src/routes/admin/Users.tsx` row menu | Adds "Reset password" entry → same modal. |
| Login | `src/routes/Login.tsx` | No change. |
| Gate | `src/components/auth/RequirePasswordChange.tsx` (new) | Inside `RequireAuth`; reads `useCurrentUser()`; if `mustChangePassword`, `<Navigate to="/change-password" replace />` unless path is `/change-password` or `/logout`. |
| Change page | `src/routes/ChangePassword.tsx` (new) | Three fields (current, new, confirm); client validation (≥8, match); on submit calls `authService.changePassword`; navigate('/'). |
| Routes | `src/routes/index.tsx` | Add `/change-password` inside `RequireAuth` but OUTSIDE the `RequirePasswordChange` wrapper so users can reach it. |
| Types | `src/types/common.ts` | Add `mustChangePassword?: boolean` to `User`. |
| Services | `src/services/adminService.ts`, `src/services/platformServices.ts` | Add `adminApi.resetPassword(userId)` and `authService.changePassword(currentPassword, newPassword)`. |

### `NewPasswordModal` UX

- Heading: "Temporary password generated"
- Subtext: "Share this with the user via a secure channel. It will not be shown again."
- Monospace password block with copy button.
- Primary CTA: "I've saved it" — closes the modal.
- Closing the modal (Esc or backdrop) is allowed but logs a console warning.

## Error handling

- **Reset endpoint:** rejects if caller is not superadmin (existing middleware). Returns the same 404 for "user not in tenant" so admins can't probe for user existence cross-tenant.
- **Change-password endpoint:** explicit 400/401/409 codes per spec above; never echoes the submitted password back in the error body.
- **Audit:** both endpoints write to the existing audit log with the user id, never the password.

## Testing

- `server/__tests__/passwordReset.test.ts`
  - non-superadmin → 403
  - superadmin → 201, body has `tempPassword`, login with that password works, `mustChangePassword === true` in the user row
  - resetting a user that doesn't exist → 404
- `server/__tests__/changePassword.test.ts`
  - wrong current → 401
  - new < 8 chars → 400
  - new === current → 409
  - success → 204; `mustChangePassword === false`; old password no longer authenticates; new password does

No frontend tests in this scope (the codebase has none for routes today).

## Security notes

- Temp password is sent over the same channel as the admin's session (HTTPS in prod). It is never persisted server-side in plaintext or in audit logs.
- Session is rotated on successful change-password to invalidate any captured pre-change cookie.
- `mustChangePassword` is derived from the user row each request; flipping it client-side has no effect.

## Out of scope

- Email delivery (no SMTP yet — admin hands the password off out-of-band).
- Self-service password reset by end users (forgot-password flow). Tracked as a separate spec.
- Password expiration / rotation policy.
- 2FA / WebAuthn.
- Real LLM in `/ai` (unrelated, tracked elsewhere).
