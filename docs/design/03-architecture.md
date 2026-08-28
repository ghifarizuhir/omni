# 03 — Architecture

Status: **Draft**
Depends on: [`01-erd.md`](./01-erd.md), [`02-api-contract.md`](./02-api-contract.md)
Source of truth: [`server/index.ts`](../../server/index.ts), [`server/app.ts`](../../server/app.ts:33), [`server/realtime.ts`](../../server/realtime.ts:28), [`server/jobs/index.ts`](../../server/jobs/index.ts), [`server/worker.ts`](../../server/worker.ts), [`server/middleware/scopedDb.ts`](../../server/middleware/scopedDb.ts:19), [`server/middleware/auth.ts`](../../server/middleware/auth.ts:23), [`server/scope/scopedDb.ts`](../../server/scope/scopedDb.ts:195), [`src/main.tsx`](../../src/main.tsx:6), [`src/App.tsx`](../../src/App.tsx:5), [`src/routes/index.tsx`](../../src/routes/index.tsx:106), [`vite.config.ts`](../../vite.config.ts:14), [`tsconfig.json`](../../tsconfig.json:19), [`docker-compose.yml`](../../docker-compose.yml:21)

---

## Stack

| Layer | Choice | Catatan |
|-------|--------|---------|
| Runtime | Node 22 (Docker `node:22-alpine`), Node 20+ host | `tsx` watch in dev, `tsx server/index.ts` in prod/Docker [`package.json:10`](../../package.json:10) |
| Backend | Express 4 + Prisma 6 + Postgres 16 | `prisma generate` writes to `node_modules/.prisma` [`Dockerfile:40`](../../Dockerfile:40) |
| Realtime | Socket.IO 4 | `server/realtime.ts:28` ↔ `src/services/realtime.ts`; Redis adapter swap is one line [`server/realtime.ts:8`](../../server/realtime.ts:8) |
| Frontend | React 19 + Vite 6 + React Router 7 + Tailwind 4 + D3 + motion | Path alias `@` → repo root [`vite.config.ts:14`](../../vite.config.ts:14), [`tsconfig.json:19`](../../tsconfig.json:19) |
| Auth | @node-rs/argon2, cookie `ois_session`, express-rate-limit, helmet | Session table (not JWT); `AUTH_REQUIRED=false` pins to `tenant-demo` [`server/middleware/auth.ts:20`](../../server/middleware/auth.ts:20) |
| Observability | pino + pino-http + OpenTelemetry scaffold | `server/logger.ts:5`, `server/telemetry.ts:22` (`trace.getTracer`, no-op until exporter wired) |
| Infra | Docker Compose (postgres `5433:5432`, redis `6380:6379`, api `3001`) | `compose.override.yml` gitignored; secrets via override [`compose.override.yml.example:10`](../../compose.override.yml.example:10) |

> Terra contrast: OIS is a **single repo** (not `apps/web,apps/api` monorepo workspaces), runs API via **`tsx`** direct (not compiled JS), uses **Socket.IO** (not SSE), and shares types via **`@` alias to root** (not `packages/contracts`).

---

## Entry points

### Frontend

```
index.html:14 ──► src/main.tsx:6 (createRoot → <App />)
                    └─► src/App.tsx:5 (createBrowserRouter(routes) + CurrentUserProvider)
                          └─► src/routes/index.tsx:106 (RouteObject[] — 50+ routes)
                                ├─ /login                → <Login />
                                ├─ / (RequireAuth → RequirePasswordChange → AppShell)
                                │     └─ AppShell = Sidebar + TopBar + <Outlet /> + InboxDrawer
                                │           ├─ /cmdb, /monitoring, /incidents, /problems, /requests …
                                │           ├─ /changes, /releases, /deployments, /testing …
                                │           ├─ /availability, /capacity, /continuity, /dashboards …
                                │           └─ /admin/*, /inbox, /on-call, /ai …
                                └─ *                     → <NotFound />
```

`src/lib/utils.ts:4` exposes `cn()` (`clsx` + `twMerge`) — used by all `src/components/ui/*` primitives. Alias `@` resolves to repo root in both `vite.config.ts:14` and `server/tsconfig.json:17` so `server/` can import `@/src/types/*` without a publish step.

### Backend

