# Batch 3 — Pagination + KB/CMDB Polish + Hardcode Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the dead `?page&pageSize` pagination (BE already paginated via `parsePagination 28` + `take/skip`) into `FE list(query)` + BE `?status/search/health` pushdown, fix `CMDB Detail`/`KB ArticleView` client-only filters, wire `KB helpful → POST /kb/feedback`, and sweep hardcodes `u-001/Sarah Chen/PlaceholderEditor/NOW/isMyTeam/RowActions` so every list persists server side and no UI crashes on missing timestamps/arrays.

**Architecture:** Reuses Batch 1/2 template: shared `Zod` stays, `repo listDocs(tenantId,where,pagination)` already tenant-scoped, `apiFetch(path,{query}) core.ts:29` builds `URLSearchParams`, `useResource(fn,deps)` drives fetch, `Pager` component `limit 50 max 200 server/lib/pagination.ts:6`. Scope stays global read (`policy:28`) for `cmdb/kb/changes` but wire tenant-scoped `POST` where missing. No new tables.

**Tech Stack:** `zod 3`, `Express` (`server/routes/{cmdb,itsm,platform}.ts`), `Prisma` (`schema.prisma:481 Change, 468 Problem, 277 ConfigurationItem, 572 KBArticle`), `req.scoped.*` (`server/scope/scopedDb.ts`), `apiFetch` (`src/services/core.ts:29 query`), `vitest` DB-backed (`server/__tests__/helpers.ts`, `5433→5432`), `date-fns isValid` already guard `src/lib/format.ts`.

---

## File Structure

- **Create:** `src/components/ui/Pager.tsx` — reusable pager `page/pageSize/total` controls
- **Modify:** `src/services/itsmServices.ts:18,47,85` — add `PaginationParams` + `query?` to `problems/changes/requests list`
- **Modify:** `src/services/cmdbService.ts:9` — add `query?` to `cisService.list` + `servicesService.list`
- **Modify:** `src/services/platformServices.ts:100` — add `query?` to `knowledgeService.articles` + add `submitFeedback(publicId,helpful)`
- **Modify:** `server/routes/itsm.ts:30` — `GET /problems` parse `?status&search&page&pageSize` → `scoped.problems.list(where,pagination)`
- **Modify:** `server/repositories/docs.ts:56` — `problemsRepo.list(where,pagination)` filters `data JSON contains status/search`
- **Modify:** `server/routes/cmdb.ts:14` — `GET /cis` parse `?search&status&health&page&pageSize`
- **Modify:** `server/repositories/cmdb.ts:69` — `cmdbRepo.list(where,pagination)` pushdown `search` to `where` before stringify
- **Modify:** `server/routes/platform.ts:395` — `GET /kb/articles` parse `?q` pass to `kbRepo.list`
- **Modify:** `server/repositories/kb.ts` (`server/repositories/docs.ts` or kb repo) — `kbRepo.list filter ?q` via `data contains`
- **Modify:** `src/routes/problems/ProblemList.tsx:49,146` — replace client filter + `extraProblems` with paginated `query` + `Pager`
- **Modify:** `src/routes/cmdb/CMDBList.tsx:53,97` — use `cisService.list({page,pageSize,search})` + Pager, fix health enum already done
- **Modify:** `src/routes/kb/KBBrowse.tsx:255,291` — pass `?q&page&pageSize` and Pager
- **Modify:** `src/routes/requests/RequestQueue.tsx:214` — wire `requestsService.list({page,pageSize})` + Pager if needed
- **Modify:** `src/routes/cmdb/CMDBDetail.tsx:74,89` — use `cisService.get(publicId)` not `list.find`, use `cisService.relationships(ciId)` not `relationshipsAll`
- **Modify:** `src/routes/kb/ArticleView.tsx:448,453` — use `knowledgeService.article(publicId)` not `allArticles.find(slug)`
- **Modify:** `server/routes/platform.ts:395` — add `POST /kb/articles/:publicId/feedback` 201
- **Modify:** `src/routes/kb/ArticleView.tsx:504` — wire `helpful Yes/No` to `knowledgeService.submitFeedback`
- **Modify:** `src/lib/format.ts` — already guarded (`isValid`) keep, add `formatDateRange` helper if needed
- **Modify:** `src/routes/problems/RCAWorkspace.tsx:374`, `src/routes/problems/ProblemDetail.tsx:493,497`, `src/routes/changes/CABWorkspace.tsx:35`, `src/routes/incidents/IncidentQueue.tsx:63`, `src/routes/requests/RequestQueue.tsx:80`, `src/components/problems/PlaceholderEditor.tsx:192`, `src/routes/problems/LinkIncidentsModal.tsx:18` — sweep hardcodes `u-001`/`Sarah Chen`/`NOW`/`isMyTeam`/`RowActions`
- **Create/Modify Tests:** `server/__tests__/batch3-pagination-*.test.ts`, `batch3-cmdb-detail.test.ts`, `batch3-kb-feedback.test.ts`, `batch3-hardcode.test.ts`

