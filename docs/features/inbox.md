# Inbox

Status: **Draft**
Route: `/inbox` (full page) + drawer overlay via TopBar bell (`src/components/layout/InboxDrawer.tsx`)
Sidebar: Platform · Inbox
Source: `src/routes/platform/Inbox.tsx` · `src/components/inbox/InboxListItem.tsx` · `src/components/inbox/InboxItemDetail.tsx` · `src/components/inbox/InboxEmptyState.tsx` · `src/components/inbox/InboxTypeChip.tsx` · `src/components/inbox/InboxPriorityBadge.tsx` · `src/components/inbox/InboxActionButtons.tsx` · `src/components/layout/InboxDrawer.tsx` · `server/routes/platform.ts:25,220-226` · `src/types/platform.ts:5-48` · `src/services/platformServices.ts:90-93` · `src/lib/constants.ts:542-559` · `src/index.css:8-17` · `src/components/ui/SeverityStripe.tsx` · `src/components/ui/IDCell.tsx` · `src/components/ui/Dot.tsx`

---

## Intent

**Satu tempat untuk semua hal yang butuh perhatian user** — personal action queue lintas modul. Agregator mention, approval request, SLA warning, assignment, system alert, report ready, KB review, dan DR reminder dalam 2-panel triage (list + detail) dengan smart sort dan batch hygiene. ITIL 4: Workforce notification & action queue — setiap item deep-link ke source of truth via `sourceUrl`/`primaryAction.navigateTo`.

---

## Current State (snapshot `src/routes/index.tsx:79,217`)

- `src/routes/index.tsx:79` imports `Inbox` dari `src/routes/platform/Inbox.tsx`.
- `src/routes/index.tsx:217` → `{ path: 'inbox', element: <Inbox /> }` under `AppShell` + `RequireAuth` + `RequirePasswordChange`.
- Full page `src/routes/platform/Inbox.tsx:48-252` — `useResource(() => inboxService.items(), [])` → `setItems(data)` effect `55-57`, 4 `useMemo` (unreadCount `60`, actionCount `61`, urgentCount `62`, filteredItems `65-95`, selectedItem `97`) + 7 mutation helpers `100-137` (`updateItem`, `handleSelect` auto `isRead:true`, `handleArchive`, `handlePin`, `handleMarkRead`, `handleMarkUnread`, `handleMarkAllRead`, `handleArchiveRead`).
- List render `src/components/inbox/InboxListItem.tsx:28-134` — `SeverityStripeRow` wrapper + `Dot` unread + `InboxPriorityBadge` + `InboxTypeChip` + `IDCell` + hover actions.
- Detail render `src/components/inbox/InboxItemDetail.tsx:46-152` — header badges/actions + title/sender/clock + body `renderBody` markdown-lite + source ref `Link to={sourceUrl}` + `InboxActionButtons`.
- Empty `src/components/inbox/InboxEmptyState.tsx:8-32` — varian `all_caught_up` (success pale) vs `no_selection` (surface muted).
- Chips/badges `InboxTypeChip.tsx:12-25` `InboxPriorityBadge.tsx:11-41`, buttons `InboxActionButtons.tsx:16-38`.
- Drawer `src/components/layout/InboxDrawer.tsx:15-121` — `useResource items`, filter `all|urgent|approval`, `FilterPill`, `motion` backdrop+slide, left `w-1 bg-ois-danger` untuk urgent.
- API `server/routes/platform.ts:25` `use('/inbox', requirePermission('inbox.read'))` + `GET /inbox` legacy `inbox-legacy` `:221-223` + `GET /inbox/items` `inbox-item` `:224-226` via `listByKind(req.tenantId, ...)` (Documents store tenant-isolated, belum ada `POST/PATCH` mutation).
- Services `src/services/platformServices.ts:90-93` `inboxService = { feed: '/inbox' (LegacyInboxItem), items: '/inbox/items' (InboxItem[]) }` via `apiFetch` (`src/services/core.ts:29-61`) + `useResource` pattern.
- Types `src/types/platform.ts:5-48` `InboxItemType` 9, `InboxItemPriority` 4, `InboxItem` 18 fields + `LegacyInboxItem` 8 fields.
- Constants `src/lib/constants.ts:542-559` `inboxItemTypeMeta` (color+icon per type), `inboxPriorityMeta` (color+bg per priority).
- Tokens `src/index.css:8-39` `@theme --color-ois-*` (primary `#1F4FD4`/`#1A42B5`/`#EEF2FF`, bg `#F7F8FA`, surface `#FFFFFF`/`#F1F3F7`, border `#E4E7EC`/`#D0D5DD`, text `#101828`/`#475467`/`#98A2B3`, semantic success/warning/danger/info + pales, sev-p1 `#B42318` p2/p3 `#DC6803` p4 `#027A48`), radius `ois-card 8px ois-btn 6px ois-badge 4px ois-modal 12px`, font `Plus Jakarta Sans` + `Geist Mono`.
- Primitives `SeverityStripe.tsx:11-16` `COLOR P1 #B42318 P2/P3 #DC6803 P4 #027A48` `border-l-[3px]`, `IDCell.tsx:13-22` `font-mono text-[12px] tabular-nums text-ois-text-muted`, `Dot.tsx:15-28` `info bg-ois-info w-1.5 h-1.5 pulse`.
- Realtime `server/realtime.ts:52,71` `socket.join(room(tenantId,'inbox'))` + `emit('inbox:item', item)` ke `tenant:{tenantId}:inbox`; client `src/services/realtime.ts:19` `on('inbox:item', InboxItem)` — belum wire auto-refresh `items` di Drawer/full page (poll `useResource` mount-only).

