import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { EventStatus, Severity, Event } from '../../src/types';
import { eventsRepo } from '../repositories/events';
import { prisma } from '../db';
import { audit } from '../audit';
import { emitEventCreated } from '../realtime';
import { requirePermission } from '../middleware/auth';
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
    const now = new Date();
    const id = randomUUID();
    const publicId = `EVT-${now.getFullYear()}-${id.slice(0, 6).toUpperCase()}`;
    await prisma.event.create({
      data: {
        id,
        publicId,
        tenantId: req.tenantId,
        type: body.type,
        status: 'open',
        severity: body.severity,
        title: body.title,
        message: body.message,
        source: body.source,
        ruleId: body.ruleId ?? null,
        rulePublicId: body.rulePublicId ?? null,
        ruleName: body.ruleName ?? null,
        affectedCIIds: JSON.stringify(body.affectedCIIds),
        affectedCIPublicIds: JSON.stringify(body.affectedCIPublicIds),
        correlationKey: body.correlationKey ?? id,
        groupCount: 1,
        firedAt: now,
        lastSeenAt: now,
        payload: JSON.stringify(body.payload),
        tags: JSON.stringify(body.tags),
      },
    });
    const created = required(await eventsRepo.get(req.tenantId, publicId), 'Event');
    await audit(req, { action: 'event.ingest', resourceKind: 'Event', resourceId: id, after: created });
    emitEventCreated(req.tenantId, created as Event);
    res.status(201).json(created);
  }),
);
