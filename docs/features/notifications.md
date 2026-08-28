# Notifications — Feed & Preferences

Status: **Draft**
Route: `/notifications` (feed), `/notifications/preferences` (quiet hours + per-topic channels)
Sidebar: Platform · Notifications
Source: `src/routes/platform/Notifications.tsx`, `src/routes/platform/NotificationPreferences.tsx` · `src/components/platform/QuietHoursForm.tsx`, `PreferencesTable.tsx` · `src/components/layout/NotificationDropdown.tsx`, `TopBar.tsx` · `server/routes/platform.ts:24,209-218` · `src/types/platform.ts:65-117` · `src/services/platformServices.ts:84-88` · `src/lib/constants.ts:561-577` · `src/lib/format.ts:7-9` · `src/index.css:8-33`

---

## Intent

Dua permukaan, satu kontrak: **feed historis** `/notifications` — tempat user memindai semua notifikasi yang pernah dikirim; dan **preferences** `/notifications/preferences` — tempat user mengontrol *bagaimana* dan *kapan* notifikasi dikirim (quiet hours, per-topic × per-channel, connected channels). Feed adalah view read-only dengan triase ringan (All/Unread/Mentions); preferences adalah control plane yang diterjemahkan dispatcher menjadi delivery `in_app|email|sms|slack` dengan penghormatan `respectQuietHours` dan lolos-urgent `overrideForUrgent`.

ITIL 4 Workforce Notification Management — notification bukan queue kerja (itu `Inbox` `/inbox` dengan `requiresAction`), melainkan *activity trail*. Cross-link: `TopBar` bell + `NotificationDropdown` adalah *peek* ke feed yang sama; `Settings → Notifications` adalah embedded variant dari `/notifications/preferences`.

---

## Current State (snapshot `src/routes/index.tsx:80-81,218-219`)

- `src/routes/index.tsx:80` → `import NotificationPreferences from './platform/NotificationPreferences'`
- `src/routes/index.tsx:81` → `import Notifications from './platform/Notifications'`
- `src/routes/index.tsx:218` → `{ path: 'notifications/preferences', element: <NotificationPreferences /> }`
- `src/routes/index.tsx:219` → `{ path: 'notifications', element: <Notifications /> }`
  Keduanya di bawah `AppShell` + `RequireAuth` + `RequirePasswordChange`, tanpa `Module Layout` atau nested children. Order penting: `/notifications/preferences` dideklarasikan sebelum `/notifications` agar `react-router` tidak match prefix.

- **Feed** `src/routes/platform/Notifications.tsx:1-135` — `useResource(() => notificationsService.list(), [])` → `data ?? []` (`40-41`), lokal `filter useState<'all'|'unread'|'mentions'>('all')` (`38`) + `useNavigate` (`39`), `unreadCount` derived `filter !readAt` (`43`), `filtered` memo inline `44-49`, render `max-w-2xl mx-auto px-4 py-8` dengan header → tabs → `divide-y` feed.

- **Preferences** `src/routes/platform/NotificationPreferences.tsx:1-186` — `useResource` ganda `preferences()` + `quietHours()` (`85-86`) sync ke lokal `useState` via `useEffect` (`91-92`), `SectionCard` (`41-51`) 3× (Quiet Hours / Topic Notifications / Connected Channels), `QuietHoursForm` + `PreferencesTable` + `ChannelRow` 3 (Mail/Phone/MessageSquare), toast stack `Toast` (`18-37`) auto-dismiss 3500ms + `showToast` counter `nextId` lokal + `handleSaveQuietHours`/`handleSavePreferences`.

- **Sub-components**
  - `QuietHoursForm.tsx:49-190` — props `initial: QuietHoursConfig` + `onSave`, state `config useState(initial)`, handler `toggle enabled`, `setNumber fromHour|toHour`, `toggleDay idx 0-6`, constants `TIMEZONES 6`, `DAY_LABELS Sun..Sat`, `CURRENT_DAY_OF_WEEK 6 (Saturday)` + `CURRENT_HOUR 14` untuk `isCurrentlyInQuietHours()` (logic overnight `from>=to → >=from||<to` else `>=from&&<to` + `daysOfWeek.includes(CURRENT_DAY)`), render enable toggle + dim `opacity-40 pointer-events-none` ketika disabled + timezone/selects/from/to/day pills + status pill + `Save quiet hours Button sm`.
  - `PreferencesTable.tsx:28-153` — props `preferences[] + onChange + onSave`, `CHANNELS 4` (`in_app 📱|email ✉️|sms 📱|slack 💬`), `GROUP_ORDER 6` (`INCIDENTS|SLA|APPROVALS|OPERATIONS|KNOWLEDGE & REPORTING|ON-CALL`), `grouped` derived filter `notificationTopicMeta[topic].group`, mutasi `toggleChannel` (add/remove) + `toggleQuietHours` (flip bool) via `onChange(map)`, render `overflow-x-auto rounded-xl border table thead bg-ois-surface-muted group headers + rows hover 30%` + pill `Respect #EEF2FF/#1F4FD4 vs Ignore #FEF3F2/#B42318` + `Save preferences Button sm justify-end`.
  - `NotificationDropdown.tsx:13-125` — shared peek overlay dari `TopBar` bell: `useResource list()` + same `filter` + `unreadCount` + `filteredNotifications`, `absolute right-0 w-80 sm:w-[380px] max-h-[500px] border rounded-ois-card shadow-ois-dropdown z-50` header `Mark all as read` + 3 `Tab` (`flex-1 py-2 border-b-2 active border-ois-primary`) + `divide-y` list max scroll + footer `View all notifications → /notifications`. Icon mapping sama dengan feed (`mention → info-pale|update→success-pale|system→surface-muted|info→warning-pale`).
  - `TopBar.tsx:27,31,60` — `useResource notificationsService.list()` → `unreadNotifCount filter !readAt` untuk bell badge pulse.

- **API** `server/routes/platform.ts:24` `platformRouter.use('/notifications', requirePermission('notification.read'))` → 3 `GET` di `209-218`: `GET /notifications → listByKind(tenantId,'notification')`, `GET /notifications/preferences → listByKind(tenantId,'notification-pref')`, `GET /notifications/quiet-hours → firstByKind(tenantId,'quiet-hours')` (`asyncHandler` + `listByKind/firstByKind` tenant-isolated `Documents kind`).

- **Services** `src/services/platformServices.ts:84-88` `notificationsService = { list: apiFetch('/notifications'), preferences: apiFetch('/notifications/preferences'), quietHours: apiFetch('/notifications/quiet-hours') }` via `apiFetch` (`src/services/core.ts`) + `useResource` polling mount-only.

