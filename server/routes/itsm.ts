import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  deploymentsRepo, catalogRepo, kbRepo,
} from '../repositories/docs';
import { listByKind, findByPublicId, findByKey, upsertDocument } from '../repositories/documents';
import { randomUUID } from 'crypto';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qBool, required } from '../util';
import { getActor } from '../auth/session';
import { parsePagination } from '../lib/pagination';
import type { ImprovementInitiative } from '../../src/types';
import {
  createKBArticleSchema, updateKBArticleSchema, setKBArticleStatusSchema,
} from '../../src/shared/schemas/kbArticle';
import { rescheduleChangeSchema, castVoteSchema } from '../../src/shared/schemas/change';
import {
  cancelRequestSchema, reassignRequestStepSchema, addRequestWatcherSchema, createRequestSchema,
} from '../../src/shared/schemas/request';
import { createProblemSchema, updateProblemStatusSchema, promoteKnownErrorSchema } from '../../src/shared/schemas/problem';

export const itsmRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
function scoped(req: Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

itsmRouter.get('/problems', requirePermission('problem.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const where: Record<string, unknown> = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where.search = req.query.search;
  const data = await scoped(req).problems.list(where, pagination);
  res.json(data);
}));
itsmRouter.get('/problems/:publicId', requirePermission('problem.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).problems.get(req.params.publicId), 'Problem'));
}));
itsmRouter.post('/problems', requirePermission('problem.create'), asyncHandler(async (req, res) => {
  const body = createProblemSchema.parse(req.body);
  const actor = await getActor(req);
  const wrapped = await scoped(req).problems.create(body, actor);
  await audit(req, { action: 'create', resourceKind: 'Problem', resourceId: wrapped.result.id, after: wrapped.result, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.result);
}));

itsmRouter.patch('/problems/:publicId/status', requirePermission('problem.update'), asyncHandler(async (req, res) => {
  const body = updateProblemStatusSchema.parse(req.body);
  const wrapped = await scoped(req).problems.setStatus(req.params.publicId, body.status);
  if (!wrapped) throw new HttpError(404, 'Problem not found');
  await audit(req, { action: 'status_change', resourceKind: 'Problem', resourceId: wrapped.after.id, before: { status: wrapped.before.status }, after: { status: wrapped.after.status }, scopeMode: wrapped.scopeMode });
  res.json(wrapped.after);
}));

itsmRouter.post('/problems/:publicId/known-error', requirePermission('problem.update'), asyncHandler(async (req, res) => {
  const body = promoteKnownErrorSchema.parse(req.body);
  const user = await getActor(req);
  const actor = { id: user.id, name: user.name };
  const wrapped = await scoped(req).problems.promoteKnownError(req.params.publicId, body, actor);
  if (!wrapped) throw new HttpError(404, 'Problem not found');
  await audit(req, { action: 'promote_known_error', resourceKind: 'Problem', resourceId: wrapped.after.id, before: { status: wrapped.before.status }, after: { status: wrapped.after.status, knownError: (wrapped.after as unknown as { knownError: unknown }).knownError }, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.after);
}));

itsmRouter.get('/problems/:publicId/timeline', requirePermission('problem.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const data = await scoped(req).problems.timeline(req.params.publicId, pagination);
  if (data === null) throw new HttpError(404, 'Problem not found');
  res.json(data);
}));

itsmRouter.get('/changes', requirePermission('change.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).changes.list(pagination));
}));
itsmRouter.get('/changes/:publicId', requirePermission('change.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).changes.get(req.params.publicId), 'Change'));
}));

// ── Change writes (M6.11) ────────────────────────────────────────────────────

const createChangeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).default(''),
  justification: z.string().max(10_000).default(''),
  type: z.enum(['standard', 'normal', 'emergency']).default('normal'),
  risk: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  impact: z.enum(['minimal', 'minor', 'moderate', 'major', 'extensive']).default('moderate'),
  plannedStart: z.string().min(1),
  plannedEnd: z.string().min(1),
  implementationPlan: z.string().max(20_000).default(''),
  rollbackPlan: z.string().max(20_000).default(''),
  affectedCIIds: z.array(z.string()).default([]),
  applicationId: z.string().optional(),
});

