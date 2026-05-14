# OIS Production Readiness Strategy

**Status:** Draft v1 · **Last updated:** 2026-05-14 · **Owner:** Platform engineering
**Predecessor:** [BACKEND-MIGRATION-STRATEGY.md](./BACKEND-MIGRATION-STRATEGY.md) (M0 → M5, code-complete)

## 0 · Purpose

M0–M5 of the backend migration are **code-complete**: Express + Prisma serve every domain, auth/RBAC/audit are wired, Socket.IO carries realtime, and helmet/rate-limit/OTel scaffolding is in place. The remaining gap from "code on `main`" to "frontend ↔ backend fully synced and the service runs in production" is operational, integration, and verification work — not new features.

This document defines that gap as four further milestones (**M6 → M9**) with explicit deliverables, exit checkpoints, and rollback posture, plus the production launch gate (**GA**).

---

## 1 · Gap analysis (what's missing today)

| Area | Today | Gap to production |
|------|-------|--------------------|
| **Database** | SQLite `prisma/dev.db` | Managed Postgres 16, migrations applied, seed strategy split (demo vs. prod-empty) |
| **Frontend ↔ backend contract** | All services route through `apiFetch`; types shared via `src/types/*` | No contract test, no shared Zod schema, no e2e coverage of the round-trip |
| **Realtime** | Socket.IO server + client wired; one hook (`useRealtime`) | Audit which pages still poll; ensure reconcile-on-reconnect everywhere |
| **Mutations** | Write endpoints exist for all M3 domains | Frontend "Save/Approve/Close" buttons audit: every UI mutation hits the live endpoint, surfaces errors, refreshes state |
| **Auth UX** | `/login` → cookie session; `apiFetch` includes credentials | Session-expiry handling, CSRF posture, password reset, SSO design decision |
| **Observability** | pino + OTel scaffold; no exporter | Vendor selection, exporter wired, dashboards, SLO burn-rate alerts |
| **Secrets & config** | `.env.local`, no rotation | Doppler / SOPS / cloud KMS chosen; per-env config matrix documented |
| **Deploy** | `npm run server` on a dev box | Containerized API + worker images, IaC, blue/green or rolling deploy, edge proxy with TLS |
| **Backups & DR** | Runbook exists | Managed Postgres PITR enabled, restore drill executed, RTO/RPO measured |
| **Security** | helmet, rate limit, RBAC enforced | External pentest, dependency scan in CI, CSP enabled at edge |
| **Testing** | 78 unit/integration tests | Playwright e2e suite, load test baseline, contract tests |
| **CI/CD** | `npm run lint` + `npm test` locally | GitHub Actions: lint, test, migrate dry-run, build, image push, deploy gate |

---

## 2 · Milestone roadmap (M6 → GA)

Each milestone is sized for a team of two engineers in calendar weeks; halve for a team of four.

### M6 — Frontend/Backend Integration Audit (2 weeks)

**Goal:** Prove every UI interaction round-trips through the live backend with correct state, error handling, and realtime reconciliation. No more silent mock leakage; no more buttons that don't wire.

**Deliverables:**

- **Mock removal sweep** — confirm `src/mocks/*` is referenced only from `prisma/seed.ts` / `prisma/seedDocuments.ts`. Any residual import in `src/` is a bug.
- **Service-layer audit** — for every file in `src/services/*`, document the backing endpoint(s) and verify they exist on the server. Output: `docs/audits/service-endpoint-matrix.md`.
- **Mutation audit** — page-by-page walkthrough (Incidents, Changes, CMDB, Monitoring rules, Routing, Requests, KB, Admin RBAC). For each Save/Approve/Close/Delete button, verify:
  1. The handler calls a service (not direct `fetch`).
  2. The service hits an existing route.
  3. The route enforces `requirePermission(...)` correctly.
  4. The UI refreshes from server state (no optimistic-only updates that drift).
  5. Server errors surface to the user with actionable copy.
- **Realtime coverage** — list every page that should react to push, confirm it uses `useRealtime` (not interval polling), and that reconnect re-fetches the authoritative list.
- **Session expiry UX** — 401 from any service triggers a redirect to `/login` with a "session expired" banner; in-flight forms preserve their state where feasible.
- **Shared validation** — extract the Zod schemas from `server/routes/*` into `src/shared/schemas/` (or `server/schemas/` consumed by both). Frontend forms validate client-side against the same schema.
- **Contract tests** — a `tests/contract/` Vitest suite that, for each domain, hits the live server (Testcontainers Postgres) and asserts the response shape conforms to the TS type.

**Exit checkpoint:**

- The service-endpoint matrix has zero unmapped service methods.
- A scripted walkthrough exercises one mutation per domain end-to-end without console errors or stale state.
- Contract tests pass for all 20+ domains.
- `grep -r "from '\.\./mocks" src/` returns zero results.

**Rollback:** N/A — this is verification work. Defects surfaced fall back to bugfix process.

---

### M7 — Postgres, Containers, CI/CD (2–3 weeks)

**Goal:** The service runs from a built container against managed Postgres, deployed by an automated pipeline.

**Deliverables:**