- **Types** `src/types/platform.ts:65-117`: `NotificationItem {id, type 'info'|'update'|'mention'|'system', title, body, sourceModule?, sourceRef?, url string|null, readAt string|null, createdAt}`, `NotificationChannel 'in_app'|'email'|'sms'|'slack'`, `NotificationTopic 15` (`incident_assigned|incident_update_p1p2|incident_update_any|sla_warning|sla_breach|approval_request|mention|change_in_my_services|deployment_in_my_services|capacity_alert|report_ready|kb_review_due|dr_test_reminder|on_call_shift_start|on_call_escalation`), `NotificationPreference {userId, topic, channels[], respectQuietHours, overrideForUrgent}`, `QuietHoursConfig {userId, enabled, timezone, fromHour 0-23, toHour 0-23, daysOfWeek 0-6}`.

- **Constants** `src/lib/constants.ts:561-577` `notificationTopicMeta` 15 entries each `{label, group 6, description}` — grup: INCIDENTS 3, SLA 2, APPROVALS 2 (approval_request + mention), OPERATIONS 3, KNOWLEDGE & REPORTING 3, ON-CALL 2.

- **Tokens** `src/index.css:7-33` `@theme --color-ois-*`: primary `#1F4FD4`/hover `#1A42B5`/pale `#EEF2FF`, bg `#F7F8FA`, surface `#FFFFFF`/`#F1F3F7`, border `#E4E7EC`/strong `#D0D5DD`, text `#101828`/`#475467`/`#98A2B3`, semantic success `#12B76A`/`#ECFDF3` warning `#F79009`/`#FFFAEB` danger `#F04438`/`#FEF3F2` info `#0BA5EC`/`#F0F9FF`, radius `ois-card 8px ois-btn 6px ois-badge 4px ois-modal 12px`, font `Plus Jakarta Sans + Geist Mono`.

**Working:**
- Feed render tanpa error: header `h1 text-xl font-bold tracking-tight ois-text` + `unreadCount >0 → p text-sm ois-text-muted N unread` + `button Mark all as read text-xs semibold primary hover:underline` (visual only, no handler) `54-64`.
- Tabs `flex border-b border-ois-border mb-4` 3 buttons `px-4 py-2.5 text-sm font-medium border-b-2 active border-ois-primary text-ois-primary else transparent muted hover:text` + inject `span ml-1.5 text-xs font-bold primary (N)` kalau `id unread && unread>0` `67-85`.
- Feed container `divide-y divide-ois-border border rounded-ois-card overflow-hidden bg-white` per row `flex gap-4 p-4 relative` `cursor-pointer hover:bg-ois-surface-muted if url else cursor-default` + unread left stripe `absolute left-0 top-0 bottom-0 w-1 bg-ois-primary` + bg `bg-ois-primary-pale/20` ketika `!readAt` `95-107`.
- `NotificationIcon` `w-9 h-9 rounded-full shrink-0` `mention bg-ois-info-pale text-ois-info MessageSquare14 | update bg-ois-success-pale text-ois-success Check14 | system bg-ois-surface-muted text-ois-text-subtle Settings14 | info bg-ois-warning-pale text-ois-warning Info14` `17-35`.
- Row text: title `text-sm font-semibold leading-tight !readAt? text-ois-text : muted` + dot `w-1.5 h-1.5 rounded-full bg-ois-primary ml-2` if unread + time `text-[11px] text-ois-text-subtle whitespace-nowrap formatRelative(createdAt)` via `src/lib/format.ts:7-9` (`formatDistanceToNow addSuffix`) + body `text-sm text-ois-text-muted leading-snug` + sourceRef `text-[10px] font-mono text-ois-text-subtle mt-1 block` if present `109-126`.
- Navigation: click row with `url` → `navigate(url)` (no explicit mark-read yet in handler, though spec says auto mark-read).
- Empty feed: `flex-col items-center py-20 text-ois-text-muted Bell 36 opacity-20 + No notifications text-sm` `88-92`.
- Preferences page `min-h-screen bg-ois-bg` `max-w-3xl mx-auto px-6 py-8 space-y-6` back Link `to=/settings inline-flex gap-1.5 text-sm muted hover:primary ChevronLeft14` + header `h1 text-2xl font-bold tracking-tight + p text-sm muted Control how…` `124-138`.
- SectionCard `rounded-2xl border border-ois-border bg-ois-surface p-6 space-y-5` `h2 text-base font-semibold + p text-sm muted mt-0.5` `41-51`.
- QuietHours privacy — form enforces hour 0-23 via `Array.from length24 formatHour 00:00…23:00` selects `block rounded-lg border bg-ois-surface px-3 py-2 text-sm focus:ring-2 ring-primary/40` + day pills `h-9 w-11 rounded-lg text-xs font-semibold border active bg-ois-primary text-white else bg-surface muted` + status inline `rounded-full px-3 py-1 text-xs font-medium gap-2` `inQuiet → bg-[#FFFAEB] text-[#DC6803] dot #F79009 else bg-[#F1F3F7] text-[#475467] dot #98A2B3` `162-179` + save `Button sm`.
- PreferencesTable grouping benar → header `bg-ois-surface-muted/50 py-2 pl-4 text-[11px] font-bold uppercase tracking-widest group` + topic label `font-medium + description 11px muted` + 4 channel checkboxes `h-4 w-4 rounded border-ois-border` + quiet pill Respect/Ignore.
- ChannelRow `flex justify-between py-3 border-b last:border-0` avatar `h-8 w-8 rounded-lg bg-ois-surface-muted Icon15 muted` + label `text-xs muted font-medium uppercase tracking-wide Email|SMS|Slack` + value `text-sm font-medium ois-text` + `Button outline sm Change` (stub) `55-80`.
- Toast `fixed bottom-6 right-6 z-50 gap-3 rounded-xl bg-ois-surface border shadow-lg px-4 py-3 text-sm` green dot `h-2 w-2 rounded-full bg-[#12B76A]` `24-37` auto 3500ms via `useEffect setTimeout` `18-22`.
- RBAC documents per-tenant isolation — `listByKind(req.tenantId, ...)` isolates; no per-user filter yet (returns all tenant rows).

