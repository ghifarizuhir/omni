# CRUD Wiring Audit — ITSM Core (2026-08-28)

**Scope:** `incidents | problems | requests | changes | cmdb | kb` — full `C/R/U/D` (no assumptions), trace `FE → Service → Shared Zod → BE Route → Scoped → Repo → Prisma` with `file:line`.

**Method:** read `docs/features/<page>.md` + `src/routes/<page>/*` + `src/services/*` + `src/shared/schemas/*` + `server/routes/*.ts` + `server/scope/scopedDb.ts` + `server/repositories/*` + `prisma/schema.prisma` live at `HEAD`.

**Legend:** `🟢 WIRED` end-to-end (FE trigger→apiFetch→requirePermission→Zod→audit→prisma tenant-scoped) · `🟡 PARTIAL` works but gap (pagination dead, client-only filter, hardcode, missing guard) · `🔴 STUB / NOT WIRED` fake local state or missing layer.

---

## 1. Executive Matrix

| Page | C Create | R List | R Get | R Timeline/History/Audit | U Status/Assess/Workflow | U Edit/Patch | U Links/Watchers/Comments/Comms | D / Close / Archive | Overall |
|------|----------|--------|-------|--------------------------|--------------------------|--------------|----------------------------------|---------------------|---------|
| **Incidents** | 🔴 fake `INC-2026-random` `CreateIncidentModal.tsx:53` no `POST /incidents` | 🟡 `list()` no `?page` → `GET /incidents parsePagination 28` wired but FE client-sort | 🟢 `GET /incidents/:publicId 42` | 🟢 comments/timeline `46,51` | 🟢 `PATCH status 84` + `POST resolve 110` + `POST promote-major 136` + `POST stand-down 161` | 🟢 `PATCH /:publicId priority/tags 212` | 🟢 `PATCH assign 237` `PATCH links 261` `POST comments 58` `POST comms 187` `POST/DELETE watchers 287,316` | 🟡 `close` via `status=closed` only, no hard DELETE | **🟡 1 critical** |
| **Problems** | 🔴 `ProblemList.tsx:164 setExtraProblems` no `POST /problems`, no Zod | 🟡 `GET /problems 30 parsePagination` wired but FE `problemsService.list()` no query `itsmServices.ts:13` + client filter | 🟢 `GET /problems/:publicId 34` | 🔴 `HistoryTab 353` synthesized, no `GET /timeline` | 🔴 `StatusDropdown 392→501 setProblem` local, no `PATCH /status` | 🔴 description `695 setProblem` local | 🔴 `relatedIncidentIds 951` `linkedChangeIds 971` `knownError 493 hardcode u-001` `RCA 374 author u-001/Sarah Chen, PlaceholderEditor 192` all local | 🔴 `close 333→501` status local, no `closedAt`/`audit` | **🔴 0/8 writes wired** |
| **Requests** | 🔴 `CatalogItemDetail.tsx:527 setTimeout REQ-2026-rand` no `POST /requests`, no `createRequestSchema` | 🟢 `GET /requests 159 parsePagination` | 🟡 detail via `list.find(id)` `RequestDetail.tsx:594` not `get`, service `get:69` unused | 🟢 `GET comments 166` + `GET catalog 172` | 🟢 `POST approve 205` / `reject 211` `PATCH cancel 242` `PATCH reassign 265` (local approveSchema not shared) | — (cancel covers) | 🟢 `POST comments 219` `POST/DELETE watchers 293,320` · pending_user `RequestInfoModal 373` no transition, RowActions 175 stubs, `isMyTeam 80 false` | 🟡 `cancel` soft-D 🟢, hard DELETE 🔴 by design | **🟡 Create only gap** |
| **Changes** | 🟢 `POST /changes 63 createChangeSchema:48` `riskScore 85` → `scoped 532` → `docs.ts:71 prisma.change 117` | 🟢 `GET /changes 38` global read `policy:28` | 🟢 `GET /changes/:publicId 42` | — (CAB agenda local) | 🔴 `CABWorkspace 35 CURRENT_USER u-001` `57 CastVoteModal` `705 setVotes` local — **no `POST /changes/:id/votes`** | 🟢 `PATCH cancel 73` `PATCH reschedule 87 rescheduleChangeSchema:9 strict` 🟡 `PATCH tech-assessment 118 .passthrough` weak `risks unknown[] 115` | `PIR` read-only | 🟡 soft `cancel` only, no `close_successful/failed` lifecycle | **🟡 4/6 wired, vote missing** |
| **CMDB** | 🔴 `CreateCIModal.tsx:59 onCreate→setExtraCIs 365` & `Import 114→374` local, no `POST /cis`, no `createCISchema` | 🟢 `GET /cis 14` `GET relationships 19` | 🟡 `GET /cis/:publicId 29` wired but Detail uses `list.find 89` not `get` | 🟢 `GET audit 24` `GET /relationships:ciId 33` (FE ignores, filters `relationshipsAll()` local) | — | 🟡 `PATCH /cis/:publicId 40 updateCISchema:40` scoped `changeCanWrite 506` → audit, but `health` enum drift `healthy/degraded/down/unknown` 33 vs `operational/degraded/partial_outage/major_outage/maintenance` `common.ts:63` `CreateCIModal 72 operational` would 400 | 🔴 `POST/DELETE relationships` missing, `ForceGraph` not editable | 🔴 `DELETE/Archive` missing (`retired` via PATCH only) | **🔴 reads 🟢, writes 1/6** |
| **KB** | 🟢 `POST /kb/articles 408 createKBArticleSchema 38` → `kbRepo.create:549 KB-NNNNN` 201 | 🟢 `GET /kb/articles 395` paginated `396` (FE loads all `KBBrowse 255`) | 🟡 `GET /kb/articles/:publicId 399` wired but `ArticleView 453` `allArticles.find(slug)` bypass | `categories/feedback/analytics 237-247` `Document kind kb-*` 🟢/🟢/🟡 seeded | 🟢 `PATCH :publicId 416 updateKBArticleSchema 58` + `PATCH status 427 setKBArticleStatusSchema 76` `draft→published→archived` guards `538` | — | `helpful Yes/No 504` local only, `visibility public 49` not enforced, `reviewDueAt` days `KBEditor 405` discarded | 🟡 `archived` terminal via `PATCH status` BE 🟢 FE menu missing, hard DELETE 🔴 by design | **🟢 most wired** |

