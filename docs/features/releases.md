# Releases — Release Management (ITIL 4)

Status: **Draft**
Route: `/releases` (layout), `/releases/pipeline` (matrix), `/releases/notes` (feed), `/releases/:releaseId` (detail)
Sidebar: Change & Delivery · Releases
Source: `src/routes/releases/ReleasesLayout.tsx`, `ReleasesList.tsx`, `ReleaseDetail.tsx`, `ReleasePipeline.tsx`, `ReleaseNotes.tsx` · `src/components/releases/*` · `server/routes/itsm.ts` (`itsmRouter` `/releases`) · `src/types/release.ts` · `src/lib/constants.ts` (`releaseStatusMeta`, `releaseTypeMeta`, `stageStatusMeta`)

---

## Intent

Mengelola **paket rilis** sebagai composition of changes/problems/incidents dari `planning` hingga `released`, dengan pipeline visualization per environment (dev → staging → prod), approval gate, dan release notes publik. Rilis = envelope yang membungkus change portfolio untuk satu component/version.

ITIL 4: Release Management controls the introduction of new/changed services into production via staged deployment with validation gates.

## Current State (snapshot `src/routes/index.tsx:162-167`)

- `src/routes/index.tsx:162` → `<ReleasesLayout />` at `/releases` (parent Module Layout)
- `src/routes/index.tsx:163` → `<ReleasesList />` at `/releases` `index:true`
- `src/routes/index.tsx:164` → `<ReleasePipeline />` at `/releases/pipeline`
- `src/routes/index.tsx:165` → `<ReleaseNotes />` at `/releases/notes`
- `src/routes/index.tsx:167` → `<ReleaseDetail />` at `/releases/:releaseId` (outside layout, full-page 3-col)
- Components: `ReleaseCard`, `ReleaseStatusPill`, `ReleaseTypeChip`, `StagesMiniStepper`, `NewReleaseModal` (`src/components/releases/`) + `StageCard`/`StageCell` inline, `AuditTimeline` (`src/components/common/AuditTimeline.tsx`).
- API: `itsmRouter` in `server/routes/itsm.ts:133-139` — `GET /releases`, `GET /releases/:publicId` (`requirePermission('release.read')` + `req.scoped.releases.*` via `server/scope/scopedDb.ts:577`). No write endpoints yet.
- Types: `ReleaseType major|minor|patch|hotfix`, `ReleaseStatus 9` (`planning→cancelled`), `ReleaseComposition` (changes/problemsFixed/incidentsResolved/prerequisites), `ReleaseStage` (environment/pending→skipped/testsPassed/postDeployHealthCheck/approvalRequired) + `currentStageIndex`, `featureFlags[]` (`src/types/release.ts:1-101`).
- Styling: `ois-*` tokens (`src/index.css`) — `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`.

