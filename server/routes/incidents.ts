import { Router, type Request } from 'express';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qBool, qString, required } from '../util';
import { getActor } from '../auth/session';
import { parsePagination } from '../lib/pagination';
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
  createIncidentSchema,
} from '../../src/shared/schemas/incident';

export const incidentsRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
function scoped(req: Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

incidentsRouter.get('/incidents', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const list = await scoped(req).incidents.list(
    {
      active: qBool(req.query.active),
      major: qBool(req.query.major),
      ciId: qString(req.query.ciId),
      problemPublicId: qString(req.query.problemPublicId),
    },
    pagination,
  );
  res.json(list);
}));

incidentsRouter.get('/incidents/:publicId', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).incidents.get(req.params.publicId), 'Incident'));
}));

incidentsRouter.get('/incidents/:incidentId/comments', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).incidents.comments(req.params.incidentId, pagination));
}));

incidentsRouter.get('/incidents/:incidentId/timeline', requirePermission('incident.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).incidents.timeline(req.params.incidentId, pagination));
}));

// POST /incidents/:incidentId/comments — appends a comment and a
// `comment_added` timeline event. ScopeViolationError → 403 via global handler.
incidentsRouter.post(
  '/incidents/:incidentId/comments',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = addIncidentCommentSchema.parse(req.body);
    const author = await getActor(req);
    const wrapped = await scoped(req).incidents.addComment(req.params.incidentId, {
      body: body.body,
      isInternal: body.isInternal,
      mentions: body.mentions,
      authorId: author.id,
      authorName: author.name,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'comment',
      resourceKind: 'Incident',
      resourceId: req.params.incidentId,
      after: wrapped.result,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json(wrapped.result);
  }),
);

// PATCH /incidents/:publicId/status — any status except `resolved`.
incidentsRouter.patch(
  '/incidents/:publicId/status',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = setIncidentStatusSchema.parse(req.body);
    if (body.status === 'resolved') {
      throw new HttpError(400, 'Use POST /incidents/:publicId/resolve to resolve an incident.');
    }
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.setStatus(req.params.publicId, {
      status: body.status,
      actorId: req.session.userId,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'status_change',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

incidentsRouter.post(
  '/incidents/:publicId/resolve',
  requirePermission('incident.resolve'),
  asyncHandler(async (req, res) => {
    const body = resolveIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.resolve(req.params.publicId, {
      summary: body.summary,
      rootCause: body.rootCause,
      workaround: body.workaround,
      resolvedBy: req.session.userId,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'resolve',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

// M6.11 B1.4 — promote to major.
incidentsRouter.post(
  '/incidents/:publicId/promote-major',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = promoteMajorSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.promoteMajor(req.params.publicId, {
      actorId: req.session.userId,
      incidentCommander: body.incidentCommander,
      summary: body.summary,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'promote_major',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

// M6.11 B5.1 — war-room stand-down.
incidentsRouter.post(
  '/incidents/:publicId/stand-down',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = standDownIncidentSchema.parse(req.body);
    const actor = await getActor(req);
    const wrapped = await scoped(req).incidents.standDown(req.params.publicId, {
      actorId: actor.id,
      actorName: actor.name,
      reason: body.reason,
      newPriority: body.newPriority,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'stand_down',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

// M6.11 B5.1 — append a `comms_posted` timeline event.
incidentsRouter.post(
  '/incidents/:publicId/comms',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = postCommsSchema.parse(req.body);
    const actor = await getActor(req);
    const wrapped = await scoped(req).incidents.postComms(req.params.publicId, {
      actorId: actor.id,
      actorName: actor.name,
      audience: body.audience,
      message: body.message,
      channels: body.channels,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'comms_posted',
      resourceKind: 'Incident',
      resourceId: wrapped.result.incidentInternalId,
      after: wrapped.result.event,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json(wrapped.result.event);
  }),
);

// M6.11 B4.1 — generic incident patch (priority, tags).
incidentsRouter.patch(
  '/incidents/:publicId',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = updateIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.update(req.params.publicId, {
      actorId: req.session.userId,
      priority: body.priority,
      tags: body.tags,
      description: body.description,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'update',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

incidentsRouter.patch(
  '/incidents/:publicId/assign',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = assignIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.assign(req.params.publicId, {
      actorId: req.session.userId,
      assigneeId: body.assigneeId,
      assigneeName: body.assigneeName,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'assign',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

incidentsRouter.patch(
  '/incidents/:publicId/links',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = updateIncidentLinksSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.setLinks(req.params.publicId, {
      actorId: req.session.userId,
      affectedCIIds: body.affectedCIIds,
      linkedProblemId: body.linkedProblemId,
      linkedChangeIds: body.linkedChangeIds,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'update_links',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.json(wrapped.result.after);
  }),
);

// Watcher add — idempotent. Returns 201 if newly added, 200 if already present.
incidentsRouter.post(
  '/incidents/:incidentId/watchers',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    const body = addWatcherSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.addWatcher(req.params.incidentId, {
      actorId: req.session.userId,
      userId: body.userId,
      userName: body.userName,
    });
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    if (wrapped.result.wasNew) {
      await audit(req, {
        action: 'add_watcher',
        resourceKind: 'Incident',
        resourceId: wrapped.result.internalId,
        before: wrapped.result.before,
        after: wrapped.result.after,
        scopeMode: wrapped.scopeMode,
      });
    }
    res.status(wrapped.result.wasNew ? 201 : 200).json({
      watchers: wrapped.result.after.watchers ?? [],
      added: wrapped.result.wasNew,
    });
  }),
);

incidentsRouter.delete(
  '/incidents/:incidentId/watchers/:userId',
  requirePermission('incident.write'),
  asyncHandler(async (req, res) => {
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const wrapped = await scoped(req).incidents.removeWatcher(
      req.params.incidentId,
      req.params.userId,
      req.session.userId,
    );
    if (!wrapped) throw new HttpError(404, 'Incident not found');
    await audit(req, {
      action: 'remove_watcher',
      resourceKind: 'Incident',
      resourceId: wrapped.result.internalId,
      before: wrapped.result.before,
      after: wrapped.result.after,
      scopeMode: wrapped.scopeMode,
    });
    res.status(204).end();
  }),
);

incidentsRouter.post(
  '/incidents',
  requirePermission('incident.create'),
  asyncHandler(async (req, res) => {
    const body = createIncidentSchema.parse(req.body);
    if (!req.session) throw new HttpError(401, 'Authentication required');
    const actor = await getActor(req);
    const wrapped = await (scoped(req).incidents.create as any)(
      {
        title: body.title,
        description: body.description,
        priority: body.priority,
        assigneeId: body.assigneeId ?? null,
        affectedCIIds: body.affectedCIIds,
        tags: body.tags,
        applicationId: body.applicationId ?? null,
        channel: body.channel,
      },
      actor,
    );
    await audit(req, {
      action: 'create',
      resourceKind: 'Incident',
      resourceId: wrapped.result.id,
      after: wrapped.result,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json(wrapped.result);
  }),
);
