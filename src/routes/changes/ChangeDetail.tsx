import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  ExternalLink, Tag, ClipboardCheck, History, MoreHorizontal,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import { getChangeById } from '../../mocks/changes';
import { mockScalingRecommendations } from '../../mocks/scalingRecommendations';
import { ChangeStatusPill } from '../../components/changes/ChangeStatusPill';
import { ChangeTypeChip } from '../../components/changes/ChangeTypeChip';
import { RiskBadge } from '../../components/changes/RiskBadge';
import { ApprovalMatrix } from '../../components/changes/ApprovalMatrix';
import { PIRPanel } from '../../components/changes/PIRPanel';
import { RescheduleModal } from '../../components/changes/RescheduleModal';
import { formatDate, formatRelative } from '../../lib/format';

const RISK_COLOR: Record<string, string> = {
  low: '#12B76A', medium: '#F79009', high: '#F04438', critical: '#B42318',
};

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

// ── Main component ─────────────────────────────────────────────────────────────

export const ChangeDetail: React.FC = () => {
  const { changeId } = useParams<{ changeId: string }>();
  const navigate = useNavigate();
  const rawChange = getChangeById(changeId ?? '');
  const [change, setChange] = useState(rawChange ?? null);

  const [changeStatus, setChangeStatus] = useState(change?.status ?? 'draft');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  if (!rawChange || !change) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-2xl font-bold text-ois-text mb-2">Change not found</p>
        <p className="text-sm text-ois-text-muted mb-6">{changeId}</p>
        <Button onClick={() => navigate('/changes')}>← Back to Calendar</Button>
      </div>
    );
  }

  const approvedCount = change.approvals.filter((a) => a.decision === 'approve').length;
  const activeConflicts = change.conflicts.filter((c) => !c.resolvedAt);
  const isImplemented = ['implemented', 'closed_successful', 'closed_failed'].includes(changeStatus);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'plans', label: 'Plans' },
    { id: 'approvals', label: `Approvals (${change.approvals.length})` },
    { id: 'conflicts', label: `Conflicts (${change.conflicts.length})` },
    { id: 'linked', label: `Linked (${change.linkedProblemIds.length + change.linkedIncidentIds.length + (change.linkedReleaseId ? 1 : 0) + change.linkedKBSlugs.length})` },
    { id: 'pir', label: 'PIR' },
    { id: 'history', label: 'History' },
  ];

  const handleCloseModal = () => {
    setShowCancelModal(false);
  };

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Pinned header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/changes')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> Calendar
          </button>
          <div className="flex items-center gap-2">
            <ChangeStatusPill status={changeStatus} />
            <div className="relative">
              <button
                onClick={() => setActionsOpen(v => !v)}
                className="px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors"
              >
                <MoreHorizontal size={15} />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[180px]">
                    {[
                      {
                        label: 'Copy change ID',
                        action: () => navigator.clipboard.writeText(change!.publicId),
                      },
                      {
                        label: 'Copy link',
                        action: () => navigator.clipboard.writeText(window.location.href),
                      },
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={() => { item.action(); setActionsOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors text-ois-text"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Entity header with risk stripe */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: RISK_COLOR[change.risk] }} />
          <div className="flex-1 px-6 py-4">
            {/* ID + chips */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-ois-primary">{change.publicId}</span>
              <ChangeTypeChip type={change.type} size="sm" />
              <RiskBadge risk={change.risk} score={change.riskScore} size="sm" />
            </div>
            {/* Title */}
            <h1 className="text-xl font-bold text-ois-text leading-snug mb-2">{change.title}</h1>
            {/* Tags as rounded-full pills */}
            {change.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {change.tags.map((t) => (
                  <span key={t} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {/* Meta line */}
            <div className="flex items-center gap-4 text-xs text-ois-text-muted">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {change.implementationWindow}
              </span>
              <span>Owner: <span className="font-medium text-ois-text">{change.ownerName}</span></span>
              <span>Created {formatRelative(change.createdAt)} by {change.requesterName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Three-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="At a glance">
            <dl className="divide-y divide-ois-border text-xs -mx-4 -mb-4">
              {[
                { label: 'Status', value: <ChangeStatusPill status={changeStatus} size="sm" /> },
                { label: 'Type', value: <ChangeTypeChip type={change.type} size="sm" /> },
                { label: 'Risk', value: <RiskBadge risk={change.risk} score={change.riskScore} size="sm" /> },
                { label: 'Impact', value: <span className="capitalize font-medium text-ois-text">{change.impact}</span> },
                { label: 'Owner', value: <span className="text-ois-text">{change.ownerName}</span> },
                { label: 'Created', value: <span className="text-ois-text-muted">{formatRelative(change.createdAt)}</span> },
                { label: 'Window', value: <span className="text-ois-text text-[10px]">{change.implementationWindow}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-ois-text-muted">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          {/* Risk factors */}
          {change.riskFactors.length > 0 && (
            <SectionCard title="Risk Factors">
              <ul className="space-y-1.5">
                {change.riskFactors.map((f) => (
                  <li key={f} className="text-xs text-ois-text flex items-start gap-1.5">
                    <span className="text-ois-text-subtle mt-0.5">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {/* Approvals progress */}
          <SectionCard title="Approvals">
            <div className="flex gap-1 mb-2">
              {change.approvals.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    a.decision === 'approve' ? 'bg-emerald-500' :
                    a.decision === 'reject' ? 'bg-ois-danger' : 'bg-ois-border',
                  )}
                >
                  {a.decision === 'approve' ? <CheckCircle2 size={11} className="text-white" /> :
                   a.decision === 'reject' ? <span className="text-white text-[9px] font-bold">✕</span> :
                   <Clock size={10} className="text-ois-text-subtle" />}
                </div>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted">
              {approvedCount} of {change.approvals.length} received
            </p>
            {change.cabSessionId && (
              <p className="text-[10px] text-ois-text-subtle mt-1 flex items-center gap-1">
                <Clock size={9} /> CAB Thu May 9 10:00 UTC
              </p>
            )}
          </SectionCard>
        </aside>

        {/* Center — tab bar + scrollable content */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tab bar — shrink-0 pinned */}
          <div className="border-b border-ois-border bg-white shrink-0 px-6">
            <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                    activeTab === tab.id
                      ? 'border-ois-primary text-ois-primary font-bold'
                      : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <SectionCard title="Description">
                  <p className="text-sm text-ois-text leading-relaxed">{change.description}</p>
                </SectionCard>
                <SectionCard title="Justification">
                  <p className="text-sm text-ois-text leading-relaxed">{change.justification}</p>
                </SectionCard>
                <SectionCard title="Affected Scope">
                  <div className="flex gap-4 mb-3 text-xs text-ois-text-muted">
                    <span>{change.affectedCIIds.length} CIs</span>
                    <span>{change.affectedServiceIds.length} service(s)</span>
                  </div>
                  {change.affectedCIPublicIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {change.affectedCIPublicIds.map((ci) => (
                        <Link key={ci} to={`/cmdb/${ci}`} className="font-mono text-xs bg-ois-bg border border-ois-border px-2 py-1 rounded-lg text-ois-primary hover:border-ois-primary transition-colors">
                          {ci}
                        </Link>
                      ))}
                    </div>
                  )}
                </SectionCard>
                <SectionCard title="Schedule">
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <Clock size={14} className="text-ois-text-subtle" />
                      <span className="font-medium text-ois-text">{change.implementationWindow}</span>
                    </p>
                    <p className="text-xs text-ois-text-muted">
                      Planned: {formatDate(change.plannedStart, 'MMM d, HH:mm')} – {formatDate(change.plannedEnd, 'HH:mm')} UTC
                    </p>
                    {change.freezeWindow && (
                      <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> Within freeze window — exception approved
                      </p>
                    )}
                    <p className="text-xs text-ois-text-muted">
                      Conflict status:{' '}
                      {activeConflicts.length === 0
                        ? <span className="text-ois-success font-semibold">✓ No conflicts</span>
                        : <span className="text-ois-warning font-semibold">{activeConflicts.length} conflict(s) detected</span>}
                    </p>
                  </div>
                </SectionCard>
              </div>
            )}

            {/* Plans */}
            {activeTab === 'plans' && (
              <div className="space-y-4">
                {[
                  { label: 'Implementation Plan', content: change.implementationPlan },
                  { label: 'Rollback Plan', content: change.rollbackPlan },
                  { label: 'Test Plan', content: change.testPlan },
                ].map(({ label, content }) => (
                  <SectionCard key={label} title={label}>
                    <pre className="text-xs text-ois-text font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {content || <span className="text-ois-text-subtle italic">Not yet provided</span>}
                    </pre>
                  </SectionCard>
                ))}
              </div>
            )}

            {/* Approvals */}
            {activeTab === 'approvals' && (
              <SectionCard title="Required Approvals">
                <div className="flex items-center justify-between mb-4">
                  <span />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => navigate('/changes/cab')}
                  >
                    Open CAB workspace <ExternalLink size={11} />
                  </Button>
                </div>
                <ApprovalMatrix
                  approvals={change.approvals}
                  changeId={change.id}
                  cabSessionDate={change.cabSessionId ? 'Thursday May 9, 10:00 UTC' : undefined}
                />
              </SectionCard>
            )}

            {/* Conflicts */}
            {activeTab === 'conflicts' && (
              <div className="space-y-3">
                {change.conflicts.length === 0 ? (
                  <SectionCard>
                    <div className="py-10 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-ois-success mb-3" />
                      <p className="text-sm font-bold text-ois-text">No conflicts detected</p>
                      <p className="text-xs text-ois-text-muted mt-1">
                        This change has been validated against the FSC and freeze windows.
                      </p>
                      <p className="text-[10px] text-ois-text-subtle mt-2">Last checked: 4 minutes ago</p>
                    </div>
                  </SectionCard>
                ) : (
                  <>
                    {activeConflicts.length > 0 && (
                      <p className="text-sm font-semibold text-ois-warning flex items-center gap-1.5">
                        <AlertTriangle size={14} /> {activeConflicts.length} active conflict(s)
                      </p>
                    )}
                    {change.conflicts.map((cf) => (
                      <div
                        key={cf.id}
                        className={cn(
                          'border border-ois-border rounded-lg bg-ois-surface overflow-hidden',
                          cf.resolvedAt && 'opacity-70',
                        )}
                      >
                        <div className={cn(
                          'px-4 py-3 border-b border-ois-border flex items-center gap-2',
                          cf.severity === 'blocking' ? 'bg-red-50' : 'bg-amber-50',
                        )}>
                          <AlertTriangle size={14} className={cf.severity === 'blocking' ? 'text-ois-danger' : 'text-amber-600'} />
                          <h3 className="text-sm font-bold text-ois-text capitalize">
                            {cf.type.replace(/_/g, ' ')} Conflict
                          </h3>
                          <Badge variant={cf.severity === 'blocking' ? 'danger' : 'warning'} className="text-[10px] ml-auto">
                            {cf.severity}
                          </Badge>
                          {cf.resolvedAt && <Badge variant="success" className="text-[10px]">Resolved</Badge>}
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-ois-text mb-3">{cf.description}</p>
                          {cf.conflictsWith.length > 0 && (
                            <p className="text-xs text-ois-text-muted mb-2">
                              Conflicts with: {cf.conflictsWith.map((id) => (
                                <Link key={id} to={`/changes/${id}`} className="text-ois-primary hover:underline font-mono ml-1">{id}</Link>
                              ))}
                            </p>
                          )}
                          <div className="text-[11px] text-ois-text-subtle space-y-0.5">
                            <p>Detected: {formatDate(cf.detectedAt, 'MMM d, HH:mm')} UTC</p>
                            {cf.resolvedAt && <p>Resolved: {formatDate(cf.resolvedAt, 'MMM d, HH:mm')} UTC</p>}
                            {cf.resolutionNote && (
                              <p className="text-ois-text-muted mt-1 italic">"{cf.resolutionNote}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Linked */}
            {activeTab === 'linked' && (
              <div className="space-y-3">
                {change.linkedProblemIds.length > 0 && (
                  <SectionCard title={`Problems (${change.linkedProblemIds.length})`}>
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {change.linkedProblemIds.map((id) => (
                        <Link key={id} to={`/problems/${id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <span className="font-mono text-sm font-bold text-ois-primary">{id}</span>
                          <ExternalLink size={13} className="text-ois-text-subtle" />
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}
                {change.linkedIncidentIds.length > 0 && (
                  <SectionCard title={`Incidents (${change.linkedIncidentIds.length})`}>
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {change.linkedIncidentIds.map((id) => (
                        <Link key={id} to={`/incidents/${id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <span className="font-mono text-sm font-bold text-ois-primary">{id}</span>
                          <ExternalLink size={13} className="text-ois-text-subtle" />
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}
                {change.linkedReleasePublicId && (
                  <SectionCard title="Release">
                    <Link to={`/releases/${change.linkedReleasePublicId}`} className="flex items-center justify-between hover:opacity-80">
                      <span className="font-mono text-sm font-bold text-ois-primary">{change.linkedReleasePublicId}</span>
                      <ExternalLink size={13} className="text-ois-text-subtle" />
                    </Link>
                  </SectionCard>
                )}
                {change.linkedKBSlugs.length > 0 && (
                  <SectionCard title="KB Articles">
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {change.linkedKBSlugs.map((slug) => (
                        <Link key={slug} to={`/kb/${slug}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <span className="font-mono text-xs text-ois-primary">{slug}</span>
                          <ExternalLink size={13} className="text-ois-text-subtle" />
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* Capacity recommendations resolved by this change */}
                {(() => {
                  const resolved = mockScalingRecommendations.filter(
                    r => r.implementedViaChangeId === change.id ||
                         r.implementedViaChangeId === change.publicId
                  );
                  if (resolved.length === 0) return null;
                  return (
                    <SectionCard title={`Capacity Recommendations (${resolved.length})`}>
                      <p className="text-xs text-ois-text-muted mb-3">This change implements the following capacity actions</p>
                      <div className="divide-y divide-ois-border -mx-4 -mb-4">
                        {resolved.map(rec => (
                          <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                              <span className="font-mono text-xs font-bold text-ois-primary">{rec.publicId}</span>
                              <p className="text-xs text-ois-text mt-0.5">{rec.suggestedAction}</p>
                              <p className="text-xs text-ois-text-muted">{rec.estimatedImpact}</p>
                            </div>
                            <Link to="/capacity" className="text-xs text-ois-primary hover:underline flex items-center gap-1 ml-4">
                              Capacity <ExternalLink size={12} />
                            </Link>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  );
                })()}
              </div>
            )}

            {/* PIR */}
            {activeTab === 'pir' && (
              <SectionCard title="Post-Implementation Review">
                {!isImplemented || !change.pir ? (
                  <div className="py-8 text-center">
                    <ClipboardCheck size={32} className="mx-auto text-ois-text-subtle mb-3" />
                    <p className="text-sm font-bold text-ois-text">PIR not yet conducted</p>
                    <p className="text-xs text-ois-text-muted mt-1">
                      {isImplemented
                        ? 'No PIR has been filed for this change.'
                        : 'This change has not been implemented. PIR will be available after closure.'}
                    </p>
                  </div>
                ) : (
                  <PIRPanel pir={change.pir} />
                )}
              </SectionCard>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <SectionCard title="Audit History">
                <div className="py-8 text-center">
                  <History size={32} className="mx-auto text-ois-text-subtle mb-3" />
                  <p className="text-sm font-bold text-ois-text">No history available</p>
                  <p className="text-xs text-ois-text-muted mt-1">
                    Audit log tracking is coming soon. Full change history will be recorded here.
                  </p>
                </div>
              </SectionCard>
            )}

          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-2">
              {[
                { label: 'Approve change',     action: () => setActiveTab('approvals'), primary: true },
                { label: 'Open CAB workspace', action: () => navigate('/changes/cab'),  primary: false },
                { label: 'Reschedule',         action: () => setRescheduleOpen(true),   primary: false },
              ].map(({ label, action, primary }) => (
                <button key={label} onClick={action}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                    primary
                      ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
                      : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted',
                  )}>
                  {label}
                </button>
              ))}
              {/* Cancel change — separated with divider */}
              <div className="pt-1 border-t border-ois-border">
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-danger hover:bg-ois-danger-pale"
                >
                  Cancel change
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Watchers">
            <div className="space-y-2">
              {[change.ownerName, ...change.approvals.map((a) => a.approverName)]
                .filter((v, i, a) => a.indexOf(v) === i)
                .slice(0, 5)
                .map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-ois-primary/10 text-ois-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-xs text-ois-text truncate">{name}</span>
                  </div>
                ))}
            </div>
          </SectionCard>
        </aside>
      </div>

      {/* Cancel change confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={handleCloseModal}
        title="Cancel this change?"
        size="sm"
      >
        {changeStatus === 'cancelled' ? (
          <div className="text-center py-2">
            <CheckCircle2 size={40} className="mx-auto text-ois-success mb-3" />
            <p className="text-base font-bold text-ois-text mb-1">Change cancelled</p>
            <p className="text-sm text-ois-text-muted mb-5">{change.publicId} has been marked as cancelled.</p>
            <Button onClick={handleCloseModal} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-ois-danger" />
              </div>
              <div>
                <p className="text-xs text-ois-text-muted leading-relaxed">
                  This will mark <span className="font-semibold text-ois-text">{change.publicId}</span> as cancelled.
                  Pending approvals will be voided and the change will no longer appear on the forward schedule.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCloseModal}
              >
                Keep change
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-ois-danger hover:bg-red-600 border-ois-danger text-white"
                onClick={() => {
                  setChangeStatus('cancelled');
                }}
              >
                Confirm cancel
              </Button>
            </div>
          </>
        )}
      </Modal>

      <RescheduleModal
        isOpen={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        currentStart={change!.plannedStart}
        currentEnd={change!.plannedEnd}
        onReschedule={(newStart, newEnd) =>
          setChange(prev =>
            prev ? { ...prev, plannedStart: newStart, plannedEnd: newEnd } : prev
          )
        }
      />
    </div>
  );
};
