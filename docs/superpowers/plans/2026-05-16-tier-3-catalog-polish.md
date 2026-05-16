# Tier 3 — Catalog-Driven Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Tier 3 of the light-UI refresh: catalog-driven entity chip-links across body text (PR-5), right-click context menus on sidebar items (PR-6), hover cards that pop a 300px status card over entity references (PR-7), and a segmented List/Graph view switcher on `/cmdb` (PR-8).

**Architecture:** A small entity-linkify utility transforms strings containing entity IDs (`INC-####`, `PRB-####`, `CHG-####`, `CI-####`, `EVT-…`) into React fragments with `<EntityLink>` components. The link component is the integration point for both routing (PR-5) and the hover card (PR-7). Sidebar context menus and the CMDB segmented switcher are independent local refactors.

**Tech Stack:** React 19, TypeScript, react-router-dom. **No new dependencies** — `floating-ui`/`@radix-ui` are not installed and aren't needed; both the context menu and hover card are hand-rolled the way other primitives in this codebase are.

**Testing strategy:** Same as Tier 1/2 — no frontend test infra. Verification is `npm run lint` + visual smoke at `npm run dev`. Manual states to walk per task are listed inline.

**Spec:** `docs/superpowers/specs/2026-05-16-light-ui-tier-execution-design.md` (sections PR-5, PR-6, PR-7, PR-8).

**Branching:** start on `feat/tier-3-catalog-polish` from `main`. Tasks are independent enough that PRs 5/6/7/8 could ship sequentially or in parallel; this plan groups Task 1+2 (PR-5) and Task 4+5 (PR-7) since they touch the same files.

---

## Scope adjustment vs spec

- **PR-8 (segmented switcher)** is narrowed to **`/cmdb` List + Graph** only. The spec also mentioned consolidating `/monitoring/coverage`, but coverage lives under a different layout (`MonitoringLayout`) — folding it in would require restructuring two route groups. CMDB's List/Graph are the natural pair; coverage stays where it is.
- **PR-5** ships an entity-link parser covering `INC-`, `PRB-`, `CHG-`, `CI-`, and `EVT-/EV-` identifiers. Service slug detection is deferred — services don't have a stable single-token public form yet.

---

## File map

**Create:**
- `src/lib/entity-linkify.tsx` (PR-5 — parser + EntityLink component)
- `src/components/catalog/EntityHoverCard.tsx` (PR-7 — hover popup)
- `src/components/layout/SidebarContextMenu.tsx` (PR-6 — right-click menu)
- `src/lib/sidebar-pins.ts` (PR-6 — localStorage persistence helper)
- `src/routes/cmdb/CmdbShell.tsx` (PR-8 — segmented shell)

