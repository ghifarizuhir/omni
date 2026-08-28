# Deployments + Environments — Deployment Management

Status: **Draft**
Route: `/deployments` (queue), `/deployments/:deploymentId` (detail), `/environments` (health)
Sidebar: Change & Delivery · Deployments
Source: `src/routes/deployments/DeploymentsLayout.tsx`, `DeploymentsQueue.tsx:1`, `DeploymentDetail.tsx:194`, `Environments.tsx:34` · `server/routes/itsm.ts:141-157` (`itsmRouter` `/deployments` + `/environments`) · `src/types/deployment.ts:34-141`

---

## Intent

Memantau dan mengontrol eksekusi deployment ke environment `development` / `staging` / `production` / `dr` — termasuk rollback, re-deploy, cancel, freeze window awareness, pipeline stage observability, live logs, dan post-deploy health. ITIL 4: Deployment Management — memindahkan code/artifact yang sudah di-validate (via Change + Release) ke live environment secara terkontrol dan terukur.

Beda dari Releases: Release = paket + approval gate; Deployment = eksekusi fisik per environment/per component.

## Current State (snapshot `src/routes/index.tsx:168-174`)

- `src/routes/index.tsx:168` → `<DeploymentsLayout />` at `/deployments` children `{ index:true → <DeploymentsQueue /> }`
- `src/routes/index.tsx:171` → `<DeploymentDetail />` at `/deployments/:deploymentId` (outside layout, standalone)
- `src/routes/index.tsx:172` → `<DeploymentsLayout />` at `/environments` children `{ index:true → <Environments /> }`
- Layout: `DeploymentsLayout.tsx:12` wraps Queue + Environments with two `NavLink` tabs (Rocket Queue, Server Environments) + dynamic status header
- Components: `ActiveDeploymentBanner` (`src/components/deployments/ActiveDeploymentBanner.tsx:10`), `DeploymentStatusPill` (`DeploymentStatusPill.tsx:12`), `EnvironmentChip`, `DeploymentStrategyChip`, `DeploymentTriggerChip`, `DeploymentHero` (`DeploymentDetail/DeploymentHero.tsx:30`), `DeploymentStages`/`DeploymentStageCard`, `LogPanel`/`LogEntry`, `RollbackModal`, `EnvironmentCard` (`EnvironmentCard.tsx:48`), `EnvironmentComponentTable`, `RecentDeploymentsTable`
- API: `itsmRouter` in `server/routes/itsm.ts:141-157` — `GET /deployments (?active=true)`, `GET /deployments/:publicId`, `GET /deployments/:deploymentId/logs`, `GET /environments` — all `requirePermission('deployment.read')` (mapped to `release.read`/`deployment.read` depending on seed). Uses `deploymentsRepo` via `server/repositories/docs.ts:230-238` + `listByKind('environment')` for environments. No mutation endpoints yet (rollback/redeploy/cancel are optimistic local).
- Types: `DeploymentStatus pending|running|success|failed|rolled_back|cancelled|rolling_back`, `DeploymentStrategy rolling|blue_green|canary|big_bang|phased`, `DeploymentTrigger manual|cicd_pipeline|scheduled|auto_promotion`, `DeploymentStageStatus`, `LogLevel debug|info|warn|error|fatal`, `Deployment` + `DeploymentStage` + `DeploymentLogEntry` + `EnvironmentInfo` (`src/types/deployment.ts:3-141`)
- Repo: `deploymentsRepo.list/active/get/logs` in `server/repositories/docs.ts:230-238` — `active` filters `status === 'running' || 'pending'` client-side after `listDocs`
- Service: `deploymentsService` in `src/services/itsmServices.ts:59-65` — `list()`, `active()` (`?active=true`), `get(publicId)`, `logs(deploymentId)`, `environments()`
- RBAC helper: `deploymentResource(dep)` in `src/lib/rbac/deploymentResource.ts:16-23` — resolves `ownerTeamId` via `linkedReleaseId → Release.ownerTeamId` registry (`registerReleases`). Falls through to `{}` if no linked release.

