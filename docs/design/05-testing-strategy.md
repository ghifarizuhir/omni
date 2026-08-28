# 05 — Testing Strategy

Status: **Draft**
References: [`03-architecture.md`](./03-architecture.md), [`04-error-handling.md`](./04-error-handling.md)
Source of truth: [`vitest.config.ts`](../../vitest.config.ts:3), [`server/__tests__/helpers.ts`](../../server/__tests__/helpers.ts:9), [`package.json`](../../package.json:19) `#lint` + `#test`, [`docker-compose.yml`](../../docker-compose.yml:21), [`server/app.ts`](../../server/app.ts:33)

---

## Design principles

1. **Test behavior, not implementation.** Kontrak publik: "given input X, output Y / side-effect Z". Internal refactor tidak boleh break test yang masih valid — jangan assert private helper, query SQL literal, atau urutan field JSON yang bukan bagian dari kontrak.
2. **Fast feedback > exhaustive coverage.** Puluhan test cepat (< 5s total untuk unit + ~15-30s untuk suite DB-backed) > ratusan lambat (> 60s timeout). Slow tests = tidak di-run = useless. Pref-erensi: vitest `run` tanpa watch di CI, `--watch` di dev loop.
3. **DB-backed integration is default.** OIS tidak punya in-memory SQLite / Prisma mock. Mayoritas suite memakai Postgres real via [`server/__tests__/helpers.ts`](../../server/__tests__/helpers.ts:9) (butuh `docker compose up -d postgres` di [`docker-compose.yml:22`](../../docker-compose.yml:22)). Hanya `passwordGen.test.ts:1` (pure util) yang bebas DB. Scope logic (`req.scoped` → tenant filter) hanya terverifikasi dengan DB real.
4. **No `setupFiles`.** [`vitest.config.ts:7`](../../vitest.config.ts:7) `setupFiles: []` — setup per-file eksplisit via helpers. Tidak ada `beforeAll` global yang menyuntik `prisma` / `app` implisit; setiap file `import { createApp } from '../app'` dan `login()` / `createScopedAppFixture()` secara eksplisit agar isolasi jelas dan global state tersembunyi dihindari.
5. **Lint before test.** [`package.json:23`](../../package.json:23) `lint = tsc --noEmit (root) + tsc --noEmit -p server/tsconfig.json + eslint 'server/routes/**/*.ts' --max-warnings 0`. Urutan CI: `lint` hijau dulu baru `test`. Menangkap type drift dan route `prisma` leak sebelum membuang waktu boot Postgres.

---

## Test levels