itsmRouter.post('/changes', requirePermission('change.write'), asyncHandler(async (req, res) => {
  const body = createChangeSchema.parse(req.body);
  const requester = await getActor(req);
  const wrapped = await scoped(req).changes.create(requester, body);
  await audit(req, { action: 'create', resourceKind: 'Change', resourceId: wrapped.result.id, after: wrapped.result, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.result);
}));

const cancelChangeSchema = z.object({ reason: z.string().min(1).max(2000) });

itsmRouter.patch('/changes/:publicId/cancel', requirePermission('change.write'), asyncHandler(async (req, res) => {
  const body = cancelChangeSchema.parse(req.body);
  const wrapped = await scoped(req).changes.cancel(req.params.publicId, body.reason);
  if (!wrapped) throw new HttpError(404, 'Change not found');
  const result = wrapped.result;
  if (result === null) throw new HttpError(404, 'Change not found');
  if (result === 'closed') throw new HttpError(409, 'Change is already in a closed state');
  await audit(req, {
    action: 'cancel', resourceKind: 'Change', resourceId: result.after.id,
    before: result.before, after: result.after, scopeMode: wrapped.scopeMode,
  });
  res.json(result.after);
}));

itsmRouter.patch('/changes/:publicId/reschedule', requirePermission('change.write'), asyncHandler(async (req, res) => {
  const body = rescheduleChangeSchema.parse(req.body);
  const actor = await getActor(req);
  const wrapped = await scoped(req).changes.reschedule(req.params.publicId, body, actor);
  if (!wrapped) throw new HttpError(404, 'Change not found');
  const result = wrapped.result;
  if (result.kind === 'not-found') throw new HttpError(404, 'Change not found');
  if (result.kind === 'closed') throw new HttpError(409, 'Change is in a closed state');
  await audit(req, {
    action: 'reschedule', resourceKind: 'Change', resourceId: result.after.id,
    before: { plannedStart: result.before.plannedStart, plannedEnd: result.before.plannedEnd },
    after:  { plannedStart: result.after.plannedStart,  plannedEnd: result.after.plannedEnd, reason: body.reason },
    scopeMode: wrapped.scopeMode,
  });
  res.json(result.after);
}));

// Open-ended schema — the modal collects the full TechnicalAssessment block.
// Validates only the shape `setTechnicalAssessment` actually persists.
const techAssessmentSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'submitted', 'approved', 'rework_required']).optional(),
  objective: z.string().max(10_000).optional(),
  technicalScope: z.string().max(10_000).optional(),
  prerequisites: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  performanceImpact: z.string().max(10_000).optional(),
  securityConsiderations: z.string().max(10_000).optional(),
  observabilityNotes: z.string().max(10_000).optional(),
  risks: z.array(z.unknown()).optional(),
}).passthrough();

itsmRouter.patch('/changes/:publicId/tech-assessment', requirePermission('change.write'), asyncHandler(async (req, res) => {
  const body = techAssessmentSchema.parse(req.body);
  const reviewer = await getActor(req);
  const wrapped = await scoped(req).changes.setTechnicalAssessment(req.params.publicId, reviewer, body);
  if (!wrapped) throw new HttpError(404, 'Change not found');
  if (!wrapped.result) throw new HttpError(404, 'Change not found');
  await audit(req, {
    action: 'update', resourceKind: 'Change', resourceId: wrapped.result.after.id,
    before: { technicalAssessment: wrapped.result.before.technicalAssessment },
    after:  { technicalAssessment: wrapped.result.after.technicalAssessment },
    scopeMode: wrapped.scopeMode,
  });
  res.json(wrapped.result.after);
}));

itsmRouter.post('/changes/:publicId/votes', requirePermission('change.write'), asyncHandler(async (req, res) => {
  const body = castVoteSchema.parse(req.body);
  const actor = await getActor(req);
  const voterId = (body as any).voterId ?? actor.id;
  const voterName = (body as any).voterName ?? actor.name;
  const wrapped = await scoped(req).changes.castVote(req.params.publicId, { ...body, voterId, voterName } as any);
  await audit(req, { action: 'cab_vote', resourceKind: 'Change', resourceId: wrapped.after.id, before: { approvals: wrapped.before.approvals }, after: { approvals: wrapped.after.approvals, status: wrapped.after.status }, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.after);
}));

itsmRouter.get('/releases', requirePermission('release.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).releases.list(pagination));
}));
itsmRouter.get('/releases/:publicId', requirePermission('release.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).releases.get(req.params.publicId), 'Release'));
}));

itsmRouter.get('/deployments', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(qBool(req.query.active)
    ? await deploymentsRepo.active(req.tenantId, pagination)
    : await deploymentsRepo.list(req.tenantId, pagination));
}));
itsmRouter.get('/deployments/:publicId', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  res.json(required(await deploymentsRepo.get(req.tenantId, req.params.publicId), 'Deployment'));
}));
itsmRouter.get('/deployments/:deploymentId/logs', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await deploymentsRepo.logs(req.tenantId, req.params.deploymentId, pagination));
}));
itsmRouter.get('/environments', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await listByKind(req.tenantId, 'environment', pagination));
}));

