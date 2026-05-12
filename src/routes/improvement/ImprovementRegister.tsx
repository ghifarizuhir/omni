import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  mockImprovements,
  getTotalEstimatedBenefitUSD,
  getTotalActualBenefitUSD,
} from '@/src/mocks/improvements';
import {
  improvementStatusMeta,
  improvementCategoryMeta,
  improvementPriorityMeta,
  formatBenefitUSD,
} from '@/src/lib/constants';
import { ImprovementRow } from '@/src/components/improvement/ImprovementRow';
import { ImprovementStatus, ImprovementCategory, ImprovementPriority } from '@/src/types/improvement';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

const TODAY = '2026-05-10';
const LOGGED_IN_USER = 'u-001';

const ALL_STATUSES: ImprovementStatus[] = [
  'identified', 'evaluating', 'approved', 'in_progress', 'validating', 'completed', 'on_hold', 'cancelled',
];
const ALL_CATEGORIES: ImprovementCategory[] = [
  'reliability', 'performance', 'security', 'process', 'cost', 'compliance', 'customer_experience', 'developer_experience',
];
const ALL_PRIORITIES: ImprovementPriority[] = ['critical', 'high', 'medium', 'low'];

const PRIORITY_ORDER: Record<ImprovementPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};
const STATUS_ORDER: Record<ImprovementStatus, number> = {
  in_progress: 0, validating: 1, approved: 2, evaluating: 3,
  identified: 4, on_hold: 5, completed: 6, cancelled: 7,
};

