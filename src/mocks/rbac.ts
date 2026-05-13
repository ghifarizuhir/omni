import type {
  Division,
  Department,
  RbacTeam,
  Application,
  FunctionalRole,
  RbacUser,
} from '@/src/types/rbac';

// =============================================================================
// Divisions
// =============================================================================
export const mockDivisions: Division[] = [
  { id: 'div-sta', code: 'STA', name: 'IT Strategy & Architecture' },
  { id: 'div-ifm', code: 'IFM', name: 'IT Infrastructure Management' },
  { id: 'div-aps', code: 'APS', name: 'IT Application Services' },
  { id: 'div-ub',  code: 'USER_BUSINESS', name: 'User Business' },
];

// =============================================================================
// Departments
// =============================================================================
export const mockDepartments: Department[] = [
  // APS — 4 app-holding departments + 1 Testing & Source Control
  { id: 'dept-aps-1', divisionId: 'div-aps', code: 'APS-CORE',     name: 'APS Core Banking Apps' },
  { id: 'dept-aps-2', divisionId: 'div-aps', code: 'APS-CHANNEL',  name: 'APS Channel Apps' },
  { id: 'dept-aps-3', divisionId: 'div-aps', code: 'APS-SUPPORT',  name: 'APS Support Apps' },
  { id: 'dept-aps-4', divisionId: 'div-aps', code: 'APS-DATA',     name: 'APS Data & Analytics Apps' },
  { id: 'dept-aps-tsc', divisionId: 'div-aps', code: 'APS-TSC',    name: 'APS Testing & Source Control' },

  // IFM — coarse placeholder
  { id: 'dept-ifm-ops', divisionId: 'div-ifm', code: 'IFM-OPS', name: 'IFM Operations' },

  // STA — coarse placeholder
  { id: 'dept-sta-arch', divisionId: 'div-sta', code: 'STA-ARCH', name: 'STA Architecture' },

  // User business — coarse placeholder
  { id: 'dept-ub-retail', divisionId: 'div-ub', code: 'UB-RETAIL', name: 'Retail Business' },
];

// =============================================================================
// Teams
// =============================================================================
export const mockRbacTeams: RbacTeam[] = [
  // APS Core (dept-aps-1)
  { id: 'team-core-loan',    departmentId: 'dept-aps-1', code: 'CORE-LOAN',    name: 'Loan Origination Team' },
  { id: 'team-core-deposit', departmentId: 'dept-aps-1', code: 'CORE-DEPOSIT', name: 'Deposit Team' },

  // APS Channel (dept-aps-2)
  { id: 'team-ch-mobile', departmentId: 'dept-aps-2', code: 'CH-MOBILE', name: 'Mobile Banking Team' },
  { id: 'team-ch-web',    departmentId: 'dept-aps-2', code: 'CH-WEB',    name: 'Web Banking Team' },

  // APS Support (dept-aps-3)
  { id: 'team-sup-hrms', departmentId: 'dept-aps-3', code: 'SUP-HRMS', name: 'HRMS Team' },

  // APS Data (dept-aps-4)
  { id: 'team-data-dwh', departmentId: 'dept-aps-4', code: 'DATA-DWH', name: 'Data Warehouse Team' },

  // APS TSC (dept-aps-tsc)
  { id: 'team-tsc-chgrel', departmentId: 'dept-aps-tsc', code: 'TSC-CHGREL', name: 'Change & Release Management' },
  { id: 'team-tsc-scm',    departmentId: 'dept-aps-tsc', code: 'TSC-SCM',    name: 'Source Control & Test Env Services' },
  { id: 'team-tsc-test1',  departmentId: 'dept-aps-tsc', code: 'TSC-TEST-1', name: 'Testing Team 1' },
  { id: 'team-tsc-test2',  departmentId: 'dept-aps-tsc', code: 'TSC-TEST-2', name: 'Testing Team 2' },

  // IFM
  { id: 'team-ifm-noc',    departmentId: 'dept-ifm-ops', code: 'IFM-NOC',    name: 'Network Operations Center' },

  // STA
  { id: 'team-sta-arch',   departmentId: 'dept-sta-arch', code: 'STA-EA',    name: 'Enterprise Architecture' },

  // User Business
  { id: 'team-ub-branch',  departmentId: 'dept-ub-retail', code: 'UB-BRANCH', name: 'Branch Operations' },
];

// =============================================================================
// Applications — owned by APS teams
// =============================================================================
export const mockApplications: Application[] = [
  { id: 'app-loan',     code: 'LOAN',     name: 'Loan Origination System',  ownerTeamId: 'team-core-loan' },
  { id: 'app-deposit',  code: 'DEPOSIT',  name: 'Deposit Management',        ownerTeamId: 'team-core-deposit' },
  { id: 'app-mbank',    code: 'MBANK',    name: 'Mobile Banking',            ownerTeamId: 'team-ch-mobile' },
  { id: 'app-ibank',    code: 'IBANK',    name: 'Internet Banking',          ownerTeamId: 'team-ch-web' },
  { id: 'app-hrms',     code: 'HRMS',     name: 'HR Management System',      ownerTeamId: 'team-sup-hrms' },
  { id: 'app-dwh',      code: 'DWH',      name: 'Data Warehouse',            ownerTeamId: 'team-data-dwh' },
];

