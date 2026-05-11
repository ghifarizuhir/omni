# UX Audit — Operations Section
**Date:** 2026-05-11
**Persona:** On-call ops engineer
**Iteration:** 1 (Management Mode, on-call lens)

---

## Journey

On-call engineer receives an alert → checks **Inbox** for urgency → opens **Event Stream** to find the firing event → **Event Detail** to understand scope → **Incident Queue** to escalate → **Incident Detail** to coordinate response → if P1, enters **Major Incident War Room** → after resolution, logs a **Problem** → closes via an existing **Knowledge Base** article or creates one.

---

## Page Findings

### Dashboard (`/`)

**Journey context:** The engineer's starting point at shift handover — must surface the most urgent item within 5 seconds and route to it.

The Dashboard does many things right. The major incident banner is prominent, red, and includes a direct "Open war room →" link that takes zero navigation steps. The KPI row gives instant situational awareness, and the active incident feed is sorted by severity with SLA breach flags visible inline. The service health strip provides a meaningful at-a-glance grid.

However, several interactive elements are visually present but functionally broken, which erodes trust quickly. The "Open Inbox" link in the Action Required card is a plain `<button>` with no `onClick` handler — clicking it does nothing. The "Last 24h" dropdown and the "Refresh" button are also inert UI. The on-call schedule link points to `/oncall` (no hyphen) but the actual route is `/on-call`, producing a 404. The date is hardcoded to `"Tuesday, May 8 2026, 08:42 UTC"` and the "Last data refresh: 2 min ago" label is static. None of these are cosmetic — on a shift handover, an engineer who clicks "Open Inbox" and nothing happens will immediately lose confidence in the interface.

