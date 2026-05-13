import { Router } from 'express';
import type { EventStatus, Severity } from '../../src/types';
import { eventsRepo } from '../repositories/events';
import { asyncHandler, qStringArray, required } from '../util';

const SEVERITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export const eventsRouter = Router();

eventsRouter.get('/events', asyncHandler(async (req, res) => {
  const events = await eventsRepo.list(req.tenantId, {
    status: qStringArray(req.query.status) as EventStatus[] | undefined,
    severities: qStringArray(req.query.severities) as Severity[] | undefined,
    ruleId: typeof req.query.ruleId === 'string' ? req.query.ruleId : undefined,
  });
  const sorted = [...events].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime(),
  );
  res.json(sorted);
}));

eventsRouter.get('/events/dashboard-stats', asyncHandler(async (req, res) => {
  res.json(await eventsRepo.dashboardStats(req.tenantId));
}));

eventsRouter.get('/events/:publicId', asyncHandler(async (req, res) => {
  res.json(required(await eventsRepo.get(req.tenantId, req.params.publicId), 'Event'));
}));
