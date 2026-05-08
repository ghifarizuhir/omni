import { CIType, RelationshipType, CIStatus, CIAuditEntry } from '../types/ci';
import { EventType, EventStatus, EventSource, MonitoringRuleType, AlertChannel } from '../types/monitoring';

export const ciTypeMeta: Record<CIType, { label: string; icon: string; color: string; bg: string }> = {
  server:        { label: 'Server',        icon: 'Server',       color: '#067647', bg: '#ECFDF3' },
  application:   { label: 'Application',   icon: 'Boxes',        color: '#1F4FD4', bg: '#EEF2FF' },
  database:      { label: 'Database',      icon: 'Database',     color: '#6941C6', bg: '#F4F3FF' },
  load_balancer: { label: 'Load Balancer', icon: 'Network',      color: '#0BA5EC', bg: '#F0F9FF' },
  service:       { label: 'Service',       icon: 'Layers',       color: '#1F4FD4', bg: '#EEF2FF' },
  network:       { label: 'Network',       icon: 'Router',       color: '#475467', bg: '#F1F3F7' },
  storage:       { label: 'Storage',       icon: 'HardDrive',    color: '#DC6803', bg: '#FFFAEB' },
  endpoint:      { label: 'Endpoint',      icon: 'Plug',         color: '#C11574', bg: '#FDF2FA' },
};

export const relationshipTypeMeta: Record<RelationshipType, { label: string; color: string; lineStyle: 'solid' | 'dashed' }> = {
  depends_on:   { label: 'depends on',   color: '#F04438', lineStyle: 'solid'  },
  contains:     { label: 'contains',     color: '#1F4FD4', lineStyle: 'solid'  },
  runs_on:      { label: 'runs on',      color: '#475467', lineStyle: 'dashed' },
  connects_to:  { label: 'connects to',  color: '#0BA5EC', lineStyle: 'solid'  },
  managed_by:   { label: 'managed by',   color: '#6941C6', lineStyle: 'dashed' },
  part_of:      { label: 'part of',      color: '#067647', lineStyle: 'dashed' },
};

export const ciStatusMeta: Record<CIStatus, { label: string; color: string; bg: string }> = {
  active:      { label: 'Active',      color: '#067647', bg: '#ECFDF3' },
  planned:     { label: 'Planned',     color: '#0BA5EC', bg: '#F0F9FF' },
  maintenance: { label: 'Maintenance', color: '#0BA5EC', bg: '#F0F9FF' },
  retired:     { label: 'Retired',     color: '#475467', bg: '#F1F3F7' },
  unknown:     { label: 'Unknown',     color: '#98A2B3', bg: '#F1F3F7' },
};

export const auditActionMeta: Record<CIAuditEntry['action'], { label: string; icon: string; color: string }> = {
  created:              { label: 'Created',              icon: 'Plus',       color: '#067647' },
  updated:              { label: 'Updated',              icon: 'Pencil',     color: '#475467' },
  deleted:              { label: 'Deleted',              icon: 'Trash2',     color: '#F04438' },
  relationship_added:   { label: 'Relationship added',   icon: 'Link',       color: '#1F4FD4' },
  relationship_removed: { label: 'Relationship removed', icon: 'Unlink',     color: '#DC6803' },
  status_changed:       { label: 'Status changed',       icon: 'RefreshCw',  color: '#6941C6' },
  discovered:           { label: 'Discovered',           icon: 'Search',     color: '#0BA5EC' },
};

export const eventTypeMeta: Record<EventType, { label: string; color: string; bg: string; icon: string }> = {
  informational: { label: 'INFORMATIONAL', color: '#475467', bg: '#F1F3F7', icon: 'Info' },
  warning:       { label: 'WARNING',       color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  exception:     { label: 'EXCEPTION',     color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
};

export const eventStatusMeta: Record<EventStatus, { label: string; color: string; bg: string; dot: string }> = {
  open:         { label: 'Open',         color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  acknowledged: { label: 'Acknowledged', color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  resolved:     { label: 'Resolved',     color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  suppressed:   { label: 'Suppressed',   color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const eventSourceMeta: Record<EventSource, { label: string; icon: string }> = {
  prometheus:     { label: 'Prometheus',     icon: 'Activity' },
  opentelemetry:  { label: 'OpenTelemetry',  icon: 'Telescope' },
  log_pattern:    { label: 'Log pattern',    icon: 'FileText' },
  synthetic:      { label: 'Synthetic',      icon: 'Eye' },
  webhook:        { label: 'Webhook',        icon: 'Webhook' },
  cicd:           { label: 'CI/CD',          icon: 'GitBranch' },
  cloud_provider: { label: 'Cloud provider', icon: 'Cloud' },
  manual:         { label: 'Manual',         icon: 'User' },
};

export const ruleTypeMeta: Record<MonitoringRuleType, { label: string; description: string; icon: string }> = {
  threshold:   { label: 'Threshold',   description: 'Metric crosses a value for a duration',      icon: 'TrendingUp' },
  anomaly:     { label: 'Anomaly',     description: 'Statistical deviation from baseline',         icon: 'Sparkles' },
  composite:   { label: 'Composite',   description: 'Combination of multiple sub-rules',           icon: 'Combine' },
  log_pattern: { label: 'Log pattern', description: 'Log query matches',                           icon: 'FileSearch' },
  synthetic:   { label: 'Synthetic',   description: 'External probe / health check',               icon: 'Eye' },
  absence:     { label: 'Absence',     description: 'Heartbeat missing for N minutes',             icon: 'CircleSlash' },
};

export const channelMeta: Record<AlertChannel, { label: string; icon: string }> = {
  email:   { label: 'Email',   icon: 'Mail' },
  slack:   { label: 'Slack',   icon: 'MessageSquare' },
  teams:   { label: 'Teams',   icon: 'MessageSquare' },
  sms:     { label: 'SMS',     icon: 'Smartphone' },
  webhook: { label: 'Webhook', icon: 'Webhook' },
  in_app:  { label: 'In-app',  icon: 'Bell' },
};
