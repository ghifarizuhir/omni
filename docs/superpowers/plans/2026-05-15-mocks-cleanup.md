# `src/mocks/` Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `src/mocks/` entirely. All runtime data already flows through `apiFetch`; the remaining mock files are either dead code or used only as TypeScript type carriers by `src/services/*.ts`.

**Architecture:** Two-pass cleanup. Pass 1 deletes mock files with **zero importers** (38 of 57). Pass 2 walks each service that imports a `type` from `src/mocks/<x>.ts`, inlines that type into the service file (or a co-located `<service>.types.ts`), updates the import, then deletes the mock file. After both passes finish, the `src/mocks/` directory is removed along with its barrel `index.ts`. Verification gates after each task: `npm run lint`, `npm run test`, and at the end a manual browser smoke test of a few real-data routes.

**Tech Stack:** TypeScript 5, Vite 6, React 19, Vitest. No new dependencies.

**Scope notes / non-goals:**
- Not refactoring service APIs — only moving the *type definitions* a mock exposes.
- Not renaming types from `MockX` → `X` in this plan to keep diffs reviewable. A follow-up plan can do the rename.
- Keep commits per-task so any single step can be reverted.

---

## File Inventory

**Mock files used only as `type` imports (18 files — Pass 2 targets):**

| Mock file | Type(s) exported | Consumer service |
|---|---|---|
| `availabilityData.ts` | `mockAvailabilityData` (typeof) | `availabilityService.ts` |
| `dailyServiceHealth.ts` | `mockDailyServiceHealth` | `availabilityService.ts` |
| `services.ts` | `MockService` | `cmdbService.ts` |
| `benefitMeasurements.ts` | `mockBenefitMeasurements` | `itsmServices.ts`, `platformServices.ts` |
| `roiCalculations.ts` | `mockROICalculations`, `getROICalculation` | `itsmServices.ts`, `platformServices.ts` |
| `notifications.ts` | `mockNotifications`, `MockNotificationItem` | `platformServices.ts`, `routes/platform/Notifications.tsx` |
| `notificationPreferences.ts` | `mockNotificationPreferences`, `mockQuietHours` | `platformServices.ts` |
| `inbox.ts` | `legacyMockInboxItems` | `platformServices.ts` |
| `inboxItems.ts` | `mockInboxItems` | `platformServices.ts` |
| `onCallSchedules.ts` | `mockOnCallSchedules` | `platformServices.ts` |
| `onCallOverrides.ts` | `mockOnCallOverrides` | `platformServices.ts` |
| `kbFeedback.ts` | `mockKBFeedback` | `platformServices.ts` |
| `kbAnalytics.ts` | `kbAnalytics` | `platformServices.ts` |
| `statusPageEntries.ts` | `mockStatusPageEntries`, `mockStatusPageIncidents` | `platformServices.ts` |
| `rbac.ts` | `mockRbacUsers`, `mockRbacTeams`, `mockApplications`, `mockDepartments`, `mockDivisions`, `mockFunctionalRoles` | `platformServices.ts` |
| `reports.ts` | `mockReports` | `platformServices.ts` |
| `measurementDashboards.ts` | `mockMeasurementDashboards` | `platformServices.ts` |
| `metricDefinitions.ts` | `mockMetricDefinitions` | `platformServices.ts` |

**Mock files with zero importers (38 files — Pass 1 deletions):**
`aiSessions, alertRoutes, biaEntries, capacityForecasts, capacityMetrics, capacityThresholds, capacityTimeSeries, catalogItems, changes, ciAudit, ciRelationships, cis, deploymentLogs, deployments, drPlans, drTestRuns, environments, events, improvements, incidentComments, incidents, incidentTimelines, integrations, kbArticles, kbCategories, monitoringRules, outages, problems, releases, scalingRecommendations, serviceRequests, signOffs, slaBreaches, slaTargets, teams, testCases, testPlans, testRuns, users`

**Barrel:** `src/mocks/index.ts` — re-exports everything; verified to have no importers via `grep -rn "from ['\"].*mocks['\"]" src/` returning empty.

---

## Task 1: Delete unused mock files

**Files:**
- Delete: 38 files in `src/mocks/` (see Pass 1 list above)

