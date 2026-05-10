import React from 'react';
import { ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface PortfolioSummaryStripProps {
  initiatives: ImprovementInitiative[];
  actualBenefitUSD: number;
}

export function PortfolioSummaryStrip({ initiatives, actualBenefitUSD }: PortfolioSummaryStripProps) {
  const total = initiatives.length;
  const totalEstValue = initiatives.reduce((s, i) => s + i.estimatedBenefit.annualValueUSD, 0);
  const avgROI = total > 0
    ? Math.round(initiatives.reduce((s, i) => s + i.estimatedROIPercent, 0) / total)
    : 0;
  const totalEffort = initiatives.reduce((s, i) => s + i.estimatedEffortDays, 0);
  const completed = initiatives.filter((i) => i.status === 'completed').length;
  const inProgress = initiatives.filter((i) => i.status === 'in_progress').length;
  const pctRealized = totalEstValue > 0
    ? Math.round((actualBenefitUSD / totalEstValue) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
        <span>
          <strong className="text-gray-900">{total}</strong> initiatives
          {' · '}
          <strong className="text-gray-900">{formatBenefitUSD(totalEstValue)}</strong> total est. value
          {' · '}
          Avg ROI: <strong className="text-green-700">{avgROI}%</strong>
          {' · '}
          Total effort: ~<strong className="text-gray-900">{totalEffort}</strong> days
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-0.5">
        <span>
          <strong className="text-gray-700">{completed}</strong> completed
          {' · '}
          <strong className="text-gray-700">{formatBenefitUSD(actualBenefitUSD)}</strong> actually realized
          ({pctRealized}% of portfolio)
          {' · '}
          <strong className="text-gray-700">{inProgress}</strong> in progress
        </span>
      </div>
    </div>
  );
}
