# 06 — Observability

Status: **Draft**
Depends on: [`03-architecture.md`](./03-architecture.md)
Source of truth: [`server/logger.ts`](../../server/logger.ts:5), [`server/app.ts`](../../server/app.ts:60), [`server/telemetry.ts`](../../server/telemetry.ts:22), [`server/index.ts`](../../server/index.ts:12), [`server/worker.ts`](../../server/worker.ts:16), [`prisma/schema.prisma`](../../prisma/schema.prisma:605), [`server/jobs/queue.ts`](../../server/jobs/queue.ts:17)
References: [`04-error-handling.md`](./04-error-handling.md) §Error taxonomy, [`07-ops-runbook.md`](./07-ops-runbook.md)
Related: [`server/jobs/index.ts`](../../server/jobs/index.ts:10), [`docker-compose.yml`](../../docker-compose.yml:66)

Scope: Phase 1 — **pino + pino-http + OTEL scaffold** on stdout JSON. Tanpa Sentry/Datadog/Grafana eksternal (baru saat prod multi-instance). Adapted light from Terra `06-observability` (605 lines) — OIS single-repo, no `pino-roll` files, no `admin_audit_log` table yet.

---

## Design principles

1. **Structured JSON first.** Semua log JSON one-line stdout, grep/jq-friendly. `server/logger.ts:5` pino singleton; `server/jobs/queue.ts:23` `console.error` is the only exception — jobs have no `req` context.
2. **Correlation by default.** `requestId` (`x-request-id` header → `randomUUID()` fallback) injected di `pinoHttp` `genReqId` (`server/app.ts:63`) dan di-echo ke response header — trace toast UI sampai DB tanpa guess.
3. **Audit ≠ log.** State history + timeline (`AuditLog`, `CIAuditEntry`, `IncidentTimelineEvent` — `prisma/schema.prisma:325,444,605`) persistent di DB, retained forever. Log stdout = operational debug, ephemeral, level-filtered.
4. **No PII / no secrets.** Redact `req.headers.cookie`, `req.headers.authorization`, `*.passwordHash` otomatis di `server/logger.ts:10` (`censor: '[redacted]'` `logger.ts:12`). Tambah path kalau field sensitive baru muncul — jangan andalkan masking manual.
5. **Levels disiplin.** `trace/debug/info/warn/error/fatal` punya semantik tetap (lihat §Levels). `LOG_LEVEL` gate (`logger.ts:6` default `info`); `LOG_PRETTY=true` hanya dev (`logger.ts:7`).
6. **Local-first, prod-ready later.** Phase 1 cukup stdout (`docker logs`). Centralized shipper (Loki/ELK) + OTEL exporter = Phase 2 kalau multi-instance.

---

## Levels — when to use

| Level | Num | Kapan | Contoh OIS |
|-------|-----|-------|------------|
| `fatal` | 60 | Crash process, migration fail | `logger.fatal({ err }, 'DB migration failed')` — ideally never |
| `error` | 50 | 5xx, unhandled exception, DB fail | `server/app.ts:157` `logger.error({ err, path: req.path }, 'unhandled error')` |
| `warn` | 40 | 4xx expected (validation, `scope_violation`) | `server/app.ts:70` `customLogLevel: 400→warn`; 403 `scope_violation` |
| `info` | 30 | Request completed, entity created, boot | `pinoHttp` default `info` (`app.ts:71`); `[jobs] started` (`queue.ts:30`) |
| `debug` | 20 | Query detail, scheduler tick | `LOG_LEVEL=debug` (`logger.ts:6`) enable |
| `trace` | 10 | Very verbose per-session | `LOG_LEVEL=trace` per debug session |

Default: dev `info`/`debug` (`LOG_PRETTY=true` via `compose.override.yml.example:19`), prod `info` (`docker-compose.yml:66`), test `silent` (skip `pinoHttp` if `NODE_ENV=test||VITEST` `app.ts:31,60`).

```ts
// server/logger.ts:6 — level gate; server/app.ts:68 — status → level
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
customLogLevel: (_req, res, err) => {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
},
// Usage:
logger.info({ event: 'entity.created', entityId, tenantId }, 'CI created');
logger.warn({ err, path: req.path }, 'validation failed'); // 4xx → warn, not error
logger.error({ err, path: req.path }, 'unhandled error');  // app.ts:157 — only 500
logger.fatal({ err }, 'DB migration failed');
```

Anti-pattern: jangan `logger.error` untuk 4xx; jangan swallow `catch {}` tanpa `logger.warn/error`.