**Stub / Partial:**
- `Mark all as read` button di feed (`61-63`) dan `NotificationDropdown` (`34-36`) tidak punya handler — tidak ada `PATCH /notifications/:id/read` maupun bulk `POST /notifications/mark-all-read`; klik no-op (spec `docs/pages/notifications.md §2 Actions` claim ada — belum wiring).
- `handleSaveQuietHours` (`105-108`) + `handleSavePreferences` (`110-112`) hanya `setState + showToast` — tidak ada `PUT /notifications/quiet-hours` nor `PUT /notifications/preferences`; refresh hilang. Same seperti `Settings → NotificationsPanel` (`Settings.tsx:150-229`) — `Settings` punya `userChannelsService.upsert` working tetapi prefs/quiet-hours juga optimistic-only.
- `nextId` inside component `NotificationPreferences.tsx:94` `let nextId = 0` bukan `useRef` — reset per-render, toast `id` collision kalau re-render; `dismissToast` filter by id bisa hapus salah.
- `QuietHoursForm` time source hardcoded `CURRENT_DAY_OF_WEEK 6 + CURRENT_HOUR 14` (`27-28`) bukan `new Date()` — "Currently in quiet hours" demo-only, tidak pakai `Intl` timezone.
- `TIMEZONES` di `QuietHoursForm` 6 (`America/New_York|Los Angeles|London|Berlin|Singapore|UTC`) beda dengan `ProfileForm` 8 (+ Asia/Jakarta, Asia/Tokyo) — inconsistency; `NotificationPreferences` ChannelRow values hardcoded `sarah.chen@acmecorp.io / +1 (415)… / @sarah.chen · #ois-alerts` bukan `userChannelsService.list()` real.
- `Change` button di `ChannelRow` (`75-77`) tidak wire ke modal `userChannelsService.upsert` (Settings panel sudah `onBlur` upsert, preferences belum).
- Notification `url` navigation tidak stamp readAt — spec (§2) "click → mark read + navigate" tapi handler `onClick={() => n.url && navigate(n.url)}` tanpa `POST /notifications/:id/read`; read state tidak berubah sampai refresh.
- Server `platformRouter` hanya 3 `GET`; tidak ada `PATCH /notifications/:id/read`, `PATCH /notifications/preferences`, `PATCH /notifications/quiet-hours`, `POST /notifications/mark-all-read` — semua spec `docs/pages/notifications.md §10` (6 endpoints) minimal 3 `Mutation` hilang.
- Preference `overrideForUrgent` field ada di type (`platform.ts:106`) dan spec (`docs/pages/notifications.md §3`) tapi tidak ada UI checkbox di `PreferencesTable` (hanya `respectQuietHours` pill); Slack/Teams connected vs `NotificationChannelRow kind email|sms|slack` mismatch (`slack` ada, `teams` hilplant).
- `docs/pages/notifications.md §13 Realtime/Jobs` dispatcher + channel worker + TTL cleanup semuanya belum wiring — `server/realtime.ts` ada `inbox:item` tapi tidak ada `notification:item` socket.
- Telemetry: no pagination `?page&pageSize`/`parsePagination` — `GET /notifications listByKind` load all tenant rows tanpa limit (risk ketika tenant >1k notifications).

**Missing:**
- Mutation endpoints formal `PATCH /notifications/:id/read`, `POST /notifications/preferences` batch, `POST /notifications/quiet-hours` dengan `Zod quietHoursSchema (timezone string, fromHour 0-23, toHour 0-23, days 0-6, enabled bool)` + per-user scoping `userId` key (saat ini `firstByKind quiet-hours` tenant-singleton, bukan per-user).
- `Mark all as read` bulk + `Mark read` per-item optimistic → server stamp `readAt = now` (mirip `inboxService` future `PATCH /inbox/items/:id`).
- `Channel address Change` flow: modal `PUT /users/me/channels/:kind {address}` sudah ada (`platform.ts:170-193`) untuk email/sms/slack — NotificationPreferences hardcoded values harus diganti `userChannelsService.list()` + edit + verify; `Teams` channel belum ada di `VALID_CHANNEL_KINDS`.
- `overrideForUrgent` checkbox per-topic + grouping/digest `daily summary` + `Snooze` + `Per-resource subscribe` (`docs/pages/notifications.md §12 Gaps` 5 item).
- Slack OAuth workspace flow, SMS provider per-tenant (`Twilio` vs generic), `App selector / scope switcher` topic filter per service.
- Pagination + URL persist `?filter=all|unread|mentions` via `useSearchParams` (seperti `capacity ?search&severity`) — sekarang `filter` local state hilang on refresh.
- Realtime `socket notification:item` → incremental prepend + unread badge atomic vs `TopBar`/`Dropdown`/`Feed` three separate `useResource` fetches (no shared cache / SWR dedup — triple fetch per page load).

---

## Primary View

### Feed `/notifications` — `Notifications.tsx:52-131`

Layout `max-w-2xl mx-auto px-4 py-8` (centered, unlike `Inbox` `w-80 + flex-1` split — notification feed adalah single-column timeline, bukan 2-panel):

```
Header  flex justify-between mb-6
  left  h1 Notifications 20px bold tracking-tight + N unread 14px muted mt-0.5
  right Mark all as read 12px semibold primary hover:underline

Tabs    flex border-b border-ois-border mb-4  3 buttons px-4 py-2.5 text-sm medium border-b-2 active primary else muted
        All | Unread (N) | Mentions

Feed    empty? → Bell 36 opacity-20 + No notifications py-20 center muted
        else  border rounded-ois-card overflow-hidden bg-white divide-y
              per row flex gap-4 p-4 relative
                stripe absolute left-0 w-1 bg-ois-primary if unread
                icon w-9 h-9 rounded-full 14px
                body flex-1 min-w-0
                  line1 flex justify-between gap-2
                    title 14px semibold unread→text else muted + dot w-1.5 h-1.5 bg-primary ml-2 mb-0.5 if unread
                    time 11px subtle whitespace-nowrap formatRelative
                  body 14px muted leading-snug  + sourceRef 10px mono subtle mt-1 if present
```

`FILTERS` `11-15` `{all All, unread Unread, mentions Mentions}` — client filter `43-49`: `unread: !readAt`, `mentions: type==='mention'`, else true. `unreadCount` `43` computed dari `data` penuh (bukan `filtered`).

### Preferences `/notifications/preferences` — `NotificationPreferences.tsx:114-185`

Layout `min-h-screen bg-ois-bg` + `max-w-3xl mx-auto px-6 py-8 space-y-6` scroll page (bukan `-m-6 flex flex-col` seperti `Settings` hub — standalone page with own back + header):

```
Toast stack               fixed bottom-6 right-6 z-50 per toast rounded-xl border shadow-lg px-4 py-3 gap-3 dot green + message + ✕
Back                      Link to=/settings ChevronLeft14 + Settings 14px muted hover:primary
Header                    h1 2xl bold tracking-tight Notification Preferences + p 14px muted Control how…
SectionCard Quiet Hours   rounded-2xl border bg-ois-surface p-6 space-y-5  h2 base semibold + p sm muted Suppress…
                          ↳ QuietHoursForm (see Detail View)
SectionCard Topic Notif   h2 + p Choose… → PreferencesTable
SectionCard Connected     h2 + p Where OIS… → ChannelRow ×3 (Mail/Phone/MessageSquare) + Change outline sm
```

