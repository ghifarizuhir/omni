# Portal — Self-Service (Home / Catalog / Request Wizard / My Requests)

Status: **Draft**
Route: `/portal` (Home), `/portal/catalog` (browse), `/portal/catalog/:itemId` (wizard), `/portal/my-requests` (tracking)
Sidebar: Service Delivery · Portal
Source: `src/routes/portal/PortalLayout.tsx`, `PortalHome.tsx:281-663`, `Catalog.tsx:289-509`, `CatalogItemDetail.tsx:449-863`, `MyRequests.tsx:292-405` · `server/routes/itsm.ts:159-175` · `src/types/request.ts:1-167` · `src/services/itsmServices.ts` (`requestsService`)

---

## Intent

Pintu masuk end-user — **request layanan tanpa membuka tiket manual**. Browse katalog (search + kategori), submit via 4-step wizard dengan dynamic form + conditional visibility, lalu track via My Requests. Agent mengelola hasilnya di Service Requests (`/requests`); Portal adalah front door yang harus selesai dalam <5 klik dengan jejak approval/workflow yang jelas.

ITIL 4: Service Request Management — standard request (pre-approved, templated via `CatalogItem.workflowTemplate`) sebagai kendaraan fulfillment terkontrol, bukan incident (symptom) atau change (risk).

## Current State (snapshot `src/routes/index.tsx:143-148`)

- `src/routes/index.tsx:143` → `<PortalLayout />` at `/portal` (parent, nested children + outlet `flex-1 min-h-0 overflow-auto`)
- `src/routes/index.tsx:144` → `<PortalHome />` at `/portal` `index:true`
- `src/routes/index.tsx:145` → `<Catalog />` at `/portal/catalog`
- `src/routes/index.tsx:146` → `<MyRequests />` at `/portal/my-requests`
- `src/routes/index.tsx:148` → `<CatalogItemDetail />` at `/portal/catalog/:itemId` (outside nested layout — full-page wizard)
- Components: `PortalLayout` 82 lines (accent bar + tab bar + 2 `useResource` counts), `PortalHome` 663 lines (hero + quick actions 4 + Your Activity + Recommended + Popular 6 + `ServiceDeskModal`), `Catalog` 509 lines (`ResultCard/RecommendedCard/CategoryTile/SortDropdown/filterAndSort/scoreItem`), `CatalogItemDetail` 863 lines (`StepperNav/DynamicField/WorkflowNode/initValues/validateForm/handleSubmit` simulated), `MyRequests` 405 lines (`RequestCard/CardStepper/TabBtn/EmptyState/sortRequests`), `MiniStepper/CardStepper` inline horizontal steppers.
- API: `itsmRouter` `GET /catalog` (`request.read` → `catalogRepo.list`) + `GET /requests` / `GET /requests/:publicId` (`request.read` scoped) + `POST /requests/:publicId/comments`, `PATCH .../cancel/reassign`, `POST .../watchers` etc. di `server/routes/itsm.ts:159-341` — Portal reuse reads; `POST /requests` submit catalog belum ada (simulated di detail).
- Types: `CatalogCategory` 6 values `access|equipment|software|communication|personnel|general`, `RequestStatus` 9 values `draft→submitted→approved→in_fulfillment→pending_user→fulfilled→closed|rejected|cancelled`, `WorkflowStepStatus` 5, `ApprovalDecision` 3, `FieldType` 11 (`text|textarea|email|number|select|multiselect|date|user_picker|ci_picker|file_upload|checkbox`), `CatalogItem` + `FormField` + `WorkflowStepTemplate` + `ServiceRequest` + `WorkflowInstance/StepInstance` (`src/types/request.ts:1-167`).
- Services: `requestsService` — `list()` (all ServiceRequests), `catalog()` (`GET /catalog`), `get(publicId)`, `comments`, `addComment`, `approveStep/rejectStep/cancel/reassignStep/addWatcher/removeWatcher` (`src/services/itsmServices.ts:67-116`) — Portal pakai `catalog()` + `list()` via `useResource(..., [])`.

