# RBAC & Scope Enforcement — Shared Spec

Status: **Draft — deep spec 2026-08-28**
Used by: **semua halaman** — permission matrix & scope enforcement (Incidents, Problems, Changes, Requests, CMDB, Monitoring, Availability, Capacity, Continuity, Measurement, Improvements, Releases, Deployments, Testing, KB, Portal, Admin, Platform).
Source: `src/types/rbac.ts:1-146` · `src/lib/rbac/engine.ts:1-224` · `src/lib/rbac/permissions.ts:1-549` · `src/lib/rbac/Can.tsx:1-35` · `src/lib/rbac/CurrentUserContext.tsx:1-182` · `src/lib/rbac/*Resource.ts` (change/incident/problem/request/improvement/release/deployment) · `server/auth/permissions.ts:1-66` · `server/middleware/auth.ts:1-56` · `server/middleware/scopedDb.ts:1-43` · `server/scope/context.ts:1-49` · `server/scope/policy.ts:1-36` · `server/scope/scopedDb.ts:1-682` · `server/scope/errors.ts:1-30` · `server/constants/functionalRoles.ts:1-36` · `prisma/schema.prisma:84-236`
Refs: [`../../design/01-erd.md`](../../design/01-erd.md) · [`../../design/02-api-contract.md`](../../design/02-api-contract.md) · [`../../design/03-architecture.md`](../../design/03-architecture.md) · [`../../design/08-design-system.md`](../../design/08-design-system.md) · [`../../../src/index.css`](../../../src/index.css) (`ois-*` tokens) · terra `_shared/rbac` (ref: flat `Role→Permission` + hierarchical `team_app` scope pattern diadaptasi dari `terra-service-management/docs/features/_shared/rbac.md`)

---

## Purpose

Satu sumber kebenaran untuk **siapa boleh apa terhadap resource apa** di OIS. RBAC OIS adalah hybrid **RBAC + ABAC**: role/permissions (flat DB) **×** atribut organisasi (`Division → Department → Team`, `HierarchyLevel`, `FunctionalRole`, `ApplicationTeamRole`) **×** scope resource (`own | team_app | all`) dengan enforcement ganda — **in-memory `can()` di frontend** (gate UI) dan **scoped `req.scoped.*` + `POLICY` + `requirePermission` di backend** (gate API + data). Page doc lain **wajib `Ref: _shared/rbac.md`** untuk tabel Permissions/Actions mereka — jangan copy matrix.

---

## Mental Model

```
User ──(1:1 or null)──► Division / Department / Team / HierarchyLevel (ABAC attributes)
  ├── functionalRoles: FunctionalRoleCode[]  (tenant-scoped, e.g. change_manager, PLATFORM_ADMIN)
  ├── isSuperadmin: boolean                   (frontend `can()` bypass)
  └── Team ──(N:M)──► Application via ApplicationTeam { OWNER | CONTRIBUTOR | VIEWER }

TenantMembership ──(N:M)──► Role ──(N:M)──► Permission (dotted keys, e.g. cmdb.write | system.admin)
                (server/auth/permissions.ts:cached, server/middleware/auth.ts:permissions)

Request: sessionMiddleware → resolveScopeContext → buildScopedDb → requireAuth/requirePermission
          (client: CurrentUserContext → registerRbacOrgTree → can()/Can/useCan)

Resource → RbacResource { applicationId?, ownerTeamId?, ownerUserId? } → scopeMatches
```

Dua lapisan yang saling melengkapi (bukan duplikat):

| Lapisan | Gate | Sumber kebenaran | Fail mode |
|---------|------|------------------|-----------|
| **Frontend** `src/lib/rbac` | `Can` / `useCan` / `filterReadable` | `permissionRules` (`src/lib/rbac/permissions.ts:5`) — deklaratif, read top-to-bottom first-match ALLOW | Hidden/disabled UI, tidak prevent API call |
| **Backend** `server/scope` + `server/auth` | `requirePermission` + `POLICY` + `req.scoped.*` throws `ScopeViolationError` | `ScopeContext` (`ScopeContext:appMemberships + functionalRoles`, `server/scope/context.ts:10`) + `POLICY` (`server/scope/policy.ts:26`) + DB `Role/Permission/MembershipRole` | 401/403 JSON; ` tenantId=undefined → leak` dicegah via global `requireAuth` `server/app.ts:126` |

Terra ref: terra `_shared/rbac` mulai dari flat `Role→Permission` catalog; OIS memperluas dengan **org-tree inheritance** (`team → dept → division → apps`) dan **module `POLICY` dengan readBypass/writeBypass** — jangan turunkan ke terra pattern flat saja tanpa `team_app` semantics.

---

## Org Hierarchy & Identity

### Division → Department → Team → Application

Tipe di `src/types/rbac.ts:4-47` + Prisma `prisma/schema.prisma:128-191`:

| Entity | Type / Model | Kunci | Tenant-scoped | Catatan agent |
|--------|--------------|-------|---------------|----------------|
| `Division` | `DivisionCode` `STA \| IFM \| APS \| USER_BUSINESS` (`src/types/rbac.ts:4`) | `Division.code` `@@unique([tenantId, code])` | Ya | `STA`=Strategy/Arch, `IFM`=Infra/Ops (NOC), `APS`=App Dev, `USER_BUSINESS`=end-user |
| `Department` | `Department { divisionId }` (`src/types/rbac.ts:35`) | `Department.code` `@@unique([tenantId, code])` | Ya | `@@index([divisionId])` |
| `Team` (`RbacTeam`) | `RbacTeam { departmentId }` (`src/types/rbac.ts:41`) | `Team.code` `@@unique([tenantId, code])` | Ya | `@@index([departmentId])`; `Team ↔ Application` via `ApplicationTeam` |
| `Application` | `Application { ownerTeamId }` (`src/types/rbac.ts:49`) | `Application.code` `@@unique([tenantId, code])` | Ya | APS-team ownership; `ownerTeamId` adalah `team.id` (APS team) |

Gagal hierarki yang umum: `User.divisionId/departmentId/teamId` nullable `prisma/schema.prisma:51-53` — engine mengembalikan `[]` scope bila `!divisionId || !level` (`src/lib/rbac/engine.ts:67,91`), jadi onboarding Admin harus set `divisionId+level+teamId` konsisten atau user tidak melihat apa pun (silent empty).

### HierarchyLevel (inheritance pivot)

`src/types/rbac.ts:6-19`:

