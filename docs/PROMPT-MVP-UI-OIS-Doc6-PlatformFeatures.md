# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 6 — Platform Features: Inbox, Notifications, On-Call, Status Page, Profile

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a + 4b + 5a + 5b + 5c sudah di-execute di Build Mode session yang sama.
> **Module:** Platform Features (cross-cutting — §7.16, §7.17)
> **Routes covered:** `/inbox`, `/notifications/preferences`, `/on-call`, `/on-call/schedule`, `/on-call/overrides`, `/status`, `/profile`, `/settings`
> **This is the FINAL document. After this, all routes are real.**

---

## 🎯 SCOPE & MISSION

Doc 6 activates all platform features that were **placeholder** since Doc 0. The mission: close every open loop.

1. **Inbox** (`/inbox`) — The unified notification center. All 7 `mockInboxItems` from Doc 0 become a real threaded view.
2. **Notification Preferences** (`/notifications/preferences`) — Per-topic, per-channel control. The "Preferences" link in topbar finally works.
3. **On-Call Management** (`/on-call`, `/on-call/schedule`, `/on-call/overrides`) — View who's on-call, manage schedules, override for coverage gaps.
4. **Internal Status Page** (`/status`) — Service status board. The "View status page" link from the War Room (Doc 3a) now works.
5. **User Profile & Settings** (`/profile`, `/settings`) — Profile editor, API tokens, display preferences.

**After Doc 6:**
- Every sidebar link navigates to a real page
- Every inbox item links to real content
- Every notification links to real content
- The War Room "status page" link works
- The topbar avatar menu links work

**Reuse from Doc 0–5c:**
- AppShell, all UI primitives, formatters, all mock data
- All cross-links are now real — no more placeholder routes

**To be added in Doc 6:**
- Domain types: `InboxThread`, `InboxMessage`, `NotificationPreference`, `OnCallSchedule`, `OnCallShift`, `OnCallOverride`, `StatusPageEntry`
- Mock data: expand existing inbox/notification data, add on-call schedules, status page data
- Module components in `src/components/inbox/`, `src/components/oncall/`, `src/components/status/`
- 8 route implementations

---

## 🧩 DOMAIN TYPES (`src/types/platform.ts`)

```typescript
// ============================================================
// INBOX
// ============================================================

export type InboxItemType =
  | 'approval_request'      // CAB vote, sign-off, service request
  | 'mention'               // @mention in comment/note
  | 'incident_update'       // Incident status change, P1 comms
  | 'assignment'            // Assigned to incident/ticket/task
  | 'sla_warning'           // SLA about to breach
  | 'system_alert'          // Capacity threshold, SLA breach
  | 'report_ready'          // Generated report available
  | 'kb_review'             // KB article needs review
  | 'dr_test_reminder';     // Upcoming DR test

export type InboxItemPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  priority: InboxItemPriority;

  // Display
  title: string;
  summary: string;             // 1-2 sentence preview
  body?: string;               // Markdown body (for expandable inline)

  // Source entity
  sourceType: string;          // e.g. 'change', 'incident', 'report'
  sourcePublicId: string;      // e.g. 'CHG-2026-00091'
  sourceTitle: string;         // Denormalized
  sourceUrl: string;           // Navigate to this route on click

  // Sender
  senderId: string | 'system';
  senderName: string;
  senderAvatarUrl?: string;

  // State
  isRead: boolean;
  isArchived: boolean;
  isPinned: boolean;
  requiresAction: boolean;     // Must act (approve/reject/etc.)

  // Actions available on this item
  primaryAction?: {
    label: string;             // e.g. "Approve", "Review now"
    navigateTo: string;        // Route to navigate
  };
  secondaryAction?: {
    label: string;             // e.g. "View details"
    navigateTo: string;
  };

  // Timestamps
  receivedAt: string;
  expiresAt?: string;          // For time-sensitive items
  readAt?: string;
  archivedAt?: string;
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'slack';

export type NotificationTopic =
  | 'incident_assigned'
  | 'incident_update_p1p2'
  | 'incident_update_any'
  | 'sla_warning'
  | 'sla_breach'
  | 'approval_request'
  | 'mention'
  | 'change_in_my_services'
  | 'deployment_in_my_services'
  | 'capacity_alert'
  | 'report_ready'
  | 'kb_review_due'
  | 'dr_test_reminder'
  | 'on_call_shift_start'
  | 'on_call_escalation';

export interface NotificationPreference {
  userId: string;
  topic: NotificationTopic;
  channels: NotificationChannel[];  // Enabled channels for this topic
  // Quiet hours override per topic
  respectQuietHours: boolean;
  // Urgency override (e.g. P1 always notifies regardless of quiet hours)
  overrideForUrgent: boolean;
}

export interface QuietHoursConfig {
  userId: string;
  enabled: boolean;
  timezone: string;
  fromHour: number;  // 0-23
  toHour: number;
  daysOfWeek: number[];  // 0=Sun
}

// ============================================================
// ON-CALL
// ============================================================

export type OnCallShiftType = 'primary' | 'secondary' | 'shadow';

export interface OnCallSchedule {
  id: string;
  publicId: string;           // e.g. "ONC-PLATFORM-001"
  name: string;               // e.g. "Platform On-Call"
  teamId: string;
  teamName: string;
  description?: string;

  // Current on-call
  currentPrimaryId: string;
  currentPrimaryName: string;
  currentSecondaryId?: string;
  currentSecondaryName?: string;

  // Rotation config
  rotationIntervalDays: number;  // How often it rotates (7 = weekly)
  rotationStartDayOfWeek: number;  // 0=Sun
  rotationTime: string;          // "09:00" UTC

  // Schedule members (ordered rotation)
  members: Array<{
    userId: string;
    userName: string;
    shiftOrder: number;
  }>;

  // Upcoming shifts (pre-computed for next 4 weeks)
  upcomingShifts: OnCallShift[];

  // Stats
  activeIncidentCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface OnCallShift {
  id: string;
  scheduleId: string;
  userId: string;
  userName: string;
  shiftType: OnCallShiftType;
  startAt: string;  // ISO
  endAt: string;    // ISO
  isCurrentShift: boolean;
  isOverridden: boolean;
  overrideById?: string;
  overrideByName?: string;
}

export interface OnCallOverride {
  id: string;
  publicId: string;            // e.g. "OVR-2026-00012"
  scheduleId: string;
  scheduleName: string;

  // Who
  originalUserId: string;
  originalUserName: string;
  overrideUserId: string;
  overrideUserName: string;

  // When
  startAt: string;
  endAt: string;
  reason?: string;

  // Approval
  requestedById: string;
  requestedByName: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  createdAt: string;
}

// ============================================================
// STATUS PAGE
// ============================================================

export type StatusPageEntryStatus =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export interface StatusPageEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;  // Brief public description

  // Current status
  status: StatusPageEntryStatus;
  statusMessage?: string;        // Human message, e.g. "Investigating latency issue"

  // Linked to real data
  linkedOutagePublicId?: string;
  linkedIncidentPublicId?: string;

  // Last update
  lastUpdatedAt: string;
  lastUpdatedByName?: string;

  // Uptime (last 90 days — drives small history bar)
  uptime90d: number;             // %

  // Sort order
  displayOrder: number;
}

export interface StatusPageIncident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  affectedServiceIds: string[];
  updates: Array<{
    id: string;
    timestamp: string;
    body: string;               // Markdown
    authorName: string;
  }>;
  startedAt: string;
  resolvedAt?: string;
}
```

In `src/types/index.ts`:
```typescript
export * from './platform';
```

---

## 🗄 MOCK DATA

### `src/mocks/inboxItems.ts` — Replace Doc 0 placeholder with full objects

Doc 0 defined 7 `mockInboxItems`. **Replace all with full `InboxItem` objects:**

