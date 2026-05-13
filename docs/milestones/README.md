# Milestone tracker

One doc per milestone from [BACKEND-MIGRATION-STRATEGY.md](../BACKEND-MIGRATION-STRATEGY.md).

| # | Doc | Status (end of session 2026-05-13) |
|---|-----|-----------------------------------|
| M0 | (folded into strategy doc + `server/README.md`) | ✅ Done — Express scaffold |
| M1 | [M1.md](./M1.md) | ✅ Done — Prisma schema, seed, pilot domains live |
| M2 | [M2.md](./M2.md) | ✅ Done — session cookies, RBAC, audit log |
| M3 | [M3.md](./M3.md) | 🟡 Partial — high-value domains live; small catalogs remain mock |
| M4 | [M4.md](./M4.md) | 🟡 Scaffolded — realtime + jobs run; frontend hookup pending |
| M5 | [M5.md](./M5.md) | 🟡 Foundation — helmet/rate-limit/logging/health; OTel/DR/pentest outstanding |

## Test posture

```
npm run lint     # tsc on both src and server tsconfig — clean
npm test         # 3 suites, 31 tests, all passing
```

Suite breakdown:
- `pilot.test.ts` — M1 CMDB/events/incidents/monitoring (11 tests)
- `auth.test.ts` — M2 login/logout/me/RBAC (8 tests)
- `m3.test.ts` — M3 domain coverage + integration audit round-trip (12 tests)

## Where to look first

- Schema → `prisma/schema.prisma`
- Migrations → `prisma/migrations/`
- Seed → `prisma/seed.ts`
- Auth → `server/auth/`, `server/middleware/auth.ts`, `server/routes/auth.ts`
- Repositories → `server/repositories/`
- Realtime → `server/realtime.ts`
- Jobs → `server/jobs/`
- App assembly + hardening → `server/app.ts`
