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

export const listDocs = async <T,>(delegate: Delegate, tenantId: string, where: Record<string, unknown> = {}): Promise<T[]> => {
  const rows: Array<{ data: string }> = await delegate.findMany({ where: { tenantId, ...where } });
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
  Problem, Change, Release, Deployment, DeploymentLogEntry, ServiceRequest,
  CatalogItem, Integration, KBArticle,
} from '../../src/types';
import type { MockService } from '../../src/mocks/services';

export const servicesRepo = {
  list: (tenantId: string) => listDocs<MockService>(prisma.service, tenantId),
  get: (tenantId: string, id: string) => getDocById<MockService>(prisma.service, tenantId, id),
};

export const problemsRepo = {
  list: (tenantId: string) => listDocs<Problem>(prisma.problem, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Problem>(prisma.problem, tenantId, publicId),
};

export const changesRepo = {
  list: (tenantId: string) => listDocs<Change>(prisma.change, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Change>(prisma.change, tenantId, publicId),
};

export const releasesRepo = {
  list: (tenantId: string) => listDocs<Release>(prisma.release, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Release>(prisma.release, tenantId, publicId),
};

export const deploymentsRepo = {
  list: (tenantId: string) => listDocs<Deployment>(prisma.deployment, tenantId),
  active: async (tenantId: string) =>
    (await listDocs<Deployment>(prisma.deployment, tenantId))
      .filter(d => d.status === 'running' || d.status === 'pending'),
  get: (tenantId: string, publicId: string) => getDocByPublicId<Deployment>(prisma.deployment, tenantId, publicId),
  logs: (tenantId: string, deploymentId: string) =>
    listDocs<DeploymentLogEntry>(prisma.deploymentLog, tenantId, { deploymentId }),
};

export const requestsRepo = {
  list: (tenantId: string) => listDocs<ServiceRequest>(prisma.serviceRequest, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<ServiceRequest>(prisma.serviceRequest, tenantId, publicId),
};

export const catalogRepo = {
  list: (tenantId: string) => listDocs<CatalogItem>(prisma.catalogItem, tenantId),
};

export const integrationsRepo = {
  list: (tenantId: string) => listDocs<Integration>(prisma.integration, tenantId),
  get: (tenantId: string, id: string) => getDocById<Integration>(prisma.integration, tenantId, id),
};

export const kbRepo = {
  list: (tenantId: string) => listDocs<KBArticle>(prisma.kBArticle, tenantId),
  get: (tenantId: string, publicId: string) => getDocByPublicId<KBArticle>(prisma.kBArticle, tenantId, publicId),
};