**Working:**
- ReleasesLayout accent bar (`ReleasesLayout.tsx:27-31`): `rolled_back>0 #B42318` else `deploying>0 #DC6803` else `ready>0 #12B76A` else `#1F4FD4` (`w-1 shrink-0 transition-colors duration-500`). Counts: `tracked` total + `released (30d)` cutoff `Date.now()-30d` via `actualReleaseDate` + `in_validation` + conditional `deploying` (amber) / `ready` (success) / `rolled_back` (danger). Tabs `Releases|Pipeline|Notes` with `Package|GitBranch|FileText` 14px + `NavLink border-b-2 whitespace-nowrap`.
- ReleasesList: `filterReadable(user,'release',...releaseResource(r))` gating (`ReleasesList.tsx:46-51`) + search `publicId/componentName/version/name` + `FilterDropdown` type (Major/Minor/Patch/Hotfix) + status tabs dynamic (`counts[value]>0 || all` → `All/Planning/In Validation/Ready/Released/Rolled Back` plus hidden `locked/deploying/partially_released/cancelled` in counts). Cards `ReleaseCard` with `ReleaseStatusPill` dot + `ReleaseTypeChip` + title `componentName version — name` + `releaseManagerName · Created formatRelative` + composition bullets (`• N change(s)`) + `StagesMiniStepper` + footer planned/Released + `View pipeline` → `/releases/pipeline` + `Open →` → `/:publicId`. Empty `No releases match` + Reset + `NewReleaseModal` gated `Can release.create`.
- ReleaseDetail: full `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` with pinned header (nav `← Releases` + `ReleaseStatusPill` + `MoreVertical`, entity stripe `w-1 self-stretch RELEASE_TYPE_COLOR[type]` where `major #B42318 minor #DC6803 patch #027A48 hotfix #F04438` + `publicId mono 12px muted` + `TypeChip` + `h1 componentName version — name` + tags `rounded-full bg-ois-surface-muted border-ois-border px-2 py-0.5 text-[11px]` + meta `releaseManagerName · Planned MMM d, HH:mm UTC`). 3-col body `w-[280px] | flex-1 | w-[280px]` + 6 tabs Overview/Composition/Pipeline/Notes/Feature Flags/History (`py-4 px-1 border-b-2` active `border-ois-primary text-ois-primary font-bold`). Left At a glance / Pipeline mini / Composition counts; center per-tab content; right Quick Actions gated `Can release.approve` else fallback italic view-only.
- ReleasePipeline: `flex gap-6 p-6` — main `flex-1` filter tabs `All|Active only|Released|Rolled back` + `Card` grid `220px 1fr 1fr 1fr` headers `Release | development | staging | production` (`text-[11px] uppercase tracking-widest bg-ois-surface-muted`) + sorted active→released→other (`SORTED_RELEASES`) + separators `Active` / `Released within last 14 days` (`bg-ois-bg`) + rows `StageCell` per env (status icon + label `stageStatusMeta[status].color`, `X/Y tests`, `formatRelative`, `⚠ Approval gate` if `approvalRequired && !approvedAt && pending`). Sidebar `w-56` Pipeline Health (`TrendingUp 11` + `Success rate 30d 87%`, `Avg dev→prod 4.2 days`, `Rollbacks 30d 2`, `Failed validations 1`) + Production Approval (`AlertTriangle 10 amber` if `readyCount>0` → per `ready` release `componentName version` + `All tests passed.` + `Review →` → detail).
- ReleaseNotes: `max-w-3xl mx-auto p-6` — header search `Search 14 ois-text-subtle h-9 rounded-lg border-ois-border-strong` + `FilterDropdown` component (`all` + distinct `componentName` from published) + type + Reset. Filter published only `status==='released'` sorted `actualReleaseDate|plannedReleaseDate desc`. Feed `divide-y border rounded-xl` per release `bg-white p-6`: header `TypeChip + componentName version 16px bold` + right `Released MMM d` + `publicId mono 10px subtle`, optional subtitle `release.name muted`, notes `pre whitespace-pre-wrap font-sans leading-relaxed`, footer `View release detail → ArrowRight 12 ois-primary`.
- NewReleaseModal: `Modal size md` (`NewReleaseModal.tsx:76`) fields Name* + Version* (2-col), Component, Type pills 4-col `major|minor|patch|hotfix` (`bg-ois-primary` active), Initial status `planning|in_validation|ready`, Planned date `type=date` default `+7d ISO slice 0,10`, Description `rows 2`, Release notes `rows 3`. Create builds `Release` local `id rel-${ts}`, `publicId REL-${YYYY}-${slice(-5)}`, 3 default stages `development|staging|production` (`approvalRequired true` only prod), `currentStageIndex 0`, `ownerTeamId team-current`. Disabled until `name && version`.
- Modals in Detail: Promote (`Confirm promote` → `localStatus deploying` + toast + 2s navigate `/deployments`), Cancel (`Yes, cancel release destructive` → `cancelled` danger toast), Deploy to env (`pending && canImplement` → `setLocalStages in_progress startedAt now ISO` + toast).
- Stage visuals: `StagesMiniStepper` (`StagesMiniStepper.tsx:5-30`) nodes `w-6 h-6 completed emerald-500 Check / active ois-primary Loader2 animate-spin pulse / failed ois-danger X / rollback orange-500 RotateCcw / pending|skipped ois-border + white dot 2.5px`, label env `text-[10px] capitalize ois-text-subtle`, connector `h-0.5 flex-1 mx-1 mb-3 emerald-400 if i<currentStageIndex else ois-border`. `ReleaseStatusPill` dot `1.5px rounded-full` (`releaseStatusMeta dot`); `ReleaseTypeChip` `inline-flex rounded-md font-bold uppercase tracking-wider text-[10px] px-2 py-0.5` with `background ${color}18`.
- RBAC gating: `Can module="release" action="create"` for New release; `Can module="release" action="approve" resource={releaseResource(release)}` for Promote (fallback italic), `useCanRbac('release','implement',resource)` for `Deploy to env` enable; list uses `filterReadable` with `releaseResource` (`ownerTeamId` inheritance).