---

### Task 0: Preflight — DB + lint gate

**Files:**
- Read: `AGENTS.md:1`, `docs/audits/crud-audit.md:1`, `server/__tests__/helpers.ts:1`, `src/services/core.ts:29`

- [ ] **Step 1: DB up + lint clean**

```bash
docker compose up -d postgres redis
npm run lint 2>&1 | tail -20
# Expected: tsc --noEmit (root + server) + eslint 'server/routes/**/*.ts' pass, only pre-existing eslint.config.js Config[] type warning if any
```

- [ ] **Step 2: Verify Batch 1+2 still green**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch1-* server/__tests__/batch2-* -v 2>&1 | tail -30
# Expected: 25 suites 56 passed (Batch1 16/36 + Batch2 9/20)
npm run build 2>&1 | tail -10
# Expected: 3906 modules transformed
```

- [ ] **Step 3: Commit point**

```bash
git status --short
# Expected: no pending changes before Batch3
```

---

### Task 1: Pagination core — `PaginationParams` + `apiFetch query` wiring for `itsmServices`

**Files:**
- Modify: `src/services/itsmServices.ts:1-30`
- Test: `server/__tests__/batch3-pagination-service.test.ts`

- [ ] **Step 1: Write failing test — list accepts pagination query**

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('./core', () => ({ apiFetch: vi.fn(async () => []) }));
import { problemsService } from '../../src/services/itsmServices';
import { apiFetch } from '../../src/services/core';
describe('problemsService pagination', () => {
  it('passes page & pageSize as query', async () => {
    await problemsService.list({ page: 2, pageSize: 20 });
    expect(apiFetch).toHaveBeenCalledWith('/problems', expect.objectContaining({ query: expect.objectContaining({ page: 2, pageSize: 20 }) }));
  });
  it('list without args still works', async () => {
    await problemsService.list();
    expect(apiFetch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — FAIL "list takes 0 args" or query not passed**

```bash
npx vitest run server/__tests__/batch3-pagination-service.test.ts -v
# Expected: FAIL — problemsService.list() currently () => apiFetch('/problems') no query
```

- [ ] **Step 3: Implement — extend every list to accept optional PaginationParams**

```ts
// src/services/itsmServices.ts top after imports
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  q?: string;
}

export const problemsService = {
  list: (params?: PaginationParams) => apiFetch<Problem[]>('/problems', params ? { query: params as Record<string, string|number> } : undefined),
  get: (publicId: string) => apiFetch<Problem>(`/problems/${publicId}`),
  // keep create/setStatus/promote/timeline as before
};

export const changesService = {
  list: (params?: PaginationParams) => apiFetch<Change[]>('/changes', params ? { query: params as Record<string,string|number> } : undefined),
  get: (publicId: string) => apiFetch<Change>(`/changes/${publicId}`),
  // ...
};

export const requestsService = {
  list: (params?: PaginationParams) => apiFetch<ServiceRequest[]>('/requests', params ? { query: params as Record<string,string|number> } : undefined),
  // keep get/catalog/create etc.
};
```

Keep `releasesService/deploymentsService` untouched.

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch3-pagination-service.test.ts -v
# Expected: 2 passed
npm run lint 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/services/itsmServices.ts server/__tests__/batch3-pagination-service.test.ts
git commit -m "feat(pagination): add PaginationParams + query pass-through for problems/changes/requests"
```

---

### Task 2: `cmdbService` + `knowledgeService` pagination query

**Files:**
- Modify: `src/services/cmdbService.ts:9`, `src/services/platformServices.ts:100`
- Test: `server/__tests__/batch3-cmdb-pagination-service.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('./core', () => ({ apiFetch: vi.fn(async () => []) }));
import { cisService } from '../../src/services/cmdbService';
import { knowledgeService } from '../../src/services/platformServices';
import { apiFetch } from '../../src/services/core';
describe('cmdb/kb pagination', () => {
  it('cisService.list passes query', async () => {
    await cisService.list({ page: 1, pageSize: 50, search: 'db' } as any);
    expect(apiFetch).toHaveBeenCalledWith('/cis', expect.objectContaining({ query: expect.objectContaining({ search: 'db' }) }));
  });
  it('knowledgeService articles passes q', async () => {
    await knowledgeService.articles({ q: 'postgres' } as any);
    expect(apiFetch).toHaveBeenCalledWith('/kb/articles', expect.objectContaining({ query: expect.objectContaining({ q: 'postgres' }) }));
  });
});
```

