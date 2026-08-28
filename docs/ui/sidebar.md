# Sidebar

Status: **Stable**
Source of truth: [`src/components/layout/Sidebar.tsx`](../../src/components/layout/Sidebar.tsx), [`src/components/layout/AppShell.tsx`](../../src/components/layout/AppShell.tsx), [`src/components/layout/SidebarContextMenu.tsx`](../../src/components/layout/SidebarContextMenu.tsx), [`src/lib/sidebar-pins.ts`](../../src/lib/sidebar-pins.ts), [`src/index.css`](../../src/index.css) `@theme`

> Cross-ref token hex → [`design-tokens.md`](./design-tokens.md). Semua warna/radius/shadow harus pakai `ois-*` — jangan hardcode hex.

---

## Used by?

`AppShell` (`src/components/layout/AppShell.tsx:57`) — satu-satunya consumer. Render sebagai flex sibling dari main content area:

```tsx
<div className="flex h-screen w-full bg-ois-bg overflow-hidden">
  <Sidebar collapsed={sidebarCollapsed} isAiRoute={isAiRoute} aiSidebarContent={aiSidebarContent} />
  <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden"> {/* TopBar + <Outlet> */} </div>
</div>
```

Tidak dipakai standalone. Mount selalu di dalam `ScopeProvider` + `Router`.

---

## Purpose

Primary navigation chrome untuk OIS. Menangani:

1. Brand header + **mode toggle** Management ↔ AI Workspace.
2. **7 section groups** + Favorites (pinned) + footer (RBAC-gated Admin, Settings).
3. **Collapse** ke icon-only (`w-16`) untuk maximize content area.
4. **Live badge counts** per item (urgent/warning dot + numeric badge).
5. **Favorites pin** via right-click context menu (persist ke `localStorage`).
6. **AI route switching** — ketika `location.pathname.startsWith('/ai')`, management nav diganti `aiSidebarContent` (session list) dengan crossfade.

Berbeda dengan terra: OIS light chrome (`ois-sidebar-bg #F4F5F7`, `border-ois-sidebar-border`), tidak ada `data-theme` dark toggle.

---

## Anatomy

### 0. Shell — `<aside>`

| Prop | Value |
|------|-------|
| Tag | `aside` |
| Classes | `flex flex-col bg-ois-sidebar-bg border-r border-ois-sidebar-border transition-all duration-300 z-30` |
| Width | `w-[240px]` expanded, `w-16` collapsed — via `cn(collapsed ? "w-16" : "w-[240px]")` di `Sidebar.tsx:113` |
| Tokens | `--color-ois-sidebar-bg: #F4F5F7`, `--color-ois-sidebar-border: #E4E7EC` |
| Transition | `transition-all duration-300` (width + bg) |

### 1. Header — Brand + Mode Toggle

Container: `shrink-0 border-b border-ois-sidebar-border overflow-hidden` (`Sidebar.tsx:119`).

#### Brand row

```tsx
<div className="h-14 flex items-center px-4 gap-3">
  <div className="w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0 relative overflow-hidden"
       style={{ background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 60%, #0C447C 100%)',
                boxShadow: '0 1px 4px rgba(31,79,212,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }} />
    <span className="relative text-white font-black text-[11px] tracking-tight">OIS</span>
  </div>
  <div className="flex flex-col overflow-hidden"> {/* hidden when collapsed */}
    <span className="font-bold text-[13px] text-ois-text tracking-tight leading-none truncate">Omni</span>
    <span className="font-mono text-[10px] text-ois-text-subtle tracking-[0.12em] uppercase leading-none mt-0.5">Intelligence Suite</span>
  </div>
</div>
```

| Element | Class / Style |
|---------|---------------|
| Badge | `w-8 h-8 rounded-[7px]` gradient `#1F4FD4→#185FA5→#0C447C`, highlight `rgba(255,255,255,0.12)`, inset `rgba(255,255,255,0.15)` |
| Title | `font-bold text-[13px] text-ois-text tracking-tight leading-none` |
| Subtitle | `font-mono text-[10px] text-ois-text-subtle tracking-[0.12em] uppercase leading-none mt-0.5` |

#### Mode toggle — hanya ketika `!collapsed`