**Working:**
- Full-page layout `h-[calc(100vh-3.5rem)] flex overflow-hidden bg-ois-surface` (`Inbox.tsx:142`) split `w-80 border-r` left + `flex-1 overflow-y-auto` right — render tanpa error dengan tenant seed data.
- Stats header `unread · action · urgent` counts non-archived (`60-62`) + fallback `All caught up` (`161-163`).
- Tabs `All|Unread|Requires action|Archived` (`TABS 15-20`) switch `14` state → `filteredItems` branch `68-81` + search `83-92` (`title/summary/senderName/sourcePublicId includes lower q`) → `sortItems` (`31-44` pinned→unread→priority `PRIORITY_ORDER 24-28` → newest `receivedAt`).
- Auto-read on select (`104-108` set `isRead true` saat `handleSelect`), pin toggle (`115-118` flip `isPinned`), archive (`110-113` set `isArchived true` + clear `selectedId` jika terpilih), mark read toggle (`120-123`), mark unread (`125-127`), batch `Mark all read` (`129-131` map `isRead true`) + `Archive read` (`133-137` map `isRead&&!isArchived→isArchived true`).
- InboxListItem `SeverityStripeRow severity PRIORITY_TO_SEVERITY urgent→P1 high→P2 normal→P3 low→P4` + `class relative px-3 py-3 border-b border-ois-border cursor-pointer isSelected bg-ois-primary/5 else hover:bg-ois-surface-muted` (`47-52`), unread `Dot variant info size sm pulse` (`58`) vs placeholder `w-2 h-2 bg-transparent` (`60`), top chips `priority urgent|high → InboxPriorityBadge` + `InboxTypeChip` + `IDCell sourcePublicId` + `Pin 10 muted ml-auto` if pinned (`66-72`), title `text-xs truncate font-semibold if !isRead` (`76-84`), sender+time `text-[11px] muted vs formatRelative(receivedAt)` (`87-92`), summary `line-clamp-2 text-[11px] subtle` when `!hovered` (`95-99`), hover reveal 3 buttons `Archive/Pin/MarkRead` `stopPropagation` (`102-128`).
- InboxItemDetail header badges + 3 `Button ghost sm gap-1.5 muted` Archive/Pin/MarkUnread `size 14` (`64-95`), title `text-base font-semibold leading-snug` (`99`), sender `text-xs muted font-medium` · time `formatDate 'MMM d, yyyy HH:mm' UTC` (`102-107`), expiry countdown `getExpiresCountdown 28-38` if `≤24h` → `text-xs danger font-medium Clock 12 Expires in {h}m` (`111-116`), body `renderBody body?body:summary` `**bold**` split + `<br>` + `linkifyEntities` (`13-26` + `121-127`), divider `hr border-ois-border my-5` (`130`), source ref `Source: Link to={sourceUrl} font-mono ois-primary ExternalLink10 + sourceTitle muted` (`133-144`), action buttons via `InboxActionButtons` (`148`).
- Empty states: `all_caught_up` `w-12 h-12 rounded-full bg-ois-success-pale CheckCheck 22 success + All caught up semibold + No items match filter subtle` (`11-18`), `no_selection` `w-14 h-14 bg-ois-surface-muted Inbox 26 subtle + Select an item + Choose... max-w-48` (`22-29`).
- Drawer overlay `InboxDrawer.tsx:29-43` backdrop `fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] motion opacity`, panel `fixed right-0 w-full max-w-[400px] bg-white shadow-ois-modal z-[101] spring damping25 stiffness200`, header `p-5 border-b shadow-sm Inbox 18 bold + Action required for you xs muted + X 20 ghost` (`45-52`), filter pills `All N|Urgent N|Approvals N` `FilterPill rounded-full px-3 py-1 text-xs semibold` active `bg-ois-primary/danger text-white border matching` else `bg-ois-surface border-ois-border muted hover:border-muted` (`55-59`), per item `p-5 hover:surface-muted group relative divide-y` + `left w-1 bg-ois-danger if urgent else transparent` (`66-69`), caps `text-[10px] bold uppercase tracking-wider subtle URGENT danger` + type + `font-mono sourcePublicId` (`73-77`), title `text-sm semibold` + time `text-[11px] urgent danger else subtle formatRelative` (`78-86`), summary `line-clamp-2 text-sm muted mb-4 linkify` + CTA `primaryAction? Button primary sm label : outline View` + ExternalLink ghost opacity0 group-hover100 (`89-100`).
- Constants mapping `inboxItemTypeMeta` 9 entries approval `#6941C6 CheckSquare` mention `#0BA5EC AtSign` incident_update `#B42318 AlertTriangle` assignment `#0BA5EC UserPlus` sla_warning `#DC6803 Clock` system_alert `#DC6803 Bell` report_ready `#475467 FileText` kb_review `#067647 BookOpen` dr_test_reminder `#0BA5EC Shield` (`542-552`), priority `urgent #B42318 #FEF3F2` high `#DC6803 #FFFAEB` normal `#475467 #F1F3F7` low `#98A2B3 #F1F3F7` (`554-559`).

**Stub / Partial:**
- Mutation optimistic client-only `updateItem 100-102 map ...patch` — belum persist `PATCH /inbox/items/:id` (`readAt/archivedAt` setter + `inbox.read` guard), sehingga refresh / buka tab baru → state hilang; `handleSelect` mark read tidak revert on error.
- `Inbox.tsx` filter `search` matches `title/summary/senderName/sourcePublicId` saja — `id` dan `sourceTitle/body` tidak ikut (beda dengan baseline `docs/pages/inbox.md §2` body ikut? impl list `summary` only).
- Sort `sortItems` key `receivedAt` newest — `Legacy inbox` sort `dueAt` tidak lagi relevan; `InboxItem` `expiresAt` tidak affect sort hanya countdown display.
- Drawer `InboxDrawer.tsx` `filter 'all'|'urgent'|'approval'` hardcoded — full-page tabs `requires_action/archived` tidak ada di drawer; keduanya mount `useResource items()` terpisah tanpa shared cache/join socket, sehingga triage di drawer tidak sync ke `/inbox`.
- `InboxItemDetail` `renderBody` naive `split(**...**|\n)` + `linkifyEntities` — tidak sanitize HTML, tidak support list/code block; `body` fallback `summary` dengan `linkify` saja.
- `server/routes/platform.ts` read-only `GET /inbox` legacy `inbox-legacy` kind + `GET /inbox/items` `inbox-item` — tidak ada `POST /inbox/items/:id/read|archive|pin` maupun `GET /inbox/count` untuk badge/nav (spec `OIS-INSTRUCTIONS-V3.md:632-633` & baseline `docs/pages/inbox.md §11` menyebut mutation akan di M7).
- Mark all read/archived map tipe `setItems(prev => prev.map(... isRead:true))` tanpa transaksi — archiving `isRead&&!isArchived` bisa race dengan concurrent socket push `inbox:item`.

