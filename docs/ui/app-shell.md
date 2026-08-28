# AppShell

Status: **Stable**
Source of truth: [`src/components/layout/AppShell.tsx`](../../src/components/layout/AppShell.tsx), [`src/components/layout/Sidebar.tsx`](../../src/components/layout/Sidebar.tsx), [`src/components/layout/TopBar.tsx`](../../src/components/layout/TopBar.tsx), [`src/components/layout/InboxDrawer.tsx`](../../src/components/layout/InboxDrawer.tsx), [`src/routes/index.tsx`](../../src/routes/index.tsx), [`src/App.tsx`](../../src/App.tsx), [`src/index.css`](../../src/index.css) `@theme`

> Cross-ref token hex → [`design-tokens.md`](./design-tokens.md). Semua warna/radius/shadow harus pakai `ois-*` — jangan hardcode hex. Light theme only (`ois-bg #F7F8FA`, `ois-surface #FFFFFF`) — no terra `data-theme` dark toggle.

---

## Used by?

`src/routes/index.tsx:115-116` — `AppShell` mounted as layout `element: <AppShell />` under `RequireAuth` → `RequirePasswordChange` gate (`routes/index.tsx:109-115`). All children routes (`/:index Dashboard`, `/cmdb`, `/monitoring`, `/incidents`, `/portal`, `/kb`, `/changes`, `/releases`, `/deployments`, `/availability`, `/capacity`, `/continuity`, `/dashboards`, `/improvement`, `/on-call`, `/status`, `/admin`, `/ai` — `routes/index.tsx:117-249`) render via `<Outlet />`. Exempt: `/login` (`107`) and `/change-password` (`111`) render standalone outside shell. `src/App.tsx:5` wraps `RouterProvider` in `CurrentUserProvider`.

`vite.config.ts:14-15` alias `@` → repo root — AppShell imports via `@/src/components/*` (`AppShell.tsx:7-9`).

Single consumer, not reusable standalone. Must be inside `BrowserRouter` + `CurrentUserProvider` + `ScopeProvider`.

---

## Purpose

Global shell for all authenticated pages. Owns 4 concerns:

1. **Chrome layout** — `Sidebar` (left nav `w-[240px]` ↔ `w-16`) + `TopBar` (header `h-14`) + `Outlet` content + overlays (`InboxDrawer`, `AiQuickPanel`, `CmdKPalette`).
2. **Scope boundary** — wraps everything in `ScopeProvider` (`AppShell.tsx:54`) so `useScope()` / `AppScopeSwitcher` / `scope` filtering available in all `Outlet` children (`src/lib/scope/ScopeContext.tsx:29`).
3. **Session-expiry handling** — global `auth:session-expired` listener (`AppShell.tsx:27-39`) redirects to `/login` with `state: { from, reason:'expired' }` when `apiFetch` (`src/services/core.ts`) emits 401.
4. **Command palette** — `CmdKPalette` shortcut `Cmd+K / Ctrl+K` toggle (`AppShell.tsx:41-51`).

Terra delta: Terra `AppShell = Sidebar + AiAssistantPanel` with `data-theme` toggle. OIS = `Sidebar + TopBar + Outlet + InboxDrawer` (+ `AiQuickPanel` conditional + `CmdKPalette`), **light only** (`ois-*` tokens `src/index.css:8-49`), no `AiAssistantPanel` default, no `data-theme`. See `inbox-drawer.md` terra delta table, `sidebar.md:36`, `topbar.md:12`.

---

## Anatomy

### ASCII — overall chrome

```
viewport: flex h-screen w-full bg-ois-bg overflow-hidden  z context: AppShell.tsx:55
┌──────────────────────────────────────────────────────────────────────────────┐
│  <ScopeProvider>  (AppShell.tsx:54)                                          │
│  ┌──────────────┬──────────────────────────────────────────────────────────┐  │
│  │ Sidebar      │  Main Content Area                                       │  │
│  │ aside        │  div.flex.flex-col.flex-1.min-w-0.h-full.overflow-hidden │  │
│  │ z-30         │  (AppShell.tsx:64)                                      │  │
│  │ w-[240px]    │  ┌────────────────────────────────────────────────────┐  │  │
│  │ or w-16      │  │ TopBar  h-14  z-20  bg-white border-b ois-border │  │  │
│  │ transition   │  │ (TopBar.tsx:35, AppShell.tsx:65-71)             │  │  │
│  │ duration-300 │  ├────────────────────────────────────────────────────┤  │  │
│  │ (Sidebar.tsx │  │ ois-topbar-stripe  h-[2px] w-full shrink-0     │  │  │
│  │  114)        │  │ linear-gradient 90deg #1F4FD4→#0BA5EC anim      │  │  │
│  │              │  │ (AppShell.tsx:73-77, index.css:116-122)        │  │  │
│  │              │  ├────────────────────────────────────────────────────┤  │  │
│  │              │  │ <main>                                           │  │  │
│  │              │  │  default: flex-1 overflow-y-auto p-6            │  │  │
│  │              │  │  aiRoute: flex-1 overflow-hidden flex min-h-0   │  │  │
│  │              │  │  (AppShell.tsx:79)                               │  │  │
│  │              │  │  <Outlet context={{setAiSidebarContent}}>       │  │  │
│  │              │  │  (AppShell.tsx:80)                               │  │  │
│  │              │  │  bleed pages: first child -m-6 flex flex-col    │  │  │
│  │              │  │  calc(100vh - 3.5rem) untuk -m-6 trick          │  │  │
│  │              │  │  (docs/DESIGN-SYSTEM.md §3-Column)            │  │  │
│  │              │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────┴──────────────────────────────────────────────────────────┘  │
│  Overlays (portals, fixed):                                                  │
│   • InboxDrawer  AnimatePresence {inboxOpen && <InboxDrawer>}  (85-89)      │
│     backdrop z-[100] + drawer z-[101] (InboxDrawer.tsx:34,43)               │
│   • AiQuickPanel AnimatePresence {aiPanelOpen && !isAiRoute} (91-95)         │
│     backdrop z-[59] + panel z-[60] (AiQuickPanel.tsx:177,186)               │
│   • CmdKPalette  fixed inset-0 z-50 (CmdKPalette.tsx:107)                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### DOM — exact container tree

`AppShell.tsx:54-100`:

```tsx
<ScopeProvider>                                              // 54 — provides ScopeValue | 'all' | {kind:'app',appId}
  <div className="flex h-screen w-full bg-ois-bg overflow-hidden">  // 55 — viewport root, bg #F7F8FA, no scroll
    <Sidebar collapsed={sidebarCollapsed} isAiRoute={isAiRoute} aiSidebarContent={aiSidebarContent} /> // 57-61
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden"> // 64 — main column, owns TopBar stacking
      <TopBar onToggleSidebar={()=>setSidebarCollapsed(!sidebarCollapsed)} // 65-71
              onOpenInbox={()=>setInboxOpen(true)}
              onToggleAi={()=>setAiPanelOpen(v=>!v)} aiOpen={aiPanelOpen} showAi={!isAiRoute} />
      <div aria-hidden className="ois-topbar-stripe h-[2px] w-full shrink-0"   // 73-77
           style={{ background:'linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)' }} />
      <main className={isAiRoute ? 'flex-1 overflow-hidden flex min-h-0'        // 79
                                 : 'flex-1 overflow-y-auto p-6'}>
        <Outlet context={{ setAiSidebarContent }} />                            // 80
      </main>
    </div>
    <AnimatePresence>{inboxOpen && <InboxDrawer onClose={()=>setInboxOpen(false)} />}</AnimatePresence> // 85-89
    <AnimatePresence>{aiPanelOpen && !isAiRoute && <AiQuickPanel onClose={()=>setAiPanelOpen(false)} />}</AnimatePresence> //91-95
    <CmdKPalette open={cmdKOpen} onClose={()=>setCmdKOpen(false)} />            // 97
  </div>
