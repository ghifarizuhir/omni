import { NotificationPreference, QuietHoursConfig } from '../types/platform';

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
  daysOfWeek: [0, 6],
};
