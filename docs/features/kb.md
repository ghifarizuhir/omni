# Knowledge Base

Status: **Draft**
Route: `/kb` (browse), `/kb/analytics` (analytics), `/kb/editor` (new), `/kb/editor/:slug` (edit), `/kb/:slug` (reading)
Sidebar: Service Delivery · Knowledge Base
Source: `src/routes/kb/KBLayout.tsx`, `KBBrowse.tsx`, `ArticleView.tsx`, `KBEditor.tsx`, `KBAnalytics.tsx` · `server/routes/itsm.ts` (`itsmRouter` `/kb/articles`) · `server/routes/platform.ts` (`platformRouter` `/kb/categories|feedback|analytics`) · `server/repositories/docs.ts:541` (`kbRepo`) · `src/types/knowledge.ts` · `src/shared/schemas/kbArticle.ts`

---

## Intent

Repository artikel teknis terpusat — **how-to, runbook, troubleshooting, FAQ, postmortem** — yang mempercepat resolusi insiden dan mengurangi beban support berulang. User harus menemukan jawaban dalam <10s (search + snippet) dan author harus publish/update dengan friction minimal (slash commands, auto-save, review scheduling).

ITIL 4: Knowledge Management — capture, structure, share, reuse knowledge. Terhubung ke Incidents/Problems (postmortem, known errors), CMDB (linked CIs), dan Portal (linked catalog items). Satu pertanyaan yang dijawab KB menghemat satu tiket.

## Current State (snapshot `src/routes/index.tsx:149-155`)

- `src/routes/index.tsx:149` → `<KBLayout />` at `/kb` (parent layout — tabs + status counts)
- `src/routes/index.tsx:150` → `<KBBrowse />` at `/kb` (index)
- `src/routes/index.tsx:151` → `<KBAnalytics />` at `/kb/analytics`
- `src/routes/index.tsx:152` → `<KBEditor />` at `/kb/editor`
- `src/routes/index.tsx:154` → `<KBEditor />` at `/kb/editor/:slug` (edit existing)
- `src/routes/index.tsx:155` → `<ArticleView />` at `/kb/:slug` (reading)
- Components: `ArticleCard`, `SortDropdown` (`KBBrowse.tsx`), `CodeBlock`, `TableOfContents`, `SideCard`, `StatusBanner`, `UnhelpfulModal` (`ArticleView.tsx`), `EditorToolbar`, `PublishMenu`, `ReviewReminderModal`, `TagInput`, `ChipsInput`, `PreviewRenderer` (`KBEditor.tsx`), `KpiCard`, `ViewsChart`, `TrendBadge` (`KBAnalytics.tsx`).
- API: `itsmRouter` in `server/routes/itsm.ts:395-439` — `GET /kb/articles`, `GET /kb/articles/:publicId`, `POST /kb/articles`, `PATCH /kb/articles/:publicId`, `PATCH /kb/articles/:publicId/status` (all via `kbRepo` + `requirePermission('kb.read'|'kb.write')` + `audit`). `platformRouter` in `server/routes/platform.ts:236-247` — `GET /kb/categories`, `GET /kb/feedback?articleId=`, `GET /kb/analytics` (all `requirePermission('kb.read')` via `platformRouter.use('/kb')` + `listByKind`/`firstByKind`).
- Types: `KBStatus draft|in_review|published|archived|expired` + `KBVisibility internal|team|public` + `KBContentType how_to|troubleshooting|runbook|reference|faq|incident_postmortem` + `KBCategory` + `KBArticle` + `KBFeedback` + `KBAnalytics` (`src/types/knowledge.ts:1-99`). Schemas: `createKBArticleSchema` / `updateKBArticleSchema` (strict) / `setKBArticleStatusSchema` (`src/shared/schemas/kbArticle.ts:38-82`). Repo: `kbRepo.list/get/create/update/setStatus` + `TERMINAL_KB_STATES {archived}` (`server/repositories/docs.ts:538-684`).
- Services: `knowledgeService.articles()|article()|categories()|feedback()|analytics()|create()|update()|setStatus()` (`src/services/platformServices.ts:100-116`).

