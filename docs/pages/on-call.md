# On-Call

> **Route utama:** `/on-call` · **ITIL 4 Practice:** Workforce & Talent Management (operational on-call) · **Sumber kode:** `src/routes/platform/OnCall*.tsx`, `server/routes/platform.ts`

Modul On-Call mengelola rotation schedule, override (swap/vacation), dan integrasi ke incident assignment.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/on-call` | `OnCall` | Overview (siapa on-call sekarang) |
| `/on-call/schedule` | `OnCallSchedule` | Schedule editor + 4-week calendar |
| `/on-call/overrides` | `OnCallOverrides` | Override request + approval |

`OnCallLayout` accent: red (active incidents), orange (pending overrides), blue (active overrides), green (default). Header metrics: schedules count, active overrides, active incidents, pending overrides.

---

## 2. Key Features

- **3 shift types**: primary, secondary, shadow.
- **Override status**: pending → approved/rejected/cancelled.
- **4-week forward calendar** dengan override applied.
- **Upcoming Handovers list** (next 7 days).
- **Active incident count** per schedule.
- **Quiet hours config** + notification preferences (in_app/email/sms/slack).

---

## 3. OnCall (Overview)

### OnCallHeroSection
Per schedule: avatar primary on-call, secondary on-call, time remaining shift, shift date range, active incident badge (red kalau &gt;0), "View incidents" link.

### UpcomingHandoversList
Next 7 days handover events:
- Shift transitions dari `upcomingShifts`
- Override start/end events
- Sorted chronologically dengan arrow icon

---

## 4. OnCallSchedule

### Schedule Selector Tabs
Pilih schedule aktif kalau ada multiple.

### Header
Schedule name + rotation interval display.

### ShiftCalendarGrid (4-week)
Weekly layout (MON-SUN). Per day: primary shift person:
- Today: blue border
- Current shift: green background
- Override applied: marked
- Person + shift order

### Rotation Members card
List members in shift order (idx+1):
- Avatar dengan initials
- Name
- "On call now" badge untuk current primary

---

## 5. OnCallOverrides

### Request Override Modal (gated `platform.manage`)
Form fields:
1. Schedule selector
2. Original Person dropdown
3. Covered By dropdown (filter exclude original)
4. Date range (datetime-local From/To)
5. Reason textarea (optional)

### OverrideCard
Per override:
- Status badge: PENDING APPROVAL (orange), APPROVED (green), REJECTED/CANCELLED (red), PAST (gray)
- Original → Replacement flow
- Date range UTC
- Optional reason
- Requested by + when
- Approved by + when (kalau approved)
- **Approve / Reject** buttons untuk pending

Sort: pending first.

---

## 6. User / UX Flow

### Vacation request
1. SRE buka /on-call/overrides → "+ Request Override".
2. Pilih schedule, original=self, covered_by=teammate, dates next week, reason="vacation".
3. Submit → status pending.
4. Manager approve → status approved.
5. Calendar di /on-call/schedule otomatis update.

### Live shift
1. Engineer buka /on-call → lihat dia primary 24h.
2. Active incident count = 2 (red badge).
3. Klik "View incidents" → /incidents filtered.

---

## 7. State Model

Override: pending → approved → (active period) → past
                ↓ rejected / cancelled

---

## 8. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `oncall.read` / `platform.read` | All authenticated | Lihat schedule/overrides |
| `platform.manage` | IFM Dept Head+ | Manage schedule, request override, approve |

---

## 9. Upstream Dependencies

Users (members, requester) · Schedules (rotation definition).

---

## 10. Downstream Effects

- **Incidents**: current primary auto-suggest sebagai assignee (via routing).
- **Alert Routing**: escalation step recipients merefer ke on-call current.
- **Notifications**: shift_start + escalation topic, channels per preference.

---

## 11. Data Model

`OnCallSchedule`:
- id, publicId, name, description
- rotationIntervalDays, rotationStartDayOfWeek, rotationTime
- members[] (userId, userName, shiftOrder)
- upcomingShifts[] (OnCallShift: userId/Name, shiftType, startAt, endAt, isCurrentShift, isOverridden)
- currentPrimaryId/Name, currentSecondaryId/Name
- activeIncidentCount

`OnCallOverride`:
- id, publicId, scheduleId/Name
- originalUserId/Name (covered)
- overrideUserId/Name (replacement)
- startAt, endAt
- reason
- requestedById/Name
- approvedById/Name/At
- status, createdAt

`NotificationPreference` & `QuietHoursConfig`: per user.

---

## 12. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/on-call/schedules` | `oncall.read` |
| GET | `/on-call/overrides` | `oncall.read` |

> Mutation (request/approve override, edit schedule) saat ini optimistic client-side; endpoint akan diformalkan di M7.

Document storage: kind `on-call-schedule` & `on-call-override`, tenant-scoped.

---

## 13. Realtime / Jobs

- **Shift handover scheduler**: emit notification topic `on_call_shift_start`.
- **Escalation timer**: trigger alert escalation step kalau acknowledge tidak terjadi.

---

## 14. Open Gaps / TODO

- Schedule editor (drag-drop swap, edit rotation) belum ada.
- Override approval mutation endpoint belum diformalkan.
- Auto-detect schedule overlap conflict belum.
- Multi-schedule per user (e.g., week-day vs weekend) belum support natif.

---

**Lihat juga:** [Incidents](./incidents.md) · [Monitoring](./monitoring.md) · [Notifications](./notifications.md)