itsmRouter.get('/requests', requirePermission('request.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).serviceRequests.list(pagination));
}));
itsmRouter.get('/requests/:publicId', requirePermission('request.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).serviceRequests.get(req.params.publicId), 'ServiceRequest'));
}));
itsmRouter.get('/requests/:publicId/comments', requirePermission('request.read'), asyncHandler(async (req, res) => {
  // Verify the request exists first (maps 404 consistently).
  required(await scoped(req).serviceRequests.get(req.params.publicId), 'ServiceRequest');
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await scoped(req).serviceRequests.listComments(req.params.publicId, pagination));
}));
itsmRouter.get('/catalog', requirePermission('request.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await catalogRepo.list(req.tenantId, pagination));
}));

itsmRouter.post('/requests', requirePermission('request.create'), asyncHandler(async (req, res) => {
  const body = createRequestSchema.parse(req.body);
  const actor = await getActor(req);
  const wrapped = await scoped(req).serviceRequests.create(body, actor);
  await audit(req, { action: 'create', resourceKind: 'ServiceRequest', resourceId: wrapped.result.id, after: wrapped.result, scopeMode: wrapped.scopeMode });
  res.status(201).json(wrapped.result);
}));

// ── Request workflow writes (M6.11) ──────────────────────────────────────────

const approveSchema = z.object({ note: z.string().max(2000).optional() });
const rejectSchema  = z.object({ note: z.string().min(1).max(2000) });

const decideStep = (decision: 'approved' | 'rejected') => asyncHandler(async (req, res) => {
  const schema = decision === 'approved' ? approveSchema : rejectSchema;
  const body = schema.parse(req.body);
  const actor = await getActor(req);
  const wrapped = await scoped(req).serviceRequests.decideStep(
    req.params.publicId, req.params.stepId, actor, decision, body.note,
  );
  if (!wrapped) throw new HttpError(404, 'Request not found');
  const result = wrapped.result;
  if (result.kind === 'not-found-request') throw new HttpError(404, 'Request not found');
  if (result.kind === 'not-found-step')    throw new HttpError(404, 'Step not found');
  if (result.kind === 'already-decided')   throw new HttpError(409, 'Step is not awaiting a decision');
  await audit(req, {
    action: decision === 'approved' ? 'step_approve' : 'step_reject',
    resourceKind: 'ServiceRequest',
    resourceId: result.internalId,
    before: { status: result.before.status, step: result.before.workflow.steps.find(s => s.id === req.params.stepId) },
    after:  { status: result.after.status,  step: result.after.workflow.steps.find(s => s.id === req.params.stepId) },
    scopeMode: wrapped.scopeMode,
  });
  res.json(result.after);
});

itsmRouter.post(
  '/requests/:publicId/steps/:stepId/approve',
  requirePermission('request.write'),
  decideStep('approved'),
);

itsmRouter.post(
  '/requests/:publicId/steps/:stepId/reject',
  requirePermission('request.write'),
  decideStep('rejected'),
);

const requestCommentSchema = z.object({ body: z.string().min(1).max(10_000) });

itsmRouter.post(
  '/requests/:publicId/comments',
  requirePermission('request.write'),
  asyncHandler(async (req, res) => {
    const body = requestCommentSchema.parse(req.body);
    const author = await getActor(req);
    const wrapped = await scoped(req).serviceRequests.appendComment(req.params.publicId, author, body.body);
    if (!wrapped || !wrapped.result) throw new HttpError(404, 'Request not found');
    await audit(req, {
      action: 'comment',
      resourceKind: 'ServiceRequest',
      resourceId: wrapped.result.internalId,
      after: wrapped.result.comment,
      scopeMode: wrapped.scopeMode,
    });
    res.status(201).json({ ...wrapped.result.comment, dbId: wrapped.result.dbCommentId });
  }),
);

// ── Request lifecycle writes (M6.11 B2.2) ────────────────────────────────────
// Cancel + reassign-active-step + watcher add/remove. Schemas live in
// src/shared/schemas/request.ts so the client form + service share them.