---

## Request correlation

Flow end-to-end (`server/app.ts:63` single source):

```
Client → [x-request-id: <uuid>] → Server
                                   ↓
                        pinoHttp genReqId (app.ts:63):
                          id = req.headers['x-request-id'] ?? randomUUID() // app.ts:64 node:crypto
                          res.setHeader('x-request-id', id)                // app.ts:65
                          return id → req.id / pino reqId
                                   ↓
                        pinoHttp auto-log { reqId, method, url, status, responseTime }
                        customLogLevel (app.ts:68) → info/warn/error
                                   ↓
                        errorHandler logger.error({ err, path }) (app.ts:157) — same reqId
                                   ↓
                        Response header x-request-id: <same uuid>
                                   ↓
Client: toast + screenshot include requestId → grep logs
```

```bash
# User melapor error, id = abc-123 (dari response header x-request-id)
docker logs ois-api 2>&1 | grep "abc-123" | jq
npm run dev:server 2>&1 | grep "abc-123"   # local LOG_PRETTY
```

Satu grep = full request timeline (incoming → scopedDb → service → response). Tanpa header dari client, server generate `randomUUID()` sehingga setiap request tetap punya ID. OIS tidak pakai `req.log = logger.child({ requestId })` seperti Terra `request-log.ts` — correlation via `pinoHttp` `reqId` otomatis; kalau butuh child logger manual: `logger.child({ requestId: req.id })`.

---

## Pino config

`server/logger.ts:5` singleton — satu source of truth:

```ts
// server/logger.ts:5
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',                          // logger.ts:6
  ...(process.env.LOG_PRETTY === 'true'                            // logger.ts:7
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }
    : {}),                                                         // logger.ts:8
  redact: {                                                        // logger.ts:10
    paths: ['req.headers.cookie', 'req.headers.authorization', '*.passwordHash'],
    censor: '[redacted]',                                          // logger.ts:12
  },
});
```

Mount di `server/app.ts:60` — skipped under tests (`isTest` `app.ts:31`):

```ts
// server/app.ts:60
if (!isTest) {
  app.use(pinoHttp({
    logger,                                                        // app.ts:62
    genReqId: (req, res) => {                                      // app.ts:63
      const id = (req.headers['x-request-id'] as string) ?? randomUUID(); // app.ts:64
      res.setHeader('x-request-id', id);                           // app.ts:65
      return id;
    },
    customLogLevel: (_req, res, err) => {                          // app.ts:68
      if (err || res.statusCode >= 500) return 'error';            // app.ts:69
      if (res.statusCode >= 400) return 'warn';                    // app.ts:70
      return 'info';                                               // app.ts:71
    },
  }));
}
```

OIS today: `LOG_PRETTY` dev-only colorize (`compose.override.yml.example:19`); redact 3 paths (`logger.ts:11`); no file rotation — stdout only (`docker logs`). Terra contrast: explicit `serializers: { err,req,res }`, multistream `app.log`+`error.log` via `pino-roll` daily 100M + 14/30-day retention — OIS defers to Phase 2.

Adding redaction — edit `server/logger.ts:11` `paths`: `['req.headers.cookie','req.headers.authorization','*.passwordHash','*.token','req.body.password']`.

---

## OTEL scaffold

`server/telemetry.ts:22` `initTelemetry()` — no-op today, vendor-free, ready to wire. Dependency hanya `@opentelemetry/api` (`package.json:29`).

```ts
// server/telemetry.ts:22
export const initTelemetry = (): void => {
  if (started) return; started = true;
  // No SDK registered — spans via getTracer() are no-ops until exporter wired.
};
// server/telemetry.ts:29
export const getTracer = (name = 'ois.server'): Tracer => trace.getTracer(name);
// server/telemetry.ts:33
export const withSpan = async <T>(name: string, fn: () => Promise<T> | T): Promise<T> => {
  const tracer = getTracer();
  return tracer.startActiveSpan(name, async (span) => {
    try { const result = await fn(); span.end(); return result; }
    catch (e) { span.recordException(e as Error); span.setStatus({ code: 2, message: (e as Error).message }); span.end(); throw e; } // telemetry.ts:42 ERROR=2
  });
};
```

Boot order — `initTelemetry()` before `createApp()` in both entries: `server/index.ts:12` → `index.ts:17` `createApp()` → `index.ts:19` `initRealtime()` → `index.ts:23` `startScheduler()`; `server/worker.ts:16` → `worker.ts:20` `startScheduler()` (worker-only).

