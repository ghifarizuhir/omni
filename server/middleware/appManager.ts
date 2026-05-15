import type { Request } from 'express';
import { HttpError } from '../util';
import { resolveScopeContext } from '../scope/context';

/**
 * Authorize the caller as either a PlatformAdmin or an Application Owner for
 * the given appId. Throws HttpError(403) otherwise. Idempotent — safe to call
 * from each membership-mutating handler.
 */
export async function requireAppManager(req: Request, appId: string): Promise<void> {
  if (!req.session) throw new HttpError(401, 'Authentication required');
  // PlatformAdmin via RBAC permission → bypass.
  if (req.permissions?.has('system.admin')) return;
  // PlatformAdmin via functional role → bypass.
  const ctx = await resolveScopeContext({ userId: req.session.userId, tenantId: req.tenantId });
  if (ctx.functionalRoles.includes('PLATFORM_ADMIN')) return;
  // Application Owner: user's Team must hold OWNER role for this app.
  const isOwner = ctx.appMemberships.some((m) => m.appId === appId && m.role === 'OWNER');
  if (!isOwner) throw new HttpError(403, 'Application Owner or PlatformAdmin required');
}
