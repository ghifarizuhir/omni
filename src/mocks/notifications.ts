export interface MockNotificationItem {
  id: string;
  type: 'info' | 'update' | 'mention' | 'system';
  title: string;
  body: string;
  sourceModule?: string;
  sourceRef?: string;
  readAt: string | null;
  createdAt: string;
}

export const mockNotifications: MockNotificationItem[] = [
  { id: 'ntf-001', type: 'mention', title: 'Marcus mentioned you',           body: 'in INC-2026-00184: "@sarah can you check the runbook?"',  sourceModule: 'incident', sourceRef: 'INC-2026-00184', readAt: null,                    createdAt: '2026-05-08T08:20:00Z' },
  { id: 'ntf-002', type: 'update',  title: 'Incident assigned to you',       body: 'INC-2026-00184 — Payment Service 5xx',                     sourceModule: 'incident', sourceRef: 'INC-2026-00184', readAt: null,                    createdAt: '2026-05-08T08:14:00Z' },
  { id: 'ntf-003', type: 'info',    title: 'Your on-call shift starts soon', body: 'Payment Service primary, 18:00 UTC tonight.',              sourceModule: 'oncall',                                  readAt: null,                    createdAt: '2026-05-08T07:55:00Z' },
  { id: 'ntf-004', type: 'update',  title: 'Change CHG-2026-00088 approved', body: 'Auto-approved by standard policy.',                        sourceModule: 'change',   sourceRef: 'CHG-2026-00088', readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:01:00Z' },
  { id: 'ntf-005', type: 'system',  title: 'Daily digest available',         body: '8 incidents, 3 changes, 2 deploys in last 24h.',                                                                  readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ntf-006', type: 'update',  title: 'KB article published',           body: 'New runbook: "ES cluster yellow recovery"',                sourceModule: 'kb',       sourceRef: 'KB-00231',       readAt: '2026-05-08T06:45:00Z',  createdAt: '2026-05-08T06:30:00Z' },
  { id: 'ntf-007', type: 'info',    title: 'Status page incident posted',    body: 'Search Service: investigating partial outage.',            sourceModule: 'status',   sourceRef: 'STP-2026-00012', readAt: null,                    createdAt: '2026-05-08T06:18:00Z' },
  { id: 'ntf-008', type: 'mention', title: 'Helena mentioned you',           body: 'in CHG-2026-00091: "@sarah please review risk score"',     sourceModule: 'change',   sourceRef: 'CHG-2026-00091', readAt: '2026-05-07T22:00:00Z',  createdAt: '2026-05-07T21:48:00Z' },
  { id: 'ntf-009', type: 'update',  title: 'Deploy completed: REL-2026-00016', body: 'Notification Gateway 1.5.2 deployed to prod.',           sourceModule: 'release',  sourceRef: 'REL-2026-00016', readAt: '2026-05-07T20:15:00Z',  createdAt: '2026-05-07T20:11:00Z' },
  { id: 'ntf-010', type: 'system',  title: 'Weekly improvement digest',      body: '3 new initiatives created from PIR this week.',                                                                   readAt: '2026-05-07T18:00:00Z',  createdAt: '2026-05-07T17:00:00Z' },
  { id: 'ntf-011', type: 'info',    title: 'Capacity threshold alert',       body: 'CI WEB-PROD-03 CPU > 80% for 30min.',                      sourceModule: 'monitoring',                              readAt: null,                    createdAt: '2026-05-07T15:42:00Z' },
  { id: 'ntf-012', type: 'update',  title: 'Problem PRB-2026-00021 closed',  body: 'Permanent fix verified. KB updated.',                      sourceModule: 'problem',  sourceRef: 'PRB-2026-00021', readAt: '2026-05-07T14:30:00Z',  createdAt: '2026-05-07T14:20:00Z' },
  { id: 'ntf-013', type: 'mention', title: 'David mentioned you',            body: 'in PRB-2026-00023: "@sarah RCA draft ready for review"',   sourceModule: 'problem',  sourceRef: 'PRB-2026-00023', readAt: '2026-05-07T11:00:00Z',  createdAt: '2026-05-07T10:54:00Z' },
  { id: 'ntf-014', type: 'system',  title: 'Maintenance window scheduled',   body: 'Internal Wiki: tomorrow 02:00–04:00 UTC.',                 sourceModule: 'change',   sourceRef: 'CHG-2026-00086', readAt: '2026-05-07T09:00:00Z',  createdAt: '2026-05-07T08:45:00Z' },
  { id: 'ntf-015', type: 'info',    title: 'New comment on your incident',   body: 'INC-2026-00179 — Yuki added a comment.',                   sourceModule: 'incident', sourceRef: 'INC-2026-00179', readAt: '2026-05-07T08:30:00Z',  createdAt: '2026-05-07T08:22:00Z' },
];
