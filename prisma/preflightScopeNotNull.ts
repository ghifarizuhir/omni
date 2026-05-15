// prisma/preflightScopeNotNull.ts
//
// Pre-migration guard: walk every scoped table, count NULL scope-column rows.
// Optionally remediate by assigning orphans to a synthetic "Unassigned" app.
//
// Usage (dry-run):  npx dotenv-cli -e .env.local -- npx tsx prisma/preflightScopeNotNull.ts
// Usage (remediate): ... -- npx tsx prisma/preflightScopeNotNull.ts --remediate
// Usage (one tenant): ... --tenant=<tenantId> [--remediate]

import { PrismaClient } from '@prisma/client';

// Use a local PrismaClient so the script can $disconnect cleanly.
const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModuleKey =
  | 'cmdb'
  | 'event'
  | 'incident'
  | 'change'
  | 'problem'
  | 'release'
  | 'service_request';

export interface ModuleReport {
  module: ModuleKey;
  table: string;
  column: 'primaryApplicationId' | 'applicationId';
  orphan: number;
}

export interface PreflightReport {
  clean: boolean;
  modules: ModuleReport[];
}

// ── Module descriptors ────────────────────────────────────────────────────────

const MODULES: Array<{
  key: ModuleKey;
  table: string;
  column: 'primaryApplicationId' | 'applicationId';
}> = [
  { key: 'cmdb',            table: 'ConfigurationItem', column: 'primaryApplicationId' },
  { key: 'event',           table: 'Event',             column: 'applicationId' },
  { key: 'incident',        table: 'Incident',          column: 'applicationId' },
  { key: 'change',          table: 'Change',            column: 'applicationId' },
  { key: 'problem',         table: 'Problem',           column: 'applicationId' },
  { key: 'release',         table: 'Release',           column: 'applicationId' },
  { key: 'service_request', table: 'ServiceRequest',    column: 'applicationId' },
];

// ── Count helpers ─────────────────────────────────────────────────────────────

/**
 * Count NULL rows via raw SQL. We can't use Prisma's typed query because the
 * generated client now rejects `where: { applicationId: null }` (the column is
 * NOT NULL post-migration). Raw SQL bypasses that validator — the count will
 * always be 0 after the migration, but the script remains useful for the
 * pre-migration safety pass when run against an older schema.
 */
async function countOrphans(
  _module: ModuleKey,
  table: string,
  column: string,
  tenantId?: string,
): Promise<number> {
  const sql = tenantId
    ? `SELECT COUNT(*)::int AS n FROM "${table}" WHERE "${column}" IS NULL AND "tenantId" = $1`
    : `SELECT COUNT(*)::int AS n FROM "${table}" WHERE "${column}" IS NULL`;
  const rows = tenantId
    ? await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql, tenantId)
    : await prisma.$queryRawUnsafe<Array<{ n: number }>>(sql);
  return rows[0]?.n ?? 0;
}

// ── Remediation helpers ───────────────────────────────────────────────────────

export async function ensureUnassignedApp(tenantId: string): Promise<string> {
  const existing = await prisma.application.findFirst({
    where: { tenantId, code: 'UNASSIGNED' },
  });
  if (existing) return existing.id;
  const created = await prisma.application.create({
    data: {
      id: `app-unassigned-${tenantId}`,
      tenantId,
      code: 'UNASSIGNED',
      name: 'Unassigned',
      criticality: null,
    },
  });
  return created.id;
}

async function remediateOne(
  module: ModuleKey,
  column: string,
  tenantId: string,
  unassignedId: string,
): Promise<number> {
  const data = { [column]: unassignedId };
  const where = { tenantId, [column]: null };

  switch (module) {
    case 'cmdb':
      return (await prisma.configurationItem.updateMany({ where, data })).count;
    case 'event':
      return (await prisma.event.updateMany({ where, data })).count;
    case 'incident':
      return (await prisma.incident.updateMany({ where, data })).count;
    case 'change':
      return (await prisma.change.updateMany({ where, data })).count;
    case 'problem':
      return (await prisma.problem.updateMany({ where, data })).count;
    case 'release':
      return (await prisma.release.updateMany({ where, data })).count;
    case 'service_request':
      return (await prisma.serviceRequest.updateMany({ where, data })).count;
  }
}

// ── Public entry ──────────────────────────────────────────────────────────────

export async function runPreflight(
  opts: { tenantId?: string; remediate?: boolean } = {},
): Promise<PreflightReport> {
  // First pass: count orphans per module.
  let modules: ModuleReport[] = await Promise.all(
    MODULES.map(async (m) => ({
      module: m.key,
      table: m.table,
      column: m.column,
      orphan: await countOrphans(m.key, m.table, m.column, opts.tenantId),
    })),
  );

  // Optional remediation — requires a tenantId to target the Unassigned-app fallback.
  if (opts.remediate && opts.tenantId) {
    const unassignedId = await ensureUnassignedApp(opts.tenantId);
    for (const m of modules) {
      if (m.orphan > 0) {
        await remediateOne(m.module, m.column, opts.tenantId, unassignedId);
      }
    }
    // Re-count after remediation.
    modules = await Promise.all(
      MODULES.map(async (m) => ({
        module: m.key,
        table: m.table,
        column: m.column,
        orphan: await countOrphans(m.key, m.table, m.column, opts.tenantId),
      })),
    );
  }

  return { clean: modules.every((m) => m.orphan === 0), modules };
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

// Guard: only execute when run directly via tsx/node, not when imported by tests.
const isMain = process.argv[1]?.includes('preflightScopeNotNull');

async function cli() {
  const argv = process.argv.slice(2);
  const tenantArg = argv.find((a) => a.startsWith('--tenant='))?.split('=')[1];
  const remediate = argv.includes('--remediate');

  const report = await runPreflight({ tenantId: tenantArg, remediate });

  for (const m of report.modules) {
    console.log(JSON.stringify(m));
  }

  const totalOrphans = report.modules.reduce((acc, m) => acc + m.orphan, 0);
  console.error(
    `\nPreflight ${report.clean ? 'CLEAN' : 'BLOCKED'}: ${totalOrphans} orphans total`,
  );

  await prisma.$disconnect();
  process.exit(report.clean ? 0 : 1);
}

if (isMain) {
  cli().catch((e) => {
    console.error(e);
    prisma.$disconnect().then(() => process.exit(2));
  });
}
