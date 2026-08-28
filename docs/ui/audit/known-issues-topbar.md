# Known Issues — TopBar

Status: **Draft — audit `TopBar` vs `src/components/layout/TopBar.tsx`, `src/index.css`, terra ref**

Source of truth: [`src/components/layout/TopBar.tsx`](../../../src/components/layout/TopBar.tsx) · [`src/components/layout/AppShell.tsx`](../../../src/components/layout/AppShell.tsx) · [`src/lib/breadcrumbs.ts`](../../../src/lib/breadcrumbs.ts) · [`src/components/layout/NotificationDropdown.tsx`](../../../src/components/layout/NotificationDropdown.tsx) · [`src/components/layout/UserMenu.tsx`](../../../src/components/layout/UserMenu.tsx) · [`src/components/scope/AppScopeSwitcher.tsx`](../../../src/components/scope/AppScopeSwitcher.tsx) · [`src/components/ui/CmdKPalette.tsx`](../../../src/components/ui/CmdKPalette.tsx) · [`src/index.css`](../../../src/index.css)

Terra ref: `terra-service-management` TopBar — `h-9` `sticky` `bg-theme-bg/85 backdrop-blur-sm` + `IconChip` tier-2, `Cmd-K` only (no visible search), `localStorage` collapse `180px`, monochrome dark `terra-*` tokens — deltas noted per issue.

> Scope docs: [`docs/ui/topbar.md`](../topbar.md) is current-state spec. This file tracks gaps only. Not aspirational.

---

## Scope

| Component | File | Status |
|-----------|------|--------|
| TopBar container | `src/components/layout/TopBar.tsx:34-36` `h-14 bg-white border-b border-ois-border shrink-0 z-20` `boxShadow 0 1px 2px -1px rgba(16,24,40,0.06)` | audited |
| Left — hamburger + breadcrumb | `TopBar.tsx:39-57` `Menu size 20 ghost` + `nav flex items-center gap-1 text-xs font-medium` · `src/lib/breadcrumbs.ts:5-136` `LABELS 54` `IMPLICIT_PARENTS 3` `ID_LABELS 9` `looksLikeId` | audited |
| Right — health pill + AppScopeSwitcher + search + inbox + notifications + AI + avatar | `TopBar.tsx:61-140` · `AppScopeSwitcher.tsx:46-203` · `NotificationDropdown.tsx:13-125` · `UserMenu.tsx:16-69` | audited |
| Search field | `TopBar.tsx:75-87` `hidden md:block w-72 lg:w-96` `bg-ois-surface-muted rounded-ois-btn` `focus:ring-ois-primary/15` + `kbd ⌘K` | audited |
| Inbox + Notifications bells | `TopBar.tsx:89-115` `Inbox 20` `urgentInboxCount bg-ois-danger` + `Bell 20` `unreadNotifCount bg-ois-primary dot` | audited |
| AI + Avatar | `TopBar.tsx:117-140` `Sparkles 20 AI ghost` `showAi && onToggleAi` + `Avatar sm` `focus:outline-none` | audited |
| Stripe | `src/components/layout/AppShell.tsx:73-77` `ois-topbar-stripe h-[2px] w-full linear-gradient 90deg #1F4FD4→#0BA5EC anim 0.4s cubic-bezier(0.2,0,0,1) scaleX` `src/index.css:116-123` | audited |
| Tokens | `src/index.css:1-59` `ois-primary #1F4FD4` `ois-surface-muted #F1F3F7` `ois-success #12B76A` `ois-danger #F04438` `rounded-ois-btn 6px` `shadow-ois-dropdown` | audited |

---

## Summary

**Total 16: 5 medium, 6 low, 5 info.** No critical/high — shell functional, consistent with `audit/audit-global-shell.md:27`. TopBar container `h-14` flat `bg-white` pinned via `AppShell` flex `h-screen overflow-hidden` `main flex-1 overflow-y-auto p-6` (`TopBar.tsx:34-36` · `AppShell.tsx:64-79`), not terra `h-9 sticky backdrop-blur`. Search visible+palette duo intentional placeholder (`docs/features/_backlog.md:15` `field:value` future) but currently inert; dropdowns rely on `onMouseLeave` only; triple fetch duplicates no SWR; badge/breadcrumb/health/ping/a11y/mobile/socket/avatar/CmdK gaps below.

---

## Findings (2026-08-28)

