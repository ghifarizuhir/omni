# Incidents

> **Route utama:** `/incidents` · **ITIL 4 Practice:** Incident Management · **Sumber kode:** `src/routes/incidents/`, `server/routes/incidents.ts`

Halaman Incidents adalah pusat penanganan gangguan layanan. Tujuannya: **memulihkan layanan secepat mungkin** sambil menjaga jejak komunikasi, SLA, dan keterkaitan dengan CI, problem, dan change.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/incidents` | `IncidentQueue` | Antrian/triage semua insiden |
| `/incidents/analytics` | `IncidentAnalytics` | KPI, MTTR, SLA compliance, recurring CI |
| `/incidents/:incidentId` | `IncidentDetail` | Halaman detail insiden (workspace utama) |
| `/incidents/major/:incidentId` | `MajorIncidentWarRoom` | War room full-screen untuk Major Incident |

Modal yang sering muncul: `ResolveIncidentModal`, `PromoteMajorModal`, `StandDownModal`, `LinkCIModal`, `LinkProblemModal`, `LinkChangeModal`, `UserPickerModal`.

---

## 2. Key Features

- **Triage cepat** lewat quick filter chips (My open, SLA at risk, P1/P2, Last 24h, Customer-facing).
- **Bulk action**: assign, ubah priority, tag, close, export CSV.
- **Dual SLA** (response + resolve) dengan progress indicator dan status `healthy / warning / breached / paused / met`.
- **Major Incident lifecycle**: promote → war room → stand down (dengan reason wajib).
- **Linkage lengkap**: CI (CMDB), triggering event (Monitoring), problem, change, KB article, outage.
- **Comment thread** dengan internal note (tidak terlihat reporter), mention, attachment, Markdown toolbar.
- **Watchers** untuk subscribe perubahan tanpa jadi assignee.
- **BIA context** otomatis muncul di sidebar kalau service yang terdampak punya entri Business Impact Analysis.
- **Related incidents** suggestion: insiden lain di CI yang sama dalam 7 hari terakhir.

---

## 3. Page Anatomy — Incident Queue

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Title + stats (total/active/major) + Analytics +   │
│          New incident                                        │
├─────────────────────────────────────────────────────────────┤
│  [Banner Major aktif — kalau ada]                           │
├─────────────────────────────────────────────────────────────┤
│  Filter bar: Search · Status · Priority · Reset              │
│  Quick chips: 🔥 My open · ⚠ SLA at risk · 💥 P1/P2 · …     │
├─────────────────────────────────────────────────────────────┤
│  [Bulk action bar — muncul saat ada baris dipilih]          │
├─────────────────────────────────────────────────────────────┤
│  Tabel: ☐ Priority ID Title Status Assignee Service Created │
│         SLA Tags  ⋯                                          │
└─────────────────────────────────────────────────────────────┘
```

Sortir default: priority asc, lalu created date desc. Klik baris → detail. Hover baris → menu "View / Assign to me".

---

## 4. Detail Page Deep-Dive

### 4.1 Top bar
- Tombol "← Queue", **Status dropdown** (gated `incident.update`), overflow menu (Copy ID, Copy link).

### 4.2 Header insiden
Strip warna sesuai priority (P1 merah `#B42318`, P2/P3 oranye, P4 hijau), badge **MAJOR** kalau aktif, public ID, title, tags, info created/reporter/assignee/updated.

### 4.3 Sidebar kiri
- **Status + Priority** (kartu featured)
- **At a glance**: Severity, Created, Reporter, Channel, Assignee, Incident Commander (kalau major)
- **SLA timers** (response + resolve)
- **Affected services**
- **Watchers** + tombol "+ Add watcher"

### 4.4 Center — Tabs

| Tab | Isi |
|---|---|
| **Overview** | Description (editable), Customer impact, Triggering event |
| **Timeline** | Event stream lengkap dengan filter (All / Status / Comments / System / CI/Linkage / Comms) |
| **Comments** | Thread + composer (Markdown, internal toggle, mentions) |
| **Affected CIs** | Kartu CI dengan health badge → klik ke `/cmdb/{publicId}` |
| **Linked Items** | Triggering event, linked problem, linked changes, KB articles, outages dalam jendela 3 jam |
| **Resolution** | Summary, root cause, workaround — atau tombol "Mark as resolved" (`incident.close`) |

