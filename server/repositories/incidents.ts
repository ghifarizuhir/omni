import type { Incident, IncidentComment, IncidentTimelineEvent } from '../../src/types';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';

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

export const incidentsRepo = {
  async list(tenantId: string, filters: { active?: boolean; major?: boolean; ciId?: string; problemPublicId?: string }) {
    const rows = await prisma.incident.findMany({
      where: {
        tenantId,
        ...(filters.active ? { status: { notIn: ['resolved', 'closed'] } } : {}),
        ...(filters.major ? { isMajor: true } : {}),
        ...(filters.problemPublicId ? { linkedProblemPublicId: filters.problemPublicId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    const incidents = rows.map(r => parseObj<Incident>(r.data, {} as Incident));
    if (filters.ciId) {
      return incidents.filter(i => i.affectedCIIds.includes(filters.ciId!) || i.affectedCIPublicIds.includes(filters.ciId!));
    }
    return incidents;
  },
  async get(tenantId: string, publicId: string) {
    const row = await prisma.incident.findFirst({ where: { tenantId, publicId } });
    return row ? parseObj<Incident>(row.data, {} as Incident) : null;
  },
  async comments(tenantId: string, incidentId: string) {
    const rows = await prisma.incidentComment.findMany({
      where: { tenantId, incidentId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(r => parseObj<IncidentComment>(r.data, {} as IncidentComment));
  },
  async timeline(tenantId: string, incidentId: string) {
    const rows = await prisma.incidentTimelineEvent.findMany({
      where: { tenantId, incidentId },
      orderBy: { timestamp: 'asc' },
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
};
