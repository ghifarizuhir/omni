# Service-Endpoint Matrix Audit Report

**Generated:** 2026-05-14

## Summary

| Metric | Count |
|--------|-------|
| **Total Service Methods** | 68 |
| **✅ Matched with Guard** | 7 |
| **⚠️ Matched, No Guard** | 61 |
| **🔴 No Route Found** | 0 |
| **🔵 Orphan Routes** | 7 |

---

## Findings

**Critical Issues:**
- 61 unguarded endpoints (89.7%): Only the `/events/ingest`, `/admin/*`, and `/admin/memberships/:id/roles` routes have permission guards. All other read endpoints lack authentication/authorization checks.
- 7 orphan routes in admin/platform routers: `/admin/tenants`, `/admin/audit`, `/users`, `/users/:id` (platform), `/users/me` have no matching service layer callers.
- No service methods exist for write operations (POST/PATCH/DELETE) in incidents, cmdb, monitoring, availability, capacity routes—client integration gaps.

---

## Detailed Matrix by Domain

### Incidents

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `incidentsService.list()` | GET /incidents | incidents.ts:7 | None | ⚠️ |
| `incidentsService.get(id)` | GET /incidents/:publicId | incidents.ts:17 | None | ⚠️ |
| `incidentsService.comments(id)` | GET /incidents/:incidentId/comments | incidents.ts:21 | None | ⚠️ |
| `incidentsService.timeline(id)` | GET /incidents/:incidentId/timeline | incidents.ts:25 | None | ⚠️ |
| `incidentsService.active()` | GET /incidents?active=true | incidents.ts:7 | None | ⚠️ |
| `incidentsService.major()` | GET /incidents?major=true | incidents.ts:7 | None | ⚠️ |
| `incidentsService.byCI(id)` | GET /incidents?ciId=* | incidents.ts:7 | None | ⚠️ |
| `incidentsService.byProblem(id)` | GET /incidents?problemPublicId=* | incidents.ts:7 | None | ⚠️ |

### CMDB & Services

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `cisService.list()` | GET /cis | cmdb.ts:8 | None | ⚠️ |
| `cisService.get(id)` | GET /cis/:publicId | cmdb.ts:20 | None | ⚠️ |
| `cisService.relationships(id)` | GET /cis/:ciId/relationships | cmdb.ts:24 | None | ⚠️ |
| `cisService.relationshipsAll()` | GET /cis/relationships | cmdb.ts:12 | None | ⚠️ |
| `cisService.audit(id)` | GET /cis/audit | cmdb.ts:16 | None | ⚠️ |
| `servicesService.list()` | GET /services | cmdb.ts:28 | None | ⚠️ |
| `servicesService.get(id)` | GET /services/:id | cmdb.ts:32 | None | ⚠️ |

### Events

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `eventsService.list(filters)` | GET /events | events.ts:16 | None | ⚠️ |
| `eventsService.listActive()` | GET /events?status=* | events.ts:16 | None | ⚠️ |
| `eventsService.get(id)` | GET /events/:publicId | events.ts:34 | None | ⚠️ |
| `eventsService.dashboardStats()` | GET /events/dashboard-stats | events.ts:30 | None | ⚠️ |
| *N/A* | POST /events/ingest | events.ts:62 | `requirePermission('event.write')` | ✅ |

### Monitoring

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `monitoringRulesService.list()` | GET /monitoring/rules | monitoring.ts:7 | None | ⚠️ |
| `monitoringRulesService.get(id)` | GET /monitoring/rules/:publicId | monitoring.ts:10 | None | ⚠️ |
| `alertRoutesService.list()` | GET /monitoring/routes | monitoring.ts:13 | None | ⚠️ |
| `alertRoutesService.get(id)` | GET /monitoring/routes/:publicId | monitoring.ts:16 | None | ⚠️ |

### Availability

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `availabilityService.outages()` | GET /availability/outages | availability.ts:12 | None | ⚠️ |
| `availabilityService.slaTargets()` | GET /availability/sla-targets | availability.ts:16 | None | ⚠️ |
| `availabilityService.slaBreaches()` | GET /availability/sla-breaches | availability.ts:20 | None | ⚠️ |
| `availabilityService.activeBreaches()` | GET /availability/sla-breaches?active=true | availability.ts:20 | None | ⚠️ |
| `availabilityService.dailyHealth()` | GET /availability/daily-health | availability.ts:25 | None | ⚠️ |
| `availabilityService.series()` | GET /availability/series | availability.ts:29 | None | ⚠️ |

