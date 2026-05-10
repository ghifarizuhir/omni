import {
  AiSession,
  AiDraftCIPayload,
  AiDraftKBPayload,
  AiQueryResultCIPayload,
} from '../types/ai';

// ============================================================
// Session 1 — CMDB Audit Session
// ============================================================

const draftCIPayload: AiDraftCIPayload = {
  kind: 'draft_ci',
  draftStatus: 'pending',
  publicId: 'CI-APP-PROD-042',
  name: 'checkout-service-prod',
  type: 'application',
  status: 'active',
  environment: 'production',
  criticality: 'critical',
  ownerTeamId: 'team-platform',
  ownerId: 'user-001',
  tags: ['checkout', 'payments', 'production'],
  attributes: {
    kind: 'application',
    version: '3.1.4',
    language: 'Node.js 20',
    port: 8080,
    healthCheckPath: '/health',
    repoUrl: 'https://github.com/acme/checkout-service',
  },
  relationships: [
    {
      type: 'depends_on',
      targetCiPublicId: 'CI-DB-PROD-007',
      targetCiName: 'checkout-postgres-prod',
      addedByUser: false,
    },
    {
      type: 'runs_on',
      targetCiPublicId: 'CI-SRV-PROD-012',
      targetCiName: 'app-node-prod-12',
      addedByUser: false,
    },
  ],
  pendingSuggestions: [
    {
      id: 'sug-001',
      text: 'Link to the Payment Gateway endpoint (CI-END-PROD-003) via depends_on?',
      actionType: 'add_relationship',
      actionPayload: {
        type: 'depends_on',
        targetCiPublicId: 'CI-END-PROD-003',
        targetCiName: 'payment-gateway-endpoint',
      },
    },
    {
      id: 'sug-002',
      text: 'Set the load balancer relationship to CI-LB-PROD-001 via part_of?',
      actionType: 'add_relationship',
      actionPayload: {
        type: 'part_of',
        targetCiPublicId: 'CI-LB-PROD-001',
        targetCiName: 'checkout-alb-prod',
      },
    },
  ],
};

const queryResultCIPayload: AiQueryResultCIPayload = {
  kind: 'query_result_ci',
  query: 'Show me all critical production applications with open incidents',
  totalFound: 2,
  items: [
    {
      publicId: 'CI-DB-PAY-001',
      name: 'pay-postgres-primary',
      type: 'database',
      health: 'degraded',
      criticality: 'critical',
      openIncidentCount: 1,
      detailUrl: '/cmdb/CI-DB-PAY-001',
    },
    {
      publicId: 'CI-APP-ORD-001',
      name: 'order-api',
      type: 'application',
      health: 'degraded',
      criticality: 'high',
      openIncidentCount: 1,
      detailUrl: '/cmdb/CI-APP-ORD-001',
    },
  ],
  timestamp: '2026-05-10T09:15:00Z',
};

const session1: AiSession = {
  id: 'ai-sess-001',
  domain: 'cmdb',
  title: 'CMDB Audit — Add checkout-service CI',
  createdAt: '2026-05-10T09:00:00Z',
  updatedAt: '2026-05-10T09:20:00Z',
  draftsPending: 1,
  draftsConfirmed: 0,
  messages: [
    {
      id: 'msg-001-01',
      sessionId: 'ai-sess-001',
      role: 'ai',
      createdAt: '2026-05-10T09:00:05Z',
      text: "Hello! I'm your CMDB assistant. I can help you add, update, or query configuration items. What would you like to do today?",
      contentType: 'text',
    },
    {
      id: 'msg-001-02',
      sessionId: 'ai-sess-001',
      role: 'user',
      createdAt: '2026-05-10T09:01:00Z',
      text: 'I need to add a new CI for the checkout service in production. It runs on Node.js and connects to our Postgres database.',
      contentType: 'text',
    },
    {
      id: 'msg-001-03',
      sessionId: 'ai-sess-001',
      role: 'ai',
      createdAt: '2026-05-10T09:01:15Z',
      text: "I've drafted a CI for the checkout service based on your description. Please review the details below and confirm or make changes.",
      contentType: 'draft_ci',
      contentPayload: draftCIPayload,
    },
    {
      id: 'msg-001-04',
      sessionId: 'ai-sess-001',
      role: 'user',
      createdAt: '2026-05-10T09:10:00Z',
      text: 'Looks good. Can you also show me all critical production apps that have open incidents right now?',
      contentType: 'text',
    },
    {
      id: 'msg-001-05',
      sessionId: 'ai-sess-001',
      role: 'ai',
      createdAt: '2026-05-10T09:10:30Z',
      text: 'Here are the critical production applications with open incidents:',
      contentType: 'query_result_ci',
      contentPayload: queryResultCIPayload,
    },
  ],
};

