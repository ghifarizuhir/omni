# Audit Mock-Data Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every MOCK/STATIC/PARTIAL finding in `docs/AUDIT-MOCK-DATA.md` by wiring the affected pages to real APIs and replacing hard-coded values with derived data.

**Architecture:** Pure incremental fixes on top of the existing stack — React 19 SPA (`src/`) + Express/Prisma API (`server/`). Frontend reads via `useResource()` from `src/services/*Service.ts`; writes via `apiFetch` in the same services. Where backend endpoints are missing, add them under the existing routers (`server/routes/platform.ts`, `itsm.ts`, `measurement` block of `platform.ts`) and create the matching service method.

**Tech Stack:** React 19, Vite, TypeScript, Express, Prisma, Vitest.

**Conventions:**
- All frontend data fetches go through `useResource(() => service.method(), [deps])`.
- No new test infrastructure — add Vitest tests next to existing ones where they already exist; for files that have no sibling test, verify with `npm run lint` + a manual `curl` of the new endpoint or `npm run dev:all` smoke check.
- Each task ends with a single commit. Use Conventional Commit prefixes (`fix:`, `feat:`).

---

## File Structure

**Modified files (frontend):**

- `src/routes/incidents/IncidentQueue.tsx` — drop `NOW` constant
- `src/routes/requests/RequestQueue.tsx` — drop `NOW` constant
- `src/routes/requests/RequestDetail.tsx` — drop `NOW` constant; wire comment POST
- `src/routes/continuity/DRPlans.tsx` — drop `TODAY` constant
- `src/routes/changes/NewChange.tsx` — replace hard-coded plannedStart/End defaults
- `src/components/layout/UserMenu.tsx` — read role + team from `/users/me`
- `src/components/layout/UserSwitcher.tsx` — drop "(mock)" label
- `src/routes/Dashboard.tsx` — derive On-Call card from `/on-call/schedules`
- `src/routes/platform/Profile.tsx` — replace `SARAH_CHEN`/`INITIAL_TOKENS` with `usersService.current()` + `apiTokensService.list()`
- `src/routes/platform/Settings.tsx` — same; pull channel addresses from preferences
- `src/routes/availability/SLATargets.tsx` — derive tab counts from data
- `src/routes/availability/Outages.tsx` — derive tab/severity counts from data
- `src/routes/capacity/CapacityDashboard.tsx` — derive KPI cards from data
- `src/routes/capacity/CapacityForecast.tsx` — derive accuracy/top-driver lists from data
- `src/routes/measurement/ExecutiveDashboard.tsx` — fetch `/measurement/exec-summary`
- `src/routes/measurement/ReportBuilder.tsx` — submit via `measurementService.createReport()`
- `src/routes/ai/AiWorkspace.tsx` — call `aiService.sendMessage()` instead of `getMockAiResponse()`

**Modified files (backend):**

- `server/routes/platform.ts` — add `/users/me/tokens` CRUD, `/users/me/channels`, `/measurement/exec-summary`, `POST /measurement/reports`, `POST /ai/sessions/:id/messages`
- `server/routes/itsm.ts` — add `POST /requests/:publicId/comments`

**Modified files (services):**

- `src/services/platformServices.ts` — add `apiTokensService`, extend `usersService` (`updateMe`, `channels`), extend `measurementService` (`execSummary`, `createReport`), extend `aiService` (`sendMessage`)
- `src/services/itsmServices.ts` — add `requestsService.addComment`

**Prisma:**

- `prisma/schema.prisma` — add `ApiToken`, `NotificationChannel`, `RequestComment` models if not already present (verify first; only add if missing)

---

## Task 1 — Drop hard-coded `NOW`/`TODAY` constants

**Files:**
- Modify: `src/routes/incidents/IncidentQueue.tsx:59` (`NOW`)
- Modify: `src/routes/requests/RequestQueue.tsx:38` (`NOW`)
- Modify: `src/routes/requests/RequestDetail.tsx:24` (`NOW`)
- Modify: `src/routes/continuity/DRPlans.tsx:12` (`TODAY`)

- [ ] **Step 1: Replace `NOW` constants**

  In each of the four files, locate the constant and replace usage with a value computed inside the component (so it re-evaluates each render):

  ```ts
  // BEFORE (top-of-module):
  const NOW = new Date('2026-05-09T10:00:00Z').getTime();

  // AFTER: delete the module-level constant.
  // Inside the component body, near other useMemo calls:
  const now = useMemo(() => Date.now(), []);
  ```

  Then replace every reference `NOW` → `now` inside that file. Use the same pattern for `TODAY` in `DRPlans.tsx`:

  ```ts
  const today = useMemo(() => new Date(), []);
  ```

