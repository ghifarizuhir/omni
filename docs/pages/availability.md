# Availability

> **Route utama:** `/availability` · **ITIL 4 Practice:** Availability Management & Service Level Management · **Sumber kode:** `src/routes/availability/`, `server/routes/availability.ts`

Modul Availability memantau uptime, MTTR, MTBF, SLA compliance, dan outage tracking dengan link ke insiden + change penyebab.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/availability` | `AvailabilityDashboard` | KPI + chart + breaches |
| `/availability/sla` | `SLATargets` | Daftar SLA target dengan error budget |
| `/availability/outages` | `Outages` | Daftar outage dengan detail drawer |

---

## 2. Key Features

- **4 KPI** (window 30d): Avg Uptime, MTTR, MTBF, Active Outages.
- **90-day uptime calendar heatmap** per service (klik cell → outage drilldown).
- **MTTR/MTBF trend chart** 30 hari.
- **SLA Compliance donut** + Active Breaches list.
- **SLA target CRUD** dengan threshold (meeting/at_risk/breached) + error budget.
- **Outage tracking** dengan type (unplanned/planned/partial/detected_only), severity, customerFacing, root cause linkage.

---

## 3. AvailabilityDashboard

### KPI cards
1. **Avg Uptime (30d)** — average `service.uptime30d`, trend high.
2. **MTTR (30d)** — mean resolved duration in minutes (target &lt;30m), trend low.
3. **MTBF (30d)** — window length / failure count (target &gt;14 days), trend high.
4. **Active Outages** — count `endedAt = null` + breakdown by type.

### Visualizations
- **UptimeCalendarHeatmap** (90-day): cell color by status (operational/degraded/partial/major/maintenance), klik → `/availability/outages?service=...&date=...`.
- **MTTRTrendChart** (30d): daily buckets dari incidents.resolution.resolvedAt.
- **SLAComplianceDonut**: meeting/at_risk/breached counts.
- **ActiveBreachesList**: service name, minutes over budget, linked incidents.
- **OutageTimeline**: outages 30 hari terakhir, sorted desc.

---

## 4. SLATargets Page

Filter: search, service, status (all/meeting/at_risk/breached).

**SLACard** per SLA:
- Service name + tier badge (critical/important/standard)
- Target `{value}{unit}` + window period (rolling_30d/7d/90d, calendar_month, calendar_quarter)
- **Performance bar**: current vs target, delta exceeding/below %
- **Error budget bar**: consumed/total minutes, remaining %
  - &gt;100%: red, &gt;80%: orange, &gt;50%: amber, ≤50%: green
- Owner, effective date, review due date
- Active breach alert: breach date, linked incidents, action button

**Status thresholds**:
- meeting (#067647 green)
- at_risk (#DC6803 orange)
- breached (#B42318 red)

Metrics: availability, mttr, mtbf, mtrs, response_time, first_byte_latency.

"+ New SLA Target" gated `availability.update`.

---

## 5. Outages Page

Filter: search, type, service, severity, customer-facing, reset.

**Type colors**:
- unplanned (red), planned (blue), partial (orange), detected_only (gray)

Tabel: ID · Type chip · Service · Started (relative) · Duration (live ongoing dengan pulsing indicator) · Severity badge · Customer-facing · Triggered by (link incident) · Actions.

Charts: Outage Volume by Week + Outage Causes Pie.

### OutageDetailDrawer
- Header: publicId, service, type, severity, customer-facing
- Times: Started, Resolved, Duration, Affected Users
- Root Cause: summary + link Problem (kalau `rootCauseProblemPublicId`)
- Triggering Incident link (kalau ada)
- Resolving Change link (kalau ada)
- Preventive Actions list
- Affected CIs badges
- Timeline (4-step mock)

---

## 6. User / UX Flow

### Monitoring health
1. Manager buka `/availability`, lihat 4 KPI.
2. MTTR naik → drill ke trend chart.
3. Klik service di heatmap merah → daftar outage tanggal itu.
4. Klik outage → drawer dengan root cause problem.
5. Klik "Open problem" → /problems/PRB-XXX.

### Incident → Outage tracking
1. Insiden P1 dibuat → outage `unplanned` auto-created (linked).
2. Resolved → endedAt, durationMinutes calculated.
3. Outage muncul di tabel + analytics.

### SLA breach
1. Service degraded prolonged → SLA `breached`.
2. Active Breach Alert muncul di SLATargets.
3. Owner notified, link ke triggering incidents.

---

## 7. State Model

Outage: ongoing (`endedAt = null`) → resolved.
SLA Breach: active → resolved.
SLA Status: meeting → at_risk → breached.

---

## 8. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `availability.read` | All authenticated | Lihat dashboard/SLA/outages |
| `availability.update` | (TBD by tenant) | Create/edit SLA, manual outage entry |

---

## 9. Upstream Dependencies

Incidents (resolution times, triggering) · Problems (root cause) · Changes (resolving) · CMDB (affected CIs) · Services (tier, name) · BIA (RTO/RPO target).

---

## 10. Downstream Effects

- **Status Page**: outages publik bisa dipublish.
- **Improvements**: SLA breach pattern → improvement initiative.
- **Continuity (BIA)**: outage data feed ke BIA review.
- **Incidents**: SLA breach trigger eskalasi.

---

## 11. Data Model

`Outage`: id, publicId, type, serviceId/Name, affectedCIIds/PublicIds, startedAt/endedAt/durationMinutes, severity (P1-P4), customerFacing, affectedUsersEstimate, triggeringIncidentId/PublicId, resolvingChangeId/PublicId, rootCauseProblemId/PublicId, rootCauseSummary, preventiveActions[].

`SLATarget`: id, publicId, serviceId/Name/Tier, metric, target, unit, window, currentValue, status, errorBudgetMinutes/Consumed/RemainingPercent, ownerId/Name, effectiveFrom, reviewDueAt.

`SLABreach`: id, slaId, serviceId, status (active/resolved), triggeringIncidentIds[], linkedProblemPublicId, severityRatio.

`DailyServiceHealth`: serviceId, date, status.

---

## 12. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/availability/outages` | `availability.read` |
| GET | `/availability/sla-targets` | `availability.read` |
| GET | `/availability/sla-breaches?active=true` | `availability.read` |
| GET | `/availability/daily-health` | `availability.read` |
| GET | `/availability/series` | `availability.read` |

---

## 13. Realtime / Jobs

- **Daily health aggregator**: compute uptime per service per day.
- **SLA computation job**: rolling window calculation, mark status transitions.
- **Outage auto-create**: insiden P1/P2 dengan customerFacing service → auto outage.

---

## 14. Open Gaps / TODO

- Mutation endpoint (CRUD SLA, manual outage) belum lengkap.
- Status page integration (publish outage) masih manual.
- Error budget rollover antar window belum di-handle.
- Mock past incident summary di Status Page (lihat StatusPage doc) butuh data real.

---

**Lihat juga:** [Incidents](./incidents.md) · [Status Page](./status-page.md) · [Continuity](./continuity.md) · [CMDB](./cmdb.md)
