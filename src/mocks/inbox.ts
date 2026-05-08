export interface MockInboxItem {
  id: string;
  type: 'approval' | 'escalation' | 'sign_off' | 'acknowledgment';
  sourceModule: 'incident' | 'change' | 'request' | 'release';
  sourceRef: string; // e.g. "CHG-2026-00045"
  title: string;
  body: string;
  priority: 'urgent' | 'normal';
  dueAt: string; // ISO
  createdAt: string;
}

export const mockInboxItems: MockInboxItem[] = [
  { id: 'ibx-001', type: 'approval',       sourceModule: 'change',   sourceRef: 'CHG-2026-00091', title: 'CAB approval needed: Payment Service v2.4 rollout',     body: 'Requires sign-off before Friday window. Risk: medium.', priority: 'urgent', dueAt: '2026-05-09T17:00:00Z', createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ibx-002', type: 'escalation',     sourceModule: 'incident', sourceRef: 'INC-2026-00182', title: 'Escalated to you: Search Service ES cluster',           body: 'No ack from primary on-call after 15min.',              priority: 'urgent', dueAt: '2026-05-08T09:00:00Z', createdAt: '2026-05-08T08:30:00Z' },
  { id: 'ibx-003', type: 'sign_off',       sourceModule: 'release',  sourceRef: 'REL-2026-00018', title: 'Release sign-off: Order Service 3.1.0',                  body: 'All tests passed. Awaiting your validation sign-off.',  priority: 'normal', dueAt: '2026-05-08T18:00:00Z', createdAt: '2026-05-08T06:45:00Z' },
  { id: 'ibx-004', type: 'approval',       sourceModule: 'request',  sourceRef: 'REQ-2026-00342', title: 'Access request: Production DB read access',              body: 'From Liam O’Connor (Product team).',                    priority: 'normal', dueAt: '2026-05-09T12:00:00Z', createdAt: '2026-05-08T05:20:00Z' },
  { id: 'ibx-005', type: 'acknowledgment', sourceModule: 'incident', sourceRef: 'INC-2026-00184', title: 'Major incident declared: please acknowledge',            body: 'P1 — Payment Service.',                                 priority: 'urgent', dueAt: '2026-05-08T08:30:00Z', createdAt: '2026-05-08T08:15:00Z' },
  { id: 'ibx-006', type: 'approval',       sourceModule: 'change',   sourceRef: 'CHG-2026-00088', title: 'Standard change request: certificate renewal',           body: 'Auto-approved if no objection in 24h.',                 priority: 'normal', dueAt: '2026-05-09T08:00:00Z', createdAt: '2026-05-08T08:00:00Z' },
  { id: 'ibx-007', type: 'sign_off',       sourceModule: 'release',  sourceRef: 'REL-2026-00017', title: 'PIR sign-off: Auth Service 2.8.1',                       body: 'Post-implementation review ready for closure.',         priority: 'normal', dueAt: '2026-05-10T18:00:00Z', createdAt: '2026-05-07T16:00:00Z' },
  { id: 'ibx-008', type: 'escalation',     sourceModule: 'incident', sourceRef: 'INC-2026-00181', title: 'SLA breach imminent: SSO login failures',                body: '15min remaining on response SLA.',                      priority: 'urgent', dueAt: '2026-05-08T08:48:00Z', createdAt: '2026-05-08T08:33:00Z' },
];
