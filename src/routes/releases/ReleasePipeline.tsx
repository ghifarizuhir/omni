import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Loader2, RotateCcw, Circle, MinusCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { mockReleases } from '../../mocks';
import { ReleaseStatusPill } from '../../components/releases/ReleaseStatusPill';
import { ReleaseTypeChip } from '../../components/releases/ReleaseTypeChip';
import { stageStatusMeta } from '../../lib/constants';
import { Release, ReleaseStage } from '../../types/release';
import { Environment } from '../../types/ci';
import { formatRelative } from '../../lib/format';

const ENVS: Environment[] = ['development', 'staging', 'production'];

const StageCell: React.FC<{
  stage: ReleaseStage | undefined;
  onClick: () => void;
}> = ({ stage, onClick }) => {
  if (!stage) {
    return <div className="rounded-lg border border-dashed border-ois-border p-3 text-[10px] text-ois-text-subtle text-center">—</div>;
  }

  const meta = stageStatusMeta[stage.status];

  const icons = {
    success: <Check size={14} className="text-emerald-600" />,
    in_progress: <Loader2 size={14} className="text-ois-primary animate-spin" />,
    failed: <X size={14} className="text-ois-danger" />,
    rolled_back: <RotateCcw size={14} className="text-orange-500" />,
    pending: <Circle size={14} className="text-ois-text-subtle" />,
    skipped: <MinusCircle size={14} className="text-ois-text-subtle" />,
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-2.5 text-left transition-all hover:shadow-sm',
        stage.status === 'success' ? 'border-emerald-200 bg-emerald-50/50' :
        stage.status === 'in_progress' ? 'border-ois-primary/40 bg-blue-50/50 ring-1 ring-ois-primary/20' :
        stage.status === 'failed' || stage.status === 'rolled_back' ? 'border-red-200 bg-red-50/40' :
        'border-ois-border bg-ois-bg/50',
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icons[stage.status]}
        <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      {stage.testsPassed !== undefined && stage.testsTotal !== undefined && (
        <p className="text-[10px] text-ois-text-subtle">{stage.testsPassed}/{stage.testsTotal} tests</p>
      )}
      {stage.startedAt && !stage.completedAt && (
        <p className="text-[10px] text-ois-text-subtle">{formatRelative(stage.startedAt)}</p>
      )}
      {stage.completedAt && (
        <p className="text-[10px] text-ois-text-subtle">{formatRelative(stage.completedAt)}</p>
      )}
      {stage.approvalRequired && !stage.approvedAt && stage.status === 'pending' && (
        <p className="text-[10px] text-amber-600 font-semibold mt-1">⚠ Approval gate</p>
      )}
    </button>
  );
};

// Active releases go first, then released
const activeStatuses = ['planning', 'locked', 'in_validation', 'ready', 'deploying', 'partially_released'];
const SORTED_RELEASES = [
  ...mockReleases.filter((r) => activeStatuses.includes(r.status)),
  ...mockReleases.filter((r) => r.status === 'released'),
  ...mockReleases.filter((r) => !activeStatuses.includes(r.status) && r.status !== 'released'),
];

