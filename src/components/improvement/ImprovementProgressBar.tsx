import React from 'react';
import { cn } from '../../lib/utils';

interface ImprovementProgressBarProps {
  percent: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return '#12B76A';
  if (pct >= 67) return '#1F4FD4';
  if (pct >= 34) return '#F79009';
  return '#F04438';
}

export function ImprovementProgressBar({ percent, showLabel, size = 'md', className }: ImprovementProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color = getProgressColor(clamped);
  const trackH = size === 'sm' ? 'h-1' : 'h-1.5';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-gray-100 overflow-hidden', trackH)}>
        <div
          className={cn('h-full rounded-full transition-all')}
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium tabular-nums" style={{ color }}>{clamped}%</span>
      )}
    </div>
  );
}
