# Tier 1 — Foundations & Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Tier 1 of the light-UI refresh: five shared UI primitives + sidebar contrast inversion + `⌘K` navigation palette (PR-1), then adopt the primitives across four ops-critical list routes (PR-2).

**Architecture:** Build all primitives in `src/components/ui/` matching existing patterns (small focused files, named exports, Tailwind + the `cn()` utility from `src/lib/utils.ts`). Token changes live in `src/index.css` under `@theme`. Sweep PR-2 routes mechanically using the new primitives — keep detail pages untouched.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, `motion/react` (already installed), `react-router-dom` (already in use). No new dependencies.

**Testing strategy:** Codebase has no frontend test infrastructure (no `@testing-library/react`, no Storybook). For this plan, verification is `npm run lint` (typecheck) plus visual smoke at `npm run dev`. Each primitive gets a checklist of states to verify in the browser. Frontend testing infra is out of scope; retrofitting tests can happen in a later cycle.

**Spec:** `docs/superpowers/specs/2026-05-16-light-ui-tier-execution-design.md`

---

## File map

**Create (PR-1):**
- `src/components/ui/Dot.tsx`
- `src/components/ui/SeverityStripe.tsx`
- `src/components/ui/IDCell.tsx`
- `src/components/ui/StatusRing.tsx`
- `src/components/ui/CmdKPalette.tsx`

**Modify (PR-1):**
- `src/index.css` (token update + new content-bg token + adjust card shadow)
- `src/components/layout/TopBar.tsx` (add `⌘K` hint chip)
- `src/components/layout/AppShell.tsx` (mount `CmdKPalette`, manage open state)

**Modify (PR-2):**
- `src/components/inbox/InboxListItem.tsx` (adopt SeverityStripe, IDCell, Dot)
- `src/routes/incidents/IncidentQueue.tsx` (adopt SeverityStripe, IDCell, StatusRing)
- `src/routes/problems/ProblemList.tsx` (adopt SeverityStripe, IDCell, StatusRing)
- `src/routes/monitoring/EventStream.tsx` (adopt SeverityStripe, IDCell, StatusRing, Dot)

---

## PR-1 — Foundations

### Task 1: Token update in `src/index.css`

**Files:**
- Modify: `src/index.css:41-47` (sidebar tokens block)
- Modify: `src/index.css:49-52` (shadow tokens block)

- [ ] **Step 1: Read current state**

Run: `grep -n "ois-sidebar-bg\|shadow-ois-card" src/index.css`

Expected current value: `--color-ois-sidebar-bg: #FFFFFF;`. If different, halt and reconcile.

- [ ] **Step 2: Apply token changes**

Edit `src/index.css`. In the `@theme { ... }` block, change:

```css
/* Sidebar Colors — light chrome (Notion-ish: white sidebar, soft inset content) */
--color-ois-sidebar-bg: #FFFFFF;
```

to:

```css
/* Sidebar Colors — Linear-pattern dimmed chrome so content stands out */
--color-ois-sidebar-bg: #F4F5F7;
--color-ois-content-bg: #FFFFFF;
```

And change:

```css
--shadow-ois-card: 0 1px 2px rgba(16,24,40,0.05);
```

to:

```css
--shadow-ois-card: 0 1px 2px rgba(16,24,40,0.04);
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: exits 0, no output.

- [ ] **Step 4: Visual smoke**

Run: `npm run dev`
Open `http://localhost:3000`. Verify sidebar is now slightly darker than the main content area. Cards (KPI tiles on Dashboard `/`) sit on bright white and pick up a subtle drop shadow. Stop the dev server (`Ctrl-C`) before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
feat(ui): dim sidebar surface so content stands out

Inverts contrast: sidebar #F4F5F7, content #FFFFFF. Matches the
Linear-pattern recommendation from the design-references study.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `<Dot />` primitive

**Files:**
- Create: `src/components/ui/Dot.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/ui/Dot.tsx`:

```tsx
import React from 'react';
import { cn } from '@/src/lib/utils';

export type DotVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';
export type DotSize = 'sm' | 'md' | 'lg';

interface DotProps {
  variant?: DotVariant;
  size?: DotSize;
  pulse?: boolean;
  className?: string;
  'aria-label'?: string;
}

const VARIANT_CLASS: Record<DotVariant, string> = {
  success: 'bg-ois-success',
  warning: 'bg-ois-warning',
  danger:  'bg-ois-danger',
  info:    'bg-ois-info',
  muted:   'bg-ois-text-subtle',
};

const SIZE_CLASS: Record<DotSize, string> = {
  sm: 'w-1.5 h-1.5',  // 6px
  md: 'w-2   h-2',    // 8px
  lg: 'w-2.5 h-2.5',  // 10px
};

export const Dot: React.FC<DotProps> = ({
  variant = 'muted',
  size = 'md',
  pulse = false,
  className,
  'aria-label': ariaLabel,
}) => {
  if (pulse) {
    return (
      <span className={cn('relative inline-flex shrink-0', SIZE_CLASS[size], className)} aria-label={ariaLabel}>
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', VARIANT_CLASS[variant])} />
        <span className={cn('relative inline-flex rounded-full', SIZE_CLASS[size], VARIANT_CLASS[variant])} />
      </span>
    );
  }
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', SIZE_CLASS[size], VARIANT_CLASS[variant], className)}
      aria-label={ariaLabel}
    />
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: exits 0, no output.

- [ ] **Step 3: Visual smoke (ad-hoc)**

Temporarily import `Dot` into `src/routes/Dashboard.tsx` near the top of the rendered JSX:

```tsx
<div style={{ display: 'flex', gap: 24, padding: 16, background: '#fff' }}>
  <Dot variant="success" /> <Dot variant="warning" /> <Dot variant="danger" />
  <Dot variant="info" /> <Dot variant="muted" /> <Dot variant="success" pulse />
</div>
```

Run `npm run dev`, open `/`, confirm five static dots in correct colors plus one pulsing green dot. Remove the temporary block. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Dot.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add Dot primitive for status indicators

Five-variant colored dot (success/warning/danger/info/muted) at three
sizes, optional ping animation. Replaces ad-hoc inline spans across
the app.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `<SeverityStripe />` primitive

**Files:**
- Create: `src/components/ui/SeverityStripe.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/ui/SeverityStripe.tsx`:

```tsx
import React from 'react';
import { cn } from '@/src/lib/utils';

export type StripeSeverity = 'P1' | 'P2' | 'P3' | 'P4';

interface SeverityStripeRowProps extends React.HTMLAttributes<HTMLDivElement> {
  severity: StripeSeverity;
  children: React.ReactNode;
}

const COLOR: Record<StripeSeverity, string> = {
  P1: '#B42318',  // ois-sev-p1
  P2: '#DC6803',  // ois-sev-p2
  P3: '#DC6803',  // ois-sev-p3 (same hue as P2 per existing tokens)
  P4: '#027A48',  // ois-sev-p4
};

/**
 * Row wrapper that applies a 3px left-edge accent in severity hue.
 * Use as the outer element of a list row when severity should be visible
 * from peripheral vision (vertical scan speed matters in ops lists).
 */
