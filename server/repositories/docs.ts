// Document-style repository helper for M3 domains.
//
// Many of the migrated domains share the same shape: { id, publicId, tenantId,
// <a couple of indexed fields>, data: JSON }. Rather than duplicate
// list/get/parse logic per domain, this helper provides typed CRUD over any
// such table by accepting the Prisma delegate.

import { prisma } from '../db';

const parse = <T>(s: string, fb: T): T => { try { return JSON.parse(s) as T; } catch { return fb; } };

// Prisma's per-model delegate types are tightly typed, so the generic helper
// uses `any` for the delegate. Each call site keeps its own return-type
// guarantee through the `T` generic.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = any;

export const listDocs = async <T,>(delegate: Delegate, tenantId: string, where: Record<string, unknown> = {}): Promise<T[]> => {
  const rows: Array<{ data: string }> = await delegate.findMany({ where: { tenantId, ...where } });
  return rows.map(r => parse<T>(r.data, {} as T));
};

export const getDocByPublicId = async <T,>(delegate: Delegate, tenantId: string, publicId: string): Promise<T | null> => {
  const row: { data: string } | null = await delegate.findFirst({ where: { tenantId, publicId } });
  return row ? parse<T>(row.data, {} as T) : null;
};

export const getDocById = async <T,>(delegate: Delegate, tenantId: string, id: string): Promise<T | null> => {
  const row: { data: string } | null = await delegate.findFirst({ where: { tenantId, id } });
  return row ? parse<T>(row.data, {} as T) : null;
};

// Domain-specific accessors. Kept thin so swapping the underlying table later
// (e.g. extracting columns from `data`) is a localized change.

import type {
  Problem, Change, Release, Deployment, DeploymentLogEntry, ServiceRequest,
  RequestComment, CatalogItem, Integration, KBArticle,
} from '../../src/types';
import type { Service } from '../../src/services/cmdbService';
import { randomUUID } from 'node:crypto';

export const servicesRepo = {
  list: (tenantId: string) => listDocs<Service>(prisma.service, tenantId),
  get: (tenantId: string, id: string) => getDocById<Service>(prisma.service, tenantId, id),
};

