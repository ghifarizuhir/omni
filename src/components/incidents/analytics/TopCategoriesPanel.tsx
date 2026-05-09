import React from 'react';
import { Incident } from '@/src/types/incident';

interface TopCategoriesPanelProps {
  incidents: Incident[];
}

const SKIP_TAGS = new Set(['p1', 'p2', 'p3', 'p4', 'production', 'staging', 'planned', 'maintenance']);

export const TopCategoriesPanel: React.FC<TopCategoriesPanelProps> = ({ incidents }) => {
  const tagCount: Record<string, number> = {};
  for (const inc of incidents) {
    for (const tag of inc.tags) {
      if (!SKIP_TAGS.has(tag)) tagCount[tag] = (tagCount[tag] ?? 0) + 1;
    }
  }

  const sorted = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const total = incidents.length;

  if (sorted.length === 0) {
    return <p className="text-xs text-ois-text-subtle py-4 text-center">No tag data available.</p>;
  }

  const maxCount = sorted[0][1];

  return (
    <div className="space-y-2.5">
      {sorted.map(([tag, count]) => {
        const pct = Math.round((count / total) * 100);
        const barPct = (count / maxCount) * 100;
        return (
          <div key={tag} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-ois-primary">#{tag}</span>
              <div className="flex items-center gap-3 text-ois-text-muted">
                <span>{count} incident{count > 1 ? 's' : ''}</span>
                <span className="w-8 text-right font-semibold text-ois-text">{pct}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-ois-border rounded-full overflow-hidden">
              <div
                className="h-full bg-ois-primary rounded-full transition-[width] duration-500"
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