// ============================================================
// Session 2 — Incident RCA Session
// ============================================================

const session2: AiSession = {
  id: 'ai-sess-002',
  domain: 'incident',
  title: 'Incident RCA — INC-2024-0892',
  createdAt: '2026-05-09T14:30:00Z',
  updatedAt: '2026-05-09T14:35:00Z',
  draftsPending: 1,
  draftsConfirmed: 0,
  messages: [
    {
      id: 'msg-002-01',
      sessionId: 'ai-sess-002',
      role: 'ai',
      createdAt: '2026-05-09T14:30:10Z',
      text: 'I\'m preparing a root cause analysis draft for INC-2024-0892. This feature is coming soon.',
      contentType: 'draft_placeholder',
    },
  ],
};

// ============================================================
// Session 3 — Knowledge Base Session
// ============================================================

const draftKBPayload: AiDraftKBPayload = {
  kind: 'draft_kb',
  draftStatus: 'confirmed',
  title: 'Checkout Service — Database Connection Pool Exhaustion Runbook',
  category: 'Runbooks',
  tags: ['checkout', 'postgres', 'connection-pool', 'production', 'runbook'],
  relatedCiPublicIds: ['CI-APP-PROD-042', 'CI-DB-PROD-007'],
  sections: [
    {
      heading: 'Overview',
      body: 'This runbook covers the steps to diagnose and resolve connection pool exhaustion on the checkout-service Postgres database in production.',
    },
    {
      heading: 'Symptoms',
      body: 'Users see checkout failures with "connection timeout" errors. The checkout-service emits `pg.pool.waitingCount > 50` metric alerts. Error rate in Grafana spikes above 5%.',
    },
    {
      heading: 'Diagnosis',
      body: '1. Check pool metrics: `SELECT count(*) FROM pg_stat_activity WHERE datname = \'checkout\';`\n2. Identify long-running queries: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = \'active\' ORDER BY duration DESC LIMIT 10;`\n3. Review recent deploys in the Release module for any ORM config changes.',
    },
    {
      heading: 'Resolution',
      body: '1. If long-running queries exist, terminate them with `SELECT pg_terminate_backend(pid);`\n2. Restart the checkout-service pod to reset client-side pool: `kubectl rollout restart deployment/checkout-service -n production`\n3. If issue persists, scale Postgres read replicas and update pool config `max: 20 → 40`.',
    },
    {
      heading: 'Prevention',
      body: 'Set pool monitoring alert at `waitingCount > 20` (warning) and `> 50` (critical). Schedule quarterly review of pool sizing against traffic growth.',
    },
  ],
  pendingSuggestions: [],
};

const session3: AiSession = {
  id: 'ai-sess-003',
  domain: 'knowledge_base',
  title: 'KB Draft — Checkout DB Connection Pool Runbook',
  createdAt: '2026-05-10T08:00:00Z',
  updatedAt: '2026-05-10T08:12:00Z',
  draftsPending: 0,
  draftsConfirmed: 1,
  messages: [
    {
      id: 'msg-003-01',
      sessionId: 'ai-sess-003',
      role: 'ai',
      createdAt: '2026-05-10T08:00:05Z',
      text: "Hello! I can help you create or update knowledge base articles. What topic would you like to document?",
      contentType: 'text',
    },
    {
      id: 'msg-003-02',
      sessionId: 'ai-sess-003',
      role: 'user',
      createdAt: '2026-05-10T08:01:00Z',
      text: 'Write a runbook for the checkout service Postgres connection pool exhaustion issue we had last week.',
      contentType: 'text',
    },
    {
      id: 'msg-003-03',
      sessionId: 'ai-sess-003',
      role: 'ai',
      createdAt: '2026-05-10T08:01:30Z',
      text: "I've drafted a runbook based on the incident history and CI relationships for the checkout service. It's been confirmed and saved to the Knowledge Base.",
      contentType: 'draft_kb',
      contentPayload: draftKBPayload,
    },
  ],
};

// ============================================================
// Exports
// ============================================================

export const mockAiSessions: AiSession[] = [session1, session2, session3];

export const getSessionById = (id: string): AiSession | undefined =>
  mockAiSessions.find(s => s.id === id);

export const getActiveSession = (): AiSession | undefined =>
  [...mockAiSessions].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];
