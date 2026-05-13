import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MoreVertical, ChevronDown,
  Activity, BookOpen, Wrench, Link2, Clock, Edit3,
  Plus, CheckCircle2, XCircle, AlertTriangle, ExternalLink,
  FileText, ShieldAlert, Users, RefreshCw,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatDate, formatRelative } from '@/src/lib/format';
import {
  problemsService, incidentsService, changesService,
  servicesService, usersService, improvementsService,
  knowledgeService, useResource,
} from '@/src/services';
import { Problem, ProblemStatus } from '@/src/types/problem';
import { problemStatusMeta } from '@/src/lib/constants';
import { Can, problemResource } from '@/src/lib/rbac';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { Modal } from '@/src/components/ui/Modal';
import { ProblemStatusPill } from '@/src/components/problems/ProblemStatusPill';
import { ProblemSourceChip } from '@/src/components/problems/ProblemSourceChip';
import { KnownErrorCard } from '@/src/components/problems/KnownErrorCard';
import { PromoteToKnownErrorModal } from '@/src/components/problems/PromoteToKnownErrorModal';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { ChangeStatusPill } from '@/src/components/changes/ChangeStatusPill';
import { RiskBadge } from '@/src/components/changes/RiskBadge';
import { ImprovementStatusPill } from '@/src/components/improvement/ImprovementStatusPill';
import { LinkIncidentsModal } from '@/src/components/problems/LinkIncidentsModal';
import { LinkChangeModal } from '@/src/components/incidents/LinkChangeModal';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STRIPE: Record<string, string> = {
  P1: '#B42318', P2: '#DC6803', P3: '#F79009', P4: '#027A48',
};

function useUsers() {
  const { data } = useResource(() => usersService.list(), []);
  return data ?? [];
}

function findUserById(users: ReturnType<typeof useUsers>, id?: string) {
  return id ? users.find(u => u.id === id) : undefined;
}

// ── Sidebar card ─────────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4 space-y-2">{children}</div>
  </div>
);

const MetaRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-2 text-xs">
    <span className="text-ois-text-subtle shrink-0">{label}</span>
    <div className="text-right">{children}</div>
  </div>
);

// ── RCA Summary view (inline in RCA tab) ─────────────────────────────────────

