// M2 RBAC seed: the permission catalog and the four built-in system roles.
// This is the source of truth for what permissions exist; runtime authorization
// reads from the DB (server/auth/permissions.ts).

import type { PrismaClient } from '@prisma/client';

export const PERMISSION_CATALOG: { key: string; description: string }[] = [
  // CMDB
  { key: 'cmdb.read',         description: 'Read CIs and CI graph' },
  { key: 'cmdb.write',        description: 'Create / edit CIs and relationships' },
  { key: 'cmdb.audit.read',   description: 'Read CMDB audit log' },
  // Monitoring
  { key: 'event.read',        description: 'Read monitoring events' },
  { key: 'event.write',       description: 'Acknowledge / resolve events' },
  { key: 'rule.read',         description: 'Read monitoring rules' },
  { key: 'rule.write',        description: 'Create / edit monitoring rules' },
  // Incidents
  { key: 'incident.read',     description: 'Read incidents' },
  { key: 'incident.write',    description: 'Create / edit / comment on incidents' },
  { key: 'incident.resolve',  description: 'Resolve incidents' },
  // Changes
  { key: 'change.read',       description: 'Read changes' },
  { key: 'change.write',      description: 'Create / edit changes' },
  { key: 'change.approve',    description: 'Approve changes' },
  // System
  { key: 'system.admin',         description: 'Full administrative access' },
  { key: 'system.audit.read',    description: 'Read system audit log' },
  { key: 'system.tenant.manage', description: 'Manage tenant settings' },
];

export const SYSTEM_ROLES: { id: string; name: string; description: string; permissions: string[] }[] = [
  {
    id: 'role-system-admin',
    name: 'admin',
    description: 'Full access to every module and admin surface.',
    permissions: PERMISSION_CATALOG.map(p => p.key),
  },
  {
    id: 'role-system-operator',
    name: 'operator',
    description: 'Day-to-day operator: CMDB / monitoring / incidents read+write.',
    permissions: [
      'cmdb.read', 'cmdb.write', 'cmdb.audit.read',
      'event.read', 'event.write',
      'rule.read', 'rule.write',
      'incident.read', 'incident.write', 'incident.resolve',
    ],
  },
  {
    id: 'role-system-member',
    name: 'member',
    description: 'Contributor: read everything operational, no write on rules/events.',
    permissions: [
      'cmdb.read', 'cmdb.audit.read',
      'event.read', 'rule.read',
      'incident.read',
    ],
  },
  {
    id: 'role-system-viewer',
    name: 'viewer',
    description: 'Read-only access to operational data.',
    permissions: ['cmdb.read', 'event.read', 'rule.read', 'incident.read'],
  },
];

export async function seedRbac(prisma: PrismaClient): Promise<void> {
  await prisma.permission.createMany({
    data: PERMISSION_CATALOG.map(p => ({ key: p.key, description: p.description })),
  });

  for (const role of SYSTEM_ROLES) {
    await prisma.role.create({
      data: {
        id: role.id,
        tenantId: null,
        name: role.name,
        description: role.description,
        isSystem: true,
        permissions: {
          create: role.permissions.map(key => ({ permissionKey: key })),
        },
      },
    });
  }
}

// Returns the system role id for a given role name. Used by seed when
// assigning memberships.
export function systemRoleId(name: string): string {
  const r = SYSTEM_ROLES.find(x => x.name === name);
  if (!r) throw new Error(`Unknown system role: ${name}`);
  return r.id;
}
