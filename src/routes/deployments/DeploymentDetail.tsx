import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, CheckCircle2, XCircle, RotateCcw, RefreshCw, Package, Layers } from 'lucide-react';
import { DeploymentHero } from '../../components/deployments/DeploymentDetail/DeploymentHero';
import { DeploymentStages } from '../../components/deployments/DeploymentDetail/DeploymentStages';
import { LogPanel } from '../../components/deployments/DeploymentDetail/LogPanel';
import { RollbackModal } from '../../components/deployments/DeploymentDetail/RollbackModal';
import { Tabs } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { deploymentsService, testingService, useResource } from '../../services';
import { Deployment } from '../../types/deployment';
import { useCan, deploymentResource } from '@/src/lib/rbac';
import { formatDate, formatRelative } from '../../lib/format';
import { cn } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';

const BASE_TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'manifest',   label: 'Manifest' },
  { id: 'linked',     label: 'Linked Items' },
  { id: 'incidents',  label: 'Triggered Incidents' },
  { id: 'history',    label: 'History' },
];

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-ois-border last:border-0">
      <td className="py-3 pr-6 text-xs font-semibold text-ois-text-subtle uppercase tracking-widest whitespace-nowrap w-40 align-top">
        {label}
      </td>
      <td className="py-3 text-sm text-ois-text break-all align-top">{children}</td>
    </tr>
  );
}

function LinkedCard({
  publicId,
  label,
  href,
  icon,
}: {
  publicId: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between rounded-xl border border-ois-border px-5 py-4 bg-white hover:border-ois-primary hover:bg-ois-primary-pale transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-ois-primary opacity-70 group-hover:opacity-100">{icon}</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ois-text-subtle">{label}</p>
          <p className="font-mono text-sm font-bold text-ois-text mt-0.5">{publicId}</p>
        </div>
      </div>
      <span className="text-ois-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
        View →
      </span>
    </Link>
  );
}

