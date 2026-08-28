# Design Tokens — OIS (Technical)

Status: **Stable**
Source of truth: [`src/index.css:1-59`](../../src/index.css#L1-L59) — `@theme` block defines every `--color-ois-*`, `--shadow-ois-*`, `--radius-ois-*`, `--font-*` with literal hex / shadow / radius values. Runtime values = `src/index.css`; this doc is a derived reference. Component animations at [`src/index.css:116-123`](../../src/index.css#L116-L123) (`ois-topbar-stripe`, `ois-fade-up`, `ois-shimmer`).
Stack: Tailwind 4 `@theme` + CSS custom properties. **Light theme only** — no `data-theme="light"` toggle (OIS default `bg-ois-bg #F7F8FA`, `text-ois-text #101828`). Never hardcode hex — always consume via `ois-*` classes.

> All tokens are defined in `src/index.css:1-59` via `@theme`. **Always use `ois-*` via `@theme` — never hardcode hex literals.** Cross-ref: [`docs/DESIGN-SYSTEM.md`](../DESIGN-SYSTEM.md) §Color Tokens / Typography / Spacing & Radius / Shadows, [`docs/ui/sidebar.md`](./sidebar.md), [`docs/ui/button.md`](./button.md), [`docs/ui/card.md`](./card.md), [`docs/ui/topbar.md`](./topbar.md).

---

## Table of Contents

1. [Color Tokens](#1-color-tokens)
2. [Radius Scale](#2-radius-scale)
3. [Shadow Scale](#3-shadow-scale)
4. [Font Scale](#4-font-scale)
5. [Icon Conventions](#5-icon-conventions)
6. [Motion](#6-motion)
7. [Spacing](#7-spacing)
8. [Do / Don't](#8-do--dont)
9. [Changelog](#changelog)

---

## 1. Color Tokens

All colors live in `src/index.css:3-59` inside `@theme`. Consume via Tailwind `ois-*` utilities (`bg-ois-primary`, `text-ois-text-muted`, `border-ois-border`, `bg-ois-sidebar-bg`, etc.). Hex values below are verbatim from `src/index.css:7-49`.

> **Convention:** `--color-ois-*` → Tailwind `ois-*` (e.g. `--color-ois-primary: #1F4FD4` → `bg-ois-primary`, `text-ois-primary`, `border-ois-primary`, `ring-ois-primary`).

### 1.1 Brand

| Token | Hex | Usage | Example where used `file:line` |
|-------|-----|-------|-------------------------------|
| `--color-ois-primary` | `#1F4FD4` | Primary CTA, links, active tab indicator, active sidebar text/stripe, unread dot, focus ring | `src/components/ui/Button.tsx:12` `bg-ois-primary`; `src/components/layout/Sidebar.tsx:188` `text-ois-primary`; `src/components/layout/TopBar.tsx:108` `bg-ois-primary` unread dot; `src/index.css:8` |
| `--color-ois-primary-hover` | `#1A42B5` | Hover state for primary button only | `src/components/ui/Button.tsx:12` `hover:bg-ois-primary-hover`; `src/index.css:9` |
| `--color-ois-primary-pale` | `#EEF2FF` | Avatar bg, AI active bg, subtle primary highlight | `src/components/ui/Avatar.tsx:29` `bg-ois-primary-pale`; `src/components/layout/TopBar.tsx:208` `bg-ois-primary-pale` AI active; `src/index.css:10` |

### 1.2 Surface

| Token | Hex | Usage | Example where used `file:line` |
|-------|-----|-------|-------------------------------|
| `--color-ois-bg` | `#F7F8FA` | Page background on `<body>`; outer detail wrappers (`-m-6 bg-ois-bg`) | `src/index.css:63` `body @apply bg-ois-bg`; `docs/DESIGN-SYSTEM.md:139` 3-column layout; `src/index.css:13` |
| `--color-ois-surface` | `#FFFFFF` | Cards, modals, TopBar, dropdown panels | `src/components/ui/Card.tsx:5` `bg-ois-surface`; `src/components/layout/TopBar.tsx:36` `bg-white` (= `bg-ois-surface`); `src/index.css:14` |
| `--color-ois-surface-muted` | `#F1F3F7` | SectionCard header, hover states, tag bg, search field bg, mode-toggle group | `src/routes/incidents/IncidentDetail.tsx:60` `bg-ois-surface-muted` SectionCard header; `src/components/layout/TopBar.tsx:113` `bg-ois-surface-muted` health pill; `src/components/layout/Sidebar.tsx:84` mode toggle `bg-ois-surface-muted`; `src/index.css:15` |
| `--color-ois-border` | `#E4E7EC` | Default card/component/TopBar/sidebar borders | `src/components/ui/Card.tsx:5` `border-ois-border`; `src/components/layout/TopBar.tsx:36` `border-ois-border`; `src/components/layout/Sidebar.tsx:42` `border-ois-sidebar-border` (= same hex); `src/index.css:16` |
| `--color-ois-border-strong` | `#D0D5DD` | Input borders, emphasis separators, outline button, scrollbar thumb | `src/components/ui/Button.tsx:15` `border-ois-border-strong` outline; `src/components/ui/Input.tsx` focus `border-ois-border-strong`; `src/index.css:69` `scrollbar-color #D0D5DD`; `src/index.css:17` |
| `--color-ois-content-bg` | `#FFFFFF` | Content panel bg (alias of surface for layout) | `src/index.css:42` `--color-ois-content-bg: #FFFFFF`; `docs/ui/sidebar.md:41` shell notes |
| `--color-ois-sidebar-bg` | `#F4F5F7` | Sidebar chrome — intentionally dimmed so content (`#FFFFFF`) pops | `src/components/layout/Sidebar.tsx:42` `bg-ois-sidebar-bg`; `src/index.css:41` |
| `--color-ois-sidebar-border` | `#E4E7EC` | Sidebar right border + section dividers | `src/components/layout/Sidebar.tsx:42` `border-ois-sidebar-border`; `src/components/layout/Sidebar.tsx:144` divider `border-ois-sidebar-border`; `src/index.css:43` |

**Sidebar item states** (all from `src/index.css:44-47`, consumed in `src/components/layout/Sidebar.tsx:179-196`):

| Token | Hex / Value | Usage | Example where used `file:line` |
|-------|-------------|-------|-------------------------------|
| `--color-ois-sidebar-item` | `#475467` | Inactive nav item text + icon base | `src/components/layout/Sidebar.tsx:182` `text-ois-sidebar-item`; `src/index.css:44` |
| `--color-ois-sidebar-item-hover-bg` | `#F1F3F7` | Hover bg for inactive items (same as `surface-muted`) | `src/components/layout/Sidebar.tsx:182` `hover:bg-ois-sidebar-item-hover-bg`; `src/index.css:45` |
| `--color-ois-sidebar-item-active-bg` | `rgba(31, 79, 212, 0.08)` | Active item pale-blue wash | `src/components/layout/Sidebar.tsx:181` `bg-ois-sidebar-item-active-bg`; `src/index.css:46` |
| `--color-ois-sidebar-item-active-text` | `#1F4FD4` | Active item text + icon (same as `ois-primary`) | `src/components/layout/Sidebar.tsx:181` `text-ois-sidebar-item-active-text`; `src/index.css:47` |
| `--color-ois-sidebar-section-label` | `#98A2B3` | Section label (e.g. OPERATIONS, FAVORITES) — muted mono | `src/components/layout/Sidebar.tsx:138` `text-ois-sidebar-section-label`; `src/index.css:48` |

### 1.3 Text

| Token | Hex | Usage | Example where used `file:line` |
|-------|-----|-------|-------------------------------|
| `--color-ois-text` | `#101828` | Primary headings / body / TopBar last crumb | `src/index.css:63` `text-ois-text` on `body`; `src/components/layout/TopBar.tsx:90` `text-ois-text` last crumb; `src/index.css:20` |
| `--color-ois-text-muted` | `#475467` | Secondary labels, captions, inactive tabs, breadcrumb intermediate | `src/components/layout/TopBar.tsx:89` `text-ois-text-muted` intermediate crumb; `src/components/layout/Sidebar.tsx:182` inactive item; `src/index.css:21` |
| `--color-ois-text-subtle` | `#98A2B3` | Placeholder, timestamps, disabled, Home breadcrumb | `src/components/layout/TopBar.tsx:85` `text-ois-text-subtle` Home; `src/routes/incidents/IncidentDetail.tsx:60` SectionCard header `text-ois-text-subtle`; `src/index.css:22` |

### 1.4 Semantic

| Token | Hex | Pale | Usage | Example where used `file:line` |
|-------|-----|------|-------|-------------------------------|
| `--color-ois-success` | `#12B76A` | `#ECFDF3` (`ois-success-pale`) | Resolved, healthy, met, operational | `src/components/layout/TopBar.tsx:113` health dot `bg-ois-success`; `src/components/incidents/IncidentStatusPill.tsx` resolved; `src/index.css:25-26` |
| `--color-ois-warning` | `#F79009` | `#FFFAEB` (`ois-warning-pale`) | At risk, degraded, pending | `src/components/layout/Sidebar.tsx:195` badge `bg-ois-warning`; `src/components/ui/Badge.tsx` warning; `src/index.css:27-28` |
| `--color-ois-danger` | `#F04438` | `#FEF3F2` (`ois-danger-pale`) | Breached, critical, error, urgent badge | `src/components/layout/TopBar.tsx:92` urgent badge `bg-ois-danger`; `src/components/ui/Button.tsx:15` `bg-ois-danger`; `src/components/layout/Sidebar.tsx:194` urgent dot; `src/index.css:29-30` |
| `--color-ois-info` | `#0BA5EC` | `#F0F9FF` (`ois-info-pale`) | Triaging, informational, TopBar stripe end | `src/components/layout/AppShell.tsx:77` stripe `linear-gradient #1F4FD4→#0BA5EC`; `src/components/ui/Badge.tsx` info; `src/index.css:31-32` |

> **Pale + saturated pairing:** Always pair `*-pale` background with saturated text (e.g. `bg-ois-success-pale text-ois-success`). Saturated fill + white text is reserved for P1/P2 priority badges only (`docs/DESIGN-SYSTEM.md` §Status Pill).

### 1.5 Severity / Priority (P1–P4)

| Token | Hex | Usage | Example where used `file:line` |
|-------|-----|-------|-------------------------------|
| `--color-ois-sev-p1` | `#B42318` | P1 — solid fill `#B42318` white text, ping animation, priority bar | `src/components/incidents/IncidentPriorityBadge.tsx` P1; `src/routes/incidents/IncidentDetail.tsx` bar `style={{ backgroundColor: '#B42318' }}`; `src/index.css:35` |
| `--color-ois-sev-p2` | `#DC6803` | P2 — solid orange fill, white text | `src/components/incidents/IncidentPriorityBadge.tsx` P2; `src/index.css:36` |
| `--color-ois-sev-p3` | `#DC6803` | P3 — **same hex as P2** (pale amber bg + dark text in non-badge contexts) | `src/index.css:37` `--color-ois-sev-p3: #DC6803`; `docs/DESIGN-SYSTEM.md:96` note |
| `--color-ois-sev-p4` | `#027A48` | P4 — pale green bg, green text, border | `src/components/incidents/IncidentPriorityBadge.tsx` P4; `src/index.css:38` |

> **⚠️ Known bug — `p2 == p3`:** `src/index.css:36-37` defines both `--color-ois-sev-p2` and `--color-ois-sev-p3` as `#DC6803` (identical). `docs/DESIGN-SYSTEM.md:95-108` documents the intended map as `P2 #DC6803`, `P3 #F79009` in the `PRIORITY_COLOR` inline object — the token layer has not been fixed. Do not add a new hex without a migration; the bug is tracked for a dedicated token cleanup. Priority accent bar always uses inline `style={{ backgroundColor: PRIORITY_COLOR[p] }}` rather than the CSS variable to sidestep this drift.

**Inline priority map** (canonical runtime, `docs/DESIGN-SYSTEM.md:101-108`):

```ts
const PRIORITY_COLOR = { P1: '#B42318', P2: '#DC6803', P3: '#F79009', P4: '#027A48' };
```

Use for left-edge `w-1 self-stretch` accent bar in entity headers (`docs/DESIGN-SYSTEM.md` §Priority Color Bar, `src/routes/incidents/IncidentDetail.tsx:55-66` SectionCard header context).

---

## 2. Radius Scale

Tokens from `src/index.css:55-58` inside `@theme`. Prefer token class over raw `rounded-*`.

| Token | Value | Tailwind class | Use | Example where used `file:line` |
|-------|-------|----------------|-----|-------------------------------|
| `--radius-ois-card` | `8px` | `rounded-ois-card` | Cards, panels — outer of `Card` (`src/components/ui/Card.tsx:5`) | `src/components/ui/Card.tsx:5` `rounded-ois-card`; `src/index.css:55` |
| `--radius-ois-btn` | `6px` | `rounded-ois-btn` | Buttons, inputs, sidebar items | `src/components/ui/Button.tsx:31` `rounded-ois-btn`; `src/components/layout/Sidebar.tsx:180` `rounded-ois-btn` SidebarItem; `src/index.css:56` |
| `--radius-ois-badge` | `4px` | `rounded-ois-badge` | Badges, context menu items | `src/components/ui/Badge.tsx`; `src/components/layout/SidebarContextMenu.tsx:62` `rounded-[4px]` (= token `4px`); `src/index.css:57` |
| `--radius-ois-modal` | `12px` | `rounded-ois-modal` | Modal dialogs — `rounded-2xl` variant in `Modal.tsx` maps to `12px` | `src/components/ui/Modal.tsx` `rounded-2xl` (intended `rounded-ois-modal`); `src/index.css:58` |
| `ois-sidebar` | `8px` | `rounded-[8px]` | Sidebar mode-toggle group + context menu container | `src/components/layout/Sidebar.tsx:84` `rounded-[8px]` mode toggle; `src/components/layout/SidebarContextMenu.tsx:62` `rounded-[8px]`; `src/index.css:55` alias |

**Preservation notes:**

- `rounded-ois-btn 6px` and `rounded-ois-card 8px` are the canonical pair. `SectionCard` uses `rounded-lg` (Tailwind default `8px`) intentionally — value-equivalent to `rounded-ois-card` but via default class; do not unify without audit (`docs/ui/card.md` §Edge Cases).
- Sidebar brand badge `rounded-[7px]` is intentional brand treatment (not a token) — keep `7px` (`docs/ui/sidebar.md` §Brand row).
- `rounded-full 999px` remains for pills, filter chips, avatar (`src/components/ui/Avatar.tsx:29`, `docs/DESIGN-SYSTEM.md` §Filter Chips).

---

## 3. Shadow Scale

Tokens from `src/index.css:50-53` inside `@theme`. Values are verbatim.

| Token | Value | Use | Example where used `file:line` |
|-------|-------|-----|-------------------------------|
| `--shadow-ois-card` | `0 1px 2px rgba(16,24,40,0.04)` | Default card elevation | `src/components/ui/Card.tsx:5` `shadow-ois-card`; `src/index.css:50` |
| `--shadow-ois-card-hover` | `0 1px 3px rgba(16,24,40,0.1), 0 1px 2px rgba(16,24,40,0.06)` | Card hover lift | `src/index.css:51` (not yet wired to `Card` hover — flat) |
| `--shadow-ois-dropdown` | `0 12px 16px -4px rgba(16,24,40,0.08), 0 4px 6px -2px rgba(16,24,40,0.03)` | Dropdowns, popovers, notification/user menus | `src/components/ui/FilterDropdown.tsx` panel `shadow-ois-dropdown`; `src/components/layout/NotificationDropdown.tsx:29` `shadow-ois-dropdown`; `src/index.css:52` |
| `--shadow-ois-modal` | `0 20px 24px -4px rgba(16,24,40,0.08), 0 8px 8px -4px rgba(16,24,40,0.03)` | Modal dialogs | `src/components/ui/Modal.tsx` `shadow-2xl` (maps to `shadow-ois-modal`); `src/index.css:53` |

> **Note on spec phrasing:** Some briefs cite `shadow-ois-card` as `0 8px 24px rgba(16,24,40,0.10)` (the **context menu** shadow at `src/components/layout/SidebarContextMenu.tsx:62` — `shadow-[0_8px_24px_rgba(16,24,40,0.10)]`). The actual `@theme` token is `0 1px 2px rgba(16,24,40,0.04)` per `src/index.css:50`. The `0 8px 24px` value is a **component-level shadow** for the sidebar context menu, not the card token — documented here for traceability. Do not swap them.

Additional ad-hoc shadows (not tokens — preserve verbatim):

| Surface | Shadow | Location |
|---------|--------|----------|
| TopBar | `0 1px 2px -1px rgba(16,24,40,0.06)` | `src/components/layout/TopBar.tsx:36` inline `style` (slightly darker than `shadow-ois-card`) |
| Sidebar brand badge | `0 1px 4px rgba(31,79,212,0.35), inset 0 1px 0 rgba(255,255,255,0.15)` | `src/components/layout/Sidebar.tsx:62` |
| Sidebar active stripe glow | `0 0 12px rgba(31,79,212,0.35)` on `w-[3px] bg-ois-primary` | `src/components/layout/Sidebar.tsx:188` |
| Sidebar mode indicators | Management `0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.04)` · AI `0 1px 3px rgba(31,79,212,0.4), 0 0 0 1px rgba(31,79,212,0.2)` | `src/components/layout/Sidebar.tsx:89-97` |

---

## 4. Font Scale

**Families** — `src/index.css:4-5`:

```css
--font-sans: "Plus Jakarta Sans", "Inter", ui-sans-serif, system-ui, sans-serif;
--font-mono: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

| Role | Family | Class | Notes |
|------|--------|-------|-------|
| UI / body | `Plus Jakarta Sans` → `Inter` fallback | `font-sans` (default on `body`) | `src/index.css:4,63` `body @apply font-sans text-[14px]` |
| Code / IDs | `Geist Mono` → `JetBrains Mono` fallback | `font-mono` | `src/index.css:5` — used for IDs (`INC-0042`), sidebar labels, kbd, compact mono |

**Type scale** (from `docs/DESIGN-SYSTEM.md` §Typography, used across `docs/ui/*`):

| Size | Tailwind | Use | Example |
|------|----------|-----|---------|
| `10px` | `text-[10px]` | Sidebar section label, health pill, kbd chip, brand subtitle | `src/components/layout/Sidebar.tsx:138` section label; `src/components/layout/TopBar.tsx:113` health pill |
| `11px` | `text-[11px]` | SectionCard header, badge micro, mode toggle | `src/routes/incidents/IncidentDetail.tsx:60` `text-[11px]` SectionCard header; `src/components/layout/Sidebar.tsx:87` mode toggle |
| `12px` | `text-xs` | Secondary metadata, badge text, timeline, sidebar labels | `src/components/layout/TopBar.tsx:84` breadcrumb `text-xs`; `src/components/ui/Button.tsx:22` `sm text-xs` |
| `14px` | `text-sm` | Primary body, button labels, tab labels, form inputs | `src/index.css:63` `text-[14px]` body default; `src/components/ui/Button.tsx` `md text-sm` |
| `16px` | `text-base` | Larger avatar initials (`lg`), KPI icon context | `src/components/ui/Avatar.tsx` `lg text-base` |
| `20px` | `text-xl` | Page / incident title (`font-bold`) | `docs/DESIGN-SYSTEM.md:129` title scale |
| `36px` | `text-4xl` | KPI metric value (`font-bold`) | `src/components/ui/KPICard.tsx` |

**Tracking & casing:**

| Pattern | Classes | Value | Use |
|---------|---------|-------|-----|
| Section label | `tracking-[0.16em]` / `tracking-widest` + `uppercase` | `0.16em` | Sidebar section (`src/components/layout/Sidebar.tsx:138` `tracking-[0.16em]`), SectionCard header (`tracking-widest` alias), health pill (`tracking-[0.16em]` at `src/components/layout/TopBar.tsx:113`) |
| Brand subtitle | `tracking-[0.12em]` + `uppercase` | `0.12em` | `src/components/layout/Sidebar.tsx:68` `Intelligence Suite` |
| Mono compact | `tracking-[0.16em]` | `0.16em` | Health pill, sidebar label — same as section |

> **Mono tracking 0.16em** is the canonical compact-mono value. Do not replace with `tracking-wider`/`tracking-wide`. The token is used verbatim in `Sidebar.tsx:138` and `TopBar.tsx:113` — keep `0.16em`.

---

## 5. Icon Conventions

- **Single library:** `lucide-react` exclusively. Do not mix heroicons/phosphor/tabler (`docs/ui/sidebar.md` §Design Preservation, `docs/ui/button.md`).
- **Sizes:** `11px` mode toggle (`LayoutDashboard`, `Sparkles` in `Sidebar.tsx:91-99`), `12-14px` pills/buttons, `16px` header/search (`TopBar.tsx:75-87` Search `16`), `18px` nav icons (default in `Sidebar.tsx:188-196`), `20px` TopBar actions (`Menu 20`, `Inbox 20`, `Bell 20`, `Sparkles 20` at `TopBar.tsx:40-140`).

---

## 6. Motion

### 6.1 Transitions

| Duration | Easing | Use | Example |
|----------|--------|-----|---------|
| `150ms` | `ease` / `ease-out` | Default interaction — colors, bg, border, text (`transition-colors`) | `src/components/ui/Button.tsx:31` `transition-colors`; `src/components/layout/Sidebar.tsx:87` `transition-colors duration-150` mode toggle; `src/components/layout/TopBar.tsx:84` breadcrumb `transition-colors` |
| `300ms` | `ease` | Shell width / layout — sidebar collapse, width + bg | `src/components/layout/Sidebar.tsx:42` `transition-all duration-300` shell (`w-[240px]` ↔ `w-16`) |
| `transition-all` | — | Only for sidebar shell width change — not for hover states | `Sidebar.tsx:42` `transition-all` vs `transition-colors` elsewhere |

> **Rule:** Hover/active color changes → `transition-colors duration-150`. Layout (sidebar width, panel slide) → `duration-300` or motion spring. Never animate `width` on hover — only on collapse toggle.

### 6.2 Spring — Sidebar mode indicator

The Management ↔ AI Workspace toggle uses a shared-layout spring via `motion/react` (`src/components/layout/Sidebar.tsx:88-97`):

```tsx
<motion.div layoutId="sidebar-mode-indicator"
  className="absolute inset-0 rounded-[6px] bg-white border border-ois-border"
  style={{ boxShadow: '0 1px 2px rgba(16,24,40,0.06)' }} />
// stiffness 500 / damping 35 — shared spring for both buttons (only one indicator exists at a time)
```

| Param | Value | Source |
|-------|-------|--------|
| `stiffness` | `500` | `src/components/layout/Sidebar.tsx:88` `motion.div layoutId="sidebar-mode-indicator"` spring |
| `damping` | `35` | Same |
| `duration` (crossfade) | `0.15s` / `150ms` | `AnimatePresence mode="wait"` content switch `Sidebar.tsx:119-126` `transition={{ duration: 0.15 }}` |
| Easing for TopBar stripe | `cubic-bezier(0.2, 0, 0, 1)` / `ease-out` | `src/index.css:116-119,122` `ois-topbar-stripe 0.4s cubic-bezier(0.2,0,0,1)` |

### 6.3 Keyframes — `src/index.css:93-142`

| Keyframe | Duration | Easing | Use |
|----------|----------|--------|-----|
| `ois-fade-up` | `0.5s` | `ease-out` | Cards, hero entry (`translateY 8px → 0`) |
| `ois-fade-in` | `0.6s` | `ease-out` | Page transitions |
| `ois-topbar-stripe` | `0.4s` | `cubic-bezier(0.2,0,0,1)` | TopBar accent line `scaleX 0→1` (`src/index.css:116-122`, `src/components/layout/AppShell.tsx:73-77`) |
| `ois-shimmer` | `7s` | `linear infinite` | Loading shimmer text (`src/index.css:111-114`) |
| `ois-error-slide` | `0.18s` | `ease-out` | Error slide (`translateY -4px → 0`) |
| `ois-drift` | `24s` | `ease-in-out infinite alternate` | Drift bg (`background-position 0%→12%`) |

Respect `prefers-reduced-motion: no-preference` — all keyframes guarded at `src/index.css:93` (`@media (prefers-reduced-motion: no-preference)`).

---

## 7. Spacing

4px base grid. Common patterns (`docs/DESIGN-SYSTEM.md` §Spacing):

| Context | Pattern |
|---------|---------|
| Page padding (`AppShell` `<main>`) | `p-6` |
| Card internal | `p-4` (SectionCard body) or `p-5` (CardBody) |
| SectionCard header | `px-4 py-2.5` |
| Sidebar content | `p-4` / `py-4` scroll area |
| Tab bar | `px-6`, tabs `py-4 px-1` |
| Row gaps | `gap-2` / `space-y-1.5` |
| Breadcrumb gap | `gap-1 px-0.5` separator |

---

## 8. Do / Don't

| ✅ Do | ❌ Don't |
|-------|----------|
| Always consume colors via `ois-*` utilities (`bg-ois-primary`, `text-ois-text-muted`, `border-ois-border`, `bg-ois-sidebar-bg`) — they map to `@theme` vars in `src/index.css:1-59` | Never hardcode hex literals (`#1F4FD4`, `#E4E7EC`, `#F04438`) in components — use `ois-*` via `@theme` |
| Define new tokens in `src/index.css` `@theme` and reference via `ois-*` | Never introduce `terra-*` / `linear-*` dark tokens — OIS is light-only (`#F7F8FA` bg) |
| Use `rounded-ois-btn 6px` for buttons/inputs/sidebar items, `rounded-ois-card 8px` (or `rounded-lg 8px` equivalent) for cards, `rounded-[8px]` for sidebar toggle group | Never use arbitrary `rounded-lg`/`rounded-xl`/`rounded-2xl` on detail pages except intentional `notifications` preferences (`rounded-2xl` whitelisted at `docs/ui/card.md`) |
| Use `shadow-ois-card` for cards, `shadow-ois-dropdown` for popovers, `shadow-ois-modal` for modals — or preserve ad-hoc shadows verbatim (TopBar `0 1px 2px -1px`, context menu `0 8px 24px`) | Never swap `shadow-ois-card 0 1px 2px rgba(16,24,40,0.04)` with context menu `0 8px 24px` — distinct surfaces |
| Keep mono `tracking-[0.16em]` + `uppercase` for section labels / health pill | Never replace with `tracking-wider`/`tracking-wide` — breaks mono compact contract |
| Keep motion `150ms` for colors, `300ms` for sidebar shell, spring `500/35` for mode indicator, `ease` / `cubic-bezier(0.2,0,0,1)` for stripe | Never animate layout on hover — only on collapse/route change |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deepen tokens — full `src/index.css:1-59` hex table with `Token \| Hex \| Usage \| Example file:line` (brand `ois-primary #1F4FD4` / `primary-hover #1A42B5`, surface `bg #F7F8FA` / `surface #FFFFFF` / `surface-muted #F1F3F7` / `border #E4E7EC` / `border-strong #D0D5DD`, text `#101828` / `text-muted #475467` / `sidebar-bg #F4F5F7` / `sidebar-border #E4E7EC` / `sidebar-item-active #1F4FD4` / `sidebar-item-hover #F1F3F7` / `sidebar-item #475467`, semantic `success #12B76A` / `warning #F79009` / `danger #F04438` / `info #0BA5EC` + pale, sev `p1 #B42318` / `p2 #DC6803` / `p3 #DC6803` / `p4 #027A48` with `p2==p3` bug note), §Radius (`rounded-ois-btn 6px`, `rounded-ois-card 8px`, `ois-sidebar 8px`), §Shadow (`shadow-ois-card 0 1px 2px rgba(16,24,40,0.04)` + `0 8px 24px` context menu trace, `shadow-ois-modal 0 20px 24px`), §Font (stack `Plus Jakarta Sans`/`Inter` + `Geist Mono`/`JetBrains Mono`, mono `tracking 0.16em`, sizes 10-36px), §Motion (`150ms`/`300ms`, spring `500/35` Sidebar mode indicator, `ease`/`cubic-bezier(0.2,0,0,1)`), §Do/Don't (never hardcode hex, always `ois-*` via `@theme`) | `src/index.css:1-59,116-123` · `docs/DESIGN-SYSTEM.md` · `docs/ui/sidebar.md` · `docs/ui/button.md` · `docs/ui/card.md` · `docs/ui/topbar.md` |