**Working:**
- `PortalLayout` tabs `TABS` 3: Home `/portal` `Home 14`, Catalog `/portal/catalog` `BookOpen 14`, My Requests `/portal/my-requests` `Inbox 14` — `NavLink` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong` (`PortalLayout.tsx:7-11,58-73`); accent `w-1 shrink-0 transition-colors duration-500` color `pending_user>0 #DC6803 : in_fulfillment>0 #1F4FD4 : #12B76A` (`PortalLayout.tsx:25-28`); stats `catalogCount active pending_user/in_fulfillment` row `text-xs text-ois-text-muted` dots `w-1 h-1 rounded-full bg-ois-border-strong` (`PortalLayout.tsx:36-52`); shell `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem)` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + outlet `flex-1 min-h-0 overflow-auto` (`PortalLayout.tsx:31-79`).
- `PortalHome` hero `relative -mx-6 -mt-6 px-6 pt-12 pb-10` gradient `linear-gradient 135deg #EEF2FF 0% #E0E9FF 40% #F0F7FF 100%` + decorative circles `rounded-full bg-ois-primary/5, /4, ois-info/6` (`PortalHome.tsx:322-332`); title `text-3xl font-extrabold tracking-tight` + `text-ois-primary` firstName (`PortalHome.tsx:334-336`); search `flex bg-white rounded-xl shadow-ois-modal border border-ois-border focus-within:ring-2 focus-within:ring-ois-primary/25 focus-within:border-ois-primary` with `Search 18 text-ois-text-subtle` left, input `px-3 py-3.5 text-sm outline-none` placeholder `Search the catalog or knowledge base…`, clear `X 14`, submit `bg-ois-primary hover:bg-ois-primary-hover rounded-lg px-4 py-2 active:scale-95` (`PortalHome.tsx:346-371`); popular tags 5 pills `rounded-full bg-white/80 border-ois-border text-ois-text-muted hover:text-ois-primary hover:border-ois-primary/40` (`PortalHome.tsx:377-384`); handler `handleSearch(q) navigate(/portal/catalog?q=...)` (`PortalHome.tsx:312-316`).
- Quick actions `grid-cols-2 lg:grid-cols-4 gap-4` 4 `Link/div` cards `bg-ois-surface rounded-ois-card border border-ois-border shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-0.5` with `w-10 h-10 rounded-lg` icon bg + `item.border hover:border-ois-primary/40` + `ArrowRight 14 opacity-0 group-hover:opacity-100 -translate-x-1→0` (`PortalHome.tsx:391-475`): Browse Catalog `ShoppingBag ois-primary/pale` `Request services & equipment`, My Requests `ClipboardList ois-warning/pale` `${myRequests.length} open`, Knowledge Base `BookOpen ois-success/pale` `12 articles available`, Talk to Service Desk `MessageCircle purple-600/purple-50` → `setChatModalOpen(true)`.
- Your Activity + Articles for you `grid lg:grid-cols-2 gap-6` (`PortalHome.tsx:479-595`): Active requests `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card overflow-hidden` header `px-5 py-3.5 border-b flex justify-between` + `ClipboardList 15 ois-primary` + `text-[11px] uppercase tracking-widest` + count `text-[10px] bg-ois-primary text-white rounded-full` + `View all ArrowRight 11 → /portal/my-requests` (`PortalHome.tsx:482-499`); items `activeRequests = myRequests.filter(!fulfilled/closed/cancelled/rejected).slice(0,3)` (`PortalHome.tsx:300`); per request `Link /requests/${id} hover:bg-ois-surface-muted group px-5 py-4` dot `w-1.5 h-1.5 rounded-full` `STATUS_META dot/text`, label `text-[11px] font-semibold`, `publicId font-mono text-[10px] text-ois-text-subtle`, title `text-sm font-semibold`, activeStep `Clock 10 text-xs ois-text-muted` via `getActiveStepLabel`, `MiniStepper` (`PortalHome.tsx:50-81`), footer `text-[10px] text-ois-text-subtle Started formatRelative · Est. localeDate` (`PortalHome.tsx:536-539`).
- Recommended articles `BookMarked 15 ois-success` filtered `RECOMMENDED_SLUGS` 3 (`PortalHome.tsx:89-93,307-310`); per article `Link /kb/${slug} flex gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-ois-surface-muted group` icon `w-7 h-7 rounded-md bg-ois-success-pale BookOpen 13 ois-success`, title `text-sm font-medium group-hover:text-ois-primary line-clamp-2`, meta `Eye 9 viewCount + ThumbsUp helpful%`, `ArrowUpRight 13 opacity-0 group-hover:opacity-100` (`PortalHome.tsx:564-593`).
- Popular catalog items 6 `[...mockCatalogItems].sort(popularity desc).slice(0,6)` (`PortalHome.tsx:302-305`); `grid 2 md:3 xl:6 gap-3` cards `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-4 flex-col items-center text-center hover:shadow-ois-card-hover hover:-translate-y-0.5 hover:border-ois-primary/30` with `w-10 h-10 rounded-xl bg-ois-primary-pale` + `getLucideIcon(iconName,20 text-ois-primary)` + name `text-xs font-bold group-hover:text-ois-primary`, eta `Clock 9 text-[10px] ois-text-subtle ~Xd/Same day`, `Request → text-[10px] font-semibold text-ois-primary group-hover:underline` (`PortalHome.tsx:613-637`).
- ServiceDeskModal (`PortalHome.tsx:129-279`) `fixed inset-0 z-50 flex items-center justify-center p-4` + overlay `bg-slate-900/40 backdrop-blur-sm` + panel `bg-ois-surface rounded-ois-modal shadow-ois-modal w-full max-w-md h-[560px] max-h-[90vh] flex-col overflow-hidden`: header `flex gap-3 px-5 py-3 border-b` avatar `w-10 h-10 rounded-full bg-ois-primary-pale MessageCircle 18 ois-primary + w-3 h-3 bg-ois-success border-2 border-ois-surface`, name `text-sm font-bold ois-text Riley · Service Desk`, sub `text-[11px] text-ois-success Online · <2 min`, actions `Phone 15 tel:+14357 + Mail 15 itservicedesk@acme.io + X 16`, messages `flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-ois-bg/50` bubble `max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm` user `bg-ois-primary text-white rounded-br-md` else `bg-white text-ois-text border-ois-border rounded-bl-md`, typing `Loader2 12 animate-spin Riley is typing…`, composer `border-t bg-ois-surface p-3 flex gap-2` textarea `rounded-lg border-ois-border focus:ring-ois-primary/30` placeholder `Type your message…` `Enter→send Shift+Enter newline` + submit `h-9 w-9 rounded-lg bg-ois-primary hover:bg-ois-primary-hover Send 15 disabled:opacity-40`.
- Catalog `p-6` (`Catalog.tsx:337-508`): search `max-w-2xl` `flex bg-ois-surface rounded-xl border-ois-border shadow-ois-card focus-within:ring-2 focus-within:ring-ois-primary/25` `Search 17 + input px-3 py-3 placeholder Search catalog… + X clear` (`Catalog.tsx:348-366`); suggestions chips `Suggestions: laptop|github|database|vpn|slack|monitor|software` `rounded-full border-ois-border bg-ois-surface text-ois-text-muted hover:text-ois-primary` when `!query` (`Catalog.tsx:369-381`); category filter strip `flex flex-wrap gap-2 mb-6`: All `rounded-full px-3 py-1.5 text-xs font-semibold border` active `bg-ois-primary text-white border-ois-primary` else `bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/40 hover:text-ois-primary` + per category `CatIcon 11 + label (count)` active `bg+color border-current` from `CATEGORY_META` (`Catalog.tsx:386-417`); Clear filters `flex gap-1 text-xs text-ois-danger border-ois-danger/30 hover:bg-ois-danger-pale ml-auto X 11` when `isSearching=query||catFilter!=all` (`Catalog.tsx:418-425`).
- Catalog 2-state UI: default `!isSearching` → Recommended `Recommended for you Sparkles 14 ois-primary + h2 text-xs font-bold uppercase tracking-widest ois-text-subtle` grid `1 md:2 xl:3 gap-3` 6 `RecommendedCard` (`Catalog.tsx:430-443`) + Browse by category `grid 2 md:3 lg:6 gap-3` 6 `CategoryTile` (`Catalog.tsx:445-460`); searching → results header `flex justify-between text-sm ois-text-muted <b results.length result(s) for "query" in Category>` + `SortDropdown` (`Catalog.tsx:492-499`) + `space-y-3 ResultCard` (`Catalog.tsx:502-503`); empty `flex-col items-center py-24 w-14 h-14 bg-ois-surface-muted rounded-xl SearchX 24 ois-text-subtle + text-sm font-bold No match + text-xs muted Try fewer + Browse all categories link + Contact Service Desk` (`Catalog.tsx:464-488`).
- `ResultCard` (`Catalog.tsx:90-163`) `group bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:border-ois-primary/30 p-5 flex gap-4`: icon `w-11 h-11 rounded-xl cat bg` + `getLucideIcon(iconName,22)`, title `text-sm font-bold group-hover:text-ois-primary` with `highlight query → mark bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic font-medium` (`Catalog.tsx:94-103`), `publicId font-mono text-[10px] ois-text-subtle`, badges `CatIcon 10 bg+color rounded-full + Clock 10 ois-surface-muted etaLabel + cost currency amount+ bg-ois-warning-pale text-ois-warning if cost`, shortDescription `text-xs ois-text-muted leading-relaxed` highlighted, tags `max 5 text-[10px] bg-ois-surface-muted border-ois-border`, CTA `Link /portal/catalog/{id} bg-ois-primary hover:bg-ois-primary-hover text-white rounded-lg px-4 py-2 active:scale-95 Request ArrowRight 12`.
- `RecommendedCard` (`Catalog.tsx:166-203`) `Link group bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-0.5 p-5 flex gap-4`: same icon `w-11 h-11 rounded-xl`, title `text-sm font-bold group-hover:text-ois-primary`, shortDescription `text-xs ois-text-muted line-clamp-2`, footer `Clock 9 etaLabel + cost warning + Request ArrowRight 10 ml-auto text-ois-primary font-semibold`.
- `CategoryTile` (`Catalog.tsx:206-241`) `button text-left bg-ois-surface border rounded-ois-card shadow-ois-card p-4`: icon `w-8 h-8 rounded-lg` active `bg-ois-primary text-white` else `meta bg+color`, label `text-xs font-bold active ois-primary else ois-text`, count `text-[10px] ois-text-subtle`, preview 3 names `text-[10px] line-clamp-2`; active `border-ois-primary bg-ois-primary-pale shadow-ois-card-hover` else `border-ois-border hover:shadow-ois-card-hover hover:border-ois-primary/30 hover:-translate-y-0.5`.
- `SortDropdown` (`Catalog.tsx:245-287`) `SlidersHorizontal 13 + Sort: label ChevronDown 13 rotate-180 when open` button `border-ois-border-strong bg-ois-surface hover:bg-ois-surface-muted rounded-lg px-3 py-2 text-xs font-medium`; menu `absolute right-0 top-full mt-1 bg-ois-surface border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px] py-1` options `px-3 py-2 text-xs` active `bg-ois-primary-pale text-ois-primary font-semibold` else `hover:bg-ois-surface-muted`.
- `filterAndSort` (`Catalog.tsx:59-85`) pipeline: `filter enabled → catFilter all|category → q lowercase includes name/shortDescription/description/tags/category/publicId → sort scoreItem if q+relevant (name 10 + shortDesc 5 + tag 4 + category 3 + description 2) else popular (popularity desc) | fastest (estimatedFulfillmentDays asc) | newest (createdAt desc) else popularity`; `CATEGORY_META` 6: access `Key ois-primary/pale`, equipment `Laptop ois-info/info-pale`, software `Download purple-600/purple-50`, communication `Mail ois-success/pale`, personnel `Users ois-warning/pale`, general `Folder ois-text-muted/surface-muted` (`Catalog.tsx:15-22`); `SORT_OPTIONS` 4 relevant/popular/fastest/newest (`Catalog.tsx:24-30`); `etaLabel days 0 Same day 1 ~1 day else ~N days` (`Catalog.tsx:42-46`).
- `CatalogItemDetail` wizard (`CatalogItemDetail.tsx:546-863`): breadcrumb `flex gap-2 text-xs ois-text-muted Portal>Catalog>item name` buttons `hover:text-ois-primary` + hero strip `flex gap-4 p-5 bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card` icon `w-14 h-14 rounded-xl cat bg getLucideIcon 28` + `h1 text-xl font-extrabold + publicId font-mono text-[10px] bg-ois-surface-muted px-1.5 py-0.5 rounded + category pill bg+color rounded-full text-[11px] font-semibold + Clock 10 etaLabel + cost warning/No cost success pill` (`CatalogItemDetail.tsx:551-592`); `StepperNav` `flex gap-0 mb-8 max-w-xl mx-auto` 4 steps Item info/Form/Review/Submit `w-8 h-8 rounded-full border-2 font-bold text-xs flex-col` done `bg-ois-success border-ois-success text-white Check 14` else active `bg-ois-primary border-ois-primary text-white ring-4 ring-ois-primary/20` else `bg-ois-surface border-ois-border-strong text-ois-text-subtle`, label `text-[10px] font-semibold done ois-success active ois-primary else subtle`, connector `flex-1 h-0.5 mx-1 mb-5 bg-ois-success if i<current else bg-ois-border-strong` (`CatalogItemDetail.tsx:94-130`); hide when `submitted` (`CatalogItemDetail.tsx:594`).
- Step 0 Item info `grid 1fr 320px gap-6` (`CatalogItemDetail.tsx:598-683`): left About `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-6` h2 `text-xs font-bold uppercase tracking-widest ois-text-subtle mb-4 About this request` + `renderDescription` markdown light (`CatalogItemDetail.tsx:58-87`) bullets `flex gap-2 dot w-1.5 h-1.5 bg-ois-primary mt-1.5 + strong **text**`, gap `h-3` empty, + linked KB `bg-ois-surface border-ois-border rounded-ois-card p-5` h2 `BookOpen 13 ois-success Helpful articles` per article `Link /kb/{slug} flex gap-2.5 py-2 px-3 -mx-3 rounded-lg hover:bg-ois-surface-muted group BookOpen 13 ois-success + text-sm group-hover:ois-primary + mono publicId 10 subtle` (`CatalogItemDetail.tsx:609-629`); right Workflow preview `bg-ois-surface border-ois-border rounded-ois-card p-5` h3 `text-xs font-bold uppercase tracking-widest What happens next` + `WorkflowNode` per template (`CatalogItemDetail.tsx:329-366`) `w-7 h-7 rounded-full typeIcon Zap|ShieldCheck|CheckCircle2 13 bg automated ois-success / approval ois-primary / task ois-warning + connector w-px h-6 bg-ois-border-strong` + name `text-sm font-semibold ois-text` + approverLabel `manager_of_requester Your manager | team Team approval | service_owner Service owner | automated Automated | else Assigned team` `text-xs ois-text-muted` + SLA `Clock 10 ~Xh/~Xd/Minutes ois-text-subtle`, total estimated `pt-3 border-t flex justify-between text-xs ois-text-muted vs font-bold ois-text estimatedDaysFromHours(totalSlaHours)` (`CatalogItemDetail.tsx:644-654`); Owned by `Users 14 ois-primary bg-ois-primary-pale w-8 h-8 rounded-lg + name text-sm font-semibold + members count text-xs ois-text-muted` if `ownerTeam` (`CatalogItemDetail.tsx:658-670`); Recently fulfilled `font-bold n similar requests in last 30d` filtered `catalogItemId + fulfilled/closed` length (`CatalogItemDetail.tsx:673-680`); Continue `bg-ois-primary hover:bg-ois-primary-hover rounded-lg px-6 py-2.5 active:scale-95 ArrowRight 15`.
- Step 1 Form `max-w-2xl mx-auto` (`CatalogItemDetail.tsx:686-743`): card `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-6 mb-6` h2 `text-base font-bold Tell us what you need` + `All fields * required text-xs ois-text-muted` + `space-y-6 visibleFields=id filter isFieldVisible showWhen` (`CatalogItemDetail.tsx:385-388,503`); per field `div id=field-${id}` + `DynamicField` (`CatalogItemDetail.tsx:141-325`) — `initValues defaultValue ?? checkbox false | multiselect [] | ''` (`CatalogItemDetail.tsx:373-383`), base input `w-full rounded-lg border text-sm bg-white px-3 py-2.5 focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary` error `border-ois-danger focus:ring-ois-danger/20`; types: `select FilterDropdown fullWidth` (`CatalogItemDetail.tsx:156-166`), `multiselect` custom checkbox `w-4 h-4 rounded border-2 checked bg-ois-primary/border-ois-primary Check 10 else border-ois-border-strong group-hover:border-ois-primary/50` + `sr-only input` (`CatalogItemDetail.tsx:169-198`), `textarea rows 5 resize-none + minLength counter text-[11px] green/success vs subtle` + `maxLength counter` (`CatalogItemDetail.tsx:201-226`), `text/email/number input type=… placeholder min/max` (`CatalogItemDetail.tsx:229-239`), `date type=date + CalendarDays 14 absolute right-3` (`CatalogItemDetail.tsx:242-252`), `checkbox label flex gap-3 px-4 py-3 rounded-lg border checked bg-ois-primary-pale border-ois-primary else border-ois-border hover:bg-ois-surface-muted` `w-4 h-4 rounded border-2 checked bg-ois-primary Check 10` (`CatalogItemDetail.tsx:255-275`), `user_picker/ci_picker` simplified `input placeholder Search for user/CI…` (`CatalogItemDetail.tsx:278-296`), `file_upload border-2 border-dashed rounded-lg px-4 py-6 Upload 16 ois-text-subtle Click to upload… sr-only file` (`CatalogItemDetail.tsx:298-307`), helpText `Info 11 p-1 flex text-xs ois-text-subtle` (`CatalogItemDetail.tsx:310-314`), error `AlertCircle 11 text-xs ois-danger flex gap-1` + label `field.label + required * text-ois-danger text-xs` (`CatalogItemDetail.tsx:149-151,318-322`); validation `validateForm` required (checkbox !==true, multiselect empty, else trimmed ''), minLength if `>0 && <minLength`, maxLength (`CatalogItemDetail.tsx:390-420`), `handleFieldChange` clears error (`CatalogItemDetail.tsx:505-508`), `handleToReview` sets errors + `document.getElementById(field- first).scrollIntoView smooth center` then `setStep(2)` (`CatalogItemDetail.tsx:511-522`); footer Back `border-ois-border-strong hover:bg-ois-surface-muted ArrowLeft 14` + Review `bg-ois-primary ArrowRight 14`.
- Step 2 Review `max-w-2xl` (`CatalogItemDetail.tsx:746-826`): card `bg-ois-surface border-ois-border rounded-ois-card overflow-hidden mb-6` header `px-6 py-4 bg-ois-surface-muted border-b` h2 `text-base font-bold Review your request + text-xs muted You're about to request: <strong name>` + Form responses `divide-y border-ois-border rounded-lg overflow-hidden` rows `flex gap-4 px-4 py-3 text-sm` label `w-44 text-ois-text-muted font-medium` vs `getFieldDisplayValue checkbox→✓ Acknowledged | multiselect label join | select label | else String` (`CatalogItemDetail.tsx:422-434`) — filtered `f.type!==checkbox || value!==false` (`CatalogItemDetail.tsx:758`); Workflow `text-xs font-bold uppercase tracking-widest` + rows `w-5 h-5 rounded-full bg-ois-surface-muted border-ois-border-strong text-[11px] font-bold + name font-medium + SLA 12 subtle ml-auto` (`CatalogItemDetail.tsx:772-781`); estimated `p-4 rounded-lg bg-ois-primary-pale border-ois-primary/20 text-xs ois-text-muted vs text-sm font-semibold ois-primary ~Xd · localeDate` + `You'll receive email… text-xs muted` (`CatalogItemDetail.tsx:785-793`); footer Edit form `border-ois-border-strong ArrowLeft 14` + Submit `Can module request action create fallback Sign in as end user… italic text-xs ois-text-subtle` else button `bg-ois-primary disabled:opacity-60 Loader2 14 animate-spin Submitting… else Submit request ArrowRight 14` → `handleSubmit setTimeout 900 + REQ-2026-XXXXX random 500+343 padStart 5` `setNewReqId setSubmitted true setStep(3)` (`CatalogItemDetail.tsx:524-535,804-823`).
- Step 3 Success `max-w-md mx-auto text-center py-12` (`CatalogItemDetail.tsx:829-860`): `w-16 h-16 rounded-full bg-ois-success-pale ring-8 ring-ois-success/10 CheckCircle2 32 ois-success mb-5` + `h2 text-2xl font-extrabold Request submitted!` + `font-mono text-sm ois-text-muted newReqId` + `text-sm font-semibold item.name` + `text-sm ois-text-muted Awaiting {workflowTemplate[0].name??approval}` + `text-xs ois-text-subtle Estimated localeDate + Redirecting…` + buttons Track status `bg-ois-primary ArrowRight 14 → /portal/my-requests` + Submit another `border-ois-border-strong hover:bg-ois-surface-muted` → `handleReset step 0 initValues clear` (`CatalogItemDetail.tsx:537-544`) + auto-redirect `useEffect submitted setTimeout 3000 navigate /portal/my-requests` (`CatalogItemDetail.tsx:481-487`); NotFound fallback `Package 32 ois-text-subtle + text-lg font-bold Catalog item not found + text-sm muted + text-sm font-semibold ois-primary ArrowLeft Back to catalog` (`CatalogItemDetail.tsx:438-447`), loading `p-6 text-sm ois-text-muted Loading…` if `!catalogData` else NotFound (`CatalogItemDetail.tsx:490-491`).
- `MyRequests` (`MyRequests.tsx:294-405`) header `flex justify-end mb-6 New request Plus 15 bg-ois-primary hover:bg-ois-primary-hover rounded-lg px-4 py-2 active:scale-95 → /portal/catalog` (`MyRequests.tsx:326-332`); tabs+sort row `flex justify-between border-b border-ois-border mb-5` tabs `all|active|completed|drafts` `TabBtn px-4 py-2.5 text-sm font-semibold border-b-2 active border-ois-primary text-ois-primary else border-transparent text-ois-text-muted hover:text-ois-text` count `text-[10px] font-bold px-1.5 py-0.5 rounded-full active bg-ois-primary text-white else bg-ois-surface-muted text-ois-text-subtle` (`MyRequests.tsx:239-259,338-346`), sort `FilterDropdown value newest|oldest|status placeholder Newest first Newest/Oldest/By status` → `sortRequests` `oldest createdAt asc, status by ORDER pending_user,submitted,in_fulfillment,approved,draft,fulfilled,closed,rejected,cancelled else newest desc` (`MyRequests.tsx:279-288,351-359`); filter by requester `user.isSuperadmin ? all else requesterId===user.id` (`MyRequests.tsx:301-308`) derived counts `active submitted/approved/in_fulfillment/pending_user, completed fulfilled/closed, drafts draft` (`MyRequests.tsx:51-53,309-316`) + `listed = sortRequests(base by tab)` memo (`MyRequests.tsx:318-322`).
- `RequestCard` (`MyRequests.tsx:129-235`) `bg-ois-surface border rounded-ois-card shadow-ois-card overflow-hidden hover:shadow-ois-card-hover` `isRejected border-ois-danger/30 else border-ois-border`: top bar `flex justify-between px-5 py-2.5 border-b bg/border from STATUS_META` dot `w-2 h-2 rounded-full dot` + label `text-xs font-bold text` + `font-mono text-[10px] ois-text-subtle publicId` (`MyRequests.tsx:143-152`); body `px-5 py-4` title `text-sm font-bold ois-text` + meta `CatIcon 11 catColor + text-[11px] ois-text-muted capitalize catalogCategory + · text-ois-border-strong + submittedAt formatRelative + slaBreached AlertCircle 10 ois-danger SLA breached` (`MyRequests.tsx:156-177`) + `View details ChevronRight 12 text-[11px] font-semibold ois-primary hover:underline → /requests/${id}` (`MyRequests.tsx:179-185`); `CardStepper` steps `mt-3 mb-1` node row `flex gap-0` `w-5 h-5 rounded-full text-[9px] font-bold shrink-0` done `bg-ois-success text-white Check 9` else active `bg-ois-primary text-white ring-[3px] ring-ois-primary/25` else rejected `bg-ois-danger text-white ✗` else skipped `bg-ois-border` else pending `bg-ois-surface border-2 border-ois-border-strong` with connector `flex-1 h-px mx-1 min-w-[8px] done bg-ois-success else bg-ois-border-strong` (`MyRequests.tsx:70-99`); label row `flex mt-1` per step `minWidth 20 maxWidth 64 text-[9px] font-medium text-center break-words active ois-primary done ois-success else ois-text-subtle truncated 12→11…` (`MyRequests.tsx:103-123`); footer `mt-2 text-[11px] ois-text-muted flex gap-1.5 flex-wrap` branches isDone `CheckCircle2 11 ois-success Closed/Fulfilled completionDate` vs isRejected `XCircle 11 ois-danger Rejected — decisionNote truncate` vs draft `text-ois-text-subtle Not yet submitted. Continue → ois-primary link /portal/catalog/${catalogItemId}` vs activeStep `Clock 10 activeStep.name font-medium ois-text + assigneeName · ois-text-subtle + Est. completionDate ml-auto` (`MyRequests.tsx:168-234`); status meta 9 `dot/bg/border/text` (`MyRequests.tsx:18-30`) draft `bg-ois-surface-muted`, submitted `ois-info/info-pale`, approved `ois-success/pale`, in_fulfillment `ois-warning/pale` `border-[#F79009]/20`, pending_user `purple-500/600/50`, fulfilled `ois-success/pale`, closed/cancelled `ois-surface-muted`, rejected `ois-danger/pale` (`MyRequests.tsx:18-30`); category icons `CATEGORY_ICONS` Key/Laptop/Package/Mail/Users/Folder + `CATEGORY_COLORS` access `ois-primary` equipment `ois-info` etc (`MyRequests.tsx:32-48`).
- `EmptyState` per tab (`MyRequests.tsx:263-273`) `flex-col items-center py-20 w-12 h-12 bg-ois-surface-muted rounded-xl icon 22 ois-text-subtle + text-sm font-semibold + text-xs ois-text-muted sub with Link Browse catalog`: active `CheckCircle2 22 No active requests + ShoppingBag 12 Browse catalog`; completed `ClipboardList 22 No completed requests yet`; drafts `Inbox 22 No saved drafts + Start from catalog`; all `ShoppingBag 22 You haven't submitted any requests yet + Browse catalog ArrowRight 11`.

