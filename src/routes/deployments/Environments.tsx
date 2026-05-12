import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { EnvironmentCard } from '../../components/deployments/EnvironmentCard';
import { RecentDeploymentsTable } from '../../components/deployments/RecentDeploymentsTable';
import { mockEnvironments } from '../../mocks/environments';
import { mockDeployments } from '../../mocks/deployments';
import { FilterDropdown } from '../../components/ui/FilterDropdown';

// ─── Calculation helpers ──────────────────────────────────────────────────────

const last7d = mockDeployments.filter(d => {
  const cutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  return (d.startedAt ?? '') >= cutoff || (d.completedAt ?? '') >= cutoff;
});

const successRate7d =
  last7d.length > 0
    ? last7d.filter(d => d.status === 'success').length / last7d.length
    : 1;

const rollbacks7d = last7d.filter(d => d.status === 'rolled_back').length;

const activeFailures = mockDeployments.filter(d => d.status === 'failed').length;

const avgDurationSec =
  last7d.filter(d => d.durationSec != null).length > 0
    ? last7d
        .filter(d => d.durationSec != null)
        .reduce((sum, d) => sum + (d.durationSec ?? 0), 0) /
      last7d.filter(d => d.durationSec != null).length
    : 0;

function formatDuration(sec: number): string {
  if (sec === 0) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

// ─── Derived header counts ────────────────────────────────────────────────────

const envCount = mockEnvironments.length;
const inProgressCount = mockDeployments.filter(d => d.status === 'running').length;
const prodEnv = mockEnvironments.find(e => e.name === 'production');

const prodHealthLabel: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
};

const prodHealthColor: Record<string, string> = {
  healthy: '#12B76A',
  degraded: '#F79009',
  down: '#F04438',
};

// ─── Upcoming / pending deployments ──────────────────────────────────────────

const upcomingDeployments = mockDeployments
  .filter(d => d.status === 'pending' && d.scheduledFor)
  .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''));

function formatScheduledDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }) + ' UTC';
}

function versionFromArtifact(artifactRef: string): string {
  return artifactRef.includes(':') ? artifactRef.split(':').pop() ?? artifactRef : artifactRef;
}

// ─── Freeze windows ───────────────────────────────────────────────────────────

const freezeEnvs = mockEnvironments.filter(e => e.freezeWindowActive);

// ─── Recent deployments sorted desc ──────────────────────────────────────────

const recentDeployments = [...last7d].sort((a, b) =>
  (b.startedAt ?? '').localeCompare(a.startedAt ?? ''),
);

// ─── Component ────────────────────────────────────────────────────────────────