`SectionCard` `41-51` pattern: `rounded-2xl border-ois-border bg-ois-surface p-6 space-y-5` header `text-base font-semibold` + `text-sm muted 0.5`. Beda dari `Settings SectionBlock` `11px tracking-widest uppercase` — preferences card lebih rounded (`2xl` vs `ois-card 8px`).

---

## Detail View — Fragments

### NotificationIcon (`Notifications.tsx:17-35`)

```ts
mention → bg-ois-info-pale #F0F9FF text-ois-info #0BA5EC MessageSquare14
update  → bg-ois-success-pale #ECFDF3 text-ois-success #12B76A Check14
system  → bg-ois-surface-muted #F1F3F7 text-ois-text-subtle #98A2B3 Settings14
info    → bg-ois-warning-pale #FFFAEB text-ois-warning #F79009 Info14
```

`w-9 h-9 rounded-full flex center shrink-0` wrapper via `cn`. Dropdown variant `w-8 h-8` same mapping (`NotificationDropdown.tsx:65-76`).

### Inbox vs Notifications — critical contract (from `docs/superpowers/plans/2026-05-12-inbox-notifications.md`)

- `Notifications` = activity feed (informational, no action required), 4 types only.
- `Inbox` = action queue (9 types `inboxItemTypeMeta`, requiresAction, expiry, 2-panel triage).
- Bell `NotificationDropdown` footer now `View all notifications → /notifications` (fixed from legacy inbox link). `UserMenu → Preferences` still routes `→ /notifications/preferences`.

### QuietHoursForm (`QuietHoursForm.tsx:49-190`)

- Enable `checkbox h-4 w-4 rounded border-ois-border text-ois-primary` + `text-sm font-medium Enable quiet hours` (`74-82`).
- When disabled: wrapper `opacity-40 pointer-events-none`.
- Timezone `select w-full max-w-xs rounded-lg border bg-ois-surface px-3 py-2 text-sm focus:ring-2 ring-primary/40` 6 options (`90-99`).
- From/To hour `Array 24 formatHour 00:00 → 23:00` selects `rounded-lg border bg-ois-surface px-3 py-2 text-sm` `102-132`.
- Days `flex gap-2 flex-wrap Sun..Sat 0-6` pills `h-9 w-11 rounded-lg text-xs font-semibold border active bg-ois-primary text-white else bg-surface muted border hover:border-primary/50` `139-158`.
- Status when enabled: `inline-flex gap-2 rounded-full px-3 py-1 text-xs font-medium Currently in quiet hours #FFFAEB/#DC6803 dot #F79009 vs Not in #F1F3F7/#475467 dot #98A2B3` logic via `isCurrentlyInQuietHours` overnight handling `162-179`.
- Save `Button size sm Save quiet hours` → `onSave(config)` lift to page then toast.

### PreferencesTable (`PreferencesTable.tsx:28-153`)

- Wrapper `space-y-4` + `overflow-x-auto rounded-xl border` `table w-full text-sm`.
- Thead `border-b bg-ois-surface-muted th py-3 text-xs font-semibold muted uppercase tracking-wide` — col `Topic w-56` + `CHANNELS 4 w-20 (icon col)` + `Quiet hours w-28`.
- Body grouped `GROUP_ORDER 6` header `bg-ois-surface-muted/50 colspan6 py-2 pl-4 text-[11px] font-bold muted uppercase tracking-widest INCIDENTS|…` per group only if `filter len>0`.
- Per row `hover:bg-ois-surface-muted/30` td Topic `pl-4 font-medium label + description 11px muted` + per-channel `text-center input checkbox h-4 w-4 rounded border-ois-border` checked `pref.channels.includes(ch)` + Quiet pill `rounded-full px-2.5 py-0.5 text-[11px] font-semibold Respect #EEF2FF/#1F4FD4 else Ignore #FEF3F2/#B42318` toggle via `onClick toggleQuietHours`.
- Footer `flex justify-end pt-1 Save preferences Button sm` → `handleSavePreferences` toast 3500ms.

### ChannelRow (`NotificationPreferences.tsx:55-80`)

`flex justify-between py-3 border-b last:border-0 -mx-1` left `flex gap-3 h-8 w-8 rounded-lg bg-ois-surface-muted muted` Icon `Mail|Phone|MessageSquare 15` + col `label text-xs font-medium uppercase tracking-wide muted + value text-sm font-medium ois-text` + right `Button outline sm Change` (currently no onClick). Hardcoded demo values vs `userChannelsService.list()` live.

### TopBar & Dropdown integration

`TopBar.tsx:27` `notificationsService.list()` → `unreadNotifCount` untuk bell badge + `NotificationDropdown.tsx:25` same untuk tab Unread `(N)`; `UserMenu.tsx:46` `Preferences → /notifications/preferences`. Bell click toggles `Dropdown absolute right-0 mt-2 w-80 sm:w-[380px] bg-white border rounded-ois-card shadow-ois-dropdown z-50 max-h-[500px]` vs feed page `max-w-2xl mx-auto` — same filter set kept in sync manually (no shared hook).

---

## Actions

