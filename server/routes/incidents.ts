import { Router } from 'express';
import { incidentsRepo } from '../repositories/incidents';
import { audit } from '../audit';
import { prisma } from '../db';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qBool, qString, required } from '../util';
import {
  resolveIncidentSchema,
  addIncidentCommentSchema,
  setIncidentStatusSchema,
} from '../../src/shared/schemas/incident';

export const incidentsRouter = Router();

incidentsRouter.get('/incidents', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const list = await incidentsRepo.list(req.tenantId, {
    active: qBool(req.query.active),
    major: qBool(req.query.major),
    ciId: qString(req.query.ciId),
    problemPublicId: qString(req.query.problemPublicId),
  });
  res.json(list);
}));

incidentsRouter.get('/incidents/:publicId', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  res.json(required(await incidentsRepo.get(req.tenantId, req.params.publicId), 'Incident'));
}));

incidentsRouter.get('/incidents/:incidentId/comments', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  res.json(await incidentsRepo.comments(req.tenantId, req.params.incidentId));
}));

incidentsRouter.get('/incidents/:incidentId/timeline', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  res.json(await incidentsRepo.timeline(req.tenantId, req.params.incidentId));
}));

// M6.11 demo slice — POST /incidents/:publicId/resolve. First mutation route
// in the post-M6.4 remediation. Pattern: Zod-validate body (shared schema —
// see src/shared/schemas/incident.ts), repo writes incident snapshot +
// timeline event in one transaction, route emits audit log with before/after.

// POST /incidents/:incidentId/comments — appends a comment and a
// `comment_added` timeline event. Uses the internal `incidentId` to match the
// existing GET path; the frontend passes `incident.id`.
incidentsRouter.post(
  '/incidents/:incidentId/comments',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = addIncidentCommentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const author = await prisma.user.findUniqueOrThrow({
      where: { id: req.session.userId },
      select: { id: true, name: true },
    });
    let comment;
    try {
      comment = await incidentsRepo.addComment(req.tenantId, req.params.incidentId, {
        body: body.body,
        isInternal: body.isInternal,
        mentions: body.mentions,
        authorId: author.id,
        authorName: author.name,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'comment',
      resourceKind: 'Incident',
      resourceId: req.params.incidentId,
      after: comment,
    });
    res.status(201).json(comment);
  }),
);

// PATCH /incidents/:publicId/status — any status except `resolved` (use
// /resolve, which requires a resolution block). Appends a `status_changed`
// timeline event.
incidentsRouter.patch(
  '/incidents/:publicId/status',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = setIncidentStatusSchema.parse(req.body);
    if (body.status === 'resolved') {
      throw new HttpError(400, 'Use POST /incidents/:publicId/resolve to resolve an incident.');
    }
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.setStatus(req.tenantId, req.params.publicId, {
        status: body.status,
        actorId: req.session.userId,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'status_change',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

incidentsRouter.post(
  '/incidents/:publicId/resolve',
  requirePermission('incident.resolve'),
  asyncHandler(async (req, res) => {
    const body = resolveIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.resolve(req.tenantId, req.params.publicId, {
        summary: body.summary,
        rootCause: body.rootCause,
        workaround: body.workaround,
        resolvedBy: req.session.userId,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'resolve',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);
