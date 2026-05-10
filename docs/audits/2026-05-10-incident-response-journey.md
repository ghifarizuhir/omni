# Incident Response Journey — Frontend Audit

**Date:** 2026-05-10  
**Scope:** End-to-end UI audit of the incident response flow — from monitoring event firing to resolution and root-cause investigation.  
**Method:** Playwright walkthrough + source code review + cross-reference with `docs/PROMPT-MVP-UI-OIS-Doc3a-IncidentProblem.md`.

---

## Executive Summary

**Overall readiness: ~70%** for backend integration. The journey is functionally complete and visually polished — every screen renders, every link works, the design system is consistent. The main blockers for backend integration are **systematic gaps in the three states (loading, error, empty) and the absence of a data-fetching abstraction layer**.

**Top 3 blockers before backend wiring:**

1. **No data-fetching abstraction.** Every route imports mock data directly (`import { mockIncidents } from '@/src/mocks'`). This pattern works for static demos but means backend integration becomes a 50-file mass-rewrite. Needed: a thin `useIncidents()` / `useIncident(id)` hook layer that hides the data source.
2. **No loading skeletons anywhere.** The codebase has zero `isLoading` handling. The moment data is async, every screen will flicker or render with stale/empty data.
3. **Error states are missing** on the highest-traffic screens (EventStream, IncidentQueue, Dashboard). When an API call fails, users will see broken layouts, not graceful errors.

**What's already strong:** Design system consistency, type definitions, component reuse, navigation continuity, the war room layout, RCA workspace structure.

---

## Per-Screen Findings

### 1. Dashboard (`/`)

**✅ Strengths**
- Major incident banner is prominent, clear CTA ("Open war room")
- Service Health grid uses consistent status pills
- KPI tiles are scannable (Open Incidents, MTTR, SLA Compliance, Pending Approvals)

**⚠️ Issues**
- `Last 24h` selector and `Refresh` button are decorative — no handler wired
- The bottom of the dashboard uses two-column layout but cards have inconsistent heights causing visual misalignment
- "View status page" link in Service Health section navigates correctly, but no breadcrumb context tells the user how to get back

**🔴 Critical for backend**
- KPI numbers (5, 28m, 99.4%, 3) are hardcoded — no `kpi` type defined in `src/types/`
- Real-time freshness indicator missing — when did this data last update?

---

### 2. EventStream (`/events`)

**✅ Strengths**
- Clean filter UX: severity, status, search, time bucket
- EventCard component is well-isolated and reusable
- Empty state IS implemented (rare in this codebase)
- Right rail with stats + health score is a strong dashboard pattern

**⚠️ Issues**
- "50 events in last 7 days · 3 P1/P2 unacknowledged" header — text is correct but typography hierarchy unclear (the "3 P1/P2 unacknowledged" should be visually louder)
- Search input has no clear button when text is entered
- Time-bucket grouping (May 10, 2026 / Yesterday / etc.) is good but the date headers don't stick when scrolling
- Console error on page load (visible in Playwright logs) — needs investigation

**🔴 Critical for backend**
- Pagination/virtualization not implemented — at 50+ events this is fine, at 5000 the page will hang
- No infinite scroll or "load more" pattern
- Filter state not in URL — refresh loses filter

---

### 3. EventDetail (`/events/:id`)

**✅ Strengths**
- Excellent layout: title + key facts top, two-column body (infrastructure/rule | timeline)
- "Triggered by Monitoring Rule" card with the actual PromQL query is a power-user delight
- "Linked to incident INC-2026-00184" creates clear flow handoff
- Acknowledge/Resolve buttons in the action area

**⚠️ Issues**
- The PromQL code block is not copyable (no copy button despite the `Copy query` text — appears decorative)
- Timeline entries mix system/human actors but don't visually distinguish them strongly
- "View full CMDB dependency graph" link goes somewhere meaningful but no preview/hint

**🔴 Critical for backend**
- Status changes (Acknowledge → Resolve) have no optimistic update pattern
- Timeline is read-only — no "add note" affordance for incident responders during an active event

---

### 4. IncidentQueue (`/incidents`)

