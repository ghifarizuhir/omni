import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requirePermission } from '../middleware/auth';
import { audit } from '../audit';
import { invalidatePermissionCache, permissionCatalog } from '../auth/permissions';
import { asyncHandler, HttpError, qString } from '../util';

export const adminRouter = Router();

// Scoped to /admin/* — adminRouter is mounted at the api root alongside other
// routers, so an unscoped `.use(requirePermission(...))` would gate every
// request that reaches this router (including ones destined for cmdb, events,
// etc., since Express middleware on a router runs for all paths that arrive
// at it). Path-prefix the guard so it only fires on actual admin routes.
adminRouter.use('/admin', requirePermission('system.admin'));

adminRouter.get('/admin/tenants', asyncHandler(async (_req, res) => {
  res.json(await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } }));
}));

adminRouter.get('/admin/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true, avatarUrl: true, createdAt: true,
      memberships: {
        where: { tenantId: req.tenantId },
        select: {
          id: true,
          roles: { select: { role: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Flatten membership/role into a shape the admin UI can render directly.
  res.json(users.map(u => {
    const m = u.memberships[0];
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      membershipId: m?.id ?? null,
      roles: m ? m.roles.map(mr => mr.role) : [],
    };
  }));
}));

adminRouter.get('/admin/audit', asyncHandler(async (req, res) => {
  const resourceKind = qString(req.query.resourceKind);
  const resourceId = qString(req.query.resourceId);
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: req.tenantId,
      ...(resourceKind ? { resourceKind } : {}),
      ...(resourceId ? { resourceId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json(logs);
}));

// ── RBAC: permission catalog ──────────────────────────────────────────────────

adminRouter.get('/admin/permissions', asyncHandler(async (_req, res) => {
  const perms = await prisma.permission.findMany({ orderBy: { key: 'asc' } });
  res.json(perms);
}));

// ── RBAC: roles ───────────────────────────────────────────────────────────────

const roleSelect = {
  id: true, tenantId: true, name: true, description: true, isSystem: true,
  createdAt: true, updatedAt: true,
  permissions: { select: { permissionKey: true } },
  _count: { select: { memberships: true } },
} as const;

const serializeRole = (r: {
  id: string; tenantId: string | null; name: string; description: string | null;
  isSystem: boolean; createdAt: Date; updatedAt: Date;
  permissions: { permissionKey: string }[];
  _count: { memberships: number };
}) => ({
  id: r.id,
  tenantId: r.tenantId,
  name: r.name,
  description: r.description,
  isSystem: r.isSystem,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  permissions: r.permissions.map(p => p.permissionKey).sort(),
  membershipCount: r._count.memberships,
});

adminRouter.get('/admin/roles', asyncHandler(async (req, res) => {
  // System roles (tenantId=null) are visible everywhere; tenant roles only to
  // their own tenant.
  const roles = await prisma.role.findMany({
    where: { OR: [{ tenantId: null }, { tenantId: req.tenantId }] },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    select: roleSelect,
  });
  res.json(roles.map(serializeRole));
}));

const createRoleSchema = z.object({
  name: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/i, 'name must be alphanumeric / underscore / hyphen'),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).default([]),
});

adminRouter.post('/admin/roles', asyncHandler(async (req, res) => {
  const body = createRoleSchema.parse(req.body);
  await assertPermissionsExist(body.permissions);
  const role = await prisma.role.create({
    data: {
      tenantId: req.tenantId,
      name: body.name,
      description: body.description ?? null,
      isSystem: false,
      permissions: { create: body.permissions.map(key => ({ permissionKey: key })) },
    },
    select: roleSelect,
  });
  await audit(req, { action: 'create', resourceKind: 'role', resourceId: role.id, after: serializeRole(role) });
  res.status(201).json(serializeRole(role));
}));

adminRouter.get('/admin/roles/:id', asyncHandler(async (req, res) => {
  const role = await loadRoleForTenant(req.params.id, req.tenantId);
  res.json(serializeRole(role));
}));

const updateRoleSchema = z.object({
  name: createRoleSchema.shape.name.optional(),
  description: z.string().max(500).nullable().optional(),
  permissions: z.array(z.string()).optional(),
});

adminRouter.patch('/admin/roles/:id', asyncHandler(async (req, res) => {
  const existing = await loadRoleForTenant(req.params.id, req.tenantId);
  if (existing.isSystem) throw new HttpError(403, 'System roles cannot be edited');

  const body = updateRoleSchema.parse(req.body);
  if (body.permissions) await assertPermissionsExist(body.permissions);

  const updated = await prisma.$transaction(async (tx) => {
    if (body.permissions) {
      await tx.rolePermission.deleteMany({ where: { roleId: existing.id } });
      if (body.permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: body.permissions.map(key => ({ roleId: existing.id, permissionKey: key })),
        });
      }
    }
    return tx.role.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
      },
      select: roleSelect,
    });
  });

  invalidatePermissionCache(existing.id);
  await audit(req, {
    action: 'update', resourceKind: 'role', resourceId: existing.id,
    before: serializeRole(existing), after: serializeRole(updated),
  });
  res.json(serializeRole(updated));
}));