export const SeverityStripeRow: React.FC<SeverityStripeRowProps> = ({
  severity,
  className,
  style,
  children,
  ...rest
}) => (
  <div
    className={cn('border-l-[3px]', className)}
    style={{ borderLeftColor: COLOR[severity], ...style }}
    {...rest}
  >
    {children}
  </div>
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: exits 0, no output.

- [ ] **Step 3: Visual smoke**

Same approach as Task 2: temporarily mount four rows in `Dashboard.tsx`:

```tsx
import { SeverityStripeRow } from '@/src/components/ui/SeverityStripe';
{(['P1','P2','P3','P4'] as const).map(s => (
  <SeverityStripeRow key={s} severity={s} className="bg-white px-3 py-2 mb-2">
    Severity {s} row
  </SeverityStripeRow>
))}
```

Run `npm run dev`, confirm four rows each with a 3px left stripe in the correct severity color. Remove the temporary block, stop the server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SeverityStripe.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add SeverityStripeRow primitive

3px left-edge accent on a list row, hue keyed to P1–P4 severity. Used
by ops-critical list routes to make severity scannable from peripheral
vision without a full chip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `<IDCell />` primitive

**Files:**
- Create: `src/components/ui/IDCell.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/ui/IDCell.tsx`:

```tsx
import React from 'react';
import { cn } from '@/src/lib/utils';

interface IDCellProps {
  value: string;
  className?: string;
}

/**
 * Mono identifier column for list rows (INC-1042, CHG-882, etc.).
 * Geist Mono via `font-mono`, tabular numerics, muted text color.
 */
export const IDCell: React.FC<IDCellProps> = ({ value, className }) => (
  <span
    className={cn(
      'font-mono text-[12px] tabular-nums text-ois-text-muted whitespace-nowrap',
      className,
    )}
  >
    {value}
  </span>
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/IDCell.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add IDCell primitive for mono entity identifiers

Geist Mono 12px tabular-nums muted-gray cell. Replaces ad-hoc spans
that render INC-/CHG-/EV-/CI- IDs across list rows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `<StatusRing />` primitive

**Files:**
- Create: `src/components/ui/StatusRing.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/ui/StatusRing.tsx`:

```tsx
import React from 'react';
import { cn } from '@/src/lib/utils';

export type RingState =
  | 'open'           // empty ring, muted
  | 'acknowledged'   // half-filled, OIS blue
  | 'investigating'  // three-quarter filled, OIS blue
  | 'resolved'       // filled green + check
  | 'closed';        // dashed empty ring, muted

interface StatusRingProps {
  state: RingState;
  className?: string;
  'aria-label'?: string;
}

/**
 * 14px glyph that encodes incident/event state. Replaces a status chip
 * in list rows where a single glyph is enough.
 */
export const StatusRing: React.FC<StatusRingProps> = ({ state, className, 'aria-label': ariaLabel }) => {
  const label = ariaLabel ?? `Status: ${state}`;
  switch (state) {
    case 'open':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#98A2B3" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'acknowledged':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#1F4FD4" strokeWidth="1.5" fill="none" />
          <path d="M7 1.5 a 5.5 5.5 0 0 1 0 11 Z" fill="#1F4FD4" />
        </svg>
      );
    case 'investigating':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#1F4FD4" strokeWidth="1.5" fill="none" />
          <path d="M7 1.5 a 5.5 5.5 0 0 1 5.5 5.5 a 5.5 5.5 0 0 1 -5.5 5.5 Z" fill="#1F4FD4" />
        </svg>
      );
    case 'resolved':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" fill="#12B76A" />
          <path d="M4.5 7 L6.5 9 L9.5 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'closed':
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" className={cn('shrink-0', className)} aria-label={label} role="img">
          <circle cx="7" cy="7" r="5.5" stroke="#98A2B3" strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
        </svg>
      );
  }
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 3: Visual smoke**

Temporarily mount in `Dashboard.tsx`:

```tsx
import { StatusRing } from '@/src/components/ui/StatusRing';
<div style={{ display:'flex', gap:24, padding:16, background:'#fff' }}>
  {(['open','acknowledged','investigating','resolved','closed'] as const).map(s => (
    <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13 }}>
      <StatusRing state={s} /> {s}
    </span>
  ))}
</div>
```

Verify five glyphs in the correct visual state. Remove the temporary block, stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/StatusRing.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add StatusRing primitive — 14px state glyph

Five-state ring (open/acknowledged/investigating/resolved/closed)
that replaces status chips in list rows. Borrowed from Linear's
status-as-progress-ring convention.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `<CmdKPalette />` — navigation-only palette

**Files:**
- Create: `src/components/ui/CmdKPalette.tsx`

This task is larger than the others — it's a small interactive component. Single commit at the end.

