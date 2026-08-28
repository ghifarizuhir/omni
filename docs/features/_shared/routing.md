# Routing & Module Layout — Shared Spec

Status: **Draft**
Used by: **semua route** — `src/routes/index.tsx:106-253` + `src/App.tsx:1-13` (`RouterProvider`) + semua `*Layout.tsx` dengan `<Outlet />` (Monitoring, Releases, Deployments, Testing, Availability, Capacity, Continuity, Measurement, Improvement, Portal, KB, Admin, OnCall) + `src/components/layout/AppShell.tsx:11-102` + `src/components/auth/RequireAuth.tsx:1-34` + `src/components/auth/RequirePasswordChange.tsx:1-13`
Source: `src/routes/index.tsx:106-253` · `src/App.tsx:1-13` · `src/routes/monitoring/MonitoringLayout.tsx:1-87` (canonical Module Layout) · `src/components/layout/AppShell.tsx:1-102` · `src/components/layout/Sidebar.tsx` · `src/routes/NotFound.tsx:1-25` · `src/lib/auth/session.ts:1-73` · `src/index.css:7-59` (`ois-*` tokens) · `docs/design/08-design-system.md` · `docs/design/02-api-contract.md` · `docs/DESIGN-SYSTEM.md` §Module Layout · terra `_shared/routing.md` (ref parity, adapted — OIS concrete per-type routes vs terra generic `/entities/:typeKey`)
Tokens: `src/index.css:7-59` (`ois-*`)
Ref: [`../../design/02-api-contract.md`](../../design/02-api-contract.md) · [`../../design/08-design-system.md`](../../design/08-design-system.md) · [`../../../src/index.css`](../../../src/index.css)

---

## Purpose

Satu kontrak routing untuk seluruh OIS. Tujuannya:

- **URL = deep link.** Refresh atau paste `/incidents/INC-…`, `/monitoring/events/:id`, `/changes/:changeId`, `/improvement/kanban` tetap render context yang sama. Tidak ada `activeTab` state yang hilang saat reload (divergence dari terra v3 `useState<ModuleId>` di `App.tsx` — OIS sudah router-based).
- **Module Layout = shared chrome + `<Outlet />`.** Tiap module dengan 3+ sub-pages (Monitoring 5 tabs, Releases 3, Improvements 4, Availability 3, dst.) share satu `*Layout.tsx` yang me-render header accent strip + tab bar + `<Outlet />`. Page doc cukup declare `Route: /monitoring/events`; layout behavior ada di sini.
- **Auth gate eksplisit.** Unauthenticated → `RequireAuth` → `Navigate /login replace state:{from}`; `mustChangePassword` → `RequirePasswordChange` → `/change-password`. Setelah login sukses `navigate(redirectTo, {replace:true})`.
- **Shell preserved.** 404 (`NotFound`) dan semua authed page tetap di dalam `AppShell` (Sidebar + TopBar + `Outlet`). Login & ChangePassword adalah satu-satunya layout di luar shell.
- **Single source of truth.** Feature doc (`incidents.md`, `monitoring.md`, dst.) hanya declare path mereka; history action, auth, tab active, accent, 404, AppShell — semua di sini.

Parity dengan terra `_shared/routing.md`: konsep URL-as-truth, `returnTo`/`from`, `replace` vs `push`, `NavLink` active — dipertahankan. Divergensi OIS: **concrete per-type routes** (`/incidents/:incidentId`, `/problems/:problemId`, `/releases/:releaseId`, …) bukan generic `/entities/:typeKey/:id`; auth via component guard (`RequireAuth` + `useLocation state`) bukan `loader requireAuth`; filter/sort state **belum URL-synced** (lokal `useState` + `FilterDropdown`, lihat §Query Params).

---

## Current State (snapshot `src/routes/index.tsx:106-253` → `src/App.tsx:5`)

### Router instantiation

```tsx
// src/App.tsx:1-13
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { CurrentUserProvider } from './lib/rbac/CurrentUserContext';
const router = createBrowserRouter(routes);
export default function App() {
  return (
    <CurrentUserProvider>
      <RouterProvider router={router} />
    </CurrentUserProvider>
  );
}
```

- `createBrowserRouter(routes)` — data router, bukan `BrowserRouter`. Mendukung `Navigate`, `NavLink`, `Outlet`, `useLocation`/`useNavigate`/`useParams`.
- `CurrentUserProvider` membungkus router — RBAC `Can`/`useCan` tersedia di semua route (`src/lib/rbac/*`).
- Tidak ada `ScrollRestoration` atau route `loader` di OIS saat ini — navigasi & data fetch via `useResource`/`useEffect` di component, bukan `loader prefetch`.

### Route tree (nested)

