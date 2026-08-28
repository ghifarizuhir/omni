# CMDB — Graph & Explorer (Feature Pattern)

Status: **Draft**
Source of truth:
[`src/routes/cmdb/CMDBGraph.tsx`](../../src/routes/cmdb/CMDBGraph.tsx),
[`src/components/cmdb/CMDBGraph/ForceGraph.tsx`](../../src/components/cmdb/CMDBGraph/ForceGraph.tsx),
[`src/components/cmdb/CMDBGraph/GraphFilterPanel.tsx`](../../src/components/cmdb/CMDBGraph/GraphFilterPanel.tsx),
[`src/components/cmdb/CMDBGraph/GraphNodeSidePanel.tsx`](../../src/components/cmdb/CMDBGraph/GraphNodeSidePanel.tsx),
[`src/routes/cmdb/CMDBList.tsx`](../../src/routes/cmdb/CMDBList.tsx),
[`src/lib/constants.ts:14-32`](../../src/lib/constants.ts) (`ciTypeMeta` / `relationshipTypeMeta`),
[`src/index.css:1-59`](../../src/index.css) (`ois-*` tokens)
Ref pattern: `terra-service-management/docs/ui/services.md` (Service Map Editor — ReactFlow)

> Feature pattern graph untuk OIS. Beda utama dari terra: **D3 `forceSimulation`** (bukan `@xyflow/react` / ReactFlow), filter panel kiri fixed `w-64`, detail panel kanan `w-80` slide-in, canvas `bg-slate-50` di light theme `ois-*`. List/tree explorer (`CMDBList`) adalah entry companion — tidak ada staged edge / Save-Discard seperti terra.

---

## Purpose

- Visualisasi **Infrastructure Topology**: node = `ConfigurationItem`, edge = `CIRelationship` (`src/types/ci.ts:4-35`).
- Navigasi dua arah: **Graph** (`/cmdb/graph?focus=`) ↔ **Explorer** (`/cmdb` tree/list) ↔ **Detail** (`/cmdb/:id`). Graph dipakai untuk impact analysis, Explorer untuk browsing/filter.
- Semua data tenant-scoped via `useResource(() => cisService.list())` / `cisService.relationshipsAll()` — tidak ada hardcode mock di render path (fallback `?? []` saja).

---

## Route & Shell Placement

| Route | File | Dalam `AppShell`? |
|-------|------|-------------------|
| `/cmdb` (Explorer tree/list) | `src/routes/cmdb/CMDBList.tsx:40` | Ya — `<Outlet>` di `AppShell` (`p-6` via `<main>`) |
| `/cmdb/graph` (Topology graph) | `src/routes/cmdb/CMDBGraph.tsx:24` | Ya — full flex column `h-full` |
| `/cmdb/graph?focus=:id` | `CMDBGraph.tsx:27` | Ya — pre-select node via `searchParams.get('focus')` |
| `/cmdb/:id` | `src/routes/cmdb/CMDBDetail.tsx` | Ya |

`CmdbShell` (`src/routes/cmdb/CmdbShell.tsx`) — tab wrapper internal (Explorer / Graph / Audit) jika di-mount; Graph sendiri render header-nya sendiri (`CMDBGraph.tsx:97-127`).

---

## Layout

### CMDBGraph — Infrastructure Topology

```
┌─────────────────────────────────────────────────────────────────────────┐
│ h-full flex flex-col gap-4 (CMDBGraph.tsx:95)                           │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Header: flex items-center justify-between                            │ │
│ │  left: [Back to {focus} ]?  h1 "Infrastructure Topology"            │ │
│ │        p "Visualizing {n} nodes and {m} connections"                │ │
│ │  right: [Search nodes... w-64] [List View] [Export Share2]          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ flex-1 min-h-0 flex border border-ois-border rounded-xl            │ │
│ │ bg-white overflow-hidden shadow-sm (CMDBGraph.tsx:129)             │ │
│ │ ┌──────────────┬─────────────────────────┬────────────────────────┐ │ │
│ │ │ GraphFilter  │  Canvas flex-1          │ GraphNodeSidePanel   │ │ │
│ │ │  w-64        │  bg-slate-50 relative   │  w-80 (if selected)  │ │ │
│ │ │  border-r    │  <ForceGraph />         │  border-l shadow-2xl │ │ │
│ │ │              │  or empty state         │  slide-in-from-right │ │ │
│ │ └──────────────┴─────────────────────────┴────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ <ExportGraphModal>  +  <Toast fixed bottom-6 left-1/2>                  │
└─────────────────────────────────────────────────────────────────────────┘
```