const RCASummaryTab: React.FC<{ problem: Problem }> = ({ problem }) => {
  const users = useUsers();
  const rca = problem.rca;
  if (!rca) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Activity size={36} className="text-ois-text-subtle" />
        <p className="text-sm font-medium text-ois-text">No RCA conducted yet</p>
        <p className="text-xs text-ois-text-muted max-w-xs">
          Start a Root Cause Analysis to identify what's causing this recurring issue.
        </p>
        <Link to={`/problems/${problem.publicId}/rca`}>
          <Button variant="primary" size="sm" className="mt-2">Open RCA workspace</Button>
        </Link>
      </div>
    );
  }

  const ACTION_STATUS_COLOR: Record<string, string> = {
    done: '#067647', in_progress: '#0BA5EC', open: '#475467',
  };
  const ACTION_TYPE_COLOR: Record<string, string> = {
    corrective: '#B42318', preventive: '#1F4FD4', detective: '#6941C6',
  };

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="border border-ois-border rounded-lg p-4 bg-ois-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs text-ois-text-subtle mb-1 font-semibold uppercase tracking-widest">
              Technique: {rca.technique.replace('_', ' ')}
            </p>
            <p className="text-sm text-ois-text leading-relaxed">{rca.summary}</p>
          </div>
          <Link to={`/problems/${problem.publicId}/rca`}>
            <Button variant="outline" size="sm" className="shrink-0">
              <Edit3 size={13} className="mr-1.5" />
              Open full RCA
            </Button>
          </Link>
        </div>
        <p className="text-xs text-ois-text-subtle mt-3">
          By {rca.authorName} · Last updated {formatRelative(rca.updatedAt)}
        </p>
      </div>

      {/* Root causes */}
      {rca.rootCauses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Root causes</h4>
          <ol className="space-y-2">
            {rca.rootCauses.map((rc, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-ois-danger/10 text-ois-danger text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-ois-text">{rc}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Contributing factors */}
      {rca.contributingFactors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Contributing factors</h4>
          <ul className="space-y-1.5">
            {rca.contributingFactors.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-ois-text-muted">
                <span className="text-ois-border mt-1.5 shrink-0">·</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended actions */}
      {rca.recommendedActions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
            Recommended actions ({rca.recommendedActions.length})
          </h4>
          <div className="border border-ois-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ois-surface-muted/50 border-b border-ois-border">
                  <th className="px-3 py-2 text-left text-ois-text-subtle font-semibold uppercase tracking-widest">Type</th>
                  <th className="px-3 py-2 text-left text-ois-text-subtle font-semibold uppercase tracking-widest">Description</th>
                  <th className="px-3 py-2 text-left text-ois-text-subtle font-semibold uppercase tracking-widest">Owner</th>
                  <th className="px-3 py-2 text-left text-ois-text-subtle font-semibold uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ois-border">
                {rca.recommendedActions.map((action, i) => {
                  const owner = findUserById(users, action.owner);
                  return (
                    <tr key={i} className="hover:bg-ois-surface-muted/30 transition-colors">
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold capitalize"
                          style={{ color: ACTION_TYPE_COLOR[action.type], backgroundColor: `${ACTION_TYPE_COLOR[action.type]}15` }}
                        >
                          {action.type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ois-text max-w-[280px]">
                        <p className="truncate">{action.description}</p>
                        {action.linkedChangeId && (
                          <p className="text-ois-primary font-mono text-[10px] mt-0.5">{action.linkedChangeId}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {owner ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar name={owner.name} size="xs" />
                            <span className="text-ois-text-muted truncate max-w-[80px]">{owner.name.split(' ')[0]}</span>
                          </div>
                        ) : <span className="text-ois-text-subtle">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="font-semibold capitalize"
                          style={{ color: ACTION_STATUS_COLOR[action.status] ?? '#475467' }}
                        >
                          {action.status === 'done' ? '✓ done' : action.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Related incidents tab ─────────────────────────────────────────────────────

const RelatedIncidentsTab: React.FC<{ problem: Problem; onLinkIncidents: () => void }> = ({ problem, onLinkIncidents }) => {
  const { data: allIncidents } = useResource(() => incidentsService.list(), []);
  const incidents = (allIncidents ?? []).filter(i =>
    problem.relatedIncidentIds.includes(i.publicId)
  );

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <AlertTriangle size={32} className="text-ois-text-subtle" />
        <p className="text-sm font-medium text-ois-text">No related incidents linked yet</p>
        <Button variant="secondary" size="sm" onClick={onLinkIncidents}>
          <Plus size={13} className="mr-1.5" />
          Link incidents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-ois-text-muted">{incidents.length} incident{incidents.length !== 1 ? 's' : ''} attributed to this problem</p>
        <Button variant="secondary" size="sm" onClick={onLinkIncidents}>
          <Plus size={13} className="mr-1.5" />
          Link more incidents
        </Button>
      </div>
      <div className="border border-ois-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ois-surface-muted/50 border-b border-ois-border text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
              <th className="px-4 py-2.5 text-left">ID</th>
              <th className="px-4 py-2.5 text-left">Title</th>
              <th className="px-4 py-2.5 text-left">Priority</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ois-border">
            {incidents.map(inc => (
              <tr key={inc.id} className="hover:bg-ois-surface-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/incidents/${inc.publicId}`}
                    className="font-mono text-xs font-semibold text-ois-primary hover:underline"
                  >
                    {inc.publicId}
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-[260px]">
                  <p className="text-ois-text truncate">{inc.title}</p>
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={inc.priority} />
                </td>
                <td className="px-4 py-3">
                  <IncidentStatusPill status={inc.status} />
                </td>
                <td className="px-4 py-3 text-xs text-ois-text-muted">
                  {formatRelative(inc.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Pattern Summary ───────────────────────────────────────────────────────────

const PatternSummaryCard: React.FC<{ problem: Problem }> = ({ problem }) => {
  const { data: allIncidents } = useResource(() => incidentsService.list(), []);
  const incidents = (allIncidents ?? []).filter(i => problem.relatedIncidentIds.includes(i.publicId));
  if (!problem.firstIncidentDate && !problem.lastIncidentDate) return null;
  const resolved = incidents.filter(i => i.resolution?.resolvedAt);
  const avgMttr = resolved.length > 0
    ? resolved.reduce((sum, inc) => sum + (new Date(inc.resolution!.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000, 0) / resolved.length
    : null;

  const formatMin = (min: number) => min < 60 ? `${Math.round(min)}m` : `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;

  return (
    <div className="border border-ois-border rounded-lg p-4 bg-ois-surface">
      <h4 className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">Pattern summary</h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {problem.firstIncidentDate && (
          <div>
            <p className="text-xs text-ois-text-subtle">First incident</p>
            <p className="font-medium text-ois-text">{formatDate(problem.firstIncidentDate, 'MMM d, yyyy')}</p>
          </div>
        )}
        {problem.lastIncidentDate && (
          <div>
            <p className="text-xs text-ois-text-subtle">Latest incident</p>
            <p className="font-medium text-ois-text">{formatRelative(problem.lastIncidentDate)}</p>
          </div>
        )}
        {avgMttr !== null && (
          <div>
            <p className="text-xs text-ois-text-subtle">Avg MTTR for pattern</p>
            <p className="font-medium text-ois-text">{formatMin(avgMttr)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-ois-text-subtle">Total recurrences</p>
          <p className="font-medium text-ois-text">{problem.relatedIncidentCount}</p>
        </div>
      </div>
    </div>
  );
};

// ── Close Problem Modal ────────────────────────────────────────────────────────

const CloseProblemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Close problem" size="sm">
    <div className="py-2 space-y-4">
      <p className="text-sm text-ois-text-muted">
        Are you sure you want to close this problem? Closed problems are removed from active investigation queues.
      </p>
      <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => { onConfirm(); onClose(); }}>Close problem</Button>
      </div>
    </div>
  </Modal>
);

// ── History tab ───────────────────────────────────────────────────────────────

const HistoryTab: React.FC<{ problem: Problem }> = ({ problem }) => {
  const events = [
    { ts: problem.createdAt, label: 'Problem created', icon: Plus, color: '#475467' },
    ...(problem.rca ? [{ ts: problem.rca.createdAt, label: `RCA started (${problem.rca.technique.replace('_', ' ')})`, icon: Activity, color: '#0BA5EC' }] : []),
    ...(problem.knownError ? [{ ts: problem.knownError.publishedAt, label: 'Published as Known Error', icon: ShieldAlert, color: '#DC6803' }] : []),
    { ts: problem.updatedAt, label: 'Last updated', icon: RefreshCw, color: '#6941C6' },
    ...(problem.closedAt ? [{ ts: problem.closedAt, label: 'Problem closed', icon: CheckCircle2, color: '#067647' }] : []),
  ].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  return (
    <div className="space-y-0">
      {events.map((ev, idx) => {
        const Icon = ev.icon;
        const isLast = idx === events.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-7 h-7 rounded-full border-2 bg-white flex items-center justify-center shrink-0"
                style={{ borderColor: ev.color }}>
                <Icon size={13} style={{ color: ev.color }} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-ois-border mt-1" />}
            </div>
            <div className={cn('pb-5 flex-1 min-w-0', isLast && 'pb-0')}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ois-text">{ev.label}</span>
                <span className="text-xs text-ois-text-subtle shrink-0">{formatRelative(ev.ts)}</span>
              </div>
              <p className="text-xs text-ois-text-muted mt-0.5">{formatDate(ev.ts)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Status dropdown (nav row) ─────────────────────────────────────────────────

const StatusDropdown: React.FC<{
  status: ProblemStatus;
  onChange: (s: ProblemStatus) => void;
}> = ({ status, onChange }) => {
  const [open, setOpen] = useState(false);
  const meta = problemStatusMeta[status];
  const statuses: ProblemStatus[] = ['identified', 'investigating', 'known_error', 'fix_in_progress', 'closed'];

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
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-ois-border rounded-lg shadow-lg z-50 overflow-hidden">
            {statuses.map(s => {
              const m = problemStatusMeta[s];
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
        </>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const ProblemDetail: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();

  const { data: loadedProblem, loading: problemLoading } = useResource(
    () => problemId ? problemsService.get(problemId).catch(() => null as any) : Promise.resolve(null as any),
    [problemId],
  );
  const [problem, setProblem] = useState<Problem | undefined>(undefined);
  React.useEffect(() => {
    if (loadedProblem) setProblem(loadedProblem);
  }, [loadedProblem]);
  const users = useUsers();
  const { data: services } = useResource(() => servicesService.list(), []);
  const mockServices = services ?? [];
  const { data: changes } = useResource(() => changesService.list(), []);
  const getChangeById = (id: string) => (changes ?? []).find(c => c.id === id || c.publicId === id);
  const { data: improvements } = useResource(() => improvementsService.list(), []);
  const mockImprovements = improvements ?? [];
  const { data: allIncidentsForCounts } = useResource(() => incidentsService.list(), []);
  const { data: kbArticles } = useResource(() => knowledgeService.articles(), []);
  const getArticleById = (id: string) =>
    (kbArticles ?? []).find(a => a.id === id || a.publicId === id);
  const [activeTab, setActiveTab] = useState('overview');
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [linkIncidentsOpen, setLinkIncidentsOpen] = useState(false);
  const [linkChangeOpen, setLinkChangeOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  if (problemLoading && !problem) {
    return <div className="flex items-center justify-center py-24 text-sm text-ois-text-muted">Loading…</div>;
  }

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <XCircle size={40} className="text-ois-danger" />
        <h2 className="text-lg font-bold text-ois-text">Problem not found</h2>
        <Link to="/problems" className="text-sm text-ois-primary hover:underline">← Back to problems</Link>
      </div>
    );
  }

  const owner = findUserById(users, problem.ownerId);
  const affectedServices = problem.affectedServiceIds.map(id =>
    mockServices.find(s => s.id === id)?.name ?? id
  );

  type PromoteData = { rootCause: string; workaround: string; effectiveness: 'full' | 'partial' | 'none'; affectedVersions?: string; permanentFixPlan?: string };
  const handlePromote = (data: PromoteData) => {
    setProblem(prev => prev ? {
      ...prev,
      status: 'known_error',
      knownError: { publishedAt: new Date().toISOString(), publishedBy: 'u-001', ...data },
    } : prev);
  };

  const handleStatusChange = (newStatus: ProblemStatus) => {
    setProblem(prev => prev ? { ...prev, status: newStatus } : prev);
  };

  const stripeColor = PRIORITY_STRIPE[problem.severity] ?? '#475467';
  const incidents = (allIncidentsForCounts ?? []).filter(i => problem.relatedIncidentIds.includes(i.publicId));

  const TABS = [
    { id: 'overview',    label: 'Overview' },
    { id: 'incidents',   label: `Related Incidents (${problem.relatedIncidentCount})` },
    { id: 'rca',         label: 'RCA' },
    { id: 'known-error', label: 'Known Error' },
    { id: 'fix-plan',    label: 'Fix Plan' },
    { id: 'history',     label: 'History' },
  ];

  const quickActions = [
    problem.status !== 'known_error'
      ? { icon: ShieldAlert, label: 'Promote to known error', action: () => setPromoteOpen(true), primary: true }
      : { icon: Edit3, label: 'Edit known error', action: () => setPromoteOpen(true), primary: false },
    { icon: Plus, label: 'Link incidents', action: () => setLinkIncidentsOpen(true), primary: false },
    { icon: Activity, label: 'Open RCA workspace', action: () => navigate(`/problems/${problem.publicId}/rca`), primary: false },
    { icon: Wrench, label: 'Link change', action: () => setLinkChangeOpen(true), primary: false },
    { icon: BookOpen, label: 'Suggest KB article', action: () => navigate(`/kb/editor?source=problem&id=${problem.publicId}&title=${encodeURIComponent(problem.title)}`), primary: false },
  ];

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* Header — pinned */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/problems')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} />
            Problems
          </button>
          <div className="flex items-center gap-2">
            <Can
              module="problem" action="update"
              resource={problemResource(problem)}
              fallback={
                <span className="text-xs text-ois-text-subtle italic px-2">
                  Read-only — only IFM or the owning APS team can change status.
                </span>
              }
            >
              <StatusDropdown status={problem.status} onChange={handleStatusChange} />
            </Can>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Entity header with priority bar */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: stripeColor }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-ois-text-muted">{problem.publicId}</span>
              <SeverityBadge severity={problem.severity} />
              <ProblemSourceChip source={problem.source} />
            </div>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{problem.title}</h1>
            <div className="flex flex-wrap gap-1 mt-2">
              {problem.tags.map(t => (
                <span key={t} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted mt-2">
              Investigating since {formatRelative(problem.createdAt)}
              {owner && ` · owned by ${owner.name}`}
              {` · ${problem.relatedIncidentCount} related incident${problem.relatedIncidentCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* Body — three independent scroll columns */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="At a glance">
            <MetaRow label="Status">
              <ProblemStatusPill status={problem.status} />
            </MetaRow>
            <MetaRow label="Severity">
              <SeverityBadge severity={problem.severity} />
            </MetaRow>
            <MetaRow label="Source">
              <ProblemSourceChip source={problem.source} showLabel={false} />
            </MetaRow>
            {owner && (
              <MetaRow label="Owner">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-ois-text">{owner.name}</span>
                  <Avatar name={owner.name} size="xs" />
                </div>
              </MetaRow>
            )}
            <MetaRow label="Created">
              <span className="text-ois-text">{formatDate(problem.createdAt, 'MMM d, yyyy')}</span>
            </MetaRow>
            <MetaRow label="Updated">
              <span className="text-ois-text">{formatRelative(problem.updatedAt)}</span>
            </MetaRow>
          </SectionCard>

          <SectionCard title={`Related (${problem.relatedIncidentCount})`}>
            <MetaRow label="Linked">
              <span className="font-semibold text-ois-text">{problem.relatedIncidentCount} incidents</span>
            </MetaRow>
            <MetaRow label="Active">
              <span className="font-semibold text-ois-danger">
                {incidents.filter(i => !['resolved', 'closed'].includes(i.status)).length}
              </span>
            </MetaRow>
            <MetaRow label="Resolved">
              <span className="text-ois-text">
                {incidents.filter(i => ['resolved', 'closed'].includes(i.status)).length}
              </span>
            </MetaRow>
            <button
              onClick={() => setActiveTab('incidents')}
              className="text-xs text-ois-primary hover:underline flex items-center gap-1 mt-1"
            >
              See tab →
            </button>
          </SectionCard>

          {problem.linkedChangeIds.length > 0 && (
            <SectionCard title="Permanent fix">
              {problem.linkedChangeIds.map(chgId => {
                const chg = getChangeById(chgId);
                return (
                  <div key={chgId} className="space-y-1">
                    <p className="text-xs font-mono font-semibold text-ois-primary">{chgId}</p>
                    {chg && (
                      <>
                        <p className="text-xs text-ois-text leading-snug line-clamp-2">{chg.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ChangeStatusPill status={chg.status} size="sm" />
                          <RiskBadge risk={chg.risk} size="sm" />
                        </div>
                      </>
                    )}
                    <Link to={`/changes/${chgId}`} className="text-xs text-ois-primary hover:underline mt-1 inline-flex items-center gap-1">
                      <ExternalLink size={10} /> View change
                    </Link>
                  </div>
                );
              })}
            </SectionCard>
          )}
        </aside>

        {/* Center: pinned tab bar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab bar — shrink-0 so it pins */}
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-ois-primary text-ois-primary font-bold'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Only this region scrolls */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <SectionCard>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Description</p>
                  </div>
                  {editingDesc ? (
                    <>
                      <textarea
                        rows={4}
                        value={descDraft}
                        onChange={e => setDescDraft(e.target.value)}
                        className="w-full text-sm text-ois-text border border-ois-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button variant="primary" size="sm" onClick={() => {
                          setProblem(prev => prev ? { ...prev, description: descDraft } : prev);
                          setEditingDesc(false);
                        }}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingDesc(false)}>Cancel</Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-ois-text whitespace-pre-wrap leading-relaxed">{problem.description}</p>
                      <button
                        onClick={() => { setDescDraft(problem.description); setEditingDesc(true); }}
                        className="mt-3 flex items-center gap-1 text-xs text-ois-primary hover:underline"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    </>
                  )}
                </SectionCard>

                <SectionCard>
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">Affected services</p>
                  <div className="space-y-1.5">
                    {affectedServices.map(svc => (
                      <div key={svc} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-ois-danger shrink-0" />
                        <span className="font-medium text-ois-text">{svc}</span>
                      </div>
                    ))}
                    <p className="text-xs text-ois-text-muted mt-1">
                      Affected CIs:{' '}
                      {problem.affectedCIPublicIds.map((pub, i) => (
                        <span key={pub}>
                          <Link to={`/cmdb/${pub}`} className="font-mono text-ois-primary hover:underline">{pub}</Link>
                          {i < problem.affectedCIPublicIds.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                </SectionCard>

                <PatternSummaryCard problem={problem} />
              </div>
            )}

            {/* Related Incidents */}
            {activeTab === 'incidents' && (
              <RelatedIncidentsTab problem={problem} onLinkIncidents={() => setLinkIncidentsOpen(true)} />
            )}

            {/* RCA */}
            {activeTab === 'rca' && <RCASummaryTab problem={problem} />}

            {/* Known Error */}
            {activeTab === 'known-error' && (
              problem.status === 'known_error' && problem.knownError ? (
                <KnownErrorCard problem={problem} onEdit={() => setPromoteOpen(true)} />
              ) : (
                <div className="flex flex-col items-center py-16 gap-3 text-center">
                  <ShieldAlert size={36} className="text-ois-text-subtle" />
                  <p className="text-sm font-medium text-ois-text">Not yet a Known Error</p>
                  <p className="text-xs text-ois-text-muted max-w-xs">
                    Once the root cause is confirmed and a workaround is documented, promote this problem to Known Error so L1/L2 agents can reference it.
                  </p>
                  <Button variant="primary" size="sm" className="mt-2" onClick={() => setPromoteOpen(true)}>
                    <ShieldAlert size={13} className="mr-1.5" />
                    Promote to Known Error
                  </Button>
                </div>
              )
            )}

            {/* Fix Plan */}
            {activeTab === 'fix-plan' && (
              <div className="space-y-4">
                <div className="border border-ois-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-ois-text-subtle" />
                      <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Linked changes</p>
                    </div>
                    <button className="text-xs text-ois-primary hover:underline flex items-center gap-1" onClick={() => setLinkChangeOpen(true)}>
                      <Plus size={11} /> Link change
                    </button>
                  </div>
                  {problem.linkedChangeIds.length > 0 ? (
                    <div className="divide-y divide-ois-border">
                      {problem.linkedChangeIds.map(chgId => {
                        const chg = getChangeById(chgId);
                        return (
                          <div key={chgId} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono text-xs font-semibold text-ois-primary">{chgId}</span>
                              <Link to={`/changes/${chgId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                                <ExternalLink size={11} /> View
                              </Link>
                            </div>
                            {chg && (
                              <>
                                <p className="text-xs text-ois-text leading-snug mb-1">{chg.title}</p>
                                <div className="flex items-center gap-1.5">
                                  <ChangeStatusPill status={chg.status} size="sm" />
                                  <RiskBadge risk={chg.risk} size="sm" />
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-ois-text-subtle px-4 py-6 text-center">No changes linked yet</p>
                  )}
                </div>

                <div className="border border-ois-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-ois-text-subtle" />
                      <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Linked KB articles</p>
                    </div>
                    <Link
                      to={`/kb/editor?source=problem&id=${problem.publicId}&title=${encodeURIComponent(problem.title)}`}
                      className="text-xs text-ois-primary hover:underline flex items-center gap-1"
                    >
                      <Plus size={11} /> Suggest article
                    </Link>
                  </div>
                  {problem.linkedKBArticleIds.length > 0 ? (
                    <div className="divide-y divide-ois-border">
                      {problem.linkedKBArticleIds.map(kbId => {
                        const art = getArticleById(kbId);
                        return (
                          <div key={kbId} className="px-4 py-3 flex items-center justify-between">
                            <span className="font-mono text-xs font-semibold text-ois-primary">{kbId}</span>
                            {art ? (
                              <Link to={`/kb/${art.slug}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                                <ExternalLink size={11} /> View
                              </Link>
                            ) : (
                              <span className="text-xs text-ois-text-subtle flex items-center gap-1">
                                <ExternalLink size={11} /> View
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-ois-text-subtle px-4 py-6 text-center">No KB articles linked yet</p>
                  )}
                </div>

                {(() => {
                  const linkedImps = mockImprovements.filter(imp => imp.linkedProblemPublicId === problem.publicId);
                  if (linkedImps.length === 0) return null;
                  return (
                    <div className="border border-ois-border rounded-lg overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center gap-2">
                        <Link2 size={14} className="text-ois-text-subtle" />
                        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Linked improvements</p>
                      </div>
                      <div className="divide-y divide-ois-border">
                        {linkedImps.map(imp => (
                          <div key={imp.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <ImprovementStatusPill status={imp.status} />
                              <span className="font-mono text-xs font-semibold text-ois-primary shrink-0">{imp.publicId}</span>
                              <span className="text-xs text-ois-text truncate">{imp.title}</span>
                            </div>
                            <Link
                              to={`/improvement/${imp.publicId}`}
                              className="text-xs text-ois-primary hover:underline flex items-center gap-1 shrink-0 ml-2"
                            >
                              <ExternalLink size={11} /> View
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && <HistoryTab problem={problem} />}
          </div>
        </div>

        {/* Right sidebar — quick actions */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="Quick actions">
            <div className="space-y-1.5">
              <Can
                module="problem" action="update"
                resource={problemResource(problem)}
                fallback={
                  <p className="text-xs text-ois-text-subtle italic px-1">
                    You can view this problem but cannot modify it.
                  </p>
                }
              >
                {quickActions.map(({ icon: Icon, label, action, primary }) => (
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
              </Can>
              <Can module="problem" action="update" resource={problemResource(problem)}>
                <div className="pt-1 border-t border-ois-border">
                  <button
                    onClick={() => setCloseConfirmOpen(true)}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-text-muted hover:bg-ois-surface-muted"
                  >
                    <CheckCircle2 size={13} className="text-ois-text-subtle" />
                    Close problem
                  </button>
                </div>
              </Can>
            </div>
          </SectionCard>
        </aside>
      </div>

      {/* Modals */}
      <CloseProblemModal
        isOpen={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => handleStatusChange('closed')}
      />
      <PromoteToKnownErrorModal
        problem={problem}
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onPromote={handlePromote}
      />
      <LinkIncidentsModal
        problem={problem}
        isOpen={linkIncidentsOpen}
        onClose={() => setLinkIncidentsOpen(false)}
        onLink={newPublicIds =>
          setProblem(prev =>
            prev
              ? {
                  ...prev,
                  relatedIncidentIds: [...new Set([...prev.relatedIncidentIds, ...newPublicIds])],
                  relatedIncidentCount: prev.relatedIncidentCount + newPublicIds.length,
                }
              : prev
          )
        }
      />
      <LinkChangeModal
        isOpen={linkChangeOpen}
        onClose={() => setLinkChangeOpen(false)}
        currentChangeIds={problem.linkedChangeIds}
        onLink={newIds =>
          setProblem(prev =>
            prev
              ? { ...prev, linkedChangeIds: [...new Set([...prev.linkedChangeIds, ...newIds])] }
              : prev
          )
        }
      />
    </div>
  );
};
