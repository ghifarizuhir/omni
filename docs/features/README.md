# Feature Specifications — OIS

Product-level spec per halaman + per konsep cross-cutting.

**Menjawab:** "Apa yang user lihat dan bisa lakukan di halaman X?"
Bukan:
- Bukan schema DB → lihat [`../design/01-erd.md`](../design/01-erd.md)
- Bukan API shape → lihat [`../design/02-api-contract.md`](../design/02-api-contract.md)
- Bukan pola UI generik → lihat [`../design/08-design-system.md`](../design/08-design-system.md), [`../ui/README.md`](../ui/README.md)

> Relasi dengan docs lama: `docs/pages/` dan `docs/specs/` tetap sebagai referensi per-page legacy (struktur lama per-milestone). Folder `docs/features/` adalah **lifedoc baru** (diadaptasi dari `terra-service-management/docs/features/`) yang mulai dari sini jadi source of truth iterasi — akan sinkron dengan `docs/pages/` bertahap.

---

## Organisasi

```
features/
├── README.md                    ← ini
├── _backlog.md                  ← parked ideas (belum commit phase)
├── <page>.md                    ← 1 file per halaman (route OIS)
└── _shared/                     ← cross-cutting, dipakai > 1 halaman
    ├── README.md
    └── <concern>.md
```

---

## Page Inventory — OIS (berdasarkan `src/routes/index.tsx`)

