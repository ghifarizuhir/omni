# Audit — Global Shell (baseline)

Status: **Draft — baseline audit untuk `docs/ui/`**

Scope: **AppShell + Sidebar + TopBar + InboxDrawer baseline**

Source of truth: [`src/components/layout/AppShell.tsx`](../../../src/components/layout/AppShell.tsx) · [`src/components/layout/Sidebar.tsx`](../../../src/components/layout/Sidebar.tsx) · [`src/components/layout/TopBar.tsx`](../../../src/components/layout/TopBar.tsx) · [`src/components/layout/InboxDrawer.tsx`](../../../src/components/layout/InboxDrawer.tsx) · [`src/lib/breadcrumbs.ts`](../../../src/lib/breadcrumbs.ts) · [`src/lib/sidebar-pins.ts`](../../../src/lib/sidebar-pins.ts) · [`src/index.css`](../../../src/index.css)

Terra ref: `terra-service-management/docs/ui/audit/audit-global-shell.md` — AppShell `h-screen flex` + sidebar `localStorage 180px` persist + TopBar `h-9 sticky backdrop-blur` + `Cmd-K` only — OIS deltas noted per finding (`ois-*` light `#F4F5F7/#F7F8FA` dimmed chrome, `w-[240px]/w-16`, visible search + palette duo, `ois-topbar-stripe`).

> Audit ini adalah snapshot kondisi AppShell/Sidebar/TopBar/InboxDrawer saat `docs/ui/` di-init. Update file ini atau buat `known-issues-*.md` per komponen saat iterasi. Detail per-komponen lihat [`known-issues-sidebar.md`](./known-issues-sidebar.md) (7 issues — 4 fixed, 3 verified) dan [`known-issues-topbar.md`](./known-issues-topbar.md) (16 issues — 5 medium, 6 low, 5 info).

---

## Scope

| Component | File | Status |
|-----------|------|--------|
| AppShell | `src/components/layout/AppShell.tsx:11-102` | audited |
| Sidebar | `src/components/layout/Sidebar.tsx:31-399` · `src/lib/sidebar-pins.ts:1-63` | audited |
| TopBar | `src/components/layout/TopBar.tsx:34-144` · `src/lib/breadcrumbs.ts:5-136` | audited |
| InboxDrawer | `src/components/layout/InboxDrawer.tsx:15-121` | audited (lite) |
| Tokens + motion | `src/index.css:1-160` | audited |

---

## Methodology

- Read `AppShell.tsx` `Sidebar.tsx` `TopBar.tsx` `InboxDrawer.tsx` `breadcrumbs.ts` `sidebar-pins.ts` `index.css` + `known-issues-*.md` style + `app-shell.md/sidebar.md/topbar.md`.
- Checked `localStorage` usage (`rg localStorage`), `rg -m-6`, `rg animate-ping`, `rg onMouseLeave`, `rg aria-label` parity, hex equality `p2==p3`.
- Terra baseline: `terra-service-management/docs/ui/audit/audit-global-shell.md` + `known-issues-sidebar.md` 7 (4 fixed 3 verified) vs OIS lite `p-6/-m-6` contract.
- Severity: `info` = token/a11y cosmetic, `low` = UX papercut, `medium` = behavioral gap; `verified` = intentional preserve, `open` = needs fix.

---

## Summary

| Total issues | Fixed | Verified | Open |
|--------------|-------|----------|------|
| **10** | **0** | **5** | **5** |

> Baseline: shell functional, no critical/high. `Fixed` kosong di global baseline — perbaikan tercatat di `known-issues-sidebar.md` (4 fixed) dan `known-issues-topbar.md` belum fixed. `Verified` = intentional/delta vs terra yang di-preserve.

---

## Findings — by component

| Component | Count | IDs |
|-----------|-------|-----|
| AppShell | 3 | G-1, G-2, G-10 |
| Sidebar | 2 | G-1 (shared), G-5 |
| TopBar | 4 | G-3, G-6, G-7, G-8 |
| InboxDrawer | 1 | G-9 |
| Tokens/Motion | 2 | G-4, G-8 (shared) |

