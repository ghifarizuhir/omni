# Entity Detail Page — 3-Column Detail Layout

Status: **Draft**
Used by: semua halaman detail `/:id` — Incident, Change, CMDB CI, Problem, Request, Release, Deployment, Monitoring Event, Improvement, Catalog Item, Application
Source: `docs/DESIGN-SYSTEM.md` §3-Column Detail Layout · `src/components/ui/Card.tsx:4-20` · `src/routes/incidents/IncidentDetail.tsx:55-66` `SectionCard` · `src/routes/changes/ChangeDetail.tsx:33-44` · `src/routes/cmdb/CMDBDetail.tsx:43-54` · `src/routes/problems/ProblemDetail.tsx:51-60` · `src/routes/requests/RequestDetail.tsx:331-338` · terra `_shared/entity-detail-page.md` (ref parity, adapted to `ois-*` tokens)
Tokens: `src/index.css:7-59` (`ois-*`)

---

## Purpose

Menyediakan shell konsisten untuk semua entity detail `/:id` di OIS. Tujuan: operator membuka entity apapun (incident, change, CI, problem, dsb) dan langsung mengenali **header pinned + 3 kolom dengan scroll independen** tanpa mempelajari layout baru. North star adalah `IncidentDetail` (`docs/DESIGN-SYSTEM.md:3`): jika ragu, cek file itu dulu.

Shared doc ini menghindari duplikasi spesifikasi 3-column di `docs/features/*.md` — page doc cukup `Ref: _shared/entity-detail-page.md` untuk layout, lalu fokus pada domain tabs/actions masing-masing.

Parity dengan terra `_shared/entity-detail-page.md`: struktur 3-column, `SectionCard`, nav row, tab bar, dan status dropdown dipertahankan — tapi OIS mengganti semua `terra-*`/`linear-*` dengan `ois-*` tokens light palette dan tanpa `data-theme` toggle (`docs/design/08-design-system.md:59`).

---

## Behavior

### 1. Outer wrapper — full-height flex

Semua detail page wajib negate `AppShell` padding dan fill viewport di bawah TopBar (`3.5rem = 56px`):

```tsx
// src/routes/incidents/IncidentDetail.tsx:459, src/routes/changes/ChangeDetail.tsx:125, src/routes/cmdb/CMDBDetail.tsx:157
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
  {/* header shrink-0 + body flex-1 min-h-0 */}
</div>
```

Rules:
- `-m-6` meniadakan `p-6` dari `AppShell` `<main>` — wajib untuk full-bleed. Jangan gunakan `p-6` wrapper di dalam detail.
- `flex-col` + `height: calc(100vh - 3.5rem)` — bukan `min-h-screen` atau `h-full`.
- `bg-ois-bg` (`#F7F8FA`) untuk outer — header/sidebars pakai `bg-white` / `bg-ois-surface` agar kontras (sidebar dimmed handling via `ois-surface-muted` bukan dark overlay).
- Variant `IncidentDetail:459` memakai `flex` (tanpa `flex-col`) dengan center+rail khusus + `BlastRadiusBackdrop` — dikecualikan sebagai north-star special case; page lain ikuti `flex flex-col` kanonik (`ChangeDetail:125`, `CMDBDetail:157`, `ProblemDetail:528`, `RequestDetail:884`).

### 2. Pinned header — `shrink-0 z-30`

```tsx
<div className="bg-white border-b border-ois-border shrink-0 z-30">
  {/* nav row */}
  {/* entity header with stripe */}
</div>
```

- `shrink-0` — header tidak pernah scroll. `z-30` agar border tetap di atas body saat scroll.
- `bg-white` (`ois-surface`) + `border-b border-ois-border` (`#E4E7EC`) — konsisten di semua detail (`IncidentDetail:467`, `ChangeDetail:128`, `CMDBDetail:160`, `ProblemDetail:531`).
- Jangan tambahkan `sticky` — pin dicapai via flex layout, bukan position sticky.

