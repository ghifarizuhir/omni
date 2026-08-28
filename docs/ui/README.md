# UI Docs — Component Specifications & Audit

Dokumen teknis untuk global shell & shared components OIS. **Source of truth untuk implementasi** — bukan aspirasi. Kalau bertentangan dengan `../design/08-design-system.md`, **doc di sini menang** untuk urusan runtime aktual (token hex, class, font, icon).

> Diadaptasi dari `terra-service-management/docs/ui/`. Beda utama: OIS light theme (`--color-ois-*`), AppShell = `Sidebar + TopBar + Outlet + InboxDrawer` (bukan `Sidebar + AiAssistantPanel`), tidak ada dark `data-theme` toggle.

---

## Reading Order

### Global Shell

| # | Doc | Status | Content |
|---|-----|--------|---------|
| 1 | [design-tokens.md](./design-tokens.md) | ✅ Stable | Color tokens, radius, font, shadow, motion |
| 2 | [app-shell.md](./app-shell.md) | ✅ Draft | AppShell anatomy (`Sidebar + TopBar + Outlet + InboxDrawer`) |
| 3 | [sidebar.md](./sidebar.md) | ✅ Stable | Sidebar sections, item spec, collapse — motion/layoutId |
| 4 | [topbar.md](./topbar.md) | ✅ Stable | TopBar `h-14` + breadcrumb `useBreadcrumbs` + search + inbox/bell/AI/avatar |
| 5 | [inbox-drawer.md](./inbox-drawer.md) | ✅ Draft | InboxDrawer slide-over `z-[101] max-w-[400px] spring 25/200` |

### Shared Primitives (`src/components/ui/`)

| # | Doc | Status | Content |
|---|-----|--------|---------|
| 6 | [button.md](./button.md) | ✅ Stable | Button 5 variants + 4 sizes + loading `active:scale-[0.98]` |
| 7 | [card.md](./card.md) | ✅ Stable | Card + SectionCard `rounded-ois-card 8px shadow-ois-card` |
| 8 | [data-table.md](./data-table.md) | ✅ Draft | DataTable `Column<T extends {id}>` + Table primitives |

### Feature Patterns

| # | Doc | Status | Content |
|---|-----|--------|---------|
| 9 | [monitoring.md](./monitoring.md) | ✅ Draft | Monitoring Module Layout `w-1 accent` + EventCard/SeverityStripe |
| 10 | [cmdb.md](./cmdb.md) | ✅ Draft | CMDB D3 force distance 150 charge -300 panel w-80 |

## Audit

Known issues per component, sebelum dan sesudah fix:

| Doc | Status |
|-----|--------|
| [audit/audit-global-shell.md](./audit/audit-global-shell.md) | ✅ Draft — baseline 4 findings (collapse persist, p-6, breadcrumb, sev-p3) |
| [audit/known-issues-sidebar.md](./audit/known-issues-sidebar.md) | ✅ Draft — 7 issues (4 fixed, 3 verified) |
| [audit/known-issues-topbar.md](./audit/known-issues-topbar.md) | ✅ Draft — 16 findings (5 med, 6 low, 5 info) |

---

## Organisasi

```
ui/
├── README.md                 ← ini
├── design-tokens.md          ← token definitions (hex, radius, font, shadow)
├── app-shell.md              ← AppShell spec
├── sidebar.md                ← Sidebar anatomy
├── topbar.md                 ← TopBar spec
├── inbox-drawer.md           ← InboxDrawer spec
├── button.md / card.md / data-table.md  ← shared primitives
├── monitoring.md / cmdb.md   ← feature patterns
└── audit/
    ├── audit-global-shell.md
    ├── known-issues-sidebar.md
    └── known-issues-topbar.md
```

---

## Conventions

1. **Technical, not aspirational.** Classes, tokens, dan struktur DOM yang **benar-benar dipakai** di codebase. Bukan target ideal.
2. **Status per doc** di header: `✅ Stable` / `📝 Draft` / `⛔ Removed`.
3. **Known issues di `audit/`** — tidak di body doc. Body hanya berisi current state yang benar.
4. **Status table di footer** setiap component doc: daftar known issues + status fix.
5. **Cross-reference `design-tokens.md`** untuk semua token. Jangan duplikasi definisi.

---

## Content Boundary

| Jenis konten | Lokasi |
|-------------|--------|
| Token definitions (color, radius, font, spacing) | `design-tokens.md` |
| Component anatomy + exact classes | `{component}.md` |
| Known issues per component | `audit/known-issues-{component}.md` |
| Cross-component audit | `audit/audit-global-shell.md` |
| Visual intent / reasoning | `../design/08-design-system.md` |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Complete `docs/ui/` — 8 deep `sidebar, topbar, inbox-drawer, button, card, data-table, monitoring, cmdb` + 2 audits (16 finds topbar, 7 sidebar) via subagents | — |
| 2026-08-28 | Init dari terra, diadaptasi untuk OIS AppShell light theme (`--color-ois-*`, InboxDrawer) | — |