> `G-1` collapse spans AppShell owner + Sidebar consumer + TopBar trigger — counted once in total but listed under AppShell primary.

---

## Findings (baseline 2026-08-28)

| ID | Component | Issue | Severity | Status | File:line | Terra delta |
|----|-----------|-------|----------|--------|-----------|-------------|
| G-1 | AppShell + Sidebar + TopBar — collapse persist | `sidebarCollapsed` `useState(false)` local di `AppShell.tsx:12`, toggle via `TopBar onToggleSidebar={() => setSidebarCollapsed(!c)}` (`AppShell.tsx:66` · `TopBar.tsx:40-42`) → `Sidebar.tsx:113-116` `cn(collapsed ? "w-16" : "w-[240px]") transition-all duration-300`. No `localStorage` — refresh reset ke expanded. Pins persist `ois.sidebar.pins.v1` (`sidebar-pins.ts:3`) tapi collapse tidak. | low | **verified** | `AppShell.tsx:12` · `Sidebar.tsx:113-116` · `TopBar.tsx:40-42` · `sidebar-pins.ts:3` | Terra persist `localStorage 180px` (`terra.sidebar.collapsed`). OIS intentionally transient — dimmed chrome `#F4F5F7` prioritizes content pop, collapse = maximize-canvas bukan preferred-state. Doc `sidebar.md:292-293` + `topbar.md:79`. |
| G-2 | AppShell — `p-6` vs `-m-6` layout contract | `<main>` hardcoded `p-6` (`AppShell.tsx:79` `AppShell.tsx:79` `flex-1 overflow-y-auto p-6` vs `isAiRoute ? flex-1 overflow-hidden flex min-h-0`). Module Layout & 3-col detail pages (`MonitoringLayout`, `IncidentDetail`, `CapacityLayout` dll.) pakai `-m-6 flex flex-col bg-ois-bg calc(100vh - 3.5rem)` bleed trick untuk edge-to-edge (`docs/DESIGN-SYSTEM.md:840` negates `p-6`). Risk double-padding jika page lupa `-m-6` atau `p-6` diubah tanpa sync `calc(100vh - 3.5rem)` (TopBar `h-14 = 3.5rem` contract). | low | **verified** | `AppShell.tsx:79` · `AppShell.tsx:64-79` · `src/routes/monitoring/MonitoringLayout.tsx:26` · `src/index.css` `h-14` contract | Terra same `-m-6 + calc(100vh-3.5rem)` module pattern; OIS preserved. Documented `app-shell.md:21` + `monitoring.md:24-29`. Intentional contract — no fix, verify `flex-1 min-h-0 overflow` pairing. |
| G-3 | TopBar — breadcrumb lookup `LABELS 54` | `useBreadcrumbs()` `breadcrumbs.ts:5-69` `LABELS` 54 entries + `IMPLICIT_PARENTS` 3 (`events→Monitoring`, `kedb→Problems`, `on-call→Platform` `:72-76`) + `ID_LABELS` 9 (`:79-93`) + `looksLikeId` UUID/numeric/`INC-*`/long non-slug (`:95-103`). `TopBar.tsx:43-57` renders `Home / <crumbs>`. Unknown segment fallback `LABELS[seg] ?? seg` raw — `/foo/bar` → `foo/bar` terlihat. `href` akumulatif, last `href:undefined` (no link). No `title` tooltip / `truncate`. | low | **open** | `src/lib/breadcrumbs.ts:5-136` · `TopBar.tsx:43-57` | Terra hardcode per-page atau `useBreadcrumbs` terra labels. OIS covers 54 + `Home` selalu `text-ois-text-subtle`. Keep in sync dengan `src/routes/index.tsx` — stale label jika route baru tanpa entry. |
| G-4 | Tokens — `ois-sev-p3` == `p2` `#DC6803` | `--color-ois-sev-p3: #DC6803` equals `--color-ois-sev-p2: #DC6803` (`src/index.css:36-37`). P2 & P3 sama hex `#DC6803` terlihat copy-paste bug; plus sidebar `ois-sidebar-bg #F4F5F7` vs `ois-bg #F7F8FA` vs `ois-surface-muted #F1F3F7` delta 2-3 luma subtle. | info | **verified** | `src/index.css:35-38` · `src/index.css:40-42` | Terra same P2/P3 `#DC6803` — P3 pale treatment difference (`priority bar` solid vs card pale+dark text). OIS intentional: `design-tokens.md:56` “pale bg + dark text (same as P2)”. No fix. |
| G-5 | Sidebar + AppShell — brand gradient hardcode | Brand badge `linear-gradient(135deg,#1F4FD4 0%,#185FA5 60%,#0C447C 100%)` + `boxShadow 0 1px 4px rgba(31,79,212,0.35)` + highlight `rgba(255,255,255,0.12)` (`Sidebar.tsx:125-126,131`) + AI toggle active `linear-gradient(135deg,#1F4FD4→#185FA5)` (`Sidebar.tsx:185-187`) + active stripe glow `0 0 12px rgba(31,79,212,0.35)` (`Sidebar.tsx:363`) + AppShell stripe `linear-gradient(90deg,#1F4FD4→#0BA5EC)` (`AppShell.tsx:76`). Hardcode hex, not `var(--color-ois-primary)` — token divergence risk. | info | **verified** | `Sidebar.tsx:125-126` · `Sidebar.tsx:185-187` · `Sidebar.tsx:363` · `AppShell.tsx:73-77` · `src/index.css:8` | Terra identical brand gradients (linear-card). OIS brand treatment exception — documented `sidebar.md:424` “intentionally 7px not token” + `sidebar.md:418-423` preserve dim `#F4F5F7`. No fix. |
| G-6 | TopBar — search decorative | Visible input `hidden md:block w-72 lg:w-96` `TopBar.tsx:75-87` placeholder `Search across OIS...` — no `value`/`onChange`/`onSubmit`, `pointer-events-none` icon `Search 16`, `kbd ⌘K` chip `TopBar.tsx:85` hanya hint bukan button. Actual search is `CmdKPalette` via `AppShell.tsx:41-51` `metaKey+K` shortcut (`CmdKPalette.tsx:52-157` 24 routes). User typing di field no effect. | low | **open** | `TopBar.tsx:75-87` · `AppShell.tsx:41-51` · `CmdKPalette.tsx:18-44` | Terra no visible field (`Cmd-K` only). OIS visible+palette duo preservation `topbar.md:355`. Intentional placeholder untuk future `field:value` scope-aware (`_backlog.md:15`) — consider wiring to `CmdKPalette query` atau `aria-disabled` + tooltip `Press ⌘K`. |
| G-7 | TopBar — dropdown `onMouseLeave` only | `NotificationDropdown` `onMouseLeave={onClose}` (`NotificationDropdown.tsx:30` `absolute right-0 w-80 sm:w-[380px] max-h-[500px] z-50`) + `UserMenu` `onMouseLeave={onClose}` (`UserMenu.tsx:28` `w-64 z-50`) — no `mousedown` outside / `Escape` / `scroll capture`. Klik di luar tanpa hover keluar tidak close; flicker cepat keluar-masuk. `TopBar.tsx:22-23` booleans `showNotifications/showUserMenu` stay true. Compare `AppScopeSwitcher.tsx:53-60` sudah pakai `mousedown` outside + `SidebarContextMenu.tsx:24` `mousedown|Escape|scroll capture`. | medium | **open** | `NotificationDropdown.tsx:28-30` · `UserMenu.tsx:26-28` · `TopBar.tsx:100-140` | Terra `onMouseLeave` + outside handler. Fix: mirror `AppScopeSwitcher` outside pattern atau reuse `SidebarContextMenu` dismiss logic. |
| G-8 | TopBar — health ping `animate-ping #12B76A` + `prefers-reduced-motion` | Pill `hidden xl:flex` `TopBar.tsx:62-73` static `ALL SYSTEMS OPERATIONAL` `font-mono 10px` + dot `h-1.5 w-1.5 bg-ois-success #12B76A` + `animate-ping opacity-60` pulse (`TopBar.tsx:67`). Static — no API (`statusService`). `animate-ping` (Tailwind) tidak di-guard `prefers-reduced-motion`; `src/index.css:93` `@media (prefers-reduced-motion: no-preference)` hanya guards `.ois-*` keyframes (`ois-fade-up`, `ois-topbar-stripe 0.4s`), bukan `animate-ping`. Vestibular trigger risk. | low | **open** | `TopBar.tsx:62-73` · `src/index.css:25` `--color-ois-success #12B76A` · `src/index.css:93-123` | OIS placeholder future `statusService`; terra live. Mitigate via `motionSafe:animate-ping` atau `@media (prefers-reduced-motion: reduce) { .animate-ping { animation: none } }`. |
| G-9 | InboxDrawer — overlay + motion | `InboxDrawer.tsx:29-43` backdrop `fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]` + drawer `fixed right-0 w-full max-w-[400px] z-[101] spring damping 25 stiffness 200` (`motion/react`). Mount via `AppShell.tsx:85-89` `AnimatePresence {inboxOpen && <InboxDrawer>}`. No focus-trap / `Escape` close (backdrop `onClick` only). Duplicate fetch `TopBar.tsx:26` urgent count vs `InboxDrawer.tsx:17` items — 2× `GET /api/v1/inbox/items`. | low | **open** | `InboxDrawer.tsx:15-43` · `AppShell.tsx:85-89` · `TopBar.tsx:26` | Terra same drawer `motion`; OIS adds `backdrop-blur-sm`. Consider dedup via shared `useInbox()` SWR + `Escape` handler. |
| G-10 | AppShell — `ois-topbar-stripe` + AI/Scope a11y | Stripe `AppShell.tsx:73-77` `h-[2px] w-full shrink-0 linear-gradient 90deg #1F4FD4→#0BA5EC` + `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1) scaleX` (`src/index.css:116-123`). `aria-hidden` correct (decorative). TopBar AI `Sparkles` has `aria-label`+`aria-expanded` (`TopBar.tsx:123-124`) but inbox `Inbox 20` + bell `Bell 20` + search `<input placeholder Search...>` (`TopBar.tsx:81`) + avatar `focus:outline-none` (`TopBar.tsx:136`) lack `aria-label` parity — inconsistent. | info | **open** | `AppShell.tsx:73-77` · `src/index.css:116-123` · `TopBar.tsx:79-96,123-136` | Terra has `aria-label` parity. Stripe OK; a11y gaps track to `known-issues-topbar.md:12`. |

