# OIS — Omni Intelligence Suite

> **Project Instructions & Build Specification**
> Versi: 0.3 (Draft) · Bahasa: ID/EN mix (technical terms preserved)
> Companion document: [`OIS-ITIL4-Management-Practices-Mapping.md`](./OIS-ITIL4-Management-Practices-Mapping.md)

---

## Daftar Isi

1. [Tentang Dokumen Ini](#1-tentang-dokumen-ini)
2. [Product Vision & Scope](#2-product-vision--scope)
3. [Diferensiasi vs ITSM Generik](#3-diferensiasi-vs-itsm-generik)
4. [High-Level Architecture](#4-high-level-architecture)
5. [Tech Stack & Tooling](#5-tech-stack--tooling)
6. [Data Model Foundation](#6-data-model-foundation)
7. [Module Specifications (15 Practices + 4 Platform Features)](#7-module-specifications-15-practices--4-platform-features)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Intelligence Layer (AI/Correlation)](#9-intelligence-layer-aicorrelation)
10. [Build Phases & Roadmap](#10-build-phases--roadmap)
11. [Project Structure & Coding Standards](#11-project-structure--coding-standards)
12. [API Design Conventions](#12-api-design-conventions)
13. [Testing & QA Strategy](#13-testing--qa-strategy)
14. [DevOps & Deployment](#14-devops--deployment)
15. [Glossarium](#15-glossarium)

---

## 1. Tentang Dokumen Ini

Dokumen ini adalah **single source of truth** untuk arah build OIS (Omni Intelligence Suite). Tujuannya:

- Memberi konteks utuh kepada developer baru, AI assistant (Claude Code, Cursor, dsb.), dan stakeholder non-teknis.
- Mendefinisikan keputusan arsitektur dan konvensi yang harus dipatuhi semua kontributor.
- Memetakan 13 ITIL 4 management practices ke modul aplikasi yang konkret.

**Audiens:** product owner, tech lead, fullstack developer, QA, dan AI coding assistant.

**Cara penggunaan dengan AI assistant:** muat dokumen ini di context (project knowledge / system prompt) sebelum meminta AI menulis code untuk modul OIS manapun. Dokumen ini berfungsi sebagai *constitution* proyek.

---

## 2. Product Vision & Scope

### 2.1 Visi

> OIS adalah **operational intelligence platform** yang menyatukan ITSM workflow (ITIL 4) dengan observability dan data intelligence dalam satu suite — sehingga operator IT tidak perlu berpindah antara ServiceNow/Jira, Datadog/Grafana, dan PagerDuty/Opsgenie untuk mendapatkan jawaban.

### 2.2 Target User

| Persona | Use case utama |
|---|---|
| **L1/L2 Service Desk Agent** | Triage incident & service request, akses KB, eskalasi |
| **L3 Engineer / SRE** | Investigasi problem, RCA, pengelolaan change |
| **Change/Release Manager** | CAB workflow, release calendar, deployment tracking |
| **Service Owner** | SLA/SLO health, capacity planning, reporting |
| **CIO / IT Manager** | Executive dashboard, KPI, continual improvement |
| **End User (Internal)** | Self-service portal — request, status check |

### 2.3 In-Scope (v1)

15 ITIL 4 management practices sesuai dokumen mapping, dikelompokkan ke 6 cluster:

1. **Foundation** — Service Configuration Management (CMDB)
2. **Observability** — Monitoring & Event Management
3. **Operational Response** — Incident, Problem, Service Request, Knowledge
4. **Change & Delivery** — Change Enablement, Release, Deployment, Validation & Testing
5. **Service Health** — Availability, Capacity, Continuity
6. **Intelligence Layer** — Measurement & Reporting + Continual Improvement (cross-cutting)

Ditambah 4 **Platform Features** yang menjadi fondasi UX dan operasional tim:

7. **Inbox** — pusat action-required lintas modul (approval CAB, eskalasi, sign-off)
8. **Notification Center** — notifikasi pasif (info, digest, update status)
9. **On-Call Management** — rotasi jadwal, handover, eskalasi, override (native penuh)
10. **Internal Status Page** — health layanan real-time untuk seluruh karyawan/tim IT

### 2.4 Out-of-Scope (v1)

- HRM, finance, procurement (integrasi via API saja, bukan modul native)
- Asset financial management mendalam (depresiasi, leasing) — fokus operational asset
- Customer-facing CRM
- ITIL general management practices selain yang ada di 15 (mis. Risk Management, Architecture Management, Information Security Management) — di-cover sebatas referensi

---

## 3. Diferensiasi vs ITSM Generik

OIS bukan "ServiceNow lokal". Hal yang menjadi unfair advantage:

1. **CMDB sebagai backbone yang hidup** — bukan database statis; di-feed otomatis oleh discovery agent dan observability data.
2. **Correlation engine native** — event/metric → incident → problem → change ter-link otomatis (lihat [Intelligence Layer](#9-intelligence-layer-aicorrelation)).
3. **Observability terintegrasi** — logs, metrics, traces sebagai first-class citizen, bukan add-on.
4. **AI-assisted operations** — RCA suggestion, knowledge retrieval, incident summarization (Claude API).
5. **Release ≠ Deploy** — dipisahkan secara konsep sesuai ITIL 4, didukung feature flag.
6. **API-first** — semua fungsi UI tersedia juga via REST; mempermudah otomasi.

---

## 4. High-Level Architecture

### 4.1 Logical Layers

```
┌───────────────────────────────────────────────────────────────┐
│  Presentation Layer                                           │
│  Web App (Next.js) · Mobile (React Native) · Self-Service     │
│  Portal · Public API (OpenAPI)                                │
└────────────────────────┬──────────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────┐
│  Application Layer (Modular Monolith → microservice-ready)    │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐  │
│  │ Operational  │ Change &     │ Service      │ Knowledge  │  │
│  │ Response     │ Delivery     │ Health       │ & Reporting│  │
│  │ Module       │ Module       │ Module       │ Module     │  │
│  ├──────────────┴──────────────┴──────────────┴────────────┤  │
│  │ Observability Module (Monitoring & Event Management)    │  │
│  ├─────────────────────────────────────────────────────────┤  │
│  │ Continual Improvement (cross-cutting register)          │  │
│  └─────────────────────────────────────────────────────────┘  │
│  Cross-cutting: Auth, RBAC, Audit, Notification, Search       │
└────────────────────────┬──────────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────┐
│  Intelligence Layer                                           │
│  Correlation Engine · AI Service (Claude API) · Rule Engine   │
└────────────────────────┬──────────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────┐
│  Data Layer                                                   │
│  PostgreSQL (transactional) · TimescaleDB (metrics) ·         │
│  OpenSearch (logs/full-text) · Redis (cache/queue) · S3       │
└────────────────────────┬──────────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────────┐
│  Integration / Observability Inputs                           │
│  Discovery Agents · Prometheus/OTEL · Webhook receivers ·     │
│  CI/CD · Email/Slack/Teams · External ITSM/CMDB sync          │
└───────────────────────────────────────────────────────────────┘
```

### 4.2 Architecture Decisions Records (ADR) — Initial

| ADR | Keputusan | Alasan |
|-----|-----------|--------|
| 001 | **Modular monolith** untuk v1, bukan microservice | Domain belum cukup matang untuk dipotong; mengurangi ops overhead. Dapat di-decompose nanti. |
| 002 | **Postgres** sebagai primary datastore | Relational fit untuk CI relationship, ACID untuk workflow state, ekosistem matang. |
| 003 | **TimescaleDB extension** untuk metrics | Menghindari maintenance dua database engine. |
| 004 | **Event-driven** internal via outbox pattern + queue | Memungkinkan correlation engine konsumsi domain event tanpa coupling. |
| 005 | **TypeScript end-to-end** | Type safety lintas layer; satu bahasa untuk fullstack. |
| 006 | **OpenAPI-first** untuk public API | Auto-generate client SDK & dokumentasi. |
| 007 | **Feature flag** built-in | Mendukung pemisahan release vs deploy. |

---

## 5. Tech Stack & Tooling

### 5.1 Frontend

- **Framework:** Next.js 14+ (App Router) dengan TypeScript strict mode
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **State:** TanStack Query untuk server state, Zustand untuk client UI state
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts (default), D3 untuk graph view CMDB
- **Tables:** TanStack Table
- **Mobile:** React Native (Expo) untuk on-call agent app — fase lanjut

### 5.2 Backend

- **Runtime:** Node.js 20+ LTS
- **Framework:** NestJS (modular, decorator-driven, fit untuk modular monolith)
  - *Alternatif yang dipertimbangkan:* Fastify + tRPC. NestJS dipilih karena DX modul/DI yang superior untuk tim.
- **ORM:** Prisma (atau Drizzle bila tim prefer SQL-first)
- **Validation:** Zod (shared schema dengan frontend)
- **Queue:** BullMQ (Redis-backed)
- **API Docs:** OpenAPI via `@nestjs/swagger`

### 5.3 Data

- **PostgreSQL 16** — transactional data, CMDB graph (via `pg_trgm`, `ltree`, atau Apache AGE untuk graph queries)
- **TimescaleDB** — time-series metrics (availability, capacity)
- **OpenSearch** — log ingestion & full-text search KB/incident
- **Redis** — cache, session, queue
- **S3-compatible** — attachments, runbook artifacts

### 5.4 Auth & Security

- **AuthN:** NextAuth.js (web) + Auth.js core di backend, support OIDC/SAML untuk enterprise SSO
- **AuthZ:** RBAC + ABAC ringan via CASL atau OSO
- **Secrets:** Doppler / Vault / cloud secret manager (jangan `.env` di prod)

### 5.5 Observability (untuk OIS sendiri)

- **Logs:** Pino → OpenSearch
- **Metrics:** OpenTelemetry → Prometheus → Grafana
- **Traces:** OpenTelemetry → Tempo/Jaeger
- **Errors:** Sentry

### 5.6 DevTooling

- **Monorepo:** Turborepo + pnpm workspaces
- **Lint/Format:** ESLint + Prettier (konfig shared di `packages/config`)
- **Pre-commit:** Husky + lint-staged
- **CI/CD:** GitHub Actions → build, test, lint, e2e, deploy
- **Container:** Docker; orkestrasi via Docker Compose (dev) → Kubernetes/ECS (prod)

---

## 6. Data Model Foundation

CMDB adalah backbone. Dimulai dari sini agar semua modul punya pondasi konsisten.

### 6.1 Core Entities (Conceptual)

```
ConfigurationItem (CI)
├── id, name, type (server/app/db/network/service/...)
├── status, owner, environment, criticality
├── attributes (JSONB — flexible per type)
└── relationships → CIRelationship (typed: depends_on, contains, runs_on, ...)

Service ─── composedOf ───► CI[]
        ─── ownedBy   ───► Team
        ─── slaTarget ───► SLATarget

Incident
├── id, title, description, severity, priority, status
├── assignedTo (User), team
├── affectedCIs → CI[]
├── linkedProblem → Problem?
├── timeline → IncidentEvent[]
└── slaBreach? → SLAEvent

Problem
├── id, title, status (open/known-error/closed)
├── relatedIncidents → Incident[]
├── rootCause, workaround
├── linkedChange → Change?
└── kbArticles → KBArticle[]

Change
├── id, type (standard/normal/emergency), risk, status
├── plannedStart, plannedEnd, actualStart, actualEnd
├── affectedCIs → CI[]
├── linkedProblems → Problem[]
├── approvals → Approval[]
└── pir (post-implementation review)

Release
├── id, version, scope, status, plannedDate
├── changes → Change[]
└── deployments → Deployment[]

Deployment
├── id, environment, status (pending/in-progress/success/failed/rolled-back)
├── strategy (big-bang/phased/blue-green/canary/rolling)
├── artifactRef, commitSha
└── linkedChange → Change

ServiceRequest
├── id, catalogItemRef, requester, status
├── workflow → WorkflowInstance
└── approvals → Approval[]

KBArticle
├── id, title, body (rich), category, tags
├── status (draft/review/published/expired)
├── helpful/unhelpful counters
└── linkedItems → Incident/Problem/Service[]

SLA / SLO
├── service → Service
├── metric (availability%, mttr, response_time, ...)
├── target, window (rolling 30d, calendar month)
└── breaches → SLABreach[]

MonitoringRule
├── id, name, type (threshold/anomaly/composite)
├── source (prometheus/log_pattern/synthetic/...)
├── targetCIs → CI[] (atau CI selector by tag/type)
├── condition (expression), severity, cooldown
├── routingPolicy → AlertRoute
└── enabled, createdBy, lastTriggeredAt

Event
├── id, ruleId? → MonitoringRule (null untuk raw event)
├── type (informational/warning/exception)
├── source, payload (JSONB)
├── relatedCIs → CI[]
├── correlationKey (untuk dedup/grouping)
├── status (open/acknowledged/resolved/suppressed)
└── linkedIncident → Incident?

AlertRoute
├── id, name, matchExpression
├── channels (email/slack/teams/sms/webhook)
├── recipients (user/team/on-call schedule)
├── escalationPolicy → EscalationStep[]
└── quietHours, severity_filter

ImprovementInitiative
├── id, title, description, status (idea/assessed/approved/in_progress/verified/closed)
├── source (pir/lesson_learned/retrospective/measurement_trend/...)
├── sourceRef (incident_id/problem_id/report_id/...)
├── owner, priority, effortEstimate
├── baselineMetric, targetMetric, realizedBenefit
├── linkedChanges → Change[]
└── linkedKBArticles → KBArticle[] (lesson learned)

User, Team, Role — auth domain
AuditLog — who/what/when/where untuk semua mutasi

InboxItem
├── id, type (approval/escalation/sign_off/acknowledgment)
├── recipientId → User
├── sourceModule (incident/change/request/problem/release/...)
├── sourceRef (incident_id, change_id, ... — polymorphic)
├── title, body (short summary, max 280 char)
├── actionUrl (deeplink ke item terkait)
├── priority (urgent/normal)
├── status (pending/acted/expired)
├── dueAt (deadline, sinkron dengan SLA timer jika relevan)
└── createdAt, actedAt

NotificationItem
├── id, type (info/update/digest/mention/system)
├── recipientId → User
├── sourceModule, sourceRef (polymorphic)
├── title, body
├── readAt (null = unread)
├── channel (in_app; push ke email/Slack dilakukan engine terpisah)
└── createdAt

NotificationPreference
├── id, userId → User
├── module (incident/change/problem/request/monitoring/improvement/oncall)
├── inAppEnabled (bool)
├── emailEnabled (bool)
├── slackEnabled (bool)
└── updatedAt
— Catatan: granularitas v1 adalah mute/unmute per module. Per-severity dan per-event-type untuk fase lanjut.

OnCallSchedule
├── id, name, serviceId → Service (nullable, bisa global)
├── timezone, rotationStrategy (weekly/daily/custom)
├── layers → OnCallLayer[] (support multi-layer: primary + secondary)
└── createdBy, createdAt

OnCallLayer
├── id, scheduleId → OnCallSchedule
├── name (e.g. "Primary", "Secondary")
├── rotationLengthHours
└── participants → OnCallParticipant[]

OnCallParticipant
├── id, layerId → OnCallLayer
├── userId → User
└── order (urutan rotasi)

OnCallShift
├── id, scheduleId → OnCallSchedule
├── layerId → OnCallLayer
├── userId → User (on-call pada shift ini)
├── startAt, endAt
├── type (scheduled/override)
└── overrideReason (nullable)

OnCallHandover
├── id, scheduleId → OnCallSchedule
├── fromUserId → User, toUserId → User
├── handoverAt
├── notes (isu aktif, open incidents, hal penting)
└── openIncidents → Incident[] (snapshot saat handover)

EscalationPolicy
├── id, name, scheduleId → OnCallSchedule (nullable — bisa standalone)
├── steps → EscalationStep[]
└── createdBy

EscalationStep
├── id, policyId → EscalationPolicy
├── delayMinutes (0 = immediate)
├── targetType (user/team/oncall_schedule)
├── targetId
└── channel (call/sms/email/slack)

StatusPage
├── id, name, description
├── isPublic (bool — v1: selalu false, internal only)
└── services → StatusPageService[]

StatusPageService
├── id, statusPageId → StatusPage
├── serviceId → Service
├── displayName, displayOrder
└── currentStatus (operational/degraded/partial_outage/major_outage/maintenance)

StatusPageIncident
├── id, statusPageId → StatusPage
├── linkedIncidentId → Incident (nullable)
├── title, type (incident/maintenance)
├── status (investigating/identified/monitoring/resolved)
├── updates → StatusPageUpdate[]
└── scheduledStart, scheduledEnd (untuk maintenance)

StatusPageUpdate
├── id, statusPageIncidentId → StatusPageIncident
├── body (pesan update untuk audience)
├── status (snapshot status saat update)
└── postedBy → User, postedAt
```

### 6.2 Naming Convention

- **Tabel:** `snake_case` plural — `incidents`, `configuration_items`
- **Kolom:** `snake_case` — `created_at`, `assigned_user_id`
- **Foreign keys:** `<entity>_id` — `incident_id`, `service_id`
- **Enum:** stored sebagai string + check constraint atau Postgres native enum
- **Timestamps:** wajib `created_at`, `updated_at`; soft delete pakai `deleted_at`

### 6.3 ID Strategy

- **Public-facing ID:** prefix human-readable — `INC-2026-00123`, `CHG-2026-00045`, `CI-WEB-PROD-001`, `EVT-2026-00099`, `IMP-2026-00012`, `ONC-2026-00001` (on-call schedule), `STP-2026-00001` (status page incident)
- **Internal PK:** UUID v7 (time-ordered)
- Keduanya disimpan; query selalu via UUID, display selalu pakai public ID.

---

## 7. Module Specifications (15 Practices + 4 Platform Features)

> Setiap modul mengikuti template yang sama. Detail page/menu sudah ada di [companion mapping doc](./OIS-ITIL4-Management-Practices-Mapping.md). Di sini kita tambah **routes**, **API endpoints**, dan **dependencies**.

### Template

```
Module: <name>
├── Routes (Next.js)
├── Key Components
├── API Endpoints
├── Domain Events Emitted
├── Domain Events Consumed
└── Dependencies (other modules)
```

### 7.1 Service Configuration Management — *Foundation*

| Item | Spek |
|------|------|
| Routes | `/cmdb`, `/cmdb/[ciId]`, `/cmdb/graph`, `/cmdb/audit` |
| API | `GET/POST /api/v1/cis`, `GET /api/v1/cis/:id`, `GET /api/v1/cis/:id/relationships`, `POST /api/v1/discovery/sync` |
| Events emit | `ci.created`, `ci.updated`, `ci.deleted`, `ci.relationship.changed` |
| Events consume | `deployment.completed` (update CI version), `incident.created` (link CI) |
| Dependencies | None (foundational) |

**Catatan implementasi:** dukung **typed relationship** dan **graph traversal** (siapa depends_on siapa) — pertimbangkan Apache AGE atau computed table untuk performa.

### 7.2 Incident Management

| Item | Spek |
|------|------|
| Routes | `/incidents`, `/incidents/[id]`, `/incidents/major/[id]`, `/incidents/analytics` |
| API | `GET/POST /api/v1/incidents`, `PATCH /api/v1/incidents/:id`, `POST /api/v1/incidents/:id/comments`, `POST /api/v1/incidents/:id/escalate` |
| Events emit | `incident.created`, `incident.assigned`, `incident.resolved`, `incident.major.declared` |
| Events consume | `event.threshold.breached` (auto-create), `monitoring.alert.fired` |
| Dependencies | CMDB, Knowledge, Problem |

**SLA timer** harus berjalan server-side (bukan trust client clock).

### 7.3 Problem Management

| Item | Spek |
|------|------|
| Routes | `/problems`, `/problems/[id]`, `/problems/[id]/rca`, `/kedb` |
| API | `GET/POST /api/v1/problems`, `POST /api/v1/problems/:id/link-incidents`, `POST /api/v1/known-errors` |
| Events emit | `problem.created`, `problem.known-error.published`, `problem.closed` |
| Events consume | `incident.pattern.detected` (dari correlation engine) |
| Dependencies | CMDB, Incident, Change, Knowledge |

### 7.4 Service Request Management

| Item | Spek |
|------|------|
| Routes | `/portal` (self-service), `/portal/catalog`, `/portal/my-requests`, `/requests` (agent), `/requests/workflows` |
| API | `GET /api/v1/catalog/items`, `POST /api/v1/requests`, `POST /api/v1/requests/:id/approve` |
| Events emit | `request.submitted`, `request.approved`, `request.fulfilled` |
| Events consume | `user.onboarded` (template request) |
| Dependencies | CMDB (untuk request akses CI), Change (standard change), Knowledge |

**Workflow engine:** lightweight built-in (state machine) atau integrasi Temporal/n8n. Default: built-in.

### 7.5 Change Enablement

| Item | Spek |
|------|------|
| Routes | `/changes`, `/changes/new`, `/changes/[id]`, `/changes/calendar`, `/changes/cab` |
| API | `GET/POST /api/v1/changes`, `POST /api/v1/changes/:id/approve`, `GET /api/v1/changes/calendar` |
| Events emit | `change.submitted`, `change.approved`, `change.implemented`, `change.failed` |
| Events consume | `problem.permanent-fix.required`, `capacity.scaling.recommended` |
| Dependencies | CMDB, Release, Deployment, Validation, Problem |

**Conflict detection:** scheduler harus highlight bila dua change menargetkan CI overlap di window yang sama.

### 7.6 Release Management

| Item | Spek |
|------|------|
| Routes | `/releases`, `/releases/[id]`, `/releases/pipeline`, `/releases/notes` |
| API | `GET/POST /api/v1/releases`, `POST /api/v1/releases/:id/promote`, `POST /api/v1/releases/:id/toggle-feature` |
| Events emit | `release.planned`, `release.ready`, `release.published` |
| Events consume | `change.approved`, `validation.passed` |
| Dependencies | Change, Deployment, Validation, Knowledge |

### 7.7 Deployment Management

| Item | Spek |
|------|------|
| Routes | `/deployments`, `/deployments/[id]`, `/environments` |
| API | `GET /api/v1/deployments`, `POST /api/v1/deployments/:id/rollback`, `POST /api/v1/webhooks/cicd` |
| Events emit | `deployment.started`, `deployment.completed`, `deployment.failed`, `deployment.rolled-back` |
| Events consume | `release.ready` |
| Dependencies | Change, Release, CMDB, Validation |

**Webhook receiver** untuk GitHub Actions / GitLab CI / Jenkins / ArgoCD.

### 7.8 Service Validation and Testing

| Item | Spek |
|------|------|
| Routes | `/testing/plans`, `/testing/cases`, `/testing/runs`, `/testing/sign-off` |
| API | `GET/POST /api/v1/test-plans`, `POST /api/v1/test-runs`, `POST /api/v1/test-runs/:id/sign-off` |
| Events emit | `validation.passed`, `validation.failed` |
| Events consume | `release.candidate.ready` |
| Dependencies | Change, Release, Problem (verifikasi fix) |

### 7.9 Availability Management

| Item | Spek |
|------|------|
| Routes | `/availability`, `/availability/sla`, `/availability/outages` |
| API | `GET /api/v1/availability/services/:id`, `GET /api/v1/sla/breaches` |
| Events emit | `sla.breach.imminent`, `sla.breach.confirmed` |
| Events consume | `incident.created`, `incident.resolved`, `monitoring.uptime.tick` |
| Dependencies | CMDB, Incident, Measurement |

**Metric source:** TimescaleDB. Compute MTBF/MTTR di view materialized, refresh tiap 1–5 menit.

### 7.10 Capacity and Performance Management

| Item | Spek |
|------|------|
| Routes | `/capacity`, `/capacity/forecast`, `/capacity/thresholds` |
| API | `GET /api/v1/capacity/metrics`, `POST /api/v1/capacity/thresholds` |
| Events emit | `capacity.threshold.breached`, `capacity.scaling.recommended` |
| Events consume | `monitoring.metric.ingested` |
| Dependencies | CMDB, Availability, Change |

### 7.11 Service Continuity Management

| Item | Spek |
|------|------|
| Routes | `/continuity/bia`, `/continuity/dr-plans`, `/continuity/tests` |
| API | `GET/POST /api/v1/continuity/plans`, `POST /api/v1/continuity/tests` |
| Events emit | `continuity.plan.invoked`, `dr.test.completed` |
| Events consume | `incident.major.declared` (suggest invocation) |
| Dependencies | CMDB, Availability, Incident, Validation |

### 7.12 Knowledge Management

| Item | Spek |
|------|------|
| Routes | `/kb`, `/kb/[slug]`, `/kb/editor`, `/kb/analytics` |
| API | `GET /api/v1/kb`, `POST /api/v1/kb/articles`, `POST /api/v1/kb/articles/:id/feedback`, `POST /api/v1/kb/search` |
| Events emit | `kb.article.published`, `kb.article.expired` |
| Events consume | `incident.resolved` (suggest article creation), `problem.known-error.published` |
| Dependencies | Tersedia untuk hampir semua modul |

**Search:** OpenSearch + (opsional) vector embedding untuk semantic search via Claude/OpenAI embeddings.

### 7.13 Measurement and Reporting

| Item | Spek |
|------|------|
| Routes | `/dashboards`, `/dashboards/exec`, `/reports`, `/reports/builder`, `/metrics/catalog` |
| API | `GET /api/v1/metrics/:key`, `POST /api/v1/reports`, `GET /api/v1/dashboards/:id` |
| Events emit | `report.scheduled.generated` |
| Events consume | **semua** domain event (sebagai data warehouse feeder) |
| Dependencies | Cross-cutting — konsumsi semua modul |

### 7.14 Monitoring and Event Management

| Item | Spek |
|------|------|
| Routes | `/events`, `/events/[id]`, `/monitoring/rules`, `/monitoring/routing`, `/monitoring/coverage` |
| API | `GET /api/v1/events`, `POST /api/v1/events/ingest`, `GET/POST /api/v1/monitoring/rules`, `POST /api/v1/monitoring/rules/:id/test`, `GET/POST /api/v1/monitoring/routes` |
| Events emit | `event.ingested`, `event.threshold.breached`, `event.exception.raised`, `monitoring.alert.fired`, `monitoring.uptime.tick`, `monitoring.metric.ingested` |
| Events consume | `ci.created` (auto-suggest monitoring), `change.implemented` (post-deploy anomaly watch) |
| Dependencies | CMDB (target CIs), Notification engine (routing), AI (anomaly detection optional) |

**Catatan implementasi:**
- **Ingestion API** harus menerima OpenTelemetry, Prometheus remote-write, dan generic webhook.
- **Dedup & correlation:** event dengan `correlationKey` sama dalam window N menit di-collapse jadi satu — mengurangi alert storm.
- **On-call integration:** native schedule rotation; integrasi PagerDuty/Opsgenie sebagai opsi.
- **Coverage report** silang dengan CMDB: highlight CI critical yang tidak punya monitoring rule aktif.

### 7.15 Continual Improvement

| Item | Spek |
|------|------|
| Routes | `/improvement`, `/improvement/[id]`, `/improvement/kanban`, `/improvement/heatmap`, `/improvement/benefits` |
| API | `GET/POST /api/v1/improvements`, `PATCH /api/v1/improvements/:id`, `POST /api/v1/improvements/:id/link`, `GET /api/v1/improvements/heatmap` |
| Events emit | `improvement.created`, `improvement.approved`, `improvement.verified`, `improvement.closed` |
| Events consume | `incident.pir.completed`, `change.pir.completed`, `problem.closed`, `report.threshold.regression` |
| Dependencies | Cross-cutting — input dari hampir semua modul; output utama via Change Enablement |

**Catatan implementasi:**
- **Source linking wajib:** setiap initiative harus punya `sourceRef` (PIR id, retrospective id, dll.) supaya traceable.
- **Benefit tracking** menggunakan baseline + target dari Measurement & Reporting; verifikasi outcome tidak boleh manual-claim — harus refer ke metric actual.
- **Heatmap** by practice/service/team membantu identifikasi hotspot improvement.
- **Lightweight di Phase 2:** cukup register sederhana + linking ke incident/problem/PIR; UI lengkap (Kanban, Heatmap, Benefit Tracking) menyusul di Phase 5. Yang penting jangan kehilangan lesson learned sejak awal.

---

> **Platform Features (7.16–7.19)** — Bukan ITIL practice, tapi fondasi UX dan operasional yang cross-cutting. Semua masuk **Phase 2** setelah Incident & Change siap, karena baru relevan ketika ada volume notifikasi dan on-call nyata.

### 7.16 Inbox — *Action-Required Center*

Inbox adalah surface khusus untuk item yang **memerlukan tindakan eksplisit** dari user: approval CAB, eskalasi incident, sign-off test, acknowledgment major incident. Berbeda dari Notification Center yang pasif — setiap item di Inbox punya status `pending` sampai dieksekusi atau expired.

| Item | Spek |
|------|------|
| Routes | `/inbox`, `/inbox/[id]` |
| API | `GET /api/v1/inbox` (filter: status, priority, module), `POST /api/v1/inbox/:id/act` (execute action), `POST /api/v1/inbox/:id/snooze`, `GET /api/v1/inbox/count` (untuk badge counter nav) |
| Events emit | `inbox.item.acted`, `inbox.item.expired` |
| Events consume | `change.approval.requested`, `incident.escalation.required`, `release.sign-off.required`, `incident.major.declared` (acknowledgment), `request.approval.requested`, `validation.sign-off.required` |
| Dependencies | Change, Incident, Release, Service Request, Validation, Notification Engine |

**Catatan implementasi:**
- **Badge counter** di navigasi global wajib real-time (WebSocket atau SSE) — angka stale membuat user tidak percaya.
- **Satu action dari Inbox = satu API call** ke modul sumber. Inbox tidak punya logika bisnis sendiri — ia delegate ke modul yang bersangkutan (`POST /api/v1/changes/:id/approve`).
- **Expired items:** item dengan `dueAt` yang terlewat otomatis pindah ke status `expired` via background job; modul sumber menerima event `inbox.item.expired` untuk eskalasi otomatis.
- **Deep link wajib:** setiap item harus punya `actionUrl` yang langsung buka detail entitas terkait (bukan hanya buka Inbox).
- **Inbox tidak menggantikan workflow modul** — ia hanya surface agregasi. CAB approval tetap punya full workflow di `/changes/cab`.

### 7.17 Notification Center — *Passive Notification Feed*

Notification Center menampilkan semua notifikasi **pasif** (info, update, mention, digest) yang tidak memerlukan tindakan langsung. Diakses via bell icon di navbar, terpisah dari Inbox.

| Item | Spek |
|------|------|
| Routes | `/notifications` (full page view, opsional) |
| API | `GET /api/v1/notifications` (cursor-based, filter: unread/all/module), `POST /api/v1/notifications/mark-read` (bulk), `POST /api/v1/notifications/:id/read`, `DELETE /api/v1/notifications/clear-all` |
| Events emit | `notification.read`, `notification.cleared` |
| Events consume | Hampir semua domain event yang bersifat informatif: `incident.assigned`, `incident.status.changed`, `change.approved`, `problem.known-error.published`, `kb.article.published`, `deployment.completed`, `sla.breach.imminent`, `improvement.approved` |
| Dependencies | Notification Engine, semua modul sebagai producer |

**Catatan implementasi:**
- **Push channels:** Notification Engine yang bertanggung jawab push ke email/Slack/Teams. Notification Center hanya menyimpan dan menampilkan `in_app` notifications.
- **Digest mode:** job harian/mingguan aggregate notifikasi volume tinggi (mis. banyak KB article update) jadi satu digest item — hindari banjir notifikasi.
- **Mention:** jika user di-@mention di komentar incident/problem/change, notification item dibuat dengan `type: mention` dan link langsung ke komentar.
- **Retention:** notifikasi yang sudah dibaca > 30 hari soft-delete otomatis.

### 7.18 Notification Preference Center — *User Notification Settings*

User mengontrol channel apa yang aktif per modul. Granularitas v1: mute/unmute per modul. Per-severity dan per-event-type direncanakan untuk fase lanjut.

| Item | Spek |
|------|------|
| Routes | `/settings/notifications` |
| API | `GET /api/v1/me/notification-preferences`, `PUT /api/v1/me/notification-preferences` (bulk update) |
| Events emit | `notification.preference.updated` |
| Events consume | — (hanya dikonsumsi Notification Engine saat routing) |
| Dependencies | Notification Engine (mengonsumsi preference saat routing) |

**Catatan implementasi:**
- **Default preference:** semua modul aktif untuk `in_app`; email hanya aktif untuk incident severity ≥ P2 (default yang bisa diubah admin). Slack default off kecuali user connect akun Slack mereka.
- **Admin override:** admin dapat set preference default untuk seluruh org (mis. "email wajib aktif untuk semua on-call"). User masih bisa mematikan yang lain.
- **Preference dikonsultasi Notification Engine sebelum setiap routing** — bukan di-cache lama (max cache 5 menit untuk performa).
- **UI:** satu halaman settings dengan toggle per modul × per channel. Simple, tidak ada sub-menu.

### 7.19 On-Call Management — *Native Schedule & Escalation*

On-Call Management adalah modul native penuh — tidak bergantung PagerDuty/Opsgenie. Mengelola siapa yang on-call kapan, handover antar shift, eskalasi otomatis bila tidak ada respons, dan override manual.

| Item | Spek |
|------|------|
| Routes | `/oncall`, `/oncall/schedules`, `/oncall/schedules/[id]`, `/oncall/schedules/[id]/calendar`, `/oncall/handover`, `/oncall/overrides`, `/oncall/escalation-policies`, `/oncall/my-shifts` |
| API | `GET/POST /api/v1/oncall/schedules`, `GET /api/v1/oncall/schedules/:id/shifts` (computed, bukan stored per shift), `POST /api/v1/oncall/overrides` (ganti shift manual), `GET /api/v1/oncall/current` (siapa on-call sekarang per schedule), `POST /api/v1/oncall/handover`, `GET/POST /api/v1/oncall/escalation-policies`, `GET /api/v1/oncall/my-shifts` |
| Events emit | `oncall.shift.started`, `oncall.shift.ended`, `oncall.handover.completed`, `oncall.escalation.triggered`, `oncall.override.created` |
| Events consume | `incident.created` (trigger alert ke on-call), `incident.major.declared` (trigger eskalasi layer 2 langsung), `monitoring.alert.fired` (routing ke on-call via AlertRoute) |
| Dependencies | Incident, Monitoring & Event Management, Notification Engine (untuk call/SMS/push), User/Team |

**Catatan implementasi:**
- **Shift generation:** shifts di-compute on-the-fly dari `OnCallSchedule` + `OnCallLayer` + `OnCallParticipant` + rotation strategy. Tidak di-materialize ke DB kecuali override — mengurangi data stale.
- **Multi-layer support:** mendukung primary + secondary on-call dalam satu schedule. Jika primary tidak acknowledge dalam N menit → eskalasi ke secondary → escalation policy berikutnya.
- **Acknowledgment:** on-call harus ack alert dalam window yang dikonfigurasi (`EscalationStep.delayMinutes`). Ack via: in-app Inbox, reply SMS, atau slash command Slack (fase lanjut).
- **Handover flow:** halaman structured handover wajib mencantumkan open incidents, hal yang sedang dimonitor, dan catatan khusus. Handover di-record di `OnCallHandover` sebagai audit trail.
- **Override:** siapapun dengan permission `oncall:override` dapat mengganti shift (liburan, sakit) — buat `OnCallShift` dengan `type: override` yang override computed shift.
- **"Who's on-call now?"** harus bisa dijawab via API dalam < 50ms — `GET /api/v1/oncall/current` adalah query panas, pertimbangkan cache Redis dengan TTL hingga shift berikutnya.
- **Notification channels untuk on-call alert:** push notification (in-app) + email sebagai default; SMS sebagai opsional (integrasi Twilio/Vonage) — dikonfigurasi per org.

### 7.20 Internal Status Page

Status Page internal memberikan visibilitas real-time health seluruh layanan IT kepada semua karyawan. Otomatis terupdate dari incident dan berubah secara manual oleh service owner/admin. Tidak publik — hanya untuk audience internal.

| Item | Spek |
|------|------|
| Routes | `/status` (main page, no-auth read untuk internal network), `/status/admin` (kelola services & incidents), `/status/incidents/[id]` (detail incident dengan updates) |
| API | `GET /api/v1/status/services` (public read, no auth required untuk internal network), `GET /api/v1/status/incidents` (ongoing & recent), `POST /api/v1/status/incidents` (buat maintenance atau declare incident di status page), `POST /api/v1/status/incidents/:id/updates` (tambah update), `PATCH /api/v1/status/services/:id/status` (manual override status) |
| Events emit | `statuspage.incident.created`, `statuspage.incident.updated`, `statuspage.incident.resolved` |
| Events consume | `incident.created` (auto-set service status ke `degraded` jika severity ≥ P2), `incident.major.declared` (auto-set ke `major_outage`), `incident.resolved` (auto-revert ke `operational`), `deployment.started` (auto-set ke `maintenance` jika dikonfigurasi) |
| Dependencies | Incident, Service (dari CMDB), Deployment |

**Catatan implementasi:**
- **Auto-update dari Incident:** link `StatusPageService` ke `Service` di CMDB. Saat incident P1/P2 dibuat dan linked ke CI/Service → status otomatis berubah. Service owner dapat override manual kapan saja.
- **Status derivation logic:** `major_outage` jika ada incident P1 aktif → `partial_outage` jika P2 aktif dan sebagian komponen → `degraded` jika P3 dan performa terpengaruh → `maintenance` jika ada deployment/maintenance window → `operational` default.
- **Maintenance window:** dapat dijadwalkan di muka via `StatusPageIncident` dengan `type: maintenance` — sync dengan Change Calendar untuk konsistensi.
- **Update cadence:** selama incident, wajib ada update minimal tiap 30 menit (bisa dikonfigurasi) — sistem reminder ke incident commander jika tidak ada update dalam window tersebut.
- **No auth untuk read** (internal network): `/status` dan `/api/v1/status/services` tidak perlu login, tapi dibatasi IP range internal (konfigurasi di proxy/infra level). Admin routes tetap perlu auth.
- **Embed widget:** sediakan embeddable widget (`<iframe>` atau JS snippet) untuk dipasang di intranet/wiki internal.
- **Histori:** tampilkan uptime history 90 hari per service (mirip statuspage.io) — data dari Availability Management (TimescaleDB).

---

## 8. Cross-Cutting Concerns

### 8.1 AuthN / AuthZ

- **AuthN:** SSO (OIDC/SAML) untuk enterprise; magic link / password sebagai fallback dev.
- **AuthZ model:**
  - **Role:** `admin`, `service-owner`, `change-manager`, `agent-l1`, `agent-l2`, `agent-l3`, `requester`, `viewer`.
  - **Scope:** per-team, per-service, per-environment.
  - **Permission matrix** didefinisikan di `packages/auth/permissions.ts` — single source of truth.

### 8.2 Audit Log

- Semua mutasi ke entitas core → `audit_logs` table.
- Schema: `who, what (entity+id), action, before, after, when, where (ip/agent), correlation_id`.
- Append-only; tidak ada UPDATE/DELETE oleh aplikasi.

### 8.3 Notification Engine

- **Channels:** email, Slack, Teams, in-app, webhook, SMS (opsional via Twilio/Vonage).
- **Routing rules:** by event type + severity + recipient role + `NotificationPreference` user.
- **Anti-noise:** dedup, digest mode, quiet hours, on-call schedule integration.
- **Dua surface in-app:**
  - **Inbox (7.16):** action-required items — engine menulis ke `InboxItem` untuk event yang butuh tindakan eksplisit.
  - **Notification Center (7.17):** notifikasi pasif — engine menulis ke `NotificationItem` untuk event informatif.
- **Decision tree routing:** setiap domain event diklasifikasi oleh engine sebagai `action_required` atau `informational`. Klasifikasi ini dikonfigurasi di tabel `NotificationRoutingRule` (event_type → surface + channels + recipients). Admin dapat mengubah klasifikasi tanpa deploy.
- **Preference check:** sebelum routing ke channel apapun, engine konsultasi `NotificationPreference` user (cache Redis max 5 menit).

### 8.4 Search

- Global search (Cmd+K) → query OpenSearch lintas entitas.
- Hasil di-rank berdasarkan recency + relevance + user role.

### 8.5 Internationalization (i18n)

- Default: Bahasa Indonesia + English. Library: `next-intl`.
- ITIL terminology di-keep dalam English (mis. "Incident", "Change") untuk konsistensi industri.

### 8.6 Accessibility

- WCAG 2.1 AA minimum.
- Komponen shadcn/ui sudah accessible — pertahankan dengan testing axe-core di CI.

### 8.7 Theming

- Light/dark/system. CSS variables via Tailwind. Brand customizable per tenant (untuk multi-tenancy fase lanjut).

---

## 9. Intelligence Layer (AI/Correlation)

Ini adalah **core differentiator** OIS.

### 9.1 Correlation Engine

Tujuan: secara otomatis menghubungkan signal lintas domain.

**Korelasi kunci yang harus didukung:**

| From | To | Trigger |
|------|----|---------| 
| Multiple raw events (same correlation key) | Collapse jadi 1 derived event | Dedup window + same CI/error signature |
| Event cluster (50 alert dari 1 outage) | Identifikasi root event | Topology-aware: traversal CI dependency dari CMDB |
| Monitoring metric breach | Auto-create Incident | Threshold rule + dedup window |
| Multiple Incidents (CI/symptom mirip) | Suggest Problem | Clustering: kesamaan CI affected + error signature + time window |
| Problem + repeated Incidents | Suggest Permanent Fix Change | Pattern detection |
| Change implemented | Watch CI for anomaly post-deploy | Statistical anomaly window 24h |
| Deployment failure | Auto-trigger Incident + suggest rollback | Webhook from CI/CD |
| SLA breach imminent | Notify service owner + raise incident priority | Real-time SLA timer |
| Incident PIR completed | Suggest Improvement Initiative | Auto-create draft di Continual Improvement Register |
| Repeated false-positive event | Suggest rule tuning | Tracking signal-to-noise per rule |
| Incident created (severity ≥ P2) | Auto-update Status Page service status | Link incident ke StatusPageService via affected CI/Service |
| Incident resolved | Auto-revert Status Page ke operational | Cek tidak ada incident aktif lain di service yang sama |
| On-call shift started tanpa ack dalam N menit | Trigger escalation step berikutnya | EscalationPolicy.steps[n].delayMinutes |

**Implementasi:**
- Rule engine config-driven (YAML atau DB-backed).
- Stream processor membaca outbox event → evaluasi rule → emit derived event.
- Hindari over-fire — semua rule wajib punya cooldown & dedup.

### 9.2 AI Service (Claude API)

Use case di v1:

1. **Incident summarization** — auto-summary dari timeline panjang (post-mortem draft).
2. **KB suggestion** — saat agent ketik incident, surface relevant articles via embedding similarity.
3. **RCA assistant** — saran 5-Whys / fishbone berdasarkan data CI + log.
4. **Standard change suggestion** — "request ini mirip 12 request sebelumnya yang low-risk → eligible standard change?"
5. **Natural language query** — "show me incidents last week affecting payment service" → translasi ke filter API.
6. **Improvement initiative drafting** — dari PIR/post-mortem, AI draft improvement initiative dengan baseline, target, dan suggested actions (user approve sebelum masuk register).
7. **Event noise classification** — AI bantu identifikasi rule yang chronic false-positive dan saran tuning.

**Constraints:**
- Setiap call AI harus loggable & auditable.
- Hasil AI **tidak pernah** auto-execute mutasi destruktif — selalu draft yang diapprove user.
- Sensitive data masking sebelum dikirim ke LLM (PII, secret, customer data).
- Model: `claude-sonnet-4-20250514` sebagai default (sesuaikan jika ada update dari Anthropic).

### 9.3 Privacy & Data Governance

- Tenant data isolation jika multi-tenant.
- Configurable: organisasi dapat opt-out dari AI features sepenuhnya.
- Retention policy per entity type (mis. resolved incident: 7 tahun, audit log: 10 tahun).

---

## 10. Build Phases & Roadmap

Mengikuti cluster dari mapping doc, dengan milestone konkret.

### Phase 0 — Foundation (Week 1–4)

- Repo setup (monorepo, CI), tooling, ADR awal.
- Auth & RBAC dasar.
- Skeleton UI (layout, nav, theme).
- Database & migration framework.

**Exit criteria:** "hello world" auth-protected page; CI hijau; satu modul placeholder ter-deploy ke staging.

### Phase 1 — CMDB Backbone + Observability (Week 5–12)

- Modul Service Configuration Management.
- Manual CI entry + import CSV.
- Relationship graph view.
- Audit log foundation.
- **Modul Monitoring & Event Management v1** — ingestion API (OTEL/Prometheus/webhook), basic threshold rules, event console, alert routing.
- Coverage report (CMDB ↔ monitoring rules).

**Exit criteria:** dapat memodelkan ≥3 service real dengan dependency, query "apa yang depends_on DB-X"; ≥1 service punya monitoring rule aktif yang firing event ke event console.

### Phase 2 — Operational Response Cluster + Platform Features (Week 13–24)

- Incident, Problem, Knowledge, Service Request.
- Notification engine v1 (email + in-app).
- Search global v1.
- **Continual Improvement Register (lightweight)** — table + CRUD, link ke incident/problem/PIR. UI lengkap menyusul di Phase 5; yang penting capture sejak awal supaya lesson learned tidak hilang.
- **Auto-create incident dari event exception** (integrasi Monitoring → Incident).
- **Inbox (7.16)** — action-required center: approval CAB, eskalasi, sign-off. Badge counter real-time via SSE.
- **Notification Center (7.17)** — passive notification feed + bell icon navbar.
- **Notification Preference Center (7.18)** — settings mute/unmute per module.
- **On-Call Management (7.19)** — schedule, rotasi, handover, eskalasi, override. Native penuh.
- **Internal Status Page (7.20)** — auto-update dari incident; manual override oleh service owner.

**Exit criteria:** service desk team dapat run end-to-end ticket lifecycle; KB punya minimal 20 artikel awal; ≥5 improvement initiative ter-register; on-call schedule aktif untuk ≥1 service; status page live dan auto-update saat incident P1/P2 dibuat.

> **Catatan timeline:** penambahan 4 platform features memperpanjang Phase 2 dari 8 minggu (week 13–20) menjadi 12 minggu (week 13–24). Total timeline proyek: 48 → **54 minggu**.

### Phase 3 — Change & Delivery Cluster (Week 25–32)

- Change, Release, Deployment, Validation & Testing.
- CI/CD webhook integration.
- Feature flag service.
- **Improvement → Change linkage** — improvement yang approved bisa generate RFC.

**Exit criteria:** satu deployment real berjalan end-to-end (RFC → CAB → release → deploy → PIR); minimal 1 improvement initiative tercapai outcome-nya via change.

### Phase 4 — Service Health Cluster (Week 33–38)

- Availability, Capacity, Continuity.
- TimescaleDB ingestion + dashboard.
- SLA timer engine.
- **Monitoring → Capacity/Availability** — metric stream dari Phase 1 sekarang feed ke modul Service Health.

**Exit criteria:** SLA tracked otomatis untuk ≥1 service; satu DR test logged.

### Phase 5 — Intelligence Layer Lengkap (Week 39–46)

- Measurement & Reporting modul lengkap.
- **Continual Improvement UI lengkap** — Kanban, Heatmap, Benefit Tracking.
- Correlation engine v1 (3–5 high-value rules: event clustering, incident → problem suggestion, dst.).
- AI features v1 (KB suggestion + incident summary + RCA assistant).

**Exit criteria:** executive dashboard live; ≥1 incident auto-correlated ke problem; AI suggestion accuracy diukur; benefit realized ≥1 improvement terverifikasi via metric actual.

### Phase 6 — Hardening & GA (Week 47–54)

- Performance tuning, load test, security audit.
- Documentation, runbook, training material.
- Rollout plan untuk pilot customer.

> **Catatan urutan:**
> 1. **Monitoring & Event Management dipasangkan dengan CMDB di Phase 1** — keduanya saling membutuhkan: monitoring rules men-target CI, dan CI tanpa monitoring adalah blind spot. Membangun keduanya bersamaan menghindari rework.
> 2. **Measurement & Reporting + Continual Improvement diinstrumentasi sejak Phase 1–2** (table + event capture), UI lengkap di Phase 5. Prinsip "*instrument early, visualize later*".
> 3. **Inbox, Notification Center, On-Call, dan Status Page masuk Phase 2** — keempatnya baru relevan secara operasional setelah Incident & Change aktif. Notification Engine v1 (Phase 2 awal) menjadi fondasi sebelum keempat surface ini dibangun.
> 4. **Total timeline: 54 minggu** (naik dari 50 minggu di V2) akibat penambahan 4 platform features di Phase 2.

---

## 11. Project Structure & Coding Standards

### 11.1 Monorepo Layout

```
ois/
├── apps/
│   ├── web/                    # Next.js app
│   ├── api/                    # NestJS backend
│   ├── worker/                 # background jobs (BullMQ)
│   └── mobile/                 # React Native (later phase)
├── packages/
│   ├── config/                 # eslint, ts, tailwind shared
│   ├── ui/                     # shadcn-based component library
│   ├── schemas/                # Zod schemas (shared FE/BE)
│   ├── auth/                   # auth utilities + permission matrix
│   ├── db/                     # Prisma schema + migrations
│   ├── events/                 # domain event types
│   └── ai/                     # Claude API client + prompt templates
├── docs/
│   ├── adr/                    # architecture decision records
│   ├── runbooks/
│   └── api/                    # generated OpenAPI
├── infra/
│   ├── docker/
│   └── k8s/
├── OIS-INSTRUCTIONS.md         # dokumen ini
├── OIS-ITIL4-Management-Practices-Mapping.md
└── README.md
```

### 11.2 Coding Standards

- **TypeScript strict mode** — `"strict": true`, `"noUncheckedIndexedAccess": true`.
- **No `any`** kecuali di-justify dengan komentar `// allow-any: <reason>`.
- **Functional preference** untuk transformations; class hanya untuk service/repository di NestJS.
- **Error handling:** custom error class hierarchy (`OISError → DomainError → NotFoundError | ConflictError | ...`); jangan throw string.
- **Async:** selalu `async/await`; hindari `.then()` chaining kecuali pipeline streaming.
- **Naming:**
  - File: `kebab-case.ts` untuk module, `PascalCase.tsx` untuk React component.
  - Function/variable: `camelCase`. Constants: `UPPER_SNAKE`.
  - Interface tanpa prefix `I` (gunakan `User`, bukan `IUser`).
- **Imports:** absolute via path alias `@ois/...`. Group: external → internal → relative.
- **Comments:** dokumentasikan **why**, bukan **what**. Code yang butuh penjelasan apa berarti perlu refactor.

### 11.3 Git Convention

- **Branching:** trunk-based + short-lived feature branch. Branch name: `<type>/<ticket>-<slug>` (e.g., `feat/OIS-123-incident-list`).
- **Commit:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`).
- **PR:** wajib ada description, screenshot/video untuk UI change, test, dan link ke ticket.
- **Merge strategy:** squash to main.

### 11.4 Definition of Done

Sebuah task dianggap done bila:

1. Code di-review minimal 1 reviewer.
2. Unit test untuk logic non-trivial (coverage target 70%+).
3. Integration/e2e test untuk flow user-facing.
4. Lint & typecheck pass.
5. Dokumentasi (di-code dan/atau di `docs/`) di-update.
6. Audit log instrumentation untuk mutation baru.
7. Tidak ada regression di staging.

---

## 12. API Design Conventions

- **Base URL:** `/api/v1` (versioning di path).
- **Auth:** Bearer token (JWT) di header `Authorization`.
- **Pagination:** cursor-based (`?cursor=...&limit=50`); response `{ data, nextCursor }`.
- **Filtering:** RHS bracket — `?status[in]=open,in_progress&severity[gte]=3`.
- **Sorting:** `?sort=-created_at,priority`.
- **Sparse fieldset:** `?fields=id,title,status`.
- **Response envelope:**
  ```json
  { "data": {...}, "meta": {...}, "errors": [...] }
  ```
- **Error format** (RFC 7807 Problem Details):
  ```json
  {
    "type": "https://ois.dev/errors/incident-not-found",
    "title": "Incident not found",
    "status": 404,
    "detail": "Incident INC-2026-00123 does not exist",
    "instance": "/api/v1/incidents/INC-2026-00123",
    "traceId": "..."
  }
  ```
- **Idempotency:** `POST` mutations wajib dukung header `Idempotency-Key`.
- **Rate limiting:** per token, per endpoint class. Response: `429` + `Retry-After`.
- **Webhook signing:** HMAC SHA-256 header `X-OIS-Signature`.

---

## 13. Testing & QA Strategy

### 13.1 Pyramid

```
        ┌────────────┐
        │    E2E     │   ~10%   (Playwright)
        ├────────────┤
        │ Integration│   ~30%   (Supertest + test DB)
        ├────────────┤
        │    Unit    │   ~60%   (Vitest)
        └────────────┘
```

### 13.2 Test Data

- **Factories** (mis. `@faker-js/faker` + custom builder per entity).
- **Seed scenario** untuk staging: minimal 1 service, 5 CI, 10 incident, 3 problem, 2 change.
- Test DB ephemeral per CI run (Docker).

### 13.3 Critical Test Scenarios (per cluster)

- **CMDB:** add CI, link relationship, query graph 3 hop.
- **Incident:** create → assign → escalate → resolve → SLA timer accuracy.
- **Change:** RFC submission → CAB approval → conflict detection.
- **Release:** promote across env, rollback.
- **Correlation:** 3 incidents pattern → suggest problem → verify suggestion.
- **AI:** mock Claude response, assert no destructive auto-action.

### 13.4 Non-Functional

- **Performance:** p95 page load < 2s, API < 300ms (excluding heavy reports).
- **Load:** 100 concurrent agent + 1000 RPM ingestion event.
- **Security:** OWASP Top 10 checklist, dependency scan (Snyk/Dependabot), secret scan.

---

## 14. DevOps & Deployment

### 14.1 Environments

| Env | Purpose | Auto-deploy |
|-----|---------|-------------|
| `local` | Developer machine via Docker Compose | n/a |
| `dev` | Shared sandbox, latest main | Otomatis dari `main` |
| `staging` | Pre-prod, mirror of prod data shape | Otomatis dari `release/*` |
| `prod` | Live | Manual approval |

### 14.2 CI Pipeline (GitHub Actions)

1. Install deps (cache)
2. Lint + typecheck
3. Unit + integration test
4. Build
5. E2E (di staging-like ephemeral env)
6. Security scan
7. Deploy (env-specific)

### 14.3 Release Process (Dogfooding)

OIS sendiri akan dipakai untuk track release-nya sendiri begitu Phase 3 selesai — *eat your own dog food*.

---

## 15. Glossarium

| Istilah | Definisi |
|---------|----------|
| **CI (Configuration Item)** | Komponen apapun yang perlu dikelola untuk menyediakan layanan IT. |
| **CMDB** | Database yang menyimpan CI dan relasinya. |
| **CAB** | Change Advisory Board — group yang me-review change. |
| **MTBF** | Mean Time Between Failures. |
| **MTTR** | Mean Time To Repair/Recover/Resolve. Definisikan secara konsisten — OIS pakai *Mean Time To Resolve*. |
| **MTRS** | Mean Time to Restore Service. |
| **RCA** | Root Cause Analysis. |
| **KEDB** | Known Error Database. |
| **SLA / SLO / SLI** | Service Level Agreement / Objective / Indicator. |
| **BIA** | Business Impact Analysis. |
| **RTO / RPO** | Recovery Time / Point Objective. |
| **RFC** | Request For Change. |
| **PIR (Post-Implementation Review)** | Review setelah change/release untuk mengevaluasi outcome — feeder utama improvement initiative. |
| **FSC** | Forward Schedule of Change. |
| **Release vs Deploy** | Release = membuat tersedia bagi user; Deploy = memindahkan komponen ke environment. |
| **Outbox pattern** | Domain event ditulis ke tabel outbox sebagai bagian transaksi DB → relayed ke message bus. |
| **Correlation engine** | Komponen yang menghubungkan signal lintas domain (event → incident → problem → change). |
| **Event (ITIL 4)** | Setiap perubahan state yang signifikan untuk manajemen layanan IT. Tipe: informational, warning, exception. |
| **Alert storm** | Kondisi banyak alert ter-fire dalam waktu singkat dari satu root cause — diatasi dengan dedup + correlation. |
| **CIR (Continual Improvement Register)** | Backlog terstruktur dari ide/inisiatif improvement, lengkap dengan owner, status, dan benefit tracking. |
| **Inbox** | Surface untuk action-required items yang memerlukan tindakan eksplisit user (approval, eskalasi, sign-off). Berbeda dari Notification Center. |
| **Notification Center** | Feed notifikasi pasif (info, update, mention, digest) yang tidak memerlukan tindakan langsung. |
| **On-Call Schedule** | Konfigurasi rotasi siapa yang bertanggung jawab merespons alert di luar jam kerja normal. |
| **On-Call Shift** | Periode spesifik di mana seorang user menjadi on-call. Bisa scheduled (dari rotasi) atau override (manual). |
| **Handover** | Serah terima tugas on-call antar shift, disertai catatan open incidents dan hal yang perlu dipantau. |
| **Escalation Policy** | Aturan bertahap: jika on-call tidak merespons dalam N menit, alert diteruskan ke step berikutnya (user/tim lain). |
| **Status Page (Internal)** | Halaman real-time yang menampilkan health seluruh layanan IT untuk audience internal (karyawan/tim IT). Bukan publik. |
| **Status Page Incident** | Entri di Status Page yang mengkomunikasikan gangguan atau maintenance kepada audience internal. Bisa linked ke Incident ITSM atau berdiri sendiri. |
| **Action-required item** | Item di Inbox yang membutuhkan respons eksplisit dari user — berbeda dari notifikasi pasif. Punya `dueAt` dan status `pending` sampai dieksekusi atau expired. |

---

## Appendix A — Referensi

- ITIL® 4 Foundation (Axelos / PeopleCert)
- ITIL® 4 Management Practices guides
- *Site Reliability Engineering* (Google)
- *Accelerate* (Forsgren, Humble, Kim) — DORA metrics sebagai inspirasi modul Measurement
- OpenTelemetry semantic conventions
- RFC 7807 (Problem Details for HTTP APIs)

---

## Appendix B — Living Document

Dokumen ini wajib di-update bila:

- Ada ADR baru.
- Stack teknologi berubah.
- Modul baru ditambah / dihapus.
- Konvensi tim berubah.

Setiap perubahan signifikan → tambah entri di section *Change Log* berikut.

### Change Log

| Versi | Tanggal | Penulis | Perubahan |
|-------|---------|---------|-----------|
| 0.1 | 2026-05-08 | Initial draft | Versi awal, generated dari OIS-ITIL4 mapping doc |
| 0.2 | 2026-05-08 | Update | Tambah 2 practice (Monitoring & Event Management, Continual Improvement) — total 15 practices. Restructure cluster (5 → 6), restructure phases (Monitoring digabung dengan CMDB di Phase 1, total timeline 48 → 50 minggu), tambah entitas data model (MonitoringRule, Event, AlertRoute, ImprovementInitiative), tambah 4 correlation rule + 2 AI use case. |
| 0.3 | 2026-05-08 | Update | Tambah 4 Platform Features: Inbox (7.16), Notification Center (7.17), Notification Preference Center (7.18), On-Call Management native (7.19), Internal Status Page (7.20). Update data model: 10 entitas baru (InboxItem, NotificationItem, NotificationPreference, OnCallSchedule, OnCallLayer, OnCallParticipant, OnCallShift, OnCallHandover, EscalationPolicy, EscalationStep, StatusPage, StatusPageService, StatusPageIncident, StatusPageUpdate). Update Notification Engine (8.3) dengan decision tree routing dan dua surface in-app. Tambah 3 correlation rule baru. Phase 2 diperpanjang 4 minggu (week 13–20 → 13–24). Total timeline: 50 → 54 minggu. |

---

*End of document.*
