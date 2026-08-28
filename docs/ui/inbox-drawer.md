# InboxDrawer

Status: **Draft**
Source of truth: [`src/components/layout/InboxDrawer.tsx`](../../src/components/layout/InboxDrawer.tsx), [`src/components/layout/AppShell.tsx`](../../src/components/layout/AppShell.tsx), [`src/components/layout/TopBar.tsx`](../../src/components/layout/TopBar.tsx), [`src/index.css`](../../src/index.css)
Terra ref: `terra-service-management` inbox/dispatch (slide-over + overlay pattern) — OIS adaptasi light theme `ois-*` (bukan terra monochrome dark)

---

## Purpose

Slide-over global untuk triage cepat tanpa pindah route. Render di atas `AppShell` sebagai overlay (`z-[100]` backdrop + `z-[101]` panel) dan di-trigger via bell `Inbox` di `TopBar`. Beda dengan terra `AiAssistantPanel` — OIS tidak punya AI panel di AppShell default, melainkan `InboxDrawer` sebagai action queue entry point (full-page `/inbox` adalah 2-panel `w-80 + flex-1` terpisah di `src/routes/platform/Inbox.tsx`).

Primary use: peek `All | Urgent | Approvals`, lihat `priority===urgent` stripe merah + `formatRelative(receivedAt)`, CTA `primaryAction.label` atau `View`, lalu deep-link ke `sourceUrl`/`navigateTo` (full routing di `/inbox` detail via `InboxActionButtons`).

---

## Anatomy

```
viewport
├─ Backdrop  fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]  (InboxDrawer.tsx:29-35)
└─ Drawer    fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-white shadow-ois-modal z-[101] flex flex-col  (38-43)
   ├─ Header   p-5 border-b border-ois-border shadow-sm flex justify-between
   │   ├─ left: h2 text-lg font-bold text-ois-text "Inbox" + p text-xs text-ois-text-muted "Action required for you"
   │   └─ right: Button ghost icon <X size={20}> onClose  (45-53)
   ├─ Filters  px-5 py-3 border-b border-ois-border flex gap-2 overflow-x-auto no-scrollbar
   │   └─ FilterPill ×3: All (N) · Urgent (N) · Approvals (N)  (56-60)
   └─ Items    flex-1 overflow-y-auto divide-y divide-ois-border
       └─ Row  p-5 hover:bg-ois-surface-muted group relative cursor-pointer + left stripe w-1  (65-69)
           ├─ meta caps text-[10px] bold uppercase tracking-wider text-ois-text-subtle + URGENT dot red
           ├─ title text-sm font-semibold text-ois-text + time text-[11px]
           ├─ summary text-sm text-ois-text-muted line-clamp-2 mb-4 (linkifyEntities)
           └─ row actions: Button sm primary|outline + ghost ExternalLink opacity-0 → group-hover:100
```

Mount point: `AppShell.tsx:85-89` `AnimatePresence { inboxOpen && <InboxDrawer onClose> }` — tidak di-render saat closed (exit `x 100%` + `opacity 0` untuk backdrop). `TopBar.tsx:89-98` bell `Inbox` (bukan `Bell` — itu untuk notifications) dengan badge `urgentInboxCount` `w-4 h-4 bg-ois-danger text-white text-[9px] font-bold rounded-full border-2 border-white` di `top-1 right-1`.

Alias `@` → repo root dipakai import `@/src/services`, `@/src/lib/*`.

---

## Props

```ts
// InboxDrawer.tsx:11-13
interface InboxDrawerProps {
  onClose: () => void;
}
```

State internal: `filter: 'all' | 'urgent' | 'approval'` (`useState` default `'all'` `InboxDrawer.tsx:16`), `inboxItems: InboxItem[]` via `useResource(() => inboxService.items(), [])` (`17-18`).

`FilterPill` local (`109-121`):

```ts
const FilterPill: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'urgent';
}> = ...
```

---

