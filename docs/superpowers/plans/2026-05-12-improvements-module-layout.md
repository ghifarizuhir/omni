# Improvements Module Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the four Improvement pages (Register, Kanban, Heatmap, Benefit Tracker) into a single module with a shared header + tab bar, following the Module Layout Pattern documented in `docs/DESIGN-SYSTEM.md:843-1042` and the reference implementation `src/routes/monitoring/MonitoringLayout.tsx`.

**Architecture:** Create one `ImprovementsLayout.tsx` that owns the shared title block (with portfolio-derived stats and a semantic accent strip) and renders a `NavLink` tab bar above `<Outlet />`. Nest the four existing pages as children of that layout in the router. Strip each page's duplicated `<h1>`, portfolio summary line, and cross-link strip — those now live in the shared header. Each page becomes a `flex flex-col flex-1 min-h-0` container with its own scrollable body, mirroring `MonitoringRules`.

**Tech Stack:** React 19 + TypeScript, React Router v6 (`NavLink`, `Outlet`), Tailwind 4 with OIS tokens, `lucide-react` icons.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/routes/improvement/ImprovementsLayout.tsx` | **Create** | Shared module header (title + live stats + accent strip) and tab bar; renders `<Outlet />` |
| `src/routes/index.tsx` | Modify | Nest the four improvement routes under `<ImprovementsLayout />`; keep `ImprovementDetail` as a sibling route outside the layout |
| `src/routes/improvement/ImprovementRegister.tsx` | Modify | Remove duplicated page header, KPI strip, and cross-link strip; wrap body in `flex flex-col flex-1 min-h-0` with a scrollable inner container; move "New initiative" button into an action row |
| `src/routes/improvement/ImprovementKanban.tsx` | Modify | Remove duplicated page header + cross-link strip; wrap in `flex flex-col flex-1 min-h-0`; move "New" button into an action row |
| `src/routes/improvement/ImprovementHeatmap.tsx` | Modify | Remove duplicated page header + cross-link strip; wrap in `flex flex-col flex-1 min-h-0` |
| `src/routes/improvement/BenefitTracker.tsx` | Modify | Remove duplicated page header + cross-link strip; wrap in `flex flex-col flex-1 min-h-0`; move "Log measurement" button into an action row |

**Out of scope:** Sidebar already has one `Improvements` entry — no change. `ImprovementDetail` is a sibling route (drill-in detail) and is unaffected.

**No tests exist in this repo** (`package.json` has no test runner; `npm run lint` = `tsc --noEmit`). The verification step is `npm run lint` followed by manual smoke in the dev server.

---

## Task 1: Create `ImprovementsLayout.tsx`

**Files:**
- Create: `src/routes/improvement/ImprovementsLayout.tsx`

- [ ] **Step 1: Write the layout component**

Create `src/routes/improvement/ImprovementsLayout.tsx` with:

```tsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ListChecks, KanbanSquare, Grid3x3, DollarSign } from 'lucide-react';
import {
  mockImprovements,
  getTotalEstimatedBenefitUSD,
  getTotalActualBenefitUSD,
} from '@/src/mocks/improvements';
import { formatBenefitUSD } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';

const TODAY = '2026-05-12';

const TABS = [
  { label: 'Register', to: '/improvement',          icon: ListChecks,    end: true },
  { label: 'Kanban',   to: '/improvement/kanban',   icon: KanbanSquare },
  { label: 'Heatmap',  to: '/improvement/heatmap',  icon: Grid3x3 },
  { label: 'Benefits', to: '/improvement/benefits', icon: DollarSign },
];