Information hierarchy is mostly solid above the fold, but the Change Calendar and Improvement Pipeline cards compete for attention with the active incidents feed in the lower half of the page. For an on-call engineer, the Improvement Pipeline is irrelevant during an alert and pushes the on-call handover info (who's primary, next handover time) further down.

Navigation flow is good for the top half: the major incident banner, incident rows, and service health cells all navigate correctly. The bottom-half change calendar entries have no click target — they display conflict warnings but give no way to open the change.

Empty and error states are not present on this page (no scenario where everything is empty), but the broken buttons create a worse failure mode than a well-designed empty state: the page appears functional but isn't.

Cognitive load is manageable thanks to clear card headers and section separation, but the page attempts to do too much — it covers incidents, inbox, changes, on-call, and improvements all at once. For an engineer arriving mid-alert, the noise ratio is high.

**Priority fixes:**
- P1: Fix the "Open Inbox" button — replace `<button>` with `<Link to="/inbox">` so clicking it navigates correctly (`Dashboard.tsx:263`)
- P1: Fix the on-call schedule link — change `/oncall` to `/on-call` (`Dashboard.tsx:363`)
- P2: Make change calendar entries clickable — wrap each change row in a `<Link to={/changes/${change.publicId}}>` (`Dashboard.tsx:320-350`)
- P2: Wire the Refresh button to trigger a re-render/data reload or remove it — dead buttons are misleading (`Dashboard.tsx:94`)
- P3: Hide the "Last 24h" time filter and "Refresh" buttons until they are functional
- P3: Consider moving the Improvement Pipeline card out of the default dashboard for an ops engineer view

---

### Inbox (`/inbox`)

**Journey context:** Engineer arrives here from the Dashboard to triage urgent items before opening the event stream; also the primary destination for any system-generated action items.

The Inbox is one of the most polished pages in the section. The two-panel layout (list + detail) is conventional and immediately understandable. Priority sorting (pinned → unread → urgent → newest) is sensible. The "Mark all read" and "Archive read" bulk actions in the toolbar reduce friction for clearing backlog. The four tabs (All / Unread / Requires action / Archived) map cleanly to the mental model of working through a queue. The empty states ("All caught up") are friendly and correct.

The primary action clarity issue is minor: the page auto-selects the first inbox item (`selectedId: 'ibx-001'` hardcoded as initial state) on load, which silently marks it as read. An engineer who opens the Inbox and hasn't looked at that item yet will lose its unread status without awareness. This is a real correctness problem, not just cosmetic.

Navigation flow is clean. The `sourceUrl` on inbox items links directly to the originating entity (incident, change, etc.), which is the right pattern. The detail panel renders the primary action button correctly.

Information hierarchy is good — the urgent/action/unread stat line is visible immediately, and the item list sorts urgency to the top with a left-border accent for urgent items. On mobile the two-panel layout collapses gracefully.

Cognitive load is low. The interface has clear scan order: tabs → stats → item list → detail.

**Priority fixes:**
- P1: Remove the hardcoded `selectedId: 'ibx-001'` initial state — start with `selectedId: ''` so no item is pre-selected or pre-marked-read (`Inbox.tsx:51`)
- P3: Add keyboard navigation between inbox items (up/down arrow keys) for power users

---

### Event Stream (`/events`)

**Journey context:** Engineer arrives here after the Inbox to find the specific event triggering the alert; needs to identify severity, affected CIs, and whether an incident already exists, then decide to escalate.

The Event Stream is feature-rich and mostly well-structured. The sticky date headers give temporal context in a chronological stream. The quick filter chips (Active P1/P2, Exceptions, Last 24h) are the right affordance for fast triage. The right-rail stats panel is genuinely useful for spotting noisy rules and top CIs. The empty state and pause/resume banner are well-executed.

The biggest cognitive load issue is filter state multiplicity. The page has a search box, four dropdown filters (Status, Severity, Source, Type), and five quick-filter chips — eleven independent filter controls that interact in non-obvious ways. When a quick filter chip is active AND a dropdown filter is also set, the combined state is visually unclear: the chip shows as highlighted but the dropdowns show their values independently, with no combined summary. An on-call engineer in a hurry who accidentally sets conflicting filters (e.g. quick filter "Active P1/P2" with Status dropdown set to "Resolved") gets an empty list with no explanation.

Primary action clarity has a meaningful gap: there is no "Create Incident" button on this page or on any event card in the list. To escalate an event to an incident, the engineer must open the event detail page first. Given that escalation is the most common next action from the event stream, this is a P1 friction point.

The "Pause" and "Last 7d" dropdown buttons are non-functional (the pause toggle updates UI state but the stream is mock data, and the time range button has no handler). Broken interactive elements on a monitoring page are especially harmful — an on-call engineer hitting "Pause" to freeze the stream during a busy moment and having nothing happen will be confused.

The quick filter chip counts are hardcoded (`count: 5, 10, 25` etc.) and do not update when other filters change, making them misleading when combined with dropdown filters.

Information hierarchy is good for individual event cards — severity, title, source, and time are all visible at a glance. The stats rail is hidden on mobile, accessible via a drawer.

**Priority fixes:**
- P1: Add a "Create incident" quick action button directly on each event card for open/acknowledged events — this is the most common escalation path from the stream
- P1: Make the "Pause" and "Last 7d" buttons either functional or visually disabled — dead interactive controls on a monitoring page undermine trust
- P2: When any quick filter chip is active, disable or grey out conflicting dropdown filters (or show a combined filter summary) to prevent silent empty-list confusion
- P2: Derive quick filter chip counts from the current filtered event set, not hardcoded values
- P3: Add a "Reset all filters" one-tap shortcut that is always visible when any filter is active (the current Reset button is inside the dropdown row and easy to miss)

---

### Event Detail (`/events/:id`)

**Journey context:** Engineer opens a specific event to understand root cause, confirm affected CIs, and decide whether to acknowledge, create an incident, or resolve.

The Event Detail page has good structural bones: severity color bar at the top, action buttons (Acknowledge / Resolve) in the top-right, affected CIs, linked incident, related events, and timeline all in a logical two-column layout. The linked incident section shows a prominent "Open incident" button when a link exists, or a "Create Incident from alert" CTA when it doesn't — this is the right pattern.

The primary action clarity issue is ordering. The Raw Event Payload card is open by default (`showRawPayload: true`), which pushes the more operationally important sections (Linked Incident, Related Events) out of the initial viewport on most screen heights. An engineer trying to understand scope will see JSON before they see what's linked. Closing the payload by default would surface the critical context faster.

The resolve flow uses a `confirm()` browser dialog when the event is linked to an incident: "This event is linked to [ID]. Resolve only this event, or also resolve the incident?" A browser native dialog is jarring and only offers OK/Cancel — it cannot express the two distinct options described in the message. The user ends up clicking OK and the event resolves but the dialog copy is misleading.

Navigation flow is strong — "Back to events" link, "Open rule" link, "Explore in CMDB" button, and "Open incident" button are all correctly wired.

The Tags & Metadata card at the bottom is low priority for an on-call engineer but occupies real estate. The "+ Add tag" button is present but doesn't open any input.

**Priority fixes:**
- P1: Default `showRawPayload` to `false` — let engineers expand it if they need it, but don't have it push critical context below fold (`EventDetail.tsx:32`)
- P1: Replace the `confirm()` dialog with a proper Modal that offers two distinct actions: "Resolve event only" and "Resolve event + incident" (`EventDetail.tsx:117`)
- P2: Fix the "+ Add tag" button to open an inline tag input or modal
- P3: Move the Tags & Metadata card below Related Events (lower priority at a glance)

---

### Incident Queue (`/incidents`)

**Journey context:** Engineer arrives here after identifying the triggering event; needs to find an existing incident to join or create a new one.

The Incident Queue is tightly designed for ops work. The major incident banner at the top immediately surfaces the most critical active situation. The table layout provides dense information: priority badge, ID, title, status, assignee, service, age, SLA indicator, and tags all in one scannable row. Quick filters (My open, SLA at risk, P1/P2, Last 24h, Customer-facing) are exactly the right vocabulary for triage. Bulk selection with contextual actions (Assign, Change priority, Tag, Close, Export) supports queue management at scale. The "New incident" button is prominent and correctly positioned.

The main friction is cosmetic but impactful: the quick filter chips use emoji labels (🔥, ⚠, 💥, 📡) in an otherwise icon-driven, professional UI. This is inconsistent with the design language and can render poorly on some operating systems. The Lucide icon set already has appropriate equivalents.

The table has a `min-w-[900px]` constraint that forces horizontal scrolling on medium-width viewports — typical for ops engineers using split-screen setups. The Tags column is the least valuable column for triage and could be the first to hide on narrower screens.

The "Analytics" link in the top-right uses low-contrast styling (`text-ois-text-subtle`) compared to the "New incident" primary button. Both are important secondary actions but the analytics entry point is visually deprioritised.

There is no "My problems" equivalent here — no quick filter for incidents where the current user is the incident commander (distinct from assignee).

**Priority fixes:**
- P2: Replace emoji in quick filter chip labels with Lucide icon equivalents to match UI design language (`IncidentQueue.tsx:268-293`)
- P2: Make the Tags column conditionally hidden at medium viewport widths to avoid the horizontal scroll forcing the more important SLA column offscreen
- P3: Add a "Commander" quick filter chip alongside "My open" for incidents where the user is the incident commander
- P3: Increase the visual weight of the "Analytics" link to match other secondary actions

---

### Incident Detail (`/incidents/:incidentId`)

**Journey context:** Engineer opens a specific incident to take over, update status, coordinate response, link affected CIs, and drive to resolution.

The Incident Detail is the most sophisticated page in the Operations section. The sticky three-column layout (metadata sidebar / tabs / quick actions) is well-chosen for a page that must simultaneously show context, support communication, and enable actions. The SLA timer in the left sidebar is one of the most valuable elements on the page — live countdown, colour-coded by breach status. The status dropdown with smooth transition between states is clean. The tabbed interface (Overview / Timeline / Comments / Affected CIs / Linked Items / Resolution) organises a large amount of information without overwhelming the initial view. The BIA context in the right sidebar — showing hourly cost of downtime — is an excellent addition.

There are two duplicate surfaces for the same actions that create confusion. The Overview tab contains a "Quick actions" card with four buttons (Link to problem, Create problem, Link change, Suggest KB article), and the right sidebar has a separate "Quick actions" card with a different but overlapping set of actions (Assign to me, Acknowledge, Resolve, Promote to Major, Add comment, Link CI, Link problem). Having two "Quick actions" sections visible simultaneously — one in the main content area, one in the sidebar — means an engineer must look in two places and learn which one does what. They should be consolidated.

The "AI suggestions" placeholder in the right sidebar reads "AI-powered suggestions deferred to v2." This looks like an unfinished feature label left visible to the user. It should be hidden entirely until the feature is ready.

The Resolution tab is greyed out and disabled while the incident is open. During active response, an engineer often knows the likely resolution and root cause early — the ability to draft resolution notes before resolving is a legitimate workflow. Disabling the tab entirely forces them to use comments as a workaround.

The `confirm()` native browser dialog appears again in the resolve flow for incidents with a linked incident — same issue as in Event Detail.

**Priority fixes:**
- P1: Consolidate the two "Quick actions" sections — remove the one inside the Overview tab content, keep and expand the right sidebar version with all actions (`IncidentDetail.tsx:306-324` and `IncidentDetail.tsx:787-813`)
- P1: Hide the "AI suggestions" placeholder card until the feature ships (`IncidentDetail.tsx:816-818`)
- P2: Enable the Resolution tab while the incident is open but label it "Draft resolution" — allow pre-filling before marking resolved
- P3: The `<Link to="#incidents">` in ProblemDetail sidebar navigates to a hash anchor that doesn't scroll to anything — fix or remove (`ProblemDetail.tsx:539`)

---

### Major Incident War Room (`/incidents/major/:incidentId`)

**Journey context:** Engineer enters here when the incident is P1/Major to coordinate a multi-person response with live comms, activity stream, and clear stand-down/resolve controls.

The War Room is the right design decision: a full-screen overlay that takes over the entire viewport and removes all sidebar navigation noise during a crisis. The three-column layout (activity stream / comms log + composer / status + roles + actions) maps well to how a bridge call works: someone watching the activity feed, someone broadcasting status, someone managing the roles. The stand-down and resolve CTAs are duplicated in both the right column and the sticky bottom bar, ensuring they're always reachable regardless of scroll position.

The primary clarity issue is in the affected services column. The right panel shows raw CI public IDs (`CI-SRV-001`, `CI-DB-002`) from `incident.affectedCIPublicIds` instead of human-readable service names. During a major incident, engineers need to know "Payment Service is down" not "CI-SRV-001 is impacted." The data to do this is available via `mockCIs`.

The bottom action bar contains the text "Resolve SLA: see hero" which is opaque — engineers should see the actual remaining SLA countdown here, not a redirect instruction.

The mobile fallback ("Desktop recommended") renders the notice correctly but the `useEffect` runs after the first render, meaning mobile users briefly see the full war room before being redirected to the notice. The mobile detection should ideally be synchronous.

Navigation back to the standard incident view is available only via the stand-down flow (navigates to the incident detail after stand-down). There is no persistent "Back to incident detail" link for engineers who want to check the detail view without standing down — they must use the browser back button.

**Priority fixes:**
- P1: Replace raw CI public IDs in the affected services list with human-readable names resolved from `mockCIs` (`MajorIncidentWarRoom.tsx:217-222`)
- P2: Replace "Resolve SLA: see hero" in the bottom bar with the actual SLA countdown timer copied from the hero (`MajorIncidentWarRoom.tsx:281`)
- P2: Add a "View incident detail" link in the right column that opens the standard incident view in the same tab (not stand-down) for engineers who need to reference the detail view during the bridge
- P3: Move mobile detection to synchronous state initialization to avoid the flash of the war room layout on mobile

---

### Incident Analytics (`/incidents/analytics`)

**Journey context:** Post-resolution or shift-end review — engineer checks if MTTR improved, which CIs are recurring offenders, and whether problems have been raised against them.

Incident Analytics is clean and purposeful. The four KPIs (Total, MTTR, SLA compliance, Major incidents), volume-over-time chart, MTTR-by-service chart, top categories panel, recurring CIs table, and SLA performance breakdown all tell a coherent story without redundancy. The date range picker (7d / 30d / 90d) covers the most useful review windows. The "linked to active problems" warning in the recurring CIs table is a standout feature — it creates a direct bridge between pattern observation and problem management.

The main navigation flow gap: the analytics page is reachable from IncidentQueue via a secondary button, but there is no sidebar link to it under the Incidents section. Engineers who close the browser tab and return to the sidebar must navigate to the queue first, then find the Analytics button. Adding the analytics page as a sub-route link (or making it available via the sidebar under Incidents) would improve discoverability.

The recurring CIs table has a "View" link that goes to `/cmdb/:publicId` but there is no "Create problem" shortcut for CIs that don't already have a linked problem. An engineer reviewing the recurring offenders table often wants to raise a problem record immediately — the current flow requires navigating to Problems → New Problem → manually linking the CI.

The back breadcrumb links correctly to `/incidents`.

**Priority fixes:**
- P2: Add a "Raise problem" action button in the recurring CIs table rows where no active problem is linked — this is the most natural next action from the analytics view
- P3: Add Incident Analytics to the sidebar navigation under Incidents, or at minimum make it reachable via a persistent sub-tab within the Incidents section

---

### Problem List (`/problems`)

**Journey context:** After resolving an incident, engineer checks whether a problem record already exists for the root cause; if not, creates one.

The Problem List is clean and well-organised. The status filter chips (Identified / Investigating / Known Error / Fix in progress / Closed) act as both navigation and quick-filter, which is efficient. The sortable table (by severity, incident count, last incident date) gives engineers the ability to surface the most active problems immediately. The KEDB shortcut button in the header provides a direct path to workarounds. Linked item icons (RCA, KB, Change) in the row give at-a-glance progress indicators without expanding each row.

The main cognitive load issue is duplication of filter mechanisms. Status can be filtered via the chip strip at the top (styled as navigation tabs) AND via a select dropdown further down the page. When both are active, their interaction is not visually apparent. Engineers who click a status chip and then also see the status dropdown may not realise they're using the same filter through two different controls.

There is no "My problems" quick filter. An on-call engineer who owns problem records cannot quickly narrow to their own workload without manually selecting their name in the Owner dropdown.

The "New problem" primary button creates a problem but clicking it does nothing in the current implementation — there is no new problem form or modal wired to it.

**Priority fixes:**
- P1: Wire the "New problem" button to open a create-problem modal or navigate to a new problem form — currently it is inert (`ProblemList.tsx:145`)
- P2: Remove the status dropdown from the filter bar and rely solely on the chip strip — having two controls for the same filter is confusing (`ProblemList.tsx:212-235`)
- P2: Add a "My problems" quick filter chip that filters to `ownerId === currentUser.id`
- P3: Add a count badge to the KEDB button showing the number of known errors currently in the database

---

### Problem Detail (`/problems/:problemId`)

**Journey context:** Engineer opens a specific problem to check investigation status, RCA progress, and whether a fix is in flight.

The Problem Detail shares the same three-column structural pattern as Incident Detail and benefits from the same strengths: a sticky context sidebar, a tabbed main area, and a compact quick actions panel. The six tabs (Overview / Related Incidents / RCA / Known Error / Fix Plan / History) represent a complete lifecycle view of a problem from identification to closure. The Known Error promotion flow is well-executed — the modal asks for root cause, workaround, and workaround effectiveness, which is exactly what L1/L2 agents need.

The main issue is the "Close problem" button in the quick actions panel. It calls `handleStatusChange('closed')` immediately on click with no confirmation dialog. Closing a problem is a significant workflow state change (it removes it from active investigation queues) and should require at least a single confirmation step. An accidental click causes data loss that is not immediately recoverable from the current UI.

The `<Link to="#incidents">` in the left sidebar "Related" section uses a hash anchor that does not actually scroll the Tabs component to the Related Incidents tab — it just appends `#incidents` to the URL without effect. Engineers who click "See tab →" get no response.

The Pattern Summary Card in the Overview tab is only rendered when `firstIncidentDate` or `lastIncidentDate` is present. For newer problems with no incident history, the Overview tab shows only Description and Affected Services — this is sparse but acceptable.

The "Fix Plan" tab contains Linked Changes, Linked KB Articles, and Linked Improvements. This is conceptually the right grouping, but an engineer arriving here for the first time has to discover that linked items live in two places: the left sidebar (shows "Permanent fix" for linked changes) and the Fix Plan tab. The information is duplicated without differentiation.

**Priority fixes:**
- P1: Add a confirmation step before closing a problem — either a modal or an inline "Are you sure?" confirmation (`ProblemDetail.tsx:799`)
- P2: Fix the `<Link to="#incidents">` hash anchor — replace with a tab activation mechanism that programmatically switches to the Related Incidents tab (`ProblemDetail.tsx:539`)
- P2: Remove the "Permanent fix" section from the left sidebar since it duplicates the Fix Plan tab — keep one authoritative surface
- P3: Add a visual indicator (e.g. a progress ring) in the left sidebar showing how many recommended actions from the RCA are completed vs open

---

### RCA Workspace (`/problems/:problemId/rca`)

**Journey context:** Engineer opens this dedicated workspace to conduct a structured root cause analysis after a problem has been identified.

The RCA Workspace is purposefully minimal — a single-focus editor without the surrounding three-column complexity of the Problem Detail. The technique selector (Five Whys, Fishbone, Narrative, Fault Tree, Timeline) with a dropdown that shows technique descriptions is the right pattern for a tool where engineers may not know the terminology. Five Whys and Fishbone have functional editors; the ordered list of root causes, contributing factors, and recommended actions below the technique editor is well-structured.

The biggest issue is that "Save draft" and "Publish RCA" both call the same `handleSave()` function. Publishing an RCA is a meaningful workflow event — it makes the analysis visible on the Problem Detail page and potentially triggers downstream notifications. Currently neither button does anything distinct from the other. Engineers clicking "Publish RCA" have no feedback that the action was different from saving.

Fault Tree and Timeline techniques show a placeholder card that reads "editor — switch to Five Whys or Fishbone for a structured editor." This is confusing because the dropdown listed them as options. If they are not yet implemented, they should not appear in the technique selector, or the dropdown should visually indicate they are placeholders.

There is no autosave indicator. The last-saved timestamp is shown in the header but does not update unless the engineer explicitly saves. On a page where an engineer may work for 30-60 minutes, silent data loss on navigation is a real risk.

Back navigation links to `/problems/${problem.publicId}` which is correct, but the page also shows a Cancel link in the footer that goes to the same URL. Two identical navigation targets named differently ("Cancel" vs "Back to PRB-XXXX") are slightly confusing.

**Priority fixes:**
- P1: Differentiate "Publish RCA" from "Save draft" — publishing should update the problem's RCA visibility and show a success state; saving should autosave quietly (`RCAWorkspace.tsx:381-384, 465-472`)
- P1: Remove Fault Tree and Timeline from the technique selector until their editors are implemented, or clearly mark them as "coming soon" (`RCAWorkspace.tsx:405`)
- P2: Add an autosave mechanism with a visible "Saved X seconds ago" indicator that updates on changes
- P3: Consolidate "Cancel" and "Back to PRB-XXXX" into a single navigation link with a consistent label

---

### Known Error Database (`/kedb`)

**Journey context:** During an active incident, engineer searches for a known workaround before escalating; after a problem is resolved, a workaround may be documented here.

The KEDB has a clear primary use case and the design reflects it: a large, auto-focused search bar is the dominant element. Hot search chips ("pool", "connection", "timeout") give immediate starting points for the most common failure patterns. The KnownErrorCard component presents root cause, workaround, and affected services in a scannable format. The "Apply workaround to incident" flow inline on each card is a valuable shortcut.

The critical friction in the "Apply workaround to incident" flow is that it requires the engineer to manually type the incident ID. During an active P1 with multiple browser tabs open and a bridge call running, typing a long ID like "INC-2026-00184" accurately is a real burden. The flow should offer a recent incidents picker or allow the engineer to copy-paste the ID with validation before navigating.

The cards display in an unknown default order (the mock data is unordered and no sort is applied). For a knowledge base used under time pressure, entries should default to sort by most recent incident date or most viewed — the entries most likely to be relevant to the current situation should appear first.

The "Add known error" button in the header has no handler. Clicking it does nothing.

**Priority fixes:**
- P1: Replace the free-text incident ID input in "Apply workaround" with a recent incidents picker (last 10 open incidents sorted by created date) — reduce typing under pressure (`KEDB.tsx:231-254`)
- P1: Wire the "Add known error" button — it should navigate to the problem list or a create-known-error flow (`KEDB.tsx:66-69`)
- P2: Apply a default sort to the KEDB results — "most recent incident" descending, so the most actively recurring known errors appear first
- P3: Show a total hit count when search is active ("3 results for 'timeout'") to give engineers confidence they've seen all relevant entries

---

### Service Requests Queue (`/requests`)

**Journey context:** On an ops engineer's queue, service requests appear when someone requests access, hardware, or software that requires their team's approval; the engineer arrives here to approve or reject pending items.

The Request Queue is well-targeted at the ops engineer role. The "Awaiting my approval" quick filter chip is prominently positioned and colour-coded, making the engineer's primary job (clear the approval queue) immediately actionable. Rows with pending approvals are highlighted in a blue tint. The row-level actions dropdown (Approve, Reject, Assign) lets the engineer act without opening the detail view. SLA indicators in the last column surface breaches and warnings at a glance.

The table has the same `min-w-[900px]` horizontal scroll issue present in Incident Queue. On a split-screen setup, "Submitted", "SLA", and the actions column are often cut off. The "Current step" and "Assigned to" columns contain overlapping information (the assignee appears in both) — one of them could be removed to recover column width.

The "New request" button routes to `/portal/catalog`, which is correct for a requester but unexpected for an ops engineer managing a queue. The button label and destination are oriented to a different persona. For the ops queue view, this button could be relabelled "Browse catalog" or hidden entirely since ops engineers rarely initiate service requests from this queue view.

Empty state ("All clear. No active requests.") is appropriate.

**Priority fixes:**
- P2: Remove or merge the "Assigned to" column since it duplicates information in "Current step" — recover the column width for the SLA column (`RequestQueue.tsx:446`)
- P2: Relabel the "New request" button to "Browse catalog" or remove it from the ops queue context — it navigates away from the queue to the requester portal
- P3: Add column visibility toggles or responsive hiding for the table at medium viewport widths to reduce horizontal scroll

---

### Request Detail (`/requests/:requestId`)

**Journey context:** Engineer opens a request to review form responses, approve or reject the current step, and check the workflow progress.

The Request Detail is the most structurally complete page in the operations group. The visual workflow stepper at the top is an excellent UX decision — engineers see immediately where the request sits in its lifecycle without reading a status label. Inline approve/reject buttons on the active step node eliminate a navigation step. The SLA timer in the left sidebar with a progress bar gives live urgency context.

The primary clarity issue is triple-duplication of the approve/reject action. The workflow stepper has inline approve/reject buttons on the active step node; the right sidebar "Quick actions" card has separate Approve and Reject buttons; and the row-level actions dropdown in the queue view also has an Approve option. While redundancy is sometimes helpful, three separate surfaces for the same action on the same page add cognitive load — the engineer must choose which one to use, and all three open separate modal flows.

The three-column layout (`grid-cols-[260px_1fr_260px]`) with fixed 260px sidebars is cramped on viewports narrower than 1100px. At that width, the center tab content area gets squeezed to under 600px, and the multiple tabs plus content become difficult to read.

The Comments tab has a hardcoded placeholder comment ("Adding context: this is for investigating the reconciliation issue…") that is mock data appearing as real content. Engineers will find this confusing.

**Priority fixes:**
- P1: Remove the hardcoded placeholder comment from the Comments tab — it should show only real data or an empty state (`RequestDetail.tsx:498-508`)
- P2: Consolidate the approve/reject actions to one surface — the workflow stepper inline buttons are the most contextually clear; remove the duplicate Quick actions buttons in the right sidebar
- P3: Make the three-column layout responsive — collapse the right sidebar into an expandable panel on medium viewports

---

### Self-Service Portal (`/portal`)

**Journey context:** End of the journey for ops engineers — occasionally used to submit requests; more commonly, the starting point for colleagues who file requests that land in the ops queue.

The Portal Home is polished and consumer-app in feel, which is appropriate for its end-user audience. The hero search, popular catalog items, "Your active requests" section, and recommended articles create a complete self-service experience. The service desk contact information in the footer (phone + email) is an important safety net.

For an ops engineer specifically, the portal is lower-priority than the queue view — they will rarely land here during incident response. The main issue in the ops journey context is that the "Talk to Service Desk" card opens a modal that immediately tells the user the feature is "coming soon" — this is a dead end with no alternative action offered in the modal body (the phone/email alternatives are visible only if the user scrolls the modal). Engineers seeking live support click the most prominent chat CTA and hit a wall.

The recommended articles are hardcoded slugs rather than dynamically personalised, but the effect is acceptable for now with mock data.

**Priority fixes:**
- P2: In the ServiceDeskModal, make the phone and email options the primary visible content without requiring scroll — remove the "coming soon" messaging or replace it with a friendlier "Chat is coming — use these options for now" (`PortalHome.tsx:99-137`)
- P3: Add a persistent header badge showing the count of pending service requests in the ops queue — engineers who land on the portal by accident can quickly navigate back

---

### Knowledge Base Browse (`/kb`)

**Journey context:** Post-resolution, engineer searches for an existing runbook or postmortem to reference; or navigates here to create a new KB article documenting the incident.

KBBrowse provides a solid search-first experience. Content type badges (How-To, Runbook, Postmortem, etc.) with colour coding help engineers quickly identify the type of article before opening it. Sort options (Recent / Most viewed / Most helpful / Alphabetical) are all useful for different use cases. The category filter lets engineers narrow by domain (Monitoring, Incidents, etc.).

The primary gap for an ops engineer is the absence of a direct "Write runbook from this incident" CTA on the browse page. Engineers finishing an incident response want to capture knowledge immediately — the path currently requires opening the KB editor from the sidebar or from within an incident detail page. A "Write new article" button on the browse page is missing.

The article cards in the list show title, content type, last updated, view count, and helpful rate — all useful signals. The search snippet highlighting is implemented (extractSnippet function) which reduces time-to-relevance for search results.

**Priority fixes:**
- P2: Add a "Write new article" primary button in the browse page header (alongside or replacing the current "Analytics" link) — it should be as easy to create as to browse
- P3: On mobile, the right-column category tree collapses — add an explicit filter button to surface it

---

### Article View (`/kb/:slug`)

**Journey context:** Engineer reads a runbook or troubleshooting guide during or after an incident response.

The Article View is one of the better-executed reading experiences in the app. The table of contents (auto-extracted from markdown headings) with active section highlighting is excellent for long runbooks. The markdown renderer handles bold, inline code, code blocks with language tags, numbered lists, and cross-references (KB-XXXXX, INC-XXXX, etc.) rendered as internal links. The "Was this helpful?" feedback form at the bottom creates a feedback loop.

The main navigation issue is the back link, which always goes to `/kb` (the browse page) regardless of how the engineer arrived at the article. If they opened the article from within an Incident Detail's "Linked Items" tab, hitting back returns them to the KB browse page rather than to the incident — context is lost. The back link should use browser history or a referrer-based breadcrumb.

The "Related articles" section at the bottom is valuable — it prevents dead-end reads by surfacing adjacent content.

The article expiry warning is correctly implemented — a yellow banner appears when `reviewDueDate` is approaching, giving engineers confidence about whether to trust the content.

**Priority fixes:**
- P2: Change the back link from a hardcoded `/kb` href to `navigate(-1)` or a referrer-aware breadcrumb so engineers return to their originating context (incident detail, problem detail, etc.) (`ArticleView.tsx` — the `<ArrowLeft>` link at the top)
- P3: Add a "Copy link" button to the article header for quick sharing in incident bridge channels

---

### KB Editor (`/kb/editor`, `/kb/editor/:slug`)

**Journey context:** Engineer creates a new postmortem or runbook after incident resolution, or edits an existing article.

The KB Editor is feature-rich: a split-panel markdown editor with live preview toggle, slash commands for inserting snippets (headings, code blocks, callouts, warnings), a metadata sidebar (title, summary, category, content type, visibility, tags), and a linked items section for CI references. The slash command menu appearing inline as the engineer types `/` is a modern and discoverable affordance.

The most critical issue is the lack of autosave. The editor has "Save draft" and "Publish" buttons at both the top and bottom of the page, but no autosave interval. An engineer writing a postmortem after a 2-hour major incident response — mentally exhausted, possibly being paged for follow-up — is at real risk of navigating away and losing their work. This is a P1 issue for a knowledge capture workflow.

"Save draft" and "Publish" are repeated in both the top toolbar and the page footer, which is double the button count for the same actions. This pattern causes engineers to hesitate: "Did I click the wrong one?"

The editor initialises with `PLACEHOLDER_BODY` (a generic template) even when launched from an incident context (`?source=incident&id=INC-XXXX`). The search params `source`, `id`, and `title` are read from the URL but the body is not pre-populated with an incident-specific template. An engineer who clicked "Suggest KB article" from an incident detail page arrives at an editor with a generic template rather than a pre-filled postmortem structure for that incident.

**Priority fixes:**
- P1: Implement autosave — debounce saves to localStorage every 30 seconds with a "Draft saved" indicator; restore on return to the same route (`KBEditor.tsx`)
- P1: When launched with `?source=incident&id=...`, pre-fill the body with a postmortem template that includes the incident ID, title, and date (`KBEditor.tsx` — handle `searchParams` to seed `editorState.body`)
- P2: Remove the duplicate Save/Publish buttons from the footer — keep them only in the top toolbar where they are always visible without scrolling
- P3: Add a word count and estimated read time indicator to the editor so engineers calibrate article length

---

### KB Analytics (`/kb/analytics`)

**Journey context:** KB maintainer reviews which articles are driving value, which are expiring, and where knowledge gaps exist; occasional destination for ops engineers reviewing coverage.

The KB Analytics page covers the right metrics: total views, articles published, helpfulness rate, articles expiring soon, top articles by view count, and a day-by-day view time series. The articles-near-expiry list is particularly useful — it creates a clear maintenance backlog.

The most notable issue is that the KBAnalytics page uses raw Tailwind class names from outside the OIS design system (`bg-white`, `border-gray-200`, `text-gray-500`, `text-gray-900`, `text-emerald-600`, `text-red-500`). Every other page in the app uses the custom `ois-*` token set. This means KB Analytics has a visibly different visual style — lighter backgrounds, different border colours — that breaks the product's visual consistency. The page looks like it was built by a different team or ported from a template.

**Priority fixes:**
- P2: Replace all raw Tailwind colour tokens in KBAnalytics with the OIS design system equivalents (`bg-ois-surface`, `border-ois-border`, `text-ois-text`, `text-ois-text-muted`, `text-ois-success`, `text-ois-danger`) (`KBAnalytics.tsx` — `KpiCard` component and all inline card elements)
- P3: Add a link from the KB browse page header to KB Analytics so maintainers can reach it without knowing the direct URL

---

## Section Patterns

These issues appear across three or more pages in the Operations section and indicate systemic gaps rather than page-level problems:

**1. Inert interactive controls.** Buttons and dropdowns that visually imply action but do nothing appear on Dashboard (Refresh, Last 24h, Open Inbox), EventStream (Pause, Last 7d), KEDB (Add known error), ProblemList (New problem), and RCAWorkspace (Publish RCA = Save). Each one slightly erodes the engineer's trust that the interface responds to their input. Every interactive element should either be functional or visually disabled with a tooltip explaining why.

**2. Horizontal scroll on wide tables.** The IncidentQueue, RequestQueue, and EventStream list all require horizontal scrolling at medium viewport widths (< ~1200px) due to `min-w-[900px]` or equivalent constraints. Ops engineers routinely use split-screen setups. Responsive column hiding (Tags, "Assigned to" duplication) would resolve this without loss of information.

**3. Duplicate action surfaces.** Three pages have two separate "Quick actions" surfaces for the same operations (IncidentDetail: two quick action cards; RequestDetail: stepper + sidebar buttons; Dashboard: functionally broken button + correct link). This forces engineers to learn which surface is the "real" one and which is decorative, adding unnecessary cognitive load.

**4. Native browser dialogs (`confirm()`).** The `confirm()` modal appears in EventDetail (resolve when linked to incident) and is implied in other destructive flows. Browser-native dialogs break the visual language of the app, can't be styled, only support OK/Cancel (not multi-option), and are blocked by some browser extensions. All confirmation flows should use the app's Modal component.

**5. Design token inconsistency.** KBAnalytics uses raw Tailwind utilities instead of OIS tokens. The IncidentQueue uses emoji in filter chips while all other filter chip pages use Lucide icons. Small deviations like these accumulate into a sense that parts of the product were built without awareness of each other.
