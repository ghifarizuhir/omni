import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, MoreHorizontal, ChevronDown, AlertCircle,
  Plus, BookOpen, Siren, Tag, CheckCircle2, ExternalLink, Edit3,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { linkifyEntities } from '@/src/lib/entity-linkify';
import { formatRelative } from '@/src/lib/format';
import {
  incidentsService, usersService, servicesService, cisService,
  problemsService, changesService, knowledgeService, continuityService,
  availabilityService, useResource,
} from '@/src/services';
import { Incident, IncidentStatus, IncidentEventKind, IncidentComment } from '@/src/types/incident';
import type { ServiceHealthStatus } from '@/src/types/common';
import { incidentStatusMeta } from '@/src/lib/constants';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { IDCell } from '@/src/components/ui/IDCell';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { IncidentPriorityBadge } from '@/src/components/incidents/IncidentPriorityBadge';
import { ChangeStatusPill } from '@/src/components/changes/ChangeStatusPill';
import { RiskBadge } from '@/src/components/changes/RiskBadge';
import { IncidentTimelineEntry } from '@/src/components/incidents/IncidentTimelineEntry';
import { IncidentCommentThread } from '@/src/components/incidents/IncidentCommentThread';
import { ResolveIncidentModal, ResolveData } from '@/src/components/incidents/ResolveIncidentModal';
import { PromoteMajorModal } from '@/src/components/incidents/PromoteMajorModal';
import { LinkCIModal } from '@/src/components/incidents/LinkCIModal';
import { LinkProblemModal } from '@/src/components/incidents/LinkProblemModal';
import { LinkChangeModal } from '@/src/components/incidents/LinkChangeModal';
import { UserPickerModal } from '@/src/components/incidents/UserPickerModal';
import { IncidentClock } from '@/src/components/incidents/IncidentClock';
import { BlastRadiusBackdrop } from '@/src/components/incidents/BlastRadiusBackdrop';
import { IncidentComposer } from '@/src/components/incidents/IncidentComposer';
import { AboutRail } from '@/src/components/incidents/AboutRail';
import { Can, incidentResource, useCurrentUser } from '@/src/lib/rbac';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserById(users: { id: string; name: string }[], id?: string) {
  return users.find(u => u.id === id);
}

function healthToVariant(h?: ServiceHealthStatus): 'success' | 'warning' | 'danger' | 'muted' {
  if (!h) return 'muted';
  if (h === 'operational') return 'success';
  if (h === 'degraded' || h === 'maintenance') return 'warning';
  if (h === 'partial_outage' || h === 'major_outage') return 'danger';
  return 'muted';
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

const SYSTEM_KINDS: IncidentEventKind[] = [
  'created', 'assigned', 'priority_changed', 'promoted_major', 'major_stood_down',
  'sla_warning', 'sla_breached', 'escalated', 'major_declared', 'resolution_added',
  'reopened', 'closed', 'resolved', 'watcher_added', 'watcher_removed',
];
const CI_LINKAGE_KINDS: IncidentEventKind[] = [
  'ci_linked', 'ci_unlinked', 'event_linked', 'problem_linked', 'linked',
];

interface TimelineEvent {
  id: string;
  kind: IncidentEventKind;
}

const TimelineList: React.FC<{ events: TimelineEvent[] }> = ({ events }) => (
  <div className="pl-1">
    {events.length === 0 ? (
      <p className="text-sm text-ois-text-subtle text-center py-8">No events match this filter.</p>
    ) : (
      events.map((event, i) => (
        <IncidentTimelineEntry
          key={event.id}
          event={event as any}
          isLast={i === events.length - 1}
        />
      ))
    )}
  </div>
);

const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode }> = ({
  title, defaultOpen, children,
}) => (
  <details open={defaultOpen} className="group border border-ois-border rounded-lg bg-white/80 backdrop-blur-sm overflow-hidden">
    <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between bg-ois-surface-muted hover:bg-ois-surface transition-colors">
      <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</span>
      <ChevronDown size={14} className="text-ois-text-subtle group-open:rotate-180 transition-transform" />
    </summary>
    <div className="p-4">{children}</div>
  </details>
);