| Action | Trigger | Permission | State required | Notes |
|--------|---------|------------|----------------|-------|
| View feed | `GET /notifications` | `notification.read` (`platformRouter.use` `platform.ts:24`) | authed + tenant-isolated | `src/routes/index.tsx:219` `Notifications` |
| Filter All | Tab `All` | `notification.read` | — | `filtered true` default `Notifications.tsx:38,45` |
| Filter Unread | Tab `Unread` | `notification.read` | — | `!readAt` + badge `span (N)` if `unread>0` `81-82` |
| Filter Mentions | Tab `Mentions` | `notification.read` | — | `type==='mention'` `47` |
| Mark all as read | Button `Mark all as read text-xs semibold primary` | — (future `notification.write`) | `unread>0` | **Stub** — no handler in `Notifications.tsx:61-63` nor `NotificationDropdown:34-36` |
| Mark single read | Click row `n.url → navigate(n.url)` (spec) + quick read | — | `readAt==null && url!=null` | Handler only navigates; does not PATCH read (gap) `98-99` |
| Navigate source | Click row with `url` | depends on target module (`incident.read` etc.) | `url!=null` | `cursor-pointer hover:bg-ois-surface-muted` `101`, else `cursor-default` |
| View preferences | `GET /notifications/preferences` | `notification.read` | — | `src/routes/index.tsx:218` page-level back `→ /settings` |
| Toggle quiet hours enabled | Checkbox `Enable quiet hours` | own prefs (`notification.read` read, future write) | — | `QuietHoursForm toggle enabled` `54-56` → `Save` |
| Change timezone | Select `TIMEZONES 6` | own prefs | quiet enabled | `Asia/Singapore` default vs `Profile 8` inconsistency |
| Set window From/To | Selects `00:00-23:00` 24 | own prefs | quiet enabled | `formatHour pad 2` `30-32` |
| Toggle day | Pill `S M T W T F S` `h-9 w-11` | own prefs | quiet enabled | `toggleDay add/remove sorted` `62-69` |
| Save quiet hours | `Button sm Save quiet hours` | own prefs | valid config | `onSave(config) → showToast 3500ms` optimistic only |
| Toggle channel `in_app|email|sms|slack` | Checkbox per topic per channel | own prefs | — | `toggleChannel add/remove` `37-49` `PreferencesTable` |
| Toggle Respect/Ignore | Pill `Respect #EEF2FF vs Ignore #FEF3F2` | own prefs | — | `toggleQuietHours flip` `51-57` `11px font-semibold rounded-full px-2.5` |
| Save topic prefs | `Button sm Save preferences` | own prefs | — | `onSave → toast 3500ms` no PUT |
| Edit connected channel | Input inline (`Settings`) or `Change` (`Preferences`) | own (`PUT /users/me/channels/:kind`) | — | Settings does `onBlur upsert(kind,address)` working; Preferences `Change` stub with hardcoded values `sarah.chen@acmecorp.io…` |
| Open preferences from TopBar | `UserMenu Preferences` `Settings12 → /notifications/preferences` | `notification.read` / session | — | `UserMenu.tsx:46` |
| Open full feed from bell | `View all notifications → /notifications` | `notification.read` | — | `NotificationDropdown.tsx:102-107` footer |

No bulk select, no pagination, no per-item actions beyond click.

---

## Filters / Sort / Search

- **Tabs filter** `Notifications.tsx:11-15,38,44-49` 3 pills `All|Unread|Mentions` — local `useState<FilterId>` default `all`. Filter predicate `if unread → !readAt; if mentions → type==='mention'`. No `System|Info|Update` type filter, no date range (unlike `inbox` 4 tabs + search).
- **Counts** `unreadCount = filter !readAt` shown `p N unread text-sm muted` header `58-59` + tab badge `(N)` `81-82` (`ml-1.5 text-xs font-bold primary`).
- **Sort** implicit API order: `listByKind(tenantId,'notification')` returns Documents `kind` order (creation/last-write) — no `createdAt desc` explicit sort in component; `filtered` preserves input order. PreferencesTable `GROUP_ORDER 6` grouping is the only stable sort; rows inside group follow input order (seed order).
- **Search** none — feed has no search input (vs `Inbox` search `title/summary/senderName/sourcePublicId includes lower` or `incidents` debounced `title|publicId|tags`). Future `search?q=` not yet.
- **PreferencesTable** grouping is the filter: `GROUP_ORDER.map group → prefs.filter(meta.group===group)` `30-35`; no search nor channel column filter.
- **URL persist** none — both `filter` and preferences state are local `useState` lost on refresh (unlike `cmdb ?view=graph` or `capacity ?search&severity`); deep-link `?filter=mentions` not implemented.
- **Pagination** none — `GET /notifications` loads all tenant rows; dropdown & feed share two independent `useResource` calls (`Notifications.tsx:40` + `NotificationDropdown:16` + `TopBar:27`) → triple fetch identical payload per page load (no SWR/cache).

---

## State Lifecycle

```
NotificationItem (per-user activity trail)
  created → {readAt null, unread dot + stripe + primary-pale bg}
    ├─ read  → click row with url → (spec) mark read + navigate → {readAt now, muted title, no stripe/dot, white bg}
    └─ unread → filter Unread isolates; Mentions filters type==='mention' orthogonal
  No status enum — only read/unread boolean via readAt; no archived/snoozed (Inbox has archived).
  Mutation endpoints envisioned (spec docs/pages/notifications.md §10): PATCH /notifications/:id/read (session-scoped)
  Bulk Mark-all-read envisioned: POST /notifications/mark-all-read
  TTL cleanup (spec §11): archive after retention period (job not wired)

QuietHoursConfig (per-user preference — currently tenant-singleton gap)
  disabled ↔ enabled (checkbox toggle)
    when enabled: timezone (UTC|America/New_York…|Asia/Singapore 6) + fromHour 0-23 + toHour 0-23 + daysOfWeek 0-6[]
    computed isCurrentlyInQuietHours: disabled→false; else if !days.includes(today)→false; else if from<to → CURRENT_HOUR in [from,to); else from>to (overnight) → >=from||<to
  No lifecycle beyond saved/not-saved; currently local-only (no PUT stamp), preview dot shows inQuiet vs not in demonow (hardcoded Sat 14h).

NotificationPreference (per-topic)
  topic ∈ 15 NotificationTopic (grouped 6 via notificationTopicMeta) + channels[] subset of 4 in_app|email|sms|slack + respectQuietHours bool + overrideForUrgent bool (type-only, no UI)
  Toggle flows: channel checkbox add/remove vs Respect/Ignore pill flip bool; group header is static.
  Save is batch `Save preferences` toast-only; server batch PUT not yet.
```

`overrideForUrgent` is orthogonal — when `true`, quiet hours ignored for urgent-marked notifications (e.g., `on_call_escalation`, `p1p2`). Not yet surfaced — Plan: add second pill column `Urgent override` next to Quiet hours.

---

## Permissions (action-level)

Global `requireAuth` (`server/app.ts:126`) gates `server/routes/platform.ts` via `withScopedDb` → `req.tenantId`/`req.permissions` always set; tenant isolation via `listByKind(req.tenantId, ...)` (`Documents kind+tenant`).

