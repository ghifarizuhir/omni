import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Plus, Search, X, Radio } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockDRTestRuns } from '@/src/mocks/drTestRuns';
import { mockDRPlans } from '@/src/mocks/drPlans';
import { DRTestRun, DRTestStatus, DRTestType } from '@/src/types/continuity';
import { DRTestCard } from '@/src/components/continuity/DRTestCard';
import { LiveDRTestPanel } from '@/src/components/continuity/LiveDRTestPanel';
import { DRTestRunnerWizard } from '@/src/components/continuity/DRTestRunner/DRTestRunnerWizard';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { Can } from '@/src/lib/rbac';

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getRunningHoursMinutes(startedAt?: string): string {
  if (!startedAt) return '';
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type TabValue = 'all' | 'in_progress' | 'passed' | 'passed_with_issues' | 'failed';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'passed', label: 'Passed' },
  { value: 'passed_with_issues', label: 'Passed with issues' },
  { value: 'failed', label: 'Failed' },
];

const ALL_PLAN_OPTIONS = Array.from(
  new Set(mockDRTestRuns.map((r) => r.planPublicId)),
).sort();

const TEST_TYPE_OPTIONS: { value: DRTestType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'tabletop', label: 'Tabletop' },
  { value: 'functional', label: 'Functional' },
  { value: 'full_failover', label: 'Full failover' },
  { value: 'chaos', label: 'Chaos' },
];