| Area | Status | Future with `withSpan` |
|------|--------|------------------------|
| `scope` policy | Not yet | Wrap `server/scope/scopedDb.ts:195` `buildScopedDb` facades |
| `db` Prisma | Not yet | Add `@prisma/instrumentation` + `NodeSDK` instrumentations |
| `realtime` | Not yet | Wrap `server/realtime.ts:64` `emitEventCreated` etc. |
| `jobs` | Not yet | Wrap `server/jobs/index.ts:10` `sla-breach-detector` `fn` |

How to enable (per `telemetry.ts:10` header): `npm i @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/auto-instrumentations-node` → replace body of `initTelemetry()` (`telemetry.ts:22`) with `new NodeSDK({ traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }), instrumentations: [getNodeAutoInstrumentations()] }); sdk.start();` → `OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318/v1/traces npm run server`. Until then `trace.getTracer()` is no-op — safe to sprinkle `withSpan` today.

---

## Audit vs Log — persistent vs operational

| Aspect | DB Audit / Timeline | Pino log |
|--------|---------------------|----------|
| Store | Postgres table (`prisma/schema.prisma`) | stdout JSON (ephemeral) |
| Retention | Forever (append-only; indexed) | Process lifetime / `docker logs` |
| Query | Prisma `findMany`, filtered `tenantId` | `grep`/`jq` on log stream |
| Purpose | Compliance, "who changed what when" | Debug, perf, error forensics |

**Three DB models — not interchangeable:**

- `AuditLog` `schema.prisma:605` — cross-cutting (any resource): `tenantId, actorId, action, resourceKind, resourceId, before/after JSON, ip, userAgent, scopeMode, createdAt` + indexes `(tenantId,resourceKind,resourceId)` + `(tenantId,createdAt)` (`schema.prisma:620`).
- `CIAuditEntry` `schema.prisma:325` — CMDB field-level: `tenantId, ciId, ciPublicId, ciName, action, actorId/Name/Type, field, beforeValue/afterValue JSON, source, description, timestamp` + `@@index([tenantId, ciId])` + `@@index([tenantId, timestamp])` (`schema.prisma:343`).
- `IncidentTimelineEvent` `schema.prisma:444` — incident narrative: `tenantId, incidentId, kind, timestamp, data JSON` + `@@index([tenantId, incidentId])` (`schema.prisma:453`).

**Cheat sheet — where does it go?**

| Event | Pino | DB table |
|-------|:----:|:--------:|
| HTTP request finished | ✅ `info` via pinoHttp | ❌ |
| Validation 400 | ✅ `warn` (`app.ts:70`) | ❌ |
| CI updated | ✅ `info` | ✅ `CIAuditEntry` (`schema.prisma:325`) |
| Incident status changed | ✅ `info` | ✅ `IncidentTimelineEvent` (`schema.prisma:444`) |
| Role / permission change | ✅ `info` | ✅ `AuditLog` (`schema.prisma:605`) |
| Scheduled job ran | ✅ `[job:name]` (`queue.ts:23/30`) | ❌ |
| 5xx unhandled | ✅ `error` (`app.ts:157`) | ❌ |

Minimal Phase 1: tables exist in schema but write paths are M5 incremental — log always, DB audit when action is user-attributable.

---

## Jobs logging + Health signals

`server/jobs/queue.ts:17` in-process polling (no Redis; BullMQ is M7.x future):

```ts
// server/jobs/queue.ts:17
export const startScheduler = () => {
  for (const j of jobs) {
    const run = async () => {
      try { await j.fn(); }
      catch (e) { console.error(`[job:${j.name}] error:`, e); } // queue.ts:23 — console, not pino (no req context)
    };
    void run(); timers.push(setInterval(run, j.intervalMs));    // queue.ts:27
  }
  console.log(`[jobs] started ${jobs.length} job(s)`);         // queue.ts:30
};
```

- `server/jobs/index.ts:10` `sla-breach-detector` every `60_000ms` — batch 100, skip `resolved/closed`, set `slaResolveStatus: 'breached'`. Future: `withSpan('job.sla-breach-detector', fn)` for duration.
- `API_ONLY=true` (`server/index.ts:23`) skips scheduler on API node; `npm run start:worker` (`package.json:11`) owns it in prod split.

