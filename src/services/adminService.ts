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

export type MembershipRole = 'OWNER' | 'CONTRIBUTOR' | 'VIEWER';

export interface MembershipDto {
  appId: string;
  teamId: string;
  role: MembershipRole;
  addedById: string | null;
  addedAt: string;
}

export const applicationMembershipApi = {
  list: (appId: string) => apiFetch<MembershipDto[]>(`/applications/${appId}/teams`),
  add: (appId: string, body: { teamId: string; role: MembershipRole }) =>
    apiFetch<MembershipDto>(`/applications/${appId}/teams`, { method: 'POST', body }),
  changeRole: (appId: string, teamId: string, role: MembershipRole) =>
    apiFetch<MembershipDto>(`/applications/${appId}/teams/${teamId}`, { method: 'PATCH', body: { role } }),
  remove: (appId: string, teamId: string) =>
    apiFetch<void>(`/applications/${appId}/teams/${teamId}`, { method: 'DELETE' }),
  manageable: () => apiFetch<Array<{ id: string; code: string; name: string; criticality: string | null }>>('/applications/manageable'),
};

export interface DataQualitySummary {
  cmdb: { total: number; orphan: number };
  event: { total: number; orphan: number };
  incident: { total: number; orphan: number };
  change: { total: number; orphan: number };
  problem: { total: number; orphan: number };
  service_request: { total: number; orphan: number };
}

export const dataQualityApi = {
  summary: () => apiFetch<DataQualitySummary>('/admin/data-quality/summary'),
  list:    (module: string) => apiFetch<unknown[]>(`/admin/data-quality/${module}`),
  assign:  (module: string, publicId: string, applicationId: string) =>
    apiFetch<{ ok: true }>(`/admin/data-quality/${module}/${publicId}`, { method: 'PATCH', body: { applicationId } }),
  bulkAssign: (module: string, publicIds: string[], applicationId: string) =>
    apiFetch<{ updated: number }>(`/admin/data-quality/${module}/bulk`, { method: 'POST', body: { ids: publicIds, applicationId } }),
};
