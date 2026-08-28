# TopBar

Status: **Stable**
Source of truth: [`src/components/layout/TopBar.tsx`](../../src/components/layout/TopBar.tsx), [`src/components/layout/AppShell.tsx`](../../src/components/layout/AppShell.tsx), [`src/lib/breadcrumbs.ts`](../../src/lib/breadcrumbs.ts), [`src/index.css`](../../src/index.css), [`src/components/scope/AppScopeSwitcher.tsx`](../../src/components/scope/AppScopeSwitcher.tsx)

---

## Purpose

Global header untuk semua halaman terautentikasi. Render di `AppShell` di atas `<Outlet>` (bukan di route). Memiliki 2 zona: **kiri** — hamburger + breadcrumb, **kanan** — health pill + `AppScopeSwitcher` + search + inbox + notifications + AI ghost + avatar. Tinggi fixed `h-14` (`56px`), pinned `shrink-0` dengan border bawah + subtle shadow. Di bawahnya `AppShell` merender `ois-topbar-stripe` `h-[2px]` gradient `#1F4FD4 → #0BA5EC` sebagai accent line (family/linear continuity).

Berbeda dengan `terra` TopBar (terra `h-9` sticky + `bg-theme-bg/85 backdrop-blur` + `IconChip` tier-2) — OIS flat `bg-white` (`bg-ois-surface #FFFFFF`) tanpa blur, breadcrumb inline `text-xs`, dan search visible `w-72 lg:w-96` + `⌘K` chip (bukan Cmd-K only).

---

## Anatomy

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar  h-14  bg-white  border-b border-ois-border  z-20  shadow 0 1px 2px -1px    │
│ ┌──────────────────────┐  ┌──────────────────────────────────────────────────────┐  │
│ │ Left  gap-3          │  │ Right  gap-2  ml-auto                                │  │
│ │ [≡ Menu 20]          │  │ [● ALL SYSTEMS OPERATIONAL] hidden xl:flex            │  │
│ │ Home / Crumb / Last  │  │ [Scope: All my apps ▾]  AppScopeSwitcher              │  │
│ │ text-xs font-medium  │  │ [🔍 Search across OIS...          ⌘K] w-72|lg:w-96  │  │
│ │                      │  │ [Inbox 20 + urgent badge]                             │  │
│ │                      │  │ [Bell 20 + unread dot]  → NotificationDropdown        │  │
│ │                      │  │ [Sparkles 20 — AI ghost, conditional]                 │  │
│ │                      │  │ [Avatar sm h-8] → UserMenu                            │  │
│ └──────────────────────┘  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
  ois-topbar-stripe  h-[2px]  w-full  shrink-0  linear-gradient(90deg, #1F4FD4 → #0BA5EC)
  animation ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1)  transform-origin:center  (AppShell.tsx:73-77)
```

### DOM — exact container

`TopBar.tsx:34-36`:

```tsx
<header
  className="h-14 flex items-center px-4 bg-white border-b border-ois-border shrink-0 z-20"
  style={{ boxShadow: '0 1px 2px -1px rgba(16,24,40,0.06)' }}
>
```

- `h-14` = `56px = 3.5rem` — acuan untuk `calc(100vh - 3.5rem)` di Module Layout / entity detail pages (`docs/DESIGN-SYSTEM.md` §3-Column).
- `bg-white` (`bg-ois-surface #FFFFFF`), `border-ois-border #E4E7EC`, `px-4`, `z-20` (di bawah dropdown `z-50` tapi di atas `<main>`).
- Shadow inline — bukan `shadow-ois-card` (`0 1px 2px rgba(16,24,40,0.04)`). Sedikit lebih gelap `0.06`.
- Tidak ada `sticky` — pinned via `AppShell` flex layout (`flex-col flex-1 min-w-0 h-full overflow-hidden` + `flex h-screen overflow-hidden`). Scroll terjadi di `<main> flex-1 overflow-y-auto p-6`, TopBar `shrink-0`.

### Stripe

`AppShell.tsx:73-77` (langsung setelah `<TopBar />`):

```tsx
<div aria-hidden className="ois-topbar-stripe h-[2px] w-full shrink-0"
     style={{ background: 'linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)' }} />
```

