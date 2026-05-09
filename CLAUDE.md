# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OIS — Omni Intelligence Suite** is a React SPA serving as the UI layer for an ITSM/operational intelligence platform. It runs on Google AI Studio and integrates with the Gemini API. All data is currently served from mock files; there is no real backend API layer yet.

## Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Production build (Vite)
npm run preview   # Preview production build locally
npm run lint      # TypeScript type-check (tsc --noEmit)
npm run clean     # Remove dist/
```

There are no tests configured. `npm run lint` is the only CI-like check.

Set `DISABLE_HMR=true` in `.env.local` to turn off hot module replacement if needed.

## Required Environment Variables

- `GEMINI_API_KEY` — Gemini API access (injected by AI Studio at runtime)
- `APP_URL` — Application base URL (injected by AI Studio)

Copy `.env.example` to `.env.local` for local development.

## Architecture

### Entry Point Flow

`index.html` → `src/main.tsx` → `src/App.tsx` (RouterProvider) → `src/routes/index.tsx` (all routes under `AppShell`)

### Directory Layout

| Path | Purpose |
|------|---------|
| `src/routes/` | Page-level components (one file per page) |
| `src/components/ui/` | Reusable primitives: Button, Card, Badge, etc. |
| `src/components/layout/` | AppShell, Sidebar, TopBar, InboxDrawer |
| `src/components/monitoring/` | Monitoring-specific composed components |
| `src/components/cmdb/` | CMDB-specific composed components |
| `src/components/charts/` | D3-based SparkLine and DonutChart |
| `src/types/` | TypeScript interfaces for all domain models |
| `src/mocks/` | Static mock data that stands in for API responses |
| `src/lib/` | Utilities: `cn()` (class merging), `format.ts`, `constants.ts` |
| `docs/` | Product specs and ITIL 4 mapping documents |

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

### Mock Data Pattern

All `src/mocks/*.ts` files export typed arrays. Route components import directly from mocks. When adding a new feature, add its mock data to `src/mocks/` and wire it into the route component. When a real API layer is introduced, mock imports get replaced with fetch/query calls.

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
