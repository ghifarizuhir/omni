# CMDB — Service Configuration Management

Status: **Draft**
Route: `/cmdb` (shell `?view=list|graph`), `/cmdb/audit`, `/cmdb/:ciId` (detail), graph focus `?ci=` or `?focus=`
Sidebar: Foundation · CMDB
Source: `src/routes/cmdb/CmdbShell.tsx`, `CMDBList.tsx`, `CMDBGraph.tsx`, `CMDBDetail.tsx`, `CMDBAudit.tsx` · `server/routes/cmdb.ts` · `src/types/ci.ts` · `src/components/cmdb/`

---

## Intent

Single source of truth untuk **inventory infrastructure & service** — 8 CI types dan 6 relationship types dengan health/lifecycle audit trail. Foundation bagi semua modul: Incidents/Changes/Monitoring/Capacity/Availability bergantung pada CMDB untuk affected CI context dan dependency graph.

ITIL 4: Service Configuration Management — CMDB bukan asset inventory biasa, tapi graph of dependencies yang support impact analysis (blast radius).

## Current State (snapshot `src/routes/index.tsx:120-122`)

- `src/routes/index.tsx:120` → `<CmdbShell />` at `/cmdb` — toggles `?view=list|graph` (default `list`) via `useSearchParams`; header `CMDB text-[20px] font-semibold tracking-[-0.01em]` + segmented toggle `bg-ois-surface-muted border rounded-[8px] p-[3px] text-[12px] font-semibold` (active `bg-white shadow border`).
- `src/routes/index.tsx:121` → `<CMDBAudit />` at `/cmdb/audit` — audit timeline gated `cmdb.audit.read` (Dept Head+).
- `src/routes/index.tsx:122` → `<CMDBDetail />` at `/cmdb/:ciId` — detail 3-col with risk stripe by type, 9 tabs.
- Components: `CmdbShell` wrapper + `CMDBList` (DataTable + tree), `CMDBGraph/ForceGraph` (D3 force-directed), `CMDBDetail` (9 tabs), `CMDBAudit` (CIAuditTimeline), plus `CITypeIcon`, `CIHealthDot`, `CIStatusBadge`, `CIRelationshipBadge`, `CIRow`, `CITreeNode`, `CIAuditEntry/Timeline`, `CIQuickFactsCard`, `ExportGraphModal`, `CreateCIModal`, `ImportCIModal` (`src/components/cmdb/`).
- API: `cmdbRouter` (`server/routes/cmdb.ts`) — `GET /cis`, `GET /cis/relationships`, `GET /cis/audit?ciId=`, `GET /cis/:publicId`, `GET /cis/:ciId/relationships`, `PATCH /cis/:publicId` (update, `cmdb.write` + audit before/after), `GET /services` + `GET /services/:id` (via `servicesRepo` + `req.tenantId`).
- Types: 8 `CIType` (server/application/database/load_balancer/service/network/storage/endpoint), 5 `CIStatus` (active/planned/maintenance/retired/unknown), 4 `Environment`, 4 `Criticality`, 6 `RelationshipType` (`depends_on|contains|runs_on|connects_to|managed_by|part_of`), 8 type-specific `CIAttributes` unions (Server/Application/Database/LB/Service/Network/Storage/Endpoint) + `ConfigurationItem` core + `CIRelationship` + `CIAuditEntry` (`src/types/ci.ts`).
- Styling: light OIS tokens (`ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-border #E4E7EC`); health/impact dots colored by `ciTypeMeta`/`riskMeta`.

