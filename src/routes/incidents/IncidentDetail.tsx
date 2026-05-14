import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MoreHorizontal, ChevronDown, AlertCircle,
  Radio, Link2, Plus, BookOpen, GitMerge, Eye,
  UserPlus, CheckCircle2, Siren, MessageCircle, Server,
  ShieldAlert, X, Clock, Edit3, ExternalLink, Tag,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative, formatDate } from '@/src/lib/format';
import {
  incidentsService, usersService, servicesService, cisService,
  problemsService, changesService, knowledgeService, continuityService,
  availabilityService, useResource,
} from '@/src/services';
import { Incident, IncidentStatus, IncidentEventKind, IncidentComment } from '@/src/types/incident';
import { incidentStatusMeta, incidentEventKindMeta } from '@/src/lib/constants';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { IncidentPriorityBadge } from '@/src/components/incidents/IncidentPriorityBadge';
import { ChangeStatusPill } from '@/src/components/changes/ChangeStatusPill';
import { RiskBadge } from '@/src/components/changes/RiskBadge';
import { SLATimer } from '@/src/components/incidents/SLATimer';
import { SLAIndicator } from '@/src/components/incidents/SLAIndicator';
import { IncidentTimelineEntry } from '@/src/components/incidents/IncidentTimelineEntry';
import { IncidentCommentThread } from '@/src/components/incidents/IncidentCommentThread';
import { ResolveIncidentModal, ResolveData } from '@/src/components/incidents/ResolveIncidentModal';
import { PromoteMajorModal } from '@/src/components/incidents/PromoteMajorModal';
import { LinkCIModal } from '@/src/components/incidents/LinkCIModal';
import { LinkProblemModal } from '@/src/components/incidents/LinkProblemModal';
import { LinkChangeModal } from '@/src/components/incidents/LinkChangeModal';
import { UserPickerModal } from '@/src/components/incidents/UserPickerModal';
import { Can, useCan as useCanRbac, incidentResource } from '@/src/lib/rbac';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: IncidentStatus[] = ['new', 'triaging', 'in_progress', 'pending'];
const PRIORITY_COLOR: Record<string, string> = {
  P1: '#B42318', P2: '#DC6803', P3: '#F79009', P4: '#027A48',
};

function getUserById(users: { id: string; name: string }[], id?: string) {
  return users.find(u => u.id === id);
}

