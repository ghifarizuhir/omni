# Known Issues — Sidebar

Status: **Stable — audit `Sidebar` vs `src/components/layout/Sidebar.tsx`, `src/index.css`, terra ref**

Source of truth: [`src/components/layout/Sidebar.tsx`](../../../src/components/layout/Sidebar.tsx) · [`src/components/layout/AppShell.tsx`](../../../src/components/layout/AppShell.tsx) · [`src/components/layout/SidebarContextMenu.tsx`](../../../src/components/layout/SidebarContextMenu.tsx) · [`src/lib/sidebar-pins.ts`](../../../src/lib/sidebar-pins.ts) · [`src/index.css`](../../../src/index.css) · [`docs/ui/sidebar.md`](../sidebar.md) · [`docs/ui/design-tokens.md`](../design-tokens.md)

Terra ref: `terra-service-management/docs/ui/audit/known-issues-sidebar.md` — 7 issues (4 fixed, 3 verified) · terra chrome `w-8 h-8 rounded-lg` icon housing + dark `data-theme` + `localStorage 180px` persist + `panel` backdrop — OIS deltas noted per issue (light `ois-*` `#F4F5F7` dimmed chrome · no housing · `w-[240px]/w-16` · `motion/react` crossfade · pinned via `ois.sidebar.pins.v1`).

> Scope docs: [`docs/ui/sidebar.md`](../sidebar.md) is current-state spec (exact classes/tokens/sections/badges). This file tracks gaps only. Not aspirational.

---

## Scope

| Component | File | Status |
|-----------|------|--------|
| Shell `<aside>` | `src/components/layout/Sidebar.tsx:112-117` | audited |
| Header — brand + mode toggle Management ↔ AI | `Sidebar.tsx:119-198` · `AppShell.tsx:20-60` | audited |
| Content crossfade `AnimatePresence mode="wait"` | `Sidebar.tsx:201-295` | audited |
| Sections `SidebarSection` | `Sidebar.tsx:310-326` | audited |
| Items `SidebarItem` + live badges | `Sidebar.tsx:328-399` · `Sidebar.tsx:68-106` | audited |
| Favorites pins + context menu | `src/lib/sidebar-pins.ts:1-63` · `SidebarContextMenu.tsx:19-84` | audited |
| Tokens — sidebar chrome | `src/index.css:40-49` | audited |

---

## Findings (2026-08-28)

