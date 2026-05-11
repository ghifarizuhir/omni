import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, ExternalLink, Tag, Check, Loader2, X, Clock, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
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

const StageCard: React.FC<{ stage: ReleaseStage; isCurrent: boolean }> = ({ stage, isCurrent }) => {
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
        <Button variant="outline" size="sm" className="mt-3 h-7 text-xs w-full opacity-60" disabled>
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
    <div className="flex gap-6 min-h-0">
      {/* Left sidebar */}
      <div className="w-60 shrink-0 space-y-3">
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">At a glance</h3>
          </div>
          <CardBody className="p-0">
            <dl className="divide-y divide-ois-border text-xs">
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
          </CardBody>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Pipeline</h3>
          </div>
          <CardBody>
            <StagesMiniStepper stages={release.stages} currentStageIndex={release.currentStageIndex} size="sm" />
          </CardBody>
        </Card>

        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Composition</h3>
          </div>
          <CardBody>
            <div className="space-y-1 text-xs text-ois-text-muted">
              <p>{release.composition.changes.length} change(s)</p>
              <p>{release.composition.problemsFixed.length} problem(s) fixed</p>
              <p>{release.composition.incidentsResolved.length} incident(s) resolved</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/releases" className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text">
            <ArrowLeft size={16} /> Releases
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <MoreVertical size={14} /> Actions
          </Button>
        </div>

        {/* Header */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-ois-primary">{release.publicId}</span>
                  <ReleaseTypeChip type={release.type} />
                </div>
                <h1 className="text-xl font-bold text-ois-text">
                  {release.componentName} {release.version}
                  {release.name && <span className="font-normal text-ois-text-muted text-base"> — {release.name}</span>}
                </h1>
              </div>
              <ReleaseStatusPill status={localStatus ?? release.status} />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {release.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-ois-bg border border-ois-border text-[10px] font-medium text-ois-text-muted px-2 py-0.5 rounded-full">
                  <Tag size={9} />{t}
                </span>
              ))}
            </div>
            <p className="text-xs text-ois-text-muted">
              Release manager: <span className="font-medium text-ois-text">{release.releaseManagerName}</span> ·
              Planned {formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')} UTC
            </p>
          </CardBody>
        </Card>

        <Tabs tabs={tabs} activeTabId={activeTab} onChange={setActiveTab}>
          {/* Overview */}
          <div className="space-y-4">
            <Card>
              <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
                <h3 className="text-sm font-bold text-ois-text">Description</h3>
              </div>
              <CardBody>
                <p className="text-sm text-ois-text leading-relaxed">{release.description}</p>
              </CardBody>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Changes', value: release.composition.changes.length },
                { label: 'Problems fixed', value: release.composition.problemsFixed.length },
                { label: 'Incidents resolved', value: release.composition.incidentsResolved.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-ois-bg rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-ois-text">{value}</p>
                  <p className="text-xs text-ois-text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Composition */}
          <div className="space-y-4">
            {release.composition.changes.length > 0 && (
              <Card>
                <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
                  <h3 className="text-sm font-bold text-ois-text">Changes ({release.composition.changes.length})</h3>
                </div>
                <CardBody className="p-0">
                  {release.composition.changes.map((c) => (
                    <Link key={c.publicId} to={`/changes/${c.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg border-b border-ois-border last:border-0 transition-colors">
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
                </CardBody>
              </Card>
            )}
            {release.composition.problemsFixed.length > 0 && (
              <Card>
                <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
                  <h3 className="text-sm font-bold text-ois-text">Problems Fixed</h3>
                </div>
                <CardBody className="p-0">
                  {release.composition.problemsFixed.map((p) => (
                    <Link key={p.publicId} to={`/problems/${p.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg border-b border-ois-border last:border-0 transition-colors">
                      <span className="font-mono text-xs font-bold text-ois-primary">{p.publicId}</span>
                      <span className="text-sm text-ois-text">{p.title}</span>
                      <ExternalLink size={12} className="text-ois-text-subtle" />
                    </Link>
                  ))}
                </CardBody>
              </Card>
            )}
            {release.composition.incidentsResolved.length > 0 && (
              <Card>
                <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
                  <h3 className="text-sm font-bold text-ois-text">Incidents Resolved</h3>
                </div>
                <CardBody className="p-0">
                  {release.composition.incidentsResolved.map((inc) => (
                    <Link key={inc.publicId} to={`/incidents/${inc.publicId}`} className="flex items-center justify-between px-4 py-3 hover:bg-ois-bg border-b border-ois-border last:border-0 transition-colors">
                      <span className="font-mono text-xs font-bold text-ois-primary">{inc.publicId}</span>
                      <span className="text-sm text-ois-text">{inc.title}</span>
                      <ExternalLink size={12} className="text-ois-text-subtle" />
                    </Link>
                  ))}
                </CardBody>
              </Card>
            )}
            {release.composition.prerequisites.length > 0 && (
              <Card>
                <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
                  <h3 className="text-sm font-bold text-ois-text">Prerequisites</h3>
                </div>
                <CardBody className="space-y-2">
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
                </CardBody>
              </Card>
            )}
          </div>

          {/* Pipeline */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {release.stages.map((stage, i) => (
                <StageCard key={stage.id} stage={stage} isCurrent={i === release.currentStageIndex} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <Card>
            <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
              <h3 className="text-sm font-bold text-ois-text">Release Notes</h3>
            </div>
            <CardBody>
              <pre className="text-sm text-ois-text font-sans whitespace-pre-wrap leading-relaxed">{release.releaseNotes}</pre>
              {release.internalNotes && (
                <div className="mt-4 pt-4 border-t border-ois-border">
                  <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2">Internal Notes</p>
                  <p className="text-sm text-ois-text-muted">{release.internalNotes}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Feature flags */}
          <Card>
            <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
              <h3 className="text-sm font-bold text-ois-text">Feature Flags ({release.featureFlags.length})</h3>
            </div>
            <CardBody>
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
            </CardBody>
          </Card>

          {/* History */}
          <Card>
            <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
              <h3 className="text-sm font-bold text-ois-text">Audit History</h3>
            </div>
            <CardBody>
              <p className="text-sm text-ois-text-subtle italic">
                No history available — Audit log tracking is coming soon.
              </p>
            </CardBody>
          </Card>
        </Tabs>
      </div>

      {/* Right sidebar */}
      <div className="w-52 shrink-0 space-y-3">
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Quick Actions</h3>
          </div>
          <CardBody className="p-0">
            <button className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-ois-bg transition-colors border-b border-ois-border text-ois-text">
              Lock composition
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-ois-bg transition-colors border-b border-ois-border text-ois-text"
              onClick={() => setPromoteModalOpen(true)}
            >
              Promote to staging
            </button>
            <button
              className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-ois-bg transition-colors border-b border-ois-border text-ois-danger"
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel release
            </button>
            <button className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-ois-bg transition-colors text-ois-text">
              Add change
            </button>
          </CardBody>
        </Card>
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

      {toast && <Toast message={toast.message} variant={toast.variant} />}
    </div>
  );
};