### CMDBList — Explorer (companion)

```
┌──────────────────────────────────────────────────────────────┐
│ space-y-6 pb-12                                              │
│ Header: flex col md:row                                      │
│   h1 "CMDB Explorer" + <PageScopeChip>                       │
│   p "{n} CIs · {m} relationships · Last updated {relative}"  │
│   actions: [Add CI] [Import] | [Tree Grid] [List]            │
│ Search row: [Search w/ icon] [Status cycle] [Clear*]         │
│ Filter chips: type pills (all + 8 types) + crit pills       │
│ Body: empty? → Card | tree? → CIServiceGroup × N +          │
│       unassigned | list? → DataTable + footer count           │
└──────────────────────────────────────────────────────────────┘
```

### Terra contrast

| Aspek | Terra `services.md` (Service Map Editor) | OIS CMDB Graph |
|-------|------------------------------------------|----------------|
| Canvas lib | `@xyflow/react` ReactFlow + `Background` grid `#52525b` | **D3** `forceSimulation` (`ForceGraph.tsx:85-89`) |
| Toolbar | Floating absolute bottom-center (`EditorBottomToolbar`) | Header row (Search + List View + Export); filter panel kiri |
| Staging | `staged { addedEdges, removedEdgeIds }` + Save/Discard | **Tidak ada** — read-only viz + filter, export via modal |
| Detail | Right sidebar `380–720px` draggable + `localStorage` | Right side `w-80` fixed, `animate-in slide-in-from-right-8` |
| Node visual | Gradient `linear-gradient(135deg, kindColor)` + expanded markdown | Circle radius by `criticality` + `ciTypeMeta` fill/stroke + health sub-dot |
| Search | Bottom toolbar dropdown `w-[200px]` | Header `w-64` `Input pl-9` + left `Search size 14` |
| Stats | Bottom-right `{n} CI · Svr {n} Cloud{n}` | Header subtitle `{n} nodes {m} connections` |

---

## Anatomy

### 1. CMDBGraph Page Container (`CMDBGraph.tsx:24`)

```tsx
<div className="h-full flex flex-col gap-4">  // line 95
  {toast && <Toast />}                         // line 96 — fixed bottom-6 centered
  <div className="flex items-center justify-between">  // header row
  <div className="flex-1 min-h-0 flex border border-ois-border rounded-xl bg-white overflow-hidden shadow-sm"> // canvas shell line 129
  <ExportGraphModal />
</div>
```

- `h-full flex flex-col gap-4` — fill `AppShell` `<main>` (`overflow-y-auto` parent). `flex-1 min-h-0` pada shell memastikan canvas tidak collapse.
- Shell: `border border-ois-border rounded-xl bg-white shadow-sm overflow-hidden` (`--shadow-ois-card` / `--shadow-ois-card-hover` untuk card di tree — shell graph pakai `shadow-sm` tailwind).

### 2. Header (`CMDBGraph.tsx:97-127`)

```
{focusCI && (
  <button onClick={() => navigate(`/cmdb/${focusCI.id}`)}
    className="flex items-center gap-1 text-sm text-ois-primary font-medium hover:underline mb-1">
    <ArrowLeft size={14} /> Back to {focusCI.name}
  </button>
)}
<h1 className="text-2xl font-bold text-ois-text">Infrastructure Topology</h1>
<p className="text-sm text-ois-text-muted font-medium">
  Visualizing {filteredNodes.length} nodes and {filteredLinks.length} connections
</p>

<div className="flex items-center gap-2">
  <div className="relative w-64">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
    <Input placeholder="Search nodes..." className="pl-9 h-9 bg-white border-ois-border-strong text-sm"
      value={searchQuery} onChange={...} />
  </div>
  <Button variant="outline" size="sm" onClick={() => navigate('/cmdb')} className="h-9 px-4">List View</Button>
  <Button variant="primary" size="sm" className="gap-2 h-9 px-4" onClick={() => setExportOpen(true)}>
    <Share2 size={14} /> Export
  </Button>
</div>
```