**Stub / Partial:**
- `catalogRepo` is `documents` generic (`server/repositories/docs.ts` via `listByKind` — verify), `GET /catalog` returns `catalogRepo.list(tenantId, pagination)` with `request.read` gate (`itsm.ts:172-175`) but client `requestsService.catalog()` does not send `page/pageSize` — server `parsePagination` defaults; tidak ada `GET /catalog/:publicId` detail endpoint — detail lookup is client `mockCatalogItems.find(id==itemId)` (`CatalogItemDetail.tsx:464-467`) dari `catalog()` full list; tidak ada `POST /requests` real — submit di `CatalogItemDetail.tsx:527-534` masih `setTimeout 900 → REQ-2026-random` simulated, akan di-wire di M7 (`docs/pages/portal.md:175`).
- `file_upload` field type mengembalikan `'uploaded'` placeholder (`CatalogItemDetail.tsx:305`) — belum upload ke storage backend; `user_picker/ci_picker` hanya text input fallback, bukan `UserPickerModal`/CMDB search seperti incident.
- `Recommended` masih `RECOMMENDED_SLUGS` static 3 + `recommended` top 6 popularity (`PortalHome` & `Catalog`) — belum personalized per role/recent activity (see `docs/pages/portal.md:192` gap).
- `ServiceDeskModal` masih simulated agent `generateAgentReply` keyword password/hardware/access/incident/thank (`PortalHome.tsx:109-127`) + `agentTyping 900+random 700ms` (`PortalHome.tsx:166-175`), belum LLM real (`docs/pages/portal.md:190`).
- `Your Activity` link `View details → /requests/:id` (`PortalHome.tsx:517`) keluar dari Portal shell ke agent view — portal detail `MyRequests → /requests/${id}` sama; belum ada dedicated portal request detail read-only (spec gap vs requests detail).
- `Catalog search → filterAndSort` masih client-side includes + `scoreItem` heuristic; tidak ada debounce, tidak ada `?q=` URL persist selain initial `searchParams.get('q')` mount (`Catalog.tsx:294-304`) dan `handleSearch navigate ?q=` dari Home (`PortalHome.tsx:313`).
- `MyRequests` `user.isSuperadmin sees all` (`MyRequests.tsx:303`) — demo richness but scope leakage vs `scoped.serviceRequests.list` server filter; `isMyTeam` dll belum ada.
- `estimatedCompletion` di Portal masih `now + slaHours` date lokal + `estimatedDaysFromHours(Math.ceil(hours/8))` as business-day approximation (`CatalogItemDetail.tsx:45-55`); tidak sync dengan `ServiceRequest.estimatedCompletion` server `totalSlaHours` + SLA pause logic.
- No skeleton for `catalogData` loading — `PortalHome`/`Catalog` render `data ?? []` instant empty then populate; detail shows plain `Loading…` text not shimmer.
- No realtime socket `tenant:{tenantId}` / `request:{publicId}` untuk portal tracking — My Requests hanya `useResource` mount.

