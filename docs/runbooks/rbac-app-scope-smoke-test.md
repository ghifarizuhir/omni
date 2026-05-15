# RBAC × App Scope — Smoke Test Runbook

End-to-end manual verification of Plans A–F. Run after every merge that touches `server/scope/`, `server/repositories/applicationMembership.ts`, `prisma/schema.prisma`, or `src/lib/scope/`.

**Reference spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../superpowers/specs/2026-05-15-rbac-app-scope-design.md)

**Time budget:** 30–45 minutes for the full sweep.

---

## 0. Prerequisites

```bash
docker compose up -d postgres redis
npm install
npm run db:migrate
npm run db:seed:prod          # creates admin@omni.local / demo + functional roles
```

Confirm the seed log includes:
- `[seed.prod] functional roles upserted (3): PLATFORM_ADMIN, NOC_OPERATOR, AUDITOR`
- `[seed.prod] granted PLATFORM_ADMIN functional role to admin user …`

Start the stack:

```bash
npm run dev:all
```

---

## 1. Static checks

| Check | Command | Expected |
|---|---|---|
| TypeScript | `npm run lint` | `tsc` clean + `eslint server/routes/**/*.ts --max-warnings 0` clean |
| Frontend build | `npm run build` | `✓ built` with no errors |
| Prisma schema | `npx prisma validate` | `The schema at prisma/schema.prisma is valid 🚀` |
| Migration status | `npx prisma migrate status` | `Database schema is up to date!` |

If any of these fail, stop — the runbook only works on a known-good build.

---

## 2. Plan A — Schema foundation

### 2.1 Enums + columns exist

```bash
psql "$DATABASE_URL" -c "\d \"ApplicationTeam\"" | grep role
# → role | ApplicationTeamRole | not null default 'CONTRIBUTOR'

psql "$DATABASE_URL" -c "\dT+ \"ApplicationTeamRole\"" | grep -E "OWNER|CONTRIBUTOR|VIEWER"
# → all three present
```

### 2.2 Functional roles seeded

```bash
psql "$DATABASE_URL" -c "SELECT code FROM \"FunctionalRole\" WHERE \"tenantId\" = 'tenant-demo';"
# → AUDITOR, NOC_OPERATOR, PLATFORM_ADMIN
```

### 2.3 Unit tests

```bash
npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-foundation.test.ts
# → 5 passed
```

---

## 3. Plan B — Scope enforcement (CMDB pilot + modules)

### 3.1 Integration tests

Run each file individually so vitest worker isolation prevents fixture interaction:

```bash
npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-context.test.ts
# → unit + persona tests pass

npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-cmdb.test.ts
# → 4 cases: memberA succeeds, memberB 403, NOC bypass, admin bypass

npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-incidents.test.ts
# → 5 cases incl. NOC can setStatus but NOT resolve

npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/scope-changes.test.ts
# → 3 cases for Change create
```

### 3.2 Manual cross-scope write attempt (curl)

Log in as a non-admin user that is NOT a member of any app:

```bash
COOKIE=$(curl -s -i -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"operator@omni.local","password":"demo"}' \
  | grep -i '^set-cookie' | sed 's/Set-Cookie: //;s/;.*//')

# Try to PATCH a CI you don't own — expect 403 scope_violation.
curl -i -X PATCH http://localhost:3001/api/v1/cis/CI-SEED-DEMO \
  -H 'Content-Type: application/json' -H "Cookie: $COOKIE" \
  -d '{"name":"attempted rogue rename"}'
# → HTTP/1.1 403 { "error": "scope_violation", "module": "cmdb", "action": "update", ... }
```

(`operator@omni.local` is not seeded by default — adapt to whichever non-admin you have. The point is: a user without OWNER/CONTRIBUTOR membership and without `PLATFORM_ADMIN` gets 403.)

### 3.3 ESLint guard catches direct prisma in routes

Quick negative test:

```bash
echo "import { prisma } from '../db';" >> server/routes/cmdb.ts
npm run lint
# → eslint reports no-restricted-imports error on cmdb.ts
git checkout -- server/routes/cmdb.ts
```

---

## 4. Plan C — Backfill + Data Quality

### 4.1 Preflight script

```bash
npx dotenv-cli -e .env.local -- npx tsx prisma/preflightScopeNotNull.ts
# → 7 JSON lines (one per module) + "Preflight CLEAN: 0 orphans total" on stderr, exit 0
```

### 4.2 Backfill script (idempotent)

