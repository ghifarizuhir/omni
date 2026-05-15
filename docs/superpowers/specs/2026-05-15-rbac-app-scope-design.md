# RBAC × Application Scope — Design Spec

- **Date:** 2026-05-15
- **Status:** Approved (brainstorm), pending implementation plan
- **Owner:** @ghifari
- **Related:** `2026-05-15-rbac-typed-tables-design.md`

## 1. Problem

Hari ini, hampir semua menu operasional (CMDB, Events, Incidents, Changes) menampilkan **semua data tenant tanpa mempertimbangkan kepemilikan aplikasi**. Akibatnya:

- User dari Team A bisa (secara teknis) mengedit CI milik App B yang sama sekali bukan tanggung jawabnya.
- List view tenggelam oleh data lintas-app yang tidak relevan untuk pekerjaan harian user.
- Tidak ada "konteks fokus" — user tidak tahu sedang berada di app mana saat membuat record baru, sehingga rawan salah-app.
- Tidak ada cara terstruktur bagi Team Lead untuk meminta akses ke app baru, atau bagi Application Owner untuk mengelola siapa yang boleh menulis di app-nya.

Schema sudah punya fondasi (`Tenant → Division → Department → Team`, `Application`, `ApplicationTeam`, `User.teamId`, `CI.ownerTeamId`), tapi tidak ada layer enforcement maupun UX yang menggunakannya.

## 2. Goals

1. **Application sebagai sumbu kepemilikan utama** untuk semua entitas operasional.
2. **Write hanya untuk Team yang member**, read default global untuk modul "katalog/koordinasi" dan scoped untuk modul "kerja harian".
3. **UX yang membuat scope selalu eksplisit** — user tahu di app mana dia berada, dan tidak bisa "tidak sengaja" menulis ke app yang salah.
4. **Enforcement yang anti-bocor** — tidak bergantung pada route author rajin memanggil helper; default-deny lewat layer repository.
5. **Self-service untuk Application Owner**, tanpa PlatformAdmin sebagai bottleneck.

## 3. Non-goals (MVP)

- Workflow request/approval akses lintas-app (catat sebagai future: `AppAccessRequest`).
- Time-bound membership ("akses 7 hari").
- Bulk import membership via CSV.
- Postgres RLS — diskusi sebagai depth-in-defense, tidak dibangun sekarang.
- Pemisahan tenant-tenant baru (sudah jadi hard boundary di luar scope ini).

## 4. Decisions (ringkasan brainstorm)

| # | Pilihan | Hasil |
|---|---|---|
| Q1 | Unit kepemilikan | **B — Application-owned**, akses derive dari `ApplicationTeam` |
| Q2 | Read vs write | **C — Per-modul**: read global untuk CMDB/Change/Problem/KB, scoped untuk Event/Incident/Request |
| Q3 | Bypass roles | **A+B+D+E** — PlatformAdmin, NOC/Service Desk, Application Owner, Auditor |
| Q4 | UX | **C — Hybrid switcher** dengan default "All my apps" + pin focus app |
| Q5 | Enforcement | **C — Prisma scoped repository layer** (`ScopedDb`) |
| Q6 | Membership mgmt | **B — PlatformAdmin + Application Owner self-service**, no request workflow di MVP |

## 5. Data model

### 5.1 Sudah ada (tetap dipakai)

- `Tenant`, `Division`, `Department`, `Team`
- `Application` (per-tenant, dengan `criticality`)
- `ApplicationTeam` (M:N Application↔Team)
- `User.teamId` (Team primer user)
- `ConfigurationItem.ownerTeamId`
- `FunctionalRole`, `UserFunctionalRole`

### 5.2 Perubahan

**`ApplicationTeam`** dapat kolom baru:

```prisma
enum ApplicationTeamRole {
  OWNER        // boleh kelola membership & ubah metadata app
  CONTRIBUTOR  // write penuh dalam app
  VIEWER       // read-only, meski app tergolong "scoped"
}

model ApplicationTeam {
  applicationId String
  teamId        String
  role          ApplicationTeamRole @default(CONTRIBUTOR)
  addedById     String?
  addedAt       DateTime            @default(now())
  // ...
}
```

