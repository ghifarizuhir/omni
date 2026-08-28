# Card — OIS

Status: **Stable**
Source of truth: [`src/components/ui/Card.tsx`](../../src/components/ui/Card.tsx) (`Card`, `CardHeader`, `CardBody`, `CardFooter`) · [`src/routes/incidents/IncidentDetail.tsx`](../../src/routes/incidents/IncidentDetail.tsx) `SectionCard` pattern (§55-66) · [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) §Card & SectionCard · [`src/index.css`](../../src/index.css) tokens (`ois-surface`, `ois-border`, `ois-surface-muted`, `shadow-ois-card`, `rounded-ois-card 8px`)
Tokens: [`design-tokens.md`](./design-tokens.md) §1.2 Surface / §2 Radius / §3 Shadow

> `Card` adalah base surface primitive (`src/components/ui/Card.tsx:4-20`). `SectionCard` adalah **local pattern** yang di-copy paste di tiap detail page — bukan export dari `Card.tsx` (`docs/DESIGN-SYSTEM.md:300`). Jangan campur keduanya di halaman detail yang sama (`DESIGN-SYSTEM.md:339`).

---

## Purpose

Menyediakan surface ber-border konsisten untuk semua grouped content. Dua bentuk:

- **`Card` family** (`Card` + `CardHeader` + `CardBody` + `CardFooter`) — dipakai di **list / overview / dashboard** sebagai panel generik dengan shadow.
- **`SectionCard`** — dipakai di **detail pages** (Incident, Change, Problem, CMDB CI, Request, Release, Improvement, dsb.) sebagai satu-satunya card di sidebar + tab content. Lihat [`../features/_shared/entity-detail-page.md`](../features/_shared/entity-detail-page.md) §4 — doc ini adalah deep-dive untuk anatomy token-level, sedangkan `_shared/entity-detail-page.md` adalah shell 3-column kanonik.

North star untuk `SectionCard`: `IncidentDetail.tsx:55-66` (`docs/DESIGN-SYSTEM.md:3`). Jika ragu, cek file itu dulu.

Paritas terra: `Card`/`SectionCard` diadaptasi dari `terra-service-management` — tapi token terra (`linear-card`, `terra-*`, dark `data-theme`) diganti `ois-*` light palette (`#F7F8FA` bg, `#FFFFFF` surface) tanpa toggle.

---

## Anatomy

### 1. `Card` family — `src/components/ui/Card.tsx:4-20`

Empat plain `<div>` wrappers dengan `className` passthrough via `cn()` (`src/lib/utils.ts`). Tidak ada `variant`/`size` props — styling sepenuhnya via token classes.

```
┌─────────────────────────────────────────┐
│ Card  (bg-ois-surface, border, rounded,  │  overflow-hidden, shadow
│        shadow-ois-card)                  │
│ ┌─────────────────────────────────────┐ │
│ │ CardHeader  px-5 py-4  border-b (?)  │ │  ← header region
│ ├─────────────────────────────────────┤ │
│ │ CardBody    p-5                     │ │  ← default padd 16-20px
│ ├─────────────────────────────────────┤ │
│ │ CardFooter  px-5 py-3  bg-muted      │ │  ← muted footer
│ │             border-t (?)            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### Exact classes (verbatim dari source)

| Component | File:line | Classes (verbatim) | Token mapping |
|-----------|-----------|---------------------|---------------|
| `Card` | `Card.tsx:5` | `bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden` | `ois-surface #FFFFFF` · `ois-border #E4E7EC` · `rounded-ois-card 8px` (`--radius-ois-card`) · `shadow-ois-card 0 1px 2px rgba(16,24,40,0.04)` |
| `CardHeader` | `Card.tsx:11` | `px-5 py-4 border-bottom border-ois-border` | `px-5 (20px) py-4 (16px)` · `ois-border #E4E7EC` — `border-bottom` **bukan** Tailwind valid (harusnya `border-b`); saat ini tidak merender border bawah |
| `CardBody` | `Card.tsx:15` | `p-5` | `p-5 (20px)` |
| `CardFooter` | `Card.tsx:19` | `px-5 py-3 bg-ois-surface-muted border-top border-ois-border` | `ois-surface-muted #F1F3F7` · `border-top` **bukan** Tailwind valid (harusnya `border-t`); saat ini tidak merender border atas |

- Semua komponen signature: `React.FC<React.HTMLAttributes<HTMLDivElement>>` — menerima `className`, `children`, dan semua native `div` props (`onClick`, `style`, `id`, dsb.) via `...props`.
- `cn()` merge: caller `className` di-append setelah base classes sehingga bisa override padding/border bila diperlukan.
- `Card` tidak menetapkan `text-*` atau `font-*` — pewarisan dari `body text-[14px] text-ois-text` (`src/index.css:62`).

