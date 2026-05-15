import type {
  RbacUser,
  RbacModule,
  RbacAction,
  RbacResource,
  RbacScope,
  PermissionRule,
  Application,
  RbacTeam,
  Department,
  Division,
  HierarchyLevel,
} from '@/src/types/rbac';
import { LEVEL_RANK } from '@/src/types/rbac';
import { permissionRules } from './permissions';

// ── Org-tree registry ────────────────────────────────────────────────────────
// The tree is registered at app boot by CurrentUserProvider, which loads it
// from /api/v1/rbac/*. Callers that override via CanOptions (`Can` / `useCan`
// already do) continue to work unchanged.

let registry: {
  applications: Application[];
  teams: RbacTeam[];
  departments: Department[];
  divisions: Division[];
} = { applications: [], teams: [], departments: [], divisions: [] };

export function registerRbacOrgTree(tree: {
  applications: Application[];
  teams: RbacTeam[];
  departments: Department[];
  divisions: Division[];
}): void {
  registry = tree;
}

export interface CanOptions {
  variant?: string;
  resource?: RbacResource;
  // Inject overrides for testing.
  applications?: Application[];
  teams?: RbacTeam[];
  departments?: Department[];
  rules?: PermissionRule[];
}

export interface CanResult {
  allowed: boolean;
  reason: string;
  matchedRule?: PermissionRule;
}

// =============================================================================
// Helpers
// =============================================================================

// Resolve which teams a user has scope over, with inheritance.
// - officer/team_lead at team X → just team X
// - dept_head at dept Y → all teams in dept Y
// - group_head at division Z → all teams in any dept of division Z
export function teamsInUserScope(
  user: RbacUser,
  teams: RbacTeam[] = registry.teams,
  departments: Department[] = registry.departments,
): string[] {
  if (!user.divisionId || !user.level) return [];
  const lvl = user.level;
  if (lvl === 'group_head') {
    const deptIds = departments.filter(d => d.divisionId === user.divisionId).map(d => d.id);
    return teams.filter(t => deptIds.includes(t.departmentId)).map(t => t.id);
  }
  if (lvl === 'dept_head') {
    if (!user.departmentId) return [];
    return teams.filter(t => t.departmentId === user.departmentId).map(t => t.id);
  }
  if (!user.teamId) return [];
  return [user.teamId];
}

// Resolve which applications a user has team-scope access to, with inheritance.
// - officer/team_lead at team X → apps owned by team X
// - dept_head at dept Y → apps owned by any team in dept Y
// - group_head at division Z → apps owned by any team in any dept in division Z
export function appsInUserScope(
  user: RbacUser,
  apps: Application[] = registry.applications,
  teams: RbacTeam[] = registry.teams,
  departments: Department[] = registry.departments,
): string[] {
  if (!user.divisionId || !user.level) return [];
  const lvl = user.level;

  if (lvl === 'group_head') {
    const deptIds = departments.filter(d => d.divisionId === user.divisionId).map(d => d.id);
    const teamIds = teams.filter(t => deptIds.includes(t.departmentId)).map(t => t.id);
    return apps.filter(a => teamIds.includes(a.ownerTeamId)).map(a => a.id);
  }

  if (lvl === 'dept_head') {
    if (!user.departmentId) return [];
    const teamIds = teams.filter(t => t.departmentId === user.departmentId).map(t => t.id);
    return apps.filter(a => teamIds.includes(a.ownerTeamId)).map(a => a.id);
  }

  // team_lead / officer: bound to their own team
  if (!user.teamId) return [];
  return apps.filter(a => a.ownerTeamId === user.teamId).map(a => a.id);
}

function levelMeetsRequirement(
  userLevel: HierarchyLevel | null,
  required?: HierarchyLevel,
): boolean {
  if (!required) return true;
  if (!userLevel) return false;
  return LEVEL_RANK[userLevel] >= LEVEL_RANK[required];
}

function divisionMatches(
  user: RbacUser,
  required?: PermissionRule['requiredDivisions'],
): boolean {
  if (!required || required.length === 0) return true;
  if (!user.divisionId) return false;
  const divCode = registry.divisions.find(d => d.id === user.divisionId)?.code;
  if (!divCode) return false;
  return required.includes(divCode);
}

function functionalRoleMatches(
  user: RbacUser,
  required?: PermissionRule['requiredFunctionalRoles'],
): boolean {
  if (!required || required.length === 0) return true;
  return required.some(r => user.functionalRoles.includes(r as never));
}

function scopeMatches(
  user: RbacUser,
  scope: RbacScope,
  resource: RbacResource | undefined,
  apps: Application[],
  teams: RbacTeam[],
  departments: Department[],
): boolean {
  if (scope === 'all') return true;

  if (scope === 'own') {
    if (!resource) return true; // permission to perform a "create your own" action
    return resource.ownerUserId === user.id;
  }

  // 'team_app' — match by applicationId, or by ownerTeamId for resources scoped to a team.
  if (resource?.applicationId) {
    return appsInUserScope(user, apps, teams, departments).includes(resource.applicationId);
  }
  if (resource?.ownerTeamId) {
    return teamsInUserScope(user, teams, departments).includes(resource.ownerTeamId);
  }
  // No specific resource — answer based on whether the user has ANY scope apps/teams.
  return appsInUserScope(user, apps, teams, departments).length > 0
    || teamsInUserScope(user, teams, departments).length > 0;
}

// =============================================================================
// Main API
// =============================================================================

export function can(
  user: RbacUser | null | undefined,
  module: RbacModule,
  action: RbacAction,
  opts: CanOptions = {},
): CanResult {
  if (!user || !user.active) {
    return { allowed: false, reason: 'No active user.' };
  }
  if (user.isSuperadmin) {
    return { allowed: true, reason: 'Superadmin bypass.' };
  }

  const apps = opts.applications ?? registry.applications;
  const teams = opts.teams ?? registry.teams;
  const departments = opts.departments ?? registry.departments;
  const rules = opts.rules ?? permissionRules;

  const candidates = rules.filter(r => {
    if (r.module !== module) return false;
    if (r.action !== action) return false;
    if (r.variant && opts.variant && r.variant !== opts.variant) return false;
    if (r.variant && !opts.variant) return false;
    return true;
  });

  for (const rule of candidates) {
    if (!levelMeetsRequirement(user.level, rule.requiredLevel)) continue;
    if (!divisionMatches(user, rule.requiredDivisions)) continue;
    if (!functionalRoleMatches(user, rule.requiredFunctionalRoles)) continue;
    if (!scopeMatches(user, rule.scope, opts.resource, apps, teams, departments)) continue;
    return { allowed: true, reason: rule.description, matchedRule: rule };
  }

  return { allowed: false, reason: `No matching rule for ${module}.${action}.` };
}

// Convenience: returns boolean only.
export function canDo(
  user: RbacUser | null | undefined,
  module: RbacModule,
  action: RbacAction,
  opts: CanOptions = {},
): boolean {
  return can(user, module, action, opts).allowed;
}

// Filter a list of resources to only those the user can `read`.
export function filterReadable<T extends RbacResource>(
  user: RbacUser | null | undefined,
  module: RbacModule,
  resources: T[],
): T[] {
  return resources.filter(r => canDo(user, module, 'read', { resource: r }));
}
