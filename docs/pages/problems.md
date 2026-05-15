# Problems

> **Route utama:** `/problems` · **ITIL 4 Practice:** Problem Management · **Sumber kode:** `src/routes/problems/`, `server/routes/itsm.ts`

Halaman Problems mengelola root-cause analysis dan known errors. Tujuannya: **mencegah insiden berulang** dengan investigasi mendalam dan dokumentasi workaround.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/problems` | `ProblemList` | List + filter problem aktif/known error |
| `/problems/:problemId` | `ProblemDetail` | Detail problem dengan 6 tab |
| `/problems/:problemId/rca` | `RCAWorkspace` | Workspace RCA (5 teknik) |
| `/kedb` | `KEDB` | Known Error DB self-service untuk L1/L2 |

Modal: `CreateProblemModal`, `PromoteToKnownErrorModal`, `LinkIncidentsModal`, `LinkChangeModal`, `CloseProblemModal`.

---

## 2. Key Features

- **Status workflow** 5-state: identified → investigating → known_error → fix_in_progress → closed.
- **Source tracking**: incident_pattern, major_incident, proactive, audit, user_reported.
- **RCA dengan 5 teknik**: Five Whys, Fishbone (Ishikawa), Fault Tree, Timeline, Narrative.
- **Recommended Actions** typed (corrective / preventive / detective) dengan owner & status.
- **Known Error promotion**: rootCause + workaround + effectiveness (full/partial/none).
- **Incident clustering visualization** di list (dot bewarna sesuai recurrence count).
- **KEDB search-first UX** dengan apply-workaround inline ke insiden aktif.

---

## 3. Page Anatomy — Problem List

```
Header: Title + counts (total · active · known errors) + KEDB link + New problem
Stats strip: Status buttons + Source summary
Filter bar: Search · Source · Owner · Reset
Tabel: ID Title Status Severity Source Owner Incidents(dots) Last incident Links
```

Sortable columns: lastIncidentDate (default desc), createdAt, relatedIncidentCount, severity. Incident dots: merah ≥4, oranye 2-3, abu-abu 1.

---

## 4. Detail Page Deep-Dive

Layout 3 kolom + pinned header. Strip warna by severity.

### Sidebar kiri
At a Glance, Related Incidents Summary, Permanent Fix (linked changes).

### Center — Tabs

| Tab | Isi |
|---|---|
| **Overview** | Description (editable), Affected Services, Pattern Summary (first/latest incident, avg MTTR, recurrence) |
| **Related Incidents** | Tabel insiden ter-link → klik ke `/incidents/:id` |
| **RCA** | Summary RCA + Root Causes + Contributing Factors + Recommended Actions; tombol "Open RCA workspace" |
| **Known Error** | KnownErrorCard atau CTA "Promote to Known Error" |
| **Fix Plan** | Linked Changes, Linked KB, Linked Improvements |
| **History** | Timeline: created → RCA started → published as KE → updated → closed |

### Sidebar kanan — Quick Actions
Promote to known error · Link incidents · Open RCA workspace · Link change · Suggest KB article · Close problem.

---

## 5. RCA Workspace (`/problems/:id/rca`)

Header: technique selector dropdown, author info, "Last saved", Save draft + Publish RCA buttons.

### Editor per teknik
- **Five Whys**: iterative levels (max 8), problem statement card di atas.
- **Fishbone**: problem head + 2-col grid kategori (Technology / Process / People / Environment), tiap kategori list cause.
- **Narrative**: textarea 12-row prose.
- **Fault Tree / Timeline**: placeholder, fallback ke Five Whys/Fishbone.

### Common sections (di bawah editor)
- **Root Causes** (definitive) — string list.
- **Contributing Factors** — string list.
- **Recommended Actions** — table: Type (corrective/preventive/detective) · Description · Owner · Status (open/in_progress/done) + linked change.

Publish flow: Save draft → Publish RCA → banner sukses, button berubah jadi "Re-publish".

---

## 6. KEDB (`/kedb`)

Search-first untuk L1/L2 selama incident response.

- Hero search besar (symptom, error message, CI name).
- Hot searches default: pool, connection, timeout, ssl, auth.
- Filter: Service · Effectiveness (full/partial/none).
- Card per known error: KE-{problemId}, related incidents count, affected services, view problem link.
- **Apply Workaround**: pilih insiden aktif → langsung ke `/incidents/:id`.

---

## 7. User / UX Flow

### Happy path — Recurring incident → Problem
1. Operator melihat insiden P3 yang ke-5 kali untuk CI yang sama.
2. Buat problem baru via "New problem" → status `identified`.
3. Link insiden terkait via tab Related Incidents.
4. Buka RCA Workspace → pilih Five Whys → publish.
5. Tab Known Error → Promote → isi workaround + effectiveness.
6. Status → `known_error`, masuk KEDB.
7. Saat permanent fix siap → link change → status → `fix_in_progress`.
8. Setelah change closed_successful → close problem.

### Path — KEDB self-service
1. L1 baru menerima insiden, search di KEDB "connection pool".
2. Match KE-PRB-2026-0042 → baca workaround.
3. Klik "Apply Workaround" → pilih insiden → otomatis ke detail insiden untuk eksekusi.

---

## 8. State Model

```
identified → investigating → known_error → fix_in_progress → closed
                          ↓                    ↓
                       (langsung close kalau false alarm)
