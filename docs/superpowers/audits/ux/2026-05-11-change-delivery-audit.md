# UX Audit — Change & Delivery Section
**Date:** 2026-05-11
**Persona:** On-call ops engineer
**Iteration:** 1 (Management Mode, on-call lens)

---

## Journey

Engineer checks **Change Calendar** for tonight's freeze window → opens **Change Detail** to verify approval state → attends **CAB Workspace** review → watches **Release Pipeline** progress → monitors **Deployment Queue** for rollout → checks **Validation / Test Runs** for sign-off.

---

## Page Findings

### Change Calendar (`/changes`)

**Journey context:** First stop for an on-call engineer checking whether any changes are scheduled tonight that could explain a current degradation or that require monitoring.

The Change Calendar provides three view modes (calendar, board, list) covering meaningfully different use cases — the calendar gives temporal scheduling context, the board groups by status, and the list provides a dense sortable table. The right sidebar with "This Week", "Awaiting Your Approval", and "Active Conflicts" is well-designed for a shift-start check: an engineer can scan the sidebar in under 30 seconds and know their obligations for the week.

The primary action clarity gap is in the list view, which is the densest and most information-efficient view for ops engineers. The list shows non-closed changes but has no filter or search controls — there is no way to narrow by status, type, risk level, owner, or date range. An engineer managing a large change portfolio who switches to list view to scan for tonight's high-risk changes must manually scan all rows. Adding the same filter bar that appears on the IncidentQueue or ProblemList would resolve this.

The conflict warning in the "This Week" sidebar renders as emoji text ("⚠ Conflict", "⚠ Freeze window") rather than using the design system's warning icon + colour pattern. This is inconsistent with how conflicts are displayed elsewhere in the Change section.

Navigation flow is strong: all change entries in the sidebar link directly to `/changes/${publicId}` and the "New change" button correctly navigates to the multi-step form.

**Priority fixes:**
- P2: Add a search + filter bar to the list view (at minimum: search by title/ID, filter by status and risk) — the list view is currently unfiltered and unscoped
- P2: Replace emoji conflict/freeze text in the sidebar with proper Lucide icons + OIS warning colour tokens, consistent with how conflicts appear in the main calendar and board views
- P3: Add a "back to list" keyboard shortcut or breadcrumb when navigating from sidebar to change detail

---

### New Change (`/changes/new`)

**Journey context:** Engineer or change manager submits a new RFC; the form must be clear enough that the submitter knows exactly what's required before they can proceed.

The multi-step form is structurally sound. The visual stepper at the top, type-selection cards (Standard / Normal / Emergency) with radio-button visual state, real-time risk score bar, freeze window conflict banner, and the required-field validation on "Next" all contribute to a guided, low-error experience. The emergency change banner (red callout explaining CAB bypass) is appropriately prominent.

There are two significant bugs. First, steps 2 and 3 both render the same `renderStep3()` function (the Review content) — the STEPS array is `['Basics', 'Plan', 'Review', 'Submit']` (4 entries) but the JSX renders `renderStep3()` at both `step === 2` and `step === 3`. This means an engineer who clicks "Next" on the Review step sees the exact same Review content again before submitting. The submit button label changes but the content doesn't, causing confusion about whether anything happened.

Second, after submission the success screen shows `CHG-2026-00092` as the new change ID, but both the auto-navigate timer and the "View change →" button navigate to `CHG-2026-00091` — a different (existing) change. The engineer who submits a change is silently redirected to a record they didn't create.

The "Save as draft" button appears in both the page header and at step 2, but neither instance has any onClick handler. An engineer who wants to save progress and return later will find the button does nothing.

The three linked item inputs (Linked Problems, Linked Incidents, Linked Release) require manually typing public IDs with no validation. There is no lookup or dropdown to find a problem or incident by title.

**Priority fixes:**
- P1: Fix the duplicate step render — `{step === 3 && renderStep3()}` should be `{step === 3 && renderStep4_submit_confirmation()}` or simply removed; the submit happens when the user clicks "Submit for review" at step 2 (`NewChange.tsx:747-748`)
- P1: Fix the auto-navigate and "View change →" target from hardcoded `CHG-2026-00091` to `CHG-2026-00092` to match the displayed new change ID (`NewChange.tsx:234, 697`)
- P2: Wire the "Save as draft" button — at minimum, show a toast confirming the draft state
- P3: Add a "Load recent items" hint to the linked problem/incident inputs so engineers can find records without knowing the exact ID