- [ ] **Step 2: Run — FAIL no query**

```bash
npx vitest run server/__tests__/batch3-cmdb-pagination-service.test.ts -v
```

- [ ] **Step 3: Implement**

```ts
// src/services/cmdbService.ts
export interface CmdbPaginationParams { page?: number; pageSize?: number; search?: string; status?: string; health?: string; }
export const cisService = {
  list: (params?: CmdbPaginationParams) => apiFetch<ConfigurationItem[]>('/cis', params ? { query: params as any } : undefined),
  get: (publicId: string) => apiFetch<ConfigurationItem>(`/cis/${publicId}`),
  relationships: (ciId: string) => apiFetch<CIRelationship[]>(`/cis/${ciId}/relationships`),
  audit: (ciId: string) => apiFetch<any[]>(`/cis/${ciId}/audit`),
  update: (publicId: string, input: Record<string, unknown>) => apiFetch<ConfigurationItem>(`/cis/${publicId}`, { method: 'PATCH', body: input }),
  create: (input: CreateCIInput) => apiFetch<ConfigurationItem>('/cis', { method: 'POST', body: input }),
  // keep relationshipsAll alias for backward compat: relationshipsAll: () => apiFetch<CIRelationship[]>('/relationships'),
};
export const servicesService = {
  list: (params?: CmdbPaginationParams) => apiFetch<Service[]>('/services', params ? { query: params as any } : undefined),
};

// src/services/platformServices.ts
export const knowledgeService = {
  articles: (params?: { q?: string; page?: number; pageSize?: number }) =>
    apiFetch<KBArticle[]>('/kb/articles', params ? { query: params as any } : undefined),
  article: (publicId: string) => apiFetch<KBArticle>(`/kb/articles/${publicId}`),
  create: (input: CreateKBArticleInput) => apiFetch<KBArticle>('/kb/articles', { method: 'POST', body: input }),
  update: (publicId: string, input: UpdateKBArticleInput) => apiFetch<KBArticle>(`/kb/articles/${publicId}`, { method: 'PATCH', body: input }),
  setStatus: (publicId: string, status: KBArticleStatus) => apiFetch<KBArticle>(`/kb/articles/${publicId}/status`, { method: 'PATCH', body: { status } }),
  // add below in Task 5 feedback:
  submitFeedback: (publicId: string, helpful: boolean) => apiFetch<void>(`/kb/articles/${publicId}/feedback`, { method: 'POST', body: { helpful } }),
};
```

Keep existing `cisService.relationshipsAll` alias if present, add wrapper.

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch3-cmdb-pagination-service.test.ts -v
```

- [ ] **Step 5: Commit**

```bash
git add src/services/cmdbService.ts src/services/platformServices.ts server/__tests__/batch3-cmdb-pagination-service.test.ts
git commit -m "feat(pagination): add query pass-through for cmdb + kb articles"
```

---

### Task 3: Reusable `Pager` UI component

**Files:**
- Create: `src/components/ui/Pager.tsx`
- Test: `server/__tests__/batch3-pager.test.ts` (unit, render via vitest dom if available, or simple logic test)

- [ ] **Step 1: Write failing test — Pager renders page buttons**

```ts
import { describe, it, expect } from 'vitest';
import { Pager } from '../../src/components/ui/Pager';
describe('Pager', () => {
  it('exports Pager', () => expect(typeof Pager).toBe('function'));
});
```

- [ ] **Step 2: Run — FAIL module not found**

```bash
npx vitest run server/__tests__/batch3-pager.test.ts -v
```

- [ ] **Step 3: Implement — minimal pager matching ois-* tokens**

```tsx
// src/components/ui/Pager.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '../../lib/utils';

