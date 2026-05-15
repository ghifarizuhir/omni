# Linear — Structural Reference

> Lens: how Linear organizes a lot of information calmly. Sidebar/topbar mechanics, command palette, list density, keyboard affordances, status/priority visual language.

## 1. Aesthetic POV

Linear feels like a well-tuned instrument: a calm, neutral chrome that recedes so the work — issues, cycles, projects — occupies the foreground. The March 2026 refresh explicitly leans further into this: "navigation sidebars are slightly dimmer, allowing the main content area to stand out." It is opinionated minimalism — "simple first, then powerful" — built around a keyboard-first operator who treats the mouse as optional. Nothing decorative survives unless it carries information.

## 2. Typography

Linear ships a custom-tuned Inter variant (Inter Display) for headings and Inter for body.

- Body / list rows: ~13px, weight 400–450, line-height ~1.4, tracking ~−0.01em
- Section labels in sidebar: ~11–12px, weight 500, uppercase or sentence-case, tracking +0.02em, muted gray
- Page titles in topbar: ~14–15px, weight 500
- Marketing display: ~56–72px, weight 500, tracking −0.03em (tight)
- Mono (identifiers like `ENG-2703`): a geometric mono, ~12px, muted

The whole product runs cooler-than-default tracking — letters sit close, which is what gives lists their dense-but-legible feel.

## 3. Color & surfaces

Linear's light mode uses a soft warm-gray foundation, not pure white.

- App canvas: ~`#FBFBFB` / `#F8F8F7`
- Sidebar surface: **subtly darker than canvas** (~`#F4F4F3`) — *inverted* from many SaaS tools; this dims the chrome so content pops
- Content surface (lists, detail): `#FFFFFF`
- Borders: ~`#EBEBEA`, used sparingly — most separation is whitespace, not lines
- Text: primary `#1C1C1C`, secondary `#6E6E6E`, tertiary `#9A9A9A`
- Accent: indigo/violet `#5E6AD2` — used only for active states and brand
- Status hues are saturated but small: backlog gray, todo unfilled ring, in-progress half-filled ring (yellow/blue), done green `#5E9E5E`, canceled muted

Surface stacking: only two real elevations — flat sidebar, flat content — with the modal/command-palette layer floating on a 4–8% scrim.

## 4. Layout patterns

- Three-pane mental model: ~240px sidebar, fluid list, optional ~420px detail peek
- Sidebar sections: Inbox, My Issues, Reviews, Pulse → Workspace > Initiatives / Projects → collapsible per-team trees
- Right-click context menus on nearly every sidebar item
- List density: ~32–36px row height, single-line truncation; columns priority bar → status ring → ID (mono) → title → labels → assignee avatar → date
- Topbar carries breadcrumb left, view-switcher segmented control center (List/Board/Timeline), filter+display+actions right; **no global search bar — Cmd-K replaces it**
- Empty states: short prose + single primary action + the keyboard shortcut to create

## 5. Motion

- Sidebar collapse/expand: ~150ms ease-out width transition
- Hover cards (mentions, project pills): ~120ms fade+lift, 4px translate
- Cmd-K palette: scale-from-0.96 + fade, ~140ms
- Status changes flash a subtle 1-frame highlight on the row
- Page transitions: **instant** — no route-level animation. Speed *is* the animation.

## 6. Signature details

1. **Status as a tiny progress ring** — quarter/half/three-quarter/full circle. Glyph replaces word.
2. **Priority as a vertical bar chart icon** — 1/2/3/4 bars; no priority = dashed circle.
3. **Cmd-K everywhere** — same palette for navigation, creation, and actions.
4. **Inline keyboard hints** — `kbd` chips in tooltips and empty states (`C` to create, `G then I` for issues).
5. **Identifiers as first-class** (`ENG-2703` in mono) — every entity is quotable, linkable, paste-able.

## 7. Specific moments worth lifting for OIS

| Linear pattern | OIS route |
|---|---|
| Dimmed sidebar / brighter content | `Sidebar.tsx` + `/` (Dashboard) — push sidebar to ~`#F1F2F4` against `#FFFFFF` content; current OIS has the opposite contrast |
| Status as ring glyph | `/events`, `/incidents` — replace text chips with 14px ring (open=empty, ack=half, resolved=full, closed=check). Frees a column. |
| Priority as bar-chart icon | `/incidents`, `/events` — P1–P4 as 4-step bar icon in OIS severity hues; keep the chip only on detail |
| Mono identifier column | All list routes — `INC-1042`, `CI-883`, `CHG-220` in Geist Mono 12px, muted |
| Cmd-K as global verb-bar | `TopBar.tsx` — one palette for "Go to CI…", "Acknowledge event…", "Create incident" |
| Segmented view switcher in topbar | `/cmdb`, `/events`, `/monitoring/rules` — List / Graph / Coverage as 3-segment control instead of separate routes |
| Right-click context menus on sidebar items | `Sidebar.tsx` — pin to favorites, copy link, mute |
| Empty states with shortcut prompt | `/events` empty — "No events. Press `C` to create rule, `G E` to go to all events." |
| Collapsible team groupings | `Sidebar.tsx` — reorganize as collapsible groups with overflow |
| Hover cards on entity mentions | `InboxDrawer` + incident detail — hovering a CI ref pops 320px card without navigating |

## 8. What NOT to steal

- **The violet accent** — OIS already owns `#1F4FD4`; don't dilute.
- **Sparse marketing-grade whitespace in operator lists** — NOC users need P1 incidents at 28px row height, not Linear's 36px. Borrow the *style*, tighten the density.
- **Cycles metaphor** — Linear cycles are a planning fiction; ITSM has real SLA windows. Don't import donut-progress vocabulary into `/availability`.
- **Hiding global search behind Cmd-K only** — fine for engineers, hostile for on-call who alt-tabbed in mid-incident. Keep a visible search affordance on `/cmdb` and `/events`.
- **"Triage" as a top-level noun** — collides with ITIL triage semantics.
- **Linear's aggressive identifier-everywhere** in `/` KPI cards — executives don't want INC-1042 in a tile, they want the count.
- **Single-accent monochrome status** — Linear can mostly-gray statuses; OIS severity is life-or-death and needs the full P1 red.

---

*Sources fetched: linear.app, /features, /changelog (March 2026 refresh notes), /method, /method/introduction.*