</ScopeProvider>
```

`TopBar.tsx:34-36` header exact:

```tsx
<header className="h-14 flex items-center px-4 bg-white border-b border-ois-border shrink-0 z-20"
        style={{ boxShadow:'0 1px 2px -1px rgba(16,24,40,0.06)' }}>
```

`Sidebar.tsx:112-116` aside exact:

```tsx
<aside className={cn("flex flex-col bg-ois-sidebar-bg border-r border-ois-sidebar-border transition-all duration-300 z-30",
                     collapsed ? "w-16" : "w-[240px]")}>
```

| Element | Class / Token | Value / Notes |
|---------|---------------|---------------|
| Root | `flex h-screen w-full bg-ois-bg overflow-hidden` | `#F7F8FA`, full viewport, no outer scroll (`AppShell.tsx:55`, `index.css:13`) |
| Main column | `flex flex-col flex-1 min-w-0 h-full overflow-hidden` | Prevents flex blowout, column stacking (`AppShell.tsx:64`) |
| Sidebar | `w-[240px]` expanded / `w-16` collapsed, `transition-all duration-300` | Toggle via prop `collapsed` (`Sidebar.tsx:113-116`) |
| TopBar | `h-14 shrink-0 flex items-center px-4 bg-white border-b border-ois-border z-20` + inline `shadow 0 1px 2px -1px rgba(16,24,40,0.06)` | `56px = 3.5rem` contract for `calc(100vh - 3.5rem)` (`TopBar.tsx:34-36`) |
| Stripe | `ois-topbar-stripe h-[2px] w-full shrink-0` `linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)` `aria-hidden` | Animation `0.4s cubic-bezier(0.2,0,0,1) scaleX 0→1` (`index.css:116-122`, `AppShell.tsx:73-77`) |
| Main default | `flex-1 overflow-y-auto p-6` | Scroll container for all non-AI pages (`AppShell.tsx:79`) |
| Main ai | `flex-1 overflow-hidden flex min-h-0` | Canvas for `AiWorkspace` session (`AppShell.tsx:79`) |
| Outlet | `context={{ setAiSidebarContent }}` | AI workspace injects session list via context (`AppShell.tsx:80`) |
| z indices | Sidebar `z-30`, TopBar `z-20`, Inbox backdrop `z-[100]` + drawer `z-[101]`, AiQuickPanel `z-[59]/[60]`, CmdK `z-50`, Notification/User/Scope dropdowns `z-50` | Stack order verified `Sidebar.tsx:114`, `TopBar.tsx:35`, `InboxDrawer.tsx:34,43`, `AiQuickPanel.tsx:177,186`, `CmdKPalette.tsx:107` |

---

## Layout Tokens

From `src/index.css:7-59` `@theme`:

| Token | Value | Usage in AppShell |
|-------|-------|-------------------|
| `--color-ois-bg` | `#F7F8FA` | Root `bg-ois-bg` (`AppShell.tsx:55`), bleed pages `bg-ois-bg` |
| `--color-ois-surface` | `#FFFFFF` | Main content bg (via Outlet pages), TopBar `bg-white`, Inbox/AiQuickPanel `bg-ois-surface` |
| `--color-ois-surface-muted` | `#F1F3F7` | Hover states, mode toggle group bg |
| `--color-ois-border` | `#E4E7EC` | TopBar `border-ois-border`, stripe parent separator |
| `--color-ois-sidebar-bg` | `#F4F5F7` | Sidebar `bg-ois-sidebar-bg` — dimmed chrome agar content `#FFFFFF` pop (`index.css:41`) |
| `--color-ois-sidebar-border` | `#E4E7EC` | Sidebar `border-ois-sidebar-border` |
| `--color-ois-primary` | `#1F4FD4` | Stripe `#1F4FD4→#0BA5EC`, badge dots, active states |
| `--color-ois-info` | `#0BA5EC` | Stripe end gradient |
| `--color-ois-text` | `#101828` | Primary text (TopBar breadcrumb last crumb) |
| `--color-ois-text-muted` | `#475467` | Breadcrumb intermediate, icon muted |
| `--color-ois-text-subtle` | `#98A2B3` | Home breadcrumb, kbd hint |
| `--shadow-ois-card` | `0 1px 2px rgba(16,24,40,0.04)` | Card base (not TopBar — TopBar uses `0 1px 2px -1px rgba(16,24,40,0.06)` inline) |
| `--shadow-ois-dropdown` | `0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)` | Notification/UserMenu |
| `--shadow-ois-modal` | `0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)` | InboxDrawer (`InboxDrawer.tsx:43`) |
| `--radius-ois-card` | `8px` | Dropdown card radius |
| `--radius-ois-btn` | `6px` | Button radius, search `rounded-ois-btn` |