export const Environments: React.FC = () => {
  const prodHealth = prodEnv?.health ?? 'healthy';
  const [envTableFilter, setEnvTableFilter] = useState('');
  const [statusTableFilter, setStatusTableFilter] = useState('');

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Environments</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-ois-text-muted">
            <span>{envCount} environments</span>
            <span className="text-ois-border-strong">·</span>
            <span>{inProgressCount} deployment{inProgressCount !== 1 ? 's' : ''} in progress</span>
            {prodEnv && (
              <>
                <span className="text-ois-border-strong">·</span>
                <span className="flex items-center gap-1.5">
                  Production:
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: prodHealthColor[prodHealth] }}
                  />
                  <span className="font-semibold" style={{ color: prodHealthColor[prodHealth] }}>
                    {prodHealthLabel[prodHealth]}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
        <span className="text-sm text-ois-text-muted">Last 7d</span>
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Left: main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Environment cards grid */}
          <div className="grid grid-cols-3 gap-4">
            {mockEnvironments.map(env => (
              <EnvironmentCard key={env.id} env={env} deployments={mockDeployments} />
            ))}
          </div>

          {/* Recent deployments table */}
          <Card>
            <div className="px-5 pt-4 pb-3 border-b border-ois-border">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-semibold text-[#344054] uppercase tracking-wider">
                  Recent Deployments (Last 7 Days)
                </h2>
                <div className="flex items-center gap-3">
                  <FilterDropdown
                    value={envTableFilter}
                    onChange={v => setEnvTableFilter(v)}
                    options={[
                      { value: '', label: 'All envs' },
                      ...mockEnvironments.map(e => ({ value: e.name, label: e.displayName })),
                    ]}
                    placeholder="All envs"
                  />
                  <FilterDropdown
                    value={statusTableFilter}
                    onChange={v => setStatusTableFilter(v)}
                    options={[
                      { value: '', label: 'All statuses' },
                      { value: 'success', label: 'success' },
                      { value: 'failed', label: 'failed' },
                      { value: 'running', label: 'running' },
                      { value: 'pending', label: 'pending' },
                      { value: 'rolled_back', label: 'rolled_back' },
                      { value: 'cancelled', label: 'cancelled' },
                    ]}
                    placeholder="All statuses"
                  />
                  <Link
                    to="/deployments"
                    className="text-xs text-ois-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
            <CardBody className="pt-0 px-5 pb-4">
              <RecentDeploymentsTable deployments={recentDeployments} />
            </CardBody>
          </Card>
        </div>

        {/* Right rail */}
        <div className="w-72 shrink-0 space-y-4 sticky top-4 self-start">
          {/* Deploy Health card */}
          <Card>
            <div className="px-4 pt-4 pb-2 border-b border-ois-border">
              <h2 className="text-xs font-semibold text-[#344054] uppercase tracking-wider">
                Deploy Health
              </h2>
            </div>
            <CardBody className="pt-3 pb-4 px-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ois-text-muted">Success rate (7d)</span>
                <span className="font-bold text-ois-text">
                  {(successRate7d * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ois-text-muted">Avg duration</span>
                <span className="font-bold text-ois-text">{formatDuration(avgDurationSec)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ois-text-muted">Active failures</span>
                <span
                  className={`font-bold ${activeFailures > 0 ? 'text-ois-sev-p1' : 'text-ois-text'}`}
                >
                  {activeFailures}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ois-text-muted">Rollbacks (7d)</span>
                <span
                  className={`font-bold ${rollbacks7d > 0 ? 'text-ois-sev-p2' : 'text-ois-text'}`}
                >
                  {rollbacks7d}
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Freeze Windows card */}
          <Card>
            <div className="px-4 pt-4 pb-2 border-b border-ois-border">
              <h2 className="text-xs font-semibold text-[#344054] uppercase tracking-wider">
                Freeze Windows
              </h2>
            </div>
            <CardBody className="pt-3 pb-4 px-4 space-y-3">
              {freezeEnvs.length === 0 ? (
                <p className="text-xs text-ois-text-subtle">No active freeze windows</p>
              ) : (
                freezeEnvs.map(env => (
                  <div
                    key={env.id}
                    className="flex items-start gap-2 rounded-lg bg-ois-warning-pale border border-ois-warning/20 px-3 py-2"
                  >
                    <AlertTriangle size={13} className="text-ois-sev-p2 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-ois-sev-p2">
                        {env.displayName}
                      </p>
                      {env.freezeWindowReason && (
                        <p className="text-[11px] text-ois-sev-p2 leading-snug">
                          {env.freezeWindowReason}
                        </p>
                      )}
                      <p className="text-[11px] text-[#B45309]">
                        Only P1 changes allowed
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          {/* Upcoming Deployments card */}
          <Card>
            <div className="px-4 pt-4 pb-2 border-b border-ois-border">
              <h2 className="text-xs font-semibold text-[#344054] uppercase tracking-wider">
                Upcoming Deployments
              </h2>
            </div>
            <CardBody className="pt-3 pb-4 px-4 space-y-3">
              {upcomingDeployments.length === 0 ? (
                <p className="text-xs text-ois-text-subtle">No scheduled deployments</p>
              ) : (
                upcomingDeployments.map(dep => {
                  const version = versionFromArtifact(dep.artifactRef);
                  return (
                    <div key={dep.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
                        <Calendar size={11} className="shrink-0" />
                        <span>{formatScheduledDate(dep.scheduledFor!)}</span>
                      </div>
                      <p className="text-xs font-medium text-ois-text">
                        {dep.componentName}{' '}
                        <span className="font-mono text-ois-text-muted">{version}</span>{' '}
                        <span className="text-[#667085]">→ {dep.environment}</span>
                      </p>
                      {dep.linkedChangePublicId && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-[#667085]">via {dep.linkedChangePublicId}</span>
                          <Link
                            to={`/changes/${dep.linkedChangePublicId}`}
                            className="text-ois-primary hover:underline flex items-center gap-0.5"
                          >
                            View change <ArrowRight size={10} />
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