**Missing (vs spec):**
- `POST /requests` real create dari wizard (payload `catalogItemId + formData + publicId REQ-...`) + error banner + 403 scope_violation; saat ini states lokal `FormValues/FormErrors/submitting/submitted`.
- Server-side pagination `?page=&pageSize=` + UI footer `Showing X of N`; client `requestsService.list()` tanpa query.
- Column customization / saved filter views / `field:value` search parser seperti incidents — portal search hanya flat includes.
- File upload storage (S3/R2) + progress + preview; `file_upload` field belum end-to-end.
- Personalization `recommended` by role/recent + `POPULAR_SEARCHES` dynamic by popularity/views (masih hardcoded 5 `laptop|github access|vpn|...`).
- Real Service Desk chat (LLM/agent) + `talk to service desk` hours gating + typing indicator server.
- SLA breach warn di portal request cards `slaWarning` pulse — hanya `slaBreached` text (`MyRequests.tsx:168-177`).
- Accessibility focus trap di modal + keyboard `Esc` close sudah via overlay click only.

## Primary View — Portal Home (`/portal`)

Layout: **hero + quick actions 4 + 2-col activity + popular 6 + footer**, within `PortalLayout` shell. `min-h-full pb-16` scroll owner di outlet.

### Hero + Search

```
[decor circles] What can we help you with today, {firstName}?
"Request services, find answers, or track your open items."
[Search 18 + input Search the catalog or knowledge base… + X clear + Search button] → /portal/catalog?q=...
Popular: laptop · github access · vpn · slack channel · password reset
```

- Outer `relative -mx-6 -mt-6 px-6 pt-12 pb-10 bg linear-gradient 135deg #EEF2FF 0% #E0E9FF 40% #F0F7FF 100%` + absolute circles; inner `max-w-2xl mx-auto text-center`; title `text-3xl font-extrabold tracking-tight text-ois-text` firstName `text-ois-primary`; subtitle `text-sm text-ois-text-muted mb-7`.
- Form `relative`: container `flex bg-white rounded-xl shadow-ois-modal border-ois-border focus-within:ring-2 focus-within:ring-ois-primary/25` `Search 18 ml-4 ois-text-subtle` + input `flex-1 px-3 py-3.5 text-sm outline-none` + clear `X 14 p-1.5 rounded-md hover:bg-ois-surface-muted` + submit `px-4 py-2 rounded-lg bg-ois-primary hover:bg-ois-primary-hover font-semibold text-sm active:scale-95`.
- Tags `flex justify-center gap-2 flex-wrap mt-4`: label `text-xs font-medium ois-text-muted Popular:` + pills `px-2.5 py-1 rounded-full bg-white/80 border-ois-border text-ois-text-muted hover:text-ois-primary hover:border-ois-primary/40 hover:bg-white`.

### Quick Actions (4)

`grid 2 lg:4 gap-4` `group bg-ois-surface rounded-ois-card border-ois-border shadow-ois-card p-5 gap-3 flex-col hover:shadow-ois-card-hover hover:-translate-y-0.5 hover:border-*` + `w-10 h-10 rounded-lg bg` + `item.icon 20 color` + title `text-sm font-bold group-hover:text-ois-primary` + desc `text-xs ois-text-muted` + sub `text-[11px] ois-text-subtle pt-2 border-t border-ois-border mt-auto` + `ArrowRight 14 absolute top-5 right-4 opacity-0→100 -translate-x-1→0 color`. Browse → `/portal/catalog`, My Requests → `/portal/my-requests` with `${count} open`, KB → `/kb`, Talk → `onClick open ChatModal`.

### Your Activity / Articles for you

```
[ClipboardList 15 ois-primary Your active requests 11px uppercase tracking-widest [n badge]] — View all →
No active requests. CheckCircle2 28 ois-success opacity-60 + Browse catalog  OR  max 3 active requests divide-y
[BookMarked 15 Articles for you] — Browse KB →   |   Recommended based on role… 3 links
```

- Each card `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card overflow-hidden`; header `flex justify-between px-5 py-3.5 border-b` label `text-xs font-bold uppercase tracking-widest` + `o-...`.
- Active request row inside `hover:bg-ois-surface-muted group px-5 py-4`: meta row `dot w-1.5 h-1.5 + label text-[11px] font-semibold color + mono publicId 10 subtle + ChevronRight 13 hover ois-primary`, title `text-sm font-semibold`, activeStep `Clock 10 text-xs ois-text-muted`, `MiniStepper` see component `flex gap-0.5 flex-wrap mt-3` node `w-5 h-5 rounded-full text-[9px] font-bold` done `bg-ois-success` active `bg-ois-primary ring-2 ring-ois-primary/30` pending `bg-ois-surface border-2 border-ois-border-strong` rejected `bg-ois-danger` skipped `bg-ois-border`, label `text-[9px] max-w-[52px] line-clamp active ois-primary else ois-text-subtle`, connector `h-px min-w-[12px] max-w-[32px] mb-4 bg-ois-success if done else bg-ois-border-strong`; footer `text-[10px] ois-text-subtle Started formatRelative · Est. localeDate`.

### Popular Catalog Items

`flex justify-between mb-4` title `text-base font-bold Popular requests` sub `text-xs ois-text-muted Most requested in last 30 days` + `View all 12 items → /portal/catalog`; grid `grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3` card `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-4 flex-col items-center text-center gap-2 hover:-translate-y-0.5 hover:border-ois-primary/30` with `w-10 h-10 rounded-xl bg-ois-primary-pale getLucideIcon 20 ois-primary` + name `text-xs font-bold group-hover:ois-primary` + eta `Clock 9 ~Xd/Same day text-[10px] ois-text-subtle` + `Request → text-[10px] font-semibold text-ois-primary group-hover:underline mt-auto`.

### Footer

`mt-12 pt-6 border-t border-ois-border flex justify-between gap-3` title `text-xs font-semibold Need urgent help?` + `text-xs ois-text-muted Call … ext. 4357 tel:+14357 text-ois-primary hover:underline · itservicedesk@acme.io mailto + Hours: Mon–Fri 8am–6pm UTC · After hours: emergency only text-[11px] ois-text-subtle`.

## Primary View — Catalog (`/portal/catalog`)

Layout: **search + category strip + 2-state content (Recommended+Browse OR Results+Sort)**. `min-h-full pb-16 p-6`.

### Header + Search + Categories

- Intro `mb-6 text-sm ois-text-muted Request services… <span font-medium ois-text N items available.>` (`Catalog.tsx:339-344`).
- Search bar (`Catalog.tsx:348-366`): same style as Home `bg-ois-surface rounded-xl border-ois-border shadow-ois-card focus-within:ring-ois-primary/25 overflow-hidden flex` `Search 17 ml-4 ois-text-subtle + input flex-1 px-3 py-3 text-sm outline-none + X clear when query + setQuery + setSort relevant`.
- Suggestion chips when `!query` (`Catalog.tsx:369-381`): label `text-[11px] ois-text-subtle Suggestions:` + 7 `rounded-full border-ois-border bg-ois-surface text-ois-text-muted hover:text-ois-primary`.
- Category strip `flex flex-wrap gap-2 mb-6` (`Catalog.tsx:386-426`): All `count allEnabled.length` + 6 categories where `count>0` per `categoryCounts` (`Catalog.tsx:312-316`) with `CatIcon 11` + `label (count)` + active color `meta bg+color border-current` from `CATEGORY_META`; Clear filters chip when `isSearching` `ml-auto flex gap-1 text-xs ois-danger border-ois-danger/30 hover:bg-ois-danger-pale X 11`.