| # | Area | Issue | Severity | Location | Terra delta / Notes | Status |
|---|------|-------|----------|----------|---------------------|--------|
| 1 | Pins `useSyncExternalStore` snapshot | `read()` re-parsed `localStorage` on every call (`JSON.parse` allocates new array) — `getSnapshot` returned fresh reference each render → `useSyncExternalStore` re-fired infinitely, exceeding React update-depth. No `snapshotCache` / `lastRaw` guard; `EMPTY` singleton not reused. | high | `src/lib/sidebar-pins.ts:11-34` · `Sidebar.tsx:109` `usePinnedPaths()` | Terra same `useSyncExternalStore` + cache pattern; OIS had regressed after pin feature (`558f69e`). Fixed in `c79bf49` — module-level `snapshotCache` + `lastRaw` invalidated only on `write()`. | **fixed** |
| 2 | RBAC Admin footer | `RBAC Admin` rendered unconditionally (or via `user.role` prop) — non-admin saw link on first paint before `role` hydrated; direct `isAdmin` derived from stale `useCurrentUser()` not `session.permissions`. | medium | `Sidebar.tsx:64-66` `session?.permissions.includes('system.admin')` · `Sidebar.tsx:287-289` `{isAdmin && <SidebarItem to="/admin">}` · `SidebarContextMenu.tsx` LOOKUP includes `/admin` (favorites bypass not gated, intentional — route guard still enforces) | Terra gates via `permissions` session (`admin.ts` exempt `scopedDb`). OIS fixed in `0671b6f` — gate on `useAuthSession()` `system.admin`; footer conditional, route `requirePermission('system.admin')` remains enforcer. | **fixed** |
| 3 | Mode toggle + section active highlight | Toggle buttons used `disabled={isAiRoute}` / `disabled={!isAiRoute}` — active button became non-clickable, broke `aria-pressed` semantics and keyboard focus; no visual cue which section group contained active route (user scanned every item). Unused `ChevronLeft/Right` + `onToggle` prop dead code. | low | `Sidebar.tsx:148-194` · `Sidebar.tsx:320` `group-has-[[aria-current='page']]/section:text-ois-primary` · `Sidebar.tsx:155-167` `aria-pressed` + `motion.div layoutId="sidebar-mode-indicator"` · `AppShell.tsx:20` `isAiRoute` | Terra uses `aria-pressed` only + `group-has` label tint; OIS disabled removed in `c95b5db`, highlight added `group-has-[[aria-current='page']]` (Tailwind 4). Verified: `sidebar.md:152-154` preserves token `#98A2B3 → #1F4FD4` transition. | **fixed** |
| 4 | Live badges — coverage + collapsed signal + route matching | Early sidebar had badges only on Inbox/Incidents; 8 more live signals missing (Problems, Service Requests amber, Changes CAB, Releases rolled_back red, Deployments active, Testing sign-offs overdue red, Availability outages+breached red, On-Call + Improvements). Collapsed `w-16` hid counts entirely (no dot). Root `NavLink to="/"` without `end` matched every nested route → Overview always active. Section dividers lost in collapsed. | low | `Sidebar.tsx:68-106` 11 derived counts (`urgentInboxCount`…`improvementsBlockedCount`) · `Sidebar.tsx:328-399` `badge` · `badgeVariant` · `dotColor` · `hasBadge` · `title` · `Sidebar.tsx:346` `end={to==='/'}` · `Sidebar.tsx:313` collapsed `:before` divider · `Sidebar.tsx:368-375` `absolute -top-0.5 -right-0.5 w-2 h-2 ring-2 ring-ois-sidebar-bg` | Terra same `urgent/warning/default` variants + dot `ring-2` on icon wrapper; OIS completed in `a60072e` — `warning` amber alongside `urgent` red, numeric `min-w-[20px] h-5 text-[10px] font-bold` expanded vs dot collapsed; `title` includes `(N)` when collapsed. | **fixed** |
| 5 | Collapse persistence | `AppShell.tsx:12` `useState(false)` `sidebarCollapsed` local only, toggled via `TopBar onToggleSidebar={() => setSidebarCollapsed(!c)}` (`AppShell.tsx:66` · `Sidebar.tsx:113` `w-16`/`w-[240px]` `transition-all duration-300`). No `localStorage` — refresh resets to expanded `240px`. Terra persists `localStorage 180px` (or `terra.sidebar.collapsed`). | low | `src/components/layout/AppShell.tsx:12` · `Sidebar.tsx:113-116` · `TopBar` toggle · `audit/audit-global-shell.md:22` | Terra persist `localStorage` `180px`; OIS **intentionally different** — light dimmed chrome (`#F4F5F7` vs content `#FFFFFF`) prioritizes content pop; collapse is transient maximize-canvas, not preferred-state. Documented `sidebar.md:292-293` + `audit-global-shell.md:22` as low. No fix planned — verified intentional. | **verified** |
| 6 | Token `ois-sev-p3` duplicates `p2` | `--color-ois-sev-p3: #DC6803` equals `p2` (`src/index.css:36-37`), same `#DC6803` for both P2 and P3. At first glance looks like copy-paste bug. Also `--color-ois-sidebar-bg #F4F5F7` vs `--color-ois-bg #F7F8FA` vs `--color-ois-surface-muted #F1F3F7` delta `2-3` luma — subtle chrome distinction could be mistaken for token drift. | info | `src/index.css:35-38` · `src/index.css:40-42` · `design-tokens.md:52-57` | Terra same P2/P3 share `#DC6803` (P3 is pale treatment difference — priority bar `PRIORITY_COLOR[p]` solid, card uses pale + dark text). OIS verified intentional: `design-tokens.md:56` notes “pale bg + dark text (same as P2, see `src/index.css:37`)” + `sidebar.md:418` preserves `#F4F5F7` dim so `ois-content-bg #FFFFFF` pops. No change. | **verified** |
| 7 | Hardcoded brand treatment + Tailwind 4 / motion / storage edges | Brand badge gradient `linear-gradient(135deg,#1F4FD4→#185FA5→#0C447C)` + highlight `rgba(255,255,255,0.12)` + stripe glow `0 0 12px rgba(31,79,212,0.35)` + AI indicator gradient + `shadow 0 1px 4px rgba(31,79,212,0.35)` hardcode hex, not `var(--color-ois-primary)` (token divergence risk). Section label `group-has-[[aria-current='page']]/section:text-ois-primary` requires Tailwind 4 engine; `motion.div layoutId` spring `stiffness 500 damping 35` not guarded by `prefers-reduced-motion` CSS (`src/index.css:93` only guards `.ois-*` keyframes). Context menu `navigator.clipboard.writeText` promise `void`-ignored, `localStorage.setItem` quota error not caught, `pinned` `/admin` in Favorites bypasses `isAdmin` gate (route guard still blocks). | info | `Sidebar.tsx:125-126` · `Sidebar.tsx:185-187` · `Sidebar.tsx:363` `boxShadow glow` · `Sidebar.tsx:164` `layoutId="sidebar-mode-indicator"` · `Sidebar.tsx:320` `group-has` · `src/index.css:8-48` · `src/index.css:93` `prefers-reduced-motion` · `SidebarContextMenu.tsx:53` · `src/lib/sidebar-pins.ts:38` · `Sidebar.tsx:228-232` LOOKUP `if (!meta) return null` | Terra identical brand gradients (linear-card) + `group-has` + `motion/next`; OIS treats gradients as **brand treatment exception** (not semantic token — `sidebar.md:424` “brand treatment, intentionally 7px not token”), glow/shadow documented `sidebar.md:423` as token-adjacent. Fallbacks verified: `group-has` failure → label stays `text-ois-sidebar-section-label #98A2B3` (readable); `clipboard` failure degrades silently intentional; `setItem` quota low-risk (pins tiny); `Favorites /admin` leak safe due `requirePermission('system.admin')` on route. `prefers-reduced-motion` CSS covers card/hero motion; spring indicator is `500/35` subtle not vestibular trigger. Verified intentional — no fix. | **verified** |

