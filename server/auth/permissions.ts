// Permission resolution backed by the Role / Permission / RolePermission tables
// (M2 RBAC migration). Permissions are dotted strings like "cmdb.write".
//
// Role → permission membership is cached per role-id in-process with a short
// TTL; admin mutations must call invalidatePermissionCache() to bust it.

import { prisma } from '../db';

export type Permission = string;

const TTL_MS = 60_000;
const cache = new Map<string, { perms: Set<Permission>; expires: number }>();

let catalogCache: { perms: string[]; expires: number } | null = null;

// Permissions for a single role, cached.
async function permissionsForRoleId(roleId: string): Promise<Set<Permission>> {
  const now = Date.now();
  const hit = cache.get(roleId);
  if (hit && hit.expires > now) return hit.perms;

  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionKey: true },
  });
  const perms = new Set<Permission>(rows.map(r => r.permissionKey));
  cache.set(roleId, { perms, expires: now + TTL_MS });
  return perms;
}

export async function permissionsForRoleIds(roleIds: string[]): Promise<Set<Permission>> {
  const out = new Set<Permission>();
  for (const id of roleIds) {
    for (const p of await permissionsForRoleId(id)) out.add(p);
  }
  return out;
}

// Catalog accessor for admin endpoints. Cached so the catalog page is cheap.
export async function permissionCatalog(): Promise<string[]> {
  const now = Date.now();
  if (catalogCache && catalogCache.expires > now) return catalogCache.perms;
  const rows = await prisma.permission.findMany({ select: { key: true }, orderBy: { key: 'asc' } });
  const perms = rows.map(r => r.key);
  catalogCache = { perms, expires: now + TTL_MS };
  return perms;
}

// Lookup the canonical admin role for the AUTH_REQUIRED=false dev bypass.
// Falls back to an empty set if the seed hasn't run.
export async function permissionsForSystemRole(name: string): Promise<Set<Permission>> {
  const role = await prisma.role.findFirst({
    where: { name, isSystem: true, tenantId: null },
    select: { id: true },
  });
  if (!role) return new Set();
  return permissionsForRoleId(role.id);
}

// Called by admin mutations. Pass a roleId to bust just that role; pass nothing
// to flush everything (e.g. after a permission catalog reload).
export function invalidatePermissionCache(roleId?: string): void {
  if (roleId) cache.delete(roleId);
  else cache.clear();
  catalogCache = null;
}