Animation tokens (`index.css:116-122`): `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1) transform-origin:center`, `ois-fade-up 0.5s`, `ois-shimmer 7s linear` — AppShell only uses stripe anim.

Brand gradients: Sidebar badge `135deg #1F4FD4→#185FA5→#0C447C` (`Sidebar.tsx:125`), AI mode indicator `135deg #1F4FD4→#185FA5` (`Sidebar.tsx:186`), Stripe `90deg #1F4FD4→#0BA5EC` (`AppShell.tsx:76`).

### Z-Index Contract — exact stacking

Verified per file:line — do not renumber without checking overlays:

| Layer | `z-*` | File:line | Why that value |
|-------|-------|-----------|----------------|
| Sidebar `aside` | `z-30` | `Sidebar.tsx:114` | Above main content, below Inbox `100` so slide-over covers rail |
| TopBar `header` | `z-20` | `TopBar.tsx:35` | Below Sidebar `30` so collapsed badge dot ring visible over header seam; above `<main>` |
| Inbox backdrop | `z-[100]` | `InboxDrawer.tsx:34` | Covers everything except drawer |
| Inbox drawer | `z-[101]` | `InboxDrawer.tsx:43` | Topmost chrome — must overlay AiQuickPanel `60` |
| AiQuickPanel backdrop | `z-[59]` | `AiQuickPanel.tsx:177` | Below drawer but above page |
| AiQuickPanel panel | `z-[60]` | `AiQuickPanel.tsx:186` | Below Inbox `100` — if both open, Inbox wins |
| CmdKPalette overlay | `z-50` | `CmdKPalette.tsx:107` | Above page + header, below Inbox `100` — backdrop click ambiguous if both open |
| Scope/Notification/User dropdowns | `z-50` | `AppScopeSwitcher.tsx:108`, `NotificationDropdown.tsx:29`, `UserMenu.tsx:27` | Same layer as CmdK — separate trigger, no overlap |

Changing TopBar to `z-30` hides collapsed dot ring (`Sidebar.tsx:371 ring-2 ring-ois-sidebar-bg`). Changing Inbox to `z-50` makes AiQuickPanel `60` overlay it — inverted.

### Props & Hooks — state owned by AppShell