**Cross-cutting:** only `requests/changes/incidents` pagination BE exists but FE never sends `?page&pageSize`; `problems/cmdb/kb` list filters client-only; hardcodes `u-001` / `Sarah Chen` / `PRB-/INC- prefix` repeated; `scopedDb` write missing for `problems` (`no write endpoints yet 497`) and `kb` (no `Scoped kb` binding, direct `req.tenantId` `itsm.ts:408`).

---

## 2. Incidents — Detail

Verdict `9/10 wired, 1 CRITICAL`: Create stub.

| Op                           | FE → Service → Route → Repo → Prisma                                                                                                                                                                                                                                           | Status                                                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C**                        | `IncidentQueue.tsx:399 New incident→CreateIncidentModal` → **no `incidentsService.create`** `itsmServices.ts:69 POST/PATCH only` → **no `POST /incidents`** `incidents.ts` only `GET 28,42,46,51` → **no `incidentsRepo.create`** `repositories/incidents.ts:74` has no create | 🔴 `CreateIncidentModal.tsx:53 handleCreate(){ const newId=\`INC-2026-${rand}\`; onCreated(newId); onClose(); }` + `Queue 616 onCreated=id=>navigate(/incidents/${id})` fake — refresh hilang, detail 404 |
| **R list**                   | `Queue 88 useResource(list) 99 filterReadable incidentResource` → `list 45 GET /incidents` no query (server `parsePagination 29` + repo `take/skip 94` wired)                                                                                                                  | 🟡 unused pagination                                                                                                                                                                                      |
| **R get**                    | `Detail 165 get(incidentId)` → `46 GET /incidents/:publicId 42` → `get 104 findFirst {tenantId,publicId}`                                                                                                                                                                      | 🟢                                                                                                                                                                                                        |
| **R comments/timeline**      | `Detail 186,190 timeline/comments` → `GET .../comments 46` `GET .../timeline 51` pagination                                                                                                                                                                                    | 🟢                                                                                                                                                                                                        |
| **U status**                 | `Detail 307 setStatus` `bulkClose 300 setStatus closed` → `62 PATCH /:publicId/status reject resolved→400 89` audit 98 → `setStatus 239` transaction + `status_changed 254`                                                                                                    | 🟢                                                                                                                                                                                                        |
| **U resolve**                | `Detail 322 resolve` → `57 POST /resolve Zod 14` → `resolve 139` tx + `resolved 165`                                                                                                                                                                                           | 🟢                                                                                                                                                                                                        |
| **U promote/standDown**      | `347 promoteMajor 70`, `standDown` → `POST 136,161 min10 reason 102` audit                                                                                                                                                                                                     | 🟢                                                                                                                                                                                                        |
| **U assign/update/links**    | `373 assign 73`, `333 update priority 90`, `371 setLinks 76` → `PATCH assign 237` `PATCH /:publicId 212 UpdateRepoInput 52` `PATCH links 261 SetLinksRepoInput 38` audit                                                                                                       | 🟢                                                                                                                                                                                                        |
| **U comment/comms/watchers** | `65 addComment isInternal+mentions 22`, `99 postComms audience 111`, `79 addWatcher 74` → `POST comments 58` `POST comms 187` `POST/DELETE watchers 287,316 audit 72,78` → repo `$transaction comment+comment_added 217` `comms_posted 678`                                    | 🟢                                                                                                                                                                                                        |

