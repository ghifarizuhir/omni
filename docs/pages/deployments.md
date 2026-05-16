# Deployments

> **Route utama:** `/deployments` · **ITIL 4 Practice:** Deployment Management · **Sumber kode:** `src/routes/deployments/`, `server/routes/itsm.ts`

Halaman Deployments memantau dan mengontrol eksekusi deployment ke environment dev/staging/prod/dr — termasuk rollback, re-deploy, freeze window, dan kesehatan environment pasca-deploy.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/deployments` | `DeploymentsQueue` | Antrian semua deployment |
| `/deployments/:deploymentId` | `DeploymentDetail` | Detail single deployment |
| `/environments` | `Environments` | Kesehatan environment + deploy health |

`DeploymentsLayout` membungkus tab `/deployments` dan `/environments` dengan **status header dinamis** yang berubah warna (merah=rollback, oranye=failure 24h, biru=running, hijau=healthy).

---

## 2. Key Features

- **Antrian deployment** dengan filter multi-dimensi (status, env, component, strategy, trigger).
- **Quick chips**: Active · Failed · Rolled back · Last 24h · Production only.
- **Manual deploy** lewat modal (component, env, artifact ref, strategy, branch).
- **Live updates**: durasi berjalan diupdate setiap detik untuk deployment running.
- **Rollback / Re-deploy / Cancel** dengan permission gate `release.implement`.
- **Pipeline stages** visualisasi (preparation → apply → verification → finalization).
- **Live logs** dengan level (debug/info/warn/error/fatal) dan source.
- **ETA** dihitung dari rata-rata durasi stage yang sudah selesai × stage tersisa.
- **Freeze window** awareness — environment yang frozen muncul di sidebar Environments.
- **Health post-deploy**: pending → healthy / degraded / failed.

---

## 3. Page Anatomy — Deployments Queue

```
┌─────────────────────────────────────────────────────────────┐
│  [Active deployment banner — kalau ada]                     │
├─────────────────────────────────────────────────────────────┤
│  Filter: Search · Status · Env · Component · Strategy ·     │
│          Trigger · Reset                                     │
│  Quick chips: Active · Failed · Rolled back · …              │
├─────────────────────────────────────────────────────────────┤
│  Tabel: Status ID Component Version Env Strategy Trigger    │
│         Started Duration  ⋯                                  │
│                                          [+ Manual deploy]  │
└─────────────────────────────────────────────────────────────┘
```

Kolom **Status** menampilkan `DeploymentStatusPill` plus badge insiden kalau ada `triggeredIncidentIds`. Kolom **ID** ada prefix ↩ kalau status = `rolled_back`. Action menu: Open · Rollback · Cancel · Re-deploy (semua bersyarat status + permission).

---

## 4. Detail Page Deep-Dive

### 4.1 Top bar
Back ke `/deployments`, action menu (Copy ID, Export logs, Rollback). `DeploymentHero` menampilkan metadata utama.

### 4.2 Layout 60/40
- **Kiri 60%**: `DeploymentStages` — visualisasi pipeline stage by stage.
- **Kanan 40%**: `LogPanel` — live logs scrollable.

### 4.3 Tabs

| Tab | Isi |
|---|---|
| **Overview** | Component, Version, Artifact ref, Commit SHA + message, Branch, Target CIs (link `/cmdb/:id`), Pipeline Run URL (external), Manifest ref, Tags |
| **Manifest** | YAML manifest (kalau `manifestYaml` tersedia) |
| **Linked Items** | Release card → `/releases/:id`, Change card → `/changes/:id`, Test Run card |
| **Triggered Incidents** | List insiden yang ter-trigger oleh deployment ini → `/incidents/:id` |
| **History** | Timeline: created → stage completions → rollback init/complete |

### 4.4 Sticky Action Bar (status-aware)
- **Running**: progress `done/total %`, ETA, Rollback button
- **Success**: health, Re-deploy, Rollback
- **Failed**: Re-deploy
- **Rolled back**: rollback reason, Re-deploy
- **Pending / Cancelled / Rolling back**: status label saja
- Kalau `!canDeploy`: banner read-only.

### 4.5 Modals
- **Re-deploy Modal**: konfirmasi artifact + env, peringatan "stage progress akan reset".
- **Rollback Modal**: input reason wajib, konfirmasi target rollback.

---

## 5. Environments Page

### Kartu environment (3 kolom)
Per environment (dev / staging / prod / dr): health, uptime 30d, active deployment count, failure rate 7d.

### Center
**Recent Deployments** (7 hari terakhir) dengan filter env + status.

### Sidebar kanan
- **Deploy Health (7d)**: success rate, avg duration, active failures, rollbacks.
- **Freeze Windows**: env yang frozen + reason + badge "Only P1 changes allowed".
- **Upcoming Deployments**: pending dengan `scheduledFor`, link ke change yang menjadwalkan.

---

## 6. User / UX Flow

### Happy path — Production deploy
1. Engineer pilih **+ Manual deploy** dari queue.
2. Isi component, env=production, artifact ref `my-service:v1.2.3`, strategy=rolling.
3. Deployment masuk antrian dengan status `pending`.
4. Saat eksekusi → `running`, sticky bar menampilkan progress + ETA.
5. Pipeline jalan stage by stage; logs streaming.
6. Sukses → `success`, post-deploy health check → `healthy`.

### Path — Failure & Rollback
1. Stage gagal → status `failed`, sticky bar tampilkan Re-deploy.
2. Engineer buka detail → tab History untuk kronologi.
3. Klik Rollback dari action menu → input reason → konfirmasi.
4. Status → `rolling_back` → `rolled_back`, ID di queue prefix ↩.
5. Kalau health check gagal → otomatis create insiden, link di tab Triggered Incidents.

### Path — Scheduled deploy via Change
1. Change dibuat dengan `scheduledFor`.
2. Deployment otomatis ter-create dengan status `pending` + `linkedChangePublicId`.
3. Muncul di sidebar Environments → Upcoming.
4. Saat windownya, scheduler men-trigger eksekusi.

---

## 7. State Model

```
pending → running → success ─┐
            ↓        ↓        │
          failed   rolling_back → rolled_back
                              