No critical / high issues at baseline. Shell functional.

### Severity legend

| Severity | Meaning |
|----------|---------|
| info | cosmetic/token — not breaking |
| low | papercut — visible but workaround exists |
| medium | behavioral gap — user hits dead control / stale data |

### Status legend

| Status | Meaning |
|--------|---------|
| fixed | patched, cite commit |
| verified | intentional — delta vs terra preserved, documented |
| open | needs fix, tracks to `known-issues-*.md` |

---

## Verification — per issue (evidence)

### G-1 — collapse persist non-persist (verified low)

- **Source:** `AppShell.tsx:12` `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)`; `Sidebar.tsx:113-116` `cn(collapsed ? "w-16" : "w-[240px]")` + `transition-all duration-300` + header `overflow-hidden` (`Sidebar.tsx:119`); `TopBar.tsx:40-42` `Button ghost size icon onClick={onToggleSidebar}` drives `AppShell.tsx:66` `() => setSidebarCollapsed(!c)`.
- **Verified:** Grep `localStorage` — only `sidebar-pins.ts:3` `ois.sidebar.pins.v1` and `sidebar.md:292` collapse doc; `AppShell.tsx` no `getItem/setItem`, no `useEffect` persist. Refresh → `useState(false)` resets expanded. Compared `known-issues-sidebar.md:5` terra `localStorage 180px` — intentional delta. If persist desired: `localStorage ois.sidebar.collapsed` mirroring pins key.
- **Status:** **verified** (intentional, low) — no fix.