- [ ] **Step 1: Confirm zero importers for each candidate**

```bash
cd /home/ubuntu/omni
for f in aiSessions alertRoutes biaEntries capacityForecasts capacityMetrics \
         capacityThresholds capacityTimeSeries catalogItems changes ciAudit \
         ciRelationships cis deploymentLogs deployments drPlans drTestRuns \
         environments events improvements incidentComments incidents \
         incidentTimelines integrations kbArticles kbCategories monitoringRules \
         outages problems releases scalingRecommendations serviceRequests \
         signOffs slaBreaches slaTargets teams testCases testPlans testRuns users; do
  hits=$(grep -rln "mocks/$f['\"]\|mocks/$f\$" src/ --include='*.ts' --include='*.tsx' | grep -v "src/mocks/" || true)
  if [ -n "$hits" ]; then echo "STILL USED: $f -> $hits"; fi
done
```

Expected: no `STILL USED:` lines. If any appear, drop that file from the deletion list and add a Pass 2 task for it.

- [ ] **Step 2: Delete the 38 files**

```bash
cd /home/ubuntu/omni/src/mocks
rm -f aiSessions.ts alertRoutes.ts biaEntries.ts capacityForecasts.ts \
      capacityMetrics.ts capacityThresholds.ts capacityTimeSeries.ts \
      catalogItems.ts changes.ts ciAudit.ts ciRelationships.ts cis.ts \
      deploymentLogs.ts deployments.ts drPlans.ts drTestRuns.ts \
      environments.ts events.ts improvements.ts incidentComments.ts \
      incidents.ts incidentTimelines.ts integrations.ts kbArticles.ts \
      kbCategories.ts monitoringRules.ts outages.ts problems.ts releases.ts \
      scalingRecommendations.ts serviceRequests.ts signOffs.ts slaBreaches.ts \
      slaTargets.ts teams.ts testCases.ts testPlans.ts testRuns.ts users.ts
```

- [ ] **Step 3: Trim `src/mocks/index.ts` so it only re-exports surviving files**

Open `src/mocks/index.ts`. Remove every `export * from './<deleted-file>';` line for the 38 files above. The 18 type-carrier files (and only those) should remain. Pass 2 will delete this file entirely at the end.

- [ ] **Step 4: Run lint and tests**

```bash
cd /home/ubuntu/omni
npm run lint
npm run test
```

Expected: both pass. If `tsc` flags a missing export, that mock had a hidden importer — restore the file and audit.

- [ ] **Step 5: Commit**

```bash
git add -A src/mocks/
git commit -m "chore(mocks): delete 38 unused mock files (pass 1 of mocks/ cleanup)"
```

---

## Task 2: Migrate `availabilityService` type-only mocks

**Files:**
- Modify: `src/services/availabilityService.ts`
- Delete: `src/mocks/availabilityData.ts`, `src/mocks/dailyServiceHealth.ts`

- [ ] **Step 1: Read what is actually being imported**

```bash
grep -n "mocks" /home/ubuntu/omni/src/services/availabilityService.ts
sed -n '1,40p' /home/ubuntu/omni/src/mocks/availabilityData.ts
sed -n '1,40p' /home/ubuntu/omni/src/mocks/dailyServiceHealth.ts
```

Identify the exported `const` declarations whose **type** is referenced from `availabilityService.ts` (via `typeof mockX[number]` or `typeof mockX`). Copy the literal type shape — usually an interface or the inferred element type.

- [ ] **Step 2: Inline the types into `availabilityService.ts`**

In `src/services/availabilityService.ts`:
1. Remove lines `import type { mockDailyServiceHealth } from '../mocks/dailyServiceHealth';` and `import type { mockAvailabilityData } from '../mocks/availabilityData';`.
2. Just below the remaining imports add explicit interface declarations that match the shape of one element of each removed array. Example pattern (replace fields with the actual ones from Step 1):

```ts
// Local row shapes for availability snapshots. These were previously inferred
// from src/mocks/* but the mocks held no live data; the API returns rows of
// this shape directly.
export interface AvailabilityDataPoint {
  // <copy fields from the mock literal>
}

export interface DailyServiceHealthRow {
  // <copy fields from the mock literal>
}
```