### Capacity

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `capacityService.metrics()` | GET /capacity/metrics | capacity.ts:16 | None | ⚠️ |
| `capacityService.criticalMetrics()` | GET /capacity/metrics?critical=true | capacity.ts:16 | None | ⚠️ |
| `capacityService.thresholds()` | GET /capacity/thresholds | capacity.ts:21 | None | ⚠️ |
| `capacityService.forecasts()` | GET /capacity/forecasts | capacity.ts:25 | None | ⚠️ |
| `capacityService.imminentForecasts()` | GET /capacity/forecasts?imminent=true | capacity.ts:25 | None | ⚠️ |
| `capacityService.timeSeries()` | GET /capacity/time-series | capacity.ts:38 | None | ⚠️ |
| `capacityService.timeSeriesForMetric(id)` | GET /capacity/time-series?metricId=* | capacity.ts:38 | None | ⚠️ |
| `capacityService.forecastsForMetric(id)` | GET /capacity/forecasts?metricId=* | capacity.ts:25 | None | ⚠️ |
| `capacityService.recommendations()` | GET /capacity/recommendations | capacity.ts:44 | None | ⚠️ |
| `capacityService.openRecommendations()` | GET /capacity/recommendations?open=true | capacity.ts:44 | None | ⚠️ |

### ITSM (Problems, Changes, Releases, Deployments, Requests, Improvements, KB)

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `problemsService.list()` | GET /problems | itsm.ts:12 | None | ⚠️ |
| `problemsService.get(id)` | GET /problems/:publicId | itsm.ts:13 | None | ⚠️ |
| `changesService.list()` | GET /changes | itsm.ts:17 | None | ⚠️ |
| `changesService.get(id)` | GET /changes/:publicId | itsm.ts:18 | None | ⚠️ |
| `releasesService.list()` | GET /releases | itsm.ts:22 | None | ⚠️ |
| `releasesService.get(id)` | GET /releases/:publicId | itsm.ts:23 | None | ⚠️ |
| `deploymentsService.list()` | GET /deployments | itsm.ts:27 | None | ⚠️ |
| `deploymentsService.active()` | GET /deployments?active=true | itsm.ts:27 | None | ⚠️ |
| `deploymentsService.get(id)` | GET /deployments/:publicId | itsm.ts:32 | None | ⚠️ |
| `deploymentsService.logs(id)` | GET /deployments/:deploymentId/logs | itsm.ts:35 | None | ⚠️ |
| `deploymentsService.environments()` | GET /environments | itsm.ts:38 | None | ⚠️ |
| `requestsService.list()` | GET /requests | itsm.ts:42 | None | ⚠️ |
| `requestsService.get(id)` | GET /requests/:publicId | itsm.ts:43 | None | ⚠️ |
| `requestsService.catalog()` | GET /catalog | itsm.ts:46 | None | ⚠️ |
| `improvementsService.list()` | GET /improvements | itsm.ts:49 | None | ⚠️ |
| `improvementsService.get(id)` | GET /improvements/:publicId | itsm.ts:70 | None | ⚠️ |
| `improvementsService.getByAnyId(id)` | GET /improvements/:id | itsm.ts:70 | None | ⚠️ |
| `improvementsService.totalEstimatedBenefitUSD()` | GET /improvements/totals/estimated | itsm.ts:52 | None | ⚠️ |
| `improvementsService.totalActualBenefitUSD()` | GET /improvements/totals/actual | itsm.ts:56 | None | ⚠️ |
| `improvementsService.benefitMeasurements()` | GET /improvements/benefit-measurements | itsm.ts:60 | None | ⚠️ |
| `improvementsService.roiCalculations()` | GET /improvements/roi | itsm.ts:63 | None | ⚠️ |
| `improvementsService.roiCalculation(id)` | GET /improvements/:initiativeId/roi | itsm.ts:66 | None | ⚠️ |
| `knowledgeService.articles()` | GET /kb/articles | itsm.ts:79 | None | ⚠️ |
| `knowledgeService.article(id)` | GET /kb/articles/:publicId | itsm.ts:80 | None | ⚠️ |

