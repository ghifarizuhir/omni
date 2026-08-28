# DataTable & Table — OIS (Technical)

Status: **Stable**
Source of truth: [`src/components/ui/DataTable.tsx`](../../src/components/ui/DataTable.tsx), [`src/components/ui/Table.tsx`](../../src/components/ui/Table.tsx)
Tokens: [`src/index.css`](../../src/index.css) · [`docs/ui/design-tokens.md`](./design-tokens.md) · [`docs/DESIGN-SYSTEM.md` § DataTable & Table](../../docs/DESIGN-SYSTEM.md#datatable--table)

> **Scope.** Deep spec untuk primitive `Table` (headless-ish) dan generic wrapper `DataTable<T>`. Technical, not aspirational — semua class dan interface di bawah adalah yang **benar-benar dipakai** di codebase, bukan target ideal. Boundary: token definitions tetap di `design-tokens.md`, visual intent di `design/08-design-system.md`.

---

## 1. Purpose

`Table` menyediakan 6 primitive atom (`Table`, `THead`, `TBody`, `TR`, `TH`, `TD`) dengan class OIS default dan full `className` passthrough via `cn()` (`src/lib/utils.ts`). `DataTable<T>` adalah typed wrapper di atas `Table` yang menerima `Column<T>[]` dan `T[]`, me-render header + body + empty state tanpa boilerplate. Dipakai untuk list dengan definisi kolom deklaratif (CMDB, Monitoring Rules, Problems, Requests).

---

## 2. Architecture

```
DataTable<T>                    Table.tsx primitives
┌──────────────────────┐       ┌──────────────────────────┐
│ <div overflow-x-auto>│──────▶│ Table  <table>           │
│  <Table>             │       │  THead <thead>           │
│   <THead><TR><TH>…   │       │  TBody <tbody>           │
│   <TBody>            │       │  TR    <tr>  group +     │
│    TR × N  or empty  │       │  TH    <th>  11px bold   │
│     TD × M           │       │  TD    <td>  14px text   │
│  </Table>            │       └──────────────────────────┘
│ </div>               │
└──────────────────────┘
```

- `DataTable` **selalu** membungkus `Table` dengan `div.overflow-x-auto` untuk horizontal scroll pada viewport sempit. Tidak ada `overflow-y` — scroll vertikal dikontrol oleh parent layout (mis. `flex-1 overflow-auto` atau `overflow-y-auto` di Module Layout).
- Key baris = `item.id` (constraint `T extends { id: string | number }`). Tidak ada `key` custom.

---

## 3. Primitive Layer — `src/components/ui/Table.tsx:1-26`

Semua primitive adalah `React.FC<HTMLAttributes<...>>` dengan spread `...props` sehingga semua native attributes (mis. `colSpan`, `onClick`) diteruskan. `cn(defaultClasses, className)` memastikan override di consumer menang.

| Primitive | Element | Default classes | Token ref | File:line |
|-----------|---------|----------------|-----------|-----------|
| `Table` | `<table>` | `w-full text-left border-collapse` | — | `Table.tsx:4` |
| `THead` | `<thead>` | `bg-ois-surface border-b border-ois-border` | `ois-surface #FFFFFF`, `ois-border #E4E7EC` | `Table.tsx:8` |
| `TBody` | `<tbody>` | `divide-y divide-ois-border` | `ois-border` | `Table.tsx:12` |
| `TR` | `<tr>` | `group transition-colors hover:bg-ois-surface-muted/50` | `ois-surface-muted #F1F3F7` @ 50% | `Table.tsx:16` |
| `TH` | `<th>` | `px-4 py-3 text-[11px] font-bold text-ois-text-subtle uppercase tracking-wider` | `ois-text-subtle #98A2B3`, 11px label scale | `Table.tsx:20` |
| `TD` | `<td>` | `px-4 py-4 text-sm text-ois-text` | `ois-text #101828`, 14px body scale | `Table.tsx:24` |

**Catatan:**
- `TR` memiliki `group` sehingga consumer bisa pakai `group-hover:*` di cell (dipakai `IncidentQueue` untuk checkbox `opacity-0 group-hover:opacity-100`).
- `THead` background `bg-ois-surface` (putih), bukan `bg-ois-bg` atau `bg-ois-surface-muted`. Konsisten di semua `DataTable` instance.
- `TH` memakai `tracking-wider` (bukan `tracking-widest` seperti SectionCard label) — ini adalah satu-satunya header tabel yang pakai `wider`.
- `TD` `py-4` (16px) lebih besar dari `TH` `py-3` (12px) — memberi breathing room untuk baris data.

---

## 4. DataTable Wrapper — `src/components/ui/DataTable.tsx:1-60`

### 4.1 Types

```ts
// src/components/ui/DataTable.tsx:5-9
export interface Column<T> {
  header: string;                      // plaintext header label
  accessor: (item: T) => ReactNode;    // render function — full control per cell
  className?: string;                  // forwarded to BOTH <TH> and <TD> for this column
}

// src/components/ui/DataTable.tsx:11-16
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;      // optional — adds cursor-pointer + click on <TR>
  className?: string;                  // forwarded to outer overflow wrapper div
}

// src/components/ui/DataTable.tsx:18
export function DataTable<T extends { id: string | number }>(props: DataTableProps<T>)
```

Constraint `T extends { id: string | number }` adalah hard requirement — data tanpa `id` tidak bisa dipakai. `id` dipakai sebagai React `key` di `DataTable.tsx:38` (`key={item.id}`), bukan `publicId`.

### 4.2 Props

| Prop | Type | Required | Default | Deskripsi |
|------|------|----------|---------|-----------|
| `columns` | `Column<T>[]` | ya | — | Definisi kolom; urutan array = urutan render |
| `data` | `T[]` | ya | — | Array items; kosong → render empty state |
| `onRowClick` | `(item: T) => void` | tidak | `undefined` | Jika ada: `<TR onClick={() => onRowClick(item)} className="cursor-pointer">` |
| `className` | `string` | tidak | `undefined` | `cn("overflow-x-auto", className)` pada wrapper div |

`Column<T>.className` diteruskan ke **kedua** `TH` (`DataTable.tsx:30`) dan `TD` (`DataTable.tsx:43`) — dipakai untuk width pin (`w-10`, `w-20`, `w-32`) dan alignment konsisten. Tidak ada prop terpisah untuk header vs cell.

### 4.3 Render Flow

```tsx
// src/components/ui/DataTable.tsx:24-59 (disederhanakan)
<div className={cn("overflow-x-auto", className)}>
  <Table>
    <THead>
      <TR>{columns.map((col, idx) => <TH key={idx} className={col.className}>{col.header}</TH>)}</TR>
    </THead>
    <TBody>
      {data.length > 0 ? (
        data.map(item => (
          <TR key={item.id} onClick={() => onRowClick?.(item)} className={onRowClick ? "cursor-pointer" : ""}>
            {columns.map((col, idx) => <TD key={idx} className={col.className}>{col.accessor(item)}</TD>)}
          </TR>
        ))
      ) : (
        <TR>
          <TD colSpan={columns.length} className="py-12 text-center text-ois-text-subtle italic">
            No data available
          </TD>
        </TR>
      )}
    </TBody>
  </Table>
</div>
```

Detail penting:

- Header `key={idx}` (index), bukan header string — aman karena columns static per render tetapi tidak stable jika columns reorder dinamis.
- Body `key={item.id}` — mensyaratkan `id` unik.
- Empty state adalah **satu `<TR>` dengan satu `<TD colSpan={columns.length}>`** — bukan komponen terpisah. Class `py-12 text-center text-ois-text-subtle italic` (`DataTable.tsx:51`) menggantikan inline empty `py-12` yang dipakai di `DESIGN-SYSTEM.md:606`.
- `onRowClick` tidak memiliki `stopPropagation` guard — consumer yang me-render interactive element di dalam cell (mis. checkbox, button) **harus** memanggil `e.stopPropagation()` sendiri (lihat `MonitoringRules.tsx:316-321` untuk checkbox di dalam accessor).

### 4.4 Wrapper Behavior

| Concern | Implementasi | Catatan |
|---------|-------------|---------|
| Horizontal overflow | `div.overflow-x-auto` | Tidak ada `scrollbar-hide` — scrollbar native 4px dari `src/index.css:67-84` visible |
| Vertical overflow | tidak di-handle | Parent yang bertanggung jawab (`flex-1 overflow-auto` atau `overflow-x-auto` wrapper tambahan) |
| Sticky header | tidak | `THead` tidak sticky; jika butuh pin, pakai bespoke table seperti `IncidentQueue` |
| Sorting / pagination / selection | tidak | Tidak ada built-in; consumer implement di luar (`MonitoringRules` mengelola `selectedRows` sendiri) |

---

## 5. Tokens

Semua token resolved via Tailwind 4 `@theme` di `src/index.css:3-59`. Jangan hardcode hex.

| Class dipakai Table/DataTable | Token | Value | Sumber |
|-------------------------------|-------|-------|--------|
| `bg-ois-surface` (THead) | `--color-ois-surface` | `#FFFFFF` | `index.css:14` |
| `border-ois-border` (THead, TBody divide) | `--color-ois-border` | `#E4E7EC` | `index.css:16` |
| `hover:bg-ois-surface-muted/50` (TR) | `--color-ois-surface-muted` | `#F1F3F7` @ 50% | `index.css:15` |
| `text-ois-text-subtle` (TH, empty) | `--color-ois-text-subtle` | `#98A2B3` | `index.css:22` |
| `text-ois-text` (TD) | `--color-ois-text` | `#101828` | `index.css:20` |
| `text-ois-text-subtle italic` (empty override) | — | — | `DataTable.tsx:51` + `index.css:22` |

Cross-ref: `docs/ui/design-tokens.md` §1.2 Surface, §1.3 Text, §4 Font Scale (11px TH / 14px TD).

---

## 6. Canonical Usage

### 6.1 CMDB List — `src/routes/cmdb/CMDBList.tsx:147-354`

`listColumns` (7 kolom) dipakai hanya di `viewMode === 'list'`:

```tsx
// CMDBList.tsx:147-184
const listColumns = [
  { header: 'Public ID', accessor: (ci: ConfigurationItem) => <span className="font-mono text-[11px] font-bold text-ois-text-subtle">{ci.publicId}</span> },
  { header: 'Name',      accessor: (ci: ConfigurationItem) => <span className="font-semibold text-ois-text">{ci.name}</span> },
  { header: 'Type',      accessor: (ci: ConfigurationItem) => (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ciTypeMeta[ci.type]?.color }} />
        <span className="capitalize text-xs font-medium">{ci.type.replace('_', ' ')}</span>
      </div>
    )},
  { header: 'Service',   accessor: (ci: ConfigurationItem) => {
      const svc = mockServices.find(s => s.id === ci.serviceId);
      return svc ? <span className="text-xs font-medium text-ois-text-muted">{svc.name}</span>
                 : <span className="text-xs text-ois-text-subtle italic">None</span>;
    }},
  { header: 'Env',       accessor: (ci: ConfigurationItem) => <span className="text-[11px] font-bold uppercase text-ois-text-muted tracking-tight">{ci.environment}</span> },
  { header: 'Health',    accessor: (ci: ConfigurationItem) => <StatusBadge status={ci.health} /> },
  { header: 'Updated',   accessor: (ci: ConfigurationItem) => <span className="text-xs text-ois-text-subtle">{formatRelative(ci.updatedAt)}</span> },
];

// CMDBList.tsx:353-358
<Card className="overflow-hidden bg-white">
  <DataTable columns={listColumns} data={filteredCIs} onRowClick={(ci) => navigate(`/cmdb/${ci.id}`)} />
  <div className="p-4 border-t border-ois-border flex items-center justify-between text-xs text-ois-text-subtle bg-ois-bg/50">
    <span>Showing {filteredCIs.length} of {allCIs.length} items</span>
  </div>
</Card>
```

Pattern: `Card overflow-hidden` membungkus `DataTable`. Footer count di luar `DataTable` (bukan bagian dari primitive).

### 6.2 Monitoring Rules — `src/routes/monitoring/MonitoringRules.tsx:309-594`

12 kolom, termasuk interactive accessor (checkbox + toggles + actions). Column `className` dipakai untuk width pin (`w-10`, `w-20`, `w-32`, `w-24`, `w-28`):

```tsx
// MonitoringRules.tsx:309-452
const columns: Column<MonitoringRule>[] = [
  { header: '☐',        accessor: (rule) => (
      <input type="checkbox" checked={selectedRows.includes(rule.id)}
             onChange={(e) => { /* e.stopPropagation implicitly via input */ }}
             className="rounded border-ois-border-strong text-ois-primary focus:ring-ois-primary" />
    ), className: 'w-10' },
  { header: 'Status',    accessor: (rule) => <RuleStatusToggle enabled={rule.enabled} onToggle={() => handleToggleRule(rule)} />, className: 'w-20' },
  { header: 'Public ID', accessor: (rule) => <span className="font-mono text-[10px] font-bold text-ois-text-subtle uppercase">{rule.publicId}</span>, className: 'w-32' },
  { header: 'Name',      accessor: (rule) => <p className="text-sm font-semibold text-ois-text truncate max-w-[240px]">{rule.name}</p> },
  { header: 'Type',      accessor: (rule) => <Badge variant="neutral" className="bg-ois-surface-muted text-ois-text-muted border-ois-border text-[10px] font-bold uppercase gap-1.5 px-2">{ruleTypeMeta[rule.type].label}</Badge> },
  { header: 'Severity',  accessor: (rule) => <SeverityBadge severity={rule.severity} />, className: 'w-24' },
  { header: 'Targets',   accessor: (rule) => <Badge variant="neutral" className="bg-ois-bg border-ois-border text-ois-text-muted">{rule.targetCount} CIs</Badge> },
  { header: 'Last Fired',accessor: (rule) => <span className="text-[11px] font-medium text-ois-text-muted whitespace-nowrap">{rule.lastTriggeredAt ? `${formatDistanceToNow(parseISO(rule.lastTriggeredAt))} ago` : 'Never'}</span> },
  { header: 'Fires (30d)',accessor: (rule) => <div className="flex items-center gap-3"><span className="text-xs font-bold text-ois-text w-6">{rule.totalFires30d}</span><RuleSparkline data={sparklineData[rule.id]} /></div> },
  { header: 'S/N',       accessor: (rule) => <span className={cn("text-xs font-bold", (rule.signalToNoiseRatio||0) >= 0.8 ? "text-ois-success" : "text-ois-danger")}>{Math.round((rule.signalToNoiseRatio||0)*100)}%</span> },
  { header: 'Route',     accessor: (rule) => <button className="text-[11px] font-bold text-ois-primary hover:underline whitespace-nowrap" onClick={(e) => { e.stopPropagation(); navigate('/monitoring/routing'); }}>{rule.alertRoutePublicId}</button> },
  { header: 'Actions',   accessor: (rule) => canManage ? <div className="flex items-center gap-1"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleOpenWizard(rule); }}><Settings size={14} /></Button>…</div> : <span className="text-[10px] text-ois-text-subtle italic">read-only</span>, className: 'w-28' },
];

// MonitoringRules.tsx:590-594
<Card className="border-ois-border overflow-hidden bg-white shadow-sm">
  <DataTable columns={columns} data={filteredRules} onRowClick={(rule) => handleOpenWizard(rule)} />
  {filteredRules.length === 0 && <div className="py-24 flex flex-col items-center">…No monitoring rules found…</div>}
</Card>
```

Catatan penting dari usage ini:

- Checkbox di accessor tidak menghentikan `onRowClick` secara eksplisit — `input onChange` tidak trigger `TR onClick` karena event target berbeda, tetapi `button` di kolom Actions **wajib** `e.stopPropagation()`.
- MonitoringRules merender empty state **di luar** `DataTable` (custom `py-24` dengan `Radio` icon + CTA) **dan** tetap membiarkan `DataTable` merender empty row-nya (`No data available`) — keduanya akan tampil jika tidak di-guard. Pattern yang benar: bungkus `DataTable` dengan conditional atau biarkan `DataTable` empty row handle sendiri; jangan double empty.

---

## 7. Bespoke Tables — When NOT to Use DataTable

Dua halaman list utama **sengaja tidak** memakai `DataTable` karena butuh fitur di luar scope wrapper:

### 7.1 IncidentQueue — `src/routes/incidents/IncidentQueue.tsx:568-610`

Raw `<table>` dengan `min-w-[900px]` dan bespoke concerns:

| Fitur | Class / Pattern | Mengapa tidak DataTable |
|-------|-----------------|-------------------------|
| Select-all checkbox di header | `<th className="w-8 px-3 py-2.5"><button onClick={toggleAll}><CheckSquare/Square /></button></th>` | DataTable tidak punya selection primitive |
| Sticky header | `<thead className="sticky top-0 z-10"><tr className="bg-ois-surface-muted …">` | `THead` default `bg-ois-surface` + tidak sticky |
| Priority stripe per row | `style={{ borderLeftColor: stripeColor }}` + `border-l-[3px]` pada `<tr>` | DataTable `TR` tidak expose left-border slot |
| Row selection highlight | `selected && 'bg-ois-primary/5'` pada `<tr>` | DataTable tidak punya `selected` prop |
| Hover-reveal checkbox | `opacity-0 group-hover:opacity-100` | DataTable cell tidak pre-config untuk reveal |
| Row overflow menu | `absolute right-0 top-full mt-1 z-20 bg-white border rounded-lg shadow-ois-dropdown` | DataTable accessor bisa, tetapi menu butuh `fixed inset-0` backdrop |
| 11 kolom (Pri, ID, Title, Status, Assignee, Service, Created, SLA, Tags, Actions) | Header `text-[11px] font-semibold tracking-wide` (bukan `tracking-wider`) | Header scale sedikit berbeda |

Header scale di IncidentQueue: `text-[11px] font-semibold tracking-wide` vs DataTable `TH` `tracking-wider` + `font-bold`. Ini intentional — IncidentQueue header lebih compact.

### 7.2 ChangeCalendar List — `src/routes/changes/ChangeCalendar.tsx:218-243` (`view === 'list'`)

Raw `<table>` dengan 8 kolom (ID, Title, Type, Status, Risk, Owner, Window, action):

```tsx
// ChangeCalendar.tsx:220-241
<table className="w-full">
  <thead>
    <tr className="border-b border-ois-border bg-ois-bg">
      {['ID','Title','Type','Status','Risk','Owner','Window',''].map(h => (
        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">
          {h}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {filteredListChanges.length === 0 ? (
      <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-ois-text-subtle italic">No changes match the current filters.</td></tr>
    ) : (
      filteredListChanges.map(c => <ChangeRow key={c.id} change={c} />)
    )}
  </tbody>
</table>
```

Perbedaan dari DataTable primitive:

- Header `bg-ois-bg` (`#F7F8FA`) bukan `bg-ois-surface` — memberi contrast lebih kuat untuk filter bar di atasnya.
- Header `tracking-widest` (bukan `wider` seperti `TH` primitive).
- Empty state `py-8 text-xs` di dalam `ChangeCalendar` vs DataTable `py-12 text-sm italic`.
- Menggunakan `ChangeRow` component per baris (encapsulated), bukan `accessor` inline.

### 7.3 Decision Rule — DataTable vs Bespoke

| Kondisi | Pakai |
|---------|-------|
| ≤ 8 kolom, tidak butuh selection/sticky/stripe, `id` tersedia | `DataTable` — deklaratif, typed, empty handled |
| Butuh checkbox selection, sticky header, left accent stripe, row menu, atau header `bg-ois-bg` | Bespoke `<table>` dengan `Table` primitives atau raw `<table>` |
| Kalender grid (`src/components/changes/ChangeCalendar/ChangeCalendar.tsx:74-101`) | Bukan tabel sama sekali — 7-col CSS grid dengan `CalendarCell` |

---

## 8. Styling & Composition

### 8.1 ClassName Passthrough

- `DataTable className` → outer `div.overflow-x-auto`. Gunakan untuk `rounded-lg border`, `shadow`, atau `max-h-*`.
- `Column.className` → `TH` **dan** `TD` (sama). Cocok untuk width pin (`w-*`) dan `text-right`/`text-center`. Untuk styling cell yang berbeda dari header, jangan pakai `Column.className` — bungkus return `accessor` dengan `<span className="…">`.
- Primitive `className` (Table/THead/…) → merge via `cn(defaults, className)` — override menang. Contoh: `<TH className="text-right">`.

### 8.2 Cell Content Conventions

| Content | Class | Contoh |
|---------|-------|--------|
| Public / system ID | `font-mono text-[11px] text-ois-text-subtle` atau `IDCell` (`font-mono text-[12px] tabular-nums text-ois-text-muted` di `src/components/ui/IDCell.tsx:16`) | `INC-0042`, `CHG-2026-…` |
| Primary text | `text-sm font-medium text-ois-text` atau `font-semibold` | `Name`, `Title` |
| Secondary / meta | `text-xs text-ois-text-muted` / `text-xs text-ois-text-subtle` | `Env`, `Updated`, `Last Fired` |
| Tags | `text-[10px] bg-ois-surface-muted border border-ois-border rounded` | `database` |
| Status / severity | `StatusBadge` / `SeverityBadge` / `Badges` | `operational`, `P1` |

### 8.3 Container Pattern

Selalu bungkus `DataTable` dengan `Card` jika list adalah primary content di bawah filter bar:

```tsx
<Card className="overflow-hidden bg-white">
  <DataTable columns={columns} data={filtered} onRowClick={nav} />
</Card>
```

`overflow-hidden` di Card + `overflow-x-auto` di DataTable bekerja sama — Card clip border-radius, DataTable handle scroll.

---

## 9. Behavior & Constraints

| Constraint | Detail |
|-----------|--------|
| `T extends { id: string \| number }` | Hard — tanpa `id` tidak bisa dipakai. Key = `item.id` di `DataTable.tsx:38`. Gunakan `publicId` hanya untuk display + navigation (`navigate(`/cmdb/${ci.id}`)` vs `ci.publicId`). |
| Empty data | Render `py-12 italic` row. Consumer tidak perlu `filtered.length === 0 ? <EmptyState> : <DataTable>` jika empty bawaan sudah cukup; tetapi jika butuh custom empty (icon + CTA) seperti `MonitoringRules.tsx:596-624`, render custom empty **di luar** DataTable dan guard agar tidak double empty. |
| No sorting / filtering | DataTable tidak punya `sortBy`, `order`, atau filter props. Consumer sort/filter di `useMemo` sebelum pass `data` (lihat `CMDBList.tsx:97-107` untuk filter chain). |
| No pagination | Tidak ada `page`, `pageSize`, `total`. Jika butuh, implement di parent + slice `data`. |
| No sticky header | `THead` tidak sticky. IncidentQueue bespoke memakai `sticky top-0 z-10` — belum ada prop untuk itu di DataTable. |
| No column sort indicator | Header adalah plaintext `string` — tidak ada `sortDirection` atau icon slot. |
| `onRowClick` propagation | Tidak di-stop. Interactive element di cell harus `e.stopPropagation()` (wajib untuk button/checkbox di accessor). |

---

## 10. Accessibility

- Table semantics native (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`) — screen reader navigable.
- `TH` tidak memiliki `scope="col"` — tambahkan jika butuh strict a11y (`<TH scope="col">` via passthrough, karena `TH` extends `ThHTMLAttributes`).
- `onRowClick` TR tidak memiliki `role="button"` atau `tabIndex={0}` — row click hanya mouse. Jika keyboard nav diperlukan, consumer harus menambahkan `tabIndex`/`onKeyDown` di accessor atau bungkus cell dengan `<button>`/`<Link>`.
- Empty state `colSpan={columns.length}` memastikan single cell span full width — tidak ada row kosong yang membingungkan.

---

## 11. Do / Don't

- ✅ Gunakan `DataTable` untuk list 5–8 kolom dengan `id`, tanpa selection/sticky — deklaratif dan typed.
- ✅ Selalu stop propagation di interactive accessor: `onClick={(e) => { e.stopPropagation(); action(); }}`.
- ✅ Bungkus dengan `Card overflow-hidden` untuk border-radius + shadow yang benar.
- ✅ Pakai `IDCell` atau `font-mono text-[11px]` untuk `publicId` di accessor — konsisten dengan `CMDBList` dan `IncidentQueue`.
- ✅ Pakai `Column.className: 'w-*'` untuk pin width kolom sempit (checkbox, status, actions).
- ❌ Jangan pakai `DataTable` jika butuh selection/sticky header/left stripe — pakai bespoke `<table>` seperti `IncidentQueue`.
- ❌ Jangan render custom empty di luar **dan** biarkan DataTable empty row tanpa guard — akan double empty.
- ❌ Jangan pakai `publicId` sebagai React key — DataTable pakai `item.id`; duplikat `publicId` tidak dijamin unik di semua entity.
- ❌ Jangan pass data tanpa `id` field — constraint generic akan error di `tsc`.

---

## 12. Related

- `docs/ui/design-tokens.md` — color/radius/shadow/font scale untuk semua `ois-*` classes.
- `docs/DESIGN-SYSTEM.md` § DataTable & Table — ringkas; doc ini adalah deep spec-nya.
- `docs/ui/app-shell.md` — AppShell `<main> p-6` vs Module Layout `-m-6` — mempengaruhi `overflow-x-auto` container width.
- `src/components/ui/IDCell.tsx` — mono ID cell primitive untuk `publicId`.
- `src/lib/constants.ts` — `ciTypeMeta`, `ruleTypeMeta`, `PRIORITY_COLOR` dipakai di accessor.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep spec — `Column<T>` generic, `Table` primitives exact classes, `DataTable` render/empty/overflow, canonical `CMDBList` + `MonitoringRules` usage, bespoke `IncidentQueue` + `ChangeCalendar` list comparison, tokens from `src/index.css:1-59` | `src/components/ui/DataTable.tsx:1-60`, `src/components/ui/Table.tsx:1-26`, `src/index.css:1-59`, `src/routes/cmdb/CMDBList.tsx`, `src/routes/monitoring/MonitoringRules.tsx`, `src/routes/incidents/IncidentQueue.tsx:568-610`, `src/routes/changes/ChangeCalendar.tsx:218-243` |

