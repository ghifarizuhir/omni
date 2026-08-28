# Create Flow — Shared Spec (Modal + `/new` Page)

Status: **Draft**
Used by: semua create entry-point — `CreateIncidentModal`, `CreateProblemModal`, `CreateCIModal`, `NewChange` (`/changes/new`), `NewThresholdModal`, `Portal`/catalog submit, future `Create*Modal` per module. Page doc cukup `Ref: _shared/create-flow.md`.
Source: `src/components/ui/Modal.tsx:14`, `src/components/incidents/CreateIncidentModal.tsx:34`, `src/components/cmdb/modals/CreateCIModal.tsx:42`, `src/routes/problems/ProblemList.tsx:55`, `src/routes/changes/NewChange.tsx:212`, `src/components/capacity/NewThresholdModal.tsx:15`, `src/routes/requests/RequestQueue.tsx:312`, `src/components/ui/Button.tsx:10`, `src/components/ui/Input.tsx:10`, `src/components/ui/FilterDropdown.tsx:21`, `src/lib/rbac/*`, `src/hooks/useScopedAppId.ts`, terra `docs/features/_shared/create-flow.md` ref (adaptasi: OIS light `ois-*`, `AppShell` bukan terra `data-theme`, `req.scoped.*` + `ScopeMismatchModal` wajib).

Ref tokens: [`../../design/08-design-system.md`](../../design/08-design-system.md) + [`../../ui/design-tokens.md`](../../ui/design-tokens.md) + [`src/index.css:7-58`](../../src/index.css). API: [`../../design/02-api-contract.md`](../../design/02-api-contract.md).

> Diadaptasi dari terra `_shared/create-flow.md`. Beda utama: OIS light-only (tanpa `data-theme="light"` toggle), modal `rounded-2xl + backdrop-blur-sm` (bukan terra `linear-card` dark), scope enforcement via `withScopedDb` + `useScopedAppId`/`ScopeMismatchModal` (terra belum ada app scope), dan wizard dikhususkan untuk Change (4-step `Basics→Plan→Review→Submit`); entity lain pakai modal 1-step.

---

## 1. Purpose

Satu spec yang mengikat **semua create surface** — baik modal inline (`CreateIncidentModal`, `CreateProblemModal`, `CreateCIModal`) maupun full-page wizard (`/changes/new`). Tujuannya:

- Konsistensi field affordance (label `*` danger, placeholder, focus ring, disable gate) tanpa copy-paste antar `features/*.md`.
- Menentukan kapan pakai **modal vs page** (decision matrix §2).
- Menyatukan behavior cross-cutting: validasi & disable, draft persistence, RBAC + app-scope guard, submit → navigate/toast, error handling, audit/socket.
- Menjadi single point of update — edit file ini = update semua page di `Used by`. Page doc hanya `Ref: _shared/create-flow.md` + delta per entity.

Page doc yang butuh concern ini **wajib cross-reference, bukan copy-paste** (per `_shared/README.md` Conventions).

---

## 2. Variants — Modal vs Page

### Decision matrix

| Kriteria | Modal | Full page (`/new`) |
|----------|-------|---------------------|
| Field count | ≤6 fields (1 section) | ≥7 fields atau multi-section/steps |
| Contoh OIS | `CreateIncidentModal` (5), `CreateProblemModal` (2), `CreateCIModal` (7 compact), `NewThresholdModal` (metric+condition+routing) | `NewChange` wizard 4-step (Basics/Plan/Review/Submit) — 15+ fields + freeze check + CAB routing |
| Navigasi | stay on list, close → toast + optional `onCreated(publicId)` → navigate | dedicated route `/<module>/new`, back link ke list/calendar |
| Draft | tidak persist (reset on close) | persist `localStorage` (`new-change-draft`) + restore on mount |
| Scope picker | tidak ada (list sudah scoped) | ada `useScopedAppId` + `ScopeMismatchModal` |
| Ukuran | `size="md"` default | `max-w-3xl mx-auto` card |

> Rule: jika butuh **>1 step, file upload, markdown editor, atau app-scope picker**, pakai page. Jika **quick create dari queue** (1 klik + 1 field wajib), pakai modal.

Modals yang ada:

- `CreateIncidentModal` — `Modal size="md"` (`src/components/incidents/CreateIncidentModal.tsx:66`)
- `CreateProblemModal` — `Modal size="md"` (`src/routes/problems/ProblemList.tsx:68`)
- `CreateCIModal` — `Modal size="md"` (`src/components/cmdb/modals/CreateCIModal.tsx:87`)
- `NewThresholdModal` — `Modal size="md"` (`src/components/capacity/NewThresholdModal.tsx:15`)

Page:

- `NewChange` — `max-w-3xl mx-auto pb-12` + `<Card><CardBody p-8>` (`src/routes/changes/NewChange.tsx:909,955`)

---

## 3. Anatomy

### 3.1 Modal shell — `src/components/ui/Modal.tsx:14`

Props: `isOpen, onClose, title, children, size='md'`.

```
fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6
  backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-sm onClick={onClose}
  content relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200
    + sizeClasses[max-w-md|2xl|4xl|6xl|95vw]        // Modal.tsx:34-40
    header px-6 py-4 border-b border-ois-border bg-white sticky top-0 z-10
      h3 text-lg font-bold text-ois-text tracking-tight  // title
      Button ghost h-8 w-8 p-0 hover:bg-ois-bg rounded-lg → X 18 text-ois-text-subtle
    body flex-1 overflow-y-auto px-6 py-2               // children
```