**Working:**
- DeploymentsLayout header `src/routes/deployments/DeploymentsLayout.tsx:26-31` accent stripe `w-1` color priority `rolling_back #B42318 > failed24h #DC6803 > running #1F4FD4 > healthy #12B76A` + stats row `{envCount} environments · {pending} pending · {running} running · {rollingBack} rolling back · {failed24h} failed (24h)` + tab bar `border-b-2 border-ois-primary` active
- Queue: search + 5 `FilterDropdown` (Status/Env/Component/Strategy/Trigger) + Reset button, 5 quick chips `Active / Failed / Rolled back / Last 24h / Production only` (`DeploymentsQueue.tsx:446-469`), 10-column table `Status·ID·Component·Version·Env·Strategy·Trigger·Started·Duration·Actions` sorted `startedAt||createdAt desc` (`DeploymentsQueue.tsx:255`), `ActiveDeploymentBanner` when `status pending|running|rolling_back`, live duration tick `setInterval 1s` for running (`DeploymentsQueue.tsx:185-189`), `localStatuses` optimistic map for rollback (`DeploymentsQueue.tsx:147`), `+ Manual deploy` modal (`DeploymentsQueue.tsx:610-695`) with component/env/artifact/strategy/branch form → local `extraDeployments` prepend
- Detail: pinned header `bg-white border-b border-ois-border` with nav row `← Deployments + ⋯ menu (Copy ID/Export logs/Rollback)` + `DeploymentHero` gradient + progress; body `max-w-[1440px] flex gap-6` left 60% `DeploymentStages` + right 40% `LogPanel`; full-width `Tabs` 5 (Overview/Manifest/Linked Items/Triggered Incidents/History); sticky bottom `StickyActionBar` status-aware; `RollbackModal` + Redeploy confirm modal
- Environments: 3-col `EnvironmentCard` grid + center `RecentDeploymentsTable` (Last 7 Days) + right rail `w-72` with Deploy Health / Freeze Windows / Upcoming Deployments cards (`Environments.tsx:74-253`)
- Tokens: `ois-*` only — `bg-ois-bg #F7F8FA`, `bg-ois-surface #FFFFFF`, `border-ois-border #E4E7EC`, `text-ois-text #101828`, `text-ois-text-muted #475467`, `text-ois-text-subtle #98A2B3`, `bg-ois-primary #1F4FD4`, `bg-ois-success-pale #ECFDF3`, `bg-ois-warning-pale #FFFAEB`, `bg-ois-danger-pale #FEF3F2`, `bg-ois-info-pale #F0F9FF`

**Stub / Partial:**
- Manual deploy is local-only (`extraDeployments` state, id `dep-manual-${Date.now()}`, publicId `DPL-M-000N`) — no `POST /deployments` endpoint
- Rollback / Cancel / Re-deploy are optimistic-local (`localStatuses`/`localStatus` → `rolled_back`/`running`) without server mutation; `RollbackModal` reason (min 30 chars) is collected but not persisted
- Freeze window is display-only (Environments sidebar + `EnvironmentCard` lock banner) — no hard-block on deploy
- Health check `postDeployHealth pending→healthy|degraded|failed` is read-only display (`StickyActionBar` on success shows health, `DeploymentHero` does not gate)
- Stage live progress depends on external webhook/CI — queue `elapsedTick` and detail `progressPercent` are derived, not pushed via realtime

**Missing:**
- `POST /deployments`, `POST /deployments/:id/rollback`, `POST /deployments/:id/cancel`, `POST /deployments/:id/redeploy` server endpoints + audit
- Saved views, URL-persisted filters, multi-sort, `field:value` search parser
- Realtime pipeline push (Socket.IO) for stage/log streaming

## Primary View — Deployments Queue (`/deployments`)

Layout: `DeploymentsLayout` (`-m-6 flex flex-col bg-ois-bg h-[calc(100vh-3.5rem)]`) → header + tabs → `Outlet` → `DeploymentsQueue` (`p-6 space-y-5`) — see `DeploymentsLayout.tsx:32-88` and `DeploymentsQueue.tsx:342-697`.

### Header (DeploymentsLayout)

```
[w-1 accent stripe] Deployments
{envCount} environments · {pending} pending · [{running} running] · [{rollingBack} rolling back] · [{failed24h} failed (24h)]
[Queue Rocket] [Environments Server]   — NavLink border-b-2 active border-ois-primary text-ois-primary
```
Accent priority `DeploymentsLayout.tsx:26-30`: `rolling_back #B42318` > `failed24h #DC6803` > `running #1F4FD4` > default `#12B76A`, `transition-colors duration-500`. Stats derived from `deploymentsService.list()` + `environments()` (`DeploymentsLayout.tsx:13-24`).

### Queue Controls

**Filter bar** `flex items-center gap-2 flex-wrap` (`DeploymentsQueue.tsx:359-444`):
- Search `Search 14` + input `pl-8 py-2 rounded-lg border-ois-border-strong` placeholder `Search ID, component, commit…` — matches `publicId|componentName|commitSha|commitMessage` lowercased (`DeploymentsQueue.tsx:212-219`)
- `FilterDropdown` ×5: Status (7 options with counts `pending/running/success/failed/rolled_back/cancelled/rolling_back`), Environment (`development|staging|production|dr`), Component (unique sorted `componentName`), Strategy (`rolling|blue_green|canary|big_bang|phased`), Trigger (`manual|cicd_pipeline|scheduled|auto_promotion`)
- Reset `RotateCcw 13` button when `hasFilters` — clears search + all dropdowns + `quickFilters` Set

**Quick chips** `rounded-full border px-3 py-1 text-xs font-semibold` (`DeploymentsQueue.tsx:447-469`):
`🔥 Active (n)` · `⚠ Failed (n)` · `↩ Rolled back (n)` · `📡 Last 24h (n)` · `Production only (n)` — toggle `Set<QuickFilter>`, active style `border-ois-primary bg-ois-primary-pale text-ois-primary` else `border-ois-border bg-white text-ois-text-muted`. Counts from `qCounts` memo (`DeploymentsQueue.tsx:293-303`). Filter semantics: `active → running||rolling_back`, `failed → failed`, `rolled_back → rolled_back`, `last24h → (startedAt||createdAt) >= LAST_24H` (`DeploymentsQueue.tsx:30`), `production → environment==='production'`.

