# M7 — Local Development Stack

The `docker-compose.yml` at the repo root brings up Postgres, Redis, and
(optionally) the API in containers for local development. This page is the
quick-reference; full architectural rationale lives in
`docs/PRODUCTION-READINESS-STRATEGY.md`.

## Prerequisites

- Docker Engine 24+ with the `compose` plugin (`docker compose version`
  should report ≥ v2). The legacy `docker-compose` Python script is not
  supported.
- Node 22 + npm (only needed for the hot-reload flow).

## Two flows

### 1. Hot-reload dev (recommended day-to-day)

Run Postgres + Redis in containers, keep the API and Vite on the host so
`tsx watch` / Vite HMR work normally.

```bash
docker compose up -d postgres redis
npm install                # first time only
npx prisma migrate deploy  # apply migrations against the container DB
npm run db:seed            # optional — populates demo tenant/users
npm run dev:all            # starts tsx-watch API on :3001 + Vite on :3000
```

`.env.example` already points `DATABASE_URL` at
`postgresql://ois:ois@localhost:5432/ois?schema=public`, which matches the
ports the compose stack exposes. Copy it once:

```bash
cp .env.example .env.local
```

### 2. Full stack in containers

For a smoke test that mirrors prod packaging:

```bash
docker compose up --build
# API:      http://localhost:3001/api/v1
# Postgres: localhost:5432  (ois / ois / ois)
# Redis:    localhost:6379
```

The API container runs `prisma migrate deploy && npm run start` on boot, so
schema is applied automatically. Seed data is NOT run automatically — see
below.

## Common operations

| Action | Command |
|--------|---------|
| Seed the DB | `docker compose exec api npm run db:seed` |
| Open a psql shell | `docker compose exec postgres psql -U ois -d ois` |
| Tail API logs | `docker compose logs -f api` |
| Reset DB (DESTROYS data) | `docker compose down -v && docker compose up -d postgres` |
| Stop everything (keep data) | `docker compose down` |
| Rebuild API image | `docker compose build api` |

## Secrets and overrides

Compose auto-loads `compose.override.yml` on top of `docker-compose.yml`.
The override file is gitignored. To inject a `GEMINI_API_KEY` or flip
`AUTH_REQUIRED` locally:

```bash
cp compose.override.yml.example compose.override.yml
# edit values
docker compose up -d
```

Variables consumed by the API container (see `server/` for the source of
truth):

| Var | Default | Notes |
|-----|---------|-------|
| `DATABASE_URL` | `postgresql://ois:ois@postgres:5432/ois?schema=public` | Required. Inside the compose network the hostname is `postgres`; from the host it's `localhost`. |
| `REDIS_URL` | `redis://redis:6379` | Reserved for BullMQ worker (not wired yet). |
| `PORT` / `HOST` | `3001` / `0.0.0.0` | `server/index.ts` |
| `NODE_ENV` | `development` | Switches Prisma client + session cookie `secure` flag. |
| `LOG_LEVEL` / `LOG_PRETTY` | `info` / unset | `server/logger.ts` |
| `AUTH_REQUIRED` | `true` | `server/middleware/auth.ts`. Set `false` only for local probing. |
| `GEMINI_API_KEY` | unset | Optional — only required when AI features are exercised. |
| `CSP_ENABLED` / `CSP_CONNECT_SRC` | unset / empty | `server/app.ts` |
| `TENANT_RATE_LIMIT` | `600` | `server/app.ts` |

There is intentionally no `SESSION_SECRET` — `server/auth/session.ts` uses
opaque random session IDs persisted in Postgres rather than signed cookies.

## Worker service

The `worker` service in `docker-compose.yml` is commented out. Uncomment
once the BullMQ job code lands; the corresponding image is already built
via `Dockerfile.worker` (M7.3).

## Troubleshooting

### "port is already allocated" on 5432 / 6379 / 3001

Another Postgres / Redis / Node process is bound to the same port. Either
stop the host service or remap inside `compose.override.yml`:

```yaml
services:
  postgres:
    ports:
      - "55432:5432"
```

…then update `DATABASE_URL` in `.env.local` accordingly.

### Prisma "migration table not found" or "P3009"

The API container runs `prisma migrate deploy` on every boot. If you see
P3005/P3009-style errors:

```bash
docker compose down -v   # nukes the postgres_data volume
docker compose up -d postgres
docker compose run --rm api npx prisma migrate deploy
```

### API exits before Postgres is ready

The compose file uses `depends_on: { condition: service_healthy }` for
postgres + redis, so the API should never start before pg_isready returns.
If it still races, bump the postgres `healthcheck.retries`.

### Permission denied on the `postgres_data` volume

Almost always a host-side leftover from a prior bind-mount. `docker
compose down -v` + a fresh `docker compose up -d postgres` clears it.

## Verification

`docker compose config` is the canonical validator — run it after editing
the compose file:

```bash
docker compose config -q && echo "ok"
```
