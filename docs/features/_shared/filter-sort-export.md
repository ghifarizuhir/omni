# Filter / Sort / Export

Status: **Draft**
Used by: semua list — Incidents (`/incidents`), Problems (`/problems`, `/kedb`), Service Requests (`/requests`), Portal Catalog (`/portal/catalog`), CMDB (`/cmdb` list/graph/audit), Monitoring Events/Rules (`/monitoring/events`, `/monitoring/rules`), Changes/Releases/Deployments (`/changes`, `/releases`, `/deployments`), Testing (`/testing/*`), Availability/Capacity (`/availability`, `/capacity`), Continuity (`/continuity` plans/tests), Measurement (`/reports`, `/metrics`), Improvements (`/improvement`), Inbox (`/inbox`), Applications (`/applications/catalog`), plus Analytics variants.

---

## Purpose

Satu kontrak cross-cutting untuk **discovery & actionability** di semua list view: bagaimana user mempersempit dataset (search + filter dropdown + pills + quick chips), mengurutkan (sortable header), dan mengeluarkan data (CSV export + bulk bar). Tujuannya mencegah duplikasi spec di `features/*.md` — page doc cukup `Ref: _shared/filter-sort-export.md` untuk pola umum, hanya mendokumentasikan field spesifik per-page.

Source of truth visual: `IncidentQueue.tsx` (bulk-rich), `EventStream.tsx` (time+quick chips + pause), `CMDBList.tsx` + `KEDB.tsx` (pill type filters), `MonitoringRules.tsx` (typed DataTable + Switch). Fondasi UI: `src/components/ui/FilterDropdown.tsx`, `src/components/ui/DataTable.tsx` + `Table.tsx`, `src/components/ui/Input.tsx`, `src/lib/download.ts`.

---

## Behavior

### 1 — Filter Bar Anatomy (canonical)

Setiap list mengikuti urutan yang sama:

```
┌──────────────────────────────────────────────────────────────────────┐
│  Search Input (flex-1 min-w-[200..320px] max-w-sm)                   │
│  + FilterDropdown(s) (1..5, h-8)                                     │
│  + Reset (if hasFilters, X 12px text-ois-text-subtle → ois-danger)   │
│  ─────────────────────────────────  split row ──────────────────────  │
│  Quick/Pill chips row (optional, flex-wrap gap-2, rounded-full)      │
│  Stats/Bulk bar (optional, appears conditionally)                     │
└──────────────────────────────────────────────────────────────────────┘
```

- Container: `flex items-center gap-2 flex-wrap` atau `flex flex-wrap gap-3`. Background `bg-white` atau `bg-ois-surface-muted` dengan `border-b border-ois-border` + `px-6 py-3 shrink-0`.
- Search kiri, dropdown tengah, Reset kanan. Jangan letakkan primary CTA di filter bar — pakai action row (§Module Layout) untuk `+ New`.
- Semua state filter = `useState` lokal + `useMemo filtered` (client-side saat ini). URL persist adalah **Phase 2** (lih. §Phase 2 Deferred).

### 2 — Search Input

**Wrapper pattern** (konsisten di `IncidentQueue:418-425`, `EventStream:248-255`, `CMDBList:231`, `ReleasesList:109`):

```tsx
<div className="relative flex-1 min-w-48 max-w-80">
  <Search size={13|14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
  <input
    placeholder="Search …"  // per-page, lih. inventory di bawah
    className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
  />
  {/* optional clear */}
  {query && <button onClick={() => setQuery('')}><X size={12} /></button>}
</div>
```

Alternatif via `<Input icon={<Search size={15}/>} />` (`src/components/ui/Input.tsx:16-25`): `h-9 w-full rounded-ois-btn border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:ring-ois-primary/20 focus:border-ois-primary disabled:opacity-50`, `icon` adds `pl-9`, `error` → `border-ois-danger`.

**Behavior:**

