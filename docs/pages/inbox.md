# Inbox

> **Route utama:** `/inbox` · **ITIL 4 Practice:** Workforce notification & action queue · **Sumber kode:** `src/routes/platform/Inbox.tsx`, `src/components/layout/InboxDrawer.tsx`

Inbox adalah **personal action queue** user: agregator mention, approval request, SLA warning, system alert, dst. Tujuan: satu tempat untuk semua hal yang butuh perhatian.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/inbox` | `Inbox` | Full-page 2-panel (list + detail) |
| (drawer) | `InboxDrawer` | Right-side modal dari TopBar |

Drawer muncul di semua page (right side, max 400px), full page di `/inbox`.

---

## 2. Key Features

- **9 item types**: approval_request, mention, incident_update, assignment, sla_warning, system_alert, report_ready, kb_review, dr_test_reminder.
- **4 priorities**: urgent · high · normal · low.
- **Pin** / **Archive** / **Mark Read/Unread** per item.
- **Filter tabs**: All / Unread / Requires action / Archived.
- **Search** (title/summary/sender/sourcePublicId).
- **Smart sort**: pinned → unread → priority → newest.
- **Auto-read on click**.
- **Batch actions**: Mark all as read, Archive read.
- **Expiry countdown** kalau item punya `expiresAt`.
- **Deep link** ke source via `sourceUrl` atau `primaryAction.navigateTo`.

---

## 3. Inbox Page Anatomy

```
┌─────────────────────────────┬────────────────────────┐
│ Sidebar (320px)             │ Detail pane (flex)     │
│                             │                        │
│ Header: title + counts      │ Header: priority/type, │
│ (unread/action/urgent)      │ archive/pin/markUnread │
│                             │ title + sender + time  │
│ Tabs: All/Unread/Action/    │ expiry countdown       │
│       Archived              │                        │
│                             │ Body (markdown-lite)   │
│ Search input                │                        │
│                             │ Source reference link  │
│ Item list (sorted)          │                        │
│   InboxListItem             │ Action buttons         │
│   …                          │  (primary + secondary)│
└─────────────────────────────┴────────────────────────┘
```

### InboxListItem
- Left: unread dot (blue kalau !isRead)
- Center: Title (bold kalau unread), sender + relative time, 2-line summary clamp
- Right: priority/type badges + pin indicator
- Hover actions: Archive · Pin/Unpin · Mark Read/Unread
- Visual: blue left-border + light bg saat selected

### InboxItemDetail
- Header: priority badge + type chip + actions
- Title, sender, received time
- Expiry countdown (clock icon kalau &lt;24h sampai expiresAt)
- Body markdown-lite (**bold**, line breaks); fallback ke summary
- Source reference: clickable publicId + source title
- `InboxActionButtons` component (primary action + secondary action)

---

## 4. InboxDrawer (TopBar modal)

Right-side overlay (max 400px, z-101).

### Filter
- All · Urgent (priority=urgent) · Approvals (type=approval_request).

### Item rendering
- Red left border untuk urgent
- Priority badge, type label, sourcePublicId, title, summary 2-line
- Relative timestamp
- Primary action button atau "View"

---

## 5. User / UX Flow

### Triage flow
1. User klik bell di TopBar → InboxDrawer slide.
2. Filter Urgent → 3 item.
3. Klik approval request → navigate ke change/request detail.
4. Approve di sana, item otomatis dismiss.

### Full inbox cleanup
1. User buka `/inbox`.
2. Tab Unread → 12 items.
3. Click each → auto mark-read.
4. Klik "Archive read" untuk bersihkan.
5. Tab Action → fokus ke yang butuh approval/comment.

---

## 6. State Model

Per item: `isRead`, `isArchived`, `isPinned`, `requiresAction`, `readAt`, `archivedAt`, `expiresAt`.

Lifecycle: created → received → (read) → (archived).

---

## 7. Roles & Permissions

Tidak ada RBAC eksplisit di UI; server-side filter per session user (item user dapat lihat saja yang ditujukan ke dia atau channel-nya).

---

## 8. Upstream Dependencies

Semua modul yang generate notification:
- Incidents (assignment, SLA warning, mention)
- Changes (approval request, mention)
- Requests (approval, pending_user)
- Problems, KB (review reminder), DR Tests (reminder)
- System (system_alert, report_ready)

---

## 9. Downstream Effects

- **Sidebar badge**: urgent inbox count tampil di sidebar.
- **TopBar bell**: count + pulse indicator.
- **Dashboard preview**: top 3 di "Action Required" panel.

---

## 10. Data Model

`InboxItem` (`src/types/platform.ts`):
- id, type (9 enum), priority (4 enum)
- title, summary, body
- sourceType, sourcePublicId, sourceTitle, sourceUrl
- senderId, senderName, senderAvatarUrl
- isRead, isArchived, isPinned, requiresAction
- primaryAction, secondaryAction (label + navigateTo / actionId)
- receivedAt, expiresAt, readAt, archivedAt

---

## 11. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/inbox/items` | session-scoped |
| GET | `/inbox` | session-scoped (legacy) |

> Mutation (mark read, archive, pin) saat ini optimistic client-side; akan diformalkan ke endpoint write di M7.

---

## 12. Realtime / Jobs

- **Notification dispatcher**: setiap event (mention/approval/SLA breach) → push InboxItem ke target user.
- **Expiry cleanup**: scheduled job archive item lewat `expiresAt`.

---

## 13. Open Gaps / TODO

- Mutation endpoint (markRead, archive, pin) belum diformalkan.
- Drawer dan full page belum sync state real-time.
- Quiet hours filter (jangan tampilkan non-urgent saat quiet hours) belum.
- Snooze action belum ada.

---

**Lihat juga:** [Notifications](./notifications.md) · [Overview](./overview.md) · semua modul source
