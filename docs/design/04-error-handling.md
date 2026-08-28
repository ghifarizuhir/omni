# 04 — Error Handling

Status: **Draft**
References: [`02-api-contract.md`](./02-api-contract.md) §Conventions, §Base, [`03-architecture.md`](./03-architecture.md) §Request lifecycle, §Invariants
Source of truth: [`server/app.ts`](../../server/app.ts) (`createApp:33`, `errorHandler:144`, `pinoHttp:60`), [`server/util.ts`](../../server/util.ts) (`HttpError:3`, `NotFoundError:10`, `asyncHandler:20`), [`server/scope/errors.ts`](../../server/scope/errors.ts) (`ScopeViolationError:9`), [`server/middleware/auth.ts`](../../server/middleware/auth.ts) (`requireAuth:43`, `requirePermission:48`), [`src/services/core.ts`](../../src/services/core.ts) (`ApiError:6`, `apiFetch:29`)

---

## Design principles

1. **Fail fast, fail loud.** Jangan swallow error tanpa log. Unknown → `logger.error({ err, path }, 'unhandled error')` di [`server/app.ts:157`](../../server/app.ts:157).
2. **Typed errors, bukan string.** Handler match by `instanceof` — `ScopeViolationError` vs `HttpError` vs duck-typed `issues` — tidak parse `message`.
3. **Boundary validation.** HTTP boundary pakai Zod — `schema.parse(req.body)` throw `ZodError.issues` → `400`. Deep service / `req.scoped.*` assume valid.
4. **Scope violation is 403, not 404.** `ScopeViolationError` → `403 { error:'scope_violation' }` ([`server/scope/errors.ts:22`](../../server/scope/errors.ts:22)). Tidak bocorkan existence.
5. **Correlation via `x-request-id`.** `pinoHttp` generate `requestId` (`x-request-id` header atau `randomUUID()`) di [`server/app.ts:63`](../../server/app.ts:63) — di-echo ke `res` header (`:65`) — log + response share ID.
6. **No try/catch for control flow.** `throw` untuk exceptional; "not found" → `HttpError(404)` atau `required(value, resource)` ([`server/util.ts:27`](../../server/util.ts:27)) eksplisit.

---

## Error taxonomy

Satu sumber mapping di [`server/app.ts:144`](../../server/app.ts:144) `errorHandler`. Urutan check = prioritas.

| Kategori | Class / Source | HTTP | Trigger | Response JSON shape + example |
|----------|---------------|------|---------|-------------------------------|
| Validation | `ZodError` duck-typed `issues` ([`server/app.ts:153`](../../server/app.ts:153)) | 400 | `schema.parse(req.body)` gagal — missing field, wrong type, `.strict()` unknown key | `{ message:'Validation failed', issues }` — ex: `{ issues:[{ path:['title'], code:'too_small', message:'...' }] }` |
| Auth | `HttpError(401)` ([`server/middleware/auth.ts:44`](../../server/middleware/auth.ts:44), [`server/util.ts:3`](../../server/util.ts:3)) | 401 | `!req.session` di `requireAuth` — missing/expired `ois_session` | `{ message:'Authentication required' }` — `apiFetch:48` dispatch `auth:session-expired` → `/login` |
| Forbidden (permission) | `HttpError(403)` ([`server/middleware/auth.ts:53`](../../server/middleware/auth.ts:53)) | 403 | `!req.permissions.has(perm)` — misal `cmdb.write` | `{ message:'Missing permission: cmdb.write' }` |
| Forbidden (scope) | `ScopeViolationError` ([`server/scope/errors.ts:9`](../../server/scope/errors.ts:9)) | 403 | `applicationId` di luar `writableApps`/`ownerApps` — `req.scoped.*` | `{ error:'scope_violation', module, action, applicationId }` via `toJSON:22` |
| Not found | `HttpError(404)` / `NotFoundError` ([`server/util.ts:10`](../../server/util.ts:10)) | 404 | `publicId` tidak ada — `required(val,'CI')` atau `if(!wrapped) throw 404` | `{ message:'CI not found' }` — ex: `{ message:'Incident not found' }` |
| Conflict/Business | `HttpError(409/422)` ([`server/util.ts:3`](../../server/util.ts:3)) | 409 / 422 | Duplicate `publicId`, invalid transition, `409` same-password | `{ message, body? }` — ex: `{ message:'Change already closed', body:{ currentStatus:'closed' } }` |
| Internal | unknown `Error` ([`server/app.ts:157`](../../server/app.ts:157)) | 500 | Unhandled throw, DB down, `scope not initialized` | `{ message:'Internal server error' }` + `logger.error` — no stack leak |

