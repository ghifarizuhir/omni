# 02 — API Contract

Status: **Draft**
Depends on: [`01-erd.md`](./01-erd.md)
Source of truth: [`server/app.ts`](../../server/app.ts) (`createApp:33`, `requireAuth:126`, `errorHandler:144`, `health:105`), [`server/middleware/auth.ts`](../../server/middleware/auth.ts) (`requireAuth:43`, `requirePermission:48`, `sessionMiddleware:23`, `resolveSession`), [`server/middleware/scopedDb.ts`](../../server/middleware/scopedDb.ts) (`withScopedDb:19`, `req.scoped:14`), [`server/scope/errors.ts`](../../server/scope/errors.ts) (`ScopeViolationError:9`), [`server/util.ts`](../../server/util.ts) (`HttpError:3`, `qString:34`), [`server/routes/`](../../server/routes/) (mounted at `/api/v1:138`), [`eslint.config.js`](../../eslint.config.js) (`no-restricted-imports:36`, `exemptions:22`), [`prisma/schema.prisma`](../../prisma/schema.prisma) (resource kinds), [`vite.config.ts`](../../vite.config.ts) (`proxy:29`)
References: [`03-architecture.md`](./03-architecture.md), [`09-realtime.md`](./09-realtime.md) (Socket.IO), [`01-erd.md`](./01-erd.md) (tenant scope)

---

## Design principles

1. **Cookie session, not JWT bearer.** `server/middleware/auth.ts:23` `sessionMiddleware` resolves `Session` cookie via `resolveSession`; `server/app.ts:89` sets it globally. `AUTH_REQUIRED=false` pins to `tenant-demo` admin (dev only). Light tokens — OIS does not use Terra's `packages/contracts` / `packages/sdk` JWT+DPoP stack.
2. **Global gate before scope.** `server/app.ts:126` `api.use(requireAuth)` guarantees `req.tenantId`/`req.permissions` before any resource router. Without it `tenantId=undefined` → Prisma no-filter → cross-tenant leak.
3. **`req.scoped.*` is the only DB path.** `server/middleware/scopedDb.ts:19` `withScopedDb` injects `ScopedDb` from `resolveScopeContext`. `eslint.config.js:36` bans `from '../db'` / `@prisma/client` in `server/routes/**/*.ts:21`.
4. **Permission per verb.** `server/middleware/auth.ts:48` `requirePermission('cmdb.write')` layers on top of `requireAuth`. `server/scope/errors.ts:9` `ScopeViolationError` → `server/app.ts:144` `403 { error:'scope_violation' }`.
5. **Zod at the edge.** Route parses `schema.parse(req.body)`; `issues` → `server/app.ts:153` `400 { message:'Validation failed', issues }`. Shared schemas under `src/shared/schemas/` reuse across client/server.

---

## Base

- **Prefix:** `/api/v1` — `server/app.ts:138` `app.use('/api/v1', api)`. `vite.config.ts:29` proxies `/api → VITE_API_PROXY_TARGET ?? http://localhost:3001:31` with `changeOrigin:true:32`. Frontend sets `VITE_API_BASE_URL=/api/v1`.
- **Auth:** cookie session (`server/middleware/auth.ts:23` `sessionMiddleware`, `server/auth/session.ts` `getSessionIdFromRequest`/`createSession`/`setSessionCookie`). Every route under `/api/v1` behind `requireAuth` (`server/app.ts:126`) except `authRouter` mounted before gate (`server/app.ts:120`). Missing session → `HttpError 401` via `server/middleware/auth.ts:43`.
- **Scope:** `withScopedDb` (`server/middleware/scopedDb.ts:19`) runs after `sessionMiddleware` (`server/app.ts:89-90`). Attaches `req.scoped: ScopedDb` + resolves `req.tenantId`/`req.permissions` (`server/middleware/auth.ts:28-29` `permissionsForRoleIds`). Unauthenticated → stub `buildScopedDb({ tenantId:'', userId:'' })` (`scopedDb.ts:27`) so `requireAuth` 401 before handler runs.
- **Lint rule:** `eslint.config.js:21` `files: ['server/routes/**/*.ts']` + `no-restricted-imports:37` bans `../db` + `@prisma/client`. Exempt list `eslint.config.js:22` (`admin.ts`, `admin/dataQuality.ts`, `admin/applicationMembership.ts`, `applications.ts`, `platform.ts`, `auth.ts`, `integrations.ts`) — see §Exemptions.
- **Rate limits:** `server/app.ts:81` `authLimiter 20/min` (test `1000:83`) on `/api/v1/auth/`, `server/app.ts:95` `tenantLimiter 600/min` (test `10000:97`, env `TENANT_RATE_LIMIT`) keyed by `req.tenantId ?? ipKeyGenerator:100`.
- **Errors:** `server/app.ts:144` `errorHandler` maps `ScopeViolationError→403 toJSON():22`, `HttpError→status body:149`, `issues→400:153`, unknown → `500 + logger.error:157`. `server/app.ts:140` unmatched `/api/v1` → `404 { message:'Not found' }`. 404 fallback is after all routers.