- `focusCI` (`CMDBGraph.tsx:34-37`) — `mockCIs.find(ci => id===focus || publicId===focus)`, dipakai untuk back link + `useEffect` setSelectedNode (`:46`).
- Search: filter client-side `name` / `publicId` lowercase (`:64-70`). Class `pl-9 h-9 bg-white border-ois-border-strong text-sm` — sesuai token `ois-border-strong #D0D5DD`.
- Buttons: `Button` variant `outline`/`primary` dari `src/components/ui/Button.tsx:12-18` (lihat Token Reference). `h-9 px-4 gap-2` konsisten dengan header OIS lain.
- Toast (`:17-22`): `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 bg-ois-primary text-white` + `CheckCircle2 size 15`. Timer `2000ms`, clear via `toastTimer` ref.

### 3. GraphFilterPanel (`GraphFilterPanel.tsx:21`)

```
<div className="w-64 bg-white border-r border-ois-border flex flex-col">
  <div className="p-4 border-b border-ois-border bg-ois-surface-muted/30">
    <div className="flex items-center gap-2 font-bold text-ois-text"><Filter size={16} /> Filters</div>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-8">
    <!-- CI Types -->
    <!-- Relationships -->
  </div>
  <div className="p-4 border-t border-ois-border">
    <button className="w-full py-2 text-xs font-bold text-ois-text-subtle hover:text-ois-primary">Reset All</button>
  </div>
</div>
```

**CI Types section** (`:30-56`):

```
<div className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest flex items-center justify-between">
  CI Types <span className="text-[10px] lowercase font-normal italic">({selectedTypes.length} selected)</span>
</div>
{(Object.keys(ciTypeMeta) as CIType[]).map(type => (
  <button className={cn(
    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left",
    isSelected ? "bg-ois-primary-pale text-ois-primary font-semibold" : "hover:bg-ois-surface-muted text-ois-text-muted"
  )}>
    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />{meta.label}</div>
    {isSelected && <Check size={12} />}
  </button>
))}
```

**Relationships section** (`:60-92`):

```
{w-4 h-0.5 line preview, backgroundColor: meta.color,
  borderBottom: dashed ? `1px dashed ${color}` : none,
  height: dashed ? '0' : '2px'}
className={isSelected ? "bg-ois-surface-muted text-ois-text font-semibold" : "hover:bg-ois-surface-muted/50 text-ois-text-muted"}
```

- `selectedTypes` default `['server','application','database','load_balancer','service']` (`CMDBGraph.tsx:39`); `selectedRels` default `['depends_on','contains','runs_on','connects_to','part_of']` (`:42`) — `managed_by` tidak ter-select default (beda dengan `relationshipTypeMeta` yang include 6 type).
- `toggleType` / `toggleRel` (`:80-86`) — toggle array; `resetFilters` (`:88-92`) reset ke default + clear search (dipakai di empty state `RotateCcw`, bukan `Reset All` di panel yang saat ini tombol tanpa handler — lihat Known Issues).

### 4. ForceGraph Canvas (`ForceGraph.tsx:28`)

```
<div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
  <svg ref={svgRef} className="w-full h-full" />
</div>
```

**Data prep** (`:38-58`):

```ts
const nodes: Node[] = ciNodes.map(ci => ({ id, name, type, publicId, health, criticality }));
const links: Link[] = ciLinks.map(rel => ({ source: fromCiId, target: toCiId, type }))
  .filter(l => nodes.some(n => n.id===l.source) && nodes.some(n => n.id===l.target));
```

**D3 setup** (`:60-199`):

- `width/height = containerRef.clientWidth/Height`, `svg attr width/height/viewBox` (`:63-69`), `svg.selectAll('*').remove()` tiap render.
- `g = svg.append('g')` + `d3.zoom scaleExtent [0.1,4] on zoom => g.attr('transform', event.transform)` + `svg.call(zoom)` (`:76-82`).
- `simulation = d3.forceSimulation(nodes)
    .force('link', forceLink(links).id(d=>d.id).distance(150))
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(width/2, height/2))
    .force('collision', forceCollide().radius(50))` (`:85-89`).
