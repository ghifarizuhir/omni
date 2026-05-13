import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { mockImprovements } from '@/src/mocks/improvements';
import { mockBenefitMeasurements } from '@/src/mocks/benefitMeasurements';
import { CumulativeBenefitChart } from '@/src/components/improvement/BenefitTracker/CumulativeBenefitChart';
import { BenefitByTypeDonut } from '@/src/components/improvement/BenefitTracker/BenefitByTypeDonut';
import { TopContributorsList } from '@/src/components/improvement/BenefitTracker/TopContributorsList';
import { BenefitMeasurementTable } from '@/src/components/improvement/BenefitTracker/BenefitMeasurementTable';
import { LogBenefitModal } from '@/src/components/improvement/BenefitTracker/LogBenefitModal';
import { ROICalculator } from '@/src/components/improvement/BenefitTracker/ROICalculator';
import { Button } from '@/src/components/ui/Button';

export const BenefitTracker: React.FC = () => {
  const [showLogModal, setShowLogModal] = useState(false);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action row */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-2.5 border-b border-ois-border bg-ois-surface">
        <Button
          variant="primary"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowLogModal(true)}
        >
          <Plus size={14} /> Log measurement
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-screen-2xl mx-auto px-6 py-5 space-y-6 pb-12">
          {/* Top section — 60/40 split */}
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0">
              <CumulativeBenefitChart measurements={mockBenefitMeasurements} />
            </div>
            <div className="w-[38%] shrink-0 space-y-4">
              <BenefitByTypeDonut initiatives={mockImprovements} />
              <TopContributorsList initiatives={mockImprovements} />
            </div>
          </div>

          {/* Measurement table */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-ois-text uppercase tracking-widest">Benefit measurements</h2>
            <BenefitMeasurementTable
              measurements={mockBenefitMeasurements}
              initiatives={mockImprovements}
            />
          </div>

          {/* ROI Calculator */}
          <ROICalculator />
        </div>
      </div>

      {/* Log benefit modal — fixed-positioned, safe anywhere in tree */}
      <LogBenefitModal
        open={showLogModal}
        initiatives={mockImprovements}
        onClose={() => setShowLogModal(false)}
        onSubmit={() => setShowLogModal(false)}
      />
    </div>
  );
};
