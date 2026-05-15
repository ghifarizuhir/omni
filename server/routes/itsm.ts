import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  deploymentsRepo, catalogRepo, kbRepo,
} from '../repositories/docs';
import { listByKind, findByPublicId, findByKey } from '../repositories/documents';
import { audit } from '../audit';
import { requirePermission } from '../middleware/auth';
import { asyncHandler, HttpError, qBool, required } from '../util';
import { getActor } from '../auth/session';
import type { ImprovementInitiative } from '../../src/types';
import {
  createKBArticleSchema, updateKBArticleSchema, setKBArticleStatusSchema,
} from '../../src/shared/schemas/kbArticle';
import { rescheduleChangeSchema } from '../../src/shared/schemas/change';
import {
  cancelRequestSchema, reassignRequestStepSchema, addRequestWatcherSchema,
} from '../../src/shared/schemas/request';

export const itsmRouter = Router();

/** Convenience accessor — `req.scoped` is attached by withScopedDb middleware. */
function scoped(req: Request) {
  if (!req.scoped) throw new HttpError(500, 'scope not initialized');
  return req.scoped;
}

itsmRouter.get('/problems', requirePermission('problem.read'), asyncHandler(async (req, res) => res.json(await scoped(req).problems.list())));
itsmRouter.get('/problems/:publicId', requirePermission('problem.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).problems.get(req.params.publicId), 'Problem'));
}));

itsmRouter.get('/changes', requirePermission('change.read'), asyncHandler(async (req, res) => res.json(await scoped(req).changes.list())));
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

itsmRouter.get('/releases', requirePermission('release.read'), asyncHandler(async (req, res) => res.json(await scoped(req).releases.list())));
itsmRouter.get('/releases/:publicId', requirePermission('release.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).releases.get(req.params.publicId), 'Release'));
}));

itsmRouter.get('/deployments', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  res.json(qBool(req.query.active)
    ? await deploymentsRepo.active(req.tenantId)
    : await deploymentsRepo.list(req.tenantId));
}));
itsmRouter.get('/deployments/:publicId', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  res.json(required(await deploymentsRepo.get(req.tenantId, req.params.publicId), 'Deployment'));
}));
itsmRouter.get('/deployments/:deploymentId/logs', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  res.json(await deploymentsRepo.logs(req.tenantId, req.params.deploymentId));
}));
itsmRouter.get('/environments', requirePermission('deployment.read'), asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'environment'));
}));

itsmRouter.get('/requests', requirePermission('request.read'), asyncHandler(async (req, res) => res.json(await scoped(req).serviceRequests.list())));
itsmRouter.get('/requests/:publicId', requirePermission('request.read'), asyncHandler(async (req, res) => {
  res.json(required(await scoped(req).serviceRequests.get(req.params.publicId), 'ServiceRequest'));
}));
itsmRouter.get('/requests/:publicId/comments', requirePermission('request.read'), asyncHandler(async (req, res) => {
  // Verify the request exists first (maps 404 consistently).
  required(await scoped(req).serviceRequests.get(req.params.publicId), 'ServiceRequest');
  res.json(await scoped(req).serviceRequests.listComments(req.params.publicId));
}));
itsmRouter.get('/catalog', requirePermission('request.read'), asyncHandler(async (req, res) => res.json(await catalogRepo.list(req.tenantId))));

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
  res.json(await listByKind<ImprovementInitiative>(req.tenantId, 'improvement'));
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
  res.json(await listByKind(req.tenantId, 'benefit-measurement'));
}));
itsmRouter.get('/improvements/roi', requirePermission('improvement.read'), asyncHandler(async (req, res) => {
  res.json(await listByKind(req.tenantId, 'roi-calc'));
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
itsmRouter.get('/kb/articles', requirePermission('kb.read'), asyncHandler(async (req, res) => res.json(await kbRepo.list(req.tenantId))));
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
