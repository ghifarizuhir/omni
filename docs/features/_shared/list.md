# List Toolbar & Shell (shared)

Status: **Draft**
Used by: **Incidents** (`/incidents`), **Problems** (`/problems`), **Requests** (`/requests`), **Changes** (`/changes` — list mode), **CMDB** (`/cmdb` — list mode), **Monitoring · Rules** (`/monitoring/rules`), **Monitoring · Events** (`/monitoring/events`), **Deployments**, **Releases**, **Availability**, **On-Call**, and every future `DataTable` consumer. Service Map / Graph modes and War Room are explicit exceptions (graph/editor canvas, not table shell).

---

## Purpose

Satu paragraf: OIS memiliki 7+ halaman yang semuanya menampilkan koleksi entitas sebagai tabel dengan toolbar filter di atas, baris yang dapat diklik, dan state kosong/loading yang konsisten. Tanpa kontrak shell bersama, tiap halaman menduplikasi primitive `FilterDropdown`/`DataTable`/empty-state dan drift dalam token, perilaku sort, dan semantik empty-vs-no-result. Dokumen ini mengkanonikalisasi shell list OIS — anatomy header → toolbar → quick-chips → bulk-bar → table → footer — sehingga page doc (`incidents.md`, `problems.md`, dst.) cukup `Ref: _shared/list.md` dan hanya mendokumentasikan kolom/endpoint spesifik domain mereka. Ref visual: [`../design/08-design-system.md`](../../design/08-design-system.md), [`../../src/index.css`](../../src/index.css).

Terra reference `terra-service-management/docs/features/_shared/list.md` memakai `ListPageHeader` dua-tier (tier-1 `h-9` sticky `bg-theme-bg/85 backdrop-blur-sm`, tier-2 `IconChip` + kicker + H1 + count chip). OIS **tidak** mengadopsi chrome dua-tier tersebut; semua list page OIS saat ini merender header flat (`bg-ois-surface`/`bg-white` dengan `border-b border-ois-border`) plus filter bar terpisah `bg-ois-surface-muted`. Keputusan ini dipertahankan — lihat §Design Preservation.

---

## Behavior

### 1. Anatomy (urutan vertikal kanonik)

```
┌──────────────────────────────────────────────────────────────┐
│ Page header  (shrink-0, border-b border-ois-border,         │
│               bg-ois-surface / bg-white)                     │
│  H1 text-2xl font-bold text-ois-text + subtitle              │
│  stats cluster "X total · Y active · Z …" text-sm            │
│  text-ois-text-subtle + primary CTA (New incident / Add CI)  │
│  [optional] contextual banner (MajorIncidentBanner,          │
│             conflict/freeze warning)                         │
├──────────────────────────────────────────────────────────────┤
│ Filter bar   (shrink-0, bg-ois-surface-muted,                │
│               border-b border-ois-border, px-6 py-3)        │
│  row-1: Search Input + FilterDropdown(s) + Reset/Clear       │
│  row-2: Quick-filter chips (rounded-full pills) +            │
│         result count "N of M shown" text-xs                  │
│         text-ois-text-subtle (kanan)                         │
├──────────────────────────────────────────────────────────────┤
│ Bulk / mutation bar (conditional, shrink-0)                  │
│  bg-ois-primary/5 border-b border-ois-primary/20 —          │
│  hanya render saat selectedIds.size > 0                      │
│  error banner: bg-ois-danger/5 border-ois-danger/20          │
│  (di atas bulk bar, persist setelah selection clear)         │
├──────────────────────────────────────────────────────────────┤
│ Table shell  (flex-1 overflow-auto)                          │
│  <table> thead sticky top-0 z-10                             │
│  bg-ois-surface-muted / bg-ois-bg border-b border-ois-border │
│  tbody divide-y divide-ois-border                            │
├──────────────────────────────────────────────────────────────┤
│ Footer       (shrink-0, px-6 py-2.5 border-t border-ois-border│
│               bg-ois-surface-muted) — "Showing N of M"       │
│               + Clear filters link text-ois-primary           │
└──────────────────────────────────────────────────────────────┘
```

* `IncidentQueue.tsx:384-643`, `RequestQueue.tsx:288-596`, `ProblemList.tsx:254-542`, `ChangeCalendar.tsx:176-245` (list mode), `CMDBList.tsx:186-359`, `MonitoringRules.tsx:454-625` semuanya mengikuti urutan ini dengan variasi minor (lihat §Per-page divergence).
* Page yang memakai `flex flex-col h-full min-h-0` + `calc(100vh - 3.5rem)` (`IncidentQueue`, `RequestQueue`) meng-offset `-m-6 -mx-6` untuk menetralkan `p-6` AppShell `<main>` — pola `Full-Height Flex` di `docs/DESIGN-SYSTEM.md` §Layout Patterns. `ProblemList` dan `CMDBList` memakai `space-y-* pb-10/12` tanpa full-height (scroll halaman, bukan scroll kontainer).

