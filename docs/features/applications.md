# Applications — Application Catalog & Membership

Status: **Draft**
Route: `/applications/catalog` (public catalog), `/admin/applications` (admin list), `/admin/applications/:appId` (membership detail)
Sidebar: Platform · Applications (public catalog — no `system.admin` gate) + RBAC Administration · Applications (admin CRUD + Teams)
Source: `src/routes/admin/ApplicationCatalog.tsx:1-181`, `src/routes/admin/Applications.tsx:1-168`, `src/routes/admin/ApplicationDetail.tsx:1-289` · `src/routes/index.tsx:90-101,230-243` · `src/types/rbac.ts:49-55` · `server/routes/applications.ts:1-20` · `server/routes/admin/applicationMembership.ts:1-92` · `server/repositories/applicationMembership.ts:1-157` · `server/middleware/appManager.ts:1-25` · `server/scope/context.ts:1-49` · `src/services/adminService.ts:63-105` · `src/lib/rbac/CurrentUserContext.tsx` · `prisma/schema.prisma:178-211`

---

## Intent

Satu tempat untuk **browse semua aplikasi tenant** (public) dan **kelola kepemilikan tim** per aplikasi — OWNER / CONTRIBUTOR / VIEWER — yang kemudian menggerakkan scope `team_app` di seluruh OIS. Catalog harus jawab dalam <10 detik: "Aplikasi ini ada, siapa owner, apakah saya member, dan siapa harus dihubungi?" Admin/Membership detail menutup loop: tambah tim, ganti role, atau keluarkan tim dengan guard `last_owner`.

ITIL 4: Service Configuration & Identity — Application adalah **scope boundary** (`applicationId` / `primaryApplicationId` di semua modul) dan **ownership boundary** (`ApplicationTeamRole`); semua filter incident/change/monitoring mewarisi membership ini.

## Current State (snapshot `src/routes/index.tsx:90-101,230,238-239`)

- `src/routes/index.tsx:101` → `import { ApplicationCatalog } from './admin/ApplicationCatalog'`
- `src/routes/index.tsx:230` → `{ path: 'applications/catalog', element: <ApplicationCatalog /> }` — **outside `admin`**, inside `AppShell` (no `system.admin` gate)
- `src/routes/index.tsx:238` → `{ path: 'applications', element: <AdminApplications /> }` at `/admin/applications`
- `src/routes/index.tsx:239` → `{ path: 'applications/:appId', element: <ApplicationDetail /> }` at `/admin/applications/:appId`
- Guard order: `RequireAuth` (`:109`) → `RequirePasswordChange` (`:112`) → `AppShell` (`:116`) → `AdminLayout` (`system.admin` gate) — catalog bypasses `AdminLayout`, admin pair does not
- Components: `ApplicationCatalog` 181 lines (search + Filter pills + card grid + 4 empty/loading branches), `Applications` 168 lines (APS-filtered `EntityToolbar + Table + AppForm Modal`), `ApplicationDetail` 289 lines (header card + Teams panel `Table` + `AddTeamModal` + `last_owner` inline errors)
- Types: `Application {id, code, name, ownerTeamId, description?}` (`src/types/rbac.ts:49-55`) + runtime-extended `criticality?: string | null` (`prisma/schema.prisma:183`) → `CatalogAppDto {id, code, name, criticality, ownerTeamIds, isMember, myRole}` (`src/services/adminService.ts:93-101`)
- API: `applicationsRouter` (`server/routes/applications.ts:8-20`) mounts `GET /catalog` before catch-all sub-router; sub-router `applicationMembershipRouter` (`server/routes/admin/applicationMembership.ts:1-92`) exposes `GET /manageable`, `GET /:appId/teams`, `POST /:appId/teams`, `PATCH /:appId/teams/:teamId`, `DELETE /:appId/teams/:teamId`
- Scope: `resolveScopeContext({userId, tenantId})` (`server/scope/context.ts:21-48`) loads `ApplicationTeam` by caller's `teamId` + `UserFunctionalRole` codes → `ScopeContext {appMemberships, functionalRoles}` → `listCatalog` computes `roleByApp` by strongest `ROLE_RANK OWNER 3 > CONTRIBUTOR 2 > VIEWER 1` (`server/repositories/applicationMembership.ts:117-156`)
- Services: `applicationCatalogApi.list()` → `GET /applications/catalog`, `applicationMembershipApi {list, add, changeRole, remove, manageable}` → `/applications/:appId/teams*`, `rbacService {upsertApplication, deleteApplication}` → `PUT /admin/rbac/applications/:id` (`src/services/adminService.ts:63-105`)
- Prisma: `Application {id, tenantId, code, name, criticality?}`, `ApplicationTeam {applicationId, teamId, role OWNER|CONTRIBUTOR|VIEWER, addedById, addedAt}` composite PK + `@@index([teamId]) @@index([applicationId, role])` (`prisma/schema.prisma:178-211`)

**Working:**

