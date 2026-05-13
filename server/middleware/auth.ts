// Session-aware request context. Resolves the session cookie once per request
// and exposes `req.session`, `req.user`, `req.tenantId`, `req.permissions`.

import type { Request, Response, NextFunction } from 'express';
import { permissionsForRoles, type Permission } from '../auth/permissions';
import { getSessionIdFromRequest, resolveSession, type SessionContext } from '../auth/session';
import { HttpError } from '../util';

declare module 'express-serve-static-core' {
  interface Request {
    session?: SessionContext;
    permissions?: Set<Permission>;
    tenantId: string;
  }
}

// `AUTH_REQUIRED=false` lets dev override the cookie check and pin everything
// to the demo tenant (M1 behavior). Never set this in production.
const AUTH_REQUIRED = (process.env.AUTH_REQUIRED ?? 'true') !== 'false';
const DEMO_TENANT_ID = 'tenant-demo';

export const sessionMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const session = await resolveSession(getSessionIdFromRequest(req));
    if (session) {
      req.session = session;
      req.tenantId = session.tenantId;
      req.permissions = permissionsForRoles(session.roles);
      return next();
    }
    if (!AUTH_REQUIRED) {
      req.tenantId = DEMO_TENANT_ID;
      req.permissions = permissionsForRoles(['admin']);
      return next();
    }
    next();
  } catch (e) {
    next(e);
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.session) throw new HttpError(401, 'Authentication required');
  next();
};

export const requirePermission =
  (perm: Permission) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.session) throw new HttpError(401, 'Authentication required');
    if (!req.permissions?.has(perm)) {
      throw new HttpError(403, `Missing permission: ${perm}`);
    }
    next();
  };
