# Self-Service Portal

> **Route utama:** `/portal` · **ITIL 4 Practice:** Service Request Management (end-user front door) · **Sumber kode:** `src/routes/portal/`

Portal adalah pintu masuk end-user untuk request layanan tanpa membuka tiket secara manual. Mendukung katalog, dynamic form, multi-step submission, dan tracking my requests.

---

## 1. Routes & Sub-pages

| Route | Komponen | Fungsi |
|---|---|---|
| `/portal` | `PortalHome` | Dashboard + hero search + quick actions |
| `/portal/catalog` | `Catalog` | Browse/search catalog dengan filter kategori |
| `/portal/catalog/:itemId` | `CatalogItemDetail` | 4-step form submission |
| `/portal/my-requests` | `MyRequests` | Tracking request user dengan tab |

`PortalLayout` membungkus tab-style nav (Home / Catalog / My Requests) + accent bar dinamis (orange pending_user, blue in_fulfillment, green submitted).

---

## 2. Key Features

- **Hero search** global → navigate `/portal/catalog?q=...`.
- **Quick actions**: Browse Catalog, My Requests, Knowledge Base, Talk to Service Desk (chat modal).
- **Recommended articles** & **popular catalog items**.
- **6 categories**: Access · Equipment · Software · Communication · Personnel · General.
- **Dynamic form** dari `CatalogItem.formFields` dengan 8 field types + conditional `showWhen`.
- **4-step wizard** Item Info → Form → Review → Submit, dengan validation per step.
- **My Requests** dengan tabs (All / Active / Completed / Drafts) + sort.
- **Mini stepper** untuk visualisasi workflow progress per request.
- **Service Desk chat** modal (simulated agent).

---

## 3. PortalHome

- Greeting personalized + global search bar.
- Quick action cards (4 cards).
- Your Activity (max 3 active requests dengan mini-stepper, link "View details").
- Recommended articles (curated by role).
- Popular catalog items (6 most-requested by popularity).
- Service Desk Chat modal: simulated agent "Riley", context-aware responses (password / hardware / access / incidents).

---

## 4. Catalog (`/portal/catalog`)

### Search & filter
- Full-text search (name, shortDescription, tags, category, publicId).
- 6 category filter tiles dengan count.
- 4 sort modes: Most relevant · Most popular · Fastest delivery · Recently added.

### 2-state UI
- **No search**: Recommended (top 6 popular) + Browse by Category tiles.
- **With search/filter**: Result cards dengan highlighted query terms.

### ResultCard
Item name + publicId, category badge, ETA, cost badge ("USD 1,250+" orange / "No cost" green), short description, tags (max 5), "Request →" CTA.

---

## 5. CatalogItemDetail — 4-step Submission

### Step 0 — Item Info
- Left: full description (light markdown), linked KB articles.
- Right: workflow preview (steps with type icon, approver, SLA hours), owned-by team, recently fulfilled count.

### Step 1 — Form
Dynamic fields dari `CatalogItem.formFields`. Field types:
- text, textarea, email, number, select, multiselect, date, checkbox
- user_picker, ci_picker, file_upload (advanced)

Conditional visibility via `field.showWhen`. Validation real-time, scroll-to-first-error.

### Step 2 — Review
Summary table responses + workflow steps + estimated completion (sum SLA hours).

RBAC gate: "Submit request" hanya muncul kalau user punya `request.create`.

### Step 3 — Success
Generated publicId `REQ-2026-{random}`, auto-redirect ke `/portal/my-requests` dalam 3 detik. Options: Track status / Submit another.

---

## 6. MyRequests (`/portal/my-requests`)

### Tabs
All · Active (submitted/approved/in_fulfillment/pending_user) · Completed (fulfilled/closed) · Drafts.

### Sort
Newest first (default) · Oldest first · By status priority.

### RequestCard
- Status badge color-coded
- Title, category, relative timestamp, SLA breach warning
- **Mini stepper** horizontal (✓/✗/number per step)
- Footer: active step + assignee, estimated completion / fulfilled date / rejection note

Empty states bervariasi per tab.

---

## 7. User / UX Flow

### Happy path
1. User open `/portal`, search "vpn access".
2. Auto-navigate `/portal/catalog?q=vpn+access`.
3. Klik card "VPN Access" → `/portal/catalog/{itemId}`.
4. Step 0: baca workflow, klik Continue.
5. Step 1: isi form (justification, duration, group). Validation real-time.
6. Step 2: review, klik Submit request.
7. Step 3: success screen → auto-redirect ke `/portal/my-requests`.
8. Track via mini-stepper, check status.

### Path — Returning user
1. Open `/portal` → "Your Activity" tampilkan active request.
2. Klik "View details" → `/requests/:id` (di luar portal, full agent view).

---

## 8. State Model

Lihat [Service Requests](./requests.md) untuk full state machine. Portal menampilkan view-only.

Status: draft → submitted → approved → in_fulfillment → pending_user → fulfilled → closed (atau rejected/cancelled).

---

## 9. Roles & Permissions

| Permission | Aksi |
|---|---|
| `request.create` | Submit request (gate di Step 2) |
| `request.read` (own) | Lihat my-requests |

Anyone authenticated dapat browse catalog & KB.

---

## 10. Upstream Dependencies

CatalogItems · KB articles (linkedKBSlugs) · Users (current session) · ServiceRequests (own).

---

## 11. Downstream Effects

- **Service Requests**: submit → POST /requests, masuk antrian fulfillment team.
- **Notifications**: assignee dan watcher di-notify.
- **Changes**: standard catalog item bisa men-trigger standard change otomatis.

---

## 12. Data Model

`CatalogItem` (`src/types/request.ts`):
- Identity, name, shortDescription, description, category
- iconName, estimatedFulfillmentDays, cost
- ownerTeamId, popularity
- `formFields[]` (FormField), `workflowTemplate[]` (WorkflowStepTemplate)
- linkedKBSlugs, tags, enabled

`FormField`: id, label, type, required, helpText, placeholder, defaultValue, options, min/max, minLength/maxLength, showWhen.

---

## 13. API Endpoints

| Method | Endpoint | Permission |
|---|---|---|
| GET | `/catalog` | `request.read` |
| POST | `/requests` (saat submit) | `request.create` |

Submission saat ini disimulasi setTimeout (line 527 CatalogItemDetail.tsx); akan di-wire ke endpoint POST production di M7.

---

## 14. Realtime / Jobs

- **Notifikasi assignee** saat submit (planned).
- **SLA breach checker** (cross-cutting dengan request module).

---

## 15. Open Gaps / TODO

- Submission masih simulated (setTimeout); belum POST ke `/requests` real.
- File upload field belum support upload ke storage backend.
- Service Desk chat masih mock; belum integrasi LLM/agent real.
- Recommended articles masih curated `RECOMMENDED_SLUGS`; belum personalized.

---

**Lihat juga:** [Service Requests](./requests.md) · [KB](./kb.md) · [Changes](./changes.md)