- `ois-topbar-stripe` anim `0.4s cubic-bezier(0.2,0,0,1)` scaleX 0→1 (`src/index.css:116-119,122`).
- Family continuity: login dark radial → stripe (lihat `docs/design-references/family-vercel.md:49`).
- `aria-hidden` — dekoratif, bukan landmark.

---

### Left — hamburger + breadcrumb

**Hamburger** `TopBar.tsx:40-42`:

```tsx
<Button variant="ghost" size="icon" onClick={onToggleSidebar}
  className="text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted">
  <Menu size={20} />
</Button>
```

- `Button` ghost `bg-transparent text-ois-text hover:bg-ois-surface-muted` (`src/components/ui/Button.tsx:15`) + `size icon h-9 w-9 p-0 flex items-center justify-center` (`:24`) + `rounded-ois-btn 6px`.
- Callback `onToggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed)` di `AppShell.tsx:66` — local `useState(false)` tidak persist (beda terra `localStorage 180px`, lihat `audit/audit-global-shell.md:22`).

**Breadcrumb** `TopBar.tsx:43-57` + `src/lib/breadcrumbs.ts:105-136`:

```tsx
<nav className="flex items-center gap-1 text-xs font-medium">
  <Link to="/" className="text-ois-text-subtle hover:text-ois-text transition-colors">Home</Link>
  {breadcrumbs.map((crumb,i) => (
    <React.Fragment key={i}>
      <span className="text-ois-text-subtle px-0.5">/</span>
      {crumb.href ? <Link to={crumb.href} className="text-ois-text-muted hover:text-ois-text transition-colors">{crumb.label}</Link>
                  : <span className="text-ois-text">{crumb.label}</span>}
    </React.Fragment>
  ))}
</nav>
```

- Font `text-xs 12px font-medium`, separator `/` `text-ois-text-subtle #98A2B3 px-0.5`.
- Last crumb tanpa `href` → `text-ois-text #101828` (active). Intermediate `text-ois-text-muted #475467 hover:text-ois-text`.
- `Home` selalu link `to="/"`, style `text-ois-text-subtle` (lebih pucat dari intermediate — hierarchy dua tingkat).
- Source `useBreadcrumbs()` `src/lib/breadcrumbs.ts:105`:
  - `useLocation().pathname` split `/` + `LABELS` map 54 entries (`cmdb→CMDB`, `events→Event Stream`, … `ai→AI Workspace` — `breadcrumbs.ts:5-69`).
  - `IMPLICIT_PARENTS` (`events→Monitoring /monitoring/rules`, `kedb→Problems /problems`, `on-call→Platform /on-call` — `:72-76`) inject parent sebelum segment 0.
  - `ID_LABELS` untuk ID-like last segment (`cmdb→CI Detail`, `incidents→Incident Detail`, … `ai→Session` — `:79-93`).
  - `looksLikeId()` `:95-103` detect UUID `/^[0-9a-f]{8}-[0-9a-f]{4}/i`, numeric `/^\d+$/`, `INC-123` `/^[A-Z]+-\d+$/`, atau long non-slug `>8 && !/^[a-z-]+$/`.
  - `href` akumulatif `/${seg}`, last `href: undefined` (no link). Unknown segment fallback `label = seg` raw.

---

### Right — cluster `flex items-center gap-2 ml-auto` `TopBar.tsx:61`

#### 1. Health pill — `TopBar.tsx:62-73`

```tsx
<div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full border border-ois-border bg-ois-surface-muted mr-1" title="Platform health">
  <span className="relative inline-flex h-1.5 w-1.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ois-success opacity-60" />
    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ois-success" />
  </span>
  <span className="font-mono text-[10px] tracking-[0.16em] text-ois-text-muted">ALL SYSTEMS OPERATIONAL</span>
</div>
```

- `hidden xl:flex` — muncul ≥1280px saja. `mr-1` gap ke `AppScopeSwitcher`.
- `rounded-full border-ois-border bg-ois-surface-muted #F1F3F7`, `px-2.5 py-1`, `gap-2`.
- Dot `h-1.5 w-1.5` `bg-ois-success #12B76A` + `animate-ping opacity-60` pulse.
- Label `font-mono Geist Mono 10px tracking-[0.16em] text-ois-text-muted #475467`.
- Static `ALL SYSTEMS OPERATIONAL` — bukan live status (no API). Placeholder untuk future `statusService`.

