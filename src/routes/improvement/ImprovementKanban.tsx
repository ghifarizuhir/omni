import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, X } from 'lucide-react';
import { mockImprovements } from '@/src/mocks/improvements';
import { mockBenefitMeasurements } from '@/src/mocks/benefitMeasurements';
import { improvementCategoryMeta, improvementPriorityMeta } from '@/src/lib/constants';
import { KanbanBoard } from '@/src/components/improvement/KanbanBoard/KanbanBoard';
import { ImprovementCategory, ImprovementPriority } from '@/src/types/improvement';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

const ALL_CATEGORIES: ImprovementCategory[] = [
  'reliability', 'performance', 'security', 'process', 'cost', 'compliance', 'customer_experience', 'developer_experience',
];
const ALL_PRIORITIES: ImprovementPriority[] = ['critical', 'high', 'medium', 'low'];

export const ImprovementKanban: React.FC = () => {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const ownerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    mockImprovements.forEach(i => seen.set(i.ownerId, i.ownerName));
    return [...seen.entries()];
  }, []);

  const filteredInitiatives = useMemo(() => {
    let result = [...mockImprovements];
    if (categoryFilter) result = result.filter(i => i.category === categoryFilter);
    if (ownerFilter) result = result.filter(i => i.ownerId === ownerFilter);
    if (priorityFilter) result = result.filter(i => i.priority === priorityFilter);
    return result;
  }, [categoryFilter, ownerFilter, priorityFilter]);

  const hasFilters = categoryFilter || ownerFilter || priorityFilter;

  const handleReset = () => {
    setCategoryFilter('');
    setOwnerFilter('');
    setPriorityFilter('');
  };

  return (
    <div className="flex flex-col min-h-full pb-8 space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Improvement Kanban</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            {filteredInitiatives.length} of {mockImprovements.length} initiatives shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/improvement" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Register <ArrowRight size={14} />
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
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
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
          value={ownerFilter}
          onChange={v => setOwnerFilter(v)}
          options={[
            { value: '', label: 'All owners' },
            ...ownerOptions.map(([id, name]) => ({ value: id, label: name })),
          ]}
          placeholder="All owners"
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
        {hasFilters && (
          <button onClick={handleReset} className="inline-flex items-center gap-1 text-xs text-ois-text-muted hover:text-ois-danger transition-colors">
            <X size={12} /> Reset
          </button>
        )}
      </div>

      {/* Kanban board */}
      <KanbanBoard
        initiatives={filteredInitiatives}
        benefitMeasurements={mockBenefitMeasurements}
        onNavigate={(publicId) => navigate('/improvement/' + publicId)}
      />
    </div>
  );
};