**Modify:**
- `src/components/layout/InboxDrawer.tsx` (PR-5 — render entity links in item bodies)
- `src/routes/incidents/IncidentDetail.tsx` (PR-5 — entity links in timeline + description)
- `src/components/inbox/InboxItemDetail.tsx` (PR-5 — entity links in detail view)
- `src/components/layout/Sidebar.tsx` (PR-6 — onContextMenu hook + render menu; PR-6 — render pinned items at top)
- `src/lib/entity-linkify.tsx` (PR-7 — `<EntityLink>` gains hover-card behavior; if PR-7 ships after PR-5, this is in PR-7's commit)
- `src/routes/index.tsx` (PR-8 — collapse `cmdb` + `cmdb/graph` routes into the new shell)

---

## PR-5 — Catalog-driven entity chips

### Task 1: `entity-linkify.tsx` — parser + EntityLink primitive

**Files:**
- Create: `src/lib/entity-linkify.tsx`

- [ ] **Step 1: Confirm entity ID formats**

Recent task data showed these identifier shapes in the codebase:
- `INC-#####` (incidents) — e.g. `INC-1042`
- `PRB-YYYY-####` (problems) — e.g. `PRB-2026-0083`
- `CHG-####` or `CHG-YYYY-####` (changes)
- `CI-####` (CIs) — e.g. `CI-7710`
- `EVT-YYYY-#####` (events) — e.g. `EVT-2026-00099`. Plus older shortened form `EV-####` may exist in seed/test data.

Verify by grepping recent commits or seed files:

```
grep -rE "INC-[0-9]+|PRB-[0-9]+|CHG-[0-9]+|CI-[0-9]+|EVT?-[0-9]+" src/types prisma/seed*.ts 2>/dev/null | head -20
```

Adjust the regex constants in Step 2 if formats differ from the assumptions above.

- [ ] **Step 2: Create the file**

Write `src/lib/entity-linkify.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';

type EntityKind = 'incident' | 'problem' | 'change' | 'event' | 'ci';

interface EntityMatch {
  kind: EntityKind;
  id: string;
  start: number;
  end: number;
}

// Order matters: longer/more-specific patterns first so PRB-2026-… isn't
// partially matched as PR-####. Each pattern captures the full identifier
// including any year segment.
const PATTERNS: { kind: EntityKind; regex: RegExp }[] = [
  { kind: 'event',    regex: /\bEVT-\d{4}-\d+\b/g },
  { kind: 'event',    regex: /\bEV-\d+\b/g },
  { kind: 'problem',  regex: /\bPRB-\d{4}-\d+\b/g },
  { kind: 'problem',  regex: /\bPRB-\d+\b/g },
  { kind: 'change',   regex: /\bCHG-\d{4}-\d+\b/g },
  { kind: 'change',   regex: /\bCHG-\d+\b/g },
  { kind: 'incident', regex: /\bINC-\d+\b/g },
  { kind: 'ci',       regex: /\bCI-\d+\b/g },
];

const ROUTE: Record<EntityKind, (id: string) => string> = {
  incident: id => `/incidents/${id}`,
  problem:  id => `/problems/${id}`,
  change:   id => `/changes/${id}`,
  event:    id => `/monitoring/events/${id}`,
  ci:       id => `/cmdb/${id}`,
};

function findMatches(text: string): EntityMatch[] {
  const all: EntityMatch[] = [];
  for (const { kind, regex } of PATTERNS) {
    regex.lastIndex = 0;
    for (let m = regex.exec(text); m !== null; m = regex.exec(text)) {
      all.push({ kind, id: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  // Deduplicate overlapping matches: prefer the earliest, longest match.
  all.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const pruned: EntityMatch[] = [];
  let cursor = -1;
  for (const m of all) {
    if (m.start >= cursor) {
      pruned.push(m);
      cursor = m.end;
    }
  }
  return pruned;
}

interface EntityLinkProps {
  kind: EntityKind;
  id: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A single entity reference rendered as a dotted-underline chip-link.
 * In PR-7 this gains hover-card behavior; for PR-5 it's just navigation.
 */
export const EntityLink: React.FC<EntityLinkProps> = ({ kind, id, className, children }) => (
  <Link
    to={ROUTE[kind](id)}
    className={cn(
      'text-ois-primary hover:text-ois-primary-hover transition-colors',
      'underline decoration-dotted decoration-ois-text-subtle underline-offset-[3px]',
      'font-mono text-[0.95em]',
      className,
    )}
    data-entity-kind={kind}
    data-entity-id={id}
  >
    {children ?? id}
  </Link>
);

/**
 * Transform a string containing entity IDs into React children with
 * <EntityLink> components inserted in place. Plain text segments are
 * preserved verbatim. Safe to call with empty or null input.
 */
export function linkifyEntities(text: string | null | undefined): React.ReactNode {
  if (!text) return text;
  const matches = findMatches(text);
  if (matches.length === 0) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(<EntityLink key={`${m.kind}-${m.id}-${i}`} kind={m.kind} id={m.id} />);
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
```

- [ ] **Step 3: Typecheck**

`npm run lint` — exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/entity-linkify.tsx
git commit -m "$(cat <<'EOF'
feat(catalog): add entity-linkify util + EntityLink primitive

Recognizes INC-, PRB-, CHG-, EVT-/EV-, and CI- identifiers in text and
renders them as dotted-underline chip-links that route to the right
detail page. The EntityLink component is the integration point for the
upcoming hover-card behavior.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Adopt `linkifyEntities` in three call sites

**Files:**
- Modify: `src/components/layout/InboxDrawer.tsx`
- Modify: `src/components/inbox/InboxItemDetail.tsx`
- Modify: `src/routes/incidents/IncidentDetail.tsx`

This task wires the linkifier into the three places body text appears most. Don't try to be exhaustive — the rest will get swept in later cycles. Single commit at end.

- [ ] **Step 1: Identify body-text render points**

Run:
```
grep -n "item\.summary\|item\.body\|item\.message\|item\.title" src/components/layout/InboxDrawer.tsx src/components/inbox/InboxItemDetail.tsx | head -20
grep -n "inc\.description\|TimelineList\|event\.message\|<p>" src/routes/incidents/IncidentDetail.tsx | head -20
```

Each match is a place where plain text currently renders. The goal is to wrap those text values with `linkifyEntities(...)`.

- [ ] **Step 2: Wrap text in `InboxDrawer.tsx`**

At the top of the file:

```tsx
import { linkifyEntities } from '@/src/lib/entity-linkify';
```

Find every place the file renders `{item.summary}`, `{item.body}`, `{item.title}`, or similar string fields (whatever the actual field names are — match what Step 1 found). Wrap each:

```tsx
// before:
{item.summary}
// after:
{linkifyEntities(item.summary)}
```

Only wrap text content — don't wrap header strings, button labels, or anything where IDs aren't expected.

- [ ] **Step 3: Wrap text in `InboxItemDetail.tsx`**

Same import, same swap pattern for the detail view's body text.

- [ ] **Step 4: Wrap text in `IncidentDetail.tsx`**

Same import. The likely candidates:
- `{incident.description}` in the Description collapsible section
- `{event.message}` inside `TimelineList`
- Comment bodies in the Comments collapsible section (if comments display as plain strings)

Don't replace the incident title itself — it's already a heading; entity links inside a heading read awkwardly.

- [ ] **Step 5: Typecheck**

`npm run lint` — exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/InboxDrawer.tsx src/components/inbox/InboxItemDetail.tsx src/routes/incidents/IncidentDetail.tsx
git commit -m "$(cat <<'EOF'
feat(catalog): linkify entity refs in inbox + incident detail

InboxDrawer item summaries, InboxItemDetail bodies, and incident
description/timeline/comments now auto-link any INC-, PRB-, CHG-,
EVT-/EV-, or CI- identifier to the corresponding detail page. PR-5
closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-5 milestone.**

---

## PR-6 — Right-click sidebar context menus

### Task 3: SidebarContextMenu + pin persistence

**Files:**
- Create: `src/lib/sidebar-pins.ts`
- Create: `src/components/layout/SidebarContextMenu.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

Single commit at end.

- [ ] **Step 1: Inspect the current Sidebar item shape**

Run: `grep -nE "SidebarItem|to=\"|onContextMenu" src/components/layout/Sidebar.tsx | head -20`

Identify how nav items are rendered (`SidebarItem` is a small wrapper around `<NavLink>`). The new context menu attaches via `onContextMenu` on the same row.

- [ ] **Step 2: Create the pins persistence helper**

Write `src/lib/sidebar-pins.ts`:

```ts
import { useSyncExternalStore } from 'react';

const KEY = 'ois.sidebar.pins.v1';
const listeners = new Set<() => void>();

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function write(pins: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(pins));
  listeners.forEach(l => l());
}