#### 2. AppScopeSwitcher — `TopBar.tsx:74` (`src/components/scope/AppScopeSwitcher.tsx:46-203`)

- Trigger `h-9 px-3 rounded-md border text-xs font-medium hover:bg-ois-bg` + `Layers 14` + `Scope: <label>` + `ChevronDown 14 rotate-180 when open` (`AppScopeSwitcher.tsx:91-105`).
- `chipClass` dari `CRITICALITY_CLASSES` (`P1 red-50/red-700/border-red-200` … `P4 emerald`, default `bg-ois-surface-muted border-ois-border` — `:7-12,85-88`).
- Dropdown `w-72 bg-white rounded-lg shadow-lg border border-ois-border z-50` (`:108`), search hanya `myApps.length >10` (`:110`), button `All my apps` sticky top (`:129-141`), section `Pinned` + `All apps` via `AppRow` (`:145-186`), empty `Browse catalog` (`:189-197`).
- Feature flag guard `useScopeUiEnabled()` early return null setelah hooks (`:47,62-72`).
- Scope value `ScopeValue = 'all' | {kind:'app',appId}` via `ScopeContext` (`ScopeProvider` di `AppShell.tsx:54`).
- Detail lengkap lihat `docs/features/_shared/app-selector.md`.

#### 3. Search field — `TopBar.tsx:75-87`

```tsx
<div className="relative mr-4 hidden md:block w-72 lg:w-96">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none">
    <SearchIcon size={16} />
  </div>
  <input type="text" placeholder="Search across OIS..."
    className="w-full h-9 pl-10 pr-12 bg-ois-surface-muted rounded-ois-btn border border-ois-border text-ois-text placeholder:text-ois-text-subtle focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/15 text-sm transition-all" />
  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
    <kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-white text-[10px] font-medium text-ois-text-muted font-mono">⌘K</kbd>
  </div>
</div>
```

- `hidden md:block` (≥768px), `w-72` (896px) → `lg:w-96` (1024px+), `h-9`, `mr-4` gap ke Inbox.
- Icon `lucide Search 16` `left-3 -translate-y-1/2 text-ois-text-subtle #98A2B3 pointer-events-none`.
- Input `pl-10 pr-12 bg-ois-surface-muted #F1F3F7 rounded-ois-btn 6px border-ois-border #E4E7EC text-ois-text #101828 placeholder:text-ois-text-subtle text-sm transition-all`.
- Focus: `focus:bg-white focus:border-ois-primary #1F4FD4 focus:ring-2 focus:ring-ois-primary/15` (15% opacity ring).
- `kbd` chip `⌘K` `px-1.5 py-0.5 rounded border-ois-border bg-white text-[10px] font-medium text-ois-text-muted font-mono` di `right-3`.
- **Currently decorative** — input tidak wired ke `onChange` / submit. Global search nyata adalah `CmdKPalette` (`src/components/ui/CmdKPalette.tsx`) yang di-trigger `Cmd+K` / `Ctrl+K` di `AppShell.tsx:41-51` (bukan submit field). Placeholder `Search across OIS...` intent placeholder untuk future scope-aware search (`field:value` search — lihat `docs/features/_backlog.md`).

#### 4. Inbox — `TopBar.tsx:89-98`

```tsx
<div className="relative">
  <Button variant="ghost" size="icon" onClick={onOpenInbox} className="text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative">
    <Inbox size={20} />
    {urgentInboxCount > 0 && (
      <span className="absolute top-1 right-1 w-4 h-4 bg-ois-danger text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
        {urgentInboxCount}
      </span>
    )}
  </Button>
</div>
```