export const ImprovementRegister: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [activeStatusTab, setActiveStatusTab] = useState<ImprovementStatus | 'all'>('all');

  const totalEstimated = getTotalEstimatedBenefitUSD();
  const totalActual = getTotalActualBenefitUSD();
  const inProgressCount = mockImprovements.filter(i => i.status === 'in_progress').length;
  const completedCount = mockImprovements.filter(i => i.status === 'completed').length;

  // Quick filter counts
  const highCriticalCount = mockImprovements.filter(i => ['critical', 'high'].includes(i.priority)).length;
  const overdueCount = mockImprovements.filter(i =>
    i.targetCompletionDate && i.targetCompletionDate < TODAY && !['completed', 'cancelled'].includes(i.status)
  ).length;
  const myInitiativesCount = mockImprovements.filter(i => i.ownerId === LOGGED_IN_USER).length;
  const highROICount = mockImprovements.filter(i => i.estimatedROIPercent > 1000).length;

  // Owner options
  const ownerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    mockImprovements.forEach(i => seen.set(i.ownerId, i.ownerName));
    return [...seen.entries()];
  }, []);

  const filtered = useMemo(() => {
    let result = [...mockImprovements];

    // Status tab
    if (activeStatusTab !== 'all') {
      result = result.filter(i => i.status === activeStatusTab);
    }

    // Quick filter
    if (quickFilter === 'high-critical') {
      result = result.filter(i => ['critical', 'high'].includes(i.priority));
    } else if (quickFilter === 'overdue') {
      result = result.filter(i =>
        i.targetCompletionDate && i.targetCompletionDate < TODAY && !['completed', 'cancelled'].includes(i.status)
      );
    } else if (quickFilter === 'my') {
      result = result.filter(i => i.ownerId === LOGGED_IN_USER);
    } else if (quickFilter === 'high-roi') {
      result = result.filter(i => i.estimatedROIPercent > 1000);
    }

    // Dropdowns
    if (statusFilter) result = result.filter(i => i.status === statusFilter);
    if (categoryFilter) result = result.filter(i => i.category === categoryFilter);
    if (priorityFilter) result = result.filter(i => i.priority === priorityFilter);
    if (ownerFilter) result = result.filter(i => i.ownerId === ownerFilter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.publicId.toLowerCase().includes(q) ||
        i.ownerName.toLowerCase().includes(q) ||
        i.tags.some(t => t.includes(q))
      );
    }

    // Default sort
    result.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pa !== 0) return pa;
      const sa = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (sa !== 0) return sa;
      const ta = a.targetCompletionDate ?? '9999';
      const tb = b.targetCompletionDate ?? '9999';
      return ta.localeCompare(tb);
    });

    return result;
  }, [search, statusFilter, categoryFilter, priorityFilter, ownerFilter, quickFilter, activeStatusTab]);

  const handleReset = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setPriorityFilter('');
    setOwnerFilter('');
    setQuickFilter(null);
    setActiveStatusTab('all');
  };

  const hasFilters = search || statusFilter || categoryFilter || priorityFilter || ownerFilter || quickFilter || activeStatusTab !== 'all';

  const statusTabCounts = useMemo(() => {
    const counts: Partial<Record<ImprovementStatus | 'all', number>> = { all: mockImprovements.length };
    ALL_STATUSES.forEach(s => {
      counts[s] = mockImprovements.filter(i => i.status === s).length;
    });
    return counts;
  }, []);

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Continual Improvement Register</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            {mockImprovements.length} initiatives · {inProgressCount} in progress · {formatBenefitUSD(totalEstimated)} estimated annual benefit portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/improvement/kanban" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Kanban <ArrowRight size={14} />
          </Link>
          <span className="text-ois-border-strong">·</span>
          <Link to="/improvement/heatmap" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Heatmap <ArrowRight size={14} />
          </Link>
          <span className="text-ois-border-strong">·</span>
          <Link to="/improvement/benefits" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Benefits <ArrowRight size={14} />
          </Link>
          <button className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus size={14} /> New initiative
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Portfolio value (est.)', value: formatBenefitUSD(totalEstimated) },
          { label: 'In progress', value: String(inProgressCount) },
          { label: 'Completed (12 months)', value: String(completedCount) },
          { label: 'Actual benefit realized', value: formatBenefitUSD(totalActual) },
        ].map(kpi => (
          <div key={kpi.label} className="border border-ois-border rounded-lg bg-ois-surface p-3">
            <p className="text-[11px] font-bold text-ois-text-subtle uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-xl font-bold text-ois-text">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search initiatives..."
            className="pl-8 pr-3 py-1.5 text-sm border border-ois-border rounded-lg bg-ois-surface focus:outline-none focus:ring-1 focus:ring-ois-primary w-52"
          />
        </div>
        <FilterDropdown
          value={statusFilter}
          onChange={v => setStatusFilter(v)}
          options={[
            { value: '', label: 'All statuses' },
            ...ALL_STATUSES.map(s => ({ value: s, label: improvementStatusMeta[s].label })),
          ]}
          placeholder="All statuses"
        />
        <FilterDropdown
          value={categoryFilter}
          onChange={v => setCategoryFilter(v)}
          options={[
            { value: '', label: 'All categories' },
            ...ALL_CATEGORIES.map(c => ({ value: c, label: improvementCategoryMeta[c].label })),
          ]}
          placeholder="All categories"
        />
        <FilterDropdown
          value={priorityFilter}
          onChange={v => setPriorityFilter(v)}
          options={[
            { value: '', label: 'All priorities' },
            ...ALL_PRIORITIES.map(p => ({ value: p, label: improvementPriorityMeta[p].label })),
          ]}
          placeholder="All priorities"
        />
        <FilterDropdown
          value={ownerFilter}
          onChange={v => setOwnerFilter(v)}
          options={[
            { value: '', label: 'All owners' },
            ...ownerOptions.map(([id, name]) => ({ value: id, label: name })),
          ]}
          placeholder="All owners"
        />
        {hasFilters && (
          <button onClick={handleReset} className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-danger transition-colors">
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'high-critical', label: `🔥 High/Critical (${highCriticalCount})` },
          { id: 'overdue', label: `⏱ Overdue target (${overdueCount})` },
          { id: 'my', label: `📡 My initiatives (${myInitiativesCount})` },
          { id: 'high-roi', label: `💰 High ROI (${highROICount})` },
        ].map(chip => (
          <button
            key={chip.id}
            onClick={() => setQuickFilter(quickFilter === chip.id ? null : chip.id)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
              quickFilter === chip.id
                ? 'bg-ois-primary text-white border-ois-primary'
                : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary hover:text-ois-primary'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-ois-border overflow-x-auto">
        <button
          onClick={() => setActiveStatusTab('all')}
          className={cn(
            'px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
            activeStatusTab === 'all'
              ? 'border-ois-primary text-ois-primary'
              : 'border-transparent text-ois-text-muted hover:text-ois-text'
          )}
        >
          All {statusTabCounts.all}
        </button>
        {ALL_STATUSES.filter(s => (statusTabCounts[s] ?? 0) > 0).map(s => (
          <button
            key={s}
            onClick={() => setActiveStatusTab(s)}
            className={cn(
              'px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors capitalize',
              activeStatusTab === s
                ? 'border-ois-primary text-ois-primary'
                : 'border-transparent text-ois-text-muted hover:text-ois-text'
            )}
          >
            {improvementStatusMeta[s].label} {statusTabCounts[s]}
          </button>
        ))}
      </div>

      {/* Data table */}
      {filtered.length > 0 ? (
        <div className="border border-ois-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ois-surface-muted/50 border-b border-ois-border text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
                <th className="px-4 py-2.5 text-left">Initiative</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left">Category</th>
                <th className="px-4 py-2.5 text-left">Priority</th>
                <th className="px-4 py-2.5 text-left">Progress</th>
                <th className="px-4 py-2.5 text-left">Est. Benefit</th>
                <th className="px-4 py-2.5 text-left">Owner</th>
                <th className="px-4 py-2.5 text-left">Target</th>
                <th className="px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {filtered.map(imp => (
                <ImprovementRow
                  key={imp.id}
                  initiative={imp}
                  onOpen={() => { navigate(`/improvement/${imp.publicId}`); }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-ois-border rounded-lg bg-ois-surface">
          <p className="text-sm font-medium text-ois-text">No initiatives match.</p>
          <div className="flex gap-2">
            <button onClick={handleReset} className="text-sm text-ois-primary hover:underline">Reset filters</button>
            <span className="text-ois-text-muted">or</span>
            <button className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
              <Plus size={14} /> Add initiative
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