| Level | Rank `LEVEL_RANK` | Scope inheritance (`src/lib/rbac/engine.ts:62-109`) |
|-------|-------------------|------------------------------------------------------|
| `requester` | 0 | `team_app` → own team? tetapi `requester` biasanya `scope:'own'` (request/incident requester path) |
| `officer` | 1 | `teamsInUserScope` → `[teamId]`; `appsInUserScope` → apps owned by `ownerTeamId===teamId` |
| `team_lead` | 2 | Sama seperti `officer` (single team) — beda di `requiredLevel` gate |
| `dept_head` | 3 | `teams` → semua teams di `departmentId`; `apps` → semua apps owned oleh teams tsb |
| `group_head` | 4 | `teams` → semua teams di semua departments di `divisionId`; `apps` → semua apps owned oleh teams tsb |

Check monotonic: `levelMeetsRequirement` `LEVEL_RANK[user] >= LEVEL_RANK[required]` (`src/lib/rbac/engine.ts:111-118`). Frontend admin `Users` `USER_BUSINESS` locks `availableLevels=['requester']` else excludes `requester` (`docs/features/admin.md` §Users). Konsumen `Can` tidak perlu tahu rank — cukup `requiredLevel` di rule.

### Functional Roles (tenant-scoped ABAC)

Dua keluarga yang sering tertukar:

1. **Frontend-visible `FunctionalRoleCode`** `src/types/rbac.ts:57-64` — coarse: `change_manager | cab_member | emergency_approver | assessor | ifm_operator | sta_member | requester` (+ open string). Dipakai `requiredFunctionalRoles` di `permissionRules`. `RbacUser.functionalRoles` adalah `string[]` (`src/types/rbac.ts:83`), `UserFunctionalRole` join `prisma/schema.prisma:228-236`.

2. **Backend-enforced bypass codes** `server/constants/functionalRoles.ts:7-9` — `PLATFORM_ADMIN | NOC_OPERATOR | AUDITOR` (seed `prisma/seed.prod.ts`, `FUNCTIONAL_ROLE_CODES`). Dipakai `POLICY.readBypass/writeBypass` (`server/scope/policy.ts:27-35`) dan `ScopeContext.functionalRoles` (`server/scope/context.ts:38-41`). `PLATFORM_ADMIN` adalah super-bypass tenant-wide; `NOC_OPERATOR` cross-app read+write incidents/events/requests; `AUDITOR` read-only everywhere.

Isolasi: frontend `STA/IFM/APS` division gates ≠ backend `AUDITOR/NOC_OPERATOR` role gates — keduanya harus terpenuhi bila rule mensyaratkan.

### ApplicationTeamRole (DB scope)

`prisma/schema.prisma:193-211`:

```prisma
enum ApplicationTeamRole { OWNER CONTRIBUTOR VIEWER }
model ApplicationTeam { applicationId teamId role @@id([applicationId,teamId]) @@index([applicationId,role]) }
```

`ScopeContext.appMemberships` derived dari `user.teamId → ApplicationTeam.findMany({teamId})` (`server/scope/context.ts:31-36`): user hanya punya apps dari **satu teamId** (single-team assumption — tidak multi-team). `buildScopedDb` klasifikasi `writableApps = OWNER|CONTRIBUTOR`, `ownerApps = OWNER` (`server/scope/scopedDb.ts:198-205`). `PLATFORM_ADMIN` + `POLICY.*.writeBypass` mengabaikan membership. Guards: last owner 409 (`server/routes/admin/applicationMembership.ts:44`, `docs/features/admin.md:§Actions`).

---

## Permission Model — Two Tracks

### Track A — Flat `Role → Permission` (DB, server)

`prisma/schema.prisma:84-127` (§RBAC M2):

| Model | Shape | Catatan |
|-------|-------|---------|
| `Permission` | `{ key PK dotted "cmdb.write" , description?, roles RolePermission[] }` | Catalog seed, `orderBy key asc` |
| `Role` | `{ id, tenantId? (null=system), name @@unique([tenantId,name]), isSystem, permissions RolePermission[], memberships MembershipRole[] }` | `isSystem=true` immutable (`admin.ts:403` guard) |
| `RolePermission` | `@@id([roleId,permissionKey]) @@index([permissionKey])` | Join; cache per `roleId` TTL 60s (`server/auth/permissions.ts:11-28`) |
| `MembershipRole` | `@@id([membershipId,roleId]) @@index([roleId])` | `TenantMembership ↔ Role`; `PUT /admin/memberships/:id/roles` max 32 ids |

Runtime: `permissionsForRoleIds(roleIds)` union (`server/auth/permissions.ts:31-37`), `permissionCatalog()` cached (`:40-47`), `invalidatePermissionCache(roleId?)` on patch/delete/assign (`:62-66`). Dev bypass `AUTH_REQUIRED=false` → `permissionsForSystemRole('admin')` `tenant-demo` (`server/auth/permissions.ts:51-58`, `server/middleware/auth.ts:32-35`).

Dotted keys konvensi: `{module}.{verb}` (`cmdb.read|cmdb.write|cmdb.audit.read`, `incident.read|create|write|resolve|close`, `system.admin`, …). Verifikasi via `requirePermission('cmdb.write')` (`server/middleware/auth.ts:48-56`) → `if (!permissions?.has(perm)) throw 403`.

### Track B — Declarative `PermissionRule` + `RbacScope` (in-code, client)

`src/types/rbac.ts:89-146`:

```ts
type RbacModule = 'incident'|'problem'|'change'|'request'|'knowledge'|'cmdb'|'availability'|'capacity'|'testing'|'improvement'|'release'|'monitoring'|'continuity'|'measurement'|'platform'|'admin'
type RbacAction = 'create'|'read'|'update'|'assign'|'close'|'assess'|'approve'|'implement'|'fulfill'|'author'|'audit_read'|'manage'
type RbacScope  = 'own' | 'team_app' | 'all'   // src/types/rbac.ts:125
interface PermissionRule { id, module, action, variant?, requiredLevel?, requiredDivisions?, requiredFunctionalRoles?, scope, description }
interface RbacResource { applicationId?, ownerTeamId?, ownerUserId? }
```

Scope semantics `src/types/rbac.ts:121-125` + `src/lib/rbac/engine.ts:139-164`:

- `all` — tanpa `resource` check.
- `own` — `resource.ownerUserId === user.id`; tanpa resource berarti *create-your-own* allowed.
- `team_app` — `resource.applicationId ∈ appsInUserScope(user)` **atau** `resource.ownerTeamId ∈ teamsInUserScope(user)` (Change/Problem/Improvement/Deployment scoped by team, Event/Incident/ServiceRequest bisa by app *atau* team tergantung helper). Tanpa resource → `appsInUserScope.length>0 || teamsInUserScope.length>0`.