---

## Health

Unauthenticated, no rate-limit beyond global. `server/app.ts:105` `app.get` before `api` router.

| Method | Path | Auth | Check | Status | Source |
|--------|------|------|-------|--------|--------|
| GET | `/health` | no | `{ status:'ok', uptime: process.uptime() }` | 200 | `server/app.ts:105` |
| GET | `/live` | no | `{ status:'ok' }` | 200 | `server/app.ts:108` |
| GET | `/ready` | no | `prisma.$queryRaw SELECT 1 → 200 ok / 503 degraded` | 200/503 | `server/app.ts:109` |

---

## Auth (public sub-router, before `requireAuth`)

`server/routes/auth.ts:10` `authRouter` mounted at `server/app.ts:120` `api.use(authRouter)` — handles own 401. Rate-limited `authLimiter 20/min` (`server/app.ts:81`).

| Method | Path | Auth | Permission | Zod schema | Notes |
|--------|------|------|------------|------------|-------|
| POST | `/api/v1/auth/login` | no | — | `loginSchema { email, password }:12` | `prisma.user.findUnique:19` + `verifyPassword:21`; `tenantMembership.findFirst:26` picks first tenant; `createSession+setSessionCookie:29` returns `{ user, tenantId, roles, roleNames }` |
| POST | `/api/v1/auth/logout` | no | — | — | `getSessionIdFromRequest+destroySession:41` + `clearSessionCookie`; `204` |
| GET | `/api/v1/auth/me` | cookie* | — | — | `require session:47`; returns `{ user, tenantId, roles, roleNames, permissions[]:55 }`; 401 if no session |
| POST | `/api/v1/auth/change-password` | cookie | — | `changePasswordSchema { currentPassword, newPassword min 8 }:59` | `409` if same password:69; `destroySession+createSession:82` rotates session; `204` |

*`auth/me` and `change-password` check `req.session` inside handler (public router before `requireAuth:126`).

---

## Resource routers inventory (all behind `requireAuth:126` unless noted)

All tenant-scoped. Detail routes resolve `publicId → id` internally; write path throws `ScopeViolationError:9` → `403`. Pagination via `server/lib/pagination.ts:6` `parsePagination({ limit/take/offset/skip })` → `DEFAULT 50:1`, `MAX 200:2`, `hasMore:14`.

### cmdb — `server/routes/cmdb.ts:9`

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/cis` | `cmdb.read` | — | `req.scoped.cmdb.listCIs(pagination):15` |
| GET | `/api/v1/cis/relationships` | `cmdb.read` | — | `listRelationships(pagination):20` |
| GET | `/api/v1/cis/audit` | `cmdb.audit.read` | `qString(ciId):26` | `listAudit(ciId, pagination)` |
| GET | `/api/v1/cis/:publicId` | `cmdb.read` | — | `getCI(publicId):30` → `required 404` |
| GET | `/api/v1/cis/:ciId/relationships` | `cmdb.read` | — | `listRelationshipsForCI(ciId):35` |
| PATCH | `/api/v1/cis/:publicId` | `cmdb.write` | `updateCISchema src/shared/schemas/ci:6` | `updateCI:42` + `audit update:44` → audit `before/after` |
| GET | `/api/v1/services` | `service.read` | — | `servicesRepo.list(tenantId):57` (Document-backed, not scoped repo) |
| GET | `/api/v1/services/:id` | `service.read` | — | `servicesRepo.get(tenantId,id):61` |

### events — `server/routes/events.ts:13`

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/events` | `event.read` | `qStringArray(status,severities):25` | `scoped.events.list({status,severities,ruleId}, pagination)` + severity+date sort:31; tenant-filtered |
| GET | `/api/v1/events/dashboard-stats` | `event.read` | — | `dashboardStats():40` |
| GET | `/api/v1/events/:publicId` | `event.read` | — | `get(publicId):44` |
| PATCH | `/api/v1/events/:publicId/status` | `event.write` | `setEventStatusSchema src/shared/schemas/event:9` | `setStatus({status,actorId,note}):55` + audit `status_change:61` |
| POST | `/api/v1/events/ingest` | `event.write` | `ingestSchema { type,severity,title,message,source,payload,tags…}:78` | `ingest:101` + `emitEventCreated Socket.IO:118` (not SSE); `201`; see `09-realtime.md` |