| Action | Permission gate | Who | Notes |
|--------|----------------|-----|-------|
| `GET /notifications` (feed) | `notification.read` — `platformRouter.use('/notifications', requirePermission('notification.read'))` (`platform.ts:24`) | All authenticated with `notification.read` (via `prisma/seedRbac.ts:50` catalog `notification.read Read notifications and preferences`) | Tenant-scoped `listByKind('notification')`, no per-user filter yet (returns all tenant rows — session-scoped filtering planned §12 baseline). Violation → 403 `scope_violation` via `server/scope/errors.ts:9` (`server/app.ts` handler) |
| `GET /notifications/preferences` + `GET /notifications/quiet-hours` | same `notification.read` prefix guard | same | `listByKind('notification-pref')` all rows vs `firstByKind('quiet-hours')` single (tenant singleton gap — should be per-user `userId` key) |
| Mutation read-all / `PATCH :id/read` / `PATCH preferences` / `PATCH quiet-hours` (spec planned) | `notification.read` (read) → future `notification.write` | — | Router not yet has handlers; spec `docs/pages/notifications.md §10` lists `PATCH /notifications/:id/read`, `PATCH /preferences`, `PATCH /quiet-hours` session-scoped (stubs). |
| `PUT /users/me/channels/:kind` (connected channels) | session auth `VALID_CHANNEL_KINDS email|sms|slack` (`platform.ts:112-113,170-193`) | Own user only (`where userId==session.userId, kind`) | Already protected via `platformRouter.use('/users', requirePermission('user.read'))`; Settings does live `userChannelsService.upsert` |
| Manage / admin | — | No RBAC khusus — `docs/pages/notifications.md §6` "Tidak ada RBAC khusus — setiap authenticated user manage preference & feed sendiri." | Not admin module (`/admin/*` separate) |

UI pattern: no `Can module=` wrapper — pages accessible if authed + `notification.read`. `Can` example analog `on-call` `Can platform manage` hides `Request Override`; notifications does not gate (correct).

---

## Empty / Loading / Error

- **Empty feed** `Notifications.tsx:88-92` `filtered.length===0 → flex-col items-center py-20 text-ois-text-muted Bell 36 opacity-20 + No notifications text-sm` (same for every filter including Mentions — not contextual "No mentions" vs "No unread").
- **Empty dropdown** `NotificationDropdown.tsx:93-97` `filteredNotifications.length 0 → p-8 text-center Bell 32 opacity-20 + No notifications found` (skeleton vs full-page parity —.dropdown shows empty immediately, no "No unread" variant).
- **Empty PreferencesTable** `preferences []` before fetch → `GROUP_ORDER map filter len 0` → `grouped []` → table `tbody` renders only header row (no empty pill — gap vs inbox `all_caught_up`). Should show `No preferences — save defaults` skeleton.
- **Empty ChannelRow** when `userChannelsService.list()` returns `[]` → Preferences shows hardcoded demo addresses (mask gap). Settings variant shows `Not set` placeholder + input `placeholder Not set` correctly (`Settings.tsx:164-229`).
- **Empty quietHours** `quietHours == null` guard `NotificationPreferences.tsx:145 {quietHours && <QuietHoursForm>}` shows empty `SectionCard` shell with no form until fetch resolves (no shimmer unlike `cmdb`).
- **Loading** `useResource` returns `data undefined` → `data ?? []` → 0-state above (no skeleton). Feed & dropdown both fetch `list()` independently → triple waterfall per app load with TopBar. No `isLoading` shimmer `animate-pulse` (gap vs `on-call` hero skeleton TODO).
- **Error** no banner — fetch failure → silent `[]` empty (should show `bg-ois-danger-pale text-danger Retry` like `incidents` via `useResource error` — gap vs `src/services/core.ts` error state).
- **Toast queue** `toasts.map` renders overlapping absolute `bottom-6 right-6 z-50` with slide-in via `animate-in slide-in-from-bottom-4`; multiple toasts stack but `nextId` local reset risk causes duplicate keys.

---

## Phase 2 Deferred

