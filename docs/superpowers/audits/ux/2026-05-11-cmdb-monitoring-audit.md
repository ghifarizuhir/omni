# UX Audit — CMDB & Monitoring Section
**Date:** 2026-05-11
**Persona:** On-call ops engineer
**Iteration:** 1 (Management Mode, on-call lens)

---

## Journey

During an incident, the engineer opens **CMDB Explorer** to find an affected CI → drills into **CMDB Detail** for attributes, open incidents, linked changes, and the monitoring rules attached → uses **CMDB Graph** to trace blast radius across dependencies → checks **CMDB Audit** post-incident to see who touched the CI recently. Outside an incident, the same engineer reviews **Monitoring Rules** to tune signal/noise, walks the **Alert Routing** editor to confirm who gets paged on what severity, and reads the **Monitoring Coverage** report to find critical CIs flying blind.

---

## Page Findings

### CMDB Explorer (`/cmdb`)

**Journey context:** First stop when an engineer hears a service name during a bridge call and needs to find the underlying CI(s) — they search by name or scan the tree under a service to find the application or database in question.

The Explorer has a strong foundation. The tree-by-service view groups CIs under their owning service with an "Unassigned / Infrastructure" bucket for unowned resources, which matches how an ops engineer thinks about ownership. The list view alternative is a dense scannable table with sortable health and updated columns. The chip-style type and criticality filters above the result area give one-tap narrowing, and the empty state with a "Clear filters" button is well-designed. Search covers name, ID, and a stringified attributes blob, which is unusually flexible for fuzzy lookups (e.g. searching for a hostname found in attributes).

There are several inert controls. The "Add CI" primary button (`CMDBList.tsx:134-136`) has no `onClick` handler — clicking the most prominent action on the page does nothing. The "Import" button beside it (`CMDBList.tsx:137-139`) is also inert. The "Status" filter dropdown in the filter row (`CMDBList.tsx:171-173`) has no menu wired to it and no state — it visually invites filtering by status but does nothing. The "Last discovery: 12m ago" metadata in the page header (`CMDBList.tsx:130`) is hardcoded; during a real incident an engineer who needs to know whether discovery has run recently will read this number as authoritative when it is not.

The service grouping in tree view is hardcoded to three service IDs (`'svc-001', 'svc-002', 'svc-003'` at `CMDBList.tsx:69`). If a fourth service exists in `mockServices`, its CIs land in "Unassigned / Infrastructure" alongside genuinely unowned items, which is misleading. The initial expanded state at `CMDBList.tsx:29-34` is keyed to the same three IDs, so any new service added to mock data will fail to expand by default.

Navigation flow is fine in list view — row clicks navigate to `/cmdb/:id` — but tree-view leaf nodes (rendered by `CITreeNode`) navigate inside the tree, not to a route I can audit at this level of detail; double-check that every leaf is clickable, since the "search-then-drill" path depends on it.

**Priority fixes:**
- P1: Wire the "Add CI" primary button to a create-CI flow or modal — currently inert (`CMDBList.tsx:134-136`)
- P1: Wire or remove the "Import" button — it currently does nothing (`CMDBList.tsx:137-139`)
- P1: Wire or remove the "Status" filter dropdown — it has a chevron and label but no menu/state (`CMDBList.tsx:171-173`)
- P2: Derive the service tree from `mockServices` instead of hardcoding `['svc-001','svc-002','svc-003']` so new services appear correctly (`CMDBList.tsx:69`, `CMDBList.tsx:29-34`)
- P2: Replace the hardcoded "Last discovery: 12m ago" subtitle with either a real timestamp or remove the claim (`CMDBList.tsx:130`)
- P3: Allow column sort in list view — `DataTable` may already support it but no `sortable` flag is passed; sorting by Updated or Health is high-value during triage

---

### CMDB Detail (`/cmdb/:ciId`)

**Journey context:** The engineer lands here to confirm a CI's status, see open incidents already linked to it, check what changes hit it recently, and review which monitoring rules are watching it — the four core questions during an incident bridge.