### G-2 — `p-6` vs `-m-6` layout contract (verified low)

- **Source:** `AppShell.tsx:79` `AppShell.tsx:79` `className={isAiRoute ? 'flex-1 overflow-hidden flex min-h-0' : 'flex-1 overflow-y-auto p-6'}` (`AppShell.tsx:64-79` flex col + `TopBar shrink-0` + `h-14` container `TopBar.tsx:34`); module pages `MonitoringLayout.tsx:26` + `AvailabilityLayout.tsx:33` + `CapacityLayout.tsx:39` all `-m-6 flex flex-col bg-ois-bg calc(100vh - 3.5rem)`.
- **Verified:** `rg "-m-6"` hits `20+` layouts (`MonitoringLayout`, `PortalLayout`, `Settings.tsx:439`, `ProblemDetail.tsx:528` etc.); `docs/DESIGN-SYSTEM.md:840` states `-m-6 negates p-6`; `monitoring.md:29-35` table documents `calc(100vh - 3.5rem)` = `h-14` contract. Non-bleed pages (default `<main> p-6`) render inside padding; bleed pages first child `-m-6` cancels it — no double-padding if contract kept. Changing `p-6` without `-m-6` breaks.
- **Status:** **verified** (contract intentional) — preserve `p-6 + -m-6 + calc(100vh-3.5rem)` together.