```tsx
<div className="px-3 pb-3">
  <div role="group" aria-label="Application mode"
       className="flex items-center bg-ois-surface-muted border border-ois-border rounded-[8px] p-[3px] gap-0">
    <button aria-pressed={!isAiRoute} onClick={()=>navigate('/')}
            className="relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10
                       !isAiRoute ? text-ois-text : text-ois-text-muted hover:text-ois-text">
      {!isAiRoute && <motion.div layoutId="sidebar-mode-indicator"
                      className="absolute inset-0 rounded-[6px] bg-white border border-ois-border"
                      style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)' }} />}
      <LayoutDashboard size={11} /> Management
    </button>
    <button aria-pressed={isAiRoute} onClick={()=>navigate('/ai')}
            className="relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[6px] text-[11px] font-semibold transition-colors duration-150 z-10
                       isAiRoute ? text-white : text-ois-text-muted hover:text-ois-text">
      {isAiRoute && <motion.div layoutId="sidebar-mode-indicator" className="absolute inset-0 rounded-[6px]"
                     style={{ background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 100%)',
                              boxShadow: '0 1px 3px rgba(31,79,212,0.4), 0 0 0 1px rgba(31,79,212,0.2)' }} />}
      <Sparkles size={11} /> AI Workspace
    </button>
  </div>
</div>
```

| Prop | Value |
|------|-------|
| Group | `bg-ois-surface-muted (#F1F3F7) border-ois-border (#E4E7EC) rounded-[8px] p-[3px]` |
| Button | `rounded-[6px] text-[11px] font-semibold gap-1.5 px-2 py-1.5` |
| Management active | white `bg-white border-ois-border` + shadow `0 1px 2px rgba(16,24,40,0.06)` + `text-ois-text` |
| AI active | gradient `#1F4FD4→#185FA5` + shadow `0 1px 3px rgba(31,79,212,0.4)` + `text-white` |
| Icons | `size={11}` (`LayoutDashboard`, `Sparkles`), `shrink-0`, `relative z-10` |
| Animation | `motion.div layoutId="sidebar-mode-indicator"` spring `stiffness 500 damping 35` |
| Inactive | `text-ois-text-muted hover:text-ois-text` |

### 2. Content — Crossfade Container

```tsx
<div className="flex-1 overflow-hidden min-h-0 flex flex-col">
  <AnimatePresence mode="wait">
    {isAiRoute
      ? (!collapsed && <motion.div key="ai-content" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}} className="flex-1 overflow-hidden flex flex-col min-h-0">{aiSidebarContent}</motion.div>)
      :  <motion.div key="mgmt-content" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.15}} className="flex-1 overflow-y-auto flex flex-col min-h-0">
           <div className="flex-1 overflow-y-auto py-4 custom-scrollbar"> {/* sections */} </div>
           <div className="p-2 border-t border-ois-sidebar-border shrink-0 space-y-1"> {/* footer */} </div>
         </motion.div>}
  </AnimatePresence>
</div>
```

- `mode="wait"` — satu panel keluar dulu sebelum yang lain masuk.
- Collapsed + AI route → render `null` (hanya logo `OIS` terlihat di header).

### 3. Sections — `SidebarSection`

```tsx
// Expanded
<div className="mb-6 px-3 group/section">
  <div className="px-3 mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ois-sidebar-section-label group-has-[[aria-current='page']]/section:text-ois-primary transition-colors">
    {label}
  </div>
  <div className="space-y-1">{children}</div>
</div>
// Collapsed
<div className="px-2 [&:not(:first-child)]:before:block [&:not(:first-child)]:before:border-t [&:not(:first-child)]:before:border-ois-sidebar-border [&:not(:first-child)]:before:mx-2 [&:not(:first-child)]:before:my-3 [&:first-child]:pt-3">
  <div className="space-y-1">{children}</div>
</div>
```

| Prop | Value |
|------|-------|
| Expanded wrapper | `mb-6 px-3` |
| Label | `font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ois-sidebar-section-label (#98A2B3) px-3 mb-2` |
| Label active-in-section | `group-has-[[aria-current='page']]/section:text-ois-primary` — label berubah biru jika ada child `aria-current="page"` |
| Collapsed | divider `border-t border-ois-sidebar-border mx-2 my-3` via `:before`, hidde label completely |
| Items gap | `space-y-1` |
| Scrollbar | `custom-scrollbar` (webkit thin 4px, `#D0D5DD` — lihat `src/index.css:67`) |

