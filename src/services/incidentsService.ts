import type { Incident, IncidentComment, IncidentTimelineEvent } from '../types';
import { apiFetch } from './core';

export const incidentsService = {
  list: () => apiFetch<Incident[]>('/incidents'),
  get: (publicId: string) => apiFetch<Incident>(`/incidents/${publicId}`),
  comments: (incidentId: string) => apiFetch<IncidentComment[]>(`/incidents/${incidentId}/comments`),
  timeline: (incidentId: string) => apiFetch<IncidentTimelineEvent[]>(`/incidents/${incidentId}/timeline`),
  active: () => apiFetch<Incident[]>('/incidents', { query: { active: true } }),
  major: () => apiFetch<Incident[]>('/incidents', { query: { major: true } }),
  byCI: (ciId: string) => apiFetch<Incident[]>('/incidents', { query: { ciId } }),
  byProblem: (problemPublicId: string) => apiFetch<Incident[]>('/incidents', { query: { problemPublicId } }),
};