export const problemsRepo = {
  list: (tenantId: string) => listDocs<Problem>(prisma.problem, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Problem>(prisma.problem, tenantId, publicId),
};

// Closed states for a Change — `cancel` refuses to transition from these.
const CLOSED_CHANGE_STATES = new Set(['closed_successful', 'closed_failed', 'rejected', 'cancelled']);

export const changesRepo = {
  list: (tenantId: string) => listDocs<Change>(prisma.change, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Change>(prisma.change, tenantId, publicId),

  // Allocates a publicId, persists the row, and returns the full Change so the
  // route can echo it back. Drafts only — workflow transitions (submit, CAB,
  // schedule, implement) go through dedicated endpoints later in M6.11.
  async create(
    tenantId: string,
    requester: { id: string; name: string },
    input: Pick<Change,
      'title' | 'description' | 'justification' | 'type' | 'risk' | 'impact'
      | 'plannedStart' | 'plannedEnd' | 'implementationPlan' | 'rollbackPlan' | 'affectedCIIds'
    >,
  ): Promise<Change> {
    const now = new Date();
    const id = `chg-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    // Best-effort sequential publicId. A real DB sequence would be safer but
    // out of scope for this slice; collisions surface as a P2002 unique error.
    const count = await prisma.change.count({ where: { tenantId } });
    const publicId = `CHG-${now.getUTCFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const riskScore =
      input.risk === 'critical' ? 95 :
      input.risk === 'high'     ? 80 :
      input.risk === 'medium'   ? 55 :
                                   25;
    const change: Change = {
      id,
      publicId,
      title: input.title,
      description: input.description,
      justification: input.justification,
      type: input.type,
      status: 'draft',
      risk: input.risk,
      impact: input.impact,
      riskScore,
      riskFactors: [],
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      implementationWindow: `${input.plannedStart} → ${input.plannedEnd}`,
      requesterId: requester.id,
      requesterName: requester.name,
      ownerId: requester.id,
      ownerName: requester.name,
      ownerTeamId: '',
      affectedCIIds: input.affectedCIIds,
      affectedCIPublicIds: [],
      affectedServiceIds: [],
      implementationPlan: input.implementationPlan,
      rollbackPlan: input.rollbackPlan,
      // Optional sections — leave undefined until the workflow fills them in.
    } as unknown as Change;
    await prisma.change.create({
      data: {
        id,
        publicId,
        tenantId,
        status: 'draft',
        riskLevel: input.risk,
        scheduledStart: new Date(input.plannedStart),
        data: JSON.stringify(change),
      },
    });
    return change;
  },

  // Idempotency: refuses to cancel a change that's already in a closed state
  // (returns null → route maps to 409).
  async cancel(tenantId: string, publicId: string, reason: string): Promise<{ before: Change; after: Change } | null | 'closed'> {
    const row = await prisma.change.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parse<Change>(row.data, {} as Change);
    if (CLOSED_CHANGE_STATES.has(before.status)) return 'closed';
    const after: Change = { ...before, status: 'cancelled', cancellationReason: reason } as unknown as Change;
    await prisma.change.update({
      where: { id: row.id },
      data: { status: 'cancelled', data: JSON.stringify(after) },
    });
    return { before, after };
  },

  // M6.11 (B2.1) — Reschedule an active change: update plannedStart/plannedEnd,
  // refresh implementationWindow, append a rescheduleHistory entry, and mirror
  // the new plannedStart to the column-level `scheduledStart` (matches `create`).
  // Refuses to reschedule changes in a terminal state (returns sentinel).
  async reschedule(
    tenantId: string,
    publicId: string,
    input: { plannedStart: string; plannedEnd: string; reason: string },
    actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: Change; after: Change }
    | { kind: 'not-found' }
    | { kind: 'closed' }
  > {
    return prisma.$transaction(async (tx) => {
      const row = await tx.change.findFirst({ where: { tenantId, publicId } });
      if (!row) return { kind: 'not-found' as const };
      const before = parse<Change>(row.data, {} as Change);
      if (CLOSED_CHANGE_STATES.has(before.status)) return { kind: 'closed' as const };

      const rescheduledAt = new Date().toISOString();
      const historyEntry = {
        plannedStart: input.plannedStart,
        plannedEnd:   input.plannedEnd,
        reason:       input.reason,
        rescheduledBy: actor.id,
        rescheduledByName: actor.name,
        rescheduledAt,
      };

      const after: Change = {
        ...before,
        plannedStart: input.plannedStart,
        plannedEnd:   input.plannedEnd,
        implementationWindow: `${input.plannedStart} → ${input.plannedEnd}`,
        rescheduleHistory: [...(before.rescheduleHistory ?? []), historyEntry],
      } as unknown as Change;

      await tx.change.update({
        where: { id: row.id },
        data: {
          scheduledStart: new Date(input.plannedStart),
          data: JSON.stringify(after),
        },
      });
      return { kind: 'ok' as const, before, after };
    });
  },

  // Merges a partial TechnicalAssessment onto the change and stamps the
  // reviewer. Caller passes a tech-assessment object; we overwrite (not deep
  // merge — the modal collects the whole block at once).
  async setTechnicalAssessment(
    tenantId: string,
    publicId: string,
    assessment: Record<string, unknown>,
    reviewer: { id: string; name: string },
  ): Promise<{ before: Change; after: Change } | null> {
    const row = await prisma.change.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parse<Change>(row.data, {} as Change);
    const after: Change = {
      ...before,
      technicalAssessment: {
        ...(before.technicalAssessment ?? {}),
        ...assessment,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
      },
    } as unknown as Change;
    await prisma.change.update({
      where: { id: row.id },
      data: { data: JSON.stringify(after) },
    });
    return { before, after };
  },
};

export const releasesRepo = {
  list: (tenantId: string) => listDocs<Release>(prisma.release, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Release>(prisma.release, tenantId, publicId),
};

export const deploymentsRepo = {
  list: (tenantId: string) => listDocs<Deployment>(prisma.deployment, tenantId),
  active: async (tenantId: string) =>
    (await listDocs<Deployment>(prisma.deployment, tenantId))
      .filter(d => d.status === 'running' || d.status === 'pending'),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Deployment>(prisma.deployment, tenantId, publicId),
  logs: (tenantId: string, deploymentId: string) =>
    listDocs<DeploymentLogEntry>(prisma.deploymentLog, tenantId, { deploymentId }),
};

// Sentinel return values for workflow mutations — let the route map them to
// HTTP codes without re-querying the row.
type StepDecideResult =
  | { kind: 'ok'; before: ServiceRequest; after: ServiceRequest; internalId: string }
  | { kind: 'not-found-request' }
  | { kind: 'not-found-step' }
  | { kind: 'already-decided' };

// M6.11 (B2.2) — terminal states for a ServiceRequest. `cancel` refuses to
// transition into 'cancelled' from any of these.
const CLOSED_REQUEST_STATES = new Set(['fulfilled', 'closed', 'cancelled', 'rejected']);

export const requestsRepo = {
  list: (tenantId: string) => listDocs<ServiceRequest>(prisma.serviceRequest, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<ServiceRequest>(prisma.serviceRequest, tenantId, publicId),

  async decideStep(
    tenantId: string,
    publicId: string,
    stepId: string,
    decision: 'approved' | 'rejected',
    actor: { id: string; name: string },
    note?: string,
  ): Promise<StepDecideResult> {
    const row = await prisma.serviceRequest.findFirst({ where: { tenantId, publicId } });
    if (!row) return { kind: 'not-found-request' };
    const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
    const stepIdx = before.workflow.steps.findIndex(s => s.id === stepId);
    if (stepIdx === -1) return { kind: 'not-found-step' };
    const step = before.workflow.steps[stepIdx];
    if (step.status !== 'active' || step.type !== 'approval') return { kind: 'already-decided' };

    const now = new Date().toISOString();
    const updatedStep = {
      ...step,
      status: decision === 'approved' ? ('completed' as const) : ('rejected' as const),
      decision,
      decisionNote: note,
      decidedAt: now,
      decidedBy: actor.id,
      completedAt: now,
    };
    const steps = [...before.workflow.steps];
    steps[stepIdx] = updatedStep;

    // On approve, advance to the next pending step and activate it. On reject,
    // skip remaining steps and flip the request to `rejected`.
    let currentStepIndex = before.workflow.currentStepIndex;
    let nextRequestStatus = before.status;
    if (decision === 'approved') {
      // Find the first remaining step that's still `pending` and activate it.
      const nextIdx = steps.findIndex((s, i) => i > stepIdx && s.status === 'pending');
      if (nextIdx !== -1) {
        steps[nextIdx] = { ...steps[nextIdx], status: 'active', startedAt: now };
        currentStepIndex = nextIdx;
      } else {
        // No more pending steps — approval phase done. Move the request out of
        // `submitted` once all approvals have completed.
        nextRequestStatus = 'approved';
      }
    } else {
      nextRequestStatus = 'rejected';
      // Mark any remaining pending steps as skipped so the UI stops showing
      // them as "next up".
      for (let i = stepIdx + 1; i < steps.length; i++) {
        if (steps[i].status === 'pending' || steps[i].status === 'active') {
          steps[i] = { ...steps[i], status: 'skipped' };
        }
      }
    }

    const after: ServiceRequest = {
      ...before,
      status: nextRequestStatus,
      workflow: { ...before.workflow, currentStepIndex, steps },
    };
    await prisma.serviceRequest.update({
      where: { id: row.id },
      data: { status: nextRequestStatus, data: JSON.stringify(after) },
    });
    return { kind: 'ok', before, after, internalId: row.id };
  },

  async addComment(
    tenantId: string,
    publicId: string,
    actor: { id: string; name: string },
    body: string,
  ): Promise<{ comment: RequestComment; internalId: string } | null> {
    const row = await prisma.serviceRequest.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
    const comment: RequestComment = {
      id: randomUUID(),
      authorId: actor.id,
      authorName: actor.name,
      body,
      createdAt: new Date().toISOString(),
    };
    const after: ServiceRequest = {
      ...before,
      comments: [...(before.comments ?? []), comment],
      commentCount: (before.commentCount ?? 0) + 1,
    };
    await prisma.serviceRequest.update({
      where: { id: row.id },
      data: { data: JSON.stringify(after) },
    });
    return { comment, internalId: row.id };
  },

  // M6.11 (B2.2) — cancel a service request. Sets status to 'cancelled',
  // stamps cancellationReason + closedAt, and skips any remaining
  // pending/active workflow steps so the UI stops showing "next up".
  // Idempotency: refuses to cancel a request already in a terminal state
  // (returns `{ kind: 'closed' }` → route maps to 409).
  async cancel(
    tenantId: string,
    publicId: string,
    reason: string,
    _actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: ServiceRequest; after: ServiceRequest; internalId: string }
    | { kind: 'not-found' }
    | { kind: 'closed' }
  > {
    return prisma.$transaction(async (tx) => {
      const row = await tx.serviceRequest.findFirst({ where: { tenantId, publicId } });
      if (!row) return { kind: 'not-found' as const };
      const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
      if (CLOSED_REQUEST_STATES.has(before.status)) return { kind: 'closed' as const };

      const now = new Date().toISOString();
      const steps = (before.workflow?.steps ?? []).map(s =>
        s.status === 'pending' || s.status === 'active' ? { ...s, status: 'skipped' as const } : s,
      );
      const after: ServiceRequest = {
        ...before,
        status: 'cancelled',
        cancellationReason: reason,
        closedAt: now,
        workflow: { ...before.workflow, steps },
      };
      await tx.serviceRequest.update({
        where: { id: row.id },
        data: { status: 'cancelled', data: JSON.stringify(after) },
      });
      return { kind: 'ok' as const, before, after, internalId: row.id };
    });
  },

  // M6.11 (B2.2) — reassign the *active* workflow step. Only the active step
  // is reassignable; any other step (pending, completed, skipped, rejected)
  // surfaces as `not-active` (409).
  async reassignStep(
    tenantId: string,
    publicId: string,
    stepId: string,
    assignee: { id: string; name?: string },
    _actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: ServiceRequest; after: ServiceRequest; internalId: string }
    | { kind: 'not-found-request' }
    | { kind: 'not-found-step' }
    | { kind: 'not-active' }
  > {
    return prisma.$transaction(async (tx) => {
      const row = await tx.serviceRequest.findFirst({ where: { tenantId, publicId } });
      if (!row) return { kind: 'not-found-request' as const };
      const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
      const stepIdx = (before.workflow?.steps ?? []).findIndex(s => s.id === stepId);
      if (stepIdx === -1) return { kind: 'not-found-step' as const };
      const step = before.workflow.steps[stepIdx];
      if (step.status !== 'active') return { kind: 'not-active' as const };

      const steps = [...before.workflow.steps];
      steps[stepIdx] = { ...step, assigneeId: assignee.id, assigneeName: assignee.name ?? step.assigneeName };
      const after: ServiceRequest = { ...before, workflow: { ...before.workflow, steps } };
      await tx.serviceRequest.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after) },
      });
      return { kind: 'ok' as const, before, after, internalId: row.id };
    });
  },

  // M6.11 (B2.2) — add a watcher. Idempotent: if the userId is already on
  // the list, returns `wasNew=false` without writing.
  async addWatcher(
    tenantId: string,
    publicId: string,
    watcher: { userId: string; userName?: string },
    _actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: ServiceRequest; after: ServiceRequest; internalId: string; wasNew: boolean }
    | { kind: 'not-found' }
  > {
    return prisma.$transaction(async (tx) => {
      const row = await tx.serviceRequest.findFirst({ where: { tenantId, publicId } });
      if (!row) return { kind: 'not-found' as const };
      const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
      const existing = before.watchers ?? [];
      const wasNew = !existing.some(w => w.userId === watcher.userId);
      if (!wasNew) {
        return { kind: 'ok' as const, before, after: before, internalId: row.id, wasNew };
      }
      const after: ServiceRequest = {
        ...before,
        watchers: [...existing, { userId: watcher.userId, userName: watcher.userName }],
      };
      await tx.serviceRequest.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after) },
      });
      return { kind: 'ok' as const, before, after, internalId: row.id, wasNew };
    });
  },

  // M6.11 (B2.2) — remove a watcher. Idempotent: if the user isn't on the
  // list, returns `wasPresent=false` without writing. Route maps to 204
  // either way.
  async removeWatcher(
    tenantId: string,
    publicId: string,
    userId: string,
    _actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: ServiceRequest; after: ServiceRequest; internalId: string; wasPresent: boolean }
    | { kind: 'not-found' }
  > {
    return prisma.$transaction(async (tx) => {
      const row = await tx.serviceRequest.findFirst({ where: { tenantId, publicId } });
      if (!row) return { kind: 'not-found' as const };
      const before = parse<ServiceRequest>(row.data, {} as ServiceRequest);
      const existing = before.watchers ?? [];
      const wasPresent = existing.some(w => w.userId === userId);
      if (!wasPresent) {
        return { kind: 'ok' as const, before, after: before, internalId: row.id, wasPresent };
      }
      const after: ServiceRequest = {
        ...before,
        watchers: existing.filter(w => w.userId !== userId),
      };
      await tx.serviceRequest.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after) },
      });
      return { kind: 'ok' as const, before, after, internalId: row.id, wasPresent };
    });
  },
};

