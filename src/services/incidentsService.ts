import type { Incident, IncidentComment, IncidentStatus, IncidentTimelineEvent } from '../types';
import { apiFetch } from './core';

// M6.7 — request shapes come from the shared Zod module so client and server
// can't drift. Re-exported here for callers that don't want to know about the
// shared/schemas/ path.
export type {
  ResolveIncidentInput,
  AddIncidentCommentInput as AddCommentInput,
  SetIncidentStatusInput,
  PromoteMajorInput,
  AssignIncidentInput,
  UpdateIncidentLinksInput,
  AddWatcherInput,
} from '../shared/schemas/incident';
export {
  resolveIncidentSchema,
  addIncidentCommentSchema,
  setIncidentStatusSchema,
  promoteMajorSchema,
  assignIncidentSchema,
  updateIncidentLinksSchema,
  addWatcherSchema,
} from '../shared/schemas/incident';

import type {
  ResolveIncidentInput,
  AddIncidentCommentInput,
  PromoteMajorInput,
  AssignIncidentInput,
  UpdateIncidentLinksInput,
  AddWatcherInput,
} from '../shared/schemas/incident';

export const incidentsService = {
  list: () => apiFetch<Incident[]>('/incidents'),
  get: (publicId: string) => apiFetch<Incident>(`/incidents/${publicId}`),
  comments: (incidentId: string) => apiFetch<IncidentComment[]>(`/incidents/${incidentId}/comments`),
  timeline: (incidentId: string) => apiFetch<IncidentTimelineEvent[]>(`/incidents/${incidentId}/timeline`),
  active: () => apiFetch<Incident[]>('/incidents', { query: { active: true } }),
  major: () => apiFetch<Incident[]>('/incidents', { query: { major: true } }),
  byCI: (ciId: string) => apiFetch<Incident[]>('/incidents', { query: { ciId } }),
  byProblem: (problemPublicId: string) => apiFetch<Incident[]>('/incidents', { query: { problemPublicId } }),

  // M6.11 — POST resolution + (optionally) root-cause / workaround. The server
  // updates the incident snapshot, appends a 'resolved' timeline event, and
  // writes an audit log. Returns the updated Incident.
  resolve: (publicId: string, input: ResolveIncidentInput) =>
    apiFetch<Incident>(`/incidents/${publicId}/resolve`, { method: 'POST', body: input }),

  // Status transitions other than `resolved` (use `resolve()` for that — it
  // requires a resolution block).
  setStatus: (publicId: string, status: Exclude<IncidentStatus, 'resolved'>) =>
    apiFetch<Incident>(`/incidents/${publicId}/status`, { method: 'PATCH', body: { status } }),

  addComment: (incidentId: string, input: AddIncidentCommentInput) =>
    apiFetch<IncidentComment>(`/incidents/${incidentId}/comments`, { method: 'POST', body: input }),

  // M6.11 B1.4 — promote-major / assign / links / watchers. Each mirrors the
  // POST/PATCH route under /incidents.
  promoteMajor: (publicId: string, input: PromoteMajorInput) =>
    apiFetch<Incident>(`/incidents/${publicId}/promote-major`, { method: 'POST', body: input }),

  assign: (publicId: string, input: AssignIncidentInput) =>
    apiFetch<Incident>(`/incidents/${publicId}/assign`, { method: 'PATCH', body: input }),

  setLinks: (publicId: string, input: UpdateIncidentLinksInput) =>
    apiFetch<Incident>(`/incidents/${publicId}/links`, { method: 'PATCH', body: input }),

  addWatcher: (incidentId: string, input: AddWatcherInput) =>
    apiFetch<{ watchers: Array<{ userId: string; userName?: string }>; added: boolean }>(
      `/incidents/${incidentId}/watchers`,
      { method: 'POST', body: input },
    ),

  removeWatcher: (incidentId: string, userId: string) =>
    apiFetch<void>(`/incidents/${incidentId}/watchers/${userId}`, { method: 'DELETE' }),
};
