# Problems — RCA & Known Error Database

Status: **Draft**
Route: `/problems` (list), `/problems/:problemId` (detail), `/problems/:problemId/rca` (RCA workspace), `/kedb` (Known Error DB)
Sidebar: Operations · Problems
Source: `src/routes/problems/ProblemList.tsx`, `ProblemDetail.tsx`, `RCAWorkspace.tsx`, `KEDB.tsx` · `src/types/problem.ts` · `server/routes/itsm.ts` (`itsmRouter` `/problems`) · `src/components/problems/*` · `src/lib/constants.ts` (`problemStatusMeta`, `problemSourceMeta`, `rcaTechniqueMeta`)

---

## Intent

Problem Management mencegah **insiden berulang** — beda dari Incident yang fokus restore cepat. Operator mengidentifikasi pola insiden → investigasi akar masalah (RCA) → dokumentasi workaround sebagai Known Error → permanent fix via Change. KEDB kemudian jadi self-service L1/L2 saat incident response.

ITIL 4: Incident = symptom/service disruption, Problem = root-cause investigation (satu Problem bisa link ke banyak Incident). Status workflow Problem menggerakkan visibilitas ke KEDB.

## Current State (snapshot `src/routes/index.tsx:137-140`)

- `src/routes/index.tsx:137` → `<ProblemList />` at `/problems`
- `src/routes/index.tsx:138` → `<RCAWorkspace />` at `/problems/:problemId/rca`
- `src/routes/index.tsx:139` → `<ProblemDetail />` at `/problems/:problemId`
- `src/routes/index.tsx:140` → `<KEDB />` at `/kedb`
- Komponen pendukung: `CreateProblemModal` (`ProblemList.tsx:49-108`), `LinkedItemsIcons` (`ProblemList.tsx:111-132`), `SectionCard`/`MetaRow` (`ProblemDetail.tsx:51-68`), `RCASummaryTab` (`ProblemDetail.tsx:71-212`), `RelatedIncidentsTab` (`ProblemDetail.tsx:216-285`), `PatternSummaryCard` (`ProblemDetail.tsx:289-329`), `CloseProblemModal` (`ProblemDetail.tsx:333-349`), `HistoryTab` (`ProblemDetail.tsx:353-388`), `StatusDropdown` (`ProblemDetail.tsx:392-438`), `FiveWhysEditor` (`RCAWorkspace.tsx:28-84`), `FishboneEditor` (`RCAWorkspace.tsx:88-178`), `NarrativeEditor` (`RCAWorkspace.tsx:182-190`), `PlaceholderEditor` (`RCAWorkspace.tsx:192-198`), `StringList` (`RCAWorkspace.tsx:202-239`), `RecommendedActionsEditor` (`RCAWorkspace.tsx:243-352`), `PromoteToKnownErrorModal` (`src/components/problems/PromoteToKnownErrorModal.tsx:23-111`), `KnownErrorCard` (`src/components/problems/KnownErrorCard.tsx:19-128`), `ProblemStatusPill` (`src/components/problems/ProblemStatusPill.tsx:11-22`), `ProblemSourceChip` (`src/components/problems/ProblemSourceChip.tsx:19-36`), `LinkIncidentsModal` (`src/components/problems/LinkIncidentsModal.tsx:18-100`), `LinkChangeModal` (reuse `src/components/incidents/LinkChangeModal`), `IDCell` (`src/components/ui/IDCell.tsx`), `StatusRing`, `SeverityBadge`.
- API: `server/routes/itsm.ts:30-36` — 2 endpoints via `req.scoped.problems.*` (`list`/`get`), gated `requirePermission('problem.read')` + `parsePagination`.
- Types: `ProblemStatus identified→investigating→known_error→fix_in_progress→closed` + `ProblemSource incident_pattern|major_incident|proactive|audit|user_reported` + `RCATechnique five_whys|fishbone|fault_tree|timeline|narrative` + `RCAAnalysis` + `KnownError` block (`src/types/problem.ts:3-106`).
- Services: `problemsService.list()` / `get(publicId)` (`src/services/itsmServices.ts:12-15`) via `apiFetch`; no mock fallback (`src/services/index.ts`).
- Constants: `problemStatusMeta` dot+color+bg (`src/lib/constants.ts:146-152`), `problemSourceMeta` label/icon/description (`src/lib/constants.ts:154-160`), `rcaTechniqueMeta` (`src/lib/constants.ts:162-168`), `SEVERITY_STRIPE` P1 `#B42318` P2/3 `#DC6803` P4 `#027A48` (`ProblemList.tsx:40-45` / `ProblemDetail.tsx:36-38`).

