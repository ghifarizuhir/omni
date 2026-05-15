import React from 'react';
import { ImprovementInitiative } from '../../../types/improvement';
import { formatBenefitUSD } from '../../../lib/constants';

interface TopContributorsListProps {
  initiatives: ImprovementInitiative[];
}

const benefitOf = (i: ImprovementInitiative) => i.estimatedBenefit?.annualValueUSD ?? 0;

export function TopContributorsList({ initiatives }: TopContributorsListProps) {
  const total = initiatives.reduce((s, i) => s + benefitOf(i), 0) || 1;

  const top5 = [...initiatives]
    .sort((a, b) => benefitOf(b) - benefitOf(a))
    .slice(0, 5);

  if (top5.length === 0) {
    return <p className="text-xs text-ois-text-muted">No improvement initiatives yet.</p>;
  }

  return (
    <div className="space-y-2">
      {top5.map((i, idx) => {
        const pct = ((benefitOf(i) / total) * 100).toFixed(0);
        return (
          <div key={i.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
            <span className="font-mono text-xs text-gray-500 w-16 flex-shrink-0">{i.publicId}</span>
            <span className="flex-1 text-sm text-gray-800 truncate">{i.title}</span>
            <span className="text-sm font-medium text-gray-800 flex-shrink-0">{formatBenefitUSD(benefitOf(i))}</span>
            <span className="text-xs text-gray-400 w-8 text-right flex-shrink-0">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