### 2. Page header

* **Token:** `bg-ois-surface` (atau `bg-white`), `border-ois-border`, `text-ois-text` H1 `text-2xl font-bold tracking-tight`, subtitle `text-sm text-ois-text-subtle` atau `text-xs text-ois-text-muted`.
* **Stats cluster:** `"{total} total · {active} active · {major} major"` dengan angka `font-semibold text-ois-text` dan separator `text-ois-border-strong` `·`. Contoh: `IncidentQueue.tsx:390-392`, `ProblemList.tsx:260-261`, `RequestQueue.tsx:295-310`, `ChangeCalendar.tsx:113-119`, `CMDBList.tsx:194-195`.
* **Actions kanan header:** `Button variant="primary" size="sm"` untuk create (gated `Can module="incident|problem|change|cmdb" action="create|update"`), `Button variant="outline|secondary|ghost"` untuk sekunder (KEDB, Analytics, View toggle). Max satu `primary` per header.
* **View toggle (khusus Changes/CMDB):** `ChangeCalendar.tsx:124-142` — `calendar|board|list` pill-group `border border-ois-border overflow-hidden`, aktif `bg-ois-primary text-white`, inaktif `bg-white text-ois-text-muted`. `CMDBList.tsx:208-223` — `tree|list` toggle `Grid`/`ListIcon` dengan state `bg-ois-primary text-white`.
* **Banner opsional:** `MajorIncidentBanner` (`IncidentQueue.tsx:409-411`), conflict/freeze warning (`ChangeCalendar.tsx:288-297`), scope chip `PageScopeChip` (`CMDBList.tsx:192`). Banner dirender di dalam header block, bukan sebagai sibling terpisah.

### 3. Filter bar (row-1)

* **Search input:**
  * `relative flex-1 min-w-52 max-w-72/80` dengan ikon `Search size={13-14}` absolute `left-2.5` `text-ois-text-subtle pointer-events-none`.
  * Input class kanonik: `w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary` — varian `text-xs h-9` di `ProblemList`/`MonitoringRules` dan `h-10/11` di `CMDBList`/`MonitoringRules` adalah deviasi yang ditoleransi (lihat §Preservation).
  * Placeholder scope: Incidents `"Search ID, title, assignee, CI…"`, Requests `"Search ID, title, requester…"`, Problems `"Search ID, title, tag…"`, Changes `"Search by title or ID…"`, CMDB `"Search by name, ID, attributes…"`, Rules `"Search name, query, target…"`.
  * Clear affordance: `X` button absolute right saat `search` truthy (`RequestQueue.tsx:336-339`, `ProblemList.tsx:333-335`).
  * Live client-side filter (debounce implisit via `useMemo` + `useState`; belum URL-persist — lihat Phase 2).
* **FilterDropdown(s):** `src/components/ui/FilterDropdown.tsx:21-132`
  * Trigger `h-8 pl-3 pr-2 text-sm font-medium rounded-lg border`, closed `bg-ois-surface-muted border-ois-border text-ois-text-muted` (atau `text-ois-text` jika ada value) `hover:bg-white hover:border-ois-border-strong`, open `bg-white border-ois-primary ring-2 ring-ois-primary/20 text-ois-text`, chevron `ChevronDown size={13}` `rotate-180 text-ois-primary` saat open.
  * Panel `absolute top-full mt-1.5 z-50 bg-white border border-ois-border rounded-xl shadow-ois-dropdown overflow-hidden` + `h-[3px] bg-ois-primary` accent strip. Item aktif `bg-ois-primary/[0.05] text-ois-primary font-semibold` + `Check size={13}`; count pill `bg-ois-primary/10 text-ois-primary` vs `bg-ois-surface-muted text-ois-text-subtle`.
  * Opsi membawa `count` opsional — dipakai `IncidentQueue` status counts, `ProblemList` source counts. Pemilihan menutup panel (`setOpen(false)`).
  * Variasi CMDB: health filter memakai cycling button (`CMDBList.tsx:238-249`) bukan `FilterDropdown` — legacy pattern yang dipertahankan.
* **Reset / Clear:**
  * `Reset` / `Clear` muncul hanya saat `hasFilters` truthy (`IncidentQueue.tsx:443-451`, `RequestQueue.tsx:394-401`, `ProblemList.tsx:362-369`).
  * Style: `flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-ois-text-subtle hover:text-ois-danger border border-ois-border rounded-lg bg-white hover:border-ois-danger/40` — varian `text-xs font-bold text-ois-primary hover:underline` di `CMDBList.tsx:252-255`.