### Default State (`!isSearching` → `space-y-10` `Catalog.tsx:430-460`)

1. **Recommended for you:** header `Sparkles 14 ois-primary + text-xs font-bold uppercase tracking-widest ois-text-subtle`; grid `1 md:2 xl:3 gap-3` 6 `RecommendedCard`.
2. **Browse by category:** header `text-xs font-bold uppercase tracking-widest`; grid `2 md:3 lg:6 gap-3` 6 `CategoryTile` with preview 3 names joined `·` (`Catalog.tsx:215`), active toggles `catFilter===cat` → `border-ois-primary bg-ois-primary-pale` else hover.

### Search State (`isSearching` → results OR empty)

- **Empty** (`Catalog.tsx:463-488`): `flex-col items-center py-24` icon `w-14 h-14 bg-ois-surface-muted rounded-xl SearchX 24 ois-text-subtle` + `text-sm font-bold No catalog items match "q"` + `text-xs ois-text-muted Try fewer…` + row `Browse all categories text-xs font-semibold ois-primary hover:underline onClick clearAll` + `· text-ois-border-strong` + `Contact Service Desk mailto`.

- **Results** (`Catalog.tsx:490-505`): header `flex justify-between mb-4` count `text-sm ois-text-muted <b ois-text N result(s) for "q" in Label>` + `SortDropdown`; `space-y-3 ResultCard × N`. Sort `relevant/popular/fastest/newest` via `SortDropdown` (`Catalog.tsx:245-287`); relevant uses `scoreItem` heuristic 10/5/4/3/2; popular by `popularity desc`; fastest `estimatedFulfillmentDays asc`; newest `createdAt desc` fallback `popularity` (`Catalog.tsx:76-82`).

### ResultCard / RecommendedCard Details

See Working above. Notable patterns:
- `highlight query` → split regex escaped `(q)` gi + `<mark bg-yellow-100 text-yellow-800 rounded px-0.5 font-medium>`.
- Cost badge only if `item.cost`: `bg-ois-warning-pale text-ois-warning text-[11px] font-medium px-2 py-0.5 rounded-full USD 1,250+` else none; No cost shown only in hero strip of detail.
- `ResultCard` CTA primary `bg-ois-primary` right-aligned; `RecommendedCard` link whole card hover `-translate-y-0.5`.

## Wizard — Catalog Item Detail (`/portal/catalog/:itemId`)

Layout: **breadcrumb + hero strip + stepper + 4-step content** `min-h-full pb-16` full-width within `AppShell` (outside PortalLayout children — but breadcrumb offers `Portal` `/portal` > `Catalog` `/portal/catalog` > `item.name`).

### Breadcrumb + Hero

- Breadcrumb `flex gap-2 text-xs ois-text-muted mb-4` buttons `Portal / Catalog hover:text-ois-primary` + `ChevronLeft rotate-180 12` + current `text-ois-text font-medium truncate` (`CatalogItemDetail.tsx:551-557`).
- Hero strip `flex gap-4 p-5 bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card mb-8` icon `w-14 h-14 rounded-xl cat bg GetLucideIcon 28` + `h1 text-xl font-extrabold` + badges: `publicId font-mono text-[10px] bg-ois-surface-muted px-1.5 py-0.5 rounded` + category `rounded-full bg+color text-[11px] font-semibold` + `Clock 10 etaLabel bg-ois-surface-muted rounded-full text-[11px] text-ois-text-muted` + cost `bg-ois-warning-pale text-ois-warning` or `No cost bg-ois-success-pale text-ois-success` (`CatalogItemDetail.tsx:560-591`).

### Stepper (hidden after submit)

`StepperNav current step 0..3` (`CatalogItemDetail.tsx:94-130`): `STEPS Item info/Form/Review/Submit` `w-8 h-8 border-2 rounded-full` states done/active/pending + label `text-[10px] font-semibold` + connector `flex-1 h-0.5 mb-5`.

### Step 0 → Item Info

`grid lg:[1fr_320px] gap-6`:
- Left ~+ Right `Workflow preview / Owned by / Recently fulfilled` (see Working). Key: `renderDescription` splits `\n` → bullet if `- ` + dot `w-1.5 h-1.5 bg-ois-primary` else bold `**...**` heading `text-xs font-bold uppercase tracking-widest` else `text-sm ois-text-muted leading-relaxed` with inline `**bold**`.
- Continue button `Continue ArrowRight 15 bg-ois-primary`.

### Step 1 → Form

`max-w-2xl mx-auto card p-6` with 8+ field types, conditional, validation.

**DynamicField rendering** (`CatalogItemDetail.tsx:141-325`) details:
- Label row `text-sm font-semibold ois-text + * ois-danger if required`.
- `select` → `FilterDropdown value strVal onChange fullWidth options field.options + placeholder Select…`.
- `multiselect` → stack `space-y-1.5` each option `flex gap-2.5 px-3 py-2 rounded-lg border-ois-border hover:bg-ois-surface-muted group` custom check `w-4 h-4 rounded border-2 checked bg-ois-primary border-ois-primary Check 10 white`.
- `textarea rows 5 resize-none + counters text-[11px] mt-1 Checked ≥minLength? ois-success:ois-text-subtle + maxLen counter`.
- `text/email/number input type + placeholder min/max + cn(base,errCls)`.
- `date input type=date + CalendarDays 14 absolute`.
- `checkbox` full label card `flex gap-3 px-4 py-3 rounded-lg border checked border-ois-primary bg-ois-primary-pale else border-ois-border` + same custom box `w-4 h-4` + label text `text-sm ois-text` inline required star.
- `user_picker/ci_picker` simplified text input placeholder `Search for a user/CI…`.
- `file_upload dashed border-2 rounded-lg px-4 py-6 border-ois-border-strong hover:border-ois-primary/50 Upload 16 Click to upload… sr-only file` returning `'uploaded'`.
- Help `Info 11 text-xs ois-text-subtle` + error `AlertCircle 11 text-xs ois-danger`.

**Visibility & validation:**
- `isFieldVisible(field, values)` if `showWhen` `values[fieldId]===value` else visible (`CatalogItemDetail.tsx:385-388`).
- `validateForm` required checks + `minLength * && <min → err "Min .. (n entered)"` + `maxLength > max` (`CatalogItemDetail.tsx:390-420`).
- `visibleFields = formFields.filter isFieldVisible` (`CatalogItemDetail.tsx:503`); `handleFieldChange` clears per-field error; `handleToReview` runs validate, `scrollIntoView field-${firstId}` or `setStep(2)` + scroll top; Back `setStep(0)`; Review `bg-ois-primary`.

### Step 2 → Review

Card `border-ois-border rounded-ois-card overflow-hidden` + header `bg-ois-surface-muted border-b px-6 py-4 h2 text-base font-bold Review + text-xs muted You're about to request: name`; body `p-6 space-y-4`:
- Form responses header `text-xs font-bold uppercase tracking-widest` + `divide-y rounded-lg border-ois-border` rows `flex gap-4 px-4 py-3 text-sm label w-44 ois-text-muted font-medium vs value ois-text break-words via getFieldDisplayValue`.
- Workflow header + `space-y-1` step rows `w-5 h-5 rounded-full bg-ois-surface-muted border-ois-border-strong text-[11px] font-bold + name font-medium + SLA subtle ml-auto`.
- Estimated `bg-ois-primary-pale border-ois-primary/20 rounded-lg p-4` title `text-xs ois-text-muted Estimated completion` value `text-sm font-semibold ois-primary ~Xd · localeDate` body `text-xs ois-text-muted You'll receive email…`.
- Footer `flex justify-between` Edit form `border-ois-border-strong ArrowLeft 14` + Submit `Can request.create fallback italic ois-text-subtle Sign in as end user…` else `bg-ois-primary disabled:opacity-60 → Submitting… Loader2 spin else Submit request ArrowRight` (`CatalogItemDetail.tsx:797-824`).

### Step 3 → Submitted

Hidden behind `submitted && step===3` (`CatalogItemDetail.tsx:829`):
- `w-16 h-16 bg-ois-success-pale ring-8 ring-ois-success/10 CheckCircle2 32 ois-success` + `text-2xl font-extrabold Request submitted!` + `font-mono text-sm ois-text-muted REQ-2026-xxxxx` + `text-sm font-semibold name` + `text-sm ois-text-muted Awaiting approval/task` + `text-xs ois-text-subtle Estimated localeDate + Redirecting in a moment…` + `Track status bg-ois-primary ArrowRight → /portal/my-requests` + `Submit another border-ois-border-strong → handleReset`.
- Auto-redirect 3s; `submitted` hides stepper (`CatalogItemDetail.tsx:594 !submitted`).

## My Requests View (`/portal/my-requests`)

Layout: **header CTA + Tabs+Sort bar + card list / empty per tab**. `min-h-full pb-16 p-6`.

### Header Tabs Row

- Top right CTA `Link /portal/catalog Plus 15 New request bg-ois-primary rounded-lg px-4 py-2 active:scale-95` (`MyRequests.tsx:326-332`).
- Bar `flex justify-between border-b border-ois-border mb-5` left `flex gap-0 overflow-x-auto` 4 `TabBtn` `px-4 py-2.5 text-sm font-semibold border-b-2 active ois-primary else transparent ois-text-muted` count `text-[10px] font-bold rounded-full px-1.5 py-0.5 active bg-ois-primary text-white else bg-ois-surface-muted ois-text-subtle`; right sort `FilterDropdown` `value newest/oldest/status`.

### RequestCard & Stepper

See Working for `RequestCard` structure: colored top bar `STATUS_META bg/border` per 9 statuses, footer branch by state (done/rejected/draft/activeStep). `CardStepper` nodes `w-5 h-5` done/active/rejected/skipped/pending + connectors `h-px`.