- Case-insensitive `lower.includes` pada keys per-page (lihat inventory §4).
- Tidak ada debounce global — `IncidentQueue` incubates debounce 300ms doc-note, implement saat ini direct `onChange`.
- Empty search = tidak ada filter. Trim whitespace sebelum match.
- CMDB unik: stringify attributes `JSON.stringify(attributes)` sehingga `hostname` di attributes bisa ketemu via search.

**Placeholders per-page:**

| Page | Placeholder | Keys |
|------|-------------|------|
| Incidents | `Search ID, title, assignee, CI…` | `publicId\|title\|assigneeName\|affectedCIPublicIds` |
| Problems/KEDB | `Search ID, title, tag…` / `Search by symptom, error message, CI name…` | `publicId\|title\|tags` ; KEDB full-text |
| Requests | `Search ID, title, requester…` | `publicId\|title\|requester` |
| Portal Catalog | `Search catalog…` | `name\|code` (suggestions chips when empty) |
| Monitoring Events | `Search title, message, CI ID…` | `title\|message\|publicId\|affectedCIPublicIds` |
| Monitoring Rules | `Search name, query, target…` | `name\|query\|target` |
| CMDB List | `Search by name, ID, attributes…` | `name\|publicId\|JSON(attributes)` |
| CMDB Audit | `Search audit by CI, actor, or field…` | `ciName\|publicId\|actor\|field` |
| Releases | `Search releases…` / `Search notes…` | `publicId\|componentName\|version\|name` |
| Deployments | `Search ID, component, commit…` | `publicId\|componentName\|commitSha\|commitMessage` |
| Testing Plans | `Search…` | `name\|publicId\|componentName` |
| Testing Cases | `Search title, ID, steps…` | `title\|publicId\|steps[].action` |
| Testing Runs | `Search plan, run ID, environment…` | `testPlanName\|publicId\|environment` |
| Inbox | `Search inbox…` | `title\|sender\|sourcePublicId\|summary` |
| Improvements | `Search initiatives…` | `title\|publicId\|ownerName\|tags` |
| DR Plans | `Search plan name or ID…` | `name\|publicId` |

### 3 — FilterDropdown (`src/components/ui/FilterDropdown.tsx:21-132`)

Single-select dropdown untuk filter bar dan form `fullWidth`.

**Props:**

| Prop | Type | Default |
|------|------|---------|
| `value` | `string` | required |
| `onChange` | `(val:string)=>void` | required |
| `options` | `FilterDropdownOption[]` `{value,label,count?}` | required |
| `placeholder` | `string` | `'Select…'` |
| `className` | `string` | — |
| `fullWidth` | `boolean` | `false` |

**Trigger** `FilterDropdown.tsx:51-77`:

```tsx
<button className="inline-flex items-center gap-2 h-8 pl-3 pr-2 text-sm font-medium rounded-lg border transition-all
  fullWidth && w-full justify-between
  open ? 'bg-white border-ois-primary ring-2 ring-ois-primary/20 text-ois-text'
       : ['bg-ois-surface-muted border-ois-border',
          hasValue ? 'text-ois-text' : 'text-ois-text-muted',
          'hover:bg-white hover:border-ois-border-strong']
  focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary">
  <span className="truncate">{displayLabel}</span>
  <ChevronDown size={13} className="shrink-0 transition-transform duration-150 open ? 'rotate-180 text-ois-primary' : 'text-ois-text-subtle'" />
</button>
```

- `hasValue = options.find(o=>o.value===value) !== undefined` → text color switch.
- `fullWidth` → trigger `w-full justify-between`, panel `left-0 right-0`, else `min-w-[160px] w-max max-w-[260px]`.

**Panel** `FilterDropdown.tsx:81-128`:

```
absolute top-full mt-1.5 z-50 overflow-hidden
bg-white border border-ois-border rounded-xl shadow-ois-dropdown
```

- Top accent `div.h-[3px].bg-ois-primary`.
- Items `w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left`:
  - Active: `bg-ois-primary/[0.05] text-ois-primary font-semibold` + `Check 13 text-ois-primary`
  - Inactive: `text-ois-text hover:bg-ois-surface-muted`
  - Label `truncate`, active `font-semibold` else `font-normal`
  - Count pill `inline-flex min-w-[20px] px-1.5 h-5 rounded-full text-[11px] font-medium` active `bg-ois-primary/10 text-ois-primary` else `bg-ois-surface-muted text-ois-text-subtle`
  - Missing check placeholder `w-[13px]`