7 section groups (hardcoded order):

| Label | Routes |
|-------|--------|
| **Favorites** | conditional `pinnedPaths.length>0` — renders `SIDEBAR_LOOKUP[path]` entries |
| Operations | `/` Overview, `/inbox`, `/incidents`, `/problems` |
| Service Delivery | `/portal`, `/requests`, `/kb` |
| Change & Delivery | `/changes`, `/releases`, `/deployments`, `/testing/plans` |
| Service Health | `/availability`, `/capacity`, `/continuity/bia`, `/status` |
| Observability | `/monitoring`, `/dashboards` |
| Foundation | `/cmdb`, `/on-call`, `/improvement` |
| *Footer* | `/admin` (conditional `isAdmin`), `/settings` — `p-2 border-t border-ois-sidebar-border shrink-0 space-y-1` |

`isAdmin = session?.permissions.includes('system.admin')` (`Sidebar.tsx:66`).

### 4. Items — `SidebarItem`

`Sidebar.tsx:328` — wraps `NavLink` with `cn(...)`.

```tsx
<NavLink to={to} end={to==='/'}
  className={({isActive}) => cn(
    "group relative flex items-center gap-3 px-3 py-2 rounded-ois-btn transition-colors overflow-hidden",
    isActive ? "bg-ois-sidebar-item-active-bg text-ois-sidebar-item-active-text"
             : "text-ois-sidebar-item hover:bg-ois-sidebar-item-hover-bg hover:text-ois-text"
  )}
  title={collapsed ? (hasBadge ? `${label} (${badge})` : label) : undefined}
  onContextMenu={(e)=>{ e.preventDefault(); onOpenContextMenu(e.clientX, e.clientY); }}>
  {({isActive}) => (
    <>
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-ois-primary" style={{boxShadow:'0 0 12px 0 rgba(31,79,212,0.35)'}} />}
      <div className={cn("shrink-0 relative", isActive ? "text-ois-primary" : "text-ois-text-muted group-hover:text-ois-text")}>{icon}</div>
      {!collapsed && (
        <>
          <span className="flex-1 font-medium truncate shrink-0">{label}</span>
          {hasBadge && <span className={cn("shrink-0 flex items-center justify-center min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold leading-none",
                                      badgeVariant==='urgent' ? "bg-ois-danger text-white"
                                    : badgeVariant==='warning' ? "bg-ois-warning text-white"
                                    : "bg-ois-surface-muted text-ois-text-muted")}>{badge}</span>}
        </>
      )}
      {collapsed && hasBadge && <span className={cn("absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-ois-sidebar-bg", dotColor)} aria-hidden />}
    </>
  )}
</NavLink>
```

| Prop | Value |
|------|-------|
| Container | `flex items-center gap-3 px-3 py-2 rounded-ois-btn (6px) transition-colors overflow-hidden relative group` |
| Active | `bg-ois-sidebar-item-active-bg: rgba(31,79,212,0.08)` + `text-ois-sidebar-item-active-text: #1F4FD4` |
| Inactive | `text-ois-sidebar-item: #475467` — hover `bg-ois-sidebar-item-hover-bg: #F1F3F7` + `text-ois-text: #101828` |
| Left accent | `absolute left-0 top-0 bottom-0 w-[3px] bg-ois-primary (#1F4FD4)` + glow `boxShadow 0 0 12px rgba(31,79,212,0.35)` — only when `isActive` (NavLink `aria-current="page"`) |
| Icon wrapper | `shrink-0 relative`, active `text-ois-primary`, inactive `text-ois-text-muted group-hover:text-ois-text` |
| Icons | `lucide-react` single library. `size={18}` default (`width 18 height 18`, `strokeWidth 2` default — jangan override). Mode toggle `size={11}`. |
| Label (expanded) | `flex-1 font-medium truncate shrink-0` inheriting item text color, `text-[14px]` dari `body` |
| Numeric badge (expanded, `badge>0`) | `min-w-[20px] h-5 rounded px-1.5 text-[10px] font-bold leading-none flex items-center justify-center shrink-0` — `urgent: bg-ois-danger (#F04438) text-white`, `warning: bg-ois-warning (#F79009) text-white`, `default: bg-ois-surface-muted text-ois-text-muted` |
| Dot (collapsed, `badge>0`) | `absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-ois-sidebar-bg` + `dotColor` mapping sama dengan badge |
| Title (collapsed) | `hasBadge ? "Label (N)" : "Label"` |
| Radius token | `--radius-ois-btn: 6px` (`rounded-ois-btn`) |
| `end` prop | Hanya untuk `to="/"` — mencegah `/` match semua route |