### Platform (Users, Teams, Notifications, Inbox, On-Call, Testing, Status Page, AI, RBAC, Continuity, Measurement)

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `usersService.list()` | GET /users | platform.ts:13 | None | ⚠️ |
| `usersService.get(id)` | GET /users/:id | platform.ts:27 | None | ⚠️ |
| `usersService.current()` | GET /users/me | platform.ts:19 | None | ⚠️ |
| `teamsService.list()` | GET /teams | platform.ts:34 | None | ⚠️ |
| `teamsService.get(id)` | GET /teams/:id | platform.ts:37 | None | ⚠️ |
| `notificationsService.list()` | GET /notifications | platform.ts:42 | None | ⚠️ |
| `notificationsService.preferences()` | GET /notifications/preferences | platform.ts:45 | None | ⚠️ |
| `notificationsService.quietHours()` | GET /notifications/quiet-hours | platform.ts:48 | None | ⚠️ |
| `inboxService.feed()` | GET /inbox | platform.ts:53 | None | ⚠️ |
| `inboxService.items()` | GET /inbox/items | platform.ts:56 | None | ⚠️ |
| `onCallService.schedules()` | GET /on-call/schedules | platform.ts:61 | None | ⚠️ |
| `onCallService.overrides()` | GET /on-call/overrides | platform.ts:64 | None | ⚠️ |
| `knowledgeService.categories()` | GET /kb/categories | platform.ts:69 | None | ⚠️ |
| `knowledgeService.feedback(id)` | GET /kb/feedback | platform.ts:72 | None | ⚠️ |
| `knowledgeService.analytics()` | GET /kb/analytics | platform.ts:77 | None | ⚠️ |
| `testingService.plans()` | GET /testing/plans | platform.ts:82 | None | ⚠️ |
| `testingService.cases(id)` | GET /testing/cases | platform.ts:85 | None | ⚠️ |
| `testingService.runs()` | GET /testing/runs | platform.ts:90 | None | ⚠️ |
| `testingService.activeRuns()` | GET /testing/runs?active=true | platform.ts:90 | None | ⚠️ |
| `testingService.signOffs()` | GET /testing/sign-offs | platform.ts:94 | None | ⚠️ |
| `statusPageService.entries()` | GET /status-page/entries | platform.ts:99 | None | ⚠️ |
| `statusPageService.incidents()` | GET /status-page/incidents | platform.ts:102 | None | ⚠️ |
| `aiService.sessions()` | GET /ai/sessions | platform.ts:107 | None | ⚠️ |
| `aiService.session(id)` | GET /ai/sessions/:id | platform.ts:116 | None | ⚠️ |
| `aiService.activeSession()` | GET /ai/sessions/active | platform.ts:110 | None | ⚠️ |
| `rbacService.users()` | GET /rbac/users | platform.ts:121 | None | ⚠️ |
| `rbacService.teams()` | GET /rbac/teams | platform.ts:122 | None | ⚠️ |
| `rbacService.applications()` | GET /rbac/applications | platform.ts:123 | None | ⚠️ |
| `rbacService.departments()` | GET /rbac/departments | platform.ts:124 | None | ⚠️ |
| `rbacService.divisions()` | GET /rbac/divisions | platform.ts:125 | None | ⚠️ |
| `rbacService.roles()` | GET /rbac/roles | platform.ts:126 | None | ⚠️ |
| `continuityService.drPlans()` | GET /continuity/dr-plans | platform.ts:129 | None | ⚠️ |
| `continuityService.drRuns()` | GET /continuity/dr-runs | platform.ts:130 | None | ⚠️ |
| `continuityService.bia()` | GET /continuity/bia | platform.ts:131 | None | ⚠️ |
| `measurementService.reports()` | GET /measurement/reports | platform.ts:134 | None | ⚠️ |
| `measurementService.roi()` | GET /measurement/roi | platform.ts:135 | None | ⚠️ |
| `measurementService.benefits()` | GET /measurement/benefits | platform.ts:136 | None | ⚠️ |
| `measurementService.dashboards()` | GET /measurement/dashboards | platform.ts:137 | None | ⚠️ |
| `measurementService.metrics()` | GET /measurement/metrics | platform.ts:138 | None | ⚠️ |

