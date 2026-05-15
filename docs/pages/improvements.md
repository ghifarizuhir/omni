# Improvements

> **Route utama:** `/improvement` · **ITIL 4 Practice:** Continual Improvement · **Sumber kode:** `src/routes/improvement/`

Modul Improvements mengelola portfolio inisiatif perbaikan: dari ide → eksekusi → realisasi benefit, dengan ROI tracking.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/improvement` | `ImprovementRegister` | List + multi-filter + status tabs |
| `/improvement/kanban` | `ImprovementKanban` | Kanban 8-column by status |
| `/improvement/heatmap` | `ImprovementHeatmap` | Impact vs Effort scatter |
| `/improvement/benefits` | `BenefitTracker` | Realized benefit + ROI |
| `/improvement/:initiativeId` | `ImprovementDetail` | Detail (6 tab) |

`ImprovementsLayout` accent: red (critical blocked) → amber (overdue) → green (realisasi ≥50% estimate) → blue.

---

## 2. Key Features

- **8 lifecycle states**: identified → evaluating → approved → in_progress → validating → completed (atau on_hold/cancelled).
- **8 categories**: reliability, performance, security, process, cost, compliance, customer_experience, developer_experience.
- **6 source types**: problem, incident, capacity_recommendation, dr_finding, audit, proactive.
- **6 benefit types**: cost_reduction, revenue_protection, efficiency_gain, risk_reduction, compliance_value, quality_improvement.
- **Success metrics tracking**: currentValue → targetValue → achievedValue (post-completion).
- **Estimated vs actual**: benefit USD, effort days, cost, ROI%.
- **ROI calculation**: implementation cost, ongoing monthly cost, 12-month total, payback months, NPV 5yr, pessimistic/optimistic bounds.
- **Benefit measurement** periodic dengan methodology + isEstimate flag.

---

## 3. ImprovementRegister

### KPI strip
Portfolio value (estimated), in_progress count, completed (12 mo), actual benefit realized.

### Filter bar
Search (title/publicId/owner/tags), status (8), category (8), priority (4), owner (dynamic).

### Quick chips
- 🔥 High/Critical
- ⏱ Overdue target
- 📡 My initiatives
- 💰 High ROI (estimatedROIPercent &gt; 1000)

### Status tabs
all + per status dengan count (hanya tampil kalau &gt;0).

### Default sort
Priority (critical→low) → status (in_progress→approved→...) → target completion date asc.

### Tabel
Initiative · Status · Category · Priority · Progress (%) · Est. Benefit (USD) · Owner · Target.

"+ New initiative" gated `improvement.create`.

---

## 4. ImprovementKanban

Status-based 8-column board dengan drag-drop antar status.
Filter: category, owner, priority.

Card: title, priority badge, owner, target date, progress bar.

---

## 5. ImprovementHeatmap

Bubble matrix scatter:
- **X-axis**: Effort (estimatedEffortDays)
- **Y-axis**: Impact (estimated atau actual benefit USD)
- **Bubble size**: configurable (benefit / effort / ROI%)
- **Bubble color**: configurable (priority / category / status)

Status filter: active (default exclude completed/cancelled) / all / single.

Portfolio summary strip + heatmap gap analysis sidebar (sweet spot quadrant).

---

## 6. BenefitTracker

### Charts
- **Cumulative benefit** line chart (BenefitMeasurement cumulative USD by date)
- **Benefit by type** donut (BenefitType distribution)
- **Top contributors** by realized USD

### Measurement table
Initiative · benefit type · period · measured value (USD) · isEstimate flag · methodology.

### ROI calculator
Interactive scenario modeling.

"Log measurement" button → `LogBenefitModal` → `createBenefitMeasurement()` → refresh.

---

## 7. ImprovementDetail (6 tabs)

Header: publicId, category chip, priority color stripe, owner, started/target dates.

| Tab | Isi |
|---|---|
| **Overview** | current/target state, success metrics, benefit description, effort/cost/ROI estimates |
| **Progress** | update log, progress bar, metric achievement |
| **Metrics** | success metric performance (target vs achieved) |
| **ROI** | financial: planned vs realized, payback, NPV |
| **Linked Items** | problems, incidents, changes, metrics, DRs (per `sourceType`) |
| **Updates** | audit trail of `ImprovementUpdate` |

### Right sidebar
At-a-glance card (status, priority, category, progress, dates) · ROI summary panel · Quick actions: "Log update" gated `improvement.update` (resource ownerTeamId), "Move to Kanban" link.

---

## 8. User / UX Flow

### Source from PIR
1. Insiden P1 selesai → PIR menemukan action item "improve DB connection pooling".
2. Buat improvement initiative dari PIR, source=incident, linkedIncidentPublicId=INC-XXX.
3. Status `identified` → `evaluating` (estimate effort/benefit).
4. Approved → in_progress.
5. Log progress 50% → metric currentValue update.
6. Done → status `completed`, achievedValue diisi.
7. Bulan berikutnya: log BenefitMeasurement actual USD.

### Portfolio review
1. CTO buka /improvement/heatmap (impact vs effort).
2. Filter active, sweet spot quadrant kanan-atas.
3. Drill ke initiative di sweet spot → detail → ROI tab.

---

## 9. State Model

```
identified → evaluating → approved → in_progress → validating → completed
                                          ↓                ↓
                                       on_hold          cancelled