- Arrow marker (`:92-104`): `defs > marker#arrowhead viewBox -0 -5 10 10 refX 22 refY 0 orient auto markerWidth 6 markerHeight 6 fill #999 d M 0,-5 L 10,0 L 0,5`.
- Links (`:107-115`): `g stroke-opacity 0.6 selectAll line data(links).join line stroke = relationshipTypeMeta[type].color||#999 stroke-width 1.5 stroke-dasharray dashed? '4,4':'none' marker-end url(#arrowhead)`.
- Nodes (`:118-138`): `g selectAll g data(nodes).join g cursor pointer on click find ciNodes by id → onNodeClick(found) plus d3.drag(start→restart alphaTarget 0.3 fx/fy, drag→fx/fy=x/y, end→alphaTarget 0 fx/fy null)`.
  - `circle r = critical?'24' : high?'20':16` (`:134`), `fill = ciTypeMeta[type].bg||#fff`, `stroke = ciTypeMeta[type].color||#999`, `stroke-width = focusedId?4:2`, `class = focusedId?'animate-pulse':''` (`:133-138`).
  - Health sub-circle (`:141-150`): `r 5 cx 12 cy -12 fill: operational #12B76A, degraded/partial_outage #F79009, major_outage #F04438, else #98A2B3`.
  - Labels (`:153-167`): name `dy 30 text-anchor middle font-size 10px font-weight 600 fill #101828`; publicId `dy 42 font-size 8px font-family JetBrains Mono fill #667085`.
- Tick (`:169-178`): links `x1/y1/x2/y2` dari `source/target.x/y`; nodes `transform translate(x,y)`.
- Cleanup `return () => simulation.stop()` (`:197-199`). Deps `[data, focusedId, ciNodes, onNodeClick]` (`:200`).

**Focused highlight:** hanya stroke-width 4 + `animate-pulse` tailwind (tidak ada glow `box-shadow` seperti terra `0 0 0 2px kindColor66`).

### 5. GraphNodeSidePanel (`GraphNodeSidePanel.tsx:16`)

```
if (!ci) return null; // :19
<div className="w-80 bg-white border-l border-ois-border flex flex-col shadow-2xl animate-in slide-in-from-right-8">
  <div className="p-4 border-b border-ois-border flex items-center justify-between bg-ois-surface-muted/30">
    <div className="flex items-center gap-2"><CITypeIcon type={ci.type} size={14} /><span className="font-bold text-ois-text truncate max-w-[160px]">{ci.name}</span></div>
    <button onClick={onClose} className="p-1 hover:bg-ois-border rounded-md"><X size={16} className="text-ois-text-subtle" /></button>
  </div>
  <div className="flex-1 overflow-y-auto p-4 space-y-6">
    <!-- Header Stats -->
    <!-- Health Card -->
    <!-- Counts grid -->
    <!-- Specifications -->
  </div>
  <div className="p-4 border-t border-ois-border bg-white space-y-2">
    <Button variant="primary" className="w-full gap-2" onClick={() => navigate(`/cmdb/${ci.id}`)}>View Full Detail <ExternalLink size={14} /></Button>
    <Button variant="ghost" className="w-full text-xs text-ois-text-subtle" onClick={onClose}>Cancel</Button>
  </div>
</div>
```

Detail:

- **Header Stats** (`:35-45`): `flex flex-col items-center text-center p-4 bg-ois-bg rounded-xl border border-ois-border` + `CITypeIcon size 28 mb-4` + `text-[10px] font-mono font-bold text-ois-text-subtle uppercase tracking-widest` publicId + `h3 text-lg font-bold` name + row `CIStatusBadge` + criticality chip `flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-ois-border text-[9px] font-bold uppercase tracking-tight` dengan `Shield size 10 text-ois-primary`.
- **Health** (`:48-59`): `Card p-4 space-y-3` — header `Activity size 14 text-ois-primary Health Status` + `CIHealthDot showRipple` (`showRipple true` → ping hanya jika `health !== operational`, `bg-ois-success/warning/danger/info/40` `animate-ping`); bar `h-2 w-full bg-ois-surface-muted rounded-full` dengan inner `h-full bg-ois-success w-[98%]` (placeholder; bukan prop); caption `text-[10px] text-ois-text-subtle text-right 98.4% Uptime (30d)`.
- **Counts** (`:62-71`): `grid grid-cols-2 gap-3` — box `bg-white border border-ois-border p-3 rounded-lg text-center`; label `text-[10px] uppercase font-bold text-ois-text-subtle mb-1`; values `text-xl font-bold` dengan `ci.openIncidentCount >0 ? text-ois-danger : text-ois-text` dan `ci.recentChangeCount`.
- **Specifications** (`:74-84`): label `text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest`; container `bg-ois-surface-muted/30 border border-ois-border rounded-lg p-3 space-y-2`; entries `Object.entries(ci.attributes).filter(k!==kind).slice(0,4)` map `flex justify-between text-[10px]` key `text-ois-text-muted capitalize` value `font-bold text-ois-text truncate max-w-[120px]`.
- Footer: primary `View Full Detail` → `navigate(/cmdb/${id})`, ghost `Cancel` → `onClose`.

