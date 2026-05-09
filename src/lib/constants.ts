import { CIType, RelationshipType, CIStatus, CIAuditEntry, Environment } from '../types/ci';
import { EventType, EventStatus, EventSource, MonitoringRuleType, AlertChannel } from '../types/monitoring';
import { IncidentStatus, SLAStatus, IncidentEventKind, IncidentPriority } from '../types/incident';
import { ProblemStatus, ProblemSource, RCATechnique } from '../types/problem';
import { RequestStatus, CatalogCategory, WorkflowStepStatus } from '../types/request';
import { KBStatus, KBContentType } from '../types/knowledge';
import { ChangeType, ChangeStatus, RiskLevel, CABVote } from '../types/change';
import { ReleaseStatus, ReleaseType, ReleaseStage } from '../types/release';
import { DeploymentStatus, DeploymentStrategy, DeploymentTrigger, DeploymentStageStatus, LogLevel } from '../types/deployment';
import { TestRunStatus, TestStepResultStatus, TestCasePriority, SignOffStatus, SignOffType } from '../types/testing';
import { AvailabilitySLAStatus, OutageType, SLAMetric, CapacityResourceType, CapacityThresholdSeverity, ScalingRecommendation } from '../types';

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

// ── Change Management ─────────────────────────────────────────────────────────

export const changeTypeMeta: Record<ChangeType, { label: string; description: string; color: string; bg: string; icon: string }> = {
  standard:  { label: 'Standard',  description: 'Pre-approved low-risk',     color: '#067647', bg: '#ECFDF3', icon: 'CheckCircle' },
  normal:    { label: 'Normal',    description: 'Full CAB review required',  color: '#0BA5EC', bg: '#F0F9FF', icon: 'FileText' },
  emergency: { label: 'Emergency', description: 'Urgent expedited approval', color: '#B42318', bg: '#FEF3F2', icon: 'AlertTriangle' },
};

