# RBAC Admin

> **Route utama:** `/admin` · **ITIL 4 Practice:** Information Security & Identity Management · **Sumber kode:** `src/routes/admin/`

Admin module mengelola RBAC organisasi: hierarchy (Division → Department → Team), user, application ownership, functional roles, permissions, dan data quality.

> **Akses:** Halaman ini gated oleh permission `system.admin` (superadmin only). Sidebar item "RBAC Admin" hanya tampil kalau user superadmin.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/admin` | `AdminOverview` | Dashboard counts + RBAC model explainer |
| `/admin/divisions` | `Divisions` | CRUD division (top-level) |
| `/admin/departments` | `Departments` | CRUD department per division |
| `/admin/teams` | `Teams` | CRUD team per department |
| `/admin/users` | `Users` | CRUD user dengan role + functional role |
| `/admin/applications` | `Applications` | CRUD application (owned by APS team) |
| `/admin/applications/:appId` | `ApplicationDetail` | Manage team membership per app |
| `/admin/roles` | `Roles` | CRUD functional role |
| `/admin/permissions` | `Permissions` | Read-only permission matrix |
| `/admin/data-quality` | `DataQuality` | Fix orphaned records lintas modul |
| `/applications/catalog` | `ApplicationCatalog` | Public app catalog (semua user) |

`AdminLayout` membungkus sub-route dengan tab navigation. RBAC gate di komponen level (`system.admin`).

---

## 2. Key Features

- **3-level hierarchy**: Division → Department → Team.
- **5 hierarchy levels**: group_head, dept_head, team_lead, officer, requester.
- **3 division codes**: STA (Strategic), IFM (Infrastructure & Facilities Mgmt), APS (Application Platform Services).
- **Functional roles** tambahan (cross-cutting): change_manager, cab_member, dst.
- **Application ownership** terkait APS team only.
- **Membership roles**: OWNER, CONTRIBUTOR, VIEWER per app.
- **Permission matrix** read-only (rules + DB-backed catalog).
- **Data Quality** orphan record fixer dengan bulk assign.
- **Superadmin flag** + **Active flag** per user.
- **Temporary password** generation on user create.

---

## 3. AdminOverview

Dashboard 6 stat cards (Divisions / Departments / Teams / Users / Applications / Functional Roles) + explainer text RBAC model (hybrid role + attribute design).

Tidak ada API call (data dari `CurrentUserContext`).

---

## 4. Divisions / Departments / Teams (CRUD trio)

Pattern serupa:
- Search bar
- Tabel: code, name, parent (kalau ada), member/child counts
- "+ New" modal dengan form
- Edit inline atau modal
- Delete dengan validation: blok kalau ada child (department dengan team, team dengan member, dst.)

---

## 5. Users

### Tabs
1. **System Roles** — assign hierarchy level + division/department/team
2. **Profile & Functional Roles** — assign functional roles via checkboxes

### Fields
- name, email
- divisionId, departmentId, teamId
- level (group_head/dept_head/team_lead/officer/requester)
- functionalRoles[] (change_manager, cab_member, dst.)
- isSuperadmin flag, active flag

### Actions
- Create → temporary password generated otomatis (di-display ke admin sekali)
- Reset password → endpoint return `tempPassword`
- Filter by division
- Delete user

---

## 6. Applications

CRUD application dengan owner team restricted ke APS division.

Fields: code, name, ownerTeamId, description.

Klik row → ApplicationDetail.

---

## 7. ApplicationDetail

Manage team membership per application:
- Tabel teams assigned + role (OWNER / CONTRIBUTOR / VIEWER)
- Add team modal
- Change role (validation: tidak boleh demote last owner)
- Remove team
- Track addedById + addedAt per membership

---

## 8. Roles

### Tabs
1. **System Roles** — built-in hierarchy levels (read-only)
2. **Functional Roles** — custom RBAC roles (CRUD)

Fields per functional role: code, name, description, builtIn flag.

Delete validation: blok kalau ada user assigned.

---

## 9. Permissions

Read-only view 2-bagian:

### System Permission Catalog
DB-backed, dari `adminApi.listPermissions()`. Fields: key, description.

### Permission Rule Matrix
In-code rules (lihat `src/lib/rbac/permissions.ts`). Filter by module/action.
Fields: module, action, variant, requiredDivisions, requiredLevel, requiredFunctionalRoles, scope, description.

---

## 10. DataQuality

Tools untuk fix orphaned/unassigned records lintas modul (CMDB / Events / Incidents / Changes / Problems / Service Requests).

### Layout
- Module tabs dengan orphan count
- Tabel record per module dengan dropdown app + Save button
- Bulk: select multiple rows + pick app + Apply
- Inline error handling (e.g., "Cannot remove last owner")

### Endpoints
- `dataQualityApi.summary()` → counts
- `dataQualityApi.list(module)` → records
- `dataQualityApi.assign(module, publicId, appId)`
- `dataQualityApi.bulkAssign(module, publicIdArray, appId)`

---

## 11. ApplicationCatalog (`/applications/catalog`)

Public app catalog untuk semua user (tidak butuh `system.admin`).

### Features
- Search by name/code
- Filter: All / Member / Not a member
- Card grid: code, name, criticality, owner teams, "You're a member" badge

Endpoint: `applicationCatalogApi.list()` → `CatalogAppDto[]`.

---

## 12. User / UX Flow

### Onboarding new user
1. Admin buka `/admin/users` → "+ New user".
2. Isi form: name, email, division=APS, department=Platform, team=Storage, level=officer.
3. Assign functional role: "release_manager".
4. Submit → temporary password muncul → kirim ke user.
5. User login → ChangePassword required.

### Setup new application
1. Admin `/admin/applications` → "+ New app" → owner team APS-Storage.
2. Klik app → ApplicationDetail.
3. Add team APS-DBA dengan role CONTRIBUTOR.
4. Add IFM-NetOps dengan role VIEWER.

### Fix orphaned CIs
1. Admin `/admin/data-quality` → tab CMDB.
2. 23 CI tanpa application assignment.
3. Select all yang related ke "payments" → bulk assign ke app PAY-001.

---

## 13. State Model

Hierarchy entities: simple CRUD (no lifecycle states beyond `active` flag for users).

Membership role: OWNER ↔ CONTRIBUTOR ↔ VIEWER (mutual exclusive).

---

## 14. Roles & Permissions

| Permission | Aksi |
|---|---|
| `system.admin` | Full access ke /admin/* |
| (dynamic) | Permission matrix read tergantung module-specific rules |

Application Catalog tidak butuh `system.admin` — semua authenticated user.

---

## 15. Upstream Dependencies

Tidak ada (admin adalah foundation). Membaca dari Prisma RBAC tables langsung.

---

## 16. Downstream Effects

Semua modul lain bergantung ke RBAC:
- Permission check (`Can`, `useCan`)
- Resource scope (filterReadable)
- Application ownership (untuk `team_app` scope)

---

## 17. Data Model

Prisma RBAC tables (lihat `prisma/schema.prisma`):
- `Division`, `Department`, `Team`
- `RbacUser` (id, name, email, divisionId, departmentId, teamId, level, functionalRoles[], isSuperadmin, active)
- `Application` (code, name, ownerTeamId, description)
- `ApplicationMembership` (appId, teamId, role, addedById, addedAt)
- `FunctionalRole` (code, name, description, builtIn)
- `Permission` (key, description) — DB catalog
- Permission rules in-code (`src/lib/rbac/permissions.ts`)

---

## 18. API Endpoints

| Endpoint | Method | Permission |
|---|---|---|
| `rbacService.upsertDivision/deleteDivision` | POST/DELETE | `system.admin` |
| `rbacService.upsertDepartment/deleteDepartment` | POST/DELETE | `system.admin` |
| `rbacService.upsertTeam/deleteTeam` | POST/DELETE | `system.admin` |
| `rbacService.upsertRbacUser/deleteRbacUser` | POST/DELETE | `system.admin` |
| `adminApi.resetUserPassword(userId)` | POST | `system.admin` |
| `rbacService.upsertApplication/deleteApplication` | POST/DELETE | `system.admin` |
| `applicationMembershipApi.list/add/changeRole/remove` | various | `system.admin` |
| `rbacService.upsertFunctionalRole/deleteFunctionalRole` | POST/DELETE | `system.admin` |
| `adminApi.listPermissions` | GET | `system.admin` |
| `dataQualityApi.summary/list/assign/bulkAssign` | various | `system.admin` |
| `applicationCatalogApi.list` | GET | All authenticated |

---

## 19. Realtime / Jobs

- **Audit log** untuk semua mutation RBAC (kritis untuk compliance).
- **Session invalidation** kalau user di-deactivate atau permission diubah.

---

## 20. Open Gaps / TODO

- SSO/SAML integration belum.
- Permission matrix UI belum bisa edit rules in-code.
- Audit trail viewer per user belum.
- Bulk user import (CSV) belum ada.
- Custom application criticality tier configurable belum.

---

**Lihat juga:** [Settings](./settings.md) · [Profile](./profile.md) · semua modul (consume RBAC)