```
routes: RouteObject[]  (src/routes/index.tsx:106)
├─ /login                  → <Login />                          (public, outside shell)
└─ <RequireAuth />                                           // src/components/auth/RequireAuth.tsx:7 — apiFetch /auth/me gate
   ├─ /change-password     → <ChangePassword />                 (authed, outside AppShell, outside RequirePasswordChange)
   └─ <RequirePasswordChange />                                // src/components/auth/RequirePasswordChange.tsx:5 — mustChangePassword guard
      └─ /                 → <AppShell />                      // src/components/layout/AppShell.tsx:11 — Sidebar + TopBar + <Outlet /> + ScopeProvider
         ├─ index          → <Dashboard />                      // /
         ├─ cmdb           → <CmdbShell />
         ├─ cmdb/audit     → <CMDBAudit />
         ├─ cmdb/:ciId     → <CMDBDetail />
         ├─ monitoring     → <MonitoringLayout />  ─┬─ index    → <MonitoringOverview />
         │                                           ├─ events   → <EventStream />
         │                                           ├─ rules    → <MonitoringRules />
         │                                           ├─ routing  → <AlertRouting />
         │                                           └─ coverage → <CoverageReport />
         ├─ monitoring/events/:id → <EventDetail />             // outside MonitoringLayout — detail full-page, bukan tab
         ├─ incidents      → <IncidentQueue />
         ├─ incidents/analytics → <IncidentAnalytics />
         ├─ incidents/major/:incidentId → <MajorIncidentWarRoom />
         ├─ incidents/:incidentId       → <IncidentDetail />
         ├─ problems       → <ProblemList />
         ├─ problems/:problemId/rca → <RCAWorkspace />
         ├─ problems/:problemId     → <ProblemDetail />
         ├─ kedb           → <KEDB />
         ├─ requests       → <RequestQueue />
         ├─ requests/:requestId → <RequestDetail />
         ├─ portal         → <PortalLayout />  ─┬─ index      → <PortalHome />
         │                                       ├─ catalog    → <Catalog />
         │                                       └─ my-requests→ <MyRequests />
         ├─ portal/catalog/:itemId → <CatalogItemDetail />     // outside PortalLayout
         ├─ kb             → <KBLayout />      ─┬─ index      → <KBBrowse />
         │                                       ├─ analytics  → <KBAnalytics />
         │                                       └─ editor     → <KBEditor />
         ├─ kb/editor/:slug → <KBEditor />                     // outside KBLayout — slug param reuse
         ├─ kb/:slug        → <ArticleView />                  // outside KBLayout
         ├─ changes         → <ChangeCalendar />                // list/calendar default
         ├─ changes/new     → <NewChange />                    // 4-step wizard, outside calendar
         ├─ changes/calendar→ <ChangeCalendar />               // alias
         ├─ changes/cab     → <CABWorkspace />
         ├─ changes/:changeId → <ChangeDetail />
         ├─ releases       → <ReleasesLayout />  ─┬─ index   → <ReleasesList />
         │                                         ├─ pipeline→ <ReleasePipeline />
         │                                         └─ notes   → <ReleaseNotes />
         ├─ releases/:releaseId → <ReleaseDetail />            // outside layout
         ├─ deployments    → <DeploymentsLayout /> ─ index → <DeploymentsQueue />
         ├─ deployments/:deploymentId → <DeploymentDetail />
         ├─ environments   → <DeploymentsLayout /> ─ index → <Environments />  // reuse DeploymentsLayout chrome
         ├─ testing        → <TestingLayout />   ─┬─ plans   → <TestPlans />
         │                                         ├─ cases   → <TestCases />
         │                                         ├─ runs    → <TestRuns />
         │                                         └─ sign-off→ <SignOffQueue />
         ├─ availability   → <AvailabilityLayout />┬─ index  → <AvailabilityDashboard />
         │                                         ├─ sla    → <SLATargets />
         │                                         └─ outages→ <Outages />
         ├─ capacity       → <CapacityLayout />  ─┬─ index    → <CapacityDashboard />
         │                                         ├─ forecast → <CapacityForecast />
         │                                         └─ thresholds→<CapacityThresholds />
         ├─ continuity     → <ContinuityLayout />┬─ bia      → <BIAMatrixPage />
         │                                       ├─ dr-plans → <DRPlans />
         │                                       └─ tests    → <DRTests />
         ├─ dashboards     → <MeasurementLayout />┬─ index  → <DashboardsIndex />
         │                                        └─ exec   → <ExecutiveDashboard />
         ├─ reports        → <MeasurementLayout /> ─ index → <Reports />
         ├─ reports/builder→ <ReportBuilder />                 // outside MeasurementLayout — wizard page
         ├─ metrics        → <MeasurementLayout /> ─ catalog→ <MetricCatalog />
         ├─ improvement    → <ImprovementsLayout />┬─ index  → <ImprovementRegister />
         │                                         ├─ kanban → <ImprovementKanban />
         │                                         ├─ heatmap→ <ImprovementHeatmap />
         │                                         └─ benefits→<BenefitTracker />
         ├─ improvement/:initiativeId → <ImprovementDetail />  // outside ImprovementsLayout
         ├─ inbox          → <Inbox />
         ├─ notifications/preferences → <NotificationPreferences />
         ├─ notifications   → <Notifications />
         ├─ on-call        → <OnCallLayout />    ─┬─ index   → <OnCall />
         │                                         ├─ schedule→ <OnCallSchedule />
         │                                         └─ overrides→<OnCallOverrides />
         ├─ status         → <StatusPage />
         ├─ profile        → <Profile />
         ├─ settings       → <Settings />                      // centered hub, 5 panels
         ├─ applications/catalog → <ApplicationCatalog />      // all authed users, bukan admin-only
         ├─ admin          → <AdminLayout />     ─┬─ index    → <AdminOverview />
         │                                         ├─ divisions→ <Divisions />
         │                                         ├─ departments→<Departments />
         │                                         ├─ teams    → <AdminTeams />
         │                                         ├─ users    → <AdminUsers />
         │                                         ├─ applications→<AdminApplications />
         │                                         ├─ applications/:appId→<ApplicationDetail />
         │                                         ├─ roles    → <AdminRoles />
         │                                         ├─ permissions→<AdminPermissions />
         │                                         └─ data-quality→<DataQuality />
         ├─ *               → <NotFound />                     // ⚠️ wildcard inside AppShell
         ├─ ai              → <AiWorkspace />
         └─ ai/:sessionId   → <AiWorkspace />
```

> **Order caveat — `*` before `ai`:** `src/routes/index.tsx:245` `path:'*'` dideklarasikan **sebelum** `path:'ai'`/`'ai/:sessionId'` (247-248) di dalam `children` yang sama. Di React Router `createBrowserRouter`, `*` adalah catch-all dengan ranking terendah tetapi tetap di-evaluasi; penempatan sebelum `ai` berarti `/ai` dan `/ai/:sessionId` berisiko tertelan 404 jika wildcard di-hoist. Spec mencatat ini sebagai **edge case yang wajib diperbaiki**: pindahkan `*` ke posisi **terakhir** dalam `children` (setelah `ai` routes), atau ganti `*` dengan `errorElement` di `/` parent.

---

## URL Structure

Convention: kebab-case segment, plural collection (`/incidents`, `/changes`, `/releases`), singular param `:incidentId`/`:ciId`/`:slug`. Detail selalu `/:id` sibling di luar `*Layout` (bukan child tab) — kecuali tab dalam layout adalah view mode dari collection yang sama.

### Canonical route table (grouped by `src/routes/index.tsx` comments)

