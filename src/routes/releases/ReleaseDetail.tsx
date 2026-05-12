import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, ExternalLink, Check, Loader2, X, Clock, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../lib/utils';
import { getReleaseById } from '../../mocks/releases';
import { ReleaseStatusPill } from '../../components/releases/ReleaseStatusPill';
import { ReleaseTypeChip } from '../../components/releases/ReleaseTypeChip';
import { StagesMiniStepper } from '../../components/releases/StagesMiniStepper';
import { stageStatusMeta, riskMeta } from '../../lib/constants';
import { ReleaseStage, ReleaseStatus } from '../../types/release';
import { formatDate } from '../../lib/format';

const RELEASE_TYPE_COLOR: Record<string, string> = {
  major: '#B42318', minor: '#DC6803', patch: '#027A48', hotfix: '#F04438',
};

interface ToastState { message: string; variant: 'success' | 'danger' | 'info' }
const Toast: React.FC<ToastState> = ({ message, variant }) => (
  <div className={cn(
    'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-none',
    variant === 'success' ? 'bg-ois-success text-white' :
    variant === 'danger' ? 'bg-ois-danger text-white' :
    'bg-ois-primary text-white',
  )}>
    {variant === 'success' && <CheckCircle2 size={15} />}
    {message}
  </div>
);

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

const StageCard: React.FC<{ stage: ReleaseStage; isCurrent: boolean; onDeploy?: () => void }> = ({ stage, isCurrent, onDeploy }) => {
  const meta = stageStatusMeta[stage.status];
  const StatusIcon = stage.status === 'success' ? Check : stage.status === 'in_progress' ? Loader2 : stage.status === 'failed' || stage.status === 'rolled_back' ? X : Clock;

  return (
    <div className={cn(
      'rounded-xl border p-4',
      isCurrent && stage.status === 'in_progress' ? 'border-ois-primary bg-blue-50/30' :
      stage.status === 'success' ? 'border-emerald-200 bg-emerald-50/30' :
      stage.status === 'failed' || stage.status === 'rolled_back' ? 'border-red-200 bg-red-50/20' :
      'border-ois-border bg-ois-bg/50',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon size={16} className={cn('shrink-0', stage.status === 'in_progress' && 'animate-spin')} style={{ color: meta.color }} />
          <span className="text-sm font-bold text-ois-text uppercase">{stage.environment}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      {stage.testsPassed !== undefined && (
        <p className="text-xs text-ois-text-muted mb-1">
          Tests: <span className="font-semibold">{stage.testsPassed}</span>/{stage.testsTotal} passed
        </p>
      )}
      {stage.startedAt && <p className="text-[10px] text-ois-text-subtle">Started: {formatDate(stage.startedAt, 'MMM d, HH:mm')} UTC</p>}
      {stage.completedAt && <p className="text-[10px] text-ois-text-subtle">Completed: {formatDate(stage.completedAt, 'MMM d, HH:mm')} UTC</p>}
      {!stage.startedAt && stage.status === 'pending' && (
        <p className="text-xs text-ois-text-subtle">No deployment yet</p>
      )}
      {stage.approvalRequired && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
          <Lock size={11} /> Approval required
          {stage.approvedAt && <span className="text-ois-success font-semibold">· ✓ Approved</span>}
        </div>
      )}
      {stage.status === 'pending' && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-7 text-xs w-full"
          disabled={!onDeploy}
          onClick={onDeploy}
        >
          Deploy to {stage.environment} →
        </Button>
      )}
    </div>
  );
};

