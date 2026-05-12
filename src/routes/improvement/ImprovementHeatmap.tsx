import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { mockImprovements, getTotalActualBenefitUSD } from '@/src/mocks/improvements';
import { BubbleMatrix } from '@/src/components/improvement/HeatmapView/BubbleMatrix';
import { PortfolioSummaryStrip } from '@/src/components/improvement/HeatmapView/PortfolioSummaryStrip';
import { HeatmapGapAnalysis } from '@/src/components/improvement/HeatmapView/HeatmapGapAnalysis';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';

export const ImprovementHeatmap: React.FC = () => {
  const totalActual = getTotalActualBenefitUSD();
  const [statusFilter, setStatusFilter] = useState('active');
  const [sizeBy, setSizeBy] = useState('benefit');
  const [colorBy, setColorBy] = useState('priority');

  const filteredInitiatives = useMemo(() => {
    if (statusFilter === 'active') {
      return mockImprovements.filter(i => !['completed', 'cancelled'].includes(i.status));
    }
    if (statusFilter === 'all') return mockImprovements;
    return mockImprovements.filter(i => i.status === statusFilter);
  }, [statusFilter]);

  return (
    <div className="flex flex-col min-h-full pb-8 space-y-5">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Improvement Portfolio Heatmap</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            {filteredInitiatives.length} initiatives displayed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/improvement" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Register <ArrowRight size={14} />
          </Link>
          <span className="text-ois-border-strong">·</span>
          <Link to="/improvement/kanban" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Kanban <ArrowRight size={14} />
          </Link>
          <span className="text-ois-border-strong">·</span>
          <Link to="/improvement/benefits" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Benefits <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <FilterDropdown
          value={statusFilter}
          onChange={v => setStatusFilter(v)}
          options={[
            { value: 'active', label: 'Active (not completed/cancelled)' },
            { value: 'all', label: 'All statuses' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'approved', label: 'Approved' },
            { value: 'completed', label: 'Completed' },
          ]}
          placeholder="Active (not completed/cancelled)"
        />
        <FilterDropdown
          value={sizeBy}
          onChange={v => setSizeBy(v)}
          options={[
            { value: 'benefit', label: 'Size by: Est. Benefit' },
            { value: 'effort', label: 'Size by: Effort (days)' },
            { value: 'roi', label: 'Size by: ROI %' },
          ]}
          placeholder="Size by: Est. Benefit"
        />
        <FilterDropdown
          value={colorBy}
          onChange={v => setColorBy(v)}
          options={[
            { value: 'priority', label: 'Color by: Priority' },
            { value: 'category', label: 'Color by: Category' },
            { value: 'status', label: 'Color by: Status' },
          ]}
          placeholder="Color by: Priority"
        />
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: Bubble matrix + summary strip */}
        <div className="flex-1 min-w-0 space-y-4">
          <BubbleMatrix initiatives={filteredInitiatives} statusFilter={statusFilter} />
          <PortfolioSummaryStrip initiatives={filteredInitiatives} actualBenefitUSD={totalActual} />
        </div>

        {/* Right: Gap analysis (280px) */}
        <div className="w-[280px] shrink-0">
          <HeatmapGapAnalysis initiatives={filteredInitiatives} />
        </div>
      </div>
    </div>
  );
};
