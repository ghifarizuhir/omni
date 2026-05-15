# RBAC × App Scope — Plan E: AppScopeSwitcher + Form Mismatch UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the end-user UX layer for app scope — a TopBar `AppScopeSwitcher` (`All my apps` default + per-app pin), a persistent per-page `Scope: …` chip, form pre-fill of `applicationId` based on the active scope, and a confirmation modal when a user submits a write to an app different from the current scope.

**Architecture:** New `ScopeProvider` React context exposes `{ scope, setScope, scopedAppIds }` where `scope` is either `'all'` or a specific `appId`. The provider's state is persisted in `localStorage` per user. The `AppScopeSwitcher` component renders the dropdown; pages and forms consume `useScope()`. Behind a frontend-only feature flag `feature.app_scope_ui` (read from `localStorage` or a build-time env var so the rollout is reversible without a deploy).

**Tech Stack:** React 19, Tailwind, Vite. No backend changes.

**Spec:** [`docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../specs/2026-05-15-rbac-app-scope-design.md) §7.

**Depends on:** Plan D (`ad96e32`).

**Out of scope:**
- `applicationId` `NOT NULL` migration + cleanup → Plan F.
- Per-page filter override (the chip showing "Scope: …") is included; per-page custom filters (multi-select) are deferred.
- Notification routing through scope — deferred.

---

## Design decisions (read before starting)

### 1. State model

A new `ScopeContext`:

```ts
type ScopeValue = 'all' | { kind: 'app'; appId: string };

interface ScopeContextValue {
  scope: ScopeValue;
  setScope: (next: ScopeValue) => void;
  /** Apps the current user has any membership in. */
  myApps: Array<{ id: string; code: string; name: string; criticality: string | null; role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' }>;
  /**
   * The set of appIds in the currently-active scope:
   *  - 'all'  → all `myApps`
   *  - 'app'  → just the picked app
   */
  scopedAppIds: string[];
  /** Apps the user can WRITE to (OWNER + CONTRIBUTOR). Used for form dropdowns. */
  writableApps: Array<{ id: string; code: string; name: string }>;
  /** Pinned app IDs (favorites). Sorted first in the switcher. */
  pinned: string[];
  togglePin: (appId: string) => void;
}
```

Pull `myApps` from `applicationCatalogApi.list()` filtered by `isMember=true`, **plus** the per-app role (which the catalog doesn't return today — extend it).

### 2. Persistence

Two `localStorage` keys per user (key prefixed with `userId` so a different login starts fresh):
- `ois.scope.<userId>` — current `ScopeValue` JSON.
- `ois.scope.<userId>.pinned` — pinned appId array.

Read on provider mount, write on any state change. Fall back to `'all'` when missing.

### 3. Feature flag

`feature.app_scope_ui` is a frontend-only flag. Resolution order:
1. `localStorage.getItem('feature.app_scope_ui') === 'true'` — operator can flip without a deploy.
2. `import.meta.env.VITE_FEATURE_APP_SCOPE_UI === 'true'` — build-time default.
3. Otherwise `false`.

When `false`:
- `AppScopeSwitcher` does not render in the TopBar.
- The scope chip on pages does not render.
- The form pre-fill + mismatch confirm modal do NOT activate (forms still accept `applicationId` if the developer wires the field manually).

Wrap the activation logic in a single helper `useScopeUiEnabled()`.

### 4. Backend extension: per-app role in catalog

The existing `GET /api/v1/applications/catalog` returns `{ id, code, name, criticality, ownerTeamIds, isMember }`. The switcher needs the caller's **role** per app (so it can hide apps the user is VIEWER on from the write dropdown). Add a `myRole` field to the catalog response — value is the highest-privilege role across the user's team memberships for that app, or `null` if not a member.

Update `server/repositories/applicationMembership.ts:listCatalog` to compute this. Update the integration test in `applications-catalog.test.ts`.

### 5. UI components

#### `AppScopeSwitcher.tsx` (TopBar)
- A button showing `Scope: <App Name>` or `Scope: All my apps`.
- Color of the chip follows `Application.criticality` (P1=red-50 + red-700 text, P2=amber-50, P3=yellow-50, P4=emerald-50; fall back to gray for null).
- Click opens dropdown with:
  - Search field (if user has >10 apps).
  - **All my apps** entry at the top (pinned visually — always first).
  - **Pinned apps** section (apps with the pin star).
  - **Other apps** section (rest of user's apps).
  - Each app row has a pin/unpin star icon.
  - PlatformAdmin/Auditor also see an **"All tenant apps"** section below their own apps, gated by either `system.admin` permission or `AUDITOR` functional role.
- Empty state: when user has no app memberships, the chip says `Scope: (no apps)` and clicking opens a dropdown with a single "Browse catalog" link to `/applications/catalog`.

#### `PageScopeChip.tsx`
- Small chip next to page titles. Mirrors the TopBar's current scope.
- Pages opt in by importing the chip and rendering it. We start by adding it to CMDB, Events, Incidents, Changes — the four most-trafficked.
- When scope is `'all'`, the chip is a subtle outline ("Scope: All"). When scope is an app, the chip is filled with the app's criticality color.

#### Form integration: `useScopedAppId(options)` hook
- Returns `{ value, setValue, source: 'auto' | 'manual', requireApplicationId: boolean }`.
- When scope is a single app + the user is a writer of it → `value` defaults to that appId, `source: 'auto'`, `requireApplicationId: false` (field can be hidden).
- When scope is `'all'` → `value: null`, `source: 'manual'`, `requireApplicationId: true` (form MUST render an Application picker).

Forms that currently accept `applicationId` (Change creation, future ones) consume the hook and either pre-fill the field or render the picker.

#### `ScopeMismatchModal.tsx`
- When a form submits with `applicationId !== currentScope.appId` (and current scope is a specific app, not `'all'`), the form intercepts the submit, opens this modal: *"You're submitting this to App X, but your current scope is App Y. Continue?"* — Cancel / Continue.
- After confirm, proceed with submit. On cancel, the form stays open and the picker remains highlighted.

### 6. CMDB list page integration (proof of concept)

The CMDB list at `src/routes/cmdb/CMDBList.tsx`:
- Render `PageScopeChip` next to the title.
- When scope is a single app, filter the CI list client-side to `primaryApplicationId === appId || primaryApplicationId === null`. (NULL = legacy, always shown for now.)
- When scope is `'all'`, show every row.

This proves the chip + provider data path end-to-end. Other pages can adopt the same pattern in a follow-up.

### 7. Audit / observability

No backend audit changes — this plan is purely frontend.
Add telemetry hook stubs that we can wire to a real analytics service later (not part of this plan): just `console.debug('[scope] switch', { from, to })` on every switch.

### 8. Tests

- **Backend**: extend `applications-catalog.test.ts` to assert the `myRole` field is present and correct.
- **Frontend**: not wiring up Vitest for React components in this plan (the project does not have a React test setup configured at present — confirm by reading `package.json` and `vitest.config.ts`). Manual smoke is the verification path:
  1. Set `localStorage.setItem('feature.app_scope_ui', 'true')` in the browser DevTools.
  2. Reload, confirm `AppScopeSwitcher` appears in TopBar.
  3. Open dropdown, pin one app, refresh page, confirm pin persists.
  4. Pick a specific app, navigate to CMDB list, confirm chip + filtered list.
  5. Switch back to "All my apps", confirm chip + unfiltered list.
  6. Open Change create form, confirm `applicationId` is pre-filled with the picked app.
  7. Switch scope back to "All my apps", open Change create form, confirm an Application picker is rendered and required.
  8. From "App X" scope, submit a Change to "App Y" → mismatch modal appears, can cancel or confirm.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `server/repositories/applicationMembership.ts` | Modify | `listCatalog` returns `myRole`. |
| `server/__tests__/applications-catalog.test.ts` | Modify | Assert `myRole` shape. |
| `src/lib/scope/ScopeContext.tsx` | Create | Provider + `useScope` hook. |
| `src/lib/scope/featureFlag.ts` | Create | `useScopeUiEnabled()`. |
| `src/lib/scope/persistence.ts` | Create | `localStorage` get/set helpers. |
| `src/components/scope/AppScopeSwitcher.tsx` | Create | TopBar switcher. |
| `src/components/scope/PageScopeChip.tsx` | Create | Page-level chip. |
| `src/components/scope/ScopeMismatchModal.tsx` | Create | Submit confirm modal. |
| `src/hooks/useScopedAppId.ts` | Create | Form integration hook. |
| `src/components/layout/TopBar.tsx` | Modify | Render `AppScopeSwitcher` left of search. |
| `src/components/layout/AppShell.tsx` | Modify | Wrap children with `ScopeProvider`. |
| `src/routes/cmdb/CMDBList.tsx` | Modify | Render `PageScopeChip` + scope-filter rows. |
| `src/routes/changes/ChangeCreate.tsx` (or wherever the form lives) | Modify | Wire `useScopedAppId` + `ScopeMismatchModal`. |
| `src/services/adminService.ts` | Modify | Add `myRole` to `CatalogAppDto`. |
| `.env.example` | Modify | Document `VITE_FEATURE_APP_SCOPE_UI`. |
| `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` | Modify | Tick off the AppScopeSwitcher DoD line. |

---

## Task 1: Backend — `myRole` in catalog

**Files:** Modify `server/repositories/applicationMembership.ts`, modify `server/__tests__/applications-catalog.test.ts`

- [ ] **Step 1: Append failing test**

```ts
describe('GET /api/v1/applications/catalog — myRole', () => {
  it('returns the strongest role for the calling user', async () => {
    const memberCookie = await login(app, fx.emailOf('member-a'), fx.password);
    const r = await request(app).get('/api/v1/applications/catalog').set('Cookie', memberCookie);
    expect(r.status).toBe(200);
    const fxApp = (r.body as Array<{ id: string; myRole: string | null }>).find((a) => a.id === fx.appId);
    expect(fxApp?.myRole).toBe('CONTRIBUTOR');

    const outsider = await login(app, fx.emailOf('member-b'), fx.password);
    const r2 = await request(app).get('/api/v1/applications/catalog').set('Cookie', outsider);
    const fxApp2 = (r2.body as Array<{ id: string; myRole: string | null }>).find((a) => a.id === fx.appId);
    expect(fxApp2?.myRole).toBeNull();
  });
});
```

- [ ] **Step 2: Update `listCatalog`**

Currently:
```ts
const memberSet = new Set(userAppIds);
return apps.map((a) => ({ ..., isMember: memberSet.has(a.id) }));
```

Change to accept richer membership data:

```ts
export async function listCatalog(tenantId: string, userMemberships: Array<{ appId: string; role: 'OWNER'|'CONTRIBUTOR'|'VIEWER' }>) {
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
  const roleByApp = new Map<string, 'OWNER'|'CONTRIBUTOR'|'VIEWER'>();
  const rank = { OWNER: 3, CONTRIBUTOR: 2, VIEWER: 1 } as const;
  for (const m of userMemberships) {
    const existing = roleByApp.get(m.appId);
    if (!existing || rank[m.role] > rank[existing]) roleByApp.set(m.appId, m.role);
  }
  return apps.map((a) => ({
    id: a.id, code: a.code, name: a.name, criticality: a.criticality,
    ownerTeamIds: ownerTeamsByApp.get(a.id) ?? [],
    isMember: roleByApp.has(a.id),
    myRole: roleByApp.get(a.id) ?? null,
  }));
}
```

- [ ] **Step 3: Update the route handler**

`server/routes/applications.ts:applicationsRouter.get('/catalog', …)` currently passes `userAppIds` (just IDs). Change to pass the full `ctx.appMemberships`:

```ts
applicationsRouter.get('/catalog', asyncHandler(async (req, res) => {
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  const catalog = await listCatalog(req.tenantId, ctx.appMemberships);
  res.json(catalog);
}));
```

- [ ] **Step 4: Update `CatalogAppDto` in `src/services/adminService.ts`**

Add `myRole: 'OWNER'|'CONTRIBUTOR'|'VIEWER'|null` to the interface.

- [ ] **Step 5: Run tests, expect pass.**

`npx dotenv-cli -e .env.local -- npx vitest run server/__tests__/applications-catalog.test.ts` — expect 4/4.

- [ ] **Step 6: Lint + commit**

```bash
git add server/repositories/applicationMembership.ts server/routes/applications.ts server/__tests__/applications-catalog.test.ts src/services/adminService.ts
git commit -m "feat(scope): catalog returns myRole per app for the calling user"
```

---

## Task 2: Feature flag + persistence helpers

**Files:** Create `src/lib/scope/featureFlag.ts`, create `src/lib/scope/persistence.ts`

- [ ] **Step 1: `featureFlag.ts`**

```ts
const STORAGE_KEY = 'feature.app_scope_ui';

export function readFeatureFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const ls = window.localStorage.getItem(STORAGE_KEY);
  if (ls === 'true') return true;
  if (ls === 'false') return false;
  return import.meta.env.VITE_FEATURE_APP_SCOPE_UI === 'true';
}

export function useScopeUiEnabled(): boolean {
  // No state — the flag is read at module init; flipping it requires a refresh.
  // Acceptable for an internal feature flag; a more dynamic version can subscribe to storage events.
  return readFeatureFlag();
}
```

- [ ] **Step 2: `persistence.ts`**

```ts
import type { ScopeValue } from './ScopeContext';

const SCOPE_KEY = (userId: string) => `ois.scope.${userId}`;
const PIN_KEY   = (userId: string) => `ois.scope.${userId}.pinned`;

export function readScope(userId: string): ScopeValue {
  try {
    const raw = window.localStorage.getItem(SCOPE_KEY(userId));
    if (!raw) return 'all';
    const v = JSON.parse(raw);
    if (v === 'all') return 'all';
    if (typeof v === 'object' && v !== null && v.kind === 'app' && typeof v.appId === 'string') return v;
    return 'all';
  } catch { return 'all'; }
}

export function writeScope(userId: string, scope: ScopeValue): void {
  window.localStorage.setItem(SCOPE_KEY(userId), JSON.stringify(scope));
}

export function readPinned(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(PIN_KEY(userId));
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export function writePinned(userId: string, pinned: string[]): void {
  window.localStorage.setItem(PIN_KEY(userId), JSON.stringify(pinned));
}
```

- [ ] **Step 3: Lint + commit**

```bash
git add src/lib/scope/featureFlag.ts src/lib/scope/persistence.ts
git commit -m "feat(scope): featureFlag + localStorage persistence helpers"
```

---

## Task 3: `ScopeContext` provider + `useScope` hook

**Files:** Create `src/lib/scope/ScopeContext.tsx`, modify `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Implement the provider**

```tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { applicationCatalogApi, type CatalogAppDto } from '@/src/services/adminService';
import { useAuthSession } from '@/src/lib/auth/session';
import { readScope, writeScope, readPinned, writePinned } from './persistence';

export type ScopeValue = 'all' | { kind: 'app'; appId: string };

export interface MyApp {
  id: string; code: string; name: string; criticality: string | null;
  role: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';
}

interface ScopeContextValue {
  scope: ScopeValue;
  setScope: (next: ScopeValue) => void;
  myApps: MyApp[];
  scopedAppIds: string[];
  writableApps: Array<Pick<MyApp, 'id' | 'code' | 'name'>>;
  pinned: string[];
  togglePin: (appId: string) => void;
  loading: boolean;
}

const ScopeCtx = createContext<ScopeContextValue | undefined>(undefined);

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useAuthSession();
  const userId = session?.user?.id ?? null;
  const [scope, setScopeState] = useState<ScopeValue>('all');
  const [pinned, setPinned] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CatalogAppDto[] | null>(null);

  // Load persisted state once we know the user.
  useEffect(() => {
    if (!userId) return;
    setScopeState(readScope(userId));
    setPinned(readPinned(userId));
  }, [userId]);

  // Load catalog once.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    applicationCatalogApi.list().then((rows) => { if (alive) setCatalog(rows); }).catch(() => { if (alive) setCatalog([]); });
    return () => { alive = false; };
  }, [userId]);

  const myApps: MyApp[] = useMemo(() => {
    return (catalog ?? [])
      .filter((a) => a.isMember && a.myRole !== null)
      .map((a) => ({ id: a.id, code: a.code, name: a.name, criticality: a.criticality, role: a.myRole as MyApp['role'] }));
  }, [catalog]);

  const scopedAppIds = useMemo(() => {
    if (scope === 'all') return myApps.map((a) => a.id);
    return [scope.appId];
  }, [scope, myApps]);

  const writableApps = useMemo(
    () => myApps.filter((a) => a.role === 'OWNER' || a.role === 'CONTRIBUTOR').map(({ id, code, name }) => ({ id, code, name })),
    [myApps],
  );

  const setScope = (next: ScopeValue) => {
    setScopeState(next);
    if (userId) writeScope(userId, next);
    // eslint-disable-next-line no-console
    console.debug('[scope] switch', { from: scope, to: next });
  };

  const togglePin = (appId: string) => {
    setPinned((prev) => {
      const next = prev.includes(appId) ? prev.filter((x) => x !== appId) : [...prev, appId];
      if (userId) writePinned(userId, next);
      return next;
    });
  };

  return (
    <ScopeCtx.Provider value={{ scope, setScope, myApps, scopedAppIds, writableApps, pinned, togglePin, loading: catalog === null }}>
      {children}
    </ScopeCtx.Provider>
  );
};

export function useScope(): ScopeContextValue {
  const v = useContext(ScopeCtx);
  if (!v) throw new Error('useScope() outside <ScopeProvider>');
  return v;
}
```

- [ ] **Step 2: Wrap the app**

In `src/components/layout/AppShell.tsx`, wrap the existing children with `<ScopeProvider>`. The provider goes INSIDE `CurrentUserContext` (so it has session info) but ABOVE the rendered Outlet.

- [ ] **Step 3: Smoke build**

Run `npm run build`. Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scope/ScopeContext.tsx src/components/layout/AppShell.tsx
git commit -m "feat(scope): ScopeContext provider + useScope hook"
```

---

## Task 4: `AppScopeSwitcher` TopBar component

**Files:** Create `src/components/scope/AppScopeSwitcher.tsx`, modify `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Implement the switcher (≤250 lines)**

Skeleton:

```tsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Pin, PinOff, Search, Layers } from 'lucide-react';
import { useScope } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';
import { cn } from '@/src/lib/utils';

const CRITICALITY_CLASSES: Record<string, string> = {
  P1: 'bg-red-50 text-red-700 border-red-200',
  P2: 'bg-amber-50 text-amber-700 border-amber-200',
  P3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  P4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const AppScopeSwitcher: React.FC = () => {
  const enabled = useScopeUiEnabled();
  const { scope, setScope, myApps, pinned, togglePin, loading } = useScope();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // close-on-outside-click ref/handler
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!enabled) return null;

  const active = scope === 'all'
    ? { label: 'All my apps', criticality: null as string | null }
    : (() => {
        const a = myApps.find((x) => x.id === scope.appId);
        return a ? { label: a.name, criticality: a.criticality } : { label: '…', criticality: null };
      })();

  const filtered = useMemo(() => {
    if (!query) return myApps;
    const q = query.toLowerCase();
    return myApps.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q));
  }, [query, myApps]);

  const pinnedApps = filtered.filter((a) => pinned.includes(a.id));
  const otherApps  = filtered.filter((a) => !pinned.includes(a.id));

  const chipClass = active.criticality ? CRITICALITY_CLASSES[active.criticality] : 'bg-ois-surface-muted text-ois-text border-ois-border';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-medium hover:bg-ois-bg transition-colors', chipClass)}
      >
        <Layers size={14} />
        <span>Scope: {active.label}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-ois-border z-50">
          {myApps.length > 10 && (
            <div className="p-2 border-b border-ois-border">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-ois-border focus:border-ois-primary focus:ring-1 focus:ring-ois-primary outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => { setScope('all'); setOpen(false); }}
            className={cn('w-full text-left px-3 py-2 text-xs hover:bg-ois-bg flex items-center gap-2', scope === 'all' && 'bg-ois-bg font-medium')}
          >
            <Layers size={14} /> All my apps
          </button>

          {pinnedApps.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ois-text-subtle">Pinned</div>
              {pinnedApps.map((a) => (
                <AppRow key={a.id} app={a} active={scope !== 'all' && scope.appId === a.id} pinned onSelect={() => { setScope({ kind: 'app', appId: a.id }); setOpen(false); }} onTogglePin={() => togglePin(a.id)} />
              ))}
            </>
          )}

          {otherApps.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ois-text-subtle">All apps</div>
              {otherApps.map((a) => (
                <AppRow key={a.id} app={a} active={scope !== 'all' && scope.appId === a.id} pinned={false} onSelect={() => { setScope({ kind: 'app', appId: a.id }); setOpen(false); }} onTogglePin={() => togglePin(a.id)} />
              ))}
            </>
          )}

          {!loading && myApps.length === 0 && (
            <div className="p-3 text-xs text-ois-text-muted">
              You're not a member of any application. <a href="/applications/catalog" className="text-ois-primary hover:underline">Browse catalog</a>.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Small row component below…
const AppRow: React.FC<{ app: MyApp; active: boolean; pinned: boolean; onSelect: () => void; onTogglePin: () => void }> = ({ app, active, pinned, onSelect, onTogglePin }) => (
  <div className={cn('flex items-center justify-between px-3 py-1.5 text-xs hover:bg-ois-bg', active && 'bg-ois-bg font-medium')}>
    <button onClick={onSelect} className="text-left flex-1 truncate">{app.name}</button>
    <button onClick={onTogglePin} className="text-ois-text-subtle hover:text-ois-text px-1">
      {pinned ? <Pin size={12} className="fill-current" /> : <PinOff size={12} />}
    </button>
  </div>
);
```

(Adapt the `lucide-react` icon names — confirm `PinOff` exists; fall back to `Pin` with different `fill-current` if not.)

- [ ] **Step 2: Mount in `TopBar.tsx`**

Insert `<AppScopeSwitcher />` left of the search input (around line 60, before the search container). Use `gap-3` spacing consistent with the existing layout.

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/scope/AppScopeSwitcher.tsx src/components/layout/TopBar.tsx
git commit -m "feat(scope): AppScopeSwitcher TopBar dropdown with pinning"
```

---

## Task 5: `PageScopeChip` + CMDB list integration

**Files:** Create `src/components/scope/PageScopeChip.tsx`, modify `src/routes/cmdb/CMDBList.tsx`

- [ ] **Step 1: Implement the chip (≤100 lines)**

```tsx
import { useScope } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';
import { Layers } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const CRIT: Record<string, string> = {
  P1: 'bg-red-50 text-red-700 border-red-200',
  P2: 'bg-amber-50 text-amber-700 border-amber-200',
  P3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  P4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const PageScopeChip: React.FC<{ className?: string }> = ({ className }) => {
  const enabled = useScopeUiEnabled();
  const { scope, myApps } = useScope();
  if (!enabled) return null;
  if (scope === 'all') {
    return (
      <span className={cn('inline-flex items-center gap-1 h-6 px-2 rounded-full border border-ois-border text-[11px] text-ois-text-subtle', className)}>
        <Layers size={11} /> All my apps
      </span>
    );
  }
  const app = myApps.find((a) => a.id === scope.appId);
  const klass = app?.criticality ? CRIT[app.criticality] : 'bg-ois-surface-muted border-ois-border';
  return (
    <span className={cn('inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px]', klass, className)}>
      <Layers size={11} /> {app?.name ?? '…'}
    </span>
  );
};
```

- [ ] **Step 2: Wire into CMDB list**

Find the list page header in `src/routes/cmdb/CMDBList.tsx`. Add `<PageScopeChip />` next to the title.

Then, filter the rows:

```tsx
import { useScope } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';

const { scope, scopedAppIds } = useScope();
const enabled = useScopeUiEnabled();

const visibleCIs = enabled && scope !== 'all'
  ? cis.filter((ci) => ci.primaryApplicationId === null || scopedAppIds.includes(ci.primaryApplicationId))
  : cis;
```

(Use the variable name that already exists for the CI list; this is a sketch.)

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/scope/PageScopeChip.tsx src/routes/cmdb/CMDBList.tsx
git commit -m "feat(scope): PageScopeChip + CMDB list scope filter"
```

---

## Task 6: Form integration — `useScopedAppId` + `ScopeMismatchModal` + Change create

**Files:** Create `src/hooks/useScopedAppId.ts`, create `src/components/scope/ScopeMismatchModal.tsx`, modify the Change creation form

- [ ] **Step 1: Implement `useScopedAppId`**

```ts
import { useEffect, useMemo, useState } from 'react';
import { useScope } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';

export interface UseScopedAppId {
  value: string | null;
  setValue: (next: string | null) => void;
  source: 'auto' | 'manual';
  requireApplicationId: boolean;
  writableApps: ReturnType<typeof useScope>['writableApps'];
}

export function useScopedAppId(): UseScopedAppId {
  const enabled = useScopeUiEnabled();
  const { scope, writableApps } = useScope();
  const [manual, setManual] = useState<string | null>(null);

  // When scope changes to a writable single app, auto-fill.
  useEffect(() => {
    if (!enabled) return;
    if (scope !== 'all' && writableApps.find((a) => a.id === scope.appId)) {
      setManual(scope.appId);
    } else if (scope === 'all') {
      setManual(null);
    }
  }, [enabled, scope, writableApps]);

  const source: 'auto' | 'manual' = useMemo(() => {
    if (!enabled) return 'manual';
    return scope !== 'all' && writableApps.find((a) => a.id === scope.appId) ? 'auto' : 'manual';
  }, [enabled, scope, writableApps]);

  const requireApplicationId = enabled && source === 'manual';

  return { value: manual, setValue: setManual, source, requireApplicationId, writableApps };
}
```

- [ ] **Step 2: Implement `ScopeMismatchModal`**

Simple controlled modal — open prop, current app name, submitted app name, onCancel/onConfirm. ~80 lines max. Reuse existing `Modal` primitive from `src/components/ui/Modal.tsx`.

- [ ] **Step 3: Wire into the Change create form**

Find the form file (search for `POST /changes` or `changesService.create` or `createChangeSchema`). Likely under `src/routes/changes/` or a modal under `src/components/changes/`.

- Use `useScopedAppId` to get the auto-fill value.
- If `source === 'auto'`, hide the field but pass the value with the submission.
- If `source === 'manual'`, render an `<Application picker>` (dropdown of `writableApps`), required.
- On submit, if `enabled && scope !== 'all' && submittedAppId !== scope.appId` → open `ScopeMismatchModal`. On confirm, proceed with the original submit; on cancel, abort.

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add src/hooks/useScopedAppId.ts src/components/scope/ScopeMismatchModal.tsx [change form file]
git commit -m "feat(scope): form pre-fill + ScopeMismatchModal for Change create"
```

---

## Task 7: Spec + .env.example + smoke

**Files:** Modify `.env.example`, modify `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`

- [ ] **Step 1: Document the flag**

Append to `.env.example`:
```
# Frontend feature flag for the AppScopeSwitcher UX (Plan E).
# Set to "true" to enable in production builds. Operators can also flip
# it at runtime via localStorage.setItem('feature.app_scope_ui', 'true').
VITE_FEATURE_APP_SCOPE_UI=false
```

- [ ] **Step 2: Tick DoD line**

In §10.3 of the spec, change the AppScopeSwitcher line to:
```
- [x] AppScopeSwitcher live (Plan E, behind `feature.app_scope_ui` flag). Telemetry ≥80% deferred to post-rollout instrumentation.
```

- [ ] **Step 3: Full sweep**

```
npm run lint && npm run build && \
npx dotenv-cli -e .env.local -- npx vitest run \
  server/__tests__/applications-catalog.test.ts \
  server/__tests__/admin-app-membership.test.ts \
  server/__tests__/admin-data-quality.test.ts
```

All green.

- [ ] **Step 4: Manual browser smoke** (per the design's §8 list — verify all 8 steps).

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md
git commit -m "docs(scope): document VITE_FEATURE_APP_SCOPE_UI; tick AppScopeSwitcher DoD"
```

---

## Done criteria for Plan E

- [ ] `GET /api/v1/applications/catalog` includes `myRole` (`OWNER|CONTRIBUTOR|VIEWER|null`).
- [ ] `ScopeProvider` mounted in `AppShell`; `useScope()` returns scope + apps + writableApps.
- [ ] `AppScopeSwitcher` renders in TopBar (when feature flag on) with All/Pinned/Other sections + search.
- [ ] `PageScopeChip` renders on the CMDB list and changes color by criticality.
- [ ] CMDB list filters by scope when a single app is picked; NULL-app CIs always shown.
- [ ] `useScopedAppId` hook auto-fills the Change create form when scope is a single writable app.
- [ ] `ScopeMismatchModal` intercepts submits when form's appId ≠ active scope.
- [ ] Feature flag `feature.app_scope_ui` controlled via `localStorage` or `VITE_FEATURE_APP_SCOPE_UI`.
- [ ] Pinned apps persist across reloads (per-user `localStorage`).
- [ ] `npm run lint` clean, `npm run build` clean.
- [ ] No backend behavior change beyond the new `myRole` field.

## What Plan F will pick up
- Promote `applicationId` / `primaryApplicationId` to `NOT NULL` in each scoped table.
- Remove `off` and `warn` paths in `applyEnforcement`; the layer becomes always-on.
- Decommission the `bypass` scope-mode label.