**Working:**
- `KBLayout` header `h1 Knowledge Base` + counts `{published} published · {drafts} drafts · {inReview} in review · {expired} expired` (conditionally rendered) + accent stripe `expired #DC6803 | inReview #1F4FD4 | else #12B76A` `w-1 shrink-0` + tabs `Browse/Analytics/Editor` `NavLink` active `border-ois-primary text-ois-primary` vs `border-transparent text-ois-text-muted` + `Outlet` scroll `flex-1 min-h-0 overflow-auto` (`KBLayout.tsx:13-77`).
- `KBBrowse` two-column `flex gap-6` — left `w-56 sticky top-4` (Categories + Status + Tags + Clear) + main (search bar + sort + results header + ArticleCard list). Search bar `Search 16 + input + X clear` `rounded-xl border-ois-border focus-within:ring-2 focus-within:ring-ois-primary/25` (`KBBrowse.tsx:337-351`). ArticleCard `border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-px hover:border-ois-primary/20` with content-type icon `w-9 h-9 rounded-lg` + title `group-hover:text-ois-primary` + status dot `w-1.5 h-1.5 rounded-full` + `font-mono publicId` + meta `author · Updated formatRelative · Eye viewCount · ThumbsUp helpfulRate · Clock readTime` + snippet `highlight query` + tags pills (`KBBrowse.tsx:93-189`). Sort `recent|viewed|helpful|alpha` via `sortArticles` with helpful min 5 votes (`KBBrowse.tsx:54-67`).
- `ArticleView` header `bg-white border-b border-ois-border` — nav row `← Knowledge Base / categoryName` + `Edit` (gated `Can knowledge.author`) + `Share` + `⋯` + entity header `w-1 stripe CONTENT_TYPE_META stripe` + content-type pill + status pill + `publicId mono` + `h1 text-xl font-bold` + tags + meta `By author · Updated formatDate · Clock readTime · Eye views · v version` + body `max-w-[740px] mx-auto` + right rail `w-[240px] border-l bg-white` (`ArticleView.tsx:554-791`). Markdown renderer: H1-H4 (scroll-mt-20, H2 border-b, H3 border-l-4 ois-primary), fenced code `CodeBlock` with copy, blockquote callouts (note/warning/danger/tip `border-l-4` + colored bg), bullet `w-1.5 h-1.5 bg-ois-primary`, ordered `w-6 h-6 bg-ois-primary text-white`, table striped, HR `·` divider, inline `**bold` code` and auto-link `KB-|INC-|PRB-|CHG-|CAT-` (`ArticleView.tsx:123-324`). TOC `H2-H4` + `IntersectionObserver rootMargin -20% -70%` scroll-spy (`ArticleView.tsx:373-398,484-495`). Helpfulness `Yes/No` + percentage (min 3 votes) + `UnhelpfulModal` with optional comment + Suggest an edit link (`ArticleView.tsx:665-705`). References: CIs `Server → /cmdb`, Problems `AlertCircle → /problems`, Incidents `AlertTriangle → /incidents` (`ArticleView.tsx:736-771`).
- `KBEditor` top bar `Save draft (disabled saving) + Preview/Editor toggle + PublishMenu (Publish now / Submit for review / Save as draft)` + metadata form (Title `text-2xl font-extrabold border-b-2`, Category/ContentType/Visibility `FilterDropdown`, Tags `TagInput auto-lowercase hyphen`, Summary `rows 2`, Linked CIs/Problems/Incidents `ChipsInput`) + editor `border-ois-border rounded-ois-card` with `EditorToolbar` (B/I/code/link/list/olist/quote/codeblock/slash) + `textarea font-mono text-[13px]` + slash palette `w-72 bg-ois-surface shadow-ois-dropdown` with `↑↓ navigate Enter select Esc dismiss` + preview pane `w-1/2 PreviewRenderer` + footer `wordCount · readTime · auto-save 10s · localStorage 30s debounce · Ctrl+S · status badge` + incident postmortem template auto-fill `?source=incident&id=&title=` (`KBEditor.tsx:518-1097`). Auth gate `useCan('knowledge','author')` → `KBEditorDenied ShieldAlert` if not allowed (`KBEditor.tsx:519-542`).
- `KBAnalytics` KPI row 4 (`Total views / Searches / Helpful rate / Active authors`) + `KpiCard` with `TrendingUp/Down` delta vs prior 30d + content gaps hero `bg-amber-50 border-amber-200` with per-gap `searchTerm "quoted" + count badge + suggestedAction + Create article →` + `Views over time` 30d `ViewsChart` SVG `W 760 H 140` with `linearGradient #1F4FD4 0.15→0`, grid 3 lines, area fill, peak dots, x labels every 7d + `Top viewed` + `Most helpful` (min 5 votes, color ≥95% emerald / ≥80% amber / else red) + `Top search terms` (gap rows `bg-amber-50` with `CONTENT GAP` / match `KB-` link) + `Reviews overdue or upcoming` (`Overdue red Clock / Due in Nd amber / Upcoming emerald` + `Review →` to editor) (`KBAnalytics.tsx:167-562`).
- Persistence: `create` allocates `KB-NNNNN` sequential `count+1` + slug `lowercase alphanumeric+hyphens max 80` + initial `status draft version 1` (`docs.ts:565-573`). `update` bumps `version` + `updatedAt` (`docs.ts:632-637`). `setStatus` stamps `publishedAt/By/Name` on `published`, guards `same-status 400` + `terminal archived 400` (`docs.ts:650-683`). All writes audited `resourceKind KBArticle` (`itsm.ts:412,420-423,434-436`).

**Stub / Partial:**
- Public visibility (`public`) not yet enforced — currently only `internal/team` effective (same stored value).
- Helpfulness `Suggest an edit` link navigates to `/kb/editor/:slug?source=feedback` but feedback wiring to editor prefill is placeholder (`ArticleView.tsx:349-354`).
- Editor is markdown-only — no WYSIWYG (intentional design choice, matches `docs/pages/kb.md:228`).
- Analytics `search query tracking` + `content gap detection` uses seeded `kb-analytics` document via `firstByKind` — not yet live aggregated from search events (`platform.ts:245-247`).
- Review expiry job (scan `reviewDueAt` overdue → `expired`) planned but not yet scheduled (`docs/pages/kb.md:219`).

**Missing (vs spec):**
- Multi-tenant analytics isolation per tenant (partial — documents are tenant-scoped but cross-tenant rollup not isolated).
- `KBAnalytics` range selector `7d/30d/90d` — currently hardcoded `Last 30d` label + `+12%` placeholder for searches (`KBAnalytics.tsx:245-246`).
- Full-text `field:value` search parser (e.g. `type:runbook tag:vpn`) — current is simple substring across `title/summary/body/tags/publicId/authorName` (`KBBrowse.tsx:291-300`).
- Saved filter views / URL persist for browse filters (state is local `useState`, not URL).

## Primary View — KBBrowse (`/kb`)

Layout: **search bar + two-column (sidebar + results)** inside `KBLayout` shell.

### Header (inherited from `KBLayout`)

```
Knowledge Base
{published} published · {drafts} drafts · {inReview? "· N in review"} · {expired? "· N expired"}
[Browse | Analytics | Editor tabs]
```

Accent stripe left `w-1` color by state. Counts derived `useResource(() => knowledgeService.articles())` filtered by status (`KBLayout.tsx:14-19`).

### Browse chrome (`/kb` index)

```
[New article primary] (top-right, gated Can knowledge.author → /kb/editor)
[Search: "Search articles, runbooks, troubleshooting guides…"  + X clear]
[Sidebar w-56]          [Results header: "N results for "q"" or "All articles" + SortDropdown]
                        [ArticleCard × N  space-y-3  or  Empty py-24]
```

### Left sidebar (`w-56 sticky top-4 space-y-1`)

- **Categories** `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card` — header `text-[10px] uppercase tracking-widest` + `All articles {count}` + divider + per category `CatIcon 12px + name + count badge` (disabled `opacity-50 cursor-not-allowed` if `count===0`, active `bg-ois-primary-pale text-ois-primary font-bold` with `bg-ois-primary text-white` count) — icon resolved via `LUCIDE_ICONS[cat.iconName] ?? BookOpen` (`KBBrowse.tsx:361-411`).
- **Status** filter — header same + `label 3.5x3.5 rounded border` checkbox + `STATUS_META label + count` rows (only statuses with `count>0`, checked `bg-ois-primary border-ois-primary` with `Check 9px`) (`KBBrowse.tsx:415-442`).
- **Tags** — header same + `p-3 flex flex-wrap gap-1.5` with top 12 tags by frequency `text-[10px] px-2 py-1 rounded-full border` active `bg-ois-primary text-white` vs `bg-ois-surface-muted text-ois-text-subtle` (`KBBrowse.tsx:444-464`).
- **Clear all** — shown only when `isFiltering` (`query||catFilter!=='all'||statusFilter.size>0||tagFilter`) → `text-ois-danger border-ois-danger/30 hover:bg-ois-danger-pale` + `X 12px` (`KBBrowse.tsx:468-475`).