3. Replace every downstream use of `typeof mockAvailabilityData[number]` with `AvailabilityDataPoint`, and `typeof mockDailyServiceHealth[number]` with `DailyServiceHealthRow`.

- [ ] **Step 3: Delete the two mock files**

```bash
rm /home/ubuntu/omni/src/mocks/availabilityData.ts /home/ubuntu/omni/src/mocks/dailyServiceHealth.ts
```

- [ ] **Step 4: Remove their lines from `src/mocks/index.ts`**

Delete `export * from './availabilityData';` and `export * from './dailyServiceHealth';`.

- [ ] **Step 5: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/availabilityService.ts src/mocks/
git commit -m "refactor(availability): inline mock-derived types into service, drop two mock files"
```

---

## Task 3: Migrate `cmdbService` type-only mock

**Files:**
- Modify: `src/services/cmdbService.ts`
- Delete: `src/mocks/services.ts`

- [ ] **Step 1: Inspect the import and the mock shape**

```bash
grep -n "MockService\|mocks/services" /home/ubuntu/omni/src/services/cmdbService.ts
sed -n '1,40p' /home/ubuntu/omni/src/mocks/services.ts
```

- [ ] **Step 2: Inline `MockService` into `cmdbService.ts`**

In `src/services/cmdbService.ts`:
1. Remove `import type { MockService } from '../mocks/services';`.
2. Add the literal `MockService` interface (copy verbatim from `src/mocks/services.ts`) below the remaining imports. Keep the name `MockService` for now to avoid touching call sites.

- [ ] **Step 3: Delete the mock and prune the barrel**

```bash
rm /home/ubuntu/omni/src/mocks/services.ts
```

In `src/mocks/index.ts`, remove `export * from './services';`.

- [ ] **Step 4: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/services/cmdbService.ts src/mocks/
git commit -m "refactor(cmdb): inline MockService type into service, drop src/mocks/services.ts"
```

---

## Task 4: Migrate `itsmServices` type-only mocks

**Files:**
- Modify: `src/services/itsmServices.ts`, `src/services/platformServices.ts`
- Delete: `src/mocks/benefitMeasurements.ts`, `src/mocks/roiCalculations.ts`

Note: both files are also imported by `platformServices.ts`. Handle both consumers in this single task so we can delete the source files.

- [ ] **Step 1: Inspect**

```bash
grep -n "benefitMeasurements\|roiCalculations" /home/ubuntu/omni/src/services/itsmServices.ts /home/ubuntu/omni/src/services/platformServices.ts
sed -n '1,60p' /home/ubuntu/omni/src/mocks/benefitMeasurements.ts
sed -n '1,60p' /home/ubuntu/omni/src/mocks/roiCalculations.ts
```

- [ ] **Step 2: Pick a single home for the shared types**

These two shapes are used by two services, so inlining duplicates them. Create `src/services/measurementTypes.ts` with the two interfaces:

```ts
// Shared shapes for benefit-measurement and ROI calculation rows. Previously
// `typeof mockBenefitMeasurements[number]` / `typeof mockROICalculations[number]`
// from src/mocks; the mocks held no live data and have been removed.

export interface BenefitMeasurement {
  // <copy fields from src/mocks/benefitMeasurements.ts literal>
}

export interface ROICalculation {
  // <copy fields from src/mocks/roiCalculations.ts literal>
}
```

If `roiCalculations.ts` also exports a helper like `getROICalculation`, decide: if it has no callers beyond type-position references, drop it; if it has runtime callers, move the function body into the same `measurementTypes.ts` file (rename file to `measurementTypes.ts` regardless; keep helper as a named export).

- [ ] **Step 3: Update both consumers**

In `src/services/itsmServices.ts` and `src/services/platformServices.ts`:
1. Remove the two `import type { mock... } from '../mocks/...'` lines.
2. Replace any `typeof mockBenefitMeasurements[number]` with `BenefitMeasurement`, `typeof mockROICalculations[number]` with `ROICalculation`. Add `import type { BenefitMeasurement, ROICalculation } from './measurementTypes';` to each file that needs them.