// ── Main component ─────────────────────────────────────────────────────────────

export const IncidentDetail: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  const { user } = useCurrentUser();

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

  const { data: timelineDataRaw, refresh: refreshTimeline } = useResource(
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
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Modal open states
  const [promoteMajorOpen, setPromoteMajorOpen] = useState(false);
  const [linkCIOpen, setLinkCIOpen] = useState(false);
  const [linkProblemOpen, setLinkProblemOpen] = useState(false);
  const [linkChangeOpen, setLinkChangeOpen] = useState(false);
  const [addWatcherOpen, setAddWatcherOpen] = useState(false);

  const [comments, setComments] = useState<IncidentComment[]>([]);
  React.useEffect(() => { if (commentsData) setComments(commentsData); }, [commentsData]);

  const watchers = useMemo<Array<{ id: string; name: string }>>(() => {
    const list = inc?.watchers ?? [];
    return list.map(w => {
      const u = getUserById(mockUsers, w.userId);
      return u ? { id: u.id, name: u.name } : { id: w.userId, name: w.userName ?? w.userId };
    });
  }, [inc?.watchers, mockUsers]);

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

  const affectedCIs = useMemo(() => {
    if (!inc) return [];
    return inc.affectedCIIds.map(id => mockCIs.find(ci => ci.id === id)).filter(Boolean) as typeof mockCIs;
  }, [inc, cisData]);

  const biaEntry = useMemo(() => {
    if (!inc) return null;
    const entries = biaData ?? [];
    for (const svcId of inc.affectedServiceIds) {
      const entry = entries.find(e => e.serviceId === svcId);
      if (entry) return entry;
    }
    return null;
  }, [inc, biaData]);

  const assignee = getUserById(mockUsers, inc?.assigneeId);
  const commander = getUserById(mockUsers, inc?.incidentCommander);

  const handleStatusChange = async (s: IncidentStatus) => {
    if (!inc) return;
    if (s === 'resolved') {
      setResolveOpen(true);
      return;
    }
    const prev = inc.status;
    setStatus(s);
    try {
      await incidentsService.setStatus(inc.publicId, s);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update incident status:', err);
      setStatus(prev);
    } finally {
      refreshIncident();
    }
  };

  const handleResolve = async (data: ResolveData) => {
    if (!inc) return;
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

  const handleSaveDescription = async () => {
    if (!inc) return;
    const prev = inc;
    setInc(curr => curr ? { ...curr, description: descDraft } : curr);
    setEditingDesc(false);
    try {
      await incidentsService.update(inc.publicId, { description: descDraft });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to persist description:', err);
      setInc(prev); // restore the pre-edit snapshot on failure
      setEditingDesc(true);
    } finally {
      refreshIncident();
    }
  };

  const handlePromoteMajor = async (commanderId: string) => {
    if (!inc) return;
    const prev = inc;
    const cmd = mockUsers.find(u => u.id === commanderId);
    setInc(curr => curr ? {
      ...curr,
      isMajor: true,
      incidentCommander: commanderId,
      majorDeclaredAt: new Date().toISOString(),
      majorDeclaredBy: user?.id ?? 'system',
    } : curr);
    try {
      await incidentsService.promoteMajor(prev.publicId, {
        incidentCommander: cmd ? { id: cmd.id, name: cmd.name } : undefined,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to promote incident to major:', err);
      setInc(prev);
    } finally {
      refreshIncident();
    }
  };

  const handleSetLinks = async (patch: {
    affectedCIIds?: string[];
    linkedProblemId?: string | null;
    linkedChangeIds?: string[];
  }) => {
    if (!inc) return;
    const prev = inc;
    setInc(curr => curr ? {
      ...curr,
      ...(patch.affectedCIIds !== undefined ? { affectedCIIds: patch.affectedCIIds } : {}),
      ...(patch.linkedProblemId !== undefined ? { linkedProblemId: patch.linkedProblemId ?? undefined } : {}),
      ...(patch.linkedChangeIds !== undefined ? { linkedChangeIds: patch.linkedChangeIds } : {}),
    } : curr);
    try {
      await incidentsService.setLinks(prev.publicId, patch);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update incident links:', err);
      setInc(prev);
    } finally {
      refreshIncident();
    }
  };

  const handleAddWatcher = async (userId: string) => {
    if (!inc) return;
    const user = mockUsers.find(u => u.id === userId);
    if (!user) return;
    const snapshot = inc;
    setInc(prev => {
      if (!prev) return prev;
      const existing = prev.watchers ?? [];
      if (existing.some(w => w.userId === userId)) return prev;
      return { ...prev, watchers: [...existing, { userId, userName: user.name }] };
    });
    try {
      await incidentsService.addWatcher(inc.id, { userId, userName: user.name });
      await refreshIncident();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add watcher:', err);
      setInc(snapshot);
    }
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

  const isResolved = status === 'resolved' || status === 'closed';

  // ── AboutRail prop mapping ──────────────────────────────────────────────────
  const leadUser = commander ?? assignee;
  const lead = leadUser ? { name: leadUser.name, id: leadUser.id } : null;

  const primaryServiceId = inc.affectedServiceIds[0];
  const primaryService = primaryServiceId ? mockServices.find(s => s.id === primaryServiceId) : undefined;
  const railService = primaryService
    ? {
        name: primaryService.name,
        publicId: primaryService.id, // Service has no publicId; route uses id
        healthVariant: healthToVariant(primaryService.currentHealth),
      }
    : null;

  const railImpactedCis = affectedCIs.map(ci => ({
    publicId: ci.publicId,
    healthVariant: healthToVariant(ci.health),
  }));

  // ── IncidentClock SLA mapping ───────────────────────────────────────────────
  const slaDeadline = inc.slaResolveTarget && inc.createdAt
    ? new Date(new Date(inc.createdAt).getTime() + inc.slaResolveTarget * 60_000).toISOString()
    : null;
  const resolvedAt = inc.resolution?.resolvedAt ?? null;

  // First impacted CI for blast radius backdrop
  const primaryCiId = inc.affectedCIIds[0] ?? inc.affectedCIPublicIds[0];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="-m-6 flex bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ─── Center column (timeline + composer with blast-radius backdrop) ──── */}
      <section className="flex-1 relative min-w-0">
        {primaryCiId && <BlastRadiusBackdrop impactedCiId={primaryCiId} />}

        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <header className="shrink-0 bg-white/80 backdrop-blur-sm border-b border-ois-border">
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

            <div className="flex items-start justify-between gap-6 px-6 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <IncidentPriorityBadge priority={inc.priority} />
                  <IncidentStatusPill status={status} />
                  {inc.isMajor && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      <Siren size={11} /> MAJOR
                    </span>
                  )}
                  <IDCell value={inc.publicId} className="text-xs text-ois-text-subtle" />
                </div>
                <h1 className="text-xl font-bold text-ois-text leading-tight">{inc.title}</h1>
                {inc.tags.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1.5 mt-2">
                    {inc.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                        <Tag size={9} />{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <IncidentClock
                startedAt={inc.createdAt}
                resolvedAt={resolvedAt}
                slaDeadline={slaDeadline}
              />
            </div>
          </header>

          {/* Scrollable: timeline first, then collapsible sections for other content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                  Timeline ({timeline.length})
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TIMELINE_FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setTimelineFilter(f.value)}
                      className={cn(
                        'px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
                        timelineFilter === f.value
                          ? 'bg-ois-primary text-white border-ois-primary'
                          : 'border-ois-border text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong bg-white'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <TimelineList events={filteredTimeline as TimelineEvent[]} />
            </div>

            <CollapsibleSection title="Description">
              {editingDesc ? (
                <>
                  <textarea
                    rows={4}
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    className="w-full text-sm text-ois-text border border-ois-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button variant="primary" size="sm" onClick={() => void handleSaveDescription()}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="prose prose-sm max-w-none text-ois-text leading-relaxed whitespace-pre-wrap text-sm">{linkifyEntities(inc.description)}</div>
                  <button
                    onClick={() => { setDescDraft(inc.description); setEditingDesc(true); }}
                    className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                </>
              )}
              {inc.customerImpact && (
                <div className="mt-3 pt-3 border-t border-ois-border">
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-1">Customer impact</p>
                  <p className="text-sm text-ois-text">{linkifyEntities(inc.customerImpact)}</p>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title={`Comments (${comments.filter(c => !c.parentCommentId).length})`}>
              <IncidentCommentThread comments={comments} />
            </CollapsibleSection>

            <CollapsibleSection title={`Affected CIs (${affectedCIs.length})`}>
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setLinkCIOpen(true)}>
                    <Plus size={14} className="mr-1" /> Link CI
                  </Button>
                </div>
                {affectedCIs.length === 0 && (
                  <p className="text-sm text-ois-text-subtle text-center py-6">No CIs linked.</p>
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
            </CollapsibleSection>

            <CollapsibleSection title="Linked items">
              <div className="space-y-4">
                {inc.triggeringEventPublicId && (
                  <SectionCard title="Triggering event">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-semibold text-ois-primary">{inc.triggeringEventPublicId}</p>
                        <p className="text-xs text-ois-text-muted mt-0.5">Monitoring event · {formatRelative(inc.createdAt)}</p>
                      </div>
                      <Link to={`/events/${inc.triggeringEventId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                        Open <ExternalLink size={12} />
                      </Link>
                    </div>
                  </SectionCard>
                )}

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

                <SectionCard title={`Linked changes (${inc.linkedChangeIds?.length ?? 0})`}>
                  {(inc.linkedChangeIds?.length ?? 0) === 0 ? (
                    <button onClick={() => setLinkChangeOpen(true)} className="flex items-center gap-2 text-xs text-ois-primary hover:underline">
                      <Plus size={12} /> Link change
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {inc.linkedChangeIds!.map(id => {
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

                {(() => {
                  const outages = inc.affectedServiceIds.flatMap(id => (outagesData ?? []).filter(o => o.serviceId === id))
                    .filter(o => {
                      const oStart = new Date(o.startedAt).getTime();
                      const iStart = new Date(inc.createdAt).getTime();
                      return Math.abs(oStart - iStart) < 3 * 60 * 60 * 1000;
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
            </CollapsibleSection>

            {(isResolved || resolvedData) && (
              <CollapsibleSection title="Resolution" defaultOpen>
                <div className="space-y-3">
                  <SectionCard title="Resolution summary">
                    <p className="text-sm text-ois-text">{resolvedData?.summary ?? inc.resolution?.summary}</p>
                  </SectionCard>
                  {(resolvedData?.rootCause ?? inc.resolution?.rootCause) && (
                    <SectionCard title="Root cause (lightweight)">
                      <p className="text-sm text-ois-text">{resolvedData?.rootCause ?? inc.resolution?.rootCause}</p>
                      {inc.linkedProblemPublicId && (
                        <p className="text-xs text-ois-text-subtle mt-1">
                          Linked to{' '}
                          <Link to={`/problems/${inc.linkedProblemPublicId}`} className="text-ois-primary hover:underline font-mono">
                            {inc.linkedProblemPublicId}
                          </Link>{' '}
                          for full RCA.
                        </p>
                      )}
                    </SectionCard>
                  )}
                  {(resolvedData?.workaround ?? inc.resolution?.workaround) && (
                    <SectionCard title="Workaround applied">
                      <p className="text-sm text-ois-text">{resolvedData?.workaround ?? inc.resolution?.workaround}</p>
                    </SectionCard>
                  )}
                  <div className="text-xs text-ois-text-subtle">
                    Resolved by{' '}
                    <span className="font-medium text-ois-text">
                      {getUserById(mockUsers, inc.resolution?.resolvedBy)?.name ?? 'Unknown'}
                    </span>
                    {inc.resolution?.resolvedAt && (
                      <> · {formatRelative(inc.resolution.resolvedAt)}</>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {!isResolved && !resolvedData && (
              <Can
                module="incident" action="close"
                resource={inc ? incidentResource(inc) : undefined}
              >
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={() => setResolveOpen(true)}>
                    <CheckCircle2 size={14} className="mr-1.5" /> Mark as resolved
                  </Button>
                </div>
              </Can>
            )}

            {biaEntry && (
              <CollapsibleSection title="BIA context">
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
              </CollapsibleSection>
            )}

            {relatedIncidents.length > 0 && (
              <CollapsibleSection title={`Related incidents (${relatedIncidents.length})`}>
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
              </CollapsibleSection>
            )}

            {watchers.length > 0 && (
              <CollapsibleSection title={`Watchers (${watchers.length})`}>
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
              </CollapsibleSection>
            )}

            {/* Hidden ref target so the composer can be focused programmatically if needed */}
            <textarea ref={commentTextareaRef} className="hidden" readOnly />
          </div>

          {/* Persistent composer */}
          <div className="shrink-0 px-6 py-3 border-t border-ois-border bg-white/80 backdrop-blur-sm">
            <IncidentComposer
              incidentId={inc.id}
              onPosted={() => { refreshComments(); refreshTimeline(); }}
            />
          </div>
        </div>
      </section>

      {/* ─── Right entity rail ─────────────────────────────────────────────── */}
      <div className="border-l border-ois-border bg-white shrink-0">
        <AboutRail
          lead={lead}
          service={railService}
          impactedCis={railImpactedCis}
          changeWindow={null}
        />
      </div>

      <ResolveIncidentModal
        incident={inc}
        isOpen={resolveOpen}
        onClose={() => setResolveOpen(false)}
        onResolve={handleResolve}
      />
      <PromoteMajorModal incident={inc} isOpen={promoteMajorOpen} onClose={() => setPromoteMajorOpen(false)} onConfirm={handlePromoteMajor} />
      <LinkCIModal isOpen={linkCIOpen} onClose={() => setLinkCIOpen(false)} currentCIIds={inc.affectedCIIds} onLink={newIds => handleSetLinks({ affectedCIIds: [...inc.affectedCIIds, ...newIds] })} />
      <LinkProblemModal isOpen={linkProblemOpen} onClose={() => setLinkProblemOpen(false)} currentProblemId={inc?.linkedProblemId} onLink={(id) => handleSetLinks({ linkedProblemId: id })} />
      <LinkChangeModal isOpen={linkChangeOpen} onClose={() => setLinkChangeOpen(false)} currentChangeIds={inc?.linkedChangeIds ?? []} onLink={newIds => handleSetLinks({ linkedChangeIds: [...(inc.linkedChangeIds ?? []), ...newIds] })} />
      <UserPickerModal isOpen={addWatcherOpen} onClose={() => setAddWatcherOpen(false)} title="Add Watcher" excludeIds={watchers.map(w => w.id)} onSelect={userId => handleAddWatcher(userId)} />
      {/* keep promoteMajor reachable for major-incident flows */}
      {!inc.isMajor && (
        <button
          onClick={() => setPromoteMajorOpen(true)}
          className="hidden"
          aria-hidden
        />
      )}
    </div>
  );
};