### 6. Empty State & Toast (`CMDBGraph.tsx:137-146`)

```
{filteredNodes.length===0 ? (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-8">
    <p className="text-sm text-ois-text-muted font-medium max-w-xs">
      No nodes match the selected filters — adjust your type or relationship filters
    </p>
    <Button variant="outline" size="sm" className="gap-2" onClick={resetFilters}>
      <RotateCcw size={14} /> Reset filters
    </Button>
  </div>
) : <ForceGraph ... />}
```

- `resetFilters` (`:88-92`) — clear kedua array + `setSearchQuery('')`. Tidak ter-wire ke `GraphFilterPanel Reset All` (issue minor — lihat Audit).

---

## State Management

### CMDBGraph (`CMDBGraph.tsx:24`)

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `searchParams` | `URLSearchParams` | `?focus=` | Pre-select node |
| `focusCI` | `ConfigurationItem\|null` | `find(id===focus||publicId===focus)` | Back link + auto-select |
| `selectedTypes` | `CIType[]` | `['server','application','database','load_balancer','service']` | Node type filter |
| `selectedRels` | `RelationshipType[]` | `['depends_on','contains','runs_on','connects_to','part_of']` | Edge type filter |
| `selectedNode` | `ConfigurationItem\|null` | `null` → `focusCI` via `useEffect` | Detail panel |
| `searchQuery` | `string` | `''` | Node name/publicId search |
| `toast` | `{message:string}\|null` | `null` | Export feedback |
| `exportOpen` | `boolean` | `false` | Modal toggle |
| `typeFilteredNodes` | `ConfigurationItem[]` | `filter by selectedTypes` | First pass |
| `filteredNodes` | `ConfigurationItem[]` | `typeFiltered + search` | Rendered nodes |
| `filteredLinks` | `CIRelationship[]` | `filter by selectedRels + both ends in filteredNodes` | Rendered edges |

- `showToast` (`:52-56`) timer `2000ms`, cleanup via `useEffect` return (`:58`).
- Filters diproses memoized `useMemo` — `filteredLinks` dependen `filteredNodes` sehingga edge otomatis hilang saat node-nya ter-filter.

### CMDBList (companion — tree/list)

Filter chain: `allCIs ([extraCIs, mockCIs])` → `scopeFilteredCIs` (guard `scopeEnabled && scope!=='all'` via `primaryApplicationId`) → `filteredCIs` (search `name/publicId/attributes` + `typeFilter` + `critFilter` + `healthFilter` (`CMDBList.tsx:97-107`)). Health cycle `['all','operational','degraded','partial_outage','major_outage','maintenance']` (`:37-38`); type/crit chips `ALL ITEMS/CRITICALITY: {count}` pills (`:263-298`) `px-3 py-1.5 rounded-full text-[11px] font-bold border` active `bg-ois-primary text-white border-ois-primary shadow-sm` else `bg-white text-ois-text-muted border-ois-border-strong hover:bg-ois-surface-muted`.

View modes `tree|list` toggle (`:210-222`) `bg-white border border-ois-border-strong rounded-lg p-0.5` buttons `p-1.5 rounded-md` active `bg-ois-primary text-white`. Tree: `CIServiceGroup` per service + unassigned (`:311-350`); List: `DataTable` `listColumns` (Public ID monospace `text-[11px] font-bold text-ois-text-subtle`, Name semibold, Type dot `ciTypeMeta[type].color`, Service, Env `text-[11px] font-bold uppercase tracking-tight`, Health `StatusBadge`, Updated `formatRelative`) (`:147-184`).

---

## Component Map