**Missing (vs spec `docs/pages/inbox.md` & V3 + legacy):**
- Write endpoints `POST /inbox/:id/act` execute primary action, `POST /inbox/:id/snooze`, `GET /inbox/count` per tenant user (untuk TopBar bell pulse + Sidebar badge); `PATCH /inbox/items/:id` read/archive/pin/snooze dengan `readAt/archivedAt` stamping server.
- Quiet hours filter `respectQuietHours` + timezone, snooze/quiet-hours UI, expiry auto-archive job `scheduled archive expiresAt` (baseline `§12 Realtime/Jobs` dispatch+cleanup).
- Query persistence `?tab=all|unread|requires_action|archived&q=&selected=` via `useSearchParams` (heatmap/commit style availability `?service&date`) + deep link `sourceUrl` vs `navigateTo` fallback consistency.
- Notifications topic binding `NotificationTopic 14` → inbox type routing (mis. `incident_assigned→assignment`, `sla_warning→sla_warning`) dan preference `respectQuietHours/overrideForUrgent` gate sebelum `socket.emit inbox:item`.
- Upstream generators: incidents assignment/SLA/mention, changes approval, requests approval, KB review, DR test reminder — `src/lib/constants` & event publishers belum spawn `InboxItem` canonical (hanya `server/realtime.ts` stub emit).
- Pagination `?page&pageSize`/`parsePagination` (`server/lib/pagination.ts`) untuk inbox list >100 items; current load `listByKind` all tanpa limit.
- Full-text search parser `priority:urgent app:payment` + column sort toggle (mirip incidents quick chip search).
- Deleted: filter `priority`+`type` dropdown (hanya pills/tabs saat ini) — legacy `OIS-INSTRUCTIONS-V3.md:632` filter `status, priority, module`.

---

## Primary View — Full Page (`/inbox`)

Layout: **2-panel split** `Inbox.tsx:142` `flex h-[calc(100vh-3.5rem)] overflow-hidden bg-ois-surface`.

```
┌───────────────────────────┬────────────────────────────────┐
│ Left  w-80 border-r       │ Right flex-1 overflow-y-auto   │
│  title+counts  px-4 pt-4  │                                │
│  tabs All/Unread/Action/  │  selected ? <InboxItemDetail>  │
│       Archived            │           : <InboxEmptyState    │
│  search+batch px-3 py-2  │              variant=            │
│  list flex-1 overflow-y  │              "no_selection">    │
│    filteredItems→         │                                │
│    InboxListItem|Empty    │                                │
│                           │                                │
│  stats text-[11px]        │  divider hr border-ois-border │
│  unread primary           │  source ref Link mono primary  │
│  action warning           │  actions primary+secondary     │
│  urgent danger            │  expiry Clock danger ≤24h      │
│  all caught up subtle     │                                │
└───────────────────────────┴────────────────────────────────┘
```

### Left — Header Stats (`Inbox.tsx:146-165`)

`px-4 pt-4 pb-3 border-b border-ois-border` — row `flex gap-2 mb-2 Inbox 16 ois-primary + h1 text-sm font-bold ois-text` + counts `flex gap-3 text-[11px]` conditional `{unreadCount>0 → text-ois-primary font-semibold unread}` `{actionCount>0 → text-ois-warning action}` `{urgentCount>0 → text-ois-danger urgent}` else `text-ois-text-subtle All caught up` — counts derived `filter !isArchived` (`60-62`).

### Tabs (`168-185`)

`border-b border-ois-border` `nav flex overflow-x-auto scrollbar-hide` per `TABS` → `button flex-shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text`. Click `setActiveTab` resets only view filter, tidak reset `selectedId` (gap — select bisa out-of-filter).

### Search + Batch (`188-215`)

`px-3 py-2 border-b flex flex-col gap-2` — search `relative Search 12 left-2.5 -translate-y-1/2 text-ois-text-subtle + input w-full pl-7 pr-3 py-1.5 text-xs bg-ois-surface-muted border-ois-border rounded text-ois-text placeholder:text-ois-text-subtle focus:border-ois-primary placeholder="Search inbox…" value search` (`189-197`); batch row `flex gap-1.5` buttons `flex gap-1 text-[10px] muted hover:text-ois-text px-1.5 py-1 rounded hover:bg-ois-surface-muted` with `CheckCheck 10 Mark all read → handleMarkAllRead` + `ArchiveX 10 Archive read → handleArchiveRead` (`199-214`).

### Item List (`218-234`)

`flex-1 overflow-y-auto` — empty `filteredItems.length===0 → <InboxEmptyState variant="all_caught_up">` else `filteredItems.map → <InboxListItem isSelected=item.id===selectedId onClick handleSelect onArchive onPin onMarkRead>`.

### Right — Detail Pane (`238-249`)

`flex-1 overflow-y-auto bg-ois-surface` — `selectedItem? <InboxItemDetail item onArchive onPin onMarkUnread> : <InboxEmptyState variant="no_selection">`. Detail tidak ada scroll sync ke list.

---

## InboxListItem (`src/components/inbox/InboxListItem.tsx:28-134`)

