import { Change } from '../types/change';

const implementationPlanCHG091 = `## Pre-deployment

1. Verify all prerequisites met:
   - [x] Staging soak test (7 days, passed)
   - [x] PR #4421 merged (connection leak fix)
   - [x] pgbouncer instance provisioned in production VPC
   - [x] Monitoring rules updated (RULE-PAY-005 added for pgbouncer)
   - [ ] PIR holder confirmed (Sarah Chen, on standby)

2. Notify stakeholders 24h before window via email and Slack #payment-engineering.

## Implementation window (14:00–16:00 UTC)

### 14:00 — Pre-flight checks
- Verify monitoring is green (no active incidents)
- Confirm rollback automation tested
- Capture baseline metrics

### 14:10 — Deploy pgbouncer config
- Apply Terraform plan to enable pgbouncer in payment-api connection string
- Health check: pgbouncer instance reachable

### 14:20 — Rolling restart payment-api pods
- \`kubectl rollout restart deployment/payment-api -n payment\`
- Watch metrics: error rate, p95 latency, connection counts

### 14:30 — Rolling restart payment-worker pods
- Same as above for worker

### 14:40 — Validation
- Run smoke tests (10 synthetic checkout flows)
- Verify connection counts via pgbouncer admin console
- Check for any new errors in logs

### 14:50 — Observation period
- Monitor for 30 minutes
- If no anomalies, proceed to comms

### 15:30 — Comms
- Post in status page: "Performance improvements complete"
- Internal post-mortem invite for following Tuesday

## Post-deployment

- 24h follow-up health check (David)
- 7-day check-in to confirm reduced incident rate
- Update PRB-2026-00018 to closed
- Promote KB-00248 (pgbouncer runbook) from draft to published`;

const rollbackPlanCHG091 = `## Rollback triggers

Initiate rollback if any of the following occur within 30min of deployment:

- Error rate > 0.5% for >5 minutes
- p95 latency > baseline + 50%
- pgbouncer instance becomes unreachable
- Any P1/P2 incident on Payment Service

## Rollback procedure

### Option A: Config-only rollback (preferred, ~2min)
1. Revert Terraform plan: connection string back to direct DB connections
2. \`kubectl rollout restart deployment/payment-api deployment/payment-worker -n payment\`
3. Health check: services healthy on direct connections

### Option B: Full rollback to previous deployment (if Option A insufficient)
1. \`kubectl rollout undo deployment/payment-api -n payment\`
2. \`kubectl rollout undo deployment/payment-worker -n payment\`
3. Verify previous version (v2.4.0) is running
4. Health check

## Communication
- Post in #incidents and status page within 5min of rollback decision
- IC: David Okafor; Comms: Helena Vasquez`;

