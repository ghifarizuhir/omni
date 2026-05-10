import React from 'react';
import {
  Activity, GitBranch, AlertTriangle, Database, Shield, Zap, ClipboardList, BookOpen,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { MetricCategory } from '@/src/types/measurement';
import { metricCategoryMeta } from '@/src/lib/constants';

interface MetricCategoryNavProps {
  categories: MetricCategory[];
  categoryCounts: Record<MetricCategory, number>;
  selected: MetricCategory | 'all';
  onSelect: (cat: MetricCategory | 'all') => void;
}

const lucideIcons: Record<string, React.ReactNode> = {
  Activity:      <Activity size={14} />,
  GitBranch:     <GitBranch size={14} />,
  AlertTriangle: <AlertTriangle size={14} />,
  Database:      <Database size={14} />,
  Shield:        <Shield size={14} />,
  Zap:           <Zap size={14} />,
  ClipboardList: <ClipboardList size={14} />,
  BookOpen:      <BookOpen size={14} />,
};

export const MetricCategoryNav: React.FC<MetricCategoryNavProps> = ({
  categories,
  categoryCounts,
  selected,
  onSelect,
}) => {
  const totalCount = (Object.values(categoryCounts) as number[]).reduce((a, b) => a + b, 0);

  return (
    <nav className="flex flex-col gap-0.5">
      {/* All */}
      <button
        onClick={() => onSelect('all')}
        className={cn(
          'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
          selected === 'all'
            ? 'bg-ois-primary text-white font-semibold'
            : 'text-ois-text hover:bg-ois-surface-muted',
        )}
      >
        <span>All categories</span>
        <span className={cn(
          'text-xs font-medium rounded-full px-1.5 py-0.5',
          selected === 'all' ? 'bg-white/20 text-white' : 'bg-ois-surface-muted text-ois-text-muted',
        )}>
          {totalCount}
        </span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-ois-border" />

      {/* Categories */}
      {categories.map((cat) => {
        const meta = metricCategoryMeta[cat];
        const icon = lucideIcons[meta.icon];
        const count = categoryCounts[cat] ?? 0;
        const isActive = selected === cat;

        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              'flex items-center gap-2 justify-between rounded-lg px-3 py-2 text-sm transition-colors text-left',
              isActive
                ? 'bg-ois-primary text-white font-semibold'
                : 'text-ois-text hover:bg-ois-surface-muted',
            )}
          >
            <span className="flex items-center gap-2">
              <span style={{ color: isActive ? 'white' : meta.color }}>{icon}</span>
              {meta.label}
            </span>
            <span className={cn(
              'text-xs font-medium rounded-full px-1.5 py-0.5 shrink-0',
              isActive ? 'bg-white/20 text-white' : 'bg-ois-surface-muted text-ois-text-muted',
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