- [ ] **Step 2: Lint**

  Run: `npm run lint`
  Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/routes/incidents/IncidentQueue.tsx src/routes/requests/RequestQueue.tsx src/routes/requests/RequestDetail.tsx src/routes/continuity/DRPlans.tsx
  git commit -m "fix(ui): replace hard-coded NOW/TODAY constants with runtime values"
  ```

---

## Task 2 — Default `NewChange` planned window to now+1h / now+3h

**Files:**
- Modify: `src/routes/changes/NewChange.tsx:41-60`

- [ ] **Step 1: Replace hard-coded dates**

  Locate the `INITIAL` form-state object (lines 41–60). Replace the literal date strings with a helper:

  ```tsx
  function isoLocal(offsetMs: number): string {
    const d = new Date(Date.now() + offsetMs);
    // strip seconds + tz suffix so <input type="datetime-local"> accepts it
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  const HOUR = 60 * 60 * 1000;

  const INITIAL = {
    // ...other fields unchanged...
    plannedStart: isoLocal(HOUR),
    plannedEnd: isoLocal(3 * HOUR),
  };
  ```

  Because `INITIAL` is module-scoped, evaluation happens once at import. Move it inside the component:

  ```tsx
  export function NewChange() {
    const [state, setState] = useState(() => ({
      // ...
      plannedStart: isoLocal(HOUR),
      plannedEnd: isoLocal(3 * HOUR),
    }));
    // ...
  }
  ```

- [ ] **Step 2: Lint**

  Run: `npm run lint`. Expected: pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/routes/changes/NewChange.tsx
  git commit -m "fix(changes): default planned window to now+1h..now+3h"
  ```

---

## Task 3 — Wire `UserMenu` / `UserSwitcher` to live user data

**Files:**
- Modify: `src/components/layout/UserMenu.tsx:28-34`
- Modify: `src/components/layout/UserSwitcher.tsx:38`

- [ ] **Step 1: Replace hard-coded role label**

  Inspect `UserMenu.tsx`. Currently:

  ```tsx
  <div className="text-xs text-gray-500">Admin · Platform Engineering</div>
  ```

  Replace with derived data from the `usersService.current()` call already at line 13:

  ```tsx
  const teamLabel = user?.team
    ? teams?.find(t => t.id === user.team)?.name ?? 'Unassigned'
    : 'Unassigned';
  // ...
  <div className="text-xs text-gray-500">{roleLabel(user?.role)} · {teamLabel}</div>
  ```

  Add a tiny pure helper inside the same file:

  ```tsx
  function roleLabel(role: string | undefined): string {
    if (!role) return 'User';
    return role.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  ```

  Add `teamsService.list()` via `useResource`:

  ```tsx
  import { usersService, teamsService } from '@/src/services/platformServices';
  const { data: teams } = useResource(() => teamsService.list(), []);
  ```

- [ ] **Step 2: Remove "(mock)" label**

  In `UserSwitcher.tsx:38`, replace `"Switch user (mock)"` with `"Switch user"`.

- [ ] **Step 3: Lint + manual smoke**

  Run: `npm run lint`. Then `npm run dev:all`, log in, open user menu — role and team should reflect the seeded superadmin.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/layout/UserMenu.tsx src/components/layout/UserSwitcher.tsx
  git commit -m "fix(layout): derive UserMenu role/team from /users/me; drop mock label"
  ```

---

## Task 4 — Derive `Dashboard` On-Call card from `/on-call/schedules`

**Files:**
- Modify: `src/routes/Dashboard.tsx:458-475`

- [ ] **Step 1: Add resource fetch**

  Near the other `useResource` calls (lines 43–49), add:

  ```tsx
  import { onCallService } from '@/src/services/platformServices';
  const { data: schedules } = useResource(() => onCallService.schedules(), []);
  ```

- [ ] **Step 2: Replace hard-coded entries**

  Find the JSX block at lines 458–475 that renders `David Okafor / Yuki Tanaka / Aisha Khan` and `Sarah Chen (next handover)`. Replace with:

  ```tsx
  {(schedules ?? []).slice(0, 3).map(s => (
    <div key={s.id} className="flex items-center justify-between text-sm py-1">
      <span className="text-gray-700">{s.serviceName ?? s.scope}</span>
      <span className="font-medium">{s.currentUserName ?? '—'}</span>
    </div>
  ))}
  {schedules && schedules.length === 0 && (
    <div className="text-xs text-gray-500">No on-call schedules configured.</div>
  )}
  ```

  If `OnCallSchedule` lacks `currentUserName` / `serviceName`, inspect `src/types/platform.ts` and use whichever fields exist (typically `currentResponder` and `scopeLabel`). Pick the closest two fields available — do not invent new ones.

- [ ] **Step 3: Lint + smoke**

  `npm run lint`. Run `npm run dev:all`, open `/` — On-Call card should show real data or the empty fallback.

- [ ] **Step 4: Commit**

  ```bash
  git add src/routes/Dashboard.tsx
  git commit -m "fix(dashboard): bind On-Call card to /on-call/schedules"
  ```

---

## Task 5 — Backend: API token CRUD + notification channels

**Files:**
- Modify: `prisma/schema.prisma` — add models (only if missing)
- Modify: `server/routes/platform.ts` — add endpoints
- Test: `server/__tests__/userTokens.test.ts` (create)

- [ ] **Step 1: Verify Prisma models**

  Run: `grep -n "model ApiToken\|model NotificationChannel" prisma/schema.prisma`
  If both exist, skip to Step 3. Otherwise:

- [ ] **Step 2: Add Prisma models**

  Append to `prisma/schema.prisma`:

  ```prisma
  model ApiToken {
    id         String   @id @default(cuid())
    tenantId   String
    userId     String
    name       String
    tokenHash  String   @unique
    prefix     String   // first 8 chars, shown in UI
    createdAt  DateTime @default(now())
    lastUsedAt DateTime?
    revokedAt  DateTime?
    user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([tenantId, userId])
  }

  model NotificationChannel {
    id        String  @id @default(cuid())
    tenantId  String
    userId    String
    kind      String  // 'email' | 'sms' | 'slack'
    address   String
    verified  Boolean @default(false)
    user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([userId, kind])
  }
  ```

  Add the reverse relations on `User`:

  ```prisma
  apiTokens            ApiToken[]
  notificationChannels NotificationChannel[]
  ```

  Run: `npm run db:migrate -- --name add_user_tokens_and_channels`
  Expected: migration applied, schema regenerated.

- [ ] **Step 3: Write the failing test**

  Create `server/__tests__/userTokens.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import request from 'supertest';
  import { buildApp } from '../app';
  import { signSessionCookie } from './_helpers/auth';

  describe('user API tokens', () => {
    const app = buildApp();
    const cookie = signSessionCookie({ userId: 'seed-admin', tenantId: 'root' });

    it('lists, creates, and revokes a token', async () => {
      const list1 = await request(app).get('/api/v1/users/me/tokens').set('Cookie', cookie);
      expect(list1.status).toBe(200);
      expect(Array.isArray(list1.body)).toBe(true);

      const created = await request(app).post('/api/v1/users/me/tokens')
        .set('Cookie', cookie).send({ name: 'CI bot' });
      expect(created.status).toBe(201);
      expect(created.body.token).toMatch(/^ois_/);
      const id = created.body.id;

      const revoked = await request(app).delete(`/api/v1/users/me/tokens/${id}`).set('Cookie', cookie);
      expect(revoked.status).toBe(204);
    });
  });
  ```

  If `server/__tests__/_helpers/auth.ts` does not exist, look at any sibling test to copy the auth-cookie pattern actually used in this repo and adapt — do not invent a helper that doesn't exist.

- [ ] **Step 4: Run test (expect fail)**

  Run: `npx vitest run server/__tests__/userTokens.test.ts`
  Expected: FAIL with 404 / not implemented.

- [ ] **Step 5: Implement the endpoints**

  In `server/routes/platform.ts`, add (after the existing `/users/me` route):

  ```ts
  import crypto from 'node:crypto';

  platformRouter.get('/users/me/tokens', requireAuth, asyncHandler(async (req, res) => {
    const tokens = await prisma.apiToken.findMany({
      where: { tenantId: req.tenantId, userId: req.userId, revokedAt: null },
      select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tokens);
  }));

  platformRouter.post('/users/me/tokens', requireAuth, asyncHandler(async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    const raw = 'ois_' + crypto.randomBytes(24).toString('base64url');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const row = await prisma.apiToken.create({
      data: { tenantId: req.tenantId, userId: req.userId, name, tokenHash: hash, prefix: raw.slice(0, 12) },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });
    res.status(201).json({ ...row, token: raw }); // raw shown only at creation
  }));

  platformRouter.delete('/users/me/tokens/:id', requireAuth, asyncHandler(async (req, res) => {
    await prisma.apiToken.updateMany({
      where: { id: req.params.id, tenantId: req.tenantId, userId: req.userId },
      data: { revokedAt: new Date() },
    });
    res.status(204).end();
  }));
  ```

  Adapt `requireAuth` / `prisma` / `req.tenantId` / `req.userId` names to match what already exists in `platform.ts` — read the file first.

  Add channels endpoints in the same router:

  ```ts
  platformRouter.get('/users/me/channels', requireAuth, asyncHandler(async (req, res) => {
    res.json(await prisma.notificationChannel.findMany({
      where: { tenantId: req.tenantId, userId: req.userId },
      orderBy: { kind: 'asc' },
    }));
  }));

  platformRouter.put('/users/me/channels/:kind', requireAuth, asyncHandler(async (req, res) => {
    const kind = req.params.kind;
    if (!['email', 'sms', 'slack'].includes(kind)) return res.status(400).json({ error: 'invalid kind' });
    const address = String(req.body?.address ?? '').trim();
    const row = await prisma.notificationChannel.upsert({
      where: { userId_kind: { userId: req.userId, kind } },
      create: { tenantId: req.tenantId, userId: req.userId, kind, address },
      update: { address, verified: false },
    });
    res.json(row);
  }));
  ```

- [ ] **Step 6: Re-run test (expect pass)**

  Run: `npx vitest run server/__tests__/userTokens.test.ts`. Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations server/routes/platform.ts server/__tests__/userTokens.test.ts
  git commit -m "feat(api): user API tokens and notification channels"
  ```

---

## Task 6 — Frontend: wire Profile + Settings to live user data

**Files:**
- Modify: `src/services/platformServices.ts` — add `apiTokensService`, extend `usersService`
- Modify: `src/routes/platform/Profile.tsx` — remove `SARAH_CHEN`/`INITIAL_TOKENS`
- Modify: `src/routes/platform/Settings.tsx` — same + channel addresses

- [ ] **Step 1: Extend services**

  In `src/services/platformServices.ts`, after `usersService`:

  ```ts
  export interface ApiTokenSummary {
    id: string; name: string; prefix: string;
    createdAt: string; lastUsedAt?: string | null;
  }
  export interface ApiTokenCreated extends ApiTokenSummary { token: string; }

  export const apiTokensService = {
    list: () => apiFetch<ApiTokenSummary[]>('/users/me/tokens'),
    create: (name: string) =>
      apiFetch<ApiTokenCreated>('/users/me/tokens', { method: 'POST', body: { name } }),
    revoke: (id: string) =>
      apiFetch<void>(`/users/me/tokens/${id}`, { method: 'DELETE' }),
  };

  export interface NotificationChannelRow {
    id: string; kind: 'email' | 'sms' | 'slack'; address: string; verified: boolean;
  }
  export const userChannelsService = {
    list: () => apiFetch<NotificationChannelRow[]>('/users/me/channels'),
    upsert: (kind: string, address: string) =>
      apiFetch<NotificationChannelRow>(`/users/me/channels/${kind}`, { method: 'PUT', body: { address } }),
  };
  ```

- [ ] **Step 2: Rewrite `Profile.tsx`**

  Remove the `SARAH_CHEN` constant (lines 9–17) and `INITIAL_TOKENS` (lines 19–34). At the top of the component:

  ```tsx
  const { data: user, loading: userLoading } = useResource(() => usersService.current(), []);
  const { data: tokens, refetch: refetchTokens } = useResource(() => apiTokensService.list(), []);
  ```

  Replace every reference to `SARAH_CHEN.*` with the corresponding `user?.*` (fall back to `'—'`). Replace `INITIAL_TOKENS` with `tokens ?? []`. Wire the "Create token" button to:

  ```tsx
  async function handleCreateToken(name: string) {
    const created = await apiTokensService.create(name);
    setNewTokenSecret(created.token); // one-time reveal
    refetchTokens();
  }
  async function handleRevoke(id: string) {
    await apiTokensService.revoke(id);
    refetchTokens();
  }
  ```

  Add a one-time-reveal modal (or inline alert) gated on `newTokenSecret`.

- [ ] **Step 3: Rewrite `Settings.tsx`**

  Remove `SARAH_CHEN` (69–77), `INITIAL_TOKENS` (193–196), hard-coded channel values (167–170). Fetch the same `usersService.current()`, `apiTokensService.list()`, and `userChannelsService.list()`. Bind email/SMS/Slack inputs to the matching channel rows; on blur or save, call `userChannelsService.upsert(kind, address)`.

- [ ] **Step 4: Lint**

  Run: `npm run lint`. Expected: pass.

- [ ] **Step 5: Smoke test**

  `npm run dev:all`, log in as the seeded superadmin, visit `/profile` and `/settings` — user name and email come from `/users/me`; token list is empty initially; creating a token reveals it once.

- [ ] **Step 6: Commit**

  ```bash
  git add src/services/platformServices.ts src/routes/platform/Profile.tsx src/routes/platform/Settings.tsx
  git commit -m "fix(platform): wire Profile and Settings to live user/token/channel APIs"
  ```

---

## Task 7 — Backend: `POST /requests/:publicId/comments`

**Files:**
- Modify: `prisma/schema.prisma` — verify/add `RequestComment` model
- Modify: `server/routes/itsm.ts` — add POST handler + GET
- Test: `server/__tests__/requestComments.test.ts`

- [ ] **Step 1: Verify model**

  Run: `grep -n "model RequestComment\|comments " prisma/schema.prisma`
  If `RequestComment` already exists with `requestId`, `authorId`, `body`, `createdAt`, skip Step 2.

- [ ] **Step 2: Add model + migrate**

  Append to `prisma/schema.prisma`:

  ```prisma
  model RequestComment {
    id        String   @id @default(cuid())
    tenantId  String
    requestId String
    authorId  String
    body      String
    createdAt DateTime @default(now())
    @@index([tenantId, requestId])
  }
  ```

  Run: `npm run db:migrate -- --name add_request_comments`

- [ ] **Step 3: Failing test**

  Create `server/__tests__/requestComments.test.ts` mirroring the pattern in Task 5 Step 3. Test should `POST /api/v1/requests/<seeded-request-publicId>/comments` with `{ body: 'looks good' }` and expect a 201 echoing the row.

- [ ] **Step 4: Implement**

  In `server/routes/itsm.ts`, add (near existing request handlers):

  ```ts
  itsmRouter.get('/requests/:publicId/comments', requirePermission('request.read'),
    asyncHandler(async (req, res) => {
      const r = required(await requestsRepo.get(req.tenantId, req.params.publicId), 'ServiceRequest');
      res.json(await prisma.requestComment.findMany({
        where: { tenantId: req.tenantId, requestId: r.id },
        orderBy: { createdAt: 'asc' },
      }));
    }));

  itsmRouter.post('/requests/:publicId/comments', requirePermission('request.write'),
    asyncHandler(async (req, res) => {
      const body = String(req.body?.body ?? '').trim();
      if (!body) return res.status(400).json({ error: 'body required' });
      const r = required(await requestsRepo.get(req.tenantId, req.params.publicId), 'ServiceRequest');
      const row = await prisma.requestComment.create({
        data: { tenantId: req.tenantId, requestId: r.id, authorId: req.userId, body },
      });
      res.status(201).json(row);
    }));
  ```

- [ ] **Step 5: Test passes**

  Run: `npx vitest run server/__tests__/requestComments.test.ts`. Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations server/routes/itsm.ts server/__tests__/requestComments.test.ts
  git commit -m "feat(requests): add request comments endpoint"
  ```

---

## Task 8 — Frontend: wire `RequestDetail` comment box

**Files:**
- Modify: `src/services/itsmServices.ts` — add `addComment` + `comments`
- Modify: `src/routes/requests/RequestDetail.tsx:806-811` — call API

- [ ] **Step 1: Extend service**

  In `src/services/itsmServices.ts`, inside `requestsService`:

  ```ts
  comments: (publicId: string) =>
    apiFetch<Array<{ id: string; authorId: string; body: string; createdAt: string }>>(
      `/requests/${publicId}/comments`
    ),
  addComment: (publicId: string, body: string) =>
    apiFetch<{ id: string; authorId: string; body: string; createdAt: string }>(
      `/requests/${publicId}/comments`, { method: 'POST', body: { body } }),
  ```

- [ ] **Step 2: Replace local-state mutation**

  In `RequestDetail.tsx` near line 806–811 the current handler pushes to local state. Replace:

  ```tsx
  const { data: comments, refetch: refetchComments } =
    useResource(() => requestsService.comments(publicId), [publicId]);

  async function handlePostComment() {
    if (!draftComment.trim()) return;
    await requestsService.addComment(publicId, draftComment);
    setDraftComment('');
    refetchComments();
  }
  ```

  Render from `comments ?? []` instead of the local array.

- [ ] **Step 3: Lint + smoke**

  `npm run lint`. Then `npm run dev:all`, open a request, add a comment, reload — it persists.

- [ ] **Step 4: Commit**

  ```bash
  git add src/services/itsmServices.ts src/routes/requests/RequestDetail.tsx
  git commit -m "fix(requests): persist request comments via API"
  ```

---

## Task 9 — Derive Availability tab/severity counts from data

**Files:**
- Modify: `src/routes/availability/SLATargets.tsx:17-22`
- Modify: `src/routes/availability/Outages.tsx:26-32,200-221`

- [ ] **Step 1: SLATargets counts**

  Remove the hard-coded numbers in `STATUS_TABS`. Compute inside the component:

  ```tsx
  const counts = useMemo(() => {
    const t = slaTargets ?? [];
    return {
      all: t.length,
      meeting: t.filter(x => x.status === 'meeting').length,
      at_risk: t.filter(x => x.status === 'at_risk').length,
      breached: t.filter(x => x.status === 'breached').length,
    };
  }, [slaTargets]);

  const STATUS_TABS = [
    { id: 'all',      label: 'All',      count: counts.all },
    { id: 'meeting',  label: 'Meeting',  count: counts.meeting },
    { id: 'at_risk',  label: 'At risk',  count: counts.at_risk },
    { id: 'breached', label: 'Breached', count: counts.breached },
  ];
  ```

  Match the actual `status` field name in `SLATarget` — read `src/types/` first.

- [ ] **Step 2: Outages counts**

  Same treatment for `TYPE_TABS` (lines 26–32) — derive from `outages`. Replace the severity histogram `[4, 8, 9, 3]` (lines 200–221) with:

  ```tsx
  const sevCounts = useMemo(() => {
    const o = outages ?? [];
    return ['P1','P2','P3','P4'].map(s => o.filter(x => x.severity === s).length);
  }, [outages]);
  const customerFacing = (outages ?? []).filter(o => o.customerImpact).length;
  ```

  Render `sevCounts` and `customerFacing` instead of the literals.

- [ ] **Step 3: Lint + smoke**

  `npm run lint`. Then visit `/availability/sla` and `/availability/outages` — counts match the seeded data.

- [ ] **Step 4: Commit**

  ```bash
  git add src/routes/availability/SLATargets.tsx src/routes/availability/Outages.tsx
  git commit -m "fix(availability): derive SLA/outage tab counts from fetched data"
  ```

---

## Task 10 — Derive Capacity KPI/forecast widgets from data

**Files:**
- Modify: `src/routes/capacity/CapacityDashboard.tsx:48-71`
- Modify: `src/routes/capacity/CapacityForecast.tsx:191-205`

- [ ] **Step 1: CapacityDashboard KPIs**

  Compute each KPI from the already-fetched `metrics`, `recommendations`, `thresholds`. Example:

  ```tsx
  const overallUtil = useMemo(() => {
    const m = metrics ?? [];
    if (!m.length) return null;
    return Math.round(m.reduce((s, x) => s + (x.utilizationPct ?? 0), 0) / m.length);
  }, [metrics]);

  const headroomDays = useMemo(() => {
    const f = forecasts ?? [];
    const imminent = f.filter(x => typeof x.daysToBreach === 'number')
                      .sort((a,b) => (a.daysToBreach! - b.daysToBreach!))[0];
    return imminent?.daysToBreach ?? null;
  }, [forecasts]);

  const openRecs = (recommendations ?? []).filter(r => !r.resolvedAt).length;
  ```

  Render `{overallUtil ?? '—'}%` etc. Use actual field names from `src/types/capacity` (or wherever defined) — do not invent.

- [ ] **Step 2: CapacityForecast accuracy + top drivers**

  Replace the hard-coded accuracy lines and Top Drivers list with values derived from `forecasts[].accuracyPct` and `forecasts[].drivers` (whichever fields exist). If those fields don't exist yet, fall back to:

  ```tsx
  {(forecasts ?? []).slice(0, 3).map(f => (
    <li key={f.id}>{f.metricName} — projected breach in {f.daysToBreach ?? '—'} days</li>
  ))}
  ```

- [ ] **Step 3: Lint + smoke**

- [ ] **Step 4: Commit**

  ```bash
  git add src/routes/capacity/CapacityDashboard.tsx src/routes/capacity/CapacityForecast.tsx
  git commit -m "fix(capacity): derive KPI cards and forecast widgets from API data"
  ```

---

## Task 11 — Backend: `/measurement/exec-summary` + `POST /measurement/reports`

**Files:**
- Modify: `server/routes/platform.ts` (measurement section) — add endpoints
- Test: `server/__tests__/measurementExec.test.ts`

- [ ] **Step 1: Failing test**

  ```ts
  // server/__tests__/measurementExec.test.ts
  it('returns aggregate exec summary', async () => {
    const res = await request(app).get('/api/v1/measurement/exec-summary').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      slaCompliancePct: expect.any(Number),
      mttrMinutes:      expect.any(Number),
      changeSuccessPct: expect.any(Number),
      openMajorIncidents: expect.any(Number),
    });
  });
  ```

- [ ] **Step 2: Implement aggregate**

  In `server/routes/platform.ts` (or wherever measurement endpoints live — verify with `grep -n "/measurement" server/routes/*.ts`):

  ```ts
  platformRouter.get('/measurement/exec-summary', requireAuth, asyncHandler(async (req, res) => {
    const [slaMet, slaTotal, incidents, changes, majorOpen] = await Promise.all([
      prisma.slaTarget.count({ where: { tenantId: req.tenantId, status: 'meeting' } }),
      prisma.slaTarget.count({ where: { tenantId: req.tenantId } }),
      prisma.incident.findMany({
        where: { tenantId: req.tenantId, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        take: 200, orderBy: { resolvedAt: 'desc' },
      }),
      prisma.change.findMany({
        where: { tenantId: req.tenantId, status: { in: ['successful','failed','rolled_back'] } },
        select: { status: true }, take: 200, orderBy: { plannedEnd: 'desc' },
      }),
      prisma.incident.count({ where: { tenantId: req.tenantId, isMajor: true, resolvedAt: null } }),
    ]);
    const mttr = incidents.length
      ? Math.round(incidents.reduce((s,i) => s + (i.resolvedAt!.getTime() - i.createdAt.getTime()), 0)
                   / incidents.length / 60000)
      : 0;
    const success = changes.length
      ? Math.round(changes.filter(c => c.status === 'successful').length / changes.length * 100)
      : 0;
    res.json({
      slaCompliancePct: slaTotal ? Math.round(slaMet / slaTotal * 100) : 0,
      mttrMinutes: mttr,
      changeSuccessPct: success,
      openMajorIncidents: majorOpen,
    });
  }));
  ```

  Verify the actual Prisma field names (`status`, `resolvedAt`, `isMajor`) by reading `prisma/schema.prisma` first; adjust to match. If a field doesn't exist, return 0 for that metric rather than inventing one.

- [ ] **Step 3: POST /measurement/reports**

  Verify `Report` model exists in `prisma/schema.prisma`. Add:

  ```ts
  platformRouter.post('/measurement/reports', requireAuth, asyncHandler(async (req, res) => {
    const { name, definition, schedule } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const row = await prisma.report.create({
      data: { tenantId: req.tenantId, name, definition: definition ?? {}, schedule: schedule ?? null, createdBy: req.userId },
    });
    res.status(201).json(row);
  }));
  ```

- [ ] **Step 4: Tests pass**

  `npx vitest run server/__tests__/measurementExec.test.ts`

- [ ] **Step 5: Commit**

  ```bash
  git add server/routes/platform.ts server/__tests__/measurementExec.test.ts
  git commit -m "feat(measurement): exec summary aggregate and report POST"
  ```

---

## Task 12 — Frontend: wire ExecutiveDashboard + ReportBuilder

**Files:**
- Modify: `src/services/platformServices.ts` — extend `measurementService`
- Modify: `src/routes/measurement/ExecutiveDashboard.tsx`
- Modify: `src/routes/measurement/ReportBuilder.tsx`

- [ ] **Step 1: Extend service**

  ```ts
  export interface ExecSummary {
    slaCompliancePct: number; mttrMinutes: number;
    changeSuccessPct: number; openMajorIncidents: number;
  }
  // inside measurementService:
  execSummary: () => apiFetch<ExecSummary>('/measurement/exec-summary'),
  createReport: (input: { name: string; definition: unknown; schedule?: unknown }) =>
    apiFetch<Report>('/measurement/reports', { method: 'POST', body: input }),
  ```

- [ ] **Step 2: ExecutiveDashboard**

  Add at top of component:

  ```tsx
  const { data: summary } = useResource(() => measurementService.execSummary(), []);
  ```

  Replace the hard-coded `75%`, `2h 14m`, `87%`, `9` (lines 90–119) with:

  ```tsx
  <Kpi label="SLA compliance" value={summary ? `${summary.slaCompliancePct}%` : '—'} />
  <Kpi label="MTTR"            value={summary ? formatMinutes(summary.mttrMinutes) : '—'} />
  <Kpi label="Change success"  value={summary ? `${summary.changeSuccessPct}%` : '—'} />
  <Kpi label="Open major"      value={summary ? String(summary.openMajorIncidents) : '—'} />
  ```

  Add helper:

  ```tsx
  function formatMinutes(m: number): string {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h ? `${h}h ${r}m` : `${r}m`;
  }
  ```

- [ ] **Step 3: ReportBuilder**

  Find the form submit handler. Replace its no-op with:

  ```tsx
  async function handleSubmit() {
    await measurementService.createReport({ name, definition: content, schedule });
    navigate('/reports');
  }
  ```

- [ ] **Step 4: Lint + smoke**

  `/dashboards/exec` shows real numbers; `/reports/builder` saves a new report and navigates.

- [ ] **Step 5: Commit**

  ```bash
  git add src/services/platformServices.ts src/routes/measurement/ExecutiveDashboard.tsx src/routes/measurement/ReportBuilder.tsx
  git commit -m "fix(measurement): wire ExecutiveDashboard and ReportBuilder to API"
  ```

---

## Task 13 — Backend: `POST /ai/sessions/:id/messages`

**Files:**
- Modify: `prisma/schema.prisma` — verify `AiMessage` model
- Modify: `server/routes/platform.ts` (AI section)
- Test: `server/__tests__/aiMessages.test.ts`

- [ ] **Step 1: Verify / add model**

  ```bash
  grep -n "model AiMessage\|aiMessage" prisma/schema.prisma
  ```

  If missing, add:

  ```prisma
  model AiMessage {
    id        String   @id @default(cuid())
    tenantId  String
    sessionId String
    role      String   // 'user' | 'assistant'
    body      String
    createdAt DateTime @default(now())
    @@index([tenantId, sessionId])
  }
  ```

  Migrate.

- [ ] **Step 2: Test + implement**

  Endpoint should accept `{ body: string }` and return both the persisted user message **and** an assistant reply. For now the assistant reply is a deterministic echo so we can ship without an LLM dependency; we explicitly do NOT call any external LLM here:

  ```ts
  platformRouter.post('/ai/sessions/:id/messages', requireAuth, asyncHandler(async (req, res) => {
    const body = String(req.body?.body ?? '').trim();
    if (!body) return res.status(400).json({ error: 'body required' });
    const userMsg = await prisma.aiMessage.create({
      data: { tenantId: req.tenantId, sessionId: req.params.id, role: 'user', body },
    });
    const replyText = `Acknowledged: "${body.slice(0, 200)}". (LLM integration pending.)`;
    const assistantMsg = await prisma.aiMessage.create({
      data: { tenantId: req.tenantId, sessionId: req.params.id, role: 'assistant', body: replyText },
    });
    res.status(201).json({ user: userMsg, assistant: assistantMsg });
  }));
  ```

  Add a `GET /ai/sessions/:id/messages` for backfill.

- [ ] **Step 3: Commit**

  ```bash
  git add prisma/schema.prisma prisma/migrations server/routes/platform.ts server/__tests__/aiMessages.test.ts
  git commit -m "feat(ai): persist session messages with placeholder assistant reply"
  ```

---

## Task 14 — Frontend: AiWorkspace uses real API

**Files:**
- Modify: `src/services/platformServices.ts` — extend `aiService`
- Modify: `src/routes/ai/AiWorkspace.tsx:210` — drop `getMockAiResponse()`

- [ ] **Step 1: Extend service**

  ```ts
  // inside aiService:
  messages: (sessionId: string) =>
    apiFetch<Array<{ id: string; role: 'user'|'assistant'; body: string; createdAt: string }>>(
      `/ai/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: string, body: string) =>
    apiFetch<{ user: AiMessage; assistant: AiMessage }>(
      `/ai/sessions/${sessionId}/messages`, { method: 'POST', body: { body } }),
  ```

- [ ] **Step 2: Replace mock**

  In `AiWorkspace.tsx`, delete the `getMockAiResponse()` import + call (line 210). Replace the send handler:

  ```tsx
  async function handleSend(text: string) {
    if (!activeSession) return;
    const { user, assistant } = await aiService.sendMessage(activeSession.id, text);
    setMessages(prev => [...prev, user, assistant]);
  }
  ```

  Hydrate from `aiService.messages(activeSession.id)` on session change.

- [ ] **Step 3: Delete unused mock helper**

  If `getMockAiResponse` lives in its own file and has no other importers, delete it:

  ```bash
  grep -rn "getMockAiResponse" src/ && rm src/lib/mocks/aiResponses.ts  # only if confirmed
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/services/platformServices.ts src/routes/ai/AiWorkspace.tsx
  git commit -m "fix(ai): send and load AI messages via API instead of local mock"
  ```

---

## Task 15 — Re-audit and update `docs/AUDIT-MOCK-DATA.md`

**Files:**
- Modify: `docs/AUDIT-MOCK-DATA.md`

- [ ] **Step 1: Re-scan**

  ```bash
  grep -rn "SARAH_CHEN\|INITIAL_TOKENS\|getMockAiResponse\|new Date('2026-" src/ | tee /tmp/audit-residue.txt
  ```

  Expected: empty or only intentional test fixtures.

- [ ] **Step 2: Update doc**

  Move every previously-PARTIAL/MOCK/STATIC row to WIRED. Update the headline counts. Add a "Resolved 2026-05-15" subsection at the top listing the PRs/commits.

- [ ] **Step 3: Lint full project**

  `npm run lint && npm run test`. Expected: pass.

- [ ] **Step 4: Commit**

  ```bash
  git add docs/AUDIT-MOCK-DATA.md
  git commit -m "docs: mark mock-data audit findings resolved"
  ```

---

## Self-Review

- **Spec coverage** vs. audit follow-up list: items 1 (Profile), 2 (Settings) → Task 5/6. Item 3 (ExecutiveDashboard) → Task 11/12. Item 4 (ReportBuilder) → Task 11/12. Item 5 (Dashboard on-call) → Task 4. Item 6 (UserMenu) → Task 3. Item 7 (UserSwitcher) → Task 3. Item 8 (NOW constants ×4) → Task 1. Item 9 (NewChange defaults) → Task 2. Item 10 (SLA/Outage/Capacity tab counts) → Task 9, 10. Missing backend endpoints (tokens, channels, request comments, AI messages, report POST, exec summary) → Tasks 5, 7, 11, 13. Each row in the audit table maps to a task.

- **Placeholder scan:** no "TBD"/"appropriate"/"similar to". Every code-changing step shows the code.

- **Type consistency:** `apiTokensService` exposes `list/create/revoke` everywhere; `ExecSummary` shape matches between backend handler and frontend type; `userChannelsService` upsert path uses `:kind` consistently.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-15-audit-mock-data-fixes.md`. Proceeding with **Subagent-Driven** execution per the goal directive.