`variant` discrim diskriminan change approval (`standard|normal|emergency`, `src/lib/rbac/permissions.ts:168-187`) — rule dengan `variant` hanya match bila `opts.variant` sama (`src/lib/rbac/engine.ts:191`).

---

## Permission Rules — Matrix (`src/lib/rbac/permissions.ts:5`)

Declarative, first-match ALLOW; superadmin bypass dulu (`src/lib/rbac/engine.ts:179-181`). Ringkas per modul (detail id → `src/lib/rbac/permissions.ts:<line>`):

| Modul | Action | Dari mana | Syarat ringkas | Scope |
|-------|--------|-----------|----------------|-------|
| **incident** `inc-*` `:7-85` | `create` | any IT officer+ \| requester | `STA|IFM|APS officer` \| `requester` role | `all` \| `own` |
| | `read` | `inc-read-*` | `IFM all` / `APS officer team_app` / `requester own` | `all` / `team_app` / `own` |
| | `update`/`assign`/`close` | `inc-update/assign/close-*` | IFM (officer/lead) vs APS officer/lead `team_app` | `all`/`team_app` |
| **problem** `prb-*` `:88-122` | `read/update/create` | `IFM all` / `APS officer team_app` / IT officer+ create `all` | — | `all`/`team_app` |
| **change** `chg-*` `:125-201` | `create` | `change_manager` only | — | `all` |
| | `assess` | APS officer | `team_app` owner | `team_app` |
| | `read` | APS officer `team_app` \| IFM `all` \| STA `sta_member all` \| CM/CAB `all` | — | `team_app`/`all` |
| | `approve` variant | `standard:change_manager` / `normal:cab_member` / `emergency:emergency_approver` | — | `all` |
| | `implement` | APS officer `team_app` \| `change_manager all` | — | `team_app`/`all` |
| **request** `req-*` `:204-271` | `create` | any authenticated | — | `all` |
| | `read` | own \| IFM all \| APS officer team_app | — | `own/all/team_app` |
| | `update/approve/fulfill` | IFM/APS officers & leads (fulfill/approve `team_app` vs `all`) | — | |
| **knowledge** `kb-*` `:274-287` | `read` | all auth | — | `all` |
| | `author` | team_lead + `IFM|APS|STA` | — | `all` |
| **cmdb** `cmdb-*` `:290-311` | `read` | `STA|IFM|APS` IT | — | `all` |
| | `update` | IFM officer `all` | — | `all` |
| | `audit_read` | Dept Head+ `STA|IFM|APS` | `dept_head` | `all` |
| **availability** `av-*` `:314-327` | `read` IT / `update IFM lead all` | — | `all` |
| **capacity** `cap-*` `:330-343` | `read` IT / `update IFM lead all` | — | `all` |
| **testing** `test-*` `:346-373` | `read IT all` / `update APS officer all` / `approve APS lead all` / `approve CM all` | — | `all` |
| **improvement** `imp-*` `:376-403` | `read IT all` / `create IT officer all` / `update APS team_app` / `IFM all` | — | `all/team_app` |
| **release** `rel-*` `:406-468` | `read IT all` / `create APS officer team_app \| CM all` / `update APS officer team_app \| CM all` / `approve APS lead team_app \| CM/CAB all` / `implement APS officer team_app \| CM all` | — | — |
| **monitoring** `mon-*` `:471-491` | `read IT all` / `update IFM lead all` / `APS lead all` | — | `all` |
| **continuity** `cont-*` `:494-514` | `read IT all` / `update IFM lead all` / `STA lead all` | — | `all` |
| **measurement** `meas-*` `:517-530` | `read IT all` / `author team_lead IT all` | — | `all` |
| **platform** `plat-*` `:533-545` | `read all auth` / `manage IFM dept_head all` | — | `all` |
| **admin** `:547` | `manage` | `isSuperadmin` bypass only (no rule — engine gate) | — | `all` |

Aturan penulisan: TAMBAH rule = tambah entry di `permissionRules` dengan `id` unik (`kebab module-action-qualifier`), pilih `scope` sesuai resource (§Scope), jangan duplikat `module+action+variant`.

---

## Engine — `src/lib/rbac/engine.ts`

### Org-tree registry

`registerRbacOrgTree({applications,teams,departments,divisions})` `engine.ts:29-36` — set global `registry`, diisi `CurrentUserProvider` `useEffect` dari `rbacService.*()` `CurrentUserContext.tsx:67-101`, re-register bila state mutates `useEffect [apps,teams,depts,divs]` `:109-111`. `Can/useCan` default ke `registry`; test override via `CanOptions.applications/teams/departments/rules` (`Can.tsx:19-23`, `engine.ts:38-46`).

### Inheritance helpers

```ts
teamsInUserScope(user, teams?, departments?) // engine.ts:62-79
appsInUserScope(user, apps?, teams?, departments?) // engine.ts:85-109
```

| Level user | `teamsInUserScope` | `appsInUserScope` |
|------------|--------------------|--------------------|
| `group_head` div Z | all teams di semua dept di division Z | apps whose `ownerTeamId` in those teams |
| `dept_head` dept Y | all teams di dept Y (`departmentId===user.departmentId`) | apps owned by those teams |
| `team_lead|officer` team X | `[teamId]` | apps owned by `teamId` |
| null / `!divisionId || !level || !teamId` | `[]` | `[]` |

Invariant: `appsInUserScope` selalu lewat `ownerTeamId` equality — Application tidak punya `divisionId` langsung; division inheritance inferred via `department → team → app`.

### `can()` — evaluator

`can(user, module, action, opts?) → CanResult {allowed, reason, matchedRule?}` `engine.ts:170-205`:

1. `!user || !user.active → false 'No active user.'`
2. `isSuperadmin → true 'Superadmin bypass.'`
3. Resolve `apps/teams/departments/rules` dari `opts` atau `registry`.
4. `candidates = rules.filter(r.module===module && r.action===action && variantMatch)` — variant rule hanya match bila `opts.variant` === `rule.variant`; rule tanpa variant match tanpa variant; variant rule tanpa `opts.variant` excluded (`engine.ts:188-194` — ini strict, jadi `approve` tanpa variant selalu false).
5. Iterasi `candidates` in-order: `levelMeetsRequirement && divisionMatches && functionalRoleMatches && scopeMatches` → first hit `{allowed:true, reason:rule.description, matchedRule:rule}`.
6. Exhaust → `{allowed:false, reason:'No matching rule …'}`.

