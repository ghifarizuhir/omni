import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, MoreVertical, CheckCircle2, XCircle, MinusCircle, Circle, Loader2 } from 'lucide-react';
import { testingService, useResource } from '../../services';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { formatRelative } from '../../lib/format';
import { testCasePriorityMeta, testStepResultMeta } from '../../lib/constants';
import { TestCase, TestCaseType, TestCasePriority, TestStepResultStatus } from '../../types/testing';
import { FilterDropdown } from '../../components/ui/FilterDropdown';
import { Can } from '@/src/lib/rbac';

// ── Type chip colours ────────────────────────────────────────────────────────

const TYPE_COLOR: Record<TestCaseType, { color: string; bg: string; label: string }> = {
  functional:  { color: '#1F4FD4', bg: '#EEF2FF',  label: 'Functional'  },
  integration: { color: '#6941C6', bg: '#F4F3FF',  label: 'Integration' },
  smoke:       { color: '#475467', bg: '#F1F3F7',  label: 'Smoke'       },
  performance: { color: '#6941C6', bg: '#F4F3FF',  label: 'Performance' },
  security:    { color: '#B42318', bg: '#FEF3F2',  label: 'Security'    },
  manual:      { color: '#DC6803', bg: '#FFFAEB',  label: 'Manual'      },
};

// ── Priority sort order ──────────────────────────────────────────────────────

const PRIORITY_ORDER: TestCasePriority[] = ['p0', 'p1', 'p2', 'p3'];

// ── Result icon helper ───────────────────────────────────────────────────────

