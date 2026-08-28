# 07 — Ops Runbook

Status: **Draft**
Depends on: [`03-architecture.md`](./03-architecture.md), [`06-observability.md`](./06-observability.md)
Source of truth: [`server/index.ts`](../../server/index.ts:4), [`server/app.ts`](../../server/app.ts:33), [`server/middleware/auth.ts`](../../server/middleware/auth.ts:20), [`server/logger.ts`](../../server/logger.ts:5), [`server/realtime.ts`](../../server/realtime.ts:28), [`server/worker.ts`](../../server/worker.ts:11), [`server/jobs/queue.ts`](../../server/jobs/queue.ts:17), [`docker-compose.yml`](../../docker-compose.yml:21), [`Dockerfile`](../../Dockerfile:14), [`prisma/schema.prisma`](../../prisma/schema.prisma:17), [`package.json`](../../package.json:15), [`vite.config.ts`](../../vite.config.ts:29), [`.env.example`](../../.env.example:1), [`compose.override.yml.example`](../../compose.override.yml.example:10)
Related: [`docs/DR-RUNBOOK.md`](../DR-RUNBOOK.md), [`docs/M7-LOCAL-DEV.md`](../M7-LOCAL-DEV.md), [`docs/PRODUCTION-READINESS-STRATEGY.md`](../PRODUCTION-READINESS-STRATEGY.md)

Scope: Operational procedures for Phase 1 — pure dev local + single-VM prod. Covers env vars, local dev, Docker, migrations/seeds, health checks, and day-2 checklists. Backup/DR tiers live in `DR-RUNBOOK.md`.

Audience: Dev yang maintain & operate repo ini — belum assume SRE dedicated.

---

## Environment variables

Validasi **fail-fast at boot** — `server/index.ts:4` loads `.env.local` first then `.env` (matches Vite `loadEnv` order at `vite.config.ts:7`). Missing `DATABASE_URL` or invalid wiring surfaces on first Prisma/cookie path, bukan silent default. Tidak pakai Zod contracts seperti Terra (`packages/contracts/src/env.ts`) — cek `server/index.ts` + `server/middleware/auth.ts` untuk guard actual.

> `.env.example` → copy ke `.env.local` (gitignored via `.gitignore:8`). Semua `npm run db:*` membungkus via `dotenv -e .env.local --` [`package.json:15`].

### Backend (`DATABASE_URL`, `PORT/HOST`, `REDIS_URL`, `LOG_LEVEL` etc)