- [ ] **Step 1: Inventory routes for the palette**

Run: `grep -E "^\s*\{ path:|^\s*<Route path" src/routes/index.tsx | head -40`

Use the output to identify the user-facing route paths (typically things like `/`, `/inbox`, `/incidents`, `/problems`, `/cmdb`, `/events`, `/changes`, `/availability`, `/on-call`, `/settings`). Note down ~15–20 top-level routes that make sense for "Go to X" navigation. Skip nested detail routes (e.g., `/incidents/:id`).

- [ ] **Step 2: Create the file**

Write `src/components/ui/CmdKPalette.tsx`:

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard, Inbox, AlertCircle, Bug, Activity, Database, Heart, Zap,
  Lock, Wrench, Package, Rocket, CheckCircle2, ShoppingCart, BookOpen,
  Store, BarChart3, Clock, Lightbulb, Settings, CircleDot,
} from 'lucide-react';

interface RouteEntry {
  path: string;
  label: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const ROUTES: RouteEntry[] = [
  { path: '/',             label: 'Dashboard',         icon: <LayoutDashboard size={14} />, keywords: ['overview', 'pulse', 'home'] },
  { path: '/inbox',        label: 'Inbox',             icon: <Inbox size={14} /> },
  { path: '/incidents',    label: 'Incidents',         icon: <AlertCircle size={14} /> },
  { path: '/problems',     label: 'Problems',          icon: <Bug size={14} /> },
  { path: '/portal',       label: 'Self-Service Portal', icon: <Store size={14} /> },
  { path: '/requests',     label: 'Service Requests',  icon: <ShoppingCart size={14} /> },
  { path: '/kb',           label: 'Knowledge Base',    icon: <BookOpen size={14} /> },
  { path: '/changes',      label: 'Changes',           icon: <Wrench size={14} /> },
  { path: '/releases',     label: 'Releases',          icon: <Package size={14} /> },
  { path: '/deployments',  label: 'Deployments',       icon: <Rocket size={14} /> },
  { path: '/testing/plans',label: 'Testing',           icon: <CheckCircle2 size={14} /> },
  { path: '/availability', label: 'Availability',      icon: <Heart size={14} /> },
  { path: '/capacity',     label: 'Capacity',          icon: <Zap size={14} /> },
  { path: '/continuity/bia', label: 'Continuity',      icon: <Lock size={14} /> },
  { path: '/status',       label: 'Status Page',       icon: <CircleDot size={14} /> },
  { path: '/monitoring',   label: 'Monitoring',        icon: <Activity size={14} /> },
  { path: '/dashboards',   label: 'Measurement',       icon: <BarChart3 size={14} /> },
  { path: '/cmdb',         label: 'CMDB',              icon: <Database size={14} />, keywords: ['ci', 'configuration'] },
  { path: '/on-call',      label: 'On-Call',           icon: <Clock size={14} /> },
  { path: '/improvement',  label: 'Improvements',      icon: <Lightbulb size={14} /> },
  { path: '/settings',     label: 'Settings',          icon: <Settings size={14} /> },
];
// NOTE: keep this list in sync with src/routes/index.tsx when routes change.

interface CmdKPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CmdKPalette: React.FC<CmdKPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter(r => {
      const hay = (r.label + ' ' + r.path + ' ' + (r.keywords ?? []).join(' ')).toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  // Reset state when opened; focus input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Defer focus until after the modal is in the DOM.
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clamp active index when results shrink.
  useEffect(() => {
    if (active >= results.length) setActive(Math.max(0, results.length - 1));
  }, [results.length, active]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[active];
      if (target) {
        navigate(target.path);
        onClose();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        className="relative w-full max-w-[560px] rounded-[12px] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ois-border">
          <span className="font-mono text-[11px] text-ois-text-subtle">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search routes, jump to…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ois-text placeholder:text-ois-text-subtle"
            aria-label="Search routes"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1" role="listbox">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-ois-text-muted">No matches</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.path}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => { navigate(r.path); onClose(); }}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-2 cursor-pointer text-[13px]',
                  i === active ? 'bg-[rgba(31,79,212,0.06)] text-ois-primary' : 'text-ois-text',
                )}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={cn('shrink-0', i === active ? 'text-ois-primary' : 'text-ois-text-muted')}>
                    {r.icon}
                  </span>
                  <span className="truncate">Go to <strong>{r.label}</strong></span>
                </span>
                <span className="font-mono text-[10px] text-ois-text-subtle">{r.path}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: exits 0. Fix any type/import errors before continuing.

- [ ] **Step 4: Commit (mounting happens in Task 8)**

```bash
git add src/components/ui/CmdKPalette.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add CmdKPalette — navigation-only command palette

Route fuzzy-filter with keyboard navigation (arrows + enter + escape).
Navigation only in this PR; creation/action commands deferred.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Add `⌘K` hint chip to TopBar

**Files:**
- Modify: `src/components/layout/TopBar.tsx` (search input's kbd chip area)

- [ ] **Step 1: Locate the kbd chip**

Run: `grep -n "kbd" src/components/layout/TopBar.tsx`

Expected: a line containing `<kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-white text-[10px] font-medium text-ois-text-muted">/</kbd>`.

- [ ] **Step 2: Replace the chip**

Edit `src/components/layout/TopBar.tsx`. Find:

```tsx
<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
  <kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-white text-[10px] font-medium text-ois-text-muted">/</kbd>
</div>
```

Replace with:

```tsx
<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
  <kbd className="px-1.5 py-0.5 rounded border border-ois-border bg-white text-[10px] font-medium text-ois-text-muted font-mono">⌘K</kbd>
</div>
```

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "$(cat <<'EOF'
feat(topbar): swap '/' kbd hint for ⌘K

Signals the global command palette (mounted in next commit) without
hiding the visible search field.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Mount `CmdKPalette` in `AppShell` with `⌘K` shortcut

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Read current state**

Run: `grep -n "aiPanelOpen\|Cmd+K\|setAiPanelOpen" src/components/layout/AppShell.tsx`

Note: the file already has a `Cmd+K` listener that toggles the AI panel on non-AI routes. We must keep both working — AI panel still opens with `⌘K` on routes that have AI, palette opens with `⌘K` everywhere else? No: that conflicts. **Decision:** `⌘K` now opens the **palette globally**; AI panel keeps its existing toggle button in TopBar but no longer has a global shortcut. (If the user wants a dedicated AI shortcut later, `⌘J` or `⌘.` is a natural pick — out of scope for this PR.)

- [ ] **Step 2: Update imports**

In `src/components/layout/AppShell.tsx`, add to the existing imports block:

```tsx
import { CmdKPalette } from '@/src/components/ui/CmdKPalette';
```

- [ ] **Step 3: Add palette state**

Inside the `AppShell` component body, near the other `useState` hooks (e.g., after `const [aiPanelOpen, setAiPanelOpen] = useState(false);`), add:

```tsx
const [cmdKOpen, setCmdKOpen] = useState(false);
```

- [ ] **Step 4: Replace the existing Cmd-K shortcut handler**

Find:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !isAiRoute) {
      e.preventDefault();
      setAiPanelOpen((prev) => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isAiRoute]);
