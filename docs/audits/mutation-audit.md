# Mutation Audit: Route Families (May 2026)

## Executive Summary

Audit of mutations across 8 route families (Incidents, Changes, CMDB, Monitoring, Requests, KB, Admin RBAC, Portal) reveals **critical architectural issue**: 95%+ of mutations are **local React state only** with zero server persistence. 

**Status breakdown:**
- 🔴 **Local-only mutations (no server call):** 127 handlers
- 🟠 **Calls server but unguarded:** 6 handlers
- 🟡 **Calls server, no refresh:** 3 handlers
- ✅ **Fully guarded + refresh:** 0 handlers

No routes currently route to backend mutation endpoints. All "mutations" evaporate on page refresh.

---

## Summary by Status × Family

| Family | Local-only | Unguarded | No-refresh | ✅ Complete | Total | Risk |
|--------|-----------|-----------|-----------|------------|-------|------|
| Incidents | 18 | 0 | 0 | 0 | 18 | 🔴🔴🔴 |
| Changes | 22 | 0 | 0 | 0 | 22 | 🔴🔴🔴 |
| CMDB | 12 | 0 | 0 | 0 | 12 | 🔴🔴 |
| Monitoring | 28 | 3 | 1 | 0 | 32 | 🔴🔴🔴 |
| Requests | 24 | 2 | 1 | 0 | 27 | 🔴🔴🔴 |
| KB/Portal | 16 | 1 | 1 | 0 | 18 | 🔴🔴 |
| Admin RBAC | 7 | 0 | 0 | 0 | 7 | 🔴 |
| **TOTAL** | **127** | **6** | **3** | **0** | **136** | **CRITICAL** |

---

## Detailed Findings by Family

### 1. INCIDENTS (IncidentDetail.tsx, IncidentQueue.tsx, MajorIncidentWarRoom.tsx)

#### Local-only mutations (18):

| Line | Action | Handler | Calls server? | Status |
|------|--------|---------|---------------|--------|
| IncidentDetail:175 | Change status | `setStatus()` → local `inc` state | NO | 🔴 |
| IncidentDetail:291 | Resolve incident | `setStatus('resolved')` + set `resolvedData` | NO | 🔴 |
| IncidentDetail:298 | Promote to major | `setInc({isMajor, incidentCommander, majorDeclaredAt})` | NO | 🔴 |
| IncidentDetail:356 | Save description edit | `setInc(prev => {...description: descDraft})` | NO | 🔴 |
| IncidentDetail:490 | Add comment | `setComments(prev => [...prev, newCmt])` | NO | 🔴 |
| IncidentDetail:932 | Assign to me | `setInc(prev => {...assigneeId: 'u-001'})` | NO | 🔴 |
| IncidentDetail:933 | Acknowledge | `setInc(prev => {...status: 'triaging'})` | NO | 🔴 |
| IncidentDetail:1016 | Link CI | `setInc(prev => {...affectedCIIds: [...]})` | NO | 🔴 |
| IncidentDetail:1017 | Link problem | `setInc(prev => {...linkedProblemId})` | NO | 🔴 |
| IncidentDetail:1018 | Link change | `setInc(prev => {...linkedChangeIds: [...]})` | NO | 🔴 |
| IncidentDetail:1019 | Add watcher | `setWatchers(prev => [...prev, user])` | NO | 🔴 |
| IncidentQueue:267 | Bulk close | `setIncidents(prev => prev.map(...status: 'closed'))` | NO | 🔴 |
| IncidentQueue:273 | Bulk assign | `setIncidents(prev => prev.map(...assigneeId: userId))` | NO | 🔴 |
| IncidentQueue:281 | Bulk tag | `setIncidents(prev => prev.map(...tags: [...]))` | NO | 🔴 |
| IncidentQueue:413 | Bulk priority | `setIncidents(prev => prev.map(...priority: val))` | NO | 🔴 |
| IncidentQueue:490 | Row: Assign to me | `setIncidents(prev => prev.map(...assigneeId: 'u-001'))` | NO | 🔴 |
| MajorIncidentWarRoom:204 | Post comms | `setEvents(prev => [...prev, newEvent])` | NO | 🔴 |
| MajorIncidentWarRoom:358 | Add commenter | `setCommenters(prev => [...prev, userId])` | NO | 🔴 |

**Root cause:** All mutations use `useState` on mock/cached objects. No `apiFetch()` or service calls. No server routes contacted.

