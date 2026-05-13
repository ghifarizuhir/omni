# OIS Backend Migration Strategy

**Status:** Draft v1 · **Last updated:** 2026-05-13 · **Owner:** Platform engineering

This document is the playbook for taking OIS from a mock-backed SPA to a production-grade ITSM/operational intelligence platform with a real backend, full Management Mode (admin/RBAC/multi-tenant), persistence, auth, realtime, and observability.

It is organized into:

1. **Current state** — what exists today and what it constrains.
2. **Target architecture** — where we're going (logical, deployment, tech stack).
3. **Data model** — canonical schema derived from `src/types/`.
4. **Migration roadmap** — six milestones (M0 → M5), each with concrete deliverables, exit checkpoints, and rollback posture.
5. **Cross-cutting concerns** — auth, RBAC, audit, realtime, observability, testing.
6. **Risk register** — what can go wrong and the mitigation.

---

## 1 · Current state (baseline)

| Layer | State |
|------|-------|
| Frontend | React 19 SPA, Vite 6, Tailwind 4, react-router 7. ~50 routes. |
| Service layer | `src/services/*` — async wrappers over mocks; `apiFetch()` HTTP client with `VITE_API_MODE=mock\|live` toggle. **Already decoupled from mocks.** |
| Mocks | `src/mocks/*.ts` — flat typed arrays. 50+ files. Single source of seed data. |
| Domain types | `src/types/*` — comprehensive TS interfaces. **These are the de facto API contract.** |
| Backend | Express scaffold (`server/`) serving `/api/v1/*` from the same mocks. Boots on port 3001. **No DB, no auth, no validation.** |
| Auth | UI-only `/login` route. No tokens, no sessions, no `Authorization` header on `apiFetch`. |
| Realtime | None. Events/incidents/inbox are polled. |
| Persistence | None. |
| Tests | None. `npm run lint` only. |
| CI/CD | None. |

**Critical strengths to preserve:**
- Service layer fully decouples routes from data source — milestone work flips `isLive()` per domain, no UI churn.
- Types are exhaustive and stable enough to reverse-engineer a schema.
- Mock data is rich enough to use as production seed.

**Critical gaps blocking Management Mode:**
- No multi-tenant model (no `tenantId` on entities, no tenant-scoping middleware).
- No user/role/permission storage; RBAC mocks exist but are read-only.
- No audit log persistence (CI audit entries are mock-only).
- No write paths for most domains.

---

## 2 · Target architecture

