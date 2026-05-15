// Client for /admin/* RBAC endpoints. Mirrors the server response shapes
// from server/routes/admin.ts.

import { apiFetch } from './core';

export interface PermissionDto {
  key: string;
  description: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  membershipCount: number;
}

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  membershipId: string | null;
  roles: { id: string; name: string }[];
}

export const adminApi = {
  listPermissions: () => apiFetch<PermissionDto[]>('/admin/permissions'),

  listRoles: () => apiFetch<RoleDto[]>('/admin/roles'),

  createRole: (body: { name: string; description?: string; permissions: string[] }) =>
    apiFetch<RoleDto>('/admin/roles', { method: 'POST', body }),

  updateRole: (id: string, body: { name?: string; description?: string | null; permissions?: string[] }) =>
    apiFetch<RoleDto>(`/admin/roles/${id}`, { method: 'PATCH', body }),

  deleteRole: (id: string) =>
    apiFetch<void>(`/admin/roles/${id}`, { method: 'DELETE' }),

  listUsers: () => apiFetch<AdminUserDto[]>('/admin/users'),

  setMembershipRoles: (membershipId: string, roleIds: string[]) =>
    apiFetch<{ membershipId: string; roleIds: string[] }>(
      `/admin/memberships/${membershipId}/roles`,
      { method: 'PUT', body: { roleIds } },
    ),

  resetUserPassword: (userId: string) =>
    apiFetch<{ tempPassword: string }>(
      `/admin/rbac/users/${userId}/reset-password`,
      { method: 'POST' },
    ),
};