Helpers: `levelMeetsRequirement RANK >=` (`:111-118`), `divisionMatches` lookup `registry.divisions.find(id===user.divisionId)?.code ∈ requiredDivisions` (`:120-129`), `functionalRoleMatches` `some ∈ user.functionalRoles` (`:131-137`), `scopeMatches` seperti §Scope (`:139-164`).

Convenience: `canDo(...) → boolean` (`:208-215`), `filterReadable(user, module, resources)` filter `canDo(...,'read',{resource:r})` (`:218-224`).

### Resource helpers

Mapping domain → `RbacResource` (scope pivot):

| Helper | File | `RbacResource` |
|--------|------|----------------|
| `incidentResource(incident)` | `src/lib/rbac/incidentResource.ts:1-12` | `{ownerTeamId: assigneeTeamId}` — unassigned = no team, IFM still `all`, APS sees once assigned |
| `problemResource(problem)` | `problemResource.ts:1-7` | `{ownerTeamId}` |
| `changeResource(change)` | `changeResource.ts:1-7` | `{ownerTeamId}` |
| `requestResource(req, catalog?)` | `requestResource.ts:17-26` | `{ownerUserId: requesterId, ownerTeamId: catalogItem.ownerTeamId}` — needs `registerCatalogItems` `CurrentUserContext.tsx:101` |
| `improvementResource(init)` | `improvementResource.ts:4-9` | `{ownerTeamId, ownerUserId}` |
| `releaseResource(release)` | `releaseResource.ts` | `{ownerTeamId}` |
| `deploymentResource(dep, releases?)` | `deploymentResource.ts:8-22` | `{ownerTeamId: releases.find(linkedReleaseId)?.ownerTeamId}` via `registerReleases` |

Tambah resource baru = `export function <domain>Resource(entity): RbacResource { return { applicationId / ownerTeamId / ownerUserId } }` + register usage `resource: <helper>(entity)` saat `can()`.

---

## Frontend Enforcement — `Can` / `useCurrentUser`

### `Can` & `useCan`

`src/lib/rbac/Can.tsx:6-35`:

```tsx
<Can module="incident" action="update" resource={incidentResource(inc)} fallback={null}>
  <Button>Edit</Button>
</Can>
const ok = useCan('cmdb','audit_read') // boolean
```

Props `CanProps {module, action, variant?, resource?, fallback?, children}` — recompute tiap render via `useCurrentUser` + `can()` dengan `applications/teams/departments` dari context. Tidak ada `requirePermission` client — server tetap source untuk API.

### `CurrentUserProvider`

`src/lib/rbac/CurrentUserContext.tsx:12-182`:

- Context value `CurrentUserContextValue { user, setUserById, users, divisions, departments, teams, applications, functionalRoles, upsert*/remove* }` — 8 entity arrays + mutators (admin persona switcher, `localStorage 'ois.rbac.currentUserId'` + session fallback `CurrentUserContext.tsx:113-140`).
- Boot load `useEffect []` `Promise.allSettled` 8 calls `rbacService.users/divisions/departments/teams/applications/roles` + `requestsService.catalog()` + `releasesService.list()`; on settle `registerRbacOrgTree + registerCatalogItems + registerReleases` (`:67-103`). Previous mock import removed M6.1.
- Persona mutators `makeUpsert/makeRemove` local-only; tidak persist ke API (admin panel eksperimen what-if).
- Error: tiap `[rbac] <key> failed:` logged `console.error` jika `status rejected`.

Page yang gating `audit_read`/write harus `useCan` bukan `user.level` check langsung — agar division/functional/level/scope rule tunggal.

### Patterns page-level (Used by)

| Pattern halaman | Gate tipikal | Contoh file |
|-----------------|--------------|-------------|
| List toolbar `+ Create` | `useCan(module,'create')` | `cmdb.md` `CreateCIModal` gated `cmdb.update`; `incidents.md` `New incident` `incident.create` |
| Detail `Edit` inline | `Can module=... action="update" resource={...}` | `CMDBDetail` `Edit` gated `cmdb.write`; `IncidentDetail` status dropdown gated `incident.write` |
| Filter/read | `filterReadable(user,'incident', incidents)` / `incidentResource` | `incidents.md` RBAC `filterReadable` |
| Audit page full-deny | `if (!useCan('cmdb','audit_read')) return Denied` | `CMDBAudit` `ShieldAlert Denied` if not Dept Head+ |
| Tabs admin | `session.permissions.includes('system.admin')` (system perm, bukan `can`) | `AdminLayout.tsx:41` |

Token gated UI: tombol enabled = `bg-ois-primary #1F4FD4 text-white hover:bg-ois-primary-hover` (`src/index.css:8`), disabled = `opacity-50 pointer-events-none` atau `Badge neutral bg-ois-surface-muted border-ois-border text-ois-text-muted`; `Can.fallback` sering `Tooltip "Requires …"` — jangan hide tanpa hint bagi `create/update`.

---

## Backend Enforcement

### `sessionMiddleware` → `requireAuth` → `requirePermission`

`server/middleware/auth.ts:23-56`:

```ts
sessionMiddleware: resolveSession(getSessionIdFromRequest(req)) → req.session/user/tenantId/permissions=new Set(permissionsForRoleIds(roles)) 
  else if !AUTH_REQUIRED → tenant-demo + permissionsForSystemRole('admin')
requireAuth: if (!req.session) throw 401
requirePermission(perm): if (!req.session || !permissions.has(perm)) throw 403 `Missing permission: ${perm}`
```

`req.permissions: Set<Permission>` dari `server/auth/permissions.ts` (TTL 60s). Global gate di `server/app.ts:126` `requireAuth` memastikan `req.tenantId/permissions` ada sebelum scoped routers; tanpa itu `tenantId=undefined` → Prisma tanpa where → **cross-tenant leak** (`docs/design/02-api-contract.md:§Base`, `docs/design/01-erd.md:Principle 1`).

### `withScopedDb` / `req.scoped`

`server/middleware/scopedDb.ts:19-43` + `server/app.ts:39`:

```ts
withScopedDb(req,res,next): if (!userId||!tenantId) → buildScopedDb(prisma,{userId:'',tenantId:'',appMemberships:[],functionalRoles:[]}) stub; else ctx=await resolveScopeContext({userId,tenantId}) → req.scoped=buildScopedDb(prisma,ctx)
```

Lint `no-restricted-imports` `server/routes/**/*.ts` forbids `prisma/@prisma/client` import kecuali exempt: `admin.ts`, `admin/dataQuality.ts`, `admin/applicationMembership.ts`, `applications.ts`, `platform.ts`, `auth.ts`, `integrations.ts` (`docs/design/02-api-contract.md:§Base`, `docs/design/03-architecture.md:Key constraints`). Handler **wajib** `req.scoped.cmdb|events|incidents|monitoring|problems|changes|releases|serviceRequests.*` — bukan `prisma.*`.