- `ghost icon` `text-ois-text-muted hover:text-ois-text`.
- Badge hanya jika `urgentInboxCount >0` (`TopBar.tsx:30: filter priority==='urgent'`), `w-4 h-4 bg-ois-danger #F04438 text-white 9px font-bold rounded-full border-2 border-white` di `top-1 right-1`. Angka tunggal `1..9`, double-digit possible (no `9+` clamp sekarang).
- `onOpenInbox: () => setInboxOpen(true)` di `AppShell.tsx:67` — mount `InboxDrawer` via `AnimatePresence` (`AppShell.tsx:85-89`).
- Tidak ada unread dot generic — khusus urgent.

#### 5. Notifications — `TopBar.tsx:100-115`

```tsx
<div className="relative">
  <Button variant="ghost" size="icon"
    onClick={() => setShowNotifications(!showNotifications)}
    className={cn("text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative",
                   showNotifications && "bg-ois-surface-muted text-ois-text")}>
    <Bell size={20} />
    {unreadNotifCount > 0 && (
      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-ois-primary border-2 border-white rounded-full" />
    )}
  </Button>
  {showNotifications && <NotificationDropdown onClose={() => setShowNotifications(false)} />}
</div>
```

- Active state saat dropdown open: `bg-ois-surface-muted text-ois-text` (`cn` conditional `TopBar.tsx:105`).
- Unread badge: dot `w-2.5 h-2.5 bg-ois-primary #1F4FD4 border-2 border-white rounded-full` (bukan angka), `unreadNotifCount = filter !readAt` (`TopBar.tsx:31`).
- `NotificationDropdown` `absolute right-0 mt-2 w-80 sm:w-[380px] bg-white border border-ois-border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 flex flex-col max-h-[500px]` (`NotificationDropdown.tsx:29`) — header `Notifications + Mark all as read` + 3 `Tab` (`All/Unread/Mentions` `flex-1 py-2 border-b-2`) + `divide-y` scroll list + footer `View all notifications → /notifications`. Icon mapping `mention→MessageSquare bg-ois-info-pale`, `update→Check bg-ois-success-pale`, `system→Settings bg-ois-surface-muted`, else `Info bg-ois-warning-pale`. Portal via `onMouseLeave={onClose}` (`:30`).
- `useResource(() => notificationsService.list(), [])` (`TopBar.tsx:27`) — note triple fetch bersama `NotificationDropdown` + feed page (`docs/features/notifications.md:82,215`).

#### 6. AI Quick Assist — `TopBar.tsx:117-133`

```tsx
{showAi && onToggleAi && (
  <div className="relative group">
    <Button variant="ghost" size="icon" onClick={onToggleAi}
      aria-label="AI Quick Assist" aria-expanded={aiOpen}
      className={cn("text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted relative",
                     aiOpen && "bg-ois-primary-pale text-ois-primary")}>
      <Sparkles size={20} />
    </Button>
    <div className="absolute top-full right-0 mt-1.5 px-2.5 py-1.5 bg-ois-text text-white rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
      AI Quick Assist
    </div>
  </div>
)}
```

- Conditional `showAi && onToggleAi` — `AppShell.tsx:70: showAi={!isAiRoute}` (`isAiRoute = pathname.startsWith('/ai')` `:20`). Hidden di `/ai` workspace.
- Ghost `Sparkles 20` active `bg-ois-primary-pale #EEF2FF text-ois-primary #1F4FD4` saat `aiOpen`.
- Tooltip `bg-ois-text #101828 text-white rounded-md 11px whitespace-nowrap absolute top-full right-0 mt-1.5 px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg`.
- `aria-label` + `aria-expanded` untuk a11y.
- Toggle `onToggleAi: () => setAiPanelOpen(v => !v)` di `AppShell.tsx:68` — mount `AiQuickPanel` via `AnimatePresence` hanya jika `aiPanelOpen && !isAiRoute` (`:91-94`).

#### 7. Avatar + UserMenu — `TopBar.tsx:135-140`

```tsx
<div className="relative ml-2">
  <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 focus:outline-none">
    <Avatar name={currentUser?.name ?? ''} size="sm" />
  </button>
  {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
</div>
```