### Active Banner

`ActiveDeploymentBanner.tsx:11-77` shown when `activeDeployments.length>0` (`pending|running|rolling_back`). `rounded-xl border-ois-primary/20 bg-ois-primary-pale px-5 py-4`. Per deployment card `bg-white/70 border-ois-primary/10` with `publicId mono bold ois-primary / componentName / version mono bg-ois-surface-muted / → env uppercase` + `View live →` link + stage row `currentStage.name — progressLabel | {progress}% · started {elapsed}` + `h-1.5 bg-ois-primary/15` fill `bg-ois-primary {progress}%`.

### Table

Container `rounded-xl border border-ois-border bg-ois-surface overflow-hidden` (`DeploymentsQueue.tsx:473`). Empty: `py-16` `No deployments yet.` or `No deployments match.` + Reset button. Header `bg-ois-surface-muted border-b border-ois-border` columns `text-xs uppercase tracking-wide font-semibold text-ois-text-muted`:

| Column | Source | Notes |
|--------|--------|-------|
| Status | `status` | `DeploymentStatusPill size sm` + `⚠ caused incident` if `triggeredIncidentIds.length>0` (`DeploymentStatusPill.tsx:33-36`) |
| ID | `publicId` | `font-mono text-xs font-semibold hover:underline` — prefix `↩ ` and `text-ois-warning #DC6803` when `rolled_back` else `text-ois-primary` (`DeploymentsQueue.tsx:538-543`) |
| Component | `componentName` | `text-xs font-medium truncate max-w-[160px]` |
| Version | `artifactRef` | `font-mono text-xs bg-ois-surface-muted rounded px-1.5` via `getVersion = split(':').pop()` (`DeploymentsQueue.tsx:22`) |
| Environment | `environment` | `EnvironmentChip size sm` (`environmentMeta` label/color) |
| Strategy | `strategy` | `DeploymentStrategyChip` |
| Trigger | `trigger` | `DeploymentTriggerChip` |
| Started | `startedAt\|scheduledFor\|—` | `pending+scheduledFor → Scheduled MMM d, HH:mm` blue, else `formatRelative(startedAt)` |
| Duration | `durationSec\|elapsed` | `pending → —`; `running|rolling_back → running {m}m {s}s` mono `text-ois-info` live tick; else `fmtDuration(durationSec)` |
| Actions | `⋯` | `ActionsMenu` (`MoreVertical 14`) — see Actions |

Rows `hover:bg-ois-surface-muted cursor-pointer` → `navigate(/deployments/:publicId)`; `isRunning → bg-blue-50/50`. Data: `[...extraDeployments, ...mockDeployments]` filtered then `sort (startedAt||createdAt) desc` (`DeploymentsQueue.tsx:207-262`).

### Manual Deploy Modal

Trigger `+ Manual deploy` `bg-ois-primary #1F4FD4 px-3 py-2 rounded-lg text-white font-semibold` (`DeploymentsQueue.tsx:345`). `Modal title "Manual deploy" size md` with form (`DeploymentsQueue.tsx:610-695`): Component `FilterDropdown` (uniqueComponents) *, Environment select *, Artifact ref `font-mono` input *, Strategy select *, Branch input default `main`. Submit `Deploy` disabled until 4 required filled → creates local `Deployment id dep-manual-${Date.now()} publicId DPL-M-000N status pending trigger manual triggeredBy Sarah Chen u-001` and prepends to `extraDeployments`.

## Environments Page (`/environments`)

Route `src/routes/index.tsx:172-174` renders inside `DeploymentsLayout` (shares header/tabs). Component `Environments.tsx:34-256`.

Layout `p-6 space-y-6` → `flex gap-6` left `flex-1 min-w-0 space-y-6` + right `w-72 shrink-0 sticky top-4 space-y-4` :

**Left:**
- Environment cards grid `grid-cols-3 gap-4` — per `EnvironmentInfo` via `EnvironmentCard.tsx:48-174`: header `displayName + description + dot health (healthy #12B76A / degraded #F79009 / down #F04438) + {uptime30d}% uptime`; sections collapsible `border-t` (Active Deployments — list `publicId mono ois-primary + componentName + version + StatusPill`; Last 7 Days — 3-col stats `recentDeploymentCount7d / failureRate7d% / — Avg duration`; Components Running — `ciCount CIs tracked` + toggle `Show N components` → `EnvironmentComponentTable`; Settings — `Approval required Yes/No` pill + Freeze banner `Lock bg-ois-warning-pale border-ois-warning/20 text-ois-sev-p2 #DC6803` or `Not active bg-ois-success-pale`)
- Recent Deployments (Last 7 Days) `Card` — header `text-xs uppercase tracking-widest` + `FilterDropdown` env/status + `View all →` → `CardBody` `RecentDeploymentsTable deployments={last7d sorted startedAt desc}`