#### Badge variants derivasi

| Item | Badge source | Condition | Variant |
|------|--------------|-----------|---------|
| Inbox | `urgentInboxCount = inboxItems.filter(i=>i.priority==='urgent').length` | `priority === 'urgent'` | `urgent` (red) |
| Incidents | `openIncidentCount = incidents.filter(i=>!['resolved','closed'].includes(status)).length` | open | `default` |
| Problems | `openProblemCount = problems.filter(p=>p.status!=='closed').length` | open | `default` |
| Service Requests | `requestsAwaitingUserCount = requests.filter(r=>r.status==='pending_user').length` | pending user | `warning` (amber) |
| Changes | `changesAwaitingCabCount = changes.filter(c=>c.status==='submitted'\|\|'in_review').length` | awaiting CAB | `default` |
| Releases | `releasesUrgentCount = releases.filter(r=>r.status==='rolled_back').length` | rolled back | `urgent` |
| Deployments | `deploymentsActiveCount = deployments.filter(d=>['running','rolling_back'].includes(status)).length` | active | `default` |
| Testing | `signOffsBreachedCount = signOffs.filter(s=>s.status==='pending'&& Date<dueAt).length` | overdue | `urgent` |
| Availability | `outages.filter(o=>!o.endedAt).length + slaTargets.filter(s=>s.status==='breached').length` | active outage/breach | `urgent` |
| On-Call | `onCallSchedules.reduce((acc,s)=>acc+s.activeIncidentCount,0)` | active incidents | `urgent` |
| Improvements | `improvements.filter(i=>i.priority==='critical'&&i.status==='on_hold').length` | blocked critical | `urgent` |

`hasBadge = badge !== undefined && badge > 0` — zero tidak render.

### 5. Context Menu — `SidebarContextMenu`

`src/components/layout/SidebarContextMenu.tsx:62`

| Prop | Value |
|------|-------|
| Trigger | `onContextMenu` pada `NavLink` — `e.preventDefault(); onOpenContextMenu(e.clientX, e.clientY)` |
| Position | `fixed z-50` di `{ left: x, top: y }` dari mouse event |
| Container | `min-w-[180px] rounded-[8px] border border-ois-border bg-white p-1 shadow-[0_8px_24px_rgba(16,24,40,0.10)] text-[12px]` |
| Items | `Pin to favorites / Unpin from favorites`, `Copy link`, `Open in new tab` |
| Item btn | `flex w-full items-center justify-between gap-3 rounded-[4px] px-2.5 py-1.5 text-left text-ois-text hover:bg-ois-surface-muted` |
| Dismiss | `mousedown` outside, `Escape` key, `scroll` (capture) — `useEffect` listeners di `SidebarContextMenu.tsx:24` |
| Copy link | `navigator.clipboard.writeText(window.location.origin + path)` |
| Open new tab | `window.open(path, '_blank', 'noopener,noreferrer')` |
| Role | `role="menu"` + `aria-label="Actions for {label}"` pada container, `role="menuitem"` pada buttons |

### 6. SIDEBAR_LOOKUP

`Sidebar.tsx:31` — canonical label/icon map (dipakai Favorites):

```ts
'/' → Overview / LayoutDashboard 18
'/inbox' → Inbox / Inbox 18
'/incidents' → Incidents / AlertCircle 18
'/problems' → Problems / Bug 18
'/portal' → Self-Service Portal / Store 18
'/requests' → Service Requests / ShoppingCart 18
'/kb' → Knowledge Base / BookOpen 18
'/changes' → Changes / Wrench 18
'/releases' → Releases / Package 18
'/deployments' → Deployments / Rocket 18
'/testing/plans' → Testing / CheckCircle2 18
'/availability' → Availability / Heart 18
'/capacity' → Capacity / Zap 18
'/continuity/bia' → Continuity / Lock 18
'/status' → Status Page / CircleDot 18
'/monitoring' → Monitoring / Activity 18
'/dashboards' → Measurement / BarChart3 18
'/cmdb' → CMDB / Database 18
'/on-call' → On-Call / Clock 18
'/improvement' → Improvements / Lightbulb 18
'/admin' → RBAC Admin / Shield 18
'/settings' → Settings / Settings 18
```