**Stub / Partial:**
- All writes optimistic client-only (`extraReleases` local + `localStatus`/`localStages`) — no `POST/PATCH /releases` yet (see `docs/pages/releases.md:189`).
- `ReleasePipeline` health metrics hardcoded `87% / 4.2 days / 2 / 1` (no live aggregation).
- `ReleaseDetail` History derives synthetic `AuditEntry[]` from `stages startedAt/completedAt/approvedAt` + `actualReleaseDate` (no `audit` table yet for releases).
- `StagesMiniStepper` `currentStageIndex` is static from mock, not derived from stage status.
- `NewReleaseModal` not scoped by application (`team-current` hardcoded, no `useScopedAppId` like Change wizard).

**Missing:**
- Saved views, multi-sort URL persist, server-side search `field:value`.
- Pagination (fits `<1000` per legacy; but no virtualization).
- Feature flags editing, composition lock enforcement, prerequisites validation.
- Realtime `release:*` socket updates (spec'd but not wired).

## Primary View — ReleasesLayout (`/releases`)

Layout: `ReleasesLayout.tsx:34-93` — outer `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + content `flex-1 min-h-0 overflow-auto <Outlet>`.

### Header accent bar + counts

```tsx
accentColor = rolledBack>0 ? '#B42318' : deploying>0 ? '#DC6803' : ready>0 ? '#12B76A' : '#1F4FD4'
<div className="w-1 shrink-0 transition-colors duration-500" style={{ backgroundColor: accentColor }} />
```

Stats row: `{length} tracked · {released30d} released (30d) · {inValidation} in validation` + conditional `deploying` `text-ois-warning font-semibold` / `ready` `text-ois-success` / `rolled_back` `text-ois-danger`. Separator dots `w-1 h-1 rounded-full bg-ois-border-strong`.

### Tabs

`TABS = [{Releases /releases end, Pipeline /releases/pipeline, Notes /releases/notes}]` (`NavLink` with `isActive ? border-ois-primary text-ois-primary : border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong`). Icons `Package|GitBranch|FileText 14`.

## ReleasesList (`/releases` index)

Layout: `ReleasesList.tsx:93-178` `space-y-5 p-6` — toolbar `flex justify-end gap-2` (`New release` primary `h-8 text-xs gap-1.5 Plus 13` gated `Can release.create`), search+filter row, status tabs, card list.

### Search + filters

- Input `h-9 pl-9 rounded-lg border-ois-border-strong bg-white` placeholder `Search releases...` `Search 14 ois-text-subtle`. Matches `publicId|componentName|version|name` case-insensitive.
- `FilterDropdown` type: `All types | Major|Minor|Patch|Hotfix` (`releaseTypeMeta` colors not rendered here — just labels). `Reset` ghost appears if `search||statusFilter!=='all'||typeFilter!=='all'`.

### Status tabs

`STATUS_TABS` constant `All|Planning|In Validation|Ready|Released|Rolled Back` — rendered filtered `counts[t.value]>0 || all`. Pill `px-3 py-1.5 rounded-lg text-xs font-semibold border` active `bg-ois-primary text-white border-ois-primary` else `bg-white border-ois-border text-ois-text-muted`. Count suffix `ml-1.5 text-[10px] text-white/70 vs text-ois-text-subtle`.

### Release cards

`ReleaseCard.tsx:17-76` `Card hover:shadow-md transition-shadow cursor-pointer` → `navigate('/releases/'+publicId)`; inner `CardBody p-5`:

- Row 1: `ReleaseStatusPill` dot + `publicId mono 12 muted` | `ReleaseTypeChip` right.
- Title `text-base font-bold ois-text` (`componentName version — name muted`).
- Meta `releaseManagerName · Created formatRelative(createdAt)` `text-xs muted`.
- Composition bullets `flex gap-4 text-xs muted` `• N change(s) / problem(s) fixed / incident(s) resolved`.
- Pipeline `StagesMiniStepper stages currentStageIndex` under `Pipeline 10px bold tracking-wider subtle uppercase`.
- Footer: `Planned: MMM d, HH:mm UTC` vs `Released formatRelative(actualReleaseDate)` + buttons `View pipeline` outline + `Open ArrowRight 11` primary (stopPropagation).

Empty: `Card py-16 text-center` `No releases match · Try adjusting` + `Reset filters` outline.

## ReleasePipeline (`/releases/pipeline`)

Layout: `ReleasePipeline.tsx:92-238` `flex gap-6 p-6` — main `flex-1 min-w-0 space-y-4` + sidebar `w-56 shrink-0 space-y-3`.

### Filter tabs

`All | Active only | Released | Rolled back` (`activeStatuses = planning,locked,in_validation,ready,deploying,partially_released`). Each button `px-3 py-1.5 rounded-lg text-xs font-semibold border` toggle `bg-ois-primary` else `bg-white border-ois-border`.

### Grid

`Card overflow-hidden` — header row `grid 220px 1fr 1fr 1fr border-b bg-ois-surface-muted` `Release | development | staging | production` `text-[11px] font-semibold muted uppercase tracking-widest` + left `border-l` per env col.

Rows `divide-y` — `SORTED_RELEASES = [...activeStatuses, ...released, ...rest]` preserves priority. Separators: `Active` bar `bg-ois-bg border-b` if both active+released; per released section header `Released within last 14 days 10px tracking-widest`.

Per row `grid 220px 1fr 1fr 1fr hover:bg-ois-bg/40`:

- Release info `px-4 py-3 border-r cursor-pointer` → detail: chips `TypeChip sm + StatusPill sm` + `componentName 12 bold` + `version mono 11 ois-primary` + `publicId mono 10 subtle`.
- Stage cells `px-3 py-3 border-l` → `StageCell` (below).

### StageCell

`StageCell` (`ReleasePipeline.tsx:16-64`) button `w-full rounded-lg border p-2.5 text-left hover:shadow-sm`:

- Icon mapping: `success Check emerald-600 | in_progress Loader2 ois-primary animate-spin | failed X ois-danger | rolled_back RotateCcw orange-500 | pending Circle subtle | skipped MinusCircle subtle`. Border/bg pair: success `emerald-200/emin 50/50`, in_progress `ois-primary/40 blue-50/50 ring-1 ring-ois-primary/20`, failed/rollback `red-200 red-50/40`, else `ois-border ois-bg/50`.
- Label `text-[11px] font-semibold stageStatusMeta.color` (Pending / In Progress / Success…).
- Meta `text-[10px] subtle`: `X/Y tests`, `formatRelative(startedAt)` or `completedAt`, `⚠ Approval gate` amber `font-semibold mt-1` if `approvalRequired && !approvedAt && pending`.

### Sidebar

- **Pipeline Health** `Card` header `TrendingUp 11 uppercase tracking-widest muted` + `CardBody dl space-y-2 text-xs`: Success rate `87%`, Avg dev→prod `4.2 days`, Rollbacks `2`, Failed validations `1`.
- **Production Approval** if `readyCount>0` `Card border amber-50 header amber-800 AlertTriangle 10` → per ready release `componentName version 12 bold` + `All tests passed. 10 muted` + `Review → 12 primary hover:underline`.

## ReleaseNotes (`/releases/notes`)

Layout: `ReleaseNotes.tsx:42-132` `max-w-3xl mx-auto p-6 space-y-5` — floating search row `flex justify-end` + filter bar + feed.

### Data

`PUBLISHED = releases.filter(released).sort(actualReleaseDate|plannedReleaseDate desc)`. Components list `['all', ...distinct componentName]`.

### Filters

Search `w-56 h-9 pl-9 rounded-lg border-ois-border-strong` placeholder `Search notes...` — matches `version|componentName|releaseNotes` lowercased. Two `FilterDropdown`: component (`All components | {name}`) + type (`All types | Major…`). `Reset` ghost if any filter.

### Feed

`divide-y border rounded-xl overflow-hidden` per release `bg-white p-6`:

- Header `flex justify-between gap-4 mb-1`: left `TypeChip + componentName version 16 bold`, right `Released MMM d 12 muted` + `publicId mono 10 subtle`. Optional `release.name 14 muted mb-4`.
- Notes `prose max-w-none` → `pre whitespace-pre-wrap font-sans text-sm leading-relaxed ois-text` (customer-facing markdown rendered as preformatted).
- Footer `mt-4 pt-4 border-t border-ois-border` → `View release detail → ArrowRight 12` `text-xs font-semibold ois-primary hover:underline` → `/releases/:publicId`.

Empty: `Card py-16` `No release notes match` + Reset.

## NewReleaseModal

`NewReleaseModal.tsx:16-164`:

- Header `New release` `Modal size md`.
- Fields (stack `space-y-4 py-3`):
  - Grid 2-col: Name* `Input autoFocus` (required) + Version* `placeholder 2.4.0` (required).
  - Component `Input placeholder payment-api`.
  - Grid 2-col: Type pills `grid-cols-4 gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold uppercase border` active `bg-ois-primary text-white border-ois-primary` vs `bg-white muted border-ois-border`; Initial status `select h-9 rounded-md border-ois-border px-2 text-sm` options `planning|in_validation|ready`.
  - Planned date `type=date` default `+7d`.
  - Description `textarea rows 2` + Release notes `rows 3`.
- Footer `border-t border-ois-border flex justify-end gap-2 pt-2`: `Cancel ghost` + `Create release primary disabled={!name||!version}`.
- Behavior: local build `rel-${ts}` etc., 3 stages `dev|staging|prod` (prod requires approval), `tags []`, `featureFlags []`, `createdAt/updatedAt now ISO`, call `onCreate` → `extraReleases` prepend + success toast.

## Detail View (`/releases/:releaseId`)

`ReleaseDetail.tsx:98-605` — full-page shell `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)`.

### Pinned header

- Nav row `flex justify-between px-6 py-2 border-b`: `← Releases` `ArrowLeft 15 muted→text hover` + right `ReleaseStatusPill` + `MoreVertical 16 border rounded-lg bg-white muted`.
- Entity stripe `flex items-start gap-0` + `w-1 self-stretch RELEASE_TYPE_COLOR[type]` + `flex-1 px-6 py-4`: `publicId mono 12 muted + TypeChip` row, `h1 text-xl font-bold ois-text componentName version — name muted 16`, tags `rounded-full bg-ois-surface-muted border-ois-border px-2 py-0.5 text-[11px] subtle`, meta `Release manager: {name} bold · Planned MMM d, HH:mm UTC` `text-xs muted`.

### 3-column body

**Left `w-[280px] border-r bg-white p-4 space-y-4` SectionCard pattern:**

- At a glance `dl divide-y -mx-4 -mb-4 text-xs px-4 py-2.5`: Status (Pill sm), Type (Chip sm), Version `mono bold`, Component, Manager, Planned (muted). Card chrome `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] semibold muted uppercase tracking-widest`.
- Pipeline `StagesMiniStepper sm` size.
- Composition counts `space-y-1 text-xs muted` `X change(s) / problem(s) fixed / incident(s) resolved`.

**Center `flex-1 min-w-0 flex-col`:**

- Tab bar `border-b bg-white shrink-0 px-6` → `nav flex gap-8 scrollbar-hide` buttons `py-4 px-1 border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary font-bold` vs `border-transparent muted hover:text/o hover:border-strong`.
- Scrollable `flex-1 overflow-y-auto px-6 py-5`:

| Tab | Isi |
|-----|-----|
| **Overview** | `SectionCard Description` leading-relaxed + 3-col grid `bg-ois-bg rounded-xl p-3 text-center border-ois-border` stats `text-2xl bold` Changes / Problems fixed / Incidents resolved |
| **Composition** | SectionCards: Changes (`Link /changes/:publicId` row `mono 12 bold ois-primary + title 14 + type muted + risk colored riskMeta+risk + ExternalLink 12 subtle`, `hover:bg-ois-bg`), Problems Fixed (`/problems/:publicId`), Incidents Resolved (`/incidents/:publicId`), Prerequisites (`✓/✗/⏱` + reference + `Badge success/danger/neutral 9px capitalize`) |
| **Pipeline** | `grid grid-cols-3 gap-3` StageCards inline (`rounded-xl border p-4`: header icon `Check|Loader2 animate-spin|X|Clock 16 colored stageStatusMeta.color` + `environment uppercase 14 bold` + `meta.label 12 semibold`, tests `Tests: X/Y passed` 12 muted, times `Started/Completed MMM d, HH:mm UTC` 10 subtle else `No deployment yet 12 subtle`, approval `Lock 11 amber-700 Approval required · ✓ Approved success`, Deploy button `outline h-7 text-xs w-full mt-3` pending+canImplement→`setDeployIdx`) |
| **Notes** | `SectionCard Release Notes` `pre whitespace-pre-wrap font-sans leading-relaxed` + conditional `Internal Notes` (`border-t` + `11 semibold tracking-widest muted uppercase` + `14 muted`) |
| **Feature Flags** | `SectionCard N flags` empty `italic subtle 14` else per flag `p-3 bg-ois-bg rounded-lg border-ois-border` → `key mono 12 bold ois-primary` + `Badge success|neutral 10 Enabled/Disabled` + `description 12 text` + `Targeting: 10 subtle` |
| **History** | `SectionCard Audit History` → synthetic `AuditEntry[]` + `<AuditTimeline>` (created `FilePlus #1F4FD4 #EEF2FF`, stage start `Rocket #DC6803 #FEF0C7`, end `Check|X emerald/danger`, approval `CheckCircle2 emerald`, released `Package emerald`) — empty `No release history yet.` |

