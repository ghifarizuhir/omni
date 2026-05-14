<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# OIS — Omni Intelligence Suite

OIS is an ITSM / operational intelligence platform: a React SPA frontend backed by an Express + Prisma + Postgres backend, with realtime fan-out over Socket.IO and Gemini API integration for AI features.

The project started as a mock-data-driven AI Studio app and has since been migrated through a multi-milestone backend strategy (M1 → M5). All domains are now served from the database; mock mode and `VITE_API_MODE` have been removed.

View the AI Studio app: https://ai.studio/apps/a27196d5-4bc9-4240-a3ab-6adc926665f9

## Status

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Prisma schema, seed, pilot domains | ✅ Done |
| M2 | Session cookies, RBAC, audit log | ✅ Done |
| M3 | All domains on DB (dedicated tables or generic `Document`) | ✅ Done |
| M4 | `POST /events/ingest` + Socket.IO realtime fan-out + `useRealtime` hook | ✅ Done |
| M5 | Helmet, rate limits, structured logging, health, OTel scaffold, DR runbook | ✅ Code-complete |

Full milestone breakdown: [`docs/milestones/README.md`](./docs/milestones/README.md).

Test posture: `npm run lint` (tsc on src + server) and `npm test` (5 suites, 78 tests).

## Stack

- **Frontend:** React 19, Vite, React Router, Tailwind CSS 4, D3, Framer Motion, Lucide
- **Backend:** Express 4, Prisma 6, Postgres, Socket.IO, Pino, Helmet, express-rate-limit, OpenTelemetry
- **Auth:** Argon2 password hashing, cookie sessions, DB-backed RBAC
- **AI:** `@google/genai` (Gemini)

## Prerequisites

- Node.js 20+
- Postgres 14+ (local or remote)

## Setup

```bash
npm install
cp .env.example .env.local      # then fill in values
npm run db:migrate              # apply Prisma migrations
npm run db:seed                 # seed baseline data
```

Required env vars (see `.env.example`):

- `DATABASE_URL` — Postgres connection string
- `GEMINI_API_KEY` — Gemini API key (injected by AI Studio in prod)
- `APP_URL` — App base URL
- `SESSION_SECRET` — cookie session secret

## Commands

```bash
npm run dev          # Vite dev server (port 3000)
npm run server       # Express API server
npm run server:watch # API with tsx watch
npm run dev:all      # API + Vite together
npm run db:migrate   # prisma migrate dev
npm run db:seed      # seed baseline data
npm run db:reset     # reset DB + reseed
npm run lint         # tsc on src + server
npm test             # vitest run (78 tests)
npm run build        # production build
npm run preview      # preview built bundle
```

Set `DISABLE_HMR=true` in `.env.local` to disable HMR.

## Project Layout

| Path | Purpose |
|------|---------|
| `src/routes/` | Page-level React components |
| `src/components/` | UI primitives, layout, charts, module composites |
| `src/services/` | Frontend API clients + realtime |
| `src/types/`, `src/mocks/`, `src/lib/` | Domain types, fixtures, utilities |
| `server/` | Express app, routes, repositories, jobs, auth, telemetry |
| `server/__tests__/` | Vitest suites |
| `prisma/` | Schema, migrations, seeds (`seed.ts`, `seedDocuments.ts`) |
| `docs/` | Product specs, ITIL 4 mapping, milestone tracker, DR runbook |

Architecture details and module specs live in [`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs/).

## Operations

- **Realtime:** `server/realtime.ts` (gateway) ↔ `src/services/realtime.ts` (client)
- **Hardening:** `server/app.ts`, `server/logger.ts`, `server/telemetry.ts`
- **Disaster recovery:** [`docs/DR-RUNBOOK.md`](./docs/DR-RUNBOOK.md)