- **Wrapper:** `SeverityStripeRow severity=PRIORITY_TO_SEVERITY[priority] ?? P4` `COLOR P1 #B42318 #DC6803 #DC6803 #027A48` `border-l-[3px]` + `relative px-3 py-3 border-b border-ois-border cursor-pointer isSelected bg-ois-primary/5 else hover:bg-ois-surface-muted transition-colors` (`39-52`), `role button tabIndex0 onClick onKeyDown Enter→onClick` + `onMouseEnter/Leave hovered` (`41-46`).
- **Unread dot:** `flex-shrink-0 mt-1.5` `!isRead ? <Dot variant info size sm pulse aria-label Unread> : <span w-2 h-2 rounded-full bg-transparent>` (`56-61`). Pattern `Dot.tsx:15-28` pill + animate-ping overlap `opacity-60`.
- **Meta row:** `flex items-center gap-1.5 mb-1` → `priority===urgent||high ? <InboxPriorityBadge>` else none + `<InboxTypeChip type>` + `sourcePublicId ? <IDCell value>` (`13-22` `font-mono text-[12px] tabular-nums muted whitespace-nowrap`) + `isPinned && <Pin 10 text-ois-text-subtle ml-auto>` (`67-72`).
- **Title:** `p text-xs leading-snug truncate mb-0.5` `isRead ? text-ois-text font-normal : font-semibold` + `title tooltip` (`76-84`).
- **Sender+time:** `flex justify-between mb-1` `senderName truncate text-[11px] muted` + `formatRelative(receivedAt) text-[11px] subtle flex-shrink-0 ml-1` (`87-92`).
- **Summary vs hover actions:** `!hovered ? p line-clamp-2 text-[11px] subtle leading-relaxed summary` (`95-99`) : `div flex gap-1 mt-1` 3 pills `inline-flex gap-1 px-1.5 py-0.5 rounded text-[10px] muted hover:text-ois-text hover:bg-ois-border` with `Archive 10 Archive → onArchive stopPropagation`, `Pin 10 Pin/Unpin → onPin`, `MailOpen 10 Read/Unread toggle` (`102-128`).

Ref `InboxTypeChip.tsx:17-24` `inline-flex gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border leading-none` + icon `size10` via `Constants inboxItemTypeMeta.icon` + style `color bg 18% border 30%`. `InboxPriorityBadge.tsx:14-40` urgent/high → `inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold` `color+bg upper` vs normal/low → `px-2 py-0.5 rounded text-[10px] font-semibold border` `transparent bg borderColor 40%`.

---

## InboxItemDetail (`src/components/inbox/InboxItemDetail.tsx:46-152`)

`flex flex-col h-full`:

- **Header** `px-6 py-4 border-b border-ois-border` — row1 `flex justify-between gap-4` left `flex items-center gap-2 flex-wrap InboxPriorityBadge + InboxTypeChip` + right `flex gap-1 shrink-0` 3 `Button ghost sm gap-1.5 muted hover:text-ois-text` `Archive 14 Archive`, `Pin 14 Pin/Unpin` (`isPinned ? Unpin : Pin`), `MailOpen 14 Mark unread` (`64-95`).
- **Title** `h2 text-base font-semibold text-ois-text mt-3 leading-snug` (`99`).
- **Sender+time** `flex gap-2 mt-1.5` `senderName text-xs muted font-medium · text-ois-text-subtle · formatDate(receivedAt, 'MMM d, yyyy HH:mm') UTC text-xs subtle` (`102-107`).
- **Expiry** if `expiresCountdown!=null` (`28-38` diff: `<=0 Expired else hours>24 null else hours>0 "Expires in {h}h {m}m" else "{m}m"`) → `mt-2 flex gap-1.5 text-xs danger font-medium Clock 12` (`111-116`). Hours>24 tidak tampil (baseline `docs/pages/inbox.md §3` — only `<24h` Show).
- **Body** `flex-1 overflow-auto px-6 py-5` → `item.body ? p text-sm text-ois-text leading-relaxed renderBody(body) split (**...**|\\n) bold <strong> + linkifyEntities` else `p text-sm muted linkify(summary)` (`121-127`). `renderBody 13-26` mini-parser — no sanitize, bold only.
- **Divider** `hr border-ois-border my-5` (`130`).
- **Source ref** `flex gap-2 mb-6` `text-xs subtle Source:` + col `Link to={sourceUrl} text-xs font-mono text-ois-primary hover:underline inline-flex gap-1 sourcePublicId + ExternalLink 10` + `span text-xs muted sourceTitle` (`133-144`).
- **Actions** `<InboxActionButtons primary secondary>` (`148`) → `flex gap-2` `primary ? Link to=primary.navigateTo Button primary sm gap-1.5 label + ExternalLink 12` + `secondary ? Link Button outline sm` (`InboxActionButtons.tsx:19-37`) — null if both absent.

---

## InboxDrawer (`src/components/layout/InboxDrawer.tsx:15-121`)

Global overlay dipanggil dari `AppShell` (`TopBar` bell). Mount `useResource items` independently dari `/inbox` page — no shared store.

- **Backdrop** `motion.div initial opacity 0 → animate 1 exit 0 onClick onClose fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]` (`29-35`).
- **Panel** `motion.div initial x 100% → 0 exit 100% spring damping25 stiffness200 fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-white shadow-ois-modal z-[101] flex flex-col` (`38-43`).
- **Header** `p-5 border-b shadow-sm flex justify-between` — `h2 text-lg font-bold Inbox + p text-xs muted Action required` + `Button ghost icon X 20 onClose` (`45-52`).
- **Filters** `px-5 py-3 border-b flex gap-2 overflow-x-auto` `FilterPill All N urgentCount Approvals type=approval_request count` (`57-59`) — local `useState filter all|urgent|approval` (`16`) filter `21-24` `urgent→priority urgent, approval→type approval_request`. Pills `FilterPill.tsx:105-121` `whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition-all` active `bg-ois-danger/o is-primary border matching text-white` else `bg-ois-surface border-ois-border muted hover:border-muted`.
- **Items** `flex-1 overflow-y-auto divide-y divide-ois-border` maps `filteredItems` per card `p-5 hover:bg-ois-surface-muted group relative cursor-pointer` (`65-66`) + left stripe `absolute left-0 top-0 bottom-0 w-1 bg-ois-danger if urgent else bg-transparent` (`66-69`) + header `flex justify-between gap-3 mb-2` col `flex gap-1` caps `flex gap-2 text-[10px] bold uppercase tracking-wider subtle` `urgent? ● URGENT danger else hidden` + `type.replace _→space` + `•` + `font-mono sourcePublicId` (`73-77`) + right time `text-[11px] font-medium whitespace-nowrap urgent danger else subtle formatRelative` + `h3 text-sm font-semibold leading-tight title` (`78-86`) + summary `p text-sm muted line-clamp-2 mb-4 linkify summary` (`89`) + action row `flex gap-2` `primaryAction ? Button sm primary label : outline View` + ghost `ExternalLink 14 ml-auto opacity-0 group-hover:opacity-100` (`91-100`). CTA belum wire `navigate(primaryAction.navigateTo ?? sourceUrl)` — klik `Button` tidak ada handler (gap vs full-page `Link`).

