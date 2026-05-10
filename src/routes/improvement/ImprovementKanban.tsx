import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, X } from 'lucide-react';
import { mockImprovements } from '@/src/mocks/improvements';
import { mockBenefitMeasurements } from '@/src/mocks/benefitMeasurements';
import { improvementCategoryMeta, improvementPriorityMeta } from '@/src/lib/constants';
import { KanbanBoard } from '@/src/components/improvement/KanbanBoard/KanbanBoard';
import { ImprovementCategory, ImprovementPriority } from '@/src/types/improvement';

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
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map(c => (
            <option key={c} value={c}>{improvementCategoryMeta[c].label}</option>
          ))}
        </select>
        <select
          value={ownerFilter}
          onChange={e => setOwnerFilter(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="">All owners</option>
          {ownerOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="">All priorities</option>
          {ALL_PRIORITIES.map(p => (
            <option key={p} value={p}>{improvementPriorityMeta[p].label}</option>
          ))}
        </select>
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