* **Background token filter bar:** selalu `bg-ois-surface-muted` — kontras dengan header `bg-ois-surface`/`bg-white` dan table `bg-white` body. Jangan ganti ke `bg-ois-bg` kecuali Changes list `thead bg-ois-bg` (intentional header tint, bukan bar).

### 4. Quick-filter chips (row-2)

* **Token:** `px-3 py-1 rounded-full text-xs font-semibold border` active `bg-ois-primary text-white border-ois-primary` (atau varian semantic: `bg-ois-warning-pale border-[#F79009]/30` untuk SLA-at-risk, `bg-ois-success-pale border-ois-success/30` untuk my-team, `bg-ois-info-pale border-ois-info/20` untuk last-24h — lihat `RequestQueue.tsx:120-139` `QChip`). Inactive `bg-white text-ois-text-muted border-ois-border hover:border-ois-primary/40 hover:text-ois-primary`.
* **Incidents** (`IncidentQueue.tsx:457-481`): 5 chip `my_open / sla_risk / p1p2 / last_24h / customer_facing` dengan emoji prefix + count. Toggle `setQuickFilter(prev => prev===qf ? null : qf)` (mutually exclusive, bukan multi-select di Incidents). Count badges dihitung dari `incidents` unfiltered.
* **Requests** (`RequestQueue.tsx:405-436`): 4 `QChip` `my_approval / sla_risk / my_team / last_24h` dengan icon `Flame/ShieldAlert/Users/Radio`, count pill `bg-white/60` saat aktif else `bg-ois-surface-muted`.
* **Problems** (`ProblemList.tsx:281-319`): status strip `All + STATUSES` pill dengan warna `problemStatusMeta[s].color` saat aktif + source summary `By source:` inline `text-xs text-ois-text-subtle`.
* **CMDB** (`CMDBList.tsx:262-299`): type pills `ALL ITEMS + ciTypeMeta keys` dan criticality pills `ALL CRITICALITY + critical/high/medium/low` — dua baris horizontal `overflow-x-auto scrollbar-hide`.
* **Monitoring Rules** (`MonitoringRules.tsx:554-586`): `All + typeCounts` badges + stats suffix `Avg fires / Noisy / Never fired` di `bg-ois-bg border border-ois-border rounded-lg`.
* **Toggling rule:** `RequestQueue`/`IncidentQueue` quick chips saling eksklusif (satu `QuickFilter` enum); CMDB type+crit adalah dua dimensi independen (kombinasi). Keduanya valid — jangan normalisasi paksa ke satu model.

### 5. Bulk / mutation bar

* **Kemunculan:** hanya `IncidentQueue` yang punya bulk bar saat ini (`IncidentQueue.tsx:500-561`). Render kondisional `selectedIds.size > 0`, di atas table (`px-6 py-2 bg-ois-primary/5 border-b border-ois-primary/20 flex items-center gap-3 shrink-0`).
* **Konten:** `"{n} selected"` `text-sm font-medium text-ois-primary` + actions `Assign / Change priority (FilterDropdown) / Tag / Close / Export` masing-masing `px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10`. Confirm close menggantikan bar dengan `Close {n}? / Confirm (destructive) / Cancel`.
* **Error banner:** `bg-ois-danger/5 border-b border-ois-danger/20` di atas bulk bar (`IncidentQueue.tsx:487-498`), persist setelah `setSelectedIds(new Set())` — penting untuk partial-failure visibility (`reportBulkResults` via `Promise.allSettled`).
* **Page lain:** belum bulk bar. Requests/Problems/CMDB `selectedRows` hanya ada di `MonitoringRules.tsx:98` (checkbox column, tanpa bulk bar terhubung). Bulk adalah Phase-1 untuk Incidents saja.

### 6. Table shell — `DataTable` vs bespoke `<table>`

* **Primitive `Table` (`src/components/ui/Table.tsx:1-26`):**
  * `Table`: `w-full text-left border-collapse`
  * `THead`: `bg-ois-surface border-b border-ois-border`
  * `TBody`: `divide-y divide-ois-border`
  * `TR`: `group transition-colors hover:bg-ois-surface-muted/50`
  * `TH`: `px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider`
  * `TD`: `px-4 py-4 text-sm text-ois-text`
* **Generic `DataTable<T>` (`src/components/ui/DataTable.tsx:1-60`):**
  * Props: `columns: Column<T>[]` (`{ header, accessor, className? }`), `data: T[]`, `onRowClick?: (item:T)=>void`, `className?`. `T extends { id: string|number }`.
  * Wrapper `overflow-x-auto` + `<Table>` + empty-state row `colSpan={columns.length} py-12 text-center text-ois-text-subtle italic` → `"No data available"`.
  * `TR onClick={() => onRowClick?.(item)} className={onRowClick ? "cursor-pointer" : ""}` — row click kanonik.
  * Konsumen: `CMDBList.tsx:353-354` (list mode flat columns), `MonitoringRules.tsx:590-594` (12 kolom dengan custom accessor termasuk `RuleStatusToggle`, `RuleSparkline`, action buttons).