- `ml-2` gap ke bell/AI cluster. Button `focus:outline-none`, avatar `size sm h-8 w-8 text-xs bg-ois-primary-pale text-ois-primary font-medium rounded-full border border-ois-border` (`src/components/ui/Avatar.tsx:29`).
- `UserMenu` `absolute right-0 mt-2 w-64 bg-white border border-ois-border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 py-1` (`UserMenu.tsx:27`) — header `name font-bold + email xs text-ois-text-subtle + role chip bg-ois-primary-pale text-ois-primary uppercase 10px font-bold + team •` (`:30-42`) + items `Profile / App Catalog / Preferences / Settings / Toggle theme MOCK` + `h-px bg-ois-border my-1` + `Sign out text-ois-danger hover:bg-red-50` (`:44-52`). `onMouseLeave={onClose}` (`:28`).

---

## Behavior

### Toggle sidebar

- `AppShell` local `sidebarCollapsed boolean` `useState(false)` (`AppShell.tsx:12`). Hamburger click → `setSidebarCollapsed(!collapsed)`.
- Tidak persist — refresh kembali expanded 240px. Audit low `audit/audit-global-shell.md:22`. Jika persist, harus `localStorage ois.sidebar.collapsed` seperti terra.

### Inbox

- Click `Inbox 20` → `AppShell inboxOpen true` → `InboxDrawer` slide-over `AnimatePresence` (`motion`).
- `InboxDrawer` independen `useResource inboxService.items()` — tidak share store dengan `/inbox` page.
- Badge count derived local `filter priority==='urgent'` — realtime update tergantung refetch interval / socket (belum Socket.IO untuk inbox count, hanya `tenant:tenantId` room di `server/realtime.ts`).

### Notifications

- Click `Bell 20` toggle `showNotifications` boolean local (`useState(false)` — `TopBar.tsx:22`). Tidak ada outside-click handler — hanya `NotificationDropdown onMouseLeave={onClose}` (`NotificationDropdown.tsx:30`). Artinya klik luar tanpa hover keluar tidak close (gap vs spec usual `mousedown` outside).
- `Mark all as read` button di dropdown header saat ini dekoratif (no `onClick` handler — `NotificationDropdown.tsx:34-36` `Button ghost` tanpa `onClick`).
- `Tab` click `setFilter('all'|'unread'|'mentions')` local filter.

### AI Quick Panel

- Ghost `Sparkles` toggle `aiPanelOpen`. Closed by `AiQuickPanel` backdrop `motion.div bg-black/20 z-[59] onClick={onClose}` (`AiQuickPanel.tsx:176-182`) + `X 14` button (`:207-214`) + navigate away.
- Panel `fixed right-0 top-0 h-full w-[320px] z-[60] bg-ois-surface border-l border-ois-border flex flex-col motion x 100%→0` (`:185-190`).

### Cmd+K palette

- Global `keydown` listener di `AppShell.tsx:41-51`: `(metaKey || ctrlKey) && k === 'k' → preventDefault + toggle cmdKOpen`.
- `CmdKPalette` `fixed inset-0 z-50 pt-[12vh] bg-black/30 backdrop` (`CmdKPalette.tsx:102-111`) — list 24 routes dari `CmdKPalette.tsx:18-44` (`keep in sync with src/routes/index.tsx`).
- TopBar search input `kbd ⌘K` chip purely hint — bukan button. Actual palette mount via `AppShell` shortcut, not via field focus.

### Avatar menu

- Click `Avatar sm` toggle `showUserMenu` (`useState(false)`). Close via `UserMenu onMouseLeave`.
- `Profile → /profile`, `App Catalog → /applications/catalog`, `Preferences → /notifications/preferences`, `Settings → /settings`, `Sign out → /login` (`navigate` tanpa `POST /auth/logout` — lihat `UserMenu.tsx:21-23`).

---

## States

