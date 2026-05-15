# Light UI — Tier Execution Design

**Date:** 2026-05-16
**Status:** Approved — ready for implementation plan
**Owner:** Ghifari
**Related:** [docs/design-references/](../../design-references/) (Linear, Incident.io, Family/Vercel deep dives)

---

## 1. Context

OIS just converted its chrome to a light theme (white sidebar + topbar around a `#F7F8FA` workspace, OIS blue `#1F4FD4` accent, Plus Jakarta Sans + Geist Mono fonts) while keeping a dark theatrical login. Three external references were studied — Linear (structural), Incident.io (domain), Family + Vercel (aesthetic continuity) — and distilled into a 15-item, 3-tier action list in `docs/design-references/README.md`.

This spec scopes that list down to **12 items shipped across 8 PRs in 3 tiers**, with explicit signature moves to differentiate OIS from generic SaaS.

## 2. Goals & non-goals

**Goals**

- Eliminate the visual seam between chrome and content by inverting sidebar/content contrast.
- Establish 5 shared UI primitives so list density across ops-critical routes is consistent.
- Give `/incidents/:id` two signature moves (incident clock, blast-radius wallpaper) that distinguish OIS from peer products.
- Carry the dark login's `#1F4FD4 → #0BA5EC` gradient into the platform as a permanent 2px accent stripe under the TopBar.
- Make CMDB visible everywhere via catalog-driven entity chips and hover cards.

**Non-goals**

- No status-page component grid in this cycle (deferred).
- No on-call schedule swimlane in this cycle (deferred).
- No AI summary / citation chips (no AI plumbing yet).
- No severity drape (signature move ② dropped; clock + wallpaper carry the weight).
- Cmd-K palette ships **navigation only** — creation/action commands deferred to a later cycle.

## 3. Approach

**Sequencing**: tier-by-tier, top-down. Tier 1 validates the visual direction before Tier 2/3 invest in more.

**Tier 1 structure**: foundations + adoption split (Approach C). PR-1 lands all shared primitives and chrome changes without touching routes. PR-2 sweeps the 4 ops-critical routes (`/inbox`, `/incidents`, `/problems`, `/events`) to adopt them. This makes review tractable.

**Tier 2 & 3**: one PR per item — each is self-contained.

**Total: 8 PRs.**

## 4. PR-by-PR breakdown

### PR-1 — Foundations (Tier 1)

**Scope**

- Sidebar surface flips from `#FFFFFF` to `#F4F5F7` (chrome dims; content stays bright `#FFFFFF`). Cards now sit on bright white and pick up a subtle shadow (`0 1px 2px rgba(16,24,40,0.04)`).
- TopBar adds a `⌘K` kbd hint inside the search input's right-aligned chip area.
- Five new primitives in `src/components/ui/`:
  - **`<Dot variant size pulse? />`** — colored status dot. `variant: success | warning | danger | info | muted`, `size: sm(6px) | md(8px) | lg(10px)`.
  - **`<SeverityStripe severity />`** — applied as `border-left: 3px solid` on a row container. `severity: P1(#B42318) | P2(#DC6803) | P3(#DC6803) | P4(#027A48)`.
  - **`<IDCell value />`** — Geist Mono 12px `#6B7280` tabular numerics for entity IDs (`INC-1042`).
  - **`<StatusRing state />`** — 14px SVG glyph. `state: open(empty ring) | acknowledged(half-fill in OIS blue) | investigating(¾ fill) | resolved(filled green + check) | closed(dashed empty ring)`.
  - **`<CmdKPalette />`** — global modal opened with `⌘K` / `Ctrl-K`. **Navigation only in this PR**: fuzzy filter over routes, arrow keys to navigate, Enter to go. Mounted in `AppShell`.

**Tokens added to `src/index.css`**

```css
/* Current value is #FFFFFF (set in the prior light-chrome conversion).
   This PR dims it so content area stands out. */
--color-ois-sidebar-bg: #F4F5F7;
--color-ois-content-bg: #FFFFFF;  /* new token for explicit content surface */
/* Adjust existing --shadow-ois-card from 0 1px 2px rgba(16,24,40,0.05)
   to a slightly lighter value since cards now sit on bright white: */
--shadow-ois-card: 0 1px 2px rgba(16,24,40,0.04);
```

**Files touched**: `src/index.css`, `src/components/layout/Sidebar.tsx` (token reference), `src/components/layout/TopBar.tsx` (kbd hint), `src/components/layout/AppShell.tsx` (mount CmdKPalette), 5 new files in `src/components/ui/`.

**No route changes in PR-1.**

### PR-2 — Adoption (Tier 1)