| Signal | Path | Source | Dipakai oleh |
|--------|------|--------|--------------|
| Uptime | `GET /health` | `server/app.ts:105` `uptime: process.uptime()` | LB liveness, `Dockerfile:73` HEALTHCHECK |
| Live | `GET /live` | `server/app.ts:108` | Process check |
| DB reachable | `GET /ready` | `server/app.ts:109` `prisma.$queryRaw`SELECT 1`` → 503 | K8s readiness |
| Logs | stdout pino JSON | `server/logger.ts:5` | `docker logs`, future Loki |
| Jobs heartbeat | stdout `[jobs] started` | `server/jobs/queue.ts:30` | `docker logs` grep `job:` |

---

## What we don't do yet (deferred)

| Tool | Why deferred | Trigger to revisit |
|------|--------------|--------------------|
| **Sentry / error tracking** | Phase 1 single-process; `logger.error` + `docker logs` cukup (`app.ts:157` only 500 path) | Prod multi-instance or >50 daily 5xx needing aggregation |
| **Datadog / APM** | OTEL scaffold ready but no collector (`telemetry.ts:22` no-op) — avoid vendor lock-in | Need p95 latency / trace waterfall across `scope→db→realtime` |
| **Centralized shipper (Loki/ELK)** | stdout suffices for dev + early prod; `pino-roll` not needed yet | Prod multi-instance log fan-in or 14-day retention |
| **Metrics (Prom/Grafana)** | Derive via `jq 'select(.status>=500)'` ad-hoc | >5 active tenants or SLA reporting |
| **Frontend client-error endpoint** | `console.error` + ErrorBoundary only | Need server aggregation for UI errors |
| **Slow-query log (>500ms)** | Prisma hook not wired | Query p95 exceeds 500ms in prod |

Terra has daily `pino-roll` files + 14/30-day retention + `admin_audit_log` forever — OIS defers files (stdout) and keeps "audit forever" for `AuditLog`/`CIAuditEntry`/`IncidentTimelineEvent`.

---

## Open Items

- [ ] Centralized log shipper (Loki/ELK) untuk prod multi-instance — stdout → collector sidecar.
- [ ] OTEL exporter ke collector (Jaeger/Tempo) — wire `server/telemetry.ts:22` `NodeSDK` + `OTEL_EXPORTER_OTLP_ENDPOINT`.
- [ ] `AuditLog` retention — append-only, indexes `(tenantId,resourceKind,resourceId)` + `(tenantId,createdAt)` (`schema.prisma:620`); perlu archive policy kalau growth >1M rows.
- [ ] Jobs observability — `server/jobs/queue.ts:23` `console.error` → `logger.error` + `withSpan('job.*')` + duration histogram.
- [ ] Redaction coverage audit — `server/logger.ts:11` hanya 3 paths today; audit `req.body.password`, `token`, `secret` kalau endpoint baru expose them.
- [ ] Frontend error capture — POST `/api/logs/client-error` + server aggregate (Phase 2).
- [ ] Per-request `req.log` child logger — evaluate `logger.child({ requestId: req.id })` vs pinoHttp `reqId` only.

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| Pino + pino-http over Winston/Bunyan | JSON structured, redaction built-in, fast (`server/logger.ts:5`, `server/app.ts:60`) | M5 |
| `x-request-id` echo (`app.ts:63`) | Trace dari toast UI ke log tanpa guess; `randomUUID()` fallback guarantees ID | M5 |
| OTEL scaffold early (`server/telemetry.ts:22`) | Vendor-free (`@opentelemetry/api` only `package.json:29`); siap trace tanpa refactor | M5 |
| Test silent (`app.ts:31` `isTest` guard) | `NODE_ENV=test||VITEST` skip `pinoHttp` → clean test output | M5 |
| `LOG_PRETTY=true` dev only (`logger.ts:7`) | `pino-pretty` colorize dev (`compose.override.yml.example:19`); prod `LOG_LEVEL=info` (`docker-compose.yml:66`) | M5 |
| `console.error` for jobs (`queue.ts:23`) | Jobs have no `req` context; temp until `logger` + `withSpan` wired | M5 |
| No `pino-roll` files (Terra contrast) | OIS single-repo demo; stdout via `docker logs` suffices; defer rotation to Phase 2 | M5 |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init observability — pino levels + x-request-id + OTEL scaffold | `server/logger.ts:5`, `server/app.ts:60` |
| 2026-08-28 | Deepen — principles, levels+snippet, correlation flow, pino config, OTEL enable, Audit vs Log (3 models), jobs+health, defer Sentry/Datadog | `server/telemetry.ts:22`, `prisma/schema.prisma:605`, `server/jobs/queue.ts:17` |
