# Button

Status: **Stable**
Source of truth: [`src/components/ui/Button.tsx`](../../src/components/ui/Button.tsx) · [`src/index.css`](../../src/index.css) · [`src/lib/utils.ts`](../../src/lib/utils.ts) · [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md)

> Shared primitive untuk semua actions. **Satu-satunya button API** —jangan duplikasi `<button>` raw untuk variant/size yang sudah ada. Token hex di sini menang atas `DESIGN-SYSTEM.md` jika berbeda; nilai aktual runtime = `Button.tsx` + `index.css`.

---

## Purpose

Menstandarkan visual + interaksi semua CTA OIS (primary action, secondary, cancel/ghost, destructive, outline, icon-only) dan loading state. dipakai di: detail headers, SectionCard actions, tab action rows, modals, table rows, sidebar/toolbar, Module Layout, Inbox.

Berbeda dari native `<button>` — sudah ter-enforce `rounded-ois-btn`, `font-medium`, `transition-colors`, `disabled:opacity-50 disabled:pointer-events-none`, `active:scale-[0.98]`, dan `loading` spinner built-in.

---

## Anatomy

```tsx
// src/components/ui/Button.tsx:10-48
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => { ... }
);
```

DOM render `Button.tsx:27-46`:

```tsx
<button
  ref={ref}
  className={cn(
    'inline-flex items-center justify-center rounded-ois-btn font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
    variants[variant],
    sizes[size],
    className
  )}
  disabled={loading || props.disabled}
  {...props}
>
  {loading && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" ...>...</svg>}
  {children}
</button>
```

- `cn()` dari `src/lib/utils.ts:4-6` (`clsx` + `twMerge`) — `className` prop override merge tailwind conflict dengan benar.
- `forwardRef` — ref diteruskan ke `<button>` native.
- `disabled` di-compute `loading || props.disabled` (`Button.tsx:36`) — loading otomatis disable click.

---

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'destructive' \| 'outline'` | `'primary'` | Visual style — exact classes lihat §Variants |
| `size` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | Height + padding + text size |
| `loading` | `boolean` | `false` | Tampilkan spinner kiri, `disabled=true` |
| `className` | `string` | — | Tailwind override via `cn()` |
| `...props` | `ButtonHTMLAttributes` | — | Semua native `<button>` attrs (`onClick`, `type`, `disabled`, `aria-*`) |

Semua props selain `variant/size/loading/className/children/ref` di-spread sebagai `{...props}` — termasuk `type="submit"` untuk form.

---

## Variants

Exact strings dari `Button.tsx:12-18`:

| Variant | Classes | Height (via size) | Use when |
|---------|---------|-------------------|----------|
| `primary` | `bg-ois-primary text-white hover:bg-ois-primary-hover shadow-sm` | `h-9` (md default) | **Satu main action** per panel/form/modal — Resolve, Save, Confirm |
| `secondary` | `bg-ois-surface-muted text-ois-text hover:bg-ois-border border border-ois-border` | `h-9` | Secondary di sebelah primary |
| `ghost` | `bg-transparent text-ois-text hover:bg-ois-surface-muted` | `h-9` | Inline controls, cancel, dismiss |
| `destructive` | `bg-ois-danger text-white hover:bg-red-700 shadow-sm` | `h-9` | Irreversible: Delete, Revoke, Close problem — ⚠️ hover `bg-red-700` adalah hardcode Tailwind (bukan `ois-danger` token) |
| `outline` | `bg-transparent border border-ois-border-strong text-ois-text hover:bg-ois-surface-muted` | `h-9` | Tertiary, table row actions, "Link X" triggers |

**Token mapping (dari `src/index.css:7-32`):**

| Token | Value | Classes |
|-------|-------|---------|
| `ois-primary` | `#1F4FD4` | `bg-ois-primary` |
| `ois-primary-hover` | `#1A42B5` | `hover:bg-ois-primary-hover` (hanya `primary`) |
| `ois-surface-muted` | `#F1F3F7` | `bg-ois-surface-muted` (`secondary`) / `hover:bg-ois-surface-muted` (`ghost/outline`) |
| `ois-border` | `#E4E7EC` | `border-ois-border` (`secondary`) / `hover:bg-ois-border` (`secondary`) |
| `ois-border-strong` | `#D0D5DD` | `border-ois-border-strong` (`outline`) |
| `ois-text` | `#101828` | `text-ois-text` (`secondary/ghost/outline`) |
| `ois-danger` | `#F04438` | `bg-ois-danger` (`destructive`) — hover `bg-red-700` (`#B91C1C`) bukan token |
| `shadow-sm` | Tailwind default | `shadow-sm` (`primary/destructive`) — bukan `shadow-ois-card` |

