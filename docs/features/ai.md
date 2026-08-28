# AI Workspace — Chat Mode: Quick Assist & Dedicated Workspace

Status: **Draft**
Route: `/ai` (workspace), `/ai/:sessionId` (deep link)
Sidebar: Platform · AI Workspace (mode toggle di Sidebar + TopBar) — **tidak pakai Sidebar management** saat aktif
Source: `src/routes/ai/AiWorkspace.tsx` · `src/components/ai/` (18 files) · `server/routes/platform.ts:30,275-306` (`platformRouter /ai`) · `src/types/ai.ts` · `src/services/platformServices.ts:131-144` (`aiService`) · `src/components/layout/AppShell.tsx:14,90-94` · `src/components/layout/Sidebar.tsx:144-195` · `src/components/layout/TopBar.tsx:117-133`

---

## Intent

Layer kedua di atas Management Mode — **interface natural language untuk data OIS tanpa menulis langsung ke state**. Dua entry point: **Quick Assist Panel** (overlay 320px untuk query cepat di semua halaman) dan **Dedicated AI Workspace** (`/ai` 3-kolom untuk sesi panjang investigasi / bulk CI drafting / KB runbook). Prinsip **Human in the Loop**: AI hanya hasilkan **draft** (`pending` → user `Confirm` → `confirmed`, atau `cancelled`); tidak pernah auto-write.

Scope Doc 7 / Phase 1: **CMDB + Knowledge Base** punya draft card nyata (`draft_ci`, `draft_kb`); domain lain (`incident`, `problem`, `change`) tampil via `AiDraftPlaceholder` "Coming soon" — UI ada, behavior deferred.

---

## Current State (snapshot `src/routes/index.tsx:89,115,247-248`)

- `src/routes/index.tsx:89` import `{ AiWorkspace } from './ai/AiWorkspace'`
- `src/routes/index.tsx:115` root `element: <AppShell />` — AI workspace **di dalam** `RequireAuth → RequirePasswordChange → AppShell` (bukan di luar; Sidebar di-swap, bukan di-bypass)
- `src/routes/index.tsx:247` → `{ path: 'ai', element: <AiWorkspace /> }`
- `src/routes/index.tsx:248` → `{ path: 'ai/:sessionId', element: <AiWorkspace /> }`
- Pengganti pattern Doc 7 spec "di luar AppShell" — implementasi real **reuse AppShell + inject `AiSidebarPanel` via `Outlet context setAiSidebarContent`** (`AiWorkspace.tsx:34,92-109` + `AppShell.tsx:15,60-61,80,93`)
- `AppShell.tsx:14,90-94` — `AiQuickPanel` mounted di `AnimatePresence` hanya jika `aiPanelOpen && !isAiRoute`; floating trigger di `TopBar.tsx:117-133` (bukan FAB fixed bottom-right — `Sparkles` ghost button di TopBar right cluster, `aria-expanded`, active `bg-ois-primary-pale text-ois-primary`)
- `Sidebar.tsx:144-195` — mode toggle `Management / AI Workspace` (`layoutId="sidebar-mode-indicator"` spring 500/35; AI active `linear-gradient 135deg #1F4FD4→#185FA5`); saat `isAiRoute` sidebar konten crossfade (`AnimatePresence mode="wait"`) → render `aiSidebarContent` slot (240px), bukan nav management
- `TopBar.tsx:117-133` — `showAi={!isAiRoute}` gate; tooltip `AI Quick Assist` via `group-hover:opacity-100`
- Workspace komponen: `AiWorkspace.tsx:28-413` (414 lines)
- Quick Panel: `AiQuickPanel.tsx` (352 lines) — `motion.div` backdrop `bg-black/20 z-[59]` + panel `w-[320px] z-[60] border-l bg-ois-surface translate-x slide 200ms easeOut`, context bar `MapPin + badge + Ganti dropdown`, chat, `Lanjutkan di AI Workspace →` link, `AiInputBar`
- Left: `AiSidebarPanel.tsx` (240px) → `AiDomainSelector` + session list `+ Baru`
- Chat: `AiMessageBubble` (AI), `AiUserMessage` (right-aligned), `AiAvatar` (22×22 `#E6F1FB` + `Sparkles 12px #185FA5`), `AiEmptyState` (52×52 `#E6F1FB` + `Sparkles 22px #185FA5` + domain suggestions), `AiDraftCICard`, `AiDraftKBCard`, `AiDraftPlaceholder`, `AiQueryResultCI`, `AiQueryResultText`, `AiSuggestionChip`, `AiPendingDraftItem`, `AiCompletenessPanel`
- API: `platformRouter.use('/ai', requirePermission('ai.read'))` (`platform.ts:30`) — 5 endpoints: `GET /ai/sessions`, `GET /ai/sessions/active` (sorted `updatedAt desc`), `GET /ai/sessions/:id`, `GET /ai/sessions/:id/messages` (`prisma.aiMessage findMany order createdAt asc`), `POST /ai/sessions/:id/messages` (create user `role user` + assistant stub `role assistant` echo `Acknowledged: "…" (LLM integration pending.)`)
- Service: `aiService` (`platformServices.ts:131-144`) — `apiFetch('/ai/sessions*')`, `messages(sessionId)`, `sendMessage(sessionId, body)` → `{user, assistant}`
- Types: `AiDomain cmdb|knowledge_base|incident|problem|change|all`, `AiMessageRole user|ai`, `AiMessageContentType text|draft_ci|draft_kb|draft_placeholder|query_result_ci|query_result_text|suggestion`, `AiDraftStatus pending|confirmed|cancelled`, payload `AiDraftCIPayload(kind draft_ci + CIType/CIStatus/Environment/Criticality + attributes Partial<CIAttributes> + relationships + pendingSuggestions)`, `AiDraftKBPayload`, `AiQueryResult*`, `AiSession(id domain title createdAt updatedAt messages[] draftsPending draftsConfirmed)`, `AiPanelContext` (`src/types/ai.ts:1-146`)
- DB: `Document` kind `ai-session` (listByKind) + `AiMessage` (`sessionId role body`) (`prisma/schema.prisma:588-593,624-634`)

