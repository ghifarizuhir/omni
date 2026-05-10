import React from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../../lib/utils';
import { testStepResultMeta } from '../../lib/constants';
import { TestStepResultStatus } from '../../types/testing';

interface TestStepResultBadgeProps {
  status: TestStepResultStatus;
}

export const TestStepResultBadge: React.FC<TestStepResultBadgeProps> = ({ status }) => {
  const meta = testStepResultMeta[status];
  const IconComp = (Icons as Record<string, React.FC<{ size?: number; className?: string }>>)[meta.icon];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: meta.color }}>
      {IconComp && (
        <IconComp
          size={14}
          className={cn(status === 'running' && 'animate-spin')}
        />
      )}
      {meta.label}
    </span>
  );
};
