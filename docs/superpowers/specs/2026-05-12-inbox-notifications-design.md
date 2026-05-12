# Inbox & Notifications — Design Spec
**Date:** 2026-05-12  
**Status:** Approved

---

## Problem

OIS has two surfaces — Inbox (drawer) and Notifications (bell dropdown) — but no clear contract between them. Both contain `mention` type items. The bell dropdown footer navigates to `/inbox` instead of a notifications page. `mockNotifications` contains items that belong in Inbox (assignments, actionable mentions). The result: users don't know which surface to check for what.

---

## Design

### Core Principle

| Surface | Question it answers | Persistence |
|---------|-------------------|-------------|
| **Inbox** | "What do I need to do?" | Persistent until acted on, archived, or expired |
| **Bell / Notifications** | "What happened?" | Ephemeral — read and move on |

---

### Section 1: Routing Rules

**Inbox** receives items where user action is required:

| Type | Examples |
|------|---------|
| `approval_request` | CAB votes, service request approvals, PIR sign-offs |
| `assignment` | Incidents, problems, or requests assigned to you |
| `sla_warning` | SLA at risk or breached — owner must respond |
| `kb_review` | KB article awaiting your sign-off |
| `dr_test_reminder` | DR test requires your involvement |
| `mention` (actionable) | @mention containing a direct question, task, or delegation |

**Bell / Notifications** receives informational items:

| Type | Examples |
|------|---------|
| `update` | Status changes on items you're watching |
| `system` | Digests, maintenance windows, deploy completions |
| `info` | Capacity alerts, status page events, on-call shift reminders |
| `mention` (informational) | @mention with no action implied ("FYI @sarah this is resolved") |

**Mention routing rule:** Determined at creation time via `requiresAction` on the source event. No duplication across surfaces.

---

### Section 2: UI Surfaces

**Topbar — Inbox icon**
- Opens `InboxDrawer` slide-out panel
- Badge: count of `urgent` + `high` priority unread items
- Filters: All / Urgent / Approvals (keep existing)
- Footer: "View all" → `/inbox`

**Topbar — Bell icon**
- Opens `NotificationDropdown`
- Badge: count of unread items
- Tabs: All / Unread / Mentions
- Footer: "View all" → `/notifications` *(fix: currently links to `/inbox`)*

**Full pages**
- `/inbox` — full Inbox management (mark read, archive, filter by type/priority)
- `/notifications` — full notification feed (new page, simple list of Bell feed items)
- `/notifications/preferences` — delivery settings (channels, quiet hours) — Settings only

**Sidebar**
- Inbox: stays in Operations section with urgent badge
- Notifications: removed (completed 2026-05-12)
- Notification preferences: Settings → Account → Notifications only

---

### Section 3: Data Model Changes

**`MockNotificationItem`** — add `url: string | null`
- Resolved navigation target should live on the item, not be computed at render time in `resolveNotificationUrl`

**Mock data corrections:**

| Item | Current location | Correct location | Reason |
|------|-----------------|-----------------|--------|
| `ntf-001` "Marcus mentioned you — @sarah can you check the runbook?" | Bell feed | Inbox | Actionable mention |
| `ntf-002` "Incident assigned to you" | Bell feed | Inbox | Assignment |
| `ibx-005` "Can you post external comms?" | Inbox | Inbox ✓ | Actionable mention — correct |

All `update`, `system`, `info` items in `mockNotifications` stay in the Bell feed — they are correctly placed.

**Route addition:**
- Add `/notifications` route → new `Notifications` page component (feed view of non-actionable notification items)

---

## Out of Scope

- Real-time push (WebSocket/SSE) — mock data only for now
- Email/SMS/Slack delivery — handled by `/notifications/preferences` (already exists)
- Notification grouping / threading — future iteration