```
server/index.ts:4  loadEnv('.env.local')          ─┐
server/index.ts:5  loadEnv()  (.env defaults)      ─┤ matches Vite loadEnv order
server/index.ts:12 initTelemetry()                ─┤ no-op until OTLP exporter wired
server/index.ts:17 createApp()  [server/app.ts:33]─┤ Express factory (testable)
server/index.ts:18 http.createServer(app)         ─┤ single listener for HTTP+WS
server/index.ts:19 initRealtime(server)           ─┤ Socket.IO on /api/v1/socket [realtime.ts:30]
server/index.ts:23 if (API_ONLY !== 'true') startScheduler() ─┤ in-process polling [jobs/queue.ts:17]
server/index.ts:27 server.listen(3001, 0.0.0.0)   ─┘

server/worker.ts:10  loadEnv('.env.local') + .env  (same order as index)
server/worker.ts:16  initTelemetry()
server/worker.ts:20  startScheduler()               — worker-only, no HTTP bind
server/worker.ts:29  SIGINT/SIGTERM → stopScheduler() [jobs/queue.ts:33]
```

Scheduler detail: `server/jobs/queue.ts:15` `defineJob({ name, intervalMs, fn })`; `server/jobs/index.ts:10` registers `sla-breach-detector` (`intervalMs: 60_000`) as example. Jobs run once on boot then on interval; `API_ONLY=true` on the API node skips them so `npm run start:worker` [`package.json:11`](../../package.json:11) owns the schedule.

---

## Request lifecycle

```
Browser (React Router fetch / Socket.IO handshake)
  │
  ├─► Vite dev proxy  vite.config.ts:29  "/api" → VITE_API_PROXY_TARGET ?? http://localhost:3001
  │                                              changeOrigin:true
  │
  └─► Express  server/app.ts:33  createApp()
        │
        ├─ helmet  app.ts:44  CSP opt-in (CSP_ENABLED=true, CSP_CONNECT_SRC CSV) [app.ts:42]
        ├─ pinoHttp  app.ts:60  genReqId x-request-id / randomUUID, skip if NODE_ENV=test [app.ts:31]
        ├─ express.json  app.ts:76  limit 1mb
        ├─ cookieParser  app.ts:77
        │
        ├─ authLimiter  app.ts:81  windowMs 60s, max 20 (1000 in test) on /api/v1/auth/*
        ├─ sessionMiddleware  app.ts:89 / middleware/auth.ts:23
        │     resolveSession(cookie ois_session) → req.session / req.tenantId / req.permissions
        │     AUTH_REQUIRED=false → DEMO_TENANT_ID tenant-demo [auth.ts:21]
        ├─ withScopedDb  app.ts:90 / scopedDb.ts:19
        │     resolveScopeContext({ userId, tenantId }) → buildScopedDb(prisma, ctx) → req.scoped
        │     unauth → stub ScopedDb (empty ctx) so req.scoped never crashes [scopedDb.ts:27]
        ├─ tenantLimiter  app.ts:95  per-tenant key = tenantId ?? ipKeyGenerator(ip) [app.ts:100]
        │
        ├─ GET /health  app.ts:105  { status:'ok', uptime }
        ├─ GET /live    app.ts:108
        ├─ GET /ready   app.ts:109  prisma.$queryRaw`SELECT 1` → 503 if degraded
        │
        ├─ /api/v1/auth/*  app.ts:120  public (login/logout/me handle own checks)
        │
        ├─ requireAuth  app.ts:126  GLOBAL GATE — throws 401 if !req.session [auth.ts:43]
        │     guarantees req.tenantId + req.permissions for every handler below
        │     without this, tenantId=undefined would reach Prisma as "no filter" → cross-tenant leak
        │
        ├─ /api/v1/applications, /admin, /cmdb, /events, /incidents, /monitoring,
        │  /itsm, /availability, /capacity, /integrations, /platform  app.ts:127-137
        │     handler: Zod parse → req.scoped.<module>.<op>(tenantId, …) → serialize
        │                           └─ prisma tenant-scoped queries via scopedDb.ts:195
        │
        ├─ 404  app.ts:140  { message:'Not found' } for unmatched /api/v1/*
        │
        └─ errorHandler  app.ts:144
              ├─ ScopeViolationError → 403 { error:'scope_violation', module, action, applicationId } [errors.ts:22]
              ├─ HttpError          → err.status { message, body }
              ├─ Zod issues         → 400 { message:'Validation failed', issues }
              └─ else               → 500 { message:'Internal server error' } + logger.error [app.ts:157]

Realtime path (parallel, same HTTP server):
  Socket.IO handshake → realtime.ts:35  cookieHeader → resolveSession(ois_session)
                     → socket.data { tenantId, userId } → join tenant:${id}:events + :inbox [realtime.ts:51]
                     → incident:subscribe → join tenant:${id}:incident:${incidentId} [realtime.ts:53]
  emit helpers: emitEventCreated/Updated, emitInbox, emitIncidentTimeline [realtime.ts:64-74]
```