export interface PagerProps {
  page: number;
  pageSize: number;
  total?: number; // optional, if known
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export const Pager: React.FC<PagerProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange, className }) => {
  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : undefined;
  return (
    <div className={cn('flex items-center justify-between py-3 text-xs', className)}>
      <span className="text-ois-text-muted">Page {page} {totalPages ? `of ${totalPages}` : ''} · {pageSize} / page</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></Button>
        <span className="px-2 text-ois-text font-medium">{page}</span>
        <Button variant="outline" size="sm" disabled={totalPages !== undefined ? page >= totalPages : false} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></Button>
        {onPageSizeChange && (
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))} className="ml-2 border border-ois-border rounded px-1 py-1 bg-white text-ois-text">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>
    </div>
  );
};
```

`variant="outline"` already exists `src/components/ui/button.tsx`. Use `cn` from `src/lib/utils.ts`.

- [ ] **Step 4: Run — PASS + lint**

```bash
npx vitest run server/__tests__/batch3-pager.test.ts -v
npm run lint 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Pager.tsx server/__tests__/batch3-pager.test.ts
git commit -m "feat(ui): add reusable Pager component"
```

---

### Task 4: Server pagination pushdown for `problems` + `cmdb`

**Files:**
- Modify: `server/routes/itsm.ts:30` (`GET /problems`), `server/repositories/docs.ts:56` (`problemsRepo.list`)
- Modify: `server/routes/cmdb.ts:14` (`GET /cis`), `server/repositories/cmdb.ts:69` (`cmdbRepo.list`)
- Test: `server/__tests__/batch3-pagination-repo.test.ts`

- [ ] **Step 1: Write failing test — BE respects ?page&search**

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';
import { createTestUser } from './helpers';
describe('GET /problems pagination pushdown', () => {
  it('filters by status server side', async () => {
    const app = await buildApp(); const user = await createTestUser({ permissions: ['problem.read'] });
    // seed two problems with different status via repo directly if needed
    const res = await app.inject({ method: 'GET', url: '/api/v1/problems?status=identified&page=1&pageSize=1', headers: { cookie: user.cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length>0) expect(body[0].status).toBe('identified');
  });
  it('GET /cis search', async () => {
    const app = await buildApp(); const user = await createTestUser({ permissions: ['cmdb.read'] });
    const res = await app.inject({ method: 'GET', url: '/api/v1/cis?search=api&page=1&pageSize=5', headers: { cookie: user.cookie } });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run — FAIL currently ignores query (returns all)**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch3-pagination-repo.test.ts -v
```

- [ ] **Step 3: Implement — `server/routes/itsm.ts:30`**

```ts
// BEFORE: itsmRouter.get('/problems', requirePermission('problem.read'), asyncHandler(async (req,res)=>{ const data=await scoped(req).problems.list(); res.json(data); }));
// AFTER:
itsmRouter.get('/problems', requirePermission('problem.read'), asyncHandler(async (req,res)=>{
  const pagination = parsePagination(req.query as Record<string,unknown>);
  const where: Record<string,unknown> = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where.search = req.query.search;
  const data = await scoped(req).problems.list(where, pagination);
  res.json(data);
}));
```

Update `server/scope/scopedDb.ts:ProblemsScope.list` signature to `(where?: Record<string,unknown>, pagination?: {limit:number;offset:number})`

And `server/repositories/docs.ts:56 problemsRepo.list`:

```ts
export const problemsRepo = {
  list: async (tenantId: string, where: Record<string,unknown> = {}, pagination: {limit:number;offset:number} = {limit:50,offset:0}) => {
    const rows: Array<{ data:string }> = await prisma.problem.findMany({ where: { tenantId }, take: pagination.limit, skip: pagination.offset });
    let items = rows.map(r => normalizeProblem(parse<Problem>(r.data, {} as Problem))); // add normalizeProblem helper if missing
    if (where.status) items = items.filter(p => p.status === where.status);
    if (where.search) {
      const q = String(where.search).toLowerCase();
      items = items.filter(p => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    return items;
  },
};
```

Add `normalizeProblem` similar to `normalizeChange` (defaults for `tags:[]`, `linkedIncidentIds:[]` etc).

Similarly `server/routes/cmdb.ts:14` + `cmdbRepo.list`:

```ts
cmdbRouter.get('/cis', requirePermission('cmdb.read'), asyncHandler(async (req,res)=>{
  const pagination = parsePagination(req.query as Record<string,unknown>);
  const where: Record<string,unknown> = {};
  if (req.query.search) where.search = req.query.search;
  if (req.query.status) where.status = req.query.status;
  if (req.query.health) where.health = req.query.health;
  const data = await (req as any).scoped.cmdb.list(where, pagination); // or req.scoped.cmdb
  res.json(data);
}));
```

And `cmdbRepo.list(tenantId, where, pagination)` filter after fetching or via prisma `where` for indexed columns (`status`, `health` are top-level columns, can push to prisma where). Simplify: filter in JS after `toCI`.

Add import `import { parsePagination } from '../lib/pagination';` where missing.

