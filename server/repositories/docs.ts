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

export const listDocs = async <T,>(
  delegate: Delegate,
  tenantId: string,
  where: Record<string, unknown> = {},
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
): Promise<T[]> => {
  const rows: Array<{ data: string }> = await delegate.findMany({
    where: { tenantId, ...where },
    take: pagination.limit,
    skip: pagination.offset,
  });
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
  Problem, Change, ChangeApproval, Release, Deployment, DeploymentLogEntry, ServiceRequest,
  RequestComment, CatalogItem, Integration, KBArticle, Service,
} from '../../src/types';
import type { CreateProblemInput, PromoteKnownErrorInput } from '../../src/shared/schemas/problem';
import type { CreateRequestInput } from '../../src/shared/schemas/request';
import type { CastVoteInput } from '../../src/shared/schemas/change';
import { ensureUnassignedApp } from '../../prisma/preflightScopeNotNull';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../util';

const normalizeChange = (raw: Change): Change => {
  const fallbackAt = (raw as unknown as { createdAt?: string; plannedStart?: string }).createdAt
    ?? (raw as unknown as { plannedStart?: string }).plannedStart
    ?? new Date().toISOString();
  return {
    ...raw,
    riskFactors: raw.riskFactors ?? [],
    affectedCIIds: raw.affectedCIIds ?? [],
    affectedCIPublicIds: raw.affectedCIPublicIds ?? [],
    affectedServiceIds: raw.affectedServiceIds ?? [],
    linkedProblemIds: raw.linkedProblemIds ?? [],
    linkedIncidentIds: raw.linkedIncidentIds ?? [],
    linkedKBSlugs: raw.linkedKBSlugs ?? [],
    approvals: raw.approvals ?? [],
    conflicts: (raw.conflicts ?? []).map((c: Change['conflicts'][number]) => ({
      ...c,
      conflictsWith: (c as unknown as { conflictsWith?: string[] }).conflictsWith ?? [],
      detectedAt: (c as unknown as { detectedAt?: string }).detectedAt ?? fallbackAt,
    })),
    tags: raw.tags ?? [],
    commsChannels: raw.commsChannels ?? [],
    rescheduleHistory: raw.rescheduleHistory ?? [],
    testPlan: (raw as unknown as { testPlan?: string }).testPlan ?? '',
    implementationWindow:
      (raw as unknown as { implementationWindow?: string }).implementationWindow
      ?? `${(raw as unknown as { plannedStart?: string }).plannedStart ?? ''} → ${(raw as unknown as { plannedEnd?: string }).plannedEnd ?? ''}`,
    createdAt: (raw as unknown as { createdAt?: string }).createdAt ?? fallbackAt,
    updatedAt: (raw as unknown as { updatedAt?: string }).updatedAt ?? (raw as unknown as { createdAt?: string }).createdAt ?? fallbackAt,
  } as unknown as Change;
};

export const servicesRepo = {
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<Service>(prisma.service, tenantId, {}, pagination),
  get: (tenantId: string, id: string) => getDocById<Service>(prisma.service, tenantId, id),
};

const normalizeProblem = (raw: Problem): Problem => {
  const fallbackAt = (raw as unknown as { createdAt?: string }).createdAt ?? new Date().toISOString();
  return {
    ...raw,
    tags: (raw as unknown as { tags?: string[] }).tags ?? [],
    affectedCIIds: (raw as unknown as { affectedCIIds?: string[] }).affectedCIIds ?? [],
    affectedCIPublicIds: (raw as unknown as { affectedCIPublicIds?: string[] }).affectedCIPublicIds ?? [],
    affectedServiceIds: (raw as unknown as { affectedServiceIds?: string[] }).affectedServiceIds ?? [],
    relatedIncidentIds: (raw as unknown as { relatedIncidentIds?: string[] }).relatedIncidentIds ?? [],
    relatedIncidentCount: (raw as unknown as { relatedIncidentCount?: number }).relatedIncidentCount ?? 0,
    linkedChangeIds: (raw as unknown as { linkedChangeIds?: string[] }).linkedChangeIds ?? [],
    linkedKBArticleIds: (raw as unknown as { linkedKBArticleIds?: string[] }).linkedKBArticleIds ?? [],
    createdAt: (raw as unknown as { createdAt?: string }).createdAt ?? fallbackAt,
    updatedAt: (raw as unknown as { updatedAt?: string }).updatedAt ?? (raw as unknown as { createdAt?: string }).createdAt ?? fallbackAt,
    description: (raw as unknown as { description?: string }).description ?? '',
    ownerTeamId: (raw as unknown as { ownerTeamId?: string }).ownerTeamId ?? 'team-current',
  } as unknown as Problem;
};