- **Mutation endpoints** `PATCH /notifications/:id/read` per-item + `POST /notifications/mark-all-read` bulk + `PUT /notifications/preferences` batch (channels + respectQuietHours + overrideForUrgent) + `PUT /notifications/quiet-hours` → rationale: currently `Mark all as read` no-op, prefs only `showToast`, 3 spec mutations missing (`docs/pages/notifications.md §10` 6 endpoints → 3 GET only).
- **Per-user scoping fix** `quiet-hours` kind `firstByKind` tenant singleton → per `userId` key (like `notification-pref` should be `where userId==session.userId`); `NotificationItem list` filter by `target userId`; channel `VALID_CHANNEL_KINDS` add `teams`/`webhook`/`in_app` formalization — rationale: `server/routes/platform.ts:162-218` gap.
- **Override-for-urgent UI** second pill column in `PreferencesTable` alongside Respect/Ignore → checkbox `Override for urgent` (`NotificationPreference.overrideForUrgent`) per topic especially `on_call_escalation|p1p2|sla_breach` — rationale: type exists but UI not exposed (baseline §3 notes).
- **Connected Channels live** replace hardcoded `sarah.chen@acmecorp.io / +1 (415)… / @sarah.chen` with `userChannelsService.list()` + inline edit modal (reuse `Settings` `onBlur upsert` pattern) + `verified boolean` badge + `Change` wiring — rationale: Preferences `Change` stub (`75-77`), Settings already does `onBlur` verification gap.
- **Group/digest, Snooze, Per-resource subscribe** (`docs/pages/notifications.md §12` 3 gaps) — daily digest aggregate + `Snooze` until + `Subscribe to incident PRB-XXX` watch toggle — rationale: spec §12 explicitly parked; `Inbox` already has `isPinned requiresAction` analog but notification trail missing.
- **Slack OAuth + SMS tenant provider** Slack workspace install flow (`/integrations` vs direct), Teams, SMS provider configurable per tenant (Twilio) — rationale: baseline §12 `Slack OAuth belum end-to-end. SMS provider configurable per tenant belum.` 3 gaps.
- **Notification dispatcher + channel worker + TTL** server jobs: `event → push targetUsers → respect preference+quietHours → format email/SMS/Slack template → deliver via provider` + `archive after retention` — rationale: `docs/pages/notifications.md §11 Realtime/Jobs` describes but `server/jobs/` & `realtime.ts` only has `inbox:item`.
- **Pagination + URL persist + shared cache** `GET /notifications?filter=all|unread|mentions&type=&page&pageSize` + `useSearchParams ?filter=mentions` persist + dedup triple `useResource` via single hook `useNotifications()` (SWR) for Feed+Dropdown+TopBar — rationale: currently load-all + local filter + no URL sharing + 3× fetch.
- **Realtime** socket `notification:item` on `tenant:{tenantId}` → prepend feed + increment `unreadCount` badge + mark-read ACK (parity with `inbox:item` `server/realtime.ts:52,71`) — rationale: `docs/audits/realtime-coverage.md §109-112` flags notifications as *NO realtime — fetch once until refresh*.
- **Validation hardening** `QuietHoursForm` `fromHour|toHour 0-23`, `daysOfWeek 0-6` Zod + overlap vs `on-call` schedule, `from===to` guard, required preferences map full 15 topics — rationale: modal currently no inline error, `nextId` counter bug, hardcoded clock.
- **Search & sort** feed `Search title|body|sourceRef includes lower` + sort `createdAt desc|unread first` toggle (like `Inbox sortItems pinned→unread→priority→receivedAt`) + type filter pills `info|update|system` — rationale: feed currently only All/Unread/Mentions.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/platform/Notifications.tsx`, `NotificationPreferences.tsx` + `src/components/platform/QuietHoursForm.tsx`, `PreferencesTable.tsx` + `src/components/layout/NotificationDropdown.tsx`, `TopBar.tsx` + `src/index.css`):

1. **Feed chrome** `max-w-2xl mx-auto px-4 py-8` `h1 text-xl font-bold tracking-tight ois-text` + `p text-sm muted N unread` + `button text-xs font-semibold primary hover:underline Mark all as read` (`Notifications.tsx:52-63`) — jangan ganti ke `w-80 split` seperti Inbox.
2. **Filter tabs** `flex border-b border-ois-border mb-4` buttons `px-4 py-2.5 text-sm font-medium border-b-2 active border-ois-primary text-ois-primary else transparent muted hover:text` + inline `span ml-1.5 text-xs font-bold primary (N)` for Unread (`68-85`); Dropdown tabs `flex-1 py-2 text-xs font-semibold border-b-2 active border-primary bg-primary-pale/10 else hover:bg-surface-muted` (`NotificationDropdown.tsx:113-124`).
3. **Feed card** `divide-y divide-ois-border border border-ois-border rounded-ois-card overflow-hidden bg-white` (`Notifications.tsx:94`) jangan ganti radius ke `2xl`; sebagai pembanding `InboxDrawer` `max-w-[400px] shadow-ois-modal`.
4. **Row striped unread** `relative flex gap-4 p-4 cursor-pointer hover:bg-ois-surface-muted` + `absolute left-0 w-1 bg-ois-primary` + `bg-ois-primary-pale/20` if unread (`98-107`) vs dropdown `bg-primary-pale/30` (`58`). Jangan hilangkan stripe.
5. **NotificationIcon** circle `w-9 h-9 (dropdown 8) rounded-full flex center shrink-0` `mention bg-ois-info-pale #F0F9FF text-ois-info #0BA5EC` `update bg-ois-success-pale #ECFDF3 #12B76A` `system bg-ois-surface-muted #F1F3F7 #98A2B3` `info bg-ois-warning-pale #FFFAEB #F79009` icons `MessageSquare|Check|Settings|Info 14` (`17-35`, `65-76` dropdown).
6. **Title+dot+time** `span text-sm font-semibold leading-tight !readAt? text else muted` + `inline-block w-1.5 h-1.5 rounded-full bg-ois-primary ml-2 mb-0.5 if unread` + `span text-[11px] text-ois-text-subtle whitespace-nowrap formatRelative` via `formatDistanceToNow addSuffix` (`src/lib/format.ts:7-9`) (`110-120`). Jangan ganti dot ke Badge.
7. **Body + sourceRef** `p text-sm text-ois-text-muted leading-snug` + `span text-[10px] font-mono text-ois-text-subtle mt-1 block sourceRef` if present (`122-125`) — mono untuk sourceRef ID tetap.
8. **Empty** `py-20 col center Bell 36 opacity-20 text-sm muted No notifications` (`88-92`) dan dropdown `p-8 Bell 32 opacity-20 No notifications found` (`94-97`) — jangan ganti icon ke Info.
9. **Preferences page shell** `min-h-screen bg-ois-bg max-w-3xl mx-auto px-6 py-8 space-y-6` back `Link to=/settings inline-flex gap-1.5 text-sm muted hover:primary ChevronLeft14 + Settings` + header `h1 text-2xl font-bold tracking-tight + p text-sm muted Control how…` (`114-138`).
10. **SectionCard** `rounded-2xl border border-ois-border bg-ois-surface p-6 space-y-5 h2 text-base font-semibold + p text-sm muted` (`41-51`) — tetap `rounded-2xl` untuk preferences (vs `Settings SectionCard rounded-ois-card` di `src/index.css:55 8px`), jangan unify sembarang.
11. **ChannelRow** `flex justify-between py-3 border-b last:border-0 -mx-1` avatar `h-8 w-8 rounded-lg bg-ois-surface-muted Icon15 muted` + label `text-xs font-medium uppercase tracking-wide muted Email|SMS|Slack` + value `text-sm font-medium` + `Button outline sm Change` (`55-80`).
12. **QuietHoursForm** days pills `h-9 w-11 rounded-lg text-xs font-semibold border active bg-ois-primary text-white border-ois-primary else bg-surface text-muted border hover:border-primary/50` (`147-151`) + dim `opacity-40 pointer-events-none` saat disabled (`84`) + status pill `rounded-full px-3 py-1 text-xs font-medium dot w-2 h-2 Currently in quiet hours #FFFAEB dot #F79009 vs Not in #F1F3F7 dot #98A2B3` (`162-179`).
13. **PreferencesTable** `overflow-x-auto rounded-xl border thead border-b bg-ois-surface-muted th py-3 text-xs font-semibold muted uppercase tracking-wide Topic w-56 Channels w-20 Quiet w-28` + group header `bg-ois-surface-muted/50 colspan6 py-2 pl-4 text-[11px] font-bold tracking-widest INCIDENTS|…` + row `hover:bg-ois-surface-muted/30` + Respect/Ignore pill `rounded-full px-2.5 py-0.5 text-[11px] font-semibold Respect #EEF2FF/#1F4FD4 vs Ignore #FEF3F2/#B42318` (`PreferencesTable.tsx:61-135`).
14. **Toast** `fixed bottom-6 right-6 z-50 gap-3 rounded-xl bg-ois-surface border shadow-lg px-4 py-3 text-sm animate-in slide-in-from-bottom-4 green dot h-2 w-2 bg-[#12B76A] + ✕ ml-1 muted hover:text` (`NotificationPreferences.tsx:24-37`) 3500ms auto-dismiss.
15. **Dropdown position** `absolute right-0 mt-2 w-80 sm:w-[380px] max-h-[500px] bg-white border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 flex flex-col onMouseLeave onClose` + header `p-4 border-b bg-ois-surface flex justify-between` + `divide-y` scroll `flex-1 overflow-y-auto` + footer `p-3 bg-ois-surface-muted text-center border-t` `View all notifications text-xs font-bold primary hover:underline navigate /notifications onClose` (`28-109`).
16. **Tokens ois-*** strictly `ois-bg #F7F8FA surface #FFFFFF muted #F1F3F7 border #E4E7EC strong #D0D5DD primary #1F4FD4 pale #EEF2FF hover #1A42B5 text #101828 muted #475467 subtle #98A2B3 success #12B76A pale #ECFDF3 warning #F79009 pale #FFFAEB danger #F04438 pale #FEF3F2 info #0BA5EC pale #F0F9FF` (`src/index.css:8-33`) — no ad-hoc hex beyond type/status pills and toast green `#12B76A`.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `notificationsService.list()` | `GET /api/v1/notifications` | `notification.read` (`platform.ts:24`) | `listByKind(req.tenantId,'notification')` tenant Documents `kind` → `NotificationItem[]` `platform.ts:210-212` |
| `notificationsService.preferences()` | `GET /api/v1/notifications/preferences` | `notification.read` | `listByKind(req.tenantId,'notification-pref')` `213-215` → `NotificationPreference[] 15 topics` (via `Settings.tsx` + `NotificationPreferences.tsx`) |
| `notificationsService.quietHours()` | `GET /api/v1/notifications/quiet-hours` | `notification.read` | `firstByKind(req.tenantId,'quiet-hours')` `216-218` → `QuietHoursConfig` single row (tenant singleton) |
| Read one (spec, belum) | `PATCH /api/v1/notifications/:id/read` | `notification.read` / session-scoped | `docs/pages/notifications.md §10` spec — body `readAt now`; belum di `platformRouter` |
| Batch prefs (spec, belum) | `PATCH /api/v1/notifications/preferences` | session-scoped | `docs/pages/notifications.md §10` — body `preferences[]`; weekly via `PreferencesTable` save |
| Quiet-hours save (spec, belum) | `PATCH /api/v1/notifications/quiet-hours` | session-scoped | spec `PATCH /notifications/quiet-hours`; belum `PUT` |
| `userChannelsService.list()` | `GET /api/v1/users/me/channels` | `user.read` (`platformRouter.use /users` `platform.ts:22`) + session `where userId==session.userId` | `NotificationChannelRow[] id kind email|sms|slack address verified` `162-168` — Settings sudah consume |
| `userChannelsService.upsert(kind,address)` | `PUT /api/v1/users/me/channels/:kind {address}` | session auth | `upsert where userId_kind → tenantId+userId+kind+address` `170-193` `VALID_CHANNEL_KINDS email|sms|slack` |
| `inboxService.items()` (sibling) | `GET /api/v1/inbox/items` | `inbox.read` (`platform.ts:25`) | `listByKind('inbox-item')` — notifications feed ≠ inbox queue |
| `onCallService` (consumer) | `GET /api/v1/on-call/schedules` etc. | `oncall.read` | Generated topics `on_call_shift_start|on_call_escalation` from `notificationTopicMeta ON-CALL` consume preferences |

