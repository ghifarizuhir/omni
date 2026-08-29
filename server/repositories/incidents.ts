import type { Incident, IncidentComment, IncidentTimelineEvent } from '../../src/types';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../util';

const parseObj = <T,>(s: string, fb: T): T => { try { return JSON.parse(s); } catch { return fb; } };

export interface ResolveInput {
  summary: string;
  rootCause?: string;
  workaround?: string;
  resolvedBy: string;
}

export interface AddCommentInput {
  body: string;
  isInternal: boolean;
  mentions?: string[];
  authorId: string;
  authorName: string;
}

export interface SetStatusInput {
  status: string;
  actorId: string;
}

export interface PromoteMajorRepoInput {
  actorId: string;
  incidentCommander?: { id: string; name: string };
  summary?: string;
}

export interface AssignRepoInput {
  actorId: string;
  assigneeId: string | null;
  assigneeName?: string;
}

export interface SetLinksRepoInput {
  actorId: string;
  affectedCIIds?: string[];
  linkedProblemId?: string | null;
  linkedChangeIds?: string[];
}

export interface WatcherRepoInput {
  actorId: string;
  userId: string;
  userName?: string;
}

export interface UpdateRepoInput {
  actorId: string;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  tags?: string[];
}

export interface StandDownRepoInput {
  actorId: string;
  actorName: string;
  reason: string;
  newPriority?: 'P2' | 'P3' | 'P4';
}

export interface PostCommsRepoInput {
  actorId: string;
  actorName: string;
  audience: 'internal' | 'all_staff' | 'customer';
  message: string;
  channels: string[];
}

const diffArr = (a: string[] = [], b: string[] = []) => ({
  added: b.filter(x => !a.includes(x)),
  removed: a.filter(x => !b.includes(x)),
});

