// RBAC + ABAC hybrid model
// See docs/superpowers/specs (brainstorming session 2026-05-13)

export type DivisionCode = 'STA' | 'IFM' | 'APS' | 'USER_BUSINESS';

export type HierarchyLevel =
  | 'group_head'
  | 'dept_head'
  | 'team_lead'
  | 'officer'
  | 'requester';

export const LEVEL_RANK: Record<HierarchyLevel, number> = {
  requester: 0,
  officer: 1,
  team_lead: 2,
  dept_head: 3,
  group_head: 4,
};

export const LEVEL_LABEL: Record<HierarchyLevel, string> = {
  requester: 'Requester',
  officer: 'Officer',
  team_lead: 'Team Lead',
  dept_head: 'Department Head',
  group_head: 'Group Head',
};

export interface Division {
  id: string;
  code: DivisionCode;
  name: string;
}

export interface Department {
  id: string;
  divisionId: string;
  code: string;
  name: string;
}

export interface RbacTeam {
  id: string;
  departmentId: string;
  code: string;
  name: string;
}

export interface Application {
  id: string;
  code: string;
  name: string;
  ownerTeamId: string;     // team-level ownership (APS)
  description?: string;
}

export type FunctionalRoleCode =
  | 'change_manager'         // APS Change & Release team
  | 'cab_member'             // CAB approver
  | 'emergency_approver'     // Emergency change approval (usually Dept Head+ CAB)
  | 'assessor'               // App-owner assessor (often implicit from team)
  | 'ifm_operator'           // Generic IFM access (placeholder coarse role)
  | 'sta_member'             // Generic STA access (placeholder coarse role)
  | 'requester';             // End-user (User Business)

export interface FunctionalRole {
  id: string;
  code: FunctionalRoleCode | string;
  name: string;
  description: string;
  builtIn: boolean;
}

export interface RbacUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  divisionId: string | null;
  departmentId: string | null;
  teamId: string | null;
  level: HierarchyLevel | null;
  functionalRoles: FunctionalRoleCode[] | string[];
  isSuperadmin: boolean;
  active: boolean;
}

// Action vocabulary
export type RbacModule =
  | 'incident'
  | 'problem'
  | 'change'
  | 'request'
  | 'knowledge'
  | 'cmdb'
  | 'availability'
  | 'capacity'
  | 'testing'
  | 'improvement'
  | 'release'
  | 'monitoring'
  | 'continuity'
  | 'measurement'
  | 'platform'
  | 'admin';

export type RbacAction =
  | 'create'
  | 'read'
  | 'update'
  | 'assign'
  | 'close'
  | 'assess'
  | 'approve'
  | 'implement'
  | 'fulfill'
  | 'author'
  | 'audit_read'
  | 'manage';

// Scope semantics:
// - 'own'      : only resources owned by user (e.g., requester's own tickets)
// - 'team_app' : resources whose applicationId is in the user's team app set (with inheritance)
// - 'all'      : any resource
export type RbacScope = 'own' | 'team_app' | 'all';

export interface PermissionRule {
  id: string;
  module: RbacModule;
  action: RbacAction;
  // Optional discriminator for actions that vary by sub-type (e.g. change type)
  variant?: string;
  // Condition predicates (all must match):
  requiredLevel?: HierarchyLevel;
  requiredDivisions?: DivisionCode[];
  requiredFunctionalRoles?: (FunctionalRoleCode | string)[];
  scope: RbacScope;
  description: string;
}

// Resource shape used by the engine when scope check is needed.
export interface RbacResource {
  applicationId?: string;
  ownerTeamId?: string;   // For resources scoped directly to a team (e.g., Change)
  ownerUserId?: string;
}
