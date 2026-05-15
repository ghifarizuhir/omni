# Profile

> **Route utama:** `/profile` · **ITIL 4 Practice:** General — User Profile · **Sumber kode:** `src/routes/platform/Profile.tsx`

Halaman Profile adalah versi simplified dari Settings → Profile. Fokus ke identity, profile form, API tokens, dan danger zone.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/profile` | `Profile` | Profile detail user |

---

## 2. Sections

### Avatar & Identity card
Foto + name, email, title, team.

### Profile form
- Title (job title)
- Bio (textarea)
- Timezone (dropdown, IANA name)
- Language preference
- Manager (user picker)

### API Tokens
List + Create + Revoke (sama dengan Settings → API Tokens panel).

### Danger Zone
- Account deletion request (dengan confirmation flow)

---

## 3. User / UX Flow

1. User buka `/profile`.
2. Update title "Senior SRE", bio, timezone Asia/Jakarta.
3. Save → confirmation toast.
4. Generate API token untuk integration script.

---

## 4. Roles & Permissions

Setiap authenticated user dapat manage profile sendiri.

Account deletion request mungkin perlu admin approval (tergantung tenant policy).

---

## 5. Upstream Dependencies

Users service · API tokens service.

---

## 6. Downstream Effects

- **Display name & avatar** dipakai semua modul (assignee, watcher, comment author).
- **Timezone** preference dipakai untuk format tanggal di UI (planned).
- **Manager** dipakai untuk approval workflow (manager_of_requester di catalog).

---

## 7. Data Model

`UserProfile` (lihat [Settings](./settings.md)).

`ApiToken`: id, name, scopes[], createdAt, lastUsedAt, revokedAt.

---

## 8. API Endpoints

- `GET /users/current` → User
- `PATCH /users/current` → update
- `apiTokensService.list/create/revoke`
- `DELETE /users/current` (account deletion request, planned)

---

## 9. Realtime / Jobs

Tidak ada job khusus. Profile update propagate via cache invalidation.

---

## 10. Open Gaps / TODO

- Avatar upload belum implemented (saat ini auto-initials).
- Account deletion flow belum end-to-end.
- Timezone preference belum dipakai semua modul (sebagian masih UTC hardcoded).
- 2FA enrollment belum.

---

**Lihat juga:** [Settings](./settings.md) · [Notifications](./notifications.md)
