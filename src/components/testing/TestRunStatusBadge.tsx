import React from 'react';
import { cn } from '../../lib/utils';
import { testRunStatusMeta } from '../../lib/constants';
import { TestRunStatus } from '../../types/testing';

interface TestRunStatusBadgeProps {
  status: TestRunStatus;
  size?: 'sm' | 'md';
}

export const TestRunStatusBadge: React.FC<TestRunStatusBadgeProps> = ({ status, size = 'md' }) => {
  const meta = testRunStatusMeta[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      )}
      style={{ color: meta.color, background: meta.bg }}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', status === 'running' && 'animate-pulse')}
        style={{ background: meta.dot }}
      />
      {meta.label}
    </span>
  );
};