### incidents — `server/routes/incidents.ts:20`

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/incidents` | `incident.read` | `qBool(active,major) qString(ciId,problemPublicId):32` | `scoped.incidents.list(filters,pagination):30` |
| GET | `/api/v1/incidents/:publicId` | `incident.read` | — | `get(publicId):43` |
| GET | `/api/v1/incidents/:incidentId/comments` | `incident.read` | — | `comments(incidentId,pagination):48` |
| GET | `/api/v1/incidents/:incidentId/timeline` | `incident.read` | — | `timeline(incidentId,pagination):52` |
| POST | `/api/v1/incidents/:incidentId/comments` | `incident.write` | `addIncidentCommentSchema:9` | `addComment({body,isInternal,mentions,author}):64` + `audit comment:72`; `201` |
| PATCH | `/api/v1/incidents/:publicId/status` | `incident.write` | `setIncidentStatusSchema:10` | `status≠resolved:89`; `setStatus:93` + audit `status_change:98` |
| POST | `/api/v1/incidents/:publicId/resolve` | `incident.resolve` | `resolveIncidentSchema:8` | `resolve({summary,rootCause,workaround,resolvedBy}):116` + audit `resolve:123` |
| POST | `/api/v1/incidents/:publicId/promote-major` | `incident.write` | `promoteMajorSchema:11` | `promoteMajor:142` + audit `promote_major:148` |
| POST | `/api/v1/incidents/:publicId/stand-down` | `incident.write` | `standDownIncidentSchema:16` | `standDown({actorId,reason,newPriority}):167` + audit `stand_down:174` |
| POST | `/api/v1/incidents/:publicId/comms` | `incident.write` | `postCommsSchema:17` | `postComms({audience,message,channels}):193` + audit `comms_posted:200`; `201` |
| PATCH | `/api/v1/incidents/:publicId` | `incident.write` | `updateIncidentSchema:15` | `update({priority,tags}):219` + audit `update:224` |
| PATCH | `/api/v1/incidents/:publicId/assign` | `incident.write` | `assignIncidentSchema:12` | `assign({assigneeId,assigneeName}):243` + audit `assign:249` |
| PATCH | `/api/v1/incidents/:publicId/links` | `incident.write` | `updateIncidentLinksSchema:13` | `setLinks({affectedCIIds,linkedProblemId,linkedChangeIds}):267` + audit `update_links:274` |
| POST | `/api/v1/incidents/:incidentId/watchers` | `incident.write` | `addWatcherSchema:14` | `addWatcher:293` idempotent; `201` if new else `200`; audit if `wasNew:299` |
| DELETE | `/api/v1/incidents/:incidentId/watchers/:userId` | `incident.write` | — | `removeWatcher:321` + audit `remove_watcher:327`; `204` |

### monitoring — `server/routes/monitoring.ts:13`

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/monitoring/rules` | `rule.read` | — | `scoped.monitoring.listRules(pagination):22` |
| GET | `/api/v1/monitoring/rules/:publicId` | `rule.read` | — | `getRule(publicId):26` |
| GET | `/api/v1/monitoring/routes` | `rule.read` | — | `listRoutes(pagination):29` |
| GET | `/api/v1/monitoring/routes/:publicId` | `rule.read` | — | `getRoute(publicId):32` |
| POST | `/api/v1/monitoring/routes` | `rule.write` | `createAlertRouteSchema:7` | `createRoute:44` + audit `create:45`; `201` |
| PATCH | `/api/v1/monitoring/routes/:publicId` | `rule.write` | `updateAlertRouteSchema:7` | `updateRoute:61` + audit `update:63` |
| DELETE | `/api/v1/monitoring/routes/:publicId` | `rule.write` | — | `deleteRoute:79` + audit `delete:81`; `204` |
| POST | `/api/v1/monitoring/rules` | `rule.write` | `createMonitoringRuleSchema:9` | `createRule:102` + `ALERT_ROUTE_NOT_FOUND→400:104`; `201` |
| PATCH | `/api/v1/monitoring/rules/:publicId` | `rule.write` | `updateMonitoringRuleSchema:10` | `updateRule:127` + `400` unknown route |
| DELETE | `/api/v1/monitoring/rules/:publicId` | `rule.write` | — | `deleteRule:151`; `204` |