---

## Layering

### Backend

```
routes (Express Router, thin — parse + delegate + serialize)
  │  never import prisma / @prisma/client  (eslint no-restricted-imports [eslint.config.js:19])
  │  exempt: admin.ts, admin/dataQuality.ts, admin/applicationMembership.ts,
  │          applications.ts, platform.ts, auth.ts, integrations.ts [eslint.config.js:22]
  ▼
services / repositories  (server/repositories/* — cmdb, events, incidents, monitoring, docs)
  │  accept tenantId explicitly; no req object
  ▼
scopedDb  (server/scope/scopedDb.ts:195 buildScopedDb)
  │  resolves writableApps/ownerApps from ScopeContext [scopedDb.ts:198]
  │  enforces POLICY per module [scope/policy.ts:26] → throws ScopeViolationError [errors.ts:9]
  │  exposes typed facades: cmdb, events, incidents, monitoring, problems, changes, releases, serviceRequests
  ▼
prisma  (server/db.ts:10 singleton, global.__prisma in non-prod [db.ts:13])
  ▼
postgres 16  (docker-compose.yml:22  5433→5432)  +  redis 7  (6380→6379) for future BullMQ
```

`server/scope/context.ts:21` `resolveScopeContext` loads `ApplicationTeam` memberships by `teamId` and `UserFunctionalRole` rows into `ScopeContext`. `scope/policy.ts:26` declares `read: global|scoped` and `write: scoped|admin_only` plus `readBypass`/`writeBypass` per module. `scope/enforcement.ts` re-checks invariants at the service boundary.

### Frontend

```
routes (src/routes/index.tsx:106 — RouteObject[], grouped by doc 1-6)
  ▼
components  (src/components/ui/* primitives + layout/AppShell + domain composites)
  ▼
services  (src/services/* — fetch wrappers, realtime.ts Socket.IO client)
  ▼
lib  (src/lib/utils.ts:4 cn(), rbac/CurrentUserContext, api client, query-client)
  ▼
types  (src/types/* — shared shapes, must match API contract)
```

---

## Directory map

| Path | Owns | Notes |
|------|------|-------|
| `src/routes/` | Page-level RouteObjects (one file per page) | Eager import now; `AppShell` wraps authed subtree [`src/routes/index.tsx:116`](../../src/routes/index.tsx:116) |
| `src/components/ui/` | Primitives: Button, Card, Badge, Tabs, etc. | Props in `DESIGN-SYSTEM.md`; `cn()` from `src/lib/utils.ts:4` |
| `src/components/layout/` | AppShell, Sidebar, TopBar, InboxDrawer | Sidebar state local in AppShell |
| `src/components/{cmdb,monitoring,charts}/` | Domain composites | D3 SparkLine/DonutChart |
| `src/types/`, `src/lib/` | Shared domain types, fixtures, `cn()` | Must match API shape in `02-api-contract.md` |
| `server/routes/` | API routers (always via `req.scoped`) | Lint-enforced, see Invariants |
| `server/middleware/` | `auth.ts:23` sessionMiddleware, `scopedDb.ts:19` withScopedDb | Order matters — scoped after session |
| `server/scope/` | `context.ts:21`, `scopedDb.ts:195`, `errors.ts:9`, `policy.ts:26`, `enforcement.ts` | Core scope enforcement |
| `server/repositories/` | cmdb, events, incidents, monitoring, docs | TenantId is explicit param |
| `server/jobs/` | `queue.ts:17` startScheduler, `index.ts:10` job registry | Skipped if `API_ONLY=true` [`server/index.ts:23`](../../server/index.ts:23) |
| `server/realtime.ts` | Socket.IO gateway | Path `/api/v1/socket` [`realtime.ts:30`](../../server/realtime.ts:30) |
| `server/db.ts` | Prisma singleton | `global.__prisma` reuse in dev [`server/db.ts:13`](../../server/db.ts:13) |
| `prisma/` | schema, migrations, seed | Squashed to `0001_init_postgres`; `db:migrate` uses `dotenv -e .env.local` |
| `docs/design/` | 01-erd, 02-api-contract, 03-architecture (this file) | Source of truth for contracts |
| `docs/features/`, `docs/ui/` | Feature specs, UI tokens | Referenced by routes/components |

