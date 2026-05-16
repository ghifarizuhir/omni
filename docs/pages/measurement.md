# Measurement

> **Route utama:** `/dashboards` · **ITIL 4 Practice:** Measurement & Reporting · **Sumber kode:** `src/routes/measurement/`, `server/routes/platform.ts`

Modul Measurement menyediakan dashboards, report builder/scheduler, dan metric catalog untuk eksekutif maupun operasional.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/dashboards` | `DashboardsIndex` | Grid dashboard tersedia |
| `/dashboards/exec` | `ExecutiveDashboard` | KPI eksekutif (SLA, MTTR, change success, incidents) |
| `/reports` | `Reports` | Daftar report (scheduled / on-demand) |
| `/reports/builder` | `ReportBuilder` | Wizard 3-step buat report custom |
| `/metrics/catalog` | `MetricCatalog` | Katalog definisi metric |

`MeasurementLayout` accent: orange kalau ada failed report, default biru. Stats: dashboard count, report count, metric count.

---

## 2. Key Features

- **5 dashboard types**: executive, operational, sla, capacity, custom.
- **7 report types**: monthly_summary, sla_report, incident_report, change_report, availability_report, capacity_report, custom.
- **5 frequency**: on_demand, daily, weekly, monthly, quarterly.
- **4 format**: PDF, Excel, CSV, JSON.
- **8 metric categories**: availability, reliability, performance, change_management, incident_management, capacity, service_request, knowledge.
- **6 valueTypes**: count, percentage, duration, bytes, currency, ratio.
- **Real-time KPI** dari incidents/changes/services modules.
- **Report builder** wizard 3-step dengan multi-recipient delivery.

---

## 3. DashboardsIndex

Grid 1/2/3 col card dashboard. Klik card → `/dashboards/exec` (saat ini hardcoded ke Executive).

---

## 4. ExecutiveDashboard

### KPI cards (4)
1. **SLA Compliance** % vs prev period, target 100%, threshold ≥99% good / ≥95% warning.
2. **MTTR** minutes, lower-is-better, target 30m.
3. **Change Success Rate** %, target 95%.
4. **Active Incidents** dengan P1/P2 breakdown, status red kalau P1 active.

### Filter
- Time range: 7d / 30d / 90d
- Service filter dropdown (filter incidents by `affectedServiceIds`)

### Charts
- **AvailabilityTrendChart**: uptime over time
- **IncidentVolumeChart**: stacked bar by severity P1-P4 (weekly buckets)
- **ChangeOutcomesChart**: pie/donut Successful/Failed/Cancelled/In Progress
- **SLAComplianceTable**: per-service uptime vs target

### Summary Statistics (3 rows × 3 stats)
1. Resolved incidents, avg MTTR, total downtime
2. Changes implemented, success rate, failed
3. Open incidents, P1 active, SLA breaches

### Calculation logic
MTTR: `avg((resolvedAt - createdAt) / 60_000)` minutes. SLA Compliance: % insiden tanpa breach. Change Success: % closed_successful dari total finished.

---

## 5. Reports

Filter: search (name/publicId), type (7 options), frequency (5 options).

Frequency tabs: all / monthly / weekly / quarterly / on_demand dengan count.

Tabel: ID · Name · Type · Frequency · Last generated · Next run · Format · Actions.

ReportRow actions:
- **Generate** modal → manual run
- **View Versions** drawer → download history (id, generatedAt, format, sizeKB, downloadUrl)

"+ New Report" → `/reports/builder`.

---

## 6. ReportBuilder (3-step wizard)

RBAC gate: `useCan('measurement','author')` → fallback denied page kalau tidak punya.

### Step 1 — Content
- Report Name (required)
- Description
- Report Type (radio 2-col)
- Time Range: last_7d / last_30d / last_90d / last_quarter / custom
- Services multi-select pills (default: Payment, Order)
- Include Metrics checkboxes (availability, incident_mttr, change_success, capacity, service_request)
- Format checkboxes (PDF default, Excel/CSV/JSON)

### Step 2 — Schedule
- Frequency radio (with descriptions)
  - daily 06:00 UTC, weekly Mon 06:00, monthly 1st 06:00, quarterly 1st 06:00
- Start Date (hidden kalau on_demand)

### Step 3 — Delivery
- Recipients email list (+Add inline)
- Notifications checkbox

Submit → `measurementService.createReport()` → navigate `/reports`.

---

## 7. MetricCatalog

Filter: search (name/displayName/description), category (8), source (dynamic), Has Target checkbox.

Sidebar: category nav dengan count.

Card grid (1/2 col) expandable per metric.

### Metric Definition
- Name, displayName, description
- Category, valueType (count/percentage/duration/bytes/currency/ratio), unit
- Formula (optional)
- Current value, trend (up/down/stable), trendPercent
- Target, industryBenchmark + benchmarkSource
- Source system, updateFrequency
- Used in: dashboards[], reports[]
- Owner, tags

Category meta colors:
- availability/service_request: cyan
- reliability/knowledge: green
- performance: orange
- change_management: purple
- incident_management: red
- capacity: gray

---

## 8. User / UX Flow

### Executive review
1. CTO buka /dashboards/exec, time range 30d.
2. KPI strip: SLA 99.2% (good), MTTR 28m (target met).
3. Drill ke incident chart → P1 spike minggu lalu.
4. Filter ke service Payment → trend MTTR naik.

### Schedule monthly report
1. Manager buka /reports/builder.
2. Step 1: name "Monthly SLA Review", type=monthly_summary, time=last_30d, services=Payment+Auth, formats=PDF+Excel.
3. Step 2: frequency=monthly, start date=1st.
4. Step 3: 3 recipients + notification.
5. Submit → muncul di /reports.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `measurement.read` | Any IT division (STA/IFM/APS) | Lihat semua |
| `measurement.author` | STA/IFM/APS Team Lead+ | Create/edit reports & dashboards |

---

## 10. Upstream Dependencies

Incidents (MTTR, SLA, active count) · Changes (success rate) · Services (SLA targets, filter) · Availability (uptime) · Capacity (forecast).

---

## 11. Downstream Effects

- **Email/notif delivery** dari report scheduled.
- **Metric Catalog** mendokumentasi metric yang dipakai dashboard/report.

---

## 12. Data Model

`MeasurementDashboard`: id, publicId, name, description, type, audience, widgets[], refreshInterval, timeRangeOptions, defaultTimeRange, serviceFilter, owner, viewCount30d, lastViewedAt.

`Report`: id, publicId, name, description, type, frequency, nextRunAt, lastRunAt, lastRunStatus, timeRange, serviceIds, includedMetrics, format[], deliverToUserIds, deliverToEmails, generatedCount, lastGeneratedAt, availableVersions[], owner.

`MetricDefinition`: id, publicId, name, displayName, description, category, valueType, unit, formula, currentValue, trend, trendPercent, target, industryBenchmark, benchmarkSource, sourceSystem, updateFrequency, usedInDashboardIds, usedInReportIds, owner, tags.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/measurement/dashboards` | `measurement.read` |
| GET | `/measurement/metrics` | `measurement.read` |
| GET | `/measurement/reports` | `measurement.read` |
| GET | `/measurement/exec-summary` | `measurement.read` |
| POST | `/measurement/reports` | `measurement.author` |

---

## 14. Realtime / Jobs

- **Report scheduler** cron-like di in-process scheduler.
- **Metric collector** ingest data dari sumber sistem ke metric definition currentValue.
- **Email/notification delivery** untuk recipients.

---

## 15. Open Gaps / TODO

- Dashboard click hardcoded ke `/dashboards/exec` (line 12 DashboardsIndex.tsx).
- Generate-on-demand mutation belum diformalkan di server.
- Custom widget builder belum ada (saat ini hanya Executive).
- Multi-tenant export delivery (S3, GCS) belum.

---

**Lihat juga:** [Incidents](./incidents.md) · [Changes](./changes.md) · [Availability](./availability.md) · [Capacity](./capacity.md)