**Working:**
- Shell: `flex flex-col h-full min-h-0` with `flex-1 overflow-hidden` content area — list vs graph swapped by `active === 'list'|'graph'`.
- List: `CMDBList` DataTable `Public ID font-mono ois-primary | Name | Type CITypeIcon | Service | Environment | Health CIHealthDot | Updated formatRelative` + tree mode grouped by service (`CIServiceGroup` collapsible, children dependencies edge labels), search `name|publicId|attributes JSON` + type filter pills 8 types with counts (`w-1.5 h-1.5 dot` colored) + criticality pills 4 + health/status cyclic toggle `all→operational→degraded...`, `+ Add CI` gated `cmdb.update` → `CreateCIModal`, Import `ImportCIModal` (CSV/JSON case-insensitive header map, auto-default attribute per type), clear filters, stats `total CI + relationships + last updated`.
- Graph: `CMDBGraph.tsx` D3 `ForceGraph` with node sizing `critical:24 high:20 else 16`, node color `ciTypeMeta[ci.type].color`, health sub-circle `top-right` (`operational green degraded amber partial_outage red major_outage red maintenance gray`), zoom `0.1-4x`, drag reposition, click node → `GraphNodeSidePanel` (type icon, publicId, status, criticality, health %, incident/change counts, attribute preview), search `name|publicId` filter + type filter `5 default` + relationship filter `5`, `?ci|focus` param preselect + `setSelectedNode`, export `ExportGraphModal`, toast `bg-ois-primary text-white` 2s.
- Detail: pinned header `bg-white border-b` nav `← CMDB` + color stripe by type + `publicId badge font-mono + CITypeIcon + CIStatusBadge`, Name editable inline `Edit` gated `cmdb.update` (optimistic `setChange` + `updateCISchema` validate + `zod` → revert on error), metadata `type|env|service|criticality`, Edit button, more menu. Body `flex flex-1 min-h-0` 3-col: left `w-[280px] border-r` `CIQuickFactsCard` (Asset ID, Environment, Owner, Support Team, Region, Last Update, Relationships count), center `flex-1 flex-col` tabs 9 `py-4 px-1 border-b-2` active `border-ois-primary`, content `flex-1 overflow-y-auto px-6 py-5` per tab, right `w-[280px] border-l` monitoring summary + View JSON toggle.
- Audit: gate `useCan('cmdb','audit_read')` → `ShieldAlert Denied` if not Dept Head+; search `CI name|publicId|actor|field`, action filter 8 (`created/updated/deleted/status_changed/relationship_added/removed/discovered`), source 4 (`manual/discovery/api/deployment`), date range cyclic `7d→30d→90d→all`; timeline grouped by date desc, per entry icon+actor+action+CI link+timestamp+field diff `before→after arrow` + source tags; export `ExportAuditModal` CSV/JSON.

## CRUD Wiring (audited 2026-08-28 — see `docs/audits/crud-audit.md`)

| Op | FE → Service → Route → Scoped → Repo → Prisma | Status |
|----|-----------------------------------------------|--------|
| **C create** | `CreateCIModal 59 onCreate→setExtraCIs 365` `Import 88→374 local` → no `cmdbService.create` `cmdbService:9` → no `createCISchema` `ci.ts:40 only update` → **no `POST /cis` 62** → no `CmdbScope.createCI 13` → `ConfigurationItem 277` exists | 🔴 NOT WIRED (local ephemeral `id ci-Date.now health operational`) |
| **R list/graph/detail/rels/audit** | `CMDBList 53 list 97 search` `Graph 29 relationshipsAll` `Detail 74 list.find 89 (not get)` `Audit 80 audit 83 search` → `GET 14/19/24/29/33/55 cmdb.read/audit.read` → `scoped 222 global read` → `cmdbRepo 70 findMany tenantId` | 🟢 BE wired, 🟡 FE ignores `GET :publicId` & `GET :ciId/relationships` (filters `all` locally) |
| **U patch** | `Detail 105 editDraft 113→127 update PATCH 40 updateCISchema strict 41→scoped 227 canWriteApp 235→audit 44→cmdbRepo 101 tx` | 🟡 only 4/10 fields UI, `health` enum drift `healthy/degraded/down/unknown 33` vs `operational/.../maintenance common.ts:63` 400, no `emitCmdbChange 09-realtime:147` |
| **U relationships/D** | no `POST/DELETE /relationships` `DELETE /cis` | 🔴 relationship tab read-only, `retired` via PATCH only |

**Stub / Partial (2026-08-28 audit):**
- **CREATE local-only 🔴** — `CreateCIModal.tsx:59 onCreate → CMDBList 365 setExtraCIs([ci,...])` & `ImportCIModal 114→374` generate `id:ci-${Date.now()} health:'operational' 72` ephemeral, no `tenantId/primaryApplicationId 286`, no audit, gated `Can cmdb.update 199` false affordance. Documented `POST /cis` `cmdb.md:190` need route.
- Detail resolves via `list.find 89` not `getCI` → miss beyond page 1 (`limit 50`).
- Relationships fetched twice then filtered locally `relationshipsAll 55→115` ignoring paginated `GET :ciId/relationships 33`.
- `PATCH` `Detail 113` only `name/status/environment/criticality 118`, `health/tags/attributes` allowed by Zod but not UI.
- Graph edge labels (`depends_on` etc.) colored but not yet interactive edit.
- Relationship CRUD endpoint not formally exposed (still via `CIRelationship` direct).
- Bulk operation mass-edit/delete not yet.

