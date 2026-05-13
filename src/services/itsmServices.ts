// ITSM workflow domains: problems, changes, releases, deployments, requests,
// improvements. Thin async wrappers over the existing mocks.

import { mockProblems } from '../mocks/problems';
import { mockChanges } from '../mocks/changes';
import { mockReleases } from '../mocks/releases';
import { mockDeployments, getActiveDeployments } from '../mocks/deployments';
import { mockDeploymentLogs } from '../mocks/deploymentLogs';
import { mockEnvironments } from '../mocks/environments';
import { mockServiceRequests } from '../mocks/serviceRequests';
import { mockCatalogItems } from '../mocks/catalogItems';
import { mockImprovements, getImprovementById, getTotalEstimatedBenefitUSD, getTotalActualBenefitUSD } from '../mocks/improvements';
import { mockBenefitMeasurements } from '../mocks/benefitMeasurements';
import { getROICalculation, mockROICalculations } from '../mocks/roiCalculations';
import type {
  Problem, Change, Release, Deployment, DeploymentLogEntry, EnvironmentInfo,
  ServiceRequest, CatalogItem, ImprovementInitiative,
} from '../types';
import { apiFetch, isLive, mockRequired, mockResult } from './core';

export const problemsService = {
  list(): Promise<Problem[]> {
    if (isLive()) return apiFetch<Problem[]>('/problems');
    return mockResult(mockProblems);
  },
  get(publicId: string): Promise<Problem> {
    if (isLive()) return apiFetch<Problem>(`/problems/${publicId}`);
    return mockRequired(mockProblems.find(p => p.publicId === publicId), 'Problem');
  },
};

export const changesService = {
  list(): Promise<Change[]> {
    if (isLive()) return apiFetch<Change[]>('/changes');
    return mockResult(mockChanges);
  },
  get(publicId: string): Promise<Change> {
    if (isLive()) return apiFetch<Change>(`/changes/${publicId}`);
    return mockRequired(mockChanges.find(c => c.publicId === publicId), 'Change');
  },
};

export const releasesService = {
  list(): Promise<Release[]> {
    if (isLive()) return apiFetch<Release[]>('/releases');
    return mockResult(mockReleases);
  },
  get(publicId: string): Promise<Release> {
    if (isLive()) return apiFetch<Release>(`/releases/${publicId}`);
    return mockRequired(mockReleases.find(r => r.publicId === publicId), 'Release');
  },
};

export const deploymentsService = {
  list(): Promise<Deployment[]> {
    if (isLive()) return apiFetch<Deployment[]>('/deployments');
    return mockResult(mockDeployments);
  },
  active(): Promise<Deployment[]> {
    if (isLive()) return apiFetch<Deployment[]>('/deployments', { query: { active: true } });
    return mockResult(getActiveDeployments());
  },
  get(publicId: string): Promise<Deployment> {
    if (isLive()) return apiFetch<Deployment>(`/deployments/${publicId}`);
    return mockRequired(mockDeployments.find(d => d.publicId === publicId), 'Deployment');
  },
  logs(deploymentId: string): Promise<DeploymentLogEntry[]> {
    if (isLive()) return apiFetch<DeploymentLogEntry[]>(`/deployments/${deploymentId}/logs`);
    return mockResult(mockDeploymentLogs.filter(l => l.deploymentId === deploymentId));
  },
  environments(): Promise<EnvironmentInfo[]> {
    if (isLive()) return apiFetch<EnvironmentInfo[]>('/environments');
    return mockResult(mockEnvironments);
  },
};

export const requestsService = {
  list(): Promise<ServiceRequest[]> {
    if (isLive()) return apiFetch<ServiceRequest[]>('/requests');
    return mockResult(mockServiceRequests);
  },
  get(publicId: string): Promise<ServiceRequest> {
    if (isLive()) return apiFetch<ServiceRequest>(`/requests/${publicId}`);
    return mockRequired(mockServiceRequests.find(r => r.publicId === publicId), 'ServiceRequest');
  },
  catalog(): Promise<CatalogItem[]> {
    if (isLive()) return apiFetch<CatalogItem[]>('/catalog');
    return mockResult(mockCatalogItems);
  },
};

export const improvementsService = {
  list(): Promise<ImprovementInitiative[]> {
    if (isLive()) return apiFetch<ImprovementInitiative[]>('/improvements');
    return mockResult(mockImprovements);
  },
  get(publicId: string): Promise<ImprovementInitiative> {
    if (isLive()) return apiFetch<ImprovementInitiative>(`/improvements/${publicId}`);
    return mockRequired(mockImprovements.find(i => i.publicId === publicId), 'Improvement');
  },
  getByAnyId(id: string): Promise<ImprovementInitiative | undefined> {
    if (isLive()) return apiFetch<ImprovementInitiative | undefined>(`/improvements/${id}`);
    return mockResult(getImprovementById(id));
  },
  totalEstimatedBenefitUSD(): Promise<number> {
    if (isLive()) return apiFetch<number>('/improvements/totals/estimated');
    return mockResult(getTotalEstimatedBenefitUSD());
  },
  totalActualBenefitUSD(): Promise<number> {
    if (isLive()) return apiFetch<number>('/improvements/totals/actual');
    return mockResult(getTotalActualBenefitUSD());
  },
  benefitMeasurements(): Promise<typeof mockBenefitMeasurements> {
    if (isLive()) return apiFetch('/improvements/benefit-measurements');
    return mockResult(mockBenefitMeasurements);
  },
  roiCalculations(): Promise<typeof mockROICalculations> {
    if (isLive()) return apiFetch('/improvements/roi');
    return mockResult(mockROICalculations);
  },
  roiCalculation(initiativeId: string): Promise<ReturnType<typeof getROICalculation>> {
    if (isLive()) return apiFetch(`/improvements/${initiativeId}/roi`);
    return mockResult(getROICalculation(initiativeId));
  },
};