* **Bespoke tables (Incidents/Requests/Problems/Changes-list):** tidak memakai `DataTable` — mereka render `<table>` manual untuk kontrol granular: checkbox column, priority stripe `border-l-[3px]` + `borderLeftColor` severity, `sticky top-0 z-10` thead, group-hover `⋯` reveal, `StatusRing`/`SeverityBadge`/`SLAIndicator`, tag truncation (`visibleTags slice(0,2) + +extra`), avatar `w-5 h-5 rounded-full bg-ois-primary/20 text-ois-primary text-[9px] font-bold`. Contoh `IncidentQueue.tsx:568-610`, `RequestQueue.tsx:461-583`, `ProblemList.tsx:378-541`, `ChangeCalendar.tsx:220-243`.
* **Kolom kanonik vs bespoke:** `DataTable` cocok untuk tabel uniform tanpa stripe/selection. Untuk tabel dengan selection checkbox, priority stripe, atau hover-action, pakai bespoke `<table>` dan copy token dari `IncidentQueue`/`ProblemList` sebagai referensi (jangan re-derive).
* **Sticky header:** `thead className="sticky top-0 z-10"` + `bg-ois-surface-muted border-b border-ois-border` — dipakai Incidents/Requests (`IncidentQueue.tsx:569-590`, `RequestQueue.tsx:462-470`). `ProblemList.tsx:381` memakai `bg-ois-surface-muted/50` (varian). CMDB `DataTable` tidak sticky (header di dalam `Table` scroll container).
* **Row stripe:** `IncidentQueue.tsx:698-702` `className="group hover:bg-ois-surface-muted/60 cursor-pointer border-l-[3px]" style={{borderLeftColor: stripeColor}}` dengan map `{ P1:'#B42318', P2:'#DC6803', P3:'#DC6803', P4:'#027A48' }` keyed ke `incident.severity`. `ProblemList.tsx:438-443` identik (`SEVERITY_STRIPE`, `StatusRing`). Stripe adalah pattern list — jangan pakai di `DataTable` tanpa stripe support.
* **Hover reveal:** `IncidentQueue.tsx:797-800` `opacity-0 group-hover:opacity-100 transition-opacity` untuk `⋯` `MoreHorizontal`. Sama di `ProblemList.tsx:531-533`.
* **Min-width:** Incidents/Requests set `min-w-[900px]` pada `<table>` untuk mencegah column crush di viewport sempit — scroll horizontal via parent `overflow-auto`.

### 7. Sort, filter, dan search — semantik

* **Client-side filter pipeline (kanonik `IncidentQueue.tsx:182-214`):**
  1. `applyQuickFilter` → 2. status filter → 3. priority/source/category filter → 4. search `toLowerCase().includes` → 5. sort.
  * Requests `RequestQueue.tsx:241-275` pipeline identik: quick → search → status → category → stepType → sla → sort (boost myApproval first).
  * Problems `ProblemList.tsx:205-235` pipeline: search → status → source → owner → sort (keyed `lastIncidentDate|createdAt|relatedIncidentCount|severity`, dir toggle).
  * Inti: semua filter adalah AND; quick chip adalah mutually exclusive enum (kecuali CMDB dual-axis).
* **Sort default:**
  * Incidents: `PRIORITY_ORDER P1:0→P4:3` asc lalu `createdAt desc`.
  * Requests: boost `isMyApproval` (0) lalu `createdAt desc`.
  * Problems: default `lastIncidentDate desc`, toggle via header click `ArrowUpDown` `size={11}` `text-ois-primary` saat aktif else `text-ois-border`.
  * Belum persist ke URL — `useState` lokal. Phase 2 akan migrasi ke `?sort=&filter=` via `FilterDropdown` + chip.
* **Search scope:** selalu `publicId + title + secondary` (assignee name, requester, tags, CI IDs). Lowercase `includes`, bukan prefix. `trim()` sebelum match; empty trim = no filter.

### 8. Pagination & footer

