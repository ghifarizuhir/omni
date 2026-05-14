// M2 RBAC seed: the permission catalog and the four built-in system roles.
// This is the source of truth for what permissions exist; runtime authorization
// reads from the DB (server/auth/permissions.ts).

import type { PrismaClient } from '@prisma/client';

export const PERMISSION_CATALOG: { key: string; description: string }[] = [
  // CMDB
  { key: 'cmdb.read',         description: 'Read CIs and CI graph' },
  { key: 'cmdb.write',        description: 'Create / edit CIs and relationships' },
  { key: 'cmdb.audit.read',   description: 'Read CMDB audit log' },
  { key: 'service.read',      description: 'Read services catalog' },
  // Monitoring
  { key: 'event.read',        description: 'Read monitoring events' },
  { key: 'event.write',       description: 'Acknowledge / resolve events' },
  { key: 'rule.read',         description: 'Read monitoring rules and alert routes' },
  { key: 'rule.write',        description: 'Create / edit monitoring rules and alert routes' },
  // Incidents
  { key: 'incident.read',     description: 'Read incidents' },
  { key: 'incident.write',    description: 'Create / edit / comment on incidents' },
  { key: 'incident.resolve',  description: 'Resolve incidents' },
  // Problems
  { key: 'problem.read',      description: 'Read problems' },
  { key: 'problem.write',     description: 'Create / edit problems' },
  // Changes
  { key: 'change.read',       description: 'Read changes' },
  { key: 'change.write',      description: 'Create / edit changes' },
  { key: 'change.approve',    description: 'Approve changes' },
  // Release & Deployment
  { key: 'release.read',      description: 'Read releases' },
  { key: 'release.write',     description: 'Create / edit releases' },
  { key: 'deployment.read',   description: 'Read deployments and logs' },
  { key: 'deployment.write',  description: 'Trigger / edit deployments' },
  // Service requests & catalog
  { key: 'request.read',      description: 'Read service requests and catalog' },
  { key: 'request.write',     description: 'Submit / fulfill service requests' },
  // Knowledge base
  { key: 'kb.read',           description: 'Read knowledge base' },
  { key: 'kb.write',          description: 'Author / edit knowledge articles' },
  // Improvements
  { key: 'improvement.read',  description: 'Read improvement initiatives' },
  { key: 'improvement.write', description: 'Create / edit improvement initiatives' },
  // Availability & Capacity
  { key: 'availability.read', description: 'Read SLAs, outages, daily health' },
  { key: 'capacity.read',     description: 'Read capacity metrics, forecasts, recommendations' },
  // Platform — identity / org
  { key: 'user.read',         description: 'Read user directory and teams' },
  { key: 'rbac.read',         description: 'Read RBAC org tree (divisions, departments, teams, applications, roles)' },
  // Platform — comms
  { key: 'notification.read', description: 'Read notifications and preferences' },
  { key: 'inbox.read',        description: 'Read personal inbox' },
  { key: 'oncall.read',       description: 'Read on-call schedules and overrides' },
  // Platform — QA / status / AI
  { key: 'testing.read',      description: 'Read test plans, cases, runs, sign-offs' },
  { key: 'statuspage.read',   description: 'Read status page entries and incidents' },
  { key: 'ai.read',           description: 'Read AI assistant sessions' },
  { key: 'ai.write',          description: 'Create / continue AI assistant sessions' },
  // Continuity & Measurement
  { key: 'continuity.read',   description: 'Read DR plans, runs, BIA' },
  { key: 'measurement.read',  description: 'Read reports, ROI, benefits, dashboards, metrics' },
  // Integrations
  { key: 'integration.read',  description: 'Read integrations' },
  { key: 'integration.write', description: 'Create / edit / delete integrations and rotate secrets' },
  // System
  { key: 'system.admin',         description: 'Full administrative access' },
  { key: 'system.audit.read',    description: 'Read system audit log' },
  { key: 'system.tenant.manage', description: 'Manage tenant settings' },
];

// Convenience: every read-only permission. Member/viewer roles include all of
// these so any tenant member can navigate the read-only surface.
const ALL_READS = [
  'cmdb.read', 'cmdb.audit.read', 'service.read',
  'event.read', 'rule.read',
  'incident.read', 'problem.read',
  'change.read', 'release.read', 'deployment.read',
  'request.read', 'kb.read', 'improvement.read',
  'availability.read', 'capacity.read',
  'user.read', 'rbac.read',
  'notification.read', 'inbox.read', 'oncall.read',
  'testing.read', 'statuspage.read', 'ai.read',
  'continuity.read', 'measurement.read',
  'integration.read',
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
    description: 'Day-to-day operator: reads everything, writes on CMDB / monitoring / incidents / requests / integrations.',
    permissions: [
      ...ALL_READS,
      'cmdb.write',
      'event.write',
      'rule.write',
      'incident.write', 'incident.resolve',
      'problem.write',
      'request.write',
      'kb.write',
      'ai.write',
      'integration.write',
    ],
  },
  {
    id: 'role-system-member',
    name: 'member',
    description: 'Contributor: read everything operational, write only on knowledge and AI.',
    permissions: [
      ...ALL_READS,
      'kb.write',
      'ai.write',
    ],
  },
  {
    id: 'role-system-viewer',
    name: 'viewer',
    description: 'Read-only access to all operational data.',
    permissions: [...ALL_READS],
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
