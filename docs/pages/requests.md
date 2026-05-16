# Service Requests

> **Route utama:** `/requests` · **ITIL 4 Practice:** Service Request Management (agent/fulfillment view) · **Sumber kode:** `src/routes/requests/`, `server/routes/itsm.ts`

Halaman ini adalah **fulfillment view** untuk agent: kelola antrian request, approve/reject step, reassign, track SLA, dan close request.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/requests` | `RequestQueue` | Antrian request dengan filter & quick chips |
| `/requests/:requestId` | `RequestDetail` | Detail + workflow stepper + 5 tab |

Modal: Approve, Reject, RequestInfo (clarify), Reassign, Cancel, AddWatcher.

---

## 2. Key Features

- **Workflow multi-step**: approval / task / automated step types, sequential.
- **Per-step SLA** dengan healthy/warning/breached status (warning &lt;25% remaining).
- **Bulk approval** indicator: badge "Awaiting my approval" di queue.
- **Reassign step** ke user lain.
- **Cancel request** dengan reason wajib (min 10 char).
- **Comments thread** + **watchers** (auto + explicit).
- **Linked items**: catalog item, related ticket (incident), KB articles.

---

## 3. Page Anatomy — Request Queue

Header: title + counts (total · active · my approval · breached).

Filter bar:
- Search (publicId/title/requesterName/catalogItemName)
- Status (9 options)
- Category (6 catalog categories)
- Step type (approval/task/automated)
- SLA (healthy/warning/breached)

Quick chips: Awaiting my approval · SLA at risk · My team · Last 24h.

Tabel kolom: ID · Title · Status · Requester · Current step · Assigned to · Submitted · SLA timer · Actions.

Sortir: pending approval untuk current user di atas, lalu createdAt desc.

---

## 4. Detail Page Deep-Dive

Layout 3 kolom + pinned header dengan strip warna by category.

### Workflow Stepper (full width below header)
Card per step:
- Step number badge + type icon
- Step name
- Status (completed: green ✓ + who approved + when; active: blue + assignee + SLA; rejected: red strikethrough; pending: gray)
- Approve/Reject buttons untuk current approver

Connector hijau antara completed steps.

### Sidebar kiri
- **At a Glance**: Status, Priority, Submitted, Requester, Category, Catalog link
- **SLA Timer**: total target, elapsed, progress bar (danger breached / warning &gt;75% / success), percentage, current step SLA

### Center — Tabs

| Tab | Isi |
|---|---|
| **Overview** | Description, form responses summary (first 4), linked items |
| **Form Responses** | Semua field + value (resolved untuk select/multiselect/checkbox) |
| **Activity** | Timeline lifecycle (created → submitted → step events → fulfilled → closed) |
| **Comments** | Thread + composer (textarea + Post) |
| **Linked Items** | Catalog item, related incident, KB articles |

### Sidebar kanan
- **Quick Actions**: Approve / Reject (kalau current approver), Request info, Reassign, Add comment, Cancel
- **Watchers**: auto (requester + step assignees, marked "(req.)") + explicit (removable) + Add Watcher modal

### Modals
- **Approve**: optional note (≤2000 char)
- **Reject**: reason wajib (min 20 char), warning subsequent steps skipped
- **RequestInfo**: kirim klarifikasi, request paused
- **Reassign**: pilih user (exclude current), confirm
- **Cancel**: reason min 10 char, warning irreversible
- **AddWatcher**: pilih user (exclude existing)

---

## 5. User / UX Flow

### Happy path — Approver
1. Approver buka `/requests`, klik chip "Awaiting my approval".
2. Klik request → detail.
3. Stepper menunjukkan step "Manager Approval" active dengan tombol Approve/Reject di kanan.
4. Klik Approve → optional note → confirm.
5. Step completed, next step otomatis activated, status mungkin → `approved` kalau semua approval done.

### Path — Reject
1. Approver review form responses → tidak setuju.
2. Klik Reject → isi reason ≥20 char → confirm.
3. Step rejected, subsequent pending steps skipped, request status → `rejected`.

### Path — Cancel by requester
1. Requester buka detail, klik Cancel di Quick Actions.
2. Reason ≥10 char → confirm.
3. Status → `cancelled`, semua active/pending steps di-skip, closedAt distempel.

---

## 6. State Model

```
draft → submitted → approved → in_fulfillment → pending_user → fulfilled → closed
                                                                    ↓
                                                              rejected / cancelled