| State | Visual | Source |
|-------|--------|--------|
| Default | Breadcrumb `Home / Module / Detail`, right cluster as above | — |
| Focus search | `bg-white border-ois-primary ring-2 ring-ois-primary/15` | `focus:` in TopBar.tsx:82 |
| Urgent inbox 0 | No badge | `urgentInboxCount === 0` |
| Urgent inbox >0 | Red pill `w-4 h-4 #F04438 9px bold border-white` dengan angka | `TopBar.tsx:92-95` |
| Unread notifications 0 | No dot | `unreadNotifCount === 0` |
| Unread notifications >0 | Blue dot `w-2.5 h-2.5 #1F4FD4 border-white` | `TopBar.tsx:108-110` |
| Notifications open | Bell `bg-ois-surface-muted text-ois-text` + dropdown `max-h-[500px]` | `showNotifications` |
| AI closed | Ghost `text-muted` | `!aiOpen` |
| AI open | `bg-ois-primary-pale text-ois-primary` | `aiOpen && cn` |
| AI hidden | Tidak render (di `/ai`) | `showAi=false` when `isAiRoute` |
| Health pill | Hidden `<xl`, visible `xl:flex` | `hidden xl:flex` |
| Search | Hidden `<md`, `w-72` md, `w-96` lg | `hidden md:block w-72 lg:w-96` |
| Scope loading | Empty `myApps []` → empty state `Browse catalog` | `AppScopeSwitcher.tsx:189` |

### Responsive

- `<768px` (md): search hidden, hanya hamburger + breadcrumb truncated + inbox/bell/avatar. Breadcrumb tetap flex tapi bisa overflow — no truncation clamp dedicated (lihat Edge Cases).
- `<1280px` (xl): health pill hidden.
- `Dropdown` `w-80 sm:w-[380px]` — sm 640px+ jadi 380px.

---

## Edge Cases

| # | Case | Current handling | Fix / TODO |
|---|------|------------------|------------|
| 1 | `/` root — `pathname === '/'` → `useBreadcrumbs() return []` (`breadcrumbs.ts:108`) | Hanya `Home` link shown | OK |
| 2 | Unknown segment `LABELS[seg] ?? seg` raw | Ditampilkan apa adanya (misal `/foo/bar` → `foo/bar`) | OK — no 404 for breadcrumb |
| 3 | Dynamic ID `/incidents/INC-123` atau UUID | `looksLikeId` → label `Incident Detail` via `ID_LABELS[prevSeg]` | OK |
| 4 | ID tapi `prevSeg` tidak di `ID_LABELS` (misal `/custom/550e8400-...`) | Fallback `label = seg` raw UUID terlihat | Acceptable — better than blank |
| 5 | Long breadcrumb chain (`/monitoring/events/:id/audit` → Monitoring / Event Stream / Event Detail / Audit) | Flex row tanpa `truncate`/`overflow-hidden` — bisa wrap atau overflow di narrow | Consider `min-w-0 truncate` on last crumb |
| 6 | Search input no `value` / `onChange` | Tidak submit, dekoratif — CmdK palette yang kerja | Intentional; document as visible + palette duo (`design-references/README.md:46`) |
| 7 | `currentUser` masih `undefined` (loading) | `Avatar name=''` → initials `''` kosong, `UserMenu` `name ?? ''` | Renders empty avatar `bg-ois-primary-pale` blank — consider skeleton |
| 8 | `inboxItems` / `notifications` `undefined` before fetch | `data ?? []` → count 0, no badge/dot | OK — `useResource` pattern |
| 9 | `inboxItems.length === 0` + `notifications.length === 0` | No badges, dropdown shows `No notifications found` + `Bell 32 opacity-20` | OK |
| 10 | `myApps.length === 0` | `AppScopeSwitcher` empty `You're not a member... Browse catalog` | OK |
| 11 | Double fetch notifications | `TopBar` + `NotificationDropdown` + feed page each `useResource list()` → 3× `GET /notifications` per mount (`notifications.md:215,345` TODO deduplicate via `useNotifications()` SWR) | Known issue — not TopBar-only |
| 12 | Dropdown `onMouseLeave` close race | Mouse cepat keluar-masuk bisa flicker; klik luar tanpa moving over dropdown tidak close | Consider `mousedown` outside handler seperti `AppScopeSwitcher` |
| 13 | `Mark all as read` no handler | Button no `onClick` — dead | Wire ke `notificationsService.markAllRead()` bila endpoint ada |
| 14 | `Sign out` hanya `navigate('/login')` | Tidak clear session / `POST /auth/logout` | Auth middleware `requireAuth` + `auth:session-expired` listener di `AppShell` akan redirect anyway; but proper logout should invalidate cookie |

---

