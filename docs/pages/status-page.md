# Status Page

> **Route utama:** `/status` · **ITIL 4 Practice:** Service Communication · **Sumber kode:** `src/routes/platform/StatusPage.tsx`, `server/routes/platform.ts`

Status Page menampilkan kondisi service ke user (saat ini **internal-only**, butuh login + permission `statuspage.read`). Tidak ada endpoint public/anonymous.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/status` | `StatusPage` | Halaman service status + active incidents + history |

Tidak ada sub-route.

---

## 2. Key Features

- **Overall status banner** dinamis (Major Outage / Partial Disruption / Maintenance / All Operational) dengan accent color.
- **Service Status section** dengan 90-day uptime history bar.
- **Active Incidents section** (filtered `status !== 'resolved'`).
- **Past Incidents section** (saat ini hardcoded mock).
- **Last update timestamp** + author per entry.
- **5 status level**: operational, degraded, partial_outage, major_outage, maintenance.
- **4 incident lifecycle**: investigating → identified → monitoring → resolved.

---

## 3. Page Anatomy

```
┌──────────────────────────────────────────┐
│ Breadcrumb: Platform · Service Status    │
│ Auto-refresh indicator (timestamp)       │
├──────────────────────────────────────────┤
│ [Accent bar — color sesuai overall]      │
│ Overall status headline + icon           │
│ Affected service count                   │
│ Last update: 2026-05-08 08:52 UTC by …   │
├──────────────────────────────────────────┤
│ Service Status section                   │
│   [ServiceStatusRow per entry]           │
├──────────────────────────────────────────┤
│ Active Incidents section                 │
│   [StatusIncidentCard per incident]      │
├──────────────────────────────────────────┤
│ Past Incidents section                   │
│   [PastIncidentSummary]                  │
└──────────────────────────────────────────┘
```

Max-width 768px (3xl), centered.

---

## 4. ServiceStatusRow

Per service entry:
- Service name + status dot indicator
- Optional description
- Optional status message
- Status badge (5 levels dengan color hex):
  - operational #12B76A
  - degraded #F79009
  - partial_outage #F04438
  - major_outage #B42318
  - maintenance #0BA5EC
- **90-day uptime history bar**:
  - 90 day-blocks horizontal
  - Color berdasarkan uptime threshold: &gt;99.9% (mostly green), &gt;99.5% (some amber), &lt;99% (more red)
  - Hover tooltip "Day N"
  - Overall 90d % di kanan
- Last update timestamp + author

---

## 5. StatusIncidentCard

Per active incident:
- Megaphone icon + title + start timestamp
- Status badge: investigating (orange) / identified (blue) / monitoring (green) / resolved (gray)
- **Updates timeline** (sorted newest first):
  - Author name + timestamp (UTC)
  - Update body text

---

## 6. Past Incidents

`PastIncidentSummary` saat ini hardcoded mock dengan 3 sample (date, service, title, duration, resolved badge).

"View all past incidents" link di akhir.

---

## 7. User / UX Flow

### Reader flow
1. User buka `/status`.
2. Lihat overall: "All Systems Operational" green.
3. Service list semua green.
4. Active Incidents: kosong.
5. Past incidents: 3 minggu terakhir.

### During incident
1. Incident commander di /incidents post comms `audience=customer`.
2. Status page entry untuk affected service di-update (status, lastUpdatedAt, lastUpdatedByName).
3. StatusPageIncident di-create dengan status=investigating.
4. Reader refresh /status → banner orange "Partial Service Disruption", incident card tampil.
5. IC update timeline → "Identified root cause".
6. Resolve → status=resolved, pindah ke past incidents.

---

## 8. State Model

```
Incident: investigating → identified → monitoring → resolved
Service:  operational → degraded → partial_outage → major_outage → maintenance
```

Overall hierarchy (first match wins): major_outage → partial/degraded → maintenance → operational.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `statuspage.read` | All authenticated dengan permission | Lihat status page |
| Write | (Belum ada) | Posting update saat ini lewat incident comms |

---

## 10. Upstream Dependencies

Services (CMDB tier=service) · Incidents (linked) · Outages (linked) · Comms (audience=customer dari incident).

---

## 11. Downstream Effects

- **Subscribers**: belum ada subscriber/notification mechanism.
- **External monitoring**: status page bisa di-scrape integrasi tools.

---

## 12. Data Model

`StatusPageEntry`:
- id, serviceId, serviceName, serviceDescription
- status (5 levels)
- statusMessage
- linkedOutagePublicId, linkedIncidentPublicId
- lastUpdatedAt, lastUpdatedByName
- uptime90d (number, e.g., 99.98)
- displayOrder

`StatusPageIncident`:
- id, title
- status (4 levels)
- affectedServiceIds[]
- updates[] (id, timestamp, body, authorName)
- startedAt, resolvedAt

Storage: Document kind `status-page-entry` & `status-page-incident`, tenant-scoped.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/status-page/entries` | `statuspage.read` |
| GET | `/status-page/incidents` | `statuspage.read` |

> Tidak ada POST/PATCH/DELETE — management lewat incident comms / admin route (belum diekspos).

---

## 14. Realtime / Jobs

- **Auto-refresh** timestamp shown tapi tidak otomatis fetch (saat ini static).
- **Comms publisher**: incident comms `audience=customer` planned untuk auto-update status page entry.

---

## 15. Open Gaps / TODO

- **Public view** belum ada (saat ini internal-only). Production butuh `/status/public` tanpa auth.
- **Subscriber management** (email, RSS, webhook) belum diimplementasi.
- **Auto-refresh** UI elemen ada tapi tidak fungsional.
- **Past incidents** masih hardcoded mock data.
- **Manual incident announcement** UI belum ada (lewat incident comms only).
- **i18n** + timezone preference belum.

---

**Lihat juga:** [Incidents](./incidents.md) · [Availability](./availability.md) · [Continuity](./continuity.md)
