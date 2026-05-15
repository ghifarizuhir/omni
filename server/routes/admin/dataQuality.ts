import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { asyncHandler, HttpError } from '../../util';
import { audit } from '../../audit';
import { MODULES, type ModuleKey } from '../../repositories/dataQuality';

export const dataQualityRouter = Router();

const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

function assertModule(key: string): asserts key is ModuleKey {
  if (!MODULE_KEYS.includes(key as ModuleKey)) {
    throw new HttpError(400, `unknown module: ${key}`);
  }
}

async function countOne(m: ModuleKey, tenantId: string): Promise<{ total: number; orphan: number }> {
  // applicationId / primaryApplicationId are NOT NULL since Plan F migration;
  // orphan count is always 0 — the DB constraint makes it impossible.
  switch (m) {
    case 'cmdb': return { total: await prisma.configurationItem.count({ where: { tenantId } }), orphan: 0 };
    case 'event': return { total: await prisma.event.count({ where: { tenantId } }), orphan: 0 };
    case 'incident': return { total: await prisma.incident.count({ where: { tenantId } }), orphan: 0 };
    case 'change': return { total: await prisma.change.count({ where: { tenantId } }), orphan: 0 };
    case 'problem': return { total: await prisma.problem.count({ where: { tenantId } }), orphan: 0 };
    case 'service_request': return { total: await prisma.serviceRequest.count({ where: { tenantId } }), orphan: 0 };
  }
}

async function listOrphans(_m: ModuleKey, _tenantId: string) {
  // applicationId / primaryApplicationId are NOT NULL since Plan F migration;
  // no orphan rows can exist — DB constraint guarantees it.
  return [];
}

async function assignOne(m: ModuleKey, tenantId: string, publicId: string, applicationId: string): Promise<boolean> {
  // updateMany on a (tenantId, publicId) pair is atomic — no findFirst → update TOCTOU race.
  switch (m) {
    case 'cmdb':            return (await prisma.configurationItem.updateMany({ where: { tenantId, publicId }, data: { primaryApplicationId: applicationId } })).count > 0;
    case 'event':           return (await prisma.event.updateMany           ({ where: { tenantId, publicId }, data: { applicationId } })).count > 0;
    case 'incident':        return (await prisma.incident.updateMany        ({ where: { tenantId, publicId }, data: { applicationId } })).count > 0;
    case 'change':          return (await prisma.change.updateMany          ({ where: { tenantId, publicId }, data: { applicationId } })).count > 0;
    case 'problem':         return (await prisma.problem.updateMany         ({ where: { tenantId, publicId }, data: { applicationId } })).count > 0;
    case 'service_request': return (await prisma.serviceRequest.updateMany  ({ where: { tenantId, publicId }, data: { applicationId } })).count > 0;
  }
}

async function bulkAssign(m: ModuleKey, tenantId: string, publicIds: string[], applicationId: string): Promise<number> {
  switch (m) {
    case 'cmdb':            return (await prisma.configurationItem.updateMany({ where: { tenantId, publicId: { in: publicIds } }, data: { primaryApplicationId: applicationId } })).count;
    case 'event':           return (await prisma.event.updateMany           ({ where: { tenantId, publicId: { in: publicIds } }, data: { applicationId } })).count;
    case 'incident':        return (await prisma.incident.updateMany        ({ where: { tenantId, publicId: { in: publicIds } }, data: { applicationId } })).count;
    case 'change':          return (await prisma.change.updateMany          ({ where: { tenantId, publicId: { in: publicIds } }, data: { applicationId } })).count;
    case 'problem':         return (await prisma.problem.updateMany         ({ where: { tenantId, publicId: { in: publicIds } }, data: { applicationId } })).count;
    case 'service_request': return (await prisma.serviceRequest.updateMany  ({ where: { tenantId, publicId: { in: publicIds } }, data: { applicationId } })).count;
  }
}

// ── Endpoints ────────────────────────────────────────────────────────────────

dataQualityRouter.get('/summary', asyncHandler(async (req, res) => {
  const out: Partial<Record<ModuleKey, { total: number; orphan: number }>> = {};
  for (const m of MODULE_KEYS) out[m] = await countOne(m, req.tenantId);
  res.json(out);
}));

dataQualityRouter.get('/:module', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  res.json(await listOrphans(m, req.tenantId));
}));

const patchBody = z.object({ applicationId: z.string().min(1) });

dataQualityRouter.patch('/:module/:id', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  const { applicationId } = patchBody.parse(req.body);
  const app = await prisma.application.findFirst({ where: { id: applicationId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(400, 'applicationId not found in this tenant');
  const ok = await assignOne(m, req.tenantId, req.params.id, applicationId);
  if (!ok) throw new HttpError(404, `${m} row not found`);
  await audit(req, {
    action: 'data_quality.assign',
    resourceKind: m,
    resourceId: req.params.id,
    after: { applicationId },
    scopeMode: 'admin',
  });
  res.json({ ok: true });
}));

const bulkBody = z.object({ ids: z.array(z.string()).min(1).max(500), applicationId: z.string().min(1) });

dataQualityRouter.post('/:module/bulk', asyncHandler(async (req, res) => {
  const m = req.params.module;
  assertModule(m);
  const { ids, applicationId } = bulkBody.parse(req.body);
  const app = await prisma.application.findFirst({ where: { id: applicationId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(400, 'applicationId not found in this tenant');
  const updated = await bulkAssign(m, req.tenantId, ids, applicationId);
  await audit(req, {
    action: 'data_quality.bulk_assign',
    resourceKind: m,
    resourceId: `${ids.length}-rows`,
    after: { applicationId, count: updated, ids },
    scopeMode: 'admin',
  });
  res.json({ updated });
}));