### Operations

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Overview / Dashboard | [`overview.md`](./overview.md) | `/` | ✅ Draft (exemplar #5) | Hero + KPI 4 + feeds + calendar 7d |
| Inbox | [`inbox.md`](./inbox.md) | `/inbox` | ✅ Draft (batch 3/4) | severity stripe + pin/archive |
| Incidents (+ War Room + Analytics) | [`incidents.md`](./incidents.md) | `/incidents`, `/incidents/:id`, `/incidents/major/:id` | ✅ Draft (exemplar) | Core ITSM — north star, pattern for other pages |
| Problems (+ RCA, KEDB) | [`problems.md`](./problems.md) | `/problems`, `/kedb` | ✅ Draft (batch 1) | RCA/Fishbone/FiveWhys + KEDB |

### Service Delivery

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Service Requests | [`requests.md`](./requests.md) | `/requests` | ✅ Draft (batch 1) | WorkflowStepper + fulfill queue |
| Portal (self-service) | [`portal.md`](./portal.md) | `/portal` | ✅ Draft (batch 2) | Catalog + wizard + MyRequests |
| Knowledge Base | [`kb.md`](./kb.md) | `/kb` | ✅ Draft (batch 1) | KBLayout browse/article/editor/analytics |

### Change & Delivery

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Changes (Calendar, CAB) | [`changes.md`](./changes.md) | `/changes` | ✅ Draft (exemplar #2) | Calendar/Board/List + Wizard 4-step + CAB + Detail 8 tabs |
| Releases | [`releases.md`](./releases.md) | `/releases` | ✅ Draft (batch 2) | Pipeline + notes + stages |
| Deployments + Environments | [`deployments.md`](./deployments.md) | `/deployments`, `/environments` | ✅ Draft (batch 2) | Queue + detail + env health |
| Testing | [`testing.md`](./testing.md) | `/testing/*` | ✅ Draft (batch 3/4) | TestingLayout 4 tabs |

### Service Health & Intelligence

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Availability (SLA, Outages) | [`availability.md`](./availability.md) | `/availability` | ✅ Draft (batch 1) | SLA + outage drawer |
| Capacity (Forecast, Thresholds) | [`capacity.md`](./capacity.md) | `/capacity` | ✅ Draft (batch 1) | Forecast/Thresholds |
| Continuity (BIA, DR) | [`continuity.md`](./continuity.md) | `/continuity` | ✅ Draft (batch 3/4) | BIA 5×5 + DR plans/tests |
| Measurement (Dashboards, Reports) | [`measurement.md`](./measurement.md) | `/dashboards`, `/reports` | ✅ Draft (batch 3/4) | Dashboards + ReportBuilder + catalog |
| Improvements | [`improvements.md`](./improvements.md) | `/improvement` | ✅ Draft (batch 3/4) | 8 statuses + 8 categories |
| Status Page | [`status-page.md`](./status-page.md) | `/status` | ✅ Draft (batch 3/4) | Green/amber/red hero + past |

### Observability & Foundation

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Monitoring (Events, Rules, Routing, Coverage) | [`monitoring.md`](./monitoring.md) | `/monitoring` | ✅ Draft (exemplar #3) | Module Layout — 5 tabs + detail |
| CMDB (Graph, Audit) | [`cmdb.md`](./cmdb.md) | `/cmdb` | ✅ Draft (exemplar #4) | Shell List/Graph + Detail 9 tabs + Audit |
| On-Call | [`on-call.md`](./on-call.md) | `/on-call` | ✅ Draft (batch 3/4) | Schedule + overrides + handovers |

### Platform

| Page | File | Route | Status | Catatan |
|------|------|-------|--------|---------|
| Admin (Divisions…Roles) | [`admin.md`](./admin.md) | `/admin/*` | ✅ Draft (batch 3/4) | Hierarchy RBAC + DataQuality |
| Applications Catalog | [`applications.md`](./applications.md) | `/applications/catalog` | ✅ Draft (batch 3/4) | Catalog searchable + membership |
| Profile / Settings | [`settings.md`](./settings.md) | `/profile`, `/settings` | ✅ Draft (batch 3/4) | Profile + Hub 5-panel (Notifications/Tokens/Appearance/Integrations) |
| Notifications | [`notifications.md`](./notifications.md) | `/notifications` | ✅ Draft (batch 3/4) | Feed + Preferences + Quiet Hours |
| AI Workspace | [`ai.md`](./ai.md) | `/ai` | ✅ Draft (batch 3/4) | Chat Workspace + completeness |

> Legacy `docs/pages/*.md` (20 file) sudah cover overview untuk semua route di atas — saat migrasi ke lifedoc, copy ringkasan dari `docs/pages/<page>.md` sebagai baseline `Current State`.

---

## Shared Concerns

Lihat [`_shared/README.md`](./_shared/README.md) untuk detail.

| Concern | File | Status |
|---------|------|--------|
| List toolbar & shell (DataTable) | [`_shared/list.md`](./_shared/list.md) | ✅ Draft |
| Entity detail page (3-column) | [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) | ✅ Draft |
| Create flow (modal + page) | [`_shared/create-flow.md`](./_shared/create-flow.md) | ✅ Draft |
| Entity comments | [`_shared/entity-comments.md`](./_shared/entity-comments.md) | ✅ Draft |
| Entity timeline | [`_shared/entity-timeline.md`](./_shared/entity-timeline.md) | ✅ Draft |
| Filter / Sort / Export | [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) | ✅ Draft |
| Routing (nested, Module Layout) | [`_shared/routing.md`](./_shared/routing.md) | ✅ Draft |
| Global search (—) | `_shared/global-search.md` | Parked — belum ada di OIS |
| App selector / scope switcher | [`_shared/app-selector.md`](./_shared/app-selector.md) | ✅ Draft (Plan E `VITE_FEATURE_APP_SCOPE_UI`) |
| RBAC & scope enforcement | [`_shared/rbac.md`](./_shared/rbac.md) | ✅ Draft |

---

## Template — Page Doc

Format baku untuk setiap `features/*.md`:

```markdown
# <Page Name>

Status: **Draft** | **Approved**
Route: `/path`
Sidebar: Operations / Service Delivery / Change & Delivery / Service Health / Foundation / Platform

## Intent
Satu-dua kalimat: tujuan halaman dari sudut user.

## Current State (snapshot src/routes/index.tsx)
- Komponen: `<Component>` di `src/routes/index.tsx:<line>`
- Working: ...
- Stub: ...
- Missing: ...

## Primary View
- Layout: list / grid / graph / dashboard / wizard
- Data visible: kolom/field utama
- Interaction: klik row, hover, select, dll

## Actions
| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Create | Toolbar btn | cmdb.write | — |

## Filters / Sort / Search
- Filters: field, default, persist di URL
- Sort: default column
- Search: scope

## Detail View
- Section: metadata / timeline / comments / linked
- Ref: [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md)

## State Lifecycle
Allowed transitions. Ref ke lifecycle matrix.

## Permissions (action-level)
| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| member | ✅ | ✅ | own | ❌ |

## Empty / Loading / Error
- Empty: message + CTA
- Loading: skeleton
- Error: banner + retry

## Phase 2 Deferred
- Feature X — rationale

## Design Preservation
Pattern dari `src/routes/*` yang wajib dipertahankan.
```

## Template — Shared Doc

```markdown
# <Concern Name>

Status: **Draft** | **Approved**
Used by: daftar halaman yang pakai

## Purpose
Satu paragraf: kenapa ini di-shared.

## Behavior
- Trigger / Steps / Outcome

## Edge Cases
- Kasus 1

## API Touchpoints
Endpoint yang di-hit. Ref ke [`../design/02-api-contract.md`](../design/02-api-contract.md).

## Design Preservation
Pattern yang dipertahankan.
```

---

## Conventions

1. **Status eksplisit** di header: `Draft` → `Approved`.
2. **Current State dari `src/routes/index.tsx`** di-reference dengan line range.
3. **Phase 1 vs Phase 2 explicit** — tidak ada "maybe later".
4. **Cross-reference `_shared/*`** kalau functionality dipakai >1 halaman. Jangan duplikasi.
5. **Permissions matrix** role × action per page (dari `server/auth/permissions.ts` + scope context `ApplicationTeamRole OWNER/CONTRIBUTOR/VIEWER`).
6. **Tidak iterasi batch.** Satu file dibuka per session, diskusi + tulis + approve, baru pindah file berikutnya.

---

## Content Boundary (apa taruh di mana)

| Jenis konten | Lokasi | Lifecycle |
|-------------|--------|-----------|
| Living spec | Body doc yang relevan | Permanent, update-in-place |
| Open question aktif | §Open Items di doc relevan | **Ephemeral** — hapus saat resolved |
| Phase 2 deferred | §Phase 2 Deferred di doc relevan | Permanent commitment |
| Parked idea cross-feature | [`_backlog.md`](./_backlog.md) | Fluid, tanpa deadline |
| Parked engineering | `design/README.md` §Open Items atau doc design terkait | Fluid |
| Review discussion | Chat / PR comments | Ephemeral — tidak masuk docs |
| Change history | Git log + `## Changelog` per file | Immutable, tooled |
| Per-doc freshness | `## Changelog` table per file | Manual — tambah baris `| YYYY-MM-DD | ... | PR |` saat edit signifikan |

**Rules:**
- Jangan numpuk §Open Items. Saat resolved, hapus atau pindahkan.
- Review komentar tidak masuk doc — edit doc in-place.
- Tidak ada `_Last revised` footer — pakai `## Changelog` table (`| Date | Change | Ref |`) sebagai pengganti, biar history iterasi terlihat.
- `_backlog.md` bukan dumping ground. Review quarterly.

---

## Writing Order (recommended)

Saran iterasi per-file:

- **Option X — Complex first:** Incidents → Changes → Monitoring. Validasi template dengan page paling kaya.
- **Option Y — Simple first:** Overview → Inbox → Profile. Momentum + template refinement.
- **Option Z — Shared first:** `_shared/entity-detail-page.md` dulu (dipakai semua detail page).

Pilih satu, konsisten. OIS sudah punya `IncidentDetail` sebagai north star — **Option X** direkomendasikan.

---

## Next Step

Tentukan file pertama → buka satu file → diskusi + tulis → approve → pindah ke berikutnya.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Batch 3/4 parallel — 12 deep `testing, continuity, measurement, improvements, status-page, inbox, on-call, admin, applications, settings, notifications, ai` (via subagents) | — |
| 2026-08-28 | Batch 2 — `portal.md`, `releases.md`, `deployments.md` (3 deep) + redispatch deployments | — |
| 2026-08-28 | Batch 1 parallel — `problems.md`, `requests.md`, `kb.md`, `availability.md`, `capacity.md` (5 deep via subagents) | — |
| 2026-08-28 | Add `overview.md` exemplar #5 — hero + KPI 4 + major banner + feeds + calendar | — |
| 2026-08-28 | Add `cmdb.md` exemplar #4 — CmdbShell List/Graph + Detail 9 tabs + Audit + ForceGraph | — |
| 2026-08-28 | Add `monitoring.md` exemplar #3 — Module Layout 5 tabs (Overview/Stream/Rules/Routing/Coverage) + EventDetail | — |
| 2026-08-28 | Add `changes.md` exemplar #2 — Calendar/Board/List + Wizard + CAB + Detail 8-tabs | — |
| 2026-08-28 | Add `incidents.md` exemplar — deep spec (queue/detail/war room/analytics) as north star | — |
| 2026-08-28 | Init dari terra, diadaptasi untuk OIS — 24 routes dari `src/routes/index.tsx`, legacy `docs/pages/` sebagai baseline | — |