Open item legacy `GET /incidents/export` missing (client blob `Queue 252` ok), `my_open u-001 63` hardcode, stripe `incident.severity` should be `priority 694`.

Fix: add `createIncidentSchema` `shared/schemas/incident.ts`, `POST /incidents` `requirePermission('incident.create')` zod→`scoped.incidents.create`→repo→audit, `incidentsService.create()` wire `Modal` async.

---

## 3. Problems — Detail

Scope read `tenantId` via `docs.ts:56 listDocs/goDocByPublicId`, write none (`scopedDb.ts:497 // no write endpoints yet`).

| Op | Evidence | Status |
|----|----------|--------|
| **C** | `ProblemList 164 handleCreateProblem seq PRB-YYYY-##### 166 ownerId mockUsers[0].id 175 → setExtraProblems 188` · `problemsService list/get only 12` · **no `src/shared/schemas/problem.ts`** · `itsm.ts 30 2 GETs` · `scopedDb ProblemsScope list/get only 115` | 🔴 |
| **R list** | `ProblemList 146 useResource(list) 155 filterReadable problemResource`, `KEDB 25` reuse · `itsm.ts:31 parsePagination` · `docs.ts:22 take/skip tenantId` | 🟡 server filter `where{}` never uses `?status/source` |
| **R get** | `Detail 446 useResource(get).catch(null)` · `itsm.ts:34 GET :publicId required 404` · `docs.ts:58 findFirst {tenantId,publicId}` | 🟢 only wired op |
| **R history** | `Detail 353 HistoryTab synthesized createdAt→rca.createdAt→knownError.publishedAt→updatedAt→closedAt sorted asc icons Plus/Activity/... 368` no fetch | 🔴 no `GET /timeline`, no `AuditLog` |
| **U status** | `Detail 392 StatusDropdown 501 setProblem({...prev,status:newStatus})` gated `Can problem.update 542` but no `PATCH` | 🔴 |
| **U description** | `695 textarea→ setProblem(description:descDraft) 704` | 🔴 |
| **U knownError** | `PromoteModal 31 validates rootCause/workaround` `Detail 493 handlePromote status known_error {publishedAt: now, publishedBy:'u-001' 497}` hardcode | 🔴 |
| **U RCA** | `RCAWorkspace 374 DEFAULT_RCA authorId u-001 authorName Sarah Chen` `405 handleSave/handlePublish setRca(...updatedAt)`, `PlaceholderEditor 192 fault_tree/timeline` · `0243 RecommendedActionsEditor` | 🔴 local, 2 editors placeholder |
| **U links** | `LinkIncidentsModal 18 candidates filter+checkbox 38→Detail 951 relatedIncidentIds:[...new Set]` local · `967 linkedChangeIds` via `LinkChangeModal` local · `524 Suggest article navigate(/kb/editor?source=problem…)` | 🔴 |
| **D close** | `CloseProblemModal 333 onConfirm→handleStatusChange('closed') 941` no `closedAt`/audit | 🔴 |