## API / Data Touchpoints

| Concern | Call | Where | Method / Endpoint | Notes |
|---------|------|-------|-------------------|-------|
| Inbox badge | `inboxService.items()` → `GET /api/v1/inbox/items` | `TopBar.tsx:26` `useResource` | Filter `priority==='urgent'` client-side | Same fetch di `InboxDrawer` independen, no cache share |
| Notifications badge | `notificationsService.list()` → `GET /api/v1/notifications` | `TopBar.tsx:27` `useResource` | Filter `!readAt` client-side | Triple fetch dengan `NotificationDropdown` + `/notifications` page — TODO dedup |
| Current user | `usersService.current()` → `GET /api/v1/users/me` | `TopBar.tsx:28` `useResource` | For `Avatar` initials + `UserMenu` header | `usersService.current()` via `platformServices.ts:84-88` → `apiFetch('/users/me')` |
| Breadcrumbs | No API — pure client `useLocation().pathname` + `LABELS`/`ID_LABELS` | `breadcrumbs.ts:105` | — | Derivasi synchronous |
| Scope apps | `ScopeContext myApps` → `GET /api/v1/applications?my=true` (via `ScopeProvider`) | `AppScopeSwitcher.tsx:48` `useScope()` | Catalog `isMember`/`myRole` | Feature flagged `localStorage feature.app_scope_ui` |
| CmdK palette | No API — static 24-entry `ROUTES` | `CmdKPalette.tsx:18-44` | `navigate(path)` on select | Keep in sync with `src/routes/index.tsx` |
| Auth guard | `apiFetch` 401 → `window.dispatchEvent('auth:session-expired')` → `AppShell` listener navigate `/login` `state:{from, reason:'expired'}` | `AppShell.tsx:27-39` | Global | Not TopBar direct but surrounds it |

`src/services/*` semua via `apiFetch` (lihat `src/services/core.ts`) — no mock fallback.

Scope helpers:
- `useScopeUiEnabled()` — `localStorage feature.app_scope_ui` / `VITE_FEATURE_APP_SCOPE_UI`.
- `useBreadcrumbs()` — no params, read `useLocation`.

---

## Design Preservation