Effect: `document.body.style.overflow='hidden'|'unset'` while open (`Modal.tsx:21-30`). Early return `if (!isOpen) return null` (`Modal.tsx:32`).

Invariants to preserve:

- Backdrop click = close. `X` button is `ghost` 8×8.
- No header actions beyond title+X (footer lives inside children).
- Radius `rounded-2xl` (= `ois-modal 12px` via class) + `shadow-2xl` (maps to `shadow-ois-modal 0 20px 24px...` token).

### 3.2 Page wizard — `src/routes/changes/NewChange.tsx:233`

```
max-w-3xl mx-auto pb-12
  top bar flex justify-between: Link ← Calendar + [draftSaved emerald + Save as draft outline h-8]
  h1 text-2xl font-bold + p text-sm text-ois-text-muted // "Submit an RFC..."
  Card mt-6
    CardBody p-8
      Stepper current 0..3 (if step<4) // w-8 h-8 rounded-full border-2, done bg-ois-primary Check14, active bg-white border-ois-primary
      step content (renderStep1..4)
      actions bar flex justify-between mt-8 pt-6 border-t border-ois-border
        Back outline gap-1.5 (if step>0)
        right: [Save as draft outline sm (step 2|3)] + [Next/Submit primary gap-1.5 ArrowRight14 | Submit for review] disabled={!canAdvance()} + submitError text-xs text-ois-danger
```

Success step (index 4): `w-16 h-16 rounded-full bg-emerald-100 Check 32 emerald` + `h2 text-2xl font-bold` + `publicId mono text-lg text-ois-primary` + `Opening change detail… text-xs subtle` + `Submit another outline` / `View change → primary disabled={!createdPublicId}` (`NewChange.tsx:827-856`). Auto-navigate `setTimeout 1500ms → /changes/:publicId` (`NewChange.tsx:281-286`).

### 3.3 Field primitives

| Primitive | File | Classes |
|-----------|------|---------|
| `Input` | `src/components/ui/Input.tsx:19` | `h-9 w-full rounded-ois-btn border border-ois-border-strong bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary` |
| `textarea` | `NewChange.tsx:344` | `w-full rounded-lg border border-ois-border-strong bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none` (rows 3..8) |
| `FilterDropdown` | `src/components/ui/FilterDropdown.tsx:54` | `h-8 pl-3 pr-2 text-sm font-medium rounded-lg border` trigger `bg-ois-surface-muted border-ois-border` → open `bg-white border-ois-primary ring-2 ring-ois-primary/20`; panel `z-50 bg-white border-ois-border rounded-xl shadow-ois-dropdown` + `h-[3px] bg-ois-primary` strip |
| `TagInput` | `NewChange.tsx:125` | `h-9 rounded-lg border border-ois-border-strong px-3` + `Add outline sm h-9 Plus13` + chips `bg-ois-bg border border-ois-border rounded-full px-2 py-0.5 text-xs font-medium text-ois-text` with `X 11 hover:text-ois-danger` |
| `TypeCard` | `NewChange.tsx:91` | `flex-1 p-4 rounded-xl border-2` selected `border-ois-primary bg-blue-50/50` else `border-ois-border bg-white hover:border-ois-border-strong`; inner `w-4 h-4 rounded-full border-2` dot `w-2 h-2 bg-ois-primary` |
| `Select` (native) | `CreateCIModal.tsx:123` | `w-full h-9 rounded-md border border-ois-border bg-white px-2 text-sm` |

Label: `text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5` + required `span text-ois-danger *` (`NewChange.tsx:329`, `CreateIncidentModal.tsx:71`, `CreateCIModal.tsx:92`). Modal labels use `text-sm font-medium text-ois-text mb-1` (`CreateIncidentModal.tsx:70`) — both valid; per-entity may choose but must include `*` for required.

Button: `src/components/ui/Button.tsx:12-25` — `primary bg-ois-primary text-white hover:bg-ois-primary-hover`, `secondary bg-ois-surface-muted border-ois-border`, `ghost bg-transparent hover:bg-ois-surface-muted`, `destructive bg-ois-danger`, `outline border-ois-border-strong`; sizes `sm h-8 px-3 text-xs` / `md h-9 px-4 text-sm` / `lg h-10 px-6`; `disabled:opacity-50 pointer-events-none` + `active:scale-[0.98]`.

---

## 4. Inventory — All Create Surfaces