### Data Derivation

- `all = user.isSuperadmin ? mockServiceRequests : filter requesterId===user.id` (`MyRequests.tsx:303-306`) — scoped read on server is `own` vs `all` vs `team_app`, see Permissions.
- `ACTIVE_STATUSES ['submitted','approved','in_fulfillment','pending_user']` etc. (`MyRequests.tsx:50-52`); `tabCounts all|active|completed|drafts`; `listed = sortRequests(tabBase, sort)` (`MyRequests.tsx:309-322`); sort `ORDER pending_user → submitted → in_fulfillment → approved → draft → fulfilled → closed → rejected → cancelled` for `status` (`MyRequests.tsx:282`).

### Empty / Loading / Error

Four empties (`MyRequests.tsx:366-397`):
- active `CheckCircle2 22 No active requests + ShoppingBag 12 Browse catalog`
- completed `ClipboardList 22 No completed requests yet`
- drafts `Inbox 22 No saved drafts + Start from catalog`
- all `ShoppingBag 22 You haven't submitted any requests yet + Browse catalog ArrowRight`

Each `EmptyState flex-col items-center py-20 w-12 h-12 bg-ois-surface-muted rounded-xl ois-text-subtle + text-sm font-semibold + text-xs ois-text-muted sub`.

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Search catalog | Home hero submit or Catalog input `setQuery` + `setSort relevant` | `request.read` (browse any auth) | — |
| Filter by category | Catalog tile `onClick catFilter toggle` or pill `All` | `request.read` | — |
| Sort results | `SortDropdown` select relevant/popular/fastest/newest | `request.read` | `isSearching` |
| Open catalog item | `ResultCard` Request link / `RecommendedCard` whole card `Link /portal/catalog/:id` / Popular card same | `request.read` | `enabled:true` (filtered `Catalog.tsx:60`) |
| Continue Item Info → Form | Step 0 Continue `setStep(1)` | `request.read` | — |
| Fill dynamic form | `DynamicField` inputs + `handleFieldChange` clearing error | `request.create` (review gate) | visible by `isFieldVisible showWhen` |
| Review form | Step 1 Review `handleToReview` validate → scroll to error else `setStep(2)` | `request.create` | no validation errors |
| Submit request | Step 2 Submit request `handleSubmit setTimeout 900 → REQ-2026-* setSubmitted setStep(3)` | `request.create` gated `Can module request action create` (`CatalogItemDetail.tsx:804`) else fallback italic | `step===2` + valid form |
| Track status | Success Track status `navigate /portal/my-requests` or auto 3s | `request.read own` | submitted |
| Submit another | Success Submit another `handleReset setStep0 initValues` | — | submitted |
| New request from My Requests | `New request Plus → /portal/catalog` | `request.create` | — |
| View details (agent view) | `RequestCard View details ChevronRight 12 → /requests/:id` or Home active `View details → /requests/:id` | `request.read` (own/IFM/APS) | — |
| Continue draft | `RequestCard` draft `Continue → /portal/catalog/:catalogItemId` | `request.create` | `status draft` |
| Open Service Desk chat | Home Quick action Talk `setChatModalOpen(true)` → `ServiceDeskModal` send `handleSend` + `generateAgentReply` 900ms | — (any auth) | — |
| Filter My Requests | Tabs `all/active/completed/drafts` `setTab` + Sort `FilterDropdown newest/oldest/status setSort` | `request.read own` | own requests (`user.id` vs `isSuperadmin`) |
| Back navigation | Detail breadcrumb `Portal / Catalog` buttons `navigate /portal|/portal/catalog` + Step Back/Edit form `setStep 0/1` | — | — |

Delegate to `_shared/entity-detail-page.md` (detail pattern for future portal request detail), `_shared/entity-comments.md` (comments not in portal today — delegated to `/requests/:id` comments tab), `_shared/filter-sort-export.md` (search/sort/filter), `_shared/create-flow.md` (wizard pattern shared with `NewChange`).

## Filters / Sort / Search

### Catalog

- **Search:** `query` `useState(searchParams.get('q') ?? '')` text input in PortalHome hero → `/portal/catalog?q=` + Catalog local `query` `onChange setQuery + setSort relevant` + sync `useEffect searchParams.get q focus` (`Catalog.tsx:294-304`). `filterAndSort` lowercase includes over `name/shortDescription/description/tags/category/publicId` (`Catalog.tsx:67-72`); `isSearching = query.trim()||catFilter!='all'` drives 2-state UI.
- **Category filter:** `catFilter Category|'all' useState('all')` — pill `All` `catFilter==='all'` bg primary else muted, per cat `CATEGORY_META icon+label (count)` `categoryCounts` counts from `allEnabled.filter category` (`Catalog.tsx:309-315`), tile toggle `setCatFilter(prev===cat?'all':cat)` (`Catalog.tsx:330-332`).
- **Sort:** `sort SortValue useState('relevant')` 4 options `SORT_OPTIONS` `Most relevant|popular|fastest/newest` (`Catalog.tsx:24-30`) via `SortDropdown`; behavior: if `q + relevant → scoreItem b-a`, `popular → popularity desc`, `fastest → estimatedFulfillmentDays asc`, `newest → createdAt desc` else popularity (`Catalog.tsx:76-82`). Default `relevant` when searching else popularity fallback; switching search resets to `relevant` (`Catalog.tsx:354 setSort relevant`).
- **Suggestion chips:** `SUGGESTIONS 7` fixed `laptop|github|database|vpn|slack|monitor|software` when `!query` setQuery on click (`Catalog.tsx:32,373-380`); Home popular searches 5 fixed `laptop|github access|vpn|...` (`PortalHome.tsx:85`).
- **Count display:** Results `N result(s) for "q" in Category` with bold counts (`Catalog.tsx:493-497`); category tiles show `N item(s)` per category; header `N items available` (`Catalog.tsx:342`).

### My Requests

- **Tabs:** `tab TabKey useState('all')` 4 with `tabCounts` from filtered `all/active/completed/drafts`; `listed` selects base by tab then `sortRequests` (`MyRequests.tsx:296,318-322`).
- **Sort:** `sort SortKey useState('newest')` `FilterDropdown newest|oldest|status` (`MyRequests.tsx:276-288,351-359`); `newest createdAt desc`, `oldest asc`, `status ORDER pending_user first` etc.
- **Scope:** `all = isSuperadmin ? all : filter requesterId===user.id` via `useCurrentUser` (`MyRequests.tsx:301-308`) — matches server `request.read own` scope `requesterId===user.id`.
- **Search:** no extra search bar in My Requests — search belongs to Catalog; My Requests only tabs+sort (future gap).

### Home Search Persist

- Home `handleSearch(q) navigate(/portal/catalog?q=...)` (`PortalHome.tsx:312-316`) preserves `q` in URL; Catalog mounts `useState(() => searchParams.get('q') ?? '')` + `useEffect if q focus` (`Catalog.tsx:294-304`). Not syncing query back to URL after typing (only mount).

## State Lifecycle

Portal is creation front door; fulfillment state machine is canonical in [`requests.md`](./requests.md) & `src/types/request.ts:11-20`. Portal surfaces read-only lifecycle + submission entry.

```
draft → submitted → approved → in_fulfillment → pending_user → fulfilled → closed
                                                                    ↘ rejected / cancelled
```

- Creation: Wizard submit creates `ServiceRequest` (future `POST /requests` with `catalogItemId + formData + title/description + publicId REQ-YYYY-NNNNN`). Today simulated `REQ-2026-{500+random pad 5}` (`CatalogItemDetail.tsx:528-530`).
- Step instance: `WorkflowStepStatus pending→active→completed|skipped|rejected` (`src/types/request.ts:22`); portal shows only workflow preview pre-submit (`WorkflowStepTemplate[]`) with `slaHours` + `approverType/team/assigneeType` (`src/types/request.ts:76-86`); after submit detail shows `WorkflowInstance` with `currentStepIndex, steps[], decision/decisionNote/decidedAt`.
- Per-step decision: active approval `POST .../steps/:stepId/approve` note optional ≤2000 → `completed` next pending `→active`; reject note required ≥1 `→rejected` subsequent pending `→skipped` request `rejected`.
- Cancel: `PATCH .../cancel` reason 10..2000 skips active/pending, stamps `closedAt`; reassign active step `PATCH .../steps/:stepId/reassign` body `assigneeId+name`.
- SLA per-step `slaStatus healthy|warning|breached` derived `startedAt + slaHours` vs now; request-level `slaBreached boolean + totalSlaHours + estimatedCompletion` (`src/types/request.ts:107-110`); portal estimates `formatEstimatedCompletion(now+slaHours)` + `Math.ceil(hours/8)` business-day label.
- Portal pins: `CatalogItem.enabled` filters catalog (`Catalog.tsx:60`); `MyRequests` tabs map `ACTIVE submitted/approved/in_fulfillment/pending_user`, `COMPLETED fulfilled/closed`, `DRAFTS draft`; `rejected|cancelled` hidden from tabs except `all` + `CardStepper` shows ✗/— states. Links `MyRequests View details → /requests/:internalId` and `Home Your Activity → /requests/:id` escape portal.

Ref: `docs/features/requests.md` §State Lifecycle + `server/scope/scopedDb.ts:582-679`.

## Permissions (action-level)

Catalog browsable by any authenticated (`request.read` own/IFM/APS covers portal reads); submission gated separately.

| Permission | Who | Scope | Portal actions |
|------------|-----|-------|----------------|
| `request.read` own | Any authenticated (own) | `own` (`requesterId===user.id`) | Browse catalog, view own My Requests + own detail |
| `request.read` IFM | IFM any level (OCI/… any) | `all` | Read all in My Requests & catalog (superadmin demo) |
| `request.read` APS | APS Officer+ | `team_app` (`ownerTeamId===catalogItem.ownerTeamId`) | Read team-routed |
| `request.create` | Any authenticated (`permissions.ts:204-209`) | `all` create gate | **Submit request** in `CatalogItemDetail` Step 2 Review `Can request create` (`CatalogItemDetail.tsx:804`) — fallback `Sign in as end user…` |
| `request.update` | APS/IFM Officer+ | `team_app` / `all` | Comment/watcher/cancel/reassign — not in portal, via `/requests/:id` |
| `request.approve` | APS Team Lead+ `team_app` / IFM Team Lead+ `all` | scoped | Approve/reject — fulfillment view only, not portal |

