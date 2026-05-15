# Testing

> **Route utama:** `/testing/plans` · **ITIL 4 Practice:** Service Validation & Testing · **Sumber kode:** `src/routes/testing/`, `server/routes/platform.ts`

Modul Testing mengelola test plan, test case, test run execution, dan sign-off workflow yang menggate release/change.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/testing/plans` | `TestPlans` | Daftar test plan |
| `/testing/cases` | `TestCases` | Daftar test case authoring |
| `/testing/runs` | `TestRuns` | Eksekusi run + insights |
| `/testing/sign-off` | `SignOffQueue` | Sign-off approval queue |

`TestingLayout` membungkus 4 tab dengan header KPI: active plans, runs in progress, 30d pass rate, pending sign-offs, SLA-breached.

Accent color: red kalau breached, orange &lt;80%, green ≥95%.

---

## 2. Key Features

- **Test Plan** types: release, regression, smoke, load, security, compliance.
- **Test Case** types: functional, integration, smoke, performance, security, manual; priorities P0-P3; automation flag + framework.
- **Test Run** status: pending, running, passed, failed, partial, cancelled, timed_out; triggers manual/cicd/scheduled/pre-deployment/post-deployment.
- **Per-case results** dengan flake detection (flakeRate &gt;5%).
- **Sign-off** types: release_validation, change_validation, security_scan, compliance_check; SLA breach tracking.
- **Live test** banner untuk run in_progress.
- **Failed cases panel** + flaky test panel di TestRuns sidebar.

---

## 3. TestPlans Page

Filter: search (name/ID/component), component dropdown, status filter (active/draft/archived), owner.

Type chips (All / Regression / Smoke / Load / Compliance / Security) + Quality chips (Pass rate ≥95%, Below 90%, Last run &lt;24h).

Tabel: Public ID · Name · Type · Component · Cases count · Last run · Pass rate (30d) · Owner · Actions.

"+ New plan" gated `testing.update`.

---

## 4. TestCases Page

Filter: search (title/publicId/steps), type/priority/plan/automated/status.

Priority chips (P0-P3) + Type chips (color-coded) + Quality chips (Flaky &gt;10%, Never failed).

Tabel: Public ID · Title · Type · Priority · Automated (yes + framework, atau dash) · Plans count · Last result (icon + relative) · Flake rate % · Actions.

Sort: priority asc → title alphabetical.

---

## 5. TestRuns Page

### Active Test Banner (top)
Live runs dengan progress.

### Filter
Search (plan/runId/env), Plan, Environment, Triggered by, Reset.

### Status chips
All · Running · Passed · Failed · Partial.

### Trigger chips
Pre-deployment · Scheduled · Manual.

### Quick chips
- Failed last 24h (red Flame)
- Flaky tests detected (orange AlertTriangle)
- Live (blue Radio)
- Production runs (purple Building2)

### Run Cards
Status badge, plan link, environment, duration, pass/fail breakdown, top failures (kalau ada), expand untuk case results.

### Right sidebar (3 cards)
- **Test Health**: Pass rate 30d (color ≥90/75/&lt;75), 7d, Avg duration, Total runs 30d.
- **Flaky Tests**: top 5 dengan flake % + "Review" link.
- **Failed Cases (7d)**: top 5 dengan title + "View all".

Sort: running first, lalu createdAt desc.

---

## 6. SignOffQueue

### Active Banner
Highlighted untuk pending sign-off in_progress.

### Quick filters (atas)
- My pending (count assigned current user)
- SLA at risk (&lt;24h until dueAt)
- Release validations

### Filter bar
Search (title/publicId/subject/approver), Type, Status, Approver, SLA (Due today/this week/Breached), Reset.

### Cards
SignOffCard:
- Status badge color-coded (pending=orange, approved=green, rejected=red, expired=gray)
- PublicId + Type icon + Title + Subject
- "X of Y runs passed" test summary
- 2-col: Approver name/role · Due date with SLA indicator
- Evidence list
- **Approve / Reject** buttons kalau pending dan current user = approver
- Approved/Rejected info dengan timestamp + decision note

### Modals
- **Approve**: optional note, 2 checkboxes (evidence reviewed wajib + schedule follow-up optional). Approve disabled sampai evidence checked.
- **Reject**: reason wajib.

Sort: pending first, lalu dueAt asc.

---

## 7. User / UX Flow

### Validation flow
1. Release manager link test plan ke release.
2. Pre-deployment trigger create test run.
3. Run jalan → status `running` (live banner).
4. Selesai → `passed` / `failed` / `partial`.
5. Pass rate & failed cases muncul di analytics.

### Sign-off flow
1. Release siap promote → buat sign-off `release_validation`, assign approver.
2. Approver buka SignOffQueue, lihat evidence (test runs).
3. Klik Approve → modal → check evidence box → submit.
4. Status `approved`, decidedAt + decisionNote distempel.
5. Release lanjut promote.

---

## 8. State Model

```
Test Plan:    draft → active → archived
Test Case:    active ↔ flaky → archived
Test Run:     pending → running → passed/failed/partial/cancelled/timed_out
Sign-off:     pending → approved/rejected/expired (terminal)
```

Per-case: pending → running → passed/failed/skipped.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `testing.read` | STA/IFM/APS any | Lihat semua |
| `testing.update` | APS Officer+ | Create/edit plans & cases, trigger runs |
| `testing.approve` | APS Team Lead+ atau Change Manager | Sign-off approve/reject |

UI guard: `Can module="testing" action="update"` untuk + buttons; `useCan('testing','approve')` untuk sign-off actions (read-only message kalau tidak punya).

---

## 10. Upstream Dependencies

Releases (linkedReleaseIds) · Changes (linkedChangeIds) · Deployments (linkedDeploymentId) · Users.

---

## 11. Downstream Effects

- **Releases**: sign-off approved → release boleh promote.
- **Changes**: sign-off approved → change boleh implement.
- **Incident PIR**: sign-off type `compliance_check` bisa attach ke incident.

---

## 12. Data Model

`TestPlan`: id, publicId, name, type, status, componentName, affectedCIIds, linkedReleaseIds, linkedChangeIds, testCaseIds[], caseCount, estimatedDurationMin, requiredEnvironment[], prerequisites[], lastRunAt/Status, totalRuns, passRate30d, owner, tags.

`TestCase`: id, publicId, title, type, priority (p0-p3), status (active/archived/flaky), preconditions, steps[], postconditions, isAutomated + automationFramework + automationRef, affectedCIIds, linkedRequirementIds, containedInPlans[], executionCount, failureCount, flakeRate, lastExecutedAt/Result, averageDurationSec, owner, tags.

`TestRun`: id, publicId, testPlanId/PublicId/Name, status, triggeredBy/ById/Name, environment, linkedDeploymentId/PublicId, linkedReleasePublicId, startedAt/completedAt/durationSec, totalCases/passedCount/failedCount/skippedCount/pendingCount, passRate, caseResults[] (TestRunCaseResult), topFailures[], pipelineRunId/Url, artifactRef.

`SignOff`: id, publicId, type, status, title, subjectType (release/change/incident_pir), subjectId/PublicId/Title, testRunIds[] + testRunSummary, requestedById/Name/At, approverId/Name/Role, decidedAt, decision, decisionNote, dueAt, slaBreached.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/testing/plans` | `testing.read` |
| GET | `/testing/cases?planId=` | `testing.read` |
| GET | `/testing/runs?active=true` | `testing.read` |
| GET | `/testing/sign-offs` | `testing.read` |

Document storage pattern (kind: test-plan / test-case / test-run / sign-off).

---

## 14. Realtime / Jobs

- **Test runner orchestrator**: external CI/CD push run progress.
- **SLA scheduler**: scan sign-offs `dueAt`, mark slaBreached.
- **Flake detector**: hitung flakeRate dari historical runs.

---

## 15. Open Gaps / TODO

- Mutation endpoint (create plan/case/run/sign-off) belum diformalkan.
- Sign-off rejection note belum required di server validation.
- Test run live updates bergantung webhook external.
- Test case versioning belum ada.

---

**Lihat juga:** [Releases](./releases.md) · [Changes](./changes.md) · [Deployments](./deployments.md) · [Incidents](./incidents.md)
