import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { mockImprovements } from '@/src/mocks/improvements';
import { mockBenefitMeasurements } from '@/src/mocks/benefitMeasurements';
import { improvementCategoryMeta, improvementPriorityMeta } from '@/src/lib/constants';
import { KanbanBoard } from '@/src/components/improvement/KanbanBoard/KanbanBoard';
import { ImprovementCategory, ImprovementPriority } from '@/src/types/improvement';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import { Button } from '@/src/components/ui/Button';

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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <span className="text-xs text-ois-text-muted">
          {filteredInitiatives.length} of {mockImprovements.length} initiatives shown
        </span>
        <Button variant="primary" size="sm" className="gap-1.5">
          <Plus size={14} /> New
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12">

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
      </div>
    </div>
  );
};
