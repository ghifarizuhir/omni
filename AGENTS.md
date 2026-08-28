# AGENTS.md

## Commands

```bash
npm run dev          # Vite on :3000 (vite --port 3000 --host 0.0.0.0)
npm run dev:vite     # Vite with NODE_OPTIONS=--max-old-space-size=512
npm run dev:server   # API with tsx watch (server/index.ts)
npm run dev:all      # API + Vite concurrently (--kill-others)
npm run server       # API prod run (tsx server/index.ts) on :3001
npm run server:watch # API watch mode
npm run start:worker # Worker-only scheduler (server/worker.ts)

npm run db:migrate   # dotenv -e .env.local -- prisma migrate dev
npm run db:seed      # dotenv -e .env.local -- tsx prisma/seed.ts
npm run db:seed:prod # root tenant + admin + RBAC catalog
npm run db:reset     # migrate reset --force --skip-seed + seed (dev only)

npm run lint         # tsc --noEmit (root) + tsc --noEmit -p server/tsconfig.json + eslint 'server/routes/**/*.ts' --max-warnings 0
npm run test         # vitest run (include: server/**/*.test.ts, env: node)
npm run build        # vite build
npm run preview      # vite preview
npm run clean        # rm -rf dist
```

Single test: `npx vitest run server/__tests__/<name>.test.ts` or `npx vitest run -t "<test name>"`.

## Env & Local Stack

- Copy `.env.example` → `.env.local` — all DB scripts use `dotenv -e .env.local`.
- Required: `DATABASE_URL` (e.g. `postgresql://ois:ois@localhost:5432/ois?schema=public`), `SESSION_SECRET`, `GEMINI_API_KEY`/`APP_URL` (AI, injected by AI Studio in prod), `PORT`/`HOST` (default 3001/0.0.0.0).
- `VITE_API_BASE_URL=/api/v1`, `VITE_API_PROXY_TARGET=http://localhost:3001` (Vite proxy `/api` → API).
- `DISABLE_HMR=true` in `.env.local` to disable HMR.
- Local infra: `docker compose up -d postgres redis` (Postgres 16 on **host 5433→5432**, Redis on **6380→6379**). Full containers: `docker compose up --build` (api on :3001). Secrets go in `compose.override.yml` (gitignored, see `compose.override.yml.example`).
- `AUTH_REQUIRED=false` pins session to `tenant-demo` admin (dev only, never prod). `API_ONLY=true` disables in-process scheduler (when worker runs separately). `CSP_ENABLED=true` + `CSP_CONNECT_SRC` opts into Helmet CSP.

## Architecture

- **Frontend** `index.html` → `src/main.tsx` → `src/App.tsx` (RouterProvider) → `src/routes/index.tsx`. `AppShell` wraps authed pages (Sidebar + TopBar + Outlet + InboxDrawer). Alias `@` → repo root (`vite.config.ts`, `tsconfig.json`).
- **Backend** `server/index.ts` (load `.env.local` then `.env`, init OTEL) → `server/app.ts:33` `createApp()` → `server/realtime.ts` Socket.IO → `server/jobs/` scheduler (skipped if `API_ONLY=true`). Separate entry `server/worker.ts`.
- **Routes** under `server/routes/` mounted at `/api/v1` behind global `requireAuth` (`server/app.ts:126`). Health: `/health`, `/live`, `/ready` (DB check). Error handler maps `ScopeViolationError` → 403, `HttpError` → status, Zod `issues` → 400.
- **DB** Prisma Postgres (`prisma/schema.prisma`). Many columns are `String` holding serialized JSON (future `jsonb` migration). Source of truth for models; migrations squashed to `0001_init_postgres`.
- **Styling** Tailwind 4, theme in `src/index.css`, `cn()` from `src/lib/utils.ts`. **Types** shared shape in `src/types/`.

## API Conventions (critical)

- **Never import `prisma`/`@prisma/client` in route files** — use `req.scoped.*`. Enforced by `eslint.config.js:19` (`no-restricted-imports` on `server/routes/**/*.ts`). Exempt: `admin.ts`, `admin/dataQuality.ts`, `admin/applicationMembership.ts`, `applications.ts`, `platform.ts`, `auth.ts`, `integrations.ts`.
- **Scope layer is always-on** — `server/middleware/scopedDb.ts:19` `withScopedDb` + `server/scope/scopedDb.ts`. `server/app.ts:126` global `requireAuth` ensures `req.tenantId`/`req.permissions` exist; without it Prisma `tenantId=undefined` becomes no filter → cross-tenant leak. Per-route `requirePermission(...)` from `server/middleware/auth.ts:48` layers on top.
- Handle `ScopeViolationError` (`server/scope/errors.ts:9`) — always 403 with `{ error: 'scope_violation' }`.

## Verification

- Order: `npm run lint` (typecheck both tsconfigs + eslint) → `npm run test`.
- Tests are DB-backed via `server/__tests__/helpers.ts`; need running Postgres. No `setupFiles` in `vitest.config.ts`.

## Sources

- `CLAUDE.md` — full product/route inventory; `README.md` + `docs/` for milestone specs.