Inline inline patch proposals captured in `docs/features/problems.md` section 6 audit.

---

## 4. Requests — Detail

`ServiceRequestsScope isSrReadBypass AUDITOR/PLATFORM_ADMIN 584`, `writableApps OWNER/CONTRIBUTOR` else.

| Op | Evidence | Status |
|----|----------|--------|
| **C** | `CatalogItemDetail 527 handleSubmit setTimeout 900→ REQ-2026-${rand} 528` sim · `requestsService 67 11 methods no create` · `request.ts 9 cancel/reassign/watcher only` · **no `POST /requests`** `itsm.ts 159-341` | 🔴 portal create missing (mirrors incidents/problems) |
| **R list** | `RequestQueue 214 useResource(list) 218 filterReadable requestResource 17 ownerUserId/requesterId + ownerTeamId catalogItem` · `GET /requests 159 parsePagination` · `scopedDb 610 list 584 bypass else readableApps` · `docs.ts:253 listDocs` | 🟢 |
| **R get** | Detail via `list.find(r.id===requestId) 594` not `get:69 GET /:publicId 163` wired but unused | 🟡 indirect |
| **R comments/catalog** | `Detail 589 comments(publicId) 85 GET 166`, `catalog 172 GET 172 catalogRepo 530` `CatalogItemDetail 464 find by list` no `GET :id` | 🟢 catalog read, 🟡 inefficiency |
| **U approve/reject** | `Stepper 216 ApproveModal 241 note ≤2000` `281 RejectModal ≥20 UI vs ≥1 route 180` → `POST approve 205 / reject 211 approveSchema:179 local (not shared)` → `scoped decideStep srCanWrite 620` → `docs.ts:256 decideStep approved 289 next pending→active else status approved` `rejected 300 status rejected + skipped` → `prisma update 316 audit 194` | 🟢 |
| **U comment/cancel/reassign/watchers** | `775 addComment body ≤10k 88 POST 219 docs.ts:352 prisma.requestComment 543` · `456 CancelModal ≥10 → PATCH cancel 242 cancelRequestSchema:9 → scoped 640 → docs.ts:376 CLOSED_REQUEST_STATES→cancelled+skipped 393` · `411 ReassignModal → PATCH reassign 265 reassignRequestStepSchema:16 → scoped 650 → docs.ts:414 active check 433` · `501 AddWatcher 107 POST 293 addRequestWatcherSchema:25 → docs.ts:448 idempotent 201/200`, `320 DELETE 481 204` | 🟢 |
| **D** | No `DELETE`, `cancel` is soft-D 409 if `CLOSED_REQUEST_STATES 250` | 🟢 soft |
| **Stubs** | `Queue RowActions 175 approve/assign/cancel setOpen(false)` only, `isMyTeam 80 return false` dead, `NOW Date.now() 38/24` frozen SLA, `RequestInfoModal 373 jumpToComments only` no `pending_user`, file_upload `'uploaded' 298` literal, realtime not subscribed | 🟡 |

---

## 5. Changes — Detail

`ChangesScope write scoped canWriteApp 506 PLATFORM_ADMIN bypass, read global POLICY 28`.