- [ ] **Step 4: Delete the mock files and prune the barrel**

```bash
rm /home/ubuntu/omni/src/mocks/benefitMeasurements.ts /home/ubuntu/omni/src/mocks/roiCalculations.ts
```

In `src/mocks/index.ts`, remove the two `export * from './benefitMeasurements'` / `'./roiCalculations'` lines.

- [ ] **Step 5: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/itsmServices.ts src/services/platformServices.ts src/services/measurementTypes.ts src/mocks/
git commit -m "refactor(measurement): extract shared types, drop benefitMeasurements + roiCalculations mocks"
```

---

## Task 5: Migrate `platformServices` mocks — Inbox + Notifications subset

**Files:**
- Create: `src/services/platformTypes.ts`
- Modify: `src/services/platformServices.ts`, `src/routes/platform/Notifications.tsx`
- Delete: `src/mocks/inbox.ts`, `src/mocks/inboxItems.ts`, `src/mocks/notifications.ts`, `src/mocks/notificationPreferences.ts`

- [ ] **Step 1: Inspect the four mocks**

```bash
for m in inbox inboxItems notifications notificationPreferences; do
  echo "=== $m ==="
  sed -n '1,50p' /home/ubuntu/omni/src/mocks/$m.ts
done
```

- [ ] **Step 2: Create `src/services/platformTypes.ts`**

This file will be the new home for all `platformServices.ts`-internal shapes. Start it with the inbox/notifications shapes. Replace field lists with the actual ones from the mock literals.

```ts
// Type carriers for src/services/platformServices.ts. Previously each lived in
// src/mocks/<x>.ts alongside dead seed arrays; the arrays were never consumed
// at runtime, so we keep only the shapes.

export interface InboxItem {
  // <copy from mockInboxItems literal>
}

export interface LegacyInboxItem {
  // <copy from legacyMockInboxItems literal>
}

export interface NotificationItem {
  // <copy from MockNotificationItem interface verbatim>
}

export interface NotificationPreference {
  // <copy from mockNotificationPreferences literal>
}

export interface QuietHours {
  // <copy from mockQuietHours literal>
}
```

- [ ] **Step 3: Update `platformServices.ts`**

In `src/services/platformServices.ts`:
1. Remove the four corresponding `import type { ... } from '../mocks/...'` lines (mockNotifications, mockNotificationPreferences/mockQuietHours, legacyMockInboxItems, mockInboxItems).
2. Add `import type { InboxItem, LegacyInboxItem, NotificationItem, NotificationPreference, QuietHours } from './platformTypes';`.
3. Replace each `typeof mockX[number]` / `typeof mockX` reference with the new local name.

- [ ] **Step 4: Update `src/routes/platform/Notifications.tsx`**

1. Remove `import type { MockNotificationItem } from '@/src/mocks/notifications';`.
2. Add `import type { NotificationItem } from '@/src/services/platformTypes';`.
3. Replace both occurrences of `MockNotificationItem` with `NotificationItem`.

- [ ] **Step 5: Delete the four mocks and prune the barrel**

```bash
rm /home/ubuntu/omni/src/mocks/inbox.ts \
   /home/ubuntu/omni/src/mocks/inboxItems.ts \
   /home/ubuntu/omni/src/mocks/notifications.ts \
   /home/ubuntu/omni/src/mocks/notificationPreferences.ts
```

In `src/mocks/index.ts` remove the four matching `export *` lines.

- [ ] **Step 6: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/platformTypes.ts src/services/platformServices.ts \
        src/routes/platform/Notifications.tsx src/mocks/
git commit -m "refactor(platform): move inbox+notification types out of mocks/, drop 4 files"
```

---

## Task 6: Migrate `platformServices` mocks — On-call + KB + Status page subset

**Files:**
- Modify: `src/services/platformTypes.ts`, `src/services/platformServices.ts`
- Delete: `src/mocks/onCallSchedules.ts`, `src/mocks/onCallOverrides.ts`, `src/mocks/kbFeedback.ts`, `src/mocks/kbAnalytics.ts`, `src/mocks/statusPageEntries.ts`

- [ ] **Step 1: Inspect**