**Working:**
- ProblemList renders table (ID `IDCell font-mono`, Title+tags, Status `StatusRing`, Severity `SeverityBadge`, Source `ProblemSourceChip`, Owner `Avatar xs`, Incidents count+dots, Last incident `formatRelative`, Links icons, ⋯ menu) — sort toggles `lastIncidentDate desc` default, via `ArrowUpDown` header (`ProblemList.tsx:242-247`, `handleSort` `ProblemList.tsx:237-240`).
- Stats strip: pill buttons All + per-status (only `statusCounts[s]>0` shown), active uses `problemStatusMeta[s].color` bg, counts derived `useMemo` (`ProblemList.tsx:191-202`).
- Filter bar: Search `h-9 rounded-lg border-ois-border` (ID/title/tag, `ProblemList.tsx:205-214`), Source `FilterDropdown` (`ProblemList.tsx:341-349`), Owner `FilterDropdown` from unique owners (`ProblemList.tsx:352-360`), Reset clears all (`ProblemList.tsx:250`), filtered count `filtered.length of problems.length` (`ProblemList.tsx:372-374`).
- Row: `border-l-[3px]` stripe by severity (`ProblemList.tsx:438-443`), hover `hover:bg-ois-surface-muted/30` + `group-hover:opacity` for `MoreVertical` (`ProblemList.tsx:440`), click → `navigate(/problems/{publicId})` (`ProblemList.tsx:441`), incident dots: count bold `font-mono` color red ≥4 `≥4 #B42318`, amber 2-3 `#DC6803`, muted 1 (`ProblemList.tsx:493-495`), dots 5 max with opacity gradient (`ProblemList.tsx:500-506`).
- CreateProblemModal (`ProblemList.tsx:55-108`): Title required `* text-ois-danger`, description optional, validation `!title.trim() return`, creates `extraProblems` client-side with `publicId PRB-YYYY-#####` (`ProblemList.tsx:164-189`), RBAC gated `Can problem.create` (`ProblemList.tsx:271-276`).
- KEDB link `BookOpen KEDB` next to New problem (`ProblemList.tsx:265-270`).
- Detail 3-column pinned header pattern (`ProblemDetail.tsx:528-583`): nav row `← Problems` + `StatusDropdown` gated `Can problem.update` with resource `problemResource(problem)` + `MoreVertical`, entity header `w-1 stripe PRIORITY_STRIPE[severity]` + `publicId mono` + `SeverityBadge` + `ProblemSourceChip` + `h1 text-xl font-bold` + tags `rounded-full bg-ois-surface-muted border-ois-border` + meta `Investigating since formatRelative + owner + recurrence` (`ProblemDetail.tsx:560-582`).
- Left sidebar `w-[280px] border-r bg-white` (`ProblemDetail.tsx:589-662`): At a glance (`Status/Severity/Source/Owner/Created/Updated`), Related summary (Linked/Active/Resolved counts + See tab link), Permanent fix (linked changes with `ChangeStatusPill`+`RiskBadge`).
- Center tabs 6: `overview|incidents|rca|known-error|fix-plan|history` (`ProblemDetail.tsx:508-515`) — bar `border-b border-ois-border shrink-0 px-6` + active `border-ois-primary text-ois-primary font-bold` else `border-transparent text-ois-text-muted hover:border-ois-border-strong` (`ProblemDetail.tsx:667-684`), only scroll region `overflow-y-auto px-6 py-5` (`ProblemDetail.tsx:687`).
  - Overview: Description editable inline (`Edit3` → textarea → Save/Cancel updates local `setProblem` `ProblemDetail.tsx:695-722`), Affected services + CIs (`ProblemDetail.tsx:724-743`), `PatternSummaryCard` first/latest incident + avg MTTR from linked incidents (`ProblemDetail.tsx:289-329` computed `avgMttr` from `resolution.resolvedAt`).
  - Related Incidents: filters `allIncidents where relatedIncidentIds includes` (`ProblemDetail.tsx:218-220`), empty → `Link incidents` CTA, table ID `font-mono text-ois-primary hover:underline` → `/incidents/:publicId` + Priority/Status/Created.
  - RCA: `RCASummaryTab` — empty → `Activity 36px` + `Open RCA workspace` link, else technique label (`rca.technique.replace('_',' ')`), summary, author + `formatRelative(updatedAt)`, Root causes numbered red `bg-ois-danger/10 text-ois-danger`, Contributing factors bullet, Recommended Actions table (Type colored dot `corrective #B42318 preventive #1F4FD4 detective #6941C6`, status `done #067647 in_progress #0BA5EC open #475467`).
  - Known Error: if `status known_error && knownError` → `KnownErrorCard` else CTA `Promote to Known Error` (`ProblemDetail.tsx:758-774`).
  - Fix Plan: Linked changes block (`Wrench` header + `Plus Link change` → `LinkChangeModal`), Linked KB block + `Suggest article → /kb/editor?source=problem…`, Linked Improvements filtered `imp.linkedProblemPublicId===publicId` (`ProblemDetail.tsx:857-885`).
  - History: vertical timeline `Plus→Activity|ShieldAlert|RefreshCw|CheckCircle2` with left rail dot `w-7 h-7 rounded-full border-2 bg-white` + vertical `w-px bg-ois-border` connector (`ProblemDetail.tsx:353-388`), sorted by `ts` asc.
- Right sidebar Quick Actions `w-[280px] border-l p-4` (`ProblemDetail.tsx:895-937`): primary `Promote/Edit known error` (primary true if not yet KE), `Link incidents`, `Open RCA workspace` → navigate, `Link change`, `Suggest KB article`, divider + `Close problem` — all gated `Can problem.update resource={problemResource(problem)}` else italic `You can view…`.
- RCA Workspace (`RCAWorkspace.tsx:356-598`): header `← Back to {publicId}` + `h1 RCA: title` + technique selector dropdown (`rcaTechniqueMeta` `five_whys|fishbone|narrative` selectable `TECHNIQUES` `RCAWorkspace.tsx:436`), author `Avatar xs` + `Last saved: formatRelative` (`RCAWorkspace.tsx:441-489`), Save draft + Publish RCA (Re-publish after publish) gated `Can problem.update` (`RCAWorkspace.tsx:496-510`), success banner `bg-ois-success-pale border-ois-success/20 text-ois-success CheckCircle2` upon publish (`RCAWorkspace.tsx:515-520`), technique editor `border border-ois-border rounded-xl bg-white p-5` (`RCAWorkspace.tsx:523-546`), common sections `Root causes / Contributing factors / Recommended actions` (`RCAWorkspace.tsx:549-573`), footer Cancel + Save/Publish dup.
  - FiveWhys: Problem statement card `bg-ois-surface-muted/30 border-ois-border` (`RCAWorkspace.tsx:43-46`), left rail `border-l-2 border-ois-primary/20`, levels max 8 numbered `bg-ois-primary text-white`, `Add another why` link (`RCAWorkspace.tsx:32-84`).
  - Fishbone: head input + 2-col grid categories (`Technology/Process/People/Environment` defaults `RCAWorkspace.tsx:423-430`), per category card `border-ois-border rounded-lg` + header `bg-ois-surface-muted/50` + causes list with `+ Add cause` (`RCAWorkspace.tsx:88-178`).
  - Narrative: `textarea rows 12` + placeholder prose (`RCAWorkspace.tsx:182-190`).
  - Fault Tree/Timeline: placeholder `border-ois-border rounded-lg p-8 bg-ois-surface-muted/30` falling back to Five Whys/Fishbone suggestion (`RCAWorkspace.tsx:192-198`, `543-545`).
  - StringList: numbered `bg-ois-surface-muted border-ois-border` + textarea rows 2 (`RCAWorkspace.tsx:202-239`).
  - RecommendedActions: table `border-ois-border rounded-lg overflow-hidden` with `FilterDropdown` for type/owner/status, colors type→`corrective #B42318 preventive #1F4FD4 detective #6941C6`, status icons `CheckCircle2 success Clock info AlertCircle subtle` (`RCAWorkspace.tsx:243-352`).