`server/app.ts:140` unmatched `/api/v1/*` → `404 { message:'Not found' }` adalah fallback route, bukan error middleware. `GET /ready 503` (`:113`) adalah health degradation.

---

## Backend: Error classes

### HttpError — [`server/util.ts:3`](../../server/util.ts:3)

```ts
// server/util.ts:3
export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'HttpError';
  }
}
export class NotFoundError extends HttpError {
  constructor(resource: string) { super(404, `${resource} not found`); this.name = 'NotFoundError'; }
}
export const required = <T>(value: T | null | undefined, resource: string): T => {
  if (value == null) throw new NotFoundError(resource); // server/util.ts:27
  return value;
};
export const asyncHandler = (fn: (req, res, next) => Promise<unknown>) =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); }; // server/util.ts:20
```

`throw new HttpError(status, msg, body?)` via `asyncHandler` → `next(err)` → `errorHandler`. `body` untuk `409` dengan `currentStatus`.

### ScopeViolationError — [`server/scope/errors.ts:9`](../../server/scope/errors.ts:9)

```ts
// server/scope/errors.ts:3
export interface ScopeViolation { module: string; action: ScopeAction; applicationId?: string; }
// ScopeAction = 'read' | 'create' | 'update' | 'delete'  [server/scope/errors.ts:1]

// server/scope/errors.ts:9
export class ScopeViolationError extends Error {
  readonly module: string; readonly action: ScopeAction; readonly applicationId?: string;
  constructor(v: ScopeViolation) {
    super(`scope_violation: ${v.module}.${v.action}${v.applicationId ? ` (app ${v.applicationId})` : ''}`);
    this.name = 'ScopeViolationError'; this.module = v.module; this.action = v.action; this.applicationId = v.applicationId;
  }
  toJSON() {
    return { error: 'scope_violation' as const, module: this.module, action: this.action, applicationId: this.applicationId };
  }
}
```

Terpisah dari `HttpError` karena `toJSON()` khusus + audit `scopeMode`. Dilempar dari `server/scope/scopedDb.ts:195` / `enforcement.ts` saat `POLICY` gagal.

### Penggunaan di route

```ts
// server/routes/cmdb.ts:40 — Zod + scoped + HttpError
cmdbRouter.patch('/cis/:publicId', requirePermission('cmdb.write'), asyncHandler(async (req, res) => {
  const body = updateCISchema.parse(req.body);           // ZodError → 400 via errorHandler:153
  const wrapped = await scoped(req).cmdb.updateCI(req.params.publicId, body);
  if (!wrapped) throw new HttpError(404, 'CI not found'); // server/util.ts:3
  await audit(req, { action:'update', resourceKind:'ConfigurationItem', ... });
  res.json(wrapped.result!.after);
}));
if (body.status === 'resolved') throw new HttpError(400, 'Use POST /incidents/:publicId/resolve');
if (!req.permissions?.has(perm)) throw new HttpError(403, `Missing permission: ${perm}`); // auth.ts:53
// scope violation otomatis dari req.scoped.* → ScopeViolationError → 403 scope_violation :145
```

---

## Backend: Global error handler

### Handler flowchart

```
throw (route / middleware / scopedDb)
  │
  ▼
asyncHandler catch → next(err)  [server/util.ts:20]
  │
  ▼
errorHandler  [server/app.ts:144]
  │
  ├─ err instanceof ScopeViolationError ? ─yes─► 403  err.toJSON()  [server/app.ts:145]
  │         [server/scope/errors.ts:9]             { error:'scope_violation', module, action, applicationId }
  ├─ err instanceof HttpError ? ──────────yes─► status { message, body }  [server/app.ts:149]
  │         [server/util.ts:3]
  ├─ 'issues' in err (ZodError) ? ────────yes─► 400 { message:'Validation failed', issues }  [server/app.ts:153]
  │         duck-typed, no zod import
  └─ else (unknown) ──────────────────────► 500 { message:'Internal server error' }
           logger.error({ err, path }, 'unhandled error')  [server/app.ts:157]
```

