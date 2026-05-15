# OIS Frontend — Mock Data & API Wiring Audit

> **Resolved 2026-05-15** on branch `feature/audit-mock-data-fixes` (commits `ec40a4d..07700f0`). All MOCK/STATIC findings and 4 of 5 PARTIAL findings wired to real APIs; remaining residue documented at the bottom.
>
> Plan: `docs/superpowers/plans/2026-05-15-audit-mock-data-fixes.md`.

## Resolution summary

| Original finding | Fix | Commit |
|---|---|---|
| Hard-coded `NOW`/`TODAY` in IncidentQueue, RequestQueue, RequestDetail, DRPlans | Runtime values | `33e6a89` |
| NewChange `plannedStart/End` defaults | Lazy `now+1h..now+3h` | `055d93b` |
| UserMenu "Admin · Platform Engineering", UserSwitcher "(mock)" label | Derived from `/users/me` + teams | `470544a` |
| Dashboard On-Call card (3 hard-coded names + handover) | Bound to `/on-call/schedules` | `f7b9cc0` |
| Profile.tsx — `SARAH_CHEN`, `INITIAL_TOKENS` | `/users/me` + `/users/me/tokens` | `2e9d3d1`, `b2697be` |
| Settings.tsx — `SARAH_CHEN`, tokens, hard-coded channel addresses | `/users/me/tokens` + `/users/me/channels` | `2e9d3d1`, `b2697be` |
| RequestDetail comment box mutating local state | `POST /requests/:id/comments` | `36e85c2`, `3149edb` |
| SLATargets / Outages hard-coded tab + severity counts | Derived from fetched data | `36cee62` |
| CapacityDashboard / CapacityForecast hard-coded KPIs | Derived from metrics/forecasts | `02f413b` |
| ExecutiveDashboard fully STATIC | `GET /measurement/exec-summary` | `2f8d8d0`, `a6f2110` |
| ReportBuilder no persistence | `POST /measurement/reports` | `2f8d8d0`, `a6f2110` |
| AiWorkspace `getMockAiResponse()` | `POST /ai/sessions/:id/messages` (placeholder assistant reply) | `b545509`, `77590c0` |
| Hard-coded `TODAY` in ImprovementRow, OverrideCard, DRPlanCard, AvailabilityTrendChart (out-of-original-scope but same bug class) | Runtime values | `5b429e3` |
| Hard-coded date anchors in 4 oncall helper components | Runtime / start-of-week | `07700f0` |

### New backend endpoints

- `GET/POST/DELETE /users/me/tokens`
- `GET/PUT /users/me/channels[/:kind]`
- `GET/POST /requests/:publicId/comments`
- `GET /measurement/exec-summary`
- `POST /measurement/reports`
- `GET/POST /ai/sessions/:id/messages`

### New Prisma models

`ApiToken`, `NotificationChannel`, `RequestComment`, `AiMessage` (migrations `20260515060255_*`, `20260515061047_*`, `20260515062429_*`).

### Residual / deferred

These items were either out of the original audit scope or require larger work:

1. **`src/components/ai/AiQuickPanel.tsx`** — still calls `getMockAiResponse('quick-panel', ...)`. The panel has no real session lifecycle; wiring requires creating/fetching a session on mount and converting the handler to async. Track as a follow-up.
2. **`src/components/improvement/BenefitTracker/CumulativeBenefitChart.tsx`** — `MONTH_DATES` array is fixed-axis chart data; intentional, not a "now" bug.
3. **`GenerateTokenModal`** — Profile/Settings still display a self-generated fake secret in the reveal modal; the real token returned by `POST /users/me/tokens` is currently dropped after persisting the row. Lift the real token into the modal in a follow-up.
4. **Exec summary** — backend returns 0 for several metrics because the Prisma schema lacks fields (`Incident.resolvedAt`, `SlaTarget` model, `Change.plannedEnd`). Adding those columns is a separate schema-evolution task.
5. **AI assistant reply** — backend returns a deterministic `Acknowledged: "<input>"` placeholder. Integration with a real LLM is explicitly out of scope.

---

## Original audit (pre-fix snapshot)

**Date:** 2026-05-15
**Scope:** Every authenticated route + shared shell components (TopBar, Sidebar, AppShell, InboxDrawer, NotificationDropdown, UserMenu, UserSwitcher).
**Method:** Each file inspected for (a) calls to real backend services (`useResource()` / `apiFetch()` → `/api/v1/...`) and (b) hard-coded constants or arrays that bypass the API.

