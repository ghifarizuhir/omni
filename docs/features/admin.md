# Admin — RBAC Administration

Status: **Draft**
Route: `/admin` (layout), `/admin/divisions`, `/admin/departments`, `/admin/teams`, `/admin/users`, `/admin/applications`, `/admin/applications/:appId` (detail), `/admin/roles`, `/admin/permissions`, `/admin/data-quality` — public catalog `/applications/catalog`
Sidebar: Platform · RBAC Administration
Source: `src/routes/admin/AdminLayout.tsx`, `AdminOverview.tsx`, `Divisions.tsx`, `Departments.tsx`, `Teams.tsx`, `Users.tsx`, `UserSystemRoles.tsx`, `Applications.tsx`, `ApplicationDetail.tsx`, `Roles.tsx`, `SystemRoles.tsx`, `Permissions.tsx`, `DataQuality.tsx`, `ApplicationCatalog.tsx` · `src/routes/index.tsx:90-101,232-243` · `src/types/rbac.ts` · `server/routes/admin.ts` + `admin/dataQuality.ts` + `admin/applicationMembership.ts` · `src/services/adminService.ts`

---

## Intent

Satu tempat untuk **kelola identitas & akses OIS** — hierarchy organisasi (Division → Department → Team), user dengan hierarchy level + functional roles, kepemilikan aplikasi (APS-team ownership), DB-backed system roles/permissions, dan perbaikan data orphan lintas modul. Admin harus onboarding user baru <2 menit, setup ownership aplikasi <1 menit, dan audit semua mutasi ter-track tanpa celah.

ITIL 4: Information Security & Identity Management — hybrid **RBAC + ABAC** (role + attribute): `division + department + team + hierarchy level` (inheritance) + `functional roles` + `ApplicationTeamRole OWNER/CONTRIBUTOR/VIEWER` untuk scope `team_app`.

## Current State (snapshot `src/routes/index.tsx:90-101,232-243`)

- `src/routes/index.tsx:90-100` imports `AdminLayout`, `AdminOverview`, `Divisions`, `Departments`, `Teams as AdminTeams`, `Users as AdminUsers`, `Applications as AdminApplications`, `ApplicationDetail`, `Roles as AdminRoles`, `Permissions as AdminPermissions`, `DataQuality`, `ApplicationCatalog`.
- `src/routes/index.tsx:231-243` mount:
  ```tsx
  { path: 'applications/catalog', element: <ApplicationCatalog /> }, // public, outside admin gate
  { path: 'admin', element: <AdminLayout />, children: [
    { index:true, element: <AdminOverview /> },
    { path:'divisions', element: <Divisions /> },
    { path:'departments', element: <Departments /> },
    { path:'teams', element: <AdminTeams /> },
    { path:'users', element: <AdminUsers /> },
    { path:'applications', element: <AdminApplications /> },
    { path:'applications/:appId', element: <ApplicationDetail /> },
    { path:'roles', element: <AdminRoles /> },
    { path:'permissions', element: <AdminPermissions /> },
    { path:'data-quality', element: <DataQuality /> },
  ]},
  ```
  Guard order: `RequireAuth` (`src/routes/index.tsx:109`) → `RequirePasswordChange` (`:112`) → `AppShell` (`:116`) → `AdminLayout` client gate `session.permissions.includes('system.admin')` (`AdminLayout.tsx:41`).
- Components inventory (`src/routes/admin/` 14 files):
  - `AdminLayout.tsx:10-20` `tabs` 9 dengan icon `lucide-react` (`Shield LayoutGrid Building2 FolderTree Users AppWindow Key Eye AlertTriangle`) + `NavLink` active `border-ois-primary text-ois-primary`.
  - `AdminOverview.tsx:8-15` stats 6 cards `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6`.
  - `Divisions.tsx:14-134` `EntityToolbar` + `Table` + `DivisionFormModal` (code+name).
  - `Departments.tsx:12-155` `divFilter` dropdown + `DeptForm` (division select).
  - `Teams.tsx:12-167` `deptFilter` + `memberCount` + `appsOwned` + `TeamForm`.
  - `Users.tsx:20-328` `Tabs` 2 (`system` → `UserSystemRoles`, `profile` → `UserProfiles`) + `UserForm size lg` (6 selects + hierarchy level + functional roles checkboxes + superadmin/active).
  - `Applications.tsx:14-168` APS-teams filter + `AppForm` (code uppercased + ownerTeam APS only).
  - `ApplicationDetail.tsx:25-289` `useResource(list)` + role `select` + `Remove` + `AddTeamModal` + `last_owner` guard.
  - `Roles.tsx:20-173` `Tabs` 2 (`SystemRoles` + `FunctionalRoles`) + `RoleForm` (code snake_case, builtIn lock).
  - `SystemRoles.tsx:14-212` DB roles `RoleDto` + `adminApi.listRoles/listPermissions` + `RoleForm` checkbox list catalog.
  - `UserSystemRoles.tsx:14-181` `AdminUserDto` table + `AssignRolesModal` (membershipId gate).
  - `Permissions.tsx:10-132` DB catalog cards + `permissionRules` matrix `Table` 8 cols + module/action filters.
  - `DataQuality.tsx:37-294` `MODULES` 6 + KPI strip `grid-cols-6` + module tabs + bulk bar + per-row `select → Save`.
  - `ApplicationCatalog.tsx` public grid `All/Member/Not a member` filter (outside admin gate — see `docs/pages/admin.md:11`).
- Types: `src/types/rbac.ts:1-146` — `DivisionCode STA|IFM|APS|USER_BUSINESS`, `HierarchyLevel group_head|dept_head|team_lead|officer|requester`, `LEVEL_RANK 0..4`, `LEVEL_LABEL`, `Division/Department/RbacTeam/Application/FunctionalRole/RbacUser`, `RbacModule 16`, `RbacAction 11`, `RbacScope own|team_app|all`.
- API: `server/routes/admin.ts:1-372` (`adminRouter`) — `.use('/admin', requirePermission('system.admin'))` (`:32`) + `.use('/admin/data-quality', dataQualityRouter)` (`:33`) + 18 endpoints (tenants/users/audit/permissions/roles CRUD/membership roles + rbac org tree 12 endpoints + reset-password). `server/routes/admin/dataQuality.ts:1-111` (summary/list/assign/bulkAssign, tenant-scoped `updateMany`, audit `scopeMode admin`). `server/routes/admin/applicationMembership.ts:1-92` (manageable/teams add/changeRole/remove, `requireAppManager` + `resolveScopeContext` + `MembershipError` mapping 404/409).
- Services: `src/services/adminService.ts:1-114` — `adminApi` (permissions/roles/users/membershipRoles/resetPassword) + `applicationMembershipApi` (list/add/changeRole/remove/manageable) + `dataQualityApi` + `applicationCatalogApi`. `src/services/platformServices.ts` `rbacService` (upsert/delete for division/department/team/application/functionalRole/rbacUser).