**Missing (2026-08-28):**
- `POST /cis` `DELETE /cis/:publicId` `POST/DELETE /cis/:id/relationships` (see `docs/audits/crud-audit.md` §8 P0).
- Auto-discovery agent native (cloud/k8s sync).
- CMDB sync to external ITSM (ServiceNow/Jira).
- `PATCH health` Zod drift `ciHealthValues 33` fix to `operational/degraded/partial_outage/major_outage/maintenance`.

## Primary View — Per View

### CmdbShell (`/cmdb`)

Header `flex items-center justify-between px-6 pt-4 pb-3 border-b` title `CMDB 20px semibold tracking -0.01em` + toggle `List|Graph`. No Module Layout — shell is plain flex. Shell content `flex-1 overflow-hidden min-h-0` swaps views; URL param `?view=graph` persists filter.

### CMDB List — Tree & List modes

**Tree:** Services as collapsible `CIServiceGroup` (header `name + CI count + chevron`) → `CITreeNode` per CI (icon `CITypeIcon size 14` + name + publicId `font-mono 11px` + health dot `CIHealthDot 8px` + criticality badge). Children nested with edge labels `type badge text-[10px] rounded-full bg-ois-surface-muted border` + dashed connector `border-l border-ois-border`. Cross-service mark `badge "cross-service" amber`. Unassigned/Infrastructure footer section.

**List:** `<DataGraph? No — DataTable` with 7 columns: Public ID (`font-mono 11px bold ois-primary link → /cmdb/:publicId`), Name (`text-sm font-medium`), Type (`CITypeIcon + label text-xs`), Service (`text-xs muted`), Environment (`Badge neutral`), Health (`CIHealthDot + label`), Updated (`formatRelative text-xs muted` + `ExternalLink 11px`). Row `hover:bg-ois-surface-muted` + click → detail.

Filter row `flex-wrap gap-2`: Search `Search 13px left-2.5 + input h-9 border-ois-border-strong rounded-lg pl-8` placeholder `Search by name, ID, attributes…`, Type pills 8 `rounded-full text-xs font-medium` active `bg-ois-primary text-white border-ois-primary` else `bg-white border-ois-border text-ois-text-muted` + `count text-[10px]` per type, Criticality pills 4 similarly, Health toggle cycle `all → operational degraded partial_outage major_outage maintenance` button `border rounded-lg px-2.5 py-1.5 text-xs`, Clear `X 12px`.

Header stats `flex items-center gap-3 text-xs text-ois-text-muted`: `{total} CIs · {relationships} links · Updated {lastUpdated formatRelative}` + actions right `Import` outline + `+ Add CI` primary gated.

### CMDB Graph (`?view=graph`)

`CMDBGraph.tsx` — `flex flex-col h-full min-h-0` with toolbar `flex items-center justify-between p-4 border-b`: left search `Search 13px + Input h-9 w-64` + type filter `FilterDropdown` multi (5 checked default) + relationship filter multi (5), right `Reset view RotateCcw 13px` + `Export Share2 13px` → `ExportGraphModal` (PNG/SVG/JSON options).

Force graph `ForceGraph` SVG `w-full h-full bg-ois-bg` with simulation `d3-force` many-body, link distance, center; node `circle r = criticalitySize` fill `ciTypeMeta.color`, stroke `white 2px`, health sub-circle `r 4` fill health color, label `text-[10px] font-medium fill-ois-text` below node.

Interactions: drag `fx/fy`, wheel zoom `0.1-4x` with `transform`, hover tooltip `CI name + status + health%`, click → `GraphNodeSidePanel` `w-80 border-l bg-white p-4 space-y-3` (type icon+name, publicId mono link, status badge, criticality, health `Progress` `value health%`, incident `AlertTriangle red` + count + `View incidents → /incidents?ciId=`, changes similarly, attributes preview `dl 2-col text-xs`), close `X 14px`.

Search filteredNodes `name|publicId includes lower`, filteredLinks `selectedRels + both endpoints in filteredNodes`. Preselect via `?focus=publicId|id` → `selectedNode`.

### CMDB Audit (`/cmdb/audit`)