* **Service contract:** `?page=&pageSize=` di semua list endpoint (`GET /api/v1/incidents?active&major&ciId&problemPublicId&page&pageSize` — lihat `incidents.ts:20-24` via `server/lib/pagination.ts`). Default `pageSize 20` (verify di masing-masing service; belum terdokumentasi seragam — track sebagai open item).
* **Footer UI:** hanya `RequestQueue.tsx:589-596` dan `CMDBList.tsx:355-357` yang merender footer `"Showing N of M" text-[11px]/text-xs text-ois-text-subtle` dengan `Clear filters` link `text-ois-primary hover:underline`. Incidents/Problems/MonitoringRules menampilkan count di header atau filter bar (`"X of Y shown"`), tanpa paginator visible — paginator component (`ListPagination` di terra spec) belum ada di OIS.
* **DataTable tanpa paginator:** `DataTable` tidak memiliki paginator built-in — paginasi ditangani page-level (belum di semua halaman).

### 9. Selection

* **Checkbox column:** header toggle `CheckSquare/Square size={14}` (`IncidentQueue.tsx:571-579`), row `CheckSquare/Square size={14}` dengan `opacity-0 group-hover:opacity-100` saat tidak selected. `MonitoringRules.tsx:313-324` memakai native `<input type="checkbox">` `rounded border-ois-border-strong text-ois-primary`.
* **State:** `Set<string>` (`IncidentQueue.tsx:116`), `string[]` (`MonitoringRules.tsx:98`). `toggleAll` = set semua `filtered` IDs; `toggleOne` = toggle single.
* **No URL persist untuk selection.**

### 10. Per-page divergence (yang dipertahankan)

| Page | Header | Filter bar | Quick chips | Table | Footer |
|------|--------|------------|-------------|-------|--------|
| Incidents | `px-6 pt-6 pb-4 border-b bg-white` + banner | `px-6 py-3 border-b bg-ois-surface-muted` + search + 2 dropdowns + Reset | 5 pills (emoji+count, exclusive) | bespoke `min-w-[900px]` sticky thead + `border-l-[3px]` stripe + checkbox + SLA | no footer pagination (count di header) |
| Requests | `-mt-6 -mx-6` full-height + `px-6 pt-6 pb-4 border-b bg-ois-surface` | `px-6 py-3 bg-ois-surface-muted` search + 4 dropdowns (status/cat/step/sla) + Reset | 4 `QChip` semantic colors + `"N of M"` count | bespoke sticky thead + `myApproval` `bg-ois-primary-pale/40` row wash | `Showing N` footer + Clear |
| Problems | `space-y-5` page-scroll (no full-height) | `flex gap-2` search + 2 dropdowns + Reset + `"N of M"` right | status strip color-filled active + `By source:` inline | bespoke `border border-ois-border rounded-ois-card shadow-ois-card` card-table + `border-l-[3px]` stripe + `ArrowUpDown` sort | no footer (count di bar) |
| Changes list | `flex justify-between` + view toggle `calendar|board|list` | `flex gap-2` search + 2 dropdowns (status/risk) | none (tabs via view toggle) | bespoke `Card` + `overflow-x-auto` + `ChangeRow` rows | no footer |
| CMDB | `space-y-6` + `PageScopeChip` + tree/list toggle + count | `flex gap-2` search `Input h-10` + health cycling button + Reset | type pills + criticality pills (dual axis) | tree mode default; list mode via `DataTable` + `Showing N of M` bar | `Showing N of M items` + CTA |
| Monitoring Rules | module layout + action row `New rule` | `Card p-4 bg-white/50 backdrop-blur-sm` search `h-11` + 3 dropdowns + Reset | `All + typeCounts` badges + `Avg fires/Noisy/Never fired` suffix | `DataTable` 12 cols + Card wrapper + sparkline | empty vs filtered-empty branching |

Drift antar halaman disengaja (density, card vs full-bleed, chip color). Jangan normalisasi paksa — kanonik di atas adalah superset, tiap page boleh subset.

---

## Edge Cases

* **Empty vs no-result — bedakan pesan:**
  * `IncidentQueue.tsx:565-566` `EmptyState` membedakan `hasFilters`: jika `true` → `Filter size={40} text-ois-text-subtle` + `"No incidents match"` + `Reset filters` + `Create incident`; jika `false` → `CheckCircle2 size={48} text-ois-success` + `"All clear — No active incidents."`
  * `RequestQueue.tsx:450-458`: `hasFilters` → `Clear filters` link, tanpa filter → `"All clear. No active requests."` `CheckCircle2 size={32} text-ois-success opacity-60`
  * `ProblemList.tsx:422-431`: selalu `"No problems match your filters"` + `Reset filters` (tanpa cabang all-clear karena problems tidak pernah kosong di mock world)
  * `CMDBList.tsx:302-308`: `SlidersHorizontal size={32}` + `"No matching CIs"` + `Clear filters`
  * `MonitoringRules.tsx:596-623`: branching `search||typeFilter||severity||enabledFilter` → `"Your filters didn't return…"` + `Reset all filters` vs `"Get started by creating your first rule…"` + `Create first rule` (`Radio size={48}`)
  * `ChangeCalendar.tsx:231-235`: `"No changes match the current filters."` (tanpa CTA all-clear)
  * Aturan: empty karena filter → ikon `Filter/SlidersHorizontal/Radio`, pesan "no match" + Reset; empty karena data kosong → ikon `CheckCircle2` success + pesan all-clear (boleh tanpa Reset). Jangan render `DataTable` empty row `"No data available"` bersamaan dengan `EmptyState` card — pilih satu.
