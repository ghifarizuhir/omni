export interface MockNotificationItem {
  id: string;
  type: 'info' | 'update' | 'mention' | 'system';
  title: string;
  body: string;
  sourceModule?: string;
  sourceRef?: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export const mockNotifications: MockNotificationItem[] = [
  // ntf-001 and ntf-002 removed — moved to mockInboxItems (ibx-008, ibx-009)
  { id: 'ntf-003', type: 'info',   title: 'Your on-call shift starts soon',    body: 'Payment Service primary, 18:00 UTC tonight.',              sourceModule: 'oncall',                                  url: null,                             readAt: null,                    createdAt: '2026-05-08T07:55:00Z' },
  { id: 'ntf-004', type: 'update', title: 'Change CHG-2026-00088 approved',    body: 'Auto-approved by standard policy.',                        sourceModule: 'change',   sourceRef: 'CHG-2026-00088', url: '/changes/CHG-2026-00088',        readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:01:00Z' },
  { id: 'ntf-005', type: 'system', title: 'Daily digest available',            body: '8 incidents, 3 changes, 2 deploys in last 24h.',                                                                url: null,                             readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ntf-006', type: 'update', title: 'KB article published',              body: 'New runbook: "ES cluster yellow recovery"',                sourceModule: 'kb',       sourceRef: 'KB-00231',       url: '/kb/es-cluster-yellow-recovery', readAt: '2026-05-08T06:45:00Z',  createdAt: '2026-05-08T06:30:00Z' },
  { id: 'ntf-007', type: 'info',   title: 'Status page incident posted',       body: 'Search Service: investigating partial outage.',            sourceModule: 'status',   sourceRef: 'STP-2026-00012', url: '/status',                        readAt: null,                    createdAt: '2026-05-08T06:18:00Z' },
  { id: 'ntf-008', type: 'mention',title: 'Helena mentioned you',              body: 'in CHG-2026-00091: "@sarah please review risk score"',     sourceModule: 'change',   sourceRef: 'CHG-2026-00091', url: '/changes/CHG-2026-00091',        readAt: '2026-05-07T22:00:00Z',  createdAt: '2026-05-07T21:48:00Z' },
  { id: 'ntf-009', type: 'update', title: 'Deploy completed: REL-2026-00016',  body: 'Notification Gateway 1.5.2 deployed to prod.',            sourceModule: 'release',  sourceRef: 'REL-2026-00016', url: '/releases/REL-2026-00016',       readAt: '2026-05-07T20:15:00Z',  createdAt: '2026-05-07T20:11:00Z' },
  { id: 'ntf-010', type: 'system', title: 'Weekly improvement digest',         body: '3 new initiatives created from PIR this week.',                                                                url: null,                             readAt: '2026-05-07T18:00:00Z',  createdAt: '2026-05-07T17:00:00Z' },
  { id: 'ntf-011', type: 'info',   title: 'Capacity threshold alert',          body: 'CI WEB-PROD-03 CPU > 80% for 30min.',                      sourceModule: 'monitoring',                              url: '/events',                        readAt: null,                    createdAt: '2026-05-07T15:42:00Z' },
  { id: 'ntf-012', type: 'update', title: 'Problem PRB-2026-00021 closed',     body: 'Permanent fix verified. KB updated.',                      sourceModule: 'problem',  sourceRef: 'PRB-2026-00021', url: '/problems/PRB-2026-00021',       readAt: '2026-05-07T14:30:00Z',  createdAt: '2026-05-07T14:20:00Z' },
  { id: 'ntf-013', type: 'mention',title: 'David mentioned you',               body: 'in PRB-2026-00023: "@sarah RCA draft ready for review"',   sourceModule: 'problem',  sourceRef: 'PRB-2026-00023', url: '/problems/PRB-2026-00023',       readAt: '2026-05-07T11:00:00Z',  createdAt: '2026-05-07T10:54:00Z' },
  { id: 'ntf-014', type: 'system', title: 'Maintenance window scheduled',      body: 'Internal Wiki: tomorrow 02:00–04:00 UTC.',                 sourceModule: 'change',   sourceRef: 'CHG-2026-00086', url: '/changes/CHG-2026-00086',        readAt: '2026-05-07T09:00:00Z',  createdAt: '2026-05-07T08:45:00Z' },
  { id: 'ntf-015', type: 'info',   title: 'New comment on your incident',      body: 'INC-2026-00179 — Yuki added a comment.',                   sourceModule: 'incident', sourceRef: 'INC-2026-00179', url: '/incidents/INC-2026-00179',      readAt: '2026-05-07T08:30:00Z',  createdAt: '2026-05-07T08:22:00Z' },
];