adminRouter.delete('/admin/roles/:id', asyncHandler(async (req, res) => {
  const role = await loadRoleForTenant(req.params.id, req.tenantId);
  if (role.isSystem) throw new HttpError(403, 'System roles cannot be deleted');
  if (role._count.memberships > 0) {
    throw new HttpError(409, `Role is assigned to ${role._count.memberships} member(s); unassign first`);
  }
  await prisma.role.delete({ where: { id: role.id } });
  invalidatePermissionCache(role.id);
  await audit(req, { action: 'delete', resourceKind: 'role', resourceId: role.id, before: serializeRole(role) });
  res.status(204).end();
}));

// ── RBAC: assign roles to a membership ────────────────────────────────────────

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()).max(32),
});

adminRouter.put('/admin/memberships/:id/roles', asyncHandler(async (req, res) => {
  const body = assignRolesSchema.parse(req.body);

  const membership = await prisma.tenantMembership.findUnique({
    where: { id: req.params.id },
    include: { roles: { select: { roleId: true } } },
  });
  if (!membership || membership.tenantId !== req.tenantId) {
    throw new HttpError(404, 'Membership not found');
  }

  // Every roleId must be either a system role or a role in the same tenant.
  if (body.roleIds.length > 0) {
    const found = await prisma.role.findMany({
      where: {
        id: { in: body.roleIds },
        OR: [{ tenantId: null }, { tenantId: req.tenantId }],
      },
      select: { id: true },
    });
    if (found.length !== body.roleIds.length) {
      throw new HttpError(400, 'One or more roleIds are invalid for this tenant');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.membershipRole.deleteMany({ where: { membershipId: membership.id } });
    if (body.roleIds.length > 0) {
      await tx.membershipRole.createMany({
        data: body.roleIds.map(roleId => ({ membershipId: membership.id, roleId })),
      });
    }
  });

  // Permissions for this user will refresh next request — but the per-role cache
  // is unchanged. Other users assigned to the same roles are unaffected; only
  // this membership's role list changed.
  await audit(req, {
    action: 'assign_roles',
    resourceKind: 'membership',
    resourceId: membership.id,
    before: { roleIds: membership.roles.map(r => r.roleId) },
    after: { roleIds: body.roleIds },
  });
  res.json({ membershipId: membership.id, roleIds: body.roleIds });
}));

// ── helpers ───────────────────────────────────────────────────────────────────

async function loadRoleForTenant(id: string, tenantId: string) {
  const role = await prisma.role.findUnique({ where: { id }, select: roleSelect });
  if (!role) throw new HttpError(404, 'Role not found');
  if (role.tenantId !== null && role.tenantId !== tenantId) {
    throw new HttpError(404, 'Role not found');
  }
  return role;
}

async function assertPermissionsExist(keys: string[]) {
  if (keys.length === 0) return;
  const catalog = new Set(await permissionCatalog());
  const unknown = keys.filter(k => !catalog.has(k));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unknown permission(s): ${unknown.join(', ')}`);
  }
}