- **Postgres port**
  - Flip `prisma/schema.prisma` datasource to `postgresql`.
  - Audit schema for SQLite-specific assumptions (string IDs are already `cuid()`, no `Int @autoincrement`, no SQLite collation quirks).
  - Regenerate migrations under Postgres: `prisma migrate dev --create-only`, hand-review, commit as `0001_init_postgres` (squash prior dev migrations).
  - Seed split: `prisma/seed.ts` keeps demo data for staging; new `prisma/seed.prod.ts` provisions only the root tenant + admin user, sourced from env.
  - JSONB audit — any `Json` field that the UI filters on (e.g., event payload search) gets a GIN index.
- **Containerization**
  - Multi-stage `Dockerfile` for the API (Node 22-alpine, non-root user, pruned dev deps).
  - Worker image (shares base, different entrypoint) — even if BullMQ isn't live yet, ship the slot.
  - `docker-compose.yml` for local: api + postgres + redis. Confirm `npm run dev:all` still works against it.
- **Edge & TLS**
  - Caddy or NGINX reverse proxy in front of the API: TLS termination, gzip, static-asset cache for the SPA build, CSP header injection (turn on `CSP_ENABLED=true`), HSTS preload.
  - WebSocket upgrade verified through the proxy.
- **CI**
  - GitHub Actions workflow: install → `npm run lint` → `npm test` → `prisma migrate diff` dry-run against staging schema → `vite build` → docker build → push to registry.
  - PR gate: all jobs green required before merge to `main`.
- **CD**
  - Deploy target: Fly.io (recommended for v1; per `BACKEND-MIGRATION-STRATEGY.md §2.2`) or equivalent.
  - Two environments: `staging` (auto-deploy on merge to `main`), `prod` (manual promotion via a tagged release).
  - Rolling deploy with health-check gate (`/ready` must return 200 before old instance drains).
- **Secrets**
  - Vendor decision (recommend Doppler for v1 — fast onboarding, free tier covers us). Document rotation steps in `docs/SECRETS-ROTATION.md`.
  - `.env.example` enumerates every variable; CI fails if a referenced env var is undocumented.

**Exit checkpoint:**

- `git push origin main` results in a green staging deploy with zero manual steps.
- Staging serves the SPA over HTTPS, talks to managed Postgres, persists across container restarts.
- A `prisma migrate deploy` runs as part of the deploy pipeline, not by hand.
- Pen-and-paper rollback: redeploying the prior image takes < 5 minutes.

**Rollback:** previous image tag is the last known good; `fly deploy --image <prior-tag>` (or equivalent) restores it. DB migrations are forward-only; destructive changes go through expand/contract.

---

### M8 — Observability, Backups, DR Drill (2 weeks)

**Goal:** When something breaks in production, we see it, we have data, and we can recover.

**Deliverables:**

- **OTel exporter wired** — vendor selection (recommend Grafana Cloud for v1: cheap, OTel-native, hosted Prometheus + Loki + Tempo in one). Swap the body of `initTelemetry()` per the M5 note; traces flow from HTTP, Prisma, and Socket.IO.
- **Dashboards** — at minimum:
  - API: RPS, p50/p95/p99 latency by route, error rate, in-flight requests.
  - Realtime: connected sockets, message rate, reconnect rate.
  - DB: connection pool saturation, slow-query log, replication lag (when applicable).
  - Worker (placeholder until BullMQ jobs land).
- **Logs shipped** — pino JSON → Loki (or vendor equivalent). Request-id traceable from log line to span.
- **SLOs encoded** — burn-rate alerts in the alerting tool:
  - API availability ≥ 99.9% rolling 30d.
  - API p95 < 300ms.
  - Ingest p95 < 2s (gates M4 ingest path).
  - Login success rate ≥ 99% (separates auth from app errors).
- **Backups**
  - Managed Postgres PITR enabled, 30-day retention.
  - Daily logical dump shipped to off-site object storage (defense in depth).
- **Restore drill** — execute the runbook end-to-end against a scratch instance; record actual RTO/RPO and update [DR-RUNBOOK.md](./DR-RUNBOOK.md). If RTO > 4h, fix or revise the target.

**Exit checkpoint:**

- A synthetic error injected in staging surfaces in the dashboard within 1 minute and pages the on-call if it crosses the burn-rate threshold.
- A restore from a 24h-old PITR snapshot completes in < RTO and the app boots clean.
- Every production log line carries `tenantId`, `userId` (if present), and `requestId`.

**Rollback:** N/A — adds capability, no behavior change to the API surface.

---

### M9 — Security, E2E, Launch Gate (2–3 weeks)

**Goal:** Independent verification that the system is safe to expose to customers.

**Deliverables:**