Summary: **7 findings — 4 fixed, 3 verified (0 open).** No critical/high open; shell functional. `audit-global-shell.md:27` baseline consistent.

---

## Verification — per issue (evidence)

### #1 — `snapshotCache` fixed (high)

- **Source:** `src/lib/sidebar-pins.ts:11-34` — `EMPTY` singleton, `snapshotCache: string[]|null`, `lastRaw`, `parseRaw` try/catch + `filter typeof string`, `read()` `if (snapshotCache!==null && raw===lastRaw) return snapshotCache`, `write()` `lastRaw=undefined; snapshotCache=null; listeners.forEach`.
- **Verified:** `usePinnedPaths()` `useSyncExternalStore(read, () => EMPTY)` (`sidebar-pins.ts:57-62`). Sequential `read()` without `write()` returns `===` same array reference; after `togglePin` reference changes. No infinite loop in dev (React update-depth guard no longer fires). Mirrors terra `sidebar-pins` cache.
- **Status:** **fixed** `c79bf49` — stable snapshot.

### #2 — RBAC Admin gate fixed (medium)

- **Source:** `Sidebar.tsx:64-66` `const session = useAuthSession(); const isAdmin = !!session?.permissions.includes('system.admin')`; `Sidebar.tsx:287-289` conditional `{isAdmin && <SidebarItem to="/admin">}`; footer fallback `{isAdmin &&}` else only Settings.
- **Verified:** Grep `system.admin` — only `Sidebar.tsx:66` + route guard `server/routes/admin.ts`; unauthenticated / non-admin render shows footer `Settings` only; direct `navigate('/admin')` still 403 via `requirePermission`. Terra same `session.permissions` gate — delta documented `sidebar.md:171`.
- **Status:** **fixed** `0671b6f`.