```bash
npx dotenv-cli -e .env.local -- npx tsx prisma/backfillAppScope.ts
# Dry-run shows current scope distribution per module.

npx dotenv-cli -e .env.local -- npx tsx prisma/backfillAppScope.ts --apply
# Re-run: counts unchanged (idempotent).
```

### 4.3 Admin UI

1. Open <http://localhost:3000/admin/data-quality> as admin.
2. KPI strip shows `Total · Orphan` per module.
3. Click each tab — table renders (even if empty after Plan F).
4. If a module has orphans: select rows, pick app from "Bulk assign", click assign — list refreshes minus those rows.
5. Audit smoke:
   ```bash
   psql "$DATABASE_URL" -c "SELECT action, \"scopeMode\", \"resourceKind\" FROM \"AuditLog\" WHERE action LIKE 'data_quality%' ORDER BY \"createdAt\" DESC LIMIT 5;"
   # → entries with action='data_quality.assign' and scopeMode='admin'
   ```

---

## 5. Plan D — Membership management

### 5.1 Tests

```bash
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/admin-app-membership.test.ts \
  server/__tests__/applications-catalog.test.ts
# → 19 passed (16 membership + 3 catalog)
```

### 5.2 Admin UI: manage memberships

1. Open <http://localhost:3000/admin/applications> as admin.
2. Click "Manage" on any app → land on `/admin/applications/:appId`.
3. Confirm Teams table renders with role badges.
4. Click "+ Add team": pick a team not yet a member, role `CONTRIBUTOR`, save → row appears.
5. Change the new team's role to `VIEWER` via the dropdown → saves silently.
6. Remove the new team → row disappears.
7. Try to demote the only `OWNER` team → expect inline 409 `last_owner` error pill.

### 5.3 Catalog page

1. Open <http://localhost:3000/applications/catalog> (any authenticated user via UserMenu link).
2. Cards render with code, name, criticality badge.
3. As admin, you see `You're a member` for the demo app.
4. Log in as a non-member of the demo app: same card shows `Not a member`.

### 5.4 Application Owner self-service

1. As admin, give a non-admin user's team OWNER role on a test app.
2. Log out, log in as that user.
3. Navigate to `/admin/applications/:appId` (or via "Manage").
4. Confirm you can add/remove a team, even without `system.admin`.

---

## 6. Plan E — AppScopeSwitcher UX (behind feature flag)

### 6.1 Enable the flag

In browser DevTools console (any authenticated user):

```js
localStorage.setItem('feature.app_scope_ui', 'true');
location.reload();
```

### 6.2 TopBar switcher

1. TopBar shows `Scope: All my apps` chip on the left.
2. Click → dropdown opens. Confirm:
   - "All my apps" at the top.
   - Your apps listed under "All apps".
   - Search box appears only if you have >10 apps.
3. Click an app → chip changes to its name + criticality color (P1=red, P2=amber, P3=yellow, P4=emerald).
4. Pin the app (star icon) → reload page → app appears under "Pinned" section, still selected.
5. Verify persistence:
   ```js
   localStorage.getItem(`ois.scope.${SESSION_USER_ID}`);
   // → '{"kind":"app","appId":"app-..."}'
   localStorage.getItem(`ois.scope.${SESSION_USER_ID}.pinned`);
   // → '["app-..."]'
   ```

### 6.3 CMDB list scope filter

