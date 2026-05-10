import React from 'react';
import { ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD, benefitTypeMeta } from '../../../lib/constants';
import { BenefitTypeChip } from '../BenefitTypeChip';

interface OverviewTabProps {
  initiative: ImprovementInitiative;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: '#12B76A',
  medium: '#F79009',
  low: '#F04438',
};

export function OverviewTab({ initiative }: OverviewTabProps) {
  const { estimatedBenefit, estimatedROIPercent, estimatedEffortDays, estimatedCostUSD } = initiative;
  const confColor = CONFIDENCE_COLORS[estimatedBenefit.confidenceLevel];

  return (
    <div className="space-y-4 py-4">
      {/* Current State */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current State</p>
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm text-gray-700 italic">{initiative.currentStateDescription}</p>
        </div>
      </div>

      {/* Target State */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Target State</p>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-900">{initiative.targetStateDescription}</p>
        </div>
      </div>

      {/* Estimated Impact */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estimated Impact</p>
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BenefitTypeChip type={estimatedBenefit.primaryType} />
            <span
              className="text-xs font-medium capitalize"
              style={{ color: confColor }}
            >
              {estimatedBenefit.confidenceLevel} confidence
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">
              {formatBenefitUSD(estimatedBenefit.annualValueUSD)}
            </p>
            <p className="text-xs text-gray-500">estimated annual value</p>
          </div>
          <p className="text-sm text-gray-700">{estimatedBenefit.description}</p>
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Effort</p>
              <p className="text-sm font-semibold text-gray-800">{estimatedEffortDays} days</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. cost</p>
              <p className="text-sm font-semibold text-gray-800">${estimatedCostUSD.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ROI</p>
              <p className="text-sm font-semibold text-green-700">{estimatedROIPercent.toLocaleString()}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
