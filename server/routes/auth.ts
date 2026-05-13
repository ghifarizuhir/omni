import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import {
  clearSessionCookie, createSession, destroySession, getSessionIdFromRequest,
  setSessionCookie, verifyPassword,
} from '../auth/session';
import { asyncHandler, HttpError } from '../util';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new HttpError(401, 'Invalid credentials');
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) throw new HttpError(401, 'Invalid credentials');

  // Pick the first membership as the active tenant. A future endpoint can let
  // the user switch tenants for the active session.
  const membership = await prisma.tenantMembership.findFirst({ where: { userId: user.id } });
  if (!membership) throw new HttpError(403, 'No tenant membership');

  const session = await createSession(user.id, membership.tenantId);
  setSessionCookie(res, session.sessionId);
  res.json({
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    tenantId: session.tenantId,
    roles: session.roles,
  });
}));

authRouter.post('/auth/logout', asyncHandler(async (req, res) => {
  const sid = getSessionIdFromRequest(req);
  if (sid) await destroySession(sid);
  clearSessionCookie(res);
  res.status(204).end();
}));

authRouter.get('/auth/me', asyncHandler(async (req, res) => {
  if (!req.session) throw new HttpError(401, 'Authentication required');
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) throw new HttpError(401, 'Authentication required');
  res.json({
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    tenantId: req.session.tenantId,
    roles: req.session.roles,
    permissions: Array.from(req.permissions ?? []),
  });
}));