| Variable | Required | Default | Where used `file:line` | Notes |
|----------|----------|---------|------------------------|-------|
| `DATABASE_URL` | **Yes** | `postgresql://ois:ois@localhost:5433/ois?schema=public` (host) / `postgresql://ois:ois@postgres:5432/ois?schema=public` (compose net) | `prisma/schema.prisma:18` `env("DATABASE_URL")`, `docker-compose.yml:61`, `server/db.ts:6` | Host `5433→5432` (compose), internal `postgres:5432`. Managed Postgres di staging/prod. |
| `SESSION_SECRET` | **Yes** in AGENTS/docs (cookie signing) | — (must be `random-32+`) | `server/middleware/auth.ts:20` (session guard; actual secret wired via `SESSION_SECRET` env for cookie signing when enabled), `server/auth/session.ts:11` `SESSION_COOKIE=ois_session` | Generate: `openssl rand -hex 32`. `AUTH_REQUIRED=false` dev-bypass tetap butuh secret kalau cookie path hidup. |
| `PORT` | No | `3001` | `server/index.ts:14` `Number(process.env.PORT ?? 3001)`, `docker-compose.yml:63`, `Dockerfile:53` | API bind. Vite runs on `3000` (`package.json:7`). |
| `HOST` | No | `0.0.0.0` | `server/index.ts:15` `process.env.HOST ?? '0.0.0.0'`, `docker-compose.yml:64`, `Dockerfile:54` | `0.0.0.0` inside Docker; `localhost` for host-only. |
| `GEMINI_API_KEY` | No (dev) / Yes if AI exercised | — (injected by AI Studio in prod) | `compose.override.yml.example:14`, Gemini client in `server/routes` AI paths | Optional at boot; only required when AI features hit. Inject via `compose.override.yml` locally. |
| `APP_URL` | No (dev) / Yes prod | `https://app.example.com` (example) | `.env.example:7`, frontend `VITE_*` build via Vite `define` | Base URL for callbacks/links. |
| `REDIS_URL` | No | `redis://redis:6379` (compose) | `docker-compose.yml:62`, `server/jobs/queue.ts:17` (future BullMQ swap) | Reserved for BullMQ M7.x — currently in-process scheduler (`server/jobs/index.ts:10`). Not yet wired. |
| `LOG_LEVEL` | No | `info` | `server/logger.ts:6` `process.env.LOG_LEVEL ?? 'info'`, `docker-compose.yml:66` | `trace|debug|info|warn|error|fatal`. `LOG_PRETTY=true` enables `pino-pretty` (`server/logger.ts:7`). |
| `LOG_PRETTY` | No | unset (JSON) | `server/logger.ts:7`, `compose.override.yml.example:19` | `true` = colored dev output. Requires `pino-pretty`. |
| `AUTH_REQUIRED` | No | `true` | `server/middleware/auth.ts:20` `(process.env.AUTH_REQUIRED ?? 'true') !== 'false'`, `docker-compose.yml:69` | `false` pins to `tenant-demo` + admin perms (dev only, **never prod**). |
| `API_ONLY` | No | unset (`false`) | `server/index.ts:23` `if (process.env.API_ONLY !== 'true') startScheduler()` | `true` disables in-process scheduler on API node; pair with `npm run start:worker` (`server/worker.ts:20`). |
| `NODE_ENV` | No | `development` | `server/app.ts:31` `isTest`, `server/logger.ts:5`, `docker-compose.yml:65`, `server/auth/session.ts:70` cookie `secure` flag | `test` skips `pinoHttp`; `production` sets `secure` cookies. |
| `CSP_ENABLED` | No | `false` | `server/app.ts:42` `process.env.CSP_ENABLED === 'true'`, `server/app.ts:44` helmet CSP | `true` enables Helmet CSP. Dev Vite needs `unsafe-inline` so leave off locally. |
| `CSP_CONNECT_SRC` | No | `""` | `server/app.ts:43` `process.env.CSP_CONNECT_SRC ?? ''` | CSV extra `connect-src` origins (e.g. analytics) when CSP enabled. |
| `TENANT_RATE_LIMIT` | No | `600` / `10000` in test | `server/app.ts:97` `Number(process.env.TENANT_RATE_LIMIT ?? 600)` | Per-tenant/min, keyed by `req.tenantId ?? ipKeyGenerator` (`server/app.ts:100`). |
| `DISABLE_HMR` | No | `false` | `vite.config.ts:25` `process.env.DISABLE_HMR === 'true' ? false : { overlay:false }` | `true` disables Vite HMR overlay. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | unset (no-op) | `server/telemetry.ts:22` `initTelemetry()`, `server/index.ts:12` | Scaffold only — `trace.getTracer` no-op until SDK wired. |

### Frontend (Vite — `VITE_*` must be prefixed to be exposed)

| Variable | Required | Default | Where used `file:line` | Notes |
|----------|----------|---------|------------------------|-------|
| `VITE_API_BASE_URL` | No | `/api/v1` | `.env.example:9`, `src/services/*` fetch base | Relative is same-origin via Vite proxy in dev. |
| `VITE_API_PROXY_TARGET` | No | `http://localhost:3001` | `vite.config.ts:31` `env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001'`, `.env.example:10` | Vite `server.proxy['/api']` target (`vite.config.ts:29`). API is `3001`, Vite is `3000`. |
| `VITE_FEATURE_APP_SCOPE_UI` | No | `false` | `.env.example:23`, `src/routes` AppScopeSwitcher | Plan E switcher; also flipped at runtime via `localStorage.setItem('feature.app_scope_ui','true')`. |
| `SCOPE_ENFORCEMENT_MODE` | Deprecated | — | `.env.example:25` comment | Was `off/warn/enforce` thru Plan E; since Plan F scope layer always-on, ignored. |

> Keep `.env.example` in sync: setiap tambah var baru, update template tanpa nilai sensitive (commit). `.env.local` / `compose.override.yml` gitignored (`.gitignore:8`, `.gitignore:23`).

---

## Local dev

### Prerequisites

- Docker Engine 24+ with `compose` plugin (`docker compose version` ≥ v2). Legacy `docker-compose` binary unsupported (`docker-compose.yml:4`).
- Node 22 + npm (only for hot-reload flow).
- `DATABASE_URL` di `.env.local` harus match host port `5433` untuk host-run API, atau `5432` inside compose.