### `resolveScopeContext`

`server/scope/context.ts:21-49`:

```ts
resolveScopeContext({userId,tenantId}):Promise<ScopeContext {userId,tenantId, appMemberships:{appId,role:OWNER|CONTRIBUTOR|VIEWER}[], functionalRoles:FunctionalRoleCode[]}>
 user.teamId → ApplicationTeam.findMany({teamId}) mapped
 UserFunctionalRole.findMany({userId, role.code in FUNCTIONAL_ROLE_CODES}) mapped
```

Single query each (2 DB round-trips per request). `appMemberships` menentukan `writableApps/ownerApps`.

### `POLICY`

`server/scope/policy.ts:14-36`:

| ModuleKey | read | write | readBypass | writeBypass |
|-----------|------|-------|------------|-------------|
| `cmdb` | `global` | `scoped` | — | `PLATFORM_ADMIN` |
| `change` | `global` | `scoped` | — | `PLATFORM_ADMIN` |
| `problem` | `global` | `scoped` | — | `PLATFORM_ADMIN` |
| `event` | `scoped` | `scoped` | `NOC_OPERATOR AUDITOR PLATFORM_ADMIN` | `NOC_OPERATOR PLATFORM_ADMIN` |
| `incident` | `scoped` | `scoped` | `NOC_OPERATOR AUDITOR PLATFORM_ADMIN` | `NOC_OPERATOR PLATFORM_ADMIN` |
| `service_request` | `scoped` | `scoped` | `AUDITOR PLATFORM_ADMIN` | `NOC_OPERATOR PLATFORM_ADMIN` |
| `release` | `global` | `admin_only` | — | `PLATFORM_ADMIN` |
| `monitoring_rule` | `global` | `admin_only` | — | `PLATFORM_ADMIN` |
| `alert_route` | `global` | `admin_only` | — | `PLATFORM_ADMIN` |

`global read` = semua tenant members dapat `list/get` tanpa scope; `scoped read` = post-filter `writableApps|ownerApps` atau bypass role; `scoped write` = tulis hanya `writableApps` atau bypass; `admin_only write` = hanya `PLATFORM_ADMIN` (monitoring rules/routes). `POLICY.cmdb.writeBypass` hanya `PLATFORM_ADMIN` — IFM `cmdb.write` datang dari `requirePermission` gate, bukan bypass.

### `buildScopedDb` — per-module `ScopeMode`

`server/scope/scopedDb.ts:195-682` `buildScopedDb(prisma,ctx):ScopedDb {cmdb,events,incidents,monitoring,problems,changes,releases,serviceRequests}`

Tiap module implement `list/get` vs `write` dengan pattern sama:

- `canWriteApp(appId)` `scopedDb.ts:207-210,248-252,298-303,506-510,587-592` — `isPlatformAdmin || POLICY.*.writeBypass.includes(role) || writableApps.has(appId)`. `resolveScopeMode`/`scopeMode` `~:213-219` → `ScopeMode admin|noc|owner|member | null` untuk `audit.scopeMode` (`server/app.ts:errorHandler`, `prisma/schema.prisma:AuditLog.scopeMode`).
- Read: global (`cmdb.listCIs → cmdbRepo.listCIs(tenantId)`, `problems.list`, `changes.list`, `releases.list`) langsung return; scoped (`events.list:262-271`, `incidents.list:329-335`, `serviceRequests.list:610-615`) fetch all tenant rows lalu `filter writableApps/ownerApps` bila tidak `isReadBypass`; post-filter trade-off (future: push to repo where clause).
- Write: fetch raw `primaryApplicationId/applicationId` dari `prisma.<model>.findFirst({tenantId,publicId})`, check `canWrite*` else `throw new ScopeViolationError({module,action,applicationId})` (`scopedDb.ts:236,282,344,548,624`), jalankan repo, return `{result, scopeMode}`. Monitoring write `requireAdminFor` strict `isPlatformAdmin` else 403 (`:454-495`).
- `ScopeMode` `scopedDb.ts:11`: `'member'|'noc'|'owner'|'admin'` — `member`=CONTRIBUTOR write, `owner`=OWNER write, `noc`=bypass `NOC_OPERATOR`/`AUDITOR` (non-platform), `admin`=`PLATFORM_ADMIN`. Dipakai `AuditLog.scopeMode` + per-repo actor tracing.

### `ScopeViolationError`

`server/scope/errors.ts:1-30`:

```ts
class ScopeViolationError extends Error { module, action:'read'|'create'|'update'|'delete', applicationId? } toJSON(){ error:'scope_violation' }
```

Mapped `server/app.ts:errorHandler` → `403 {error:'scope_violation', module, action, applicationId}`. `server/middleware/auth.ts:HttpError 403 Missing permission: …` vs `ScopeViolationError 403 scope_violation` — beda path: perm missing = permission catalog, scope violation = membership bypass failed.

---

## Prisma — RBAC ERD Excerpt (`prisma/schema.prisma:84-236`)

```
Tenant 1──N User —1?→ Team —N ApplicationTeam N←1— Application
           │      └──N UserFunctionalRole N──1 FunctionalRole (tenant-scoped)
           └──N TenantMembership N──N Role N──N Permission
                    (MembershipRole)   (RolePermission)

User { id, email@unique, name, divisionId?, departmentId?, teamId?, level? String, isSuperadmin Boolean }
Division { id, tenantId, code@unique([tenantId,code]), name } 1──N Department { divisionId, code } 1──N Team { departmentId, code } —with User/Team FKs SetNull
Application { id, tenantId, code@unique([tenantId,code]), name, criticality? } 1──N ApplicationTeam { role OWNER|CONTRIBUTOR|VIEWER @@id([appId,teamId]) }
FunctionalRole { id, tenantId, code@unique([tenantId,code]), name } 1──N UserFunctionalRole @@id([userId,roleId])
Permission { key PK, description? } 1──N RolePermission @@id([roleId,permissionKey])
Role { id, tenantId? null=system, name @@unique([tenantId,name]), isSystem } 1──N RolePermission/MembershipRole
```

Ref full: [`../design/01-erd.md`](../design/01-erd.md) §RBAC + ORG. Migrations `0001_init_postgres` squashed.

---

## Design Tokens & Gated UX

Tokens `src/index.css:8-48`:

| Token | Value | Gated usage |
|-------|-------|-------------|
| `ois-primary #1F4FD4` | Primary button/ links / active tab `border-ois-primary text-ois-primary` | `Can` allow → `Button variant primary bg-ois-primary hover:bg-ois-primary-hover` |
| `ois-border #E4E7EC` `ois-border-strong #D0D5DD` | Borders / disabled `select h-9 rounded-ois-btn border` | `Can` deny → `Button disabled border-ois-border bg-ois-surface-muted text-ois-text-muted` + tooltip |
| `ois-bg #F7F8FA` `ois-surface #FFFFFF` `ois-surface-muted #F1F3F7` | Page/cards/muted | Gate card `Session lacks admin access max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border text-center Shield warning 36` (`docs/features/admin.md:§Primary View`) |
| `ois-text #101828` `ois-text-muted #475467` `ois-text-subtle #98A2B3` | Text hierarchy | Locked badge `Badge neutral/info` `functional role code font-mono text-xs` |
| `ois-danger #F04438` `ois-warning #F79009` `ois-success #12B76A` `ois-info #0BA5EC` (+ pale) | Semantic | `ScopeViolationError` banner `bg-ois-danger-pale border-ois-danger/30 text-ois-danger` |
| Radius `ois-card 8px` `ois-btn 6px` `ois-badge 4px` `ois-modal 12px` | Shape | Modal/ badge gated |

Patterns wajib (`docs/design/08-design-system.md:§Tokens`):

- Gate should **disable, not unmount** untuk discoverability — `Can fallback={<Tooltip><Button disabled>Requires …</Button></Tooltip>}` bila action penting; unmount hanya untuk route-level deny (Admin gate card).
- Dept Head+ `audit_read` deny → `ShieldAlert 36 ois-danger + Cannot view audit + Back to CMDB` (`docs/features/cmdb.md:§CMDB Audit` gate `useCan('cmdb','audit_read')`).
- `requirePermission('cmdb.write')` → server `PATCH /cis/:publicId` optimistic revert (`docs/features/cmdb.md:§State Lifecycle`).

---

## Used by — Per-Page Permission Matrix

Page doc harus embed subset ini, bukan copy. Lengkap ada di `src/lib/rbac/permissions.ts:5-549` + `server/scope/policy.ts:26`.

| Page / Module (`src/routes/index.tsx`) | `RbacModule` | Typical gates (frontend `useCan/Can`) | Server `requirePermission` + `POLICY` |
|----------------------------|--------------|--------------------------------------|---------------------------------------|
| **CMDB** `/cmdb` `cmdb.md` | `cmdb` | `cmdb.read` (all IT) untuk list/graph/detail; `cmdb.update` gated `+ Add CI / Edit` (IFM officer); `cmdb.audit_read` Dept Head+ | `cmdb.read→global` list/get/rels; `cmdb.write→scoped cmdb.updateCI` (IFM officer write scoped atau `PLATFORM_ADMIN` bypass); `cmdb.audit.read→dept_head` via `useCan` only |
| **Incidents** `/incidents` `incidents.md` | `incident` | `create any IT officer + requester own`; `read IFM all / APS team_app / requester own`; `update/assign/close` per IFM vs APS team_app | `incident.read→scoped` (NOC/AUDITOR bypass); `write→scoped` (NOC bypass except resolve `allowNoc:false` `:364`) via `req.scoped.incidents.*` |
| **Problems** `/problems` `problems.md` | `problem` | `read IFM all / APS team_app`; `update IFM all / APS team_app`; `create IT officer all` | `problem.read→global` (global!), `write→scoped PLATFORM_ADMIN` (no write endpoints yet) |
| **Changes** `/changes` `changes.md` | `change` | `create change_manager all only`; `assess APS officer team_app`; `read APS team_app / IFM|STA|CM all`; `approve variant standard:CM / normal:CAB / emergency:emergency_approver all`; `implement APS team_app + CM all` | `change.read→global`; `write→scoped PLATFORM_ADMIN bypass` via `req.scoped.changes.{create,cancel,reschedule,setTechnicalAssessment}` |
| **Service Requests / Portal** `/requests` `/portal` | `request` | `create all auth`; `read own / IFM all / APS team_app`; `update/approve/fulfill` APS team_app vs IFM all | `service_request.read→scoped AUDITOR bypass`, `write→scoped NOC bypass` via `req.scoped.serviceRequests.*` (decideStep/fulfill/cancel/reassign/watchers) |
| **Monitoring** `/monitoring` `monitoring.md` | `monitoring` | `read IT all`; `update IFM lead all / APS lead all` (rules+routes) | `monitoring_rule/alert_route read→global`, `write→admin_only` — `req.scoped.monitoring.*` throws unless `PLATFORM_ADMIN` (`:454-495`) |
| **Releases** `/releases` `releases.md` | `release` | `read IT all`; `create APS officer team_app / CM all`; `update/approve/implement` APS team_app + CM all | `release.read→global`, `write→admin_only PLATFORM_ADMIN` (no write endpoints yet, future PLATFORM_ADMIN only) |
| **Deployments** `/deployments` `deployments.md` | `release` via `deploymentResource` | Deployment resolves `ownerTeamId` via `linkedReleaseId` (`deploymentResource.ts:12-22`) | Future admin_only similar to release |
| **Improvements** `/improvement` `improvements.md` | `improvement` | `read IT all`; `create IT officer all`; `update APS team_app / IFM all` | Rely on `improvementResource` team scope; CMDB-like scoped write |
| **Availability** `/availability` `availability.md` | `availability` | `read IT all`; `update IFM lead all` | `Document(kind=sla-target/outage)` not scoped-app, gated by perm only (via `availability.ts`) |
| **Capacity** `/capacity` `capacity.md` | `capacity` | `read IT all`; `update IFM lead all` | Same `Document` pattern |
| **Continuity** `/continuity` `continuity.md` | `continuity` | `read IT all`; `update IFM lead all / STA lead all` (BIA/DR) | `Document` |
| **Measurement** `/dashboards /reports` `measurement.md` | `measurement` | `read IT all`; `author team_lead IT all` | `Document` + `AuditLog` |
| **Testing** `/testing` `testing.md` | `testing` | `read IT all`; `update APS officer all`; `approve APS lead all / CM all` | Usually `all` scope (see matrix) |
| **Knowledge** `/kb` `kb.md` | `knowledge` | `read all auth`; `author team_lead IT all` | `KBArticle` not app-scoped |
| **Platform** `/platform /settings /on-call` | `platform` | `read all auth`; `manage IFM dept_head all` (on-call schedules/platform config) | Per-router `requirePermission` |
| **Admin** `/admin/*` `admin.md` | `admin` | `system.admin` (DB perm) gate `AdminLayout.tsx:41` — `can()` tidak cover | `adminRouter.use('/admin', requirePermission('system.admin'))` (`server/routes/admin.ts:32`); app membership `requireAppManager` (PLATFORM_ADMIN OR OWNER) `:44,62,79` |
| **Overview / Inbox** `/` `/inbox` | `platform` + `RbacScope` filtered feeds | `platform.read` | Feeds resolved via `filterReadable` |