All via `src/services/platformServices.ts:84-88` `apiFetch` + `src/services/core.ts:29-61` `useResource`. Tenant isolation `req.tenantId` + `listByKind` documents store (JSON serialized columns future `jsonb` per `AGENTS.md`). Guard `platformRouter.use('/notifications', requirePermission('notification.read'))` before any handler. Failure → `401` (no session) / `403 scope_violation` (`server/scope/errors.ts:9`).

---

## Open Items

- [ ] Add `PATCH /notifications/:id/read` + `POST /notifications/mark-all-read` → stamp `readAt = now` per user, optimistic in `Notifications.tsx:61-63` + `NotificationDropdown:34-36` with revert on error.
- [ ] Add `PUT /notifications/preferences` (Zod `NotificationPreference` 15 topics `channels[] in_app|email|sms|slack + respectQuietHours + overrideForUrgent`) batch + wire `PreferencesTable onSave` from `showToast` local to HTTP; expose second column `overrideForUrgent`.
- [ ] Add `PUT /notifications/quiet-hours` (schema `timezone string 6, fromHour 0-23, toHour 0-23, daysOfWeek 0-6, enabled bool`) per-user key + wire `QuietHoursForm Save`; replace hardcoded `CURRENT_DAY/HOUR` with live `Intl.DateTimeFormat timezone` + remove opacity dim bug.
- [ ] Fix `NotificationPreferences.tsx:94 let nextId` → `useRef(0)` + persist toasts dedup; add error banner `retry` like `incidents`.
- [ ] Replace hardcoded `ChannelRow` values with `userChannelsService.list()` + edit modal `PUT /users/me/channels/:kind`; wire `Change` Button `onClick` + add `Teams` to `VALID_CHANNEL_KINDS` if needed and extend `NotificationChannelRow kind`.
- [ ] Fix click `n.url → navigate` to also `PATCH read` before navigate; handle `url==null cursor-default` edge + open external if `url` absolute.
- [ ] Add `GET /notifications?filter=all|unread|mentions&type=&q=&page&pageSize` + `useSearchParams ?filter=` persist + pagination `parsePagination` (limit `listByKind` unbounded today).
- [ ] Deduplicate triple fetch `list()` (`TopBar` + `Dropdown` + `Feed`) into shared `useNotifications()` hook (SWR/cache) — avoid 3 identical requests on mount.
- [ ] Wire realtime `socket notification:item` on `tenant:{tenantId}` prepend feed + atomic `unreadCount` bump + bell pulse (`inbox:item` analog `server/realtime.ts:52,71`).
- [ ] Add Slack OAuth (`slack` channel) workspace flow + Teams channel; SMS per-tenant provider (`TWILIO_*`) selectable — reflect in `Connected Channels` UI (baseline §12).
- [ ] Implement `Group/digest (daily summary)`, `Snooze`, `Per-resource subscribe` (`docs/pages/notifications.md §12` parked) + quiet-hours `Respect` vs `Ignore` semantics documented.
- [ ] Sync timezone list: `QuietHoursForm` 6 vs `ProfileForm` 8+UTC — unify to single `TIMEZONES` const (include `Asia/Jakarta` default from baseline `docs/pages/notifications.md §3`) with searchable `Select`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/notifications.md` + `src/routes/platform/Notifications.tsx:1-135` + `NotificationPreferences.tsx:1-186` + `src/components/platform/QuietHoursForm.tsx:49-190` + `PreferencesTable.tsx:28-153` + `NotificationDropdown.tsx:13-125` + `TopBar.tsx:27,31` + `server/routes/platform.ts:24,209-218` + `src/types/platform.ts:65-117` + `src/services/platformServices.ts:84-88` + `src/lib/constants.ts:561-577` (notificationTopicMeta 15) + tokens `ois-*` `#1F4FD4→#B42318` (`src/index.css:8-33`) ke template features (Intent/Current State/Primary View + Feed/Preferences + Actions/Lifecycle + Preservation) | — |

---

**Lihat juga:** [Inbox](./inbox.md) · [Settings](./settings.md) · [On-Call](./on-call.md) · [Profile](./profile.md) · [Status Page](./status-page.md)
