// Seeds the generic Document store for catalog/snapshot domains that don't
// warrant their own table. Imported from `prisma/seed.ts`.

import type { PrismaClient } from '@prisma/client';
import type {
  LegacyInboxItem, InboxItem, NotificationItem, NotificationPreference, QuietHoursConfig,
  OnCallSchedule, OnCallOverride, StatusPageEntry, StatusPageIncident,
} from '../src/types/platform';
import type { KBFeedback, KBAnalytics } from '../src/types/knowledge';
import type {
  Division, Department, RbacTeam, Application, FunctionalRole, RbacUser,
} from '../src/types/rbac';
import type { Report, MeasurementDashboard, MetricDefinition } from '../src/types/measurement';
import type { BenefitMeasurement, ROICalculation } from '../src/types/improvement';

// Source data shapes vary widely; treat each as an opaque object and lift the
// optional `id`/`publicId` out at runtime.
type AnyItem = Record<string, unknown>;

const buildBatch = (tenantId: string, kind: string, items: ReadonlyArray<unknown>) =>
  items.map((raw, idx) => {
    const it = raw as AnyItem;
    return {
      tenantId,
      kind,
      key: typeof it.id === 'string' ? it.id : `${kind}-${idx}`,
      publicId: typeof it.publicId === 'string' ? it.publicId : null,
      data: JSON.stringify(it),
      position: idx,
    };
  });

// ─── Notifications ───────────────────────────────────────────────────────────

const notifications: NotificationItem[] = [
  { id: 'ntf-003', type: 'info',    title: 'Your on-call shift starts soon',   body: 'Payment Service primary, 18:00 UTC tonight.',             sourceModule: 'oncall',                                  url: null,                             readAt: null,                   createdAt: '2026-05-08T07:55:00Z' },
  { id: 'ntf-004', type: 'update',  title: 'Change CHG-2026-00088 approved',   body: 'Auto-approved by standard policy.',                       sourceModule: 'change',   sourceRef: 'CHG-2026-00088', url: '/changes/CHG-2026-00088',        readAt: '2026-05-08T07:30:00Z', createdAt: '2026-05-08T07:01:00Z' },
  { id: 'ntf-005', type: 'system',  title: 'Daily digest available',           body: '8 incidents, 3 changes, 2 deploys in last 24h.',                                                                url: null,                             readAt: '2026-05-08T07:30:00Z', createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ntf-006', type: 'update',  title: 'KB article published',             body: 'New runbook: "ES cluster yellow recovery"',               sourceModule: 'kb',       sourceRef: 'KB-00231',       url: '/kb/es-cluster-yellow-recovery', readAt: '2026-05-08T06:45:00Z', createdAt: '2026-05-08T06:30:00Z' },
  { id: 'ntf-007', type: 'info',    title: 'Status page incident posted',      body: 'Search Service: investigating partial outage.',            sourceModule: 'status',   sourceRef: 'STP-2026-00012', url: '/status',                        readAt: null,                   createdAt: '2026-05-08T06:18:00Z' },
  { id: 'ntf-008', type: 'mention', title: 'Helena mentioned you',             body: 'in CHG-2026-00091: "@sarah please review risk score"',    sourceModule: 'change',   sourceRef: 'CHG-2026-00091', url: '/changes/CHG-2026-00091',        readAt: '2026-05-07T22:00:00Z', createdAt: '2026-05-07T21:48:00Z' },
  { id: 'ntf-009', type: 'update',  title: 'Deploy completed: REL-2026-00016', body: 'Notification Gateway 1.5.2 deployed to prod.',            sourceModule: 'release',  sourceRef: 'REL-2026-00016', url: '/releases/REL-2026-00016',       readAt: '2026-05-07T20:15:00Z', createdAt: '2026-05-07T20:11:00Z' },
  { id: 'ntf-010', type: 'system',  title: 'Weekly improvement digest',        body: '3 new initiatives created from PIR this week.',                                                                url: null,                             readAt: '2026-05-07T18:00:00Z', createdAt: '2026-05-07T17:00:00Z' },
  { id: 'ntf-011', type: 'info',    title: 'Capacity threshold alert',         body: 'CI WEB-PROD-03 CPU > 80% for 30min.',                     sourceModule: 'monitoring',                              url: '/events',                        readAt: null,                   createdAt: '2026-05-07T15:42:00Z' },
  { id: 'ntf-012', type: 'update',  title: 'Problem PRB-2026-00021 closed',    body: 'Permanent fix verified. KB updated.',                     sourceModule: 'problem',  sourceRef: 'PRB-2026-00021', url: '/problems/PRB-2026-00021',       readAt: '2026-05-07T14:30:00Z', createdAt: '2026-05-07T14:20:00Z' },
  { id: 'ntf-013', type: 'mention', title: 'David mentioned you',              body: 'in PRB-2026-00023: "@sarah RCA draft ready for review"',  sourceModule: 'problem',  sourceRef: 'PRB-2026-00023', url: '/problems/PRB-2026-00023',       readAt: '2026-05-07T11:00:00Z', createdAt: '2026-05-07T10:54:00Z' },
  { id: 'ntf-014', type: 'system',  title: 'Maintenance window scheduled',     body: 'Internal Wiki: tomorrow 02:00–04:00 UTC.',                sourceModule: 'change',   sourceRef: 'CHG-2026-00086', url: '/changes/CHG-2026-00086',        readAt: '2026-05-07T09:00:00Z', createdAt: '2026-05-07T08:45:00Z' },
  { id: 'ntf-015', type: 'info',    title: 'New comment on your incident',     body: 'INC-2026-00179 — Yuki added a comment.',                  sourceModule: 'incident', sourceRef: 'INC-2026-00179', url: '/incidents/INC-2026-00179',      readAt: '2026-05-07T08:30:00Z', createdAt: '2026-05-07T08:22:00Z' },
];

const notificationPreferences: NotificationPreference[] = [
  { userId: 'u-001', topic: 'incident_assigned',         channels: ['in_app', 'email', 'sms'], respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'incident_update_p1p2',      channels: ['in_app', 'sms'],          respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'incident_update_any',       channels: ['in_app'],                 respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'sla_warning',               channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'sla_breach',                channels: ['in_app', 'email', 'sms'], respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'approval_request',          channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'mention',                   channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'change_in_my_services',     channels: ['in_app'],                 respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'deployment_in_my_services', channels: ['in_app'],                 respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'capacity_alert',            channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'report_ready',              channels: ['email'],                  respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'kb_review_due',             channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'dr_test_reminder',          channels: ['in_app', 'email'],        respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'on_call_shift_start',       channels: ['in_app', 'sms'],          respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'on_call_escalation',        channels: ['in_app', 'sms'],          respectQuietHours: false, overrideForUrgent: true },
];

const quietHours: QuietHoursConfig = {
  userId: 'u-001', enabled: true, timezone: 'America/New_York', fromHour: 22, toHour: 7, daysOfWeek: [0, 6],
};

// ─── Inbox ───────────────────────────────────────────────────────────────────

const legacyInboxItems: LegacyInboxItem[] = [
  { id: 'ibx-001', type: 'approval',       sourceModule: 'change',   sourceRef: 'CHG-2026-00091', title: 'CAB approval needed: Payment Service v2.4 rollout',   body: 'Requires sign-off before Friday window. Risk: medium.', priority: 'urgent', dueAt: '2026-05-09T17:00:00Z', createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ibx-002', type: 'escalation',     sourceModule: 'incident', sourceRef: 'INC-2026-00182', title: 'Escalated to you: Search Service ES cluster',         body: 'No ack from primary on-call after 15min.',              priority: 'urgent', dueAt: '2026-05-08T09:00:00Z', createdAt: '2026-05-08T08:30:00Z' },
  { id: 'ibx-003', type: 'sign_off',       sourceModule: 'release',  sourceRef: 'REL-2026-00018', title: 'Release sign-off: Order Service 3.1.0',                body: 'All tests passed. Awaiting your validation sign-off.',  priority: 'normal', dueAt: '2026-05-08T18:00:00Z', createdAt: '2026-05-08T06:45:00Z' },
  { id: 'ibx-004', type: 'approval',       sourceModule: 'request',  sourceRef: 'REQ-2026-00342', title: 'Access request: Production DB read access',            body: "From Liam O'Connor (Product team).",                    priority: 'normal', dueAt: '2026-05-09T12:00:00Z', createdAt: '2026-05-08T05:20:00Z' },
  { id: 'ibx-005', type: 'acknowledgment', sourceModule: 'incident', sourceRef: 'INC-2026-00184', title: 'Major incident declared: please acknowledge',          body: 'P1 — Payment Service.',                                 priority: 'urgent', dueAt: '2026-05-08T08:30:00Z', createdAt: '2026-05-08T08:15:00Z' },
  { id: 'ibx-006', type: 'approval',       sourceModule: 'change',   sourceRef: 'CHG-2026-00088', title: 'Standard change request: certificate renewal',         body: 'Auto-approved if no objection in 24h.',                 priority: 'normal', dueAt: '2026-05-09T08:00:00Z', createdAt: '2026-05-08T08:00:00Z' },
  { id: 'ibx-007', type: 'sign_off',       sourceModule: 'release',  sourceRef: 'REL-2026-00017', title: 'PIR sign-off: Auth Service 2.8.1',                     body: 'Post-implementation review ready for closure.',         priority: 'normal', dueAt: '2026-05-10T18:00:00Z', createdAt: '2026-05-07T16:00:00Z' },
  { id: 'ibx-008', type: 'escalation',     sourceModule: 'incident', sourceRef: 'INC-2026-00181', title: 'SLA breach imminent: SSO login failures',              body: '15min remaining on response SLA.',                      priority: 'urgent', dueAt: '2026-05-08T08:48:00Z', createdAt: '2026-05-08T08:33:00Z' },
];

const inboxItems: InboxItem[] = [
  {
    id: 'ibx-001', type: 'approval_request', priority: 'urgent',
    title: 'CAB approval needed: CHG-2026-00091',
    summary: 'Migrate payment-api to pgbouncer — scheduled Friday 14:00 UTC. 1 of 3 votes cast.',
    body: 'Tom Bergstrom has approved. Your vote as Change Manager is required before Thursday CAB session.\n\n**Change:** Migrate payment-api to pgbouncer connection pooling\n**Risk:** Medium (58/100)\n**Window:** Friday May 10, 14:00–16:00 UTC\n**Linked problem:** PRB-2026-00018 (recurring memory pressure)',
    sourceType: 'change', sourcePublicId: 'CHG-2026-00091', sourceTitle: 'Migrate payment-api to pgbouncer connection pooling', sourceUrl: '/changes/CHG-2026-00091',
    senderId: 'system', senderName: 'Change Management', isRead: false, isArchived: false, isPinned: true, requiresAction: true,
    primaryAction: { label: 'Review & vote', navigateTo: '/changes/cab' }, secondaryAction: { label: 'View change', navigateTo: '/changes/CHG-2026-00091' },
    receivedAt: '2026-05-08T08:00:00Z', expiresAt: '2026-05-09T10:00:00Z',
  },
  {
    id: 'ibx-002', type: 'dr_test_reminder', priority: 'high',
    title: 'DR test running now: DRP-PAY-001',
    summary: 'Functional test of Payment Service DR plan started at 06:00 UTC. 6/10 steps complete.',
    sourceType: 'dr_test', sourcePublicId: 'DRT-2026-00018', sourceTitle: 'Payment Service DR Plan — Functional test', sourceUrl: '/continuity/tests',
    senderId: 'system', senderName: 'Continuity Management', isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'View live test', navigateTo: '/continuity/tests' }, receivedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'ibx-003', type: 'sla_warning', priority: 'urgent',
    title: 'SLA breached: Order Service availability',
    summary: 'Error budget exhausted. 78 min consumed of 43.2 min budget (181%). Active incident INC-2026-00183.',
    sourceType: 'sla', sourcePublicId: 'SLA-ORD-001', sourceTitle: 'Order Service availability SLA', sourceUrl: '/availability/sla',
    senderId: 'system', senderName: 'Availability Management', isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'View SLA', navigateTo: '/availability/sla' }, secondaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00183' },
    receivedAt: '2026-05-08T07:42:00Z',
  },
  {
    id: 'ibx-004', type: 'approval_request', priority: 'normal',
    title: 'Service request awaiting approval: REQ-2026-00342',
    summary: "Liam O'Connor requests Production DB read access (pay-postgres-primary, 30 days). Manager approval needed.",
    sourceType: 'service_request', sourcePublicId: 'REQ-2026-00342', sourceTitle: 'Production Database Read Access — pay-postgres-primary', sourceUrl: '/requests/REQ-2026-00342',
    senderId: 'u-011', senderName: "Liam O'Connor", isRead: true, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Review request', navigateTo: '/requests/REQ-2026-00342' }, receivedAt: '2026-05-08T05:20:00Z',
  },
  {
    id: 'ibx-005', type: 'mention', priority: 'normal',
    title: 'David Okafor mentioned you in INC-2026-00184',
    summary: '"@sarah.chen DB pool at 95%. Restarting payment-worker pods. Can you post external comms?"',
    body: 'DB pool at 95%. Restarting payment-worker pods. Can you post external comms?\n\n— David Okafor, in INC-2026-00184 comment thread',
    sourceType: 'incident', sourcePublicId: 'INC-2026-00184', sourceTitle: 'Payment Service: 5xx error rate elevated', sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'u-004', senderName: 'David Okafor', isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' }, receivedAt: '2026-05-08T08:32:00Z',
  },
  {
    id: 'ibx-006', type: 'kb_review', priority: 'low',
    title: 'KB article ready for review: KB-00231',
    summary: 'Aisha Khan published "ES cluster yellow status recovery". As KB manager, please review.',
    sourceType: 'kb_article', sourcePublicId: 'KB-00231', sourceTitle: 'Runbook: ES cluster yellow status recovery', sourceUrl: '/kb/es-cluster-yellow-recovery',
    senderId: 'u-008', senderName: 'Aisha Khan', isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'Review article', navigateTo: '/kb/es-cluster-yellow-recovery' }, receivedAt: '2026-05-08T06:35:00Z',
  },
  {
    id: 'ibx-007', type: 'approval_request', priority: 'normal',
    title: 'PIR sign-off needed: REL-2026-00017',
    summary: 'auth-service 2.8.1 was released 7 days ago. PIR sign-off is overdue. Helena Vasquez is waiting.',
    sourceType: 'sign_off', sourcePublicId: 'SGN-2026-00039', sourceTitle: 'Release validation sign-off: REL-2026-00017', sourceUrl: '/testing/sign-off',
    senderId: 'u-006', senderName: 'Helena Vasquez', isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Sign off', navigateTo: '/testing/sign-off' }, receivedAt: '2026-05-07T09:00:00Z',
  },
  {
    id: 'ibx-008', type: 'mention', priority: 'normal',
    title: 'Marcus Reid mentioned you in INC-2026-00184',
    summary: '"@sarah.chen can you check the runbook?" — Marcus Reid',
    body: 'Can you check the runbook?\n\n— Marcus Reid, in INC-2026-00184 comment thread',
    sourceType: 'incident', sourcePublicId: 'INC-2026-00184', sourceTitle: 'Payment Service: 5xx error rate elevated', sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'u-009', senderName: 'Marcus Reid', isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' }, receivedAt: '2026-05-08T08:20:00Z',
  },
  {
    id: 'ibx-009', type: 'assignment', priority: 'high',
    title: 'Incident assigned to you: INC-2026-00184',
    summary: 'Payment Service 5xx error rate elevated — assigned to you.',
    sourceType: 'incident', sourcePublicId: 'INC-2026-00184', sourceTitle: 'Payment Service: 5xx error rate elevated', sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'system', senderName: 'Incident Management', isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' }, receivedAt: '2026-05-08T08:14:00Z',
  },
];

