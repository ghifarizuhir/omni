import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requirePermission } from '../middleware/auth';
import { audit } from '../audit';
import { invalidatePermissionCache, permissionCatalog } from '../auth/permissions';
import { upsertDocument, deleteDocument } from '../repositories/documents';
import { asyncHandler, HttpError, qString } from '../util';
import { hashPassword } from '../auth/session';
import { generateTempPassword } from '../lib/passwordGen';
import {
  upsertDivision, deleteDivision,
  upsertDepartment, deleteDepartment,
  upsertTeam, deleteTeam,
  upsertApplication, deleteApplication,
  upsertFunctionalRole, deleteFunctionalRole,
  upsertRbacUser, deleteRbacUser,
} from '../repositories/rbacOrg';
import {
  divisionSchema, departmentSchema, teamSchema,
  applicationSchema, functionalRoleSchema, rbacUserSchema,
} from '../lib/validation/rbac';
import { dataQualityRouter } from './admin/dataQuality';
import { applicationMembershipRouter } from './admin/applicationMembership';

export const adminRouter = Router();

// Scoped to /admin/* — adminRouter is mounted at the api root alongside other
// routers, so an unscoped `.use(requirePermission(...))` would gate every
// request that reaches this router (including ones destined for cmdb, events,
// etc., since Express middleware on a router runs for all paths that arrive
// at it). Path-prefix the guard so it only fires on actual admin routes.
adminRouter.use('/admin', requirePermission('system.admin'));
adminRouter.use('/admin/data-quality', dataQualityRouter);
adminRouter.use('/admin/applications', applicationMembershipRouter);

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

// ── RBAC org tree: typed CRUD per entity ─────────────────────────────────────

adminRouter.put('/admin/rbac/divisions/:id', asyncHandler(async (req, res) => {
  const input = divisionSchema.parse(req.body);
  const row = await upsertDivision(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'division', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/divisions/:id', asyncHandler(async (req, res) => {
  await deleteDivision(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'division', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/departments/:id', asyncHandler(async (req, res) => {
  const input = departmentSchema.parse(req.body);
  const row = await upsertDepartment(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'department', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/departments/:id', asyncHandler(async (req, res) => {
  await deleteDepartment(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'department', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/teams/:id', asyncHandler(async (req, res) => {
  const input = teamSchema.parse(req.body);
  const row = await upsertTeam(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'team', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/teams/:id', asyncHandler(async (req, res) => {
  await deleteTeam(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'team', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/applications/:id', asyncHandler(async (req, res) => {
  const input = applicationSchema.parse(req.body);
  await upsertApplication(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'application', resourceId: req.params.id, after: input });
  res.json({ id: req.params.id, ...input });
}));
adminRouter.delete('/admin/rbac/applications/:id', asyncHandler(async (req, res) => {
  await deleteApplication(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'application', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/roles/:id', asyncHandler(async (req, res) => {
  const input = functionalRoleSchema.parse(req.body);
  const row = await upsertFunctionalRole(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'functional-role', resourceId: row.id, after: row });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/roles/:id', asyncHandler(async (req, res) => {
  await deleteFunctionalRole(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'functional-role', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.put('/admin/rbac/users/:id', asyncHandler(async (req, res) => {
  const input = rbacUserSchema.parse(req.body);
  const row = await upsertRbacUser(req.tenantId, req.params.id, input);
  await audit(req, { action: 'upsert', resourceKind: 'user', resourceId: row.id, after: { ...row, passwordHash: undefined } });
  res.json(row);
}));
adminRouter.delete('/admin/rbac/users/:id', asyncHandler(async (req, res) => {
  await deleteRbacUser(req.params.id);
  await audit(req, { action: 'delete', resourceKind: 'user', resourceId: req.params.id });
  res.status(204).end();
}));

adminRouter.post('/admin/rbac/users/:id/reset-password', asyncHandler(async (req, res) => {
  const target = await prisma.user.findFirst({
    where: { id: req.params.id, memberships: { some: { tenantId: req.tenantId } } },
  });
  if (!target) throw new HttpError(404, 'User not found');
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, mustChangePassword: true },
  });
  await audit(req, {
    action: 'reset-password',
    resourceKind: 'user',
    resourceId: target.id,
    after: { mustChangePassword: true },
  });
  res.status(201).json({ tempPassword });
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