| Route | Page | Layout | Auth | Params | Sidebar (terra doc mapping) |
|-------|------|--------|------|--------|------------------------------|
| `/login` | `Login` | none (dark brand split) | public | `state:{from,reason}` via `Navigate` | — |
| `/change-password` | `ChangePassword` | none | `RequireAuth` | — | — |
| `/` | `Dashboard` | `AppShell` | gated | — | Overview |
| `cmdb` | `CmdbShell` (List+Graph tabs internal, bukan `<Outlet>`) | `AppShell` | gated | — | CMDB |
| `cmdb/audit` | `CMDBAudit` | `AppShell` | gated | — | CMDB |
| `cmdb/:ciId` | `CMDBDetail` (3-col) | `AppShell` | gated | `:ciId` = `id` atau `publicId` | CMDB |
| `monitoring` | `MonitoringLayout` → `MonitoringOverview` | `MonitoringLayout` + `AppShell` | gated | — | Monitoring |
| `monitoring/events` | `EventStream` | `MonitoringLayout` | gated | `?` local filter (belum URL) | Monitoring |
| `monitoring/rules` | `MonitoringRules` | `MonitoringLayout` | gated | — | Monitoring |
| `monitoring/routing` | `AlertRouting` | `MonitoringLayout` | gated | — | Monitoring |
| `monitoring/coverage` | `CoverageReport` | `MonitoringLayout` | gated | — | Monitoring |
| `monitoring/events/:id` | `EventDetail` (3-col) | `AppShell` | gated | `:id` (event publicId) | Monitoring |
| `incidents` | `IncidentQueue` | `AppShell` | gated | — | Incidents |
| `incidents/analytics` | `IncidentAnalytics` | `AppShell` | gated | — | Incidents |
| `incidents/major/:incidentId` | `MajorIncidentWarRoom` | `AppShell` | gated | `:incidentId` | Incidents |
| `incidents/:incidentId` | `IncidentDetail` (3-col) | `AppShell` | gated | `:incidentId` (`publicId`) | Incidents |
| `problems` | `ProblemList` | `AppShell` | gated | — | Problems |
| `problems/:problemId/rca` | `RCAWorkspace` | `AppShell` | gated | `:problemId` | Problems |
| `problems/:problemId` | `ProblemDetail` (3-col) | `AppShell` | gated | `:problemId` | Problems |
| `kedb` | `KEDB` | `AppShell` | gated | — | Problems |
| `requests` | `RequestQueue` | `AppShell` | gated | — | Requests |
| `requests/:requestId` | `RequestDetail` (stepper+5 tabs) | `AppShell` | gated | `:requestId` (`id` → resolve `publicId`) | Requests |
| `portal` | `PortalLayout` → `PortalHome` | `PortalLayout` | gated | — | Portal |
| `portal/catalog` | `Catalog` | `PortalLayout` | gated | — | Portal |
| `portal/my-requests` | `MyRequests` (4 tabs) | `PortalLayout` | gated | — | Portal |
| `portal/catalog/:itemId` | `CatalogItemDetail` | `AppShell` | gated | `:itemId` | Portal |
| `kb` | `KBLayout` → `KBBrowse` | `KBLayout` | gated | — | KB |
| `kb/analytics` | `KBAnalytics` | `KBLayout` | gated | — | KB |
| `kb/editor` | `KBEditor` (new) | `KBLayout` | gated | — | KB |
| `kb/editor/:slug` | `KBEditor` (edit) | `AppShell` | gated | `:slug` | KB |
| `kb/:slug` | `ArticleView` | `AppShell` | gated | `:slug` | KB |
| `changes` | `ChangeCalendar` (calendar default) | `AppShell` | gated | — | Changes |
| `changes/new` | `NewChange` (4-step wizard) | `AppShell` | gated | — | Changes |
| `changes/calendar` | `ChangeCalendar` (alias) | `AppShell` | gated | — | Changes |
| `changes/cab` | `CABWorkspace` | `AppShell` | gated | — | Changes |
| `changes/:changeId` | `ChangeDetail` (3-col, 8 tabs) | `AppShell` | gated | `:changeId` | Changes |
| `releases` | `ReleasesLayout` → `ReleasesList` | `ReleasesLayout` | gated | — | Releases |
| `releases/pipeline` | `ReleasePipeline` | `ReleasesLayout` | gated | — | Releases |
| `releases/notes` | `ReleaseNotes` | `ReleasesLayout` | gated | — | Releases |
| `releases/:releaseId` | `ReleaseDetail` (3-col, 6 tabs) | `AppShell` | gated | `:releaseId` | Releases |
| `deployments` | `DeploymentsLayout` → `DeploymentsQueue` | `DeploymentsLayout` | gated | — | Deployments |
| `deployments/:deploymentId` | `DeploymentDetail` (hero+stages) | `AppShell` | gated | `:deploymentId` | Deployments |
| `environments` | `DeploymentsLayout` → `Environments` (3-col) | `DeploymentsLayout` (reuse) | gated | — | Deployments |
| `testing/plans` | `TestPlans` | `TestingLayout` | gated | — | Testing |
| `testing/cases` | `TestCases` (9-col) | `TestingLayout` | gated | — | Testing |
| `testing/runs` | `TestRuns` (2-col cards) | `TestingLayout` | gated | — | Testing |
| `testing/sign-off` | `SignOffQueue` | `TestingLayout` | gated | — | Testing |
| `availability` | `AvailabilityLayout` → `AvailabilityDashboard` | `AvailabilityLayout` | gated | — | Availability |
| `availability/sla` | `SLATargets` | `AvailabilityLayout` | gated | — | Availability |
| `availability/outages` | `Outages` | `AvailabilityLayout` | gated | — | Availability |
| `capacity` | `CapacityLayout` → `CapacityDashboard` | `CapacityLayout` | gated | — | Capacity |
| `capacity/forecast` | `CapacityForecast` | `CapacityLayout` | gated | — | Capacity |
| `capacity/thresholds` | `CapacityThresholds` | `CapacityLayout` | gated | — | Capacity |
| `continuity/bia` | `BIAMatrixPage` (5×5) | `ContinuityLayout` | gated | — | Continuity |
| `continuity/dr-plans` | `DRPlans` | `ContinuityLayout` | gated | — | Continuity |
| `continuity/tests` | `DRTests` | `ContinuityLayout` | gated | — | Continuity |
| `dashboards` | `MeasurementLayout` → `DashboardsIndex` | `MeasurementLayout` | gated | — | Measurement |
| `dashboards/exec` | `ExecutiveDashboard` | `MeasurementLayout` | gated | — | Measurement |
| `reports` | `MeasurementLayout` → `Reports` | `MeasurementLayout` | gated | — | Measurement |
| `reports/builder` | `ReportBuilder` (wizard) | `AppShell` | gated | — | Measurement |
| `metrics/catalog` | `MetricCatalog` | `MeasurementLayout` | gated | — | Measurement |
| `improvement` | `ImprovementsLayout` → `ImprovementRegister` | `ImprovementsLayout` | gated | — | Improvement |
| `improvement/kanban` | `ImprovementKanban` (8-col) | `ImprovementsLayout` | gated | — | Improvement |
| `improvement/heatmap` | `ImprovementHeatmap` (scatter) | `ImprovementsLayout` | gated | — | Improvement |
| `improvement/benefits` | `BenefitTracker` (charts) | `ImprovementsLayout` | gated | — | Improvement |
| `improvement/:initiativeId` | `ImprovementDetail` (6 tabs, 3-col) | `AppShell` | gated | `:initiativeId` | Improvement |
| `inbox` | `Inbox` | `AppShell` | gated | — | Platform |
| `notifications/preferences` | `NotificationPreferences` | `AppShell` | gated | — | Platform |
| `notifications` | `Notifications` | `AppShell` | gated | — | Platform |
| `on-call` | `OnCallLayout` → `OnCall` | `OnCallLayout` | gated | — | Platform |
| `on-call/schedule` | `OnCallSchedule` | `OnCallLayout` | gated | — | Platform |
| `on-call/overrides` | `OnCallOverrides` | `OnCallLayout` | gated | — | Platform |
| `status` | `StatusPage` (single scroll 768px) | `AppShell` | gated | — | Platform |
| `profile` | `Profile` (centered) | `AppShell` | gated | — | Platform |
| `settings` | `Settings` (5-panel hub) | `AppShell` | gated | — | Platform |
| `applications/catalog` | `ApplicationCatalog` | `AppShell` | gated (all authed, bukan admin-only) | — | Platform |
| `admin` | `AdminLayout` → `AdminOverview` (6 stats) | `AdminLayout` | gated + `superadmin` (backend 403) | — | Admin |
| `admin/divisions` | `Divisions` | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/departments` | `Departments` | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/teams` | `Teams` (AdminTeams) | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/users` | `Users` (AdminUsers, System/Profile tabs) | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/applications` | `Applications` (AdminApplications) | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/applications/:appId` | `ApplicationDetail` (last_owner guard) | `AdminLayout` | gated + superadmin | `:appId` | Admin |
| `admin/roles` | `Roles` (System/Functional) | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/permissions` | `Permissions` (catalog+matrix) | `AdminLayout` | gated + superadmin | — | Admin |
| `admin/data-quality` | `DataQuality` (6 modules orphan fixer) | `AdminLayout` | gated + superadmin | — | Admin |
| `*` | `NotFound` | `AppShell` (shell preserved) | gated (inside AppShell) | — | — |
| `ai` | `AiWorkspace` | `AppShell` (special `isAiRoute`) | gated | — | AI |
| `ai/:sessionId` | `AiWorkspace` | `AppShell` | gated | `:sessionId` | AI |

> Sidebar grouping per `src/components/layout/Sidebar.tsx` sections: Observability (CMDB, Monitoring), Operations (Incidents, Problems, KEDB, Requests, Portal, KB), Change & Delivery (Changes, Releases, Deployments, Environments, Testing), Health & Intelligence (Availability, Capacity, Continuity, Dashboards, Reports, Metrics, Improvement), Platform (Inbox, Notifications, On-Call, Status, Profile, Settings, Applications Catalog), Admin (divisions…data-quality), AI.

---

## Module Layout — `<Outlet />` Pattern (canonical `MonitoringLayout`)