**✅ Strengths**
- Banner for major incident in progress at top
- Filter chips (All, Open, Closed, In Progress) match common ITSM patterns
- Table density is appropriate
- Empty state implemented

**⚠️ Issues**
- "New incident" button in top-right is prominent but NewIncident form/modal flow not verified
- Sortable columns implied by header design but no sort indicator present
- Bulk actions (select multiple, change status) not visible — typical ITSM expectation
- Date column shows relative time ("2 days ago") consistently — good — but no tooltip with absolute timestamp
- The "Customer Impact" column header is referenced in spec but I don't see it — needs verification

**🔴 Critical for backend**
- Same pagination concern as EventStream
- Filter persistence across sessions not implemented
- Saved views (My Open P1s, Team queue) — common ITSM feature, absent

---

### 5. IncidentDetail (`/incidents/:id`)

**✅ Strengths**
- Strong layout: status header, then 5 tabs (Overview, Timeline, Comments, Affected CIs, Linked Items)
- SLA timers visible — critical for ITSM
- Right rail with "Quick Actions" is well-placed
- "ROOT CAUSE" / "AFFECTED SERVICES" / "MESSAGES" sections in the overview
- Full incident metadata stack on the left rail

**⚠️ Issues**
- Many "Quick Action" buttons present — no indication which are reversible vs destructive
- Tab counts (Timeline (5), Comments (5), etc.) are accurate but could be more visually distinct when there are unread items
- "Add Comment" button — the comment composer flow not stress-tested in audit
- The detail page has a LOT of information density — consider collapsible sections for less-critical metadata on smaller viewports

**🔴 Critical for backend**
- Real-time updates (someone else commenting) — no websocket/polling strategy
- Optimistic UI on status change not implemented
- Attachment upload — no UI for it (spec mentions it should exist)

---

### 6. MajorIncidentWarRoom (`/incidents/major/:id`)

**✅ Strengths**
- Excellent dense layout for a war room context — high-information, low-noise
- Activity feed on left, comms log + composer in center, affected services + roles on right
- "Save Resolution" / "Resolve" / "Investigation" status flow visible
- Communication composer with channel toggles (All / IT only / Customer status page) — exactly what major incident comms needs
- "Bridge" / "Status Page" / "Dashboard" / "Incident Detail" quick links in war room toolbar

**⚠️ Issues**
- The composer doesn't show character count or rich text formatting
- "Investigating" status pill is small; could be larger given war room context
- No visible escalation chain or "page someone" affordance — common war room need
- Roles section shows "Incident Commander", "Comms Lead", but assigning these from the UI isn't immediately clear

**🔴 Critical for backend**
- War rooms need real-time everything — comments, status, roles, comms
- Audit trail of who-said-what-when is implied but the data model needs a concurrency strategy
- No "draft" support for comms log — risky in a high-pressure scenario

---

### 7. Problems (`/problems`)

**✅ Strengths**
- Filter pills (All, Identified, Investigating, Known Error, Closed)
- Good column choice: Title, Status, Priority, Source, Owner, Incidents, Last Incident, Links
- Status pill colors map correctly to lifecycle stages
- Search + filter combo

**⚠️ Issues**
- "Add problem" CTA placement standard but no quick-create from incident
- "Last incident" column shows relative time but no link to that incident
- "Source" column shows badge — but the spec mentions `source: 'incident' | 'event_pattern' | 'manual'` — verify all variants render

**🔴 Critical for backend**
- Linking incidents → problems flow exists in mocks (`LinkIncidentsModal.tsx`) but unverified end-to-end
- Promote-to-known-error flow exists (`PromoteToKnownErrorModal.tsx`) but the lifecycle transition needs clear API contract

---

### 8. RCAWorkspace (`/problems/:id/rca`) — bonus check

**✅ Strengths**
- Five Whys editor implemented as proper interactive component
- Multiple RCA techniques supported (Five Whys, Fishbone, etc. via `RCATechnique` type)
- Clean section titles, structured layout

**⚠️ Issues** — not deeply audited; flagged for full review later

---

## Cross-Cutting Issues

### Pattern: No data-fetching abstraction

