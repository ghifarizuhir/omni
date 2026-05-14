# Milestone tracker

One doc per milestone from [BACKEND-MIGRATION-STRATEGY.md](../BACKEND-MIGRATION-STRATEGY.md).

| # | Doc | Status |
|---|-----|--------|
| M0 | (folded into strategy doc + `server/README.md`) | ✅ Done — Express scaffold |
| M1 | [M1.md](./M1.md) | ✅ Done — Prisma schema, seed, pilot domains live |
| M2 | [M2.md](./M2.md) | ✅ Done — session cookies, RBAC, audit log |
| M3 | [M3.md](./M3.md) | ✅ Done — all domains live via dedicated tables or generic `Document`; `VITE_API_MODE` removed |
| M4 | [M4.md](./M4.md) | ✅ Done — `POST /events/ingest`, Socket.IO fan-out, frontend `realtime` client + `useRealtime` hook |
| M5 | [M5.md](./M5.md) | ✅ Code-complete — helmet/rate-limit/logging/health, CSP env-gated, per-tenant limiter, OTel scaffold, DR runbook. Operational items (pentest, exporter wiring, real backup tests) remain |

## Test posture

```
npm run lint     # tsc on both src and server tsconfig — clean
npm test         # 5 suites, 78 tests, all passing
```

Suite breakdown:
- `pilot.test.ts` — M1 CMDB/events/incidents/monitoring (11 tests)
- `auth.test.ts` — M2 login/logout/me/RBAC (8 tests)
- `m3.test.ts` — M3 core domain coverage + integration audit round-trip (12 tests)
- `m3-backlog.test.ts` — M3 backlog: all residual domains served from `Document` (44 tests)
- `ingest.test.ts` — M4 event ingest end-to-end (3 tests)

## Where to look first

- Schema → `prisma/schema.prisma` (incl. `Document` model for catalog-style data)
- Migrations → `prisma/migrations/`
- Seed → `prisma/seed.ts` + `prisma/seedDocuments.ts`
- Auth → `server/auth/`, `server/middleware/auth.ts`, `server/routes/auth.ts`
- Repositories → `server/repositories/` (`cmdb`, `events`, `incidents`, `docs`, `documents`)
- Realtime → `server/realtime.ts` (gateway), `src/services/realtime.ts` (client)
- Jobs → `server/jobs/`
- Hardening → `server/app.ts` (helmet, rate limits), `server/logger.ts`, `server/telemetry.ts`
- DR posture → [DR-RUNBOOK.md](../DR-RUNBOOK.md)
