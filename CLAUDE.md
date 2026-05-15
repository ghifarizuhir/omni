# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OIS — Omni Intelligence Suite** is an ITSM/operational intelligence platform with two halves in this repo:

- **Frontend** — React 19 SPA (Vite) under `src/`. Originally built on Google AI Studio against the Gemini API.
- **Backend** — Express + Prisma + Postgres API under `server/`, with Socket.io for realtime and an in-process job scheduler. Local dev stack (Postgres 16, Redis) runs via `docker-compose.yml`. See `docs/PRODUCTION-READINESS-STRATEGY.md` for M7 (production-readiness) milestones.

## Commands

```bash
# Frontend
npm run dev          # Vite dev server on :3000
npm run build        # Production build
npm run preview      # Preview build locally

# Backend
npm run server       # Start API (tsx server/index.ts) on :3001
npm run server:watch # API with watch mode
npm run dev:all      # API + Vite together
npm run start:worker # Worker-only process (server/worker.ts)

# Database (Prisma + Postgres)
npm run db:migrate   # prisma migrate dev
npm run db:seed      # Dev seed (prisma/seed.ts)
npm run db:seed:prod # Prod seed: root tenant + admin + RBAC catalog
npm run db:reset     # Reset DB and reseed (dev only)

# Quality
npm run lint         # tsc --noEmit for both src/ and server/
npm run test         # vitest run
npm run clean        # Remove dist/
```

Set `DISABLE_HMR=true` in `.env.local` to turn off hot module replacement if needed.

## Required Environment Variables

Frontend:
- `GEMINI_API_KEY` — Gemini API access (injected by AI Studio at runtime)
- `APP_URL` — Application base URL (injected by AI Studio)
- `VITE_API_BASE_URL` (default `/api/v1`), `VITE_API_PROXY_TARGET` (default `http://localhost:3001`)

Backend:
- `DATABASE_URL` — Postgres connection string (e.g. `postgresql://ois:ois@localhost:5432/ois?schema=public`)
- `PORT` (default 3001), `HOST` (default 0.0.0.0)
- `API_ONLY=true` on API nodes when running the scheduler in a separate worker process

Copy `.env.example` to `.env.local` for local development. For local Postgres + Redis: `docker compose up -d postgres redis`.

## Architecture

### Entry Point Flow

Frontend: `index.html` → `src/main.tsx` → `src/App.tsx` (RouterProvider) → `src/routes/index.tsx` (all routes under `AppShell`)

Backend: `server/index.ts` boots telemetry, creates the Express app via `server/app.ts`, attaches Socket.io via `server/realtime.ts`, and (unless `API_ONLY=true`) starts the in-process scheduler from `server/jobs/`.

### Directory Layout

| Path | Purpose |
|------|---------|
| `src/routes/` | Page-level components (one file per page) |
| `src/components/ui/` | Reusable primitives: Button, Card, Badge, etc. |
| `src/components/layout/` | AppShell, Sidebar, TopBar, InboxDrawer |
| `src/components/monitoring/` | Monitoring-specific composed components |
| `src/components/cmdb/` | CMDB-specific composed components |
| `src/components/charts/` | D3-based SparkLine and DonutChart |
| `src/types/` | TypeScript interfaces for domain models (shared shape with API) |
| `src/lib/` | Utilities: `cn()`, `format.ts`, `constants.ts` |
| `server/` | Express API entry, app wiring, auth, realtime, jobs, audit, logger |
| `server/routes/` | API routers: auth, admin, cmdb, events, monitoring, incidents, itsm, availability, capacity, integrations, platform |
| `server/middleware/` | Auth/session middleware |
| `server/jobs/` | In-process scheduler and job handlers |
| `prisma/` | `schema.prisma`, `migrations/` (squashed `0001_init_postgres`), `seed.ts`, `seed.prod.ts` |
| `docs/` | Product specs, ITIL 4 mapping, and `PRODUCTION-READINESS-STRATEGY.md` |

### Layout

`AppShell` wraps all authenticated pages: it renders a collapsible `Sidebar` + `TopBar` + `<Outlet>` + `InboxDrawer`. Sidebar and inbox state are managed locally in `AppShell`.

### Implemented Routes

- **Dashboard** `/` — Operational Pulse (KPIs, active incidents, inbox, upcoming changes)
- **CMDB** `/cmdb`, `/cmdb/:ciId`, `/cmdb/graph`, `/cmdb/audit`
- **Monitoring** `/events`, `/events/:id`, `/monitoring/rules`, `/monitoring/routing`, `/monitoring/coverage`
- **Auth** `/login`

Placeholder routes exist for future Doc 3–6 modules (Incidents, Problems, Changes, Releases, etc.).

### Domain Types (`src/types/`)

Key interfaces to know before adding features:

- `ConfigurationItem` — 8 CI types: server, application, database, load_balancer, service, network, storage, endpoint
- `Event` — Monitoring event with severity, status, source (metric/log/trace)
- `MonitoringRule` — Query-based rule that fires events
- `Incident` — Operational issue with status workflow
- `Change` — RFC with approval workflow
- `AlertRoute` — Escalation routing rule
- `Severity` / `Status` enums in `src/types/common.ts`

### Data Layer

The real API lives under `server/routes/` and is served at `/api/v1/...`, backed by Prisma against Postgres. The Prisma schema (`prisma/schema.prisma`) is the source of truth for persisted models; many columns currently store serialized JSON in `String` fields and are tracked for conversion to `jsonb` as part of M7 hardening. When wiring a new feature, always fetch from the API.

### Styling

Tailwind CSS 4 with custom theme defined in `src/index.css`. Key custom tokens:

- **Primary:** `--color-primary: #1F4FD4`
- **Semantic colors:** success `#12B76A`, warning `#F79009`, danger `#F04438`, info `#0BA5EC`
- **Severity:** P1 `#B42318`, P2/P3 `#DC6803`, P4 `#027A48`
- **Fonts:** Inter (sans), JetBrains Mono (mono)

Use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge) for conditional class composition.

## Product Specifications

Detailed module specs live in `docs/`. When implementing a new module, read the corresponding doc first:

- `docs/OIS-INSTRUCTIONS-V3.md` — Overall build spec and architecture decisions
- `docs/PROMPT-MVP-UI-OIS-Doc2-Monitoring.md` — Monitoring module
- `docs/PROMPT-MVP-UI-OIS-Doc3a-IncidentProblem.md` — Incident & Problem management
- `docs/PROMPT-MVP-UI-OIS-Doc3b-RequestKnowledge.md` — Service Requests & Knowledge Base
- `docs/PROMPT-MVP-UI-OIS-Doc4a-ChangeRelease.md` — Change & Release management