**Working:**
- Full admin chrome with gated fallback: `Loading session…` → `Loading user persona…` → `Session lacks admin access` card (`Shield 36 warning`, email + `system.admin` code, hint `admin@omni.local / demo` + `npm run db:seed`) — never renders tabs if `!hasAdminPerm`.
- All 9 tabs render via `NavLink` active `text-ois-primary border-ois-primary` (`-mb-px border-b-2`) else `text-ois-text-muted hover:text-ois-text`.
- Overview 6 stat cards live from `CurrentUserContext` (`divisions.length` etc. — no API call).
- Divisions/Departments/Teams CRUD via `rbacService.upsert*` + optimistic context `upsertDivision/department/team` + delete with child guard (`deptCount>0`, `memberCount||appsOwned>0`) + `confirm`.
- Users two-layer: **System Roles tab** (`UserSystemRoles.tsx`) DB-backed `AdminUserDto` (name/email/system roles badges) + `Assign` → `AssignRolesModal` checkbox per `RoleDto` (isSystem badge, permission count, description); **Profile tab** (`UserProfiles`) `RbacUser` table 9 cols (Name shield if superadmin, Email, Division/Department/Team, Level `Badge info`, Roles `Badge neutral`, Status `success Active|neutral Inactive`, actions edit/reset/delete) + `New User` creates + auto `adminApi.resetUserPassword` → `NewPasswordModal` (temp password shown once).
- Applications APS-only owner: `apsDivision = divisions.find(code==='APS')` → `apsTeams` → `AppForm` select limited; list table Code `Badge info` + `Manage` link → `/admin/applications/:appId`.
- ApplicationDetail: header `Badge code + h1 name + criticality + description` + `← Applications` (`ArrowLeft 14`); Teams panel `RefreshCw` + `Plus Add team` + `Table` (Team, Role `Badge danger OWNER|info CONTRIBUTOR`, Added by/At `fmtDate en-GB`, row `select role + Remove outline danger`); guards `last_owner` → inline `text-ois-danger` error; `AddTeamModal` search filter + role select `CONTRIBUTOR` default.
- Roles: **System Roles** (`SystemRoles.tsx`) `RoleDto` table (Name lock+built-in badge, Description, Permissions count, Members) + `Plus New Role` → `RoleForm` (name alphanumeric `^[a-z0-9_-]+$i`, description, permissions checklist scroll `max-h-72`, `perms.size / catalog.length`); built-in disabled edit/delete. **Functional Roles** (`Roles.tsx:33-114`) `FunctionalRole` table (Code lock+builtIn badge, Name, Description, Users count, edit/delete disabled if builtIn) + `EntityToolbar` + `RoleForm` snake_case code lowercased+underscored.
- Permissions read-only two-section: **System Permission Catalog** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2` DB cards (`font-mono key + description`) with `catalog.length` count; **Permission Rule Matrix** filters `moduleFilter/actionFilter` + `Table` 8 cols (Module `Badge info`, Action `font-mono`, Variant, Divisions, Min Level `LEVEL_LABEL`, Roles, Scope `Badge neutral`, Rule description) from `permissionRules` (`src/lib/rbac`).
- DataQuality KPI strip 6 `button rounded-xl border p-3` active `border-ois-primary bg-ois-primary/5` else `bg-white hover:border-ois-primary/40` showing `label + orphan large + of total`; module tabs with `Badge danger|success orphan`; table card header `AlertTriangle warning + N orphan rows + RefreshCw`; bulk bar `border-ois-primary/30 bg-ois-primary/5` when `selected>0` (count + `Pick application…` select + `Assign N rows`); per-row checkbox + `cols MODULE_COLS` + per-row `select Pick… + Save`; all API via `dataQualityApi`.
- `ApplicationCatalog` (`/applications/catalog`) public for all authenticated: search + filter `All/Member/Not a member` + card grid per app (code, name, criticality, ownerTeams, `You're a member` + `myRole` badge) via `applicationCatalogApi.list()` → `CatalogAppDto` (ownerTeamIds, isMember, myRole).
- End-to-end audit via `audit(req, {action, resourceKind, resourceId, before/after, scopeMode})` on every mutation (roles/permissions/memberships/rbac/dataQuality) + `invalidatePermissionCache(roleId)` on role patch/delete.

**Stub / Partial:**
- DataQuality `countOne`/`listOrphans` post-Plan F (`primaryApplicationId/applicationId NOT NULL`) always returns `orphan 0, []` — UI still renders but hero shows 0 (`server/routes/admin/dataQuality.ts:18-35`). Pre-migration orphan fixer logic retained only as `assignOne`/`bulkAssign` via `updateMany` (atomic, no TOCTOU).
- `Departments`/`Teams` form `select value divisions[0]?.id` default may be `undefined` if empty — no empty-state message beyond `select` with no options.
- `Users` level availability `isUserBusiness ? ['requester'] : ALL_LEVELS.filter(!requester)` hardcoded `USER_BUSINESS` division gate — other division-level rules not yet.
- `Roles` SystemRoles edit does not surface `isSystem` name immutability server-side error beyond generic `ApiError`.
- `Permissions` catalog fetch error shows `Failed to load: msg`, matrix filters `ALL` only derived from `permissionRules` (DB catalog not filterable).

**Missing (vs `docs/pages/admin.md` §Open Gaps + `templates/features/README.md`):**
- SSO/SAML, bulk CSV import, per-user audit trail viewer, custom application criticality tier config, permission rule in-code editor (matrix is read-only).
- Column customization / export CSV for org tables (cf. `monitoring.md`/`incidents.md` export).
- Saved filter views / URL-persist for admin tables (search only `useState`, not `useSearchParams`).

## Primary View

### AdminLayout Chrome (`/admin` parent, `AdminLayout.tsx:22-96`)

```
Shield 22 ois-primary | RBAC Administration (text-xl bold) + subtitle text-xs muted
tabs flex flex-wrap gap-1 border-b border-ois-border
  Overview LayoutGrid | Divisions Building2 | Departments FolderTree | Teams FolderTree | Users Users | Applications AppWindow | Functional Roles Key | Permissions Eye | Data Quality AlertTriangle
  NavLink px-3 py-2 text-sm font-medium border-b-2 -mb-px (active ois-primary else muted hover border)
Outlet key={location.pathname}
```

Gates before render:
- `session===null` → `Loading session… text-ois-text-muted p-8`
- `user===null` → `Loading user persona…` diagnostic `rbac … failed` hint
- `!session.permissions.includes('system.admin')` → `max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border text-center` `Shield 36 warning` + `Session lacks admin access` + preformatted `<code bg-ois-bg>` guidance.

Content wrapper `space-y-4`.

### AdminOverview (`/admin`, `AdminOverview.tsx:5-46`)

`space-y-6`:

- **Stats grid** `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3` — 6 `bg-white border border-ois-border rounded-xl p-4` cards: `Icon 18 text-ois-text-subtle` (Building2/FolderTree/FolderTree/Users/AppWindow/Key) + `value text-2xl font-bold` + `label text-xs text-ois-text-muted`.
- **Model card** `bg-white border p-5 rounded-xl` — `h3 text-sm font-bold` `Model` + `p text-sm muted leading-relaxed` hybrid role+attribute explainer (`<strong>division+department+team+hierarchy level</strong>` + `functional roles` + `team ownership` scope) + `ul list-disc list-inside text-xs muted space-y-1` 4 bullets navigation hints.

No toolbar, no filters.

### Divisions (`/admin/divisions`, `Divisions.tsx:13-134`)

Card `bg-white border rounded-xl p-5`:

- **Toolbar** `EntityToolbar` props `title "Divisions" count={filtered.length} search/onSearchChange onCreate createLabel "New Division"` — search `code|name includes`.
- **Table** `Table` (`AppShell` style): `Code Badge info | Name font-medium | Departments count | actions w-20` — `deptCount(divId)` derived `departments.filter(divisionId===)`.
- **Row actions** `flex gap-1 justify-end` `Button icon ghost Pencil 14` → edit, `Trash2 14 text-ois-danger` → `handleDelete` (guard `deptCount>0 → alert`, `confirm`).
- **Modal** `DivisionFormModal:Modal isOpen title Edit/New` `space-y-3 py-4` + banner `border-ois-danger/30 bg-ois-danger/5` error + `Input Code toUpperCase placeholder STA/IFM/APS/USER_BUSINESS + Input Name` + footer `Cancel ghost | Save loading`.

### Departments (`/admin/departments`, `Departments.tsx:12-155`)

Card `p-5` with `EntityToolbar rightSlot divFilter select h-9 rounded-ois-btn border-ois-border-strong bg-white px-3 text-sm` (`All divisions` + each `division.name`) + same search on `code|name`. `filtered` also by `divFilter`.

Columns: `Code font-mono xs | Name font-medium | Division divName(id) | Teams teamCount(id) | actions`. `handleDelete` guards `teamCount>0`.

Modal `DeptForm:Modal` — `Division select mt-1 h-9 w-full rounded-ois-btn border…` + `Input Code + Input Name` + error banner + footer.

### Teams (`/admin/teams`, `Teams.tsx:12-167`)

`EntityToolbar rightSlot deptFilter select h-9 ...` + search. `deptName` + `divName(deptId via departments→divisions)` helpers. `memberCount teamId = users.filter(teamId===)`, `appsOwned`.

Columns 7: `Code mono xs | Name medium | Department | Division | Members | Apps | actions`. Same modal pattern `TeamForm:Modal size default` — `Department select` + 2 `Input` + error/footer.

### Users (`/admin/users`, `Users.tsx:20-38,40-328`)

Outer `Tabs tabs USER_TABS 2` (`System Roles` / `Profile & Functional Roles`, from `src/components/ui/Tabs`):

**Tab 1 — System Roles** (`UserSystemRoles.tsx:14-104`):

- Header `flex items-center gap-3` `h3 User → System Role Assignment text-base bold + description text-xs muted` + `Input search w-64` `Search by name or email…`.
- State `users AdminUserDto[]|null + roles RoleDto[] + error` loaded `Promise.all(adminApi.listUsers/listRoles)`.
- `Table`: `Name font-medium | Email muted | System Roles flex flex-wrap gap-1 Badge neutral` (`—` if 0) `| actions w-32` (`ShieldCheck Assign` disabled if `!membershipId`).
- `AssignRolesModal:Modal title "Assign roles: {name}"` — `formError banner` + `email text-xs muted` + `border rounded-md divide-y max-h-96 overflow-y-auto` per `roles.map` `label flex items-start gap-2 px-3 py-2 hover:bg-ois-bg cursor-pointer` `checkbox mt-1 + font-mono name + built-in Badge + description block + permission count subtle` → footer `Cancel | Save loading` calls `adminApi.setMembershipRoles(membershipId, Array.from(selected))`.

**Tab 2 — Profile & Functional Roles** (`UserProfiles`):

- `EntityToolbar` `title Users count search onSearchChange rightSlot divFilter select All divisions + Create New User`.
- `Table` 9 cols: Name (`font-medium flex gap-2` + `ShieldCheck 14 ois-primary` if `isSuperadmin`), Email `ois-text-muted`, Division/Department/Team `divName/deptName/teamName` (— if null), Level `Badge info LEVEL_LABEL` (— if null), Roles `flex-wrap Badge neutral roleName(code)` (`—` if 0), Status `Badge success Active | neutral Inactive`, actions `Pencil + ShieldCheck Reset password + Trash2 danger`.
- `handleSave`: `rbacService.upsertRbacUser(u)` + `upsertUser` merge `saved`; if create → `adminApi.resetUserPassword(saved.id)` → `NewPasswordModal tempPassword`.
- `handleDelete` / per-row Reset both `confirm/alert` + inline `ApiError` handling.
- `UserForm:Modal size lg` — `space-y-4 py-4` + error banner + `grid grid-cols-2 gap-3 Input Name/Email` + `grid grid-cols-3 gap-3` Division/Department/Team selects (`disabled !divisionId / !departmentId`, auto-clear via `useEffect` cascading), `Hierarchy Level select h-9 …` (`availableLevels = isUserBusiness ? ['requester'] : ALL_LEVELS.filter(!requester)`, labels `LEVEL_LABEL`), Functional Roles `label + flex-wrap gap-2` per `functionalRoles.map` `label inline-flex gap-1.5 text-sm px-2 py-1 border border-ois-border rounded-ois-btn hover:bg-ois-surface-muted` `checkbox + name`, flags `Superadmin/Active checkbox gap-2`, footer `Cancel | Save loading` (`id u-${Date.now()}` for create).

### Applications (`/admin/applications`, `Applications.tsx:14-102`)

APS scoping in-component: `apsDivision = divisions.find(code==='APS')` → `apsDeptIds` → `apsTeams`. Filter `name|code includes`.

Card + `EntityToolbar "Applications" count search Create New Application`.

Table `Code Badge info | Name medium | Owner Team teamName(id) | Department deptOfTeam(id) | actions w-20` `flex gap-1 justify-end` `Link Manage Button sm ghost → /admin/applications/:id` + `Pencil` + `Trash2`.

Modal `AppForm:Modal title Edit/New` — `Input Code toUpperCase + Input Name + select Owner Team (APS only) h-9 w-full rounded-ois-btn` (lists `apsTeams`) + `textarea description rows 3 border-ois-border-strong rounded-ois-btn bg-white px-3 py-2 text-sm` + footer.

### ApplicationDetail (`/admin/applications/:appId`, `ApplicationDetail.tsx:25-289`)

