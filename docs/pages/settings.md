# Settings

> **Route utama:** `/settings` · **ITIL 4 Practice:** General — User Configuration · **Sumber kode:** `src/routes/platform/Settings.tsx`

Settings adalah hub konfigurasi personal: profile, notification, API tokens, appearance, integrations.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/settings` | `Settings` | 5-panel hub dengan left sidebar nav |

Tidak ada sub-route — single-page dengan internal panel switching.

---

## 2. Panels

### 1. Profile
- Avatar (change photo disabled saat ini)
- Identity card: name, title, team
- Profile form (alias dengan `/profile`)

### 2. Notifications
- **Quiet hours** config (timezone, fromHour/toHour, daysOfWeek)
- **Topic preferences** per notification topic + channels
- **Connected channels**: email, SMS, Slack (read-only display dengan "Change" stub)

### 3. API Tokens
- Generate new token dengan name + scopes
- Revoke token
- List tokens dengan created date + last used

### 4. Appearance
- Theme/color customization (`AppearanceSettings` component)

### 5. Integrations
- Webhook & API integrations
- Stats per integration (calls, errors)
- Enable / Disable / Delete
- Rotate secret

---

## 3. User / UX Flow

### Setup notif
1. User buka /settings → tab Notifications.
2. Enable quiet hours: 22:00–07:00 UTC, weekdays.
3. Toggle topic on_call_escalation: in_app + sms.
4. Save.

### Generate API token
1. Tab API Tokens → "+ Generate".
2. Name "ci-deploy", scope "deployments:write".
3. Token muncul sekali — copy ke clipboard.
4. List tampil dengan created + last used kemudian.

---

## 4. Roles & Permissions

Tidak ada RBAC khusus — semua authenticated user dapat manage settings sendiri.

API token scope tetap dibatasi oleh permission user yang bersangkutan.

---

## 5. Upstream Dependencies

Users service (current user) · Notification service · API tokens service · Integrations service.

---

## 6. Downstream Effects

- **Notification delivery** ikut quiet hours preference.
- **API token** dipakai untuk programmatic access (lihat `Authorization: Bearer ...`).
- **Integration webhooks** trigger external systems pada event.

---

## 7. Data Model

`UserProfile`: id, name, email, title, bio, timezone, language, managerId.

`ApiToken`: id, name, scopes[], createdAt, lastUsedAt, revokedAt.

`Integration`: id, name, type (webhook/api), enabled, secret, calls, errors, createdAt.

`NotificationPreference` & `QuietHoursConfig`: lihat [Notifications](./notifications.md).

---

## 8. API Endpoints

Service layer:
- `usersService.current()` / `update()`
- `apiTokensService.list()` / `create()` / `revoke()`
- `notificationsService.preferences()` / `quietHours()` / update
- `integrationsService.list()` / `enable()` / `disable()` / `rotate()` / `delete()`

---

## 9. Realtime / Jobs

- **Token last-used update** background.
- **Integration health check** scheduled.

---

## 10. Open Gaps / TODO

- "Change photo" disabled (avatar upload pending).
- Connected channel "Change" buttons masih stub.
- 2FA / MFA settings belum.
- Session management (active sessions, revoke device) belum.

---

**Lihat juga:** [Profile](./profile.md) · [Notifications](./notifications.md) · [Admin](./admin.md)