**Working:**
- Workspace 2-pane `flex flex-1 overflow-hidden min-h-0`: chat `flex-1 flex-col min-w-0` + right `w-[210px] border-l bg-ois-surface p-3 gap-4` (Pending drafts + Saved today + Completeness if cmdb)
- Context breadcrumb `h-10 border-b px-4` — domain label via `getDomainLabel` + `›` + session title `truncate max-w-[200px]` + `Reset sesi` (clears messages, 0 counts, optimistic local)
- Message thread `flex-1 overflow-y-auto px-4 py-4 gap-4` — maps `messages` via `renderMessage`: user → `AiUserMessage`, AI → `AiMessageBubble` + conditional card (`draft_ci`/`draft_kb`/`draft_placeholder`/`query_result_ci`/`query_result_text`)
- `bottomRef scrollIntoView smooth` on messages change; hydration `useEffect activeSessionId` → `aiService.messages` map `assistant→ai` (`AiWorkspace.tsx:112-131`) cancelled guard
- `getMockAiResponse`-like logic tidak di workspace (server stub echo); Quick Panel pakai `getMockAiResponse` lokal (`utils.ts:53-142`) 800ms `setTimeout` timerRef cleanup
- Draft lifecycle `updateMessageDraftStatus(msgId, confirmed|cancelled)` (`AiWorkspace.tsx:234-257`): mutate `contentPayload.draftStatus`, decrement `draftsPending`, increment `draftsConfirmed` if confirmed; shared by card buttons + `AiPendingDraftItem` callbacks
- Pending/Saved derivation: filter `contentPayload.kind draft_ci|draft_kb && draftStatus pending|confirmed` (`AiWorkspace.tsx:143-164`)
- New session `handleNewSession`: `ai-sess-${Date.now()}` domain `activeDomain` title `Sesi baru` prepend + navigate `/ai/:id`; `handleSessionSelect` sync domain + navigate; `useEffect sessionId` sync `activeSessionId`+`activeDomain`; `?from=panel&domain=` mount-once inject welcome `Melanjutkan dari Quick Assist Panel.` (`65-89`)
- `AiSidebarPanel` `w-[240px] border-r bg-ois-surface h-full` — domain selector + `Sesi + Baru` list `AiSessionListItem` active detection
- `AiDraftCICard` 3 states (`AiDraftCICard.tsx:88-107,109-253`): pending `border 1px dashed #EF9F27 bg rgba(250,238,218,0.08)` header `FileText #854F0B Draft CI — belum disimpan`; confirmed `border 1px solid #3B6D11 bg rgba(234,243,222,0.08)` header `CheckCircle #3B6D11 Tersimpan ke CMDB`; cancelled `0.5px solid var(--color-ois-border) bg var(--color-ois-surface-muted) opacity-50` header `X Draft dibatalkan`; body `FieldRow label w-[90px]` mono `publicId/name`, `SmallBadge` type/criticality/env, tags muted chips, relationships `CIRelationshipBadge + mono publicId`, suggestions `AiSuggestionChip` dashed blue `border #378ADD bg rgba(230,241,251,0.2)` `Lightbulb #185FA5` + `+ Add`; actions pending `Confirm & save primary bg-ois-primary` + `Edit field` + `✕ danger`, confirmed `Buka di CMDB → /cmdb/publicId ExternalLink 11px`
- `AiDraftKBCard` (`AiDraftKBCard.tsx:63-81,82-211`) sama border/bg, header `Draft KB Article — belum disimpan` pending vs `Draft dikirim ke KB — menunggu review` confirmed; title bold, category `blue-500/15 text-blue-400 uppercase`, tags, sections accordion `border-white/5 collapsed by default ChevronRight→ChevronDown`, related CIs `font-mono chips /cmdb/:id`, actions `Confirm & publish draft` pending vs `Buka di KB → /kb` confirmed
- `AiCompletenessPanel` (`AiCompletenessPanel.tsx`) CMDB-only di right: computed `cisService.list()` via `useResource` — `CI dengan owner 19/22` 86% + `CI dengan monitoring 17/22` 77% (mock doc) live `withOwner/withMonitor`, `ProgressBar h-1.5 rounded-full bg-white/10 fill #1F4FD4 width pct% transition-500`, attention `≤3 interleaved noOwner/noMonitor` dot `5px #F79009` + `publicId mono + reason no owner|no monitor rule`, CTA `✦ Bantu isi dengan AI border-ois-primary/40 text-ois-primary hover:bg-ois-primary/10` → append `"Bantu saya isi owner untuk CI-… dan …"`
- Quick Panel: `detectDomain(pathname)` cmdb→kb→incidents→problems→changes→all; badge `domainMeta` cmdb `Server #185FA5 rgba(31,79,212,0.1)` kb `BookOpen #6927DA` incident/problem `AlertTriangle #D92D20 rgba(240,68,56,0.1)` change `GitPullRequest muted` all `Layers muted`; dropdown `DOMAIN_OPTIONS` all→change; empty `AiEmptyState` per domain 3 suggestions (cmdb `Tambah CI baru…/Berapa CI degraded?…/CI mana belum punya owner?` etc.); link `Sesi panjang? Lanjutkan di AI Workspace →` shows `messages.length>=1` → `/ai?from=panel&domain=`
- Input `AiInputBar` (`AiInputBar.tsx:49-88`) — `textarea rows1 auto-expand min 24 max 72` placeholder `Tanya atau instruksikan...` (workspace) / same Quick, `Enter !shift → send`, `ArrowUp 15 circle w-8 h-8 hasText? bg-ois-primary else bg-ois-surface-muted`
- Empty workspace `AiEmptyState` (`AiEmptyState.tsx:77-136`): `52x52 #E6F1FB Sparkles 22 #185FA5`, `Halo, Sarah!`, `Saya siap membantu kelola {domainLabel}`, suggestions `border-ois-border hover:bg-ois-surface-muted` buttons

**Stub / Partial:**
- Workspace `handleSend` only server echo (no draft generation); `aiService.sendMessage` returns assistant stub `Acknowledged: "…"` — draft branching (`tambah|buat` → `draft_ci` etc.) hanya di Quick Panel `getMockAiResponse` (`utils.ts:76-132`), tidak di workspace (future backend LLM)
- `AiDream` local `sessions` state seeded from `aiService.sessions()` + `activeSession` but fallback `ai-sess-001` hardcoded (`initialSessionId`) — race condition if API empty → id collides, messages fetch `catch ignore` silent
- `Edit field` button di draft cards no-op (no modal `isOpen false`?— button without handler)
- `Cmd+K` di spec (`Doc7 § Floating Button Cmd+K toggle panel`) **tidak untuk AI** — `AppShell.tsx:41-51` `Cmd+K` toggles `CmdKPalette` command palette, bukan `AiQuickPanel`; TopBar kbd `⌘K` hint relates to global search palette, not AI
- `from=panel&domain` carry hanya inject welcome message; tidak carry message history (Quick Panel state `React transient reset on close` per spec — correct but spec-expected carry-over partial)
- `AiQueryResultCI` `onAnalyze` → `handleSend('Analisis kedua CI ini')` (stub) + `Buka di CMDB` nav via `detailUrl` (`AiWorkspace.tsx:291-296`); `AiDraftPlaceholder` domain routing `incident→/incidents` etc. but utils `buildDomainTextAnswer` for incident/problem/change now returns `query_result_text` text answer instead of `draft_placeholder` (divergence from Doc 7 mock sessions: sess-002 expects `draft_placeholder` but utils would emit `query_result_text` for those domains)
- `ai.read` permission `define` but permission seed not shown in `prisma/seed.ts` excerpt — assume `ai.read` exists via RBAC catalog (`AdminPermissions`); no `ai.write` separate

