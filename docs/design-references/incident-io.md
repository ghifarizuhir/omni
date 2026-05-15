# incident.io — Domain Reference

> Lens: what a serious ops peer actually ships. Incident detail anatomy, timeline, severity escalation, post-mortem editor, status page, on-call schedule.

## 1. Aesthetic POV

incident.io is "calm command center": deliberately quiet chrome so high-severity content can shout. Marketing leans dark/cyan, but the product is bright, near-white, with restrained typography and obsessive whitespace. Reads more like Linear than PagerDuty — content-forward, low chrome, big text-density per pixel only where it matters (timeline, schedule). Brand voice ("clear at a glance", "thoughtful design touches") shows up literally: each screen has one primary object, everything else is metadata sidebar.

## 2. Typography

- Family: geometric/neo-grotesque sans (Söhne/Inter-class) for UI; serif accents in marketing only. For OIS, **Plus Jakarta Sans maps cleanly**.
- Marketing hierarchy: hero ~56–64px / 700, section headers ~32px / 600, body ~16–17px / 400–450, eyebrow ~12–13px uppercase with ~0.06em tracking.
- Product UI: page titles ~20–22px / 600, row text 14px / 450, metadata labels 12px / 500 muted. Body tracking near-zero, display slightly negative (−0.01em).
- Numerals are tabular in metric contexts ("99.999% uptime").

## 3. Color & surfaces

- Marketing palette: deep navy `#0E1116`, cyan accent ~`#36E2D6` for CTAs, white cards on dark.
- Product palette (light): canvas `#FFFFFF`, page wash ~`#F7F7F8`, hairline borders `#E6E7EB` at 1px, **card shadow effectively zero** — separation by border only.
- Severity: red `#D92D20` (SEV1), amber `#F79009` (SEV2), blue `#2E90FA` (info), green `#12B76A` (resolved/operational).
- Surface stacking: max two levels — canvas + card. No nested elevation. Inline panels use a subtle inset wash rather than a shadow.

## 4. Layout patterns

- **Three-pane on detail screens**: left rail (global nav, ~240px), center stage (timeline/content, fluid), **right metadata rail (~320px, sticky, scrollable independently)**.
- 12-col underlying grid, but composition is 2-col practical (content + meta).
- Density: 44–48px row height in lists, 32px in dense timeline. Page padding 32px desktop.
- Nav is flat — categories as section labels (uppercase 11px), items 13–14px.

## 5. Motion

Almost no decorative animation. Hover states: 120ms ease-out opacity/bg. Side drawers slide in ~200ms `cubic-bezier(0.2, 0, 0, 1)`. Timeline new events fade+slide-up 240ms. AI streaming text uses token-by-token reveal. **Skeletons over spinners.**

## 6. Signature details

1. **Slash-command-as-affordance** — `/incident` as primary creation verb, surfaced as a pill-shaped input mimicking Slack.
2. **Citation chips inside AI summaries** — inline numbered references that pop a source panel (Grafana/Datadog snippets).
3. **Catalog-driven everything** — services, teams, severities are first-class entities with their own detail pages, not enum dropdowns.
4. **Severity is a color stripe, not just a badge** — left-edge 3px accent on incident rows and detail headers.
5. **"Update the incident" composer** — a persistent bottom composer on incident detail, not a modal.

## 7. Specific moments worth lifting for OIS

| incident.io pattern | OIS route |
|---|---|
| Slash-command composer | `Cmd-K` global palette + `/incidents/new` — `/incident sev=2 service=…` parser; pill input, mono tokens |
| 3-pane incident detail | `/incidents/:id` — left nav, center timeline+composer, **right "About this incident" rail** (severity, lead, service from CMDB, linked CIs, change window) |
| Severity left-stripe | `/inbox`, `/incidents`, `/events` — 3px left border in P1 `#B42318` / P2 `#DC6803`; never rely on badge alone |
| Catalog as first-class | Leverage existing `/cmdb` — every incident field links to a CI detail page; service names render as chips routing to `/cmdb/:ciId` |
| AI summary with citations | `/incidents/:id/retro` — "Draft with AI" block emits prose with numbered chips opening a right-side evidence drawer (timeline + monitoring events) |
| Status page component grid + uptime numerals | `/availability` public view — stacked component rows, right-aligned tabular `99.99%`, 90-day uptime bar (1px segments) |
| Schedule swimlane | `/on-call` — horizontal timeline, one row per rotation, colored blocks per user (8 distinct hues, **not severity colors**), now-line as 1px OIS blue |
| Persistent bottom composer | `/incidents/:id` — replaces modal-driven updates; supports status change + note in one submit |
| Stacked "linked incidents" cards | `/problems/:id` — borrow the related-incidents pattern |

## 8. What NOT to steal

- **Marketing dark+cyan palette** — wrong for OIS's light chrome mandate; keep cyan out of product entirely.
- **Slack-shaped UI metaphors as primary surface** — OIS isn't a chat overlay; don't force Slack composer aesthetic on `/changes` or `/cmdb`.
- **Aggressive AI-everywhere framing** — incident.io can lean on it; OIS should gate AI behind explicit "Draft" / "Summarize" actions to preserve operator trust.
- **Borderless minimalism on dense tables** — OIS audit/CMDB tables need clearer row separation; keep 1px `#E6E7EB` plus zebra `#FAFAFB` on rows >40 entries.
- **56px+ display type inside the app** — incident.io marketing scale doesn't belong in product chrome; cap product H1 at 22–24px.

---

*Sources fetched: incident.io, /ai-sre, partial /status-pages. Some product pages 404'd or returned image-free text; visual specifics combine fetched copy with conservative inference from textual UI cues (slash commands, catalog, citations, uptime percentages, rotation types).*