```bash
for m in onCallSchedules onCallOverrides kbFeedback kbAnalytics statusPageEntries; do
  echo "=== $m ==="
  sed -n '1,50p' /home/ubuntu/omni/src/mocks/$m.ts
done
```

- [ ] **Step 2: Append type definitions to `src/services/platformTypes.ts`**

Add these interfaces (copy fields from the literals seen in Step 1):

```ts
export interface OnCallSchedule {
  // <copy from mockOnCallSchedules literal>
}

export interface OnCallOverride {
  // <copy from mockOnCallOverrides literal>
}

export interface KBFeedbackEntry {
  // <copy from mockKBFeedback literal>
}

export interface KBAnalytics {
  // <copy from kbAnalytics literal>
}

export interface StatusPageEntry {
  // <copy from mockStatusPageEntries literal>
}

export interface StatusPageIncident {
  // <copy from mockStatusPageIncidents literal>
}
```

- [ ] **Step 3: Update `platformServices.ts`**

Remove the five `import type ... from '../mocks/...'` lines for these mocks. Extend the existing `import type { ... } from './platformTypes';` to include the new names. Replace downstream `typeof mockX` references.

- [ ] **Step 4: Delete the mocks and prune the barrel**

```bash
rm /home/ubuntu/omni/src/mocks/onCallSchedules.ts \
   /home/ubuntu/omni/src/mocks/onCallOverrides.ts \
   /home/ubuntu/omni/src/mocks/kbFeedback.ts \
   /home/ubuntu/omni/src/mocks/kbAnalytics.ts \
   /home/ubuntu/omni/src/mocks/statusPageEntries.ts
```

Remove the five matching lines in `src/mocks/index.ts`.

- [ ] **Step 5: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/platformTypes.ts src/services/platformServices.ts src/mocks/
git commit -m "refactor(platform): move on-call + KB + status-page types out of mocks/, drop 5 files"
```

---

## Task 7: Migrate `platformServices` mocks — RBAC + Measurement subset (final 6)

**Files:**
- Modify: `src/services/platformTypes.ts`, `src/services/platformServices.ts`
- Delete: `src/mocks/rbac.ts`, `src/mocks/reports.ts`, `src/mocks/measurementDashboards.ts`, `src/mocks/metricDefinitions.ts`

- [ ] **Step 1: Inspect**

```bash
for m in rbac reports measurementDashboards metricDefinitions; do
  echo "=== $m ==="
  sed -n '1,80p' /home/ubuntu/omni/src/mocks/$m.ts
done
```

Note: `rbac.ts` exports **six** shapes — `mockRbacUsers, mockRbacTeams, mockApplications, mockDepartments, mockDivisions, mockFunctionalRoles`. All six need interface equivalents.

- [ ] **Step 2: Append type definitions to `src/services/platformTypes.ts`**

```ts
export interface RbacUser {
  // <copy from mockRbacUsers element>
}

export interface RbacTeam {
  // <copy from mockRbacTeams element>
}

export interface RbacApplication {
  // <copy from mockApplications element>
}

export interface RbacDepartment {
  // <copy from mockDepartments element>
}

export interface RbacDivision {
  // <copy from mockDivisions element>
}

export interface FunctionalRole {
  // <copy from mockFunctionalRoles element>
}

export interface Report {
  // <copy from mockReports element>
}

export interface MeasurementDashboard {
  // <copy from mockMeasurementDashboards element>
}

export interface MetricDefinition {
  // <copy from mockMetricDefinitions element>
}
```

- [ ] **Step 3: Update `platformServices.ts`**

Remove the four `import type ... from '../mocks/...'` lines (one of them imports six names from `rbac`). Extend the existing local-types import. Replace `typeof mockX` references with the new names.

- [ ] **Step 4: Delete the four mocks and prune the barrel**

```bash
rm /home/ubuntu/omni/src/mocks/rbac.ts \
   /home/ubuntu/omni/src/mocks/reports.ts \
   /home/ubuntu/omni/src/mocks/measurementDashboards.ts \
   /home/ubuntu/omni/src/mocks/metricDefinitions.ts
