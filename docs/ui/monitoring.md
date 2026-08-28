# Monitoring — Module Layout + Feature Patterns

Status: **Draft**
Source of truth: [`src/routes/monitoring/MonitoringLayout.tsx`](../../src/routes/monitoring/MonitoringLayout.tsx), [`src/routes/monitoring/EventStream.tsx`](../../src/routes/monitoring/EventStream.tsx), [`src/routes/monitoring/MonitoringOverview.tsx`](../../src/routes/monitoring/MonitoringOverview.tsx), [`src/routes/monitoring/MonitoringRules.tsx`](../../src/routes/monitoring/MonitoringRules.tsx), [`src/routes/monitoring/AlertRouting.tsx`](../../src/routes/monitoring/AlertRouting.tsx), [`src/routes/monitoring/CoverageReport.tsx`](../../src/routes/monitoring/CoverageReport.tsx), [`src/routes/monitoring/EventDetail.tsx`](../../src/routes/monitoring/EventDetail.tsx), [`src/components/monitoring/*`](../../src/components/monitoring/), [`src/components/ui/SeverityStripe.tsx`](../../src/components/ui/SeverityStripe.tsx), [`src/components/ui/StatusRing.tsx`](../../src/components/ui/StatusRing.tsx), [`src/components/ui/Dot.tsx`](../../src/components/ui/Dot.tsx), [`src/index.css`](../../src/index.css), [`src/lib/constants.ts`](../../src/lib/constants.ts)

> Diadaptasi dari `terra-service-management/docs/ui/` monitoring ref. Beda utama: OIS light theme (`--color-ois-*` `ois-bg #F7F8FA` / `ois-surface #FFFFFF`) — tidak ada `data-theme="light"` toggle seperti terra; Module Layout pakai `-m-6` + `calc(100vh - 3.5rem)` bleed trick; accent `w-1` severity-driven; `lucide-react` only; `framer-motion` untuk pause banner + stats drawer (bukan CSS transition manual).

---

## 1. Purpose

Monitoring adalah observability surface untuk **5 tabs**: Overview → Event Stream → Rules → Alert Routing → Coverage. Layout-nya adalah canonical **Module Layout** pattern yang juga dipakai entity detail pages — full-bleed container yang menembus `AppShell <main p-6>`.

Berbeda dengan terra monitoring (dark `linear-card` + `data-theme` toggle) — OIS menetapkan light palette, `Card` `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card`, dan header flat `bg-ois-surface`.

---

## 2. Module Layout — `MonitoringLayout.tsx:15-87`

### 2.1 Container — the `-m-6` trick

```tsx
// src/routes/monitoring/MonitoringLayout.tsx:26
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
```

| Prop | Value | Alasan |
|------|-------|--------|
| `-m-6` | negates `AppShell <main class="p-6">` (`src/components/layout/AppShell.tsx`) | Module Layout pages butuh edge-to-edge; lihat `docs/ui/audit/audit-global-shell.md:2` |
| `flex flex-col` | vertical stack header + tab content | — |
| `bg-ois-bg #F7F8FA` | page background, bukan `ois-surface` | Membedakan chrome dari card |
| `height: calc(100vh - 3.5rem)` | `3.5rem = h-14 TopBar` | Mengisi viewport di bawah TopBar tanpa outer scroll; inner panes yang scroll (`overflow-y-auto` / `flex-1 min-h-0`) |
| `shrink-0 z-30` pada header | pinned, tidak collapse saat scroll | — |

> **Preservation:** Jangan ganti `-m-6` jadi `p-0` di AppShell atau `h-screen` di module — `calc(100vh - 3.5rem)` adalah contract dengan TopBar `h-14`. Mengubah satu tanpa lainnya menghasilkan double-scroll atau gap.

### 2.2 Shared Header — accent `w-1` + title block + tab bar

```
┌─────────────────────────────────────────────────────┐
│ w-1 accent │ Monitoring                   (w-1)      │  bg-ois-surface border-b border-ois-border
│ #B42318/   │ 12 active · 2 P1 open · 3 P2 · 4 unack │  px-6 py-4 / text-xl font-bold / text-xs muted
│ #DC6803/   ├─────────────────────────────────────────┤
│ #1F4FD4    │ Overview | Event Stream | Rules | ...   │  nav px-4 overflow-x-auto scrollbar-hide
└────────────┴─────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ <Outlet />  flex-1 min-h-0                          │  tab content fills remaining height
└─────────────────────────────────────────────────────┘
```

#### Accent stripe — `w-1` severity-driven (`MonitoringLayout.tsx:23-33`)

```tsx
const accentColor = p1Count > 0 ? '#B42318' : p2Count > 0 ? '#DC6803' : '#1F4FD4';
// ...
<div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
```

| Condition | Color | Token |
|-----------|-------|-------|
| `p1Count > 0` | `#B42318` | `ois-sev-p1` / `--color-ois-danger` severity |
| `p2Count > 0` (no P1) | `#DC6803` | `ois-sev-p2` |
| else | `#1F4FD4` | `ois-primary` |

- `w-1` (`4px`) `self-stretch` via `items-stretch` parent — full height title block.
- `transition-colors duration-500` — smooth saat P1 muncul/hilang tanpa jank.
- **Jangan** hardcode `bg-red-500` atau `bg-ois-danger`; accent memakai **inline `style` hex** karena `ois-sev-p*` belum punya `bg-*` class yang konsisten untuk `w-1` (lihat `src/index.css:35-39` conflict `p3===p2`). Ikuti `MonitoringLayout.tsx:33` literal.

#### Title block (`MonitoringLayout.tsx:34-58`)

- Container: `flex-1 px-6 py-4`
- Title: `text-xl font-bold text-ois-text` — `Plus Jakarta Sans` via `font-sans`.
- Subtitle rail: `flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap`
  - `activeEvents.length active` → `font-medium text-ois-text`
  - `P1 open` → `font-semibold text-ois-danger` (dot `w-1 h-1 rounded-full bg-ois-border-strong` separator)
  - `P2 open` → `font-semibold text-ois-warning`
  - `unacknowledged` → `text-ois-text-muted` plain
- `activeEvents = status === 'open' || 'acknowledged'`; `openCount` unacknowledged khusus — source `eventsService.list()` via `useResource` (`MonitoringLayout.tsx:16-21`).

#### Tab bar (`MonitoringLayout.tsx:61-79`)

```tsx
nav.flex.px-4.overflow-x-auto.scrollbar-hide
  NavLink.flex.items-center.gap-2.px-3.py-3.text-sm.font-medium.border-b-2.whitespace-nowrap.transition-colors
    isActive ? border-ois-primary text-ois-primary : border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong
    <tab.icon size={14} /> {tab.label}
```

| Tab | `to` | Icon | `end` |
|-----|------|------|-------|
| Overview | `/monitoring` | `Activity` | `true` |
| Event Stream | `/monitoring/events` | `Radio` | — |
| Rules | `/monitoring/rules` | `Shield` | — |
| Alert Routing | `/monitoring/routing` | `GitBranch` | — |
| Coverage | `/monitoring/coverage` | `CircleDot` | — |

- Active indicator adalah `border-b-2 border-ois-primary` (8px total vertical, `py-3` tidak menambah height karena border inside) — jangan ganti jadi `bg-ois-primary` underline.
- `overflow-x-auto scrollbar-hide` — horizontal scroll di mobile, tidak ada wrap.
- `cn()` dari `src/lib/utils.ts` — jangan `clsx` manual.

#### Outlet (`MonitoringLayout.tsx:82-85`)

```tsx
<div className="flex-1 min-h-0"><Outlet /></div>
```

