# CMDB

> **Route utama:** `/cmdb` · **ITIL 4 Practice:** Service Configuration Management · **Sumber kode:** `src/routes/cmdb/`, `server/routes/cmdb.ts`

CMDB (Configuration Management Database) adalah inventory infrastructure dan service. Semua modul lain (Incidents, Changes, Monitoring, dll.) bergantung pada CMDB untuk konteks affected CI.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/cmdb` | `CMDBList` | List/tree view + filter + import |
| `/cmdb/graph` | `CMDBGraph` | D3 force-directed dependency graph |
| `/cmdb/audit` | `CMDBAudit` | Audit timeline (RBAC: Dept Head+) |
| `/cmdb/:ciId` | `CMDBDetail` | Detail CI (9 tab) |

Modal: CreateCIModal, ImportCIModal, ExportGraphModal.

---

## 2. Key Features

- **8 CI types**: server, application, database, load_balancer, service, network, storage, endpoint.
- **6 relationship types**: depends_on, contains, runs_on, connects_to, managed_by, part_of (color & line style berbeda).
- **2 view modes**: Tree (grouped by service) & List (DataTable).
- **D3 force graph** dengan zoom/pan, drag, search, filter type/relationship.
- **Audit trail** lengkap dengan diff (before/after) per field.
- **Health indicator** sub-circle on graph nodes.
- **Health states**: operational, degraded, partial_outage, major_outage, maintenance.
- **Lifecycle states**: active, planned, maintenance, retired, unknown.
- **Inline edit** dengan optimistic update + revert on error.
- **Import** CSV/JSON dengan auto-default attribute per type.

---

## 3. CMDBList

### View Modes
- **Tree**: Services as collapsible groups → applications as roots → dependencies as children dengan edge labels. Mark cross-service relationships. Unassigned/Infrastructure section di bawah.
- **List**: DataTable kolom Public ID · Name · Type · Service · Environment · Health · Updated.

### Filter
- Search (name/publicId/attributes JSON)
- Type filter (8 CI types + counts)
- Criticality filter (critical/high/medium/low + counts)
- Health/Status cyclic toggle (all → operational → degraded → ...)

### Actions
- "+ Add CI" gated `cmdb.update` → CreateCIModal
- "Import" → ImportCIModal (CSV/JSON)
- Clear filters

### Statistics
Total CI count, total relationship count, last updated.

---

## 4. CMDBDetail Deep-Dive

Layout 3 kolom + pinned header dengan strip warna by CI type.

### Pinned header
Breadcrumb back, color stripe, publicId badge + CITypeIcon + CIStatusBadge, Name (editable inline), metadata (type, env, service, criticality), Edit button (gated `cmdb.update`), more menu.

### Edit mode
Optimistic local update; schema validation `updateCISchema`; revert + inline error on failure.

### Sidebar kiri
**CIQuickFactsCard**: Asset ID, Environment, Owner, Support Team, Region, Last Update, Relationships count.

### Center — 9 Tabs

| Tab | Isi |
|---|---|
| **Overview** | Specifications (attribute grid, clickable repo URL), Activity (last 5 audit), Health Snapshot |
| **Relationships** | Outgoing & incoming connections, target CI icons + health, "Open in Graph View" |
| **Incidents** | Open first then closed (max 6), priority color-coded, link `/incidents/:id` |
| **Changes** | Linked changes (last 5), status pill + risk badge |
| **Problems** | Linked problems |
| **Knowledge Base** | Related KB articles → `/kb/{slug}` |
| **Audit** | Full CIAuditTimeline (filter by ciId) |
| **Monitoring** | DataTable monitoring rules untuk CI ini, last triggered, click → focus rule |
| **Capacity** | Utilization metrics dengan bar chart, trend 7d, peak 24h |

### Sidebar kanan
Monitoring rules summary (top 5), **View JSON** toggle untuk export object syntax-highlighted.

---

## 5. CMDBGraph

D3 force-directed:
- **Filter** node by CI type (default: server, app, db, lb, service)
- **Filter** edge by relationship type
- **Node sizing** by criticality (critical=24, high=20, default=16)
- **Node color** dari ciTypeMeta
- **Health sub-circle** top-right (green/orange/red/gray)
- **Zoom/pan** (0.1-4x)
- **Drag** node reposition
- **Click node** → side panel (type icon, publicId, status, criticality, health %, incident/change counts, attribute preview)
- **Search** by name/publicId
- **Export** modal

URL param `?ci={publicId}` atau `?focus={ciId}` untuk pre-select.

---

## 6. CMDBAudit

RBAC gate: `useCan('cmdb','audit_read')` → ShieldAlert denied page kalau tidak punya.

### Filter
- Search (CI name/publicId/actor name/field changed)
- Action (created/updated/deleted/status_changed/relationship_added/removed/discovered)
- Source (manual/discovery/api/deployment)
- Date range cyclic: 7d → 30d → 90d → all

### Display
CIAuditTimeline grouped by date desc. Per entry: action icon + actor + action label + CI link + timestamp; for updates: field name + before/after diff dengan arrow; source + actor type tags.

### Export
ExportAuditModal CSV/JSON dengan count + format toast.

---

## 7. User / UX Flow

### CI investigation
1. Engineer search "DB-PROD-01" di /cmdb.
2. Klik row → detail.
3. Tab Relationships → lihat dependencies (apps yang runs_on, services yang part_of).
4. Tab Incidents → 2 P2 minggu lalu.
5. Klik incident → /incidents/INC-XXX.
6. Tab Audit → siapa update kapan.

### Edit CI
1. Click Edit → name editable inline.
2. Save → optimistic update, server PATCH, revert kalau error.

### Import CIs
1. Klik Import → modal.
2. Paste CSV (header row + rows).
3. Parser map case-insensitive (name/publicId/type/...), auto-default attribute per type.
4. Submit → CIs muncul di list.

---

## 8. State Model

Lifecycle: active → maintenance → retired (atau planned/unknown).
Health: operational → degraded → partial_outage → major_outage → maintenance.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `cmdb.read` | All IT divisions (STA/IFM/APS) | List/detail |
| `cmdb.update` | IFM Officer+ (default) | CRUD CI, edit, import |
| `cmdb.audit_read` | Dept Head+ | Audit page |

---

## 10. Upstream Dependencies

Tidak ada (CMDB adalah foundation).

---

## 11. Downstream Effects

CMDB dipakai oleh: Incidents (affected CI), Changes (affected CI), Monitoring (target CI), Capacity (CI metric), Availability (service health), KB (related CI), DR Plans (affected CI).

---

## 12. Data Model

`ConfigurationItem` (`src/types/ci.ts`):
- Identity: `id` (UUID v7), `publicId`, `name`
- Type: `type` (8 enum), `status` (lifecycle)
- `environment` (production/staging/development/test)
- `criticality` (critical/high/medium/low)
- `ownerId`, `ownerTeamId`, `serviceId`, `primaryApplicationId`
- `health` (ServiceHealthStatus)
- `attributes` (type-specific: ServerAttributes, ApplicationAttributes, dst.)
- `tags`, `createdAt/updatedAt/lastDiscoveredAt`
- Counts: `openIncidentCount`, `recentChangeCount`, `monitoringRuleCount`

`CIRelationship`: id, fromCiId, toCiId, type (6 enum), description, createdAt.

`CIAuditEntry`: action (8 enum), actorName, actorType, source (4 enum), ciPublicId, ciName, field changed, before/after, description, timestamp.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/cis` | `cmdb.read` |
| GET | `/cis/:publicId` | `cmdb.read` |
| PATCH | `/cis/:publicId` | `cmdb.write` |
| GET | `/cis/relationships` | `cmdb.read` |
| GET | `/cis/:ciId/relationships` | `cmdb.read` |
| GET | `/cis/audit?ciId=` | `cmdb.audit.read` |
| GET | `/services` | `service.read` |
| GET | `/services/:id` | `service.read` |

---

## 14. Realtime / Jobs

- **Discovery agents** (external): push CI updates via webhook → audit `discovered` action.
- **Audit log** untuk setiap mutation (before/after snapshot).

---

## 15. Open Gaps / TODO

- Bulk operation (mass-edit/delete) belum ada.
- Relationship CRUD endpoint belum diekspos formal.
- Auto-discovery integration (cloud provider, k8s) belum di-build native.
- CMDB sync ke external ITSM (ServiceNow, Jira) belum.

---

**Lihat juga:** [Incidents](./incidents.md) · [Changes](./changes.md) · [Monitoring](./monitoring.md) · [Capacity](./capacity.md)