Semua layout yang me-wrap tab collection mengikuti **satu pattern** — `MonitoringLayout` adalah exemplar yang di-audit (`src/routes/monitoring/MonitoringLayout.tsx:1-87`).

### 1. Outer — negate AppShell padding, full-height flex

```tsx
// MonitoringLayout:26, ReleasesLayout:34, ImprovementsLayout:44, AvailabilityLayout:33
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
  {/* header shrink-0 */}
  {/* tab content flex-1 min-h-0 */}
</div>
```

- `-m-6` meniadakan `p-6` dari `AppShell` `<main>` (`src/components/layout/AppShell.tsx:79` `className='flex-1 overflow-y-auto p-6'` / `isAiRoute ? 'flex-1 overflow-hidden flex min-h-0'`). Wajib full-bleed; jangan tambah `p-6` wrapper di dalam layout.
- `flex-col` + `height: calc(100vh - 3.5rem)` — `3.5rem` = TopBar `h-14` (`56px`). Bukan `min-h-screen` atau `h-full`.
- `bg-ois-bg` (`#F7F8FA`) untuk outer; header pakai `bg-ois-surface` (`#FFFFFF`) agar kontras.
- Body tab content: `flex-1 min-h-0` wajib — tanpa `min-h-0` flex container overflow parent dan scroll trick gagal. Varian `ReleasesLayout:88`/`AvailabilityLayout:85` memakai `overflow-auto`; `MonitoringLayout:82`/`ImprovementsLayout:107` memakai `min-h-0` tanpa `overflow-auto` (scroll di-own oleh child page). Kedua sah; konsisten dalam satu layout — child yang `overflow-y-auto` harus match parent.

### 2. Shared header — `bg-ois-surface border-b border-ois-border shrink-0 z-30`

```tsx
<div className="bg-ois-surface border-b border-ois-border shrink-0 z-30">
  {/* title block */}
  {/* tab bar */}
</div>
```

- `shrink-0 z-30` — header tidak pernah scroll. `z-30` agar border di atas body saat scroll tab content.
- Title block — `flex items-stretch` dengan accent strip + content:

```tsx
<div className="flex items-stretch">
  <div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
  <div className="flex-1 px-6 py-4">
    <h1 className="text-xl font-bold text-ois-text">Monitoring</h1>
    <div className="flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap">
      <span className="font-medium text-ois-text">{activeEvents.length} active</span>
      <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
      <span className="font-semibold text-ois-danger">{p1Count} P1 open</span>
      {/* … */}
    </div>
  </div>
</div>
```

- Stripe `w-1 shrink-0 transition-colors duration-500` via inline `style={{backgroundColor}}` — bukan Tailwind class, agar transisi warna 500ms hidup.
- Accent logic **per-module** (live derive dari `useResource`):
  - **Monitoring** (`MonitoringLayout:23`): `p1>0 #B42318 : p2>0 #DC6803 : #1F4FD4`
  - **Releases** (`ReleasesLayout:27-31`): `rolledBack>0 #B42318 : deploying>0 #DC6803 : ready>0 #12B76A : #1F4FD4`
  - **Improvements** (`ImprovementsLayout:37-41`): `criticalBlocked>0 #B42318 : overdue>0 #DC6803 : totalActual≥50% estimated #12B76A : #1F4FD4`
  - **Availability** (`AvailabilityLayout:26-30`): `ongoing>0 #B42318 : breached>0 #B42318 : atRisk>0 #DC6803 : #12B76A`
  - Module lain (Capacity, Continuity, Testing, dll.) ikuti pola sama — warna hanya dari `ois-*` + severity hex.
- Stats row: `flex items-center gap-3 mt-1 text-xs text-ois-text-muted flex-wrap` dengan dot separator `w-1 h-1 rounded-full bg-ois-border-strong`. Angka emphasis `font-medium text-ois-text` atau `font-semibold text-ois-danger|warning|success`. **Jangan** pakai `text-gray-*` hardcode.

### 3. Tab bar — `NavLink` + `cn`, active `border-ois-primary`

```tsx
// MonitoringLayout:61-78, ReleasesLayout:68-85, ImprovementsLayout:86-103 (identik)
const TABS = [
  { label: 'Overview', to: '/monitoring',           icon: Activity, end: true },
  { label: 'Event Stream', to: '/monitoring/events', icon: Radio },
  // …
];
<nav className="flex px-4 overflow-x-auto scrollbar-hide">
  {TABS.map(tab => (
    <NavLink key={tab.to} to={tab.to} end={tab.end}
      className={({ isActive }) => cn(
        'flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
        isActive ? 'border-ois-primary text-ois-primary'
                 : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
      )}>
      <tab.icon size={14} />{tab.label}
    </NavLink>
  ))}
</nav>
```

- Active: `border-b-2 border-ois-primary text-ois-primary` — jangan `bg` fill. Inactive: `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong`.
- `end:true` hanya untuk index tab (`/monitoring`, `/releases`, `/improvement`, `/availability`, dst.) — tanpa `end`, `/monitoring` akan active di semua child (`/monitoring/events`).
- Icons `lucide-react` `size={14}` konsisten. Gap `gap-2` di button, `px-3 py-3`.
- `overflow-x-auto scrollbar-hide` — tab bar tidak wrap; swipe horizontal di mobile. Sidebar + tab count: Monitoring 5, Releases 3, Improvements 4, Availability 3, Testing 4, OnCall 3, KB 3, Portal 3, Deployments 1 (+ reuse untuk Environments), Admin 9 — semua wajib scroll-safe.
- `Tabs` component (`src/components/ui/Tabs.tsx`) **tidak** dipakai di module layout — render inline agar pin + `overflow-x-auto`.

### 4. Tab content — `<Outlet />`

```tsx
<div className="flex-1 min-h-0">
  <Outlet />
</div>
```

- `AppShell` sudah `flex flex-col flex-1 min-w-0 h-full overflow-hidden` (`AppShell:55-64`) dengan `<main>` yang `flex-1 overflow-y-auto p-6` (atau `overflow-hidden flex` untuk `isAiRoute`). Layout module me-negate `p-6` lalu me-render `<Outlet />` yang di-own oleh child page — child page yang mengatur `p-6`/`px-6 py-5` internal mereka.
- Jangan wrap `<Outlet />` dengan `AnimatePresence` di layout — `AppShell` tidak menganimasi route transition; jika transisi diinginkan, key dari `useLocation().pathname` (cf. terra `AnimatePresence mode="wait"`), bukan `activeTab`.

### 5. Live data di header

Header derive `accentColor` + stats dari `useResource(() => service.list(), [])` (`MonitoringLayout:16`, `ReleasesLayout:14`, dst.). Pattern: `const { data } = useResource(...); const items = data ?? [];` — empty `[]` fallback wajib agar `filter` tidak crash saat `loading`. Header tidak block render tab content; stats update reactively.

### Layout inventory (12 layouts, semua `<Outlet />`)