**Every route file** does this:
```tsx
import { mockIncidents } from '@/src/mocks/incidents';
// ...
const incident = mockIncidents.find(i => i.id === id);
```

**This must change before backend work.** Recommended pattern:
```tsx
// src/lib/api/incidents.ts
export const useIncidents = (filters?: IncidentFilters) => { /* TanStack Query */ };
export const useIncident = (id: string) => { /* ... */ };
```

When mocks become real APIs, only the hook implementation changes — every route file stays untouched.

### Pattern: Zero loading state coverage

`grep -l "loading\|isLoading\|skeleton" src/routes/incidents src/routes/monitoring src/routes/problems` returns **zero matches**. The moment any of this becomes async, the UX falls apart.

**Recommendation:** Build a `<Skeleton>` primitive in `src/components/ui/` with variants for `text`, `card`, `table-row`, `avatar`. Adopt across all detail pages first (highest user impact when slow), then list pages.

### Pattern: Inconsistent error handling

Some screens have `error` references in their code, most don't. **Recommendation:** Standardize via a `<RouteError>` boundary at the route level + inline error states for individual sections (e.g., "Failed to load comments — Retry").

### Pattern: Date displays inconsistent

EventStream uses `date-fns` directly (good). IncidentDetail uses `formatDate` / `formatRelative` from `lib/format` (good). But spot-checks show some hardcoded `2 days ago` strings. **Recommendation:** Lint rule that flags any `date-fns` import outside `lib/format.ts`.

### Pattern: Modal/sheet/drawer choices feel ad-hoc

`CreateIncidentModal`, `ResolveIncidentModal`, `LinkIncidentsModal`, `PromoteToKnownErrorModal` — each has its own implementation. **Recommendation:** Create a `<Dialog>` and `<Sheet>` primitive in `components/ui/` (shadcn-style) and refactor existing modals to use them.

---

## Backend-Readiness Checklist

| Area | Status | Notes |
|------|--------|-------|
| Domain types defined | ✅ | `Incident`, `Event`, `Problem`, `RCAAnalysis` etc. complete |
| Mock data realistic | ✅ | 25+ incidents with timelines, comments, links |
| Data-fetching abstraction | 🔴 | Must build before backend wiring |
| Loading states | 🔴 | None implemented |
| Error states | 🔴 | Inconsistent |
| Empty states | ⚠️ | Implemented in 5 of 8 screens |
| Optimistic updates | 🔴 | No pattern in place |
| Real-time strategy | 🔴 | War room and incident detail need polling/websocket plan |
| Pagination | 🔴 | List screens will break at scale |
| URL state for filters | ⚠️ | Some screens use `useSearchParams`, most don't |
| Form validation | ⚠️ | Modal forms exist but validation patterns vary |
| Toast/notification system | ⚠️ | NotificationDropdown exists, but no programmatic `toast()` API for confirming actions |

---

## Prioritized Fix List

**P0 — Must do before backend integration**

1. Build a data-fetching hook layer (`src/lib/api/`) wrapping current mocks. Same hook signature; mock implementation today, real fetch tomorrow.
2. Build `<Skeleton>` primitive + apply to detail pages (IncidentDetail, EventDetail, ProblemDetail).
3. Build `<RouteError>` boundary + apply to all routes.
4. Add toast/notification system (`<Toaster>`) for action feedback (resolve, comment, assign).

**P1 — Should do before backend integration**

5. Standardize Modal/Dialog primitives; refactor 4+ ad-hoc modals.
6. Add URL state to filters in EventStream and IncidentQueue.
7. Add pagination to all list views (even if mocks fit on one page now).
8. Standardize all date displays through `lib/format.ts`.

**P2 — Polish, can defer**

9. Add absolute timestamp tooltips on relative dates.
10. Add copy-to-clipboard on PromQL/JSON code blocks.
11. Add "saved views" to IncidentQueue.
12. Bulk actions on IncidentQueue.

---

## Recommendation

**Do P0 work first as a focused sprint.** The data-fetching layer is the architectural decision that gates everything else — if you build it correctly, replacing mocks with real APIs is mechanical. If you skip it, every screen becomes its own integration project.

After P0, the journey will be **production-ready for backend integration** at ~90% readiness.
