import { mockIncidents } from '../mocks/incidents';
import { mockIncidentComments } from '../mocks/incidentComments';
import { mockIncidentTimelines } from '../mocks/incidentTimelines';
import type { Incident, IncidentComment, IncidentTimelineEvent } from '../types';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

export const incidentsService = {
  list(): Promise<Incident[]> {
    if (isLive()) return apiFetch<Incident[]>('/incidents');
    return mockResult(mockIncidents);
  },
  get(publicId: string): Promise<Incident> {
    if (isLive()) return apiFetch<Incident>(`/incidents/${publicId}`);
    return mockRequired(mockIncidents.find(i => i.publicId === publicId), 'Incident');
  },
  comments(incidentId: string): Promise<IncidentComment[]> {
    if (isLive()) return apiFetch<IncidentComment[]>(`/incidents/${incidentId}/comments`);
    return mockResult(mockIncidentComments.filter(c => c.incidentId === incidentId));
  },
  timeline(incidentId: string): Promise<IncidentTimelineEvent[]> {
    if (isLive()) return apiFetch<IncidentTimelineEvent[]>(`/incidents/${incidentId}/timeline`);
    return mockResult(mockIncidentTimelines.filter(t => t.incidentId === incidentId));
  },
  active(): Promise<Incident[]> {
    if (isLive()) return apiFetch<Incident[]>('/incidents', { query: { active: true } });
    return mockResult(mockIncidents.filter(i => !['resolved', 'closed'].includes(i.status)));
  },
  major(): Promise<Incident[]> {
    if (isLive()) return apiFetch<Incident[]>('/incidents', { query: { major: true } });
    return mockResult(mockIncidents.filter(i => i.isMajor));
  },
  byCI(ciId: string): Promise<Incident[]> {
    if (isLive()) return apiFetch<Incident[]>('/incidents', { query: { ciId } });
    return mockResult(
      mockIncidents.filter(
        i => i.affectedCIIds.includes(ciId) || i.affectedCIPublicIds.includes(ciId),
      ),
    );
  },
  byProblem(problemPublicId: string): Promise<Incident[]> {
    if (isLive()) return apiFetch<Incident[]>('/incidents', { query: { problemPublicId } });
    return mockResult(mockIncidents.filter(i => i.linkedProblemPublicId === problemPublicId));
  },
};