export const ReleaseDetail: React.FC = () => {
  const { releaseId } = useParams<{ releaseId: string }>();
  const navigate = useNavigate();
  const release = getReleaseById(releaseId ?? '');
  const [activeTab, setActiveTab] = useState('overview');
  const [localStatus, setLocalStatus] = useState<ReleaseStatus | null>(null);
  const [localStages, setLocalStages] = useState<ReleaseStage[]>(() => release?.stages ?? []);
  const [deployIdx, setDeployIdx] = useState<number | null>(null);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, variant: ToastState['variant'] = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, variant });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handlePromoteConfirm = () => {
    setPromoteModalOpen(false);
    setLocalStatus('deploying');
    showToast('Promoted to staging successfully');
    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigateTimerRef.current = setTimeout(() => navigate('/deployments'), 2000);
  };

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  const handleCancelConfirm = () => {
    setCancelModalOpen(false);
    setLocalStatus('cancelled');
    showToast('Release cancelled', 'danger');
  };

  if (!release) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-2xl font-bold text-ois-text mb-2">Release not found</p>
        <Button onClick={() => navigate('/releases')}>← Back to Releases</Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'composition', label: 'Composition' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'notes', label: 'Notes' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Pinned header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/releases')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> Releases
          </button>
          <div className="flex items-center gap-2">
            <ReleaseStatusPill status={localStatus ?? release.status} />
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Entity header with release type stripe */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0"
            style={{ backgroundColor: RELEASE_TYPE_COLOR[release.type] ?? '#475467' }} />
          <div className="flex-1 px-6 py-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-ois-text-muted">{release.publicId}</span>
              <ReleaseTypeChip type={release.type} />
            </div>
            <h1 className="text-xl font-bold text-ois-text">
              {release.componentName} {release.version}
              {release.name && <span className="font-normal text-ois-text-muted text-base"> — {release.name}</span>}
            </h1>
            <div className="flex flex-wrap gap-1 mt-2">
              {release.tags.map(t => (
                <span key={t} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted mt-2">
              Release manager: <span className="font-medium text-ois-text">{release.releaseManagerName}</span> ·
              Planned {formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')} UTC
            </p>
          </div>
        </div>
      </div>

      {/* ── Three-column body ──────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar — 280px */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="At a glance">
            <dl className="divide-y divide-ois-border text-xs -mx-4 -mb-4">
              {[
                { label: 'Status', value: <ReleaseStatusPill status={localStatus ?? release.status} size="sm" /> },
                { label: 'Type', value: <ReleaseTypeChip type={release.type} size="sm" /> },
                { label: 'Version', value: <span className="font-mono font-bold text-ois-text">{release.version}</span> },
                { label: 'Component', value: <span className="text-ois-text">{release.componentName}</span> },
                { label: 'Manager', value: <span className="text-ois-text">{release.releaseManagerName}</span> },
                { label: 'Planned', value: <span className="text-ois-text-muted">{formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-ois-text-muted">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Pipeline">
            <StagesMiniStepper stages={release.stages} currentStageIndex={release.currentStageIndex} size="sm" />
          </SectionCard>

          <SectionCard title="Composition">
            <div className="space-y-1 text-xs text-ois-text-muted">
              <p>{release.composition.changes.length} change(s)</p>
              <p>{release.composition.problemsFixed.length} problem(s) fixed</p>
              <p>{release.composition.incidentsResolved.length} incident(s) resolved</p>
            </div>
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
                  <p className="text-sm text-ois-text leading-relaxed">{release.description}</p>
                </SectionCard>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Changes', value: release.composition.changes.length },
                    { label: 'Problems fixed', value: release.composition.problemsFixed.length },
                    { label: 'Incidents resolved', value: release.composition.incidentsResolved.length },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-ois-bg rounded-xl p-3 text-center border border-ois-border">
                      <p className="text-2xl font-bold text-ois-text">{value}</p>
                      <p className="text-xs text-ois-text-muted mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Composition */}
            {activeTab === 'composition' && (
              <div className="space-y-4">
                {release.composition.changes.length > 0 && (
                  <SectionCard title={`Changes (${release.composition.changes.length})`}>
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {release.composition.changes.map((c) => (
                        <Link key={c.publicId} to={`/changes/${c.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <div>
                            <span className="font-mono text-xs font-bold text-ois-primary">{c.publicId}</span>
                            <span className="text-sm text-ois-text ml-3">{c.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="capitalize text-xs text-ois-text-muted">{c.type}</span>
                            <span className="text-xs font-semibold capitalize" style={{ color: riskMeta[c.risk].color }}>{c.risk}</span>
                            <ExternalLink size={12} className="text-ois-text-subtle" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}
                {release.composition.problemsFixed.length > 0 && (
                  <SectionCard title="Problems Fixed">
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {release.composition.problemsFixed.map((p) => (
                        <Link key={p.publicId} to={`/problems/${p.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <span className="font-mono text-xs font-bold text-ois-primary">{p.publicId}</span>
                          <span className="text-sm text-ois-text">{p.title}</span>
                          <ExternalLink size={12} className="text-ois-text-subtle" />
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}
                {release.composition.incidentsResolved.length > 0 && (
                  <SectionCard title="Incidents Resolved">
                    <div className="divide-y divide-ois-border -mx-4 -mb-4">
                      {release.composition.incidentsResolved.map((inc) => (
                        <Link key={inc.publicId} to={`/incidents/${inc.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg transition-colors">
                          <span className="font-mono text-xs font-bold text-ois-primary">{inc.publicId}</span>
                          <span className="text-sm text-ois-text">{inc.title}</span>
                          <ExternalLink size={12} className="text-ois-text-subtle" />
                        </Link>
                      ))}
                    </div>
                  </SectionCard>
                )}
                {release.composition.prerequisites.length > 0 && (
                  <SectionCard title="Prerequisites">
                    <div className="space-y-2">
                      {release.composition.prerequisites.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className={cn('text-base', p.status === 'met' ? 'text-ois-success' : p.status === 'blocked' ? 'text-ois-danger' : 'text-ois-text-subtle')}>
                            {p.status === 'met' ? '✓' : p.status === 'blocked' ? '✗' : '⏱'}
                          </span>
                          <span className="text-ois-text">{p.reference}</span>
                          <Badge variant={p.status === 'met' ? 'success' : p.status === 'blocked' ? 'danger' : 'neutral'} className="text-[9px] ml-auto capitalize">
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </div>
            )}

            {/* Pipeline */}
            {activeTab === 'pipeline' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {localStages.map((stage, i) => (
                    <StageCard
                      key={stage.id}
                      stage={stage}
                      isCurrent={i === release.currentStageIndex}
                      onDeploy={stage.status === 'pending' ? () => setDeployIdx(i) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {activeTab === 'notes' && (
              <SectionCard title="Release Notes">
                <pre className="text-sm text-ois-text font-sans whitespace-pre-wrap leading-relaxed">{release.releaseNotes}</pre>
                {release.internalNotes && (
                  <div className="mt-4 pt-4 border-t border-ois-border">
                    <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-2">Internal Notes</p>
                    <p className="text-sm text-ois-text-muted">{release.internalNotes}</p>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Feature Flags */}
            {activeTab === 'flags' && (
              <SectionCard title={`Feature Flags (${release.featureFlags.length})`}>
                {release.featureFlags.length === 0 ? (
                  <p className="text-sm text-ois-text-subtle italic">No feature flags for this release.</p>
                ) : (
                  <div className="space-y-3">
                    {release.featureFlags.map((f) => (
                      <div key={f.key} className="p-3 bg-ois-bg rounded-lg border border-ois-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-ois-primary">{f.key}</span>
                          <Badge variant={f.enabledByDefault ? 'success' : 'neutral'} className="text-[10px]">
                            {f.enabledByDefault ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-ois-text">{f.description}</p>
                        {f.targeting && <p className="text-[10px] text-ois-text-subtle mt-1">Targeting: {f.targeting}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <SectionCard title="Audit History">
                <p className="text-sm text-ois-text-subtle italic">
                  No history available — Audit log tracking is coming soon.
                </p>
              </SectionCard>
            )}

          </div>
        </div>

        {/* Right sidebar — 280px */}
        <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
          <SectionCard title="Quick Actions">
            <div className="space-y-1.5">
              <button onClick={() => setPromoteModalOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left bg-ois-primary text-white hover:bg-ois-primary-hover">
                Promote to staging
              </button>
              <button disabled
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-left border border-ois-border text-ois-text opacity-40 cursor-not-allowed">
                Lock composition
              </button>
              <button disabled
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-left border border-ois-border text-ois-text opacity-40 cursor-not-allowed">
                Add change
              </button>
              <div className="pt-1 border-t border-ois-border">
                <button onClick={() => setCancelModalOpen(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-danger hover:bg-ois-danger-pale">
                  Cancel release
                </button>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>

      {/* Promote to staging modal */}
      <Modal isOpen={promoteModalOpen} onClose={() => setPromoteModalOpen(false)} title="Promote to staging?" size="sm">
        <div className="py-4 space-y-3">
          <p className="text-sm text-ois-text">
            This will move <span className="font-semibold">{release.publicId}</span> into the staging deployment queue and update the release status.
          </p>
          <p className="text-xs text-ois-text-muted">
            You will be redirected to the deployments queue after confirmation.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPromoteModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handlePromoteConfirm}>Confirm promote</Button>
          </div>
        </div>
      </Modal>

      {/* Cancel release modal */}
      <Modal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel this release?" size="sm">
        <div className="py-4 space-y-3">
          <p className="text-sm text-ois-text">
            This will mark <span className="font-semibold">{release.publicId}</span> as <span className="font-semibold text-ois-danger">cancelled</span>. This action cannot be undone.
          </p>
          <p className="text-xs text-ois-text-muted">
            All pending deployment stages will be stopped and the release will be closed.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)}>Go back</Button>
            <Button variant="destructive" size="sm" onClick={handleCancelConfirm}>
              Yes, cancel release
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deploy to environment modal */}
      <Modal
        isOpen={deployIdx !== null}
        onClose={() => setDeployIdx(null)}
        title={deployIdx !== null ? `Deploy to ${localStages[deployIdx]?.environment}?` : ''}
        size="sm"
      >
        <div className="py-4 space-y-3">
          <p className="text-sm text-ois-text">
            This will start a deployment to{' '}
            <span className="font-semibold capitalize">{deployIdx !== null ? localStages[deployIdx]?.environment : ''}</span>.
            The stage status will update to <span className="font-semibold">In Progress</span>.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeployIdx(null)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              if (deployIdx === null) return;
              setLocalStages(prev => prev.map((s, i) =>
                i === deployIdx
                  ? { ...s, status: 'in_progress' as const, startedAt: new Date().toISOString() }
                  : s
              ));
              showToast(`Deployment to ${localStages[deployIdx]?.environment} started`);
              setDeployIdx(null);
            }}>
              Confirm deploy
            </Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  );
};