```typescript
export const mockInboxItems: InboxItem[] = [
  {
    id: 'ibx-001',
    type: 'approval_request',
    priority: 'urgent',
    title: 'CAB approval needed: CHG-2026-00091',
    summary: 'Migrate payment-api to pgbouncer — scheduled Friday 14:00 UTC. 1 of 3 votes cast.',
    body: `Tom Bergstrom has approved. Your vote as Change Manager is required before Thursday CAB session.\n\n**Change:** Migrate payment-api to pgbouncer connection pooling\n**Risk:** Medium (58/100)\n**Window:** Friday May 10, 14:00–16:00 UTC\n**Linked problem:** PRB-2026-00018 (recurring memory pressure)`,
    sourceType: 'change',
    sourcePublicId: 'CHG-2026-00091',
    sourceTitle: 'Migrate payment-api to pgbouncer connection pooling',
    sourceUrl: '/changes/CHG-2026-00091',
    senderId: 'system',
    senderName: 'Change Management',
    isRead: false, isArchived: false, isPinned: true, requiresAction: true,
    primaryAction: { label: 'Review & vote', navigateTo: '/changes/cab' },
    secondaryAction: { label: 'View change', navigateTo: '/changes/CHG-2026-00091' },
    receivedAt: '2026-05-08T08:00:00Z',
    expiresAt: '2026-05-09T10:00:00Z',  // CAB session time
  },
  {
    id: 'ibx-002',
    type: 'dr_test_reminder',
    priority: 'high',
    title: 'DR test running now: DRP-PAY-001',
    summary: 'Functional test of Payment Service DR plan started at 06:00 UTC. 6/10 steps complete.',
    sourceType: 'dr_test',
    sourcePublicId: 'DRT-2026-00018',
    sourceTitle: 'Payment Service DR Plan — Functional test',
    sourceUrl: '/continuity/tests',
    senderId: 'system',
    senderName: 'Continuity Management',
    isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'View live test', navigateTo: '/continuity/tests' },
    receivedAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'ibx-003',
    type: 'sla_warning',
    priority: 'urgent',
    title: 'SLA breached: Order Service availability',
    summary: 'Error budget exhausted. 78 min consumed of 43.2 min budget (181%). Active incident INC-2026-00183.',
    sourceType: 'sla',
    sourcePublicId: 'SLA-ORD-001',
    sourceTitle: 'Order Service availability SLA',
    sourceUrl: '/availability/sla',
    senderId: 'system',
    senderName: 'Availability Management',
    isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'View SLA', navigateTo: '/availability/sla' },
    secondaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00183' },
    receivedAt: '2026-05-08T07:42:00Z',
  },
  {
    id: 'ibx-004',
    type: 'approval_request',
    priority: 'normal',
    title: 'Service request awaiting approval: REQ-2026-00342',
    summary: 'Liam O\'Connor requests Production DB read access (pay-postgres-primary, 30 days). Manager approval needed.',
    sourceType: 'service_request',
    sourcePublicId: 'REQ-2026-00342',
    sourceTitle: 'Production Database Read Access — pay-postgres-primary',
    sourceUrl: '/requests/REQ-2026-00342',
    senderId: 'u-011',
    senderName: 'Liam O\'Connor',
    isRead: true, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Review request', navigateTo: '/requests/REQ-2026-00342' },
    receivedAt: '2026-05-08T05:20:00Z',
  },
  {
    id: 'ibx-005',
    type: 'mention',
    priority: 'normal',
    title: 'David Okafor mentioned you in INC-2026-00184',
    summary: '"@sarah.chen DB pool at 95%. Restarting payment-worker pods. Can you post external comms?"',
    body: 'DB pool at 95%. Restarting payment-worker pods. Can you post external comms?\n\n— David Okafor, in INC-2026-00184 comment thread',
    sourceType: 'incident',
    sourcePublicId: 'INC-2026-00184',
    sourceTitle: 'Payment Service: 5xx error rate elevated',
    sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'u-004',
    senderName: 'David Okafor',
    isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' },
    receivedAt: '2026-05-08T08:32:00Z',
  },
  {
    id: 'ibx-006',
    type: 'kb_review',
    priority: 'low',
    title: 'KB article ready for review: KB-00231',
    summary: 'Aisha Khan published "ES cluster yellow status recovery". As KB manager, please review.',
    sourceType: 'kb_article',
    sourcePublicId: 'KB-00231',
    sourceTitle: 'Runbook: ES cluster yellow status recovery',
    sourceUrl: '/kb/es-cluster-yellow-recovery',
    senderId: 'u-008',
    senderName: 'Aisha Khan',
    isRead: true, isArchived: false, isPinned: false, requiresAction: false,
    primaryAction: { label: 'Review article', navigateTo: '/kb/es-cluster-yellow-recovery' },
    receivedAt: '2026-05-08T06:35:00Z',
  },
  {
    id: 'ibx-007',
    type: 'approval_request',
    priority: 'normal',
    title: 'PIR sign-off needed: REL-2026-00017',
    summary: 'auth-service 2.8.1 was released 7 days ago. PIR sign-off is overdue. Helena Vasquez is waiting.',
    sourceType: 'sign_off',
    sourcePublicId: 'SGN-2026-00039',
    sourceTitle: 'Release validation sign-off: REL-2026-00017',
    sourceUrl: '/testing/sign-off',
    senderId: 'u-006',
    senderName: 'Helena Vasquez',
    isRead: false, isArchived: false, isPinned: false, requiresAction: true,
    primaryAction: { label: 'Sign off', navigateTo: '/testing/sign-off' },
    receivedAt: '2026-05-07T09:00:00Z',
  },
];
```

### `src/mocks/notificationHistory.ts` — Extended history (Doc 0 had 14 `mockNotifications`)

Doc 0 already defined `mockNotifications` (ntf-001 through ntf-014). Keep those exactly, but ensure their `actionUrl` fields now point to real routes. Patch each `actionUrl`:

```typescript
// ntf-001 P1 incident → /incidents/INC-2026-00184 ✓ real
// ntf-002 war room → /incidents/major/INC-2026-00184 ✓ real
// ntf-003 @mention → /incidents/INC-2026-00184 ✓ real
// ntf-004 SLA breach → /availability/sla ✓ real
// ntf-005 Assignment → /incidents/INC-2026-00183 ✓ real
// ntf-006 KB published → /kb/es-cluster-yellow-recovery ✓ real
// ntf-007 Change approved → /changes/CHG-2026-00091 ✓ real
// ntf-008 CHG mention → /changes/CHG-2026-00091 ✓ real
// ntf-009 Deploy complete → /deployments/DEP-2026-00335 ✓ real
// ntf-010 Sign-off needed → /testing/sign-off ✓ real
// ntf-011 Report ready → /reports ✓ real
// ntf-012 Capacity alert → /capacity ✓ real
// ntf-013 Problem linked → /problems/PRB-2026-00018 ✓ real
// ntf-014 Maintenance → /changes/CHG-2026-00086 ✓ real
```

If Doc 0 notifications already have correct routes, no change needed. If `actionUrl` was placeholder (e.g. `'#'`), update to real routes above.

### `src/mocks/notificationPreferences.ts` — Preferences for Sarah Chen

```typescript
// Topics and their default channel configs for currentUser (u-001)
export const mockNotificationPreferences: NotificationPreference[] = [
  { userId: 'u-001', topic: 'incident_assigned',         channels: ['in_app', 'email', 'sms'],   respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'incident_update_p1p2',      channels: ['in_app', 'sms'],             respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'incident_update_any',       channels: ['in_app'],                    respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'sla_warning',               channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'sla_breach',                channels: ['in_app', 'email', 'sms'],   respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'approval_request',          channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'mention',                   channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'change_in_my_services',     channels: ['in_app'],                    respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'deployment_in_my_services', channels: ['in_app'],                    respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'capacity_alert',            channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: true },
  { userId: 'u-001', topic: 'report_ready',              channels: ['email'],                     respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'kb_review_due',             channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'dr_test_reminder',          channels: ['in_app', 'email'],           respectQuietHours: true,  overrideForUrgent: false },
  { userId: 'u-001', topic: 'on_call_shift_start',       channels: ['in_app', 'sms'],             respectQuietHours: false, overrideForUrgent: true },
  { userId: 'u-001', topic: 'on_call_escalation',        channels: ['in_app', 'sms'],             respectQuietHours: false, overrideForUrgent: true },
];

export const mockQuietHours: QuietHoursConfig = {
  userId: 'u-001',
  enabled: true,
  timezone: 'America/New_York',
  fromHour: 22,
  toHour: 7,
  daysOfWeek: [0, 6],  // Weekends
};
```