- KEDB (`KEDB.tsx:20-221`): hero search `h-12 rounded-xl border-ois-border` placeholder `Search by symptom, error message, CI name…` autoFocus (`KEDB.tsx:87-93`), hot searches `pool connection timeout ssl auth` as pills `bg-ois-surface-muted border-ois-border hover:border-ois-primary hover:text-ois-primary` when no query (`KEDB.tsx:102-114`), filters Service (only services appearing in known errors `relevantServiceIds`) + Effectiveness `full|partial|none` (`KEDB.tsx:119-140`), cards per KE: header `KE-{publicId} · X related incidents in last 6 weeks · Affected: services` + `View problem` link, then `KnownErrorCard` reuse (`KEDB.tsx:184-210`), Apply workaround CTA `border-ois-primary text-ois-primary hover:bg-ois-primary hover:text-white` → inline picker of 10 recent open incidents via `incidentsService.list()` + `FilterDropdown` → link `/incidents/:id` (`KEDB.tsx:225-279`).
- Modals: `PromoteToKnownErrorModal` requires rootCause+workaround (validates, amber `bg-amber-50 border-amber-200` info `ShieldAlert amber`) + radio `full|partial|none` + optional affectedVersions/permanentFixPlan (`src/components/problems/PromoteToKnownErrorModal.tsx:31-99`), `LinkIncidentsModal` checkbox list searchable with `SeverityBadge+IncidentStatusPill+formatRelative` (`src/components/problems/LinkIncidentsModal.tsx:18-99`), `CloseProblemModal` confirm-patch (`ProblemDetail.tsx:333-349`), `PromoteToKnownErrorModal` publish sets `status='known_error'` + `knownError { publishedAt publishedBy rootCause workaround workaroundEffectiveness }` (`ProblemDetail.tsx:493-499`).
- RBAC in ProblemList: `filterReadable(user,'problem', ...problemResource(p))` (`ProblemList.tsx:155-162`), KEDB header gated `Can problem.update` for Add known error (`KEDB.tsx:73-80`).

## CRUD Wiring (audited 2026-08-28 — see `docs/audits/crud-audit.md`)

| Op | FE → Service → Route → Scoped → Repo → Prisma | Status |
|----|-----------------------------------------------|--------|
| **C** create | `ProblemList.tsx:164 handleCreateProblem PRB-YYYY-##### 166 ownerId mockUsers[0] 175 → setExtraProblems 188` → no `problemsService.create` `itsmServices.ts:12 list/get only` → no Zod `problem.ts` → **no `POST /problems`** `itsm.ts:30 2 GETs` → `ProblemsScope list/get only 115` → `problemsRepo list/get 56` | 🔴 NOT WIRED |
| **R list** | `ProblemList 146 useResource(list) 155 filterReadable problemResource` · `GET /problems 30 parsePagination` wired but FE no `?page` → `docs.ts:22 take/skip` | 🟡 pagination dead, client filter |
| **R get** | `ProblemDetail 446 get(publicId)` → `GET /problems/:publicId 34 required 404` → `docs.ts:58 findFirst {tenantId,publicId}` | 🟢 only wired op |
| **R history** | `HistoryTab 353 synthesized ts sorted asc icons Plus→CheckCircle2 368` no fetch | 🔴 no `GET /problems/:publicId/timeline` |
| **U status / close** | `StatusDropdown 392→501 setProblem({status:newStatus})` gated `Can problem.update 542` → no `PATCH /status` | 🔴 local `CloseProblemModal 333→941 set to closed` no `closedAt`/audit |
| **U knownError** | `PromoteModal 31→99 validate` → `Detail 493 knownError:{publishedBy:'u-001' 497}` hardcode | 🔴 |
| **U RCA** | `DEFAULT_RCA author u-001 Sarah Chen 374` `handleSave/handlePublish setRca 405` `PlaceholderEditor 192 fault_tree/timeline` | 🔴 |
| **U links** | `LinkIncidentsModal 18→ Detail 951 relatedIncidentIds [...new Set]` local, `967 linkedChangeIds` local, `Suggest article /kb/editor` nav | 🔴 |
| **D** | — (via status `closed` only, no hard DELETE) | 🔴 |

*Full file:line evidence in `docs/audits/crud-audit.md` §3.*

