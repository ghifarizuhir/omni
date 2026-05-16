# Design References for OIS

Three deep-dives, each through a different lens, mapped to concrete OIS surfaces.

| Reference | Lens | File |
|---|---|---|
| **Linear** | Structural — how to organize density calmly | [linear.md](./linear.md) |
| **incident.io** | Domain — what an ops peer actually ships | [incident-io.md](./incident-io.md) |
| **Family + Vercel** | Aesthetic continuity — dark login ↔ light platform | [family-vercel.md](./family-vercel.md) |

---

## Where the three references *agree* (do these first)

These patterns appear in all three reports. High confidence, low risk.

1. **Light chrome, content stacks at most 2 elevations.** Canvas + card. No nested shadows. Borders (1px hairline) carry separation, not shadows.
2. **Mono as texture, not data.** Geist Mono for IDs (`INC-1042`), timestamps, latencies, percentages. Turns dense tables into rhythm.
3. **Severity / status as glyph, not pill.** Linear's status ring, Vercel's status dot, incident.io's left-stripe. Pills are reserved for *detail* pages; lists use glyphs.
4. **Sidebar restraint.** No filled pills. Active = thin left accent (2–3px) in `#1F4FD4` + a 6–8% tinted background. Section labels at 10–11px uppercase, +0.16em tracking.
5. **One accent does all the work.** OIS already has `#1F4FD4 → #0BA5EC`. Use it for active states, the topbar stripe, focus rings — nowhere else.
6. **Skeletons over spinners.** Loading state mimics the resolved layout.

---

## Where the references *disagree* (decide deliberately)

| Tension | Linear | incident.io | Family/Vercel | Recommendation for OIS |
|---|---|---|---|---|
| Sidebar tone | Dimmer than content | Same as content | Same as content | **Linear's inversion**: sidebar slightly darker (`#F4F5F7`) than the `#FFFFFF` content area. We currently have white sidebar — flip it. |
| Global search | Cmd-K only | Visible search + Cmd-K | Visible + slash | **Visible search in TopBar AND Cmd-K** — on-call users need both. |
| Density | 32–36px rows | 44–48px rows | 36px rows | **28–32px for ops lists** (`/inbox`, `/events`, `/incidents`), 40px for executive views (`/`). |
| AI prominence | None | Everywhere | None | **Behind explicit "Draft" / "Summarize" actions only.** |
| Identifier visibility | Everywhere | Detail-only | N/A | **List + detail, not KPI cards.** Executives don't want `INC-1042` in a tile. |

---

## Ranked action list (small → big)

### Tier 1 — Quick wins (each <2 hours)

1. **Invert sidebar/content contrast.** Sidebar surface `#F4F5F7`, content surface `#FFFFFF`. Currently both white → the workspace feels flat. *(`Sidebar.tsx`, `index.css`)*
2. **Replace severity badges with left-stripe + dot on list rows.** 3px left border in P1 `#B42318` / P2 `#DC6803` + a `Dot` element instead of the chip. Keep the chip on detail. *(`/incidents`, `/events`, `/inbox`)*
3. **Mono identifier column.** Add a 12px Geist Mono ID column to every list view. Muted `#6B7280`. *(every list route)*
4. **Status as ring glyph in lists.** 14px ring with fill state. Replace the text status chip. *(`/events`, `/incidents`)*
5. **Visible TopBar search field stays — add `kbd` hint chip showing `⌘K`.** Don't hide search; just signal the palette also exists.

### Tier 2 — Medium wins (half-day each)

6. **Global Cmd-K palette.** One palette for navigation, creation, actions. `/incident sev=2 service=…` parser style. *(new component, mounted in `AppShell`)*
7. **3-pane Incident detail.** Left nav, center timeline + persistent composer, **right sticky metadata rail** (severity, lead, linked CIs from CMDB). *(`/incidents/:id`)*
8. **Status-page component grid.** Stack of component rows, right-aligned tabular `99.99%`, 90-day uptime bar (1px-wide segments). *(`/availability`, `/status`)*
9. **On-call schedule swimlane.** Horizontal timeline, one row per rotation, 8 distinct hues per user (not severity colors), now-line in `#1F4FD4`. *(`/on-call`)*
10. **Login → AppShell transition.** ~600ms: dark radial recedes upward into a 2px `#1F4FD4 → #0BA5EC` stripe under the TopBar. The login's centerpiece *becomes* the platform's accent line. *(`Login.tsx` + `AppShell.tsx`)*

### Tier 3 — Bigger structural moves (multi-day)

11. **Catalog-driven entities.** Service names, severities, teams as first-class CIs with detail pages — every incident field links to a CI. *(builds on `/cmdb`)*
12. **AI summary with citation chips.** "Draft retrospective with AI" emits prose with numbered chips that open a right-side evidence drawer pulling from timeline + monitoring events. *(`/incidents/:id/retro`)*
13. **Right-click context menus on sidebar items.** Pin, copy link, mute, open in new pane. *(`Sidebar.tsx`)*
14. **Hover cards on entity mentions.** Hovering a CI ref in inbox/timeline pops a 320px card (owner, status, last change) without navigating. *(`InboxDrawer`, `/incidents/:id`)*
15. **Segmented view switcher in topbar for multi-view routes.** List / Graph / Coverage as a 3-segment control replacing separate routes. *(`/cmdb`, `/events`, `/monitoring/rules`)*

---

## The one paragraph that matters

OIS already has the right *bones*: cool blue accent, Plus Jakarta Sans + Geist Mono, a refined dark login. The work isn't redesigning — it's **demoting elements from theatrical to operational**. The login's gradient becomes a 2px stripe. The mono font that whispered `/ ENTERPRISE NODE /` on login becomes the IDs and timestamps in tables. The atmospheric radial becomes nothing — and that's correct, because the workspace is for working, not for atmosphere. Continuity is carried by *withholding*, not by repeating.