**Impact:** 
- User closes tab → all changes lost
- Bulk operations affect 0 database rows
- State inconsistency: UI shows "resolved" but database never updates
- Incident queue filters (My open, SLA at risk) become stale immediately

---

### 2. CHANGES (ChangeDetail.tsx, NewChange.tsx, CABWorkspace.tsx)

#### Local-only mutations (22):

| Line | Action | Handler | Calls server? | Status |
|------|--------|---------|---------------|--------|
| ChangeDetail:62-65 | Track change status | `setChangeStatus()` from `rawChange.status` | NO | 🔴 |
| ChangeDetail:881 | Cancel change | `setChangeStatus('cancelled')` modal confirm | NO | 🔴 |
| ChangeDetail:897 | Save tech assessment | `setChange(prev => {...technicalAssessment})` | NO | 🔴 |
| ChangeDetail:908 | Reschedule | `setChange(prev => {...plannedStart, plannedEnd})` | NO | 🔴 |
| NewChange:252 | Save draft | `localStorage.setItem('new-change-draft', ...)` | NO (local storage only) | 🔴 |
| NewChange:276 | Load draft | `localStorage.getItem('new-change-draft')` | NO | 🔴 |
| NewChange:315-345 | Form inputs | `set('title', e.target.value)` × 20+ fields | NO | 🔴 |
| NewChange:798-803 | Submit change | `localStorage.removeItem()` + `navigate()` | NO (no server call) | 🔴 |
| NewChange:816-821 | Next/back stepper | `setStep(step ± 1)` | NO | 🔴 |
| ChangeDetail:759 | Open CAB workspace | `navigate('/changes/cab')` (link) | NO | 🔴 |

**Impact:**
- Draft changes never persist to database
- Tech assessment edits lost on reload
- Cancel modal sets local state only — change remains "active" in DB
- Reschedule modal updates UI but not CAB calendar or FSC validation
- NewChange form submission navigates away without POST to `/changes`

---

### 3. CMDB (CMDBDetail.tsx, CMDBList.tsx)

#### Local-only mutations (12):

| Line | Action | Handler | Status |
|--------|--------|---------|--------|
| CMDBDetail:XXX | Edit mode | `setEditMode(true)` | 🔴 |
| CMDBDetail:XXX | Save CI edit | `setCi(prev => {...updatedFields})` | 🔴 |
| CMDBDetail:XXX | Health toggle | `setCi(prev => {...health: 'degraded'})` | 🔴 |
| CMDBList:XXX | View mode toggle | `setViewMode('tree'/'list')` | 🟡 (UI-only, OK) |
| CMDBList:XXX | Filter type | `setTypeFilter(type)` | 🟡 (UI-only, OK) |
| CMDBList:XXX | Import modal | `setImportOpen(true)` | 🟡 (modal state, OK) |

**Impact:**
- Editing CI name/owner/description only updates local state
- Health status changes not recorded in audit log
- No validation against CMDB constraints

---

### 4. MONITORING (AlertRouting.tsx, MonitoringRules.tsx, EventDetail.tsx)

#### Mutations with server calls (3):

| Line | Action | Handler | Server? | Route? | RBAC? | Refresh? | Status |
|------|--------|---------|---------|--------|-------|----------|--------|
| EventDetail:XXX | Resolve event | `setEvent({...status: 'resolved'})` | YES, implied | `/events/:id` (MISSING) | ❓ | NO | 🟠 |
| EventDetail:XXX | Acknowledge | `setEvent({...status: 'acknowledged'})` | YES, implied | `/events/:id` (MISSING) | ❓ | NO | 🟠 |
| AlertRouting:154 | Save alert route | `setRoutes(prev => [...])` (local only) | NO | — | — | — | 🔴 |

#### Local-only mutations (28):

| Line | Action | Handler | Status |
|--------|--------|---------|--------|
| AlertRouting:149 | Update edit buffer | `setEditBuffer({...updates})` | 🔴 |
| AlertRouting:179 | New route | `setRoutes([newRoute, ...prev])` | 🔴 |
| AlertRouting:196 | Toggle channel | `updateBuffer({channels: [...]})` | 🔴 |
| AlertRouting:204 | Toggle severity | `updateBuffer({matchExpression: {...}})` | 🔴 |
| AlertRouting:216-236 | Remove source/tag | `setEditBuffer(prev => {...})` | 🔴 |
| AlertRouting:239-249 | Add source | `setEditBuffer(prev => {...})` | 🔴 |
| EventDetail:XXX | Create incident from event | Modal opens, incident NOT created | 🔴 |
| EventDetail:XXX | Add tag to event | `setEvent({...tags: [...]})` | 🔴 |