| Layout | File | Tabs | Accent source |
|--------|------|------|---------------|
| `MonitoringLayout` | `src/routes/monitoring/MonitoringLayout.tsx:15` | 5 Overview/Events/Rules/Routing/Coverage | `eventsService` P1/P2 |
| `ReleasesLayout` | `src/routes/releases/ReleasesLayout.tsx:13` | 3 Releases/Pipeline/Notes | `releasesService` rolled_back/deploying/ready |
| `DeploymentsLayout` | `src/routes/deployments/DeploymentsLayout.tsx` | 1 Queue (reuse untuk Environments) | — |
| `TestingLayout` | `src/routes/testing/TestingLayout.tsx` | 4 Plans/Cases/Runs/Sign-off | — |
| `AvailabilityLayout` | `src/routes/availability/AvailabilityLayout.tsx:13` | 3 Overview/SLA/Outages | `availabilityService` ongoing/breached/atRisk |
| `CapacityLayout` | `src/routes/capacity/CapacityLayout.tsx` | 3 Dashboard/Forecast/Thresholds | — |
| `ContinuityLayout` | `src/routes/continuity/ContinuityLayout.tsx` | 3 BIA/DR Plans/Tests | — |
| `MeasurementLayout` | `src/routes/measurement/MeasurementLayout.tsx` | 2 (Dashboards) + 1 (Reports) + 1 (Metrics/catalog) | — |
| `ImprovementsLayout` | `src/routes/improvement/ImprovementsLayout.tsx:17` | 4 Register/Kanban/Heatmap/Benefits | `improvementsService` criticalBlocked/overdue/benefit |
| `PortalLayout` | `src/routes/portal/PortalLayout.tsx` | 3 Home/Catalog/My Requests | — |
| `KBLayout` | `src/routes/kb/KBLayout.tsx` | 3 Browse/Analytics/Editor | — |
| `AdminLayout` | `src/routes/admin/AdminLayout.tsx` | 9 Overview/Divisions/Departments/Teams/Users/Applications/Roles/Permissions/Data Quality | — |
| `OnCallLayout` | `src/routes/platform/OnCallLayout.tsx` | 3 Overview/Schedule/Overrides | — |

Semua layout wajib: `-m-6 flex flex-col bg-ois-bg` + `calc(100vh - 3.5rem)` + `shrink-0 z-30` header + `w-1` stripe + `NavLink` tab bar + `<Outlet />` di `flex-1 min-h-0`. Jangan buat wrapper `-m-6` custom di detail page — detail page (`IncidentDetail`, `ChangeDetail`, `CMDBDetail`, dst.) punya wrapper `-m-6` sendiri sebagai 3-column page, bukan module layout.

---

## AppShell & Global Chrome

`src/components/layout/AppShell.tsx:11-102`

```
<div class="flex h-screen w-full bg-ois-bg overflow-hidden">  // AppShell:55 ScopeProvider
  <Sidebar collapsed={sidebarCollapsed} isAiRoute={isAiRoute} aiSidebarContent={aiSidebarContent} />
  <div class="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
    <TopBar onToggleSidebar onOpenInbox onToggleAi aiOpen showAi={!isAiRoute} />
    <div aria-hidden class="ois-topbar-stripe h-[2px] w-full shrink-0" style="linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)" />
    <main class={isAiRoute ? 'flex-1 overflow-hidden flex min-h-0' : 'flex-1 overflow-y-auto p-6'}>
      <Outlet context={{ setAiSidebarContent }} />
    </main>
  </div>
  <InboxDrawer />  (AnimatePresence)
  <AiQuickPanel /> (AnimatePresence, !isAiRoute)
  <CmdKPalette open={cmdKOpen} />  (Cmd+K / Ctrl+K)
</div>
```

- `ScopeProvider` wraps seluruh shell — `useScopedAppId`, `AppScopeSwitcher`, `PageScopeChip`, `ScopeMismatchModal` tersedia di semua `Outlet` (`docs/features/_shared/app-selector.md`).
- `isAiRoute = location.pathname.startsWith('/ai')` (`AppShell:20`) — AI route pakai `overflow-hidden flex` main agar workspace 3-col tidak double-scroll; non-AI pakai `overflow-y-auto p-6`.
- `Cmd+K` global (`AppShell:42-51`) `metaKey|ctrlKey + k` toggle `CmdKPalette` — ephemeral `useState`, bukan URL.
- Mid-session 401 listener (`AppShell:22-39`) — `apiFetch` di `src/services/core.ts` dispatch `auth:session-expired` pada 401; AppShell `navigate('/login', {replace:true, state:{from, reason:'expired'}})` — silent, no toast.
- `Sidebar` owns `collapsed` state ephemeral (`useState` di AppShell, bukan URL) + brand/mode + content switching; active highlight derive dari `useLocation().pathname.startsWith(item.path)` (bukan `activeTab`).

---

## Auth-Gated Routes

### `RequireAuth` (outer gate)

`src/components/auth/RequireAuth.tsx:7-34`

```tsx
export const RequireAuth: React.FC = () => {
  const location = useLocation();
  const [state, setState] = useState<'checking'|'authed'|'anon'>('checking');
  useEffect(() => {
    apiFetch('/auth/me').then(()=>setState('authed')).catch(e=>{
      if (e instanceof ApiError && e.status===401) setState('anon');
    });
  }, []);
  if (state==='checking') return <div className="flex min-h-screen items-center justify-center bg-ois-bg">Loading…</div>;
  if (state==='anon') return <Navigate to="/login" replace state={{ from: location.pathname+location.search }} />;
  return <Outlet />;
};
```

- `GET /api/v1/auth/me` (`docs/design/02-api-contract.md` §Auth) — cookie session. Semua route di bawah `requireAuth` di backend (`server/app.ts:126` `withScopedDb` + `req.tenantId`/`req.permissions`). Frontend gate mirror backend — jangan bypass.
- `checking` → centered `Loading…` `bg-ois-bg` (`RequireAuth:24-27`) — bukan skeleton penuh; sementara `/auth/me` resolve.
- `anon` → `Navigate /login replace state:{from}` — `replace` agar back tidak kembali ke anon page. `from = location.pathname + location.search` preserve filter/query.

### `RequirePasswordChange` (inner gate)

`src/components/auth/RequirePasswordChange.tsx:5-13`

```tsx
export function RequirePasswordChange() {
  const session = useAuthSession(); // src/lib/auth/session.ts:65 — cached /auth/me
  const location = useLocation();
  if (session?.user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
```

- `useAuthSession` (`src/lib/auth/session.ts:65`) — pub-sub cache `cached AuthSession` + `pending Promise` + `subscribers Set`. `loadSession()` fetch `/auth/me` sekali; `refreshAuthSession()` setelah login; `clearAuthSession()` saat logout/401 (`auth:session-expired` listener `session.ts:56-62`).
- `mustChangePassword` — user baru/onboarding flag; satu-satunya route yang lolos adalah `/change-password`. Jangan letakkan `/change-password` di dalam `AppShell` — ia di luar `RequirePasswordChange` tetapi di dalam `RequireAuth`.

### `/login` (public)

`src/routes/Login.tsx:12-57` — dark brand split (`bg-[#0A0A0A]`, violet→blue radial glows `rgba(31,79,212,0.22)`, grain, grid), `JAKARTA`/`MONO` fonts. `location.state` `from`/`reason` derive `redirectTo = navState?.from ?? '/'` (`Login:16`). Submit `POST /auth/login` → `refreshAuthSession()` → `navigate(redirectTo, {replace:true})` (`Login:46-48`). `sessionExpired` banner `bg-[#F79009]/10` jika `reason==='expired'` (`Login:219-222`). **Security:** `from` berasal dari `RequireAuth` state, bukan query param — tidak perlu whitelist regex external URL, tetapi tetap fallback `'/'` jika invalid.

### Session lifecycle