## Behavior

### Open / Close

- **Open:** `TopBar.tsx:90` `onClick={onOpenInbox}` → `AppShell.tsx:67` `setInboxOpen(true)`. Tidak ada `Esc` handler saat ini — close hanya via `X` button (`Button ghost icon`) atau klik backdrop (`motion.div onClick={onClose}` `33`).
- **Close:** `onClose` passed ke `AppShell` `onClose={() => setInboxOpen(false)}` (`87`). `AnimatePresence` menangani exit animation (`exit {{ x:'100%' }}` spring + `opacity 0` backdrop).
- **No persist:** `inboxOpen` local `useState(false)` — tidak persist `localStorage`/query param. Refresh → closed.
- **Coexistence:** `AiQuickPanel` di-mount terpisah `AnimatePresence aiPanelOpen && !isAiRoute` (`91-95`) — z-index tidak bentrok karena keduanya fixed overlay; inbox `z-[100]/[101]`, AI panel own stacking di `AiQuickPanel.tsx`.

### Data Fetch

- `useResource(() => inboxService.items(), [])` — mount-only fetch `GET /api/v1/inbox/items` (`src/services/platformServices.ts:92` `apiFetch<InboxItem[]>`). `data ?? []` fallback. Tidak ada polling / socket auto-merge — `server/realtime.ts:52` `socket.join(room(tenantId,'inbox'))` + `:71` `emit('inbox:item')` di-emit server tapi client `src/services/realtime.ts:19` `on('inbox:item')` belum di-wire ke `setItems` Drawer (dual fetch: Drawer + `/inbox` page masing-masing `useResource` terpisah, tidak shared cache).
- `filteredItems = inboxItems.filter(...)` (`20-24`): `urgent → priority==='urgent'`, `approval → type==='approval_request'`, `all → *`. Counters di pills recompute per render: `inboxItems.filter(...).length` (`58-59`).

### Filter Interaction

- Click `FilterPill` → `setFilter(active)` → `filteredItems` recalc → list re-render. `active` styling via `variant` prop (`114-116`).

### Item Interaction

- Row `cursor-pointer group` tapi saat ini **tidak ada `onClick` handler** per row — CTA hanya `Button` (`92-96`). Detail navigation belum wire `navigate(primaryAction.navigateTo ?? sourceUrl)` — gap vs full-page `InboxItemDetail` yang pakai `Link to={navigateTo}` + `sourceUrl` (`docs/features/inbox.md § Detail`). `ExternalLink` ghost di kanan `ml-auto opacity-0 group-hover:opacity-100` juga tanpa handler.

---

## Visual Spec — tokens & classes

Semua token dari `src/index.css` via `@theme` — jangan hardcode hex. Cross-ref `design-tokens.md`.