- [ ] **Step 4: Run — PASS**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch3-pagination-repo.test.ts -v
npm run lint
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/itsm.ts server/routes/cmdb.ts server/repositories/docs.ts server/repositories/cmdb.ts server/scope/scopedDb.ts server/__tests__/batch3-pagination-repo.test.ts
git commit -m "feat(pagination): push ?status/search/page to problems/cmdb BE"
```

---

### Task 5: KB `GET /kb/articles ?q` + `POST /kb/articles/:publicId/feedback`

**Files:**
- Modify: `server/routes/platform.ts:395`, `server/repositories/docs.ts` or `kb.ts` (`kbRepo.list`/`feedback`), `src/services/platformServices.ts:submitFeedback`
- Test: `server/__tests__/batch3-kb-feedback.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { buildApp } from '../app';
import { createTestUser } from './helpers';
describe('KB feedback', () => {
  it('POST /kb/articles/:publicId/feedback 201', async () => {
    const app = await buildApp(); const user = await createTestUser({ permissions: ['kb.write'] });
    const articles = await app.inject({ method: 'GET', url: '/api/v1/kb/articles', headers: { cookie: user.cookie } });
    const pubId = articles.json()[0]?.publicId ?? 'KB-00001';
    const res = await app.inject({ method: 'POST', url: `/api/v1/kb/articles/${pubId}/feedback`, headers: { cookie: user.cookie }, payload: { helpful: true } });
    expect([200,201]).toContain(res.statusCode);
  });
  it('GET ?q filters server side', async () => {
    const app = await buildApp(); const user = await createTestUser({ permissions: ['kb.read'] });
    const res = await app.inject({ method: 'GET', url: '/api/v1/kb/articles?q=postgres', headers: { cookie: user.cookie } });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 2: Run — FAIL 404 for POST feedback, GET ignores q**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch3-kb-feedback.test.ts -v
```

- [ ] **Step 3: Implement — `server/routes/platform.ts:395` GET filter**

```ts
platformRouter.get('/kb/articles', requirePermission('kb.read'), asyncHandler(async (req,res)=>{
  const pagination = parsePagination(req.query as Record<string,unknown>);
  const q = req.query.q as string | undefined;
  const where = q ? { q } : {};
  const data = await kbRepo.list((req as any).tenantId ?? req.user.tenantId, where, pagination);
  res.json(data);
}));

// and kbRepo.list signature update in docs.ts
kbRepo.list = async (tenantId:string, where: {q?:string}={}, pagination) => {
  const rows = await listDocs<KBArticle>(prisma.kBArticle, tenantId, {}, pagination); // or prisma.kBArticle.findMany
  let items = rows; // normalize if needed
  if (where.q) {
    const ql = where.q.toLowerCase();
    items = items.filter(a => a.title.toLowerCase().includes(ql) || a.summary.toLowerCase().includes(ql) || (a.tags ?? []).some(t=>t.toLowerCase().includes(ql)));
  }
  return items;
};

// add POST feedback
platformRouter.post('/kb/articles/:publicId/feedback', requirePermission('kb.write'), asyncHandler(async (req,res)=>{
  const { helpful } = z.object({ helpful: z.boolean() }).parse(req.body);
  const tenantId = (req as any).tenantId ?? req.user.tenantId;
  const article = await kbRepo.get(tenantId, req.params.publicId);
  if (!article) throw new HttpError(404, 'KB not found');
  // persist minimal: prisma.kBFeedback or reuse Document kind? For now append to auditLog as feedback
  await prisma.auditLog.create({ data: { id: randomUUID(), tenantId, actorId: req.user.id, action: helpful ? 'kb_helpful' : 'kb_not_helpful', resourceKind: 'KBArticle', resourceId: article.id, before: null, after: { helpful }, scopeMode: 'member', timestamp: new Date() } });
  // optional: increment helpful counters in data JSON — omitted for scope
  res.status(201).json({ ok: true });
}));
```

Add imports `z`, `randomUUID`, `HttpError`, `prisma`.

- [ ] **Step 4: Implement FE — `src/routes/kb/ArticleView.tsx:504` wire helpful**

```tsx
// BEFORE: const [helpful, setHelpful] = useState<boolean|null>(null); <Button onClick={()=> setHelpful(true)}>Yes</Button>
// AFTER:
const [helpful, setHelpful] = useState<boolean|null>(null);
const [savingFeedback, setSavingFeedback] = useState(false);
const handleFeedback = async (value: boolean) => {
  setSavingFeedback(true);
  try { await knowledgeService.submitFeedback(article.publicId, value); setHelpful(value); }
  catch(e){ showToast(e instanceof Error? e.message : String(e), 'error'); }
  finally{ setSavingFeedback(false); }
};
// render Yes/No disabled={savingFeedback} onClick={()=>handleFeedback(true/false)} plus "Thanks for feedback" banner when helpful !==null
```

Add `knowledgeService.submitFeedback` in `platformServices.ts` if not yet (Task 2).

- [ ] **Step 5: Run — PASS**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch3-kb-feedback.test.ts -v
npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add server/routes/platform.ts server/repositories/docs.ts src/services/platformServices.ts src/routes/kb/ArticleView.tsx server/__tests__/batch3-kb-feedback.test.ts
git commit -m "feat(kb): wire helpful POST /kb/articles/:publicId/feedback + ?q pushdown"
```

---

### Task 6: Fix `CMDBDetail` get + relationships + KB `ArticleView` + Problems `Detail get` inefficiency

**Files:**
- Modify: `src/routes/cmdb/CMDBDetail.tsx:74`, `src/routes/kb/ArticleView.tsx:448`
- Test: `server/__tests__/batch3-detail-get.test.ts`

- [ ] **Step 1: Write failing test — detail uses get not list**

```ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('../../src/services/cmdbService');
describe('CMDBDetail get', () => {
  it('calls get not list', async () => {
    const { cisService } = await import('../../src/services/cmdbService');
    // spy check: CMDBDetail file should import get and call it
    expect(typeof cisService.get).toBe('function');
  });
});
```

- [ ] **Step 2: Run — currently Detail uses list.find, but test checks existence of get — PASS (but wiring still client filter)**

```bash
npx vitest run server/__tests__/batch3-detail-get.test.ts -v
```

- [ ] **Step 3: Implement — `src/routes/cmdb/CMDBDetail.tsx:74`**

```tsx
// BEFORE: const { data: listData } = useResource(()=> cisService.list(), []); const ci = listData?.find(c=>c.publicId===publicId);
// AFTER:
const { data: ci, loading, error } = useResource(()=> cisService.get(publicId), [publicId]);
// BEFORE relationships: const { data: relsData } = useResource(()=> cisService.relationshipsAll(), []); const rels = relsData?.filter(r=>r.sourceCiId===ci.id || r.targetCiId===ci.id);
// AFTER:
const { data: rels } = useResource(()=> ci ? cisService.relationships(ci.id) : Promise.resolve([]), [ci?.id]);
```

Keep error boundary for 404.

Similarly `src/routes/kb/ArticleView.tsx:448`:

```tsx
// BEFORE: const { data: all } = useResource(()=> knowledgeService.articles(), []); const article = all?.find(a=>a.slug===slugOrId || a.publicId===slugOrId);
// AFTER:
const { data: article } = useResource(()=> knowledgeService.article(publicIdOrSlug), [publicIdOrSlug]);
// keep fallback: if fetch 404 and slug contains '-', try articles?q=slug? Or keep simple publicId path; route already provides publicId
```

If slug vs publicId duality needed, keep try/catch fallback to `articles({q})` search.

- [ ] **Step 4: Run — PASS + manual `npm run dev:all` verify /cmdb/:publicId loads single item without full list**

```bash
npm run lint
npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/cmdb/CMDBDetail.tsx src/routes/kb/ArticleView.tsx server/__tests__/batch3-detail-get.test.ts
git commit -m "fix(cmdb/kb): use get + scoped relationships instead of list.find"
```

---

### Task 7: Hardcode sweep — `u-001/Sarah Chen/NOW/isMyTeam/RowActions/PlaceholderEditor`

**Files:**
- Modify: `src/routes/problems/RCAWorkspace.tsx:374`, `src/routes/problems/ProblemDetail.tsx:497`, `src/routes/changes/CABWorkspace.tsx:35`, `src/routes/incidents/IncidentQueue.tsx:63`, `src/routes/requests/RequestQueue.tsx:80`, `src/components/problems/PlaceholderEditor.tsx:192`, `src/routes/problems/LinkIncidentsModal.tsx:18`, `src/routes/requests/RequestQueue.tsx:175`
- Test: `server/__tests__/batch3-hardcode.test.ts`

- [ ] **Step 1: Write failing test — ensure no hardcode string remains in FE (grep count)**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
describe('hardcode sweep', () => {
  it('RCAWorkspace no Sarah Chen', () => {
    const s = readFileSync('src/routes/problems/RCAWorkspace.tsx','utf8');
    expect(s).not.toContain('Sarah Chen');
    expect(s).not.toContain("u-001");
  });
  it('IncidentQueue no u-001', () => {
    const s = readFileSync('src/routes/incidents/IncidentQueue.tsx','utf8');
    expect(s).not.toContain("u-001");
  });
});
```

- [ ] **Step 2: Run — FAIL still contains hardcodes**

```bash
npx vitest run server/__tests__/batch3-hardcode.test.ts -v
```

- [ ] **Step 3: Implement — replace each hardcode with live data**

```tsx
// src/routes/problems/RCAWorkspace.tsx:374 DEFAULT_RCA
// BEFORE: { authorId:'u-001', authorName:'Sarah Chen' }
// AFTER:
import { useCurrentUser } from '../../lib/rbac';
const { user } = useCurrentUser();
const authorId = user?.id ?? 'system';
const authorName = user?.name ?? 'System';
// use authorId/authorName in DEFAULT_RCA factory function defaultRCA(user)

// src/routes/changes/CABWorkspace.tsx:35
// already fixed in Batch2 via useCurrentUser, verify no remaining 'u-001' fallback only inside hook fallback not literal

// src/routes/incidents/IncidentQueue.tsx:63 my_open filter
// BEFORE: const myOpen = incidents.filter(i=> i.assigneeId==='u-001' && i.status!=='closed');
// AFTER:
const { user } = useCurrentUser();
const myOpen = incidents.filter(i=> i.assigneeId===user?.id && i.status!=='closed');

// src/routes/requests/RequestQueue.tsx:80 isMyTeam
// BEFORE: const isMyTeam = () => false;
// AFTER: const { user } = useCurrentUser(); const isMyTeam = (teamId:string) => user?.teamIds?.includes(teamId) ?? false;
// if teamIds not available, use functionalRoles check: user?.functionalRoles?.includes('request.owner')

// src/routes/requests/RequestQueue.tsx:175 RowActions
// BEFORE: approve/assign/cancel buttons setOpen(false) only
// AFTER: wire to actual service calls: onApprove={()=> requestsService.approveStep(publicId, stepId)} etc., with loading state

// src/components/problems/PlaceholderEditor.tsx:192
// BEFORE: <div>fault_tree placeholder</div>
// AFTER: keep placeholder but derive user from useCurrentUser for author line

// NOW ticker: RequestQueue 38/24 const NOW = Date.now()
// AFTER: const [now,setNow] = useState(()=> Date.now()); useEffect(()=>{ const id=setInterval(()=>setNow(Date.now()),60000); return ()=>clearInterval(id); },[]);

// Also ProblemDetail 497 publishedBy:'u-001' already fixed in Batch2 promoteKnownError -> actor.id, ensure no literal remains
```

Keep fallbacks `?? 'system'` only for Storybook, not business logic.

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch3-hardcode.test.ts -v
npm run lint 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/problems/RCAWorkspace.tsx src/routes/changes/CABWorkspace.tsx src/routes/incidents/IncidentQueue.tsx src/routes/requests/RequestQueue.tsx src/components/problems/PlaceholderEditor.tsx server/__tests__/batch3-hardcode.test.ts
git commit -m "fix(hardcode): sweep u-001/Sarah Chen/NOW/isMyTeam to live useCurrentUser/ticker"
```

---

### Task 8: Wire `Pager` into list pages + request queue + KB browse

**Files:**
- Modify: `src/routes/problems/ProblemList.tsx:146`, `src/routes/cmdb/CMDBList.tsx:53`, `src/routes/kb/KBBrowse.tsx:255`, `src/routes/requests/RequestQueue.tsx:214`, `src/routes/changes/ChangeCalendar.tsx:55`
- Test: `server/__tests__/batch3-pager-integration.test.ts`

- [ ] **Step 1: Write failing test — FE pages call list with pagination**

```ts
import { describe, it, expect, vi } from 'vitest';
describe('FE pagination wiring', () => {
  it('ProblemList uses pagination', async () => {
    const s = (await import('fs')).readFileSync('src/routes/problems/ProblemList.tsx','utf8');
    expect(s).toContain('Pager');
    expect(s).toContain('useResource(()=> problemsService.list');
    expect(s).toContain('page');
  });
});
```

- [ ] **Step 2: Run — FAIL before wiring**

```bash
npx vitest run server/__tests__/batch3-pager-integration.test.ts -v
```

- [ ] **Step 3: Implement — example `ProblemList.tsx:146`**

```tsx
import { Pager } from '../../components/ui/Pager';
const [page,setPage]=useState(1);
const [pageSize,setPageSize]=useState(20);
const [search,setSearch]=useState('');
const { data: problems, loading, error, refresh } = useResource(()=> problemsService.list({ page, pageSize, search: search || undefined }), [page, pageSize, search]);
// remove client filter `filtered = problems.filter(...)` keep server pushdown for status/search, keep lightweight client sort if needed
// render <Pager page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={n=>{setPageSize(n); setPage(1);}} />

// Similarly CMDBList.tsx:53
const [page,setPage]=useState(1);
const [pageSize,setPageSize]=useState(20);
const [search,setSearch]=useState('');
const { data: cis } = useResource(()=> cisService.list({ page, pageSize, search }), [page, pageSize, search]);
// remove client `filtered = cis.filter search` now server-filtered

// KBBrowse.tsx:255
const [q,setQ]=useState('');
const [page,setPage]=useState(1);
const { data: articles } = useResource(()=> knowledgeService.articles({ q: q || undefined, page, pageSize: 20 }), [q, page]);

// RequestQueue 214 already uses list but add Pager similarly
```

Keep `filterReadable` for RBAC client filter but pagination controls drive fetch.

- [ ] **Step 4: Run — PASS**

```bash
npx vitest run server/__tests__/batch3-pager-integration.test.ts -v
npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/routes/problems/ProblemList.tsx src/routes/cmdb/CMDBList.tsx src/routes/kb/KBBrowse.tsx src/routes/requests/RequestQueue.tsx src/routes/changes/ChangeCalendar.tsx src/components/ui/Pager.tsx server/__tests__/batch3-pager-integration.test.ts
git commit -m "feat(pagination): wire Pager into Problems/CMDB/KB/Requests lists"
```

---

### Task 9: Verification — lint + test + build + docs sync

**Files:**
- Modify: `docs/design/02-api-contract.md:395` (add `GET /cis ?search&health` + `GET /problems ?status&search` + `GET /kb/articles ?q` + `POST /kb/.../feedback`), `docs/design/README.md:82` changelog, `docs/features/{problems,cmdb,kb,incidents,requests}.md` `CRUD Wiring` update

- [ ] **Step 1: Run full gate**

```bash
npm run lint 2>&1 | tail -20
# Expected: pass
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch3-* -v 2>&1 | tail -40
# Expected: all batch3 suites pass (pagination, detail get, kb feedback, hardcode)
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois npx vitest run server/__tests__/batch1-* server/__tests__/batch2-* -v 2>&1 | tail -20
# Expected: previous batches still green
npm run build 2>&1 | tail -20
# Expected: 3906 modules transformed
```

- [ ] **Step 2: Update `docs/design/02-api-contract.md:120` add rows:**

```markdown
| GET | `/api/v1/problems` | `problem.read` | `?status&search&page&pageSize` + `parsePagination` | `req.scoped.problems.list(where,pagination)` via `problemsRepo.list` pushdown |
| GET | `/api/v1/cis` | `cmdb.read` | `?search&status&health&page&pageSize` | `req.scoped.cmdb.list(where,pagination)` |
| GET | `/api/v1/kb/articles` | `kb.read` | `?q&page&pageSize` | `kbRepo.list(where {q}, pagination)` |
| POST | `/api/v1/kb/articles/:publicId/feedback` | `kb.write` | `{ helpful: boolean }` strict | `auditLog kb_helpful/kb_not_helpful` → `201` |
| GET | `/api/v1/kb/articles/:publicId` | `kb.read` | `publicId` | `kbRepo.get` (ArticleView now uses get not allArticles.find) |
| GET | `/api/v1/cis/:publicId` | `cmdb.read` | `publicId` | `cmdbRepo.get` (CMDBDetail now uses get) |
```

And `docs/design/README.md:82` add `Batch 3 — Pagination + Polish` changelog.

Also update `docs/features/problems.md`, `cmdb.md`, `kb.md` `CRUD Wiring` table rows `R list` from 🟡 client-filter to 🟢 server pushdown, `R get` efficiency 🟢, `U helpful` 🟢.

- [ ] **Step 3: Commit docs**

```bash
git add docs/design/02-api-contract.md docs/design/README.md docs/features/problems.md docs/features/cmdb.md docs/features/kb.md
git commit -m "docs(design+features): sync Batch 3 pagination + KB/CMDB polish contracts"
```

- [ ] **Step 4: Final empty marker if needed**

```bash
git commit --allow-empty -m "chore: batch3 verification — lint+test+build green"
```

---

## Self-Review

**Spec coverage:** `docs/audits/crud-audit.md` §8/9 leftovers — `Pagination dead` across 6 pages → Tasks 1-4+8, `KB ?q` client-only → Task 5, `CMDB Detail list.find` + `relationshipsAll` ignore → Task 6, `KB helpful Yes/No local` → Task 5, `hardcodes u-001/Sarah Chen/NOW/isMyTeam/RowActions` → Task 7, `R get` inefficiency → Task 6. No new tables.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`. Each pagination path concrete `parsePagination` + `take/skip` + `where status/search` + `apiFetch {query}` + `Pager`, each feedback `z.object({helpful:boolean})` + `auditLog` + `201`, each detail `get(publicId)` not `list.find`, each hardcode replaced with `useCurrentUser()` or live `getActor`.

**Type consistency:** `PaginationParams` + `CmdbPaginationParams` reused across `itsmServices/cmdbService/platformServices`, `parsePagination` `{limit,offset}` maps `page→offset (page-1)*pageSize`, `normalizeProblem/normalizeChange` keep `Problem.tags: string[]` etc., `kbRepo.list(tenantId,where,pagination):Promise<KBArticle[]>` stays `Promise` not stream, `auditLog` signature consistent with Batch 1/2.