export const catalogRepo = {
  list: (tenantId: string) => listDocs<CatalogItem>(prisma.catalogItem, tenantId),
};

export const integrationsRepo = {
  list: (tenantId: string) => listDocs<Integration>(prisma.integration, tenantId),
  get: (tenantId: string, id: string) => getDocById<Integration>(prisma.integration, tenantId, id),
};

// Terminal status — `setStatus` refuses transitions away from it.
const TERMINAL_KB_STATES = new Set(['archived']);

export const kbRepo = {
  list: (tenantId: string) => listDocs<KBArticle>(prisma.kBArticle, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<KBArticle>(prisma.kBArticle, tenantId, publicId),

  // M6.11 (B1.5) — Create a new KB article in `draft` status. Allocates a
  // sequential `KB-NNNNN` publicId via count + 1 (best-effort; collisions
  // surface as P2002). Returns `{ after, internalId }` (no `before` for
  // create) so the route can emit an audit log without re-reading.
  async create(
    tenantId: string,
    author: { id: string; name: string },
    input: {
      title: string;
      summary: string;
      body: string;
      categoryId: string;
      contentType: KBArticle['contentType'];
      visibility: KBArticle['visibility'];
      tags: string[];
      relatedCIPublicIds: string[];
      linkedProblemIds: string[];
      linkedIncidentIds: string[];
    },
  ): Promise<{ after: KBArticle; internalId: string }> {
    const now = new Date();
    const id = `kba-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const count = await prisma.kBArticle.count({ where: { tenantId } });
    const publicId = `KB-${String(count + 1).padStart(5, '0')}`;
    const slug = (input.title || publicId)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || publicId.toLowerCase();

    const article: KBArticle = {
      id,
      slug,
      publicId,
      title: input.title,
      summary: input.summary,
      body: input.body,
      status: 'draft',
      visibility: input.visibility,
      contentType: input.contentType,
      categoryId: input.categoryId,
      categoryName: '',
      tags: input.tags,
      authorId: author.id,
      authorName: author.name,
      contributorIds: [],
      relatedCIIds: [],
      relatedCIPublicIds: input.relatedCIPublicIds,
      linkedIncidentIds: input.linkedIncidentIds,
      linkedProblemIds: input.linkedProblemIds,
      relatedArticleSlugs: [],
      viewCount: 0,
      helpfulCount: 0,
      unhelpfulCount: 0,
      averageReadTimeSeconds: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    };

    await prisma.$transaction([
      prisma.kBArticle.create({
        data: {
          id,
          publicId,
          tenantId,
          status: 'draft',
          data: JSON.stringify(article),
        },
      }),
    ]);
    return { after: article, internalId: id };
  },

  // Partial update of editable fields. Status is NOT mutable here — callers
  // use `setStatus`. Returns `{ before, after, internalId }` for the audit log.
  async update(
    tenantId: string,
    publicId: string,
    patch: Partial<Pick<KBArticle,
      'title' | 'summary' | 'body' | 'categoryId' | 'contentType' | 'visibility'
      | 'tags' | 'relatedCIPublicIds' | 'linkedProblemIds' | 'linkedIncidentIds'
    >>,
  ): Promise<{ before: KBArticle; after: KBArticle; internalId: string } | null> {
    const row = await prisma.kBArticle.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = parse<KBArticle>(row.data, {} as KBArticle);
    const after: KBArticle = {
      ...before,
      ...patch,
      updatedAt: new Date().toISOString(),
      version: (before.version ?? 1) + 1,
    };
    await prisma.$transaction([
      prisma.kBArticle.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after) },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // Dedicated status transition. Refuses no-op (same-status) and refuses to
  // leave a terminal state (`archived`). Stamps publishedAt/By on `published`.
  // Sentinel return shape lets the route map to 400/404 without re-querying.
  async setStatus(
    tenantId: string,
    publicId: string,
    nextStatus: KBArticle['status'],
    actor: { id: string; name: string },
  ): Promise<
    | { kind: 'ok'; before: KBArticle; after: KBArticle; internalId: string }
    | { kind: 'not-found' }
    | { kind: 'same-status' }
    | { kind: 'terminal'; from: KBArticle['status'] }
  > {
    const row = await prisma.kBArticle.findFirst({ where: { tenantId, publicId } });
    if (!row) return { kind: 'not-found' };
    const before = parse<KBArticle>(row.data, {} as KBArticle);
    if (before.status === nextStatus) return { kind: 'same-status' };
    if (TERMINAL_KB_STATES.has(before.status)) return { kind: 'terminal', from: before.status };

    const now = new Date().toISOString();
    const after: KBArticle = {
      ...before,
      status: nextStatus,
      updatedAt: now,
      ...(nextStatus === 'published'
        ? { publishedAt: now, publishedBy: actor.id, publishedByName: actor.name }
        : {}),
    };
    await prisma.$transaction([
      prisma.kBArticle.update({
        where: { id: row.id },
        data: { status: nextStatus, data: JSON.stringify(after) },
      }),
    ]);
    return { kind: 'ok', before, after, internalId: row.id };
  },
};