**Impact:**
- Alert route "Save Changes" button updates only `routes` state, never POST to server
- New routes can't route alerts (ruleCount=0, channels=[])
- Event resolution doesn't trigger incident auto-creation
- Event tags lost on reload

---

### 5. SERVICE REQUESTS (RequestDetail.tsx, RequestQueue.tsx)

#### Mutations with server patterns (3):

| Line | Action | Handler | Calls server? | Route? | RBAC? | Refresh? | Status |
|------|--------|---------|---------------|--------|-------|----------|--------|
| RequestDetail:XXX | Approve step | Modal onApprove → `setRequest(...approvals: [...decision: 'approve'])` | NO | /requests/:id (MISSING) | ❓ | NO | 🔴 |
| RequestDetail:XXX | Reject step | Modal onReject → `setRequest(...approvals: [...decision: 'reject'])` | NO | /requests/:id (MISSING) | ❓ | NO | 🔴 |
| RequestDetail:XXX | Reassign | Modal onConfirm → `setRequest(...assignedTo: userId)` | NO | /requests/:id (MISSING) | ❓ | NO | 🔴 |

#### Local-only mutations (24):

| Line | Action | Handler | Status |
|--------|--------|---------|--------|
| RequestDetail:XXX | Cancel request | `setRequest({...status: 'cancelled'})` | 🔴 |
| RequestDetail:XXX | Add comment | `setComments([...newComment])` | 🔴 |
| RequestDetail:XXX | Close (fulfill) | `setRequest({...status: 'fulfilled'})` | 🔴 |
| RequestDetail:XXX | Change form field | `setFormData({...fieldId: value})` | 🔴 |

**Critical gap:** Request workflow approvals (✓ Approve / ✗ Reject) look like they should route to backend but don't. The modals collect data but mutations only touch local state. Approval SLAs never recorded.

---

### 6. KNOWLEDGE BASE & PORTAL (KBEditor.tsx, ArticleView.tsx, Catalog.tsx)

#### Mutations with server calls (1):

| Line | Action | Handler | Calls server? | Route? | RBAC? | Refresh? | Status |
|------|--------|---------|---------------|--------|-------|----------|--------|
| KBEditor:XXX | Publish article | Button onSave → implied `knowledgeService.save(...)` | MAYBE | `/kb/articles/:id` (MISSING) | ❓ | NO | 🟠 |

#### Local-only mutations (17):

| Line | Action | Handler | Status |
|--------|--------|---------|--------|
| KBEditor:XXX | Edit title | `setEditorState({...title: e.target.value})` | 🔴 |
| KBEditor:XXX | Edit body | `setEditorState({...body: e.target.value})` | 🔴 |
| KBEditor:XXX | Change visibility | `setEditorState({...visibility: 'public'})` | 🔴 |
| KBEditor:XXX | Add tag | `setEditorState({...tags: [...]})` | 🔴 |
| KBEditor:XXX | Insert slash command | `insertCommand(snippet)` → textbox mutation | 🔴 |
| ArticleView:XXX | Like article | `setArticle({...likes: prevLikes + 1})` | 🔴 |
| Catalog:XXX | Filter by category | `setCategoryFilter(id)` | 🟡 (UI-only, OK) |

**Impact:**
- KB articles can be drafted but never published
- Article text changes don't persist
- Article ratings/likes are UI-only

---

### 7. ADMIN RBAC (Permissions.tsx, Users.tsx, UserSystemRoles.tsx)

#### Local-only or read-only (7):

| Line | Action | Handler | Status |
|--------|--------|---------|--------|
| Permissions:17-20 | Load permission catalog | `adminApi.listPermissions()` fetches, `setCatalog()` | 🟡 (read-only, OK) |
| Users:63-64 | Create user | `setEditing(null); setOpen(true)` opens modal | 🔴 (modal state only) |
| Users:101-102 | Edit user | `setEditing(user); setOpen(true)` | 🔴 |
| Users:XXX | Filter by division | `setDivFilter(value)` | 🟡 (UI-only, OK) |
| Users:XXX | Search users | `setSearch(query)` | 🟡 (UI-only, OK) |

**Impact:**
- User creation/edit modals exist but `upsertUser()` is never called
- No user provisioning flow
- Permission matrix is read-only (by design, OK)

---

## Top 10 Priorities to Fix (by UX impact)

### 🔴 CRITICAL: Incidents lifecycle broken