### Two flows — hot-reload (recommended) vs full containers

**1. Hot-reload dev** — Postgres + Redis in containers, API + Vite on host ( `tsx watch` + HMR):

```bash
cp .env.example .env.local          # once; .env.local gitignored
docker compose up -d postgres redis --build   # postgres 5433→5432, redis 6380→6379
npm run db:migrate                  # dotenv -e .env.local -- prisma migrate dev [package.json:15]
npm run db:seed                     # tenant-demo + data [package.json:16]
npm run dev:all                     # api (tsx watch :3001) + vite (:3000) concurrently --kill-others [package.json:14]
# individually:
# npm run dev:server               # tsx watch --clear-screen=false server/index.ts [package.json:9]
# npm run dev:vite                 # vite --port 3000 --host 0.0.0.0 [package.json:8]
```

- **Ports:** Vite `3000` (`package.json:7`), API `3001` (`server/index.ts:14`, `docker-compose.yml:63`). Browser hits `http://localhost:3000`, Vite proxies `/api` → `VITE_API_PROXY_TARGET` (`vite.config.ts:29` `changeOrigin:true`).
- **Env load order:** `server/index.ts:4` `loadEnv({ path: '.env.local' })` then `server/index.ts:5` `loadEnv()` — matches `vite.config.ts:7` `loadEnv(mode,'.', '')` so frontend/backend agree.
- **Vite ignores:** `node_modules, .git, dist, prisma/migrations` (`vite.config.ts:26`) + HMR overlay off when `DISABLE_HMR=true` (`vite.config.ts:25`).

**2. Full stack in containers** — smoke test mirroring prod packaging:

```bash
docker compose up --build           # api 3001 + migrate deploy automatically [docker-compose.yml:82]
# Verify:
curl http://localhost:3001/health
curl http://localhost:3001/ready
```

Reset (destroys data):

```bash
docker compose down -v              # delete postgres_data volume
npm run db:reset                    # prisma migrate reset --force --skip-seed + tsx prisma/seed.ts [package.json:18]
# or: docker compose up -d postgres && docker compose run --rm api npx prisma migrate deploy
```

Common ops:

| Action | Command |
|--------|---------|
| Seed (container) | `docker compose exec api npm run db:seed` |
| psql shell | `docker compose exec postgres psql -U ois -d ois` |
| Tail API | `docker compose logs -f api` |
| Validate compose | `docker compose config -q && echo ok` (`docs/M7-LOCAL-DEV.md:152`) |
| Stop (keep data) | `docker compose down` |
| Rebuild api | `docker compose build api` |

---

## Docker

### `compose.override.yml` for secrets (gitignored)

`compose.override.yml` auto-merges on top of `docker-compose.yml` (`docker-compose.yml:15`, `.gitignore:23`). Template at `compose.override.yml.example:10`:

```bash
cp compose.override.yml.example compose.override.yml
# edit GEMINI_API_KEY, LOG_LEVEL etc
docker compose up -d
```

```yaml
# compose.override.yml (example)
services:
  api:
    environment:
      GEMINI_API_KEY: "sk-your-key-here"   # [compose.override.yml.example:14]
      LOG_PRETTY: "true"                    # [compose.override.yml.example:19]
      LOG_LEVEL: debug
      # AUTH_REQUIRED: "false"  # localhost probing only — never commit true->false in prod
```

Variables consumed by `api` service inside compose network (`docker-compose.yml:60-72`): `DATABASE_URL=postgresql://ois:ois@postgres:5432/ois`, `REDIS_URL=redis://redis:6379`, `PORT=3001`, `HOST=0.0.0.0`, `NODE_ENV=development`, `LOG_LEVEL=info`, `AUTH_REQUIRED=true`. Host overrides go in `.env.local` with `localhost:5433`.

### Full `docker compose up --build`

```bash
docker compose up --build            # builds api image + runs migrate deploy [docker-compose.yml:82]
docker compose up -d postgres redis  # dev-only: DB layer on host ports
docker compose up --build -d api     # prod-like: api only
```

