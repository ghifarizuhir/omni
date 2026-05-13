import React, { useState, useMemo } from 'react';
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row — no primary CTA, just stat summary */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <span className="text-xs text-ois-text-muted">
          {filteredInitiatives.length} initiatives displayed
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-5 pb-12">

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
            <div className="flex-1 min-w-0 space-y-4">
              <BubbleMatrix initiatives={filteredInitiatives} statusFilter={statusFilter} />
              <PortfolioSummaryStrip initiatives={filteredInitiatives} actualBenefitUSD={totalActual} />
            </div>
            <div className="w-[280px] shrink-0">
              <HeatmapGapAnalysis initiatives={filteredInitiatives} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
