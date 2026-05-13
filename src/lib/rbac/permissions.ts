import type { PermissionRule } from '@/src/types/rbac';

// Declarative permission matrix. Read top-to-bottom; first matching ALLOW wins.
// Engine evaluates each rule's conditions; superadmin bypasses everything.
export const permissionRules: PermissionRule[] = [
  // ============================ INCIDENT ============================
  {
    id: 'inc-create-any-it',
    module: 'incident', action: 'create',
    requiredLevel: 'officer',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'Any IT officer+ can create incidents.',
  },
  {
    id: 'inc-create-requester',
    module: 'incident', action: 'create',
    requiredFunctionalRoles: ['requester'],
    scope: 'own',
    description: 'Requesters can create incidents for themselves.',
  },
  {
    id: 'inc-read-ifm',
    module: 'incident', action: 'read',
    requiredDivisions: ['IFM'],
    scope: 'all',
    description: 'IFM reads all incidents across applications.',
  },
  {
    id: 'inc-read-aps',
    module: 'incident', action: 'read',
    requiredDivisions: ['APS'],
    requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS reads incidents for their team apps (inheritance ↑).',
  },
  {
    id: 'inc-read-requester',
    module: 'incident', action: 'read',
    requiredFunctionalRoles: ['requester'],
    scope: 'own',
    description: 'Requesters read only their own incidents.',
  },
  {
    id: 'inc-update-ifm',
    module: 'incident', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM updates incidents on any app.',
  },
  {
    id: 'inc-update-aps',
    module: 'incident', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS updates incidents on own team apps.',
  },
  {
    id: 'inc-assign-ifm',
    module: 'incident', action: 'assign',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ assigns any incident.',
  },
  {
    id: 'inc-assign-aps',
    module: 'incident', action: 'assign',
    requiredDivisions: ['APS'], requiredLevel: 'team_lead',
    scope: 'team_app',
    description: 'APS Team Lead+ assigns incidents in own scope.',
  },
  {
    id: 'inc-close-ifm',
    module: 'incident', action: 'close',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM closes incidents.',
  },
  {
    id: 'inc-close-aps',
    module: 'incident', action: 'close',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS closes incidents on own apps.',
  },

  // ============================ PROBLEM ============================
  {
    id: 'prb-read-ifm',
    module: 'problem', action: 'read',
    requiredDivisions: ['IFM'],
    scope: 'all',
    description: 'IFM reads all problems.',
  },
  {
    id: 'prb-read-aps',
    module: 'problem', action: 'read',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS reads problems for own apps.',
  },
  {
    id: 'prb-update-ifm',
    module: 'problem', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM updates any problem.',
  },
  {
    id: 'prb-update-aps',
    module: 'problem', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS updates problems on own apps.',
  },
  {
    id: 'prb-create',
    module: 'problem', action: 'create',
    requiredDivisions: ['IFM', 'APS'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IT officer+ can raise a problem.',
  },

  // ============================ CHANGE ============================
  {
    id: 'chg-create',
    module: 'change', action: 'create',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Only APS Change & Release team creates changes.',
  },
  {
    id: 'chg-assess',
    module: 'change', action: 'assess',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'App-owner team assesses changes touching their apps.',
  },
  {
    id: 'chg-read-aps',
    module: 'change', action: 'read',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS reads changes touching own apps.',
  },
  {
    id: 'chg-read-ifm',
    module: 'change', action: 'read',
    requiredDivisions: ['IFM'],
    scope: 'all',
    description: 'IFM reads all changes.',
  },
  {
    id: 'chg-read-sta',
    module: 'change', action: 'read',
    requiredFunctionalRoles: ['sta_member'],
    scope: 'all',
    description: 'STA reads all changes (architecture reviewer).',
  },
  {
    id: 'chg-read-cm',
    module: 'change', action: 'read',
    requiredFunctionalRoles: ['change_manager', 'cab_member'],
    scope: 'all',
    description: 'Change Manager and CAB Members read all changes.',
  },
  {
    id: 'chg-approve-standard',
    module: 'change', action: 'approve', variant: 'standard',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Standard change: auto-approve after assessment (CM authority).',
  },
  {
    id: 'chg-approve-normal',
    module: 'change', action: 'approve', variant: 'normal',
    requiredFunctionalRoles: ['cab_member'],
    scope: 'all',
    description: 'Normal change: CAB Member approval required.',
  },
  {
    id: 'chg-approve-emergency',
    module: 'change', action: 'approve', variant: 'emergency',
    requiredFunctionalRoles: ['emergency_approver'],
    scope: 'all',
    description: 'Emergency change: dedicated emergency approver.',
  },
  {
    id: 'chg-implement-aps',
    module: 'change', action: 'implement',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS officer+ implements changes on own apps.',
  },
  {
    id: 'chg-implement-cm',
    module: 'change', action: 'implement',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Change Manager can implement any change.',
  },

  // ============================ REQUEST ============================
  {
    id: 'req-create',
    module: 'request', action: 'create',
    scope: 'all',
    description: 'Any authenticated user creates service requests.',
  },
  {
    id: 'req-read-own',
    module: 'request', action: 'read',
    scope: 'own',
    description: 'Anyone reads their own requests.',
  },
  {
    id: 'req-read-ifm',
    module: 'request', action: 'read',
    requiredDivisions: ['IFM'],
    scope: 'all',
    description: 'IFM reads all requests.',
  },
  {
    id: 'req-read-aps',
    module: 'request', action: 'read',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS reads requests routed to own team.',
  },
  {
    id: 'req-update-aps',
    module: 'request', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS updates requests routed to own team.',
  },
  {
    id: 'req-update-ifm',
    module: 'request', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM updates any request.',
  },
  {
    id: 'req-approve-aps',
    module: 'request', action: 'approve',
    requiredDivisions: ['APS'], requiredLevel: 'team_lead',
    scope: 'team_app',
    description: 'APS Team Lead+ approves requests routed to own team.',
  },
  {
    id: 'req-approve-ifm',
    module: 'request', action: 'approve',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ approves any request.',
  },
  {
    id: 'req-fulfill-aps',
    module: 'request', action: 'fulfill',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS fulfills requests targeting own apps.',
  },
  {
    id: 'req-fulfill-ifm',
    module: 'request', action: 'fulfill',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM fulfills infrastructure requests.',
  },

  // ============================ KNOWLEDGE ============================
  {
    id: 'kb-read',
    module: 'knowledge', action: 'read',
    scope: 'all',
    description: 'All authenticated users read KB.',
  },
  {
    id: 'kb-author',
    module: 'knowledge', action: 'author',
    requiredLevel: 'team_lead',
    requiredDivisions: ['IFM', 'APS', 'STA'],
    scope: 'all',
    description: 'Team Lead+ can author knowledge articles.',
  },

  // ============================ CMDB ============================
  {
    id: 'cmdb-read',
    module: 'cmdb', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'All IT divisions read CMDB.',
  },
  {
    id: 'cmdb-update',
    module: 'cmdb', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM owns CMDB updates (default).',
  },
  {
    id: 'cmdb-audit',
    module: 'cmdb', action: 'audit_read',
    requiredLevel: 'dept_head',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'Dept Head+ reads CMDB audit log.',
  },

  // ============================ AVAILABILITY ============================
  {
    id: 'av-read',
    module: 'availability', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read availability dashboards & SLA reports.',
  },
  {
    id: 'av-update',
    module: 'availability', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ manages SLA targets and outage records.',
  },

  // ============================ CAPACITY ============================
  {
    id: 'cap-read',
    module: 'capacity', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read capacity dashboards & forecasts.',
  },
  {
    id: 'cap-update',
    module: 'capacity', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ manages capacity thresholds.',
  },

  // ============================ TESTING ============================
  {
    id: 'test-read',
    module: 'testing', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read test plans, cases, and runs.',
  },
  {
    id: 'test-update',
    module: 'testing', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'all',
    description: 'APS officer+ creates and edits test plans, cases, and runs.',
  },
  {
    id: 'test-approve-tl',
    module: 'testing', action: 'approve',
    requiredDivisions: ['APS'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'APS Team Lead+ approves test sign-offs.',
  },
  {
    id: 'test-approve-cm',
    module: 'testing', action: 'approve',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Change Manager approves test sign-offs (cross-cutting).',
  },

  // ============================ IMPROVEMENT ============================
  {
    id: 'imp-read',
    module: 'improvement', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read improvement register.',
  },
  {
    id: 'imp-create',
    module: 'improvement', action: 'create',
    requiredDivisions: ['STA', 'IFM', 'APS'], requiredLevel: 'officer',
    scope: 'all',
    description: 'Any IT officer+ can raise an improvement initiative.',
  },
  {
    id: 'imp-update-aps',
    module: 'improvement', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS updates initiatives owned by their team (with inheritance).',
  },
  {
    id: 'imp-update-ifm',
    module: 'improvement', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'officer',
    scope: 'all',
    description: 'IFM updates any initiative.',
  },

  // ============================ RELEASE ============================
  {
    id: 'rel-read-it',
    module: 'release', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read all releases.',
  },
  {
    id: 'rel-create-aps',
    module: 'release', action: 'create',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS officer+ creates releases for own team.',
  },
  {
    id: 'rel-create-cm',
    module: 'release', action: 'create',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Change Manager creates releases on behalf of any team.',
  },
  {
    id: 'rel-update-aps',
    module: 'release', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS officer+ updates releases for own team.',
  },
  {
    id: 'rel-update-cm',
    module: 'release', action: 'update',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Change Manager updates any release.',
  },
  {
    id: 'rel-approve-tl',
    module: 'release', action: 'approve',
    requiredDivisions: ['APS'], requiredLevel: 'team_lead',
    scope: 'team_app',
    description: 'APS Team Lead+ go/no-go on releases for own team.',
  },
  {
    id: 'rel-approve-cm',
    module: 'release', action: 'approve',
    requiredFunctionalRoles: ['change_manager', 'cab_member'],
    scope: 'all',
    description: 'Change Manager / CAB Member approves releases.',
  },
  {
    id: 'rel-implement-aps',
    module: 'release', action: 'implement',
    requiredDivisions: ['APS'], requiredLevel: 'officer',
    scope: 'team_app',
    description: 'APS officer+ deploys releases for own team.',
  },
  {
    id: 'rel-implement-cm',
    module: 'release', action: 'implement',
    requiredFunctionalRoles: ['change_manager'],
    scope: 'all',
    description: 'Change Manager can deploy any release.',
  },

  // ============================ MONITORING ============================
  {
    id: 'mon-read',
    module: 'monitoring', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read monitoring rules, events, and routing.',
  },
  {
    id: 'mon-update-ifm',
    module: 'monitoring', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ manages monitoring rules and alert routing.',
  },
  {
    id: 'mon-update-aps',
    module: 'monitoring', action: 'update',
    requiredDivisions: ['APS'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'APS Team Lead+ manages monitoring rules for own apps.',
  },

  // ============================ CONTINUITY ============================
  {
    id: 'cont-read',
    module: 'continuity', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read BIA, DR plans, and DR test history.',
  },
  {
    id: 'cont-update-ifm',
    module: 'continuity', action: 'update',
    requiredDivisions: ['IFM'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'IFM Team Lead+ manages BIA entries, DR plans, and schedules DR tests.',
  },
  {
    id: 'cont-update-sta',
    module: 'continuity', action: 'update',
    requiredDivisions: ['STA'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'STA Team Lead+ updates BIA from architecture perspective.',
  },

  // ============================ MEASUREMENT ============================
  {
    id: 'meas-read',
    module: 'measurement', action: 'read',
    requiredDivisions: ['STA', 'IFM', 'APS'],
    scope: 'all',
    description: 'IT divisions read dashboards, reports, and metric catalog.',
  },
  {
    id: 'meas-author',
    module: 'measurement', action: 'author',
    requiredDivisions: ['STA', 'IFM', 'APS'], requiredLevel: 'team_lead',
    scope: 'all',
    description: 'Team Lead+ authors reports and dashboards.',
  },

  // ============================ PLATFORM ============================
  {
    id: 'plat-read',
    module: 'platform', action: 'read',
    scope: 'all',
    description: 'All authenticated users read platform settings (own profile, schedules).',
  },
  {
    id: 'plat-manage',
    module: 'platform', action: 'manage',
    requiredDivisions: ['IFM'], requiredLevel: 'dept_head',
    scope: 'all',
    description: 'IFM Dept Head+ manages on-call schedules and platform configuration.',
  },

  // ============================ ADMIN ============================
  // Note: admin/manage is gated by isSuperadmin in the engine (bypass + explicit rule).
];