### G-3 — breadcrumb `LABELS 54` lookup (open low)

- **Source:** `breadcrumbs.ts:5-69` `LABELS` map (`cmdb→CMDB`, `events→Event Stream`…`ai→AI Workspace` 54 keys); `breadcrumbs.ts:72-76` `IMPLICIT_PARENTS` 3; `:79-93` `ID_LABELS` 9; `:95-103` `looksLikeId` (`UUID /^[0-9a-f]{8}-[0-9a-f]{4}/i`, `numeric /^\d+$/`, `INC-* /^[A-Z]+-\d+$/`, `long >8 && !/^[a-z-]+$/`); `breadcrumbs.ts:105-136` `useBreadcrumbs()` `pathname.split('/')` + `href` akumulatif `last href:undefined`.
- **Verified:** `TopBar.tsx:43-57` `nav flex items-center gap-1 text-xs font-medium` `Home` + map `crumb.href ? Link : span text-ois-text`; unknown `LABELS[seg] ?? seg` keeps raw (e.g. `/foo` → `foo`). Check `topbar.md:99-105` captures same. Keep `LABELS` in sync with `src/routes/index.tsx` — new route without entry shows kebab raw.
- **Status:** **open** (low) — functional, needs sync discipline.

### G-4 — `ois-sev-p3 == p2 #DC6803` (verified info)

- **Source:** `src/index.css:35-38` `--color-ois-sev-p1 #B42318`, `p2 #DC6803`, `p3 #DC6803`, `p4 #027A48`; `design-tokens.md:52-57` table.
- **Verified:** Hex equality `p2===p3` intentional — P3 pale bg + dark text vs P2 solid fill (`design-tokens.md:56` “(same as P2, see `src/index.css:37`)”); sidebar uses semantic `urgent/warning` not `sev-*` so no drift. `sidebar.md:418` dim `#F4F5F7` vs `ois-bg #F7F8FA` vs `ois-surface-muted #F1F3F7` verified intentional. No change.
- **Status:** **verified** (intentional, info).

### G-5 — brand gradient hardcode (verified info)

- **Source:** `Sidebar.tsx:125-126` badge `linear-gradient(135deg,#1F4FD4 0%,#185FA5 60%,#0C447C 100%)` + `boxShadow 0 1px 4px rgba(31,79,212,0.35)` + `Sidebar.tsx:131` highlight `rgba(255,255,255,0.12)`; `Sidebar.tsx:185-187` AI `linear-gradient(135deg,#1F4FD4→#185FA5)`; `Sidebar.tsx:363` glow `0 0 12px rgba(31,79,212,0.35)`; `AppShell.tsx:73-77` stripe `linear-gradient(90deg,#1F4FD4→#0BA5EC)`; tokens `src/index.css:8-48` define `ois-primary #1F4FD4` etc. but stops `#185FA5 #0C447C #0BA5EC` not tokenized.
- **Verified:** Hardcodes isolated to brand chrome (OIS badge, AI toggle, active stripe glow) — semantic `text-*`/`bg-ois-*` elsewhere preserved (`bg-ois-sidebar-bg` etc.). Brand treatment exception per `sidebar.md:424` “brand treatment, intentionally 7px not token” + glow doc `sidebar.md:423`. `group-has` + spring fallbacks verified in `known-issues-sidebar.md:7`. No token misuse for semantic UI.
- **Status:** **verified** (intentional tolerance, info) — no fix.