itsmRouter.patch(
  '/requests/:publicId/cancel',
  requirePermission('request.write'),
  asyncHandler(async (req, res) => {
    const body = cancelRequestSchema.parse(req.body);
    const actor = await getActor(req);
    const wrapped = await scoped(req).serviceRequests.cancel(req.params.publicId, body.reason, actor);
    if (!wrapped) throw new HttpError(404, 'Request not found');
    const result = wrapped.result;
    if (result.kind === 'not-found') throw new HttpError(404, 'Request not found');
    if (result.kind === 'closed')    throw new HttpError(409, 'Request is already in a closed state');
    await audit(req, {
      action: 'request.cancel',
      resourceKind: 'ServiceRequest',
      resourceId: result.internalId,
      before: { status: result.before.status },
      after:  { status: result.after.status, cancellationReason: result.after.cancellationReason, closedAt: result.after.closedAt },
      scopeMode: wrapped.scopeMode,
    });
    res.json(result.after);
  }),
);

itsmRouter.patch(
  '/requests/:publicId/steps/:stepId/reassign',
  requirePermission('request.write'),
  asyncHandler(async (req, res) => {
    const body = reassignRequestStepSchema.parse({ ...req.body, stepId: req.params.stepId });
    const actor = await getActor(req);
    const wrapped = await scoped(req).serviceRequests.reassignStep(
      req.params.publicId, body.stepId,
      { id: body.assigneeId, name: body.assigneeName },
      actor,
    );
    if (!wrapped) throw new HttpError(404, 'Request not found');
    const result = wrapped.result;
    if (result.kind === 'not-found-request') throw new HttpError(404, 'Request not found');
    if (result.kind === 'not-found-step')    throw new HttpError(404, 'Step not found');
    if (result.kind === 'not-active')        throw new HttpError(409, 'Only the active step can be reassigned');
    await audit(req, {
      action: 'request.reassign',
      resourceKind: 'ServiceRequest',
      resourceId: result.internalId,
      before: { step: result.before.workflow.steps.find(s => s.id === body.stepId) },
      after:  { step: result.after.workflow.steps.find(s => s.id === body.stepId) },
      scopeMode: wrapped.scopeMode,
    });
    res.json(result.after);
  }),
);

itsmRouter.post(
  '/requests/:publicId/watchers',
  requirePermission('request.write'),
  asyncHandler(async (req, res) => {
    const body = addRequestWatcherSchema.parse(req.body);
    const actor = await getActor(req);
    const wrapped = await scoped(req).serviceRequests.addWatcher(req.params.publicId, body, actor);
    if (!wrapped) throw new HttpError(404, 'Request not found');
    const result = wrapped.result;
    if (result.kind === 'not-found') throw new HttpError(404, 'Request not found');
    if (result.wasNew) {
      await audit(req, {
        action: 'request.watcher.add',
        resourceKind: 'ServiceRequest',
        resourceId: result.internalId,
        before: { watchers: result.before.watchers ?? [] },
        after:  { watchers: result.after.watchers ?? [] },
        scopeMode: wrapped.scopeMode,
      });
    }
    res.status(result.wasNew ? 201 : 200).json({
      watchers: result.after.watchers ?? [],
      wasNew: result.wasNew,
    });
  }),
);

itsmRouter.delete(
  '/requests/:publicId/watchers/:userId',
  requirePermission('request.write'),
  asyncHandler(async (req, res) => {
    const actor = await getActor(req);
    const wrapped = await scoped(req).serviceRequests.removeWatcher(req.params.publicId, req.params.userId, actor);
    if (!wrapped) throw new HttpError(404, 'Request not found');
    const result = wrapped.result;
    if (result.kind === 'not-found') throw new HttpError(404, 'Request not found');
    if (result.wasPresent) {
      await audit(req, {
        action: 'request.watcher.remove',
        resourceKind: 'ServiceRequest',
        resourceId: result.internalId,
        before: { watchers: result.before.watchers ?? [] },
        after:  { watchers: result.after.watchers ?? [] },
        scopeMode: wrapped.scopeMode,
      });
    }
    res.status(204).end();
  }),
);

