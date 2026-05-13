import { Router } from 'express';
import { prisma } from '../db';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, qString } from '../util';

export const adminRouter = Router();

adminRouter.use(requirePermission('system.admin'));

adminRouter.get('/admin/tenants', asyncHandler(async (_req, res) => {
  res.json(await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } }));
}));

adminRouter.get('/admin/users', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}));

adminRouter.get('/admin/audit', asyncHandler(async (req, res) => {
  const resourceKind = qString(req.query.resourceKind);
  const resourceId = qString(req.query.resourceId);
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: req.tenantId,
      ...(resourceKind ? { resourceKind } : {}),
      ...(resourceId ? { resourceId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(logs);
}));