Unknown pinned path → `if (!meta) return null` (di-skip silently).

---

## Behavior

### Collapse toggle

- State owner: `AppShell.tsx:12` — `const [sidebarCollapsed, setSidebarCollapsed] = useState(false)` (local, tidak persist ke `localStorage`).
- Toggle via `TopBar` prop `onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}` — `TopBar` render hamburger/collapse button (bukan Sidebar internal).
- Tidak persist — refresh kembali ke `false` (expanded). Bandingkan terra yang persist `localStorage` — intentionally berbeda (cek `audit/audit-global-shell.md`).
- Width transition `transition-all duration-300` pada shell `aside`.
- Side effects saat `collapsed=true`:
  - Brand subtitle + mode toggle hidden (`{!collapsed && ...}`).
  - Section labels hidden, dividers via `:before` pseudo.
  - Item label + numeric badge hidden, diganti dot indicator.
  - AI mode tab hidden diganti `null` (logo-only).
  - Title tooltip aktif untuk a11y.

### Active state

- `NavLink` dari `react-router-dom` — `className` sebagai function `({isActive}) => ...`.
- Active styling bukan manual `pathname === to` — memanfaatkan `NavLink` internal matching. Hanya `to="/"` yang pakai `end` prop.
- Active CSS: `bg-ois-sidebar-item-active-bg (rgba(31,79,212,0.08)) text-ois-sidebar-item-active-text (#1F4FD4)` + left `w-[3px] bg-ois-primary` stripe + icon `text-ois-primary`.
- Section label reactive: `group-has-[[aria-current='page']]/section:text-ois-primary` — tanpa JS, label section berubah biru jika salah satu child active.

### Inactive + Hover

- Base: `text-ois-sidebar-item (#475467)` — icon `text-ois-text-muted (#475467)` → hover group `text-ois-text (#101828)` + `bg-ois-sidebar-item-hover-bg (#F1F3F7)`.

### Mode toggle (Management ↔ AI Workspace)

- `isAiRoute = location.pathname.startsWith('/ai')` (`AppShell.tsx:20`).
- Click handler `navigate('/')` vs `navigate('/ai')`.
- Visual: `motion.div layoutId="sidebar-mode-indicator"` — shared layout animation spring `500/35`. Hanya satu indicator exist pada satu waktu (conditional render).
- `aria-pressed` pada buttons untuk a11y.
- Ketika `isAiRoute` true, management nav unmount via `AnimatePresence mode="wait"` → AI panel mount.

### AI route content switch

- `AppShell.tsx:15` — `const [aiSidebarContent, setAiSidebarContent] = useState<ReactNode>(null)` — di-pass ke `Sidebar` + disediakan via `<Outlet context={{ setAiSidebarContent }} />` (mis. `src/pages/AiWorkspace.tsx` inject session list).
- Expand + AI: `motion.div key="ai-content" opacity 0→1 duration 0.15`.
- Collapse + AI: `null` — main area expands full width.

### Favorites / Pins

- Store: `src/lib/sidebar-pins.ts` — `localStorage` key `ois.sidebar.pins.v1`, JSON `string[]`.
- API: `togglePin(path)`, `isPinned(path)`, `usePinnedPaths()` (via `useSyncExternalStore` + cache `snapshotCache` untuk referential stability).
- `usePinnedPaths()` subscribes ke `listeners` Set — semua Sidebar instance sync intra-tab.
- Context menu trigger untuk pin/unpin + copy link + open new tab.
- Favorites section conditional `pinnedPaths.length > 0` — hanya muncul jika ada pins. Render via `SIDEBAR_LOOKUP[path]` (order insertion, bukan alphabet).
- Unknown pinned path → skip `return null` (mis. path legacy yang sudah dihapus).
- Persist cross-session, per-browser; tidak sync antar device.

### Context menu lifecycle