| Op | Evidence | Status |
|----|----------|--------|
| **C** | `NewChange 233 form 4-step →866 doSubmit isoLocal→create 871 applicationId scopedAppId` · `itsmServices 37 POST /changes` · **inline `createChangeSchema:48` not shared `change.ts 9 only reschedule`** · `POST 63 change.write →scoped 532 ScopeViolationError→audit 67→docs.ts:71 count+1 CHG-YYYY-NNNNN 83 riskScore 95/80/55/25 85 → prisma.change 117` | 🟢 riskiest is strictest `rescheduleChangeSchema .superRefine 20` |
| **R list/detail** | `ChangeCalendar 55 useResource(list) 58 filterReadable changeResource 67 activeChanges` client filters `93 status/risk/search` · `Detail 51 get(changeId)` · `GET 38 read global` · `GET :publicId 42` → `scoped 529` → `docs.ts:65 listDocs` `Change 481 status/scheduledStart/appId` | 🟢 |
| **U techAssessment** | `Detail 422 Can assess 432 Panel 919 Modal 924 setChange+928 setTechnicalAssessment` · `PATCH .../tech-assessment 118 .passthrough risks unknown[] 115` weak · `scoped 564 check` · `docs.ts:199 merge reviewer 212→prisma 217` | 🟡 weak Zod |
| **U reschedule** | `789 RescheduleModal 952 optimistic 958 reschedule 971 revert` · `PATCH 87 rescheduleChangeSchema strict 88→scoped 554→docs.ts:151 tx closed guard 165 rescheduleHistory 182` | 🟢 |
| **U cancel** | `815 CancelModal reason 877→898 cancel 903 status cancelled` · `PATCH cancel 73 cancelChangeSchema 71 min1 (vs request min10)` · `scoped 544→docs.ts:134 if CLOSED→closed else cancelled+Reason 139` soft D 409 | 🟢 |
| **U approve/vote** | **CABWorkspace 35 CURRENT_USER u-001 57 CastVoteModal decision+rationale* 264 Can approve variant 705 setVotes+toast** no `changesService castVote` no `change.ts castVoteSchema` **no `POST /changes/:id/votes` `itsm.ts:38-131` no `ChangesScope approve`** → `docs.ts changesRepo 64 no vote` `change.approvals[] 72` JSON never mutated | 🔴 loss on refresh, status stays `in_review` |
| **D/lifecycle** | No `DELETE`, no `close_successful/failed/rejected/implemented` transition; `CLOSED_CHANGE_STATES 62` includes them but no code path | 🔴 |

---

## 6. CMDB — Detail

`cmdbRouter 9: GET 14/19/24/29/33/55/60 vs 1 PATCH 40`, reads global `POLICY 27` writes scoped `writeBypass PLATFORM_ADMIN 207`.

| Op | Evidence | Status |
|----|----------|--------|
| **C** | `CMDBList 199 Can cmdb.update → CreateCIModal 42 onCreate→365 setExtraCIs` `Import 88→374 local` · `cmdbService 9 list/get/relationships/audit/update only` no `create` · `ci.ts:40 updateCISchema .strict() only` · **no `POST /cis` 62 EOF** · `scopedDb CmdbScope updateCI only 13` · `cmdbRepo 69 list/get/rels/audit/update` · `ConfigurationItem 277` exists `primaryApplicationId 286` required | 🔴 ephemeral `id ci-${Date.now()} health operational 72` mismatch Zod `healthy/degraded/down/unknown 33` |
| **R list/graph/detail/relationships/audit/services** | `CMDBList 53 list 97 client search/attr` `Graph 29 list+relationshipsAll 64/72` `CMDBDetail 74 list+find 89` not `get` (miss >50), `151 outgoing/incoming local filter tabular` ignoring `GET :ciId/relationships 33` · `CMDBAudit 80 audit 83 search+action cyclic` · `services 55 servicesRepo.list(tenantId)` bypass `scoped` divergent `eslint 19` | 🟢 BE wired, FE ignores dedicated endpoints (`detail via list`, `rels via all`) |
| **U patch** | `CMDBDetail 105 editDraft name/status/env/crit 113 optimistic setCi 125→127 cisService.update 18 PATCH 40 updateCISchema strict 41→scoped 227 canWriteApp 235→audit 44→cmdbRepo 101 $transaction 122 before/after` | 🟡 only 4/10 fields exposed `UI 118`, health drift 400, no status guard, no `emitCmdbChange 09-realtime:147` |
| **U relationships/D/archive** | No `POST /cis/:id/relationships` `DELETE` `DELETE /cis` · `CIRelationship Badge` read-only `ForceGraph` not editable · `retired` via PATCH only | 🔴 `relationship_added/removed 173` never emitted, Phase 2 `cmdb.md:152` |