---

## Actions

| Action | Trigger | Permission | State required | Notes |
|--------|---------|------------|----------------|-------|
| Open inbox page | `Open Inbox →` di dashboard/topbar `Link /inbox` | `inbox.read` (`platformRouter.use('/inbox', requirePermission('inbox.read'))` `platform.ts:25`) | authed (`RequireAuth` `app.ts:126` + tenant isolate `withScopedDb`) | `src/routes/index.tsx:217` |
| Open drawer | Bell di TopBar → `InboxDrawer` slide | `inbox.read` (data fetch via `inboxService.items()` needs same) | — | `AppShell` local `inboxOpen` state |
| Filter tab (full page) | Click `All\|Unread\|Requires action\|Archived` Tab `Inbox.tsx:170-184` | `inbox.read` | — | local `activeTab` `TabId all\|unread\|requires_action\|archived` |
| Filter drawer | Click `All\|Urgent\|Approvals` `FilterPill` `InboxDrawer.tsx:57-59` | `inbox.read` | — | `filter all\|urgent\|approval` |
| Search | Type `Search inbox…` `Inbox.tsx:189-197` | `inbox.read` | — | client `title/summary/senderName/sourcePublicId includes lower` |
| Select item | Click `InboxListItem` `Inbox.tsx:104-108` | `inbox.read` | not archived to show detail | `setSelectedId` + optimistic `isRead:true` |
| Archive | Row hover `Archive` / detail `Archive` `handleArchive 110-113` | — (client-only; spec future `inbox.update`) | — | `isArchived true` + clear selection if selected; batch via `Archive read` |
| Pin/Unpin | Row hover `Pin` / detail `Pin` `handlePin 115-118` | — | — | `isPinned !isPinned` affects `sortItems` pinned-first |
| Mark read / unread | Row hover `MailOpen` toggle `handleMarkRead 120-123` / detail `Mark unread 125-127` | — | — | `isRead !isRead` toggles Dot + bold; `handleSelect` always sets read |
| Mark all read | `Mark all read CheckCheck 10` `Inbox.tsx:200-206 129-131` | — | — | `map isRead true` all `items` |
| Archive read | `Archive read ArchiveX 10` `207-213 133-137` | — | `isRead&&!isArchived` | `map isRead→isArchived true` |
| Navigate to source | Click `InboxActionButtons` primary/secondary `Link to={navigateTo}` `InboxActionButtons.tsx:22-35` / detail `Link to={sourceUrl}` `InboxItemDetail:137` | varies by target module (`incident.read` etc.) | `sourceUrl`/`navigateTo` non-empty | `ExternalLink 12/10` decor |
| Filter pill open inbox | `All\|Urgent\|Approvals` `InboxDrawer` counters `inboxItems.length` etc. | `inbox.read` | — | drawer counters unfiltered total vs `filteredItems.length` for list |

Delegate ke `_shared/filter-sort-export.md` (saat tersedia) untuk pattern `Search + FilterDropdown` & `_shared/routing.md` untuk Module Layout (inbox tidak pakai Module Layout — standalone 2-panel).

---

## Filters / Sort / Search

- **Tabs (full page)** `Inbox.tsx:15-20` `TABS all/unread/requires_action/archived` → `filteredItems` branch `68-81` (`all !isArchived`, `unread !isRead&&!isArchived`, `requires_action requiresAction&&!isArchived`, `archived isArchived`). Persist hanya local `useState` `activeTab` default `all` (`51`) — belum `useSearchParams ?tab=&q=&selectedId=` (gap vs capacity thresholds `?search&severity` pattern).
- **Search** `83-92` `search.trim().toLowerCase()` → `title||summary||senderName||sourcePublicId includes q` — no debounce, case-insensitive, no highlight; omit `body/sourceTitle/id` (gap vs `docs/pages/inbox.md §2` scope `title/summary/sender/sourcePublicId` — senderName mapped from sender).
- **Sort** `31-44 sortItems(items)` stable copy `[...items].sort` keys: `[0] isPinned desc` (pinned first), `[1] !isRead before isRead`, `[2] PRIORITY_ORDER urgent 0 < high1 < normal2 < low3`, `[3] receivedAt desc newest`. No user-selectable sort — fixed smart triage.
- **Drawer filter** `InboxDrawer.tsx:20-24` `filter all|urgent|approval` on `inboxItems` full before render — counts via `inboxItems.filter priority urgent / type approval_request length` (`58-59`) recomputed per render.
- **No URL persist / pagination** — `listByKind('inbox-item')` fetch all rows (Documents JSON `kind` store) no `?page&pageSize` (`parsePagination` di `server/lib/pagination.ts` tidak dipakai inbox); >100 items scale risk.
- **No debounce/skeleton** — `useResource` mount fetch `data ?? []` fallback zero-state (capacity vs inbox gap — overview uses refresh debounced).
- **Future:** `priority/type` dropdown (spec `OIS-INSTRUCTIONS-V3.md:633` filter `status, priority, module` + legacy `FilterDropdown` pattern incidents/capacity) + `expiresAt` within 24h badge (`InboxItemDetail getExpiresCountdown`) tapi list tidak show expiry.

---

## Detail View

No separate `/inbox/:id` route — detail is inline right pane `flex-1 overflow-y-auto bg-ois-surface` `Inbox.tsx:238-249` swapping `selectedItem→InboxItemDetail else InboxEmptyState no_selection`.