---

### Change Detail (`/changes/:changeId`)

**Journey context:** Engineer opens a specific change to verify it is in the correct approval state and check for conflicts before it implements tonight.

The Change Detail is one of the more complete pages in the section. The seven-tab interface (Overview / Plans / Approvals / Conflicts / Linked / PIR / History) covers the full lifecycle without overwhelming the initial view. The left sidebar "At a glance" card with status, type, risk, impact, owner, window, and approval progress gives an instant situational read. The conflict tab correctly distinguishes blocking from advisory conflicts and shows resolution notes. The PIR tab surfaces post-implementation review content when available. The "Open CAB workspace" button in the Approvals tab is a well-placed cross-navigation shortcut.

The right sidebar quick actions panel contains "Approve change", "Open CAB workspace", "Reschedule", and "Cancel change". The first two navigate correctly. "Reschedule" and "Cancel change" both have `onClick={() => {}}` — completely inert. An engineer trying to cancel a conflicting change before it implements gets no response.

The History tab displays two hardcoded audit entries ("Approval received from Tom Bergstrom", "Change request submitted for review") that are not derived from the actual change data. Every change shows the same two entries regardless of its real audit trail, which makes the History tab unreliable as a record of what happened.

The Plans tab displays implementation, rollback, and test plans in a `<pre>` tag with mono font — functional but reads as raw text rather than formatted markdown. The "Edit" button on each plan card is present but has no handler.

**Priority fixes:**
- P1: Wire "Cancel change" in the quick actions panel — at minimum open a confirmation modal; currently `onClick: () => {}` (`ChangeDetail.tsx:512`)
- P2: Remove or replace the two hardcoded History entries with real change audit data, or clearly mark the History tab as "coming soon" if audit events are not yet implemented (`ChangeDetail.tsx:484-493`)
- P2: Wire the "Edit" button on plan cards in the Plans tab, or remove it if editing is not yet supported
- P3: Render plan content as formatted text (split on newlines) rather than a raw `<pre>` block for better readability

---

### CAB Workspace (`/changes/cab`)

**Journey context:** The change advisory board meeting — engineer reviews each change on the agenda and casts their vote before the change can proceed to implementation.

The CAB Workspace is well-conceived. The three-column layout (agenda / voting card / session info) maps closely to how a real CAB session runs. The voting table shows each approver's role and current decision, with a "Cast vote" button scoped to the current user. The CastVoteModal with radio-button decision options and an optional/required rationale field (required for Reject or Approve with conditions) is thoughtfully designed. The lock-vote checkbox adds a real governance affordance. The agenda sidebar shows mini approval-dot progress indicators for each change. The discussion notes textarea per change preserves session context.

The "Defer to next session" button in the navigation bar between changes has no onClick handler — it renders with a `gap-1.5` className and a SkipForward icon but does nothing when clicked. During a live CAB session, this is the key action for contentious changes that need more information.

The "Export agenda" button in the toolbar is similarly inert.

After the current user casts a vote, the vote is updated in local state and the modal closes. However, there is no visual confirmation that the vote was recorded — no success toast, no updated row state in the voting table. The table row continues to show "Pending" for a beat until React re-renders.

Starting/ending the session (the "Start session" button) only toggles a boolean in local state with no effect on what's visible or accessible — vote casting is possible regardless of session state.

**Priority fixes:**
- P1: Wire the "Defer to next session" button — at minimum it should advance to the next agenda item and mark the current change as deferred with a note (`CABWorkspace.tsx:437-439`)
- P2: Show a brief success indicator after a vote is cast — either update the agenda sidebar dot immediately or show a transient "Vote recorded" confirmation
- P2: Wire "Export agenda" or remove it — an inert export button during a live governance meeting is misleading
- P3: Make session start/end state meaningful — e.g., prevent vote casting before the session is formally started

---

### Releases List (`/releases`)

**Journey context:** Engineer checks the release list to find which releases are currently in flight and whether any are blocking deployment tonight.

The Releases List is clean and effective. The header summary ("X active · Y ready for prod approval · Z rolled back") surfaces the most action-relevant counts immediately. Status tabs that only show non-zero statuses prevent filter confusion. The search + type filter combination is sufficient for the data volume. The ReleaseCard component (content not directly visible in this file but rendered per release) provides the per-card context.

