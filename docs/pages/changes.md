# Changes

> **Route utama:** `/changes` · **ITIL 4 Practice:** Change Enablement · **Sumber kode:** `src/routes/changes/`, `server/routes/itsm.ts`

Halaman Changes mengelola RFC (Request for Change) end-to-end: planning, technical assessment, CAB review, scheduling, implementation, dan PIR.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/changes` | `ChangeCalendar` | 3 view: Calendar / Board / List |
| `/changes/new` | `NewChange` | RFC wizard 4-step |
| `/changes/calendar` | `ChangeCalendar` | (alias) |
| `/changes/cab` | `CABWorkspace` | CAB session voting workspace |
| `/changes/:changeId` | `ChangeDetail` | Detail change (8 tabs) |

Modal: Cancel, Tech Assessment, Reschedule, ScheduleSession, CastVote, ApplicationScopePicker.

---

## 2. Key Features

- **3 change types**: standard (pre-approved), normal (full CAB), emergency (expedited).
- **Risk score** otomatis: `RISK_BASE[level] + (factors-2)*5`, capped 100.
- **Conflict detection**: time_overlap, ci_overlap, service_overlap, freeze_window, dependency.
- **Freeze window** awareness (P1/P2 only kalau dalam window).
- **Technical Assessment** sebagai gate sebelum CAB review.
- **Approval Matrix** multi-approver (Service Owner, Change Manager, Release Manager).
- **Reschedule history** dengan reason audit trail.
- **PIR** (Post-Implementation Review) untuk change yang sudah implemented.
- **Auto-routed approvers** sesuai change type.
- **CAB workspace** dedicated dengan voting per agenda item, defer-to-next-session.

---

## 3. ChangeCalendar — 3 View

### Calendar view
Full-month/day grid dengan change ditempatkan sesuai `plannedStart`. Color-coded by status.

### Board view
Kanban swimlanes by status: draft → submitted → in_review → approved → scheduled → implementing → implemented.

### List view
Searchable table: ID, Title, Type, Status, Risk, Owner, Window. Filter status + risk + search.

### Sidebar kanan
- **This Week** — change minggu ini grouped by day, dengan flag conflict + freeze.
- **Awaiting Your Approval** — changes di mana current user adalah approver pending.
- **Active Conflicts** — list unresolved conflicts dengan severity.

---

## 4. NewChange Wizard

### Step 1 — Basics
Title, description, justification (required); change type (radio cards Standard/Normal/Emergency); affected CIs (TagInput); linked problems/incidents/release.

### Step 2 — Plan
Schedule (plannedStart/End datetime-local), freeze window detection, risk level + factors (min 2 untuk non-standard), impact level (Minimal→Extensive), implementation/rollback/test plans (implementation min 100 char).

### Step 3 — Review
Cards: Basics + Plan summary, **routing card** auto-detect approver berdasarkan type, CAB session callout, application scope picker, communications (Status page / Email / Slack).

### Step 4 — Submit
Final confirmation, scope mismatch modal kalau perlu.

### Success
Show publicId, redirect ke detail page.

**Draft auto-save** ke localStorage; restore on mount; "Draft saved" indicator.

---

## 5. ChangeDetail Deep-Dive

Layout 3 kolom (280px / flex / 280px) + pinned header dengan strip warna risk.

### Sidebar kiri
At a Glance · Risk Factors list · Tech Assessment status + sign-off button · Approvals (visual dots progress).

### Center — 8 Tabs

| Tab | Isi |
|---|---|
| **Overview** | Description, justification, affected scope, schedule, freeze warning, conflict status |
| **Plans** | Implementation/Rollback/Test plans (monospace) |
| **Tech Assessment** | TechAssessmentPanel (objective, scope, risks, sign-off) |
| **Approvals** | Warning kalau tech assessment belum approved; ApprovalMatrix; "Open CAB workspace" button |
| **Conflicts** | Empty state atau conflict cards (type, severity, conflictsWith, detected/resolved) |
| **Linked** | Problems, Incidents, Release, KB, Capacity recommendations |
| **PIR** | Hanya untuk change implemented; outcome, durations, learnings, follow-up actions |
| **History** | AuditTimeline lengkap |

### Sidebar kanan — Quick Actions
Tech Assessment · Approve change (gated tech assessment ready) · Open CAB workspace · Reschedule · Cancel change.

### Modals
Cancel (reason wajib, 409 kalau closed), Tech Assessment form, Reschedule (newStart/End + reason).

---

## 6. CABWorkspace (`/changes/cab`)

Layout 3 kolom: agenda kiri / voting tengah / session info kanan.

### Agenda (kiri)
Filter `status='in_review'`. Per item: shortened ID, risk badge, title, tech assessment status, approval dots, deferred badge.

### Voting Card (tengah)
- Header: ID, type, risk, window
- Description card + "Full detail" link
- Risk Assessment card (score bar + factors)
- Conflict Analysis card
- Linked Context card
- **Voting Table**: Approver · Role · Decision · Action; current user highlighted; "Cast vote" button untuk pending row
- Discussion Notes textarea

### CastVoteModal
Decision radio (Approve / Approve with conditions / Reject / Abstain), rationale (required for reject/conditions), lock vote checkbox.

### Toolbar
Start/End session, Schedule session, Export agenda CSV.

### Sidebar kanan
Session info (date, members), Freeze windows, Quarterly Stats (changes reviewed, approval rate, avg discussion time, failed PIRs).

---

## 7. User / UX Flow

### Happy path — Normal change
1. Change Manager click "+ New change" → wizard 4-step.
2. Submit → status `submitted`, auto-route ke approvers + tech assessor.
3. APS team yang own affected CI mengisi Tech Assessment → submit → status `in_review`.
4. CAB session Thursday → Change Manager open `/changes/cab`.
5. Voting members cast votes → semua approve → status `approved`.
6. Change owner confirm window → status `scheduled`.
7. plannedStart tiba → status `implementing` → setelah selesai → `implemented` → `closed_successful`.
8. PIR difile dalam SLA.

### Path — Emergency change
1. Insiden P1 → emergency change dari incident workspace.
2. Type=emergency, expedited routing (Change Manager only).
3. Approval cepat → langsung scheduled → implementing.
4. PIR wajib dengan justification post-implementation.

---

## 8. State Model

```
draft → submitted → in_review → approved → scheduled → implementing → implemented
                       ↓                                      ↓
                   rejected                        closed_successful / closed_failed
                       ↓
                   cancelled
