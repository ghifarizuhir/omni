import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, RotateCcw, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatRelative, formatDate } from '../../lib/format';
import { mockDeployments, getActiveDeployments } from '../../mocks/deployments';
import { Deployment, DeploymentStatus, DeploymentStrategy, DeploymentTrigger } from '../../types/deployment';
import { Environment } from '../../types/ci';
import { ActiveDeploymentBanner } from '../../components/deployments/ActiveDeploymentBanner';
import { DeploymentStatusPill } from '../../components/deployments/DeploymentStatusPill';
import { EnvironmentChip } from '../../components/deployments/EnvironmentChip';
import { DeploymentStrategyChip } from '../../components/deployments/DeploymentStrategyChip';
import { DeploymentTriggerChip } from '../../components/deployments/DeploymentTriggerChip';
import { RollbackModal } from '../../components/deployments/DeploymentDetail/RollbackModal';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FilterDropdown } from '../../components/ui/FilterDropdown';

// ── helpers ────────────────────────────────────────────────────────────────

const getVersion = (artifactRef: string) => artifactRef.split(':').pop() ?? artifactRef;

const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const LAST_24H = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const LAST_30D = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

// ── types ──────────────────────────────────────────────────────────────────

type QuickFilter = 'active' | 'failed' | 'rolled_back' | 'last24h' | 'production';

// ── Actions menu ──────────────────────────────────────────────────────────

const ActionsMenu: React.FC<{
  dep: Deployment;
  onRollbackSuccess: (id: string) => void;
}> = ({ dep, onRollbackSuccess }) => {
  const [open, setOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const navigate = useNavigate();

  const canRollback = dep.status === 'success' || dep.status === 'running';
  const canCancel = dep.status === 'pending' || dep.status === 'running';
  const canRedeploy = dep.status === 'failed' || dep.status === 'rolled_back';

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const handleRollbackConfirm = (_reason: string) => {
    setRollbackOpen(false);
    onRollbackSuccess(dep.id);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-ois-surface-muted text-ois-text-muted hover:text-gray-700 transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 min-w-[140px] rounded-lg border border-ois-border bg-white shadow-lg py-1 text-sm">
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-ois-surface-muted text-ois-text"
            onClick={() => { navigate(`/deployments/${dep.publicId}`); setOpen(false); }}
          >
            Open
          </button>
          {canRollback && (
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-ois-surface-muted text-ois-text"
              onClick={() => { setOpen(false); setRollbackOpen(true); }}
            >
              Rollback
            </button>
          )}
          {canCancel && (
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-ois-danger-pale text-ois-sev-p1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          )}
          {canRedeploy && (
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-ois-surface-muted text-ois-text"
              onClick={() => { navigate(`/deployments/${dep.publicId}`); setOpen(false); }}
            >
              Re-deploy
            </button>
          )}
        </div>
      )}

      <RollbackModal
        deployment={dep}
        isOpen={rollbackOpen}
        onClose={() => setRollbackOpen(false)}
        onConfirm={handleRollbackConfirm}
      />
    </div>
  );
};

// ── Duration cell ──────────────────────────────────────────────────────────

const DurationCell: React.FC<{ dep: Deployment; elapsed: number }> = ({ dep, elapsed }) => {
  if (dep.status === 'pending') return <span className="text-[#98A2B3]">—</span>;

  if (dep.status === 'running' || dep.status === 'rolling_back') {
    const startMs = dep.startedAt ? new Date(dep.startedAt).getTime() : Date.now();
    const baseSec = Math.floor((Date.now() - startMs) / 1000);
    const totalSec = baseSec + elapsed;
    return (
      <span className="text-[#0BA5EC] font-mono text-xs">
        running {fmtDuration(totalSec)}
      </span>
    );
  }

  if (dep.durationSec != null) {
    return <span className="font-mono text-xs text-[#475467]">{fmtDuration(dep.durationSec)}</span>;
  }

  return <span className="text-[#98A2B3]">—</span>;
};