const RESULT_ICONS: Record<TestStepResultStatus, React.ReactNode> = {
  passed:  <CheckCircle2 size={14} style={{ color: testStepResultMeta.passed.color }}  />,
  failed:  <XCircle      size={14} style={{ color: testStepResultMeta.failed.color }}  />,
  skipped: <MinusCircle  size={14} style={{ color: testStepResultMeta.skipped.color }} />,
  pending: <Circle       size={14} style={{ color: testStepResultMeta.pending.color }} />,
  running: <Loader2      size={14} style={{ color: testStepResultMeta.running.color }} />,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function countByPriority(cases: TestCase[], priority: TestCasePriority): number {
  return cases.filter((c) => c.priority === priority).length;
}

function countByType(cases: TestCase[], type: TestCaseType): number {
  return cases.filter((c) => c.type === type).length;
}

// ── Main component ───────────────────────────────────────────────────────────

export const TestCases: React.FC = () => {
  const { data: casesData } = useResource(() => testingService.cases(), []);
  const mockTestCases = useMemo(() => casesData ?? [], [casesData]);
  const totalCases = mockTestCases.length;

  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [automatedFilter, setAutomatedFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Stats strip chip state
  const [priorityChip, setPriorityChip] = useState<string>('all');
  const [typeChip, setTypeChip] = useState<string>('all');
  const [qualityChip, setQualityChip] = useState<string>('');

  // Collect all plan IDs from mock data
  const allPlans = useMemo(
    () => unique(mockTestCases.flatMap((c) => c.containedInPlans)).sort(),
    [mockTestCases],
  );

  // Filtered + sorted cases
  const filtered = useMemo(() => {
    let cases = mockTestCases;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.publicId.toLowerCase().includes(q) ||
          c.steps.some((s) => s.action.toLowerCase().includes(q)),
      );
    }

    // Dropdown filters
    if (typeFilter)      cases = cases.filter((c) => c.type === typeFilter);
    if (priorityFilter)  cases = cases.filter((c) => c.priority === priorityFilter);
    if (planFilter)      cases = cases.filter((c) => c.containedInPlans.includes(planFilter));
    if (automatedFilter) cases = cases.filter((c) =>
      automatedFilter === 'automated' ? c.isAutomated : !c.isAutomated,
    );
    if (statusFilter)    cases = cases.filter((c) => c.status === statusFilter);

    // Stats strip chips
    if (priorityChip !== 'all' && typeChip === 'all' && qualityChip === '') {
      cases = cases.filter((c) => c.priority === priorityChip);
    }
    if (typeChip !== 'all' && priorityChip === 'all') {
      cases = cases.filter((c) => c.type === typeChip);
    }
    if (qualityChip === 'flaky')       cases = cases.filter((c) => (c.flakeRate ?? 0) > 0.1);
    if (qualityChip === 'never_failed') cases = cases.filter((c) => c.failureCount === 0);

    // Sort: priority asc (p0 first), then title
    return [...cases].sort((a, b) => {
      const pa = PRIORITY_ORDER.indexOf(a.priority);
      const pb = PRIORITY_ORDER.indexOf(b.priority);
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title);
    });
  }, [mockTestCases, search, typeFilter, priorityFilter, planFilter, automatedFilter, statusFilter, priorityChip, typeChip, qualityChip]);

  function handleReset() {
    setSearch('');
    setTypeFilter('');
    setPriorityFilter('');
    setPlanFilter('');
    setAutomatedFilter('');
    setStatusFilter('');
    setPriorityChip('all');
    setTypeChip('all');
    setQualityChip('');
  }

  function handlePriorityChip(key: string) {
    setPriorityChip(key);
    setTypeChip('all');
    setQualityChip('');
  }

  function handleTypeChip(key: string) {
    setTypeChip(key);
    setPriorityChip('all');
    setQualityChip('');
  }

  function handleQualityChip(key: string) {
    setQualityChip((prev) => (prev === key ? '' : key));
    setPriorityChip('all');
    setTypeChip('all');
  }

  const chipBase = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors select-none';
  const chipActive = 'bg-primary text-white';
  const chipInactive = 'bg-ois-surface-muted text-ois-text-secondary hover:bg-ois-border';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <Can module="testing" action="update">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-ois-btn border border-ois-border bg-ois-surface text-sm font-medium text-ois-text-primary hover:bg-ois-surface-muted transition-colors"
          >
            + New case
          </button>
        </Can>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-tertiary pointer-events-none" />
          <input
            type="text"
            placeholder="Search title, ID, steps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-ois-btn border border-ois-border bg-ois-surface text-ois-text-primary placeholder:text-ois-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Type */}
        <FilterDropdown
          value={typeFilter}
          onChange={(v) => setTypeFilter(v)}
          options={[
            { value: '', label: 'Type' },
            ...Object.entries(TYPE_COLOR).map(([k, v]) => ({ value: k, label: v.label })),
          ]}
          placeholder="Type"
        />

        {/* Priority */}
        <FilterDropdown
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v)}
          options={[
            { value: '', label: 'Priority' },
            ...PRIORITY_ORDER.map((p) => ({ value: p, label: testCasePriorityMeta[p].label })),
          ]}
          placeholder="Priority"
        />

        {/* Plan */}
        <FilterDropdown
          value={planFilter}
          onChange={(v) => setPlanFilter(v)}
          options={[
            { value: '', label: 'Plan' },
            ...allPlans.map((p) => ({ value: p, label: p })),
          ]}
          placeholder="Plan"
        />

        {/* Automated */}
        <FilterDropdown
          value={automatedFilter}
          onChange={(v) => setAutomatedFilter(v)}
          options={[
            { value: '', label: 'Automated' },
            { value: 'automated', label: 'Automated' },
            { value: 'manual', label: 'Manual' },
          ]}
          placeholder="Automated"
        />

        {/* Status */}
        <FilterDropdown
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={[
            { value: '', label: 'Status' },
            { value: 'active', label: 'Active' },
            { value: 'flaky', label: 'Flaky' },
            { value: 'archived', label: 'Archived' },
          ]}
          placeholder="Status"
        />

        {/* Reset */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-ois-text-secondary hover:text-ois-text-primary transition-colors"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex flex-col gap-2">
        {/* Row 1 — Priority */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(chipBase, priorityChip === 'all' ? chipActive : chipInactive)}
            onClick={() => handlePriorityChip('all')}
          >
            All {totalCases}
          </span>
          {PRIORITY_ORDER.map((p) => {
            const meta = testCasePriorityMeta[p];
            const count = countByPriority(mockTestCases, p);
            const isActive = priorityChip === p;
            return (
              <span
                key={p}
                className={cn(chipBase, isActive ? chipActive : chipInactive)}
                onClick={() => handlePriorityChip(p)}
              >
                {meta.label} {count}
              </span>
            );
          })}
        </div>

        {/* Row 2 — Type */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TYPE_COLOR) as TestCaseType[]).map((t) => {
            const meta = TYPE_COLOR[t];
            const count = countByType(mockTestCases, t);
            const isActive = typeChip === t;
            return (
              <span
                key={t}
                className={cn(chipBase, isActive ? chipActive : chipInactive)}
                onClick={() => handleTypeChip(t)}
              >
                {meta.label} {count}
              </span>
            );
          })}
        </div>

        {/* Row 3 — Quality */}
        <div className="flex flex-wrap gap-1.5">
          {[
            {
              key: 'flaky',
              label: `Flaky (>10%) ${mockTestCases.filter((c) => (c.flakeRate ?? 0) > 0.1).length}`,
            },
            {
              key: 'never_failed',
              label: `Never failed: ${mockTestCases.filter((c) => c.failureCount === 0).length}`,
            },
          ].map(({ key, label }) => (
            <span
              key={key}
              className={cn(chipBase, qualityChip === key ? chipActive : chipInactive)}
              onClick={() => handleQualityChip(key)}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Cases DataTable */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ois-border bg-ois-surface-muted">
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Public ID</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary">Title</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Automated</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Plan(s)</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Last result</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Flake rate</th>
                <th className="px-4 py-3 text-left font-medium text-ois-text-secondary whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-ois-text-secondary">
                    {mockTestCases.length === 0 ? (
                      'No test cases yet.'
                    ) : (
                      <>
                        No test cases match.{' '}
                        <button
                          type="button"
                          onClick={handleReset}
                          className="text-primary hover:underline"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((tc) => {
                  const typeMeta = TYPE_COLOR[tc.type];
                  const priorityMeta = testCasePriorityMeta[tc.priority];
                  const flakeRate = tc.flakeRate;
                  const flakeDisplay =
                    flakeRate !== undefined && flakeRate > 0
                      ? flakeRate < 0.05
                        ? { text: `${(flakeRate * 100).toFixed(0)}%`, color: '#12B76A' }
                        : flakeRate < 0.15
                        ? { text: `${(flakeRate * 100).toFixed(0)}%`, color: '#F79009' }
                        : { text: `${(flakeRate * 100).toFixed(0)}%`, color: '#F04438' }
                      : null;

                  return (
                    <tr
                      key={tc.id}
                      className="border-b border-ois-border last:border-0 hover:bg-ois-surface-muted/50 transition-colors"
                    >
                      {/* Public ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-ois-text-secondary">{tc.publicId}</span>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <span
                          className="block truncate text-ois-text-primary font-medium"
                          title={tc.title}
                        >
                          {tc.title}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: typeMeta.color, backgroundColor: typeMeta.bg }}
                        >
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ color: priorityMeta.color, backgroundColor: priorityMeta.bg }}
                        >
                          {priorityMeta.label}
                        </span>
                      </td>

                      {/* Automated */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tc.isAutomated ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={13} style={{ color: '#12B76A' }} />
                            <span className="text-xs text-ois-text-secondary">{tc.automationFramework}</span>
                          </div>
                        ) : (
                          <span className="text-ois-text-tertiary">—</span>
                        )}
                      </td>

                      {/* Plan(s) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tc.containedInPlans.length > 0 ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ois-surface-muted text-xs font-medium text-ois-text-secondary border border-ois-border cursor-default"
                            title={tc.containedInPlans.join(', ')}
                          >
                            {tc.containedInPlans.length}
                          </span>
                        ) : (
                          <span className="text-ois-text-tertiary">—</span>
                        )}
                      </td>

                      {/* Last result */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tc.lastResult ? (
                          <div className="flex items-center gap-1.5">
                            {RESULT_ICONS[tc.lastResult as TestStepResultStatus]}
                            <span className="text-xs text-ois-text-secondary">
                              {tc.lastExecutedAt ? formatRelative(tc.lastExecutedAt) : 'Never'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-ois-text-tertiary">Never</span>
                        )}
                      </td>

                      {/* Flake rate */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {flakeDisplay ? (
                          <span className="text-sm font-medium" style={{ color: flakeDisplay.color }}>
                            {flakeDisplay.text}
                          </span>
                        ) : (
                          <span className="text-ois-text-tertiary">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="relative group">
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-ois-surface-muted text-ois-text-secondary hover:text-ois-text-primary transition-colors"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {/* Dropdown — visual only */}
                          <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-ois-card border border-ois-border bg-ois-surface shadow-ois-card hidden group-focus-within:block">
                            {['Open', 'Edit steps', 'Run individually', 'Archive'].map((action) => (
                              <button
                                key={action}
                                type="button"
                                className="block w-full px-3 py-2 text-left text-sm text-ois-text-primary hover:bg-ois-surface-muted transition-colors"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