Cross-ref: definisi token lengkap lihat [`design-tokens.md`](./design-tokens.md) §1. Jangan duplikasi.

---

## Sizes

Exact strings dari `Button.tsx:20-25`:

| Size | Classes | Height | Padding | Text | Use |
|------|---------|--------|---------|------|-----|
| `sm` | `h-8 px-3 text-xs` | `32px` | `12px` hori | `12px` | **Sidebars, modals, table rows, compact UIs** — default untuk detail page |
| `md` | `h-9 px-4 text-sm` | `36px` | `16px` | `14px` | **Default** — forms, page-level CTAs |
| `lg` | `h-10 px-6 text-base` | `40px` | `24px` | `16px` | Hero actions only |
| `icon` | `h-9 w-9 p-0 flex items-center justify-center` | `36px` | `0` | — | Icon-only (overflow, close, bell) |

`icon` override flex centering redundan dengan base `inline-flex items-center justify-center` — tetap `h-9 w-9` square.

---

## States

| State | Classes / Behavior | Trigger |
|-------|--------------------|---------|
| **Default** | Variant + size + base `rounded-ois-btn font-medium transition-colors` | — |
| **Hover** | Per variant (`hover:bg-ois-primary-hover` / `hover:bg-ois-border` / `hover:bg-ois-surface-muted` / `hover:bg-red-700`) | `:hover` |
| **Active** | `active:scale-[0.98]` (base) | `:active` — 2% shrink feedback |
| **Disabled** | `disabled:opacity-50 disabled:pointer-events-none` + native `disabled` attr | `disabled` prop / `loading=true` |
| **Loading** | `disabled` + spinner `animate-spin -ml-1 mr-2 h-4 w-4 text-current` sebelum `children` | `loading={true}` |
| **Focus** | Native browser focus ring (tidak ada `focus:ring` custom di Button — Input punya `ring-2 ring-ois-primary/20`) | `Tab` |

**Loading spinner** (`Button.tsx:39-44`):

```tsx
{loading && (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)}
```

- `animate-spin` Tailwind — respects `prefers-reduced-motion`? Tidak — spinner tetap spin (acceptable).
- `-ml-1 mr-2` offset agar tidak menambah gap ekstra saat tidak loading.
- `text-current` — ikut `text-white` (`primary/destructive`) atau `text-ois-text` (lainnya).

---

## Usage

```tsx
import { Button } from '@/src/components/ui/Button';

// Primary — satu per panel
<Button variant="primary" size="sm">Resolve</Button>
<Button variant="primary" loading>Saving…</Button>

// Secondary di sebelah primary
<div className="flex gap-2">
  <Button variant="primary" size="sm">Confirm</Button>
  <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
</div>

// Outline dengan icon (lucide-react 14px + mr-1)
<Button variant="outline" size="sm">
  <Plus size={14} className="mr-1" /> Link CI
</Button>

// Ghost cancel di Modal footer
<Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>

// Destructive — konfirmasi irreversibel
<Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>

// Icon-only (close / overflow) — isi icon sendiri
<Button variant="ghost" size="icon" aria-label="Close">
  <X size={16} />
</Button>

// Form submit — type native via spread
<Button type="submit" variant="primary" loading={submitting}>Save changes</Button>
```

**Anti-pattern (jangan):**

```tsx
// ❌ Dua primary bersebelahan — hierarchy hilang
<Button variant="primary">Save</Button>
<Button variant="primary">Cancel</Button>

// ❌ Manual <button> duplikasi variant
<button className="bg-ois-primary text-white ...">Save</button>

// ❌ Destructive untuk aksi reversible (gunakan ghost/outline)
<Button variant="destructive" onClick={togglePin}>Pin</Button>
```

---

## Hierarchy & Placement