1. Open <http://localhost:3000/cmdb>.
2. Confirm `PageScopeChip` appears next to "CMDB Explorer" title with current scope.
3. CI list filtered: only rows where `primaryApplicationId === scope.appId` (legacy null rows don't exist post-Plan F).
4. Switch scope to "All my apps" → unfiltered list.

### 6.4 Change form pre-fill + mismatch modal

1. With scope set to App A, navigate to <http://localhost:3000/changes/new>.
2. Step through wizard to Step 3 (Review).
3. Confirm Application section shows `Application: App A` (read-only, auto-filled).
4. Now manually change the picker to App B (if the wizard has an edit affordance — current MVP keeps the field read-only when source is `'auto'`, in which case skip steps 5–6 and instead set scope to "All my apps" first, then start a new wizard with picker required).
5. Submit → `ScopeMismatchModal` opens: *"You're submitting this to App B, but your current scope is App A. Continue?"*
6. Click `Confirm submit` → submission proceeds, change is created against App B.
7. Click `Cancel` (re-run scenario) → form stays open, no POST fires.

### 6.5 Telemetry hook

DevTools console should show on every switch:
```
[scope] switch { from: 'all', to: { kind: 'app', appId: 'app-...' } }
```

### 6.6 Disable the flag, confirm graceful degradation

```js
localStorage.removeItem('feature.app_scope_ui');
location.reload();
```

- TopBar: no scope chip.
- CMDB: no chip next to title, unfiltered list.
- New Change wizard: no Application field, no mismatch modal.
- All previous functionality unchanged.

---

## 7. Plan F — NOT NULL + always-on enforcement

### 7.1 NOT NULL constraint enforced

```bash
psql "$DATABASE_URL" -c "INSERT INTO \"ConfigurationItem\"(\"id\",\"tenantId\",\"publicId\",\"name\",\"type\",\"status\",\"environment\",\"criticality\",\"ownerTeamId\",\"health\",\"attributes\",\"tags\",\"createdAt\",\"updatedAt\") VALUES ('test-nn','tenant-demo','TEST-NN','test','server','active','prod','P3','none','healthy','{}','[]',now(),now());"
# → ERROR: null value in column "primaryApplicationId" violates not-null constraint
```

### 7.2 Env var deprecation

```bash
SCOPE_ENFORCEMENT_MODE=off npm run server
# Server logs: "SCOPE_ENFORCEMENT_MODE is deprecated; only enforce is honored"
# Behavior: identical to enforce.
```

### 7.3 No bypass branches remain

```bash
grep -rn "applyEnforcement" server/routes/
# → no matches in server/routes/ (it lives only in scope/enforcement.ts)

grep -rn "'legacy'\|'bypass'" server/scope/scopedDb.ts
# → no matches (the union no longer includes those values)
```

### 7.4 Audit history preserved

```bash
psql "$DATABASE_URL" -c "SELECT DISTINCT \"scopeMode\" FROM \"AuditLog\" WHERE \"scopeMode\" IS NOT NULL;"
# → historical legacy/bypass values may still be present (Plan F kept them).
# → new writes use only member/owner/noc/admin.
```

---

## 8. Full regression sweep (after smoke completes)

```bash
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/scope-foundation.test.ts \
  server/__tests__/scope-context.test.ts \
  server/__tests__/scope-cmdb.test.ts \
  server/__tests__/scope-incidents.test.ts \
  server/__tests__/scope-changes.test.ts \
  server/__tests__/admin-app-membership.test.ts \
  server/__tests__/applications-catalog.test.ts \
  server/__tests__/admin-data-quality.test.ts \
  server/__tests__/backfill-scope.test.ts \
  server/__tests__/preflight-scope-not-null.test.ts
```

Expected total: ~60+ passing tests across the 10 files. Note that running them all in one vitest invocation can have fixture-order flakiness; run each file individually for a clean result.

---

## 9. Sign-off checklist

- [ ] Section 1 — static checks all clean.
- [ ] Section 2 — Plan A foundation present (enum + roles + tests).
- [ ] Section 3 — Plan B enforcement integration tests pass; cross-scope curl is 403.
- [ ] Section 4 — Plan C preflight + backfill + Data Quality page work end-to-end.
- [ ] Section 5 — Plan D admin UI add/change/remove + Application Owner self-service + Catalog page.
- [ ] Section 6 — Plan E switcher + chip + form pre-fill + mismatch modal + telemetry; flag-off path graceful.
- [ ] Section 7 — Plan F: DB rejects NULL inserts; no `applyEnforcement` in routes; env deprecation warning fires.
- [ ] Section 8 — regression sweep green.

Once all sections green: the rollout is production-ready for the current deploy. Capture screenshots of sections 5–6 for the release notes.

---

## 10. Known pre-existing failures (NOT regressions)

These failures are seed-data gaps in the dev DB and predate the RBAC × App Scope work. They show up only when running the full test suite without first hydrating fixtures:

- `server/__tests__/events-status.test.ts` — "seed has no non-resolved events to clone"
- `server/__tests__/incidents-update.test.ts` — "seed has no open incidents to clone"
- `server/__tests__/requests-writes.test.ts` — "seed has no request with an active approval step"
- `server/__tests__/ci-edit.test.ts > caller with cmdb.read only → 403` — needs ≥2 users seeded; only admin exists in default seed

To resolve in CI: extend `seed.prod.ts` (or a dedicated `seed.test.ts`) with fixtures these tests expect. Out of scope for the RBAC rollout.