State lives only in `AppShell.tsx:11-16` — no `localStorage`, no `zircon` persist:

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // 12 — none-persist, toggle via TopBar
const [inboxOpen, setInboxOpen]           = useState(false); // 13 — AnimatePresence mount
const [aiPanelOpen, setAiPanelOpen]       = useState(false); // 14 — AiQuickPanel guard !isAiRoute
const [aiSidebarContent, setAiSidebarContent] = useState<ReactNode>(null); // 15 — Outlet context inject
const [cmdKOpen, setCmdKOpen]             = useState(false); // 16 — Cmd+K toggle
const isAiRoute = location.pathname.startsWith('/ai');      // 20 — route signal, not prop
```

Hooks:

| Hook | File:line | Behavior |
|------|-----------|----------|
| `useLocation() / useNavigate()` | `AppShell.tsx:18-19` | `isAiRoute` derive + `navigate('/login', replace+state)` on expiry |
| `useEffect auth:session-expired` | `AppShell.tsx:27-39` | Add `window 'auth:session-expired'` → dep `[navigate, location.pathname, location.search]`, guard `pathname==='/login'` |
| `useEffect Cmd+K` | `AppShell.tsx:41-51` | `window keydown (metaKey||ctrlKey)+k → preventDefault + toggle`, deps `[]` |
| `useBreadcrumbs()` | `breadcrumbs.ts:105` via `TopBar.tsx:24` | Sync derive `nav text-xs` 54 LABELS — not AppShell but rendered inside TopBar child |
| `useScope()` / `ScopeProvider` | `AppShell.tsx:54` `ScopeContext.tsx:29` | Provides `scope/myApps/scopedAppIds` to all Outlet children |
| `useAuthSession()` | `Sidebar.tsx:65, TopBar.tsx:28 (via useResource usersService.current)` + `session.ts:65` | Pub-sub cache `cached/pending/subscribers` for `isAdmin` gate |

Sidebar props (`Sidebar.tsx:56-60`): `collapsed:boolean`, `isAiRoute:boolean`, `aiSidebarContent:ReactNode`. TopBar props (`TopBar.tsx:13-19`): `onToggleSidebar`, `onOpenInbox`, `onToggleAi?`, `aiOpen?`, `showAi?` — fully controlled, no internal `useState` for collapse/inbox.

Cross-ref consistency: `sidebar.md:435` documents `Sidebar` chrome, `topbar.md:368` documents health pill + AppScopeSwitcher + search + Inbox/Bell/AI/Avatar exact classes, `inbox-drawer.md:282` documents Drawer spring + FilterPill (`sidebar.md:30-35` + `topbar.md:76-82` token parity). Keep `ois-sidebar-bg/border`, `h-14`, `w-[240px]↔w-16`, `z-[100]/[101]` verbatim across docs — any change copy to those docs.

---

## Behavior

### 1. Collapse toggle — Sidebar `w-[240px]` ↔ `w-16`

- State: `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)` — **local `useState` none-persist** (`AppShell.tsx:12`). Initial expanded; no `localStorage`, no `useSyncExternalStore`. Refresh reverts to `false`.
- Trigger: `TopBar` hamburger `Button ghost size icon` `Menu size={20}` (`TopBar.tsx:40-42`) → prop `onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}` (`AppShell.tsx:66`).
- Effect: `Sidebar` props `collapsed` control `cn(collapsed ? "w-16" : "w-[240px]")` + `transition-all duration-300` (`Sidebar.tsx:113-116`). Collapsed hides brand subtitle, mode toggle (`{!collapsed && ...}` `Sidebar.tsx:135,144`), section labels (replaced with `:before` divider `Sidebar.tsx:313`), item labels + numeric badges replaced with `w-2 h-2 dot` (`Sidebar.tsx:368-376`), and AI content `null` (`Sidebar.tsx:205`).
- Mobile: No dedicated overlay or drawer — same `w-16` icon collapse used at all breakpoints. Not a slide-over like terra `mobileOverlay`. Search hides `<md`, health pill hides `<xl` to preserve narrow width (`topbar.md` responsive).
- Deliberate none-persist: audit `audit/audit-global-shell.md:22` low, verified vs terra `localStorage 180px` persist — OIS keeps ephemeral to avoid stale persisted narrow shell after redeploy.

### 2. Mode toggle — Management ↔ AI Workspace

- Route signal: `const isAiRoute = location.pathname.startsWith('/ai')` (`AppShell.tsx:20` via `useLocation()`).
- Sidebar toggle: `role="group" aria-label="Application mode"` with two buttons `aria-pressed` (`Sidebar.tsx:147-194`). Management `navigate('/')` vs AI `navigate('/ai')`. Active indicator is `motion.div layoutId="sidebar-mode-indicator"` spring `stiffness 500 damping 35` (`Sidebar.tsx:161-189`).
- Content switch: `AnimatePresence mode="wait"` crossfade `opacity 0→1 duration 0.15` (`Sidebar.tsx:202-294`). When `isAiRoute` and `!collapsed`, renders `aiSidebarContent` injected via `<Outlet context={{ setAiSidebarContent }}>` (`AppShell.tsx:80`); when `collapsed && isAiRoute`, renders `null` (logo-only shell).
- TopBar AI ghost: `TopBar.tsx:117-133` `Sparkles 20` ghost hidden when `showAi={!isAiRoute}` (`AppShell.tsx:70`) else `onToggleAi` toggles `aiPanelOpen`. Closed styling `text-ois-text-muted`; open `bg-ois-primary-pale text-ois-primary`.

### 3. Breadcrumb — `useBreadcrumbs()` in TopBar left cluster

- Source: `src/lib/breadcrumbs.ts:5-136` — `useLocation().pathname` split + `LABELS` 54 entries (`breadcrumbs.ts:5-69`, e.g. `cmdb→CMDB`, `events→Event Stream`), `IMPLICIT_PARENTS` 3 (`events→Monitoring`, `kedb→Problems`, `on-call→Platform` — `72-76`), `ID_LABELS` 12 per resource (`79-93`), `looksLikeId()` UUID/numeric/`^[A-Z]+-\d+$/`/long non-slug (`95-103`).
- Render: `TopBar.tsx:43-57` — always `Link to="/" Home text-ois-text-subtle`, then each `crumb` → `Link href text-ois-text-muted` except last `span text-ois-text`. Separator `/` `text-ois-text-subtle px-0.5`. `nav flex items-center gap-1 text-xs font-medium`.
- Root `/` → `[]` → only `Home`. Unknown segment fallback raw `seg`. No API call — purely client synchronous.

### 4. InboxDrawer trigger — slide-over via AnimatePresence

- State: `const [inboxOpen, setInboxOpen] = useState(false)` (`AppShell.tsx:13`), open via `TopBar onOpenInbox={()=>setInboxOpen(true)}` (`AppShell.tsx:67`, `TopBar.tsx:90-97` Inbox 20 + `urgentInboxCount` badge `w-4 h-4 bg-ois-danger #F04438 9px border-white`).
- Mount: `AppShell.tsx:85-89` `AnimatePresence {inboxOpen && <InboxDrawer onClose>}` — not in DOM when closed; exit `x:'100%'` spring `damping 25 stiffness 200` (`InboxDrawer.tsx:39-42`) + backdrop `bg-black/30 backdrop-blur-sm z-[100]` (`34`) `opacity` exit. Panel `fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-white shadow-ois-modal z-[101]` (`43`).
- Inner: `InboxDrawer.tsx:16-18` `filter 'all'|'urgent'|'approval'` + `useResource(() => inboxService.items(), [])`; FilterPill trio + urgent left `w-1 bg-ois-danger` stripe + time `formatRelative`. See `inbox-drawer.md` full.
- Coexistence: `AiQuickPanel` separate `AnimatePresence aiPanelOpen && !isAiRoute` (`91-95`) — different `z-[59]/[60]`; both can theoretically overlap but different triggers.

### 5. Cmd-K palette — global verb bar

- Listener: `AppShell.tsx:41-51` `window.addEventListener('keydown', e => { if((metaKey||ctrlKey)&&key==='k'){preventDefault; setCmdKOpen(p=>!p);} })` — toggle, not separate open/close. Cleanup via `removeEventListener`.
- Component: `CmdKPalette.tsx:52-157` — `fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4` with `bg-black/30` overlay (`107,110`), card `max-w-[560px] rounded-[12px] shadow 0 12px 40px rgba(16,24,40,0.18)` (`112`), input `Search routes` + list 24 static `ROUTES` (`18-44`) filter on `label+path+keywords` (`58-65`), keyboard `ArrowUp/Down/Enter/Escape` (`82-99`), `onClose` backdrop click. TopBar search field (`TopBar.tsx:75-87`) decorative `hidden md:block w-72 lg:w-96` with `kbd ⌘K` chip purely hint (`design-tokens.md`).

### 6. Session 401 handling — `auth:session-expired`

- `AppShell.tsx:27-39` listens `window 'auth:session-expired'` (dispatched by `apiFetch 401` in `src/services/core.ts`) — `if(pathname==='/login') return; navigate('/login', {replace:true, state:{from: detail?.from ?? pathname+search, reason:'expired'}})`. Login page shows banner when `reason==='expired'`. Also `src/lib/auth/session.ts:56-62` clears `cached/pending` on same event.
- Guard: `routes/index.tsx:109-115` `RequireAuth` checks `GET /api/v1/auth/me` (`server/app.ts:126` global `requireAuth` gate); on 401 redirects before shell mounts. Shell listener handles mid-session expiry.

### 7. AI Quick Panel — `AiQuickPanel`

- State: `const [aiPanelOpen, setAiPanelOpen] = useState(false)` (`AppShell.tsx:14`), toggle `onToggleAi={()=>setAiPanelOpen(v=>!v)}` (`68`). Mount only `aiPanelOpen && !isAiRoute` (`91-94`) so hidden at `/ai`.
- Panel: `AiQuickPanel.tsx:185-186` `fixed right-0 top-0 h-full w-[320px] z-[60] border-l border-ois-border` `motion x 100%→0 duration 0.2 easeOut` (`187-190`), backdrop `fixed inset-0 bg-black/20 z-[59]` (`176-182`). Domain badge `cmdb/knowledge_base/incident/problem/change/all` (`AiQuickPanel.tsx:52-83`), messages + `AiInputBar` (`346-348`), fallback `Buka di Workspace`.