- `flex-1 min-h-0` adalah flex bugfix — tab content shrink correctly; setiap tab page sendiri yang manage `overflow-y-auto` di dalam (`EventStream`, `MonitoringOverview`, `AlertRouting`, `CoverageReport`, `MonitoringRules`).

---

## 3. Overview — `MonitoringOverview.tsx:13-201`

Purpose: KPI strip + active alerts feed (8 max) + right health rail.

### 3.1 Layout

```
┌──────────────────────────────┬──────────────────────┐
│ flex-1 min-w-0 overflow-y-auto│ aside w-[280px] lg:flex│
│ px-6 py-5 space-y-5          │ border-l bg-ois-surface│
│  grid 2/4 KPI                │ p-4 gap-4            │
│  Active Alerts (EventCard×8) │ Rules / Routing /    │
│  View all →                  │ Sources / Coverage   │
└──────────────────────────────┴──────────────────────┘
```

### 3.2 KPI Strip (`MonitoringOverview.tsx:51-78`, `KpiCard:205-222`)

- `grid grid-cols-2 lg:grid-cols-4 gap-4`
- Card: `rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card p-4 flex flex-col gap-2`
- Label: `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest`
- Value: `text-3xl font-bold tabular-nums leading-none` + `color` per KPI (danger/warning/success)
- Accent: P1/P2 cards dapat `style={{ backgroundColor: '#FEF3F2' / '#FFFAEB' }}` tint — `MonitoringOverview.tsx:64,70`
- Icons: `size={16} opacity-60` inline `Activity / AlertOctagon / AlertTriangle / Eye`

### 3.3 Health Rail (`MonitoringOverview.tsx:113-196`)

Rail cards — `border border-ois-border rounded-ois-card overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted` + label `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` + icon `size={12}` trailing.

- **Rules:** `HealthRow` `text-xs text-ois-text-muted / font-semibold text-ois-*` rows + `Link text-xs font-medium text-ois-primary hover:underline`
- **Routing:** sama pattern
- **Connected sources:** `<ConnectedSourcesPanel domain="monitoring" variant="rail" />` (`src/components/platform/ConnectedSourcesPanel.tsx`) — tidak custom di monitoring
- **Coverage:** pct `text-3xl font-bold` color `success ≥80 / warning ≥60 / danger` + `w-full h-1.5 bg-ois-surface-muted rounded-full` bar + `transition-all duration-500` width

### 3.4 Empty — all clear

- `border border-ois-border rounded-ois-card bg-ois-surface text-center py-12` + `CheckCircle2 size={36} text-ois-success` + `text-sm font-medium text-ois-text-muted "No active alerts — all clear."`

---

## 4. Event Stream — `EventStream.tsx:29-411`

Most complex tab — filter pipeline + grouped list + stats rail + mobile drawer.

### 4.1 Action Row (`EventStream.tsx:162-211`)

`shrink-0 flex items-center justify-between px-6 py-2 border-b border-ois-border bg-ois-surface`

- Left: `text-xs text-ois-text-muted "{N} events in {range}"` + `P1/P2` danger chip + `· paused` warning if `isPaused`
- Right: `Button variant="outline" size="sm" gap-1.5` — **Pause/Resume** (`Pause/Play size={13} fill-current`), **Time range** dropdown (`Last 24h / 7d / 30d`), **Export** (`Download`), **Stats** mobile only (`BarChart3`, `lg:hidden`)

Time range dropdown: `relative` + fixed overlay `inset-0 z-10` + `absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown min-w-[140px]` + options `px-4 py-2.5 text-sm hover:bg-ois-surface-muted` — active `font-semibold text-ois-primary`.

### 4.2 Pause Banner (`EventStream.tsx:220-241`)

`AnimatePresence` + `motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} overflow-hidden` → inner `bg-ois-primary text-white py-2 px-6 flex items-center justify-between` + `Pause size={14} / text-sm font-medium + "Stream paused at HH:mm UTC · 3 new events"` + `button text-xs font-bold text-white/80 hover:text-white "Resume"`.

State: `isPaused ? frozenEvents : mockEvents` — `togglePause` snapshots `[...filteredEvents]` into `frozenEvents` (`EventStream.tsx:84-88`).

### 4.3 Filter Card (`EventStream.tsx:246-313`)

`Card p-4` containing:

- **Search row:** `relative flex-1 min-w-[220px]` + `Search size={14} absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle` + `Input pl-9 h-9 text-sm placeholder="Search title, message, CI ID…"`
- **Dropdowns:** `FilterDropdown` `value/onChange/options` for `statusFilter` (`Any Status / Open / Acknowledged / Resolved / Suppressed`), `severityFilter` (`Any Severity / P1-P4`), plus `Button variant="ghost" size="sm" text-ois-text-muted hover:text-ois-danger gap-1.5 <RotateCcw size={13}/> Reset`
- **Quick chips:** `flex flex-wrap gap-2 mt-3 pt-3 border-t border-ois-border` + label `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest "Quick:"` + chips `flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors` — active `bg-ois-primary text-white border-ois-primary` / idle `bg-white text-ois-text-muted border-ois-border hover:border-ois-border-strong hover:text-ois-text` — each chip renders `Icon size={11} {label} {count opacity-70 tabular-nums}`; toggling sets `activeQuickFilter` (`active-p1p2 / exceptions / warnings / info / last24h`).

Filter pipeline (`EventStream.tsx:46-82`):
1. `timeRange` cutoff (`subDays(referenceDate='2026-05-09', days)`, `isAfter(parseISO(firedAt), cutoff)`) → sort `b.firedAt - a.firedAt`
2. `searchQuery` lower `title/message/publicId/affectedCIPublicIds`
3. `statusFilter / severityFilter / sourceFilter / typeFilter`
4. `activeQuickFilter` branch (P1/P2 active, type, last24h)
- Export (`handleExport:135-156`) builds CSV `ID,Title,Severity,Status,Source,Fired At,Tags` from `filteredEvents`, blob `text/csv`, `download="events-${timeRange}-${YYYY-MM-DD}.csv"`.

### 4.4 Grouped List (`EventStream.tsx:316-349`)

- Grouped by `format(parseISO(firedAt), 'yyyy-MM-dd')` (`EventStream.tsx:93-101`) → `Object.entries(groupedEvents)`
- Sticky date header: `flex items-center gap-3 sticky top-0 z-10 bg-ois-bg/90 backdrop-blur-sm py-1.5` + `flex-1 h-px bg-ois-border` dividers + label `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` via `formatDateHeader` (`TODAY · MMMM D, YYYY` / `YESTERDAY · …` / `MMMM D, YYYY` upper)
- Each event: `<EventCard key={id} event={event} />` (see §7.1)
- Empty: `text-center py-12 List size={36} text-ois-text-subtle + text-sm text-ois-text-muted "No events match your filters." + Button outline Reset`
- Pagination: `activeEvents.length > visibleCount (25)` → `Button variant="secondary" size="sm" w-full sm:w-auto "Load 25 more ({remaining})"` → `setVisibleCount(p+25)`; no infinite scroll observer.

### 4.5 Right Stats Rail — `EventStreamStatsRail.tsx:18-98`

`aside hidden lg:block w-[300px] shrink-0 border-l border-ois-border overflow-y-auto bg-ois-surface p-4` — inner `<EventStreamStatsRail stats={{total,open,acknowledged,resolved,exception,warning,informational}} />`

