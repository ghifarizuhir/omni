# Continuity

> **Route utama:** `/continuity/bia` · **ITIL 4 Practice:** Service Continuity Management · **Sumber kode:** `src/routes/continuity/`, `server/routes/platform.ts`

Modul Continuity mencakup BIA (Business Impact Analysis), DR Plans (Disaster Recovery), dan DR Tests dengan tabletop / functional / full-failover / chaos.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/continuity/bia` | `BIAMatrix` | BIA matrix + entries table |
| `/continuity/dr-plans` | `DRPlans` | Daftar DR plan + test runner |
| `/continuity/tests` | `DRTests` | Daftar DR test run + live panel |

`ContinuityLayout` accent: red (failed tests / catastrophic without active plan) / orange (drafts) / green.

---

## 2. Key Features

- **BIA matrix**: 2D grid RTOClass × ImpactLevel dengan hourly cost.
- **5 impact levels**: catastrophic ($38k/hr+), critical, major, moderate, minor.
- **5 RTO classes**: immediate (&lt;15min), short (15min-2h), medium (2-8h), long (8-24h), extended (&gt;24h).
- **Critical dependencies** dengan failover availability + hard/soft classification.
- **DR plan** structure: triggers, activation procedure, communication plan, recovery steps (sequential), rollback procedure, testing schedule.
- **DR test types**: tabletop (discussion), functional (partial), full_failover (complete), chaos (fault injection).
- **Live test panel** dengan real-time step results + issues + notes.
- **Compliance tracking** + cross-link ke incident/change.

---

## 3. BIAMatrix Page

### BIA Impact Matrix
2D grid dengan:
- Rows: RTOClass (immediate → extended)
- Columns: BIAImpactLevel (catastrophic → minor)
- Color-coded cells dengan hourly cost threshold per impact
- Click cell → detail drawer

### BIA Entries Table
Kolom: Service · Impact Level · RTO · RPO · Hourly Cost · Compliance · DR Plan · Last Reviewed.

Click row → **BIADetailDrawer**:
- Impact Assessment (level, score /100, hourly/daily cost)
- Recovery Objectives (RTO + class label, RPO)
- Scope (customer-facing, user segments, peak traffic, compliance)
- Critical Dependencies list (type icon, failover status, hard/soft)
- Continuity Risks
- Linked DR Plan card → button buka plan
- Review Metadata (last reviewed/by, approved, next review)

"+ New BIA entry" gated `continuity.update`.

---

## 4. DRPlans Page

### Status tabs
all · active · under_review · draft · overdue_review.

### Filter
Search (name/publicId), status dropdown, service filter.

### Overdue Review Banner
Plans dengan `reviewDueAt` lewat → weeks overdue, last tested, button filter.

### DRPlanCard
- Trigger conditions (first 2, expandable)
- Recovery steps summary + total estimated minutes
- Last tested + status pill (passed/failed/passed_with_issues)
- **Meta**: Linked BIA, review due (warning kalau overdue), approver
- **Actions**: Test now (primary) · View steps · Open detail
- Step list expansion: number badge, title, duration, owner, critical flag

### Test Runner Wizard
Modal initiated dari "Test now" → completion redirect ke `/continuity/tests`.

"+ New plan" gated `continuity.update`.

---

## 5. DRTests Page

### Active Test Banner
Display kalau ada test in_progress: plan ID, type chip, runtime, "X of Y steps complete, Z failures, Step N running" + progress bar + "View live test" button.

### Filter
Search (test ID/plan), Plan, Type (tabletop/functional/full_failover/chaos), Status (planned/in_progress/passed/passed_with_issues/failed/cancelled).

### Status tabs
all · in_progress · passed · passed_with_issues · failed.

### DRTestCard
- Status pill, publicId, plan name, test type chip
- Started date, duration formatted, environment
- **Progress bar** (in_progress only): X/Y steps + %
- **Results summary** (completed): RTO/RPO achieved vs target
- Issues count + severity breakdown
- Lessons learned (italic, line-clamp-2)
- Actions: View live (in_progress) / View full report

### LiveDRTestPanel (full-screen overlay)
- Header: test ID + status, Pause/Fail buttons
- Plan name + type chip + runtime + participants
- Step-by-step results (DRTestStepRow)
- Issues list (DRTestIssueCard)
- Notes log real-time (DRTestNotesLog)

"Schedule test" gated `continuity.update`.

---

## 6. User / UX Flow

### BIA review
1. Continuity manager buka `/continuity/bia`.
2. Lihat matrix → service Payment di catastrophic + immediate RTO.
3. Klik entry → drawer detail.
4. Cek dependencies & DR plan link.
5. Update review date.

### DR test execution
1. SRE buka /continuity/dr-plans, plan "DR-PAYMENT-FAIL".
2. Klik Test now → wizard pilih type=full_failover, environment=staging-dr.
3. Test starts → status `in_progress`, redirect ke /continuity/tests.
4. Live panel: monitor steps, log issues, add notes.
5. Selesai → status `passed_with_issues`, lessons learned ditulis.
6. Issues ditrack untuk follow-up.

---

## 7. State Model

```
DR Plan:    draft → approved → active → under_review → retired
DR Test:    planned → in_progress → passed / passed_with_issues / failed / cancelled
Test Step:  pending → in_progress → passed / failed / skipped
Issue:      open → in_progress → resolved
```

---

## 8. Roles & Permissions

| Permission | Aksi |
|---|---|
| `continuity.read` | Lihat semua (middleware guard) |
| `continuity.update` | Create/edit BIA, plan, test |

---

## 9. Upstream Dependencies

CMDB (services/CIs) · Users (stakeholders, IC, comms lead, tech lead) · Compliance frameworks.

---

## 10. Downstream Effects

- **Incidents**: DR plan execution bisa men-trigger atau di-trigger insiden major.
- **Changes**: linkedChangeIds untuk track recovery changes.
- **KB**: linkedKBSlugs untuk runbook references.
- **Improvements**: test issues → improvement initiative.
- **Availability**: BIA RTO/RPO = SLA target context.

---

## 11. Data Model

`BIAEntry`: id, publicId, serviceId/Name/Tier, impactLevel, impactScore (0-100), rto (minutes), rpoMinutes, rtoClass, estimatedHourlyCostUSD, estimatedDailyCostUSD, customerFacing, affectedUserSegments[], peakTrafficTimes, regulatoryCompliance[], criticalDependencies[] (type, dependencyType, failoverAvailable), linkedDRPlanIds, lastReviewedAt/By, nextReviewAt, approvedById/By, continuityRisks[], notes.

`DRPlan`: id, publicId, name, description, version, serviceIds[], serviceNames[], affectedCIIds, biaEntryIds, status, objectives, triggerConditions[], activationProcedure, communicationPlan, recoverySteps[] (DRPlanStep), rollbackProcedure, testingSchedule, contacts (incidentCommanderId, communicationsLeadId, technicalLeadId), stakeholders[], lastTestedAt/Status, testRunCount, reviewDueAt, approvedById/At, linkedChangeIds, linkedKBSlugs.

`DRTestRun`: id, publicId, planId/PublicId/Name, type, status, environment, isLive, objectives[], scope, plannedDate, startedAt, completedAt, durationMinutes, totalSteps/completedSteps/failedSteps, stepResults[] (DRTestStepResult), rtoAchievedMinutes vs Target, rpoAchievedMinutes vs Target, issues[] (DRTestIssue: severity critical/major/minor/observation, status, linkedChangePublicId), triggeredById/Name, participants[], lessonsLearned, recommendations, reviewedById/Name, signedOffAt, triggeredIncidentIds, linkedChangeIds.

---

## 12. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/continuity/dr-plans` | `continuity.read` |
| GET | `/continuity/dr-runs` | `continuity.read` |
| GET | `/continuity/bia` | `continuity.read` |

> Mutation endpoints belum ada (read-only API saat ini).

---

## 13. Realtime / Jobs

- **Live test updates**: WebSocket atau polling untuk LiveDRTestPanel.
- **Review reminder**: scheduled job nag plan dengan `reviewDueAt` lewat.
- **Test scheduler**: trigger test berdasarkan testingSchedule.

---

## 14. Open Gaps / TODO

- POST/PATCH endpoints belum ada (semua read-only di server).
- Live test panel auto-refresh masih manual.
- Compliance framework integration (e.g., ISO 22301) belum ada.
- Webhook integration untuk trigger DR plan otomatis dari incident belum.

---

**Lihat juga:** [Incidents](./incidents.md) · [Availability](./availability.md) · [Changes](./changes.md) · [CMDB](./cmdb.md)
