import type {
  Problem, Change, Release, Deployment, DeploymentLogEntry, EnvironmentInfo,
  ServiceRequest, RequestComment, CatalogItem, ImprovementInitiative,
} from '../types';
import { apiFetch } from './core';
import type { BenefitMeasurement, ROICalculation } from '../types/improvement';
import type { RescheduleChangeInput } from '../shared/schemas/change';
import type {
  CancelRequestInput, ReassignRequestStepInput, AddRequestWatcherInput,
} from '../shared/schemas/request';
import type { CreateProblemInput } from '../shared/schemas/problem';

export const problemsService = {
  list: () => apiFetch<Problem[]>('/problems'),
  get: (publicId: string) => apiFetch<Problem>(`/problems/${publicId}`),
  create: (input: CreateProblemInput) => apiFetch<Problem>('/problems', { method: 'POST', body: input }),
};

export interface CreateChangeInput {
  title: string;
  description?: string;
  justification?: string;
  type?: 'standard' | 'normal' | 'emergency';
  risk?: 'low' | 'medium' | 'high' | 'critical';
  impact?: 'minimal' | 'minor' | 'moderate' | 'major' | 'extensive';
  plannedStart: string;
  plannedEnd: string;
  implementationPlan?: string;
  rollbackPlan?: string;
  affectedCIIds?: string[];
  applicationId?: string;
}

export const changesService = {
  list: () => apiFetch<Change[]>('/changes'),
  get: (publicId: string) => apiFetch<Change>(`/changes/${publicId}`),

  // M6.11 — create a change in draft status. Returns the persisted Change.
  create: (input: CreateChangeInput) =>
    apiFetch<Change>('/changes', { method: 'POST', body: input }),

  // M6.11 — cancel an active change. 409 if already closed.
  cancel: (publicId: string, reason: string) =>
    apiFetch<Change>(`/changes/${publicId}/cancel`, { method: 'PATCH', body: { reason } }),

  // M6.11 — save the technical assessment block. Server stamps reviewerId/Name.
  setTechnicalAssessment: (publicId: string, assessment: Record<string, unknown>) =>
    apiFetch<Change>(`/changes/${publicId}/tech-assessment`, { method: 'PATCH', body: assessment }),

  // M6.11 (B2.1) — reschedule planned window with a reason; appends to
  // rescheduleHistory. 409 if the change is already closed.
  reschedule: (publicId: string, input: RescheduleChangeInput) =>
    apiFetch<Change>(`/changes/${publicId}/reschedule`, { method: 'PATCH', body: input }),
};

export const releasesService = {
  list: () => apiFetch<Release[]>('/releases'),
  get: (publicId: string) => apiFetch<Release>(`/releases/${publicId}`),
};

export const deploymentsService = {
  list: () => apiFetch<Deployment[]>('/deployments'),
  active: () => apiFetch<Deployment[]>('/deployments', { query: { active: true } }),
  get: (publicId: string) => apiFetch<Deployment>(`/deployments/${publicId}`),
  logs: (deploymentId: string) => apiFetch<DeploymentLogEntry[]>(`/deployments/${deploymentId}/logs`),
  environments: () => apiFetch<EnvironmentInfo[]>('/environments'),
};

export const requestsService = {
  list: () => apiFetch<ServiceRequest[]>('/requests'),
  get: (publicId: string) => apiFetch<ServiceRequest>(`/requests/${publicId}`),
  catalog: () => apiFetch<CatalogItem[]>('/catalog'),

  // M6.11 — workflow approve/reject + comments. Server enforces that the step
  // is the active approval step (409 otherwise) and returns the full updated
  // ServiceRequest so the UI can re-render off the response.
  approveStep: (publicId: string, stepId: string, note?: string) =>
    apiFetch<ServiceRequest>(`/requests/${publicId}/steps/${stepId}/approve`, {
      method: 'POST', body: { note },
    }),

  rejectStep: (publicId: string, stepId: string, note: string) =>
    apiFetch<ServiceRequest>(`/requests/${publicId}/steps/${stepId}/reject`, {
      method: 'POST', body: { note },
    }),

  comments: (publicId: string) =>
    apiFetch<Array<{ id: string; authorId: string; body: string; createdAt: string }>>(`/requests/${publicId}/comments`),

  addComment: (publicId: string, body: string) =>
    apiFetch<RequestComment>(`/requests/${publicId}/comments`, {
      method: 'POST', body: { body },
    }),

  // M6.11 (B2.2) — cancel a service request. 409 if already in a terminal state.
  cancel: (publicId: string, input: CancelRequestInput) =>
    apiFetch<ServiceRequest>(`/requests/${publicId}/cancel`, {
      method: 'PATCH', body: input,
    }),

  // M6.11 (B2.2) — reassign the active workflow step. 409 if the step is not
  // active. `stepId` lives in the path; the body carries assigneeId/Name.
  reassignStep: (publicId: string, stepId: string, input: Omit<ReassignRequestStepInput, 'stepId'>) =>
    apiFetch<ServiceRequest>(`/requests/${publicId}/steps/${stepId}/reassign`, {
      method: 'PATCH', body: input,
    }),

  // M6.11 (B2.2) — add a watcher. Idempotent: server returns `{ watchers, wasNew }`.
  addWatcher: (publicId: string, input: AddRequestWatcherInput) =>
    apiFetch<{ watchers: Array<{ userId: string; userName?: string }>; wasNew: boolean }>(
      `/requests/${publicId}/watchers`,
      { method: 'POST', body: input },
    ),

  // M6.11 (B2.2) — remove a watcher. Always 204.
  removeWatcher: (publicId: string, userId: string) =>
    apiFetch<null>(`/requests/${publicId}/watchers/${userId}`, { method: 'DELETE' }),
};

export const improvementsService = {
  list: () => apiFetch<ImprovementInitiative[]>('/improvements'),
  get: (publicId: string) => apiFetch<ImprovementInitiative>(`/improvements/${publicId}`),
  getByAnyId: (id: string) => apiFetch<ImprovementInitiative | null>(`/improvements/${id}`),
  totalEstimatedBenefitUSD: () => apiFetch<number>('/improvements/totals/estimated'),
  totalActualBenefitUSD: () => apiFetch<number>('/improvements/totals/actual'),
  benefitMeasurements: () => apiFetch<BenefitMeasurement[]>('/improvements/benefit-measurements'),
  createBenefitMeasurement: (input: Partial<BenefitMeasurement>) =>
    apiFetch<BenefitMeasurement>('/improvements/benefit-measurements', { method: 'POST', body: input }),
  roiCalculations: () => apiFetch<ROICalculation[]>('/improvements/roi'),
  roiCalculation: (initiativeId: string) =>
    apiFetch<ROICalculation | undefined>(`/improvements/${initiativeId}/roi`),
};