**Missing (vs spec Doc 7):**
- Floating button `fixed bottom-6 right-6 44×44 rounded-full bg #185FA5 Sparkles 20px white` — not implemented; real trigger is TopBar ghost `Sparkles 20` (verify design delta)
- `TopBar mode toggle` "Management / AI Workspace" di **TopBar** spec — real location adalah **Sidebar** (`Sidebar.tsx:144-195`), TopBar hanya breadcrumbs + `AppScopeSwitcher` + search + inbox/bell/AI ghost
- `AiQuickPanel` backdrop dim `bg-black/20` click-to-close implemented via `motion.div` but spec `floating button visible all pages` & `panel reset on close/open fresh` — correct transient
- `Session history persisted localStorage` spec — real persists via `Document kind ai-session` + `AiMessage` table (backend), not localStorage
- Direct `/ai` 3-col without Sidebar spec — real is 2-col (chat + right 210) + **Sidebar-injected left 240** via AppShell outlet context (visual same 3-col, but architecture different — Sidebar owns left panel)
- Bulk import via chat, AI thinking/streaming, Claude API integration — explicitly Phase 2 (`Doc7 §Tidak dibutuhkan`)
- `AiAvatar` spec 22×22 `#E6F1FB #185FA5` — preserved but check `AiMessageBubble` wrapper styles

---

## Primary View — Entry Point 1: AI Quick Assist Panel (overlay)

Layout overlay di atas Management Mode (tidak push layout):

```
AppShell dimmed backdrop fixed inset-0 bg-black/20 z-[59] (click → close)
└── Panel fixed right-0 top-0 h-full w-[320px] z-[60] bg-ois-surface border-l border-ois-border flex flex-col
    ├── Topbar px-3 py-2.5 border-b flex gap-2
    │   ├── <AiAvatar /> + "AI Quick Assist 13px semibold"
    │   ├── [↗ Buka di Workspace] → navigate('/ai') + close 11px muted hover:text-ois-text
    │   └── [✕ Close] w-6 h-6 hover:bg-white/5
    ├── Context Bar px-3 py-2 border-b flex gap-2 relative ref dropdownRef
    │   ├── MapPin 12 subtle + "Konteks:" 11px subtle
    │   ├── badge flex gap-1 px-1.5 py-0.5 rounded 11px medium bg badgeBg color badgeText (see domainMeta)
    │   │   cmdb Server #185FA5 | kb BookOpen #6927DA | incident/problem AlertTriangle #D92D20 | change GitPullRequest | all Layers muted
    │   └── [Ganti ▼] 11px muted + dropdown absolute top-full left-0 right-0 mt-1 mx-2 rounded-lg border shadow-lg bg-ois-surface (6 options, cek "aktif")
    ├── Chat Area flex-1 overflow-y-auto min-h-0
    │   ├── empty → AiEmptyState (icon 52 + greeting + 3 suggestions domain-specific) — see EmptyState section
    │   └── thread flex-col gap-4 px-3 py-3 — user AiUserMessage right | AI AiMessageBubble + card (draft_ci/kb/placeholder/query_ci/query_text)
    ├── "Sesi panjang? Lanjutkan di AI Workspace →" 11px ois-primary centered, visible if messages.length>=1 → /ai?from=panel&domain={domain}
    └── AiInputBar w-full border-t bg-ois-surface px-3 py-2.5 textarea 13px + send circle w-8 h-8 ArrowUp 15
```

**Behavior:**
- `detectDomain(location.pathname)` on mount + effect on `location.pathname` change auto-sync `domain` state
- `Ganti` toggles `domainDropdownOpen`; outside click listener `mousedown` closes; pick `setDomain(d)` closes dropdown
- `handleSend` create `user-{Date.now()}` + `setMessages([...prev, user])` + capturedDomain + `setTimeout 800ms → getMockAiResponse(text, capturedDomain, 'quick-panel')` push; `timerRef` cleared on unmount + before new timer
- `updateMessageDraftStatus` maps messages mutate `contentPayload.draftStatus` (confirm/cancel from card)
- Slide `motion translate-x-full → 0 duration 200 easeOut`; backdrop `opacity 0→1`; `AnimatePresence` in `AppShell`
- Suggested actions per domain (empty): cmdb 4 lines `Tambah CI baru…/Berapa CI degraded?/Cek relasi…/CI mana belum punya owner?` (Quick Panel omits the 4th? uses 3), kb similar, incident/problem/change now via `query_result_text` text answer (not placeholder visually)
- No Cmd+K for AI — `Cmd+K` opens global `CmdKPalette` (`AppShell.tsx:41-51`)

**Ref:** `src/components/ai/AiQuickPanel.tsx:36-44,52-83,89-168,172-352` · `src/components/ai/AiEmptyState.tsx` · `src/components/ai/utils.ts:53-142`

### Entry Point 2: Dedicated AI Workspace (`/ai`, `/ai/:sessionId`)

Architecture note: **bukan route di luar AppShell** — `AppShell` flex remains, Sidebar swaps to AI panel via `setAiSidebarContent`.

```
AppShell flex h-screen w-full bg-ois-bg overflow-hidden
├── Sidebar w-[240px]|w-16 collapsed — if isAiRoute && !collapsed → render aiSidebarContent else nav management (AnimatePresence mode="wait" 150ms)
│   └── AiSidebarPanel w-[240px] h-full border-r bg-ois-surface flex flex-col overflow-hidden
│       ├── Domain Selector p-3 border-b (AiDomainSelector activeDomain + onDomainChange)
│       └── Session list flex-1 overflow-y-auto p-3 gap-1
│           ├── "Sesi 11px uppercase subtle" + [+ Baru] 11px ois-primary
│           └── per AiSessionListItem session.id activeSessionId sorted updatedAt desc (badge draftsPending amber + draftsConfirmed green if spec) — click → handleSessionSelect
└── Main flex-1 flex flex-col min-w-0 h-full overflow-hidden
    ├── TopBar h-14 bg-white border-b z-20 (breadcrumbs + scope + search w-72|lg:w-96 + inbox/bell + aiGhost hidden if isAiRoute via showAi)
    ├── stripe h-[2px] linear-gradient 90deg #1F4FD4→#0BA5EC
    └── Outlet main: if isAiRoute → flex-1 overflow-hidden flex min-h-0 else p-6 overflow-y-auto
        └── AiWorkspace flex flex-1 overflow-hidden min-h-0
            ├── Chat Area flex-1 flex flex-col min-w-0 overflow-hidden
            │   ├── Breadcrumb h-10 px-4 border-b flex justify-between 12px
            │   │   ├── left: Server icon + domainLabel muted › session.title font-medium truncate max-w-[200px] (activeSession?.title ?? 'Sesi baru')
            │   │   └── right: [Reset sesi] 11px muted hover:text-ois-text → clears messages counts
            │   ├── Thread flex-1 overflow-y-auto px-4 py-4 gap-4 min-h-0
            │   │   ├── empty → AiEmptyState domain activeDomain onSuggestionClick→handleSend (icon 52 Sparkles, Halo Sarah!, 3 suggestions)
            │   │   └── messages.map renderMessage (AiUserMessage | AiMessageBubble + card)
            │   └── Input wrapper border-t p-3 flex-shrink-0 → AiInputBar placeholder "Tanya atau instruksikan..."
            └── Right Panel w-[210px] shrink-0 border-l bg-ois-surface flex flex-col overflow-hidden
                └── scroll p-3 gap-4 flex-1 min-h-0
                    ├── Pending drafts flex justify-between 11px uppercase + badge amber-100 amber-800 rounded-full px-1.5 py-0.5 if >0
                    │   └── per AiPendingDraftItem payload onConfirm/onCancel (compact) else muted "Tidak ada draft menunggu" 11px subtle
                    ├── Tersimpan hari ini 11px uppercase
                    │   └── per confirmed gap-0.5 py-1 ✓ #12B76A 11px + Link /cmdb/publicId or /kb 11px hover:ois-primary truncate + formatAiTime 10px subtle else "Belum ada" 11px subtle
                    └── if activeDomain==='cmdb' border-t pt-3 → AiCompletenessPanel (see below)
```