// Improvements — DB-backed via documents. Totals/ROI computed inline.
itsmRouter.get('/improvements', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await listByKind<ImprovementInitiative>(req.tenantId, 'improvement', pagination));
}));
itsmRouter.get('/improvements/totals/estimated', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const items = await listByKind<ImprovementInitiative>(req.tenantId, 'improvement');
  res.json(items.reduce((sum, i) => sum + (i.estimatedBenefit?.annualValueUSD ?? 0), 0));
}));
itsmRouter.get('/improvements/totals/actual', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const items = await listByKind<ImprovementInitiative>(req.tenantId, 'improvement');
  res.json(items.reduce((sum, i) => sum + ((i as { actualBenefit?: { annualValueUSD?: number } }).actualBenefit?.annualValueUSD ?? 0), 0));
}));
itsmRouter.get('/improvements/benefit-measurements', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await listByKind(req.tenantId, 'benefit-measurement', pagination));
}));
itsmRouter.post('/improvements/benefit-measurements', requirePermission('improvement.write'), asyncHandler(async (req, res) => {
  const schema = z.object({
    initiativeId:        z.string().min(1),
    initiativePublicId:  z.string().optional().default(''),
    measurementDate:     z.string().min(1),
    periodLabel:         z.string().optional().default(''),
    benefitType:         z.string().min(1),
    measuredValueUSD:    z.number().finite(),
    isEstimate:          z.boolean().optional().default(false),
    supportingMetric:    z.string().optional().default(''),
  });
  const input = schema.parse(req.body);
  const id = randomUUID();
  const measurement = { id, ...input, recordedBy: req.session?.userId ?? null, recordedAt: new Date().toISOString() };
  await upsertDocument(req.tenantId, 'benefit-measurement', id, measurement);
  await audit(req, { action: 'create', resourceKind: 'benefit-measurement', resourceId: id, after: measurement });
  res.status(201).json(measurement);
}));
itsmRouter.get('/improvements/roi', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await listByKind(req.tenantId, 'roi-calc', pagination));
}));
itsmRouter.get('/improvements/:initiativeId/roi', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  const all = await listByKind<{ initiativeId: string }>(req.tenantId, 'roi-calc');
  res.json(all.find(r => r.initiativeId === req.params.initiativeId) ?? null);
}));
itsmRouter.get('/improvements/:publicId', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  // Accept both publicId and internal id, mirroring the legacy `getByAnyId` helper.
  const byPublic = await findByPublicId<ImprovementInitiative>(req.tenantId, 'improvement', req.params.publicId);
  if (byPublic) return res.json(byPublic);
  const byKey = await findByKey<ImprovementInitiative>(req.tenantId, 'improvement', req.params.publicId);
  res.json(required(byKey, 'Improvement'));
}));

// KB articles
itsmRouter.get('/kb/articles', requirePermission('kb.read'), asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  res.json(await kbRepo.list(req.tenantId, pagination));
}));
itsmRouter.get('/kb/articles/:publicId', requirePermission('kb.read'), asyncHandler(async (req, res) => {
  res.json(required(await kbRepo.get(req.tenantId, req.params.publicId), 'KBArticle'));
}));

// ── KB writes (M6.11 B1.5) ───────────────────────────────────────────────────
// Three endpoints: create (draft), partial update (no status), and dedicated
// status transition. Shared Zod schemas live in src/shared/schemas/kbArticle.ts
// so client services + forms can reuse them.

itsmRouter.post('/kb/articles', requirePermission('kb.write'), asyncHandler(async (req, res) => {
  const body = createKBArticleSchema.parse(req.body);
  const author = await getActor(req);
  const { after, internalId } = await kbRepo.create(req.tenantId, author, body);
  await audit(req, { action: 'create', resourceKind: 'KBArticle', resourceId: internalId, after });
  res.status(201).json(after);
}));

itsmRouter.patch('/kb/articles/:publicId', requirePermission('kb.write'), asyncHandler(async (req, res) => {
  const body = updateKBArticleSchema.parse(req.body);
  const result = await kbRepo.update(req.tenantId, req.params.publicId, body);
  if (!result) throw new HttpError(404, 'KB article not found');
  await audit(req, {
    action: 'update', resourceKind: 'KBArticle', resourceId: result.internalId,
    before: result.before, after: result.after,
  });
  res.json(result.after);
}));

itsmRouter.patch('/kb/articles/:publicId/status', requirePermission('kb.write'), asyncHandler(async (req, res) => {
  const body = setKBArticleStatusSchema.parse(req.body);
  const actor = await getActor(req);
  const result = await kbRepo.setStatus(req.tenantId, req.params.publicId, body.status, actor);
  if (result.kind === 'not-found') throw new HttpError(404, 'KB article not found');
  if (result.kind === 'same-status') throw new HttpError(400, `Article is already in status '${body.status}'`);
  if (result.kind === 'terminal') throw new HttpError(400, `Cannot transition from terminal status '${result.from}'`);
  await audit(req, {
    action: 'status_change', resourceKind: 'KBArticle', resourceId: result.internalId,
    before: { status: result.before.status }, after: { status: result.after.status, publishedAt: result.after.publishedAt, publishedBy: result.after.publishedBy },
  });
  res.json(result.after);
}));
