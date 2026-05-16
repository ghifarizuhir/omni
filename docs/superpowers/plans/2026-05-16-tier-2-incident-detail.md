# Tier 2 — Incident Detail & AppShell Stripe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Tier 2 of the light-UI refresh: a 3-pane `/incidents/:id` page with two signature moves (incident clock, blast-radius wallpaper) plus a redesigned composer and entity-chip right rail (PR-3), followed by a permanent gradient stripe under the TopBar driven by a CSS keyframe on mount (PR-4).

**Architecture:** Build four self-contained components under `src/components/incidents/` (`IncidentClock`, `BlastRadiusBackdrop`, `IncidentComposer`, `AboutRail`) first, each developed and committed in isolation. Then refactor `src/routes/incidents/IncidentDetail.tsx` (currently 1131 lines) into a 3-pane layout that wires them together. Finally, layer a 2px scaleX gradient stripe under the TopBar via a CSS keyframe.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4. Reuses existing `useResource` hook from `src/services`, existing `SparkLine` from `src/components/charts/SparkLine.tsx`, and the API endpoints already wired in `server/routes/incidents.ts` (`GET /incidents/:publicId`, `GET /incidents/:incidentId/timeline`, `GET /incidents/:incidentId/comments`, `POST /incidents/:incidentId/comments`) and `server/routes/cmdb.ts` (`GET /cis/:ciId/relationships`).

**Testing strategy:** Same as Tier 1 — no frontend test infra exists. Verification is `npm run lint` + visual smoke at `npm run dev`. The clock has subtle time-based behavior that the controller should walk through manually after each task.

**Spec:** `docs/superpowers/specs/2026-05-16-light-ui-tier-execution-design.md` (sections PR-3 and PR-4).

---

## File map

**Create (PR-3):**
- `src/components/incidents/IncidentClock.tsx`
- `src/components/incidents/BlastRadiusBackdrop.tsx`
- `src/components/incidents/IncidentComposer.tsx`
- `src/components/incidents/AboutRail.tsx`

**Modify (PR-3):**
- `src/routes/incidents/IncidentDetail.tsx` — refactor to 3-pane layout, wire in the four new components. Existing inline timeline + composer + sidebar metadata are replaced.

**Modify (PR-4):**
- `src/components/layout/AppShell.tsx` — render the 2px stripe element + once-on-mount keyframe trigger
- `src/index.css` — `@keyframes ois-topbar-stripe` definition

---

## PR-3 — 3-pane `/incidents/:id`

### Task 1: `<IncidentClock />` — live elapsed-time + SLA component

**Files:**
- Create: `src/components/incidents/IncidentClock.tsx`

- [ ] **Step 1: Create the file**