**AiCompletenessPanel details (CMDB only):**

```
Kelengkapan 12px uppercase tracking-wider subtle
├── StatRow per {label count total pct} gap-1
│   ├── flex justify-between 11px: label muted flex-1 | count/total subtle tabular-nums | pct% medium primary 8px
│   └── ProgressBar h-1.5 rounded-full bg-white/10 w-full fill #1F4FD4 width pct% duration-500
├── Perlu perhatian: (if attention>0) gap-1.5
│   └── per item gap-1.5 dot 5px #F79009 + publicId mono 11px primary + reason 11px subtle (max 3 interleaved owner/monitor)
├── if 0 → "Semua CI sudah lengkap." italic 11px subtle
└── CTA ✦ Bantu isi dengan AI w-full py-2 rounded 11px medium border-ois-primary/40 text-ois-primary hover:bg-ois-primary/10 → handleFillWithAI builds "Bantu saya isi owner untuk CI-X dan CI-Y"
```

Data computed from `cisService.list()` live: `noOwner ownerId empty`, `noMonitor monitoringRuleCount===0`, `withOwner = total-noOwner`.

**AiEmptyState per domain:**

| Domain | Items |
|--------|-------|
| cmdb | `Tambah CI baru untuk server X` · `Berapa CI dengan status degraded?` · `CI mana yang belum punya owner?` |
| knowledge_base | `Buatkan KB article tentang [topik]` · `Cari artikel tentang timeout handling` · `Draft runbook untuk restart payment-api` |
| incident | `Berapa P1 incident aktif minggu ini?` · `Ringkas update terbaru untuk INC-2026-00184` · `Siapa on-call engineer…` |
| problem | `Cari problem dengan incident berulang` · `Draft RCA five-whys…` · `Known error mana paling sering trigger?` |
| change | `Change apa saja dijadwalkan minggu ini?` · `Risk score CHG-…?` · `Bantu draft RFC untuk patch payment-api` |
| all | `Tanya tentang CI, incident, atau artikel KB` · `Bandingkan kesehatan antar service` · `Cari tren insiden bulan ini` |

---

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Open Quick Assist | TopBar ghost `Sparkles 20` (`showAi && !isAiRoute`) `onToggleAi` → `setAiPanelOpen v=>!v` | `ai.read` (platformRouter guard) + auth session | `!isAiRoute` (hidden di `/ai`) |
| Switch domain | Left `AiDomainSelector` click · Quick `Ganti` dropdown pick | `ai.read` | — (domains `incident/problem/change` selectable but render `AiDraftPlaceholder` or `query_result_text` demo answer) |
| New session | Left `[+ Baru]` `handleNewSession` → `ai-sess-{Date.now()}` + navigate `/ai/:id` | `ai.read` | — |
| Select session | Click `AiSessionListItem` → `handleSessionSelect` sync domain + navigate | `ai.read` | session exists in `sessionsData` |
| Send message | Enter (!shift) or Send `ArrowUp` circle `hasText` → `handleSend` | `ai.read` | `text.trim()>0` (workspace via `aiService.sendMessage` POST; quick via local + `getMockAiResponse` 800ms) |
| Reset session | `[Reset sesi]` top breadcrumb → clears messages + counts for activeSessionId | `ai.read` | session active |
| Suggest click | AiEmptyState suggestion button or `AiSuggestionChip [+ Add]` | `ai.read` | pendingSuggestions length >0 |
| Accept suggestion | `AiSuggestionChip onAccept` → local `acceptedIds + userAddedRelationships` (CI card) | `ai.read` | draft `pending` |
| Dismiss suggestion | `AiSuggestionChip onDismiss` → `dismissedIds` | `ai.read` | draft `pending` |
| Confirm draft | `[Confirm & save]` (CI) / `[Confirm & publish draft]` (KB) on card OR right `AiPendingDraftItem [Confirm]` → `updateMessageDraftStatus confirmed` | `ai.read` + underlying `cmdb.write`/`kb.read` for real write (future; current local only) | draft `pending` |
| Cancel draft | `[✕]` on card OR right `[Batal]` → `updateMessageDraftStatus cancelled` | `ai.read` | draft `pending` |
| Open drafted CI | `Buka di CMDB →` link in confirmed CI card → `/cmdb/{publicId}` `ExternalLink 11px` | `cmdb.read` | `confirmed` |
| Open drafted KB | `Buka di KB →` link in confirmed KB card → `/kb` | `kb.read` | `confirmed` |
| Open query result CI | PublicId mono link `→ detailUrl` or `[Buka di CMDB]` in `AiQueryResultCI` | `cmdb.read` | query_result_ci |
| Analyze query | `[Analisis AI →]` in `AiQueryResultCI` → `handleSend('Analisis kedua CI ini')` | `ai.read` | query_result_ci |
| Fill completeness | `[✦ Bantu isi dengan AI]` in `AiCompletenessPanel` → `onFillWithAI` append to chat | `ai.read` | activeDomain `cmdb` + attention >0 |
| Continue in Workspace | Quick Panel `Sesi panjang? Lanjutkan di AI Workspace →` link `to /ai?from=panel&domain={domain}` + `onClose` | `ai.read` | `messages.length>=1` |
| Back to Management | Sidebar mode toggle `[Management]` `navigate('/')` (`Sidebar.tsx:153`) | — | isAiRoute true |
| Navigate workspace | Sidebar `[AI Workspace]` `navigate('/ai')` | `ai.read` | !isAiRoute |

Delegate: Human-in-the-Loop confirm → future write to `ConfigurationItem` / `KBArticle` via `cisService/knowledgeService` (not yet wired — current confirm only flips local `draftStatus`).

---

## Filters / Sort / Search