export function togglePin(path: string) {
  const current = read();
  const next = current.includes(path)
    ? current.filter(p => p !== path)
    : [...current, path];
  write(next);
}

export function isPinned(path: string): boolean {
  return read().includes(path);
}

export function usePinnedPaths(): string[] {
  return useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    read,
    () => [],
  );
}
```

`useSyncExternalStore` is the right hook for localStorage-backed state — it gives consistent renders during concurrent mode and we don't need a context provider.

- [ ] **Step 3: Create the context menu component**

Write `src/components/layout/SidebarContextMenu.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { togglePin, isPinned } from '@/src/lib/sidebar-pins';

interface SidebarContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  path: string;
  label: string;
  onClose: () => void;
}

/**
 * Right-click menu attached to sidebar nav items. Hand-rolled (no
 * floating-ui / radix); positioned via fixed coords from the
 * contextmenu event. Closes on outside click, scroll, or Escape.
 */
export const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({
  open, x, y, path, label, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pinned = isPinned(path);
  const fullUrl = `${window.location.origin}${path}`;

  const items: { label: string; onClick: () => void; kbd?: string }[] = [
    {
      label: pinned ? 'Unpin from favorites' : 'Pin to favorites',
      onClick: () => { togglePin(path); onClose(); },
    },
    {
      label: 'Copy link',
      onClick: () => { void navigator.clipboard.writeText(fullUrl); onClose(); },
    },
    {
      label: 'Open in new tab',
      onClick: () => { window.open(path, '_blank', 'noopener,noreferrer'); onClose(); },
    },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${label}`}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-[8px] border border-ois-border bg-white p-1',
        'shadow-[0_8px_24px_rgba(16,24,40,0.10)] text-[12px]',
      )}
      style={{ left: x, top: y }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          onClick={it.onClick}
          className="flex w-full items-center justify-between gap-3 rounded-[4px] px-2.5 py-1.5 text-left text-ois-text hover:bg-ois-surface-muted"
        >
          <span>{it.label}</span>
          {it.kbd && <span className="font-mono text-[10px] text-ois-text-subtle">{it.kbd}</span>}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Wire into `Sidebar.tsx`**

In `src/components/layout/Sidebar.tsx`:

(a) Add imports near the top:

```tsx
import { useState } from 'react';
import { SidebarContextMenu } from './SidebarContextMenu';
import { usePinnedPaths } from '@/src/lib/sidebar-pins';
```

(b) Inside the `Sidebar` component, add menu state:

```tsx
const [menu, setMenu] = useState<{ x: number; y: number; path: string; label: string } | null>(null);
const pinnedPaths = usePinnedPaths();
```

(c) Find the `SidebarItem` JSX in this file. Add an `onContextMenu` handler to the underlying clickable element:

```tsx
onContextMenu={(e) => {
  e.preventDefault();
  setMenu({ x: e.clientX, y: e.clientY, path: to, label });
}}
```

(d) At the bottom of the rendered tree (just before the sidebar's closing `</aside>` or wherever the file's outer container ends), render the menu:

```tsx
{menu && (
  <SidebarContextMenu
    open
    x={menu.x}
    y={menu.y}
    path={menu.path}
    label={menu.label}
    onClose={() => setMenu(null)}
  />
)}
```

(e) Render a "Favorites" section at the top of the sidebar (above the existing first section). Use the same `SidebarSection` + `SidebarItem` pattern that's already in the file:

```tsx
{pinnedPaths.length > 0 && (
  <SidebarSection label="Favorites" collapsed={collapsed}>
    {pinnedPaths.map(path => {
      const meta = LOOKUP_BY_PATH[path];
      if (!meta) return null;
      return (
        <SidebarItem
          key={path}
          icon={meta.icon}
          label={meta.label}
          to={path}
          collapsed={collapsed}
        />
      );
    })}
  </SidebarSection>
)}
```

If a `LOOKUP_BY_PATH` lookup map doesn't already exist in this file, build one inline near the top — a `Record<string, { label: string; icon: React.ReactNode }>` keyed by the same route paths the file uses. If extracting this lookup is awkward, **fall back** to a simpler approach: render pinned items as bare label-only rows with no icon. Either is acceptable; flag the choice in the commit message.

- [ ] **Step 5: Typecheck**

`npm run lint` — exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sidebar-pins.ts src/components/layout/SidebarContextMenu.tsx src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat(sidebar): right-click context menu + pinned favorites

Right-click any nav item to open a 3-action menu: Pin to favorites,
Copy link, Open in new tab. Pins persist in localStorage and render
in a 'Favorites' section at the top of the sidebar. Menu is
hand-rolled (no floating-ui / radix), positions via fixed coords from
the contextmenu event, and closes on outside-click / scroll / Escape.
PR-6 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-6 milestone.**

---

## PR-7 — Hover cards on entity mentions

### Task 4: `EntityHoverCard` component

**Files:**
- Create: `src/components/catalog/EntityHoverCard.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/catalog/EntityHoverCard.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { cisService, incidentsService, useResource } from '@/src/services';
import { Dot } from '@/src/components/ui/Dot';
import { IDCell } from '@/src/components/ui/IDCell';
import { SparkLine } from '@/src/components/charts/SparkLine';
import { cn } from '@/src/lib/utils';

export type HoverEntityKind = 'incident' | 'problem' | 'change' | 'event' | 'ci';

interface EntityHoverCardProps {
  open: boolean;
  kind: HoverEntityKind;
  id: string;       // public identifier (e.g. CI-7710)
  anchor: DOMRect;  // bounding rect of the trigger
  onClose: () => void;
}

interface CardPayload {
  title: string;
  subtitle?: string;
  statusVariant: 'success' | 'warning' | 'danger' | 'muted';
  statusLabel: string;
  meta: { label: string; value: string }[];
  sparkline?: number[];
}

/**
 * 300×~140px popover anchored to an entity link. Loads payload lazily
 * the first time it opens for a given (kind, id). Position is computed
 * to stay on-screen — flips below the anchor if the top would go above
 * viewport, shifts left if it would exceed the right edge.
 */
export const EntityHoverCard: React.FC<EntityHoverCardProps> = ({
  open, kind, id, anchor, onClose,
}) => {
  // Lazy-load payload only after first open. Re-open of same (kind, id)
  // reuses the cached useResource result.
  const payload = useEntityPayload(open ? kind : null, open ? id : null);

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    const W = 300;
    const H = 150;
    let top  = anchor.bottom + 6;
    let left = anchor.left;
    if (top + H > window.innerHeight - 8) top  = anchor.top - H - 6;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [open, anchor]);

  if (!open || !pos) return null;

  return (
    <div
      role="tooltip"
      onMouseEnter={() => { /* keep open */ }}
      onMouseLeave={onClose}
      className={cn(
        'fixed z-50 w-[300px] rounded-[10px] border border-ois-border bg-white p-3',
        'shadow-[0_12px_32px_rgba(16,24,40,0.12)] text-[12px]',
      )}
      style={{ left: pos.left, top: pos.top }}
    >
      {!payload && <div className="text-ois-text-subtle">Loading…</div>}
      {payload && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <IDCell value={id} className="font-semibold text-ois-text text-[12px]" />
            <Dot variant={payload.statusVariant} size="sm" />
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.06em]',
              payload.statusVariant === 'danger'  && 'text-ois-danger',
              payload.statusVariant === 'warning' && 'text-ois-warning',
              payload.statusVariant === 'success' && 'text-ois-success',
              payload.statusVariant === 'muted'   && 'text-ois-text-subtle',
            )}>
              {payload.statusLabel}
            </span>
            {payload.subtitle && (
              <span className="ml-auto text-[10px] text-ois-text-subtle">{payload.subtitle}</span>
            )}
          </div>
          <div className="text-ois-text mb-2 line-clamp-2">{payload.title}</div>
          <div className="grid grid-cols-2 gap-y-1 text-[11px] mb-2">
            {payload.meta.map((m, i) => (
              <React.Fragment key={i}>
                <div className="text-ois-text-subtle">{m.label}</div>
                <div className="text-ois-text">{m.value}</div>
              </React.Fragment>
            ))}
          </div>
          {payload.sparkline && payload.sparkline.length > 0 && (
            <SparkLine data={payload.sparkline} width={276} height={24} color="#F04438" />
          )}
        </>
      )}
    </div>
  );
};

