# Knowledge Base

> **Route utama:** `/kb` · **ITIL 4 Practice:** Knowledge Management · **Sumber kode:** `src/routes/kb/`

KB adalah repository artikel teknis: how-to, runbook, troubleshooting, FAQ, postmortem. Mendukung markdown editor + analytics + workflow publish.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/kb` | `KBBrowse` | Browse + search + kategori filter |
| `/kb/analytics` | `KBAnalytics` | KPI, content gaps, top viewed, review schedule |
| `/kb/editor` | `KBEditor` | Markdown editor untuk artikel baru |
| `/kb/editor/:slug` | `KBEditor` | Edit artikel existing |
| `/kb/:slug` | `ArticleView` | Artikel reading view |

`KBLayout` membungkus tab Browse / Analytics / Editor + status counts (published, drafts, in_review, expired).

---

## 2. Key Features

- **6 content types**: how_to, troubleshooting, runbook, reference, faq, incident_postmortem.
- **Status workflow**: draft → in_review → published → archived/expired (terminal).
- **Markdown editor** dengan toolbar (bold/italic/code/link/list/quote/codeblock) + slash commands (/) untuk template.
- **Auto-save** 10s + localStorage fallback (30s debounce).
- **Markdown rendering**: H1-H4 (TOC scroll-spy), code blocks dengan copy, callouts (Note/Warning/Danger/Tip), tables, auto-link KB-XXXXX/INC-XXX/PRB-XXX/CHG-XXX.
- **Versioning** + previousVersions count.
- **Helpfulness** Yes/No + percentage (min 5 votes).
- **References** ke CIs, problems, incidents.
- **Review scheduling** (30/60/90/180 days) dengan reviewDueAt tracking.
- **Incident postmortem template** auto-fill saat datang dari incident.
- **Analytics**: views, searches, content gaps, top viewed/helpful.

---

## 3. KBBrowse

Filter:
- Search (title/summary/body/tags/publicId/authorName) dengan snippet highlighting
- Categories sidebar (hierarchical, dengan article count)
- Status checkboxes
- Tag pills (top 12 by frequency)
- Sort: recent / viewed / helpful (min 5 votes) / alphabetical

Article card: content-type icon + badge, status dot, author, updated time, views, helpfulness %, read time, snippet preview (query highlighted).

**"New article"** button gated `knowledge.author`.

---

## 4. ArticleView (`/kb/:slug`)

### Header
Content-type stripe color, badges, publicId, title, tags, author, updated, read time, view count, version.

### Status Banner
Draft / In Review / Archived / Expired alerts dengan context.

### Body — Markdown rendering
- H1-H4 → TOC scroll-spy di kanan
- Code blocks fenced ```lang dengan tombol copy
- Callouts: `> **Warning:** ...` (juga Note/Danger/Tip)
- Tables pipe-delimited (striped)
- Auto-link cross-references

### Right rail
- **Helpfulness**: Yes/No buttons, percentage (min 3 votes), unhelpful modal dengan optional feedback
- **Table of Contents**: H2-H4 scroll-spy
- **Related Articles**: dari `relatedArticleSlugs`
- **References**: linked CIs (Server icon → /cmdb), Problems (AlertCircle → /problems), Incidents (AlertTriangle → /incidents)
- **Article Details**: author, created, updated, version + previousVersions, status

---

## 5. KBEditor

### Top bar
Save Draft (disabled saat saving) · Preview/Editor toggle · **PublishMenu** (Publish now / Submit for review / Save as draft).

Setelah publish/submit → **ReviewReminderModal** untuk schedule review (30/60/90/180 days).

### Metadata form
Title, Category, Content type (6 options), Visibility (internal/team/public), Tags (chip input auto-lowercase), Summary, Linked CIs (chips), Linked Problems/Incidents (chips).

### Markdown editor
- Toolbar: B / I / </> / 🔗 / list / olist / quote / codeblock / slash
- Slash commands (/) — 12 templates (heading, code, callout, warning, list, table, divider, link-kb, link-ci, link-incident)
- Keyboard: Ctrl+S → save
- Slash palette: arrow keys + Enter, Esc dismiss

### Preview pane
Real-time render (subset features).

### Footer
Word count · estimated read time · auto-save status · draft saved time · status badge.

### Incident postmortem template
Saat URL `?source=incident&id=INC-XXX&title=...` → auto-fill template (timeline table, root cause, contributing factors, resolution, action items).

---

## 6. KBAnalytics