### 8. Content area — `<Outlet>` + `ScopeProvider` + bleed contract

- `ScopeProvider` at root (`AppShell.tsx:54`) reads `GET /api/v1/applications/catalog` once per `userId` (`ScopeContext.tsx:46-51`), derives `myApps/writableApps/scopedAppIds` (`53-76`), persists `scope` + `pinned` to `localStorage` per user (`readScope/readPinned/writeScope/writePinned` — `ScopeContext.tsx:37-40,79-91`). All `Outlet` children can `useScope()` / `AppScopeSwitcher` (`TopBar.tsx:74`).
- Main variants (`AppShell.tsx:79`): default pages `flex-1 overflow-y-auto p-6` (scroll in main, TopBar `shrink-0` pinned); `isAiRoute` → `flex-1 overflow-hidden flex min-h-0` (outer overflow hidden, canvas full height).
- Bleed contract: Module Layouts and 3-col entity detail pages opt out of `p-6` via first-child `-m-6 flex flex-col bg-ois-bg calc(100vh - 3.5rem)` (`docs/design/08-design-system.md §3-Column`, `audit/audit-global-shell.md G-2`). Shell `h-14 = 3.5rem` contract (`TopBar.tsx:35`, `index.css` body). Must not change `p-6` or `h-14` without updating `calc(100vh - 3.5rem)` in 20+ layouts.

---

## States

| State | Signal | Visual delta | Notes |
|-------|--------|--------------|-------|
| Default expanded | `sidebarCollapsed === false`, `isAiRoute === false` | Sidebar `w-[240px]`, brand full + mode toggle, all sections + labels, main `overflow-y-auto p-6` | Initial mount |
| Collapsed | `sidebarCollapsed === true` | Sidebar `w-16` only, brand logo `OIS` only, mode toggle hidden, section dividers `:before border-t`, dot badges `w-2 h-2 ring-2 ring-ois-sidebar-bg`, footer only icons | Toggle via hamburger `TopBar.tsx:40` |
| AI route expanded | `pathname startsWith('/ai')` + `!collapsed` | Sidebar content crossfades to `aiSidebarContent` (`motion key ai-content opacity 0.15s`), TopBar AI ghost hidden (`showAi false`) | Injected by `AiWorkspace` via `setAiSidebarContent` |
| AI route collapsed | `isAiRoute && collapsed` | Sidebar content `null` — main full width, only logo column | Intentional maximize canvas |
| AI quick panel open | `aiPanelOpen true && !isAiRoute` | `AiQuickPanel w-[320px] z-[60]` + backdrop `z-[59]` overlay, TopBar Sparkles `bg-ois-primary-pale text-ois-primary` | Toggle via TopBar `Sparkles` `TopBar.tsx:118-132` |
| Inbox open | `inboxOpen true` | `InboxDrawer` backdrop `z-[100] bg-black/30 backdrop-blur-sm` + drawer `z-[101] w-full max-w-[400px] shadow-ois-modal` spring | Trigger `Inbox 20` bell `TopBar.tsx:90-97` |
| CmdK open | `cmdKOpen true` | `CmdKPalette z-50 pt-[12vh] bg-black/30` centered `max-w-[560px] rounded-[12px]` | `Cmd+K / Ctrl+K` global (`AppShell.tsx:43-46`) |
| Session expired | `auth:session-expired` dispatched | Immediate `navigate('/login', {replace:true, state:{from, reason:'expired'}})` — no shell | Window listener `AppShell.tsx:27-39` |
| Mobile narrow | `<768px md` | Search `hidden md:block` hidden, health pill hidden `<xl`, breadcrumb may overflow | No dedicated mobile drawer — collapsed `w-16` persists |
| Auth guard pending | `/auth/me` loading / 401 | Shell not mounted — `RequireAuth` redirects; unauthenticated `withScopedDb` stub prevents crash | `server/app.ts:90,126`, `scopedDb.ts:27` |

Focus-visible: browser default on `NavLink`/`Button` — not overridden. `motion/react` spring on sidebar mode indicator + InboxDrawer/AiQuickPanel slide; stripe CSS `0.4s` respects `prefers-reduced-motion` (`index.css:93`).

### Accessibility — chrome level

- `TopBar` breadcrumb `nav` + separator `/` `aria` neutral (`TopBar.tsx:43`), last crumb `span text-ois-text` (no link) communicates current page without `aria-current` (table tabs elsewhere add it).
- Sidebar mode toggle `role="group" aria-label="Application mode"` + `aria-pressed` per button (`Sidebar.tsx:148-175`); collapsed tooltip `title` on items (`Sidebar.tsx:355`).
- Inbox backdrop `aria-hidden` on stripe but Drawer backdrop `onClick={onClose}` without `role="dialog"` — current gap (see `inbox-drawer.md` Accessibility).
- CmdK `role="dialog" aria-modal="true" aria-label="Command palette"` (`CmdKPalette.tsx:104-106`) + listbox `role="listbox"` / `aria-selected` (`134-135`).
- `h-screen` layout avoids scroll trapping: `<main overflow-y-auto>` scrolls, TopBar `shrink-0` pinned — screen reader landmarker `aside` + `header` + `main` semantic.
- Reduced motion: `prefers-reduced-motion` disables `ois-topbar-stripe` anim (`index.css:93`) but `motion` spring not guarded by `useReducedMotion()` — parity with `sidebar.md` known gap.

### Responsive — behavior at breakpoints

| Breakpoint | TopBar | Sidebar | Main | Notes |
|------------|--------|---------|------|-------|
| `≥1280 xl` | Health pill `hidden xl:flex` visible (`TopBar.tsx:62`), search `w-96 lg:w-96` | `w-[240px]` or `w-16` same | `p-6` | Full chrome |
| `768-1279 md` | Search `hidden md:block w-72` visible, health pill hidden | same | same | Breadcrumb may wrap without truncate clamp (gap) |
| `<768 md` | Search hidden, only hamburger + breadcrumb + 4 icons + avatar | `w-16` or `w-[240px]` (no auto-collapse) | `p-6` but page may overflow-x | Terra has mobile drawer — OIS intentional no auto mode |