The "New release" button has no onClick handler — it renders as a Button with no `onClick` prop, doing nothing when clicked. An engineer or release manager trying to create a new release record has no path forward from this page.

The "Pipeline view" and "Notes archive" secondary buttons correctly navigate to their respective routes.

**Priority fixes:**
- P1: Wire the "New release" button — navigate to a new-release form or open a creation modal (`ReleasesList.tsx:77`)
- P3: Add a "View all" link to the release cards section when filters are reducing the shown count, so engineers know the total unfiltered size

---

### Release Detail (`/releases/:releaseId`)

**Journey context:** Engineer checks a specific release's composition, pipeline stage, and approval status before giving the go-ahead for a production promotion.

The Release Detail covers the complete release lifecycle well. The six tabs (Overview / Composition / Pipeline / Notes / Feature Flags / History) are correctly scoped. The Pipeline tab's StageCard grid clearly communicates which environments are complete (green border), in-progress (blue border, pulsing loader), or failed (red border). The pending stage shows a "Deploy to [environment] →" button that is correctly disabled with `opacity-60`, indicating approval or a prior step is needed.

The right sidebar "Quick Actions" panel contains four buttons ("Lock composition", "Promote to staging", "Cancel release", "Add change") — all of which are inert. Every button has no onClick handler. For an engineer managing an active release, the inability to promote a validated build to staging from the detail page is the most critical gap.

The History tab renders two hardcoded entries ("Release updated", "Release created") — the same structural issue as in ChangeDetail. Real audit events are not surfaced.

The Notes tab renders `release.releaseNotes` inside a `<pre>` tag. If the notes contain markdown (which they typically do for user-facing content), the markdown syntax is visible as raw text rather than rendered.

**Priority fixes:**
- P1: Wire "Promote to staging" — this is the primary action on an approved release; it should navigate to the deployment queue or trigger a promotion flow (`ReleaseDetail.tsx:361`)
- P1: Wire "Cancel release" — add a confirmation modal and update release status (`ReleaseDetail.tsx:362`)
- P2: Remove hardcoded History entries and replace with real release audit data, or mark the tab as coming soon
- P3: Render release notes as formatted markdown rather than a raw `<pre>` block

---

### Release Pipeline (`/releases/pipeline`)

**Journey context:** Engineer monitors the cross-environment deployment status of all active releases at a glance.

The Release Pipeline is one of the strongest pages in the section. The grid layout (releases × environments) provides immediate cross-sectional visibility that no other view offers. Clicking any release's name cell navigates to its detail. Active releases appear above released ones with a clear separator. The right sidebar "Production Approval" card surfaces releases awaiting sign-off and provides a direct "Review →" link.

The primary friction is that each StageCell, regardless of status, navigates to the release detail page when clicked. A failed or rolled-back stage provides no direct path to the deployment that caused the failure — the engineer must open the release, go to the Pipeline tab, and then find the deployment. Adding navigation to `/deployments/${deploymentPublicId}` for failed or in-progress stages would close this gap.

The "Production Approval" sidebar shows awaiting releases with only a "Review →" text link. An engineer who has already reviewed the release and just needs to approve it must navigate away to the release detail, find the Pipeline tab, and locate the approval gate. An inline "Approve" button on the sidebar card would reduce this to one click.

**Priority fixes:**
- P2: For failed and in-progress StageCell items, navigate to the relevant deployment detail page rather than always going to the release overview
- P3: Add an inline "Approve" or "Approve for production" button to the Production Approval sidebar card for releases in `ready` status

---

### Release Notes (`/releases/notes`)

**Journey context:** Engineer or technical writer reviews published release notes; occasionally arrived at from a customer query about what changed in a specific version.

The Release Notes archive is clean and purpose-fit. The search (by version, component, content), component filter, and type filter together make finding a specific release note fast. The chronological sort (newest first) is correct for this use case. Each entry shows the release type chip, component name, version, release date, full notes, and a "View release detail →" link.

The notes content is rendered inside a `<pre className="whitespace-pre-wrap font-sans">` tag, which preserves line breaks and prevents wrapping issues but does not render markdown formatting. Release notes commonly include headings, bullets, and code snippets — displaying them as raw markdown text (e.g. `## Features`, `- Fix: ...`) is readable but less polished than rendered output.

