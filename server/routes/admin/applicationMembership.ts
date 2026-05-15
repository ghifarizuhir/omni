import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import { asyncHandler, HttpError } from '../../util';
import { audit } from '../../audit';
import { requireAppManager } from '../../middleware/appManager';
import { resolveScopeContext } from '../../scope/context';
import {
  addTeamToApp, changeTeamRole, removeTeamFromApp, listTeamsForApp,
  listManageableApps, MembershipError,
} from '../../repositories/applicationMembership';

export const applicationMembershipRouter = Router();

function membershipResponse(e: unknown, res: Response): void {
  if (e instanceof MembershipError) {
    const status =
      e.code === 'app_not_found' || e.code === 'team_not_found' || e.code === 'not_member' ? 404 : 409;
    res.status(status).json({ error: e.code, message: e.message });
    return;
  }
  throw e;
}

const roleSchema = z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER']);

applicationMembershipRouter.get('/manageable', asyncHandler(async (req, res) => {
  const ctx = await resolveScopeContext({ userId: req.session!.userId, tenantId: req.tenantId });
  const ownerAppIds = ctx.appMemberships.filter((m) => m.role === 'OWNER').map((m) => m.appId);
  const isPlatformAdmin = req.permissions?.has('system.admin') || ctx.functionalRoles.includes('PLATFORM_ADMIN');
  const apps = await listManageableApps(req.tenantId, ownerAppIds, !!isPlatformAdmin);
  res.json(apps);
}));

applicationMembershipRouter.get('/:appId/teams', asyncHandler(async (req, res) => {
  const app = await prisma.application.findFirst({ where: { id: req.params.appId, tenantId: req.tenantId } });
  if (!app) throw new HttpError(404, 'Application not found');
  res.json(await listTeamsForApp(req.params.appId));
}));

const addBody = z.object({ teamId: z.string().min(1), role: roleSchema });
applicationMembershipRouter.post('/:appId/teams', asyncHandler(async (req, res) => {
  const actorKind = await requireAppManager(req, req.params.appId);
  const { teamId, role } = addBody.parse(req.body);
  try {
    const row = await addTeamToApp({
      tenantId: req.tenantId, appId: req.params.appId, teamId, role, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.add', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId, role }, scopeMode: actorKind,
    });
    res.status(201).json(row);
  } catch (e) {
    membershipResponse(e, res);
  }
}));

const patchBody = z.object({ role: roleSchema });
applicationMembershipRouter.patch('/:appId/teams/:teamId', asyncHandler(async (req, res) => {
  const actorKind = await requireAppManager(req, req.params.appId);
  const { role } = patchBody.parse(req.body);
  try {
    const row = await changeTeamRole({
      appId: req.params.appId, teamId: req.params.teamId, role, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.change_role', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId: req.params.teamId, toRole: role }, scopeMode: actorKind,
    });
    res.json(row);
  } catch (e) {
    membershipResponse(e, res);
  }
}));

applicationMembershipRouter.delete('/:appId/teams/:teamId', asyncHandler(async (req, res) => {
  const actorKind = await requireAppManager(req, req.params.appId);
  try {
    await removeTeamFromApp({
      appId: req.params.appId, teamId: req.params.teamId, actorId: req.session!.userId,
    });
    await audit(req, {
      action: 'application_membership.remove', resourceKind: 'Application',
      resourceId: req.params.appId, after: { teamId: req.params.teamId }, scopeMode: actorKind,
    });
    res.status(204).end();
  } catch (e) {
    membershipResponse(e, res);
  }
}));