**Functional roles tenant-level** (di-seed via `seed.prod.ts`):

- `PLATFORM_ADMIN` — bypass semua scope.
- `NOC_OPERATOR` — read-all + write create/triage Event & Incident lintas app.
- `AUDITOR` — read-all (termasuk modul scoped), no write.

**Kolom `applicationId` di entitas operasional scoped**

Tambah `applicationId String?` (akan dipromosikan ke `NOT NULL` di Fase 3) di:

- `ConfigurationItem` — dinamai `primaryApplicationId` (CI bisa terkait beberapa app via relationship terpisah, tapi satu jadi primer untuk ownership).
- `Event`, `Incident`, `ServiceRequest`, `Change`, `Problem`, `Release`.

Plus index `(tenantId, applicationId)` di semua tabel di atas.

**`KnowledgeArticle.visibility`** enum `tenant | application` (default `tenant`).

### 5.3 Invariants

- Setiap entitas scoped harus punya `applicationId` valid dalam tenant yang sama (post-Fase 3).
- Setiap `Application` harus punya ≥1 Team `OWNER` setiap saat.
- Cross-tenant access selalu ditolak, tanpa kecuali (tenant = hard boundary).

## 6. Scope policy matrix

| Modul | Read default | Write default | Bypass read | Bypass write |
|---|---|---|---|---|
| **CMDB (CI, relationships)** | Global tenant | Scoped | — | PlatformAdmin |
| **Change** | Global | Scoped | — | PlatformAdmin |
| **Problem** | Global | Scoped | — | PlatformAdmin |
| **Event** | Scoped | Scoped | NOC, Auditor, PlatformAdmin | NOC (create), PlatformAdmin |
| **Incident** | Scoped | Scoped | NOC, Auditor, PlatformAdmin | NOC (create/triage), PlatformAdmin |
| **Service Request** | Scoped | Scoped (requester=creator, assignee=app team) | Auditor, PlatformAdmin | NOC, PlatformAdmin |
| **Knowledge Base** | `visibility=tenant` global, `application` scoped | Scoped ke app pemilik | Auditor | PlatformAdmin |
| **Monitoring Rules / Alert Routes** | Global | PlatformAdmin (MVP) | — | PlatformAdmin |
| **Availability / Capacity reports** | Mengikuti CI (turunan) | Scoped | NOC, Auditor | PlatformAdmin |
| **Admin (Users, Teams, Apps, Roles)** | PlatformAdmin | PlatformAdmin | — | — |

Aturan tambahan:

- **NOC** hanya boleh *create / triage* Incident di app yang Team-nya bukan member. Untuk *close* / edit field bisnis, harus eskalasi ke Team app pemilik. Mempertahankan akuntabilitas.
- **Application Owner** = `ApplicationTeam.role = OWNER`. Otomatis write penuh di semua modul app-nya, plus kelola membership.

## 7. UX

### 7.1 `AppScopeSwitcher` (TopBar)

- Posisi: kiri TopBar, di sebelah logo, sebelum search.
- Label: `Scope: <App Name>` atau `Scope: All my apps`.
- Dropdown isi:
  - **All my apps** (default saat login).
  - Daftar app user (pinned dulu, lalu alfabetis).
  - Ikon pin 📌 untuk pin/unpin.
  - Search box jika user punya >10 app.
  - Untuk PlatformAdmin/Auditor: section "All tenant apps" (read-all).
- Chip color = `Application.criticality` (P1 merah lembut, P2 oranye, P3 kuning, P4 hijau).
- Persistensi: `localStorage` per user (pinned + last selected). Server simpan di session untuk audit trail.

### 7.2 Page-level

- Chip `Scope: …` di sebelah judul page (CMDB, Events, Incidents, Changes, dst.).
- Filter app per-page (multi-select) sebagai override sementara — tidak mengubah switcher TopBar.
- Empty state untuk "All my apps" + tanpa membership: CTA "Request access" (mailto ke OWNER calon app).

### 7.3 Form `+ New`