#### 2a. Nav row pattern

```tsx
// docs/DESIGN-SYSTEM.md:783-806
<div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
  <button onClick={() => navigate('/incidents')}
    className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
    <ArrowLeft size={15} /> Queue
  </button>
  <div className="flex items-center gap-2">
    <StatusDropdown status={status} onChange={handleStatusChange} />
    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
      <MoreHorizontal size={16} />
    </button>
  </div>
</div>
```

- Kiri: back link `text-sm text-ois-text-muted hover:text-ois-text` + `ArrowLeft 15`. Label = parent list (`Queue`, `Calendar`, `CMDB`, `Problems`). Klik → `navigate('/<parent>')` bukan `history.back()`.
- Kanan: `StatusDropdown` (lihat §2c) + overflow `MoreHorizontal 16` dengan popover `absolute right-0 top-full mt-1 min-w-[160px] bg-white border border-ois-border rounded-lg shadow-ois-dropdown z-20` (`ChangeDetail:149`, `CMDBDetail:214`). Isi overflow: `Copy ID` (`navigator.clipboard.writeText(publicId)`) + `Copy link` (`window.location.href`).
- Status control di-wrap `Can module action` dengan `fallback` italic read-only message jika tanpa permission (`IncidentDetail:477-485`, `ProblemDetail:542-549`).

#### 2b. Entity header with accent stripe

```tsx
// docs/DESIGN-SYSTEM.md:811-824
<div className="flex items-start gap-0">
  <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityColor }} />
  <div className="flex-1 px-6 py-4">
    {/* publicId mono, badges, h1, tags, meta */}
  </div>
</div>
```

- Stripe `w-1 self-stretch shrink-0` via inline `style={{ backgroundColor }}` — bukan Tailwind class. Warna tergantung entity:
  - Incident `PRIORITY_COLOR[priority]` P1 `#B42318` P2 `#DC6803` P3 `#F79009` P4 `#027A48` (`docs/DESIGN-SYSTEM.md:101-107`)
  - Change `RISK_COLOR[risk]` low `#12B76A` medium `#F79009` high `#F04438` critical `#B42318` (`ChangeDetail:27-29`)
  - CMDB `CI_TYPE_COLOR[type]` server `#1F4FD4` application `#0BA5EC` database `#DC6803` ... (`CMDBDetail:37-41`)
  - Problem `PRIORITY_STRIPE[severity]` P1 `#B42318` P2/3 `#DC6803` P4 `#027A48` (`ProblemDetail:36-38`)
  - Request `CATEGORY_COLOR[category]` access `#1F4FD4` etc. (`RequestDetail:26-33`)
- Konten header (`flex-1 px-6 py-4`):
  - Baris 1: `publicId` `font-mono text-xs font-semibold text-ois-text-muted` atau `font-mono text-sm font-bold text-ois-primary` (change), plus badges (`IncidentPriorityBadge`, `ChangeStatusPill`/`RiskBadge`, `CITypeIcon`+`CIStatusBadge`, `SeverityBadge`) dengan gap `gap-2 mb-1.5`.
  - Judul: `h1 text-xl font-bold text-ois-text leading-tight` (semua detail konsisten).
  - Tags: `flex flex-wrap gap-1.5` pills `text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full` (opsional, render hanya jika `tags.length>0`).
  - Meta line: `flex items-center gap-4 text-xs text-ois-text-muted` dengan `Clock 11px`, owner `font-medium text-ois-text`, created `formatRelative`.

### 3. Body — three independent scroll columns

```tsx
// docs/DESIGN-SYSTEM.md:749-777
<div className="flex flex-1 min-h-0">
  <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
    {/* SectionCards */}
  </aside>
  <div className="flex flex-col flex-1 min-w-0">
    <div className="border-b border-ois-border bg-white shrink-0 px-6">
      <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
        {/* tab buttons */}
      </nav>
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-5">
      {/* tab content */}
    </div>
  </div>
  <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
    {/* SectionCards */}
  </aside>
</div>
```