| Element | Class / Token | Value | Ref |
|---------|---------------|-------|-----|
| Backdrop | `bg-black/30 backdrop-blur-sm` | `rgba(0,0,0,0.30)` + `blur(4px)` | `InboxDrawer.tsx:34` |
| Panel bg | `bg-white` | `#FFFFFF` (`ois-surface`) | `index.css:14` |
| Panel shadow | `shadow-ois-modal` | `0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)` | `index.css:53` |
| Panel width | `w-full max-w-[400px]` | 400px max, 100% di <400px | `InboxDrawer.tsx:43` |
| Header border | `border-ois-border` | `#E4E7EC` | `index.css:16` |
| Header shadow | `shadow-sm` | Tailwind default | `45` |
| Title | `text-lg font-bold text-ois-text` | `18px / 700 / #101828` | `47` |
| Subtitle | `text-xs text-ois-text-muted` | `12px / #475467` | `48` |
| Filter bar | `border-ois-border` | `#E4E7EC` | `56` |
| Item hover | `hover:bg-ois-surface-muted` | `#F1F3F7` | `65` |
| Divider | `divide-ois-border` | `#E4E7EC` | `63` |
| Urgent stripe | `bg-ois-danger` | `#F04438` | `index.css:29` + `68` |
| Non-urgent stripe | `bg-transparent` | — | `68` |
| Caps meta | `text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle` | `10px / 700 / #98A2B3` | `73` |
| URGENT dot | `text-ois-danger ● URGENT` | `#F04438` | `74` |
| Type label | `type.replace(/_/g,' ')` uppercase | — | `75` |
| ID | `font-mono` | `Geist Mono / JetBrains Mono` | `index.css:5` + `77` |
| Title | `text-sm font-semibold text-ois-text leading-tight` | `14px / 600 / #101828` | `79` |
| Time urgent | `text-ois-danger` | `#F04438` | `83` |
| Time normal | `text-ois-text-subtle` | `#98A2B3` | `83` |
| Summary | `text-sm text-ois-text-muted line-clamp-2` | `14px / #475467` | `89` |
| Primary CTA active | `bg-ois-primary border-ois-primary text-white` | `#1F4FD4` | `FilterPill 115` + Button primary |
| Urgent pill active | `bg-ois-danger border-ois-danger text-white` | `#F04438` | `FilterPill 115` |
| Pill inactive | `bg-ois-surface border-ois-border text-ois-text-muted hover:border-ois-text-muted` | `#FFFFFF / #E4E7EC / #475467` | `116` |

Radius: `Button` `rounded-ois-btn 6px`, `FilterPill` `rounded-full 999px` (`index.css:55-58`). Font: `Plus Jakarta Sans` / `Inter` sans + `Geist Mono` mono (`index.css:4-5`).

---

## FilterPill

`InboxDrawer.tsx:109-121`

```tsx
<button
  className={cn(
    "whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold transition-all border",
    active
      ? (variant==='urgent' ? "bg-ois-danger border-ois-danger text-white"
                            : "bg-ois-primary border-ois-primary text-white")
      : "bg-ois-surface border-ois-border text-ois-text-muted hover:border-ois-text-muted"
  )}
>
```

- `variant='urgent'` hanya dipakai `Urgent` pill (`58`).
- Count di label: `All {inboxItems.length}`, `Urgent {filter urgent}`, `Approvals {type approval_request}`.

---

## Item Row — anatomy per item (`65-101`)

```
div.p-5.group.relative
├─ absolute left-0 top-0 bottom-0 w-1 bg-ois-danger|transparent
├─ flex justify-between gap-3 mb-2
│  ├─ col gap-1
│  │  ├─ caps row  gap-2: [● URGENT?] + type + • + font-mono sourcePublicId
│  │  └─ h3 title
│  └─ time  text-[11px] font-medium whitespace-nowrap (danger if urgent)
├─ p summary linkifyEntities(item.summary)
└─ flex gap-2
   ├─ primaryAction ? <Button size sm variant primary label> : <Button outline View>
   └─ <Button ghost ml-auto opacity-0 group-hover:opacity-100><ExternalLink 14></Button>
```

- `linkifyEntities` dari `src/lib/entity-linkify.tsx:134` — auto-link `INC-*/CHG-*/PRB-*/EVT-*/CI-*` → `EntityLink` dotted underline `text-ois-primary font-mono`.
- `formatRelative(item.receivedAt)` dari `src/lib/format.ts:8` `date-fns formatDistanceToNow {addSuffix:true}` → `"3 hours ago"`.
- `item.priority` strictly string `InboxItemPriority = 'urgent'|'high'|'normal'|'low'` (`src/types/platform.ts:16`), `item.type` `InboxItemType` 9 enum (`5-14`).

---

## States

