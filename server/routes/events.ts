import { Router, type Request } from 'express';
import { z } from 'zod';
import type { EventStatus, Severity, Event } from '../../src/types';
import { eventsRepo } from '../repositories/events';
import { audit } from '../audit';
import { emitEventCreated } from '../realtime';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qStringArray, required } from '../util';
import { setEventStatusSchema } from '../../src/shared/schemas/event';
import { ScopeViolationError } from '../scope/errors';
import { applyEnforcement } from '../scope/enforcement';

const SEVERITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export const eventsRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
function scoped(req: Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

eventsRouter.get('/events', requirePermission('event.read'), asyncHandler(async (req, res) => {
  const events = await scoped(req).events.list({
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

eventsRouter.get('/events/dashboard-stats', requirePermission('event.read'), asyncHandler(async (req, res) => {
  res.json(await scoped(req).events.dashboardStats());
}));

eventsRouter.get('/events/:publicId', requirePermission('event.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).events.get(req.params.publicId), 'Event'));
}));

// M6.11 (B1.2) — PATCH /events/:publicId/status. Acknowledge / resolve / set
// any other EventStatus. Mirrors the incidents PATCH /status shape: Zod body,
// repo writes the snapshot in a transaction, route emits an audit log with
// before/after.
eventsRouter.patch(
  '/events/:publicId/status',
  requirePermission('event.write'),
  asyncHandler(async (req, res) => {
    const body = setEventStatusSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    try {
      const wrapped = await scoped(req).events.setStatus(req.params.publicId, {
        status: body.status,
        actorId: req.session.userId,
        note: body.note,
      });
      if (!wrapped) throw new HttpError(404, 'Event not found');
      await audit(req, {
        action: 'status_change',
        resourceKind: 'Event',
        resourceId: wrapped.result.internalId,
        before: wrapped.result.before,
        after: wrapped.result.after,
        scopeMode: wrapped.scopeMode,
      });
      res.json(wrapped.result.after);
    } catch (e) {
      if (e instanceof ScopeViolationError) {
        applyEnforcement(e, res);
        // Bypass: perform the update via the raw repo (scope already checked intent).
        let result;
        try {
          result = await eventsRepo.setStatus(req.tenantId, req.params.publicId, {
            status: body.status,
            actorId: req.session!.userId,
            note: body.note,
          });
        } catch {
          throw new HttpError(404, 'Event not found');
        }
        await audit(req, {
          action: 'status_change',
          resourceKind: 'Event',
          resourceId: result.internalId,
          before: result.before,
          after: result.after,
          scopeMode: 'bypass',
        });
        return res.json(result.after);
      }
      throw e;
    }
  }),
);

// ── Ingest ───────────────────────────────────────────────────────────────────
// External producers (Prometheus webhook, OpenTelemetry collector, synthetic
// probes, etc.) post here. We persist the Event then fan it out via
// Socket.IO so any open Monitoring view updates without polling.

const ingestSchema = z.object({
  type: z.enum(['informational', 'warning', 'exception']).default('warning'),
  severity: z.enum(['P1', 'P2', 'P3', 'P4']).default('P3'),
  title: z.string().min(1),
  message: z.string().min(1).default(''),
  source: z.enum([
    'prometheus', 'opentelemetry', 'log_pattern', 'synthetic',
    'webhook', 'cicd', 'cloud_provider', 'manual',
  ]).default('webhook'),
  ruleId: z.string().optional(),
  rulePublicId: z.string().optional(),
  ruleName: z.string().optional(),
  affectedCIIds: z.array(z.string()).default([]),
  affectedCIPublicIds: z.array(z.string()).default([]),
  correlationKey: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
});

eventsRouter.post('/events/ingest',
  requirePermission('event.write'),
  asyncHandler(async (req, res) => {
    const body = ingestSchema.parse(req.body);
    const { id, publicId, scopeMode } = await scoped(req).events.ingest({
      type: body.type,
      severity: body.severity,
      title: body.title,
      message: body.message,
      source: body.source,
      ruleId: body.ruleId ?? null,
      rulePublicId: body.rulePublicId ?? null,
      ruleName: body.ruleName ?? null,
      affectedCIIds: body.affectedCIIds,
      affectedCIPublicIds: body.affectedCIPublicIds,
      correlationKey: body.correlationKey,
      payload: body.payload,
      tags: body.tags,
    });
    const created = required(await scoped(req).events.get(publicId), 'Event');
    await audit(req, { action: 'event.ingest', resourceKind: 'Event', resourceId: id, after: created, scopeMode });
    emitEventCreated(req.tenantId, created as Event);
    res.status(201).json(created);
  }),
);