- Dismiss: capture-phase `mousedown` outside `containerRef` → `setOpen(false)` — mencegah race open→close pada click yang sama.

**Count semantics:**

- `IncidentQueue.tsx:157-164` computes `statusCounts` dari `incidents` + inject `All → totalCount`.
- `EventStream` intentionally **tanpa count** di Status/Severity dropdown (Phase 1), tetapi quick filter chips punya count.

### 4 — Filter Chips / Pills (`rounded-full text-xs font-medium`) — DESIGN-SYSTEM.md §Filter Chips

Pola pill yang muncul di hampir semua list sebagai quick-filter atau type filter.

**Canonical** (`src/components/ui` docs + `ImprovementRegister:191`, `Testing:227/449`):

```tsx
<button className={cn(
  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
  active ? 'bg-ois-primary text-white border-ois-primary'
         : 'border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong bg-white'
)}>{label} {count !== undefined && <span>{count}</span>}</button>
```

**Varian terdeteksi:**

| Page | Chip set | Active style | Inactive style |
|------|----------|--------------|----------------|
| Monitoring Events | Quick `Active P1/P2 | Exceptions|Warnings|Informational|Last 24h` | `bg-ois-primary text-white border-ois-primary` | `bg-white border-ois-border text-ois-text-muted` + icon 11px + count `opacity-70 tabular-nums` |
| Incidents | `My open|S L A at risk|P1/P2|Last 24h|Customer-facing` (5) | same | `bg-white border-ois-border text-ois-text-subtle` |
| CMDB List | Type 8 + Criticality 4 (multi-select) | `bg-ois-primary text-white` + `count text-[10px]` + dot `w-1.5 h-1.5` colored by `ciTypeMeta.color` | `bg-white border-ois-border text-ois-text-muted` |
| Improvements Register | Type `All|Regression|Smoke…` + Priority `All + p0..p3` | `bg-ois-primary` / `bg-primary text-white` | `bg-ois-surface-muted border` |
| Capacity Thresholds | `All N | severity pills + Enabled/Disabled` | `bg-gray-800 text-white` (legacy) / `bg-ois-primary` (new) | `bg-white border-gray-300` |
| Availability SLAs | Status `meeting|at_risk|breached` | `border-primary-300 bg-primary-50` | `border-gray-200 bg-white` |

- Pilih `activeFont = font-semibold` untuk chip yang menumpuk count.
- Click toggle `active===chip ? null : chip` (radio) atau multi-select tergantung page (CMDB type = multi).
- Jangan pakai `Badge` untuk chip — `Badge` tidak ada interaction state.

### 5 — Sort

**Current reality:** `DataTable.tsx:5-59` adalah generic typed wrapper **belum sortable** — `Column<T>` hanya `{header, accessor, className?}` + `T extends {id:string|number}`. Empty state `colSpan` → `py-12 text-center text-ois-text-subtle italic No data available`. Header `TH: px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider` (`Table.tsx:20-21`).

Sort di OIS saat ini **page-own** (bukan DataTable prop):

- **IncidentQueue:205-210** — `PRIORITY_ORDER P1:0 P2:1 P3:2 P4:3` → `priority asc` then `createdAt desc`. Tidak ada click header (spec miss Phase 2).
- **IncidentAnalytics `IncidentAnalytics.tsx:108-135`** — `Top recurring CIs` table sortable 3 kolom (`publicId|count|lastIncident`) via `ciSort: {field,dir}` + `toggleCISort` + `SortIcon` (`ArrowUpDown` default → `ArrowUp|ArrowDown text-ois-primary` when active). Header button `flex items-center text-[11px] font-semibold uppercase tracking-widest hover:text-ois-text`.
- **ProblemList:237-247** — `handleSort` toggle `lastIncidentDate desc` default, header `ArrowUpDown`.
- **ExportAuditModal / Reports etc.** — no sort.

