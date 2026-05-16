# Overview / Operational Pulse

> **Route utama:** `/` · **ITIL 4 Practice:** General Management — Operational Awareness · **Sumber kode:** `src/routes/Dashboard.tsx`

Halaman Overview adalah **landing page** OIS Management mode: ringkasan operasional real-time untuk pertama kali user buka aplikasi. Tujuannya: dalam 5 detik user tahu apakah ada hal urgent.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/` | `Dashboard` | Operational Pulse landing |

Tidak ada sub-route — single-page snapshot.

---

## 2. Key Features

- **KPI strip** angka kunci real-time (insiden aktif, change pending, SLA breach, dll.).
- **Active Incidents** list (urutkan by severity + recency).
- **Inbox preview** (item urgent personal).
- **Upcoming Changes** dalam minggu ini.
- **Service Health** snapshot (uptime + degraded services).
- **Real-time refresh** lewat `useResource` hook + Socket.io.

---

## 3. Page Anatomy

```
┌──────────────────────────────────────────┐
│ Greeting + current shift indicator       │
├──────────────────────────────────────────┤
│ KPI Strip:                               │
│ [Active Incidents] [Open Problems]       │
│ [Pending Changes]  [SLA Breaches]        │
│ [Capacity Alerts]  [Open Reqs]           │
├─────────────────────┬────────────────────┤
│ Active Incidents    │ Inbox Preview      │
│ (sorted P1→P4)      │ (urgent first)     │
├─────────────────────┼────────────────────┤
│ Upcoming Changes    │ Service Health     │
│ (this week)         │ (uptime grid)      │
└─────────────────────┴────────────────────┘
```

### KPI cards
Click-through ke modul masing-masing (incidents queue, problems list, changes calendar, availability dashboard).

### Active Incidents panel
Top N (typically 5) dengan priority strip + assignee + relative time → klik buka `/incidents/:id`.

### Inbox Preview
Top urgent items (max 5) → klik open `/inbox` untuk full view.

### Upcoming Changes
Window Today → +7 days, exclude closed/rejected/cancelled. Click → `/changes/:id`.

### Service Health
Quick grid status per critical service → klik `/availability`.

---

## 4. User / UX Flow

1. User login → landing di `/`.
2. Scan KPI strip dari kiri ke kanan.
3. Active incident P1 → langsung klik → `/incidents/INC-XXX`.
4. Inbox urgent badge → klik → `/inbox`.
5. Tidak urgent → drill ke modul via sidebar.

---

## 5. State Model

Read-only snapshot. Tidak ada state lokal selain refresh interval.

---

## 6. Roles & Permissions

Semua authenticated user dapat akses. KPI yang tidak readable (mis. user tidak punya `incident.read`) ditampilkan kosong / hidden gracefully.

---

## 7. Upstream Dependencies

Incidents (active count) · Problems (open) · Changes (upcoming) · Availability (SLA breach) · Capacity (alerts) · Requests · Inbox.

---

## 8. Downstream Effects

Tidak menulis data. Hanya konsumen.

---

## 9. Data Model

Tidak punya model sendiri — composes data dari modul lain.

---

## 10. API Endpoints

Composite dari:
- `GET /incidents?active=true`
- `GET /problems`
- `GET /changes`
- `GET /availability/sla-breaches?active=true`
- `GET /capacity/recommendations?open=true`
- `GET /inbox/items` (lihat [Inbox](./inbox.md))

---

## 11. Realtime / Jobs

Socket.io subscribe ke `incident:*` & `event:*` untuk auto-refresh KPI saat ada perubahan.

---

## 12. Open Gaps / TODO

- KPI strip belum customizable per role.
- Widget arrangement belum drag-drop.
- "Pinned views" untuk personal layout belum ada.
- AI summary ("Today's brief") belum diimplementasi (planned di AI Workspace).

---

**Lihat juga:** [Inbox](./inbox.md) · [Incidents](./incidents.md) · [Changes](./changes.md) · [Availability](./availability.md)