| Surface | Route / Trigger | Component | Fields | File |
|---------|-----------------|-----------|--------|------|
| Create Incident | `IncidentQueue` `New incident` | `CreateIncidentModal` | Title* + Description + Priority* (P1..P4 radio pill) + Assignee `FilterDropdown` + Reporter channel `FilterDropdown` (phone/email/user_report/inc/monitoring/integration) | `src/components/incidents/CreateIncidentModal.tsx:34`, `src/routes/incidents/IncidentQueue.tsx:613` |
| Create Incident from Alert | `EventDetail` `Create Incident from alert` | `CreateIncidentModal` (same) | same + prefills `triggeringEventPublicId` (post-create link) | `src/routes/monitoring/EventDetail.tsx:679` |
| Create Problem | `ProblemList` `New problem` gated `Can problem.create` | `CreateProblemModal` (inside list) | Title* + Description (optional) | `src/routes/problems/ProblemList.tsx:55` |
| Add CI | `CMDBList` `+ Add CI` gated `cmdb.update` | `CreateCIModal` | Name* + Public ID (auto) + Type* 8 pills `grid-cols-4` + Environment (4) + Criticality (4) + Service select + Tags comma | `src/components/cmdb/modals/CreateCIModal.tsx:42`, `src/routes/cmdb/CMDBList.tsx:361` |
| New Change (wizard) | `/changes/new` gated `Can change.create` else `NewChangeDenied` `ShieldAlert` | `NewChange` 4-step | Step1 Basics: Title* Description* Justification* Type* (`TypeCard` 3) + AffectedCIs TagInput + LinkedProblems/Incidents TagInput + Release input; Step2 Plan: Schedule `datetime-local` + `ConflictBanner` + Risk pills/score bar + Impact + ImplementationPlan* 100 chars mono + Rollback* + TestPlan; Step3 Review: summary `grid-cols-2 dl` + Routing auto + Application picker + Comms channels; Step4 Submit → success | `src/routes/changes/NewChange.tsx:212`, `src/routes/index.tsx:158` |
| New Threshold | `CapacityThresholds` `+ New threshold` gated `Can capacity.update` | `NewThresholdModal` | Name* + Description + Metric select + Severity radio 3 + Condition `> value % for duration min` + Alert route + Auto-scaling checkbox+policy + Auto-create rule checkbox | `src/components/capacity/NewThresholdModal.tsx:15` |
| New Request | `RequestQueue` `New request` → `/portal/catalog` | `CatalogItemDetail` form (portal) | Dynamic `CatalogItem.formFields` (`FieldType` 11) → Review + Submit `POST /requests` | `src/routes/portal/CatalogItemDetail.tsx`, `src/routes/requests/RequestQueue.tsx:312` |
| New Deployment (manual) | `DeploymentsQueue` `+ Manual deploy` | Inline modal in queue | Component/env/artifact/strategy/branch | `src/routes/deployments/DeploymentsQueue.tsx:610` |

Future stubs (no modal yet): Improvements `+ New initiative` (Plan says `CreateInitiativeModal` — `src/routes/improvement/ImprovementRegister.tsx`), Testing `New plan/case/Trigger run`, Continuity `+ New BIA entry` — inert buttons (`src/routes/improvement/*`, `src/routes/testing/*`, `src/routes/continuity/BIAMatrix.tsx:24`).

---

## 5. Field Spec (per entity)

### 5.1 Incident — `CreateIncidentModal.tsx:16-45`

| Field | Type | Required | Validation | UI |
|-------|------|----------|------------|----|
| `title` | `string` | ✅ | `trim()>0`, else `Create disabled` (`CreateIncidentModal.tsx:151`) | `Input placeholder Brief, descriptive summary` (`CreateIncidentModal.tsx:73`) |
| `description` | `string markdown` | — | — | `textarea rows 4 placeholder Markdown supported` `w-full px-3 py-2 text-sm border-ois-border rounded-lg resize-none focus:ring-ois-primary/30` (`CreateIncidentModal.tsx:84`) |
| `priority` | `P1..P4` | ✅ | default `P2` | Radio pills `flex gap-3` `px-3 py-2 rounded-lg border` selected `priorityColors` (`P1 red-400/50/700 ... P4 green` `CreateIncidentModal.tsx:46`) |
| `assigneeId` | `string` | — | `''` = Unassigned | `FilterDropdown fullWidth` `options=[Unassigned, ...usersService.list()]` via `useResource(usersService.list)` (`CreateIncidentModal.tsx:36,127`) |
| `channel` | `phone|email|user_report|self_service|monitoring|integration` | — | default `phone` | `FilterDropdown fullWidth` `CHANNEL_OPTIONS` (`CreateIncidentModal.tsx:140`) |
| Post-create | `publicId` | — | client generates `INC-2026-XXXXX` (`random 185..283`) today — M7 will be `POST /incidents` returning `publicId` (`CreateIncidentModal.tsx:55`) | calls `onCreated(publicId)` then reset+close (`CreateIncidentModal.tsx:56-63`) |

### 5.2 Problem — `ProblemList.tsx:55`

| Field | Type | Required | Validation | UI |
|-------|------|----------|------------|----|
| `title` | `string` | ✅ | `trim()>0` disabled | `input w-full border-ois-border rounded-lg px-3 py-2 text-sm focus:ring-ois-primary/30` placeholder Brief summary (`ProblemList.tsx:75`) |
| `description` | `string` | — | — | `textarea rows 3` `resize-none` (`ProblemList.tsx:87`) |
| Derived | `severity P3`, `source user_reported`, `ownerId user-current` | — | auto | — |

Submit: `handleCreateProblem` creates `PRB-YYYY-#####` client-side `extraProblems` (`ProblemList.tsx:164-189`) — future `POST /problems` (`server/routes/itsm.ts:30` currently only `GET`).

### 5.3 CI — `CreateCIModal.tsx:42`