```

RCA bisa di-draft di state apa pun; dianjurkan minimal `investigating` sebelum publish.

---

## 9. Roles & Permissions

| Permission | Aksi |
|---|---|
| `problem.read` | Lihat list/detail (IFM all, APS team_app) |
| `problem.create` | New problem (IFM/APS Officer+) |
| `problem.update` | Status, RCA, promote, close (resource scope: ownerTeamId) |

`Can` component wrap setiap aksi; read-only message kalau user tidak punya update.

---

## 10. Upstream Dependencies

| Sumber | Untuk apa |
|---|---|
| **Incidents** | Related incidents, recurrence pattern, MTTR average |
| **CMDB** | Affected CIs |
| **Services** | Affected services |
| **Changes** | Linked changes (fix plan) |
| **KB** | Suggested articles, linked KB |
| **Improvements** | Linked initiatives untuk PIR follow-up |
| **Users** | Owner picker |

---

## 11. Downstream Effects

- **Changes**: link ke change request sebagai "permanent fix".
- **KB**: suggest article (pre-fill dari root cause).
- **Improvements**: PIR action items bisa jadi inisiatif improvement.
- **KEDB**: known error otomatis muncul kalau status → `known_error`.
- **Incidents**: incident detail sidebar menampilkan related problem otomatis.

---

## 12. Data Model

`Problem` (`src/types/problem.ts`):
- Identity: `id`, `publicId`
- Meta: `title`, `description`, `severity`, `status`, `source`
- Owner: `ownerId`, `ownerTeamId`
- Impact: `affectedCIIds/PublicIds`, `affectedServiceIds`, `relatedIncidentIds`, `relatedIncidentCount`, `firstIncidentDate`, `lastIncidentDate`
- RCA: `rca` (RCAAnalysis — technique + fiveWhys/fishbone + rootCauses + contributingFactors + recommendedActions)
- Known Error: `knownError` (rootCause + workaround + effectiveness + affectedVersions + permanentFixPlan)
- Links: `linkedChangeIds`, `linkedKBArticleIds`
- Tags, timestamps, closedAt

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/problems` | `problem.read` |
| GET | `/problems/:publicId` | `problem.read` |

> Catatan: mutasi (create/update/promote/close) saat ini di-handle client-side + audit; endpoint write akan diformalkan di M7.

---

## 14. Realtime / Jobs

- **Pattern detection job** (planned M7): scan incident pool untuk auto-suggest problem baru.
- **Audit log** untuk setiap status change & RCA publish.

---

## 15. Open Gaps / TODO

- POST/PATCH endpoints belum diformalkan; create problem masih client-side `extraProblems`.
- Fault Tree dan Timeline RCA editor masih placeholder.
- Auto-pattern detection belum ada (manual link).
- Notifikasi mention pada RCA collaboration belum end-to-end.

---

**Lihat juga:** [Incidents](./incidents.md) · [Changes](./changes.md) · [KB](./kb.md) · [Improvements](./improvements.md) · [CMDB](./cmdb.md)