- `ApplicationCatalog` header `h1 text-2xl font-bold text-ois-text` + `p text-sm text-ois-text-muted` `Browse all applications in this tenant. Contact an Application Owner to request access.` (`ApplicationCatalog.tsx:51-55`)
- Toolbar `flex flex-col sm:flex-row gap-3 mb-6`: search `relative flex-1 max-w-sm` `Search 16 left-3 text-ois-text-subtle + input h-9 pl-9 pr-3 bg-ois-surface-muted rounded-ois-btn border-ois-border focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/20 text-sm transition-all` placeholder `Search by name or code…` (`ApplicationCatalog.tsx:60-69`) + filter pills `flex gap-2` 3 `button px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface-muted text-ois-text-muted border-ois-border hover:bg-ois-border` (`ApplicationCatalog.tsx:72-87`) labels `All | Member | Not a member`
- Filtering `filtered = apps.filter(matchesSearch && matchesFilter)` — `matchesSearch` `name|code toLowerCase includes(search)` + `matchesFilter all|member/not-member via app.isMember` (`ApplicationCatalog.tsx:37-46`); `teamName(id)` helper `teams.find(id)?.name ?? id` from `useResource(() => teamsService.list(), [])` (`ApplicationCatalog.tsx:24,34-35,152-153`)
- States 4 (`ApplicationCatalog.tsx:92-110`): `loading → text-sm ois-text-muted py-12 Loading…`, `error → text-sm ois-danger py-12`, `apps.length===0 → No applications found in this tenant.`, `apps.length>0 && filtered.length===0 → No applications match your search or filter.` — each `py-12 text-center`
- Card grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` (`ApplicationCatalog.tsx:114`): card `bg-white border border-ois-border rounded-ois-card p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow` (`ApplicationCatalog.tsx:118`) — top row `flex justify-between gap-2` code pill `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ois-primary-pale text-ois-primary border border-ois-primary/20 mb-1.5` + name `text-sm font-semibold text-ois-text leading-tight truncate title` (`ApplicationCatalog.tsx:121-127`); `criticality` pill `inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize` colors `critical bg-red-100 text-red-700 border-red-200 | high bg-orange-100 text-orange-700 border-orange-200 | medium bg-yellow-100 text-yellow-700 border-yellow-200 | low bg-green-100 text-green-700 border-green-200` fallback `bg-gray-100 text-gray-600 border-gray-200` via `CRITICALITY_COLOR` (`ApplicationCatalog.tsx:10-15,133-144`); owner teams block if `ownerTeamIds.length>0` label `text-[10px] font-semibold uppercase tracking-wide text-ois-text-subtle mb-1 Owner teams` + `flex flex-wrap gap-1` each `span px-2 py-0.5 rounded-full bg-ois-surface-muted text-[11px] text-ois-text-muted border border-ois-border` (`ApplicationCatalog.tsx:147-158`); membership pill `mt-auto pt-1` `inline-flex gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border` `isMember bg-green-50 text-green-700 border-green-200 + dot w-1.5 h-1.5 rounded-full bg-green-500` vs `bg-gray-50 text-gray-500 border-gray-200 + bg-gray-400` label `You're a member | Not a member` (`ApplicationCatalog.tsx:161-173`); TODO comment `Contact owners mailto` reserved (`ApplicationCatalog.tsx:157`)
- `Applications` admin list (`src/routes/admin/Applications.tsx:14-102`): `bg-white border border-ois-border rounded-xl p-5` + `EntityToolbar title Applications count={filtered.length} search/onSearchChange onCreate createLabel "New Application"` (`:55-61`); filter `applications.filter(name|code includes q)` (`:27-30`); APS scoping `apsDivision = divisions.find(code==='APS') → apsDeptIds → apsTeams` (`:23-25`); columns `Code Badge info | Name font-medium | Owner Team teamName(ownerTeamId) | Department deptOfTeam(ownerTeamId) | actions w-20 flex gap-1 justify-end` `Link Manage → /admin/applications/:id Button sm ghost` + `Pencil 14` → edit + `Trash2 14 text-ois-danger` → delete (`:63-88`); `handleDelete` confirm + `rbacService.deleteApplication + removeApplication` catch `alert` (`:44-52`)
- `AppForm:Modal` (`Applications.tsx:104-167`) `isOpen title Edit/New` `space-y-3 py-4` error `border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs danger` + `Input Code toUpperCase + Input Name + select Owner Team (APS only) h-9 w-full rounded-ois-btn border-ois-border-strong bg-white px-3 text-sm maps apsTeams` + `textarea Description rows 3 rounded-ois-btn border-ois-border-strong bg-white` + footer `Cancel ghost | Save loading` builds `id app-${Date.now()} code trimmed upper name trimmed description || undefined` (`:109-167`)
- `ApplicationDetail` (`ApplicationDetail.tsx:25-289`): `space-y-4` header card `bg-white border rounded-xl p-5` `Link ← Applications ArrowLeft 14 text-xs muted hover:text` + title row `flex gap-3 Badge info code + h1 text-lg bold name + Badge default criticality (cast)` + `description text-sm muted mt-2` (`:88-109`); not-found `bg-white border rounded-xl p-8 text-center text-sm muted Application not found. Back to list link ois-primary underline` (`:78-85`); Teams panel `bg-white border rounded-xl p-5 space-y-3` header `flex justify-between text-sm semibold Teams + RefreshCw 14 animate-spin when loading sm ghost + Plus 14 Add team sm` (`:112-123`); error banner `border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs danger` (`:125-129`); loading `Loading… center` vs empty `No teams assigned yet.` (`:131-135`); table `overflow-x-auto Table THead Code Name Owner Team Dept` rows `Team font-medium team?.name ?? teamId | Role Badge danger OWNER/info CONTRIBUTOR/default VIEWER via roleBadgeVariant | Added by users.find(addedById)?.name ?? id ?? — xs muted | Added at fmtDate en-GB dd MMM yyyy xs muted | actions w-48 flex gap-2 justify-end flex-wrap` inline error `text-xs danger bg-danger/5 border-danger/30 rounded px-2 py-0.5` + `select h-7 rounded-ois-btn border px-2 text-xs value role ROLES OWNER/CONTRIBUTOR/VIEWER disabled isSaving onChange handleRoleChange` + `Button sm outline danger Remove loading saving===teamId+':remove'` (`:136-194`); handlers `fetchMembers useCallback applicationMembershipApi.list(appId) → useResource<MembershipDto[]>`, `memberTeamIds Set`, `handleRoleChange/changeRole + handleRemove/remove` each `setSaving + setRowError + try api then refresh catch ApiError body.error last_owner → Cannot demote last owner / Cannot remove last owner else Failed… finally setSaving null` (`:31-76`); `AddTeamModal:Modal isOpen title Add Team size sm` (`:244`) `space-y-3 py-4` error `already_member → Team is already a member.` + `label Search team input h-9 Search Filter teams…` + `label Team select h-9 filtered available = allTeams.filter(!memberTeamIds) name includes search` + `label Role select ROLES default CONTRIBUTOR` + footer `Cancel ghost | Add disabled !teamId||empty loading` calls `applicationMembershipApi.add + onAdded refresh + onClose` (`:210-288`)
- Server `applicationsRouter` (`server/routes/applications.ts:8-20`) `use(requireAuth)` + `GET /catalog → resolveScopeContext({userId, tenantId}) → listCatalog(tenantId, ctx.appMemberships) → json` **mounted before** `use('/', applicationMembershipRouter)` so `/:appId` doesn't shadow `/catalog` (`:12-17` comment)
- Repo `listCatalog` (`server/repositories/applicationMembership.ts:123-157`) loads `apps tenantId orderBy name asc` + `ownerships applicationTeam role OWNER` grouped `ownerTeamsByApp Map` + `roleByApp Map strongest ROLE_RANK` from `userMemberships` → maps each to `{id, code, name, criticality, ownerTeamIds, isMember: has, myRole: get ?? null}`; `listManageableApps` (`:110-115`) `isPlatformAdmin ? findMany tenantId : where id in ownerAppIds`; `addTeamToApp` verifies `app+team belong to tenant` + `tx findUnique already_member →409` + `create`; `changeTeamRole/removeTeamFromApp` each `tx Serializable` + guard `existing.role===OWNER && (demote||delete) && ownerCount<=1 → throw last_owner` (`:64-107`)
- `applicationMembershipRouter` (`server/routes/admin/applicationMembership.ts:1-92`): `MembershipError → status 404 app_not_found|team_not_found|not_member else 409 already_member|last_owner` (`:16-24`); `GET /manageable → ownerAppIds = ctx.appMemberships.filter OWNER + isPlatformAdmin has system.admin OR functional PLATFORM_ADMIN → listManageableApps` (`:28-34`); `GET /:appId/teams → findFirst tenantId 404 else listTeamsForApp orderBy role asc addedAt asc` (`:36-40`); `POST /:appId/teams use requireAppManager → addBody {teamId, role enum} → addTeamToApp + audit add scopeMode actorKind 201` (`:43-58`); `PATCH /:appId/teams/:teamId → changeTeamRole + audit change_role` (`:61-76`); `DELETE /:appId/teams/:teamId → removeTeamFromApp + audit remove 204` (`:78-91`)
- `requireAppManager` (`server/middleware/appManager.ts:1-25`): `permissions has system.admin → admin` else `ctx.functionalRoles includes PLATFORM_ADMIN → admin` else `ctx.appMemberships.some(appId && OWNER) → owner` else `throw 403 Application Owner or PlatformAdmin required`; returns `AppManagerKind admin|owner` stamped `scopeMode` in audit
- `resolveScopeContext` (`server/scope/context.ts:1-49`) single `user.teamId` → `applicationTeam where teamId` + `userFunctionalRole where code in FUNCTIONAL_ROLE_CODES` (single queries)
- `CurrentUserContext` (`src/lib/rbac/CurrentUserContext.tsx:51-111`) mounts `Promise.allSettled` 8 cats `rbacService.users/divisions/departments/teams/applications/roles + requestsService.catalog + releasesService.list` → `setApplications` + `registerRbacOrgTree`; re-registers on state diverge; `Applications` page reads `applications` from this context (not direct `applicationCatalogApi` — catalog is separate live DTO)
- Tokens: strictly `ois-bg #F7F8FA, ois-surface #FFFFFF, ois-surface-muted #F1F3F7, ois-border #E4E7EC, ois-border-strong #D0D5DD, ois-primary #1F4FD4 / hover #1A42B5 / pale #EEF2FF, ois-text #101828 / muted #475467 / subtle #98A2B3, ois-success #12B76A / pale #ECFDF3, ois-danger #F04438 / pale #FEF3F2, ois-warning #F79009, ois-info #0BA5EC` (`src/index.css:7-38`) plus ad-hoc `CRITICALITY_COLOR red/orange/yellow/green 100/700/200` for tier chip + green/gray member pill — no other hex outside chip

