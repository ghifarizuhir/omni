import type { Incident, IncidentComment, IncidentTimelineEvent } from '../../src/types';
import { prisma } from '../db';

const parseObj = <T,>(s: string, fb: T): T => { try { return JSON.parse(s); } catch { return fb; } };

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
};