```

Remove the four matching lines from `src/mocks/index.ts`. At this point `src/mocks/index.ts` should re-export nothing.

- [ ] **Step 5: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/platformTypes.ts src/services/platformServices.ts src/mocks/
git commit -m "refactor(platform): move rbac + measurement types out of mocks/, drop 4 files"
```

---

## Task 8: Remove `src/mocks/` directory and stale references

**Files:**
- Delete: `src/mocks/index.ts`, the now-empty `src/mocks/` directory
- Modify: `src/lib/auth/session.ts` (stale comment), `CLAUDE.md` (directory layout)

- [ ] **Step 1: Confirm `src/mocks/` is empty apart from `index.ts`**

```bash
ls /home/ubuntu/omni/src/mocks
```

Expected output: `index.ts` only. If any other file remains, return to the earlier task that should have removed it.

- [ ] **Step 2: Confirm no surviving import points at `src/mocks/`**

```bash
grep -rn "from ['\"].*mocks/\|from ['\"]@/src/mocks" /home/ubuntu/omni/src --include='*.ts' --include='*.tsx'
```

Expected: empty (apart from comments). If any matches appear, fix them — do not proceed.

- [ ] **Step 3: Delete the directory**

```bash
rm -rf /home/ubuntu/omni/src/mocks
```

- [ ] **Step 4: Clean up the stale comment in `src/lib/auth/session.ts`**

Open `src/lib/auth/session.ts`. The comment at line 3 says:

```
// Replaces the legacy `import { currentUser } from '@/src/mocks/users'` pattern
```

Either delete the comment outright (preferred — no future reader needs the historical reference) or rewrite it without the dead path. Use Edit to remove just that line.

- [ ] **Step 5: Update `CLAUDE.md`**

In the directory layout table, remove the row:

```
| `src/mocks/` | Legacy static mock data — being replaced by API calls |
```

In the "Data Layer" section, drop the second paragraph about `src/mocks/` as a transitional shim.

- [ ] **Step 6: Verify**

```bash
cd /home/ubuntu/omni && npm run lint && npm run test
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add -A src/ CLAUDE.md
git commit -m "chore(mocks): remove src/mocks/ directory and stale references"
```

---

## Task 9: Browser smoke test of real-data routes

This task verifies that the URL-construction fix from earlier in the session (`src/services/core.ts`) plus the cleanup above didn't break any live page. **Do not skip — type-checks confirm shape but not behavior.**

**Prereqs:** Postgres + Redis containers running (`sudo docker compose ps` shows both healthy); API on :3001; Vite on :3000. If either is down, restart with `npm run dev:all`.

- [ ] **Step 1: Log in via the UI**

Open `http://<host>:3000/login` in a browser. Sign in with `admin@local.dev` / `ChangeMe!123`. Expected: redirect to `/` (Dashboard). DevTools Network tab should show `POST /api/v1/auth/login` → 200 and `GET /api/v1/auth/me` → 200.

- [ ] **Step 2: Walk through real-data routes**

For each of the routes below: navigate to the URL, confirm data loads (no skeleton stuck, no error banner, no 404 in Network).

| Route | What it exercises |
|---|---|
| `/` | Dashboard — multiple aggregations |
| `/cmdb` | `cmdbService` list |
| `/cmdb/graph` | CMDB relationships |
| `/events` | Monitoring events list |
| `/monitoring/rules` | Monitoring rules |
| `/incidents` (or whichever incidents route is implemented) | `incidentsService` |
| `/platform/notifications` | Notifications type rename landed cleanly |

- [ ] **Step 3: Record results**

For each route, note one of: ✅ loads, ⚠️ loads with warning (capture console message), ❌ broken (capture status + URL of failing request). If any ❌ appears, open a bug, do **not** mark the plan complete.

- [ ] **Step 4: No commit needed**

This task produces no diff. Plan is complete when all routes are ✅ or all ⚠️ are accepted by the user.

---

## Rollback Notes

Each task commits independently. To undo the whole cleanup:

```bash
git log --oneline | head -10                       # find pre-Task-1 commit
git revert <last-cleanup-commit>..HEAD             # or
git reset --hard <pre-task-1-sha>                  # destructive — coordinate first
```

If a single task surfaces a runtime regression that lint/tests missed, revert just that commit and re-plan that subset.
