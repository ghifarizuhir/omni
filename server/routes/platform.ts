import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '../db';
import { listByKind, findByKey, firstByKind } from '../repositories/documents';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, qBool, qString, required } from '../util';
import {
  listDivisions, listDepartments, listTeams,
  listApplications, listFunctionalRoles, listRbacUsers,
} from '../repositories/rbacOrg';
import type {
  Team, KBCategory, TestPlan, TestCase, TestRun, SignOff, AiSession,
  DRPlan, DRTestRun, BIAEntry,
} from '../../src/types';

export const platformRouter = Router();

// Path-prefixed guards. `requireAuth` already gates the whole api router, so
// `/users/me` reaches this point only with a valid session — but the explicit
// guards below also enforce that the caller has the right read permission.

platformRouter.use('/users', requirePermission('user.read'));
platformRouter.use('/teams', requirePermission('user.read'));
platformRouter.use('/notifications', requirePermission('notification.read'));
platformRouter.use('/inbox', requirePermission('inbox.read'));
platformRouter.use('/on-call', requirePermission('oncall.read'));
platformRouter.use('/kb', requirePermission('kb.read'));
platformRouter.use('/testing', requirePermission('testing.read'));
platformRouter.use('/status-page', requirePermission('statuspage.read'));
platformRouter.use('/ai', requirePermission('ai.read'));
platformRouter.use('/rbac', requirePermission('rbac.read'));
platformRouter.use('/continuity', requirePermission('continuity.read'));
platformRouter.use('/measurement', requirePermission('measurement.read'));

// users + teams — users live in the User table (auth), teams in documents.
platformRouter.get('/users', asyncHandler(async (_req, res) => {
  const rows = await prisma.user.findMany({
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  res.json(rows);
}));
platformRouter.get('/users/me', asyncHandler(async (req, res) => {
  if (!req.session) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  const u = await prisma.user.findUnique({ where: { id: req.session.userId } });
  res.json(u && { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl });
}));
// user API tokens
const VALID_CHANNEL_KINDS = ['email', 'sms', 'slack'];

platformRouter.get('/users/me/tokens', asyncHandler(async (req, res) => {
  if (!req.session) { res.status(401).json({ message: 'Authentication required' }); return; }
  const tokens = await prisma.apiToken.findMany({
    where: { userId: req.session.userId, revokedAt: null },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tokens);
}));

platformRouter.post('/users/me/tokens', asyncHandler(async (req, res) => {
  if (!req.session) { res.status(401).json({ message: 'Authentication required' }); return; }
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ message: 'name is required' });
    return;
  }
  const rawBytes = randomBytes(24);
  const rawToken = `ois_${rawBytes.toString('base64url')}`;
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const prefix = rawToken.slice(0, 12);
  const token = await prisma.apiToken.create({
    data: {
      tenantId: req.tenantId,
      userId: req.session.userId,
      name: name.trim(),
      tokenHash,
      prefix,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });
  res.status(201).json({ ...token, token: rawToken });
}));

platformRouter.delete('/users/me/tokens/:id', asyncHandler(async (req, res) => {
  if (!req.session) { res.status(401).json({ message: 'Authentication required' }); return; }
  const existing = await prisma.apiToken.findFirst({
    where: { id: req.params.id, userId: req.session.userId },
  });
  if (!existing) { res.status(404).json({ message: 'Token not found' }); return; }
  await prisma.apiToken.update({
    where: { id: req.params.id },
    data: { revokedAt: new Date() },
  });
  res.status(204).end();
}));

// user notification channels
platformRouter.get('/users/me/channels', asyncHandler(async (req, res) => {
  if (!req.session) { res.status(401).json({ message: 'Authentication required' }); return; }
  const channels = await prisma.notificationChannel.findMany({
    where: { userId: req.session.userId },
  });
  res.json(channels);
}));

platformRouter.put('/users/me/channels/:kind', asyncHandler(async (req, res) => {
  if (!req.session) { res.status(401).json({ message: 'Authentication required' }); return; }
  const { kind } = req.params;
  if (!VALID_CHANNEL_KINDS.includes(kind)) {
    res.status(400).json({ message: `kind must be one of: ${VALID_CHANNEL_KINDS.join(', ')}` });
    return;
  }
  const { address } = req.body as { address?: string };
  if (!address || typeof address !== 'string' || !address.trim()) {
    res.status(400).json({ message: 'address is required' });
    return;
  }
  const channel = await prisma.notificationChannel.upsert({
    where: { userId_kind: { userId: req.session.userId, kind } },
    create: {
      tenantId: req.tenantId,
      userId: req.session.userId,
      kind,
      address: address.trim(),
    },
    update: { address: address.trim() },
  });
  res.json(channel);
}));

platformRouter.get('/users/:id', asyncHandler(async (req, res) => {
  const u = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, name: true, avatarUrl: true },
  });
  res.json(required(u, 'User'));
}));
platformRouter.get('/teams', asyncHandler(async (req, res) => {
  res.json(await listByKind<Team>(req.tenantId, 'team'));
}));
platformRouter.get('/teams/:id', asyncHandler(async (req, res) => {
  res.json(required(await findByKey<Team>(req.tenantId, 'team', req.params.id), 'Team'));
}));

