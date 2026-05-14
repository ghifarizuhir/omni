import { Severity } from './common';

export type IncidentStatus =
  | 'new'
  | 'triaging'
  | 'in_progress'
  | 'pending'
  | 'resolved'
  | 'closed';

export type IncidentPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type SLAStatus = 'healthy' | 'warning' | 'breached' | 'paused' | 'met';

export type IncidentEventKind =
  | 'created'
  | 'assigned'
  | 'priority_changed'
  | 'status_changed'
  | 'comment_added'
  | 'ci_linked'
  | 'ci_unlinked'
  | 'problem_linked'
  | 'event_linked'
  | 'sla_warning'
  | 'sla_breached'
  | 'escalated'
  | 'major_declared'
  | 'comms_posted'
  | 'resolution_added'
  | 'resolved'
  | 'reopened'
  | 'closed'
  | 'promoted_major'
  | 'linked'
  | 'watcher_added'
  | 'watcher_removed';

export interface Incident {
  id: string;
  publicId: string;

  title: string;
  description: string;

  status: IncidentStatus;
  priority: IncidentPriority;
  severity: Severity;

  isMajor: boolean;
  majorDeclaredAt?: string;
  majorDeclaredBy?: string;
  incidentCommander?: string;

  assigneeId?: string;
  assigneeName?: string;
  assigneeTeamId?: string;

  reporterId: string;
  reporterChannel: 'monitoring' | 'user_report' | 'self_service' | 'phone' | 'email' | 'integration';

  affectedCIIds: string[];
  affectedCIPublicIds: string[];
  affectedServiceIds: string[];
  customerImpact?: string;

  triggeringEventId?: string;
  triggeringEventPublicId?: string;
  linkedProblemId?: string;
  linkedProblemPublicId?: string;
  linkedChangeIds?: string[];

  slaResponseTarget: number;
  slaResolveTarget: number;
  slaResponseStatus: SLAStatus;
  slaResolveStatus: SLAStatus;
  firstResponseAt?: string;

  resolution?: {
    summary: string;
    rootCause?: string;
    workaround?: string;
    resolvedAt: string;
    resolvedBy: string;
  };
  reopenCount: number;

  createdAt: string;
  updatedAt: string;
  closedAt?: string;

  tags: string[];

  // M6.11 B1.4 — watchers persisted on the incident JSON snapshot.
  watchers?: Array<{ userId: string; userName?: string }>;
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  kind: IncidentEventKind;
  actorId: string | 'system';
  actorName: string;
  timestamp: string;
  details?: {
    fromStatus?: IncidentStatus;
    toStatus?: IncidentStatus;
    fromPriority?: IncidentPriority;
    toPriority?: IncidentPriority;
    assigneeId?: string;
    assigneeName?: string;
    ciPublicId?: string;
    eventPublicId?: string;
    problemPublicId?: string;
    commsBody?: string;
    commsAudience?: 'internal' | 'all_staff' | 'customer';
    note?: string;
  };
}

export interface IncidentComment {
  id: string;
  incidentId: string;
  authorId: string;
  authorName: string;
  body: string;
  isInternal: boolean;
  mentions: string[];
  attachments?: Array<{ id: string; name: string; size: number; mimeType: string }>;
  createdAt: string;
  updatedAt?: string;
  parentCommentId?: string;
}