```

Replace with:

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdKOpen(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

- [ ] **Step 5: Mount the palette in JSX**

Find the closing `</div>` of the AppShell's root container (the one that wraps Sidebar + main column + Overlays). Just before it, alongside the existing `<AnimatePresence>` overlays, add:

```tsx
<CmdKPalette open={cmdKOpen} onClose={() => setCmdKOpen(false)} />
```

- [ ] **Step 6: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 7: Visual smoke**

Run: `npm run dev`. Verify:
1. Press `⌘K` (macOS) or `Ctrl-K` (Linux/Windows) on any route — palette opens centered.
2. Type "inc" — list filters to Incidents-related entries.
3. Arrow down/up — selection moves.
4. Press Enter — navigates and palette closes.
5. Press `Escape` — palette closes without navigating.
6. Click outside the palette — closes.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(shell): mount CmdKPalette with global ⌘K shortcut

Reassigns ⌘K from the AI panel toggle to the new navigation palette.
AI panel retains its TopBar button. PR-1 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-1 milestone.** Optional: push a branch and open a PR before continuing to PR-2.

---

## PR-2 — Adoption across 4 ops-critical routes

Each adoption task is mechanical: find the existing row component, replace the severity/status/ID rendering with primitives.

### Task 9: Adopt primitives in `/inbox`

**Files:**
- Modify: `src/components/inbox/InboxListItem.tsx`

- [ ] **Step 1: Read the current row**

Run: `cat src/components/inbox/InboxListItem.tsx`

Identify three regions in the file:
1. The outer row container.
2. Where priority is rendered (currently uses `InboxPriorityBadge` likely).
3. Where the source ID / origin is rendered (if present).

- [ ] **Step 2: Add imports**

At the top of `InboxListItem.tsx`, add:

```tsx
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';
import { IDCell } from '@/src/components/ui/IDCell';
import { Dot } from '@/src/components/ui/Dot';
```

- [ ] **Step 3: Map item priority → StripeSeverity**

Above the component, add a helper:

```tsx
const PRIORITY_TO_SEVERITY: Record<string, StripeSeverity> = {
  urgent: 'P1',
  high:   'P2',
  medium: 'P3',
  low:    'P4',
};
```

Use whatever priority field exists on the inbox item type (check `src/types/`). If the values are already `P1`/`P2`/etc., skip the map and cast.

- [ ] **Step 4: Wrap the row with `SeverityStripeRow`**

Replace the row's outer element (likely a `<div>` or `<li>` with row layout classes) with:

```tsx
<SeverityStripeRow
  severity={PRIORITY_TO_SEVERITY[item.priority] ?? 'P3'}
  className="<<existing row classes, minus any prior left-border>>"
  onClick={<<existing handler>>}
