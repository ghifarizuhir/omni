import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MoreHorizontal, ChevronDown, AlertCircle,
  Radio, Link2, Plus, BookOpen, GitMerge, Eye,
  UserPlus, CheckCircle2, Siren, MessageCircle, Server,
  ShieldAlert, X, Clock, Edit3, ExternalLink, Tag,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative, formatDate } from '@/src/lib/format';
import { getIncidentById, getIncidentsByCI, mockIncidents } from '@/src/mocks/incidents';
import { getTimelineForIncident } from '@/src/mocks/incidentTimelines';
import { getCommentsForIncident } from '@/src/mocks/incidentComments';
import { mockProblems } from '@/src/mocks/problems';
import { mockUsers } from '@/src/mocks/users';
import { mockServices } from '@/src/mocks/services';
import { mockCIs } from '@/src/mocks/cis';
import { Incident, IncidentStatus, IncidentEventKind } from '@/src/types/incident';
import { incidentStatusMeta, incidentEventKindMeta } from '@/src/lib/constants';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { IncidentPriorityBadge } from '@/src/components/incidents/IncidentPriorityBadge';
import { SLATimer } from '@/src/components/incidents/SLATimer';
import { SLAIndicator } from '@/src/components/incidents/SLAIndicator';
import { IncidentTimelineEntry } from '@/src/components/incidents/IncidentTimelineEntry';
import { IncidentCommentThread } from '@/src/components/incidents/IncidentCommentThread';
import { ResolveIncidentModal, ResolveData } from '@/src/components/incidents/ResolveIncidentModal';
import { Tabs } from '@/src/components/ui/Tabs';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: IncidentStatus[] = ['new', 'triaging', 'in_progress', 'pending'];
const PRIORITY_COLOR: Record<string, string> = {
  P1: '#B42318', P2: '#DC6803', P3: '#F79009', P4: '#027A48',
};

function getUserById(id?: string) {
  return mockUsers.find(u => u.id === id);
}

function getServiceNames(ids: string[]) {
  return ids.map(id => mockServices.find(s => s.id === id)?.name ?? id);
}

function getReporterChannelLabel(ch: string) {
  const map: Record<string, string> = {
    monitoring: 'Monitoring', user_report: 'User report',
    self_service: 'Self-service', phone: 'Phone', email: 'Email', integration: 'Integration',
  };
  return map[ch] ?? ch;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);