| Field | Type | Required | Validation | UI |
|-------|------|----------|------------|----|
| `name` | `string` | ✅ | `trim()>0` disabled | `Input placeholder payment-api-prod` (`CreateCIModal.tsx:92`) |
| `publicId` | `string` | — | auto `CI-TYP-#####` if empty (`CreateCIModal.tsx:64`) | `Input placeholder auto-generated` (`CreateCIModal.tsx:96`) |
| `type` | `CIType` 8 (`server|application|database|load_balancer|service|network|storage|endpoint`) | ✅ | default `application` | Grid `grid-cols-4 gap-1.5` pills selected `bg-ois-primary text-white border-ois-primary` else `bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg` (`CreateCIModal.tsx:102`) |
| `environment` | `production|staging|development|test` | — | default `production` | `select h-9 rounded-md border-ois-border` (`CreateCIModal.tsx:123`) |
| `criticality` | `critical|high|medium|low` | — | default `medium` | `select` (`CreateCIModal.tsx:133`) |
| `serviceId` | `string` | — | — | `select` `— unassigned —` + `services.map` (`CreateCIModal.tsx:145`) |
| `tags` | `string` csv | — | split `,` trim | `Input placeholder comma,separated,tags` (`CreateCIModal.tsx:157`) |
| `attributes` | `CIAttributes` | auto | `defaultAttributes(type)` per kind (`CreateCIModal.tsx:21`) | — |

Submit: builds `ConfigurationItem` with `health operational`, `ownerTeamId team-current` (`CreateCIModal.tsx:62`), calls `onCreate(ci)` then `reset()` + `onClose()`.

### 5.4 Change — `NewChange.tsx:24-43` (reference — heaviest flow)

| Field | Required | Step | Validation |
|-------|----------|------|------------|
| `title` | ✅ | 1 Basics | `trim()>0` (`canAdvance step0`) |
| `description` | ✅ | 1 | required (no check but validated server `createChangeSchema title 1..200`) |
| `justification` | ✅ | 1 | required |
| `type` `standard|normal|emergency` | ✅ | default `normal`, `TypeCard` 3 (`NewChange.tsx:371`) |
| `affectedCIs` | — | 1 | TagInput |
| `linkedProblems/Incidents/Release` | — | 1 | TagInput + input |
| `plannedStart/plannedEnd` ISO | ✅ | 2 Plan | `datetime-local` → `new Date(v).toISOString()` on submit (`NewChange.tsx:878`) |
| `risk` low..critical + `riskFactors` min 2 | 2 | gated `!isStandard`, score `min(100,RISK_BASE+ (len-2)*5)` bar `h-2 bg-ois-border` fill `>65 red >30 amber else emerald` (`NewChange.tsx:53,483`) |
| `impact` 5 | 2 | gated `!isStandard` | pills |
| `implementationPlan` | ✅ | 2 | `≥100 chars` (`canAdvance step1`) counter `text-[11px] text-ois-warning` (`NewChange.tsx:545`) |
| `rollbackPlan` | ✅ | 2 | `>0` |
| `testPlan` | — | 2 | — |
| `commsRequired + commsChannels` | — | 3 Review | checkbox + 3 channels (`NewChange.tsx:738`) |

Application scoping: `useScopedAppId` (`scopedAppId/requireApplicationId/writableApps`) + `ScopeMismatchModal` if `scope.appId !== scopedAppId` (`NewChange.tsx:277,911`). See §8.

### 5.5 Common delta per entity (when adding new)

New entity form MUST list fields in a table like above, with `Required`, `Type`, `UI control` (`Input`/`textarea`/`FilterDropdown`/`TagInput`/`TypeCard`/`select`), default, and validation line referencing source. Reuse `TagInput`/`TypeCard` patterns from `NewChange.tsx:91,125` verbatim rather than re-deriving.

---

## 6. Behavior

### 6.1 Validation & disable gate

- **Per-field required marker** `*` red (`text-ois-danger`). Label pattern `Title <span class="text-ois-danger">*</span>` (`CreateIncidentModal.tsx:71`, `NewChange.tsx:330`, `ProblemList.tsx:72`).
- **Primary disabled until valid**:
  - Incident: `disabled={!title.trim()}` (`CreateIncidentModal.tsx:151`)
  - Problem: `disabled={!title.trim()}` (`ProblemList.tsx:101`)
  - CI: `disabled={!name.trim()}` (`CreateCIModal.tsx:167`)
  - Change: `disabled={!canAdvance()}` where `canAdvance()` = step0 `title.trim()>0`, step1 `implementationPlan≥100 && rollbackPlan>0` (`NewChange.tsx:860`)
  - Threshold: `disabled={!name}` (`capacity/NewThresholdModal.tsx` — filtered)

Hard gate is `disabled` + `opacity-50 pointer-events-none` via `Button` (`Button.tsx:31`), not toast. Server Zod (`issues → 400`) is second line — see `server/routes/*` per `02-api-contract.md:46`.

### 6.2 Footer & actions

Modal footer: `flex justify-end gap-2 pt-2 border-t border-ois-border` + `Cancel ghost` + `Create/Add primary` (`CreateIncidentModal.tsx:149`, `ProblemList.tsx:97`, `CreateCIModal.tsx:165`). Order is **Cancel left of primary** — jangan dibalik.

Wizard footer: `flex justify-between mt-8 pt-6 border-t border-ois-border` + left Back + right `Save as draft outline sm` + `Next/Submit primary`. Error `text-xs text-ois-danger` below primary (`NewChange.tsx:988`).

### 6.3 Submit → optimistic → navigate → refresh