- State di Sidebar: `const [menu, setMenu] = useState<{x:number;y:number;path:string;label:string}|null>(null)`.
- Open: right-click `onContextMenu` → `e.preventDefault()` → `setMenu({ x: e.clientX, y: e.clientY, path, label })`.
- Render conditional `{menu && <SidebarContextMenu open x={menu.x} y={menu.y} path={menu.path} label={menu.label} onClose={()=>setMenu(null)} />}`.
- Close on: click outside, `Escape`, scroll (capture). Tidak perlu re-open toggle — click outside clears.

### Live counts

- Semua counts via `useResource(() => service.list(), [])` — 13 hooks parallel. Tidak ada polling — `useResource` fetch once on mount (cek `src/services`).
- Filters lihat tabel badge variants. Zero → tidak render badge/dot.
- `onCallActiveIncidentCount` di-sum dari `s.activeIncidentCount` per schedule.

---

## States

| State | Visual | Class delta |
|-------|--------|-------------|
| Default (inactive, expanded) | slate icon + muted text | `text-ois-sidebar-item` |
| Hover | bg muted + darker text | `hover:bg-ois-sidebar-item-hover-bg hover:text-ois-text` + icon `group-hover:text-ois-text` |
| Active | pale blue bg + blue text + left stripe glow | `bg-ois-sidebar-item-active-bg text-ois-sidebar-item-active-text`, stripe `w-[3px] bg-ois-primary boxShadow glow`, icon `text-ois-primary` |
| Collapsed inactive | icon only + dot if badge>0 | `w-16`, dot `w-2 h-2 ring-2 ring-ois-sidebar-bg` |
| Collapsed active | icon blue + left stripe (visible di collapsed juga) | sama dengan active |
| Favorites empty | section tidak render | `pinnedPaths.length` check |
| Favorites non-empty | pinned items di atas Operations | `SidebarSection label="Favorites"` |
| AI route expanded | Management nav unmount, AI panel mount | `key="ai-content"` crossfade `opacity 0.15s` |
| AI route collapsed | empty (null) | no content |

Focus-visible: browser default (tidak override) — inherited dari `NavLink`.

---

## Edge Cases

| Case | Handling |
|------|----------|
| `collapsed && isAiRoute` | AI content `null` — main content full width, sidebar hanya logo `OIS`. Intentional untuk maximize canvas. |
| Pinned path tidak di `SIDEBAR_LOOKUP` | `if (!meta) return null` — silent skip, tidak throw. Data dirty di `localStorage` aman. |
| `localStorage` kosong / corrupt JSON | `parseRaw` try/catch → `EMPTY` (`[]`). Invalid non-array / non-string entries filtered. Window undefined (SSR) → `EMPTY`. |
| Badge count `0` | `hasBadge = badge>0` false → tidak render badge/dot, title tanpa suffix `(N)`. |
| Badge undefined awal mount | `useResource` data `undefined` → fallback `?? []` → count `0` → no badge flicker. |
| RBAC `!isAdmin` | `RBAC Admin` item tidak render (`{isAdmin && <SidebarItem to="/admin">}`). Footer hanya `Settings`. Direct navigate `/admin` masih di-guard oleh route `requirePermission('system.admin')`. |
| Pinned storage quota full | `setItem` bisa throw — tidak di-catch. Low risk (pins array kecil). Jika throw, pins gagal persist tapi app tetap jalan. |
| Rapid right-click | `setMenu` overwrite — hanya satu context menu exist. |
| Copy link clipboard fail | `navigator.clipboard` promise ignored (`void`); error tidak ditampilkan. Degrade silently. |
| `useSyncExternalStore` referential stability | `snapshotCache` + `lastRaw` guard mencegah infinite re-render. `write()` invalidates cache (`lastRaw=undefined`). |
| Section label coloring | `group-has-[[aria-current='page']]` — requires tailwind 4 support. Fallback: label tetap `text-ois-sidebar-section-label`. |
| Scroll ketika sidebar tinggi | Management nav wrapper `flex-1 overflow-y-auto py-4 custom-scrollbar` — independent scroll dari header/footer. Footer `shrink-0` pinned di bawah. |

---

## API Touchpoints

Sidebar tidak mount direct REST — semua via `src/services` + `useResource` (client-side fetch, cached per service). Calls on mount (13 parallel):