export const DRTests: React.FC = () => {
  const navigate = useNavigate();

  const [liveTestId, setLiveTestId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<DRTestType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DRTestStatus | 'all'>('all');

  // Computed stats
  const stats = useMemo(() => {
    const total = mockDRTestRuns.length;
    const inProgress = mockDRTestRuns.filter((r) => r.status === 'in_progress').length;
    const planned = mockDRTestRuns.filter((r) => r.status === 'planned').length;
    const passed = mockDRTestRuns.filter((r) => r.status === 'passed').length;
    const passedWithIssues = mockDRTestRuns.filter((r) => r.status === 'passed_with_issues').length;
    const denominator = total - planned - inProgress;
    const passRate = denominator > 0 ? Math.round(((passed + passedWithIssues) / denominator) * 100) : 0;

    const lastTest = [...mockDRTestRuns]
      .filter((r) => r.startedAt)
      .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())[0];

    return { total, inProgress, passRate, lastTest };
  }, []);

  const activeTest = useMemo(
    () => mockDRTestRuns.find((r) => r.status === 'in_progress') ?? null,
    [],
  );

  const liveTest = useMemo(
    () => (liveTestId ? mockDRTestRuns.find((r) => r.id === liveTestId) ?? null : null),
    [liveTestId],
  );

  const tabCounts = useMemo(() => ({
    all: mockDRTestRuns.length,
    in_progress: mockDRTestRuns.filter((r) => r.status === 'in_progress').length,
    passed: mockDRTestRuns.filter((r) => r.status === 'passed').length,
    passed_with_issues: mockDRTestRuns.filter((r) => r.status === 'passed_with_issues').length,
    failed: mockDRTestRuns.filter((r) => r.status === 'failed').length,
  }), []);

  const filtered = useMemo(() => {
    let list = [...mockDRTestRuns];

    // Tab filter
    if (activeTab !== 'all') {
      list = list.filter((r) => r.status === activeTab);
    }

    // Status dropdown (for "all" tab)
    if (activeTab === 'all' && statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    // Plan filter
    if (planFilter !== 'all') {
      list = list.filter((r) => r.planPublicId === planFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.publicId.toLowerCase().includes(q) ||
          r.planName.toLowerCase().includes(q) ||
          r.planPublicId.toLowerCase().includes(q),
      );
    }

    // Sort: in_progress first, then by startedAt desc
    list.sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
      const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bTime - aTime;
    });

    return list;
  }, [search, planFilter, typeFilter, statusFilter, activeTab]);

  const hasFilters = search || planFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setPlanFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
  };

  const handleViewLive = (run: DRTestRun) => {
    setLiveTestId(run.id);
  };

  const handleViewReport = (_run: DRTestRun) => {
    // Report view placeholder
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    navigate('/continuity/tests');
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Page header */}
        <div className="px-6 pt-6 pb-4 border-b border-ois-border bg-white shrink-0">
          <nav className="flex items-center gap-1.5 text-sm text-ois-text-subtle mb-3">
            <Link to="/" className="hover:text-ois-text transition-colors">Dashboard</Link>
            <ChevronRight size={13} />
            <span className="text-ois-text font-medium">DR Test History</span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  to="/continuity/dr-plans"
                  className="flex items-center gap-1 text-sm text-ois-text-subtle hover:text-ois-text transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-ois-text tracking-tight">DR Test History</h1>
              <p className="text-sm text-ois-text-subtle mt-0.5">
                {stats.total} tests total &middot; {stats.inProgress} in progress &middot; {stats.passRate}% pass rate
                {stats.lastTest?.startedAt && (
                  <> &middot; Last test: {formatDate(stats.lastTest.startedAt)}{stats.inProgress > 0 ? ' (running)' : ''}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Can module="continuity" action="update">
              <button
                onClick={() => setShowWizard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary/90 rounded-lg transition-colors"
              >
                <Plus size={15} />
                Schedule test
              </button>
              </Can>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
            {/* Active test banner */}
            {activeTest && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Radio size={16} className="text-blue-600 mt-0.5 shrink-0 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                      DR TEST IN PROGRESS
                    </p>
                    <p className="text-sm font-semibold text-blue-800 mt-1">
                      {activeTest.publicId} — {activeTest.planPublicId}: {activeTest.planName}
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5 capitalize">
                      {activeTest.type.replace('_', ' ')} test &middot; {activeTest.environment}
                      {activeTest.startedAt && ` · Started ${getRunningHoursMinutes(activeTest.startedAt)} ago`}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Progress: {activeTest.completedSteps} of {activeTest.totalSteps} steps complete &middot; {activeTest.failedSteps} failures &middot; Step {activeTest.completedSteps + 1} running
                    </p>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-blue-200 overflow-hidden w-64">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${activeTest.totalSteps > 0 ? Math.round((activeTest.completedSteps / activeTest.totalSteps) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-blue-600 mt-0.5">
                        {activeTest.totalSteps > 0 ? Math.round((activeTest.completedSteps / activeTest.totalSteps) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setLiveTestId(activeTest.id)}
                    className="shrink-0 text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
                  >
                    View live test
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-48 max-w-72">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search test ID, plan…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
                />
              </div>

              <FilterDropdown
                value={planFilter}
                onChange={v => setPlanFilter(v)}
                options={[
                  { value: 'all', label: 'All plans' },
                  ...ALL_PLAN_OPTIONS.map(pid => ({ value: pid, label: pid })),
                ]}
                placeholder="All plans"
              />

              <FilterDropdown
                value={typeFilter}
                onChange={v => setTypeFilter(v as DRTestType | 'all')}
                options={TEST_TYPE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                placeholder="All types"
              />

              <FilterDropdown
                value={statusFilter}
                onChange={v => setStatusFilter(v as DRTestStatus | 'all')}
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'planned', label: 'Planned' },
                  { value: 'in_progress', label: 'In progress' },
                  { value: 'passed', label: 'Passed' },
                  { value: 'passed_with_issues', label: 'Passed with issues' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                placeholder="All statuses"
              />

              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-ois-text-subtle hover:text-ois-danger border border-ois-border rounded-lg bg-white hover:border-ois-danger/40 transition-colors"
                >
                  <X size={12} />
                  Reset
                </button>
              )}
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-0.5 border-b border-ois-border">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                    activeTab === tab.value
                      ? 'border-ois-primary text-ois-primary'
                      : 'border-transparent text-ois-text-subtle hover:text-ois-text hover:border-ois-border',
                  )}
                >
                  {tab.label} <span className="ml-1 text-xs opacity-70">{tabCounts[tab.value]}</span>
                </button>
              ))}
            </div>

            {/* Test run cards */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-base font-semibold text-ois-text mb-1">No test runs found</p>
                <p className="text-sm text-ois-text-subtle">Try adjusting your filters or search.</p>
                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="mt-3 px-3 py-1.5 text-sm border border-ois-border rounded-lg hover:bg-ois-surface-muted"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map((run) => (
                  <DRTestCard
                    key={run.id}
                    run={run}
                    onViewLive={run.status === 'in_progress' ? handleViewLive : undefined}
                    onViewReport={
                      run.status === 'passed' || run.status === 'passed_with_issues' || run.status === 'failed'
                        ? handleViewReport
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live DR Test Panel */}
      {liveTest && (
        <LiveDRTestPanel run={liveTest} onClose={() => setLiveTestId(null)} />
      )}

      {/* DR Test Runner Wizard */}
      {showWizard && (
        <DRTestRunnerWizard
          plans={mockDRPlans}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </>
  );
};
