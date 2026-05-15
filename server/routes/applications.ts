import { Router } from 'express';
import { asyncHandler } from '../util';
import { requireAuth } from '../middleware/auth';
import { resolveScopeContext } from '../scope/context';
import { listCatalog } from '../repositories/applicationMembership';
import { applicationMembershipRouter } from './admin/applicationMembership';

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

// Mount catalog BEFORE the catch-all sub-router so /:appId doesn't shadow it.
applicationsRouter.get('/catalog', asyncHandler(async (req, res) => {
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  const catalog = await listCatalog(req.tenantId, ctx.appMemberships);
  res.json(catalog);
}));

// Mounts /manageable, /:appId/teams, etc.
applicationsRouter.use('/', applicationMembershipRouter);