- **Header** badges+actions (`InboxItemDetail.tsx:58-95`) — `InboxPriorityBadge` + `InboxTypeChip` left-wrap, 3 ghost `Archive|Pin|Mark unread` right.
- **Title** `text-base font-semibold mt-3` + sender `text-xs muted font-medium senderName` · `formatDate MMM d, yyyy HH:mm UTC` (`99-107`).
- **Expiry** `Clock 12` danger line if `expiresAt && diff<=24h` (`28-38` + `111-116`).
- **Body** `flex-1 overflow-auto px-6 py-5` `renderBody` bold/linkify (`121-127`) — linkify via `src/lib/entity-linkify.ts` (INC- / CHG- auto links) ikut `InboxDrawer` summary.
- **Source** mono `sourcePublicId` link `to=sourceUrl` + `sourceTitle` + `hr` divider (`130-144`).
- **Actions** `InboxActionButtons` primary+secondary `Label→navigateTo` (docs expect `actionId` alternative per `docs/pages/inbox.md §10` but type `actionId` absent — `primaryAction: {label,navigateTo} 36-42` only).
- **Variants:** `InboxEmptyState all_caught_up` (center `py-16 min-h-[300px] w-12 h-12 rounded-full bg-ois-success-pale CheckCheck 22 success + All caught up semibold + No items match filter`) vs `no_selection` (`min-h-[400px] w-14 h-14 bg-ois-surface-muted Inbox 26 + Select an item + Choose…`) (`InboxEmptyState.tsx:11-31`).

Ref `_shared/entity-detail-page.md` — inbox uses 2-panel `w-80` left pattern mirip `MonitoringLayout/EventDetail` tapi non-3-column; future `_shared` extraction reuses empty states.

---

## State Lifecycle

Per item `InboxItem 32-47` fields `isRead isArchived isPinned requiresAction readAt archivedAt expiresAt`.

```
created → receivedAt set (server ingest)
   ├─ isRead false initial (Dot pulse info)
   │    └─ [Select] → handleSelect sets isRead true (auto-read, 107) / handleMarkRead toggles / handleMarkUnread resets
   ├─ isPinned false ↔ true toggle handlePin (affects sort)
   ├─ requiresAction boolean (source-driven, e.g., approval_request true; filter tab Requires action)
   ├─ expiresAt? → getExpiresCountdown ≤24h shows danger badge → diff<=0 "Expired" (future job archive expired 24h)
   └─ isArchived false → [Archive | Archive read] → true (removed from All/Unread/Action, moves to Archived tab)
   Archived tab → still viewable, Can re-archive? currently no unarchive action (gap — no toggle to false).
```

Lifecycle is not status enum but boolean flags (vs `IncidentStatus new→closed`). `readAt/archivedAt` stored tapi tidak diset UI (`updateItem patch` tidak stamp timestamp — spec says `readAt` when mark read). Expiry job belum wired (`docs/pages/inbox.md §12` expiry cleanup scheduled archive past `expiresAt`).

Allowed client mutations saat ini semua optimistic local `updateItem patch` tanpa server stamp — Phase 2 must align `readAt = now` on read, `archivedAt = now` on archive, `expiresAt` immutable from generator.

Ref: `src/types/platform.ts:32-48` full `InboxItem` shape incl `primaryAction/secondaryAction navigateTo`.

---

## Permissions (action-level)

Global `requireAuth` (`server/app.ts:126`) gates semua `server/routes/platform.ts` via `withScopedDb` → `req.tenantId`/`req.permissions` selalu ada; `platformRouter.use('/inbox', requirePermission('inbox.read'))` (`platform.ts:25`) adalah guard read.

| Role / Permission | Read inbox list/detail | Mark read / pin / archive (client) | Write persist | Count/badges | Manage generators |
|------------------|------------------------|-----------------------------------|---------------|--------------|-------------------|
| `inbox.read` (all authenticated via seed RBAC catalog `src/types/rbac` + `server/auth/permissions.ts`) | ✅ `GET /inbox/items` via `inboxService.items()` (`platformServices.ts:92`) + drawer same | ✅ local optimistic (no guard) | ❌ no `POST/PATCH /inbox/items/:id` yet (future `inbox.write`/`inbox.update`) | ✅ `GET /inbox/count` planned (+ TopBar bell + Dashboard preview 3) | ❌ |
| `inbox.write` (future) | — | — | ✅ `PATCH /inbox/items/:id` read/archive/pin/snooze + bulk `POST /inbox/batch` | — | — |
| `notification.read` / `incident.read` etc. | — | — | — | — | generators need module perms to emit inbox items (e.g., `incident.write` to create `assignment`) |

Scope violation `ScopeViolationError 403 { error:'scope_violation' }` via `server/scope/errors.ts:9` mapped di `server/app.ts` error handler — `listByKind req.tenantId` isolates tenant (`platform.ts:221-226` Documents `kind` tenant-scoped `data` JSON serialized). No per-user filter yet di server — currently `GET /inbox/items` returns all tenant items (gap — baseline `docs/pages/inbox.md §7` seharusnya server-side filter per session user target). Client filters `isArchived` etc. only.

UI pattern: no `Can module="inbox"` wrapper yet — page accessible if authed + `inbox.read`; drawer same. Future `Can inbox write` gate batch actions after persist.

---

## Empty / Loading / Error

- **Empty filtered (left pane):** `filteredItems.length===0 → <InboxEmptyState variant="all_caught_up">` (`219-221`) — `flex flex-col items-center justify-center min-h-[300px] py-16` `w-12 h-12 rounded-full bg-ois-success-pale CheckCheck 22 success + All caught up semibold + No items… subtle`. Same for every tab including `archived` (copy not contextual — shows `All caught up` even when archive empty).
- **No selection (right pane):** `selectedItem null → <InboxEmptyState variant="no_selection">` (`246-248`) — `min-h-[400px] py-16 w-14 h-14 rounded-full bg-ois-surface-muted Inbox 26 subtle + Select an item + Choose an inbox item… max-w-48` (`22-29`).
- **Empty drawer items:** `filteredItems.map` zero → `flex-1 overflow-y-auto divide-y` renders empty div (no empty state — gap vs full page).
- **Loading:** `useResource(() => inboxService.items(), [])` (`49`) returns `data undefined` → `setItems(data)` only when `data` truthy (`55-57` `if (data) setItems(data)`) — initial `items []` → both panes show empty states (no skeleton shimmer vs incidents/queue pages; baseline gap).
- **Error:** no banner — `useResource` error swallowed; fetch failure → silent `[]` zero-state (should show `bg-ois-danger-pale text-danger Retry` like `incidents` per `src/services/core.ts` error state — gap).
- **Exhausted / archived all:** stats show `All caught up subtle` (`161-163`) when `unread+action+urgent===0`; archived items still counted only when viewing `Archived`.