* **Loading / skeleton:** `IncidentQueue`/`RequestQueue`/lainnya belum punya skeleton row dedicated; loading adalah `useResource` `data===undefined` → `filtered` kosong sementara → empty state berkedip. Skeleton `8 rows shimmer` dicatat di `incidents.md` sebagai aspirasi, belum diimplementasikan — guard dengan `if (!data) return <SkeletonTable />` sebelum `EmptyState` saat menambahkannya.
* **Error / retry:** `IncidentQueue.tsx:487-498` — `bulkError` banner `bg-ois-danger/5` + `Dismiss`; `refreshIncidents()` dipanggil setelah `reportBulkResults` untuk re-canonicalize dari server. Monitoring Rules memakai inline `mutationError` banner `border-ois-danger/30 bg-ois-danger/5` (`MonitoringRules.tsx:471-487`). Jangan auto-dismiss error — user harus Dismiss manual.
* **Optimistic update + rollback:** `IncidentQueue.tsx:297-381` — bulk handlers optimistically `setIncidents(prev=>map)` lalu `Promise.allSettled` per-incident; `reportBulkResults` menampilkan `"X of Y succeeded — Z failed (reason)"` dan `refreshIncidents()`. Single-row assign `handleRowAssignToMe` memakai `try/catch` + rollback via `refreshIncidents`. Pattern ini kanonik untuk semua bulk mutation.
* **RBAC-gated empty:** `filterReadable(user, 'incident'|'problem'|'request'|'change', ...)` (`IncidentQueue.tsx:99-106`, `ProblemList.tsx:155-162`, `RequestQueue.tsx:218-225`) mem-filter sebelum pipeline. Jika user tidak punya `incident.read`, queue render all-clear (bukan 403) — 403 hanya dari API `ScopeViolationError`.
* **Search edge:** `search.trim()` kosong → skip filter. Search case-insensitive `toLowerCase().includes`. Tags/CI IDs di-join sebelum match. Tidak ada regex atau token parsing — `field:value` search adalah Phase 2.
* **Overflow dan aksesibilitas:**
  * Table wrapper `overflow-auto` + `min-w-[900px]` mencegah kolom collapse. Horizontal scroll ditangani container, bukan per-kolom.
  * `thead sticky top-0 z-10` harus punya `bg` solid (`bg-ois-surface-muted`/`bg-ois-bg`) agar tidak transparan saat scroll.
  * `FilterDropdown` menutup via capture-phase `mousedown` di `document` (`FilterDropdown.tsx:33-41` `addEventListener('mousedown', handler, true)`) — jangan ganti ke `click` (race open→close).
  * Row `onClick` vs checkbox/actions: `e.stopPropagation()` wajib di checkbox cell dan `⋯` menu (`IncidentQueue.tsx:705`, `RequestQueue.tsx:577`, `ProblemList.tsx:531`).
* **Scope filtering:** `CMDBList.tsx:88-95` — `useScope()` + `useScopeUiEnabled()` memfilter `allCIs` sebelum `filteredCIs` jika `scope!=='all'` dan `scopeEnabled`. Scope pill `PageScopeChip` ada di header. List lain belum scope-aware — jangan tiru CMDB scope secara membabi buta sebelum `app-selector.md` final.
* **Pagination edge:** belum ada guard `page > totalPages` — jika `page` melampaui range, API mengembalikan array kosong yang akan dirender sebagai empty state (diperlukan redirect ke page 1 atau last page — track Phase 2).
* **DataTable empty contract:** `DataTable.tsx:50-54` merender `<TD colSpan={columns.length} py-12 text-center text-ois-text-subtle italic>` `"No data available"` saat `data.length===0`. Jika konsumen sudah merender `EmptyState` branching di luar `DataTable` (seperti `MonitoringRules.tsx:596`), jangan juga melewatkan array kosong ke `DataTable` tanpa guard — akan duplikasi empty UI.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md). Semua route di bawah `requireAuth` (`server/app.ts:126`) + `withScopedDb` (`server/middleware/scopedDb.ts:19`) — handler wajib `req.scoped.*`, bukan `prisma` langsung (lint `no-restricted-imports`). `ScopeViolationError` → 403 `{ error: 'scope_violation' }`.

