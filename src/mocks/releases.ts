import { Release } from '../types/release';

export const mockReleases: Release[] = [
  // ─── REL-2026-00020 — payment-api 2.4.1 (planning) — SHOWCASE ────────────
  {
    id: 'rel-2026-00020',
    publicId: 'REL-2026-00020',
    version: '2.4.1',
    name: 'Payment API connection pooling overhaul',
    description:
      '## Payment API 2.4.1\n\nPatch release introducing pgbouncer connection pooling to permanently resolve recurring DB connection exhaustion incidents on the Payment Service.',
    type: 'patch',
    status: 'planning',
    componentName: 'payment-api',
    componentRepoUrl: 'github.com/acme-corp/payment-api',
    componentCIPublicId: 'CI-APP-PAY-001',
    composition: {
      changes: [
        {
          publicId: 'CHG-2026-00091',
          title: 'Migrate payment-api to pgbouncer connection pooling',
          type: 'normal',
          risk: 'medium',
        },
      ],
      problemsFixed: [
        {
          publicId: 'PRB-2026-00018',
          title: 'Recurring memory pressure on payment-api',
        },
      ],
      incidentsResolved: [
        { publicId: 'INC-2026-00184', title: 'Payment Service: 5xx error rate elevated' },
        { publicId: 'INC-2026-00156', title: 'Payment Service total outage' },
        { publicId: 'INC-2026-00132', title: 'Payment API timeouts during AM peak' },
        { publicId: 'INC-2026-00098', title: 'Payment API 5xx errors during launch' },
      ],
      prerequisites: [
        { type: 'manual_step', reference: 'Provision pgbouncer in production VPC', status: 'met' },
        { type: 'manual_step', reference: '7-day staging soak test', status: 'met' },
        { type: 'change', reference: 'CHG-2026-00091 (CAB approval)', status: 'pending' },
      ],
    },
    plannedReleaseDate: '2026-05-10T14:00:00Z',
    stages: [
      {
        id: 'rs-rel20-1',
        environment: 'development',
        status: 'pending',
        postDeployHealthCheck: 'pending',
        approvalRequired: false,
      },
      {
        id: 'rs-rel20-2',
        environment: 'staging',
        status: 'pending',
        postDeployHealthCheck: 'pending',
        approvalRequired: false,
      },
      {
        id: 'rs-rel20-3',
        environment: 'production',
        status: 'pending',
        postDeployHealthCheck: 'pending',
        approvalRequired: true,
        approverId: 'u-006',
      },
    ],
    currentStageIndex: 0,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-ch-mobile',
    releaseNotes: `## Payment API 2.4.1

### What's new
- **Connection pooling overhaul**: Migrated from direct DB connections to pgbouncer transaction pooling, dramatically reducing connection pressure during peak traffic.

### Resolved issues
- Eliminated recurring 5xx errors during peak load (4 incidents over 6 weeks)
- Improved checkout reliability — no expected user-facing impact

### Technical changes
- Connection pool now managed by pgbouncer (transaction mode)
- Application no longer manages DB connection pool directly
- Removed legacy retry logic (now handled by pgbouncer)

### Known issues
- None at release time

### Migration notes
- Brief 30-second connection drain during deployment
- Status page will be updated during deployment window`,
    internalNotes: 'See PIR for CHG-2026-00091 after deployment.',
    linkedDeploymentIds: [],
    linkedTestRunIds: [],
    linkedKBSlugs: ['payment-pgbouncer-migration'],
    featureFlags: [],
    tags: ['payment', 'pgbouncer', 'patch', 'pci-scope'],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-08T10:30:00Z',
  },

  // ─── REL-2026-00019 — auth-service 3.1.0 (in_validation) ─────────────────
  {
    id: 'rel-2026-00019',
    publicId: 'REL-2026-00019',
    version: '3.1.0',
    name: 'Auth Service OAuth2 PKCE improvements',
    description:
      'Minor release with security improvements to OAuth2 PKCE flow and session handling.',
    type: 'minor',
    status: 'in_validation',
    componentName: 'auth-service',
    componentRepoUrl: 'github.com/acme-corp/auth-service',
    componentCIPublicId: 'CI-APP-AUTH-001',
    composition: {
      changes: [
        {
          publicId: 'CHG-2026-00090',
          title: 'Deploy auth-service v3.1.0',
          type: 'normal',
          risk: 'medium',
        },
      ],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [
        { type: 'manual_step', reference: 'Security review completed', status: 'met' },
        { type: 'change', reference: 'CHG-2026-00090 (CAB approved)', status: 'met' },
      ],
    },
    plannedReleaseDate: '2026-05-10T18:00:00Z',
    stages: [
      {
        id: 'rs-rel19-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-05-08T10:00:00Z',
        completedAt: '2026-05-08T10:30:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 150,
        testsTotal: 150,
        deploymentPublicId: 'DEP-2026-00041',
      },
      {
        id: 'rs-rel19-2',
        environment: 'staging',
        status: 'in_progress',
        startedAt: '2026-05-09T08:00:00Z',
        postDeployHealthCheck: 'pending',
        approvalRequired: false,
        testsPassed: 142,
        testsTotal: 150,
        deploymentPublicId: 'DEP-2026-00042',
      },
      {
        id: 'rs-rel19-3',
        environment: 'production',
        status: 'pending',
        postDeployHealthCheck: 'pending',
        approvalRequired: true,
        approverId: 'u-006',
      },
    ],
    currentStageIndex: 1,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-ch-mobile',
    releaseNotes: `## Auth Service 3.1.0

### What's new
- Improved OAuth2 PKCE flow with enhanced code verifier validation
- Session refresh tokens now support sliding window expiry

### Security improvements
- Removed deprecated implicit grant flow support
- Added PKCE enforcement for all public clients

### Bug fixes
- Fixed session expiry edge case when timezone offset crosses midnight

### Known issues
- None`,
    linkedDeploymentIds: ['DEP-2026-00041', 'DEP-2026-00042'],
    linkedTestRunIds: ['TST-2026-00018'],
    linkedKBSlugs: [],
    featureFlags: [
      {
        key: 'auth.pkce_strict_mode',
        description: 'Enforce PKCE for all OAuth2 authorization requests',
        enabledByDefault: false,
        targeting: 'team-platform only initially',
      },
    ],
    tags: ['auth', 'oauth2', 'security', 'minor'],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-09T08:00:00Z',
  },

  // ─── REL-2026-00018 — order-api 3.1.0 (ready) ────────────────────────────
  {
    id: 'rel-2026-00018',
    publicId: 'REL-2026-00018',
    version: '3.1.0',
    name: 'Order API performance improvements',
    description:
      'Minor release with performance improvements and dependency upgrades for order-api.',
    type: 'minor',
    status: 'ready',
    componentName: 'order-api',
    componentRepoUrl: 'github.com/acme-corp/order-api',
    componentCIPublicId: 'CI-APP-ORD-001',
    composition: {
      changes: [
        {
          publicId: 'CHG-2026-00089',
          title: 'Increase order-api replicas from 3 to 5',
          type: 'normal',
          risk: 'low',
        },
      ],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [
        { type: 'manual_step', reference: 'Load test in staging passed', status: 'met' },
        { type: 'change', reference: 'CHG-2026-00089 (completed)', status: 'met' },
      ],
    },
    plannedReleaseDate: '2026-05-11T14:00:00Z',
    stages: [
      {
        id: 'rs-rel18-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-05-07T10:00:00Z',
        completedAt: '2026-05-07T10:45:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 210,
        testsTotal: 210,
        deploymentPublicId: 'DEP-2026-00039',
      },
      {
        id: 'rs-rel18-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-05-08T10:00:00Z',
        completedAt: '2026-05-08T10:45:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 210,
        testsTotal: 210,
        deploymentPublicId: 'DEP-2026-00040',
      },
      {
        id: 'rs-rel18-3',
        environment: 'production',
        status: 'pending',
        postDeployHealthCheck: 'pending',
        approvalRequired: true,
        approverId: 'u-006',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-ch-mobile',
    releaseNotes: `## Order API 3.1.0

### What's new
- Scaled to 5 replicas for improved capacity during peak traffic
- Upgraded dependencies: express 4.18 → 4.19, pg 8.10 → 8.11

### Performance
- p95 latency improved by 12% in load tests

### Known issues
- None`,
    linkedDeploymentIds: ['DEP-2026-00039', 'DEP-2026-00040'],
    linkedTestRunIds: ['TST-2026-00016', 'TST-2026-00017'],
    linkedKBSlugs: [],
    featureFlags: [],
    tags: ['order', 'minor', 'performance'],
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-08T10:45:00Z',
  },

  // ─── REL-2026-00017 — auth-service 2.8.1 (released) ─────────────────────
  {
    id: 'rel-2026-00017',
    publicId: 'REL-2026-00017',
    version: '2.8.1',
    name: 'Auth Service security patch',
    description: 'Patch release addressing a session token vulnerability and minor bug fixes.',
    type: 'patch',
    status: 'released',
    componentName: 'auth-service',
    componentRepoUrl: 'github.com/acme-corp/auth-service',
    componentCIPublicId: 'CI-APP-AUTH-001',
    composition: {
      changes: [],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [],
    },
    plannedReleaseDate: '2026-05-02T14:00:00Z',
    actualReleaseDate: '2026-05-02T14:22:00Z',
    stages: [
      {
        id: 'rs-rel17-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-05-01T08:00:00Z',
        completedAt: '2026-05-01T08:30:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 148,
        testsTotal: 148,
        deploymentPublicId: 'DEP-2026-00035',
      },
      {
        id: 'rs-rel17-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-05-01T10:00:00Z',
        completedAt: '2026-05-01T10:45:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 148,
        testsTotal: 148,
        deploymentPublicId: 'DEP-2026-00036',
      },
      {
        id: 'rs-rel17-3',
        environment: 'production',
        status: 'success',
        startedAt: '2026-05-02T14:00:00Z',
        completedAt: '2026-05-02T14:22:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: true,
        approverId: 'u-006',
        approvedAt: '2026-05-02T13:50:00Z',
        deploymentPublicId: 'DEP-2026-00037',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-ch-mobile',
    releaseNotes: `## Auth Service 2.8.1

### Security
- Fixed session token storage to comply with new compliance requirements
- Tokens now stored encrypted at rest

### Bug fixes
- Fixed rate limit header parsing for IPv6 clients`,
    linkedDeploymentIds: ['DEP-2026-00035', 'DEP-2026-00036', 'DEP-2026-00037'],
    linkedTestRunIds: ['TST-2026-00014'],
    linkedKBSlugs: [],
    featureFlags: [],
    tags: ['auth', 'security', 'patch', 'compliance'],
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-05-02T14:22:00Z',
  },

  // ─── REL-2026-00016 — notification-gw 1.5.2 (released, 1d ago) ───────────
  {
    id: 'rel-2026-00016',
    publicId: 'REL-2026-00016',
    version: '1.5.2',
    name: 'Notification Gateway SMS improvements',
    description: 'Patch release improving SMS delivery reliability for international numbers.',
    type: 'patch',
    status: 'released',
    componentName: 'notification-gw',
    componentRepoUrl: 'github.com/acme-corp/notification-gw',
    composition: {
      changes: [],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [],
    },
    plannedReleaseDate: '2026-05-08T14:00:00Z',
    actualReleaseDate: '2026-05-08T14:18:00Z',
    stages: [
      {
        id: 'rs-rel16-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-05-07T08:00:00Z',
        completedAt: '2026-05-07T08:25:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 95,
        testsTotal: 95,
        deploymentPublicId: 'DEP-2026-00032',
      },
      {
        id: 'rs-rel16-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-05-07T10:00:00Z',
        completedAt: '2026-05-07T10:35:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 95,
        testsTotal: 95,
        deploymentPublicId: 'DEP-2026-00033',
      },
      {
        id: 'rs-rel16-3',
        environment: 'production',
        status: 'success',
        startedAt: '2026-05-08T14:00:00Z',
        completedAt: '2026-05-08T14:18:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: true,
        approverId: 'u-006',
        approvedAt: '2026-05-08T13:45:00Z',
        deploymentPublicId: 'DEP-2026-00034',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-core-loan',
    releaseNotes: `## notification-gw 1.5.2

### What's new
- Improved SMS delivery reliability for international numbers
- Added support for emoji in notification subject lines

### Bug fixes
- Fixed rate-limit handling for Twilio responses
- Fixed timezone display in scheduled notifications

### Known issues
- None`,
    linkedDeploymentIds: ['DEP-2026-00032', 'DEP-2026-00033', 'DEP-2026-00034'],
    linkedTestRunIds: ['TST-2026-00013'],
    linkedKBSlugs: [],
    featureFlags: [
      {
        key: 'notif.rich_content_sms',
        description: 'Enable rich content formatting for SMS notifications',
        enabledByDefault: false,
        targeting: '10% rollout',
      },
    ],
    tags: ['notification', 'sms', 'patch'],
    createdAt: '2026-05-05T10:00:00Z',
    updatedAt: '2026-05-08T14:18:00Z',
  },

  // ─── REL-2026-00015 — payment-api 2.4.0 (released, 14d ago) ─────────────
  {
    id: 'rel-2026-00015',
    publicId: 'REL-2026-00015',
    version: '2.4.0',
    name: 'Payment API connection pool interim fix',
    description: 'Patch release with interim connection pool size increase (pool 20 → 50).',
    type: 'patch',
    status: 'released',
    componentName: 'payment-api',
    componentRepoUrl: 'github.com/acme-corp/payment-api',
    componentCIPublicId: 'CI-APP-PAY-001',
    composition: {
      changes: [
        {
          publicId: 'CHG-2026-00075',
          title: 'Increase Postgres connection pool for payment-api (interim fix)',
          type: 'normal',
          risk: 'low',
        },
      ],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [],
    },
    plannedReleaseDate: '2026-04-25T14:00:00Z',
    actualReleaseDate: '2026-04-25T14:15:00Z',
    stages: [
      {
        id: 'rs-rel15-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-04-24T10:00:00Z',
        completedAt: '2026-04-24T10:30:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 120,
        testsTotal: 120,
        deploymentPublicId: 'DEP-2026-00028',
      },
      {
        id: 'rs-rel15-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-04-24T14:00:00Z',
        completedAt: '2026-04-24T14:35:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 120,
        testsTotal: 120,
        deploymentPublicId: 'DEP-2026-00029',
      },
      {
        id: 'rs-rel15-3',
        environment: 'production',
        status: 'success',
        startedAt: '2026-04-25T14:00:00Z',
        completedAt: '2026-04-25T14:15:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: true,
        approverId: 'u-006',
        approvedAt: '2026-04-25T13:50:00Z',
        deploymentPublicId: 'DEP-2026-00030',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-ch-mobile',
    releaseNotes: `## Payment API 2.4.0

### Changes
- Increased DB connection pool size from 20 to 50 (interim fix for recurring pool exhaustion)

### Notes
- Permanent fix (pgbouncer migration) planned for 2.4.1`,
    linkedDeploymentIds: ['DEP-2026-00028', 'DEP-2026-00029', 'DEP-2026-00030'],
    linkedTestRunIds: [],
    linkedKBSlugs: [],
    featureFlags: [],
    tags: ['payment', 'patch', 'interim'],
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-04-25T14:15:00Z',
  },

  // ─── REL-2026-00014 — search-service 4.2.0 (rolled_back) ─────────────────
  {
    id: 'rel-2026-00014',
    publicId: 'REL-2026-00014',
    version: '4.2.0',
    name: 'Search Service Typesense upgrade',
    description: 'Minor release upgrading search indexing to Typesense v0.25 with new ranking model.',
    type: 'minor',
    status: 'rolled_back',
    componentName: 'search-service',
    componentRepoUrl: 'github.com/acme-corp/search-service',
    composition: {
      changes: [],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [],
    },
    plannedReleaseDate: '2026-05-04T14:00:00Z',
    actualReleaseDate: '2026-05-04T14:20:00Z',
    stages: [
      {
        id: 'rs-rel14-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-05-03T10:00:00Z',
        completedAt: '2026-05-03T10:30:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 88,
        testsTotal: 88,
        deploymentPublicId: 'DEP-2026-00025',
      },
      {
        id: 'rs-rel14-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-05-03T14:00:00Z',
        completedAt: '2026-05-03T14:40:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 88,
        testsTotal: 88,
        deploymentPublicId: 'DEP-2026-00026',
      },
      {
        id: 'rs-rel14-3',
        environment: 'production',
        status: 'rolled_back',
        startedAt: '2026-05-04T14:00:00Z',
        completedAt: '2026-05-04T15:22:00Z',
        postDeployHealthCheck: 'failed',
        approvalRequired: true,
        approverId: 'u-006',
        approvedAt: '2026-05-04T13:45:00Z',
        deploymentPublicId: 'DEP-2026-00027',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-core-loan',
    releaseNotes: `## Search Service 4.2.0

### What's new
- Upgraded to Typesense v0.25 with improved BM25 ranking
- Added faceted search support for product catalog

### Known issues
- **ROLLED BACK**: New ranking model caused relevance degradation in production. Investigating.`,
    internalNotes: 'Rolled back after INC-2026-00148. New ranking model not compatible with production data shape.',
    linkedDeploymentIds: ['DEP-2026-00025', 'DEP-2026-00026', 'DEP-2026-00027'],
    linkedTestRunIds: [],
    linkedKBSlugs: [],
    featureFlags: [],
    tags: ['search', 'typesense', 'minor', 'rollback'],
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-05-04T15:22:00Z',
  },

  // ─── REL-2026-00013 — analytics-pipeline 2.0.0 (rolled_back) ─────────────
  {
    id: 'rel-2026-00013',
    publicId: 'REL-2026-00013',
    version: '2.0.0',
    name: 'Analytics Pipeline Kafka migration',
    description: 'Major release migrating analytics pipeline to new Kafka cluster with 12-partition topics.',
    type: 'major',
    status: 'rolled_back',
    componentName: 'analytics-pipeline',
    componentRepoUrl: 'github.com/acme-corp/analytics-pipeline',
    composition: {
      changes: [
        {
          publicId: 'CHG-2026-00080',
          title: 'Migrate analytics pipeline to new Kafka cluster',
          type: 'normal',
          risk: 'high',
        },
      ],
      problemsFixed: [],
      incidentsResolved: [],
      prerequisites: [
        { type: 'manual_step', reference: 'New Kafka cluster provisioned', status: 'met' },
        { type: 'manual_step', reference: 'Consumer compatibility test', status: 'blocked' },
      ],
    },
    plannedReleaseDate: '2026-04-14T22:00:00Z',
    actualReleaseDate: '2026-04-14T22:20:00Z',
    stages: [
      {
        id: 'rs-rel13-1',
        environment: 'development',
        status: 'success',
        startedAt: '2026-04-12T10:00:00Z',
        completedAt: '2026-04-12T10:45:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 60,
        testsTotal: 60,
        deploymentPublicId: 'DEP-2026-00020',
      },
      {
        id: 'rs-rel13-2',
        environment: 'staging',
        status: 'success',
        startedAt: '2026-04-13T10:00:00Z',
        completedAt: '2026-04-13T10:50:00Z',
        postDeployHealthCheck: 'healthy',
        approvalRequired: false,
        testsPassed: 58,
        testsTotal: 60,
        deploymentPublicId: 'DEP-2026-00021',
      },
      {
        id: 'rs-rel13-3',
        environment: 'production',
        status: 'rolled_back',
        startedAt: '2026-04-14T22:00:00Z',
        completedAt: '2026-04-15T00:27:00Z',
        postDeployHealthCheck: 'failed',
        approvalRequired: true,
        approverId: 'u-006',
        approvedAt: '2026-04-14T21:45:00Z',
        deploymentPublicId: 'DEP-2026-00022',
      },
    ],
    currentStageIndex: 2,
    releaseManagerId: 'u-006',
    releaseManagerName: 'Helena Vasquez',
    ownerTeamId: 'team-data-dwh',
    releaseNotes: `## Analytics Pipeline 2.0.0

### What's new
- Migrated to new Kafka cluster with 12-partition topics for 3x throughput

### ROLLED BACK
This release was rolled back after consumers broke on new partition strategy.
See PIR for CHG-2026-00080.`,
    internalNotes: 'Downstream consumers used partition-key routing incompatible with 12-partition layout.',
    linkedDeploymentIds: ['DEP-2026-00020', 'DEP-2026-00021', 'DEP-2026-00022'],
    linkedTestRunIds: [],
    linkedKBSlugs: [],
    featureFlags: [],
    tags: ['analytics', 'kafka', 'major', 'rollback'],
    createdAt: '2026-04-08T10:00:00Z',
    updatedAt: '2026-04-16T15:30:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getReleaseById = (id: string) =>
  mockReleases.find((r) => r.id === id || r.publicId === id);

export const getActiveReleases = () =>
  mockReleases.filter(
    (r) => !['released', 'rolled_back', 'cancelled'].includes(r.status),
  );

export const getReleasesByComponent = (component: string) =>
  mockReleases.filter((r) => r.componentName === component);