### itsm — `server/routes/itsm.ts:22` (problems / changes / releases / deployments / requests / improvements / kb)

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/problems` | `problem.read` | — | `scoped.problems.list(pagination):32` |
| GET | `/api/v1/problems/:publicId` | `problem.read` | — | `scoped.problems.get(publicId):35` |
| GET | `/api/v1/changes` | `change.read` | — | `scoped.changes.list(pagination):39` |
| GET | `/api/v1/changes/:publicId` | `change.read` | — | `scoped.changes.get(publicId):42` |
| POST | `/api/v1/changes` | `change.write` | `createChangeSchema {title,type,risk,impact,plannedStart…}:48` | `scoped.changes.create(actor,body):66` + audit `create:67`; `201` |
| PATCH | `/api/v1/changes/:publicId/cancel` | `change.write` | `cancelChangeSchema {reason}:71` | `cancel:75` → `409` if closed |
| PATCH | `/api/v1/changes/:publicId/reschedule` | `change.write` | `rescheduleChangeSchema src/shared/schemas/change:17` | `reschedule(body,actor):90` → `409` if closed |
| PATCH | `/api/v1/changes/:publicId/tech-assessment` | `change.write` | `techAssessmentSchema {status,objective,risks…}.passthrough():106` | `setTechnicalAssessment:121` + audit `update:124` |
| GET | `/api/v1/releases` | `release.read` | — | `scoped.releases.list(pagination):134` |
| GET | `/api/v1/releases/:publicId` | `release.read` | — | `scoped.releases.get(publicId):138` |
| GET | `/api/v1/deployments` | `deployment.read` | `qBool(active):143` | `deploymentsRepo.list vs active(tenantId):144` |
| GET | `/api/v1/deployments/:publicId` | `deployment.read` | — | `deploymentsRepo.get(tenantId,publicId):148` |
| GET | `/api/v1/deployments/:deploymentId/logs` | `deployment.read` | — | `deploymentsRepo.logs(tenantId,deploymentId):152` |
| GET | `/api/v1/environments` | `deployment.read` | — | `listByKind('environment'):156` Document |
| GET | `/api/v1/requests` | `request.read` | — | `scoped.serviceRequests.list(pagination):160` |
| GET | `/api/v1/requests/:publicId` | `request.read` | — | `scoped.serviceRequests.get(publicId):163` |
| GET | `/api/v1/requests/:publicId/comments` | `request.read` | — | `listComments(publicId,pagination):170` (verifies existence first) |
| GET | `/api/v1/catalog` | `request.read` | — | `catalogRepo.list(tenantId):173` |
| POST | `/api/v1/requests/:publicId/steps/:stepId/approve` | `request.write` | `approveSchema {note?}:179` | `decideStep approved:186` → `404/409` |
| POST | `/api/v1/requests/:publicId/steps/:stepId/reject` | `request.write` | `rejectSchema {note}:180` | `decideStep rejected:186` |
| POST | `/api/v1/requests/:publicId/comments` | `request.write` | `requestCommentSchema {body}:217` | `appendComment(publicId,actor,body):225` + audit `comment:227`; `201` |
| PATCH | `/api/v1/requests/:publicId/cancel` | `request.write` | `cancelRequestSchema src/shared/schemas/request:19` | `cancel(reason,actor):248` → `409` closed |
| PATCH | `/api/v1/requests/:publicId/steps/:stepId/reassign` | `request.write` | `reassignRequestStepSchema:19` | `reassignStep:271` → `409` not-active |
| POST | `/api/v1/requests/:publicId/watchers` | `request.write` | `addRequestWatcherSchema:19` | `addWatcher:299` idempotent `201/200`; audit if `wasNew:303` |
| DELETE | `/api/v1/requests/:publicId/watchers/:userId` | `request.write` | — | `removeWatcher:325`; `204` |
| GET | `/api/v1/improvements` | `improvement.read` | — | `listByKind('improvement'):346` Document |
| GET | `/api/v1/improvements/totals/estimated` | `improvement.read` | — | computed `Σ annualValueUSD:350` |
| GET | `/api/v1/improvements/totals/actual` | `improvement.read` | — | computed `Σ actualBenefit:353` |
| GET | `/api/v1/improvements/benefit-measurements` | `improvement.read` | — | `listByKind('benefit-measurement'):358` |
| POST | `/api/v1/improvements/benefit-measurements` | `improvement.write` | inline schema `{initiativeId,measurementDate,benefitType,measuredValueUSD…}:361` | `upsertDocument('benefit-measurement'):374` + audit `create:375`; `201` |
| GET | `/api/v1/improvements/roi` | `improvement.read` | — | `listByKind('roi-calc'):380` |
| GET | `/api/v1/improvements/:initiativeId/roi` | `improvement.read` | — | find by `initiativeId:383` |
| GET | `/api/v1/improvements/:publicId` | `improvement.read` | — | `findByPublicId else findByKey:388` |
| GET | `/api/v1/kb/articles` | `kb.read` | — | `kbRepo.list(tenantId,pagination):396` |
| GET | `/api/v1/kb/articles/:publicId` | `kb.read` | — | `kbRepo.get(tenantId,publicId):399` |
| POST | `/api/v1/kb/articles` | `kb.write` | `createKBArticleSchema:15` | `kbRepo.create(tenantId,author,body):411` + audit `create:412`; `201` |
| PATCH | `/api/v1/kb/articles/:publicId` | `kb.write` | `updateKBArticleSchema:15` | `kbRepo.update:418` |
| PATCH | `/api/v1/kb/articles/:publicId/status` | `kb.write` | `setKBArticleStatusSchema:15` | `kbRepo.setStatus:430` → `400` same/terminal |

### availability + capacity — `server/routes/availability.ts:10`, `server/routes/capacity.ts:10` (Document-backed)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/v1/availability/outages` | `availability.read` | `listByKind('outage'):14` |
| GET | `/api/v1/availability/sla-targets` | `availability.read` | `listByKind('sla-target'):18` |
| GET | `/api/v1/availability/sla-breaches` | `availability.read` | `listByKind('sla-breach'):22` + `qBool(active)` |
| GET | `/api/v1/availability/daily-health` | `availability.read` | `listByKind('daily-health'):27` |
| GET | `/api/v1/availability/series` | `availability.read` | `listByKind('availability-series'):31` |
| GET | `/api/v1/capacity/metrics` | `capacity.read` | `listByKind('capacity-metric'):20` + `qBool(critical) isCritical:16` |
| GET | `/api/v1/capacity/thresholds` | `capacity.read` | `listByKind('capacity-threshold'):25` |
| GET | `/api/v1/capacity/forecasts` | `capacity.read` | `listByKind('capacity-forecast'):29` + `metricId/imminent 14d:30` |
| GET | `/api/v1/capacity/time-series` | `capacity.read` | `listByKind('capacity-time-series'):42` + `metricId` |
| GET | `/api/v1/capacity/recommendations` | `capacity.read` | `listByKind('scaling-rec'):48` + `qBool(open)` |