**Scope**: apply PR-1's primitives across 4 ops-critical routes.

| Route | SeverityStripe | IDCell | StatusRing | Dot |
|---|---|---|---|---|
| `/inbox` | item priority (P1–P4) | source ID | — | unread indicator |
| `/incidents` | severity | `INC-####` | state | — |
| `/problems` | priority | `PRB-####` | state | — |
| `/events` | severity | `EV-####` | acknowledged/resolved | source |

**Detail pages untouched** — `/incidents/:id` etc. keep their full `<SeverityBadge>` and `<StatusBadge>` chips. Glyphs are list-only because vertical scan speed matters in lists; detail pages have room for the full chip.

**Files touched**: 4 route files + the list-row components used by each.

### PR-3 — 3-pane `/incidents/:id` with signature moves (Tier 2)

**Scope**

Layout: existing left nav + center stage + **new sticky right metadata rail (~240px)**. Right rail scrolls independently from center.

**Signature move #1 — Incident clock** (top-right of header):

- Live monospace elapsed time (`+04:23`), updates every 1s.
- Color gradient drifts as age grows: `#1F4FD4` (0–10m) → `#F79009` (10–30m) → `#F04438` (30m+). Implemented as `background-clip: text` on a `linear-gradient(90deg, ...)` that shifts via CSS variable interpolation.
- SLA countdown below in 10px `#B42318` (when within breach window) or `#98A2B3`.
- Font: Geist Mono 28px 700 for the elapsed value; 10px for labels.

**Signature move #3 — Blast-radius wallpaper** (behind center column):

- Faint CI topology graph rendered as inline SVG at `opacity: 0.10`.
- Nodes pulled from `/api/v1/cmdb/graph?seed={incidentCiId}&depth=2`.
- Impacted node has a 22px halo at 25% opacity in severity color; CSS keyframe pulse at `1.4s ease-in-out infinite alternate`.
- Hidden on viewports < 1280px wide via `@media` query.

**Composer rebuilt** (bottom of center column):

- Persistent (not modal), `border: 1px solid #E4E7EC`, `border-radius: 8px`.
- Header row shows visible slash-command chips: `/status`, `/page`, `/link CI`. Each chip is a `<button>` that inserts the command + focuses the input.
- Inline `⌘↵` hint right-aligned.
- Submits via POST to `/api/v1/incidents/:id/updates` (existing endpoint per `server/routes/incidents.ts`).

**Right rail = entity chips**:

- **Lead**: avatar-chip (`<Avatar size="xs" />` + name in pill).
- **Service**: chip-link to `/cmdb/:ciId` with a live `<Dot variant={healthVariant} />`.
- **Impacted CIs**: wrapping flex of mono-named chip-links + status dots.
- **Health (1h)**: 28px-tall inline SVG sparkline of the service's health metric.

**Files touched**: `src/routes/incidents/IncidentDetail.tsx`, new components under `src/components/incidents/`: `IncidentClock.tsx`, `BlastRadiusBackdrop.tsx`, `IncidentComposer.tsx`, `AboutRail.tsx`.

### PR-4 — Gradient stripe on AppShell (Tier 2)

**Scope**

A 2px `linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)` stripe sits directly under the TopBar's bottom border. On AppShell first-mount, animates `transform: scaleX(0) → scaleX(1)` from `transform-origin: center` over `400ms cubic-bezier(0.2, 0, 0, 1)`. Persists as permanent chrome thereafter.

**Implementation**: CSS keyframe on the AppShell wrapper, gated by a `mounted` state set once on mount. No cross-route choreography, no `motion/react` `layoutId`.

**Files touched**: `src/components/layout/AppShell.tsx`, possibly `src/index.css` for the keyframe.

### PR-5 — Catalog-driven entity chips (Tier 3)

**Scope**

Replace plain-text entity references in body content with chip-links. Convention:

- Entity link = inline `<a>` with `text-decoration: underline; text-decoration-style: dotted; text-decoration-color: #98A2B3; color: #1F4FD4`.
- Hover state lifts opacity, prepares the PR-7 hover card (loaded lazily).

**Detection mechanism**: a small parser pass that recognizes `INC-\d+`, `PRB-\d+`, `CHG-\d+`, `EV-\d+`, `CI-\d+`, and service slugs (from a known catalog endpoint).

**Files touched**: `src/lib/entity-linkify.tsx` (new), `src/components/layout/InboxDrawer.tsx`, `src/routes/incidents/[id].tsx` timeline, `src/routes/problems/[id].tsx`, `src/routes/changes/[id].tsx`, audit-log views.

### PR-6 — Right-click sidebar context menus (Tier 3)

