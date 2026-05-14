import type {
  Problem, Change, Release, Deployment, DeploymentLogEntry, EnvironmentInfo,
  ServiceRequest, CatalogItem, ImprovementInitiative,
} from '../types';
import type { mockBenefitMeasurements } from '../mocks/benefitMeasurements';
import type { mockROICalculations, getROICalculation } from '../mocks/roiCalculations';
import { apiFetch } from './core';

export const problemsService = {
  list: () => apiFetch<Problem[]>('/problems'),
  get: (publicId: string) => apiFetch<Problem>(`/problems/${publicId}`),
};

export const changesService = {
  list: () => apiFetch<Change[]>('/changes'),
  get: (publicId: string) => apiFetch<Change>(`/changes/${publicId}`),
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
};

export const improvementsService = {
  list: () => apiFetch<ImprovementInitiative[]>('/improvements'),
  get: (publicId: string) => apiFetch<ImprovementInitiative>(`/improvements/${publicId}`),
  getByAnyId: (id: string) => apiFetch<ImprovementInitiative | null>(`/improvements/${id}`),
  totalEstimatedBenefitUSD: () => apiFetch<number>('/improvements/totals/estimated'),
  totalActualBenefitUSD: () => apiFetch<number>('/improvements/totals/actual'),
  benefitMeasurements: () => apiFetch<typeof mockBenefitMeasurements>('/improvements/benefit-measurements'),
  roiCalculations: () => apiFetch<typeof mockROICalculations>('/improvements/roi'),
  roiCalculation: (initiativeId: string) =>
    apiFetch<ReturnType<typeof getROICalculation>>(`/improvements/${initiativeId}/roi`),
};