### integrations — `server/routes/integrations.ts:9` (exempt)

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/v1/integrations` | `integration.read` | `integrationsRepo.list(tenantId):12` + `?domain filter:14` |
| GET | `/api/v1/integrations/stats` | `integration.read` | computed `total/enabled/healthy/needsAttention/events24h:22` |
| GET | `/api/v1/integrations/:id` | `integration.read` | `integrationsRepo.get(tenantId,id):36` |
| POST | `/api/v1/integrations` | `integration.write` | `prisma.integration.create:41` + audit `integration.create:47`; `201`; uses `prisma` (exempt) |
| PATCH | `/api/v1/integrations/:id` | `integration.write` | `prisma.integration.update:56` + audit `integration.update:60` |
| DELETE | `/api/v1/integrations/:id` | `integration.write` | `prisma.integration.deleteMany:65` + audit; `204` |

### platform — `server/routes/platform.ts:16` (exempt, Document-heavy)

Path-prefix guards `platformRouter.use('/users', requirePermission('user.read')):22` etc. All inherit those.

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| GET | `/api/v1/users`, `/users/me`, `/users/:id` | `user.read` | `prisma.user.findMany:37` / `findUnique+team/division/manager:47` → `required 404` |
| PATCH | `/api/v1/users/me` | `user.read` | whitelist `name/title/bio/timezone/language:78`; 400 empty name |
| GET/POST | `/api/v1/users/me/tokens` | `user.read` | `prisma.apiToken.findMany revokedAt null:116` / `randomBytes→ois_…:132`+`sha256:133`; `201` |
| DELETE | `/api/v1/users/me/tokens/:id` | `user.read` | soft revoke `revokedAt:156`; `204` |
| GET | `/api/v1/users/me/channels` | `user.read` | `prisma.notificationChannel.findMany:164` |
| PUT | `/api/v1/users/me/channels/:kind` | `user.read` | `kind∈email|sms|slack:112`; `upsert:182` |
| GET | `/api/v1/teams`, `/teams/:id` | `user.read` | `listByKind('team'):203` / `findByKey('team'):206` |
| GET | `/api/v1/notifications`, `/preferences`, `/quiet-hours` | `notification.read` | `listByKind('notification'):211` / `('notification-pref'):214` / `firstByKind('quiet-hours'):217` |
| GET | `/api/v1/inbox`, `/inbox/items` | `inbox.read` | `listByKind('inbox-legacy'):222` / `('inbox-item'):225` |
| GET | `/api/v1/on-call/schedules`, `/overrides` | `oncall.read` | `listByKind('on-call-schedule'):230` / `('on-call-override'):233` |
| GET | `/api/v1/kb/categories`, `/kb/feedback`, `/kb/analytics` | `kb.read` | `listByKind('kb-category'):238` / `('kb-feedback'):241`+`?articleId` / `firstByKind('kb-analytics'):246` |
| GET | `/api/v1/testing/plans`, `/cases`, `/runs`, `/sign-offs` | `testing.read` | `listByKind('test-plan'):251` / `('test-case'):254`+`?planId` / `('test-run'):259`+`?active` / `('sign-off'):263` |
| GET | `/api/v1/status-page/entries`, `/incidents` | `statuspage.read` | `listByKind('status-page-entry'):268` / `('status-page-incident'):271` |
| GET | `/api/v1/ai/sessions`, `/active`, `/:id` | `ai.read` | `listByKind('ai-session'):276` / `sorted updatedAt desc:281` / `findByKey:285` |
| GET/POST | `/api/v1/ai/sessions/:id/messages` | `ai.read` | `prisma.aiMessage.findMany asc:289` / `create user+assistant stub:298`; `201` |
| GET | `/api/v1/rbac/users|teams|applications|divisions|roles` | `rbac.read` | `listRbacUsers:309` / `listTeams:310` / `listApplications:311` / `listDivisions:313` / `listFunctionalRoles:314` |
| GET | `/api/v1/continuity/dr-plans|dr-runs|bia` | `continuity.read` | `listByKind('dr-plan'):317` / `('dr-run'):318` / `('bia'):319` |
| GET/POST | `/api/v1/measurement/*` | `measurement.read` | `listByKind('report'):322` / `prisma.document.create kind=report:359`; `201` / `('roi-calc'):324` / `('benefit-measurement'):325` / `('measurement-dashboard'):326` / `('metric-def'):327` / `exec-summary change%+major count:332` |

### admin — `server/routes/admin.ts:25` (exempt, `system.admin` gate)

`adminRouter.use('/admin', requirePermission('system.admin')):32` — path-prefixed so it does not gate sibling routers (`server/routes/admin.ts:27` comment). `admin/dataQuality.ts:3` mounted at `/admin/data-quality:33`.

| Method | Path | Permission | Zod schema | Notes |
|--------|------|------------|------------|-------|
| GET | `/api/v1/admin/tenants` | `system.admin` | — | `prisma.tenant.findMany:36` |
| GET | `/api/v1/admin/users` | `system.admin` | — | `prisma.user.findMany+flatten membership roles:40` |
| GET | `/api/v1/admin/audit` | `system.admin` | `qString(resourceKind,resourceId):69` | `prisma.auditLog.findMany take 200:71` |
| GET | `/api/v1/admin/permissions` | `system.admin` | — | `prisma.permission.findMany order key asc:86` |
| GET | `/api/v1/admin/roles` | `system.admin` | — | `prisma.role.findMany OR tenantId null\|tenantId:119` + serialize `permissions+memberCount:124` |
| POST | `/api/v1/admin/roles` | `system.admin` | `createRoleSchema {name,description,permissions[]}:127` | `assertPermissionsExist:135` + audit `create:146`; `201` |
| GET | `/api/v1/admin/roles/:id` | `system.admin` | — | `loadRoleForTenant:151` (null tenant = system) |
| PATCH | `/api/v1/admin/roles/:id` | `system.admin` | `updateRoleSchema:155` | `403` if `isSystem:163`; transaction replace `RolePermission:168`; `invalidatePermissionCache:187` |
| DELETE | `/api/v1/admin/roles/:id` | `system.admin` | — | `409` if assigned `memberships>0:199`; `invalidate cache:202` |
| PUT | `/api/v1/admin/memberships/:id/roles` | `system.admin` | `assignRolesSchema {roleIds max 32}:209` | validate `role ∈ system\|tenant:226`; transaction delete+createMany `MembershipRole:238`; `204` |
| PUT | `/api/v1/admin/rbac/divisions/:id` | `system.admin` | `divisionSchema lib/validation/rbac:20` | `upsertDivision(tenantId,id,input):264` + audit `upsert:265` |
| DELETE | `/api/v1/admin/rbac/divisions/:id` | `system.admin` | — | `deleteDivision:269`; `204` |
| PUT | `/api/v1/admin/rbac/departments/:id` | `system.admin` | `departmentSchema:20` | `upsertDepartment:276` |
| DELETE | `/api/v1/admin/rbac/departments/:id` | `system.admin` | — | `deleteDepartment:281` |
| PUT | `/api/v1/admin/rbac/teams/:id` | `system.admin` | `teamSchema:20` | `upsertTeam:288` |
| DELETE | `/api/v1/admin/rbac/teams/:id` | `system.admin` | — | `deleteTeam:293` |
| PUT | `/api/v1/admin/rbac/applications/:id` | `system.admin` | `applicationSchema:20` | `upsertApplication:300` |
| DELETE | `/api/v1/admin/rbac/applications/:id` | `system.admin` | — | `deleteApplication:305` |
| PUT | `/api/v1/admin/rbac/roles/:id` | `system.admin` | `functionalRoleSchema:20` | `upsertFunctionalRole:312` (FunctionalRole ≠ RBAC Role) |
| DELETE | `/api/v1/admin/rbac/roles/:id` | `system.admin` | — | `deleteFunctionalRole:316` |
| PUT | `/api/v1/admin/rbac/users/:id` | `system.admin` | `rbacUserSchema:20` | `upsertRbacUser:324` |
| DELETE | `/api/v1/admin/rbac/users/:id` | `system.admin` | — | `deleteRbacUser:329` |
| POST | `/api/v1/admin/rbac/users/:id/reset-password` | `system.admin` | — | `generateTempPassword→hashPassword:339` + `mustChangePassword true:343` + audit; `201 {tempPassword}` |
| GET | `/api/v1/admin/data-quality/summary` | `system.admin` | — | `countOne per module cmdb/event/incident/change/problem/service_request:62` (orphan always 0, NOT NULL since Plan F) |
| GET | `/api/v1/admin/data-quality/:module` | `system.admin` | `assertModule:68` | `listOrphans → []:71` (constraint makes impossible) |
| PATCH | `/api/v1/admin/data-quality/:module/:id` | `system.admin` | `patchBody {applicationId}:74` | `assignOne updateMany (tenantId,publicId):37` + audit `data_quality.assign:84` |
| POST | `/api/v1/admin/data-quality/:module/bulk` | `system.admin` | `bulkBody {ids max 500,applicationId}:94` | `bulkAssign updateMany in:49` + audit; `{updated}` |
| GET | `/api/v1/applications/catalog` | `requireAuth` (no permission) | — | `resolveScopeContext + listCatalog(tenantId, appMemberships):14` (`applications.ts:13`) |
| GET | `/api/v1/applications/manageable` | `requireAuth` | — | `resolveScopeContext + listManageableApps(ownerAppIds, isPlatformAdmin):28` (`admin/applicationMembership.ts:28`) |
| GET | `/api/v1/applications/:appId/teams` | `requireAuth` | — | `listTeamsForApp(appId):39` |
| POST | `/api/v1/applications/:appId/teams` | `OWNER\|PLATFORM_ADMIN` | `addBody {teamId, role OWNER\|CONTRIBUTOR\|VIEWER}:42` | `requireAppManager:44` → `addTeamToApp:47` → `MembershipError→404/409:18`; `201` |
| PATCH | `/api/v1/applications/:appId/teams/:teamId` | `OWNER\|PLATFORM_ADMIN` | `patchBody {role}:60` | `requireAppManager:62` → `changeTeamRole:65` |
| DELETE | `/api/v1/applications/:appId/teams/:teamId` | `OWNER\|PLATFORM_ADMIN` | — | `requireAppManager:79` → `removeTeamFromApp:81`; `204` |

---

## Conventions
- **Validation:** `schema.parse(req.body)` throw `ZodError.issues` → `server/app.ts:153` `400 { message:'Validation failed', issues }`. Shared schemas under `src/shared/schemas/` (`ci:6`, `event:9`, `incident:9`, `monitoringRule:9`, `alertRoute:7`, `change:17`, `request:19`, `kbArticle:15`) single-source client/server.
- **Errors:** `HttpError(status,message,body)` (`server/util.ts:3`) → `server/app.ts:149` `{ message, body }`; `NotFoundError→404:10`, `required(value,resource):27` helper. `ScopeViolationError:9` → `403 { error:'scope_violation', module, action, applicationId }:22` via `toJSON:22`. Unknown → `500 { message:'Internal server error' } + logger.error:157`.
- **ID vs publicId:** `prisma/schema.prisma:278` `ConfigurationItem publicId @unique`, `350 Event`, `410 Incident`, `469 Problem`, `482 Change`, `497 Release`, `509 Deployment`, `532 ServiceRequest`, `573 KBArticle`, `385 MonitoringRule`, `397 AlertRoute` — detail routes take `publicId` (`GET /cis/:publicId:29`, `GET /incidents/:publicId:42`) and map internally. `Document` uses `(tenantId,kind,key):598` + optional `publicId:593`.
- **Pagination:** `server/lib/pagination.ts:6` `parsePagination({ limit/take, offset/skip })` — `limit 1..MAX 200:9`, `offset≥0:10`, `hasMore = offset+limit < total:18`. Callers pass `?limit=&offset=` (aliased `take/skip/page*` legacy). Document repos `listByKind(tenantId,kind,pagination)` forward same.
- **Query helpers:** `server/util.ts:34` `qString`, `qBool:37`, `qStringArray:40`, `qInt:46` normalize `string|string[]|undefined`. Domain filters chain: `?status=&severities=&ruleId=` (events), `?active=&major=&ciId=` (incidents), `?metricId=&imminent&critical&open` (capacity).
- **Audit:** All writes call `audit(req,{ action, resourceKind, resourceId, before?,after?,scopeMode? })` → `prisma.auditLog:605` with `tenantId, actorId, ip, userAgent`. `server/app.ts:95` tenant limiter keyed by `req.tenantId ?? ip`.
- **Realtime:** `POST /events/ingest:118` fans out via `emitEventCreated` Socket.IO (`server/realtime.ts`), not Terra's SSE `GET /events?ticket=` (`docs/design/09-realtime.md`). Vite proxy keeps WS on same origin.
- **ResourceKinds (Prisma):** `ConfigurationItem, CIRelationship, CIAuditEntry, Event, MonitoringRule, AlertRoute, Incident, Service, Problem, Change, Release, Deployment, ServiceRequest, CatalogItem, Integration, KBArticle, Document(kind=*), AuditLog, Tenant, User, Role, Permission` (`prisma/schema.prisma:23-622`).

---

## Exemptions (why `prisma` direct is allowed here)

`eslint.config.js:22` `ignores` exempts six paths from `no-restricted-imports:36` — they bypass `req.scoped.*` by design:

| Exempt file | Rationale |
|-------------|-----------|
| `server/routes/auth.ts:3` | Session create/destroy needs cross-tenant `User` lookup before scope exists; also `authRouter` lives outside `requireAuth:126` |
| `server/routes/admin.ts:3` | `system.admin` is platform tenant admin — needs `prisma.role/permission/membershipRole` joins across `tenantId=null` system roles (`admin.ts:120` `OR tenantId null`) |
| `server/routes/admin/dataQuality.ts:3` | Bulk `updateMany(tenantId,publicId)` reassignment across 6 tables directly; `countOne/prisma.*.count` |
| `server/routes/admin/applicationMembership.ts:4` | `prisma.application/team` validation + `addTeamToApp` writes to `ApplicationTeam` outside scoped repos |
| `server/routes/applications.ts:1` | `resolveScopeContext:14` + `listCatalog` bridge — reads `ApplicationTeam` before scoped wrappers |
| `server/routes/platform.ts:3` | Document-backed read-only catalog (`listByKind/findByKey`) + `prisma.user/apiToken/notificationChannel/aiMessage` self-service; writes only `users/me`, `tokens`, `ai/messages` |
| `server/routes/integrations.ts:4` | `prisma.integration.create/update/deleteMany:41` — snapshot `data String JSON` write (no scoped wrapper) |

Operational routes **must** use `req.scoped.cmdb/events/incidents/monitoring/problems/changes/releases/serviceRequests:15-135` (`cmdb.ts:16`, `events.ts:16`, `incidents.ts:23`, `monitoring.ts:16`, `itsm.ts:25`). Lint error message: `route files must use req.scoped, not prisma directly` (`eslint.config.js:39`).

---

## Open Items

- [ ] Generate Zod contract export (like Terra `02-api-contract` §Typed endpoints) — schemas currently scattered in `src/shared/schemas/*` and inline `ingestSchema:78`, `createChangeSchema:48`, `techAssessmentSchema:106` — add `packages/contracts` or `src/shared/schemas/index` barrel for client-gen.
- [ ] Audit exempt routes — can `platform.ts:3` inbox/notifications + `integrations.ts:4` move to `req.scoped` / `listByKind` only? Tighten `prisma` to `read` there.
- [ ] Adopt Terra-style error shape `{ error, code, details, requestId }` + `x-request-id` correlation (`server/app.ts:62` already sets `x-request-id:64`) for SDK parity — currently `{ message, body, issues, error:'scope_violation' }` split.
- [ ] Cursor pagination for `events`/`incidents`/`audit` — current `limit/offset` (`server/lib/pagination.ts:6`) degrades at large offsets.
- [ ] Document `prisma/schema.prisma:6` `String data` → `Json` (jsonb)+GIN migration — `Document:594`, `MonitoringRule:388`, `Incident:412` blocked until repos parse structured JSON.
- [ ] `Session.tenantId String` has no FK to `Tenant` (`schema.prisma:241`) — enforce via `resolveSession` only; consider FK `Tenant` relation.
- [ ] `Document.key?` nullable in `@@unique[tenantId,kind,key]:598` — Postgres null≠null allows multiple null keys; enforce single null per kind in app if intended (see `01-erd.md` §Open Items).

---

## Resolved Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Cookie session, not JWT bearer (`server/routes/auth.ts:29`, `server/middleware/auth.ts:23`) | SPA+Socket.IO simple; session table `Session:238` supports `destroySession` revoke | M2 |
| Global `requireAuth` at `server/app.ts:126` | Guarantees `tenantId` defined; prevents `undefined` → no-filter leak | M6.9 |
| `req.scoped.*` + lint `no-restricted-imports` (`eslint.config.js:36`) | Single scope pattern; code review alone insufficient | 2026-05-15 |
| `ScopeViolationError → 403 { error:'scope_violation' }` (`server/scope/errors.ts:22`, `server/app.ts:145`) | App-membership scope and `req.permissions` distinct; 403 not 404 to signal scope | M6 |
| `withScopedDb` stub on unauthenticated (`server/middleware/scopedDb.ts:27`) | Allows `authRouter:120` to mount before scope without crashing; gate `requireAuth` 401 before handler | M6 |
| Postgres-only, `migrations/0001_init_postgres` (`prisma/schema.prisma:16`) | Single DB dev/staging/prod avoids `String` vs `Json` drift | M7.1 |
| Document store `(tenantId,kind,key)` (`schema.prisma:588`) for small catalogs | Avoid N tables for `list-by-kind` (`availability`, `capacity`, `platform`); `@@index[tenantId,kind]:599` | 2026-05 |
| Socket.IO not SSE (`server/realtime.ts`, `server/routes/events.ts:118`) | OIS realtime fan-out via `emitEventCreated` on ingest; Terra `GET /events?ticket` SSE not adopted | 2026-08 |
| `tenantLimiter 600/min` + `authLimiter 20/min` (`server/app.ts:81,95`) | Per-tenant isolation after session resolve; per-IP on auth pre-session | M6.9 |
| `auth/me` inside public router with manual `req.session` check (`server/routes/auth.ts:46`) | Keep `/auth/login` + `/me` together; `requireAuth:126` would 401 them uniformly anyway | M6 |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deepen API contract — `/api/v1`, cookie session+scope, health/auth/monitoring/itsm/platform/admin tables, per-router Method/Path/Permission/Zod refs, pagination & id conventions, exemptions, open items vs `server/app.ts:33,126,144`, `server/middleware/auth.ts:43,48`, `server/middleware/scopedDb.ts:19`, `eslint.config.js:36` | — |
| 2026-08-28 | Init API contract — `/api/v1`, session+scope, rate limits | — |
