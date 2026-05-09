import { CIType, RelationshipType, CIStatus, CIAuditEntry } from '../types/ci';
import { EventType, EventStatus, EventSource, MonitoringRuleType, AlertChannel } from '../types/monitoring';
import { IncidentStatus, SLAStatus, IncidentEventKind, IncidentPriority } from '../types/incident';
import { ProblemStatus, ProblemSource, RCATechnique } from '../types/problem';
import { RequestStatus, CatalogCategory, WorkflowStepStatus } from '../types/request';
import { KBStatus, KBContentType } from '../types/knowledge';

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

// ── Incident & Problem ──────────────────────────────────────────────────────

export const incidentStatusMeta: Record<IncidentStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:         { label: 'New',         color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  triaging:    { label: 'Triaging',    color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_progress: { label: 'In Progress', color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  pending:     { label: 'Pending',     color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  resolved:    { label: 'Resolved',    color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed:      { label: 'Closed',      color: '#475467', bg: '#F1F3F7', dot: '#475467' },
};

export const slaStatusMeta: Record<SLAStatus, { label: string; dot: string; color: string }> = {
  healthy:  { label: 'Healthy',  dot: '#12B76A', color: '#067647' },
  warning:  { label: 'At risk',  dot: '#F79009', color: '#DC6803' },
  breached: { label: 'Breached', dot: '#F04438', color: '#B42318' },
  paused:   { label: 'Paused',   dot: '#98A2B3', color: '#475467' },
  met:      { label: 'Met',      dot: '#12B76A', color: '#067647' },
};

export const incidentPriorityMeta: Record<IncidentPriority, { label: string; color: string; bg: string; border: string }> = {
  P1: { label: 'P1', color: '#B42318', bg: '#FEF3F2', border: '#F04438' },
  P2: { label: 'P2', color: '#DC6803', bg: '#FFFAEB', border: '#F79009' },
  P3: { label: 'P3', color: '#B45309', bg: '#FFFBEB', border: '#F59E0B' },
  P4: { label: 'P4', color: '#027A48', bg: '#ECFDF3', border: '#12B76A' },
};

export const incidentEventKindMeta: Record<IncidentEventKind, { label: string; icon: string; color: string }> = {
  created:          { label: 'Created',          icon: 'Plus',          color: '#475467' },
  assigned:         { label: 'Assigned',          icon: 'UserPlus',      color: '#0BA5EC' },
  priority_changed: { label: 'Priority changed',  icon: 'ArrowUpDown',   color: '#DC6803' },
  status_changed:   { label: 'Status changed',    icon: 'RefreshCw',     color: '#0BA5EC' },
  comment_added:    { label: 'Comment',           icon: 'MessageCircle', color: '#475467' },
  ci_linked:        { label: 'CI linked',         icon: 'Link',          color: '#1F4FD4' },
  ci_unlinked:      { label: 'CI unlinked',       icon: 'Unlink',        color: '#475467' },
  problem_linked:   { label: 'Problem linked',    icon: 'Link',          color: '#6941C6' },
  event_linked:     { label: 'Event linked',      icon: 'Radio',         color: '#0BA5EC' },
  sla_warning:      { label: 'SLA warning',       icon: 'AlertTriangle', color: '#DC6803' },
  sla_breached:     { label: 'SLA breached',      icon: 'AlertOctagon',  color: '#B42318' },
  escalated:        { label: 'Escalated',         icon: 'ArrowUpRight',  color: '#B42318' },
  major_declared:   { label: 'Major declared',    icon: 'Siren',         color: '#B42318' },
  comms_posted:     { label: 'Communication',     icon: 'Megaphone',     color: '#DC6803' },
  resolution_added: { label: 'Resolution',        icon: 'CheckCheck',    color: '#067647' },
  resolved:         { label: 'Resolved',          icon: 'CheckCircle2',  color: '#067647' },
  reopened:         { label: 'Reopened',          icon: 'RefreshCw',     color: '#DC6803' },
  closed:           { label: 'Closed',            icon: 'XCircle',       color: '#475467' },
};

export const problemStatusMeta: Record<ProblemStatus, { label: string; color: string; bg: string; dot: string }> = {
  identified:      { label: 'Identified',      color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  investigating:   { label: 'Investigating',   color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  known_error:     { label: 'Known Error',     color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  fix_in_progress: { label: 'Fix in Progress', color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  closed:          { label: 'Closed',          color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
};

export const problemSourceMeta: Record<ProblemSource, { label: string; icon: string; description: string }> = {
  incident_pattern: { label: 'Incident Pattern', icon: 'Activity',    description: 'Detected from multiple correlated incidents' },
  major_incident:   { label: 'Major Incident',   icon: 'Siren',       description: 'Spawned from P1 PIR' },
  proactive:        { label: 'Proactive',         icon: 'Lightbulb',   description: 'Identified proactively by SRE' },
  audit:            { label: 'Audit',             icon: 'ShieldCheck', description: 'From compliance audit' },
  user_reported:    { label: 'User Reported',     icon: 'User',        description: 'Reported by end user' },
};

export const rcaTechniqueMeta: Record<RCATechnique, { label: string; description: string }> = {
  five_whys:  { label: 'Five Whys',  description: 'Iteratively ask "why" 5 times' },
  fishbone:   { label: 'Fishbone',   description: 'Categorized cause-and-effect (Ishikawa)' },
  fault_tree: { label: 'Fault Tree', description: 'Logical tree of contributing failures' },
  timeline:   { label: 'Timeline',   description: 'Chronological reconstruction' },
  narrative:  { label: 'Narrative',  description: 'Free-form prose' },
};

// ── Service Requests ─────────────────────────────────────────────────────────

export const requestStatusMeta: Record<RequestStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:           { label: 'Draft',           color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  submitted:       { label: 'Submitted',       color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  approved:        { label: 'Approved',        color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  in_fulfillment:  { label: 'In Fulfillment',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  pending_user:    { label: 'Pending User',    color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  fulfilled:       { label: 'Fulfilled',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed:          { label: 'Closed',          color: '#475467', bg: '#F1F3F7', dot: '#475467' },
  rejected:        { label: 'Rejected',        color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:       { label: 'Cancelled',       color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const catalogCategoryMeta: Record<CatalogCategory, { label: string; icon: string; color: string }> = {
  access:        { label: 'Access',        icon: 'Key',         color: '#1F4FD4' },
  equipment:     { label: 'Equipment',     icon: 'Laptop',      color: '#0BA5EC' },
  software:      { label: 'Software',      icon: 'Package',     color: '#6941C6' },
  communication: { label: 'Communication', icon: 'Phone',       color: '#067647' },
  personnel:     { label: 'Personnel',     icon: 'Users',       color: '#DC6803' },
  general:       { label: 'General',       icon: 'Folder',      color: '#475467' },
};

export const workflowStepStatusMeta: Record<WorkflowStepStatus, { label: string; color: string; nodeStyle: 'completed' | 'active' | 'pending' | 'rejected' | 'skipped' }> = {
  pending:    { label: 'Pending',    color: '#98A2B3', nodeStyle: 'pending' },
  active:     { label: 'Active',     color: '#1F4FD4', nodeStyle: 'active' },
  completed:  { label: 'Completed',  color: '#12B76A', nodeStyle: 'completed' },
  skipped:    { label: 'Skipped',    color: '#98A2B3', nodeStyle: 'skipped' },
  rejected:   { label: 'Rejected',   color: '#F04438', nodeStyle: 'rejected' },
};

// ── Knowledge Base ────────────────────────────────────────────────────────────

export const kbStatusMeta: Record<KBStatus, { label: string; color: string; bg: string }> = {
  draft:      { label: 'Draft',      color: '#475467', bg: '#F1F3F7' },
  in_review:  { label: 'In Review',  color: '#DC6803', bg: '#FFFAEB' },
  published:  { label: 'Published',  color: '#067647', bg: '#ECFDF3' },
  archived:   { label: 'Archived',   color: '#475467', bg: '#F1F3F7' },
  expired:    { label: 'Expired',    color: '#B42318', bg: '#FEF3F2' },
};

export const kbContentTypeMeta: Record<KBContentType, { label: string; icon: string }> = {
  how_to:              { label: 'How-To',          icon: 'ListChecks' },
  troubleshooting:     { label: 'Troubleshooting', icon: 'Wrench' },
  runbook:             { label: 'Runbook',         icon: 'BookOpen' },
  reference:           { label: 'Reference',       icon: 'FileText' },
  faq:                 { label: 'FAQ',             icon: 'HelpCircle' },
  incident_postmortem: { label: 'Postmortem',      icon: 'Microscope' },
};
