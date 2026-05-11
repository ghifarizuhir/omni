# Dashboard Dead Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 3 dead buttons on the Dashboard — Action Required item actions, time range filter, and Refresh.

**Architecture:** Dashboard is currently stateless (no `useState`). Task 1 adds a single `onClick` with no state needed. Task 2 introduces `useState` for `timeRange`, `timeRangeOpen`, and `lastRefreshed`, plus two `useMemo` hooks that filter incidents and inbox items by the selected date window. The reference date stays `new Date('2026-05-08')` — consistent with the existing hardcoded `today` on line 56. No new imports beyond `useState` and `useMemo` from React.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, `useNavigate` (already imported), no additional libraries.

---

## File Map

| File | Action | Buttons wired |
|------|--------|---------------|
| `src/routes/Dashboard.tsx` | Modify | Action Required primary actions, time range dropdown, Refresh |

No new files required.

---

## Task 1: Wire Action Required primary action buttons

**Files:**
- Modify: `src/routes/Dashboard.tsx` (~line 292)

> **Context:** Each inbox item in the Action Required card has an optional `primaryAction: { label: string; navigateTo: string }`. The dead button renders `item.primaryAction.label` (or "View") but has no `onClick`. `navigate` is already in scope from `useNavigate()` at the top of the component.

- [ ] **Step 1: Read the file**

Read `src/routes/Dashboard.tsx` lines 260–310 to find the exact dead button and confirm the `item` variable name and `primaryAction` field.

- [ ] **Step 2: Add onClick to the Action Required button**

Find the dead `<Button>` at ~line 292 that renders `item.primaryAction?.label ?? 'View'`. It currently has no `onClick`. Add:

```tsx
onClick={() => navigate(item.primaryAction?.navigateTo ?? item.sourceUrl)}
```

The full button should look like:

```tsx
<Button
  size="xs"
  variant="primary"
  onClick={() => navigate(item.primaryAction?.navigateTo ?? item.sourceUrl)}
>
  {item.primaryAction?.label ?? 'View'}
</Button>
```

Keep all other attributes (`size`, `variant`, className if any) unchanged.

- [ ] **Step 3: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat(dashboard): wire action required primary action buttons"
```

---

## Task 2: Time range filter + Refresh button

**Files:**
- Modify: `src/routes/Dashboard.tsx`

> **Context:** The dashboard reads active incidents via `getActiveIncidents()` and inbox items via `mockInboxItems` directly — no filtering today. We add `timeRange` state and two `useMemo` hooks that filter each dataset by `createdAt` / `receivedAt` relative to the reference date `new Date('2026-05-08')`. The Refresh button gets a `lastRefreshed` timestamp state and shows a "Refreshed just now" indicator. The `useMemo` deps include `refreshCount` so clicking Refresh causes the memos to re-run (visually confirming the action).

- [ ] **Step 1: Read the file**

Read `src/routes/Dashboard.tsx` in full. Note:
- Where `activeIncidents` is currently derived (direct call to `getActiveIncidents()`, ~line 33)
- Where `mockInboxItems` is used in the Action Required card (~line 273)
- The header area with dead "Last 24h" and "Refresh" buttons (~lines 91–96)
- Whether `useState` and `useMemo` are already imported from React

- [ ] **Step 2: Add module-level constants**

Above the component function (before `export const Dashboard`), add:

```tsx
type DashboardTimeRange = '24h' | '7d' | '30d';

const DASHBOARD_RANGE_LABELS: Record<DashboardTimeRange, string> = {
  '24h': 'Last 24h',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
};

const DASHBOARD_REFERENCE_DATE = new Date('2026-05-08');
```

- [ ] **Step 3: Add useState and useMemo to React imports**

Find the React import line. Ensure `useState`, `useMemo` are included:

```tsx
import React, { useState, useMemo } from 'react';
```

If `React` is not explicitly imported (JSX transform), just add the named imports alongside any existing ones:

```tsx
import { useState, useMemo } from 'react';
```

- [ ] **Step 4: Add state variables**

Inside the component function, after the existing derived constants (`activeIncidents`, `majorActive`, `today`, etc.), add:

```tsx
const [timeRange, setTimeRange]         = useState<DashboardTimeRange>('24h');
const [timeRangeOpen, setTimeRangeOpen] = useState(false);
const [refreshCount, setRefreshCount]   = useState(0);
const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
```

- [ ] **Step 5: Add filtered data memos**

After the state variables, add:

```tsx
const filteredActiveIncidents = useMemo(() => {
  const ms =
    timeRange === '24h' ? 86_400_000 :
    timeRange === '7d'  ? 7  * 86_400_000 :
                          30 * 86_400_000;
  const cutoff = new Date(DASHBOARD_REFERENCE_DATE.getTime() - ms);
  return getActiveIncidents().filter(
    i => new Date(i.createdAt).getTime() >= cutoff.getTime()
  );
}, [timeRange, refreshCount]);