export const changeStatusMeta: Record<ChangeStatus, { label: string; color: string; bg: string; dot: string }> = {
  draft:             { label: 'Draft',            color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  submitted:         { label: 'Submitted',        color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_review:         { label: 'In Review',        color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  approved:          { label: 'Approved',         color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  scheduled:         { label: 'Scheduled',        color: '#6941C6', bg: '#F4F3FF', dot: '#9E77ED' },
  implementing:      { label: 'Implementing',     color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  implemented:       { label: 'Implemented',      color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed_successful: { label: 'Closed (success)', color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  closed_failed:     { label: 'Closed (failed)',  color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  rejected:          { label: 'Rejected',         color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:         { label: 'Cancelled',        color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const riskMeta: Record<RiskLevel, { label: string; color: string; bg: string; min: number; max: number }> = {
  low:      { label: 'Low',      color: '#067647', bg: '#ECFDF3', min: 0,  max: 30 },
  medium:   { label: 'Medium',   color: '#DC6803', bg: '#FFFAEB', min: 31, max: 65 },
  high:     { label: 'High',     color: '#B42318', bg: '#FEF3F2', min: 66, max: 90 },
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2', min: 91, max: 100 },
};

export const cabVoteMeta: Record<CABVote, { label: string; color: string; icon: string }> = {
  approve:                 { label: 'Approve',                 color: '#12B76A', icon: 'Check' },
  approve_with_conditions: { label: 'Approve with conditions', color: '#F79009', icon: 'CheckCircle' },
  reject:                  { label: 'Reject',                  color: '#F04438', icon: 'X' },
  abstain:                 { label: 'Abstain',                 color: '#98A2B3', icon: 'Minus' },
};

// ── Release Management ────────────────────────────────────────────────────────

export const releaseStatusMeta: Record<ReleaseStatus, { label: string; color: string; bg: string; dot: string }> = {
  planning:           { label: 'Planning',           color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  locked:             { label: 'Locked',             color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  in_validation:      { label: 'In Validation',      color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  ready:              { label: 'Ready',              color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  deploying:          { label: 'Deploying',          color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  released:           { label: 'Released',           color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  partially_released: { label: 'Partially Released', color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  rolled_back:        { label: 'Rolled Back',        color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  cancelled:          { label: 'Cancelled',          color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
};

export const releaseTypeMeta: Record<ReleaseType, { label: string; description: string; color: string }> = {
  major:  { label: 'Major',  description: 'Breaking changes', color: '#B42318' },
  minor:  { label: 'Minor',  description: 'New features',     color: '#0BA5EC' },
  patch:  { label: 'Patch',  description: 'Bug fixes',        color: '#067647' },
  hotfix: { label: 'Hotfix', description: 'Emergency patch',  color: '#DC6803' },
};

export const stageStatusMeta: Record<ReleaseStage['status'], { label: string; color: string; icon: string; nodeStyle: string }> = {
  pending:     { label: 'Pending',     color: '#98A2B3', icon: 'Circle',       nodeStyle: 'pending' },
  in_progress: { label: 'In Progress', color: '#0BA5EC', icon: 'Loader2',      nodeStyle: 'active' },
  success:     { label: 'Success',     color: '#12B76A', icon: 'CheckCircle2', nodeStyle: 'completed' },
  failed:      { label: 'Failed',      color: '#F04438', icon: 'XCircle',      nodeStyle: 'failed' },
  rolled_back: { label: 'Rolled Back', color: '#DC6803', icon: 'Undo2',        nodeStyle: 'rollback' },
  skipped:     { label: 'Skipped',     color: '#98A2B3', icon: 'MinusCircle',  nodeStyle: 'skipped' },
};

// ── Deployment & Validation ───────────────────────────────────────────────────

export const deploymentStatusMeta: Record<DeploymentStatus, { label: string; color: string; bg: string; dot: string; animated: boolean }> = {
  pending:       { label: 'Pending',       color: '#475467', bg: '#F1F3F7', dot: '#98A2B3', animated: false },
  running:       { label: 'Running',       color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC', animated: true  },
  success:       { label: 'Success',       color: '#067647', bg: '#ECFDF3', dot: '#12B76A', animated: false },
  failed:        { label: 'Failed',        color: '#B42318', bg: '#FEF3F2', dot: '#F04438', animated: false },
  rolled_back:   { label: 'Rolled Back',   color: '#DC6803', bg: '#FFFAEB', dot: '#F79009', animated: false },
  cancelled:     { label: 'Cancelled',     color: '#475467', bg: '#F1F3F7', dot: '#98A2B3', animated: false },
  rolling_back:  { label: 'Rolling Back',  color: '#DC6803', bg: '#FFFAEB', dot: '#F79009', animated: true  },
};

export const environmentMeta: Record<Environment, { label: string; color: string; bg: string; shortLabel: string }> = {
  development: { label: 'Development', color: '#475467', bg: '#F1F3F7', shortLabel: 'dev'  },
  staging:     { label: 'Staging',     color: '#0BA5EC', bg: '#F0F9FF', shortLabel: 'stg'  },
  production:  { label: 'Production',  color: '#B42318', bg: '#FEF3F2', shortLabel: 'prod' },
  test:        { label: 'Test',        color: '#6941C6', bg: '#F4F3FF', shortLabel: 'test' },
};

export const deploymentStrategyMeta: Record<DeploymentStrategy, { label: string; description: string; icon: string }> = {
  rolling:    { label: 'Rolling',    description: 'Gradual replacement', icon: 'RefreshCw'  },
  blue_green: { label: 'Blue-Green', description: 'Switch at the end',   icon: 'GitBranch'  },
  canary:     { label: 'Canary',     description: 'Small % first',       icon: 'Bird'       },
  big_bang:   { label: 'Big Bang',   description: 'All at once',         icon: 'Zap'        },
  phased:     { label: 'Phased',     description: 'Manual gates',        icon: 'Layers'     },
};

export const deploymentTriggerMeta: Record<DeploymentTrigger, { label: string; icon: string; color: string }> = {
  manual:         { label: 'Manual',       icon: 'User',       color: '#475467' },
  cicd_pipeline:  { label: 'CI/CD',        icon: 'GitBranch',  color: '#0BA5EC' },
  scheduled:      { label: 'Scheduled',    icon: 'Clock',      color: '#6941C6' },
  auto_promotion: { label: 'Auto-Promote', icon: 'TrendingUp', color: '#067647' },
};

export const stageStatusMeta_dep: Record<DeploymentStageStatus, { color: string; icon: string; nodeStyle: string }> = {
  pending: { color: '#98A2B3', icon: 'Circle',       nodeStyle: 'pending'   },
  running: { color: '#0BA5EC', icon: 'Loader2',      nodeStyle: 'active'    },
  success: { color: '#12B76A', icon: 'CheckCircle2', nodeStyle: 'completed' },
  failed:  { color: '#F04438', icon: 'XCircle',      nodeStyle: 'failed'    },
  skipped: { color: '#98A2B3', icon: 'MinusCircle',  nodeStyle: 'skipped'   },
};

export const logLevelMeta: Record<LogLevel, { label: string; color: string; bg: string }> = {
  debug: { label: 'DEBUG', color: '#475467', bg: '#F1F3F7' },
  info:  { label: 'INFO',  color: '#0BA5EC', bg: '#F0F9FF' },
  warn:  { label: 'WARN',  color: '#DC6803', bg: '#FFFAEB' },
  error: { label: 'ERROR', color: '#B42318', bg: '#FEF3F2' },
  fatal: { label: 'FATAL', color: '#FFFFFF', bg: '#B42318' },
};

export const testRunStatusMeta: Record<TestRunStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: 'Pending',   color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  running:   { label: 'Running',   color: '#0BA5EC', bg: '#F0F9FF', dot: '#0BA5EC' },
  passed:    { label: 'Passed',    color: '#067647', bg: '#ECFDF3', dot: '#12B76A' },
  failed:    { label: 'Failed',    color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
  partial:   { label: 'Partial',   color: '#DC6803', bg: '#FFFAEB', dot: '#F79009' },
  cancelled: { label: 'Cancelled', color: '#475467', bg: '#F1F3F7', dot: '#98A2B3' },
  timed_out: { label: 'Timed Out', color: '#B42318', bg: '#FEF3F2', dot: '#F04438' },
};

export const testStepResultMeta: Record<TestStepResultStatus, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: '#98A2B3', icon: 'Circle'       },
  running: { label: 'Running', color: '#0BA5EC', icon: 'Loader2'      },
  passed:  { label: 'Passed',  color: '#12B76A', icon: 'CheckCircle2' },
  failed:  { label: 'Failed',  color: '#F04438', icon: 'XCircle'      },
  skipped: { label: 'Skipped', color: '#98A2B3', icon: 'MinusCircle'  },
};

export const testCasePriorityMeta: Record<TestCasePriority, { label: string; color: string; bg: string }> = {
  p0: { label: 'P0', color: '#B42318', bg: '#FEF3F2' },
  p1: { label: 'P1', color: '#DC6803', bg: '#FFFAEB' },
  p2: { label: 'P2', color: '#0BA5EC', bg: '#F0F9FF' },
  p3: { label: 'P3', color: '#475467', bg: '#F1F3F7' },
};

export const signOffStatusMeta: Record<SignOffStatus, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#DC6803', bg: '#FFFAEB' },
  approved: { label: 'Approved', color: '#067647', bg: '#ECFDF3' },
  rejected: { label: 'Rejected', color: '#B42318', bg: '#FEF3F2' },
  expired:  { label: 'Expired',  color: '#475467', bg: '#F1F3F7' },
};

export const signOffTypeMeta: Record<SignOffType, { label: string; icon: string }> = {
  release_validation: { label: 'Release validation', icon: 'Package'     },
  change_validation:  { label: 'Change validation',  icon: 'Wrench'      },
  security_scan:      { label: 'Security scan',      icon: 'Shield'      },
  compliance_check:   { label: 'Compliance check',   icon: 'ShieldCheck' },
};

// ── Availability Management ───────────────────────────────────────────────────

export const slaStatusMeta_avail: Record<AvailabilitySLAStatus, { label: string; color: string; bg: string; icon: string }> = {
  meeting:  { label: 'Meeting',  color: '#067647', bg: '#ECFDF3', icon: 'CheckCircle' },
  at_risk:  { label: 'At Risk',  color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  breached: { label: 'Breached', color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
};

export const outageTypeMeta: Record<OutageType, { label: string; color: string; bg: string; icon: string }> = {
  unplanned:     { label: 'Unplanned',     color: '#B42318', bg: '#FEF3F2', icon: 'AlertOctagon' },
  planned:       { label: 'Planned',       color: '#0BA5EC', bg: '#F0F9FF', icon: 'Calendar' },
  partial:       { label: 'Partial',       color: '#DC6803', bg: '#FFFAEB', icon: 'AlertTriangle' },
  detected_only: { label: 'Detected only', color: '#475467', bg: '#F1F3F7', icon: 'Eye' },
};

export const dailyHealthColors: Record<string, string> = {
  operational:    '#12B76A',
  degraded:       '#F79009',
  partial_outage: '#FB923C',
  major_outage:   '#F04438',
  maintenance:    '#0BA5EC',
};

export const slaMetricMeta: Record<SLAMetric, { label: string; description: string; unit: string }> = {
  availability:       { label: 'Availability',  description: 'Uptime percentage',         unit: '%' },
  mttr:               { label: 'MTTR',          description: 'Mean Time To Resolve',       unit: 'minutes' },
  mtbf:               { label: 'MTBF',          description: 'Mean Time Between Failures', unit: 'days' },
  mtrs:               { label: 'MTRS',          description: 'Mean Time to Restore',       unit: 'minutes' },
  response_time:      { label: 'Response Time', description: 'First response SLA',         unit: 'minutes' },
  first_byte_latency: { label: 'p95 Latency',   description: 'p95 first-byte latency',     unit: 'ms' },
};

// ── Capacity Management ───────────────────────────────────────────────────────

export const capacityResourceTypeMeta: Record<CapacityResourceType, { label: string; icon: string; defaultUnit: string }> = {
  cpu:                 { label: 'CPU',              icon: 'Cpu',         defaultUnit: '%' },
  memory:              { label: 'Memory',           icon: 'MemoryStick', defaultUnit: '%' },
  disk:                { label: 'Disk',             icon: 'HardDrive',   defaultUnit: '%' },
  network_bandwidth:   { label: 'Network',          icon: 'Network',     defaultUnit: 'Gbps' },
  db_connections:      { label: 'DB Connections',   icon: 'Database',    defaultUnit: 'connections' },
  queue_depth:         { label: 'Queue Depth',      icon: 'Layers',      defaultUnit: 'messages' },
  requests_per_second: { label: 'RPS',              icon: 'Activity',    defaultUnit: 'RPS' },
  storage_iops:        { label: 'Storage IOPS',     icon: 'HardDrive',   defaultUnit: 'IOPS' },
  concurrent_users:    { label: 'Concurrent Users', icon: 'Users',       defaultUnit: 'users' },
};

export const capacityThresholdSeverityMeta: Record<CapacityThresholdSeverity, { label: string; color: string; bg: string }> = {
  info:     { label: 'Info',     color: '#0BA5EC', bg: '#F0F9FF' },
  warning:  { label: 'Warning',  color: '#DC6803', bg: '#FFFAEB' },
  critical: { label: 'Critical', color: '#B42318', bg: '#FEF3F2' },
};

export const recommendationPriorityMeta: Record<ScalingRecommendation['priority'], { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#475467', bg: '#F1F3F7' },
  medium: { label: 'Medium', color: '#0BA5EC', bg: '#F0F9FF' },
  high:   { label: 'High',   color: '#DC6803', bg: '#FFFAEB' },
  urgent: { label: 'Urgent', color: '#B42318', bg: '#FEF3F2' },
};