// --- payload loaders per entity kind --------------------------------------

function useEntityPayload(kind: HoverEntityKind | null, id: string | null): CardPayload | null {
  // Use cisService.get / incidentsService.get etc; map the response into
  // CardPayload shape. Each kind has its own loader so the component stays
  // agnostic. Fall back to null if the service wrapper isn't available for
  // a given kind (component renders nothing in that case).
  switch (kind) {
    case 'ci':       return useCiPayload(id);
    case 'incident': return useIncidentPayload(id);
    // problem / change / event hover cards aren't implemented in this PR —
    // they'll fall through to null and the card will skip rendering.
    default:         return null;
  }
}

function useCiPayload(id: string | null): CardPayload | null {
  const { data } = useResource(
    () => (id ? cisService.get(id) : Promise.resolve(null)),
    [id],
  );
  if (!data) return null;
  return {
    title: data.name,
    subtitle: data.type,
    statusVariant: ciHealthToVariant(data.health ?? data.status),
    statusLabel: (data.health ?? data.status ?? 'unknown').toString().toUpperCase(),
    meta: [
      { label: 'Owner',       value: data.ownerTeam ?? data.ownerId ?? '—' },
      { label: 'Last change', value: data.lastChangedAt ? new Date(data.lastChangedAt).toLocaleString() : '—' },
    ],
    // sparkline omitted — no per-CI health series available without a new fetch.
  };
}