**Right `w-[280px] border-l bg-white p-4 space-y-4`:**

- Quick Actions `SectionCard` wrapped `Can release.approve resource={releaseResource(release)}` fallback italic `View-only — releases for this team can only be promoted by its Team Lead or a Change Manager.` — inside: `Promote to staging primary bg-ois-primary text-white hover:bg-ois-primary-hover` (`px-3 py-2 rounded-lg text-xs font-medium`) → modal; `Lock composition` + `Add change` disabled `border ois-border opacity-40 cursor-not-allowed`; divider `border-t` + `Cancel release danger-pale border ois-border text-ois-danger hover:bg-ois-danger-pale`.

### Modals (3)

- **Promote to staging** (`promoteModalOpen`): `Modal sm title Promote to staging?` → `publicId bold` + `into staging queue` copy + `redirect deployments` hint + `Cancel outline` + `Confirm promote`.
- **Cancel release** (`cancelModalOpen`): warning `cancelled danger` + irreversible hint + `Go back` + `Yes, cancel release destructive`.
- **Deploy to Environment** (`deployIdx !== null`): `Deploy to {env}?` → `In Progress` hint + `Cancel` + `Confirm deploy` → `setLocalStages[deployIdx] → status in_progress startedAt now ISO` + toast.

Toasts: `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex gap-2` `success bg-ois-success white | danger bg-ois-danger | info bg-ois-primary` with `CheckCircle2 15` if success, 3s auto-dismiss via `toastTimer`.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View list | `/releases` tab | `release.read` (STA/IFM/APS all) | — |
| View pipeline matrix | `/releases/pipeline` tab | `release.read` | — |
| View notes feed | `/releases/notes` tab | `release.read` | — |
| View detail | Card click / `Open →` | `release.read` scoped `ownerTeamId` | — |
| Create release | `New release` → modal | `release.create` (APS Officer+ team_app OR Change Manager all) | — |
| Promote to staging | Quick Actions `Promote to staging` → confirm → `/deployments` | `release.approve` (APS Team Lead+ team_app OR Change Manager/CAB) | any (optimistic → `deploying`) |
| Deploy to env | Pipeline tab `Deploy to {env} →` | `release.implement` (APS Officer+ team_app OR Change Manager) | `stage pending` |
| Lock composition / Add change | Disabled placeholders | `release.update` | — (Phase 2) |
| Cancel release | `Cancel release` → confirm | `release.write` (mapped via approve impl) | not closed → `cancelled` |
| Copy ID/link | `⋯` menu (stub) | — | — |
| Navigate cross-links | Composition rows | `change.read` / `problem.read` etc. | — |