- **Scope = 1 app** → `applicationId` pre-filled & disabled (tombol kecil "change").
- **Scope = All my apps** → field `Application *` di atas form, required, dropdown terbatas ke writable apps.
- Modal konfirmasi muncul **hanya** saat submit ke app berbeda dari scope aktif: *"You're creating this in App X, but your current scope is App Y. Continue?"*

### 7.4 Read-only indicators

- Tombol Edit hidden / disabled-with-tooltip di item app yang user tidak punya write: *"Read-only — request access to App X."*
- Detail page: breadcrumb scope `App X › CMDB › Server-123`. Click app → dashboard app itu.

### 7.5 Onboarding

User tanpa app membership: landing khusus "You're not yet a member of any application." + tombol "Browse all apps" (read-only catalog) untuk user yang berhak global read.

### 7.6 Yang tidak berubah

- Struktur sidebar.
- Inbox/notifikasi tetap follow scope aktif, **tambah**: notifikasi cross-app yang ditujukan langsung ke user (mention, assignment) selalu tampil.

## 8. Enforcement layer

### 8.1 `ScopedDb`

`server/db/scoped.ts` exports `buildScopedDb(prisma, ctx)` yang membungkus Prisma per-request. Di-attach oleh middleware `withScopedDb` ke `req.scoped`.

```ts
const scoped = buildScopedDb(prisma, {
  userId, tenantId,
  appMemberships,     // [{ appId, role }]
  functionalRoles,    // ['NOC_OPERATOR', ...]
  activeScope,        // 'all' | appId
});
```

Method shape:

```ts
scoped.cmdb.list(filter)
scoped.cmdb.create(input)
scoped.cmdb.update(id, patch)
scoped.events.list(filter)
scoped.incidents.create(input)
// ... per modul
```

### 8.2 Computed sets (per request, lazy per-module)

- `readableAppIds: Set<string> | 'ALL'`
- `writableAppIds: Set<string>`
- `ownerAppIds: Set<string>`

Setiap modul memanggil policy-aware resolver:

```ts
const scope = resolvePolicy({ module: 'event', action: 'read', ctx });
// returns { kind: 'all' } | { kind: 'restricted', appIds }
```

### 8.3 Write validation

```ts
function assertCanWrite(module, action, appId, ctx) {
  if (ctx.functionalRoles.includes('PLATFORM_ADMIN')) return;
  if (module === 'incident' && action === 'create'
      && ctx.functionalRoles.includes('NOC_OPERATOR')) return;
  if (!ctx.writableAppIds.has(appId))
    throw new ScopeViolationError(module, action, appId);
}
```

Middleware translate `ScopeViolationError` → HTTP 403 `{ error: 'scope_violation', module, action, applicationId }`.

### 8.4 Route author rules

- Lint rule (`no-restricted-imports`): tidak boleh `import { prisma }` di `server/routes/*.ts` kecuali `admin.ts` & migration scripts.
- Route hanya boleh sentuh `req.scoped`.
- Admin route pakai `prisma` langsung tapi wajib di balik `requireRole('PLATFORM_ADMIN')`.

### 8.5 Audit trail

Setiap call `scoped.*.create/update/delete` menulis `AuditLog`:

```
{ userId, tenantId, applicationId, module, action, recordId,
  scopeMode: 'member'|'noc'|'owner'|'admin', at }
```

`scopeMode` diisi oleh resolver: `member` (jalur normal), `noc` (bypass NOC), `owner` (Application Owner), `admin` (PlatformAdmin bypass).

### 8.6 Testing

- **Unit:** matrix user × module × action di `buildScopedDb`.
- **Integration per modul:** minimal 3 persona (member-app-A, member-app-B, NOC) hit endpoint → assert hasil + status.
- **Smoke:** cross-tenant explicit denial.

## 9. Membership management

### 9.1 Halaman `/admin/applications`

- **PlatformAdmin**: semua app tenant; create, archive, assign Team, set/transfer OWNER.
- **Application Owner** (`role = OWNER` di app manapun): hanya app dia OWNER. Bisa add/remove Team, ubah role Team (CONTRIBUTOR ↔ VIEWER). Tidak boleh ubah identitas app atau OWNER.