cancelled (terminal dari pending/running)
failed/rolled_back → bisa di-redeploy
success → bisa di-rollback
```

**Strategy**: `rolling`, `blue_green`, `canary`, `big_bang`, `phased`.
**Trigger**: `manual`, `cicd_pipeline`, `scheduled`, `auto_promotion`.
**Stage type**: `preparation`, `apply`, `verification`, `finalization`.
**Stage status**: `pending`, `running`, `success`, `failed`, `skipped`.
**Post-deploy health**: `pending`, `healthy`, `degraded`, `failed`.

---

## 8. Roles & Permissions

| Aksi | Permission | Syarat status |
|---|---|---|
| Rollback | `release.implement` | success / running |
| Cancel | `release.implement` | pending / running |
| Re-deploy | `release.implement` | failed / rolled_back |
| Read | `release.read` | — |

RBAC scope dihitung lewat `deploymentResource(dep)` → `linkedReleaseId` → owning team/app. Read-only mode tampil kalau user bukan owning team / Change Manager.

---

## 9. Upstream Dependencies

| Sumber | Untuk apa |
|---|---|
| **Releases** | `linkedReleaseId/PublicId`, owner team |
| **Changes** | `linkedChangeId/PublicId`, scheduledFor |
| **CMDB** | Target CIs, component CI |
| **Testing** | Linked test run + result |
| **Environments** | Health, freeze window |

---

## 10. Downstream Effects

- **Incidents**: deployment yang gagal health check → auto-create insiden, link via `triggeredIncidentIds`.
- **Releases**: deployment sukses memajukan release status (`deployed`).
- **Status Page**: deployment ke production bisa men-trigger announcement (lewat change).
- **Audit Log**: setiap rollback/cancel/redeploy dicatat.

---

## 11. Data Model

`Deployment` (lihat `src/types/deployment.ts`):
- Identity: `id`, `publicId`
- Artifact: `componentName`, `componentCIPublicId`, `artifactRef`, `commitSha`, `commitMessage`, `branch`
- Target: `environment`, `targetCIIds[]`
- Execution: `status`, `strategy`, `trigger`, `triggeredById/Name`
- Linkage: `linkedReleaseId/PublicId`, `linkedChangeId/PublicId`
- Pipeline: `stages[]` (DeploymentStage), `currentStageIndex`
- Timing: `scheduledFor`, `startedAt`, `completedAt`, `durationSec`
- Health: `postDeployHealth`, `healthCheckedAt`
- Rollback: `{ initiatedAt, initiatedBy, reason, rolledBackToDeploymentId, completedAt }`
- Incidents: `triggeredIncidentIds[]`
- Meta: `pipelineRunId`, `pipelineUrl`, `configHash`, `manifestRef`, `manifestYaml`, `tags`, timestamps

Sub-types: `DeploymentStage`, `DeploymentLogEntry`, `EnvironmentInfo`.

---

## 12. API Endpoints (`/api/v1`)

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/deployments` (filter `?active=true`) | `release.read` |
| GET | `/deployments/:publicId` | `release.read` |
| GET | `/deployments/:id/logs` | `release.read` |
| GET | `/environments` | `release.read` |

Mutation (rollback/redeploy/cancel) saat ini di-handle via service layer + audit; endpoint write akan diformalkan di M7.

---

## 13. Realtime / Jobs

- **Live elapsed timer**: client-side interval 1s untuk deployment `running`.
- **Optimistic UI**: `localStatuses` map untuk update sebelum server confirm.
- **Pipeline executor** (di luar Omni — biasanya CI/CD eksternal): push status update via webhook ke `/integrations/...`.
- **Health checker**: scheduled job pasca-deploy, menulis `postDeployHealth`.

---

## 14. Open Gaps / TODO

- Manual deploy modal saat ini hanya menambah ke `extraDeployments` lokal — endpoint POST `/deployments` belum diformalkan.
- Rollback / Re-deploy / Cancel masih optimistic-only di beberapa jalur; endpoint mutation server perlu diselesaikan (M7).
- Stage real-time progress per stage masih bergantung webhook eksternal.
- Freeze window enforcement saat ini hanya warning UI, belum hard-block.

---

**Lihat juga:** [Releases](./releases.md) · [Changes](./changes.md) · [Testing](./testing.md) · [Incidents](./incidents.md) · [CMDB](./cmdb.md)