---

## 7. KB — Detail

`ScopedDb no kb binding`, direct `req.tenantId` `itsm.ts:395-439`, `platformRouter 236-247`.

| Op | Evidence | Status |
|----|----------|--------|
| **C** | `KBEditor 728 knowledgeService.create → platformServices 110 POST /kb/articles` `createKBArticleSchema 38 strict title1..200 summary1..2000` · `POST 408 kb.write→kbRepo.create 549 count+1 KB-NNNNN slug lower hyph 565 draft v1 201` · `schema 572 KBArticle` data String | 🟢 race `count+1` P2002 567 |
| **R browse/list** | `KBBrowse 255 KBLayout 14 ArticleView 448 KBEditor 549 useResource(articles())` all · `GET 395 kb.read parsePagination 396→list 542 listDocs` (FE ignores pagination) middleware `requireAuth 126` | 🟢 |
| **R search/filter/sort** | `KBBrowse 291 substring title/summary/body/tags` `70 extractSnippet` `54 recent/viewed/helpful/alpha` client-only, categories `platform 237 Document kb-category`, no `?q=` FTS | 🔴 missing BE |
| **R get** | `platformServices 102 article(publicId) GET :publicId 399 kbRepo.get 543` wired but `ArticleView 453 find by slug` over full list bypass | 🟡 |
| **R feedback/analytics** | `GET kb/feedback 240 qString articleId` `GET analytics 245 firstByKind kb-analytics seeded` `feedback Document 240` · `KBAnalytics 228 viewDeltas` synthetic | 🟢/🟡 seeded |
| **U patch/status** | `KBEditor 711 update currentPublicId 756 PublishMenu→ReviewReminderModal 400 days discarded→783 handleConfirmPublish setStatus 114 PATCH .../status 427 Zod 76 draft/published/archived guards 538 same-status 400 terminal archived 400→kbRepo.setStatus 538 published stamps publishedAt/By 650 audit 434` | 🟢 |
| **D archive** | `PATCH status archived` terminal BE 🟢 but PublishMenu 378-381 omits archived, no Delete UI `DELETE` intentionally absent | 🟡 FE gap, BE ok |
| **Stubs** | `helpful Yes/No 504 local only` no `POST /kb/feedback`, `visibility public 49` not enforced, `reviewDueAt` days `405` never persisted | 🟡 |

---

## 8. Cross-Cutting Findings

- **CREATE pattern repeated:** `incidents CreateIncidentModal random 53`, `problems setExtraProblems PRB- seq 166 + extraProblems`, `requests CatalogItemDetail setTimeout REQ- rand 528`, `CMDB setExtraCIs ci-Date.now 365` all fake local state → refresh loss, no `tenantId/actor` `ScopeViolationError 403`, no `audit` `resourceKind` vs wired `changes POST /changes CHG- 83` + `kb POST /kb/articles KB- 565` prove template exists (`changesRepo.create 71` + `kbRepo.create 549` both allocate `YYYY-NNNNN`).
- **Pagination dead:** `server parsePagination limit50 max200 server/lib/pagination.ts:6` + `repo take/skip` wired for `incidents/problems/requests/changes/cmdb/kb` but `FE service list() => apiFetch('/path')` never passes `?page=&pageSize=&q=` → all client-filter over `filtered.length of X.length`.
- **RBAC vs route perm divergence:** `CAB change.assess/approve vs route change.write 118` client-only granularity; `ScopedDb ProblemsScope no write 497` missing `ScopeViolationError`; `KB` bypasses `ScopedDb` → direct `prisma where {tenantId}` ok but app-scoped not enforced.
- **Hardcodes:** `u-001` (`problems publishedBy 497`, `RCA author 374 Sarah Chen`, `incidents my_open 63`, `CAB CURRENT_USER 35`, `incidents majorDeclaredBy u-001`, `WarRoom actorId u-001 228`), `CHG May9-11 freeze ChangeCalendar 168`, `RCA PlaceholderEditor 192 fault_tree/timeline`.
- **Audit present for wired writes:** all `POST/PATCH` for wired ops call `audit(req,{action,resourceKind/resourceId,before,after,scopeMode})` `server/audit` + `HttpError 403 scope_violation errors.ts:9` → `app.ts:144`.
- **Stub UIs gated correctly but non-functional:** `<Can module problem/request/change/cmdb/kb>` RBAC gates exist, giving affordance while BE 404/undefined.