### `src/mocks/onCallSchedules.ts` — 3 schedules

```typescript
export const mockOnCallSchedules: OnCallSchedule[] = [
  {
    id: 'onc-platform',
    publicId: 'ONC-PLATFORM-001',
    name: 'Platform On-Call',
    teamId: 't-platform',
    teamName: 'Platform Engineering',
    description: 'Primary on-call for all payment, auth, order services.',
    currentPrimaryId: 'u-004',
    currentPrimaryName: 'David Okafor',
    currentSecondaryId: 'u-005',
    currentSecondaryName: 'Yuki Tanaka',
    rotationIntervalDays: 7,
    rotationStartDayOfWeek: 1,  // Monday
    rotationTime: '09:00',
    members: [
      { userId: 'u-004', userName: 'David Okafor', shiftOrder: 1 },
      { userId: 'u-005', userName: 'Yuki Tanaka',  shiftOrder: 2 },
      { userId: 'u-002', userName: 'Marcus Hill',  shiftOrder: 3 },
      { userId: 'u-003', userName: 'Priya Patel',  shiftOrder: 4 },
    ],
    upcomingShifts: [
      { id: 'shift-001', scheduleId: 'onc-platform', userId: 'u-004', userName: 'David Okafor',
        shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-11T09:00:00Z',
        isCurrentShift: true, isOverridden: false },
      { id: 'shift-002', scheduleId: 'onc-platform', userId: 'u-005', userName: 'Yuki Tanaka',
        shiftType: 'primary', startAt: '2026-05-11T09:00:00Z', endAt: '2026-05-18T09:00:00Z',
        isCurrentShift: false, isOverridden: false },
      { id: 'shift-003', scheduleId: 'onc-platform', userId: 'u-002', userName: 'Marcus Hill',
        shiftType: 'primary', startAt: '2026-05-18T09:00:00Z', endAt: '2026-05-25T09:00:00Z',
        isCurrentShift: false, isOverridden: false },
      { id: 'shift-004', scheduleId: 'onc-platform', userId: 'u-003', userName: 'Priya Patel',
        shiftType: 'primary', startAt: '2026-05-25T09:00:00Z', endAt: '2026-06-01T09:00:00Z',
        isCurrentShift: false, isOverridden: false },
    ],
    activeIncidentCount: 2,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'onc-data',
    publicId: 'ONC-DATA-001',
    name: 'Data Platform On-Call',
    teamId: 't-data',
    teamName: 'Data Platform',
    currentPrimaryId: 'u-008',
    currentPrimaryName: 'Aisha Khan',
    rotationIntervalDays: 7,
    rotationStartDayOfWeek: 1,
    rotationTime: '09:00',
    members: [
      { userId: 'u-008', userName: 'Aisha Khan',   shiftOrder: 1 },
      { userId: 'u-009', userName: 'Carlos Mendez', shiftOrder: 2 },
    ],
    upcomingShifts: [
      { id: 'shift-005', scheduleId: 'onc-data', userId: 'u-008', userName: 'Aisha Khan',
        shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-11T09:00:00Z',
        isCurrentShift: true, isOverridden: false },
      { id: 'shift-006', scheduleId: 'onc-data', userId: 'u-009', userName: 'Carlos Mendez',
        shiftType: 'primary', startAt: '2026-05-11T09:00:00Z', endAt: '2026-05-18T09:00:00Z',
        isCurrentShift: false, isOverridden: false },
    ],
    activeIncidentCount: 1,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-05-04T09:00:00Z',
  },
  {
    id: 'onc-network',
    publicId: 'ONC-NET-001',
    name: 'Network Operations On-Call',
    teamId: 't-network',
    teamName: 'Network Operations',
    currentPrimaryId: 'u-010',
    currentPrimaryName: 'James Osei',
    rotationIntervalDays: 14,
    rotationStartDayOfWeek: 1,
    members: [
      { userId: 'u-010', userName: 'James Osei',  shiftOrder: 1 },
      { userId: 'u-012', userName: 'Nina Patel',   shiftOrder: 2 },
    ],
    upcomingShifts: [
      { id: 'shift-007', scheduleId: 'onc-network', userId: 'u-010', userName: 'James Osei',
        shiftType: 'primary', startAt: '2026-05-04T09:00:00Z', endAt: '2026-05-18T09:00:00Z',
        isCurrentShift: true, isOverridden: false },
    ],
    activeIncidentCount: 0,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-05-04T09:00:00Z',
  },
];
```

### `src/mocks/onCallOverrides.ts` — 3 overrides

```typescript
export const mockOnCallOverrides: OnCallOverride[] = [
  {
    id: 'ovr-001',
    publicId: 'OVR-2026-00012',
    scheduleId: 'onc-platform',
    scheduleName: 'Platform On-Call',
    originalUserId: 'u-005',
    originalUserName: 'Yuki Tanaka',
    overrideUserId: 'u-002',
    overrideUserName: 'Marcus Hill',
    startAt: '2026-05-14T09:00:00Z',
    endAt: '2026-05-16T09:00:00Z',
    reason: 'Yuki attending AWS re:Inforce conference.',
    requestedById: 'u-005',
    requestedByName: 'Yuki Tanaka',
    approvedById: 'u-001',
    approvedByName: 'Sarah Chen',
    approvedAt: '2026-05-07T14:00:00Z',
    status: 'approved',
    createdAt: '2026-05-07T13:00:00Z',
  },
  {
    id: 'ovr-002',
    publicId: 'OVR-2026-00011',
    scheduleId: 'onc-data',
    scheduleName: 'Data Platform On-Call',
    originalUserId: 'u-009',
    originalUserName: 'Carlos Mendez',
    overrideUserId: 'u-008',
    overrideUserName: 'Aisha Khan',
    startAt: '2026-05-11T09:00:00Z',
    endAt: '2026-05-13T09:00:00Z',
    reason: 'Carlos has a family commitment.',
    requestedById: 'u-009',
    requestedByName: 'Carlos Mendez',
    status: 'pending',
    createdAt: '2026-05-08T07:00:00Z',
  },
  {
    id: 'ovr-003',
    publicId: 'OVR-2026-00010',
    scheduleId: 'onc-platform',
    scheduleName: 'Platform On-Call',
    originalUserId: 'u-002',
    originalUserName: 'Marcus Hill',
    overrideUserId: 'u-004',
    overrideUserName: 'David Okafor',
    startAt: '2026-04-28T09:00:00Z',
    endAt: '2026-04-29T09:00:00Z',
    reason: 'Holiday coverage.',
    requestedById: 'u-002',
    requestedByName: 'Marcus Hill',
    approvedById: 'u-001',
    approvedByName: 'Sarah Chen',
    approvedAt: '2026-04-25T10:00:00Z',
    status: 'approved',
    createdAt: '2026-04-25T09:00:00Z',
  },
];
```

### `src/mocks/statusPageEntries.ts` — Status page data