- **Internal vs host ports:** Postgres internal `5432` vs host `5433` (`docker-compose.yml:30` `5433:5432`); Redis `6380→6379` (`docker-compose.yml:45`); API `3001:3001` (`docker-compose.yml:74`). Healthchecks: `pg_isready -U ois -d ois` (`docker-compose.yml:32` every 5s), `redis-cli ping` (`docker-compose.yml:47`).
- **`api` boot command:** `sh -c "npx prisma migrate deploy && npm run start"` (`docker-compose.yml:82`) — idempotent, safe to rerun tiap deploy.
- **`depends_on` healthy:** `api` waits for `postgres` + `redis` `condition: service_healthy` (`docker-compose.yml:75`).
- **Volumes:** `postgres_data:/var/lib/postgresql/data` (`docker-compose.yml:28`, `docker-compose.yml:105`). Limits: `postgres 512m/1cpu`, `redis 256m/0.5cpu`.

### Dockerfile multi-stage [`Dockerfile:6-15`]

```
deps  (node:22-alpine + openssl/ca-certificates, npm ci)      [Dockerfile:20]
  → build  (+ prisma generate [Dockerfile:40], npm prune --omit=dev [Dockerfile:44])
    → runtime (prod deps + prisma client + server/, tsx reinstall [Dockerfile:67],
               HEALTHCHECK wget http://localhost:3001/health [Dockerfile:73], CMD tsx server/index.ts [Dockerfile:76])
```

- `openssl ca-certificates` required for Prisma 6 query-engine on Alpine (otherwise `prisma generate` fails) [`Dockerfile:25`].
- `NODE_ENV=production PORT=3001 HOST=0.0.0.0` baked in runtime [`Dockerfile:53`].
- SPA `dist/` NOT served by API image — separate static host (Caddy/NGINX) per M7 strategy [`Dockerfile:11`]. TODO M8: swap `tsx` → `tsc` compiled JS [`Dockerfile:14`].

---

## Migrations & seeds

### Prisma workflow

| Command | When | Notes |
|---------|------|-------|
| `npm run db:migrate` | dev: create + apply migration | `dotenv -e .env.local -- prisma migrate dev` [`package.json:15`] |
| `npx prisma migrate deploy` | prod/container boot | Idempotent, applied every boot via `docker-compose.yml:82` |
| `npx prisma generate` | after schema change / in CI | Writes to `node_modules/.prisma` + `@prisma/client` [`Dockerfile:40`] |
| `npm run db:seed` | dev after migrate | `dotenv -e .env.local -- tsx prisma/seed.ts` [`package.json:16`] — clears + seeds `tenant-demo` admin `admin@omni.local` (`prisma/seed.ts:13`) |
| `npm run db:seed:prod` | prod first boot | `dotenv -e .env.local -- tsx prisma/seed.prod.ts` [`package.json:17`] — root tenant + admin + RBAC catalog (`prisma/seed.prod.ts:1`) |
| `npm run db:reset` | dev reset (DESTROYS) | `prisma migrate reset --force --skip-seed && tsx prisma/seed.ts` [`package.json:18`] |
| `docker compose down -v` | nuke volume | Deletes `postgres_data`; then `migrate deploy` recreates |

**Squashed migration:** `prisma/migrations/0001_init_postgres/migration.sql` is the single squashed init — **jangan edit**, tambah migrasi baru (`prisma/migrations/20260515*/migration.sql`). Datasource `provider = "postgresql" url = env("DATABASE_URL")` [`prisma/schema.prisma:17`]. Many `data String` columns hold serialized JSON (future `jsonb` + GIN per `prisma/schema.prisma:6`).

**`.env.local` wiring:** all `db:*` scripts use `dotenv -e .env.local --` so host `5433` URL is picked up. Mismatch `localhost:5432` vs `5433` is #1 `P1001` fix — check `.env.local` / `VITE_API_PROXY_TARGET`.

---

## Health checks

`server/app.ts:104-116` exposes three endpoints **outside** `requireAuth` (no session needed):

| Path | Handler `file:line` | Check | Status |
|------|---------------------|-------|--------|
| `GET /health` | `server/app.ts:105` | `res.json({ status:'ok', uptime: process.uptime() })` | `200 ok` always — LB liveness |
| `GET /live` | `server/app.ts:108` | `res.json({ status:'ok' })` | `200 ok` — process check |
| `GET /ready` | `server/app.ts:109` `await prisma.$queryRaw`SELECT 1`` | DB reachable? | `200 {status:'ok'}` if `SELECT 1` succeeds; `503 {status:'degraded', error}` if DB down (`server/app.ts:114`) |