#### Props

| Component | Props | Type | Default |
|-----------|-------|------|---------|
| `Card` | `className` | `string?` | — |
| `CardHeader` | `className` | `string?` | — |
| `CardBody` | `className` | `string?` | — |
| `CardFooter` | `className` | `string?` | — |

Tidak ada `title` prop — header content bebas (bisa `<h3>`, `<p>`, atau action row). Untuk header ber-label uppercase, pakai `SectionCard` alih-alih `CardHeader`.

### 2. `SectionCard` — local pattern di detail pages

**Bukan** export dari `Card.tsx`. Didefinisikan lokal di tiap detail page — copy-paste verbatim:

```tsx
// src/routes/incidents/IncidentDetail.tsx:55-66
// src/routes/changes/ChangeDetail.tsx:33-44 (identik)
// src/routes/cmdb/CMDBDetail.tsx:43-54 (identik)
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

#### Exact classes

| Region | Classes | Token |
|--------|---------|-------|
| Outer | `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` | `ois-border #E4E7EC` · `ois-surface #FFFFFF` · `rounded-lg 8px` (= `rounded-ois-card`, tapi via Tailwind default bukan token class) · `overflow-hidden` clip header bg |
| Header (conditional `title`) | `px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted` | `px-4 (16px) py-2.5 (10px)` · `ois-surface-muted #F1F3F7` · `border-b` valid Tailwind |
| Header text | `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` | `ois-text-subtle #98A2B3` · `11px` + `tracking-widest` + `uppercase` adalah label kanonik section (lihat `design-tokens.md` §4) |
| Body | `p-4` | `p-4 (16px)` — bukan `p-5` seperti `CardBody` |

#### Variants yang ada di codebase (dipertahankan)

| File | Divergence dari kanonik | Status |
|------|-------------------------|--------|
| `ProblemDetail.tsx:51-60` | Body `space-y-2` di dalam `p-4` container (untuk list-heavy cards) — header identik | sah — jangan normalisasi paksa |
| `RequestDetail.tsx:331-338` | Alias `SideCard` — header **selalu render** (tanpa `title &&` guard) | sah — compact sidebar variant |
| `ChangeDetail.tsx:33-44`, `CMDBDetail.tsx:43-54` | Identik dengan `IncidentDetail` | kanonik |
| `notifications` `NotificationPreferences.tsx:41-51` | `rounded-2xl p-6 space-y-5` dengan `h2 text-base font-semibold` + `p text-sm muted` — **bukan** `SectionCard` kanonik; preferensi card lebih rounded (`2xl` vs `8px`) | dikecualikan — jangan unify sembarang (`docs/features/notifications.md:128`) |

Jangan membuat card custom dengan `rounded-xl`/`rounded-2xl`/`shadow` berbeda di detail pages baru — pakai `SectionCard` verbatim.

---

## Behavior

### Card composition

`Card` adalah composite bebas — caller memilih kombinasi child mana yang dirender. Tidak ada slot enforcement atau context:

```tsx
// Full composition
<Card>
  <CardHeader>Header content</CardHeader>
  <CardBody>Body content</CardBody>
  <CardFooter>Footer content</CardFooter>
</Card>

// Body-only
<Card><CardBody>Simple panel</CardBody></Card>

// Header + body (tanpa footer)
<Card>
  <CardHeader><h3 className="text-sm font-semibold text-ois-text">Title</h3></CardHeader>
  <CardBody>Content</CardBody>
</Card>
```

`overflow-hidden` pada `Card` outer memastikan `rounded-ois-card` clip `CardHeader`/`CardFooter` background — jangan hapus.

### SectionCard composition

```tsx
<SectionCard title="At a glance">
  <dl className="divide-y divide-ois-border -mx-4 -mb-4">
    <div className="flex items-center justify-between px-4 py-2.5 text-xs">
      <dt className="text-ois-text-muted">Status</dt>
      <dd className="font-medium text-ois-text"><IncidentStatusPill status={status} /></dd>
    </div>
  </dl>
</SectionCard>

<SectionCard>{/* tanpa title — hanya body p-4 */}</SectionCard>

<SectionCard title="Linked changes (3)" className="border-ois-border-strong">
  {/* className override via cn() */}
</SectionCard>
```