## Status legend

| Status   | Meaning                                                                 |
|----------|-------------------------------------------------------------------------|
| WIRED    | Reads/writes real backend; no functional hard-coded data.               |
| PARTIAL  | Real API used for primary data, but some fields/sections are hard-coded.|
| MOCK     | Page renders purely from hard-coded constants. No API call.             |
| STATIC   | Layout/wizard/orchestrator only — no data to fetch.                     |

## Headline

- **Total files audited:** 82
- **WIRED:** 71
- **PARTIAL:** 5
- **MOCK:** 3
- **STATIC:** 3

Critical follow-ups (highest priority → lowest):
1. `src/routes/platform/Profile.tsx` — fully MOCK (`SARAH_CHEN`, `INITIAL_TOKENS`). Should call `GET /users/me` + an API token endpoint (token endpoint not yet implemented).
2. `src/routes/platform/Settings.tsx` — fully MOCK (`SARAH_CHEN`, channel addresses, tokens hard-coded). Same fixes as Profile.
3. `src/routes/measurement/ExecutiveDashboard.tsx` — STATIC with hard-coded KPI numbers (75%, 2h 14m, 87%, 9). Needs measurement aggregation endpoint.
4. `src/routes/measurement/ReportBuilder.tsx` — STATIC wizard; no persistence on submit.
5. `src/routes/Dashboard.tsx` — On-Call card (lines 458–475) uses hard-coded names instead of `/on-call/schedules`.
6. `src/components/layout/UserMenu.tsx` — "Admin" label & "Platform Engineering" team hard-coded; should come from `/users/me`.
7. `src/components/layout/UserSwitcher.tsx` — labeled "Switch user (mock)"; this is a superadmin preview affordance, decide whether to keep or hide in prod.
8. `src/routes/incidents/IncidentQueue.tsx` — hard-coded `NOW = 2026-05-09T00:00:00Z` (also in `RequestQueue.tsx`, `RequestDetail.tsx`, `continuity/DRPlans.tsx`). Replace with `Date.now()` before launch.
9. `src/routes/changes/NewChange.tsx` — `plannedStart`/`plannedEnd` defaults hard-coded to 2026-05-14.
10. Hard-coded UI metadata (tab counts, accuracy %, top drivers) in `SLATargets`, `Outages`, `CapacityDashboard`, `CapacityForecast` — placeholders awaiting binding to fetched data.

---

## 1. Shell & Core

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/components/layout/AppShell.tsx` | STATIC | Layout orchestration only (lines 11–138). | — |
| `src/components/layout/Sidebar.tsx` | WIRED | `useResource()` x10 for badge counts (lines 41–52). | `/inbox/items`, `/incidents`, `/problems`, `/requests`, `/changes`, `/deployments`, `/releases`, `/availability`, `/testing`, `/oncall` |
| `src/components/layout/TopBar.tsx` | WIRED | `inboxService.items()`, `notificationsService.list()`, `usersService.current()` (lines 23–25). | `/inbox/items`, `/notifications`, `/users/me` |
| `src/components/layout/InboxDrawer.tsx` | WIRED | `inboxService.items()` (line 16). | `/inbox/items` |
| `src/components/layout/NotificationDropdown.tsx` | WIRED | `notificationsService.list()` (line 16). | `/notifications` |
| `src/components/layout/UserMenu.tsx` | PARTIAL | `usersService.current()` (line 13) **but** "Admin" label and "Platform Engineering" team are hard-coded (lines 28–34). | `/users/me` |
| `src/components/layout/UserSwitcher.tsx` | PARTIAL | Reads from `CurrentUserContext`; label still says "Switch user (mock)" (line 38). | RBAC context |
| `src/routes/Dashboard.tsx` | PARTIAL | API: `servicesService.list()`, `incidentsService.active()`, `usersService.list()`, `inboxService.items()` (lines 43–49). **Hard-coded:** On-Call entries with `David Okafor`, `Yuki Tanaka`, `Aisha Khan`, next handover `Sarah Chen` (lines 458–475). | Need `/on-call/schedules` for that section. |
| `src/routes/Login.tsx` | WIRED | `apiFetch('/auth/login')` + `refreshAuthSession()` (lines 39–40). | `/auth/login` |

## 2. Platform (Inbox, Notifications, On-Call, Status, Profile, Settings)

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/platform/Inbox.tsx` | WIRED | `inboxService.items()` (line 49); client-side filtering. | `/inbox/items` |
| `src/routes/platform/Notifications.tsx` | WIRED | `notificationsService.list()` (line 40). | `/notifications` |
| `src/routes/platform/NotificationPreferences.tsx` | WIRED | `notificationsService.preferences()`, `notificationsService.quietHours()` (lines 85–86). | `/notifications/preferences`, `/notifications/quiet-hours` |
| `src/routes/platform/Profile.tsx` | **MOCK** | Hard-coded `SARAH_CHEN` (lines 9–17) + `INITIAL_TOKENS` (lines 19–34). No API call. | Should call `/users/me` + (missing) `/users/:id/tokens`. |
| `src/routes/platform/Settings.tsx` | **MOCK** | Hard-coded `SARAH_CHEN` (lines 69–77), `INITIAL_TOKENS` (lines 193–196), channel values `sarah.chen@acmecorp.io`, `+1 (415) 555-0192`, `@sarah.chen · #ois-alerts` (lines 167–170). | Same as Profile + notification-channel persistence. |
| `src/routes/platform/StatusPage.tsx` | WIRED | `statusPageService.entries()`, `statusPageService.incidents()` (lines 16–17). | `/status-page/entries`, `/status-page/incidents` |
| `src/routes/platform/OnCall.tsx` | WIRED | `onCallService.schedules()` + `onCallService.overrides()` (lines 7–8). | `/on-call/schedules`, `/on-call/overrides` |
| `src/routes/platform/OnCallLayout.tsx` | WIRED | Same as OnCall (lines 14–15). | `/on-call/*` |
| `src/routes/platform/OnCallSchedule.tsx` | WIRED | Same (lines 13–14). | `/on-call/*` |
| `src/routes/platform/OnCallOverrides.tsx` | WIRED | Same (lines 11–12). | `/on-call/*` |