// ── Main page ──────────────────────────────────────────────────────────────

export const DeploymentsQueue: React.FC = () => {
  const navigate = useNavigate();

  // local status overrides applied after rollback confirmation
  const [localStatuses, setLocalStatuses] = useState<Record<string, DeploymentStatus>>({});

  const [manualDeployOpen, setManualDeployOpen] = useState(false);
  const [extraDeployments, setExtraDeployments] = useState<Deployment[]>([]);

  // Manual deploy form
  const [mdComponent, setMdComponent] = useState('');
  const [mdEnv, setMdEnv] = useState<Environment | ''>('');
  const [mdArtifact, setMdArtifact] = useState('');
  const [mdStrategy, setMdStrategy] = useState<DeploymentStrategy | ''>('');
  const [mdBranch, setMdBranch] = useState('main');

  const handleRollbackSuccess = (id: string) => {
    setLocalStatuses((prev) => ({ ...prev, [id]: 'rolled_back' }));
  };

  // filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeploymentStatus | ''>('');
  const [envFilter, setEnvFilter] = useState<Environment | ''>('');
  const [componentFilter, setComponentFilter] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<DeploymentStrategy | ''>('');
  const [triggerFilter, setTriggerFilter] = useState<DeploymentTrigger | ''>('');
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());

  // live elapsed seconds for running deployments
  const [elapsedTick, setElapsedTick] = useState(0);
  const activeDeployments = useMemo(() => getActiveDeployments(), []);
  const hasRunning = activeDeployments.some(
    (d) => d.status === 'running' || d.status === 'rolling_back'
  );

  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  // summary counts (last 30 days)
  const summary = useMemo(() => {
    const recent = [...extraDeployments, ...mockDeployments].filter(
      (d) => (d.startedAt ?? d.createdAt) >= LAST_30D
    );
    return {
      total: recent.length,
      active: recent.filter((d) => d.status === 'running' || d.status === 'rolling_back').length,
      pending: recent.filter((d) => d.status === 'pending').length,
      success: recent.filter((d) => d.status === 'success').length,
      failed: recent.filter((d) => d.status === 'failed').length,
    };
  }, [extraDeployments]);

  // status badge counts for dropdown
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DeploymentStatus, number>> = {};
    [...extraDeployments, ...mockDeployments].forEach((d) => {
      counts[d.status] = (counts[d.status] ?? 0) + 1;
    });
    return counts;
  }, [extraDeployments]);

  // unique values for filter dropdowns
  const uniqueComponents = useMemo(
    () => [...new Set([...extraDeployments, ...mockDeployments].map((d) => d.componentName))].sort(),
    [extraDeployments]
  );

  // filtered + sorted
  const filtered = useMemo(() => {
    let list = [...extraDeployments, ...mockDeployments];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.publicId.toLowerCase().includes(q) ||
          d.componentName.toLowerCase().includes(q) ||
          d.commitSha.toLowerCase().includes(q) ||
          (d.commitMessage ?? '').toLowerCase().includes(q)
      );
    }

    // status
    if (statusFilter) list = list.filter((d) => d.status === statusFilter);

    // env
    if (envFilter) list = list.filter((d) => d.environment === envFilter);

    // component
    if (componentFilter) list = list.filter((d) => d.componentName === componentFilter);

    // strategy
    if (strategyFilter) list = list.filter((d) => d.strategy === strategyFilter);

    // trigger
    if (triggerFilter) list = list.filter((d) => d.trigger === triggerFilter);

    // quick filters (combined — all active chips must match)
    if (quickFilters.has('active')) {
      list = list.filter((d) => d.status === 'running' || d.status === 'rolling_back');
    }
    if (quickFilters.has('failed')) {
      list = list.filter((d) => d.status === 'failed');
    }
    if (quickFilters.has('rolled_back')) {
      list = list.filter((d) => d.status === 'rolled_back');
    }
    if (quickFilters.has('last24h')) {
      list = list.filter((d) => (d.startedAt ?? d.createdAt) >= LAST_24H);
    }
    if (quickFilters.has('production')) {
      list = list.filter((d) => d.environment === 'production');
    }

    // default sort: startedAt desc
    list.sort((a, b) => {
      const ta = a.startedAt ?? a.createdAt;
      const tb = b.startedAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });

    return list;
  }, [search, statusFilter, envFilter, componentFilter, strategyFilter, triggerFilter, quickFilters, extraDeployments]);

  const hasFilters =
    search ||
    statusFilter ||
    envFilter ||
    componentFilter ||
    strategyFilter ||
    triggerFilter ||
    quickFilters.size > 0;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setEnvFilter('');
    setComponentFilter('');
    setStrategyFilter('');
    setTriggerFilter('');
    setQuickFilters(new Set());
  };

  const toggleQuick = (f: QuickFilter) => {
    setQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  // quick chip counts
  const qCounts = useMemo(() => {
    const all = [...extraDeployments, ...mockDeployments];
    const active = all.filter(
      (d) => d.status === 'running' || d.status === 'rolling_back'
    ).length;
    const failed = all.filter((d) => d.status === 'failed').length;
    const rolled = all.filter((d) => d.status === 'rolled_back').length;
    const last24h = all.filter((d) => (d.startedAt ?? d.createdAt) >= LAST_24H).length;
    const production = all.filter((d) => d.environment === 'production').length;
    return { active, failed, rolled, last24h, production };
  }, [extraDeployments]);

  const handleManualDeploy = () => {
    if (!mdComponent || !mdEnv || !mdArtifact || !mdStrategy) return;
    const newId = `dep-manual-${Date.now()}`;
    const publicId = `DPL-M-${String(extraDeployments.length + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();
    const newDep: Deployment = {
      id: newId,
      publicId,
      componentName: mdComponent,
      artifactRef: mdArtifact,
      commitSha: 'manual',
      branch: mdBranch,
      environment: mdEnv,
      targetCIIds: [],
      status: 'pending',
      strategy: mdStrategy,
      trigger: 'manual',
      triggeredById: 'u-001',
      triggeredByName: 'Sarah Chen',
      stages: [],
      currentStageIndex: 0,
      tags: [],
      triggeredIncidentIds: [],
      postDeployHealth: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    setExtraDeployments(prev => [newDep, ...prev]);
    setManualDeployOpen(false);
    // reset form
    setMdComponent('');
    setMdEnv('');
    setMdArtifact('');
    setMdStrategy('');
    setMdBranch('main');
  };

  return (
    <div className="p-6 space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#101828]">Deployments</h1>
          <p className="text-sm text-[#475467] mt-0.5">
            {summary.total} total &middot; {summary.active} active &middot; {summary.pending} pending
            &middot; {summary.success} success &middot; {summary.failed} failed
            <span className="ml-1 text-[#98A2B3]">(last 30 days)</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/environments"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
          >
            Environments →
          </Link>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4FD4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1a44b8] transition-colors"
            onClick={() => setManualDeployOpen(true)}
          >
            + Manual deploy
          </button>
        </div>
      </div>

      {/* ── Active banner ── */}
      {activeDeployments.length > 0 && (
        <ActiveDeploymentBanner deployments={activeDeployments} />
      )}

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Search ID, component, commit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#D0D5DD] bg-white text-sm text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#1F4FD4]/30 focus:border-[#1F4FD4]"
          />
        </div>

        {/* Status */}
        <FilterDropdown
          value={statusFilter}
          onChange={v => setStatusFilter(v as DeploymentStatus | '')}
          options={[
            { value: '', label: 'Status' },
            ...(['pending', 'running', 'success', 'failed', 'rolled_back', 'cancelled', 'rolling_back'] as DeploymentStatus[]).map(s => ({
              value: s,
              label: `${s.replace('_', ' ')} (${statusCounts[s] ?? 0})`,
            })),
          ]}
          placeholder="Status"
        />

        {/* Environment */}
        <FilterDropdown
          value={envFilter}
          onChange={v => setEnvFilter(v as Environment | '')}
          options={[
            { value: '', label: 'Environment' },
            ...(['development', 'staging', 'production', 'dr'] as Environment[]).map(e => ({ value: e, label: e })),
          ]}
          placeholder="Environment"
        />

        {/* Component */}
        <FilterDropdown
          value={componentFilter}
          onChange={v => setComponentFilter(v)}
          options={[
            { value: '', label: 'Component' },
            ...uniqueComponents.map(c => ({ value: c, label: c })),
          ]}
          placeholder="Component"
        />

        {/* Strategy */}
        <FilterDropdown
          value={strategyFilter}
          onChange={v => setStrategyFilter(v as DeploymentStrategy | '')}
          options={[
            { value: '', label: 'Strategy' },
            ...(['rolling', 'blue_green', 'canary', 'big_bang', 'phased'] as DeploymentStrategy[]).map(s => ({
              value: s,
              label: s.replace('_', ' '),
            })),
          ]}
          placeholder="Strategy"
        />

        {/* Trigger */}
        <FilterDropdown
          value={triggerFilter}
          onChange={v => setTriggerFilter(v as DeploymentTrigger | '')}
          options={[
            { value: '', label: 'Trigger' },
            ...(['manual', 'cicd_pipeline', 'scheduled', 'auto_promotion'] as DeploymentTrigger[]).map(t => ({
              value: t,
              label: t.replace('_', ' '),
            })),
          ]}
          placeholder="Trigger"
        />

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-[#475467] hover:bg-[#F9FAFB] transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>

      {/* ── Quick filter chips ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {(
          [
            { key: 'active' as QuickFilter, label: `🔥 Active (${qCounts.active})` },
            { key: 'failed' as QuickFilter, label: `⚠ Failed (${qCounts.failed})` },
            { key: 'rolled_back' as QuickFilter, label: `↩ Rolled back (${qCounts.rolled})` },
            { key: 'last24h' as QuickFilter, label: `📡 Last 24h (${qCounts.last24h})` },
            { key: 'production' as QuickFilter, label: `Production only (${qCounts.production})` },
          ] as { key: QuickFilter; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleQuick(key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              quickFilters.has(key)
                ? 'border-[#1F4FD4] bg-[#EEF2FF] text-[#1F4FD4]'
                : 'border-[#D0D5DD] bg-white text-[#475467] hover:bg-[#F9FAFB]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-[#E4E7EC] bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#475467]">
            {mockDeployments.length === 0 ? (
              <p className="text-sm">No deployments yet.</p>
            ) : (
              <>
                <p className="text-sm">No deployments match.</p>
                <button
                  onClick={resetFilters}
                  className="rounded-lg border border-[#D0D5DD] px-3 py-1.5 text-sm font-semibold text-[#344054] hover:bg-[#F9FAFB]"
                >
                  Reset filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7EC] bg-[#F9FAFB]">
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Component</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Version</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Environment</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Strategy</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Trigger</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Started</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Duration</th>
                  <th className="px-4 py-2.5 font-semibold text-[#475467] text-xs uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {filtered.map((dep) => {
                  const effectiveStatus = localStatuses[dep.id] ?? dep.status;
                  const effectiveDep = effectiveStatus !== dep.status ? { ...dep, status: effectiveStatus } : dep;
                  const isRunning = effectiveStatus === 'running' || effectiveStatus === 'rolling_back';
                  const isRolledBack = effectiveStatus === 'rolled_back';
                  const hasIncident = dep.triggeredIncidentIds.length > 0;

                  return (
                    <tr
                      key={dep.id}
                      className={cn(
                        'hover:bg-[#F9FAFB] transition-colors cursor-pointer',
                        isRunning && 'bg-blue-50/50'
                      )}
                      onClick={() => navigate(`/deployments/${dep.publicId}`)}
                    >
                      {/* Status */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <DeploymentStatusPill
                          status={effectiveStatus}
                          size="sm"
                          hasIncident={hasIncident}
                        />
                      </td>

                      {/* Public ID */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Link
                          to={`/deployments/${dep.publicId}`}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'font-mono text-xs font-semibold hover:underline',
                            isRolledBack ? 'text-[#DC6803]' : 'text-[#1F4FD4]'
                          )}
                        >
                          {isRolledBack ? `↩ ${dep.publicId}` : dep.publicId}
                        </Link>
                      </td>

                      {/* Component */}
                      <td className="px-4 py-2.5 max-w-[160px]">
                        <span
                          className="text-xs text-[#344054] font-medium truncate block"
                          title={dep.componentName}
                        >
                          {dep.componentName}
                        </span>
                      </td>

                      {/* Version */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="font-mono text-xs text-[#475467] bg-[#F1F3F7] rounded px-1.5 py-0.5">
                          {getVersion(dep.artifactRef)}
                        </span>
                      </td>

                      {/* Environment */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <EnvironmentChip env={dep.environment} size="sm" />
                      </td>

                      {/* Strategy */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <DeploymentStrategyChip strategy={dep.strategy} />
                      </td>

                      {/* Trigger */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <DeploymentTriggerChip trigger={dep.trigger} />
                      </td>

                      {/* Started */}
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-[#475467]">
                        {dep.status === 'pending' && dep.scheduledFor ? (
                          <span className="text-[#0BA5EC]">
                            Scheduled {formatDate(dep.scheduledFor, 'MMM d, HH:mm')}
                          </span>
                        ) : dep.startedAt ? (
                          formatRelative(dep.startedAt)
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <DurationCell dep={effectiveDep} elapsed={elapsedTick} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <ActionsMenu dep={effectiveDep} onRollbackSuccess={handleRollbackSuccess} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={manualDeployOpen} onClose={() => setManualDeployOpen(false)} title="Manual deploy" size="md">
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5 block">
              Component <span className="text-ois-danger">*</span>
            </label>
            <FilterDropdown
              value={mdComponent}
              onChange={v => setMdComponent(v)}
              options={[
                { value: '', label: 'Select component…' },
                ...uniqueComponents.map(c => ({ value: c, label: c })),
              ]}
              placeholder="Select component…"
              fullWidth
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5 block">
              Environment <span className="text-ois-danger">*</span>
            </label>
            <FilterDropdown
              value={mdEnv}
              onChange={v => setMdEnv(v as Environment | '')}
              options={[
                { value: '', label: 'Select environment…' },
                ...(['development', 'staging', 'production', 'dr'] as Environment[]).map(e => ({ value: e, label: e })),
              ]}
              placeholder="Select environment…"
              fullWidth
            />
          </div>
          <div>
            <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5 block">
              Artifact ref <span className="text-ois-danger">*</span>
            </label>
            <input
              value={mdArtifact}
              onChange={e => setMdArtifact(e.target.value)}
              placeholder="e.g. my-service:v1.2.3"
              className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5 block">
                Strategy <span className="text-ois-danger">*</span>
              </label>
              <FilterDropdown
                value={mdStrategy}
                onChange={v => setMdStrategy(v as DeploymentStrategy | '')}
                options={[
                  { value: '', label: 'Select…' },
                  ...(['rolling', 'blue_green', 'canary', 'big_bang', 'phased'] as DeploymentStrategy[]).map(s => ({
                    value: s,
                    label: s.replace('_', ' '),
                  })),
                ]}
                placeholder="Select…"
                fullWidth
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest mb-1.5 block">
                Branch
              </label>
              <input
                value={mdBranch}
                onChange={e => setMdBranch(e.target.value)}
                placeholder="main"
                className="w-full h-9 rounded-lg border border-ois-border-strong bg-white px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
            <Button variant="outline" size="sm" onClick={() => setManualDeployOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!mdComponent || !mdEnv || !mdArtifact || !mdStrategy}
              onClick={handleManualDeploy}
            >
              Deploy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