function useIncidentPayload(id: string | null): CardPayload | null {
  const { data } = useResource(
    () => (id ? incidentsService.get(id) : Promise.resolve(null)),
    [id],
  );
  if (!data) return null;
  return {
    title: data.title,
    subtitle: data.severity,
    statusVariant: incidentStatusToVariant(data.status),
    statusLabel: data.status.toUpperCase(),
    meta: [
      { label: 'Opened',  value: data.openedAt ? new Date(data.openedAt).toLocaleString() : '—' },
      { label: 'Lead',    value: data.assigneeId ?? '—' },
    ],
  };
}

function ciHealthToVariant(s: string | null | undefined): CardPayload['statusVariant'] {
  switch (s) {
    case 'operational': return 'success';
    case 'degraded':
    case 'maintenance': return 'warning';
    case 'partial_outage':
    case 'major_outage':
    case 'down':        return 'danger';
    default:            return 'muted';
  }
}

function incidentStatusToVariant(s: string): CardPayload['statusVariant'] {
  if (s === 'resolved' || s === 'closed')   return 'success';
  if (s === 'investigating' || s === 'in_progress' || s === 'acknowledged') return 'warning';
  return 'danger';
}
```

If `cisService.get` returns a different shape than assumed (e.g. `data.healthStatus` not `data.health`), adapt `useCiPayload` to the actual fields. Same for `incidentsService.get`. Don't restructure the components — just adapt the loaders. If a service method doesn't exist for a given kind, leave the `default: return null` fall-through in place.

- [ ] **Step 2: Typecheck**

`npm run lint` — exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/EntityHoverCard.tsx
git commit -m "$(cat <<'EOF'
feat(catalog): add EntityHoverCard — 300px popover for entity refs

Hand-rolled tooltip with viewport-aware positioning (flips above the
anchor when top would clip; shifts left when right would clip). Lazy
loads the entity payload via existing services on first open. Renders
title, status dot + label, two metadata pairs, and an optional 1h
sparkline. PR-5 entity kinds 'incident' and 'ci' are wired in this
PR; 'problem' / 'change' / 'event' fall through to no-card until their
services are mapped in a later cycle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Hover-card wiring in `EntityLink`

**Files:**
- Modify: `src/lib/entity-linkify.tsx`

- [ ] **Step 1: Update `EntityLink` to host the hover card**

Edit `src/lib/entity-linkify.tsx`. Add imports near the top:

```tsx
import { useRef, useState } from 'react';
import { EntityHoverCard, type HoverEntityKind } from '@/src/components/catalog/EntityHoverCard';
```

Replace the existing `EntityLink` component body with this hover-aware version:

```tsx
export const EntityLink: React.FC<EntityLinkProps> = ({ kind, id, className, children }) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [hoverState, setHoverState] = useState<{ open: boolean; rect: DOMRect | null }>({ open: false, rect: null });
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const cancelTimers = () => {
    if (enterTimer.current) { window.clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (leaveTimer.current) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };

  const onMouseEnter = () => {
    cancelTimers();
    enterTimer.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setHoverState({ open: true, rect });
    }, 400); // ≥ 400ms hover before card opens
  };

  const onMouseLeave = () => {
    cancelTimers();
    leaveTimer.current = window.setTimeout(() => {
      setHoverState({ open: false, rect: null });
    }, 150); // small grace period so the card itself can take over hover
  };

  return (
    <>
      <Link
        ref={anchorRef}
        to={ROUTE[kind](id)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onMouseEnter}
        onBlur={onMouseLeave}
        className={cn(
          'text-ois-primary hover:text-ois-primary-hover transition-colors',
          'underline decoration-dotted decoration-ois-text-subtle underline-offset-[3px]',
          'font-mono text-[0.95em]',
          className,
        )}
        data-entity-kind={kind}
        data-entity-id={id}
      >
        {children ?? id}
      </Link>
      {hoverState.open && hoverState.rect && (
        <EntityHoverCard
          open
          kind={kind as HoverEntityKind}
          id={id}
          anchor={hoverState.rect}
          onClose={() => setHoverState({ open: false, rect: null })}
        />
      )}
    </>
  );
};
```

The 400ms hover delay matches the spec; the 150ms grace on leave lets the user move the cursor from the link to the card without the card disappearing mid-flight.

- [ ] **Step 2: Typecheck**

`npm run lint` — exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/entity-linkify.tsx
git commit -m "$(cat <<'EOF'
feat(catalog): wire hover cards into EntityLink

Hovering an entity chip-link for ≥ 400ms opens the EntityHoverCard
anchored to the link's bounding rect. 150ms grace on leave lets the
cursor move onto the card without dismissal. PR-7 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-7 milestone.**

---

## PR-8 — Segmented view switcher on `/cmdb`

### Task 6: Collapse `/cmdb` + `/cmdb/graph` into a single shell

**Files:**
- Create: `src/routes/cmdb/CmdbShell.tsx`
- Modify: `src/routes/index.tsx` (collapse two route entries into one)

Scope: only `/cmdb` + `/cmdb/graph` consolidate. `/cmdb/audit` and `/cmdb/:ciId` are unrelated views (audit log + detail page) and stay where they are.

- [ ] **Step 1: Read the current routing block**

Run: `grep -nB2 -A2 "cmdb" src/routes/index.tsx | head -30`

You should see two adjacent route entries like:

```tsx
{ path: 'cmdb',       element: <CMDBList /> },
{ path: 'cmdb/graph', element: <CMDBGraph /> },
{ path: 'cmdb/audit', element: <CMDBAudit /> },
{ path: 'cmdb/:ciId', element: <CMDBDetail /> },
```

Confirm the names of the actual page components imported at the top.

- [ ] **Step 2: Create `src/routes/cmdb/CmdbShell.tsx`**

```tsx
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { CMDBList }  from './CMDBList';
import { CMDBGraph } from './CMDBGraph';