| State | Render | Notes |
|-------|--------|-------|
| Closed | tidak mount (`AnimatePresence` conditional) | No DOM, no fetch side-effect cleanup |
| Open — loading | `data ?? []` → `inboxItems []` → `filteredItems []` → `flex-1 overflow-y-auto divide-y` empty div (no empty state) | Gap: vs full-page `InboxEmptyState all_caught_up` — drawer shows blank |
| Open — populated | `filteredItems.map` rows `p-5` | Scroll `overflow-y-auto` |
| Open — filtered zero | same empty div | e.g. filter `urgent` dengan 0 urgent → blank, tidak ada `No urgent items` |
| Error | `useResource` error swallowed → silent `[]` | No `bg-ois-danger-pale Retry` banner (gap vs incidents) |

No skeleton/shimmer — `ois-shimmer-text` (`index.css:127-141`) tidak dipakai drawer (dipakai page KPI elsewhere).

---

## Motion

- Backdrop: `motion.div initial {{opacity:0}} animate {{opacity:1}} exit {{opacity:0}}` (`30-32`).
- Panel: `motion.div initial {{x:'100%'}} animate {{x:0}} exit {{x:'100%'}} transition {{type:'spring', damping:25, stiffness:200}}` (`39-42`).
- Library: `motion/react` (`import { motion } from 'motion/react'` `5`) — sama dengan terra (bukan `framer-motion` import legacy). Jangan ganti ke CSS `translate` manual.
- `AppShell.tsx:85` `AnimatePresence` wraps Drawer — `exit` hanya jalan karena conditional di dalam `AnimatePresence`.
- Reduced motion: `src/index.css:93` `@media (prefers-reduced-motion: no-preference)` menganimasi `ois-fade-*` tapi `motion` spring tidak di-guard — pertimbangkan `useReducedMotion()` guard jika audit a11y.

---

## Accessibility

- Backdrop `onClick={onClose}` — klik luar menutup. Tidak ada `role="dialog"` / `aria-modal` / `aria-label` di panel saat ini (gap).
- Close `Button variant ghost size icon` dengan `<X size={20}>` — tidak ada `aria-label="Close inbox"` explisit (rely on icon).
- Focus trap tidak ada — `Tab` bisa keluar ke `TopBar` di belakang backdrop. Rekomendasi: `focus-trap-react` atau `motion` `FocusScope`.
- `Esc` tidak handle — Rekomendasi: `useEffect keydown Escape → onClose`.
- Filter pills adalah `<button>` native — keyboard operable.
- `formatRelative` time tidak ada `<time dateTime>` semantic.

---

## Terra Reference — delta

| Aspect | Terra `inbox/dispatch` | OIS `InboxDrawer` |
|--------|------------------------|-------------------|
| Theme | Monochrome dark `data-theme` toggle, `terra-*` tokens | Light only `ois-bg #F7F8FA`, `ois-surface #FFFFFF`, `ois-*` `#1F4FD4`/`#F04438` etc. (`index.css:8-39`) |
| Position | dispatch slide-over (kanan) serupa | sama `fixed right-0 max-w-[400px]` |
| Overlay | `bg-slate-900/40` (app-shell.md stub) | `bg-black/30 backdrop-blur-sm` aktual (`InboxDrawer.tsx:34`) |
| Trigger | bell + dispatch queue | `TopBar` `Inbox` icon (`lucide-react Inbox`) + `urgentInboxCount` badge `bg-ois-danger` (`TopBar.tsx:90-97`) — terpisah dari `Bell` notifications (`TopBar.tsx:101-111`) |
| Filters | status/priority/module dropdown | pills `All | Urgent | Approvals` hardcoded (`InboxDrawer.tsx:57-59`); full-page punya tabs `All/Unread/Requires action/Archived` (`src/routes/platform/Inbox.tsx:15-20`) |
| Data source | `inbox-legacy` + `inbox-item` Documents `kind` | sama `GET /inbox/items` `listByKind(req.tenantId,'inbox-item')` (`server/routes/platform.ts:224-226`) tenant-isolated `withScopedDb` |
| Realtime | socket `inbox:item` ke room | sama `server/realtime.ts:52,71` `tenant:{tenantId}:inbox` tapi belum wire `on('inbox:item')` merge di Drawer (`src/services/realtime.ts:19`) |
| Empty state | `all_caught_up` / `no_selection` | full-page punya `InboxEmptyState` (`src/components/inbox/InboxEmptyState.tsx`) tapi Drawer tidak pakai — blank |