### 2.1 Logical view

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (React 19 SPA)                                       │
│   src/services/* → apiFetch() → /api/v1/*                    │
└─────────────────────────────────────────────────────────────┘
                       │  HTTPS, cookie session
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Edge / Reverse proxy (Caddy or NGINX)                        │
│   · TLS termination · Static asset cache · Rate limit        │
└─────────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                              ▼
┌────────────────────┐       ┌────────────────────────────┐
│ API (Node/Express) │       │ Realtime gateway (Socket.IO│
│  · Auth middleware │       │  or SSE on same Node proc) │
│  · Tenant resolver │       │  · /events/stream          │
│  · RBAC guard      │       │  · /inbox/stream           │
│  · Zod validation  │       └────────────────────────────┘
│  · Service layer   │                  │
│  · Audit emitter   │                  │
└────────────────────┘                  │
        │                               │
        ▼                               ▼
┌────────────────────┐       ┌────────────────────────────┐
│ Postgres (primary) │       │ Redis (pub/sub + sessions  │
│  · Prisma schema   │       │  + cache + job queue)      │
│  · Row-level tenancy        └────────────────────────────┘
│  · pgvector (AI features)
└────────────────────┘
        ▲
        │ ETL / webhooks
┌────────────────────┐
│ Workers (BullMQ)   │
│  · Event ingestion │
│  · Webhook intake  │
│  · Scheduled jobs  │
│    (SLA breach     │
│     detection,     │
│     capacity calc, │
│     report gen)    │
└────────────────────┘
```

### 2.2 Deployment view (target)

| Environment | Hosting | Notes |
|-------------|---------|-------|
| Dev | Local Docker Compose | Postgres + Redis + API + Vite |
| Staging | Single VM or Fly.io / Render | Mirrors prod minus HA |
| Prod | Kubernetes (GKE/EKS) or Fly.io | API + workers autoscale; Postgres managed (Cloud SQL / RDS); Redis managed |

Until traffic justifies K8s, a single Fly.io app with separate processes (`api`, `worker`) and managed Postgres+Redis is the recommended starting point — cheap, fast, and trivially portable to K8s later.

### 2.3 Tech stack (recommended)

| Concern | Choice | Why |
|---------|--------|-----|
| Runtime | Node 22 LTS | Already in use via `tsx`; aligns with Vite tooling |
| HTTP framework | Express 4 (already scaffolded) | Match existing scaffold; mature middleware ecosystem. **Hono** is a viable swap if perf becomes an issue. |
| Language | TypeScript 5.8 strict | Shared types with frontend |
| ORM | **Prisma** | Type-safe; great DX; auto-migration; introspection. **Drizzle** is the runner-up if we hit Prisma perf limits. |
| Database | **Postgres 16** | Relational with JSONB for flexible fields; LISTEN/NOTIFY for cheap realtime; pgvector for AI |
| Cache + pubsub + queue | **Redis 7** | Session store + BullMQ jobs + Socket.IO adapter |
| Auth | **Lucia** or **Auth.js** (session cookies) | Simpler than rolling our own JWT; SSO via OIDC pluggable later |
| Validation | **Zod** | Shared client/server schemas; runtime validation at the boundary |
| Realtime | **Socket.IO** (preferred) or **SSE** | Socket.IO if we need bidirectional; SSE if read-only streams suffice |
| Background jobs | **BullMQ** on Redis | Cron + retries + DLQ; native TS |
| Observability | **OpenTelemetry** → Grafana Cloud / Honeycomb / Datadog | OTel keeps vendor optionality |
| Logging | **pino** | Fast, structured JSON; ships to OTel |
| Testing | **Vitest** + **Playwright** | Unit/integration + e2e |
| Schema migrations | Prisma Migrate | Version-controlled, reviewable |
| Secrets | Doppler / SOPS / cloud secret manager | Never in `.env` committed |
| CI | GitHub Actions | Lint + tests + Prisma migrate dry-run on every PR |

**Things deliberately rejected:**
- *GraphQL* — REST is sufficient and matches the existing service layer; revisit only if we add a public API.
- *tRPC* — would require coupling the SPA build to server types; current `apiFetch` layer already gives type-safe responses via shared `src/types`.
- *Microservices* — premature at this scale; one Node service + worker is correct for the next 18 months.
- *Custom auth* — Lucia/Auth.js are battle-tested; rolling our own is the #1 way to ship a security incident.

---

## 3 · Data model

### 3.1 Entity inventory (derived from `src/types/`)

| Domain | Core entity | Supporting entities | Notes |
|--------|-------------|---------------------|-------|
| Identity | `User` | `Team`, `Role`, `Permission`, `Session` | RBAC mocks already define divisions/departments/applications |
| Tenancy | `Tenant` | `TenantMembership` | **New** — not in current types; required for Management Mode |
| CMDB | `ConfigurationItem` | `CIRelationship`, `CIAuditEntry`, `Service` | 8 CI types; relationships are typed edges |
| Monitoring | `Event` | `MonitoringRule`, `AlertRoute` | Events reference CIs and rules |
| Incident | `Incident` | `IncidentComment`, `IncidentTimelineEvent` | Workflow states + SLA timers |
| Problem | `Problem` | — | Linked to incidents |
| Change | `Change` | `ChangeApproval` (new) | RFC workflow + CAB approvals |
| Release | `Release` | `Deployment`, `DeploymentLog`, `Environment` | |
| Request | `ServiceRequest` | `CatalogItem` | |
| Knowledge | `KBArticle` | `KBCategory`, `KBFeedback` | |
| Testing | `TestPlan` | `TestCase`, `TestRun`, `SignOff` | |
| Availability | `Outage` | `SLATarget`, `SLABreach`, `DailyServiceHealth` | |
| Capacity | `CapacityMetric` | `CapacityThreshold`, `CapacityForecast`, `CapacityDataPoint`, `ScalingRecommendation` | Time-series candidate for partitioning |
| Continuity | `DRPlan` | `DRTestRun`, `BIAEntry` | |
| Improvement | `ImprovementInitiative` | `BenefitMeasurement`, `ROICalculation` | |
| Notifications | `Notification` | `NotificationPreference`, `QuietHours`, `InboxItem` | |
| On-call | `OnCallSchedule` | `OnCallOverride` | |
| Status page | `StatusPageEntry` | `StatusPageIncident` | |
| Integrations | `Integration` | — | Webhook + API integrations |
| AI | `AiSession` | (messages — currently inline) | pgvector for embeddings |
| Measurement | `Report` | `MetricDefinition`, `MeasurementDashboard` | |
| Audit | `AuditLog` (new) | — | Cross-cutting; emitted from every write |

### 3.2 Identity & tenancy (new)

```prisma
model Tenant {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  createdAt    DateTime @default(now())
  memberships  TenantMembership[]
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  avatarUrl    String?
  passwordHash String?  // null for SSO-only users
  ssoSubject   String?  @unique
  createdAt    DateTime @default(now())
  memberships  TenantMembership[]
  sessions     Session[]
}

model TenantMembership {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  roles     Role[]   @relation("MembershipRoles")
  createdAt DateTime @default(now())
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  @@unique([tenantId, userId])
}

model Role {
  id           String   @id @default(cuid())
  tenantId     String   // null for system roles
  name         String
  permissions  String[] // e.g. ["incident.read", "change.approve"]
  memberships  TenantMembership[] @relation("MembershipRoles")
}

model Session {
  id         String   @id
  userId     String
  tenantId   String   // active tenant for this session
  expiresAt  DateTime
  user       User     @relation(fields: [userId], references: [id])
}
```

**Tenancy enforcement:** every domain entity gets `tenantId String` + an index, and the API layer attaches a `WHERE tenantId = $session.tenantId` clause via Prisma middleware. We do **not** rely on row-level security in Postgres for v1 (it complicates migrations); we rely on a single middleware that refuses queries without a tenant scope.

### 3.3 Domain schema pattern

For each existing TS type, we apply a consistent transformation:

```
TS `ConfigurationItem` interface
  ↓
Prisma model:
  · id           String  @id @default(cuid())   // internal
  · publicId     String  @unique                // existing CI-XXXX style
  · tenantId     String  @index
  · …fields from the interface
  · createdAt / updatedAt
  · createdById  → User
  · updatedById  → User
  · @@index([tenantId, type])
```

Relationships (`CIRelationship`, `IncidentComment`, etc.) become join tables with `tenantId` denormalized for query speed and tenant isolation.

### 3.4 Time-series and JSONB

- `CapacityDataPoint`, `Event.payload`, `DeploymentLog` → JSONB column or, for capacity, **TimescaleDB hypertable** if data volume justifies it (defer to M4).
- Event payloads, rule conditions, integration configs → JSONB with a Zod schema enforced at the application layer.

### 3.5 Audit log (new, cross-cutting)

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  tenantId    String   @index
  actorId     String?  // null for system events
  action      String   // "incident.update", "change.approve", etc.
  resourceKind String  // "Incident", "Change"
  resourceId  String
  before      Json?
  after       Json?
  ip          String?
  userAgent   String?
  createdAt   DateTime @default(now())
  @@index([tenantId, resourceKind, resourceId])
  @@index([tenantId, createdAt])
}
```

Emitted from a single Prisma middleware that diffs `before`/`after` on every mutation. Required for Management Mode compliance posture.

---

## 4 · Migration roadmap

Six milestones. Each has **deliverables**, an **exit checkpoint** (binary pass/fail), and a **rollback** strategy. Estimated effort is in engineer-weeks for a team of two; halve for a team of four with parallelism.

### M0 — Foundation (1–2 weeks) · **Status: scaffolded ✅**

**Goal:** Express server returning mock-backed responses behind `/api/v1`.

**Deliverables:**
- [x] `server/` express app (done)
- [x] `/api/v1/*` mirrors the service layer
- [x] Vite proxy `/api` → `:3001`
- [x] `npm run dev:all` script
- [x] `npm run lint` covers server tsconfig
- [ ] Dockerfile for the API
- [ ] `docker-compose.yml` with Postgres + Redis (empty) ready for M1

**Exit checkpoint:**
- Setting `VITE_API_MODE=live` in `.env.local` produces a fully working app with no UI regressions.
- Manual smoke test: dashboard, CMDB list, event detail, incident list, change list all render data fetched from the server.

**Rollback:** trivial — `VITE_API_MODE=mock` reverts to in-process mocks.

---

### M1 — Persistence & schema (3–4 weeks)

**Goal:** Real Postgres-backed storage; mocks become seed data.

**Deliverables:**
- Add Prisma (`prisma/schema.prisma`) with Identity/Tenancy + 3 pilot domains: **CMDB, Incidents, Events**.
- Migration `0001_init`.
- Seed script (`prisma/seed.ts`) ingests `src/mocks/cis.ts`, `events.ts`, `incidents.ts` into the DB, generating a single default `Tenant` and demo `User`.
- Server routes for CMDB/Incidents/Events switched from mock imports to Prisma queries.
- Repository pattern introduced (`server/repositories/*`) so route handlers don't call Prisma directly.
- Pagination convention: cursor-based, `{ items, nextCursor }` envelope. Apply to `list` endpoints.
- Zod request schemas added for the 3 pilot domains.
- Integration tests (Vitest + Testcontainers Postgres) for the 3 pilots.

**Exit checkpoint:**
- CMDB, Events, Incidents fully served from Postgres in live mode.
- `prisma migrate reset && prisma db seed` produces a runnable app identical to mock mode.
- Test coverage ≥ 70% for migrated route handlers.
- Lighthouse / manual perf: list endpoints p95 < 200ms with seed data.

**Rollback:** per-domain `isLive()` flag in services flips back to mocks; M0 path remains intact.

---

### M2 — Identity, sessions, RBAC (2–3 weeks)

**Goal:** Real auth and tenant isolation. This unblocks Management Mode.

**Deliverables:**
- Lucia (or Auth.js) integrated, cookie-based sessions, Postgres-backed session store.
- `/api/v1/auth/login`, `/logout`, `/me` endpoints; `/login` UI wired to them.
- Session middleware: resolves `req.user`, `req.tenant`, `req.permissions` on every request.
- Tenant resolver middleware: enforces `WHERE tenantId = …` via Prisma extension.
- RBAC middleware: declarative `requirePermission('incident.update')` guards on routes.
- Audit log writes for every mutation (Prisma middleware).
- Frontend: `apiFetch` includes `credentials: 'include'`; 401 → redirect to `/login`.
- A **Management Mode** route prefix (`/admin/*`) gated by `system.admin` permission; placeholder admin shell.

**Exit checkpoint:**
- Two separate tenants can be created and seeded; user in tenant A cannot read tenant B's data (verified by integration tests).
- A non-admin user gets 403 on `/admin/*` routes.
- Audit log captures all CMDB/Incident/Event mutations end-to-end.

**Rollback:** auth feature flag `AUTH_REQUIRED=false` bypasses session middleware in dev only — never in prod.

---

### M3 — Domain coverage & writes (4–6 weeks)

**Goal:** Move the remaining domains to Postgres and add the write endpoints the UI needs for Management Mode.

**Deliverables (in dependency order):**
1. Services, Catalog items (read)
2. Problems, Changes, Releases, Deployments (read + write — change approvals critical for Management Mode)
3. Requests, KB (read + write)
4. Availability, Capacity (read; capacity may stay snapshot-based)
5. Integrations (read + write — including webhook secret rotation)
6. Notifications, Inbox, On-call (read + write)
7. Testing, Continuity, Improvement, Measurement, Status Page, AI sessions, RBAC

Each domain follows the M1 pattern: Prisma model → seed migration → Zod schemas → repository → route handler → tests.

**Exit checkpoint:**
- All 20+ domains served from Postgres.
- Every UI action that should mutate state has a matching write endpoint, validated server-side.
- Mock imports removed from `src/services/*`. `VITE_API_MODE` flag is **deleted** — live is the only mode.
- `src/mocks/*` retained only as seed-data source under `prisma/seed/`.

**Rollback per domain:** keep mock imports until the live endpoint passes integration tests and a 1-week soak in staging.

---

### M4 — Realtime, jobs, ingestion (3–4 weeks)

**Goal:** The app stops feeling like a periodic poll. Events, incidents, inbox stream live.

**Deliverables:**
- Socket.IO (Redis adapter) on the API process.
- `/events/stream` → push new/updated events; client subscribes per filter.
- `/inbox/stream` → push inbox items to the relevant user.
- `/incidents/:id/stream` → comment + timeline pushes for active responders.
- BullMQ workers process:
  - **Event ingestion**: HTTP POST from monitoring sources → enqueue → enrich (CI lookup) → persist → fire alert routes.
  - **SLA breach detection**: cron, scans active incidents, marks breaches.
  - **Capacity forecast recompute**: cron.
  - **Report generation**: ad-hoc.
- Outbound webhook delivery (integrations) with retry + DLQ.
- Frontend: replace `useResource` with a hook variant that subscribes to streams for select pages.

**Exit checkpoint:**
- An event POSTed to the ingest endpoint appears in the open Monitoring page within 1s without refresh.
- SLA breach worker correctly flags a synthetic breach in a Playwright test.
- Webhook delivery: 99% success in a 1000-message load test, failed messages land in DLQ.

**Rollback:** disable Socket.IO subscription on the client (feature flag); pages fall back to interval polling.

---

### M5 — Management Mode hardening (3–4 weeks)

**Goal:** Production-ready admin surface and operational guarantees.

**Deliverables:**
- Admin surfaces:
  - Tenant management (create, suspend, billing-ready hooks).
  - User management (invite, deactivate, force logout).
  - Role/permission editor.
  - Audit log viewer (filterable by actor, resource, time range).
  - Integration management (already partially covered).
  - Feature flag UI.
- Compliance:
  - PII-aware audit log redaction.
  - Data export (per-user GDPR DSAR, per-tenant full export).
  - Data deletion job (per-tenant; cascading; reviewed by humans before run).
- Observability:
  - OpenTelemetry traces on every HTTP + worker job.
  - Pino structured logs shipped to log aggregator.
  - Health, readiness, liveness endpoints.
  - SLOs defined: API p95 < 300ms, ingest p95 < 2s, worker job success ≥ 99.5%.
  - Synthetic monitoring against staging.
- Operational:
  - Backup: nightly Postgres snapshot, 30-day retention; weekly restore test.
  - Disaster recovery runbook: RTO 4h, RPO 1h.
  - Multi-AZ Postgres (managed).
  - Blue/green or rolling deploys.
- Security:
  - External pentest pass.
  - CSP headers, HSTS, secure cookies.
  - Rate limiting per IP + per session.
  - Secret rotation procedure documented and tested.

**Exit checkpoint:**
- Tabletop DR exercise completes in < RTO.
- Pentest report has no high-severity issues outstanding.
- A complete tenant lifecycle (create → invite users → grant roles → activity → export → delete) is exercised by a Playwright suite.

**Rollback:** N/A — this is hardening, not feature work. Defects fall back to bugfix process.

---

### Milestone summary

| Milestone | Effort (eng-weeks, team of 2) | Unlocks |
|-----------|-------------------------------|---------|
| M0 Foundation | 1–2 ✅ scaffolded | Server seam in place |
| M1 Persistence | 3–4 | Real DB for 3 pilot domains |
| M2 Auth + RBAC | 2–3 | Multi-tenant safe; Management Mode shell |
| M3 Full domain coverage | 4–6 | Live mode is the only mode |
| M4 Realtime + jobs | 3–4 | Push UX; ingestion; scheduled work |
| M5 Hardening | 3–4 | Production launch readiness |
| **Total** | **16–23 weeks** | |

---

## 5 · Cross-cutting concerns

### 5.1 RBAC permission catalog

Permissions are dotted strings: `<resource>.<action>`. Maintain in `server/auth/permissions.ts`.

Examples:
- `incident.read`, `incident.update`, `incident.resolve`, `incident.delete`
- `change.read`, `change.create`, `change.approve`, `change.implement`
- `cmdb.read`, `cmdb.update`, `cmdb.audit.read`
- `system.admin`, `system.audit.read`, `system.tenant.manage`

Routes declare permissions; tests assert that a user without the permission receives 403.

### 5.2 API conventions

- All paths under `/api/v1/`. Future breaking changes bump to `/v2`.
- Resource collections: `GET /resource` returns `{ items, nextCursor }`. Single: `GET /resource/:publicId`.
- Mutations: `POST` for create, `PATCH` for partial update, `PUT` for full replace (rare), `DELETE` for delete.
- Errors: `{ message, code?, fieldErrors? }`. HTTP status indicates category; `code` for machine handling.
- Times: ISO-8601 strings, always UTC.
- IDs: external entities use `publicId` (`INC-1234`); internal joins use `id` (cuid).

### 5.3 Realtime conventions

- One Socket.IO namespace per resource family: `/events`, `/inbox`, `/incidents`.
- Rooms are tenant-scoped: `tenant:${tenantId}:events`.
- Server emits typed events: `event:created`, `event:updated`, `event:deleted`.
- Client must reconcile against authoritative REST on reconnect (don't trust the stream alone).

### 5.4 Testing strategy

| Layer | Tool | Coverage target |
|-------|------|-----------------|
| Unit (pure logic) | Vitest | ≥ 80% on `server/lib/*`, `server/repositories/*` |
| Integration (routes + DB) | Vitest + Testcontainers Postgres | Every route, every status code path |
| Contract (zod schemas) | Vitest | All request schemas |
| E2E | Playwright | Golden paths per module |
| Load | k6 | API p95 targets, ingest throughput |

CI runs unit + integration on every PR. E2E + load on nightly + pre-release.

### 5.5 Migration mechanics (zero-downtime)

Use the **expand–migrate–contract** pattern for every schema change:

1. **Expand:** add new column/table, deploy code that writes to both old and new.
2. **Backfill:** background job populates new shape.
3. **Migrate reads:** flip reads to new shape behind a flag.
4. **Contract:** stop writes to old shape; drop in a later release.

Never combine schema changes with new feature code in the same deploy.

### 5.6 Observability minimum bar

- **Metrics:** request rate, error rate, p50/p95/p99 latency per route. Worker job rate, success, duration.
- **Logs:** structured JSON, one line per request, includes `tenantId`, `userId`, `traceId`.
- **Traces:** OTel spans from HTTP entry → Prisma query → outbound HTTP.
- **Alerts:** SLO burn-rate alerts; dead letter queue depth; Postgres connection saturation; certificate expiry.

---

## 6 · Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema drift between TS types and Prisma | Medium | High | Adopt a single source — generate TS types from Prisma (M1) and replace ad-hoc interfaces. |
| Tenant isolation bug | Low | Catastrophic | Prisma middleware enforces tenant filter; integration tests for every endpoint with cross-tenant fixtures. |
| Mock data not representative of prod | High | Medium | Begin staging-data anonymization import from real customer pilots in M3. |
| Auth implementation flaws | Low | Catastrophic | Use Lucia/Auth.js; pentest in M5; rate-limit auth endpoints. |
| Realtime fan-out costs explode | Medium | Medium | Socket.IO with Redis adapter; per-tenant rooms; backpressure on slow clients. |
| Worker job pile-up | Medium | High | BullMQ DLQ; alert on queue depth; ingest workers auto-scale. |
| Long-running migrations on big tables | Medium | High | Expand–migrate–contract; use `pg_repack` and concurrent index creation. |
| Vendor lock-in to a managed provider | Low | Medium | OTel for observability; standard Postgres; no provider-specific SQL. |
| Feature freeze during migration | High | Medium | Per-domain cutover keeps `mock` mode alive until each domain is live; product work continues on un-migrated domains. |

---

## 7 · Decisions log (append-only)

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-13 | Adopt Postgres + Prisma | Type safety, mature ORM, JSONB + pgvector cover all current needs |
| 2026-05-13 | REST over GraphQL/tRPC | Service layer already REST-shaped; lowest disruption |
| 2026-05-13 | Cookie sessions over JWT | Simpler revocation, no token-storage XSS class |
| 2026-05-13 | Tenancy in application layer, not RLS | Easier migrations; can revisit if compliance requires defense-in-depth |
| 2026-05-13 | Socket.IO for realtime | Bidirectional needed for inbox + incident collab |

---

## 8 · Open questions

1. **Single-tenant vs. multi-tenant DB?** Recommend pooled multi-tenant for v1; carve out dedicated DBs only for enterprise customers later.
2. **SSO timeline?** OIDC integration is straightforward post-M2 — decide based on first paying customer requirements.
3. **AI features and pgvector?** Defer pgvector schema to M3 unless AI sessions go live earlier.
4. **Mobile/native clients?** Current REST + cookie session works for web only; if mobile lands on the roadmap, add OAuth2 + refresh tokens before M5.

---

## Appendix A — Module → endpoint map

(See `server/routes/*.ts` for current paths. Endpoint catalog is generated by the route inventory script — to be added in M1.)

## Appendix B — Glossary

- **Management Mode:** the admin/operator surface for tenant, user, role, audit, and integration management. Distinct from end-user ITSM workflows.
- **Tenant:** a customer organization. All entities are tenant-scoped.
- **publicId:** human-readable external identifier (`INC-1234`, `CI-SVC-PAY-001`). Stable across renames.
- **Live mode:** `VITE_API_MODE=live` — the SPA hits the real backend.
