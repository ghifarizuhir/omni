import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ImprovementInitiative, ROICalculation } from '../../types/improvement';
import { formatBenefitUSD } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface ROISummaryPanelProps {
  initiative: ImprovementInitiative;
  roiCalc?: ROICalculation | null;
  onViewROI?: () => void;
  className?: string;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#12B76A',
  medium: '#F79009',
  low: '#F04438',
};

export function ROISummaryPanel({ initiative, roiCalc, onViewROI, className }: ROISummaryPanelProps) {
  const roi = roiCalc?.roi12mPercent ?? initiative.estimatedROIPercent;
  const annual = roiCalc?.projectedAnnualBenefitUSD ?? initiative.estimatedBenefit.annualValueUSD;
  const payback = roiCalc?.paybackMonths;
  const confidence = initiative.estimatedBenefit.confidenceLevel;
  const confColor = CONFIDENCE_COLORS[confidence];

  const paybackLabel = payback != null
    ? payback < 1
      ? '< 1 month'
      : payback < 0.5
        ? '< 2 weeks'
        : `${payback.toFixed(1)} months`
    : '—';

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 space-y-3', className)}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ROI Summary</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-500">Est. ROI</p>
          <p className="text-lg font-bold text-gray-900">{roi.toLocaleString()}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Payback</p>
          <p className="text-sm font-semibold text-gray-800">{paybackLabel}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Annual value</p>
          <p className="text-sm font-semibold text-gray-800">{formatBenefitUSD(annual)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Confidence</p>
          <p className="text-sm font-semibold capitalize flex items-center gap-1" style={{ color: confColor }}>
            {confidence}
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: confColor }} />
          </p>
        </div>
      </div>
      {onViewROI && (
        <button
          onClick={onViewROI}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium mt-1"
        >
          Full ROI <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