This page has no P1 or P2 issues. It is a straightforward read-only archive.

**Priority fixes:**
- P3: Render release notes as formatted markdown rather than a raw pre block — this is the user-facing content most likely seen by non-technical readers

---

### Deployments Queue (`/deployments`)

**Journey context:** Engineer monitors active deployments during a change implementation window, watching for failures that need immediate rollback.

The Deployments Queue is feature-dense and well-executed. The ActiveDeploymentBanner at the top highlights running deployments without requiring the engineer to scan the table. The 30-day summary stats (active / pending / success / failed) provide context for the current queue. The quick filter chips (Active, Failed, Rolled back, Last 24h, Production) cover the most operationally relevant cuts. The live elapsed timer for running deployments — implemented with a `setInterval` tick — is a genuinely useful real-time affordance. The actions dropdown per row (Open, View logs, Rollback, Cancel, Re-deploy) is correctly conditional based on deployment status.

The Rollback and Re-deploy actions in the dropdown both have `onClick={() => setOpen(false)}` as their handler — they close the dropdown menu but perform no action. A "Rollback" button on a failed production deployment that silently closes a menu is a P1 issue during an active incident.

The "View logs" action in the dropdown navigates to the same URL as "Open" (`/deployments/${dep.publicId}`). They are identical actions with different labels, which is confusing.

The component uses hardcoded raw hex color values throughout the ActionsMenu (`#F2F4F7`, `#667085`, `#344054`, `#B42318`) instead of OIS design tokens. This is the same inconsistency seen in KBAnalytics and the Environments page — these components appear to have been built from a different design template.

**Priority fixes:**
- P1: Wire the Rollback action — open a rollback confirmation modal (one already exists in DeploymentDetail as `RollbackModal`) rather than just closing the dropdown (`DeploymentsQueue.tsx:76-80`)
- P1: Wire the Re-deploy action — navigate to the deployment detail and trigger a re-deploy flow rather than closing the dropdown (`DeploymentsQueue.tsx:87-91`)
- P2: Remove "View logs" from the actions dropdown or differentiate it from "Open" — if they go to the same page, one of them is redundant
- P2: Replace raw hex color tokens in `ActionsMenu` with OIS design token equivalents (`DeploymentsQueue.tsx:53-99`)

---

### Deployment Detail (`/deployments/:deploymentId`)

**Journey context:** Engineer opens a specific deployment to monitor stage progress, read live logs, and trigger rollback if the deployment fails.

The Deployment Detail is well-structured. The two-column layout (stages / log panel) is the right approach for a live deployment view — stages give progress status and the log panel gives the detailed output. The sticky bottom action bar shows context-appropriate actions based on deployment status (rollback when complete, re-deploy when failed, cancel when running). The `RollbackModal` with a required reason input is correctly implemented with validation.

The Manifest tab displays a hardcoded Kubernetes YAML block for a `payment-api` service regardless of which deployment is actually being viewed. An engineer looking at a database migration deployment or a frontend service deployment will see the same `payment-api` YAML. This makes the Manifest tab actively misleading — it cannot be trusted to show the actual deployed configuration.

The component also uses raw hex color values throughout (`#344054`, `#667085`, `#98A2B3`, `#E4E7EC`, `#EAECF0`, `#1F4FD4`) in the `MetaRow`, `LinkedCard`, and `HistoryItem` sub-components — the same token inconsistency as DeploymentsQueue.

The History tab timeline is well-designed (vertical timeline with colored dots and timestamps) but if deployment history data is not available from the mock, it shows empty content.

**Priority fixes:**
- P1: Replace the hardcoded `MANIFEST_YAML` constant with actual deployment manifest data, or hide the Manifest tab when no manifest data is available rather than showing misleading content (`DeploymentDetail.tsx:25-78`)
- P2: Replace raw hex color values in `MetaRow`, `LinkedCard`, and `HistoryItem` with OIS token equivalents

---

### Environments (`/environments`)

**Journey context:** Engineer checks the overall health of deployment environments before approving a production promotion.

The Environments page provides a clear cross-environment view: environment cards in a grid, recent deployments table, freeze window warnings, and upcoming scheduled deployments. The production health indicator in the page header (coloured dot + "Healthy/Degraded/Down" label) gives an immediate status read. Freeze window cards with priority restrictions are appropriately surfaced in the right sidebar.