### Implementasi — [`server/app.ts:144`](../../server/app.ts:144)

```ts
// server/app.ts:144
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ScopeViolationError) { res.status(403).json(err.toJSON()); return; } // :145, errors.ts:22
  if (err instanceof HttpError) { res.status(err.status).json({ message: err.message, body: err.body }); return; } // :149
  if (err && typeof err === 'object' && 'issues' in err) { // ZodError duck-typed :153
    res.status(400).json({ message: 'Validation failed', issues: (err as { issues: unknown }).issues }); return;
  }
  logger.error({ err, path: req.path }, 'unhandled error'); // server/logger.ts:5
  res.status(500).json({ message: 'Internal server error' });
};
app.use(errorHandler); // server/app.ts:160 — terminal, setelah 404 fallback :140
```

Rules: urutan `instanceof` penting (`ScopeViolationError` sebelum `HttpError`); `issues` duck-typed hindari import `zod`; unknown tidak leak `stack`; 404 fallback (`:140`) handle unmatched path sebelum middleware.

---

## Zod boundary

Validasi di **awal handler**, sebelum `req.scoped.*` — tiap route `schema.parse(req.body)` inline.

| Route file | Schema source | Call |
|------------|--------------|------|
| [`server/routes/cmdb.ts:41`](../../server/routes/cmdb.ts:41) | `updateCISchema` from `src/shared/schemas/ci.ts:6` | `updateCISchema.parse(req.body)` |
| [`server/routes/events.ts:53,100`](../../server/routes/events.ts:53) | `setEventStatusSchema` (`src/shared/schemas/event.ts:9`), `ingestSchema` (`:78`) inline | `ingestSchema.parse(req.body)` |
| [`server/routes/incidents.ts:62,88,114`](../../server/routes/incidents.ts:62) | `addIncidentCommentSchema`, `resolveIncidentSchema` from `src/shared/schemas/incident.ts:14` | `resolveIncidentSchema.parse(req.body)` |
| [`server/routes/itsm.ts:64,74,119,184`](../../server/routes/itsm.ts:64) | `createChangeSchema:48`, `cancelChangeSchema:71`, `techAssessmentSchema:106` | `createChangeSchema.parse(req.body)` |
| [`server/routes/auth.ts:18`](../../server/routes/auth.ts:18) | `loginSchema:12` `z.object({ email, password })` | `loginSchema.parse(req.body)` |
| [`server/routes/admin.ts:127`](../../server/routes/admin.ts:127) | `createRoleSchema` from `server/lib/validation/rbac.ts:1` | `createRoleSchema.parse(req.body)` |

Shared schemas di `src/shared/schemas/` (`ci:6`, `event:9`, `incident:9`, `monitoringRule:9`, `alertRoute:7`, `change:17`, `request:19`, `kbArticle:15`) single-source client/server. `.strict()` menolak unknown keys; `.refine` enforce "at least one field".

### Issues array structure

`ZodError.issues` = `ZodIssue[]` — tiap issue `{ path, code, message }`. Handler tidak transform — langsung ke response ([`server/app.ts:154`](../../server/app.ts:154)).

```json
// 400 — POST /incidents/:id/comments body kosong
{ "message": "Validation failed", "issues": [
  { "path": ["body"], "code": "too_small", "message": "Comment cannot be empty" },
  { "path": ["status"], "code": "invalid_enum_value", "message": "Invalid enum value. Expected 'new' | 'triaging' | ..." }
]}
```

Frontend pakai `path` untuk mapping ke field (inline form error). Tidak ada wrapper `details` — flat `{ message, issues }`, beda Terra `{ error, code, details:{ issues } }` (Open Items).

---

## Logging & correlation

### pino + pinoHttp — [`server/app.ts:60`](../../server/app.ts:60), [`server/logger.ts:5`](../../server/logger.ts:5)