### G-6 — search decorative (open low)

- **Source:** `TopBar.tsx:75-87` `relative mr-4 hidden md:block w-72 lg:w-96` + icon `SearchIcon 16 pointer-events-none left-3` + `input type=text placeholder="Search across OIS..." class pl-10 pr-12 bg-ois-surface-muted rounded-ois-btn border-ois-borderfocus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/15` + `kbd ⌘K` `TopBar.tsx:85`; no `value/onChange/onSubmit`.
- **Verified:** Actual search `CmdKPalette.tsx:18-44` static 24 routes + `AppShell.tsx:41-51` `keydown metaKey||ctrlKey + k` toggles `cmdKOpen` (`AppShell.tsx:97` `<CmdKPalette open={cmdKOpen}>`); `kbd` chip is hint not button (`topbar.md:152-158` “currently decorative”). Compare terra no visible field. Presence confirmed via DOM query — typing does not mutate palette query.
- **Status:** **open** (low) — wire to `CmdKPalette query` or `aria-disabled` + `title="Press ⌘K"` until scope-aware search ships.

### G-7 — dropdown `onMouseLeave` only (open medium)

- **Source:** `NotificationDropdown.tsx:28-30` `class absolute right-0 mt-2 w-80 sm:w-[380px] max-h-[500px] shadow-ois-dropdown z-50` `onMouseLeave={onClose}`; `UserMenu.tsx:26-28` same `w-64 z-50` `onMouseLeave`; `TopBar.tsx:100-140` booleans `showNotifications`/`showUserMenu` + `{showX && <Component onClose>}`.
- **Verified:** `AppScopeSwitcher.tsx:53-60` uses `useEffect mousedown outside` + `keydown Escape`; `SidebarContextMenu.tsx:24-38` uses `mousedown|Escape|scroll capture`. TopBar dropdowns lack all three — confirmed via `grep onMouseLeave` hits only `NotificationDropdown:30` + `UserMenu:28`. Click outside without mouse traverse leaves `show*` true; rapid exit-enter flickers. See `known-issues-topbar.md:2-3`.
- **Status:** **open** (medium) — add `mousedown` outside + `Escape` mirroring `AppScopeSwitcher`.

### G-8 — health ping reduced-motion (open low)

- **Source:** `TopBar.tsx:62-73` pill `hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full border-ois-border bg-ois-surface-muted` + `span relative h-1.5 w-1.5` `absolute animate-ping bg-ois-success opacity-60` (`:67`) + `relative bg-ois-success` (`:68`) + `font-mono text-[10px] tracking-[0.16em] ALL SYSTEMS OPERATIONAL`; `src/index.css:25` `--color-ois-success #12B76A`; `src/index.css:93` `@media (prefers-reduced-motion: no-preference) { @keyframes ois-* }` + `:122` `.ois-topbar-stripe { animation 0.4s }`.
- **Verified:** `animate-ping` is Tailwind util (`animation: ping 1s cubic-bezier(0,0,0.2,1) infinite`) — not under `no-preference` guard (only `.ois-*` keyframes). `prefers-reduced-motion: reduce` user still sees infinite ping. Static text also no API vs `topbar.md:122-126` notes placeholder. Confirm via `rg animate-ping` → only `TopBar.tsx:67`.
- **Status:** **open** (low) — guard ping with `motion-safe:` or CSS `@media (prefers-reduced-motion: reduce) .animate-ping { animation:none }`, wire `statusService` later.

### G-9 — InboxDrawer overlay (open low)

