# Problem & Change Dead Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 9 dead buttons across ProblemDetail, ChangeDetail using local React state — no backend required.

**Architecture:** ProblemDetail already holds `[problem, setProblem]` local state — mutations go through `setProblem`. Reuse the existing `LinkIncidentsModal`, `LinkChangeModal` components. Add one new `RescheduleModal` for ChangeDetail. All changes are self-contained local state; lint (`npm run lint`) is the only CI check.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, Vite, Lucide icons, `cn()` from `src/lib/utils.ts`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/routes/problems/ProblemDetail.tsx` | Modify | Wire 7 dead interactions: edit description, link incidents (×2 entry points), link change (×2 entry points), suggest KB article |
| `src/routes/changes/ChangeDetail.tsx` | Modify | Wire Actions overflow menu + Reschedule button |
| `src/components/changes/RescheduleModal.tsx` | **Create** | Modal with date/time inputs for rescheduling a change |

**Reused without modification:**
- `src/components/problems/LinkIncidentsModal.tsx` — props: `{ problem, isOpen, onClose, onLink(incidentPublicIds: string[]) }`
- `src/components/incidents/LinkChangeModal.tsx` — props: `{ isOpen, onClose, currentChangeIds, onLink(changeIds: string[]) }`

---

## Shared constants (use in both files)

```tsx
const CURRENT_USER_ID = 'u-001';
```

---

## Task 1: ProblemDetail — edit description + modal state

**Files:**
- Modify: `src/routes/problems/ProblemDetail.tsx`

> **Context:** `ProblemDetail` already has `const [problem, setProblem] = useState<Problem | undefined>(...)`. All mutations go through `setProblem`. We need to add modal-open booleans and the inline-edit state, then import the two picker modals.

- [ ] **Step 1: Add new state variables**

Find the existing `useState` block near line 388 (after `const rawProblem = ...` and before the not-found guard). Add these state declarations directly below the existing ones:

```tsx
// Modal open states
const [linkIncidentsOpen, setLinkIncidentsOpen] = useState(false);
const [linkChangeOpen, setLinkChangeOpen]       = useState(false);

// Inline description edit
const [editingDesc, setEditingDesc] = useState(false);
const [descDraft, setDescDraft]     = useState('');
```

- [ ] **Step 2: Add new imports**

Add to the existing import block at the top of the file:

```tsx
import { LinkIncidentsModal } from '@/src/components/problems/LinkIncidentsModal';
import { LinkChangeModal } from '@/src/components/incidents/LinkChangeModal';
```

- [ ] **Step 3: Wire inline description edit**

Find the Description section in the Overview tab (around line 600). It currently renders a `<p>` and a dead Edit `<button>`. Replace that block with:

```tsx
{editingDesc ? (
  <>
    <textarea
      rows={4}
      value={descDraft}
      onChange={e => setDescDraft(e.target.value)}
      className="w-full text-sm text-ois-text border border-ois-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
    />
    <div className="flex gap-2 mt-2">
      <Button variant="primary" size="sm" onClick={() => {
        setProblem(prev => prev ? { ...prev, description: descDraft } : prev);
        setEditingDesc(false);
      }}>
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
    </div>
  </>
) : (
  <>
    <p className="text-sm text-ois-text whitespace-pre-wrap leading-relaxed">
      {problem!.description}
    </p>
    <button
      onClick={() => { setDescDraft(problem!.description); setEditingDesc(true); }}
      className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline"
    >
      <Edit3 size={12} /> Edit
    </button>
  </>
)}
```

Add `Edit3` to the lucide-react import if not already present.

- [ ] **Step 4: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/problems/ProblemDetail.tsx
git commit -m "feat(problems): add description inline edit + modal state setup"
```

---

## Task 2: ProblemDetail — link incidents (tab + quick action)

**Files:**
- Modify: `src/routes/problems/ProblemDetail.tsx`

> **Context:** `LinkIncidentsModal` expects `problem`, `isOpen`, `onClose`, `onLink(incidentPublicIds: string[])`. When confirmed, it returns an array of incident **publicIds** (strings like `"INC-2026-00042"`). The Problem type stores `relatedIncidentIds: string[]` which holds publicIds. Updating this array is sufficient to reflect in the tab count and list.

- [ ] **Step 1: Wire "Link incidents" button in RelatedIncidentsTab**

Find the RelatedIncidentsTab content (around line 219). The dead button looks like:
```tsx
<button className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
  <Plus size={12} /> Link incidents
</button>
```
And a "Link more incidents" variant (around line 231). Add `onClick` to both:

```tsx
// First button (empty state)
<button
  onClick={() => setLinkIncidentsOpen(true)}
  className="flex items-center gap-2 text-xs text-ois-primary hover:underline"
>
  <Plus size={12} /> Link incidents
</button>

// Second button (non-empty state, "Link more incidents")
<button
  onClick={() => setLinkIncidentsOpen(true)}
  className="flex items-center gap-2 text-xs text-ois-primary hover:underline"
>
  <Plus size={12} /> Link more incidents
</button>
```

- [ ] **Step 2: Wire "Link incidents" in Quick Actions sidebar**

Find the Quick Actions section (around line 801). The dead "Link incidents" quick action button:
```tsx
// Find the button with label "Link incidents" that has no onClick
```
Add:
```tsx
onClick={() => setLinkIncidentsOpen(true)}
```

- [ ] **Step 3: Add LinkIncidentsModal to render**

At the bottom of the component return (alongside the existing `CloseProblemModal` and `PromoteToKnownErrorModal`), add:

```tsx
<LinkIncidentsModal
  problem={problem!}
  isOpen={linkIncidentsOpen}
  onClose={() => setLinkIncidentsOpen(false)}
  onLink={newPublicIds =>
    setProblem(prev =>
      prev
        ? {
            ...prev,
            relatedIncidentIds: [...new Set([...prev.relatedIncidentIds, ...newPublicIds])],
            relatedIncidentCount: prev.relatedIncidentCount + newPublicIds.length,
          }
        : prev
    )
  }
/>
```

- [ ] **Step 4: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/problems/ProblemDetail.tsx
git commit -m "feat(problems): wire link incidents button in tab and quick actions"
```

---

## Task 3: ProblemDetail — link change + suggest KB article

**Files:**
- Modify: `src/routes/problems/ProblemDetail.tsx`

> **Context:** `LinkChangeModal` (from `src/components/incidents/LinkChangeModal.tsx`) expects `{ isOpen, onClose, currentChangeIds, onLink(changeIds: string[]) }`. The Problem type has `linkedChangeIds: string[]`. The "Suggest KB article" button should navigate to the KB editor pre-filled.

- [ ] **Step 1: Wire "Link change" in Fix Plan tab**

Find the Fix Plan tab content (around line 664). The dead "Link change" button:
```tsx
<button className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
  <Plus size={12} /> Link change
</button>
```
Add `onClick`:
```tsx
<button
  onClick={() => setLinkChangeOpen(true)}
  className="flex items-center gap-2 text-xs text-ois-primary hover:underline"
>
  <Plus size={12} /> Link change
</button>
```

- [ ] **Step 2: Wire "Link change" in Quick Actions sidebar**

Find the dead "Link change" button in Quick Actions (around line 803). Add:
```tsx
onClick={() => setLinkChangeOpen(true)}
```

- [ ] **Step 3: Wire "Suggest KB article" in Quick Actions**

Find the dead "Suggest KB article" button (around line 804-816). Add:
```tsx
onClick={() => navigate(`/kb/editor?source=problem&id=${problem!.publicId}&title=${encodeURIComponent(problem!.title)}`)}
```

- [ ] **Step 4: Add LinkChangeModal to render**

At the bottom of the component return, add:

```tsx
<LinkChangeModal
  isOpen={linkChangeOpen}
  onClose={() => setLinkChangeOpen(false)}
  currentChangeIds={problem!.linkedChangeIds}
  onLink={newIds =>
    setProblem(prev =>
      prev
        ? { ...prev, linkedChangeIds: [...new Set([...prev.linkedChangeIds, ...newIds])] }
        : prev
    )
  }
/>
```

- [ ] **Step 5: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/problems/ProblemDetail.tsx
git commit -m "feat(problems): wire link change and suggest KB article buttons"
```

---

## Task 4: Create RescheduleModal

**Files:**
- Create: `src/components/changes/RescheduleModal.tsx`

> **Context:** A small modal with two datetime inputs (new planned start and end). Validates that end is after start. On confirm calls `onReschedule` with new ISO datetime strings.

- [ ] **Step 1: Create the file**

```tsx
// src/components/changes/RescheduleModal.tsx
import React, { useState } from 'react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStart: string;
  currentEnd: string;
  onReschedule: (newStart: string, newEnd: string) => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  currentStart,
  currentEnd,
  onReschedule,
}) => {
  const toDatetimeLocal = (iso: string) => iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"

  const [newStart, setNewStart] = useState(toDatetimeLocal(currentStart));
  const [newEnd, setNewEnd]     = useState(toDatetimeLocal(currentEnd));
  const [error, setError]       = useState('');

  const handleConfirm = () => {
    if (!newStart || !newEnd) { setError('Both dates are required.'); return; }
    if (new Date(newEnd) <= new Date(newStart)) {
      setError('End must be after start.');
      return;
    }
    onReschedule(new Date(newStart).toISOString(), new Date(newEnd).toISOString());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Change" size="sm">
      <div className="py-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned start</label>
          <input
            type="datetime-local"
            value={newStart}
            onChange={e => { setNewStart(e.target.value); setError(''); }}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ois-text-muted">New planned end</label>
          <input
            type="datetime-local"
            value={newEnd}
            onChange={e => { setNewEnd(e.target.value); setError(''); }}
            className="w-full h-9 rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>
        {error && <p className="text-xs text-ois-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm}>Reschedule</Button>
        </div>
      </div>
    </Modal>
  );
};
```