Rail cards pattern — `border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden shadow-ois-card` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest`

| Card | Content |
|------|---------|
| Status Breakdown | `StatusRow` `w-2 h-2 rounded-full` dot `bg-ois-danger/warning/success/border-strong` + `text-xs text-ois-text-muted label / text-xs font-semibold color tabular-nums` + divider `pt-2 border-t` Total |
| Event Distribution | `DonutChart size={110} data=[Exception #B42318, Warning #DC6803, Info #98A2B3]` + `TypeRow gap-2 py-1 px-2 rounded-md hover:bg-ois-surface-muted` + icons `AlertOctagon/AlertTriangle/Activity size={13}` |
| Resolution Rate | `text-3xl font-bold text-ois-text {pct}%` + `text-[11px] font-semibold text-ois-success uppercase "↑ 4% vs yday"` + bar `w-full h-1.5 bg-ois-surface-muted rounded-full` → inner `h-full bg-ois-success rounded-full transition-all duration-500 width: pct%` + caption `text-xs text-ois-text-muted` |
| Health Insight | `border border-ois-primary/20 rounded-ois-card bg-ois-primary-pale` + `CheckCircle2 size={14} text-ois-primary` + `text-[11px] font-semibold text-ois-primary uppercase` + `text-xs text-ois-text leading-relaxed` static insight |

### 4.6 Mobile Stats Drawer (`EventStream.tsx:361-401`)

`AnimatePresence` gated by `showStatsDrawer` — backdrop `motion.div fixed inset-0 bg-black/40 z-40 lg:hidden` + panel `motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} fixed right-0 top-0 bottom-0 w-[300px] bg-ois-surface z-50 lg:hidden shadow-2xl overflow-y-auto` + header `flex items-center justify-between px-5 py-4 border-b` + `Button ghost X size={18}` + simplified `Card p-4` Status/By Type sections.

---

## 5. Rules — `MonitoringRules.tsx:72-852`

### 5.1 Layout

`flex flex-col flex-1 min-h-0` → action row `shrink-0 flex items-center justify-end px-6 py-2.5 border-b border-ois-border bg-ois-surface` → body `flex-1 overflow-y-auto max-w-7xl mx-auto px-6 py-5 space-y-5 pb-20`.

Action row: `<Can module="monitoring" action="update"><Button variant="primary" size="sm" gap-1.5 Plus size={13}> New rule</Button></Can>`

### 5.2 Mutation Banner

`mutationError` inline `flex items-start gap-3 rounded-xl border border-ois-danger/30 bg-ois-danger/5 px-4 py-3 text-sm text-ois-danger` + `AlertCircle size={16}` + `font-bold "Couldn't save changes"` + `text-xs text-ois-danger/80` + dismiss `X size={16}`.

### 5.3 Filter Bar (`Card p-4 border-ois-border bg-white/50 backdrop-blur-sm`)

- Search `flex-1 relative` + `Search left-3 size={18}` + `Input pl-10 h-11 border-ois-border-strong bg-white focus:ring-2 focus:ring-ois-primary/10`
- `FilterDropdown` x3: type (`All Types / Threshold / Anomaly / Log Pattern / Synthetic / Absence`), severity (`All Severities / P1-P4`), enabled (`Any Status / Enabled only / Disabled only`) — `fullWidth` false
- Reset ghost `h-10 text-ois-text-subtle hover:text-ois-primary font-bold px-4`

### 5.4 Stats Strip (`MonitoringRules.tsx:555-586`)

- Pills `Badge h-8 px-4 font-bold text-xs cursor-pointer transition-all` — active `bg-ois-primary text-white border-ois-primary` else `bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg`
- Summary bar `flex items-center gap-4 ml-auto px-4 py-1.5 bg-ois-bg rounded-lg border border-ois-border` → `text-[11px] font-bold uppercase tracking-widest "Avg fires (30d): {n}"` + separators `w-px h-3 bg-ois-border` + `text-ois-danger "Noisy: {n}"` + `text-ois-text-subtle "Never fired: {n}"`

### 5.5 DataTable (`MonitoringRules.tsx:309-452`)

`Card border-ois-border overflow-hidden bg-white shadow-sm` → `<DataTable columns={columns} data={filteredRules} onRowClick={handleOpenWizard} />`

| Column | accessor | Width | Notes |
|--------|----------|-------|-------|
| ☐ | checkbox | `w-10` | `rounded border-ois-border-strong text-ois-primary focus:ring-ois-primary` |
| Status | `RuleStatusToggle` | `w-20` | optimistic `handleToggleRule` (`MonitoringRules.tsx:172-183`) — update `enabled`, POST `monitoringRulesService.update(publicId,{enabled})`, rollback on error |
| Public ID | mono `text-[10px] font-bold text-ois-text-subtle uppercase` | `w-32` | `publicId` |
| Name | `text-sm font-semibold text-ois-text truncate max-w-[240px]` | — | `title={query}` tooltip |
| Type | `Badge bg-ois-surface-muted text-ois-text-muted border-ois-border text-[10px] font-bold uppercase gap-1.5` | — | `ruleTypeMeta[type].icon/label` (`src/lib/constants.ts:76-83`) |
| Severity | `SeverityBadge` | `w-24` | — |
| Targets | `Badge bg-ois-bg border-ois-border text-ois-text-muted` | — | `{targetCount} CI(s)` |
| Last Fired | `text-[11px] font-medium text-ois-text-muted whitespace-nowrap` | — | `formatDistanceToNow(parseISO(lastTriggeredAt))` or `Never` |
| Fires (30d) | `text-xs font-bold w-6 + RuleSparkline` | — | sparkline color `#F04438` if `>50` else `#1F4FD4` |
| S/N | `text-xs font-bold` color `success≥0.8 / warning≥0.5 / danger` | — | `{round(signalToNoiseRatio*100)}%` |
| Route | `button text-[11px] font-bold text-ois-primary hover:underline whitespace-nowrap` | — | `alertRoutePublicId` → `navigate('/monitoring/routing')` |
| Actions | `Settings/Play/Trash2 size={14}` ghost `h-8 w-8 p-0` or `read-only italic` | `w-28` | `canManage = useCan('monitoring','update')` |

Empty: `py-24 flex flex-col items-center Radio size={48} text-ois-text-subtle + text-lg font-bold + text-sm text-ois-text-muted max-w-sm` + branching Reset vs `Create first rule Plus size={18}`.

### 5.6 Wizard Modal (`MonitoringRules.tsx:631-720`)

`Modal isOpen={isWizardOpen} size="lg" title={isEditMode ? 'Edit rule: {name}' : 'Create Monitoring Rule'}`

- `<StepperNav currentStep={currentStep} steps=[{Define/Basic info},{Conditions/Thresholds},{Routing/Alert routes}] />`
- Body `p-8 max-w-4xl mx-auto` → `Step1Define / Step2Conditions / Step3Routing` wizard steps (`src/components/monitoring/RuleWizard/*`)
- Footer `mt-8 flex items-center justify-between pt-6 border-t border-ois-border` → left ghost `h-10 px-6 font-bold text-ois-text-muted` Cancel/Back; right `Save as draft variant="outline" h-10 px-6 font-bold border-ois-border-strong` (step 3 only) + `Next/Save variant="primary" h-10 px-8 font-bold gap-2 ArrowRight/CheckCircle2 size={18}` — disabled `mutationSubmitting`.
- `handleCreateOrUpdateRule` (`MonitoringRules.tsx:234-287`) builds `condition {threshold,operator,duration}` and calls `monitoringRulesService.create/update(publicId, {name,description,source,type,query,severity,cooldown,alertRouteId,targetMode,targetCIIds,targetSelector,condition,tags})` with `setRules` optimistic + `refreshRules()`; error keeps wizard open.

### 5.7 Test + Delete Modals

- Test (`testModalRule`): `Modal size="md"` → warning `p-4 bg-ois-warning-pale border-ois-warning/20 rounded-xl text-xs text-ois-warning Info size={16}` → `divide-y divide-ois-border border rounded-xl` per-channel rows `p-4 bg-white` + `p-2 bg-ois-bg rounded-lg Icon size={16}` + `text-xs font-bold capitalize / text-[10px] text-ois-text-muted` + per-channel `Test/Sent CheckCircle2 size={12} text-ois-success` + footer `text-[10px] font-bold uppercase "Last test: Never"` + `Run all Play size={16}` (sets `testedChannels = allIds`).
- Delete: `Modal size="sm"` → `text-sm text-ois-text + font-bold {name}` + `Cancel ghost h-10 px-6 + Delete destructive h-10 px-6` → `handleDeleteRule` optimistic `setRules(prev.filter)`, `await monitoringRulesService.remove(publicId)`, rollback on error.

---

## 6. Alert Routing — `AlertRouting.tsx:41-1013`

Split-panel editor (list + detail) — same `-m-6/calc` outer, own `flex gap-6 px-6 py-5`.

### 6.1 Shell

- Toast: `fixed bottom-6 right-6 z-50 bg-ois-text text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold` (`showToast` 3s + `toastTimerRef`)
- Action row: `shrink-0 flex items-center justify-end px-6 py-2.5 border-b bg-ois-surface` → `<Can><Button variant="primary" size="sm" gap-1.5 Plus> New route</Button></Can>` → `handleNewRoute` optimistic `tmp-{random}` placeholder `ROUTE-PENDING` + `alertRoutesService.create({name:'New route'})` swap or rollback.

### 6.2 Left — Route List (`AlertRouting.tsx:405-468`)

`w-[400px] flex flex-col gap-4 overflow-hidden` + search `relative Search left-3 size={18} + Input pl-10 h-11 border-ois-border-strong bg-white shadow-sm` + scroll `flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar`

Route card `button w-full text-left p-5 rounded-xl border-2 bg-white shadow-sm hover:border-ois-border-strong transition-all` — selected `border-ois-primary ring-1 ring-ois-primary/10 shadow-md` else `border-ois-border`

- Top: `font-mono text-[10px] font-bold text-ois-text-subtle uppercase {publicId}` + dot `w-2 h-2 rounded-full bg-ois-success/border-strong` + `text-[10px] font-bold uppercase Enabled/Disabled`
- Body: `text-sm font-bold text-ois-text group-hover:text-ois-primary + text-xs text-ois-text-muted line-clamp-2`
- Footer: `flex items-center justify-between pt-4 border-t` → channel chips `w-5 h-5 rounded border border-ois-border text-ois-text-subtle` (`getChannelIcon` `Mail/Hash/Smartphone/Monitor/Users/Globe` size 14) + count `text-[10px] font-bold` + `Rules: {count}` + `Fired {distance} ago`
- Empty: `py-20 text-center text-sm text-ois-text-muted + Clear search text-ois-primary`

### 6.3 Right — Editor (`AlertRouting.tsx:470-929`)

Container `flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-ois-border shadow-sm overflow-hidden`

#### Empty

`h-full flex flex-col items-center justify-center p-12` + `p-4 bg-ois-bg rounded-2xl Layers size={48} text-ois-text-subtle` + `text-xl font-bold + text-sm text-ois-text-muted max-w-sm`.

#### Header

`px-8 py-6 border-b bg-white sticky top-0 z-10 flex items-start justify-between`

- Left: `text-2xl font-bold tracking-tight uppercase font-mono {publicId}` + toggle pill `h-6 px-2 rounded-full text-[10px] font-bold uppercase` — enabled `bg-ois-success-pale text-ois-success border-ois-success/20` else `bg-ois-border text-ois-text-muted` + dot → `text-lg font-semibold text-ois-text-muted {name}` + `text-sm text-ois-text-muted leading-relaxed {description} · Last updated {distance} ago`
- Right: `Test route ghost h-10 px-4 font-bold gap-2 border Play size={16}` + `Save changes primary h-10 px-6 font-bold disabled:opacity-50` — disabled `!isDirty || !canManage || saving` — `handleSaveChanges` optimistic `setRoutes(map editBuffer)` + `alertRoutesService.update(publicId,{name,description,enabled,matchExpression,channels,recipients,escalationSteps,quietHours})` rollback; + `Delete ghost h-10 w-10 border hover:border-ois-danger hover:text-ois-danger Trash2` + overflow `MoreVertical h-10 w-10 border`.

#### Sections (all collapsible `toggleSection` + `ChevronDown/Up size={18}`)

Button header: `flex items-center gap-3 group w-full text-left` + chip `p-1.5 bg-ois-bg rounded-lg group-hover:bg-ois-primary-pale group-hover:text-ois-primary` + title `text-sm font-bold uppercase tracking-widest flex-1`.

**Match conditions** (`Filter` icon):
- Severity: `h-8 px-3 rounded-lg text-[11px] font-bold border-2 transition-all` — selected `bg-ois-primary border-ois-primary text-white + X size={12}` else `bg-white border-ois-border text-ois-text-muted hover:border-ois-border-strong` (4 chips `P1-P4`)
- Sources: `Badge bg-ois-primary-pale text-ois-primary border-ois-primary/20 h-8 px-3 + X hover:text-ois-danger` per source + inline add input `h-8 px-3 rounded-lg border-ois-primary text-xs font-semibold min-w-[140px] placeholder "e.g. prometheus"` + `Add source ghost text-xs font-bold text-ois-primary`; handlers `removeSource/commitAddSource`.
- Tags: `Badge bg-ois-surface text-ois-text-muted border-ois-border h-8 px-3 #{tag} + X` + same inline add pattern `commitAddTag`.
- Matches bucket: `p-4 bg-ois-bg rounded-xl border` + `Shield size={14} text-ois-primary "Matches {matchingRules.length} rules:"` + list `font-mono text-[10px] font-bold w-24 shrink-0 {publicId} + text-xs text-ois-text-muted {name}`.

**Channels** (`Zap` icon):
- Grid `grid-cols-2 gap-4 pl-11`
- Tile `p-4 rounded-xl border transition-all flex flex-col gap-2` — active `border-ois-primary bg-ois-primary-pale/30` else `border-ois-border bg-white`
- Header `flex items-center justify-between` → left `p-2 rounded-lg {bg-ois-primary text-white / bg-ois-bg text-ois-text-subtle} + Icon + text-sm font-bold capitalize` + `input type="checkbox" w-5 h-5 rounded border-ois-border text-ois-primary`
- Detail `mt-2 pt-3 border-t border-ois-primary/10 flex items-center justify-between` → hint `text-[10px] font-medium text-ois-text-muted` per-channel (`#platform-oncall / (Twilio) / platform-oncall@acme.io / Standard persistent`) + `Edit text-[10px] font-bold text-ois-primary hover:underline` → `setConfiguringChannel(ch)` → `ConfigureChannelModal`.

**Escalation policy** (`Layers` icon):
- Rail `relative space-y-4 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-ois-border`
- Step `relative pl-12` + num `absolute left-0 top-3 w-10 h-10 rounded-full bg-white border-2 border-ois-border flex items-center justify-center font-bold text-sm shadow-sm {idx+1}` + card `p-5 rounded-xl border border-ois-border bg-white hover:border-ois-border-strong hover:shadow-md group/step`
- Card header `flex items-start justify-between mb-4` → `text-sm font-bold "{delay===0 ? Immediate action : After {n} min if not acknowledged}"` + `text-[10px] font-bold uppercase tracking-widest "Delay: {n} min"` + actions `opacity-0 group-hover:opacity-100` → `Edit step ghost h-8 px-3 font-bold text-[11px] text-ois-primary` + `Trash2 size={14} text-ois-danger` (`handleDeleteStep`/`openEditStep`)
- Grid `grid-cols-2 gap-6` → Recipients column `text-[10px] font-bold uppercase` + `Users size={10} bg-ois-bg rounded + text-xs font-semibold` per recipient or `italic No recipients`; Channels column `Badge bg-white border-ois-border text-[9px] font-bold capitalize` per channel.
- Add `Button ghost h-12 w-full border-2 border-dashed border-ois-border rounded-xl text-sm font-bold text-ois-text-subtle hover:border-ois-primary hover:text-ois-primary hover:bg-ois-primary-pale gap-2 Plus size={18} "Add escalation step"` (`handleAddStep`).

**Quiet hours** (`Clock` icon):
- Wrapper `label flex items-start gap-4 p-5 rounded-xl border bg-white cursor-pointer hover:border-ois-border-strong` + checkbox `w-5 h-5 rounded border-ois-border text-ois-primary`
- Copy `text-sm font-bold + text-xs text-ois-text-muted leading-relaxed`
- When `enabled`: expanded grid `grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t` → Timezone `FilterDropdown value=timezone options=[UTC,America/New_York,Asia/Jakarta]` + Window `FilterDropdown fromHour/toHour options HOUR_OPTIONS 0-23 "{HH}:00"` with `fullWidth` + Active days `flex gap-1.5` S M T W T F S `w-8 h-8 rounded-lg text-[10px] font-bold border` — active `bg-ois-primary text-white border-ois-primary shadow-sm` (`toggleQuietDay`).

---

## 7. Coverage — `CoverageReport.tsx:33-554`

### 7.1 Shell

- Toast `fixed bottom-6 right-6 z-50 bg-ois-text text-white px-5 py-3 rounded-xl shadow-lg`
- Action row `shrink-0 flex items-center justify-end gap-2 px-6 py-2.5 border-b bg-ois-surface` → `RefreshCw size={13} Re-analyze ghost text-ois-text-muted + Export Report primary` (export placeholder — no CSV wiring yet)
- Body `flex-1 overflow-y-auto max-w-[1600px] mx-auto px-6 py-5 space-y-8 pb-20` → `flex flex-col lg:flex-row gap-8 flex-1 | aside w-80 sticky top-24`.

### 7.2 Critical Gaps Hero

If `criticalGaps.length > 0` (`ci.criticality==='critical' && rules.length===0`):

- Badge `absolute -top-3 left-6 z-10 bg-ois-danger text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border-white/20 flex items-center gap-1.5 ShieldAlert size={12} "{n} CRITICAL GAPS DETECTED"`
- Card `bg-red-50/30 border-red-200 p-8 pt-10 rounded-2xl shadow-sm` + copy `text-sm font-semibold text-red-900`
- Grid `grid-cols-1 md:grid-cols-2 gap-4` per gap: `bg-white border border-red-100 rounded-xl p-5 shadow-sm hover:shadow-md relative overflow-hidden` + left stripe `absolute top-0 left-0 w-1.5 h-full bg-red-500` + top row `p-2 bg-red-50 text-red-600 rounded-lg Icon size={16} + font-mono text-[10px] font-semibold uppercase {publicId} / text-sm font-bold {name} + Badge bg-red-50 text-red-700 border-red-200 uppercase text-[9px]` + meta `flex items-center gap-3 text-[10px] font-bold uppercase text-red-600 / w-1 h-1 bg-ois-border / {service} / text-red-500 0 rules` + suggest `pt-4 border-t border-red-50 button text-xs font-bold text-ois-primary ArrowRight size={14} "Suggest a rule [{firstTemplate}]"` expandable list per template `flex items-center justify-between p-2 rounded-lg bg-ois-bg hover:bg-ois-primary-pale` + `Button primary h-6 px-2 text-[9px] font-bold uppercase "Create rule" → navigate('/monitoring/rules')`
- CTA `mt-8 flex justify-center Button primary h-11 px-8 font-bold gap-3 shadow-md bg-red-600 hover:bg-red-700 border-red-600 Plus size={20} "Bulk create rules from suggestions"` → `setBulkOpen(true)` → `BulkCreateRulesModal`.

### 7.3 Coverage Matrix

- Header `flex items-center justify-between` → title `text-lg font-bold uppercase tracking-widest gap-3 + h-px bg-ois-border flex-1 w-32` + controls `relative Search left-3 size={14} + input h-9 w-64 pl-9 pr-4 rounded-lg bg-white border border-ois-border text-xs font-medium focus:ring-2 focus:ring-ois-primary` + toggle `flex bg-white rounded-lg border p-1` → buttons `px-3 py-1 rounded-md text-[10px] font-bold uppercase {Type/Service}` active `bg-ois-primary text-white` else `text-ois-text-muted hover:bg-ois-bg` (`setGroupBy`)
- Groups `space-y-12` per `groupKey` (`type` or `serviceId`): header `flex items-center justify-between pb-2 border-b` → left `w-1.5 h-1.5 rounded-full bg-ois-primary + text-xs font-bold uppercase tracking-widest {key} {count}`; right `text-[10px] font-bold COVERAGE: {pct}%`
- Table `divide-y divide-ois-border bg-white rounded-xl border border-ois-border shadow-sm overflow-hidden` per row:
  `flex items-center gap-4 px-6 py-4 hover:bg-ois-bg group`
  - Icon `w-8 h-8 rounded-lg bg-ois-bg text-ois-text-subtle group-hover:bg-white`
  - Identity `w-48 shrink-0` → `font-mono text-[9px] font-bold uppercase {publicId} + text-sm font-bold truncate {name}`
  - Criticality `w-32 shrink-0 Badge text-[9px] font-bold uppercase border {getCriticalityColor}` (`critical red-600/50/200`, `high orange`, `medium amber`, default slate)
  - Coverage `flex-1 flex items-center gap-4` → `flex items-center gap-2 text-xs font-bold {success/warning/danger per rules.length vs criticality} ShieldCheck/AlertTriangle size={14} "{n} rule(s)"` + bar `flex-1 h-1.5 bg-ois-border rounded-full max-w-[100px]` → `h-full bg-ois-success w-full/w-0`
  - Actions `flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100` → if `rules.length>0` ghost `h-8 px-3 font-bold text-[11px] gap-1.5 Eye View/Hide` (`setExpandedCIs`) else ghost `h-8 px-3 font-bold text-[11px] text-ois-primary Plus Add → navigate('/monitoring/rules')`
  - Expand `expandedCIs[id] && rules.length>0` → `px-6 pb-6 pt-2 bg-ois-bg/50 animate-in slide-in-from-top-2 duration-300 ml-12 space-y-2` → per rule `flex items-center gap-4 p-3 bg-white rounded-lg border hover:border-ois-border-strong hover:shadow-sm` → `font-mono text-[9px] font-bold w-24 {publicId} + text-xs font-semibold flex-1 {name} + Badge text-[9px] font-bold uppercase {severity} + ArrowRight size={14}`

### 7.4 Sticky Analytics Rail (right `w-80`)

`sticky top-24 space-y-6`

- **Card `p-6 space-y-6 bg-white border shadow-sm`:**
  - `Coverage by criticality` header `text-xs font-bold uppercase tracking-widest flex justify-between BarChart3 size={14} text-ois-text-subtle`
  - Per row: label `text-[10px] font-bold text-ois-text-muted / val {covered}/{total} ({pct}%)` + 10-block bar `h-2 bg-ois-bg rounded-full flex gap-0.5` → 10 segs `h-full flex-1 transition-all {covered fill bg-red/orange/amber/slate else bg-ois-border/30}`
  - `Coverage by type` (ordered `service/application/database/server/load_balancer/network/storage/endpoint`): `flex justify-between text-[11px] font-bold group hover:text-ois-primary` → left label `text-ois-text-muted`; right `text-ois-text-subtle {val}/{total} + status Icon size={12} success ShieldCheck / warn AlertTriangle / critical ShieldAlert / optional Info`
  - `Insights` header `text-xs font-bold uppercase tracking-widest border-l-2 border-ois-primary pl-2` + list `flex gap-2 text-xs font-medium` bullets `w-1.5 h-1.5 rounded-full bg-red-500/amber-500/slate-400 mt-1` → critical gaps count + noisy `S/N<0.5 {publicIds text-ois-primary hover:underline}` + silent `never fired {n}` or success `ShieldCheck text-ois-success "All critical CIs are covered"`

- **Gradient promo** `p-6 rounded-2xl bg-gradient-to-br from-ois-primary to-blue-700 text-white space-y-4 shadow-lg relative overflow-hidden + absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl` → `Zap size={32} text-white/40 + font-bold text-sm + text-xs text-white/80 leading-relaxed + Button ghost w-full h-9 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase border-none "Enable Proactive Scan"`.

Coverage derivation (`CoverageReport.tsx:68-107`): per CI `explicitRules targetCIIds.includes(ci.id)` + `selectorRules enabled && targetMode==='selector'` matches `types/services/tags/environments` — `linkedRules = [...explicit, ...selector]`; suggestions per `CIType` map (service `Available/Latency/Throughput` … endpoint `SSL Expiry/HTTP Response Time/Success Rate`).

---

## 8. Shared Monitoring Primitives — `src/components/monitoring/*`

All primitives use **inline `style` hex for semantic colors** (not `bg-ois-*` classes) because `cisService/monitoringRulesService` return semantic via `lib/constants.ts` hex.

### 8.1 `EventCard.tsx:38-128` — the workhorse

Outer: `<SeverityStripeRow severity={sev as StripeSeverity} onClick={navigate('/monitoring/events/{publicId}')} className="group relative flex items-stretch bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:border-ois-primary/40 transition-all cursor-pointer overflow-hidden {className}">`

- `SeverityStripeRow` (`src/components/ui/SeverityStripe.tsx:23-37`) renders `border-l-[3px]` with `borderLeftColor = COLOR[severity]` (`P1 #B42318, P2 #DC6803, P3 #DC6803, P4 #027A48`).
- Inner: `flex-1 px-4 py-3 flex flex-col md:flex-row gap-3 items-start md:items-center`
  - Main: `flex-1 min-w-0 space-y-1.5` → row1 `flex items-center gap-2` → `StatusRing state=EVENT_STATUS_TO_RING[status] (open→open, acknowledged→acknowledged, resolved→resolved, suppressed→closed)` + `Dot variant=EVENT_SOURCE_TO_DOT[source] (info/muted/warning) size="sm" aria-label Source` + `IDCell publicId` (stopPropagation wrapper) + `· text-ois-border-strong` + `Clock size={11} text-ois-text-subtle "{distance} ago"` (`formatDistanceToNow(parseISO(firedAt))`) → title `h3 text-sm font-semibold text-ois-text group-hover:text-ois-primary transition-colors leading-snug truncate {title}` → meta `flex flex-wrap items-center gap-1.5` → `EventStatusBadge status` + `EventTypeBadge type` + optional `{affectedCIIds.length} CIs Shield size={10} px-2 py-0.5 rounded-ois-badge bg-ois-primary-pale text-ois-primary text-[10px] font-medium` + optional `linkedIncidentId ExternalLink size={10} px-2 py-0.5 rounded-ois-badge bg-ois-danger-pale text-ois-danger text-[10px]`
  - Actions rail: `flex items-center gap-1.5 shrink-0 onClick=stopProp` → if `open` then `px-3 py-1.5 bg-ois-primary text-white text-xs font-medium rounded-ois-btn hover:bg-ois-primary-hover` Acknowledge; if `acknowledged` then `bg-ois-success hover:opacity-90` Resolve; if `(open||acknowledged) && !linkedIncidentId` then `flex items-center gap-1 text-[11px] font-medium text-ois-danger hover:bg-ois-danger-pale px-2 py-1.5 rounded-ois-btn PlusCircle size={11} Create incident → navigate('/incidents')`; `MessageSquare size={15} p-1.5 text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted rounded-md`; `MoreHorizontal size={15}` same.

### 8.2 `EventTimeline.tsx:19-79`

`relative space-y-6 {className}` + absolute rail `absolute left-4 top-2 bottom-2 w-0.5 bg-ois-border` + per entry `relative pl-10` → dot `absolute left-0 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white z-10 {iconColor}` (`getIconColor`: status_change `bg-ois-warning-pale text-ois-warning Zap`, action `bg-ois-primary-pale text-ois-primary User`, system `bg-ois-success-pale text-ois-success ShieldCheck`, default `bg-ois-surface-muted text-ois-text-subtle Clock`) + `Icon size={14}` (`getIcon` same switch) → body `space-y-1` → `flex items-center gap-2 text-[11px] font-bold text-ois-text {user||System} + text-[11px] font-medium text-ois-text-subtle {format(timestamp,'MMM d, HH:mm:ss')}` → `text-sm text-ois-text-muted {message}` → optional `mt-2 p-2 bg-ois-bg border border-ois-border rounded font-mono text-[10px] text-ois-text-subtle overflow-x-auto <pre JSON.stringify(payload,null,2)`.

### 8.3 `RuleSparkline.tsx:10-46` + `CoverageHealthSidebar.tsx` / `CoverageGapCard.tsx` sparklines

`RuleSparkline` — inline SVG `width={100} height={30} viewBox` → `polyline fill="none" stroke={color||'#1F4FD4'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={x,y list normalized min/max}` + `polygon fill={color} fillOpacity="0.1" points="{width},{height} 0,{height} {points}"` — null if empty. `MonitoringRules.tsx` generates per-rule random 12 points via `generateSparklineData` and memoizes `sparklineData[id]`; color flips `#F04438` if `totalFires30d>50`.

### 8.4 `EventStreamStatsRail.tsx` / `CoverageHealthSidebar.tsx` / `CoverageGapCard.tsx`

Documented in §4.5 / §7.4 above — all follow rail card pattern `border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden shadow-ois-card` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold uppercase tracking-widest`.

- `CoverageHealthSidebar` (`CoverageHealthSidebar.tsx:14-82`) variant centered donut `size={140} data=[Full #12B76A, Partial #F79009, None #F04438]` + overlay `text-3xl font-bold {pct}% + text-[10px] font-bold uppercase "Covered"` via `-mt-20` centering + `StatRow w-2 h-2 rounded-full bg-ois-* + text-xs`.
- `CoverageGapCard` (`CoverageGapCard.tsx:15-62`) — `Card flex flex-col h-full border-ois-border` + header `p-4 border-b bg-ois-bg/30` + `w-8 h-8 rounded-lg bg={meta.bg} color={meta.color} AlertTriangle size={18}` + `text-sm font-bold {label}s + text-[10px] font-bold uppercase "{gapCount} Unmonitored CIs"` + `Critical px-2 py-0.5 rounded bg-ois-danger text-white text-[10px]` + body suggested rules `text-[10px] font-bold uppercase tracking-widest + p-2 rounded bg-ois-bg border hover:border-ois-primary group + ChevronRight size={12}` + footer `p-3 bg-ois-bg/30 border-t Button variant="primary" size="sm" w-full gap-2 text-xs font-bold h-8 Plus size={14} "Add Base Monitoring"`.

### 8.5 `AlertRouteCard.tsx:14-60` / `EscalationStepCard.tsx:14-59`

- `AlertRouteCard` — `Card p-3 cursor-pointer transition-all border outline-2 outline-transparent` — active `border-ois-primary shadow-md ring-1 ring-ois-primary` else `border-ois-border hover:border-ois-primary/30` + header `flex items-start justify-between mb-2 text-sm font-bold + text-[10px] font-bold uppercase tracking-wider {team.name||Unassigned} + MoreHorizontal size={14} p-1 hover:bg-ois-bg` + channels row `flex items-center gap-1.5 mt-3 w-6 h-6 rounded bg-ois-surface-muted flex items-center justify-center text-ois-text-muted Icon size={12} (Mail/MessageSquare/Phone/Webhook/Bell)` + `ml-auto text-[10px] font-bold text-ois-text-subtle ArrowRight size={10} "{n} Step(s)"`.
- `EscalationStepCard` — `Card p-0 border-ois-border overflow-hidden group` + flex `flex items-stretch` → grip rail `w-10 bg-ois-bg border-r flex flex-col items-center py-3 gap-2 GripVertical size={14} text-ois-text-subtle cursor-grab + text-xs font-bold {index+1}` → body `flex-1 p-4 flex flex-col md:flex-row md:items-center gap-4` → `space-y-2 Clock size={14} text-ois-text-subtle "After {delay===0?Immediately:{n} minutes}" + flex flex-wrap gap-2 User size={12} bg-ois-primary-pale text-ois-primary rounded px-2 py-1 text-xs font-medium + Users size={12} bg-ois-info-pale text-ois-info rounded border border-ois-info/20` → delete `p-2 text-ois-text-subtle hover:text-ois-danger hover:bg-ois-danger-pale rounded-lg md:opacity-0 group-hover:opacity-100 Trash2 size={16}`.

### 8.6 `RuleStatusToggle.tsx:11-42` / `RuleQueryDisplay.tsx:10-20`

- `RuleStatusToggle` — `button relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ois-primary focus:ring-offset-2 {enabled? bg-ois-success : bg-ois-border-strong} {sm h-4 w-8 : md h-6 w-11}` + knob `pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 {enabled? translate-x-4/5 : translate-x-0} {sm h-3 w-3 : md h-5 w-5}` — `onClick stopPropagation onToggle(!enabled)`.
- `RuleQueryDisplay` — `flex items-start gap-2 p-2 bg-ois-bg border border-ois-border rounded font-mono text-[11px] text-ois-text-muted leading-relaxed group` + `Terminal size={12} mt-0.5 shrink-0 text-ois-text-subtle group-hover:text-ois-primary + span break-all {query}`.

### 8.7 `Event*` badges — `EventSeverityBadge`, `EventTypeBadge`, `EventStatusBadge/Pill`, `EventSourceChip`

All badges: `inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border` with **inline `style` colors from `lib/constants.ts`** (not `bg-ois-*` classes), `borderColor = {color}20`.

| Component | File | Meta source | Classes + style |
|-----------|------|-------------|-----------------|
| `EventSeverityBadge` | `EventSeverityBadge.tsx:10-27` | `Severity P1-P4` | `px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider` — P1 `bg-ois-sev-p1 text-white border-ois-sev-p1 (#B42318)`, P2 `bg-ois-sev-p2 text-white`, P3 `bg-amber-100 text-amber-700 border-amber-200`, P4 `bg-emerald-100 text-emerald-700 border-emerald-200` |
| `EventTypeBadge` | `EventTypeBadge.tsx:13-33` | `eventTypeMeta` `informational #475467/#F1F3F7 Info`, `warning #DC6803/#FFFAEB AlertTriangle`, `exception #B42318/#FEF3F2 AlertOctagon` | `gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border + Icon size={10}` — `style backgroundColor=meta.bg color=meta.color borderColor={color}20` |
| `EventStatusBadge` | `EventStatusBadge.tsx:12-36` | `eventStatusMeta` `open #B42318/#FEF3F2/#F04438`, `acknowledged #DC6803/#FFFAEB/#F79009`, `resolved #067647/#ECFDF3/#12B76A`, `suppressed #475467/#F1F3F7/#98A2B3` | same pill + dot `w-1.5 h-1.5 rounded-full backgroundColor=meta.dot` |
| `EventStatusPill` | `EventStatusPill.tsx:11-29` | same | `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase` — `backgroundColor/meta.bg color/meta.color border 1px solid {color}20` |
| `EventSourceChip` | `EventSourceChip.tsx:13-28` | `eventSourceMeta` `prometheus Activity`, `opentelemetry Telescope`, `log_pattern FileText` etc. | `inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-ois-bg border border-ois-border text-[10px] font-bold text-ois-text-muted uppercase + Icon size={10}` |

Primitives backing (shareable) — `StatusRing.tsx:21-58` 14px SVG glyphs (`open` empty `stroke #98A2B3`, `acknowledged` half `fill #1F4FD4`, `resolved` filled `#12B76A` + check, `closed` dashed `strokeDasharray 2 2`) + `Dot.tsx:15-50` `DotVariant success/warning/danger/info/muted` → `bg-ois-*` + sizes `sm 6px / md 8px / lg 10px` + pulse `animate-ping opacity-60` + `SeverityStripe.tsx:11-37` `border-l-[3px] borderLeftColor per P1-P4`.

---

## 9. Tokens — `src/index.css:7-59`

Wajib pakai token — jangan hardcode hex di luar inline severity (lihat `docs/ui/design-tokens.md`).

| Category | Tokens used in monitoring | Classes |
|----------|---------------------------|---------|
| Brand | `ois-primary #1F4FD4`, `ois-primary-hover #1A42B5`, `ois-primary-pale #EEF2FF` | `bg-ois-primary`, `hover:bg-ois-primary-hover`, `bg-ois-primary-pale`, `text-ois-primary`, `border-ois-primary`, `ring-ois-primary`, `focus:ring-ois-primary` |
| Surface | `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD` | `bg-ois-bg`, `bg-ois-surface`, `bg-ois-surface-muted`, `border-ois-border`, `border-ois-border-strong` |
| Text | `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3` | `text-ois-text`, `text-ois-text-muted`, `text-ois-text-subtle` |
| Semantic | `ois-success #12B76A` pale `#ECFDF3`, `ois-warning #F79009` pale `#FFFAEB`, `ois-danger #F04438` pale `#FEF3F2`, `ois-info #0BA5EC` pale `#F0F9FF` | `bg-ois-success`, `bg-ois-success-pale`, `text-ois-success`, etc. |
| Severity | `ois-sev-p1 #B42318`, `p2 #DC6803`, `p3 #DC6803` (same as p2 — `src/index.css:37`), `p4 #027A48` | used via `SeverityStripeRow` inline `COLOR[sev]` + `accentColor` inline + `EventSeverityBadge` |
| Radius | `ois-card 8px`, `ois-btn 6px`, `ois-badge 4px`, `ois-modal 12px`, `full 999px` | `rounded-ois-card`, `rounded-ois-btn`, `rounded-ois-badge`, `rounded-full`, `rounded-2xl` |
| Shadow | `ois-card 0 1px 2px rgba(16,24,40,0.04)`, `ois-card-hover 0 1px 3px …`, `ois-dropdown 0 12px 16px -4px`, `ois-modal 0 20px 24px -4px` | `shadow-ois-card`, `hover:shadow-ois-card-hover`, `shadow-ois-dropdown` |
| Font | `Plus Jakarta Sans / Inter` sans, `Geist Mono / JetBrains Mono` mono | `font-sans`, `font-mono`, sizes `text-[10px]/[11px]/xs/sm/base/xl/3xl/4xl`, `uppercase tracking-widest/tracking-wider/tracking-tight`, `tabular-nums` |
| Icon | `lucide-react` only | sizes `10/11/12/13/14/16/18/20/36/48` — do not mix heroicons |

Motion (`src/index.css:93-142`): `ois-fade-up 0.5s ease-out`, `ois-fade-in 0.6s`, `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1)`, `ois-shimmer 7s linear` — monitoring additionally uses `motion/react` `AnimatePresence` for pause banner + `translate-x` drawer; `transition-colors duration-500` for accent + `transition-all duration-500` for progress bars.

---

## 10. Behavior Notes

- **Data source:** All tabs read via `services/*` `useResource(() => service.list(), [])` + local optimistic state (`MonitoringRules`, `AlertRouting` keep `rules/routes` copy with `seededRef` to avoid overwriting edits on refetch).
- **Optimistic mutations:** `handleToggleRule` / `handleDeleteRule` / `handleSaveChanges` / `handleNewRoute` / `handleDeleteRoute` / `handleCreateOrUpdateRule` — all optimistically mutate local array, then `await service.update/create/remove`, then `refreshRoutes/refreshRules()` or rollback on catch + set `mutationError/saveError` banner.
- **RBAC guard:** `<Can module="monitoring" action="update">` gates New/Edit/Delete buttons (`useCan('monitoring','update')`); else show `read-only italic` or disabled with `title` explanation.
- **URL as truth for nav:** Tab selection via `NavLink` `isActive → border-ois-primary`; event detail via `navigate('/monitoring/events/{publicId}')` deep link survives refresh — no `activeTab useState`.
- **Export:** `EventStream.handleExport` builds CSV client-side with `Blob + URL.createObjectURL + a.click + revokeObjectURL` — no server endpoint.
- **Time reference:** `EventStream` uses pinned `referenceDate = new Date('2026-05-09')` + `subDays/isAfter` for filtering — not `Date.now()` (deterministic demo data).
- **Empty branches:** Each tab has distinct empty copy — Overview `"No active alerts — all clear."` with `CheckCircle2`; EventStream `"No events match your filters."` with `Reset`; Rules branches on `search||typeFilter||severityFilter||enabledFilter`; Coverage has `insight` fallback `"All critical CIs are covered"`.
- **Responsive:** Overview/EventStream/Coverage hide right rail `hidden lg:block/flex` + mobile replacements (`lg:hidden` Stats drawer / sticky top-24 card).

---

## 11. API Touchpoints

| Action | Endpoint (via `src/services/*`) | Used by |
|--------|----------------------------------|---------|
| List events | `GET /api/v1/monitoring/events` → `eventsService.list()` | `MonitoringLayout`, `MonitoringOverview (listActive)`, `EventStream` |
| Dashboard stats | `GET /api/v1/monitoring/events/stats` → `eventsService.dashboardStats()` | `MonitoringOverview` `{active,p1Open,p2Open,unacknowledged,rules,routing,coverage}` |
| Get event detail | `GET /api/v1/monitoring/events/:publicId` | `EventDetail.tsx` |
| List rules | `GET /api/v1/monitoring/rules` → `monitoringRulesService.list()` | `MonitoringRules`, `CoverageReport`, `AlertRouting (matchingRules)` |
| Create rule | `POST /api/v1/monitoring/rules` → `monitoringRulesService.create(payload)` | `MonitoringRules` wizard |
| Update rule | `PATCH /api/v1/monitoring/rules/:publicId` → `monitoringRulesService.update(publicId,{enabled,…})` | `MonitoringRules` toggle/wizard |
| Delete rule | `DELETE /api/v1/monitoring/rules/:publicId` → `monitoringRulesService.remove(publicId)` | `MonitoringRules` |
| List alert routes | `GET /api/v1/monitoring/alert-routes` → `alertRoutesService.list()` | `MonitoringRules`, `AlertRouting` |
| Create route | `POST /api/v1/monitoring/alert-routes` → `alertRoutesService.create({name})` | `AlertRouting` |
| Update route | `PATCH /api/v1/monitoring/alert-routes/:publicId` → `alertRoutesService.update(publicId,{name,description,enabled,matchExpression,channels,recipients,escalationSteps,quietHours})` | `AlertRouting` |
| Delete route | `DELETE /api/v1/monitoring/alert-routes/:publicId` → `alertRoutesService.remove(publicId)` | `AlertRouting` |
| List CIs | `GET /api/v1/cmdb/cis` → `cisService.list()` | `CoverageReport` |
| List services | `GET /api/v1/services` → `servicesService.list()` | `CoverageReport` |
| Socket.IO | `server/realtime.ts` join `tenant:{tenantId}` | Not yet wired for live event push — pause/frozen is local only |

All routes mounted under `server/app.ts:126` `requireAuth` → `withScopedDb` → `requirePermission` — `monitoring:update` required for mutations, else 403 `scope_violation`.

---

## 12. Design Preservation

1. **Light theme only.** Keep `ois-bg/surface/border/text` — do not import `terra wash / linear-card / data-theme` dark.
2. **Module Layout contract.** Keep `-m-6 + calc(100vh - 3.5rem) + flex-1 min-h-0` together. TopBar is `h-14` contract.
3. **Accent `w-1` inline severity** — `MonitoringLayout.tsx:23-33` `p1 #B42318 / p2 #DC6803 / else #1F4FD4` via `style={{backgroundColor}}` + `transition-colors duration-500` — not `border-l-*` + not `bg-ois-danger`.
4. **Tab active = `border-b-2 border-ois-primary text-ois-primary`** — not `bg-ois-primary` pill.
5. **`lucide-react` only**, no heroicons/phosphor; sizes `10-16` inline as documented.
6. **`motion` for overlays** (pause banner `height 0→auto`, stats drawer `x:'100%'→0`) — not CSS `transition` alone.
7. **Severity stripe = `SeverityStripeRow` `border-l-[3px]`** via `COLOR[sev]` (`src/components/ui/SeverityStripe.tsx:11-16`) — not left `w-*` div.
8. **`Card` base** `bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden` (`src/components/ui/Card.tsx:4-8`) — extend via `className`, do not recreate.
9. **Badges use inline hex from `lib/constants.ts`** (`#B42318/#FEF3F2` etc.) with `borderColor {color}20` — not `bg-ois-danger-pale` shortcuts for status/type.
10. **`ois-sev-p3 === p2 #DC6803`** intentional per `src/index.css:37` — document divergence; do not "fix" to different hue without token audit.

---

## 13. Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep spec — Module Layout (`-m-6`/`calc(100vh - 3.5rem)`/`w-1` accent `P1 #B42318`/`P2 #DC6803`/`#1F4FD4` + `NavLink border-ois-primary` + `<Outlet flex-1 min-h-0>`) + 5 tabs (Overview KPI strip + feed 8 + rail; EventStream action row/pause banner/filter pipeline/grouped sticky + `EventStreamStatsRail`/`DonutChart`; Rules `DataTable` 12 cols + wizard 3-step + test/delete modals + optimistic toggles; AlertRouting split-panel list `w-[400px]` + editor `rounded-2xl` 4 sections + `AlertRouteCard`/`EscalationStepCard`; Coverage hero + matrix + `CoverageHealthSidebar`/`CoverageGapCard` + sticky analytics) + primitives (`EventCard`/`SeverityStripeRow`/`StatusRing`/`Dot`/`Event*` badges/`RuleSparkline`/`RuleStatusToggle`/`RuleQueryDisplay`/`EventTimeline`) + `ois-*` tokens (`src/index.css:7-59`) + API touchpoints + preserve rules | `src/routes/monitoring/MonitoringLayout.tsx:26` · `src/routes/monitoring/EventStream.tsx:162` · `src/routes/monitoring/MonitoringOverview.tsx:13` · `src/routes/monitoring/MonitoringRules.tsx:309` · `src/routes/monitoring/AlertRouting.tsx:405` · `src/routes/monitoring/CoverageReport.tsx:33` · `src/components/monitoring/EventCard.tsx:51` · `src/components/monitoring/RuleSparkline.tsx:10` · `src/components/monitoring/EventStreamStatsRail.tsx:18` · `src/components/monitoring/CoverageHealthSidebar.tsx:14` · `src/components/ui/SeverityStripe.tsx:11` · `src/components/ui/StatusRing.tsx:21` · `src/components/ui/Dot.tsx:15` · `src/lib/constants.ts:52` · `src/index.css:7` |