- **Source:** `InboxDrawer.tsx:29-35` backdrop `motion.div initial opacity 0 →1 exit 0 onClick={onClose} fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]`; `InboxDrawer.tsx:38-43` drawer `motion.div x 100%→0 spring damping 25 stiffness 200 fixed right-0 max-w-[400px] z-[101] flex flex-col`; `AppShell.tsx:85-89` `AnimatePresence {inboxOpen && <InboxDrawer onClose>}`; `TopBar.tsx:26` `useResource inboxService.items()` + `InboxDrawer.tsx:17` duplicate.
- **Verified:** No `useEffect keydown Escape` in `InboxDrawer.tsx:15-107`; `Escape` does not close (vs `SidebarContextMenu` does). `z-[100]/[101]` above `TopBar z-20`. Fetch dup confirmed `TopBar:26` + `InboxDrawer:17` each `inboxService.items()` deps `[]` → 2× `GET /api/v1/inbox/items`. Intentional parity with terra `motion` drawer.
- **Status:** **open** (low) — add `Escape` handler + share `useInbox()` dedup.

### G-10 — stripe + a11y parity (open info)

- **Source:** `AppShell.tsx:73-77` `div aria-hidden class="ois-topbar-stripe h-[2px] w-full shrink-0" style background linear-gradient 90deg #1F4FD4→#0BA5EC`; `src/index.css:116-123` `@keyframes ois-topbar-stripe scaleX 0→1` + `.ois-topbar-stripe { animation 0.4s cubic-bezier(0.2,0,0,1) transform-origin:center }` (`:122`); `TopBar.tsx:79-96` search `<input placeholder>` no `aria-label`, inbox `Inbox 20` no `aria-label`, bell `Bell 20` no `aria-label` (`:100-111`), avatar `button focus:outline-none` no `aria-label/expanded/haspopup` (`:136`) vs AI `aria-label="AI Quick Assist" aria-expanded={aiOpen}` (`:123-124`) parity gap.
- **Verified:** Stripe `aria-hidden` correct — decorative, no landmark. `rg aria-label` → only AI button hit; search input only `placeholder` (fails a11y placeholder-not-label); inbox/bell `Button ghost icon` no label. Sidebar `aria-pressed`/`role="group"` + `aria-current="page"` OK (`known-issues-sidebar.md:3`). See `known-issues-topbar.md:12-15`.
- **Status:** **open** (info) — add `aria-label="Search"` + `aria-label="Inbox"` + `aria-label="Notifications"` + avatar `aria-haspopup menu aria-expanded`.

---

## Cross-ref — `known-issues-*.md` sync

| Global ID | Maps to | Detail file |
|-----------|---------|-------------|
| G-1 | Sidebar #5 | `known-issues-sidebar.md:5` verified low `snapshotCache` ok, collapse intentional |
| G-4 | Sidebar #6 | `known-issues-sidebar.md:6` `sev-p3==p2` verified |
| G-5 | Sidebar #7 | `known-issues-sidebar.md:7` brand hardcode verified |
| G-6 | TopBar #1 | `known-issues-topbar.md:1` search decorative open medium |
| G-7 | TopBar #2-3 | `known-issues-topbar.md:2-3` `onMouseLeave` open medium |
| G-8 | TopBar #8 | `known-issues-topbar.md:8` health pill static + ping open low |
| G-3 | TopBar #7 | `known-issues-topbar.md:7` breadcrumb overflow open low |

> Global baseline stays 10; detail files own fixes. Keep counts consistent: `audit-global-shell.md:Summary 10` vs `known-issues-sidebar 7` + `known-issues-topbar 16` (overlap through G-* shared).

---

## Terra Reference — detailed delta (OIS vs terra)

