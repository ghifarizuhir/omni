import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { mockImprovements, getTotalActualBenefitUSD } from '@/src/mocks/improvements';
import { BubbleMatrix } from '@/src/components/improvement/HeatmapView/BubbleMatrix';
import { PortfolioSummaryStrip } from '@/src/components/improvement/HeatmapView/PortfolioSummaryStrip';
import { HeatmapGapAnalysis } from '@/src/components/improvement/HeatmapView/HeatmapGapAnalysis';

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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="active">Active (not completed/cancelled)</option>
          <option value="all">All statuses</option>
          <option value="in_progress">In Progress</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={sizeBy}
          onChange={e => setSizeBy(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="benefit">Size by: Est. Benefit</option>
          <option value="effort">Size by: Effort (days)</option>
          <option value="roi">Size by: ROI %</option>
        </select>
        <select
          value={colorBy}
          onChange={e => setColorBy(e.target.value)}
          className="text-sm border border-ois-border rounded-lg bg-ois-surface px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ois-primary"
        >
          <option value="priority">Color by: Priority</option>
          <option value="category">Color by: Category</option>
          <option value="status">Color by: Status</option>
        </select>
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
