// Cookie-based session auth. The session id is an opaque random string stored
// in a cookie (httpOnly, sameSite=lax); the session row lives in Postgres/SQLite
// via Prisma. We deliberately did not pull in Lucia for M2 — the surface we need
// is tiny and our own implementation is auditable in a single file.

import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { Request, Response } from 'express';
import { prisma } from '../db';

export const SESSION_COOKIE = 'ois_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => hash(plain, ARGON_OPTS);
export const verifyPassword = (h: string, plain: string) => verify(h, plain, ARGON_OPTS);

const newSessionId = () => randomBytes(24).toString('base64url');

export interface SessionContext {
  sessionId: string;
  userId: string;
  tenantId: string;
  roles: string[];
}

export const createSession = async (userId: string, tenantId: string): Promise<SessionContext> => {
  const sessionId = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { id: sessionId, userId, tenantId, expiresAt } });
  const roles = await rolesForMembership(tenantId, userId);
  return { sessionId, userId, tenantId, roles };
};

export const destroySession = async (sessionId: string) => {
  await prisma.session.deleteMany({ where: { id: sessionId } });
};

const rolesForMembership = async (tenantId: string, userId: string): Promise<string[]> => {
  const m = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!m) return [];
  try { return JSON.parse(m.roles) as string[]; } catch { return []; }
};

export const resolveSession = async (sessionId: string | undefined): Promise<SessionContext | null> => {
  if (!sessionId) return null;
  const row = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }
  const roles = await rolesForMembership(row.tenantId, row.userId);
  return { sessionId: row.id, userId: row.userId, tenantId: row.tenantId, roles };
};

export const setSessionCookie = (res: Response, sessionId: string) => {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
};

export const getSessionIdFromRequest = (req: Request): string | undefined => {
  const c = (req as Request & { cookies?: Record<string, string> }).cookies;
  return c?.[SESSION_COOKIE];
};