- **Workspace session list:** sorted `updatedAt desc` (server `active` endpoint same). No search/filter — linear list `sessions.map`.
- **Domain selector:** 6 options (`cmdb|knowledge_base|incident|problem|change|all`) — active styling (spec: `✓ CMDB background biru muda` analogue `AiDomainSelector` active). Changing domain does **not** filter session list; it creates new-session context for next send. Existing sessions retain their `domain`.
- **Right panel Pending:** filtered `messages.(kind draft_ci|draft_kb && draftStatus pending)` — live per activeSession; badge count `pendingDrafts.length` amber. No sort.
- **Saved today:** filtered `draftStatus confirmed` — render `formatAiTime(createdAt)` `HH:mm id-ID` per entry; no date grouping yet (spec: "Tersimpan hari ini" but impl shows all confirmed in session regardless of date — future `isToday` filter).
- **Completeness:** no filter; search is implicit via `cisService.list()` full scan. Progress pct `Math.round(count/total*100)`.
- **Quick Panel context badge:** auto-detect via `detectDomain(pathname)` on `location.pathname` change; user can override via `Ganti` dropdown (overrides until next route change re-detects — race: effect re-sets on pathname, so manual pick persists within same route).
- **Input search:** no filtering — messages are push-append only; `AiQueryResultCI` query text stored in `payload.query` but not used to filter thread.
- **No URL persist:** workspace `activeDomain` and filters are React state only (except `sessionId` in URL and `?from=panel&domain=` mount-once). Refresh resets to initial `initialSessionId` (first active or `ai-sess-001`).

---

## Detail View — Chat Rendering

`renderMessage` per `AiMessage.role` + `contentPayload.kind`:

| role | contentType | Component | Notes |
|------|-------------|-----------|-------|
| user | text | `AiUserMessage` `text createdAt` right-aligned bg `ois-surface-muted` | mono timestamp |
| ai | text | `AiMessageBubble text timestamp` | avatar 22 + bubble |
| ai | draft_ci | `AiMessageBubble text + AiDraftCICard payload onConfirm/onCancel` | 3 states border/bg per draftStatus (see Design Preservation) |
| ai | draft_kb | `AiMessageBubble text + AiDraftKBCard` | sections accordion collapsed |
| ai | draft_placeholder | `AiMessageBubble + AiDraftPlaceholder domain` | 🚧 + `Buka Incident → /incidents` etc. |
| ai | query_result_ci | `AiQueryResultCI payload onAnalyze` | header `N ditemukan timestamp` + health dot 7px + publicId mono `#185FA5` link + `[Buka di CMDB]` + `[Analisis AI →]` |
| ai | query_result_text | `AiQueryResultText payload` | card `bg-ois-surface-muted border-0.5 rounded-md` stat/text answer |
| ai | suggestion | (reserved) `AiSuggestionChip` path via `pendingSuggestions` inside cards, not standalone | blue dashed `border #378ADD bg rgba(230,241,251,0.2)` |

Auto-scroll: `bottomRef scrollIntoView smooth` on `messages` change. Timer coalescing via `timerRef` in Quick Panel only.

---

## State Lifecycle

### Session

```
(new) → active (messages[], draftsPending, draftsConfirmed)
  via handleNewSession: id ai-sess-{Date.now()} domain activeDomain title 'Sesi baru'
  → select via handleSessionSelect (URL navigate /ai/:id, sync domain)
  → hydrate messages via aiService.messages(activeSessionId) on activeSessionId change (maps assistant→ai)
  → reset via handleResetSession (clear messages counts for active id only)
  → send via aiService.sendMessage (POST creates user+assistant pair, append both, bump updatedAt)
```

Seed mismatch: spec `mockAiSessions 3 sessions + getActiveSession sorted updatedAt` vs real `Document kind ai-session` via `listByKind`; `platform.ts:275-283` mirrors spec sorting.

### Draft (`AiDraftStatus`)

```
pending (AI first draft, amber dashed #EF9F27, header FileText #854F0B "Draft CI — belum disimpan" / KB "belum disimpan")
  ├─ (accept suggestion) → pendingSuggestions item removed, relationship added with addedByUser true (local Set, not server)
  ├─ [Confirm & save] → confirmed (border 1px solid #3B6D11 bg rgba(234,243,222,0.08), header CheckCircle #3B6D11 "Tersimpan ke CMDB" / KB "Dikirim ke KB — menunggu review")
  │     side-effects: draftsPending--, draftsConfirmed++, pending list item moves to Saved today, card re-renders with Buka di CMDB/KB link
  └─ [✕] → cancelled (border 0.5px solid var(--color-ois-border) bg var(--color-ois-surface-muted) opacity-50, header X "Draft dibatalkan", no actions)
       side-effects: draftsPending--, card read-only muted
```

`confirmed` KB status in payload reflects OIS KB `status: draft` (menunggu review, bukan published) — spec `docs/PROMPT…` § KB Card confirmed note.

No server write on confirm yet — deferred to `cisService.create` / `knowledgeService.create` with `draft→CMDB/KB` transaction + audit (future `server/jobs`).

### Quick Panel lifecycle

```
mount → detectDomain(pathname) → domain state
type + send → user push → 800ms getMockAiResponse → AI push
if messages≥1 show Lanjutkan link
close (backdrop/X) → unmount, state lost (fresh next open) — kecuali Lanjutkan carries ?from=panel&domain= to workspace
toggle via TopBar ghost — hidden when isAiRoute
```

---

## Permissions (action-level)

| Role / Permission | Read workspace | Send | Confirm draft | Manage sessions |
|-----------------|--------------|------|---------------|-----------------|
| `ai.read` (Platform) | ✅ `platformRouter.use('/ai', requirePermission('ai.read'))` `platform.ts:30` — all 5 /ai endpoints require it | ✅ | ✅ (local; future also `cmdb.write`/`kb.write` for real persist) | ✅ |
| No `ai.read` | ❌ 403 (app.ts error handler `ScopeViolationError → 403 scope_violation`) | — | — | — |
| `cmdb.read` / `kb.read` | — | — | gates `Buka di CMDB/KB` link target; completeness `cisService.list()` needs `cmdb.read` separately | — |
| `system.admin` | see RBAC Admin nav (Sidebar) — controls permission catalog | — | — | — |

`requireAuth` global `server/app.ts:126` ensures `req.tenantId` + `req.permissions` exist; `withScopedDb` prevents `tenantId=undefined` leak. Guest (`AUTH_REQUIRED=false` dev) pinned to `tenant-demo` admin still gated by `ai.read`.

Frontend gate: `useResource` will empty if 403 (no explicit `useCan('ai','read')` check — relies on API 403 handling via `apiFetch` → `auth:session-expired` if 401 else empty data; consider adding `Can` wrapper around `[+ Baru]`/send for UX).

---

## Empty / Loading / Error