export const problemsRepo = {
  list: async (
    tenantId: string,
    where: Record<string, unknown> = {},
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<Problem[]> => {
    // Backwards compat: list(tenantId, pagination) where first arg is {limit,offset}
    if (
      where &&
      (typeof (where as any).limit === 'number' || typeof (where as any).offset === 'number') &&
      !('status' in where) &&
      !('search' in where) &&
      pagination.limit === 50 &&
      pagination.offset === 0
    ) {
      pagination = where as unknown as { limit: number; offset: number };
      where = {};
    }
    const dbWhere: Record<string, unknown> = { tenantId };
    if (where.status) dbWhere.status = where.status;
    // If no search, we can paginate at DB level for efficiency
    if (!where.search) {
      const rows: Array<{ data: string }> = await prisma.problem.findMany({
        where: dbWhere as any,
        take: pagination.limit,
        skip: pagination.offset,
        orderBy: { createdAt: 'desc' },
      });
      const items = rows.map((r) => normalizeProblem(parse<Problem>(r.data, {} as Problem)));
      return items;
    }
    // With search, fetch all matching status then filter + paginate in JS
    const rows: Array<{ data: string }> = await prisma.problem.findMany({
      where: dbWhere as any,
      orderBy: { createdAt: 'desc' },
    });
    let items = rows.map((r) => normalizeProblem(parse<Problem>(r.data, {} as Problem)));
    const q = String(where.search).toLowerCase();
    items = items.filter((p) => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    return items.slice(pagination.offset, pagination.offset + pagination.limit);
  },
  get: (tenantId: string, publicId: string) => getDocByPublicId<Problem>(prisma.problem, tenantId, publicId),

  async create(
    tenantId: string,
    input: CreateProblemInput,
    actor: { id: string; name: string },
  ): Promise<Problem> {
    // Ensure FK target exists for isolated test tenants
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` },
    }).catch(() => undefined);
    const count = await prisma.problem.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(5, '0');
    const year = new Date().getFullYear();
    const publicId = `PRB-${year}-${seq}`;
    const id = `prb-${Date.now()}-${seq}`;
    const now = new Date();
    const applicationId = input.applicationId ?? await ensureUnassignedApp(tenantId);
    const problem: Problem = {
      id,
      publicId,
      title: input.title,
      description: input.description ?? '',
      status: 'identified',
      severity: input.severity as Problem['severity'],
      source: input.source as Problem['source'],
      ownerId: input.ownerId ?? actor.id,
      ownerTeamId: 'team-current',
      affectedCIIds: input.affectedCIIds ?? [],
      affectedCIPublicIds: [],
      affectedServiceIds: input.affectedServiceIds ?? [],
      relatedIncidentIds: [],
      relatedIncidentCount: 0,
      linkedChangeIds: [],
      linkedKBArticleIds: [],
      tags: input.tags ?? [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    } as unknown as Problem & { applicationId: string; tenantId: string };
    // stash tenant/application for audit parity without polluting Problem type
    (problem as unknown as Record<string, unknown>).applicationId = applicationId;
    (problem as unknown as Record<string, unknown>).tenantId = tenantId;
    await prisma.problem.create({
      data: {
        id,
        publicId,
        tenantId,
        status: 'identified',
        data: JSON.stringify(problem),
        applicationId,
        createdAt: now,
      },
    });
    return problem as Problem;
  },

  async setStatus(tenantId: string, publicId: string, status: string): Promise<{ before: Problem; after: Problem }> {
    const row = await prisma.problem.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error('Problem not found');
    const before = JSON.parse(row.data) as Problem;
    const after = {
      ...before,
      status: status as Problem['status'],
      updatedAt: new Date().toISOString(),
      ...(status === 'closed' ? { closedAt: new Date().toISOString() } : {}),
    } as Problem;
    await prisma.problem.update({ where: { id: row.id }, data: { status, data: JSON.stringify(after) } });
    return { before, after };
  },

  async promoteKnownError(
    tenantId: string,
    publicId: string,
    input: PromoteKnownErrorInput,
    actor: { id: string; name: string },
  ): Promise<{ before: Problem; after: Problem }> {
    const row = await prisma.problem.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error('Problem not found');
    const before = JSON.parse(row.data) as Problem;
    const after = {
      ...before,
      status: 'known_error' as const,
      knownError: {
        publishedAt: new Date().toISOString(),
        publishedBy: actor.id,
        publishedByName: actor.name,
        rootCause: input.rootCause,
        workaround: input.workaround,
        workaroundEffectiveness: input.workaroundEffectiveness,
        affectedVersions: input.affectedVersions,
        permanentFixPlan: input.permanentFixPlan,
      },
      updatedAt: new Date().toISOString(),
    } as unknown as Problem;
    await prisma.problem.update({ where: { id: row.id }, data: { status: 'known_error', data: JSON.stringify(after) } });
    return { before, after };
  },

  async timeline(
    tenantId: string,
    publicId: string,
    pagination?: { limit: number; offset: number },
  ): Promise<Array<{ id: string; kind: string; timestamp: string; actorId: string | null; details: unknown }> | null> {
    const prob = await prisma.problem.findFirst({ where: { tenantId, publicId } });
    if (!prob) return null;
    const rows = await prisma.auditLog.findMany({
      where: { tenantId, resourceKind: 'Problem', resourceId: prob.id },
      orderBy: { createdAt: 'asc' },
      take: pagination?.limit ?? 50,
      skip: pagination?.offset ?? 0,
    });
    return rows.map((r) => {
      let details: unknown = null;
      if (r.after) {
        try {
          details = JSON.parse(r.after);
        } catch {
          details = r.after;
        }
      }
      return { id: r.id, kind: r.action, timestamp: r.createdAt.toISOString(), actorId: r.actorId, details };
    });
  },
};

// Closed states for a Change — `cancel` refuses to transition from these.
const CLOSED_CHANGE_STATES = new Set(['closed_successful', 'closed_failed', 'rejected', 'cancelled']);

export const changesRepo = {
  list: async (tenantId: string, pagination?: { limit: number; offset: number }): Promise<Change[]> => {
    const changes = await listDocs<Change>(prisma.change, tenantId, {}, pagination);
    return changes.map(normalizeChange);
  },
  get: async (tenantId: string, publicId: string): Promise<Change | null> => {
    const change = await getDocByPublicId<Change>(prisma.change, tenantId, publicId);
    return change ? normalizeChange(change) : null;
  },

  // Allocates a publicId, persists the row, and returns the full Change so the
  // route can echo it back. Drafts only — workflow transitions (submit, CAB,
  // schedule, implement) go through dedicated endpoints later in M6.11.
  async create(
    tenantId: string,
    requester: { id: string; name: string },
    input: Pick<Change,
      'title' | 'description' | 'justification' | 'type' | 'risk' | 'impact'
      | 'plannedStart' | 'plannedEnd' | 'implementationPlan' | 'rollbackPlan' | 'affectedCIIds'
    > & { applicationId: string },
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
      testPlan: '',
      linkedProblemIds: [],
      linkedIncidentIds: [],
      linkedKBSlugs: [],
      approvals: [],
      conflicts: [],
      tags: [],
      commsRequired: false,
      commsChannels: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
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
        applicationId: input.applicationId,
      },
    });
    return change;
  },

  // Idempotency: refuses to cancel a change that's already in a closed state
  // (returns null → route maps to 409).
  async cancel(tenantId: string, publicId: string, reason: string): Promise<{ before: Change; after: Change } | null | 'closed'> {
    const row = await prisma.change.findFirst({ where: { tenantId, publicId } });
    if (!row) return null;
    const before = normalizeChange(parse<Change>(row.data, {} as Change));
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
      const before = normalizeChange(parse<Change>(row.data, {} as Change));
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
    const before = normalizeChange(parse<Change>(row.data, {} as Change));
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

  async castVote(
    tenantId: string,
    publicId: string,
    input: CastVoteInput & { voterId: string; voterName: string },
  ): Promise<{ before: Change; after: Change }> {
    const row = await prisma.change.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error('Change not found');
    const before = normalizeChange(parse<Change>(row.data, {} as Change));
    if (!['in_review', 'submitted'].includes(before.status)) throw new Error('Not votable');
    const currentApprovals = before.approvals ?? [];
    const existingIdx = currentApprovals.findIndex((a) => a.approverId === input.voterId);
    const now = new Date().toISOString();
    const approval: ChangeApproval = {
      id: randomUUID(),
      changeId: row.id,
      approverId: input.voterId,
      approverName: input.voterName ?? input.voterId,
      approverRole: 'Change Manager',
      decision: input.decision as ChangeApproval['decision'],
      conditions: input.conditions,
      rationale: input.rationale,
      decidedAt: now,
      weight: 1,
    };
    const approvals =
      existingIdx >= 0
        ? currentApprovals.map((a, i) => (i === existingIdx ? approval : a))
        : [...currentApprovals, approval];
    const hasReject = approvals.some((a) => a.decision === 'reject');
    const allDecided = approvals.length > 0 && approvals.every((a) => a.decision !== 'pending');
    let newStatus = before.status;
    if (hasReject) newStatus = 'rejected';
    else if (allDecided && approvals.every((a) => a.decision === 'approve' || a.decision === 'approve_with_conditions')) newStatus = 'approved';
    const after: Change = { ...before, approvals, conflicts: before.conflicts ?? [], status: newStatus as Change['status'], updatedAt: now, cabReviewedAt: now } as unknown as Change;
    await prisma.change.update({
      where: { id: row.id },
      data: { status: newStatus, data: JSON.stringify(after) },
    });
    return { before, after };
  },
};

export const releasesRepo = {
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<Release>(prisma.release, tenantId, {}, pagination),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Release>(prisma.release, tenantId, publicId),
};

export const deploymentsRepo = {
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<Deployment>(prisma.deployment, tenantId, {}, pagination),
  active: async (tenantId: string, pagination?: { limit: number; offset: number }) =>
    (await listDocs<Deployment>(prisma.deployment, tenantId, {}, pagination))
      .filter(d => d.status === 'running' || d.status === 'pending'),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Deployment>(prisma.deployment, tenantId, publicId),
  logs: (tenantId: string, deploymentId: string, pagination?: { limit: number; offset: number }) =>
    listDocs<DeploymentLogEntry>(prisma.deploymentLog, tenantId, { deploymentId }, pagination),
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
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<ServiceRequest>(prisma.serviceRequest, tenantId, {}, pagination),
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

  /** Like addComment but also persists a RequestComment row for structured querying. */
  async appendComment(
    tenantId: string,
    publicId: string,
    actor: { id: string; name: string },
    body: string,
  ): Promise<{ comment: RequestComment; internalId: string; dbCommentId: string } | null> {
    const result = await requestsRepo.addComment(tenantId, publicId, actor, body);
    if (!result) return null;
    const dbComment = await prisma.requestComment.create({
      data: {
        tenantId,
        requestId: result.internalId,
        authorId: actor.id,
        body,
      },
    });
    return { ...result, dbCommentId: dbComment.id };
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

  async create(
    tenantId: string,
    actor: { id: string; name: string },
    input: CreateRequestInput,
  ): Promise<ServiceRequest> {
    // Ensure FK target exists for isolated test tenants
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` },
    }).catch(() => undefined);

    const catalogRow = await prisma.catalogItem.findFirst({ where: { tenantId, id: input.catalogItemId } });
    if (!catalogRow) throw new HttpError(404, 'Catalog item not found');
    const catalogItem = parse<CatalogItem>(catalogRow.data, {} as CatalogItem);
    const count = await prisma.serviceRequest.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(5, '0');
    const year = new Date().getFullYear();
    const publicId = `REQ-${year}-${seq}`;
    const id = randomUUID();
    const now = new Date();

    // Resolve applicationId
    let applicationId: string | null = (input.applicationId as string | null | undefined) ?? null;
    if (!applicationId) {
      // Try to map via ownerTeamId → ApplicationTeam
      if (catalogItem.ownerTeamId) {
        const teamApp = await prisma.applicationTeam.findFirst({
          where: { teamId: catalogItem.ownerTeamId },
          select: { applicationId: true },
        });
        if (teamApp?.applicationId) applicationId = teamApp.applicationId;
      }
      if (!applicationId) applicationId = await ensureUnassignedApp(tenantId);
    }

    const workflowTemplate = catalogItem.workflowTemplate ?? [];
    const totalSlaHours = workflowTemplate.reduce((sum, s) => sum + (s.slaHours ?? 0), 0);
    const workflowSteps = workflowTemplate.map((tpl, idx) => ({
      id: tpl.id,
      templateId: tpl.id,
      name: tpl.name,
      type: tpl.type,
      description: tpl.description,
      status: idx === 0 ? ('active' as const) : ('pending' as const),
      startedAt: idx === 0 ? now.toISOString() : undefined,
      slaHours: tpl.slaHours,
      slaStatus: 'healthy' as const,
      assigneeId: tpl.assigneeId,
      assigneeName: undefined,
    }));

    const workflow = {
      id: `wfi-${id}`,
      currentStepIndex: 0,
      steps: workflowSteps,
    };

    const title = input.title ?? catalogItem.name ?? `Request for ${catalogItem.publicId}`;
    const formData = (input.formData ?? {}) as Record<string, unknown>;
    const tags = (input.tags ?? []) as string[];

    const requestData: ServiceRequest = {
      id,
      publicId,
      catalogItemId: catalogItem.id,
      catalogItemPublicId: catalogItem.publicId,
      catalogItemName: catalogItem.name,
      catalogCategory: catalogItem.category,
      title,
      status: 'submitted',
      priority: 'normal',
      requesterId: actor.id,
      requesterName: actor.name,
      formData: formData as unknown as ServiceRequest['formData'],
      workflow: workflow as unknown as ServiceRequest['workflow'],
      approvals: [],
      totalSlaHours,
      slaBreached: false,
      estimatedCompletion: new Date(now.getTime() + totalSlaHours * 3600 * 1000).toISOString(),
      submittedAt: now.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      linkedKBSlugs: (catalogItem.linkedKBSlugs ?? []) as string[],
      commentCount: 0,
      tags,
      comments: [],
      watchers: [],
    } as unknown as ServiceRequest;

    // stash application/tenant for audit parity
    (requestData as unknown as Record<string, unknown>).applicationId = applicationId;
    (requestData as unknown as Record<string, unknown>).tenantId = tenantId;

    await prisma.serviceRequest.create({
      data: {
        id,
        publicId,
        tenantId,
        status: 'submitted',
        data: JSON.stringify(requestData),
        applicationId: applicationId!,
      },
    });
    return requestData;
  },

  async listComments(
    tenantId: string,
    publicId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const sr = await getDocByPublicId<ServiceRequest>(prisma.serviceRequest, tenantId, publicId);
    if (!sr) return [];
    const row = await prisma.serviceRequest.findFirst({ where: { tenantId, publicId }, select: { id: true } });
    if (!row) return [];
    return prisma.requestComment.findMany({
      where: { tenantId, requestId: row.id },
      orderBy: { createdAt: 'asc' },
      take: pagination.limit,
      skip: pagination.offset,
    });
  },
};