**Stub / Partial:**

- `ApplicationCatalog` owner teams rendered as `teamName(tid)` inline spans; `Contact owners mailto` placeholder TODO with no primary email concept (`ApplicationCatalog.tsx:157`) — no CTA to request access, no `mailto:` or `Add to team` flow
- `ApplicationCatalog` reads `teamsService.list()` via `useResource(..., [])` (no tenant/app scoping) while catalog API already tenant-scoped — slight over-fetch; `isMember/myRole` derived server-side but `ownerTeamIds` still need client `teams` lookup for names
- No skeleton/shimmer for catalog loading — plain `Loading applications…` text (`ApplicationCatalog.tsx:93`); same for admin list `EntityToolbar` instant `[]` → no shimmer parity with `cmdb.md` `Skeleton` or `monitoring.md` `SkeletonCard`
- `Applications` (admin) CRUD is via `rbacService.upsertApplication/deleteApplication → PUT/DELETE /admin/rbac/applications/:id` (`src/services/platformServices.ts`) backed by `src/types/rbac.ts` `ownerTeamId` (single owner legacy) — diverges from new `ApplicationTeam OWNER` multi-owner model consumed by catalog/detail; criticality edited nowhere in `AppForm` (only displayed in catalog/detail header badge) — gap vs `prisma Application.criticality String?`
- `ApplicationDetail` `applications.find(a=>a.id===appId)` comes from `CurrentUserContext` (`ApplicationDetail.tsx:29`) — stale until refresh after admin upsert; not re-fetched via `GET /applications/:appId` (no such endpoint)
- Search is client-side `name|code includes` only; no `description/criticality` or `ownerTeam name` match; no URL persist `?q=&filter=` — refresh loses filter, not shareable (vs `incidents.md` `?q=&status=&priority=` or `portal.md` `?q=`)
- Sort none — catalog order is server `orderBy name asc` (`applicationMembership.ts:127`); no `Most popular / Recently added / Criticality` sort like `portal.md SortDropdown` or `releases.md` type filter
- Pagination none — `GET /applications/catalog` returns all `apps` for tenant (`findMany` unbounded); acceptable for `<1000` but no `parsePagination` like `itsm.ts /releases`/`/incidents`
- Realtime none — no `tenant:{tenantId}` Socket.IO refresh for `ApplicationTeam` mutations; detail `RefreshCw` manual only (`ApplicationDetail.tsx:116`), catalog no refresh button at all
- Empty-state richness gap vs portal/km — catalog empties are single-line text (`ApplicationCatalog.tsx:100-110`) not `py-24 w-14 h-14 SearchX + bold + hint + CTA` pattern used elsewhere

**Missing (vs deep exemplar bar + `docs/pages/admin.md` gaps):**

- Access-request flow: in-card `Request access` CTA → create `ServiceRequest` / `Incident` / access ticket with `applicationId` pre-filled, approval by `OWNER` team or `PLATFORM_ADMIN` — currently manual "Contact an Owner"
- Direct `GET /applications/:appId` / `GET /applications/:code` read endpoint for detail header (avoids context staleness) + `GET /applications/:appId/scope` for caller's computed `myRole`/scopes
- Sorting + type/criticality filter (chip row `Critical | High | Medium | Low`) + server-side `?q=&criticality=&sort=name|criticality` to mirror `portal.md` category strip
- URL-persist `?q=&filter=` + pagination `?page=&pageSize=` with footer `Showing X of N` (shared `_shared/filter-sort-export.md`)
- Shimmer skeleton grid `4×2 pulsing rounded-ois-card` while `applicationCatalogApi.list()` pending (preserve `_shared/list.md` parity)
- `Contact owners` action: resolve primary owner email (team → `users.filter(teamId)`) + `mailto:` or in-app message thread; audit `scopeMode` already correct
- Export CSV `Export applications` via `_shared/filter-sort-export.md` for compliance inventories
- Realtime `application_team:updated` socket → `tenant:{tenantId}` invalidate catalog/detail (see `measurement.md` / `monitoring.md` socket wiring)
- Bulk operations not needed (membership per-team); but `Applications` admin multi-delete or `DataQuality` bulk-assign style bar out of scope