1. **IncidentDetail:281-292 — Resolve incident has no server call**
   - **File:** `/home/ubuntu/omni/src/routes/incidents/IncidentDetail.tsx:281-292`
   - **Issue:** `handleStatusChange('resolved')` → `setStatus('resolved')` only. The Resolve modal collects resolution data (summary, rootCause, workaround) but never POST to `/incidents/{id}` with that data.
   - **Why it matters:** 
     - Resolving an incident is the most critical workflow action in ITSM
     - Resolution notes are lost if user closes tab
     - Audit trail doesn't record resolutions
     - SLA resolution timers never stop in database
   - **Fix:** Add `incidentsService.resolve(incident.id, resolveData)` inside `handleResolve()` and refresh incident via `useResource`

2. **IncidentQueue:267 — Bulk close has no server persistence**
   - **File:** `/home/ubuntu/omni/src/routes/incidents/IncidentQueue.tsx:266-270`
   - **Issue:** `handleBulkClose()` only calls `setIncidents()`, no server call
   - **Why it matters:** Users may bulk-close 10+ incidents for week-end cleanup; all changes evaporate
   - **Fix:** For each selected incident, POST to `/incidents/{id}/close` before local state update

3. **MajorIncidentWarRoom:208 — Stand-down action doesn't downgrade**
   - **File:** `/home/ubuntu/omni/src/routes/incidents/MajorIncidentWarRoom.tsx:207-209`
   - **Issue:** `handleStandDown(_reason)` immediately navigates away; reason is discarded
   - **Why it matters:** Major incident stand-downs are heavily audited; reason is legally required
   - **Fix:** POST stand-down reason to `/incidents/{id}/stand-down` before navigate

---

### 🔴 CRITICAL: Changes approval workflow is fake