- Modals: build object client-side now (temporary until M7 server `POST`), call `onCreated`/`onCreate` prop, then `reset()` + `onClose()` (`CreateIncidentModal.tsx:56-63`, `CreateCIModal.tsx:81-83`, `ProblemList.tsx:59-65`).
- Change page: `await changesService.create({title,description,justification,type,risk,impact,plannedStart,plannedEnd,implementationPlan,rollbackPlan,affectedCIIds,applicationId})` (`NewChange.tsx:871`), then `localStorage.removeItem('new-change-draft')`, `setCreatedPublicId(change.publicId)`, `setSubmitted(true)`, `setStep(4)`, auto `navigate(/changes/:publicId)` after `1500ms` (`NewChange.tsx:281`).
- CI/Problems today use `extraProblems`/`extraCIs` local prepend — future `POST` via `req.scoped.*` + `useResource` refresh pattern seperti `IncidentDetail` (`src/routes/incidents/IncidentDetail.tsx:164-192` — `useResource` + `refreshIncident/Timeline/Comments`).

Incident detail parallels: mutation helpers (`handleStatusChange/handlePromoteMajor/handleSetLinks`) do **optimistic `setInc(prev=>...)`**, `try await service.*`, `catch console.error + revert snapshot`, `finally refreshIncident()` (`IncidentDetail.tsx:297-314,335-357,359-381`). **Wajib pakai pola yang sama** untuk future `problems/changes/requests` write endpoints.

### 6.4 Draft persistence (page only)

`localStorage.setItem('new-change-draft', JSON.stringify(form))` on `Save as draft` (`NewChange.tsx:261`) with `draftSaved` `emerald` `2000ms` timer + `useRef` cleanup on unmount (`NewChange.tsx:258,302`). Restore `useEffect []` `JSON.parse` try/catch ignore malformed (`NewChange.tsx:289-299`). On submit success `removeItem` (`NewChange.tsx:885`). Modals **tidak persist** — reset di `handleCreate` (`CreateIncidentModal.tsx:57`).

### 6.5 Scope guard (app scope)

Hanya `NewChange` yang saat ini wiring app scope (`NewChange.tsx:275-278`), pattern **wajib** untuk semua future create yang butuh `applicationId`:

```tsx
const { scope } = useScope();
const { value: scopedAppId, setValue: setScopedAppId, requireApplicationId, writableApps } = useScopedAppId();
const [pendingSubmit, setPendingSubmit] = useState<null | (() => Promise<void>)>(null);
// in handleNext/submit:
if (enabled && requireApplicationId && !scopedAppId) { setSubmitError('Please choose an Application.'); return; }
if (enabled && scope !== 'all' && scopedAppId && scope.appId !== scopedAppId) { setPendingSubmit(() => doSubmit); return; }
await doSubmit();
// render:
{pendingSubmit && <ScopeMismatchModal open currentScopeName={...} submittedAppName={...} onCancel={()=>setPendingSubmit(null)} onConfirm={async()=>{ const fn=pendingSubmit; setPendingSubmit(null); if(fn) await fn(); }}/>}
```

`ScopeMismatchModal` props: `open, currentScopeName, submittedAppName, onCancel, onConfirm` (`NewChange.tsx:912-925`). Server mengirim `applicationId: scopedAppId ?? undefined` (`NewChange.tsx:883`).

Non-change modals belum perlu picker karena list sudah scoped via `filterReadable`/`withScopedDb` — jika future entity per-app, **pakai pattern yang sama** alih-alih duplikat logic.

### 6.6 Error & loading states

- **Validation inline:** `Input error` renders `class border-ois-danger + text-[11px] text-ois-danger` (`Input.tsx:22-28`); Promote pattern uses `text-xs text-ois-danger` under field (`src/components/problems/PromoteToKnownErrorModal.tsx:65`).
- **Submit error:** wizard shows `text-xs text-ois-danger` under primary (`NewChange.tsx:989`); modals in future should add `submitError` state → `bg-ois-danger-pale border-ois-danger/20 text-ois-danger` banner seperti `IncidentDetail` error style.
- **Loading:** `Button loading` prop spins svg + disables (`Button.tsx:36,39-44`). Detail pages use `py-24 Loading… text-ois-text-muted`.
- **403 `scope_violation`:** global `withScopedDb` + `requireAuth` (`server/app.ts:126`, `server/middleware/scopedDb.ts:19`) → `{ error:'scope_violation' }` — modal/wizard **tidak render** jika `!useCan(module,action)` / `NewChangeDenied` `ShieldAlert danger` + `Cannot create… Back to calendar` (`NewChange.tsx:218-231`). Same pattern `Can` fallback in `ProblemList.tsx:271` / `IncidentQueue`.

### 6.7 Post-create continuation

- Incident modal: `onCreated(publicId)` → caller navigates (`IncidentQueue.tsx` wraps with `navigate(/incidents/:id)` or link via `EventDetail` linkedIncidentId).
- Change: `View change →` enabled after `createdPublicId` (`NewChange.tsx:851`) plus auto-open after 1500ms.
- CI: `onCreate(ci)` → list optimistic prepend (future `POST /cmdb` + `cidService.create` + `cisService` `useResource` refresh — cf. `IncidentDetail.tsx:164`).
- Design preservation: future navigations **wajib** pakai `publicId` (bukan internal `id`), `font-mono text-ois-primary` (`IncidentDetail.tsx:525` `IDCell`), and keep `Copy ID / Copy link` in `⋯` menu (`IncidentDetail.tsx:496`).

---

## 7. Permissions (action-level)