### 4.5 Sidebar kanan
- **Quick actions**: Assign to me · Acknowledge · Resolve · Promote to Major · Add comment · Link CI · Link problem
- **BIA Context**: Impact Level, Score, RTO/RPO, estimated hourly cost
- **Related incidents** (max 5, klik "View all" → search queue by CI ID)

---

## 5. Major Incident War Room (`/incidents/major/:id`)

Layout 3 kolom (35% / 40% / 25%):

| Kolom | Isi |
|---|---|
| **Kiri — Activity Stream** | Timeline event lengkap |
| **Tengah — Comms Log + Composer** | Filter `kind=comms_posted`, composer audience (internal / all_staff / customer), channel delivery, optimistic UI |
| **Kanan — Status Panel** | Affected services, Roles (Incident Commander dst.), Quick links, Quick actions (Add commenter, Link change/problem, **Stand down**, **Resolve**) |

**Stand Down Modal** wajib reason ≥ 10 karakter, default newPriority `P2`. Mobile akan menampilkan fallback "Desktop recommended".

---

## 6. Incident Analytics (`/incidents/analytics`)

KPI row (4 kartu): **Total**, **MTTR**, **SLA compliance**, **Major incidents** — semua dengan trend vs periode sebelumnya.

Panel: Volume over time (P1 vs P2), MTTR by Service, Top Categories (tag), **Top Recurring CIs** (sortable, dengan badge "● Active" kalau CI sedang punya problem aktif), SLA Performance by Priority. Date range: 7d / 30d / 90d. Export CSV.

---

## 7. User / UX Flow

### Happy path — Triage & Resolve
1. Operator buka `/incidents`, pakai chip **"🔥 My open"**.
2. Klik insiden P2 → masuk detail.
3. Tab **Overview** → baca description & customer impact.
4. Sidebar kanan → **Acknowledge** (status → triaging).
5. Tab **Affected CIs** → cek CMDB context.
6. Tab **Comments** → post update internal.
7. Sidebar kanan → **Resolve** → isi summary, root cause, workaround → opsi: buat KB article + jadwalkan PIR.
8. Status pindah ke `resolved`, timeline mencatat `resolution_added` + `resolved`.

### Path Major Incident
1. Operator klik **Promote to Major** → pilih Incident Commander.
2. Auto-redirect ke `/incidents/major/:id`.
3. IC posting comms ke audience `all_staff` lalu `customer`.
4. Status Page otomatis terupdate (downstream effect).
5. Setelah stabil → **Stand down** dengan reason → balik ke detail standar.

### Path Incident → Problem
1. Tab **Linked Items** → "+ Link problem" → pilih existing problem atau buat baru.
2. Sistem mencatat `problem_linked` di timeline kedua sisi.
3. Saat resolve, root cause akan link otomatis ke problem.

---

## 8. State Model

```
new → triaging → in_progress → pending → resolved → closed
                                         ↑
                                 (reopen kalau perlu)
```

Major flag orthogonal: insiden bisa `in_progress` **dan** `isMajor=true`. Stand down menurunkan flag tapi tidak otomatis mengubah status.

Timeline event kinds: `created`, `assigned`, `priority_changed`, `status_changed`, `comment_added`, `ci_linked/unlinked`, `problem_linked`, `event_linked`, `sla_warning`, `sla_breached`, `escalated`, `major_declared`, `comms_posted`, `resolution_added`, `resolved`, `reopened`, `closed`, `promoted_major`, `major_stood_down`, `linked`, `watcher_added/removed`.

---

## 9. Roles & Permissions

| Permission | Aksi yang dibuka |
|---|---|
| `incident.read` | Lihat queue/detail/timeline/comments |
| `incident.create` | Tombol "New incident" |
| `incident.write` | Status/priority/tag, assign, link, comment, promote major, stand down, comms, watchers |
| `incident.resolve` | Endpoint resolve (server-side) |
| `incident.close` | Tombol Resolve & Mark as resolved |

RBAC scope: `filterReadable()` + `incidentResource(inc)` — assignee, reporter, IC, dan permission terhadap problem/change yang ter-link ikut diperhitungkan.