```
CMDBGraph (src/routes/cmdb/CMDBGraph.tsx)
├── Toast (fixed bottom-6 centered, bg-ois-primary)
├── Header
│   ├── Back to {focusCI.name} (if focus)
│   ├── Title + subtitle (counts)
│   └── Actions: Search Input (pl-9) + List View (outline) + Export (primary Share2)
├── Shell: border border-ois-border rounded-xl bg-white shadow-sm overflow-hidden
│   ├── GraphFilterPanel (src/components/cmdb/CMDBGraph/GraphFilterPanel.tsx)
│   │   ├── Header: Filter + bg-ois-surface-muted/30
│   │   ├── CI Types list (dot color ciTypeMeta, Check if selected)
│   │   ├── Relationships list (line preview color/lineStyle)
│   │   └── Footer: Reset All (no-op currently)
│   ├── Canvas: flex-1 relative bg-slate-50
│   │   ├── Empty state (text + RotateCcw Reset filters)
│   │   └── ForceGraph (src/components/cmdb/CMDBGraph/ForceGraph.tsx)
│   │       ├── <svg> (width/height/viewBox, zoom 0.1-4)
│   │       ├── g (zoom transform)
│   │       ├── marker#arrowhead (refX 22, fill #999)
│   │       ├── links: line stroke relationshipTypeMeta.color lineStyle
│   │       └── nodes: g
│   │           ├── circle (r by criticality, fill ciTypeMeta.bg, stroke ciTypeMeta.color)
│   │           ├── health sub-circle (r 5, cx12 cy-12)
│   │           └── texts: name (10px 600 #101828) + publicId (8px JetBrains Mono #667085)
│   └── GraphNodeSidePanel (src/components/cmdb/CMDBGraph/GraphNodeSidePanel.tsx)
│       ├── Header: CITypeIcon + name + X close
│       ├── Body: Header Stats (ois-bg) + Health Card + Counts grid + Specifications
│       └── Footer: View Full Detail (primary) + Cancel (ghost)
└── ExportGraphModal (isOpen, nodes, links, onExported → Toast)
```

---

## API Layer

| Call | Endpoint | Hook/service |
|------|----------|--------------|
| `cisService.list()` | `GET /api/v1/cis` (tenant-scoped) | `useResource(() => cisService.list(), [])` (`CMDBGraph.tsx:29`, `CMDBList.tsx:53`) |
| `cisService.relationshipsAll()` | `GET /api/v1/cis/relationships` | `useResource(() => cisService.relationshipsAll(), [])` (`:31`, `CMDBList.tsx:55`) |
| `servicesService.list()` | `GET /api/v1/services` (Explorer grouping) | `CMDBList.tsx:57` |
| `Export` | client-side (JSON/CSV via modal) | `ExportGraphModal` (`CMDBGraph.tsx:163`) — no API |
| Realtime | Socket.IO tenant room (`server/realtime.ts`) | Tidak ada live graph update saat ini (poll via `useResource` deps `[]`) |

---

## Constants (`src/lib/constants.ts:14-32`)

| Export | Value |
|--------|-------|
| `ciTypeMeta` | 8 types — server `#067647/#ECFDF3`, application/service `#1F4FD4/#EEF2FF`, database `#6941C6/#F4F3FF`, load_balancer `#0BA5EC/#F0F9FF`, network `#475467/#F1F3F7`, storage `#DC6803/#FFFAEB`, endpoint `#C11574/#FDF2FA` — `label icon color bg` |
| `relationshipTypeMeta` | 6 types — depends_on `#F04438 solid`, contains `#1F4FD4 solid`, runs_on `#475467 dashed`, connects_to `#0BA5EC solid`, managed_by `#6941C6 dashed`, part_of `#067647 dashed` — `label color lineStyle` |
| `ciStatusMeta` (`:34-40`) | active `#067647/#ECFDF3`, planned `#0BA5EC/#F0F9FF`, maintenance `#0BA5EC/#F0F9FF`, retired `#475467/#F1F3F7`, unknown `#98A2B3/#F1F3F7` |

Health dot colors hard-coded di `ForceGraph.tsx:145-149` + `CIHealthDot.tsx:18-24`:

| Health | Dot | Ripple (if showRipple) |
|--------|-----|------------------------|
| `operational` | `#12B76A` `bg-ois-success` | none (ripple disabled when operational) |
| `degraded` / `partial_outage` | `#F79009` `bg-ois-warning` | `bg-ois-warning/40` |
| `major_outage` | `#F04438` `bg-ois-danger` | `bg-ois-danger/40` |
| `maintenance` | `#0BA5EC` `bg-ois-info` | `bg-ois-info/40` |
| unknown | `#98A2B3` `bg-ois-text-subtle` | — |

Node radius: `critical 24` / `high 20` / `medium|low 16` (`ForceGraph.tsx:134`).

---

## Token Reference

Jangan duplikasi definisi — sumber tunggal `docs/ui/design-tokens.md` + `src/index.css:1-59`.

| Token | Value | Dipakai di graph |
|-------|-------|------------------|
| `ois-primary` | `#1F4FD4` | Toast bg, selectedType `bg-ois-primary-pale` text, List View active, Export button, focused node stroke-alt, `text-ois-primary` links/chips |
| `ois-primary-pale` | `#EEF2FF` | Selected CI type pill `bg-ois-primary-pale` |
| `ois-bg` | `#F7F8FA` | SidePanel header stats bg `bg-ois-bg`, page `<body>` |
| `ois-surface` | `#FFFFFF` | Shell `bg-white`/`bg-ois-surface`, filter/panel bg |
| `ois-surface-muted` | `#F1F3F7` | Filter header `bg-ois-surface-muted/30`, selected rel `bg-ois-surface-muted`, chips hover `hover:bg-ois-surface-muted` |
| `ois-border` | `#E4E7EC` | Shell + panel borders `border-ois-border`, dividers |
| `ois-border-strong` | `#D0D5DD` | Input `border-ois-border-strong` + tree chip `border-ois-border-strong` |
| `ois-text` | `#101828` | `text-ois-text` headings, node label `fill #101828` |
| `ois-text-muted` | `#475467` | `text-ois-text-muted` subtitles, secondary |
| `ois-text-subtle` | `#98A2B3` | `text-ois-text-subtle` search icon, placeholder, timestamps, panel labels `text-[11px] uppercase tracking-widest` |
| `ois-success` | `#12B76A` | Health operational, Uptime bar `bg-ois-success` |
| `ois-warning` | `#F79009` | Health degraded/partial_outage |
| `ois-danger` | `#F04438` | Health major_outage (fallback link `#999`) |
| `ois-info` | `#0BA5EC` | Health maintenance |
| `ois-card` radius `8px` | `rounded-xl` shell `rounded-xl`, stats `rounded-xl` |  |
| `ois-btn` radius `6px` | `rounded-ois-btn` via `Button` |  |
| `slate-50` | outside token (canvas bg) | `bg-slate-50` di graph canvas & `ForceGraph` root — exception approved, kontras untuk D3 |

Font: `Plus Jakarta Sans` / `Inter` sans (`font-sans`), `JetBrains Mono` / `Geist Mono` mono (`font-mono`) untuk `publicId` (`text-[10px] font-mono font-bold uppercase` + SVG `8px JetBrains Mono #667085`). Icon: `lucide-react` only — `Search 14`, `Share2 14`, `RotateCcw 14`, `Filter 16`, `Check 12`, `X 16`, `ExternalLink 14`, `Shield 10`, `Activity 14`.

---

## Behavior

- **Filter + search composition:** `selectedTypes` → `typeFilteredNodes` → `filteredNodes` (+ search) → `filteredLinks` (both ends must survive). Link hilang segera saat salah satu node ter-filter.
- **Focus param:** `?focus=` sync ke `selectedNode` via `useEffect([focusCI.id])` (`CMDBGraph.tsx:46`) — navigate dari Detail `navigate(/cmdb/graph?focus=${id})` akan highlight node (stroke 4 + pulse) dan buka side panel.
- **Select:** click node → `onNodeClick` → `setSelectedNode(ci)` → panel open. Close via `X`/`Cancel` → `setSelectedNode(null)` → panel `return null`.
- **Zoom/pan/drag:** D3 `zoom [0.1,4]` on `g.transform`; drag `fx/fy` pinned saat drag, null on end (`ForceGraph.tsx:180-195`). Tidak persist posisi.
- **Export:** `Export` → `ExportGraphModal isOpen` → `onExported(filename) => showToast(Exported ${filename})` (`:168`). Modal handle serialize `filteredNodes/links`.
- **Explorer grouping:** `CMDBList.tsx:131-144` — group by `serviceId` (apps only `type==='application'`) + unassigned bucket (`!serviceId && type!=='service'`); cross-service edges flagged via `target.serviceId !== ci.serviceId`.