| Create action | Permission | Who (seed `prisma/seedRbac.ts`) | UI gate | Server |
|---------------|------------|----------------------------------|---------|--------|
| Create incident | `incident.create` | IFM all; APS officer+ `STA/IFM/APS` | `Can incident.create` around `New incident` button (`IncidentQueue.tsx`) | `requirePermission('incident.create')` + `POST /incidents` `req.scoped.incidents.create` |
| Create problem | `problem.create` (`prb-create`) | IFM/APS officer+ `scope all` | `Can problem.create` (`ProblemList.tsx:271`) | `requirePermission('problem.create')` (future `POST /problems`) |
| Add CI | `cmdb.write` (`cmdb.update` legacy) | `cmdb.update` gate → `Can cmdb.update` (`CMDBList.tsx`) | `+ Add CI` | `POST /cmdb` (planned `req.scoped.cmdb`) |
| Create change | `change.create` (APS Change & Release team) | `useCan('change','create')` → `NewChangeDenied` if false (`NewChange.tsx:213`) | `New change` button | `POST /changes` `change.write` + `createChangeSchema` (`server/routes/itsm.ts`) |
| Create threshold | `capacity.update` | `Can capacity.update` | `+ New threshold` | `POST /capacity/thresholds` |
| Submit request | `request.create` (any auth) | any authenticated | `Submit request` via portal `CatalogItemDetail` | `POST /requests` |

Scope: `filterReadable(user,'incident',...)` / `problemResource` / `changeResource` / `requestResource` + `withScopedDb` (`server/middleware/scopedDb.ts:19`, `server/scope/scopedDb.ts`). Violation → `ScopeViolationError` → 403 `{ error:'scope_violation' }` (`server/scope/errors.ts:9`, `server/app.ts` handler). `requireAuth` is global (`server/app.ts:126`) — tanpa itu `tenantId=undefined` = leak (`docs/design/01-erd.md:11`).

---

## 8. API Touchpoints

Ref: [`../../design/02-api-contract.md`](../../design/02-api-contract.md) §Auth, §Resource routers, §Conventions.

Prefix `/api/v1`, session cookie + `requireAuth`, `withScopedDb` → `req.scoped.*`, Zod `issues→400`, `ScopeViolationError→403`.

| Action | Endpoint | Permission | Body / Notes | Source |
|--------|----------|------------|--------------|--------|
| List incidents | `GET /api/v1/incidents?page&pageSize&ciId=&problemPublicId=` | `incident.read` | `parsePagination` via `server/lib/pagination.ts` | `server/routes/incidents.ts:20`, `02-api-contract.md:32` |
| Create incident | `POST /api/v1/incidents` | `incident.create` | `{title,description,priority,assigneeId,channel,applicationId?}` → returns `{publicId}` (M7 formalize; today `CreateIncidentModal:55` is mock) | `server/routes/incidents.ts` (planned) |
| List problems | `GET /api/v1/problems?page&pageSize` | `problem.read` | `scoped(req).problems.list(pagination)` | `server/routes/itsm.ts:30-32` |
| Create problem | `POST /api/v1/problems` | `problem.create` | `{title,description}` `createProblemSchema` (future) — today client `extraProblems` (`ProblemList.tsx:164`) | planned M7 |
| List CIs | `GET /api/v1/cmdb?page&pageSize` | `cmdb.read` | `req.scoped.cmdb` | `server/routes/cmdb.ts` |
| Create CI | `POST /api/v1/cmdb` | `cmdb.write` | `{name,publicId?,type,environment,criticality,serviceId,tags,attributes}` — currently `onCreate(ci)` client | planned |
| List changes | `GET /api/v1/changes?page&pageSize` | `change.read` | `req.scoped.changes` | `server/routes/itsm.ts` |
| Create change | `POST /api/v1/changes` | `change.write` | `{title,description,justification,type,risk,impact,plannedStart,plannedEnd,implementationPlan,rollbackPlan,affectedCIIds,applicationId}` validated `createChangeSchema` `title 1..200, type standard|normal|emergency` | `server/routes/itsm.ts`, `NewChange.tsx:871` |
| Cancel/reschedule/tech-assessment | `PATCH /api/v1/changes/:publicId/cancel\|reschedule\|tech-assessment` | `change.write` | `reason 1..2000` / `plannedStart/End+reason` / `status/objective/...risks` | `docs/features/changes.md:217` |
| Submit request | `POST /api/v1/requests` | `request.create` | `CatalogItem.workflowTemplate` + `formFields` | `server/routes/itsm.ts:159` |

All behind `requireAuth` (`server/app.ts:126`), `tenantLimiter` `600/min`, scoped via lint-enforced `req.scoped.*` (`eslint.config.js:19` — `no-restricted-imports` for `prisma/@prisma/client` in `server/routes/**/*.ts`, exempt `admin.ts` etc. — `02-api-contract.md:13`).

Client via `src/services/*` (`incidentsService`, `problemsService`, `changesService`, `cisService`, `requestsService` in `src/services/itsmServices.ts` → `apiFetch`). Future writes follow the same `apiFetch` pattern used for `incidentsService.setStatus(resolve/promote)` (`IncidentDetail.tsx:307,347,373`).

Socket (future for creates): `tenant:{tenantId}` auto-refresh queue/calendar (per `Incidents API Touchpoints` `tenant:{tenantId}+incident:{publicId}` via `src/services/realtime.ts`) — changes/incidents already wired; new creates will emit to `tenant:{tenantId}` on success.

---

## 9. Tokens & Styling

All via `src/index.css:7-58` `@theme` — **never hardcode hex** (`08-design-system.md`).

