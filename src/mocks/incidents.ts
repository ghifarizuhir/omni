import { Severity } from "../types";

export interface MockIncidentSummary {
  id: string;
  title: string;
  severity: Severity;
  status: 'open' | 'in_progress' | 'resolved';
  assigneeId: string;
  serviceId: string;
  createdAt: string; // ISO
  slaBreached: boolean;
}

export const mockIncidents: MockIncidentSummary[] = [
  { id: 'INC-2026-00184', title: 'Payment Service: 5xx error rate elevated',     severity: 'P1', status: 'in_progress', assigneeId: 'u-004', serviceId: 'svc-001', createdAt: '2026-05-08T08:14:00Z', slaBreached: false },
  { id: 'INC-2026-00183', title: 'Order Service: latency spike on /checkout',     severity: 'P2', status: 'in_progress', assigneeId: 'u-005', serviceId: 'svc-003', createdAt: '2026-05-08T07:42:00Z', slaBreached: false },
  { id: 'INC-2026-00182', title: 'Search Service: ES cluster yellow status',      severity: 'P2', status: 'in_progress', assigneeId: 'u-008', serviceId: 'svc-005', createdAt: '2026-05-08T06:15:00Z', slaBreached: true  },
  { id: 'INC-2026-00181', title: 'Auth: SSO login failures from EU region',       severity: 'P3', status: 'open',        assigneeId: 'u-002', serviceId: 'svc-002', createdAt: '2026-05-08T05:33:00Z', slaBreached: false },
  { id: 'INC-2026-00180', title: 'CI/CD: scheduled deploy queue backed up',       severity: 'P3', status: 'open',        assigneeId: 'u-001', serviceId: 'svc-008', createdAt: '2026-05-08T04:01:00Z', slaBreached: false },
  { id: 'INC-2026-00179', title: 'Notification Gateway: SMS provider rate limit', severity: 'P3', status: 'resolved',    assigneeId: 'u-008', serviceId: 'svc-004', createdAt: '2026-05-07T22:18:00Z', slaBreached: false },
  { id: 'INC-2026-00178', title: 'Analytics Pipeline: delayed batch by 25min',    severity: 'P4', status: 'resolved',    assigneeId: 'u-008', serviceId: 'svc-006', createdAt: '2026-05-07T18:05:00Z', slaBreached: false },
  { id: 'INC-2026-00177', title: 'Internal Wiki: scheduled maintenance window',   severity: 'P4', status: 'resolved',    assigneeId: 'u-001', serviceId: 'svc-007', createdAt: '2026-05-07T14:00:00Z', slaBreached: false },
];
