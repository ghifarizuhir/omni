import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  RotateCcw,
  Flame,
  AlertTriangle,
  Radio,
  Building2,
} from 'lucide-react';
import { mockTestRuns, getActiveTestRuns } from '../../mocks/testRuns';
import { mockTestCases } from '../../mocks/testCases';
import { ActiveTestRunBanner } from '../../components/testing/ActiveTestRunBanner';
import { TestRunCard } from '../../components/testing/TestRunCard';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { TestRunStatus } from '../../types/testing';
import { FilterDropdown } from '../../components/ui/FilterDropdown';

// ── Derived constants ────────────────────────────────────────────────────────

const activeRuns = getActiveTestRuns();

// Pass rate: exclude running runs from denominator
const completedRuns = mockTestRuns.filter(
  (r) => r.status !== 'running' && r.status !== 'pending'
);
const passedRuns = completedRuns.filter((r) => r.status === 'passed');
const overallPassRate =
  completedRuns.length > 0
    ? Math.round((passedRuns.length / completedRuns.length) * 100)
    : 0;

const TOTAL_RUNS_30D = mockTestRuns.length; // treat all mock data as 30d window

// Average duration (completed runs only, with durationSec)
const runsWithDuration = completedRuns.filter((r) => r.durationSec != null);
const avgDurationMin =
  runsWithDuration.length > 0
    ? Math.round(
        runsWithDuration.reduce((acc, r) => acc + (r.durationSec ?? 0), 0) /
          runsWithDuration.length /
          60
      )
    : 0;

// 7d pass rate (mock: use same runs subset)
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const runs7d = completedRuns.filter(
  (r) => r.createdAt && new Date(r.createdAt).getTime() >= sevenDaysAgo
);
const passed7d = runs7d.filter((r) => r.status === 'passed');
const passRate7d =
  runs7d.length > 0
    ? Math.round((passed7d.length / runs7d.length) * 100)
    : overallPassRate;

// Flaky test cases
const flakyCases = mockTestCases.filter(
  (c) => c.flakeRate != null && c.flakeRate > 0.05
);

// Failed/partial runs in the last 7 days
const failedRecent = completedRuns.filter(
  (r) =>
    (r.status === 'failed' || r.status === 'partial') &&
    r.createdAt &&
    new Date(r.createdAt).getTime() >= sevenDaysAgo
);

// Gather unique top failure cases from recent failures
const topFailureCaseIds = new Set<string>();
const topFailureCaseEntries: { publicId: string; title: string }[] = [];
for (const run of failedRecent) {
  for (const f of run.topFailures ?? []) {
    if (!topFailureCaseIds.has(f.casePublicId)) {
      topFailureCaseIds.add(f.casePublicId);
      topFailureCaseEntries.push({ publicId: f.casePublicId, title: f.title });
    }
  }
}

// Quick filter counts
const now24h = Date.now() - 24 * 60 * 60 * 1000;
const failed24hCount = mockTestRuns.filter(
  (r) =>
    (r.status === 'failed' || r.status === 'partial') &&
    r.createdAt &&
    new Date(r.createdAt).getTime() >= now24h
).length;

const productionRunsCount = mockTestRuns.filter(
  (r) => r.environment === 'production'
).length;

// Available filter values
const ALL_STATUSES: TestRunStatus[] = [
  'running',
  'passed',
  'failed',
  'partial',
  'cancelled',
  'timed_out',
];
const ALL_TRIGGERED_BY = [
  'manual',
  'cicd',
  'scheduled',
  'pre_deployment',
  'post_deployment',
] as const;

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// Status chip groups
const STATUS_CHIPS: { label: string; key: string }[] = [
  { label: 'All', key: 'all' },
  { label: 'Running', key: 'running' },
  { label: 'Passed', key: 'passed' },
  { label: 'Failed', key: 'failed' },
  { label: 'Partial', key: 'partial' },
];

const TRIGGER_CHIPS: { label: string; key: string }[] = [
  { label: 'Pre-deployment', key: 'pre_deployment' },
  { label: 'Scheduled', key: 'scheduled' },
  { label: 'Manual', key: 'manual' },
];

// ── Main component ────────────────────────────────────────────────────────────