The Detail page is the most operationally important page in the CMDB module and is mostly well-built. The header is information-dense without being noisy: type icon, public ID, status badge, name, service, environment, tier, and three at-a-glance badges (health, rule count, open incidents) with the incident badge colour-coded by count. The seven tabs (Overview / Relationships / Attributes / Linked Items / History / Monitoring / Capacity) cover the legitimate questions an engineer brings to this page. The Linked Items tab pulls real linked incidents via `getIncidentsByCI` and real linked changes via `getChangesByCI`, both deduplicated — this is genuinely good wiring that other pages should emulate.

However, several header elements present as truth but are not. The "Operational" badge at `CMDBDetail.tsx:95` is hardcoded literally — every CI displays "Operational" with a green heart icon regardless of `ci.health`. A CI showing a "degraded" status badge on the left can simultaneously show "Operational" on the right of the header; during an incident this is actively dangerous. The "Tier" indicator at `CMDBDetail.tsx:90` is a binary derivation (`criticality === 'critical' ? '1' : '2'`) that flattens high/medium/low all into Tier 2, which is wrong for tiered service models. The Health Snapshot card on the Overview tab (`CMDBDetail.tsx:140-151`) uses hardcoded values: `[100, 100, 95, 100, 100, 100, 100]` sparkline, "100% Operational", "99.98% Composite Uptime" — none derived from any data. An engineer comparing two CIs will see the identical health card on both and assume the data is real.

The "Edit", "MoreHorizontal", and "View All" buttons (`CMDBDetail.tsx:67-72`, `CMDBDetail.tsx:134`) are all inert. The `repoUrl` link in the Specifications card (`CMDBDetail.tsx:123`) uses `href="#"` regardless of what the repoUrl value actually is — clicking jumps to the top of the page.

The "Linked Problems" and "Linked KB" cards on the Linked Items tab (`CMDBDetail.tsx:262-275`) are hardcoded "No linked problems" / "No linked KB articles" with no actual data lookup, while Linked Incidents and Linked Changes on the same tab do query real data. Inconsistent: an engineer will assume the empty states are authoritative when no lookup was even attempted.

The Linked Items tab uses two raw hex colours for priority text (`#B42318` for P1, `#DC6803` for P2 at `CMDBDetail.tsx:251`) instead of the OIS severity tokens. This is the same pattern flagged in earlier audits.

The Monitoring tab renders a DataTable with `r: any` typing (`CMDBDetail.tsx:316`); the "Last Triggered" column displays the raw ISO timestamp `r.lastTriggeredAt` without `formatDistanceToNow` (`CMDBDetail.tsx:328`), so engineers see "2026-05-09T14:22:00Z" instead of "2 days ago" — inconsistent with how the same field is rendered on the MonitoringRules page.

**Priority fixes:**
- P1: Replace the hardcoded "Operational" badge in the header with a value derived from `ci.health` so it matches the actual CI status (`CMDBDetail.tsx:95`)
- P1: Replace the hardcoded Health Snapshot sparkline and "99.98% Composite Uptime" with either real metric data or a "No health data" empty state — fabricated uptime numbers are trust-destroying (`CMDBDetail.tsx:140-151`)
- P1: Wire the Linked Problems and Linked KB cards to real lookups (mirroring the Linked Incidents/Changes pattern) or hide them until implemented (`CMDBDetail.tsx:262-275`)
- P2: Render `repoUrl` as an actual external link using the attribute value, not `href="#"` (`CMDBDetail.tsx:123`)
- P2: Format `lastTriggeredAt` in the Monitoring tab with `formatDistanceToNow` to match the MonitoringRules page (`CMDBDetail.tsx:328`)
- P2: Replace inline hex priority colours (`#B42318`, `#DC6803`) on the Linked Incidents rows with OIS severity tokens (`CMDBDetail.tsx:251`)
- P3: Wire the Edit, MoreHorizontal, and "View All" activity buttons or remove them (`CMDBDetail.tsx:67-72`, `CMDBDetail.tsx:134`)
- P3: Improve the Tier derivation — map criticality to tier with more than two outcomes (`CMDBDetail.tsx:90`)

---

### CMDB Graph (`/cmdb/graph`)

**Journey context:** During an incident, the engineer opens this to visualise blast radius: "if this database goes down, what calls it?" The `?focus=ciId` query parameter is used to enter the graph already centred on a specific node from CMDBDetail's "Open in Graph View" button.