---

## 9. Fix Priority (next iteration)

| Prio | Fix | Reuse template | Impact |
|------|-----|----------------|--------|
| **P0** | Wire `problems` writes: add `src/shared/schemas/problem.ts` (`createProblemSchema`), `problemsRepo.create` (`prisma.problem count→PRB-YYYY-NNNNN`), `ProblemsScope.create/update/promote/link/timeline` `ScopedViolationError`, `POST/PATCH/DELETE` in `itsm.ts` (`GET→ tenantId scoped`), wire `ProblemList/RCA/KnownError/LinkModals` off `extraProblems` | `changesRepo.create 71` + `incidents addComment 194` | Unblocks core Problem/RCA/KEDB |
| **P0** | Wire `CMDB POST /cis`: `createCISchema` fix health enum `operational` vs `healthy 33`, `cmdbRepo.createCI`, `CmdbScope.createCI canWriteApp`, `POST /cis cmdb.write` → wire `Create/ImportCIModal` | `changesRepo.create` | Unblocks inventory seed + scope |
| **P0** | Wire `incidents POST /incidents` + `requests POST /requests` (catalog submit): shared schemas `createIncidentSchema`/`createRequestSchema`, repos, `POST` routes `incident.create`/`request.create` audit | `kb create 549` | Closes CREATE gap cascade |
| **P1** | Fix FE pagination: extend `list(query?:{page,pageSize,status,...})` `apiFetch({query})` `core.ts:29` + reuse `parsePagination`, add pager UI `ProblemList/CMDBList/KBBrowse/RequestQueue` | `incidentsRepo list 79` already paginated | Perf >100 rows |
| **P1** | Wire `CAB vote`: `POST /changes/:publicId/votes` `castVoteSchema strict decision approve/approve_with_conditions/reject/abstain+rationale`, `changesRepo.castVote` append `approvals[] 72`, status `in_review→approved\|rejected`, `scoped.castVote` `change.approve` per type variant, remove `CURRENT_USER 35` hardcode | `setStatus workflow` | Unblocks CAB lifecycle |
| **P1** | Wire `problems history/timeline`: `GET /problems/:publicId/timeline` from `AuditLog where tenantId,resourceKind Problem` (mirror `incidents timeline 121`), wire `KB helpful → POST /kb/feedback`, fix `cmdb health Zod` + wire `Detail getCI` not `list.find` | | Auditability |
| **P2** | Replace hardcodes `u-001→getActor(req).id`/`useCurrentUser()`, fix `NOW Date.now() 38` ticker, `RowActions` stubs, server `?status/source/search` pushdown + full-text `field:value` search | | Polish |

---

## 10. Preservation & Scope

- Wired writes follow `AGENTS.md` invariant: **never `prisma` in routes** (`eslint no-restricted-imports server/routes/**/*.ts 19` exempt `itsm.ts` is exempt but uses `req.scoped` correctly), global `requireAuth app.ts:126`, `ScopeViolationError` → `403 scope_violation`.
- `kb` currently `tenantId` only (global KB intentional), not app-scoped — document or wrap `kbRepo` in `ScopedDb` for consistency.
- No deletion of `AGENTS.md` lifedoc structure; changes append `Changelog | 2026-08-28 | … | — |`.

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | CRUD audit ITSM core 6 pages — consolidated matrix + file:line evidence + P0 fix table — following `docs/ui/audit/known-issues-sidebar/topbar` pattern | — |
| 2026-08-28 | Batch 3 complete — server pagination pushdown (problems/cmdb/kb), Pager component wired into 4 list pages, hardcode sweep (u-001/Sarah Chen → useCurrentUser), detail pages use direct `get()` | — |
