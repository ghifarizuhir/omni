# 08 — Design System

Status: **Stable**
Source of truth: [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md), [`src/index.css`](../../src/index.css)
Stack: React 19 + Vite + Tailwind 4 (`@theme` tokens) + `lucide-react` + `motion`

> Dokumen ini adalah **ringkas lifedoc** untuk `docs/design/`. Detail lengkap (tokens, component API, layout recipes) ada di [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) — **doc di sini menang** untuk urusan implementasi runtime; yang di sana adalah referensi komprehensif.

---

## Tokens (ringkas)

Tokens di `src/index.css` via `@theme` — **jangan hardcode hex**.

| Token | Value | Usage |
|-------|-------|-------|
| `ois-primary` | `#1F4FD4` | Primary button, links, tab indicator |
| `ois-bg` | `#F7F8FA` | Page background |
| `ois-surface` | `#FFFFFF` | Cards, modals |
| `ois-border` | `#E4E7EC` | Borders |
| `ois-text` | `#101828` | Primary text |
| `ois-text-muted` | `#475467` | Secondary |
| `ois-success/warning/danger/info` | `#12B76A`/`#F79009`/`#F04438`/`#0BA5EC` | Semantic |
| `ois-sev-p1..p4` | `#B42318`/`#DC6803`/`#DC6803`/`#027A48` | Priority |

Radius: `ois-card` 8px, `ois-btn` 6px, `ois-badge` 4px, `ois-modal` 12px. Font: `Inter` (sans), `JetBrains Mono` (mono IDs).

Full map lihat [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) §Foundations.

## Component inventory (yang lifedoc pantau)

| Component | File | Lifedoc focus |
|-----------|------|---------------|
| Button | `src/components/ui/Button.tsx` | variant/size API — lihat `docs/ui/design-tokens.md` |
| Badge | `src/components/ui/Badge.tsx` | semantic variants |
| Card / SectionCard | `src/components/ui/Card.tsx` | surface pattern |
| Tabs | `src/components/ui/Tabs.tsx` | active `border-ois-primary` |
| Avatar, Modal, Input, FilterDropdown | `src/components/ui/*` | props/usage |
| DataTable | `src/components/ui/DataTable.tsx` | `Column<T>` pattern |
| KPICard, IncidentStatusPill, IncidentPriorityBadge | `src/components/ui/*`, `src/components/incidents/*` | KPI/status/priority |

## Layout patterns (ringkas)

- **3-Column Detail:** `-m-6 flex flex-col` + `calc(100vh - 3.5rem)` + 3 independent scroll cols (280px sidebars). Lihat [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) §3-Column.
- **Module Layout:** `*Layout.tsx` + `<Outlet />` tabs sharing live header accent strip (`#B42318` P1 / `#DC6803` P2 / `#12B76A` ok / `#1F4FD4` info). Lihat `docs/DESIGN-SYSTEM.md` §Module Layout.
- **Nav Row, Priority Bar, Full-Height Flex** — semua di `docs/DESIGN-SYSTEM.md`.

## Contribution checklist (sebelum commit UI)

- [ ] Tidak ada hex mentah — semua via `ois-*` token
- [ ] Font/mono, tracking, icon `lucide-react` only
- [ ] Container/gap match tipe halaman (lihat `docs/ui/README.md` §Layout)
- [ ] Hover/focus/active states jelas
- [ ] No edit di `prisma/migrations/` atau generated client

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| Tailwind 4 `@theme` (bukan config JS) | Single source `src/index.css`, no `tailwind.config.js` | awal |
| Light theme only (no `data-theme` toggle) | OIS pale palette — dark mode belum ada (beda dengan terra `data-theme=light`) | 2026-08-28 |
| Module Layout untuk 3+ sub-pages sharing context | Collapse sidebar entry, tab bar sebagai intra-module nav | 2026-05 |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init lifedoc ringkas — ref ke `docs/DESIGN-SYSTEM.md` + `src/index.css`, north star `IncidentDetail` | — |