```bash
curl http://localhost:3001/health   # → { status:'ok', uptime: 123.4 }
curl http://localhost:3001/live     # → { status:'ok' }
curl http://localhost:3001/ready    # → { status:'ok' } or 503 degraded
```

Dockerfile runtime healthcheck hits the same: `HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -q -O- http://localhost:3001/health || exit 1` [`Dockerfile:73`]. Compose readiness uses `pg_isready` + `redis-cli ping`, not HTTP.

For DR tiers: `/ready` 503 is the Tier 0 signal (Postgres primary lost) — see `docs/DR-RUNBOOK.md:22`.

---

## Ops checklist

### Env fail-fast (boot)

- `server/index.ts:4-5` loads `.env.local` then `.env` — `.env.local` wins. `server/worker.ts:11-12` same order (`server/worker.ts:11`).
- `LOG_LEVEL` invalid → pino defaults; `DATABASE_URL` invalid → Prisma `P1001` on first query / `/ready` 503.
- Verify before start: `docker compose config -q && echo ok` + `npx prisma validate` (if schema edited).

### Log tail

```bash
# Host dev (pino JSON)
npm run dev:server 2>&1 | npx pino-pretty   # LOG_PRETTY=true colorizes [server/logger.ts:7]

# Container
docker compose logs -f api                  # stdout JSON (pino)
docker compose logs -f api | npx pino-pretty

# Structured filter (jq)
docker compose logs api | jq 'select(.level==50)'          # error only
docker compose logs api | jq 'select(.durationMs>500)'     # slow
grep "<x-request-id>" logs/app.log | jq                    # trace by requestId [server/app.ts:64]
```

`server/app.ts:60` `pinoHttp` sets `genReqId` from `x-request-id` header or `randomUUID()` and echoes `x-request-id` back; `customLogLevel` maps `5xx→error, 4xx→warn` (`server/app.ts:68`). Skipped when `NODE_ENV=test||VITEST` (`server/app.ts:31`). Redacted: `cookie`, `authorization`, `*.passwordHash` (`server/logger.ts:11`).

### Restart

```bash
docker compose restart api                  # bounce api (keeps DB)
docker compose down && docker compose up -d postgres redis  # bounce infra
docker compose down -v && docker compose up -d postgres     # full reset (data lost)
# worker split (M7.x, when BullMQ wired):
API_ONLY=true npm run server &              # API without scheduler [server/index.ts:23]
npm run start:worker                        # worker-only scheduler [server/worker.ts:20] handles SIGINT/SIGTERM [server/worker.ts:29]
```

Scheduler detail: `server/jobs/queue.ts:17` `startScheduler()` runs `sla-breach-detector` every `60_000ms` (`server/jobs/index.ts:12`), once on boot then interval. `API_ONLY=true` moves ownership to worker.

### Troubleshooting quick reference

| Symptom | Check `file:line` | Resolution |
|---------|-------------------|------------|
| `tenantId=undefined` leak / no filter | `server/app.ts:126` `requireAuth` order vs `app.ts:89` session + `app.ts:90` scopedDb | Ensure `sessionMiddleware` → `withScopedDb` → `requireAuth` order. Without global gate, Prisma `tenantId=undefined` = no filter → cross-tenant leak. |
| `403 {error:'scope_violation'}` | `server/scope/errors.ts:9` `ScopeViolationError` → `server/app.ts:145` 403 | Check `applicationId` / `ApplicationTeam` membership + `FunctionalRole` bypass. |
| Socket.IO not connecting | `server/realtime.ts:35` handshake `resolveSession(ois_session)` + `realtime.ts:51` join `tenant:${id}:events` | Verify `ois_session` cookie valid + `server/auth/session.ts:58` not expired. Realtime path is parallel HTTP+WS on same listener (`server/index.ts:18`). |
| `prisma generate` fails on Alpine | `Dockerfile:25` `apk add openssl ca-certificates` | Already in Dockerfile `deps`/`build`/`runtime`. If local Alpine, `apk add openssl ca-certificates`. |
| Test needs Postgres | `docker compose up -d postgres` + `DATABASE_URL` `5433` | Tests are DB-backed via `server/__tests__/helpers.ts`; need running Postgres. |
| `P1001` cannot reach DB | `.env.local` `DATABASE_URL` vs compose port | Host must use `localhost:5433`, container uses `postgres:5432`. |
| Migration `P3009` / table not found | `docker-compose.yml:82` `migrate deploy` | `docker compose down -v && docker compose up -d postgres && docker compose run --rm api npx prisma migrate deploy`. |
| Port already allocated `5433/6380/3001` | `docker-compose.yml:30,45,74` | Stop host service or remap in `compose.override.yml` (e.g. `55432:5432`) then update `.env.local`. |