```

Tech Assessment substate: not_started → in_progress → submitted → approved / rework_required.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `change.create` | change_manager | New change |
| `change.read` (APS) | APS Officer+ on team_app | Read changes affecting own apps |
| `change.read` (IFM) | IFM all | Read all |
| `change.assess` | APS Officer+ on team_app | Tech assessment |
| `change.approve` | varies by type | Vote di CAB |
| `change.implement` | owner / change_manager | Reschedule, execute |

---

## 10. Upstream Dependencies

Problems · Incidents · Release · KB · CMDB (CIs/services) · Users (approvers) · Capacity recommendations.

---

## 11. Downstream Effects

- **Releases**: change merged into release composition.
- **Deployments**: change dengan scheduledFor men-trigger deployment pending.
- **Status Page**: comms publish ke status page kalau enabled.
- **Improvements**: PIR action items → improvement initiative.
- **Outages**: change yang resolve outage di-link via `resolvingChangeId`.

---

## 12. Data Model

`Change` (`src/types/change.ts`):
- Identity: `id`, `publicId`
- Content: `title`, `description`, `justification`, `type`, `status`
- Risk: `risk`, `impact`, `riskScore`, `riskFactors[]`
- Schedule: `plannedStart/End`, `actualStart/End`, `implementationWindow`, `freezeWindow`
- Owner: `requesterId/Name`, `ownerId/Name`, `ownerTeamId`
- Affected: `affectedCIIds/PublicIds`, `affectedServiceIds`
- Plans: `implementationPlan`, `rollbackPlan`, `testPlan`
- Links: `linkedProblemIds`, `linkedIncidentIds`, `linkedReleaseId/PublicId`, `linkedKBSlugs`
- Process: `technicalAssessment`, `approvals[]`, `cabReviewedAt`, `cabSessionId`, `conflicts[]`, `pir`
- Comms: `commsRequired`, `commsChannels[]`
- Meta: `tags`, `cancellationReason`, `rescheduleHistory[]`, timestamps

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/changes` | `change.read` |
| GET | `/changes/:publicId` | `change.read` |
| POST | `/changes` | `change.create` |
| PATCH | `/changes/:publicId/cancel` | `change.write` (409 kalau closed) |
| PATCH | `/changes/:publicId/reschedule` | `change.implement` |
| PATCH | `/changes/:publicId/tech-assessment` | `change.assess` |

---

## 14. Realtime / Jobs

- **Conflict detector** (in-process): compute time_overlap & freeze window saat plannedStart berubah.
- **CAB session scheduler**: create event per Thursday 10:00 UTC.
- **Audit log** untuk setiap state transition.

---

## 15. Open Gaps / TODO

- Voting mutation belum ada endpoint server formal (saat ini client-state).
- Conflict detection saat ini hanya time + freeze; CI/service/dependency overlap masih partial.
- Approval workflow status machine belum mengirim notifikasi ke approver real-time (hanya inbox poll).
- PIR template belum standardized cross-tenant.

---

**Lihat juga:** [Incidents](./incidents.md) · [Problems](./problems.md) · [Releases](./releases.md) · [Deployments](./deployments.md) · [CMDB](./cmdb.md)