export const TestRuns: React.FC = () => {
  // Filter state
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('');
  const [envFilter, setEnvFilter] = useState<string>('');
  const [triggerFilter, setTriggerFilter] = useState<string>('');

  // Stats strip chip state
  const [statusChip, setStatusChip] = useState<string>('all');
  const [triggerChip, setTriggerChip] = useState<string>('');

  // Quick filter chip state
  const [quickFilter, setQuickFilter] = useState<string>('');

  // Expanded run IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Available dropdown options
  const allPlans = useMemo(
    () => unique(mockTestRuns.map((r) => r.testPlanName)).sort(),
    []
  );
  const allEnvironments = useMemo(
    () => unique(mockTestRuns.map((r) => r.environment)).sort(),
    []
  );

  // Status chip counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockTestRuns.length };
    for (const s of ALL_STATUSES) {
      counts[s] = mockTestRuns.filter((r) => r.status === s).length;
    }
    return counts;
  }, []);

  const triggerCounts = useMemo(() => {
    return {
      pre_deployment: mockTestRuns.filter(
        (r) => r.triggeredBy === 'pre_deployment'
      ).length,
      scheduled: mockTestRuns.filter((r) => r.triggeredBy === 'scheduled')
        .length,
      manual: mockTestRuns.filter((r) => r.triggeredBy === 'manual').length,
    };
  }, []);

  // Derived filtered + sorted list
  const filteredRuns = useMemo(() => {
    let list = [...mockTestRuns];

    // Status chip
    if (statusChip !== 'all') {
      list = list.filter((r) => r.status === statusChip);
    }

    // Trigger chip
    if (triggerChip) {
      list = list.filter((r) => r.triggeredBy === triggerChip);
    }

    // Quick filter
    if (quickFilter === 'failed24h') {
      list = list.filter(
        (r) =>
          (r.status === 'failed' || r.status === 'partial') &&
          r.createdAt &&
          new Date(r.createdAt).getTime() >= now24h
      );
    } else if (quickFilter === 'flaky') {
      const flakyCaseIds = new Set(flakyCases.map((c) => c.id));
      list = list.filter((r) =>
        r.caseResults.some(
          (cr) => cr.isFlaky || flakyCaseIds.has(cr.testCaseId)
        )
      );
    } else if (quickFilter === 'live') {
      list = list.filter((r) => r.status === 'running');
    } else if (quickFilter === 'production') {
      list = list.filter((r) => r.environment === 'production');
    }

    // Filter bar
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.testPlanName.toLowerCase().includes(q) ||
          r.publicId.toLowerCase().includes(q) ||
          r.environment.toLowerCase().includes(q)
      );
    }
    if (planFilter) list = list.filter((r) => r.testPlanName === planFilter);
    if (envFilter) list = list.filter((r) => r.environment === envFilter);
    if (triggerFilter)
      list = list.filter((r) => r.triggeredBy === triggerFilter);

    // Sort: running first, then by createdAt desc
    list.sort((a, b) => {
      const aRunning = a.status === 'running' ? 0 : 1;
      const bRunning = b.status === 'running' ? 0 : 1;
      if (aRunning !== bRunning) return aRunning - bRunning;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return list;
  }, [
    search,
    planFilter,
    envFilter,
    triggerFilter,
    statusChip,
    triggerChip,
    quickFilter,
  ]);

  const handleReset = () => {
    setSearch('');
    setPlanFilter('');
    setEnvFilter('');
    setTriggerFilter('');
    setStatusChip('all');
    setTriggerChip('');
    setQuickFilter('');
  };

  const toggleStatusChip = (key: string) => {
    setStatusChip((prev) => (prev === key ? 'all' : key));
  };
  const toggleTriggerChip = (key: string) => {
    setTriggerChip((prev) => (prev === key ? '' : key));
  };
  const toggleQuickFilter = (key: string) => {
    setQuickFilter((prev) => (prev === key ? '' : key));
  };

  // Flaky count for banner
  const flakyCount = flakyCases.length;

  // Live count
  const liveCount = activeRuns.length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-medium hover:bg-ois-primary/90 transition-colors shrink-0">
          <Plus size={14} />
          Trigger run
        </button>
      </div>

      {/* ── Active run banner ────────────────────────────────────────────────── */}
      <ActiveTestRunBanner runs={activeRuns} />

      {/* ── Two-column layout ────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        {/* ── Left: main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle"
              />
              <input
                type="text"
                placeholder="Search plan, run ID, environment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
              />
            </div>

            {/* Plan dropdown */}
            <FilterDropdown
              value={planFilter}
              onChange={(v) => setPlanFilter(v)}
              options={[
                { value: '', label: 'Plan' },
                ...allPlans.map((p) => ({ value: p, label: p })),
              ]}
              placeholder="Plan"
            />

            {/* Environment dropdown */}
            <FilterDropdown
              value={envFilter}
              onChange={(v) => setEnvFilter(v)}
              options={[
                { value: '', label: 'Environment' },
                ...allEnvironments.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) })),
              ]}
              placeholder="Environment"
            />

            {/* Triggered by dropdown */}
            <FilterDropdown
              value={triggerFilter}
              onChange={(v) => setTriggerFilter(v)}
              options={[
                { value: '', label: 'Triggered by' },
                ...ALL_TRIGGERED_BY.map((t) => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
              ]}
              placeholder="Triggered by"
            />

            {/* Reset */}
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-ois-border text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>

          {/* Stats strip chips */}
          <div className="flex flex-col gap-2">
            {/* Row 1: status chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_CHIPS.map(({ label, key }) => {
                const count = statusCounts[key] ?? 0;
                const active = statusChip === key;
                return (
                  <button
                    key={key}
                    onClick={() => toggleStatusChip(key)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-ois-primary text-white border-ois-primary'
                        : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50 hover:text-ois-text'
                    )}
                  >
                    {label} {count}
                  </button>
                );
              })}
            </div>

            {/* Row 2: trigger chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {TRIGGER_CHIPS.map(({ label, key }) => {
                const count = triggerCounts[key as keyof typeof triggerCounts] ?? 0;
                const active = triggerChip === key;
                return (
                  <button
                    key={key}
                    onClick={() => toggleTriggerChip(key)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-ois-primary text-white border-ois-primary'
                        : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50 hover:text-ois-text'
                    )}
                  >
                    {label}: {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              {
                key: 'failed24h',
                label: `Failed last 24h (${failed24hCount})`,
                icon: <Flame size={12} className="shrink-0" />,
                activeColor: 'bg-[#FEF3F2] text-[#B42318] border-[#F04438]/40',
              },
              {
                key: 'flaky',
                label: `Flaky tests detected (${flakyCount})`,
                icon: <AlertTriangle size={12} className="shrink-0" />,
                activeColor: 'bg-[#FFFAEB] text-[#B54708] border-[#F79009]/40',
              },
              {
                key: 'live',
                label: `Live (${liveCount})`,
                icon: <Radio size={12} className="shrink-0" />,
                activeColor: 'bg-[#F0F9FF] text-[#0BA5EC] border-[#0BA5EC]/40',
              },
              {
                key: 'production',
                label: `Production runs (${productionRunsCount})`,
                icon: <Building2 size={12} className="shrink-0" />,
                activeColor: 'bg-[#F4F3FF] text-[#6941C6] border-[#6941C6]/40',
              },
            ].map(({ key, label, icon, activeColor }) => {
              const active = quickFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => toggleQuickFilter(key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    active
                      ? activeColor
                      : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50 hover:text-ois-text'
                  )}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>

          {/* Run cards list */}
          {filteredRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2 rounded-xl border border-ois-border bg-ois-surface">
              <p className="text-sm text-ois-text-muted">
                No test runs match your filters.
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-ois-primary underline underline-offset-2 hover:no-underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRuns.map((run) => (
                <TestRunCard
                  key={run.id}
                  run={run}
                  isExpanded={expandedIds.has(run.id)}
                  onToggleExpand={() => toggleExpand(run.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right rail ───────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 sticky top-4 self-start space-y-4">
          {/* Test Health card */}
          <Card>
            <CardBody className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-3">
                Test Health
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Pass rate (30d)',
                    value: `${overallPassRate}%`,
                    color:
                      overallPassRate >= 90
                        ? 'text-[#067647]'
                        : overallPassRate >= 75
                        ? 'text-[#B54708]'
                        : 'text-[#B42318]',
                  },
                  {
                    label: 'Pass rate (7d)',
                    value: `${passRate7d}%`,
                    color:
                      passRate7d >= 90
                        ? 'text-[#067647]'
                        : passRate7d >= 75
                        ? 'text-[#B54708]'
                        : 'text-[#B42318]',
                  },
                  {
                    label: 'Avg duration',
                    value: `${avgDurationMin}m`,
                    color: 'text-ois-text',
                  },
                  {
                    label: 'Total runs (30d)',
                    value: String(TOTAL_RUNS_30D),
                    color: 'text-ois-text',
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-ois-text-muted">{label}</span>
                    <span className={cn('text-sm font-bold', color)}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Flaky Tests card */}
          <Card>
            <CardBody className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">
                Flaky Tests
              </p>
              {flakyCount === 0 ? (
                <p className="text-xs text-ois-text-muted mt-2">
                  No flaky tests detected.
                </p>
              ) : (
                <>
                  <p className="text-xs text-ois-text-muted mb-3">
                    {flakyCount}{' '}
                    {flakyCount === 1 ? 'case' : 'cases'} flagged as flaky:
                  </p>
                  <div className="space-y-2">
                    {flakyCases.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-mono text-[10px] text-ois-text-muted truncate">
                          {c.publicId.slice(-12)}
                        </span>
                        <span className="text-xs font-semibold text-[#B54708] shrink-0">
                          {Math.round((c.flakeRate ?? 0) * 100)}% flake
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/testing/cases"
                    className="inline-block mt-3 text-xs font-semibold text-ois-primary hover:underline"
                  >
                    Review →
                  </Link>
                </>
              )}
            </CardBody>
          </Card>

          {/* Failed Cases card */}
          <Card>
            <CardBody className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ois-text-subtle mb-1">
                Failed Cases (last 7d)
              </p>
              {topFailureCaseEntries.length === 0 ? (
                <p className="text-xs text-ois-text-muted mt-2">
                  No failures in the last 7 days.
                </p>
              ) : (
                <>
                  <div className="space-y-2 mt-3">
                    {topFailureCaseEntries.slice(0, 5).map((entry) => (
                      <div key={entry.publicId} className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-ois-text-muted">
                          {entry.publicId.slice(-12)}
                        </span>
                        <span className="text-xs text-ois-text truncate">
                          {entry.title}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    to="/testing/cases"
                    className="inline-block mt-3 text-xs font-semibold text-ois-primary hover:underline"
                  >
                    View all →
                  </Link>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