### Checklists

**Pre-deploy:**

- [ ] `npm run lint` passes (`tsc --noEmit` root + `server/tsconfig.json` + `eslint server/routes --max-warnings 0` [`package.json:23`])
- [ ] `npm run test` green (vitest `server/**/*.test.ts`)
- [ ] Migration SQL reviewed (immutable after commit — new migration to undo)
- [ ] `.env.example` updated if var added
- [ ] Backup prod DB fresh (<24h, see `DR-RUNBOOK.md:87`)

**Post-deploy:**

- [ ] `curl -f http://localhost:3001/health` → 200
- [ ] `curl -f http://localhost:3001/ready` → 200 (not 503)
- [ ] Smoke: login → list incidents → detail → create → logout
- [ ] Tail 5m: no new `level:50` pattern (`docker compose logs -f api | jq`)
- [ ] P95 latency normal (if OTEL wired, check trace; else `jq .durationMs`)

**Weekly:**

- [ ] Disk: `du -sh logs/ dist/ backups/` + `docker system df`
- [ ] `error.log` recurring pattern review — add regression test
- [ ] Backup rotation check (`backups/` size / `docker compose exec postgres pg_dump` dry-run)
- [ ] `PRAGMA integrity_check` equivalent: `psql "$DATABASE_URL" -c "SELECT 1"` parity

---

## Open Items

- [ ] Backup schedule & retention (pg_basebackup / managed Postgres PITR) — daily snapshot 30d, WAL 7d (see `DR-RUNBOOK.md:87`).
- [ ] Redis BullMQ worker split prod (`API_ONLY=true` + `npm run start:worker` [`package.json:11`] + `Dockerfile.worker`) — `docker-compose.yml:89` slot still commented.
- [ ] Zero-downtime deploy (blue-green / `pm2 reload`) — Phase 1 `systemctl restart` ~2s downtime acceptable (Terra default).
- [ ] SPA static host (Caddy/NGINX) separate from API image — not yet in compose; API serves `/api` only [`Dockerfile:11`].
- [ ] Centralized log shipper (Loki/ELK) for prod multi-instance + OTEL exporter (Jaeger/Tempo) — scaffold at `server/telemetry.ts:22`.
- [ ] Automated staging environment — currently dev local only; build when pre-prod starts.
- [ ] Secret rotation automation (SESSION_SECRET / GEMINI_API_KEY) — manual now, Vault/SOPS Phase 2+.

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| `migrate deploy` idempotent di boot | Aman rerun tiap deploy, tidak perlu manual (`docker-compose.yml:82`) | M7.4 |
| `compose.override.yml` gitignored untuk secrets | `compose.override.yml.example` sebagai template (`compose.override.yml.example:10`, `.gitignore:23`) | M7.4 |
| `.env.local` then `.env` load order | Matches Vite `loadEnv` so frontend/backend agree (`server/index.ts:4`, `vite.config.ts:7`) | M7.4 |
| `dotenv -e .env.local --` for all `db:*` | Host `5433` URL always picked up (`package.json:15`) | M7.4 |
| Global `requireAuth` gate | Prevents `tenantId=undefined` no-filter leak (`server/app.ts:126`) | M6.9 |
| Postgres 16 host `5433→5432` | Avoid clash with host Postgres default `5432` (`docker-compose.yml:30`) | M7.4 |
| Scheduler in-process default, `API_ONLY` split opt-in | Dev simplicity; prod splits via `server/worker.ts:20` (`server/index.ts:23`) | M4 |
| Pino `x-request-id` echo | Trace from UI toast to log without guess (`server/app.ts:64`) | M5 |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init ops runbook — env vars, local dev, deploy, troubleshooting | — |
| 2026-08-28 | Deepen to 310 lines — env table w/ file:line, local dev ports & proxy, Docker override & multi-stage, migrations squashed 0001, health /live /ready 503, ops checklist + troubleshooting | `server/index.ts:4`, `server/app.ts:33`, `server/middleware/auth.ts:20`, `docker-compose.yml:82`, `prisma/schema.prisma:17` |