| Token | Value | Usage in create flow |
|-------|-------|----------------------|
| `ois-primary` | `#1F4FD4` | Primary button, active pill/border, focus `ring-ois-primary/20` |
| `ois-primary-hover` | `#1A42B5` | Primary hover |
| `ois-primary-pale` | `#EEF2FF` | Selected row / TypeCard active tint |
| `ois-bg` | `#F7F8FA` | Page background (`body`), chip `bg-ois-bg` |
| `ois-surface` | `#FFFFFF` | Card/modal bg |
| `ois-surface-muted` | `#F1F3F7` | SectionCard header, FilterDropdown idle, input hover |
| `ois-border` | `#E4E7EC` | All card/component borders, modal `border-ois-border`, `pt-2 border-t` footer |
| `ois-border-strong` | `#D0D5DD` | Input/outline button border |
| `ois-text` | `#101828` | Headings, input text |
| `ois-text-muted` | `#475467` | Labels secondary, helper |
| `ois-text-subtle` | `#98A2B3` | Placeholder, `tracking-widest` labels |
| `ois-success/pale` | `#12B76A/#ECFDF3` | P4, success banner, done stepper |
| `ois-warning/pale` | `#F79009/#FFFAEB` | P2/P3 risk bar amber |
| `ois-danger/pale` | `#F04438/#FEF3F2` | Required `*`, error `text-ois-danger`, P1, `destructive` button |
| `ois-info/pale` | `#0BA5EC/#F0F9FF` | Triaging, info banner |
| `ois-sev-p1..p4` | `#B42318/#DC6803/#DC6803/#027A48` | Priority pills (`priorityColors` maps to these) |
| `shadow-ois-dropdown` | `0 12px 16px -4px rgba(16,24,40,0.08)` | Dropdown panel |
| `shadow-ois-modal` | `0 20px 24px...` | Modal `shadow-2xl` |
| `rounded-ois-btn/modal/card` | `6px/12px/8px` | Buttons 6px, modals 12px (`rounded-2xl`), cards 8px |
| `font-mono` | `Geist Mono` | IDs (`publicId font-mono text-[11px] font-bold text-ois-primary`), plan `font-mono text-xs` |

Font: `Plus Jakarta Sans` sans (`src/index.css:4`), sizes `11px section label uppercase tracking-widest`, `12px badge`, `14px body/button`, `20px title`. Icons `lucide-react` only (`Plus 13/14`, `X 11/12`, `Search 13/14`, `ChevronDown 13`, `ShieldAlert 36`, `Check 14`).

Pattern refs: `design-tokens.md §1-4`, `08-design-system.md Tokens/Component inventory`.

---

## 10. Empty / Loading / Error

| State | Modal (Incident/Problem/CI) | Page (Change wizard) |
|-------|-----------------------------|----------------------|
| Empty fields | placeholders `Brief, descriptive summary` / `Optional details` / `payment-api-prod` / `comma,separated,tags` — no banner | same, plus `ConflictBanner` conditional (only May 9-11 freeze shows amber `bg-amber-50 border-amber-200 AlertTriangle`) (`NewChange.tsx:168`) |
| Gate (no permission) | hide button (`Can` fallback null `ProblemList.tsx:271`) | `NewChangeDenied` centered `max-w-xl p-8 bg-white rounded-xl border-ois-border ShieldAlert 36 danger + Cannot create changes + Back to calendar` (`NewChange.tsx:218`) |
| Loading submit | `Button loading` spinner `animate-spin` disables (`Button.tsx:39`) | same, plus `submitError` slot `text-xs text-ois-danger` (`NewChange.tsx:988`) |
| Server validation 400 | (future) `Input error` `border-ois-danger focus:ring-ois-danger/20` + `text-[11px] text-ois-danger` (`Input.tsx:22`) | same; Change also inline counter `text-ois-warning — need at least 100` (`NewChange.tsx:546`) |
| Scope 403 | toast/border via `ScopeMismatchModal` (future wired) | `ScopeMismatchModal` confirm flow + `Please choose an Application.` (`NewChange.tsx:898`) |
| 404/closed 409 | n/a | Reschedule/Cancel modals `409 closed` guard (`docs/features/changes.md:129`) |
| Success | close → caller toast + `onCreated(publicId)` → `navigate(/incidents/...)` | `Step 4` emerald card + `Opening…` + `timeout 1500ms → /changes/:publicId` |

---

## 11. Design Preservation

Wajib pertahankan saat refactor (dari `src/components/ui/Modal.tsx` + `CreateIncidentModal.tsx` + `NewChange.tsx`):