function HistoryItem({ time, label, detail, color }: { time: string; label: string; detail?: string; color?: string }) {
  return (
    <div className="flex gap-4 relative">
      <div className="flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full mt-0.5 shrink-0 border-2 border-white shadow', color ?? 'bg-ois-primary')} />
        <div className="w-px flex-1 bg-ois-border mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-[11px] text-ois-text-subtle font-mono">{time}</p>
        <p className="text-sm font-semibold text-ois-text mt-0.5">{label}</p>
        {detail && <p className="text-xs text-ois-text-muted mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function StickyActionBar({
  deployment,
  onRollback,
  onRedeploy,
  canDeploy,
}: {
  deployment: Deployment | undefined;
  onRollback: () => void;
  onRedeploy: () => void;
  canDeploy: boolean;
}) {
  if (!deployment) return null;
  if (!canDeploy) {
    return (
      <div className="sticky bottom-0 z-20 bg-white border-t border-ois-border px-6 py-3 flex items-center">
        <span className="text-xs text-ois-text-subtle italic">
          Read-only — only the owning team or a Change Manager can rollback or re-deploy.
        </span>
      </div>
    );
  }
  const { status, stages, currentStageIndex, rollback } = deployment;

  const completedCount = stages.filter((s) => s.status === 'success').length;
  const pct = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  // Estimate ETA for running (rough: assume each remaining stage takes similar duration)
  const avgDuration = (() => {
    const done = stages.filter((s) => s.durationSec != null);
    if (done.length === 0) return 60;
    return done.reduce((acc, s) => acc + (s.durationSec ?? 0), 0) / done.length;
  })();
  const remaining = stages.length - currentStageIndex - 1;
  const etaSec = Math.round(remaining * avgDuration);
  const etaStr = etaSec > 60 ? `~${Math.round(etaSec / 60)} min` : `~${etaSec}s`;

  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-ois-border px-6 py-3 flex items-center gap-4 flex-wrap">
      {status === 'running' && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-ois-info animate-pulse" />
            <span className="text-sm font-semibold text-ois-text-muted">Running ({pct}%)</span>
          </div>
          <span className="text-xs text-ois-text-subtle">ETA {etaStr}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={onRollback}>
              <RotateCcw size={13} className="mr-1" /> Rollback
            </Button>
          </div>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="flex items-center gap-2 text-ois-sev-p4">
            <CheckCircle2 size={16} />
            <span className="text-sm font-semibold">Deployment Succeeded</span>
          </div>
          <span className="text-xs text-ois-text-subtle">
            Health: <span className="font-semibold capitalize text-ois-text-muted">{deployment.postDeployHealth}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onRedeploy}>
              <RefreshCw size={13} className="mr-1" /> Re-deploy
            </Button>
            <Button size="sm" variant="destructive" onClick={onRollback}>
              <RotateCcw size={13} className="mr-1" /> Rollback
            </Button>
          </div>
        </>
      )}
      {status === 'failed' && (
        <>
          <div className="flex items-center gap-2 text-ois-sev-p1">
            <XCircle size={16} />
            <span className="text-sm font-semibold">Deployment Failed</span>
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="secondary" onClick={onRedeploy}>
              <RefreshCw size={13} className="mr-1" /> Re-deploy
            </Button>
          </div>
        </>
      )}
      {status === 'rolled_back' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-ois-sev-p2">
            <RotateCcw size={16} />
            <span className="text-sm font-semibold">Rolled Back</span>
          </div>
          {rollback?.reason && (
            <span className="text-xs text-ois-text-muted truncate max-w-xs">
              Reason: {rollback.reason}
            </span>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="secondary" onClick={onRedeploy}>
              <RefreshCw size={13} className="mr-1" /> Re-deploy
            </Button>
          </div>
        </div>
      )}
      {(status === 'pending' || status === 'cancelled' || status === 'rolling_back') && (
        <div className="flex items-center gap-2 text-ois-text-muted">
          <span className="text-sm font-semibold capitalize">{status.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
}

export const DeploymentDetail: React.FC = () => {
  const { deploymentId } = useParams<{ deploymentId: string }>();
  const navigate = useNavigate();
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [redeployOpen, setRedeployOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const { data: deployments, loading } = useResource(() => deploymentsService.list(), []);
  const deployment = (deployments ?? []).find(d => d.id === deploymentId || d.publicId === deploymentId);
  const canDeploy = useCan('release', 'implement', {
    resource: deployment ? deploymentResource(deployment) : undefined,
  });
  const { data: logsData } = useResource(
    () => (deployment ? deploymentsService.logs(deployment.id) : Promise.resolve([])),
    [deployment?.id],
  );
  const logs = logsData ?? [];
  const { data: testRunsData } = useResource(() => testingService.runs(), []);
  const linkedTestRun = (testRunsData ?? []).find(
    (r) => r.linkedDeploymentPublicId === deployment?.publicId,
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-sm text-ois-text-muted">Loading…</div>;
  }

  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-ois-text font-semibold text-lg">Deployment not found</p>
        <Link to="/deployments" className="text-sm text-ois-primary hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to deployments
        </Link>
      </div>
    );
  }

  const effectiveDeployment = localStatus
    ? { ...deployment, status: localStatus as typeof deployment.status }
    : deployment;

  // ── History timeline events ──────────────────────────────────────────────
  const historyEvents: { time: string; label: string; detail?: string; color?: string }[] = [];
  if (deployment.createdAt) {
    historyEvents.push({
      time: formatDate(deployment.createdAt),
      label: 'Deployment triggered',
      detail: `by ${deployment.triggeredByName}`,
      color: 'bg-ois-primary',
    });
  }
  deployment.stages.forEach((stage) => {
    if (stage.completedAt && stage.status !== 'pending' && stage.status !== 'skipped') {
      historyEvents.push({
        time: formatDate(stage.completedAt),
        label: `Stage "${stage.name}" ${stage.status}`,
        detail: stage.durationSec != null ? `${stage.durationSec}s` : undefined,
        color:
          stage.status === 'success'
            ? 'bg-ois-success'
            : stage.status === 'failed'
            ? 'bg-ois-danger'
            : 'bg-ois-text-subtle',
      });
    }
  });
  if (deployment.rollback) {
    historyEvents.push({
      time: formatDate(deployment.rollback.initiatedAt),
      label: 'Rollback initiated',
      detail: `by ${deployment.rollback.initiatedBy} — ${deployment.rollback.reason}`,
      color: 'bg-ois-warning',
    });
    if (deployment.rollback.completedAt) {
      historyEvents.push({
        time: formatDate(deployment.rollback.completedAt),
        label: 'Rollback completed',
        color: 'bg-ois-warning',
      });
    }
  }
  historyEvents.sort((a, b) => a.time.localeCompare(b.time));

  const handleRollbackConfirm = (_reason: string) => {
    setRollbackOpen(false);
  };

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* ── Pinned header ────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">
        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <button
            onClick={() => navigate('/deployments')}
            className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors"
          >
            <ArrowLeft size={15} /> Deployments
          </button>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setActionsOpen((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {actionsOpen && (
                <div
                  className="absolute right-0 top-full mt-1 bg-white border border-ois-border rounded-xl shadow-lg w-48 py-1 z-30"
                  onMouseLeave={() => setActionsOpen(false)}
                >
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-ois-text hover:bg-ois-bg transition-colors"
                    onClick={() => { setActionsOpen(false); }}
                  >
                    Copy deployment ID
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-ois-text hover:bg-ois-bg transition-colors"
                    onClick={() => { setActionsOpen(false); }}
                  >
                    Export logs
                  </button>
                  {(deployment.status === 'running' || deployment.status === 'success') && (
                    <button
                      className="w-full text-left px-4 py-2.5 text-sm text-ois-sev-p1 hover:bg-ois-danger-pale transition-colors"
                      onClick={() => { setActionsOpen(false); setRollbackOpen(true); }}
                    >
                      Rollback
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* DeploymentHero — the entity header */}
        <DeploymentHero
          deployment={effectiveDeployment}
          onRollback={() => setRollbackOpen(true)}
          onRedeploy={() => setRedeployOpen(true)}
        />
      </div>

      {/* ── Body — scrollable content + sticky action bar ────────────── */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-6 py-6 flex flex-col gap-6">
            {/* ── 2-column main ─────────────────────────────────────────────── */}
            <div className="flex gap-6">
              {/* Left 60% — stages */}
              <div className="flex-[3] min-w-0">
                <div className="bg-white rounded-xl border border-ois-border p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-ois-text-subtle mb-4">
                    Pipeline Stages
                  </p>
                  <DeploymentStages
                    stages={deployment.stages}
                    currentStageIndex={deployment.currentStageIndex}
                  />
                </div>
              </div>

              {/* Right 40% — logs */}
              <div className="flex-[2] min-w-0">
                <LogPanel logs={logs} deploymentId={deployment.id} />
              </div>
            </div>

            {/* ── Full-width tabs ───────────────────────────────────────────── */}
            {(() => {
              // Manifest tab is only shown if the deployment has actual YAML content.
              // manifestRef is just a file path — not renderable YAML — so exclude the tab
              // unless a future field (e.g. manifestYaml) is present on the deployment.
              const manifestYaml = deployment.manifestYaml;
              const showManifest = typeof deployment.manifestYaml === 'string';
              const tabs = BASE_TABS.filter(t => t.id !== 'manifest' || showManifest);

              return (
            <div className="bg-white rounded-xl border border-ois-border p-6">
              <Tabs tabs={tabs}>
                {/* ── Overview ── */}
                <div>
                  <table className="w-full border-collapse">
                    <tbody>
                      <MetaRow label="Component">
                        <span className="font-semibold">{deployment.componentName}</span>
                      </MetaRow>
                      <MetaRow label="Version">
                        <span className="font-mono text-xs bg-ois-surface-muted text-ois-text-muted rounded px-2 py-0.5">
                          {deployment.artifactRef.includes(':')
                            ? deployment.artifactRef.split(':').pop()
                            : deployment.artifactRef}
                        </span>
                      </MetaRow>
                      <MetaRow label="Artifact">
                        <span className="font-mono text-xs text-ois-text-muted">{deployment.artifactRef}</span>
                      </MetaRow>
                      <MetaRow label="Commit">
                        <span className="font-mono text-xs bg-ois-surface-muted text-ois-text-muted rounded px-1.5 py-0.5 mr-2">
                          {deployment.commitSha}
                        </span>
                        {deployment.commitMessage && (
                          <span className="text-xs text-ois-text-muted">{deployment.commitMessage}</span>
                        )}
                      </MetaRow>
                      <MetaRow label="Branch">
                        <span className="font-mono text-xs text-ois-text-muted">{deployment.branch}</span>
                      </MetaRow>
                      {deployment.targetCIIds.length > 0 && (
                        <MetaRow label="Target CIs">
                          <div className="flex flex-wrap gap-1.5">
                            {deployment.targetCIIds.map((ci) => (
                              <Link
                                key={ci}
                                to={`/cmdb/${ci}`}
                                className="font-mono text-xs bg-ois-primary-pale text-ois-primary rounded px-2 py-0.5 hover:bg-ois-primary hover:text-white transition-colors"
                              >
                                {ci}
                              </Link>
                            ))}
                          </div>
                        </MetaRow>
                      )}
                      {deployment.pipelineUrl && (
                        <MetaRow label="Pipeline Run">
                          <a
                            href={`https://${deployment.pipelineUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-ois-primary hover:underline"
                          >
                            {deployment.pipelineRunId} →
                          </a>
                        </MetaRow>
                      )}
                      {deployment.manifestRef && (
                        <MetaRow label="Manifest">
                          <span className="font-mono text-xs text-ois-text-muted">{deployment.manifestRef}</span>
                        </MetaRow>
                      )}
                      {deployment.tags.length > 0 && (
                        <MetaRow label="Tags">
                          <div className="flex flex-wrap gap-1.5">
                            {deployment.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-ois-surface-muted text-ois-text-muted rounded-full px-2.5 py-0.5 font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </MetaRow>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Manifest (only rendered when showManifest is true) ── */}
                {showManifest && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-ois-text-subtle">
                      Kubernetes Manifest
                    </p>
                    {deployment.manifestRef && (
                      <span className="font-mono text-[11px] text-ois-text-subtle">{deployment.manifestRef}</span>
                    )}
                  </div>
                  <pre className="bg-[#0D1117] text-[#C9D1D9] rounded-xl p-5 text-xs font-mono leading-relaxed overflow-x-auto border border-[#30363D] whitespace-pre">
                    {manifestYaml}
                  </pre>
                </div>
                )}

                {/* ── Linked Items ── */}
                <div className="flex flex-col gap-4">
                  {deployment.linkedReleasePublicId && (
                    <LinkedCard
                      publicId={deployment.linkedReleasePublicId}
                      label="Release"
                      href={`/releases/${deployment.linkedReleaseId ?? deployment.linkedReleasePublicId}`}
                      icon={<Layers size={18} />}
                    />
                  )}
                  {deployment.linkedChangePublicId && (
                    <LinkedCard
                      publicId={deployment.linkedChangePublicId}
                      label="Change Request"
                      href={`/changes/${deployment.linkedChangeId ?? deployment.linkedChangePublicId}`}
                      icon={<Package size={18} />}
                    />
                  )}
                  {linkedTestRun && (
                    <div className="rounded-xl border border-ois-border px-5 py-4 bg-white">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-ois-text-subtle mb-1">
                        Test Run
                      </p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-mono text-sm font-bold text-ois-text">{linkedTestRun.publicId}</p>
                          <p className="text-xs text-ois-text-muted mt-0.5">{linkedTestRun.testPlanName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 rounded-full',
                              linkedTestRun.status === 'passed'
                                ? 'bg-ois-success-pale text-ois-sev-p4'
                                : linkedTestRun.status === 'failed'
                                ? 'bg-ois-danger-pale text-ois-sev-p1'
                                : linkedTestRun.status === 'running'
                                ? 'bg-ois-primary-pale text-ois-primary'
                                : 'bg-ois-surface-muted text-ois-text-muted',
                            )}
                          >
                            {linkedTestRun.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-ois-text-muted">
                            {linkedTestRun.passedCount}/{linkedTestRun.totalCases} passed
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!deployment.linkedReleasePublicId && !deployment.linkedChangePublicId && !linkedTestRun && (
                    <div className="py-10 text-center text-sm text-ois-text-subtle">
                      No linked items for this deployment.
                    </div>
                  )}
                </div>

                {/* ── Triggered Incidents ── */}
                <div>
                  {deployment.triggeredIncidentIds.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-2 text-center">
                      <CheckCircle2 size={32} className="text-ois-success opacity-70" />
                      <p className="text-sm font-semibold text-ois-text">No incidents triggered</p>
                      <p className="text-xs text-ois-text-subtle">This deployment has not triggered any incidents.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {deployment.triggeredIncidentIds.map((incId) => (
                        <Link
                          key={incId}
                          to={`/incidents/${incId}`}
                          className="font-mono text-sm font-bold text-ois-sev-p1 bg-ois-danger-pale border border-ois-danger/20 rounded-lg px-3 py-2 hover:bg-ois-danger hover:text-white transition-colors"
                        >
                          {incId} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── History ── */}
                <div>
                  {historyEvents.length === 0 ? (
                    <p className="text-sm text-ois-text-subtle py-8 text-center">No history events available.</p>
                  ) : (
                    <div className="pt-2">
                      {historyEvents.map((evt, i) => (
                        <React.Fragment key={i}>
                          <HistoryItem time={evt.time} label={evt.label} detail={evt.detail} color={evt.color} />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </Tabs>
            </div>
              );
            })()}
          </div>
        </div>

        {/* ── Sticky bottom action bar ─────────────────────────────────────── */}
        <StickyActionBar
          deployment={effectiveDeployment}
          onRollback={() => setRollbackOpen(true)}
          onRedeploy={() => setRedeployOpen(true)}
          canDeploy={canDeploy}
        />
      </div>

      {/* ── Redeploy confirm modal ───────────────────────────────────────── */}
      <Modal
        isOpen={redeployOpen}
        onClose={() => setRedeployOpen(false)}
        title="Re-deploy this build?"
        size="sm"
      >
        <div className="py-4 space-y-3">
          <p className="text-sm text-ois-text">
            This will re-run the deployment pipeline for{' '}
            <span className="font-semibold font-mono">{deployment.artifactRef}</span>{' '}
            to <span className="font-semibold capitalize">{deployment.environment}</span>.
          </p>
          <p className="text-xs text-ois-text-muted">
            Stage progress will reset and deployment status will update to Running.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRedeployOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => {
              setLocalStatus('running');
              setRedeployOpen(false);
            }}>
              Confirm re-deploy
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Rollback modal ───────────────────────────────────────────────── */}
      <RollbackModal
        deployment={deployment}
        isOpen={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        onConfirm={handleRollbackConfirm}
      />
    </div>
  );
};
