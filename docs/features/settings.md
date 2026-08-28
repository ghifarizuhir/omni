# Profile / Settings — Personal Workspace & Integrations

Status: **Draft**
Route: `/profile` (standalone), `/settings` (5-panel hub)
Sidebar: Platform · Profile / Settings
Source: `src/routes/platform/Profile.tsx`, `src/routes/platform/Settings.tsx` · `src/components/platform/ProfileForm.tsx`, `APITokenRow.tsx`, `GenerateTokenModal.tsx`, `QuietHoursForm.tsx`, `PreferencesTable.tsx`, `AppearanceSettings.tsx`, `IntegrationRow.tsx`, `AddIntegrationModal.tsx`, `integrationMeta.ts` · `server/routes/platform.ts` (`platformRouter` `/users/me`, `/users/me/tokens`, `/users/me/channels`, `/notifications/*`) · `server/routes/integrations.ts` (`/integrations`) · `src/types/platform.ts`, `src/types/integration.ts`, `src/types/service.ts` (`User`) · `src/services/platformServices.ts`, `src/services/integrationsService.ts`

---

## Intent

Satu-dua kalimat: **Profile** adalah view ringkas ownership identitas (`/profile`) untuk edit name/title/timezone/language/bio + kelola API token + danger zone; **Settings** adalah hub **5-panel** (`/settings`) yang memperluas Profile dengan Notifications (quiet hours + topic preferences + connected channels), Appearance (localStorage), dan Integrations (webhook/API lifecycle). Fokus: **self-service, no RBAC khusus** — setiap authenticated user mengelola dirinya sendiri; integrasi yang di-enable di sini mengalir ke Monitoring/Availability/Capacity.

ITIL 4: General Management — User Configuration & Integration Management. Settings bukan admin; field org-managed (`team`, `manager`, `division`) read-only dan dikelola di `/admin/*`.

## Current State (snapshot `src/routes/index.tsx:79-88`, `226-228`)

- `src/routes/index.tsx:79` imports `NotificationPreferences`, `Notifications` (dibaca tapi Settings panel Notifications sudah inline; `NotificationPreferences` route terpisah legacy).
- `src/routes/index.tsx:87` → `import { Profile } from './platform/Profile'`; `88` → `import { Settings } from './platform/Settings'`.
- `src/routes/index.tsx:226` → `{ path: 'profile', element: <Profile /> }` (standalone, centered `max-w-2xl`).
- `src/routes/index.tsx:228` → `{ path: 'settings', element: <Settings /> }` (full-bleed hub `calc(100vh - 3.5rem)`, tidak ada sub-route — panel switch via local `useState<PanelId>`).
- No Module Layout — keduanya plain; Profile `max-w-2xl mx-auto px-4 py-8 space-y-10`, Settings `flex flex-col bg-ois-bg` dengan header + left nav `w-52` + scrollable main `bg-ois-bg`.
- Components: `ProfileForm`, `APITokenRow`/`GenerateTokenModal`, `QuietHoursForm`, `PreferencesTable`, `AppearanceSettings`, `IntegrationRow`, `AddIntegrationModal`, `INTEGRATION_META` (`src/components/platform/` — 7 files + `integrationMeta.ts`).
- API: `platformRouter` (`server/routes/platform.ts`) — `GET /users/me` + `PATCH /users/me` (whitelist `name|title|bio|timezone|language`), `GET/POST /users/me/tokens` + `DELETE /users/me/tokens/:id`, `GET/PUT /users/me/channels/:kind` (`email|sms|slack` upsert), `GET /notifications/preferences` + `GET /notifications/quiet-hours` (`listByKind` documents), `GET /integrations` + `POST/PATCH/DELETE /integrations/:id` (via `server/routes/integrations.ts`). No PATCH for `quietHours`/`preferences` write yet via `platform.ts` (memakai `notificationsService` mock/docs store).
- Types: `User` (`id|email|name|avatarUrl|title|bio|timezone|language|team|manager|division|department|level`), `ApiTokenSummary` (`id|name|prefix|createdAt|lastUsedAt`), `ApiTokenCreated` (`token: ois_...`), `NotificationChannelRow` (`kind: email|sms|slack | address|verified`), `NotificationPreference` (`userId|topic: 15 topics|channels: in_app|email|sms|slack | respectQuietHours|overrideForUrgent`), `QuietHoursConfig` (`userId|enabled|timezone|fromHour|toHour|daysOfWeek: 0-6`), `Integration` (`id|name|kind: 8|mode: webhook|api|webhookPath|webhookSecret|payloadFormat|apiBaseUrl|apiTokenMasked|pollIntervalSec|status: healthy/degraded/error/pending|domains: monitoring|availability|capacity | enabled|eventCount24h|lastEventAt|errorMessage|createdAt|createdBy`) (`src/types/platform.ts:83-117`, `src/types/integration.ts:11-53`).
- Constants: `TIMEZONES` 8 (ProfileForm) + 6 (QuietHoursForm), `LANGUAGES` 5 (`en|fr|es|de|ja`), `SCOPES` 6 (`read:incidents|write:incidents|read:changes|write:changes|read:all|write:all`), `NOTIFICATION_TOPIC_META` 15 topics grouped 6 (`INCIDENTS|SLA|APPROVALS|OPERATIONS|KNOWLEDGE & REPORTING|ON-CALL` via `src/lib/constants.ts`), `INTEGRATION_META` 8 (`dynatrace api|kibana|grafana|datadog|prometheus|newrelic|cloudwatch|custom webhook` + `logo|blurb`).
- Styling: `ois-*` tokens (`src/index.css:8-48`) — `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4`, `ois-primary-pale #EEF2FF`, `ois-primary-hover #1A42B5`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-success #12B76A`, `ois-warning #F79009`, `ois-danger #F04438` (+ pale variants).

**Working:**