No JS `matchMedia` breakpoint logic in AppShell — purely CSS `hidden xl:flex / hidden md:block` (`TopBar.tsx:62,75`). Collapsed `w-16` is desktop-optimized narrow nav, not a sheet — on phone it still blocks `64px` width.

---

## Edge Cases

| # | Case | Handling | TODO |
|---|------|----------|------|
| 1 | `/login` standalone | Not inside shell — no `ScopeProvider`/`Sidebar`/`TopBar`. Hook `useScope()` would throw outside. Guard `RequireAuth` + `auth:session-expired` returns user. | OK — intentional |
| 2 | `/change-password` `mustChangePassword` | `RequirePasswordChange` wrapper outside shell children (`routes/index.tsx:113`) — forces redirect before shell render. | OK |
| 3 | `sidebarCollapsed` on refresh | Always resets `false` — not persisted. Contrast terra `localStorage 180px`. | Verified none-persist intentional — see `audit/audit-global-shell.md:22` |
| 4 | Rapid collapse toggle | `transition-all duration-300` width — double-click queues transform but state toggles atomic `!prev`. No race. | OK |
| 5 | `collapsed && isAiRoute` | AI sidebar `null` — only `OIS` logo; main `flex min-h-0 overflow-hidden` expands. User may think page empty — intentional maximize. | Document |
| 6 | Page forgets `-m-6` bleed | Content double-padded `p-6` interior + bleed — misalignment. All Module Layouts + detail pages must `-m-6` first child. | Preserve contract `audit/audit-global-shell.md G-2` |
| 7 | `h-14` contract drift | `calc(100vh - 3.5rem)` assumes `3.5rem==h-14`. If TopBar height changes without updating layouts, double-scroll or gap. | Lock `h-14` ↔ `3.5rem` together |
| 8 | Cmd+K on input with user typing `k` + cmd | Conditional `metaKey||ctrlKey` prevents trigger on plain `k`. `preventDefault` blocks browser find. `AppShell.tsx:43-46`. | OK |
| 9 | CmdK open + Inbox open simultaneously | Two `z-50` vs `z-[100]` overlays — Inbox `z-[100]/[101]` stacks above CmdK `z-50` (backdrop overlap). Closing order backdrop clicks ambiguous. | Acceptable — different center points |
| 10 | AiQuickPanel + InboxDrawer simultaneously | Inbox `z-[100]/[101]` above AiPanel `z-[59]/[60]` — inbox visually wins if both open via `Inbox` bell + `Sparkles`. | Prevent dual open guard deferred |
| 11 | `setAiSidebarContent` called after collapsed | `aiSidebarContent` stored but not rendered (`null` gate). On expand, stale content appears. Injection from `AiWorkspace` session list — race on route switch. | Guard `set` when `isAiRoute` |
| 12 | `window.location.pathname === '/login'` guard | Prevents expiry listener loop (`AppShell.tsx:31`). Second dispatch while already on login ignored. | OK |
| 13 | `ScopeProvider` catalog empty before mount | `myApps []` → `AppScopeSwitcher` shows `Browse catalog` empty state (`AppScopeSwitcher.tsx:189`). No spinner. | OK |
| 14 | Health pill hidden `<xl` + scopeless page | TopBar right cluster compresses at `md` — Inbox/Bell/avatar persist, search hidden `hidden md:block`. Breadcrumb truncates without `min-w-0`. | Consider `min-w-0 truncate` on last crumb |
| 15 | Module Layout `Outlet` scroll ownership | Shell `<main overflow-y-auto>` scrolls default; bleed pages own scroll inside `-m-6` containers, shell main becomes non-scroll `min-h-0`. Nested scroll subtle. | Preserve `min-h-0` on flex children |

---

## API Touchpoints

AppShell itself makes no REST calls — data via children + TopBar/Sidebar hooks and `ScopeProvider` (see `sidebar.md` 13 parallel `useResource` + `topbar.md` triple inbox/notifications/user + `inbox-drawer.md` duplicate inbox). Consolidated:

| Concern | Call | Endpoint | Where | Permission | Notes |
|---------|------|----------|-------|------------|-------|
| Session (expiry + scope user) | `GET /api/v1/auth/me` | `/auth/me` | `RequireAuth` gate (`routes/index.tsx:109`) + `useAuthSession()` (`lib/auth/session.ts:36`) + `ScopeProvider userId` (`ScopeContext.tsx:31,46`) | `public` sub-router (`server/app.ts:120` before `requireAuth:126`) handles own 401 | Fetched once per load via `cached/pending` pub-sub (`session.ts:26-32`). 401 → `auth:session-expired` event → shell navigate |
| Scope catalog | `GET /api/v1/applications/catalog` | `/applications/catalog` | `ScopeContext.tsx:47-50` `applicationCatalogApi.list()` | `requireAuth` only (no `system.admin`) — tenant-scoped `listCatalog` (`applications.md`) | Derives `myApps/writableApps` (`ScopeContext.tsx:53-76`); `scopedAppIds` persists `localStorage` per `userId` |
| Sidebar badges (13) | `GET /api/v1/inbox/items`, `.../incidents`, `.../problems`, `.../requests`, `.../changes`, `.../deployments`, `.../releases`, `.../availability/outages + sla-targets`, `.../testing/sign-offs`, `.../on-call/schedules`, `.../improvements` | various | `Sidebar.tsx:68-79` `useResource` | respective `*.read` | Client filters e.g. `urgentInboxCount = priority==='urgent'` |
| TopBar badges + user | `inboxService.items()` `notificationsService.list()` `usersService.current()` | `GET /api/v1/inbox/items`, `GET /api/v1/notifications`, `GET /api/v1/users/me` | `TopBar.tsx:26-28` `useResource` | `inbox.read` `notification.read` `user.read` (platform router `platform.ts:25`) | TopBar duplicate inbox fetch with Drawer; notifications triple fetch with dropdown — TODO dedup SWR |
| InboxDrawer | `GET /api/v1/inbox/items` | same | `InboxDrawer.tsx:17` `useResource` | `inbox.read` | Socket `inbox:item` joins `tenant:{tenantId}:inbox` (`server/realtime.ts:52,71`) not yet merged into Drawer |
| Notifications dropdown | `GET /api/v1/notifications` | same | `NotificationDropdown.tsx:16` `useResource` | `notification.read` | Filter `type mention/update/system` |
| Socket rooms | `tenant:{tenantId}` join via Socket.IO `sessionMiddleware` handshake | ws | `server/realtime.ts:52` `socket.join(room(tenantId,'inbox'))` + `emit inbox:item` | session cookie (`requireAuth`-mirrored) | Every emit `io.to(room(tenantId,…))` — no global broadcast (`docs/design/09-realtime.md`) |
| CmdK palette | No API — static 24-entry `ROUTES` | — | `CmdKPalette.tsx:18-44` | — | `keep in sync with src/routes/index.tsx` comment |

