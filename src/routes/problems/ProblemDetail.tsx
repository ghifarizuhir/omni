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
import { getProblemById } from '@/src/mocks/problems';
import { getArticleById } from '@/src/mocks/kbArticles';
import { mockIncidents } from '@/src/mocks/incidents';
import { mockUsers } from '@/src/mocks/users';
import { mockServices } from '@/src/mocks/services';
import { mockCIs } from '@/src/mocks/cis';
import { Problem, ProblemStatus } from '@/src/types/problem';
import { problemStatusMeta } from '@/src/lib/constants';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { Tabs } from '@/src/components/ui/Tabs';
import { ProblemStatusPill } from '@/src/components/problems/ProblemStatusPill';
import { ProblemSourceChip } from '@/src/components/problems/ProblemSourceChip';
import { KnownErrorCard } from '@/src/components/problems/KnownErrorCard';
import { PromoteToKnownErrorModal } from '@/src/components/problems/PromoteToKnownErrorModal';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';

// ── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_STRIPE: Record<string, string> = {
  P1: '#B42318', P2: '#DC6803', P3: '#F79009', P4: '#12B76A',
};

function getUserById(id?: string) {
  return id ? mockUsers.find(u => u.id === id) : undefined;
}

// ── Sidebar card ─────────────────────────────────────────────────────────────

const SidebarSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-ois-border rounded-lg bg-ois-surface overflow-hidden">
    <div className="px-3 py-2 bg-ois-surface-muted/50 border-b border-ois-border">
      <p className="text-[10px] font-bold text-ois-text-muted uppercase tracking-widest">{title}</p>
    </div>
    <div className="px-3 py-3 space-y-2">{children}</div>
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
            <p className="text-xs text-ois-text-muted mb-1 font-semibold uppercase tracking-wider">
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
          <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider">Root causes</h4>
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
          <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider">Contributing factors</h4>
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
          <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider">
            Recommended actions ({rca.recommendedActions.length})
          </h4>
          <div className="border border-ois-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ois-surface-muted/50 border-b border-ois-border">
                  <th className="px-3 py-2 text-left text-ois-text-muted font-semibold uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-left text-ois-text-muted font-semibold uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2 text-left text-ois-text-muted font-semibold uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-2 text-left text-ois-text-muted font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ois-border">
                {rca.recommendedActions.map((action, i) => {
                  const owner = getUserById(action.owner);
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

const RelatedIncidentsTab: React.FC<{ problem: Problem }> = ({ problem }) => {
  const incidents = mockIncidents.filter(i =>
    problem.relatedIncidentIds.includes(i.publicId)
  );

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <AlertTriangle size={32} className="text-ois-text-subtle" />
        <p className="text-sm font-medium text-ois-text">No related incidents linked yet</p>
        <Button variant="secondary" size="sm">
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
        <Button variant="secondary" size="sm">
          <Plus size={13} className="mr-1.5" />
          Link more incidents
        </Button>
      </div>
      <div className="border border-ois-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ois-surface-muted/50 border-b border-ois-border text-[11px] font-semibold text-ois-text-muted uppercase tracking-wider">
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
  if (!problem.firstIncidentDate && !problem.lastIncidentDate) return null;

  const incidents = mockIncidents.filter(i => problem.relatedIncidentIds.includes(i.publicId));
  const resolved = incidents.filter(i => i.resolution?.resolvedAt);
  const avgMttr = resolved.length > 0
    ? resolved.reduce((sum, inc) => sum + (new Date(inc.resolution!.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000, 0) / resolved.length
    : null;

  const formatMin = (min: number) => min < 60 ? `${Math.round(min)}m` : `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;

  return (
    <div className="border border-ois-border rounded-lg p-4 bg-ois-surface">
      <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider mb-3">Pattern summary</h4>
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

// ── Main component ────────────────────────────────────────────────────────────

export const ProblemDetail: React.FC = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<Problem | undefined>(
    problemId ? getProblemById(problemId) : undefined
  );
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <XCircle size={40} className="text-ois-danger" />
        <h2 className="text-lg font-bold text-ois-text">Problem not found</h2>
        <Link to="/problems" className="text-sm text-ois-primary hover:underline">← Back to problems</Link>
      </div>
    );
  }

  const owner = getUserById(problem.ownerId);
  const affectedCIs = problem.affectedCIPublicIds.map(pub =>
    mockCIs.find(ci => ci.publicId === pub) ?? { publicId: pub, name: pub }
  );
  const affectedServices = problem.affectedServiceIds.map(id =>
    mockServices.find(s => s.id === id)?.name ?? id
  );

  type PromoteData = { rootCause: string; workaround: string; effectiveness: 'full' | 'partial' | 'none'; affectedVersions?: string; permanentFixPlan?: string };
  const handlePromote = (data: PromoteData) => {
    setProblem(prev => prev ? {
      ...prev,
      status: 'known_error',
      knownError: {
        publishedAt: new Date().toISOString(),
        publishedBy: 'u-001',
        ...data,
      },
    } : prev);
  };

  const handleStatusChange = (newStatus: ProblemStatus) => {
    setProblem(prev => prev ? { ...prev, status: newStatus } : prev);
    setStatusOpen(false);
  };

  const stripeColor = PRIORITY_STRIPE[problem.severity] ?? '#475467';
  const incidents = mockIncidents.filter(i => problem.relatedIncidentIds.includes(i.publicId));

  const TABS = [
    { id: 'overview',   label: 'Overview' },
    { id: 'incidents',  label: `Related Incidents (${problem.relatedIncidentCount})` },
    { id: 'rca',        label: 'RCA' },
    { id: 'known-error', label: 'Known Error' },
    { id: 'fix-plan',   label: 'Fix Plan' },
    { id: 'history',    label: 'History' },
  ];

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Top bar */}
      <div className="mb-5">
        <Link to="/problems" className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-primary mb-3 transition-colors">
          <ArrowLeft size={13} />
          Problems
        </Link>

        <div className="flex gap-0 rounded-xl border border-ois-border overflow-hidden shadow-ois-card">
          {/* Severity stripe */}
          <div className="w-1 shrink-0" style={{ backgroundColor: stripeColor }} />

          <div className="flex-1 px-5 py-4 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Status + ID row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setStatusOpen(!statusOpen)}
                      className="flex items-center gap-1.5"
                    >
                      <ProblemStatusPill status={problem.status} />
                      <ChevronDown size={12} className="text-ois-text-subtle" />
                    </button>
                    {statusOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-lg overflow-hidden min-w-[160px]">
                          {(['identified', 'investigating', 'known_error', 'fix_in_progress', 'closed'] as ProblemStatus[]).map(s => (
                            <button key={s} onClick={() => handleStatusChange(s)}
                              className={cn('w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors',
                                problem.status === s ? 'font-semibold' : 'text-ois-text')}>
                              {problemStatusMeta[s].label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold text-ois-text-muted">{problem.publicId}</span>
                  <SeverityBadge severity={problem.severity} />
                  <ProblemSourceChip source={problem.source} />
                </div>

                {/* Title */}
                <h1 className="text-xl font-bold text-ois-text leading-tight truncate">{problem.title}</h1>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {problem.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono text-ois-text-subtle bg-ois-surface-muted px-1.5 py-0.5 rounded border border-ois-border">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <p className="text-xs text-ois-text-muted mt-2">
                  Investigating since {formatRelative(problem.createdAt)}
                  {owner && ` · owned by ${owner.name}`}
                  {` · ${problem.relatedIncidentCount} related incident${problem.relatedIncidentCount !== 1 ? 's' : ''}`}
                </p>
              </div>

              <button className="w-8 h-8 rounded-lg hover:bg-ois-surface-muted flex items-center justify-center text-ois-text-muted shrink-0">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex gap-5 flex-1 min-h-0 items-start">
        {/* Left sidebar */}
        <div className="w-[240px] shrink-0 space-y-3 sticky top-4">
          <SidebarSection title="At a glance">
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
          </SidebarSection>

          <SidebarSection title={`Related (${problem.relatedIncidentCount})`}>
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
            <Link to="#incidents" className="text-xs text-ois-primary hover:underline block text-right mt-1">
              See tab →
            </Link>
          </SidebarSection>

          {problem.linkedChangeIds.length > 0 && (
            <SidebarSection title="Permanent fix">
              {problem.linkedChangeIds.map(chgId => (
                <div key={chgId}>
                  <p className="text-xs font-mono font-semibold text-ois-primary">{chgId}</p>
                  <p className="text-xs text-ois-text-subtle">Status: planned</p>
                  {problem.knownError?.permanentFixPlan && (
                    <p className="text-xs text-ois-text-muted mt-1 line-clamp-2">
                      Target: {problem.knownError.permanentFixPlan}
                    </p>
                  )}
                  <a href={`/changes/${chgId}`} className="text-xs text-ois-primary hover:underline mt-1 inline-flex items-center gap-1">
                    <ExternalLink size={10} /> View change
                  </a>
                </div>
              ))}
            </SidebarSection>
          )}
        </div>

        {/* Center — tabs */}
        <div className="flex-1 min-w-0">
          <Tabs tabs={TABS}>
            {/* Tab 1: Overview */}
            <div className="space-y-4">
              <div className="border border-ois-border rounded-lg p-4 bg-ois-surface">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider">Description</h4>
                  <button className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                    <Edit3 size={11} /> Edit
                  </button>
                </div>
                <p className="text-sm text-ois-text leading-relaxed">{problem.description}</p>
              </div>

              <div className="border border-ois-border rounded-lg p-4 bg-ois-surface">
                <h4 className="text-xs font-bold text-ois-text uppercase tracking-wider mb-3">Affected services</h4>
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
              </div>

              <PatternSummaryCard problem={problem} />
            </div>

            {/* Tab 2: Related Incidents */}
            <RelatedIncidentsTab problem={problem} />

            {/* Tab 3: RCA */}
            <RCASummaryTab problem={problem} />

            {/* Tab 4: Known Error */}
            <div>
              {problem.status === 'known_error' && problem.knownError ? (
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
              )}
            </div>

            {/* Tab 5: Fix Plan */}
            <div className="space-y-4">
              <div className="border border-ois-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-ois-border bg-ois-surface-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-ois-text-muted" />
                    <span className="text-xs font-bold text-ois-text uppercase tracking-wider">Linked changes</span>
                  </div>
                  <button className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                    <Plus size={11} /> Link change
                  </button>
                </div>
                {problem.linkedChangeIds.length > 0 ? (
                  <div className="divide-y divide-ois-border">
                    {problem.linkedChangeIds.map(chgId => (
                      <div key={chgId} className="px-4 py-3 flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-ois-primary">{chgId}</span>
                        <a href={`/changes/${chgId}`} className="text-xs text-ois-primary hover:underline flex items-center gap-1">
                          <ExternalLink size={11} /> View
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ois-text-subtle px-4 py-6 text-center">No changes linked yet</p>
                )}
              </div>

              <div className="border border-ois-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-ois-border bg-ois-surface-muted/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-ois-text-muted" />
                    <span className="text-xs font-bold text-ois-text uppercase tracking-wider">Linked KB articles</span>
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
            </div>

            {/* Tab 6: History */}
            <HistoryTab problem={problem} />
          </Tabs>
        </div>

        {/* Right sidebar — quick actions */}
        <div className="w-[200px] shrink-0 sticky top-4">
          <div className="border border-ois-border rounded-lg overflow-hidden bg-ois-surface">
            <div className="px-3 py-2 border-b border-ois-border bg-ois-surface-muted/40">
              <p className="text-[10px] font-bold text-ois-text-muted uppercase tracking-widest">Quick actions</p>
            </div>
            <div className="p-3 space-y-1.5">
              {problem.status !== 'known_error' ? (
                <button
                  onClick={() => setPromoteOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors flex items-center gap-2"
                >
                  <ShieldAlert size={13} />
                  Promote to known error
                </button>
              ) : (
                <button
                  onClick={() => setPromoteOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors flex items-center gap-2"
                >
                  <Edit3 size={13} className="text-ois-text-muted" />
                  Edit known error
                </button>
              )}
              {[
                { icon: Plus, label: 'Link incidents' },
                { icon: Activity, label: 'Open RCA workspace', to: `/problems/${problem.publicId}/rca` },
                { icon: Wrench, label: 'Link change' },
                { icon: BookOpen, label: 'Suggest KB article' },
              ].map(({ icon: Icon, label, to }) => (
                to ? (
                  <Link key={label} to={to}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors flex items-center gap-2">
                    <Icon size={13} className="text-ois-text-muted" />
                    {label}
                  </Link>
                ) : (
                  <button key={label}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text hover:bg-ois-surface-muted border border-ois-border transition-colors flex items-center gap-2">
                    <Icon size={13} className="text-ois-text-muted" />
                    {label}
                  </button>
                )
              ))}
              <button
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ois-text-muted hover:bg-ois-surface-muted border border-ois-border/50 transition-colors flex items-center gap-2 mt-2"
                onClick={() => handleStatusChange('closed')}
              >
                <CheckCircle2 size={13} />
                Close problem
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PromoteToKnownErrorModal
        problem={problem}
        isOpen={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        onPromote={handlePromote}
      />
    </div>
  );
};