---

## Config & Env

| Var | Where | Purpose |
|-----|-------|---------|
| `.env.local` | repo root, loaded first [`server/index.ts:4`](../../server/index.ts:4) | Developer overrides; also used by `dotenv -e .env.local -- prisma migrate dev` [`package.json:15`](../../package.json:15) |
| `.env` | repo root, loaded second [`server/index.ts:5`](../../server/index.ts:5) | Committed defaults (dummy); `.env.local` wins |
| `DATABASE_URL` | `postgresql://ois:ois@localhost:5432/ois` locally; `postgres:5432` inside compose [`docker-compose.yml:61`](../../docker-compose.yml:61) | Prisma connection |
| `SESSION_SECRET` | required | Signs `ois_session` cookie |
| `VITE_API_BASE_URL` | `/api/v1` (default) | Frontend fetch base |
| `VITE_API_PROXY_TARGET` | `http://localhost:3001` (default) [`vite.config.ts:31`](../../vite.config.ts:31) | Vite dev proxy target for `/api` |
| `PORT` / `HOST` | `3001` / `0.0.0.0` [`server/index.ts:14`](../../server/index.ts:14), [`docker-compose.yml:63`](../../docker-compose.yml:63) | API bind |
| `AUTH_REQUIRED` | `true` default [`server/middleware/auth.ts:20`](../../server/middleware/auth.ts:20) | `false` pins to `tenant-demo` + admin perms (dev only) |
| `API_ONLY` | unset default | `true` skips in-process scheduler [`server/index.ts:23`](../../server/index.ts:23); pair with `start:worker` |
| `DISABLE_HMR` | unset default | `true` disables Vite HMR overlay [`vite.config.ts:25`](../../vite.config.ts:25) |
| `CSP_ENABLED` / `CSP_CONNECT_SRC` | `false` / `""` default [`server/app.ts:42`](../../server/app.ts:42) | Opt-in Helmet CSP; extra `connect-src` CSV |
| `TENANT_RATE_LIMIT` | `600` default [`server/app.ts:97`](../../server/app.ts:97) | Per-tenant limiter window 60s (10k in test) |
| `REDIS_URL` | `redis://redis:6379` in compose [`docker-compose.yml:62`](../../docker-compose.yml:62) | Reserved for BullMQ (M7.x, not yet wired) |
| `LOG_LEVEL` / `LOG_PRETTY` | `info` / unset | pino level + pretty transport [`server/logger.ts:5`](../../server/logger.ts:5) |

Vite watch ignores `node_modules`, `.git`, `dist`, `prisma/migrations` [`vite.config.ts:26`](../../vite.config.ts:26). Docker secrets go in `compose.override.yml` (gitignored) — see `compose.override.yml.example:10`.

---

## Build & Deploy

```bash
npm run lint        # tsc --noEmit (root) + tsc --noEmit -p server/tsconfig.json + eslint server/routes --max-warnings 0 [package.json:23]
npm run test        # vitest run (include server/**/*.test.ts, env node) [package.json:19]
npm run build       # vite build → dist/ (SPA static) [package.json:20]
npm run preview     # vite preview dist/
npm run dev         # vite --port 3000 --host 0.0.0.0 [package.json:7]
npm run dev:server  # tsx watch server/index.ts [package.json:9]
npm run dev:all     # concurrently api+web --kill-others [package.json:14]
npm run server      # tsx server/index.ts :3001 [package.json:12]
npm run start:worker# tsx server/worker.ts (no HTTP) [package.json:11]
npm run db:migrate  # dotenv -e .env.local -- prisma migrate dev [package.json:15]
npm run db:seed     # dotenv -e .env.local -- tsx prisma/seed.ts [package.json:16]
```

**Docker:**

```
docker compose up -d postgres redis          # hot-reload dev: DB+Redis on host ports 5433/6380
docker compose up --build                    # full stack: api 3001 + migrate deploy [docker-compose.yml:82]
docker compose down -v                       # reset postgres_data volume
```

`Dockerfile` is multi-stage: `deps` (npm ci + openssl) → `build` (prisma generate [`Dockerfile:40`], prune dev) → `runtime` (prod deps + `tsx` reinstall [`Dockerfile:67`], `HEALTHCHECK` on `/health` [`Dockerfile:73`]). SPA `dist/` is **not** served by the API image — separate static host (Caddy/NGINX) in M7 strategy.