---

## 10. Upstream Dependencies (data yang dibaca)

| Sumber | Untuk apa |
|---|---|
| **CMDB** (`cmdbService`) | Affected CI, health, link ke `/cmdb/:id` |
| **Monitoring** (`eventsService`) | Triggering event, link ke `/events/:id` |
| **Problems** (`problemsService`) | Linked problem, related problem suggestion |
| **Changes** (`changesService`) | Linked changes (RFC) |
| **KB** (`kbService`) | Linked articles + suggest article |
| **Availability** (`availabilityService`) | Outages dalam jendela 3 jam |
| **Continuity** (BIA) | Impact Level, Score, RTO/RPO, hourly cost |
| **On-Call** (`onCallService`) | Default assignee suggestion (via routing) |
| **Users** | Picker assignee, watcher, IC |
| **Services** | Daftar service untuk affected & filter |

---

## 11. Downstream Effects (yang dipicu halaman ini)

- **Status Page**: comms `audience=customer` mem-publish update.
- **Availability**: insiden dengan affected service mempengaruhi outage tracking.
- **Problems**: link manual + auto-suggest dari resolution.
- **Changes**: link emergency change dari incident workspace.
- **KB**: opsi "create article from resolution" pada modal resolve.
- **Improvements**: PIR scheduling untuk major incident → entry baru di Improvement Register.
- **Notifications**: assignee, watcher, mention → notifikasi user.

---

## 12. Data Model (Prisma)

Model utama (lihat `prisma/schema.prisma`):
- `Incident` — record utama, banyak kolom JSON (tags, watchers, linkedChangeIds) dipending konversi ke `jsonb` di M7.
- `IncidentTimelineEvent` — append-only event log.
- `IncidentComment` — thread + parentCommentId untuk reply.

DTO domain di `src/types/incident.ts`: `Incident`, `IncidentTimelineEvent`, `IncidentComment`.

---

## 13. API Endpoints (`/api/v1/incidents`)

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/incidents` (filters: `active`, `major`, `ciId`, `problemPublicId`) | `incident.read` |
| GET | `/incidents/:publicId` | `incident.read` |
| GET | `/incidents/:id/timeline` | `incident.read` |
| GET | `/incidents/:id/comments` | `incident.read` |
| POST | `/incidents/:id/comments` | `incident.write` |
| PATCH | `/incidents/:publicId` (priority, tags) | `incident.write` |
| PATCH | `/incidents/:publicId/status` | `incident.write` |
| PATCH | `/incidents/:publicId/assign` | `incident.write` |
| PATCH | `/incidents/:publicId/links` | `incident.write` |
| POST | `/incidents/:publicId/resolve` | `incident.resolve` |
| POST | `/incidents/:publicId/promote-major` | `incident.write` |
| POST | `/incidents/:publicId/stand-down` | `incident.write` |
| POST | `/incidents/:publicId/comms` | `incident.write` |
| POST | `/incidents/:id/watchers` | `incident.write` |
| DELETE | `/incidents/:id/watchers/:userId` | `incident.write` |

Pattern: semua mutation return updated `Incident`. Failure → 4xx + message; modal owner yang re-try.

---

## 14. Realtime / Jobs

- **SLA scheduler** (in-process job di `server/jobs/`) memantau `slaResponseTarget` & `slaResolveTarget`, men-emit timeline event `sla_warning` / `sla_breached`.
- **Socket.io** broadcast perubahan ke room `incident:{publicId}` (queue list, detail, war room subscribe).
- **Audit log** menulis setiap mutasi ke `audit_event`.

---

## 15. Open Gaps / TODO

- Konversi field JSON-string ke `jsonb` (`tags`, `watchers`, `linkedChangeIds`) — bagian M7.
- Mobile war room belum diimplementasi (saat ini fallback message).
- War-room `commenters` (participant tracker) masih TODO di `MajorIncidentWarRoom.tsx`.
- Notifikasi mention belum end-to-end (mentions[] disimpan, delivery belum).

---

**Lihat juga:** [Problems](./problems.md) · [Changes](./changes.md) · [Monitoring](./monitoring.md) · [CMDB](./cmdb.md) · [Status Page](./status-page.md) · [Availability](./availability.md)