- **Satu `primary` maksimum per panel / action row / modal footer** — menandai dominant action.
- Action row (Module Layout tab) — `ghost`/`outline` untuk secondary, `primary` paling kanan (`docs/DESIGN-SYSTEM.md` §Module Layout Action Row).
- Sidebar / table rows / compact UIs — pakai `size="sm"` konsisten (`DESIGN-SYSTEM.md` §Button Do/Don't).
- Icon+label — `gap-1.5` di Button `className` atau `mr-1` di icon (`<Plus size={14} className="mr-1" />`), ukuran icon `12-14px` untuk `sm`.

---

## Tokens & Styling

Base classes (`Button.tsx:31`):

```
inline-flex items-center justify-center rounded-ois-btn font-medium transition-colors
disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]
```

| Concern | Token / Class | Value | Source |
|---------|---------------|-------|--------|
| Radius | `rounded-ois-btn` / `--radius-ois-btn` | `6px` | `src/index.css:56` |
| Font weight | `font-medium` | `500` | Tailwind — body `14px` default `src/index.css:63` |
| Transition | `transition-colors` | `color, bg, border, text` 150ms | Tailwind default |
| Shadow | `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Tailwind — bukan `shadow-ois-card` |
| Active scale | `active:scale-[0.98]` | `0.98` | Arbitrary Tailwind |
| Disabled | `opacity-50` | `0.5` | `disabled:` variant |

Lihat [`design-tokens.md`](./design-tokens.md) §2 Radius (`ois-btn 6px`), §1 Color (`ois-primary #1F4FD4`, `ois-danger #F04438`), §4 Font (`text-xs/sm/base`).

---

## Accessibility

- Native `<button>` — keyboard `Enter`/`Space`, focusable, `disabled` prevents interaction.
- `loading` sets `disabled` — screen reader announce disabled; spinner `svg` tidak punya `aria-label` — tambah `aria-busy`/`aria-label="Loading"` di consumer jika butuh.
- `icon` size — wajib `aria-label` (e.g., `aria-label="Close"`, `aria-label="More actions"`).
- Ghost/outline contrast `text-ois-text #101828` on white/muted — WCAG AA pass.

---

## Edge Cases

- `loading + disabled` — `disabled={loading || props.disabled}` → tetap disabled, spinner tampil.
- `className` override — via `cn(..., className)` di akhir, bisa override `bg-*`/`px-*`/`h-*` berkat `twMerge`.
- `type` tidak di-destructure — default browser `type="submit"` di form; eksplisit `type="button"` jika di luar form.
- `children` kosong + `loading` — hanya spinner render; hindari tanpa `children` + `aria-label`.
- `onClick` saat `loading` — tidak fire karena `disabled`.

---

## API Touchpoints

Tidak ada network call. UI primitive murni. Dipakai di ~40+ route/component (`src/routes/*`, `src/components/*`) — tidak perlu `requirePermission` guard sendiri; perm check di route level.

---

## Design Preservation

Wajib pertahankan saat refactor:

1. **Exact variant strings** `Button.tsx:12-18` — `primary bg-ois-primary hover:bg-ois-primary-hover`, `secondary bg-ois-surface-muted border-ois-border`, `ghost bg-transparent hover:bg-ois-surface-muted`, `destructive bg-ois-danger hover:bg-red-700`, `outline border-ois-border-strong` — jangan ganti ke hex raw atau token lain.
2. **Exact size strings** `Button.tsx:20-25` — `sm h-8 px-3 text-xs`, `md h-9 px-4 text-sm`, `lg h-10 px-6 text-base`, `icon h-9 w-9 p-0`.
3. **Base** `inline-flex items-center justify-center rounded-ois-btn font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]` (`Button.tsx:31`).
4. **`radius-ois-btn 6px`** (`src/index.css:56`) — jangan ganti ke `rounded-lg`/`8px`.
5. **`loading` → `disabled` + spinner** `animate-spin -ml-1 mr-2 h-4 w-4` (`Button.tsx:36,40`) — jangan bikin spinner di kanan atau tanpa `-ml-1`.
6. **`cn()` merge** dari `src/lib/utils.ts:4` (`clsx` + `twMerge`) — jangan ganti ke string concat.
7. **`forwardRef`** — keep ref forwarding.
8. **One primary per panel** — guard di review, bukan di code.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deep spec init — migrate `src/components/ui/Button.tsx:1-49` (5 variants + 4 sizes + loading) + `docs/DESIGN-SYSTEM.md` §Button + `src/index.css:7-59` tokens (`ois-primary #1F4FD4`, `ois-primary-hover #1A42B5`, `ois-danger #F04438`, `radius-ois-btn 6px`) ke template ui (Props/Variants/Sizes/States/Usage/Preservation) | — |