**Right rail:**
- Deploy Health (7d) `Card`: Success rate `{success/last7d*100}%`, Avg duration `formatDuration(avgDurationSec)`, Active failures `failed count` red if >0, Rollbacks `rolled_back count` amber if >0 — derived `Environments.tsx:50-59`
- Freeze Windows `Card`: empty `No active freeze windows` else per `freezeEnvs` card `AlertTriangle bg-ois-warning-pale border-ois-warning/20` with `displayName + freezeWindowReason + "Only P1 changes allowed"`
- Upcoming Deployments `Card`: `mockDeployments.filter pending+scheduledFor sorted scheduledFor asc`; per item `Calendar 11 formatScheduledDate UTC + componentName version mono → env + via CHG link → View change`

## Detail View (`/deployments/:deploymentId`)

Component `DeploymentDetail.tsx:194-619`. Container `-m-6 flex flex-col bg-ois-bg h-[calc(100vh-3.5rem)]` (full-bleed, header pinned).

### Pinned Header

- Nav row `flex items-center justify-between px-6 py-2 border-b border-ois-border bg-white`: `← Deployments` → `navigate('/deployments')` + `⋯ MoreVertical` menu absolute `w-48 rounded-xl border border-ois-border shadow-lg` with Copy deployment ID / Export logs / Rollback (when `running|success`) (`DeploymentDetail.tsx:284-338`)
- `DeploymentHero` (`DeploymentHero.tsx:30-145`) `bg-gradient-to-b rounded-xl border border-ois-border-strong px-6 py-5` gradient by status `running from-ois-primary-pale, success from-ois-success-pale, failed from-ois-danger-pale, rolled_back/rolling_back from-ois-warning-pale, cancelled/pending from-ois-surface-muted`: top row `publicId mono xl bold + LIVE pulse bg-ois-info when running + DeploymentStatusPill md + hasIncident badge`; `componentName + version mono bg-ois-surface-muted + → EnvironmentChip md`; chips row `DeploymentTriggerChip (with triggeredByName) + DeploymentStrategyChip + Badge REL linkedReleasePublicId + Badge CHG linkedChangePublicId`; `Started {relative} · {durationSec}s`; action buttons `Rollback destructive (running|success) / Cancel ghost (pending|running) / Re-deploy secondary (failed|rolled_back)` gated — detail uses `useCan('release','implement', deploymentResource(dep))` (`DeploymentDetail.tsx:204`); progress row `Stage {currentStageIndex+1} of {total} · {currentStage.name} | {progressPercent}%` bar `h-2 bg-ois-border` fill `success #12B76A / failed #F04438 / else #1F4FD4`; failed callout `AlertTriangle bg-ois-danger-pale border-ois-danger/20` with `Failed at: {failedStage.name} + errorMessage mono`

### Body (scrollable)

`flex-1 overflow-y-auto` → `max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-6`:

**2-column main** `flex gap-6` (`DeploymentDetail.tsx:345-362`):
- Left `flex-[3] min-w-0` `bg-white rounded-xl border border-ois-border p-5`: heading `PIPELINE STAGES uppercase tracking-widest` → `DeploymentStages` (`DeploymentStages.tsx:10-28`) vertical stack with `w-px h-4 bg-ois-border` connectors — each `DeploymentStageCard` (`DeploymentStageCard.tsx:22-126`) `rounded-xl border` states `active border-ois-primary shadow ois-primary/12 / completed border-ois-success/30 bg-ois-success-pale / failed border-ois-danger/40 bg-ois-danger-pale / skipped border-ois-border bg-ois-surface-muted opacity-60`; header button `Icon (CheckCircle2/XCircle/Loader2/MinusCircle/Circle) colored + name + STATUS uppercase pills + completedAt relative + durationSec + Chevron`; expanded panel `border-t` shows `progressLabel + {progress}% + h-1.5 bar bg-ois-primary` when active, `errorMessage bg-ois-danger-pale font-mono`, or status text
- Right `flex-[2] min-w-0` `LogPanel` (`LogPanel.tsx:15-174`) `flex flex-col border border-ois-border rounded-xl overflow-hidden bg-[#0D1117]`: toolbar `bg-[#161B22] border-b border-[#30363D]` with search `bg-[#21262D] border-[#30363D]`, level toggles `ALL_LEVELS debug/info/warn/error/fatal` via `logLevelMeta` colored chips `opacity-100 vs 30`, source/stage `select bg-[#21262D]`, Streaming `Pause/Play` toggle `bg-ois-primary vs bg-[#21262D]`, Export; scroll area `h-[500px] overflow-y-auto bg-white` with `LogEntry` per `DeploymentLogEntry` (level dot + timestamp + source + message + fields + stackTrace) + footer `Showing {filtered}/{total} entries` + auto-scroll when streaming

**Full-width Tabs** `bg-white rounded-xl border border-ois-border p-6` `Tabs tabs={BASE_TABS}` (`DeploymentDetail.tsx:366-568`) — 5 tabs. Manifest tab conditionally shown only if `typeof manifestYaml === 'string'`:

| Tab | Content |
|-----|---------|
| **Overview** | `table w-full` `MetaRow` (label `text-xs uppercase tracking-widest text-ois-text-subtle`) rows: Component, Version (`artifactRef` version chip), Artifact (`font-mono artifactRef`), Commit (`commitSha mono chip + commitMessage`), Branch, Target CIs (chips `bg-ois-primary-pale text-ois-primary` link `/cmdb/:id`), Pipeline Run (`pipelineRunId →` external link `https://{pipelineUrl}`), Manifest ref, Tags (`rounded-full bg-ois-surface-muted`) |
| **Manifest** | Header `Kubernetes Manifest` + `manifestRef mono` + `pre bg-[#0D1117] text-[#C9D1D9] rounded-xl p-5 font-mono whitespace-pre border-[#30363D]` with `manifestYaml` — only when `manifestYaml` present (legacy `manifestRef` path is not YAML) |
| **Linked Items** | `LinkedCard` (`DeploymentDetail.tsx:37-65`) `rounded-xl border-ois-border px-5 py-4 hover:border-ois-primary hover:bg-ois-primary-pale` for Release `LAYERS → /releases/:id` + Change `Package → /changes/:id`; Test Run card `border-ois-border` with `publicId mono + testPlanName + status pill (passed green / failed red / running blue) + {passed}/{total} passed` via `testingService.runs()` link `linkedDeploymentPublicId`; empty `No linked items` |
| **Triggered Incidents** | Empty `CheckCircle2 #12B76A 32 + No incidents triggered`; else chips `font-mono bg-ois-danger-pale border-ois-danger/20 text-ois-sev-p1 → /incidents/:id` per `triggeredIncidentIds` |
| **History** | Timeline `HistoryItem` (`DeploymentDetail.tsx:67-81`) `w-3 h-3 rounded-full border-2 shadow` dots `bg-ois-primary created, bg-ois-success stage success, bg-ois-danger stage failed, bg-ois-warning rollback` with vertical `w-px bg-ois-border`; events sorted `time asc`: `Deployment triggered by {triggeredByName}` + per stage `Stage "{name}" {status} {duration}s` + rollback `initiated by {initiatedBy} — {reason}` + `completed` |

### Sticky Action Bar

`StickyActionBar` (`DeploymentDetail.tsx:83-192`) `sticky bottom-0 z-20 bg-white border-t border-ois-border px-6 py-3 flex items-center gap-4 flex-wrap`:
- If `!canDeploy` (see Permissions): `Read-only — only the owning team or a Change Manager can rollback or re-deploy.`
- `running`: `pulse bg-ois-info Running (pct%) + ETA ~{avgDuration*remaining}` + Rollback destructive — ETA `Environments.tsx` logic: `avgDuration = done.reduce(durationSec)/done.length || 60`, `remaining = stages.length - currentStageIndex -1`, `etaSec = remaining*avgDuration`
- `success`: `CheckCircle2 text-ois-sev-p4 Deployment Succeeded + Health: {postDeployHealth} + Re-deploy secondary + Rollback destructive`
- `failed`: `XCircle text-ois-sev-p1 Deployment Failed + Re-deploy secondary`
- `rolled_back`: `RotateCcw text-ois-sev-p2 Rolled Back + Reason: {rollback.reason} + Re-deploy secondary`
- `pending|cancelled|rolling_back`: `capitalize status` label only

### Modals

- **RollbackModal** (`RollbackModal.tsx:14-119`) `Modal Confirm Rollback size md`: warning `AlertTriangle bg-ois-danger-pale border-ois-danger/20` "This will roll back {componentName} — {publicId} will be reverted"; Previous target `bg-ois-surface-muted Previous successful deployment in {ENV}`; Reason textarea `rows 3` required `isReasonValid = trim.length>=30` counter `x/30` green when valid; checkboxes Notify stakeholders (default true) + Auto-create incident (default false); note `bg-ois-warning-pale` "Rollbacks cannot be undone…"; actions Cancel ghost + Confirm rollback destructive disabled until valid → `onConfirm(reason)` then caller sets `localStatus='rolled_back'` (optimistic)
- **Re-deploy confirm** (`DeploymentDetail.tsx:582-608`) `Modal "Re-deploy this build?" size sm`: text `artifactRef mono → env + Stage progress will reset…` → Confirm sets `localStatus='running'`

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View deployment | Row click / ID link / ⋯ Open / ActiveBanner View live | `deployment.read` (≡ `release.read`) | — |
| Manual deploy | `+ Manual deploy` button → modal Deploy | `release.implement` (owning team OR Change Manager) — gated optimistic (no server check) | — (creates `pending`) |
| Rollback | Hero Rollback / Sticky Rollback / ⋯ Rollback / Queue ⋯ Rollback → RollbackModal | `release.implement` via `deploymentResource(dep)` | `success` or `running` (`DeploymentHero.tsx:47`, `DeploymentsQueue.tsx:47`) |
| Cancel | Queue ⋯ Cancel (menu item) / Hero Cancel ghost | `release.implement` | `pending` or `running` (`DeploymentsQueue.tsx:48`) |
| Re-deploy | Hero/Sticky Re-deploy → confirm modal / Queue ⋯ Re-deploy → detail | `release.implement` | `failed` or `rolled_back` (`DeploymentHero.tsx:49`) |
| Copy deployment ID | Detail ⋯ menu Copy deployment ID | — | — |
| Export logs | Detail ⋯ menu Export logs / LogPanel Export button | — | — |
| Filter / Search | Filter bar + quick chips + Recent table filters | `deployment.read` | — |
| View linked items | Overview Target CI → `/cmdb/:id`, Linked Release/Change/Test Run cards, Triggered Incident → `/incidents/:id` | `deployment.read` (+ target perms) | — |

