import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, RotateCcw } from 'lucide-react';
import { mockTestPlans } from '../../mocks/testPlans';
import { TestPlanRow } from '../../components/testing/TestPlanRow';
import { Card, CardBody } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { TestPlan, TestPlanType } from '../../types/testing';

// ── Quick-stat helpers ──────────────────────────────────────────────────────

function avgPassRate(plans: TestPlan[]): number {
  if (!plans.length) return 0;
  return plans.reduce((acc, p) => acc + p.passRate30d, 0) / plans.length;
}

const activePlans = mockTestPlans.filter((p) => p.status === 'active');

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
  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [componentFilter, setComponentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ownerFilter, setOwnerFilter] = useState<string>('');

  // Stats-strip chip state
  const [typeChip, setTypeChip] = useState<string>('all');
  const [qualityChip, setQualityChip] = useState<string>('');

  const allComponents = useMemo(
    () =>
      unique(
        mockTestPlans
          .map((p) => p.componentName)
          .filter((c): c is string => Boolean(c))
      ).sort(),
    []
  );

  const allOwners = useMemo(
    () => unique(mockTestPlans.map((p) => p.ownerName)).sort(),
    []
  );

  // Counts for the stats strip chips
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockTestPlans.length };
    for (const t of ALL_TYPES) {
      counts[t] = mockTestPlans.filter((p) => p.type === t).length;
    }
    return counts;
  }, []);

  const passAbove95Count = mockTestPlans.filter((p) => p.passRate30d >= 0.95).length;
  const passBelow90Count = mockTestPlans.filter((p) => p.passRate30d < 0.9).length;
  const now = Date.now();
  const recentRunCount = mockTestPlans.filter((p) => {
    if (!p.lastRunAt) return false;
    return now - new Date(p.lastRunAt).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  // Derived filtered list
  const filtered = useMemo(() => {
    let list = [...mockTestPlans];

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
    if (typeFilter) list = list.filter((p) => p.type === typeFilter);
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
  }, [search, typeFilter, componentFilter, statusFilter, ownerFilter, typeChip, qualityChip, now]);

  const handleReset = () => {
    setSearch('');
    setTypeFilter('');
    setComponentFilter('');
    setStatusFilter('');
    setOwnerFilter('');
    setTypeChip('all');
    setQualityChip('');
  };

  const overallAvg = avgPassRate(mockTestPlans);

  // Chip toggle helpers
  const toggleTypeChip = (key: string) => {
    setTypeChip((prev) => (prev === key ? 'all' : key));
  };
  const toggleQualityChip = (key: string) => {
    setQualityChip((prev) => (prev === key ? '' : key));
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ois-text">Test Plans</h1>
          <p className="text-sm text-ois-text-muted mt-0.5">
            {mockTestPlans.length} test plans ·{' '}
            {activePlans.length} active · Avg pass rate (30d):{' '}
            <span className="font-semibold text-ois-text">
              {Math.round(overallAvg * 100)}%
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/testing/cases"
            className="px-3 py-1.5 rounded-lg border border-ois-border text-sm text-ois-text hover:bg-ois-surface-muted transition-colors"
          >
            Cases →
          </Link>
          <Link
            to="/testing/runs"
            className="px-3 py-1.5 rounded-lg border border-ois-border text-sm text-ois-text hover:bg-ois-surface-muted transition-colors"
          >
            Runs →
          </Link>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-medium hover:bg-ois-primary/90 transition-colors">
            <Plus size={14} />
            New plan
          </button>
        </div>
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

        {/* Type dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          <option value="">Type</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>

        {/* Component dropdown */}
        <select
          value={componentFilter}
          onChange={(e) => setComponentFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          <option value="">Component</option>
          {allComponents.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Status dropdown */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          <option value="">Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Owner dropdown */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
        >
          <option value="">Owner</option>
          {allOwners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

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
