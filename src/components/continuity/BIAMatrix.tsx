import React from 'react';
import { biaImpactLevelMeta, rtoClassMeta } from '@/src/lib/constants';
import { BIAEntry, BIAImpactLevel, RTOClass } from '@/src/types/continuity';
import { BIAMatrixCell } from './BIAMatrixCell';

interface Props {
  entries: BIAEntry[];
  onSelectEntry: (entry: BIAEntry) => void;
}

const RTO_CLASSES: RTOClass[] = ['immediate', 'short', 'medium', 'long', 'extended'];
const IMPACT_LEVELS: BIAImpactLevel[] = ['catastrophic', 'critical', 'major', 'moderate', 'minor'];

export const BIAMatrix: React.FC<Props> = ({ entries, onSelectEntry }) => {
  const getEntry = (rtoClass: RTOClass, impactLevel: BIAImpactLevel): BIAEntry | undefined =>
    entries.find((e) => e.rtoClass === rtoClass && e.impactLevel === impactLevel);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Column headers */}
        <div className="flex mb-1" style={{ marginLeft: '140px' }}>
          {IMPACT_LEVELS.map((level) => {
            const meta = biaImpactLevelMeta[level];
            return (
              <div key={level} className="flex-1 px-1 text-center">
                <p className="text-xs font-semibold" style={{ color: meta.color }}>
                  {meta.label}
                </p>
                <p className="text-[10px] text-gray-400">
                  ≥ ${(meta.hourlyMin / 1000).toFixed(0)}k/hr
                </p>
              </div>
            );
          })}
        </div>

        {/* Rows */}
        {RTO_CLASSES.map((rtoClass) => {
          const rtoMeta = rtoClassMeta[rtoClass];
          return (
            <div key={rtoClass} className="flex items-stretch gap-0 mb-1">
              {/* Row header */}
              <div className="w-[140px] shrink-0 pr-2 flex flex-col justify-center">
                <p className="text-xs font-semibold text-gray-700" style={{ color: rtoMeta.color }}>
                  {rtoMeta.label}
                </p>
                <p className="text-[10px] text-gray-400">{rtoMeta.minutes}</p>
              </div>

              {/* Cells */}
              {IMPACT_LEVELS.map((level) => {
                const entry = getEntry(rtoClass, level);
                return (
                  <div key={level} className="flex-1 px-1 min-h-[72px]">
                    {entry ? (
                      <BIAMatrixCell entry={entry} onClick={() => onSelectEntry(entry)} />
                    ) : (
                      <div className="h-full min-h-[72px] rounded-lg border border-dashed border-gray-200 bg-gray-50" />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