Guard: `useCan('release','implement', { resource: deploymentResource(dep) })` (`DeploymentsQueue.tsx:46`, `DeploymentDetail.tsx:204-206`) — without `ApplicationTeamRole OWNER/CONTRIBUTOR` for the owning release team, buttons are hidden/disabled and sticky bar shows read-only banner. `DeploymentHero` hides buttons per state; queue `ActionsMenu` conditionally renders menu items per state+perm.

## Filters / Sort / Search

- **Search** (`DeploymentsQueue.tsx:211-219`): `search` text lowercased `includes` on `publicId|componentName|commitSha|commitMessage` — placeholder `Search ID, component, commit…`
- **Dropdown filters** (client-side, combined AND): `statusFilter` (7 statuses), `envFilter` (4 envs), `componentFilter` (uniqueComponents), `strategyFilter` (5), `triggerFilter` (4) — each `FilterDropdown` value `''` = all. Reset clears all (`DeploymentsQueue.tsx:273-281`).
- **Quick chips** (`Set<QuickFilter>`, multi-select AND): `active (running||rolling_back)`, `failed`, `rolled_back`, `last24h ((startedAt||createdAt)>=24h)`, `production (env==='production')`
- **Sort**: default `startedAt||createdAt desc` (`localeCompare`) (`DeploymentsQueue.tsx:255-258`); no user-sort toggle yet
- **Environments Recent table** (`Environments.tsx:68-71`, `91-133`): `envTableFilter` + `statusTableFilter` on `recentDeployments = last7d sorted startedAt desc` (7d window derived from `mockDeployments.filter startedAt||completedAt >= cutoff`)
- **URL persistence**: not yet — all filters are local state (Phase 2: sync to `?status&env&component&strategy&trigger&quick`)
- Ref: `_shared/filter-sort-export.md` future

## State Lifecycle

```
pending ─┬─→ running ─┬─→ success ─┬─→ rolling_back → rolled_back
         │            │             │        ↑
         │            ├─→ failed ──┘        │(rollback from success/running)
         │            │
         └─→ cancelled└─→ cancelled (terminal from pending/running)
failed/rolled_back → re-deploy → running (optimistic localStatuses)
success → rollback → rolled_back (optimistic)
```

Defined in `src/types/deployment.ts:3-10`: `DeploymentStatus pending|running|success|failed|rolled_back|cancelled|rolling_back`. Stage sub-lifecycle `DeploymentStageStatus pending|running|success|failed|skipped` per `DeploymentStage` (`deployment.ts:25-30`) with `stageStatusMeta_dep` colors/icons (`constants.ts:320-326`). `currentStageIndex` drives hero progress + stages connectors.

Health orthogonal: `postDeployHealth pending|healthy|degraded|failed` + `healthCheckedAt` (`deployment.ts:67-68`) — set by post-deploy health checker job, displayed in StickyActionBar on success.

Rollback payload `deployment.rollback?: { initiatedAt, initiatedBy, reason, rolledBackToDeploymentId, completedAt }` (`deployment.ts:70-76`).

## Permissions (action-level)

RBAC via `src/lib/rbac/permissions.ts:405-468` — Deployments alias `release.*` (no standalone `deployment.*` rules; server still checks `deployment.read` which maps to release read in seed). Resource scoping via `deploymentResource` (`deploymentResource.ts:16-23`) → `ownerTeamId` from linked Release.

| Permission | Who | Actions |
|------------|-----|---------|
| `release.read` / `deployment.read` | STA/IFM/APS all divisions (IFM/APS/STA `scope:all`) | List/get deployments, logs, environments — `server/routes/itsm.ts:141,147,150,154` |
| `release.implement` | APS `officer` on `team_app` for owning release's team (`rel-implement-aps`) OR `change_manager` functional role `scope:all` (`rel-implement-cm`) | Rollback / Cancel / Re-deploy / Manual deploy — `useCan('release','implement', deploymentResource(dep))` |
| — | Superadmin | Bypass all |

Scope: `req.tenantId` isolation via `deploymentsRepo` + `listByKind('environment')`; violation handled as empty set (no cross-tenant leak). Read-only fallback: if `!canDeploy`, hero hides mutation buttons and `StickyActionBar.tsx:95-102` shows read-only banner; queue `ActionsMenu` omits Rollback/Cancel/Re-deploy menu items.

Ref: `_shared/rbac.md` — engine `permissionRules` first-match ALLOW, superadmin bypass, `team_app` checks `ApplicationTeam` with `OWNER/CONTRIBUTOR`.

## Empty / Loading / Error