- `title` optional — jika `undefined`/falsy, header tidak dirender, hanya `p-4` body.
- `className` di `SectionCard` diteruskan ke outer `div` via `cn()` sehingga bisa menambah `border-*`/`shadow-*`.
- Konten di dalam `p-4` bebas — `dl`, `space-y-*`, `divide-y`, atau custom layout.

---

## Usage

### Card (list / overview)

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/src/components/ui/Card';

<Card>
  <CardHeader>
    <h3 className="text-sm font-semibold text-ois-text">Recent incidents</h3>
  </CardHeader>
  <CardBody>
    <p className="text-sm text-ois-text-muted">Content…</p>
  </CardBody>
  <CardFooter>
    <Button variant="ghost" size="sm">View all</Button>
  </CardFooter>
</Card>

// Custom padding override
<Card>
  <CardBody className="p-6">Wider padding</CardBody>
</Card>
```

### SectionCard (detail sidebars & tab content)

```tsx
// IncidentDetail pattern — sidebar & tab blocks
import { cn } from '@/src/lib/utils';

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

// Left sidebar — At a glance
<SectionCard title="At a glance">
  <dl className="space-y-2 text-xs">
    <div className="flex justify-between"><dt className="text-ois-text-muted">Priority</dt><dd className="font-medium">P1</dd></div>
  </dl>
</SectionCard>

// Tab content
<SectionCard title="Linked KB articles (2)">
  {articles.map(a => <div key={a.id} className="flex justify-between py-1">{/* … */}</div>)}
</SectionCard>

// CollapsibleSection variant (IncidentDetail:146-156) — alternatif dengan <details>
<details open className="group border border-ois-border rounded-lg bg-white/80 backdrop-blur-sm overflow-hidden">
  <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between bg-ois-surface-muted hover:bg-ois-surface">
    <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Description</span>
    <ChevronDown size={14} className="text-ois-text-subtle group-open:rotate-180 transition-transform" />
  </summary>
  <div className="p-4">{children}</div>
</details>
```

---

## Tokens & Measurements

Semua token didefinisikan di `src/index.css:7-58` via `@theme` — ref lengkap di `design-tokens.md`.

| Token | Value | Class | Dipakai di |
|-------|-------|-------|------------|
| `ois-surface` | `#FFFFFF` | `bg-ois-surface` | `Card` outer, `SectionCard` outer |
| `ois-surface-muted` | `#F1F3F7` | `bg-ois-surface-muted` | `CardFooter` bg, `SectionCard` header bg |
| `ois-border` | `#E4E7EC` | `border-ois-border` | Outer border + header `border-b` |
| `ois-border-strong` | `#D0D5DD` | `border-ois-border-strong` | Alternative strong separator |
| `ois-text` | `#101828` | `text-ois-text` | Judul di header/body |
| `ois-text-subtle` | `#98A2B3` | `text-ois-text-subtle` | Header label `11px` |
| `ois-bg` | `#F7F8FA` | `bg-ois-bg` | Page background di luar card (`_shared/entity-detail-page.md` outer `-m-6 bg-ois-bg`) |
| `shadow-ois-card` | `0 1px 2px rgba(16,24,40,0.04)` | `shadow-ois-card` | `Card` outer saja — `SectionCard` **tanpa** shadow |
| `shadow-ois-card-hover` | `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` | `shadow-ois-card-hover` | Hover elevation (tidak dipakai di `Card` saat ini) |
| `rounded-ois-card` | `8px` | `rounded-ois-card` | `Card` outer — `SectionCard` pakai `rounded-lg` (ekuivalen 8px tapi via Tailwind default) |
| `rounded-ois-btn` | `6px` | `rounded-ois-btn` | Buttons di dalam card |
| `rounded-ois-badge` | `4px` | `rounded-ois-badge` | Badges di dalam card |
| `rounded-ois-modal` | `12px` | `rounded-ois-modal` | Modals |

Padding scale: `p-4 (16px)` SectionCard body & header `px-4 py-2.5` vs `p-5 (20px)` CardBody & `px-5 py-4` CardHeader — Card sedikit lebih lega (list/overview density), SectionCard lebih compact (detail sidebar density).

---

## Do / Don't