```typescript
export const mockStatusPageEntries: StatusPageEntry[] = [
  {
    id: 'sp-001', serviceId: 'svc-001', serviceName: 'Payment Service',
    serviceDescription: 'Processes customer payments and refunds.',
    status: 'partial_outage',
    statusMessage: 'Investigating elevated error rates. Some checkout attempts may fail.',
    linkedOutagePublicId: 'OUT-2026-00042',
    linkedIncidentPublicId: 'INC-2026-00184',
    lastUpdatedAt: '2026-05-08T08:38:00Z',
    lastUpdatedByName: 'Sarah Chen',
    uptime90d: 99.72,
    displayOrder: 1,
  },
  {
    id: 'sp-002', serviceId: 'svc-002', serviceName: 'Authentication',
    serviceDescription: 'User login, SSO, and session management.',
    status: 'operational',
    lastUpdatedAt: '2026-05-08T00:00:00Z',
    uptime90d: 99.99,
    displayOrder: 2,
  },
  {
    id: 'sp-003', serviceId: 'svc-003', serviceName: 'Order Management',
    serviceDescription: 'Shopping cart, order placement, and tracking.',
    status: 'degraded',
    statusMessage: 'Checkout latency elevated. Orders are processing but may be slower than usual.',
    linkedIncidentPublicId: 'INC-2026-00183',
    lastUpdatedAt: '2026-05-08T07:50:00Z',
    uptime90d: 99.83,
    displayOrder: 3,
  },
  {
    id: 'sp-004', serviceId: 'svc-004', serviceName: 'Notifications',
    serviceDescription: 'Email, SMS, and push notification delivery.',
    status: 'operational',
    lastUpdatedAt: '2026-05-08T00:00:00Z',
    uptime90d: 99.94,
    displayOrder: 4,
  },
  {
    id: 'sp-005', serviceId: 'svc-005', serviceName: 'Search',
    serviceDescription: 'Product search and recommendation engine.',
    status: 'degraded',
    statusMessage: 'Search results may load slower than usual.',
    linkedIncidentPublicId: 'INC-2026-00182',
    lastUpdatedAt: '2026-05-08T06:30:00Z',
    uptime90d: 99.41,
    displayOrder: 5,
  },
  {
    id: 'sp-006', serviceId: 'svc-006', serviceName: 'Analytics',
    serviceDescription: 'Real-time and batch analytics platform.',
    status: 'operational',
    lastUpdatedAt: '2026-05-07T00:00:00Z',
    uptime90d: 99.71,
    displayOrder: 6,
  },
  {
    id: 'sp-007', serviceId: 'svc-007', serviceName: 'Internal Wiki',
    serviceDescription: 'Internal documentation and knowledge sharing.',
    status: 'maintenance',
    statusMessage: 'Scheduled database upgrade in progress. Read-only mode until 04:00 UTC.',
    linkedIncidentPublicId: 'INC-2026-00180',
    lastUpdatedAt: '2026-05-09T02:00:00Z',
    uptime90d: 99.50,
    displayOrder: 7,
  },
  {
    id: 'sp-008', serviceId: 'svc-008', serviceName: 'CI/CD Platform',
    serviceDescription: 'Continuous integration and deployment pipeline.',
    status: 'operational',
    lastUpdatedAt: '2026-05-08T00:00:00Z',
    uptime90d: 99.88,
    displayOrder: 8,
  },
];

export const mockStatusPageIncidents: StatusPageIncident[] = [
  {
    id: 'spi-001',
    title: 'Payment Service — Elevated Error Rates',
    status: 'investigating',
    affectedServiceIds: ['svc-001'],
    startedAt: '2026-05-08T08:14:00Z',
    updates: [
      { id: 'u1', timestamp: '2026-05-08T08:38:00Z', authorName: 'Sarah Chen',
        body: 'We have identified the issue as database connection pool saturation. Mitigation is in progress.' },
      { id: 'u2', timestamp: '2026-05-08T08:19:00Z', authorName: 'OIS System',
        body: 'We are investigating elevated error rates on the Payment Service. Checkout attempts may be affected.' },
      { id: 'u3', timestamp: '2026-05-08T08:14:00Z', authorName: 'OIS System',
        body: 'We are aware of an issue affecting the Payment Service and are investigating.' },
    ],
  },
  {
    id: 'spi-002',
    title: 'Order Service — Latency Elevated',
    status: 'investigating',
    affectedServiceIds: ['svc-003'],
    startedAt: '2026-05-08T07:42:00Z',
    updates: [
      { id: 'u4', timestamp: '2026-05-08T07:55:00Z', authorName: 'OIS System',
        body: 'Checkout flow is experiencing latency. Orders are completing but may take 3–5 seconds instead of under 1 second.' },
    ],
  },
];
```

---

## 📄 PAGE 6.1 — Inbox

**File:** `src/routes/platform/Inbox.tsx`
**Route:** `/inbox`

### Purpose
Unified action center. All items requiring attention in one place. Gmail-meets-Slack vibe.

### Page header

```
Inbox
3 unread · 3 require action · 1 urgent
                                            [Mark all read]  [Archive read]
```

### Layout: left list + right detail (master-detail)

**Left panel (380px, scrollable):**

Tabs at top:
```
[All (7)]  [Unread (3)]  [Requires action (3)]  [Archived]
```

Below tabs, filter:
```
[🔍 Search inbox...]   [Priority ▾]  [Type ▾]
```

Item list:

```
┌─────────────────────────────────────────────────────┐
│ ● [🔴 URGENT] Approval                              │
│ CAB approval: CHG-2026-00091                        │
│ Change Management · 38m ago · 📌 Pinned              │
│ "Tom Bergstrom approved. Your vote is needed…"      │
│ [Review & vote] [View change]                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ● [🔴] SLA Warning                                   │
│ SLA breached: Order Service availability            │
│ Availability Management · 1h 38m ago                │
│ "Error budget exhausted. 78 min consumed…"          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│   [⚪] Approval                                       │
│ Service request: REQ-2026-00342                     │
│ Liam O'Connor · 3h 18m ago                          │
│ "Production DB read access (30 days)…"              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ● [⚪] Mention                                       │
│ David Okafor mentioned you in INC-2026-00184        │
│ David Okafor · 18m ago                               │
│ "@sarah.chen Can you post external comms?"           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│   [⚪] DR test                                       │
│ DR test running: DRP-PAY-001                        │
│ System · 2h 28m ago                                  │
│ "Functional test started at 06:00 UTC…"             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│   [⚪] KB review                                     │
│ KB article ready: KB-00231                          │
│ Aisha Khan · 2h 13m ago                              │
│ ""ES cluster yellow status recovery"…"               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ● [⚪] Approval                                       │
│ PIR sign-off needed: REL-2026-00017                 │
│ Helena Vasquez · 23h ago                             │
│ "auth-service 2.8.1 sign-off is overdue…"           │
└─────────────────────────────────────────────────────┘
```

Each list item:
- Unread dot (blue ● for unread, empty for read)
- Priority chip (URGENT=red, HIGH=orange, NORMAL=empty)
- Type label
- Title (bold if unread, normal if read)
- Sender + time
- Summary (2 lines, truncate)
- Hover: subtle bg tint
- Click → loads item in right panel, marks as read
- Quick actions on hover: Archive, Pin, Mark read/unread

**Right panel (flex fill, scrollable):**

When item selected (default: ibx-001 selected):

```
┌─ CAB approval needed: CHG-2026-00091 ──────────────────────────────────────┐
│                                                                               │
│  [🔴 URGENT · Approval request]               [Archive] [Pin] [Mark unread] │
│                                                                               │
│  Change Management · Received May 8, 08:00 UTC                               │
│                                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                               │
│  Tom Bergstrom has approved. Your vote as Change Manager is required         │
│  before the Thursday CAB session at 10:00 UTC.                               │
│                                                                               │
│  **Change:** Migrate payment-api to pgbouncer connection pooling              │
│  **Risk:** Medium (58/100)                                                    │
│  **Window:** Friday May 10, 14:00–16:00 UTC                                  │
│  **Linked problem:** PRB-2026-00018 (recurring memory pressure)               │
│                                                                               │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                               │
│  Source: CHG-2026-00091                                                       │
│                                                                               │
│  [Review & vote →]            [View change details →]                        │
│                                                                               │
│  Expires: Thursday May 9, 10:00 UTC (in 26 hours)                           │
└───────────────────────────────────────────────────────────────────────────────┘
```

Right panel rendering:
- Type chip + priority at top
- Action buttons (Archive, Pin, Mark as unread)
- Sender + timestamp
- Markdown-rendered `body` (or fallback to `summary` if no body)
- Source entity reference (publicId, linked)
- Primary and secondary action buttons (from `primaryAction`/`secondaryAction`)
- Expires timestamp if set (countdown if <24h remaining)

### Empty state (right panel when no item selected)

```
                [icon: InboxIcon, large]

                Select an item to read
                3 unread · 3 require action
```

### Empty state (list — all archived)

```
                [icon: CheckCircle, large, green]

                All caught up!
                No unread messages.
                [View archived →]
```

### Mobile: stacked (no split)

On <768px, list takes full width; clicking item navigates to full-screen item view with back button.

---

## 📄 PAGE 6.2 — Notification Preferences

**File:** `src/routes/platform/NotificationPreferences.tsx`
**Route:** `/notifications/preferences`

### Page header

```
[← Settings]
Notification Preferences
Control how and when OIS notifies you.
```

### Layout: two sections stacked