- Login: `apiFetch('/auth/login', {method:'POST', body:{email,password}})` → `refreshAuthSession()` → navigate `from`.
- Expired mid-session: `apiFetch` 401 → dispatch `auth:session-expired` → AppShell listener → `navigate('/login', {replace:true, state:{from, reason:'expired'}})` + `clearAuthSession` via `session.ts:57-60`.
- Logout (via `server/routes` + `apiFetch` — delegated): `clearAuthSession()` + `navigate('/login', {replace:true})` — `replace` agar back tidak ke authed page stale.

---

## Navigation Patterns

Hanya `useNavigate()` / `NavLink` / `Link` dari `react-router-dom`. Jangan `window.location.href = …` (bypass SPA).

| Source | Pattern | History |
|--------|---------|---------|
| Sidebar item click | `<NavLink to={item.path}>` atau `navigate(item.path)` | `push` |
| Module tab click | `<NavLink to={tab.to} end={tab.end}>` di `*Layout` | `push` |
| Entity row/card click di list | `navigate('/incidents/' + publicId)` / `navigate('/cmdb/' + ciId)` / `navigate('/monitoring/events/' + id)` | `push` |
| Detail back link (nav row `←`) | `navigate('/incidents')` / `navigate('/cmdb')` — deterministic parent, bukan `navigate(-1)` | `push` |
| Linked reference di detail | `navigate('/changes/' + changeId)` / `navigate('/problems/' + problemId)` | `push` |
| Header Create CTA submit | `navigate(entityRoute)` ke new `publicId` | `push` |
| Filter/sort change (belum URL-synced) | `setState` lokal, bukan `navigate` — lihat §Query Params | — |
| Logout | `navigate('/login', {replace:true})` | `replace` |
| Auth redirect anon | `<Navigate to="/login" replace state:{from}>` (`RequireAuth:31`) | `replace` |
| `mustChangePassword` | `<Navigate to="/change-password" replace />` (`RequirePasswordChange:10`) | `replace` |

> **Scope preservation via `ScopeProvider`:** saat app selector active (`ScopeValue` `app`), `PageScopeChip` + `ScopeMismatchModal` (`docs/features/_shared/app-selector.md`) handle scope — bukan `withAppScope(path)` helper ala terra. Navigasi antar page preserve scope via `ScopeContext`, bukan query param `?app=`. External deep link scope embed di URL jika eksplisit.

---

## Query Parameters (filters / sort / search / pagination)

**OIS saat ini tidak sync filter ke URL** — divergensi sengaja dari terra `URL = state truth`. Filter state hidup di `useState`/`FilterDropdown` lokal per page (`IncidentQueue`, `EventStream`, `CMDBList`, dll.). Refresh kehilangan filter (kecuali page yang persist via `localStorage`).

| Aspect | Terra (`_shared/routing.md`) | OIS (current) |
|--------|------------------------------|---------------|
| Library | React Router 7 `createBrowserRouter` | sama — `createBrowserRouter(routes)` |
| Filter state | `useSearchParams` + Zod + `navigate({search}, {replace:true})` | `useState` lokal + `FilterDropdown` (`src/components/ui/FilterDropdown.tsx`) + `Input` search — tidak `useSearchParams` |
| Encoding | CSV multi-value (`?status=open,investigating`) | — (belum ada URL encoding) |
| Persistence | `replace` per tweak, `push` untuk pagination | — |
| Deep link share filter | Ya (`/incidents?status=…`) | Tidak — share link hanya entity `/:id` atau tab `/:layout/:subpath` |
| Back restores filter | Ya | Tidak — back keluar page, filter reset |
| `page`/`pageSize` | 25/50/100 via URL | 25/50/100 via component state (jika ada) |

**Implikasi untuk page doc:** jangan document `?q=&status=&sort=&page=` di §URL Structure kecuali page tersebut benar-benar mengadopsi URL-sync (saat ini tidak ada). Jika Phase 2 migrasi ke URL-sync, spec Phase 2 di bawah berlaku (CSV, `replace` untuk tweak, `push` untuk pagination, Zod validate, strip invalid + toast).

**Phase 2 deferred (jika URL-sync diadopsi):** `q`/`status`/`priority`/`apps`/`risk_level`/`environment`/`approval`/`kb_type`/`asset_kind`/`war_room`/`createdFrom`/`createdTo`/`scheduledFrom`/`scheduledTo`/`sort`/`page`/`pageSize` — encoding CSV, boolean `1`/`0`, `sort=field:dir,field:dir`, validation via Zod `parse-search-params.ts`, `replace` untuk filter tweak (debounce 300ms), `push` untuk pagination + "Clear all".

---

## 404 / 403 Pages

Keduanya **preserve shell** — `NotFound` mount di dalam `AppShell` (`src/routes/index.tsx:245` `path:'*'` child dari `path:'/' element:<AppShell>`), user tidak stranded.

### `404 — Not Found` (`src/routes/NotFound.tsx:6-25`)

- Trigger: wildcard `*` catch-all; atau entity `publicId` invalid (loader/client `find(... ) ?? 404` guard di detail page).
- Layout: `flex flex-col items-center justify-center min-h-[400px] text-center p-8`, icon `FileQuestion size 32` di `w-16 h-16 rounded-full bg-ois-danger-pale text-ois-danger`, `h1 text-2xl font-bold text-ois-text "404 - Page Not Found"`, `p text-ois-text-muted max-w-md "We couldn't find … It might have been retired or you may not have sufficient permissions."`, `<Link to="/"> <Button variant="primary"> <Home 18/> Back to Dashboard </Button> </Link>`.
- Sidebar active muted (tidak ada item active) — `NotFound` tidak di Sidebar `path` list.
- **Caveat:** wildcard saat ini di `src/routes/index.tsx:245` sebelum `ai` routes — `/ai` akan 404. Fix: pindahkan `*` ke akhir.

### `403 — Forbidden` (backend-driven, belum dedicated page)

- Trigger: `req.scoped.*` `ScopeViolationError` (`server/scope/errors.ts:9`) → 403 `{ error: 'scope_violation' }` (`server/app.ts` error handler) atau `requirePermission(...)` (`server/middleware/auth.ts:48`) deny.
- Frontend: belum ada `/403` dedicated route di `src/routes/index.tsx` — deny di-handle sebagai inline fallback `Can` (`fallback` italic `text-xs text-ois-text-subtle`) atau detail 404 guard + toast. Phase 2 consider dedicated `/403` dengan layout `NotFound` clone + `text-ois-danger` + "Contact your admin".
- Shell preserved jika `/403` ditambahkan — jangan mount di luar `AppShell`.

---

## Loading & Transitions

### Route transition

