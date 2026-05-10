import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { biaImpactLevelMeta, rtoClassMeta } from '@/src/lib/constants';
import { BIAEntry } from '@/src/types/continuity';

interface Props {
  entry: BIAEntry;
  onClick: () => void;
}

export const BIAMatrixCell: React.FC<Props> = ({ entry, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const impactMeta = biaImpactLevelMeta[entry.impactLevel];
  const rtoMeta = rtoClassMeta[entry.rtoClass];

  const scoreColor =
    entry.impactScore >= 80
      ? { color: '#B42318', bg: '#FEF3F2' }
      : entry.impactScore >= 60
      ? { color: '#DC6803', bg: '#FFFAEB' }
      : { color: '#067647', bg: '#ECFDF3' };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'w-full text-left rounded-lg border border-gray-200 p-2 transition-shadow hover:shadow-md cursor-pointer',
      )}
      style={{ backgroundColor: impactMeta.bg }}
    >
      <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{entry.serviceName}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        {entry.rto} min · {rtoMeta.label}
      </p>
      <span
        className="inline-flex items-center justify-center mt-1 px-1.5 py-0.5 rounded text-[11px] font-bold"
        style={{ color: scoreColor.color, backgroundColor: scoreColor.bg }}
      >
        {entry.impactScore}/100
      </span>

      {hovered && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-200/60 space-y-0.5">
          <p className="text-[11px] text-gray-600">
            ${entry.estimatedHourlyCostUSD.toLocaleString()}/hr
          </p>
          <p className="text-[11px] text-gray-600">
            {entry.regulatoryCompliance.length} compliance req
          </p>
        </div>
      )}
    </button>
  );
};