### KPI cards
Total views (+trend %), searches (+trend %), helpful rate %, active authors.

### Content Gaps Alert
Top searches tanpa matching article, dengan link create.

### Views Chart
30-day line chart + area fill, labeled axis (7d ticks), peak-day dots.

### Tables
- **Top Viewed**: rank, article, views, trend (↑% / NEW)
- **Most Helpful**: article, % helpful (color: ≥95% green / ≥80% amber / red), votes
- **Top Search Terms**: term, count, status (link or "CONTENT GAP")
- **Review Schedule**: article, overdue/due-soon/upcoming, next review, "Review" link to editor

---

## 7. User / UX Flow

### Author flow
1. Author click "New article" (di Browse).
2. Editor: isi metadata + body markdown, slash commands untuk template.
3. Auto-save jalan terus.
4. Klik **Publish now** → status `published`, set publishedAt/publishedBy.
5. ReviewReminderModal → pilih 90 hari → reviewDueAt distempel.

### Reader flow
1. Reader search "vpn pool" di /kb.
2. Click result → ArticleView.
3. Baca artikel, scroll-spy TOC ikut.
4. Bermanfaat → klik 👍.
5. Reference ke insiden ter-link → klik buka /incidents/:id.

### Postmortem dari insiden
1. Dari incident detail "Suggest article" → buka editor dengan source=incident.
2. Template auto-fill (timeline, root cause, action items).
3. Author edit & publish.

---

## 8. State Model

```
draft → in_review → published → archived (terminal)
   ↑                    ↓
   └─── (rework)    expired (terminal, kalau lewat reviewDueAt)
```

Server prevent same-status transition, prevent leaving terminal states.

---

## 9. Roles & Permissions

| Permission | Required | Aksi |
|---|---|---|
| `knowledge.read` | All staff | Browse, view, analytics |
| `knowledge.author` | Team Lead+ (IFM/APS/STA) | New article, edit, publish |

Non-author lihat KBEditorDenied.

---

## 10. Upstream Dependencies

Categories (hierarchical) · Users · Incidents (link) · Problems (link) · CMDB (link).

---

## 11. Downstream Effects

- **Incidents/Problems**: artikel KB muncul di Linked Items.
- **KEDB**: known error references KB articles.
- **Portal/Catalog**: linkedKBSlugs di catalog item.
- **Analytics**: search query tracking → content gap detection.

---

## 12. Data Model

`KBArticle` (`src/types/knowledge.ts`):
- Identity: id, slug, publicId (KB-NNNNN)
- Content: title, summary, body (markdown), categoryId/Name
- Lifecycle: status, visibility (internal/team/public), contentType, tags
- Authorship: authorId/Name, contributorIds, version, previousVersions
- Metrics: viewCount, helpfulCount, unhelpfulCount, averageReadTimeSeconds
- References: relatedCIPublicIds, linkedProblemIds, linkedIncidentIds, relatedArticleSlugs
- Timestamps: createdAt/updatedAt/publishedAt/publishedBy/reviewedAt/reviewDueAt/expiresAt

Sub: `KBCategory` (parentId hierarchy), `KBFeedback`, `KBAnalytics`.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/kb/articles` | `kb.read` |
| GET | `/kb/articles/:publicId` | `kb.read` |
| POST | `/kb/articles` | `kb.write` |
| PATCH | `/kb/articles/:publicId` | `kb.write` (excludes status) |
| PATCH | `/kb/articles/:publicId/status` | `kb.write` |
| GET | `/kb/categories` | `kb.read` |
| GET | `/kb/feedback?articleId=X` | `kb.read` |
| GET | `/kb/analytics` | `kb.read` |

PublicId allocation sequential `KB-${count+1}`. Slug generation lowercase alphanumeric+hyphens (max 80 char).

---

## 14. Realtime / Jobs

- **Review expiry job** (planned): scan reviewDueAt overdue → status `expired`.
- **Analytics aggregator**: views & search query tracking.
- **Audit log** untuk create/update/status change.

---

## 15. Open Gaps / TODO

- Public visibility belum diimplementasi (saat ini hanya internal/team).
- Editor tidak punya WYSIWYG; markdown only (untent design choice).
- Helpfulness feedback "Suggest an edit" link belum wired.
- Multi-tenant analytics belum di-isolate per tenant fully.

---

**Lihat juga:** [Incidents](./incidents.md) · [Problems](./problems.md) · [Self-Service Portal](./portal.md) · [CMDB](./cmdb.md)