## Filters / Sort / Search

- **Layout counts** `useMemo` (`ReleasesLayout` + `ReleasesList`): `released30d` (`status released && actualReleaseDate cutoff 30d`), `inValidation`, `deploying`, `ready`, `rolledBack` — client-side.
- **List search** `list search` `publicId|componentName|version|name` lowercased includes.
- **List filter** `typeFilter` `all|major|minor|patch|hotfix` via `FilterDropdown`; status tabs `all|planning|in_validation|ready|released|rolled_back` rendered subset (`counts>0`).
- **Pipeline filter** `filter` `all|active|released|rolled_back` (`activeStatuses` set) — client-side.
- **Notes search** `version|componentName|releaseNotes`; component dropdown `all|distinct(componentName)`; type filter same as list.
- No URL persist yet (reset only clears state); search placeholder `Search releases...` vs notes `Search notes...` (`Search 14 ois-text-subtle`).
- Sort: notes feed `released` sorted `actual|planned desc`; list preserves insertion + `extraReleases` prepend; pipeline groups active first.

## State Lifecycle

```
planning → locked → in_validation → ready → deploying → released
                                        ↓         ↓
                                    cancelled  partially_released
                                                rolled_back
(cancelled reachable from planning/locked/in_validation/ready/deploying per docs/pages baseline)
```