## Primary View — Application Catalog (`/applications/catalog`)

Layout: **header + toolbar + states + card grid**. `p-6 max-w-7xl mx-auto` inside `AppShell` `main flex-1 overflow-y-auto p-6` (`AppShell.tsx:79`). No `Module Layout` tabs, no accent bar — chrome is plain section.

### Header

```
Application Catalog  text-2xl font-bold text-ois-text
Browse all applications… text-sm text-ois-text-muted mt-1
```

`div.mb-6` (`ApplicationCatalog.tsx:51-56`). Public subtitle explicitly says `Contact an Application Owner to request access.` — anchors the manual workflow gap.

### Toolbar

```
[Search Search 16 h-9 max-w-sm bg-ois-surface-muted → focus:bg-white]  [All | Member | Not a member pills]
```

- Search `relative flex-1 max-w-sm` (`ApplicationCatalog.tsx:61`) — `Search 16 absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none` + `input w-full h-9 pl-9 pr-3 bg-ois-surface-muted rounded-ois-btn border border-ois-border focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/20 text-sm transition-all` (`ApplicationCatalog.tsx:62-68`); value `search useState('')` `onChange setSearch` — no debounce, no URL sync
- Filter pills `flex gap-2` (`ApplicationCatalog.tsx:73`) — `(['all','member','not-member'] as Filter[]).map` `button px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface-muted text-ois-text-muted border-ois-border hover:bg-ois-border` (`ApplicationCatalog.tsx:78-82`) — semantics: `All` = all tenant apps; `Member` `app.isMember` caller shares at least one `ApplicationTeam` membership via own `teamId`; `Not a member` complement — both computed server-side `roleByApp.has(id)` (`applicationMembership.ts:154`)

### Card Grid

