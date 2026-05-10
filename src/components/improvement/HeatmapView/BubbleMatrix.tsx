import React, { useState } from 'react';
import { ImprovementInitiative, ImprovementPriority, ImprovementCategory } from '../../../types/improvement';
import { improvementPriorityMeta, improvementCategoryMeta } from '../../../lib/constants';
import { BubbleNode } from './BubbleNode';

interface BubbleMatrixProps {
  initiatives: ImprovementInitiative[];
  statusFilter: string;
}

const PRIORITIES: ImprovementPriority[] = ['critical', 'high', 'medium', 'low'];
const CATEGORIES: ImprovementCategory[] = [
  'reliability', 'performance', 'security', 'process', 'cost', 'compliance', 'customer_experience', 'developer_experience',
];

const MIN_SIZE = 24;
const MAX_SIZE = 72;

export function BubbleMatrix({ initiatives, statusFilter }: BubbleMatrixProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = statusFilter
    ? initiatives.filter((i) => i.status === statusFilter)
    : initiatives;

  const maxValue = Math.max(...filtered.map((i) => i.estimatedBenefit.annualValueUSD), 1);

  function getBubbleSize(value: number): number {
    const ratio = Math.sqrt(value / maxValue);
    return Math.round(MIN_SIZE + ratio * (MAX_SIZE - MIN_SIZE));
  }

  return (
    <div className="overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: `80px repeat(${CATEGORIES.length}, 110px)` }}>
        {/* Header row */}
        <div />
        {CATEGORIES.map((cat) => {
          const meta = improvementCategoryMeta[cat];
          return (
            <div key={cat} className="px-2 py-2 text-center">
              <p className="text-xs font-semibold text-gray-500 truncate" title={meta.label}>{meta.label}</p>
            </div>
          );
        })}

        {/* Data rows */}
        {PRIORITIES.map((priority) => {
          const pMeta = improvementPriorityMeta[priority];
          return (
            <React.Fragment key={priority}>
              {/* Row header */}
              <div className="flex items-center justify-end pr-3 py-2">
                <span className="text-xs font-semibold" style={{ color: pMeta.color }}>{pMeta.label}</span>
              </div>

              {/* Cells */}
              {CATEGORIES.map((category) => {
                const cellItems = filtered.filter(
                  (i) => i.priority === priority && i.category === category,
                );
                return (
                  <div
                    key={category}
                    className="border border-gray-100 bg-gray-50 p-1 min-h-[90px] flex flex-wrap gap-1 content-start items-start"
                  >
                    {cellItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <BubbleNode
                          initiative={item}
                          size={getBubbleSize(item.estimatedBenefit.annualValueUSD)}
                          onHover={setHoveredId}
                          isHovered={hoveredId === item.id}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