- **Queue empty (no data):** `py-16` `No deployments yet.` (`DeploymentsQueue.tsx:476`)
- **Queue no match:** `No deployments match.` + `Reset filters` button `border-ois-border rounded-lg` (`DeploymentsQueue.tsx:480-486`)
- **Queue header/manual:** no skeleton — `useResource` returns `[]` fallback until load; `extraDeployments` merges immediately
- **Detail loading:** `flex items-center justify-center min-h-[40vh] "Loading…"` (`DeploymentDetail.tsx:217`)
- **Detail 404:** `flex flex-col items-center min-h-[40vh] gap-4` `Deployment not found` + `← Back to deployments` link `text-ois-primary hover:underline` (`DeploymentDetail.tsx:221-229`)
- **LogPanel empty (filtered):** `text-xs text-ois-text-subtle py-8 text-center "No log entries match your filters."` (`LogPanel.tsx:164`)
- **Environment empty:** Active Deployments `None active`; Deploy Health always shows values; Freeze Windows `No active freeze windows`; Upcoming `No scheduled deployments` (`EnvironmentCard.tsx:81`, `Environments.tsx:184,220`)
- **Triggered Incidents empty:** `CheckCircle2 32 text-ois-success + No incidents triggered + This deployment has not triggered any incidents.` (`DeploymentDetail.tsx:532-536`)
- **Linked Items empty:** `py-10 text-center text-ois-text-subtle No linked items for this deployment.` (`DeploymentDetail.tsx:522`)
- **Tabs missing data:** Gracefully hides manifest tab; tables show `—` for missing duration/commit

## Phase 2 Deferred

- Server mutations: `POST /deployments` (manual), `POST /deployments/:id/rollback` (reason≥30 + audit), `POST /deployments/:id/cancel`, `POST /deployments/:id/redeploy` — wire `RollbackModal`/re-deploy to repo + `audit` + `ScopeViolationError 403`
- Hard freeze enforcement: block `pending→running` when `EnvironmentInfo.freezeWindowActive` unless P1/override + surface error `text-ois-danger`
- Realtime: Socket.IO `tenant:{tenantId}:deployment:{id}` for stage progress + logs streaming (replace 1s `elapsedTick` poll + log fetch)
- URL-persisted filters: sync `search/status/env/component/strategy/trigger/quick` to query string, saved views, multi-sort (startedAt/duration/status)
- Full-text `field:value` search parser (component:, env:, trigger:, strategy:)
- Health gate automation: auto-create incident on `postDeployHealth: failed` → link `triggeredIncidentIds`, surface in banner
- Pipeline webhook: external CI/CD push `stages[].status/progressPercent/exitCode` → update `currentStageIndex/durationSec/completedAt`
- Pagination: server `?page&pageSize` via `parsePagination` (`itsm.ts:142,151,155`) — client currently `useResource` full list, needs virtualized `DataTable` with `limit 50`
- Export: wire `Export logs` / `Copy deployment ID` menu actions (clipboard + CSV)

## Design Preservation

Wajib pertahankan (jangan regresikan):

1. **DeploymentsLayout accent stripe** `w-1 shrink-0 transition-colors duration-500` priority `rolled_back #B42318 > failed24h #DC6803 > running #1F4FD4 > healthy #12B76A` (`DeploymentsLayout.tsx:26-30`) — constant `h-[calc(100vh-3.5rem)] -m-6` full-bleed, `bg-ois-bg`
2. **Tab bar** `flex px-4 overflow-x-auto scrollbar-hide` with `NavLink` `border-b-2 px-3 py-3 text-sm font-medium` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` + icons `Rocket/Server 14` (`DeploymentsLayout.tsx:65-81`)
3. **Queue filter + chips styling** `Search 14 left-3 + pl-8 rounded-lg border-ois-border-strong focus:ring-ois-primary/30` and chips `rounded-full border px-3 py-1 text-xs font-semibold` active `border-ois-primary bg-ois-primary-pale text-ois-primary` (`DeploymentsQueue.tsx:361-468`)
4. **Table** header `bg-ois-surface-muted border-ois-border text-xs uppercase tracking-widest` + rows `hover:bg-ois-surface-muted` + running `bg-blue-50/50` + mono pills `bg-ois-surface-muted font-mono text-xs` + incident badge `bg-ois-danger-pale text-ois-sev-p1 ⚠ caused incident`
5. **DeploymentStatusPill** `rounded-full px-2 py-0.5 text-[10px] font-semibold` colored via `deploymentStatusMeta` (`constants.ts:288-296`) + dot pulse when `animated` + `hasIncident` badge (`DeploymentStatusPill.tsx:20-38`)
6. **DeploymentHero gradient** `bg-gradient-to-b rounded-xl border-ois-border px-6 py-5` per-status `running primary-pale → success success-pale → failed danger-pale → rolled/rolling warning-pale` + `LIVE pulse bg-ois-info` + progress `h-2 bg-ois-border` fill `success #12B76A / failed #F04438 / else #1F4FD4`
7. **Stages cards** `rounded-xl border + shadow ois-primary/12 when active` + status colors `completed #12B76A/30 bg-ois-success-pale / failed #F04438/40 bg-ois-danger-pale / skipped opacity-60` + icon `Loader2 animate-spin when running` + `ChevronDown/Up` expand
8. **LogPanel dark chrome** `bg-[#0D1117] border-[#EAECF0] rounded-xl` toolbar `bg-[#161B22] border-[#30363D]` inputs `bg-[#21262D]` + level chips `mono 10px` dim `opacity-30` when off + `h-[500px] bg-white` scroll + footer `bg-ois-surface-muted text-[11px]`
9. **EnvironmentCard** `Card` sections `border-t border-[#EAECF0] pt-3` + health dot + freeze banner `bg-ois-warning-pale border-ois-warning/20 text-ois-sev-p2 Lock` + approval pill `Yes bg-ois-warning-pale / No bg-ois-success-pale`
10. **Modals** `RollbackModal` warning `bg-ois-danger-pale border-ois-danger/20` + reason counter `≥30 green #067647` + checkboxes `accent-ois-primary` + note `bg-ois-warning-pale`
11. **Tokens** — selalu `ois-*` (`ois-primary #1F4FD4`, `ois-success #12B76A`, `ois-warning #F79009`, `ois-danger #F04438`, `ois-info #0BA5EC`, `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-border #E4E7EC` — `src/index.css:8-32`); larangan `terra wash` / raw `#98A2B3` untuk semantic (pakai `ois-text-subtle` / `ois-text-muted`)
12. **Full-bleed calc** `style height calc(100vh - 3.5rem)` untuk Layout + Detail pinned header — jangan ubah ke `min-h-screen`