1. **Light palette only** (`--color-ois-*` — `src/index.css:8-48`). TopBar `bg-white bg-ois-surface #FFFFFF`, `border-ois-border #E4E7EC`, `text-ois-text #101828 / muted #475467 / subtle #98A2B3`. Jangan ganti ke terra monochrome dark (`bg-theme-bg`, `linear-card`) atau hardcode hex.
2. **Token-driven** — selalu `ois-primary #1F4FD4` (bell unread dot, ring focus, AI active), `ois-success #12B76A` (health dot), `ois-danger #F04438` (urgent badge), `ois-surface-muted #F1F3F7` (search bg, hover), `ois-primary-pale #EEF2FF` (AI active bg, avatar bg). Referensi `docs/ui/design-tokens.md`.
3. **Exact sizing** — `h-14` (`56px`), `Button size icon h-9 w-9`, `rounded-ois-btn 6px`, `rounded-ois-card 8px`, `rounded-full` health+avatar+badges, `h-[2px]` stripe. Jangan ubah ke `h-12` atau `rounded-lg` arbitrary.
4. **Icons `lucide-react` only** — `Menu 20`, `Search 16`, `Inbox 20`, `Bell 20`, `Sparkles 20`, `ChevronDown 14`, `Layers 14`, `Pin 12`. Size mapping dari `design-tokens.md` §5 (`16` header, `20` TopBar actions, `14` chips/palette). Dilarang mix heroicons/phosphor.
5. **Shadow scale** — TopBar shadow inline `0 1px 2px -1px rgba(16,24,40,0.06)` (bukan `shadow-ois-card`), dropdown `shadow-ois-dropdown` (`0 12px 16px -4px ...`), badge `border-2 border-white` overlay hygiene. Jangan pakai `shadow-lg` arbitrary.
6. **Font** — breadcrumb `text-xs font-medium`, health `font-mono 10px tracking-[0.16em]`, search `text-sm`, kbd `font-mono 10px font-medium`, badges `9px font-bold`. Families `Plus Jakarta Sans/Inter` sans + `Geist Mono/JetBrains Mono` mono (`@theme --font-sans/--font-mono`).
7. **Stripe animation** — `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1)` scaleX, `transform-origin:center`. Jangan ganti easing atau override `background` gradient tanpa cek `family-vercel.md:49` continuity spec.
8. **Flat header, no terra blur** — OIS `bg-white border-b` flat, bukan `sticky bg-theme-bg/85 backdrop-blur-sm` terra. Jika sticky diperlukan di masa depan, maksimal `thead sticky top-0 z-10` di table (lihat `docs/features/_shared/list.md:216`), bukan TopBar `sticky`.
9. **Visible search + palette duo** — jangan hide visible field jadi Cmd-K only (lihat `design-references/README.md:31,46`). Visible field is dekoratif hint; palette is real verb-bar.
10. **AppScopeSwitcher placement** — `AppScopeSwitcher` selalu kiri dari search (`TopBar.tsx:74` sebelum `mr-4` search). Jangan pindah ke avatar cluster.
11. **Dropdown hygiene** — `absolute right-0 mt-2 z-50 rounded-ois-card border border-ois-border bg-white max-h` pattern untuk notifications + avatar konsisten (`NotificationDropdown` 80/380px + `UserMenu` 64). Jangan pakai `rounded-2xl` atau `z-10` berbeda.
12. **Motion only for overlays** — TopBar sendiri tidak pakai `motion/react`; anim hanya stripe CSS + dropdowns via mount. Drawer/panel pakai `motion` (AppShell `AnimatePresence` + `AiQuickPanel motion`). Jangan animasi `header` entry.
13. **State via AppShell** — `sidebarCollapsed`, `inboxOpen`, `aiPanelOpen`, `cmdKOpen` semua local di `AppShell`. TopBar stateless controlled via props `onToggleSidebar / onOpenInbox / onToggleAi / aiOpen / showAi` (`TopBar.tsx:13-19`). Jangan lift atau duplicate state di TopBar.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep spec — extract `TopBar.tsx:34-144` container `h-14 bg-white border-ois-border shadow inline`, left `Menu 20 ghost` + breadcrumb `nav text-xs` via `useBreadcrumbs()` (`LABELS 54 + IMPLICIT_PARENTS + ID_LABELS + looksLikeId` — `breadcrumbs.ts:5-136`), right cluster `health pill hidden xl:flex ping #12B76A + AppScopeSwitcher + search w-72/lg:w-96 bg-ois-surface-muted rounded-ois-btn focus:ring-ois-primary/15 + kbd ⌘K + Inbox 20 urgent badge #F04438 9px + Bell 20 unread dot #1F4FD4 + AiQuickPanel ghost Sparkles 20 active bg-ois-primary-pale + Avatar sm bg-ois-primary-pale`, stripe `AppShell.tsx:73-77 h-[2px] linear-gradient #1F4FD4→#0BA5EC ois-topbar-stripe 0.4s`, behaviors `onToggleSidebar local !collapsed / onOpenInbox → InboxDrawer / notifications toggle onMouseLeave / aiPanel motion z-60 + CmdK palette AppShell 41-51 (metaK)` + states table + edge cases 14 + API `inboxService/items + notificationsService/list + usersService/current` via `useResource`, preservation 13 rules (`ois-*` tokens light-only, lucide only, flat header vs terra blur, visible+palette duo) | `src/components/layout/TopBar.tsx:1-144` · `src/components/layout/AppShell.tsx:1-102` · `src/lib/breadcrumbs.ts:1-136` · `src/components/scope/AppScopeSwitcher.tsx:46-203` · `src/index.css:1-59,116-122` · `src/components/ui/Button.tsx:10-49` · `src/components/ui/Avatar.tsx:11-37` · `src/components/layout/NotificationDropdown.tsx:13-125` · `src/components/layout/UserMenu.tsx:16-69` · `src/components/ui/CmdKPalette.tsx:18-157` · `docs/ui/design-tokens.md` · `docs/ui/README.md` · `docs/design/08-design-system.md:59-61` · `docs/design-references/linear.md:68` · `docs/design-references/family-vercel.md:49` |