## 3. CMDB

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/cmdb/CMDBList.tsx` | WIRED | `cisService.list/relationshipsAll`, `servicesService.list` (lines 50–54). | `/cis`, `/cis/relationships`, `/services` |
| `src/routes/cmdb/CMDBDetail.tsx` | WIRED | Multiple resources (lines 74–148), PATCH via `cisService.update()` (line 116). | `/cis`, `/cis/:publicId`, `/cis/relationships`, `/cis/audit`, `/services`, `/monitoring/rules`, `/knowledge`, `/capacity/metrics` |
| `src/routes/cmdb/CMDBGraph.tsx` | WIRED | CIs + relationships (lines 29–31). | `/cis`, `/cis/relationships` |
| `src/routes/cmdb/CMDBAudit.tsx` | WIRED | `cisService.audit()` (line 80). | `/cis/audit` |

## 4. Monitoring

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/monitoring/MonitoringLayout.tsx` | WIRED | `eventsService.list()` (line 16). | `/events` |
| `src/routes/monitoring/MonitoringOverview.tsx` | WIRED | `eventsService.listActive()`, `eventsService.dashboardStats()` (lines 16–17). | `/events`, `/events/dashboard-stats` |
| `src/routes/monitoring/EventStream.tsx` | WIRED | `eventsService.list()` (line 31). | `/events` |
| `src/routes/monitoring/EventDetail.tsx` | WIRED | Events/CIs/rules/users/incidents + PATCH (lines 72–194). | `/events`, `/events/:id/status`, `/cis`, `/monitoring/rules`, `/users`, `/incidents` |
| `src/routes/monitoring/MonitoringRules.tsx` | WIRED | Rules + routes (lines 76–77). | `/monitoring/rules`, `/monitoring/routes` |
| `src/routes/monitoring/AlertRouting.tsx` | WIRED | Same (lines 44–45). | `/monitoring/routes`, `/monitoring/rules` |
| `src/routes/monitoring/CoverageReport.tsx` | WIRED | CIs + rules + services (lines 36–38). | `/cis`, `/monitoring/rules`, `/services` |

