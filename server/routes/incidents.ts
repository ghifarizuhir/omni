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
  promoteMajorSchema,
  assignIncidentSchema,
  updateIncidentLinksSchema,
  addWatcherSchema,
  updateIncidentSchema,
  standDownIncidentSchema,
  postCommsSchema,
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

// M6.11 B1.4 — promote to major. `incident.major` is not yet in the RBAC
// catalog (see prisma/seedRbac.ts), so we guard with `incident.write`.
incidentsRouter.post(
  '/incidents/:publicId/promote-major',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = promoteMajorSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.promoteMajor(req.tenantId, req.params.publicId, {
        actorId: req.session.userId,
        incidentCommander: body.incidentCommander,
        summary: body.summary,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'promote_major',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

// M6.11 B5.1 — war-room stand-down. Inverse of promote-major: demotes a major
// incident, sets the new priority (defaults P2), records the legally required
// `reason` on the timeline event. Same `incident.write` permission as
// promote-major (the `incident.major` key isn't in the RBAC catalog yet — see
// prisma/seedRbac.ts).
incidentsRouter.post(
  '/incidents/:publicId/stand-down',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = standDownIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: req.session.userId },
      select: { id: true, name: true },
    });
    let result;
    try {
      result = await incidentsRepo.standDown(req.tenantId, req.params.publicId, {
        actorId: actor.id,
        actorName: actor.name,
        reason: body.reason,
        newPriority: body.newPriority,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'stand_down',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

// M6.11 B5.1 — append a `comms_posted` timeline event. No incident snapshot
// change. Returns the created timeline event.
incidentsRouter.post(
  '/incidents/:publicId/comms',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = postCommsSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const actor = await prisma.user.findUniqueOrThrow({
      where: { id: req.session.userId },
      select: { id: true, name: true },
    });
    let result;
    try {
      result = await incidentsRepo.postComms(req.tenantId, req.params.publicId, {
        actorId: actor.id,
        actorName: actor.name,
        audience: body.audience,
        message: body.message,
        channels: body.channels,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'comms_posted',
      resourceKind: 'Incident',
      resourceId: result.incidentInternalId,
      after: result.event,
    });
    res.status(201).json(result.event);
  }),
);

// M6.11 B4.1 — generic incident patch for fields without specialized routes
// (priority, tags). Used by IncidentQueue bulk-edit (B4.2). Audit `action`
// stays `'update'` to match the sibling `'assign'` / `'status_change'` keys.
incidentsRouter.patch(
  '/incidents/:publicId',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = updateIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.update(req.tenantId, req.params.publicId, {
        actorId: req.session.userId,
        priority: body.priority,
        tags: body.tags,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'update',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

incidentsRouter.patch(
  '/incidents/:publicId/assign',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = assignIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.assign(req.tenantId, req.params.publicId, {
        actorId: req.session.userId,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'assign',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

incidentsRouter.patch(
  '/incidents/:publicId/links',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = updateIncidentLinksSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.setLinks(req.tenantId, req.params.publicId, {
        actorId: req.session.userId,
        affectedCIIds: body.affectedCIIds,
        linkedProblemId: body.linkedProblemId,
        linkedChangeIds: body.linkedChangeIds,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    await audit(req, {
      action: 'update_links',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.json(result.after);
  }),
);

// Watcher add — idempotent. Returns 201 if newly added, 200 if already
// present. Body validated against addWatcherSchema. Uses internal incidentId.
incidentsRouter.post(
  '/incidents/:incidentId/watchers',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = addWatcherSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.addWatcher(req.tenantId, req.params.incidentId, {
        actorId: req.session.userId,
        userId: body.userId,
        userName: body.userName,
      });
    } catch {
      throw new HttpError(404, 'Incident not found');
    }
    if (result.wasNew) {
      await audit(req, {
        action: 'add_watcher',
        resourceKind: 'Incident',
        resourceId: result.internalId,
        before: result.before,
        after: result.after,
      });
    }
    res.status(result.wasNew ? 201 : 200).json({
      watchers: result.after.watchers ?? [],
      added: result.wasNew,
    });
  }),
);

incidentsRouter.delete(
  '/incidents/:incidentId/watchers/:userId',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    if (!req.session) throw new HttpError(401, 'Authentication required');
    let result;
    try {
      result = await incidentsRepo.removeWatcher(
        req.tenantId,
        req.params.incidentId,
        req.params.userId,
        req.session.userId,
      );
    } catch (e) {
      throw new HttpError(404, (e as Error).message === 'WATCHER_NOT_FOUND' ? 'Watcher not found' : 'Incident not found');
    }
    await audit(req, {
      action: 'remove_watcher',
      resourceKind: 'Incident',
      resourceId: result.internalId,
      before: result.before,
      after: result.after,
    });
    res.status(204).end();
  }),
);