export const ReleasePipeline: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'released' | 'rolled_back'>('all');

  const displayed = SORTED_RELEASES.filter((r) => {
    if (filter === 'active') return activeStatuses.includes(r.status);
    if (filter === 'released') return r.status === 'released';
    if (filter === 'rolled_back') return r.status === 'rolled_back';
    return true;
  });

  const activeCount = mockReleases.filter((r) => activeStatuses.includes(r.status)).length;
  const readyCount = mockReleases.filter((r) => r.status === 'ready').length;

  return (
    <div className="flex gap-6 min-h-0">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ois-text">Release Pipeline</h1>
            <p className="text-sm text-ois-text-muted mt-0.5">
              {activeCount} active releases ·{' '}
              {readyCount > 0 && <span className="text-ois-primary font-semibold">{readyCount} awaiting production approval</span>}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {([
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active only' },
            { value: 'released', label: 'Released' },
            { value: 'rolled_back', label: 'Rolled back' },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                filter === value
                  ? 'bg-ois-primary text-white border-ois-primary'
                  : 'bg-white border-ois-border text-ois-text-muted hover:text-ois-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pipeline grid */}
        <Card className="overflow-hidden">
          {/* Column headers */}
          <div className="grid border-b border-ois-border bg-ois-bg" style={{ gridTemplateColumns: '220px 1fr 1fr 1fr' }}>
            <div className="px-4 py-3 text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Release</div>
            {ENVS.map((env) => (
              <div key={env} className="px-4 py-3 text-[11px] font-bold text-ois-text-muted uppercase tracking-wider border-l border-ois-border capitalize">
                {env}
              </div>
            ))}
          </div>

          {/* Separator between active and released */}
          {displayed.some((r) => activeStatuses.includes(r.status)) &&
           displayed.some((r) => r.status === 'released') && (
            <div className="grid" style={{ gridTemplateColumns: '220px 1fr 1fr 1fr' }}>
              <div className="col-span-4 px-4 py-2 bg-ois-bg border-b border-ois-border">
                <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Active</span>
              </div>
            </div>
          )}

          <div className="divide-y divide-ois-border">
            {displayed.map((release, idx) => {
              const isFirstReleased = release.status === 'released' &&
                idx > 0 && SORTED_RELEASES[idx - 1].status !== 'released';

              return (
                <React.Fragment key={release.id}>
                  {isFirstReleased && (
                    <div className="px-4 py-2 bg-ois-bg">
                      <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider">Released within last 14 days</span>
                    </div>
                  )}
                  <div className="grid hover:bg-ois-bg/40 transition-colors" style={{ gridTemplateColumns: '220px 1fr 1fr 1fr' }}>
                    {/* Release info */}
                    <div
                      className="px-4 py-3 cursor-pointer border-r border-ois-border"
                      onClick={() => navigate(`/releases/${release.publicId}`)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <ReleaseTypeChip type={release.type} size="sm" />
                        <ReleaseStatusPill status={release.status} size="sm" />
                      </div>
                      <p className="text-xs font-bold text-ois-text">{release.componentName}</p>
                      <p className="text-[11px] font-mono text-ois-primary">{release.version}</p>
                      <p className="text-[10px] text-ois-text-subtle font-mono">{release.publicId}</p>
                    </div>

                    {/* Stage cells */}
                    {ENVS.map((env) => {
                      const stage = release.stages.find((s) => s.environment === env);
                      return (
                        <div key={env} className="px-3 py-3 border-l border-ois-border">
                          <StageCell
                            stage={stage}
                            onClick={() => navigate(`/releases/${release.publicId}`)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Right sidebar */}
      <div className="w-56 shrink-0 space-y-3">
        <Card>
          <div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
            <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={11} /> Pipeline Health
            </h3>
          </div>
          <CardBody>
            <dl className="space-y-2 text-xs">
              {[
                { label: 'Success rate (30d)', value: '87%' },
                { label: 'Avg dev → prod', value: '4.2 days' },
                { label: 'Rollbacks (30d)', value: '2' },
                { label: 'Failed validations', value: '1' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-ois-text-muted">{label}</dt>
                  <dd className="font-bold text-ois-text">{value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {readyCount > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-ois-border bg-amber-50">
              <h3 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={10} /> Production Approval
              </h3>
            </div>
            <CardBody>
              <p className="text-xs text-ois-text-muted mb-2">Awaiting your approval:</p>
              {mockReleases.filter((r) => r.status === 'ready').map((r) => (
                <div key={r.id} className="mb-3">
                  <p className="text-xs font-bold text-ois-text">{r.componentName} {r.version}</p>
                  <p className="text-[10px] text-ois-text-subtle mb-2">All tests passed.</p>
                  <button
                    onClick={() => navigate(`/releases/${r.publicId}`)}
                    className="text-xs text-ois-primary font-semibold hover:underline"
                  >
                    Review →
                  </button>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