- [ ] **Step 2: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/changes/RescheduleModal.tsx
git commit -m "feat(changes): add RescheduleModal component"
```

---

## Task 5: ChangeDetail — Actions overflow + Reschedule button

**Files:**
- Modify: `src/routes/changes/ChangeDetail.tsx`

> **Context:** `ChangeDetail` has `const [changeStatus, setChangeStatus] = useState<ChangeStatus>(...)`. We need to add state for the Actions overflow menu and the Reschedule modal. The `Change` object is read from mock — add `const [change, setChange] = useState(rawChange)` so the rescheduled dates reflect in the UI.

- [ ] **Step 1: Add new state and imports**

At the top of `ChangeDetail`, add to imports:
```tsx
import { RescheduleModal } from '@/src/components/changes/RescheduleModal';
```

In the state block (near line 34), add:
```tsx
const [actionsOpen, setActionsOpen] = useState(false);
const [rescheduleOpen, setRescheduleOpen] = useState(false);
```

Also look for where `rawChange` / the change object is read from mock. If the component reads it directly (e.g. `const change = mockChanges.find(...)`) without local state, add:
```tsx
const [change, setChange] = useState(rawChange ?? null);
```
And update all subsequent reads to use `change` instead of `rawChange`. If it already uses local state, skip this step.

- [ ] **Step 2: Wire Actions overflow menu**

Find the dead "Actions" button near line 154. Replace with:

```tsx
<div className="relative">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setActionsOpen(v => !v)}
    className="gap-1.5"
  >
    Actions
    <ChevronDown size={14} />
  </Button>
  {actionsOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[180px]">
        {[
          {
            label: 'Copy change ID',
            action: () => navigator.clipboard.writeText(change!.publicId),
          },
          {
            label: 'Copy link',
            action: () => navigator.clipboard.writeText(window.location.href),
          },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => { item.action(); setActionsOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors text-ois-text"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

Add `ChevronDown` to the lucide-react import if not already present.

- [ ] **Step 3: Wire Reschedule button**

Find the dead Reschedule button near line 562 (currently `onClick={() => {}}`). Replace:
```tsx
onClick={() => setRescheduleOpen(true)}
```

- [ ] **Step 4: Add modals to render**

At the bottom of the component return (alongside the existing cancel confirmation modal), add:

```tsx
<RescheduleModal
  isOpen={rescheduleOpen}
  onClose={() => setRescheduleOpen(false)}
  currentStart={change!.plannedStart}
  currentEnd={change!.plannedEnd}
  onReschedule={(newStart, newEnd) =>
    setChange(prev =>
      prev ? { ...prev, plannedStart: newStart, plannedEnd: newEnd } : prev
    )
  }
/>
```

- [ ] **Step 5: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/changes/ChangeDetail.tsx
git commit -m "feat(changes): wire Actions overflow menu and Reschedule button"
```

---

## Final verification

- [ ] **Run lint one final time**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: clean exit, no errors.

- [ ] **Update BUTTON-WIRING-GUIDE.md tracker**

In `docs/BUTTON-WIRING-GUIDE.md`, update these rows from `❌ Not started` to `✅ Done`:

| Page | Buttons |
|------|---------|
| `ProblemDetail.tsx` | Edit description, Link incidents, Link change, Suggest KB article |
| `ChangeDetail.tsx` | Actions dropdown, Reschedule |

```bash
git add docs/BUTTON-WIRING-GUIDE.md
git commit -m "docs: mark problem/change buttons as done in wiring tracker"
```

---

## Self-Review Notes

- **No placeholders:** All code blocks are complete and runnable.
- **Type consistency:** `setProblem(prev => prev ? { ...prev } : prev)` pattern matches the existing `[problem, setProblem] = useState<Problem | undefined>` shape throughout.
- **Reused components:** `LinkIncidentsModal` and `LinkChangeModal` are imported, not recreated.
- **CABWorkspace / NewChange:** No dead buttons found during audit — excluded from scope.
- **`change!` non-null assertion:** Safe after the existing not-found guard in `ChangeDetail`.