OIS tidak menganimasi route transition via `AnimatePresence mode="wait"` di `AppShell` (divergensi dari terra preservation #1). Animasinya ada di component level (`ois-fade-up 0.5s ease-out`, `ois-topbar-stripe 0.4s`, `ois-shimmer 7s linear` — `src/index.css:93-150`). Jika route transition diinginkan di masa depan:

```tsx
// hypothetical AppShell wrapper
const location = useLocation();
<AnimatePresence mode="wait">
  <motion.div key={location.pathname} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:0.15}}>
    <Outlet />
  </motion.div>
</AnimatePresence>
```

Caveat: panel/alias detail (`/incidents/:id` outside) tidak trigger main transition jika key = top-level segment — child punya `AnimatePresence` sendiri.

### Loading state

| Phase | UI |
|-------|----|
| `RequireAuth checking` | `flex min-h-screen items-center justify-center bg-ois-bg text-[14px] text-[#6B7280] "Loading…"` (`RequireAuth:24`) |
| Module layout header loading | `useResource` `data ?? []` — header render `0` count, tidak block tab |
| Detail page fetching | `flex items-center justify-center py-24 text-sm text-ois-text-subtle "Loading…"` atau skeleton `ois-shimmer-text` |
| Entity not found | centered `AlertCircle 40px text-ois-danger` + `Back to <parent>` button |
| Query refetch background | tidak ada global progress bar — Phase 2 consider `useNavigation().state==='loading'` 2px `bg-ois-primary` stripe |

### Prefetch (Phase 2 deferred)

Hover intent sidebar/row → prefetch `useResource` 200ms delay. Phase 1 tidak implement.

---

## Keyboard & Global Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Cmd/Ctrl + K` | Toggle `CmdKPalette` (`AppShell:42-51`) | global — `AppShell` listener, ephemeral `useState` |
| `Cmd/Ctrl + N` | (future) Quick Create modal | Phase 2 |
| `Esc` | Close `InboxDrawer` / `AiQuickPanel` / detail popover (`MoreHorizontal` menu) | per-overlay |
| `Browser back/forward` | Native history — `push` untuk tab/row, `replace` untuk auth redirects | browser |
| `Tab` / `Shift+Tab` | Focus nav — sidebar items, TopBar buttons, list rows | browser default |

`CmdKPalette` tetap di root `AppShell` — tidak per-route. Modal open = ephemeral, bukan URL.

---

## API Touchpoints

Routing layer tidak fire API langsung — delegate ke component `useResource`/`apiFetch` dan guards `RequireAuth`/`useAuthSession`.

| Concern | Endpoint | File | Notes |
|---------|----------|------|-------|
| Auth gate `RequireAuth` | `GET /api/v1/auth/me` | `RequireAuth.tsx:13` `apiFetch('/auth/me')` | cookie session; 401 → `state:'anon'` |
| Session cache | `GET /api/v1/auth/me` | `src/lib/auth/session.ts:34-40` `loadSession()` | pub-sub `cached`/`pending`/`subscribers` |
| Login | `POST /api/v1/auth/login` | `Login.tsx:46` `apiFetch('/auth/login', {method:'POST'})` | rate-limited per-IP 20/min |
| Logout | `POST /api/v1/auth/logout` | `server/routes` + `clearAuthSession()` | exempt scope |
| Module header stats | `GET /api/v1/events` etc. | `*Layout.tsx` `useResource(() => eventsService.list())` | `req.scoped` + `requirePermission` |
| 401 expired dispatch | `auth:session-expired` event | `src/services/core.ts` `apiFetch` → `AppShell:22-39` + `session.ts:56-62` | `navigate('/login', {replace:true, state:{from, reason:'expired'}})` |

Global contract lihat `docs/design/02-api-contract.md` — prefix `/api/v1` (Vite proxy `/api` → `VITE_API_PROXY_TARGET` `http://localhost:3001`), `withScopedDb` (`server/middleware/scopedDb.ts:19`) attaches `req.scoped` + `req.tenantId`/`req.permissions`, route handler **wajib** `req.scoped.*` bukan `prisma` langsung (lint `no-restricted-imports` `server/routes/**/*.ts`, exempt: `admin.ts`, `admin/*`, `applications.ts`, `platform.ts`, `auth.ts`, `integrations.ts`). `requirePermission('cmdb.write')` layering (`server/middleware/auth.ts:48`).

---

## Design Preservation

Wajib pertahankan:

1. **Tokens exclusively `ois-*`** (`src/index.css:7-59`) — `ois-primary #1F4FD4`, `ois-primary-hover #1A42B5`, `ois-primary-pale #EEF2FF`, `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-success #12B76A`/pale `#ECFDF3`, `ois-warning #F79009`/pale `#FFFAEB`, `ois-danger #F04438`/pale `#FEF3F2`, `ois-info #0BA5EC`/pale `#F0F9FF`, `ois-sev-p1 #B42318`, `ois-sev-p2/3 #DC6803`, `ois-sev-p4 #027A48`, sidebar `ois-sidebar-bg #F4F5F7` etc. — jangan hardcode hex atau pakai `terra-*`/`linear-card` dark.
2. **Router** `createBrowserRouter(routes)` + `RouterProvider` di `App.tsx:5-13` + `CurrentUserProvider` wrapper — jangan ganti ke `BrowserRouter` tanpa `loader` parity.
3. **Route nesting** `/login` public → `RequireAuth` → `/change-password` → `RequirePasswordChange` → `/` (`AppShell`) — jangan pindahkan `/change-password` ke dalam `AppShell`.
4. **AppShell chrome** `flex h-screen w-full bg-ois-bg overflow-hidden` + `Sidebar` + `TopBar` + `ois-topbar-stripe h-[2px] linear-gradient(90deg, #1F4FD4 0%, #0BA5EC 100%)` + `<main>` `flex-1 overflow-y-auto p-6` (atau `overflow-hidden flex min-h-0` untuk `isAiRoute`) + `ScopeProvider` (`AppShell:54-55`).
5. **Module Layout outer** `-m-6 flex flex-col bg-ois-bg` + `height: calc(100vh - 3.5rem)` — jangan ganti ke `p-6` atau `min-h-screen`.
6. **Header** `bg-ois-surface border-b border-ois-border shrink-0 z-30` dengan `flex items-stretch` stripe `w-1 shrink-0 transition-colors duration-500` + title `text-xl font-bold text-ois-text` + stats `text-xs text-ois-text-muted` + dots `w-1 h-1 rounded-full bg-ois-border-strong`.
7. **Tab bar** `flex px-4 overflow-x-auto scrollbar-hide` + `NavLink` `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors` active `border-ois-primary text-ois-primary` inactive `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` + `lucide-react 14`.
8. **Accent strip** inline `style={{backgroundColor}}` dengan `transition-colors duration-500` — domain-derived P1/P2/ready/breached/overdue logic, bukan static.
9. **`<Outlet />` di `flex-1 min-h-0`** — module layout dan `AppShell` keduanya require `min-h-0` untuk flex scroll trick. Jangan wrap dengan `AnimatePresence` di layout tanpa audit.
10. **Auth flow** `Navigate replace state:{from}` + `navigate(redirectTo, {replace:true})` — `replace` untuk anon/mustChangePassword/logout/expired; `push` untuk tab/row.
11. **404 shell preserved** — `NotFound` di dalam `AppShell`, `flex min-h-[400px]` + `FileQuestion 32` di `bg-ois-danger-pale` + `Link to="/"`.
12. **No dark overlay** — `AppShell` `bg-ois-bg` light; Login dark `bg-[#0A0A0A]` isolated — jangan bleed `0A0A0A` ke authed shell.
13. **Radius/shadow** `rounded-ois-card 8px` · `rounded-ois-btn 6px` · `shadow-ois-card`/`ois-dropdown`/`ois-modal` (`src/index.css:55-58`) — tab header/layout tidak pakai shadow.
14. **Scrollbar** global `4px` thumb `#D0D5DD` hover `#98A2B3` `rounded-full` (`src/index.css:68-84`); tab bar `scrollbar-hide`.
15. **Scope & auth** global `requireAuth` (backend `server/app.ts:126`) + `withScopedDb` + `requirePermission(...)` + `ScopeViolationError` 403 — frontend mirror via `RequireAuth` + `Can`/`CurrentUserContext`.

---

## Edge Cases

| Case | Expected behavior | Source |
|------|-------------------|--------|
| **Reload saat module tab active** | URL `/monitoring/rules` → re-render `MonitoringLayout` + tab `Rules` active (NavLink `isActive`) | `MonitoringLayout:62-83` `NavLink isActive` |
| **Reload di detail outside layout** | `/monitoring/events/:id`, `/incidents/:incidentId`, `/changes/:changeId` → render `AppShell` + detail directly (tidak flash layout tab) | `index.tsx:131,136,161` sibling outside `*Layout` |
| **Wildcard `*` order** | Saat ini `*` sebelum `ai` → `/ai` tertelan 404. Fix: pindahkan `*` ke akhir `children`. | `index.tsx:245-248` |
| **Login deep link** | `/incidents/INC-…` saat anon → `RequireAuth:31` → `/login` `replace state:{from:'/incidents/INC-…?…'}` → setelah login `navigate(from, {replace:true})` — `replace` agar back tidak ke `/login`. | `RequireAuth:31`, `Login:16,48` |
| **Session expired mid-module** | `apiFetch` 401 → `auth:session-expired` → `AppShell:28-35` → `/login` `replace state:{from: location.pathname+search, reason:'expired'}` + `session.ts:57-60` clear cache + login banner `sessionExpired` `bg-[#F79009]/10` | `AppShell:22-39`, `Login:219-222` |
| **`mustChangePassword`** | `RequirePasswordChange:9` redirect `/change-password` `replace` — hanya `/change-password` lolos. | `RequirePasswordChange:9-10` |
| **Detail entity not found** | `IncidentDetail:407-420` / `ChangeDetail:88-95` guard `if (!rawEntity||!entity) return 404` centered `AlertCircle` + `navigate('/parent')` button. `NotFound` inside `AppShell` untuk wildcard. | `entity-detail-page.md:222` |
| **KB slug collision** | `/kb/editor/:slug` vs `/kb/:slug` — order `editor/:slug` sebelum `:slug` (`index.tsx:154-155`) mencegah `editor` tertelan sebagai slug. | `index.tsx:149-155` `KBLayout` + `kb/editor/:slug` vs `kb/:slug` |
| **CMDB `:ciId` ambiguous** | `cmdb/:ciId` matches `cmdb/audit` jika order salah — fix: `cmdb/audit` declare sebelum `cmdb/:ciId` (`index.tsx:121-122`). | `index.tsx:120-122` |
| **`environments` reuse `DeploymentsLayout`** | `/environments` → `<DeploymentsLayout><Environments /></DeploymentsLayout>` — reuse chrome, bukan dedicated layout. Sidebar highlight derive dari `pathname.startsWith`. | `index.tsx:172-174` |
| **`reports/builder` outside `MeasurementLayout`** | `/reports/builder` sibling dari `reports` layout (`index.tsx:204`) — builder wizard tidak pakai measurement tab bar. `reports` `index:true` tetap render `Reports` di layout. | `index.tsx:201-204` |
| **`improvement` singular** | Route `improvement` bukan `improvements` (`index.tsx:208-215`) — konsisten dengan `src/types` + docs; jangan rename tanpa migrasi `TABS to:'/improvement/*'`. | `ImprovementsLayout:11-15` |
| **Trailing slash** | React Router tidak normalize `/incidents/` → redirect — Phase 2 consider middleware `redirect('/incidents')`. | terra routing §Edge Cases 5 |
| **Very long filter URL (future)** | Jika URL-sync diadopsi, CSV filter `50 status + 50 app ≈ 500 chars` safe; browser limit ~2000. Exceed → `localStorage` saved filters. | terra routing §Edge Cases 12 |
| **Multi-tab session** | 2 tab browser share cookie session; TanStack/`useResource` cache terpisah per-tab. Logout di tab A tidak auto-logout tab B — Phase 2 `storage` event sync. | `session.ts:56-62` `auth:session-expired` listener |

---

## API Touchpoints

Ref: `docs/design/02-api-contract.md` — global `Prefix /api/v1`, `Vite proxy /api → VITE_API_PROXY_TARGET`, `withScopedDb` + `requireAuth` + `requirePermission` + `ScopeViolationError 403`.

Routing tidak declare endpoint per-page — page doc masing-masing declare; shared contract hanya auth gate + layout live-data.

| Call | Method | Permission | Used in |
|------|--------|------------|---------|
| `/api/v1/auth/me` | `GET` | cookie session | `RequireAuth.tsx:13`, `session.ts:36` |
| `/api/v1/auth/login` | `POST` | public | `Login.tsx:46` |
| `/api/v1/auth/logout` | `POST` | authed | `server/routes/auth` |
| `GET /events` etc. | `GET` | `event.read` | `MonitoringLayout:16` header stats |
| `GET /incidents`, `GET /releases` etc. | `GET` | per-module `*.read` | `*Layout` accent derive |

Delegate per-page endpoint matrix ke page doc (`monitoring.md`, `incidents.md`, dll.) §API Touchpoints.

---

## Phase 2 Deferred

- **Wildcard fix** — pindahkan `*` ke akhir `children` setelah `ai` routes; atau ganti `*` dengan `errorElement` di `/` parent (`docs/features/_shared/_backlog.md`).
- **401/403 dedicated page** — tambah `/403` route dengan `AppShell` + inline `Can fallback` parity.
- **`ScrollRestoration`** — `React Router 7` `<ScrollRestoration getKey={pathname prefix}>` di `AppShell` agar list + detail sibling share scroll.
- **Prefetch on hover** — hover `Sidebar`/`NavLink` → `useResource` prefetch 200ms.
- **Code splitting** — `React.lazy` per `*Layout` route (bundle >500KB gzip).
- **URL-sync filters** — migrate list filters dari local `useState` ke `useSearchParams` + Zod + CSV + `replace`/`push` (lihat §Query Params).
- **Saved views / bookmarks** — user save filter state per page → quick access di sidebar.
- **Hash deep link** — `/incidents/:id#comments` scroll ke section di detail.
- **Trailing slash / case normalize middleware** — client redirect `/Incidents/` → `/incidents`.
- **Storage cross-tab sync** — `storage` event `logout`/`auth:session-expired` sync antar tab.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep shared spec — migrate `src/routes/index.tsx:106-253` (all routes + nested `RequireAuth`→`RequirePasswordChange`→`AppShell`), `src/App.tsx:1-13` `createBrowserRouter+RouterProvider+CurrentUserProvider`, canonical Module Layout from `src/routes/monitoring/MonitoringLayout.tsx:1-87` (`-m-6`/`calc(100vh-3.5rem)`/`bg-ois-surface`/`shrink-0 z-30`/`w-1` accent `P1 #B42318`/`P2 #DC6803`/`#1F4FD4` + `NavLink` `border-ois-primary` + `<Outlet />` `flex-1 min-h-0`), inventory 12 `*Layout` + `AppShell:11-102` (`flex h-screen`/`ScopeProvider`/`ois-topbar-stripe`/`CmdKPalette`/401 listener) + `RequireAuth:1-34` (`/auth/me` + `Navigate replace state:{from}`) + `RequirePasswordChange:1-13` + `NotFound:1-25` (`bg-ois-danger-pale` inside shell) + `Login:16-48` (`state.from` → `replace`) + `o is-*` tokens `src/index.css:7-59` + `02-api-contract`/`08-design-system` refs; adapted from terra `_shared/routing.md` (concrete per-type `:incidentId` vs generic `/entities/:typeKey`) | `src/routes/index.tsx:106` · `src/App.tsx:1` · `src/routes/monitoring/MonitoringLayout.tsx:1` · `src/components/layout/AppShell.tsx:11` · `src/components/auth/RequireAuth.tsx:7` · `src/index.css:7` · `docs/design/02-api-contract.md` · `docs/design/08-design-system.md` |