| ✅ Do | ❌ Don't |
|-------|----------|
| Gunakan `SectionCard` untuk semua sidebar dan tab content blocks di detail pages (`At a glance`, `Risk Factors`, `Quick Actions`, dsb.) — lihat `_shared/entity-detail-page.md` §7 | Jangan campur `Card` dan `SectionCard` di halaman detail yang sama — pilih satu, konsisten (`docs/DESIGN-SYSTEM.md:339`) |
| Sertakan `title` prop untuk section yang perlu label — otomatis `uppercase tracking-widest 11px` | Jangan buat card custom dengan `border`/`rounded-*`/`shadow-*` berbeda (mis. `rounded-xl`, `rounded-2xl`, `shadow-md`) di detail pages |
| Copy-paste `SectionCard` verbatim termasuk `cn()` merge dan `overflow-hidden` | Jangan export `SectionCard` ke `src/components/ui/Card.tsx` — biarkan lokal per page (kontrak saat ini) |
| Gunakan `Card` + `CardBody` untuk list/overview/dashboard panels di luar detail shell | Jangan gunakan `CardHeader`/`CardFooter` yang saat ini `border-bottom`/`border-top` invalid sebagai separator — pakai `SectionCard` border-b untuk detail, atau fix upstream dulu |
| Override padding via `className` (`<CardBody className="p-6">`) bila perlu density berbeda | Jangan hardcode hex (`#FFFFFF`, `#E4E7EC`) — selalu `ois-*` tokens |

---

## Edge Cases

| Case | Expected behavior | Ref |
|------|-------------------|-----|
| **Card tanpa Header/Footer** | Render `<Card><CardBody>…</CardBody></Card>` — tetap `border + rounded-ois-card + shadow + overflow-hidden` | `Card.tsx:4-8` |
| **SectionCard tanpa title** | Guard `title &&` — header `div` tidak dirender, hanya `p-4` body. `RequestDetail:SideCard` variant selalu render header (tanpa guard) | `IncidentDetail.tsx:59`, `RequestDetail.tsx:331-338` |
| **SectionCard title panjang** | Header `p` `text-[11px] uppercase tracking-widest` wrap natural; tidak ada `truncate`. Untuk count badge, sertakan di title string: `"Linked changes (3)"` | `ChangeDetail`, `ProblemDetail` |
| **Empty card body** | Tetap render `SectionCard` dengan `p-4` kosong + body `text-sm text-ois-text-subtle text-center py-6 italic "No CIs linked."` — jangan hide card (`_shared/entity-detail-page.md` Edge Cases) | `IncidentDetail:617-619`, `ProblemDetail:815` |
| **CardHeader/CardFooter border tidak muncul** | `border-bottom` / `border-top` adalah class invalid Tailwind — tidak ada border yang ter-render saat ini. Visual separator hanya `bg-ois-surface-muted` footer/header. Fix: ganti ke `border-b` / `border-t` atau `border-b border-ois-border` | `Card.tsx:11,19` |
| **Rounded mismatch** | `Card` pakai `rounded-ois-card 8px` (token), `SectionCard` pakai `rounded-lg 8px` (Tailwind default) — nilai ekuivalen (8px) tapi class berbeda. Jangan unify ke `rounded-ois-card` tanpa audit (`notifications` pakai `rounded-2xl` intentional) | `src/index.css:55`, `IncidentDetail.tsx:58` |
| **Shadow** | `Card` punya `shadow-ois-card` always-on; `SectionCard` tanpa shadow (flat border saja). Hover `shadow-ois-card-hover` tidak wired di `Card` — tidak ada hover state saat ini | `src/index.css:50-51` |
| **Overflow clipping** | `overflow-hidden` pada outer clip `bg-ois-surface-muted` header agar respect `rounded-*` — jangan hapus | `Card.tsx:5`, `IncidentDetail.tsx:58` |
| **Responsive / narrow viewport** | Card `w-full` fluid; SectionCard di sidebars `w-[280px] shrink-0` parent (`_shared/entity-detail-page.md` §3). Di narrow `<768px`, detail mensyaratkan desktop — belum responsive (`docs/features/incidents.md:142`) | `_shared/entity-detail-page.md` |
| **Reduced motion** | Tidak ada animasi pada Card/SectionCard — safe untuk `prefers-reduced-motion` (`src/index.css:93-125`) | `src/index.css` |
| **Dark mode** | Tidak ada `data-theme` toggle — OIS light only (`#F7F8FA` / `#FFFFFF`) — jangan introduce `linear-card` dark overlay (`docs/design/08-design-system.md:61`) | `08-design-system.md` |

---

## API Touchpoints

`Card` / `SectionCard` adalah **pure presentational** — tidak ada endpoint, hook, atau permission. Dipakai di detail pages yang mount di bawah `requireAuth` + `withScopedDb` (`server/app.ts:126`):