### #3 — Mode toggle + section highlight fixed (low)

- **Source:** `Sidebar.tsx:148-198` `role="group" aria-label="Application mode"` `bg-ois-surface-muted border-ois-border rounded-[8px] p-[3px]`; buttons `aria-pressed={!isAiRoute}` / `aria-pressed={isAiRoute}` without `disabled`; `motion.div layoutId="sidebar-mode-indicator"` spring `500/35` (`Sidebar.tsx:161-166` white vs `185-187` gradient `#1F4FD4→#185FA5`). Section `SidebarSection` `group/section` + `group-has-[[aria-current='page']]/section:text-ois-primary` (`Sidebar.tsx:320`).
- **Verified:** `!collapsed` only — toggle hidden when `w-16`; both buttons focusable, `aria-pressed` reflects `AppShell.tsx:20` `pathname.startsWith('/ai')`; active indicator single instance via `layoutId` cross-group animation; section label turns `#1F4FD4` when child `NavLink aria-current="page"` — fallback Tailwind 4 missing → stays `#98A2B3` readable. No `ChevronLeft/Right` dead imports.
- **Status:** **fixed** `c95b5db`.

### #4 — Live badges + collapsed dot + route matching fixed (low)

- **Source:** 11 counts `Sidebar.tsx:81-106` (`urgentInboxCount` `priority==='urgent'`, `openIncidentCount` `!['resolved','closed']`, `openProblemCount` `!['closed']`, `requestsAwaitingUserCount` `pending_user` → `warning`, `changesAwaitingCabCount` `submitted|in_review`, `deploymentsActiveCount` `running|rolling_back`, `releasesUrgentCount` `rolled_back` → `urgent`, `availabilityCriticalCount` `!endedAt + breached`, `signOffsBreachedCount` `pending && dueAt<Date.now()`, `onCallActiveIncidentCount` `reduce activeIncidentCount`, `improvementsBlockedCount` `critical && on_hold`). `SidebarItem` `Sidebar.tsx:337-397` `hasBadge=badge>0`, `dotColor` mapping `urgent→bg-ois-danger #F04438` / `warning→bg-ois-warning #F79009` / `default→bg-ois-text-subtle #98A2B3`, expanded `min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold`, collapsed dot `w-2 h-2 rounded-full ring-2 ring-ois-sidebar-bg absolute -top-0.5 -right-0.5` + `title={hasBadge?`${label} (${badge})`:label}`. `NavLink end={to==='/'}` `Sidebar.tsx:346`.
- **Verified:** Table `sidebar.md:220-235` matches filters; zero → no badge/dot (`badge>0` guard), initial mount `useResource` `undefined ?? [] → 0` no flicker (`Sidebar.tsx:68-79`). Collapsed shows dot + tooltip `(N)`; expanded shows numeric pill with correct variant. `/` active only at exact root; nested `/incidents/:id` not marking Overview. Divider `px-2 [:not(:first-child)]:before:border-t` `Sidebar.tsx:313` preserves grouping when labels hidden.
- **Status:** **fixed** `a60072e`.

### #5 — Collapse persistence verified low (intentional)

- **Source:** `AppShell.tsx:12` `useState(false)`; `Sidebar.tsx:113` `cn(collapsed ? "w-16" : "w-[240px]")` + `transition-all duration-300` + `overflow-hidden` header; effects `collapsed→ !collapsed && subtitle/mode toggle hidden`, labels → dividers, items → dot.
- **Verified:** Refresh → `sidebarCollapsed` resets `false` (expanded) — confirmed via `AppShell.tsx:12` no `localStorage` read/write, no `useEffect` persist. Intentionally differs from terra `localStorage 180px` — decision captured `sidebar.md:292-293` + `audit-global-shell.md:22`. If persist desired, would be `localStorage ois.sidebar.collapsed` mirroring `ois.sidebar.pins.v1` key `sidebar-pins.ts:3`.
- **Status:** **verified** (intentional, low) — no fix.

