# Design Docs — OIS Target Architecture (v3+)

Dokumen forward-looking untuk OIS. Semua keputusan di sini adalah **kontrak hidup** — acuan saat implementasi dan **harus di-update** ketika keputusan berubah (bukan ditumpuk jadi changelog).

> Relasi dengan docs lama: file `docs/OIS-INSTRUCTIONS-V3.md`, `BACKEND-MIGRATION-STRATEGY.md`, `PRODUCTION-READINESS-STRATEGY.md`, dan `DESIGN-SYSTEM.md` tetap valid sebagai referensi history/milestone. Folder `docs/design/` adalah **lifedoc baru** yang mulai dari sini dan selanjutnya jadi source of truth untuk iterasi ke depan (diadaptasi dari `terra-service-management/docs/design/`).

---

## Reading order

Urutan yang direkomendasikan, dari fondasi ke cross-cutting:

| # | Doc | Status | Dependency |
|---|-----|--------|------------|
| 1 | [01-erd.md](./01-erd.md) | ✅ Draft | — |
| 2 | [02-api-contract.md](./02-api-contract.md) | ✅ Draft | 01 |
| 3 | [03-architecture.md](./03-architecture.md) | ✅ Draft | 01, 02 |
| 4 | [04-error-handling.md](./04-error-handling.md) | ✅ Draft | 02, 03 |
| 5 | [05-testing-strategy.md](./05-testing-strategy.md) | ✅ Draft | 03 |
| 6 | [06-observability.md](./06-observability.md) | ✅ Draft | 03 |
| 7 | [07-ops-runbook.md](./07-ops-runbook.md) | ✅ Draft | 03, 06 |
| 8 | [08-design-system.md](./08-design-system.md) | ✅ Stable | — |
| 9 | [09-realtime.md](./09-realtime.md) | ✅ Draft | 02, 03 |
| 10 | [10-ai.md](./10-ai.md) | ✅ Draft | 02, 03, 09 |
| 11 | [13-release-versioning.md](./13-release-versioning.md) | ✅ Draft | — |

Legend:
- ✅ **Draft/Stable** — siap dipakai sebagai acuan
- 📝 **TBD** — belum ditulis, akan disusul

> Numbering mengikuti `terra-service-management/docs/design/` supaya cross-repo mapping mudah. Nomor 11–12 (CLI/MCP) di-skip — OIS tidak punya CLI/MCP saat ini; akan ditambah bila dibutuhkan tanpa re-numbering.

---

## Core decisions (snapshot)

| Area | Keputusan | Doc |
|------|-----------|-----|
| Data model | Prisma + Postgres (single schema `prisma/schema.prisma`), `String` JSON untuk `data` (target `jsonb` M7 hardening) | 01 |
| Tenancy | `Tenant` + `TenantMembership` + `Division/Department/Team/Application` hierarchy; semua query scoped by `tenantId` | 01, 03 |
| Scope enforcement | **Always-on** `withScopedDb` + `req.scoped.*` (lint `no-restricted-imports`); `ScopeViolationError` → 403 | 03 |
| Backend language | TypeScript, Node ≥ 20, `tsx` runtime | 03 |
| Frontend stack | React 19 + TypeScript + Vite + Tailwind 4 + `lucide-react` + `motion` | 03, 08 |
| Alias | `@` → repo root (`vite.config.ts`, `tsconfig.json`, `server/tsconfig.json` `baseUrl: ..`) | 03 |
| API prefix | `/api/v1` (Vite proxy `/api` → `http://localhost:3001`) | 02, 03 |
| Auth | Cookie session (argon2), `AUTH_REQUIRED` dev bypass (`tenant-demo`), `SESSION_SECRET` | 02 |
| Realtime | Socket.IO (`server/realtime.ts` ↔ `src/services/realtime.ts`) + in-process `server/jobs/` scheduler (skip jika `API_ONLY=true`) | 09 |
| Rate limit | Helmet + `express-rate-limit` (per-IP auth, per-tenant API) | 03 |
| Testing | `vitest` (`server/**/*.test.ts`, node env), `supertest`, DB-backed via `helpers.ts` | 05 |
| Logging | Pino + pino-http, OTEL scaffold | 06 |
| Doc strategy | `docs/design` = kontrak teknik, `docs/features` = spec halaman, `docs/ui` = shell/components audit | — |

Detail + rationale ada di doc masing-masing.

---

## Conventions untuk doc baru di folder ini

1. **Numbering monotonic.** Nomor doc naik, tidak pernah di-reuse. Doc baru di tengah boleh tidak sekuensial.
2. **"Resolved Decisions" section wajib** di akhir doc. Catat keputusan + alasannya sebagai record.
3. **Status header eksplisit.** Setiap doc diawali `Status: **Draft** | **Stable** | **Superseded**`.
4. **Cross-reference relative.** Link antar doc pakai `./01-erd.md`, bukan path absolut.
5. **Tidak ada code generator.** Kode di doc adalah contoh/kontrak, bukan source of truth — source of truth ada di repo (`prisma/schema.prisma`, `server/app.ts`, `src/index.css`).

---

## Content Boundary

Aturan apa taruh di mana (review discussion, open items, parked ideas) di-define di [`../features/README.md`](../features/README.md) §Content Boundary. Berlaku cross-folder termasuk `design/`.

Ringkasan untuk `design/`:
- **§Open Items** di doc = live questions, hapus saat resolved
- **§Resolved Decisions** = keputusan permanen + rationale
- **Parked engineering ideas** = `design/README.md` §Open Items atau doc design spesifik
- **Review discussion** = chat / PR, bukan docs
- **Change history** = git log + `## Changelog` per file

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Batch 2 — `02-api-contract` tambah `POST /changes/:publicId/votes` + `PATCH /problems/:publicId/status`, `POST /known-error`, `GET /timeline` (scoped CAB+Problems workflow) | — |
| 2026-08-28 | Batch 1 ABCDE — `02-api-contract` tambah 4 `POST` creates + `ciHealthValues` fix (tenant-scoped `POST /incidents`/`/cis`/`/problems`/`/requests`) | — |
| 2026-08-28 | Tambah 04,05,06,07,10,13 (sebelumnya TBD) → semua Draft | — |
| 2026-08-28 | Init dari terra-service-management, diadaptasi untuk OIS — Postgres/Prisma/Socket.IO, tanpa CLI/MCP | — |