## 5. Incidents

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/incidents/IncidentQueue.tsx` | PARTIAL | API wired (lines 87–89). **Hard-coded `NOW = new Date('2026-05-09T00:00:00Z')`** at line 59 for SLA/recency filtering. | `/incidents`, `/users`, `/services` |
| `src/routes/incidents/IncidentDetail.tsx` | WIRED | Multiple resources (lines 137–162). | `/incidents`, `/incidents/:id`, `/users`, `/services`, `/cis`, `/problems`, `/changes`, `/knowledge`, `/continuity/bia`, `/availability/outages` |
| `src/routes/incidents/MajorIncidentWarRoom.tsx` | WIRED | `incidentsService.get()`, `cisService.list()`, `incidentsService.timeline()` (lines 132–141). | `/incidents/:id`, `/cis`, `/incidents/:id/timeline` |
| `src/routes/incidents/IncidentAnalytics.tsx` | WIRED | Lines 34–36. | `/incidents`, `/services`, `/users` |

## 6. Problems & KEDB

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/problems/ProblemList.tsx` | WIRED | Lines 130–132. | `/problems`, `/users` |
| `src/routes/problems/ProblemDetail.tsx` | WIRED | Lines 446–462. | `/problems/:id`, `/services`, `/changes`, `/improvements`, `/incidents`, `/knowledge` |
| `src/routes/problems/RCAWorkspace.tsx` | WIRED | Lines 358–362. | `/problems/:id`, `/users` |
| `src/routes/problems/KEDB.tsx` | WIRED | Lines 25–229. | `/problems`, `/services`, `/incidents` |

## 7. Requests & Portal

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/requests/RequestQueue.tsx` | PARTIAL | API wired (lines 214–215). Hard-coded `NOW = 2026-05-09T10:00:00Z` (line 38). | `/requests`, `/users` |
| `src/routes/requests/RequestDetail.tsx` | PARTIAL | API wired (lines 580–584) and mutations (1141–1249). Hard-coded `NOW` (line 24); comment-post handler at 806–811 mutates local state only (no API). | `/requests`, `/catalog`, `/kb/articles`, `/users`, plus mutation endpoints. Missing `POST /requests/:id/comments`. |
| `src/routes/portal/PortalLayout.tsx` | WIRED | Lines 14–15. | `/catalog`, `/requests` |
| `src/routes/portal/PortalHome.tsx` | WIRED | Lines 283–295. Hard-coded `RECOMMENDED_SLUGS` list (lines 89–93) used to filter API result. | `/requests`, `/catalog`, `/kb/articles` |
| `src/routes/portal/Catalog.tsx` | WIRED | `requestsService.catalog()` (line 305). | `/catalog` |
| `src/routes/portal/CatalogItemDetail.tsx` | WIRED | Imports `requestsService`, `knowledgeService`, `teamsService`. Submit → `POST /requests`. | `/catalog`, `/kb/articles`, `/teams`, `POST /requests` |
| `src/routes/portal/MyRequests.tsx` | WIRED | `requestsService.list()`. | `/requests` |

## 8. Knowledge Base

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/kb/KBLayout.tsx` | WIRED | Line 14. | `/kb/articles` |
| `src/routes/kb/KBBrowse.tsx` | WIRED | Lines 255–256. | `/kb/articles`, `/kb/categories` |
| `src/routes/kb/ArticleView.tsx` | WIRED | Lines 448–449. | `/kb/articles`, `/kb/categories` |
| `src/routes/kb/KBEditor.tsx` | WIRED | Lines 549–550 + create/update mutations. | `/kb/articles`, `/kb/categories`, `POST/PATCH /kb/articles` |
| `src/routes/kb/KBAnalytics.tsx` | WIRED | Lines 168–170. | `/kb/analytics`, `/kb/articles`, `/kb/feedback` |

## 9. Changes & CAB

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/changes/ChangeCalendar.tsx` | WIRED | Line 55. | `/changes` |
| `src/routes/changes/NewChange.tsx` | PARTIAL | Submit calls `changesService.create()`; **hard-coded** `plannedStart: '2026-05-14T14:00'`, `plannedEnd: '2026-05-14T16:00'` (lines 50–51). | `POST /changes` |
| `src/routes/changes/ChangeDetail.tsx` | WIRED | Lines 51–55 + mutations. | `/changes/:id`, `/capacity/recommendations`, cancel/reschedule endpoints |
| `src/routes/changes/CABWorkspace.tsx` | WIRED | Line 414. | `/changes` |

## 10. Releases, Deployments, Environments

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/releases/ReleasesLayout.tsx` | WIRED | Line 14. | `/releases` |
| `src/routes/releases/ReleasesList.tsx` | WIRED | Line 43. | `/releases` |
| `src/routes/releases/ReleaseDetail.tsx` | WIRED | Line 101. | `/releases`, `/releases/:id` |
| `src/routes/releases/ReleasePipeline.tsx` | WIRED | Line 73. | `/releases` |
| `src/routes/releases/ReleaseNotes.tsx` | WIRED | Line 18. | `/releases` |
| `src/routes/deployments/DeploymentsLayout.tsx` | WIRED | Lines 13–14. | `/deployments`, `/environments` |
| `src/routes/deployments/DeploymentsQueue.tsx` | WIRED | Line 172. | `/deployments` |
| `src/routes/deployments/DeploymentDetail.tsx` | WIRED | Lines 202–212. | `/deployments`, `/deployments/:id/logs`, `/testing/runs` |
| `src/routes/deployments/Environments.tsx` | WIRED | Lines 38–39. | `/environments`, `/deployments` |

