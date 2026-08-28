# App Selector / Scope Switcher

Status: **Draft**
Used by: NewChange wizard (`src/routes/changes/NewChange.tsx:277`), CMDB List (`src/routes/cmdb/CMDBList.tsx:84`), future create flows (Releases `NewReleaseModal`, Improvements `CreateInitiativeModal`), any scoped list/detail consuming `useScope` / `PageScopeChip` — Plan E behind `VITE_FEATURE_APP_SCOPE_UI`

Source: `src/lib/scope/ScopeContext.tsx:1-106` · `src/lib/scope/featureFlag.ts:1-15` · `src/lib/scope/persistence.ts:1-32` · `src/hooks/useScopedAppId.ts:1-43` · `src/components/scope/AppScopeSwitcher.tsx:1-203` · `src/components/scope/PageScopeChip.tsx:1-38` · `src/components/scope/ScopeMismatchModal.tsx:1-54` · `src/services/adminService.ts:93-105` (`CatalogAppDto`) · `server/repositories/applicationMembership.ts:110-157` · `prisma/schema.prisma:178-211` (`Application` + `ApplicationTeam` + `ApplicationTeamRole`)
Ref: [`../../design/01-erd.md`](../../design/01-erd.md) · [`../../design/02-api-contract.md`](../../design/02-api-contract.md) · [`../../design/08-design-system.md`](../../design/08-design-system.md) · [`../../DESIGN-SYSTEM.md`](../../DESIGN-SYSTEM.md) · [`../applications.md`](../applications.md) · [`../changes.md`](../changes.md) · [`../../superpowers/plans/2026-05-15-rbac-app-scope-plan-e-switcher-ux.md`](../../superpowers/plans/2026-05-15-rbac-app-scope-plan-e-switcher-ux.md) · [`../../superpowers/specs/2026-05-15-rbac-app-scope-design.md`](../../superpowers/specs/2026-05-15-rbac-app-scope-design.md) §7 · terra `docs/features/_shared/app-selector.md` (ported shape — OIS adds `ois-*` tokens + `criticality` chip + `localStorage` per-user keys)

---

## Purpose

Scope switcher membuat **konteks aplikasi aktif** eksplisit di seluruh OIS. Tanpa ini user dari Team A bisa tidak sengaja menulis ke App B, dan list view tenggelam oleh data lintas-app. Shared concern ini memusatkan: (1) state `scope = 'all' | {kind:'app', appId}` di `ScopeContext`, (2) TopBar `AppScopeSwitcher` dengan pin + search + "All my apps" default, (3) per-page `PageScopeChip` sebagai indikator read-only, (4) form helper `useScopedAppId` yang auto-fill `applicationId` saat scope single writable app, dan (5) `ScopeMismatchModal` yang menghalangi submit lintas-scope tanpa konfirmasi. Semua halaman scoped cukup `Ref: _shared/app-selector.md` — tidak duplikasi logic switcher, persistensi, atau flag.

ITIL 4: Application adalah scope boundary (`applicationId`/`primaryApplicationId` di semua modul) dan ownership boundary (`ApplicationTeamRole OWNER/CONTRIBUTOR/VIEWER`) — lihat `applications.md` §Intent dan `01-erd.md` §ORG.

---

## Current State (snapshot 2026-08-28)