| Konsumen | Hook / Service | Endpoint | Scope / Permission | Query / Catatan |
|----------|---------------|----------|------------------|-----------------|
| Incidents | `incidentsService.list()` | `GET /api/v1/incidents` | `req.scoped.incidents` · `incident.read` | `?active&major&ciId&problemPublicId&page&pageSize` (`server/routes/incidents.ts:20-24` + `server/lib/pagination.ts`) |
| Incidents | `incidentsService.setStatus` / `assign` / `update` / `comms` / `resolve` / `promoteMajor` / `standDown` | `PATCH /…/status` · `POST /…/assign` · `PATCH /…` · `POST /…/comms` · `POST /…/resolve` · `POST /…/promote-major` · `POST /…/stand-down` | `incident.write` / `incident.resolve` | Bulk via `Promise.allSettled` per `publicId` |
| Problems | `problemsService.list()` | `GET /api/v1/itsm/problems` | `req.scoped` via `itsmRouter` · `problem.read` | `?status&source&ownerId&page&pageSize` (client-side filter saat ini) |
| Requests | `requestsService.list()` | `GET /api/v1/itsm/requests` | `req.scoped` via `itsmRouter` · `request.read` | `?status&category&stepType&sla&page&pageSize` — SLA via `slaHours`/`slaStatus` per workflow step |
| Changes | `changesService.list()` | `GET /api/v1/itsm/changes` | `req.scoped` via `itsmRouter` · `change.read` | `?status&risk&type&page&pageSize` — calendar/board/list adalah view-mode, bukan endpoint berbeda |
| CMDB | `cisService.list()` · `cisService.relationshipsAll()` | `GET /api/v1/cmdb/cis` · `GET /api/v1/cmdb/relationships` | `req.scoped.cmdb` · `cmdb.read` | Ditambah `servicesService.list()` `GET /api/v1/cmdb/services` untuk group label; filter `type/criticality/health` client-side atas `mockCIs` |
| Monitoring Rules | `monitoringRulesService.list()` · `create` · `update` · `remove` | `GET /api/v1/monitoring/rules` · `POST /api/v1/monitoring/rules` · `PATCH /api/v1/monitoring/rules/:publicId` · `DELETE /api/v1/monitoring/rules/:publicId` | `req.scoped` via `monitoringRouter` · `monitoring.read` / `monitoring.update` | Optimistic toggle + rollback (`MonitoringRules.tsx:172-183`), pagination belum |
| Monitoring Events | `eventsService.list()` | `GET /api/v1/events` | `req.scoped.events` | `POST /events/ingest` fan-out realtime (`docs/design/09-realtime.md`) — Event Stream memakai filter terpisah |
| Availability / Releases / Deployments | `availabilityService` / `releasesService` / `deploymentsService` | `GET /api/v1/availability/*` · `GET /api/v1/itsm/releases` · `GET /api/v1/deployments` | `availability.read` / `release.read` / `deployment.read` | Pola list sama — toolbar + card-table |
| Global | — | `GET /health` · `GET /live` · `GET /ready` | no auth | `ready` cek `SELECT 1` |

**Kontrak paginasi global:** `?page=&pageSize=` (`docs/design/02-api-contract.md` §Conventions). Validasi Zod — `issues` → 400 `{ message:'Validation failed', issues }`. Rate limit `tenantLimiter` 600/min keyed `req.tenantId ?? ip`.

---

## Design Preservation

Pattern dari `src/components/ui/*` + `src/routes/*` yang **wajib dipertahankan** — jangan regresi saat menambah kolom atau mengganti `DataTable`:

1. **Token totalitas — tidak ada hex mentah.**
   * Selalu `ois-primary` `#1F4FD4`, `ois-bg` `#F7F8FA`, `ois-surface` `#FFFFFF`, `ois-surface-muted` `#F1F3F7`, `ois-border` `#E4E7EC`, `ois-border-strong` `#D0D5DD`, `ois-text` `#101828`, `ois-text-muted` `#475467`, `ois-text-subtle` `#98A2B3`, `ois-success`/`success-pale`, `ois-warning`/`warning-pale`, `ois-danger`/`danger-pale`, `ois-info`/`info-pale`, `ois-primary-pale` `#EEF2FF`, `ois-sev-p1` `#B42318` · `p2/p3` `#DC6803` · `p4` `#027A48`. Radius `rounded-ois-card 8px` · `rounded-ois-btn 6px` · `rounded-ois-badge 4px` · `rounded-ois-modal 12px`; shadow `shadow-ois-card` / `shadow-ois-dropdown` / `shadow-ois-modal`. Font `font-sans` Inter, `font-mono` JetBrains Mono untuk `publicId`. Semua didefinisikan di `src/index.css:3-59` `@theme`.