Enforcement: portal client `useResource(requestsService.catalog/list)` hits `requirePermission('request.read')` (`itsm.ts:172-175`); submit `Can module='request' action='create'` controls Review button (`CatalogItemDetail.tsx:804`); server `req.scoped.serviceRequests.*` checks appId + `srCanWrite` → `ScopeViolationError 403 scope_violation` (`server/scope/scopedDb.ts`, `server/scope/errors.ts`).

Matrix view (from template, distilled):

| Role (level) | Browse Catalog | Submit (Wizard) | My Requests (own) | View fulfillment detail | Approve |
|--------------|---------------|-----------------|-------------------|-------------------------|---------|
| Any auth / requester | ✅ request.read own (browse) | ✅ request.create | ✅ own | — own only | ❌ |
| APS Member/Viewer | ✅ | ✅ | ✅ own + team if officer | team if officer | ❌ |
| APS Officer | ✅ | ✅ | ✅ team routed | ✅ team detail, comment/watch | ❌ |
| APS Team Lead+ | ✅ | ✅ | ✅ | ✅ + approve/reject team | ✅ team_app |
| IFM Officer+ | ✅ all | ✅ | ✅ all | ✅ all | — (lead gates approve) |
| IFM Team Lead+ | ✅ | ✅ | ✅ all (superadmin demo) | ✅ all | ✅ all |

Catalog `linkedKBSlugs → ArticleView /kb/:slug`, `ownerTeamId → teamsService` owner card, `formFields → requestsService` form summary.

## Empty / Loading / Error

- **Empty Home active:** `activeRequests 0 → flex py-8 text-center CheckCircle2 28 ois-success opacity-60 + text-sm ois-text-muted No active requests. + Link text-xs ois-primary font-semibold + Browse catalog → /portal/catalog` (`PortalHome.tsx:501-509`).
- **Empty Home recommended:** not empty — 3 filtered `RECOMMENDED_SLUGS`; if filtered none would render empty `—` (not handled).
- **Empty Catalog default:** 6 recommended + 6 tiles always; no empty since `allEnabled` fallback.
- **Empty Catalog searching (0 results):** `w-14 h-14 bg-ois-surface-muted rounded-xl SearchX 24 ois-text-subtle + text-sm font-bold No match + text-xs ois-text-muted Try fewer… + Browse all onClick clearAll + Contact Service Desk mailto` (`Catalog.tsx:464-488`).
- **Empty My Requests per tab:** `EmptyState py-20 w-12 h-12 bg-ois-surface-muted rounded-xl icon 22 ois-text-subtle + text-sm font-semibold + text-xs ois-text-muted sub`: active `CheckCircle2 No active requests + Browse catalog`, completed `ClipboardList No completed requests yet`, drafts `Inbox No saved drafts + Start from catalog`, all `ShoppingBag You haven't submitted… + Browse catalog ArrowRight`.
- **CatalogItemDetail 404:** `if (!item) !catalogData Loading… p-6 text-sm ois-text-muted else <NotFound />` (`CatalogItemDetail.tsx:489-491`) → `flex-col items-center py-32 Package 32 ois-text-subtle + text-lg font-bold Catalog item not found + text-sm ois-text-muted + Link text-sm font-semibold ois-primary ArrowLeft Back to catalog` (`CatalogItemDetail.tsx:438-447`).
- **CatalogItemDetail success empty:** not empty — success card always.
- **Loading:** no skeletons — `useResource` `data ?? []` renders empty then fills; detail shows plain `Loading…` (`PortalHome` Catalog MyRequests all pattern `const mock* = data ?? []`); Home popular etc. would transiently show 0.
- **Error:** no inline error banner — writes are simulated, `catch` not wired; server `request.read` failure would leave empty list silently; detail `404` handled, others silent.
- **Validation errors:** Field error `border-ois-danger focus:ring-ois-danger/20 + text-xs ois-danger AlertCircle 11 + message` (`CatalogItemDetail.tsx:143,319-322`); `minLength` counter green vs subtle, `maxLength` counter; checkbox error shows both inner field and parent duplicated help/error (`CatalogItemDetail.tsx:697-717`); Reject/Cancel gating uses counters but portal form only shows required errors.
- **RBAC denied:** Step 2 Review shows `fallback italic Sign in as end user to submit requests` inside `Can` (`CatalogItemDetail.tsx:806-809`); catalog browsing still allowed.

## Phase 2 Deferred