>
  {/* … existing row content … */}
</SeverityStripeRow>
```

- [ ] **Step 5: Add an `IDCell` for the source ID**

After the priority area (or wherever a mono ID would naturally fit), insert:

```tsx
{item.sourceId && <IDCell value={item.sourceId} />}
```

Use the actual field name from the item type — likely `sourceRef`, `externalId`, or similar. If no ID field exists, skip this step.

- [ ] **Step 6: Replace the unread indicator with `<Dot pulse />`**

If the file has an existing unread indicator (a colored circle), replace its markup with:

```tsx
{!item.readAt && <Dot variant="info" size="sm" pulse aria-label="Unread" />}
```

- [ ] **Step 7: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 8: Visual smoke**

Run `npm run dev`, navigate to `/inbox` (or open the inbox drawer if the route is drawer-only). Verify rows now have a 3px severity stripe on the left, the mono ID renders if present, unread items show a pulsing blue dot. Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/components/inbox/InboxListItem.tsx
git commit -m "$(cat <<'EOF'
refactor(inbox): adopt SeverityStripe + IDCell + Dot primitives

List rows now read priority from peripheral vision (3px left stripe),
expose the source ID in mono, and use a pulsing Dot for unread.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Adopt primitives in `/incidents` (queue list)

**Files:**
- Modify: `src/routes/incidents/IncidentQueue.tsx`

- [ ] **Step 1: Read the file**

Run: `wc -l src/routes/incidents/IncidentQueue.tsx && grep -n "severity\|status\|INC-" src/routes/incidents/IncidentQueue.tsx | head -30`

This locates where severity, status, and the `INC-` identifier currently render.

- [ ] **Step 2: Add imports**

At the top of the file:

```tsx
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';
```

- [ ] **Step 3: Map incident status to RingState**

Above the component, add (adjust field values to match the actual `Incident['status']` enum from `src/types/`):

```tsx
const INCIDENT_STATUS_TO_RING: Record<string, RingState> = {
  open:           'open',
  triaged:        'open',
  acknowledged:   'acknowledged',
  investigating:  'investigating',
  mitigated:      'investigating',
  resolved:       'resolved',
  closed:         'closed',
};
```

If the actual enum differs, edit this map to cover every value.

- [ ] **Step 4: Replace the row outer element**

Find the JSX that renders each incident in the list — it's likely a `.map(incident => …)`. Replace its outer wrapper with:

```tsx
<SeverityStripeRow
  key={incident.id}
  severity={incident.severity as StripeSeverity}
  className="<<existing classes>>"
  onClick={() => navigate(`/incidents/${incident.id}`)}