Key constraints:
- `min-h-0` pada `flex-1` body wajib — tanpa ini flex container overflow parent dan 3-col scroll trick gagal (`docs/DESIGN-SYSTEM.md:779`).
- Sidebars: `w-[280px] shrink-0 overflow-y-auto border-*-o is-border bg-white p-4 space-y-4` — **jangan** ubah width (280px adalah kontrak). `shrink-0` mencegah collapse. `overflow-y-auto` + global scrollbar 4px (`src/index.css:66-84`).
- Center: `flex flex-col flex-1 min-w-0` — `min-w-0` mencegah flex child overflow horizontal. Tab bar `shrink-0` (pin), content `flex-1 overflow-y-auto` (satu-satunya region yang scroll).
- Slim scrollbar: `width/height 4px`, thumb `#D0D5DD` hover `#98A2B3` (`src/index.css:71-81`). Tab bar dan horizontal containers tambahan `scrollbar-hide`.
- Incident special: center rail bukan tab bar melainkan timeline-first + `CollapsibleSection`; tetap `flex-1 min-w-0 relative` + `BlastRadiusBackdrop` di belakang — diperbolehkan sebagai exception north-star.

### 4. SectionCard pattern — satu-satunya card di detail

Canonical `SectionCard` didefinisikan **lokal** di tiap detail page (bukan export dari `Card.tsx`) — copy-paste pattern ini verbatim:

```tsx
// src/routes/incidents/IncidentDetail.tsx:55-66, src/routes/changes/ChangeDetail.tsx:33-44 (identik)
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

- `src/components/ui/Card.tsx:4-8` adalah base `Card` (`bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden`) — dipakai di list/overview, **jangan** campur `Card` dan `SectionCard` pada halaman detail yang sama (`docs/DESIGN-SYSTEM.md:339`).
- `CMDBDetail:43-54` identik. `ProblemDetail:51-59` variant `space-y-2` di body — diperbolehkan untuk list-heavy cards, tapi header tetap `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] uppercase tracking-widest`.
- `RequestDetail:331-338` menyebut `SideCard` — alias `SectionCard` dengan header selalu ada (tanpa conditional `title`).
- Do: gunakan `SectionCard` untuk semua sidebar dan tab content blocks. Jangan buat card custom dengan border/radius berbeda.

### 5. Tab bar — pinned, horizontal scroll

```tsx
<div className="border-b border-ois-border bg-white shrink-0 px-6">
  <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
    {tabs.map(tab => (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
        className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
          activeTab === tab.id ? 'border-ois-primary text-ois-primary font-bold'
                               : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong')}>
        {tab.label}
      </button>
    ))}
  </nav>
</div>
```

- Active: `border-b-2 border-ois-primary text-ois-primary font-bold` — jangan gunakan `bg` fill. Inactive: `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong`.
- Gap `gap-8` (changes/incidents/problems) vs `gap-6` (CMDB) — keduanya sah; konsisten dalam satu page.
- Count badge di label: `Approvals (3)`, `Conflicts (2)` — sertakan count untuk collections. Disabled tabs tidak ada di OIS saat ini; jika perlu, gunakan `opacity-50 pointer-events-none`.
- Scroll: `overflow-x-auto scrollbar-hide` — tab bar tidak wrap. CMDB punya 9 tabs, Change 8 tabs — wajib bisa scroll horizontal.
- `Tabs` component (`src/components/ui/Tabs.tsx`) tidak dipakai di detail pages — detail merender tab bar inline agar bisa pin + independent scroll (`docs/DESIGN-SYSTEM.md:393`).

### 6. StatusDropdown with dot indicators

```tsx
// src/routes/incidents/IncidentDetail.tsx:68-111
const meta = incidentStatusMeta[status]; // { label, color, dot, bg }
<button onClick={() => setOpen(v => !v)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border bg-white text-sm font-medium hover:bg-ois-surface-muted transition-colors"
  style={{ color: meta.color }}>
  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.dot }} />
  {meta.label} <ChevronDown size={14} />