| Call | Service | Filter untuk badge |
|------|---------|--------------------|
| `GET /api/v1/inbox` | `inboxService.items()` | `priority==='urgent'` |
| `GET /api/v1/incidents` | `incidentsService.list()` | `!['resolved','closed']` |
| `GET /api/v1/problems` | `problemsService.list()` | `status!=='closed'` |
| `GET /api/v1/requests` | `requestsService.list()` | `status==='pending_user'` |
| `GET /api/v1/changes` | `changesService.list()` | `['submitted','in_review']` |
| `GET /api/v1/deployments` | `deploymentsService.list()` | `['running','rolling_back']` |
| `GET /api/v1/releases` | `releasesService.list()` | `status==='rolled_back'` |
| `GET /api/v1/availability/outages` | `availabilityService.outages()` | `!endedAt` |
| `GET /api/v1/availability/sla-targets` | `availabilityService.slaTargets()` | `status==='breached'` |
| `GET /api/v1/testing/sign-offs` | `testingService.signOffs()` | `pending && dueAt < now` |
| `GET /api/v1/on-call/schedules` | `onCallService.schedules()` | sum `activeIncidentCount` |
| `GET /api/v1/improvements` | `improvementsService.list()` | `critical && on_hold` |

Error handling via `useResource` default — counts tetap `0` jika fetch fail (badge hilang, tidak crash).

No mutation endpoints. Pin state lokal `localStorage` — tidak ke API.

User context: `useCurrentUser()` + `useAuthSession()` (`src/lib/auth/session`) — dipakai hanya untuk `isAdmin` gate.

---

## Design Preservation

- **Tokens strict:** Semua warna via `ois-*` custom properties di `src/index.css:8-49`. Larangan hardcode hex. Sidebar chrome terdimmed `ois-sidebar-bg #F4F5F7` agar `ois-content-bg #FFFFFF` / `ois-surface` kartu lebih pop — jangan disamakan ke putih.
- **Radius:** `rounded-ois-btn (6px)` untuk items, `rounded-[7px]` untuk brand badge (intentionally 7px bukan token — brand treatment), `rounded-[8px]` untuk mode toggle group & context menu, `rounded-[6px]` toggle indicator, `rounded-[4px]` context item.
- **Font family:** `font-sans` global, mono hanya pada label section `font-mono text-[10px] tracking-[0.16em]`, badge `text-[10px] leading-none`, brand subtitle `font-mono`.
- **Icon convention:** `lucide-react` exclusively. `size={18}` nav icons, `size={11}` mode toggle. Default `strokeWidth 2` — jangan ubah ke `1.5`/`2.5`. Tidak ada housing box untuk nav icons (berbeda dengan terra `w-8 h-8 rounded-lg` icon housing).
- **Motion:** `motion/react` untuk mode indicator spring + `AnimatePresence mode="wait"` crossfade `0.15s`. Follow reduced-motion via CSS `prefers-reduced-motion` (global di `src/index.css:93`).
- **Shadows spesifik:** Brand badge `0 1px 4px rgba(31,79,212,0.35) + inset 0 1px 0 rgba(255,255,255,0.15)`, active stripe glow `0 0 12px rgba(31,79,212,0.35)`, management indicator `0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)`, AI indicator `0 1px 3px rgba(31,79,212,0.4) + 0 0 0 1px rgba(31,79,212,0.2)`, context menu `0 8px 24px rgba(16,24,40,0.10)`.
- **Gradients:** Brand `135deg #1F4FD4→#185FA5→#0C447C`, AI active `135deg #1F4FD4→#185FA5`, highlight `rgba(255,255,255,0.12)`. Jangan diganti ke solid atau warna lain.
- **Hover target:** `transition-colors overflow-hidden` — hanya warna, bukan width/transform.
- **Scroll chrome:** `custom-scrollbar` thin 4px thumb `#D0D5DD` hover `#98A2B3`, firefox `scrollbar-width thin`.
- **A11y:** `aria-pressed` pada mode toggle, `aria-current="page"` via `NavLink`, `role="menu"` pada context menu. Collapse tooltip via `title`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep spec — document exact classes/tokens/icon sizes/behavior/states/edge cases from `Sidebar.tsx:113`, `AppShell.tsx:57`, `SidebarContextMenu.tsx:62`, `src/index.css:40-49`, cross-ref `design-tokens.md` | — |