export const ImprovementsLayout: React.FC = () => {
  const totalEstimated = getTotalEstimatedBenefitUSD();
  const totalActual = getTotalActualBenefitUSD();
  const inProgressCount = mockImprovements.filter(i => i.status === 'in_progress').length;
  const activeCount = mockImprovements.filter(
    i => !['completed', 'cancelled'].includes(i.status),
  ).length;
  const overdueCount = mockImprovements.filter(
    i => i.targetCompletionDate && i.targetCompletionDate < TODAY
      && !['completed', 'cancelled'].includes(i.status),
  ).length;
  const criticalBlocked = mockImprovements.filter(
    i => i.priority === 'critical' && i.status === 'on_hold',
  ).length;

  // Accent: red when critical work is blocked, amber when overdue exists,
  // green when realization is healthy, primary blue otherwise.
  const accentColor =
    criticalBlocked > 0 ? '#B42318' :
    overdueCount > 0    ? '#DC6803' :
    totalActual > 0 && totalActual >= totalEstimated * 0.5 ? '#12B76A' :
    '#1F4FD4';

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Shared header ── */}
      <div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">

        {/* Title block with accent strip */}
        <div className="flex items-stretch">
          <div
            className="w-1 shrink-0 transition-colors duration-500"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex-1 px-6 py-4">
            <h1 className="text-xl font-bold text-ois-text">Improvements</h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
              <span className="font-medium text-ois-text">{activeCount} active</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>{inProgressCount} in progress</span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>
                <span className="font-semibold text-ois-text">{formatBenefitUSD(totalEstimated)}</span> estimated
              </span>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span>
                <span className="font-semibold text-ois-success">{formatBenefitUSD(totalActual)}</span> realized YTD
              </span>
              {overdueCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-warning">{overdueCount} overdue</span>
                </>
              )}
              {criticalBlocked > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
                  <span className="font-semibold text-ois-danger">{criticalBlocked} critical blocked</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <nav className="flex px-4 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn(
                'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                isActive
                  ? 'border-ois-primary text-ois-primary'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run lint`
Expected: PASS with no errors related to `ImprovementsLayout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/improvement/ImprovementsLayout.tsx
git commit -m "feat(improvement): add ImprovementsLayout with shared header and tab bar"
```

---

## Task 2: Nest improvement routes under the layout

**Files:**
- Modify: `src/routes/index.tsx:57-61, 154-158`

- [ ] **Step 1: Add the layout import**

Add this import alongside the other improvement imports in `src/routes/index.tsx` (near line 57):

```tsx
import { ImprovementsLayout } from './improvement/ImprovementsLayout';
```

- [ ] **Step 2: Replace the flat improvement routes with a nested layout**

Find this block (lines 154-158):

```tsx
      { path: 'improvement',                    element: <ImprovementRegister /> },
      { path: 'improvement/kanban',             element: <ImprovementKanban /> },
      { path: 'improvement/heatmap',            element: <ImprovementHeatmap /> },
      { path: 'improvement/benefits',           element: <BenefitTracker /> },
      { path: 'improvement/:initiativeId',      element: <ImprovementDetail /> },
```

Replace it with:

```tsx
      { path: 'improvement', element: <ImprovementsLayout />, children: [
        { index: true,        element: <ImprovementRegister /> },
        { path: 'kanban',     element: <ImprovementKanban /> },
        { path: 'heatmap',    element: <ImprovementHeatmap /> },
        { path: 'benefits',   element: <BenefitTracker /> },
      ]},
      // Detail page lives outside the tab layout
      { path: 'improvement/:initiativeId', element: <ImprovementDetail /> },
```

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Run: `npm run dev` (background)
Visit `http://localhost:3000/improvement`, click each of the four tabs (Register, Kanban, Heatmap, Benefits), then visit `http://localhost:3000/improvement/imp-001` (or any seeded improvement publicId — check `src/mocks/improvements.ts`).

Expected:
- All four tabs render their content under a single shared header titled "Improvements"
- The active tab has `border-ois-primary` + `text-ois-primary`
- The detail page renders WITHOUT the shared header (it's still a sibling route)
- Each page currently still renders its own duplicated `<h1>` and link strip — that's fixed in Tasks 3–6

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(improvement): nest tab pages under ImprovementsLayout"
```

---

## Task 3: Refactor `ImprovementRegister.tsx`

**Files:**
- Modify: `src/routes/improvement/ImprovementRegister.tsx:141-167` (page header), `:169-182` (KPI strip — keep, but reposition), full return block

- [ ] **Step 1: Update unused imports**

In `src/routes/improvement/ImprovementRegister.tsx`, the `Link` and `ArrowRight` imports become unused once the cross-link strip is removed. Remove them from the import line:

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
```

(Drop `Link` from `react-router-dom` and `ArrowRight` from `lucide-react`.)

- [ ] **Step 2: Replace the return block**

Replace the entire `return ( … )` block (starts at the `return (` near line 141 and ends at the closing `);` before `}` on line ~270) with the structure below. The KPI strip, filter bar, and table content are preserved; only the outer wrapper, page header, and cross-link strip change. The "New initiative" button moves into an action row at the top.

The skeleton:

```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row — primary CTA */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={14} /> New initiative
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-6 pb-12">

          {/* KPI strip — keep existing four-card grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Portfolio value (est.)', value: formatBenefitUSD(totalEstimated) },
              { label: 'In progress', value: String(inProgressCount) },
              { label: 'Completed (12 months)', value: String(completedCount) },
              { label: 'Actual benefit realized', value: formatBenefitUSD(totalActual) },
            ].map(kpi => (
              <div key={kpi.label} className="border border-ois-border rounded-lg bg-ois-surface p-3">
                <p className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest mb-1">{kpi.label}</p>
                <p className="text-xl font-bold text-ois-text">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* …keep the existing Quick filter chips, Filter bar, Status tab bar,
              and the ImprovementRow list exactly as they are today — copy them
              from the current file verbatim. Do NOT touch their internals. */}

        </div>
      </div>
    </div>
  );
```

**To do this safely:** open the current file, identify the three preserved blocks (quick filter chips, filter bar with FilterDropdowns, status tab bar + `filtered.map(i => <ImprovementRow … />)`), and paste them where the comment says "keep existing …". Do not modify their JSX — only their parent wrappers.

**Remove entirely:**
- The page header `<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">` block (the `<h1>Continual Improvement Register</h1>`, the count subtitle, and the four `<Link>` cross-links plus the "New initiative" button — that button is moved to the action row above)
- The `<Link>` imports (already done in Step 1)

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS. If `Link` or `ArrowRight` are reported unused, remove them.

- [ ] **Step 4: Smoke test**

Visit `http://localhost:3000/improvement`. Expected:
- No duplicate `<h1>` ("Improvements" comes from the shared header; the page-level "Continual Improvement Register" is gone)
- "New initiative" button visible at top-right in the action row
- KPI strip, quick filters, filter dropdowns, status tabs, and the table all still render and work
- The page scrolls internally (the action row stays pinned)

- [ ] **Step 5: Commit**

```bash
git add src/routes/improvement/ImprovementRegister.tsx
git commit -m "refactor(improvement): adapt Register to module layout (action row + scroll body)"
```

---

## Task 4: Refactor `ImprovementKanban.tsx`

**Files:**
- Modify: `src/routes/improvement/ImprovementKanban.tsx:44-114`

- [ ] **Step 1: Trim imports**

Replace the import line:

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, X } from 'lucide-react';
```

with:

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
```

- [ ] **Step 2: Replace the return block**

Replace the entire `return ( … )` block with:

```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <span className="text-xs text-ois-text-muted">
          {filteredInitiatives.length} of {mockImprovements.length} initiatives shown
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={14} /> New
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12">

          {/* Filter bar — copy verbatim from current file:
              the three FilterDropdown blocks (categoryFilter, ownerFilter, priorityFilter)
              and the {hasFilters && <button onClick={handleReset}…>} reset button */}

          {/* Kanban board */}
          <KanbanBoard
            initiatives={filteredInitiatives}
            benefitMeasurements={mockBenefitMeasurements}
            onNavigate={(publicId) => navigate('/improvement/' + publicId)}
          />
        </div>
      </div>
    </div>
  );
```

Copy the filter-bar `<div className="flex flex-wrap gap-2 items-center">…</div>` block verbatim from the current file (lines 72–106) into the placeholder.

**Remove entirely:**
- The page header div (h1 "Improvement Kanban" + subtitle + four cross-links + "New" button — the "New" button moves into the action row)

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Visit `http://localhost:3000/improvement/kanban`. Expected:
- Shared "Improvements" header visible at top with tabs
- Page-level `<h1>` is gone
- Action row at top shows "N of M initiatives shown" on the left and "New" button on the right
- Filter dropdowns + Kanban board render and work as before
- Horizontal scroll on the Kanban board still works inside the scrollable body

- [ ] **Step 5: Commit**

```bash
git add src/routes/improvement/ImprovementKanban.tsx
git commit -m "refactor(improvement): adapt Kanban to module layout"
```

---

## Task 5: Refactor `ImprovementHeatmap.tsx`

**Files:**
- Modify: `src/routes/improvement/ImprovementHeatmap.tsx:24-100`

- [ ] **Step 1: Trim imports**

Replace:

```tsx
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
```

with: remove both lines entirely (this page has no nav and no remaining icon usage from these).

- [ ] **Step 2: Replace the return block**

Replace the entire `return ( … )` block with:

```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row — no primary CTA, just stat summary */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <span className="text-xs text-ois-text-muted">
          {filteredInitiatives.length} initiatives displayed
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12">

          {/* Filter bar — copy verbatim: the three FilterDropdown blocks
              (statusFilter, sizeBy, colorBy) */}

          {/* Main two-column layout */}
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-4">
              <BubbleMatrix initiatives={filteredInitiatives} statusFilter={statusFilter} />
              <PortfolioSummaryStrip initiatives={filteredInitiatives} actualBenefitUSD={totalActual} />
            </div>
            <div className="w-[280px] shrink-0">
              <HeatmapGapAnalysis initiatives={filteredInitiatives} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
```

Copy the filter-bar block (the `<div className="flex flex-wrap gap-2 items-center">…</div>` containing the three FilterDropdowns from lines 50–83 of the current file) into the placeholder verbatim.

**Remove entirely:** the page header div (h1 "Improvement Portfolio Heatmap" + subtitle + three cross-links).

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Smoke test**

Visit `http://localhost:3000/improvement/heatmap`. Expected:
- Shared "Improvements" header + tabs
- Action row shows count
- Three filter dropdowns + bubble matrix + summary strip + gap analysis all render

- [ ] **Step 5: Commit**

```bash
git add src/routes/improvement/ImprovementHeatmap.tsx
git commit -m "refactor(improvement): adapt Heatmap to module layout"
```

---

## Task 6: Refactor `BenefitTracker.tsx`

**Files:**
- Modify: `src/routes/improvement/BenefitTracker.tsx:24-91`

- [ ] **Step 1: Trim imports**

Replace:

```tsx
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
```

with:

```tsx
import { Plus } from 'lucide-react';
```

Also remove the now-unused imports `getTotalEstimatedBenefitUSD` and `getTotalActualBenefitUSD` if they are no longer referenced after the header is removed. Check the rest of the file first — if they're only used in the deleted subtitle, drop them; if `mockImprovements` is still used by the child components passed in props, keep that import.

- [ ] **Step 2: Replace the return block**

Replace the entire `return ( … )` block with:

```tsx
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <button
          onClick={() => setShowLogModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Log measurement
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-6 pb-12">

          {/* Top section — 60/40 split */}
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0">
              <CumulativeBenefitChart measurements={mockBenefitMeasurements} />
            </div>
            <div className="w-[38%] shrink-0 space-y-4">
              <BenefitByTypeDonut initiatives={mockImprovements} />
              <TopContributorsList initiatives={mockImprovements} />
            </div>
          </div>

          {/* Measurement table */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-ois-text uppercase tracking-widest">Benefit measurements</h2>
            <BenefitMeasurementTable
              measurements={mockBenefitMeasurements}
              initiatives={mockImprovements}
            />
          </div>

          {/* ROI Calculator */}
          <ROICalculator />
        </div>
      </div>

      {/* Log benefit modal — fixed-positioned, safe anywhere in tree */}
      <LogBenefitModal
        open={showLogModal}
        initiatives={mockImprovements}
        onClose={() => setShowLogModal(false)}
        onSubmit={() => setShowLogModal(false)}
      />
    </div>
  );
```

**Removed:**
- The page header div (h1 "Benefit Tracker & ROI" + portfolio summary subtitle + three cross-links)
- The inline `<button onClick={() => setShowLogModal(true)}>Log measurement</button>` next to the table heading — moved into the action row at the top
- The flex header wrapping `<h2>Benefit measurements</h2>` + log button — replaced with just the `<h2>`

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: PASS. If `totalEstimated`/`totalActual` are now unused locals, remove their `const` declarations near the top of the component (lines 22–23 of the original file).

- [ ] **Step 4: Smoke test**

Visit `http://localhost:3000/improvement/benefits`. Expected:
- Shared "Improvements" header + tabs
- Action row with "Log measurement" button at top-right
- Cumulative chart + donut + contributors + measurement table + ROI calculator all render
- Clicking "Log measurement" opens the modal; closing it returns to the page

- [ ] **Step 5: Commit**

```bash
git add src/routes/improvement/BenefitTracker.tsx
git commit -m "refactor(improvement): adapt Benefit Tracker to module layout"
```

---

## Task 7: Final verification

- [ ] **Step 1: Type-check the whole project**

Run: `npm run lint`
Expected: PASS with no errors.

- [ ] **Step 2: Manual end-to-end smoke**

Visit each route in order and confirm the shared header + tab bar persist:
1. `http://localhost:3000/improvement` — Register active
2. `http://localhost:3000/improvement/kanban` — Kanban active
3. `http://localhost:3000/improvement/heatmap` — Heatmap active
4. `http://localhost:3000/improvement/benefits` — Benefits active
5. `http://localhost:3000/improvement/imp-001` (or any seeded improvement id from `src/mocks/improvements.ts`) — Detail page renders **without** the module header (it's a sibling route)

For each tab page:
- The page-level `<h1>` and the cross-link strip are gone
- The shared "Improvements" header shows: `N active · M in progress · $X estimated · $Y realized YTD` (plus optional `overdue` / `critical blocked` chips)
- The accent strip color reflects state (blue/green/amber/red per the rules in Task 1, Step 1)
- The primary CTA (where applicable) lives in the action row, not the header

- [ ] **Step 3: Final commit if anything was tweaked**

If smoke testing revealed a tweak (e.g., missing import, leftover unused variable), commit the fix:

```bash
git add -p
git commit -m "fix(improvement): post-conversion cleanup"
```

Otherwise the module conversion is complete across Tasks 1–6.

---

## Self-Review Notes

- **Spec coverage:** Every page mentioned in the user's request (Register, Kanban, Heatmap, Benefits) gets its own refactor task. `ImprovementDetail` is correctly kept outside the layout.
- **Placeholder scan:** No "TODO", "TBD", or "similar to X" instructions; each refactor task names the verbatim blocks to preserve.
- **Type consistency:** Tab `to` paths in `ImprovementsLayout` (`/improvement`, `/improvement/kanban`, `/improvement/heatmap`, `/improvement/benefits`) match the nested router config in Task 2 (`index`, `kanban`, `heatmap`, `benefits` under base `improvement`).
- **No new tests written** because the repo has no test runner (`package.json` only has `lint = tsc --noEmit`). Verification = lint + manual smoke, called out explicitly in each task.