The graph view has the right structural choice: a left filter panel for CI types and relationship types, a centre canvas with the force-directed graph, and a right side panel for the selected node. The filter panel multi-toggle UX (selecting which CI types and which relationship types to render) is well-suited to scoping blast radius. The deep-link via `?focus=` correctly initialises `selectedNode`.

The biggest gaps are in the canvas-level controls. The zoom in / zoom out / fit-to-screen buttons at `CMDBGraph.tsx:88-91` are all `<Button variant="ghost">` elements with icons and no `onClick` — they are decorative. The "Selection Mode" pill at `CMDBGraph.tsx:93-95` is also inert. The search input at `CMDBGraph.tsx:57-60` has no value binding, no `onChange`, and no wiring to the graph — typing in it does literally nothing. The "Export" primary button in the header (`CMDBGraph.tsx:64-66`) has no handler.

The "List View" button at `CMDBGraph.tsx:61-63` correctly navigates back to `/cmdb`, but there is no explicit "Back to CI detail" affordance for the common flow of entering the graph from a specific CI via `?focus=`. Once the engineer is done exploring, they have to click List View → search for the CI → open it again.

Information hierarchy is good but the page has no empty state — if all CI types or relationship types are deselected, `filteredNodes` and `filteredLinks` go to zero and the canvas renders blank with no message explaining why.

**Priority fixes:**
- P1: Wire the search input — it has no value, no `onChange`, and no graph-search behaviour (`CMDBGraph.tsx:57-60`)
- P1: Wire the zoom in / zoom out / fit-to-screen / Selection Mode buttons or remove them — they invite interaction but do nothing (`CMDBGraph.tsx:86-96`)
- P2: Wire or remove the "Export" primary button (`CMDBGraph.tsx:64-66`)
- P2: Add a "Back to CI detail" link when the page was entered with `?focus=` — currently the only return path is List View
- P3: Show an empty-state overlay when filters reduce the graph to zero nodes — "No nodes match the selected types/relationships"

---

### CMDB Audit (`/cmdb/audit`)

**Journey context:** Post-incident review — engineer needs to see who touched a CI in the last 24 hours, whether the change came from a deployment, manual edit, or discovery, and which fields were modified.

The audit page is the simplest in the CMDB section and follows the right pattern: a search box, two filter chip rows (Action, Source), and a centred timeline rendering. The chip filters are correctly wired to state, and the empty state is friendly. The search covers CI name, ID, actor, and field, which is the right vocabulary for an investigation.

The two larger filter buttons in the toolbar — "Last 7 Days" date range (`CMDBAudit.tsx:64-66`) and "More Filters" (`CMDBAudit.tsx:67-69`) — are inert. The date range button is particularly problematic because audit log investigation is almost always time-bounded ("what changed between 14:00 and 15:00 yesterday?"). Without a working date range, the page is only useful for browsing the last N entries that happen to be in the mock data.

The "Export CSV" primary button (`CMDBAudit.tsx:47-49`) has no handler.

The page imports a local `cn` shim at `CMDBAudit.tsx:121` (`const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');`) instead of importing the shared `cn` from `src/lib/utils.ts` like every other route. Small, but it diverges from the codebase pattern and won't get the `tailwind-merge` behaviour the real `cn` provides.

The header subtitle says "Tracking {count} changes across the infrastructure" using the unfiltered count even when filters are active — engineers reading the page header during a filtered investigation could miscount.

**Priority fixes:**
- P1: Wire the "Last 7 Days" date-range button to a real date picker — audit investigation without time bounds is severely limited (`CMDBAudit.tsx:64-66`)
- P1: Wire the "Export CSV" button — exporting audit evidence is a routine compliance task (`CMDBAudit.tsx:47-49`)
- P2: Wire or remove the "More Filters" button (`CMDBAudit.tsx:67-69`)
- P2: Replace the local `cn` shim with the shared `cn` from `src/lib/utils.ts` for consistency with the rest of the codebase (`CMDBAudit.tsx:121`)
- P3: Update the header subtitle to reflect the filtered count when filters are active (`CMDBAudit.tsx:39-41`)

---