Tambah halaman baru = baris di tabel ini + `RbacModule` literal bila modul baru (`src/types/rbac.ts:89`) + rule set di `permissionRules` + `POLICY` entry bila app-scoped + `*Resource` helper bila `team_app`.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) (§Base, §Resource routers, §Errors) · [`../design/01-erd.md`](../design/01-erd.md) (§RBAC)

| Action | Endpoint | Gate | Notes |
|--------|----------|------|-------|
| Login / Me | `POST /api/v1/auth/login` `GET /api/v1/auth/me` `POST /api/v1/auth/logout` | public (rate-limited) `authLimiter` | Sets session cookie; `GET /me` returns user+permissions |
| RBAC org tree (6+2) | `GET /api/v1/admin/rbac/{users,divisions,departments,teams,applications,roles} + /catalog + /releases` | `system.admin` for admin crud; `rbacService.*()` read for `CurrentUserProvider` (authenticated) | Bootstraps `registerRbacOrgTree` + `registerCatalogItems/Releases` (`CurrentUserContext.tsx:67-101`) |
| System permissions | `GET /api/v1/admin/permissions` | `system.admin` (`server/routes/admin.ts:32`, `server/auth/permissions.ts:40-47`) | Returns `PermissionDto[] orderBy key asc` — grid in `Permissions.tsx` |
| System roles CRUD | `GET/POST /api/v1/admin/roles` `GET/PATCH/DELETE /api/v1/admin/roles/:id` | `system.admin` + `assertPermissionsExist` against `permissionCatalog()` | `PATCH/DELETE` 403 if `isSystem`; invalidates cache + audit |
| Membership roles | `PUT /api/v1/admin/memberships/:id/roles` `{roleIds: string[] max 32}` | `system.admin` | Validates `role OR [{tenantId:null},{tenantId}]`, audit `before/after` |
| RBAC org CRUD (admin) | `PUT /api/v1/admin/rbac/{divisions,departments,teams,applications,roles,users}/:id` `DELETE …/:id` | `system.admin` via `adminRouter.use('/admin', requirePermission)` + `req.tenantId` scoping | Block delete if child exists (division→depts etc.); audit; see `admin.md:§API` |
| Reset password | `POST /api/v1/admin/rbac/users/:id/reset-password` | `system.admin` | Returns `tempPassword` once, `mustChangePassword=true` |
| App membership | `GET /api/v1/applications/manageable` `GET /api/v1/applications/:appId/teams` `POST /applications/:appId/teams` `PATCH .../:teamId` `DELETE .../:teamId` | `requireAppManager` `system.admin` OR `PLATFORM_ADMIN`/OWNER (`server/routes/admin/applicationMembership.ts:44,62,79`) + `resolveScopeContext` | `last_owner` 409; audit `scopeMode` |
| Catalog | `GET /api/v1/applications/catalog` | all authenticated (no `system.admin`) | `CatalogAppDto {isMember,myRole}` for `/applications/catalog` |
| DataQuality | `GET /api/v1/admin/data-quality/summary` `GET /:module` `PATCH /:module/:id` `POST /:module/bulk {ids max500, appId}` | `system.admin` (`dataQuality.ts:18-111`) | Post-Plan F orphan stub `orphan 0` (`docs/features/admin.md:§Stub`) |
| CMDB | `GET /api/v1/cmdb/cis` `GET /cis/:publicId` `PATCH /cis/:publicId` `GET /cis/relationships` `GET /cis/audit` | `requirePermission('cmdb.read'|'cmdb.write'|'cmdb.audit.read')` + `req.scoped.cmdb.*` | `cmdb.audit.read` → Dept Head+ `useCan` gate; paginated `?page&pageSize` |
| Events | `GET /api/v1/events` `PATCH /events/:publicId/status` `POST /events/ingest` | `req.scoped.events.*` scoped read `NOC/AUDITOR` bypass | Post-filter write `writableApps` |
| Incidents | `GET /api/v1/incidents` `GET /incidents/:publicId` `POST .../resolve` `POST .../promote-major` `POST .../stand-down` `POST .../comms` `POST/DELETE .../watchers` | `incident.read/write/resolve/close` via `req.scoped.incidents.*` + `POLICY.incident` | `resolve` `allowNoc:false` only OWNER/member/admin |
| Changes / Problems / Releases / Requests | `GET /api/v1/itsm/{problems,changes,releases,requests}` etc. | `req.scoped.{problems,changes,releases,serviceRequests}.*` + `POLICY` | Changes ingests `applicationId` nullable → `ensureUnassignedApp` fallback `:539` |
| Monitoring | `GET /api/v1/monitoring/{rules,routes}` `POST/PUT/DELETE /monitoring/{rules,routes}` | `read global`, `write admin_only PLATFORM_ADMIN` | Realtime fan-out `server/realtime.ts` |

Global: `helmet(CSP opt-in) → pinoHttp → json(1mb) → cookieParser → authLimiter → sessionMiddleware → withScopedDb → tenantLimiter → requireAuth(server/app.ts:126) → routers → 404 → errorHandler (ScopeViolation 403, HttpError status, Zod 400)` (`docs/design/03-architecture.md:§Request lifecycle`). Socket `tenant:{tenantId}` refresh (`server/realtime.ts`).

---

## Security Invariants (jangan dilanggar)