Gate check `useCan cmdb.audit_read` → denied `ShieldAlert 36 red + Cannot view audit` + `Back to CMDB`.

If allowed: header `h1 Audit Trail text-xl font-bold + description text-sm muted` + filter row `Search (CI/actor/field) + Action FilterDropdown 8 + Source 4 + Date range button cyclic 7d 30d 90d all` + count `text-xs muted`. Timeline `CIAuditTimeline` grouped by date `text-[11px] uppercase tracking-widest bg-ois-surface-muted px-4 py-2 border-b` + entries per day `flex gap-3 px-4 py-3 border-b?` action icon `CIAuditEntry icon 14px colored` + actor `font-medium text-xs` + label (`created|updated field X|deleted|status_changed: active→maintenance|relationship_added: depends_on CI-A → CI-B|...`) + CI link `font-mono 11px ois-primary → /cmdb/:ciId` + timestamp `formatRelative + formatDate HH:mm UTC text-[11px] muted` + diff block if `field before/after` → `before font-mono text-xs bg-red-50 border-red-200 rounded px-2 py-1 text-red-700 line-through` arrow `→` + `after bg-emerald-50 border-emerald-200 text-emerald-700`. Source tag `Badge neutral text-[10px] manual|discovery|api|deployment` + actorType.

Empty: `CheckCircle2 32 ois-text-subtle + No audit entries + Clear filters`.

## Detail View — CMDB Detail (`/cmdb/:ciId`)

`-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + pinned header `bg-white border-b shrink-0 z-30` nav row `ArrowLeft 15 Calendar + status/health badges + MoreHorizontal ⋯ Copy ID/Copy link` + entity header `flex items-start gap-0` stripe `w-1 self-stretch RISK_COLOR[type]` + `publicId mono 14px bold ois-primary + CITypeIcon + CIStatusBadge + name h1 text-xl font-bold editable (inline input h-9 border-ois-border-strong rounded-lg px-3 py-2)` + metadata `Clock 11px implementationWindow + Owner + Created formatRelative + criticality badge`.

Body `flex flex-1 min-h-0`: Left `w-[280px] border-r bg-white p-4 space-y-4` `CIQuickFactsCard` (rows `label text-xs muted + value text-sm font-medium`, counts `relationships incident/change/monitoring counts`); Center `flex flex-col flex-1 min-w-0` tab bar `flex gap-8 overflow-x-auto scrollbar-hide px-6 border-b bg-white shrink-0` 9 tabs `py-4 px-1 border-b-2 whitespace-nowrap text-sm font-medium`: Overview, Relationships, Incidents, Changes, Problems, Knowledge Base, Audit, Monitoring, Capacity — active `border-ois-primary text-ois-primary font-bold`; content `flex-1 overflow-y-auto px-6 py-5` per tab; Right `w-[280px] border-l bg-white p-4 space-y-4` monitoring rules summary top 5 `MonitoringRules DataTable compact` + `View JSON` toggle `pre font-mono text-xs bg-ois-bg border rounded-lg p-3 max-h-96 overflow-auto syntax-highlighted` + Copy.

### Tabs detail

- **Overview:** Specifications `dl grid-cols-2 gap-4` per attribute (`os cpuCores memoryGb ipAddress hostname region provider` etc. clickable `repoUrl ExternalLink 12px`), Activity last 5 `CIAuditTimeline` filtered by `ciId`, Health Snapshot `CIHealthDot large + health label + progress`.
- **Relationships:** outgoing `fromCiId===ci.id` + incoming `toCiId===ci.id` sections each `SectionCard` list `target CI row icon+name+type+health + relationship badge CIRelationshipBadge text-[10px] type` + `Open in Graph View Graph 12px → /cmdb/graph?focus=`.
- **Incidents:** open first then closed max 6, `IncidentPriorityBadge + status pill + link /incidents/:id`, empty `No incidents linked`.
- **Changes:** last 5 `ChangeStatusPill + RiskBadge + link /changes/:publicId`, empty similarly.
- **Problems/KB:** similar card list `→ /problems/:id`, `→ /kb/:slug`.
- **Audit:** full `CIAuditTimeline` filter `ciId`, same as audit page but scoped.
- **Monitoring:** DataTable `publicId name type severity targetCount lastTriggeredAt` filtered `targetCIIds includes ci.id` or `selector matches type/tags/services`, click → focus rule, empty `No rules for this CI + Create rule → /monitoring/rules`.
- **Capacity:** Utilization `BarChart` + trend 7d sparkline + peak 24h `KPICard` style, `capacityService` metrics if CI has service.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Search/filter | Input + pills + cyclic | `cmdb.read` | — |
| View CI | Row click / Tree node click | `cmdb.read` | — |
| Create CI | `+ Add CI` → `CreateCIModal` | `cmdb.write` | — |
| Import CIs | `Import` → `ImportCIModal` CSV/JSON | `cmdb.write` | — |
| Edit CI | Detail `Edit` inline + Save | `cmdb.write` (IFM Officer+) | not retired |
| Update status | Detail select `CIStatus` | `cmdb.write` | — |
| View relationships | Relationships tab / Graph side panel `Open in Graph` | `cmdb.read` | — |
| View audit | Audit tab / `/cmdb/audit` | `cmdb.audit.read` (Dept Head+) | — |
| Export graph | `Export` → `ExportGraphModal` PNG/SVG/JSON | `cmdb.read` | graph view |
| View JSON | Toggle `View JSON` in right rail | `cmdb.read` | — |

## Filters / Sort / Search

- **List search:** `name|publicId|attributes JSON stringified` lower includes — client-side `useMemo`.
- **Type filter:** 8 pills `server|application|database|load_balancer|service|network|storage|endpoint` with count badge `text-[10px]`. Active multi-select.
- **Criticality:** 4 pills `critical|high|medium|low` similarly.
- **Health/status:** cyclic button `all→operational→degraded→partial_outage→major_outage→maintenance`.
- **Graph filters:** node types multi `selectedTypes` (default 5), edge types multi `selectedRels` (default 5), text search `filteredNodes`.
- **Audit filters:** search `CI name|publicId|actor|field`, action 8, source 4, date cyclic — all `useMemo`.
- **Sort:** List default `name asc`; Tree grouped by service alphabetical; Graph force no sort.

## State Lifecycle

```
Lifecycle: planned → active → maintenance → retired
              ↘              → unknown (discovery)