- **Provider:** `ScopeProvider` di `src/lib/scope/ScopeContext.tsx:29-100` — `createContext` `ScopeContextValue` dengan `scope`, `setScope`, `myApps`, `scopedAppIds`, `writableApps`, `pinned`, `togglePin`, `loading`. Membaca `CatalogAppDto[]` via `applicationCatalogApi.list()` (`src/services/adminService.ts:103-105`) sekali per `userId`. Men-derive `myApps` (`isMember && myRole !== null`) dan `writableApps` (`role OWNER|CONTRIBUTOR` only). Mount di `src/components/layout/AppShell.tsx` di dalam `CurrentUserContext` (agar punya session) tapi di atas `<Outlet>`.
- **Hook:** `useScope()` di `ScopeContext.tsx:102-106` — throws jika di luar provider (fail-fast).
- **Feature flag:** `readFeatureFlag` + `useScopeUiEnabled` di `src/lib/scope/featureFlag.ts:3-15` — resolusi `localStorage('feature.app_scope_ui') === 'true'|'false'` else `import.meta.env.VITE_FEATURE_APP_SCOPE_UI === 'true'` (`.env.example:23` default `false`). Flag adalah frontend-only; flip `localStorage` tidak butuh deploy (Plan E §3). Semua switcher/chip/mismatch guard early-return `null` / no-op ketika `!enabled` — hook order tetap stabil (hooks before guard, lihat `AppScopeSwitcher.tsx:63-72`).
- **Persistence:** `src/lib/scope/persistence.ts:3-32` — `SCOPE_KEY = ois.scope.<userId>` dan `PIN_KEY = ois.scope.<userId>.pinned`. `readScope` validasi `v==='all'` atau `{kind:'app', appId:string}` else fallback `'all'`; `readPinned` filter array string; keduanya try/catch. `writeScope`/`writePinned` `JSON.stringify`. Dibaca di `useEffect` saat `userId` tersedia (`ScopeContext.tsx:37-41`), ditulis di `setScope`/`togglePin` (`:78-91`) + `console.debug('[scope] switch', {from,to})` untuk telemetry stub.
- **TopBar switcher:** `AppScopeSwitcher.tsx:46-203` ≤203 lines. Trigger button `h-9 px-3 rounded-md border text-xs font-medium` dengan `chipClass` dari `CRITICALITY_CLASSES` (`P1 red-50/red-700/b-red-200` dst.) + `Layers 14` + `Scope: <label>` + `ChevronDown 14 rotate-180 when open`. Dropdown `w-72 bg-white rounded-lg shadow-lg border border-ois-border z-50` berisi: search (hanya `myApps.length>10`), button `All my apps` (pinned top, `scope==='all' bg-ois-bg font-medium`), section `Pinned` dan `All apps` via `AppRow` (name truncate + `Pin 12 fill-current` vs `PinOff 12`), empty `You're not a member ... Browse catalog /applications/catalog`. Outside-click handler via `wrapperRef` + `mousedown` listener (`:54-60`); query `useMemo` filter `name|code includes q`.
- **Page chip:** `PageScopeChip.tsx:14-38` ≤38 lines. `scope==='all' → span Layers 12 All my apps border-ois-border text-ois-text-muted rounded-full px-2.5 py-1 text-xs`; else resolve `myApps.find(scope.appId)` → `colorClass` dari `criticality` (`critical/high/medium/low → red/amber/yellow/emerald`), fallback gray. Dipakai minimal di `CMDBList` header (design spec §7.2 — target 4 halaman awal: CMDB, Events, Incidents, Changes).
- **Form hook:** `useScopedAppId.ts:11-43` — `value: string|null`, `setValue`, `source: 'scope'|'manual'`, `requireApplicationId = scope==='all'`, `writableApps`. `value = source==='manual' ? manual : scopeAppId` dimana `scopeAppId = scope!=='all'? scope.appId : null`. `setValue` flips `source` → `'manual'`. Re-export `writableApps` agar caller tidak import dua tempat. (Plan E sketch menambahkan `useEffect` auto-fill saat `scope` berubah ke writable app; implementasi final pakai `useState manual+source` yang lebih sederhana — caller tetap dapat pre-fill dengan membaca `value` langsung.)
- **Mismatch modal:** `ScopeMismatchModal.tsx:5-54` — props `open, currentScopeName, submittedAppName, onCancel, onConfirm: Promise<void>`. `Modal isOpen title "Scope mismatch" size="sm"` + `p text-sm text-ois-text You're submitting this to <submittedAppName> but your current scope is <currentScopeName>. Continue?` + `Button outline Cancel disabled busy` + `Button primary Confirm submit / Submitting…`. `busy` lokal untuk async confirm.
- **Integration — NewChange:** `NewChange.tsx:17-20` import trio `useScopedAppId, useScope, useScopeUiEnabled` + `ScopeMismatchModal`; state `scope, scopedAppId, requireApplicationId, writableApps, enabled, pendingSubmit` (`:275-278`). Review step `Card Application` (`:698-730`): jika `requireApplicationId` render `select h-10 px-3 rounded-md border-ois-border bg-white focus:border-ois-primary focus:ring-1` dengan `writableApps` options + `required`; else display `Application: <writableApps.find(scopedAppId)?.name>`. Submit guard `handleNext` (`:894-906`): `requireApplicationId && !scopedAppId → error "Please choose an Application."`; `scope!=='all' && scopedAppId && scope.appId !== scopedAppId → setPendingSubmit(() => doSubmit) else doSubmit`. Pending modal di-render (`:911-927`) dengan `currentScopeName` dan `submittedAppName` dari `writableApps.find`. `doSubmit` kirim `applicationId: scopedAppId ?? undefined` ke `changesService.create` (`:883`).
- **Integration — CMDB:** `CMDBList.tsx:23-24,84-85` — `useScope, useScopeUiEnabled, PageScopeChip` di header + `scopedAppIds` untuk filter `visibleCIs = enabled && scope!=='all' ? cis.filter(ci.primaryApplicationId===null || scopedAppIds.includes(ci.primaryApplicationId)) : cis` (NULL legacy selalu tampil).
- **Catalog DTO:** `CatalogAppDto` (`adminService.ts:93-101`) `{id, code, name, criticality, ownerTeamIds, isMember, myRole}` — `isMember`/`myRole` di-derive `roleByApp.has(id)` strongest `ROLE_RANK OWNER 3 > CONTRIBUTOR 2 > VIEWER 1` di `applicationMembership.ts:140-155`.
- **Mount order:** `applicationMembershipRouter` mounted di `server/routes/applications.ts:12-17` — `GET /catalog` sebelum `/:appId` agar tidak shadow (Design Preservation #12 di `applications.md`).

Working end-to-end (Plan E Done criteria): `AppScopeSwitcher` muncul saat flag on, pin persist, chip berwarna, CMDB filter + NULL passthrough, NewChange pre-fill + mismatch intercept.

---

## Behavior

### TopBar — `AppScopeSwitcher`

Trigger: user klik `Scope: All my apps | <App>` di TopBar (left of search, `src/components/layout/TopBar.tsx`).

Steps:

1. Provider sudah hydrate `scope` + `pinned` dari `localStorage` per `userId` + `catalog` dari `GET /applications/catalog`.
2. Klik trigger toggle `open` (`useState false`). `useEffect` pasang `mousedown` outside handler → `setOpen(false)`.
3. Dropdown render: `All my apps` row (`setScope('all') → writeScope → debug → close`), lalu `Pinned` section (`pinnedApps = filtered.filter(pinned.includes(id))`) lalu `All apps` (`otherApps`). Tiap `AppRow` punya tombol select (`setScope({kind:'app', appId}) → writeScope → close`) dan tombol pin (`togglePin` → `writePinned`).
4. Jika `myApps.length>10`, input search `pl-7 pr-2 py-1.5 text-xs rounded border-ois-border focus:border-ois-primary focus:ring-1` mem-filter `name|code includes q` via `useMemo`.
5. Empty `myApps.length===0 && !loading` → text `You're not a member ... Browse catalog`.

Outcome: `scope` baru persist per-user, `scopedAppIds` re-derive, semua consumer (`PageScopeChip`, `CMDBList`, `useScopedAppId`) re-render.

### Page — `PageScopeChip`

Trigger: page render (CMDB, Incidents, Changes, Events — opt-in per page).

- Jika `!useScopeUiEnabled()` → `null` (no-op, flag off).
- `scope==='all'` → outline pill `All my apps` (`Layers 12` + `border-ois-border text-ois-text-muted`).
- Single app → resolve `app = myApps.find(scope.appId)`; pill `bg-* border-* text-*` dari `criticality` mapping (P1 red dst.), fallback `bg-gray-100`. Text `app.name ?? scope.appId`.

Tidak ada dropdown — chip adalah indikator read-only; interaksi tetap lewat TopBar.

### Form — `useScopedAppId` + `ScopeMismatchModal`

Trigger: user buka create form (NewChange `/changes/new`, future `NewReleaseModal`, `CreateInitiativeModal`).

Rules (`useScopedAppId`):

- `scope === 'all'` → `requireApplicationId = true`, `value = manual` (null sampai user pilih). Form **wajib** render picker `select writableApps` required.
- `scope === {appId}` dan app tersebut writable (`OWNER|CONTRIBUTOR`) → `value = scope.appId`, `requireApplicationId = false`, `source='scope'`. Picker boleh hidden; value auto-fill.
- `setValue(id|null)` → `source='manual'`, `manual=id` — user override.

Submit flow (NewChange `handleNext`):

1. `requireApplicationId && !scopedAppId` → inline `submitError`.
2. `scope!=='all' && scopedAppId && scope.appId !== scopedAppId` → `setPendingSubmit(() => doSubmit)` → render `ScopeMismatchModal` open dengan `currentScopeName` (scope app name) dan `submittedAppName` (picker app name). `onCancel` clear pending; `onConfirm` invokes `doSubmit()` (async, busy state di modal).
3. Else langsung `doSubmit()` → `changesService.create({..., applicationId: scopedAppId ?? undefined})`.

Outcome: user tidak bisa "tidak sengaja" submit ke app berbeda tanpa confirm; `All my apps` memaksa eksplisit pilih.

### Filtering Semantics (list pages)

Saat `enabled && scope!=='all'`, list consumer filter client-side:

```ts
const { scope, scopedAppIds } = useScope();
const enabled = useScopeUiEnabled();
const visible = enabled && scope !== 'all'
  ? rows.filter(r => r.primaryApplicationId === null || scopedAppIds.includes(r.primaryApplicationId))
  : rows;
```

`NULL` = legacy rows (pre-backfill) selalu tampil sampai Plan F `NOT NULL` enforced. Server enforcement tetap via `req.scoped.*` + `ScopeViolationError → 403 scope_violation` (`02-api-contract.md` §Scope) — filter client hanya UX, bukan security boundary.

---

## Data Model

Ref: [`../../design/01-erd.md`](../../design/01-erd.md) §ORG + `prisma/schema.prisma:178-211`.

```prisma
model Application {
  id          String   @id
  tenantId    String
  code        String   // @@unique([tenantId, code])
  name        String
  criticality String?  // P1..P4 | null — drives chip color
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  teams    ApplicationTeam[]
  @@index([tenantId])
}

enum ApplicationTeamRole { OWNER CONTRIBUTOR VIEWER }

model ApplicationTeam {
  applicationId String
  teamId        String
  role          ApplicationTeamRole @default(CONTRIBUTOR)
  addedById     String?
  addedAt       DateTime @default(now())
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  team        Team        @relation(fields: [teamId], references: [id], onDelete: Cascade)
  @@id([applicationId, teamId])
  @@index([teamId])
  @@index([applicationId, role])
}
```

- Ownership: `OWNER` kelola membership + write penuh; `CONTRIBUTOR` write; `VIEWER` read-only. Guard `last_owner` (`ownerCount<=1 → 409 last_owner`) di `applicationMembership.ts:77-103` prevents orphan app.
- Catalog derivation: `resolveScopeContext({userId, tenantId})` (`server/scope/context.ts:21-48`) loads `ApplicationTeam where teamId = user.teamId` + `UserFunctionalRole` → `ScopeContext.appMemberships` → `listCatalog` computes `roleByApp` strongest `ROLE_RANK OWNER 3 > CONTRIBUTOR 2 > VIEWER 1` → `CatalogAppDto.isMember/myRole`.
- Operational scoped tables: `ConfigurationItem.primaryApplicationId`, `Event/Incident/Change/Problem/ServiceRequest/Release.applicationId` (`String` JSON hari ini, `@@index([tenantId, applicationId])`) — semua `tenantId` + `applicationId` filtered via `req.scoped.*` (lint `no-restricted-imports` enforced `eslint.config.js:19`, exempt `admin.ts` etc.).

---

## Feature Flag & Persistence

| Layer | Key | File | Notes |
|-------|-----|------|-------|
| Build-time | `import.meta.env.VITE_FEATURE_APP_SCOPE_UI` | `.env.example:23` | Default `false`; set `true` untuk prod build |
| Runtime | `localStorage 'feature.app_scope_ui'` | `featureFlag.ts:1-8` | `'true'/'false'` override build-time; `readFeatureFlag()` used by `useScopeUiEnabled()` |
| Persist scope | `ois.scope.<userId>` | `persistence.ts:3` | `JSON.stringify(ScopeValue)` |
| Persist pins | `ois.scope.<userId>.pinned` | `persistence.ts:4` | `JSON.stringify(string[])` |

Reading order (flag): `localStorage true > false > env`. Flipping flag requires refresh (no storage-event subscription — acceptable internal flag). All scope UI early-returns after hooks (Rules of Hooks).

---

## Component Inventory

| Component | File | Props / API | Notes |
|-----------|------|-------------|-------|
| `ScopeProvider` + `useScope` | `ScopeContext.tsx:29,102` | `ScopeValue = 'all' \| {kind:'app', appId}` <br> `ScopeContextValue {scope, setScope, myApps, scopedAppIds, writableApps, pinned, togglePin, loading}` | `myApps` from `catalog.filter(isMember)`, `writableApps` filter `OWNER/CONTRIBUTOR`, `scopedAppIds` derive |
| `useScopeUiEnabled` / `readFeatureFlag` | `featureFlag.ts:3,11` | `() => boolean` | Front-only flag helper |
| `readScope/writeScope/readPinned/writePinned` | `persistence.ts:6-31` | `(userId, ScopeValue/string[])` | Validates JSON, fallback `'all'/[]` |
| `useScopedAppId` | `useScopedAppId.ts:26` | `{value, setValue, source, requireApplicationId, writableApps}` | Auto-fill when scoped, else require picker |
| `AppScopeSwitcher` | `AppScopeSwitcher.tsx:46` | `() => ReactNode \| null` | Trigger + dropdown + pin/search/empty |
| `PageScopeChip` | `PageScopeChip.tsx:14` | `() => ReactNode \| null` | Read-only pill next to page title |
| `ScopeMismatchModal` | `ScopeMismatchModal.tsx:13` | `{open, currentScopeName, submittedAppName, onCancel, onConfirm}` | Controlled confirm before cross-scope submit |

Provider must wrap inside `CurrentUserContext` (needs `userId`) and above rendered `<Outlet>`. Mount verified in `AppShell.tsx`.

---

## API Touchpoints

Ref: [`../../design/02-api-contract.md`](../../design/02-api-contract.md) §Resource routers.

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| Catalog read | `GET /api/v1/applications/catalog` | `requireAuth` only (public catalog) | `resolveScopeContext → listCatalog(tenantId, appMemberships) → CatalogAppDto[]` — source of `myApps/writableApps` |
| Manageable | `GET /api/v1/applications/manageable` | `requireAppManager` (OWNER \| PLATFORM_ADMIN \| system.admin) | Used by `_shared/app-selector.md` future quick-switch for manageable apps |
| List teams | `GET /api/v1/applications/:appId/teams` | tenant existence check | Not scoped to selector directly |
| Scope enforcement (write) | `POST/PATCH /changes`, `/incidents`, etc. via `req.scoped.*` | `change.create/write` + `ApplicationTeamRole` | `ScopeViolationError → 403 {error:'scope_violation'}` if `applicationId` not in writable set |

No new endpoint for selector itself — selector is catalog consumer only. Telemetry stub `console.debug('[scope] switch')` on `setScope` (`ScopeContext.tsx:82`).

---

## Tokens & Design Preservation

Tokens via `src/index.css:7-59` (`@theme`) + `docs/DESIGN-SYSTEM.md` — **jangan hardcode hex** selain mapping di bawah.

| Element | Token / Class | Value / Usage |
|---------|---------------|---------------|
| Page bg / surface / border | `ois-bg #F7F8FA` / `ois-surface #FFFFFF` / `ois-border #E4E7EC` / `ois-border-strong #D0D5DD` | Card shell `bg-white border border-ois-border rounded-ois-card`, dropdown `shadow-lg` |
| Text | `ois-text #101828` / `ois-text-muted #475467` / `ois-text-subtle #98A2B3` | Trigger `text-ois-text`, placeholder `text-ois-text-subtle`, section label `text-[11px] uppercase tracking-widest` |
| Primary | `ois-primary #1F4FD4` / `hover #1A42B5` / `pale #EEF2FF` + `focus:ring-ois-primary/20` | Active chip `bg-ois-primary text-white border-ois-primary`, select focus `border-ois-primary ring-1 ring-ois-primary` |
| Success / warning / danger pale | `ois-success #12B76A #ECFDF3` / `ois-warning #F79009 #FFFAEB` / `ois-danger #F04438 #FEF3F2` | Dot `w-1.5 h-1.5 rounded-full` inside membership pill (not selector directly) |
| Criticality chip | `CRITICALITY_CLASSES` in `AppScopeSwitcher.tsx:7-12` `P1 red-50/red-700/b-red-200`, `P2 amber-50/amber-700/b-amber-200`, `P3 yellow-50/yellow-700/b-yellow-200`, `P4 emerald-50/emerald-700/b-emerald-200` | Active scope label + `PageScopeChip` `criticalityColors` mapping (`critical/high/medium/low → red/amber/yellow/emerald`) |
| Radius | `ois-card 8px`, `ois-btn 6px`, `ois-badge 4px`, `ois-modal 12px` | Trigger `rounded-md`, dropdown `rounded-lg`, pills `rounded-full`, modal `size sm max-w-md` |
| Font | `Plus Jakarta Sans / Inter` sans, `Geist Mono / JetBrains Mono` mono | Labels `text-xs font-medium`, ids `font-mono text-[11px]` |
| Shadow | `ois-dropdown` / `ois-modal` | Dropdown `shadow-lg` |

Wajib pertahankan:

1. **Trigger `h-9 px-3 rounded-md border text-xs font-medium`** dengan `chipClass` criticality + `Layers 14` + `ChevronDown 14 rotate-180` — jangan ganti jadi `h-10` atau `Button` variant.
2. **Dropdown `w-72 bg-white rounded-lg shadow-lg border-ois-border z-50`** + `All my apps` row `Layers 14` top + `Pinned`/`All apps` sections `text-[10px] uppercase tracking-wider text-ois-text-subtle` — urutan Pinned dulu.
3. **`AppRow` `flex items-center justify-between px-3 py-1.5 text-xs hover:bg-ois-bg`** active `bg-ois-bg font-medium`, pin button `Pin12 fill-current` vs `PinOff12`.
4. **Search only when `myApps.length>10`** — `Search14 left-2 top-1/2 -translate-y-1/2 text-ois-text-subtle` + `input pl-7 pr-2 py-1.5 text-xs rounded border-ois-border focus:border-ois-primary focus:ring-1`.
5. **Page chip `rounded-full border text-xs font-medium px-2.5 py-1`** + `Layers12` — `All my apps` muted, single app criticality-colored.
6. **Mismatch modal `Modal size sm title Scope mismatch`** + text `You're submitting this to <strong submitted> but your current scope is <strong current>. Continue?` + `Cancel outline` / `Confirm submit busy Submitting… primary`.
7. **Persistence keys `ois.scope.<userId>` + `ois.scope.<userId>.pinned`** per-user, JSON strict, fallback `'all'/[]` — jangan pakai global `ois.scope` tanpa userId.
8. **Flag resolution `localStorage > env`** + early-return after hooks + `console.debug('[scope] switch')` — hook order preservation.
9. **Catalog mount `GET /catalog` before `/:appId`** in `applicationsRouter` — jangan reorder.
10. **Tokens `ois-*` only** — jangan hardcode `#1F4FD4` etc. diluar `CRITICALITY_CLASSES` / `criticalityColors` mapping yang memang ad-hoc per design spec §7.

---

## Edge Cases

- **Flag off:** `useScopeUiEnabled()===false` → switcher/chip render `null`, form guard skipped (`enabled` check in `handleNext`/`doSubmit`), forms tetap terima `applicationId` manual jika developer wire field tanpa hook — rollout reversible tanpa deploy.
- **No membership:** `myApps.length===0 && !loading` → switcher empty `You're not a member ... Browse catalog`, chip still `All my apps`, `writableApps=[]` → picker `Select an application…` dengan 0 options + guard `Please choose an Application` pada submit.
- **VIEWER-only scope:** user pin single app where `role===VIEWER` → `writableApps` excludes it, `useScopedAppId.value` may still be that `appId` (scope) but write will `403 scope_violation` server-side; UX belum hide trigger write buttons — deferred to read-only indicator (§7.4 design spec).
- **Catalog loading:** `loading===true` (`catalog===null`) → dropdown still renders but sections empty; empty message only when `!loading && myApps.length===0` — avoids flicker.
- **Stale scope after membership removed:** `scope.appId` may point to app no longer in `myApps` → active label fallback `…` (`AppScopeSwitcher.tsx:79`), chip fallback `scope.appId`, write will 403 — user must switch via `All my apps`.
- **Pinned missing app:** `pinned` array may contain ids no longer in `filtered` (app left) — `pinnedApps = filtered.filter(pinned.includes)` naturally drops them, no error.
- **SSR / no window:** `readFeatureFlag` guards `typeof window==='undefined' → false`; `useScopeUiEnabled` safe during build.
- **Cross-tenant leak prevention:** all `applicationId` writes still validated via `req.scoped.*` + `withScopedDb` (`server/app.ts:126`, `server/middleware/scopedDb.ts:19`); client filter is not security boundary — `ScopeViolationError` always 403.
- **Concurrent pin writes:** `togglePin` uses functional `setPinned(prev => ...)` + `writePinned` inside updater — avoids stale closure.
- **Outside click cleanup:** `useEffect` removes `mousedown` listener on unmount / `open` change (`AppScopeSwitcher.tsx:59`).
- **Long app names:** `AppRow` `truncate min-w-0 pr-1` + `flex-1` prevents overflow; chip `Layers` + text stays single line.
- **NULL `primaryApplicationId` legacy:** `visibleCIs` includes `null` rows when scoped — ensures backfill-pending rows not hidden unexpectedly (Plan C → F).

---

## Phase 2 Deferred

- Per-page filter override (multi-select app filter as temporary override without changing TopBar) — design spec §7.2 deferred, chip stays read-only.
- "All tenant apps" section for `PLATFORM_ADMIN`/`AUDITOR` (gated `system.admin` or `AUDITOR` functional role) — scoped out of Plan E.
- Notification routing through scope (cross-app mentions always shown — spec §7.6).
- `Application.criticality` derived from live P1 count vs static field — open question `superpowers/specs/...design.md` §11.
- Inbox/notifikasi follow active scope — currently inbox poll only, not scope-filtered server-side.
- Remove `off/warn` `SCOPE_ENFORCEMENT_MODE` path — done Plan F (always-on).
- Bulk `localStorage` migration when `ScopeValue` shape evolves — add JSON schema version key.

---

## Open Items

- [ ] Adopt `PageScopeChip` di Events/Incidents/Changes `/incidents`, `/changes` headers (CMDB done; 3 pages pending per spec §7.2).
- [ ] Wire `useScopedAppId` di `NewReleaseModal` + `CreateInitiativeModal` (parity NewChange; `releases.md:289` + `improvements.md:293` note `useScopedAppId`).
- [ ] Resolve `VIEWER`-scoped write UX — hide/disable Edit buttons with tooltip `Read-only — request access to App X` (§7.4).
- [ ] Define `PENDING_REQUESTS` access-request flow if approvals shift to `pending_user` like `requests.md` — catalog `Contact owners mailto` still TODO (`applications.md` §Stub).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — port terra `_shared/app-selector.md` shape to OIS: `ScopeContext` (`ScopeValue 'all'\|app`, `myApps/writableApps/pinned/scopedAppIds`), `featureFlag` (`localStorage feature.app_scope_ui > VITE_FEATURE_APP_SCOPE_UI`), `persistence` (`ois.scope.<userId>` + `ois.scope.<userId>.pinned`), `useScopedAppId` (`value/source/requireApplicationId/writableApps`), `AppScopeSwitcher` (`All/Pinned/Other + search>10 + criticality chip`), `PageScopeChip`, `ScopeMismatchModal`, `NewChange` 4-step picker + mismatch guard + `CMDBList` scoped filter (NULL passthrough), `ApplicationTeam OWNER/CONTRIBUTOR/VIEWER` + `ROLE_RANK`, `CatalogAppDto isMember/myRole`, `ois-*` tokens (`ois-primary #1F4FD4`, `ois-bg #F7F8FA`, `ois-border #E4E7EC`, etc.) + `CRITICALITY_CLASSES` P1-4 — refs `01-erd`, `02-api-contract`, `08-design-system`, `applications.md`, `changes.md`, Plan E | — |