const filteredInboxItems = useMemo(() => {
  const ms =
    timeRange === '24h' ? 86_400_000 :
    timeRange === '7d'  ? 7  * 86_400_000 :
                          30 * 86_400_000;
  const cutoff = new Date(DASHBOARD_REFERENCE_DATE.getTime() - ms);
  return mockInboxItems.filter(
    item => new Date(item.receivedAt).getTime() >= cutoff.getTime()
  );
}, [timeRange, refreshCount]);
```

- [ ] **Step 6: Update data references**

Replace the two existing direct references:
1. Find everywhere `activeIncidents` is used in JSX (KPI card counts, the incidents list). Replace `activeIncidents` with `filteredActiveIncidents`.
2. Find the Action Required card where `mockInboxItems` is sliced or mapped. Replace `mockInboxItems` with `filteredInboxItems`.

**Important:** The existing `activeIncidents` constant (derived via `getActiveIncidents()` on ~line 33) is now replaced by `filteredActiveIncidents` from the memo. Either remove the old `activeIncidents` line or keep it only for count display purposes — but make sure the JSX consistently uses `filteredActiveIncidents`.

- [ ] **Step 7: Wire the time range dropdown**

Find the dead "Last 24h" button (~line 91). Replace it with:

```tsx
<div className="relative">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setTimeRangeOpen(v => !v)}
    className="gap-1.5"
  >
    {DASHBOARD_RANGE_LABELS[timeRange]}
    <ChevronDown size={13} className={timeRangeOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </Button>
  {timeRangeOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setTimeRangeOpen(false)} />
      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[150px]">
        {(Object.entries(DASHBOARD_RANGE_LABELS) as [DashboardTimeRange, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTimeRange(key); setTimeRangeOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors ${timeRange === key ? 'font-semibold text-ois-primary' : 'text-ois-text'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

`ChevronDown` is already imported in this file.

- [ ] **Step 8: Wire the Refresh button**

Find the dead "Refresh" button (~line 94). Add `onClick` and a last-refreshed indicator:

```tsx
<div className="flex flex-col items-end gap-0.5">
  <Button
    variant="outline"
    size="sm"
    className="gap-1.5"
    onClick={() => {
      setRefreshCount(c => c + 1);
      setLastRefreshed(new Date());
    }}
  >
    <RefreshCw size={14} />
    Refresh
  </Button>
  {lastRefreshed && (
    <span className="text-[11px] text-ois-text-subtle">
      Refreshed just now
    </span>
  )}
</div>
```

`RefreshCw` is already imported in this file.

- [ ] **Step 9: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Fix any TypeScript errors (most likely caused by `InboxItem` missing `receivedAt` — if the field is named differently, use the correct field name from the type).

- [ ] **Step 10: Commit**

```bash
git add src/routes/Dashboard.tsx
git commit -m "feat(dashboard): wire time range filter and refresh button"
```

---

## Final steps

- [ ] **Update tracker**

In `docs/BUTTON-WIRING-GUIDE.md`, update:

```
| `Dashboard.tsx` | Last 24h time filter | ✅ |
| `Dashboard.tsx` | Refresh              | ✅ |
| `Dashboard.tsx` | Action Required primary actions | ✅ |
```

```bash
git add docs/BUTTON-WIRING-GUIDE.md
git commit -m "docs: mark dashboard buttons as done in wiring tracker"
```

---

## Self-Review

- **No placeholders:** All code blocks are complete and runnable.
- **Type consistency:** `DashboardTimeRange` defined at module level (Task 2 Step 2) used consistently in `useState<DashboardTimeRange>` (Step 4), `filteredActiveIncidents` memo (Step 5), and dropdown (Step 7).
- **`receivedAt` field:** Step 9 explicitly handles the case where the field might be named differently — implementer must verify against the actual `InboxItem` type.
- **`activeIncidents` replacement:** Step 6 calls out that the old `const activeIncidents = getActiveIncidents()` must be reconciled with the new `filteredActiveIncidents` memo to avoid duplicate logic.
- **Task 1 is independent:** Can be reviewed and shipped before Task 2 without any conflict.
