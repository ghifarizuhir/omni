import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { asyncHandler, HttpError } from '../../util';
import { MODULES, type ModuleKey } from '../../repositories/dataQuality';

export const dataQualityRouter = Router();

const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

function assertModule(key: string): asserts key is ModuleKey {
  if (!MODULE_KEYS.includes(key as ModuleKey)) {
    throw new HttpError(400, `unknown module: ${key}`);
  }
}

async function countOne(m: ModuleKey, tenantId: string): Promise<{ total: number; orphan: number }> {
  switch (m) {
    case 'cmdb': {
      const total = await prisma.configurationItem.count({ where: { tenantId } });
      const orphan = await prisma.configurationItem.count({ where: { tenantId, primaryApplicationId: null } });
      return { total, orphan };
    }
    case 'event': {
      const total = await prisma.event.count({ where: { tenantId } });
      const orphan = await prisma.event.count({ where: { tenantId, applicationId: null } });
      return { total, orphan };
    }
    case 'incident': {
      const total = await prisma.incident.count({ where: { tenantId } });
      const orphan = await prisma.incident.count({ where: { tenantId, applicationId: null } });
      return { total, orphan };
    }
    case 'change': {
      const total = await prisma.change.count({ where: { tenantId } });
      const orphan = await prisma.change.count({ where: { tenantId, applicationId: null } });
      return { total, orphan };
    }
    case 'problem': {
      const total = await prisma.problem.count({ where: { tenantId } });
      const orphan = await prisma.problem.count({ where: { tenantId, applicationId: null } });
      return { total, orphan };
    }
    case 'service_request': {
      const total = await prisma.serviceRequest.count({ where: { tenantId } });
      const orphan = await prisma.serviceRequest.count({ where: { tenantId, applicationId: null } });
      return { total, orphan };
    }
  }
}

async function listOrphans(m: ModuleKey, tenantId: string) {
  switch (m) {
    case 'cmdb':
      return prisma.configurationItem.findMany({
        where: { tenantId, primaryApplicationId: null }, take: 200,
        select: { id: true, publicId: true, name: true, ownerTeamId: true, type: true, environment: true },
      });
    case 'event':
      return prisma.event.findMany({
        where: { tenantId, applicationId: null }, take: 200,
        select: { id: true, publicId: true, title: true, severity: true, status: true, firedAt: true, affectedCIPublicIds: true },
      });
    case 'incident':
      return prisma.incident.findMany({
        where: { tenantId, applicationId: null }, take: 200,
        select: { id: true, publicId: true, status: true, priority: true, severity: true, createdAt: true },
      });
    case 'change':
      return prisma.change.findMany({
        where: { tenantId, applicationId: null }, take: 200,
        select: { id: true, publicId: true, status: true, riskLevel: true, scheduledStart: true },
      });
    case 'problem':
      return prisma.problem.findMany({
        where: { tenantId, applicationId: null }, take: 200,
        select: { id: true, publicId: true, status: true },
      });
    case 'service_request':
      return prisma.serviceRequest.findMany({
        where: { tenantId, applicationId: null }, take: 200,
        select: { id: true, publicId: true, status: true },
      });
  }
}

async function assignOne(m: ModuleKey, tenantId: string, idParam: string, applicationId: string): Promise<boolean> {
  switch (m) {
    case 'cmdb': {
      const row = await prisma.configurationItem.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.configurationItem.update({ where: { id: row.id }, data: { primaryApplicationId: applicationId } });
      return true;
    }
    case 'event': {
      const row = await prisma.event.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.event.update({ where: { id: row.id }, data: { applicationId } });
      return true;
    }
    case 'incident': {
      const row = await prisma.incident.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.incident.update({ where: { id: row.id }, data: { applicationId } });
      return true;
    }
    case 'change': {
      const row = await prisma.change.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.change.update({ where: { id: row.id }, data: { applicationId } });
      return true;
    }
    case 'problem': {
      const row = await prisma.problem.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.problem.update({ where: { id: row.id }, data: { applicationId } });
      return true;
    }
    case 'service_request': {
      const row = await prisma.serviceRequest.findFirst({ where: { tenantId, publicId: idParam } });
      if (!row) return false;
      await prisma.serviceRequest.update({ where: { id: row.id }, data: { applicationId } });
      return true;
    }
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
  res.json({ updated });
}));