## 11. Testing & Sign-off

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/testing/TestingLayout.tsx` | WIRED | Lines 15–18. | `/testing/plans`, `/testing/runs`, `/testing/sign-offs` |
| `src/routes/testing/TestPlans.tsx` | WIRED | Line 39. | `/testing/plans` |
| `src/routes/testing/TestCases.tsx` | WIRED | Line 54. | `/testing/cases` |
| `src/routes/testing/TestRuns.tsx` | WIRED | Lines 59–61. | `/testing/runs`, `/testing/cases` |
| `src/routes/testing/SignOffQueue.tsx` | WIRED | Line 38. | `/testing/sign-offs` |

## 12. Availability

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/availability/AvailabilityLayout.tsx` | WIRED | Lines 14–15. | `/availability/sla-targets`, `/availability/outages` |
| `src/routes/availability/AvailabilityDashboard.tsx` | WIRED | Lines 20–24. | `/availability/daily-health`, `/services`, `/availability/sla-targets`, `/availability/sla-breaches?active=true`, `/availability/outages` |
| `src/routes/availability/SLATargets.tsx` | PARTIAL | Lines 29–31 wired. **Hard-coded** tab counts in `STATUS_TABS` (lines 17–22): `8 all / 6 meeting / 0 at_risk / 2 breached`. | `/availability/sla-targets`, `/availability/sla-breaches`, `/services` |
| `src/routes/availability/Outages.tsx` | PARTIAL | Lines 38–39 wired. **Hard-coded** `TYPE_TABS` counts (lines 26–32) + severity counts `[4, 8, 9, 3]` + `14` customer-facing (lines 200–221). | `/availability/outages`, `/services` |

## 13. Capacity

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/capacity/CapacityLayout.tsx` | WIRED | Lines 14–16. | `/capacity/metrics`, `/capacity/forecasts`, `/capacity/thresholds` |
| `src/routes/capacity/CapacityDashboard.tsx` | PARTIAL | Lines 15–19 wired. **Hard-coded KPI strings** (lines 48–71): "62%", "71%", "4 days", "3 outages". | `/capacity/metrics`, `/capacity/thresholds`, `/capacity/recommendations` |
| `src/routes/capacity/CapacityForecast.tsx` | PARTIAL | Lines 16–21 wired. **Hard-coded** forecast accuracy ("87% accurate", etc.) and Top Drivers (lines 191–205). | `/capacity/metrics`, `/capacity/forecasts` |
| `src/routes/capacity/CapacityThresholds.tsx` | WIRED | Lines 24–27. | `/capacity/metrics`, `/capacity/thresholds` |

## 14. Continuity

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/continuity/ContinuityLayout.tsx` | WIRED | Lines 14–19. | `/continuity/bia`, `/continuity/dr-plans`, `/continuity/dr-runs` |
| `src/routes/continuity/BIAMatrix.tsx` | WIRED | Line 13. | `/continuity/bia` |
| `src/routes/continuity/DRPlans.tsx` | PARTIAL | Line 44 wired. Hard-coded `TODAY = new Date('2026-05-10')` (line 12) used for status calc. | `/continuity/dr-plans` |
| `src/routes/continuity/DRTests.tsx` | WIRED | Lines 43–46. | `/continuity/dr-runs`, `/continuity/dr-plans` |