export const incidentsRepo = {
  async list(
    tenantId: string,
    filters: { active?: boolean; major?: boolean; ciId?: string; problemPublicId?: string },
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const where: Record<string, unknown> = {
      tenantId,
      ...(filters.active ? { status: { notIn: ['resolved', 'closed'] } } : {}),
      ...(filters.major ? { isMajor: true } : {}),
      ...(filters.problemPublicId ? { linkedProblemPublicId: filters.problemPublicId } : {}),
      ...(filters.ciId ? { affectedCIIds: { contains: filters.ciId } } : {}),
    };
    const rows = await prisma.incident.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    const incidents = rows.map(r => parseObj<Incident>(r.data, {} as Incident));
    // Secondary exact filter for JSON-string contains false positives (small page only)
    if (filters.ciId) {
      return incidents.filter(i => i.affectedCIIds.includes(filters.ciId!) || i.affectedCIPublicIds.includes(filters.ciId!));
    }
    return incidents;
  },
  async get(tenantId: string, publicId: string) {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    return row ? parseObj<Incident>(row.data, {} as Incident) : null;
  },
  async comments(
    tenantId: string,
    incidentId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const rows = await prisma.incidentComment.findMany({
      where: { tenantId, incidentId },
      orderBy: { createdAt: 'asc' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return rows.map(r => parseObj<IncidentComment>(r.data, {} as IncidentComment));
  },
  async timeline(
    tenantId: string,
    incidentId: string,
    pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ) {
    const rows = await prisma.incidentTimelineEvent.findMany({
      where: { tenantId, incidentId },
      orderBy: { timestamp: 'asc' },
      take: pagination.limit,
      skip: pagination.offset,
    });
    return rows.map(r => parseObj<IncidentTimelineEvent>(r.data, {} as IncidentTimelineEvent));
  },

  // Transitions the incident to `resolved`, stamps the resolution block, and
  // appends a `resolved` timeline event. Returns `{ before, after, internalId }`
  // so the route handler can emit an audit log without re-reading the row.
  // Throws if no incident matches (route handler maps to 404).
  async resolve(tenantId: string, publicId: string, input: ResolveInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = {
      ...before,
      status: 'resolved',
      resolution: {
        summary: input.summary,
        rootCause: input.rootCause,
        workaround: input.workaround,
        resolvedAt: now.toISOString(),
        resolvedBy: input.resolvedBy,
      },
    };
    const timelineId = randomUUID();
    const timelineEvent: Pick<IncidentTimelineEvent, 'id' | 'kind' | 'timestamp'> & {
      actorId: string;
      details: { summary: string };
    } = {
      id: timelineId,
      kind: 'resolved',
      timestamp: now.toISOString(),
      actorId: input.resolvedBy,
      details: { summary: input.summary },
    };

    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { status: 'resolved', data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'resolved',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);

    return { before, after, internalId: row.id };
  },

  // Appends a comment + a `comment_added` timeline event. Returns the
  // persisted comment so the route can echo it. Throws if the parent incident
  // (by internal id) isn't in this tenant.
  async addComment(tenantId: string, incidentId: string, input: AddCommentInput): Promise<IncidentComment> {
    const parent = await prisma.incident.findFirst({ where: { tenantId, id: incidentId } });
    if (!parent) throw new Error(`Incident ${incidentId} not found`);
    const now = new Date();
    const id = randomUUID();
    const comment: IncidentComment = {
      id,
      incidentId,
      authorId: input.authorId,
      authorName: input.authorName,
      body: input.body,
      isInternal: input.isInternal,
      mentions: input.mentions ?? [],
      createdAt: now.toISOString(),
    };
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'comment_added' as const,
      timestamp: now.toISOString(),
      actorId: input.authorId,
      details: { commentId: id, isInternal: input.isInternal },
    };
    await prisma.$transaction([
      prisma.incidentComment.create({
        data: { id, tenantId, incidentId, data: JSON.stringify(comment), createdAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId,
          kind: 'comment_added',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return comment;
  },

  // Transitions Incident.status (not `resolved` — that path goes through
  // `resolve()` so a resolution block is required). Appends a `status_changed`
  // timeline event. Returns `{ before, after, internalId }` for the route's
  // audit log.
  async setStatus(tenantId: string, publicId: string, input: SetStatusInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = { ...before, status: input.status as Incident['status'] };
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'status_changed' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: { from: before.status, to: input.status },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { status: input.status, data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'status_changed',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // M6.11 B1.4 — flip the incident to major, optionally setting the
  // commander. Appends a `promoted_major` timeline event.
  async promoteMajor(tenantId: string, publicId: string, input: PromoteMajorRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = {
      ...before,
      isMajor: true,
      incidentCommander: input.incidentCommander?.id ?? before.incidentCommander,
      majorDeclaredAt: now.toISOString(),
      majorDeclaredBy: input.actorId,
    };
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'promoted_major' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: {
        commanderId: input.incidentCommander?.id,
        commanderName: input.incidentCommander?.name,
        summary: input.summary,
      },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { isMajor: true, data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'promoted_major',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // Updates assignee snapshot + appends `assigned` timeline event.
  async assign(tenantId: string, publicId: string, input: AssignRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = {
      ...before,
      assigneeId: input.assigneeId ?? undefined,
      assigneeName: input.assigneeId ? input.assigneeName ?? before.assigneeName : undefined,
    };
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'assigned' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: {
        fromAssigneeId: before.assigneeId,
        toAssigneeId: input.assigneeId,
        assigneeName: input.assigneeName,
      },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'assigned',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // Patch any subset of {affectedCIIds, linkedProblemId, linkedChangeIds}.
  // Appends a single `linked` timeline event whose details capture added/
  // removed IDs per field.
  async setLinks(tenantId: string, publicId: string, input: SetLinksRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = {
      ...before,
      ...(input.affectedCIIds !== undefined ? { affectedCIIds: input.affectedCIIds } : {}),
      ...(input.linkedProblemId !== undefined
        ? { linkedProblemId: input.linkedProblemId ?? undefined }
        : {}),
      ...(input.linkedChangeIds !== undefined ? { linkedChangeIds: input.linkedChangeIds } : {}),
    };
    const dataPatch: Record<string, unknown> = {};
    if (input.affectedCIIds !== undefined) {
      dataPatch.ci = diffArr(before.affectedCIIds, after.affectedCIIds);
    }
    if (input.linkedProblemId !== undefined) {
      dataPatch.problem = { from: before.linkedProblemId, to: after.linkedProblemId };
    }
    if (input.linkedChangeIds !== undefined) {
      dataPatch.change = diffArr(before.linkedChangeIds ?? [], after.linkedChangeIds ?? []);
    }
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'linked' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: dataPatch,
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: {
          data: JSON.stringify(after),
          updatedAt: now,
          ...(input.linkedProblemId !== undefined
            ? { linkedProblemPublicId: input.linkedProblemId ?? null }
            : {}),
          ...(input.affectedCIIds !== undefined
            ? { affectedCIIds: JSON.stringify(input.affectedCIIds) }
            : {}),
        },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'linked',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // Add a watcher (idempotent — returns same `after` + `wasNew=false` if
  // already present). The route handler decides 200 vs 201 from `wasNew`.
  async addWatcher(tenantId: string, incidentId: string, input: WatcherRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
    watcher: { userId: string; userName?: string };
    wasNew: boolean;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, id: incidentId } });
    if (!row) throw new Error(`Incident ${incidentId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const existing = before.watchers ?? [];
    const wasNew = !existing.some(w => w.userId === input.userId);
    const after: Incident = {
      ...before,
      watchers: wasNew
        ? [...existing, { userId: input.userId, userName: input.userName }]
        : existing,
    };
    if (!wasNew) {
      return { before, after, internalId: row.id, watcher: { userId: input.userId, userName: input.userName }, wasNew };
    }
    const now = new Date();
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'watcher_added' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: { userId: input.userId, userName: input.userName },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'watcher_added',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id, watcher: { userId: input.userId, userName: input.userName }, wasNew };
  },

  // Remove a watcher. Throws if the parent incident is missing; the route
  // maps that to 404. Throws `HttpError(404, 'Watcher not found')` if the
  // user isn't on the list, which the global error handler returns as 404.
  async removeWatcher(tenantId: string, incidentId: string, userId: string, actorId: string): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, id: incidentId } });
    if (!row) throw new Error(`Incident ${incidentId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const existing = before.watchers ?? [];
    if (!existing.some(w => w.userId === userId)) {
      throw new HttpError(404, 'Watcher not found');
    }
    const after: Incident = {
      ...before,
      watchers: existing.filter(w => w.userId !== userId),
    };
    const now = new Date();
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'watcher_removed' as const,
      timestamp: now.toISOString(),
      actorId,
      details: { userId },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { data: JSON.stringify(after), updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'watcher_removed',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  // M6.11 B4.1 — generic patch for incident fields that don't have a
  // dedicated specialized endpoint (priority, tags). Mirrors the
  // `assign`/`setLinks` shape: throws on missing, single transaction,
  // optional timeline event. Only `priority` writes a timeline row
  // (`priority_changed`) and only when the value actually differs — tag
  // edits are deliberately silent to avoid churn.
  async update(tenantId: string, publicId: string, input: UpdateRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error('INCIDENT_NOT_FOUND');
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const after: Incident = {
      ...before,
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    };
    const priorityChanged = input.priority !== undefined && before.priority !== input.priority;
    const timelineId = priorityChanged ? randomUUID() : undefined;
    const timelineEvent = priorityChanged
      ? {
          id: timelineId!,
          kind: 'priority_changed' as const,
          timestamp: now.toISOString(),
          actorId: input.actorId,
          details: { from: before.priority, to: input.priority },
        }
      : undefined;

    const updateOps: import('@prisma/client').Prisma.PrismaPromise<unknown>[] = [
      prisma.incident.update({
        where: { id: row.id },
        data: {
          data: JSON.stringify(after),
          updatedAt: now,
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      }),
    ];
    if (priorityChanged) {
      updateOps.push(
        prisma.incidentTimelineEvent.create({
          data: {
            id: timelineId!,
            tenantId,
            incidentId: row.id,
            kind: 'priority_changed',
            timestamp: now,
            data: JSON.stringify(timelineEvent),
          },
        }),
      );
    }
    await prisma.$transaction(updateOps);
    return { before, after, internalId: row.id };
  },

  // M6.11 B5.1 — flip a major incident back to non-major. Mirrors
  // `promoteMajor` but in reverse: clears `isMajor`, sets the new priority
  // (defaulting to P2 when omitted), and writes a `major_stood_down` timeline
  // event whose `details.reason` carries the legally required business
  // justification.
  async standDown(tenantId: string, publicId: string, input: StandDownRepoInput): Promise<{
    before: Incident;
    after: Incident;
    internalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const before = parseObj<Incident>(row.data, {} as Incident);
    const now = new Date();
    const toPriority = input.newPriority ?? 'P2';
    const after: Incident = {
      ...before,
      isMajor: false,
      priority: toPriority,
    };
    const timelineId = randomUUID();
    const timelineEvent = {
      id: timelineId,
      kind: 'major_stood_down' as const,
      timestamp: now.toISOString(),
      actorId: input.actorId,
      details: {
        fromPriority: before.priority,
        toPriority,
        reason: input.reason,
        actorId: input.actorId,
        actorName: input.actorName,
      },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: {
          isMajor: false,
          priority: toPriority,
          data: JSON.stringify(after),
          updatedAt: now,
        },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'major_stood_down',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { before, after, internalId: row.id };
  },

  async create(
    tenantId: string,
    input: { title: string; priority?: string; description?: string; applicationId?: string | null; assigneeId?: string | null; affectedCIIds?: string[]; tags?: string[] },
    actor: { id: string; name: string },
  ) {
    // Ensure FK target exists for isolated test tenants (plan's tenant-test- randomUUID)
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` },
    }).catch(() => undefined);
    const count = await prisma.incident.count();
    const seq = String(count + 1).padStart(5, '0');
    const year = new Date().getFullYear();
    const publicId = `INC-${year}-${seq}`;
    const id = randomUUID();
    const now = new Date();
    const incident: Incident = {
      id,
      publicId,
      title: input.title,
      description: input.description ?? '',
      status: 'new',
      priority: (input.priority ?? 'P3') as Incident['priority'],
      severity: (input.priority ?? 'P3') as Incident['severity'],
      isMajor: false,
      assigneeId: input.assigneeId ?? undefined,
      affectedCIIds: input.affectedCIIds ?? [],
      affectedCIPublicIds: [],
      affectedServiceIds: [],
      reporterId: actor.id,
      reporterChannel: 'user_report',
      slaResponseTarget: 60,
      slaResolveTarget: 240,
      slaResponseStatus: 'healthy',
      slaResolveStatus: 'healthy',
      reopenCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      tags: input.tags ?? [],
    } as unknown as Incident;
    // keep extras on snapshot for audit parity (not part of Incident type but useful)
    (incident as unknown as Record<string, unknown>).tenantId = tenantId;
    (incident as unknown as Record<string, unknown>).applicationId = input.applicationId ?? null;
    const prismaApplicationId = input.applicationId ?? 'unassigned';
    await prisma.incident.create({
      data: {
        id,
        publicId,
        tenantId,
        status: 'new',
        priority: incident.priority,
        severity: incident.severity,
        isMajor: false,
        affectedCIIds: JSON.stringify(incident.affectedCIIds),
        affectedCIPublicIds: JSON.stringify(incident.affectedCIPublicIds),
        applicationId: prismaApplicationId,
        data: JSON.stringify(incident),
        createdAt: now,
        updatedAt: now,
      },
    });
    const eventId = randomUUID();
    const evt = { id: eventId, kind: 'created' as const, timestamp: now.toISOString(), actorId: actor.id, details: { title: input.title } };
    await prisma.incidentTimelineEvent.create({
      data: { id: eventId, tenantId, incidentId: id, kind: 'created', timestamp: now, data: JSON.stringify(evt) },
    });
    return incident as unknown as Incident & { applicationId: string | null; tenantId: string };
  },

  // M6.11 B5.1 — append a `comms_posted` timeline event. Does not change the
  // incident snapshot; the route still bumps `updatedAt` so list views resort.
  async postComms(tenantId: string, publicId: string, input: PostCommsRepoInput): Promise<{
    event: IncidentTimelineEvent;
    incidentInternalId: string;
  }> {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    if (!row) throw new Error(`Incident ${publicId} not found`);
    const now = new Date();
    const timelineId = randomUUID();
    const timelineEvent: IncidentTimelineEvent = {
      id: timelineId,
      incidentId: row.id,
      kind: 'comms_posted',
      timestamp: now.toISOString(),
      actorId: input.actorId,
      actorName: input.actorName,
      details: {
        commsAudience: input.audience,
        commsBody: input.message,
        channels: input.channels,
        actorId: input.actorId,
        actorName: input.actorName,
      },
    };
    await prisma.$transaction([
      prisma.incident.update({
        where: { id: row.id },
        data: { updatedAt: now },
      }),
      prisma.incidentTimelineEvent.create({
        data: {
          id: timelineId,
          tenantId,
          incidentId: row.id,
          kind: 'comms_posted',
          timestamp: now,
          data: JSON.stringify(timelineEvent),
        },
      }),
    ]);
    return { event: timelineEvent, incidentInternalId: row.id };
  },
};