```ts
// server/app.ts:60
app.use(pinoHttp({
  logger, // server/logger.ts:5 pino({ level: LOG_LEVEL ?? 'info', redact: ['req.headers.cookie', ...] })
  genReqId: (req, res) => {
    const id = (req.headers['x-request-id'] as string) ?? randomUUID(); // :63
    res.setHeader('x-request-id', id); return id;                        // :65 echo
  },
  customLogLevel: (_req, res, err) => {               // server/app.ts:68
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn'; return 'info';
  },
}));
```

- `genReqId` — baca `x-request-id` atau `randomUUID()`, echo ke header untuk korelasi `curl -H x-request-id:foo`.
- `customLogLevel` — `5xx`/`err`→`error`, `4xx`→`warn`, else `info`. `errorHandler` tambah `logger.error({ err, path })` untuk 500 agar `stack` ikut.
- Redaksi [`server/logger.ts:10`](../../server/logger.ts:10) `redact: ['req.headers.cookie', 'req.headers.authorization', '*.passwordHash']`.
- Skip under test [`server/app.ts:31`](../../server/app.ts:31) `isTest` — `pinoHttp` tidak mount saat `vitest`.

| Status | Log level | Response body |
|--------|-----------|---------------|
| 400 Zod | `warn` via `customLogLevel` | `{ message:'Validation failed', issues }` |
| 401/403 `HttpError` | `warn` | `{ message, body? }` |
| 403 `scope_violation` | `warn` | `{ error:'scope_violation', module, action, applicationId }` |
| 500 unknown | `error` ([`server/app.ts:157`](../../server/app.ts:157)) | `{ message:'Internal server error' }` — generic, no leak |

> Terra contrast: Terra selalu include `requestId` di body `{ error, code, details, requestId }` + header. OIS hanya echo header — body `requestId` belum ada (Open Items).

---

## Frontend handling

### ApiError — [`src/services/core.ts:6`](../../src/services/core.ts:6)

```ts
// src/services/core.ts:6
export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message); this.name = 'ApiError';
  }
}
export class NotFoundError extends ApiError { constructor(r: string) { super(404, `${r} not found`); } }
// src/services/core.ts:29
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ... });
  const json = text ? JSON.parse(text) as unknown : null;
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new CustomEvent('auth:session-expired', // :54
      { detail:{ from: window.location.pathname + window.location.search } }));
    throw new ApiError(res.status, (json as { message?: string })?.message ?? res.statusText, json);
  }
  return json as T;
}
```

`ApiError.body` simpan raw JSON — caller baca `issues` (400), `error:'scope_violation'` (403 scope), atau `body` (409). Tanpa `code` enum — branch via `status` + shape sniffing.

### Toast vs redirect

| HTTP | Frontend action | Detail |
|------|----------------|--------|
| 400 `issues` | **Inline field error** — map `issues[].path` ke form via `zodResolver` | Client Zod (same schema) = 1st defense; server `issues` = truth |
| 401 | **Silent redirect** — `apiFetch:48` → `auth:session-expired` → `navigate('/login')`. Login 401 difilter via `pathname==='/login'` | `src/routes/Login.tsx:50` `err.status===401` → `Invalid email or password` |
| 403 `scope_violation` | **Toast** — `You do not have access to this application scope` + `ref: x-request-id` | `applicationId` untuk debug; tidak retry |
| 403 permission | **Toast / hide** — `Missing permission: cmdb.write`; prefer hide button via RBAC gate | Toast fallback jika race |
| 404 | **Empty state / NotFound** — `<NotFound resource="CI" />` | Mirror `required()` helper |
| 409/422/500 | **Toast** — business message atau `Server error. Tim teknis sudah diberitahu.` + `ref` | `fetch` TypeError → `Tidak bisa terhubung ke server.` |

`useResource` / `useMutation` ([`src/services/core.ts:74`](../../src/services/core.ts:74)) expose `{ data, loading, error, refresh }`. `error` adalah `ApiError` — `if (error instanceof ApiError && error.status===404)` tanpa parse string. Tidak auto-retry 4xx; retry manual via `refresh()`.

### Conventions — Do / Don't