export const catalogRepo = {
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<CatalogItem>(prisma.catalogItem, tenantId, {}, pagination),
};

export const integrationsRepo = {
  list: (tenantId: string, pagination?: { limit: number; offset: number }) => listDocs<Integration>(prisma.integration, tenantId, {}, pagination),
  get: (tenantId: string, id: string) => getDocById<Integration>(prisma.integration, tenantId, id),
};

// Terminal status — `setStatus` refuses transitions away from it.
const TERMINAL_KB_STATES = new Set(['archived']);

export const kbRepo = {
  list: async (
    tenantId: string,
    where: { q?: string } | { limit: number; offset: number } = {},
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<KBArticle[]> => {
    // Backwards compat: list(tenantId, pagination) where second arg is pagination object
    let actualWhere: { q?: string } = {};
    let actualPagination = pagination;
    if (where && (typeof (where as any).limit === 'number' || typeof (where as any).offset === 'number')) {
      actualPagination = where as unknown as { limit: number; offset: number };
      actualWhere = {};
    } else {
      actualWhere = where as { q?: string };
    }
    // If no q filter, paginate at DB level
    if (!actualWhere.q) {
      return listDocs<KBArticle>(prisma.kBArticle, tenantId, {}, actualPagination);
    }
    // With q, fetch filtered subset then apply pagination in JS (data is JSON blob)
    const ql = actualWhere.q.toLowerCase();
    const rows: Array<{ data: string }> = await prisma.kBArticle.findMany({
      where: { tenantId },
    });
    let items = rows.map((r) => parse<KBArticle>(r.data, {} as KBArticle));
    items = items.filter((a) => {
      const hay = `${a.title ?? ''} ${a.summary ?? ''} ${(a.tags ?? []).join(' ')}`.toLowerCase();
      // also check body for completeness
      const bodyHay = (a.body ?? '').toLowerCase();
      return hay.includes(ql) || bodyHay.includes(ql);
    });
    return items.slice(actualPagination.offset, actualPagination.offset + actualPagination.limit);
  },
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