---

## Invariants

1. **Never import `prisma` or `@prisma/client` in route files.** Use `req.scoped.*` — enforced by `eslint.config.js:19` `no-restricted-imports` on `server/routes/**/*.ts` (exempt list at `eslint.config.js:22`: `admin.ts`, `admin/dataQuality.ts`, `admin/applicationMembership.ts`, `applications.ts`, `platform.ts`, `auth.ts`, `integrations.ts`).

2. **Global `requireAuth` prevents `tenantId=undefined` leak.** `server/app.ts:126` `api.use(requireAuth)` runs after `sessionMiddleware` [`app.ts:89`] and `withScopedDb` [`app.ts:90`]. Without it, unauthenticated requests would reach repositories with `req.tenantId = undefined`, which Prisma treats as "no filter" — a cross-tenant read. Per-route `requirePermission(perm)` [`server/middleware/auth.ts:48`] layers on top.

3. **ScopedDb is the only tenant boundary.** Repositories take `tenantId` as explicit first arg; `buildScopedDb` [`server/scope/scopedDb.ts:195`] derives `writableApps`/`ownerApps` from `ScopeContext` [`scope/context.ts:10`] and checks `POLICY` [`scope/policy.ts:26`] before delegating. Violations throw `ScopeViolationError` [`scope/errors.ts:9`] → `errorHandler` maps to `403 { error:'scope_violation' }` [`app.ts:145`].

4. **Env loading order is `.env.local` then `.env`.** Both `server/index.ts:4-5` and `server/worker.ts:11-12` do `loadEnv({ path:'.env.local' }); loadEnv();` to match Vite `loadEnv(mode,'.', '')` [`vite.config.ts:7`]. All DB scripts use `dotenv -e .env.local --` [`package.json:15`].

5. **Alias `@` → repo root is the sharing mechanism.** `vite.config.ts:14` and `tsconfig.json:19` / `server/tsconfig.json:17` both map `@/*` to `./*`, letting `server/` import `@/src/types/*` without a publish step. This replaces Terra's `packages/contracts` workspace package.

---

## Open Items

- [ ] `tsx` runtime → `tsc`-compiled JS bundle (TODO M8 in `Dockerfile:14`) — drop TypeScript toolchain from runtime image.
- [ ] Redis BullMQ worker slot still commented in `docker-compose.yml:89` (M7.x) — `Dockerfile.worker` + `worker` service when jobs move off in-process.
- [ ] SPA static host separate (Caddy/NGINX) — not yet in compose; API image serves `/api` only.
- [ ] OpenTelemetry exporter not wired — `server/telemetry.ts:22` is scaffold; needs `sdk-node` + OTLP endpoint.
- [ ] Per-route `requirePermission` coverage audit — global `requireAuth` is done, fine-grained perm checks are incremental per module.

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| Single repo, bukan monorepo workspaces | Simpler untuk ITSM SPA + Express API; beda dengan Terra `apps/web,apps/api` + `packages/contracts` | awal |
| Path alias `@` → root | Share types antara `src/` dan `server/` tanpa publish package; `vite.config.ts:14` + `server/tsconfig.json:17` | awal |
| tsx direct (no build step) | Zero-config TS execution; Dockerfile reinstalls `tsx` at runtime [`Dockerfile:67`] | awal |
| Socket.IO over SSE | Room-per-tenant model `tenant:${id}:${stream}` [`realtime.ts:26`] + Redis adapter one-liner for multi-process | M4 |
| Scheduler in-process default | Dev simplicity; `API_ONLY=true` [`server/index.ts:23`] + `start:worker` [`package.json:11`] untuk prod split | M4 |
| Global `requireAuth` gate | Prevents `tenantId=undefined` no-filter leak; single line [`server/app.ts:126`] covers all downstream routes | M6.9 |
| Helmet CSP opt-in | Dev Vite needs `unsafe-inline`; prod enables via `CSP_ENABLED=true` [`server/app.ts:42`] | M6 |
| Prisma singleton via `global.__prisma` | One pool per process; reused in watch mode [`server/db.ts:13`] | awal |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init architecture — Express+Prisma, Vite SPA, request lifecycle | — |
| 2026-08-28 | Deepen to full stack map — entry points, lifecycle diagram, layering, directory map, config/env, build/deploy, invariants | `server/index.ts:4`, `server/app.ts:33`, `server/realtime.ts:28`, `server/jobs/queue.ts:17` |