</button>
{open && (
  <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-ois-border rounded-lg shadow-lg z-50 overflow-hidden">
    {transitions.map(s => (
      <button key={s} onClick={() => { onChange(s); setOpen(false); }}
        className={cn('flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-ois-surface-muted transition-colors',
          s === status && 'bg-ois-surface-muted font-semibold')}
        style={{ color: m.color }}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.dot }} />
        {m.label} {s === status && <span className="ml-auto text-xs opacity-60">current</span>}
      </button>
    ))}
  </div>
)}
```

- Trigger dot `w-2 h-2` (8px) `rounded-full shrink-0`. Popover `w-44` (atau `w-48` untuk problem) `shadow-lg`/`shadow-ois-dropdown`.
- Warna dari `incidentStatusMeta` / `problemStatusMeta` / `changeStatus` meta — jangan hardcode hex di component.
- Overlay close: `fixed inset-0 z-10/40` backdrop di belakang popover (`ChangeDetail:147`, `ProblemDetail:413`).

### 7. Sidebar content conventions

- **Left `w-[280px] border-r`**: `At a glance` `dl divide-y divide-ois-border -mx-4 -mb-4` dengan rows `flex items-center justify-between px-4 py-2.5 text-xs` (`ChangeDetail:215-232`, `ProblemDetail:590-614`). Label `text-ois-text-muted`, value `font-medium text-ois-text` atau pill/badge. Tambahan cards: `Risk Factors`, `Tech Assessment`, `Approvals` dots (`w-5 h-5 rounded-full` approve `bg-emerald-500` vs pending `bg-ois-border`), `Relationships` counts.
- **Right `w-[280px] border-l`**: `Quick Actions` `space-y-1.5`/`space-y-2` dengan max satu `primary` (`bg-ois-primary text-white hover:bg-ois-primary-hover`) dan lainnya `border border-ois-border text-ois-text hover:bg-ois-surface-muted` (`docs/DESIGN-SYSTEM.md:1107-1138`). Destructive `Cancel` dipisahkan `pt-1 border-t border-ois-border` + `text-ois-danger hover:bg-ois-danger-pale` (`ChangeDetail:815-821`). Watchers avatar `Avatar size xs` list.
- Saat `IncidentDetail` tidak punya left sidebar statis (center-first layout dengan `AboutRail` kanan) — dikecualikan sebagai north-star variant. Page baru harus ikuti kontrak 2 sidebars 280px kecuali ada justifikasi war-room.

### 8. Data lifecycle & RBAC

- **Fetch**: `useResource(() => service.get(publicId), [publicId])` dengan `loading` skeleton (`text-sm text-ois-text-subtle Loading…` + `py-24`/`py-20`). 404 → centered `AlertCircle/XCircle + title  + Back button` (`IncidentDetail:407-420`, `ChangeDetail:88-95`, `CMDBDetail:142-148`).
- **Inline edit**: draft state + `Save`/`Cancel` `Button sm` dengan optimistic `setEntity({ ...prev, ...patch })` → `service.update(publicId, patch)` → `refresh()` → revert on catch + `saveError` inline `text-xs text-ois-danger` (`CMDBDetail:113-137`, `ProblemDetail:695-707`, `IncidentDetail:573-596`).
- **RBAC**: `Can module action resource={resource(entity)} fallback={readOnlyItalic}`. Top status dropdown dan quick actions wajib gated. `withScopedDb` + `requireAuth` global (`server/app.ts:126`) menjamin `req.tenantId` ada — tanpa itu Prisma `tenantId=undefined` jadi no filter → cross-tenant leak (`AGENTS.md`). `ScopeViolationError` → 403 `{ error: 'scope_violation' }`.
- **Clippy**: `navigator.clipboard.writeText` tanpa fallback — cukup untuk modern browsers; jangan tambahkan `execCommand` legacy.

---

## Edge Cases

| Case | Expected behavior | Source |
|------|-------------------|--------|
| **Loading** | `flex items-center justify-center py-24/20 text-sm text-ois-text-muted "Loading…"` skeleton — bukan spinner fullscreen. Preserve header skeleton jika mau, tapi minimal text. | `ChangeDetail:86`, `CMDBDetail:140`, `ProblemDetail:473` |
| **404 Not found** | Centered `AlertCircle/XCircle 40px text-ois-danger/subtle` + `h2 text-lg font-bold` + `p text-sm text-ois-text-muted {id} does not exist` + `Button secondary → navigate('/parent')`. Jangan redirect otomatis. | `IncidentDetail:407-420`, `ChangeDetail:88-95` |
| **Null entity after load** | Guard `if (!rawEntity || !entity) return 404` setelah `rawEntity?.id` check — mencegah render dengan `undefined` stripe color. | `CMDBDetail:142`, `ProblemDetail:477` |
| **Empty sidebar cards** | Render SectionCard tetap, body `text-sm text-ois-text-subtle text-center py-6 italic "No CIs linked."` / `"No relationships"`. Jangan hide card sepenuhnya. | `IncidentDetail:617-619`, `ProblemDetail:815` |
| **Empty tab content** | Dua pattern: inline `text-sm text-ois-text-subtle text-center py-8 "No events match this filter."` atau full-panel `CheckCircle2 36px + message + primary CTA` (`Mark as resolved`). Pilih inline untuk filter miss, full-panel untuk action required. | `docs/DESIGN-SYSTEM.md:1180-1202` |
| **No tabs overflow** | Tab bar `overflow-x-auto scrollbar-hide` — swipe horizontal di mobile. Jangan `flex-wrap`. | `ChangeDetail:331`, `CMDBDetail:276` |
| **Missing stripe color** | Fallback `?? '#475467'` (muted) jika `CI_TYPE_COLOR[type]` miss. | `CMDBDetail:154`, `ProblemDetail:505` |
| **Edit mode error** | Optimistic revert ke snapshot + inline `saveError` `text-xs text-ois-danger` di nav row sebelah Cancel/Save. `saving` disables Save + shows `"Saving…"`. | `CMDBDetail:113-137` |
| **RBAC denied** | Show fallback italic `text-xs text-ois-text-subtle` bukan hide total — user paham kenapa read-only. StatusDropdown diganti `<span>` read-only. | `IncidentDetail:480-483`, `ProblemDetail:542-549` |
| **Tags empty** | Jangan render tag row sama sekali — header lebih compact. | `ChangeDetail:188-196`, `IncidentDetail:528-537` |
| **Clipboard fail** | Silent fail — `navigator.clipboard.writeText` tanpa toast. Jangan block action. Future: toast `bg-ois-primary text-white` 2s (`CMDBDetail` graph toast). | `ChangeDetail:153` |
| **Tenant leak guard** | Semua service call via `req.scoped.*` + `withScopedDb`. Jangan import `prisma`/`@prisma/client` di route files (`eslint no-restricted-imports` `server/routes/**/*.ts`). Exempt: `admin.ts`, `applications.ts` etc. (`AGENTS.md`). | `AGENTS.md`, `server/middleware/scopedDb.ts:19` |
| **Reduced motion** | Dismiss animasi `animate-in fade-in zoom-in` jika `prefers-reduced-motion` — handled globally di `src/index.css:93-125`. Jangan paksa animation di detail. | `src/index.css` |
| **Mobile narrow** | Sidebars tetap 280px di desktop; pada `<768px` consider collapse atau full-width stack — belum diimplement; saat ini detail mensyaratkan desktop (War Room fallback message). Jangan tambah responsive breakpoint tanpa audit. | `docs/features/incidents.md:142` |

---

## API Touchpoints

Ref: [`../../design/02-api-contract.md`](../../design/02-api-contract.md) — contract global ada di `docs/design/02-api-contract.md`.

Semua detail page mount di `/api/v1` di belakang `requireAuth` (`server/app.ts:126`) + `withScopedDb` + `requirePermission(...)` per-route. Errorhandler map `ScopeViolationError` → 403, Zod `issues` → 400.

| Entity | Route param | Hook / Service | Endpoint | Permission | Notes |
|--------|-------------|----------------|----------|------------|-------|
| Incident | `:incidentId` (`publicId`) | `incidentsService.get` | `GET /api/v1/incidents/:publicId` | `incident.read` | + `timeline`, `comments`, `setStatus` (`PATCH .../status`), `resolve` (`POST .../resolve`), `setLinks`, `addWatcher`, `promoteMajor` |
| Change | `:changeId` (`publicId`) | `changesService.get` | `GET /api/v1/changes/:publicId` | `change.read` | + `cancel` (`PATCH .../cancel` reason), `reschedule` (`PATCH .../reschedule`), `setTechnicalAssessment` (`PATCH .../tech-assessment`), paginated list via `GET /changes?page&pageSize` |
| CI | `:ciId` (`id` atau `publicId`) | `cisService.list` + find | `GET /api/v1/cis/:publicId`, `GET /cis/relationships`, `GET /cis/audit?ciId=`, `GET /services`, `PATCH /cis/:publicId` | `cmdb.read` / `cmdb.write` / `cmdb.audit.read` | `CMDBDetail` resolves via `mockCIs.find(c => c.id===ciId||c.publicId===ciId)` client-side; server `PATCH` optimistic |
| Problem | `:problemId` (`publicId`) | `problemsService.get` | `GET /api/v1/problems/:publicId` | `problem.read` | + link incident/change, promote KE, RCA — sebagian masih client-state sampai `server/routes/itsm.ts` write endpoints M7 |
| Request | `:requestId` (`id`) → `publicId` | `requestsService.list` → `comments(publicId)` | `GET /api/v1/requests`, `GET /requests/:publicId/comments`, `POST .../comments` | `request.read` / `request.approve` | `RequestDetail` resolves `publicId` via `find(r => r.id===requestId)` |
| Monitoring Event | `:id` | `monitoringEventsService` | `GET /api/v1/monitoring/events/:id` | `monitoring.read` | `EventDetail:monitoring/EventDetail.tsx` — follow same shell |
| Release / Deployment / Improvement / KB / Portal / App | `:id`/`:slug` | `releasesService`, `deploymentsService`, etc. | `GET /api/v1/releases/:publicId`, `.../deployments/:id`, `.../kb/:slug` | `release.read` etc. | Semua detail `/:id` baru **wajib** reuse shell ini, bukan bikin wrapper `-m-6` custom |

Real-time: `tenant:{tenantId}` + `entity:{publicId}` via `src/services/realtime.ts` Socket.IO — detail subscribe untuk auto-refresh (incident queue & detail sudah, others future). `server/realtime.ts` + `server/jobs` scheduler dikecualikan jika `API_ONLY=true`.

Scoped DB: jangan import `prisma` di route files — gunakan `req.scoped.<module>.*`. `TenantId undefined` tanpa `requireAuth` → no filter → leak. Selalu handle `ScopeViolationError` → 403 `{ error: 'scope_violation' }` (`server/scope/errors.ts:9`).

---

## Design Preservation

Wajib pertahankan saat refactor atau saat membuat detail page baru — diambil dari `docs/DESIGN-SYSTEM.md` + `src/index.css` + exemplar files:

1. **Tokens exclusively `ois-*`** — `ois-primary #1F4FD4`, `ois-primary-hover #1A42B5`, `ois-primary-pale #EEF2FF`, `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-success #12B76A` / pale `#ECFDF3`, `ois-warning #F79009` / pale `#FFFAEB`, `ois-danger #F04438` / pale `#FEF3F2`, `ois-info #0BA5EC` / pale `#F0F9FF`, `ois-sev-p1 #B42318` etc. (`src/index.css:7-39`). **Jangan** hardcode hex atau pakai `terra-*`/`linear-card` dark.
2. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` + body `p-4` (`docs/DESIGN-SYSTEM.md:320-332`). Satu pattern untuk semua sidebar & tab blocks.
3. **Outer wrapper** `-m-6 flex flex-col bg-ois-bg` + `height: calc(100vh - 3.5rem)` — jangan ganti ke `p-6` atau `min-h-screen`.
4. **Header pinned** `bg-white border-b border-ois-border shrink-0 z-30` dengan nav row `px-6 py-2 border-b` — jangan jadikan `sticky` atau hilang saat scroll.
5. **Sidebars** `w-[280px] shrink-0 overflow-y-auto border-ois-border bg-white p-4 space-y-4` — width adalah kontrak. `min-h-0` pada body flex adalah kunci scroll trick.
6. **Priority stripe** `w-1 self-stretch shrink-0` inline `backgroundColor` — jangan ganti ke gradient atau `border-l`.
7. **Tab bar** `border-b border-ois-border bg-white shrink-0 px-6` + buttons `py-4 px-1 border-b-2 text-sm font-medium` active `border-ois-primary text-ois-primary font-bold` inactive `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` + `scrollbar-hide` (`docs/DESIGN-SYSTEM.md:368-370`).
8. **StatusDropdown** dot `w-2 h-2 rounded-full` + `ChevronDown 14` + popover `w-44 rounded-lg border border-ois-border shadow-lg/shadow-ois-dropdown`.
9. **Typography**: IDs `font-mono text-xs text-ois-primary`, section labels `text-[11px] uppercase tracking-widest`, title `text-xl font-bold`, meta `text-xs text-ois-text-muted`, timestamps `text-xs text-ois-text-subtle` via `formatRelative`, tags `text-[11px] rounded-full bg-ois-surface-muted border`.
10. **Radius & shadow**: cards `rounded-ois-card (8px)`, badges `rounded-ois-badge (4px)`, buttons `rounded-ois-btn (6px)`, modals `rounded-ois-modal (12px)` (`src/index.css:55-58`); shadows `shadow-ois-card` / `shadow-ois-dropdown` / `shadow-ois-modal` — jangan pakai shadow arbitrary.
11. **Scrollbar** global 4px thumb `#D0D5DD` hover `#98A2B3` rounded full (`src/index.css:68-84`).
12. **Quick actions** `space-y-1.5` dengan max satu `primary` (`bg-ois-primary`) — lainnya `border-ois-border hover:bg-ois-surface-muted` (`docs/DESIGN-SYSTEM.md:1112`).
13. **No dark overlay** — `BlastRadiusBackdrop` radial subtle di IncidentDetail adalah satu-satunya backdrop dibolehkan; jangan reintroduce `linear-card` dark overlay.
14. **Icon set** `lucide-react` only (`ArrowLeft`, `MoreHorizontal`, `ChevronDown`, `Clock`, `Tag`, etc.) — size 11-16 konsisten.
15. **Scope & auth** — global `requireAuth` + `withScopedDb` + `requirePermission(...)` + `ScopeViolationError` 403 selalu on.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init shared spec — extract 3-column layout (outer `-m-6`/`calc(100vh-3.5rem)`/`min-h-0`/280px sidebars), `SectionCard` (`border ois-border` + header `text-[11px] uppercase tracking-widest` + `p-4`), nav row, stripe (`w-1 self-stretch`), tab bar (`border-b-2 border-ois-primary`), `StatusDropdown` dot, `ois-*` tokens (`src/index.css`), RBAC/`req.scoped` guard dari `DESIGN-SYSTEM.md` §3-Column + `IncidentDetail:55-66` + `ChangeDetail:33-44` + `CMDBDetail:43-54` + `Card.tsx:4-20`, parity terra `_shared/entity-detail-page.md` (migrasi `terra-*` → `ois-*`) | — |
