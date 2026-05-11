# OIS Design System

> **North star page:** `IncidentDetail` (`src/routes/incidents/IncidentDetail.tsx`). When in doubt about any pattern, check that file first.

This document is the single source of truth for design decisions in the Omni Intelligence Suite. It covers tokens, component API, layout patterns, and interaction conventions — for both developers building new pages and designers extending the system.

---

## Table of Contents

1. [Foundations](#foundations)
   - [Color Tokens](#color-tokens)
   - [Typography](#typography)
   - [Spacing & Radius](#spacing--radius)
   - [Shadows](#shadows)
   - [Scrollbars](#scrollbars)
2. [Components](#components)
   - [Button](#button)
   - [Badge](#badge)
   - [Card & SectionCard](#card--sectioncard)
   - [Tabs](#tabs)
   - [Avatar](#avatar)
   - [Modal](#modal)
   - [Input](#input)
   - [FilterDropdown](#filterdropdown)
   - [DataTable & Table](#datatable--table)
   - [KPICard](#kpicard)
   - [IncidentStatusPill](#incidentstatuspill)
   - [IncidentPriorityBadge](#incidentprioritybadge)
3. [Layout Patterns](#layout-patterns)
   - [3-Column Detail Layout](#3-column-detail-layout)
   - [Nav Row Pattern](#nav-row-pattern)
   - [Priority Color Bar](#priority-color-bar)
   - [Full-Height Flex Layout](#full-height-flex-layout)
4. [Interaction Patterns](#interaction-patterns)
   - [Filter Chips](#filter-chips)
   - [Status Dropdown with Dot Indicators](#status-dropdown-with-dot-indicators)
   - [Quick Action Button Lists](#quick-action-button-lists)
   - [Comment Composer](#comment-composer)
   - [Empty States](#empty-states)
5. [Color Semantics Guide](#color-semantics-guide)
   - [Semantic Colors](#semantic-colors)
   - [Priority Colors P1–P4](#priority-colors-p1p4)
   - [Dot Indicator Pattern](#dot-indicator-pattern)
   - [Content Style Rules](#content-style-rules)

---

## Foundations

### Color Tokens

All tokens are defined in `src/index.css` under `@theme` and consumed via Tailwind classes (`bg-ois-primary`, `text-ois-text-muted`, etc.).

#### Brand

| Token | Value | Class | Use |
|-------|-------|-------|-----|
| `--color-ois-primary` | `#1F4FD4` | `ois-primary` | Links, active states, primary buttons, tab indicators |
| `--color-ois-primary-hover` | `#1A42B5` | `ois-primary-hover` | Primary button hover |
| `--color-ois-primary-pale` | `#EEF2FF` | `ois-primary-pale` | Avatar backgrounds, active sidebar items, subtle highlights |

#### Surface

| Token | Value | Class | Use |
|-------|-------|-------|-----|
| `--color-ois-bg` | `#F7F8FA` | `ois-bg` | Page background, main `<body>` |
| `--color-ois-surface` | `#FFFFFF` | `ois-surface` | Cards, sidebars, modals |
| `--color-ois-surface-muted` | `#F1F3F7` | `ois-surface-muted` | Section card headers, hover states, tag backgrounds |
| `--color-ois-border` | `#E4E7EC` | `ois-border` | All card/component borders |
| `--color-ois-border-strong` | `#D0D5DD` | `ois-border-strong` | Input borders, emphasis separators |

#### Text

| Token | Value | Class | Use |
|-------|-------|-------|-----|
| `--color-ois-text` | `#101828` | `ois-text` | Primary body text, headings |
| `--color-ois-text-muted` | `#475467` | `ois-text-muted` | Secondary labels, inactive tabs, captions |
| `--color-ois-text-subtle` | `#98A2B3` | `ois-text-subtle` | Placeholder text, disabled, timestamps |

#### Semantic

| Token | Value | Class | Pale class | Use |
|-------|-------|-------|------------|-----|
| `--color-ois-success` | `#12B76A` | `ois-success` | `ois-success-pale` (`#ECFDF3`) | Resolved, healthy, met |
| `--color-ois-warning` | `#F79009` | `ois-warning` | `ois-warning-pale` (`#FFFAEB`) | At risk, degraded, pending |
| `--color-ois-danger` | `#F04438` | `ois-danger` | `ois-danger-pale` (`#FEF3F2`) | Breached, critical, error |
| `--color-ois-info` | `#0BA5EC` | `ois-info` | `ois-info-pale` (`#F0F9FF`) | Informational, triaging |

#### Severity / Priority

| Token | Value | Use |
|-------|-------|-----|
| `--color-ois-sev-p1` | `#B42318` | P1 — text color in pale backgrounds |
| `--color-ois-sev-p2` | `#DC6803` | P2/P3 — text color |
| `--color-ois-sev-p4` | `#027A48` | P4 — text color |

Full priority color map (used inline via `style`):

```ts
const PRIORITY_COLOR = {
  P1: '#B42318',
  P2: '#DC6803',
  P3: '#F79009',
  P4: '#027A48',
};
```

---

### Typography

**Fonts** (loaded from Google Fonts in `src/index.css`):

| Role | Family | Class |
|------|--------|-------|
| UI / body | Inter | `font-sans` (default) |
| Code / IDs | JetBrains Mono | `font-mono` |

**Type scale used across OIS:**

| Size | Tailwind | Use |
|------|----------|-----|
| 11px | `text-[11px]` | Section card labels (uppercase + tracking-widest), metadata chips, subDetail |
| 12px | `text-xs` | Secondary metadata, badge text, timeline entries, sidebar labels |
| 14px | `text-sm` | Primary body text, button labels, tab labels, form inputs |
| 16px | `text-base` | Larger avatar initials |
| 20px | `text-xl` | Page/incident title (`font-bold`) |
| 36px | `text-4xl` | KPI metric value (`font-bold`) |

**Section labels** follow a strict pattern:

```tsx
<p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
  Section Title
</p>
```

---

### Spacing & Radius

OIS uses a 4px base grid. Prefer multiples of 1 (4px), 1.5 (6px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px).

**Border radii (custom tokens):**

| Token | Value | Tailwind class | Use |
|-------|-------|----------------|-----|
| `--radius-ois-card` | `8px` | `rounded-ois-card` | Cards, panels |
| `--radius-ois-btn` | `6px` | `rounded-ois-btn` | Buttons, inputs |
| `--radius-ois-badge` | `4px` | `rounded-ois-badge` | Badges |
| `--radius-ois-modal` | `12px` | `rounded-ois-modal` | Modal dialogs |
| `999px` | — | `rounded-full` | Pills, filter chips, avatar |

**Common spacing patterns:**

| Context | Pattern |
|---------|---------|
| Page padding (AppShell `<main>`) | `p-6` |
| Card internal padding | `p-4` or `p-5` |
| Section card header | `px-4 py-2.5` |
| Sidebar padding | `p-4` |
| Tab bar | `px-6`, tabs `py-4 px-1` |
| Row gaps in metadata lists | `gap-2` |
| Action button stacks | `space-y-1.5` |

---

### Shadows

| Token | Use |
|-------|-----|
| `shadow-ois-card` | Default card elevation |
| `shadow-ois-card-hover` | Card hover state |
| `shadow-ois-dropdown` | Dropdowns, popovers |
| `shadow-ois-modal` | Modal dialogs |

---

### Scrollbars

All scrollable regions use a slim styled scrollbar (defined globally in `src/index.css`):

- Width/height: **4px**
- Thumb: `#D0D5DD`, hover `#98A2B3`, `border-radius: 999px`
- Track: transparent

Use `scrollbar-hide` on tab bars and horizontal overflow containers where the scrollbar would be visually distracting.

---

## Components

### Button

**File:** `src/components/ui/Button.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive' \| 'outline'` | `'primary'` | Visual style |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Height + horizontal padding |
| `loading` | `boolean` | `false` | Shows spinner, disables click |

#### Variants

| Variant | Height | Style | Use when |
|---------|--------|-------|----------|
| `primary` | h-9 (md) | Blue fill, white text | The single main action on a panel or form |
| `secondary` | h-9 (md) | Muted fill, border | Secondary actions alongside a primary |
| `ghost` | h-9 (md) | Transparent, text only | Inline controls, cancel actions |
| `destructive` | h-9 (md) | Danger red fill | Irreversible actions (delete, revoke) |
| `outline` | h-9 (md) | Transparent, strong border | Tertiary actions, table row actions, "Link X" triggers |

#### Sizes

| Size | Height | Padding | Text | Use |
|------|--------|---------|------|-----|
| `sm` | `h-8` | `px-3` | `text-xs` | Sidebars, modals, table rows, compact UIs |
| `md` | `h-9` | `px-4` | `text-sm` | Default — forms, page-level CTAs |
| `lg` | `h-10` | `px-6` | `text-base` | Hero actions only |
| `icon` | `h-9 w-9` | none | — | Icon-only (overflow menus, close buttons) |

#### Usage

```tsx
// Primary action
<Button variant="primary" size="sm">Resolve</Button>

// Outline with icon
<Button variant="outline" size="sm">
  <Plus size={14} className="mr-1" /> Link CI
</Button>

// Ghost cancel
<Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>

// Loading state
<Button variant="primary" loading>Saving…</Button>

// Icon-only overflow button
<button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white hover:bg-ois-surface-muted transition-colors">
  <MoreHorizontal size={16} />
</button>
```

#### Do / Don't

- ✅ Use `size="sm"` inside sidebars, modals, and table rows
- ✅ Use `loading` during async operations
- ✅ One `primary` button maximum per panel — it indicates the dominant action
- ❌ Don't place two `primary` buttons side by side
- ❌ Don't use `destructive` for reversible actions

---

### Badge

**File:** `src/components/ui/Badge.tsx`

#### Props

| Prop | Type | Default |
|------|------|---------|
| `variant` | `'neutral' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'status' \| 'severity'` | `'neutral'` |

#### Variants

| Variant | Background | Text | Use |
|---------|-----------|------|-----|
| `neutral` | `ois-surface-muted` | `ois-text-muted` | General labels, tags |
| `success` | `ois-success-pale` | `ois-success` | Resolved, healthy states |
| `warning` | `ois-warning-pale` | `ois-warning` | At-risk, degraded states |
| `danger` | `ois-danger-pale` | `ois-danger` | Breached, critical states |
| `info` | `ois-info-pale` | `ois-info` | Informational, in-progress |
| `status` | `ois-primary-pale` | `ois-primary` | Status overviews |
| `severity` | `ois-text` (dark) | white | High-contrast severity labels |

#### Usage

```tsx
<Badge variant="danger">Breached</Badge>
<Badge variant="success">Resolved</Badge>
<Badge variant="neutral">monitoring</Badge>
```

#### Do / Don't

- ✅ Prefer `IncidentStatusPill` for incident statuses — it includes a dot indicator
- ❌ Don't use `Badge` for clickable/interactive elements — it has no interaction states

---

### Card & SectionCard

**File:** `src/components/ui/Card.tsx`

`Card` is the base surface. `SectionCard` is a local pattern used inside `IncidentDetail` — replicate it for any detail page.

#### Card Props

`Card`, `CardHeader`, `CardBody`, `CardFooter` are plain `<div>` wrappers with `className` passthrough.

#### Card Usage

```tsx
<Card>
  <CardHeader>Header content</CardHeader>
  <CardBody>Body content</CardBody>
  <CardFooter>Footer content</CardFooter>
</Card>
```

#### SectionCard Pattern

Used inside detail pages for sidebar and tab content sections:

```tsx
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

#### Do / Don't

- ✅ Use `SectionCard` for all sidebar and tab content blocks in detail pages
- ✅ Include a `title` prop for sections that need a label — use the uppercase label pattern
- ❌ Don't mix `Card` and `SectionCard` on the same detail page — pick one and stay consistent

---

### Tabs

**File:** `src/components/ui/Tabs.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `Tab[]` | required | Array of `{ id, label, icon?, disabled? }` |
| `children` | `ReactNode[]` | required | One child per tab, in same order |
| `activeTabId` | `string` | — | Controlled active tab |
| `onChange` | `(id: string) => void` | — | Controlled change handler |

#### Tab object

```ts
interface Tab {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}
```

#### Active tab style

```
border-b-2 border-ois-primary text-ois-primary font-bold
```

Inactive: `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong`

#### Usage

```tsx
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'timeline', label: `Timeline (${count})` },
  { id: 'resolution', label: 'Resolution', disabled: !isResolved },
];

<Tabs tabs={tabs} activeTabId={activeId} onChange={setActiveId}>
  <OverviewPanel />
  <TimelinePanel />
  <ResolutionPanel />
</Tabs>
```

#### Notes on the IncidentDetail tab bar

`IncidentDetail` renders its own tab bar inline (not using the `Tabs` component) to achieve the pinned-header + independent-scroll layout. When building a detail page, replicate that pattern — tab bar as `shrink-0` sibling, content area as `flex-1 overflow-y-auto`.

#### Do / Don't

- ✅ Include counts in tab labels for collections: `Timeline (12)`
- ✅ Mark tabs `disabled` when their content is conditionally unavailable
- ❌ Don't use `Tabs` for navigation between pages — use the router

---

### Avatar

**File:** `src/components/ui/Avatar.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Used for initials fallback and `alt` text |
| `src` | `string` | — | Optional photo URL |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` | Diameter |

#### Sizes

| Size | Diameter | Font |
|------|----------|------|
| `xs` | 24px (`h-6 w-6`) | 10px |
| `sm` | 32px (`h-8 w-8`) | `text-xs` |
| `md` | 36px (`h-9 w-9`) | `text-sm` |
| `lg` | 48px (`h-12 w-12`) | `text-base` |

Style: `rounded-full bg-ois-primary-pale text-ois-primary font-medium border border-ois-border`

#### Usage

```tsx
// With initials
<Avatar name="Sarah Connor" size="xs" />

// Inline with name
<span className="flex items-center gap-1.5">
  <Avatar name={assignee.name} size="xs" />
  {assignee.name}
</span>
```

---

### Modal

**File:** `src/components/ui/Modal.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | required | Controls visibility |
| `onClose` | `() => void` | required | Called on backdrop click or close button |
| `title` | `string` | required | Header title |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Max width |

#### Sizes

| Size | Max width |
|------|-----------|
| `sm` | `max-w-md` (28rem) |
| `md` | `max-w-2xl` (42rem) |
| `lg` | `max-w-4xl` (56rem) |
| `xl` | `max-w-6xl` (72rem) |
| `full` | `max-w-[95vw]` |

#### Usage

```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Resolve Incident" size="md">
  {/* form content */}
</Modal>
```

#### Anatomy

- **Backdrop:** `bg-slate-900/40 backdrop-blur-sm` — closes on click
- **Panel:** `rounded-2xl shadow-2xl` — `animate-in fade-in zoom-in duration-200`
- **Header:** sticky, `px-6 py-4 border-b`, title `text-lg font-bold`, ghost close button
- **Body:** `flex-1 overflow-y-auto px-6 py-2`

#### Do / Don't

- ✅ Lock body scroll while modal is open (`document.body.style.overflow = 'hidden'`) — the component handles this automatically
- ✅ Use `size="lg"` or `xl` for complex multi-field forms
- ❌ Don't nest modals

---

### Input

**File:** `src/components/ui/Input.tsx`

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Above-field label |
| `error` | `string` | — | Below-field error message |
| `icon` | `ReactNode` | — | Left-side icon (adds `pl-9`) |

Extends all native `<input>` attributes.

#### States

| State | Style |
|-------|-------|
| Default | `border-ois-border-strong` |
| Focus | `ring-2 ring-ois-primary/20 border-ois-primary` |
| Error | `border-ois-danger ring-ois-danger/20` |
| Disabled | `opacity-50 cursor-not-allowed` |

#### Usage

```tsx
// Basic
<Input label="Title" placeholder="Brief incident title…" />

// With icon
<Input icon={<Search size={15} />} placeholder="Search incidents…" />

// With error
<Input label="Assignee" error="Required" value="" />
```

---

### FilterDropdown

**File:** `src/components/ui/FilterDropdown.tsx`

Single-select dropdown used for filter bars and form selects.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | required | Currently selected option value |
| `onChange` | `(val: string) => void` | required | |
| `options` | `FilterDropdownOption[]` | required | `{ value, label, count? }` |
| `placeholder` | `string` | `'Select…'` | |
| `fullWidth` | `boolean` | `false` | Makes trigger fill container width (for forms) |

#### Trigger states

| State | Style |
|-------|-------|
| Default (no value) | `bg-ois-surface-muted border-ois-border text-ois-text-muted` |
| Default (has value) | Same background, `text-ois-text` |
| Open | `bg-white border-ois-primary ring-2 ring-ois-primary/20` |
| Hover | `bg-white border-ois-border-strong` |

#### Panel anatomy

- `rounded-xl border border-ois-border shadow-ois-dropdown`
- 3px primary accent strip at the top
- Active item: `bg-ois-primary/[0.05] text-ois-primary font-semibold` + check icon
- Optional `count` pill per option

#### Usage

```tsx
<FilterDropdown
  value={statusFilter}
  onChange={setStatusFilter}
  options={[
    { value: 'all',         label: 'All statuses', count: 42 },
    { value: 'in_progress', label: 'In Progress',  count: 8  },
    { value: 'resolved',    label: 'Resolved',     count: 34 },
  ]}
  placeholder="Status"
/>
```

---

### DataTable & Table

**Files:** `src/components/ui/DataTable.tsx`, `src/components/ui/Table.tsx`

`DataTable` is the typed generic wrapper. Use it for any list with column definitions.

#### DataTable Props

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `Column<T>[]` | `{ header, accessor, className? }` |
| `data` | `T[]` | Items; each must have an `id` field |
| `onRowClick` | `(item: T) => void` | Optional — adds cursor-pointer + click handler |

#### Usage

```tsx
const columns: Column<Incident>[] = [
  { header: 'ID',     accessor: i => <span className="font-mono text-xs text-ois-primary">{i.publicId}</span> },
  { header: 'Title',  accessor: i => <span className="text-sm font-medium">{i.title}</span> },
  { header: 'Status', accessor: i => <IncidentStatusPill status={i.status} /> },
];

<DataTable
  columns={columns}
  data={incidents}
  onRowClick={i => navigate(`/incidents/${i.publicId}`)}
/>
```

#### Empty state

When `data` is empty, renders a single full-width cell: `"No data available"` — `text-center text-ois-text-subtle italic py-12`.

---

### KPICard

**File:** `src/components/ui/KPICard.tsx`

Top-of-page metric card.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Short uppercase label |
| `value` | `string \| number` | required | Main metric displayed at 36px |
| `trend` | `number` | — | Percentage delta; positive = up arrow |
| `trendLabel` | `string` | — | Contextual label beside trend chip |
| `trendBetter` | `'high' \| 'low' \| 'neutral'` | `'high'` | Whether up is good (green) or bad (red) |
| `subDetail` | `string` | — | Small uppercase note below trend |
| `icon` | `ReactNode` | — | Icon shown top-right of card |

#### Trend color logic

| Condition | Color |
|-----------|-------|
| `trendBetter='high'`, trend > 0 | success (green) |
| `trendBetter='high'`, trend < 0 | danger (red) |
| `trendBetter='low'`, trend < 0 | success (green) |
| `trendBetter='low'`, trend > 0 | danger (red) |
| `trendBetter='neutral'` | neutral (muted) |

#### Usage

```tsx
<KPICard
  label="Active P1/P2"
  value={3}
  trend={-25}
  trendLabel="vs last week"
  trendBetter="low"
  icon={<AlertTriangle size={18} />}
/>

<KPICard
  label="MTTR"
  value="42 min"
  trend={-12}
  trendLabel="this month"
  trendBetter="low"
  subDetail="P1 incidents only"
/>
```

---

### IncidentStatusPill

**File:** `src/components/incidents/IncidentStatusPill.tsx`

#### Props

| Prop | Type |
|------|------|
| `status` | `IncidentStatus` |

#### Status values and colors

| Status | Text color | Background | Dot |
|--------|-----------|------------|-----|
| `new` | `#475467` | `#F1F3F7` | `#98A2B3` |
| `triaging` | `#0BA5EC` | `#F0F9FF` | `#0BA5EC` |
| `in_progress` | `#DC6803` | `#FFFAEB` | `#F79009` |
| `pending` | `#6941C6` | `#F4F3FF` | `#9E77ED` |
| `resolved` | `#067647` | `#ECFDF3` | `#12B76A` |
| `closed` | `#475467` | `#F1F3F7` | `#475467` |

Style: `rounded-full px-2 py-0.5 text-xs font-medium` with a 6px dot.

#### Usage

```tsx
<IncidentStatusPill status={incident.status} />
```

---

### IncidentPriorityBadge

**File:** `src/components/incidents/IncidentPriorityBadge.tsx`

#### Props

| Prop | Type | Default |
|------|------|---------|
| `priority` | `'P1' \| 'P2' \| 'P3' \| 'P4'` | required |
| `urgent` | `boolean` | — | Forces pulse animation even on non-P1 |

#### Priority rendering

| Priority | Style |
|----------|-------|
| `P1` | Solid red fill (`#B42318`), white text, **ping animation** |
| `P2` | Solid orange fill (`#DC6803`), white text |
| `P3` | Pale amber background, dark amber text, border |
| `P4` | Pale green background, green text, border |

#### Usage

```tsx
<IncidentPriorityBadge priority={incident.priority} />
```

---

## Layout Patterns

### 3-Column Detail Layout

The standard layout for all entity detail pages (Incident, Problem, Change, etc.).

```
┌──────────────────────────────────────────────────────────┐
│  Nav row: ← Back link                    Status + actions │  shrink-0
│  Entity header: priority bar | title | tags | metadata   │  shrink-0
├───────────────┬──────────────────────────┬───────────────┤
│  Left sidebar │  Tab bar (pinned)        │  Right sidebar│
│  280px        │  Content area (scrolls)  │  280px        │
│  scrolls      │                          │  scrolls      │
│  independently│                          │  independently│
└───────────────┴──────────────────────────┴───────────────┘
```

```tsx
// Outer wrapper — negates AppShell p-6, fills remaining viewport height
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

  {/* Header — shrink-0 so it never scrolls away */}
  <div className="bg-white border-b border-ois-border shrink-0 z-30">
    {/* Nav row */}
    {/* Entity header */}
  </div>

  {/* Body — three independent scroll columns */}
  <div className="flex flex-1 min-h-0">

    {/* Left sidebar */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
      {/* SectionCards */}
    </aside>

    {/* Center: pinned tab bar + scrollable content */}
    <div className="flex flex-col flex-1 min-w-0">
      {/* Tab bar — shrink-0 so it pins */}
      <div className="border-b border-ois-border bg-white shrink-0 px-6">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {/* tab buttons */}
        </nav>
      </div>
      {/* Only this region scrolls */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* tab content */}
      </div>
    </div>

    {/* Right sidebar */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
      {/* SectionCards */}
    </aside>
  </div>
</div>
```

**Key constraint:** `min-h-0` on the flex body prevents the flex container from overflowing its parent. Required for the three-column scroll trick to work.

---

### Nav Row Pattern

The top sub-row inside the detail page header. Left side: back link. Right side: status control + overflow menu.

```tsx
<div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
  {/* Back link */}
  <button
    onClick={() => navigate('/incidents')}
    className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
  >
    <ArrowLeft size={15} />
    Queue
  </button>

  {/* Right actions */}
  <div className="flex items-center gap-2">
    <StatusDropdown status={status} onChange={handleStatusChange} />
    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
      <MoreHorizontal size={16} />
    </button>
  </div>
</div>
```

---

### Priority Color Bar

A 4px left-edge accent bar tied to entity priority. Applied to the entity header block:

```tsx
<div className="flex items-start gap-0">
  {/* 4px color accent bar — spans full header height */}
  <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityColor }} />

  {/* Header content */}
  <div className="flex-1 px-6 py-4">
    {/* priority badge, title, tags, metadata */}
  </div>
</div>
```

Use `PRIORITY_COLOR[incident.priority]` or the appropriate color map for the entity type.

---

### Full-Height Flex Layout

Use when a page must fill the full viewport below the TopBar (height `3.5rem = 56px`):

```tsx
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
  {/* content */}
</div>
```

The `-m-6` negates the `p-6` that `AppShell` applies to its `<main>` outlet. Required for detail pages and any full-bleed layout.

---

## Interaction Patterns

### Filter Chips

Pill-shaped filter toggles. Used in timeline filters, queue filter bars, and similar.

```tsx
{FILTERS.map(f => (
  <button
    key={f.value}
    onClick={() => setFilter(f.value)}
    className={cn(
      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
      filter === f.value
        ? 'bg-ois-primary text-white border-ois-primary'
        : 'border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong bg-white'
    )}
  >
    {f.label}
  </button>
))}
```

Active: solid primary fill. Inactive: white background, muted border + text.

---

### Status Dropdown with Dot Indicators

The inline status picker used in detail page nav rows. Renders a colored dot + label, opens a popover list.

```tsx
// Trigger
<button
  onClick={() => setOpen(v => !v)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border bg-white text-sm font-medium hover:bg-ois-surface-muted transition-colors"
  style={{ color: meta.color }}
>
  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.dot }} />
  {meta.label}
  <ChevronDown size={14} />
</button>

// Option (in popover)
<button
  className={cn(
    'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-ois-surface-muted transition-colors',
    s === status && 'bg-ois-surface-muted font-semibold'
  )}
  style={{ color: m.color }}
>
  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.dot }} />
  {m.label}
  {s === status && <span className="ml-auto text-xs opacity-60">current</span>}
</button>
```

Popover: `absolute top-full right-0 mt-1 w-44 bg-white border border-ois-border rounded-lg shadow-lg z-50 overflow-hidden`

---

### Quick Action Button Lists

A stacked list of contextual actions in the right sidebar.

```tsx
<div className="space-y-1.5">
  {[
    { icon: UserPlus,     label: 'Assign to me' },
    { icon: CheckCircle2, label: 'Resolve', action: openResolve, primary: !isResolved },
    { icon: MessageCircle, label: 'Add comment' },
  ].map(({ icon: Icon, label, action, primary }) => (
    <button
      key={label}
      onClick={action}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
        primary
          ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
          : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted'
      )}
    >
      <Icon size={13} className={primary ? 'text-white' : 'text-ois-text-subtle'} />
      {label}
    </button>
  ))}
</div>
```

- One `primary` action maximum — rendered as blue fill
- All others: outlined ghost style

---

### Comment Composer

A rich-text-style textarea with a formatting toolbar and footer controls.

```tsx
<div className="border border-ois-border rounded-xl overflow-hidden bg-white">
  {/* Toolbar */}
  <div className="flex items-center gap-1 border-b border-ois-border px-3 py-2 bg-ois-surface-muted">
    {['B', 'I', '</>', '🔗', '@'].map(t => (
      <button key={t} className="text-xs font-mono text-ois-text-muted hover:text-ois-text px-1.5 py-0.5 rounded hover:bg-ois-border transition-colors">
        {t}
      </button>
    ))}
  </div>

  {/* Textarea */}
  <textarea
    rows={3}
    placeholder="Type a comment… (Markdown supported)"
    className="w-full px-4 py-3 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none resize-none"
  />

  {/* Footer */}
  <div className="flex items-center justify-between px-3 py-2 border-t border-ois-border bg-ois-surface-muted">
    <label className="flex items-center gap-2 cursor-pointer text-xs text-ois-text-muted">
      <input type="checkbox" className="w-3.5 h-3.5 rounded text-ois-primary" />
      Internal note <span className="opacity-60">(not visible to reporter)</span>
    </label>
    <div className="flex gap-2">
      <Button variant="ghost" size="sm">Cancel</Button>
      <Button variant="primary" size="sm" disabled={!value.trim()}>Comment</Button>
    </div>
  </div>
</div>
```

---

### Empty States

Two patterns depending on context:

**Inline empty (inside a tab or list):**

```tsx
<p className="text-sm text-ois-text-subtle text-center py-8">
  No events match this filter.
</p>
```

**Full-panel empty (action required):**

```tsx
<div className="text-center py-12">
  <CheckCircle2 size={36} className="mx-auto text-ois-text-subtle mb-3" />
  <p className="text-sm text-ois-text-muted">Not yet resolved.</p>
  <Button variant="primary" size="sm" className="mt-4" onClick={openResolve}>
    Mark as resolved
  </Button>
</div>
```

Use `text-ois-text-subtle` for the icon, `text-ois-text-muted` for the message, and a `primary` CTA only if there's a clear next action.

---

## Color Semantics Guide

### Semantic Colors

Always choose semantic color based on **meaning**, not aesthetics.

| Color | Token | Use | Do not use for |
|-------|-------|-----|----------------|
| Success (green) | `ois-success` | Resolved, met, healthy, operational, passed | Generic "positive" labels |
| Warning (amber) | `ois-warning` | At risk, degraded, pending, in-progress | High urgency — use danger |
| Danger (red) | `ois-danger` | Breached, critical, error, failed, major outage | Caution — use warning |
| Info (blue) | `ois-info` | Informational, triaging, in-review, scheduled | Primary actions — use `ois-primary` |

**Pale + saturated pair:** Always pair semantic colors with their pale background. Never use a saturated color as a background with white text — that is reserved for P1/P2 priority badges only.

```tsx
// Correct: pale background + saturated text
<span className="bg-ois-success-pale text-ois-success">Resolved</span>

// Incorrect: saturated background (only valid for P1/P2 badges)
<span className="bg-ois-danger text-white">Failed</span>
```

---

### Priority Colors P1–P4

| Priority | Color | Background | Use |
|----------|-------|------------|-----|
| P1 | `#B42318` | `#FEF3F2` | Solid fill for badge (white text), ping animation |
| P2 | `#DC6803` | `#FFFAEB` | Solid fill for badge (white text) |
| P3 | `#B45309` | `#FFFBEB` | Pale background, dark text, border |
| P4 | `#027A48` | `#ECFDF3` | Pale background, green text, border |

P1 and P2 are the only cases where a saturated color is used as a badge fill with white text. All other badges use pale-background + saturated-text.

The **priority color bar** (left edge of entity headers) always uses the raw priority hex inline via `style={{ backgroundColor: priorityColor }}`.

---

### Dot Indicator Pattern

Dot indicators communicate status at a glance without reading the label. Use them in:
- Status pills (`IncidentStatusPill`)
- Status dropdown options
- Sidebar status/priority rows

```tsx
// 6px dot for pills and dropdowns
<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />

// 8px dot for sidebar rows
<span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
```

Dot color should be the vivid/saturated form of the semantic color (e.g., `#12B76A` not `#ECFDF3`). See `incidentStatusMeta` in `src/lib/constants.ts` for the full map.

---

### Content Style Rules

| Element | Pattern | Example |
|---------|---------|---------|
| Section header labels | `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` | `AT A GLANCE`, `SLA TIMERS` |
| Public / system IDs | `font-mono text-xs text-ois-primary` | `INC-0042`, `EVT-1234` |
| Metadata key–value pairs | `<dt>` subtle + `<dd>` text font-medium, `flex justify-between gap-2` | `Assignee` / `Sarah Connor` |
| Timestamps | `text-xs text-ois-text-subtle` with `formatRelative()` | `3 min ago` |
| Tags / labels | `text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full` | `database`, `p1-sev` |
| Inline links | `text-ois-primary hover:underline` with `<ExternalLink size={11} />` | `Open event ↗` |
| "Add X" ghost links | `text-xs text-ois-primary hover:underline flex items-center gap-1` with `<Plus size={12} />` | `+ Link problem` |