// notifications
platformRouter.get('/notifications', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'notification'));
}));
platformRouter.get('/notifications/preferences', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'notification-pref'));
}));
platformRouter.get('/notifications/quiet-hours', asyncHandler(async (req, res) => {
  res.json(await firstByKind(req.tenantId, 'quiet-hours'));
}));

// inbox
platformRouter.get('/inbox', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'inbox-legacy'));
}));
platformRouter.get('/inbox/items', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'inbox-item'));
}));

// on-call
platformRouter.get('/on-call/schedules', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'on-call-schedule'));
}));
platformRouter.get('/on-call/overrides', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'on-call-override'));
}));

// knowledge base (categories/feedback/analytics — articles are in itsm router)
platformRouter.get('/kb/categories', asyncHandler(async (req, res) => {
  res.json(await listByKind<KBCategory>(req.tenantId, 'kb-category'));
}));
platformRouter.get('/kb/feedback', asyncHandler(async (req, res) => {
  const all = await listByKind<{ articleId: string }>(req.tenantId, 'kb-feedback');
  const articleId = qString(req.query.articleId);
  res.json(articleId ? all.filter(f => f.articleId === articleId) : all);
}));
platformRouter.get('/kb/analytics', asyncHandler(async (req, res) => {
  res.json(await firstByKind(req.tenantId, 'kb-analytics'));
}));

// testing
platformRouter.get('/testing/plans', asyncHandler(async (req, res) => {
  res.json(await listByKind<TestPlan>(req.tenantId, 'test-plan'));
}));
platformRouter.get('/testing/cases', asyncHandler(async (req, res) => {
  const all = await listByKind<TestCase>(req.tenantId, 'test-case');
  const planId = qString(req.query.planId);
  res.json(planId ? all.filter(c => c.containedInPlans.includes(planId)) : all);
}));
platformRouter.get('/testing/runs', asyncHandler(async (req, res) => {
  const all = await listByKind<TestRun>(req.tenantId, 'test-run');
  res.json(qBool(req.query.active) ? all.filter(r => r.status === 'running' || r.status === 'pending') : all);
}));
platformRouter.get('/testing/sign-offs', asyncHandler(async (req, res) => {
  res.json(await listByKind<SignOff>(req.tenantId, 'sign-off'));
}));

// status page
platformRouter.get('/status-page/entries', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'status-page-entry'));
}));
platformRouter.get('/status-page/incidents', asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'status-page-incident'));
}));