**Scope**

Each sidebar item gains an `onContextMenu` handler that opens a 4-action menu: **Pin to favorites** (`⌘P`), **Copy link**, **Open in new tab**, **Mute notifications**. Menu is built as a new component `src/components/layout/SidebarContextMenu.tsx` using a small custom dropdown (no new dependencies). Positioning uses fixed coords from the `contextmenu` event; closes on outside-click or `Escape`.

**Persistence**: pinned routes stored in `localStorage` keyed by user ID. Pinned items render at the top of the sidebar above standard sections.

**Files touched**: `src/components/layout/Sidebar.tsx`, new `src/components/layout/SidebarContextMenu.tsx`, new `src/lib/sidebar-pins.ts`.

### PR-7 — Hover cards on entity mentions (Tier 3)

**Scope**

Hovering an entity chip-link (from PR-5) for ≥ 400ms triggers a 300×~140px card overlay:

- Header: mono ID + status dot + status text + type label.
- Two-column metadata: Owner, Last change.
- 24px-tall inline SVG health sparkline (1h window).
- Anchored via floating-ui's `flip` + `shift` middleware to stay on-screen.

**Data**: single endpoint `/api/v1/catalog/entity/:type/:id` returns the card payload. Cached for the session by `useResource`.

**Files touched**: new `src/components/catalog/EntityHoverCard.tsx`, new server route, integration into entity-link renderer from PR-5.

### PR-8 — Segmented view switcher (Tier 3)

**Scope**

Replace separate routes `/cmdb`, `/cmdb/graph`, `/monitoring/coverage` with a single shell route that renders one of three views based on a `?view=list|graph|coverage` query param. Segmented control in the route's header (white pill on `#F4F5F7` track, OIS blue text on active).

The same pattern applies to `/events` if it gets a future Graph view; this PR ships only the CMDB consolidation.

**Files touched**: `src/routes/cmdb/index.tsx` (becomes the shell), the three view components, route definitions in `src/routes/index.tsx`.

## 5. Dependencies & merge order

```
PR-1 ─┬─► PR-2          (adoption needs primitives)
      └─► PR-3          (incident detail uses SeverityStripe, IDCell, Dot)
PR-5 ───► PR-7          (hover cards attach to chip-links)
PR-4, PR-6, PR-8        (independent)
```

Merge order (typical): PR-1 → PR-2 → PR-4 → PR-3 → PR-6 → PR-5 → PR-7 → PR-8. PR-4, PR-6, PR-8 can be parallelized after PR-1 lands.

## 6. Risks & open questions

- **Blast-radius wallpaper performance**: rendering a CMDB graph at 10% opacity in the background of every incident page could be costly if the depth-2 fan-out is large. Mitigation: cap rendered nodes at ~30; hide on viewports < 1280px; lazy-load the SVG behind a `requestIdleCallback`.
- **CmdKPalette navigation list**: routes are statically defined; no fuzzy-search library needed yet. If the route list grows past ~50, revisit with `fuse.js` or similar.
- **Entity link parser ambiguity**: a string like "see CHG-220 vs CHG-221" must produce two separate chips. Regex pass + replace must be careful with surrounding punctuation.
- **Right-click on macOS Ctrl-click**: ensure the context menu also catches macOS's `event.ctrlKey + click`, not only `oncontextmenu` (which Safari sometimes routes differently).
- **Existing severity badge usage** beyond list rows: must verify no broken references after PR-2 swaps row chrome.

## 7. Testing strategy

- **Visual regression**: Storybook stories (or equivalent) for each new primitive in PR-1, snapshotted.
- **Unit**: primitives have rendering tests for each `variant`/`state` enum. CmdKPalette has fuzzy-filter + keyboard-nav tests.
- **Integration**: PR-3 incident detail page has a test for clock tick + SLA countdown + chip-link wiring.
- **Manual smoke per PR**: walk the affected route at 1280px and 1920px; verify dark login still feels continuous after PR-4 stripe lands.

## 8. Out of scope (explicit, with rationale)

| Item | Why deferred |
|---|---|
| Status-page component grid + uptime bars | Self-contained, can ship independently in a later cycle |
| On-call schedule swimlane | Same — independent, no dependency on this work |
| AI summary with citation chips | No AI integration plumbed yet |
| Severity drape (signature move ②) | Clock + blast-radius wallpaper carry the page's emotional weight |
| Cmd-K creation/action commands | Tier 1 ships navigation only; extending the palette is its own cycle |
| Tier 1 treatment on `/changes`, `/releases`, `/deployments`, `/availability` etc. | Scoped to ops-critical 4 routes; remaining routes get swept later |