**Canonical sort header pattern (preservation target):**

```tsx
<th className="px-4 py-2.5 text-left">
  <button onClick={() => toggleSort('field')}
    className="flex items-center text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest hover:text-ois-text transition-colors">
    Label <SortIcon field="count" />
  </button>
</th>
// SortIcon
const SortIcon = ({field}) => ciSort.field !== field
  ? <ArrowUpDown size={12} className="text-ois-text-subtle ml-1 shrink-0" />
  : ciSort.dir === 'asc' ? <ArrowUp size={12} className="text-ois-primary ml-1" />
                         : <ArrowDown size={12} className="text-ois-primary ml-1" />;
```

- Sort direction default per domain: temporal `desc`, priority `asc` (P1 first), count `desc`, alpha `asc`.
- Phase 1: sort client-side via `useMemo`. Phase 2: persist `?sort=field:asc,field2:desc` + server `orderBy`.

### 6 — Time & Special Filters

- **Monitoring EventStream:23-27,43-53** — `TimeRange '24h'|'7d'|'30d'` (`Last 24h / Last 7 days / Last 30 days`) → `cutoff = subDays(ref '2026-05-09', days)` → `isAfter(firedAt,cutoff)`. Quick `last24h` applies extra `isAfter(subDays(...1))`. Controlled via `Button outline + ChevronDown` + absolute panel `right-0 min-w-[140px] bg-white rounded-lg border shadow-ois-dropdown`.
- **CMDB Health toggle** cyclic `all→operational→degraded→partial_outage→major_outage→maintenance` (`h-9 border rounded-lg px-2.5 py-1.5 text-xs`).
- **Inclusion toggle** portal/continuity etc. via extra `FilterDropdown`.

### 7 — Export CSV

Dua pola coexist (satukan ke Phase 2):

**A — Inline Blob per page** (EventStream:135-156, IncidentQueue bulkExport:252-270, IncidentAnalytics:137-172):

```ts
const headers = ['ID','Title','Severity', ...];
const rows = filtered.map(e => [
  e.publicId,
  `"${e.title.replace(/"/g,'""')}"`, // quote + escape "
  e.severity,
  // ...
].join(','));
const csv = [headers.join(','), ...rows].join('\n');
const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a'); a.href=url;
a.download = `events-${timeRange}-${new Date().toISOString().slice(0,10)}.csv`;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
URL.revokeObjectURL(url);
```

- IncidentQueue bulk export hanya untuk `selectedIds` (filtered by selection), lain full filtered.
- IncidentAnalytics adds MTTR minutes col, `formatDate` for created.
- Always escape `"` → `""`, wrap text fields dalam `"…"`, test for `",\n` via `/[",\n]/`.

**B — Helper `src/lib/download.ts:1-22`:**

```ts
export function downloadBlob(content:string, filename:string, mime:string) {
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export function toCSV<T extends Record<string,unknown>>(rows:T[], columns:(keyof T)[]):string {
  const escape = (v:unknown)=> v==null ? '' : /[",\n]/.test(s=String(v)) ? `"${s.replace(/"/g,'""')}"` : s;
  return [columns.map(escape).join(','), ...rows.map(r=>columns.map(c=>escape(r[c])).join(','))].join('\n');
}
// Usage expected: downloadBlob(toCSV(rows, ['publicId','title',...]), `export-${Date.now()}.csv`, 'text/csv;charset=utf-8;')
```

- `ExportGraphModal` (`ExportGraphModal.tsx:60`) reuses `downloadBlob` untuk graph PNG/SVG/JSON.
- `ExportAuditModal` (`ExportAuditModal.tsx:32`) untuk audit CSV/JSON.

**UX contract:**

- Export trigger: `Button variant="outline" size="sm" className="gap-1.5"` + `Download 13px` + label `Export`. Analytics variant `secondary`.
- Filename `kebab-case` + date `YYYY-MM-DD`.
- Export harus honor active filters (search+dropdown+quick chips+timeRange) — bukan full dataset.
- Phase 2: server `GET /{resource}/export?{queryParams}` streaming (spec di `monitoring.md` `GET /events/export` not yet wired).

### 8 — Bulk Bar & Selection (Incidents exemplar)

`IncidentQueue:216-237,500-561` — reference implementation untuk semua list yang butuh bulk:

- State `selectedIds:Set<string>` + helpers `allSelected = filtered.every(id in set)` → `toggleAll` (select filtered only) / `toggleOne` (immutable copy Set).
- UI: header checkbox `CheckSquare/Square 14px text-ois-primary|subtle opacity-0 group-hover:opacity-100`; row `border-l-[3px]` colored by `severity` + `selected && bg-ois-primary/5`; row click vs checkbox `stopPropagation`.
- Bulk bar appears **only when `selectedIds.size>0`**:

```tsx
<div className="px-6 py-2 bg-ois-primary/5 border-b border-ois-primary/20 flex items-center gap-3 shrink-0">
  <span className="text-sm font-medium text-ois-primary">{n} selected</span>
  <div className="flex gap-1.5">
    <button className="px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10">Assign</button>
    <FilterDropdown value="" placeholder="Change priority" options={bulkPriorityOptions} />
    <button>Tag</button><button>Close</button><button onClick={handleBulkExport}>Export</button>
  </div>
  <button className="ml-auto text-xs text-ois-text-subtle hover:text-ois-text" onClick={clear}>Clear</button>
