import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockMetricDefinitions } from '@/src/mocks/metricDefinitions';
import { MetricCategory } from '@/src/types/measurement';
import { metricCategoryMeta } from '@/src/lib/constants';
import { MetricCard } from '@/src/components/measurement/MetricCard';
import { MetricCategoryNav } from '@/src/components/measurement/MetricCategoryNav';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

const ALL_CATEGORIES = Object.keys(metricCategoryMeta) as MetricCategory[];
const ALL_SOURCES = Array.from(new Set(mockMetricDefinitions.map((m) => m.sourceSystem)));

export const MetricCatalog: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [hasTarget, setHasTarget] = useState(false);
  const [expandedMetricId, setExpandedMetricId] = useState<string | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<MetricCategory, number>;
    for (const cat of ALL_CATEGORIES) {
      counts[cat] = mockMetricDefinitions.filter((m) => m.category === cat).length;
    }
    return counts;
  }, []);

  const filteredMetrics = useMemo(() => {
    return mockMetricDefinitions.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (sourceFilter !== 'all' && m.sourceSystem !== sourceFilter) return false;
      if (hasTarget && m.target === undefined) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.name.toLowerCase().includes(q) &&
          !m.displayName.toLowerCase().includes(q) &&
          !m.description.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [search, selectedCategory, sourceFilter, hasTarget]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSourceFilter('all');
    setHasTarget(false);
  };

  const hasActiveFilters =
    search !== '' || selectedCategory !== 'all' || sourceFilter !== 'all' || hasTarget;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
          <input
            type="text"
            placeholder="Search metrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-ois-border pl-9 pr-3 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
          />
        </div>

        <FilterDropdown
          value={selectedCategory}
          onChange={(v) => setSelectedCategory(v as MetricCategory | 'all')}
          options={[
            { value: 'all', label: 'All categories' },
            ...ALL_CATEGORIES.map((cat) => ({ value: cat, label: metricCategoryMeta[cat].label })),
          ]}
          placeholder="All categories"
        />

        <FilterDropdown
          value={sourceFilter}
          onChange={(v) => setSourceFilter(v)}
          options={[
            { value: 'all', label: 'All sources' },
            ...ALL_SOURCES.map((src) => ({ value: src, label: src })),
          ]}
          placeholder="All sources"
        />

        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hasTarget}
            onChange={(e) => setHasTarget(e.target.checked)}
            className="rounded accent-ois-primary"
          />
          <span className="text-sm text-ois-text">Has target</span>
        </label>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-sm text-ois-text-subtle hover:text-ois-text transition-colors"
          >
            <X size={13} />
            Reset
          </button>
        )}
      </div>

      {/* 2-Column Layout: Sidebar + Main */}
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <div className="w-[220px] shrink-0 rounded-xl border border-gray-200 bg-white p-4">
          <MetricCategoryNav
            categories={ALL_CATEGORIES.filter((cat) => categoryCounts[cat] > 0)}
            categoryCounts={categoryCounts}
            selected={selectedCategory}
            onSelect={(cat) => setSelectedCategory(cat)}
          />
        </div>

        {/* Main Grid */}
        <div className="flex-1 min-w-0">
          {filteredMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
              <p className="text-sm text-ois-text-subtle">No metrics match your filters.</p>
              <button
                onClick={resetFilters}
                className="mt-2 text-sm text-ois-primary hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredMetrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  metric={metric}
                  isExpanded={expandedMetricId === metric.id}
                  onToggle={() =>
                    setExpandedMetricId((prev) => (prev === metric.id ? null : metric.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