- **Dependency scan** — `npm audit --omit=dev` clean (or documented exception per finding); add to CI.
- **CSP & headers** — `CSP_ENABLED=true` in prod; verify with [securityheaders.com](https://securityheaders.com) target grade A.
- **Pentest** — external firm, scoped to staging clone of prod. Findings triaged: high/critical fixed before GA; medium tracked.
- **Threat-model refresh** — STRIDE walkthrough of the auth, tenant-isolation, ingest, and realtime paths. Document in `docs/THREAT-MODEL.md`.
- **Load test baseline** — k6 or Artillery script hitting the top 10 routes. Establish p95 under 50/100/200 RPS; identify the first bottleneck. Run as a CI nightly against staging.
- **Playwright e2e**
  - Golden paths: login → dashboard → open an incident → comment → resolve → audit log entry visible.
  - Tenant isolation: user-A cannot access tenant-B's resources (UI + API both confirmed).
  - Admin lifecycle: create user → assign role → user logs in → role-gated route reachable.
  - Realtime: open two browsers, action in one appears in the other within 1s.
- **Accessibility sweep** — axe-core in Playwright; zero serious violations on the top 10 routes.
- **Launch runbook** — `docs/LAUNCH-RUNBOOK.md`: pre-flight checklist (migrations, feature flags, on-call), cutover steps, monitoring checks at T+5/15/60 min, rollback decision matrix.

**Exit checkpoint:**

- Pentest report: zero open high/critical.
- Playwright suite green on staging, runs in CI on every PR.
- Load test sustains target traffic (defined per launch plan) with p95 < 300ms and error rate < 0.1%.

**Rollback:** N/A — readiness verification.

---

### GA — Production Launch

**Pre-flight (T−7d):**
- [ ] All M6–M9 exit checkpoints green.
- [ ] Pricing/billing model decided (out of scope for this doc but blocks GA).
- [ ] Support channel defined (email/Slack/Statuspage).
- [ ] Status page live.
- [ ] DPA / privacy policy / ToS published.

**Cutover (T−0):**
- [ ] Final staging soak: 48h with synthetic traffic, zero P1/P2 alerts.
- [ ] Migrate prod DB (forward-only).
- [ ] Promote image tag.
- [ ] Smoke test the launch checklist in `LAUNCH-RUNBOOK.md`.
- [ ] Flip DNS / open the gate.

**Post-launch (T+7d):**
- [ ] Daily review of SLO burn, error budget, audit log anomalies.
- [ ] One incident review or "no-incident retrospective" written.
- [ ] Backlog from M9 medium findings scheduled.

---

## 3 · Effort & sequencing

| Milestone | Effort (eng-weeks, team of 2) | Can parallelize with | Hard blocker for |
|-----------|-------------------------------|----------------------|-------------------|
| M6 Integration audit | 2 | M7 Postgres port | — |
| M7 Postgres + CI/CD | 2–3 | M6 | M8, M9, GA |
| M8 Observability + DR | 2 | M9 e2e/pentest scoping | GA |
| M9 Security + e2e + launch gate | 2–3 | M8 | GA |
| **Total to GA** | **8–10 weeks** | | |

Recommended ordering: **M6 ∥ M7** (different skill sets — frontend audit vs. platform), then **M8 ∥ M9** (SRE vs. security/QA), then GA.

---

## 4 · Risk register (incremental to BACKEND-MIGRATION-STRATEGY §6)

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite→Postgres schema drift surfaces only at migrate time | M7 slips | Run a Postgres-backed `npm test` job in CI starting M6 |
| Pentest finds an auth bypass | GA slips by weeks | Threat-model refresh in M9 *before* pentest; budget 1 sprint for findings |
| OTel exporter vendor lock-in | Future migration pain | OTel-native vendor (Grafana / Honeycomb); avoid proprietary SDKs |
| Realtime fan-out scaling | Multi-instance API breaks Socket.IO | Adopt the Redis adapter for Socket.IO during M7 (not deferred to post-GA) |
| Seed/demo data leaks into prod | Reputation, compliance | Separate `seed.prod.ts`; CI check that `seed.ts` is never invoked in a prod deploy step |
| Frontend ships a button that no longer maps to a route | Silent feature regression | The M6 mutation audit is recurring (runs in CI as part of the contract suite) |

---

## 5 · Definition of "ready for production"

Binary checklist. Every box must be ticked before GA cutover.

- [ ] All write paths used by the UI exist on the server and are RBAC-guarded.
- [ ] Mock data is referenced only from `prisma/seed*.ts`.
- [ ] Postgres is the datasource in all non-dev environments.
- [ ] Every deploy is automated and reversible inside 5 minutes.
- [ ] OTel traces + pino logs land in a dashboard within 1 minute of an event.
- [ ] SLO burn-rate alerts page the on-call.
- [ ] PITR restore drill has been executed in the last 30 days.
- [ ] No open high/critical pentest findings.
- [ ] Playwright e2e suite covers login, tenant isolation, mutation round-trip, and realtime; green in CI.
- [ ] Secrets are managed via the chosen vault; `.env.local` is dev-only.
- [ ] `LAUNCH-RUNBOOK.md` rehearsed at least once against staging.

---

## 6 · Next steps

1. Approve this strategy (or push back — see §1 gap table for what's negotiable).
2. Create milestone trackers: `docs/milestones/M6.md` … `M9.md` mirroring the M1–M5 format.
3. Kick off M6 (integration audit) and M7 (Postgres + CI/CD) in parallel.
