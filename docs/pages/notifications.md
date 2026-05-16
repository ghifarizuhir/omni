# Notifications

> **Routes:** `/notifications`, `/notifications/preferences` · **ITIL 4 Practice:** Workforce Notification Management · **Sumber kode:** `src/routes/platform/Notifications.tsx`, `NotificationPreferences.tsx`

Modul Notifications memanage 2 hal berbeda: **feed** notifikasi historis dan **preferences** delivery.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/notifications` | `Notifications` | Feed inbox notifikasi dengan filter |
| `/notifications/preferences` | `NotificationPreferences` | Konfigurasi quiet hours + topic + channel |

---

## 2. Notifications Feed (`/notifications`)

### Filter tabs
- **All** — semua notifikasi
- **Unread** — `readAt == null`
- **Mentions** — `type=mention`

Unread badge di tab header.

### Actions
- "Mark all as read" button
- Per-item: click → mark read + navigate ke `url` (kalau ada)

### NotificationItem types (4)
- **mention** — di comment / RCA / dst.
- **update** — perubahan status entity yang user watch
- **system** — system_alert
- **info** — informational broadcast

### Display
Per item: type icon, title, body (markdown-lite), createdAt relative, sourceRef link, unread dot.

---

## 3. NotificationPreferences (`/notifications/preferences`)

### Quiet Hours
- Enable checkbox
- Timezone dropdown (UTC, America/New_York, Asia/Jakarta, dst.)
- Window: fromHour / toHour (24h)
- Active days toggle (S M T W T F S)

### Topic Notifications
Per topic (e.g., `incident.assigned`, `change.approval_required`, `on_call_shift_start`, `on_call_escalation`, `kb.review_due`, `mention`):
- Channels: in_app · email · sms · slack (multi-select)
- Respect quiet hours flag
- Override for urgent flag

### Connected Channels (read-only display saat ini)
- Email address
- SMS number
- Slack workspace + user
- Teams (kalau enabled)
- "Change" button stub (belum functional)

---

## 4. User / UX Flow

### Notification feed
1. User buka `/notifications`, tab Mentions.
2. 3 mentions di RCA workspace — click pertama → navigate ke `/problems/PRB-XXX/rca`.
3. Auto mark-read.

### Setup preference
1. Buka `/notifications/preferences`.
2. Enable quiet hours: Asia/Jakarta, 22:00–07:00, weekdays.
3. Topic on_call_escalation: in_app + sms, override for urgent.
4. Topic mention: in_app + email, respect quiet hours.
5. Save.

---

## 5. State Model

NotificationItem: created → (read / clicked) → archived (auto setelah TTL).

Preference: enabled / disabled per topic.
Quiet hours: enabled / disabled.

---

## 6. Roles & Permissions

Tidak ada RBAC khusus — setiap authenticated user manage preference & feed sendiri.

---

## 7. Upstream Dependencies

Semua modul yang generate notification:
- Incidents, Changes, Requests, Problems
- Mentions di comment thread
- KB review reminder, DR test reminder
- On-call shift handover & escalation
- System alerts

---

## 8. Downstream Effects

- **Inbox** items derived dari notification stream.
- **Email/SMS/Slack delivery** sesuai preference + quiet hours.
- **TopBar bell** & sidebar badge update.

---

## 9. Data Model

`NotificationItem`:
- id, type (mention / update / system / info), title, body, createdAt, readAt, url, sourceRef

`NotificationPreference`:
- userId, topic, channels[] (in_app / email / sms / slack), respectQuietHours, overrideForUrgent

`QuietHoursConfig`:
- userId, enabled, timezone, fromHour, toHour, daysOfWeek[]

---

## 10. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/notifications` | session-scoped |
| PATCH | `/notifications/:id/read` | session-scoped |
| GET | `/notifications/preferences` | session-scoped |
| PATCH | `/notifications/preferences` | session-scoped |
| GET | `/notifications/quiet-hours` | session-scoped |
| PATCH | `/notifications/quiet-hours` | session-scoped |

> Mutation endpoints saat ini partial; "Change" button untuk channel address belum functional.

---

## 11. Realtime / Jobs

- **Notification dispatcher**: setiap event → push ke target user → respect preference + quiet hours.
- **Channel delivery worker**: format ke email/SMS/Slack template, send via provider.
- **TTL cleanup**: archive notification lewat retention period.

---

## 12. Open Gaps / TODO

- "Change" channel address button belum functional.
- Slack workspace OAuth flow belum end-to-end.
- SMS provider configurable per tenant belum.
- Notification grouping/digest (daily summary) belum.
- "Snooze" notification belum.
- Per-resource subscribe (mis. follow specific incident) belum.

---

**Lihat juga:** [Inbox](./inbox.md) · [Settings](./settings.md) · [On-Call](./on-call.md)