- **Profile (`Profile.tsx:17-180`):** `useResource(() => usersService.current(), [])` + `apiTokensService.list()` → `APIToken[]` mapping `id|name|createdAt.split('T')[0]|lastUsed locale|scope: prefix`. Avatar `w-20 h-20 rounded-full bg-ois-primary text-white text-2xl font-bold` with initials (`name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()`) or `avatarUrl img object-cover`. Identity line `name 18px bold ois-text + title · team 14px muted + email 12px muted`. `Change photo` `Button ghost sm gap-1.5 Camera 13` **disabled** `title="Photo upload is coming soon."`. `SectionHeading` `text-base font-bold ois-text + description xs muted mt-0.5 mb-5`. `ProfileForm initialValues` `key={user?.id ?? 'loading'}` flush identity. Tokens header `flex justify-between mb-4` with `Revoke all` ghost `text-ois-danger hover:bg-red-50 gap-1.5 Trash2 13` (conditional `tokens.length>0`) + `Generate new token` outline `gap-1.5 Plus 14`. Empty `py-10 text-center text-sm muted border-dashed border-ois-border rounded-ois-card "No active tokens."` else table `border rounded-ois-card overflow-hidden` `thead bg-ois-surface-muted border-b` `th py-2.5 px-4 text-xs font-semibold muted Name|Created|Last used|Prefix` + `tbody APITokenRow`. Danger zone `border red-200 rounded-ois-card p-5 bg-red-50/50` `h2 text-sm font-bold red-700` + `p text-xs red-600` + `dangerAlert` amber `bg-amber-50 border amber-200 rounded text-xs amber-700 AlertTriangle 14` → `Button destructive sm Delete my account` sets `setDangerAlert(true)` (no real delete).
- **Settings hub (`Settings.tsx:19-491`):** `PanelId = profile|notifications|api-tokens|appearance|integrations`; `NAV_SECTIONS` `[{heading:'Account', items:[Profile User14, Notifications Bell14, API tokens KeyRound14]}, {heading:'Workspace', items:[Appearance Palette14, Integrations Plug14]}]`. Page frame `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + page header `shrink-0 border-b bg-ois-surface px-8 py-5` `h1 text-xl font-bold tracking-tight ois-text + p text-sm muted`. Body `flex flex-1 min-h-0` left `aside w-52 shrink-0 border-r bg-ois-surface py-6 px-3 space-y-6` per section `p text-[11px] font-semibold subtle uppercase tracking-widest px-3 mb-1.5` + `ul space-y-0.5` button `relative flex gap-2.5 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors` active `bg-ois-primary-pale text-ois-primary font-medium` else `text-muted hover:bg-surface-muted hover:text-text` + left indicator `absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-ois-primary rounded-full` when active + icon `active text-primary else subtle`. Main `flex-1 overflow-y-auto bg-ois-bg px-10 py-8` renders `PANELS[activePanel]`.
- **ProfilePanel (`Settings.tsx:70-146`):** `max-w-2xl space-y-10` + `PanelHeader title "Profile" desc "Manage your personal..."` (`mb-8 h2 text-base font-bold tracking-tight + p text-sm muted`). `SectionBlock title text-[11px] font-semibold subtle uppercase tracking-widest + desc xs muted` — Identity row avatar `w-16 h-16 rounded-full bg-ois-primary` initials; name `text-base font-bold`, title/team `text-sm muted`, email `text-xs muted mt-1`, `Change photo` `ghost sm gap-1.5 -ml-2 Camera 12` disabled. ProfileForm same as Profile. Danger zone same red-50/50 card.
- **NotificationsPanel (`Settings.tsx:150-229`):** `max-w-3xl space-y-10` + `PanelHeader "Notifications" "Control how..."`. Data `useResource notificationsService.preferences|quietHours|userChannelsService.list` + local `preferences QuietHoursConfig + channels email/sms/slack` via `useEffect` sync. `SectionBlock "Quiet hours" "Suppress non-urgent..."` → `border rounded-ois-card p-5 bg-ois-surface` wraps `QuietHoursForm`. `SectionBlock "Topic notifications" "Choose which channels..." action Saved xs success` → `PreferencesTable`. `SectionBlock "Connected channels" "Where OIS delivers..."` → `border rounded-ois-card overflow-hidden bg-ois-surface` 3 rows `flex justify-between px-5 py-3.5 border-b last:border-0` each `h-8 w-8 rounded-lg bg-surface-muted Icon 14 muted` + label `text-[11px] font-semibold subtle uppercase tracking-widest Email|SMS|Slack` + input `text-sm font-medium bg-transparent border-none outline-none focus:underline` `value ↔ emailAddr/smsAddr/slackAddr` `onBlur → userChannelsService.upsert(kind, address)` + `refetchChannels`.
- **QuietHoursForm (`QuietHoursForm.tsx:49-190`):** `space-y-5` — enable toggle `input checkbox h-4 w-4 rounded border-ois-border text-ois-primary` + `text-sm font-medium Enable quiet hours`. Fields `opacity-40 pointer-events-none` when disabled. Timezone select `block w-full max-w-xs rounded-lg border-ois-border bg-ois-surface px-3 py-2 text-sm` 6 options. From/To hour selects `Array 24 00:00-23:00` + `to` `text-sm muted`. Days `flex gap-2` 7 pills `h-9 w-11 rounded-lg text-xs font-semibold border` active `bg-ois-primary text-white border-ois-primary` else `bg-surface text-muted border muted hover:border-primary/50`. Status indicator when enabled `inline-flex gap-2 rounded-full px-3 py-1 text-xs font-medium` `isCurrentlyInQuietHours()` (logic handles overnight `from>to` → `CURRENT_HOUR>=from||<to`; `from<to` → `>=from&&<to`; daysOfWeek includes `CURRENT_DAY_OF_WEEK` hardcoded `6 Sat + 14h`). `Save quiet hours` `Button sm`.
- **PreferencesTable (`PreferencesTable.tsx:28-153`):** `space-y-4` → `overflow-x-auto rounded-xl border border-ois-border table w-full text-sm` `thead border-b bg-ois-surface-muted th py-3 text-xs font-semibold muted uppercase tracking-wide Topic w-56 + 4 channels w-20 (In-app|Email|SMS|Slack icon 📱✉️💬) + Quiet hours w-28`. Body grouped `GROUP_ORDER 6` → `filter notificationTopicMeta[topic].group` → `tr bg-surface-muted/50 group header colspan6 py-2 pl-4 text-[11px] font-bold muted uppercase tracking-widest INCIDENTS|SLA etc.` + per pref row `hover:bg-surface-muted/30` `td py-3 pl-4` `p font-medium ois-text meta.label + p 11px muted meta.description` + 4 `td text-center input checkbox h-4 w-4 rounded border-ois-border` toggles `channels` + `td text-center button pill rounded-full px-2.5 py-0.5 text-[11px] font-semibold Respect bg-[#EEF2FF] text-[#1F4FD4] vs Ignore bg-[#FEF3F2] text-[#B42318]`. Footer `flex justify-end Save preferences Button sm`.
- **APITokensPanel (`Settings.tsx:233-308`):** `max-w-2xl space-y-8` `PanelHeader "API Tokens"` + `SectionBlock "Active tokens"` action `Revoke all ghost text-ois-danger Trash2 12 + Generate new token outline Plus13`. Same empty/table as Profile but header Scope not Prefix → `APITokenRow`.
- **APITokenRow (`APITokenRow.tsx:25-64`):** `tr border-b last:border-0 hover:bg-surface-muted/40` `td py-3 px-4 name text-sm font-medium | created text-sm muted whitespace-nowrap | lastUsed muted | scopes flex gap-1 span inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium scopeColor: write amber-50/700 border amber-200, read sky-50/700, else surface-muted` + `td text-right Button ghost sm text-ois-danger hover:bg-red-50 Trash2 14 Revoke`.
- **GenerateTokenModal (`GenerateTokenModal.tsx:25-157`):** `Modal title "Generate API token" size sm` 2 states: pre-gen `Input label Token name placeholder "e.g. CI/CD pipeline" + error "Token name is required"` + `Scopes` `SCOPES 6` checkboxes `h-4 w-4 rounded border-ois-border-strong text-ois-primary` group `flex gap-3 cursor-pointer` label `text-sm font-mono font-medium group-hover:text-primary + desc xs muted` + footer `border-t flex gap-2 Generate token primary sm + Cancel outline` → `onGenerated(name, scopes.join(' ')||'read:all')` uses `FAKE_TOKEN ois_tok_abc...` (stub, real via `POST /users/me/tokens`). Post-gen `Copy this token now — it will not be shown again. text-xs font-medium muted` + `flex gap-2 p-3 bg-surface-muted rounded-ois-btn border` `code flex-1 text-xs font-mono break-all FAKE_TOKEN` + `button gap-1 px-2 py-1 rounded Copy/Check 13 copied text-success bg-green-50 else muted hover:bg-ois-border` + `Store securely text-[11px] amber-600 bg-amber-50 border amber-200 rounded px-3 py-2` + `Done outline`.
- **Appearance panel (`Settings.tsx:420-431` → `AppearanceSettings.tsx:68-149`):** `max-w-2xl space-y-8 PanelHeader "Appearance"` + `AppearanceSettings` `space-y-6` 4× `OptionGroup label text-[11px] font-semibold subtle uppercase tracking-widest + flex gap-2 buttons px-4 py-2.5 rounded-ois-btn border text-sm font-medium active border-ois-primary bg-ois-primary/5 text-ois-primary shadow-sm else border-ois-border hover:border-strong hover:bg-surface-muted disabled opacity-40`. Groups: Theme `Light|Dark disabled "Coming soon"|System`, Display density `Comfortable|Compact|Spacious`, Table density `Default|Compact|Comfortable`, Date format `Relative "5 minutes ago"|Absolute "May 10, 2026"|Both`. Load/save `localStorage key ois-preferences` `loadPrefs()` merges `defaultPrefs {light comfortable default relative}` + saved JSON (try/catch); `handleSave` `setTimeout 400ms` write JSON + `Saved Preferences saved text-xs success`.
- **IntegrationsPanel (`Settings.tsx:310-416`):** `max-w-4xl space-y-8 PanelHeader "Integrations" desc Dynatrace API token; everything else webhook URL`. Stats strip `flex flex-wrap gap-3` 5 `IntegrationStat flex-1 min-w-[140px] gap-3 px-4 py-3 border rounded-ois-card bg-ois-surface` `icon mt-0.5` + `p 10px font-semibold subtle uppercase tracking-widest label + p text-lg font-bold tabular-nums Sources|Healthy "healthy/enabled" tone success if all else text|Needs attention issues tone warning if >0 | Events·24h locale | Mode mix webhook vs api JSX`. Header computed `total = length, healthy = enabled&&healthy, issues = enabled&&(error||degraded), events24h = sum eventCount24h if enabled, webhooks/apis by mode`. `SectionBlock "Connected sources" "Each integration shows where it feeds..." action Add integration primary sm Plus13 → AddIntegrationModal`. Content `loading&&!data 3× h-20 animate-pulse border rounded-ois-card` vs empty `py-10 text-center dashed "No integrations yet."` vs `space-y-3 map IntegrationRow`.
- **IntegrationRow (`IntegrationRow.tsx:32-180`):** `border rounded-ois-card bg-ois-surface overflow-hidden !enabled opacity-70 expanded shadow-ois-card`. Trigger row button `w-full flex gap-4 px-5 py-4 text-left hover:bg-surface-muted/30` logo `w-10 h-10 rounded-xl bg-surface-muted border text-xl meta.logo`, name `text-sm font-semibold`, status pill `inline-flex gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border healthy bg-success-pale text-success | degraded amber | error red-50| pending muted dot w-1.5 h-1.5`, mode pill `text-[10px] font-medium px-1.5 py-0.5 rounded-full border uppercase tracking-wider api purple-50/700 vs webhook ois-primary-pale` with `KeyRound 9|Link2 9`, domain pills `bg-ois-bg text-muted border`, subtitle `text-xs muted truncate apiBaseUrl · polled every N s else webhookPath`, right `hidden sm:flex flex-col items-end tabular-nums text-sm font-bold events + label 10px subtle uppercase "events · 24h" + last 11px muted "last Xm ago" via relative()`. Expanded `px-5 pb-5 pt-1 border-t bg-surface-muted/20 space-y-4` errorMessage `text-xs px-3 py-2 rounded-lg bg-red-50 border red-200`. Webhook mode URL `label 11px semibold subtle uppercase tracking-widest Webhook URL code flex-1 px-3 py-2 text-xs font-mono border rounded-lg bg-white truncate url=integrationsService.webhookUrl(path)` + Copy Button `copied? Check success : Copy 12`. Secret `••••••••` toggle `Eye/EyeOff 12` + Rotate `RefreshCw 12` (`onRotate → integrationsService.rotateSecret id = new whk_<random>`). Hint `payloadFormat font-mono + X-OIS-Signature HMAC-SHA256 text-[11px] muted`. Api mode grid `sm:grid-cols-2 gap-3 KV label 10px subtle uppercase tracking-widest + value mono truncate Environment|API token masked|Poll interval|Created`. Footer `flex justify-between pt-2 border-t createdAt by createdBy 11px muted + Buttons Power Enable|Disable outline sm + Trash2 Remove ghost danger + MoreHorizontal muted`.
- **AddIntegrationModal (`AddIntegrationModal.tsx:28-357`):** `Modal title "Add integration" size lg` 3-step `pick|configure|review` stepper `-mx-6 px-6 py-4 mb-2 border-b flex gap-2` each step `flex gap-2 text-xs font-medium active text-primary vs completed success vs pending subtle` + circle `h-5 w-5 rounded-full border tabular-nums 10px bold Check success else active border-primary bg-primary-pale vs border subtle` + connector `flex-1 h-px bg-ois-border`. Body pick `p text-sm muted helper + grid grid-cols-2 gap-3 KIND_ORDER 8 buttons border rounded-ois-card p-4 hover:border-primary hover:shadow-ois-card text-2xl logo + label text-sm font-semibold + mode pill same as row + blurb xs muted` → `pickKind(k)` sets `kind, mode=defaultMode, name="${label} integration", step configure`. Configure `space-y-5 Display name Input + dynatrace ? API connection card border rounded-ois-card p-4 bg-surface-muted/40 KeyRound Environment URL mono placeholder https://<tenant>.live.dynatrace.com + API token password + scopes hint entities.read problems.read metrics.read 11px muted : webhook receiver Globe card "OIS will generate unique URL..." + dashed link2 11px mono truncate fullWebhookUrl`. Domains `text-[11px] semibold uppercase tracking-widest "Feed these OIS domains" grid 3 gap-2 buttons border rounded-ois-card p-3 active border-primary bg-primary-pale else muted hover toggleDomain` checkbox `w-3.5 h-3.5 rounded-[4px] border bg-primary if on else border + Check 9`. Review `flex gap-3 p-4 border rounded-ois-card meta.logo + name 14px semibold + meta.label · mode · feeds domains 12px muted` + `CopyField label 11px tracking-widest code flex-1 px-3 py-2 text-xs font-mono border rounded-lg bg-surface-muted/40 truncate + Button Copy/Check CopyField hint dashed won't be shown again vs api Environment URL + p-3 bg-success-pale/30 border success/20 "Token verified. OIS will poll every 60s..."`. Footer `-mx-6 px-6 pt-3 border-t flex justify-between Cancel ghost + Back outline if step!==pick + Continue primary gap-1.5 ArrowRight13 if configure → review + Enable integration primary if review`. Generated `useMemo {path:/api/v1/hooks/in/${kind}-${slug6}, secret:whk_<32random>_<slug>}` stable per `kind|isOpen`. On create build `Integration {id:intg-${Date.now()}, name, kind, mode, status:'pending', domains, enabled:true, eventCount24h:0, createdAt:now.slice(0,10), createdBy:'sarah.chen', webhookPath/Secret/payloadFormat generic|kibana|grafana|datadog else apiBaseUrl/apiTokenMasked/pollIntervalSec:60}` → `onCreate` → `integrationsService.create` then `handleClose reset`.
- **ProfileForm (`ProfileForm.tsx:41-167`):** `space-y-5`  `TIMEZONES 8 Asia/Jakarta, SGT, Tokyo etc + UTC, LANGUAGES 5`. Fields grid `sm:grid-cols-2 gap-4`: Full name `Input label`, Job title `placeholder "e.g. Site Reliability Engineer"`, Team+Manager readOnly `input disabled selectClass h-9 rounded-ois-btn border-ois-border-strong bg-white focus:ring-ois-primary/20 disabled:bg-surface-muted muted + helper [11px] subtle "Managed by your administrator."`, Timezone/Language selects `h-9 rounded-ois-btn border-ois-border-strong`, Bio `textarea rows3 w-full rounded-ois-btn border-ois-border-strong bg-white px-3 py-2 text-sm focus:ring-ois-primary/20 resize-none placeholder "A short bio..."`. Footer `flex gap-3 pt-1 Save changes Button primary sm loading saving + saved text-xs success "Profile saved" animate-in fade-in + error text-xs danger`. `handleSave` `usersService.updateMe {name trim, title|bio|timezone|language null if empty}` → `onSaved(updated)` + `setSaved 3s`.
- Auth/permissions via `server/middleware/auth.ts:48 requirePermission` + `withScopedDb`; platform reads require `user.read` (covers `/users/me`, tokens, channels, notifications). No `user.write` split; PATCH `/users/me` auth only (session required). Tokens/channels tenant-scoped `prisma.apiToken|notificationChannel` `userId==session.userId` + `tenantId`.

**Stub / Partial:**

- `Change photo` in both Profile and Settings disabled (`disabled title "Photo upload is coming soon..."`) — `avatarUrl` render exists but no upload endpoint; admin updates avatar separately.
- `Connected channels "Change" stub removed` — now inputs editable with `upsert` on blur (working) but no verification flow (`verified boolean` in `NotificationChannelRow` never set; no OTP/email confirm).
- `GenerateTokenModal` uses `FAKE_TOKEN ois_tok_...` constant; `SCOPES` checkboxes collect but `apiTokensService.create(name)` ignores scopes (server `POST /users/me/tokens` only takes `name`, hashes `ois_<base64url>` `prefix slice 0,12`, stores `tokenHash sha256`, returns raw once). `scope/prefix` column shows prefix not real scope.
- `PreferencesTable` toggles mutate local `preferences` array only; `onSave` just `setSaved` toast 3s — no `PUT /notifications/preferences` call; `respectQuietHours` pill `Respect|Ignore` toggles but `overrideForUrgent` never exposed.
- `QuietHoursForm` hardcoded `CURRENT_DAY_OF_WEEK 6 Sat + CURRENT_HOUR 14` for indicator; `Save quiet hours` calls `onSave(config)` local (`setQuietHours`) only — no `PUT /notifications/quiet-hours`. Timezone list trimmed 6 vs Profile 8+UTC.
- `AppearanceSettings` persists only `localStorage ois-preferences`; no server `PATCH /users/me/preferences`; `Dark` option disabled `opacity-40 cursor-not-allowed "Coming soon"`.
- `Integrations` writes optimistic local: `onCreate` builds randomId `intg-${Date.now()}` + `eventCount24h 0` but server `POST /integrations` would re-id; `rotateSecret` client `whk_${random}` vs real HMAC rotation; `toggle` does `get+patch enabled` via `integrationsService.toggle` but `pending` hardcode if enabling; stats derived client-side not from `/integrations/stats` endpoint (exists but not used in Settings panel — uses local aggregation).
- Danger zone `Delete my account` both places only `setDangerAlert(true)` yellow banner `"Account deletion is managed by your organization admin."` — no `DELETE /users/me` endpoint (planned per `docs/pages/profile.md:81` `DELETE /users/current` planned).
- 2FA/MFA, session management (active sessions, revoke device) deferred (per `docs/pages/settings.md:118-119`).
- No pagination/search/sort for tokens/integrations beyond trivial list; no URL persist for active panel.

**Missing:**

- `PUT /notifications/preferences` + `PUT /notifications/quiet-hours` formal schemas + server persistence beyond docs store (`quiet-hours` currently `firstByKind` single global per tenant, not per-user).
- `POST /notifications/channels/verify`, token scope enforcement (`read:incidents` etc. vs legacy `prefix`), token scopes UI ↔︎ JWT claims wiring.
- Avatar upload `POST /users/me/avatar` + `avatarUrl` CDN; 2FA (`POST /users/me/mfa`), sessions `GET /users/me/sessions`.
- Realtime: token lastUsed background update, integration health check scheduled job (spec'd but no `server/jobs/` entry nor `tenant:{tenantId}` socket for `integration:updated`).
- `Profile` alias divergence: `/profile` ↔︎ `/settings` Profile panel duplicate logic (both render `ProfileForm` + tokens + danger zone; DRY extraction not yet).

## Primary View

### Settings Hub — Layout (`src/routes/platform/Settings.tsx:435-491`)

Outer `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` — page chrome fixed header + scrollable body:

- **Header:** `shrink-0 border-b border-ois-border bg-ois-surface px-8 py-5` `h1 text-xl font-bold tracking-tight ois-text "Settings" + p text-sm muted "Manage your workspace preferences, integrations, and account options."`.
- **Body:** `flex flex-1 min-h-0` split:
  - Left nav `w-52 shrink-0 border-r border-ois-border bg-ois-surface py-6 px-3 space-y-6` 2→ sections Account (Profile, Notifications, API tokens) + Workspace (Appearance, Integrations). Each item button `px-3 py-2 rounded-lg text-sm` active `bg-ois-primary-pale text-ois-primary font-medium` + bar `w-0.5 h-5 bg-ois-primary rounded-full`.
  - Main `flex-1 overflow-y-auto bg-ois-bg px-10 py-8` renders `PANELS[activePanel]` (no routing — state only).

No filter/search/toolbar at hub level; each panel owns its controls. No `Empty/Loading/Error` global — per-panel.

### Profile Panel (default `activePanel='profile'`)

Layout `max-w-2xl space-y-10` (`Settings.tsx:79-145`) plus mirrored `/profile` route `max-w-2xl mx-auto px-4 py-8 space-y-10` (`Profile.tsx:49-151`):

- **Identity block:** `SectionBlock title Identity` → `flex gap-5` circle `w-16 (settings) / w-20 (profile) h-16/20 rounded-full bg-ois-primary text-white font-bold text-xl/2xl` initials else `img object-cover`; name `text-base/lg font-bold`, title/team `text-sm muted`, email `text-xs muted`; `Change photo Button ghost sm disabled Camera 12/13` tooltip.
- **Profile information:** `SectionBlock title "Profile information" desc "Update your display name, role, and contact preferences."` → `ProfileForm` (see Working).
- **Danger zone:** `border border-red-200 rounded-ois-card p-5 bg-red-50/50` `p text-sm font-bold red-700 Danger zone + p xs red-600 + dangerAlert amber border + Button destructive sm`.

### Notifications Panel (`NotificationsPanel` + `QuietHoursForm` + `PreferencesTable`)

`max-w-3xl space-y-10` (`Settings.tsx:150-229`):

- `PanelHeader "Notifications" "Control how and when OIS notifies you."`
- Quiet hours card `border rounded-ois-card p-5 bg-ois-surface` → `QuietHoursForm` (Enable toggle + Toggles disabled opacity-40 + Timezone 6 + From/To 0-23 + Days 7 pills + status pill Currently in quiet hours #FFFAEB/#DC6803 dot #F79009 vs Not in gray + Save quiet hours).
- Topic notifications `SectionBlock action Saved xs success` → `PreferencesTable` (Topic column w-56 + 4 channels w-20 + Quiet hours pill w-28; group header bg-surface-muted/50 11px bold tracking-widest; each row hover 30%; `notificationTopicMeta[topic].label/description`).
- Connected channels `border rounded-ois-card overflow-hidden bg-ois-surface divide-y` 3 rows `Mail|Phone|MessageSquare 14 icons h-8 w-8 rounded-lg bg-surface-muted + input transparent focus:underline placeholder Not set` onBlur `userChannelsService.upsert(kind, address)`.

### API Tokens Panel

`max-w-2xl space-y-8` (`Settings.tsx:233-308` ≈ `Profile.tsx:106-151`):

- `PanelHeader "API Tokens" desc Tokens...` + `SectionBlock "Active tokens"` actions `Revoke all ghost danger Trash2 + Generate new token outline Plus`.
- Conditional: 0 → `py-10 text-center dashed border-ois-border "No active tokens. Generate..."`; >0 → table `border rounded-ois-card thead bg-ois-surface-muted Name|Created|Last used|Scope|_ ` + `APITokenRow` rows; `lastUsed Never if null`.
- `GenerateTokenModal` trigger `showGenModal` → `handleGenerated(name,_scope) => apiTokensService.create(name) → refetchTokens` (scope dropped server-side).

### Appearance Panel

`max-w-2xl space-y-8` (`Settings.tsx:424-431`) → `AppearanceSettings.tsx:92-148`:

- `PanelHeader "Appearance" "Customize the look..."` + 4 OptionGroups stacked `space-y-6`.
- Each group `label 11px semibold subtle uppercase tracking-widest + flex gap-2 buttons rounded-ois-btn px-4 py-2.5 border active border-ois-primary bg-ois-primary/5 success else hover`.
- Footer `flex gap-3 pt-2 Save preferences primary sm loading saving + Preferences saved success animate-in`.

### Integrations Panel

`max-w-4xl space-y-8` (`Settings.tsx:324-416`):

- `PanelHeader "Integrations" desc "Connect external monitoring & observability... Dynatrace uses API token; everything else webhook URL..."`.
- Stats strip `flex gap-3 flex-wrap` 5× `IntegrationStat border rounded-ois-card bg-ois-surface px-4 py-3 min-w-[140px] flex gap-3 icon 15 + label 10px tracking-widest subtle uppercase + value 18px bold tabular-nums` totals 5 metrics (Sources, Healthy ratio, Needs attention, Events·24h locale, Mode mix webhook/api spans).
- `SectionBlock "Connected sources" desc Each integration shows where it feeds: Monitoring, Availability, or Capacity. action Add integration primary Plus13 → AddIntegrationModal`. States loading skeleton `3× h-20 animate-pulse` vs empty dashed vs list `space-y-3 IntegrationRow`s.

### Profile Standalone (`/profile` extra vs Settings Profile panel)

Identical Identity + ProfileForm + tokens + danger zone but:
- Page-level `h1 text-2xl font-bold tracking-tight My Profile + p text-sm muted Manage your personal...` (`Profile.tsx:50-54`).
- Tokens table header last col `Prefix` not `Scope` (naming drift); `tokens:APIToken scope:t.prefix`.
- No Notifications/Appearance/Integrations — intentionally simplified; `docs/pages/profile.md:4` "versi simplified dari Settings → Profile".

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| View Profile | `GET /profile` | authenticated (`user.read` for `GET /users/me` else session) | — |
| View Settings hub | `GET /settings` nav → panel switch | authenticated | — |
| Switch panel | Left nav button `User/Bell/KeyRound/Palette/Plug 14` | — | — |
| Edit profile | `ProfileForm` inputs + `Save changes` | own user only (no RBAC) — `PATCH /users/me` whitelisted `name|title|bio|timezone|language`; `team|manager` read-only | — |
| Generate token | `Generate new token` → `GenerateTokenModal` `Generate token` → `POST /users/me/tokens {name}` | own tokens (`apiTokensService.create`) | — |
| Revoke token | `APITokenRow Revoke` `Trash2 14` → `DELETE /users/me/tokens/:id` | own token | token active |
| Revoke all tokens | `Revoke all` ghost `Trash2 12/13` → loop revoke id | own tokens | ≥1 token |
| Copy token (once) | Post-gen `Copy` `Copy|Check 13` → `navigator.clipboard.writeText` | — | token just created (FAKE_TOKEN stub) |
| Configure quiet hours | `QuietHoursForm` enable + timezone 6 + from/to 0-23 + days 7 pills + `Save quiet hours` | own prefs | — (local only, no PUT yet) |
| Toggle topic channels | `PreferencesTable` checkbox `in_app|email|sms|slack` `h-4 w-4 rounded border-ois-border` | own prefs | — |
| Toggle Respect quiet hours | `PreferencesTable Ignore↔Respect pill` `#EEF2FF/#FEF3F2` | own prefs | — |
| Save preferences | `Save preferences` Button sm → toast Saved 3s | — | — (stub) |
| Edit connected channels | Inputs `Email|SMS|Slack` transparent `onBlur` → `PUT /users/me/channels/:kind {address}` | own channels | `address` non-empty |
| Save appearance | `Save preferences` in Appearance → `localStorage ois-preferences` `Pref {theme|displayDensity|tableDensity|dateFormat}` | local only | — |
| View integration | `IntegrationRow` click expand toggle `setExpanded` | — | — |
| Add integration | `Add integration` primary `Plus 13` → `AddIntegrationModal` 3-step Pick→Configure→Review→Enable `POST /integrations` | `integration.write` (via `integrationsService.create`) | kind chosen |
| Toggle Enable/Disable | `Power 12` in expanded row → `integrationsService.toggle(id)` (get+patch enabled) | `integration.write` | exists |
| Rotate secret | `RefreshCw 12 Rotate` in expanded webhook row → `integrationsService.rotateSecret(id)` `whk_<random>` | `integration.write` | webhook mode |
| Delete integration | `Trash2 12 Remove` ghost danger → `integrationsService.remove(id) DELETE` | `integration.write` | exists |
| Copy webhook URL/secret | `Copy` `Copy|Check 12` button next to `code font-mono truncate` | — | webhook mode |
| Delete account (stub) | `Delete my account` destructive → `setDangerAlert(true)` amber banner | own account | — (no DELETE) |

No list-level bulk, no filter URL persist, no pagination.

## Filters / Sort / Search

- No global filters at hub level.
- **API tokens:** no search; table order `createdAt desc` from `prisma.apiToken orderBy createdAt desc` (`platform.ts:119`). Last used formatted `toLocaleDateString` else Never; prefix displayed via `scope` alias.
- **Notifications:** `PreferencesTable` client-only; `GROUP_ORDER 6` fixed ordering; no search; channel toggles instant `onChange` array `map p.topic === pref.topic ? {...p, channels: toggle } : p` + `respectQuietHours` flip.
- **Integrations:** client `integrations: Integration[] data ?? []` (`useResource integrationsService.list`) aggregated stats `total|healthy|issues|events24h|webhook|Api` computed `useMemo` inline. No search/filter in panel yet (server supports `?domain=monitoring|availability|capacity` via `listByDomain` but unused in Settings).
- **URL persist:** none (activePanel is `useState` reset on refresh; deep-link `?panel=notifications` not implemented — gap vs `cmdb ?view=graph`).
- Sort: tokens `createdAt desc`; integrations `as returned` (created order); channels fixed `email|sms|slack`.

## Detail View

No separate `/settings/:id` — panels are self-contained. If detail concept needed, defer to [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) — but Settings has no entity detail page; all detail is inline expansion (`IntegrationRow` expanded `border-t bg-surface-muted/20 px-5 pb-5 pt-1 space-y-4` with KV grid `sm:grid-cols-2` for API mode + footer meta `createdAt by createdBy 11px muted` + actions).

Profile/Appearance/Notifications panels are also inline; no drawer/modal detail beyond `GenerateTokenModal` + `AddIntegrationModal`.

## State Lifecycle

```
User:          active (no lifecycle — profile PATCH in-place; avatar pending)
               deletion: stub → admin-mediated (no DELETE /users/me)

ApiToken:      active (createdAt, prefix, token once) → revoked (revokedAt non-null) → filtered out (list where revokedAt null)
               lastUsedAt updated background on Bearer use (no UI except Last used column)

QuietHours:    disabled → enabled (timezone + fromHour + toHour + daysOfWeek 0-6) → isCurrentlyInQuietHours computed (overnight vs daytime)
               no server state machine — stored per-tenant kind quiet-hours docs; per-user scoping missing

NotificationPreference: channels toggle additive → respectQuietHours boolean flip → overrideForUrgent (type-only, not UI)
                        grouped by topic 15: incident_assigned, incident_update_p1p2|any, sla_warning|breach, approval_request, mention, change_in_my_services, deployment_in_my_services, capacity_alert, report_ready, kb_review_due, dr_test_reminder, on_call_shift_start|escalation

Appearance Preferences: localStorage ois-preferences {theme light|dark(disabled)|system, displayDensity comfortable|compact|spacious, tableDensity default|compact|comfortable, dateFormat relative|absolute|both} → Save writes JSON + 400ms delay + toast 3s

Integration:   pending (new) → healthy|degraded|error (via health check job not yet wired) → enabled toggles opacity-70 when disabled; status pill dot/color maps STATUS_STYLES
               domains additive Monitoring|Availability|Capacity feeding surface indicator in IntegrationsPanel stats + row pills
```

## Permissions (action-level)

| Role | Profile PATCH | Tokens create/revoke | Quiet hours / prefs save | Channels upsert | Appearance save | Integrations create/toggle/rotate/delete |
|------|---------------|----------------------|--------------------------|-----------------|-----------------|------------------------------------------|
| Any authenticated | ✅ own (`PATCH /users/me` whitelist `name|title|bio|timezone|language`) | ✅ own (`prisma.apiToken where userId==session.userId`) | ✅ own (local / docs store `listByKind` tenant-scoped) | ✅ own (`PUT /users/me/channels/:kind` upsert `userId_kind`) | ✅ local (`localStorage`) | `integration.*` gated via `integrationsService` (server `platform.ts` vs `server/routes/integrations.ts` requires `integration.read|write`; UI `Button` not wrapped `Can` — gap) |
| Team/Mgr/Admin | — `team/manager/division` read-only disabled `Managed by your administrator.` | — | — | — | — | — |

No `user.write`/`admin` check for self-service; global `requireAuth` (`server/app.ts:126`) ensures `req.tenantId`/`req.session`; per-route `requirePermission('user.read'|'notification.read'|'integration.*')` in `platformRouter.use('/users', requirePermission('user.read'))` etc. (`platform.ts:22-33`). `ScopeViolationError` → 403 `{error:'scope_violation'}` not applicable — tokens/channels are `userId` filtered, not `tenant` scoped via `req.scoped`.

Cross-tenant isolation: tokens/channels use `prisma ... where userId==session.userId` + `tenantId` for tokens; notifications/inbox `listByKind(tenantId, ...)` documents.

## Empty / Loading / Error

- **Empty tokens** `Profile.tsx:123-126` + `Settings.tsx:279-282` `py-10 text-center text-sm muted border-dashed border-ois-border rounded-ois-card "No active tokens. Generate one to get started."`.
- **Empty integrations** `Settings.tsx:394-397` `py-10 text-center dashed "No integrations yet. Add one to start ingesting alerts."` vs loading `!data` + `loading` → `3× h-20 animate-pulse border rounded-ois-card` (`Settings.tsx:388-392`).
- **Tokens loading** none — `data ?? []` → empty state immediately (no skeleton unlike CMDB).
- **Notifications loading** `quietHours && <QuietHoursForm>` guards null (shows empty `border p-5` until fetch); `preferences` starts `[]` → table renders just groups with length 0 until `useEffect` syncs `prefData`.
- **Profile loading** `user?.name ?? '—'` placeholder; Form `key={user?.id ?? 'loading'}` remounts when loaded; no skeleton.
- **Error:** `ProfileForm` inline `error text-xs danger` + `saved text-xs success`; `usersService.updateMe` catch `err.message else 'Failed to save'` (`ProfileForm.tsx:69-71`). Tokens/channels no inline banner — silent fail (should show `Retry` — gap vs `useResource error` pattern in `src/services/core.ts:72`).
- **Danger zone:** `isOpen dangerAlert` amber `bg-amber-50 border-amber-200 text-xs amber-700 AlertTriangle 14` `"Account deletion is managed by your organization admin."` below card before re-click.
- **Appearance:** no empty — always shows OptionGroups with current `prefs` (defaults `light comfortable default relative`).
- **No pagination:** fits `<100` tokens/integrations per user; virtualization not needed.

## Phase 2 Deferred

- Avatar upload `POST /users/me/avatar` + CDN + `avatarUrl` live update — rationale: currently `disabled title Photo upload is coming soon` both routes; admin-only manual update.
- 2FA/MFA (`POST /users/me/mfa enroll/verify`, backup codes) + Session management `GET /users/me/sessions` revoke device — gaps `docs/pages/settings.md:118-119`.
- Formalize `PUT /notifications/preferences` + `PUT /notifications/quiet-hours` server schemas (Zod) + `overrideForUrgent` checkbox + `per-user` `quiet-hours` kind (currently `firstByKind` tenant single) — rationale: currently optimistic local only.
- Token scopes server enforcement: accept `scopes[]` in `POST /users/me/tokens` + JWT claim `scope` check vs hardcoded prefix; `SCOPES` UI 6 (read:incidents etc.) wiring — rationale: `apiTokensService.create(name)` ignores scope; FAKE_TOKEN constant.
- Channels verification: `PUT /users/me/channels/:kind` OTP/email confirm + `verified boolean` UI badge — rationale: `NotificationChannelRow.verified` never set.
- Integrations health job: `GET /integrations/stats` live aggregation vs client stats + webhook health poll + `lastEventAt` socket `tenant:{tenantId}` realtime `integration:updated` — rationale: `integration health check scheduled` spec'd but not in `server/jobs/`.
- Integrations deeper: payloadFormat picker `auto|kibana|grafana|datadog|generic` editable, Dynatrace token rotation UI, `webhookUrl` domain param filter in Settings (`listByDomain` unused), imported `connected sources → Monitoring/Availability/Capacity` wiring to `ConnectedSourcesPanel` pattern.
- Panel deep-link: `?panel=profile|notifications|...` URL persist + `NavLink` parity with other Module Layouts — rationale: activePanel is ephemeral state, breaks refresh/bookmark.
- Alias DRY: extract shared `ProfileForm`+tokens+danger zone hook between `/profile` and `/settings` Profile panel — rationale: duplication `Profile.tsx:39-42` vs `Settings.tsx:237-258`.
- Realtime `users.me updated` socket invalidate other tabs / TopBar avatar sync.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/platform/Settings.tsx`, `Profile.tsx`, `src/components/platform/*` + `src/index.css`):

1. **Tokens ois-*** sama seperti CMDB/Monitoring: `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-primary #1F4FD4` / `ois-primary-pale #EEF2FF` / `hover #1A42B5`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3` (`src/index.css:7-33`) — jangan map ke tailwind gray tanpa alias.
2. **Hub layout** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b px-8 py-5` (`Settings.tsx:439-446`) + left `w-52 border-r bg-ois-surface py-6 px-3 space-y-6` + main `bg-ois-bg px-10 py-8 overflow-y-auto` (`Settings.tsx:448-488`) — jangan ganti ke `Module Layout` dengan tab bar top.
3. **Active indicator** `absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-ois-primary rounded-full` + `bg-ois-primary-pale text-ois-primary font-medium` (`Settings.tsx:469-471`) — karakter Settings hub.
4. **PanelHeader** `mb-8 h2 text-base font-bold tracking-tight + p text-sm muted` (`Settings.tsx:47-50`) + **SectionBlock** `text-[11px] font-semibold subtle uppercase tracking-widest + desc xs muted` (`Settings.tsx:55-66`) — hierarki 11px caps.
5. **Avatar** `rounded-full bg-ois-primary text-white font-bold` `w-20 h-20 text-2xl` di Profile vs `w-16 h-16 text-xl` di Settings panel (`Profile.tsx:59`, `Settings.tsx:86`) — konsisten object-cover jika `avatarUrl`.
6. **Danger zone** `border border-red-200 rounded-ois-card p-5 bg-red-50/50` `text-sm font-bold red-700 + text-xs red-600` (`Profile.tsx:153-157`, `Settings.tsx:129`) + amber alert `bg-amber-50 border-amber-200 text-xs amber-700 AlertTriangle`.
7. **API tokens table** `border border-ois-border rounded-ois-card overflow-hidden thead bg-ois-surface-muted border-b th py-2.5 px-4 text-xs font-semibold muted` (`Profile.tsx:130-134`, `Settings.tsx:286-290`) + `APITokenRow scopeColor read sky vs write amber` pill `text-[10px] font-mono font-medium rounded px-1.5 py-0.5 border`.
8. **GenerateTokenModal** post-gen `p-3 bg-surface-muted rounded-ois-btn border` `code text-xs font-mono break-all + Copy button rounded gap-1 px-2 py-1 copied success bg-green-50 else hover:bg-ois-border` + amber `Store this token securely border amber-200 rounded px-3 py-2 text-[11px] amber-600`.
9. **QuietHoursForm** enable opacity dim `opacity-40 pointer-events-none` + days pills `h-9 w-11 rounded-lg text-xs font-semibold active bg-ois-primary` (`QuietHoursForm.tsx:148-151`) + status pill `rounded-full px-3 py-1 text-xs font-medium dot w-2 h-2 inQuiet #FFFAEB/#F79009 else #F1F3F7/#98A2B3`.
10. **PreferencesTable** `rounded-xl border table thead bg-ois-surface-muted th py-3 text-xs font-semibold muted uppercase tracking-wide` group header `bg-surface-muted/50 py-2 pl-4 text-[11px] font-bold tracking-widest` + Respect/Ignore pill `rounded-full px-2.5 py-0.5 text-[11px] font-semibold Respect #EEF2FF/#1F4FD4 vs Ignore #FEF3F2/#B42318` (`PreferencesTable.tsx:124-135`).
11. **Appearance OptionGroup** buttons `rounded-ois-btn px-4 py-2.5 border active border-ois-primary bg-ois-primary/5 text-ois-primary shadow-sm else hover:border-strong hover:bg-surface-muted` + disabled `opacity-40 cursor-not-allowed` for Dark (`AppearanceSettings.tsx:51-56`).
12. **IntegrationStat** `flex-1 min-w-[140px] border rounded-ois-card bg-ois-surface px-4 py-3 icon 15 + label 10px tracking-widest subtle uppercase + value 18px bold tabular-nums` (`Settings.tsx:314-321`) + **IntegrationRow** row `hover:bg-surface-muted/30 border rounded-ois-card status pill 10px dot 1.5 + mode pill purple vs primary-pale uppercase tracking-wider + domain pills bg-ois-bg muted` (`IntegrationRow.tsx:66-87`).
13. **IntegrationRow expanded** `border-t bg-surface-muted/20 px-5 pb-5 pt-1` + `webhook URL code mono border rounded-lg bg-white truncate px-3 py-2 text-xs` + secret masked `••••••••` Eye toggle + Rotate `RefreshCw 12` + hint `font-mono X-OIS-Signature` (`IntegrationRow.tsx:110-139`).
14. **AddIntegrationModal stepper** `flex gap-2 py-4 border-b -mx-6 px-6 active text-primary circle h-5 w-5 border 10px bold active border-primary bg-primary-pale else success bg-success-pale vs subtle` connector `h-px bg-ois-border` (`AddIntegrationModal.tsx:109-136`) + kind grid `border rounded-ois-card p-4 hover:border-primary hover:shadow-ois-card`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| Get me | `GET /api/v1/users/me` | `user.read` (`platformRouter.use /users`) | `prisma.user` include `team/division/department/manager` — returns `id|email|name|avatarUrl|mustChangePassword|level|title|bio|timezone|language|team|division|department|manager` (`platform.ts:42-70`) |
| Update me | `PATCH /api/v1/users/me` | session auth (whitelist `name|title|bio|timezone|language` `strOrNull slice 0,4000`) | `name cannot be empty` 400; omits `team|manager|division|level` (admin-only `PUT /admin/rbac/users/:id`) (`platform.ts:75-110`) |
| List tokens | `GET /api/v1/users/me/tokens` | session auth | `prisma.apiToken where userId==session.userId revokedAt null orderBy createdAt desc select id|name|prefix|createdAt|lastUsedAt` (`platform.ts:114-122`) |
| Create token | `POST /api/v1/users/me/tokens {name}` | session auth | `randomBytes 24 → ois_<base64url> sha256 tokenHash prefix slice 0,12` `prisma.create tenantId+userId+name+hash+prefix` return `{id,name,prefix,createdAt, token:raw}` once (`platform.ts:124-146`) `apiTokensService.create(name)` |
| Revoke token | `DELETE /api/v1/users/me/tokens/:id` | session auth + `findFirst where id,userId` | `update revokedAt now` 204 else 404 (`platform.ts:148-159`) |
| List channels | `GET /api/v1/users/me/channels` | session auth | `prisma.notificationChannel where userId` → `NotificationChannelRow[] id|kind|address|verified` (`platform.ts:162-168`) `userChannelsService.list()` |
| Upsert channel | `PUT /api/v1/users/me/channels/:kind {address}` | session auth `VALID_CHANNEL_KINDS email|sms|slack` | `upsert where userId_kind → tenantId+userId+kind+address trim` 400 if kind invalid or address empty (`platform.ts:170-193`) `userChannelsService.upsert` |
| List prefs | `GET /api/v1/notifications/preferences` | `notification.read` | `listByKind<NotificationPreference>(tenantId,'notification-pref')` (`platform.ts:213-215`) via `notificationsService.preferences()` |
| Quiet hours | `GET /api/v1/notifications/quiet-hours` | `notification.read` | `firstByKind<QuietHoursConfig>(tenantId,'quiet-hours')` (`platform.ts:216-218`) via `notificationsService.quietHours()` |
| List integrations | `GET /api/v1/integrations?page&pageSize&domain=` | `integration.read` (via `server/routes/integrations.ts`) | `apiFetch<Integration[]>` `integrationsService.list()` + `listByDomain(domain)` `?domain=monitoring` |
| Get integration | `GET /api/v1/integrations/:id` | `integration.read` | `integrationsService.get(id)` for toggle lookup |
| Stats | `GET /api/v1/integrations/stats` | `integration.read` | `IntegrationStats {total|enabled|healthy|needsAttention|events24h|webhookCount|apiCount}` — exists but not used in Settings stats strip (client agg) |
| Create integration | `POST /api/v1/integrations` | `integration.write` | `integrationsService.create(Integration)` — Settings builds randomId locally then server re-persists |
| Update integration | `PATCH /api/v1/integrations/:id` | `integration.write` | `integrationsService.update(patch)` + `toggle()` `get+patch enabled` + `rotateSecret()` `patch webhookSecret whk_<random>` |
| Delete integration | `DELETE /api/v1/integrations/:id` | `integration.write` | `integrationsService.remove(id)` |
| Webhook ingest | `POST /api/v1/hooks/in/:slug` | webhook secret `X-OIS-Signature` | URL via `integrationsService.webhookUrl(path)` (`/api/v1/hooks/...`) not catalogued in Settings panel but revealed in Row + Modal `code + Copy` |
| Legacy | `GET /users/:id` `GET /teams*` `GET /notifications` `GET /inbox/*` `GET /on-call/*` | respective `user.read|notification.read|...` | in same `platformRouter` but not used by Settings; `NotificationPreferences` route separate legacy |

Scoped `platformRouter` mounts under `/api/v1` via `server/app.ts` `withScopedDb` context `req.tenantId|req.session.userId`; failure → 401/403 `scope_violation` (tokens/channels filtered by userId, not `req.scoped`).

## Open Items

- [ ] Wire `QuietHoursForm` Save → `PUT /notifications/quiet-hours` (schema `quietHoursSchema timezone string, fromHour 0-23, toHour 0-23, daysOfWeek number[] 0-6, enabled bool`) + switch from `firstByKind` tenant singleton to per-user `userId` key; remove hardcoded `CURRENT_DAY_OF_WEEK 6 / CURRENT_HOUR 14`.
- [ ] Wire `PreferencesTable` toggles → `PUT /notifications/preferences` batch (channels + respectQuietHours per topic 15); expose `overrideForUrgent` UI or remove from type.
- [ ] Fix token scope gap: `POST /users/me/tokens` accepts `scopes[]` (Zod `tokenScopesSchema read:incidents|write:incidents...`) → `ApiToken.scopes[]` + JWT verify middleware; replace `FAKE_TOKEN` with real `rawToken` from response and render once.
- [ ] Add avatar upload `POST /users/me/avatar` multipart + `avatarUrl` presign; enable `Change photo` (remove `disabled`).
- [ ] Add `DELETE /users/me` soft-delete / request flow (`docs/pages/profile.md:81` planned) to replace `setDangerAlert` stub; gate by tenant policy + admin approval.
- [ ] Add 2FA `POST /users/me/mfa` + sessions `GET /users/me/sessions DELETE /users/me/sessions/:id` — close `docs/pages/settings.md:118` gaps.
- [ ] Confirm `userChannelsService` verification OTP flow + `verified` badge in Connected channels (Eye icon currently secret toggle — not channel verify).
- [ ] Add `?panel=` deep-link sync for Settings hub (like `cmdb ?view=graph`) + `useSearchParams` for back/refresh.
- [ ] Replace `sarah.chen` hardcoded `createdBy` in `AddIntegrationModal handleCreate` with `session.user.email|name` from `GET /users/me`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/settings.md` + `src/routes/platform/Profile.tsx` (`/profile`) + `Settings.tsx` (`/settings` 5-panel hub Account/Workspace) + `src/components/platform/*` (ProfileForm/APITokenRow/GenerateTokenModal/QuietHoursForm/PreferencesTable/AppearanceSettings/IntegrationRow/AddIntegrationModal) + `server/routes/platform.ts` (`/users/me`, tokens, channels) + `src/types/platform.ts` + `integration.ts` + `services/platformServices.ts` + `integrationsService.ts` ke template features (centered Profile vs full-bleed Settings with `ois-*` tokens) | — |