```

Step states: pending → active → completed / skipped / rejected.

---

## 7. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `request.create` | Any auth user | Submit |
| `request.read` (own) | Requester | Read own |
| `request.read` (IFM) | IFM | Read all |
| `request.read` (APS) | APS Officer+ team_app | Read routed |
| `request.write` | APS/IFM Officer+ | Update, comment, watcher |
| `request.approve` | APS/IFM Team Lead+ | Approve/Reject |
| `request.fulfill` | APS/IFM Officer+ | Fulfill task steps |

`requestResource(req)` → ownerUserId (requester) + ownerTeamId (catalog owner team).

---

## 8. Upstream Dependencies

Catalog (formFields/workflowTemplate) · Users · KB · Incidents (related ticket field) · Notifications.

---

## 9. Downstream Effects

- **Changes**: request bisa men-trigger standard change otomatis.
- **Audit log**: semua write operation logged.
- **Notifications**: requester + step assignee + watchers di-notify on transition.

---

## 10. Data Model

`ServiceRequest` (`src/types/request.ts`):
- Identity, catalogItemId/PublicId/Name, catalogCategory
- title, description, status, priority
- requesterId/Name/TeamId
- formData (Record&lt;fieldId, value&gt;)
- workflow (currentStepIndex + steps[] WorkflowStepInstance)
- approvals[] (audit)
- assigneeId/Name (current handler)
- totalSlaHours, slaBreached, estimatedCompletion
- timestamps (submittedAt/approvedAt/fulfilledAt/closedAt)
- linkedChangeId, linkedKBSlugs
- commentCount, tags, comments?, watchers?
- cancellationReason

---

## 11. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/requests` | `request.read` |
| GET | `/requests/:publicId` | `request.read` |
| GET | `/requests/:publicId/comments` | `request.read` |
| GET | `/catalog` | `request.read` |
| POST | `/requests/:publicId/steps/:stepId/approve` | `request.write` |
| POST | `/requests/:publicId/steps/:stepId/reject` | `request.write` |
| POST | `/requests/:publicId/comments` | `request.write` |
| PATCH | `/requests/:publicId/cancel` | `request.write` (409 kalau closed) |
| PATCH | `/requests/:publicId/steps/:stepId/reassign` | `request.write` (409 kalau step !active) |
| POST | `/requests/:publicId/watchers` | `request.write` (idempotent) |
| DELETE | `/requests/:publicId/watchers/:userId` | `request.write` (idempotent, 204) |

Result discriminator: `{ kind: 'ok' | 'not-found' | 'already-decided' | 'closed' | 'not-active' | ... }`.

---

## 12. Realtime / Jobs

- **SLA breach scheduler**: scan active steps, set `slaStatus` warning/breached, trigger notif.
- **Audit log** untuk approve/reject/cancel/reassign/watcher add-remove/comment.
- **Notifikasi** ke assignee saat step active.

---

## 13. Open Gaps / TODO

- Auto-watcher derivation hardcoded (requester + step assignees); custom rules belum ada.
- "My team" quick filter masih return false (line 80-82); butuh team mapping resolve.
- File upload attachment di comment belum ada.
- SLA pause kalau status `pending_user` belum dihitung otomatis (saat ini elapsed terus jalan).

---

**Lihat juga:** [Self-Service Portal](./portal.md) · [KB](./kb.md) · [Changes](./changes.md) · [Notifications](./notifications.md)