The "Last 7d" dropdown button in the page header has a `ChevronDown` icon suggesting it's a time range selector, but it has no onClick handler and no dropdown panel. An engineer looking to understand "which failures happened last 30 days vs last 7 days" gets no way to change the window.

The page uses raw hex color values throughout (`#101828`, `#475467`, `#D0D5DD`, `#EAECF0`, `#1F4FD4`) in the page-level layout and header — another instance of the same token inconsistency found across the deployment section.

The `RecentDeploymentsTable` component (rendered from a separate component) has an environment filter select inline within the table header, but the select's options are cut off in the source — it likely has the same hardcoded/inert pattern seen elsewhere.

**Priority fixes:**
- P2: Wire the "Last 7d" time range button or remove the ChevronDown to avoid implying it's interactive (`Environments.tsx:124`)
- P2: Replace raw hex color values in the page header with OIS token equivalents (`Environments.tsx:103-127`)

---

### Test Plans (`/testing/plans`)

**Journey context:** Engineer checks whether the test plans associated with tonight's change have been recently run and are passing before approving the deployment.

The Test Plans page is well-organised. The two-row stats strip (type chips + quality chips) gives fast access to the most useful cuts of the data. The filter bar (search, type, component, status, owner) covers all practical filtering needs. The TestPlanRow table (rendered via a separate component) shows ID, name, type, component, case count, last run, 30-day pass rate, owner, and actions in a compact, scannable format.

The primary usability issue is the same duplicate filter mechanism seen in ProblemList and TestCases: the stats strip type chips and the filter bar "type" dropdown both filter by the same field. A user who selects "Regression" in the chip strip AND sets "Smoke" in the dropdown will get unexpected results. The chips should be the primary quick filter, and the dropdown should be removed or scoped to a different attribute.

There is no direct path from a test plan row to the test runs associated with that plan. An engineer checking if the regression suite for the Payment API has passed recently must navigate to TestRuns and search for the plan manually.

**Priority fixes:**
- P2: Remove the type dropdown from the filter bar since it duplicates the stats strip type chips — one filtering surface per dimension (`TestPlans.tsx:121`)
- P2: Add a "View runs →" link on each TestPlanRow that navigates to TestRuns filtered to that plan's ID
- P3: Add a badge on each plan row showing the last run's pass/fail status with a colour indicator for immediate health assessment

---

### Test Cases (`/testing/cases`)

**Journey context:** Engineer or QA lead checks which test cases cover the components being deployed; reviews flaky tests before approving a release.

The Test Cases page handles a complex filtering scenario well at the structural level. The three-row stats strip (priority chips, type chips, quality chips), combined with the six-dropdown filter bar (search, type, priority, plan, automated, status), gives comprehensive access to the test case catalog. The flake rate display with colour intensity (red > 10%, orange > 5%, green otherwise) is an effective visual signal.

There is a filter logic bug. The priority chip and type chip filter conditions are mutually blocked:

```tsx
if (priorityChip !== 'all' && !typeChip && !qualityChip) { ... }
if (typeChip !== 'all' && !priorityChip) { ... }
```

Both `typeChip` and `priorityChip` are initialised to `'all'` (a truthy string). So `!typeChip` evaluates to `false` when `typeChip === 'all'`, meaning the priority chip filter never applies when `typeChip` is at its default. Similarly, `!priorityChip` is `false` when `priorityChip === 'all'`, so the type chip filter never applies. Clicking a priority chip or type chip in isolation has no visible effect on the list, which will confuse engineers trying to use these filters.

There is no test case detail page in the current routes — clicking a table row (via the MoreVertical actions menu) offers no way to open a specific test case. The MoreVertical menu buttons appear to be visual-only with no handlers.

**Priority fixes:**
- P1: Fix the chip filter logic — change the conditions to check `typeChip === 'all'` instead of `!typeChip`, and `priorityChip === 'all'` instead of `!priorityChip` (`TestCases.tsx:107-114`)
- P2: Wire the MoreVertical actions menu with at least "View steps" functionality, or remove the menu if no actions are implemented

---

### Test Runs (`/testing/runs`)

**Journey context:** Engineer checks whether the pre-deployment test suite passed before approving a production release.

