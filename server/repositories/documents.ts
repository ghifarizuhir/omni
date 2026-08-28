// Generic Document repository — backs the catalog/snapshot domains that don't
// have dedicated tables. Order is preserved via `position` so the UI sees the
// same ordering it had with mock arrays.

import { prisma } from '../db';

const parse = <T>(s: string): T => JSON.parse(s) as T;

export const listByKind = async <T>(
  tenantId: string,
  kind: string,
  pagination: { limit: number; offset: number } = { limit: 50, offset: 0 },
): Promise<T[]> => {
  const rows = await prisma.document.findMany({
    where: { tenantId, kind },
    orderBy: { position: 'asc' },
    take: pagination.limit,
    skip: pagination.offset,
  });
  return rows.map(r => parse<T>(r.data));
};

export const findByKey = async <T>(tenantId: string, kind: string, key: string): Promise<T | null> => {
  const row = await prisma.document.findUnique({
    where: { tenantId_kind_key: { tenantId, kind, key } },
  });
  return row ? parse<T>(row.data) : null;
};

export const findByPublicId = async <T>(tenantId: string, kind: string, publicId: string): Promise<T | null> => {
  const row = await prisma.document.findFirst({ where: { tenantId, kind, publicId } });
  return row ? parse<T>(row.data) : null;
};

// First item by position — useful for "current" singletons (e.g. quietHours).
export const firstByKind = async <T>(tenantId: string, kind: string): Promise<T | null> => {
  const row = await prisma.document.findFirst({
    where: { tenantId, kind },
    orderBy: { position: 'asc' },
  });
  return row ? parse<T>(row.data) : null;
};

export const upsertDocument = async (
  tenantId: string, kind: string, key: string, data: unknown,
): Promise<void> => {
  await prisma.document.upsert({
    where: { tenantId_kind_key: { tenantId, kind, key } },
    create: { tenantId, kind, key, data: JSON.stringify(data) },
    update: { data: JSON.stringify(data) },
  });
};

export const deleteDocument = async (tenantId: string, kind: string, key: string): Promise<void> => {
  await prisma.document.deleteMany({ where: { tenantId, kind, key } });
};