| Level | Scope | Speed | Apa yang di-test | Contoh OIS |
|-------|-------|-------|------------------|------------|
| **Unit** | satu function / module (`server/lib/passwordGen.ts`, `server/util.ts`) | < 10ms | Pure logic, regex, permission matrix | `passwordGen.test.ts:1` (`generateTempPassword` Adj-Noun-### pattern) |
| **Integration** | route + `scopedDb` + middleware + Postgres | 50-400ms / test | `supertest` + Postgres: auth, RBAC, scope enforcement, CRUD, contract shape | `auth.test.ts:13`, `scope-cmdb.test.ts:88`, `contract.test.ts:30`, `rbacOrg.test.ts`, `incidents-workflow.test.ts` — **mayoritas suite** |
| **E2E** | full stack lewat browser | 1-5s | Golden path manual | Belum ada — manual via `npm run dev:all` + browser |

**Ratio OIS saat ini (42 file di `server/__tests__/`):**

- ~1 pure unit (`passwordGen.test.ts`).
- ~1 contract suite (`contract.test.ts:30` — 12 domain schemas via `zod` `.passthrough()` pinning drift `src/types`).
- ~40 integration DB-backed (`supertest` 36/42, `prisma` 41/42). Pola dominan: `createApp()` + `request(app)` + `login()` + `prisma` seed → hit `/api/v1/*` → assert `status` + `body` / `ScopeViolationError` → `403`.
- 0 frontend component / E2E automated.

Ini kebalikan pyramid Terra (70% unit / 25% integration / 5% E2E) — intentional: tenant/scope invariant tidak bisa di-tes tanpa Postgres real, jadi OIS overweight integration.

---

## Tooling

| Concern | Tool | Pin |
|---------|------|-----|
| Runner | **Vitest** 4 (`vitest run`) | `vitest.config.ts:1`, `package.json:73` |
| Env | `node` | `vitest.config.ts:6` |
| Include | `server/**/*.test.ts` | `vitest.config.ts:5` |
| setupFiles | `[]` (empty) | `vitest.config.ts:7` |
| HTTP | `supertest` 7 | `server/__tests__/auth.test.ts:2`, `scope-cmdb.test.ts:12` |
| DB fixture | Postgres 16 (`docker-compose.yml:22`, `5433:5432`) via `prisma` + `helpers.ts` | `server/__tests__/helpers.ts:4` + `server/db.ts` singleton |
| Assertions | `vitest` built-in `expect` + `zod` untuk contract | `contract.test.ts:16` |
| Frontend component | belum ada — React Testing Library belum di-setup | — |

**`vitest.config.ts` (keseluruhan):**

```ts
// vitest.config.ts:1
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['server/**/*.test.ts'], // vitest.config.ts:5
    environment: 'node',               // vitest.config.ts:6
    setupFiles: [],                    // vitest.config.ts:7
  },
});
```

**Cara run:**

```bash
npm run test                                    # vitest run — all ~42 suites, butuh Postgres
npx vitest run server/__tests__/auth.test.ts    # single file
npx vitest run -t "scope_violation"             # filter by test name (regex)
npx vitest run -t "POST /auth/login"            # substring match
npm run lint                                    # harus hijau sebelum test (package.json:23)
```

`NODE_ENV=test` / `VITEST=1` meng-disable `pinoHttp` (`server/app.ts:31` `isTest`) dan melonggarkan rate limit (`app.ts:83` `max: 1_000` auth, `app.ts:97` `10_000` tenant) agar suite tidak flaky.

---

## Helpers deep dive (`server/__tests__/helpers.ts`)

File [`server/__tests__/helpers.ts:1`](../../server/__tests__/helpers.ts:1) adalah satu-satunya fixture shared yang resmi. Tidak ada `factory` terpisah — inline seed via `prisma` bila perlu.

### API

| Export | Signature | Guna |
|--------|-----------|------|
| `login(app, email, password)` | `(Express, string, string) => Promise<string>` — `helpers.ts:9` | `POST /api/v1/auth/login` via `supertest`, ekstrak `ois_session` cookie, return `Cookie` header siap `set('Cookie', cookie)` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `helpers.ts:23` | Kredensial seed `admin@omni.local / demo` — dipakai `auth.test.ts:17` untuk smoke |
| `ScopedAppFixture` | interface `helpers.ts:28` | Struct isolasi: `appId`, `teamAId`/`teamBId`, `memberAUserId`/`memberBUserId`/`nocUserId`/`platformAdminUserId`, `password`, `emailOf()`, `cleanup()` |
| `createScopedAppFixture(tag)` | `(string) => Promise<ScopedAppFixture>` — `helpers.ts:54` | Build rantai isolasi: `Tenant(root)` → `Division(SCOPE_DIV_${tag})` → `Department` → `teamA`+`teamB` → `Application` + `ApplicationTeam(CONTRIBUTOR)` → 4 users + `TenantMembership` + `MembershipRole(role-system-operator/admin)` + `FunctionalRole(NOC_OPERATOR/PLATFORM_ADMIN)` via `upsert` idempotent. Tag harus unik per suite (mis. `scope-cmdb-t9`) |
| `cleanup()` | `() => Promise<void>` — `helpers.ts:169` | Urutan FK-safe `deleteMany`: `membershipRole` → `tenantMembership` → `userFunctionalRole` → `user` → `applicationTeam` → `application` → `team` → `department` → `division`. Selalu di `afterAll` |

### Pola isolasi tenant

```ts
// server/__tests__/scope-cmdb.test.ts:28 — canonical scope fixture lifecycle
let app: Express;
let fx: ScopedAppFixture;
beforeAll(async () => {
  app = createApp();                          // server/app.ts:33 factory — no listen
  fx = await createScopedAppFixture('scope-cmdb-t9'); // helpers.ts:54
  await prisma.configurationItem.create({ data: { primaryApplicationId: fx.appId, ... } });
});
afterAll(async () => {
  await prisma.configurationItem.deleteMany({ where: { id: { in: [...] } } });
  await fx.cleanup();                         // helpers.ts:169 — FK-safe teardown
});

async function loginAs(handle: 'member-a' | 'member-b' | 'noc' | 'admin') {
  return login(app, fx.emailOf(handle), fx.password); // helpers.ts:9
}
it('memberB outsider PATCH blocked → 403', async () => {
  const cookie = await loginAs('member-b');   // teamB bukan CONTRIBUTOR di fx.appId
  const res = await request(app).patch(`/api/v1/cis/${ciPublicId}`).set('Cookie', cookie).send({ name: 'x' });
  expect(res.status).toBe(403);
  expect(res.body).toMatchObject({ error: 'scope_violation', module: 'cmdb', action: 'update' });
});
```

Catatan: `withScopedDb` (`server/middleware/scopedDb.ts:19`) dipanggil sebelum `requireAuth` (`server/app.ts:126`). Saat belum login, `req.scoped` adalah stub kosong (`scopedDb.ts:27` `buildScopedDb({ tenantId:'', ... })`) sehingga `req.scoped` tidak crash; handler tetap 401 via `requireAuth` — lihat `auth.test.ts:40` (`GET /auth/me` tanpa cookie → 401).

### `createApp` factory

`server/app.ts:33` `createApp(): Express` adalah factory tanpa side-effect (tidak `listen`). Semua middleware `helmet` → `pinoHttp` (skip jika `isTest`) → `express.json(1mb)` → `cookieParser` → `sessionMiddleware` (`middleware/auth.ts:23`) → `withScopedDb` (`middleware/scopedDb.ts:19`) → rate limiters → operational `/health|/live|/ready` → `authRouter` (public) → `requireAuth` global gate (`app.ts:126`) → domain routers → 404 → `errorHandler` (`app.ts:144` maps `ScopeViolationError` → 403, `HttpError` → status, Zod `issues` → 400). Test menyuntikkan `supertest` langsung: `request(app).get('/api/v1/cis').set('Cookie', cookie)`.

---

## Writing a test — recipe

**Langkah 1 — Nyalakan Postgres.**

```bash
docker compose up -d postgres   # host 5433→5432 (docker-compose.yml:30)
# atau export DATABASE_URL=postgresql://ois:ois@localhost:5433/ois?schema=public
```

**Langkah 2 — Buat file `server/__tests__/<domain>.test.ts`.**

**Langkah 3 — Contoh minimal (route auth + scope):**

```ts
// server/__tests__/my-feature.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, createScopedAppFixture, login } from './helpers';

const app = createApp();

describe('MY feature', () => {
  it('rejects unauth → 401 (global requireAuth gate — server/app.ts:126)', async () => {
    const res = await request(app).get('/api/v1/cis');
    expect(res.status).toBe(401);
  });

  it('rejects cross-app write → 403 scope_violation', async () => {
    const fx = await createScopedAppFixture('my-feat-1');
    try {
      const outsider = await login(app, fx.emailOf('member-b'), fx.password);
      const res = await request(app)
        .patch(`/api/v1/cis/${ciPublicId}`)
        .set('Cookie', outsider)
        .send({ name: 'oops' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('scope_violation');
    } finally { await fx.cleanup(); }
  });

  it('validates body → 400 with issues (Zod, server/app.ts:153)', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });
});

afterAll(async () => { await prisma.$disconnect(); });
```

**Langkah 4 — Verifikasi lokal.**

```bash
npm run lint --silent
npx vitest run server/__tests__/my-feature.test.ts
npx vitest run -t "rejects cross-app"
```

**Aturan penulisan:**

- Grouping `describe('MODULE — behavior')` + `it('does X when Y')` present tense, tanpa prefix `should`.
- Query by route + status + `body.error`/`body.message` — jangan assert query SQL intern.
- Selalu `cleanup()` fixture di `afterAll` / `finally`; jangan andalkan shared state antar `it`.
- Untuk contract drift, ikuti `contract.test.ts:30` — Zod schema `.passthrough()` + `safeParse` dan lempar error dengan `issues`.

---

## Running & CI ordering

```
lint → test → build
 npm run lint   npm run test   npm run build
```

| Step | Command | Apa dicek | Butuh |
|------|---------|-----------|-------|
| 1. lint | `npm run lint` — `tsc --noEmit` (root) + `tsc --noEmit -p server/tsconfig.json` + `eslint 'server/routes/**/*.ts' --max-warnings 0` (`package.json:23`) | type drift, route `prisma` import leak (`eslint.config.js:19` `no-restricted-imports`) | Node only |
| 2. test | `npm run test` — `vitest run` (`package.json:19`, `vitest.config.ts:3`) | ~42 suites, exit non-zero = block merge | **Postgres running** (`docker compose up -d postgres`, host `5433` — `docker-compose.yml:30`, healthcheck `pg_isready -U ois -d ois`) + `DATABASE_URL` + `SESSION_SECRET` |
| 3. build | `npm run build` — `vite build` | SPA compiles | — |

**Env untuk test:**

```bash
DATABASE_URL=postgresql://ois:ois@localhost:5433/ois?schema=public  # compose host port
SESSION_SECRET=test-secret-32chars-min
NODE_ENV=test   # auto via vitest; disables pinoHttp noise
```

Tanpa Postgres, suite akan gagal `prisma.$queryRaw`/`connect`. Di CI, jalankan `docker compose up -d postgres --wait` sebelum `npm run test` (atau service container `postgres:16-alpine` dengan var yang sama). Tidak ada `TEST_DATABASE_URL` terpisah — semua test pakai `DATABASE_URL` yang sama (lihat Open Items).

---

## Coverage

Belum ada threshold di CI. Target aspirasi:

| Layer | Target | Catatan |
|-------|--------|---------|
| `scope-*` suites + `server/scope/*` | ~100% cabang `enforce`/`warn` | Policy matrix kritikal |
| `server/middleware` (auth, scopedDb) | > 80% | Critical path — `auth.test.ts:45` (`/auth/me` perms), `m6-auth-gate.test.ts` |
| `server/routes` | best-effort via integration | Thin handler — coverage via supertest |
| `server/lib` (pure) | > 80% | Mudah unit test — `passwordGen.test.ts` template |

Coverage report belum wired: `vitest --coverage` butuh provider `v8` (`npm i -D @vitest/coverage-v8`) + section `coverage.thresholds` di `vitest.config.ts`. Jangan kejar angka dengan test setter/getter — 70% yang tes branch logic > 95% yang tes getter.

---

## What we don't test yet

- **E2E (browser).** Tidak ada Playwright/Cypress. Golden paths masih manual (`npm run dev:all` → login → create CI/incident → comment → resolve). Terra `05-testing-strategy.md` menyimpan ini untuk Phase 2 — OIS ikut.
- **Performance / load.** Tidak ada k6 / Artillery. Latency DB, throughput Socket.IO (`server/realtime.ts:30`), dan scheduler interval (`server/jobs/queue.ts:17`) belum di-benchmark.
- **Visual regression.** Tidak ada snapshot / Chromatic. Tailwind primitive di `src/components/ui/*` hanya manual review.
- **Frontend component.** React Testing Library + MSW belum di-setup (Terra pakai MSW reuse handler; OIS belum). Inkubasi setelah `src/routes` stabil.
- **Contracts hardening.** `contract.test.ts:30` hanya 12 endpoint + schema minimal `.passthrough()` — belum semua field strict; loosened agar extra field tidak break.

Fokus effort tetap di: **logic dengan banyak branch, error paths, transaction boundaries, scope enforcement, API integration points**.

---

## Open Items

- [ ] Frontend component tests (React Testing Library + MSW) — belum ada. Butuh `jsdom` env terpisah di `vitest.config.ts` workspace override.
- [ ] Coverage threshold di CI (`--coverage` + gate `v8`). Tambah `coverage: { provider:'v8', thresholds:{ lines:55 } }` di `vitest.config.ts`.
- [ ] `TEST_DATABASE_URL` terpisah untuk CI parallel (saat ini pakai `DATABASE_URL` yang sama — race saat parallel shard).
- [ ] Seed determinism: `createScopedAppFixture` pakai `upsert` idempotent tapi tidak random — pertimbangkan `faker` untuk payload variasi bila suite bertambah (tradeoff readability).
- [ ] Mutation testing (Stryker) — bahas setelah coverage > 60% stabil, bukan sekarang.

## Resolved Decisions

| Keputusan | Rationale | Tanggal |
|-----------|-----------|---------|
| `setupFiles: []` — `vitest.config.ts:7` | Setup eksplisit per-file avoids hidden global state; paralelisable | awal |
| `environment: 'node'` — `vitest.config.ts:6` | Semua test OIS adalah server/integration, bukan DOM | awal |
| DB-backed, bukan mock Prisma | Scope logic hanya terverifikasi dengan DB real (tenant filter `tenantId=undefined` → no-filter leak bila tidak di-gate `requireAuth` `server/app.ts:126`) | M2 |
| Global `requireAuth` gate `server/app.ts:126` | Mencegah cross-tenant read bila `tenantId` undefined; semua route di bawah gate terjamin `req.tenantId`/`req.permissions` | M6.9 |
| `eslint no-restricted-imports` di `server/routes/**/*.ts` — `eslint.config.js:19` | Route dilarang `import prisma` langsung; harus `req.scoped.*` (exempt list `eslint.config.js:22`) | M6 |
| `createScopedAppFixture(tag)` idempotent upsert | Suite paralel aman, cleanup FK-safe `helpers.ts:169` | M7 |
| `supertest` + `createApp()` factory — `server/app.ts:33` | Tidak perlu `listen`; test inject `Express` langsung, `pinoHttp` skip di `isTest` | awal |
| Lint (`tsc` root + `tsc -p server` + `eslint routes`) before test — `package.json:23` | Tangkap type + import violation sebelum boot Postgres | awal |

---

## Changelog

| Date | Change | Ref |
|------|--------|-----|
| 2026-08-28 | Init — vitest + supertest + Postgres helpers, no setupFiles, lint-before-test | — |
| 2026-08-28 | Deepen — design principles, test levels + ratio, tooling matrix, helpers deep dive, recipe, CI ordering, coverage, what-not-tested, open items + resolved decisions + changelog; align references 03+04 + source file:line | `vitest.config.ts:3`, `server/__tests__/helpers.ts:9`, `package.json:19`+`23`, `docker-compose.yml:22`, `server/app.ts:33`+`126` |