---

## Edge Cases

- `filter=urgent` atau `approval` dengan 0 match → list kosong tanpa pesan — pertimbangkan `InboxEmptyState variant all_caught_up` reuse.
- `inboxItems` besar (>100) → `flex-1 overflow-y-auto` tanpa virtualization / pagination — risk `listByKind` load all (`server/routes/platform.ts:225` tanpa `?page&pageSize` `parsePagination`). Full-page sama.
- `item.summary` mengandung entity ID (`INC-...`) → `linkifyEntities` inject `<Link>` — pastikan tidak break `line-clamp-2`.
- `primaryAction` null → fallback `Button outline View` tanpa handler (saat ini dead button) — harus wire `navigate(primaryAction.navigateTo ?? sourceUrl)` dan `onClose`.
- Mount dua `useResource` (Drawer + TopBar + full-page) → 3× `GET /inbox/items` — pertimbangkan shared cache / SWR.
- `onClose` dipanggil dari backdrop click meski `filter` sedang aktif — tidak ada confirm.

---

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `inboxService.items()` | `GET /api/v1/inbox/items` | `inbox.read` (`server/routes/platform.ts:25` `platformRouter.use('/inbox', requirePermission('inbox.read'))`) | `listByKind(req.tenantId,'inbox-item')` Documents tenant-isolated. Via `src/services/platformServices.ts:90-93` `apiFetch` + `src/services/core.ts:29-61` |
| `inboxService.feed()` | `GET /api/v1/inbox` (legacy) | `inbox.read` | `inbox-legacy` kind `:221-223` — keep compat, Drawer tidak pakai |
| Socket `inbox:item` | `tenant:{tenantId}:inbox` room | session (`requireAuth` `server/app.ts:126` + `server/realtime.ts:52 join`) | `server/realtime.ts:71 emit('inbox:item', item)` → client `src/services/realtime.ts:19 on('inbox:item', InboxItem)` — not yet merged |
| `TopBar` badge | same `inboxService.items()` | `inbox.read` | `TopBar.tsx:26,30` `urgentInboxCount filter priority urgent` untuk badge; `InboxDrawer` duplicate fetch |

Semua via `req.scoped` / `withScopedDb` → `ScopeViolationError 403 {error:'scope_violation'}` (`server/scope/errors.ts:9`) dipetakan di `server/app.ts` error handler.

---

## Design Preservation

Wajib pertahankan saat refactor (dari `InboxDrawer.tsx:15-121` + `AppShell.tsx:85-89` + `TopBar.tsx:89-98` + `index.css:8-59`):