---

## Phase 2 Deferred

- **Write API + persist:** `POST/PATCH /inbox/items/:id/{read,archive,pin,snooze}` + bulk `POST /inbox/batch` + `GET /inbox/count` (tenant+user scoped `readAt/archivedAt` stamping, `requirePermission inbox.write`) — rationale: current optimistic `updateItem` map only, refresh loses; spec `OIS-INSTRUCTIONS-V3.md:633` & baseline `docs/pages/inbox.md §11` M7.
- **Snooze & quiet hours:** Snooze action `POST /inbox/:id/snooze {until}` + `QuietHoursConfig` filter don't show non-urgent when `respectQuietHours true` (`platform.ts types QuietHoursConfig timezone fromHour toHour daysOfWeek`) + UI `Clock` badge — rationale: `notificationPref` already has `respectQuietHours/overrideForUrgent` but drawer/full page not gating.
- **Expiry auto-archive job:** scheduled `archive where expiresAt < now` + `emit inbox.item.expired` ke source module untuk eskalasi (`OIS-INSTRUCTIONS-V3.md:632-641`, `docs/pages/inbox.md §12`) — rationale: only countdown render, no cleanup.
- **Realtime sync & shared cache:** Wire `socket tenant:inbox inbox:item` → `setItems` merge di both `Inbox` + `InboxDrawer` (single SWR/reactive source vs dual `useResource`) + Dashboard preview top 3 sync — rationale: dual fetch no sync.
- **URL persistence & deep link:** `useSearchParams ?tab=&q=&selectedId=` + `navigate(primaryAction.navigateTo ?? sourceUrl)` consistency drawer vs detail + preserve after refresh — rationale: filter-sort-export drift.
- **Pagination + server filter:** `GET /inbox/items?archived=&requiresAction=&priority=&type=&q=&page&pageSize` with `parsePagination` (`server/lib/pagination.ts`) + `listByKind` limit — rationale: `listByKind` loads all tenant rows unbounded.
- **Full-text & type/priority dropdowns:** `FilterDropdown` for `priority urgent|high|normal|low` + `type 9 enum` + `Search` debounce highlight + `priority:urgent` parser — rationale: legacy `docs/pages/inbox.md §2` + V3 filter spec.
- **Unarchive & undo:** Toggle archive back to false + toast undo window (vs only archive) — rationale: Currently no unarchive.
- **Per-user server filter:** `GET /inbox/items` should filter `target userId / team channel` per session (baseline §7) — currently tenant-wide; add `recipientId` on `InboxItem`.
- **Read receipts & audit:** `readAt/archivedAt` server timestamps + `server/jobs` dispatcher per upstream `incident_update/approval_request` events — rationale: types have fields but UI not stamping.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/platform/Inbox.tsx` + `src/components/inbox/` + `src/components/layout/InboxDrawer.tsx` + `docs/pages/inbox.md`):

1. **2-panel split** `flex h-[calc(100vh-3.5rem)] overflow-hidden bg-ois-surface` (`Inbox.tsx:142`) left `w-80 flex-shrink-0 border-r border-ois-border bg-ois-surface` right `flex-1 overflow-y-auto bg-ois-surface` — jangan ganti ke Module Layout 3-col.
2. **Stats row** `text-[11px] gap-3 unread ois-primary font-semibold · action ois-warning · urgent ois-danger` else `All caught up ois-text-subtle` (`151-163`) — extend don't remove.
3. **Tabs** `flex overflow-x-auto px-3 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap active border-ois-primary text-ois-primary` (`174-179`) — 4 tabs exactly `All/Unread/Requires action/Archived`.
4. **Search input** `pl-7 pr-3 py-1.5 text-xs bg-ois-surface-muted border-ois-border rounded placeholder:text-ois-text-subtle focus:border-ois-primary Search 12 muted absolute` (`189-197`) — shadow/palette must stay `ois-*` (no hex).
5. **Batch actions** `CheckCheck 10 Mark all read + ArchiveX 10 Archive read text-[10px] muted hover:text-ois-text px-1.5 py-1 rounded hover:bg-ois-surface-muted` (`200-213`).
6. **Severity stripe row** `SeverityStripeRow border-l-[3px] COLOR P1 #B42318 P2/P3 #DC6803 P4 #027A48` (`SeverityStripe.tsx:11-16` + mapping `InboxListItem 12-17`) — jangan downgrade ke plain border.
7. **Unread Dot** `Dot variant info size sm pulse` (`Dot.tsx:19-42` `bg-ois-info w-1.5 h-1.5 animate-ping opacity-60` + inner) vs placeholder `w-2 h-2 bg-transparent` (`InboxListItem 56-61`).
8. **IDCell mono** `font-mono text-[12px] tabular-nums text-ois-text-muted whitespace-nowrap` (`IDCell 14-16`) per source `sourcePublicId` — jangan ubah ke sans.
9. **Type Chip** `inline-flex gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border + icon 10` style `${meta.color}18 bg ${meta.color}30 border` via `inboxItemTypeMeta` exact hex (`InboxTypeChip 16-22`, `constants 542-552`).
10. **Priority Badge** split: urgent/high `rounded-full px-2 py-0.5 text-[10px] font-bold uppercase color+bg`, normal/low `rounded px-2 py-0.5 font-semibold border transparent bg borderColor40` (`InboxPriorityBadge 14-40`, `inboxPriorityMeta 554-559` hex locked).
11. **Hover quick actions** conditional `!hovered → line-clamp-2 summary` vs `hovered flex gap-1 Archive|Pin|MailOpen text-[10px] muted hover:border` (`95-128`) — keep `stopPropagation`.
12. **Detail header** `px-6 py-4 border-b border-ois-border gap-4 badges left wrap Priority+Type + actions Button ghost sm gap-1.5 muted Archive/Pin/MailOpen 14` (`InboxItemDetail 58-95`).
13. **Title+meta** `text-base font-semibold leading-snug title + senderName text-xs muted font-medium · formatDate MMM d, yyyy HH:mm UTC text-xs subtle` (`99-107`) — locale fixed.
14. **Expiry countdown** `Clock 12 text-xs danger font-medium Expires in {h}h {m}m` only `hours<=24` else null (`InboxItemDetail 28-38,111-116`) — color danger, jangan mute.
15. **Body markdown-lite** `**bold**` + `\n→<br>` + `linkifyEntities` (`13-26`) + source `Link to=sourceUrl font-mono ois-primary ExternalLink10 + sourceTitle muted` + `hr border-ois-border my-5` (`133-144`) — keep linkify.
16. **Action buttons** `flex gap-2 Link to=navigateTo Button primary sm gap-1.5 ExternalLink12 + outline secondary` (`InboxActionButtons 19-37`) — one primary max.
17. **Empty states** `all_caught_up w-12 h-12 bg-ois-success-pale CheckCheck 22 success` vs `no_selection w-14 h-14 bg-ois-surface-muted Inbox 26` (`InboxEmptyState 10-31`) — palette exact.
18. **Drawer** `max-w-[400px] shadow-ois-modal z-101 motion spring damping25 stiffness200 bg-white backdrop bg-black/30 backdrop-blur-sm z-100` (`InboxDrawer 29-43`) — jangan widen nor change overlay blur.
19. **Drawer header+filters** `p-5 border-b shadow-sm Inbox 18 bold + Action required xs muted + X 20` + `FilterPill rounded-full px-3 py-1 text-xs font-semibold active bg-ois-primary/danger else bg-ois-surface border-ois-border` (`45-60,109-121`) — pills stay rounded-full not square badge.
20. **Drawer item stripe** `absolute left-0 w-1 bg-ois-danger if urgent else transparent` (`66-69`) + caps `text-[10px] bold uppercase tracking-wider subtle` `● URGENT danger` + id mono + title `text-sm semibold` + time `text-[11px] danger if urgent else subtle` + summary `line-clamp-2 text-sm muted` + CTA `primary label else View` + ghost `ExternalLink 14 opacity-0 group-hover:100` (`71-100`).
21. **Tokens** lock `ois-primary #1F4FD4 /hover #1A42B5 /pale #EEF2FF`, `ois-bg #F7F8FA`, `surface #FFFFFF #F1F3F7`, `border #E4E7EC /strong #D0D5DD`, `text #101828 #475467 #98A2B3`, `success #12B76A #ECFDF3 warning #F79009 #FFFAEB danger #F04438 #FEF3F2 info #0BA5EC #F0F9FF`, `sev-p1 #B42318 p2/p3 #DC6803 p4 #027A48`, `shadow ois-card 0 1px 2px… /modal 0 20px 24px…`, `radius 8/6/4/12`, `font Plus Jakarta Sans / Geist Mono` (`index.css:8-39 50-59`) — no raw hex.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `inboxService.items()` | `GET /api/v1/inbox/items` | `inbox.read` (`platform.ts:25`) | `listByKind(req.tenantId, 'inbox-item')` tenant-isolated Docs kind, returns `InboxItem[]` `platform.ts:224-226` |
| `inboxService.feed()` | `GET /api/v1/inbox` (legacy) | `inbox.read` | `listByKind('inbox-legacy')` → `LegacyInboxItem[]` (`dueAt, sourceModule`) `platform.ts:221-223`, keep for compat |
| `notificationsService.list` (upstream) | `GET /api/v1/notifications` | `notification.read` | separate from inbox items |
| Socket `inbox:item` | `tenant:{tenantId}:inbox` room | session scoped | `server/realtime.ts:52 join room(tenantId,'inbox')` + `71 emit('inbox:item', item)` → client `src/services/realtime.ts:19 on('inbox:item', InboxItem)` |