## 15. Measurement, Reports, Dashboards

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/measurement/MeasurementLayout.tsx` | WIRED | Lines 15–17. | `/dashboards`, `/reports`, `/metrics` |
| `src/routes/measurement/DashboardsIndex.tsx` | WIRED | Line 8. | `/dashboards` |
| `src/routes/measurement/ExecutiveDashboard.tsx` | **STATIC** | No `useResource`. KPIs all hard-coded (lines 90–119: 75%, 2h 14m, 87%, 9); charts have titles only. | Needs aggregated metrics endpoint. |
| `src/routes/measurement/Reports.tsx` | WIRED | Line 39. | `/reports` |
| `src/routes/measurement/ReportBuilder.tsx` | **STATIC** | Local wizard state only; no submit endpoint. | Needs `POST /reports`. |
| `src/routes/measurement/MetricCatalog.tsx` | WIRED | Line 14. | `/metrics` |

## 16. Improvement

All six files in `src/routes/improvement/*` are WIRED via `improvementsService`:

| File | Endpoint(s) |
|------|-------------|
| `ImprovementsLayout.tsx` | `/improvements` |
| `ImprovementRegister.tsx` | `/improvements`, `/improvements/total-estimated-benefit-usd`, `/improvements/total-actual-benefit-usd` |
| `ImprovementDetail.tsx` | `/improvements/:id`, `/improvements/:id/roi-calculation` |
| `ImprovementKanban.tsx` | `/improvements`, `/improvements/benefit-measurements` |
| `ImprovementHeatmap.tsx` | `/improvements`, `/improvements/total-actual-benefit-usd` |
| `BenefitTracker.tsx` | `/improvements`, `/improvements/benefit-measurements` |

## 17. AI Workspace

| File | Status | Evidence | Endpoint(s) |
|------|--------|----------|-------------|
| `src/routes/ai/AiWorkspace.tsx` | PARTIAL | Sessions/active fetched (lines 36–37). **`getMockAiResponse()`** invoked at line 210 to simulate assistant replies (no streaming endpoint). | `/ai/sessions`, `/ai/active-session`; missing `POST /ai/sessions/:id/messages`. |

## 18. RBAC Admin

All `src/routes/admin/*` files are WIRED. Data flows via `CurrentUserContext` (loaded from `rbacService`) for reads; mutations call `rbacService.upsert*()` / `delete*()` and `adminApi.listPermissions()`.

| File | Operation surface |
|------|-------------------|
| `AdminLayout.tsx` | Context only |
| `AdminOverview.tsx` | Reads divisions/departments/teams/users/applications/roles from context |
| `Divisions.tsx` | `upsertDivision`, `deleteDivision` |
| `Departments.tsx` | `upsertDepartment`, `deleteDepartment` |
| `Teams.tsx` | `upsertTeam`, `deleteTeam` |
| `Users.tsx` | `upsertRbacUser`, `deleteRbacUser` |
| `Applications.tsx` | `upsertApplication`, `deleteApplication` |
| `Roles.tsx` | `upsertFunctionalRole`, `deleteFunctionalRole` |
| `Permissions.tsx` | `adminApi.listPermissions()` + static permission matrix from `src/lib/rbac` |

---

## Backend coverage check

All endpoints referenced above exist except:

- `GET/POST /users/:id/tokens` — required by Profile/Settings, **not implemented**.
- Notification channel persistence (email/SMS/Slack addresses on Settings) — **not implemented**; only preferences + quiet hours exist.
- `POST /requests/:id/comments` — RequestDetail comment box mutates local state only.
- `POST /ai/sessions/:id/messages` (or streaming SSE) — AI Workspace currently calls `getMockAiResponse()` client-side.
- Aggregated metrics for ExecutiveDashboard (overall MTTR, SLA %, change success %, open major incidents).
- `POST /reports` — ReportBuilder wizard has no save target.

## Recurring hard-coded date constants

These should be replaced with `Date.now()` / `new Date()` before launch:

| File | Constant |
|------|----------|
| `src/routes/incidents/IncidentQueue.tsx` (line 59) | `NOW = new Date('2026-05-09T00:00:00Z')` |
| `src/routes/requests/RequestQueue.tsx` (line 38) | `NOW = new Date('2026-05-09T10:00:00Z')` |
| `src/routes/requests/RequestDetail.tsx` (line 24) | `NOW = new Date('2026-05-09T10:00:00Z')` |
| `src/routes/continuity/DRPlans.tsx` (line 12) | `TODAY = new Date('2026-05-10')` |
| `src/routes/changes/NewChange.tsx` (lines 50–51) | `plannedStart/End` defaults `'2026-05-14T...'` |

## Sources of truth

- HTTP client: `src/services/core.ts` (`apiFetch`, `useResource`, `useMutation`).
- Base URL: `VITE_API_BASE_URL` (default `/api/v1`) via `src/services/apiMode.ts`.
- Server routers: `server/routes/{auth,admin,availability,capacity,cmdb,events,incidents,integrations,itsm,monitoring,platform}.ts`.