>
  {/* row content */}
</SeverityStripeRow>
```

- [ ] **Step 5: Replace the status badge with `<StatusRing />`**

Find where the existing `<StatusBadge status={incident.status} />` (or equivalent inline chip) renders inside the row. Replace with:

```tsx
<StatusRing state={INCIDENT_STATUS_TO_RING[incident.status] ?? 'open'} />
```

Keep the existing severity badge — yes, you also have the stripe. The stripe is for peripheral scan; the badge stays so the row's primary visual element still labels severity explicitly. (Spec calls for stripe **plus** glyph + ID in lists; badge stays only when it's the row's main label.)

Reconsider per row design: if the row currently shows BOTH a severity chip and the title, the chip can stay because the stripe is decorative; if the row is already crowded, drop the severity chip and let the stripe carry it. Use the spec's "glyphs replace chips only in list contexts where vertical scan speed matters" as the deciding rule.

- [ ] **Step 6: Add `<IDCell />` for the incident identifier**

Insert just after the StatusRing (typically left-of-title):

```tsx
<IDCell value={incident.id} />
```

If the incident's display identifier is a separate field (`incident.code`, `incident.publicId`), use that instead of `incident.id`.

- [ ] **Step 7: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 8: Visual smoke**

Run `npm run dev`, navigate to `/incidents`. Verify:
- Each row has a 3px left stripe in severity hue.
- StatusRing glyph appears left of the title.
- `INC-####` renders in Geist Mono.
- Clicking a row still navigates to its detail page.

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add src/routes/incidents/IncidentQueue.tsx
git commit -m "$(cat <<'EOF'
refactor(incidents): adopt SeverityStripe + IDCell + StatusRing on queue

Incident queue rows now use the shared primitives: 3px severity stripe,
mono identifier, and the 14px status ring glyph.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Adopt primitives in `/problems`

**Files:**
- Modify: `src/routes/problems/ProblemList.tsx`

- [ ] **Step 1: Read the file**

Run: `grep -n "priority\|status\|PRB-" src/routes/problems/ProblemList.tsx | head -30`

- [ ] **Step 2: Add imports**

At the top:

```tsx
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';
```

- [ ] **Step 3: Map problem status to RingState**

Above the component:

```tsx
const PROBLEM_STATUS_TO_RING: Record<string, RingState> = {
  open:          'open',
  investigating: 'investigating',
  known_error:   'investigating',
  resolved:      'resolved',
  closed:        'closed',
};
```

Adjust to match the actual `Problem['status']` enum from `src/types/`.

- [ ] **Step 4: Map problem priority to StripeSeverity**

If problems use `P1`–`P4`, cast directly. If they use `critical|high|medium|low`, add:

```tsx
const PROBLEM_PRIORITY_TO_SEVERITY: Record<string, StripeSeverity> = {
  critical: 'P1',
  high:     'P2',
  medium:   'P3',
  low:      'P4',
};
```

- [ ] **Step 5: Replace the row outer**

Same shape as Task 10 — wrap the row's outer element in `<SeverityStripeRow severity={…}>`, replace the status chip with `<StatusRing state={…}>`, add `<IDCell value={problem.code} />`.

- [ ] **Step 6: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 7: Visual smoke**