### Monitoring Rules (`/monitoring/rules`)

**Journey context:** Engineer comes here after an incident to find the rule that fired (or the rule that should have fired but didn't), check its signal/noise ratio, and tune the threshold or routing. Also the destination for adding new rules when coverage gaps surface.

This is one of the most feature-rich pages in the section and largely well-executed. The table contains the right columns for ops triage: status toggle, public ID, name, type, severity, target count, last fired, 30-day fires with a sparkline, signal-to-noise percentage colour-coded by health, the alert route, and per-row Settings/Test action buttons. The wizard (Define / Conditions / Routing) is a sensible three-step flow with a stepper component, and the edit-vs-create path correctly seeds form data from the selected rule. The test modal with a channel preview and dry-run framing is genuinely thoughtful.

There are several issues that erode trust on a page where engineers expect precision. The "Filter" and "Bulk actions" buttons in the page header (`MonitoringRules.tsx:396-401`) have no handlers — they sit beside the working "New rule" button and look equally functional. The "Avg fires (30d): 38", "Noisy: 1", and "Never fired: 2" indicators in the stats strip (`MonitoringRules.tsx:499-505`) are hardcoded numbers that do not derive from the data. The sparkline series in the Fires column is generated via `Math.random()` (`MonitoringRules.tsx:68`, used at `MonitoringRules.tsx:320`) — every render shows a different random 30-day pattern. For a page whose primary purpose is to surface trends, randomly regenerating trend lines on each render is misleading.

The delete flow uses `window.confirm('Are you sure you want to delete this monitoring rule?')` at `MonitoringRules.tsx:234`. Same pattern flagged across other modules — native confirm dialogs break the visual language and can't carry the context an engineer needs (which rule, how many alerts depend on it, etc.).

The "Route" column renders a button (`MonitoringRules.tsx:339-341`) showing the route's public ID but has no `onClick` — engineers expect it to navigate to `/monitoring/routing?focus=...`.

In the test modal, the channel preview block (`MonitoringRules.tsx:653-674`) is fully hardcoded: SMS recipient "David Okafor (+1-***-1234)", Slack channel "#payment-alerts", email "platform-oncall@acme.io" — regardless of which rule is being tested. An engineer testing a database rule will see the channel preview for the payment service, which is actively wrong.

The wizard's "Save as draft" button on step 3 (`MonitoringRules.tsx:608-614`) calls `handleCreateOrUpdateRule` — the same function as the "Create rule" button. Drafting is therefore not distinct from creating, repeating the RCA Workspace problem from the Operations audit.

The "+ Add severity" / "+ Add source" buttons in the routing wizard are deferred to a child component — worth checking that they're wired (they aren't in `AlertRouting.tsx`, see next section).

**Priority fixes:**
- P1: Replace `window.confirm(...)` in the delete flow with a Modal that names the rule and shows how many rules/CIs it affects (`MonitoringRules.tsx:234`)
- P1: Stop generating random sparkline data on every render — either source from `rule.firesHistory` (or similar) or omit the sparkline until real data exists (`MonitoringRules.tsx:68`, `MonitoringRules.tsx:320`)
- P1: Wire the "Route" column button to navigate to `/monitoring/routing?focus=...` (`MonitoringRules.tsx:339-341`)
- P1: Make the test-modal channel preview reflect the selected rule's alert route — currently it hardcodes a single payment-service config regardless of which rule is being tested (`MonitoringRules.tsx:653-674`)
- P2: Wire or remove the page-header "Filter" and "Bulk actions" buttons — they sit beside the working "New rule" button and look identical (`MonitoringRules.tsx:396-401`)
- P2: Derive the "Avg fires", "Noisy", "Never fired" indicators from the rule set instead of hardcoded numbers (`MonitoringRules.tsx:499-505`)
- P2: Differentiate "Save as draft" from "Create rule" — currently both call the same function with the same effect (`MonitoringRules.tsx:608-614`, `MonitoringRules.tsx:625-631`)
- P3: Show the actual cooldown value somewhere on the row — engineers tuning noise often want to see and adjust cooldown without opening the wizard

---

### Alert Routing (`/monitoring/routing`)