### #6 — Token `p3==p2` verified info (intentional)

- **Source:** `src/index.css:35-38` `--color-ois-sev-p1 #B42318`, `p2 #DC6803`, `p3 #DC6803`, `p4 #027A48`; `design-tokens.md:52-57` table.
- **Verified:** Hex equality `p2===p3` intentional — P3 rendered as pale badge + dark text vs P2 solid fill (`design-tokens.md:56` “pale bg + dark text (same as P2, see `src/index.css:37`)”). Sidebar not directly affected (uses semantic `urgent/warning` not `sev-*`) but token audit confirms `src/index.css` is source of truth; no drift between `sidebar.md:418` preserved dim `#F4F5F7` and `ois-sidebar-bg`. Content chrome contrast verified `oes-sidebar-bg #F4F5F7` vs `ois-content-bg #FFFFFF` vs `ois-bg #F7F8FA` intentional dim subset.
- **Status:** **verified** (intentional, info).

### #7 — Brand hardcode + Tailwind/motion/storage edges verified info

- **Source:** `Sidebar.tsx:125-126` badge `linear-gradient(135deg,#1F4FD4 0%,#185FA5 60%,#0C447C 100%)` + `boxShadow 0 1px 4px rgba(31,79,212,0.35)` + `Sidebar.tsx:131` highlight; `Sidebar.tsx:185-187` AI `linear-gradient(135deg,#1F4FD4→#185FA5)` + `Sidebar.tsx:363` glow `boxShadow 0 0 12px rgba(31,79,212,0.35)`. Tokens `src/index.css:8-49` define `ois-primary #1F4FD4`, `ois-sidebar-bg #F4F5F7`, etc. — badge gradients deliberately synthesize stops `#185FA5 #0C447C` not separately tokenized (brand treatment per `sidebar.md:424`). `group-has` `Sidebar.tsx:320` + `motion` spring `Sidebar.tsx:161` + `src/index.css:93` `prefers-reduced-motion: no-preference` guards `@keyframes` only. `SidebarContextMenu.tsx:53` `void clipboard.writeText`, `src/lib/sidebar-pins.ts:38` `setItem` no catch, `Sidebar.tsx:228-232` favorites `if (!meta) return null` silent skip.
- **Verified:** Hardcodes isolated to brand chrome (OIS badge, AI toggle, active stripe glow) — not `text-*`/`bg-ois-*` semantic misuse; `cn()` preserves token palette elsewhere `bg-ois-sidebar-bg border-ois-sidebar-border text-ois-sidebar-item`. `group-has` degrades gracefully (label stays `#98A2B3`). Spring indicator subtle (`500/35`, `0.15s` crossfade `AnimatePresence mode="wait"` `Sidebar.tsx:202-224`) — not vestibular sensitive; CSS `prefers-reduced-motion` covers page animations, spring can be reduced via `motion` `reducedMotion` if needed but current low risk. Clipboard `void` intentional silent degrade; `setItem` quota tiny array (< 24 strings) low risk; favorites unknown path skip verified via `SIDEBAR_LOOKUP` `return null` — dirty `localStorage` safe, RBAC bypass safe due server `requirePermission('system.admin')`.
- **Status:** **verified** (intentional tolerances, info) — no fix; documented in `sidebar.md:418-427` Design Preservation.

---

## Terra Reference — detailed delta (OIS vs terra)