| ✅ Do | ❌ Don't |
|-------|---------|
| Throw specific class (`HttpError`, `ScopeViolationError`) | Generic `throw new Error('…')` — hilang `status` |
| Validate at boundary (`schema.parse` di route top) | Validate ulang di deep repo — duplikasi |
| Wrap async routes dengan `asyncHandler` ([`server/util.ts:20`](../../server/util.ts:20)) | Bare `async (req,res)=>{ throw … }` — hang |
| Log `warn` 4xx / `error` 5xx via `customLogLevel` ([`server/app.ts:68`](../../server/app.ts:68)) | `console.error` ad-hoc |
| Tampilkan `x-request-id` di toast (dari header) | Parse `error.message` untuk branch — pakai `status` |
| Client validate dulu (same schema), server validate lagi | Return `200 { ok:false }` — pakai status code |

---

## Open Items

- [ ] Standarisasi `code` enum (`ERR_VALIDATION`, `ERR_SCOPE` …) seperti Terra — saat ini `status` + `error:'scope_violation'` split. Migrasi ke `{ error, code, details, requestId }` butuh sync [`02-api-contract.md`](./02-api-contract.md) + [`src/services/core.ts:6`](../../src/services/core.ts:6).
- [ ] `details` vs `body` vs `issues` — unify ke `{ code, message, details?, requestId }` (Terra shape) dengan `details.issues` untuk validation.
- [ ] Include `requestId` di response body (selain `x-request-id` header [`server/app.ts:65`](../../server/app.ts:65)) untuk SDK parity — butuh `req.id` augmentation.
- [ ] `ApiError` helpers (`isValidation()`, `isScopeViolation()`) seperti Terra — saat ini sniff `status` + `body.error`. Tambah di [`src/services/core.ts:6`](../../src/services/core.ts:6).

---

## Resolved Decisions

| # | Keputusan | Rationale | Tanggal |
|---|-----------|-----------|---------|
| 1 | `Zod issues` duck-typed `‘issues’ in err` → `400` tanpa wrapper class | Tanpa import `zod` di `app.ts`; konsisten [`server/app.ts:153`](../../server/app.ts:153) | M3 |
| 2 | `ScopeViolationError` terpisah dari `HttpError` | Butuh `toJSON()` khusus + audit `scopeMode` | 2026-05-15 |
| 3 | Urutan `ScopeViolation → HttpError → Zod → 500` | Prioritas deterministik; scope paling spesifik duluan | M6 |
| 4 | `asyncHandler` wajib untuk semua async route ([`server/util.ts:20`](../../server/util.ts:20)) | Tanpa itu throw tidak tertangkap Express → hang | awal |
| 5 | `ApiError` simpan `status + message + body` tanpa `code` enum | Simple; `status` + shape sniffing cukup. Terra `code` ditunda | M6.6 |
| 6 | 401 → `auth:session-expired` DOM event ([`src/services/core.ts:54`](../../src/services/core.ts:54)) | Keep `services/core` tanpa coupling `lib/auth`; filter login 401 via `pathname` | M6.6 |
| 7 | `x-request-id` via `pinoHttp.genReqId` ([`server/app.ts:63`](../../server/app.ts:63)) | Correlation toast→log; `randomUUID()` fallback | M5 |
| 8 | 404 fallback ([`server/app.ts:140`](../../server/app.ts:140)) sebelum errorHandler | Unmatched path bukan throw — return sinkron | M6.9 |
| 9 | `customLogLevel` `4xx→warn`, `5xx→error` ([`server/app.ts:68`](../../server/app.ts:68)) | Noise reduction | M5 |
| 10 | Shared Zod schemas `src/shared/schemas/*` untuk client+server | Single source — hindari drift | M6.7 |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Deepen error handling — taxonomy (7 kategori), handler flowchart, class snippets, Zod boundary table, logging correlation, frontend ApiError+toast/redirect, Do/Don't, open items & resolved decisions | `server/app.ts:33,60,144`, `server/util.ts:3`, `server/scope/errors.ts:9`, `server/middleware/auth.ts:43`, `src/services/core.ts:6` |
| 2026-08-28 | Init error handling — taxonomy + HttpError/ScopeViolation + middleware `server/app.ts:144` | — |
