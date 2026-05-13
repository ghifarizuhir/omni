import React, { useState, useMemo } from 'react';
import { Search, Plus, RotateCcw } from 'lucide-react';
import { testingService, useResource } from '../../services';
import { TestPlanRow } from '../../components/testing/TestPlanRow';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { TestPlanType } from '../../types/testing';
import { FilterDropdown } from '../../components/ui/FilterDropdown';
import { Can } from '@/src/lib/rbac';

// ── Type chip colours ────────────────────────────────────────────────────────

type StripChip = {
  label: string;
  key: string;
};

const TYPE_CHIPS: StripChip[] = [
  { label: 'All', key: 'all' },
  { label: 'Regression', key: 'regression' },
  { label: 'Smoke', key: 'smoke' },
  { label: 'Load', key: 'load' },
  { label: 'Compliance', key: 'compliance' },
  { label: 'Security', key: 'security' },
];

// ── Filter-bar dropdown helpers ──────────────────────────────────────────────

const ALL_TYPES = ['regression', 'smoke', 'load', 'compliance', 'security', 'release'] as const;
const ALL_STATUSES = ['active', 'draft', 'archived'] as const;

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// ── Main component ───────────────────────────────────────────────────────────

export const TestPlans: React.FC = () => {
  const { data: plansData } = useResource(() => testingService.plans(), []);
  const plans = plansData ?? [];

  // Filter state
  const [search, setSearch] = useState('');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  // Stats-strip chip state
  const [typeChip, setTypeChip] = useState<string>('all');
  const [qualityChip, setQualityChip] = useState<string>('');

  const allComponents = useMemo(
    () =>
      unique(
        plans
          .map((p) => p.componentName)
          .filter((c): c is string => Boolean(c))
      ).sort(),
    [plans]
  );

  const allOwners = useMemo(
    () => unique(plans.map((p) => p.ownerName)).sort(),
    [plans]
  );

  // Counts for the stats strip chips
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: plans.length };
    for (const t of ALL_TYPES) {
      counts[t] = plans.filter((p) => p.type === t).length;
    }
    return counts;
  }, [plans]);

  const passAbove95Count = plans.filter((p) => p.passRate30d >= 0.95).length;
  const passBelow90Count = plans.filter((p) => p.passRate30d < 0.9).length;
  const now = Date.now();
  const recentRunCount = plans.filter((p) => {
    if (!p.lastRunAt) return false;
    return now - new Date(p.lastRunAt).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  // Derived filtered list
  const filtered = useMemo(() => {
    let list = [...plans];

    // Stats strip — type chip
    if (typeChip !== 'all') {
      list = list.filter((p) => p.type === typeChip);
    }

    // Stats strip — quality chip
    if (qualityChip === 'above95') {
      list = list.filter((p) => p.passRate30d >= 0.95);
    } else if (qualityChip === 'below90') {
      list = list.filter((p) => p.passRate30d < 0.9);
    } else if (qualityChip === 'recent') {
      list = list.filter((p) => {
        if (!p.lastRunAt) return false;
        return now - new Date(p.lastRunAt).getTime() < 24 * 60 * 60 * 1000;
      });
    }

    // Filter bar
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.publicId.toLowerCase().includes(q) ||
          (p.componentName && p.componentName.toLowerCase().includes(q))
      );
    }
    if (componentFilter) list = list.filter((p) => p.componentName === componentFilter);
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (ownerFilter) list = list.filter((p) => p.ownerName === ownerFilter);

    // Default sort: lastRunAt desc
    list.sort((a, b) => {
      if (!a.lastRunAt && !b.lastRunAt) return 0;
      if (!a.lastRunAt) return 1;
      if (!b.lastRunAt) return -1;
      return new Date(b.lastRunAt).getTime() - new Date(a.lastRunAt).getTime();
    });

    return list;
  }, [plans, search, componentFilter, statusFilter, ownerFilter, typeChip, qualityChip, now]);

  const handleReset = () => {
    setSearch('');
    setComponentFilter('');
    setStatusFilter('');
    setOwnerFilter('');
    setTypeChip('all');
    setQualityChip('');
  };

  // Chip toggle helpers
  const toggleTypeChip = (key: string) => {
    setTypeChip((prev) => (prev === key ? 'all' : key));
  };
  const toggleQualityChip = (key: string) => {
    setQualityChip((prev) => (prev === key ? '' : key));
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-end gap-2">
        <Can module="testing" action="update">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-medium hover:bg-ois-primary/90 transition-colors">
            <Plus size={14} />
            New plan
          </button>
        </Can>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
          />
        </div>

        {/* Component dropdown */}
        <FilterDropdown
          value={componentFilter}
          onChange={(v) => setComponentFilter(v)}
          options={[
            { value: '', label: 'Component' },
            ...allComponents.map((c) => ({ value: c, label: c })),
          ]}
          placeholder="Component"
        />

        {/* Status dropdown */}
        <FilterDropdown
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          options={[
            { value: '', label: 'Status' },
            ...ALL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
          ]}
          placeholder="Status"
        />

        {/* Owner dropdown */}
        <FilterDropdown
          value={ownerFilter}
          onChange={(v) => setOwnerFilter(v)}
          options={[
            { value: '', label: 'Owner' },
            ...allOwners.map((o) => ({ value: o, label: o })),
          ]}
          placeholder="Owner"
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

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Row 1: type chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {TYPE_CHIPS.map((chip) => {
            const count = typeCounts[chip.key] ?? 0;
            const active = typeChip === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => toggleTypeChip(chip.key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'bg-ois-primary text-white border-ois-primary'
                    : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50 hover:text-ois-text'
                )}
              >
                {chip.label} {count}
              </button>
            );
          })}
        </div>

        {/* Row 2: quality chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'above95', label: `Pass rate ≥ 95%: ${passAbove95Count}` },
            { key: 'below90', label: `Below 90%: ${passBelow90Count}` },
            { key: 'recent', label: `Last run < 24h: ${recentRunCount}` },
          ].map(({ key, label }) => {
            const active = qualityChip === key;
            return (
              <button
                key={key}
                onClick={() => toggleQualityChip(key)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  active
                    ? 'bg-ois-primary text-white border-ois-primary'
                    : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50 hover:text-ois-text'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Plans table ─────────────────────────────────────────────────────── */}
      <Card>
        <CardBody className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <p className="text-sm text-ois-text-muted">No test plans match.</p>
              <button
                onClick={handleReset}
                className="text-xs text-ois-primary underline underline-offset-2 hover:no-underline"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ois-border bg-ois-surface-muted">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide whitespace-nowrap">
                      Public ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Component
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Cases
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide whitespace-nowrap">
                      Last run
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide whitespace-nowrap min-w-[140px]">
                      Pass rate (30d)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Owner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((plan) => (
                    <TestPlanRow
                      key={plan.id}
                      plan={plan}
                      onOpen={() => {}}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