| Aspect | Terra | OIS `AppShell/Sidebar/TopBar/InboxDrawer` |
|--------|-------|-------------------------------------------|
| Chrome | Dark `data-theme` + `terra-*` `linear-card` + `180px` sidebar persist | Light only `ois-*` — `ois-sidebar-bg #F4F5F7` dimmed vs `ois-content-bg #FFFFFF` pop (`src/index.css:40-42`), `w-[240px]/w-16 300ms` transient (`Sidebar.tsx:113`), pins `ois.sidebar.pins.v1` only |
| AppShell | Sidebar owns toggle, `AiAssistantPanel` | `AppShell.tsx:11-102` `ScopeProvider` + flex `h-screen overflow-hidden` + `Sidebar isAiRoute aiSidebarContent` + `TopBar onToggleSidebar/onOpenInbox/onToggleAi` + `ois-topbar-stripe` + `main p-6` vs `isAiRoute flex min-h-0` + `AiQuickPanel + CmdKPalette + auth:session-expired 401→/login` |
| TopBar | `h-9 sticky bg-theme-bg/85 backdrop-blur` + `Cmd-K` only + `h-9` shadow token | `h-14 bg-white border-ois-border shadow 0 1px 2px -1px rgba(16,24,40,0.06)` (`TopBar.tsx:34-36`) flat `shrink-0 z-20`, stripe `h-[2px] #1F4FD4→#0BA5EC anim 0.4s` (`AppShell.tsx:73-77`), search visible `w-72 lg:w-96` + `⌘K` hint + `CmdKPalette AppShell:41-51` duo |
| Search/Breadcrumb | Terra Cmd-K only | `Search 16` decorative `TopBar.tsx:75-87` + 54 `LABELS` (`breadcrumbs.ts:5-69`) + `IMPLICIT_PARENTS` + `ID_LABELS` + `looksLikeId` |
| Badges | Single bell count | 11 Sidebar signals (`Sidebar.tsx:68-106` urgent/warning + dot `ring-2` + `title (N)`) + TopBar urgent `w-4 h-4 #F04438 9px` vs unread dot `w-2.5 #1F4FD4` (`TopBar.tsx:92-109`) + InboxDrawer `max-w-[400px] modal` (`InboxDrawer.tsx:43`) |
| Tokens | `terra-*` dark | `ois-*` light `#1F4FD4 #12B76A #F04438 #F79009 #F4F5F7 #F1F3F7 #E4E7EC` `rounded-ois-btn 6px` `shadow-ois-dropdown` (`src/index.css:1-59`) |
| Motion | CSS transitions | `motion/react` `AnimatePresence mode="wait" 0.15s` (Sidebar crossfade) + drawer springs (`InboxDrawer  damping 25 stiffness 200`) + stripe `scaleX 0.4s`; only `.ois-*` guarded by `prefers-reduced-motion` (`src/index.css:93`) — `animate-ping` not |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Baseline audit AppShell/Sidebar/TopBar/InboxDrawer — 4 findings (collapse non-persist, `p-6` vs `-m-6`, breadcrumb source, `sev-p3==p2`) | — |
| 2026-08-28 | Deepen baseline → 10 findings (G-1…G-10) — adds brand gradient hardcode (`Sidebar.tsx:125-126,185-187,363` · `AppShell.tsx:76` `src/index.css:8,25,93`), search decorative (`TopBar.tsx:75-87` · `AppShell.tsx:41-51`), dropdown `onMouseLeave` only (`NotificationDropdown.tsx:30` · `UserMenu.tsx:28`), health ping `animate-ping` reduced-motion (`TopBar.tsx:67` · `src/index.css:93,116`), InboxDrawer overlay (`InboxDrawer.tsx:29-43`), stripe + a11y gaps (`AppShell.tsx:73-77` · `TopBar.tsx:79-136`) — verified collapse non-persist + `p-6/-m-6` + `LABELS 54` + `sev-p3==p2` + brand hardcode; 5 open (search/decorative, dropdown, ping, drawer, a11y) vs `known-issues-sidebar.md:7` (4 fixed 3 verified) + `known-issues-topbar.md:16` (5 medium 6 low 5 info) — Summary **10 total · 0 fixed · 5 verified · 5 open** | `AppShell.tsx:12,41-51,66,73-79` · `Sidebar.tsx:68-116,125-131,185-187,363` · `TopBar.tsx:34-140` · `InboxDrawer.tsx:17-43` · `breadcrumbs.ts:5-136` · `sidebar-pins.ts:3` · `NotificationDropdown.tsx:28-30` · `UserMenu.tsx:26-28` · `src/index.css:8-48,93-123` · `docs/ui/app-shell.md` · `docs/ui/sidebar.md` · `docs/ui/topbar.md` |