1. **Tenant isolation:** semua prisma query wajib `where {tenantId}` — `requireAuth` global memastikan `req.tenantId` ada; lupa = `tenantId=undefined` → no filter → leak (`docs/design/01-erd.md:Principle 1`). `AdminRoles` `OR [{tenantId:null},{tenantId:req.tenantId}]` adalah satu-satunya exception.
2. **No direct `prisma` in routes:** lint `no-restricted-imports` (`eslint.config.js:19`) — hanya exempt list; selalu `req.scoped.*` (`docs/design/02-api-contract.md:§Base`). Tambah route baru tanpa `req.scoped` = finding.
3. **`isSuperadmin` bypass only frontend:** `can()` bypass tidak bypass server `POLICY`; `AuditLog` tetap tulis `scopeMode`. Jangan rely superadmin untuk bypass `requirePermission`/`buildScopedDb`.
4. **`team_app` tanpa resource:** fallback `appsInUserScope.length>0 || teamsInUserScope.length>0` memungkinkan `can('read', without resource)` mengembalikan `true` jika user punya any scope — review per modul apakah ini desired (change/incident `team_app` read).
5. **Variant strictly required:** `approve standard|normal|emergency` harus `opts.variant === rule.variant`; `can('change','approve')` tanpa variant selalu false (`engine.ts:191-193`), mencegah auto-approve bypass.
6. **Audit + invalidate:** setiap mutasi `Role/Permission/MembershipRole/ApplicationTeam/DataQuality` harus `audit(req, {action, resourceKind, resourceId, before/after, scopeMode})` + `invalidatePermissionCache(roleId)` bila mengubah permission set.
7. **Tokens:** `ois-primary/border/bg/surface/text/danger/success` via `src/index.css` — gate banner/modal/button harus pakai `ois-*`, bukan hex (`docs/design/08-design-system.md:§Tokens`).

---

## Empty / Loading / Error (gated UX)

- **Loading org tree:** `CurrentUserContext` belum resolve → `Can` defaults `allowed:false` (deny while loading); jangan flicker allow → hide actions atau `skeleton` sampai `users.length>0`.
- **Admin gate deny:** `AdminLayout.tsx:41-54` → `max-w-xl mx-auto mt-16 p-8 bg-white rounded-xl border text-center Shield warning 36 + Session lacks admin access + <code bg-ois-bg>system.admin + admin@omni.local/demo + npm run db:seed`.
- **Module deny (e.g. audit):** `useCan('cmdb','audit_read')===false` → `ShieldAlert Denied` card + `Back to CMDB`; bukan blank.
- **Scope violation API:** `403 {error:'scope_violation', module, action, applicationId?}` → toast `bg-ois-danger text-white` 2s + `Refresh` action; jangan expose other tenant's data in message.
- **Empty after filterReadable:** `No … match filters + Clear filters + Add CTA` gated `can(create)` (`cmdb.md:§Empty`); konsisten `text-center py-12 Server 32 ois-text-subtle`.

---

## Phase 2 Deferred

- Push `scoped read` post-filter (`events.list:264-270`, `incidents.list:332-334`, `serviceRequests.list:613`) ke repo `where applicationId in (writableApps)` agar tidak fetch all rows tenant (perf >10k).
- Column customization / saved filter views URL-persist `?sort=priority:asc&created=desc` (parity `incidents.md:§Phase 2`).
- SSO/SAML + SCIM provisioning, bulk CSV import/edit, per-user audit trail viewer (`admin.md:§Phase 2`).
- Permission matrix runtime editor (sekarang read-only `permissionRules` + DB catalog) → DB-backed editor bila `POLICY` jadi DB.
- Multi-team membership (sekarang single `user.teamId` → `ApplicationTeam.findMany(teamId)`); future `User ↔ Team` many-to-many.
- `variant` enforcement generalisasi untuk `change.type` tambahan + `Problem/Risk` approval flows.
- True orphan detection restore jika Plan F `NOT NULL applicationId/primaryApplicationId` dievaluasi ulang (`admin/dataQuality.ts:18-35` stub).

---

## Design Preservation

Wajib pertahankan (dari `src/lib/rbac/*` + `server/scope/*` + `src/index.css`):

1. `registerRbacOrgTree + registerCatalogItems/Releases` pair di `CurrentUserProvider` — hapus salah satu = scope lobang untuk request/deployment resource.
2. `Can` props `module/action/variant/resource/fallback/children` + `useCan(module,action,opts)` with `applications/teams/departments` from context — jangan ubah signature tanpa codemod semua pages.
3. `LEVEL_RANK 0..4` monotonic + `levelMeetsRequirement >=` — ubah rank = silent allow/deny flip.
4. `RbacScope 'own'|'team_app'|'all'` semantics + `ownerTeamId/applicationId/ownerUserId` resource shape — ubah = `team_app` false-positive.
5. `permissionRules` id kebab + first-match top-to-bottom + superadmin early-return — reorder tanpa review = security change.
6. `POLICY` `read/write` + `readBypass/writeBypass` literal union — tambah module harus entry eksplisit, tidak default `global/scoped`.
7. `ScopeViolationError.toJSON()` `error:'scope_violation'` + `errorHandler→403` — jangan ubah ke `403 Missing permission` (client membedakan).
8. `ScopeMode 'member'|'noc'|'owner'|'admin'` + `resolveScopeMode` vs `scopeMode` — audit `scopeMode` field tagging monitoring.
9. `ois-primary #1F4FD4 / ois-border #E4E7EC / ois-bg #F7F8FA / ois-text #101828` tokens — gated UI harus `ois-*` class, bukan hex.

---

## Open Items

- [ ] Dokumentasikan Zod schema per scoped router sebagai generated contract (`docs/design/02-api-contract.md:§Open Items`).
- [ ] Audit `exempt` routes `platform.ts/integrations.ts` migrasi ke `req.scoped.*` bila perlu app-scope.
- [ ] Unit-test `teamsInUserScope/appsInUserScope/scopeMatches` matrix full (dept_head+group_head × null ids × builtIn roles) — saat ini hanya integration via `server/__tests__/helpers.ts`.
- [ ] Verify `permissionRules` vs `POLICY` consistency linter (e.g. `monitoring update` rule adalah `team_app?all` tapi `POLICY monitoring_rule write→admin_only` — sengaja, tapi butuh doc).
- [ ] Wire `invalidatePermissionCache` + `permissionCatalog` caching ke admin broadcast (Socket.IO `tenant:{tenantId}` refresh) agar role edit reflect tanpa relogin.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep shared init — hybrid RBAC+ABAC (DivisionCode/LEVEL_RANK/RbacScope `own|team_app|all`), `permissionRules` matrix 16 modules, engine `teams/appsInScope + can/variant + resource helpers`, frontend `Can/useCan/CurrentUserContext+registry`, backend `sessionMiddleware/requirePermission/withScopedDb/ScopeContext/POLICY/ScopeViolationError/ScopeMode`, Prisma `Role/Permission/MembershipRole/ApplicationTeamRole` + Design refs `01-erd/02-api-contract` + `ois-*` tokens | `src/types/rbac.ts:4,6,89,125` · `src/lib/rbac/engine.ts:62,85,139,170` · `src/lib/rbac/permissions.ts:5` · `server/middleware/auth.ts:48` · `server/scope/scopedDb.ts:195` · `prisma/schema.prisma:86` |

