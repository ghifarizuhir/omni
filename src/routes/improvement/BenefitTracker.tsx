import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import {
  mockImprovements,
  getTotalEstimatedBenefitUSD,
  getTotalActualBenefitUSD,
} from '@/src/mocks/improvements';
import { mockBenefitMeasurements } from '@/src/mocks/benefitMeasurements';
import { formatBenefitUSD } from '@/src/lib/constants';
import { CumulativeBenefitChart } from '@/src/components/improvement/BenefitTracker/CumulativeBenefitChart';
import { BenefitByTypeDonut } from '@/src/components/improvement/BenefitTracker/BenefitByTypeDonut';
import { TopContributorsList } from '@/src/components/improvement/BenefitTracker/TopContributorsList';
import { BenefitMeasurementTable } from '@/src/components/improvement/BenefitTracker/BenefitMeasurementTable';
import { LogBenefitModal } from '@/src/components/improvement/BenefitTracker/LogBenefitModal';
import { ROICalculator } from '@/src/components/improvement/BenefitTracker/ROICalculator';

export const BenefitTracker: React.FC = () => {
  const [showLogModal, setShowLogModal] = useState(false);

  const totalEstimated = getTotalEstimatedBenefitUSD();
  const totalActual = getTotalActualBenefitUSD();

  return (
    <div className="flex flex-col min-h-full pb-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Benefit Tracker &amp; ROI</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            Portfolio: {formatBenefitUSD(totalEstimated)} estimated · {formatBenefitUSD(totalActual)} actually realized (YTD)
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
          <Link to="/improvement/heatmap" className="inline-flex items-center gap-1 text-sm font-semibold text-ois-primary hover:underline">
            Heatmap <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Top section — 60/40 split */}
      <div className="flex gap-5 items-start">
        {/* Left (60%): Cumulative benefit chart */}
        <div className="flex-1 min-w-0">
          <CumulativeBenefitChart measurements={mockBenefitMeasurements} />
        </div>

        {/* Right (40%): Donut + contributors */}
        <div className="w-[38%] shrink-0 space-y-4">
          <BenefitByTypeDonut initiatives={mockImprovements} />
          <TopContributorsList initiatives={mockImprovements} />
        </div>
      </div>

      {/* Middle: Measurement table + log button */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ois-text uppercase tracking-widest">Benefit measurements</h2>
          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Log measurement
          </button>
        </div>
        <BenefitMeasurementTable
          measurements={mockBenefitMeasurements}
          initiatives={mockImprovements}
        />
      </div>

      {/* Bottom: ROI Calculator */}
      <ROICalculator />

      {/* Log benefit modal */}
      <LogBenefitModal
        open={showLogModal}
        initiatives={mockImprovements}
        onClose={() => setShowLogModal(false)}
        onSubmit={() => setShowLogModal(false)}
      />
    </div>
  );
};