Health:    operational ↔ degraded ↔ partial_outage ↔ major_outage ↔ maintenance
           (health independent of lifecycle — retired CI can still be "operational" historically)
```

Edit: `PATCH /cis/:publicId` body `updateCISchema` (partial `name|type|status|criticality|health|attributes|tags`) — optimistic with revert.

Relationship: `depends_on|contains|runs_on|connects_to|managed_by|part_of` — color `depends_on red contains amber runs_on blue connects_to emerald managed_by slate part_of purple`, line style `solid vs dashed` (see `CIRelationshipBadge` + `ForceGraph` link styling).

## Permissions

| Permission | Who | Actions |
|------------|-----|---------|
| `cmdb.read` | All IT divisions (STA/IFM/APS) — default | List, detail, relationships list, graph view, services list |
| `cmdb.write` | IFM Officer+ (default via `cmdb.update`) | Create, PATCH CI, import, edit |
| `cmdb.audit.read` | Dept Head+ | `/cmdb/audit` `GET /cis/audit`, detail Audit tab full |

Listed as `requirePermission('cmdb.read'|'cmdb.write'|'cmdb.audit.read')` in `server/routes/cmdb.ts`. Frontend gate `Can` + `useCan('cmdb','audit_read')` for audit page, `Can module="cmdb" action="update"` for Add/Edit. Scope violation → 403 via `server/scope/errors.ts`.

## Empty / Loading / Error

- **Empty list:** `text-center py-12` + `Server 32 ois-text-subtle` + `No CIs match filters` + `Clear filters` + `Add CI` CTA if canWrite.
- **Empty graph filtered:** `No nodes match filters — clear type/relationship filters` center `text-sm italic`.
- **Empty relationships tab:** `Link2 24 ois-text-subtle + No relationships + Add relationship (future)`.
- **Empty audit:** `Clock 32 + No audit entries + Adjust filters`.
- **Detail 404:** `h1 CI not found text-2xl font-bold + publicId muted + ← Back to CMDB Button`.
- **Loading:** list skeleton `8 rows shimmer`, graph `ForceGraph loading spinner center`, detail `SectionCard pulse 4`, audit timeline skeleton 5 entries.

## Phase 2 Deferred

- Bulk operation mass-edit/delete with audit bulk.
- Relationship CRUD formal endpoints (`POST /cis/:id/relationships`, `DELETE ...`).
- Auto-discovery agent native (cloud provider/k8s sync job).
- CMDB sync to external ITSM (ServiceNow/Jira) bidirectional.
- CI compliance policy checks (required attributes per type).

## Design Preservation

Wajib pertahankan:

1. **CmdbShell** `flex flex-col h-full min-h-0` + header `text-[20px] tracking-[-0.01em]` + toggle `rounded-[8px] p-[3px] text-[12px] font-semibold` active `shadow-[0_1px_2px] border`.
2. **CIRow / CITreeNode** hover `hover:bg-ois-surface-muted` + `CITypeIcon 14 + publicId mono 11px ois-primary` + health dot placement.
3. **ForceGraph** node `r criticalitySize 24/20/16` + fill `ciTypeMeta.color` + health sub-circle `r 4`, link color by type `depends_on #F04438` etc., zoom `0.1-4x`, drag `fx/fy`.
4. **Audit diff** before `bg-red-50 border-red-200 text-red-700 line-through` → arrow `→` + after `bg-emerald-50 border-emerald-200 text-emerald-700` with `font-mono text-xs rounded px-2 py-1`.
5. **Detail stripe** `w-1 self-stretch CI_TYPE_COLOR[type]` left edge of header — same as Change risk stripe but by CI type.
6. **Filter pills** `rounded-full text-xs font-medium border` active `bg-ois-primary text-white border-ois-primary` with count badge.
7. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `text-[11px] uppercase tracking-widest bg-ois-surface-muted`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| List CIs | `GET /api/v1/cis?page&pageSize&q=...` | `cmdb.read` via `req.scoped.cmdb.listCIs` | paginated, tenant-scoped |
| Get CI | `GET /api/v1/cis/:publicId` | `cmdb.read` `scoped.cmdb.getCI` | 404 if not in tenant |
| Patch CI | `PATCH /api/v1/cis/:publicId` | `cmdb.write` `updateCISchema` | optimistic + audit `before/after` |
| List relationships | `GET /api/v1/cis/relationships?page&pageSize` | `cmdb.read` | all for graph |
| Relationships for CI | `GET /api/v1/cis/:ciId/relationships?page&pageSize` | `cmdb.read` | incoming+outgoing |
| Audit | `GET /api/v1/cis/audit?ciId=&page&pageSize` | `cmdb.audit.read` | `qString(ciId)` + pagination, 403 if no perm |
| List services | `GET /api/v1/services?page&pageSize` | `service.read` via `servicesRepo.list(tenantId)` | direct `tenantId`, not `req.scoped.cmdb` |
| Get service | `GET /api/v1/services/:id` | `service.read` | |