**Section 1: Quiet Hours**

```
┌─ Quiet Hours ──────────────────────────────────────────────────────────────┐
│                                                                               │
│ During quiet hours, only URGENT alerts (P1 incidents, SLA breach) notify     │
│ you. All others queue until quiet hours end.                                  │
│                                                                               │
│  [✓] Enable quiet hours                                                       │
│                                                                               │
│  Timezone:    [America/New_York ▾]                                            │
│                                                                               │
│  From  [22:00 ▾]  to  [07:00 ▾]                                              │
│                                                                               │
│  Days:  [ ] Mon  [ ] Tue  [ ] Wed  [ ] Thu  [ ] Fri  [✓] Sat  [✓] Sun       │
│                                                                               │
│  Currently: ● In quiet hours (it's Sat, 02:14 UTC / 22:14 ET)               │
│                                                                               │
│                                                      [Save quiet hours]      │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Section 2: Per-topic preferences table**

```
┌─ Topic Notifications ──────────────────────────────────────────────────────┐
│                                                                               │
│  CHANNEL KEY:  📱 In-app  📧 Email  📱 SMS  💬 Slack                          │
│                                                                               │
│  ─── INCIDENTS ─────────────────────────────────────────────────────────── │
│                                                                               │
│  Topic                          In-app  Email   SMS   Slack  Quiet hrs?      │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Assigned to me                  [✓]    [✓]    [✓]   [ ]   Ignore ∅         │
│  P1/P2 updates                   [✓]    [ ]    [✓]   [ ]   Ignore ∅         │
│  Any incident update             [✓]    [ ]    [ ]   [ ]   Respect ✓         │
│                                                                               │
│  ─── SLA ───────────────────────────────────────────────────────────────── │
│  SLA warning                     [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│  SLA breach                      [✓]    [✓]    [✓]   [ ]   Ignore ∅         │
│                                                                               │
│  ─── APPROVALS ─────────────────────────────────────────────────────────── │
│  Approval requests               [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│  @Mentions                       [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│                                                                               │
│  ─── OPERATIONS ────────────────────────────────────────────────────────── │
│  Changes in my services          [✓]    [ ]    [ ]   [ ]   Respect ✓         │
│  Deploys in my services          [✓]    [ ]    [ ]   [ ]   Respect ✓         │
│  Capacity alerts                 [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│                                                                               │
│  ─── KNOWLEDGE & REPORTING ─────────────────────────────────────────────── │
│  Reports ready                   [ ]    [✓]    [ ]   [ ]   Respect ✓         │
│  KB review due                   [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│  DR test reminders               [✓]    [✓]    [ ]   [ ]   Respect ✓         │
│                                                                               │
│  ─── ON-CALL ───────────────────────────────────────────────────────────── │
│  Shift start reminders           [✓]    [ ]    [✓]   [ ]   Ignore ∅         │
│  Escalations to me               [✓]    [ ]    [✓]   [ ]   Ignore ∅         │
│                                                                               │
│                                                       [Save preferences]     │
└───────────────────────────────────────────────────────────────────────────────┘
```

Each row: topic label + 4 channel checkboxes + quiet hours toggle (Respect = honor quiet hours, Ignore = always notify).

Checkboxes update `mockNotificationPreferences` via React state. `[Save preferences]` shows success toast.

### Connected channels note

```
Connected channels:
📱 In-app — always available
📧 Email — sarah.chen@acme.io  [Change]
📱 SMS — +1 (555) 012-3456  [Change]
💬 Slack — @sarah.chen (acme-workspace)  [Change]
```

---

## 📄 PAGE 6.3 — On-Call

**File:** `src/routes/platform/OnCall.tsx`
**Route:** `/on-call`

### Page header

```
On-Call Management
3 schedules · 5 people currently on-call · 1 override pending approval
                                        [Schedule →] [Overrides →]
```

### "Who's on call now" — hero section

```
WHO'S ON CALL RIGHT NOW                                     May 8, 2026 · 08:52 UTC

┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  Platform Engineering               Data Platform           Network Ops       │
│  ────────────────────               ────────────────────    ────────────────  │
│  🟢 PRIMARY                         🟢 PRIMARY               🟢 PRIMARY       │
│  [DO] David Okafor                  [AK] Aisha Khan           [JO] James Osei │
│  Since Mon May 4 · Ends Mon May 11  Since Mon May 4 ·        Since Mon May 4  │
│                                     Ends Mon May 11           Ends Mon May 18 │
│                                                                                │
│  🔵 SECONDARY                       (No secondary)           (No secondary)   │
│  [YT] Yuki Tanaka                                                              │
│                                                                                │
│  📊 2 active incidents               📊 1 active incident     📊 0 incidents   │
│  [View incidents →]                 [View incidents →]                         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

Large, easy to read. Each schedule in a card column. Avatar + name prominent. Active incidents count with link.

Below the hero:

```
UPCOMING HANDOVERS (next 7 days)

  Mon May 11 09:00 UTC — Platform Engineering hands over David → Yuki
  Mon May 11 09:00 UTC — Data Platform hands over Aisha → Carlos
  Wed May 14 09:00 UTC — Platform: OVR-2026-00012 (Yuki → Marcus, 2 days)
  Mon May 18 09:00 UTC — Network Ops hands over James → Nina
```

Simple timeline list.

---

## 📄 PAGE 6.4 — On-Call Schedule

**File:** `src/routes/platform/OnCallSchedule.tsx`
**Route:** `/on-call/schedule`

### Page header

```
[← On-Call]
On-Call Schedule
Next 4 weeks
                                [Overrides →]   [+ Request override]
```

### Schedule selector

```
Schedule: [Platform Engineering ▾]     (or All schedules)
```

### 4-week calendar view

```
              MON         TUE         WED         THU         FRI         SAT         SUN
─────────────────────────────────────────────────────────────────────────────────────────────
Week 1        David O.    David O.    David O.    David O.    David O.    David O.    David O.
May 4-10      [Current]                                                                       
─────────────────────────────────────────────────────────────────────────────────────────────
Week 2        Yuki T.     Yuki T.     Marcus H.   Marcus H.   Yuki T.     Yuki T.     Yuki T.
May 11-17                             ┌──OVR──┐   └──OVR──┘                                 
                                      Marcus → (Yuki's shift, covered by Marcus via OVR-012) 
─────────────────────────────────────────────────────────────────────────────────────────────
Week 3        Marcus H.   Marcus H.   Marcus H.   Marcus H.   Marcus H.   Marcus H.   Marcus H.
May 18-24                                                                                      
─────────────────────────────────────────────────────────────────────────────────────────────
Week 4        Priya P.    Priya P.    Priya P.    Priya P.    Priya P.    Priya P.    Priya P.
May 25-31                                                                                      
─────────────────────────────────────────────────────────────────────────────────────────────
```

Each cell shows who's primary on-call that day. Overridden days show override indicator. Current day highlighted with blue border. Click any cell → small popover showing that day's shift details + option to request override.

### Rotation members list (below calendar)

```
ROTATION ORDER — Platform Engineering

 1  [DO] David Okafor      ← Currently on shift
 2  [YT] Yuki Tanaka
 3  [MH] Marcus Hill
 4  [PP] Priya Patel
 [+ Add member]
```

---

## 📄 PAGE 6.5 — On-Call Overrides

**File:** `src/routes/platform/OnCallOverrides.tsx`
**Route:** `/on-call/overrides`

### Page header

```
[← On-Call]
On-Call Overrides
3 overrides · 1 pending approval · 1 upcoming
                                                          [+ Request override]
```

### Overrides list (cards)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⏱ PENDING APPROVAL                                          OVR-2026-00011│
│                                                                            │
│ Data Platform On-Call                                                      │
│ Carlos Mendez → covered by Aisha Khan                                     │
│ May 11–13, 2026 (2 days)                                                  │
│                                                                            │
│ Reason: "Carlos has a family commitment."                                  │
│ Requested by Carlos Mendez · 1h 52m ago                                   │
│                                                                            │
│ Awaiting approval                                                          │
│                                        [✓ Approve] [✗ Reject]              │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ APPROVED — UPCOMING                                        OVR-2026-00012│
│                                                                            │
│ Platform Engineering On-Call                                              │
│ Yuki Tanaka → covered by Marcus Hill                                       │
│ May 14–16, 2026 (2 days)                                                  │
│                                                                            │
│ Reason: "Yuki attending AWS re:Inforce conference."                        │
│ Approved by Sarah Chen · May 7                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ ✓ APPROVED — PAST                                            OVR-2026-00010│
│ Platform Engineering · Marcus Hill → David Okafor                         │
│ Apr 28–29 (past · holiday coverage)                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

### Request override modal

`[+ Request override]` opens modal:

```
Request On-Call Override                                              [×]

Schedule *
[Platform Engineering ▾]

I need coverage for *
Original: [Yuki Tanaka ▾]  (pre-fills if "my shift")
From: [2026-05-14]  To: [2026-05-16]

Covered by *
[Marcus Hill ▾]  (picks from schedule members)

Reason *
[                                                                    ]

                                               [Cancel] [Request]
```

After request: new override card appears at top with "Pending approval" status.

---

## 📄 PAGE 6.6 — Status Page

**File:** `src/routes/platform/StatusPage.tsx`
**Route:** `/status`

### Purpose
Internal status page. Projected during incidents, linked from War Room. Clean, Statuspage.io / status.io vibe.

### Page header (full-width, no standard AppShell sidebar needed)

Use a minimal layout — full width page, no sidebar. Just a narrow top bar:

```
[OIS logo]  Internal Service Status            2026-05-08 08:52 UTC  [🔄 Auto-refreshing]
```

### Overall status hero

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  ⚠ PARTIAL SERVICE DISRUPTION                                                │
│                                                                               │
│  3 services currently experiencing issues.                                   │
│  Payment Service, Order Management, and Search are degraded.                 │
│  All other services are operational.                                         │
│                                                                               │
│  Last updated: May 8, 08:38 UTC by Sarah Chen                               │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

Hero background: amber for "partial disruption". Would be:
- Green `#ECFDF3` for "All operational"
- Amber `#FFFAEB` for "Partial disruption"
- Red `#FEF3F2` for "Major outage"

### Service status list

Each service as a row:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ⬤ Partial outage     Payment Service                                          │
│                       Processes customer payments and refunds.                │
│                       Investigating elevated error rates. Some checkout may…  │
│                       Last updated: 08:38 UTC                                 │
│                                                                                │
│  [90-day uptime bar: mostly green with tiny red/orange marks] 99.72%         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ✅ Operational        Authentication                                          │
│                       User login, SSO, and session management.               │
│                       [90-day bar: all green] 99.99%                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ ⚠ Degraded            Order Management                                       │
│                       Checkout latency elevated. Orders processing but slow. │
│                       Last updated: 07:50 UTC                                │
│                       [90-day bar] 99.83%                                    │
└──────────────────────────────────────────────────────────────────────────────┘

... (5 more services)
```

The 90-day uptime bar:
- Thin horizontal bar (full width)
- Each of 90 segments represents 1 day
- Color per day matches `dailyServiceHealth.status` (green/amber/orange/red/blue from Doc 5a)
- Percentage shown at right end
- Hover segment → tooltip with date + status

### Active incidents section

```
ACTIVE INCIDENTS (2)
─────────────────────────────────────────────────────────────────────────────

📢 Payment Service — Elevated Error Rates                         Investigating
   Started May 8, 08:14 UTC

   08:38 UTC — Sarah Chen
   We have identified the issue as database connection pool saturation.
   Mitigation is in progress.

   08:19 UTC — OIS System
   We are investigating elevated error rates on the Payment Service.
   Checkout attempts may be affected.

   08:14 UTC — OIS System
   We are aware of an issue affecting the Payment Service.

   ─────────────────────────────────────────────────────────────────────────

📢 Order Service — Latency Elevated                               Investigating
   Started May 8, 07:42 UTC

   07:55 UTC — OIS System
   Checkout flow is experiencing latency. Orders completing but may take
   3–5 seconds instead of under 1 second.
```

Each active incident expands to show the full update history (chronological, newest first for first entry, then older below).

### Past incidents (past 14 days)

```
PAST INCIDENTS (last 14 days)
─────────────────────────────────────────────────────────────────────────────
May 7 · Notification Gateway — SMS delivery delay     Resolved · 42 min
May 3 · Search Service — Latency spike                Resolved · 16 min
May 3 · Payment Service — Total outage                Resolved · 30 min
...

[View all past incidents →]
```

---

## 📄 PAGE 6.7 — User Profile

**File:** `src/routes/platform/Profile.tsx`
**Route:** `/profile`

### Page header

```
My Profile
                                                          [← Settings]
```

### Layout: centered, max-width 720px

**Avatar & identity:**

```
                    [Large avatar — SC initials, 80px]   [Change photo]

                    Sarah Chen
                    Platform Engineering · Admin
                    sarah.chen@acme.io
                    +1 (555) 012-3456  [Edit]
```

**Profile form:**

```
Full name *       [Sarah Chen                        ]
Job title         [Platform Engineering Manager       ]
Team              [Platform Engineering ▾             ]
Timezone          [America/New_York (UTC-4) ▾         ]
Language          [English ▾                          ]

Manager           [Helena Vasquez ▾                   ]

Bio
[Sarah oversees platform reliability for Acme Corp. Joined 2023.]

                                                      [Save changes]
```

**API Tokens:**

```
API TOKENS

Personal access tokens for API and Claude Code use.

  Name                      Created        Last used      Scope
  OIS API Token (default)   Jan 15, 2026   5m ago         read:all write:all
  Claude Code               Mar 2, 2026    2 days ago     read:all

  [+ Generate new token]    [Revoke all]
```

`[+ Generate new token]` opens modal: name field + scope checkboxes + "Generate". On generate shows token once (copy prompt).

**Danger zone:**

```
DANGER ZONE

  [Delete my account]   (requires confirmation + admin approval)
```

---

## 📄 PAGE 6.8 — Settings

**File:** `src/routes/platform/Settings.tsx`
**Route:** `/settings`

### Page header

```
Settings
```

### Layout: left nav (180px) + right content area

**Left nav (anchored sections):**

```
Account
  Profile →
  Notifications →
  API tokens →

Appearance
  Theme →
  Density →

Integrations
  Slack →
  PagerDuty →
  GitHub →
  Prometheus →
```

### Account → Profile (default selected)

Links to `/profile`.

### Account → Notifications

Links to `/notifications/preferences`.

### Appearance section

```
THEME
◉ Light (default)
○ Dark (coming soon)
○ System

DISPLAY DENSITY
◉ Comfortable (default)
○ Compact
○ Spacious

TABLE DENSITY
◉ Default (12 rows visible)
○ Compact (16 rows)
○ Comfortable (8 rows)

DATE FORMAT
◉ Relative (38m ago, 2d ago)
○ Absolute (May 8, 08:14 UTC)
○ Both (38m ago · May 8, 08:14)

                                                      [Save appearance]
```

Appearance saves to `localStorage` (key `ois-preferences`). Density affects existing DataTable components.

### Integrations

Each integration as a card:

```
┌─ Slack ──────────────────────────────────────────────────────────────────┐
│  [Slack logo]                                          ● Connected       │
│  Connected workspace: Acme Corp (acme.slack.com)                         │
│  Connected channels: #incidents, #payment-engineering, #platform-oncall  │
│  Notifications: configured (see Notification Preferences)                │
│  [Test connection]  [Disconnect]                                          │
└────────────────────────────────────────────────────────────────────────────┘

┌─ PagerDuty ──────────────────────────────────────────────────────────────┐
│  [PD logo]                                          ○ Not connected      │
│  Connect PagerDuty to sync on-call schedules and escalation policies.    │
│  [Connect PagerDuty]                                                      │
└────────────────────────────────────────────────────────────────────────────┘

┌─ GitHub ─────────────────────────────────────────────────────────────────┐
│  [GH logo]                                          ● Connected         │
│  Connected org: acme-corp                                                 │
│  Repos synced: 12   Pipelines monitored: 5                               │
│  [Manage repos]  [Disconnect]                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌─ Prometheus ─────────────────────────────────────────────────────────────┐
│  [Prometheus logo]                                  ● Connected         │
│  Endpoint: https://prometheus.acme.io                                    │
│  Last scraped: 2m ago   Rules synced: 12                                  │
│  [Test connection]  [Edit config]                                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 SHARED COMPONENTS

### `src/components/inbox/`

```
components/inbox/
├── InboxListItem.tsx          # Left panel list item
├── InboxItemDetail.tsx        # Right panel detail view
├── InboxTypeChip.tsx          # approval_request / mention / etc.
├── InboxPriorityBadge.tsx
├── InboxEmptyState.tsx
└── InboxActionButtons.tsx     # Primary + secondary action buttons
```

### `src/components/oncall/`

```
components/oncall/
├── OnCallHeroSection.tsx      # "Who's on call right now" grid
├── OnCallScheduleCard.tsx     # Single schedule in hero
├── ShiftCalendarGrid.tsx      # 4-week calendar grid
├── ShiftCell.tsx              # Single day cell
├── OverrideCard.tsx           # Override in list
├── RequestOverrideModal.tsx
└── UpcomingHandoversList.tsx
```

### `src/components/status/`

```
components/status/
├── StatusHero.tsx             # Overall status + description
├── ServiceStatusRow.tsx       # Single service row
├── UptimeHistoryBar.tsx       # 90-segment daily uptime bar
├── StatusIncidentCard.tsx     # Active incident with updates
├── StatusUpdateEntry.tsx      # Single update in incident
└── PastIncidentSummary.tsx
```

### `src/components/platform/` (profile & settings)

```
components/platform/
├── PreferencesTable.tsx       # 15-topic × 4-channel checkboxes
├── QuietHoursForm.tsx
├── AppearanceSettings.tsx
├── IntegrationCard.tsx
├── APITokenRow.tsx
├── GenerateTokenModal.tsx
└── ProfileForm.tsx
```

### Constants in `src/lib/constants.ts`

```typescript
export const inboxItemTypeMeta: Record<InboxItemType, { label: string; icon: string; color: string }> = {
  approval_request:   { label: 'Approval',       icon: 'CheckSquare',  color: '#6941C6' },
  mention:            { label: 'Mention',         icon: 'AtSign',       color: '#0BA5EC' },
  incident_update:    { label: 'Incident',        icon: 'AlertTriangle',color: '#B42318' },
  assignment:         { label: 'Assigned',        icon: 'UserPlus',     color: '#0BA5EC' },
  sla_warning:        { label: 'SLA',             icon: 'Clock',        color: '#DC6803' },
  system_alert:       { label: 'Alert',           icon: 'Bell',         color: '#DC6803' },
  report_ready:       { label: 'Report',          icon: 'FileText',     color: '#475467' },
  kb_review:          { label: 'KB Review',       icon: 'BookOpen',     color: '#067647' },
  dr_test_reminder:   { label: 'DR Test',         icon: 'Shield',       color: '#0BA5EC' },
};

export const inboxPriorityMeta: Record<InboxItemPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#B42318', bg: '#FEF3F2' },
  high:   { label: 'High',   color: '#DC6803', bg: '#FFFAEB' },
  normal: { label: 'Normal', color: '#475467', bg: '#F1F3F7' },
  low:    { label: 'Low',    color: '#98A2B3', bg: '#F1F3F7' },
};

export const notificationTopicMeta: Record<NotificationTopic, { label: string; group: string; description: string }> = {
  incident_assigned:         { label: 'Assigned to me',           group: 'INCIDENTS',            description: 'When you are assigned to an incident' },
  incident_update_p1p2:      { label: 'P1/P2 updates',            group: 'INCIDENTS',            description: 'Status changes on P1 or P2 incidents' },
  incident_update_any:       { label: 'Any incident update',      group: 'INCIDENTS',            description: 'All incident status changes' },
  sla_warning:               { label: 'SLA at risk',              group: 'SLA',                  description: '< 20% error budget remaining' },
  sla_breach:                { label: 'SLA breached',             group: 'SLA',                  description: 'Error budget exhausted' },
  approval_request:          { label: 'Approval requests',        group: 'APPROVALS',            description: 'CAB votes, sign-offs, service requests' },
  mention:                   { label: '@Mentions',                 group: 'APPROVALS',            description: 'When you are @mentioned' },
  change_in_my_services:     { label: 'Changes (my services)',    group: 'OPERATIONS',           description: 'Changes affecting services you own' },
  deployment_in_my_services: { label: 'Deploys (my services)',    group: 'OPERATIONS',           description: 'Deployments to your services' },
  capacity_alert:            { label: 'Capacity alerts',          group: 'OPERATIONS',           description: 'Threshold breaches on monitored metrics' },
  report_ready:              { label: 'Reports ready',            group: 'KNOWLEDGE & REPORTING', description: 'Scheduled reports generated' },
  kb_review_due:             { label: 'KB review due',            group: 'KNOWLEDGE & REPORTING', description: 'Articles needing your review' },
  dr_test_reminder:          { label: 'DR test reminders',        group: 'KNOWLEDGE & REPORTING', description: 'Upcoming DR tests' },
  on_call_shift_start:       { label: 'Shift start',              group: 'ON-CALL',              description: '2 hours before your on-call shift' },
  on_call_escalation:        { label: 'Escalations',              group: 'ON-CALL',              description: 'Escalated incidents reaching you' },
};

export const statusPageStatusMeta: Record<StatusPageEntryStatus, { label: string; color: string; bg: string; icon: string; dot: string }> = {
  operational:   { label: 'Operational',   color: '#067647', bg: '#ECFDF3', icon: 'CheckCircle2', dot: '#12B76A' },
  degraded:      { label: 'Degraded',      color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle', dot: '#F79009' },
  partial_outage:{ label: 'Partial outage',color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon',  dot: '#F04438' },
  major_outage:  { label: 'Major outage',  color: '#B42318', bg: '#FEF3F2', icon: 'XOctagon',      dot: '#F04438' },
  maintenance:   { label: 'Maintenance',   color: '#0BA5EC', bg: '#F0F9FF', icon: 'Wrench',        dot: '#0BA5EC' },
};

export const onCallShiftTypeMeta: Record<OnCallShiftType, { label: string; color: string }> = {
  primary:   { label: 'Primary',   color: '#B42318' },
  secondary: { label: 'Secondary', color: '#DC6803' },
  shadow:    { label: 'Shadow',    color: '#475467' },
};
```

---

## 🔀 ROUTING UPDATE — FINAL

In `src/routes/index.tsx`, replace all remaining placeholders. This is the **final routing update**:

```tsx
// Replace
{ path: 'inbox',                      element: <Placeholder ... /> },
{ path: 'notifications/preferences',  element: <Placeholder ... /> },
{ path: 'on-call',                    element: <Placeholder ... /> },
{ path: 'on-call/schedule',           element: <Placeholder ... /> },
{ path: 'on-call/overrides',          element: <Placeholder ... /> },
{ path: 'status',                     element: <Placeholder ... /> },
{ path: 'profile',                    element: <Placeholder ... /> },
{ path: 'settings',                   element: <Placeholder ... /> },

// With
{ path: 'inbox',                      element: <Inbox /> },
{ path: 'notifications/preferences',  element: <NotificationPreferences /> },
{ path: 'on-call',                    element: <OnCall /> },
{ path: 'on-call/schedule',           element: <OnCallSchedule /> },
{ path: 'on-call/overrides',          element: <OnCallOverrides /> },
{ path: 'status',                     element: <StatusPage /> },
{ path: 'profile',                    element: <Profile /> },
{ path: 'settings',                   element: <Settings /> },
```

After this update, **every route in the application is real**. There should be zero `<Placeholder />` components left.

---

## 🔗 CROSS-LINKING — THE FINAL LOOP CLOSE

Doc 6 completes every pending link in the application.

**Inbox items now link to real routes (all verified real in prior docs):**
- ibx-001 `[Review & vote]` → `/changes/cab` ✓ (Doc 4a)
- ibx-002 `[View live test]` → `/continuity/tests` ✓ (Doc 5b)
- ibx-003 `[View SLA]` → `/availability/sla` ✓ (Doc 5a)
- ibx-003 `[Open incident]` → `/incidents/INC-2026-00183` ✓ (Doc 3a)
- ibx-004 `[Review request]` → `/requests/REQ-2026-00342` ✓ (Doc 3b)
- ibx-005 `[Open incident]` → `/incidents/INC-2026-00184` ✓ (Doc 3a)
- ibx-006 `[Review article]` → `/kb/es-cluster-yellow-recovery` ✓ (Doc 3b)
- ibx-007 `[Sign off]` → `/testing/sign-off` ✓ (Doc 4b)

**Doc 0 topbar now fully wired:**
- 🔔 Notification bell → dropdown (already worked) + `[View all →]` → `/inbox` real
- Avatar menu → `[Profile]` → `/profile` real
- Avatar menu → `[Notification preferences]` → `/notifications/preferences` real
- Avatar menu → `[Settings]` → `/settings` real
- Avatar menu → `[On-call: David Okafor is primary]` → `/on-call` real

**Doc 3a War Room cross-links now all real:**
- `[Status page →]` in war room right panel → `/status` real
- `[Slack: #inc-184-payment]` → external (open in new tab, visual)
- `[Bridge: zoom.us/...]` → external (visual)

**Doc 0 Dashboard widgets fully wired:**
- All "My inbox" items link to `/inbox` real
- "Active Deployments" widget (added in Doc 4b) links to `/deployments` real
- "On-call" info in dashboard links to `/on-call` real

**Update Doc 0 `mockCurrentUser`:**

Doc 0 defines `Sarah Chen (u-001)` as the hardcoded current user. Ensure the user object includes:
```typescript
{
  id: 'u-001',
  publicId: 'u-001',
  name: 'Sarah Chen',
  email: 'sarah.chen@acme.io',
  avatar: 'SC',  // initials
  role: 'admin',
  teamId: 't-platform',
  teamName: 'Platform Engineering',
  title: 'Platform Engineering Manager',
  phone: '+1 (555) 012-3456',
  timezone: 'America/New_York',
  isOnCall: false,  // Sarah is not currently on-call (David Okafor is)
}
```

---

## ✅ QUALITY CHECKLIST

### Inbox
- [ ] `/inbox` renders master-detail layout
- [ ] 7 inbox items shown in left panel in correct order (urgent/unread first)
- [ ] Unread dot visible on 3 unread items (ibx-001, ibx-003, ibx-007)
- [ ] Priority chips on urgent items (ibx-001, ibx-003)
- [ ] Clicking item loads detail in right panel + marks as read
- [ ] ibx-001 selected by default (shows CAB approval body)
- [ ] Markdown body rendered in right panel
- [ ] Primary and secondary action buttons navigate to real routes
- [ ] Archive/Pin/Mark unread buttons work (React state)
- [ ] Tabs [All / Unread / Requires action / Archived] filter correctly
- [ ] "Mark all read" button marks all as read
- [ ] Empty state in right panel when no item selected
- [ ] "All caught up" state when no unread items

### Notification Preferences
- [ ] `/notifications/preferences` shows quiet hours section with form
- [ ] Quiet hours currently active (Saturday → shows indicator)
- [ ] 15-topic table renders with 4 channel checkboxes each
- [ ] Topics grouped by section (Incidents, SLA, Approvals, etc.)
- [ ] Checkboxes pre-populated from `mockNotificationPreferences`
- [ ] Quiet hours toggle per topic (Respect/Ignore)
- [ ] Save button shows success toast
- [ ] Connected channels section shows Sarah's email/phone/Slack

### On-Call
- [ ] `/on-call` shows hero section with 3 on-call cards
- [ ] David Okafor shown as current Platform primary (correct)
- [ ] Active incident counts shown per schedule (2, 1, 0)
- [ ] Upcoming handovers list with dates
- [ ] `/on-call/schedule` shows 4-week calendar grid
- [ ] Current week highlighted (May 4-10, David Okafor)
- [ ] Override indicator on May 14-16 (OVR-2026-00012)
- [ ] Rotation members list below calendar
- [ ] `/on-call/overrides` shows 3 overrides
- [ ] Pending override (OVR-2026-00011) shows approve/reject buttons
- [ ] Approved upcoming override shows clearly
- [ ] Request override modal has all fields

### Status Page
- [ ] `/status` renders without sidebar (minimal layout)
- [ ] Overall status hero shows "PARTIAL SERVICE DISRUPTION" (amber)
- [ ] 8 services listed with correct status dots
- [ ] Payment Service shows partial_outage
- [ ] Order Management shows degraded
- [ ] Search shows degraded
- [ ] Internal Wiki shows maintenance
- [ ] Others show operational
- [ ] 90-day uptime bar renders for each service (90 segments)
- [ ] Hover segment shows date tooltip
- [ ] 2 active incidents shown with update timeline
- [ ] Payment incident shows 3 updates (newest first)
- [ ] Past incidents section shows recent resolved ones

### Profile & Settings
- [ ] `/profile` shows Sarah Chen's info correctly
- [ ] Profile form is editable with save button
- [ ] API tokens table shows 2 tokens
- [ ] Generate new token modal opens
- [ ] `/settings` shows left nav with sections
- [ ] Appearance section has theme/density/date format options
- [ ] Integrations: Slack + GitHub show Connected, PagerDuty shows Not connected
- [ ] Slack section shows connected workspace and channels

### Final verification — Zero placeholders
- [ ] Every item in sidebar navigation navigates to a real page (no 404s)
- [ ] Every inbox item action navigates to a real route
- [ ] Every notification in dropdown navigates to a real route
- [ ] Topbar avatar menu links all work (Profile, Preferences, Settings)
- [ ] War Room `[Status page →]` opens `/status`
- [ ] `/status` page uses AppShell without sidebar or uses its own minimal shell
- [ ] Doc 0 dashboard "Inbox" widget items link to `/inbox` with item pre-selected
- [ ] All public IDs use mono font
- [ ] No `<Placeholder />` components remain anywhere in the routing tree
- [ ] No console / TypeScript errors
- [ ] Full app loads and navigates without errors

---

## 🚀 DELIVERABLE

Extend the existing project for the **final time**. Confirm:

1. New types in `src/types/platform.ts`, re-exported
2. Mock data: `inboxItems.ts` (replacing Doc 0 placeholder), `notificationPreferences.ts`, `onCallSchedules.ts`, `onCallOverrides.ts`, `statusPageEntries.ts`
3. Module components in `src/components/inbox/`, `src/components/oncall/`, `src/components/status/`, `src/components/platform/`
4. 8 route files: `Inbox.tsx`, `NotificationPreferences.tsx`, `OnCall.tsx`, `OnCallSchedule.tsx`, `OnCallOverrides.tsx`, `StatusPage.tsx`, `Profile.tsx`, `Settings.tsx`
5. Routing config finalized — zero `<Placeholder />` components remaining
6. Doc 0 `mockCurrentUser` updated with full profile fields
7. All notification `actionUrl` values verified to point to real routes
8. War Room `[Status page →]` link wired to `/status`
9. All topbar/avatar menu links verified real

---

## 🎉 CONGRATULATIONS — OIS MVP UI COMPLETE

After executing Doc 6, the OIS MVP UI is fully built:

**20 modules × ~80 routes × 8 documents**

| Cluster | Modules | Docs |
|---|---|---|
| Foundation | Dashboard, Auth, Layout | Doc 0 |
| CMDB | Configuration Management | Doc 1 |
| Observability | Monitoring, Event Management | Doc 2 |
| Operational Response | Incident, Problem, Service Request, Knowledge | Doc 3a, 3b |
| Change & Delivery | Change, Release, Deployment, Validation | Doc 4a, 4b |
| Service Health | Availability, Capacity, Continuity, Measurement, Improvement | Doc 5a, 5b, 5c |
| Platform | Inbox, Notifications, On-Call, Status Page, Profile | Doc 6 |

The complete showcase demo story:
```
INC-2026-00184 (P1) → War Room → PRB-2026-00018 → RCA → CHG-2026-00091
→ REL-2026-00020 → DEP-2026-00342 (live!) → TST-RUN-2026-04812 (live!)
→ SGN-2026-00040 (pending) → IMP-2026-00011 (in progress) → /status
```
Every step navigable. Every cross-link real. Every data point consistent.

---

*End of Doc 6. OIS MVP UI prompt series complete.*