- **Empty workspace (no messages):** `flex items-center justify-center h-full px-6 py-8` — circle `52×52 #E6F1FB` `Sparkles 22 #185FA5` + `Halo, Sarah! 16px semibold` + `Saya siap membantu kelola {domainLabel} 13px muted` + suggestions list `w-full max-w-xs` 3 buttons `text-left 12px muted px-3 py-1.5 rounded-md border-ois-border bg-ois-surface hover:bg-ois-surface-muted` (`AiEmptyState.tsx:81-136`). Quick Panel reuses same component in `320px` panel (no 52→ smaller? same).
- **Empty Pending drafts (right rail):** `Tidak ada draft menunggu 11px subtle`; **Empty Saved today:** `Belum ada 11px subtle`; **Completeness all good:** `Semua CI sudah lengkap. italic 11px subtle` (vs spec: not showing 3 attention rows).
- **Loading sessions:** `useResource(() => aiService.sessions/activeSession, [])` returns `undefined` → `sessions` `[]` until fetch; `initialSessionId` fallback `ai-sess-001` may point to non-existent server id → `messages` fetch silently ignored `.catch(()=>{})`. Skeleton not present (gap vs CMDB/incidents shimmer).
- **Loading messages (hydrate):** cancelled guard `let cancelled` prevents set after unmount/switch; no shimmer — thread shows prior session messages until replaced.
- **Error (message send):** `.catch(()=>{/* handle silently */})` — no banner; optimistic not used (wait for server pair). Quick Panel same silent catch not exposed.
- **Error (sessions fetch):** silent empty list — no `Retry` (gap vs incidents `Retry → refresh`).
- **404 session deep link:** `/ai/:sessionId` with unknown id → `sessions.find` undefined → `messages []` + `activeSession?.title ?? 'Sesi baru'` fallback, `useEffect setActiveSessionId(sessionId)` still sets id but hydration `prisma.aiMessage findMany where sessionId` will return [] (no 404 thrown from GET messages; `GET /ai/sessions/:id` would 404 but workspace does not call it — only messages). Consider navigating to `/ai` on 404.
- **Accessibility drift:** `TopBar ghost` has `aria-label + aria-expanded`; panel `[✕]` has `aria-label "Tutup panel"`; dropdown `ChevronDown rotate-180`; `SectionRow` accordion has `aria-expanded`.

---

## Phase 2 Deferred

