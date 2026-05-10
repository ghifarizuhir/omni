import React from 'react';
import { ImprovementInitiative, ImprovementCategory, ImprovementPriority } from '../../../types/improvement';
import { improvementCategoryMeta, improvementPriorityMeta } from '../../../lib/constants';

interface HeatmapGapAnalysisProps {
  initiatives: ImprovementInitiative[];
}

const CATEGORIES: ImprovementCategory[] = [
  'reliability', 'performance', 'security', 'process', 'cost', 'compliance', 'customer_experience', 'developer_experience',
];
const PRIORITIES: ImprovementPriority[] = ['critical', 'high', 'medium', 'low'];

export function HeatmapGapAnalysis({ initiatives }: HeatmapGapAnalysisProps) {
  // Category counts
  const catCounts: Record<ImprovementCategory, number> = {} as Record<ImprovementCategory, number>;
  for (const cat of CATEGORIES) catCounts[cat] = 0;
  for (const i of initiatives) catCounts[i.category]++;
  const maxCat = Math.max(...Object.values(catCounts), 1);

  // Priority counts
  const priCounts: Record<ImprovementPriority, number> = {} as Record<ImprovementPriority, number>;
  for (const p of PRIORITIES) priCounts[p] = 0;
  for (const i of initiatives) priCounts[i.priority]++;

  // Benefit concentration
  const total = initiatives.reduce((s, i) => s + i.estimatedBenefit.annualValueUSD, 0) || 1;
  const topThree = [...initiatives]
    .sort((a, b) => b.estimatedBenefit.annualValueUSD - a.estimatedBenefit.annualValueUSD)
    .slice(0, 3);
  const top3Total = topThree.reduce((s, i) => s + i.estimatedBenefit.annualValueUSD, 0);

  return (
    <div className="space-y-5">
      {/* Category coverage */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category Coverage</p>
        <div className="space-y-1.5">
          {CATEGORIES.map((cat) => {
            const cnt = catCounts[cat];
            const meta = improvementCategoryMeta[cat];
            const isGap = cnt === 0;
            return (
              <div key={cat} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-32 truncate flex-shrink-0">{meta.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  {cnt > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(cnt / maxCat) * 100}%`, backgroundColor: meta.color }}
                    />
                  )}
                </div>
                <span className="text-xs w-4 text-right">{cnt}</span>
                {isGap && <span className="text-xs text-red-500 font-semibold">GAP</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefit concentration */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Benefit Concentration</p>
        <div className="space-y-1.5">
          {topThree.map((i) => {
            const pct = ((i.estimatedBenefit.annualValueUSD / total) * 100).toFixed(0);
            return (
              <div key={i.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-500 w-16 flex-shrink-0">{i.publicId}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{pct}%</span>
              </div>
            );
          })}
          {initiatives.length > 3 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16 flex-shrink-0">Others</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-300"
                  style={{ width: `${(((total - top3Total) / total) * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">{(((total - top3Total) / total) * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Priority distribution */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Priority Distribution</p>
        <div className="space-y-1.5">
          {PRIORITIES.map((p) => {
            const cnt = priCounts[p];
            const meta = improvementPriorityMeta[p];
            const isGap = cnt === 0;
            return (
              <div key={p} className="flex items-center gap-2">
                <span className="text-xs w-16 flex-shrink-0" style={{ color: meta.color }}>{meta.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  {cnt > 0 && (
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(cnt / initiatives.length) * 100}%`, backgroundColor: meta.color }}
                    />
                  )}
                </div>
                <span className="text-xs w-4 text-right">{cnt}</span>
                {isGap && <span className="text-xs text-red-500 font-semibold">gap!</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