All REST via `apiFetch` (`src/services/core.ts:29-61`): base `VITE_API_PROXY_TARGET` (`vite.config.ts:29-31` `/api` proxy `http://localhost:3001`), tenant header implicit via cookie, `withScopedDb req.scoped` attaches `tenantId` (`server/middleware/scopedDb.ts:19`), `requireAuth` global gate (`server/app.ts:126`) ensures `req.tenantId/permissions` exist before any resource router — without it `tenantId=undefined` → Prisma no filter → cross-tenant leak (`docs/design/02-api-contract.md:13`). `ScopeViolationError` at `server/scope/errors.ts:9` mapped to `403 {error:'scope_violation'}` (`server/app.ts:144`). Never import `prisma` in routes (`AGENTS.md`, `eslint.config.js:19`).

### Route Map — Outlet children under AppShell

`routes/index.tsx:115-249` — all paths nested `AppShell` (file:line shown, not URL only):

| Path | Element | Layout pattern |
|------|---------|---------------|
| `/` | `Dashboard` `118` | `p-6` default (non-bleed) |
| `cmdb`, `cmdb/:ciId`, `cmdb/audit` | `CmdbShell`, `CMDBDetail`, `CMDBAudit` `120-122` | `CMDBDetail` 3-col `-m-6 calc(100vh-3.5rem)` |
| `monitoring` + `events/:id` | `MonitoringLayout` → `MonitoringOverview/EventStream/...` `124-131` | Module Layout `-m-6` bleed (`MonitoringLayout.tsx:26`) |
| `incidents`, `problems`, `kedb` | `IncidentQueue/Detail`, `ProblemList/Detail/RCA`, `KEDB` `133-140` | Lists `p-6` vs details `3-col` |
| `requests`, `portal` | `RequestQueue`, `PortalLayout→PortalHome/Catalog/MyRequests` `141-148` | `PortalLayout -m-6` (`PortalLayout.tsx:31`) |
| `kb` | `KBLayout→KBBrowse/Analytics/Editor` + `ArticleView` `149-155` | `KBLayout -m-6` (`KBLayout.tsx:27`) |
| `changes`, `releases`, `deployments`, `testing` | `ChangeCalendar/NewChange/Detail`, `ReleasesLayout`, `DeploymentsLayout`, `TestingLayout` `157-180` | Each `-m-6` Module Layout |
| `availability`, `capacity`, `continuity` | `AvailabilityLayout`, `CapacityLayout`, `ContinuityLayout` `182-196` | `-m-6` Module Layout |
| `dashboards`, `improvement`, `on-call`, `status` | `MeasurementLayout`, `ImprovementsLayout`, `OnCallLayout`, `StatusPage` `197-225` | Mixed `p-6` + `-m-6` |
| `admin`, `settings`, `profile`, `applications/catalog` | `AdminLayout`, `Settings`, `Profile`, `ApplicationCatalog` `228-243` | `AdminLayout -m-6` vs hubs `p-6` |
| `ai`, `ai/:sessionId` | `AiWorkspace` `247-248` | `isAiRoute` — outer `min-h-0 overflow-hidden` canvas |
| `*` | `NotFound` `245` | Inside shell — still shows Sidebar+TopBar |

Any new route must be a child of the `path:'/' element:<AppShell>` entry (`115-250`) to inherit chrome + `ScopeProvider` — adding at top level bypasses shell (intentional only for `/login`, `/change-password`).

---

## Design Preservation

Extracted from `src/components/layout/AppShell.tsx:11-102` + `src/components/layout/Sidebar.tsx:62-308` + `src/components/layout/TopBar.tsx:21-144` + `src/components/layout/InboxDrawer.tsx:15-121` + `src/index.css:7-59,116-122`:

1. **Root stays `flex h-screen w-full bg-ois-bg overflow-hidden`** (`AppShell.tsx:55`) — `h-screen` not `min-h-screen`, `overflow-hidden` not `auto`. Changing to `min-h-screen` creates double-outer-scroll with `<main overflow-y-auto>`. Pair with main column `flex flex-col flex-1 min-w-0 h-full overflow-hidden` (`64`).
2. **`ScopeProvider` wraps shell** (`54`) — must remain above `Sidebar` + `TopBar` + `Outlet` so `useScope()` / `AppScopeSwitcher` available everywhere (`docs/features/_shared/app-selector.md`). Don't move inside `<main>`.
3. **Shell state local none-persist** — `sidebarCollapsed useState false` (`12`), `inboxOpen false` (`13`), `aiPanelOpen false` (`14`), `cmdKOpen false` (`16`) all local. Terra persists some to `localStorage` — OIS deliberately not. Don't add `localStorage sidebarCollapsed` without design review (`audit/audit-global-shell.md`).
4. **Width via conditional `cn`** — `collapsed ? "w-16" : "w-[240px]"` (`Sidebar.tsx:115`) + `transition-all duration-300` (`114`). Don't replace with `data-collapsed` attribute or CSS variable without updating motion tests. Keep `w-16` (not `w-14`) — matches TopBar `h-14` square hamburger.
5. **`h-14` ↔ `calc(100vh - 3.5rem)` lock** — TopBar `h-14` (`TopBar.tsx:35`) contract consumed by 20+ Module Layout `-m-6 calc(100vh - 3.5rem)` bleed pages (`monitoring.md:24-33`). Change one without other breaks fullscreen dashboards (`audit/audit-global-shell.md G-2` verified).
6. **Stripe exact gradient + anim** — `linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)` (`AppShell.tsx:76`) + `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1) transform-origin:center` (`index.css:116-122`). Family continuity `docs/design-references/family-vercel.md:49`. Don't swap to `bg-ois-primary`.
7. **Main variants `isAiRoute` gate** — `isAiRoute ? 'flex-1 overflow-hidden flex min-h-0' : 'flex-1 overflow-y-auto p-6'` (`79`). AI workspace needs canvas `overflow-hidden`; default needs scroll + padding. Don't unify to single class without audit `AiWorkspace`.
8. **Overlay stacking order** — Sidebar `z-30`, TopBar `z-20`, Inbox `z-[100]/[101]`, AiPanel `z-[59]/[60]`, CmdK `z-50` — don't normalize to `z-50` everywhere; Inbox must stay above AiPanel but below modal `z-[60]` is intentional for TopBar breadcrumb `z-20` beneath sidebar. Changing TopBar to `z-30` covers collapsed sidebar dot badge ring (`Sidebar.tsx:371 ring-2 ring-ois-sidebar-bg`).
9. **Mount via `AnimatePresence`** — both `InboxDrawer` (`85-89`) + `AiQuickPanel` (`91-95`) conditional inside `AnimatePresence` so `exit` spring runs (`motion/react` only, not CSS `translate`). Don't switch to CSS toggle `hidden` — exit animation relies on presence.
10. **TopBar flat light header** — `bg-white border-b border-ois-border` flat (`TopBar.tsx:35`), not terra `bg-theme-bg/85 backdrop-blur-sm sticky`. OIS `shrink-0` pinned via flex column, not `sticky`. Don't add `backdrop-blur`.
11. **Icons `lucide-react` only** — Sidebar `size 18` nav + `size 11` mode toggle, TopBar `Menu 20 Inbox 20 Bell 20 Search 16 Sparkles 20 Layers 14`, CmdK `size 14`, `InBoxDrawer X 20 ExternalLink 14`. Default `strokeWidth 2` — don't mix `heroicons` or override `1.5` (`inbox-drawer.md` preservation §2).
12. **Light `ois-*` tokens lock** — `ois-sidebar-bg #F4F5F7 dimmed chrome` (`index.css:41`) vs `ois-surface #FFFFFF` content pop, `ois-sidebar-border #E4E7EC`, `ois-primary #1F4FD4`, `ois-primary-pale #EEF2FF`, `ois-danger #F04438`, `ois-info #0BA5EC`. No terra `data-theme` dark, no raw hex. Brand gradients hardcode `#185FA5→#0C447C` intentional brand treatment.
13. **Do / Don't summary:**

| Do | Don't |
|----|-------|
| Keep `flex h-screen overflow-hidden` root + `flex-col flex-1 min-w-0 h-full overflow-hidden` column | Change to `min-h-screen` / `overflow-auto` on root (creates double scroll) |
| Preserve `w-[240px]` → `w-16` via `cn` + `duration-300` | Switch to `data-collapsed width` without prop plumbing |
| Keep `h-14` ↔ `calc(100vh - 3.5rem)` coupled | Alter `h-14` alone — breaks bleed pages |
| Use `motion/react AnimatePresence` spring for overlays | CSS manual `translate-x` slide |
| Pass `onToggleSidebar / onOpenInbox / onToggleAi / aiOpen / showAi` as controlled props to TopBar | Duplicate `useState` inside `TopBar` |
| Inject AI session list via `<Outlet context={{ setAiSidebarContent }}>` | Prop-drill through `Sidebar` parent |
| `Cmd+K / Ctrl+K` global `keydown` toggle in AppShell | Scope shortcut to TopBar input `onFocus` only |
| Handle `auth:session-expired` with `pathname guard` + `replace {from, reason:'expired'}` | Add extra `navigate` inside TopBar/Sidebar |
| Keep search `w-72 lg:w-96 hidden md:block` decorative + real `CmdKPalette` `ROUTES` list | Wire TopBar search `onChange` without syncing CmdK list |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep spec — map `src/components/layout/AppShell.tsx:11-102` (ScopeProvider + flex h-screen w-full bg-ois-bg, Sidebar w-[240px]→w-16 z-30, main column flex flex-1 min-w-0, TopBar h-14 z-20 + stripe h-[2px] linear-gradient #1F4FD4→#0BA5EC ois-topbar-stripe + main p-6 vs min-h-0 isAiRoute + AnimatePresence InboxDrawer + AiQuickPanel + CmdKPalette + auth:session-expired + Cmd+K listener + Outlet context), `src/components/layout/Sidebar.tsx:62-308` (aside z-30 transition 300ms, 7 sections + Favorites, mode toggle motion layoutId, 13 badge hooks via useResource), `src/components/layout/TopBar.tsx:21-144` (h-14 shrink-0 z-20, Menu 20 hamburger collapse, breadcrumb useBreadcrumbs 54 LABELS, health pill xl, AppScopeSwitcher, search w-72/lg:w-96 kbd ⌘K, Inbox 20 urgent badge + Bell unread dot + Ai ghost Sparkles + Avatar UserMenu), `src/components/layout/InboxDrawer.tsx:15-121` (backdrop z-[100] blur-sm + drawer z-[101] max-w-[400px] shadow-ois-modal spring + FilterPill), `src/routes/index.tsx:106-253` (RequireAuth gate + AppShell mount + calc contract + 20 bleed layouts) + `src/index.css:7-59,116-122` ois-* tokens + audit session handler, cross-ref sidebar/topbar/inbox-drawer for consistency, terra delta Sidebar+AiAssistantPanel → Sidebar+TopBar+Outlet+InboxDrawer + light-only no data-theme | `src/components/layout/AppShell.tsx:11` · `src/components/layout/Sidebar.tsx:62` · `src/components/layout/TopBar.tsx:21` · `src/components/layout/InboxDrawer.tsx:15` · `src/routes/index.tsx:106` · `src/index.css:7` · `docs/ui/sidebar.md` · `docs/ui/topbar.md` · `docs/ui/inbox-drawer.md` · `docs/ui/audit/audit-global-shell.md` |