**Stub / Partial (2026-08-28 audit):**
- All mutations are client-side state (`extraProblems` + `setProblem` local) — **no `POST/PATCH /problems` write endpoints** (only `GET` exists in `server/routes/itsm.ts:30-36`). `handleCreateProblem` (`ProblemList.tsx:164-189`), `handlePromote` (`ProblemDetail.tsx:493-499` hardcode `publishedBy:'u-001'`), `handleStatusChange` (`ProblemDetail.tsx:501-503`), link-incident/change (`ProblemDetail.tsx:951-978` local arrays), RCA save/publish (`RCAWorkspace.tsx:405-415` `author u-001/Sarah Chen 374`) are in-memory.
- RCA: `fault_tree` and `timeline` editors are placeholder only (`PlaceholderEditor.tsx:192-198` + `543-545`).
- KEDB Apply Workaround (`KEDB.tsx:225-279`) just `navigate(/incidents/:id)` — no server audit.
- Recommended actions `linkedChangeId` inline text only; creating/linking a Change from RCA action is manual.
- `user u-001 Sarah Chen` hardcoded as default `authorId/Name` (`RCAWorkspace.tsx:374-375`, `ProblemDetail.tsx:497`).
- Pattern auto-detection job not implemented — incident linking is manual via `LinkIncidentsModal`. Pagination via `parsePagination` `itsm.ts:31` + `take/skip docs.ts:22` wired but FE `problemsService.list()` `itsmServices.ts:13` never sends `query` → dead.

**Missing (vs ITIL + legacy spec):**
- Server write endpoints `POST /problems`, `PATCH /problems/:id/status`, `POST .../promote-known-error`, `POST .../rca`, `POST .../linked-incidents` (pattern in `server/repositories/docs.ts:71 changesRepo.create` reusable).
- Saved view / multi-sort URL persist (`?status=known_error&source=...`), column customization.
- Full-text search with `source:` / `severity:` qualifiers.
- Fault Tree visual editor (nodes/edges) and Timeline chronological editor.
- Mention/notification delivery on RCA collaboration.

## Primary View — Problem List (`/problems`)

Layout: **header + stats strip + filter bar + table** (`space-y-5 pb-10` `ProblemList.tsx:254`).

### Header (`ProblemList.tsx:257-278`)

- Title block: `Problems` `text-2xl font-bold text-ois-text` + stats `(total · active · known errors)` where `active = identified|investigating|fix_in_progress` (`ProblemList.tsx:201`), known `statusCounts['known_error']` (`ProblemList.tsx:202`), + actions `KEDB BookOpen` (secondary) + `New problem Plus` (primary, gated `Can problem.create`).
- Stats strip (`ProblemList.tsx:281-319`): flex wrap gap `px-3 py-1 rounded-full text-xs font-semibold border` — `All {n}` active `bg-ois-primary text-white border-ois-primary` else `bg-white text-ois-text border-ois-border hover:bg-ois-surface-muted`; per-status pills only if `statusCounts[s]>0`, active uses `problemStatusMeta[s].color` inline bg+border, label `problemStatusMeta[s].label + count`. Divider `h-4 w-px bg-ois-border hidden sm:block` + source summary `By source: Incident Pattern X · …` where `sourceCounts[s]>0` (`ProblemList.tsx:316-318`).
- Filter bar (`ProblemList.tsx:322-375`): Search `relative flex-1 min-w-[200px] max-w-xs` with `Search 14px left-3` + `X 13px right` clear (`ProblemList.tsx:324-338`) · Source `FilterDropdown` (`ProblemList.tsx:341-349`) · Owner `FilterDropdown` derived `uniqueOwners` via `USER_MAP` (`ProblemList.tsx:352-360`) · Reset `X 13px + border-ois-border rounded-lg` (`ProblemList.tsx:362-370`) · trailing count `X of Y shown`.

### Columns (Phase 1) (`ProblemList.tsx:380-419`)

| Column | Source | Width | Sort | Notes |
|--------|--------|-------|------|-------|
| ID | `publicId` | — | ❌ | `IDCell font-mono text-xs text-ois-primary` |
| Title | `title` | flex `max-w-[260px]` | ❌ | `font-medium text-ois-text truncate` + tags `text-[10px] font-mono bg-ois-surface-muted` |
| Status | `status` | — | ❌ | `StatusRing` `PROBLEM_STATUS_TO_RING` (`ProblemList.tsx:32-38`) — `identified open`, `investigating/known_error investigating`, `fix_in_progress acknowledged`, `closed closed` |
| Sev | `severity` | — | ✅ | `SeverityBadge` + `ArrowUpDown 11px` `text-ois-primary` if active else `text-ois-border` |
| Source | `source` | — | ❌ | `ProblemSourceChip` `bg-ois-surface-muted border-ois-border` (`ProblemSourceChip.tsx:24-27`) |
| Owner | `ownerId→user` | — | ❌ | `Avatar size xs` + name truncate `max-w-[90px]` |
| Incidents | `relatedIncidentCount` | — | ✅ | count `font-mono font-bold` color red≥4 `#B42318` amber≥2 `#DC6803` else muted + 5 dots `w-1.5 h-1.5 rounded-full` with opacity ramp |
| Last incident | `lastIncidentDate` | — | ✅ default `desc` | `formatRelative` else `—` |
| Links | `rca/linkedKB/linkedChanges` | — | ❌ | `LinkedItemsIcons`: `Activity ois-primary` if rca, `BookOpen muted` if KB, `Wrench muted` if Changes |
| ⋯ | actions | 40px | — | `MoreVertical 15px` reveal `opacity-0 group-hover:opacity-100 hover:bg-ois-border` |

Sort: `handleSort` toggles asc/desc if same key else desc (`ProblemList.tsx:237-240`); `SEVERITY_ORDER P1:0→P4:3` (`ProblemList.tsx:30`). Default `lastIncidentDate desc`.

### Row interaction (`ProblemList.tsx:438-537`)

- Hover: `hover:bg-ois-surface-muted/30`, `border-l-[3px]` severity stripe.
- Click row → `navigate(/problems/{publicId})` + tooltip `description.slice(0,200)`.
- ⋯ click `stopPropagation` — menu placeholder (no items wired yet).

### Pagination

