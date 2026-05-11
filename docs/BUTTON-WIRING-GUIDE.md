# OIS Button Wiring Guide

> Companion to `docs/DESIGN-SYSTEM.md`. Covers **how to implement interactive controls** using local React state (pre-backend), and tracks every known dead button across the app.

---

## Table of Contents

1. [Core Principle](#core-principle)
2. [State Management Convention](#state-management-convention)
3. [Modal Component Catalog](#modal-component-catalog)
4. [Wiring Patterns](#wiring-patterns)
   - [Instant mutations](#instant-mutations)
   - [Overflow / context menus](#overflow--context-menus)
   - [Picker modals](#picker-modals)
   - [Inline edit](#inline-edit)
   - [Bulk actions](#bulk-actions)
   - [CSV export](#csv-export)
   - [Confirmation flows](#confirmation-flows)
5. [Dead Button Tracker](#dead-button-tracker)
   - [Incident pages (done ✅)](#incident-pages-done-)
   - [CMDB pages](#cmdb-pages)
   - [Monitoring pages](#monitoring-pages)
   - [Problem pages](#problem-pages)
   - [Change pages](#change-pages)
   - [Dashboard](#dashboard)
   - [Other pages](#other-pages)

---

## Core Principle

All interactions use **local React state** until the backend API is wired. No global store, no context, no `useReducer`. The pattern established in `IncidentDetail` is the standard:

1. Initialize a local copy of the entity from mock data: `const [entity, setEntity] = useState(mockEntity)`
2. All mutations go through `setEntity(prev => ({ ...prev, field: newValue }))`
3. Modal open/close state lives in the same component as the entity state
4. Comments, watchers, and other collections are separate `useState` arrays

When the real API arrives, replace the `useState` initialization with a query hook and the `setEntity` calls with mutation hooks — the component structure stays the same.

---

## State Management Convention

### Entity local state pattern

```tsx
// Initialize from mock
const [entity, setEntity] = useState<EntityType | null>(rawEntity ?? null);

// Guard before render
if (!rawEntity) return <NotFoundState />;

// After guard, entity is guaranteed non-null — use entity! for mutations
const handleAssign = (userId: string) =>
  setEntity(prev => prev ? { ...prev, assigneeId: userId } : prev);
```

### Collections pattern

```tsx
// Separate local state for mutable collections
const [comments, setComments] = useState(() => getCommentsForEntity(entity.id));
const [watchers, setWatchers] = useState<User[]>(() => [...initialWatchers]);

// Append
setComments(prev => [...prev, newComment]);

// Remove
setWatchers(prev => prev.filter(w => w.id !== userId));
```

### Modal state pattern

```tsx
// One boolean per modal — flat, no nesting
const [assignOpen, setAssignOpen]     = useState(false);
const [linkCIOpen, setLinkCIOpen]     = useState(false);
const [editDescOpen, setEditDescOpen] = useState(false);

// Render at the bottom of the return, after all layout
<AssignModal isOpen={assignOpen} onClose={() => setAssignOpen(false)} onSelect={handleAssign} />
```

### Current user

The hardcoded current user is always `'u-001'` (Sarah Chen) until auth is implemented. Use this constant for "assign to me", "posted by", etc.

```tsx
const CURRENT_USER_ID = 'u-001';
const CURRENT_USER_NAME = 'Sarah Chen';
```

---

## Modal Component Catalog

These components live in `src/components/incidents/` and are reusable across all pages.

| Component | File | Props summary | Use for |
|-----------|------|---------------|---------|
| `UserPickerModal` | `incidents/UserPickerModal.tsx` | `{ isOpen, onClose, title, onSelect(userId), excludeIds? }` | Assign, Add watcher, Add commenter |
| `LinkCIModal` | `incidents/LinkCIModal.tsx` | `{ isOpen, onClose, currentCIIds, onLink(ciIds[]) }` | Link CIs to any entity |
| `LinkProblemModal` | `incidents/LinkProblemModal.tsx` | `{ isOpen, onClose, currentProblemId?, onLink(id, publicId) }` | Link a problem |
| `LinkChangeModal` | `incidents/LinkChangeModal.tsx` | `{ isOpen, onClose, currentChangeIds, onLink(changeIds[]) }` | Link changes |
| `PromoteMajorModal` | `incidents/PromoteMajorModal.tsx` | `{ isOpen, onClose, incident, onConfirm(commanderId) }` | Promote to Major |

When building Problem, Change, or CMDB detail pages, **import and reuse these** rather than creating new picker components.

---

## Wiring Patterns

### Instant mutations

No modal needed — fire immediately on click.

```tsx
// Assign to me
onClick={() => setEntity(prev => prev ? { ...prev, assigneeId: CURRENT_USER_ID } : prev)}

// Acknowledge / status transition
onClick={() => setEntity(prev => prev ? { ...prev, status: 'triaging' } : prev)}

// Copy to clipboard
onClick={() => navigator.clipboard.writeText(entity.publicId)}
```

---

### Overflow / context menus

Pattern: local boolean + absolute-positioned panel + fixed backdrop to close.

```tsx
const [menuOpen, setMenuOpen] = useState(false);

// Trigger
<div className="relative">
  <button onClick={() => setMenuOpen(v => !v)} className="...">
    <MoreHorizontal size={16} />
  </button>
  {menuOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[160px]">
        {[
          { label: 'Copy ID', action: () => navigator.clipboard.writeText(entity.publicId) },
          { label: 'Copy link', action: () => navigator.clipboard.writeText(window.location.href) },
        ].map(item => (
          <button key={item.label}
            onClick={() => { item.action(); setMenuOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted text-ois-text"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

---

### Picker modals

Use an existing catalog modal. Wire the `onLink` / `onSelect` callback to update local state.

```tsx
<LinkCIModal
  isOpen={linkCIOpen}
  onClose={() => setLinkCIOpen(false)}
  currentCIIds={entity.affectedCIIds}
  onLink={newIds =>
    setEntity(prev => prev
      ? { ...prev, affectedCIIds: [...prev.affectedCIIds, ...newIds] }
      : prev
    )
  }
/>
```

---

### Inline edit

Toggle between display and textarea. Save writes back to local state; Cancel discards the draft.

```tsx
const [editing, setEditing] = useState(false);
const [draft, setDraft] = useState('');

{editing ? (
  <>
    <textarea
      rows={4}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      className="w-full text-sm border border-ois-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
    />
    <div className="flex gap-2 mt-2">
      <Button variant="primary" size="sm"
        onClick={() => { setEntity(prev => prev ? { ...prev, description: draft } : prev); setEditing(false); }}>
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
    </div>
  </>
) : (
  <>
    <p className="text-sm text-ois-text whitespace-pre-wrap">{entity.description}</p>
    <button onClick={() => { setDraft(entity.description); setEditing(true); }}
      className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline">
      <Edit3 size={12} /> Edit
    </button>
  </>
)}
```

---

### Bulk actions

Queue page pattern. Maintain a local copy of the list so mutations reflect without page reload.

```tsx
const [items, setItems] = useState(() => [...mockItems]);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// Apply mutation to selected items
const bulkMutate = (patch: Partial<ItemType>) =>
  setItems(prev => prev.map(i => selectedIds.has(i.id) ? { ...i, ...patch } : i));

// Example: bulk change priority
bulkMutate({ priority: 'P1' });
setSelectedIds(new Set()); // clear selection after
```

---

### CSV export

Reusable pattern from `IncidentAnalytics`. Generate from local/filtered data — no API needed.

```tsx
const handleExport = (items: ItemType[]) => {
  const headers = ['ID', 'Title', 'Status', 'Created'];
  const rows = items.map(item => [
    item.publicId,
    `"${item.title.replace(/"/g, '""')}"`,
    item.status,
    item.createdAt,
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

---

### Confirmation flows

For destructive or irreversible actions (Close, Delete, Stand down). Show an inline confirm bar — no extra modal needed for simple confirmations.

```tsx
const [confirming, setConfirming] = useState(false);

{confirming ? (
  <div className="flex items-center gap-2">
    <span className="text-sm text-ois-danger font-medium">
      Close {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}?
    </span>
    <Button variant="destructive" size="sm" onClick={handleConfirmedClose}>Confirm</Button>
    <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>Cancel</Button>
  </div>
) : (
  <button onClick={() => setConfirming(true)} className="...">Close</button>
)}
```

For high-stakes actions (Promote to Major, Stand Down), use a `Modal` with a required reason/confirmation field — see `PromoteMajorModal` and `StandDownModal` as references.

---

## Dead Button Tracker

Priority guide:
- 🔴 **High** — core user workflow, visible on every visit
- 🟡 **Medium** — secondary workflow, used regularly
- 🟢 **Low** — edge case or admin-only

Status: `❌ Not started` / `🚧 In progress` / `✅ Done`

---

### Incident pages (done ✅)

All 24 dead buttons wired in commit `9ff9c3c`. See `src/routes/incidents/`.

---

### CMDB pages

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `CMDBDetail.tsx` | Edit CI | 🟡 | Inline edit mode (toggle fields to editable inputs, Save updates local state) | ✅ |
| `CMDBDetail.tsx` | More options (···) | 🟢 | Overflow menu: Copy CI ID, Copy link | ✅ |
| `CMDBDetail.tsx` | View All (Activity log) | 🟢 | `navigate('/cmdb/audit?ci=...')` | ✅ |

---

### Monitoring pages

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `EventDetail.tsx` | View CMDB dependency graph | 🟡 | `navigate('/cmdb/graph?ci=...')` using event's affected CI | ✅ |
| `EventDetail.tsx` | Copy query | 🟡 | `navigator.clipboard.writeText(rule.query)` | ✅ |
| `EventDetail.tsx` | Create Incident from alert | 🔴 | Open `CreateIncidentModal`, link incident on create | ✅ |
| `EventDetail.tsx` | Add tag | 🟢 | Inline tag input toggle | ✅ |
| `EventStream.tsx` | Time range selector (Last 7d) | 🟡 | Local dropdown (24h/7d/30d) + date filter on `firedAt` | ✅ |
| `EventStream.tsx` | Export | 🟡 | CSV export of filtered events | ✅ |
| `MonitoringRules.tsx` | Test channel (per channel) | 🟢 | `testedChannels` Set state — shows Sent ✓ after click | ✅ |

---

### Problem pages

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `ProblemDetail.tsx` | Edit description | 🟡 | Inline edit (same pattern as IncidentDetail description edit) | ✅ |
| `ProblemDetail.tsx` | Link incidents | 🔴 | Use existing `LinkIncidentsModal` from `src/components/problems/LinkIncidentsModal.tsx` | ✅ |
| `ProblemDetail.tsx` | Link change | 🟡 | Reuse `LinkChangeModal` | ✅ |
| `ProblemDetail.tsx` | Suggest KB article | 🟢 | `navigate('/kb/editor?source=problem&id=...')` | ✅ |

---

### Change pages

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `ChangeDetail.tsx` | Actions dropdown | 🟡 | Overflow menu: Copy ID, Copy link | ✅ |
| `ChangeDetail.tsx` | Reschedule | 🟡 | `RescheduleModal` with datetime inputs, updates `plannedStart` / `plannedEnd` | ✅ |
| `CABWorkspace.tsx` | Export agenda | 🟢 | CSV export of CAB agenda (CSV export pattern above) | ✅ |
| `CABWorkspace.tsx` | Schedule new session | 🟡 | Modal with date picker + attendees | ✅ |
| `NewChange.tsx` | Save as draft | 🟡 | Persist form to `localStorage` keyed by a draft ID, restore on return | ✅ |

---

### Dashboard

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `Dashboard.tsx` | Last 24h time filter | 🟡 | Dropdown (24h/7d/30d) filters `filteredActiveIncidents` + `filteredInboxItems` via useMemo | ✅ |
| `Dashboard.tsx` | Refresh | 🟡 | Increments `refreshCount` (re-runs memos) + shows "Refreshed just now" | ✅ |
| `Dashboard.tsx` | Action Required primary actions | 🔴 | `navigate(item.primaryAction?.navigateTo ?? item.sourceUrl)` | ✅ |

---

### Other pages

| Page | Button | Priority | Approach | Status |
|------|--------|----------|----------|--------|
| `ReleaseDetail.tsx` | Deploy to [environment] | 🟡 | Enable button when stage is pending; show a confirmation modal, then update stage status to `in_progress` locally | ✅ |
| `DeploymentDetail.tsx` | Re-deploy | 🟡 | Confirm modal → set deployment status to `running` with a simulated progress update | ✅ |

---

## Adding a New Page — Checklist

When implementing a new detail page, follow this sequence:

1. **Initialize entity state:** `useState<EntityType | null>(rawEntity ?? null)`
2. **Guard not-found early:** Return `<NotFoundState />` before any hooks
3. **Separate collections:** Comments, watchers, linked items → each their own `useState`
4. **Modal state:** One boolean per modal, flat (no nesting)
5. **Overflow menu:** Follow the pattern in [Overflow / context menus](#overflow--context-menus)
6. **Reuse catalog modals:** Check [Modal Component Catalog](#modal-component-catalog) before creating new pickers
7. **Destructive actions:** Always use a confirmation step (inline bar or modal with required reason field)
8. **Current user:** Use `CURRENT_USER_ID = 'u-001'` for all self-assign / posted-by fields
9. **Ref for focus:** Add `useRef<HTMLTextAreaElement>` when a button should focus a textarea (e.g. "Add comment" → focus composer)
10. **Lint:** Run `npm run lint` before committing — TypeScript must pass clean