### ArticleCard (list view, `KBBrowse.tsx:93-189`)

| Area | Source | Style |
|------|--------|-------|
| Icon | `CONTENT_TYPE_META[contentType].bg + icon` | `w-9 h-9 rounded-lg` top-left |
| Title | `title` (highlight if query) | `text-sm font-bold group-hover:text-ois-primary` |
| Status dot | `STATUS_META[status].dot` | `w-1.5 h-1.5 rounded-full` + label `text-[10px] font-semibold` |
| publicId | `publicId` | `font-mono text-[10px] text-ois-text-subtle` |
| Meta | `authorName · Updated formatRelative · views · helpful% · readTime` | `text-[11px] text-ois-text-subtle` with `Eye/ThumbsUp/Clock 10px` |
| Snippet | `summary` or search `extractSnippet(summary+body, query) ~140ch` with `highlight` | `text-xs text-ois-text-muted line-clamp-2` |
| Type pill | `CONTENT_TYPE_META label + icon` | `text-[10px] px-2 py-0.5 rounded-full ctMeta.bg ctMeta.color` |
| Tags | `tags.slice(0,4)` | `text-[10px] bg-ois-surface-muted border-ois-border` |

Card container: `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-px hover:border-ois-primary/20 transition-all p-5` + `Link to /kb/:slug`.

### Results header

- With query: `"{N} results for "q""` + in-category suffix (`KBBrowse.tsx:483-493`).
- Without query: category name or `Filtered · N articles` or `Tagged: tag` or `All articles` `text-xs uppercase tracking-widest` (`KBBrowse.tsx:494-505`).
- Right: `SortDropdown` `SlidersHorizontal 12px` — options `Most recent (updatedAt desc) | Most viewed (viewCount desc) | Most helpful (helpfulRate, min 5 votes else -1) | Alphabetical (title)` (`KBBrowse.tsx:54-67,193-242`).

### Pagination

Client-side filter/sort over full `knowledgeService.articles()` list (no server pagination for browse phase). Server `GET /kb/articles?offset&limit` exists via `parsePagination` (`itsm.ts:396`) but KBBrowse currently loads all via `useResource` (`KBBrowse.tsx:255`).

## Actions

| Action | Trigger | Permission | State required |
|--------|---------|------------|----------------|
| Browse / search | Search input + category/status/tag/sort | `kb.read` | — |
| View article | Click ArticleCard → `/kb/:slug` | `kb.read` | — |
| New article | `New article` button (header) | `knowledge.author` (`Can module="knowledge" action="author"`) | — |
| Edit article | ArticleView `Edit` button → `/kb/editor/:slug` | `knowledge.author` (`Can`) | — |
| Save draft | Editor `Save draft` / auto-save 10s / Ctrl+S / localStorage 30s | `kb.write` (`POST/PATCH /kb/articles`) | `title`+`summary` required |
| Publish now | `PublishMenu → Publish now` → `setStatus published` | `kb.write` (`PATCH .../status`) | not already `published`, not terminal |
| Submit for review | `PublishMenu → Submit for review` → `setStatus in_review` | `kb.write` | not same-status, not terminal |
| Save as draft | `PublishMenu → Save as draft` → `setStatus draft` (no-op if draft) | `kb.write` | — |
| Set review reminder | `ReviewReminderModal` after publish/submit (30/60/90/180 or Skip) | — | after successful status transition |
| Mark helpful / not helpful | Right rail `Yes/No` (`helpfulCount/unhelpfulCount`, toast) | — | `helpful===null` (once per mount) |
| Share | `Share` button (clipboard `window.location.href` + `Copied` toast) | — | — |
| Create from gap | Analytics `Create article →` / Browse empty `Suggest article` / Content gap `Create article` | `knowledge.author` (nav) | — |
| Postmortem from incident | `?source=incident&id=INC-…&title=…` opens editor with template | `knowledge.author` | — |

Delegate to [`_shared/entity-detail-page.md`](./_shared/entity-detail-page.md) (reading layout), [`_shared/filter-sort-export.md`](./_shared/filter-sort-export.md) when shared available.

## Filters / Sort / Search

- **Search:** client-side substring on `title + summary + body + tags + publicId + authorName` (lowercase `includes`), snippet `extractSnippet` shows ~60ch before + query + 80ch after with `…` edges + `highlight` mark `bg-yellow-100 text-yellow-800 rounded` (`KBBrowse.tsx:81-89,291-300`).
- **Category filter:** single-select `catFilter 'all' | categoryId` — toggles `active ? 'all' : catId` (click active again clears) (`KBBrowse.tsx:285,392`).
- **Status filter:** multi-select `Set<KBStatus>` via `toggleStatus` (`KBBrowse.tsx:308-314`) — only statuses with count rendered; `isFiltering` includes `statusFilter.size>0`.
- **Tag filter:** single-select `tagFilter string|null` over top 12 tags by frequency (`KBBrowse.tsx:268-272,289,452-453`).
- **Sort:** `recent (updatedAt desc) | viewed (viewCount desc) | helpful (helpfulRate descending, <5 votes ranked -1 last) | alpha (title localeCompare)` — dropdown `SortDropdown` with `Check` on active (`KBBrowse.tsx:54-67,203-208`).
- **Persist:** browse filters live in component state (not URL). Reset via `clearAll` (clears query/cat/status/tag) and per-filter toggle.
- **Empty search CTA:** `No articles found` + `Clear filters` / `Suggest article` (navigates `/kb/editor?title=q`) (`KBBrowse.tsx:511-538`).

## Detail View (`/kb/:slug` — `ArticleView.tsx`)

### Top header (pinned, `bg-white border-b border-ois-border shrink-0 z-30`)

```
[← Knowledge Base | / Category]          [Edit (Can) | Share (Copy/Copied) | ⋯]
[stripe w-1 CONTENT_TYPE_META.stripe] Content-type pill · Status pill (if not published)
publicId mono · h1 title · tags (Tag 9px pill) · By author · Updated MMM d, yyyy · Clock readTime · Eye views · v version
```

Loading: `Loading…` (`ArticleView.tsx:535`). 404: `BookOpen 32` + `Article not found` + `← Back to Knowledge Base` (`ArticleView.tsx:536-543`).

### Status banner (`StatusBanner`, `ArticleView.tsx:413-440`)

Only if `status !== 'published'` — `flex gap-3 px-5 py-3.5 rounded-lg border mb-6`:

| Status | Style |
|--------|-------|
| `draft` | `bg-ois-surface-muted border-ois-border text-ois-text-muted` — **DRAFT** |
| `in_review` | `bg-ois-info-pale border-ois-info/20 text-ois-info` — **IN REVIEW** |
| `archived` | `bg-ois-warning-pale border-ois-warning/30 text-ois-warning` — **ARCHIVED** + relatedSlug link |
| `expired` | `bg-ois-danger-pale border-ois-danger/20 text-ois-danger` |


### Body — Markdown rendering (`renderMarkdown`, `ArticleView.tsx:123-324`)

| Element | Markup | Render |
|---------|--------|--------|
| H1-H4 | `#{1,4} text` | IDs via `slugify` — H1 `text-2xl font-extrabold`, H2 `text-[19px] font-bold border-b`, H3 `text-[16px] font-semibold border-l-4 border-ois-primary pl-3`, H4 `text-[13px] uppercase tracking-widest` — all `scroll-mt-20` |
| Code block | ````lang … ``` `` | `CodeBlock` — header `#181825` with lang + Copy/Copied + `pre bg-[#1e1e2e] text-[#cdd6f4] font-mono 13px` |
| Callout | `> **Note/Warning/Danger/Tip:** …` | `border-l-4 rounded-r-lg px-4 py-3.5` — note `#1F4FD4 bg-ois-primary-pale` · warning `#F79009 bg-ois-warning-pale` · danger `#F04438 bg-ois-danger-pale` · tip `#12B76A bg-ois-success-pale` + icon |
| Bullet list | `- item` | flush `ul space-y-2` — dot `w-1.5 h-1.5 bg-ois-primary` + `text-[15px] leading-[1.8]` |
| Ordered list | `1. item` | `w-6 h-6 rounded-full bg-ois-primary text-white 11px` + vertical `w-0.5 bg-ois-border` connector |
| Table | `\| h \| …` + `\|---\|` + rows | `overflow-x-auto rounded-lg border-ois-border` — header `bg-ois-surface-muted uppercase 10px tracking-widest`, body `divide-y`, odd `bg-ois-surface-muted/40` |
| Horizontal rule | `---` | `h-px bg-ois-border` with `·` center |
| Inline | `**bold**` `` `code` `` `KB-…/INC-…/PRB-…/CHG-…/CAT-…` | bold `font-semibold`, code `font-mono 12px bg-ois-surface-muted border-ois-border`, refs `Link text-ois-primary font-mono 13px` → `/kb/:slug` `/incidents` `/problems` `/changes` `/portal/catalog` |
| Paragraph | plain line | `text-[15px] text-ois-text-muted leading-[1.8] my-4` |

Body container: `flex flex-1 min-h-0` — left `flex-1 overflow-y-auto px-8 py-6 max-w-[740px] mx-auto` + right `w-[240px] border-l bg-white overflow-y-auto py-5 px-4 space-y-4` (independent scroll) (`ArticleView.tsx:650-664`).

### Right rail (`w-[240px] border-l bg-white`)

- **Was this helpful?** `SideCard` — `Yes/No` buttons `flex-1 py-2 rounded-lg border` (active `bg-ois-success/danger text-white`, idle `hover:border-ois-success/danger + pale` + `opacity-40 cursor-not-allowed` after vote) + `helpfulPct% found this helpful (helpfulCount of total votes)` shown only when `totalVotes >= 3` (`ArticleView.tsx:665-705`).
- **Table of contents** — `H2-H4 scroll-spy` via `IntersectionObserver rootMargin -20% -70%` — active `text-ois-primary font-semibold`, indent `level 2 pl-0 / 3 pl-3 / 4 pl-5` + `onClick scrollIntoView smooth` (`ArticleView.tsx:373-398,708-712`).
- **Related articles** — from `relatedArticleSlugs` resolved via `publicId` lookup → `allArticles.find slug` — per row `BookOpen 12 ois-success + title 11px font-medium + publicId mono 10px` (`ArticleView.tsx:473-477,714-733`).
- **References** — only if any `relatedCIPublicIds|linkedProblemIds|linkedIncidentIds` — per group label `text-[10px] uppercase tracking-widest` + links: CIs `Server → /cmdb`, Problems `AlertCircle → /problems`, Incidents `AlertTriangle → /incidents` `text-[11px] text-ois-primary` (`ArticleView.tsx:736-771`).
- **Article details** — `dl space-y-2 text-[11px]`: Author, Created `MMM d, yyyy`, Updated, Version `vN (+M prev)` from `previousVersions`, Status capitalized (`ArticleView.tsx:774-789`).

### Feedback modal

`UnhelpfulModal` (`ArticleView.tsx:328-369`) — `Modal title "What could be improved?"` + textarea 4 rows optional `placeholder e.g. Step 3 didn't work…` + footer `Suggest an edit (→ /kb/editor/:slug?source=feedback) · Cancel · Submit` (posts then toast `Thanks! Your feedback helps us improve.`).

### Toasts

Fixed `bottom-6 left-1/2 -translate-x-1/2 bg-ois-text text-white rounded-full shadow-ois-modal` — helpful `Thanks for your feedback!` / share `Link copied` / unhelpful submit, auto-dismiss 2.5s (`ArticleView.tsx:793-798`).

## Editor View (`/kb/editor` + `/kb/editor/:slug` — `KBEditor.tsx`)

### Route modes

- **New:** `slug` absent — state from `getInitialEditorState` — placeholder body `# Article title …` or incident template if `?source=incident&id=INC-…&title=…` → contentType `incident_postmortem`, tags `postmortem,incident`, linkedItems `[id]`, title `Postmortem: title` (`KBEditor.tsx:142-167,559-575`).
- **Edit:** `slug` present — `existingArticle = articlesData.find slug` — prefill `title/summary/body/categoryId/contentType/visibility/tags/linkedCIs/linkedItems` — `isEditing` badge `vN (editing)` in top bar (`KBEditor.tsx:552-556,800-807`).

### Auth gate

`useCan('knowledge','author')` — if false renders `KBEditorDenied` centered `ShieldAlert 36 ois-danger` + `Cannot author KB articles · Authoring knowledge requires Team Lead level or above (IFM / APS / STA).` + `Back to Knowledge Base` (`KBEditor.tsx:519-542`).

### Top bar (`flex justify-between px-5 py-3 border-b bg-ois-surface shrink-0`)

Left: `← KB` + `New article` or `· Editing: KB-NNNNN · vN (editing)` (truncate). Right: `Save draft` (`saving` disabled `opacity-50`), `Preview/Editor` toggle (`Eye/EyeOff`, active `border-ois-primary text-ois-primary bg-ois-primary-pale`), `PublishMenu` (`KBEditor.tsx:792-837`).