- Real `POST /api/v1/requests` from wizard (payload `catalogItemId, formData[], title, cost, estimatedCompletion`) with optimistic + error banner `bg-ois-danger-pale text-ois-danger + Retry`, 201 → success + `Location` header publicId — rationale: today simulated `REQ-2026-random` (`CatalogItemDetail.tsx:527-534`, `docs/pages/portal.md:15. Open Gaps`).
- File upload storage backend (S3/R2) for `file_upload` type + `user_picker/ci_picker` real pickers — rationale: field exists but returns `'uploaded'` placeholder.
- Recommendations personalization per role/recent activity + `POPULAR_SEARCHES/SUGGESTIONS` dynamic by popularity/views (current hardcoded 5/7 slugs).
- Real Service Desk LLM/agent integration replacing `generateAgentReply` keyword mock + hours routing/mon–fri — rationale: mock `Riley` with 900ms typing.
- `GET /catalog/:id` dedicated endpoint + server search/sort/pagination `?q=&category=&sort=&page=&pageSize=` — rationale: client `catalog()` full list + `filterAndSort` in-memory.
- URL persist for catalog `?q=&category=&sort=` + My Requests `?tab=&sort=` + Home `?q=` sync on typing (today only mount reads `q`).
- Portal-only request detail `/portal/my-requests/:requestId` read-only with `MiniStepper` + timeline + comments read-only — rationale: today `View details → /requests/:id` escapes to agent view.
- `Save as draft` (`draft` status) + `My Requests Drafts` continue with pre-filled form + `isMyTeam`/assignment chips — rationale: drafts tab exists but create always submitted in wizard.
- SLA warning pulse + progress bar pause when `pending_user` + `NOW` ticker interval (today `Date.now()` snapshot) — rationale: SLA elapsed not ticking.
- Bulk selection + export like incidents `selectedIds` + column customization/saved views/field:value search parser full-text — no priority now (portal is browse-first).
- Skeleton loaders for hero/quick actions/catalog lists + realtime `tenant:{tenantId}` subscription for My Requests auto-refresh.
- File download + inline markdown rich `renderDescription` upgrade (full MDX table/code/anchor) shared with `ArticleView`.

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/portal/*` + `docs/pages/portal.md`):

1. **PortalLayout shell** `-m-6 flex flex-col bg-ois-bg calc(100vh-3.5rem) + header bg-ois-surface border-b border-ois-border shrink-0 z-30` + left `w-1 shrink-0 transition-colors duration-500` accent dynamic `pending_user #DC6803 : in_fulfillment #1F4FD4 : #12B76A` (`PortalLayout.tsx:25-31`) — jangan ganti ke `Module Layout` lain; + stats row `text-xs ois-text-muted dots w-1 h-1 bg-ois-border-strong`.
2. **Tab bar** `nav flex px-4 overflow-x-auto scrollbar-hide` `NavLink px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap flex gap-2` icon `14` active `border-ois-primary text-ois-primary` else `border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong transition-colors` (`PortalLayout.tsx:57-74`) — sama pattern `MonitoringLayout/AvailabilityLayout/CapacityLayout`.
3. **Hero gradient + circles** `linear-gradient 135deg #EEF2FF #E0E9FF #F0F7FF 100%` `relative -mx-6 -mt-6 px-6 pt-12 pb-10 overflow-hidden` + decorative `rounded-full bg-ois-primary/5 bg-ois-primary/4 bg-ois-info/6` (`PortalHome.tsx:322-331`) — jangan flatkan.
4. **Search box** `flex bg-white rounded-xl shadow-ois-modal border-ois-border focus-within:ring-2 focus-within:ring-ois-primary/25 focus-within:border-ois-primary overflow-hidden transition-all` + `Search 17-18 ml-4 ois-text-subtle + input text-sm placeholder ois-text-subtle + X 14 rounded-md hover:bg-ois-surface-muted + primary button rounded-lg bg-ois-primary hover:bg-ois-primary-hover active:scale-95` (used in both Home hero `rounded-xl` and Catalog `shadow-ois-card` — preserve both).
5. **Quick action card** `bg-ois-surface rounded-ois-card border-ois-border shadow-ois-card p-5 gap-3 flex-col hover:shadow-ois-card-hover hover:-translate-y-0.5 hover:border-ois-primary/40` + `w-10 h-10 rounded-lg bg bg-ois-primary-pale|warning-pale|success-pale|purple-50` + `ArrowRight 14 absolute top-5 right-4 opacity-0→100 -translate-x-1→0 transition-all color` (`PortalHome.tsx:436-461`) — extend don't replace.
6. **MiniStepper / CardStepper** node `w-5 h-5 rounded-full text-[9px] font-bold` states `completed bg-ois-success text-white ✓ vs rejected bg-ois-danger ✗ vs active bg-ois-primary text-white ring-[3px] ring-ois-primary/25 vs pending bg-ois-surface border-2 border-ois-border-strong text-ois-text-subtle numbered 1..N vs skipped bg-ois-border` + connector `h-px min-w/max bg-ois-success if done else bg-ois-border-strong` + label row `text-[9px] max-w-[52-64px] break-words active ois-primary done ois-success else ois-text-subtle` (`PortalHome.tsx:50-81`, `MyRequests.tsx:67-125`) — same shape everywhere, don't hardcode count.
7. **ResultCard** `group bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:border-ois-primary/30 p-5 flex gap-4` + icon `w-11 h-11 rounded-xl cat bg` + title `group-hover:text-ois-primary` with `mark bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic font-medium` highlight + category `rounded-full CatIcon 10 bg+color` + ETA `Clock 10 bg-ois-surface-muted ois-text-muted` + cost `bg-ois-warning-pale ois-warning` + CTA `bg-ois-primary rounded-lg hover:bg-ois-primary-hover active:scale-95` (`Catalog.tsx:94-162`) — don't collapse to compact list.
8. **CategoryTile + Category pill** `rounded-ois-card border shadow-ois-card p-4` `w-8 h-8 rounded-lg bg active bg-ois-primary text-white vs meta bg+color` + active `border-ois-primary bg-ois-primary-pale shadow-ois-card-hover` else `hover:shadow-ois-card-hover hover:border-ois-primary/30 hover:-translate-y-0.5`; pills `rounded-full px-3 py-1.5 text-xs font-semibold border active meta bg+color border-current else bg-ois-surface text-ois-text-muted border-ois-border hover` (`Catalog.tsx:206-241`, `386-417`) — colors per `CATEGORY_META` #1F4FD4 access etc.
9. **StepperNav (wizard)** `max-w-xl mx-auto gap-0 mb-8` `w-8 h-8 rounded-full border-2 text-xs font-bold` done `bg-ois-success border-ois-success Check 14` vs active `bg-ois-primary border-ois-primary ring-4 ring-ois-primary/20` vs pending `bg-ois-surface border-ois-border-strong ois-text-subtle` + label `text-[10px] font-semibold done ois-success active ois-primary` + connector `flex-1 h-0.5 mx-1 mb-5 bg-ois-success if i<current else bg-ois-border-strong` (`CatalogItemDetail.tsx:94-130`).
10. **DynamicField** base `rounded-lg border text-sm bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary` `err border-ois-danger focus:ring-ois-danger/20` + label `text-sm font-semibold + * ois-danger`; `multiselect/checkbox` custom `w-4 h-4 rounded border-2 checked bg-ois-primary border-ois-primary Check 10` (`CatalogItemDetail.tsx:142-274`) — keep custom checkbox not native.
11. **Wizard hero strip** `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card p-5 flex gap-4` `w-14 h-14 rounded-xl cat bg + 28 icon` (`CatalogItemDetail.tsx:560-591`) + breadcrumb `text-xs ois-text-muted hover:text-ois-primary` (`CatalogItemDetail.tsx:551-557`).
12. **RequestCard (MyRequests)** top bar `flex justify-between px-5 py-2.5 border-b bg/border from STATUS_META` `w-2 h-2 rounded-full dot` + `font-mono text-[10px] ois-text-subtle` (`MyRequests.tsx:143-152`) + body `px-5 py-4` `text-sm font-bold` + footer `text-[11px] ois-text-muted flex gap-1.5 Clock 10/CheckCircle2 11/XCircle 11` rejected `border-ois-danger/30` (`MyRequests.tsx:138-141`) — don't replace top bar with side stripe; + empty `w-12 h-12 bg-ois-surface-muted rounded-xl` per tab.
13. **Tokens only `ois-*`** — `ois-primary/hover/pale, ois-bg/surface/surface-muted/border/border-strong, ois-text/muted/subtle, ois-success/pale, ois-warning/pale, ois-danger/pale, ois-info/pale, ois-border-strong, shadow-ois-card/card-hover/dropdown/modal, rounded-ois-card/modal` — no ad-hoc hex except accent `DC6803/1F4FD4/12B76A` + category stripe colors + yellow highlight `yellow-100/800` for search.
14. **ServiceDeskModal** `fixed inset-0 z-50 backdrop bg-slate-900/40 backdrop-blur-sm + bg-ois-surface rounded-ois-modal shadow-ois-modal max-w-md h-[560px] flex-col` header `border-b px-5 py-3 w-10 h-10 bg-ois-primary-pale rounded-full + w-3 h-3 bg-ois-success border-2 border-ois-surface absolute green dot + title text-sm font-bold + sub text-[11px] ois-success Online · <2 min + Phone/Mail/X actions` messages `bg-ois-bg/50 space-y-3` bubble `max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm user bg-ois-primary text-white rounded-br-md vs agent bg-white border-ois-border rounded-bl-md` + typing `Loader2 animate-spin + Riley is typing…` + composer `border-t bg-ois-surface p-3 gap-2 textarea rounded-lg border-ois-border focus:ring-ois-primary/30 + h-9 w-9 bg-ois-primary Send 15` (`PortalHome.tsx:179-277`).

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Action | Endpoint | Permission | Body / Notes |
|--------|----------|------------|--------------|
| Browse catalog | `GET /api/v1/catalog?page=&pageSize=` | `request.read` | `parsePagination` → `catalogRepo.list(tenantId)` (`itsm.ts:172-175`); `requestsService.catalog()` currently no query |
| List my requests | `GET /api/v1/requests?page=&pageSize=` | `request.read` | `req.scoped.serviceRequests.list(pagination)` scoped own/all/team_app (`itsm.ts:159-162`, `server/scope/scopedDb.ts:582-615`) — `MyRequests` uses `requestsService.list()` client-filter `requesterId===userId` (`MyRequests.tsx:301-308`), `PortalHome` `activeRequests` via same + `activeRequests filtered !fulfilled/closed/cancelled/rejected sliced 3` (`PortalHome.tsx:300`) |
| Get catalog item detail (today client) | `GET /api/v1/catalog` full list then `find id==itemId` (`CatalogItemDetail.tsx:464-467`) | `request.read` | Future `GET /catalog/:publicId` not yet — detail derived from list |
| Create request (future) | `POST /api/v1/requests` (planned; see `requests.md` + `prevent open gaps`) | `request.create` | Wizard will send `{catalogItemId, formData Record<string, string\|number\|boolean\|string[]>, linkedKBSlugs, tags}` server generates `publicId REQ-YYYY-NNNNN`, `workflowTemplate→WorkflowInstance currentStepIndex 0, steps pending/active`; today `CatalogItemDetail.tsx:527-534 simulated setTimeout POST not yet` |
| Get request detail (on view) | `GET /api/v1/requests/:publicId` | `request.read` | `required(await scoped.serviceRequests.get) 404` (`itsm.ts:163-165`) — Portal cards link `→ /requests/:internalId` escapes portal to fulfillment detail (`MyRequests.tsx:180-185`) |
| List comments | `GET /api/v1/requests/:publicId/comments?page=&pageSize=` | `request.read` | verify exists 404 (`itsm.ts:166-171`) — not used in portal directly, via fulfillment detail |
| Add comment | `POST /api/v1/requests/:publicId/comments` | `request.write` | `requestCommentSchema body 1..10_000`; not in portal wizard — fulfillment only |
| Cancel | `PATCH /api/v1/requests/:publicId/cancel` | `request.write` | `cancelRequestSchema reason 10..2000 strict` not-found 404 closed 409; not in portal list yet |
| Reassign step | `PATCH /api/v1/requests/:publicId/steps/:stepId/reassign` | `request.write` | `reassignRequestStepSchema stepId+assigneeId strict` not-active 409 — fulfillment only |
| Watchers | `POST/DELETE /api/v1/requests/:publicId/watchers` | `request.write` | idempotent 201/200 & 204 — via detail watchers |
| Linked KB | `GET /api/v1/kb/articles` `GET /api/v1/kb/articles/:publicId` | `kb.read` | `linkedKBSlugs` filter (`CatalogItemDetail.tsx:497` `mockKBArticles.filter slug in linkedKBSlugs`) |
| Owner team | `teamsService.list()` → `ApplicationTeam` analog (`teamsService`) | varies | `ownerTeamId` resolve (`CatalogItemDetail.tsx:495-496`) |

Client via `requestsService` (`src/services/itsmServices.ts:67-116`): `catalog/list/get/comments/addComment/approveStep/rejectStep/cancel/reassignStep/addWatcher/removeWatcher` all `apiFetch`. PortalHome wraps `requestsService.catalog/list + knowledgeService.articles` in `useResource(..., [])`.

Socket: belum subscribe — incidents pattern `tenant:{tenantId}` + `request:{publicId}` via `src/services/realtime.ts` target untuk portal My Requests auto-refresh; `PortalLayout` currently polling via `useResource` only.

## Open Items

- [ ] Wire `POST /api/v1/requests` from `CatalogItemDetail handleSubmit` — today simulated `setTimeout 900 REQ-2026-random` (`CatalogItemDetail.tsx:527-534`); add server schema `createRequestSchema` catalogItemId + formData validated vs `CatalogItem.formFields required/min/max + showWhen` + audit `create`.
- [ ] Add `GET /api/v1/catalog/:publicId` or `/:id` detail endpoint — today client `catalogData.find(id==itemId)` full-scan (`CatalogItemDetail.tsx:464-467`).
- [ ] File storage for `file_upload` field (`CatalogItemDetail.tsx:298-307 returns 'uploaded'`) — upload to backend pre-signed + progress.
- [ ] `user_picker`/`ci_picker` real pickers (incident design `UserPickerModal`, `LinkCIModal`) replacing text fallback (`CatalogItemDetail.tsx:278-296`).
- [ ] Verify `requestsService.list()` pagination — server supports `parsePagination` but client never sends `page/pageSize`; MyRequests shows client-filtered `tab` not server query `?status=&category=`.
- [ ] Confirm `request.create` gate minimal vs `request.read` browse: server `GET /catalog requirePermission('request.read')` allows any team; verify `Any authenticated` create `all` scope aligns with `Can module request action create` fallback copy (`CatalogItemDetail.tsx:806-809`).
- [ ] Replace `RECOMMENDED_SLUGS` static with personalized recommendations endpoint (role/recent) + make `POPULAR_SEARCHES` dynamic by analytics.
- [ ] Service Desk chat real backend — сегодня `generateAgentReply` keyword mock; persist chat history, hours gating, agent presence.
- [ ] Handle `!catalogData Loading…` vs skeletons — add shimmer parity with incidents (table skeleton 8 rows shimmer etc.).
- [ ] Treat `2026-08-28` changelog: this doc is `Deep init` per template `features/README.md` Template Page Doc.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep init — migrate `docs/pages/portal.md` + `src/routes/portal/*` (PortalLayout 82 / PortalHome 663 / Catalog 509 / CatalogItemDetail 863 / MyRequests 405) + `src/types/request.ts` 6 CatalogCategory / 9 RequestStatus / 11 FieldType + `server/routes/itsm.ts:159-175 catalog` + `src/services/itsmServices.ts` → template features (Wizard 4-step + Dynamic form 11 types + conditional showWhen + Catalog 2-state + MyRequests 4 tabs) | — |