1. **Overlay stacking** `backdrop z-[100] bg-black/30 backdrop-blur-sm` + `panel z-[101] bg-white shadow-ois-modal` — jangan ubah ke `z-50` / `bg-slate-900/40` stub lama (`app-shell.md:41`).
2. **Panel geometry** `fixed right-0 top-0 bottom-0 w-full max-w-[400px]` — jangan widen ke 480px tanpa audit `design-tokens.md`.
3. **Spring** `type spring damping 25 stiffness 200` untuk panel + `opacity` untuk backdrop — library `motion/react` only, bukan CSS transition.
4. **Mount via `AnimatePresence`** di `AppShell` (`85-89`) — panel tidak ada di DOM saat closed, exit animation rely on `AnimatePresence`.
5. **Trigger** `TopBar` `Inbox` lucide `size 20` dengan badge `w-4 h-4 bg-ois-danger text-white text-[9px] font-bold rounded-full border-2 border-white` (`TopBar.tsx:92-95`) — jangan tukar ke `Bell` (itu untuk notifications).
6. **Header** `p-5 border-b shadow-sm` `Inbox text-lg font-bold` + `Action required for you text-xs muted` + `X 20 ghost` (`45-53`).
7. **Filters** `px-5 py-3 border-b flex gap-2 overflow-x-auto` pills `rounded-full px-3 py-1 text-xs font-semibold border` active `bg-ois-primary/danger text-white` else `bg-ois-surface border-ois-border` (`56-60,109-121`) — stay `rounded-full` bukan `rounded-ois-badge`.
8. **Left stripe** `absolute left-0 w-1 bg-ois-danger if urgent else transparent` (`66-69`) — bukan `border-l-[3px]` seperti `SeverityStripeRow` di full-page list.
9. **Caps row** `text-[10px] font-bold uppercase tracking-wider text-ois-text-subtle` + `● URGENT text-ois-danger` (`73-74`) — spacing `gap-2`.
10. **Mono ID** `font-mono sourcePublicId` (`77`) `Geist Mono` — jangan ganti sans.
11. **Title + time** `text-sm font-semibold leading-tight text-ois-text` + time `text-[11px] font-medium whitespace-nowrap urgent danger else subtle formatRelative` (`79-86`).
12. **Summary** `text-sm text-ois-text-muted line-clamp-2 mb-4` + `linkifyEntities` (`89`) — preserve `line-clamp-2`.
13. **CTA** `primaryAction ? Button primary sm : Button outline View` + `ExternalLink 14 ml-auto opacity-0 group-hover:opacity-100` (`91-99`) — jangan ubah ke `Link` tanpa `group` hover.
14. **Tokens lock** `ois-primary #1F4FD4 /hover #1A42B5 /pale #EEF2FF`, `bg #F7F8FA`, `surface #FFFFFF #F1F3F7`, `border #E4E7EC /strong #D0D5DD`, `text #101828 #475467 #98A2B3`, `danger #F04438`, `shadow ois-modal`, `radius 8/6/4/12` (`index.css:8-59`) — no raw hex.
15. **Icons** `lucide-react` only `X / ExternalLink / CheckCircle / XCircle / AlertTriangle` import (unused `CheckCircle/XCircle/AlertTriangle` current dead import `InboxDrawer.tsx:2` — keep or remove saat lint).

---

## Open Items

- [ ] Add empty state untuk `filteredItems.length===0` di Drawer (reuse `InboxEmptyState all_caught_up`) — saat ini blank.
- [ ] Wire `Esc` + `role dialog` + focus trap untuk panel overlay.
- [ ] Wire CTA `navigate(primaryAction.navigateTo ?? sourceUrl)` + `onClose` di row button & `ExternalLink`.
- [ ] Share cache `inboxService.items()` antara Drawer / TopBar badge / `/inbox` page (SWR / context) + merge `socket inbox:item`.
- [ ] Persist `filter` ke `useSearchParams` jika diperlukan (konsisten dengan capacity `?search&severity`).
- [ ] Pagination / virtualization untuk `listByKind` all tanpa limit (`server/lib/pagination.ts`).
- [ ] Hapus unused imports `CheckCircle/XCircle/AlertTriangle` atau pakai untuk `type` icon per `inboxItemTypeMeta` (`src/lib/constants.ts:542-552`).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep spec init — map `src/components/layout/InboxDrawer.tsx:15-121` (backdrop/panel spring, header, FilterPill, urgent stripe, caps, linkify, formatRelative) + `src/components/layout/AppShell.tsx:85-89` AnimatePresence mount + `src/components/layout/TopBar.tsx:89-98` Inbox trigger badge + terra inbox/dispatch delta + `src/index.css:8-59` ois-* tokens + `src/types/platform.ts:5-48` InboxItem + `server/routes/platform.ts:25,220-226` + `server/realtime.ts:52,71` ke template ui (Purpose/Anatomy/Behavior/Visual Spec/Preservation) | — |