// AI sessions
platformRouter.get('/ai/sessions', asyncHandler(async (req, res) => {
  res.json(await listByKind<AiSession>(req.tenantId, 'ai-session'));
}));
platformRouter.get('/ai/sessions/active', asyncHandler(async (req, res) => {
  // "Active" = most recently updated, matching the mock `getActiveSession`.
  const all = await listByKind<AiSession>(req.tenantId, 'ai-session');
  const sorted = [...all].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(sorted[0] ?? null);
}));
platformRouter.get('/ai/sessions/:id', asyncHandler(async (req, res) => {
  res.json(required(await findByKey<AiSession>(req.tenantId, 'ai-session', req.params.id), 'AiSession'));
}));

// RBAC catalog
platformRouter.get('/rbac/users',        asyncHandler(async (req, res) => res.json(await listRbacUsers(req.tenantId))));
platformRouter.get('/rbac/teams',        asyncHandler(async (req, res) => res.json(await listTeams(req.tenantId))));
platformRouter.get('/rbac/applications', asyncHandler(async (req, res) => res.json(await listApplications(req.tenantId))));
platformRouter.get('/rbac/departments',  asyncHandler(async (req, res) => res.json(await listDepartments(req.tenantId))));
platformRouter.get('/rbac/divisions',    asyncHandler(async (req, res) => res.json(await listDivisions(req.tenantId))));
platformRouter.get('/rbac/roles',        asyncHandler(async (req, res) => res.json(await listFunctionalRoles(req.tenantId))));

// continuity
platformRouter.get('/continuity/dr-plans', asyncHandler(async (req, res) => res.json(await listByKind<DRPlan>(req.tenantId, 'dr-plan'))));
platformRouter.get('/continuity/dr-runs', asyncHandler(async (req, res) => res.json(await listByKind<DRTestRun>(req.tenantId, 'dr-run'))));
platformRouter.get('/continuity/bia', asyncHandler(async (req, res) => res.json(await listByKind<BIAEntry>(req.tenantId, 'bia'))));

// measurement
platformRouter.get('/measurement/reports', asyncHandler(async (req, res) => res.json(await listByKind(req.tenantId, 'report'))));
platformRouter.get('/measurement/roi', asyncHandler(async (req, res) => res.json(await listByKind(req.tenantId, 'roi-calc'))));
platformRouter.get('/measurement/benefits', asyncHandler(async (req, res) => res.json(await listByKind(req.tenantId, 'benefit-measurement'))));
platformRouter.get('/measurement/dashboards', asyncHandler(async (req, res) => res.json(await listByKind(req.tenantId, 'measurement-dashboard'))));
platformRouter.get('/measurement/metrics', asyncHandler(async (req, res) => res.json(await listByKind(req.tenantId, 'metric-def'))));

platformRouter.get('/measurement/exec-summary', asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  // Incident has no resolvedAt column — MTTR always 0 in current schema.
  // SlaTarget is not a dedicated table — stored as Documents; compliance defaults to 0.
  const [changeSample, majorOpen] = await Promise.all([
    prisma.change.findMany({
      where: { tenantId, status: { in: ['successful', 'failed', 'rolled_back'] } },
      select: { status: true },
      take: 200,
      orderBy: { id: 'desc' },
    }),
    prisma.incident.count({ where: { tenantId, isMajor: true, status: { not: 'resolved' } } }),
  ]);
  const changeSuccessPct = changeSample.length
    ? Math.round(changeSample.filter(c => c.status === 'successful').length / changeSample.length * 100)
    : 0;
  res.json({
    slaCompliancePct: 0,
    mttrMinutes: 0,
    changeSuccessPct,
    openMajorIncidents: majorOpen,
  });
}));

platformRouter.post('/measurement/reports', asyncHandler(async (req, res) => {
  const { name, definition, schedule } = req.body ?? {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const { randomUUID } = await import('crypto');
  const row = await prisma.document.create({
    data: {
      tenantId: req.tenantId,
      kind: 'report',
      key: randomUUID(),
      data: JSON.stringify({ name, definition: definition ?? {}, schedule: schedule ?? null, createdBy: req.session?.userId }),
    },
  });
  res.status(201).json({ id: row.id, name, definition: definition ?? {}, schedule: schedule ?? null, createdAt: row.createdAt });
}));
