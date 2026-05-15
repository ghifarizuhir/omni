# Releases

> **Route utama:** `/releases` · **ITIL 4 Practice:** Release Management · **Sumber kode:** `src/routes/releases/`, `server/routes/itsm.ts`

Halaman Releases mengelola paket rilis (composition of changes) dari planning sampai released, dengan pipeline visualization per environment dan release notes publik.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/releases` | `ReleasesList` | List release dengan filter type/status |
| `/releases/pipeline` | `ReleasePipeline` | Matrix release × environment |
| `/releases/notes` | `ReleaseNotes` | Feed release notes published |
| `/releases/:releaseId` | `ReleaseDetail` | Detail release (6 tab) |

`ReleasesLayout` membungkus tab dengan accent bar dinamis (red rolled_back / orange deploying / green ready / blue default).

---

## 2. Key Features

- **4 release type**: major, minor, patch, hotfix.
- **9 status**: planning, locked, in_validation, ready, deploying, released, partially_released, rolled_back, cancelled.
- **Composition tracking**: changes, problemsFixed, incidentsResolved, prerequisites.
- **Pipeline per stage** (dev → staging → prod) dengan approval gate optional, test results, post-deploy health.
- **Feature flags** read-only display.
- **Release notes** + internal notes terpisah.
- **Promote to staging/production** dengan permission gate.

---

## 3. Page Anatomy — ReleasesList

Header dengan accent bar + count summary (total tracked, released 30d, in_validation, deploying, ready, rolled_back).

Filter: search (publicId/component/version/name), type (Major/Minor/Patch/Hotfix), reset.

Status tabs dinamis (hanya status dengan count > 0 + All).

Card per release (`ReleaseCard`): publicId, component name, version, type chip, status pill, manager, planned date.

---

## 4. ReleaseDetail Deep-Dive

Layout 3 kolom (280px / flex / 280px) + pinned header strip warna by type.

### Sidebar kiri
At a Glance · Pipeline mini stepper · Composition counts.

### Center — 6 Tabs

| Tab | Isi |
|---|---|
| **Overview** | Description, 3-col grid (changes/problems/incidents counts) |
| **Composition** | Changes (link `/changes/:id`), Problems Fixed (link `/problems/:id`), Incidents Resolved (link `/incidents/:id`), Prerequisites (status met/blocked/pending) |
| **Pipeline** | 3-col grid `StageCard` (status icon, env, test results, started/completed, approval gate, Deploy button) |
| **Notes** | Release Notes (preformatted) + Internal Notes (kalau ada) |
| **Feature Flags** | Card per flag (key monospace, enabled/disabled badge, description, targeting) |
| **History** | AuditTimeline (created → stage events → approval → released) |

### Sidebar kanan — Quick Actions
Wrapped `Can module="release" action="approve"`:
- **Promote to staging** (primary, opens modal → status `deploying` → navigate `/deployments`)
- Lock composition / Add change (placeholder)
- **Cancel release** (destructive, opens modal)

Modal: Promote, Cancel (warning irreversible), Deploy to Environment.

---

## 5. ReleasePipeline (`/releases/pipeline`)

Matrix grid: 4 col (Release Info 220px + 3 environment columns).

### Filter tabs
All · Active only · Released · Rolled back.

### Rows
Active releases di atas, separator, then released (last 14 days).

**StageCell** per env: status icon, label, test results "X/Y tests", relative timestamp, approval gate warning, click → detail.

### Sidebar kanan
- **Pipeline Health**: success rate 30d, avg dev→prod, rollbacks 30d, failed validations.
- **Production Approval**: list releases status `ready` dengan "Review →" link.

---

## 6. ReleaseNotes (`/releases/notes`)

Filter: search (version/component/notes), component dropdown, type filter, reset.

Feed cards (max-width 768px, centered):
- Header: type chip + component + version + release date + publicId
- Optional subtitle (release name)
- Release notes content (preformatted, leading-relaxed)
- Footer: "View release detail →"

---

## 7. User / UX Flow

### Happy path
1. Release Manager create release → status `planning`, isi composition (link changes, problems, incidents).
2. Lock composition → `locked`.
3. Trigger validation suite → `in_validation`, test runs jalan.
4. Tests pass → status `ready`.
5. Click "Promote to staging" → modal → status `deploying`, redirect `/deployments`.
6. Stage demi stage progress (dev → staging → prod) dengan approval gate sebelum prod.
7. Production deploy success → status `released`, `actualReleaseDate` di-stamp.

### Path — Rollback
1. Stage gagal atau post-deploy health degraded → status `rolled_back`.
2. Pipeline matrix tampilkan dengan border merah.
3. Re-deploy atau cancel.

---

## 8. State Model

```
planning → locked → in_validation → ready → deploying → released
                                       ↓         ↓
                                 cancelled    partially_released
                                              rolled_back
```

Stage status: pending → in_progress → success / failed / rolled_back / skipped.
Post-deploy health: pending → healthy / degraded / failed.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `release.read` | STA/IFM/APS | List & detail |
| `release.create` | APS Officer+ team_app, atau Change Manager all | + New release |
| `release.update` | APS Officer+ team_app, atau Change Manager | Edit composition/notes |
| `release.approve` | APS Team Lead+ team_app, atau Change Manager/CAB Member | Promote |
| `release.implement` | APS Officer+ team_app, atau Change Manager | Deploy stage |

Resource scope via `releaseResource(release)` → `ownerTeamId`.

---

## 10. Upstream Dependencies

Changes (composition) · Problems (composition) · Incidents (composition) · Test Runs (validation) · Deployments (linked).

---

## 11. Downstream Effects

- **Deployments**: promote → trigger deployment per stage.
- **Status Page**: release notes bisa dipublish.
- **Changes**: linked changes status mengikuti release lifecycle.
- **Testing**: link test runs untuk validation evidence.

---

## 12. Data Model

`Release` (`src/types/release.ts`):
- Identity: `id`, `publicId`, `version`, `name`, `description`
- Classification: `type`, `status`
- Artifact: `componentName`, `componentRepoUrl`, `componentCIPublicId`
- Composition: `composition` (changes / problemsFixed / incidentsResolved / prerequisites[])
- Pipeline: `stages[]` (env, status, testsPassed/Total, postDeployHealthCheck, approvalRequired, approverId/approvedAt), `currentStageIndex`
- Dates: `plannedReleaseDate`, `actualReleaseDate`
- Owner: `releaseManagerId/Name`, `ownerTeamId`
- Notes: `releaseNotes`, `internalNotes`
- Links: `linkedDeploymentIds`, `linkedTestRunIds`, `linkedKBSlugs`
- `featureFlags[]` (key, description, enabledByDefault, targeting)
- `tags`, timestamps

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/releases` | `release.read` |
| GET | `/releases/:publicId` | `release.read` |

> Mutation (create/update/promote/cancel) saat ini optimistic client-side; endpoint write akan diformalkan di M7.

---

## 14. Realtime / Jobs

- **Pipeline executor**: external CI/CD push status update → webhook → update stage.
- **Validation orchestrator**: trigger test runs saat status `in_validation`.

---

## 15. Open Gaps / TODO

- Endpoint POST/PATCH belum diformalkan (NewReleaseModal masih client-side).
- Approval gate enforcement bergantung manual di stage.
- Feature flags read-only di UI; edit belum tersedia.
- Pagination belum ada (cocok untuk &lt;1000 releases).

---

**Lihat juga:** [Changes](./changes.md) · [Deployments](./deployments.md) · [Testing](./testing.md) · [Status Page](./status-page.md)