Write `src/components/incidents/IncidentClock.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';

interface IncidentClockProps {
  startedAt: string;          // ISO timestamp of incident open
  resolvedAt?: string | null; // when set, clock freezes
  slaDeadline?: string | null;// ISO; if present, render countdown below
  className?: string;
}

/**
 * Top-right header element on the incident detail page.
 * - Elapsed time renders as `+MM:SS` (under 1h) or `+HH:MM:SS` (over 1h),
 *   in Geist Mono 28px 700.
 * - Color drifts blue (0–10m) → orange (10–30m) → red (30m+) via two
 *   `background-clip: text` gradients, swapping at 10m and 30m boundaries.
 * - SLA countdown appears below in 10px, red when within 5 minutes of
 *   breach, otherwise muted.
 */
export const IncidentClock: React.FC<IncidentClockProps> = ({
  startedAt,
  resolvedAt,
  slaDeadline,
  className,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (resolvedAt) return; // frozen
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [resolvedAt]);

  const startMs = new Date(startedAt).getTime();
  const endMs   = resolvedAt ? new Date(resolvedAt).getTime() : now;
  const elapsedMs = Math.max(0, endMs - startMs);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  // pick gradient based on elapsed minutes
  const mins = elapsedSec / 60;
  const gradient =
    mins < 10  ? 'linear-gradient(90deg, #1F4FD4 0%, #1F4FD4 100%)' :
    mins < 30  ? 'linear-gradient(90deg, #1F4FD4 0%, #F79009 100%)' :
                 'linear-gradient(90deg, #F79009 0%, #F04438 100%)';

  const slaMs = slaDeadline ? new Date(slaDeadline).getTime() : null;
  const slaRemaining = slaMs ? slaMs - now : null;
  const slaInsideBreach = slaRemaining !== null && slaRemaining < 5 * 60 * 1000;

  return (
    <div className={cn('text-right font-mono leading-none', className)} aria-live="polite">
      <div className="text-[10px] tracking-[0.12em] text-ois-text-subtle mb-1 uppercase">Elapsed</div>
      <div
        className="text-[28px] font-bold"
        style={{
          background: gradient,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {formatElapsed(elapsedSec)}
      </div>
      {slaRemaining !== null && slaRemaining > 0 && (
        <div className={cn('text-[10px] mt-1', slaInsideBreach ? 'text-ois-danger' : 'text-ois-text-subtle')}>
          SLA in {formatElapsed(Math.floor(slaRemaining / 1000))}
        </div>
      )}
      {slaRemaining !== null && slaRemaining <= 0 && (
        <div className="text-[10px] mt-1 text-ois-danger font-semibold">SLA BREACHED</div>
      )}
    </div>
  );
};

function formatElapsed(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `+${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `+${pad(minutes)}:${pad(seconds)}`;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/incidents/IncidentClock.tsx
git commit -m "$(cat <<'EOF'
feat(incidents): add IncidentClock — live elapsed + SLA countdown

Top-right header component for the incident detail page. Elapsed time
in Geist Mono with a gradient color that drifts blue → orange → red
as the incident ages. Freezes when resolvedAt is set. SLA countdown
turns red within 5 minutes of breach.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `<BlastRadiusBackdrop />` — faint CMDB topology behind the timeline

**Files:**
- Create: `src/components/incidents/BlastRadiusBackdrop.tsx`

- [ ] **Step 1: Confirm available service**

Run: `grep -n "relationships\|graph" src/services/cmdbService.ts | head`

The service should expose a function that fetches `GET /cis/:ciId/relationships`. If the exact function name differs from `cisService.relationships(ciId)`, note it for Step 2 and adjust.

If no such function exists in `cmdbService.ts`, **stop and report** — the plan assumes the service wrapper already covers this endpoint (which is mounted server-side at `cmdbRouter.get('/cis/:ciId/relationships'`).

- [ ] **Step 2: Create the file**

Write `src/components/incidents/BlastRadiusBackdrop.tsx`:

```tsx
import React, { useMemo } from 'react';
import { cisService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface BlastRadiusBackdropProps {
  /** publicId of the primary impacted CI (e.g. "CI-7710") */
  impactedCiId: string;
  className?: string;
}

interface Edge { from: string; to: string }
interface Node { id: string; x: number; y: number; impacted: boolean }

/**
 * Faint CMDB topology rendered behind the incident timeline.
 * Pulls relationships from /api/v1/cmdb/cis/:id/relationships, lays them
 * out radially around the impacted CI, and renders at 10% opacity.
 * Hidden on viewports < 1280px wide.
 */
export const BlastRadiusBackdrop: React.FC<BlastRadiusBackdropProps> = ({
  impactedCiId,
  className,
}) => {
  const { data } = useResource(() => cisService.relationships(impactedCiId), [impactedCiId]);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [] as Node[], edges: [] as Edge[] };

    // Defensive: server returns { neighbors: [{ id, ... }], edges: [{ from, to }] }
    // or similar. Adapt below if your service shape differs.
    const neighbors: { id: string }[] = (data as { neighbors?: { id: string }[] }).neighbors ?? [];
    const rawEdges:  Edge[]            = (data as { edges?: Edge[] }).edges ?? [];

    // Cap at 30 nodes to keep the render cheap.
    const capped = neighbors.slice(0, 29);

    // Radial layout: impacted CI at center (300, 200), neighbors on a ring.
    const cx = 300, cy = 200, r = 140;
    const nodes: Node[] = [
      { id: impactedCiId, x: cx, y: cy, impacted: true },
      ...capped.map((n, i) => {
        const angle = (i / capped.length) * Math.PI * 2;
        return {
          id: n.id,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          impacted: false,
        };
      }),
    ];

    // Only render edges where both endpoints are in our node set.
    const ids = new Set(nodes.map(n => n.id));
    const edges = rawEdges.filter(e => ids.has(e.from) && ids.has(e.to));

    return { nodes, edges };
  }, [data, impactedCiId]);

  if (nodes.length === 0) return null;

  const nodeById = new Map(nodes.map(n => [n.id, n]));

  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 w-full h-full opacity-[0.10] hidden xl:block', className)}
    >
      {edges.map((e, i) => {
        const a = nodeById.get(e.from);
        const b = nodeById.get(e.to);
        if (!a || !b) return null;
        const isImpactEdge = a.impacted || b.impacted;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isImpactEdge ? '#B42318' : '#475467'}
            strokeWidth={isImpactEdge ? 1.5 : 1}
          />
        );
      })}
      {nodes.map(n => (
        <g key={n.id}>
          {n.impacted && (
            <circle cx={n.x} cy={n.y} r={22} fill="#B42318" opacity={0.25}>
              <animate attributeName="opacity" values="0.25;0.45;0.25" dur="1.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle
            cx={n.x} cy={n.y}
            r={n.impacted ? 12 : 7}
            fill={n.impacted ? '#B42318' : '#98A2B3'}
          />
        </g>
      ))}
    </svg>
  );
};
```

If `cisService.relationships` is named differently or returns a different shape than `{ neighbors, edges }`, adjust the import and the destructuring — the rest of the layout is shape-agnostic.

- [ ] **Step 3: Typecheck**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/incidents/BlastRadiusBackdrop.tsx
git commit -m "$(cat <<'EOF'
feat(incidents): add BlastRadiusBackdrop — faint CMDB graph behind timeline

Radial layout of related CIs at 10% opacity, impacted node halo'd in
severity red with a 1.4s pulse. Hidden on viewports < 1280px. Pulls
from existing /cmdb/cis/:id/relationships endpoint via cisService.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `<IncidentComposer />` — persistent slash-command composer

**Files:**
- Create: `src/components/incidents/IncidentComposer.tsx`

- [ ] **Step 1: Confirm comments-post endpoint shape**

Run: `grep -n "incidentsRouter.post" server/routes/incidents.ts | head`

Confirm that posting an update is a POST to `/incidents/:incidentId/comments`, taking `{ body: string }` or similar. Look at the existing service in `src/services/` for the wrapper (likely `incidentsService.postComment(incidentId, body)`). If the wrapper exists, use it; if not, use `apiFetch` directly the way other composers in the codebase do.

- [ ] **Step 2: Create the file**

Write `src/components/incidents/IncidentComposer.tsx`:

```tsx
import React, { useRef, useState } from 'react';
import { incidentsService } from '@/src/services';
import { cn } from '@/src/lib/utils';

interface IncidentComposerProps {
  incidentId: string;        // internal id used by the POST endpoint
  onPosted?: () => void;     // parent refetches timeline on success
  className?: string;
}

interface SlashChip {
  label: string;
  insert: string;
  hint: string;
}

const CHIPS: SlashChip[] = [
  { label: '/status',  insert: '/status ', hint: 'change status' },
  { label: '/page',    insert: '/page ',   hint: 'page on-call' },
  { label: '/link CI', insert: '/link CI ',hint: 'attach a CI' },
];

/**
 * Persistent bottom composer on the incident detail page. Replaces the
 * old modal-driven update flow. Visible slash-command chips insert the
 * command into the input + focus it; ⌘↵ submits.
 */
export const IncidentComposer: React.FC<IncidentComposerProps> = ({
  incidentId,
  onPosted,
  className,
}) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = async () => {
    const body = value.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await incidentsService.postComment(incidentId, body);
      setValue('');
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post update');
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  const useChip = (chip: SlashChip) => {
    setValue(prev => (prev ? `${prev} ${chip.insert}` : chip.insert));
    inputRef.current?.focus();
  };

  return (
    <div className={cn('rounded-[8px] border border-ois-border bg-white overflow-hidden', className)}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-ois-surface-muted bg-white">
        {CHIPS.map(chip => (
          <button
            key={chip.label}
            type="button"
            onClick={() => useChip(chip)}
            className="px-2 py-0.5 rounded border border-ois-border bg-ois-surface-muted font-mono text-[11px] text-ois-text-muted hover:bg-white hover:text-ois-text transition-colors"
            title={chip.hint}
          >
            {chip.label}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-ois-text-subtle">⌘↵ to post</span>
      </div>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        placeholder="Post an update or run a slash command…"
        className="w-full px-3 py-2 outline-none resize-none text-[13px] text-ois-text placeholder:text-ois-text-subtle"
        disabled={submitting}
      />
      {error && (
        <div className="px-3 py-1.5 text-[12px] text-ois-danger border-t border-ois-surface-muted">{error}</div>
      )}
    </div>
  );
};
```

If the service wrapper name is `incidentsService.addComment` or `incidentsService.update` rather than `.postComment`, swap the call accordingly. If no wrapper exists, replace the body of `submit` with a direct `apiFetch('/incidents/:id/comments', { method: 'POST', body: { body } })` following the pattern used in other composers in the codebase.

- [ ] **Step 3: Typecheck**

Run: `npm run lint`. Expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/incidents/IncidentComposer.tsx
git commit -m "$(cat <<'EOF'
feat(incidents): add IncidentComposer — slash-command bottom composer

Persistent (non-modal) composer with visible /status, /page, /link CI
chips that insert the command into the textarea and focus it. ⌘↵ posts.
Replaces the modal-driven update flow on the incident detail page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `<AboutRail />` — entity-chip right rail

**Files:**
- Create: `src/components/incidents/AboutRail.tsx`

- [ ] **Step 1: Identify the incident shape**

Run: `grep -nE "interface Incident\b|type Incident\b" src/types/*.ts | head`

Note the fields available on `Incident` for: lead/assignee (likely `assignee` or `leadUserId`), service (likely `serviceId` or `service.publicId`), impacted CIs (likely `impactedCiIds: string[]` or relations via `incident.cis`). Adapt prop types to match.

Also check if `src/components/ui/Avatar.tsx` accepts size `xs` (smallest pill avatar). If not, use `size="sm"` and adjust dimensions.

- [ ] **Step 2: Create the file**

Write `src/components/incidents/AboutRail.tsx`:

```tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/src/components/ui/Avatar';
import { Dot } from '@/src/components/ui/Dot';
import { IDCell } from '@/src/components/ui/IDCell';
import { SparkLine } from '@/src/components/charts/SparkLine';
import { cn } from '@/src/lib/utils';

interface AboutRailProps {
  lead?: { name: string; id: string } | null;
  service?: { name: string; publicId: string; healthVariant: 'success' | 'warning' | 'danger' | 'muted' } | null;
  impactedCis: { publicId: string; healthVariant: 'success' | 'warning' | 'danger' | 'muted' }[];
  healthSparkline?: number[]; // last 60 points (1 per minute)
  changeWindow?: string | null;
  className?: string;
}

/**
 * Sticky right rail on the incident detail page (~240px). Renders the
 * incident's about-data as entity chips and a 1h health sparkline so
 * the operator can see related CMDB state without leaving the page.
 */
export const AboutRail: React.FC<AboutRailProps> = ({
  lead,
  service,
  impactedCis,
  healthSparkline,
  changeWindow,
  className,
}) => (
  <aside className={cn('w-[240px] shrink-0 p-[18px] text-[12px] sticky top-0 self-start', className)}>
    <div className="text-[9px] tracking-[0.16em] text-ois-text-subtle mb-2.5 uppercase">About</div>

    {lead && (
      <Field label="Lead">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white">
          <Avatar name={lead.name} size="sm" />
          <span className="text-ois-text">{lead.name}</span>
        </span>
      </Field>
    )}

    {service && (
      <Field label="Service">
        <Link
          to={`/cmdb/${service.publicId}`}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white hover:border-ois-primary"
        >
          <Dot variant={service.healthVariant} size="sm" />
          <span className="text-ois-primary">{service.name}</span>
        </Link>
      </Field>
    )}

    {impactedCis.length > 0 && (
      <Field label="Impacted CIs">
        <div className="flex flex-wrap gap-1">
          {impactedCis.map(ci => (
            <Link
              key={ci.publicId}
              to={`/cmdb/${ci.publicId}`}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-ois-border bg-white text-[11px] hover:border-ois-primary"
            >
              <Dot variant={ci.healthVariant} size="sm" />
              <IDCell value={ci.publicId} className="text-ois-primary text-[11px]" />
            </Link>
          ))}
        </div>
      </Field>
    )}

    {healthSparkline && healthSparkline.length > 0 && (
      <Field label="Health (last 1h)">
        <SparkLine data={healthSparkline} width={200} height={24} color="#F04438" />
      </Field>
    )}

    {changeWindow && (
      <Field label="Change window">
        <span className="text-ois-text">{changeWindow}</span>
      </Field>
    )}
  </aside>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <div className="text-[10px] text-ois-text-subtle mb-1">{label}</div>
    {children}
  </div>
);
```

If the existing `SparkLine` component's prop API differs (different prop names than `data`/`width`/`height`/`color`), read `src/components/charts/SparkLine.tsx` and adjust the call site. Don't refactor `SparkLine` itself.

If `Avatar` doesn't accept `size="sm"`, check what sizes it does accept and pick the smallest, then tweak `gap` / padding in the lead chip so the visual size stays similar.

- [ ] **Step 3: Typecheck**

Run: `npm run lint`. Expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/incidents/AboutRail.tsx
git commit -m "$(cat <<'EOF'
feat(incidents): add AboutRail — entity-chip right rail

Replaces the previous label/value sidebar with avatar-chips for lead,
service chip with a live health Dot, CI chip-links routing to /cmdb,
and a 1h health sparkline. Sticky ~240px column. CMDB becomes
visible without leaving the incident page.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Refactor `IncidentDetail.tsx` to 3-pane layout

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx`

This is the integration task — wire the four components into a new 3-pane layout and remove the now-superseded inline UI. Single commit at the end.

- [ ] **Step 1: Read the file**

Run: `wc -l src/routes/incidents/IncidentDetail.tsx`
Run: `grep -nE "useResource|return \(|<aside|<section|className=\"flex" src/routes/incidents/IncidentDetail.tsx | head -30`

Identify these regions in the current file (which will be replaced or moved):
- The header block (title + severity badge + status badge area).
- The timeline render block (likely a `.map` over timeline events).
- The composer / "post update" UI (likely a modal or inline form).
- The metadata sidebar / about block (label/value pairs for lead, service, etc.).

Note where each region lives by line number. You'll replace these with the new layout below.

- [ ] **Step 2: Add imports**

Inside the top imports block, add:

```tsx
import { IncidentClock }        from '@/src/components/incidents/IncidentClock';
import { BlastRadiusBackdrop }  from '@/src/components/incidents/BlastRadiusBackdrop';
import { IncidentComposer }     from '@/src/components/incidents/IncidentComposer';
import { AboutRail }            from '@/src/components/incidents/AboutRail';
```

- [ ] **Step 3: Replace the render return with a 3-pane layout**

The new render shape (place this where the current top-level `return ( … )` lives; reuse the existing data hooks above — don't change data fetching, only the rendered JSX):

```tsx
return (
  <div className="flex h-full min-h-0">
    {/* Center column: header + timeline + composer, with blast-radius wallpaper */}
    <section className="relative flex-1 min-w-0 flex flex-col overflow-hidden border-r border-ois-border">
      {/* wallpaper */}
      {incident?.impactedCiIds?.[0] && (
        <BlastRadiusBackdrop impactedCiId={incident.impactedCiIds[0]} />
      )}

      {/* foreground content */}
      <div className="relative z-10 flex flex-col h-full">
        <header className="p-[18px] flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <SeverityBadge severity={incident.severity} />
              <IDCell value={incident.publicId} />
              <Dot variant="danger" size="sm" />
              <span className="text-[11px] font-semibold text-ois-danger uppercase tracking-[0.08em]">
                {incident.status === 'resolved' || incident.status === 'closed' ? incident.status : 'Active'}
              </span>
            </div>
            <h1 className="text-[19px] font-semibold text-ois-text">{incident.title}</h1>
          </div>
          <IncidentClock
            startedAt={incident.openedAt}
            resolvedAt={incident.resolvedAt}
            slaDeadline={incident.slaDeadline}
          />
        </header>

        <div className="flex-1 overflow-y-auto px-[18px] pb-3">
          <div className="text-[10px] tracking-[0.16em] text-ois-text-subtle mb-2 uppercase">Timeline</div>
          {/* Reuse existing timeline rendering — extract the previous .map into a TimelineList component
              if it's larger than ~40 lines, or inline it here. Don't change its data source. */}
          <TimelineList events={timeline ?? []} />
        </div>

        <div className="px-[18px] pb-[18px]">
          <IncidentComposer
            incidentId={incident.id}
            onPosted={() => { void refetchTimeline(); }}
          />
        </div>
      </div>
    </section>

    {/* Right rail */}
    <AboutRail
      lead={incident.lead ? { name: incident.lead.name, id: incident.lead.id } : null}
      service={incident.service ? {
        name: incident.service.name,
        publicId: incident.service.publicId,
        healthVariant: incident.service.healthVariant ?? 'muted',
      } : null}
      impactedCis={(incident.impactedCis ?? []).map(ci => ({
        publicId: ci.publicId,
        healthVariant: ci.healthVariant ?? 'muted',
      }))}
      healthSparkline={serviceHealthSparkline}
      changeWindow={incident.changeWindow ?? null}
    />
  </div>
);
```

Imports to update at the top of the file to match: `Dot`, `IDCell`, and `SeverityBadge` (the existing one from `src/components/ui/StatusSeverityBadges.tsx`).

- [ ] **Step 4: Replace the old inline blocks**

- Delete the old header / breadcrumbs block that previously rendered the severity+status+title — the new `<header>` above replaces it.
- Delete the old composer / "Post update" modal-trigger UI — `<IncidentComposer>` replaces it.
- Delete the old metadata sidebar — `<AboutRail>` replaces it.
- If the file had a side panel showing a timeline-of-incident sidebar (different from the metadata sidebar), keep it deleted; the new layout has only two columns.

If a small `TimelineList` helper doesn't already exist, extract the previous `.map(event => …)` into a local `const TimelineList: React.FC<{events: TimelineEvent[]}> = …` inside this file (don't make it a new exported component — internal helper only).

If any **incident data the new components need** isn't already returned by `useResource`-backed fetches (e.g. `slaDeadline`, `service.healthVariant`, sparkline data), and adding it would require backend changes, **stop and report** — that's outside this PR's scope. Pass `null`/empty for any missing optional field instead; the new components handle absence gracefully.

- [ ] **Step 5: Typecheck**

Run: `npm run lint`. Expect exit 0. Fix any prop-shape mismatches you discover (likely `incident.service.publicId` vs `serviceId`, etc.) by adapting the call site — not the new components.

- [ ] **Step 6: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx
git commit -m "$(cat <<'EOF'
refactor(incidents): 3-pane detail page with clock + blast-radius + composer + entity rail

Replaces the previous label/value sidebar + modal composer with a
center column carrying timeline + persistent composer behind a faint
CMDB blast-radius wallpaper, a top-right live elapsed clock, and a
sticky entity-chip right rail. PR-3 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-3 milestone.** Optional: push and open a PR before continuing to PR-4 — PR-4 is small and self-contained, but they're independent enough to merge separately.

---

## PR-4 — AppShell gradient stripe

### Task 6: 2px gradient stripe under the TopBar

**Files:**
- Modify: `src/index.css` (add a `@keyframes` definition)
- Modify: `src/components/layout/AppShell.tsx` (render the stripe element)

- [ ] **Step 1: Add the keyframe to `src/index.css`**

Open `src/index.css`. Find the existing `@media (prefers-reduced-motion: no-preference) { @keyframes ois-fade-up { … } ... }` block (around line 93–119). Inside that same `@media` block, add the new keyframe alongside the others:

```css
@keyframes ois-topbar-stripe {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

And in the utilities section just below the existing `.ois-fade-up`/`.ois-fade-in`/etc. classes, add:

```css
.ois-topbar-stripe {
  animation: ois-topbar-stripe 0.4s cubic-bezier(0.2, 0, 0, 1) both;
  transform-origin: center;
}
```

Keep both inside the `@media (prefers-reduced-motion: no-preference)` block so reduced-motion users get the stripe immediately at scaleX(1) (the static `from`-state hex shouldn't appear; by leaving the class undefined outside the media query, the element stays at its natural `transform: none` for reduced-motion users — which is `scaleX(1)`). If you'd rather make it explicit, add `.ois-topbar-stripe { transform: scaleX(1); }` outside the media query.

- [ ] **Step 2: Render the stripe in `AppShell.tsx`**

Open `src/components/layout/AppShell.tsx`. The main column already exists:

```tsx
<div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
  <TopBar … />
  <main … />
</div>
```

Just after `<TopBar … />` and before `<main … />`, insert:

```tsx
<div
  aria-hidden
  className="ois-topbar-stripe h-[2px] w-full shrink-0"
  style={{ background: 'linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)' }}
/>
```

This makes the stripe always present after auth (it's part of the `AppShell` chrome). The keyframe plays once on first mount — refreshes within the app will replay it; route changes won't because `AppShell` stays mounted across routes.

- [ ] **Step 3: Typecheck**

Run: `npm run lint`. Expect exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/layout/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(shell): 2px gradient stripe under TopBar (carries login accent)

A 2px linear-gradient(90deg, #1F4FD4, #0BA5EC) stripe sits directly
under the TopBar border, scaleX(0)→scaleX(1) on first mount via a
400ms cubic-bezier keyframe. The login's atmospheric gradient is now
demoted to permanent platform chrome. PR-4 closes here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**🏁 PR-4 milestone.** Tier 2 complete.

---

## Final verification

- [ ] **Typecheck once more**

Run: `npm run lint`. Expect exit 0.

- [ ] **Visual smoke**

Run: `npm run dev`. Walk through:

1. Sign out and back in — the gradient stripe should slide in (scaleX) under the TopBar over ~400ms, then stay.
2. Navigate to an active P1 incident — verify:
   - Top-right shows a live elapsed clock in gradient mono that ticks every second.
   - If the incident has crossed the 10m / 30m boundaries, color drift is visible.
   - Behind the timeline, a faint CMDB graph is visible (only at viewport ≥ 1280px wide); impacted node halo pulses.
   - The persistent composer sits at the bottom with visible slash chips (`/status`, `/page`, `/link CI`); clicking a chip inserts the command and focuses the textarea.
   - The right rail shows the lead as an avatar-chip, service as a chip-link with a health Dot, impacted CIs as mono chips, and a 1h health sparkline.
3. Navigate to a resolved incident — verify the clock is frozen at the resolved-elapsed value (not still ticking).
4. Resize window below 1280px — blast-radius wallpaper disappears; the page still renders cleanly with the same layout.
5. Existing tier-1 chrome (sidebar dim, mono IDs in list views, `⌘K` palette) is unchanged.

---

## Out of scope (explicit)

- Backend additions for `slaDeadline`, `service.healthVariant`, health-sparkline data. If these don't exist on the API yet, the new components render gracefully without them (passing `null`/empty). Wiring them up is a backend cycle — call it out in the PR description.
- Slash-command execution semantics (`/status`, `/page`, `/link CI`). PR-3 ships the chips as input-helpers that insert text; actual parsing/execution is a later cycle.
- Login → AppShell choreography across routes — PR-4 ships a self-contained mount keyframe, not a layoutId transition.
- All Tier 3 work (catalog-driven entity chips beyond the right rail, sidebar context menus, hover cards on CI mentions, segmented view switcher). Saved for the Tier 3 plan.