const StatusDropdown: React.FC<{
  status: IncidentStatus;
  onChange: (s: IncidentStatus) => void;
}> = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const meta = incidentStatusMeta[status];
  const transitions: IncidentStatus[] = ['new', 'triaging', 'in_progress', 'pending', 'resolved', 'closed'];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border bg-white text-sm font-medium hover:bg-ois-surface-muted transition-colors"
        style={{ color: meta.color }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.dot }} />
        {meta.label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-ois-border rounded-lg shadow-lg z-50 overflow-hidden">
          {transitions.map(s => {
            const m = incidentStatusMeta[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-ois-surface-muted transition-colors',
                  s === status && 'bg-ois-surface-muted font-semibold'
                )}
                style={{ color: m.color }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.dot }} />
                {m.label}
                {s === status && <span className="ml-auto text-xs opacity-60">current</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TIMELINE_FILTERS: { value: IncidentEventKind | 'all'; label: string }[] = [
  { value: 'all',            label: 'All' },
  { value: 'status_changed', label: 'Status' },
  { value: 'comment_added',  label: 'Comments' },
  { value: 'created',        label: 'System' },
  { value: 'ci_linked',      label: 'CI / Linkage' },
  { value: 'comms_posted',   label: 'Comms' },
];

const SYSTEM_KINDS: IncidentEventKind[] = ['created', 'assigned', 'ci_linked', 'ci_unlinked', 'sla_warning', 'sla_breached'];
const CI_LINKAGE_KINDS: IncidentEventKind[] = ['ci_linked', 'ci_unlinked', 'event_linked', 'problem_linked'];

// ── Main component ─────────────────────────────────────────────────────────────

export const IncidentDetail: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const incident = useMemo(() => getIncidentById(incidentId ?? ''), [incidentId]);

  const [status, setStatus] = useState<IncidentStatus>(incident?.status ?? 'new');
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolvedData, setResolvedData] = useState<ResolveData | null>(
    incident?.resolution
      ? { summary: incident.resolution.summary, rootCause: incident.resolution.rootCause, workaround: incident.resolution.workaround, suggestKB: false, schedulePIR: false }
      : null
  );
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const timeline = useMemo(
    () => incident ? getTimelineForIncident(incident.id) : [],
    [incident]
  );
  const comments = useMemo(
    () => incident ? getCommentsForIncident(incident.id) : [],
    [incident]
  );

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timeline;
    if (timelineFilter === 'status_changed') return timeline.filter(e => e.kind === 'status_changed');
    if (timelineFilter === 'comment_added') return timeline.filter(e => e.kind === 'comment_added');
    if (timelineFilter === 'created') return timeline.filter(e => SYSTEM_KINDS.includes(e.kind));
    if (timelineFilter === 'ci_linked') return timeline.filter(e => CI_LINKAGE_KINDS.includes(e.kind));
    if (timelineFilter === 'comms_posted') return timeline.filter(e => e.kind === 'comms_posted');
    return timeline;
  }, [timeline, timelineFilter]);

  // Watchers (mock — first 3 users associated with incident)
  const watchers = useMemo(() => {
    const ids = new Set([incident?.assigneeId, incident?.incidentCommander, 'u-006'].filter(Boolean) as string[]);
    return [...ids].map(id => getUserById(id)).filter(Boolean) as typeof mockUsers;
  }, [incident]);

  // Related incidents sharing same CIs
  const relatedIncidents = useMemo(() => {
    if (!incident) return [];
    const related = incident.affectedCIIds.flatMap(ci => getIncidentsByCI(ci));
    const seen = new Map<string, Incident>();
    for (const i of related) seen.set(i.id, i);
    return [...seen.values()].filter(i => i.id !== incident.id).slice(0, 5);
  }, [incident]);

  // Linked problem
  const linkedProblem = useMemo(() => {
    if (!incident?.linkedProblemId) return null;
    return mockProblems.find(p => p.id === incident.linkedProblemId) ?? null;
  }, [incident]);

  // Affected CIs
  const affectedCIs = useMemo(() => {
    if (!incident) return [];
    return incident.affectedCIIds.map(id => mockCIs.find(ci => ci.id === id)).filter(Boolean) as typeof mockCIs;
  }, [incident]);

  // Assignee / reporter
  const assignee = getUserById(incident?.assigneeId);
  const reporter = getUserById(incident?.reporterId);
  const commander = getUserById(incident?.incidentCommander);

  const handleStatusChange = (s: IncidentStatus) => {
    if (s === 'resolved' && !resolvedData) {
      setResolveOpen(true);
      return;
    }
    setStatus(s);
  };

  const handleResolve = (data: ResolveData) => {
    setResolvedData(data);
    setStatus('resolved');
  };

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle size={40} className="text-ois-text-subtle" />
        <div className="text-center">
          <p className="text-lg font-semibold text-ois-text">Incident not found</p>
          <p className="text-sm text-ois-text-subtle mt-1">{incidentId} does not exist in the system.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/incidents')}>
          <ArrowLeft size={15} className="mr-1.5" /> Back to incidents
        </Button>
      </div>
    );
  }

  const priorityColor = PRIORITY_COLOR[incident.priority] ?? '#475467';
  const isResolved = status === 'resolved' || status === 'closed';
  const serviceNames = getServiceNames(incident.affectedServiceIds);

  // ── Tabs definition ──────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',      label: 'Overview' },
    { id: 'timeline',      label: `Timeline (${timeline.length})` },
    { id: 'comments',      label: `Comments (${comments.filter(c => !c.parentCommentId).length})` },
    { id: 'affected-cis',  label: `Affected CIs (${affectedCIs.length})` },
    { id: 'linked',        label: 'Linked Items' },
    { id: 'resolution',    label: 'Resolution', disabled: !isResolved && !resolvedData },
  ];

  // ── Tab panels ───────────────────────────────────────────────────────────────

  const OverviewTab = (
    <div className="space-y-4">
      {/* Description */}
      <SectionCard title="Description">
        <div className="prose prose-sm max-w-none text-ois-text leading-relaxed whitespace-pre-wrap text-sm">
          {incident.description}
        </div>
        <button className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline">
          <Edit3 size={12} /> Edit
        </button>
      </SectionCard>

      {/* Customer impact */}
      {incident.customerImpact && (
        <SectionCard title="Customer impact">
          <p className="text-sm text-ois-text">{incident.customerImpact}</p>
        </SectionCard>
      )}

      {/* Triggering event */}
      {incident.triggeringEventPublicId && (
        <SectionCard title="Triggering event">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-ois-primary">
                {incident.triggeringEventPublicId}
              </p>
              <p className="text-xs text-ois-text-muted mt-0.5">
                Source: monitoring · {formatRelative(incident.createdAt)}
              </p>
            </div>
            <Link
              to={`/events/${incident.triggeringEventId}`}
              className="flex items-center gap-1 text-xs text-ois-primary hover:underline"
            >
              Open event <ExternalLink size={12} />
            </Link>
          </div>
        </SectionCard>
      )}

      {/* Quick actions */}
      <SectionCard title="Quick actions">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Link2, label: 'Link to existing problem' },
            { icon: Plus, label: 'Create problem from incident' },
            { icon: GitMerge, label: 'Link change' },
            { icon: BookOpen, label: 'Suggest KB article' },
          ].map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-2 text-xs text-ois-text-muted border border-ois-border rounded-lg px-3 py-2 hover:bg-ois-surface-muted hover:text-ois-text transition-colors text-left"
            >
              <Icon size={13} className="shrink-0 text-ois-text-subtle" />
              {label}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const TimelineTab = (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {TIMELINE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTimelineFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
              timelineFilter === f.value
                ? 'bg-ois-primary text-white border-ois-primary'
                : 'border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong bg-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline entries */}
      <div className="pl-1">
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-ois-text-subtle text-center py-8">No events match this filter.</p>
        ) : (
          filteredTimeline.map((event, i) => (
            <IncidentTimelineEntry
              key={event.id}
              event={event}
              isLast={i === filteredTimeline.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );

  const CommentsTab = (
    <div className="space-y-6">
      <IncidentCommentThread comments={comments} />

      {/* Composer */}
      <div className="border border-ois-border rounded-xl overflow-hidden bg-white">
        <div className="flex items-center gap-1 border-b border-ois-border px-3 py-2 bg-ois-surface-muted">
          {['B', 'I', '</>', '🔗', '@'].map(t => (
            <button key={t} className="text-xs font-mono text-ois-text-muted hover:text-ois-text px-1.5 py-0.5 rounded hover:bg-ois-border transition-colors">
              {t}
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          placeholder="Type a comment… (Markdown supported)"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          className="w-full px-4 py-3 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-ois-border bg-ois-surface-muted">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-ois-text-muted">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={e => setIsInternal(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-ois-primary"
            />
            <span className="flex items-center gap-1">Internal note <span className="opacity-60">(not visible to reporter)</span></span>
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNewComment('')}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!newComment.trim()}>Comment</Button>
          </div>
        </div>
      </div>
    </div>
  );

  const AffectedCIsTab = (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <Plus size={14} className="mr-1" /> Link CI
        </Button>
      </div>
      {affectedCIs.length === 0 && (
        <p className="text-sm text-ois-text-subtle text-center py-8">No CIs linked.</p>
      )}
      {affectedCIs.map(ci => (
        <div
          key={ci.id}
          className="flex items-center justify-between p-3 border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors cursor-pointer"
          onClick={() => navigate(`/cmdb/${ci.publicId}`)}
        >
          <div>
            <p className="text-sm font-semibold text-ois-text">{ci.name}</p>
            <p className="text-xs text-ois-text-subtle font-mono mt-0.5">{ci.publicId}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
              ci.health === 'operational' ? 'bg-green-50 text-green-700' :
              ci.health === 'degraded' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            )}>
              {ci.health}
            </span>
            <span className="text-xs text-ois-text-subtle capitalize">{ci.type}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const LinkedItemsTab = (
    <div className="space-y-4">
      {/* Triggering event */}
      {incident.triggeringEventPublicId && (
        <SectionCard title={`Triggering event (1)`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-ois-primary">{incident.triggeringEventPublicId}</p>
              <p className="text-xs text-ois-text-muted mt-0.5">Monitoring event · {formatRelative(incident.createdAt)}</p>
            </div>
            <Link to={`/events/${incident.triggeringEventId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
              Open <ExternalLink size={12} />
            </Link>
          </div>
        </SectionCard>
      )}

      {/* Linked problem */}
      <SectionCard title={linkedProblem ? 'Linked problem (1)' : 'Linked problem (0)'}>
        {linkedProblem ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-purple-700">{linkedProblem.publicId}</p>
              <p className="text-sm text-ois-text mt-0.5">{linkedProblem.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-ois-text-muted capitalize">{linkedProblem.status.replace('_', ' ')}</span>
                <span className="text-ois-text-subtle">·</span>
                <span className="text-xs text-ois-text-muted">
                  {linkedProblem.relatedIncidentCount} related incidents
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/problems/${linkedProblem.publicId}`)}>
              Open
            </Button>
          </div>
        ) : (
          <button className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
            <Plus size={12} /> Link problem
          </button>
        )}
      </SectionCard>

      {/* Linked changes */}
      <SectionCard title={`Linked changes (${incident.linkedChangeIds?.length ?? 0})`}>
        {(incident.linkedChangeIds?.length ?? 0) === 0 ? (
          <button className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
            <Plus size={12} /> Link change
          </button>
        ) : (
          <div className="space-y-1">
            {incident.linkedChangeIds!.map(id => (
              <p key={id} className="text-xs font-mono text-ois-primary">{id}</p>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Linked KB articles */}
      <SectionCard title="Linked KB articles (0)">
        <button className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
          <BookOpen size={12} /> Suggest article
        </button>
      </SectionCard>
    </div>
  );

  const ResolutionTab = (
    <div className="space-y-4">
      {isResolved || resolvedData ? (
        <>
          <SectionCard title="Resolution summary">
            <p className="text-sm text-ois-text">{resolvedData?.summary ?? incident.resolution?.summary}</p>
          </SectionCard>
          {(resolvedData?.rootCause ?? incident.resolution?.rootCause) && (
            <SectionCard title="Root cause (lightweight)">
              <p className="text-sm text-ois-text">{resolvedData?.rootCause ?? incident.resolution?.rootCause}</p>
              {incident.linkedProblemPublicId && (
                <p className="text-xs text-ois-text-subtle mt-1">
                  Linked to{' '}
                  <Link to={`/problems/${incident.linkedProblemPublicId}`} className="text-ois-primary hover:underline font-mono">
                    {incident.linkedProblemPublicId}
                  </Link>{' '}
                  for full RCA.
                </p>
              )}
            </SectionCard>
          )}
          {(resolvedData?.workaround ?? incident.resolution?.workaround) && (
            <SectionCard title="Workaround applied">
              <p className="text-sm text-ois-text">{resolvedData?.workaround ?? incident.resolution?.workaround}</p>
            </SectionCard>
          )}
          <div className="text-xs text-ois-text-subtle">
            Resolved by{' '}
            <span className="font-medium text-ois-text">
              {getUserById(incident.resolution?.resolvedBy)?.name ?? 'Unknown'}
            </span>
            {incident.resolution?.resolvedAt && (
              <> · {formatRelative(incident.resolution.resolvedAt)}</>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <CheckCircle2 size={36} className="mx-auto text-ois-text-subtle mb-3" />
          <p className="text-sm text-ois-text-muted">Not yet resolved.</p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => setResolveOpen(true)}
          >
            Mark as resolved
          </Button>
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-ois-bg">
      {/* ─── Top header ────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border sticky top-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} />
            Queue
          </button>
          <div className="flex items-center gap-2">
            <StatusDropdown status={status} onChange={handleStatusChange} />
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Incident header */}
        <div className="flex items-start gap-0">
          {/* Severity stripe */}
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityColor }} />

          <div className="flex-1 px-6 py-4">
            <div className="flex items-start gap-3 mb-2">
              <IncidentPriorityBadge priority={incident.priority} />
              {incident.isMajor && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <Siren size={11} /> MAJOR
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-ois-text-subtle mb-1">{incident.publicId}</p>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{incident.title}</h1>

            {/* Tags */}
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {incident.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full"
                >
                  <Tag size={9} />
                  {tag}
                </span>
              ))}
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2.5 text-xs text-ois-text-subtle flex-wrap">
              <span>
                Created {formatRelative(incident.createdAt)}
                {reporter && <> by {reporter.name} ({getReporterChannelLabel(incident.reporterChannel)})</>}
              </span>
              {assignee && (
                <span>
                  · Assigned to <span className="font-medium text-ois-text">{assignee.name}</span>
                </span>
              )}
              <span>· Updated {formatRelative(incident.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: 3-column grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-[280px_1fr_280px] gap-0 items-start">

        {/* ── Left sidebar ──────────────────────────────────────────────────────── */}
        <aside className="sticky top-[113px] max-h-[calc(100vh-113px)] overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          {/* At a glance */}
          <SectionCard title="At a glance">
            <dl className="space-y-2 text-xs">
              {[
                { label: 'Status',    value: <IncidentStatusPill status={status} /> },
                { label: 'Priority',  value: <IncidentPriorityBadge priority={incident.priority} /> },
                { label: 'Severity',  value: <span className="font-semibold">{incident.severity}</span> },
                { label: 'Created',   value: formatRelative(incident.createdAt) },
                { label: 'Reporter',  value: reporter?.name ?? incident.reporterId },
                { label: 'Channel',   value: getReporterChannelLabel(incident.reporterChannel) },
                { label: 'Assignee',  value: assignee ? (
                  <span className="flex items-center gap-1.5">
                    <Avatar name={assignee.name} size="xs" />
                    {assignee.name}
                  </span>
                ) : '—' },
                ...(incident.incidentCommander ? [{
                  label: 'Commander',
                  value: commander?.name ?? incident.incidentCommander,
                }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-ois-text-subtle shrink-0">{label}</dt>
                  <dd className="text-ois-text font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          {/* SLA timers */}
          <SectionCard title="SLA timers">
            <div className="space-y-4">
              <SLATimer
                label="Response"
                status={incident.slaResponseStatus}
                targetMinutes={incident.slaResponseTarget}
                createdAt={incident.createdAt}
                resolvedAt={incident.firstResponseAt}
              />
              <SLATimer
                label="Resolution"
                status={incident.slaResolveStatus}
                targetMinutes={incident.slaResolveTarget}
                createdAt={incident.createdAt}
                resolvedAt={incident.resolution?.resolvedAt}
              />
            </div>
          </SectionCard>

          {/* Affected services */}
          {serviceNames.length > 0 && (
            <SectionCard title="Affected services">
              <ul className="space-y-1">
                {serviceNames.map(name => (
                  <li key={name} className="flex items-center gap-2 text-xs text-ois-text">
                    <span className="w-2 h-2 rounded-full bg-ois-danger shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Watchers */}
          <SectionCard title={`Watchers (${watchers.length})`}>
            <ul className="space-y-2">
              {watchers.map(w => (
                <li key={w.id} className="flex items-center gap-2">
                  <Avatar name={w.name} size="xs" />
                  <span className="text-xs text-ois-text">{w.name}</span>
                </li>
              ))}
            </ul>
            <button className="mt-2 text-xs text-ois-primary hover:underline flex items-center gap-1">
              <Plus size={12} /> Add watcher
            </button>
          </SectionCard>
        </aside>

        {/* ── Center: tabs ──────────────────────────────────────────────────────── */}
        <main className="min-w-0 px-6 py-5">
          <Tabs tabs={tabs}>
            {OverviewTab}
            {TimelineTab}
            {CommentsTab}
            {AffectedCIsTab}
            {LinkedItemsTab}
            {ResolutionTab}
          </Tabs>
        </main>

        {/* ── Right sidebar ─────────────────────────────────────────────────────── */}
        <aside className="sticky top-[113px] max-h-[calc(100vh-113px)] overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          {/* Quick actions */}
          <SectionCard title="Quick actions">
            <div className="space-y-1.5">
              {[
                { icon: UserPlus,     label: 'Assign to me' },
                { icon: Eye,          label: 'Acknowledge' },
                { icon: CheckCircle2, label: 'Resolve', action: () => setResolveOpen(true), primary: !isResolved },
                ...(incident.isMajor ? [] : [{ icon: Siren, label: 'Promote to Major' }]),
                { icon: MessageCircle, label: 'Add comment' },
                { icon: Server,       label: 'Link CI' },
                { icon: ShieldAlert,  label: 'Link problem' },
              ].map(({ icon: Icon, label, action, primary }) => (
                <button
                  key={label}
                  onClick={action}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                    primary
                      ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
                      : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted'
                  )}
                >
                  <Icon size={13} className={primary ? 'text-white' : 'text-ois-text-subtle'} />
                  {label}
                </button>
              ))}
            </div>
          </SectionCard>

          {/* AI suggestions placeholder */}
          <SectionCard title="AI suggestions">
            <p className="text-xs text-ois-text-subtle italic">AI-powered suggestions deferred to v2.</p>
          </SectionCard>

          {/* Related incidents */}
          {relatedIncidents.length > 0 && (
            <SectionCard title={`Related incidents (${relatedIncidents.length})`}>
              <p className="text-[11px] text-ois-text-subtle mb-2">Same CI in last 7 days:</p>
              <ul className="space-y-2">
                {relatedIncidents.map(inc => (
                  <li key={inc.id}>
                    <button
                      onClick={() => navigate(`/incidents/${inc.publicId}`)}
                      className="w-full text-left hover:bg-ois-surface-muted rounded px-1 py-0.5 transition-colors"
                    >
                      <p className="text-xs font-mono text-ois-primary">{inc.publicId}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <IncidentPriorityBadge priority={inc.priority} />
                        <IncidentStatusPill status={inc.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button className="mt-2 text-xs text-ois-primary hover:underline">View all →</button>
            </SectionCard>
          )}
        </aside>
      </div>

      {/* Resolve modal */}
      <ResolveIncidentModal
        incident={incident}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />
    </div>
  );
};