// =============================================================================
// Functional Roles
// =============================================================================
export const mockFunctionalRoles: FunctionalRole[] = [
  { id: 'role-cm',  code: 'change_manager',     name: 'Change Manager',     description: 'Member of APS Change & Release team. Can create changes.', builtIn: true },
  { id: 'role-cab', code: 'cab_member',         name: 'CAB Member',         description: 'Sits on Change Advisory Board. Approves normal changes.', builtIn: true },
  { id: 'role-ea',  code: 'emergency_approver', name: 'Emergency Approver', description: 'Authorized to approve emergency changes (typically Dept Head+ CAB).', builtIn: true },
  { id: 'role-as',  code: 'assessor',           name: 'Assessor',           description: 'Assesses changes touching their team\'s applications.', builtIn: true },
  { id: 'role-ifm', code: 'ifm_operator',       name: 'IFM Operator',       description: 'Generic IFM access (placeholder until hierarchy detail is known).', builtIn: true },
  { id: 'role-sta', code: 'sta_member',         name: 'STA Member',         description: 'Generic STA access (read CMDB, reviewer in Change).', builtIn: true },
  { id: 'role-req', code: 'requester',          name: 'Requester',          description: 'End user. Can submit own requests/incidents.', builtIn: true },
];

// =============================================================================
// Users — demo set covering each role/scope
// =============================================================================
export const mockRbacUsers: RbacUser[] = [
  {
    id: 'u-super',
    name: 'Super Admin',
    email: 'admin@omni.local',
    divisionId: null, departmentId: null, teamId: null, level: null,
    functionalRoles: [], isSuperadmin: true, active: true,
  },

  // APS Group Head — sees everything in APS via inheritance
  {
    id: 'u-aps-gh',
    name: 'Andi Wibowo',
    email: 'andi.wibowo@omni.local',
    divisionId: 'div-aps', departmentId: null, teamId: null,
    level: 'group_head', functionalRoles: [], isSuperadmin: false, active: true,
  },

  // APS Channel Department Head
  {
    id: 'u-aps-channel-dh',
    name: 'Budi Santoso',
    email: 'budi.santoso@omni.local',
    divisionId: 'div-aps', departmentId: 'dept-aps-2', teamId: null,
    level: 'dept_head', functionalRoles: ['cab_member'], isSuperadmin: false, active: true,
  },

  // Mobile Banking Team Lead
  {
    id: 'u-mbank-tl',
    name: 'Citra Pratiwi',
    email: 'citra.pratiwi@omni.local',
    divisionId: 'div-aps', departmentId: 'dept-aps-2', teamId: 'team-ch-mobile',
    level: 'team_lead', functionalRoles: ['assessor'], isSuperadmin: false, active: true,
  },

  // Mobile Banking Officer
  {
    id: 'u-mbank-off',
    name: 'Dewi Anggraini',
    email: 'dewi.anggraini@omni.local',
    divisionId: 'div-aps', departmentId: 'dept-aps-2', teamId: 'team-ch-mobile',
    level: 'officer', functionalRoles: [], isSuperadmin: false, active: true,
  },

  // Loan officer (different team — should NOT see mobile incidents)
  {
    id: 'u-loan-off',
    name: 'Eko Prasetyo',
    email: 'eko.prasetyo@omni.local',
    divisionId: 'div-aps', departmentId: 'dept-aps-1', teamId: 'team-core-loan',
    level: 'officer', functionalRoles: [], isSuperadmin: false, active: true,
  },

  // Change & Release Manager
  {
    id: 'u-chgrel',
    name: 'Fitri Handayani',
    email: 'fitri.handayani@omni.local',
    divisionId: 'div-aps', departmentId: 'dept-aps-tsc', teamId: 'team-tsc-chgrel',
    level: 'team_lead', functionalRoles: ['change_manager'], isSuperadmin: false, active: true,
  },

  // CAB Member at APS Group Head level — emergency approver
  {
    id: 'u-aps-gh-cab',
    name: 'Gunawan Suryadi',
    email: 'gunawan.suryadi@omni.local',
    divisionId: 'div-aps', departmentId: null, teamId: null,
    level: 'group_head', functionalRoles: ['cab_member', 'emergency_approver'], isSuperadmin: false, active: true,
  },

  // IFM operator
  {
    id: 'u-ifm-op',
    name: 'Hadi Wijaya',
    email: 'hadi.wijaya@omni.local',
    divisionId: 'div-ifm', departmentId: 'dept-ifm-ops', teamId: 'team-ifm-noc',
    level: 'officer', functionalRoles: ['ifm_operator'], isSuperadmin: false, active: true,
  },

  // STA member
  {
    id: 'u-sta',
    name: 'Indah Permata',
    email: 'indah.permata@omni.local',
    divisionId: 'div-sta', departmentId: 'dept-sta-arch', teamId: 'team-sta-arch',
    level: 'officer', functionalRoles: ['sta_member'], isSuperadmin: false, active: true,
  },

  // Business requester
  {
    id: 'u-biz',
    name: 'Joko Susilo',
    email: 'joko.susilo@omni.local',
    divisionId: 'div-ub', departmentId: 'dept-ub-retail', teamId: 'team-ub-branch',
    level: 'requester', functionalRoles: ['requester'], isSuperadmin: false, active: true,
  },
];