2. **Header flat, bukan terra two-tier.**
   * OIS header adalah `bg-ois-surface`/`bg-white` `border-b border-ois-border` flat. Jangan mengimpor `ListPageHeader` dua-tier terra (`h-9 sticky bg-theme-bg/85 backdrop-blur-sm` tier-1 + IconChip tier-2). Jika suatu halaman butuh sticky, maksimal `thead sticky top-0 z-10` pada table — bukan sticky page header.

3. **Filter bar `bg-ois-surface-muted`.**
   * Pembeda visual header vs filter bar adalah `bg-ois-surface` (header) vs `bg-ois-surface-muted` (bar). Pertahankan kontras ini; jangan samakan keduanya ke `bg-white`.

4. **FilterDropdown contract.**
   * Trigger `h-8 rounded-lg border` + panel `rounded-xl shadow-ois-dropdown` + `h-[3px] bg-ois-primary` accent strip. Jangan mengganti ke native `<select>` atau library lain tanpa menyamai panel anatomy (Check icon, count pill, hover `hover:bg-ois-surface-muted`).

5. **Pills / chips `rounded-full`.**
   * Quick-filter chips selalu `rounded-full` `text-xs font-semibold` dengan transisi border. Active `bg-ois-primary text-white border-ois-primary`; inactive `bg-white text-ois-text-muted border-ois-border`. Semantic active (warning/success/info) hanya untuk SLA/team/time chips — jangan pakai semantic untuk status filter utama.

6. **Table primitive dan sticky thead.**
   * `Table` `w-full text-left border-collapse`, `THead` `bg-ois-surface border-b border-ois-border`, `TBody` `divide-y divide-ois-border`, `TR` `group transition-colors hover:bg-ois-surface-muted/50`, `TH` `px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider`, `TD` `px-4 py-4 text-sm text-ois-text` (`src/components/ui/Table.tsx:4-25`). Thead header text selalu `text-[11px] uppercase tracking-widest/track-wider` — jangan ganti ke `text-sm`.

7. **Row stripe & status.**
   * Priority stripe `border-l-[3px]` dengan warna raw hex `style={{ borderLeftColor }}` — `P1 #B42318`, `P2/P3 #DC6803`, `P4 #027A48` (atau `#F79009` untuk P3 di design doc). `StatusRing` / `IncidentStatusPill` / `SeverityBadge` / `SLAIndicator` adalah komponen domain — jangan hardcode badge color di kolom accessor, pakai komponen tersebut.

8. **Row interaksi `group` + hover reveal.**
   * `TR className="group ..."` + anak `opacity-0 group-hover:opacity-100 transition-opacity` untuk `⋯` `MoreHorizontal`. Jangan pakai `visible` toggle via state untuk hover — CSS group-hover adalah pattern kanonik.

9. **ID mono + hover underline.**
   * `publicId` selalu `font-mono text-[11px]/text-xs text-ois-primary` dengan `group-hover:text-ois-primary` atau `hover:underline`. Contoh: `IDCell`, `ProblemList.tsx:447`, `RequestQueue.tsx:493`, `IncidentQueue.tsx:721`, `CMDBList.tsx:150`.

10. **Empty state branching.**
    * `hasFilters ? "No … match" + Reset : "All clear"` dengan ikon `Filter/SlidersHorizontal` vs `CheckCircle2 text-ois-success`. Jangan menyatukan kedua cabang — pesan harus menjelaskan apakah kosong itu "tidak ada data" atau "filter terlalu ketat".

11. **Selection state.**
    * `Set<string>` + `toggleAll`/`toggleOne` + bulk bar `bg-ois-primary/5` + error banner `bg-ois-danger/5`. Optimistic update + `Promise.allSettled` + `reportBulkResults` + `refresh…()` adalah pola kanonik (`IncidentQueue.tsx:289-306`).

12. **Accessibility & overflow.**
    * `thead sticky top-0 z-10` wajib `bg` opaque. `FilterDropdown` close via capture-phase `mousedown` (`FilterDropdown.tsx:40`). Checkbox/actions `e.stopPropagation()`. Table `min-w-[900px]` + container `overflow-auto` untuk mobile. Jangan menghapus `min-w` tanpa mengganti ke layout collapsible.

13. **Scope chip (CMDB only).**
    * `PageScopeChip` di `CMDBList.tsx:192` adalah satu-satunya scope UI di list — jangan menyalinnya ke halaman lain sebelum `featureFlag` `VITE_FEATURE_APP_SCOPE_UI` dan `_shared/app-selector.md` final.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep shared spec — anatomy header→toolbar→chips→bulk→table→footer, DataTable vs bespoke table, filter pipeline, edge cases (empty branching/optimistic rollback/RBAC/scope), API touchpoints per entity, 13 design-preservation rules (ois-* tokens, flat header vs terra two-tier) | — |

