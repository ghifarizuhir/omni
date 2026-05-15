// Middleware that resolves the per-request ScopeContext and attaches a
// ScopedDb instance to `req.scoped`. Must run after sessionMiddleware so
// that `req.session` is populated.

import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { resolveScopeContext } from '../scope/context';
import { buildScopedDb, type ScopedDb } from '../scope/scopedDb';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      scoped: ScopedDb;
    }
  }
}

export async function withScopedDb(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.session?.userId;
  const tenantId = req.session?.tenantId;

  if (!userId || !tenantId) {
    // Not authenticated yet — attach a no-op stub so downstream code can
    // import `req.scoped` without crashing; `requireAuth` will 401 before
    // any handler that needs real scope runs.
    req.scoped = buildScopedDb(prisma, {
      userId: '',
      tenantId: '',
      appMemberships: [],
      functionalRoles: [],
    });
    return next();
  }

  try {
    const ctx = await resolveScopeContext({ userId, tenantId });
    req.scoped = buildScopedDb(prisma, ctx);
    next();
  } catch (err) {
    next(err);
  }
}