## States

| State | Visual |
|-------|--------|
| Default graph | Force simulation centered, collision 50, link 150, charge -300 |
| Focused node | `stroke-width 4` + `animate-pulse` (vs 2 default) (`ForceGraph.tsx:137-138`) |
| Criticality | `critical 24px` > `high 20px` > other `16px` (`:134`) |
| Selected filter pill | `bg-ois-primary-pale text-ois-primary font-semibold` + `Check 12` else `hover:bg-ois-surface-muted text-ois-text-muted` |
| Empty filter result | Absolute centered text `No nodes match...` + `Reset filters RotateCcw` (`CMDBGraph.tsx:138-144`) |
| Canvas | `bg-slate-50` — bukan `bg-ois-bg #F7F8FA` sengaja kontras canvas |

## Edge Cases

- `filteredNodes.length===0` → bukan render `ForceGraph` kosong, tampil empty state dengan reset CTA.
- `focus` param tidak ada / tidak ketemu → `focusCI null`, back link tidak render, `selectedNode` tetap null (tidak crash).
- Links dengan `fromCiId/toCiId` yang node-nya ter-filter out → filtered via `nodes.some` di `data` prep + `filteredLinks` memo — tidak render orphan line.
- `containerRef` belum mount / `clientWidth/Height ===0` → early return `if(!svgRef.current||!containerRef.current) return` (`ForceGraph.tsx:61`) + simulation stop on cleanup.
- `GraphFilterPanel Reset All` saat ini tidak ter-wire (visual only) — reset hanya via empty-state button dan toggle manual. Jangan andalkan untuk triase.
- Health `unknown`/future enum → fallback `#98A2B3` / `bg-ois-text-subtle`.

---

## Design Preservation

- **Light palette only** — `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-border #E4E7EC` (jangan ganti ke terra `theme-card/theme-border` dark atau `bg-theme-*`). Canvas `bg-slate-50` adalah satu-satunya exception (ter-dokumen).
- **`lucide-react` only** — jangan mix heroicons/phosphor; size konsisten `12/14/16` (graph uses `Check 12`, `Search 14`, `Share2 14`, `Filter 16`).
- **`motion` tidak dipakai di graph** — `animate-in slide-in-from-right-8` untuk side panel (tailwind animate), `animate-pulse` untuk focused node, `animate-ping` untuk health ripple. Jangan introduce `motion/react` di ForceGraph tanpa align dengan terra panel pattern.
- **D3 bukan ReactFlow** — keputusan disengaja untuk read-only viz (tanpa staged edges / pathfinding / layout trigger). Jangan migrasi ke ReactFlow tanpa revisit §Terra contrast & API staged changes.
- **Token via `ois-*`**, bukan hex mentah — kecuali `ciTypeMeta`/`relationshipTypeMeta` & health `#F79009/#F04438` yang memang canonical dari constants (`src/lib/constants.ts:14-32`).

---

## Audit Reference

Known issues sebelum/sesudah fix ada di audit — tidak di body doc:

| Doc | Status |
|-----|--------|
| `audit/audit-global-shell.md` | baseline AppShell/Sidebar/TopBar |
| `audit/known-issues-cmdb.md` | TBD — track: Reset All no-op, canvas `bg-slate-50` exception, Focus pulse vs terra glow, Export filename toast truncation |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init lifedoc structure from terra adaptation — `design-tokens.md` + `app-shell.md` stubs | `docs/ui/README.md:94` |
| 2026-08-28 | **Create** CMDB spec — graph (D3 force, zoom, filter panel, side panel, empty state, export) + Explorer companion (tree/list, chips, DataTable) from `CMDBGraph.tsx:1-172`, `ForceGraph.tsx:1-207`, `GraphFilterPanel.tsx:1-103`, `GraphNodeSidePanel.tsx:1-103`, `CMDBList.tsx:1-383`, `ciTypeMeta/relationshipTypeMeta` `src/lib/constants.ts:14-32`, `ois-*` `src/index.css:1-59`; terra ref `terra-service-management/docs/ui/services.md` as pattern graph | — |