Run `npm run dev`, navigate to `/problems`. Verify stripe / ring / mono ID render correctly. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/routes/problems/ProblemList.tsx
git commit -m "$(cat <<'EOF'
refactor(problems): adopt SeverityStripe + IDCell + StatusRing on list

Mirrors the incidents queue refactor — same primitives, same scan
affordances for the problem-management queue.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Adopt primitives in `/events`

**Files:**
- Modify: `src/routes/monitoring/EventStream.tsx`

- [ ] **Step 1: Read the file**

Run: `grep -n "severity\|status\|source\|EV-" src/routes/monitoring/EventStream.tsx | head -40`

Events have an additional `source` field (metric/log/trace) — perfect for a `<Dot />`.

- [ ] **Step 2: Add imports**

At the top:

```tsx
import { SeverityStripeRow, type StripeSeverity } from '@/src/components/ui/SeverityStripe';
import { IDCell } from '@/src/components/ui/IDCell';
import { StatusRing, type RingState } from '@/src/components/ui/StatusRing';
import { Dot, type DotVariant } from '@/src/components/ui/Dot';
```

- [ ] **Step 3: Map event status to RingState**

Above the component:

```tsx
const EVENT_STATUS_TO_RING: Record<string, RingState> = {
  open:         'open',
  acknowledged: 'acknowledged',
  investigating:'investigating',
  resolved:     'resolved',
  closed:       'closed',
};
```

- [ ] **Step 4: Map event source to Dot variant**

```tsx
const EVENT_SOURCE_TO_DOT: Record<string, DotVariant> = {
  metric: 'info',
  log:    'muted',
  trace:  'warning',
};
```

- [ ] **Step 5: Wrap the row + replace chrome**

Following the same shape as Tasks 10 and 11, the event row should render in this order, left to right:

```tsx
<SeverityStripeRow severity={event.severity as StripeSeverity} className="<<existing>>" onClick={…}>
  <StatusRing state={EVENT_STATUS_TO_RING[event.status] ?? 'open'} />
  <Dot variant={EVENT_SOURCE_TO_DOT[event.source] ?? 'muted'} size="sm" aria-label={`Source: ${event.source}`} />
  <IDCell value={event.code ?? event.id} />
  {/* … existing title / message / timestamp … */}
</SeverityStripeRow>
```

- [ ] **Step 6: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 7: Visual smoke**

Run `npm run dev`, navigate to `/events`. Verify each row shows: severity stripe, status ring, source dot, mono ID. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add src/routes/monitoring/EventStream.tsx
git commit -m "$(cat <<'EOF'
refactor(events): adopt SeverityStripe + StatusRing + Dot + IDCell on stream

Event stream rows now use the shared primitive vocabulary, including a
source Dot (metric/log/trace) that frees a column previously occupied
by a source chip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-2 milestone.** Tier 1 is complete.

---

## Final verification

- [ ] **Typecheck everything once more**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Cross-route visual smoke**

Run: `npm run dev`. Walk through:
1. `/` — sidebar dimmer than content, cards have subtle shadow.
2. `/inbox` — severity stripes, mono source IDs, pulsing unread dot.
3. `/incidents` — stripe + status ring + mono `INC-####`.
4. `/problems` — same pattern.
5. `/events` — stripe + ring + source dot + mono `EV-####`.
6. Press `⌘K` from any route — palette opens, fuzzy filter works, arrows navigate, Enter goes, Escape closes.
7. Existing dark login (`/login`) still uses the gradient logomark — chrome continuity intact.

Stop the server.

- [ ] **Branch / PR (optional)**

If working on a feature branch, push and open a PR. Otherwise the Tier 1 commits are now on `main` and Plan 2 (Tier 2) can begin from this point.

---

## Out of scope (deferred to later plans)

- Frontend test infrastructure (`@testing-library/react`, jsdom, Storybook) — a separate cycle if/when retrofitted tests are wanted.
- Cmd-K creation/action commands (Plan 2 may extend the palette).
- Tier 1 treatments on `/changes`, `/releases`, `/deployments`, `/availability`, etc. — scoped to the 4 ops-critical routes only.