`PublishMenu` (`KBEditor.tsx:350-396`) — left button `Check 13 Publish now` `bg-ois-primary rounded-l-lg` + right `ChevronDown` `border-l border-white/20 rounded-r-lg` → dropdown `min-w-[180px] py-1` with `Publish now (→ published) / Submit for review (→ in review) / Save as draft (→ draft)` + sublabel `Status → …` — clicking any sets `pendingAction`.

### Metadata form (`space-y-4 mb-6`, `KBEditor.tsx:848-944`)

| Field | Control | Notes |
|-------|---------|-------|
| Title | `input text-2xl font-extrabold border-b-2 border-ois-border focus:border-ois-primary pb-2` | placeholder `e.g. "Runbook: Payment API restart procedure"` · required |
| Category | `FilterDropdown value=categoryId options=mockKBCategories id/name` | `Select category…` · `fullWidth` · `text-[10px] uppercase tracking-widest` label |
| Content type | `FilterDropdown value=contentType options=CONTENT_TYPES 6` | how_to / troubleshooting / runbook / reference / faq / postmortem |
| Visibility | `FilterDropdown value=visibility options=VISIBILITIES 3` | Internal — all staff / Team only / Public (future) |
| Tags | `TagInput` | chips `bg-ois-primary-pale text-ois-primary rounded-full` + input auto-lowercase hyphen `val.trim().toLowerCase().replace(/\s+/g,'-')` on Enter/, + `X 10` remove |
| Linked CIs | `ChipsInput placeholder "e.g. CI-APP-PAY-001"` | chips `font-mono bg-ois-surface-muted border-ois-border` + `h-8 input + Add Plus 12` |
| Linked problems/incidents | `ChipsInput placeholder "e.g. PRB-2026-00018"` | same |
| Summary | `textarea rows 2` `rounded-lg border-ois-border-strong focus:ring-ois-primary/20` | label `Summary * (1–2 sentences for search results)` · required |

### Markdown editor (`border-ois-border rounded-ois-card overflow-hidden`, `KBEditor.tsx:947-1035`)