```
grid 1 | sm:2 | lg:3 | xl:4 gap-4   (ApplicationCatalog.tsx:114)
┌─ card bg-white border-ois-border rounded-ois-card p-4 flex-col gap-3 hover:shadow-md ─┐
│ code pill bg-ois-primary-pale text-ois-primary border-ois-primary/20  name truncate  │
│ criticality pill (red/orange/yellow/green) capitalize — rendered only if non-null     │
│ Owner teams label uppercase 10px subtle + flex-wrap team pills muted                  │
│ ── membership pill ml-auto pt-1 dot green/gray You're a member / Not a member        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Card shell `bg-white border border-ois-border rounded-ois-card p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow` (`ApplicationCatalog.tsx:118`)
- Code pill `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ois-primary-pale text-ois-primary border border-ois-primary/20 mb-1.5` (`ApplicationCatalog.tsx:123`) — `app.code` is `@@unique([tenantId, code])`
- Name `p text-sm font-semibold text-ois-text leading-tight truncate title={name}` (`ApplicationCatalog.tsx:126`)
- Criticality `span inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize` via `CRITICALITY_COLOR[lower]` or `bg-gray-100 text-gray-600 border-gray-200` fallback (`ApplicationCatalog.tsx:135-142`) — `criticality String?` from `Application.criticality`, not in `src/types/rbac.ts` shape (runtime cast)
- Owner teams `ownerTeamIds.length>0` section (`ApplicationCatalog.tsx:147-158`) — label `text-[10px] font-semibold uppercase tracking-wide text-ois-text-subtle mb-1` + `flex flex-wrap gap-1` each `px-2 py-0.5 rounded-full bg-ois-surface-muted text-[11px] text-ois-text-muted border border-ois-border` showing `teamName(tid)` resolver; TODO `Contact owners mailto button once we have clean team → primary user email concept` intentionally skipped
- Membership `mt-auto pt-1` `span inline-flex gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border` green vs gray with `w-1.5 h-1.5 rounded-full bg-green-500/gray-400` dot (`ApplicationCatalog.tsx:162-173`); `isMember = roleByApp.has(app.id)` and `myRole = roleByApp.get(app.id) ?? null` strongest `ROLE_RANK` (`applicationMembership.ts:140-155`) — `Member` means caller's `teamId` holds any `OWNER|CONTRIBUTOR|VIEWER` for that app; no per-card `myRole` badge today (parity gap vs `incidents.md` role chip)

### States

```
loading     →  text-sm ois-text-muted py-12 Loading applications…
error       →  text-sm ois-danger py-12 {message}
empty total →  text-sm ois-text-muted py-12 No applications found in this tenant.
empty filter→  text-sm ois-text-muted py-12 No applications match your search or filter.
```

All `text-center` with `!loading && !error` guards (`ApplicationCatalog.tsx:92-110`). Loading is text only — preserves no shimmer contract (gap noted Phase 2).

## Admin Views (cross-ref [`admin.md`](./admin.md) — summarized for scope context)

### Applications List (`/admin/applications`)

`bg-white border rounded-xl p-5` (`Applications.tsx:55`) → `EntityToolbar` count+search+`New Application` → `Table Code Badge info | Name medium | Owner Team | Department | actions Manage/Pencil/Trash2`. APS-only team selector in `AppForm` (`apsTeams` derived `divisions.find STA/IFM/APS/USER_BUSINESS` filtering). CRUD via `rbacService.upsertApplication/deleteApplication` (legacy `ownerTeamId` single-owner shape) not yet migrated to `criticality`/multi-owner form.

See `admin.md` §Applications for full modal/table spec; catalog and membership flows below are the scope-relevant successors.

### Membership Detail (`/admin/applications/:appId`)

Membership is the only feature that mutates `ApplicationTeam` — detail lives under admin but is gated by `requireAppManager` (not pure `system.admin`).

```
← Applications  ArrowLeft 14
Badge code | h1 name | Badge criticality?  + description
┌ Teams ─────────────────────────────────────────────────────────┐
│ header text-sm semibold Teams  RefreshCw  + Add team          │
│ error banner danger  ·  Loading…  ·  No teams assigned yet.  │
│ Table Team | Role Badge | Added by xs muted | Added at en-GB │
│   row: select h-7 OWNER/CONTRIBUTOR/VIEWER  Remove danger    │
│   inline error pill Cannot demote last owner / already_member │
│ AddTeamModal: Search team + Team select filtered + Role select│
└────────────────────────────────────────────────────────────────┘
```

- Header `bg-white border rounded-xl p-5` with back link `ArrowLeft 14` (`ApplicationDetail.tsx:90-108`); not-found `p-8 center Application not found. Back to list` (`:78-85`)
- Teams panel `bg-white border rounded-xl p-5 space-y-3` (`:112-195`); `Button sm ghost RefreshCw animate-spin when loading` + `Plus Add team`; `select h-7 rounded-ois-btn border px-2 text-xs disabled:opacity-50` + `Remove outline danger border-ois-danger/40 hover:bg-ois-danger/5` + inline `rowError` pill `bg-ois-danger/5 border-ois-danger/30 rounded px-2 py-0.5 text-xs` (`:163-166`)
- `AddTeamModal:Modal size sm title Add Team` (`:245`) with `available = allTeams.filter(!memberTeamIds)` + `filtered by search name includes` + team `select h-9` + role `select ROLES default CONTRIBUTOR` (`:216-282`)

## Actions

| Action | Trigger | Permission | State / Guard |
|--------|---------|------------|---------------|
| View catalog | Navigate `/applications/catalog` (Sidebar: not pinned — type URL or admin link) | All authenticated (`requireAuth` only, no `system.admin`) — `GET /applications/catalog` tenant-scoped | — |
| Search catalog | Input `onChange setSearch` | all auth | `name\|code` lower includes (`ApplicationCatalog.tsx:38-40`) |
| Filter membership | Pills `All\|Member\|Not a member` `onClick setFilter` | all auth | `isMember` from `roleByApp.has(app.id)` via `ctx.appMemberships` (`applicationMembership.ts:154`) |
| View admin list | `/admin/applications` via AdminLayout | `system.admin` (`adminRouter.use('/admin', requirePermission('system.admin'))` `server/routes/admin.ts:32`) | `applications` from `CurrentUserContext` |
| Create application | `Applications EntityToolbar New Application → AppForm Save` | `system.admin` `PUT /admin/rbac/applications/:id` | `apsTeams` present; `code.toUpperCase + name.trim + ownerTeamId` required; id `app-${Date.now()}` if create |
| Edit application | `Applications Pencil 14 → AppForm` | `system.admin` | — |
| Delete application | `Applications Trash2 → confirm → deleteApplication` | `system.admin` `DELETE /admin/rbac/applications/:id` | confirm dialog; `alert` on error |
| Open membership | `Applications Manage → /admin/applications/:appId` | `system.admin` OR `OWNER`/`PLATFORM_ADMIN` can still read `GET /:appId/teams` (tenant check `findFirst`) but UI is inside admin shell gated `system.admin` | — |
| Add team | `ApplicationDetail + Add team → AddTeamModal Add` | `requireAppManager` (`system.admin` OR `PLATFORM_ADMIN` OR `OWNER` for that appId) `POST /applications/:appId/teams {teamId, role}` `roleSchema z.enum OWNER/CONTRIBUTOR/VIEWER` | Duplicate → `409 already_member` mapped `Team is already a member.` (`adminService.ts:238` body error) |
| Change team role | Row `select OWNER/CONTRIBUTOR/VIEWER onChange` | same | `last_owner` guard `Serializable tx count OWNER <=1 → 409 Cannot demote last owner` inline (`ApplicationDetail.tsx:51-54,164`) |
| Remove team | `Remove outline danger → confirm → DELETE` | same | `last_owner → 409 Cannot remove last owner` inline (`:69-71`); confirm `window.confirm` |
| Refresh membership | `RefreshCw sm ghost onClick refresh` | same | `useResource refresh` (`:35,116`) |
| Search team in modal | `AddTeamModal Search team input Filter teams…` | — | `available.filter(name includes search)` (`:224-225`) |

Delegate `_shared/list.md` (toolbar/grid contract), `_shared/entity-detail-page.md` (detail shell), `_shared/filter-sort-export.md` (search/filter), `_shared/app-selector.md` (application scope switcher — uses `manageable` & `catalog`).

## Filters / Sort / Search

### Catalog

- **Search:** `search useState('')` `input h-9 Search by name or code…` case-insensitive `name|code includes(lower)` (`ApplicationCatalog.tsx:38-40`); no `description/criticality/ownerTeam` search, no debounce, not URL-synced
- **Filter:** `filter Filter = 'all'|'member'|'not-member' useState('all')` (`:22`) pills same row as search (`:72-87`) — `member` `isMember===true` else `!isMember` (`:41-44`)
- **Sort:** none — server `orderBy name asc` (`applicationMembership.ts:127`) is the only order; client preserves insertion; gap vs `portal.md` `SortDropdown` `relevant/popular/fastest/newest`
- **Derived counts:** none displayed (unlike `portal.md` `N items available` or `incidents.md` tabs with counts) — filtered length implicit via grid count; future `N results for "q" in All` header (design preservation #10)
- **Criticality filter:** missing — no pill row `Critical | High | Medium | Low` (maps `CRITICALITY_COLOR`); would be `filter criticality String?` added server `?criticality=` or client `ownerTeamId` filter

### Admin Applications + Detail

- Admin list `filtered = applications.filter(name|code includes q)` (`Applications.tsx:27-30`) with `EntityToolbar count={filtered.length}`; no column sort, no pagination (like all `admin.md` tables — gap noted Open Items)
- Detail Teams panel no search/sort beyond `orderBy role asc addedAt asc` (`applicationMembership.ts:26`); `AddTeamModal` local `search Filter teams…` on `available = allTeams.filter(!memberTeamIds)` (`ApplicationDetail.tsx:217,224-225`)

All filters client-side `useState` not URL-persisted — catalog `?q=&filter=` and detail `?search=` both deferred to Phase 2 (`_shared/filter-sort-export.md` contract like `portal.md` `searchParams.get('q')`).

## State Lifecycle

```
Application itself: no lifecycle status — code/name/criticality/ownerTeamId are mutables
                    (no draft/published/archived unlike Requests/Changes)
                    delete is hard DELETE via /admin/rbac/applications/:id (admin.md)

Membership:  team —(ApplicationTeam role)— application   composite PK (applicationId, teamId)
            role enum  OWNER ─────────── CONTRIBUTOR ─────────── VIEWER
                      single value per (app, team) — changed via PATCH {role}
            guards (server Serializable tx, 409):
              already_member  on POST duplicate
              last_owner      on PATCH demote OWNER→non-OWNER when ownerCount<=1
              last_owner      on DELETE when target role OWNER && ownerCount<=1
              not_member      on PATCH/DELETE when no row
              app_not_found / team_not_found on tenant mismatch

