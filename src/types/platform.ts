// ============================================================
// INBOX
// ============================================================

export type InboxItemType =
  | 'approval_request'
  | 'mention'
  | 'incident_update'
  | 'assignment'
  | 'sla_warning'
  | 'system_alert'
  | 'report_ready'
  | 'kb_review'
  | 'dr_test_reminder';

export type InboxItemPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface InboxItem {
  id: string;
  type: InboxItemType;
  priority: InboxItemPriority;
  title: string;
  summary: string;
  body?: string;
  sourceType: string;
  sourcePublicId: string;
  sourceTitle: string;
  sourceUrl: string;
  senderId: string | 'system';
  senderName: string;
  senderAvatarUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  isPinned: boolean;
  requiresAction: boolean;
  primaryAction?: {
    label: string;
    navigateTo: string;
  };
  secondaryAction?: {
    label: string;
    navigateTo: string;
  };
  receivedAt: string;
  expiresAt?: string;
  readAt?: string;
  archivedAt?: string;
}

export interface LegacyInboxItem {
  id: string;
  type: 'approval' | 'escalation' | 'sign_off' | 'acknowledgment';
  sourceModule: 'incident' | 'change' | 'request' | 'release';
  sourceRef: string;
  title: string;
  body: string;
  priority: 'urgent' | 'normal';
  dueAt: string;
  createdAt: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface NotificationItem {
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
  channels: NotificationChannel[];
  respectQuietHours: boolean;
  overrideForUrgent: boolean;
}

export interface QuietHoursConfig {
  userId: string;
  enabled: boolean;
  timezone: string;
  fromHour: number;
  toHour: number;
  daysOfWeek: number[];
}

// ============================================================
// ON-CALL
// ============================================================

export type OnCallShiftType = 'primary' | 'secondary' | 'shadow';

export interface OnCallSchedule {
  id: string;
  publicId: string;
  name: string;
  teamId: string;
  teamName: string;
  description?: string;
  currentPrimaryId: string;
  currentPrimaryName: string;
  currentSecondaryId?: string;
  currentSecondaryName?: string;
  rotationIntervalDays: number;
  rotationStartDayOfWeek: number;
  rotationTime?: string;
  members: Array<{
    userId: string;
    userName: string;
    shiftOrder: number;
  }>;
  upcomingShifts: OnCallShift[];
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
  startAt: string;
  endAt: string;
  isCurrentShift: boolean;
  isOverridden: boolean;
  overrideById?: string;
  overrideByName?: string;
}

export interface OnCallOverride {
  id: string;
  publicId: string;
  scheduleId: string;
  scheduleName: string;
  originalUserId: string;
  originalUserName: string;
  overrideUserId: string;
  overrideUserName: string;
  startAt: string;
  endAt: string;
  reason?: string;
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
  serviceDescription?: string;
  status: StatusPageEntryStatus;
  statusMessage?: string;
  linkedOutagePublicId?: string;
  linkedIncidentPublicId?: string;
  lastUpdatedAt: string;
  lastUpdatedByName?: string;
  uptime90d: number;
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
    body: string;
    authorName: string;
  }>;
  startedAt: string;
  resolvedAt?: string;
}
