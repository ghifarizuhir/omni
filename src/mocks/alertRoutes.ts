import { AlertRoute } from '../types/monitoring';

export const mockAlertRoutes: AlertRoute[] = [
  {
    id: 'ar-001',
    publicId: 'ROUTE-CRITICAL-PROD',
    name: 'Critical — Production',
    description: 'High priority alerts for production systems',
    matchExpression: {
      severities: ['P1', 'P2'],
      tags: ['production'],
    },
    channels: ['email', 'slack', 'sms', 'in_app'],
    recipients: [
      { id: 'rec-001', type: 'oncall_schedule', targetId: 'oncall-platform', targetName: 'Platform On-Call' }
    ],
    escalationSteps: [
      {
        id: 'esc-001',
        delayMinutes: 0,
        recipients: [{ id: 'rec-001', type: 'oncall_schedule', targetId: 'oncall-platform', targetName: 'Platform On-Call' }],
        channels: ['sms', 'in_app']
      },
      {
        id: 'esc-002',
        delayMinutes: 15,
        recipients: [{ id: 'rec-002', type: 'team', targetId: 't-sre', targetName: 'SRE Team' }],
        channels: ['slack', 'in_app']
      },
      {
        id: 'esc-003',
        delayMinutes: 30,
        recipients: [{ id: 'rec-003', type: 'team', targetId: 't-platform', targetName: 'Platform Engineering' }],
        channels: ['email', 'slack']
      }
    ],
    enabled: true,
    ruleCount: 4,
    lastTriggeredAt: '2026-05-08T15:09:00Z',
    lastTriggeredRuleId: 'RULE-PAY-001',
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'ar-002',
    publicId: 'ROUTE-DATA-OPS',
    name: 'Data Platform — Ops',
    description: 'Alerts for data pipelines and analytics systems',
    matchExpression: {
      tags: ['team-data'],
    },
    channels: ['slack', 'email', 'in_app'],
    recipients: [
      { id: 'rec-004', type: 'team', targetId: 't-data', targetName: 'Data Platform' }
    ],
    escalationSteps: [
      {
        id: 'esc-004',
        delayMinutes: 0,
        recipients: [{ id: 'rec-004', type: 'team', targetId: 't-data', targetName: 'Data Platform' }],
        channels: ['slack', 'in_app']
      },
      {
        id: 'esc-005',
        delayMinutes: 30,
        recipients: [{ id: 'rec-005', type: 'user', targetId: 'u-008', targetName: 'Aisha Khan' }],
        channels: ['email', 'slack']
      }
    ],
    enabled: true,
    ruleCount: 3,
    lastTriggeredAt: '2026-05-08T13:47:00Z',
    lastTriggeredRuleId: 'RULE-DATA-002',
    createdAt: '2026-04-02T00:00:00Z',
    updatedAt: '2026-05-02T00:00:00Z'
  },
  {
    id: 'ar-003',
    publicId: 'ROUTE-NETWORK',
    name: 'Network Operations',
    description: 'Alerts for VPCs, Gateways, and Load Balancers',
    matchExpression: {
      sources: ['cloud_provider'],
      tags: ['network'],
    },
    channels: ['slack', 'email'],
    recipients: [
      { id: 'rec-006', type: 'team', targetId: 't-network', targetName: 'Network Operations' }
    ],
    escalationSteps: [
      {
        id: 'esc-006',
        delayMinutes: 0,
        recipients: [{ id: 'rec-006', type: 'team', targetId: 't-network', targetName: 'Network Operations' }],
        channels: ['slack', 'email']
      }
    ],
    enabled: true,
    ruleCount: 2,
    createdAt: '2026-04-03T00:00:00Z',
    updatedAt: '2026-05-03T00:00:00Z'
  },
  {
    id: 'ar-004',
    publicId: 'ROUTE-SERVICEDESK',
    name: 'Service Desk Triage',
    description: 'Low severity alerts that need manual review',
    matchExpression: {
      severities: ['P3', 'P4'],
    },
    channels: ['in_app', 'email'],
    recipients: [
      { id: 'rec-007', type: 'team', targetId: 't-servicedesk', targetName: 'Service Desk' }
    ],
    escalationSteps: [
      {
        id: 'esc-007',
        delayMinutes: 0,
        recipients: [{ id: 'rec-007', type: 'team', targetId: 't-servicedesk', targetName: 'Service Desk' }],
        channels: ['in_app', 'email']
      }
    ],
    quietHours: {
      enabled: true,
      timezone: 'America/New_York',
      fromHour: 18,
      toHour: 8,
      daysOfWeek: [0, 6], // Weekends
    },
    enabled: true,
    ruleCount: 2,
    createdAt: '2026-04-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'ar-005',
    publicId: 'ROUTE-DEFAULT',
    name: 'Default — Catch-all',
    description: 'Fallback route for any alerts not matched above',
    matchExpression: {},
    channels: ['email', 'in_app'],
    recipients: [
      { id: 'rec-008', type: 'user', targetId: 'u-001', targetName: 'Sarah Chen' }
    ],
    escalationSteps: [
      {
        id: 'esc-008',
        delayMinutes: 0,
        recipients: [{ id: 'rec-008', type: 'user', targetId: 'u-001', targetName: 'Sarah Chen' }],
        channels: ['email', 'in_app']
      }
    ],
    enabled: true,
    ruleCount: 1,
    createdAt: '2026-04-05T00:00:00Z',
    updatedAt: '2026-05-05T00:00:00Z'
  }
];