`parsePagination` via `server/lib/pagination.ts` — `?page=&pageSize=` used by `scoped(req).problems.list(pagination)` (`server/routes/itsm.ts:30-32`); client `ProblemList` currently renders all filtered (no pager), server paginates.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Create problem | `New problem` button → `CreateProblemModal` | `problem.create` (`prb-create` IFM/APS officer) | — |
| Edit title/desc | Detail Overview inline `Edit3` → Save | `problem.update` | not closed (UI allows any) |
| Change status | Top `StatusDropdown` (`identified…closed`) | `problem.update` (`prb-update-ifm/aps`) resource `ownerTeamId` | — |
| Promote to Known Error | Quick Actions primary OR Known Error tab CTA → `PromoteToKnownErrorModal` | `problem.update` | not `known_error` (else Edit) |
| Edit known error | `KnownErrorCard Edit` / Quick Actions | `problem.update` | `known_error` |
| Link incidents | Quick Actions / Related Incidents tab → `LinkIncidentsModal` | `problem.update` | — |
| Link change | Quick Actions / Fix Plan → `LinkChangeModal` | `problem.update` | — |
| Suggest KB article | Quick Actions / Fix Plan → `navigate(/kb/editor?source=problem…)` | `problem.update` | — |
| Open RCA workspace | Quick Actions / RCA tab → `navigate(.../rca)` | `problem.update` for save/publish, read for view | — |
| Save RCA draft | RCA header/footer `Save draft` | `problem.update` | — |
| Publish RCA | `Publish RCA` → success banner + button → `Re-publish` | `problem.update` | — |
| Close problem | Quick Actions `Close problem` → `CloseProblemModal` confirm | `problem.update` | — (sets `closed`) |
| Apply workaround (KEDB) | KEDB card `Apply workaround to incident` → picker → `navigate(/incidents/:id)` | `incident.write` (on target) | KE `known_error` |

Delegate ke [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md), [`_shared/create-flow.md`](./_shared/create-flow.md) saat shared tersedia.

## Filters / Sort / Search

- **Search (list):** `search` state lowercases `publicId/title/tags` includes (`ProblemList.tsx:207-213`). Placeholder `Search ID, title, tag...` debounced by state (no timer — instant filter).
- **Search (KEDB):** hero `Search by symptom, error message, CI name…` lowercases `title + knownError.rootCause/workaround + affectedCIPublicIds + affectedServiceIds→service name` (`KEDB.tsx:36-46`).
- **Status filter (list):** `statusFilter all|identified|investigating|known_error|fix_in_progress|closed` pill toggle (click again → `all`) (`ProblemList.tsx:283-313`).
- **Source filter:** `FilterDropdown` `all|incident_pattern|major_incident|proactive|audit|user_reported` (`ProblemList.tsx:341-349`), label from `problemSourceMeta`.
- **Owner filter:** `FilterDropdown` `all + uniqueOwners→USER_MAP name` (`ProblemList.tsx:351-360`).
- **KEDB Service filter:** `all + relevantServiceIds` (only services in known errors) (`KEDB.tsx:120-132`).
- **KEDB Effectiveness filter:** `all|full|partial|none` matching `knownError.workaroundEffectiveness` (`KEDB.tsx:52-53`, `134-140`).
- **Sort (list):** click `Sev / Incidents / Last incident` header → `handleSort` — numeric `severity P1→P4`, `relatedIncidentCount`, or timestamp of `lastIncidentDate/createdAt`; `sortDir` toggles (`ProblemList.tsx:219-233`).
- **Persist:** filters not yet in URL; counts derived in-memo.
- **Export:** not present for problems (vs incidents export TODO).

## Detail View (`/problems/:problemId`)

### Layout (3-column, `ProblemDetail.tsx:586-937`)

```
← Problems | StatusDropdown (color dot 6px) | ⋯
[w-1 priority stripe] PRB-YYYY-##### · SeverityBadge · SourceChip
h1 Title (text-xl font-bold) · tags rounded-full · meta formatRelative owner recurrence
┌────────────────┬──────────────────────────────────────┬──────────────────┐
│ Left sidebar   │ Center tabs (Overview / Related       │ Right actions    │
│ At a glance    │ Incidents / RCA / Known Error /      │ Quick actions    │
│ Related (cnt)  │ Fix Plan / History)                  │ (primary KE,     │
│ Permanent fix  │                                      │ close divider)   │
│ (if linked)    │                                      │                  │
└────────────────┴──────────────────────────────────────┴──────────────────┘
```

- **Pinned header:** `bg-white border-b border-ois-border shrink-0 z-30` (`ProblemDetail.tsx:531`) + nav row `px-6 py-2 border-b`, entity header `flex items-start gap-0` with `w-1 self-stretch PRIORITY_STRIPE[severity]` + content `px-6 py-4`.
- **Left `w-[280px] border-r bg-white p-4 space-y-4 overflow-y-auto`** — cards `SectionCard` pattern `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] uppercase tracking-widest` (`ProblemDetail.tsx:51-60`).
- **Center `flex-1 min-w-0 flex flex-col`** — tab bar `shrink-0 px-6 border-b bg-white` + scroll `flex-1 overflow-y-auto px-6 py-5`.
- **Right `w-[280px] border-l bg-white p-4`** — Quick Actions sticky.

### Center Tab Details

- **Overview** — `Description` editable + `Affected services` (dot `bg-ois-danger` + name) + `Affected CIs: PRB links → /cmdb/:pub` + `PatternSummaryCard` (First `MMM d, yyyy`, Latest `formatRelative`, Avg MTTR `formatMin`, Total recurrences).
- **Related Incidents** — table `Incidents.filter(publicId in relatedIncidentIds)`; header `bg-ois-surface-muted/50 border-b`; row `hover:bg-ois-surface-muted/30`.
- **RCA** — reuse `RCASummaryTab` as above.
- **Known Error** — `KnownErrorCard` (`src/components/problems/KnownErrorCard.tsx:19-128`): outer `rounded-xl border-2` bg per effectiveness (`full #ECFDF3 border #ABEFC6`, `partial #FFFAEB #FEDF89`, `none #FEF3F2 #FECDCA`), header `ShieldAlert + Known Error · Published formatRelative by publisher + FULL/PARTIAL/NONE badge CheckCircle2/AlertTriangle/XCircle`, body Root cause / Workaround / KB+Change links / Affected versions + Permanent fix plan 2-col grid.
- **Fix Plan** — Linked Changes block (`Wrench`) + KB block (`BookOpen` → `Suggest article`) + Improvements (filtered by `linkedProblemPublicId`).
- **History** — timeline as above.