| Konsumen | Endpoint (detail page) | Permission | Catatan |
|----------|------------------------|------------|---------|
| `IncidentDetail` | `GET /api/v1/incidents/:publicId` | `incident.read` | `SectionCard` + `CollapsibleSection` + `AboutRail` |
| `ProblemDetail` | `GET /api/v1/problems/:publicId` | `problem.read` | `SectionCard` `At a glance` / `Related` / `Fix Plan` |
| `ChangeDetail` | `GET /api/v1/changes/:publicId` | `change.read` | `SectionCard` `Approvals` / `Risk factors` |
| `CMDBDetail` | `GET /api/v1/cmdb/cis/:publicId` | `cmdb.read` | `SectionCard` `Details` / `Relationships` |
| `RequestDetail` | `GET /api/v1/requests` → `comments(publicId)` | `request.read` | `SideCard` alias |

Scope guard: jangan import `prisma`/`@prisma/client` di route files — gunakan `req.scoped.*` (`eslint no-restricted-imports` `server/routes/**/*.ts`). Exempt: `admin.ts`, `applications.ts` (`AGENTS.md`). `ScopeViolationError` → 403 `{ error: 'scope_violation' }` (`server/scope/errors.ts:9`).

---

## Design Preservation

Wajib pertahankan — diambil dari `src/index.css` + `src/components/ui/Card.tsx` + exemplar files:

1. **Tokens exclusively `ois-*`** — `ois-surface #FFFFFF`, `ois-surface-muted #F1F3F7`, `ois-border #E4E7EC`, `ois-border-strong #D0D5DD`, `ois-text #101828`, `ois-text-muted #475467`, `ois-text-subtle #98A2B3`, `ois-bg #F7F8FA` (`src/index.css:12-22`). Radius `rounded-ois-card 8px` / `rounded-lg` (ekuivalen), shadow `shadow-ois-card` / `shadow-ois-card-hover` (`src/index.css:50-58`). **Jangan** hardcode hex atau pakai `terra-*`/`linear-*` dark.
2. **Card outer** `bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden` — jangan hapus `overflow-hidden` atau ubah `rounded-*`/`shadow-*` tanpa audit.
3. **CardHeader** `px-5 py-4` + `border-ois-border` — saat ini `border-bottom` invalid (no render). **Jangan** andalkan border sebagai separator sampai di-fix ke `border-b`.
4. **CardBody** `p-5` — jangan ganti ke `p-4`/`p-6` sebagai default; override via `className` bila density spesifik dibutuhkan.
5. **CardFooter** `px-5 py-3 bg-ois-surface-muted` + `border-ois-border` — saat ini `border-top` invalid (no render). Footer muted bg membedakan dari body.
6. **SectionCard outer** `border border-ois-border rounded-lg bg-ois-surface overflow-hidden` + header `px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted` + header text `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` + body `p-4` (`docs/DESIGN-SYSTEM.md:320-332`). Satu pattern untuk semua sidebar & tab blocks — copy verbatim.
7. **Header label** selalu `text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest` — bukan `tracking-wider`, `tracking-wide`, `text-xs`, atau `font-bold`. `tracking-widest` adalah kontrak (`design-tokens.md` §4).
8. **No shadow on SectionCard** — `SectionCard` flat border saja; `shadow-ois-card` hanya untuk `Card`. Jangan tambah shadow ke detail sidebars.
9. **Do not unify rounded variants** — `notifications` `rounded-2xl p-6` preferences card adalah intentional deviation; jangan paksa `rounded-lg` ke sana.
10. **Icon set** `lucide-react` only — jika header perlu icon, `size 12-14` konsisten (`design-tokens.md` §5).
11. **Scope & auth** — presentational saja, tapi parent detail pages selalu di bawah `requireAuth` + `withScopedDb` + `requirePermission(...)` — jangan render detail card tanpa gate.
12. **Cross-ref tokens** — semua token def di `design-tokens.md`; jangan duplikasi definisi hex/radius/shadow di doc ini (hanya mapping penggunaan).

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init deep spec — `Card` family (`Card`/`CardHeader`/`CardBody`/`CardFooter`) exact classes verbatim (`src/components/ui/Card.tsx:4-20`) incl. `border-bottom`/`border-top` invalid note, `SectionCard` canonical + variants (`IncidentDetail:55-66`, `ProblemDetail:51-60`, `RequestDetail:331-338`), tokens (`ois-surface`, `ois-border`, `ois-surface-muted`, `shadow-ois-card`, `rounded-ois-card 8px` via `src/index.css:12-58`), padding delta `p-5` vs `p-4`, Do/Don't (no mixing Card/SectionCard per detail page), edge cases (empty, rounded mismatch, overflow-hidden), API touchpoints (presentational) | — |
