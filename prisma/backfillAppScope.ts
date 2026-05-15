// prisma/backfillAppScope.ts
//
// Backfill applicationId / primaryApplicationId on scoped models.
// Reads from dataQuality helpers (no `as any`).
//
// Usage (dry-run):   npx dotenv-cli -e .env.local -- npx tsx prisma/backfillAppScope.ts
// Usage (apply):     ... -- npx tsx prisma/backfillAppScope.ts --apply
// Usage (one module): ... --module=cmdb --apply
// Usage (one tenant): ... --tenant=<tenantId> --apply

import { PrismaClient } from '@prisma/client';
import {
  MODULES,
  ModuleKey,
  deriveAppIdForCI,
  deriveAppIdFromCIs,
} from '../server/repositories/dataQuality';

// Use a local PrismaClient so the script can $disconnect cleanly.
const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackfillReport {
  module: ModuleKey;
  total: number;
  alreadyScoped: number;
  backfilled: number;
  ambiguous: number;
  orphan: number;
}

export interface BackfillOptions {
  tenantId?: string;
  module?: ModuleKey;
  apply?: boolean; // default false (dry-run)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseStringArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function extractCiIdsFromJson(s: string | null | undefined): string[] {
  if (!s) return [];
  let blob: unknown;
  try {
    blob = JSON.parse(s);
  } catch {
    return [];
  }
  if (typeof blob !== 'object' || blob === null) return [];
  const obj = blob as Record<string, unknown>;
  const arr = obj.affectedCIIds ?? obj.affectedCiIds;
  return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === 'string') : [];
}

// ── Per-module runners ────────────────────────────────────────────────────────

async function runCmdb(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.configurationItem.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, ownerTeamId: true, primaryApplicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, ambiguous = 0, orphan = 0;
  for (const row of rows) {
    if (row.primaryApplicationId) { alreadyScoped++; continue; }
    const d = await deriveAppIdForCI(row.tenantId, row.ownerTeamId);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.configurationItem.update({ where: { id: row.id }, data: { primaryApplicationId: d.appId } });
      }
      backfilled++;
    } else if (d.kind === 'ambiguous') {
      ambiguous++;
    } else {
      orphan++;
    }
  }
  return { module: 'cmdb', total: rows.length, alreadyScoped, backfilled, ambiguous, orphan };
}

async function runEvent(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.event.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, affectedCIIds: true, applicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    const ciIds = parseStringArray(row.affectedCIIds);
    const d = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.event.update({ where: { id: row.id }, data: { applicationId: d.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: 'event', total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

async function runIncident(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.incident.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, affectedCIIds: true, applicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    const ciIds = parseStringArray(row.affectedCIIds);
    const d = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.incident.update({ where: { id: row.id }, data: { applicationId: d.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: 'incident', total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

async function runChange(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.change.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, data: true, applicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    const ciIds = extractCiIdsFromJson(row.data);
    const d = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.change.update({ where: { id: row.id }, data: { applicationId: d.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: 'change', total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

async function runProblem(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.problem.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, data: true, applicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    const ciIds = extractCiIdsFromJson(row.data);
    const d = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.problem.update({ where: { id: row.id }, data: { applicationId: d.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: 'problem', total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

async function runServiceRequest(opts: BackfillOptions): Promise<BackfillReport> {
  const rows = await prisma.serviceRequest.findMany({
    where: opts.tenantId ? { tenantId: opts.tenantId } : {},
    select: { id: true, tenantId: true, data: true, applicationId: true },
  });
  let alreadyScoped = 0, backfilled = 0, orphan = 0;
  for (const row of rows) {
    if (row.applicationId) { alreadyScoped++; continue; }
    const ciIds = extractCiIdsFromJson(row.data);
    const d = await deriveAppIdFromCIs(row.tenantId, ciIds);
    if (d.kind === 'backfill') {
      if (opts.apply) {
        await prisma.serviceRequest.update({ where: { id: row.id }, data: { applicationId: d.appId } });
      }
      backfilled++;
    } else {
      orphan++;
    }
  }
  return { module: 'service_request', total: rows.length, alreadyScoped, backfilled, ambiguous: 0, orphan };
}

// ── Public entry ──────────────────────────────────────────────────────────────

export async function runBackfill(opts: BackfillOptions = {}): Promise<BackfillReport[]> {
  const modules: ModuleKey[] = opts.module
    ? [opts.module]
    : (Object.keys(MODULES) as ModuleKey[]);
  const reports: BackfillReport[] = [];
  for (const m of modules) {
    switch (m) {
      case 'cmdb':            reports.push(await runCmdb(opts)); break;
      case 'event':           reports.push(await runEvent(opts)); break;
      case 'incident':        reports.push(await runIncident(opts)); break;
      case 'change':          reports.push(await runChange(opts)); break;
      case 'problem':         reports.push(await runProblem(opts)); break;
      case 'service_request': reports.push(await runServiceRequest(opts)); break;
    }
  }
  return reports;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

async function cli() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const moduleArg = argv.find((a) => a.startsWith('--module='))?.split('=')[1];
  const tenantArg = argv.find((a) => a.startsWith('--tenant='))?.split('=')[1];

  if (moduleArg && !(moduleArg in MODULES)) {
    console.error(`error: unknown --module="${moduleArg}". Valid: ${Object.keys(MODULES).join(', ')}`);
    await prisma.$disconnect();
    process.exit(2);
  }

  const reports = await runBackfill({ apply, module: moduleArg as ModuleKey | undefined, tenantId: tenantArg });
  for (const r of reports) console.log(JSON.stringify(r));

  const totals = reports.reduce(
    (acc, r) => ({
      total:        acc.total        + r.total,
      alreadyScoped: acc.alreadyScoped + r.alreadyScoped,
      backfilled:   acc.backfilled   + r.backfilled,
      ambiguous:    acc.ambiguous    + r.ambiguous,
      orphan:       acc.orphan       + r.orphan,
    }),
    { total: 0, alreadyScoped: 0, backfilled: 0, ambiguous: 0, orphan: 0 },
  );
  console.error(`\n${apply ? 'APPLIED' : 'DRY-RUN'}: ${JSON.stringify(totals)}`);

  await prisma.$disconnect();
}

cli().catch((e) => {
  console.error(e);
  prisma.$disconnect().then(() => process.exit(1));
});