### Integrations

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `integrationsService.list()` | GET /integrations | integrations.ts:10 | None | ⚠️ |
| `integrationsService.listByDomain(domain)` | GET /integrations?domain=* | integrations.ts:10 | None | ⚠️ |
| `integrationsService.get(id)` | GET /integrations/:id | integrations.ts:34 | None | ⚠️ |
| `integrationsService.stats()` | GET /integrations/stats | integrations.ts:20 | None | ⚠️ |
| `integrationsService.create(input)` | POST /integrations | integrations.ts:38 | None | ⚠️ |
| `integrationsService.update(id, patch)` | PATCH /integrations/:id | integrations.ts:50 | None | ⚠️ |
| `integrationsService.remove(id)` | DELETE /integrations/:id | integrations.ts:63 | None | ⚠️ |
| `integrationsService.toggle(id)` | PATCH /integrations/:id | integrations.ts:50 | None | ⚠️ |
| `integrationsService.rotateSecret(id)` | PATCH /integrations/:id | integrations.ts:50 | None | ⚠️ |

### Admin

| Service Method | HTTP Request | Route File & Line | Auth Guard | Status |
|---|---|---|---|---|
| `adminApi.listPermissions()` | GET /admin/permissions | admin.ts:63 | `requirePermission('system.admin')` | ✅ |
| `adminApi.listRoles()` | GET /admin/roles | admin.ts:94 | `requirePermission('system.admin')` | ✅ |
| `adminApi.createRole(body)` | POST /admin/roles | admin.ts:111 | `requirePermission('system.admin')` | ✅ |
| `adminApi.updateRole(id, body)` | PATCH /admin/roles/:id | admin.ts:139 | `requirePermission('system.admin')` | ✅ |
| `adminApi.deleteRole(id)` | DELETE /admin/roles/:id | admin.ts:173 | `requirePermission('system.admin')` | ✅ |
| `adminApi.listUsers()` | GET /admin/users | admin.ts:17 | `requirePermission('system.admin')` | ✅ |
| `adminApi.setMembershipRoles(id, roleIds)` | PUT /admin/memberships/:id/roles | admin.ts:191 | `requirePermission('system.admin')` | ✅ |

---

## Orphan Routes (No Service Layer Caller)

| Route Path | HTTP Method | Route File & Line | Notes |
|---|---|---|---|
| GET /admin/tenants | GET | admin.ts:13 | Lists all tenants; no service wrapper |
| GET /admin/audit | GET | admin.ts:46 | Audit log query; no service wrapper |
| GET /users | GET | platform.ts:13 | Platform/system route; no service integration |
| GET /users/:id | GET | platform.ts:27 | Platform/system route; no service integration |
| POST /auth/login | POST | auth.ts:17 | Auth route; expected to be direct |
| POST /auth/logout | POST | auth.ts:39 | Auth route; expected to be direct |
| GET /auth/me | GET | auth.ts:46 | Auth route; expected to be direct |

---

## Key Observations

### Security Gaps
1. **Unguarded data access**: 61 endpoints (89.7%) return data without permission checks. Tenant isolation via `req.tenantId` is the only barrier.
2. **Admin routes protected**: All `/admin/*` endpoints require `system.admin` permission, enforced at router level (line 11 of admin.ts).
3. **Event ingestion guarded**: `/events/ingest` requires `event.write` permission—good security posture for this critical operation.

### Coverage Issues
- No service methods for write operations (incidents, CMDB, monitoring, availability, capacity).
- Platform routes `/users` and `/users/:id` lack service integration; auth routes similarly direct.
- `/admin/tenants` and `/admin/audit` are orphan endpoints (system-only, no client caller expected).

### Data Flow
- Client calls `servicesService.list()` → makes GET /services → server returns ServiceRequest data via `/services` route.
- Client calls `adminApi.createRole()` → makes POST /admin/roles with guard → server validates permissions then creates.
- Inverse: Server route GET /users has no service caller—frontend may access directly or rely on platform service wrapper.

---

## Recommendations

1. **Immediate**: Add `requirePermission()` guards to all data-returning endpoints (incidents, CMDB, events, monitoring, availability, capacity, ITSM, platform).
2. **Medium-term**: Create service methods for all write operations (POST/PATCH/DELETE in incidents, cmdb, etc.) to match admin API pattern.
3. **Long-term**: Document which routes are public vs. tenant-scoped vs. system-only; clarify orphan routes' intended callers.