**Journey context:** After a missed page or a noisy alert, the engineer comes here to inspect a route's match conditions, channels, escalation policy, and quiet hours — and to confirm exactly who would get paged for a given event.

The two-column layout (route list left, editor right) is the correct pattern for a CRUD page with a moderate number of items. Each route card on the left includes status dot, public ID, name, channel icons, rule count, and last-triggered timestamp — a high-density summary that supports quick scanning. The editor pattern using an `editBuffer` with an `isDirty` check and a disabled "Save changes" button until changes are made is the right approach. The collapsible sections (Match conditions / Channels / Escalation policy / Quiet hours) keep the editor approachable.

There are real bugs, however. The state setter at `AlertRouting.tsx:35` is named `setRules` despite operating on `routes` (`const [routes, setRules] = useState<AlertRoute[]>(...)`). This is a code-smell that survived review; it works but a reader will be confused, and any future change will need to remember the misnomer.

The "8 channels configured" count in the page header (`AlertRouting.tsx:138`) is hardcoded and not derived from the data. So is the entire test modal's "Last test" timestamp, which uses the route's `updatedAt` as a proxy (`AlertRouting.tsx:577`).

Several interactive elements have no handler. The Channel "Edit" link inside each enabled channel card (`AlertRouting.tsx:393`) is a `<button>` with no `onClick` — an engineer who needs to change the Slack channel from `#payment-alerts` to `#platform-alerts` clicks Edit and gets nothing. The X buttons on Source pills (`AlertRouting.tsx:309`) and Tag pills (`AlertRouting.tsx:321`) have no handlers — pills cannot be removed. The "+ Add severity", "+ Add source", "+ Add tag" buttons (`AlertRouting.tsx:300`, `:312`, `:324`) are all inert. The "Edit step" and the delete (Trash2) buttons on each escalation step (`AlertRouting.tsx:434-435`) are inert. The "+ Add escalation step" button (`AlertRouting.tsx:466-468`) is inert. The "New route" button in the page header (`AlertRouting.tsx:141-143`) has no handler. The `MoreVertical` overflow button (`AlertRouting.tsx:257-259`) has no menu.

