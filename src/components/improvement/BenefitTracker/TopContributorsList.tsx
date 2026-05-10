import React from 'react';
import { ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface TopContributorsListProps {
  initiatives: ImprovementInitiative[];
}

export function TopContributorsList({ initiatives }: TopContributorsListProps) {
  const total = initiatives.reduce((s, i) => s + i.estimatedBenefit.annualValueUSD, 0) || 1;

  const top5 = [...initiatives]
    .sort((a, b) => b.estimatedBenefit.annualValueUSD - a.estimatedBenefit.annualValueUSD)
    .slice(0, 5);

  return (
    <div className="space-y-2">
      {top5.map((i, idx) => {
        const pct = ((i.estimatedBenefit.annualValueUSD / total) * 100).toFixed(0);
        return (
          <div key={i.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
            <span className="font-mono text-xs text-gray-500 w-16 flex-shrink-0">{i.publicId}</span>
            <span className="flex-1 text-sm text-gray-800 truncate">{i.title}</span>
            <span className="text-sm font-medium text-gray-800 flex-shrink-0">{formatBenefitUSD(i.estimatedBenefit.annualValueUSD)}</span>
            <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