`space-y-4`:

- **Header card** `bg-white border rounded-xl p-5` — `← Applications Link ArrowLeft 14 text-xs muted hover:text` + title row `flex gap-3 Badge info code + h1 text-lg bold name + Badge default criticality (if present)` + `description text-sm muted mt-2`.
- Not-found fallback `bg-white border rounded-xl p-8 text-center text-sm muted` `Application not found. Back to list link ois-primary underline`.
- **Teams panel** `bg-white border rounded-xl p-5 space-y-3` — header `flex justify-between text-sm semibold + Button sm ghost RefreshCw animate-spin when loading + Button sm Plus Add team`.
  - Error banner `border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs ois-danger`.
  - Loading `text-sm muted py-4 text-center Loading…`, empty `No teams assigned yet.`.
  - **Table** `Table overflow-x-auto` — `Team font-medium (teams.find(m.teamId)?.name ?? id) | Role Badge (danger OWNER/info CONTRIBUTOR/default VIEWER) | Added by users.find(addedById)?.name ?? id | Added at fmtDate en-GB dd MMM yyyy | actions w-48` per row `flex flex-wrap items-center gap-2 justify-end` + inline `rowError` span `text-xs ois-danger bg-ois-danger/5 border-ois-danger/30 rounded px-2 py-0.5` + `select h-7 rounded-ois-btn border px-2 text-xs` `ROLES OWNER/CONTRIBUTOR/VIEWER` + `Button sm outline danger Remove loading`.
  - Handlers `handleRoleChange/changeRole` + `handleRemove/remove` use `applicationMembershipApi.changeRole/remove`, catch `ApiError body.error last_owner` → `Cannot demote last owner / Cannot remove last owner`.
  - `AddTeamModal:Modal isOpen title Add Team size sm` — `error banner + label Search team input h-9 ... Filter teams… + label Team select h-9 w-full + label Role select ROLES` → footer `Cancel | Add disabled !teamId||empty`. Calls `applicationMembershipApi.add(appId,{teamId,role})` with `already_member` mapping.

### Roles (`/admin/roles`, `Roles.tsx:20-31, plus SystemRoles/FunctionalRoles`)

Container `Tabs ROLE_TABS 2`:

**System Roles** (`SystemRoles.tsx:46-108`) + **Functional Roles** (`Roles.tsx:33-114`) share same outer `bg-white border rounded-xl p-5`.

- **System Roles** `space-y-3` — header `h3 System Roles text-base bold + text-xs muted DB-backed…Built-in cannot be edited + Button sm ml-auto Plus New Role`. `Table Name font-mono xs + Lock if isSystem + built-in Badge | Description xs muted — | Permissions count xs | Members membershipCount | actions` (`Pencil disabled isSystem` + `Trash2` guard `membershipCount>0 alert + confirm`). Modal `RoleForm` (`name + description + perms Set`) with `catalog PermissionDto[]` fetched `Promise.all(listRoles/listPermissions)`, per permission `label flex gap-2 px-3 py-2 hover:bg-ois-bg cursor-pointer border?` `checkbox mt-1 + font-mono key + description block` `max-h-72 overflow-y-auto divide-y`. Title `Edit Role: {name} | New Role`, subtitle `Permissions (N / catalog.length)`.

- **Functional Roles** `EntityToolbar Functional Roles count search Create New Role` + `Table Code font-mono xs + Lock if builtIn | Name medium + builtIn Badge neutral | Description xs muted | Users count (users.filter functionalRoles includes code).length | actions` `Pencil | Trash2 disabled builtIn`. Modal `RoleForm:Modal title Edit/New Functional Role` `Input Code snake_case toLowerCase+_ + Input Name + textarea Description rows 3` + error/footer; `code disabled builtIn`; `handleDelete` guard `userCount>0`.

### Permissions (`/admin/permissions`, `Permissions.tsx:10-132`)

`space-y-5`:

- **System Permission Catalog** `bg-white border rounded-xl p-5` — `h2 text-base bold + text-xs muted DB-backed … requirePermission() + catalog.length`. States: `Failed to load` `text-xs ois-danger mb-2` | `Loading…` | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2` per `p.key` card `border rounded-md px-3 py-2 font-mono text-xs + description text-xs muted mt-0.5`.
- **Permission Rule Matrix** `bg-white border rounded-xl p-5` — header `h2 text-base bold + code src/lib/rbac/permissions.ts text-xs muted + ml-auto selects h-9 rounded-ois-btn border px-3 text-sm All modules/actions`. `Table` `Module Badge info | Action font-mono xs | Variant font-mono xs — | Divisions xs join , | Min Level text-xs LEVEL_LABEL — | Roles xs join , | Scope Badge neutral | Rule text-xs muted description`. `filtered` by `moduleFilter/actionFilter`.

### DataQuality (`/admin/data-quality`, `DataQuality.tsx:37-294`)

`space-y-4`:

- **KPI strip** if `summary` `grid grid-cols-6 gap-3` per `MODULES` (`cmdb/Events/Incidents/Changes/Problems/Service Requests`) button `rounded-xl border p-3 text-left` active `border-ois-primary bg-ois-primary/5` else `bg-white hover:border-ois-primary/40` + `label text-xs muted font-medium + orphan text-lg bold + of total`.
- **Module tabs** `flex flex-wrap gap-1 border-b` per module button `px-3 py-2 text-sm font-medium border-b-2 -mb-px` active `text-ois-primary border-ois-primary` else muted + `Badge danger orphan>0 else success`.
- **Table card** `bg-white border rounded-xl p-5 space-y-3` — header `AlertTriangle 16 warning + text-sm semibold N orphan rows — Label + Button sm ghost RefreshCw`.
  - **Bulk bar** when `selected.size>0` `flex gap-2 rounded-lg border-ois-primary/30 bg-ois-primary/5 px-3 py-2` `text-xs muted N selected + select flex-1 h-8 rounded-ois-btn border bg-white px-2 text-sm Pick application… + Button sm Assign N rows disabled !bulkAppId||saving==='bulk'`.
  - Error banner, Loading `Loading…`, Empty `No orphan rows for this module.`.
  - **Table** `overflow-x-auto Table` `THead Th w-8 checkbox select-all | per cols MODULE_COLS[activeModule] | Assign Application w-56`; `TBody` per `rows.map` `checkbox + cols.map truncate max-w-[160px] text-xs + TD select flex-1 h-7 rounded-ois-btn + Button size sm Save`. `MODULE_COLS`: `cmdb [publicId,name,ownerTeamId,type,environment], event [publicId,title,severity,status,firedAt], incident [publicId,status,priority,severity,createdAt], change [publicId,status,riskLevel,scheduledStart], problem [publicId,status], service_request [publicId,status]`.

### ApplicationCatalog (`/applications/catalog`, outside admin gate, `ApplicationCatalog.tsx`)

Public for all authenticated (no `system.admin`); route `applications/catalog` under `AppShell` sibling to `admin` (`src/routes/index.tsx:230`). Search `name|code`, filter `All|Member|Not a member`, card grid per `CatalogAppDto` `code Badge info + name font-medium + criticality Badge + ownerTeamIds join + isMember Badge + myRole Badge OWNER/CONTRIBUTOR/VIEWER`. (Detail parallels `SystemRoles` card grid but for catalog.)

## Actions

| Action | Trigger | Permission | State / Guard |
|--------|---------|------------|---------------|
| View admin | Tabs / `navigate /admin/*` | `system.admin` | `session.permissions.includes('system.admin')` else blocked card |
| Create division | `New Division` → `DivisionFormModal` → `Save` | `system.admin` via `PUT /admin/rbac/divisions/:id` | `code+name.trim() >0`; `id div-${Date.now()}` if create |
| Edit division | Pencil in row | `system.admin` | — |
| Delete division | Trash2 | `system.admin` `DELETE /admin/rbac/divisions/:id` | Guard `deptCount>0 → alert`; `confirm`; error `alert Delete failed: msg` |
| Create department | `New Department` | `system.admin` | divisionId required (`divisions[0]?.id` default) |
| Edit department | Pencil | `system.admin` | — |
| Delete department | Trash2 | `system.admin` | Guard `teamCount>0`; confirm |
| Create team | `New Team` | `system.admin` | departmentId required |
| Edit team | Pencil | `system.admin` | — |
| Delete team | Trash2 | `system.admin` | Guard `memberCount>0 || appsOwned>0`; confirm |
| Create user | `New User` → `UserForm size lg` → `Save` | `system.admin` `PUT /admin/rbac/users/:id` | `name+email.trim() >0`; auto `adminApi.resetUserPassword` → `NewPasswordModal` |
| Edit user | Pencil | `system.admin` | — |
| Delete user | Trash2 | `system.admin` `DELETE /admin/rbac/users/:id` | confirm |
| Reset password (any) | ShieldCheck icon in `UserProfiles` row | `system.admin` `POST /admin/rbac/users/:id/reset-password` | `tempPassword` shown in `NewPasswordModal` |
| Assign system roles | `System Roles` tab `Assign` → `AssignRolesModal` → `Save` | `system.admin` `PUT /admin/memberships/:id/roles` `roleIds max 32` | Disabled if `!membershipId`; validates `roleId ∈ system OR tenant`; audit `before/after roleIds` |
| Create system role | `New Role` → `RoleForm` → `Create role` | `system.admin` `POST /admin/roles` `name ^[a-z0-9_-]+$i 1..64` | `assertPermissionsExist` against `permissionCatalog()` |
| Edit system role | Pencil (disabled if `isSystem`) | `system.admin` `PATCH /admin/roles/:id` | 403 if `isSystem` |
| Delete system role | Trash2 (disabled if `isSystem`) | `system.admin` `DELETE /admin/roles/:id` | Guard `membershipCount>0 → alert`; 409 if assigned |
| Create functional role | `New Role` (Functional tab) → `RoleForm` | `system.admin` `PUT /admin/rbac/roles/:id` | code lowercased+underscored |
| Edit functional role | Pencil | `system.admin` | builtIn code disabled |
| Delete functional role | Trash2 disabled if `builtIn` | `system.admin` `DELETE /admin/rbac/roles/:id` | Guard `userCount>0` (users with that code) |
| Create application | `New Application` | `system.admin` `PUT /admin/rbac/applications/:id` | APS teams only; `code.toUpperCase()` |
| Edit application | Pencil | `system.admin` | — |
| Delete application | Trash2 | `system.admin` `DELETE /admin/rbac/applications/:id` | confirm |
| Add team to app | `ApplicationDetail Add team` → `AddTeamModal` → `Add` | `system.admin` OR app OWNER via `requireAppManager` (`applicationMembership.ts:44`) `POST /applications/:appId/teams` | `already_member → 409` mapped to `Team is already a member.` |
| Change team role | Row `select OWNER/CONTRIBUTOR/VIEWER` | same | Guard `last_owner → 409` `Cannot demote last owner` inline error |
| Remove team | `Remove outline danger` | same `DELETE /applications/:appId/teams/:teamId` | `last_owner → Cannot remove last owner`; confirm |
| Bulk assign orphan | `DataQuality` select rows + `Pick application…` → `Assign N rows` | `system.admin` `POST /admin/data-quality/:module/bulk` `ids max 500` | Disabled `!bulkAppId`; `scopeMode admin` audit |
| Single assign orphan | Per-row `select + Save` | `system.admin` `PATCH /admin/data-quality/:module/:id` | `applicationId` must exist in tenant |
| Refresh DataQuality | `RefreshCw` ghost | `system.admin` | `loadSummary+loadRows` |
| Explore permissions | Select `All modules/actions` | `system.admin` (read catalog) | client-side `permissionRules.filter` |

Delegate detail/membership to [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) & [`_shared/rbac.md`](./_shared/rbac.md) when shared available — each admin table follows shared `EntityToolbar + Table + Modal` contract.

## Filters / Sort / Search

- **Divisions** — `search` `code|name lower includes`, client `filtered` (`useState`); no server pagination; default order array order from `CurrentUserContext`.
- **Departments** — `search` + `divFilter select All divisions | per division`; client filter `divFilter !== all && divisionId !== filter`.
- **Teams** — `search` + `deptFilter All departments | per department`; derived `deptName`/`divName` display; no sort controls (table order by source array).
- **Users — Profile tab** — `search name|email` + `divFilter All divisions`; `UserSystemRoles` separate `search name|email` (`useMemo filtered`). No pagination; table scroll.
- **Applications** — `search name|code`; APS scoping `apsTeams` pre-filtered by `APS` division; no additional filter; sort none.
- **ApplicationDetail Teams** — no search/sort; `AddTeamModal` local `search Filter teams…` on `available = allTeams.filter(!memberTeamIds)`.
- **System Roles / Functional Roles / Permissions** — search `name|code` (functional) / `name|description` (system) client `filtered`; Permissions two filters `moduleFilter All modules + actionFilter All actions` (`useMemo` unique modules/actions from `permissionRules`); Catalog cards not filterable beyond load.
- **DataQuality** — `activeModule` state (6 tabs) persisted via click; `MODULE_COLS` per module defines visible columns; no search; bulk selection `Set<string> publicId`.
- **ApplicationCatalog** — `search name|code` + membership filter `All/Member/Not a member` (outside admin gate, via `CatalogAppDto.isMember/myRole`).

All filters client-side `useState` (not URL-persisted — gap vs `incidents.md` URL pagination). Export CSV not exposed for admin tables (deferred).

## Detail View

### ApplicationDetail Extended (`/admin/applications/:appId` — primary admin detail)

Reuse pattern `ApplicationDetail.tsx:87-207` (3 sections in single column, not 3-col like `IncidentDetail`):

```
← Applications (ArrowLeft 14 text-xs muted)
Badge info code | h1 text-lg bold name | Badge criticality?
description text-sm muted
card Teams: header text-sm semibold Teams + RefreshCw + Plus Add team
  error banner danger | loading | empty | Table (Team | Role Badge | Added by xs muted | Added at en-GB | actions)
modal AddTeam: search + Team select + Role select → Add
```

Scrolled `space-y-4` no sticky `AppShell` offset (consistent `bg-white border rounded-xl` cards). Future: promote to `_shared/entity-detail-page.md` pinned header variant (currently without risk stripe).

## State Lifecycle

```
Hierarchy:   Division —(1→N)→ Department —(1→N)→ Team —(1→N)→ User / Application (ownerTeamId)
             delete blocked if child exists (division→departments, department→teams, team→members|apps)

User:        active ↔ inactive flag; isSuperadmin bool; level group_head > dept_head > team_lead > officer > requester (LEVEL_RANK 4→0)
             USER_BUSINESS division locks level to requester only; else requester excluded
             functionalRoles string[] (builtIn code preserved, cannot delete if assigned)
             systemRoles via MembershipRole join (DB roles, tenant-scoped + isSystem global)

Application: code/name/ownerTeamId(APS only)/description — no lifecycle status; membership many-to-many
             MembershipRole OWNER ↔ CONTRIBUTOR ↔ VIEWER (single active role per team)
             guards: last_owner 409 on demote/remove; already_member 409 on add

System Role: tenantId null=global isSystem=true (immutable) vs tenantId=current isSystem=false
             permissions string[] validated via permissionCatalog(); _count memberships
             delete 409 if membershipCount>0; patch invalidates permissionCache(roleId)

Functional Role: code/name/description/builtIn — builtIn disables code edit & delete

DataQuality:  summary {total, orphan} per module (post-Plan F orphan always 0; NOT NULL app FK)
              assignOne/bulkAssign via updateMany atomic (tenantId+publicId) → count; audit scopeMode admin

Permission Catalog: Permission {key, description, createdAt} — read-only DB, seeded; rule matrix in-code (src/lib/rbac/permissions.ts) read-only
```

No status transition API beyond membership role change; hierarchy edits are immediate `PUT → upsert → audit`.

## Permissions (action-level)

| Capability | `system.admin` | App `OWNER` (team member) | Authenticated (no admin) |
|------------|----------------|---------------------------|--------------------------|
| View `/admin/*` (tabs) | ✅ all 9 + overview stats | ❌ blocked card `Session lacks admin access` | ❌ same |
| CRUD Divisions/Departments/Teams | ✅ `PUT/DELETE /admin/rbac/**` (`rbacService`) | ❌ | ❌ |
| CRUD Users (+ resetPassword) | ✅ `PUT/DELETE /admin/rbac/users/:id` + `POST .../reset-password` (returns `tempPassword`, `mustChangePassword=true`) | ❌ | ❌ |
| Assign System Roles (`PUT /admin/memberships/:id/roles`) | ✅ `roleIds ≤32`, audit | ❌ | ❌ |
| CRUD System Roles (`/admin/roles`) | ✅ create/update/delete (non-system) + `assertPermissionsExist` | ❌ | ❌ |
| CRUD Functional Roles (`/admin/rbac/roles/:id`) | ✅ | ❌ | ❌ |
| CRUD Applications | ✅ APS-owner constraint | ❌ (via admin router only) | ❌ |
| Manage App Membership (`/applications/:appId/teams`) | ✅ via `system.admin` OR `PLATFORM_ADMIN`/OWNER (`requireAppManager` + `resolveScopeContext`) — `POST/PATCH/DELETE` | ✅ if `role===OWNER` or `PLATFORM_ADMIN` (`applicationMembership.ts:44,62,79`) | ❌ 404/403 |
| View Catalog `/applications/catalog` | ✅ | ✅ | ✅ `GET /applications/catalog` (no `system.admin` — `CatalogAppDto` with `isMember/myRole`) |
| DataQuality summary/list/assign | ✅ `GET /admin/data-quality/summary`, `GET /:module`, `PATCH /:module/:id`, `POST /:module/bulk` (`scopeMode admin`) | ❌ | ❌ |
| Permissions read | ✅ `GET /admin/permissions` | ❌ (but rule matrix visible only inside admin) | ❌ |

Admin router path-gated `adminRouter.use('/admin', requirePermission('system.admin'))` (`server/routes/admin.ts:32`) — prevents unscoped `adminRouter.use(requirePermission)` from gating non-admin `/api` routes mounted on same router (express path prefix guard). Tenant isolation via `req.tenantId` on all prisma queries (`OR [{tenantId:null},{tenantId:req.tenantId}]` for roles, `findFirst tenantId` for app validation). RBAC audit `audit(req, {action,resourceKind,resourceId,before/after,scopeMode})` on every mutating endpoint.

Legacy `RbacUser.functionalRoles` + `ApplicationMembership role` semantics map to `team_app` scope: see `_shared/rbac.md` + `docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md`.

## Empty / Loading / Error

- **AdminLayout** — `session===null` → `Loading session… text-sm muted p-8`; `user===null` → `Loading user persona… If this persists… check browser console [rbac] … failed` diagnostics; `!hasAdminPerm` → `max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border text-center Shield warning 36 + Session lacks admin access + email+code bg-ois-bg + login hint admin@omni.local/demo + npm run db:seed`.
- **AdminOverview** — never empty (stats show 0 if context arrays empty); no loading state (data from `CurrentUserContext`).
- **Divisions/Departments/Teams/Applications/Functional Roles** — empty `filtered.length===0` → `TBody` renders 0 rows (no explicit `Empty` like `No CIs match` — gap vs `cmdb.md` center `Server 32 + Clear filters`; should add `py-8 italic muted No … match filters` when merged). Uses `EntityToolbar count` to convey 0.
- **Users — System Roles** — `error` → `Failed to load: {error} text-sm danger`; `!users` → `Loading… text-sm muted`.
- **Users — Profile table** — `tempPassword` modal shown once after create/reset (`NewPasswordModal`); `alert('Delete failed…')` on error; form error banner `border-ois-danger/30 bg-ois-danger/5 text-xs danger`.
- **ApplicationDetail** — `!app` → `Application not found. Back to list link ois-primary underline center`; `loading` → `Loading…`; `!members||0` → `No teams assigned yet.`; row error inline `Cannot demote last owner / Cannot remove last owner / Failed…` `bg-ois-danger/5` pill.
- **System Roles / Permissions** — `catalogError` → `Failed to load: {msg} text-xs danger mb-2`; `!catalog/!roles` → `Loading… text-xs muted`; table empty `0 rows` (no CTA — `+ Create` still available).
- **DataQuality** — `loading` → `Loading…` center; `rows.length===0` → `No orphan rows for this module.` center; `error` → `border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs danger`; bulk save `saving==='bulk'|publicId` `loading` on `Button`.
- **ApplicationCatalog (public)** — `isMember` false / empty list `No applications yet` (verify in component); search no match `No applications match filters` pattern (parity with portal).
- **Global** — 404 unknown `/admin/*` falls to `NotFound` via `src/routes/index.tsx:245`; Unauthorized `system.admin` missing is 403 from `requirePermission`, not client navigation.

## Phase 2 Deferred

- SSO/SAML + SCIM provisioning, bulk CSV import/edit for users/teams, per-user audit trail viewer (explicit `docs/pages/admin.md:20`).
- Custom application `criticality` tier configurable from admin (currently Badge displays but no edit).
- Permission matrix edit in-code → runtime editor backed by DB (now read-only `permissionRules` + catalog).
- Export CSV for org tables + column customization (parity with `monitoring.md`/`cmdb.md` export).
- URL-persist for search/div filters/sort (`?q=&division=&sort=`) + saved filter views/multi-sort (cf. `incidents.md` Phase 2).
- Cascade delete or reassign workflow (currently blocked with `alert` — needs reassign-then-delete modal).
- DataQuality true orphan detection restore if Plan F constraint relaxed (currently stubbed orphan 0 placeholder — remove/migrate when constraint validated).
- Tenant-scoped role name uniqueness validation surfaced inline (currently `ApiError message` only).
- Keyboard nav / a11y improvements for admin tables and modals.

## Design Preservation

Wajib pertahankan (dari `src/routes/admin/*` + `src/index.css:8-48` + `docs/pages/admin.md`):

1. **AdminLayout gate card** `max-w-xl mx-auto mt-16 p-8 rounded-xl border text-center Shield warning` — jangan downgrade ke plain banner; diagnostic `code bg-ois-bg rounded text-xs` + demo creds hint.
2. **Tabs `NavLink`** `inline-flex gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px` active `text-ois-primary border-ois-primary` else `text-ois-text-muted border-transparent hover:text-ois-text hover:border-ois-border` + `lucide-react size 15` — keep `-mb-px` to hide double border with parent `border-b border-ois-border`.
3. **EntityToolbar pattern** `title + count + search + onCreate + rightSlot select` — maintain `h-9 rounded-ois-btn border-ois-border-strong bg-white px-3 text-sm` selects and `Table` following immediately without extra wrapper `space-y` (card `p-5 bg-white border rounded-xl`).
4. **Tables** `Table/THead/TBody/TR/TH/TD` from `src/components/ui/Table` — header `TH` muted xs, `Code Badge info`, `Name font-medium`, actions right `flex gap-1 justify-end Button icon ghost Pencil 14 / Trash2 14 text-ois-danger`; row `hover:bg-ois-surface-muted` when added (maintain parity with `cmdb.md`).
5. **Modals** `Modal title Edit/New … size lg for UserForm else default` + `space-y-3/4 py-4` + banner `rounded-md border-ois-danger/30 bg-ois-danger/5 px-3 py-2 text-xs danger` + inputs `Input label + select h-9 w-full rounded-ois-btn border-ois-border-strong bg-white px-3 text-sm` + footer `flex justify-end gap-2 py-4 border-t border-ois-border Cancel ghost | Save loading`.
6. **Users `UserSystemRoles` / `SystemRoles` checklists** `border rounded-md divide-y max-h-72/96 overflow-y-auto` + `label flex items-start gap-2 px-3 py-2 hover:bg-ois-bg cursor-pointer border? + checkbox mt-1 + font-mono key/name + description text-xs muted + count subtle` — don't replace with native `MultiSelect`.
7. **ApplicationDetail Teams panel** `Badge variant danger OWNER | info CONTRIBUTOR | neutral/default VIEWER` + `select h-7 rounded-ois-btn border px-2 text-xs` + `Button sm outline danger Remove border-ois-danger/40 hover:bg-ois-danger/5` + inline error `bg-ois-danger/5 border-ois-danger/30 rounded px-2 py-0.5`.
8. **DataQuality KPI + tabs** `rounded-xl border p-3` active `border-ois-primary bg-ois-primary/5` + `Badge danger orphan>0 else success` + bulk bar `border-ois-primary/30 bg-ois-primary/5` — maintain 6-col grid and `-mb-px` tab `border-b-2` pattern like `monitoring.md` Module Layout.
9. **Tokens** lock `ois-primary #1F4FD4 / ois-border #E4E7EC / ois-border-strong #D0D5DD / ois-bg #F7F8FA / ois-surface #FFFFFF / ois-text #101828 / ois-text-muted #475467 / ois-text-subtle #98A2B3 / ois-success #12B76A / ois-danger #F04438` via `src/index.css:8-38` + `bg-ois-* text-ois-* border-ois-* rounded-ois-* shadow-ois-*` classes — hardcode `hex` dilarang (`docs/ui/design-tokens.md`).

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) + [`../design/01-erd.md`](../design/01-erd.md)

| Action | Endpoint | Permission | Body / Notes |
|--------|----------|------------|--------------|
| List tenants | `GET /api/v1/admin/tenants` | `system.admin` | `orderBy createdAt desc` tenant-scoped list |
| List admin users (RBAC assignments) | `GET /api/v1/admin/users` | `system.admin` | `select id/email/name/avatar/createdAt/memberships(membershipId+roles)` → flattened `{membershipId,roles[]}` |
| Audit log | `GET /api/v1/admin/audit?resourceKind&resourceId` | `system.admin` | `take 200 orderBy createdAt desc` via `qString` |
| Permission catalog | `GET /api/v1/admin/permissions` | `system.admin` | `orderBy key asc` `PermissionDto[]` → `PermissionCard` grid |
| List roles | `GET /api/v1/admin/roles` | `system.admin` | `where OR [{tenantId:null},{tenantId:req.tenantId}]` `select roleSelect` → `serializeRole` (sorted permissionKeys, membershipCount) |
| Create role | `POST /api/v1/admin/roles` | `system.admin` | `createRoleSchema name ^[a-z0-9_-]+$i 1..64 + description max500 + permissions string[]` → `assertPermissionsExist(catalog)` → 201 |
| Get role | `GET /api/v1/admin/roles/:id` | `system.admin` | `loadRoleForTenant` 404 if other tenant |
| Patch role | `PATCH /api/v1/admin/roles/:id` | `system.admin` | `updateRoleSchema`; 403 if `isSystem`; `tx rolePermission.deleteMany+createMany + role.update` + `invalidatePermissionCache` + `audit update` |
| Delete role | `DELETE /api/v1/admin/roles/:id` | `system.admin` | 403 if `isSystem`; 409 if `memberships>0`; `invalidatePermissionCache` |
| Set membership roles | `PUT /api/v1/admin/memberships/:id/roles` | `system.admin` | `assignRolesSchema roleIds max 32`; validates each `roleId ∈ systemOR tenant`; `tx membershipRole.deleteMany+createMany` + `audit assign_roles` |
| Upsert division | `PUT /api/v1/admin/rbac/divisions/:id` | `system.admin` | `divisionSchema` (`DivisionCode`) → `upsertDivision(tenantId,id,input)` + `audit upsert` |
| Delete division | `DELETE /api/v1/admin/rbac/divisions/:id` | `system.admin` | `deleteDivision(id)` + `audit delete` |
| Upsert department | `PUT /api/v1/admin/rbac/departments/:id` | `system.admin` | `departmentSchema` → `upsertDepartment` |
| Delete department | `DELETE /api/v1/admin/rbac/departments/:id` | `system.admin` | `deleteDepartment` |
| Upsert team | `PUT /api/v1/admin/rbac/teams/:id` | `system.admin` | `teamSchema` → `upsertTeam` |
| Delete team | `DELETE /api/v1/admin/rbac/teams/:id` | `system.admin` | `deleteTeam` |
| Upsert application | `PUT /api/v1/admin/rbac/applications/:id` | `system.admin` | `applicationSchema` → `upsertApplication` |
| Delete application | `DELETE /api/v1/admin/rbac/applications/:id` | `system.admin` | `deleteApplication` |
| Upsert functional role | `PUT /api/v1/admin/rbac/roles/:id` | `system.admin` | `functionalRoleSchema` → `upsertFunctionalRole` |
| Delete functional role | `DELETE /api/v1/admin/rbac/roles/:id` | `system.admin` | `deleteFunctionalRole` |
| Upsert rbac user | `PUT /api/v1/admin/rbac/users/:id` | `system.admin` | `rbacUserSchema` → `upsertRbacUser` + `audit` (omit `passwordHash`) |
| Delete rbac user | `DELETE /api/v1/admin/rbac/users/:id` | `system.admin` | `deleteRbacUser` |
| Reset password | `POST /api/v1/admin/rbac/users/:id/reset-password` | `system.admin` | `generateTempPassword()+hashPassword` → `mustChangePassword=true` + `audit` → `{tempPassword}` 201 |
| Manageable apps | `GET /api/v1/applications/manageable` | `system.admin` OR `OWNER`/`PLATFORM_ADMIN` | `resolveScopeContext` → `ownerAppIds` → `listManageableApps(tenantId,ownerAppIds,isPlatformAdmin)` |
| List app teams | `GET /api/v1/applications/:appId/teams` | `system.admin` or member (tenant check) | `findFirst tenantId` 404 if not | 
| Add app team | `POST /api/v1/applications/:appId/teams` | `requireAppManager` (`system.admin` OR `OWNER`/`PLATFORM_ADMIN`) | `{teamId,role OWNER\|CONTRIBUTOR\|VIEWER} → addTeamToApp` + `audit add scopeMode actorKind` — `MembershipError already_member→409` |
| Change role | `PATCH /api/v1/applications/:appId/teams/:teamId` | same | `{role} → changeTeamRole` — `last_owner→409` |
| Remove team | `DELETE /api/v1/applications/:appId/teams/:teamId` | same | `removeTeamFromApp` — `last_owner→409` |
| DataQuality summary | `GET /api/v1/admin/data-quality/summary` | `system.admin` via parent `/admin` guard | `{cmdb:{total,orphan}, event,…}` each `count tenantId` (orphan 0 post-Plan F) |
| DataQuality list | `GET /api/v1/admin/data-quality/:module` | `system.admin` | `assertModule(:module)` → `listOrphans` (currently `[]`) |
| DataQuality assign | `PATCH /api/v1/admin/data-quality/:module/:id` | `system.admin` | `patchBody {applicationId}` → `findFirst application tenantId` 400 if not → `updateMany where {tenantId,publicId} data {applicationId/primaryApplicationId}` → `audit data_quality.assign scopeMode admin` 404 if not found |
| DataQuality bulk | `POST /api/v1/admin/data-quality/:module/bulk` | `system.admin` | `bulkBody {ids 1..500, applicationId}` → same + `audit data_quality.bulk_assign` → `{updated}` |
| Catalog | `GET /api/v1/applications/catalog` | All authenticated | `CatalogAppDto[] {id,code,name,criticality,ownerTeamIds,isMember,myRole}` for `ApplicationCatalog` grid |

Scoped via `req.tenantId` + `req.permissions` (`requirePermission`/`requireAppManager`) + `req.session.userId`; `audit` envelope field-limited. Socket: `tenant:{tenantId}` refresh not yet wired for admin (manual `refresh()` via `RefreshCw` / `reload()` Promise.all).

## Open Items

- [ ] Add explicit empty state `py-8 text-center Server 32 ois-text-subtle + No … match filters + Clear filters` for Divisions/Departments/Teams/Users/Applications where `filtered.length===0` (inconsistency vs `cmdb.md`/`monitoring.md`).
- [ ] Restore true DataQuality orphan query when `primaryApplicationId/applicationId NOT NULL` constraint re-evaluated (currently `orphan 0` stub at `dataQuality.ts:18-35`; `MODULE_COLS` + `assignOne` remain but KPI always 0).
- [ ] Replace `u-001` placeholder in `Users`/`Teams` helpers with real `session.userId` if used for awaiting approvals (audit: similar hardcode noted in `changes.md` Open Items).
- [ ] Wire `invoice permissionCatalog` caching `admin.ts:366` to reflect new permissions without restart; document seed for `system.admin` (see `AdminLayout.tsx:54 demo` guidance).
- [ ] Define `POST /admin/rbac/applications/:id` idempotency vs `PUT` semantics in `02-api-contract.md` (currently `PUT /admin/rbac/applications/:id` upsert semantics).
- [ ] Add pagination (`parsePagination` via `server/lib/pagination.ts` as in `incidents.ts:20-24` + `monitoring.ts`) for admin tables >100 rows; currently unbounded `filtered` in memory.
- [ ] Validate `ApplicationCatalog` filter `All/Member/Not a member` URL persist `?filter=` parity with portal.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/admin.md` + `src/routes/admin/*` (AdminLayout 9 tabs, Overview 6 stats, Divisions/Departments/Teams CRUD trio, Users System/Profile tabs, Applications + ApplicationDetail last_owner guards, Roles System/Functional tabs, Permissions catalog+matrix, DataQuality 6 modules orphan fixer) + `src/types/rbac.ts` (DivisionCode/HierarchyLevel/RbacScope) + `server/routes/admin.ts` + `admin/dataQuality.ts` + `admin/applicationMembership.ts` + `adminService.ts` ke template features (Intent/Current State/Primary View/Actions/Filters/State Lifecycle/Permissions/Design Preservation) | — |
