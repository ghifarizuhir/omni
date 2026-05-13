// Permission catalog. Permissions are dotted strings `<resource>.<action>`.
// Roles map to sets of permissions; the role→permission table is intentionally
// hardcoded for M2 and moves to the DB in M3+ when the admin UI lands.

export const PERMISSIONS = [
  // CMDB
  'cmdb.read', 'cmdb.write', 'cmdb.audit.read',
  // Monitoring
  'event.read', 'event.write',
  'rule.read', 'rule.write',
  // Incidents
  'incident.read', 'incident.write', 'incident.resolve',
  // Changes (M3)
  'change.read', 'change.write', 'change.approve',
  // System
  'system.admin', 'system.audit.read', 'system.tenant.manage',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  admin: PERMISSIONS,
  operator: [
    'cmdb.read', 'cmdb.write', 'cmdb.audit.read',
    'event.read', 'event.write',
    'rule.read', 'rule.write',
    'incident.read', 'incident.write', 'incident.resolve',
  ],
  member: [
    'cmdb.read', 'cmdb.audit.read',
    'event.read', 'rule.read',
    'incident.read',
  ],
  viewer: [
    'cmdb.read', 'event.read', 'rule.read', 'incident.read',
  ],
};

export const permissionsForRoles = (roles: string[]): Set<Permission> => {
  const out = new Set<Permission>();
  for (const r of roles) {
    for (const p of ROLE_PERMISSIONS[r] ?? []) out.add(p);
  }
  return out;
};