### RCA Workspace (`/problems/:problemId/rca`)

```
← Back to PRB-XXXX
h1 RCA: title · Technique dropdown · Avatar · Last saved formatRelative
[⋯] [Save draft secondary] [Publish RCA primary]
[success banner if published bg-ois-success-pale border-ois-success/20]
┌─────────────────────────────────────────────────────────────────┐
│ [technique editor: FiveWhys|Fishbone|Narrative|Placeholder]      │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│ Root causes · Contributing factors · Recommended actions table    │
└─────────────────────────────────────────────────────────────────┘
Cancel ─────────────── Save draft · Publish RCA (Re-publish)
```

- Editor container `border border-ois-border rounded-xl bg-white p-5` with `inputClass` focus `ring-ois-primary/20 border-ois-primary` (`RCAWorkspace.tsx:19`).
- Recommended actions table actions own includes owner `FilterDropdown` + status `FilterDropdown` with icons.

### KEDB (`/kedb`)

- Page header `Known Error Database` + counts `X known errors · Search saves time…` + `Add known error` gated `Can problem.update` (`KEDB.tsx:66-81`).
- Hero search card `bg-white border-ois-border rounded-xl p-5 shadow-ois-card` (`KEDB.tsx:84-116`).
- Empty: `BookOpen 28px bg-ois-surface-muted w-16 h-16 rounded-full` + `No known errors yet` + `Browse problems` CTA if zero KEs, else `No results match` + `Clear filters` (`KEDB.tsx:158-181`).

## State Lifecycle

```
identified → investigating → known_error → fix_in_progress → closed
      ↓             ↓             ↓               ↓             ↑
   (any→closed for false alarm / duplicate — UI allows StatusDropdown to closed from any)
```

- RCA can be drafted in any state; recommended `investigating` before publish. Promote creates `known_error` + `knownError` block (`ProblemDetail.tsx:493-499`).
- Permanent fix: link Change(s) → `fix_in_progress` (manual status change), then Change `closed_successful` → `closed`.
- No server state machine enforcement yet — `handleStatusChange` simply sets local state (`ProblemDetail.tsx:501-503`). No `reopen` guard.
- History synthesizes: `createdAt → rca.createdAt → knownError.publishedAt → updatedAt → closedAt` sorted asc (`ProblemDetail.tsx:353-360`) — future server audit timeline pending.

Ref: `src/types/problem.ts:3-8` + `problemStatusMeta` colors (`src/lib/constants.ts:146-152`) + `server/routes/itsm.ts` audit plan.

## Permissions (action-level)

| Permission | Who | Actions |
|------------|-----|---------|
| `problem.read` | IFM all (`prb-read-ifm` scope `all`); APS officer+ on own apps (`prb-read-aps` `team_app`) | List / get / queue · filtered via `filterReadable(user,'problem',...problemResource)` (`ProblemList.tsx:155-162`) |
| `problem.create` | IFM/APS officer+ (`prb-create` scope `all`) — IT officer+ can raise | `New problem` modal; client `CreateProblemModal` gated `Can problem.create` (`ProblemList.tsx:271`) |
| `problem.update` (UI) / `problem.write` (seed `prisma/seedRbac.ts:24`) | IFM officer+ all; APS officer+ on own apps (`prb-update-ifm/aps`) resource `ownerTeamId` | Status/status dropdown, RCA save/publish, promote/edit KE, link incidents/change, suggest KB, close (`Can problem.update resource={problemResource(p)}`) |
| `kb.write` | Team Lead+ | Suggest KB article creates draft via `/kb/editor` (separate permission) |
| `change.write` / `change.read` | varies | Link change reuses `LinkChangeModal` (change permissions gated inside) |

Scope violation → 403 `scope_violation` via `server/scope/errors.ts` (global `requireAuth` + `withScopedDb` enforced in `server/app.ts:126`, per `AGENTS.md`).

Fallback read-only message when lacking update: `Read-only — only IFM or the owning APS team can change status.` (`ProblemDetail.tsx:546-549`) and `You can view this problem but cannot modify it.` (`ProblemDetail.tsx:902-904`).

## Empty / Loading / Error

- **Empty list (filter miss):** `Bug 32px text-ois-text-subtle mx-auto + No problems match your filters + Reset filters link` (`ProblemList.tsx:423-433`).
- **Empty KEDB (no KEs):** `BookOpen 28px w-16 h-16 rounded-full bg-ois-surface-muted + No known errors yet + Browse problems` (`KEDB.tsx:163-171`).
- **Empty KEDB (no search hit):** `No results match your search + Clear filters` (`KEDB.tsx:173-179`).
- **Empty detail subsections:** RCA none → `Activity 36px + No RCA conducted yet + Open RCA workspace` (`ProblemDetail.tsx:74-87`); Fix Plan none → `No changes/KB linked yet` (`ProblemDetail.tsx:815`, `852`); Related incidents none → `AlertTriangle 32px + No related incidents linked yet + Link incidents` (`ProblemDetail.tsx:222-232`); Known Error none → `ShieldAlert 36px + Not yet a Known Error + Promote to Known Error` (`ProblemDetail.tsx:762-773`).
- **Loading:** ProblemDetail `flex items-center justify-center py-24 Loading…` (`ProblemDetail.tsx:473-475`), RCAWorkspace same (`RCAWorkspace.tsx:392-394`).
- **404 not found:** `XCircle 40px text-ois-danger + Problem not found + ← Back to problems` (`ProblemDetail.tsx:477-485`, `RCAWorkspace.tsx:395-402`).
- **Validation errors:** Create requires Title (`* text-ois-danger` + disabled `Create problem` until `title.trim()` `ProblemList.tsx:101`); Promote requires rootCause+workaround with inline `text-xs text-ois-danger` (`PromoteToKnownErrorModal.tsx:65,72`); Close has no validation (confirm only).
- **Error banner (future):** pattern `bg-ois-danger-pale text-ois-danger + Retry` mirrors incidents; not yet wired for problems GET failure beyond 404.

