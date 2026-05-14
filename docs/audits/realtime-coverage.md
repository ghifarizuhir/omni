# Realtime Coverage Audit — OIS Frontend

**Audit Date:** 2026-05-14  
**Scope:** Pages that display data that could change while the user is viewing it.

## Executive Summary

The frontend has a **complete realtime infrastructure** (Socket.IO service + hook) but it is **currently unused**. All 100+ pages that display mutable data rely on a **single initial fetch** and do not subscribe to push updates. This creates silent drift where users see stale data after a reconnect.

**Critical finding:** The `realtime` service and `useRealtime` hook are defined but never imported or used anywhere in the codebase.

---

## Coverage Summary Table

| Status | Count | Pages |
|--------|-------|-------|
| ✅ Correctly subscribed + reconciles | 0 | — |
| 🟡 Subscribed but doesn't reconcile | 0 | — |
| 🟠 Should subscribe but uses polling | 0 | — |
| 🔴 Should subscribe but doesn't (snapshot at mount) | 45+ | See below |
| ⚪ N/A (static/reference data) | 55+ | Admin, KB, Portal, Settings, Improvements, etc. |

---

## Pages with Silent Drift Risk (Status 🔴)

### **Incidents Module**
Critical — directly impacts on-call response.

- **`src/routes/incidents/IncidentQueue.tsx`**
  - Displays: Open incidents list with priority, status, assignee, SLA
  - Should react to: `event:created`, `incident:updated` (from backend emit for status/assignee changes)
  - Uses realtime: **NO** — fetches once on mount via `useResource(() => incidentsService.list(), [])`
  - Reconcile on reconnect: **NO** — local state only via `setAllIncidents`
  - **Risk:** Users miss new P1 incidents, don't see status transitions, SLA timers drift

- **`src/routes/incidents/IncidentDetail.tsx`**
  - Displays: Single incident detail (status, comments, timeline, linked items)
  - Should react to: `incident:timeline` (for new timeline events), `event:updated` (status/priority changes)
  - Uses realtime: **NO** — fetches incident + timeline + comments once
  - Reconcile on reconnect: **NO** — only `refreshIncident()` in specific handlers, not on socket reconnect
  - **Risk:** Multiple users viewing same incident see different timelines; miss comments/status changes

- **`src/routes/incidents/MajorIncidentWarRoom.tsx`**
  - Displays: Real-time activity stream, communication log, incident status, roles
  - Should react to: `incident:timeline` (critical for war room coordination), comms events
  - Uses realtime: **NO** — fetches incident + timeline once, manages local state for comms
  - Reconcile on reconnect: **NO**
  - **Risk:** War room becomes desynchronized; incident commanders miss timeline updates

### **Monitoring Module**
Critical — operators must see alerts in real-time.

- **`src/routes/monitoring/EventStream.tsx`**
  - Displays: Real-time event feed, grouped by timestamp, with pause/filter
  - Should react to: `event:created`, `event:updated` (live alert stream)
  - Uses realtime: **NO** — fetches `eventsService.list()` once, freezes on pause button
  - Reconcile on reconnect: **NO** — frozen list doesn't auto-refresh
  - **Risk:** Critical P1 alerts won't appear; operator misses service degradation

- **`src/routes/monitoring/EventDetail.tsx`**
  - Displays: Event details, status, timeline, related events, comments
  - Should react to: `event:updated` (status changes, ACKs)
  - Uses realtime: **NO** — finds event in `mockEvents` from single fetch
  - Reconcile on reconnect: **NO**
  - **Risk:** User sees stale "open" event after it's been resolved elsewhere

- **`src/routes/monitoring/MonitoringOverview.tsx`**
  - Displays: KPI strip (active events, P1/P2 open, unacknowledged), active alerts feed
  - Should react to: `event:created`, `event:updated` (KPI changes)
  - Uses realtime: **NO** — fetches `eventsService.listActive()` and stats once
  - Reconcile on reconnect: **NO**
  - **Risk:** Dashboard shows "0 active" when P1 is firing; user misses escalation trigger

- **`src/routes/monitoring/MonitoringRules.tsx`**
  - Displays: Rules list with enabled/disabled status, sparklines of recent fires
  - Should react to: Rule enable/disable from other users, recent fire updates
  - Uses realtime: **NO** — fetches rules once
  - Reconcile on reconnect: **NO** — only updates via edit modal, not incoming events
  - **Risk:** Stale rule status if changed by another operator

- **`src/routes/monitoring/AlertRouting.tsx`**
  - Displays: Alert routing configuration, routes, rules
  - Should react to: Routing changes from other users
  - Uses realtime: **NO**
  - Reconcile on reconnect: **NO**
  - **Risk:** User makes routing change, another user doesn't see it

- **`src/routes/monitoring/CoverageReport.tsx`**
  - Displays: Coverage statistics, gaps, trend
  - Should react to: Coverage changes as rules/CIs change
  - Uses realtime: **NO**
  - Reconcile on reconnect: **NO**
  - **Risk:** Stale coverage metrics

### **Inbox / Notifications**
High — users need push notification of actionable items.

- **`src/routes/platform/Inbox.tsx`**
  - Displays: Inbox items (unread, requires_action, archived) with badges, search, tabs
  - Should react to: `inbox:item` (new items arriving)
  - Uses realtime: **NO** — fetches `inboxService.items()` once, updates only via local actions (archive, mark read)
  - Reconcile on reconnect: **NO** — local mutations aren't persisted; no refetch on reconnect
  - **Risk:** User misses urgent inbox items; count badges become wrong after reconnect