</div>
```

- Actions: Assign (`UserPickerModal` → `assign`), Priority (`FilterDropdown` inline), Tag (modal input → merge `Array.from(new Set([...tags, tag]))` → `update`), Close (confirm `Confirm` → `setStatus closed`), Export (bulk selected only).
- Optimistic update `setIncidents(prev=>prev.map(c=>…))` + `Promise.allSettled` per-incident + `reportBulkResults` → error banner `bg-ois-danger/5 border-ois-danger/20 text-ois-danger text-xs` sticky above bulk bar + `refreshIncidents()` after.
- Permission: actions gated via `Can`/`filterReadable`; failure → `ScopeViolationError 403`.

### 9 — Pagination & URL Persistence (Phase 1 vs Phase 2)

- **Phase 1 (current):** semua filter client-side `useState`, filter via `useMemo`, tidak ada URL sync (kecuali `CmdbShell ?view=list|graph` dan `?ci|focus` untuk graph). Pagination server ada (`?page=&pageSize=` via `parsePagination` — `server/routes/incidents.ts:20-24`, `itsm.ts`, `cmdb.ts`) tapi client `useResource list()` load all then slice `visibleCount 25 + Load 25 more` (EventStream:342-349).
- **Phase 2 (contract):** `useSearchParams` sync `?q=&status=&priority=&chip=&time=&sort=&page=&pageSize=` — contoh aspirational di `portal/Catalog searchParams.get('q')`, `Measurement reports ?type=&freq=`. Filter change → `setSearchParams` + `replace` (jangan push tiap keystroke — debounce 300ms). Deep-link harus restore filters. `DataTable` virtualized `limit 50`.

### 10 — Empty / Loading / Error

- Empty filtered: `text-center py-12` + icon `List 36px text-ois-text-subtle` atau `Filter 40px` + `No {resource} match filters` + `Button outline Reset filters` + CTA `+ Create`. Inbox variant `InboxEmptyState all_caught_up vs no_selection`.
- `DataTable` default empty `TD colSpan columns.length py-12 italic No data available` (`DataTable.tsx:50-53`) — pages biasanya override dengan `EmptyState` component terpisah.
- Loading: skeleton rows `shimmer 5-8` atau `Table skeleton` — jangan memakai spinner full-page di list.

---

## Edge Cases

- **Race open→close FilterDropdown:** capture-phase `mousedown` handler (`FilterDropdown.tsx:34-41`) dibutuhkan — bubbling click akan fire `onClick toggle` + `document click` di tick yang sama tanpa capture.
- **FullWidth collision:** filter bar dengan `flex-wrap` + multiple `FilterDropdown fullWidth=false` harus diberi `min-w-[160px]` panel — `fullWidth` hanya untuk form field (`DynamicField select`), jangan dipakai di toolbar (akan stretch full row).
- **Search vs quick chip mutual exclusion:** `IncidentQueue p1p2|my_open|…` exclusive via `quickFilter: null|value` toggle. Pastikan `quickFilter` dan `statusFilter/priorityFilter` tidak saling overwrite — spec `applyQuickFilter` applied sebelum status/priority di `filtered` memo.
- **Export with 0 rows:** return CSV header only — jangan trigger `download` kosong tanpa header. Tombol tetap enabled (header-only export legitimate).
- **Bulk optimistic revert:** jika `Promise.allSettled` ada rejected, `refreshIncidents()` sudah mengembalikan canonical state — jangan manual revert optimistic di catch.
- **Scope leak tanpa session:** global `requireAuth` (`server/app.ts:126`) harus ada — `FilterDropdown` tanpa auth akan expose filter tapi `list` API 401; UI harus render empty state bukan crash.
- **Large dataset (>500 nodes graph / >100 incidents):** fallback ke server pagination + `pageSize 20` — client filter `includes` pada `JSON(attributes)` menjadi mahal, pindah ke server query (`?q=`) di Phase 2.
- **Count stale:** `statusCounts` derived dari `incidents` (bukan filtered) — agar count reflect total bukan filtered subset; label `All (N)` tetap konsisten.
- **XSS di CSV:** title/message di-quote dan `"` di-escape `""` — spread `toCSV` helper sudah handle `",\n` escaping incl. object → `JSON.stringify`.
- **Accessibility:** `TH` sortable harus `aria-sort="none|ascending|descending"` dan `button` harus `aria-label="Sort by Title"` — belum ada di `Table.tsx`, tambahkan di upgrade sortable.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) + `server/routes/*`.

| Concern | Endpoint | Params | Permission |
|---------|----------|--------|------------|
| Incidents list+filters | `GET /api/v1/incidents?status=&priority=&q=&ciId=&problemPublicId=&page=&pageSize=` | `PRIORITY_ORDER` + `createdAt` sort | `incident.read` via `req.scoped.incidents.list` |
| Incidents bulk mutate | `PATCH /api/v1/incidents/:publicId` `{priority,tags}` + `POST .../assign` + `PATCH .../status` | per-id | `incident.write` / `incident.close` |
| Incidents export (planned) | `GET /api/v1/incidents/export?{filters}` | CSV stream | `incident.read` — TODO verify router |
| Events list | `GET /api/v1/events?status=&severity=&source=&type=&q=&page=&pageSize=` | `SEVERITY_ORDER P1→P4 + firedAt desc` default | `monitoring.read` via `req.scoped.events` |
| Events export (planned) | `GET /api/v1/events/export?{filters}` | CSV | missing (doc `monitoring.md:206` open) |
| Monitoring rules | `GET /api/v1/monitoring/rules?...` | type/severity/enabled | `monitoring.read` |
| CMDB list | `GET /api/v1/cis?page&pageSize&q=` | `q` covers `name\|publicId\|attributes` | `cmdb.read` via `req.scoped.cmdb.listCIs` |
| CMDB graph relationships | `GET /api/v1/cis/relationships` + `GET /api/v1/cis/:ciId/relationships` | incoming+outgoing | `cmdb.read` |
| CMDB audit | `GET /api/v1/cis/audit?ciId=&action=&source=&q=&from=&to=&page=&pageSize=` | action 8 + source 4 + cyclic date | `cmdb.audit.read` |
| Problems / KEDB | `GET /api/v1/problems?status=&severity=&source=&q=&page=&pageSize=` | `lastIncidentDate desc` default | `problem.read` via `itsm.ts` |
| Requests | `GET /api/v1/requests?status=&category=&q=&page=&pageSize=` | workflow state | `request.read` |
| KB browse | `GET /api/v1/kb?status=&contentType=&q=&sort=recent\|viewed\|helpful\|alpha&page=&pageSize=` | client sort after fetch today | `kb.read` |
| Testing plans/runs/cases | `GET /api/v1/testing?...&type=&status=&priority=&q=&page=&pageSize=` | `listByKind` Document + `qBool` | `testing.read` |
| Continuity plans/tests | `GET /api/v1/continuity/plans?q=&status=&service=` etc. | tabs + Search | `continuity.read` |
| Measurement reports | `GET /api/v1/reports?search=&type=&freq=` + `GET /api/v1/metrics?q=&category=&source=` | freq tabs 5, ReportBuilder | `measurement.read` |
| Improvement initiatives | `GET /api/v1/improvements?status=&category=&priority=&q=` | 8 statuses kanban+register | `improvement.read` |
| Applications catalog | `GET /api/v1/applications?q=&filter=member|not-member&page=&pageSize=` | `?q=&filter=` URL persist already | `application.read` (exempt route) |
| CSV helper (client) | `src/lib/download.ts#toCSV / downloadBlob` | `mime text/csv;charset=utf-8;` | — |

Semua list endpoint behind `requireAuth` (`server/app.ts:126`) + `withScopedDb` — tanpa `req.tenantId` → no filter → cross-tenant leak. Filter client harus konsisten dengan server `where` clause di Phase 2.

---

## Design Preservation

Wajib pertahankan saat refactor — sumber `src/components/ui/FilterDropdown.tsx`, `DataTable.tsx`, `Table.tsx`, `Input.tsx`, `src/index.css`, `DESIGN-SYSTEM.md`:

1. **`FilterDropdown` trigger `h-8 rounded-lg border text-sm font-medium`** — jangan ubah ke `h-9` atau `rounded-ois-btn` di toolbar (itu untuk form). State `open: bg-white border-ois-primary ring-2 ring-ois-primary/20` vs `default: bg-ois-surface-muted border-ois-border text muted|text`. Hover `bg-white border-ois-border-strong`. Icon `ChevronDown 13px` + rotate 180 + color `text-ois-text-subtle → ois-primary`.

2. **Panel `rounded-xl shadow-ois-dropdown border-ois-border overflow-hidden` + top accent `h-[3px] bg-ois-primary`** — jangan hapus strip (signature OIS). Max `min-w-[160px] w-max max-w-[260px]` (non-fullWidth). Items `px-3 py-2 text-sm` active `bg-ois-primary/[0.05] text-ois-primary font-semibold Check 13` + pill `min-w-[20px] h-5 rounded-full text-[11px] font-medium`.

3. **Filter chips `rounded-full text-xs font-medium border transition-colors`** — active `bg-ois-primary text-white border-ois-primary`, inactive `bg-white border-ois-border text-ois-text-muted hover:border-ois-border-strong hover:text-ois-text`. CMDB adds colored dot `w-1.5 h-1.5 rounded-full` by type meta + count `text-[10px]`. Jangan ganti ke `rounded-lg` atau `Badge` (no interaction).

4. **Search input** — `pl-8` gap untuk `Search 13-14px absolute left-2.5 text-ois-text-subtle` + `h-9 border-ois-border(-strong) rounded-lg bg-white focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary`. Placeholder per-page harus spesifik (bukan generik "Search…").

5. **`Table` tokens exact** — `THead bg-ois-surface border-b border-ois-border`, `TR group hover:bg-ois-surface-muted/50 transition-colors`, `TH px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider`, `TD px-4 py-4 text-sm text-ois-text`, `TBody divide-y divide-ois-border`. Empty `py-12 italic text-ois-text-subtle`.

6. **DataTable empty contract** — `No data available` italic sebagai fallback; page `EmptyState` component terpisah untuk CTA `Reset filters / Create`. Jangan ubah colspan logic.

7. **Sortable header** — `button flex items-center gap-1 text-[11px] uppercase tracking-widest` + `ArrowUpDown 12px subtle ml-1` ↔ `ArrowUp|Down 12px text-ois-primary`. TH controlled via controlled `field+dir`, default `desc` untuk temporal/count, `asc` untuk priority.

8. **Export** — client inline `new Blob([...], 'text/csv;charset=utf-8;')` + `a.download kebab-date.csv` + `append→click→remove→revoke`. Harus escape `"` → `""` dan wrap. Helper `toCSV`/`downloadBlob` untuk reuse; jangan handwritten `escape` divergen. Honor active filters (filtered list, bukan raw).

9. **Bulk bar** — `bg-ois-primary/5 border-ois-primary/20 px-6 py-2 flex gap-3` hanya saat `selectedIds>0`. Actions `px-2.5 py-1 text-xs font-medium text-ois-primary border border-ois-primary/30 rounded-md hover:bg-ois-primary/10`. Optimistic + `Promise.allSettled` + error banner `bg-ois-danger/5 border-ois-danger/20 text-ois-danger`.

10. **OIS token lock** — `ois-primary #1F4FD4 /hover #1A42B5 /pale #EEF2FF`, `ois-bg #F7F8FA`, `surface #FFFFFF #F1F3F7`, `border #E4E7EC /strong #D0D5DD`, `text #101828 #475467 #98A2B3`, `success #12B76A #ECFDF3 warning #F79009 #FFFAEB danger #F04438 #FEF3F2 info #0BA5EC #F0F9FF`, `sev P1 #B42318 P2/P3 #DC6803 P4 #027A48`, `shadow ois-card 0 1px 2px… /dropdown 0 12px 16px… /modal 0 20px 24px…`, `radius 8/6/4/12`, `font Plus Jakarta Sans / Geist Mono` (`src/index.css:3-59`) — no raw hex drift.

11. **Dokumen ini adalah shared contract** — page doc yang butuh filter/sort/export **wajib cross-ref** `Ref: _shared/filter-sort-export.md` bukan copy-paste spec. Update shared doc = update semua consumer (cek `Used by` sebelum edit).

---

## Phase 2 Deferred

- URL persistence semua list `?q=&{field}=&chip=&sort=&page=&pageSize=` via `useSearchParams` (+ debounce search 300ms, `replace` not `push`). Contoh sudah di `applications catalog ?q=&filter=` dan `portal ?q=` — seragamkan.
- Server-side filtering menggantikan client `useMemo includes` (`?q=` → `ilike` + `JSON(attributes)` indexed).
- Column customization / reorder / sort multi-field (`user_preferences` Document, cf. `incidents.md` & `admin.md` open item).
- Saved filter views (named views, default view).
- `GET /{resource}/export` CSV stream server (EventStream export spec legacy — `monitoring.md:206` open).
- DataTable upgrade: props `sortable?: boolean; sortKey?: string; sortDir?: 'asc'|'desc'; onSort?:(k)=>void` + `aria-sort` + virtualization `limit 50`.
- Row bulk selection across pages (server paginated selectedIds, not just visible).
- Accessibility: keyboard roving for chip bar, `role="toolbar"` for filter bar.

---

## Open Items

- [ ] Verify `GET /events/export` dan `GET /incidents/export` exist — legacy docs claim, router belum punya (tracked di `monitoring.md:206`, `incidents.md:224`).
- [ ] `IncidentQueue.tsx:63` `applyQuickFilter my_open` hardcode `assigneeId === 'u-001'` — harus `user.id` (open di `incidents.md:224`).
- [ ] Standarisasi `capacity Thresholds` pill active `bg-gray-800` → `bg-ois-primary` (consistency dengan chips lain).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — shared Filter/Sort/Export contract from `FilterDropdown.tsx:21-132`, `DataTable.tsx:5-59`, `Table.tsx:1-26`, `Input.tsx:11-32`, `download.ts:1-22`, `EventStream.tsx:135-311` (quick chips+export+pause), `IncidentQueue.tsx:58-561` (FilterDropdown+chips+bulk+export), `CMDBList.tsx:231` & pill inventory, sortable headers (`IncidentAnalytics:108-135`, `ProblemList:237`), `DESIGN-SYSTEM.md` §Filter Chips + §DataTable, `src/index.css:3-59` ois-* tokens — cross-cut for all lists | — |