// ─── On-Call ─────────────────────────────────────────────────────────────────

const onCallSchedules: OnCallSchedule[] = [
  {
    id: 'onc-platform', publicId: 'ONC-PLATFORM-001', name: 'Platform On-Call',
    teamId: 't-platform', teamName: 'Platform Engineering',
    description: 'Primary on-call for all payment, auth, order services.',
    currentPrimaryId: 'u-004', currentPrimaryName: 'David Okafor',
    currentSecondaryId: 'u-005', currentSecondaryName: 'Yuki Tanaka',
    rotationIntervalDays: 7, rotationStartDayOfWeek: 1, rotationTime: '09:00',
    members: [
      { userId: 'u-004', userName: 'David Okafor', shiftOrder: 1 },
      { userId: 'u-005', userName: 'Yuki Tanaka',  shiftOrder: 2 },
      { userId: 'u-002', userName: 'Marcus Hill',  shiftOrder: 3 },
      { userId: 'u-003', userName: 'Priya Patel',  shiftOrder: 4 },
    ],
    upcomingShifts: [
      { id: 'shift-001', scheduleId: 'onc-platform', userId: 'u-004', userName: 'David Okafor', shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-11T09:00:00Z', isCurrentShift: true,  isOverridden: false },
      { id: 'shift-002', scheduleId: 'onc-platform', userId: 'u-005', userName: 'Yuki Tanaka',  shiftType: 'primary', startAt: '2026-05-11T09:00:00Z', endAt: '2026-05-18T09:00:00Z', isCurrentShift: false, isOverridden: false },
      { id: 'shift-003', scheduleId: 'onc-platform', userId: 'u-002', userName: 'Marcus Hill',  shiftType: 'primary', startAt: '2026-05-18T09:00:00Z', endAt: '2026-05-25T09:00:00Z', isCurrentShift: false, isOverridden: false },
      { id: 'shift-004', scheduleId: 'onc-platform', userId: 'u-003', userName: 'Priya Patel',  shiftType: 'primary', startAt: '2026-05-25T09:00:00Z', endAt: '2026-06-01T09:00:00Z', isCurrentShift: false, isOverridden: false },
    ],
    activeIncidentCount: 2, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'onc-data', publicId: 'ONC-DATA-001', name: 'Data Platform On-Call',
    teamId: 't-data', teamName: 'Data Platform',
    currentPrimaryId: 'u-008', currentPrimaryName: 'Aisha Khan',
    rotationIntervalDays: 7, rotationStartDayOfWeek: 1, rotationTime: '09:00',
    members: [
      { userId: 'u-008', userName: 'Aisha Khan',    shiftOrder: 1 },
      { userId: 'u-009', userName: 'Carlos Mendez', shiftOrder: 2 },
    ],
    upcomingShifts: [
      { id: 'shift-005', scheduleId: 'onc-data', userId: 'u-008', userName: 'Aisha Khan',    shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-11T09:00:00Z', isCurrentShift: true,  isOverridden: false },
      { id: 'shift-006', scheduleId: 'onc-data', userId: 'u-009', userName: 'Carlos Mendez', shiftType: 'primary', startAt: '2026-05-11T09:00:00Z', endAt: '2026-05-18T09:00:00Z', isCurrentShift: false, isOverridden: false },
    ],
    activeIncidentCount: 1, createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'onc-network', publicId: 'ONC-NET-001', name: 'Network Operations On-Call',
    teamId: 't-network', teamName: 'Network Operations',
    currentPrimaryId: 'u-010', currentPrimaryName: 'James Osei',
    rotationIntervalDays: 14, rotationStartDayOfWeek: 1,
    members: [
      { userId: 'u-010', userName: 'James Osei', shiftOrder: 1 },
      { userId: 'u-012', userName: 'Nina Patel',  shiftOrder: 2 },
    ],
    upcomingShifts: [
      { id: 'shift-007', scheduleId: 'onc-network', userId: 'u-010', userName: 'James Osei', shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-18T09:00:00Z', isCurrentShift: true, isOverridden: false },
    ],
    activeIncidentCount: 0, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-05-04T09:00:00Z',
  },
];

const onCallOverrides: OnCallOverride[] = [
  {
    id: 'ovr-001', publicId: 'OVR-2026-00012', scheduleId: 'onc-platform', scheduleName: 'Platform On-Call',
    originalUserId: 'u-005', originalUserName: 'Yuki Tanaka',
    overrideUserId: 'u-002', overrideUserName: 'Marcus Hill',
    startAt: '2026-05-14T09:00:00Z', endAt: '2026-05-16T09:00:00Z',
    reason: 'Yuki attending AWS re:Inforce conference.',
    requestedById: 'u-005', requestedByName: 'Yuki Tanaka',
    approvedById: 'u-001', approvedByName: 'Sarah Chen', approvedAt: '2026-05-07T14:00:00Z',
    status: 'approved', createdAt: '2026-05-07T13:00:00Z',
  },
  {
    id: 'ovr-002', publicId: 'OVR-2026-00011', scheduleId: 'onc-data', scheduleName: 'Data Platform On-Call',
    originalUserId: 'u-009', originalUserName: 'Carlos Mendez',
    overrideUserId: 'u-008', overrideUserName: 'Aisha Khan',
    startAt: '2026-05-11T09:00:00Z', endAt: '2026-05-13T09:00:00Z',
    reason: 'Carlos has a family commitment.',
    requestedById: 'u-009', requestedByName: 'Carlos Mendez',
    status: 'pending', createdAt: '2026-05-08T07:00:00Z',
  },
  {
    id: 'ovr-003', publicId: 'OVR-2026-00010', scheduleId: 'onc-platform', scheduleName: 'Platform On-Call',
    originalUserId: 'u-002', originalUserName: 'Marcus Hill',
    overrideUserId: 'u-004', overrideUserName: 'David Okafor',
    startAt: '2026-04-28T09:00:00Z', endAt: '2026-04-29T09:00:00Z',
    reason: 'Holiday coverage.',
    requestedById: 'u-002', requestedByName: 'Marcus Hill',
    approvedById: 'u-001', approvedByName: 'Sarah Chen', approvedAt: '2026-04-25T10:00:00Z',
    status: 'approved', createdAt: '2026-04-25T09:00:00Z',
  },
];

// ─── Status Page ─────────────────────────────────────────────────────────────

const statusPageEntries: StatusPageEntry[] = [
  { id: 'sp-001', serviceId: 'svc-001', serviceName: 'Payment Service',    serviceDescription: 'Processes customer payments and refunds.',         status: 'partial_outage', statusMessage: 'Investigating elevated error rates. Some checkout attempts may fail.', linkedOutagePublicId: 'OUT-2026-00042', linkedIncidentPublicId: 'INC-2026-00184', lastUpdatedAt: '2026-05-08T08:38:00Z', lastUpdatedByName: 'Sarah Chen',   uptime90d: 99.72, displayOrder: 1 },
  { id: 'sp-002', serviceId: 'svc-002', serviceName: 'Authentication',     serviceDescription: 'User login, SSO, and session management.',         status: 'operational',                                                                                                                                                                 lastUpdatedAt: '2026-05-08T00:00:00Z',                          uptime90d: 99.99, displayOrder: 2 },
  { id: 'sp-003', serviceId: 'svc-003', serviceName: 'Order Management',   serviceDescription: 'Shopping cart, order placement, and tracking.',    status: 'degraded',       statusMessage: 'Checkout latency elevated. Orders are processing but may be slower than usual.',                        linkedIncidentPublicId: 'INC-2026-00183', lastUpdatedAt: '2026-05-08T07:50:00Z',                          uptime90d: 99.83, displayOrder: 3 },
  { id: 'sp-004', serviceId: 'svc-004', serviceName: 'Notifications',      serviceDescription: 'Email, SMS, and push notification delivery.',      status: 'operational',                                                                                                                                                                 lastUpdatedAt: '2026-05-08T00:00:00Z',                          uptime90d: 99.94, displayOrder: 4 },
  { id: 'sp-005', serviceId: 'svc-005', serviceName: 'Search',             serviceDescription: 'Product search and recommendation engine.',        status: 'degraded',       statusMessage: 'Search results may load slower than usual.',                                                               linkedIncidentPublicId: 'INC-2026-00182', lastUpdatedAt: '2026-05-08T06:30:00Z',                          uptime90d: 99.41, displayOrder: 5 },
  { id: 'sp-006', serviceId: 'svc-006', serviceName: 'Analytics',          serviceDescription: 'Real-time and batch analytics platform.',          status: 'operational',                                                                                                                                                                 lastUpdatedAt: '2026-05-07T00:00:00Z',                          uptime90d: 99.71, displayOrder: 6 },
  { id: 'sp-007', serviceId: 'svc-007', serviceName: 'Internal Wiki',       serviceDescription: 'Internal documentation and knowledge sharing.',   status: 'maintenance',    statusMessage: 'Scheduled database upgrade in progress. Read-only mode until 04:00 UTC.',                               linkedIncidentPublicId: 'INC-2026-00180', lastUpdatedAt: '2026-05-09T02:00:00Z',                          uptime90d: 99.50, displayOrder: 7 },
  { id: 'sp-008', serviceId: 'svc-008', serviceName: 'CI/CD Platform',     serviceDescription: 'Continuous integration and deployment pipeline.', status: 'operational',                                                                                                                                                                 lastUpdatedAt: '2026-05-08T00:00:00Z',                          uptime90d: 99.88, displayOrder: 8 },
];

const statusPageIncidents: StatusPageIncident[] = [
  {
    id: 'spi-001', title: 'Payment Service — Elevated Error Rates', status: 'investigating',
    affectedServiceIds: ['svc-001'], startedAt: '2026-05-08T08:14:00Z',
    updates: [
      { id: 'u1', timestamp: '2026-05-08T08:38:00Z', authorName: 'Sarah Chen',  body: 'We have identified the issue as database connection pool saturation. Mitigation is in progress.' },
      { id: 'u2', timestamp: '2026-05-08T08:19:00Z', authorName: 'OIS System',  body: 'We are investigating elevated error rates on the Payment Service. Checkout attempts may be affected.' },
      { id: 'u3', timestamp: '2026-05-08T08:14:00Z', authorName: 'OIS System',  body: 'We are aware of an issue affecting the Payment Service and are investigating.' },
    ],
  },
  {
    id: 'spi-002', title: 'Order Service — Latency Elevated', status: 'investigating',
    affectedServiceIds: ['svc-003'], startedAt: '2026-05-08T07:42:00Z',
    updates: [
      { id: 'u4', timestamp: '2026-05-08T07:55:00Z', authorName: 'OIS System',  body: 'Checkout flow is experiencing latency. Orders are completing but may take 3–5 seconds instead of under 1 second.' },
    ],
  },
];

// ─── KB ──────────────────────────────────────────────────────────────────────

const kbFeedback: KBFeedback[] = [
  { id: 'kbf-001', articleId: 'kb-00187', userId: 'u-005', isHelpful: true,  comment: 'Saved me during the outage last week.',                                                                                   createdAt: '2026-04-22T14:30:00Z' },
  { id: 'kbf-002', articleId: 'kb-00187', userId: 'u-004', isHelpful: true,                                                                                                                                     createdAt: '2026-04-23T09:00:00Z' },
  { id: 'kbf-003', articleId: 'kb-00187', userId: 'u-003', isHelpful: true,  comment: 'The pool saturation check command was exactly what I needed.',                                                            createdAt: '2026-04-24T11:00:00Z' },
  { id: 'kbf-004', articleId: 'kb-00187', userId: 'u-008', isHelpful: true,                                                                                                                                     createdAt: '2026-04-25T08:00:00Z' },
  { id: 'kbf-005', articleId: 'kb-00187', userId: 'u-002', isHelpful: true,                                                                                                                                     createdAt: '2026-04-26T10:00:00Z' },
  { id: 'kbf-006', articleId: 'kb-00187', userId: 'u-009', isHelpful: true,                                                                                                                                     createdAt: '2026-04-27T13:00:00Z' },
  { id: 'kbf-007', articleId: 'kb-00187', userId: 'u-006', isHelpful: true,                                                                                                                                     createdAt: '2026-04-28T09:00:00Z' },
  { id: 'kbf-008', articleId: 'kb-00187', userId: 'u-007', isHelpful: true,                                                                                                                                     createdAt: '2026-04-29T10:00:00Z' },
  { id: 'kbf-009', articleId: 'kb-00187', userId: 'u-010', isHelpful: true,                                                                                                                                     createdAt: '2026-04-30T11:00:00Z' },
  { id: 'kbf-010', articleId: 'kb-00187', userId: 'u-012', isHelpful: true,                                                                                                                                     createdAt: '2026-05-01T08:00:00Z' },
  { id: 'kbf-011', articleId: 'kb-00187', userId: 'u-011', isHelpful: false, comment: "Procedure didn't work for staging environment — needs update.",                                                          createdAt: '2026-05-02T14:00:00Z' },
  { id: 'kbf-012', articleId: 'kb-00187', userId: 'u-001', isHelpful: false, comment: 'Step 3 rollout command timed out at 90s, not 120s as documented. Check timeout default.',                                createdAt: '2026-05-03T09:00:00Z' },
  { id: 'kbf-013', articleId: 'kb-00187', userId: 'u-003', isHelpful: true,                                                                                                                                     createdAt: '2026-05-04T10:00:00Z' },
  { id: 'kbf-014', articleId: 'kb-00187', userId: 'u-004', isHelpful: true,                                                                                                                                     createdAt: '2026-05-05T11:00:00Z' },
  { id: 'kbf-015', articleId: 'kb-00187', userId: 'u-008', isHelpful: true,                                                                                                                                     createdAt: '2026-05-06T09:00:00Z' },
  { id: 'kbf-016', articleId: 'kb-00203', userId: 'u-004', isHelpful: true,  comment: 'The decision flow is perfect. Exactly what an L1 needs.',                                                                createdAt: '2026-04-20T10:00:00Z' },
  { id: 'kbf-017', articleId: 'kb-00203', userId: 'u-002', isHelpful: true,                                                                                                                                     createdAt: '2026-04-21T11:00:00Z' },
  { id: 'kbf-018', articleId: 'kb-00203', userId: 'u-003', isHelpful: true,                                                                                                                                     createdAt: '2026-04-22T09:00:00Z' },
  { id: 'kbf-019', articleId: 'kb-00203', userId: 'u-009', isHelpful: true,                                                                                                                                     createdAt: '2026-04-23T14:00:00Z' },
  { id: 'kbf-020', articleId: 'kb-00203', userId: 'u-005', isHelpful: false, comment: 'Step 4 (recent deploys) should come before the downstream check in most cases.',                                         createdAt: '2026-04-24T10:00:00Z' },
  { id: 'kbf-021', articleId: 'kb-00198', userId: 'u-011', isHelpful: true,  comment: 'Great summary before submitting a DB access request.',                                                                   createdAt: '2026-04-25T10:00:00Z' },
  { id: 'kbf-022', articleId: 'kb-00198', userId: 'u-012', isHelpful: true,                                                                                                                                     createdAt: '2026-04-26T11:00:00Z' },
  { id: 'kbf-023', articleId: 'kb-00198', userId: 'u-009', isHelpful: true,                                                                                                                                     createdAt: '2026-04-27T09:00:00Z' },
  { id: 'kbf-024', articleId: 'kb-00199', userId: 'u-001', isHelpful: true,  comment: 'Should be required reading before any prod DB access.',                                                                  createdAt: '2026-04-15T10:00:00Z' },
  { id: 'kbf-025', articleId: 'kb-00199', userId: 'u-011', isHelpful: true,                                                                                                                                     createdAt: '2026-04-16T11:00:00Z' },
  { id: 'kbf-026', articleId: 'kb-00199', userId: 'u-012', isHelpful: false, comment: 'The retention table is out of date — 13 months is now 18 months per new compliance rules.',                              createdAt: '2026-05-05T14:00:00Z' },
  { id: 'kbf-027', articleId: 'kb-00156', userId: 'u-009', isHelpful: true,                                                                                                                                     createdAt: '2026-02-10T10:00:00Z' },
  { id: 'kbf-028', articleId: 'kb-00156', userId: 'u-003', isHelpful: true,  comment: 'The ssh config snippet saves a lot of time.',                                                                            createdAt: '2026-02-11T11:00:00Z' },
  { id: 'kbf-029', articleId: 'kb-00156', userId: 'u-011', isHelpful: true,                                                                                                                                     createdAt: '2026-02-12T09:00:00Z' },
  { id: 'kbf-030', articleId: 'kb-00134', userId: 'u-002', isHelpful: true,  comment: 'Handover template is very useful. Saved to my snippets.',                                                                createdAt: '2026-03-15T10:00:00Z' },
  { id: 'kbf-031', articleId: 'kb-00134', userId: 'u-003', isHelpful: true,                                                                                                                                     createdAt: '2026-03-16T11:00:00Z' },
  { id: 'kbf-032', articleId: 'kb-00134', userId: 'u-009', isHelpful: true,                                                                                                                                     createdAt: '2026-03-17T09:00:00Z' },
];

const kbAnalytics: KBAnalytics = {
  totalViews: 2178, totalSearches: 487, uniqueUsersActive: 64, helpfulRate: 0.91,
  topSearches: [
    { term: 'payment 5xx',            count: 73, hasMatchingArticle: true,  matchingArticleSlug: 'troubleshooting-payment-api-5xx-errors' },
    { term: 'pool exhaustion',        count: 41, hasMatchingArticle: true,  matchingArticleSlug: 'payment-api-restart-procedure' },
    { term: 'pgbouncer migration',    count: 28, hasMatchingArticle: false },
    { term: 'es cluster yellow',      count: 24, hasMatchingArticle: true,  matchingArticleSlug: 'es-cluster-yellow-recovery' },
    { term: 'sso eu region',          count: 21, hasMatchingArticle: false },
    { term: 'oncall handover',        count: 19, hasMatchingArticle: true,  matchingArticleSlug: 'oncall-handover-checklist' },
    { term: 'aws console access',     count: 18, hasMatchingArticle: true,  matchingArticleSlug: 'db-read-access-best-practices' },
    { term: 'slack notifications',    count: 16, hasMatchingArticle: true,  matchingArticleSlug: 'troubleshooting-slack-notifications' },
    { term: 'order checkout latency', count: 14, hasMatchingArticle: false },
    { term: 'mongo replica lag',      count: 12, hasMatchingArticle: false },
  ],
  topViewed:   ['troubleshooting-payment-api-5xx-errors', 'ssh-access-via-bastion', 'payment-api-restart-procedure', 'pci-dss-data-handling', 'oncall-handover-checklist', 'db-read-access-best-practices', 'ois-platform-overview', 'troubleshooting-slack-notifications', 'laptop-onboarding', 'es-cluster-yellow-recovery'],
  topHelpful:  ['troubleshooting-payment-api-5xx-errors', 'payment-api-restart-procedure', 'db-read-access-best-practices', 'pci-dss-data-handling', 'oncall-handover-checklist', 'ssh-access-via-bastion'],
  needsReview: ['es-cluster-yellow-recovery', 'db-read-access-best-practices', 'laptop-onboarding'],
  contentGaps: [
    { searchTerm: 'pgbouncer migration',    count: 28, suggestedAction: 'Create runbook for pgbouncer migration (linked to CHG-2026-00091)', linkedItemId: 'CHG-2026-00091' },
    { searchTerm: 'sso eu region',          count: 21, suggestedAction: 'Document EU region SSO troubleshooting' },
    { searchTerm: 'order checkout latency', count: 14, suggestedAction: 'Create troubleshooting article (linked to INC-2026-00183)',          linkedItemId: 'INC-2026-00183' },
    { searchTerm: 'mongo replica lag',      count: 12, suggestedAction: 'Create runbook for MongoDB replica lag investigation' },
  ],
  viewsTimeSeries: [
    { date: '2026-04-08', views: 64 }, { date: '2026-04-09', views: 71 }, { date: '2026-04-10', views: 58 },
    { date: '2026-04-11', views: 43 }, { date: '2026-04-12', views: 39 }, { date: '2026-04-13', views: 52 },
    { date: '2026-04-14', views: 67 }, { date: '2026-04-15', views: 88 }, { date: '2026-04-16', views: 94 },
    { date: '2026-04-17', views: 76 }, { date: '2026-04-18', views: 61 }, { date: '2026-04-19', views: 45 },
    { date: '2026-04-20', views: 55 }, { date: '2026-04-21', views: 72 }, { date: '2026-04-22', views: 81 },
    { date: '2026-04-23', views: 78 }, { date: '2026-04-24', views: 66 }, { date: '2026-04-25', views: 59 },
    { date: '2026-04-26', views: 48 }, { date: '2026-04-27', views: 53 }, { date: '2026-04-28', views: 69 },
    { date: '2026-04-29', views: 85 }, { date: '2026-04-30', views: 92 }, { date: '2026-05-01', views: 74 },
    { date: '2026-05-02', views: 63 }, { date: '2026-05-03', views: 57 }, { date: '2026-05-04', views: 49 },
    { date: '2026-05-05', views: 61 }, { date: '2026-05-06', views: 78 }, { date: '2026-05-07', views: 97 },
    { date: '2026-05-08', views: 83 },
  ],
};

// ─── RBAC ────────────────────────────────────────────────────────────────────

const divisions: Division[] = [
  { id: 'div-sta', code: 'STA',           name: 'IT Strategy & Architecture' },
  { id: 'div-ifm', code: 'IFM',           name: 'IT Infrastructure Management' },
  { id: 'div-aps', code: 'APS',           name: 'IT Application Services' },
  { id: 'div-ub',  code: 'USER_BUSINESS', name: 'User Business' },
];

const departments: Department[] = [
  { id: 'dept-aps-1',   divisionId: 'div-aps', code: 'APS-CORE',    name: 'APS Core Banking Apps' },
  { id: 'dept-aps-2',   divisionId: 'div-aps', code: 'APS-CHANNEL', name: 'APS Channel Apps' },
  { id: 'dept-aps-3',   divisionId: 'div-aps', code: 'APS-SUPPORT', name: 'APS Support Apps' },
  { id: 'dept-aps-4',   divisionId: 'div-aps', code: 'APS-DATA',    name: 'APS Data & Analytics Apps' },
  { id: 'dept-aps-tsc', divisionId: 'div-aps', code: 'APS-TSC',     name: 'APS Testing & Source Control' },
  { id: 'dept-ifm-ops', divisionId: 'div-ifm', code: 'IFM-OPS',     name: 'IFM Operations' },
  { id: 'dept-sta-arch',divisionId: 'div-sta', code: 'STA-ARCH',    name: 'STA Architecture' },
  { id: 'dept-ub-retail',divisionId: 'div-ub', code: 'UB-RETAIL',   name: 'Retail Business' },
];

const rbacTeams: RbacTeam[] = [
  { id: 'team-core-loan',    departmentId: 'dept-aps-1',   code: 'CORE-LOAN',    name: 'Loan Origination Team' },
  { id: 'team-core-deposit', departmentId: 'dept-aps-1',   code: 'CORE-DEPOSIT', name: 'Deposit Team' },
  { id: 'team-ch-mobile',    departmentId: 'dept-aps-2',   code: 'CH-MOBILE',    name: 'Mobile Banking Team' },
  { id: 'team-ch-web',       departmentId: 'dept-aps-2',   code: 'CH-WEB',       name: 'Web Banking Team' },
  { id: 'team-sup-hrms',     departmentId: 'dept-aps-3',   code: 'SUP-HRMS',     name: 'HRMS Team' },
  { id: 'team-data-dwh',     departmentId: 'dept-aps-4',   code: 'DATA-DWH',     name: 'Data Warehouse Team' },
  { id: 'team-tsc-chgrel',   departmentId: 'dept-aps-tsc', code: 'TSC-CHGREL',   name: 'Change & Release Management' },
  { id: 'team-tsc-scm',      departmentId: 'dept-aps-tsc', code: 'TSC-SCM',      name: 'Source Control & Test Env Services' },
  { id: 'team-tsc-test1',    departmentId: 'dept-aps-tsc', code: 'TSC-TEST-1',   name: 'Testing Team 1' },
  { id: 'team-tsc-test2',    departmentId: 'dept-aps-tsc', code: 'TSC-TEST-2',   name: 'Testing Team 2' },
  { id: 'team-ifm-noc',      departmentId: 'dept-ifm-ops', code: 'IFM-NOC',      name: 'Network Operations Center' },
  { id: 'team-sta-arch',     departmentId: 'dept-sta-arch',code: 'STA-EA',       name: 'Enterprise Architecture' },
  { id: 'team-ub-branch',    departmentId: 'dept-ub-retail',code: 'UB-BRANCH',   name: 'Branch Operations' },
];

const applications: Application[] = [
  { id: 'app-loan',    code: 'LOAN',    name: 'Loan Origination System', ownerTeamId: 'team-core-loan' },
  { id: 'app-deposit', code: 'DEPOSIT', name: 'Deposit Management',      ownerTeamId: 'team-core-deposit' },
  { id: 'app-mbank',   code: 'MBANK',   name: 'Mobile Banking',          ownerTeamId: 'team-ch-mobile' },
  { id: 'app-ibank',   code: 'IBANK',   name: 'Internet Banking',        ownerTeamId: 'team-ch-web' },
  { id: 'app-hrms',    code: 'HRMS',    name: 'HR Management System',    ownerTeamId: 'team-sup-hrms' },
  { id: 'app-dwh',     code: 'DWH',     name: 'Data Warehouse',          ownerTeamId: 'team-data-dwh' },
];

const functionalRoles: FunctionalRole[] = [
  { id: 'role-cm',  code: 'change_manager',     name: 'Change Manager',     description: 'Member of APS Change & Release team. Can create changes.',                            builtIn: true },
  { id: 'role-cab', code: 'cab_member',         name: 'CAB Member',         description: 'Sits on Change Advisory Board. Approves normal changes.',                             builtIn: true },
  { id: 'role-ea',  code: 'emergency_approver', name: 'Emergency Approver', description: 'Authorized to approve emergency changes (typically Dept Head+ CAB).',                builtIn: true },
  { id: 'role-as',  code: 'assessor',           name: 'Assessor',           description: "Assesses changes touching their team's applications.",                                builtIn: true },
  { id: 'role-ifm', code: 'ifm_operator',       name: 'IFM Operator',       description: 'Generic IFM access (placeholder until hierarchy detail is known).',                   builtIn: true },
  { id: 'role-sta', code: 'sta_member',         name: 'STA Member',         description: 'Generic STA access (read CMDB, reviewer in Change).',                                 builtIn: true },
  { id: 'role-req', code: 'requester',          name: 'Requester',          description: 'End user. Can submit own requests/incidents.',                                         builtIn: true },
];

const rbacUsers: RbacUser[] = [
  { id: 'u-super',       name: 'Super Admin',      email: 'admin@omni.local',              divisionId: null,      departmentId: null,           teamId: null,              level: null,          functionalRoles: [],                              isSuperadmin: true,  active: true },
  { id: 'u-aps-gh',      name: 'Andi Wibowo',      email: 'andi.wibowo@omni.local',        divisionId: 'div-aps', departmentId: null,           teamId: null,              level: 'group_head',  functionalRoles: [],                              isSuperadmin: false, active: true },
  { id: 'u-aps-channel-dh', name: 'Budi Santoso',  email: 'budi.santoso@omni.local',      divisionId: 'div-aps', departmentId: 'dept-aps-2',   teamId: null,              level: 'dept_head',   functionalRoles: ['cab_member'],                  isSuperadmin: false, active: true },
  { id: 'u-mbank-tl',    name: 'Citra Pratiwi',    email: 'citra.pratiwi@omni.local',     divisionId: 'div-aps', departmentId: 'dept-aps-2',   teamId: 'team-ch-mobile',  level: 'team_lead',   functionalRoles: ['assessor'],                    isSuperadmin: false, active: true },
  { id: 'u-mbank-off',   name: 'Dewi Anggraini',   email: 'dewi.anggraini@omni.local',    divisionId: 'div-aps', departmentId: 'dept-aps-2',   teamId: 'team-ch-mobile',  level: 'officer',     functionalRoles: [],                              isSuperadmin: false, active: true },
  { id: 'u-loan-off',    name: 'Eko Prasetyo',     email: 'eko.prasetyo@omni.local',      divisionId: 'div-aps', departmentId: 'dept-aps-1',   teamId: 'team-core-loan',  level: 'officer',     functionalRoles: [],                              isSuperadmin: false, active: true },
  { id: 'u-chgrel',      name: 'Fitri Handayani',  email: 'fitri.handayani@omni.local',   divisionId: 'div-aps', departmentId: 'dept-aps-tsc', teamId: 'team-tsc-chgrel', level: 'team_lead',   functionalRoles: ['change_manager'],               isSuperadmin: false, active: true },
  { id: 'u-aps-gh-cab',  name: 'Gunawan Suryadi',  email: 'gunawan.suryadi@omni.local',   divisionId: 'div-aps', departmentId: null,           teamId: null,              level: 'group_head',  functionalRoles: ['cab_member', 'emergency_approver'], isSuperadmin: false, active: true },
  { id: 'u-ifm-op',      name: 'Hadi Wijaya',      email: 'hadi.wijaya@omni.local',       divisionId: 'div-ifm', departmentId: 'dept-ifm-ops', teamId: 'team-ifm-noc',    level: 'officer',     functionalRoles: ['ifm_operator'],                isSuperadmin: false, active: true },
  { id: 'u-sta',         name: 'Indah Permata',    email: 'indah.permata@omni.local',     divisionId: 'div-sta', departmentId: 'dept-sta-arch',teamId: 'team-sta-arch',   level: 'officer',     functionalRoles: ['sta_member'],                  isSuperadmin: false, active: true },
  { id: 'u-biz',         name: 'Joko Susilo',      email: 'joko.susilo@omni.local',       divisionId: 'div-ub',  departmentId: 'dept-ub-retail',teamId: 'team-ub-branch',  level: 'requester',   functionalRoles: ['requester'],                   isSuperadmin: false, active: true },
];

// ─── Reports ─────────────────────────────────────────────────────────────────

const reports: Report[] = [
  {
    id: 'rpt-001', publicId: 'RPT-2026-00148', name: 'Monthly Service Reliability Summary — May 2026',
    description: 'Comprehensive monthly summary of service reliability, incident trends, and change management performance across all production services.',
    type: 'monthly_summary', frequency: 'monthly', timeRange: 'last_30d', serviceIds: [],
    includedMetrics: ['met-avail-001', 'met-inc-001', 'met-chg-001'], format: ['pdf'],
    deliverToUserIds: ['u-001', 'u-007'], deliverToEmails: ['sarah.chen@acme.io', 'tom.bergstrom@acme.io'],
    generatedCount: 5, lastRunAt: '2026-05-01T06:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-01T06:00:00Z', nextRunAt: '2026-06-01T06:00:00Z',
    availableVersions: [
      { id: 'rv-001', generatedAt: '2026-05-01T06:00:00Z', format: 'pdf', sizeKB: 248, downloadUrl: '/api/reports/rpt-001/versions/rv-001/download' },
      { id: 'rv-005', generatedAt: '2026-04-01T06:00:00Z', format: 'pdf', sizeKB: 231, downloadUrl: '/api/reports/rpt-001/versions/rv-005/download' },
    ],
    ownerId: 'u-001', ownerName: 'Sarah Chen', createdAt: '2026-01-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z',
  },
  {
    id: 'rpt-002', publicId: 'RPT-2026-00147', name: 'Monthly Incident Report — May 2026',
    description: 'Monthly analysis of incident volume, priority distribution, MTTR trends, and top recurring issues.',
    type: 'incident_report', frequency: 'monthly', timeRange: 'last_30d', serviceIds: [],
    includedMetrics: ['met-inc-001', 'met-inc-002', 'met-inc-003', 'met-avail-002'], format: ['pdf', 'excel'],
    deliverToUserIds: ['u-001', 'u-007', 'u-004'], deliverToEmails: ['sarah.chen@acme.io', 'tom.bergstrom@acme.io'],
    generatedCount: 5, lastRunAt: '2026-05-01T06:30:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-01T06:30:00Z', nextRunAt: '2026-06-01T06:30:00Z',
    availableVersions: [
      { id: 'rv-002', generatedAt: '2026-05-01T06:30:00Z', format: 'pdf',   sizeKB: 182, downloadUrl: '/api/reports/rpt-002/versions/rv-002/download' },
      { id: 'rv-006', generatedAt: '2026-04-01T06:30:00Z', format: 'excel', sizeKB: 94,  downloadUrl: '/api/reports/rpt-002/versions/rv-006/download' },
    ],
    ownerId: 'u-001', ownerName: 'Sarah Chen', createdAt: '2026-01-01T09:00:00Z', updatedAt: '2026-05-01T06:30:00Z',
  },
  {
    id: 'rpt-003', publicId: 'RPT-2026-00146', name: 'Q1 2026 Availability Review',
    description: 'Quarterly deep-dive into service availability, SLA compliance, outage impact analysis, and trend comparison vs prior quarter.',
    type: 'availability_report', frequency: 'quarterly', timeRange: 'last_90d', serviceIds: [],
    includedMetrics: ['met-avail-001', 'met-avail-002', 'met-avail-003', 'met-avail-004'], format: ['excel', 'pdf'],
    deliverToUserIds: ['u-001', 'u-007'], deliverToEmails: ['sarah.chen@acme.io'],
    generatedCount: 2, lastRunAt: '2026-04-01T06:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-04-01T06:00:00Z', nextRunAt: '2026-07-01T06:00:00Z',
    availableVersions: [
      { id: 'rv-003', generatedAt: '2026-04-01T06:00:00Z', format: 'excel', sizeKB: 512, downloadUrl: '/api/reports/rpt-003/versions/rv-003/download' },
      { id: 'rv-004', generatedAt: '2026-04-01T06:00:00Z', format: 'pdf',   sizeKB: 384, downloadUrl: '/api/reports/rpt-003/versions/rv-004/download' },
    ],
    ownerId: 'u-001', ownerName: 'Sarah Chen', createdAt: '2025-10-01T09:00:00Z', updatedAt: '2026-04-01T06:00:00Z',
  },
  {
    id: 'rpt-004', publicId: 'RPT-2026-00145', name: 'Weekly Change Management Summary',
    description: 'Weekly summary of change activity, success rates, CAB outcomes, and emergency changes.',
    type: 'change_report', frequency: 'weekly', timeRange: 'last_7d', serviceIds: [],
    includedMetrics: ['met-chg-001', 'met-chg-002', 'met-chg-003', 'met-chg-004'], format: ['pdf', 'csv'],
    deliverToUserIds: ['u-001', 'u-006', 'u-007'], deliverToEmails: ['sarah.chen@acme.io', 'helena.vasquez@acme.io'],
    generatedCount: 18, lastRunAt: '2026-05-05T06:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-05T06:00:00Z', nextRunAt: '2026-05-12T06:00:00Z',
    availableVersions: [
      { id: 'rv-007', generatedAt: '2026-05-05T06:00:00Z', format: 'pdf', sizeKB: 128, downloadUrl: '/api/reports/rpt-004/versions/rv-007/download' },
      { id: 'rv-008', generatedAt: '2026-04-28T06:00:00Z', format: 'pdf', sizeKB: 121, downloadUrl: '/api/reports/rpt-004/versions/rv-008/download' },
    ],
    ownerId: 'u-006', ownerName: 'Helena Vasquez', createdAt: '2026-01-06T09:00:00Z', updatedAt: '2026-05-05T06:00:00Z',
  },
  {
    id: 'rpt-005', publicId: 'RPT-2026-00144', name: 'SLA Compliance Report — Payment Service',
    description: 'Monthly SLA compliance report for the Payment Service including uptime, MTTR, error budget consumption, and incident breakdown.',
    type: 'sla_report', frequency: 'monthly', timeRange: 'last_30d', serviceIds: ['svc-001'],
    includedMetrics: ['met-avail-001', 'met-avail-002', 'met-avail-004', 'met-inc-001'], format: ['pdf', 'excel'],
    deliverToUserIds: ['u-007', 'u-001'], deliverToEmails: ['tom.bergstrom@acme.io', 'sarah.chen@acme.io'],
    generatedCount: 5, lastRunAt: '2026-05-01T07:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-01T07:00:00Z', nextRunAt: '2026-06-01T07:00:00Z',
    availableVersions: [
      { id: 'rv-009', generatedAt: '2026-05-01T07:00:00Z', format: 'pdf',   sizeKB: 174, downloadUrl: '/api/reports/rpt-005/versions/rv-009/download' },
      { id: 'rv-010', generatedAt: '2026-05-01T07:00:00Z', format: 'excel', sizeKB: 88,  downloadUrl: '/api/reports/rpt-005/versions/rv-010/download' },
    ],
    ownerId: 'u-007', ownerName: 'Tom Bergstrom', createdAt: '2026-01-01T09:00:00Z', updatedAt: '2026-05-01T07:00:00Z',
  },
  {
    id: 'rpt-006', publicId: 'RPT-2026-00143', name: 'Capacity Forecast Report — Q2 Planning',
    description: 'On-demand capacity forecast for Q2 2026 planning, covering CPU, memory, and storage projections across all production services.',
    type: 'capacity_report', frequency: 'on_demand', timeRange: 'custom', serviceIds: [],
    includedMetrics: ['met-cap-001', 'met-cap-002', 'met-cap-003'], format: ['excel', 'pdf'],
    deliverToUserIds: ['u-001', 'u-007'], deliverToEmails: ['sarah.chen@acme.io'],
    generatedCount: 3, lastRunAt: '2026-05-05T10:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-05T10:00:00Z',
    availableVersions: [
      { id: 'rv-011', generatedAt: '2026-05-05T10:00:00Z', format: 'excel', sizeKB: 642, downloadUrl: '/api/reports/rpt-006/versions/rv-011/download' },
      { id: 'rv-012', generatedAt: '2026-05-05T10:00:00Z', format: 'pdf',   sizeKB: 298, downloadUrl: '/api/reports/rpt-006/versions/rv-012/download' },
    ],
    ownerId: 'u-001', ownerName: 'Sarah Chen', createdAt: '2026-04-28T09:00:00Z', updatedAt: '2026-05-05T10:00:00Z',
  },
  {
    id: 'rpt-007', publicId: 'RPT-2026-00142', name: 'Service Request Fulfillment Statistics',
    description: 'Weekly report on service request volumes, fulfillment times, SLA compliance by category, and backlog trends.',
    type: 'custom', frequency: 'weekly', timeRange: 'last_7d', serviceIds: [],
    includedMetrics: ['met-sr-001'], format: ['csv', 'pdf'],
    deliverToUserIds: ['u-001'], deliverToEmails: ['sarah.chen@acme.io'],
    generatedCount: 12, lastRunAt: '2026-05-05T07:00:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-05T07:00:00Z', nextRunAt: '2026-05-12T07:00:00Z',
    availableVersions: [
      { id: 'rv-013', generatedAt: '2026-05-05T07:00:00Z', format: 'pdf', sizeKB: 96, downloadUrl: '/api/reports/rpt-007/versions/rv-013/download' },
    ],
    ownerId: 'u-001', ownerName: 'Sarah Chen', createdAt: '2026-02-03T09:00:00Z', updatedAt: '2026-05-05T07:00:00Z',
  },
  {
    id: 'rpt-008', publicId: 'RPT-2026-00141', name: 'Security & Compliance Summary — Apr 2026',
    description: 'Monthly security and compliance summary covering audit findings, policy violations, patch compliance, and open risk items.',
    type: 'custom', frequency: 'monthly', timeRange: 'last_30d', serviceIds: [], includedMetrics: [], format: ['pdf'],
    deliverToUserIds: ['u-001', 'u-010'], deliverToEmails: ['sarah.chen@acme.io', 'emma.muller@acme.io'],
    generatedCount: 4, lastRunAt: '2026-05-01T07:30:00Z', lastRunStatus: 'success', lastGeneratedAt: '2026-05-01T07:30:00Z', nextRunAt: '2026-06-01T07:30:00Z',
    availableVersions: [
      { id: 'rv-014', generatedAt: '2026-05-01T07:30:00Z', format: 'pdf', sizeKB: 318, downloadUrl: '/api/reports/rpt-008/versions/rv-014/download' },
      { id: 'rv-015', generatedAt: '2026-04-01T07:30:00Z', format: 'pdf', sizeKB: 304, downloadUrl: '/api/reports/rpt-008/versions/rv-015/download' },
    ],
    ownerId: 'u-010', ownerName: 'Emma Müller', createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-05-01T07:30:00Z',
  },
];

// ─── Measurement Dashboards ───────────────────────────────────────────────────

const measurementDashboards: MeasurementDashboard[] = [
  {
    id: 'dash-001', publicId: 'DASH-EXEC-001', name: 'Executive Dashboard',
    description: 'High-level service health and reliability snapshot for leadership',
    type: 'executive', audience: 'executives', refreshInterval: 0, defaultTimeRange: '30d',
    timeRangeOptions: ['7d', '30d', '90d', 'custom'], serviceFilter: true,
    ownerId: 'u-001', ownerName: 'Sarah Chen', viewCount30d: 142, lastViewedAt: '2026-05-10T08:00:00Z',
    widgets: [
      { id: 'w-001', type: 'kpi_card',   title: 'Overall SLA Compliance',          span: 1, metricIds: ['met-avail-001'] },
      { id: 'w-002', type: 'kpi_card',   title: 'MTTR (30d)',                      span: 1, metricIds: ['met-avail-002'] },
      { id: 'w-003', type: 'kpi_card',   title: 'Change Success Rate',             span: 1, metricIds: ['met-chg-001'] },
      { id: 'w-004', type: 'kpi_card',   title: 'Active Incidents',                span: 1, metricIds: ['met-inc-001'] },
      { id: 'w-005', type: 'line_chart', title: 'Availability Trend (8 services)', span: 4, metricIds: ['met-avail-001'] },
      { id: 'w-006', type: 'bar_chart',  title: 'Incident Volume by Priority',     span: 2, metricIds: ['met-inc-001'] },
      { id: 'w-007', type: 'pie_chart',  title: 'Change Outcomes',                 span: 2, metricIds: ['met-chg-001'] },
      { id: 'w-008', type: 'table',      title: 'SLA Compliance by Service',       span: 4, metricIds: ['met-avail-001'] },
    ],
    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-04-15T00:00:00Z',
  },
  {
    id: 'dash-002', publicId: 'DASH-OPS-001', name: 'Operational Dashboard',
    description: 'Real-time operational health for the on-call team',
    type: 'operational', audience: 'operations', refreshInterval: 60, defaultTimeRange: '7d',
    timeRangeOptions: ['1h', '4h', '24h', '7d', 'custom'], serviceFilter: true,
    ownerId: 'u-004', ownerName: 'David Okafor', viewCount30d: 389, lastViewedAt: '2026-05-10T09:48:00Z',
    widgets: [
      { id: 'w-009', type: 'kpi_card',   title: 'Active P1/P2 Incidents',        span: 1, metricIds: ['met-inc-001'] },
      { id: 'w-010', type: 'kpi_card',   title: 'MTTR (24h)',                    span: 1, metricIds: ['met-avail-002'] },
      { id: 'w-011', type: 'kpi_card',   title: 'Error Budget Remaining',        span: 1, metricIds: ['met-avail-004'] },
      { id: 'w-012', type: 'kpi_card',   title: 'Capacity At-Risk Metrics',      span: 1, metricIds: ['met-cap-003'] },
      { id: 'w-013', type: 'heatmap',    title: 'Service Health Heatmap (7d)',   span: 4, metricIds: ['met-avail-001'] },
      { id: 'w-014', type: 'line_chart', title: 'Error Rate Trend',              span: 2, metricIds: ['met-avail-001'] },
      { id: 'w-015', type: 'bar_chart',  title: 'Incident Volume (24h)',         span: 2, metricIds: ['met-inc-001'] },
      { id: 'w-016', type: 'table',      title: 'Open Incidents by Service',     span: 4, metricIds: ['met-inc-001'] },
    ],
    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'dash-003', publicId: 'DASH-SLA-001', name: 'SLA & Reliability Dashboard',
    description: 'SLA compliance, error budgets, and reliability metrics for service owners',
    type: 'sla', audience: 'service_owners', refreshInterval: 0, defaultTimeRange: '30d',
    timeRangeOptions: ['7d', '30d', '90d', 'custom'], serviceFilter: true,
    ownerId: 'u-007', ownerName: 'Tom Bergstrom', viewCount30d: 87, lastViewedAt: '2026-05-07T14:00:00Z',
    widgets: [
      { id: 'w-017', type: 'bar_chart',  title: 'SLA Compliance by Service (30d)', span: 4, metricIds: ['met-avail-001'] },
      { id: 'w-018', type: 'line_chart', title: 'Error Budget Burn Rate',          span: 2, metricIds: ['met-avail-004'] },
      { id: 'w-019', type: 'pie_chart',  title: 'Incidents by Root Cause',         span: 2, metricIds: ['met-inc-001'] },
      { id: 'w-020', type: 'table',      title: 'SLA Targets vs Actuals',          span: 4, metricIds: ['met-avail-001'] },
      { id: 'w-021', type: 'line_chart', title: 'MTTR Trend (90d)',                span: 2, metricIds: ['met-avail-002'] },
      { id: 'w-022', type: 'bar_chart',  title: 'Change Success Rate by Team',     span: 2, metricIds: ['met-chg-001'] },
    ],
    createdAt: '2025-10-01T09:00:00Z', updatedAt: '2026-03-15T00:00:00Z',
  },
];

// ─── Metric Definitions ───────────────────────────────────────────────────────

const metricDefinitions: MetricDefinition[] = [
  { id: 'met-avail-001', publicId: 'MET-AVAIL-001', name: 'overall_service_availability',      displayName: 'Service Availability (avg)',               description: 'Average uptime percentage across all production services, rolling 30-day window. Used as the primary SLA compliance indicator.',                                                                       category: 'availability',         valueType: 'percentage', unit: '%',                   formula: 'avg(uptime_seconds / total_seconds * 100) per service, rolling 30d',                                                                                              currentValue: 99.32, target: 99.85, trend: 'down', trendPercent: -0.18, industryBenchmark: 99.9,  benchmarkSource: 'ITIL 4 Gold Standard',                sourceSystem: 'OIS Internal',    updateFrequency: 'hourly',     usedInDashboardIds: ['dash-001', 'dash-003'],        usedInReportIds: ['rpt-001', 'rpt-003', 'rpt-005'], ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['sla', 'uptime', 'reliability'],     createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-avail-002', publicId: 'MET-AVAIL-002', name: 'mean_time_to_resolve',              displayName: 'MTTR',                                    description: 'Mean Time To Resolve across all incidents (P1-P4), rolling 30-day window. Lower is better.',                                                                                                             category: 'availability',         valueType: 'duration',   unit: 'minutes',             formula: 'avg(resolved_at - created_at) per incident, rolling 30d, P1-P4',                                                                                                  currentValue: 134,   target: 30,    trend: 'down', trendPercent: -8,    industryBenchmark: 60,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'real-time',  usedInDashboardIds: ['dash-001', 'dash-002'],        usedInReportIds: ['rpt-001', 'rpt-002'],            ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['mttr', 'incident', 'reliability'],  createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-avail-003', publicId: 'MET-AVAIL-003', name: 'mean_time_between_failures',       displayName: 'MTBF',                                    description: 'Mean Time Between Failures — average time between production incidents, rolling 90-day window. Higher is better.',                                                                                        category: 'availability',         valueType: 'duration',   unit: 'days',                formula: 'total_uptime_hours / number_of_failures, rolling 90d',                                                                                                            currentValue: 18,    target: 14,   trend: 'up',   trendPercent: 12,    industryBenchmark: 21,    benchmarkSource: 'ITIL 4 Gold Standard',                sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: ['dash-003'],                    usedInReportIds: ['rpt-003'],                       ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['mtbf', 'reliability', 'uptime'],    createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-avail-004', publicId: 'MET-AVAIL-004', name: 'error_budget_remaining',           displayName: 'Error Budget Remaining',                  description: 'Percentage of SLA error budget remaining across all services, rolling 30-day window. At 0% the SLA is breached.',                                                                                     category: 'availability',         valueType: 'percentage', unit: '%',                   formula: '(allowed_downtime_minutes - actual_downtime_minutes) / allowed_downtime_minutes * 100, rolling 30d',                                                              currentValue: 52,    target: 100,  trend: 'down', trendPercent: -15,                                                                               sourceSystem: 'OIS Internal',    updateFrequency: 'hourly',     usedInDashboardIds: ['dash-002', 'dash-003'],        usedInReportIds: ['rpt-003', 'rpt-005'],            ownerId: 'u-007', ownerName: 'Tom Bergstrom', tags: ['error-budget', 'sla', 'slo'],       createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-chg-001',   publicId: 'MET-CHG-001',   name: 'change_success_rate',              displayName: 'Change Success Rate',                     description: 'Percentage of implemented changes that completed without rollback or failure, rolling 30-day window.',                                                                                                    category: 'change_management',    valueType: 'percentage', unit: '%',                   formula: 'count(changes WHERE status = closed_successful) / count(changes WHERE status IN (closed_successful, closed_failed)) * 100, rolling 30d',                          currentValue: 87,    target: 95,   trend: 'up',   trendPercent: 2,     industryBenchmark: 90,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: ['dash-001'],                    usedInReportIds: ['rpt-001', 'rpt-004'],            ownerId: 'u-006', ownerName: 'Helena Vasquez',tags: ['change', 'quality', 'reliability'],  createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-chg-002',   publicId: 'MET-CHG-002',   name: 'change_lead_time',                 displayName: 'Change Lead Time (submission to implementation)', description: 'Average time from change submission to implementation completion, in days. Measures change process efficiency.',                                                                            category: 'change_management',    valueType: 'duration',   unit: 'days',                formula: 'avg(implemented_at - submitted_at) per change, rolling 30d',                                                                                                      currentValue: 5.2,   target: 3.0,  trend: 'stable',                     industryBenchmark: 4.0,   benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-004'],                       ownerId: 'u-006', ownerName: 'Helena Vasquez',tags: ['change', 'lead-time', 'process'],    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-chg-003',   publicId: 'MET-CHG-003',   name: 'change_failure_rate',              displayName: 'Change Failure Rate',                     description: 'Percentage of implemented changes that resulted in failure, rollback, or incident, rolling 30-day window. Lower is better.',                                                                          category: 'change_management',    valueType: 'percentage', unit: '%',                   formula: 'count(changes WHERE status = closed_failed OR caused_incident = true) / count(implemented_changes) * 100, rolling 30d',                                         currentValue: 13,    target: 5,    trend: 'up',   trendPercent: 8,     industryBenchmark: 10,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-001', 'rpt-004'],            ownerId: 'u-006', ownerName: 'Helena Vasquez',tags: ['change', 'quality', 'failure'],      createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-chg-004',   publicId: 'MET-CHG-004',   name: 'emergency_change_rate',            displayName: 'Emergency Change Rate',                   description: 'Percentage of changes classified as emergency, rolling 30-day window. High rates indicate reactive rather than planned operations.',                                                                category: 'change_management',    valueType: 'percentage', unit: '%',                   formula: 'count(changes WHERE type = emergency) / count(all_changes) * 100, rolling 30d',                                                                                  currentValue: 7,     target: 5,    trend: 'stable',                     industryBenchmark: 8,     benchmarkSource: 'ITIL 4 Practice Guide',               sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-004'],                       ownerId: 'u-006', ownerName: 'Helena Vasquez',tags: ['change', 'emergency', 'process'],    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-inc-001',   publicId: 'MET-INC-001',   name: 'p1_p2_incident_count',             displayName: 'P1/P2 Incident Count (30d)',              description: 'Total count of P1 and P2 priority incidents in the rolling 30-day window.',                                                                                                                              category: 'incident_management', valueType: 'count',      unit: 'incidents',           formula: 'count(incidents WHERE priority IN (P1, P2) AND created_at >= now() - 30d)',                                                                                       currentValue: 8,     target: 5,    trend: 'up',   trendPercent: 14,    industryBenchmark: 4,     benchmarkSource: 'ITIL 4 Elite Benchmark',              sourceSystem: 'OIS Internal',    updateFrequency: 'real-time',  usedInDashboardIds: ['dash-001', 'dash-002'],        usedInReportIds: ['rpt-001', 'rpt-002'],            ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['incident', 'p1', 'p2', 'volume'],   createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-inc-002',   publicId: 'MET-INC-002',   name: 'first_response_sla_compliance',    displayName: 'First Response SLA Compliance',           description: 'Percentage of incidents that received a first response within the SLA target for their priority, rolling 30-day window.',                                                                              category: 'incident_management', valueType: 'percentage', unit: '%',                   formula: 'count(incidents WHERE first_response_within_sla = true) / count(all_incidents) * 100, rolling 30d',                                                              currentValue: 94.4,  target: 95,   trend: 'stable',                     industryBenchmark: 95,    benchmarkSource: 'ITIL 4 Gold Standard',                sourceSystem: 'OIS Internal',    updateFrequency: 'real-time',  usedInDashboardIds: ['dash-002'],                    usedInReportIds: ['rpt-002'],                       ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['incident', 'sla', 'response'],      createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-inc-003',   publicId: 'MET-INC-003',   name: 'repeat_incident_rate',             displayName: 'Repeat Incident Rate',                    description: 'Percentage of incidents that are recurrences of a previously resolved incident, rolling 30-day window. Indicates inadequate root cause resolution.',                                                category: 'incident_management', valueType: 'percentage', unit: '%',                   formula: 'count(incidents WHERE is_repeat = true) / count(all_incidents) * 100, rolling 30d',                                                                              currentValue: 24,    target: 10,   trend: 'stable',                     industryBenchmark: 15,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-002'],                       ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['incident', 'repeat', 'quality'],    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-inc-004',   publicId: 'MET-INC-004',   name: 'incident_to_problem_conversion_rate', displayName: 'Incident → Problem Conversion Rate',  description: 'Percentage of closed incidents that triggered a problem record for root cause investigation, rolling 30-day window.',                                                                          category: 'incident_management', valueType: 'percentage', unit: '%',                   formula: 'count(incidents WHERE linked_problem_id IS NOT NULL) / count(closed_incidents) * 100, rolling 30d',                                                              currentValue: 32,    target: 20,   trend: 'up',   trendPercent: 4,                                                                                     sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-002'],                       ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['incident', 'problem', 'process'],   createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-cap-001',   publicId: 'MET-CAP-001',   name: 'avg_cpu_utilization_production',   displayName: 'Avg CPU Utilization (production)',        description: 'Average CPU utilization across all production compute nodes, rolling 24-hour window.',                                                                                                                  category: 'capacity',             valueType: 'percentage', unit: '%',                   formula: 'avg(cpu_utilization_percent) across all production nodes, rolling 24h',                                                                                           currentValue: 62,    target: 70,   trend: 'up',   trendPercent: 5,     industryBenchmark: 65,    benchmarkSource: 'AWS Well-Architected Framework',      sourceSystem: 'Prometheus',      updateFrequency: 'real-time',  usedInDashboardIds: ['dash-002'],                    usedInReportIds: ['rpt-006'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['capacity', 'cpu', 'infrastructure'],createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-cap-002',   publicId: 'MET-CAP-002',   name: 'avg_memory_utilization_production',displayName: 'Avg Memory Utilization (production)',     description: 'Average memory utilization across all production compute nodes, rolling 24-hour window.',                                                                                                               category: 'capacity',             valueType: 'percentage', unit: '%',                   formula: 'avg(memory_utilization_percent) across all production nodes, rolling 24h',                                                                                        currentValue: 71,    target: 80,   trend: 'stable',                     industryBenchmark: 70,    benchmarkSource: 'AWS Well-Architected Framework',      sourceSystem: 'Prometheus',      updateFrequency: 'real-time',  usedInDashboardIds: ['dash-002'],                    usedInReportIds: ['rpt-006'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['capacity', 'memory', 'infrastructure'],     createdAt: '2025-06-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-cap-003',   publicId: 'MET-CAP-003',   name: 'capacity_at_risk_metrics_count',   displayName: 'Capacity At-Risk Metrics Count',          description: 'Count of capacity metrics currently in warning or critical threshold breach. Target is zero.',                                                                                                        category: 'capacity',             valueType: 'count',      unit: 'metrics',             formula: 'count(capacity_metrics WHERE status IN (warning, critical))',                                                                                                     currentValue: 3,     target: 0,    trend: 'stable',                                                                                                                                  sourceSystem: 'OIS Internal',    updateFrequency: 'real-time',  usedInDashboardIds: ['dash-002'],                    usedInReportIds: ['rpt-006'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['capacity', 'risk', 'threshold'],    createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-10T06:00:00Z' },
  { id: 'met-rel-001',   publicId: 'MET-REL-001',   name: 'deployment_success_rate',          displayName: 'Deployment Success Rate',                 description: 'Percentage of deployments that completed successfully without rollback, rolling 30-day window.',                                                                                                      category: 'reliability',          valueType: 'percentage', unit: '%',                   formula: 'count(deployments WHERE status = success) / count(all_deployments) * 100, rolling 30d',                                                                           currentValue: 87,    target: 95,   trend: 'stable',                     industryBenchmark: 92,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'real-time',  usedInDashboardIds: [],                              usedInReportIds: ['rpt-001'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['deployment', 'reliability', 'quality'],     createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-rel-002',   publicId: 'MET-REL-002',   name: 'deployment_frequency',             displayName: 'Deployment Frequency (per service per week)', description: 'Average number of deployments per service per week, rolling 30-day window. Higher indicates greater delivery velocity.',                                                                          category: 'reliability',          valueType: 'ratio',      unit: 'deployments/week',    formula: 'count(deployments) / count(active_services) / weeks_in_period, rolling 30d',                                                                                     currentValue: 3.2,   target: 5.0,  trend: 'stable',                     industryBenchmark: 4.8,   benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-001'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['deployment', 'frequency', 'dora'],  createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-rel-003',   publicId: 'MET-REL-003',   name: 'test_pass_rate',                   displayName: 'Test Pass Rate',                          description: 'Percentage of test cases passing in CI pipelines, rolling 7-day window.',                                                                                                                            category: 'reliability',          valueType: 'percentage', unit: '%',                   formula: 'count(test_cases WHERE result = passed) / count(all_test_cases) * 100, rolling 7d',                                                                              currentValue: 91,    target: 95,   trend: 'up',   trendPercent: 3,     industryBenchmark: 93,    benchmarkSource: 'DORA 2024 State of DevOps',           sourceSystem: 'CI/CD Platform',  updateFrequency: 'real-time',  usedInDashboardIds: [],                              usedInReportIds: ['rpt-001'],                       ownerId: 'u-004', ownerName: 'David Okafor',  tags: ['testing', 'quality', 'ci'],         createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-sr-001',    publicId: 'MET-SR-001',    name: 'service_request_fulfillment_time', displayName: 'Service Request Fulfillment Time (avg hours)', description: 'Average time from service request submission to fulfillment, in hours, rolling 30-day window.',                                                                                              category: 'service_request',      valueType: 'duration',   unit: 'hours',               formula: 'avg(fulfilled_at - submitted_at) per request, rolling 30d',                                                                                                       currentValue: 28.4,  target: 24.0, trend: 'down', trendPercent: -5,    industryBenchmark: 24,    benchmarkSource: 'ITIL 4 Practice Guide',               sourceSystem: 'OIS Internal',    updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: ['rpt-007'],                       ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['service-request', 'fulfillment', 'sla'], createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
  { id: 'met-kb-001',    publicId: 'MET-KB-001',    name: 'kb_helpful_rate',                  displayName: 'KB Helpful Rate',                         description: 'Percentage of knowledge base article ratings that are positive ("helpful"), rolling 30-day window.',                                                                                              category: 'knowledge',            valueType: 'percentage', unit: '%',                   formula: 'count(kb_ratings WHERE rating = helpful) / count(all_kb_ratings) * 100, rolling 30d',                                                                            currentValue: 91,    target: 85,   trend: 'up',   trendPercent: 2,     industryBenchmark: 80,    benchmarkSource: 'HDI Knowledge Management Benchmark 2024', sourceSystem: 'OIS Internal', updateFrequency: 'daily',      usedInDashboardIds: [],                              usedInReportIds: [],                                ownerId: 'u-001', ownerName: 'Sarah Chen',    tags: ['knowledge', 'quality', 'self-service'], createdAt: '2025-09-01T09:00:00Z', updatedAt: '2026-05-01T06:00:00Z' },
];

// ─── ROI Calculations + Benefit Measurements ──────────────────────────────────

const roiCalculations: ROICalculation[] = [
  { initiativeId: 'imp-011', calculatedAt: '2026-04-25T00:00:00Z', implementationCostUSD: 9600,  ongoingMonthlyCostUSD: 200, totalCost12mUSD: 12000, projectedAnnualBenefitUSD: 320000, actualBenefitToDateUSD: 0, roi12mPercent: 2567, paybackMonths: 0.45, npv5yUSD: 1480000, pessimisticROI: 1283, optimisticROI: 3208 },
  { initiativeId: 'imp-012', calculatedAt: '2026-05-05T00:00:00Z', implementationCostUSD: 4000,  ongoingMonthlyCostUSD: 0,   totalCost12mUSD: 4000,  projectedAnnualBenefitUSD: 180000, actualBenefitToDateUSD: 0, roi12mPercent: 4400, paybackMonths: 0.27, npv5yUSD: 820000,  pessimisticROI: 2200, optimisticROI: 5500 },
  { initiativeId: 'imp-006', calculatedAt: '2026-03-10T00:00:00Z', implementationCostUSD: 16000, ongoingMonthlyCostUSD: 0,   totalCost12mUSD: 16000, projectedAnnualBenefitUSD: 480000, actualBenefitToDateUSD: 0, roi12mPercent: 2900, paybackMonths: 0.4,  npv5yUSD: 2200000, pessimisticROI: 1450, optimisticROI: 3625 },
];

const benefitMeasurements: BenefitMeasurement[] = [
  { id: 'bm-001', initiativeId: 'imp-009', initiativePublicId: 'IMP-2026-00009', measurementDate: '2026-05-10', periodLabel: 'Month 1 (post-completion)', benefitType: 'risk_reduction',  measuredValueUSD: 2000,  cumulativeValueUSD: 2000,  isEstimate: false, supportingMetric: 'INC-2026-00184 detected 8 min earlier due to reduced cooldown', methodology: 'Estimated 8 min reduction × avg P1 cost of $800/min',                          recordedById: 'u-005', recordedByName: 'Yuki Tanaka' },
  { id: 'bm-002', initiativeId: 'imp-005', initiativePublicId: 'IMP-2026-00005', measurementDate: '2026-04-01', periodLabel: 'Q1 Audit (actual)',          benefitType: 'efficiency_gain', measuredValueUSD: 60000, cumulativeValueUSD: 60000, isEstimate: false, supportingMetric: '3 days saved × 4 engineers at $5k/day rate',                    methodology: 'Engineer time tracking during Q1 2026 PCI audit vs 2025 baseline', recordedById: 'u-001', recordedByName: 'Sarah Chen' },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const seedDocuments = async (prisma: PrismaClient, tenantId: string) => {
  const batches: Array<{ kind: string; items: ReadonlyArray<unknown> }> = [
    { kind: 'notification',         items: notifications },
    { kind: 'notification-pref',    items: notificationPreferences },
    { kind: 'quiet-hours',          items: [quietHours] },
    { kind: 'inbox-legacy',         items: legacyInboxItems },
    { kind: 'inbox-item',           items: inboxItems },
    { kind: 'on-call-schedule',     items: onCallSchedules },
    { kind: 'on-call-override',     items: onCallOverrides },
    { kind: 'status-page-entry',    items: statusPageEntries },
    { kind: 'status-page-incident', items: statusPageIncidents },
    { kind: 'rbac-user',            items: rbacUsers },
    { kind: 'rbac-team',            items: rbacTeams },
    { kind: 'rbac-application',     items: applications },
    { kind: 'rbac-department',      items: departments },
    { kind: 'rbac-division',        items: divisions },
    { kind: 'rbac-role',            items: functionalRoles },
    { kind: 'report',               items: reports },
    { kind: 'roi-calc',             items: roiCalculations },
    { kind: 'benefit-measurement',  items: benefitMeasurements },
    { kind: 'measurement-dashboard',items: measurementDashboards },
    { kind: 'metric-def',           items: metricDefinitions },
    { kind: 'kb-feedback',          items: kbFeedback },
    { kind: 'kb-analytics',         items: [kbAnalytics] },
  ];

  for (const b of batches) {
    if (!b.items.length) continue;
    await prisma.document.createMany({ data: buildBatch(tenantId, b.kind, b.items) });
  }
};