| ID | Severity | Issue | File:line | Status | Terra delta |
|----|----------|-------|-----------|--------|-------------|
| 1 | medium | Search field decorative — no handler. Visible `input type text placeholder "Search across OIS..."` `w-72 lg:w-96` `hidden md:block` `bg-ois-surface-muted rounded-ois-btn focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/15` (`TopBar.tsx:79-83`) has no `value`/`onChange`/`onSubmit`/`onFocus`. Typing does nothing. Actual search is `CmdKPalette` via `AppShell.tsx:41-51` `metaKey+K` window listener + `kbd ⌘K` hint `TopBar.tsx:85` not a button. Duo retained per `topbar.md:355` preservation. | `TopBar.tsx:75-87` · `AppShell.tsx:41-51` · `CmdKPalette.tsx:52-157` | open | Terra `Cmd-K` only, no visible field. OIS duo intentional placeholder for scope-aware `field:value` search — consider wiring `input` to `CmdKPalette query` or `aria-disabled` + tooltip `Press ⌘K`. |
| 2 | medium | Dropdown close — `UserMenu` only `onMouseLeave`. `UserMenu.tsx:28` `onMouseLeave={onClose}` no `mousedown` outside / `Escape` / focus-trap. `showUserMenu` boolean `TopBar.tsx:23,135-140` stays true if user clicks outside without hover-out; keyboard cannot dismiss. | `TopBar.tsx:23` · `TopBar.tsx:135-140` · `UserMenu.tsx:26-28` | open | Terra `onMouseLeave` + outside handler. `AppScopeSwitcher.tsx:53-60` already uses `mousedown` outside pattern — TopBar UserMenu not. `SidebarContextMenu.tsx:24` closes on `mousedown`+`Escape`+`scroll`. |
| 3 | medium | Dropdown close — `NotificationDropdown` only `onMouseLeave`. `NotificationDropdown.tsx:30` `onMouseLeave={onClose}` same gap as #2. Bell toggle `setShowNotifications(!showNotifications)` `TopBar.tsx:104` no outside/Escape; flicker on rapid mouse enter/leave (`NotificationDropdown.tsx:28-30`). | `TopBar.tsx:100-115` · `NotificationDropdown.tsx:28-30` | open | Terra adds outside + Escape + focus trap. Compare `topbar.md:254-255`. `AppScopeSwitcher` pattern should be reused. |
| 4 | medium | `Mark all as read` dead control. `NotificationDropdown.tsx:34-36` `Button ghost size sm` `Mark all as read` has no `onClick` — dead button. Tabs `All/Unread/Mentions` + `formatRelative` + `divide-y` list work, but bulk action inert. | `NotificationDropdown.tsx:32-37` | open | Terra wires to `notificationsService.markAllRead()` when endpoint exists (`topbar.md:320` edge #13). OIS should wire or hide until API ready. |
| 5 | medium | Triple fetch — inbox/notifications/current. `TopBar.tsx:26` `useResource(inboxService.items(),[])` + `TopBar.tsx:27` `notificationsService.list()` for badges + `NotificationDropdown.tsx:16` `useResource(list(),[])` again + feed page `/notifications` own `useResource` → 3× `GET /api/v1/notifications` per mount. Same duplicate for inbox `TopBar.tsx:26` vs `InboxDrawer`. No shared cache/SWR/dedup; deps `[]` fetch once. | `TopBar.tsx:26-28` · `NotificationDropdown.tsx:16` · `src/services` · `docs/features/notifications.md:215` | open | Terra dedups via `useNotifications()` SWR. OIS `topbar.md:320` edge #11 notes TODO — needs shared provider or `SWR` cache. |
| 6 | low | Badge `9+` overflow — inbox urgent. `urgentInboxCount = inboxItems.filter(i=>priority==='urgent').length` `TopBar.tsx:30` renders `w-4 h-4 bg-ois-danger text-[9px] font-bold rounded-full border-2 border-white` `TopBar.tsx:92-95` without `9+`/`99+` clamp. `10+` overflows circle; `>=100` breaks layout. No `min-w` clamp vs sidebar `min-w-[20px]`. | `TopBar.tsx:30` · `TopBar.tsx:92-95` | open | Terra clamps `99+`. `topbar.md:320` notes no clamp currently — should `>9 ? '9+' : count` or `99+`. |
| 7 | low | Breadcrumb no truncate. `nav flex items-center gap-1 text-xs font-medium` `TopBar.tsx:43` without `min-w-0 truncate/overflow-hidden/max-w`. Long chain (`/monitoring/events/:id/audit` → `Monitoring / Event Stream / Event Detail / Audit` via `breadcrumbs.ts:5-136` `LABELS 54` + `ID_LABELS 9` + `looksLikeId` UUID/INC) or raw `LABELS[seg]??seg` unknown segment overflows/wraps at `<768px` (search hidden `hidden md:block`, breadcrumb still flex). No `title` tooltip. | `TopBar.tsx:43-57` · `breadcrumbs.ts:105-136` · `breadcrumbs.ts:129` `LABELS[seg]??seg` | open | Terra truncates last crumb `min-w-0 truncate`. OIS `topbar.md:320` edge #5 `Consider min-w-0 truncate`. |
| 8 | low | Health pill static — `ALL SYSTEMS OPERATIONAL`. `hidden xl:flex` pill `border border-ois-border bg-ois-surface-muted rounded-full` with ping dot `bg-ois-success #12B76A` `TopBar.tsx:62-73` is static — no `statusService` fetch/poll. Misleading when degraded. Hidden on `<1280px` so not redundant with mobile but unverified. | `TopBar.tsx:62-73` · `src/index.css:8,25` `ois-success #12B76A` | open | OIS placeholder for future `statusService`; terra live status. `topbar.md:122-126` notes static. Should wire or add `title` "Static — not live". |
| 9 | info | Ping `animate-ping` no `prefers-reduced-motion` guard. `span absolute inline-flex h-full w-full animate-ping rounded-full bg-ois-success opacity-60` `TopBar.tsx:67` + `ois-topbar-stripe` anim `0.4s` `src/index.css:116-123` are inside `@media (prefers-reduced-motion: no-preference)` only for some keyframes but `animate-ping` is Tailwind utility not guarded; vestibular risk. `ois-shimmer` guarded `src/index.css:93`. | `TopBar.tsx:66-68` · `src/index.css:93-123` | open | Terra respects `prefers-reduced-motion` for ping/stripe. Should wrap `animate-ping` in media query or `motion` `reducedMotion` check. |
| 10 | info | `AppScopeSwitcher` missing a11y. Trigger `button inline-flex h-9 gap-2` `AppScopeSwitcher.tsx:92-105` has no `aria-label`/`aria-expanded`/`aria-haspopup`/`aria-controls`. Dropdown `absolute left-0 top-full mt-1 w-72 z-50` `AppScopeSwitcher.tsx:108` has no `role listbox`/`aria-activedescendant`. `Layers` icon decorative no `aria-hidden`. Compare AI button has `aria-label`+`aria-expanded` `TopBar.tsx:123-124`. | `AppScopeSwitcher.tsx:92-105` · `AppScopeSwitcher.tsx:108` · `TopBar.tsx:123-124` parity | open | Terra scope switcher has `aria-expanded` etc. OIS gap — add parity with Notifications/AI. |
| 11 | info | Sparkles AI visible condition — `showAi && onToggleAi`. `TopBar.tsx:117` `showAi && onToggleAi && (...)` renders AI `Sparkles 20` ghost only when `AppShell.tsx:70` `showAi={!isAiRoute}`. On `/ai` route workspace already has AI, so hidden intentional; but prop is double-guard (both optional) — if parent passes `showAi=true` without `onToggleAi`, button silently missing. No fallback tooltip when hidden. Documented `topbar.md:355` preservation vs terra no AI chip. | `TopBar.tsx:117-133` · `AppShell.tsx:20,68-71` `isAiRoute=pathname.startsWith('/ai')` | open | Terra no AI chip. OIS conditional intentional — verify double guard not masking `onToggleAi` missing; consider single `showAi` derived from `isAiRoute` only. |
| 12 | low | a11y gaps — search + inbox/bell + avatar. Search `input` `TopBar.tsx:79-83` has only `placeholder` no `aria-label`/`label`; inbox `Inbox 20` `Button ghost` `TopBar.tsx:90` no `aria-label`/`aria-expanded`; bell `Bell 20` `TopBar.tsx:107` same missing (AI `Sparkles` has `aria-label="AI Quick Assist"` `aria-expanded={aiOpen}` `TopBar.tsx:123-124` — inconsistency); avatar `button flex items-center gap-2 focus:outline-none` `TopBar.tsx:136` no `aria-label`/`aria-expanded`/`aria-haspopup` (UserMenu trigger). | `TopBar.tsx:79-83` · `TopBar.tsx:89-111` · `TopBar.tsx:136-138` · `UserMenu.tsx:27` | open | Terra has `aria-label` parity on all icon buttons. Should add `aria-label="Inbox"` etc. + `aria-expanded` bound to `showNotifications/showUserMenu`. |
| 13 | low | Mobile hidden health — `hidden xl:flex`. Health pill `hidden xl:flex` `TopBar.tsx:62` disappears below `1280px`; at `md` search hidden `hidden md:block` `TopBar.tsx:75`, breadcrumb still visible but health missing — no alternative status signal. At `<768px` topbar shows only `Menu + Home/crumb + Inbox/Bell/AI/Avatar`; health never visible on mobile. Intentional to save space but unverified. | `TopBar.tsx:62-73` · `TopBar.tsx:75` | open | Terra same `hidden xl:flex` for health. OIS intentional — `topbar.md:300` responsive notes. Verify with design; maybe `title` fallback or status dot in `AppScopeSwitcher` on mobile. |
| 14 | low | Stale counts — no poll/socket merge. `useResource(()=>inboxService.items(),[])` + `notificationsService.list()` `TopBar.tsx:26-27` deps `[]` fetch once on mount, never refetch on focus/poll/socket. `server/realtime.ts:52,71` emits `tenant:tenantId:inbox` + `inbox:item` but client `src/services/realtime.ts:19` not wired to merge into `urgentInboxCount`/`unreadNotifCount` `TopBar.tsx:30-31`. Badge stale until remount/refresh. | `TopBar.tsx:26-31` · `server/realtime.ts:52,71` · `src/services/realtime.ts:19` | open | Terra realtime merges `inbox:item` → counts via `useNotifications()` SWR. OIS `topbar.md:250-252` notes Socket.IO room only — needs `realtime` subscription + `refetch`/`setData` merge. |
| 15 | info | Avatar `sm` fallback — blank initials. `Avatar name={currentUser?.name ?? ''}` `TopBar.tsx:137` → `Avatar.tsx:19-25` `getInitials('')→''` renders blank `bg-ois-primary-pale` circle `h-8 w-8 border border-ois-border` `Avatar.tsx:28-35`. `UserMenu.tsx:31-41` `name??''` `email??''` `roleLabel` empty state shows empty header. `usersService.current()` loading `undefined` shows blank not skeleton/shimmer. `src/index.css:127-141` `ois-shimmer-text` not used. | `TopBar.tsx:28` · `TopBar.tsx:136-138` · `Avatar.tsx:19-35` · `UserMenu.tsx:30-42` | open | Terra skeleton. OIS `topbar.md:320` edge #7 notes loading blank — should show `ois-shimmer` or initials fallback `?` . |
| 16 | info | `kbd ⌘K` hint only via TopBar, not global indicator. `kbd px-1.5 py-0.5 rounded border bg-white text-[10px] font-mono` `⌘K` chip `TopBar.tsx:85` is inside hidden search `hidden md:block` — invisible on mobile `<768px`. Global handler is `AppShell.tsx:41-51` `window.addEventListener keydown metaK` which works mobile-external-keyboard but hint never seen. `CmdKPalette.tsx:103-157` `role dialog aria-modal true` `max-w-[560px] pt-[12vh]` handles `Escape/Arrow/Enter` `CmdKPalette.tsx:82-100` but closed state returns `null` — no persistent hint outside TopBar. | `TopBar.tsx:75-87` · `AppShell.tsx:41-51` · `CmdKPalette.tsx:80-157` | open | Terra `⌘K` hint always visible (no visible search). OIS hint hidden on mobile — consider global footer hint or `aria-keyshortcuts` on `body`. |

No critical/high issues. All findings are medium/low/info — shell functional, consistent with `audit/audit-global-shell.md:27`.

---

## Verification — per issue (evidence)

### #1 — Search decorative no handler (medium)

- **Source:** `TopBar.tsx:75-87` wrapper `relative mr-4 hidden md:block w-72 lg:w-96` + `SearchIcon size 16 absolute left-3` + `input type text placeholder "Search across OIS..." class w-full h-9 pl-10 pr-12 bg-ois-surface-muted rounded-ois-btn border border-ois-border text-ois-text placeholder:text-ois-text-subtle focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/15` no `value/onChange/onSubmit`.
- **Verified:** Grep `Search across` only `TopBar.tsx:81`; no `onChange` on that `input`; `CmdKPalette.tsx:52-157` owns `query` state `useState('')` + `useMemo ROUTES filter hay includes(q)` but `TopBar` not wired — typing is inert. `kbd ⌘K` `TopBar.tsx:85` `px-1.5 py-0.5 rounded border bg-white text-[10px] font-mono` is div not button. `AppShell.tsx:41-51` `keydown metaK` toggles `cmdKOpen` global. Intentional duo `topbar.md:355`.
- **Status:** **open** — wire to `CmdKPalette query` or `aria-disabled` + tooltip `Press ⌘K`.

### #2 — UserMenu only `onMouseLeave` (medium)

- **Source:** `TopBar.tsx:23` `useState(false) showUserMenu` + `TopBar.tsx:135-140` `button onClick ()=>setShowUserMenu(!v)` `Avatar sm` + `{showUserMenu && <UserMenu onClose={()=>setShowUserMenu(false)}/>}` + `UserMenu.tsx:26-28` `div absolute right-0 mt-2 w-64 bg-white border-ois-border rounded-ois-card shadow-ois-dropdown z-50 onMouseLeave={onClose}`.
- **Verified:** `UserMenu.tsx:28` only `onMouseLeave`; no `mousedown` outside, no `keydown Escape`, no `focus-trap`. Click outside without mouse leave leaves `showUserMenu=true`. `AppScopeSwitcher.tsx:53-60` correctly does `document.addEventListener mousedown handler contains(e.target)` — pattern not reused. `SidebarContextMenu.tsx:24` pattern `mousedown|Escape|scroll capture` missing here.
- **Status:** **open**.

### #3 — NotificationDropdown only `onMouseLeave` (medium)

- **Source:** `TopBar.tsx:100-115` `Button ghost size icon onClick ()=>setShowNotifications(!v)` `Bell size 20` + `unreadNotifCount dot w-2.5 h-2.5 bg-ois-primary border-2 border-white` + `{showNotifications && <NotificationDropdown onClose={()=>setShowNotifications(false)}/>}` + `NotificationDropdown.tsx:28-30` `div absolute right-0 mt-2 w-80 sm:w-[380px] max-h-[500px] z-50 flex flex-col onMouseLeave={onClose}`.
- **Verified:** Same `onMouseLeave` only. `mousedown` outside while mouse still inside does not close; rapid enter/leave flicker. No `Escape` listener. `NotificationDropdown.tsx:29` `class absolute right-0`. Terra would need outside handler.
- **Status:** **open**.

### #4 — Mark all as read dead (medium)

- **Source:** `NotificationDropdown.tsx:32-37` header `p-4 border-b bg-ois-surface flex justify-between` + `h3 Notifications` + `Button variant ghost size sm class text-ois-primary text-xs h-auto py-1` `Mark all as read` with **no `onClick` prop**.
- **Verified:** Grep `Mark all as read` single occurrence `NotificationDropdown.tsx:35`; no handler passed; not disabled visually but click does nothing. List below `NotificationDropdown.tsx:39-99` `Tab All/Unread/Mentions` `filter unreadCount` `divide-y` `formatRelative` works, bulk action dead. Terra would call `notificationsService.markAllRead()` if endpoint exists.
- **Status:** **open**.

### #5 — Triple fetch inbox/notifications/current (medium)

- **Source:** `TopBar.tsx:26` `useResource(()=>inboxService.items(),[])` + `TopBar.tsx:27` `useResource(()=>notificationsService.list(),[])` + `TopBar.tsx:28` `usersService.current()` + `NotificationDropdown.tsx:16` `useResource(()=>notificationsService.list(),[])` + feed page `/notifications` separate `useResource`.
- **Verified:** Each `useResource` independently fetches `GET /api/v1/...` with deps `[]` — no dedup. Mount TopBar + open dropdown → 3× `GET /api/v1/notifications`. `InboxDrawer` duplicates inbox. No `SWR`/`React-Query` cache; `src/services` is fetch wrapper only. `docs/features/notifications.md:215` notes duplicate fetch.
- **Status:** **open** — introduce shared `NotificationsProvider` or `SWR` key.

### #6 — Badge `9+` overflow (low)

- **Source:** `TopBar.tsx:30` `urgentInboxCount = (inboxItems??[]).filter(i=>priority==='urgent').length` + `TopBar.tsx:92-95` `absolute top-1 right-1 w-4 h-4 bg-ois-danger text-white text-[9px] font-bold flex rounded-full border-2 border-white` `{urgentInboxCount}` direct.
- **Verified:** `w-4 h-4` fixed size; `10` still fits but `12` with `border-2` overflows circle; `100` breaks. No `clamp` like `count>9?'9+':count` or `99+`. Sidebar uses `min-w-[20px] h-5` pill not dot. `topbar.md:320` acknowledges no clamp.
- **Status:** **open**.

### #7 — Breadcrumb no truncate (low)

- **Source:** `TopBar.tsx:43` `nav flex items-center gap-1 text-xs font-medium` + `TopBar.tsx:44` `Link to="/" Home` + `breadcrumbs.map` `crumb.href ? Link : span text-ois-text` + `breadcrumbs.ts:105-136` `useBreadcrumbs()` `pathname.split filter` + `LABELS 54` `IMPLICIT_PARENTS 3` `ID_LABELS 9` `looksLikeId` UUID/numeric/INC/long-non-slug + `LABELS[seg]??seg` raw fallback `breadcrumbs.ts:129`.
- **Verified:** `nav` has no `min-w-0 truncate/overflow-hidden/whitespace-nowrap`; at `hidden md:block` search hidden but breadcrumb still `flex` → long chain wraps/overflows. Unknown segment renders raw `seg` (could be UUID). No `title` attribute. Terra truncates `min-w-0 truncate` last crumb.
- **Status:** **open** — add `min-w-0 truncate` + `title` tooltip.

### #8 — Health static `ALL SYSTEMS OPERATIONAL` (low)

- **Source:** `TopBar.tsx:62-73` `div hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full border border-ois-border bg-ois-surface-muted mr-1 title Platform health` + `span relative h-1.5 w-1.5 animate-ping bg-ois-success opacity-60` + `span h-1.5 w-1.5 rounded-full bg-ois-success` `ois-success #12B76A` `src/index.css:25` + `span font-mono text-[10px] tracking-[0.16em] text-ois-text-muted` `ALL SYSTEMS OPERATIONAL`.
- **Verified:** No fetch — no `statusService`/`useResource`; string hardcoded. `hidden xl:flex` → hidden below `1280px`. Misleading if degraded. `topbar.md:122-126` notes static placeholder. Stripe `AppShell.tsx:73-77` `linear-gradient 90deg #1F4FD4→#0BA5EC` separate visual.
- **Status:** **open** — wire to status API or add `aria-label` static indicator.

### #9 — Ping no `prefers-reduced-motion` (info)

- **Source:** `TopBar.tsx:67` `animate-ping` + `src/index.css:93` `@media (prefers-reduced-motion: no-preference) { @keyframes ois-topbar-stripe ... }` + `src/index.css:116-123` `ois-topbar-stripe anim 0.4s cubic-bezier(0.2,0,0,1)` inside that media query but Tailwind `animate-ping` utility (`@keyframes ping 1s cubic-bezier(0,0,0.2,1) infinite`) is outside — not guarded.
- **Verified:** DevTools `prefers-reduced-motion: reduce` still sees ping animating; `ois-topbar-stripe` correctly paused but dot keeps pulsing. `src/index.css:93` covers `ois-fade-up/drift/shimmer/stripe` but not `animate-ping`. Low vestibular but still gap.
- **Status:** **open** — wrap ping in `motion-safe:` or media query.

### #10 — AppScopeSwitcher missing aria (info)

- **Source:** `AppScopeSwitcher.tsx:46-203` enabled `useScopeUiEnabled()` + `wrapperRef` + `useEffect mousedown outside` `AppScopeSwitcher.tsx:53-60` + trigger `button inline-flex h-9 px-3 rounded-md border text-xs font-medium Layers + Scope: {label} + ChevronDown rotate-180` `AppScopeSwitcher.tsx:92-105` + dropdown `absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border z-50` `AppScopeSwitcher.tsx:108` + `AppRow` `Pin/PinOff`.
- **Verified:** Trigger lacks `aria-expanded={open}` `aria-haspopup="listbox"` `aria-label="Application scope"`; dropdown lacks `role="dialog"`/`listbox`; no `aria-controls`. `TopBar.tsx:123-124` AI button correctly has `aria-label`+`aria-expanded` — inconsistency. `AppScopeSwitcher` has good outside-click but missing semantics.
- **Status:** **open**.

### #11 — Sparkles AI visible condition (info)

- **Source:** `TopBar.tsx:117` `{showAi && onToggleAi && (<div relative group><Button ghost size icon onClick={onToggleAi} aria-label AI Quick Assist aria-expanded={aiOpen} class text-ois-text-muted Sparkles size 20 /><div tooltip AI Quick Assist></div></div>)}` + `AppShell.tsx:20` `isAiRoute=pathname.startsWith('/ai')` + `AppShell.tsx:68-71` `TopBar showAi={!isAiRoute} onToggleAi={()=>setAiPanelOpen(v=>!v)} aiOpen={aiPanelOpen}`.
- **Verified:** On `/ai`, `showAi=false` hides button intentional (workspace has `aiSidebarContent`). Double guard `showAi && onToggleAi` means if parent omits `onToggleAi`, button silently absent — no dev warning. Tooltip `group-hover:opacity-100` `TopBar.tsx:129-131` accessible only on hover. Terra has no AI chip — OIS extension.
- **Status:** **open** (info — intentional but document double-guard; consider asserting `onToggleAi` required when `showAi`).

### #12 — a11y gaps — search + inbox/bell + avatar (low)

- **Source:** Search `input placeholder "Search across OIS..."` `TopBar.tsx:81` no `aria-label` only placeholder; inbox `Button ghost onClick onOpenInbox Inbox size 20` `TopBar.tsx:90-91` no `aria-label`; bell `Button ghost onClick setShowNotifications Bell size 20` `TopBar.tsx:101-107` `cn(... showNotifications && bg-ois-surface-muted)` no `aria-label`/`aria-expanded`; AI correct `TopBar.tsx:123-124` `aria-label`+`aria-expanded`; avatar `button flex gap-2 focus:outline-none onClick setShowUserMenu Avatar sm` `TopBar.tsx:136` no `aria-label`/`aria-expanded`/`aria-haspopup`.
- **Verified:** Axe audit would flag `input` missing label, icon buttons missing name. `SearchIcon` wrapper `pointer-events-none` `TopBar.tsx:76-78` decorative. Avatar `Avatar.tsx:28-35` `h-8 w-8 rounded-full bg-ois-primary-pale border` no `alt`. Inconsistency between AI (labeled) and others unlabeled.
- **Status:** **open**.

### #13 — Mobile hidden health (low)

- **Source:** `TopBar.tsx:62` `hidden xl:flex` health pill + `TopBar.tsx:75` `hidden md:block w-72 lg:w-96` search both responsive hidden. Breadcrumb `TopBar.tsx:43` always visible `flex`.
- **Verified:** Viewport `1024px` health hidden; `768px` search hidden too — topbar left is `Menu + Home/crumbs`, right is `scope + Inbox/Bell/AI/Avatar`. Health never visible on tablet/mobile; no dot replacement. `topbar.md:300` responsive section notes `hidden xl:flex`. Intentional to save space but design should confirm.
- **Status:** **open** (low — intentional, verify with design).

### #14 — Stale counts no poll/socket merge (low)

- **Source:** `TopBar.tsx:26` `useResource(()=>inboxService.items(),[])` + `TopBar.tsx:27` `notificationsService.list()` deps `[]` + `TopBar.tsx:30-31` derived `urgentInboxCount`/`unreadNotifCount` + `server/realtime.ts:52,71` `io.to(tenant:tenantId:inbox).emit(inbox:item)` + `src/services/realtime.ts:19` socket client + no `useEffect` subscribe in TopBar.
- **Verified:** No `focus`/`visibilitychange` refetch, no `setInterval` poll, no `socket.on('inbox:item')` merge. Badge counts static after mount until refresh. `InboxDrawer` may update via its own fetch but TopBar badge not notified. Terra would `socket.on` → update store. `topbar.md:250-252` notes Socket.IO room only, no merge.
- **Status:** **open** — add `useEffect socket.on` + `setData` or `SWR mutate`.

### #15 — Avatar `sm` fallback blank (info)

- **Source:** `TopBar.tsx:28` `useResource(()=>usersService.current(),[])` + `TopBar.tsx:137` `Avatar name={currentUser?.name ?? ''} size sm` + `Avatar.tsx:12-35` `sizes sm h-8 w-8 text-xs` + `getInitials` `split map part[0] join toUpperCase slice 0,2` + `src/index.css:50-53` `shadow-ois-card` + `UserMenu.tsx:30-41` header `currentUser?.name??''` `email??''` `roleLabel` + `team`.
- **Verified:** While `currentUser` loading `undefined`, `name=''→getInitials('')→''` renders empty pale circle `bg-ois-primary-pale text-ois-primary border`. No skeleton `ois-shimmer-text` `src/index.css:127-141`. `UserMenu` header empty `name`/`email` looks broken. Should show skeleton or `?` fallback. `usersService.current()` error not handled visually.
- **Status:** **open**.

### #16 — `kbd ⌘K` hint only via TopBar not global (info)

- **Source:** `TopBar.tsx:84-86` `absolute right-3 flex gap-1 kbd px-1.5 py-0.5 rounded border bg-white text-[10px] font-mono` `⌘K` inside `TopBar.tsx:75` `hidden md:block` search wrapper → hidden on `<768px`. Global shortcut `AppShell.tsx:41-51` `window.addEventListener keydown metaK/ctrlK toggle cmdKOpen` works regardless but hint invisible. `CmdKPalette.tsx:103-157` `fixed inset-0 z-50 flex pt-[12vh] px-4 role dialog aria-modal true` + `input placeholder Search routes, jump to… aria-label Search routes` + `handleKeyDown Escape/Arrow/Enter` `CmdKPalette.tsx:82-100` correctly traps but hint not global.
- **Verified:** Mobile viewport has no `⌘K` indicator; external keyboard user on tablet doesn't discover shortcut. Terra keeps `⌘K` always visible (no visible search). OIS `hidden md:block` hides hint on mobile — should expose via `aria-keyshortcuts` or persistent footer/mobile hint.
- **Status:** **open**.

---

## Terra Reference — detailed delta

| Aspect | Terra | OIS `TopBar.tsx` |
|--------|-------|------------------|
| Height + position | `h-9` `sticky top-0` `bg-theme-bg/85 backdrop-blur-sm` tier-1 + tier-2 `IconChip` + kicker | `h-14` `shrink-0` `bg-white bg-ois-surface #FFFFFF` `border-b border-ois-border #E4E7EC` flat, no blur/sticky — pinned via `AppShell` flex `h-screen overflow-hidden` + `main flex-1 overflow-y-auto p-6` (`TopBar.tsx:34-36` · `AppShell.tsx:64-79`) |
| Sidebar toggle | Persist `localStorage` `180px` collapsed, terra `TopBar` controls width | Local `useState(false)` `setSidebarCollapsed(!collapsed)` `AppShell.tsx:12,66` (`TopBar.tsx:40-42` `onToggleSidebar`) — not persist (`audit-global-shell.md:22` low) |
| Search | `Cmd-K` only, no visible field, palette `localStorage` recent | Visible `w-72 lg:w-96` `hidden md:block` `bg-ois-surface-muted rounded-ois-btn focus:ring-ois-primary/15` + `⌘K` chip `TopBar.tsx:75-87` + palette `AppShell.tsx:41-51` `CmdKPalette.tsx:52-157` duo — decoration vs verb bar (gap #1, #16) |
| Breadcrumb | Hardcode per page or `useBreadcrumbs` with terra labels, truncated | `useBreadcrumbs()` `breadcrumbs.ts:105-136` `LABELS 54 + IMPLICIT_PARENTS 3 + ID_LABELS 9 + looksLikeId (UUID/numeric/INC-* / long non-slug)` — `Home` + crumbs `href undefined` last (`TopBar.tsx:43-57`) — no truncate gap #7 |
| Notifications/UserMenu | `onMouseLeave` + `mousedown` outside + `Escape` + focus trap | Only `onMouseLeave` (`NotificationDropdown.tsx:30` · `UserMenu.tsx:28`) — gaps #2 #3; `Mark all as read` dead #4 |
| Counts | `SWR` dedup + realtime socket merge `inbox:item` | `useResource` triple fetch `TopBar.tsx:26-28` + `NotificationDropdown.tsx:16` (#5) + stale no socket merge (#14) |
| Badges | Clamp `99+` | No clamp `w-4 h-4 bg-ois-danger` (#6) |
| Health | Live `statusService` | Static `ALL SYSTEMS OPERATIONAL` `hidden xl:flex` `animate-ping #12B76A` (#8 #13) + ping no reduced-motion (#9) |
| AppScopeSwitcher | `terra` switcher with `aria-expanded` + outside handler | `AppScopeSwitcher.tsx:46-203` outside `mousedown` correct but missing `aria-expanded/haspopup` (#10) |
| AI | none | `Sparkles 20` `showAi && onToggleAi` `aria-label` `aria-expanded` `TopBar.tsx:117-133` + tooltip `group-hover` (#11) |
| a11y | `aria-label` parity all buttons | Search no label + inbox/bell/avatar missing vs AI labeled (#12) |
| Avatar | `skeleton` while loading | `Avatar sm h-8 w-8` blank `getInitials('')` while `usersService.current()` loading (#15) |
| Design tokens | `terra-*` / `linear-card` dark `data-theme` | `ois-*` light only `#1F4FD4` primary / `#F1F3F7` muted / `#12B76A` success / `#F04438` danger / `rounded-ois-btn 6px` / `shadow-ois-dropdown` (`src/index.css:1-59`) — no raw hex; stripe `linear-gradient 90deg #1F4FD4→#0BA5EC` (#8) |
| Stripe | none | `ois-topbar-stripe h-[2px] w-full linear-gradient 90deg #1F4FD4→#0BA5EC anim 0.4s cubic-bezier(0.2,0,0,1) scaleX` `AppShell.tsx:73-77` `src/index.css:116-123` family continuity |
| CmdK hint | Always visible `⌘K` | `kbd ⌘K` inside hidden search `hidden md:block` (#16) + global `AppShell.tsx:41-51` `keydown metaK` |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init `known-issues-topbar.md` — truncated 67 lines → full 16-findings spec (5 medium, 6 low, 5 info) from `TopBar.tsx:1-144` + `AppShell.tsx:1-102` + `breadcrumbs.ts:1-136` + `NotificationDropdown.tsx:1-125` + `UserMenu.tsx:1-69` + `AppScopeSwitcher.tsx:46-203` + `CmdKPalette.tsx:18-157` + `src/index.css:1-60,116-123` vs terra `h-9 sticky backdrop-blur` + `audit/audit-global-shell.md` baseline | `src/components/layout/TopBar.tsx:34-144` · `src/index.css:1-59,116-123` · `docs/ui/topbar.md` · `docs/ui/audit/audit-global-shell.md` |
| 2026-08-28 | Patch to full spec ~220 lines — Status Draft + Summary Total 16 (5/6/5) + Scope 8 rows + Issues 16 rows (search decorative, UserMenu onMouseLeave, NotificationDropdown onMouseLeave, Mark all dead, triple fetch, badge 9+, breadcrumb truncate, health static, ping reduced-motion, AppScopeSwitcher aria, Sparkles condition, a11y gaps, mobile hidden health, stale counts socket, Avatar sm fallback, kbd CmdK global) + Verification per issue with file:line + Terra detailed delta + Changelog | `TopBar.tsx:34-144` · `breadcrumbs.ts:5-136` · `AppShell.tsx:73-77` · `NotificationDropdown.tsx:13-125` · `UserMenu.tsx:16-69` · `AppScopeSwitcher.tsx:46-203` · `CmdKPalette.tsx:52-157` · `src/index.css` `ois-*` |

(End of file)