**Toolbar** `EditorToolbar` (`KBEditor.tsx:315-346`) — `px-3 py-1.5 border-b bg-ois-surface-muted flex gap-0.5`: `Bold (wrap ** ) / Italic (* ) / Inline code (`) / Link [ ](url) | divider | Bullet (- ) / Numbered (1. ) / Blockquote (> ) / Code block (```bash block) | divider | / slash button text-[11px] font-bold border`.

Selection helpers: `wrapSelection` inserts `before+selected+after` and restores selection; `insertAtLineStart` prepends prefix at line start (`KBEditor.tsx:270-294`).

**Textarea** `font-mono text-[13px] leading-relaxed px-5 py-4` `min-h 400` + optional `Markdown` label when not previewing.

**Slash palette** (`KBEditor.tsx:63-87,984-1017`) — triggered when current line starts with `/` — filters `SLASH_COMMANDS` 12 entries (heading, h3, code, callout `> **Note:**`, warning `> **Warning:**`, list, ordered, link-kb `KB-XXXXX`, link-ci `CI-XXX`, link-incident `INC-…`, divider `---`, table `| Col |…`) — rendered `w-72 bg-ois-surface border-ois-border rounded-lg shadow-ois-dropdown` header `SLASH COMMANDS` + `/{query}` + list `max-h-56 overflow-y-auto` with `w-7 h-7 rounded-md` icon (active `bg-ois-primary text-white`), `Check`-style highlight `bg-ois-primary-pale`, footer `↑↓ navigate · Enter select · Esc dismiss`.

**Preview pane** (when `showPreview`) — `flex divide-x`: left `w-1/2` textarea, right `w-1/2 PreviewRenderer` `px-6 py-5 bg-white overflow-y-auto` — renders `h1 title` + lightweight `PreviewRenderer` (headings, code `bg-[#1e1e2e]`, blockquote, bullet `•`, ordered `j+1.`, `hr`, paragraphs with `renderSimpleInline` bold/code) (`KBEditor.tsx:169-260,1020-1033`).

### Postmortem template (`KBEditor.tsx:101-140`)

When `?source=incident&id=INC-XXX&title=…`:

```markdown
# Postmortem: {title}
**Incident:** INC-XXX  **Date:** YYYY-MM-DD
## Summary / Timeline (| Time (UTC) | Event | 4 rows) / Root Cause / Contributing Factors / Resolution / Action Items (| Action | Owner | Due |)
```

### Footer (`KBEditor.tsx:1038-1076`)

Left `text-[11px] text-ois-text-subtle gap-3`: `{wordCount} words · {readTime} min read` (200 wpm `Math.ceil(words/200)` min 1) · `Auto-saved Ns ago with Check 10 ois-success` or `Auto-saves every 10s` · `Draft saved formatRelative(lastSaved)` (localStorage). Right: status pill `text-[10px] rounded-full` — published `bg-ois-success-pale text-ois-success`, in_review `bg-ois-warning-pale text-ois-warning`, else `bg-ois-surface-muted`.

### Auto-save + persistence

- Interval `10_000ms` checks `body !== lastBody` → `setAutoSavedAt(new Date())` (`KBEditor.tsx:601-609`).
- `localStorage 30_000ms` debounce `JSON.stringify(state)` → `kb-editor-draft` + `setLastSaved` (`KBEditor.tsx:612-618`), restored on mount only for new articles without `source` param (`KBEditor.tsx:621-634`).
- `Ctrl+S / Cmd+S` → `setAutoSavedAt` (prevents default) (`KBEditor.tsx:637-646`).

### Save / publish flow (`KBEditor.tsx:705-783`)

```
saveArticle()  // validates title+summary required
  ├─ if currentPublicId → knowledgeService.update(publicId, {title/summary/body/categoryId/contentType/visibility/tags/relatedCIPublicIds/linkedProblemIds/linkedIncidentIds})  PATCH
  └─ else                → knowledgeService.create({...})  POST → sets currentPublicId + created.publicId
  returns publicId | null (sets saveError + saving spinner)

handleConfirmPublish(days)
  ├─ optimistic set('status', nextStatus) where published/in_review/draft
  ├─ await saveArticle() → if null revert status
  ├─ if status !== prevStatus → knowledgeService.setStatus(publicId, nextStatus)  PATCH .../status
  │     ├─ catch → revert + saveError
  │     └─ success → refreshArticles()
  └─ if status === 'published' → setPublished(true) + navigate('/kb') after 1200ms
```

`currentPublicId` state (`KBEditor.tsx:593`) is set after first `create` so subsequent saves PATCH. `saving` disables `Save draft` and shows `Saving…`. `saveError` banner `border-ois-danger/40 bg-ois-danger-pale text-ois-danger text-[11px]` above form (`KBEditor.tsx:842-846`).

### Modals + toasts

- `ReviewReminderModal` (`KBEditor.tsx:400-443`) — after pendingAction — title `"{Published|Submitted|Saved} — set review reminder?"` + `30/60/90/180 days` grid `py-3 rounded-lg border` active `border-ois-primary bg-ois-primary-pale`, + `Skip reminder` left / `Check Set reminder` right `bg-ois-primary`.
- Published toast `fixed bottom-6 left-1/2 bg-ois-success text-white rounded-full shadow-ois-modal` + `Check 14 Article published — redirecting…` (`KBEditor.tsx:1090-1094`).

## Analytics View (`/kb/analytics` — `KBAnalytics.tsx`)

Top bar inside layout: filter `Last 30d ▾` + `Download Export` `border-gray-200 rounded-lg text-gray-600` (`KBAnalytics.tsx:244-251`). Body `min-h-full bg-gray-50 px-6 py-6 space-y-6`.

### KPI row (`grid-cols-4 gap-4`, `KBAnalytics.tsx:257-286`)

`KpiCard` (`KBAnalytics.tsx:58-78`) — `bg-white rounded-xl border-gray-200 p-5`: label `text-xs uppercase tracking-wide text-gray-500` + icon `p-2 rounded-lg bg-gray-50` + value `text-3xl font-semibold tabular-nums` + delta `text-xs font-medium` with `TrendingUp/Down/Minus` colored `emerald-600 good / red-500 bad / gray-400 flat` (`good` prop controls whether up is good).

| Card | Value | Delta | Icon |
|------|-------|-------|------|
| Total views | `kbAnalytics.totalViews.toLocaleString()` | `+{pct}% prev 30d` via `viewTrendFrom(viewsTimeSeries)` (compare first/last half sums) | `Eye` |
| Searches | `totalSearches` | `+12% prev 30d` (placeholder) | magnifier SVG |
| Helpful rate | `Math.round(helpfulRate*100)%` | `↔ same as prev 30d` flat | `ThumbsUp` |
| Active authors | hardcoded `6` | `+1 prev 30d` up | `Users` |

Trend computed `viewTrendFrom` `pct = round((curr-prev)/prev*100)` — `>2 up, <-2 down, else flat` (`KBAnalytics.tsx:39-45`), `NOW = 2026-05-09T10:00Z` fixed for `daysUntil` (`KBAnalytics.tsx:10`).

### Content gaps hero (`bg-amber-50 border-amber-200 rounded-xl p-5`, `KBAnalytics.tsx:289-335`)

Header `AlertTriangle amber-600 + "{N} content gaps detected" text-amber-900 + "Top searches without matching articles:" text-amber-700` + `grid-cols-2 gap-3` per gap: `font-mono "searchTerm" + count badge bg-amber-100 text-amber-700 rounded-full + suggestedAction text-gray-600 + Linked: linkedItemId mono? + Create article ArrowRight text-[#1F4FD4]` + bottom `+ Bulk create suggested articles` `border-amber-300 text-amber-800`.

### Views over time (`bg-white border-gray-200 rounded-xl p-5`, `KBAnalytics.tsx:338-341`)

Title `Views over time (last 30 days) text-sm font-semibold text-gray-700` + `ViewsChart` SVG `W 760 H 140 PAD t12 r16 b28 l40` — `linearGradient #1F4FD4 0.15→0` area, `stroke #1F4FD4 width 2` line, 3 grid lines `stroke #E5E7EB` with `min/50%/max` labels, dots on peaks `≥0.9*max` + label indices `0,7,14,21,28,last`, x labels `month short + day numeric` via `Date.toLocaleDateString` (`KBAnalytics.tsx:82-146`).

### Two-column (`grid-cols-2 gap-4`, `KBAnalytics.tsx:344-433`)

**Top viewed (last 30d)** — columns `# mono 12 · Article (Link hover:text-[#1F4FD4]) · Views tabular-nums fmtViews(1.0k→1.0k) · Trend`. Trends via hardcoded `viewDeltas` per slug (`28, 0, 12, -5… 'new'` → `TrendBadge NEW emerald` vs `±pct%` with `TrendingUp/Down`) (`KBAnalytics.tsx:228-240,346-388`).

**Most helpful (min 5 votes)** — header `Most helpful (min 5 votes)` `text-gray-400` — columns `Article · Helpful % (≥95 emerald / ≥80 amber / else red) tabular-nums · Total`. Filters `total>=5` from `useArticleHelpfulness(feedback)` map (`KBAnalytics.tsx:25-36,391-432`).

### Top search terms (`KBAnalytics.tsx:436-496`)

Columns `Term font-mono · Searches · Has matching article?`. Row `gap bg-amber-50` vs `hover:bg-gray-50`. Gap cell: `AlertTriangle amber + No — CONTENT GAP + Create → text-[#1F4FD4]` → `/kb/editor?title=term`. Match cell: `CheckCircle emerald + Yes + publicId mono link` to `/kb/:slug`.

### Reviews overdue or upcoming (`KBAnalytics.tsx:499-558`)

Header `Reviews overdue or upcoming · {N} articles` + columns `Article · Status · Next review ·` (Review →). Row status: `days<=0 Overdue red Clock` · `0<days<=14 Due in Nd amber Clock` · `else Upcoming emerald CheckCircle`. `allReviewItems` merges `kbAnalytics.needsReview` slugs + extra `published + reviewDueAt not in needsReview` top-3 earliest, sorted by `days` (`KBAnalytics.tsx:217-225`). Link `Review →` → `/kb/editor/:slug`.

## State Lifecycle

```
draft ──→ in_review ──→ published ──→ archived (terminal)
  ↑          │              │
  └──────────┘              └─→ expired* (planned, if reviewDueAt overdue — not yet enforced)
```

- Initial `draft` (create always `status draft` server `docs.ts:582`).
- `setStatus` dedicated endpoint refuses `same-status 400` and `terminal 400` (`archived` is sole terminal in `TERMINAL_KB_STATES`) — `draft`/`in_review`/`expired` remain mutable (`docs.ts:538-539,664-665`). `published → in_review` is allowed (re-review flow).
- `published` stamps `publishedAt = now`, `publishedBy = actor.id`, `publishedByName = actor.name` (`docs.ts:672-673`).
- `update` (PATCH without status) bumps `version` + `updatedAt` (`docs.ts:632-637`); `version` surfaced as `vN (+M prev)` in ArticleView details (`ArticleView.tsx:780`).
- Review scheduling: after publish/submit, `ReviewReminderModal` optionally sets `reviewDueAt` = `now + 30/60/90/180d` (client intent — persisted via `update` with `reviewDueAt` field when wired).
- Expiry: `expired` is a status value but transition currently manual via `setStatus` — future job will scan `reviewDueAt < NOW → expired` (`docs/pages/kb.md:219`).

Ref: `KBStatus` in `src/types/knowledge.ts:1-6`, `kbStatusValues` in `src/shared/schemas/kbArticle.ts:12-18`, `setKBArticleStatusSchema` `status enum kbStatusValues strict` (`kbArticle.ts:76-80`).

## Permissions (action-level)

| Permission | Who | Actions |
|------------|-----|---------|
| `kb.read` | All staff (platformRouter `requirePermission('kb.read')` on `/kb` prefix — `platform.ts:27`) | Browse, view article, analytics, categories, feedback, search |
| `kb.write` | Author role ( `knowledgeService.create/update/setStatus` require `kb.write` — `itsm.ts:408,416,427`) — editor gate `useCan('knowledge','author')` Team Lead+ (IFM/APS/STA) (`KBEditor.tsx:520`) | Create, update, setStatus (publish/submit/draft) |
| `knowledge.author` | Client Kan (`Can module="knowledge" action="author"`) — maps to `kb.write` scoped check; `New article` + `Edit` buttons gated (`KBBrowse.tsx:325`, `ArticleView.tsx:576`) | New article, edit |

Read vs write split: `GET /kb/**` → `kb.read`; `POST /kb/articles`, `PATCH /kb/articles/:id`, `PATCH /kb/articles/:id/status` → `kb.write`. Non-author sees browse + article + analytics; editor route renders `KBEditorDenied` (`KBEditor.tsx:525-542`).

Scope: documents are `tenantId`-scoped via `prisma.kBArticle where tenantId` + `count where tenantId` (`docs.ts:567,629,661`). Scope violation would surface as 404/403 via `withScopedDb` + `req.scoped` (not explicit per-article RBAC beyond `kb.read/write`).

## Empty / Loading / Error

- **Empty KBBrowse (no results):** `flex flex-col items-center py-24` + `w-14 h-14 rounded-xl bg-ois-surface-muted SearchX 24 text-ois-text-subtle` + `h3 No articles found` + `p No articles match "q" / your filters` + `Clear filters` (if filtering) + `· Edit Suggest article` (if query → `/kb/editor?title=q`) (`KBBrowse.tsx:511-538`).
- **Empty KBLayout counts:** `published/drafts 0` shown, `inReview/expired` hidden when 0 (`KBLayout.tsx:37-48`).
- **Empty ArticleView related/references:** sections omitted entirely when `related.length===0` / `relatedCIPublicIds/linkedProblemIds/linkedIncidentIds` all empty (`ArticleView.tsx:714-771`).
- **Empty Analytics:** `kbAnalytics` defaults `totalViews 0 topViewed [] viewsTimeSeries []` (`KBAnalytics.tsx:172-179`) — KPI `0`, charts empty, tables zero rows.
- **Loading browse/layout:** `useResource` returns `data undefined` initially — counts `0`, categories `[]`, articles `[]` fallback (no skeleton — renders empty counts + blank filter counts) (`KBBrowse.tsx:255-258`, `KBLayout.tsx:14-15`).
- **Loading article:** `!article && !articlesData → Loading…` (`ArticleView.tsx:535`).
- **Article 404:** `Article not found` full-page `BookOpen 32 text-ois-text-subtle + h2 + Link ← Back to Knowledge Base /kb` (`ArticleView.tsx:536-543`).
- **Editor denied:** `ShieldAlert 36 ois-danger + Cannot author KB articles + requires Team Lead level or above + Back to Knowledge Base` (`KBEditor.tsx:525-542`).
- **Editor validation:** `saveError` banner `border-ois-danger/40 bg-ois-danger-pale text-ois-danger` for `Title/Summary required` or server `Save failed / Status change failed` (`KBEditor.tsx:842-846,707-748`).
- **Status transition error:** `400 Already in status / Cannot transition from terminal` mapped from sentinel `same-status/terminal` (`itsm.ts:432-433`) — surfaced as `saveError` + optimistic revert (`KBEditor.tsx:764-774`).

## Phase 2 Deferred

- Public visibility enforcement + public reader role / unauthenticated KB (`visibility public` column exists but not enforced).
- Full WYSIWYG editor (markdown is intentional Phase 1 — preserves `PreviewRenderer` path).
- Multi-tenant analytics isolation + live search anomaly ingestion (replace seeded `firstByKind('kb-analytics')`).
- Review expiry scheduler job — scan `reviewDueAt < NOW → status expired` + notification to author.
- Browse filter URL persist + saved filter views + `SortDropdown` default persist (`user_preferences`).
- Full-text `field:value` search parser (`type:runbook tag:vpn status:published`) + server-side pagination for browse.
- Helpfulness `Suggest an edit` prefill wiring (`?source=feedback` → editor body template).
- Article version history diff view + restore previous version (`previousVersions` count exists, no history API yet).
- Bulk create from content gaps (`+ Bulk create suggested articles` button in analytics is stub).

## Design Preservation

Wajib pertahankan saat refactor (dari `src/routes/kb/*` + `docs/pages/kb.md`):

1. **KBLayout shell** `-m-6 flex flex-col bg-ois-bg h-[calc(100vh-3.5rem)]` + header `bg-ois-surface border-b border-ois-border shrink-0 z-30` + accent stripe `w-1 shrink-0 transition-colors duration-500` colored by `expired #DC6803 / in_review #1F4FD4 / else #12B76A` + stats row `text-xs text-ois-text-muted gap-3 with w-1 h-1 rounded-full bg-ois-border-strong` separators + tabs `NavLink gap-2 px-3 py-3 border-b-2 text-sm font-medium` active `border-ois-primary text-ois-primary`.
2. **ArticleCard** `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-px hover:border-ois-primary/20 transition-all p-5` + left `w-9 h-9 rounded-lg ctMeta.bg` icon, status dot `w-1.5 h-1.5 rounded-full`, `font-mono publicId text-[10px]`, title `text-sm font-bold group-hover:text-ois-primary`, meta `text-[11px] text-ois-text-subtle with · separators and Eye/ThumbsUp/Clock 10px`, type pill `ctMeta.bg ctMeta.color rounded-full`, snippet `highlight mark bg-yellow-100 text-yellow-800`.
3. **Sidebar cards** `bg-ois-surface border-ois-border rounded-ois-card shadow-ois-card overflow-hidden` + header `px-3 py-2.5 border-b border-ois-border text-[10px] uppercase tracking-widest text-ois-text-subtle`, Category row active `bg-ois-primary-pale text-ois-primary font-bold` vs disabled `opacity-50 cursor-not-allowed`, Tag pill `rounded-full text-[10px] border` active `bg-ois-primary text-white border-ois-primary`.
4. **ArticleView header stripe** `w-1 self-stretch shrink-0` with `CONTENT_TYPE_META stripe` per contentType (`#1F4FD4/#F79009/#12B76A/#0BA5EC/#7C3AED/#F04438`) + `bg-white border-b` header, nav `← Knowledge Base / category`, actions `Edit border-ois-border hover:bg-ois-surface-muted` + `Share Copy/Copied` pattern.
5. **Markdown renderer** — H3 left border `border-l-4 border-ois-primary pl-3`, callout `border-l-4` with per-type bg `ois-primary/warning/danger/success-pale`, ordered steps `w-6 h-6 bg-ois-primary text-white` with connector `w-0.5 bg-ois-border`, code `bg-[#1e1e2e] text-[#cdd6f4]` with `Copy` header `#181825`, tables `overflow-x-auto rounded-lg border` with striped `bg-ois-surface-muted/40`.
6. **Right rail** `w-[240px] border-l bg-white overflow-y-auto` + `SideCard border-ois-border rounded-lg bg-ois-surface` header `bg-ois-surface-muted text-[10px] uppercase tracking-widest`, TOC active `text-ois-primary font-semibold` with `pl-0/3/5` per level, Helpfulness `Yes/No flex-1 py-2 rounded-lg border` with `opacity-40` disabled state.
7. **Editor** — toolbar `flex gap-0.5 px-3 py-1.5 border-b bg-ois-surface-muted` with `ToolbarBtn p-1.5 rounded hover:bg-ois-surface-muted`, slash palette `w-72 bg-ois-surface border-ois-border rounded-lg shadow-ois-dropdown z-30 bottom-8` with footer `↑↓ navigate · Enter select · Esc dismiss`, footer `wordCount · readTime · Auto-saved Check ois-success`.
8. **Analytics** — `KpiCard bg-white rounded-xl border-gray-200 p-5` with `TrendingUp/Down/Minus` delta, gaps hero `bg-amber-50 border-amber-200` with `Create article ArrowRight text-[#1F4FD4]`, `ViewsChart` SVG gradient fill + 7d x-labels, review `Overdue red / Due amber / Upcoming emerald` with `Clock/CheckCircle`.

## API Touchpoints

Ref: [`../design/02-api-contract.md`](../design/02-api-contract.md)

| Hook | Endpoint | Permission | Notes |
|------|----------|------------|-------|
| `knowledgeService.articles()` | `GET /api/v1/kb/articles?page&pageSize` | `kb.read` (`platformRouter.use('/kb')` + `itsm.ts:395`) | `parsePagination` via `kbRepo.list` |
| `knowledgeService.article(publicId)` | `GET /api/v1/kb/articles/:publicId` | `kb.read` | `required(await kbRepo.get(...),'KBArticle')` 404 if missing |
| `knowledgeService.create(input)` | `POST /api/v1/kb/articles` | `kb.write` | `createKBArticleSchema strict` — `title 1..200, summary 1..2000` required; initial `draft`, allocates `KB-NNNNN` + slug max 80, audits `resourceKind KBArticle action create` |
| `knowledgeService.update(publicId, patch)` | `PATCH /api/v1/kb/articles/:publicId` | `kb.write` | `updateKBArticleSchema strict partial` — rejects `status`/identity fields 400; bumps `version`+`updatedAt`, audits `action update` |
| `knowledgeService.setStatus(publicId, status)` | `PATCH /api/v1/kb/articles/:publicId/status` | `kb.write` | `setKBArticleStatusSchema strict` — `status enum kbStatusValues`; 400 if `same-status` / `terminal (archived)`; stamps `publishedAt/By/Name` on `published` |
| `knowledgeService.categories()` | `GET /api/v1/kb/categories` | `kb.read` | `listByKind<KBCategory>('kb-category')` (`platform.ts:237-238`) |
| `knowledgeService.feedback(articleId?)` | `GET /api/v1/kb/feedback?articleId=X` | `kb.read` | `listByKind('kb-feedback')` filtered by `qString(articleId)` (`platform.ts:240-244`) |
| `knowledgeService.analytics()` | `GET /api/v1/kb/analytics` | `kb.read` | `firstByKind('kb-analytics')` → `KBAnalytics` (`platform.ts:245-247`) |

Schemas share `src/shared/schemas/kbArticle.ts` — `kbStatusValues / kbVisibilityValues / kbContentTypeValues` enums. Repo at `server/repositories/docs.ts:541-684` — `create` uses `prisma.$transaction` + `count+1` publicId; `update`/`setStatus` use `findFirst where tenantId+publicId` + `prisma.$transaction update data(JSON.stringify)`.

## Open Items

- [ ] Verify analytics range control — `KBAnalytics.tsx:245` hardcodes `Last 30d` label; spec calls 7d/30d/90d.
- [ ] Confirm `kbRepo.create` sequential publicId under concurrency — `count+1` can collide `P2002` (best-effort); consider `tenant` counter or retry.
- [ ] Wire `ReviewReminderModal` days to `reviewDueAt` persistence (`update` with `reviewDueAt`) — currently optimistic UI only.
- [ ] `browse` pagination: `KBBrowse.tsx` loads all via `useResource` — verify threshold for switching to server `?page&pageSize` (>100 rows).
- [ ] Public visibility flag `visibility: public` not enforced server-side — confirm Phase 2 guard.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep exemplar init — migrate `docs/pages/kb.md` + `src/routes/kb/*` (KBLayout/KBBrowse/ArticleView/KBEditor/KBAnalytics) + `server/routes/itsm.ts` + `server/routes/platform.ts` + `server/repositories/docs.ts:kbRepo` + `src/types/knowledge.ts` + `src/shared/schemas/kbArticle.ts` ke template features (Intent/Current State/Primary View/Actions/Lifecycle) | — |
