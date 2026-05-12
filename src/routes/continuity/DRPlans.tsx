import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Plus, Search, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockDRPlans } from '@/src/mocks/drPlans';
import { DRPlan, DRPlanStatus } from '@/src/types/continuity';
import { DRPlanCard } from '@/src/components/continuity/DRPlanCard';
import { DRTestRunnerWizard } from '@/src/components/continuity/DRTestRunner/DRTestRunnerWizard';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

const TODAY = new Date('2026-05-10');

function isOverdue(isoString: string): boolean {
  return new Date(isoString) < TODAY;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function weeksOverdue(isoString: string): number {
  const diff = TODAY.getTime() - new Date(isoString).getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

type TabValue = 'all' | 'active' | 'under_review' | 'draft' | 'overdue_review';

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'under_review', label: 'Under review' },
  { value: 'draft', label: 'Draft' },
  { value: 'overdue_review', label: 'Overdue review' },
];

const ALL_SERVICES = Array.from(
  new Set(mockDRPlans.flatMap((p) => p.serviceNames)),
).sort();

export const DRPlans: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DRPlanStatus | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [testingPlanId, setTestingPlanId] = useState<string | null>(null);

  const overduePlans = useMemo(
    () => mockDRPlans.filter((p) => isOverdue(p.reviewDueAt)),
    [],
  );

  const filtered = useMemo(() => {
    let list = [...mockDRPlans];

    // Tab filter
    if (activeTab === 'active') list = list.filter((p) => p.status === 'active');
    else if (activeTab === 'under_review') list = list.filter((p) => p.status === 'under_review');
    else if (activeTab === 'draft') list = list.filter((p) => p.status === 'draft');
    else if (activeTab === 'overdue_review') list = list.filter((p) => isOverdue(p.reviewDueAt));

    // Status dropdown filter (only relevant for "all" tab)
    if (activeTab === 'all' && statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    // Service filter
    if (serviceFilter !== 'all') {
      list = list.filter((p) => p.serviceNames.includes(serviceFilter));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.publicId.toLowerCase().includes(q),
      );
    }

    return list;
  }, [search, statusFilter, serviceFilter, activeTab]);

  const tabCounts = useMemo(() => ({
    all: mockDRPlans.length,
    active: mockDRPlans.filter((p) => p.status === 'active').length,
    under_review: mockDRPlans.filter((p) => p.status === 'under_review').length,
    draft: mockDRPlans.filter((p) => p.status === 'draft').length,
    overdue_review: overduePlans.length,
  }), [overduePlans]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mockDRPlans.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return counts;
  }, []);

  const activeCount = statusCounts['active'] ?? 0;
  const underReviewCount = statusCounts['under_review'] ?? 0;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setServiceFilter('all');
  };

  const hasFilters = search || statusFilter !== 'all' || serviceFilter !== 'all';

  const handleTestNow = (plan: DRPlan) => {
    setTestingPlanId(plan.id);
  };

  const handleOpenDetail = (_plan: DRPlan) => {
    // Detail view could navigate; for now a no-op placeholder
  };

  const handleWizardComplete = () => {
    setTestingPlanId(null);
    navigate('/continuity/tests');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-ois-border bg-white shrink-0">
        <nav className="flex items-center gap-1.5 text-sm text-ois-text-subtle mb-3">
          <Link to="/" className="hover:text-ois-text transition-colors">Dashboard</Link>
          <ChevronRight size={13} />
          <span className="text-ois-text font-medium">DR Plans</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/continuity/bia"
                className="flex items-center gap-1 text-sm text-ois-text-subtle hover:text-ois-text transition-colors"
              >
                <ArrowLeft size={14} />
                Back
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-ois-text tracking-tight">DR Plans</h1>
            <p className="text-sm text-ois-text-subtle mt-0.5">
              {mockDRPlans.length} plans &middot; {activeCount} active &middot; {underReviewCount} under review &middot; {overduePlans.length} overdue for review
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/continuity/bia"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
            >
              BIA
              <ChevronRight size={14} />
            </Link>
            <Link
              to="/continuity/tests"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ois-text-subtle hover:text-ois-text border border-ois-border rounded-lg hover:bg-ois-surface-muted transition-colors"
            >
              Tests
              <ChevronRight size={14} />
            </Link>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-ois-primary hover:bg-ois-primary/90 rounded-lg transition-colors">
              <Plus size={15} />
              New plan
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
          {/* Overdue review banner */}
          {overduePlans.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">
                    {overduePlans.length} DR plan{overduePlans.length > 1 ? 's' : ''} require{overduePlans.length === 1 ? 's' : ''} review
                  </p>
                  {overduePlans.map((plan) => (
                    <div key={plan.id} className="mt-1">
                      <p className="text-sm text-amber-800">
                        <span className="font-mono font-semibold">{plan.publicId}</span> ({plan.serviceNames.join(', ')}) — review was due {formatDate(plan.reviewDueAt)}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {plan.lastTestedAt && `Last tested ${formatDate(plan.lastTestedAt)}`}
                        {' · '}
                        {weeksOverdue(plan.reviewDueAt)} week{weeksOverdue(plan.reviewDueAt) !== 1 ? 's' : ''} overdue
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('overdue_review')}
                  className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
                >
                  Review now
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
                placeholder="Search plan name or ID…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
              />
            </div>

            <FilterDropdown
              value={statusFilter}
              onChange={v => setStatusFilter(v as DRPlanStatus | 'all')}
              options={[
                { value: 'all', label: `All statuses (${mockDRPlans.length})` },
                { value: 'active', label: `Active (${statusCounts['active'] ?? 0})` },
                { value: 'approved', label: `Approved (${statusCounts['approved'] ?? 0})` },
                { value: 'under_review', label: `Under review (${statusCounts['under_review'] ?? 0})` },
                { value: 'draft', label: `Draft (${statusCounts['draft'] ?? 0})` },
                { value: 'retired', label: `Retired (${statusCounts['retired'] ?? 0})` },
              ]}
              placeholder="All statuses"
            />

            <FilterDropdown
              value={serviceFilter}
              onChange={v => setServiceFilter(v)}
              options={[
                { value: 'all', label: 'All services' },
                ...ALL_SERVICES.map(svc => ({ value: svc, label: svc })),
              ]}
              placeholder="All services"
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
                  'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.value
                    ? 'border-ois-primary text-ois-primary'
                    : 'border-transparent text-ois-text-subtle hover:text-ois-text hover:border-ois-border',
                )}
              >
                {tab.label} <span className="ml-1 text-xs opacity-70">{tabCounts[tab.value]}</span>
              </button>
            ))}
          </div>

          {/* Plan cards */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-base font-semibold text-ois-text mb-1">No DR plans found</p>
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
              {filtered.map((plan) => (
                <DRPlanCard
                  key={plan.id}
                  plan={plan}
                  onTestNow={handleTestNow}
                  onOpenDetail={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DR Test Runner wizard */}
      {testingPlanId !== null && (
        <DRTestRunnerWizard
          plans={mockDRPlans}
          initialPlanId={testingPlanId}
          onClose={() => setTestingPlanId(null)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
};
