# OIS API Server

Express server that backs the `/api/v1/*` endpoints expected by `src/services/`.

## Run

```bash
npm run server         # one-shot
npm run server:watch   # auto-restart on changes
npm run dev:all        # Vite (3000) + API (3001) together
```

The Vite dev server proxies `/api` → `http://localhost:3001`, so set
`VITE_API_MODE=live` in `.env.local` and routes will hit the server.

## Layout

| File | Purpose |
|------|---------|
| `index.ts` | Process entry — binds port, starts the app |
| `app.ts` | Express assembly: middleware, router mounts, error handler |
| `util.ts` | `asyncHandler`, `HttpError`, `NotFoundError`, query coercion |
| `routes/*.ts` | One file per domain, mirrors the service layer 1:1 |

## Next steps toward production

1. Replace mock imports with a real persistence layer (Prisma + Postgres recommended).
2. Add zod schemas alongside `src/types/` and validate request bodies.
3. Add auth middleware — cookie session or JWT.
4. Add write endpoints for domains that still only expose `list`/`get`.
5. Introduce pagination conventions (cursor + limit).
6. Wire WebSocket/SSE for events + inbox streams.