1. **Modal shell** `fixed z-50 + bg-slate-900/40 backdrop-blur-sm + rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200` + header `px-6 py-4 border-b bg-white sticky` + body `flex-1 overflow-y-auto px-6 py-2` + hide `body overflow hidden` (`Modal.tsx:21-53`) — jangan ganti jadi `terra linear-card`.
2. **Label + required** `* text-ois-danger` pattern (`NewChange.tsx:330`, `CreateIncidentModal.tsx:71`) — always include, always danger red.
3. **Focus ring** `focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary` on every `Input/textarea/FilterDropdown` (`Input.tsx:20`, `NewChange.tsx:335`) — keep `ois-primary/20`.
4. **Primary disabled** `disabled:opacity-50 pointer-events-none` via `Button.tsx:31` gating on `!title.trim()` / `canAdvance()` — preserve hard gate, not just hint.
5. **Modal footer** `flex justify-end gap-2 pt-2 border-t border-ois-border Cancel ghost → onClose + Create/Add primary` (`CreateIncidentModal.tsx:149`) — Cancel always left.
6. **Priority radio** `flex gap-3 rounded-lg border` active `priorityColors` else `border-ois-border text-ois-text-subtle hover:border-ois-border-strong` + dot logic not swapped for select (`CreateIncidentModal.tsx:99-122`).
7. **CI type pills** `grid-cols-4 gap-1.5 text-[11px] font-bold uppercase` selected `bg-ois-primary text-white` else `bg-white border-ois-border` (`CreateCIModal.tsx:102-117`) — preserve `uppercase`.
8. **Stepper** `w-8 h-8 rounded-full border-2` done `bg-ois-primary border-ois-primary Check14` / active `bg-white border-ois-primary text-ois-primary` / future `border-ois-border text-ois-text-subtle` (`NewChange.tsx:61-85`) — preserve dot+number logic and connector `h-0.5 flex-1 mx-1 bg-ois-primary|bg-ois-border` (`NewChange.tsx:82`).
9. **TypeCard** `border-2 p-4 rounded-xl` selected `border-ois-primary bg-blue-50/50` else `border-ois-border hover:border-ois-border-strong` + inner `w-4 h-4 rounded-full` (`NewChange.tsx:91-122`).
10. **Risk score bar** `h-2 rounded-full bg-ois-border` fill `width ${score}%` colored `>65 #F04438 >30 #F79009 else #12B76A` (`NewChange.tsx:483-495`) — preserved per `docs/features/changes.md:23`.
11. **ConflictBanner** `bg-amber-50 border-amber-200 rounded-xl p-3 AlertTriangle 16 amber-600` (`NewChange.tsx:176`) — frozen to May 9-11 today.
12. **Scope mismatch** `ScopeMismatchModal` deferred confirm pattern (`NewChange.tsx:911-925`) — do not inline `confirm()` dialog.
13. **Tokens exclusively `ois-*`** — no ad-hoc hex except `priorityColors` mapping which itself maps to `ois-sev-*` (`src/index.css:34-38`).

---

## 12. Migration Notes (modal ↔ server)

Today, Incident/Problem/CI creates are **client-side** (`extraProblems` array, `onCreate(ci)` with generated `publicId`), while Change is the **first server-wired** (`changesService.create` → `POST /api/v1/changes`). When promoting a modal to server:

1. Add Zod schema `create<Entity>Schema` in `src/shared/schemas/*` (like `createChangeSchema` / `cancelRequestSchema` `src/shared/schemas/request.ts:9`).
2. Add `server/routes/*` handler `requirePermission('<entity>.create')` + `req.scoped.<entity>.create` + `audit` + `Socket.IO tenant:{tenantId}` emit (mirror `Incidents` pattern `server/app.ts:126`, `server/scope/errors.ts:9`).
3. Add service method (`*Service.create`) in `src/services/itsmServices.ts` via `apiFetch` (like `changesService.create`, `requestsService.*`).
4. Replace `handleCreate` in modal: `await service.create(dtoWith.applicationId?)`, `removeItem` if draft, propagate `publicId`, reset + close, caller `navigate(/<module>/:publicId)`.
5. Keep optimistic snapshot pattern (`IncidentDetail.tsx:297`) if list is live-subscribed — no extra follow-up needed.
6. Lint stays `req.scoped.*` — never `prisma` in `server/routes/**/*.ts` (`eslint.config.js:19`, `02-api-contract.md:13`).

---

## 13. Open Items

- [ ] Formalize `POST /incidents` body (`createIncidentSchema`) — today `CreateIncidentModal:55` is `Math.random` mock.
- [ ] Add `POST /problems` + `POST /cmdb` + `POST /capacity/thresholds` write endpoints mirrored from `POST /changes` (`server/routes/itsm.ts`, `server/scope/scopedDb.ts`).
- [ ] Upload field for requests (`FieldType file_upload`) — form exists but not rendered as upload (`src/types/request.ts`, `docs/features/requests.md:54`).
- [ ] Portal catalog submit `POST /requests` — client simulated; wire via `useScopedAppId` like `NewChange` (`docs/features/requests.md:48`).
- [ ] Wire `NewThresholdModal` `Auto-create monitoring rule` checkbox to `monitoringRulesService` + link `linkedRuleIds` (`src/components/capacity/NewThresholdModal.tsx`).
- [ ] Add persisted draft for remaining long forms if any (threshold not needed; initiatives/portal may).
- [ ] `CreateIncidentModal.tsx:55` random `INC-YYYY-#####` → replace with `publicId` from server 201 response.
- [ ] `ProblemList.tsx:102` severity hardcode `P3` on create — derive from form or default via server.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init shared create-flow — distill `Modal.tsx` shell + `CreateIncidentModal`/`CreateCIModal`/`CreateProblemModal` + `NewChange` 4-step wizard + tokens `ois-*` + API `02-api-contract` + scope/mismatch pattern; adapted from terra `_shared/create-flow.md` | `src/components/ui/Modal.tsx:14`, `src/routes/changes/NewChange.tsx:212`, `src/components/incidents/CreateIncidentModal.tsx:34`, `src/routes/incidents/IncidentDetail.tsx:164`, `docs/design/02-api-contract.md:13`, `docs/design/08-design-system.md`, `docs/ui/design-tokens.md`, `src/index.css:7-58` |