## Phase 2 Deferred

- Server write endpoints: `POST /problems` (create with `title, description, severity, source, affectedCIs/services`), `PATCH /problems/:publicId/status`, `POST /problems/:publicId/rca` (draft/publish), `POST .../known-error` promote, `POST/DELETE .../linked-incidents|changes` — move from `extraProblems`/`setProblem` to `req.scoped.problems.*` + `audit` (`server/routes/itsm.ts:30-36` extension, per `AGENTS.md` no direct prisma in routes).
- Full RCA editors: `fault_tree` logical tree (AND/OR gates) and `timeline` chronological reconstruction with draggable entries — currently `PlaceholderEditor` (`RCAWorkspace.tsx:192-198`).
- Auto pattern detection job: scan incident pool for recurrence (same CI/service, window 6w) and suggest new problem — stubbed as manual `LinkIncidentsModal`.
- Real pagination + URL-persisted filters/sort (`?status=&source=&owner=&sort=severity:desc`).
- Mention/notification delivery on RCA (`mentions[]` persisted but not routed to Inbox); realtime socket `tenant:{tenantId}` + `problem:{publicId}` (mirrors incidents) for collaborative RCA.
- Board/lane view alternative for problems (group by status) — deferred; list table is Phase 1.
- Permanent fix automation: auto-transition `fix_in_progress → closed` when all linked Changes reach `closed_successful`.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/problems/*` + `docs/pages/problems.md`):

1. **Severity stripe** `border-l-[3px]` table row + pinned detail `w-1 self-stretch` with `SEVERITY_STRIPE` P1 `#B42318` P2/3 `#DC6803` P4 `#027A48` (`ProblemList.tsx:40-45`, `ProblemDetail.tsx:36-38`) — jangan ganti ke gradient.
2. **Stats pills** `px-3 py-1 rounded-full text-xs font-semibold border` active `bg-ois-primary #1F4FD4 text-white border-ois-primary`, inactive `bg-white border-ois-border hover:bg-ois-surface-muted`, active known color uses `problemStatusMeta[s].color` (`ProblemList.tsx:285-309`).
3. **Filter bar inputs** `h-9 border border-ois-border rounded-lg bg-white text-ois-text` + focus `ring-ois-primary/20 border-ois-primary` + `Search 14px text-ois-text-subtle` left, `X 13px` clear right — OIS light, bukan terra `linear-card` dark.
4. **Table header** `border-b border-ois-border bg-ois-surface-muted/50 text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` (`ProblemList.tsx:381`), row hover `hover:bg-ois-surface-muted/30` + `⋯ MoreVertical 15px opacity-0 group-hover:opacity-100` (`ProblemList.tsx:440,531`).
5. **Source chip** `ProblemSourceChip` `inline-flex gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ois-surface-muted border border-ois-border text-ois-text-muted` with icon `Activity/Siren/Lightbulb/ShieldCheck/User` (`ProblemSourceChip.tsx:24-27`).
6. **Status display** — list uses `StatusRing` with `PROBLEM_STATUS_TO_RING` map, detail sidebar uses `ProblemStatusPill` `rounded-full text-xs bg→problemStatusMeta.bg dot→problemStatusMeta.dot` (`ProblemStatusPill.tsx:15-16`); jangan reintroduce `incidentStatus` pill ke list.
7. **ID cells** `IDCell font-mono text-[12px] tabular-nums text-ois-text-muted` (`src/components/ui/IDCell.tsx:14`) — `PRB-YYYY-#####` / `KE-PRB-...` konsisten.
8. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] uppercase tracking-widest` (`ProblemDetail.tsx:51-60`); dipakai At a glance / Related / Permanent fix / Fix Plan blocks.
9. **Detail pinned header** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` with nav row + stripe + title `text-xl font-bold` + tags `rounded-full bg-ois-surface-muted border-ois-border` + meta `text-xs text-ois-text-muted` (`ProblemDetail.tsx:528-583`) — mirip `IncidentDetail` 3-column.
10. **Tab bar** `py-4 px-1 border-b-2 whitespace-nowrap text-sm font-medium` active `border-ois-primary text-ois-primary font-bold`, else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` (`ProblemDetail.tsx:670-678`).
11. **KnownErrorCard** `rounded-xl border-2` effectiveness-driven (`full #ECFDF3 #ABEFC6 → CheckCircle2 #067647`, `partial #FFFAEB #FEDF89 → AlertTriangle #DC6803`, `none #FEF3F2 #FECDCA → XCircle #B42318`) with header `ShieldAlert + Known Error · Published … + badge rounded-full border bg-white` (`KnownErrorCard.tsx:28-31,50-55`).
12. **KEDB hero** `bg-white border-ois-border rounded-xl p-5 shadow-ois-card` + input `h-12 pl-11 pr-4 text-base rounded-xl border-ois-border` + hot pills `rounded-full bg-ois-surface-muted border-ois-border hover:border-ois-primary hover:text-ois-primary` (`KEDB.tsx:84-113`).
13. **RCA editors** Five Whys rail `border-l-2 border-ois-primary/20` + numbered `bg-ois-primary text-white w-6 h-6 rounded-full text-[10px]` (`RCAWorkspace.tsx:48-53`); Fishbone `grid-cols-2 gap-4` categories `border rounded-lg` + header `bg-ois-surface-muted/50`; `StringList` numbered `bg-ois-surface-muted border rounded-full w-5 h-5`; Recommended actions table `border rounded-lg overflow-hidden` type colors.
14. **Quick actions** `space-y-1.5` with one `primary bg-ois-primary text-white hover:bg-ois-primary-hover` max, others `border border-ois-border text-ois-text hover:bg-ois-surface-muted`, close action in `pt-1 border-t border-ois-border` (`ProblemDetail.tsx:906-931`).
15. **Tokens exclusively ois-***: `bg-ois-primary #1F4FD4`, `bg-ois-primary-hover #1A42B5`, `bg-ois-primary-pale #EEF2FF`, `bg-ois-surface #FFFFFF`, `bg-ois-surface-muted #F1F3F7`, `border-ois-border #E4E7EC`, `text-ois-text #101828`, `text-ois-text-muted #475467`, `text-ois-text-subtle #98A2B3`, `shadow-ois-card`, `rounded-ois-card 8px` (`src/index.css:7-58`) — no `terra-*`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Notes |
|------|----------|-------|
| `problemsService.list()` | `GET /api/v1/problems?page&pageSize` | `requirePermission('problem.read')` · `scoped(req).problems.list(pagination)` (`server/routes/itsm.ts:30-32`) |
| `problemsService.get(publicId)` | `GET /api/v1/problems/:publicId` | `requirePermission('problem.read')` · `required(...,'Problem')` 404 (`server/routes/itsm.ts:34-36`) |
| `incidentsService.list()` | `GET /api/v1/incidents` | Used inside `RelatedIncidentsTab` / `PatternSummaryCard` / `LinkIncidentsModal` to resolve `relatedIncidentIds` |
| `changesService.list()` | `GET /api/v1/changes` | `getChangeById` for Permanent fix + Fix Plan linked changes (`ProblemDetail.tsx:457`) |
| `knowledgeService.articles()` | `GET /api/v1/kb/articles` | `getArticleById` for linked KB (`ProblemDetail.tsx:461`) |
| `servicesService.list()` | via `cmdbService` | `affectedServiceIds → name` resolution |
| `usersService.list()` | via `platformServices` | `ownerId → Avatar/name`, RCA author, recommended action owner picker |
| `improvementsService.list()` | `GET /api/v1/improvements` | `linkedProblemPublicId === problem.publicId` for Fix Plan improvement links |

Mutations currently client-only — write endpoints `POST/PATCH /problems`, `/problems/:id/rca`, `/problems/:id/known-error`, `/problems/:id/linked-incidents` planned M7 (audit `scopeMode`, `getActor`). Socket: future `tenant:{tenantId}` + `problem:{publicId}` (mirrors `src/services/realtime.ts` incidents pattern). AppShell scoping via `AppShell` + `withScopedDb` (`server/middleware/scopedDb.ts:19`), global `requireAuth` (`server/app.ts:126`).

## Open Items

- [ ] **CRUD P0 — wire `POST /problems`** — add `src/shared/schemas/problem.ts` (`createProblemSchema`), `problemsRepo.create` (`prisma.problem count→PRB-YYYY-NNNNN` `docs.ts:71` pattern), `ProblemsScope.create` `canWriteApp/ScopeViolationError`, `POST /problems` `requirePermission('problem.create')` + audit — remove `extraProblems` `ProblemList.tsx:144,188`.
- [ ] **CRUD P0 — wire `PATCH /problems/:publicId/status` + close** — `StatusDropdown 392` + `CloseProblemModal 333` → `problemsService.setStatus` + Zod `problemStatus enum` + repo `closedAt` stamp + audit — was 🔴 stub.
- [ ] **CRUD P0 — wire Known Error + RCA + links** — `POST /promote-known-error` (remove hardcode `u-001` `ProblemDetail 497`/`RCA 374` → `getActor`), `POST /rca` `fault_tree/timeline` real editors (replace `PlaceholderEditor 192`), `POST /linked-incidents/changes` — currently local arrays `951,971`.
- [ ] Formalize write endpoints in `server/routes/itsm.ts` and `server/scope/scopedDb.ts` problems repo (`create/status/promote/link`) + `audit` + `ScopeViolationError` → 403 — remove `extraProblems` local state.
- [ ] Verify `problemsService.list()` pagination default `pageSize` vs client showing all filtered — add server filter `?status=&source=&owner=` if needed.
- [ ] Implement `fault_tree` + `timeline` real editors (canvas + draggable); define `timelineEntries` persistence (`src/types/problem.ts:39-43` already typed).
- [ ] RCA collaboration: persist `rca.summary` draft vs published versioning; wire `mentions[]` → Inbox `mention` + socket.
- [ ] `RCAWorkspace.tsx:374` hardcodes `authorId u-001 / authorName Sarah Chen` — must be `getActor` / `useCurrentUser`.
- [ ] KEDB `Apply workaround` should `POST /incidents/:id/workaround` audit trail, not just navigate.
- [ ] Close guard: only allow `closed` if `known_error` or `fix_in_progress` with linked change `closed_successful`? Spec intentionally permissive — needs product decision.
- [ ] Replace pagination dead FE→BE `itsmServices.ts:13 list()` → `apiFetch('/problems',{query:{page,pageSize}})` + pager UI.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/problems.md` + `src/routes/problems/*` + `src/types/problem.ts` + `server/routes/itsm.ts` ke template features (list/detail/rca/kedb + lifecycle + permissions + ois tokens) | — |
| 2026-08-28 | CRUD audit ITSM core — add wiring matrix C 🔴/R 🟡/U 🔴/D 🔴 + Stub/Partial with file:line (Create/RCA/links local, Pagination dead) — full evidence in `docs/audits/crud-audit.md` | — |