Stage substate (per `src/types/release.ts:89-97`):
```
pending → in_progress → success | failed | rolled_back | skipped
postDeployHealthCheck: pending → healthy | degraded | failed
```

Detail guards: `localStatus` optimistic; `StageCard` deploy only if `pending && canImplement`; cancel/promote apply regardless of stage (no guard).

## Permissions (action-level)

Resource scope via `releaseResource(release) → { ownerTeamId }` with inheritance (`src/lib/rbac/releaseResource.ts:5`, `engine.ts` team ancestry) + `filterReadable` gating in list.

| Permission | Who | All scopes | Actions |
|------------|-----|------------|---------|
| `release.read` | STA, IFM, APS (`rel-read-it` all) | all | View all tabs/detail |
| `release.create` | APS Officer+ `team_app` (`rel-create-aps`) OR Change Manager all (`rel-create-cm`) | own team vs all | New release modal |
| `release.update` | APS Officer+ team_app (`rel-update-aps`) OR Change Manager all | — | Edit composition/notes (Phase 2) |
| `release.approve` | APS Team Lead+ team_app (`rel-approve-tl`) OR Change Manager/CAB all (`rel-approve-cm`) | — | Promote to staging (gate) |
| `release.implement` | APS Officer+ team_app (`rel-implement-aps`) OR Change Manager all (`rel-implement-cm`) | — | Deploy stage |
| `release.*` superadmin | bypass | — | All actions |