- **`src/routes/platform/Notifications.tsx`**
  - Displays: Notification list (all, unread, mentions)
  - Should react to: New notifications arriving
  - Uses realtime: **NO** — fetches `notificationsService.list()` once
  - Reconcile on reconnect: **NO**
  - **Risk:** New notifications don't arrive until page refresh

### **Dashboard**
Medium — KPI visibility is important but not mission-critical.

- **`src/routes/Dashboard.tsx`**
  - Displays: KPI cards (services, active/major incidents, inbox items, changes, improvements), top incidents/inbox/changes
  - Should react to: `event:created` (incident creation), `inbox:item` (new inbox)
  - Uses realtime: **NO** — fetches all data once
  - Reconcile on reconnect: **NO**
  - **Risk:** Dashboard goes stale quickly; KPI counts don't update

### **Status Page**
Medium — operator-facing dashboard.

- **`src/routes/platform/StatusPage.tsx`**
  - Displays: Service health status entries, active incidents
  - Should react to: Service status updates, incident status changes
  - Uses realtime: **NO** — fetches entries + incidents once
  - Reconcile on reconnect: **NO**
  - **Risk:** Displayed status drifts from reality

### **Other Mutable Pages**
- **Changes module** (`ChangeDetail`, `ChangeCalendar`) — status, CAB decisions change in real-time
- **Problems module** (`ProblemList`, `ProblemDetail`) — status and related incident count should update
- **Requests module** (`RequestQueue`, `RequestDetail`) — status updates
- **Deployment module** (`DeploymentsQueue`, `DeploymentDetail`) — deployment status
- **Availability module** (`Outages`) — outage status, incident linking
- **Improvement module** (`ImprovementKanban`, `ImprovementRegister`) — board state, status transitions
- **OnCall module** (`OnCall`, `OnCallSchedule`) — live on-call roster, overrides

---

## Top 3 Silent-Drift Pages by User Impact

1. **IncidentQueue** (🔴 Status 🔴)
   - Impact: New P1 incidents won't appear until manual refresh
   - Scope: Every on-call engineer relying on this queue
   - Solution: Subscribe to `event:created`; refetch list on reconnect

2. **EventStream** (🔴)
   - Impact: Critical P1/P2 alerts vanish from view after network reconnect
   - Scope: SOC operators, platform team
   - Solution: Subscribe to `event:created` / `event:updated`; refetch on reconnect

3. **Inbox** (🔴)
   - Impact: Urgent action items (escalations, approvals) don't notify
   - Scope: All users relying on inbox for alerts
   - Solution: Subscribe to `inbox:item`; refetch on reconnect; persist archive/read to backend

---

## Example of Correct Usage (If Any)

**None found.** The `useRealtime` hook is defined but never imported or called in any component.

---

## Implementation Recommendations (Priority Tier)

### Tier 1: Critical (Mission-Critical Paths)
1. **IncidentQueue** + **IncidentDetail**
   - Subscribe to `event:created` (new incidents)
   - Subscribe to incident timeline updates via `subscribeIncident(id)` when detail page loads
   - Refetch incident list / detail on socket reconnect

2. **EventStream** + **MonitoringOverview**
   - Subscribe to `event:created` + `event:updated`
   - Auto-add new events to feed; update status in-place
   - Pause button behavior: freeze remote updates, show "X new events" hint

3. **Inbox**
   - Subscribe to `inbox:item`
   - Append new items to top, update unread/action counts
   - On reconnect, refetch full list to catch items created while offline
   - Persist archive/mark-read to backend before toggling local state

### Tier 2: High (Operational Visibility)
4. **IncidentDetail** (timeline)
5. **EventDetail** (status updates)
6. **Dashboard** (KPI updates, incident count)
7. **StatusPage** (service status, incident count)

### Tier 3: Medium (Collaboration)
8. **Changes**, **Problems**, **Requests**

---

## Architecture Notes

- **Socket.IO Server** (`server/realtime.ts`) already emits to tenant rooms (`tenant:${tenantId}:events`, `tenant:${tenantId}:inbox`, `tenant:${tenantId}:incident:${id}`)
- **Frontend Service** (`src/services/realtime.ts`) is ready to use; has helper for subscribing to incident timelines
- **Reconnect contract is explicit:** Streams are not replayed on reconnect — pages MUST refetch the authoritative REST list
- **Recommendation:** Create a custom hook `useRealtimeWithRefetch` that combines the realtime subscription with a `useResource` refetch trigger on socket reconnect

---

## Audit Methodology

- Searched all 100+ route pages for imports of `realtime`, `useRealtime`, `socket.on`
- Examined server-side emit points and room structure
- Checked each page's data fetching pattern (via `useResource`) and state mutation model
- Assessed whether each page should react to any of: `event:created`, `event:updated`, `inbox:item`, `incident:timeline`

---

## Glossary

- **Should react to push?** — Whether the data displayed on this page could change while the user is viewing it (based on server emit topics)
- **Subscribed?** — Does the page call `realtime.on()` or `useRealtime()` to listen to server events?
- **Reconcile on reconnect?** — Does the page refetch authoritative data from the REST API when the socket reconnects?
- **Status codes:**
  - ✅ Correctly subscribed + reconciles
  - 🟡 Subscribed but doesn't reconcile (will silently drift)
  - 🟠 Should subscribe but uses interval polling instead
  - 🔴 Should subscribe but doesn't (snapshot at mount; major drift risk)
  - ⚪ N/A (static or reference data)