All via `src/services/platformServices.ts:90-93` `apiFetch` + `src/services/core.ts:29-61` (`useResource(() => svc.items(), [])` no limit). Future `PATCH /inbox/items/:id` guard `inbox.write` will share `ScopeViolationError 403 scope_violation` handler (`server/scope/errors.ts:9`, `server/app.ts`).

---

## Open Items

- [ ] Add `PATCH /inbox/items/:id` + `POST /inbox/items/:id/snooze` + `GET /inbox/count` + bulk `POST /inbox/batch` (`readAt/archivedAt` stamp) — spec di M7.
- [ ] Wire `socket inbox:item` auto-refresh to `setItems` merge (shared cache `Inbox` ↔ `InboxDrawer` ↔ Dashboard preview `src/routes/Dashboard.tsx` inboxItems top 3).
- [ ] Persist `search+activeTab+selectedId` to `useSearchParams ?tab=&q=&selected=` (capacity availability pattern `?service&date`).
- [ ] Add per-user server filter `recipientId/channel` (baseline `docs/pages/inbox.md §7` session-scoped) + document `UserTeam inbox-item` join.
- [ ] Empty drawer state (`InboxDrawer` renders empty div when `filteredItems 0` — add `all_caught_up` variant).
- [ ] Pagination `?page&pageSize` + `parsePagination` for inbox list (vs `listByKind` all).
- [ ] Wire `InboxDrawer` CTA `navigate(primaryAction.navigateTo ?? sourceUrl)` + deep-link handling (currently button with no handler).
- [ ] Unarchive/undo toast workflow (currently archive is one-way).
- [ ] Align `handleSelect` auto-read with server `readAt` vs optimistic only (revert on error).
- [ ] Verify line mapping after next migration (`docs/pages/inbox.md` legacy kind `inbox-legacy` vs `inbox-item` — migration squashed `0001_init_postgres` future `jsonb` per `AGENTS.md`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/inbox.md` + `src/routes/platform/Inbox.tsx:48-252` + `src/components/inbox/*` (ListItem/Detail/Empty/TypeChip/PriorityBadge/ActionButtons) + `src/components/layout/InboxDrawer.tsx:15-121` + `server/routes/platform.ts:25,220-226` + `src/types/platform.ts:5-48` + `src/lib/constants.ts:542-559` (type/priority meta) + tokens `ois-*` `#1F4FD4→#B42318` (`src/index.css:8-39`) ke template features (Intent/Current State/Primary View + ListItem/Drawer/Detail + Actions/Lifecycle + Preservation) | — |