type View = 'list' | 'graph';

const VIEWS: { key: View; label: string }[] = [
  { key: 'list',  label: 'List'  },
  { key: 'graph', label: 'Graph' },
];

/**
 * Shell route for /cmdb that toggles between the list and graph views
 * via a ?view= query param. Replaces the previously separate
 * /cmdb (list) and /cmdb/graph routes.
 */
export const CmdbShell: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const active: View = raw === 'graph' ? 'graph' : 'list';

  const setActive = (next: View) => {
    setParams(prev => {
      const out = new URLSearchParams(prev);
      if (next === 'list') out.delete('view'); else out.set('view', next);
      return out;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-ois-border">
        <h1 className="text-[20px] font-semibold text-ois-text tracking-[-0.01em]">CMDB</h1>
        <div className="flex bg-ois-surface-muted border border-ois-border rounded-[8px] p-[3px] gap-0 text-[12px] font-semibold">
          {VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              className={cn(
                'px-3 py-1 rounded-[6px] transition-colors',
                active === v.key
                  ? 'bg-white text-ois-text shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-ois-border'
                  : 'text-ois-text-muted hover:text-ois-text',
              )}
              aria-pressed={active === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {active === 'list'  && <CMDBList />}
        {active === 'graph' && <CMDBGraph />}
      </div>
    </div>
  );
};
```

If `CMDBList` / `CMDBGraph` aren't the actual exported component names, adjust the imports. If they internally render their own page header / title block, that's fine — the shell's header is a thin chrome above them; the inner pages keep their own filters/toolbars.

- [ ] **Step 3: Update `src/routes/index.tsx`**

Replace the two existing route entries:

```tsx
{ path: 'cmdb',       element: <CMDBList /> },
{ path: 'cmdb/graph', element: <CMDBGraph /> },
```

With a single entry:

```tsx
{ path: 'cmdb',       element: <CmdbShell /> },
```

And add the import at the top:

```tsx
import { CmdbShell } from './cmdb/CmdbShell';
```

If the original imports of `CMDBList` and `CMDBGraph` are now unused in this file (because they're imported by the shell instead), remove them to keep lint clean.

Keep `cmdb/audit` and `cmdb/:ciId` exactly as they were.

- [ ] **Step 4: Typecheck**

`npm run lint` — exit 0. Fix any "unused import" warnings.

- [ ] **Step 5: Verify navigation**

Sidebar items pointing to `/cmdb` still work (the shell renders the list view by default). The previous `/cmdb/graph` URL becomes a 404 — that's intended; replace any internal links if grep finds them:

```
grep -rn "/cmdb/graph" src/
```

If matches turn up, swap to `/cmdb?view=graph`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/cmdb/CmdbShell.tsx src/routes/index.tsx
git commit -m "$(cat <<'EOF'
feat(cmdb): segmented List / Graph view switcher

Replaces separate /cmdb and /cmdb/graph routes with a single shell that
toggles views via ?view=list|graph. Pill segmented control in the page
header (white tile on a muted track, primary blue text on active).
Audit and detail routes unchanged. Coverage view (in MonitoringLayout)
remains separate — folding it in here would require restructuring two
route groups; deferred. PR-8 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-8 milestone.** Tier 3 complete.

---

## Final verification

- [ ] **Typecheck once more**

`npm run lint` — exit 0.

- [ ] **Visual smoke**

`npm run dev` and walk:

1. **PR-5 entity links** — open an inbox item whose summary references `INC-1042` or `CI-7710`; verify each ID renders as a dotted-underline blue Geist Mono link and clicking it navigates to the right page.
2. **PR-6 sidebar context menu** — right-click any sidebar nav item; verify the 3-action menu opens at the cursor. Click "Pin to favorites" → a Favorites section appears at the top with that item. Click "Copy link" → URL is on the clipboard. Click "Open in new tab" → opens. Right-click a pinned item → menu now shows "Unpin from favorites". Escape closes the menu.
3. **PR-7 hover cards** — hover an entity link (e.g. `CI-7710` or `INC-1042`) for >400ms; verify a 300px card pops with title, status dot+label, two metadata rows. Hover the card itself → it stays open. Move away → it closes after 150ms. Position near the right edge of the viewport → card flips left to stay on-screen.
4. **PR-8 CMDB switcher** — navigate to `/cmdb` → list view renders. Click "Graph" → URL becomes `/cmdb?view=graph` and the graph view renders without unmounting the page header. Click "List" → switches back; URL drops the `?view=` param.
5. Existing Tier 1 + Tier 2 chrome (sidebar dim, `⌘K` palette, 3-pane incident detail, gradient stripe) is unchanged.

---

## Out of scope (explicit)

- `/monitoring/coverage` consolidation into the CMDB shell — deferred; coverage lives in a different layout.
- Hover cards for `problem`, `change`, `event` kinds — `EntityHoverCard` has fall-through to no-render for these; wiring is straightforward when their service-wrapper get-by-id endpoints are mapped.
- Service slug detection in `linkifyEntities` — services lack a stable single-token public identifier.
- Sweeping the rest of the app (changes, releases, problems detail pages, etc.) to use `linkifyEntities` on their body text. PR-5 covers inbox + incident detail; the rest is a later cleanup pass.
- Backend support for any new endpoints — every component reuses existing services.
