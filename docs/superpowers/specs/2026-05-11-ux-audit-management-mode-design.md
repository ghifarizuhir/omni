# UX Audit — Management Mode
**Date:** 2026-05-11
**Persona:** On-call ops engineer (primary); IT manager / team lead (future iteration)
**Scope:** All Management Mode routes (non-AI pages)

---

## Goal

Audit every page in Management Mode for user experience quality. Identify friction, unclear flows, and missing affordances that slow down an on-call engineer under pressure. Produce actionable findings with priority-tagged fixes.

---

## Audit Dimensions

Each page is evaluated across five dimensions:

1. **Primary action clarity** — can the user immediately see what to do next?
2. **Information hierarchy** — is the most critical data visible without scrolling?
3. **Navigation flow** — are related pages/sub-pages easy to move between?
4. **Empty & error states** — does the page still make sense with no data?
5. **Cognitive load** — how much does the user need to read/parse to take action?

---

## Audit Format — Per Page

Each page entry follows this structure:

```
### [Page Name] (`/route`)
**Journey context:** [one sentence — what brought the user here and where they go next]

[Narrative findings across the 5 dimensions — prose, not bullets]

**Priority fixes:**
- P1: [blocks the journey — must fix before moving to next section]
- P2: [causes friction — fix in current section iteration]
- P3: [polish — log and defer]
```

Each section ends with a **Section Patterns** block listing 3–5 cross-cutting issues.

---

## Priority Order & On-Call Journeys

### 1. Operations *(first)*

**Journey:** On-call engineer receives an alert → checks **Inbox** for urgency → opens **Event Stream** to find the firing event → **Event Detail** to understand scope → **Incident Queue** to escalate → **Incident Detail** to coordinate response → if P1, enters **Major Incident War Room** → after resolution, logs a **Problem** → closes via an existing **Knowledge Base** article or creates a new one.

**Pages in scope (journey order):**
Dashboard → Inbox → EventStream → EventDetail → IncidentQueue → IncidentDetail → MajorIncidentWarRoom → IncidentAnalytics → ProblemList → ProblemDetail → RCAWorkspace → KEDB → RequestQueue → RequestDetail → PortalHome → KBBrowse → ArticleView → KBEditor → KBAnalytics

---

### 2. Change & Delivery *(second)*

**Journey:** Engineer checks **Change Calendar** for tonight's freeze window → opens **Change Detail** to verify approval state → attends **CAB Workspace** review → watches **Release Pipeline** progress → monitors **Deployment Queue** for rollout → checks **Validation / Test Runs** for sign-off.

**Pages in scope (journey order):**
ChangeCalendar → NewChange → ChangeDetail → CABWorkspace → ReleasesList → ReleaseDetail → ReleasePipeline → ReleaseNotes → DeploymentsQueue → DeploymentDetail → Environments → TestPlans → TestCases → TestRuns → SignOffQueue

---

### 3. Service Health *(third)*

**Journey:** SLA breach alert fires → engineer opens **Availability Dashboard** to assess breach → checks **Outages** for active incidents → pivots to **Capacity Dashboard** to rule out resource exhaustion → reviews **Continuity / BIA Matrix** if service is critical.

**Pages in scope (journey order):**
AvailabilityDashboard → SLATargets → Outages → CapacityDashboard → CapacityForecast → CapacityThresholds → BIAMatrix → DRPlans → DRTests

---

### 4. Observability *(fourth)*

**Journey:** Alert fires → **Event Stream** to triage → **Event Detail** to understand signal → **Monitoring Rules** to check if rule is misconfigured → **Alert Routing** to verify escalation path → **Coverage Report** to spot blind spots.

**Pages in scope (journey order):**
EventStream → EventDetail → MonitoringRules → AlertRouting → CoverageReport

*(Note: EventStream and EventDetail overlap with Operations — findings cross-reference but are not duplicated.)*

---

### 5. Measurement *(fifth)*

**Journey:** End-of-shift review → **Dashboards Index** to find the right view → **Executive Dashboard** for SLA summary → **Reports** for a downloadable snapshot → **Report Builder** for a custom slice → **Metric Catalog** to verify KPI definitions.

**Pages in scope (journey order):**
DashboardsIndex → ExecutiveDashboard → Reports → ReportBuilder → MetricCatalog

---

### 6. Platform *(sixth)*

**Journey:** On-call shift starts → **On-Call Schedule** to confirm coverage → **On-Call Overrides** to swap if needed → **Inbox** to clear backlog → **Notification Preferences** to confirm alert routing → **Status Page** to check public-facing state → **CMDB** for asset context → **Improvements** register to log follow-up work → **Settings** for personal config.

**Pages in scope (journey order):**
OnCall → OnCallSchedule → OnCallOverrides → Inbox → NotificationPreferences → StatusPage → CMDBList → CMDBDetail → CMDBGraph → CMDBAudit → ImprovementRegister → ImprovementKanban → ImprovementHeatmap → BenefitTracker → ImprovementDetail → Settings → Profile

---

## Iteration Strategy

After each section's audit document is written, follow this cycle before starting the next section:

1. **Audit** — Read every page file in the section; write narrative findings in journey order.
2. **Triage** — Review all P1 and P2 findings. Identify self-contained fixes (single file, low risk) vs. cross-cutting fixes (shared components, layout, multiple pages).
3. **Fix** — Implement P1 fixes first, then P2. P3 items are logged but deferred unless trivially fast.
4. **Verify** — Re-read only the affected pages after fixes to confirm findings are resolved. No full re-audit of the section.
5. **Move on** — Once P1s are cleared and P2s are fixed or consciously deferred, begin the next section.

**Rule:** Never start the next section's audit until the current section's P1 findings are resolved.

---

## Future Iteration

After all 6 sections are audited and fixed from the on-call engineer perspective, repeat the full audit cycle with the **IT manager / team lead** persona. That iteration focuses on oversight, summary views, approval workflows, and reporting — dimensions that trade speed for completeness.

---

## Audit Output Location

Section audit documents are saved to:
```
docs/superpowers/audits/ux/YYYY-MM-DD-<section>-audit.md
```