- **LLM backend integration** — `POST /ai/sessions/:id/messages` currently echoes `Acknowledged: "…" (LLM integration pending.)` stub (`platform.ts:301-304`); rationale: Doc 7 "Tidak dibutuhkan di Doc 7 (frontend-only)". Future Doc 8: `GEMINI_API_KEY` + `APP_URL` injection (AI Studio in prod) + streaming, thinking state.
- **Draft → real write** — `Confirm & save` local `draftStatus` flip; rationale: `updateMessageDraftStatus` only in React state + `draftsPending/Confirmed` counters, not `pris­ma.configurationItem.create`/`kbArticle.create` + audit + `emitEventCreated`. Guard `cmdb.write`/`kb.write` check deferred.
- **Domain coverage** — `incident|problem|change` use `draft_placeholder`/`query_result_text` demo answer (`utils.ts:61-74` + `buildDomainTextAnswer`); rationale: Doc 7 "Phase 1 — CMDB & KB focus, domain lain Coming soon". Future: `incident` RCA helper, `problem` KEDB search, `change` RFC draft similar to CI/KB cards.
- **All-domain cross query** — `all` returns informational only `query_result_text` ("Pick a more specific domain…"); rationale: spec § Domain selector behavior — `all` tidak bisa draft.
- **Human approval workflow** — KB `confirmed` → `Draft dikirim ke KB — menunggu review` implies `KB.status draft` approval queue not wired (future `POST /kb/articles/:id/status? → draft→review` flow).
- **Bulk import via chat** — not implemented (`Doc7 §Tidak dibutuhkan`: Bulk import via chat).
- **Streaming + typing indicator** — 800ms canned delay only; no `isStreaming` spinner (future OTEL metrics).
- **Autosave + localStorage session persistence** — currently server `Document ai-session` + `AiMessage`; spec localStorage `localStorage` for new-change-draft analogue not used for AI (future maybe `localStorage ai-drafts`).
- **Full-text `field:value` search inside chat** — no thread search (only top `Search across OIS...` global in TopBar).
- **Keyboard row nav / suggestion focus ring** — pending.
- **Floating button 44×44 fixed bottom-6 right-6** — spec vs TopBar ghost divergence intentionally deferred (TopBar ghost is current pattern; FAB would overlap CmdK palette).
- **Cmd+K for AI** — intentionally not AI-owned; CmdK belongs to global `CmdKPalette` (future maybe register AI commands in palette).

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/ai/AiWorkspace.tsx` + `src/components/ai/` + `docs/PROMPT-MVP-UI-OIS-Doc7-AIChatMode.md`):

1. **Layout architecture** — Workspace inside `AppShell` via Sidebar slot injection (`setAiSidebarContent`), not a standalone route outside AppShell. Keep `AppShell main isAiRoute ? flex-1 overflow-hidden flex min-h-0 : flex-1 overflow-y-auto p-6` (`AppShell.tsx:79-81`) + Sidebar crossfade `AnimatePresence mode="wait" 150ms` (`Sidebar.tsx:201-294`). Jangan pindahkan `/ai` keluar AppShell.
2. **Sidebar mode toggle** — `Sidebar.tsx:144-195` `role group bg-ois-surface-muted border-ois-border rounded-[8px] p-[3px]` + `layoutId="sidebar-mode-indicator"` spring `stiffness 500 damping 35`; Management white `bg-white border shadow 0_1px_2` vs AI `linear-gradient 135deg #1F4FD4→#185FA5 shadow 0_1px_3 rgba(31,79,212,0.4)`. Icon `LayoutDashboard 11px` vs `Sparkles 11px` `text-[11px] font-semibold`. Gap `3px` padding.
3. **Workspace 3-col visual** — left `240px` (`AiSidebarPanel` `w-[240px] border-r bg-ois-surface h-full` + domain selector `p-3 border-b` + session list) + center `flex-1 min-w-0` + right `210px` (`w-[210px] border-l bg-ois-surface p-3 gap-4` pending+saved+completeness). Keep exact widths (210 not 240, 240 left) — spec 200/210 divergence, code is 240/210. Chat `overflow-hidden min-h-0`, thread `flex-1 overflow-y-auto px-4 py-4 gap-4 min-h-0`.
4. **Breadcrumb** `h-10 px-4 border-b flex justify-between 12px` + `getDomainLabel` muted `›` separator `text-ois-border-strong` + title `font-medium truncate max-w-[200px]` + `Reset sesi 11px muted hover:text-ois-text` (`AiWorkspace.tsx:309-326`). Jangan ganti ke Breadcrumbs component global.
5. **Draft CI card 3-state** `AiDraftCICard.tsx:88-107` exact border/bg/transition: pending `1px dashed #EF9F27 rgba(250,238,218,0.08)` header `FileText 14 #854F0B Draft CI — belum disimpan`; confirmed `1px solid #3B6D11 rgba(234,243,222,0.08)` header `CheckCircle 14 #3B6D11 Tersimpan ke CMDB`; cancelled `0.5px solid var(--color-ois-border) var(--color-ois-surface-muted) opacity-50` header `X Draft dibatalkan subtle`. Keep `transition border-color 0.3s ease background 0.3s ease`. `FieldRow label w-[90px] 11px subtle leading-5` + `font-mono 12px primary` for publicId/name; tags `px-1.5 py-0.5 rounded 10px bg-white/5 border-ois-border`; relationships `CIRelationshipBadge + mono 11px muted` + `+added bg-blue-500/20 text-blue-400 9px`.
6. **Draft KB card 3-state** `AiDraftKBCard.tsx:63-81` same pending/confirmed/cancelled values; pending header `FileText #854F0B Draft KB Article — belum disimpan` vs confirmed `CheckCircle #3B6D11 Draft dikirim ke KB — menunggu review`; title `14px semibold leading-snug`; category `blue-500/15 text-blue-400 uppercase 10px semibold`; sections accordion `border-white/5 rounded open bg-white/[0.02] px-2.5` header `11px medium primary ChevronRight→ChevronDown 12px`; related CIs `font-mono 10px bg-white/5 border-ois-border link /cmdb/:id`.
7. **Suggestion chip** `AiSuggestionChip` `border 1px dashed #378ADD bg rgba(230,241,251,0.2) rounded var(--border-radius-md)` icon `Lightbulb 13px #185FA5` text `11px text-secondary` button `+ Add bg #E6F1FB color #0C447C border 0.5px #378ADD 10px` — inherited from `AiDraftCICard` handling `pendingSuggestions.filter !dismissed && !accepted`.
8. **Avatar & empty** — `AiAvatar` circle `22×22 #E6F1FB Sparkles 12 #185FA5`; `AiEmptyState` circle `52×52 same colors Sparkles 22 #185FA5` + `Halo, Sarah! 16px semibold` + subtitle `13px muted Saya siap membantu kelola {domainLabel}` + suggestions `w-full max-w-xs text-left` items `w-full text-left 12px muted px-3 py-1.5 rounded-md border-ois-border bg-ois-surface hover:bg-ois-surface-muted hover:text-ois-text` (`AiEmptyState.tsx:81-119`). Keep exact sizes — jangan scale ke 24/56.
9. **Quick Panel overlay** — `AiQuickPanel.tsx:172-191` backdrop `fixed inset-0 bg-black/20 z-[59] opacity 0→1` + panel `fixed right-0 top-0 h-full w-[320px] z-[60] bg-ois-surface border-l border-ois-border flex-col initial x 100% animate x 0 easeOut 200ms`; topbar `px-3 py-2.5 border-b AiAvatar + 13px semibold flex-1 + [↗ Buka di Workspace] + [✕ w-6 h-6 hover:bg-white/5]`; context bar `px-3 py-2 border-b MapPin 12 + Konteks: 11px subtle + badge px-1.5 py-0.5 11px medium` per `domainMeta` exact `badgeBg rgba` + `badgeText hex`; Ganti button `ml-auto 11px muted + ChevronDown 11 rotate-180 duration`; dropdown `absolute top-full left-0 right-0 mt-1 mx-2 rounded-lg border shadow-lg bg-ois-surface` items `px-3 py-2 12px hover:bg-white/5 muted→text` active `text 10px subtle "aktif"`. Chat `flex-1 overflow-y-auto min-h-0` empty vs thread `gap-4 px-3 py-3`; `Lanjutkan di AI Workspace → 11px primary` visible `messages.length>=1 to /ai?from=panel&domain={domain}`; input `border-t bg-ois-surface px-3 py-2.5`.
10. **Input bar** — `AiInputBar.tsx:49-88` wrapper `w-full border-t border-ois-border bg-ois-surface px-3 py-2.5 flex items-end gap-2`; textarea `flex-1 resize-none bg-transparent 13px text-ois-text placeholder:o-text-subtle focus:outline-none leading-relaxed py-1 minHeight24 maxHeight72 auto-expand to 72px`; send `w-8 h-8 rounded-full hasText? bg-ois-primary text-white hover:o-primary-hover active:scale-95 shadow-sm : bg-ois-surface-muted text-ois-text-subtle cursor-not-allowed ArrowUp 15 stroke 2.5`.
11. **Query result cards** — `AiQueryResultCI` `bg-ois-surface-muted border 0.5px tertiary rounded-md` health dot `7×7` hijau `operational` amber `degraded` gray `unknown` + publicId mono `#185FA5` link `detailUrl` + `[Buka di CMDB] + [Analisis AI →]`; `AiQueryResultText` similar inline stat (see `AiQueryResultText.tsx`). Keep timestamp `May 9, 14:35` pattern via `formatAiTime`.
12. **Right rail** — `AiWorkspace.tsx:344-412` `w-[210px]` border-l `p-3 gap-4 flex-1 overflow-y min-h-0`: Pending header `11px semibold uppercase tracking-wide subtle` + badge `10px amber-100 amber-800 rounded-full px-1.5 py-0.5` count; empty `11px subtle Tidak ada…`; `AiPendingDraftItem gap-2`; Saved header + empty `Belum ada` + per `gap-1.5 py-1 ✓ #12B76A 11px + Link 11px hover:ois-primary truncate + time 10px subtle formatAiTime`; Completeness if cmdb `border-t pt-3`.
13. **Completeness** — `AiCompletenessPanel.tsx:21-30,50-157` `ProgressBar h-1.5 bg-white/10 fill #1F4FD4 width pct% duration-500`; StatRow `11px muted tabular-nums count/total + pct% medium 8px`; attention dot `5×5 #F79009 mt-[5px]` + `publicId mono 11px primary + reason 11px subtle`; CTA `w-full py-2 rounded 11px medium border-ois-primary/40 text-ois-primary hover:bg-ois-primary/10 ✦`.
14. **Colors tokens** — Keep `src/index.css` tokens exact: `ois-primary #1F4FD4 hover #1A42B5 pale #EEF2FF`, `ois-bg #F7F8FA surface #FFFFFF surface-muted #F1F3F7 border #E4E7EC border-strong #D0D5DD`, `text #101828 muted #475467 subtle #98A2B3`, `success #12B76A pale #ECFDF3 warning #F79009 pale #FFFAEB danger #F04438 pale #FEF3F2 info #0BA5EC pale #F0F9FF`, `sev-p1 #B42318 p2 #DC6803 p3 #DC6803 p4 #027A48`, `sidebar-bg #F4F5F7 content-bg #FFFFFF border #E4E7EC item #475467 hover #F1F3F7 active-bg rgba(31,79,212,0.08) active-text #1F4FD4 section-label #98A2B3`. Draft amber `#EF9F27 rgba(250,238,218,*)` + `#854F0B` label, green `#3B6D11 rgba(234,243,222,*)`, chip blue `#378ADD rgba(230,241,251,0.2) #185FA5 #0C447C #E6F1FB`. Jangan ganti amber #F59E0B generik.
15. **TopBar ghost** — `TopBar.tsx:118-132` ghost trigger conditional `showAi && onToggleAi` `variant ghost size icon text-muted hover:text-ois-text hover:bg-ois-surface-muted` active `bg-ois-primary-pale text-ois-primary` when `aiOpen`; tooltip `group-hover:opacity-100 bg-ois-text text-white 11px whitespace-nowrap absolute top-full right-0 mt-1.5 px-2.5 py-1.5 rounded-md shadow-lg`; kbd hint inside search `⌘K 10px font-mono border-ois-border bg-white muted`.
16. **Modal/dialog pattern** — Draft cards actions remain inline `border-t border-white/5 pt-1` (dark-tinted border even on light surface — matches Doc 7 spec rgba), not a `Dialog` primitive. Keep even if theme is light.
17. **Font mono publicId** — every `publicId` (CI `CI-SRV-PAY-003`, KB slug, query item) uses `font-mono text-xs|11px text-ois-primary` pattern — must not switch to sans.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md) · [`../design/01-erd.md`](../design/01-erd.md) (Document `ai-session`, AiMessage)