### 9.2 Panel "Teams" per app

Kolom: Team · Role · Members · Added by · Added at · Actions (Change role, Remove).

Tombol `+ Add team` → modal pilih Team (searchable, exclude Team yang sudah ada) + role default `CONTRIBUTOR`.

### 9.3 Integrity rules

- App harus punya ≥1 Team `OWNER`. Hapus OWNER terakhir ditolak.
- Hapus Team dari app dengan open records: modal konfirmasi + pilihan **Reassign to another team** (required) atau **Allow orphan** (PlatformAdmin only).

### 9.4 Self-service catalog

`/admin/applications/catalog` (read-only untuk semua user):

- Semua app tenant + badge "You're a member" / "Not a member".
- Tombol "Contact owners" → tampilkan email OWNER (mailto link). Tidak ada workflow request di MVP.

### 9.5 Audit

Semua membership change tulis `AuditLog` `module: 'application_membership'`. Tab "Activity" di panel app.

### 9.6 Tidak dibangun (di-defer)

- `AppAccessRequest` workflow.
- Time-bound membership.
- CSV bulk import.

## 10. Rollout

### 10.1 Fase

| Fase | Ruang lingkup |
|---|---|
| **0 — Schema persiapan** | Migration additive: `applicationId?` di tabel scoped, `role` di `ApplicationTeam`, functional role seeds, index `(tenantId, applicationId)`. |
| **1 — Backfill** | `prisma/backfillAppScope.ts` mengisi `applicationId` dari `ownerTeamId` (CI) & dari CI referensi (Event/Incident). Report row gagal → admin UI `/admin/data-quality`. |
| **2 — Enforcement toggle** | Env `SCOPE_ENFORCEMENT_MODE = off \| warn \| enforce`. `warn` mencatat violation + header `X-Scope-Warning`, request lolos. Default rollout: dev `enforce`, staging `warn`→`enforce`, prod `warn` selama 2 sprint lalu `enforce`. |
| **3 — Required `applicationId`** | Migration `NOT NULL` setelah backfill >99%. Row sisa pindah ke "App: Unassigned" sintetis (PlatformAdmin only). |
| **4 — UX rollout** | `AppScopeSwitcher` di feature flag `feature.app_scope_ui`. Pilot 1 tenant test 1 minggu, lalu enable semua. |
| **5 — Cleanup** | Hapus `off`/`warn` path. Hapus backfill scripts dari runtime path (tetap di repo). |

### 10.2 Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Tim tidak tahu app-nya | `warn` mode + report mingguan ke OWNER calon app |
| User reguler salah app | Modal konfirmasi mismatch + chip scope persistent |
| PlatformAdmin bottleneck | Application Owner self-service sejak hari-1 |
| Scope check overhead per request | Cache `appMemberships` di session payload, invalidate saat membership berubah |
| Modul global terlewat | Lint rule + explicit policy tag per modul di repository |

### 10.3 Definition of Done

- [ ] Semua route operasional pakai `req.scoped`, lint rule aktif.
- [ ] 100% test integrasi 3 persona × 7 modul utama hijau.
- [ ] `applicationId` `NOT NULL` di semua tabel scoped.
- [ ] AppScopeSwitcher live di prod, telemetry ≥80% user pernah pakai.
- [ ] Doc admin "How to manage application membership" published di KB.
- [ ] Audit log `scopeMode` dapat di-query oleh PlatformAdmin.

## 11. Open questions (tracked, not blocking)

- Apakah CI bisa terkait ke >1 app secara first-class (`CIApplication` M:N) selain `primaryApplicationId`? Diusulkan **ya** — bahas saat implementasi CMDB scope.
- Apakah `MonitoringRule` perlu di-scope ke app di milestone berikutnya? Saat ini global, tapi banyak tim besar akan ingin "rules per app".
- Field `Application.criticality` apakah cukup dipakai sebagai input warna chip atau perlu derivasi (mis. high jika ada P1 incident aktif)?

---

*Spec ini hasil brainstorm 2026-05-15 dengan @ghifari. Sebelum implementasi, plan detail akan dibuat via `superpowers:writing-plans`.*