export const mockChanges: Change[] = [
  // ─── CHG-2026-00091 — SHOWCASE (in_review) ───────────────────────────────
  {
    id: 'chg-2026-00091',
    publicId: 'CHG-2026-00091',
    title: 'Migrate payment-api to pgbouncer connection pooling',
    description:
      'Migrate payment-api from direct DB connections to pgbouncer transaction pooling to permanently fix the recurring connection pool exhaustion pattern (PRB-2026-00018).',
    justification:
      'Recurring P1/P2 incidents on Payment Service due to DB connection pool saturation. Workaround (restart pods) effective but not scalable. pgbouncer migration is the agreed permanent fix per RCA in PRB-018.',
    type: 'normal',
    status: 'in_review',
    risk: 'medium',
    impact: 'moderate',
    riskScore: 58,
    riskFactors: [
      'Touches tier-1 production service (Payment Service)',
      'Requires brief connection drain (~30s)',
      'Permanent fix for PRB-2026-00018 (recurring issue)',
      'Well-tested in staging for 7 days',
    ],
    plannedStart: '2026-05-10T14:00:00Z',
    plannedEnd: '2026-05-10T16:00:00Z',
    implementationWindow: 'Friday May 10, 14:00–16:00 UTC',
    requesterId: 'u-004',
    requesterName: 'David Okafor',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-pay-001', 'ci-app-pay-002', 'ci-db-pay-001'],
    affectedCIPublicIds: ['CI-APP-PAY-001', 'CI-APP-PAY-002', 'CI-DB-PAY-001'],
    affectedServiceIds: ['svc-001'],
    implementationPlan: implementationPlanCHG091,
    rollbackPlan: rollbackPlanCHG091,
    testPlan:
      'Pre-deploy: 7d staging soak test (passed). Post-deploy: smoke tests + 30min observation.',
    linkedProblemIds: ['PRB-2026-00018'],
    linkedIncidentIds: ['INC-2026-00184', 'INC-2026-00156', 'INC-2026-00132', 'INC-2026-00098'],
    linkedReleaseId: 'rel-2026-00020',
    linkedReleasePublicId: 'REL-2026-00020',
    linkedKBSlugs: ['payment-pgbouncer-migration'],
    approvals: [
      {
        id: 'appr-091-001',
        changeId: 'chg-2026-00091',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'pending',
        weight: 1,
      },
      {
        id: 'appr-091-002',
        changeId: 'chg-2026-00091',
        approverId: 'u-007',
        approverName: 'Tom Bergstrom',
        approverRole: 'Service Owner',
        decision: 'approve',
        rationale: 'Necessary fix, well-prepared. Aligned with our Q2 reliability goal.',
        decidedAt: '2026-05-08T10:30:00Z',
        weight: 1,
      },
      {
        id: 'appr-091-003',
        changeId: 'chg-2026-00091',
        approverId: 'u-006',
        approverName: 'Helena Vasquez',
        approverRole: 'Release Manager',
        decision: 'pending',
        weight: 1,
      },
    ],
    conflicts: [],
    commsRequired: true,
    commsChannels: ['status_page', 'email_engineering'],
    tags: ['production', 'payment', 'pgbouncer', 'normal-change', 'friday-window'],
    createdAt: '2026-04-30T09:30:00Z',
    updatedAt: '2026-05-08T10:30:00Z',
  },

  // ─── CHG-2026-00090 — auth-service deploy (approved) ─────────────────────
  {
    id: 'chg-2026-00090',
    publicId: 'CHG-2026-00090',
    title: 'Deploy auth-service v3.1.0',
    description:
      'Rolling deploy of auth-service v3.1.0 featuring improved OAuth2 PKCE flow and session handling improvements.',
    justification:
      'v3.1.0 brings security improvements required for upcoming compliance audit and fixes a session expiry edge case.',
    type: 'normal',
    status: 'approved',
    risk: 'medium',
    impact: 'minor',
    riskScore: 45,
    riskFactors: [
      'Touches authentication critical path',
      'Rolling deploy minimizes downtime risk',
      'Well-tested in staging (142/150 tests passing)',
    ],
    plannedStart: '2026-05-10T18:00:00Z',
    plannedEnd: '2026-05-10T20:00:00Z',
    implementationWindow: 'Friday May 10, 18:00–20:00 UTC',
    requesterId: 'u-005',
    requesterName: 'Yuki Tanaka',
    ownerId: 'u-005',
    ownerName: 'Yuki Tanaka',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-auth-001'],
    affectedCIPublicIds: ['CI-APP-AUTH-001'],
    affectedServiceIds: ['svc-002'],
    implementationPlan:
      '## Steps\n1. Deploy auth-service v3.1.0 via rolling update\n2. Monitor health checks\n3. Validate OAuth flows with smoke tests\n4. Monitor for 30 minutes',
    rollbackPlan:
      '## Rollback\n1. `kubectl rollout undo deployment/auth-service -n auth`\n2. Verify v3.0.2 is running\n3. Health check',
    testPlan: 'Staging validated (142/150 tests). Post-deploy: OAuth smoke tests.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedReleaseId: 'rel-2026-00019',
    linkedReleasePublicId: 'REL-2026-00019',
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-090-001',
        changeId: 'chg-2026-00090',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        rationale: 'Security improvements required for compliance.',
        decidedAt: '2026-05-07T14:00:00Z',
        weight: 1,
      },
      {
        id: 'appr-090-002',
        changeId: 'chg-2026-00090',
        approverId: 'u-006',
        approverName: 'Helena Vasquez',
        approverRole: 'Release Manager',
        decision: 'approve',
        decidedAt: '2026-05-07T15:30:00Z',
        weight: 1,
      },
    ],
    conflicts: [
      {
        id: 'conf-090-001',
        type: 'service_overlap',
        severity: 'warning',
        description: 'Another change is scheduled on Order Service in adjacent window',
        conflictsWith: ['CHG-2026-00089'],
        detectedAt: '2026-05-08T08:00:00Z',
      },
    ],
    commsRequired: false,
    commsChannels: [],
    tags: ['auth', 'security', 'rolling-deploy'],
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-07T15:30:00Z',
  },

  // ─── CHG-2026-00089 — order-api replicas (closed_successful) ─────────────
  {
    id: 'chg-2026-00089',
    publicId: 'CHG-2026-00089',
    title: 'Increase order-api replicas from 3 to 5',
    description:
      'Scale order-api deployment from 3 to 5 replicas to handle increased traffic during upcoming product launch.',
    justification:
      'Capacity planning recommendation from SRE team based on projected launch traffic increase of 60%.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'low',
    impact: 'minimal',
    riskScore: 18,
    riskFactors: [
      'Config-only change with no code deployment',
      'Kubernetes rolling update with zero downtime',
    ],
    plannedStart: '2026-05-02T10:00:00Z',
    plannedEnd: '2026-05-02T10:30:00Z',
    actualStart: '2026-05-02T10:05:00Z',
    actualEnd: '2026-05-02T10:25:00Z',
    implementationWindow: 'Saturday May 2, 10:00–10:30 UTC',
    requesterId: 'u-004',
    requesterName: 'David Okafor',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-ord-001'],
    affectedCIPublicIds: ['CI-APP-ORD-001'],
    affectedServiceIds: ['svc-003'],
    implementationPlan:
      '## Steps\n1. Update deployment manifest: replicas 3 → 5\n2. Apply: `kubectl apply -f order-api-deployment.yaml`\n3. Monitor rollout: `kubectl rollout status deployment/order-api`\n4. Verify health checks',
    rollbackPlan:
      '## Rollback\n1. Update manifest back to 3 replicas\n2. Apply and verify',
    testPlan: 'Smoke test: 5 synthetic order flows post-scale.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-089-001',
        changeId: 'chg-2026-00089',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-05-01T16:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-089',
      changeId: 'chg-2026-00089',
      outcome: 'success',
      plannedDurationMin: 30,
      actualDurationMin: 20,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Smooth scale-out, all health checks green within 5 minutes.',
      lessonsLearned: 'Standard playbook works well for replica scaling.',
      triggeredIncidentIds: [],
      followUpActions: [],
      reviewedAt: '2026-05-03T10:00:00Z',
      reviewedBy: 'u-004',
      signedOffAt: '2026-05-03T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['order', 'scaling', 'capacity'],
    createdAt: '2026-04-28T09:00:00Z',
    updatedAt: '2026-05-02T10:25:00Z',
    closedAt: '2026-05-03T14:00:00Z',
  },

  // ─── CHG-2026-00088 — cert renewal (implemented) ─────────────────────────
  {
    id: 'chg-2026-00088',
    publicId: 'CHG-2026-00088',
    title: 'Certificate renewal for *.acme.io',
    description: 'Renew wildcard TLS certificate for *.acme.io before expiry on May 15.',
    justification: 'Certificate expires in 6 days. Standard annual renewal.',
    type: 'standard',
    status: 'implemented',
    risk: 'low',
    impact: 'minimal',
    riskScore: 8,
    riskFactors: ['Standard pre-approved change', 'Automated rollout via cert-manager'],
    plannedStart: '2026-05-07T08:00:00Z',
    plannedEnd: '2026-05-07T08:30:00Z',
    actualStart: '2026-05-07T08:02:00Z',
    actualEnd: '2026-05-07T08:22:00Z',
    implementationWindow: 'Wednesday May 7, 08:00–08:30 UTC',
    requesterId: 'u-003',
    requesterName: 'Priya Raman',
    ownerId: 'u-003',
    ownerName: 'Priya Raman',
    ownerTeamId: 't-sre',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: [],
    implementationPlan:
      '## Steps\n1. cert-manager auto-renews via ACME challenge\n2. Verify new cert issued\n3. Check expiry date',
    rollbackPlan: '## Rollback\nRevert to previous cert if renewal fails.',
    testPlan: 'Verify cert expiry date post-renewal.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['certificate', 'standard', 'security'],
    createdAt: '2026-05-06T10:00:00Z',
    updatedAt: '2026-05-07T08:22:00Z',
  },

  // ─── CHG-2026-00087 — API token rotation (approved, standard) ────────────
  {
    id: 'chg-2026-00087',
    publicId: 'CHG-2026-00087',
    title: 'Rotate API tokens for external integrations',
    description:
      'Quarterly rotation of API tokens used by external integration partners (Stripe, Twilio, SendGrid).',
    justification: 'Quarterly security rotation per compliance policy SEC-042.',
    type: 'standard',
    status: 'approved',
    risk: 'low',
    impact: 'minimal',
    riskScore: 12,
    riskFactors: ['Standard pre-approved change', 'Coordinated with integration partners'],
    plannedStart: '2026-05-12T10:00:00Z',
    plannedEnd: '2026-05-12T11:00:00Z',
    implementationWindow: 'Tuesday May 12, 10:00–11:00 UTC',
    requesterId: 'u-001',
    requesterName: 'Sarah Chen',
    ownerId: 'u-003',
    ownerName: 'Priya Raman',
    ownerTeamId: 't-sre',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-001', 'svc-002'],
    implementationPlan:
      '## Steps\n1. Generate new tokens in each provider portal\n2. Update secrets in Vault\n3. Rolling restart affected services to pick up new tokens\n4. Verify integrations functional',
    rollbackPlan: '## Rollback\nRevert Vault secrets to previous token values.',
    testPlan: 'Send test webhook/API call via each integration post-rotation.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['security', 'tokens', 'standard'],
    createdAt: '2026-05-05T09:00:00Z',
    updatedAt: '2026-05-05T09:00:00Z',
  },

  // ─── CHG-2026-00086 — Wiki DB upgrade (scheduled) ────────────────────────
  {
    id: 'chg-2026-00086',
    publicId: 'CHG-2026-00086',
    title: 'Internal Wiki maintenance window — DB upgrade',
    description:
      'Upgrade internal wiki Postgres from 14 to 16 with schema migration. Requires maintenance window.',
    justification: 'Postgres 14 reaches EOL in November 2026. Planned upgrade ahead of schedule.',
    type: 'normal',
    status: 'scheduled',
    risk: 'medium',
    impact: 'minor',
    riskScore: 42,
    riskFactors: [
      'Major version database upgrade',
      'Schema migration required',
      'Wiki unavailable during window',
    ],
    plannedStart: '2026-05-09T02:00:00Z',
    plannedEnd: '2026-05-09T04:00:00Z',
    implementationWindow: 'Thursday May 9, 02:00–04:00 UTC',
    freezeWindow: true,
    requesterId: 'u-010',
    requesterName: 'Emma Müller',
    ownerId: 'u-010',
    ownerName: 'Emma Müller',
    ownerTeamId: 't-platform',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-007'],
    implementationPlan:
      '## Steps\n1. Stop wiki application\n2. pg_upgrade: Postgres 14 → 16\n3. Run schema migrations\n4. Start wiki and verify\n5. Run smoke tests',
    rollbackPlan:
      '## Rollback\n1. Restore from pre-upgrade snapshot\n2. Restart on Postgres 14\n3. Verify data integrity',
    testPlan: 'Post-upgrade: page load, search, edit, and attachment tests.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-086-001',
        changeId: 'chg-2026-00086',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        rationale: 'Approved exception to marketing freeze — change is compliance-critical.',
        decidedAt: '2026-05-08T09:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [
      {
        id: 'conf-086-001',
        type: 'freeze_window',
        severity: 'warning',
        description: 'Scheduled during marketing campaign freeze window (May 9–11)',
        conflictsWith: [],
        detectedAt: '2026-05-07T16:00:00Z',
        resolvedAt: '2026-05-08T09:00:00Z',
        resolutionNote: 'Approved by Sarah Chen — change is critical for compliance.',
      },
    ],
    commsRequired: true,
    commsChannels: ['slack_engineering'],
    tags: ['wiki', 'database', 'postgres', 'maintenance'],
    createdAt: '2026-05-04T10:00:00Z',
    updatedAt: '2026-05-08T09:00:00Z',
  },

  // ─── CHG-2026-00085 — Emergency DDoS mitigation (implemented) ────────────
  {
    id: 'chg-2026-00085',
    publicId: 'CHG-2026-00085',
    title: 'Emergency: Block IP range from auth (DDoS mitigation)',
    description:
      'Block 185.220.0.0/16 at load balancer level following sustained DDoS targeting auth endpoints.',
    justification:
      'Active DDoS attack causing elevated error rates on auth service. Immediate IP block required.',
    type: 'emergency',
    status: 'implemented',
    risk: 'medium',
    impact: 'minor',
    riskScore: 48,
    riskFactors: [
      'Emergency change bypassing standard CAB',
      'IP block may affect legitimate users in range',
      'Coordinated with security team',
    ],
    plannedStart: '2026-05-05T03:30:00Z',
    plannedEnd: '2026-05-05T04:00:00Z',
    actualStart: '2026-05-05T03:32:00Z',
    actualEnd: '2026-05-05T03:51:00Z',
    implementationWindow: 'Monday May 5, 03:30–04:00 UTC',
    requesterId: 'u-001',
    requesterName: 'Sarah Chen',
    ownerId: 'u-009',
    ownerName: 'Roberto Silva',
    ownerTeamId: 't-network',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-002'],
    implementationPlan:
      '## Steps\n1. Add IP block rule to WAF/load balancer\n2. Verify block effective\n3. Monitor auth error rates\n4. Confirm attack subsided',
    rollbackPlan:
      '## Rollback\n1. Remove IP block rule\n2. Monitor for resumption of attack',
    testPlan: 'Confirm auth error rate returns to baseline within 5 minutes.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-085-001',
        changeId: 'chg-2026-00085',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        rationale: 'Active DDoS. Expedited approval granted.',
        decidedAt: '2026-05-05T03:30:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-085',
      changeId: 'chg-2026-00085',
      outcome: 'success',
      plannedDurationMin: 30,
      actualDurationMin: 19,
      unplannedDowntimeMin: 0,
      whatWentWell: 'IP block effective within 2 minutes. Attack subsided completely.',
      whatWentWrong: 'No proactive WAF rules existed for this subnet range.',
      lessonsLearned: 'Need proactive WAF rules for known Tor exit/DDoS ranges to prevent future reactive changes.',
      triggeredIncidentIds: [],
      followUpActions: [
        {
          description: 'Add proactive WAF block rules for known DDoS/Tor exit node ranges',
          type: 'preventive',
          owner: 'u-009',
          targetDate: '2026-05-20',
          status: 'in_progress',
        },
      ],
      reviewedAt: '2026-05-06T10:00:00Z',
      reviewedBy: 'u-001',
      signedOffAt: '2026-05-06T15:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['security', 'emergency', 'ddos', 'waf'],
    createdAt: '2026-05-05T03:30:00Z',
    updatedAt: '2026-05-05T03:51:00Z',
    closedAt: '2026-05-06T15:00:00Z',
  },

  // ─── CHG-2026-00084 — DR test (closed_successful) ────────────────────────
  {
    id: 'chg-2026-00084',
    publicId: 'CHG-2026-00084',
    title: 'Disaster recovery test — Payment Service',
    description:
      'Simulated DR failover for Payment Service to validate RTO/RPO targets.',
    justification:
      'Annual DR test required by compliance policy. Last test: May 2025.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'high',
    impact: 'major',
    riskScore: 72,
    riskFactors: [
      'Simulating actual service failure',
      'Customers may see degraded checkout during test window',
      'DR site has not been tested under full production load',
    ],
    plannedStart: '2026-04-26T02:00:00Z',
    plannedEnd: '2026-04-26T05:00:00Z',
    actualStart: '2026-04-26T02:05:00Z',
    actualEnd: '2026-04-26T04:40:00Z',
    implementationWindow: 'Sunday Apr 26, 02:00–05:00 UTC',
    requesterId: 'u-001',
    requesterName: 'Sarah Chen',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-pay-001', 'ci-db-pay-001'],
    affectedCIPublicIds: ['CI-APP-PAY-001', 'CI-DB-PAY-001'],
    affectedServiceIds: ['svc-001'],
    implementationPlan:
      '## Steps\n1. Notify stakeholders\n2. Fail over primary DB to DR replica\n3. Redirect traffic to DR region\n4. Validate checkout flows on DR\n5. Measure RTO/RPO\n6. Fail back to primary\n7. Validate',
    rollbackPlan:
      '## Rollback\nFail back to primary region immediately if DR site cannot handle load.',
    testPlan: '10 synthetic checkout flows on DR site. Measure latency vs primary.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-084-001',
        changeId: 'chg-2026-00084',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-04-22T10:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-084',
      changeId: 'chg-2026-00084',
      outcome: 'success',
      plannedDurationMin: 180,
      actualDurationMin: 155,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Failover completed in 4 minutes (RTO target: 15 min). DR site handled full load.',
      whatWentWrong: 'One monitoring alert did not fire during failover — gap in alert coverage.',
      lessonsLearned: 'DR monitoring coverage needs to be validated separately from production alerts.',
      triggeredIncidentIds: [],
      followUpActions: [
        {
          description: 'Add DR-specific monitoring rules for Payment Service',
          type: 'preventive',
          owner: 'u-004',
          targetDate: '2026-05-10',
          status: 'in_progress',
        },
        {
          description: 'Update DR runbook with alert coverage checklist',
          type: 'preventive',
          owner: 'u-005',
          targetDate: '2026-05-15',
          status: 'open',
        },
      ],
      reviewedAt: '2026-04-28T10:00:00Z',
      reviewedBy: 'u-004',
      signedOffAt: '2026-04-29T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: true,
    commsChannels: ['status_page', 'email_engineering'],
    tags: ['dr-test', 'payment', 'high-risk', 'compliance'],
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-29T14:00:00Z',
    closedAt: '2026-04-29T14:00:00Z',
  },

  // ─── CHG-2026-00080 — Kafka migration (closed_failed) ────────────────────
  {
    id: 'chg-2026-00080',
    publicId: 'CHG-2026-00080',
    title: 'Migrate analytics pipeline to new Kafka cluster',
    description:
      'Migrate analytics-pipeline to new Kafka cluster with updated partition strategy (4 → 12 partitions per topic).',
    justification:
      'New Kafka cluster provides 3x throughput improvement needed to support analytics dashboard SLA.',
    type: 'normal',
    status: 'closed_failed',
    risk: 'high',
    impact: 'major',
    riskScore: 76,
    riskFactors: [
      'Kafka partition strategy change requires consumer compatibility testing',
      'Analytics pipeline processes 2M events/day',
      'Multiple downstream consumers with different partition strategies',
    ],
    plannedStart: '2026-04-14T22:00:00Z',
    plannedEnd: '2026-04-15T02:00:00Z',
    actualStart: '2026-04-14T22:05:00Z',
    actualEnd: '2026-04-15T00:27:00Z',
    implementationWindow: 'Monday Apr 14, 22:00 – Apr 15, 02:00 UTC',
    requesterId: 'u-008',
    requesterName: 'Aisha Khan',
    ownerId: 'u-008',
    ownerName: 'Aisha Khan',
    ownerTeamId: 't-data',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-006'],
    implementationPlan:
      '## Steps\n1. Provision new Kafka cluster\n2. Create topics with new partition count\n3. Switch producer to new cluster\n4. Migrate consumers one by one\n5. Drain old cluster',
    rollbackPlan:
      '## Rollback\n1. Switch producer back to old cluster\n2. Restart consumers against old cluster\n3. Monitor for data gap',
    testPlan: 'Staging test with 100k synthetic events. Consumer lag monitoring.',
    linkedProblemIds: [],
    linkedIncidentIds: ['INC-2026-00170'],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-080-001',
        changeId: 'chg-2026-00080',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-04-10T10:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-080',
      changeId: 'chg-2026-00080',
      outcome: 'rolled_back',
      plannedDurationMin: 240,
      actualDurationMin: 142,
      unplannedDowntimeMin: 12,
      customerImpact: 'Analytics dashboards were stale for 12 minutes during rollback.',
      whatWentWell: 'Rollback procedure executed cleanly. Monitoring alerted within 3 minutes.',
      whatWentWrong:
        'Did not test downstream consumer compatibility with new partition strategy. Consumers using partition-key routing broke immediately.',
      lessonsLearned:
        'For Kafka changes, must include consumer compatibility tests in pre-deployment checklist.',
      triggeredIncidentIds: ['INC-2026-00170'],
      followUpActions: [
        {
          description: 'Add consumer compatibility test to Kafka migration release checklist',
          type: 'preventive',
          owner: 'u-006',
          targetDate: '2026-05-15',
          status: 'in_progress',
          linkedImprovementId: 'IMP-2026-00010',
        },
        {
          description: 'Document Kafka migration runbook with consumer compatibility matrix',
          type: 'preventive',
          owner: 'u-008',
          targetDate: '2026-05-20',
          status: 'open',
        },
      ],
      reviewedAt: '2026-04-15T10:00:00Z',
      reviewedBy: 'u-006',
      signedOffAt: '2026-04-16T15:30:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: true,
    commsChannels: ['status_page'],
    tags: ['analytics', 'kafka', 'migration', 'failed'],
    createdAt: '2026-04-05T10:00:00Z',
    updatedAt: '2026-04-16T15:30:00Z',
    closedAt: '2026-04-16T15:30:00Z',
  },

  // ─── CHG-2026-00075 — Postgres connection pool interim fix ────────────────
  {
    id: 'chg-2026-00075',
    publicId: 'CHG-2026-00075',
    title: 'Increase Postgres connection pool for payment-api (interim fix)',
    description:
      'Increase Postgres connection pool size from 20 to 50 as interim mitigation for PRB-2026-00018 while pgbouncer migration is planned.',
    justification:
      'Reduces frequency of pool exhaustion incidents while permanent fix (CHG-2026-00091) is being approved.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'low',
    impact: 'minimal',
    riskScore: 22,
    riskFactors: ['Config-only change', 'Increases DB connection count — within safe limits'],
    plannedStart: '2026-04-02T14:00:00Z',
    plannedEnd: '2026-04-02T14:30:00Z',
    actualStart: '2026-04-02T14:05:00Z',
    actualEnd: '2026-04-02T14:20:00Z',
    implementationWindow: 'Thursday Apr 2, 14:00–14:30 UTC',
    requesterId: 'u-004',
    requesterName: 'David Okafor',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-pay-001', 'ci-db-pay-001'],
    affectedCIPublicIds: ['CI-APP-PAY-001', 'CI-DB-PAY-001'],
    affectedServiceIds: ['svc-001'],
    implementationPlan:
      '## Steps\n1. Update POOL_SIZE env var in payment-api ConfigMap\n2. Rolling restart payment-api pods\n3. Monitor connection counts',
    rollbackPlan: '## Rollback\n1. Revert ConfigMap\n2. Rolling restart',
    testPlan: 'Monitor connection count and error rate for 30 minutes post-deploy.',
    linkedProblemIds: ['PRB-2026-00018'],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-075-001',
        changeId: 'chg-2026-00075',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-04-01T16:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-075',
      changeId: 'chg-2026-00075',
      outcome: 'success',
      plannedDurationMin: 30,
      actualDurationMin: 15,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Smooth deploy, error rate dropped immediately after pod restart.',
      lessonsLearned: 'Interim fix effective but pool still needs proper pooler solution.',
      triggeredIncidentIds: [],
      followUpActions: [],
      reviewedAt: '2026-04-03T10:00:00Z',
      reviewedBy: 'u-004',
      signedOffAt: '2026-04-03T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['payment', 'postgres', 'interim-fix'],
    createdAt: '2026-03-31T10:00:00Z',
    updatedAt: '2026-04-03T14:00:00Z',
    closedAt: '2026-04-03T14:00:00Z',
  },

  // ─── CHG-2026-00073 — Postgres storage increase (closed_successful) ───────
  {
    id: 'chg-2026-00073',
    publicId: 'CHG-2026-00073',
    title: 'Update Postgres storage from 800GB to 1TB',
    description: 'Expand payment database EBS volume from 800GB to 1TB ahead of projected capacity limit.',
    justification: 'At current growth rate, storage will hit 90% in 3 weeks. Expansion prevents emergency.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'low',
    impact: 'minimal',
    riskScore: 15,
    riskFactors: ['Online volume resize — no downtime required', 'AWS EBS resize is zero-downtime'],
    plannedStart: '2026-03-25T10:00:00Z',
    plannedEnd: '2026-03-25T11:00:00Z',
    actualStart: '2026-03-25T10:05:00Z',
    actualEnd: '2026-03-25T10:45:00Z',
    implementationWindow: 'Wednesday Mar 25, 10:00–11:00 UTC',
    requesterId: 'u-004',
    requesterName: 'David Okafor',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-db-pay-001'],
    affectedCIPublicIds: ['CI-DB-PAY-001'],
    affectedServiceIds: ['svc-001'],
    implementationPlan:
      '## Steps\n1. Modify EBS volume: 800GB → 1TB via AWS Console\n2. Online resize (no restart needed)\n3. Verify new capacity visible to OS\n4. Update monitoring threshold to 80% of 1TB',
    rollbackPlan: '## Rollback\nNot applicable (storage expansion is not reversible online).',
    testPlan: 'Verify `df -h` shows new capacity. No downtime expected.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-073-001',
        changeId: 'chg-2026-00073',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-03-24T14:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-073',
      changeId: 'chg-2026-00073',
      outcome: 'success',
      plannedDurationMin: 60,
      actualDurationMin: 40,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Online resize completed without service interruption.',
      lessonsLearned: 'Storage monitoring threshold was not updated until manually checked post-change. Add to runbook.',
      triggeredIncidentIds: [],
      followUpActions: [],
      reviewedAt: '2026-03-26T10:00:00Z',
      reviewedBy: 'u-004',
      signedOffAt: '2026-03-26T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['storage', 'database', 'payment'],
    createdAt: '2026-03-23T10:00:00Z',
    updatedAt: '2026-03-26T14:00:00Z',
    closedAt: '2026-03-26T14:00:00Z',
  },

  // ─── CHG-2026-00065 — API token rotation (closed_successful) ─────────────
  {
    id: 'chg-2026-00065',
    publicId: 'CHG-2026-00065',
    title: 'Rotate API tokens — Q1 2026',
    description: 'Q1 quarterly rotation of API tokens for external integrations.',
    justification: 'Quarterly security rotation per compliance policy SEC-042.',
    type: 'standard',
    status: 'closed_successful',
    risk: 'low',
    impact: 'minimal',
    riskScore: 8,
    riskFactors: ['Standard pre-approved change'],
    plannedStart: '2026-05-01T10:00:00Z',
    plannedEnd: '2026-05-01T11:00:00Z',
    actualStart: '2026-05-01T10:02:00Z',
    actualEnd: '2026-05-01T10:48:00Z',
    implementationWindow: 'Thursday May 1, 10:00–11:00 UTC',
    requesterId: 'u-001',
    requesterName: 'Sarah Chen',
    ownerId: 'u-003',
    ownerName: 'Priya Raman',
    ownerTeamId: 't-sre',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: [],
    implementationPlan: '## Steps\n1. Rotate tokens in provider portals\n2. Update Vault\n3. Restart services',
    rollbackPlan: '## Rollback\nRevert Vault secrets.',
    testPlan: 'Test each integration post-rotation.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [],
    conflicts: [],
    pir: {
      id: 'pir-065',
      changeId: 'chg-2026-00065',
      outcome: 'success',
      plannedDurationMin: 60,
      actualDurationMin: 46,
      unplannedDowntimeMin: 0,
      whatWentWell: 'All integrations healthy post-rotation.',
      lessonsLearned: 'Standard playbook effective.',
      triggeredIncidentIds: [],
      followUpActions: [],
      reviewedAt: '2026-05-01T12:00:00Z',
      reviewedBy: 'u-003',
      signedOffAt: '2026-05-01T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['security', 'tokens', 'standard'],
    createdAt: '2026-04-29T10:00:00Z',
    updatedAt: '2026-05-01T14:00:00Z',
    closedAt: '2026-05-01T14:00:00Z',
  },

  // ─── CHG-2026-00060 — Decommission wiki search indexer ───────────────────
  {
    id: 'chg-2026-00060',
    publicId: 'CHG-2026-00060',
    title: 'Decommission old wiki search indexer',
    description:
      'Remove deprecated Elasticsearch-based wiki search indexer. Replaced by Typesense in CHG-2026-00048.',
    justification: 'Reduces infrastructure cost by ~$120/month. Old indexer unused since Feb.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'low',
    impact: 'minimal',
    riskScore: 14,
    riskFactors: ['Decommission — destructive but reversible from snapshot', 'Unused for 3 months'],
    plannedStart: '2026-04-20T10:00:00Z',
    plannedEnd: '2026-04-20T11:00:00Z',
    actualStart: '2026-04-20T10:05:00Z',
    actualEnd: '2026-04-20T10:40:00Z',
    implementationWindow: 'Sunday Apr 20, 10:00–11:00 UTC',
    requesterId: 'u-010',
    requesterName: 'Emma Müller',
    ownerId: 'u-010',
    ownerName: 'Emma Müller',
    ownerTeamId: 't-platform',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-007'],
    implementationPlan:
      '## Steps\n1. Verify zero traffic to old indexer endpoints\n2. Snapshot Elasticsearch data\n3. Stop indexer service\n4. Terminate EC2 instance\n5. Archive snapshot to S3',
    rollbackPlan:
      '## Rollback\n1. Restore EC2 from AMI\n2. Restore Elasticsearch data from snapshot',
    testPlan: 'Verify wiki search still functional via Typesense after decommission.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-060-001',
        changeId: 'chg-2026-00060',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-04-18T10:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-060',
      changeId: 'chg-2026-00060',
      outcome: 'success',
      plannedDurationMin: 60,
      actualDurationMin: 35,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Clean decommission. Confirmed zero traffic in past 90 days via access logs.',
      lessonsLearned: 'Should decommission unused infra quarterly, not annually.',
      triggeredIncidentIds: [],
      followUpActions: [],
      reviewedAt: '2026-04-21T10:00:00Z',
      reviewedBy: 'u-010',
      signedOffAt: '2026-04-21T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['decommission', 'wiki', 'elasticsearch'],
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-04-21T14:00:00Z',
    closedAt: '2026-04-21T14:00:00Z',
  },

  // ─── CHG-2026-00055 — Node.js runtime upgrade (closed_successful) ─────────
  {
    id: 'chg-2026-00055',
    publicId: 'CHG-2026-00055',
    title: 'Upgrade Node.js runtime 18 → 20 (payment-api)',
    description:
      'Upgrade payment-api Node.js runtime from v18 LTS to v20 LTS before v18 EOL.',
    justification:
      'Node.js v18 EOL is April 2025 (already past). Security risk if not upgraded.',
    type: 'normal',
    status: 'closed_successful',
    risk: 'medium',
    impact: 'minor',
    riskScore: 38,
    riskFactors: [
      'Major runtime version bump',
      'Tested in staging for 5 days',
      'Breaking change: deprecated Buffer API removed in Node 20',
    ],
    plannedStart: '2026-04-12T14:00:00Z',
    plannedEnd: '2026-04-12T16:00:00Z',
    actualStart: '2026-04-12T14:05:00Z',
    actualEnd: '2026-04-12T15:30:00Z',
    implementationWindow: 'Sunday Apr 12, 14:00–16:00 UTC',
    requesterId: 'u-004',
    requesterName: 'David Okafor',
    ownerId: 'u-004',
    ownerName: 'David Okafor',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-pay-001'],
    affectedCIPublicIds: ['CI-APP-PAY-001'],
    affectedServiceIds: ['svc-001'],
    implementationPlan:
      '## Steps\n1. Update Dockerfile: node:18-alpine → node:20-alpine\n2. Build and test image\n3. Deploy via rolling update\n4. Monitor for 30 minutes',
    rollbackPlan:
      '## Rollback\n1. Revert Dockerfile to node:18\n2. Rebuild and deploy\n3. Verify v18 running',
    testPlan: 'Full test suite (CI passing). Post-deploy: smoke tests + 30min monitoring.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-055-001',
        changeId: 'chg-2026-00055',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'approve',
        decidedAt: '2026-04-10T10:00:00Z',
        weight: 1,
      },
    ],
    conflicts: [],
    pir: {
      id: 'pir-055',
      changeId: 'chg-2026-00055',
      outcome: 'success',
      plannedDurationMin: 120,
      actualDurationMin: 85,
      unplannedDowntimeMin: 0,
      whatWentWell: 'Smooth upgrade, no compatibility issues at runtime.',
      lessonsLearned: 'CI pipeline Dockerfile reference was not updated — caused a follow-up fix.',
      triggeredIncidentIds: [],
      followUpActions: [
        {
          description: 'Update CI pipeline Dockerfile reference to node:20-alpine',
          type: 'corrective',
          owner: 'u-004',
          targetDate: '2026-04-15',
          status: 'done',
        },
      ],
      reviewedAt: '2026-04-13T10:00:00Z',
      reviewedBy: 'u-004',
      signedOffAt: '2026-04-13T14:00:00Z',
      signedOffBy: 'u-001',
    },
    commsRequired: false,
    commsChannels: [],
    tags: ['nodejs', 'runtime', 'payment', 'security'],
    createdAt: '2026-04-07T10:00:00Z',
    updatedAt: '2026-04-13T14:00:00Z',
    closedAt: '2026-04-13T14:00:00Z',
  },

  // ─── CHG-2026-00050 — AWS account migration (cancelled) ──────────────────
  {
    id: 'chg-2026-00050',
    publicId: 'CHG-2026-00050',
    title: 'AWS account migration (analytics)',
    description:
      'Migrate analytics workloads from shared prod AWS account to dedicated analytics AWS account for cost isolation.',
    justification:
      'FinOps requirement: analytics costs need to be tracked separately from product spend.',
    type: 'normal',
    status: 'cancelled',
    risk: 'high',
    impact: 'major',
    riskScore: 78,
    riskFactors: [
      'Cross-account network configuration changes',
      'IAM permission migration',
      'Data transfer costs unknown',
    ],
    plannedStart: '2026-04-28T22:00:00Z',
    plannedEnd: '2026-04-29T04:00:00Z',
    implementationWindow: 'Monday Apr 28, 22:00 – Apr 29, 04:00 UTC',
    requesterId: 'u-008',
    requesterName: 'Aisha Khan',
    ownerId: 'u-008',
    ownerName: 'Aisha Khan',
    ownerTeamId: 't-data',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-006'],
    implementationPlan:
      '## Steps\n1. Create new analytics AWS account\n2. Set up cross-account roles\n3. Migrate S3 buckets\n4. Migrate EC2 instances\n5. Update DNS and routing',
    rollbackPlan: '## Rollback\nRevert DNS to old account endpoints.',
    testPlan: 'End-to-end pipeline test in new account before DNS cutover.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['aws', 'analytics', 'migration', 'cancelled'],
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
  },

  // ─── CHG-DRAFT-001 — OpenTelemetry tracing (draft) ───────────────────────
  {
    id: 'chg-draft-001',
    publicId: 'CHG-DRAFT-001',
    title: 'Switch to OpenTelemetry for tracing',
    description:
      'Migrate from custom proprietary tracing to OpenTelemetry SDK across all microservices.',
    justification:
      'Vendor-neutral observability. Enables integration with any OTLP-compatible backend.',
    type: 'normal',
    status: 'draft',
    risk: 'medium',
    impact: 'moderate',
    riskScore: 52,
    riskFactors: [
      'Requires code changes in 8 microservices',
      'Tracing data gap during migration window',
      'New SDK version not yet battle-tested at our scale',
    ],
    plannedStart: '2026-05-20T14:00:00Z',
    plannedEnd: '2026-05-20T18:00:00Z',
    implementationWindow: 'TBD — pending approval',
    requesterId: 'u-005',
    requesterName: 'Yuki Tanaka',
    ownerId: 'u-005',
    ownerName: 'Yuki Tanaka',
    ownerTeamId: 't-sre',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: [],
    implementationPlan: '## Draft — not yet complete',
    rollbackPlan: '## Draft — not yet complete',
    testPlan: 'End-to-end trace validation in staging.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['observability', 'opentelemetry', 'tracing', 'draft'],
    createdAt: '2026-05-07T10:00:00Z',
    updatedAt: '2026-05-07T10:00:00Z',
  },

  // ─── CHG-2026-00089 (submitted) — reuse ID for submitted showcase ─────────
  // Note: the 'submitted' status examples needed; using 89 for order-api scenario above
  // Adding two submitted changes here
  {
    id: 'chg-2026-00092',
    publicId: 'CHG-2026-00092',
    title: 'Enable HTTP/2 on order-api ingress',
    description: 'Enable HTTP/2 protocol on the order-api Kubernetes ingress to reduce latency.',
    justification: 'HTTP/2 multiplexing reduces connection overhead for high-frequency API calls.',
    type: 'normal',
    status: 'submitted',
    risk: 'low',
    impact: 'minimal',
    riskScore: 20,
    riskFactors: ['Ingress config change', 'Staging tested without issues'],
    plannedStart: '2026-05-14T10:00:00Z',
    plannedEnd: '2026-05-14T11:00:00Z',
    implementationWindow: 'Wednesday May 14, 10:00–11:00 UTC',
    requesterId: 'u-005',
    requesterName: 'Yuki Tanaka',
    ownerId: 'u-005',
    ownerName: 'Yuki Tanaka',
    ownerTeamId: 't-sre',
    affectedCIIds: ['ci-app-ord-001'],
    affectedCIPublicIds: ['CI-APP-ORD-001'],
    affectedServiceIds: ['svc-003'],
    implementationPlan:
      '## Steps\n1. Update ingress annotation: nginx.ingress.kubernetes.io/http2\n2. Apply ingress config\n3. Verify HTTP/2 negotiation via curl',
    rollbackPlan: '## Rollback\n1. Revert ingress annotation\n2. Apply',
    testPlan: 'Verify HTTP/2 via `curl --http2 -I` against order-api endpoint.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-092-001',
        changeId: 'chg-2026-00092',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'pending',
        weight: 1,
      },
    ],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['order', 'http2', 'performance'],
    createdAt: '2026-05-08T10:00:00Z',
    updatedAt: '2026-05-08T10:00:00Z',
  },
  {
    id: 'chg-2026-00093',
    publicId: 'CHG-2026-00093',
    title: 'Add Redis cache layer to product catalog API',
    description:
      'Introduce Redis caching for product catalog API to reduce DB load and improve response time.',
    justification:
      'Product catalog is read-heavy (95% reads). Redis cache expected to reduce DB queries by 70%.',
    type: 'normal',
    status: 'in_review',
    risk: 'medium',
    impact: 'moderate',
    riskScore: 44,
    riskFactors: [
      'Cache invalidation strategy needs careful implementation',
      'Redis single point of failure — add replica',
    ],
    plannedStart: '2026-05-16T10:00:00Z',
    plannedEnd: '2026-05-16T12:00:00Z',
    implementationWindow: 'Saturday May 16, 10:00–12:00 UTC',
    requesterId: 'u-011',
    requesterName: "Liam O'Connor",
    ownerId: 'u-005',
    ownerName: 'Yuki Tanaka',
    ownerTeamId: 't-sre',
    affectedCIIds: [],
    affectedCIPublicIds: [],
    affectedServiceIds: ['svc-004'],
    implementationPlan:
      '## Steps\n1. Provision Redis ElastiCache cluster\n2. Deploy updated catalog-api with cache layer\n3. Warm cache with popular items\n4. Monitor hit rate',
    rollbackPlan:
      '## Rollback\n1. Redeploy catalog-api without cache layer\n2. Terminate Redis cluster',
    testPlan: 'Load test: 1000 req/s for 5 minutes. Measure cache hit rate and DB query reduction.',
    linkedProblemIds: [],
    linkedIncidentIds: [],
    linkedKBSlugs: [],
    approvals: [
      {
        id: 'appr-093-001',
        changeId: 'chg-2026-00093',
        approverId: 'u-001',
        approverName: 'Sarah Chen',
        approverRole: 'Change Manager',
        decision: 'pending',
        weight: 1,
      },
      {
        id: 'appr-093-002',
        changeId: 'chg-2026-00093',
        approverId: 'u-007',
        approverName: 'Tom Bergstrom',
        approverRole: 'Service Owner',
        decision: 'pending',
        weight: 1,
      },
    ],
    conflicts: [],
    commsRequired: false,
    commsChannels: [],
    tags: ['catalog', 'redis', 'caching', 'performance'],
    createdAt: '2026-05-07T10:00:00Z',
    updatedAt: '2026-05-08T10:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getChangeById = (id: string) =>
  mockChanges.find((c) => c.id === id || c.publicId === id);

export const getActiveChanges = () =>
  mockChanges.filter(
    (c) =>
      !['closed_successful', 'closed_failed', 'rejected', 'cancelled'].includes(c.status),
  );

export const getUpcomingChanges = (days: number) => {
  const now = new Date('2026-05-09T00:00:00Z');
  const limit = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return mockChanges.filter((c) => {
    const start = new Date(c.plannedStart);
    return start >= now && start <= limit;
  });
};

export const getChangesByCI = (ciId: string) =>
  mockChanges.filter((c) => c.affectedCIIds.includes(ciId));

export const getChangesByProblem = (problemPublicId: string) =>
  mockChanges.filter((c) => c.linkedProblemIds.includes(problemPublicId));

export const getChangesAwaitingReview = () =>
  mockChanges.filter((c) => c.status === 'in_review');

export const getMyPendingChangeApprovals = (userId: string) =>
  mockChanges.filter(
    (c) =>
      c.status === 'in_review' &&
      c.approvals.some((a) => a.approverId === userId && a.decision === 'pending'),
  );