```

Update types: status_change, progress_update, comment, metric_update, linkage_added.

---

## 10. Roles & Permissions

| Permission | Aksi |
|---|---|
| `improvement.read` | Lihat (dengan filterReadable scope) |
| `improvement.create` | + button |
| `improvement.update` | Log update, edit (resource scope: ownerTeamId + ownerUserId) |

---

## 11. Upstream Dependencies

Problems (PIR) · Incidents (PIR) · Capacity (recommendations) · DR Tests (findings) · Audits · Changes (linked) · Metrics (linked).

---

## 12. Downstream Effects

- **Changes**: implementation lewat change request.
- **Metrics**: success metric tracking dipakai di Measurement.
- **Reports**: portfolio rollup di Executive Dashboard.

---

## 13. Data Model

`ImprovementInitiative`:
- Identity, title, description
- status, category, priority
- currentStateDescription, targetStateDescription
- successMetrics[] (currentValue, targetValue, achievedValue)
- estimatedBenefit (annualValueUSD, confidence), estimatedEffortDays, estimatedCostUSD, estimatedROIPercent
- actualBenefitUSD, actualEffortDays, actualCostUSD, actualROIPercent
- timeline: identifiedAt, approvedAt, startedAt, completedAt, targetCompletionDate, progressPercent
- ownerId/Name, ownerTeamId, sponsorId
- sourceType (6), linkedProblemPublicId, linkedIncidentPublicId, linkedRecommendationPublicId, linkedDRTestPublicId
- linkedChangePublicIds[], linkedMetricPublicIds[]
- updates[] (ImprovementUpdate), tags, timestamps

`ImprovementUpdate`: type (5), before/after progress, body, by, timestamp.

`BenefitMeasurement`: id, initiativeId, period, value USD, benefitType, isEstimate, methodology, recordedById, recordedAt.

`ROICalculation`: implementationCost, ongoingMonthlyCost, total12MonthCost, projectedAnnualBenefit, actualAnnualBenefit, roiPercent, paybackMonths, npv5yr, pessimistic/optimisticBounds.

---

## 14. API Endpoints

| Method | Endpoint |
|---|---|
| GET | `/improvements` |
| GET | `/improvements/:id` |
| GET | `/improvements/totals/estimated` |
| GET | `/improvements/totals/actual` |
| GET | `/improvements/benefit-measurements` |
| POST | `/improvements/benefit-measurements` |
| GET | `/improvements/roi` |
| GET | `/improvements/:initiativeId/roi` |

Permission `improvement.read` untuk GET, `improvement.update` untuk POST.

---

## 15. Realtime / Jobs

- **Overdue scanner** (planned): mark initiative dengan target lewat.
- **Benefit aggregator**: rollup per quarter untuk Measurement dashboard.

---

## 16. Open Gaps / TODO

- Mutation lengkap (create initiative, update, status transition) endpoint belum diformalkan.
- Drag-drop kanban masih state-only; tidak persist ke server.
- ROI calculator interactive belum konek ke benefit measurement realized data.
- Source PIR auto-create dari incident/problem detail belum 1-click.

---

**Lihat juga:** [Problems](./problems.md) · [Incidents](./incidents.md) · [Changes](./changes.md) · [Capacity](./capacity.md) · [Continuity](./continuity.md) · [Measurement](./measurement.md)