function getServiceNames(services: { id: string; name: string }[], ids: string[]) {
  return ids.map(id => services.find(s => s.id === id)?.name ?? id);
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

  const { data: incidentData, loading: incidentLoading, refresh: refreshIncident } = useResource(
    () => (incidentId ? incidentsService.get(incidentId) : Promise.resolve(null)),
    [incidentId],
  );
  const incident = incidentData ?? undefined;

  const { data: usersData } = useResource(() => usersService.list(), []);
  const { data: servicesData } = useResource(() => servicesService.list(), []);
  const { data: cisData } = useResource(() => cisService.list(), []);
  const { data: problemsData } = useResource(() => problemsService.list(), []);
  const { data: changesData } = useResource(() => changesService.list(), []);
  const { data: kbData } = useResource(() => knowledgeService.articles(), []);
  const { data: biaData } = useResource(() => continuityService.bia(), []);
  const { data: outagesData } = useResource(() => availabilityService.outages(), []);
  const { data: allIncidentsData } = useResource(() => incidentsService.list(), []);
  const mockUsers = usersData ?? [];
  const mockServices = servicesData ?? [];
  const mockCIs = cisData ?? [];
  const mockProblems = problemsData ?? [];
  const mockKBArticles = kbData ?? [];

  const { data: timelineDataRaw } = useResource(
    () => (incident ? incidentsService.timeline(incident.id) : Promise.resolve([])),
    [incident?.id],
  );
  const { data: commentsData, refresh: refreshComments } = useResource(
    () => (incident ? incidentsService.comments(incident.id) : Promise.resolve([])),
    [incident?.id],
  );

  // Local mutable incident copy — all mutations go through setInc
  const [inc, setInc] = useState<Incident | null>(null);
  React.useEffect(() => {
    setInc(incident ?? null);
  }, [incident?.id]);

  // Derive status from inc for StatusDropdown compatibility
  const status = inc?.status ?? 'new';
  const setStatus = (s: IncidentStatus) => setInc(prev => prev ? { ...prev, status: s } : prev);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolvedData, setResolvedData] = useState<ResolveData | null>(null);
  React.useEffect(() => {
    if (incident?.resolution) {
      setResolvedData({
        summary: incident.resolution.summary,
        rootCause: incident.resolution.rootCause,
        workaround: incident.resolution.workaround,
        suggestKB: false,
        schedulePIR: false,
      });
    }
  }, [incident?.id]);
  const [activeTabId, setActiveTabId] = useState('overview');
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Modal open states
  const [promoteMajorOpen, setPromoteMajorOpen] = useState(false);
  const [linkCIOpen, setLinkCIOpen] = useState(false);
  const [linkProblemOpen, setLinkProblemOpen] = useState(false);
  const [linkChangeOpen, setLinkChangeOpen] = useState(false);
  const [addWatcherOpen, setAddWatcherOpen] = useState(false);

  // Comments and watchers as local state
  const [comments, setComments] = useState<IncidentComment[]>([]);
  React.useEffect(() => { if (commentsData) setComments(commentsData); }, [commentsData]);
  const [watchers, setWatchers] = useState<typeof mockUsers>([]);
  React.useEffect(() => {
    if (!incident || mockUsers.length === 0) return;
    const ids = new Set([incident.assigneeId, incident.incidentCommander, 'u-006'].filter(Boolean) as string[]);
    setWatchers([...ids].map(id => getUserById(mockUsers, id)).filter(Boolean) as typeof mockUsers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incident?.id, usersData]);

  // Ref for focusing the comment textarea
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const timeline = useMemo(
    () => timelineDataRaw ?? [],
    [timelineDataRaw]
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

  // Related incidents sharing same CIs
  const relatedIncidents = useMemo(() => {
    if (!inc) return [];
    const all = allIncidentsData ?? [];
    const related = inc.affectedCIIds.flatMap(ciId =>
      all.filter(i => i.affectedCIIds.includes(ciId) || i.affectedCIPublicIds.includes(ciId))
    );
    const seen = new Map<string, Incident>();
    for (const i of related) seen.set(i.id, i);
    return [...seen.values()].filter(i => i.id !== inc.id).slice(0, 5);
  }, [inc, allIncidentsData]);

  // Linked problem
  const linkedProblem = useMemo(() => {
    if (!inc?.linkedProblemId) return null;
    return mockProblems.find(p => p.id === inc.linkedProblemId) ?? null;
  }, [inc, problemsData]);

  const linkedKBArticles = useMemo(() => {
    if (!inc) return [];
    return mockKBArticles.filter(a =>
      a.linkedIncidentIds.includes(inc.publicId) && a.status === 'published'
    );
  }, [inc, kbData]);

  // Affected CIs
  const affectedCIs = useMemo(() => {
    if (!inc) return [];
    return inc.affectedCIIds.map(id => mockCIs.find(ci => ci.id === id)).filter(Boolean) as typeof mockCIs;
  }, [inc, cisData]);

  // BIA context — find entry matching any affected service
  const biaEntry = useMemo(() => {
    if (!inc) return null;
    const entries = biaData ?? [];
    for (const svcId of inc.affectedServiceIds) {
      const entry = entries.find(e => e.serviceId === svcId);
      if (entry) return entry;
    }
    return null;
  }, [inc, biaData]);

  // Assignee / reporter
  const assignee = getUserById(mockUsers, inc?.assigneeId);
  const reporter = getUserById(mockUsers, inc?.reporterId);
  const commander = getUserById(mockUsers, inc?.incidentCommander);

  const handleStatusChange = async (s: IncidentStatus) => {
    if (!inc) return;
    if (s === 'resolved' && !resolvedData) {
      setResolveOpen(true);
      return;
    }
    if (s === 'resolved') return; // handleResolve covers this path explicitly
    const prev = inc.status;
    setStatus(s); // optimistic
    try {
      await incidentsService.setStatus(inc.publicId, s);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update incident status:', err);
      setStatus(prev); // revert on failure
    } finally {
      refreshIncident();
    }
  };

  const handleResolve = async (data: ResolveData) => {
    if (!inc) return;
    // Optimistic UI — flip the local state so the resolve modal closes and the
    // banner switches immediately. If the server rejects (RBAC / validation),
    // the refresh below pulls authoritative state back.
    setResolvedData(data);
    setStatus('resolved');
    try {
      await incidentsService.resolve(inc.publicId, {
        summary: data.summary,
        rootCause: data.rootCause,
        workaround: data.workaround,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist incident resolution:', err);
    } finally {
      refreshIncident();
    }
  };

  const handlePromoteMajor = (commanderId: string) => {
    setInc(prev => prev ? {
      ...prev,
      isMajor: true,
      incidentCommander: commanderId,
      majorDeclaredAt: new Date().toISOString(),
      majorDeclaredBy: 'u-001',
    } : prev);
  };

  // ── Loading / Not found ──────────────────────────────────────────────────────
  if (incidentLoading) {
    return <div className="p-8 text-sm text-ois-text-subtle">Loading incident…</div>;
  }
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

  if (!inc) {
    return <div className="p-8 text-sm text-ois-text-subtle">Loading incident…</div>;
  }

  const priorityColor = PRIORITY_COLOR[inc!.priority] ?? '#475467';
  const isResolved = status === 'resolved' || status === 'closed';
  const serviceNames = getServiceNames(mockServices, inc!.affectedServiceIds);

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
        {editingDesc ? (
          <>
            <textarea
              rows={4}
              value={descDraft}
              onChange={e => setDescDraft(e.target.value)}
              className="w-full text-sm text-ois-text border border-ois-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
            />
            <div className="flex gap-2 mt-2">
              <Button variant="primary" size="sm" onClick={() => { setInc(prev => prev ? { ...prev, description: descDraft } : prev); setEditingDesc(false); }}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
            </div>
          </>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-ois-text leading-relaxed whitespace-pre-wrap text-sm">{inc!.description}</div>
            <button
              onClick={() => { setDescDraft(inc!.description); setEditingDesc(true); }}
              className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline"
            >
              <Edit3 size={12} /> Edit
            </button>
          </>
        )}
      </SectionCard>

      {/* Customer impact */}
      {inc!.customerImpact && (
        <SectionCard title="Customer impact">
          <p className="text-sm text-ois-text">{inc!.customerImpact}</p>
        </SectionCard>
      )}

      {/* Triggering event */}
      {inc!.triggeringEventPublicId && (
        <SectionCard title="Triggering event">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-ois-primary">
                {inc!.triggeringEventPublicId}
              </p>
              <p className="text-xs text-ois-text-muted mt-0.5">
                Source: monitoring · {formatRelative(inc!.createdAt)}
              </p>
            </div>
            <Link
              to={`/events/${inc!.triggeringEventId}`}
              className="flex items-center gap-1 text-xs text-ois-primary hover:underline"
            >
              Open event <ExternalLink size={12} />
            </Link>
          </div>
        </SectionCard>
      )}
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
          ref={commentTextareaRef}
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
            <Button
              variant="primary"
              size="sm"
              disabled={!newComment.trim()}
              onClick={async () => {
                if (!newComment.trim() || !inc) return;
                const text = newComment.trim();
                const internal = isInternal;
                // Clear the composer immediately for snappy UX. If the post
                // fails, the user sees nothing in the feed and can retry.
                setNewComment('');
                setIsInternal(false);
                try {
                  await incidentsService.addComment(inc.id, { body: text, isInternal: internal });
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Failed to post comment:', err);
                  setNewComment(text);
                  setIsInternal(internal);
                  return;
                }
                refreshComments();
              }}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const AffectedCIsTab = (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setLinkCIOpen(true)}>
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
      {inc!.triggeringEventPublicId && (
        <SectionCard title={`Triggering event (1)`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm font-semibold text-ois-primary">{inc!.triggeringEventPublicId}</p>
              <p className="text-xs text-ois-text-muted mt-0.5">Monitoring event · {formatRelative(inc!.createdAt)}</p>
            </div>
            <Link to={`/events/${inc!.triggeringEventId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
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
          <button onClick={() => setLinkProblemOpen(true)} className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
            <Plus size={12} /> Link problem
          </button>
        )}
      </SectionCard>

      {/* Linked changes */}
      <SectionCard title={`Linked changes (${inc!.linkedChangeIds?.length ?? 0})`}>
        {(inc!.linkedChangeIds?.length ?? 0) === 0 ? (
          <button onClick={() => setLinkChangeOpen(true)} className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
            <Plus size={12} /> Link change
          </button>
        ) : (
          <div className="space-y-2">
            {inc!.linkedChangeIds!.map(id => {
              const chg = (changesData ?? []).find(c => c.id === id || c.publicId === id);
              return (
                <div key={id} className="p-2 rounded-lg bg-ois-bg border border-ois-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-ois-primary">{id}</span>
                    <Link to={`/changes/${id}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                      <ExternalLink size={10} /> View
                    </Link>
                  </div>
                  {chg && (
                    <>
                      <p className="text-xs text-ois-text leading-snug mb-1 line-clamp-2">{chg.title}</p>
                      <div className="flex gap-1.5">
                        <ChangeStatusPill status={chg.status} size="sm" />
                        <RiskBadge risk={chg.risk} size="sm" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Linked KB articles */}
      <SectionCard title={`Linked KB articles (${linkedKBArticles.length})`}>
        <div className="space-y-1">
          {linkedKBArticles.map(art => (
            <div key={art.id} className="flex items-center justify-between py-1">
              <span className="font-mono text-xs font-semibold text-ois-primary">{art.publicId}</span>
              <Link to={`/kb/${art.slug}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                <ExternalLink size={11} /> {art.title.length > 30 ? art.title.slice(0, 30) + '…' : art.title}
              </Link>
            </div>
          ))}
          <Link
            to={`/kb/editor?source=incident&id=${inc?.publicId}&title=${encodeURIComponent(inc?.title ?? '')}`}
            className="flex items-center gap-2 text-xs text-ois-primary hover:underline mt-1"
          >
            <BookOpen size={12} /> Suggest article
          </Link>
        </div>
      </SectionCard>

      {/* Linked outages */}
      {(() => {
        const outages = inc!.affectedServiceIds.flatMap(id => (outagesData ?? []).filter(o => o.serviceId === id))
          .filter(o => {
            const oStart = new Date(o.startedAt).getTime();
            const iStart = new Date(inc!.createdAt).getTime();
            return Math.abs(oStart - iStart) < 3 * 60 * 60 * 1000; // within 3 hours
          });
        if (outages.length === 0) return null;
        return (
          <SectionCard title={`Linked outages (${outages.length})`}>
            {outages.map(outage => (
              <div key={outage.id} className="flex items-center justify-between py-1">
                <div>
                  <span className="font-mono text-xs font-semibold text-ois-primary">{outage.publicId}</span>
                  <span className="ml-2 text-xs text-ois-text-muted capitalize">{outage.type} · {outage.serviceName}</span>
                </div>
                <Link to="/availability/outages" className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                  View <ExternalLink size={12} />
                </Link>
              </div>
            ))}
          </SectionCard>
        );
      })()}
    </div>
  );

  const ResolutionTab = (
    <div className="space-y-4">
      {isResolved || resolvedData ? (
        <>
          <SectionCard title="Resolution summary">
            <p className="text-sm text-ois-text">{resolvedData?.summary ?? inc!.resolution?.summary}</p>
          </SectionCard>
          {(resolvedData?.rootCause ?? inc!.resolution?.rootCause) && (
            <SectionCard title="Root cause (lightweight)">
              <p className="text-sm text-ois-text">{resolvedData?.rootCause ?? inc!.resolution?.rootCause}</p>
              {inc!.linkedProblemPublicId && (
                <p className="text-xs text-ois-text-subtle mt-1">
                  Linked to{' '}
                  <Link to={`/problems/${inc!.linkedProblemPublicId}`} className="text-ois-primary hover:underline font-mono">
                    {inc!.linkedProblemPublicId}
                  </Link>{' '}
                  for full RCA.
                </p>
              )}
            </SectionCard>
          )}
          {(resolvedData?.workaround ?? inc!.resolution?.workaround) && (
            <SectionCard title="Workaround applied">
              <p className="text-sm text-ois-text">{resolvedData?.workaround ?? inc!.resolution?.workaround}</p>
            </SectionCard>
          )}
          <div className="text-xs text-ois-text-subtle">
            Resolved by{' '}
            <span className="font-medium text-ois-text">
              {getUserById(mockUsers, inc!.resolution?.resolvedBy)?.name ?? 'Unknown'}
            </span>
            {inc!.resolution?.resolvedAt && (
              <> · {formatRelative(inc!.resolution.resolvedAt)}</>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <CheckCircle2 size={36} className="mx-auto text-ois-text-subtle mb-3" />
          <p className="text-sm text-ois-text-muted">Not yet resolved.</p>
          <Can
            module="incident" action="close"
            resource={inc ? incidentResource(inc) : undefined}
            fallback={
              <p className="text-xs text-ois-text-subtle italic mt-4">
                You don't have permission to resolve this incident.
              </p>
            }
          >
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setResolveOpen(true)}
            >
              Mark as resolved
            </Button>
          </Can>
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const tabPanels: Record<string, React.ReactNode> = {
    overview: OverviewTab,
    timeline: TimelineTab,
    comments: CommentsTab,
    'affected-cis': AffectedCIsTab,
    linked: LinkedItemsTab,
    resolution: ResolutionTab,
  };

  return (
    // Counter the p-6 padding on AppShell <main> and fill the full viewport height below the TopBar (h-14 = 3.5rem)
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ─── Top header — no sticky needed; it stays put via flex shrink-0 ─────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
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
            <Can
              module="incident" action="update"
              resource={inc ? incidentResource(inc) : undefined}
              fallback={
                <span className="text-xs text-ois-text-subtle italic px-2">
                  Read-only — only IFM or the assigned APS team can change status.
                </span>
              }
            >
              <StatusDropdown status={status} onChange={handleStatusChange} />
            </Can>
            <div className="relative">
              <button
                onClick={() => setOverflowOpen(v => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOverflowOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[160px]">
                    {[
                      { label: 'Copy incident ID', action: () => navigator.clipboard.writeText(inc!.publicId) },
                      { label: 'Copy link', action: () => navigator.clipboard.writeText(window.location.href) },
                    ].map(item => (
                      <button key={item.label} onClick={() => { item.action(); setOverflowOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors text-ois-text">
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Incident header */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityColor }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-start gap-3 mb-2">
              <IncidentPriorityBadge priority={inc!.priority} />
              {inc!.isMajor && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <Siren size={11} /> MAJOR
                </span>
              )}
            </div>
            <p className="font-mono text-xs text-ois-text-subtle mb-1">{inc!.publicId}</p>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{inc!.title}</h1>
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {inc!.tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                  <Tag size={9} />{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-xs text-ois-text-subtle flex-wrap">
              <span>
                Created {formatRelative(inc!.createdAt)}
                {reporter && <> by {reporter.name} ({getReporterChannelLabel(inc!.reporterChannel)})</>}
              </span>
              {assignee && <span>· Assigned to <span className="font-medium text-ois-text">{assignee.name}</span></span>}
              <span>· Updated {formatRelative(inc!.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: three independent-scroll columns ───────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left sidebar ──────────────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          {/* Status + Priority — featured prominently, visually separate from housekeeping metadata */}
          <div className="rounded-lg border border-ois-border overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-ois-border bg-ois-surface-muted/40">
              <span className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">Status</span>
              <IncidentStatusPill status={status} />
            </div>
            <div className="px-3 py-2.5 flex items-center justify-between">
              <span className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest">Priority</span>
              <IncidentPriorityBadge priority={inc!.priority} />
            </div>
          </div>

          <SectionCard title="At a glance">
            <dl className="space-y-2 text-xs">
              {[
                { label: 'Severity',  value: <span className="font-semibold">{inc!.severity}</span> },
                { label: 'Created',   value: formatRelative(inc!.createdAt) },
                { label: 'Reporter',  value: reporter?.name ?? inc!.reporterId },
                { label: 'Channel',   value: getReporterChannelLabel(inc!.reporterChannel) },
                { label: 'Assignee',  value: assignee ? (
                  <span className="flex items-center gap-1.5"><Avatar name={assignee.name} size="xs" />{assignee.name}</span>
                ) : '—' },
                ...(inc!.incidentCommander ? [{ label: 'Commander', value: commander?.name ?? inc!.incidentCommander }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-ois-text-subtle shrink-0">{label}</dt>
                  <dd className="text-ois-text font-medium text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="SLA timers">
            <div className="space-y-4">
              <SLATimer label="Response" status={inc!.slaResponseStatus} targetMinutes={inc!.slaResponseTarget} createdAt={inc!.createdAt} resolvedAt={inc!.firstResponseAt} />
              <SLATimer label="Resolution" status={inc!.slaResolveStatus} targetMinutes={inc!.slaResolveTarget} createdAt={inc!.createdAt} resolvedAt={inc!.resolution?.resolvedAt} />
            </div>
          </SectionCard>

          {serviceNames.length > 0 && (
            <SectionCard title="Affected services">
              <ul className="space-y-1">
                {serviceNames.map(name => (
                  <li key={name} className="flex items-center gap-2 text-xs text-ois-text">
                    <span className="w-2 h-2 rounded-full bg-ois-danger shrink-0" />{name}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard title={`Watchers (${watchers.length})`}>
            <ul className="space-y-2">
              {watchers.map(w => (
                <li key={w.id} className="flex items-center gap-2">
                  <Avatar name={w.name} size="xs" />
                  <span className="text-xs text-ois-text">{w.name}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => setAddWatcherOpen(true)} className="mt-2 text-xs text-ois-primary hover:underline flex items-center gap-1">
              <Plus size={12} /> Add watcher
            </button>
          </SectionCard>
        </aside>

        {/* ── Center: pinned tab bar + scrollable content ────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab bar — always visible, never scrolls away */}
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTabId(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    'py-4 px-1 border-b-2 font-bold text-sm whitespace-nowrap transition-all',
                    activeTabId === tab.id
                      ? 'border-ois-primary text-ois-primary'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
                    tab.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {/* Tab content — only this region scrolls */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="animate-in fade-in slide-in-from-top-1 duration-200" key={activeTabId}>
              {tabPanels[activeTabId]}
            </div>
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────────────────────────── */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="Quick actions">
            <div className="space-y-1.5">
              {[
                { icon: UserPlus,      label: 'Assign to me',     action: () => setInc(prev => prev ? { ...prev, assigneeId: 'u-001' } : prev) },
                { icon: Eye,           label: 'Acknowledge',       action: () => setInc(prev => prev ? { ...prev, status: 'triaging' } : prev) },
                { icon: CheckCircle2,  label: 'Resolve',           action: () => setResolveOpen(true), primary: !isResolved },
                ...(inc!.isMajor ? [] : [{ icon: Siren, label: 'Promote to Major', action: () => setPromoteMajorOpen(true) }]),
                { icon: MessageCircle, label: 'Add comment',       action: () => { setActiveTabId('comments'); setTimeout(() => commentTextareaRef.current?.focus(), 100); } },
                { icon: Server,        label: 'Link CI',           action: () => setLinkCIOpen(true) },
                { icon: ShieldAlert,   label: 'Link problem',      action: () => setLinkProblemOpen(true) },
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

          {biaEntry && (
            <SectionCard title="BIA Context">
              <dl className="space-y-2 text-xs">
                {[
                  { label: 'Service',      value: biaEntry.serviceName },
                  { label: 'Impact Level', value: (
                    <span className="font-semibold capitalize" style={{ color: biaEntry.impactLevel === 'catastrophic' ? '#B42318' : biaEntry.impactLevel === 'critical' ? '#DC6803' : '#027A48' }}>
                      ● {biaEntry.impactLevel.charAt(0).toUpperCase() + biaEntry.impactLevel.slice(1)}
                    </span>
                  )},
                  { label: 'Impact Score', value: `${biaEntry.impactScore}/100` },
                  { label: 'RTO Target',   value: `${biaEntry.rto} min` },
                  { label: 'RPO Target',   value: `${biaEntry.rpoMinutes} min` },
                  { label: 'Hourly Cost',  value: <span className="text-ois-danger font-semibold">${biaEntry.estimatedHourlyCostUSD.toLocaleString()}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <dt className="text-ois-text-subtle shrink-0">{label}</dt>
                    <dd className="text-ois-text font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/continuity/bia" className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline">
                View BIA entry <ExternalLink size={11} />
              </Link>
            </SectionCard>
          )}

          {relatedIncidents.length > 0 && (
            <SectionCard title={`Related incidents (${relatedIncidents.length})`}>
              <p className="text-[11px] text-ois-text-subtle mb-2">Same CI in last 7 days:</p>
              <ul className="space-y-2">
                {relatedIncidents.map(related => (
                  <li key={related.id}>
                    <button
                      onClick={() => navigate(`/incidents/${related.publicId}`)}
                      className="w-full text-left hover:bg-ois-surface-muted rounded px-1 py-0.5 transition-colors"
                    >
                      <p className="text-xs font-mono text-ois-primary">{related.publicId}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <IncidentPriorityBadge priority={related.priority} />
                        <IncidentStatusPill status={related.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/incidents', { state: { search: inc!.affectedCIPublicIds[0] } })} className="mt-2 text-xs text-ois-primary hover:underline">View all →</button>
            </SectionCard>
          )}
        </aside>
      </div>

      <ResolveIncidentModal
        incident={inc!}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />
      <PromoteMajorModal incident={inc!} isOpen={promoteMajorOpen} onClose={() => setPromoteMajorOpen(false)} onConfirm={handlePromoteMajor} />
      <LinkCIModal isOpen={linkCIOpen} onClose={() => setLinkCIOpen(false)} currentCIIds={inc!.affectedCIIds} onLink={newIds => setInc(prev => prev ? { ...prev, affectedCIIds: [...prev.affectedCIIds, ...newIds], affectedCIPublicIds: [...prev.affectedCIPublicIds] } : prev)} />
      <LinkProblemModal isOpen={linkProblemOpen} onClose={() => setLinkProblemOpen(false)} currentProblemId={inc?.linkedProblemId} onLink={(id, pubId) => setInc(prev => prev ? { ...prev, linkedProblemId: id, linkedProblemPublicId: pubId } : prev)} />
      <LinkChangeModal isOpen={linkChangeOpen} onClose={() => setLinkChangeOpen(false)} currentChangeIds={inc?.linkedChangeIds ?? []} onLink={newIds => setInc(prev => prev ? { ...prev, linkedChangeIds: [...(prev.linkedChangeIds ?? []), ...newIds] } : prev)} />
      <UserPickerModal isOpen={addWatcherOpen} onClose={() => setAddWatcherOpen(false)} title="Add Watcher" excludeIds={watchers.map(w => w.id)} onSelect={userId => { const user = mockUsers.find(u => u.id === userId); if (user) setWatchers(prev => [...prev, user]); }} />
    </div>
  );
};