The test modal is opened via `isTestModalOpen` but no button anywhere in the editor sets that state — the modal exists but cannot be opened. Worse, when it does open it has no "test" button to actually run the dry-run (the modal's body is mostly the info banner; the "Run dry-run" button at `AlertRouting.tsx:582-584` has no handler either).

The Quiet hours section has two raw select dropdowns for the time window (`AlertRouting.tsx:522-528`) that each contain a single option (`<option>22:00</option>`, `<option>06:00</option>`) — they appear configurable but cannot actually be changed. The day-of-week toggle buttons (`AlertRouting.tsx:534-543`) have no `onClick` — engineers can't actually toggle which days quiet hours apply to.

Several inline raw colour classes appear: `bg-blue-50 text-blue-700 border-blue-100` (`AlertRouting.tsx:308`), `bg-slate-50 text-slate-700` (`AlertRouting.tsx:320`) — not OIS tokens.

**Priority fixes:**
- P1: Wire the X buttons on Source pills, Tag pills, and Severity chips to actually remove the item from `editBuffer.matchExpression` (`AlertRouting.tsx:297`, `:309`, `:321`)
- P1: Wire the "+ Add severity", "+ Add source", "+ Add tag" buttons — they are core to defining a route (`AlertRouting.tsx:300`, `:312`, `:324`)
- P1: Wire the per-channel "Edit" link or remove it — engineers cannot currently configure channel targets (`AlertRouting.tsx:393`)
- P1: Wire "Edit step", the delete (Trash2), and "+ Add escalation step" buttons — escalation is the most important part of a route and is currently read-only (`AlertRouting.tsx:434-435`, `:466-468`)
- P1: Add a button somewhere in the editor that opens the test modal — the modal exists but has no entry point (`AlertRouting.tsx:561` opens via `isTestModalOpen`, but no setter is invoked)
- P1: Wire the "Run dry-run" button in the test modal to actually run something or show feedback (`AlertRouting.tsx:582-584`)
- P1: Wire the "New route" button (`AlertRouting.tsx:141-143`)
- P2: Make the Quiet hours time window dropdowns and day-of-week toggles actually editable — currently they appear configurable but are static (`AlertRouting.tsx:522-543`)
- P2: Replace the hardcoded "8 channels configured" header stat with a derived count (`AlertRouting.tsx:138`)
- P2: Rename `setRules` to `setRoutes` for clarity (`AlertRouting.tsx:35`)
- P3: Replace inline `bg-blue-*` / `bg-slate-*` token usage on Source and Tag pills with OIS tokens (`AlertRouting.tsx:308`, `:320`)

---

### Monitoring Coverage (`/monitoring/coverage`)

**Journey context:** Strategic page used outside an incident — engineer reviews which critical CIs have no monitoring rules attached, picks suggested templates, and bulk-creates rules to close gaps. Also opened post-incident to answer "could we have caught this earlier?"

The actual page bound to `/monitoring/coverage` is `CoverageReport.tsx` (not `MonitoringCoverage.tsx` — see the section pattern note below). It is one of the best-conceived pages in the section: a red "critical gaps detected" hero card at the top names the specific CIs flying blind, each card offers a "Suggest a rule" expansion with multiple template options, and the right sidebar shows coverage by criticality, by type, and a small insights list. The "Bulk create rules from suggestions" CTA at the bottom of the hero is exactly the workflow shortcut an engineer wants.

The most serious credibility issue is that the gaps are fabricated. `CoverageReport.tsx:51-59` hardcodes a `forceGapIds` array (`['ci-stg-pay-001', 'ci-db-pay-002', 'ci-app-pay-002', 'ci-app-ord-002', 'ci-srv-ord-002']`) and forcibly strips those CIs of their linked rules and overrides their criticality to `'critical'` so the hero section always shows "5 critical gaps". The comment in the source acknowledges this is for demo purposes. In production this page would mislead an engineer into believing critical CIs are uncovered when the data is being manipulated. The "Bulk create rules" button (`CoverageReport.tsx:223-225`) has no handler — clicking the most prominent CTA on the page does nothing.

The sidebar metrics are also fabricated. The "Coverage by criticality" bars (`CoverageReport.tsx:364-368`) use hardcoded `{ label: 'Critical', val: 7, total: 8, ... }` style entries — none are derived from `coverageData`. Similarly the "Coverage by type" rows (`CoverageReport.tsx:396-404`) are hardcoded literals that don't match the type counts the page actually has. The "Did you know?" promo card (`CoverageReport.tsx:441-451`) references a specific "Payment Receipts" bucket and a May 2 incident — neither of which is in the mock data.

The Insights section (`CoverageReport.tsx:425-436`) hardcodes "5 critical CIs have no rules" (will be wrong any time `criticalGaps.length !== 5`), "1 rule is noisy" with a clickable `RULE-NET-002` that has no handler, and "2 rules never fired in 30d" — none derived from data.

Suggested template names include a typo: "Query Lantency" (`CoverageReport.tsx:65`) should be "Query Latency". Small but visible on a card that surfaces during incident triage.

Several controls are inert: the per-row "Add" rule button (`CoverageReport.tsx:319-322`), the arrow button next to each rule in the expanded view (`CoverageReport.tsx:337-339`), "Re-analyze" (`CoverageReport.tsx:152-154`), "Export Report" (`CoverageReport.tsx:155-157`), the "Create rule" buttons inside the expanded template list (`CoverageReport.tsx:212`), the "Enable Proactive Scan" CTA (`CoverageReport.tsx:448-450`), and the `RULE-NET-002` reference in the Insights list.

The filter row contains state setters (`setTypeFilter`, `setCriticalityFilter`, `setStatusFilter`) but no UI controls actually call them — only `searchQuery` and `groupBy` are bound to inputs. Type/criticality/status filters exist in code but cannot be set by the user.

Note that `MonitoringCoverage.tsx` (singular, in the same folder) exists and is exported but never imported anywhere — it is dead code that is almost identical in purpose to `CoverageReport.tsx` and is at risk of being mistaken for the live page. The `Plus` icon at the bottom of that file (`MonitoringCoverage.tsx:223-225`) is even redeclared locally instead of imported from `lucide-react`, suggesting it was a draft.

**Priority fixes:**
- P1: Remove the `forceGapIds` fabrication and derive critical gaps purely from the data — the page is fundamentally misleading until this is real (`CoverageReport.tsx:51-59`)
- P1: Replace the hardcoded sidebar "Coverage by criticality" and "Coverage by type" rows with derived counts — they currently contradict the main table (`CoverageReport.tsx:364-368`, `:396-404`)
- P1: Wire the "Bulk create rules from suggestions" CTA — the page's primary call-to-action is inert (`CoverageReport.tsx:223-225`)
- P1: Wire the per-row "Add" button to navigate to the rule wizard pre-filled with that CI (`CoverageReport.tsx:319-322`)
- P1: Wire the per-template "Create rule" buttons inside the expanded suggestion list (`CoverageReport.tsx:212`)
- P2: Delete or merge the unused `MonitoringCoverage.tsx` file — it is dead code that duplicates this page's purpose
- P2: Either remove the unused `typeFilter` / `criticalityFilter` / `statusFilter` filter state, or render UI controls for them — the state exists but nothing sets it (`CoverageReport.tsx:33-35`)
- P2: Replace the fabricated Insights bullets with derived values, or hide them until real ("Did you know?" card too) (`CoverageReport.tsx:425-451`)
- P3: Fix the "Query Lantency" typo in the database template list (`CoverageReport.tsx:65`)
- P3: Wire "Re-analyze" and "Export Report" or remove them (`CoverageReport.tsx:152-157`)

---

## Section Patterns

These issues appear across three or more pages in the CMDB & Monitoring section and indicate systemic gaps rather than page-level problems:

**1. Fabricated authoritative-looking metrics.** Hardcoded numbers presented as live data appear on every page in this section: CMDBList "Last discovery: 12m ago"; CMDBDetail "Operational" badge and "99.98% Composite Uptime"; MonitoringRules "Avg fires (30d): 38, Noisy: 1, Never fired: 2" plus random per-render sparklines; AlertRouting "8 channels configured"; CoverageReport's entire sidebar and Insights list. For pages an engineer references during incident triage, hardcoded metrics are worse than no metrics at all — the engineer makes decisions on numbers that don't reflect reality. Every header stat should derive from the data or be removed.

**2. Inert primary and secondary actions.** Buttons that visually imply action but do nothing are pervasive: "Add CI", "Import", "Status filter" (CMDBList); "Edit", "MoreHorizontal", "View All" (CMDBDetail); zoom/fit/Selection/search/Export (CMDBGraph); "Last 7 Days", "More Filters", "Export CSV" (CMDBAudit); "Filter", "Bulk actions", and the Route column (MonitoringRules); virtually every edit affordance in AlertRouting plus the missing test-modal entry point; "Re-analyze", "Export Report", "Add", "Bulk create rules" (CoverageReport). The Operations audit flagged the same pattern. Every interactive element should be functional or visually disabled with a tooltip.

**3. Critical edit flows that are read-only in disguise.** AlertRouting is the worst offender: every match-condition pill, every escalation-step button, every quiet-hours toggle, every channel "Edit" link is inert despite the page presenting itself as a full editor with a working "Save changes" button. CoverageReport similarly defines filter state for type/criticality/status but renders no UI to set them. An engineer who tries to modify a route during incident response will silently fail.

**4. Native browser dialogs (`confirm()`).** MonitoringRules uses `window.confirm` for rule deletion — same anti-pattern flagged in EventDetail, IncidentDetail, and elsewhere in the Operations audit. All destructive flows should use the app's Modal component.

**5. Dead code and route confusion.** `MonitoringCoverage.tsx` exists in the monitoring folder but is never imported anywhere; the actual `/monitoring/coverage` route uses `CoverageReport.tsx`. A future engineer editing what they think is the coverage page will see no effect. This file should be removed.

**6. Raw colour tokens and local utilities instead of design system primitives.** AlertRouting uses `bg-blue-50` / `bg-slate-50` for pills; CMDBDetail uses inline hex (`#B42318`, `#DC6803`) for priority colours; CMDBAudit redefines a local `cn` shim instead of importing from `src/lib/utils.ts`. Same theme as the Operations audit's KBAnalytics flag — small deviations from the design system make the product feel built by different teams.
