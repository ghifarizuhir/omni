# Shared Concerns

Status: **Draft**
Used by: semua halaman yang share pattern — list, detail, create, filter, routing, RBAC.

---

## Purpose

Kumpulan spec cross-cutting yang dipakai >1 halaman. Tujuannya menghindari duplikasi di `features/*.md` — page doc cukup `Ref: _shared/<concern>.md`.

---

## Inventory

| Concern | File | Status | Used by |
|---------|------|--------|---------|
| List toolbar & shell | [`list.md`](./list.md) | ✅ Draft | Incidents, Problems, Requests, Changes, CMDB, Monitoring Events |
| Entity detail page (3-column) | [`entity-detail-page.md`](./entity-detail-page.md) | ✅ Draft | Semua detail `/:id` |
| Create flow | [`create-flow.md`](./create-flow.md) | ✅ Draft | Modal + page `/new` |
| Entity comments | [`entity-comments.md`](./entity-comments.md) | ✅ Draft | Incidents, etc. (via `IncidentComment`, `RequestComment`) |
| Entity timeline | [`entity-timeline.md`](./entity-timeline.md) | ✅ Draft | Incidents timeline |
| Filter / Sort / Export | [`filter-sort-export.md`](./filter-sort-export.md) | ✅ Draft | Semua list |
| Routing & Module Layout | [`routing.md`](./routing.md) | ✅ Draft | `src/routes/index.tsx`, `*Layout.tsx` + `<Outlet>` |
| App selector / scope | [`app-selector.md`](./app-selector.md) | ✅ Draft | Scope switcher (Plan E) |
| RBAC & scope enforcement | [`rbac.md`](./rbac.md) | ✅ Draft | `Role`, `Permission`, `ApplicationTeamRole` |

Global search (`global-search.md`) di-park di `_backlog.md` — OIS belum punya Cmd+K.

---

## Conventions

- Page doc yang butuh concern ini **wajib** cross-reference, bukan copy-paste spec.
- Shared doc punya §API Touchpoints yang ref ke `../design/02-api-contract.md`.
- Update shared doc = update semua page yang pakai — cek `Used by` sebelum edit.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Batch _shared parallel — 9 deep `list, entity-detail-page, create-flow, entity-comments, entity-timeline, filter-sort-export, routing, app-selector, rbac` | — |
| 2026-08-28 | Init shared concerns — list/detail/create/comments/timeline/filter/routing/rbac | — |