Scope derivation (per-request, compute-only):
  user.teamId → ApplicationTeam[] (own team) → ScopeContext.appMemberships
              → listCatalog ROLE_RANK strongest per app → CatalogAppDto.isMember/myRole
              → scoped resolvers elsewhere gate incidents/changes/events by applicationId

Hierarchy ownership legacy:
  Application.ownerTeamId (single, APS-only in AppForm) co-exists with ApplicationTeam
  multi-owner set; catalog renders ownerTeamIds from ApplicationTeam OWNER rows (authoritative),
  admin list still shows single ownerTeamId column (needs migration to multi-owner badge)
```

No status transition API; hierarchy edits are immediate `PUT → upsert → audit` (see `admin.md` lifecycle). Membership mutations are atomic transactions with audit `scopeMode admin|owner`.

## Permissions (action-level)

| Capability | `system.admin` (RBAC Admin gate) | App `OWNER` / `PLATFORM_ADMIN` (`requireAppManager`) | Authenticated (no admin, any team) |
|------------|----------------------------------|------------------------------------------------------|------------------------------------|
| `GET /applications/catalog` | ✅ `CatalogAppDto[]` with `isMember/myRole` | ✅ same — via `resolveScopeContext` + `listCatalog` | ✅ same — all authenticated, no `system.admin` needed (`applicationsRouter.use(requireAuth)` only) |
| `GET /applications/manageable` | ✅ all tenant apps (`listManageableApps isPlatformAdmin true`) | ✅ only `ownerAppIds` where `role===OWNER` else `PLATFORM_ADMIN` returns all (`applicationMembership.ts:30-32`) | ❌ 403 unless owner/admin |
| `GET /applications/:appId/teams` | ✅ tenant check `findFirst` then `listTeamsForApp` | ✅ same (read path not `requireAppManager` but tenant-scoped) — UI still gated by admin shell | ⚠️ readable if you guess `appId` (no 403 beyond tenant check) — by design public catalog reveals existence; detail rows show membership (no PII beyond team names) |
| `POST /applications/:appId/teams` (`add`) | ✅ `requireAppManager → admin` + `audit add scopeMode admin` | ✅ if `role===OWNER` or `PLATFORM_ADMIN` + same audit `owner` | ❌ 403 `Application Owner or PlatformAdmin required` |
| `PATCH /applications/:appId/teams/:teamId` (`changeRole`) | ✅ | ✅ | ❌ 403 |
| `DELETE /applications/:appId/teams/:teamId` | ✅ | ✅ | ❌ 403 |
| `/admin/*` CRUD (divisions/departments/teams/applications/roles …) | ✅ full (`adminRouter.use('/admin', requirePermission('system.admin'))` `admin.ts:32`) | ❌ blocked `Session lacks admin access` card | ❌ same |
| Create app `PUT /admin/rbac/applications/:id` | ✅ | ❌ (`/admin` gate only) | ❌ |

Router note: `adminRouter.use('/admin', requirePermission('system.admin'))` is **path-gated** so `/applications/catalog` (mounted on `applicationsRouter`, not `adminRouter`) is not accidentally gated (`admin.md` §Permissions). Catalog reads via `req.tenantId + resolveScopeContext().appMemberships`; writes `requireAppManager` + `Serializable` last_owner guards + `audit` with `resourceKind Application scopeMode actorKind`.

`RbacModule` `admin` vs `cmdb|incident|…` per `src/types/rbac.ts:88-105 RbacModule 16` — no dedicated `application` module; application membership uses `application_membership.*` audit actions not `RbacModule` checks. `_shared/rbac.md` + `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md` remain source of truth for `team_app` inheritance (`src/lib/rbac/engine.ts` team ancestry + `applicationMembership.ts` strongest role).

## Empty / Loading / Error

- **Catalog — loading** `!loading && …` gate preserves 3 non-loading branches; `loading && <div text-sm ois-text-muted py-12 Loading applications…>` (`ApplicationCatalog.tsx:92-94`) — text only, no `ois-shimmer` skeleton grid (gap — preserve `monitoring.md` SkeletonCard pattern Phase 2)
- **Catalog — error** `!loading && error → <div text-sm ois-danger py-12 {error}>` (`:96-98`) where `error = e?.message ?? 'Failed to load applications'` from `applicationCatalogApi.list() catch` (`:30`)
- **Catalog — empty total** `!loading && !error && apps.length===0 → No applications found in this tenant.` (`:100-104`) — center `py-12 ois-text-muted`; no icon like `SearchX 24 / Server 32` used in `portal.md`/`cmdb.md` empties
- **Catalog — empty filter** `!loading && !error && apps.length>0 && filtered.length===0 → No applications match your search or filter.` (`:106-110`) — single line, no `Clear filters` link or `Contact Service Desk mailto` like `portal.md` empty (`Catalog.tsx:464-488`)
- **Catalog — grid only when `filtered.length>0`** (`:113-178`) — implicit empties above cover 0-count; no `N result(s) for "q"` header
- **Admin list (Applications)** — `filtered.length===0 → TBody 0 rows` (`Applications.tsx:68-88`) with `EntityToolbar count=0` as sole signal; no `py-8 italic No applications match filters + Clear filters` like `cmdb.md` center (tracked `admin.md` Open Item)
- **Detail — app missing** `!app → bg-white border rounded-xl p-8 center text-sm muted Application not found. Back to list link ois-primary underline` (`ApplicationDetail.tsx:78-85`) — `app = applications.find(id===appId)` from `CurrentUserContext` (stale risk)
- **Detail — teams panel** `error → border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs danger error.message` (`:125-129`); `loading → Loading… center` (`:131-132`); `!members||0 → No teams assigned yet. center` (`:133-134`); table `overflow-x-auto` preserved
- **Detail — row errors** inline `span text-xs danger bg-danger/5 border-danger/30 rounded px-2 py-0.5` `Cannot demote last owner | Cannot remove last owner | Failed…` (`:163-166`); `AddTeamModal` error `Team is already a member.` `border-danger/30 bg-danger/5` (`:247-250`); `saving` disables `select` `disabled:opacity-50` + `Button loading`
- **Unauthorized** `requireAppManager` 403 bubbles as API 403 `Application Owner or PlatformAdmin required` or `MembershipError 404/409` mapped in `membershipResponse` — client surfaces via `ApiError body.error` inline pill; global `AppShell` `auth:session-expired → /login from+expired` (`AppShell.tsx:27-39`) handles 401 mid-session
- **Global 404** unknown `/applications/*` → `NotFound` via `src/routes/index.tsx:245` wildcard inside `AppShell`

## Phase 2 Deferred

- **Access-request flow** — `Request access` CTA on catalog card → `ServiceRequest` with `applicationId` pre-filled + `workflowTemplate` approval by `OWNER` team or `PLATFORM_ADMIN`; currently `TODO mailto` comment only — requires `primary user email per team` concept + `requestsService.create` wiring (gap filed in Open Items)
- **Criticality editing** — `AppForm` and `ApplicationDetail` show `criticality` badge but never edit it; add select `low|medium|high|critical` to `AppForm` + `PATCH /admin/rbac/applications/:id {criticality}` + validation `prisma Application.criticality String?`
- **Search/Filter parity** — `?q=&filter=member|not-member&criticality=` URL persist + filter by `ownerTeam` name + include `description` in search includes; push to `_shared/filter-sort-export.md` with `useSearchParams` like `portal.md`/`incidents.md`
- **Sorting** — add `SortDropdown` `Most relevant | Name A-Z | Criticality | Recently added` (reuse `portal.md` filterAndSort scoreItem heuristic for `isSearching` relevance)
- **Pagination** — wire `parsePagination` for `GET /applications/catalog?page&pageSize` when tenant hits `>200` apps; footer `Showing X of N` like `incidents.md` shared shell
- **Shimmer skeleton** — loading grid `grid 4×2` pulsing `bg-ois-surface-muted rounded-ois-card h-[132px] animate ois-shimmer` instead of text `Loading…`
- **Contact owners** — resolve `teamId → users.filter(teamId)` primary owner email(s) + `mailto:` with `subject=[OIS] Access request app.code` or in-app thread button (`ApplicationCatalog.tsx:157` TODO)
- **Manageable vs catalog unification** — `manageable` currently `OWNER`-only; expose `CONTRIBUTOR/VIEWER` manageable quick-switch for `_shared/app-selector.md` `VITE_FEATURE_APP_SCOPE_UI` scope switcher (see `admin.md` §Filters)
- **Realtime** — `application_team:updated` → `tenant:{tenantId}` Socket.IO invalidate `applicationCatalogApi.list()` + detail `useResource` (parity `monitoring.md`/`measurement.md` socket)
- **Export & column customization** — `Export CSV` for catalog (code, name, criticality, owners, member count) via `_shared/filter-sort-export.md`
- **Multi-owner admin column** — migrate `Applications` table `Owner Team` single → badges `ownerTeamIds.map` like catalog; keep legacy `ownerTeamId` column dual-write until removed
- **Direct read endpoint** — `GET /applications/:appId` JSON `Application` for detail header (removes `CurrentUserContext` staleness after upsert)

## Design Preservation

Wajib pertahankan (dari `src/routes/admin/ApplicationCatalog.tsx` + `ApplicationDetail.tsx` + `Applications.tsx` + `src/index.css`):

1. **Catalog shell** `p-6 max-w-7xl mx-auto` + header `text-2xl font-bold text-ois-text + text-sm text-ois-text-muted mt-1` + `Browse all applications… Contact an Application Owner…` — jangan ganti jadi `Module Layout` atau accent bar
2. **Toolbar** `flex flex-col sm:flex-row gap-3 mb-6` + search `relative flex-1 max-w-sm` `Search 16 left-3 text-ois-text-subtle` + `input h-9 pl-9 pr-3 bg-ois-surface-muted rounded-ois-btn border-ois-border focus:bg-white focus:border-ois-primary focus:ring-2 focus:ring-ois-primary/20 text-sm transition-all` placeholder `Search by name or code…`, jangan hilangkan `transition-all` atau ubah ke `h-10`
3. **Filter pills** `flex gap-2` `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface-muted text-ois-text-muted border-ois-border hover:bg-ois-border` labels `All | Member | Not a member` — preserve `rounded-full` bukan `rounded-lg` seperti `releases.md` status tabs
4. **Card grid** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4` + card `bg-white border border-ois-border rounded-ois-card p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow` — jangan drop `flex-col gap-3` (memungkinkan `mt-auto` pada membership pill)
5. **Code pill** `inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-ois-primary-pale text-ois-primary border border-ois-primary/20 mb-1.5` + name `text-sm font-semibold text-ois-text leading-tight truncate title` — pertahankan `truncate + title` bukan `line-clamp`
6. **Criticality chip** `CRITICALITY_COLOR` mapping red-100/700/b-200, orange-100/700/b-200, yellow-100/700/b-200, green-100/700/b-200, fallback `bg-gray-100 text-gray-600 border-gray-200` + `px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize` — hardcode di component, bukan token generik
7. **Owner teams** `text-[10px] font-semibold uppercase tracking-wide text-ois-text-subtle mb-1 Owner teams` + `flex flex-wrap gap-1` each `px-2 py-0.5 rounded-full bg-ois-surface-muted text-[11px] text-ois-text-muted border border-ois-border` — jangan prettify jadi avatar stack
8. **Membership pill** `inline-flex gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border` `isMember bg-green-50 text-green-700 border-green-200 + w-1.5 h-1.5 bg-green-500` vs `bg-gray-50 text-gray-500 border-gray-200 + bg-gray-400`; label `You're a member / Not a member` — dot + pill harus bersama; jangan pisah jadi `Badge success/neutral`
9. **States** 4 cabang dengan `py-12 text-center text-sm muted/danger` — jangan merge jadi single `EmptyState` generik sebelum Phase 2 shimmer (preserves explicit branching `ApplicationCatalog.tsx:92-110`)
10. **Admin `Applications` EntityToolbar + Table** `bg-white border rounded-xl p-5` `Code Badge info | Name font-medium | Owner Team | Department | actions Manage ghost + Pencil 14 + Trash2 danger` + `AppForm:Modal title Edit/New h-9 rounded-ois-btn border-ois-border-strong bg-white` — tetap `APS only` owner constraint (`apsTeams` filtered)
11. **Detail Teams panel** `Badge danger OWNER | info CONTRIBUTOR | default VIEWER` + `select h-7 rounded-ois-btn border px-2 text-xs` + `Button outline danger border-ois-danger/40 hover:bg-ois-danger/5 Remove` + inline error `bg-ois-danger/5 border-ois-danger/30 rounded px-2 py-0.5 text-xs` — jangan ganti jadi `Modal confirm` untuk demote
12. **Mount order guard** `GET /catalog` before `use('/', applicationMembershipRouter)` (`server/routes/applications.ts:12-20` comment) — jangan reorder tanpa rename shadowing param
13. **Last_owner Serializable guards** `ownerCount <=1 → 409 last_owner` di `changeTeamRole/removeTeamFromApp` (`server/repositories/applicationMembership.ts:77-103`) + `MembershipError → 404/409` mapping (`admin/applicationMembership.ts:16-24`) — jangan downgrade ke `READ COMMITTED` atau ubah ke generic `403`
14. **Tokens** lock `ois-bg #F7F8FA, ois-surface #FFFFFF, ois-surface-muted #F1F3F7, ois-border #E4E7EC, ois-border-strong #D0D5DD, ois-primary #1F4FD4/#1A42B5/#EEF2FF, ois-text #101828/muted #475467/subtle #98A2B3, ois-success #12B76A/pale #ECFDF3, ois-danger #F04438/pale #FEF3F2` via `src/index.css:7-38` — hex hardcode dilarang (`docs/ui/design-tokens.md`); kecuali chip `CRITICALITY_COLOR` red/orange/yellow/green dan member green/gray yang memang ad-hoc

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) + [`../design/01-erd.md`](../design/01-erd.md)

| Action | Endpoint | Permission | Body / Notes |
|--------|----------|------------|--------------|
| Catalog (public) | `GET /api/v1/applications/catalog` | All authenticated (`requireAuth` + `resolveScopeContext` + `listCatalog`) | → `CatalogAppDto[] {id, code, name, criticality, ownerTeamIds, isMember, myRole OWNER\|CONTRIBUTOR\|VIEWER\|null}` tenant-scoped + `roleByApp` strongest (`ROLE_RANK`) |
| Manageable apps | `GET /api/v1/applications/manageable` | `requireAppManager` via `ownerAppIds` — `system.admin` OR `OWNER`/`PLATFORM_ADMIN` | `ownerAppIds = ctx.appMemberships.filter OWNER + isPlatformAdmin (system.admin OR PLATFORM_ADMIN) → listManageableApps(tenantId, ownerAppIds, isPlatformAdmin)` |
| List teams | `GET /api/v1/applications/:appId/teams` | Tenant existence check `findFirst {id, tenantId} 404` else `listTeamsForApp orderBy role asc addedAt asc` (no `requireAppManager` on read) | → `MembershipDto[] {appId, teamId, role, addedById, addedAt ISO}` |
| Add team | `POST /api/v1/applications/:appId/teams` | `requireAppManager` (`system.admin` OR `PLATFORM_ADMIN` OR `OWNER` for appId) → `actorKind admin\|owner` | `{teamId z.string min1, role enum OWNER\|CONTRIBUTOR\|VIEWER} → addTeamToApp {tenantId, appId, teamId, role, actorId} + audit add scopeMode actorKind 201 — 409 already_member` |
| Change role | `PATCH /api/v1/applications/:appId/teams/:teamId` | same | `{role} → changeTeamRole 200 — 409 last_owner if demote last OWNER, 404 not_member` |
| Remove team | `DELETE /api/v1/applications/:appId/teams/:teamId` | same | `removeTeamFromApp 204 — 409 last_owner if last OWNER, 404 not_member` |
| List RBAC org (teams) | `GET /api/v1/admin/rbac/teams` etc. | `system.admin` (`admin.ts:32`) | `teamsService.list()` populates `teamName` for catalog pills; source `RbacTeam {id, departmentId, code, name}` `src/types/rbac.ts:42-47` |
| Upsert application (admin) | `PUT /api/v1/admin/rbac/applications/:id` | `system.admin` | `applicationSchema {code,name,ownerTeamId,description?} → upsertApplication` (legacy single-owner; catalog authoritative is `ApplicationTeam`) |
| Delete application (admin) | `DELETE /api/v1/admin/rbac/applications/:id` | `system.admin` | `deleteApplication` + `audit delete` |

Scoped via `req.tenantId` + `req.session.userId` + `resolveScopeContext` (teamId → appMemberships + functionalRoles); writes stamped `audit(req, {action, resourceKind:'Application', resourceId:appId, after:{teamId,role}, scopeMode:actorKind})`. Socket `tenant:{tenantId}` not yet emitted for membership mutations (manual `RefreshCw`).

## Open Items

- [ ] Add `Request access` CTA on catalog card → `ServiceRequest`/`access ticket` with `applicationId` pre-filled + owner-team approval (`TODO` `ApplicationCatalog.tsx:157`); define `primary Owner email` resolver `teamId → users.filter(teamId)` for `mailto:` or in-app inbox thread
- [ ] Add `criticality` editing to `AppForm`/`ApplicationDetail` (select `low|medium|high|critical`) backed by `PUT /admin/rbac/applications/:id {criticality}` — display badge already exists but create/edit path missing
- [ ] Persist catalog filters to URL `?q=&filter=member|not-member&criticality=` (`_shared/filter-sort-export.md`) like `portal.md` `searchParams.get('q')`; unify search across `name|code|description|ownerTeam name`
- [ ] Add `SortDropdown` (`Name A-Z | Criticality | Recently added | Member first`) + `N result(s) for "q"` header like `portal.md:492` and `SortDropdown` `Catalog.tsx:245`
- [ ] Replace catalog text loaders with `grid skeleton 8 pulsing rounded-ois-card` via `ois-shimmer` (`src/index.css:113`) parity `cmdb.md`/`monitoring.md`
- [ ] Wire `GET /applications/:appId` direct read (avoids `CurrentUserContext` stale `applications.find`) + expose `myRole` on detail header as `Badge danger/info/default` like Teams panel rows
- [ ] Consider `GET /applications/:appId/members` pagination or `Expandable card` detail within catalog (small `Chevron` → owner teams + Request access) vs dedicated page — decide before `_shared/entity-detail-page.md` adoption
- [ ] Define `PENDING_REQUESTS` state for access flows if approvals shift to `pending_user` like `requests.md` lifecycle

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/portal.md` baseline + `src/routes/index.tsx:90-101,230,238-239` + `src/routes/admin/ApplicationCatalog.tsx:1-181` + `ApplicationDetail.tsx:1-289` + `Applications.tsx:1-168` + `src/types/rbac.ts:49-55` + `server/routes/applications.ts` + `admin/applicationMembership.ts` + `repositories/applicationMembership.ts` (ROLE_RANK/ownerTeamsByApp/last_owner Serializable + `resolveScopeContext`) + `adminService.ts CatalogAppDto/applicationMembershipApi` + `CurrentUserContext` + `prisma Application/ApplicationTeam` + `src/index.css ois-*` tokens ke template features (Intent/Current State/Primary View/Actions/Filters/State Lifecycle/Permissions/Empty-Loading-Error/Phase 2/Design Preservation/API Touchpoints) — Route `/applications/catalog` public + Membership `OWNER/CONTRIBUTOR/VIEWER` with `isMember/myRole` | — |