The Test Runs page is information-dense and functional. The `ActiveTestRunBanner` for live runs is well-placed. The right sidebar (Test Health, Flaky Tests, Failed Cases) provides context without cluttering the main list. The quick filter chips (Failed last 24h, Flaky, Live, Production) are useful for ops engineers who need to understand recent test quality quickly.

The filter complexity is high. There are: a search box, 4 dropdown filters (status, plan, environment, trigger), 2 stats strip chip rows (status chips + trigger chips), and 4 quick filter chips. This is 11 separate filter controls. The status chip strip and the status dropdown filter the same field — the same duplication found across TestPlans and TestCases.

The TestRunCard components are expandable, and the full implementation is in a separate component. The expand/collapse pattern for test run cards adds cognitive overhead for engineers who just need to scan pass/fail counts — a single-row summary table (like IncidentQueue) would serve better for quick triage.

**Priority fixes:**
- P2: Remove the status dropdown since the status chip strip covers the same dimension — reduce total filter control count (`TestRuns.tsx` — the filter bar dropdown)
- P3: Add an option to switch between card view (current) and table view for engineers who prefer dense row-based scanning

---

### Sign-Off Queue (`/testing/sign-off`)

**Journey context:** Engineer reviews release validation sign-offs and approves or rejects them before a production deployment proceeds.

The Sign-Off Queue has a well-structured approval workflow. The filter bar (type, status, approver, SLA) covers the meaningful dimensions. The three quick filter chips (My pending, SLA at risk, Release validations) address the most common triage scenarios. The sorting (pending first, then due date ascending) puts urgency at the top correctly. The `SignOffApproveModal` and `SignOffRejectModal` follow the same confirmation pattern established elsewhere.

The critical issue is that `onConfirm` for both modals is wired to `() => setApproveTarget(null)` and `() => setRejectTarget(null)` — closing the modal is the only effect. Approving or rejecting a sign-off has no effect on the sign-off's status in the displayed list. An engineer who approves a critical release validation sees it remain in the pending queue with no status change, leading them to question whether the action worked.

The quick filter chips use emoji labels (🔥, ⚠, 📋) — the same design inconsistency already fixed in IncidentQueue. The chips should use Lucide icons to match the rest of the UI.

**Priority fixes:**
- P1: Wire `onConfirm` in both `SignOffApproveModal` and `SignOffRejectModal` to actually update the sign-off status in local state, so the queue reflects the decision after modal close (`SignOffQueue.tsx:289, 299`)
- P2: Replace emoji labels in quick filter chips with Lucide icon equivalents — use `Flame`, `AlertTriangle`, `ClipboardList` which are already imported (`SignOffQueue.tsx:237, 248, 257`)

---

## Section Patterns

**1. Pervasive inert buttons across workflow pages.** New release, cancel change, reschedule, defer to next session, promote to staging, rollback/redeploy in the deployment queue, export agenda — all buttons that represent core workflow actions in a change management system, all returning no feedback when clicked. This is the most damaging pattern in the section: engineers who click "Cancel change" and get no response cannot trust the UI to manage change risk. Every interactive element that initiates a workflow action must either work or be visually disabled with a tooltip.

**2. Design token inconsistency in the deployment subsection.** DeploymentsQueue, DeploymentDetail, and Environments all use raw hex values (`#344054`, `#667085`, `#EAECF0`, etc.) instead of the OIS token system. This creates a visually distinct "sub-product" feel for the deployments area. All three files need a systematic token replacement pass.

**3. Duplicate filter mechanisms on testing pages.** TestPlans, TestCases, and TestRuns all have both a stats strip chip row and a dropdown filter that control the same field (type, status). Two controls for one field creates unpredictable combined behaviour and cognitive overhead. The chip strips should be the only surface for their respective dimensions, with dropdowns removed.

**4. Hardcoded audit history and manifest data.** ChangeDetail, ReleaseDetail, and DeploymentDetail all show hardcoded history entries or manifests that are not derived from the actual record being viewed. This makes the History tabs unreliable and the Manifest tab misleading — both are trust-destroying for engineers who use them as records of truth.

**5. NewChange form step bug.** The multi-step form renders the Review step content at both step index 2 and step index 3, creating a confusing double-review experience. Additionally the post-submit navigation goes to a hardcoded change ID that doesn't match the newly created record shown on screen. These are correctness bugs in the core RFC submission flow.