Socket: `tenant:{tenantId}` for list/graph auto-refresh on CI update (future).

## Open Items

- [ ] **CRUD P0 — fix `ci.ts:33` `ciHealthValues`** `healthy/degraded/down/unknown` → `operational/degraded/partial_outage/major_outage/maintenance` `common.ts:63` else `PATCH health 33` 400.
- [ ] **CRUD P0 — implement `POST /cis`** `createCISchema` → `cmdbRepo.createCI` (`prisma.configurationItem` `publicId CI-${type}-seq` `tenantId/primaryApplicationId ensureUnassignedApp`) → `CmdbScope.createCI canWriteApp` → `POST /cis cmdb.write` audit — wire `Create/ImportCIModal 59/114` off `extraCIs 50`.
- [ ] **CRUD P1 — wire Detail to `cisService.get(publicId)` not `list.find 89`** + wire Relationships tab to `cisService.relationships(ciId) 12` not local filter.
- [ ] Verify `PATCH /cis/:publicId` `attributes` union validation — `updateCISchema` currently partial, need type-specific strict schema.
- [ ] Graph `ForceGraph` performance >500 nodes — need canvas or virtualization.
- [ ] Add `POST/DELETE /cis/:ciId/relationships` + `DELETE /cis/:publicId` + `CIAuditEntry relationship_added/removed` guard.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/cmdb.md` + `CmdbShell/CMDBList/Graph/Detail/Audit` + `ci.ts` + `cmdb.ts` ke template features (Foundation, 4 views + 9-tab detail) | — |
| 2026-08-28 | CRUD audit ITSM core — add wiring matrix C 🔴 (local) / R 🟢 / U 🟡 (health drift) — full evidence `docs/audits/crud-audit.md` | — |