| Aspect | Terra | OIS `Sidebar.tsx` |
|--------|-------|-------------------|
| Chrome + theme | Dark `data-theme` toggle + terra `w-8 h-8 rounded-lg` icon housing | Light only `ois-*` · no housing (icon naked `size={18}` · `Sidebar.tsx:32-54` housing via wrapper `shrink-0 relative` only) · dimmed `ois-sidebar-bg #F4F5F7` vs content `#FFFFFF` so cards pop (`src/index.css:41-44`) |
| Width + collapse | `180px` persist `localStorage` · toggle in Sidebar | `w-[240px]` / `w-16` · state owner `AppShell.tsx:12` via `TopBar onToggleSidebar` · `transition-all 300ms` (`Sidebar.tsx:113-116`) · **not persist** verified #5 |
| Sections | Same 7 groups (+ Favorites pinned) but terra housing boxes | 7 groups + conditional `Favorites` `pinnedPaths.length>0` (`Sidebar.tsx:227-243`) + `Operations/Service Delivery/Change & Delivery/Service Health/Observability/Foundation` + footer `RBAC Admin` gated + `Settings` |
| Item active | `bg-theme-accent` + housing tint | `bg-ois-sidebar-item-active-bg rgba(31,79,212,0.08)` + `text-ois-sidebar-item-active-text #1F4FD4` + left `w-[3px] bg-ois-primary` glow `0 0 12px rgba(31,79,212,0.35)` + icon `text-ois-primary` (`Sidebar.tsx:348-366`) |
| Label highlight | JS `useLocation` compare | `group-has-[[aria-current='page']]/section:text-ois-primary` Tailwind 4 (`Sidebar.tsx:320`) |
| Badges | `urgent/warning/default` + collapsed dot `ring-2` | Same mapping + 11 signals (`Sidebar.tsx:81-106`) + numeric pills `min-w-[20px] h-5 text-[10px]` vs dot `w-2 h-2 ring-2 ring-ois-sidebar-bg` (`Sidebar.tsx:368-392`) |
| Mode toggle | `data-theme` dark sync | `Management ↔ AI Workspace` `role="group" aria-label="Application mode"` spring `layoutId="sidebar-mode-indicator"` · management white vs AI gradient (`Sidebar.tsx:148-194`) · `isAiRoute = pathname.startsWith('/ai')` (`AppShell.tsx:20`) |
| AI switching | `AiAssistantPanel` | `aiSidebarContent` via `Outlet context setAiSidebarContent` + `AnimatePresence mode="wait" opacity 0.15s` · collapsed + AI → `null` (`Sidebar.tsx:202-216`) |
| Pins | `localStorage` key `terra.sidebar.pins` + `useSyncExternalStore` + cache | `ois.sidebar.pins.v1` `JSON string[]` `localStorage` (`sidebar-pins.ts:3`) + `togglePin/isPinned/usePinnedPaths` `useSyncExternalStore` + `snapshotCache/lastRaw/EMPTY` fix #1 |
| Context menu | Same 3 items + outside/Escape/scroll dismiss | `fixed z-50 min-w-[180px] rounded-[8px] border-ois-border bg-white shadow-[0_8px_24px_rgba(16,24,40,0.10)]` · `Copy link` `window.location.origin+path` · `Open in new tab` `noopener,noreferrer` · dismiss `mousedown|keydown Escape|scroll capture` (`SidebarContextMenu.tsx:24-38`) |
| Tokens | `terra-*` `linear-card` dark | `ois-*` light only `#1F4FD4` · `#F4F5F7` · `#F1F3F7` · `#E4E7EC` · radius `ois-btn 6px` / brand `7px` / toggle `8px/6px` · shadow `ois-card/dropdown` (`src/index.css:1-59`) |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init `known-issues-sidebar.md` — 7 findings (4 fixed, 3 verified) from `Sidebar.tsx:1-399` · `AppShell.tsx:12,20,57-66` · `SidebarContextMenu.tsx:1-85` · `src/lib/sidebar-pins.ts:1-63` · `src/index.css:1-59,93` vs terra 7-issue ref (4 fixed 3 verified) — fixes `snapshotCache` (`c79bf49`), RBAC gate (`0671b6f`), mode-toggle+highlight (`c95b5db`), live-badges+dot+route (`a60072e`); verified collapse non-persist + `sev-p3==p2` + brand/edge tolerances vs `audit/audit-global-shell.md` baseline | `src/components/layout/Sidebar.tsx:31-54,64-106,112-399` · `src/index.css:35-49,93` · `docs/ui/sidebar.md` · `docs/ui/design-tokens.md` |