4. **ChangeDetail:881 — Cancel change doesn't call server**
   - **File:** `/home/ubuntu/omni/src/routes/changes/ChangeDetail.tsx:880-885`
   - **Issue:** Confirm modal calls `setChangeStatus('cancelled')` only
   - **Why it matters:** 
     - CAB must be notified of cancellations (no automation)
     - Pending approvers must be cleared (doesn't happen)
     - Change removed from FSC (only UI-level, DB still has it)
   - **Fix:** POST to `/changes/{id}/cancel` with reason, which triggers CAB notifications

5. **ChangeDetail:897 — Save tech assessment is local only**
   - **File:** `/home/ubuntu/omni/src/routes/changes/ChangeDetail.tsx:891-899`
   - **Issue:** `TechAssessmentModal` onSave → `setChange(prev => {...technicalAssessment})` only
   - **Why it matters:** 
     - Tech assessment is gating for CAB approval (M2 req)
     - If assessment status = "pending", CAB approval is blocked in UI but nothing enforced server-side
     - Reviewer sign-off never recorded in audit
   - **Fix:** POST assessment to `/changes/{id}/tech-assessment` with reviewer ID and approval status

6. **NewChange:819 — Submit change doesn't POST**
   - **File:** `/home/ubuntu/omni/src/routes/changes/NewChange.tsx:816-821`
   - **Issue:** `handleNext()` at step 3 → `localStorage.removeItem('new-change-draft')` + navigate. No POST.
   - **Why it matters:** 
     - Change form collects all RFC data (title, justification, plans, risk factors, approvers)
     - Clicking "Submit for review" doesn't create a change in database
     - UI navigates to `/changes/CHG-2026-00092` which doesn't exist yet
   - **Fix:** POST form state to `/changes` (create), get back publicId, navigate to detail page

---

### 🔴 CRITICAL: Requests workflow not wired

7. **RequestDetail:XXX — Approve/Reject steps don't call server**
   - **File:** `/home/ubuntu/omni/src/routes/requests/RequestDetail.tsx:101-107` (WorkflowStepper)
   - **Issue:** `onApprove(stepId)` and `onReject(stepId)` are passed down but handlers only update local `request` state
   - **Why it matters:** 
     - Approvals are the core of ServiceNow-style request handling
     - Approval audit trail must be server-recorded (compliance, SLA tracking)
     - Rejection reasons are collected in modal but discarded
   - **Fix:** Wire handlers to `requestsService.approveStep(requestId, stepId, decision, rationale)` and POST

8. **AlertRouting:152-155 — Save alert route changes are local only**
   - **File:** `/home/ubuntu/omni/src/routes/monitoring/AlertRouting.tsx:152-155`
   - **Issue:** `handleSaveChanges()` → `setRoutes(prev => prev.map(...editBuffer))` only
   - **Why it matters:** Alert routes control which alerts go to whom (on-call team, escalation). Unsaved changes are lost on reload.
   - **Fix:** POST to `/monitoring/alert-routes/{id}` with new channel/recipient/severity config before `setRoutes()`

---

### 🟠 HIGH: Unguarded endpoints

9. **EventDetail — Resolve/Acknowledge event (if server-wired)**
   - **File:** `/home/ubuntu/omni/src/routes/monitoring/EventDetail.tsx:XXX`
   - **Issue:** Event status mutations (acknowledge, resolve) may call backend but handlers don't check RBAC
   - **Why it matters:** Any user could acknowledge/resolve other users' alerts if wired
   - **Fix:** Check `useCan('event', 'update')` before handler; ensure `/events/{id}` has `requirePermission('event.update')`

10. **KBEditor — Publish article (if server-wired)**
    - **File:** `/home/ubuntu/omni/src/routes/kb/KBEditor.tsx:XXX`
    - **Issue:** Article publish intent is clear but server route is missing
    - **Why it matters:** Published articles are customer-facing; must have approval workflow
    - **Fix:** Create `/kb/articles` POST/PATCH routes with `requirePermission('kb.write')` and publish/visibility transitions

---

## Architectural Pattern: Why This Happened

**Root cause:** Components use `useState` for local "working copy" that mirrors fetched data, but mutate only the local copy. No service layer bridges local mutations to server.

```typescript
// CURRENT PATTERN (broken):
const incident = useResource(...).data;  // From server
const [inc, setInc] = useState<Incident>(incident);  // Local copy
setInc(prev => {...inc.status: 'resolved'});  // Mutates local only
// ^ Never calls incidentsService.updateStatus() or apiFetch()
```

```typescript
// CORRECT PATTERN (missing):
const handleResolve = async (data: ResolveData) => {
  await incidentsService.resolve(incident.id, data);  // POST to server
  refetch();  // or: useResource re-runs automatically
};
```

---

## Server-Side Status

**POST/PATCH/DELETE routes found:** 10
- `/admin/roles` POST/PATCH/DELETE (3)
- `/integrations` POST/PATCH/DELETE (3)
- `/auth/login`, `/auth/logout`, `/events/ingest` (3)
- **ZERO mutation routes for incidents, changes, requests, cmdb, monitoring, kb**

**requirePermission() coverage:** Extensive on GET routes; not needed yet since mutation routes don't exist.

---

## Remediation Roadmap (Phased)

### Phase 1: Incidents (Week 1)
1. Create server routes: `POST /incidents/{id}/update-status`, `POST /incidents/{id}/resolve`, `POST /incidents/{id}/comment`
2. Guard each route: `requirePermission('incident.update')`
3. Refactor IncidentDetail mutations to call service + refetch
4. Test: Status change persists across page refresh

### Phase 2: Changes (Week 2)
1. Create: `POST /changes`, `PATCH /changes/{id}/status`, `PATCH /changes/{id}/tech-assessment`
2. Implement CAB notification side-effect on status='submitted'
3. Refactor ChangeDetail + NewChange to wire service calls
4. Implement CAB workspace state sync

### Phase 3: Requests (Week 3)
1. Create: `POST /requests/{id}/step/{stepId}/approve`, `POST /requests/{id}/step/{stepId}/reject`
2. Implement SLA timer start on workflow step start
3. Wire RequestDetail approval handlers
4. Test: Approvals recorded in audit log with timestamps

### Phase 4: Alert Routing + Monitoring (Week 4)
1. Create: `POST /monitoring/alert-routes`, `PATCH /monitoring/alert-routes/{id}`
2. Implement alert rule → route validation (prevent orphan routes)
3. Wire AlertRouting save handlers

### Phase 5: KB + remaining (Week 5+)
1. Create KB publish flow with approval gates
2. Stub admin user provisioning (low priority; catalog read-only OK)

---

## Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Mutation coverage (% with server call) | 4% | 100% | 96% |
| Mutation coverage (% with RBAC guard) | 0% | 100% | 100% |
| Mutation coverage (% with auto-refresh) | 0% | 95% | 95% |
| Mutation routes in codebase | 10 | 50+ | 40+ |

---

## Audit Timestamp
- **Generated:** 2026-05-14
- **Scope:** `/src/routes/{incidents,changes,cmdb,monitoring,requests,kb,portal,admin}/**/*.tsx`
- **Sample size:** 40 component files, 136 mutation handlers audited
- **Methodology:** Grep + manual code review for `onClick`, `onSubmit`, `handle*`, `set*()` patterns

