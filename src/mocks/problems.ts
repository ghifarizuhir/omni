import { Problem, RCAAnalysis } from '../types/problem';

export const mockProblems: Problem[] = [
  // ─── PRB-2026-00018 — SHOWCASE ────────────────────────────────────────────
  {
    id: 'prb-2026-00018',
    publicId: 'PRB-2026-00018',
    title: 'Recurring memory pressure on payment-api',
    description:
      'payment-api has been experiencing recurring 5xx errors and 503 responses during peak load periods. Pattern detected by correlation engine after 4 incidents in 6 weeks with similar fingerprints. Root cause identified as DB connection pool exhaustion.',
    status: 'known_error',
    severity: 'P2',
    source: 'incident_pattern',
    ownerId: 'u-005',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-pay-001', 'ci-db-pay-001'],
    affectedCIPublicIds: ['CI-APP-PAY-001', 'CI-DB-PAY-001'],
    affectedServiceIds: ['svc-001'],
    relatedIncidentIds: [
      'INC-2026-00184',
      'INC-2026-00156',
      'INC-2026-00132',
      'INC-2026-00098',
    ],
    relatedIncidentCount: 4,
    firstIncidentDate: '2026-03-25T14:22:00Z',
    lastIncidentDate: '2026-05-08T08:14:00Z',
    knownError: {
      publishedAt: '2026-04-15T16:00:00Z',
      publishedBy: 'u-005',
      rootCause:
        'DB connection pool size (20) too small for peak traffic; triggers cascading 5xx when pool exhausted.',
      workaround:
        'Restart payment-worker pods to release leaked connections. Increase pool size to 50 in next deploy.',
      workaroundEffectiveness: 'partial',
      affectedVersions: 'payment-api 2.3.x and 2.4.0',
      permanentFixPlan: 'Migrate to pgbouncer pooler + retry logic',
    },
    linkedChangeIds: ['CHG-2026-00091'],
    linkedKBArticleIds: ['KB-00187'],
    tags: ['recurring', 'payment', 'p2', 'pool-exhaustion'],
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-05-08T08:22:00Z',
    rca: {
      id: 'rca-001',
      problemId: 'prb-2026-00018',
      technique: 'five_whys',
      summary:
        'Connection pool sized for steady-state traffic, not peak. Connection leaks compound the issue during spikes.',
      fiveWhys: [
        {
          level: 1,
          question: 'Why does payment-api return 5xx during peak?',
          answer: 'Application threads block waiting for a DB connection from the pool.',
        },
        {
          level: 2,
          question: 'Why are threads waiting for connections?',
          answer: 'All 20 pool connections are checked out and not being returned in time.',
        },
        {
          level: 3,
          question: 'Why are connections not returned in time?',
          answer:
            'Some connections leak when async error handlers throw; pool size is too small for peak QPS.',
        },
        {
          level: 4,
          question: 'Why is the pool size 20?',
          answer:
            'Default value from initial deployment 18 months ago, never tuned for current traffic levels.',
        },
        {
          level: 5,
          question: 'Why was it never tuned?',
          answer:
            'No load testing in CI/CD; no capacity review process for tier-1 services.',
        },
      ],
      timelineEntries: [
        {
          timestamp: '2026-03-25T14:22:00Z',
          event: 'First occurrence: INC-2026-00098',
          isContributing: false,
        },
        {
          timestamp: '2026-04-02T11:00:00Z',
          event: 'Pool exhaustion observed during marketing campaign',
          isContributing: true,
        },
        {
          timestamp: '2026-04-15T16:00:00Z',
          event: 'Workaround published as known_error',
          isContributing: false,
        },
        {
          timestamp: '2026-04-30T09:30:00Z',
          event: 'CHG-2026-00091 raised for permanent fix',
          isContributing: false,
        },
        {
          timestamp: '2026-05-08T08:14:00Z',
          event: 'Latest occurrence: INC-2026-00184',
          isContributing: false,
        },
      ],
      rootCauses: [
        'DB connection pool sized at 20 (default) is insufficient for current peak traffic of ~800 QPS.',
        'Application has connection leaks in async error paths.',
      ],
      contributingFactors: [
        'No automated load testing in CI/CD pipeline.',
        'No quarterly capacity review for tier-1 services.',
        'Monitoring alerts on pool > 80%, but cooldown 10m is too long for fast saturation events.',
      ],
      recommendedActions: [
        {
          description: 'Migrate to pgbouncer transaction-mode pooling (CHG-2026-00091)',
          type: 'corrective',
          owner: 'u-004',
          targetDate: '2026-05-15',
          status: 'in_progress',
          linkedChangeId: 'CHG-2026-00091',
        },
        {
          description: 'Fix connection leak in async error handlers (PR #4421)',
          type: 'corrective',
          owner: 'u-004',
          targetDate: '2026-05-12',
          status: 'in_progress',
        },
        {
          description: 'Add load testing stage to CI for tier-1 services',
          type: 'preventive',
          owner: 'u-001',
          targetDate: '2026-05-30',
          status: 'open',
        },
        {
          description: 'Establish quarterly capacity review process',
          type: 'preventive',
          owner: 'u-007',
          targetDate: '2026-06-30',
          status: 'open',
          linkedImprovementId: 'IMP-2026-00012',
        },
        {
          description:
            'Reduce monitoring cooldown for pool saturation rule from 10m to 2m',
          type: 'detective',
          owner: 'u-001',
          targetDate: '2026-05-10',
          status: 'done',
        },
      ],
      authorId: 'u-005',
      authorName: 'Yuki Tanaka',
      createdAt: '2026-04-15T10:00:00Z',
      updatedAt: '2026-04-30T14:30:00Z',
    } satisfies RCAAnalysis,
  },

  // ─── PRB-2026-00021 — investigating, fishbone partial ────────────────────
  {
    id: 'prb-2026-00021',
    publicId: 'PRB-2026-00021',
    title: 'Search ES cluster yellow status during high load',
    description:
      'Elasticsearch cluster transitions to yellow state during data ingestion peaks, degrading search quality for end users. Pattern observed across 3 incidents since mid-April.',
    status: 'investigating',
    severity: 'P2',
    source: 'incident_pattern',
    ownerId: 'u-008',
    ownerTeamId: 't-data',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-005'],
    relatedIncidentIds: ['INC-2026-00182'],
    relatedIncidentCount: 3,
    firstIncidentDate: '2026-04-20T10:00:00Z',
    lastIncidentDate: '2026-05-08T06:15:00Z',
    linkedChangeIds: [],
    linkedKBArticleIds: [],
    tags: ['data', 'search', 'p2', 'elasticsearch'],
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-05-08T06:30:00Z',
    rca: {
      id: 'rca-002',
      problemId: 'prb-2026-00021',
      technique: 'fishbone',
      summary: 'Investigation in progress. Multiple contributing factors suspected.',
      fishbone: {
        problem: 'ES cluster goes yellow during data ingestion peaks',
        categories: [
          {
            name: 'Technology',
            causes: [
              'Insufficient replicas',
              'Old ES version (7.10)',
              'Single-node hot tier',
            ],
          },
          {
            name: 'Process',
            causes: [
              'No staging tier in indexing pipeline',
              'Bulk reindex during business hours',
            ],
          },
          {
            name: 'People',
            causes: ['Limited ES expertise on team', 'On-call runbook outdated'],
          },
          {
            name: 'Environment',
            causes: [
              'Spot instances cause node churn',
              'Network throttling between AZs',
            ],
          },
        ],
      },
      rootCauses: [],
      contributingFactors: [],
      recommendedActions: [],
      authorId: 'u-008',
      authorName: 'Aisha Khan',
      createdAt: '2026-05-01T09:00:00Z',
      updatedAt: '2026-05-05T14:00:00Z',
    } satisfies RCAAnalysis,
  },

  // ─── PRB-2026-00019 — identified, Auth SSO EU ────────────────────────────
  {
    id: 'prb-2026-00019',
    publicId: 'PRB-2026-00019',
    title: 'Auth: SSO timeouts from EU region (intermittent)',
    description:
      'Users in the EU region intermittently experience SSO timeout errors when authenticating. Issue first reported via user tickets and confirmed by monitoring in late April.',
    status: 'identified',
    severity: 'P3',
    source: 'user_reported',
    ownerId: 'u-002',
    ownerTeamId: 't-servicedesk',
    affectedCIIds: ['ci-app-auth-001'],
    affectedCIPublicIds: ['CI-APP-AUTH-001'],
    affectedServiceIds: ['svc-002'],
    relatedIncidentIds: ['INC-2026-00181'],
    relatedIncidentCount: 2,
    firstIncidentDate: '2026-04-28T08:00:00Z',
    lastIncidentDate: '2026-05-08T05:33:00Z',
    linkedChangeIds: [],
    linkedKBArticleIds: [],
    tags: ['auth', 'p3', 'eu-region', 'sso'],
    createdAt: '2026-05-01T11:00:00Z',
    updatedAt: '2026-05-08T06:00:00Z',
  },

  // ─── PRB-2026-00017 — known_error, Order event consumer ─────────────────
  {
    id: 'prb-2026-00017',
    publicId: 'PRB-2026-00017',
    title: 'Order event consumer occasionally drops messages',
    description:
      'The order event consumer service occasionally drops in-flight Kafka messages during pod restarts and consumer group rebalancing, leading to missing order status updates.',
    status: 'known_error',
    severity: 'P3',
    source: 'incident_pattern',
    ownerId: 'u-005',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-ord-001'],
    affectedCIPublicIds: ['CI-APP-ORD-001'],
    affectedServiceIds: ['svc-003'],
    relatedIncidentIds: ['INC-2026-00170', 'INC-2026-00158'],
    relatedIncidentCount: 2,
    firstIncidentDate: '2026-04-10T09:00:00Z',
    lastIncidentDate: '2026-04-28T15:00:00Z',
    knownError: {
      publishedAt: '2026-04-20T10:00:00Z',
      publishedBy: 'u-005',
      rootCause:
        'Kafka consumer group rebalancing drops in-flight messages when pod restarts occur.',
      workaround:
        'Monitor DLQ and replay from last committed offset. Avoid rolling restarts during peak.',
      workaroundEffectiveness: 'partial',
    },
    linkedChangeIds: ['CHG-2026-00085'],
    linkedKBArticleIds: [],
    tags: ['order', 'p3', 'kafka', 'message-loss'],
    createdAt: '2026-04-15T09:00:00Z',
    updatedAt: '2026-04-30T10:00:00Z',
  },

  // ─── PRB-2026-00015 — closed, Notification SMS ───────────────────────────
  {
    id: 'prb-2026-00015',
    publicId: 'PRB-2026-00015',
    title: 'Notification Gateway: SMS rate limits hit during marketing campaigns',
    description:
      'SMS notification rate limits from the third-party gateway are breached during large marketing campaign sends, causing delayed or dropped notifications to end users.',
    status: 'closed',
    severity: 'P3',
    source: 'proactive',
    ownerId: 'u-008',
    ownerTeamId: 't-data',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-004'],
    relatedIncidentIds: ['INC-2026-00179', 'INC-2026-00148'],
    relatedIncidentCount: 2,
    linkedChangeIds: ['CHG-2026-00078'],
    linkedKBArticleIds: [],
    tags: ['notification', 'p3', 'sms', 'rate-limit'],
    closedAt: '2026-04-22T14:00:00Z',
    createdAt: '2026-04-08T10:00:00Z',
    updatedAt: '2026-04-22T14:00:00Z',
  },

  // ─── PRB-2026-00012 — fix_in_progress, CI/CD flakiness ──────────────────
  {
    id: 'prb-2026-00012',
    publicId: 'PRB-2026-00012',
    title: 'CI/CD pipeline: smoke test flakiness on staging',
    description:
      'Smoke tests on the staging environment fail intermittently during CI/CD pipeline runs, causing false negative build failures and slowing deployment velocity.',
    status: 'fix_in_progress',
    severity: 'P4',
    source: 'proactive',
    ownerId: 'u-001',
    ownerTeamId: 't-platform',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-008'],
    relatedIncidentIds: [],
    relatedIncidentCount: 0,
    linkedChangeIds: ['CHG-2026-00088'],
    linkedKBArticleIds: [],
    tags: ['infrastructure', 'p4', 'cicd', 'flaky-tests'],
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
  },

  // ─── PRB-2026-00010 — known_error, Wiki search stale ────────────────────
  {
    id: 'prb-2026-00010',
    publicId: 'PRB-2026-00010',
    title: 'Internal Wiki: search index sometimes stale',
    description:
      'Newly created or updated wiki pages are not immediately surfaced in search results. Users must wait for the scheduled reindex job before pages appear.',
    status: 'known_error',
    severity: 'P4',
    source: 'user_reported',
    ownerId: 'u-001',
    ownerTeamId: 't-platform',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-007'],
    relatedIncidentIds: [],
    relatedIncidentCount: 1,
    knownError: {
      publishedAt: '2026-03-20T10:00:00Z',
      publishedBy: 'u-001',
      rootCause:
        'Wiki search index reindex job runs every 5 minutes; newly created pages not immediately searchable.',
      workaround:
        'Wait 5 minutes for the next reindex job to run. No user action needed.',
      workaroundEffectiveness: 'full',
    },
    linkedChangeIds: [],
    linkedKBArticleIds: [],
    tags: ['wiki', 'p4', 'search'],
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
  },

  // ─── PRB-2026-00008 — closed, Analytics schema drift ────────────────────
  {
    id: 'prb-2026-00008',
    publicId: 'PRB-2026-00008',
    title: 'Analytics pipeline: schema drift not detected',
    description:
      'Upstream schema changes in event producers were not detected by the analytics ingestion pipeline, causing silent data corruption and incorrect dashboard metrics.',
    status: 'closed',
    severity: 'P3',
    source: 'audit',
    ownerId: 'u-008',
    ownerTeamId: 't-data',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-006'],
    relatedIncidentIds: ['INC-2026-00144'],
    relatedIncidentCount: 1,
    linkedChangeIds: ['CHG-2026-00070'],
    linkedKBArticleIds: [],
    tags: ['data', 'p3', 'analytics', 'schema'],
    closedAt: '2026-04-10T16:00:00Z',
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-04-10T16:00:00Z',
  },
];

export const getProblemById = (id: string): Problem | undefined =>
  mockProblems.find(p => p.id === id || p.publicId === id);

export const getKnownErrors = (): Problem[] =>
  mockProblems.filter(p => p.status === 'known_error');

export const getProblemsByCI = (ciId: string): Problem[] =>
  mockProblems.filter(
    p => p.affectedCIIds.includes(ciId) || p.affectedCIPublicIds.includes(ciId),
  );