| Hook | Endpoint | Permission | Body / Notes |
|------|----------|------------|--------------|
| `aiService.sessions()` | `GET /api/v1/ai/sessions` | `ai.read` | `listByKind<AiSession>(tenantId,'ai-session')` `platform.ts:275-277` — Document store, ordered `position` |
| `aiService.activeSession()` | `GET /api/v1/ai/sessions/active` | `ai.read` | `listByKind` + sort `new Date(b.updatedAt) desc` `platform.ts:278-283` — most recent |
| `aiService.session(id)` | `GET /api/v1/ai/sessions/:id` | `ai.read` | `findByKey<AiSession>(tenantId,'ai-session', id)` `platform.ts:284-286` `required` 404 |
| `aiService.messages(sessionId)` | `GET /api/v1/ai/sessions/:id/messages` | `ai.read` | `prisma.aiMessage.findMany where tenantId+sessionId order createdAt asc` `platform.ts:288-293` |
| `aiService.sendMessage(sessionId, body)` | `POST /api/v1/ai/sessions/:id/messages` | `ai.read` | body `{body: string}` trim required `400 body required`; creates `user role` + `assistant stub Acknowledged: "…" (LLM integration pending.)` `prisma.aiMessage.create tenantId sessionId role body createdAt` `platform.ts:295-306` 201 `{user, assistant}` |
| `cisService.list()` (completeness) | `GET /api/v1/cis?page&pageSize` | `cmdb.read` | for `AiCompletenessPanel` counts (`ownerId`, `monitoringRuleCount`) |
| future `POST /ai/sessions` | — | `ai.write` (TBD) | Create session with domain/title — currently client generates `ai-sess-{Date.now()}` locally, not POST |
| future `PATCH /ai/sessions/:id` | — | — | Update title/draftsPending/draftsConfirmed — future |
| future `POST /knowledge/articles` via confirm KB | `POST /api/v1/kb/articles` | `kb.write` | Should be called on KB `confirmed` with `status draft` |

All via `src/services/core.ts:apiFetch` + `useResource(() => aiService.*,[])` `src/services/platformServices.ts:131-144`. Tenant-scoped `req.tenantId`. Socket: none yet (future `tenant:{tenantId}` for realtime draft hints).

## Open Items

- [ ] `initialSessionId` fallback `ai-sess-001` hardcode races with empty `Document ai-session` store — align to server-generated UUID or first `listByKind` id; verify `prisma/aiMessage` seed for ai-sess-001 exists (otherwise workspace starts empty even for demo user Sarah).
- [ ] Workspace `handleSend` should branch to mock draft generation like Quick Panel `getMockAiResponse` until LLM lands — currently only echo; verify UX parity `tambah|buat` → `draft_ci` in workspace matches Doc 7 §Input simulation `getMockAiResponse` (800ms mock).
- [ ] `ApiFetch`/platform router missing `POST /ai/sessions` + `PATCH` — confirm local `sessions` state vs server `Document ai-session` sync strategy; after confirm, should `PATCH Document data {draftStatus updated, counts}` + real CI/KB write, not just `setSessions`.
- [ ] `Edit field` button in `AiDraftCICard/AiDraftKBCard` no-op — bind to `FieldEditor` modal (defer or wire `onCancel` variant `set_field` action).
- [ ] `incidents.md` spec `AiDraftPlaceholder` vs `query_result_text` for `incident|problem|change` domains — `utils.ts buildDomainTextAnswer` now yields `query_result_text` answer text, not `draft_placeholder` kind; decide single source (Doc 7 expects placeholder for those domains).
- [ ] `Cmd+K` conflation — TopBar/ AppShell `Cmd+K` opens `CmdKPalette` not AI; ensure AI not claimed in palette search (`docs/features/_backlog.md` parked global search) and update Doc 7 checklist `Cmd+K toggle panel` to note diverged design (TopBar ghost is primary trigger; Cmd+K is palette).
- [ ] FAB vs TopBar ghost — Doc 7 checklist `Floating button 44×44 bottom-6 right-6 #185FA5 not on /ai` fails in current impl (ghost in TopBar); either add FAB or update checklist to `TopBar ghost Sparkles 20` control.
- [ ] Verify `ai.read` seeded in `prisma/seed.ts` `Permission` catalog and assigned to default roles (viewer/operator); `rbac` `functionalRole` PERM list in `docs/features/admin.md`.
- [ ] `formatAiTime` locale `id-ID HH:mm` vs spec example `May 9, 14:35` locale short — align `timestamp` display in `AiQueryResultCI/Text` (currently `formatAiTime` vs `payload.timestamp` separate).
- [ ] Right rail `Tersimpan hari ini` currently shows all `confirmed` in session, not date-filtered today — add `isToday(new Date(createdAt))` filter when date scoping matters.
- [ ] Add skeleton loading for sessions/messages (parity with `incidents/cmdb` `skeleton 8 rows shimmer` vs current silent zero until fetch).
- [ ] Audit: `sessionId` in `AiMessage` not FK to `Document ai-session` (Document store vs Prisma AiMessage) — consider unifying session store to `AiMessage.sessionId` FK or keep Document+AI dual store but document relation clearly.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/PROMPT-MVP-UI-OIS-Doc7-AIChatMode.md` + `src/routes/ai/AiWorkspace.tsx` + `src/components/ai/*` (18 files) + `server/routes/platform.ts:/ai` + `src/types/ai.ts` + `src/services/platformServices:aiService` + `src/index.css` tokens `ois-*` ke template features (Quick Assist Panel + Workspace 3-col + draft lifecycle + completeness) | — |