## API Touchpoints

Ref: `../design/02-api-contract.md` · `server/routes/itsm.ts` · `server/repositories/docs.ts` · `src/services/itsmServices.ts`

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| List queue | `GET /api/v1/deployments?page&pageSize` | `deployment.read` | `parsePagination` via `listDocs(Deployment)` `server/routes/itsm.ts:141-145`; `deploymentsRepo.list(tenantId, pagination)` returns parsed `Deployment[]` (`docs.ts:231`) |
| List active (banner/poll) | `GET /api/v1/deployments?active=true` | `deployment.read` | `qBool(active) ? deploymentsRepo.active() : list()` (`itsm.ts:143-145`); `active()` filters `running||pending` after fetch (`docs.ts:232-234`) |
| Get detail | `GET /api/v1/deployments/:publicId` | `deployment.read` | `deploymentsRepo.get(tenantId, publicId)` → `findFirst tenantId+publicId` parse `data` JSON (`docs.ts:235`) |
| Get logs | `GET /api/v1/deployments/:deploymentId/logs?page&pageSize` | `deployment.read` | `deploymentsRepo.logs(tenantId, deploymentId, pagination)` → `listDocs(DeploymentLog, {deploymentId})` (`docs.ts:236-237`); `LogPanel` + `LogEntry` |
| List environments | `GET /api/v1/environments?page&pageSize` | `deployment.read` | `listByKind(tenantId, 'environment', pagination)` generic `Document kind=environment` (`itsm.ts:154-156`) → `EnvironmentInfo[]` |
| Create (Phase 2) | `POST /api/v1/deployments` | `release.implement` | Belum ada — client kini local `extraDeployments` |
| Rollback (Phase 2) | `POST /api/v1/deployments/:id/rollback {reason}` | `release.implement` + `deploymentResource` | Belum ada — modal collects `reason≥30` |
| Cancel / Re-deploy (Phase 2) | `POST /api/v1/deployments/:id/cancel|redeploy` | `release.implement` | Belum ada — optimistic only |

Scoped via `req.tenantId` (no `req.scoped` for deployments — uses `deploymentsRepo` direct + `Document` for envs). Audit on writes (Phase 2) via `audit(req, { action, resourceKind:'Deployment', resourceId, before/after, scopeMode })`. Env `PORT/HOST` (`server/index.ts` default `3001/0.0.0.0`), proxy `VITE_API_BASE_URL=/api/v1` → `VITE_API_PROXY_TARGET`.

## Open Items

- [ ] Formalkan mutation endpoints `POST /deployments`, `/deployments/:id/rollback|cancel|redeploy` (Zod schema `reason 30..2000`, guard `rolling_back|success→rollback`, audit + `ScopeViolationError 403`)
- [ ] Ganti `qBool(active)` filter client-side di `deploymentsRepo.active` dengan DB `where status in ('pending','running')` + index `@@index([tenantId, status])` (`prisma/schema.prisma:518`)
- [ ] Sinkron `itsm.ts` permission string `deployment.read` vs `release.read` — seed `Permission.key` masih `release.read` untuk deploy path; konsistenkan
- [ ] Hapus hardcoded `triggeredBy Sarah Chen u-001` di `handleManualDeploy` (`DeploymentsQueue.tsx:322-323`) — pakai `useCurrentUser()`
- [ ] Wire `Export logs` + `Copy deployment ID` di detail `⋯` menu dan `LogPanel` Export (clipboard/CSV)
- [ ] Freeze window hard-block: cek `EnvironmentInfo.freezeWindowActive` sebelum `pending→running`, error `409 Freeze active` + banner `Only P1 changes allowed`
- [ ] Verify `postDeployHealth` lifecycle trigger — scheduler Health checker `docs/pages/availability.md` → auto-incident on `failed` + `healthCheckedAt`

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/deployments.md` + `src/routes/index.tsx:168-174` + `src/routes/deployments/*` + `src/components/deployments/**` + `server/routes/itsm.ts:141-157` + `src/types/deployment.ts` + `src/lib/constants.ts` deployment meta ke template features (DeploymentsLayout header/Queue table + quick chips + manual modal + Environments 3-col + Detail hero/stages/logs/tabs/sticky bar + RBAC deploymentResource + ois-* tokens) | — |