`Can module="release" action="approve|create|implement"` with `resource` prop (Detail/Pipeline/Card); violation → engine `false` + `ScopeViolationError` 403 `{error:'scope_violation'}` if attempted via API (`server/app.ts:126 requireAuth` + `requirePermission`).

## Empty / Loading / Error

- **Empty list** `Card py-16 text-center` `No releases match` `text-sm font-bold text-ois-text` + `Try adjusting your filters text-xs muted mb-3` + `Reset filters outline sm`.
- **Empty pipeline** card body empty `divide-y` no rows if `displayed.length 0` (currently no explicit empty state — gap).
- **Empty notes** `Card py-16` `No release notes match text-sm font-bold` + Reset (no hint).
- **Empty flags tab** `italic subtle 14 No feature flags for this release.`
- **Empty prerequisites** section hidden if `prerequisites.length 0`.
- **Detail loading** `flex justify-center py-24 text-sm muted Loading…` via `useResource loading`.
- **Detail 404** `py-24 text-center` `Release not found text-2xl bold` + `← Back to Releases` button.
- **Blocked approve** fallback italic `View-only — releases for this team can only be promoted by its Team Lead or a Change Manager.`
- **Disabled states** `border-ois-border bg-white text-ois-text opacity-40 cursor-not-allowed` (Lock composition / Add change) with no tooltip beyond CSS.
- **Errors:** no inline error banner for fetch failure (silent empty via `data ?? []`); cancel/promote optimistic no revert.

## Phase 2 Deferred

- Write endpoints `POST /releases`, `PATCH /releases/:id/*` (lock, promote, cancel, deploy stage, composition link) — currently optimistic-only per `docs/pages/releases.md:189`.
- Composition enforcement: `locked` gate, Add change linking real `Change` search (now placeholder `Link TagInput` not implemented).
- Prerequisites validation engine (`met|pending|blocked`) + blocking promotion.
- Feature flags editing (currently read-only display).
- Pipeline Health live aggregation (replace hardcoded `87%` etc. with `GET /releases/metrics`).
- Realtime pipeline: external CI/CD webhook → `release.stage.updated` → `tenant:{tenantId}` socket + `currentStageIndex` auto-advance.
- Approval gate enforcement before prod (now manual button + `approvalRequired` flag only).
- Prerequisite → deployment ordering / dependency graph.
- Saved filter views, multi-sort persistence to URL `?status=&type=&q=`, pagination + virtualization for `>1000` releases.
- `NewReleaseModal` application scope picker (`useScopedAppId` + `ScopeMismatchModal` like Changes wizard).

## Design Preservation

Wajib pertahankan:

1. **Accent bar** `w-1 shrink-0 transition-colors duration-500` `rolled_back #B42318 > deploying #DC6803 > ready #12B76A > default #1F4FD4` (`ReleasesLayout.tsx:27`) + stats row separators `w-1 h-1 rounded-full bg-ois-border-strong`.
2. **Module Layout tabs** `NavLink flex gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted` with icons `Package|GitBranch|FileText 14`.
3. **Release type stripe** `w-1 self-stretch RELEASE_TYPE_COLOR major #B42318 minor #DC6803 patch #027A48 hotfix #F04438` left edge of detail header (`ReleaseDetail.tsx:193`).
4. **SectionCard** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b bg-ois-surface-muted text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest`.
5. **Status tabs** `py-4 px-1 border-b-2` active `border-ois-primary text-ois-primary font-bold` (`ReleaseDetail.tsx:262`).
6. **ReleaseStatusPill** `inline-flex gap-1.5 rounded-full font-semibold text-xs px-2.5 py-1` size sm `10px px-2 py-0.5` with dot `1.5 h-1.5 rounded-full` (`releaseStatusMeta dot/bg/color` mapping).
7. **ReleaseTypeChip** `inline-flex rounded-md font-bold uppercase tracking-wider text-[10px] px-2 py-0.5` with `background ${color}18` (tinted) (`ReleaseTypeChip.tsx:18`).
8. **StagesMiniStepper** nodes `w-6 h-6 completed emerald-500 / active ois-primary animate-pulse + Loader2 spin / failed ois-danger / rollback orange-500` + connector `h-0.5 emerald-400 if done else ois-border` (`StagesMiniStepper.tsx:12-17`) + label `text-[10px] capitalize ois-text-subtle`.
9. **Type pills** in modal `px-2 py-1.5 rounded-md text-[11px] font-bold uppercase border` active `bg-ois-primary text-white border-ois-primary`.
10. **Ois tokens** strictly `ois-bg / ois-surface / ois-surface-muted / ois-border / ois-border-strong / ois-text / ois-text-muted / ois-text-subtle / ois-primary / ois-primary-hover / ois-success / ois-warning / ois-danger` (`src/index.css:7-33`) — no ad-hoc hex beyond type/status palettes.
11. **Toast** `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium gap-2 pointer-events-none` `success bg-ois-success white CheckCircle2 15` (`ReleaseDetail.tsx:23`).
12. **StageCell / StageCard** border palettes: success `emerald-200 emerald-50/50`, in_progress `ois-primary/40 blue-50/50 ring-1 ring-ois-primary/20`, failed `red-200 red-50/40`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| List all | `GET /api/v1/releases?page&pageSize` | `release.read` | via `releasesService.list()` → `apiFetch('/releases')` |
| Get detail | `GET /api/v1/releases/:publicId` | `release.read` | via `releasesService.get(publicId)` |
| Create (Phase 2) | `POST /api/v1/releases` | `release.create` | passthrough `{name,version,componentName,type,status,plannedReleaseDate,description,releaseNotes}` — not yet implemented |
| Promote / Deploy | `PATCH /api/v1/releases/:publicId/promote` (Phase 2) | `release.approve` / `release.implement` | optimistic now → status deploying / stage in_progress |
| Cancel (Phase 2) | `PATCH /api/v1/releases/:publicId/cancel` | `release.write` | → `cancelled` (409 if closed) |

Scoped via `req.scoped.releases.*` (`releasesRepo.list/get` over `prisma.release` `data:JSON`) + `parsePagination` (`server/routes/itsm.ts:133`, `server/repositories/docs.ts:225`). Audit + socket for releases deferred.

## Open Items

- [ ] Formalize `POST/PATCH /releases` schemas (`createReleaseSchema`, promote/deploy validators) — wire `NewReleaseModal` to real API (replace `extraReleases` local).
- [ ] Enforce `locked` composition gate: block Add change after `locked`; validate prerequisites `blocked` prevents promotion.
- [ ] `ReleasePipeline` hard metric replacement + `SORTED_RELEASES` diverted-file index coupling `SORTED_RELEASES[idx]` in `isFirstReleased` (fragile — align to `displayed` index).
- [ ] Detail history should source from `audit` table (releases) not synthetic `localStages` derivation.
- [ ] Add `scope.appId` picker to `NewReleaseModal` (parity with Change wizard) + `releaseResource` with `ApplicationTeam` inheritance check.
- [ ] Add URL persist for filters (`?q=&type=&status=&pipelineFilter=`) + pagination.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/releases.md` + `src/routes/releases/*` (ReleasesLayout/ReleasesList/ReleaseDetail/ReleasePipeline/ReleaseNotes) + `src/components/releases/*` + `server/routes/itsm.ts` (`/releases`) + `src/types/release.ts` + constants (`releaseStatusMeta/releaseTypeMeta/stageStatusMeta`) ke template features (Module Layout 3 tabs + List cards + Pipeline matrix + Notes feed + Detail 6 tabs + NewReleaseModal) | — |

